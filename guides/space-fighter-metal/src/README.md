# `src/` — the runnable prototype

A complete, playable space-fighter built on a hand-rolled **Entity–Component–
System** core and rendered with **Metal**. Unlike a fill-in-the-blanks
workbench, everything here already runs — it's the reference the [`../docs/`](../docs/)
chapters explain and the base you extend.

```console
$ cd src
$ swift run
```

A window opens, you're behind a low-poly fighter, and enemies start warping in
ahead of you.

## Requirements

- **macOS 13+** on Apple silicon or an Intel Mac with a Metal GPU.
- **Xcode 15+** or the matching **Swift 5.9+** command-line toolchain
  (`xcode-select --install` gives you `swift`).

No external packages, no asset files, no separate shader-compile step: the
shaders are compiled from source at launch, and all geometry is generated in
code.

## Controls

| Key | Action |
|---|---|
| `W` / `↑` | Pitch **down** (dive) |
| `S` / `↓` | Pitch **up** (climb) |
| `A` / `←` | Yaw **left** (banks into the turn) |
| `D` / `→` | Yaw **right** |
| `Q` / `E` | Roll left / right |
| `Shift` | Boost |
| `Space` | Fire |
| `Esc` / `⌘Q` | Quit |

Score, hull integrity and death count are shown in the **window title**. Shoot
the octahedra (red ones chase you, amber ones tumble past); don't ram them.

## How it's laid out

```
src/
├── Package.swift                 SwiftPM manifest — one macOS executable
└── Sources/SpaceFighter/
    ├── main.swift                app + window + Metal view, the entry point
    ├── Game.swift                the world, and the per-frame system schedule
    ├── GameView.swift            input capture + the MTKViewDelegate game loop
    ├── Input.swift               InputState and key codes
    ├── Math.swift                simd helpers: matrices, projection, quaternions
    ├── Components.swift          every component (pure data structs)
    ├── HUD.swift                 crosshair, hull bar and hit-flash geometry
    ├── Mesh.swift                procedural ship / enemy / bolt / stars / grid
    ├── ECS/
    │   ├── Entity.swift          the id type
    │   ├── ComponentStore.swift  sparse-set storage
    │   └── World.swift           entities + component stores + deferred destroy
    ├── Systems/
    │   ├── FlightControlSystem.swift   input → orientation + velocity
    │   ├── MovementSystem.swift        integrate velocity (+ SpinSystem)
    │   ├── WeaponSystem.swift          fire cadence + spawn bolts
    │   ├── EnemySystem.swift           spawn, homing AI, cull
    │   ├── LifetimeSystem.swift        expire bolts
    │   ├── CollisionSystem.swift       sphere hits: bolt→enemy, ship→enemy
    │   ├── CameraSystem.swift          chase camera → view matrix
    │   └── RenderSystem.swift          entities → InstanceData buckets
    └── Render/
        ├── RenderTypes.swift     CPU structs that mirror the shader structs
        ├── Shaders.swift         all MSL source (lit / unlit / star / HUD)
        └── Renderer.swift        device, pipelines, depth, the draw loop
```

## The one-paragraph mental model

An **entity** is just a number. A **component** is a plain struct of data
(`Transform`, `Velocity`, `Enemy`, …) stored in a cache-friendly
[sparse set](Sources/SpaceFighter/ECS/ComponentStore.swift). A **system** is a
function that runs over every entity holding a particular set of components and
does one job. `Game.update` calls the systems in a fixed order every frame —
that ordering *is* the gameplay. The last system, `RenderSystem`, turns whatever
is left standing into arrays of `InstanceData`, and `Renderer` draws each mesh
in a single instanced Metal draw call. Gameplay code never imports Metal; the
renderer never sees an entity. Read [`../docs/`](../docs/) start to finish for
the why behind each of those choices.

## Common tweaks

- **Busier sky:** lower `Director.spawnInterval` or raise `maxEnemies` in
  [`Game.swift`](Sources/SpaceFighter/Game.swift).
- **Snappier ship:** bump the turn rates in
  [`FlightControlSystem.swift`](Sources/SpaceFighter/Systems/FlightControlSystem.swift).
- **New enemy shape:** add a case to `MeshID`, a generator in
  [`Mesh.swift`](Sources/SpaceFighter/Mesh.swift), and upload it in `Renderer.init`.
- **A new behaviour:** add a component + a system + one line in
  `Game.update`. That's the whole extension story — see
  [`../docs/12-where-to-go-next.md`](../docs/12-where-to-go-next.md).

## Building a real `.app`

`swift run` produces a bare executable that opens a window — perfect for
iteration. To ship an app icon, bundle, and code signing, make an Xcode "macOS
App" target and drop these `Sources` in, or generate a project. Chapter 01
walks through both paths.
