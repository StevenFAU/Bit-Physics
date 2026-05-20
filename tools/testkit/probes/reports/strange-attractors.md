---
date: 2026-05-20
author: phase1-agent
sim: strange-attractors
status: phase1-bootstrap-failing
head_sha: bcd9cb2b241075e168d7faa41b93ad695d9a2581
evidence_hashes: {}
---

# Pre-implementation probe — strange-attractors

> Per charter § 3.8 (IC-8). Every enumeration in §§ 1–5 is
> grep-verified against AS-COMMITTED surfaces at the recorded
> `head_sha`. The `evidence_hashes:` map is populated at commit time
> with the per-sim failing-tests-output sha256 (see standing order 3,
> spec § 1.3 step 4 / R9 amendment).

## 1. Common-module API surface consumed

Phase 1 Stage 2 sims target Stack B (TypeScript/WGSL) for the eventual
sim runtime; the failing-tests Python suite imports nothing from
common-cpp / common-py. The Phase 2+ Stack B implementation will
consume `@bit-physics/common-ts` (Phase 0 deliverable; charter does
not enumerate it under IC-1..IC-7 because common-ts is Phase 0, not
Stage 1).

| API path | Signature (verbatim at head_sha) | Verified |
|---|---|---|
| `common/common-ts/src/index.ts:4` `createContext` | `function createContext(options?: CreateContextOptions): Promise<DeviceContext>` (FACT: grep `common/common-ts/src/index.ts:4`) | ✓ at `bcd9cb2` |
| `common/common-ts/src/index.ts:18` `ComputePipeline` | `class ComputePipeline { static create(ctx, code, options?): Promise<ComputePipeline> }` (FACT: grep `common/common-ts/src/index.ts:18`) | ✓ at `bcd9cb2` |
| `common/common-ts/src/index.ts:21` `CaptureWriter` | `class CaptureWriter { constructor(manifest, outDir); addStep(...); finalize(): string }` (FACT: grep `common/common-ts/src/index.ts:21`) | ✓ at `bcd9cb2` |
| `common/common-ts/src/index.ts:20` `CaptureManifest` (type) | exported as `type` from `./capture.js` (FACT: grep `common/common-ts/src/index.ts:20`) | ✓ at `bcd9cb2` |

## 2. Tier 2 diagnostic check functions referenced

The sim consumes IC-7 (closed_form) at AS-COMMITTED Stage 1 surface
(see `docs/_audits/phase-1/stage-1-checkpoint-final-2026-05-20T12-10-58Z.md`
§ 5 — IC-7 row).

| Check function | Signature (verbatim) | Verified |
|---|---|---|
| `diagnostics.tier2.closed_form.check_output_stability` | `check_output_stability(p, y, mode, *, threshold) -> CheckResult` (FACT: grep `tools/diagnostics/diagnostics/tier2/closed_form/output_stability.py`) | ✓ at `bcd9cb2` |
| `diagnostics.tier2.closed_form.check_precision_sensitivity` | `check_precision_sensitivity(eval_fn, parameters, *, threshold) -> CheckResult` (FACT: grep `tools/diagnostics/diagnostics/tier2/closed_form/precision_sensitivity.py`) | ✓ at `bcd9cb2` |
| `diagnostics.tier2.closed_form.check_bound_preservation` | `check_bound_preservation(values, *, lo, hi) -> CheckResult` (FACT: grep `tools/diagnostics/diagnostics/tier2/closed_form/bound_preservation.py`) | ✓ at `bcd9cb2` |
| `diagnostics.tier2._types.CheckResult` (dataclass) | `CheckResult(passed: bool, message: str, value: float | None)` (FACT: grep `tools/diagnostics/diagnostics/tier2/_types.py`) | ✓ at `bcd9cb2` |

Tier 1 reference (Phase 0 surface, unchanged through Stage 1):

| Check function | Signature | Verified |
|---|---|---|
| `diagnostics.tier1.health.check_health` | `check_health(arrays, ...) -> HealthReport` (FACT: grep `tools/diagnostics/diagnostics/tier1/health.py`) | ✓ at `bcd9cb2` |
| `diagnostics.tier1.determinism.check_determinism` | wraps `tools/testkit/determinism/run_twice_and_diff` (FACT: grep `tools/diagnostics/diagnostics/tier1/determinism.py`) | ✓ at `bcd9cb2` |

## 3. Upstream citations

No vendored code at Phase 1. Citations are textual; verified DOIs.

| Citation | Verified source | Vendored at |
|---|---|---|
| Lorenz, E. N. (1963) — `J. Atmos. Sci.` 20 (2), 130–141 | DOI 10.1175/1520-0469(1963)020\<0130:DNF\>2.0.CO;2 | (algebraic ground truth) |
| Rössler, O. E. (1976) — `Phys. Lett. A` 57 (5), 397–398 | DOI 10.1016/0375-9601(76)90101-8 | (algebraic ground truth) |
| Sprott, J. C. (1994) — `Phys. Rev. E` 50 (2), R647–R650 | DOI 10.1103/PhysRevE.50.R647 | (algebraic ground truth) |
| Sparrow, C. (1982) — *The Lorenz Equations* | ISBN 0-387-90775-0 | (textbook anchor) |
| Strogatz, S. H. (1994) — *Nonlinear Dynamics and Chaos* | ISBN 0-201-54344-3 | (textbook anchor) |
| Aizawa, Y. (1982) — `Prog. Theor. Phys.` 68 (1), 64–84 | (no DOI located; INFERENCE — cited in Sprott 2003 textbook catalog) | (algebraic ground truth) |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/closed-form/lorenz-structural.json` | golden | from `tools/testkit/golden/derivations/lorenz-structural.md`; SymPy-verified by `tools/testkit/golden/generator/lorenz_structural.py --verify` |
| `tests/fixtures/legacy-captures/strange-attractors-ref.{h5,json}` | legacy-capture placeholder | Phase 1 ships sidecar JSON + stub `.h5`; per-sim implementation phase replaces with the canonical capture from the NumPy reference |
| `tools/testkit/failing-tests-evidence/strange-attractors-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 / R9 amendment; sha256 logged in this probe's `evidence_hashes` and in the commit footer |

## 5. Public exports the sim will provide (Phase 2+ implementation contract)

The sim's Phase 2+ public surface — verified using grammar (c) `<API X has shape Y>` against the Phase 2+ commit, NOT this Stage 2 commit (where the symbols deliberately do not exist):

```python
# packages/strange-attractors/strange_attractors/__init__.py
from .reference.lorenz import (
    fixed_points,
    origin_jacobian_eigenvalues,
    divergence,
    lorenz_field,
)
from .reference.rossler import rossler_field
from .reference.aizawa import aizawa_field
from .reference.sprott import sprott_a_field
from .integrator import rk4_evolve
from .sim import sim_runner_seeded
from .invariants import (
    volume_contraction_rate_constant,
    rk4_time_reversibility_modulo_dissipation,
)
```

Signatures (Phase 2+ contract):

| Export | Signature | Consumed by |
|---|---|---|
| `strange_attractors.reference.lorenz.fixed_points` | `fixed_points(*, sigma: float, rho: float, beta: float) -> dict[str, list[float]]` | `tests/test_lorenz_structural_golden.py::test_fixed_points` |
| `strange_attractors.reference.lorenz.origin_jacobian_eigenvalues` | `origin_jacobian_eigenvalues(*, sigma: float, rho: float, beta: float) -> list[float]` | `tests/test_lorenz_structural_golden.py::test_origin_jacobian_eigenvalues` |
| `strange_attractors.reference.lorenz.divergence` | `divergence(*, sigma: float, rho: float, beta: float) -> float` | `tests/test_lorenz_structural_golden.py::test_divergence_constant_in_x` |
| `strange_attractors.sim.sim_runner_seeded` | `sim_runner_seeded(seed: int, out_dir: Path) -> Path` | testkit `SimRunner` Protocol; determinism + diagnostics tests |

## 6. Verification flowchart

Each test loads a fixture, exercises the sim, runs a check, asserts an expected state.

| Test | Verification | Fixture | Expected state (Phase 1) |
|---|---|---|---|
| `tests/test_lorenz_structural_golden.py::test_fixed_points` | golden-value at canonical params | `tools/testkit/golden/tables/closed-form/lorenz-structural.json` | RED (`ModuleNotFoundError: No module named 'strange_attractors.reference'`) |
| `tests/test_lorenz_structural_golden.py::test_origin_jacobian_eigenvalues` | same | same | RED (same) |
| `tests/test_lorenz_structural_golden.py::test_divergence_constant_in_x` | same | same | RED (same) |
| `tests/test_determinism.py::test_run_twice_bit_exact` | `run_twice_and_diff` via testkit | (none — sim writes its own canonical capture) | RED (`ModuleNotFoundError: 'strange_attractors.sim'`) |
| `tests/test_determinism.py::test_cross_seed_distinct` | same | same | RED (same) |
| `tests/test_pbt_invariants.py::test_lorenz_origin_volume_contraction` | PBT — Lorenz divergence constant in x | hypothesis strategy (Phase 2+) | RED (`ModuleNotFoundError: 'strange_attractors.invariants'`) |
| `tests/test_pbt_invariants.py::test_rk4_time_reversibility_sprott_a` | PBT — Sprott-A is volume-preserving | same | RED (same) |
| `tests/test_diagnostics.py::test_tier1_health_no_nan_inf` | `diagnostics.tier1.health.check_health` | canonical capture (Phase 2+) | RED (`ModuleNotFoundError: 'strange_attractors.sim'`) |
| `tests/test_diagnostics.py::test_tier2_closed_form_bound_preservation` | `diagnostics.tier2.closed_form.check_bound_preservation` | same | RED (same) |
| `tests/test_diagnostics.py::test_tier2_closed_form_output_stability_parameter_sweep` | `check_output_stability` | parameter sweep over Lorenz `rho` (Phase 2+) | RED (same) |
| `tests/test_diagnostics.py::test_tier2_closed_form_precision_sensitivity_single_vs_double` | `check_precision_sensitivity` | f32 vs f64 evaluation (Phase 2+) | RED (same) |
