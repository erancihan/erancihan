# AetherDownloader — Research Notes

Background research that informs the roadmap. Two tracks: (1) reference Pixiv
downloaders / feature parity, and (2) Zerochan technical specifics for
resolving full-resolution images. Sources were fetched live where reachable;
blocked hosts are noted.

---

## 1. Reference Pixiv downloaders — feature-parity checklist

**Powerful Pixiv Downloader (PixivBatchDownloader)** by *xuejianxianzun* is the
best-in-class reference. Key facts (verified from its source/README):

- Ships for **both Chrome and Firefox** (it's on AMO). So "a Firefox Pixiv
  downloader" is **not** an unmet need — the reference already covers it.
- **38-token filename/folder naming engine** (from `src/ts/setting/NamingRuleConfig.ts`):
  `{id} {pid} {p} {user} {user_id} {title} {tags} {tags_translate}
  {tags_transl_only} {type} {AI} {bmk} {like} {view} {rank} {date} {upload_date}
  {px} {series_title} {series_order} {series_id} {r18_g_folder}
  {match_tag_folder1} …`
- **Batch crawl** of user works, bookmarks, followed users, rankings, search
  results, series; **ugoira → WebP / WebM / GIF / APNG** (notably **no MP4**);
  **novels → TXT / EPUB**; tag translation; **download history dedup**; resume;
  crawl filters (bookmark count, include/exclude tags, AI, date, dimensions,
  first-image-only, type); progress UI with pause/resume + concurrency; built-in
  preview/viewer; illegal-char sanitization.

**Landscape.** *Pixiv Toolkit* (Chrome+Firefox) — lighter: ugoira → GIF/WebM/MP4,
manga ZIP, novels, history; no bulk crawl or naming templates. *Firefox on AMO*
already has Powerful Pixiv Downloader, Pixiv Toolkit, Pixiv Bulk Downloader, Px
Downloader, Pixiv Animat Downloader. *Greasyfork* "Pixiv Downloader"
(drunkg00se, #432150) — one-click + batch + by-tag, ugoira → MP4/WebM/WebP/GIF/APNG,
and covers many **boorus** (Danbooru, yande.re, Konachan, Gelbooru, e621, …) but
**not Zerochan**. *gallery-dl* (CLI) is the completeness yardstick — pixiv
extractor covers works/bookmarks/following/ranking/search/series/novels, tag
translation, per-file JSON metadata sidecars, and an ugoira post-processor that
converts frames→video honoring per-frame delays; it also has a **Zerochan**
extractor.

**Gap list — what AetherDownloader can uniquely offer:**

1. **Unified Pixiv + Zerochan in one extension** — no browser extension does
   Zerochan batch/tag crawl with naming templates (only gallery-dl CLI does).
   **Strongest differentiator.**
2. **Shared naming-template + filter engine across both sites.**
3. **True per-file JSON/CSV metadata sidecars in-browser** (gallery-dl-grade).
4. **MP4 ugoira output** (the one format PBD omits), plus WebM/GIF/APNG.
5. **Automatic 429 backoff / configurable throttle.**
6. **Zerochan-side filters** (min-favorites, include/exclude tags, dimensions).

**Sources (fetched):** github.com/xuejianxianzun/PixivBatchDownloader (README,
README-EN, `src/ts/setting/NamingRuleConfig.ts`); manpages.ubuntu.com gallery-dl.conf
(pixiv extractor options); github.com/drunkg00se/Pixiv-Downloader; chrome-stats
pages for Powerful Pixiv Downloader + Pixiv Toolkit Next. **Blocked (403):**
addons.mozilla.org add-on pages, xuejianxianzun.github.io docs, greasyfork script
pages — routed to alternatives above.

---

## 2. Zerochan technicals — resolving full-resolution images

Derived from the source of three independent tools (gallery-dl, imgbrd-grabber,
a userscript) that agree, plus real example URLs. **Live `zerochan.net` fetches
were Cloudflare-blocked (403)**, so these patterns are source-verified, not
page-verified — worth a spot-check on a live page.

Three surfaces: **HTML pages**, a **`?json` endpoint**, and **`?xml`** (RSS),
all on `www.zerochan.net`. Image bytes live on separate hosts.

### DOM selectors & URL patterns

- **Thumbnails:** `s1..s4.zerochan.net`, size buckets **240** (small) / **600**
  (sample), extensions **`.jpg` / `.png` / `.webp`** (not `.avif`).
- **Full images:** `static.zerochan.net/<Name>.full.<id>.<ext>` (name optional —
  `.full.<id>.jpg` resolves; the numeric id is authoritative) **or** hash-path
  `static.zerochan.net/full/<xx>/<yy>/<id>.<ext>`.
- **Detail page** (`/<numericId>`): full URL is the `href` of the anchor inside
  **`<div id="large"><a href="FULL" tabindex="1">`** — `#large` is a **`<div>`
  wrapper**, not `<img id="large">`. Also exposed as **`a.download-button`** and
  as **JSON-LD** `contentUrl` (`<script type="application/ld+json">`).
- **Listing item:** `<ul id="thumbs"> <li> <a href="/{id}"> <img data-src|src
  title="2649x3808 3301 KB jpg" alt="Name"> </a> </li>`. The id lives in the
  `<a href="/{id}">`; `data-id` is not guaranteed.
- **Thumbnail → full transform** (imgbrd-grabber):
  `s{n}.zerochan → static.zerochan`, `.240.`/`.600.` → `.full.`,
  `/240/`/`/600/` → `/full/`.
- **Breadcrumb:** container is **`<nav class="breadcrumbs">`** (not
  `id="breadcrumbs"`); the last crumb is the most specific tag (character).
- **`?json`** (`/{id}?json`) returns `full`, `width`, `height`, `size`, `tags`,
  `hash`, `source`. Listing JSON (`/{tag}?json&p=N&l=200`) returns `items[]` +
  `next`. The API wants a **descriptive User-Agent** (project + Zerochan
  username) and is rate-limited to **~60 req/min**.
- **Referer:** `static.zerochan.net` images download standalone (no Referer
  needed) — gallery-dl and imgbrd-grabber fetch them server-side.

### How existing tools get the full image

- **gallery-dl** (`zerochan.py`): JSON-LD `contentUrl` or `?json` `full`; builds
  name-less `static.zerochan.net/.full.<id>.<ext>` fallbacks.
- **imgbrd-grabber** (`sites/Zerochan/model.ts`): detail full URL from
  `#large a[tabindex="1"]`; listing full URL **reconstructed from the thumbnail**
  via the transform above (does *not* rely on a static anchor in the `<li>`).
- **kyoyacchi/zerochan-downloader** (userscript): grabs `a.download-button` href.

**Verdict on the original extension assumptions (now fixed in Phase 2):**
requiring `a[href*="static.zerochan.net"]` inside each listing `<li>` is
**fragile** (not reliably present) → derive from the thumbnail `<img>` instead;
`#breadcrumbs a:last-of-type` is the **wrong selector** → use `nav.breadcrumbs`.

**Sources (fetched raw):** gallery-dl `gallery_dl/extractor/zerochan.py` +
`test/results/zerochan.py`; imgbrd-grabber `src/sites/Zerochan/model.ts`;
kyoyacchi/zerochan-downloader `main.js`; imgbrd-grabber issues #3025 (webp full
URL) and #2830. **Blocked (403):** all `www.zerochan.net` pages/`?json`/`?xml`,
zerochan.net/api, greasyfork, web.archive.org — routed to the tool sources above.
