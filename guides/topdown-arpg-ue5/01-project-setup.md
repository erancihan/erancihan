# Chapter 1 — Project Setup & the Top-Down Frame

> **Goal of this chapter:** a UE5 project built on the Top Down template, with the framework classes, folder scheme, input actions, test maps, and source control in place — so every later chapter can say "open `BP_Hero`, add logic" instead of "first, create eleven files."

---

## 1.1 Why the Top Down template

Create the project from **Games → Top Down**, not Third Person, not Blank. The template ships with exactly the three things a Diablo-like needs on day one:

1. **The camera.** A `SpringArm` + `Camera` already detached from character rotation, looking down at roughly the genre-standard angle. [Chapter 2](02-movement-and-input.md) tunes it; you don't have to build it.
2. **Click-to-move.** A working `PlayerController` that projects the cursor into the world and path-follows to it. Even though this guide's default control scheme ends up being WASD, click-move stays as a player option — and the template's version is a correct reference implementation of cursor projection, which is the single most load-bearing input primitive in the whole game (every skill in [Chapter 5](05-skills-as-data.md) aims with it).
3. **A NavMesh in the level.** Click-move needs pathfinding, so the template map already contains a `NavMeshBoundsVolume`. Your enemies in [Chapter 6](06-enemies-and-hordes.md) need NavMesh too. It's already there, already building.

Starting from Blank means rebuilding all three from documentation. Starting from Third Person means fighting a camera that wants to sit behind the character. Take the free stuff.

> **Design note:** the template character comes with `CharacterMovementComponent` — keep it, even for a top-down game where you'll never jump. It gives you acceleration/friction tuning, `MaxWalkSpeed` (which [Chapter 3](03-stats-and-modifiers.md) drives from the MoveSpeed stat), NavMesh path-following, and the avoidance settings hordes need. Never build an ARPG hero on a bare Pawn.

## 1.2 Create the project

1. Install **Unreal Engine 5.4+** (this guide is written against 5.4–5.6; everything used is core 5.x).
2. New project: **Games → Top Down**, **Blueprint**, Target Platform **Desktop**, Quality **Maximum**, **Starter Content OFF**.
3. Name it something short without spaces — the project name barely matters because all content lives under one folder you're about to create.

Then two settings before anything else:

| Setting | Location | Value | Why |
|---|---|---|---|
| Editor Startup Map / Game Default Map | Project Settings → Maps & Modes | `L_Dev_Gym` (create in 1.6) | you'll live in the gym for 11 chapters |
| Auto Save | Editor Preferences → Loading & Saving | prompt, don't silently save | so half-finished graphs don't get committed |

## 1.3 Folder scheme & naming

Create this under `Content/` (i.e. `/Game/` in asset paths) now. Every path in the guide assumes it:

```
Content/
└── ARPG/
    ├── Core/        # GameMode, GameInstance, PlayerController, components, interfaces
    ├── Hero/        # BP_Hero, ABP, montages, input assets
    ├── Enemies/     # BP_EnemyBase, AI, per-archetype folders (Ch 6)
    ├── Skills/      # executors, projectiles, DT_Skills (Ch 5)
    ├── Items/       # bases, affixes, ground items (Ch 7–8)
    ├── UI/          # every WBP_
    ├── World/       # maps, spawners, waypoints, zone actors
    ├── FX/          # Niagara, materials for flashes/dissolves
    └── Data/        # Data Tables, curve tables, enums, structs
```

Move (right-click → Move, then Fix Up Redirectors on the old folder) the template's character and controller assets into `ARPG/Hero/` and `ARPG/Core/` as you rename them in 1.4. Don't leave anything you actually use inside the template's `TopDown/` folder.

**Naming convention** (used everywhere; memorize once):

| Prefix | Asset type | Prefix | Asset type |
|---|---|---|---|
| `BP_` | Blueprint actor/class | `DT_` | Data Table |
| `AC_` | Actor Component | `F_` / `E_` | Struct / Enum |
| `WBP_` | Widget Blueprint | `IA_` / `IMC_` | Input Action / Mapping Context |
| `AM_` / `ANS_` | Montage / Anim Notify State | `NS_` | Niagara System |
| `L_` | Level | `BFL_` / `BPI_` | Function Library / Interface |
| `M_` / `MI_` | Material / Material Instance | `AIC_` / `BT_` | AI Controller / Behavior Tree |

## 1.4 Framework classes — created empty, wired now

Create these in `ARPG/Core/` (parent class in parentheses), plus the hero in `ARPG/Hero/`. They stay almost empty this chapter — the point is that every later chapter *attaches logic to existing files* instead of creating them, so cross-references never dangle.

1. `BP_ARPGGameInstance` (**GameInstance**) — survives level travel; will hold the run seed and cross-level hero data ([Chapter 7](07-loot-generator.md) seeds its `RandomStream` here, [Chapter 10](10-zones-and-maps.md) carries the build between zones).
2. `BP_ARPGGameMode` (**GameModeBase**) — spawn rules and, later, the `OnEnemyKilled` dispatcher that loot ([Chapter 7](07-loot-generator.md)) and XP ([Chapter 9](09-progression-and-passives.md)) subscribe to.
3. `BP_ARPGPlayerController` (**duplicate the template's TopDown controller**, rename, move to `Core/`) — keeps click-move working today; [Chapter 2](02-movement-and-input.md) rebuilds its input handling and adds `GetCursorWorldLocation()`.
4. `BP_Hero` (**duplicate the template's TopDown character**, rename, move to `Hero/`) — the player character.
5. `BP_EnemyBase` (**Character**) — empty stub; [Chapter 4](04-damage-and-ailments.md) gives it death handling, [Chapter 6](06-enemies-and-hordes.md) everything else.

Now the component shells, in `ARPG/Core/` (parent: **ActorComponent**), each containing nothing but a comment saying which chapter fills it:

| Component | Owner | Filled in |
|---|---|---|
| `AC_Stats` | `BP_Hero`, `BP_EnemyBase` | [Chapter 3](03-stats-and-modifiers.md) — THE modifier pipeline |
| `AC_SkillCaster` | `BP_Hero`, `BP_EnemyBase` | [Chapter 5](05-skills-as-data.md) |
| `AC_StatusEffects` | `BP_Hero`, `BP_EnemyBase` | [Chapter 4](04-damage-and-ailments.md) |
| `AC_Inventory` | `BP_Hero` | [Chapter 8](08-inventory-and-equipment.md) |
| `AC_Equipment` | `BP_Hero` | [Chapter 8](08-inventory-and-equipment.md) |
| `AC_Progression` | `BP_Hero` | [Chapter 9](09-progression-and-passives.md) |

Add all six to `BP_Hero` and the first three to `BP_EnemyBase` (Add Component → search by name). That component list *is* the architecture: the hero Blueprint itself will stay thin, because — the guide's One Rule — **content is data; Blueprints are executors**, and every number will flow through `AC_Stats`. If a later chapter tempts you to type a damage value directly into an actor, it's doing it wrong.

Wire everything up:

- **Project Settings → Maps & Modes:** Default GameMode = `BP_ARPGGameMode`, Game Instance Class = `BP_ARPGGameInstance`.
- **`BP_ARPGGameMode` Class Defaults:** Default Pawn Class = `BP_Hero`, Player Controller Class = `BP_ARPGPlayerController`.
- In each map's **World Settings**, leave GameMode Override empty so the project default applies.

> **Multiplayer note:** no GameState, no PlayerState, no replication flags — Chapters 1–12 build the game single-player, and the framework is deliberately this small. [Chapter 13](13-coop-multiplayer.md) retrofits co-op onto exactly this layer, leaning on the [co-op soulslike guide](../coop-soulslike-ue5/) Chapters 1–3 for the fundamentals.

## 1.5 Enhanced Input: the full action set, day one

Create `IMC_Default` in `ARPG/Hero/` plus one Input Action per row below, and add `IMC_Default` (priority 0) in `BP_ARPGPlayerController` BeginPlay via `Add Mapping Context`. Creating all of them now means later chapters bind events, never assets — and you'll never ship a keybinding conflict you didn't design on purpose.

| Action | Value type | Binding in IMC_Default | Consumed by |
|---|---|---|---|
| `IA_Move` | Axis2D | W/A/S/D (with Swizzle + Negate modifiers) | Ch 2 — WASD scheme |
| `IA_MoveClick` | Digital | Left Mouse Button | Ch 2 — click-to-move scheme |
| `IA_Skill_LMB` | Digital | Left Mouse Button | Ch 5 |
| `IA_Skill_RMB` | Digital | Right Mouse Button | Ch 5 |
| `IA_Skill_Q` / `IA_Skill_W` / `IA_Skill_E` / `IA_Skill_R` | Digital | Q / W / E / R | Ch 5 |
| `IA_Dash` | Digital | Space Bar | Ch 2 |
| `IA_Potion` | Digital | 1 | Ch 7/8 |
| `IA_Inventory` | Digital | I *and* Tab | Ch 8 |
| `IA_PassiveTree` | Digital | P | Ch 9 |

> **Pitfall:** Left Mouse is deliberately double-booked (`IA_MoveClick` and `IA_Skill_LMB`), and W is both movement and a skill key. That's not a mistake — it's the genre's actual conflict: click-move players attack with LMB-on-enemy, WASD players move with W and attack with LMB. [Chapter 2](02-movement-and-input.md) resolves it per control scheme; if you "fix" it now by rebinding, you'll fight Chapter 2. Also note `IA_Skill_W` only *fires* in the click-move scheme — in WASD mode Chapter 2 leaves that slot for the skill bar UI or a rebind.

Smoke-test the plumbing with a throwaway graph in `BP_ARPGPlayerController` (delete it at the end of the chapter):

```text
[IA_Dash Triggered]
 → [Print String ("dash pressed")]     ◄ proves IMC is applied & actions reach the PC
[IA_Move Triggered]
 → [Print String (Action Value X/Y)]   ◄ proves the Axis2D swizzle/negate is right: W = +Y
```

## 1.6 The map plan

Three levels in `ARPG/World/Maps/`, created now even though two stay nearly empty:

| Level | What it is | Built out in |
|---|---|---|
| `L_Dev_Gym` | A big flat graybox floor, a `NavMeshBoundsVolume` covering all of it, a `Player Start`. **Every chapter's tests run here.** | now |
| `L_Town` | The safe hub: waypoint, vendors later | [Chapter 10](10-zones-and-maps.md) |
| `L_Zone_Ruins` | The first real combat zone (monster level 1–5) | [Chapter 10](10-zones-and-maps.md) |

Build `L_Dev_Gym` by duplicating the template map and stripping it to floor + NavMesh + Player Start (keep a directional light + skylight so you can see). Make the floor big — 100 m × 100 m — because [Chapter 6](06-enemies-and-hordes.md) stress-tests 60 mobs in it. Press `P` in the viewport: the floor should glow green (NavMesh built). If it doesn't, your `NavMeshBoundsVolume` isn't enclosing the floor.

> **Design note:** a dedicated gym level is not busywork. Testing loot drops inside your half-decorated town means every test fights lighting, geometry, and whatever you broke yesterday. The gym isolates the system under test — it's the single-player equivalent of a unit test harness, and it's why every chapter ends with a table of gym checks.

## 1.7 Source control (do not skip)

Binary `.uasset` files do not merge. Ever. One bad overwrite and yesterday's you has destroyed today's work.

- **Git + Git LFS**: `git init`, `git lfs install`, `git lfs track "*.uasset" "*.umap"`, commit the `.gitattributes`. If you'd rather have file locking and no LFS quota anxiety, Diversion or Perforce are the usual upgrades — for a solo Blueprint project, Git LFS is fine.
- `.gitignore` at minimum:

```gitignore
Binaries/
DerivedDataCache/
Intermediate/
Saved/
.vscode/
.idea/
*.sln
```

- Commit after every working feature, and write what the commit *does* ("hero dash with i-frames"), not "wip". When a Blueprint corrupts — it happens — `git checkout` of one `.uasset` is your undo button.

## 1.8 Test before moving on

| Test | Expected |
|---|---|
| Press Play in `L_Dev_Gym` | You possess `BP_Hero` (check: World Outliner shows it, camera is top-down), not the template pawn |
| Click somewhere on the floor | Hero path-walks there — template click-move survived the rename/move |
| Press Space, then hold W | "dash pressed" prints; `IA_Move` prints X=0, Y=1 |
| Open `BP_Hero` components panel | All six `AC_` components attached; `BP_EnemyBase` has its three |
| Viewport → press `P` | Green NavMesh across the whole gym floor |
| `git status` after saving all | Only `Content/`, `Config/`, `.gitattributes`, `.gitignore` tracked; `Saved/` & `Intermediate/` ignored |
| Search `Content/` for the old TopDown asset names | No references remain outside the template folder (redirectors fixed up) |

**Next:** [Chapter 2 — Movement, Camera & Cursor Targeting](02-movement-and-input.md)
