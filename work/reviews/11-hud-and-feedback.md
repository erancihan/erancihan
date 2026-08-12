# Review — unit 12 (11-hud-and-feedback) · pedagogy reviewer · 9/10

Verified
- Format OK; no block over 20 added lines.
- Cumulative replay: HUD.swift matches, and with the one-line Game.swift change
  ALL 23 files now reconstruct byte-exact against canonical.

Strengths
- Opens by pointing out the reader already built both ends of the machinery in
  ch05 and 06.A and that drawHUD has been running (and early-returning) for five
  chapters — makes this feel like closing a circuit, not new work.
- Every constant is justified by the failure it avoids: the 0.35 alpha cap
  (a full flash blinds you when you most need to see), the frac clamp (hull goes
  negative for one frame before respawn), the fill anchor (drains rightward vs
  shrinking from both sides).
- The colour ramp is explained as two crossing interpolations rather than
  thresholds — a reusable technique.
- Collects the two 06.B decisions (noDepth, alpha ordering) now that their effect
  is visible, which is better placement than when they were introduced.
- Honest about text: names it a real limitation, gives three graded options.
- Challenge (lock-on reticle) is the best in the guide: the work is projection,
  not drawing, and it names three genuine traps including negative-w ghosts.

Concerns (accepted)
- None material.
