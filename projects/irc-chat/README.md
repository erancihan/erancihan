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
| 10 | **Tune for a small personal island (~10–50), but no architectural ceiling** | Nobody should be obliged to host for strangers; growth should cost a bigger box, never a rewrite |
| 11 | **Non-profit, community-run, no telemetry** — "no centralization" defined by two tests, not vibes | If the project disappears tomorrow, every island keeps working |
| 12 | **AGPL-3.0 server · Apache-2.0 clients · CC0 protocol spec** | Copyleft protects the server from closed SaaS forks; GPL-family licenses **cannot** ship in App Store clients |

## What "nothing centralized" means here

Two tests decide whether any component is acceptable (PLAN.md §2.1):

- **Data-path test** — does user content, identity, social graph, or an island directory
  flow through it? If yes, it's forbidden.
- **Death test** — if the project and its maintainers vanish tomorrow, does the network
  keep working?

The project ships **software** and one **content-free iOS push relay**. It does not run
the network, hold any user data, or know which islands exist. There is no directory and
no discovery — you connect by address.

## The one honest asterisk

**Android can be fully sovereign; iOS cannot.** Android defaults to **UnifiedPush** with a
self-hosted ntfy (no Google at all), with a foreground-service socket for people who want
zero intermediaries — which also means the app ships on **F-Droid** without an anti-feature
flag. But waking a killed **iOS** app requires Apple's APNs, credentials bind to the *app*
rather than the server, and even self-hosted ntfy must relay iOS wakes through an
APNs-connected upstream.

So exactly one shared relay survives. It is content-free, stateless, published as a
container, and its URL is client-configurable — so ours is a default, not a chokepoint. If
it dies, iOS loses background wakes and **nothing else**. See [PLAN.md §11](./PLAN.md).

## Scale posture

Your island is meant to be **small** — friends, ~10–50 people, one cheap box. Nobody should
have to run infrastructure for hundreds of strangers; if others want in, they host their own.

But the *software* must never be the ceiling. Growth should cost a bigger box, not a
rewrite — enforced from day one by four rules (PLAN.md §6.4): everything through
`Phoenix.PubSub`, no global in-memory state, every service addressed by config URL, all
media through the S3 API. Single-node then stays a *deployment* choice, not an
architectural one.

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
