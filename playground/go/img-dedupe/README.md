# img-dedupe

A small Go tool that finds and removes duplicate images. It can be driven from
the command line or through a web GUI — both share the same core, so they behave
identically.

Duplicates are detected by **content hash (SHA-256)**, so byte-identical files
are caught regardless of name or location. (Near-duplicate detection via
perceptual hashing is on the roadmap below.)

## How it works

1. **Register** one or more folders to watch.
2. **Scan** them — every image file is hashed and recorded in a local SQLite
   database (path, hash, size, dimensions, modification time).
3. **Dedupe** — images sharing a hash are grouped; you keep one per group and
   the rest are removed.

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

# Show duplicates (dry run — nothing is removed)
./imgdedupe dedupe

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

## Web GUI

```sh
./imgdedupe serve --addr 127.0.0.1:8080
```

Then open <http://127.0.0.1:8080>. The GUI lets you add/remove folders, trigger a
scan, browse duplicate groups as thumbnail grids, select which copies to remove
(or auto-resolve by policy), and preview every action with a dry-run toggle.

The frontend is a single page (Tailwind + Alpine.js) embedded into the binary
via `go:embed`, so `imgdedupe` ships as one self-contained executable.

### HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/folders` | List registered folders |
| `POST` | `/api/folders` | Register a folder (`{"path": "..."}`) |
| `DELETE` | `/api/folders/{id}` | Unregister a folder |
| `POST` | `/api/scan` | Scan registered folders |
| `GET` | `/api/duplicates` | List duplicate groups |
| `POST` | `/api/resolve` | Keep one per group (`{"policy","dry_run"}`) |
| `POST` | `/api/delete` | Delete specific images (`{"ids","dry_run"}`) |
| `GET` | `/api/images/{id}/thumb` | JPEG thumbnail (`?size=`) |
| `GET` | `/api/images/{id}/raw` | Original image bytes |

## Project layout

```
cmd/                 main entry point
internal/
  cmd/               Cobra commands (root, register-folders, scan, dedupe, serve)
  models/            GORM models (Folder, Image)
  service/           shared core: folders, scan/hash, dedupe, thumbnails
  web/               HTTP server + JSON API
    static/          embedded single-page frontend
```

## Roadmap

- **Perceptual hashing** (dHash/pHash) to catch resized / re-encoded near-duplicates.
- Scan progress streaming (SSE) for large libraries.
- Side-by-side full-resolution compare in the GUI.

## Tests

```sh
go test ./...
```
