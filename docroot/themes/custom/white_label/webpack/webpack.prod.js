const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const WebpackBar = require("webpackbar");

module.exports = merge(common, {
  mode: "production",
  devtool: false,
  stats: {
    preset: "errors-warnings",
    assets: false,
    entrypoints: false,
    chunks: false,
    modules: false,
    colors: true,
  },
  plugins: [
    new WebpackBar({
      name: " Build Theme Assets",
      color: "#4caf50",
      reporters: ["fancy", "stats"],
      profile: true,
    }),
  ],
});
