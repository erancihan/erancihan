# AetherDownloader — Roadmap

A Firefox **and** Chrome (Manifest V3) extension that downloads images from
**Pixiv** and **Zerochan** with hover previews. The differentiators vs existing
tools are **cross-browser support** and **first-class Zerochan support** — the
popular Pixiv downloaders (e.g. Powerful Pixiv Downloader) are Pixiv-only, and
no browser extension does Zerochan batch/tag crawling. See `RESEARCH.md`.

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| **1 — Firefox correctness** | debounce/duplicate downloads, ugoira frames+delays, dead settings wired up, preview timer leak + stale-index, observer throttling, metadata data-URL, dead-code/permission cleanup | ✅ done |
| **2 — Zerochan resolution** | research-grounded rewrite: thumbnail→full URL transform, `#large`/JSON-LD detail URL, `nav.breadcrumbs` naming, percent-decoded filenames, 600px→full preview | ✅ done |
| **0 — Real Chrome support** | `browser` namespace shim, per-browser manifest, `declarativeNetRequest` Referer rule (Chrome) vs `webRequest` (Firefox), dual `dist/` output | 🚧 in progress |
| **3a — Zerochan batch crawl** | download a whole tag/search page via the `?json` endpoint (descriptive UA + ~60/min throttle) into character folders | ⬜ planned |
| **3b — Naming templates** | shared filename/folder template engine (id, title, user, tags, date, page, …) across both sites | ⬜ planned |
| **3c — Pixiv batch crawl** | user works / bookmarks / search-result crawling | ⬜ planned |
| **3d — Ugoira conversion** | in-browser zip decode + encode to GIF / APNG / WebM / **MP4** (MP4 is the gap vs PBD) | ⬜ planned |
| **3e — QoL** | skip-already-downloaded / dedup, progress UI + pause/resume, 429 backoff/throttle | ⬜ planned |
| **4 — Cleanup** | ✅ dead code / `activeTab` / `dev --watch` / `emitCss`; ⬜ remove dead `vite.config.js`; ⬜ regenerate `icon-128.png` (currently 1024px) | 🚧 partial |

## Feature-parity target (vs Powerful Pixiv Downloader)

Table-stakes to match the reference: multi-page single-work download, the full
batch-crawl set, ugoira conversion honoring per-frame delays, a naming-template
engine, tag translation, dedup + resume, a progress UI with pause/resume +
concurrency, crawl filters (bookmark-count, include/exclude tags, AI, date,
dimensions, first-image-only, type), original-quality selection, novel
text+images, hover preview, and filename sanitization. See `RESEARCH.md` §1.

## Known caveats

- Live `zerochan.net` is Cloudflare-gated; the Zerochan selectors/URL patterns
  are derived from gallery-dl + imgbrd-grabber source and real example URLs, not
  a directly-loaded page. Worth a spot-check on a live tag + detail page.
- Pixiv `i.pximg.net` requires `Referer: https://www.pixiv.net/` (403 otherwise);
  injected via `webRequest` on Firefox and `declarativeNetRequest` on Chrome.
