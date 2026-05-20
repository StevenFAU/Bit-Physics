# boids-3d — Determinism declaration

> Per spec § 2.5; tolerance via `tools/testkit/equivalence/tolerance.toml`.

## Declaration

**`bit-exact-same-hw`** for the Stack B implementation when run on a
fixed hardware/driver pair and when neighbor enumeration is
deterministic (small-N: nested loop; large-N: spatial-hash with
deterministic bucket ordering).

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| Atomic scatter-add | No (per-agent velocity update is per-thread) | n/a |
| Subgroup-collective ops | No | n/a |
| Reduction-tree shape | No | n/a |
| Spatial-hash bucket iteration order | Yes (at large N) | Pin bucket sort + deterministic in-bucket iteration order |
| Driver / vendor FMA fusion | Yes (WGSL intrinsic) | Pinned hardware/driver |
