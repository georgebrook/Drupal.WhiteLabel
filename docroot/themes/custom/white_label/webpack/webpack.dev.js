const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
  },
  stats: {
    all: false, // start by hiding everything
    assets: true, // show only the emitted assets
    entrypoints: true, // show entry points
    warnings: true, // show warnings
    errors: true, // show errors
    errorDetails: true, // include stack traces for errors
  },
});
