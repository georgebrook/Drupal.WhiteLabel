import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";
import fs from "fs";
import { glob } from "glob";
import { defineConfig } from "vite";
import eslint from "vite-plugin-eslint2";
import stylelint from "vite-plugin-stylelint";
import { babel } from "@rollup/plugin-babel";
import { optimize } from "svgo";
import * as sass from "sass";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.resolve(ROOT, "components");
const IS_CI = process.env.CI === "true";
const IS_PROD = process.env.NODE_ENV === "production";
// Set by watch.js. Skips the build-summary table during watch mode.
const IS_WATCH = process.env.VITE_WATCH_MODE === "true";

/**
 * Maps a component source file to its flattened output location.
 *
 * components/<group>/<name>/src/<name>.js -> entry key: <group>/<name>/<name>
 *                                             output: components/<group>/<name>/<name>.js
 */
function buildEntries() {
  const entries = {};

  glob.sync(path.resolve(COMPONENTS, "**/src/**/*.js")).forEach((file) => {
    const parsed = path.parse(file);
    const parts = parsed.dir.split(path.sep);
    const srcIndex = parts.lastIndexOf("src");
    const insideComponents = parts.slice(
      parts.indexOf("components") + 1,
      srcIndex
    );
    const entryKey = insideComponents.length
      ? `${insideComponents.join("/")}/${parsed.name}`
      : parsed.name;
    entries[entryKey] = file;
  });

  return entries;
}

/**
 * Compiles component SCSS directly with dart-sass, instead of routing it
 * through Vite/Rollup as pseudo entry points. Vite never writes an external
 * .css.map for CSS-only entries (a long-standing limitation for CSS used as
 * a rollupOptions.input rather than imported from JS), so compiling directly
 * is what makes DevTools resolve styles back to the real .scss source in dev.
 *
 * components/<group>/<name>/src/<name>.scss -> components/<group>/<name>/<name>.css
 */
function compileScssPlugin() {
  const outputPathFor = (file) => {
    const parsed = path.parse(file);
    const parts = parsed.dir.split(path.sep);
    const srcIndex = parts.lastIndexOf("src");
    const insideComponents = parts.slice(
      parts.indexOf("components") + 1,
      srcIndex
    );
    return path.join(COMPONENTS, ...insideComponents, `${parsed.name}.css`);
  };

  return {
    name: "compile-scss",
    buildStart() {
      glob
        .sync(path.resolve(COMPONENTS, "**/src/**/*.scss"))
        .filter((file) => !path.parse(file).name.startsWith("_"))
        .forEach((file) => {
          const outFile = outputPathFor(file);
          const result = sass.compile(file, {
            sourceMap: !IS_PROD,
            sourceMapIncludeSources: !IS_PROD,
            style: IS_PROD ? "compressed" : "expanded",
          });

          let css = result.css;
          if (!IS_PROD && result.sourceMap) {
            result.sourceMap.sources = result.sourceMap.sources.map((src) =>
              path.relative(path.dirname(outFile), fileURLToPath(src))
            );
            fs.writeFileSync(`${outFile}.map`, JSON.stringify(result.sourceMap));
            css += `\n/*# sourceMappingURL=${path.basename(outFile)}.map */\n`;
          }

          fs.mkdirSync(path.dirname(outFile), { recursive: true });
          fs.writeFileSync(outFile, css);
        });
    },
  };
}

/**
 * Combines all SVGs in images/icons/*.svg into a single sprite of <symbol>
 * elements (images/icons-sprite.svg), matching the previous webpack setup:
 * unprefixed IDs (e.g. #chevron-down) so existing Twig `{{ icon_name }}`
 * references keep working, viewBox preserved via svgo's removeViewBox override.
 */
function svgSpritePlugin() {
  return {
    name: "svg-sprite",
    buildStart() {
      const files = glob.sync(path.resolve(ROOT, "images/icons/*.svg"));
      const symbols = files.map((file) => {
        const name = path.parse(file).name;
        const raw = fs.readFileSync(file, "utf8");
        // svgo v4's preset-default no longer strips viewBox, so no override needed.
        const { data } = optimize(raw, {
          plugins: ["preset-default"],
        });
        const viewBoxMatch = data.match(/viewBox="([^"]*)"/);
        const viewBox = viewBoxMatch ? ` viewBox="${viewBoxMatch[1]}"` : "";
        const inner = data.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
        return `<symbol id="${name}"${viewBox}>${inner}</symbol>`;
      });

      const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`;
      const outPath = path.resolve(ROOT, "images/icons-sprite.svg");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, sprite);
    },
  };
}

/**
 * emptyOutDir is false (components/ also holds .twig/.yml source files), so
 * a prod build won't otherwise clear .map files left over from a previous
 * dev build. Without this, build:prod output could ship stale, mismatched
 * source maps alongside freshly minified code.
 */
function cleanStaleSourcemaps() {
  return {
    name: "clean-stale-sourcemaps",
    buildStart() {
      if (!IS_PROD) return;
      glob
        .sync(path.join(COMPONENTS, "**/*.map"))
        .forEach((file) => fs.rmSync(file, { force: true }));
    },
  };
}

// Colors matching .ddev/commands/common.sh's palette.
const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[38;5;196m",
  green: "\x1b[38;5;46m",
  yellow: "\x1b[38;5;226m",
  blue: "\x1b[38;5;33m",
  magenta: "\x1b[38;5;201m",
};

// gzip-size budgets (bytes) per output type — tune as the theme grows.
const SIZE_BUDGETS = { css: 15 * 1024, js: 40 * 1024 };
const BAR_WIDTH = 20;

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const budgetColor = (bytes, budget) => {
  if (bytes >= budget) return ANSI.red;
  if (bytes >= budget * 0.6) return ANSI.yellow;
  return ANSI.green;
};

/**
 * Replaces Vite's flat per-file gzip listing (reportCompressedSize) with a
 * grouped, sized, budget-checked summary: a proportional bar per file, gzip
 * size colored against a per-type budget, subtotals per type, a grand total,
 * and a rollup of any files over budget. Skipped in watch mode — rebuilds
 * are frequent there and a full table on every save is more noise than help.
 *
 * CSS is compiled by compileScssPlugin directly to disk rather than through
 * Rollup, so it never appears in writeBundle's `bundle` — read those files
 * straight from disk instead.
 */
function buildSummary() {
  return {
    name: "build-summary",
    apply: "build",
    writeBundle(_options, bundle) {
      if (IS_WATCH) return;

      const jsRows = Object.entries(bundle)
        .map(([fileName, output]) => {
          const ext = path.extname(fileName).slice(1).toLowerCase();
          if (ext !== "js") return null;
          const raw = output.type === "chunk" ? output.code : output.source;
          const rawBuf = Buffer.isBuffer(raw)
            ? raw
            : Buffer.from(raw ?? "", "utf-8");
          return {
            fileName,
            ext,
            rawBytes: rawBuf.length,
            gzipBytes: zlib.gzipSync(rawBuf).length,
          };
        })
        .filter(Boolean);

      const cssRows = glob.sync(path.join(COMPONENTS, "**/*.css")).map((file) => {
        const rawBuf = fs.readFileSync(file);
        return {
          fileName: path.relative(COMPONENTS, file),
          ext: "css",
          rawBytes: rawBuf.length,
          gzipBytes: zlib.gzipSync(rawBuf).length,
        };
      });

      const rows = [...jsRows, ...cssRows];

      if (!rows.length) return;

      const maxGzip = Math.max(...rows.map((r) => r.gzipBytes));
      const nameWidth = Math.max(...rows.map((r) => r.fileName.length));
      const warnings = [];
      let grandRaw = 0;
      let grandGzip = 0;

      console.log(`\n${ANSI.magenta}◇ Build summary${ANSI.reset}`);

      for (const type of ["css", "js"]) {
        const list = rows
          .filter((r) => r.ext === type)
          .sort((a, b) => b.gzipBytes - a.gzipBytes);
        if (!list.length) continue;

        console.log(`\n  ${ANSI.blue}${type.toUpperCase()}${ANSI.reset}`);
        let typeRaw = 0;
        let typeGzip = 0;
        const budget = SIZE_BUDGETS[type];

        for (const r of list) {
          typeRaw += r.rawBytes;
          typeGzip += r.gzipBytes;
          grandRaw += r.rawBytes;
          grandGzip += r.gzipBytes;

          const filled = Math.max(1, Math.round((r.gzipBytes / maxGzip) * BAR_WIDTH));
          const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
          const color = budgetColor(r.gzipBytes, budget);
          const overBudget = r.gzipBytes >= budget;
          if (overBudget) {
            warnings.push(
              `${r.fileName} — ${formatKb(r.gzipBytes)} gzip (budget ${formatKb(budget)})`
            );
          }

          console.log(
            `    ${r.fileName.padEnd(nameWidth)}  ${color}${bar}${ANSI.reset}  ` +
              `${formatKb(r.rawBytes).padStart(9)} → ${color}${formatKb(r.gzipBytes).padStart(9)} gzip${ANSI.reset}` +
              (overBudget ? ` ${ANSI.red}⚠${ANSI.reset}` : "")
          );
        }

        console.log(`    ${ANSI.dim}${"—".repeat(nameWidth + BAR_WIDTH + 4)}${ANSI.reset}`);
        console.log(
          `    ${"Total".padEnd(nameWidth)}  ${" ".repeat(BAR_WIDTH)}  ` +
            `${formatKb(typeRaw).padStart(9)} → ${formatKb(typeGzip).padStart(9)} gzip`
        );
      }

      console.log(
        `\n  ${ANSI.bold}Grand total: ${formatKb(grandRaw)} → ${formatKb(grandGzip)} gzip${ANSI.reset} (${rows.length} files)`
      );

      if (warnings.length) {
        console.log(`\n  ${ANSI.yellow}⚠ ${warnings.length} file(s) over budget:${ANSI.reset}`);
        warnings.forEach((w) => console.log(`    ${ANSI.yellow}- ${w}${ANSI.reset}`));
      }

      console.log("");
    },
  };
}

export default defineConfig({
  root: ROOT,
  // Vite's own per-file size listing is redundant with buildSummary()'s
  // table below; drop to 'warn' so only warnings/errors and our summary show.
  logLevel: "warn",
  // Vite defaults asset URLs to site-root-absolute (e.g. /assets/foo.woff2),
  // which breaks once this theme is served from a Drupal themes/ subpath.
  // A relative base makes emitted url()s relative to the referencing CSS file.
  base: "",
  build: {
    outDir: "components",
    emptyOutDir: false,
    sourcemap: IS_PROD ? false : true,
    minify: IS_PROD,
    // Replaced by the build-summary plugin's grouped, budget-checked table.
    reportCompressedSize: false,
    rollupOptions: {
      input: buildEntries(),
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [
    eslint({
      include: [`${COMPONENTS}/**/src/**/*.js`],
      overrideConfigFile: path.resolve(ROOT, "eslint.config.js"),
      emitWarning: true,
      emitError: true,
      failOnError: IS_CI,
      failOnWarning: IS_CI,
    }),
    stylelint({
      include: [`${COMPONENTS}/**/src/**/*.scss`],
      fix: false,
    }),
    svgSpritePlugin(),
    compileScssPlugin(),
    cleanStaleSourcemaps(),
    buildSummary(),
    // Transpile compiled JS for older browsers (matches babel.config.js targets)
    babel({
      babelHelpers: "bundled",
      extensions: [".js"],
      exclude: /node_modules/,
      configFile: path.resolve(ROOT, "babel.config.js"),
    }),
  ],
  resolve: {
    extensions: [".js", ".scss", ".css"],
  },
});
