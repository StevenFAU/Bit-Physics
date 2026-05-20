# lattice-boltzmann-d3q19 — Determinism declaration

> Per spec § 2.5.

## Declaration

**`bit-exact-effort-same-stack-same-hw`**. The streaming + BGK
collision steps are structurally deterministic (per-cell read of
neighbors, per-cell write; no atomics, no reductions per step).
"Effort" qualifier: optimized GPU implementations may use subgroup
ops for fused streaming-collision; these break bit-equality unless
explicitly disabled.

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| Atomic scatter-add | No | streaming reads from neighbors only |
| Subgroup-collective ops | Yes (in optimized GPU paths) | canonical reference disables; cross-vendor falls back to `lbm` tolerance |
| Reduction-tree shape | No (no global reductions per step) | n/a |
| Driver / vendor FMA fusion | Yes | Pinned hardware/driver |
