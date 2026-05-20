# strange-attractors — Cross-stack equivalence

> Per charter § 2.2 and spec § 2.6. Phase 1 ships the **declaration**;
> the concrete equivalence harness is Phase 2+ when Stack A → B
> replication lands.

## Tolerance row

This sim consumes the `closed_form` defaults from
`tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-5` |
| `absolute` | `0.0` |

No per-sim override. The defaults sit within the
`tolerance-budget.toml` cap for the closed-form category, so no
operator-approved tolerance-budget amendment is required (spec § 2.6).

## Cross-stack scope

| Pair | Status at Phase 1 close | Phase that lands the harness |
|---|---|---|
| Stack A (Shadertoy port) ↔ Stack B (WebGPU compute) | Not yet exercised | Phase 2 (cross-stack replication) |
| Stack B (single GPU, single vendor) self-replicates | Not yet exercised | Per-sim implementation phase (Phase 2+) |

## Out of scope

- Differentiable / sparse / 3DGS-coupled variants — Phase 4.
- Stack D Taichi port — not planned (closed-form is Stack A → B per
  spec § 5.1).
