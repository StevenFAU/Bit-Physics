---
date: 2026-05-20
author: phase1-agent
sim: mpm-multimaterial
status: phase1-bootstrap-failing
head_sha: b6abd7e
evidence_hashes: {}
---

# Pre-implementation probe — mpm-multimaterial

> Per charter § 3.8 (IC-8). Enumerations grep-verified at `head_sha`.

## 1. Common-module API surface consumed

Stage 1 common-py surfaces AS-COMMITTED at `bcd9cb2` (per Stage 1
final checkpoint § 5 + B12 fix):

| API path | Signature | Verified |
|---|---|---|
| `common/common-py/src/common_py/capture.py` (IC-2) `Reader`, `Writer` | per Stage 1 (wraps Phase 0 `capture.CaptureManifest`) | ✓ at `b6abd7e` |
| `common/common-py/src/common_py/determinism.py` (IC-4) `Config` | per Stage 1 | ✓ at `b6abd7e` |
| `common/common-py/src/common_py/ggui.py` | Taichi GGUI F-key workaround (spec § 4.4 limitation #1) | ✓ at `b6abd7e` |
| `common/common-py/src/common_py/hotreload.py` | watchfiles-based source re-exec (spec § 4.4 limitation #3) | ✓ at `b6abd7e` |

## 2. Tier 2 diagnostic check functions referenced

IC-5 particle + IC-6 vector_field (Stage 1) + Tier 1:

| Check function | Verified |
|---|---|
| `diagnostics.tier2.particle.check_count_invariance` | ✓ at `b6abd7e` |
| `diagnostics.tier2.particle.check_momentum_conservation` | ✓ at `b6abd7e` |
| `diagnostics.tier2.vector_field.check_circulation` (grid momentum) | ✓ at `b6abd7e` |
| `diagnostics.tier1.health.check_health` | ✓ at `b6abd7e` |

## 3. Upstream citations

| Citation | Verified source |
|---|---|
| Hu, Y. et al. (2018) — *ACM TOG* 37 (4) | DOI 10.1145/3197517.3201293 |
| 88-line MLS-MPM reference | <https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp> |
| Steffen, Kirby & Berzins (2008) — *IJNME* 76 (6) | DOI 10.1002/nme.2360 |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` | golden | `mls-mpm-quadratic-bspline.md`; `mls_mpm_quadratic_bspline.py --verify` OK |
| `tests/fixtures/legacy-captures/mpm-multimaterial-ref.{h5,json}` | legacy-capture placeholder | descriptor `drop-impact-128cube-seed42-step500` (R8 amendment) |
| `tools/testkit/failing-tests-evidence/mpm-multimaterial-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports (Phase 2+ contract)

```python
# packages/mpm-multimaterial/mpm_multimaterial/__init__.py (Phase 2+)
from .reference.shape_functions import N, partition_of_unity_sum
from .reference.mls_mpm import p2g, g2p, deformation_update
from .sim import sim_runner_seeded
from .invariants import mass_conservation_p2g_g2p, partition_of_unity_b_spline
```

| Export | Signature | Consumed by |
|---|---|---|
| `mpm_multimaterial.reference.shape_functions.N` | `N(x: float) -> float` | `tests/test_quadratic_bspline_golden.py` |
| `mpm_multimaterial.reference.shape_functions.partition_of_unity_sum` | `(p: float) -> float` | same |
| `mpm_multimaterial.sim.sim_runner_seeded` | `(seed, out_dir) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_quadratic_bspline_golden.py::test_sample_values_match_golden` | golden | `mls-mpm-shape-functions.json` | RED (`ModuleNotFoundError: 'mpm_multimaterial.reference'`) |
| `test_quadratic_bspline_golden.py::test_partition_of_unity_match_golden` | golden | same | RED (same) |
| `test_determinism.py::test_run_twice_epsilon_diff` | epsilon `run_twice_and_diff` | sim capture | RED (`ModuleNotFoundError: 'mpm_multimaterial.sim'`) |
| `test_pbt_invariants.py::*` | PBT | hypothesis | RED (`ModuleNotFoundError: 'mpm_multimaterial.invariants'`) |
| `test_diagnostics.py::*` | Tier 1 + IC-5 + IC-6 | sim capture | RED (`ModuleNotFoundError: 'mpm_multimaterial.sim'`) |
