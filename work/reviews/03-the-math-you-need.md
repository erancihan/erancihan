# Review — unit 3 (03-the-math-you-need) · pedagogy reviewer · 9/10

Verified
- Format OK: 45% code, largest block 14 lines (was one 112-line block).
- Reconstruction: 8 anchored snippets replay into Math.swift matching canonical
  exactly (code-only). No anchor ambiguity.

Strengths
- Each function is introduced by the problem it solves: the homogeneous-coordinate
  diagram lands immediately before `translation`, the gimbal-lock argument
  immediately before `rotation`.
- "Derive, don't present" hits `trs`: the right-to-left ordering is explained,
  then the checkpoint's three failure modes tell you which mistake produced which
  number, and the reader is told to break it deliberately and put it back.
- Checkpoint is a single verifiable number (9.00) with reasoning for why.
- Challenge (Vec3 moveToward) is small, has a real trap (normalising a zero
  vector), and needs no new concepts.

Concerns (accepted)
- 45% is the highest code share of any chapter so far, but this file is 8
  standalone functions with little shared state; there is a floor.
- The simd_quatf API sample is an unanchored preview by design.
