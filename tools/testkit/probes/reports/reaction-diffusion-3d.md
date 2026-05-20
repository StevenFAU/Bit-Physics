---
date: 2026-05-20
author: phase1-agent
sim: reaction-diffusion-3d
status: phase1-bootstrap-failing
head_sha: 71b952f475e476dfa551348ce1b086b7544edf0e
evidence_hashes: {}
---

# Pre-implementation probe — reaction-diffusion-3d

> Per charter § 3.8 (IC-8). Enumerations grep-verified at `head_sha`.

## 1. Common-module API surface consumed

Phase 2+ Stack C consumes `common-cpp` for capture I/O + determinism.
AS-COMMITTED Stage 1 surface per
`docs/_audits/phase-1/stage-1-checkpoint-final-2026-05-20T12-10-58Z.md` § 5.

| API path | Signature (verbatim at head_sha) | Verified |
|---|---|---|
| `common/common-cpp/include/bit_physics/common/capture.hpp` `Reader` (IC-1) | per Stage 1 — `raw-binary-v1` payload format shift; AS-COMMITTED at `f30dc03` | ✓ at `71b952f` |
| `common/common-cpp/include/bit_physics/common/capture.hpp` `Writer` (IC-1) | per Stage 1 | ✓ at `71b952f` |
| `common/common-cpp/include/bit_physics/common/determinism.hpp` `Config` (IC-3) | per Stage 1 | ✓ at `71b952f` |

## 2. Tier 2 diagnostic check functions referenced

Phase 0 scalar_field (extant) + Stage 1 vector_field (IC-6) + Tier 1:

| Check function | Signature | Verified |
|---|---|---|
| `diagnostics.tier2.scalar_field.check_bounds` | `(field, lo, hi) -> BoundsReport` | ✓ at `71b952f` |
| `diagnostics.tier2.scalar_field.check_conservation` | `(field_before, field_after, ...) -> ConservationReport` | ✓ at `71b952f` (advisory) |
| `diagnostics.tier2.vector_field.check_divergence_free` (IC-6) | per Stage 1 commit `39f2c97` | ✓ at `71b952f` |
| `diagnostics.tier1.health.check_health` | `(arrays, ...) -> HealthReport` | ✓ at `71b952f` |

## 3. Upstream citations

| Citation | Verified source | Vendored at |
|---|---|---|
| Gray & Scott 1983 — *Chem. Eng. Sci.* 39 (6) | DOI 10.1016/0009-2509(84)87017-7 | (algebraic ground truth) |
| Pearson 1993 — *Science* 261 (5118) | DOI 10.1126/science.261.5118.189 | (algebraic ground truth) |
| Roy 2005 (V&V) — *J. Comput. Phys.* 205 (1) | DOI 10.1016/j.jcp.2004.10.017 | (MMS framework reference) |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/{solution.py, derivation.md, __init__.py}` | MMS solution (3D) | SymPy-verified at this commit; NumPy ≡ SymPy at the canonical test point within 1e-14 |
| `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/{solution.py, derivation.md, __init__.py}` | MMS solution (2D co-bundle per R8) | SymPy-verified at this commit; same precision |
| `tests/fixtures/legacy-captures/reaction-diffusion-3d-ref.{h5,json}` | legacy-capture placeholder | descriptor `gray-scott-lambda-64cube-seed42-step2000` |
| `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports (Phase 2+ contract)

```python
# packages/reaction-diffusion-3d/reaction_diffusion_3d/__init__.py (Phase 2+)
from .reference import gray_scott_step_with_source, canonical_params, evolve
from .sim import sim_runner_seeded
from .invariants import monotone_bounds, periodic_bc_satisfied
```

| Export | Signature | Consumed by |
|---|---|---|
| `reaction_diffusion_3d.reference.gray_scott_step_with_source` | `(u, v, params, source) -> (u_next, v_next)` | `tests/test_mms_convergence.py` |
| `reaction_diffusion_3d.sim.sim_runner_seeded` | `sim_runner_seeded(seed: int, out_dir: Path) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_mms_convergence.py::test_mms_observed_ooa_matches_formal_within_half_an_order` | MMS-based OOA | RD-3D MMS solution | RED (`ModuleNotFoundError: 'reaction_diffusion_3d.reference'`) |
| `test_determinism.py::test_run_twice_bit_exact` | `run_twice_and_diff` | sim canonical capture | RED (`ModuleNotFoundError: 'reaction_diffusion_3d.sim'`) |
| `test_pbt_invariants.py::test_monotone_bounds` | PBT | hypothesis | RED (`ModuleNotFoundError: 'reaction_diffusion_3d.invariants'`) |
| `test_pbt_invariants.py::test_periodic_bc_satisfied` | PBT | same | RED (same) |
| `test_diagnostics.py::*` | Tier 1 + Tier 2 scalar_field | sim capture | RED (`ModuleNotFoundError: 'reaction_diffusion_3d.sim'`) |
