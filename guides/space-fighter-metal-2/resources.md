# Appendix — Resources & Further Reading

Everything referenced across the guide, plus the best of what's out there for
fixed timesteps, game feel, collision, text rendering and netcode — organised by
topic. ⭐ = start here for that topic. The first guide's
[`resources.md`](../space-fighter-metal/resources.md) still covers Metal, the
ECS and the math.

> Links occasionally drift. If one 404s, the resource almost certainly still
> exists — search its title.

---

## Timestep, determinism and randomness

| Resource | What it's for |
|---|---|
| ⭐ Glenn Fiedler — **Fix Your Timestep!** — https://gafferongames.com/post/fix_your_timestep/ | The accumulator loop, the spiral of death, and render interpolation. Chapter 02 is this article applied. |
| Rory Driscoll — **Frame Rate Independent Damping Using Lerp** — https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/ | Why `lerp(a, b, 0.1)` per frame is wrong and `1 - exp(-k·dt)` is right (chapters 02, 05). |
| Sebastiano Vigna — **xoshiro / xoroshiro generators** — https://prng.di.unimi.it/ | The generator family behind `Rng` in chapter 02, with reference code and the reasoning for the scrambler. |
| Blackman & Vigna — **Scrambled Linear Pseudorandom Number Generators** (paper) — https://vigna.di.unimi.it/ftp/papers/ScrambledLinear.pdf | The paper, if you want the statistics behind the choice. |
| Apple — **`RandomNumberGenerator`** — https://developer.apple.com/documentation/swift/randomnumbergenerator | The protocol `Rng` conforms to, so `Float.random(in:using:)` just works. |
| Apple — **Swift Testing** — https://developer.apple.com/documentation/testing | `@Test`, `#expect`, the test framework every chapter's tests use. |

## Input

| Resource | What it's for |
|---|---|
| Apple — **GameController** — https://developer.apple.com/documentation/gamecontroller | Gamepads, including the extended-gamepad profile chapter 03's optional source reads. |
| Apple — **`GCController`** — https://developer.apple.com/documentation/gamecontroller/gccontroller | Enumerating connected controllers. |
| Apple — **`CGAssociateMouseAndMouseCursorPosition`** — https://developer.apple.com/documentation/coregraphics/cgassociatemouseandmousecursorposition(_:) | Detaching the cursor from mouse movement for relative-mode capture (chapter 03). |
| Apple — **`MTKView.preferredFramesPerSecond`** — https://developer.apple.com/documentation/metalkit/mtkview/preferredframespersecond | The display rate — which, from chapter 02 on, is *not* the simulation rate. |

## Flight and camera

| Resource | What it's for |
|---|---|
| ⭐ John Nesky — **50 Camera Mistakes** (GDC 2014) — https://www.gdcvault.com/play/1020460/50-Camera | The canonical talk on third-person cameras; lag, lead and framing are all in here (chapter 05). |

## Collision

| Resource | What it's for |
|---|---|
| ⭐ Christer Ericson — **Real-Time Collision Detection** (book site) — https://realtimecollisiondetection.net/ | Segment–sphere tests, spatial partitioning, everything chapter 06 does and much it doesn't. |
| Matthias Müller — **Spatial hashing** (Ten Minute Physics, lecture 11) — https://matthias-research.github.io/pages/tenMinutePhysics/11-hashing.pdf | The uniform-grid hash chapter 06 builds, in a few slides. |

## Text

| Resource | What it's for |
|---|---|
| Apple — **Core Text** — https://developer.apple.com/documentation/coretext | Glyph lookup and rasterisation for the atlas in chapter 09. |
| Apple — **`CTFont`** — https://developer.apple.com/documentation/coretext/ctfont | Advances, bounding rects and glyph paths. |

## Netcode

| Resource | What it's for |
|---|---|
| ⭐ Gabriel Gambetta — **Fast-Paced Multiplayer** (series) — https://www.gabrielgambetta.com/client-server-game-architecture.html | The clearest introduction to client-server, prediction, reconciliation and interpolation. Chapter 12 assumes you've read it. |
| Gabriel Gambetta — **Client-Side Prediction and Server Reconciliation** — https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html | Part 2 — chapter 13's reconciliation loop. |
| Gabriel Gambetta — **Entity Interpolation** — https://www.gabrielgambetta.com/entity-interpolation.html | Part 3 — the 100 ms interpolation buffer for remote ships. |
| Gabriel Gambetta — **Lag Compensation** — https://www.gabrielgambetta.com/lag-compensation.html | Part 4 — what this guide deliberately leaves out, and why you'd add it. |
| ⭐ Glenn Fiedler — **What Every Programmer Needs to Know About Game Networking** — https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/ | Lockstep vs client-server, historically and practically. The framing chapter 12 borrows. |
| Glenn Fiedler — **Deterministic Lockstep** — https://gafferongames.com/post/deterministic_lockstep/ | The design chapter 12 compares against and doesn't choose. |
| Glenn Fiedler — **Snapshot Interpolation** — https://gafferongames.com/post/snapshot_interpolation/ | Sending world state at a lower rate than you simulate, and drawing between snapshots. |
| Glenn Fiedler — **State Synchronization** — https://gafferongames.com/post/state_synchronization/ | The hybrid chapter 12 ends up closest to. |
| Valve — **Source Multiplayer Networking** — https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking | A shipped engine's version of the same design, with the numbers. |
| Tim Ford — **Overwatch Gameplay Architecture and Netcode** (GDC 2017) — https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and | ECS plus prediction plus rollback in a shipped game. Watch it after chapter 13. |
| Paul Bettner & Mark Terrano — **1500 Archers on a 28.8** — https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond | The classic lockstep post-mortem; the reason "just send inputs" is tempting and hard. |
| **GGPO** — https://github.com/pond3r/ggpo | Rollback netcode as a library; the developer guide is a good read on what rollback demands from a simulation. |
| SnapNet — **Netcode Architectures** (series) — https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/ | A modern side-by-side of lockstep, rollback and snapshot designs. |
| Fabien Sanglard — **Quake 3 network model** — https://fabiensanglard.net/quake3/network.php | Delta-compressed snapshots, explained from the source. |
| Apple — **Network.framework** — https://developer.apple.com/documentation/network | `NWConnection`, `NWListener`, UDP — chapter 14's transport. |
| Apple — **`NWListener`** — https://developer.apple.com/documentation/network/nwlistener | Hosting. |
| Apple — **`NWBrowser`** — https://developer.apple.com/documentation/network/nwbrowser | Bonjour discovery for the LAN lobby. |
