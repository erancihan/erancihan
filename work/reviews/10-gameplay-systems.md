# Review — unit 11 (10-gameplay-systems) · pedagogy reviewer · 9/10

Verified
- Format OK: 49% code, no block over 20 added lines (was 329 lines in 6 pastes).
- Cumulative replay: all four systems match canonical. Game.swift now differs
  from canonical by exactly one line — the ch11 HUD call — which confirms the
  whole 07→08→09→10 diff chain against Game.swift is correct.
- 21 of 22 files match.

Strengths
- The two archetypes are used to make composition concrete: two enemy types,
  zero subclasses, zero type enums, and SpinSystem tumbles drifters without
  knowing enemies exist.
- Both of ch03's vector products reappear in steerHomers doing exactly what they
  were introduced for, and both NaN guards (dist > 0.001, the acos clamp) are
  explained as real failure modes rather than defensive noise.
- The `dead` set is justified by the specific bug it prevents — double-scoring a
  kill within one frame, a direct consequence of deferred destruction.
- Design reasoning that isn't about the API: hitbox 0.9x the silhouette because
  larger-than-art feels unfair; cull radius chosen relative to spawn distance;
  two spawn gates because either alone fails differently.
- respawn() is used to retroactively justify ch04's decision to skip entity
  generations — it resets rather than recreates, so no handle is ever stale.
- Scaling honesty section states the exact complexity, why we didn't fix it, and
  where the cliff is.
- Challenge (splitter) has two genuine traps including an entity bomb, and asks
  the reader to decide whether one behaviour is a bug or a feature.

Concerns (accepted)
- Longest chapter after 06.B; it creates four systems and finishes Game.swift.
