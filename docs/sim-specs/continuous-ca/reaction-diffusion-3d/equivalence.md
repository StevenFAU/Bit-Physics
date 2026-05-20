# reaction-diffusion-3d — Cross-stack equivalence

> Per charter § 2.2 and spec § 2.6.

## Tolerance row

Consumes `reaction-diffusion` defaults from
`tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-4` |
| `absolute` | `0.0` |

No per-sim override. Within `tolerance-budget.toml` cap.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| Stack C (Vulkan / C++) self-replicates | Not yet exercised | Phase 2+ |
| Stack B (WebGPU port) ↔ Stack C | Not planned at Phase 1 | Phase 2 cross-stack |
