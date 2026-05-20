# Diagnostic toolchain — overview

Layer 2 of the portfolio (spec § 3.3). Diagnostics consume the testkit's
capture format + determinism harness and add runtime-inspection
facilities. Three tiers; Phase 0 ships Tier 1 + Tier 2 scalar_field;
Phase 1 Stage 1 adds Tier 2 particle / vector_field / closed_form.

## Tiers

| Tier | Path | Scope |
|---|---|---|
| Tier 1 — Universal | [`tier1-universal.md`](tier1-universal.md) | Stack-agnostic, sim-agnostic. Capture I/O, health (NaN/Inf), performance, determinism. |
| Tier 2 — Scalar field | [`tier2-scalar-field.md`](tier2-scalar-field.md) | Monotone bounds, spectral content, conservation. |
| Tier 2 — Particle | [`tier2-particle.md`](tier2-particle.md) | No-overlap, neighbor-list integrity, momentum conservation, particle-count invariance. (IC-5; Phase 1 Stage 1 commit `5258f00`.) |
| Tier 2 — Vector field | [`tier2-vector-field.md`](tier2-vector-field.md) | Divergence-free, circulation, helicity, energy spectrum. (IC-6; Phase 1 Stage 1 commit `39f2c97`.) |
| Tier 2 — Closed-form | [`tier2-closed-form.md`](tier2-closed-form.md) | Output stability, precision sensitivity, bound preservation. (IC-7; Phase 1 Stage 1 commit `98e630d`.) |
| Tier 3 — Per-sim | (Phase 2+) | Sim-specific shims composing Tier 1 + Tier 2 primitives. |

## Schema-version policy

**Diagnostic modules REJECT capture manifests whose `schema_version`
major exceeds the compiled-in `SUPPORTED_SCHEMA_MAJOR` constant
(currently `1`).** Silently accepting an unknown future major means
running diagnostics against a payload structure the code doesn't
actually understand — a phantom-success failure mode (spec § 9.4
Category 6).

Minor / patch increments within the supported major are
forward-compatible: a `1.1.0` payload runs cleanly under code expecting
`1.0.0`. The constant lives in
`tools/diagnostics/diagnostics/tier1/capture_io.py:SUPPORTED_SCHEMA_MAJOR`
and is grep-pinned by `tools/diagnostics/diagnostics/tier1/tests/test_capture_io.py`.

Bumping the major (e.g. `2.0.0`) is a Phase 4 WU-A operation per spec
§ 2.12; the diagnostic toolchain is updated lockstep.

## Public surface

Per `docs/phases/phase-0-plan.md` § 3.3.6. Top-level re-exports at
`tools/diagnostics/diagnostics/__init__.py`:

- `HealthReport`, `check_health`
- `PerformanceReport`, `check_performance`
- `check_determinism` (composes `determinism.run_twice_and_diff`)
- `BoundsReport`, `check_bounds`
- `SpectralReport`, `check_spectral_content`
- `ConservationReport`, `check_conservation`
- `DiagnosticReport` (aggregate envelope with JSON serialization)

## Composition

Tier 3 sims invoke a mix of Tier 1 + Tier 2 checks and aggregate them
into a single `DiagnosticReport`:

```python
from diagnostics import (
    DiagnosticReport, check_health, check_performance,
    check_bounds, check_conservation,
)

def diagnose(capture, seed):
    report = DiagnosticReport(sim="rd-2d", seed=seed)
    report.add("tier1.health", check_health(capture))
    report.add("tier1.performance", check_performance(capture))
    report.add("tier2.scalar_field.bounds", check_bounds(capture, "U", 0.0, 1.0))
    report.add("tier2.scalar_field.conservation", check_conservation(capture, "U"))
    return report
```
