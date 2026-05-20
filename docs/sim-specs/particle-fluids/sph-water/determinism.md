# sph-water — Determinism declaration

> Per spec § 2.5.

## Declaration

**`epsilon-same-stack-same-hw`** for the Stack C C++/Vulkan
implementation. The atomic scatter-add in the neighbor accumulator
(used by both the density and the velocity correctors of DFSPH) makes
exact bit-equality impossible even on the same hardware/driver pair;
cross-stack equivalence falls back to the `sph` tolerance row in
`tolerance.toml` (`relative = 1e-4`).

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| Atomic scatter-add in neighbor accumulator | **Yes** (DFSPH density correction) | epsilon — pin tolerance per category default |
| Subgroup-collective ops | No (canonical Stack C) | n/a |
| Spatial-hash bucket iteration order | Yes (Morton sort + per-bucket linear scan) | deterministic bucket sort |
| Driver / vendor FMA fusion | Yes (WGSL/Vulkan intrinsic) | Pinned hardware/driver |
