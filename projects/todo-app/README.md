# Cadence

> An offline-first, keyboard-driven task app for iOS, Android, Windows, macOS, and Linux that captures as fast as a notepad and auto-generates a shareable markdown end-of-day report from what you actually did.

**Status: Planning.** This repository is a design and architecture artifact. No application code yet — the docs below lock the product, stack, data model, UX, and roadmap before implementation begins.

---

## Vision

Cadence is a single-user, multi-device task app built around one daily loop: **capture fast, report automatically.** You dump work and life tasks in with zero ceremony, organize them along two axes (a hierarchical Category and free-form Tags), and at the end of the day Cadence writes your EOD report *for* you from an immutable event log — not from a manual done/undone dump.

The name evokes the daily reporting *cadence* the product is built around.

## The Core Problem

The user writes end-of-day reports and drowns in tasks across both work and life. Existing apps fail at two things that matter most:

1. **Fast capture** — writing a todo should feel *as simple as writing to a notepad*: markdown body, images, sub-items, zero friction. `Enter`/`Shift+Enter` add newlines, `Ctrl+Enter` submits, arrows navigate, `e` edits.
2. **The EOD report** — the killer feature. Cadence derives a deterministic, shareable markdown report (created / updated / completed / carried-over) from an append-only event log, so the same day always reproduces the same report and unfinished items roll forward automatically.

Everything else — sync, categories, tags, promotable sub-items — exists to serve those two flows.

## Decisions at a Glance

| Area | Decision | Why |
| --- | --- | --- |
| **UI framework** | **Tauri v2** — React + Vite + Tailwind v4 + shadcn/ui web UI over a Rust core, one codebase to all five platforms. | Only option that satisfies *both* hard constraints at once: all five platforms incl. iOS **and** shadcn/Tailwind (DOM/CSS artifacts that need a browser engine). Keeps a Rust core; egui rejected for the UI (it paints its own widgets, cannot render shadcn). |
| **Backend & sync** | Self-hosted thin **Rust (Axum)** relay persisting a per-user **op log to Postgres**; local **SQLite** on each device; offline-first. Email magic-link + JWT auth. | Single-user-multi-device, write-first, document-shaped. A thin relay fits offline-first better than turnkey engines (LWW-only ones clobber text; read-path-only ones can't write offline). |
| **Conflict model** | **Hybrid**: per-field last-writer-wins (HLC-stamped) for all scalars, enums, FKs, and the fractional `order_key`; a **Y.Text sequence CRDT** (yrs in the Rust core) only for the markdown body. Tombstone soft-deletes. | Concurrent character-level loss on a long body is the exact failure that feels broken — so the body earns a real CRDT while everything else stays simple, queryable LWW. CRDT sits behind a Rust trait so it can be swapped. |
| **Text editor** | **CodeMirror 6** with markdown language, Obsidian-style inline live preview, image paste, and the `y-codemirror.next` binding to each todo's Y.Text. Stores literal markdown. | Plaintext model = notepad feel, report-as-concatenation, cleanest CRDT merge, best mobile IME/keyboard story. |
| **Data model** | Single unified **NODE** table (todos + sub-items), self-referential via `parent_id` with a base62 **fractional `order_key`**. Promotion is an in-place upgrade (`promoted=true`), like GitHub sub-issues. One hierarchical **Category** FK + many-to-many **Tags**. Append-only **EVENT** log. UUIDv7/ULID IDs. | One table makes promotion free; fractional indexing makes reorders conflict-free offline; the event log makes the EOD report deterministic. |
| **Blob / image storage** | Content-addressed by **SHA-256** in an S3-compatible store (Cloudflare R2 managed for MVP, MinIO self-host) on a separate sync channel. Op log holds only hash + metadata + blurhash; on-device thumbnails via the Rust `image` crate, LRU-capped cache. | Keeps bytes out of the CRDT/op log; free dedup + integrity; list renders instantly from blurhash. |
| **Keymap** | Vim-ish two-mode modality — **List mode** (single-key verbs, `j/k`/arrows, `e`/`Enter` to edit, `o`/`O` new, `Tab`/`Shift+Tab` indent, `p` promote, `x` done, `/` search, `Ctrl/Cmd+K` palette, `Ctrl/Cmd+Shift+E` EOD) and **Edit mode** (`Enter`/`Shift+Enter` newline, `Ctrl/Cmd+Enter` submit, `Esc` back). Touch maps every verb to a gesture + soft-keyboard accessory Submit. | The required keys are only unambiguous when navigation and composition are separated by mode. Mobile soft `Return` must stay a newline. |
| **Design system** | shadcn/ui + Tailwind v4, low-chroma **"Ink"** neutral ladder + one restrained indigo accent (primary action + focus ring only). Dark default, first-class light, OKLCH semantic tokens. 8px grid, dense desktop / comfortable-touch mobile density, Lucide icons. | The killer flows demand the UI disappear and the keyboard lead — the Linear/Raycast archetype. Categories carry the accent; tags get a muted 8-hue chip set so the two axes stay visually distinct. |

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/01-product-requirements.md](docs/01-product-requirements.md) | PRD — personas, the problem, functional + non-functional requirements, user stories, scope, MVP. |
| [docs/02-architecture.md](docs/02-architecture.md) | Stack decision + rationale (ADR-style), cross-platform strategy, sync/backend, storage, security, deployment. |
| [docs/03-data-model.md](docs/03-data-model.md) | Entities, ER description, CRDT/sync modeling, promotable sub-items, EOD report engine, example JSON. |
| [docs/04-ux-and-interaction.md](docs/04-ux-and-interaction.md) | Full keymap table, editor, capture flow, promotion flow, design system + tokens, key screens. |
| [docs/05-roadmap.md](docs/05-roadmap.md) | Phased milestones MVP → v1 → later, risks, open questions. |

## MVP in One Line

Tauri v2 on all five platforms, frictionless keyboard capture with the vim-ish List/Edit modality, CodeMirror 6 markdown editor with image paste, the single-table NODE model with promotable sub-items and the Category + Tags axes, offline-first SQLite with op-log sync to a Rust/Axum relay, content-addressed image attachments, and the deterministic EOD report engine with copy-as-markdown and carry-over.

## Open Questions

Sharing/collaboration scope, end-to-end encryption of docs + blobs, optional cloud-AI report narrative, launch hosting posture (managed vs. fully self-hosted), and final codename approval. See [docs/05-roadmap.md](docs/05-roadmap.md).
