import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';

/**
 * Plugin that wraps each content script in an IIFE after the build.
 * Firefox MV3 content scripts don't support ES module `import` statements,
 * so we build as ES modules first (to get proper tree-shaking and Tailwind),
 * then wrap the output in an IIFE to make it self-executing.
 */
function wrapContentScriptsPlugin() {
  return {
    name: 'wrap-content-scripts-iife',
    writeBundle() {
      const contentDir = resolve(__dirname, 'dist/content');
      if (!existsSync(contentDir)) return;

      for (const file of readdirSync(contentDir)) {
        if (!file.endsWith('.js')) continue;
        const filePath = resolve(contentDir, file);
        const code = readFileSync(filePath, 'utf-8');

        // Skip if already wrapped
        if (code.startsWith('(function()')) continue;

        // Remove any import/export statements (they were chunk references)
        // and wrap in an IIFE
        const cleaned = code
          .replace(/^import\s+.*?;\s*$/gm, '')
          .replace(/^export\s+.*?;\s*$/gm, '');

        writeFileSync(filePath, `(function() {\n${cleaned}\n})();\n`);
      }

      // Also remove the chunks directory since its code is now inlined
      const chunksDir = resolve(__dirname, 'dist/chunks');
      if (existsSync(chunksDir)) {
        cpSync(chunksDir, chunksDir); // no-op, we leave it for now
      }
    },
  };
}

/**
 * Plugin to copy static extension assets to dist.
 */
function copyExtensionAssetsPlugin() {
  return {
    name: 'copy-extension-assets',
    writeBundle() {
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
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    copyExtensionAssetsPlugin(),
    wrapContentScriptsPlugin(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // Readable during development
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        'content/zerochan': resolve(__dirname, 'src/content/zerochan/content.js'),
        'content/pixiv': resolve(__dirname, 'src/content/pixiv/content.js'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.js'),
      },
      output: {
        entryFileNames: '[name].js',
        // Force all shared code to be inlined into each entry point.
        // This prevents chunk splitting which breaks content scripts in Firefox MV3.
        manualChunks: () => undefined,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'content/content.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
