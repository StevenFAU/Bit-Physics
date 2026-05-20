# mpm-multimaterial — Cross-stack equivalence

## Tolerance row

Category `mpm` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-4` |
| `absolute` | `0.0` |

No per-sim override at Phase 1.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| Stack D Taichi self-replicates | Not yet exercised | Phase 2+ |
| Stack D ↔ Stack E (Warp port) | Not in scope at Phase 1 | Phase 2 cross-stack |
