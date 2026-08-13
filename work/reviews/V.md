# Review — unit V (work/verify.py)

**Reviewer persona:** engineer who assumes a checker that only ever prints PASS is
broken, and demands evidence it can detect the thing it claims to detect.

**The seven implementation details from the brief, each accounted for**

1. Replay is cumulative — `reconstruct()` carries one `fs` dict across all chapters.
2. Only `+` lines count toward the size cap and code % (`added_count`).
3. Comparison strips `//`, `/* */`, `#` comments and blank lines (`strip_code`).
4. Comparison is skipped under `--partial`, so subset runs do not false-fail.
5. Files keyed by basename throughout.
6. Location lines are found by scanning back over the whole preceding paragraph
   (up to 4 non-blank lines), not just the line above.
7. Blocks whose location line says "throwaway" get a 45-line cap instead of 20.

**Evidence it works, not just runs**

- **Positive control.** Pointed at `guides/space-fighter-metal/` — an
  independently-authored guide already in the target format — it replays
  **23 files with zero anchor failures across 145 blocks**. Every `diff` anchor
  matched exactly once. A patcher that could not locate context would have
  produced dozens of failures here; it produced none.
- It also found 4 genuine residual defects in that guide (3 unmarked illustrative
  blocks, 1 block at 21 lines), so the lint half is not vacuous either.
- **Negative control.** Pointed at the current Vulkan guide it reports
  `0 of 40 files reconstruct`, 40 missing files, 108 lint problems, 0% anchored —
  which is the true state of that guide.

**Findings**

1. Ambiguity detection is the important case and it is explicit: an anchor matching
   0 or >1 places raises, naming the chapter, line number and first context line.
2. A diff with no context lines at all is rejected outright.
3. A non-diff block targeting a file must say "new file" or "replace…", otherwise
   it fails rather than silently overwriting.
4. Illustrative blocks need an explicit "illustration only" / "don't type this"
   marker to be exempt from anchoring — silence is not an escape hatch. This
   convention must be taught in chapter 01.

**Concerns not fixed**
- `strip_code` removes `//` sequences inside string literals too. No string in
  this project contains `//`, so it is currently harmless, but it would misfire on
  a URL in a string.

**Score: 9/10** — the positive control on a second, independently-written guide is
what makes this trustworthy rather than self-confirming.
