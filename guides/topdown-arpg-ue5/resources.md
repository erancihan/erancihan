# Appendix — Resources, Cookbooks & Sample Code

Everything referenced across the guide, plus the best of what's out there, organized by topic. ⭐ = start here for that topic.

---

## ARPG design references & GDC talks

| Resource | What it's for |
|---|---|
| ⭐ **GDC — Diablo: A Classic Game Postmortem** (David Brevik, 2016) — https://www.youtube.com/watch?v=VscdPA6sUkc | Where the genre's DNA comes from — the accidental birth of real-time combat, randomized loot, town portals |
| **GDC — Designing Path of Exile to Be Played Forever** (Chris Wilson, 2019) — https://www.youtube.com/watch?v=tmuy9fyNUjY | Seasons, content reuse, procedural depth — the design philosophy behind Chapters 7, 9, 10 |
| **GDC — Through the Grinder: Refining Diablo III's Game Systems** (Wyatt Cheng, 2013) — https://gdcvault.com/play/1017794/Through-the-Grinder-Refining-Diablo | Iteration on health, skills, controls — a masterclass in cutting systems (GDC Vault, free) |
| **Juice it or lose it** (Jonasson & Purho) — https://www.youtube.com/watch?v=Fy0aCDmgnxg | THE game-feel talk. Watch before Chapter 11 |
| **The Art of Screenshake** (Jan Willem Nijman, Vlambeer) — https://www.youtube.com/watch?v=AJdEqssNZ-U | 30 tweaks from boring to juicy; Ch. 11's hit-feedback stack in 15 minutes |

## Stats & ARPG math

| Resource | What it's for |
|---|---|
| ⭐ **PoE Wiki — Modifier** — https://www.poewiki.net/wiki/Modifier | The additive-"increased" vs multiplicative-"more" system Chapter 3 is built on, from the source |
| PoE Wiki — Armour — https://www.poewiki.net/wiki/Armour (deep dive: https://www.poewiki.net/wiki/Guide:Armour_calculations) | The `A / (A + k·RawDamage)` mitigation curve. PoE currently uses k=5; Ch. 4 uses the older k=10 — same shape, tankier feel |
| PoE Wiki — Receiving damage — https://www.poewiki.net/wiki/Receiving_damage | The full order of operations for a hit — mitigation, taken-modifiers (our Shock), the works |
| PoE Wiki — Critical strike — https://www.poewiki.net/wiki/Critical_strike | Crit chance/multi rules; Ch. 4's roll-once-per-use is a simplification of this |

## Top-down control & camera

| Resource | What it's for |
|---|---|
| ⭐ Epic docs — Top Down Template — https://dev.epicgames.com/documentation/en-us/unreal-engine/top-down-template-in-unreal-engine | What Chapter 1 starts from: camera, click-move, NavMesh already wired |
| Epic docs — Enhanced Input — https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine | Input Actions, Mapping Contexts, triggers — Ch. 1's IA_/IMC_ setup |
| Epic community — Point & Click movement tutorial — https://dev.epicgames.com/community/learning/tutorials/mMVL/ | The click-to-move scheme rebuilt from scratch, if the template's version feels like magic |

## Skills & ability systems

| Resource | What it's for |
|---|---|
| ⭐ Epic docs — Data Driven Gameplay Elements — https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine | Data Tables & Curve Tables, CSV import — the machinery behind the One Rule and every `DT_` in this guide |
| **tranek/GASDocumentation** — https://github.com/tranek/GASDocumentation | The GAS bible. Read before deciding on the Ch. 12 migration; its attribute aggregator IS our Flat/Increased/More |
| Epic docs — Gameplay Ability System — https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-for-unreal-engine (concepts: https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system) | Official GAS entry point — abilities, effects, attributes map 1:1 to Ch. 5/3 |
| **Lyra Starter Game** (Epic, free) — https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine | Epic's GAS best-practice sample; architecture reference for the C++ era, not a base to build on |
| GAS Companion (paid) — https://gascompanion.github.io/ | GAS-without-writing-C++ bridge plugin, if Ch. 12 convinces you but C++ doesn't |

## Loot & item generation

| Resource | What it's for |
|---|---|
| ⭐ **PoE Wiki — Rarity** — https://www.poewiki.net/wiki/Rarity | Normal/Magic/Rare/Unique and affix counts per rarity — Ch. 7's generator rules are a direct simplification |
| PoE Wiki — Rare Item Name Index — https://www.poewiki.net/wiki/Rare_Item_Name_Index | PoE's two-part rare-name generator — a fun weekend add-on to `BFL_LootGen` |
| **Craft of Exile** — https://www.craftofexile.com/ | Interactive affix-pool/tier/weight explorer for the real PoE data — the best way to *feel* how ilvl gates tiers (Ch. 7.2) |
| Ryan Laley — UE5 Inventory System playlist — https://www.youtube.com/playlist?list=PL4G2bSPE_8umjCYXbq0v5IoV-Wi_WAxC3 | Long-form BP inventory series (components, item data, dropping, using) — alternative take on Ch. 7–8's pickup/inventory plumbing |

## Horde AI & performance

| Resource | What it's for |
|---|---|
| ⭐ Epic docs — Animation Budget Allocator — https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-budget-allocator-in-unreal-engine | The plugin Ch. 11 turns on: fixed CPU budget for skeletal meshes, throttled by significance |
| Epic docs — Significance Manager — https://dev.epicgames.com/documentation/en-us/unreal-engine/significance-manager-in-unreal-engine | The framework version of Ch. 11's three-rings idea, when you outgrow distance checks |
| Epic docs — Behavior Tree Quick Start — https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---quick-start-guide | Do this once before Ch. 6's `BT_Enemy` |
| **Ali Elzoheiry — Smart Enemy AI playlist** — https://www.youtube.com/playlist?list=PLNwKK6OwH7eW1n49TW6-FmiZhqRn97cRy | Best BP series on group AI. Built for soulslike pacing — Ch. 6 explains what horde scale keeps and drops from it |
| PoE Wiki — Monster modifiers — https://www.poewiki.net/wiki/Monster_modifiers | The full magic/rare monster-mod zoo Ch. 6's six-mod table is distilled from |
| Epic docs — StateTree — https://dev.epicgames.com/documentation/en-us/unreal-engine/state-tree-in-unreal-engine | Leaner alternative to BTs; worth evaluating if you push past ~100 active mobs |
| Epic docs — Mass Entity — https://dev.epicgames.com/documentation/en-us/unreal-engine/mass-entity-in-unreal-engine + https://dev.epicgames.com/community/learning/tutorials/JXMl/unreal-engine-your-first-60-minutes-with-mass | The ECS crowd framework — the deep end beyond this guide, and the real answer at 500+ mobs |

## Procedural levels

| Resource | What it's for |
|---|---|
| ⭐ Epic docs — Level Instancing — https://dev.epicgames.com/documentation/en-us/unreal-engine/level-instancing-in-unreal-engine | The room-tile prefab workflow Ch. 10's dungeon stitcher is built on |
| Epic community — Creating Environments with Assembled Level Instances — https://dev.epicgames.com/community/learning/tutorials/eB7K/creating-environments-with-assembled-level-instances-in-unreal-engine-part-2 | Practical Level Instance assembly workflow |
| Epic docs — Procedural Content Generation Overview — https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview | The PCG framework — for dressing Ch. 10's stitched rooms (scatter, decals, clutter), not for the layout itself |

## UMG / UI

| Resource | What it's for |
|---|---|
| ⭐ Epic docs — Creating Drag and Drop UI — https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-drag-and-drop-ui-in-unreal-engine | The exact OnDragDetected/OnDrop/DragDropOperation pattern Ch. 8 uses |
| Epic docs — UMG Best Practices — https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-best-practices-in-unreal-engine | Widget performance rules (no Tick in widgets — Ch. 11 repeats this for a reason) |
| Spatial (Tetris-grid) Inventory tutorial — https://www.youtube.com/watch?v=4CjpBoKl6s8 + sample repo: https://github.com/imnazake/grid-inventory-sample | The PoE-style grid inventory Ch. 8 deliberately skipped, for those who want the minigame |

## Sample projects & plugins

| Resource | What it's for |
|---|---|
| ⭐ **Action RPG sample** (Epic, free) — https://www.fab.com/listings/ef04a196-03c1-4204-998a-c7d5264fade7 + UE5 port: https://github.com/vahabahmadvand/ActionRPG_UE5 + walkthrough course: https://dev.epicgames.com/community/learning/courses/QzQ/unreal-engine-action-rpg-unpacked | Epic's official ARPG sample — abilities, stats, and potions in C++/BP. UE4-era; the community port runs on 5.3+ |
| Lyra Starter Game — see the ability-systems table above | Modern architecture reference once you speak GAS |
| Blueprint sharing — https://blueprintue.com/ | Paste-bin for BP graphs (search "inventory", "top down", "projectile"…) |

## Books

| Book | Notes |
|---|---|
| *Blueprints Visual Scripting for Unreal Engine 5*, 3rd ed. — Romero & Sewell (Packt) | Best current BP book; code: https://github.com/PacktPublishing/-Blueprints-Visual-Scripting-for-Unreal-Engine-5 |
| *Game Balance* — Ian Schreiber & Brenda Romero (CRC Press, 2021) | The textbook on the math this genre runs on — curves, economies, rating systems. Chapter 3 and 9's XP/scaling formulas in proper depth |

---

*A note on link rot: this appendix was compiled in July 2026 from a network that blocks direct fetches to dev.epicgames.com and poewiki.net, so those URLs were verified via search-index listings (each exact URL confirmed present and titled as described) rather than an HTTP 200; the GDC/YouTube links, GDC Vault, craftofexile.com, and the GitHub repos were confirmed the same way. A handful of entries (tranek/GASDocumentation, Lyra, GAS Companion, the Elzoheiry playlist, blueprintue.com, the Packt book repo) are carried over from the [co-op soulslike guide's appendix](../coop-soulslike-ue5/resources.md), which link-checked them with HTTP 200s earlier this month. If a YouTube link dies later, search the listed title + speaker.*
