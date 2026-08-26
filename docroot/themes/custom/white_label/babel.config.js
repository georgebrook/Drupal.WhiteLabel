module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: "> 0.25%, not dead", // modern browser support
        useBuiltIns: "usage",
        corejs: 3
      }
    ]
  ]
};
