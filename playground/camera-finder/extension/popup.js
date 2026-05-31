/**
 * popup.js - Popup logic
 *
 * Handles user interactions: start/stop collection, open dashboard,
 * and displays real-time progress from the background script.
 */

const btnCollect = document.getElementById("btnCollect");
const btnStop = document.getElementById("btnStop");
const btnDashboard = document.getElementById("btnDashboard");
const progressArea = document.getElementById("progressArea");
const progressBar = document.getElementById("progressBar");
const progressCount = document.getElementById("progressCount");
const progressPages = document.getElementById("progressPages");
const progressUrl = document.getElementById("progressUrl");
const statItems = document.getElementById("statItems");
const statModels = document.getElementById("statModels");
const statPages = document.getElementById("statPages");

// --- Load existing stats ---
async function loadStats() {
  const data = await browser.storage.local.get("cameraData");
  if (data.cameraData) {
    const { items, pagesVisited } = data.cameraData;
    statItems.textContent = items.length;
    const models = new Set(items.map((i) => i.model).filter((m) => m !== "Unknown"));
    statModels.textContent = models.size;
    statPages.textContent = pagesVisited || "—";
  }
}

// --- Start collection ---
btnCollect.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll('#searchOptions input[type="checkbox"]:checked');
  const searches = [];
  for (const cb of checkboxes) {
    searches.push({
      make: cb.dataset.make,
      model: cb.dataset.model,
      label: cb.dataset.label,
    });
  }

  if (searches.length === 0) return;

  browser.runtime.sendMessage({ action: "startCrawl", searches });

  btnCollect.classList.add("hidden");
  btnStop.classList.remove("hidden");
  progressArea.classList.remove("hidden");
  progressBar.style.width = "5%";
  progressCount.textContent = "0";
  progressPages.textContent = "0";
});

// --- Stop collection ---
btnStop.addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "stopCrawl" });
  btnStop.classList.add("hidden");
  btnCollect.classList.remove("hidden");
});

// --- Open dashboard ---
btnDashboard.addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "openDashboard" });
});

// --- Listen for status updates ---
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "crawlStatus") {
    updateProgress(message.status);
  }
});

function updateProgress(status) {
  progressCount.textContent = status.itemCount;
  progressPages.textContent = status.pagesVisited;

  if (status.currentUrl) {
    try {
      const url = new URL(status.currentUrl);
      const make = url.searchParams.get("SHMake") || "";
      const model = url.searchParams.get("SHModel") || "";
      progressUrl.textContent = make ? `Browsing: ${make} ${model}`.trim() : status.currentUrl;
    } catch {
      progressUrl.textContent = status.currentUrl;
    }
  }

  // Animate progress bar
  if (status.pagesVisited > 0) {
    const total = status.pagesVisited + status.pagesRemaining;
    const pct = Math.min(95, (status.pagesVisited / Math.max(total, 1)) * 100);
    progressBar.style.width = pct + "%";
  }

  if (!status.active) {
    progressBar.style.width = "100%";
    progressBar.style.animation = "none";
    btnStop.classList.add("hidden");
    btnCollect.classList.remove("hidden");
    loadStats();

    if (status.error) {
      progressUrl.textContent = "Error: " + status.error;
      progressUrl.className = "block mt-1 text-[11px] text-red-400 truncate max-w-[320px]";
    } else {
      progressUrl.textContent = "✅ Collection complete!";
      progressUrl.className = "block mt-1 text-[11px] text-emerald-400 truncate max-w-[320px]";
    }
  }
}

// --- Init ---
// Check if a crawl is already running
browser.runtime.sendMessage({ action: "getStatus" }).then((status) => {
  if (status && status.active) {
    btnCollect.classList.add("hidden");
    btnStop.classList.remove("hidden");
    progressArea.classList.remove("hidden");
    updateProgress(status);
  }
}).catch(() => {});

loadStats();
