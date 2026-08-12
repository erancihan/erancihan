# Review — unit 5 (05-meshes-and-geometry) · pedagogy reviewer · 9/10

Verified
- Format OK: 55% code, largest block 17 lines (was 145).
- Reconstruction: RenderTypes.swift and Mesh.swift both replay exactly.

Strengths
- `flat()` is split at the right seam: centroid + buffers first (so the reader
  sees an empty mesh returned and understands the shape of the function), then
  the per-triangle body. The self-correcting normal gets its own explanation as
  a use of the dot product's *sign* as a direction test.
- Each solid is followed by why it looks like that: the ship's nose at -Z ties
  forward to ch03 and pre-pays for ch08; the cube is explained as one mesh
  restyled per instance.
- The starfield's brightness-in-normal.x hack is called out as a deliberate reuse
  of a dead channel rather than left as a puzzle.
- New material this pass: indices vs non-indexed, CPU-side/GPU-upload separation,
  star/grid budget tuning, and the UInt16 65,536-vertex ceiling with its symptom.
- Challenge (jittered asteroid) probes the limit of the convexity assumption the
  normal correction rests on — it makes the reader interrogate the technique.

Concerns (accepted)
- Sits exactly at the 55% cap. Six generators is irreducibly code-dense; the
  per-snippet prose ratio is what matters and it is healthy.
