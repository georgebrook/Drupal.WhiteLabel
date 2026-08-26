const js = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const globals = require("globals");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  {
    files: ["components/**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "warn",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        Drupal: "readonly",
        once: "readonly",
        jQuery: "readonly",
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
  },

  eslintPluginPrettierRecommended,
]);
