const path = require("path");
const glob = require("glob");
const fs = require("fs");
const ESLintPlugin = require("eslint-webpack-plugin");
const StylelintWebpackPlugin = require("stylelint-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const SVGSpritemapPlugin = require("svg-spritemap-webpack-plugin").default;

// Custom plugin to clean up -css.js files
class CleanCssJsPlugin {
  apply(compiler) {
    compiler.hooks.done.tap("CleanCssJsPlugin", (stats) => {
      const outputPath = stats.compilation.outputOptions.path;
      const cssJsFiles = glob.sync(path.join(outputPath, "**/*-css.js"));

      cssJsFiles.forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    });
  }
}

// Collect entries dynamically
const entries = {};

// Find JS files
const jsFiles = glob.sync(path.resolve(__dirname, "../components/**/src/*.js"));
jsFiles.forEach((file) => {
  const parsed = path.parse(file);
  const parts = parsed.dir.split(path.sep);
  const srcIndex = parts.lastIndexOf("src");
  const insideComponents = parts.slice(
    parts.indexOf("components") + 1,
    srcIndex,
  );
  const entryKey = insideComponents.length
    ? `${insideComponents.join("/")}/${parsed.name}`
    : parsed.name;
  entries[entryKey] = file;
});

// Find SCSS files
const scssFiles = glob.sync(
  path.resolve(__dirname, "../components/**/src/**/*.scss"),
);
scssFiles.forEach((file) => {
  const parsed = path.parse(file);
  const parts = parsed.dir.split(path.sep);
  const srcIndex = parts.lastIndexOf("src");
  const insideComponents = parts.slice(
    parts.indexOf("components") + 1,
    srcIndex,
  );
  const entryKey = insideComponents.length
    ? `${insideComponents.join("/")}/${parsed.name}-css`
    : `${parsed.name}-css`;
  entries[entryKey] = file;
});

const commonConfig = {
  entry: entries,
  output: {
    path: path.resolve(__dirname, "../components"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /svg-sprite\.js$/],
        use: "babel-loader",
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new ESLintPlugin({
      context: path.resolve(__dirname, ".."),
      extensions: ["js"],
      files: "components/**/src/*.js",
      emitWarning: true,
      emitError: true,
      failOnError: false,
      overrideConfigFile: path.resolve(__dirname, "../eslint.config.js"),
    }),
    new StylelintWebpackPlugin({
      files: "components/**/src/**/*.scss",
      fix: true,
      emitErrors: true,
      failOnError: true,
      lintDirtyModulesOnly: false,
    }),
    new MiniCssExtractPlugin({
      filename: ({ chunk }) => {
        return chunk.name.replace("-css", ".css");
      },
    }),
    new SVGSpritemapPlugin(path.resolve(__dirname, "../images/icons/*.svg"), {
      output: {
        filename: "../images/icons-sprite.svg",
      },
      sprite: {
        prefix: "",
        svgo: {
          plugins: [{ name: "preset-default", active: false }],
        },
      },
    }),
    new CleanCssJsPlugin(),
  ],
  resolve: {
    extensions: [".js", ".scss", ".css"],
  },
};

module.exports = commonConfig;
