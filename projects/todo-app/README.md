# Daybook

> An offline-first, keyboard-driven task app for iOS, Android, Windows, macOS, and Linux that captures as fast as a notepad and auto-generates a shareable markdown end-of-day report from what you actually did.

**Status: Planning.** This repository is a design and architecture artifact. No application code yet — the docs below lock the product, stack, data model, UX, and roadmap before implementation begins.

---

## Vision

Daybook is a personal-first, multi-device task app built around one daily loop: **capture fast, report automatically.** It's personal by default but **sharing-ready** and **server-agnostic** — a Collection can later be shared with other users, and the client can connect to multiple hosts. You dump work and life tasks in with zero ceremony, organize them along two many-to-many axes (nestable, shareable **Collections** and free-form **Tags**), and at the end of the day Daybook writes your EOD report *for* you from an immutable event log — not from a manual done/undone dump.

The name says what it is: a daybook is a journal of the day's events — you jot tasks through the day and it becomes your end-of-day report.

## The Core Problem

The user writes end-of-day reports and drowns in tasks across both work and life. Existing apps fail at two things that matter most:

1. **Fast capture** — writing a todo should feel *as simple as writing to a notepad*: markdown body, images, sub-items, zero friction. `Enter`/`Shift+Enter` add newlines, `Ctrl+Enter` submits, arrows navigate, `e` edits.
2. **The EOD report** — the killer feature. Daybook derives a deterministic, shareable markdown report (created / updated / completed / carried-over) from an append-only event log, so the same day always reproduces the same report and unfinished items roll forward automatically.

Everything else — sync, collections, tags, promotable sub-items — exists to serve those two flows.

## Decisions at a Glance

| Area | Decision | Why |
| --- | --- | --- |
| **UI framework** | **Tauri v2** — vanilla TypeScript + **Alpine.js** (v3, ~7KB) as a thin view layer + Tailwind v4 + Basecoat web UI over a Rust core, one codebase to all five platforms. | Only option that satisfies *both* hard constraints at once: all five platforms incl. iOS **and** Basecoat/Tailwind (DOM/CSS artifacts that need a browser engine). All hard state (local SQLite, CRDT/yrs via Tauri commands, sync client, virtualized node-tree, blob cache) lives in a framework-agnostic plain-TS **core/engine**; Alpine is only the reactive view, which neutralizes its weakness at large offline-first state. Keeps a Rust core; egui rejected (it paints its own widgets, has no DOM, cannot render Basecoat). |
| **Backend & sync** | Self-hosted thin **Rust (Axum)** relay persisting a per-user **op log to Postgres**; local **SQLite** on each device; offline-first. Email magic-link + JWT auth. | Single-user-multi-device, write-first, document-shaped. A thin relay fits offline-first better than turnkey engines (LWW-only ones clobber text; read-path-only ones can't write offline). |
| **Conflict model** | **Hybrid**: per-field last-writer-wins (HLC-stamped) for all scalars, enums, FKs, and the fractional `order_key`; a **Y.Text sequence CRDT** (yrs in the Rust core) only for the markdown body. Tombstone soft-deletes. | Concurrent character-level loss on a long body is the exact failure that feels broken — so the body earns a real CRDT while everything else stays simple, queryable LWW. CRDT sits behind a Rust trait so it can be swapped. |
| **Text editor** | **CodeMirror 6** with markdown language, Obsidian-style inline live preview, image paste, and the `y-codemirror.next` binding to each todo's Y.Text. Stores literal markdown. | Plaintext model = notepad feel, report-as-concatenation, cleanest CRDT merge, best mobile IME/keyboard story. |
| **Data model** | Single unified **NODE** table (todos + sub-items), self-referential via `parent_id` with a base62 **fractional `order_key`**. Promotion is an in-place upgrade (`promoted=true`), like GitHub sub-issues. Two many-to-many axes: nestable **Collections** via a **NODE_COLLECTION** join (replaces the old single Category FK) + free-form **Tags**. Append-only **EVENT** log. UUIDv7/ULID IDs. | One table makes promotion free; fractional indexing makes reorders conflict-free offline; the event log makes the EOD report deterministic; Collections being m2m + nestable makes them the shareable unit. |
| **Blob / image storage** | Content-addressed by **SHA-256** in an S3-compatible store (Cloudflare R2 managed for MVP, MinIO self-host) on a separate sync channel. Op log holds only hash + metadata + blurhash; on-device thumbnails via the Rust `image` crate, LRU-capped cache. | Keeps bytes out of the CRDT/op log; free dedup + integrity; list renders instantly from blurhash. |
| **Keymap** | Vim-ish two-mode modality — **List mode** (single-key verbs, `j/k`/arrows, `e`/`Enter` to edit, `o`/`O` new, `Tab`/`Shift+Tab` indent, `p` promote, `x` done, `/` search, `Ctrl/Cmd+K` palette, `Ctrl/Cmd+Shift+E` EOD) and **Edit mode** (`Enter`/`Shift+Enter` newline, `Ctrl/Cmd+Enter` submit, `Esc` back). Touch maps every verb to a gesture + soft-keyboard accessory Submit. | The required keys are only unambiguous when navigation and composition are separated by mode. Mobile soft `Return` must stay a newline. |
| **Design system** | **Basecoat** ([basecoatui.com](https://basecoatui.com) — "shadcn/ui without React": plain-HTML components + tiny Alpine scripts) + Tailwind v4, low-chroma **"Ink"** neutral ladder + one restrained indigo accent (primary action + focus ring only). Basecoat is compatible with shadcn/ui OKLCH themes so the Ink token palette is **unchanged**; daisyUI is the documented styling fallback. Dark default, first-class light, OKLCH semantic tokens. 8px grid, dense desktop / comfortable-touch mobile density, Lucide icons. | The killer flows demand the UI disappear and the keyboard lead — the Linear/Raycast archetype. Collections carry the structural/accent role; tags get a muted 8-hue chip set so the two axes stay visually distinct. |
| **Sharing** | Personal-first but **sharing-ready**: a **Collection** is the unit of sharing and can later be shared with other users. Hooks designed in now; personal-only in MVP. | Designing the shareable boundary in from day one avoids a painful retrofit; keeping it dormant keeps the MVP simple. |
| **Hosting / accounts** | **Server-agnostic + multi-account**: an account = { host URL, credentials, identity on that host }; the client can connect to **multiple hosts**, each with its own accounts/collections, via a host/account switcher. Local store partitioned per account. Transport is **TLS only** — no client-side E2EE. | Multi-host keeps users un-locked-in; TLS-only (vs. E2EE) keeps the door open for server-side search + AI/MCP. MVP may ship single-account, but the model + switcher UI are designed in. |

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/01-product-requirements.md](docs/01-product-requirements.md) | PRD — personas, the problem, functional + non-functional requirements, user stories, scope, MVP. |
| [docs/02-architecture.md](docs/02-architecture.md) | Stack decision + rationale (ADR-style), cross-platform strategy, sync/backend, storage, security, deployment. |
| [docs/03-data-model.md](docs/03-data-model.md) | Entities, ER description, CRDT/sync modeling, promotable sub-items, EOD report engine, example JSON. |
| [docs/04-ux-and-interaction.md](docs/04-ux-and-interaction.md) | Full keymap table, editor, capture flow, promotion flow, design system + tokens, key screens. |
| [docs/05-roadmap.md](docs/05-roadmap.md) | Phased milestones MVP → v1 → later, risks, open questions. |

## MVP in One Line

Tauri v2 on all five platforms with a vanilla-TS + Alpine.js view over a framework-agnostic plain-TS core, styled with Tailwind v4 + Basecoat; frictionless keyboard capture with the vim-ish List/Edit modality, CodeMirror 6 markdown editor with image paste, the single-table NODE model with promotable sub-items and the two many-to-many axes (Collections + Tags), offline-first SQLite with op-log sync to a Rust/Axum relay over TLS with the multi-host account model designed in, content-addressed image attachments, and the deterministic EOD report engine with copy-as-markdown and carry-over.

## Open Questions

Most of the early unknowns are now **resolved**: the product is **sharing-ready** with the **Collection** as the shareable unit (personal-only in MVP); transport is **TLS-only** with no client-side E2EE; AI report prose is a **later** enhancement delivered **via MCP** — Daybook exposes its todos/events as an MCP server so any MCP-capable LLM client writes the narrative (provider-agnostic, no bundled LLM); hosting is **self-host + multi-host** (server-agnostic, multi-account switcher); and the codename is **Daybook**.

Genuinely residual: the exact sharing/ACL roles on a shared Collection; whether the multi-host client shows an aggregate cross-host view or one active account at a time; and the precise shape of the MCP surface (which resources/tools Daybook exposes). See [docs/05-roadmap.md](docs/05-roadmap.md).
