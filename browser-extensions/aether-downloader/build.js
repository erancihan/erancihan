import { defineConfig, build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { cpSync, mkdirSync, existsSync, rmSync } from 'fs';

const __dirname = import.meta.dirname;

/**
 * Browser Extension Vite Config
 *
 * Strategy: We do multiple sequential builds since Firefox MV3 content scripts
 * do NOT support ES module imports. Each content script needs to be a fully
 * self-contained IIFE bundle with all dependencies inlined.
 *
 * Build targets:
 * 1. Content scripts (zerochan, pixiv) → IIFE, self-contained
 * 2. Background service worker → IIFE, self-contained
 * 3. Popup → IIFE, self-contained
 */

function copyStaticAssets() {
  // Copy manifest.json
  const manifestSrc = resolve(__dirname, 'src/manifest.json');
  const manifestDest = resolve(__dirname, 'dist/manifest.json');
  if (existsSync(manifestSrc)) {
    cpSync(manifestSrc, manifestDest);
  }

  // Copy icons
  const iconsSrc = resolve(__dirname, 'src/icons');
  const iconsDest = resolve(__dirname, 'dist/icons');
  if (existsSync(iconsSrc)) {
    mkdirSync(iconsDest, { recursive: true });
    cpSync(iconsSrc, iconsDest, { recursive: true });
  }

  // Copy popup HTML
  const popupSrc = resolve(__dirname, 'src/popup/popup.html');
  const popupDest = resolve(__dirname, 'dist/popup/popup.html');
  if (existsSync(popupSrc)) {
    mkdirSync(resolve(__dirname, 'dist/popup'), { recursive: true });
    cpSync(popupSrc, popupDest);
  }
}

/**
 * Build a single entry point as an IIFE bundle.
 * @param {string} entryName - Output path (without .js)
 * @param {string} entryPath - Source file path
 * @param {boolean} emitCss - Whether to emit CSS from this entry
 */
async function buildEntry(entryName, entryPath, emitCss = false) {
  const plugins = emitCss ? [tailwindcss()] : [tailwindcss()];

  await build({
    configFile: false,
    plugins,
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: false, // Don't clear between builds
      minify: false,
      rollupOptions: {
        input: { [entryName]: entryPath },
        output: {
          format: 'iife',
          entryFileNames: '[name].js',
          inlineDynamicImports: true,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'content/content.css';
            }
            return 'assets/[name][extname]';
          },
        },
      },
    },
    logLevel: 'warn',
  });
}

// Main build orchestration
async function main() {
  // Clean dist
  if (existsSync(resolve(__dirname, 'dist'))) {
    rmSync(resolve(__dirname, 'dist'), { recursive: true });
  }
  mkdirSync(resolve(__dirname, 'dist'), { recursive: true });

  console.log('Building AetherDownloader...');

  // 1. Build Zerochan content script (also emits CSS)
  console.log('  → content/zerochan.js + content.css');
  await buildEntry(
    'content/zerochan',
    resolve(__dirname, 'src/content/zerochan/content.js'),
    true
  );

  // 2. Build Pixiv content script
  console.log('  → content/pixiv.js');
  await buildEntry(
    'content/pixiv',
    resolve(__dirname, 'src/content/pixiv/content.js'),
    false
  );

  // 3. Build background service worker
  console.log('  → background/service-worker.js');
  await buildEntry(
    'background/service-worker',
    resolve(__dirname, 'src/background/service-worker.js'),
    false
  );

  // 4. Build popup
  console.log('  → popup/popup.js');
  await buildEntry(
    'popup/popup',
    resolve(__dirname, 'src/popup/popup.js'),
    false
  );

  // 5. Copy static assets
  console.log('  → copying manifest.json, icons, popup.html');
  copyStaticAssets();

  console.log('✓ Build complete!');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
