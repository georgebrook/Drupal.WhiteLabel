const path = require("path");
const { glob } = require("glob");
const { defineConfig } = require("vite");
const eslint = require("vite-plugin-eslint2");
const stylelint = require("vite-plugin-stylelint");
const { ViteSvgSpritemapPlugin } = require("vite-svg-spritemap-plugin");

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
 * Rollup plugin that removes the empty .js stubs Rollup emits for CSS-only
 * entries (e.g. styles/atoms/button/button.js) after the build completes.
 */
function cleanCssJs() {
  return {
    name: "clean-css-js",
    closeBundle() {
      const outDir = path.resolve(ROOT, "components");
      glob.sync(path.join(outDir, "styles/**/*.js")).forEach((file) => {
        try {
          require("fs").unlinkSync(file);
        } catch (_) {
          // ignore
        }
      });
    },
  };
}

module.exports = defineConfig({
  root: ROOT,
  build: {
    outDir: "components",
    emptyOutDir: false,
    sourcemap: IS_PROD ? false : true,
    rollupOptions: {
      input: buildEntries(),
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            // Strip the "styles/" prefix so button.css lands next to button.js
            // e.g. styles/atoms/button/button.css -> atoms/button/button.css
            return assetInfo.name.replace(/^styles\//, "") + ".css";
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
    ViteSvgSpritemapPlugin(path.resolve(ROOT, "images/icons/*.svg"), {
      output: {
        filename: "images/icons-sprite.svg",
      },
      svgo: {
        plugins: [
          {
            name: "preset-default",
            params: {
              overrides: {
                // Preserve viewBox so icons scale correctly at any size
                removeViewBox: false,
              },
            },
          },
        ],
      },
    }),
    cleanCssJs(),
  ],
  resolve: {
    extensions: [".js", ".scss", ".css"],
  },
});
