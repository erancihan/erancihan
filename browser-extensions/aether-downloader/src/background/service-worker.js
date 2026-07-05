// AetherDownloader — Background Service Worker
// Handles download requests from content scripts with Referer injection

const DEFAULT_SETTINGS = {
  pixivSubfolder: 'pixiv',
  zerochanSubfolder: 'zerochan',
};

/**
 * Get current settings from browser storage.
 * @returns {Promise<object>}
 */
async function getSettings() {
  try {
    const data = await browser.storage.local.get('aetherSettings');
    return { ...DEFAULT_SETTINGS, ...(data.aetherSettings || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Download a file using the downloads API directly.
 * The webRequest.onBeforeSendHeaders listener injects the correct Referer
 * header for pximg.net requests, so we don't need to fetch-then-blob.
 *
 * @param {object} params
 * @param {string} params.url - The image URL to download
 * @param {string} params.filename - The relative path under Downloads/
 */
async function downloadFile({ url, filename }) {
  const downloadId = await browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: false,
    conflictAction: 'uniquify',
  });

  return downloadId;
}

// ─── Referer Injection via webRequest ───────────────────────────
// Pixiv's CDN (pximg.net) requires Referer: https://www.pixiv.net/
// Firefox ignores Referer set in fetch() headers (it's a forbidden header),
// so we inject it at the network layer instead.

browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const headers = details.requestHeaders || [];

    // Remove any existing Referer
    const filtered = headers.filter(
      (h) => h.name.toLowerCase() !== 'referer'
    );

    // Add the correct Referer for Pixiv
    filtered.push({ name: 'Referer', value: 'https://www.pixiv.net/' });

    return { requestHeaders: filtered };
  },
  { urls: ['*://*.pximg.net/*'] },
  ['blocking', 'requestHeaders']
);

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    downloadFile({
      url: message.url,
      filename: message.filename,
    })
      .then((downloadId) => {
        // Notify the content script of success
        if (sender.tab && sender.tab.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            action: 'downloadStarted',
            downloadId: downloadId,
            originalUrl: message.url,
          });
        }
      })
      .catch((err) => {
        console.error('AetherDownloader: download failed', err.message);
        if (sender.tab && sender.tab.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            action: 'downloadFailed',
            error: err.message,
            originalUrl: message.url,
          });
        }
      });

    // Return true to indicate async response handling
    return true;
  }

  if (message.action === 'getSettings') {
    getSettings().then(sendResponse);
    return true;
  }

  if (message.action === 'saveSettings') {
    browser.storage.local
      .set({ aetherSettings: message.settings })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.action === 'saveText') {
    // Use a data: URL rather than a Blob object URL. This avoids the
    // revoke-before-read race (revoking on the download() promise, which
    // resolves when the download *starts*, could truncate the file) and works
    // in a Chrome MV3 service worker, which has no URL.createObjectURL.
    const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(message.content);
    browser.downloads.download({
      url: dataUrl,
      filename: message.filename,
      saveAs: false,
      conflictAction: 'overwrite',
    }).catch((err) => {
      console.error('AetherDownloader: saveText failed', err.message);
    });
    return true;
  }
});
