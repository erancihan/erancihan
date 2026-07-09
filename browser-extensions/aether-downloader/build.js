import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import {
  cpSync,
  mkdirSync,
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
  watch as watchFs,
} from 'fs';

const __dirname = import.meta.dirname;

/**
 * Browser Extension build
 *
 * Emits TWO packaged trees from one shared JS build:
 *   dist/firefox — MV3 event-page background + blocking webRequest
 *   dist/chrome  — MV3 service worker + declarativeNetRequest
 *
 * The JS bundles are identical for both targets (a runtime shim aliases
 * `chrome`→`browser`, and the service worker guards the Firefox-only
 * webRequest listener). Only the manifest — and Chrome's rules.json — differ.
 *
 * Content scripts must be self-contained IIFE bundles (Firefox MV3 content
 * scripts don't support ES module imports), so each entry is built separately
 * with all dependencies inlined.
 */

const DIST = resolve(__dirname, 'dist');
const FF_DIR = resolve(DIST, 'firefox');
const CH_DIR = resolve(DIST, 'chrome');

const ENTRIES = [
  ['content/zerochan', 'src/content/zerochan/content.js'],
  ['content/pixiv', 'src/content/pixiv/content.js'],
  ['background/service-worker', 'src/background/service-worker.js'],
  ['popup/popup', 'src/popup/popup.js'],
];

/**
 * Build a single entry point as an IIFE bundle into `outDir`.
 * Tailwind CSS imported by an entry is inlined into that JS bundle and
 * injected into the page at runtime (there is no separate .css asset).
 * @param {string} entryName - Output path (without .js)
 * @param {string} entryPath - Source file path (relative to project root)
 * @param {string} outDir - Absolute output directory
 */
async function buildEntry(entryName, entryPath, outDir) {
  await build({
    configFile: false,
    plugins: [tailwindcss()],
    build: {
      outDir,
      emptyOutDir: false, // Don't clear between sequential entry builds
      minify: false,
      rollupOptions: {
        input: { [entryName]: resolve(__dirname, entryPath) },
        output: {
          format: 'iife',
          entryFileNames: '[name].js',
          inlineDynamicImports: true,
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
    logLevel: 'warn',
  });
}

/** Copy the browser-agnostic static assets (icons, popup HTML) into `destDir`. */
function copyStaticAssets(destDir) {
  const iconsSrc = resolve(__dirname, 'src/icons');
  if (existsSync(iconsSrc)) {
    mkdirSync(resolve(destDir, 'icons'), { recursive: true });
    cpSync(iconsSrc, resolve(destDir, 'icons'), { recursive: true });
  }

  const popupSrc = resolve(__dirname, 'src/popup/popup.html');
  if (existsSync(popupSrc)) {
    mkdirSync(resolve(destDir, 'popup'), { recursive: true });
    cpSync(popupSrc, resolve(destDir, 'popup/popup.html'));
  }
}

/**
 * Merge the shared base manifest (src/manifest.json) with per-browser fields.
 * @returns {{ firefox: object, chrome: object }}
 */
function buildManifests() {
  const base = JSON.parse(readFileSync(resolve(__dirname, 'src/manifest.json'), 'utf-8'));

  const firefox = {
    ...base,
    permissions: ['downloads', 'storage', 'webRequest', 'webRequestBlocking'],
    background: { scripts: ['background/service-worker.js'] },
    browser_specific_settings: {
      gecko: { id: 'aether-downloader@erancihan', strict_min_version: '109.0' },
    },
  };

  const chrome = {
    ...base,
    permissions: ['downloads', 'storage', 'declarativeNetRequest'],
    minimum_chrome_version: '102',
    background: { service_worker: 'background/service-worker.js' },
    declarative_net_request: {
      rule_resources: [{ id: 'pixiv_referer', enabled: true, path: 'rules.json' }],
    },
  };

  return { firefox, chrome };
}

// Main build orchestration
async function main() {
  // Clean dist
  if (existsSync(DIST)) rmSync(DIST, { recursive: true });
  mkdirSync(FF_DIR, { recursive: true });

  console.log('Building AetherDownloader...');

  // 1. Build the shared JS bundles into the Firefox tree.
  for (const [name, path] of ENTRIES) {
    console.log(`  → ${name}.js`);
    await buildEntry(name, path, FF_DIR);
  }

  // 2. Copy shared static assets (icons, popup.html) into the Firefox tree.
  console.log('  → copying icons, popup.html');
  copyStaticAssets(FF_DIR);

  // 3. Write the per-browser manifests.
  const { firefox, chrome } = buildManifests();
  writeFileSync(resolve(FF_DIR, 'manifest.json'), JSON.stringify(firefox, null, 2) + '\n');

  // 4. Derive the Chrome tree from the Firefox one, then swap in the Chrome
  //    manifest and add the declarativeNetRequest rules.
  console.log('  → assembling dist/chrome');
  cpSync(FF_DIR, CH_DIR, { recursive: true });
  writeFileSync(resolve(CH_DIR, 'manifest.json'), JSON.stringify(chrome, null, 2) + '\n');
  cpSync(resolve(__dirname, 'src/rules.json'), resolve(CH_DIR, 'rules.json'));

  console.log('✓ Build complete! (dist/firefox, dist/chrome)');
}

const isWatch = process.argv.includes('--watch');

async function run() {
  await main();
  if (!isWatch) return;

  console.log('\nWatching src/ for changes (Ctrl+C to stop)...');
  let rebuilding = false;
  let queued = false;
  let debounceTimer = null;

  const rebuild = async () => {
    if (rebuilding) {
      queued = true;
      return;
    }
    rebuilding = true;
    try {
      await main();
      console.log('  (waiting for changes...)');
    } catch (err) {
      console.error('Rebuild failed:', err);
    }
    rebuilding = false;
    if (queued) {
      queued = false;
      rebuild();
    }
  };

  watchFs(resolve(__dirname, 'src'), { recursive: true }, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuild, 150);
  });
}

run().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
