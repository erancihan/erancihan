# Chapter 13 — Co-op: Taking the ARPG Online

> **Goal of this chapter:** 2–4 player drop-in co-op on a listen server — shared zones, scaled monsters, per-player loot, a party HUD — built by retrofitting every system from Chapters 2–11 onto the authority model. The generic networking theory is *not* re-taught here: the [soulslike guide](../coop-soulslike-ue5/) already documents it, and this chapter leans on that documentation up to exactly the point where the ARPG problems begin.

---

## 13.1 Read the other guide's docs first — then come back

Two chapters of the sibling guide are hard prerequisites, and this chapter assumes their vocabulary without re-explaining it:

- [**Multiplayer Foundations**](../coop-soulslike-ue5/02-multiplayer-foundations.md) — authority, net roles, RPC direction and ownership, RepNotify, the *state vs events* rule. One hour of reading; every decision below is an application of it.
- [**Sessions: Hosting & Joining**](../coop-soulslike-ue5/03-sessions-and-joining.md) — main menu, Create/Find/Join, LAN → Steam via Advanced Sessions. It applies to this game **verbatim**; there is nothing ARPG-specific about a session browser, so this guide adds nothing to it. Build it exactly as documented there.

That's the borrowed part. What that guide *can't* give you is everything past this point: a stat pipeline whose numbers live on the server, skills that validate remotely but feel instant, loot that rolls per-player, and procedural zones that exist identically on four machines without replicating a single wall.

> **The honest paragraph.** Chapter 12 warned that bolting replication on afterward is a rewrite, not a patch — and that's still true *of code*. But this guide has been quietly leaving `> Multiplayer note:` breadcrumbs since Chapter 2, and the architecture they annotate (one damage entry point, source-keyed mods, decisions-not-results saves, seeded generation) was chosen so the rewrite would be **mechanical, not structural**. This chapter is those notes, executed. Budget two to three chapters' worth of time, and test with two clients from the first hour ([Play settings: Number of Players = 2, Net Mode = Play as Listen Server] — plus `p.NetEmulation.PktLag 80` once things work).

## 13.2 The retrofit map

Every system you've built, and what happens to it. **S** = lives on the server, **O** = owner-only, **C** = cosmetic/local, **R** = replicated state:

| System (chapter) | Verdict | The change |
|---|---|---|
| Click-move / WASD (2) | C | CharacterMovement replicates itself; nothing to do |
| Dash i-frames (2) | S | dash becomes a Server RPC setting `bDashing` server-side — the [soulslike dodge](../coop-soulslike-ue5/04-character-locomotion.md) pattern, minus root motion |
| `AC_Stats` mods & computation (3) | S | mods applied/removed on the server only; `GetStat` truth is the server's (13.3) |
| `CurrentLife`, `CurrentMana`, `bIsDead` (3) | R | RepNotify — drives every HP bar and death visual on every screen |
| `ReceiveDamage` pipeline (4) | S | Authority guard at the top; already single-entry, so this is one node (13.4) |
| Ailments (4) | S + R | timed mods are server-side; a small replicated `ActiveStatusTags` array drives status VFX |
| `TryCast` (5) | S | split into client request + server validation (13.4) |
| Executors & projectiles (5) | S | spawned by the server only; replicated actors (13.4) |
| Enemy AI, BT, dormancy (6) | S | Behavior Trees only run on the server anyway — mostly free (13.5) |
| Monster scaling (6) | S | one more mod source: `Scaling_PlayerCount` (13.5) |
| `BFL_LootGen` rolls & drops (7) | S | server rolls, per player — the instanced-loot decision (13.6) |
| `AC_Inventory` / `AC_Equipment` (8) | S + O | every mutation is a Server RPC; contents replicate owner-only; `Equipped` replicates to everyone for visuals (13.7) |
| XP & passives (9) | S | server awards XP; allocation is a validated Server RPC |
| Zone travel & proc-gen (10) | S + R | `ServerTravel` instead of `Open Level`; the **seed** replicates, the level does not (13.8) |
| Damage numbers, hitstop, shake (11) | C | strictly local, exactly as [Chapter 11](11-arcade-layer.md)'s note promised |
| Saves (12) | O | each client saves its own hero; join = bring-your-hero (13.9) |

If a row surprises you, reread the matching chapter's multiplayer note — each one predicted its row.

## 13.3 Stats over the wire: replicate decisions, not results

Set `AC_Stats` → Component Replicates = ON. Then split its data by who needs it:

| Data | Replication | Why |
|---|---|---|
| `BaseStats`, `ActiveMods`, the cache | **none** | server-only; clients never compute gameplay outcomes |
| `CurrentLife`, `CurrentMana`, `bIsDead` | RepNotify | pools are the UI-visible *state*; OnRep drives bars and death on all machines |
| `FinalStatsSnapshot` (Map<E_Stat, float>) | RepNotify, **owner-only** | the stat sheet and tooltips need your final numbers; rebuilt server-side whenever mods change (they change rarely — on equip, allocate, ailment), so it's cheap |

```text
Blueprint: AC_Stats — server side, end of AddMods / RemoveModsFromSource
────────────────────────────────────────────────────────────────────────
[Authority] → [RebuildCache]
 → [Set FinalStatsSnapshot (w/Notify) = map of GetStat() for all E_Stat]
      ◄ Replication Condition = Owner Only: your ring roll is not
        the other player's bandwidth problem
```

This is the *state* answer. The purist alternative — replicate only the decisions (equipment, passives, statuses, all already replicated below) and have each client mirror the mod math locally — costs zero extra bandwidth and is where you'd land in GAS. The snapshot is fewer moving parts; take it, note the upgrade path, move on.

> **Pitfall:** the listen-server host is *also* a client. `Set w/Notify` fires OnRep locally on the host, remote clients get it via replication — same rule the soulslike guide hammers in its Chapter 2. If your host's HP bar updates and clients' don't, you wrote `Set` without Notify.

## 13.4 Damage and skills: request locally, resolve on the server

`ReceiveDamage` gains one node: `[Branch: Has Authority]` → false: return. Everything Chapter 4 built — armour, resists, crit-after-mitigation, ailment rolls, `HandleDeath` — now runs exactly once, on the machine that owns the truth. `OnDamaged` still fires (server-side); Chapter 11's damage numbers move to a `Client_ShowDamageNumber` RPC sent to the *instigating* player only, so you see your own hits and not your friend's spam.

`TryCast` splits in half. The design goal: **casting must feel instant on your screen** even at 80 ms ping, and the server must still be the only machine that spends mana, starts cooldowns, and spawns executors:

```text
Blueprint: AC_SkillCaster (on BP_Hero)
──────────────────────────────────────
[IA_Skill_Q Triggered]                        ◄ CLIENT (owning)
 → [Soft checks: bCasting? cooldown UI says ready? mana bar says enough?]
      ◄ cosmetic pre-check only — prevents obviously-doomed requests
 → [Play Anim Montage (local)]                ◄ instant feel; this is the prediction
 → [Server_TryCast (Slot, CursorWorldLoc)]    ◄ Run on Server, Reliable

[Server_TryCast (Slot, TargetLoc)]            ◄ SERVER — the REAL TryCast from Ch 5
 → [Full checks: mana, cooldown, bCasting — server values]
     fail → [Client_CancelCast]               ◄ stop the local montage; rare, only
 → [ModifyMana (−Cost)] ; [StartCooldown]       on desync/cheat — fizzle, don't crash
 → [Clamp TargetLoc to skill Range from actor] ◄ never trust a client vector
 → [Multicast_PlayCastMontage (SkillId)]      ◄ Unreliable — remote players see the swing
 → [AN_SkillExecute → spawn Executor]         ◄ server-only; SetReplicates(true)
```

Executors and `BP_SkillProjectile` spawn with **Replicates = ON**: the server simulates movement and overlap, clients see a replicated actor. `BuildDamagePacket`, the once-per-use crit roll, `ApplyStatus` — all untouched, all server-side, because Chapter 5 already routed them through the component instead of scattering them across input events.

> **Design note — the scale limit:** replicating 200 live projectiles is fine on LAN and increasingly rude over the internet. The production pattern (PoE, D3) is: server spawns *invisible* authoritative projectiles, each client spawns pooled **cosmetic** ones from the `Multicast_PlayCastMontage` data and lets the server's hit results correct them. That's a polish-pass rewrite of `BP_Exec_Projectile` only — the executor boundary was drawn there on purpose. Ship replicated actors first; measure; then earn the fancy version.

## 13.5 Enemies: the server's private army

Behavior Trees, `AIC_Enemy`, perception-free dormancy — none of it ever ran anywhere but the authority, so Chapter 6 needs three touches:

1. **Spawning:** `BP_PackSpawner` gates on `Has Authority`; spawned enemies replicate (Character subclasses already do). Dormancy wake checks now test distance to **every** player pawn (`Get All Actors Of Class BP_Hero` at wake-check cadence, or the spawner's overlap simply stays — any player's arrival wakes the pack for everyone).
2. **Scaling:** on wake (or spawn), one line buys the whole co-op difficulty curve — the Chapter 3 machinery again:

```text
[AC_Stats → AddMods (Source = "Scaling_PlayerCount",
    [MaxLife: More +60% × (PlayerCount − 1)])]     ◄ D3-flavored: tanky, not spiky.
                                                     Damage scales much gentler (+15%/player)
                                                     or not at all — deaths should feel earned
```

3. **XP:** the server's `OnEnemyKilled` awards **full XP to every player within 2500 uu** — no split, no leech math. Arcade co-op punishes nothing about playing together; the soulslike guide's careful scaling debates (its [Chapter 11](../coop-soulslike-ue5/11-coop-polish.md)) exist because death there costs something. Here, generosity *is* the tuning.

Status VFX (ignite flames, chill tint) key off the replicated `ActiveStatusTags` from 13.2 in each mob's OnRep — cosmetics from state, correct for late joiners for free.

## 13.6 Loot: instanced per player, rolled on the server

The genre's oldest argument, settled by decree: **instanced loot** (D3/modern PoE default — each player sees their own drops) over free-for-all (classic PoE cutthroat). FFA in a living-room co-op game turns friends into ferrets; if you want that spice, it's a one-boolean design toggle at the end of this section anyway.

Server-side, `RollDrops` loops once **per connected player**, each roll pulled from that player's own `RandomStream` (seeded from `RunSeed` + PlayerId — determinism per player, Chapter 7's stream design stretching to fit). Each spawned `BP_GroundItem` carries its claim:

| `BP_GroundItem` addition | Type | Replication |
|---|---|---|
| `OwnerPlayerState` | PlayerState ref | Replicated (initial-only) |
| `Item` (`F_ItemInstance`) | struct | Replicated — plain data replicates as happily as it serializes |

```text
[BP_GroundItem — OnRep_OwnerPlayerState / BeginPlay (client)]
 → [Branch: OwnerPlayerState == my PlayerState]
     false → [Set Actor Hidden In Game] ; [disable label + highlight]
      ◄ your friend's rare does not exist on your screen — no beam, no label, no envy

[WBP_ItemLabel click]                          ◄ CLIENT
 → [Server_RequestPickup (GroundItem)]         ◄ Run on Server, Reliable
[Server_RequestPickup]
 → [Branch: requester == OwnerPlayerState AND within 300 uu]   ◄ validate claim + reach
 → [requester's AC_Inventory → Add (Item)] → [Destroy GroundItem]
```

Gold and potion charges: award to **all** players in radius on pickup by anyone (shared prosperity, zero contention). And the FFA toggle, if you must: leave `OwnerPlayerState` null and skip the visibility filter — the validation line already handles the race when two friends click the same sword.

## 13.7 Inventory & equipment: the server holds the bags

Chapter 8's rule was "one mutation API on the components." It becomes: **every mutation is a Server RPC, and clients send references, never items.** `Server_Equip(ItemGuid)`, `Server_DropItem(ItemGuid)`, `Server_MoveItem(Guid, ToIndex)` — the server finds the real `F_ItemInstance` by Guid in *its* copy of your inventory, validates (slot legal, ReqLevel met — same checks as Chapter 8, now load-bearing), executes, and the results replicate back:

- `AC_Inventory.Items` + `Gold`: replicated **owner-only** — 40 structs of plain data, and nobody else's business.
- `AC_Equipment.Equipped`: replicated to **everyone**, RepNotify → other clients update your weapon mesh and armor visuals. Your build should be legible on your friend's screen; that's half the fun of loot.

> **Pitfall — the dupe classic:** any RPC that accepts a whole `F_ItemInstance` from a client is an item printer (send the struct, drop it, send it again). Guid-referencing kills the whole bug class in one design stroke: clients can only point at items the server already believes they own. This matters even among friends — not because they'll cheat, but because *lag + double-click* produces the same packet sequence cheating would.

Trading between players: drop it on the ground (`Server_DropItem` spawns an un-owned `BP_GroundItem` visible to all). A trade window is a week of UI for something proximity already solves in co-op.

## 13.8 Shared zones: replicate the seed, not the world

`Open Level` is single-player teleportation — it leaves your friends behind. Travel becomes:

```text
[BP_Waypoint interaction] → [Server_RequestTravel (ZoneName)]
 → [GameMode: roll ZoneSeed from RunSeed stream]
 → [GameState → Set ZoneSeed, ZoneName (Replicated)]
 → [Server Travel (ZoneName)]        ◄ with bUseSeamlessTravel = true in GameMode —
                                       brings every client along, keeps PlayerStates
```

And here is the chapter's best payoff: **the procedural zone replicates as a single int.** Every machine runs Chapter 10's `BP_ZoneGenerator` locally from the replicated `ZoneSeed`; because every roll flows through the seeded `RandomStream` (Chapter 7's discipline) and Level Instance stitching is deterministic, four machines build the identical dungeon independently. No level geometry replication, no streaming coordination — the entire dungeon costs 4 bytes of bandwidth. (Enemies still spawn server-side per 13.5; the *architecture* is what's deterministic, not the fights.)

Late joiners: allow drop-in **in town only** — the join flow reads `ZoneSeed` from GameState, but mid-dungeon join also needs mid-fight actor state, and gating joins to town deletes that problem for a party-size cost of nothing. Party HUD: `Level` and `LifePercent` go on **PlayerState** (Chapter 9's note called it) — the party widget binds per PlayerState exactly like the soulslike guide's [party HUD](../coop-soulslike-ue5/11-coop-polish.md), minus the bleed-out machinery. Player death in co-op: dead-until-town-portal or a 5-second respawn-in-town — pick generous, it's arcade.

## 13.9 Saves: bring your own hero

Chapter 12's save design survives almost untouched because it never saved the world — only the hero, and the hero is per-player:

- **Each client saves its own character locally** (`SaveCharacter` unchanged — it reads the client's replicated owner-only inventory and its own progression). Trigger on town-enter and quit, as before.
- **The host's save additionally owns the run**: `RunSeed`, `UnlockedDifficultyTier`, waypoints. Guests' unlocks merge into their own files (generous: visiting tier 10 unlocks tier 10).
- **Joining**: the client sends its hero snapshot (level, passives, equipment, loadout — the same fields `SG_ARPG` stores) in a join RPC; the server *replays it through the same validated paths* (`Allocate`, `Equip` — Chapter 12's replay-the-decisions loader, now doubling as the join handshake) and sanity-clamps anything absurd. Among friends this is integrity-checking, not anti-cheat; a public game would need server-side characters, which is a different guide.

## 13.10 Test before moving on

Two clients minimum, `p.NetEmulation.PktLag 80` for the feel tests:

| Test | Expected |
|---|---|
| Client 2 casts Fireball at 80 ms lag | montage starts instantly on their screen; damage/ignite resolve ~one RTT later; no double mana spend |
| Spam Q with 3 mana | local pre-check fizzles; server never spends; no cooldown started |
| Client 2 equips a rolled rare | their stat sheet updates (owner snapshot); host sees the new weapon mesh; DPS change verifiable on the training dummy |
| Both players hit one rare monster | one death, one `OnEnemyKilled`; both within radius gain full XP |
| Rare monster killed with 2 players | each player sees only their own drops; labels/beams differ per screen |
| Both click the same un-owned (FFA-toggled) item | exactly one inventory receives it |
| 2-player pack vs 1-player pack | pack visibly tankier with 2 (`Scaling_PlayerCount` in the stat sheet of a debug-selected mob) |
| Waypoint travel to a generated zone | both clients load the *identical* dungeon layout; navigation works on both |
| Guest quits mid-session, rejoins in town | their hero returns exactly as saved on *their* machine; run seed/tier unchanged on host |
| Host-side check: client sends a forged `Server_Equip` for an unowned Guid | server finds no item, ignores it — nothing equips, nothing crashes |

---

*Sessions, Steam setup, and every replication concept this chapter leaned on: the [soulslike guide's documentation](../coop-soulslike-ue5/) — Chapters 2, 3, and 11 in particular. The C++/GAS migration in [Chapter 12](12-saving-packaging-cpp.md) is also the multiplayer endgame: GAS's prediction keys and replicated GameplayEffects are the engine-grade version of everything hand-built above.*
