const path = require("path");
const { glob } = require("glob");
const { defineConfig } = require("vite");
const eslint = require("vite-plugin-eslint2");
const stylelint = require("vite-plugin-stylelint");
const { babel } = require("@rollup/plugin-babel");
const { optimize } = require("svgo");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.resolve(ROOT, "components");
const IS_CI = process.env.CI === "true";
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Discover JS and SCSS entry points separately to avoid key collisions.
 *
 * JS:   components/atoms/button/src/button.js   -> entry key: atoms/button/button
 *       output: components/atoms/button/button.js
 *
 * SCSS: components/atoms/button/src/button.scss -> entry key: styles/atoms/button/button
 *       output: components/atoms/button/button.css
 *       (the spurious styles/atoms/button/button.js stub is cleaned up by cleanCssJs)
 */
function buildEntries() {
  const entries = {};

  const addFiles = (pattern, keyPrefix = "") => {
    glob.sync(pattern).forEach((file) => {
      const parsed = path.parse(file);
      const parts = parsed.dir.split(path.sep);
      const srcIndex = parts.lastIndexOf("src");
      const insideComponents = parts.slice(
        parts.indexOf("components") + 1,
        srcIndex
      );
      const base = insideComponents.length
        ? `${insideComponents.join("/")}/${parsed.name}`
        : parsed.name;
      const entryKey = keyPrefix ? `${keyPrefix}/${base}` : base;
      entries[entryKey] = file;
    });
  };

  addFiles(path.resolve(COMPONENTS, "**/src/**/*.js"));
  addFiles(path.resolve(COMPONENTS, "**/src/**/*.scss"), "styles");

  return entries;
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
 * Rollup plugin that removes the empty .js stubs Rollup emits for CSS-only
 * entries (e.g. styles/atoms/button/button.js) after the build completes.
 */
function cleanCssJs() {
  return {
    name: "clean-css-js",
    closeBundle() {
      const outDir = path.resolve(ROOT, "components");
      fs.rmSync(path.join(outDir, "styles"), { recursive: true, force: true });
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

module.exports = defineConfig({
  root: ROOT,
  build: {
    outDir: "components",
    emptyOutDir: false,
    sourcemap: IS_PROD ? false : true,
    minify: IS_PROD,
    rollupOptions: {
      input: buildEntries(),
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            // Strip the "styles/" prefix so button.css lands next to button.js
            // e.g. styles/atoms/button/button.css -> atoms/button/button.css
            return assetInfo.name.replace(/^styles\//, "");
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    cssCodeSplit: true,
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
    cleanStaleSourcemaps(),
    cleanCssJs(),
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
