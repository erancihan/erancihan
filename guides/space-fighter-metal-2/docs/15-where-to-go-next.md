# 15 · Where to go next 🧠

> **You'll leave this chapter with:** a map of what this guide chose not to
> build, why each piece was left out, and where in the code it would go —
> so that the next thing you add lands in the right place.
>
> **Files created: none.**

Fourteen chapters ago you had a prototype: a ship that turned like a cursor,
enemies that couldn't shoot, a hull bar, and a hit rate that depended on
your monitor. You have a game now. It flies like a fighter, it fights back
in waves, it rewards a run and ends it, it has a front door and a hangar,
and two people on two machines can play it together or against each other
through code that was tested against a fake network before it ever saw a
real one.

The first guide's chapter 15 was a list of things a prototype lacked. This
one is shorter, because most of that list is done. What's left falls into
three groups: things that would make the game *look and sound* like a game,
things that would make the multiplayer *fair* under bad conditions, and
things this guide deliberately kept out.

---

## The through-line, again

Every chapter here leaned on the same two ideas, and they're worth stating
once more because they are the reason the additions below are additions and
not rewrites.

**The simulation is a pure function of state, inputs and a fixed step.**
Chapter 02 made it so; chapter 03 made input a value; chapter 13 sent that
value over a wire and ran the function on another machine. Anything you add
that changes *what happens* — a new weapon, a new enemy, a new mode — goes
into `step` or into a system it calls, uses `world.rng` for its randomness,
and gets determinism, replay, and replication for free.

**Presentation is everything that's allowed to cheat.** The camera, the
flash, the shake, the toast, the kill feed, the interpolated ghosts. Anything
you add that changes *how it looks* goes into `frame` or into what `frame`
calls, uses real time and the presentation `Rng`, and never crosses the wire.

If a feature doesn't obviously belong to one side, that's the first thing to
decide about it.

---

## Looking and sounding like a game

**Audio.** The single biggest missing thing, and the easiest to add without
touching the simulation. Every sound is a reaction to an event the game
already emits — `died`, `damaged`, `pickedUp`, `shielded`, `kill` — so a
sound system is a consumer of `effects` in `frame`, exactly like the hit
flash. `AVAudioEngine` plays buffers with a `AVAudioEnvironmentNode` for
3D position; the position is the entity's interpolated transform. Engine
hum is the one sound that isn't an event: pitch it from `Engine.speed`.
Start with four sounds — shot, hit, explosion, pickup — and a hum.

**Real models.** Every mesh in this game is a handful of triangles typed
into a `MeshBuilder` call. The renderer never knew that: a `Mesh` is
vertices and indices, and `MeshID.mesh` is where they come from. Load a
`.usdz` or `.obj` with Model I/O into the same `Mesh` struct, add a `case`
to `MeshID`, and the instancing, the lighting and the boundary test all
carry on. Textures need one more vertex attribute and one more pipeline —
chapter 09's atlas is the template, in one channel instead of three.

**Bloom.** The bolts and pickups are drawn unlit and bright; a bloom pass
would make them *glow*. It's the first post-process, and the first time the
renderer draws to a texture instead of the screen: render the scene to an
offscreen `MTLTexture`, extract the bright parts, blur them in two passes,
add them back. Four small pipelines, no change above `Render/`.

**Particles, properly.** Chapter 07's explosions are twelve entities each,
which is fine for a dozen explosions and not for a thousand sparks. A real
particle system is a single buffer the GPU updates in a compute shader, drawn
as points like chapter 06's stars. It's presentation — a `ParticleSystem`
in `frame` that spawns bursts from the same events the debris uses.

**One pass for two seats.** Chapter 11 draws the world once per viewport.
Metal can draw both in one pass — *vertex amplification* runs each vertex once
per view, with `amplification_id` picking that view's matrix and viewport —
and the guide named it there and stopped, because two draws of a few hundred
instances cost nothing. When the scene is real, it's the first thing
split-screen asks for.

**Screen scaling.** Chapter 09's challenge: text is sized in drawable
pixels, so a Retina display halves it. The fix is one scale factor on
`HUDInput`, and it's the kind of thing that's ten lines when you do it now
and a hundred when the HUD has grown.

---

## Making multiplayer fair

Chapter 12 listed what the netcode leaves out. Here is what each costs and
where it goes.

**Smoothed corrections.** Chapter 13's challenge. A visual offset that
decays, applied where the scene and camera read the local ship's transform.
Presentation, an afternoon, and the single most noticeable improvement on a
bad connection.

**Projectile prediction.** Your bolts appear a round trip after you press
fire. The fix is for the client to spawn a *predicted* bolt at once — a
ghost it made itself — and reconcile it against the server's when the
snapshot arrives, matching by spawn tick and seat. The server's bolt is the
one that can hit; the client's is a picture. It's the same pattern as the
ship, applied to something that's created rather than moved, and it's a
weekend.

**Lag compensation.** A client sees everyone else 100 ms in the past, so a
shot that looks like a hit on its screen is judged by the server against
where the target is *now*. Valve's answer, which every shooter since has
used: the server keeps a short history of every entity's position, and when
a bolt from a client arrives, it tests it against the world as that client
*saw* it — rewound by that client's latency plus the interpolation delay.
It lives in the collision system, gated on the shooter's seat, and it's the
one item here that needs a real design discussion first, because it makes
the victim's experience worse ("I was behind the wall") to make the
shooter's better. The reading list has the article.

**Leaving and rejoining.** Chapter 14's challenge. Timeouts, a host that
goes away, seats that remember names. Two days, mostly in `Server`.

**A dedicated server.** Right now the host is a player and the game ends
when they quit. A dedicated server is a second executable target that owns
a `Server` and a `Game`, has no `Renderer`, no `Session`, no window, and
steps on a timer instead of a display link. Almost everything it needs is
already free of AppKit and Metal — that was chapter 02 of the first guide's
layering — and the boundary test is how you'd prove it: add the target, and
if it links, the layering held.

**Delta compression.** Every snapshot sends every entity in full. Sending
only what changed since the last snapshot the client *acked* is how Quake 3
cut its bandwidth by an order of magnitude, and it's a natural extension of
chapter 13's ack: the server keeps the last acked snapshot per peer and
diffs against it. It's the challenge nobody set.

---

## What this guide kept out, on purpose

**Persistence.** Chapter 08 chose a roguelike over a roguelite and said the
difference is a file. If you want unlocks, a hangar of earned ships, or a
high-score table, it's `Codable` structs written to Application Support with
the atomic write chapter 14 of the first guide taught — and a decision, per
field, about what a run is allowed to carry out. The reason to have kept it
out is that a save file is a promise about format stability that a
sixteen-chapter guide can't make.

**Accounts and matchmaking.** Anything past "type a friend's address" needs
a server on the internet that both players can reach. That's a different
project — a small relay or lobby service — and a different guide.

**Cross-platform.** The first guide has a Vulkan sibling in C++. Nothing in
chapters 02 through 08, 10 through 13, or 14's rules touched `Render/`; they
are ECS, math, and rules, and they port to the sibling's ECS one system at a
time. Chapters 09 and 11 are the two that would need re-doing against
Vulkan, and chapter 14's transport against POSIX sockets. The determinism
rules would need one more: agree on a floating-point mode across
compilers, or accept — as this guide does — that it only has to hold within
one process.

**Cheating.** The host is trusted and a client can send any `InputFrame`.
Because a client can *only* send an `InputFrame`, the worst a modified
client can do is fly perfectly; it can't teleport or give itself health.
That's the design's one free gift on this front, and everything past it —
detecting an inhuman stick, rate-limiting a client that sends a thousand
inputs a tick — is a game that never ends.

---

## The order to do them in

If you're going to keep going, this is the sequence that pays for itself
fastest:

1. **Smoothed corrections** (chapter 13's challenge). One afternoon; the
   game stops twitching on a real connection.
2. **Audio.** One weekend; the game starts feeling like one.
3. **Leaving and rejoining.** One or two days; the multiplayer stops
   breaking when someone's laptop sleeps.
4. **Projectile prediction.** One weekend; shooting feels immediate at any
   latency.
5. **Real models and bloom.** As long as you like; this is where the look
   comes from.

Everything on that list goes into a file this guide created, in a place it
pointed at. That was the point of the fourteen chapters before this one.

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
