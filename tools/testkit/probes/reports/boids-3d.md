---
date: 2026-05-20
author: phase1-agent
sim: boids-3d
status: phase1-bootstrap-failing
head_sha: 9766498
evidence_hashes: {}
---

# Pre-implementation probe — boids-3d

> Per charter § 3.8 (IC-8). All enumerations grep-verified at
> `head_sha`. `evidence_hashes:` populated at commit time per spec
> § 1.3 step 4.

## 1. Common-module API surface consumed

Phase 2+ Stack B implementation consumes `@bit-physics/common-ts`
(Phase 0). Phase 1 failing-tests are Python-only.

| API path | Signature | Verified |
|---|---|---|
| `common/common-ts/src/index.ts:4` `createContext` | `function createContext(...) -> Promise<DeviceContext>` | ✓ at `9766498` |
| `common/common-ts/src/index.ts:18` `ComputePipeline` | `class ComputePipeline { static create(...) }` | ✓ at `9766498` |
| `common/common-ts/src/index.ts:21` `CaptureWriter` | class declaration | ✓ at `9766498` |

## 2. Tier 2 diagnostic check functions referenced

IC-5 (particle) AS-COMMITTED at Stage 1 + Tier 1 from Phase 0:

| Check function | Signature (verbatim) | Verified |
|---|---|---|
| `diagnostics.tier2.particle.check_no_overlap` | `(positions, epsilon) -> CheckResult` | ✓ at `9766498` |
| `diagnostics.tier2.particle.check_count_invariance` | `(counts) -> CheckResult` | ✓ at `9766498` |
| `diagnostics.tier2.particle.check_neighbor_list_integrity` | `(positions, neighbor_lists, cutoff) -> CheckResult` | ✓ at `9766498` |
| `diagnostics.tier2.particle.check_momentum_conservation` | `(p, m_per_particle, dt) -> CheckResult` | ✓ at `9766498` (advisory for boids — not strictly conservative) |
| `diagnostics.tier1.health.check_health` | `(arrays, ...) -> HealthReport` | ✓ at `9766498` |

## 3. Upstream citations

| Citation | Verified source | Vendored at |
|---|---|---|
| Reynolds, C. W. (1987) | DOI 10.1145/37401.37406 | (algebraic ground truth) |
| Reynolds, C. W. (1999) — GDC notes | <https://www.red3d.com/cwr/steer/> | (algebraic ground truth) |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/agent-based/boids-3agent-step1.json` | golden | `tools/testkit/golden/derivations/boids-3agent-step1.md`; generator `boids_3agent_step1.py --verify` OK |
| `tests/fixtures/legacy-captures/boids-3d-ref.{h5,json}` | legacy-capture placeholder | per-sim implementation phase populates |
| `tools/testkit/failing-tests-evidence/boids-3d-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports the sim will provide (Phase 2+ implementation contract)

```python
# packages/boids-3d/boids_3d/__init__.py (Phase 2+)
from .reference import step_one, evolve, canonical_params
from .sim import sim_runner_seeded
from .invariants import v_max_clamp_respected, particle_count_invariant
```

| Export | Signature | Consumed by |
|---|---|---|
| `boids_3d.reference.step_one` | `step_one(*, agents: dict, params: dict) -> dict` | `tests/test_3agent_golden.py` |
| `boids_3d.sim.sim_runner_seeded` | `sim_runner_seeded(seed: int, out_dir: Path) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_3agent_golden.py::test_3agent_step1_velocity_position[A]` | golden | `boids-3agent-step1.json` | RED (`ModuleNotFoundError: 'boids_3d.reference'`) |
| `test_3agent_golden.py::test_3agent_step1_velocity_position[B]` | golden | same | RED (same) |
| `test_3agent_golden.py::test_3agent_step1_velocity_position[C]` | golden | same | RED (same) |
| `test_determinism.py::test_run_twice_bit_exact` | `run_twice_and_diff` | sim capture | RED (`ModuleNotFoundError: 'boids_3d.sim'`) |
| `test_pbt_invariants.py::test_v_max_clamp_respected` | PBT | hypothesis (Phase 2+) | RED (`ModuleNotFoundError: 'boids_3d.invariants'`) |
| `test_pbt_invariants.py::test_particle_count_invariant` | PBT | same | RED (same) |
| `test_diagnostics.py::*` | Tier 1 + IC-5 | sim capture | RED (`ModuleNotFoundError: 'boids_3d.sim'`) |
