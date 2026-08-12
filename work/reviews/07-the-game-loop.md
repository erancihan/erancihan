# Review — unit 8 (07-the-game-loop) · pedagogy reviewer · 9/10

Verified
- Format OK: 49% code, no block over 20 added lines.
- Reconstruction (cumulative replay): Components.swift, RenderSystem.swift,
  MovementSystem.swift all match canonical. Game.swift/GameView.swift/main.swift
  are intentionally at their chapter-07 state, pending 08-11.

Strengths
- Components arrive in six themed groups, each followed by why the data is shaped
  that way — Player as a *tag*, layer/mask as "who can hit whom" without an
  N-by-N rule table, Transform's forward/up/right as the payoff for ch05's
  nose-at--Z convention and the input to chs 08-10.
- dt is taught at the moment it first matters, in MovementSystem, with concrete
  numbers (60 vs 120 Hz, a 50 ms hitch) rather than as an abstraction.
- The dt clamp gets a real explanation: what a huge dt does (tunnelling, lurching)
  and why max(rawDt, 0) guards the other end.
- RenderSystem's loop is used to teach the shape every system follows, including
  why guard-let-and-skip is correct when components are independent.
- The scaffolding retirement is a genuine deletion diff, and the prose lands the
  point: 25 lines out, 3 in, Renderer untouched — the seam working.
- Challenge is unusually good: it opens with something the reader *cannot* do
  (two Renderables on one entity) which teaches the store's overwrite semantics,
  then asks about draw-call batching and which systems ignore an entity.

Concerns (accepted)
- Longest chapter after 06.B; it legitimately creates five files.
- Game.swift's inline camera is knowingly crude, labelled as such, and replaced
  in ch09.
