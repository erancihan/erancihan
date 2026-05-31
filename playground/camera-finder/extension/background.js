/**
 * background.js - Crawling Orchestrator
 *
 * Manages the automated crawling of LCE search pages.
 * Navigates the user's active tab through pages, waits for content scripts
 * to extract data, and stores everything in browser.storage.local.
 */

/* global CAMERA_DB, identifyModel, computeValueScore */

const SEARCH_BASE = "https://www.lcegroup.co.uk/Secondhand-Search/";

// Default search configurations
const SEARCH_CONFIGS = [
  { make: "Sony",   model: "A7",    label: "Sony A7 series" },
  { make: "Canon",  model: "EOS R", label: "Canon EOS R series" },
  { make: "Nikon",  model: "Z",     label: "Nikon Z series" },
];

// Crawl state
let crawlState = {
  active: false,
  queue: [],        // URLs to visit
  visited: [],      // URLs already visited
  items: [],        // Collected items
  currentUrl: null,
  tabId: null,
  error: null,
  startTime: null,
};

/**
 * Build a search URL from parameters.
 */
function buildSearchUrl(make, model) {
  const params = new URLSearchParams({
    Order: "Condition",
    View: "Grid",
    SHMake: make || "",
    SHType: "",
    SHModel: model || "",
    Location: "",
    Results: "48",
  });
  return `${SEARCH_BASE}?${params.toString()}`;
}

/**
 * Wait for a specified number of milliseconds.
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a tab to finish loading.
 */
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    browser.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Send a message to the content script in a tab and get a response.
 * Retries a few times in case the content script isn't ready yet.
 */
async function sendToContentScript(tabId, message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      return response;
    } catch {
      // Content script not ready yet, wait and retry
      if (i < retries - 1) {
        await wait(1500);
      }
    }
  }
  return null;
}

/**
 * Process a single URL: navigate, extract data, detect pagination.
 */
async function processUrl(url) {
  crawlState.currentUrl = url;
  broadcastStatus();

  // Navigate the tab
  await browser.tabs.update(crawlState.tabId, { url });
  await waitForTabLoad(crawlState.tabId);

  // Give the page extra time for dynamic content
  await wait(2500);

  // Ask content script to extract data
  const response = await sendToContentScript(crawlState.tabId, {
    action: "extractData",
  });

  if (!response) {
    console.warn("No response from content script for:", url);
    return { items: [], nextPage: null };
  }

  // Enrich items with model identification and value scores
  const enrichedItems = (response.items || []).map((item) => {
    const model = identifyModel(item.name);
    const specs = model ? CAMERA_DB[model] : null;
    const valueScore = computeValueScore(
      item.price,
      item.condition?.stars || 0,
      specs
    );

    return {
      ...item,
      model: model || "Unknown",
      specs: specs || null,
      valueScore,
    };
  });

  return {
    items: enrichedItems,
    nextPage: response.nextPage || null,
  };
}

/**
 * Main crawl loop.
 */
async function runCrawl(tabId, searches) {
  crawlState = {
    active: true,
    queue: [],
    visited: [],
    items: [],
    currentUrl: null,
    tabId,
    error: null,
    startTime: Date.now(),
  };

  // Build the initial queue from search configs
  for (const search of searches) {
    crawlState.queue.push({
      url: buildSearchUrl(search.make, search.model),
      label: search.label,
    });
  }

  broadcastStatus();

  try {
    while (crawlState.queue.length > 0 && crawlState.active) {
      const entry = crawlState.queue.shift();
      const url = entry.url;

      if (crawlState.visited.includes(url)) continue;
      crawlState.visited.push(url);

      const result = await processUrl(url);

      // Add items (deduplicate by ID)
      for (const item of result.items) {
        const key = item.id || `${item.name}-${item.price}`;
        const existingIdx = crawlState.items.findIndex(
          (existing) => (existing.id || `${existing.name}-${existing.price}`) === key
        );
        if (existingIdx >= 0) {
          // Update if this one has more data (e.g., from detail page)
          if (item.pageType === "detail") {
            crawlState.items[existingIdx] = item;
          }
        } else {
          crawlState.items.push(item);
        }
      }

      // Queue next page if present
      if (result.nextPage && !crawlState.visited.includes(result.nextPage)) {
        crawlState.queue.unshift({
          url: result.nextPage,
          label: entry.label + " (next page)",
        });
      }

      broadcastStatus();

      // Respectful delay between requests (3-5 seconds random)
      if (crawlState.queue.length > 0) {
        const delay = 3000 + Math.random() * 2000;
        await wait(delay);
      }
    }
  } catch (err) {
    crawlState.error = err.message;
    console.error("Crawl error:", err);
  }

  // Save collected data to storage
  const data = {
    items: crawlState.items,
    collectedAt: new Date().toISOString(),
    pagesVisited: crawlState.visited.length,
    duration: Date.now() - crawlState.startTime,
  };
  await browser.storage.local.set({ cameraData: data });

  crawlState.active = false;
  broadcastStatus();
}

/**
 * Broadcast current crawl status to popup.
 */
function broadcastStatus() {
  const status = {
    active: crawlState.active,
    itemCount: crawlState.items.length,
    pagesVisited: crawlState.visited.length,
    pagesRemaining: crawlState.queue.length,
    currentUrl: crawlState.currentUrl,
    error: crawlState.error,
  };

  // Send to popup (if open)
  browser.runtime.sendMessage({ action: "crawlStatus", status }).catch(() => {
    // Popup not open, ignore
  });
}

// --- Message handlers ---
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startCrawl") {
    // Get the active tab and start crawling
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length === 0) return;

      const searches = message.searches || SEARCH_CONFIGS;
      runCrawl(tabs[0].id, searches);
    });
    sendResponse({ started: true });
    return false;
  }

  if (message.action === "stopCrawl") {
    crawlState.active = false;
    sendResponse({ stopped: true });
    return false;
  }

  if (message.action === "getStatus") {
    sendResponse({
      active: crawlState.active,
      itemCount: crawlState.items.length,
      pagesVisited: crawlState.visited.length,
      pagesRemaining: crawlState.queue.length,
      currentUrl: crawlState.currentUrl,
      error: crawlState.error,
    });
    return false;
  }

  if (message.action === "openDashboard") {
    browser.tabs.create({
      url: browser.runtime.getURL("dashboard.html"),
    });
    sendResponse({ opened: true });
    return false;
  }

  return false;
});
