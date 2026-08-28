module.exports = {
  singleQuote: true,
  semi: true,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 100,
  overrides: [
    {
      // Twig templates use HTML parser
      files: "*.twig",
      options: {
        parser: "html",
      },
    },
    {
      // SCSS uses double quotes (Sass convention)
      files: "*.scss",
      options: {
        singleQuote: false,
      },
    },
  ],
};
