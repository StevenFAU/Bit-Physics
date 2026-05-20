# reaction-diffusion-3d — Determinism declaration

> Per spec § 2.5.

## Declaration

**`bit-exact-same-stack-same-hw`** for the Stack C C++ / Vulkan
implementation on a fixed hardware/driver pair.

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| Atomic scatter-add | No | 7-point stencil reads neighbors only; writes are per-cell, non-atomic. |
| Subgroup-collective ops | No (canonical Stack C). | n/a. |
| Reduction-tree shape | No (no global reductions per step). | n/a. |
| Driver / vendor FMA fusion | Yes | Pinned hardware/driver; cross-vendor → epsilon at the `reaction-diffusion` category tolerance row. |
