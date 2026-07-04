# Chapter 9 — XP, Levels & the Passive Tree

> **Goal of this chapter:** kills feed XP, XP feeds levels, and levels feed exactly two things — passive points and skill unlocks. A hand-authored ~30-node passive tree where every node is a Data Table row of `F_StatMod`s, allocated and respec'd through the same `AC_Stats` source keys that already power items and ailments. By the end, "character build" is a list of Names — which is precisely what [Chapter 12](12-saving-packaging-cpp.md) wants to save.

---

## 9.1 AC_Progression: XP and levels

`AC_Progression` has been an empty shell on `BP_Hero` since [Chapter 1](01-project-setup.md). Fill it in:

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `Level` | int | 1 | capped at 30 for this guide |
| `XP` | float | 0 | progress *within* the current level |
| `PassivePoints` | int | 0 | unspent points; +1 per level |
| `AllocatedNodes` | Name[] | empty | row names into `DT_PassiveNodes` — this array IS the build |
| `OnXPChanged` | Dispatcher | — | payload: XP, XPToNext → HUD XP bar |
| `OnLevelUp` | Dispatcher | — | payload: NewLevel |
| `OnPassivesChanged` | Dispatcher | — | tree UI + stat sheet refresh |

The curve is one line — `XPToNext = 100 × Level^1.5` — gentle enough that early levels land every few packs, steep enough that level 29→30 is a real session. Sanity-check it before trusting it (a `^2.2` typo here ruins pacing for the whole game):

| Current level | XP to next | Total XP from level 1 |
|---|---|---|
| 1 | 100 | 0 |
| 5 | 1,118 | ~1,700 |
| 10 | 3,162 | ~11,100 |
| 15 | 5,809 | ~32,000 |
| 20 | 8,944 | ~67,100 |
| 25 | 12,500 | ~118,800 |
| 29 | 15,617 | ~189,000 total to hit 30 |

XP arrives through the `OnEnemyKilled(EnemyDef, Rarity, Level, Location)` dispatcher on `BP_ARPGGameMode` — the same one [Chapter 7](07-loot-generator.md) uses for drops. Bind once in the GameMode's BeginPlay wiring; the enemy's base XP comes from its `DT_EnemyTypes` row and the rarity multiplier from [Chapter 6](06-enemies-and-hordes.md):

```text
[BP_ARPGGameMode — OnEnemyKilled (EnemyDef, Rarity, Level, Location)]
 → [BP_Hero → AC_Progression → AddXP (EnemyDef.XP × RarityXPMult(Rarity), Level)]

[AC_Progression → AddXP (Amount, MonsterLevel)]
 → [Mult = Clamp(1 − (Abs(Level − MonsterLevel) − 5) × 0.1, 0.1, 1.0)]
      ◄ level-gap penalty: full XP within ±5 levels, −10% per level
      ◄ beyond, floored at 10% — kills farming gray mobs, one line of math
 → [XP += Amount × Mult]
 → [While Loop: XP >= XPToNext AND Level < 30]        ◄ big rare can grant 2 levels
     → [LevelUp]
 → [Call OnXPChanged (XP, XPToNext)]

[AC_Progression → LevelUp]
 → [XP -= XPToNext] ; [Level += 1] ; [PassivePoints += 1]
 → [AC_Stats: Set CurrentLife = GetStat(MaxLife)]      ◄ level-up refills pools —
 → [AC_Stats: Set CurrentMana = GetStat(MaxMana)]        the arcade "ding" reward
 → [Spawn System at Location: NS_LevelUp at actor]     ◄ golden burst; sound in Ch 11
 → [Call OnLevelUp (Level)]
```

The HUD XP bar is a plain ProgressBar in `WBP_HUD` bound to `OnXPChanged` (event-driven, not a Tick binding — same rule as every widget in this guide). `AC_Equipment` already reads `Level` for its `ReqLevel` gate ([Chapter 8](08-inventory-and-equipment.md)); nothing else changes there.

> **Multiplayer note:** in co-op, XP/level live on PlayerState, not a pawn component — see the soulslike guide's [souls chapter](../coop-soulslike-ue5/10-bonfires-death-souls.md) for why. Single-player gets to keep it simple.

## 9.2 No automatic stat growth — on purpose

Notice what `LevelUp` does *not* do: no +2 strength, no +12 life per level. Base stats stay at the Hero row of `DT_StatDefaults` forever — MaxLife 100, MaxMana 50 — and **all** power comes from passives and gear.

> **Design note:** this is a genre fork. Diablo 3 grows your stats automatically every level; Path of Exile gives you almost nothing automatic and makes the tree and items do the work. We side with PoE, for one reason: **legibility of power sources**. When every point of power is a node you clicked or an item you equipped, the player can always answer "why am I strong?" — and *you* can always answer "why is the player strong?" when balancing. Auto-growth is a hidden third contributor that makes both questions mushy, and it quietly devalues the tree ("+8% life node" competes with "+12 life every level for free"). One system fewer, and the two that remain both flow through `AC_Stats` mods. If a chapter is about to hardcode a number on an actor, it's doing it wrong — auto stat growth is exactly that number.

## 9.3 The tree as data: DT_PassiveNodes

The passive tree is a Data Table, `DT_PassiveNodes`, rows of `F_PassiveNode`:

| Field | Type | Purpose |
|---|---|---|
| `Id` | Name | matches the row name; used in the `Passive_<Id>` source key |
| `Name` | Text | display name |
| `Icon` | Texture2D (soft) | node icon |
| `GridPos` | IntPoint | position on the tree grid — UI multiplies by a spacing constant |
| `Prereqs` | Name[] | allocatable when empty, or when **any** listed node is allocated |
| `Mods` | F_StatMod[] | the payload — same struct as items, ailments, monster mods |
| `bKeystone` | bool | drawn bigger; exactly one per branch, at the end |

Author ~30 nodes in three branches radiating from the hero's conceptual start at grid **(5,5)**: **Warrior** (life/armour/melee, north), **Elementalist** (elemental damage/cast, east), **Ranger** (projectiles/speed/crit, west). It's a Tetris of IntPoints — sketch it on paper first, then type. Here's the full Warrior branch plus the entries and keystones of the other two; fill the remaining ~8 nodes per branch in the same pattern:

| Row (Id) | Name | GridPos | Prereqs | Mods | Keystone |
|---|---|---|---|---|---|
| `War_01` | Thick Skin | (5,4) | — | Flat +15 MaxLife | |
| `War_02` | Plated | (5,3) | War_01 | Inc +20% Armour | |
| `War_03` | Heavy Blows | (4,3) | War_02 | Inc +12% DamagePhys | |
| `War_04` | Bull's Heart | (6,3) | War_02 | Inc +8% MaxLife | |
| `War_05` | Crusher | (4,2) | War_03 | Flat +5 DamagePhys, Inc +12% DamagePhys | |
| `War_06` | Stone Wall | (6,2) | War_04 | Inc +25% Armour, Flat +10 MaxLife | |
| `War_07` | Battle Rhythm | (5,2) | War_05, War_06 | Inc +8% AttackSpeed | |
| `War_08` | Bloodletting | (5,1) | War_07 | Inc +10% DamagePhys, Flat +2 LifeRegen | |
| `War_KS` | **Juggernaut** | (5,0) | War_08 | More +60% Armour, **More −15% MoveSpeed** | ✔ |
| `Ele_01` | Kindling | (6,5) | — | Inc +12% DamageFire | |
| `Ele_02` | Conduit | (7,5) | Ele_01 | Inc +12% DamageCold, Inc +12% DamageLightning | |
| `Ele_KS` | **Glass Cannon** | (9,5) | Ele_08 | More +40% Damage (all four types), **More −30% MaxLife** | ✔ |
| `Rng_01` | Fleet | (4,5) | — | Inc +6% MoveSpeed | |
| `Rng_02` | Keen Eye | (3,5) | Rng_01 | Inc +30% CritChance | |
| `Rng_KS` | **Volley** | (1,5) | Rng_08 | Flat +2 ProjectileCount, **More −25% Damage (all types)** | ✔ |

Two things to notice. First, keystones use `More` and have a **real cost** — Glass Cannon's −30% life is not flavor text, it's `(E_Stat: MaxLife, E_ModOp: More, −30)` going through the [Chapter 3](03-stats-and-modifiers.md) formula like everything else ("all damage" is simply four `F_StatMod` entries, one per Damage* stat). Volley is the Lesser-Multiple-Projectiles trade: two extra `BP_SkillProjectile`s per cast ([Chapter 5](05-skills-as-data.md) reads the ProjectileCount stat at spawn) but every one hits like a wet towel unless you invest back into damage. Juggernaut makes you an anvil in the genre where MoveSpeed is king. Second, at 1 point per level you'll have 29 points against ~30 nodes — you **cannot** have everything. That tension is the whole game.

> **Pitfall:** `Inc +30% CritChance` on Keen Eye is *increased*, so it turns the hero's 5% base into 6.5% — not 35%. If a crit node feels like it does nothing, you probably wanted a Flat mod (`+2` to the 5% base) instead. Know which one you're typing; the tree is where Flat vs Increased confusion goes to breed.

## 9.4 Allocate and respec — the Ch 3 payoff, again

Allocation is an adjacency check plus one call into `AC_Stats`, with the source key `Passive_<Id>`:

```text
[WBP_PassiveNode — OnClicked (NodeId)]
 → [AC_Progression → TryAllocate (NodeId)]

[AC_Progression → TryAllocate (NodeId)]
 → [Branch: PassivePoints > 0]                          false → return
 → [Branch: AllocatedNodes does NOT contain NodeId]     false → return
 → [Row = Get Data Table Row (DT_PassiveNodes, NodeId)]
 → [Branch: Row.Prereqs is empty OR any Prereq ∈ AllocatedNodes]   ◄ adjacency
 → [AllocatedNodes: Add NodeId] ; [PassivePoints -= 1]
 → [AC_Stats → AddMods (Source = "Passive_" + NodeId, Row.Mods)]
      ◄ that's it. The dirty-flag cache recomputes affected stats once,
      ◄ MaxLife changes preserve your life percentage — all Ch 3 machinery.
 → [Call OnPassivesChanged]
```

Respec is full-tree only (per-node refunds invite order-dependency bugs with prereqs — a chain's middle node refunded strands the tip). Costed in gold from [Chapter 7](07-loot-generator.md)'s drops, cheap enough that experimenting is encouraged:

```text
[AC_Progression → RespecAll]
 → [Cost = 50 × Length(AllocatedNodes)]
 → [Branch: AC_Inventory → TrySpendGold (Cost)]          false → "Not enough gold"
 → [For Each AllocatedNodes as Id]
     → [AC_Stats → RemoveModsFromSource ("Passive_" + Id)]
 → [PassivePoints += Length(AllocatedNodes)] ; [Clear AllocatedNodes]
 → [Call OnPassivesChanged]
```

This is the third time the Source-key decision from Chapter 3 has made a whole feature trivial — equip/unequip ([Chapter 8](08-inventory-and-equipment.md)), ailments ([Chapter 4](04-damage-and-ailments.md)), and now respec. `AllocatedNodes` (a Name array) plus the DT is the entire persistent state; on load, Chapter 12 just replays `TryAllocate`-minus-the-checks per saved name.

## 9.5 WBP_PassiveTree: a pragmatic canvas

Don't build a PoE constellation renderer. `WBP_PassiveTree` (opened with `IA_PassiveTree`, P) is:

- An outer **Overlay** → a **Canvas Panel** holding one `WBP_PassiveNode` per DT row, spawned in `Construct`: `For Each Get Data Table Row Names` → `Create Widget` → `Add Child to Canvas` → set slot position = `GridPos × 140` (the spacing constant). Node states by border color: allocated gold, allocatable white, locked gray at 40% opacity; keystones render at 1.5× size with the mods as tooltip text.
- **Connection lines**, two acceptable routes — pick one and move on: (a) *border trick*: for each Prereq pair, add a plain `Image` widget stretched between the two nodes' canvas positions (length = distance, angle = `Atan2` of the delta, Render Transform rotation) — dumb, works; (b) *OnPaint*: override `OnPaint` on the canvas's parent and call `Draw Lines` between node centers — cleaner, one function. Color the line gold when both ends are allocated.
- **Panning**: `OnMouseButtonDown` (RMB) capture the mouse, in `OnMouseMove` add the cursor delta to the Canvas Panel's Render Translation, release on button-up. No zoom needed at 30 nodes.
- Refresh node states on `OnPassivesChanged` — never on Tick.
- Header shows `PassivePoints` remaining and the Respec button with its gold cost.

## 9.6 Skill unlocks by level

Levels gate skills, so the loadout grows with the character. Add one column to `DT_Skills` from Chapter 5 — `ReqLevel (int)` — and stagger the six shipped skills:

| Skill | ReqLevel |
|---|---|
| BasicSlash | 1 |
| Fireball | 2 |
| FrostNova | 4 |
| LightningBolt | 6 |
| GroundSlam | 9 |
| WarCry | 12 |

`WBP_SkillPicker` handles slot assignment: right-click any `WBP_SkillBar` slot → a popup lists every `DT_Skills` row, unlocked ones (ReqLevel ≤ `AC_Progression.Level`) clickable, locked ones grayed with "Unlocks at level N" → clicking writes the skill's row name into `AC_SkillCaster.Loadout[Slot]`. No other validation needed — `TryCast` already resolves whatever name sits in the slot. Bind a refresh to `OnLevelUp` so a newly unlocked skill un-grays while the picker is open.

> **Pitfall:** gate assignment, not casting. If you also check ReqLevel inside `TryCast`, a save from a future version or a debug loadout silently dead-buttons a slot with no UI explanation. One gate, at the picker.

## 9.7 Test before moving on

In `L_Dev_Gym`, with the [Chapter 3](03-stats-and-modifiers.md) stat sheet (C) open where noted:

| Test | Expected |
|---|---|
| Kill an at-level Normal mob | XP bar advances by the `DT_EnemyTypes` XP value; Rare of same type gives more (rarity mult) |
| Kill a mob 10+ levels below you | ~10% of its XP (penalty floor) |
| Reach 100 XP at level 1 | Level 2: NS_LevelUp burst, life/mana snap to full, PassivePoints = 1 |
| Allocate `War_01` Thick Skin | Stat sheet MaxLife 100 → 115 |
| Click `War_03` with `War_02` unallocated | Refused — no point spent, no mods applied |
| Allocate Glass Cannon | Sheet: all Damage* up 40% more; MaxLife drops 30% and CurrentLife keeps its percentage |
| Respec with enough gold | Gold −(50 × nodes), sheet back to `DT_StatDefaults` baseline, all points refunded |
| Respec with 0 gold | Refused, allocations untouched |
| Right-click skill bar slot at level 3 | Picker shows BasicSlash/Fireball selectable; FrostNova+ grayed with unlock levels |
| Ding level 4 with picker open | FrostNova un-grays without reopening |

---

**Next:** [Chapter 10 — Zones, Waypoints & Procedural Maps](10-zones-and-maps.md)
