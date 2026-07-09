// AetherDownloader — Popup Settings Logic
// Loads and saves extension settings to browser.storage.local

import '../browser-polyfill.js';
import '../styles/input.css';

const DEFAULTS = {
  pixivSubfolder: 'pixiv',
  zerochanSubfolder: 'zerochan',
  previewEnabled: true,
  previewDelay: 400,
  previewMaxHeight: 85,
  previewMaxWidth: 50,
  zerochanMaxPages: 1,
  pixivFolderTemplate: '{userName}-{userId}/{workId}-{title}',
  zerochanFolderTemplate: '{character}',
};

/**
 * Load settings from storage and populate the form.
 */
async function loadSettings() {
  try {
    const data = await browser.storage.local.get('aetherSettings');
    const settings = { ...DEFAULTS, ...(data.aetherSettings || {}) };

    document.getElementById('pixiv-path').value = settings.pixivSubfolder;
    document.getElementById('pixiv-template').value = settings.pixivFolderTemplate;
    document.getElementById('zerochan-path').value = settings.zerochanSubfolder;
    document.getElementById('zerochan-template').value = settings.zerochanFolderTemplate;
    document.getElementById('zerochan-max-pages').value = settings.zerochanMaxPages;
    document.getElementById('preview-enabled').checked = settings.previewEnabled;
    document.getElementById('preview-delay').value = settings.previewDelay;
    document.getElementById('preview-max-height').value = settings.previewMaxHeight;
    document.getElementById('preview-max-width').value = settings.previewMaxWidth;
  } catch (err) {
    console.error('Failed to load settings:', err.message);
  }
}

/**
 * Save current form values to storage.
 */
async function saveSettings() {
  const settings = {
    pixivSubfolder: document.getElementById('pixiv-path').value.trim() || DEFAULTS.pixivSubfolder,
    pixivFolderTemplate: document.getElementById('pixiv-template').value.trim() || DEFAULTS.pixivFolderTemplate,
    zerochanSubfolder: document.getElementById('zerochan-path').value.trim() || DEFAULTS.zerochanSubfolder,
    zerochanFolderTemplate: document.getElementById('zerochan-template').value.trim() || DEFAULTS.zerochanFolderTemplate,
    zerochanMaxPages: parseInt(document.getElementById('zerochan-max-pages').value, 10) || DEFAULTS.zerochanMaxPages,
    previewEnabled: document.getElementById('preview-enabled').checked,
    previewDelay: parseInt(document.getElementById('preview-delay').value, 10) || DEFAULTS.previewDelay,
    previewMaxHeight: parseInt(document.getElementById('preview-max-height').value, 10) || DEFAULTS.previewMaxHeight,
    previewMaxWidth: parseInt(document.getElementById('preview-max-width').value, 10) || DEFAULTS.previewMaxWidth,
  };

  try {
    await browser.storage.local.set({ aetherSettings: settings });
    showStatus('Settings saved!', 'success');
  } catch (err) {
    showStatus('Failed to save: ' + err.message, 'error');
  }
}

/**
 * Show a status message below the save button.
 * @param {string} text
 * @param {'success'|'error'} type
 */
function showStatus(text, type) {
  const el = document.getElementById('status-msg');
  el.textContent = text;
  el.style.color = type === 'success' ? '#34d399' : '#f87171';
  setTimeout(() => {
    el.textContent = '';
  }, 2000);
}

// Bind events
document.getElementById('save-btn').addEventListener('click', saveSettings);

// Load on open
loadSettings();
