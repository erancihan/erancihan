# Cadence — Product Requirements Document

> Cadence is an offline-first, keyboard-driven task app for iOS/Android/Windows/macOS/Linux that captures as fast as a notepad and auto-generates a shareable markdown end-of-day (EOD) report from what you actually did.

**Status:** Planning / design artifact (no application code yet).
**Related docs:** [Architecture](02-architecture.md) · [Data Model](03-data-model.md) · [UX & Interaction](04-ux-and-interaction.md) · [Roadmap](05-roadmap.md) · [Overview](../README.md)

---

## 1. Problem Statement

Knowledge workers who also run a busy personal life absorb tasks from everywhere — meetings, chat, email, their own head — across **both work and life**. Two things break down:

1. **Capture is too slow.** Every existing app adds ceremony at the moment of capture: pick a project, set a date, tag it, open a form. Friction at capture means tasks never get written down, and what isn't written down can't be reported.
2. **The end-of-day report is manual, lossy, and painful.** The user has to *write an EOD report* — for a manager, a standup, a client, or their own record. Reconstructing "what did I actually do today" from a scattered task list is guesswork. The tools that *can* produce a daily wrap (Sunsama, Akiflow) demand a 5–10 minute shutdown ritual; the tool that auto-generates one (TickTick) buries it in Notes and dumps a flat done/undone list with no narrative.

### The EOD-report motivation (the killer feature)

**The report is the product; the capture is invisible.** Cadence inverts the usual model: you type todos at notepad speed all day, and Cadence *silently* records every meaningful state change in an append-only event log. At end of day — or any range you pick — it derives a clean, grouped, shareable **markdown** report of what was created, updated, completed, and carried over. No ritual. No manual "completed at" field. No DQL queries. You did the work; the report writes itself.

This is the single differentiator everything else in the product serves.

---

## 2. Why Existing Tools Fall Short

No shipping app cleanly nails all three of: (1) frictionless keyboard-first capture, (2) automatic shareable EOD/standup reports from what you *did*, and (3) GitHub-issue-style promotable sub-items — across all five platforms, offline-first.

| Tool | EOD/report story | Where it falls short for us |
| --- | --- | --- |
| **Sunsama** | Best-in-class "Daily Shutdown": AI highlights, task disposition, publishable markdown wrap to Slack/email | Shutdown is a **5–10 min ritual**, not silent; ~$20/mo; online-first; no promotable sub-items; not truly 5-platform |
| **Akiflow** | Daily Shutdown ritual reviews done work, replans undone | Emphasis is planning, not a shareable narrative; expensive; online-first; ceremony-heavy; no sub-issue model |
| **TickTick** | Hidden "Summary" auto-generates a filterable done+undone report, shareable/printable | Manual invocation, **buried in Notes**; a task-list dump, not a markdown narrative; weak markdown/images; no promotable sub-issues |
| **Linear** | True sub-issues + auto-standup digests (completed-in-24h → Yesterday/Today/Blockers) | Dev-team tool, not personal work+life; standup needs 3rd-party integrations; no life-tags axis, no image-attach focus |
| **Todoist** | Productivity view + Activity log (dated event feed) | Event feed, **not a narrative report**; no markdown digest/export; shallow subtasks; report history gated by plan |
| **Obsidian / Logseq** | DIY "done today" via Dataview/Tasks/LOGBOOK queries in daily notes | Requires plugins + query knowledge — the **opposite of notepad-simple**; sync is paid/self-managed; no native promotable sub-issue |
| **Tana / Notion** | AI command nodes / linked "Completed This Week" views can build a report | Supertag/DB ceremony at capture; manual "Completed At"; not robustly offline-first; reports are build-it-yourself |
| **Superlist** | Sleek modern UI, markdown, keyboard, AI meeting→task | **No EOD/standup report at all**; no promotable sub-issue model |
| **Things 3** | Logbook archives completed items | **Apple-only** (disqualified by the 5-platform requirement); no native report/export |

**The unoccupied position:** notepad-speed capture that silently produces a first-class, auto-generated, markdown EOD report. Differentiation must be that Cadence's report is **automatic and capture is visibly faster** — otherwise it reads as a Sunsama/TickTick clone.

---

## 3. Target Users & Personas

Primary user: someone drowning in **work-and-life** tasks who is **on the hook to report** what they did.

| Persona | Context | Core need | EOD trigger |
| --- | --- | --- | --- |
| **The Reporting IC** (primary) | Engineer / PM / analyst who writes a daily EOD or attends standup | Capture at meeting speed; auto-produce "what I did today" in markdown to paste into Slack/Jira/email | Daily standup + manager EOD |
| **The Dual-Life Juggler** | Blends a demanding job with a full personal life (family, side projects, errands) | One app for both axes without them bleeding together; report *just* the work slice when needed | Work EOD, personal weekly review |
| **The Keyboard Power User** | Lives in Linear/Vim/Raycast; hands never leave home row | Zero-mouse operation, single-key list verbs, command palette | Any-time custom-range report |
| **The Cross-Platform Nomad** | Types on a Linux/Windows desktop, captures on an iPhone/Android on the go | Reliable offline capture on the phone, full editing on desktop, seamless sync incl. images | Reviews/generates report on whichever device is closest |

**Not** our target: dev teams needing collaborative project management (Linear/Jira), pure note-takers (Reflect/Obsidian-as-notes), or single-platform Apple loyalists (Things).

---

## 4. Goals & Non-Goals

### Goals
1. **Capture as fast as a notepad** — zero-ceremony, insert-by-default, `Ctrl/Cmd+Enter` to submit.
2. **Make the EOD report automatic** — derived from an immutable event log, deterministic, offline, copy-as-markdown.
3. **Keyboard-first control** — a coherent vim-ish List/Edit modality honoring the exact required keymap.
4. **Genuine 5-platform reach** — iOS, Android, Windows, macOS, Linux from one codebase (non-negotiable).
5. **Offline-first with sync** — local SQLite is the source of truth on-device; sync when online, never block on the network.
6. **Two distinct organizing axes** — one hierarchical Category + many-to-many Tags, both powering report grouping.
7. **GitHub-issue-style structure** — sub-items that can be promoted in place into full todos.
8. **Sleek, modern design** — shadcn/Tailwind v4, dark-default, dense desktop / comfortable mobile.
9. **Rich bodies** — markdown editing with inline live preview and **attached, synced images**.

### Non-Goals (MVP)
- **Collaboration / sharing / multi-user.** Cadence is strictly personal multi-device for MVP. (See open question on future team scope.)
- **AI-generated narrative prose as the default.** MVP ships a deterministic template generator; AI narrative is a later, optional, cloud-backed enhancement — never required.
- **End-to-end encryption.** Transport + at-rest on a self-hosted/managed backend for MVP; E2EE is later.
- **Board/kanban, calendar time-blocking, Pomodoro/time-tracking.** Not the core loop.
- **Full mobile feature parity with desktop.** Mobile MVP = fast capture + read/browse + report view; heavy editing is desktop-first.
- **Non-markdown export formats** (HTML/JSON/PDF) — markdown is the universal paste target for MVP.

---

## 5. Functional Requirements (MoSCoW)

Priorities: **Must** (MVP-blocking) · **Should** (MVP if time allows) · **Could** (nice-to-have) · **Won't** (explicitly out for now).

### 5.1 Capture (notepad-simple)
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CAP-1 | A quick-capture bar / new-row action creates a todo with **zero required fields** (just a body). | Must |
| FR-CAP-2 | Capture is **insert-by-default**: a new user can just type without learning modes. | Must |
| FR-CAP-3 | `Ctrl/Cmd+Enter` submits the current todo; `Enter` and `Shift+Enter` both insert a newline while composing. | Must |
| FR-CAP-4 | IDs are client-generated (UUIDv7/ULID) so todos can be created fully offline. | Must |
| FR-CAP-5 | Command palette (`Ctrl/Cmd+K`) for capture and every action, so non-power-users can type their way to anything. | Must |

### 5.2 Markdown bodies
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-MD-1 | Todo bodies support GitHub-flavored markdown, stored as the **literal markdown string** (report = concatenation of bodies). | Must |
| FR-MD-2 | Obsidian-style **inline live preview** (hide syntax tokens when the caret leaves them; render inline image widgets). | Must |
| FR-MD-3 | Paste an image directly into the body to attach it. | Must |
| FR-MD-4 | Editor manages its own input layer for reliable mobile soft-keyboard / IME behavior (CodeMirror 6). | Must |

### 5.3 Categories (axis 1)
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CAT-1 | Exactly **one hierarchical Category** per node (single-select bucket). | Must |
| FR-CAT-2 | Categories are user-defined, nestable, and carry the accent/structural color role. | Must |
| FR-CAT-3 | Assign category from List mode (`c`) and the command palette. | Must |

### 5.4 Tags (axis 2)
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-TAG-1 | **Many-to-many** tags per node, distinct from categories (a controlled muted chip set). | Must |
| FR-TAG-2 | Tags mergeable across devices via a tombstoned join (no lost/duplicated tags on concurrent edits). | Must |
| FR-TAG-3 | Assign/remove tags from List mode (`t`) and the command palette. | Must |

### 5.5 Sub-items & promotion
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SUB-1 | A todo can have **multiple sub-items** (nested checklist children). | Must |
| FR-SUB-2 | A sub-item can be **promoted in place** into a full todo with its own body, tags, category, sub-items, and attachments — GitHub's sub-issue model (no row copy; `promoted=true` + event). | Must |
| FR-SUB-3 | Indent/outdent (`Tab`/`Shift+Tab`) and reorder without server round-trips (fractional indexing). | Must |
| FR-SUB-4 | `x` toggles done on the focused node; sub-item completion contributes to the report. | Must |

### 5.6 Images / attachments
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-IMG-1 | Attach images to todos, **stored in the app** and synced across devices. | Must |
| FR-IMG-2 | Blobs are **content-addressed by SHA-256** (free dedup + integrity), synced on a **separate channel** from the op log. | Must |
| FR-IMG-3 | On-device thumbnail + blurhash so a todo renders immediately while the full image lazy-loads. | Must |
| FR-IMG-4 | Offline upload/download queue + LRU size-capped local blob cache. | Must |
| FR-IMG-5 | UI degrades gracefully to blurhash/thumbnail when full bytes haven't downloaded yet. | Should |

### 5.7 Cross-platform
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-XP-1 | Ship to **iOS, Android, Windows, macOS, Linux** from one codebase (Tauri v2 + React/Vite/Tailwind/shadcn over a Rust core). | Must |
| FR-XP-2 | Desktop is first-class; mobile MVP is scoped to **fast capture + read/browse + report view**. | Must |
| FR-XP-3 | Per-platform keyboard/IME QA across WKWebView / Android WebView / WebView2 / WebKitGTK; avoid heavy blur/filters (weak Linux WebKitGTK renderer). | Should |

### 5.8 Offline-first sync
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SYNC-1 | Local SQLite store; app is **fully usable offline**, sync when online, never block on network. | Must |
| FR-SYNC-2 | Client op-log sync to a thin Rust (Axum) relay persisting a per-user op log to Postgres. | Must |
| FR-SYNC-3 | **Hybrid conflict model**: per-field LWW (HLC/Lamport) for scalars/enums/FKs/order_key; a **Y.Text sequence CRDT** (via `yrs`) only for the markdown body. | Must |
| FR-SYNC-4 | Tombstone soft-deletes with causal-watermark GC (never resurrect deleted todos). | Must |
| FR-SYNC-5 | Email **magic-link + JWT** auth. | Must |
| FR-SYNC-6 | Body CRDT sits behind a Rust trait so the engine can be swapped later. | Should |

### 5.9 EOD report engine (killer feature)
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-EOD-1 | Derive reports from the **immutable event log** over a timezone-aware local-day range (default: today). | Must |
| FR-EOD-2 | Bucket events into **CREATED / UPDATED / COMPLETED / CARRIED_OVER**; resolve to current node snapshots. | Must |
| FR-EOD-3 | **Deterministic markdown template** (fully offline): checkbox bullets, nested sub-item rollups, tag chips, timestamps. | Must |
| FR-EOD-4 | **Group-by Category** (MVP); group-by Tag / project-root as pivots. | Must (category) / Should (others) |
| FR-EOD-5 | **Copy-as-markdown** as the primary export. | Must |
| FR-EOD-6 | **Carry-over**: roll unfinished in-scope items forward, track a slipped-days count. | Must |
| FR-EOD-7 | Custom date range (yesterday / this week / arbitrary). | Should |
| FR-EOD-8 | "**What changed**" diff — sub-items checked, promotions, status flips — not just completions. | Should |
| FR-EOD-9 | Optional inline thumbnails embedded in the export. | Could |
| FR-EOD-10 | Standup format toggle (Yesterday / Today / Blockers); scheduled auto-generation; AI narrative prose. | Won't (MVP) |

### 5.10 Keyboard control
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-KEY-1 | **Vim-ish two-mode** modality: LIST (navigation) and EDIT (CodeMirror active). Full keymap in [UX & Interaction](04-ux-and-interaction.md). | Must |
| FR-KEY-2 | Exact keys honored: `Enter`/`Shift+Enter` = newline (Edit); `Ctrl/Cmd+Enter` = submit; **arrow keys** navigate between todos; **`e`** edits the focused todo. | Must |
| FR-KEY-3 | List-mode verbs: `j/k` + arrows nav, `Enter`/`e` edit, `o/O` new sibling, `Tab/Shift+Tab` indent/outdent, `p` promote, `x` toggle done, `t` tag, `c` category, `/` search, `Ctrl/Cmd+K` palette, `Ctrl/Cmd+Shift+E` generate EOD. | Must |
| FR-KEY-4 | Persistent **mode pill + caret-color** change makes modality legible; `Esc` returns to List. | Must |
| FR-KEY-5 | `?` **cheat-sheet overlay** for discoverability. | Must |
| FR-KEY-6 | **Touch has no single-key layer**: every List verb maps to a gesture (tap=edit, swipe-right=done, swipe-left=actions, long-press-drag=reorder/indent, FAB=quick-add), plus an **accessory toolbar** above the soft keyboard with a dedicated **Submit** button (soft Return stays a newline). | Must |

---

## 6. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| **Performance** | Capture-to-persist feels instant (local write, no network in the hot path). List renders large trees smoothly; images render from blurhash first. Keep the DOM light on Linux WebKitGTK (no heavy blur/filter elevation). |
| **Offline** | Full create/edit/complete/promote/tag/categorize while offline; changes queue and sync on reconnect. SQLite is a deterministic projection of the CRDT/op-log source of truth. |
| **Sync correctness** | No lost concurrent body edits (Y.Text CRDT). No lost/duplicated tags. No resurrected deletes (causal-watermark GC only). Two channels (op log + blobs) may lag; UI degrades gracefully, never errors. |
| **Security / Privacy** | Transport (TLS) + at-rest encryption on the backend for MVP. Email magic-link + JWT auth. Deterministic report generation keeps EOD data **offline and private by default** — no data leaves the device unless the user syncs/exports. (E2EE and cloud AI are opt-in later, gated by open questions.) |
| **Accessibility** | Honor `prefers-reduced-motion`; first-class light theme alongside dark default; keyboard-operable everywhere (a keyboard-first app must also be screen-reader and focus-visible correct); mobile touch targets ≥ 40–44px via auto comfortable density. |
| **Platform coverage** | All five targets from one Tauri v2 codebase. Validate an iOS/Android build spike (image attach, background sync, capture) before committing; budget hand-rolled mobile signing/release pipelines. |
| **Design quality** | Cadence design system: shadcn/Tailwind v4, OKLCH semantic tokens, low-chroma "Ink" ladder + single restrained indigo accent, 8px grid, dense 28–32px desktop rows / 40–44px mobile, hairline borders, Lucide icons, fast subtle motion. Details in [UX & Interaction](04-ux-and-interaction.md). |
| **Reliability / data durability** | Client-generated IDs; append-only immutable event log makes the same range always reproduce the same report (auditable). Schedule op-log/CRDT compaction + tombstone GC behind a causal watermark. |

---

## 7. User Stories (key flows)

### Capture
- *As a reporting IC*, I press one key, type a task in a meeting, and hit `Ctrl+Enter` — no fields, no mouse — so the thought is captured before the meeting moves on.
- *As a mobile nomad*, I tap the FAB, type on my phone offline on the train, and the soft Return still makes newlines while a Submit button on the keyboard accessory bar commits — so the capture loop works on a phone.

### Markdown & images
- *As a dual-life juggler*, I paste a screenshot of an error into a work todo's body and see it inline; it syncs to my desktop where I finish the task.
- *As a power user*, I write a todo body in markdown with a checklist and a link, and it renders live-preview without me leaving the keyboard.

### Organize (two axes)
- *As a dual-life juggler*, I file a todo under the `Home > Renovation` **category** and tag it `#urgent` and `#call`, so I can later report only work items or slice by tag.

### Sub-items & promotion
- *As a reporting IC*, I add three sub-items under a todo; one grows in scope, so I press `p` to **promote** it into its own full todo with its own body and tags — without losing its place or history.

### Sync & offline
- *As a nomad*, I complete tasks offline on my laptop and my phone independently; when both reconnect, nothing is lost and my markdown bodies merge cleanly.

### The EOD report (killer flow)
- *As a reporting IC at 5pm*, I press `Ctrl/Cmd+Shift+E`, Cadence generates a markdown report of everything I **created, updated, completed, and carried over** today, grouped by category, and I **copy-as-markdown** straight into Slack — no ritual, no manual "completed at."
- *As a manager-facing IC*, unfinished items **carry over** to tomorrow with a slipped-days count, and the report surfaces the "what changed" diff (sub-items checked, promotions), so my EOD reflects real progress, not just checkboxes.
- *As a nomad*, I generate the same report from any device for any custom range, and it reproduces identically because it's derived from the immutable event log.

---

## 8. Scope

### In scope (product)
Personal multi-device task capture, markdown bodies with images, category + tag axes, promotable sub-items, offline-first sync, and the automatic EOD report — on all five platforms with a keyboard-first, shadcn-styled UI.

### Out of scope (now)
Collaboration/sharing/multi-user; E2EE; cloud AI narrative as default; board/kanban; calendar/time-blocking; time tracking; non-markdown export; native mobile integrations (share-sheet, widgets, App Intents); productivity analytics dashboards.

---

## 9. MVP Cut

The MVP delivers the full killer loop — notepad-fast capture → structured todos → automatic markdown EOD report — on all five platforms, offline-first.

**In MVP**
- Tauri v2 shell on all five platforms (desktop first-class; mobile = fast capture + read/browse + report view).
- Frictionless keyboard capture with the vim-ish List/Edit modality and the exact keymap (`Enter`/`Shift+Enter` = newline, `Ctrl/Cmd+Enter` = submit, arrows navigate, `e` = edit).
- CodeMirror 6 markdown editor with inline live preview and image paste.
- Single-table NODE model: todos, nested sub-items, in-place promotion of a sub-item to a full todo.
- Two axes: one hierarchical Category per node + many-to-many Tags.
- Local SQLite, fully offline-first; client op-log sync to a thin Rust (Axum) relay with Postgres persistence.
- Hybrid conflict model: per-field LWW (HLC) for scalars/structure + Y.Text CRDT for the markdown body; tombstone soft-deletes.
- Email magic-link + JWT auth.
- Image attachments: paste/attach, content-addressed (SHA-256) blobs synced on a separate channel to Cloudflare R2, on-device thumbnails/blurhash, offline upload/download queue.
- EOD report engine from the append-only event log: today + custom range, group-by-category, deterministic markdown template, copy-as-markdown + carry-over of unfinished items.
- Cadence design system: shadcn/Tailwind v4, dark default + light theme, dense desktop / comfortable mobile density, command palette, quick-capture bar, detailed GitHub-issue todo view.
- `?` cheat-sheet overlay and command palette for keymap discoverability; mobile gesture equivalents + soft-keyboard accessory Submit button.

**Explicitly later** (see [Roadmap](05-roadmap.md)): AI-generated narrative reports, scheduled auto-generation, standup format toggle + extra group-by pivots, board/kanban view, E2EE, sharing/collaboration, extra export formats (HTML/JSON/PDF), native mobile integrations, carry-over analytics, op-log/CRDT compaction tooling, alternate body-CRDT swap, self-hosted backend distribution.

---

## 10. Open Questions

These bound the sync protocol, auth, and privacy design and should be resolved before lock-in (tracked in [Roadmap](05-roadmap.md)):

1. **Sync scope** — strictly personal multi-device forever, or leave room for shared lists/teams later?
2. **End-to-end encryption** — per-user E2EE of docs/blobs before they touch the server (blocks server-side AI/search), or transport + at-rest on a self-hosted backend for now?
3. **AI report narrative** — is sending task data to a cloud LLM acceptable for optional prose, or must Cadence stay deterministic/offline forever? If allowed, which provider/privacy posture?
4. **Launch hosting posture** — managed pieces for MVP (Cloudflare R2 + managed Postgres + small VPS Axum relay) vs fully self-hosted from day one?
5. **Codename** — confirm "Cadence" before repos and the design-token namespace lock in.
