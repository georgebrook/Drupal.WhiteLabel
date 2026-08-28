module.exports = {
  extends: [
    "stylelint-config-standard-scss",
  ],
  plugins: [
    "stylelint-order",
  ],
  rules: {
    // Drupal CSS coding standards: https://www.drupal.org/docs/develop/standards/css

    // 2-space indentation
    indentation: 2,

    // Allow ID selectors — Drupal markup sometimes requires them
    "selector-max-id": null,

    // Warn on deeply nested selectors; 3 levels is usually enough with BEM
    "max-nesting-depth": 3,

    // Allow Sass partials without file extensions in @use/@forward
    "scss/at-import-partial-extension": null,

    // Single quotes for strings
    "string-quotes": "single",

    // BEM-style class naming: block__element--modifier
    "selector-class-pattern": [
      "^[a-z]([a-z0-9]+(-[a-z0-9]+)*)?(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
      {
        message: "Expected class selector to follow BEM naming (block__element--modifier)",
      },
    ],

    // Allow any CSS custom property naming (design tokens, etc.)
    "custom-property-pattern": null,

    // Property ordering following Drupal core's CSS property order
    // Grouped: positioning → box model → typography → visual → misc
    "order/properties-order": [
      [
        "content",
        "position",
        "top",
        "right",
        "bottom",
        "left",
        "z-index",
        "display",
        "flex",
        "flex-grow",
        "flex-shrink",
        "flex-basis",
        "flex-direction",
        "flex-wrap",
        "justify-content",
        "align-items",
        "align-content",
        "order",
        "grid",
        "grid-template-columns",
        "grid-template-rows",
        "grid-gap",
        "gap",
        "float",
        "clear",
        "box-sizing",
        "width",
        "min-width",
        "max-width",
        "height",
        "min-height",
        "max-height",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "border",
        "border-width",
        "border-style",
        "border-color",
        "border-radius",
        "overflow",
        "font",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "line-height",
        "letter-spacing",
        "text-align",
        "text-decoration",
        "text-transform",
        "color",
        "background",
        "background-color",
        "background-image",
        "background-position",
        "background-repeat",
        "background-size",
        "opacity",
        "box-shadow",
        "transform",
        "transition",
        "animation",
        "cursor",
        "pointer-events",
        "visibility",
      ],
      {
        unspecified: "bottomAlphabetical",
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.scss"],
      customSyntax: "postcss-scss",
    },
  ],
};
