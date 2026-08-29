# irc-chat (codename **Archipelago**)

Planning for a **self-hosted, privacy-respecting chat + voice platform** that replaces
**both Discord** (communities, text channels, roles, threads, reactions, bots) **and
TeamSpeak** (low-latency, always-on group voice) — in one product.

You run a server; people connect to it by address (`host:port`), exactly like joining an
IRC network, a Mumble server, or a TeamSpeak instance. **Nothing central. No global
account. Separate identity per server.**

> Status: **v1 architecture plan** (no code yet). The full reasoning, alternatives, and
> third-party tool choices live in **[PLAN.md](./PLAN.md)**.

## The locked decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | **Topology = isolated islands** — each server standalone, no central service, no global account, no federation in v1 | It's the product's spine, and it's the natural state of a standalone server |
| 2 | **Voice AND text both in v1** | Replace TeamSpeak and Discord at once, or replace neither |
| 3 | **Privacy = TLS + DTLS-SRTP + trust-the-host** (operator can read at rest; no E2EE in v1) | Honest, coherent, strictly better than Discord |
| 4 | **Native mobile is mandatory** — Kotlin/Compose (Android), Swift/SwiftUI (iOS) | The whole reason this exists: Element/Matrix mobile UX felt wrong |
| 5 | **Build the text/community layer; adopt LiveKit** (Apache-2.0 SFU) for voice/video/screenshare | Don't reinvent an SFU; do own the islands + identity model |
| 6 | **Server = Elixir/Phoenix** (Go is the sanctioned fallback) | Presence, fan-out, and multi-device broadcast come nearly for free |
| 7 | **Mobile core = Kotlin Multiplatform** + a narrow **Rust crypto module** (UniFFI), native UI | Bug-prone logic written once in Kotlin; crypto in the one language with a real MLS implementation |
| 8 | **E2EE is pre-invested, not pre-built** — MLS is the committed direction; v1 ships the envelope, crypto module and seams, not the encryption | Retrofitting E2EE into a plaintext message model is the rewrite we're paying a small tax to avoid |
| 9 | **Desktop = Tauri** (LiveKit Rust SDK for media), Electron as the fallback | The Rust module gives Tauri the code-reuse rationale it lacked; gated on a measured spike |
| 10 | **Scale design target = ≤500 registered / ≤50 concurrent voice**, single node | Tiers 1–3 share one architecture, so this is cheap to be wrong about |

## The one honest asterisk

Background push **cannot** be fully self-hosted on stock mobile: waking a killed iOS app
needs Apple's APNs, reliable Android background delivery needs Google's FCM, and those
credentials bind to the **app**, not the server. So the app publisher runs one small,
stateless, **content-free** push gateway — the single "central-ish" piece in an otherwise
decentralized system. [PLAN.md §11](./PLAN.md) confronts this head-on.

## Suggested stack (see PLAN.md for the full catalog)

`Elixir/Phoenix` · `PostgreSQL` (+FTS) · `Redis/Valkey` · `LiveKit` + `coturn` + `Opus`
(voice) · `Garage` (S3 media) · `Caddy` (auto-TLS) · `Kotlin Multiplatform` + `Ktor` +
`SQLDelight` core + **Rust crypto module** via `UniFFI` · `Compose`/`SwiftUI` UI ·
publisher `Sygnal`-pattern push gateway · `Tauri` desktop (v2) · `libsodium` P-256
hardware identity, `OpenMLS`/`mls-rs` X25519-Ed25519 suite for E2EE (v3).

## How this doc was produced

The plan was researched by fanning out specialist passes across every dimension
(foundation build-vs-adopt, voice stack, push, native clients, desktop, server, identity,
feature→tool mapping, security), adversarially fact-checking the load-bearing technical
claims, then synthesizing. Provisional codename; not final.
