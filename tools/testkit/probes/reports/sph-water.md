---
date: 2026-05-20
author: phase1-agent
sim: sph-water
status: phase1-bootstrap-failing
head_sha: a159086
evidence_hashes: {}
---

# Pre-implementation probe — sph-water

> Per charter § 3.8 (IC-8). Enumerations grep-verified at `head_sha`.

## 1. Common-module API surface consumed

Stage 1 common-cpp surfaces AS-COMMITTED at `f30dc03`:

| API path | Signature | Verified |
|---|---|---|
| `common/common-cpp/include/bit_physics/common/capture.hpp` `Reader` (IC-1) | per Stage 1 (raw-binary-v1 shift) | ✓ at `a159086` |
| `common/common-cpp/include/bit_physics/common/capture.hpp` `Writer` (IC-1) | per Stage 1 | ✓ at `a159086` |
| `common/common-cpp/include/bit_physics/common/determinism.hpp` `Config` (IC-3) | per Stage 1 | ✓ at `a159086` |

## 2. Tier 2 diagnostic check functions referenced

IC-5 particle (Stage 1) + Tier 1:

| Check function | Signature | Verified |
|---|---|---|
| `diagnostics.tier2.particle.check_no_overlap` | `(positions, epsilon) -> CheckResult` | ✓ at `a159086` |
| `diagnostics.tier2.particle.check_neighbor_list_integrity` | per Stage 1 | ✓ at `a159086` |
| `diagnostics.tier2.particle.check_momentum_conservation` | per Stage 1 (advisory) | ✓ at `a159086` |
| `diagnostics.tier2.particle.check_count_invariance` | per Stage 1 | ✓ at `a159086` |
| `diagnostics.tier1.health.check_health` | `(arrays, ...) -> HealthReport` | ✓ at `a159086` |

## 3. Upstream citations + vendored

Vendored manifest verified per playbook P4:

| Item | Value | Source |
|---|---|---|
| `references/SPlisHSPlasH/MANIFEST.toml` `[upstream].sha` | `6bff55a6eaf14083d34650f22a268ce156b62b54` | grep `references/SPlisHSPlasH/MANIFEST.toml:4` |
| `references/SPlisHSPlasH/MANIFEST.toml` `[upstream].version` | `2.16.1` | grep `references/SPlisHSPlasH/MANIFEST.toml:3` |
| `references/SPlisHSPlasH/MANIFEST.toml` `[upstream].license` | `MIT` | grep `references/SPlisHSPlasH/MANIFEST.toml:6` |
| `references/SPlisHSPlasH/LICENSE` | exists, MIT | filesystem |
| `references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h` | exists | filesystem |

| Citation | Verified source |
|---|---|
| Bender & Koschier 2015 | DOI 10.1145/2786784.2786796 |
| Monaghan 2005 | DOI 10.1088/0034-4885/68/8/R01 |
| Monaghan 1992 | DOI 10.1146/annurev.aa.30.090192.002551 |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/cubic-spline-kernel.json` | golden (Phase 0; unchanged) | Phase 0 `cubic_spline.py --verify` |
| `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json` | golden (Stage 2, this commit) | `dfsph_density_evolution.py --verify` OK |
| `tests/fixtures/legacy-captures/sph-water-ref.{h5,json}` | legacy-capture placeholder | descriptor `dam-break-1M-particles-seed42-step1000` |
| `tools/testkit/failing-tests-evidence/sph-water-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports (Phase 2+ contract)

```python
# packages/sph-water/sph_water/__init__.py (Phase 2+)
from .reference.dfsph import density, density_evolution, divergence_free_solve
from .sim import sim_runner_seeded
from .invariants import density_nonneg, kernel_normalization_unit_volume
```

| Export | Signature | Consumed by |
|---|---|---|
| `sph_water.reference.dfsph.density` | `(particles, h) -> list[float]` | `tests/test_dfsph_density_golden.py` |
| `sph_water.reference.dfsph.density_evolution` | `(particles, h) -> list[float]` | same |
| `sph_water.sim.sim_runner_seeded` | `(seed: int, out_dir: Path) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_dfsph_density_golden.py::test_density_at_two_particle_fixture` | golden | `dfsph-density-evolution.json` | RED (`ModuleNotFoundError: 'sph_water.reference'`) |
| `test_dfsph_density_golden.py::test_density_evolution_at_two_particle_fixture` | golden | same | RED (same) |
| `test_cubic_spline_kernel_golden.py::test_W_matches_phase0_pin` | golden (Phase 0 anchor) | `cubic-spline-kernel.json` | RED (same) |
| `test_determinism.py::test_run_twice_epsilon_diff` | epsilon `run_twice_and_diff` | sim capture | RED (`ModuleNotFoundError: 'sph_water.sim'`) |
| `test_pbt_invariants.py::*` | PBT | hypothesis | RED (`ModuleNotFoundError: 'sph_water.invariants'`) |
| `test_diagnostics.py::*` | Tier 1 + IC-5 | sim capture | RED (`ModuleNotFoundError: 'sph_water.sim'`) |
