# mandelbulb-explorer — Cross-stack equivalence

> Per charter § 2.2 and spec § 2.6. Phase 1 ships the declaration;
> harness lands at Phase 2+.

## Tolerance row

Consumes `closed_form` defaults from
`tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-5` |
| `absolute` | `0.0` |

No per-sim override; within `tolerance-budget.toml` cap.

## Cross-stack scope

| Pair | Status at Phase 1 close | Phase that lands the harness |
|---|---|---|
| Stack A (Shadertoy port) ↔ Stack B (WebGPU compute / fragment) | Not yet exercised | Phase 2 |
| Stack B (single GPU, single vendor) self-replicates | Not yet exercised | Phase 2+ |

## Out of scope

- 3DGS volumetric reconstruction (Phase 4+).
- Differentiable DE (Phase 4).
