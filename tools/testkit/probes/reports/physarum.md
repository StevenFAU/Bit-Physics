---
date: 2026-05-20
author: phase1-agent
sim: physarum
status: phase1-bootstrap-failing
head_sha: 9766498
evidence_hashes: {}
---

# Pre-implementation probe — physarum

> Per charter § 3.8 (IC-8). Enumerations grep-verified at `head_sha`.

## 1. Common-module API surface consumed

Phase 2+ Stack B consumes `@bit-physics/common-ts`.

| API path | Signature | Verified |
|---|---|---|
| `common/common-ts/src/index.ts:4` `createContext` | `function createContext(...) -> Promise<DeviceContext>` | ✓ at `9766498` |
| `common/common-ts/src/index.ts:18` `ComputePipeline` | class declaration | ✓ at `9766498` |
| `common/common-ts/src/index.ts:21` `CaptureWriter` | class declaration | ✓ at `9766498` |

## 2. Tier 2 diagnostic check functions referenced

IC-5 particle (Stage 1) + scalar_field (Phase 0) + Tier 1:

| Check function | Signature | Verified |
|---|---|---|
| `diagnostics.tier2.particle.check_count_invariance` | `(counts) -> CheckResult` | ✓ at `9766498` |
| `diagnostics.tier2.scalar_field.check_bounds` | `(field, lo, hi) -> BoundsReport` | ✓ at `9766498` |
| `diagnostics.tier2.scalar_field.check_conservation` | `(field_before, field_after, ...) -> ConservationReport` | ✓ at `9766498` (advisory — physarum decays) |
| `diagnostics.tier1.health.check_health` | `(arrays, ...) -> HealthReport` | ✓ at `9766498` |

## 3. Upstream citations

| Citation | Verified source | Vendored at |
|---|---|---|
| Jones, J. (2010) — *Artificial Life* 16 (2) | DOI 10.1162/artl.2010.16.2.16202 | (algebraic ground truth) |

## 4. Test fixture paths

| Path | Type | Derivation |
|---|---|---|
| `tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json` | golden (deterministic limit) | `tools/testkit/golden/derivations/physarum-deposit-step1.md`; generator `physarum_deposit_step1.py --verify` OK |
| `tests/fixtures/legacy-captures/physarum-ref.{h5,json}` | legacy-capture placeholder | per-sim implementation phase populates with `physarum-jones-256x256-seed42-step10000` |
| `tools/testkit/failing-tests-evidence/physarum-<UTC>.txt` | failing-tests output | spec § 1.3 step 4 |

## 5. Public exports (Phase 2+ contract)

```python
# packages/physarum/physarum/__init__.py (Phase 2+)
from .reference import step_to_deposit, evolve, canonical_params
from .sim import sim_runner_seeded
from .invariants import trail_mass_conserves_modulo_decay, agent_count_invariant
```

| Export | Signature | Consumed by |
|---|---|---|
| `physarum.reference.step_to_deposit` | `step_to_deposit(*, grid_shape, agents, params) -> list[list[float]]` | `tests/test_deposit_golden.py` |
| `physarum.sim.sim_runner_seeded` | `sim_runner_seeded(seed: int, out_dir: Path) -> Path` | testkit Protocol |

## 6. Verification flowchart

| Test | Verification | Fixture | Expected state |
|---|---|---|---|
| `test_deposit_golden.py::test_deposit_cells_exact` | golden (deterministic limit) | `physarum-deposit-step1.json` | RED (`ModuleNotFoundError: 'physarum.reference'`) |
| `test_deposit_golden.py::test_total_mass_after_decay` | golden + decay calc | same | RED (same) |
| `test_determinism.py::test_run_twice_bit_exact_zero_trail_limit` | `run_twice_and_diff` | sim capture | RED (`ModuleNotFoundError: 'physarum.sim'`) |
| `test_determinism.py::test_run_twice_epsilon_chaotic_regime` | epsilon `run_twice_and_diff` | sim capture | RED (same) |
| `test_pbt_invariants.py::test_trail_mass_conserves_modulo_decay` | PBT | hypothesis | RED (`ModuleNotFoundError: 'physarum.invariants'`) |
| `test_pbt_invariants.py::test_agent_count_invariant` | PBT | same | RED (same) |
| `test_diagnostics.py::*` | Tier 1 + IC-5 + scalar_field | sim capture | RED (`ModuleNotFoundError: 'physarum.sim'`) |
