const js = require("@eslint/js");
const globals = require("globals");
const { defineConfig } = require("eslint/config");
const { rules: airbnbBaseRules } = require("eslint-config-airbnb-extended/legacy");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = defineConfig([
  {
    // Never lint compiled output — only source files
    ignores: [
      "**/node_modules/**",
      "components/atoms/**/!(src)/*.js",
      "components/molecules/**/!(src)/*.js",
      "components/organisms/**/!(src)/*.js",
      "components/templates/**/!(src)/*.js",
      "components/vendor/**/!(src)/*.js",
      "**/*.min.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        // Drupal globals — available on every page via Drupal core
        Drupal: "readonly",
        drupalSettings: "readonly",
        drupalTranslations: "readonly",
        jQuery: "readonly",
        $: "readonly",
        _: "readonly",
        once: "readonly",
      },
    },
    rules: {
      ...airbnbBaseRules,

      // 2-space indentation (Drupal JS coding standard)
      indent: ["error", 2, { SwitchCase: 1 }],

      // Allow snake_case for Drupal behavior names e.g. Drupal.behaviors.my_behavior
      camelcase: ["error", { properties: "never", ignoreDestructuring: true }],

      // Drupal behaviors routinely reassign context and settings params
      "no-param-reassign": ["error", { props: false }],

      // Allow for...of — common in modern Drupal JS alongside once()
      "no-restricted-syntax": [
        "error",
        {
          selector: "ForInStatement",
          message: "for...in iterates over the entire prototype chain. Use Object.{keys,values,entries} instead.",
        },
        {
          selector: "LabeledStatement",
          message: "Labels are a form of GOTO.",
        },
        {
          selector: "WithStatement",
          message: "`with` is disallowed in strict mode.",
        },
      ],

      // Allow console.warn/error for debugging; disallow console.log
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Single quotes (consistent with Prettier config)
      quotes: ["error", "single", { avoidEscape: true }],

      // Allow _-prefixed variables for intentionally unused params
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Must be last — disables ESLint rules that conflict with Prettier formatting
  eslintConfigPrettier,
]);
