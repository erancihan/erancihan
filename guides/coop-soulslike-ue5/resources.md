# Appendix — Resources, Cookbooks & Sample Code

Everything referenced across the guide, plus the best of what's out there, organized by topic. ⭐ = start here for that topic.

---

## Multiplayer & replication

| Resource | What it's for |
|---|---|
| ⭐ **Cedric "eXi" Neukirchen — Multiplayer Network Compendium** — https://cedric-neukirchen.net/docs/category/multiplayer-network-compendium/ (Epic-hosted mirror: https://dev.epicgames.com/community/learning/tutorials/jO9e/multiplayer-network-compendium) | THE community reference for everything in Chapter 2 — class table, RPCs, ownership, sessions. Read it once fully. |
| Epic docs — Networking Overview — https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview | Official entry point |
| Epic docs — Replicate Actor Properties — https://dev.epicgames.com/documentation/unreal-engine/replicate-actor-properties-in-unreal-engine | Variable replication & RepNotify details |
| Epic docs — Remote Procedure Calls — https://dev.epicgames.com/documentation/unreal-engine/remote-procedure-calls-in-unreal-engine | RPC rules (ownership, reliability) |
| Epic docs — Networked Movement in CMC — https://dev.epicgames.com/documentation/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine | Net roles + the canonical source on root-motion networking |
| **WizardCell — Multiplayer Tips and Tricks** — https://wizardcell.com/unreal/multiplayer-tips-and-tricks/ | Dense gotcha list (OnRep quirks, ownership) |
| **Vorixo — Correct stateful replication** — https://vorixo.github.io/devtricks/stateful-events-multiplayer/ | The "state vs events / late joiners" rule of Ch. 2.5, argued properly |
| **Kekdot (YouTube)** — https://www.youtube.com/watch?v=OVeo3cVTIcU (Basics of Replication) | Best video channel for BP multiplayer; their RepNotify & sessions videos map to Ch. 2–3 |
| droganaida/UE5-Multiplayer-Replication-Guide — https://github.com/droganaida/UE5-Multiplayer-Replication-Guide | Small BP replication/authority playground project |

## Sessions, Steam & EOS

| Resource | What it's for |
|---|---|
| Epic docs — Online Session Nodes — https://dev.epicgames.com/documentation/en-us/unreal-engine/online-session-nodes?application_version=4.27 | The Create/Find/Join/Destroy nodes (page is 4.27-era; nodes unchanged) |
| ⭐ **Advanced Sessions Plugin** (mordentral) — https://github.com/mordentral/AdvancedSessionsPlugin + prebuilt binaries: https://vreue4.com/advanced-sessions-binaries | Server names, Steam friends/avatars/invites, session filters — Ch. 3.5. Prebuilt binaries work in BP-only projects; building from source needs C++. Disable the Steam Sockets plugin alongside it. |
| Epic docs — Online Subsystem Steam — https://dev.epicgames.com/documentation/en-us/unreal-engine/online-subsystem-steam-interface-in-unreal-engine | The ini config in Ch. 3.5 |
| Epic docs — Online Subsystem EOS — https://dev.epicgames.com/documentation/en-us/unreal-engine/online-subsystem-eos-plugin-in-unreal-engine + course: https://dev.epicgames.com/community/learning/courses/1px/unreal-engine-the-eos-online-subsystem-oss-plugin | The free crossplay alternative to Steam |
| Epic community — Using EOS with Blueprints — https://dev.epicgames.com/community/learning/tutorials/Mbop/unreal-engine-using-epic-online-services-with-blueprints | BP-only EOS walkthrough |

## Soulslike combat tutorials (Blueprint)

| Resource | What it's for |
|---|---|
| ⭐ **Ali Elzoheiry (YouTube)** — combo system: https://www.youtube.com/watch?v=Q5xk5PYlQ1k ; Smart Enemy AI playlist: https://www.youtube.com/playlist?list=PLNwKK6OwH7eW1n49TW6-FmiZhqRn97cRy | The best BP series for this genre: combos, damage-info structs, group AI with **attack tokens** (Part 11), EQS strafing (Part 4), boss fights (Parts 20–22). Ch. 6/8/9 follow the same architecture. |
| **UnrealRPGMastery — Soulslike Combat series** — https://www.youtube.com/watch?v=HWxS-oe0kTo ; full Udemy course: https://www.udemy.com/course/unreal-engine-5-soulslike-combat/ | Soup-to-nuts soulslike melee: stats component, combos, directional dodge, lock-on, hit detection, boss AI |
| **Gorka Games — UE5 RPG series #12 (Target Lock & Dodge Roll)** — https://dev.epicgames.com/community/learning/tutorials/JXnb/unreal-engine-5-rpg-tutorial-series-12-target-lock-and-dodge-roll | Free text+video lock-on & roll matching Ch. 4/7 |
| Epic community — Networked Dash (Root Motion) — https://dev.epicgames.com/community/learning/tutorials/WzoK/unreal-engine-networked-dash-root-motion | The Server→Multicast root-motion montage recipe (our dodge) |
| Epic community — Dodge Roll with Root Motion — https://dev.epicgames.com/community/learning/tutorials/aVpz/how-to-make-a-dodge-roll-with-root-motion-in-unreal-engine-5 | Root-motion roll setup |
| Epic community — Melee Trace (UE 5.5) — https://dev.epicgames.com/community/learning/tutorials/W4Pz/melee-trace-unreal-engine-5-5 | AnimNotifyState weapon-trace pattern (Ch. 6.4) |
| **MeleeTrace plugin** — https://github.com/rlewicki/MeleeTrace | Free, production-quality socket-interpolated melee traces (needs C++ project to build) |
| Epic community — Simple Hitstop — https://dev.epicgames.com/community/learning/tutorials/Rek5/simple-hitstop-implementation | Ch. 5.4's juice |
| **mklabs Target System plugin** — https://github.com/mklabs/ue4-targetsystemplugin | Open-source lock-on component; its LOS-delay & screen-space switching logic informed Ch. 7 |
| 80.lv — Souls-like in UE5 writeup — https://80.lv/articles/tutorial-full-souls-like-game-in-unreal-engine-5 | Overview article with further links |

## AI

| Resource | What it's for |
|---|---|
| ⭐ Epic docs — Behavior Tree Quick Start — https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---quick-start-guide | Do this once before Ch. 8 |
| Epic docs — BT Overview / Node Reference — https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview | Composites, decorators, observer aborts |
| Epic docs — AI Perception — https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine | Sight config fields used in Ch. 8.2 |
| Epic docs — EQS Quick Start — https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-query-system-quick-start-in-unreal-engine | Donut-generator strafing (Ch. 8.5 fancy version) |
| Gorka Games — Boss Fight BT tutorial — https://dev.epicgames.com/community/learning/tutorials/nwV6/how-to-create-a-boss-fight-in-unreal-engine-5-behavior-trees-ai-beginner-tutorial | Phase-switching boss BT |
| Lim-Young/UnrealAITokenSystem — https://github.com/Lim-Young/UnrealAITokenSystem | DOOM-style attack-token architecture (C++, maps 1:1 to Ch. 8.5) |
| Ryan Laley — UE5 AI playlist — https://www.youtube.com/playlist?list=PL4G2bSPE_8uklDwraUCMKHRk2ZiW29R6e | Gentle full-course alternative for BT/perception |

## Saves, bonfires, souls

| Resource | What it's for |
|---|---|
| Epic docs — Saving and Loading Your Game — https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine | SaveGame object nodes (Ch. 10.7) |
| Epic community (UNF Games) — Creating a Bonfire System — https://dev.epicgames.com/community/learning/tutorials/R4zX/unreal-engine-creating-a-bonfire-system | Bonfire menu, rest, world reset |
| ⭐ **Tom Looman — Unreal Engine Save System** — https://tomlooman.com/unreal-engine-cpp-save-system/ | Explicitly Dark-Souls-styled world-state saving; C++ but the architecture is Ch. 10.7's blueprint |

## Sample projects & frameworks

| Resource | What it's for |
|---|---|
| ⭐ **Lyra Starter Game** (Epic, free) — https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine | Epic's networked-GAS best-practice sample. Architecture reference for the C++/GAS era (Ch. 12), not a base to build on (C++-heavy shooter). |
| **tranek/GASDocumentation** — https://github.com/tranek/GASDocumentation | The GAS bible + multiplayer sample. Read before any GAS decision. Key fact: ASC/AttributeSets require C++; abilities/effects can be BP. |
| GAS Companion (paid) — https://gascompanion.github.io/ · GAS Associate (free) — https://forums.unrealengine.com/t/gas-associate-a-plugin-to-use-gameplay-ability-system-in-blueprints-free/635382 | GAS-without-writing-C++ bridge plugins |
| Pyrrhulla/UE5_Melee_Soulslike- — https://github.com/Pyrrhulla/UE5_Melee_Soulslike- | All-Blueprint soulslike study project (lock-on, combos, stamina, dodge, boss) — readable reference |
| georgehuan1994/Unreal-Melee-Combat-System — https://github.com/georgehuan1994/Unreal-Melee-Combat-System | UE5.1 BP soulslike combat; names match Ch. 4–6 patterns (`IFrame_ANS`, stat component, per-action costs) |
| Makyrios/SoulsLikeGame — https://github.com/Makyrios/SoulsLikeGame | C++ soulslike matching Elzoheiry's architecture (StateManager/Combat/Targeting/Collision components) — your Ch. 12 migration preview |
| felipenune/SoulsLike — https://github.com/felipenune/SoulsLike | The rare *multiplayer* soulslike course-repo (DevAdict's course) |
| **ALS-Refactored** (Sixze) — https://github.com/Sixze/ALS-Refactored | Network-reliable locomotion framework if you outgrow the template's movement. C++; ALS v4 (BP, free on Fab) is unmaintained. Traversal only — no combat. |
| Soulslike Framework (paid, Fab) — https://www.fab.com/listings/75455ba4-7407-45db-b24e-160712b9586c | Complete single-player soulslike kit — note: **no confirmed multiplayer support**; buying it does not skip this guide's networking work |
| Blueprint sharing — https://blueprintue.com/ | Paste-bin for BP graphs (search "dodge", "lock on", "stamina"…) |

## Books (Blueprint cookbooks)

| Book | Notes |
|---|---|
| *Blueprints Visual Scripting for Unreal Engine 5*, 3rd ed. — Romero & Sewell (Packt) | Best current BP book; code: https://github.com/PacktPublishing/-Blueprints-Visual-Scripting-for-Unreal-Engine-5 |
| *Unreal Engine Blueprints Visual Scripting Projects* — Lauren Ferro (Packt) | Project-based; UE4-era, patterns still valid; code: https://github.com/PacktPublishing/Unreal-Engine-Blueprints-Visual-Scripting-Projects |

## Co-op design references (design, not code)

| Reference | Takeaway used in the guide |
|---|---|
| Elden Ring **Seamless Co-op** mod (LukeYui) — https://www.nexusmods.com/eldenring/mods/510 | The built-for-co-op model: persistent session, respawn-at-grace on death, spectate during boss, everyone rides on; configurable per-player HP scaling |
| Elden Ring vanilla scaling (illusorywall's data-mining) | Boss HP ≈ ×1.6 with one phantom, ×2.3 with two — Ch. 11.3's reference numbers |
| Remnant 2 multiplayer — https://remnant2.wiki.gg/wiki/Multiplayer | Bleed-out/revive design (relic cost, post-revive i-frames patch, damage-drains-bleed-out); 15%/player damage scaling after their balance patch; instanced-to-all loot |
| Lords of the Fallen 2.0 update | Launch host-favored loot was so disliked they patched to 100%/100% — decide loot generosity early |
| Nioh 2 Expeditions | Shared team-life-pool alternative to individual bleed-outs |

---

*A note on link rot: URLs verified July 2026. Epic's dev.epicgames.com slugs are stable; YouTube links less so — search the listed title + author if one dies.*
