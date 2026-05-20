# Tier 2 — Closed-form diagnostics

For closed-form simulations (strange-attractors, mandelbulb-explorer)
where the "state" is one or more deterministic functions evaluated at
a set of parameters. The three checks here exercise smoothness,
precision sensitivity, and bound preservation — properties an
analytic closed-form output is expected to honour even before any
sim-implementation phase ships.

> Status: scaffolded in Phase 1 Stage 1 per charter
> [`docs/phases/phase-1-plan.md`](../phases/phase-1-plan.md) § 3.7
> (interface contract IC-7).

## Source layout

| Path | Role |
|---|---|
| `tools/diagnostics/diagnostics/tier2/_types.py` | Shared `CheckResult` type (FACT — file present at HEAD) |
| `tools/diagnostics/diagnostics/tier2/closed_form/__init__.py` | Re-exports the three checks (FACT) |
| `tools/diagnostics/diagnostics/tier2/closed_form/output_stability.py` | `check_output_stability` (FACT) |
| `tools/diagnostics/diagnostics/tier2/closed_form/precision_sensitivity.py` | `check_precision_sensitivity` (FACT) |
| `tools/diagnostics/diagnostics/tier2/closed_form/bound_preservation.py` | `check_bound_preservation` (FACT) |
| `tools/diagnostics/diagnostics/tier2/closed_form/tests/` | Synthetic-fixture pytest suite (FACT — 23 tests pass) |

## Shared return type — `CheckResult`

```python
@dataclass(frozen=True)
class CheckResult:
    passed: bool
    value: float | None = None
    tolerance: float | None = None
    details: dict[str, Any] = field(default_factory=dict)
```

INFERENCE: Phase 0's `scalar_field` substack ships per-check
`*Report` dataclasses (`ConservationReport`, `BoundsReport`,
`SpectralReport`); the new Phase 1 substacks adopt the unified
`CheckResult` shape per charter § 3.5–§ 3.7. The shift is documented
in the Stage 1 checkpoint and the two conventions coexist (Phase 0
deliverables are not edited per Convention A).

## Checks

### `output_stability` — `check_output_stability(parameter_values, output_values, stability_metric, threshold) -> CheckResult`

For a parameter sweep `(p_i, y_i)`, verify smoothness via one of two
metrics.

| Metric | Definition | When to use |
|---|---|---|
| `bounded_variation` | `sum |y_{i+1} - y_i|` after sorting by `p` | Aggregate smoothness; catches many small wiggles |
| `max_jump` | `max |y_{i+1} - y_i|` after sorting by `p` | Worst-case discontinuity; catches lone outliers |

`passed` iff the metric stays `<= threshold`. Sweep is sorted on `p`
before differencing — input ordering is not load-bearing. Single-
sample sweeps trivially pass (no differences to take).

Raises `ValueError` on shape mismatch, non-1-D inputs, unknown
metric, or negative threshold.

### `precision_sensitivity` — `check_precision_sensitivity(output_f32, output_f64, tolerance_rel) -> CheckResult`

Element-wise relative agreement between single- and double-precision
evaluations of the same closed-form output. Reference magnitude is
taken from the f64 input; zero-magnitude references fall back to
absolute-difference comparison against `tolerance_rel`. `passed` iff
every element's relative diff `<= tolerance_rel`.

Raises `ValueError` on shape mismatch or negative tolerance.

### `bound_preservation` — `check_bound_preservation(output_values, lower_bound, upper_bound) -> CheckResult`

Element-wise admissibility against an optional `[lower_bound,
upper_bound]` window. Either bound may be `None` to disable that
side; both `None` is a trivial pass. `passed` iff no element violates
either bound (bounds are inclusive).

`details` includes `n_below`, `n_above`, `min_value`, `max_value`,
and `n_elements` for downstream diagnostics.

## Dependencies (Phase 1 Stage 1)

| Name | Version | Rationale (spec § 9.2) | Provenance |
|---|---|---|---|
| `numpy` | ≥ 2.0 | Array operations for the three checks | Inherited from `tools/diagnostics/pyproject.toml` (FACT) |
| `pytest` | ≥ 8.0 | Test runner | Inherited from `tools/diagnostics/pyproject.toml` `[project.optional-dependencies.dev]` (FACT) |

No new dependencies introduced by this substack. The Stage 3
`docs/dependencies.md` consolidation has no entry to add from
closed-form; the staging entry in
`common/common-cpp/_staging/deps.md` / `common/common-py/_staging/deps.md`
covers the new common modules only.

## Verification posture (Roy 2005)

- **Code verification:** synthetic fixtures with analytic expected
  values (e.g., `sin(πp)` for smoothness, deliberate step functions
  for discontinuity detection). 23 tests; all pass on Stage 1 commit.
- **Solution / model / calculation verification:** not applicable
  (Tier 2 checks are infrastructure, not simulations).

## Stage 1 commit-time test outcome (FACT)

```
============================== 23 passed in 0.20s ==============================
```

Captured at HEAD just before commit; see Stage 1 checkpoint log for
the SHA and any subsequent drift.

## Consumers (forward-looking)

Consumed by Phase 1 Stage 2's `strange-attractors` and
`mandelbulb-explorer` failing-test suites per charter § 7.4. Stage 2's
probe reports cite the exact `CheckResult` shape, the three check
signatures, and this doc's source-layout table.

INFERENCE: Stage 2 probes will reference the substack at the same
import path as written here (`diagnostics.tier2.closed_form`); a
Stage 1 checkpoint addendum will flag any path drift if Stage 2's
re-anchor uncovers one.
