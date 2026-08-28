# White Label

A Drupal 11 theme built with **Single Directory Components (SDC)** and powered by **Vite** for asset compilation.

## Key features

- **SDC Ready**: components live under `components/` as `<name>.component.yml` + `<name>.twig` pairs, auto-discovered by Drupal core
- **SCSS**: compiled with Dart Sass
- **ES6+ JavaScript**: transpiled via Babel (`@babel/preset-env`, targets `> 0.25%, not dead`, `core-js` polyfills) so modern source still supports older browsers
- **ESLint + Stylelint**: run as Vite plugins during every build, plus standalone `lint`/`lint:fix` commands
- **SVG sprite generation**: all files in `images/icons/` are combined into `images/icons-sprite.svg`
- **Watch mode**: `npm start` rebuilds on every save

## Project structure

```
white_label/
├── build/
│   ├── vite.config.js      # Entry discovery, plugins, output mapping
│   └── watch.js            # File watcher — reruns a full Vite build on change
├── components/
│   ├── quarks/              # Global styles: reset, base, grid, theme variables, global.js
│   ├── atoms/                # Smallest reusable elements
│   ├── molecules/            # Groups of atoms
│   ├── organisms/            # Complex compositions (e.g. hero-image)
│   ├── templates/            # Page-level layout components
│   └── vendor/                # Third-party libraries (Swiper, etc.)
├── images/
│   ├── icons/               # Source SVGs
│   └── icons-sprite.svg     # Generated sprite (auto-generated, do not edit)
├── templates/                # Drupal template overrides (page, node, field, block, paragraphs)
├── babel.config.js
├── eslint.config.js
├── .stylelintrc.js
├── .prettierrc.js
├── white_label.info.yml
├── white_label.libraries.yml
└── package.json
```

## Single Directory Components (SDC)

Each component follows the SDC pattern:

```
components/[type]/[component-name]/
├── [component-name].component.yml   # Component definition (schema, props, slots)
├── [component-name].twig            # Twig template
├── src/
│   ├── [component-name].js         # Source JS (edit this)
│   └── [component-name].scss       # Source SCSS (edit this)
├── [component-name].js              # Compiled — auto-generated, do not edit
└── [component-name].css             # Compiled — auto-generated, do not edit
```

Drupal core auto-registers a library per component from the compiled `.css`/`.js` files that share the component's base name — no manual `libraries.yml` entry needed for component-level assets.

Only edit files inside `src/`. Compiled `.css`/`.js` are regenerated on every build.

## NPM commands

| Command | What it does |
|---|---|
| `npm start` | Builds once, then watches `components/**/src` and `images/icons` for changes |
| `npm run build` | One-off build with source maps |
| `npm run build:prod` | One-off build without source maps — use before committing/deploying |
| `npm run lint` | Lint all JS and SCSS source files |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing changes |

## Getting started

```bash
npm install
npm start
```

Then, from the Drupal side:

```bash
drush cache:rebuild
```

## Adding a new component

Create a folder anywhere under `components/` with a `src/` subfolder:

```
components/molecules/my-component/
  my-component.component.yml
  my-component.twig
  src/
    my-component.js
    my-component.scss
```

The build tool discovers `src/*.js` and `src/*.scss` files automatically — no config changes needed. CSS-only components can skip the `.js` file entirely.

## Adding a third-party library (e.g. Swiper)

1. `npm install swiper`
2. Create a vendor entry:

```
components/vendor/swiper/
  src/
    swiper.js     ← import 'swiper';
    swiper.scss   ← @use 'swiper/scss';
```

3. Add it to `white_label.libraries.yml`:

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
  dependencies:
    - white_label/vendor.swiper
```

## Adding icons

Drop an `.svg` file into `images/icons/`. The build regenerates `images/icons-sprite.svg`, with each icon's `<symbol>` id matching its filename exactly (no prefix). Reference it in Twig:

```twig
<svg><use href="{{ base_path ~ directory }}/images/icons-sprite.svg#chevron-down"></use></svg>
```

New icon files require restarting `npm start` (chokidar watches the `images/icons/` directory, but only picks up added files on the next process start — modifying an existing SVG rebuilds automatically).

## Browser support

JS source can use modern syntax freely — Babel transpiles it against the `browserslist` query in `babel.config.js` (`> 0.25%, not dead`) with `core-js` polyfills applied on a per-usage basis.

## Build artifacts

Compiled CSS/JS and the generated icon sprite are committed to version control (there's no CI build step in this repo yet), so the site works immediately after a fresh clone with no `npm install`/`npm run build` required. Run `npm run build:prod` and commit the result whenever you change anything under `src/` or `images/icons/`.
