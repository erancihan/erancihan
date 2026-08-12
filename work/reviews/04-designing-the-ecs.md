# Review — unit 4 (04-designing-the-ecs) · pedagogy reviewer · 9/10

Verified
- Format OK: 55% code, largest teaching block 14 lines (was 81), checkpoint
  harness 31 lines under the 40-line scratch cap.
- Reconstruction: Entity.swift, ComponentStore.swift and World.swift all replay
  from the chapter's snippets and match canonical exactly.

Strengths
- The removeIfPresent sequence is the strongest teaching in the guide so far:
  naive remove(at:) is written and compiles, then is shown to be O(n) AND to
  leave stale indices; swap-remove replaces it; the reader is told it is *still*
  wrong and asked to find the missing line before being shown it. Three states,
  each runnable.
- Deferred destruction is motivated by the concrete collision case before the
  code appears, and the two subtleties (AnyComponentStore existing so one destroy
  sweeps every store; the contains() guard making double-destroy a no-op) are
  called out where they occur.
- Checkpoint output is annotated line-by-line with which property each line
  proves, plus two named failure modes.
- Challenge targets the `if i != last` guard — genuinely non-obvious, and the
  checkpoint passes without it, so the reader must reason rather than run.

Concerns (accepted)
- 55% code, right at the cap; unavoidable for a chapter that builds three files.
- ComponentStore is knowingly non-compiling between the skeleton and
  removeIfPresent. Flagged in prose so it can't be mistaken for an error.
