# Chapter 5 — Stats & the Damage Pipeline

> **Goal of this chapter:** one damage pipeline that every attack in the game — player weapons, enemy claws, boss slams, fall damage — flows through. Health, poise, stagger, hit reactions, and death, all server-authoritative, all visible to every player.

---

## 5.1 Extend AC_Stats

Add to `AC_Stats` (component replicates = ON, from Ch. 4):

| Variable | Type | Replication | Purpose |
|---|---|---|---|
| `MaxHealth` | float (100) | Replicated | |
| `Health` | float | **RepNotify** | OnRep → health bars, death visuals |
| `MaxPoise` | float (50) | none (server-only) | resistance to stagger |
| `Poise` | float | none (server-only) | clients never need it |
| `PoiseRegenRate` | float (10/s) | none | regen like stamina, shorter delay |
| `bInvincible` | bool | none (server-only) | set by `ANS_Invincible` (Ch. 4) |
| `bIsDead` | bool | RepNotify | |
| `OnHealthChanged` | Dispatcher | — | payload: NewHealth, MaxHealth, Delta |
| `OnDamaged` | Dispatcher | — | payload: Amount, Instigator, HitInfo — fired server-side |
| `OnPoiseBroken` | Dispatcher | — | server-side |
| `OnDeath` | Dispatcher | — | payload: Killer — fired server-side, and on clients via OnRep_bIsDead |

**Why poise isn't replicated:** clients never display poise (souls games hide it); only the server's stagger decision matters. Not replicating it is free bandwidth. If you later add a poise bar for bosses, flip it to RepNotify then.

## 5.2 Use the engine's damage plumbing

Unreal ships a damage route: **`Apply Damage`** (or `Apply Point Damage` with hit info) → target's **`Event AnyDamage`** (or `Event PointDamage`). Use it — every actor gets a uniform entry point, you get `Damage Causer`, `Instigated By` (controller), and `Damage Type` for free, and later systems (fall damage, hazards) plug in without new wiring.

Create damage type classes (Blueprint Class → parent `DamageType`) in `Combat/`: `DMG_Physical`, `DMG_Fire`, and give `DMG_Physical` two float defaults you'll read via the class: nothing yet — keep damage numbers on the *weapon* (Ch. 6); damage *types* are for resistances later.

## 5.3 The pipeline

Everything below runs **on the server only** — `Apply Damage` must only ever be called from server-side code (weapon traces in Ch. 6 already run there; `Event AnyDamage` fires where ApplyDamage was called, so keep the calls server-side).

```mermaid
flowchart TD
    A["Attacker (server): Apply Point Damage<br/>BaseDamage, HitResult, DamageType"] --> B["Target: Event Point/AnyDamage<br/>in BP_PlayerCharacter / BP_EnemyBase"]
    B --> C{"AC_Stats:<br/>bInvincible OR bIsDead?"}
    C -- yes --> X([ignore — i-frames!])
    C -- no --> D{Blocking? <i>(optional, 5.7)</i>}
    D -- yes --> E[Reduced dmg + stamina chip<br/>block-impact reaction]
    D -- no --> F["Health = Clamp(Health - Dmg)  (w/ Notify)"]
    F --> G["Poise -= attack's PoiseDamage"]
    G --> H{Poise <= 0?}
    H -- yes --> I["Poise = MaxPoise<br/>CombatState = Staggered<br/>Multicast_PlayHitReact(Heavy)"]
    H -- no --> J["Multicast_PlayHitReact(Light)<br/><i>(flinch — or nothing for armored enemies)</i>"]
    I --> K{Health <= 0?}
    J --> K
    K -- yes --> L["HandleDeath (5.6)"]
    K -- no --> M([done])
```

```text
Blueprint: BP_PlayerCharacter / BP_EnemyBase — damage entry
───────────────────────────────────────────────────────────
[Event AnyDamage (Damage, DamageType, InstigatedBy, DamageCauser)]
 → [AC_Stats → ReceiveDamage (Damage, PoiseDamage*, InstigatedBy, DamageCauser)]

    *PoiseDamage: read from the DamageCauser's weapon data (Ch. 6);
     pass 0 for hazards.

Blueprint: AC_Stats — function ReceiveDamage   (SERVER ONLY — add an
                                                Authority check at the top)
──────────────────────────────────────────────
[Branch: bInvincible OR bIsDead] → true: return
[Set Health (w/Notify) = Clamp(Health - Damage, 0, MaxHealth)]
[Set Poise = Poise - PoiseDamage] ; [Set LastPoiseDamageTime]
[Call OnDamaged]
[Branch: Poise <= 0]
   true → [Set Poise = MaxPoise] → [Call OnPoiseBroken]
[Branch: Health <= 0]
   true → [Set bIsDead (w/Notify) = true] → [Call OnDeath (InstigatedBy)]
```

The owning character binds to those dispatchers on BeginPlay (server side): `OnPoiseBroken` → set `CombatState = Staggered`, play stagger montage via multicast; `OnDeath` → `HandleDeath` (5.6).

## 5.4 Hit reactions

One montage per direction is the polish version; start with a single flinch:

> **Directional reacts, when you're ready** (the standard algorithm, straight from the Druid Mechanics course codebase): flatten the impact point to the victim's Z; `ToHit = Normalize(ImpactPoint - ActorLocation)`; `Theta = Acos(Dot(ActorForward, ToHit))` in degrees; if `Cross(Forward, ToHit).Z < 0` negate Theta. Then −45..45 → front, 45..135 → right, −135..−45 → left, else back — and `Montage Jump to Section` into a 4-section hit-react montage. Pass the `HitResult` through your multicast so every machine computes the same section.

- `AM_HitReact_Light` (short flinch, upper-body slot so movement continues) and `AM_HitReact_Heavy` (full-body stagger, root motion knockback if the anim has it).
- Play via Multicast from the server (these are cosmetic *events*):

```text
[Custom Event Multicast_PlayHitReact (E_HitReactType)]  (Multicast, Unreliable)
 → [Select montage by type] → [Play Anim Montage]
```

- **Hitstop** (the tiny freeze that sells impact): when your hit lands (Ch. 6 sends a `Client_HitConfirmed` to the attacking player), freeze *just the two combatants*: `Set Custom Time Dilation = 0.05` on the attacker and (via their simulated proxy, cosmetically) the victim → `Set Timer by Event (0.08 s)` → restore both to `1.0`. Per-actor dilation beats `Set Global Time Dilation` because global dilation also slows the `Delay` node you'd use to end it (a classic trap) and stutters everyone else's game. Purely local juice — never replicate time dilation. Add camera shake (`Play World Camera Shake`) for both hitter (small) and victim (bigger, via their OnDamaged→local check).

**Damage numbers / blood VFX:** clients can react locally inside `OnRep_Health` (they know the delta) — spawn a floating damage number widget or Niagara blood burst there. Late joiners don't need old VFX, so an event-shaped reaction to a state change is correct here.

## 5.5 Health bars

Three consumers of the same `OnHealthChanged` dispatcher:

| UI | Where it lives | How |
|---|---|---|
| My HP bar | `WBP_HUD` (local) | bind to own pawn's dispatcher (rebind on respawn!) |
| Ally HP bars | `WBP_HUD` party list (Ch. 11) | bind via each ally's PlayerState→Pawn |
| Enemy overhead bar | `WidgetComponent` on `BP_EnemyBase`, Screen space | the widget binds to its owner's dispatcher; show only after first damage, hide after 5 s no-damage (classic souls lock-on bar comes in Ch. 7) |

Because OnRep fires on every client and `Set w/Notify` fires it on the listen server, **one dispatcher drives all machines' UI with zero extra replication.**

## 5.6 Death (single-player version, upgraded in Ch. 10/11)

Server, on `OnDeath`:

```text
[HandleDeath (server)]
 → [Set CombatState (w/Notify) = Dead]
 → [Multicast_OnDeath]
 → [Disable capsule collision (Pawn channel ignore)] ; [Stop movement]
 → [GameMode → NotifyPlayerDied(Controller)]   ◄ GameMode decides respawn (Ch.10)

[Multicast_OnDeath]
 → [Play AM_Death montage]  (or enable ragdoll: Set Simulate Physics on mesh)
 → [If locally controlled: show "YOU DIED" widget, disable input]
```

Enemies: same pipeline, but `HandleDeath` also awards souls to the killer's PlayerState (Ch. 10) and tells the AI to stop (Ch. 8).

## 5.7 Optional now, recommended later: blocking

Hold-to-block fits the same pipeline: `bIsBlocking` (RepNotify, server-set via Server RPC like sprint), and in `ReceiveDamage`, if blocking *and* the attacker is within the front 120° arc (`Dot(Forward, DirToAttacker) > -0.5` — actually use `Dot > 0.5` of victim-forward vs *direction to attacker*): damage ×0.1, stamina −= chip cost, play block-impact instead of hit react; if stamina hits 0 → guard break = forced `Staggered`. Slot it in at the `Blocking?` diamond in the 5.3 flowchart.

## 5.8 Test with a training dummy

Make `BP_TrainingDummy` (parent: Character, or an Actor with a mesh + `AC_Stats`), place two in `L_Hub`, and give yourself a debug attack before Chapter 6 exists:

```text
[IA_Attack Triggered]  → [Server_DebugAttack]
[Server_DebugAttack]   (Run on Server)
 → [Sphere Trace For Objects (Pawn), start=actor loc, end=loc+forward*150, r=60]
 → [Apply Point Damage: 25 dmg, 30 poise (pass via interface or cast), DMG_Physical]
```

Test matrix (2 clients + lag emulation):

| Test | Expected |
|---|---|
| Client 2 hits dummy | HP bar drops on **both** screens simultaneously |
| Hit during ally's roll i-frames | zero damage (server honored `bInvincible`) |
| 2 fast hits | poise breaks on the configured threshold, heavy react plays everywhere |
| Kill the dummy | death montage/ragdoll on both screens; corpse doesn't block movement |
| Attacker hitstop | freeze frame only on the attacker's window |

---

## Chapter checklist

- [ ] Health/poise added to `AC_Stats`; all mutation server-side
- [ ] Single `ReceiveDamage` pipeline; i-frames and death respected inside it
- [ ] `Apply [Point] Damage` / `Event AnyDamage` used as the transport
- [ ] Light/heavy hit reacts multicast; hitstop + shake local-only
- [ ] HP bars all event-driven off one dispatcher
- [ ] Dummy test matrix passes

**Next:** [Chapter 6 — Melee Combat: Weapons, Combos & Hit Detection](06-melee-combat.md)
