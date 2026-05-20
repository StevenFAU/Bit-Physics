# sph-water — Cross-stack equivalence

## Tolerance row

Category `sph` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-4` |
| `absolute` | `0.0` |

No per-sim override at Phase 1.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| Stack C self-replicates | Not yet exercised | Phase 2+ |
| Stack D (Taichi port) ↔ Stack C | Not planned at Phase 1 | Phase 2 cross-stack |
