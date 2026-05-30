# Variant equivalence — `tools/testkit/equivalence/variant`

> Phase-4 WU-F (plan §4.2.F). Same-stack variant-vs-reference equivalence at a
> matched sim time, with per-output tolerances + per-axis tolerance-budget
> enforcement. Sibling to the Phase-0 cross-stack `equivalence` harness (which
> compares *stacks*); this compares *variants* of one sim. Gates all 27 Phase-4
> frontier variants (Stages 9-35).

## Public surface

```python
from equivalence.variant import (
    VariantToleranceSpec, compare_captures, EquivalenceReport,
    assert_within_budget, ToleranceBudgetExceeded,
)
```

- **`VariantToleranceSpec(output_name, absolute_tol, relative_tol, norm)`** —
  per-output tolerance; `norm ∈ {"L2", "Linf", "wasserstein"}`; field names per
  the §4.2.P canonical registry.
- **`compare_captures(*, reference_capture, variant_capture, tolerances,
  at_sim_time) -> EquivalenceReport`** — reads both captures
  (`capture.load_capture`), matches the nearest frame to `at_sim_time` (by a
  `time`/`sim_time` diagnostic if present, else the step index), and compares the
  named outputs. Per-output `error <= absolute_tol + relative_tol·‖reference‖`.
  **Mixed schema versions** (spec §2.7): each capture is read by its version's
  reader; comparison is on the intersection of declared fields; fields present in
  only one version are reported in `skipped_fields` unless a tolerance names them
  — a named field absent from the reference (or variant) raises `ValueError`.
- **`EquivalenceReport`** — `passed`, `per_output_errors`, `per_output_passed`,
  `reference_capture`, `variant_capture`, `at_sim_time`,
  `reference_schema_version`, `variant_schema_version`, `skipped_fields`.

## Tolerance-budget enforcement (spec §2.6)

`assert_within_budget(variant_axis, proposed_tolerance)` raises
`ToleranceBudgetExceeded` if a proposed variant tolerance exceeds its per-axis
cap (Cat-X HARD_FAILs over-budget overrides). The caps (plan §7.7):

| Axis | Metric | Default | Budget cap |
|---|---|---|---|
| `differentiable` | relative (gradient verification) | 1e-3 | ≤ 1e-2 |
| `sparse` | absolute (sparse-vs-dense) | 1e-6 | ≤ 1e-4 |
| `neural` | PSNR / SSIM (render-similarity) | ≥35 / ≥0.9 | floor ≥25 / ≥0.7 |
| `frontier` | per-paper | — | set at variant-stage dispatch (no fixed cap) |
| `newton` | absolute (USD-round-trip) | fp32 | ≤ fp16 (~9.77e-4) |
| `learned` | norm-bound (rollout-stability) | ≤1.5× | ≤ 3× |

`proposed_tolerance` is a metric→value mapping (`{"relative": 5e-3}`,
`{"psnr_min": 30.0, "ssim_min": 0.85}`, `{"norm_bound": 2.0}`, …); metrics absent
from the axis budget are ignored. Widening a cap requires a separate
operator-approved tolerance-budget-amendment commit + audit per spec §2.6.

## PBT (spec §2.14)

`identity_variant_passes` (a variant equal to its parent passes for any
tolerance) and `tolerance_monotone` (widening a tolerance never flips PASS→FAIL).

## Mutation

Target `[targets.variant]` at threshold **0.85** (gates all frontier variants).
