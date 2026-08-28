# White Label Theme — Frontend Build

## Folder structure

```
web/themes/custom/white_label/
│
├── build/                          # Build tool config — not deployed
│   ├── vite.config.js              # Vite build config (entry discovery, plugins)
│   └── watch.js                   # Dev watcher (chokidar, triggers rebuilds)
│
├── components/                     # All component source and compiled files
│   ├── atoms/                      # Smallest reusable elements
│   │   └── button/
│   │       ├── src/
│   │       │   ├── button.js       ← source JS
│   │       │   └── button.scss     ← source SCSS
│   │       ├── button.js           ← compiled (auto-generated, do not edit)
│   │       └── button.css          ← compiled (auto-generated, do not edit)
│   │
│   ├── molecules/                  # Groups of atoms working together
│   │   └── card/
│   │       ├── src/
│   │       │   ├── card.js
│   │       │   └── card.scss
│   │       ├── card.js
│   │       └── card.css
│   │
│   ├── organisms/                  # Complex components made of molecules/atoms
│   │   └── header/
│   │       ├── src/
│   │       │   ├── header.js
│   │       │   └── header.scss
│   │       ├── header.js
│   │       └── header.css
│   │
│   ├── templates/                  # Full page-level layout components
│   │   └── landing-page/
│   │       ├── src/
│   │       │   └── landing-page.scss   ← SCSS only, no JS needed
│   │       └── landing-page.css
│   │
│   └── vendor/                     # Third party libraries (e.g. Swiper, Slick)
│       └── swiper/
│           ├── src/
│           │   ├── swiper.js       ← imports the npm package JS
│           │   └── swiper.scss     ← @use's the npm package CSS
│           ├── swiper.js
│           └── swiper.css
│
├── images/
│   ├── icons/                      # Individual SVG icon source files
│   │   ├── chevron-down.svg        ← drop your icon SVGs here
│   │   ├── arrow-right.svg
│   │   └── close.svg
│   ├── icons-sprite.svg            ← generated sprite (auto-generated, do not edit)
│   └── ...                         # Other images (logos, backgrounds etc.)
│
├── .gitignore
├── .prettierignore
├── .prettierrc.js                  # Prettier formatting config
├── .stylelintrc.js                 # Stylelint SCSS linting config
├── eslint.config.js                # ESLint JS linting config
├── package.json                    # Dependencies and npm scripts
└── README.md
```

## NPM scripts

| Command | What it does |
|---|---|
| `npm start` | Builds once then watches for changes — use this during development |
| `npm run build` | One-off build with source maps — use for staging |
| `npm run build:prod` | One-off build without source maps — use for production deployment |
| `npm run lint` | Lint all JS and SCSS source files, report issues |
| `npm run lint:fix` | Lint and auto-fix all JS and SCSS source files |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing changes (useful in CI) |

## Getting started

```bash
npm install
npm start
```

## Adding a new component

Create a folder anywhere under `components/` with a `src/` subfolder:

```
components/molecules/my-component/
  src/
    my-component.js
    my-component.scss
```

The build tool picks it up automatically — no config changes needed.
If you're running `npm start`, saving any file inside `src/` triggers a rebuild immediately.

## Adding a third party library (e.g. Swiper)

1. Install the package: `npm install swiper`
2. Create a vendor entry:

```
components/vendor/swiper/
  src/
    swiper.js     ← import 'swiper';
    swiper.scss   ← @use 'swiper/scss';
```

3. Add it to your `.libraries.yml`:

```yaml
vendor.swiper:
  js:
    components/vendor/swiper/swiper.js: {}
  css:
    component:
      components/vendor/swiper/swiper.css: {}
```

4. Declare it as a dependency on any component library that uses it:

```yaml
carousel:
  js:
    components/molecules/carousel/carousel.js: {}
  dependencies:
    - mytheme/vendor.swiper
```

## Adding icons

Drop any `.svg` file into `images/icons/`. The build tool regenerates
`images/icons-sprite.svg` automatically. Reference icons in Twig like:

```twig
<svg><use href="{{ base_path ~ directory }}/images/icons-sprite.svg#chevron-down"></use></svg>
```

## Source vs compiled files

Only ever edit files inside `src/` folders. The compiled `.js` and `.css`
files alongside `src/` are auto-generated on every build and should not
be edited directly — your changes will be overwritten.

## CSS-only components

Not every component needs JS. If a component only needs styles, just create
the `.scss` file and skip the `.js` file entirely. The build tool handles it.

## Drupal libraries

Reference compiled files in your `.libraries.yml`:

```yaml
button:
  css:
    component:
      components/atoms/button/button.css: {}
  js:
    components/atoms/button/button.js: {}
```
