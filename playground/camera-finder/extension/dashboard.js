/**
 * dashboard.js - Analysis Dashboard Logic
 *
 * Reads collected camera data from browser.storage.local and renders
 * interactive charts, filters, tables, and use-case recommendations.
 */

const MODEL_COLORS = {
  "A7 II":"#6366f1","A7 III":"#818cf8","A7 IV":"#a78bfa","A7C":"#10b981",
  "A7C II":"#34d399","A7CR":"#06b6d4","A7R II":"#f59e0b","A7R III":"#fbbf24",
  "A7R IV":"#f43f5e","A7R V":"#fb7185","EOS RP":"#8b5cf6","EOS R":"#7c3aed",
  "EOS R6":"#c084fc","EOS R6 II":"#d946ef","EOS R8":"#e879f9",
  "Z5":"#22d3ee","Z6":"#67e8f9","Z6 II":"#a5f3fc","Z6 III":"#2dd4bf",
  "Z7":"#f97316","Z7 II":"#fb923c",
};

let allData = [], filteredData = [], activeFilter = "all";
let sortCol = "valueScore", sortDir = "desc";

function mc(m) { return MODEL_COLORS[m] || "#888"; }

// --- Init ---
async function init() {
  const stored = await browser.storage.local.get("cameraData");
  if (!stored.cameraData || !stored.cameraData.items || stored.cameraData.items.length === 0) {
    document.getElementById("emptyState").classList.remove("hidden");
    return;
  }
  allData = stored.cameraData.items;
  filteredData = [...allData];
  document.getElementById("mainContent").classList.remove("hidden");
  render();
}

function render() { renderHeader(); renderSummary(); renderFilters(); applyFilter(); }

function applyFilter() {
  filteredData = activeFilter === "all" ? [...allData] : allData.filter(i => i.model === activeFilter);
  applySort();
  renderScatter(); renderBar(); renderTable(); renderUseCases();
  document.getElementById("listingCount").textContent =
    filteredData.length + " listing" + (filteredData.length !== 1 ? "s" : "");
}

function applySort() {
  filteredData.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === "condition") { va = a.condition?.stars||0; vb = b.condition?.stars||0; }
    if (sortCol === "name") {
      va = (va||"").toLowerCase(); vb = (vb||"").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === "asc" ? (va||0) - (vb||0) : (vb||0) - (va||0);
  });
}

// --- Header Stats ---
function renderHeader() {
  const el = document.getElementById("headerStats");
  el.textContent = "";
  const models = new Set(allData.map(d => d.model).filter(m => m !== "Unknown"));
  const avg = allData.length ? Math.round(allData.reduce((s,d) => s + (d.price||0), 0) / allData.length) : 0;
  [{ct: allData.length, l: "listings"}, {ct: models.size, l: "models"}, {ct: "£"+avg, l: "avg price"}].forEach(s => {
    const d = document.createElement("div"); d.className = "flex items-center gap-1.5";
    const c = document.createElement("span"); c.className = "font-bold text-indigo-300 text-[15px]"; c.textContent = s.ct;
    const lb = document.createElement("span"); lb.textContent = s.l;
    d.append(c, lb); el.appendChild(d);
  });
}

// --- Summary Cards ---
function renderSummary() {
  const el = document.getElementById("summaryCards"); el.textContent = "";
  const ws = allData.filter(d => d.valueScore != null);
  const best = ws.length ? ws.reduce((a,b) => a.valueScore > b.valueScore ? a : b) : null;
  const cheapest = allData.length ? allData.reduce((a,b) => (a.price||Infinity) < (b.price||Infinity) ? a : b) : null;
  const exc = allData.filter(d => d.condition?.stars === 5);
  const mn = allData.length ? Math.min(...allData.map(d=>d.price||Infinity)) : 0;
  const mx = allData.length ? Math.max(...allData.map(d=>d.price||0)) : 0;

  const cards = [
    { lbl:"Best Value", val: best?best.model:"—", det: best?`£${best.price} · ${best.condition.stars}★ · ${best.valueScore}`:"", cls:"text-emerald-400" },
    { lbl:"Cheapest", val: cheapest?`£${cheapest.price}`:"—", det: cheapest?cheapest.name.substring(0,35):"", cls:"text-cyan-400" },
    { lbl:"Price Range", val:`£${mn}–£${mx}`, det:`${allData.length} listings`, cls:"text-amber-400" },
    { lbl:"5★ Condition", val:`${exc.length}`, det:"Excellent items", cls:"text-indigo-300" },
  ];
  for (const c of cards) {
    const card = document.createElement("div");
    card.className = "bg-surface-card border border-border-dim rounded-[14px] p-5 transition-all duration-300 hover:border-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-0.5";
    const lbl = document.createElement("div"); lbl.className = "text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5"; lbl.textContent = c.lbl;
    const val = document.createElement("div"); val.className = `text-[26px] font-extrabold tracking-tight ${c.cls}`; val.textContent = c.val;
    const det = document.createElement("div"); det.className = "text-[11px] text-gray-400 mt-1"; det.textContent = c.det;
    card.append(lbl, val, det);
    el.appendChild(card);
  }
}

// --- Filters ---
function renderFilters() {
  const el = document.getElementById("filters"); el.textContent = "";
  const models = [...new Set(allData.map(d=>d.model).filter(m=>m!=="Unknown"))].sort();

  const ab = document.createElement("button");
  ab.className = `px-4 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all ${activeFilter==="all" ? "bg-indigo-500 border-indigo-500 text-white" : "bg-surface-card border-border-dim text-gray-400 hover:border-indigo-500 hover:text-gray-200"}`;
  ab.textContent = `All (${allData.length})`;
  ab.onclick = () => { activeFilter = "all"; applyFilter(); renderFilters(); };
  el.appendChild(ab);

  const sep = document.createElement("div"); sep.className = "w-px h-[22px] bg-border-dim"; el.appendChild(sep);

  for (const m of models) {
    const cnt = allData.filter(d=>d.model===m).length;
    const b = document.createElement("button");
    b.className = `px-4 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all ${activeFilter===m ? "bg-indigo-500 border-indigo-500 text-white" : "bg-surface-card border-border-dim text-gray-400 hover:border-indigo-500 hover:text-gray-200"}`;
    b.textContent = `${m} (${cnt})`;
    b.onclick = () => { activeFilter = m; applyFilter(); renderFilters(); };
    el.appendChild(b);
  }
}

// --- Scatter Chart ---
function renderScatter() {
  const canvas = document.getElementById("scatterChart");
  const ctx = canvas.getContext("2d");
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const data = filteredData.filter(d => d.price && d.valueScore != null);
  if (!data.length) {
    ctx.fillStyle = "#555570"; ctx.font = "14px Inter,sans-serif"; ctx.textAlign = "center";
    ctx.fillText("No scored items available", W/2, H/2); return;
  }

  const pad = {t:30,r:30,b:55,l:65};
  const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b;
  const prices = data.map(d=>d.price), scores = data.map(d=>d.valueScore);
  const mnP = Math.floor(Math.min(...prices)/100)*100, mxP = Math.ceil(Math.max(...prices)/100)*100;
  const mnS = Math.floor(Math.min(...scores)), mxS = Math.ceil(Math.max(...scores));
  const xS = v => pad.l + ((v-mnP)/(mxP-mnP))*cW;
  const yS = v => pad.t + cH - ((v-mnS)/(mxS-mnS))*cH;

  ctx.strokeStyle = "rgba(30,30,48,0.8)"; ctx.lineWidth = 1;
  for (let i=0;i<=8;i++) { const v=mnP+(i/8)*(mxP-mnP), x=xS(v); ctx.beginPath(); ctx.moveTo(x,pad.t); ctx.lineTo(x,pad.t+cH); ctx.stroke(); ctx.fillStyle="#555570"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("£"+Math.round(v),x,pad.t+cH+18); }
  for (let i=0;i<=6;i++) { const v=mnS+(i/6)*(mxS-mnS), y=yS(v); ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cW,y); ctx.stroke(); ctx.fillStyle="#555570"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="right"; ctx.fillText(v.toFixed(1),pad.l-10,y+4); }

  ctx.fillStyle="#8888a8"; ctx.font="12px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Price (£)",W/2,H-5);
  ctx.save(); ctx.translate(15,H/2); ctx.rotate(-Math.PI/2); ctx.fillText("Value Score",0,0); ctx.restore();

  const bubbles = [];
  for (const d of data) {
    const x=xS(d.price), y=yS(d.valueScore), r=6+(d.condition?.stars||3)*3, color=mc(d.model);
    bubbles.push({x,y,r,color,data:d});
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color+"40"; ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
  }
  canvas._bubbles = bubbles;
}

// --- Bar Chart ---
function renderBar() {
  const canvas = document.getElementById("barChart");
  const ctx = canvas.getContext("2d");
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const modelMap = new Map();
  for (const d of filteredData) {
    if (!d.price || d.model === "Unknown") continue;
    if (!modelMap.has(d.model)) modelMap.set(d.model, { prices: [], newPrice: d.specs?.newPrice || null });
    modelMap.get(d.model).prices.push(d.price);
  }
  const models = [...modelMap.entries()].map(([m,info]) => ({
    model:m, min:Math.min(...info.prices), max:Math.max(...info.prices),
    avg:Math.round(info.prices.reduce((s,p)=>s+p,0)/info.prices.length),
    count:info.prices.length, newPrice:info.newPrice,
  })).sort((a,b)=>a.avg-b.avg);

  if (!models.length) {
    ctx.fillStyle="#555570"; ctx.font="14px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("No model data available",W/2,H/2); return;
  }

  const pad = {t:30,r:30,b:80,l:65};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const maxVal = Math.ceil(Math.max(...models.flatMap(m=>[m.min,m.max,m.newPrice||0]))/500)*500;
  const barW = Math.min(40, (cW/models.length)*0.6);
  const gap = (cW - barW*models.length)/(models.length+1);
  const yS = v => pad.t + cH - (v/maxVal)*cH;

  for (let i=0;i<=6;i++) { const v=(i/6)*maxVal, y=yS(v); ctx.strokeStyle="rgba(30,30,48,0.8)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cW,y); ctx.stroke(); ctx.fillStyle="#555570"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="right"; ctx.fillText("£"+Math.round(v),pad.l-10,y+4); }

  for (let i=0; i<models.length; i++) {
    const m=models[i], x=pad.l+gap+i*(barW+gap), color=mc(m.model);
    const yMin=yS(m.min), yMax=yS(m.max);
    ctx.fillStyle=color+"30"; ctx.fillRect(x,yMax,barW,yMin-yMax);
    ctx.strokeStyle=color+"60"; ctx.lineWidth=1; ctx.strokeRect(x,yMax,barW,yMin-yMax);
    const yAvg=yS(m.avg); ctx.fillStyle=color; ctx.fillRect(x-4,yAvg-2,barW+8,4);
    if (m.newPrice) { const yN=yS(m.newPrice); ctx.setLineDash([4,4]); ctx.strokeStyle="#f43f5e80"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-6,yN); ctx.lineTo(x+barW+6,yN); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle="#e8e8f0"; ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("£"+m.avg, x+barW/2, yAvg-10);
    ctx.fillStyle="#8888a8"; ctx.font="11px Inter,sans-serif";
    ctx.save(); ctx.translate(x+barW/2, pad.t+cH+15); ctx.rotate(-Math.PI/6); ctx.fillText(m.model,0,0); ctx.restore();
    ctx.fillStyle="#555570"; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText("("+m.count+")", x+barW/2, pad.t+cH+55);
  }

  ctx.fillStyle="#818cf8"; ctx.fillRect(W-220,10,16,4);
  ctx.fillStyle="#8888a8"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="left"; ctx.fillText("Avg used price",W-198,15);
  ctx.setLineDash([4,4]); ctx.strokeStyle="#f43f5e80"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W-220,30); ctx.lineTo(W-204,30); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle="#8888a8"; ctx.fillText("New price (RRP)",W-198,34);
}

// --- Table ---
function renderTable() {
  const thead = document.getElementById("tableHead"), tbody = document.getElementById("tableBody");
  thead.textContent = ""; tbody.textContent = "";

  const cols = [
    {k:"name",l:"Camera"},{k:"model",l:"Model"},{k:"price",l:"Price"},
    {k:"condition",l:"Condition"},{k:"valueScore",l:"Value"},{k:"location",l:"Location"},{k:"details",l:"Details"},
  ];

  const hr = document.createElement("tr");
  for (const c of cols) {
    const th = document.createElement("th");
    th.className = "px-3.5 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-border-dim cursor-pointer select-none hover:text-indigo-300 transition-colors" + (c.k === sortCol ? " text-indigo-500!" : "");
    th.textContent = c.l + (c.k === sortCol ? (sortDir==="asc" ? " ▲" : " ▼") : "");
    if (c.k !== "details") th.onclick = () => {
      if (sortCol===c.k) sortDir = sortDir==="asc"?"desc":"asc";
      else { sortCol = c.k; sortDir = c.k==="name"?"asc":"desc"; }
      applySort(); renderTable();
    };
    hr.appendChild(th);
  }
  thead.appendChild(hr);

  for (const item of filteredData) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-surface-card-hover transition-colors";

    // Camera name
    const tdN = document.createElement("td"); tdN.className = "px-3.5 py-3 text-xs border-b border-border-dim/50 font-semibold";
    const a = document.createElement("a"); a.href = item.url||"#"; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.className = "text-inherit no-underline hover:text-indigo-300 transition-colors";
    a.textContent = (item.name||"").substring(0,48); tdN.appendChild(a); tr.appendChild(tdN);

    // Model badge
    const tdM = document.createElement("td"); tdM.className = "px-3.5 py-3 text-xs border-b border-border-dim/50";
    if (item.model!=="Unknown") {
      const b = document.createElement("span");
      b.className = "inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold";
      b.style.cssText = `background:${mc(item.model)}20;color:${mc(item.model)}`;
      b.textContent = item.model; tdM.appendChild(b);
    } else { tdM.textContent="—"; tdM.className += " text-gray-600"; }
    tr.appendChild(tdM);

    // Price
    const tdP = document.createElement("td"); tdP.className = "px-3.5 py-3 text-xs border-b border-border-dim/50 font-bold tabular-nums";
    tdP.textContent = item.price ? "£"+item.price.toLocaleString() : "—"; tr.appendChild(tdP);

    // Condition
    const tdC = document.createElement("td"); tdC.className = "px-3.5 py-3 text-[13px] border-b border-border-dim/50 text-amber-400 tracking-wider";
    tdC.textContent = "★".repeat(item.condition?.stars||0)+"☆".repeat(5-(item.condition?.stars||0)); tr.appendChild(tdC);

    // Value
    const tdV = document.createElement("td"); tdV.className = "px-3.5 py-3 text-xs border-b border-border-dim/50";
    if (item.valueScore!=null) {
      const vb = document.createElement("span");
      const vcls = item.valueScore>=30 ? "bg-emerald-400/15 text-emerald-400" : item.valueScore>=25 ? "bg-cyan-400/15 text-cyan-400" : item.valueScore>=20 ? "bg-amber-400/15 text-amber-400" : "bg-rose-400/15 text-rose-400";
      vb.className = `inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${vcls}`;
      vb.textContent = item.valueScore.toFixed(1); tdV.appendChild(vb);
    } else { tdV.textContent="—"; tdV.className += " text-gray-600"; }
    tr.appendChild(tdV);

    // Location
    const tdL = document.createElement("td"); tdL.className = "px-3.5 py-3 text-xs border-b border-border-dim/50 text-gray-400";
    tdL.textContent = item.location||"—"; tr.appendChild(tdL);

    // Details
    const tdD = document.createElement("td"); tdD.className = "px-3.5 py-3 text-xs border-b border-border-dim/50";
    if (item.boxed) { const t = document.createElement("span"); t.className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-400/10 text-emerald-400 mr-1"; t.textContent="📦 Boxed"; tdD.appendChild(t); }
    if (item.shutterCount) { const t = document.createElement("span"); t.className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 mr-1"; t.textContent="SC:"+item.shutterCount.toLocaleString(); tdD.appendChild(t); }
    if (item.specs?.newPrice && item.price) { const d = Math.round((1-item.price/item.specs.newPrice)*100); const t = document.createElement("span"); t.className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-gray-400"; t.textContent=d+"% off"; tdD.appendChild(t); }
    tr.appendChild(tdD);

    tbody.appendChild(tr);
  }
}

// --- Use Cases ---
function renderUseCases() {
  const el = document.getElementById("useCaseCards"); el.textContent = "";
  const scored = filteredData.filter(d => d.specs && d.price && d.valueScore != null);
  if (!scored.length) return;

  const ucs = [
    { e:"🧑", t:"Portraits", d:"High MP, great AF, good low-light for indoor shoots.", fn: d => (d.specs.mp/61)*35 + (d.specs.af/6072)*30 + (d.specs.maxISO/102400)*15 + (d.condition.stars/5)*10 + (1-d.price/3000)*10 },
    { e:"🚗", t:"Car Photography", d:"Good resolution, reliable AF for tracking, video for rolling shots.", fn: d => (d.specs.mp/61)*25 + (d.specs.af/6072)*25 + (d.specs.video.includes("4K")?20:10) + (d.condition.stars/5)*15 + (1-d.price/3000)*15 },
    { e:"🌌", t:"Astrophotography", d:"High ISO, full frame, IBIS for stable long exposures.", fn: d => (d.specs.maxISO/102400)*35 + (d.specs.ibis?25:0) + (d.specs.mp/61)*15 + (d.condition.stars/5)*10 + (1-d.price/3000)*15 },
    { e:"🌙", t:"Night Photography", d:"Excellent high ISO, stabilization, reliable AF in dark.", fn: d => (d.specs.maxISO/102400)*30 + (d.specs.ibis?25:0) + (d.specs.af/6072)*20 + (d.condition.stars/5)*10 + (1-d.price/3000)*15 },
  ];

  for (const uc of ucs) {
    const ranked = scored.map(d => ({...d, ucs: uc.fn(d)})).sort((a,b)=>b.ucs-a.ucs);
    const top = ranked[0], alt = ranked.find(d => d.model !== top.model) || ranked[1];

    const card = document.createElement("div");
    card.className = "bg-surface-card border border-border-dim rounded-[14px] p-5";

    const h3 = document.createElement("h3"); h3.className = "text-sm font-semibold mb-2.5"; h3.textContent = `${uc.e} ${uc.t}`;
    const desc = document.createElement("p"); desc.className = "text-xs text-gray-400 mb-2.5"; desc.textContent = uc.d;
    const pick = document.createElement("div"); pick.className = "pt-2.5 border-t border-border-dim text-[13px]";

    const topLine = document.createElement("div");
    const topSpan = document.createElement("span"); topSpan.className = "text-emerald-400 font-bold"; topSpan.textContent = `Top: ${top.model} — £${top.price}`;
    const starsSpan = document.createElement("span"); starsSpan.className = "text-amber-400"; starsSpan.textContent = " " + "★".repeat(top.condition.stars);
    topLine.append(topSpan, starsSpan);
    pick.appendChild(topLine);

    if (alt && alt.model !== top.model) {
      const altLine = document.createElement("div"); altLine.className = "text-gray-500 text-xs mt-1";
      altLine.textContent = `Also: ${alt.model} — £${alt.price}`;
      pick.appendChild(altLine);
    }

    card.append(h3, desc, pick);
    el.appendChild(card);
  }
}

// --- Tooltip ---
const scatterCanvas = document.getElementById("scatterChart");
const tooltipEl = document.getElementById("tooltip");

scatterCanvas.addEventListener("mousemove", e => {
  const rect = scatterCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const bubbles = scatterCanvas._bubbles || [];
  let hit = null;
  for (const b of bubbles) { if (Math.sqrt((x-b.x)**2+(y-b.y)**2) <= b.r) { hit = b; break; } }

  if (hit) {
    tooltipEl.style.opacity = "1"; tooltipEl.textContent = "";
    const title = document.createElement("div"); title.className="font-bold mb-1"; title.textContent=hit.data.name.substring(0,38); tooltipEl.appendChild(title);
    for (const [l,v] of [["Model",hit.data.model],["Price","£"+hit.data.price],["Condition","★".repeat(hit.data.condition?.stars||0)],["Value",hit.data.valueScore?.toFixed(1)||"—"],["Location",hit.data.location]]) {
      const r = document.createElement("div"); r.className="flex justify-between text-gray-400 mb-0.5";
      const ls = document.createElement("span"); ls.textContent=l;
      const vs = document.createElement("span"); vs.className="font-semibold text-gray-200"; vs.textContent=v;
      r.append(ls,vs); tooltipEl.appendChild(r);
    }
    tooltipEl.style.left = Math.min(e.clientX+15, window.innerWidth-220)+"px";
    tooltipEl.style.top = (e.clientY-10)+"px";
  } else { tooltipEl.style.opacity = "0"; }
});
scatterCanvas.addEventListener("mouseleave", () => { tooltipEl.style.opacity = "0"; });

window.addEventListener("resize", () => { renderScatter(); renderBar(); });

// Live update when new data arrives
browser.storage.onChanged.addListener((changes) => {
  if (changes.cameraData) {
    allData = changes.cameraData.newValue?.items || [];
    filteredData = [...allData];
    document.getElementById("emptyState").classList.toggle("hidden", allData.length > 0);
    document.getElementById("mainContent").classList.toggle("hidden", allData.length === 0);
    if (allData.length) render();
  }
});

init();
