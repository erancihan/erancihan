# img-dedupe

A small Go tool that finds and removes duplicate images. It can be driven from
the command line or through a web GUI — both share the same core, so they behave
identically.

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

## Web GUI

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

## Project layout

```
cmd/                 main entry point
internal/
  cmd/               Cobra commands (root, register-folders, scan, dedupe, serve)
  models/            GORM models (Folder, Image)
  service/           shared core: folders, scan/hash, dedupe, similarity, thumbnails
  web/               HTTP server + JSON API
    static/          embedded single-page frontend
```

## Roadmap

- Scan progress streaming (SSE) for large libraries.
- Side-by-side full-resolution compare in the GUI.
- BK-tree index for perceptual search (the current similar match is pairwise O(n²)).

## Tests

```sh
go test ./...
```
