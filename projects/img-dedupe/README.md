# img-dedupe

A small Go tool that finds and removes duplicate images. Use it from the command
line, a native desktop app (Wails), or a browser-based web GUI — all three share
the same core, so they behave identically.

It detects duplicates two ways:

- **Exact** — by content hash (SHA-256), catching byte-identical files
  regardless of name or location.
- **Similar** — by perceptual hash (difference hash), catching visually
  near-identical images even when resized or re-encoded (e.g. a PNG and its
  JPEG copy).

## How it works

1. **Register** one or more folders to watch.
2. **Scan** them — every image file is recorded in a local SQLite database
   (path, content hash, perceptual hash, size, dimensions, modification time).
3. **Dedupe** — images sharing a content hash (exact) or within a perceptual
   distance (similar) are grouped; you keep one per group and the rest are
   removed.

Removals are **safe by default**: files are *moved* to a trash directory
(`./.imgdedupe-trash`) rather than deleted, and every destructive command
supports a dry run.

## Build

```sh
go build -o imgdedupe ./cmd
```

Requires Go 1.25+.

## CLI usage

```sh
# Register folders to scan
./imgdedupe register-folders ~/Pictures ~/Downloads

# List registered folders (default command)
./imgdedupe

# Scan registered folders and index images
./imgdedupe scan

# Show exact duplicates (dry run — nothing is removed)
./imgdedupe dedupe

# Show visually similar images (perceptual hash)
./imgdedupe dedupe --similar --threshold 10

# Actually remove extras, keeping one copy per group
./imgdedupe dedupe --apply --keep newest
```

Global flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--db` | `imgdedupe.db` | SQLite database file |
| `--hard-delete` | `false` | Permanently delete instead of moving to trash |
| `--trash-dir` | `./.imgdedupe-trash` | Where removed files are moved |

`dedupe` flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--apply` | `false` | Perform removal (otherwise dry run) |
| `--keep` | `newest` | Which copy to keep: `newest`, `oldest`, `largest`, `first` |
| `--similar` | `false` | Match visually similar images (perceptual hash), not just exact duplicates |
| `--threshold` | `10` | Max perceptual-hash distance for `--similar` (0–64; lower is stricter) |

## Desktop GUI (Wails)

A native desktop app — no browser — built with [Wails](https://wails.io): the
same single-page frontend rendered in a system webview, talking to the same
in-process service. Wails serves the embedded assets and forwards the frontend's
`/api/*` calls straight to the Go API handler, so there are no separate bindings.

**Prerequisites (Linux):** GTK 3 and WebKit2GTK 4.1.

```sh
# Ubuntu/Debian
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev

# Build (gated behind the `desktop` tag; `webkit2_41` selects WebKit 4.1)
make gui
# equivalently:
go build -tags 'desktop production webkit2_41' -o imgdedupe-gui ./desktop

./imgdedupe-gui
```

The database lives under your user config dir (e.g. `~/.config/imgdedupe/`),
overridable with `IMGDEDUPE_DB`. On macOS, Wails uses the system WebView and the
`webkit2_41` tag isn't needed.

> The desktop dependencies sit behind the `desktop` build tag, so `go build ./...`
> and the tests never require the native toolchain. A plain `go mod tidy` may drop
> them — re-add with `go get github.com/wailsapp/wails/v2`.

## Web GUI

A browser-based alternative (handy for headless/remote use):

```sh
./imgdedupe serve --addr 127.0.0.1:8080
```

Then open <http://127.0.0.1:8080>. The GUI lets you add/remove folders, trigger a
scan, switch between **exact** and **similar** matching (with a distance control),
browse groups as thumbnail grids, select which copies to remove (or auto-resolve
by policy), and preview every action with a dry-run toggle.

The frontend is a single page (Tailwind + Alpine.js) embedded into the binary
via `go:embed`, so `imgdedupe` ships as one self-contained executable.

### HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/folders` | List registered folders |
| `POST` | `/api/folders` | Register a folder (`{"path": "..."}`) |
| `DELETE` | `/api/folders/{id}` | Unregister a folder |
| `POST` | `/api/scan` | Scan registered folders |
| `GET` | `/api/duplicates` | List groups (`?mode=exact\|similar&threshold=`) |
| `POST` | `/api/resolve` | Keep one per group (`{"policy","dry_run","mode","threshold"}`) |
| `POST` | `/api/delete` | Delete specific images (`{"ids","dry_run"}`) |
| `GET` | `/api/images/{id}/thumb` | JPEG thumbnail (`?size=`) |
| `GET` | `/api/images/{id}/raw` | Original image bytes |

## Packaging & releases

Per-platform installers are produced with `make`:

| Platform | Command | Output | Tooling |
|----------|---------|--------|---------|
| Linux | `make package-linux` | `.deb`, `.rpm` | [nfpm](https://nfpm.goreleaser.com) |
| Windows | `make package-windows` | `.exe` installer | [NSIS](https://nsis.sourceforge.io) |
| macOS | `make package-macos` | `.app` inside a `.dmg` | `sips` / `iconutil` / `hdiutil` (ship with macOS) |

```sh
make release VERSION=1.2.0     # build every installer the host can produce
```

`VERSION` is baked into the binaries (`imgdedupe --version`) and the installer
metadata.

**Cross-build notes.** The Windows binary uses the pure-Go WebView2 binding, so
it cross-compiles from any host — a Linux or macOS box builds the Windows
installer too. The Linux and macOS builds use native CGO webviews and must run on
their own OS, so `make release` builds the host's package **plus** Windows. To
produce all three from one place, push a release tag:

```sh
git tag imgdedupe-v1.2.0 && git push origin imgdedupe-v1.2.0
```

`.github/workflows/release.yml` then builds the Linux/Windows installers on an
Ubuntu runner and the macOS `.dmg` on a macOS runner and attaches them to a
GitHub Release.

**Prerequisites:** `nfpm` (`go install github.com/goreleaser/nfpm/v2/cmd/nfpm@latest`)
for Linux packages and `makensis` (NSIS) for the Windows installer; macOS
packaging uses tools bundled with macOS.

## Project layout

```
cmd/                 CLI entry point
desktop/             native desktop app (Wails) — reuses web/ assets + service
internal/
  cmd/               Cobra commands (root, register-folders, scan, dedupe, serve)
  models/            GORM models (Folder, Image)
  service/           shared core: folders, scan/hash, dedupe, similarity, thumbnails
  web/               HTTP server + JSON API (APIHandler reused by the desktop app)
    static/          embedded single-page frontend (shared by web + desktop)
build/               packaging inputs: app icon, nfpm, NSIS, Info.plist, scripts
Makefile             build + per-platform release targets
```

## Roadmap

- Scan progress streaming (SSE) for large libraries.
- Side-by-side full-resolution compare in the GUI.
- BK-tree index for perceptual search (the current similar match is pairwise O(n²)).

## Tests

```sh
go test ./...
```
