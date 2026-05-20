---
date: 2026-05-20
author: phase1-agent
sim: mandelbulb-explorer
status: phase1-bootstrap-failing
head_sha: bcd9cb2b241075e168d7faa41b93ad695d9a2581
evidence_hashes: {}
---

# Pre-implementation probe — mandelbulb-explorer

> Per charter § 3.8 (IC-8). Every enumeration grep-verified at
> `head_sha`. The `evidence_hashes:` map is populated at commit time
> per spec § 1.3 step 4 / R9 amendment.

## 1. Common-module API surface consumed

The Phase 2+ Stack B implementation consumes `@bit-physics/common-ts`
(Phase 0 deliverable). The Phase 1 failing-tests suite is Python-only
and imports nothing from common-*.

| API path | Signature (verbatim at head_sha) | Verified |
|---|---|---|
| `common/common-ts/src/index.ts:4` `createContext` | `function createContext(options?: CreateContextOptions): Promise<DeviceContext>` | ✓ at `bcd9cb2` |
| `common/common-ts/src/index.ts:18` `RenderPipeline` | re-exported from `./pipelines.js` (FACT: grep `common/common-ts/src/index.ts:18`) | ✓ at `bcd9cb2` |
| `common/common-ts/src/index.ts:21` `CaptureWriter` | (used by Phase 2+ render-pass capture) | ✓ at `bcd9cb2` |

## 2. Tier 2 diagnostic check functions referenced

IC-7 (closed_form), AS-COMMITTED at Stage 1:

| Check function | Signature | Verified |
|---|---|---|
| `diagnostics.tier2.closed_form.check_output_stability` | `(p, y, mode, *, threshold) -> CheckResult` | ✓ at `bcd9cb2` |
| `diagnostics.tier2.closed_form.check_precision_sensitivity` | `(eval_fn, parameters, *, threshold) -> CheckResult` | ✓ at `bcd9cb2` |
| `diagnostics.tier2.closed_form.check_bound_preservation` | `(values, *, lo, hi) -> CheckResult` | ✓ at `bcd9cb2` |
| `diagnostics.tier1.health.check_health` | `(arrays, ...) -> HealthReport` | ✓ at `bcd9cb2` |
| `diagnostics.tier1.determinism.check_determinism` | wraps testkit `run_twice_and_diff` | ✓ at `bcd9cb2` |

## 3. Upstream citations

No vendored code at Phase 1.

| Citation | Verified source | Vendored at |
|---|---|---|
| Quilez, I. (2009) | <https://iquilezles.org/articles/mandelbulb/> | (algebraic ground truth) |
| Hart, J. C. (1996) — *Visual Computer* 12 (10) | DOI 10.1007/s003710050084 | (algebraic ground truth) |
| Hart, Sandin, Kauffman (1989) — *SIGGRAPH* 23 (3) | DOI 10.1145/74334.74363 | (algebraic ground truth) |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json` | golden | from `tools/testkit/golden/derivations/mandelbulb-de-samples.md`; SymPy-verified by `tools/testkit/golden/generator/mandelbulb_de_samples.py --verify` |
| `tests/fixtures/legacy-captures/mandelbulb-explorer-ref.{h5,json}` | legacy-capture placeholder | Phase 1 ships sidecar JSON + stub `.h5` |
| `tools/testkit/failing-tests-evidence/mandelbulb-explorer-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports the sim will provide (Phase 2+ implementation contract)

```python
# packages/mandelbulb-explorer/mandelbulb_explorer/__init__.py
from .reference.quilez import distance_estimator, iterate_map
from .reference.march import sphere_trace
from .sim import sim_runner_seeded
from .invariants import (
    de_lower_bound_property,
    map_p8_z_inversion_symmetry,
)
```

Signatures (Phase 2+ contract):

| Export | Signature | Consumed by |
|---|---|---|
| `mandelbulb_explorer.reference.quilez.distance_estimator` | `distance_estimator(*, c: list[float], p: int, escape_radius: float, n_max: int) -> float` | `tests/test_de_samples_golden.py` |
| `mandelbulb_explorer.reference.march.sphere_trace` | `sphere_trace(*, origin, direction, max_steps, hit_eps, max_dist) -> Hit` | render-pass tests (Phase 2+) |
| `mandelbulb_explorer.sim.sim_runner_seeded` | `sim_runner_seeded(seed: int, out_dir: Path) -> Path` | testkit `SimRunner` Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state (Phase 1) |
|---|---|---|---|
| `tests/test_de_samples_golden.py::test_de_at_anchor[origin]` | golden-value | `mandelbulb-de-samples.json` | RED (`ModuleNotFoundError: 'mandelbulb_explorer.reference'`) |
| `tests/test_de_samples_golden.py::test_de_at_anchor[bounding-sphere-x-axis]` | golden-value | same | RED (same) |
| `tests/test_de_samples_golden.py::test_de_at_anchor[far-field-x-axis-10]` | golden-value | same | RED (same) |
| `tests/test_determinism.py::test_run_twice_bit_exact` | `run_twice_and_diff` | sim canonical capture | RED (`ModuleNotFoundError: 'mandelbulb_explorer.sim'`) |
| `tests/test_pbt_invariants.py::test_de_lower_bound_property` | PBT — DE ≤ true distance | hypothesis (Phase 2+) | RED (`ModuleNotFoundError: 'mandelbulb_explorer.invariants'`) |
| `tests/test_pbt_invariants.py::test_map_p8_z_inversion_symmetry` | PBT — phi → phi+pi/4 invariance | same | RED (same) |
| `tests/test_diagnostics.py::test_tier1_health_no_nan_inf_on_de_sample_grid` | Tier 1 NaN/Inf | sim canonical capture | RED |
| `tests/test_diagnostics.py::test_tier2_closed_form_bound_preservation_de_nonneg` | IC-7 `check_bound_preservation` | same | RED |
| `tests/test_diagnostics.py::test_tier2_closed_form_output_stability_camera_sweep` | IC-7 `check_output_stability` | camera sweep capture | RED |
| `tests/test_diagnostics.py::test_tier2_closed_form_precision_sensitivity_f32_vs_f64` | IC-7 `check_precision_sensitivity` | sim eval at sample grid | RED |
