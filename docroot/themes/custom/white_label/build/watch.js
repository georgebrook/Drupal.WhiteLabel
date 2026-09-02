const path = require("path");
const chokidar = require("chokidar");
const { build } = require("vite");

// Read by vite.config.js to skip the build-summary table during watch mode
// (rebuilds are frequent there; a full table on every save is noise).
process.env.VITE_WATCH_MODE = "true";

const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.resolve(ROOT, "components");
const ICONS = path.resolve(ROOT, "images/icons");

let building = false;
let pending = false;

/**
 * Run a full Vite build.
 * Re-requires vite.config.js fresh each time so that newly added or removed
 * component files are picked up by the entry-discovery glob in buildEntries().
 */
async function runBuild(reason) {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const start = Date.now();
  console.log(`\n[watch] Rebuilding (${reason})...`);

  try {
    delete require.cache[require.resolve("./vite.config.js")];
    const freshConfig = require("./vite.config.js");
    await build(freshConfig);
    console.log(`[watch] Done in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[watch] Build failed:", err);
  } finally {
    building = false;
    if (pending) {
      pending = false;
      runBuild("queued changes");
    }
  }
}

// Watch component JS/SCSS source files and icon SVGs.
// New files, edits, and deletions all trigger a full rebuild.
const watcher = chokidar.watch(
  [
    path.join(COMPONENTS, "**/src/**/*.js"),
    path.join(COMPONENTS, "**/src/**/*.scss"),
    path.join(ICONS, "*.svg"),
  ],
  {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  }
);

watcher.on("add", (file) => runBuild(`added: ${path.relative(ROOT, file)}`));
watcher.on("change", (file) => runBuild(`changed: ${path.relative(ROOT, file)}`));
watcher.on("unlink", (file) => runBuild(`removed: ${path.relative(ROOT, file)}`));

// Run an initial build when watch starts
runBuild("initial build");

console.log("[watch] Watching components/**/src and images/icons for changes...");
console.log("[watch] Press Ctrl+C to stop.\n");
