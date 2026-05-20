# mpm-multimaterial — Determinism declaration

> Per spec § 2.5.

## Declaration

**`epsilon-same-stack-same-hw`**. The P2G transfer step is an atomic
scatter-add into the grid; ordering depends on Taichi's thread
scheduling, which breaks bit-exactness even on identical hardware.

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| P2G atomic scatter-add | Yes (canonical MPM op) | epsilon tolerance per `mpm` category default in tolerance.toml |
| Subgroup-collective ops | No (Taichi default) | n/a |
| Reduction-tree shape | Yes (G2P uses reductions when extracting grid → particle) | pinned schedule |
| Taichi f32 atomic-add | Yes (spec § 4.4 limitation) | use f64 grid for canonical reference |
| Driver / vendor FMA fusion | Yes | Pinned hardware/driver |
