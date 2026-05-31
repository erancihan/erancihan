/**
 * content.js - Data Extractor
 *
 * Injected on LCE search and detail pages.
 * Listens for messages from the background script and responds with
 * extracted product data. Does NOT auto-extract on page load.
 */

/* global identifyModel */

// --- Extraction helpers ---

function parseStars(text) {
  const match = text.match(/\*+/);
  return match ? match[0].length : 0;
}

function extractShutterCount(text) {
  const match = text.match(
    /(?:shutter\s*count\s*(?:on\s*)?|actuations?\s*(?:on\s*)?)(\d[\d,.]*k?)/i
  );
  if (match) {
    let val = match[1].replace(/,/g, "");
    if (val.toLowerCase().endsWith("k")) return Math.round(parseFloat(val) * 1000);
    return parseInt(val, 10);
  }
  const fieldMatch = text.match(/Shutter\s*Count:\s*(\d[\d,.]*k?)/i);
  if (fieldMatch) {
    let val = fieldMatch[1].replace(/,/g, "");
    if (val.toLowerCase().endsWith("k")) return Math.round(parseFloat(val) * 1000);
    return parseInt(val, 10);
  }
  return null;
}

function isBoxed(name) {
  return /boxed|with\s*box/i.test(name);
}

function isDetailPage() {
  return /\/Used\//i.test(window.location.pathname);
}

function isSearchPage() {
  return /\/Secondhand-Search\//i.test(window.location.pathname);
}

// --- Search page extraction ---

function extractSearchPageItems() {
  const items = [];
  const productBoxes = document.querySelectorAll(".ProductBox");

  for (const el of productBoxes) {
    const nameEl = el.querySelector("strong a");
    if (!nameEl) continue;

    const name = nameEl.textContent.trim();
    const href = nameEl.getAttribute("href") || "";
    const fullText = el.textContent || "";

    const priceMatch = fullText.match(/Price\s*[£]\s*([\d,]+(?:\.\d{2})?)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : null;
    if (!price) continue;

    const condMatch = fullText.match(/Condition:\s*(\*+)/);
    const stars = condMatch ? condMatch[1].length : 0;

    const locMatch = fullText.match(/Location:\s*(.+?)(?:\n|\r|$)/);
    const location = locMatch ? locMatch[1].trim() : "";

    const catMatch = fullText.match(/Category:\s*(.+?)(?:\n|\r|$)/);
    const category = catMatch ? catMatch[1].trim() : "";

    const imgEl = el.querySelector("img");
    const image = imgEl ? imgEl.getAttribute("src") || "" : "";

    const idMatch = href.match(/_(\d+)\.html/);
    const productId = idMatch ? idMatch[1] : null;

    items.push({
      id: productId,
      name,
      price,
      condition: { stars, label: stars >= 5 ? "Excellent" : stars >= 4 ? "Good" : stars >= 3 ? "Average" : "Unknown" },
      location,
      category,
      url: href.startsWith("http") ? href : "https://www.lcegroup.co.uk" + href,
      image: image.startsWith("http") ? image : "https://www.lcegroup.co.uk" + image,
      shutterCount: extractShutterCount(name),
      boxed: isBoxed(name),
      pageType: "search",
    });
  }

  return items;
}

// --- Detail page extraction ---

function extractDetailPageItem() {
  const h1 = document.querySelector("h1");
  if (!h1) return null;

  const name = h1.textContent.trim();
  const fullText = document.body.textContent || "";

  // Price
  let price = null;
  for (const el of document.querySelectorAll('[style*="font-size:36px"], [style*="font-size: 36px"]')) {
    const match = el.textContent.match(/[\d,]+(?:\.\d{2})?/);
    if (match) { price = parseFloat(match[0].replace(/,/g, "")); break; }
  }
  if (!price) {
    const m = fullText.match(/[£]\s*([\d,]+(?:\.\d{2})?)/);
    if (m) price = parseFloat(m[1].replace(/,/g, ""));
  }
  if (!price) return null;

  // Condition
  const condSection = fullText.match(/Condition:\s*(\*+)\s*\(([^)]+)\)/);
  let stars = 0, condLabel = "";
  if (condSection) {
    stars = condSection[1].length;
    condLabel = condSection[2].trim();
  } else {
    const simple = fullText.match(/Condition:\s*(\*+)/);
    if (simple) stars = simple[1].length;
  }

  // Shutter count
  let shutterCount = null;
  const scField = fullText.match(/Shutter\s*Count:\s*(\d[\d,.]*k?)/i);
  if (scField) {
    let val = scField[1].replace(/,/g, "");
    shutterCount = val.toLowerCase().endsWith("k")
      ? Math.round(parseFloat(val) * 1000)
      : parseInt(val, 10);
  }
  if (!shutterCount) shutterCount = extractShutterCount(name);

  // Branch & details
  const branchMatch = fullText.match(/Branch:\s*(.+?)(?:\n|\r|$)/);
  const typeMatch = fullText.match(/Type:\s*(.+?)(?:\n|\r|$)/);
  const idMatch = window.location.pathname.match(/_(\d+)\.html/);

  return {
    id: idMatch ? idMatch[1] : null,
    name,
    price,
    condition: { stars, label: condLabel || (stars >= 5 ? "Excellent" : stars >= 4 ? "Good" : "Unknown") },
    location: branchMatch ? branchMatch[1].trim() : "",
    category: typeMatch ? typeMatch[1].trim() : "",
    url: window.location.href,
    image: "",
    shutterCount,
    boxed: isBoxed(name),
    pageType: "detail",
  };
}

// --- Pagination detection ---

function detectNextPage() {
  // Look for "Next" or ">" pagination links
  const links = document.querySelectorAll("a");
  for (const link of links) {
    const text = link.textContent.trim().toLowerCase();
    if (text === "next" || text === "next >" || text === ">" || text === "»" || text === "next page") {
      const href = link.getAttribute("href");
      if (href) {
        return href.startsWith("http") ? href : "https://www.lcegroup.co.uk" + href;
      }
    }
  }

  // Also look for paginated URL pattern (e.g., &Start=48)
  const currentUrl = window.location.href;
  const startMatch = currentUrl.match(/[&?]Start=(\d+)/);
  const currentStart = startMatch ? parseInt(startMatch[1], 10) : 0;
  const itemCount = document.querySelectorAll(".ProductBox").length;

  // If we got a full page of results (48), there might be more
  if (itemCount >= 48) {
    const nextStart = currentStart + 48;
    if (currentUrl.includes("Start=")) {
      return currentUrl.replace(/Start=\d+/, "Start=" + nextStart);
    }
    return currentUrl + "&Start=" + nextStart;
  }

  return null;
}

// --- Message listener ---

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractData") {
    let items = [];
    let nextPage = null;

    if (isSearchPage()) {
      items = extractSearchPageItems();
      nextPage = detectNextPage();
    } else if (isDetailPage()) {
      const item = extractDetailPageItem();
      if (item) items = [item];
    }

    sendResponse({ items, nextPage, url: window.location.href });
    return false;
  }

  return false;
});
