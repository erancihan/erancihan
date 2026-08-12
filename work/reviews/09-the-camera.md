# Review — unit 10 (09-the-camera) · pedagogy reviewer · 9/10

Verified
- Format OK: 14% code (a genuinely small file, mostly reasoning).
- Cumulative replay: CameraSystem.swift matches canonical; the Game.swift diff
  applies cleanly. 17 of 18 files now match.

Strengths
- Opens by naming what is *wrong* with chapter 07's placeholder rather than just
  replacing it, so the chapter has a motivating defect.
- The up-vector blend is presented as two failure modes bracketing a choice, then
  a ratio, then an instruction to try both extremes. This is the clearest
  "break it on purpose" in the guide.
- eye-from-ship-axes is justified with the loop case, where "behind the ship" and
  "below the world" coincide and only the ship's frame is correct.
- near/far gets the non-obvious rule: precision is dominated by the near plane,
  so move the camera rather than the plane.
- The smoothing section teaches the frame-rate-independent exp form and names why
  the naive per-frame lerp is wrong — transferable well beyond cameras.
- Challenge (boost FOV kick) requires converting a let to persistent state and
  ends with a genuine design argument rather than a single right answer.

Concerns (accepted)
- Shortest build chapter. It creates one small file; padding it would be worse.
