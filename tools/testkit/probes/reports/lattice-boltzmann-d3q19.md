---
date: 2026-05-20
author: phase1-agent
sim: lattice-boltzmann-d3q19
status: phase1-bootstrap-failing
head_sha: 216021a
evidence_hashes: {}
---

# Pre-implementation probe — lattice-boltzmann-d3q19

> Per charter § 3.8 (IC-8). Enumerations grep-verified at `head_sha`.

## 1. Common-module API surface consumed

Stage 1 common-cpp:

| API path | Signature | Verified |
|---|---|---|
| `common/common-cpp/include/bit_physics/common/capture.hpp` `Reader/Writer` (IC-1) | per Stage 1 (raw-binary-v1) | ✓ at `216021a` |
| `common/common-cpp/include/bit_physics/common/determinism.hpp` `Config` (IC-3) | per Stage 1 | ✓ at `216021a` |

## 2. Tier 2 diagnostic check functions referenced

IC-6 vector_field (Stage 1):

| Check function | Verified |
|---|---|
| `diagnostics.tier2.vector_field.check_divergence_free` (advisory; LBM is weakly compressible) | ✓ at `216021a` |
| `diagnostics.tier2.vector_field.check_circulation` | ✓ at `216021a` |
| `diagnostics.tier1.health.check_health` | ✓ at `216021a` |

## 3. Upstream citations + vendored

**No Krüger 2017 vendoring at this Phase per R8 amendment.**
`references/Kruger*` directory absent at `head_sha` (verified by
`find references -iname 'krug*'` returning empty).

| Citation | Verified source |
|---|---|
| Qian, d'Humières & Lallemand (1992) — *Europhys. Lett.* 17 (6) | DOI 10.1209/0295-5075/17/6/001 |
| Krüger et al. (2017) — Springer textbook | ISBN 978-3-319-44649-3 (citation-only; not vendored) |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` | golden | `tools/testkit/golden/derivations/d3q19.md`; `d3q19_equilibrium.py --verify` OK |
| `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` | MMS (shared with eulerian-smoke) | Taylor-Green-style |
| `tests/fixtures/legacy-captures/lattice-boltzmann-d3q19-ref.{h5,json}` | legacy-capture placeholder | descriptor `poiseuille-channel-32cube-seed42-step5000` |
| `tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports (Phase 2+ contract)

```python
# packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/__init__.py (Phase 2+)
from .reference.equilibrium import feq, momentum_moment, density_moment
from .reference.bgk import bgk_step, stream
from .sim import sim_runner_seeded
from .invariants import equilibrium_density_moment, equilibrium_momentum_moment
```

| Export | Signature | Consumed by |
|---|---|---|
| `lattice_boltzmann_d3q19.reference.equilibrium.feq` | `(rho: float, u: list[float]) -> list[float]` (length 19) | `tests/test_d3q19_equilibrium_golden.py` |
| `lattice_boltzmann_d3q19.reference.equilibrium.momentum_moment` | `(f: list[float]) -> list[float]` (length 3) | same |
| `lattice_boltzmann_d3q19.sim.sim_runner_seeded` | `(seed, out_dir) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_d3q19_equilibrium_golden.py::test_19_f_eq_values_match_golden` | golden (all 19 directions) | `d3q19-equilibrium.json` | RED (`ModuleNotFoundError: 'lattice_boltzmann_d3q19.reference'`) |
| `test_d3q19_equilibrium_golden.py::test_density_moment_recovers_rho` | golden | same | RED (same) |
| `test_d3q19_equilibrium_golden.py::test_momentum_moment_recovers_rho_u` | golden | same | RED (same) |
| `test_mms_convergence.py::test_mms_observed_ooa_macroscopic_moments_match_formal` | MMS OOA on macroscopic moments | `incompressible_ns_2d/solution.py` | RED (same) |
| `test_determinism.py::test_run_twice_bit_exact_canonical` | `run_twice_and_diff` | sim capture | RED (`ModuleNotFoundError: 'lattice_boltzmann_d3q19.sim'`) |
| `test_pbt_invariants.py::*` | PBT | hypothesis | RED (`ModuleNotFoundError: 'lattice_boltzmann_d3q19.invariants'`) |
| `test_diagnostics.py::*` | Tier 1 + IC-6 | sim capture | RED (`ModuleNotFoundError: 'lattice_boltzmann_d3q19.sim'`) |
