---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-1a
stage: stage-1a-checkpoint
phase: phase-2
head_sha: PENDING-COMMIT-2-SHA-BACKFILL
head_sha_at_checkpoint: 411bf3ba141e541fe7fa5bdbdbc9d7021d6bbd4b
date: 2026-05-25T16-00-00Z
verdict: stage-1a-CONFIRMED
evidence_paths:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-1a-failing-tests-2026-05-25T16-00-00Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-1a-failing-tests-2026-05-25T16-00-00Z.txt: sha256:bc310b1cd50ccaa3cfbc81da6b949623c140aa45cf1bdf32996344c88bf00232
---

# Stage 1a checkpoint — sub-phase-lattice-boltzmann-d3q19-stack-e

> EIGHTH per-sim cross-stack port; THIRD Stack-E port; SECOND LBM port. Stage 1a
> (the failing-tests scaffold) CLOSE. VERDICT **stage-1a-CONFIRMED**. Created
> `packages/lattice-boltzmann-d3q19-stack-e/` (NOT yet a workspace member —
> registration is Stage 1b per charter § 4 / D2) with the pkg skeleton + the
> SEVEN final acceptance test files (ported from the same-sim
> `lattice-boltzmann-d3q19-stack-d` content + the common-warp determinism
> socket; the dual-arm gate-4 → a dedicated gate-4a equilibrium-golden test, D17).
> The gate-13 failing-tests RED anchor: **all 7 tests collect to a clean
> `ModuleNotFoundError`** on the absent `reference`/`sim`/`invariants` submodules
> (`411bf3ba`). Integrity baseline-MATCH (`c19492ad…`; the new package adds ZERO
> findings); bit-identity replay HELD (`9399fc33…`). **0 new shifts; cumulative
> 217 (HELD).**

## § 0. Dispatch/charter scope alignment (NO conflict this stage — smoke-E S1a-SME1 inherited)

Unlike smoke-Stack-E Stage 1a (which surfaced a §0 scope conflict: its dispatch
header + charter § 6 O-2 line carried MPM-inherited "gate-10 at Stage 1a" drift),
**this sub-phase's dispatch + charter are aligned and charter-faithful for Stage
1a**: the dispatch BOUNDARIES + STAGE-1A-DELIVERABLES place implementation /
registration / gate-10 / O-2 checkpoints 2–3 at **Stage 1b**, and charter § 6's
O-2 line states "gate-10 + 2-run land at Stage 1b, NOT Stage 1a — the smoke-E
S1a-SME1 reconcile; **this charter gets it right from the start**." The smoke-E
S1a-SME1 fix was successfully inherited; **no scope conflict to surface, no STOP**
(confirming observation, not a new shift). Per Convention M the charter § 2/§ 4
"Stage 1a" rows were read as authoritative before any edit.

## § 1. Scope

Stage 1a of `sub-phase-lattice-boltzmann-d3q19-stack-e`: the failing-tests
scaffold (TDD RED anchor; gate-13). Creates
`packages/lattice-boltzmann-d3q19-stack-e/` (pkg skeleton + `pyproject.toml` +
`README.md` + `tests/` with the seven final acceptance test files) at a clean
`ModuleNotFoundError`. **Additive only** (Convention A): all new files under
`packages/lattice-boltzmann-d3q19-stack-e/`. **NOT touched** (charter § 4
boundary): root `pyproject.toml` / `uv.lock` (registration is Stage 1b), the
`reference`/`sim`/`invariants` implementation (Stage 1b), `tolerance.toml` (D6
no-op), `equivalence.md` / methodology / conventions / warp.md (Stage 2), Phase-1
source, common-warp.

## § 2. Operator routing consumed (D-class)

D2 (scaffold-only single commit), D6 (override reuse — no tolerance edit), D7
(socket-only consumption reflected in the test imports), D8/D15 (own f64 `ndim=4`
documented in README/`__init__`), D9 (determinism `tolerance=0.0` W-2 surface in
`test_determinism`), D10 (gate-14 shape-(a) bit-exact assertions in
`test_cross_stack_equivalence`), D14 (both captures LFS-committable; conftest
notes no held-local), D17 (gate-4 dual-arm → 7 test files). No re-litigation.

## § 3. Scaffold layout (Convention A; all new under the package)

```
packages/lattice-boltzmann-d3q19-stack-e/
├── pyproject.toml                 # own; NOT root-registered (Stage 1b); deps
│                                  #   testkit+diagnostics+common-warp+h5py+
│                                  #   hypothesis+numpy+warp-lang>=1.13,<2.0;
│                                  #   filterwarnings=["error"] (no Taichi filter);
│                                  #   ruff E,F,I,B,UP,SIM,RUF; mypy strict.
├── README.md                      # layout + shape-(a) BIT-EXACT framing.
├── lattice_boltzmann_d3q19_stack_e/
│   └── __init__.py                # package docstring ONLY (no impl; Stage 1b).
└── tests/
    ├── __init__.py                # empty.
    ├── conftest.py                # sys.path insert (unregistered pkg) + lbm-ref /
    │                              #   stack-e capture-manifest fixtures.
    ├── test_reference_sanity.py        # gate-5: constants/feq/density_moment.
    ├── test_d3q19_equilibrium_golden.py# gate-4a: equilibrium golden abs=1e-15.
    ├── test_mms_convergence.py         # gate-4b: NS-2D MMS OOA ≈ 2 ± 0.5.
    ├── test_determinism.py             # gate-10: run_twice + W-2 collision + R-D2.
    ├── test_diagnostics.py             # gates 5+6: Tier-1 health + Tier-2 IC-6.
    ├── test_pbt_invariants.py          # gate-11: equilibrium density/momentum moment.
    └── test_cross_stack_equivalence.py # gate-14: SKIPPED; shape-(a) bit-exact.
```

Test → gate mapping (7 files; covers gates 4a/4b/5/6/10/11/14 — the pytest
surface; gates 7/8/9/12/13-replay land with the Stage-1b implementation +
captures + perf rows). The seven files mirror the same-sim Stack-D content
(LBM-specific: dual-arm gate-4, two captures Poiseuille+Couette, the equilibrium
moment PBT invariants) on the Warp Stack-E import surface
(`lattice_boltzmann_d3q19_stack_e.{reference,sim,invariants}`) + the common-warp
W-2 determinism socket (smoke-Stack-E pattern).

## § 4. Gate-13 failing-tests RED anchor (FACT — `stage-1a-failing-tests-…txt`)

`python -m pytest packages/lattice-boltzmann-d3q19-stack-e/tests/` →
`rootdir: …/packages/lattice-boltzmann-d3q19-stack-e`, `configfile: pyproject.toml`
(the package's, so `filterwarnings=["error"]` is active), `collected 0 items /
7 errors`. All 7 are clean `ModuleNotFoundError` on absent
`lattice_boltzmann_d3q19_stack_e` submodules:

| Test file | fails importing | gate |
|---|---|---|
| `test_reference_sanity.py` | `…reference` | 5 |
| `test_d3q19_equilibrium_golden.py` | `…reference` | 4a |
| `test_mms_convergence.py` | `…reference` | 4b |
| `test_determinism.py` | `…reference` | 10 |
| `test_diagnostics.py` | `…sim` | 5+6 |
| `test_cross_stack_equivalence.py` | `…sim` | 14 |
| `test_pbt_invariants.py` | `…invariants` | 11 |

(4 reference + 2 sim + 1 invariants = 7.) The conftest `sys.path` insertion makes
the on-disk package importable (it is NOT a workspace member yet), so the package
root resolves but its submodules do not → the clean RED anchor. This is the
gate-13 worktree-replay target: at HEAD-after-Stage-1b the same `git worktree add
… 411bf3ba` reproduces these 7 errors; HEAD is GREEN (§ E pattern).

Evidence content sha256
`bc310b1cd50ccaa3cfbc81da6b949623c140aa45cf1bdf32996344c88bf00232`.

## § 5. ruff / integrity / replay (FACT — re-verified this stage)

- **ruff** `ruff check` → "All checks passed!"; `ruff format --check` → "10 files
  already formatted". (The pre-commit `ruff check` + `ruff format` hooks PASSED at
  COMMIT 1.)
- **Integrity** `python -m integrity --all --mode strict` → `0 HARD_FAIL, 14
  SOFT_WARN`, findings sha256 `c19492add530…d22cb52` — **baseline-MATCH, NO
  DELTA** (the new package adds ZERO findings; no cat-1 GPU device-string issue —
  § L.5 S1a-2 honored, no bare `cuda`-digit token; no cat-4 `path:line`
  assertion). Hard Rule 2 (new HARD_FAIL / new SOFT_WARN) NOT triggered.
- **Bit-identity replay** `9399fc33…718909f34` HELD (Stage-0 re-run; unchanged —
  the package is not on the replay chain, § D.4).

## § 6. Phase-1 capture access re-verification (Hard Rule 2)

(FACT — `git show HEAD:…` LFS pointers.) Both LEFT-partner captures at
`captures/lbm-ref/` unchanged from the Stage-0 record:
- `poiseuille-64x32-seed42-step1000.h5` — LFS oid
  `0e0843aa8707e5f07f2e12fae81c764fccdbe91b408833bbc67450f1b5e16f68`, 202,350,128 B.
- `couette-32x16-seed42-step500.h5` — LFS oid
  `7a94843457e44c8747a6514fe6bc56548f637e09a3bd5ee2631d9ddfae15b65b`, 27,405,152 B.

Both LFS-committed, ≤256 MiB (D14; no held-local). R-A1 anchor `74e6bc16…` and
common-warp § 1.9.1 socket surface unchanged from Stage 0. Workspace members =
**22**; `packages/lattice-boltzmann-d3q19-stack-e` NOT registered (correct —
Stage 1b adds the 23rd). All Hard Rule 2 stage-drift conditions clear.

## § 7. Stage 1b readiness (Stage-1b-dispatch input)

**READY.** Stage 1b lands (per charter § 2/§ 4 "Stage 1b"): determinism-strategy
docstring → Warp D3Q19 reference (`bgk_step` collision + Guo, `stream`
periodic-mod gather, `apply_bounce_back_y_walls` `OPP` swap + moving-wall
injection, `density_field`/`momentum_field`/`feq_field` as `@wp.kernel`s over an
own `wp.array(dtype=wp.float64, ndim=4)`; point-eval `feq`/`density_moment`/
`momentum_moment`; constants `VELOCITIES`/`WEIGHTS`/`CS2`/`CANONICAL_*`) → `sim.py`
(`sim_runner_seeded` + `sim_runner_seeded_couette` + `sim_runner_diagnostic`) →
`invariants.py` (`equilibrium_density_moment` + `equilibrium_momentum_moment`) →
`spec-ref-stack-e.md` → tests GREEN (gates 4–13; gate-4 dual-arm) → TWO canonical
captures (both LFS-committable) → perf-ledger rows (Poiseuille + Couette,
warp-cpu) → **root `pyproject.toml` workspace registration 22 → 23** → gate-13
replay. O-2 checkpoints 2 (gate-10 production reproduction) + 3 (canonical-scale
2-run). The import surface above is the contract the seven test files lock.

## § 8. Banked items / shift

- **0 new shifts this stage** (cumulative **217 HELD**). Clean charter-faithful
  scaffold; no drift to reconcile (the smoke-E S1a-SME1 §6-O-2-line fix was
  already incorporated into this charter — § 0). The dual-arm gate-4 (7th test
  file) + the gate-14 `max_abs_err==0.0` bit-exact assertion follow the charter
  (D17 / D10), not novel deltas.
- **STAY-BANKED (carry-in):** S0-LBME1 (coordinator dispatch anchor-sha framing
  drift; banked at Stage 0 for the post-Phase-2 cleanup sub-phase); the smoke-E
  §13 cleanup-deferrables (CHANGELOG gaps, stale section titles, D17 Phase-1
  2D-ref re-characterization — not LBM-E scope). N1 per-package pytest-config;
  S0-1 filterwarnings N/A for Warp.

## § 9. Verdict

**stage-1a-CONFIRMED.** 0 new shifts; cumulative **217 (HELD)**. gate-13 RED
anchor established (`411bf3ba`; 7/7 clean `ModuleNotFoundError`). Integrity
baseline-MATCH (`c19492ad…`; 0 HF / 14 SW); replay HELD (`9399fc33…`). NOT
implementation: `reference`/`sim`/`invariants` absent (Stage 1b); root workspace
NOT registered (22; Stage 1b adds 23rd). No `-phase-N` tag (D12). Local-only
(D13). Operator routes Stage 1b separately.

---

*End of Stage 1a checkpoint. `head_sha` back-filled in COMMIT 3 (Convention #12;
separate commit; never `--amend`; N1 enumeration).*
