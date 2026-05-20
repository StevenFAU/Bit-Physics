# eulerian-smoke — Determinism declaration

> Per spec § 2.5.

## Declaration

**`epsilon-same-stack-same-hw`**. Pressure-projection iterations are
the source of non-bit-exact behavior: parallel reductions (Jacobi
sweep convergence check) and boundary-of-convergence behavior depend
on FP reduction-tree shape.

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| Atomic scatter-add | No | Semi-Lagrangian backtrace reads only. |
| Parallel reductions (pressure solver) | Yes | Pin tolerance per `smoke` category default. |
| Subgroup-collective ops | No (canonical Stack C) | n/a |
| Driver / vendor FMA fusion | Yes | Pinned hardware/driver. |
