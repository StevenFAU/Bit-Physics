# lattice-boltzmann-d3q19 — Cross-stack equivalence

## Tolerance row

Category `lbm` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-5` |
| `absolute` | `0.0` |

No per-sim override at Phase 1.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| Stack C self-replicates (canonical reference) | Not yet exercised | Phase 2+ |
| Optimized GPU vs. canonical reference | epsilon (subgroup ops) | Phase 2+ |
