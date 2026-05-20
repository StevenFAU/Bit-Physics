---
date: 2026-05-20
author: phase1-agent
sim: eulerian-smoke
status: phase1-bootstrap-failing
head_sha: cd20faa
evidence_hashes: {}
---

# Pre-implementation probe — eulerian-smoke

> Per charter § 3.8 (IC-8). Enumerations grep-verified at `head_sha`.

## 1. Common-module API surface consumed

Stage 1 common-cpp + Stage 1 vector_field surfaces:

| API path | Signature | Verified |
|---|---|---|
| `common/common-cpp/include/bit_physics/common/capture.hpp` `Reader/Writer` (IC-1) | per Stage 1 | ✓ at `cd20faa` |
| `common/common-cpp/include/bit_physics/common/determinism.hpp` `Config` (IC-3) | per Stage 1 | ✓ at `cd20faa` |

## 2. Tier 2 diagnostic check functions referenced

IC-6 vector_field (Stage 1) + Tier 1:

| Check function | Source | Verified |
|---|---|---|
| `diagnostics.tier2.vector_field.check_divergence_free` | Stage 1 commit `39f2c97` | ✓ at `cd20faa` |
| `diagnostics.tier2.vector_field.check_circulation` | same | ✓ at `cd20faa` |
| `diagnostics.tier2.vector_field.check_helicity` | same | ✓ at `cd20faa` |
| `diagnostics.tier2.vector_field.check_energy_spectrum` | same | ✓ at `cd20faa` |
| `diagnostics.tier1.health.check_health` | Phase 0 | ✓ at `cd20faa` |

## 3. Upstream citations

| Citation | Verified source |
|---|---|
| Stam 1999 — *SIGGRAPH '99* | DOI 10.1145/311535.311548 |
| Fedkiw, Stam, Jensen 2001 — *SIGGRAPH '01* | DOI 10.1145/383259.383260 |
| Taylor & Green 1937 — *Proc. R. Soc. A* 158 | DOI 10.1098/rspa.1937.0036 |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/{solution.py, derivation.md, __init__.py}` | MMS solution | Taylor-Green-style; SymPy ≡ NumPy at (0.1, 0.2, 0.3) within 1e-12 |
| `tests/fixtures/legacy-captures/eulerian-smoke-ref.{h5,json}` | legacy-capture placeholder | descriptor `stam-puff-128cube-seed42-step500` |
| `tools/testkit/failing-tests-evidence/eulerian-smoke-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports (Phase 2+ contract)

```python
# packages/eulerian-smoke/eulerian_smoke/__init__.py (Phase 2+)
from .reference.stable_fluids import stable_fluids_step, project_pressure
from .sim import sim_runner_seeded
from .invariants import divergence_free_post_projection, smoke_density_nonneg
```

| Export | Signature | Consumed by |
|---|---|---|
| `eulerian_smoke.reference.stable_fluids.stable_fluids_step` | `(u, v, p, params, source) -> (u_next, v_next, p_next)` | `tests/test_mms_convergence.py` |
| `eulerian_smoke.sim.sim_runner_seeded` | `(seed, out_dir) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_mms_convergence.py::test_mms_observed_ooa_advection_matches_formal` | MMS OOA | NS-2D MMS | RED (`ModuleNotFoundError: 'eulerian_smoke.reference'`) |
| `test_mms_convergence.py::test_mms_observed_ooa_projection_matches_formal` | MMS OOA | same | RED (same) |
| `test_determinism.py::test_run_twice_epsilon_diff` | epsilon `run_twice_and_diff` | sim capture | RED (`ModuleNotFoundError: 'eulerian_smoke.sim'`) |
| `test_pbt_invariants.py::*` | PBT | hypothesis | RED (`ModuleNotFoundError: 'eulerian_smoke.invariants'`) |
| `test_diagnostics.py::*` | Tier 1 + IC-6 | sim capture | RED (`ModuleNotFoundError: 'eulerian_smoke.sim'`) |
