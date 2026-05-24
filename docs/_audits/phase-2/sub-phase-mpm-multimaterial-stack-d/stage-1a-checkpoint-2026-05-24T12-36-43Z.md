---
date: 2026-05-24T12-36-43Z
author: mpm-multimaterial-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-d-stage-1a
subject: "Stage 1a failing-tests RED-state anchored for the mpm-multimaterial -> Stack-D port (FOURTH spec-Phase-2 cross-stack port). VERDICT SHIFTED-with-N1. RED state structurally correct: 8 new test-surface files at packages/mpm-multimaterial-stack-d/tests/ import the yet-to-exist mpm_multimaterial_stack_d.{reference,sim,invariants} submodules; pytest = 6 clean collection-time ModuleNotFoundError on the named submodules (NO other error class). Package skeleton (pyproject.toml + __init__.py + README.md) + workspace registration (root pyproject members 17->18; uv sync --all-packages clean; uv.lock re-resolved) PASS. Gate-4 GOLDEN-only (no MMS arm; probe S-M6); ONE canonical capture (D4); cross-stack test single-capture vs captures/mpm-ref/. Failing-tests evidence mpm-multimaterial-stack-d-2026-05-24T12-36-43Z.txt committed-blob sha256 2e8d7ea9...82458d (== stage1a footer hash; commit-first-then-sha256). Stage1a commit b72bccb; ruff check+format clean (ruff --fix applied import-sort + RUF100 before final capture). N1: the aborted first commit attempt (ruff HARD_FAIL) left a pre-ruff evidence blob (12-35-09Z) staged; it rode into b72bccb and was removed in cleanup commit bca55c1 (process hygiene; NOT a RED-state defect). 0 methodology shifts; N1 process-hygiene only. Cumulative 144. NOT BLOCKED. No Hard-Rule-2 trigger (RED is clean ModuleNotFoundError; uv resolves cleanly)."
verdict-state: SHIFTED
head_sha: 0d7ce0705f219955deed2307ebe20e34a2897de4
head_sha_at_checkpoint: 0d7ce0705f219955deed2307ebe20e34a2897de4
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-checkpoint-2026-05-24T12-16-58Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-probe-2026-05-24T11-45-06Z.md
  - docs/phases/sub-phase-mpm-multimaterial-stack-d.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-2026-05-24T12-36-43Z.txt
  - packages/mpm-multimaterial-stack-d/pyproject.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-2026-05-24T12-36-43Z.txt: sha256:2e8d7ea979a94fab1ecc0000d49b20559663c5c6101f08b03d188efe1b82458d
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
---

# Stage 1a failing-tests checkpoint — sub-phase-mpm-multimaterial-stack-d

> FOURTH spec-Phase-2 per-sim cross-stack port. RED-state anchor (IC-8 TDD;
> gate-3). Stage 1b dispatchable. Convention M re-anchor at HEAD: conventions
> `69aa39fc…`, architecture `e82b7b8e…` MATCH. Verdict SHIFTED-with-N1 (process
> hygiene; § 5).

## § 1. Five-step results

| Step | Result | Detail |
|---|---|---|
| 1 Package skeleton + workspace registration | **PASS** | `packages/mpm-multimaterial-stack-d/{pyproject.toml, README.md, mpm_multimaterial_stack_d/__init__.py}`; root pyproject `[tool.uv.workspace].members` 17→18; `uv sync --all-packages --all-extras` resolved 73 packages, built+installed `mpm-multimaterial-stack-d==0.0.0`; `uv.lock` re-resolved |
| 2 Test files | **PASS** | 8 files: `tests/{__init__,conftest,test_quadratic_bspline_golden,test_diagnostics,test_pbt_invariants,test_determinism,test_reference_sanity,test_cross_stack_equivalence}.py` |
| 3 pytest RED | **PASS** | 6 collection-time `ModuleNotFoundError` on the named submodules; NO other error class (testkit `determinism`/`equivalence.harness` + parent package import fine); exit=2 |
| 4 Evidence capture | **PASS** | `tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-2026-05-24T12-36-43Z.txt`; committed-blob sha256 `2e8d7ea9…82458d` (commit-first-then-sha256; == footer) |
| 5 Commit | **PASS** | `b72bccb` `test(mpm-multimaterial-stack-d-stage1a)`; footer cites evidence hash + Stage-0 anchor + per-submodule breakdown; ruff check+format clean |

## § 2. Per-test ModuleNotFoundError breakdown (RED surface)

| Test file | Missing submodule | Gate |
|---|---|---|
| `test_quadratic_bspline_golden.py` | `mpm_multimaterial_stack_d.reference` | 4 (golden) |
| `test_reference_sanity.py` | `mpm_multimaterial_stack_d.reference` | 5 |
| `test_diagnostics.py` | `mpm_multimaterial_stack_d.sim` | 5/6 (Tier-1 + Tier-2 IC-5 + IC-6) |
| `test_determinism.py` | `mpm_multimaterial_stack_d.sim` | 10 |
| `test_cross_stack_equivalence.py` | `mpm_multimaterial_stack_d.sim` | 14 (Stage 1c) |
| `test_pbt_invariants.py` | `mpm_multimaterial_stack_d.invariants` | 11 |

All clean `ModuleNotFoundError` on the three named submodules (`.reference` ×2, `.sim` ×3, `.invariants` ×1). The `from determinism import …` / `from equivalence.harness import …` testkit imports resolve via the workspace install (bit-physics-testkit dep) — they do NOT contribute spurious errors. Parent package `mpm_multimaterial_stack_d` imports cleanly (skeleton `__init__.py` present).

## § 3. Public-API contract pinned at the Stage 1a RED surface (Stage 1b implements verbatim)

**`mpm_multimaterial_stack_d.reference`** (+ `reference.shape_functions`):
- `shape_functions.N(x: float) -> float`; `shape_functions.partition_of_unity_sum(p: float) -> float`.
- Constants: `CANONICAL_DESCRIPTOR="drop-impact-128cube-seed42-step500"`, `CANONICAL_GRID_N=128`, `CANONICAL_N_PARTICLES=1_000_000`, `CANONICAL_N_STEPS=500`, `CANONICAL_CAPTURE_INTERVAL=50`, `CANONICAL_FLOOR_Z_INDEX=4`, `CANONICAL_SEED=42`, `CANONICAL_YOUNGS_MODULUS=4000.0`, `CANONICAL_POISSON_RATIO=0.3`, `CANONICAL_MU`, `CANONICAL_LAMBDA` (derived from E,ν), `CANONICAL_BLOB_RADIUS=0.15`, `CANONICAL_BLOB_VELOCITY_Z=-2.0` (+ `CANONICAL_BLOB_CENTER`, `CANONICAL_GRAVITY_Z`, `CANONICAL_DT` per Phase-1).
- MLS-MPM/APIC kernels (callable): `p2g_with_stress`, `g2p`, `grid_update`, `deformation_update`, `compute_particle_stresses`, `advect_particles` (+ `N`).
- **Determinism contract (Stage 1b):** `cpu_max_num_threads=1` (posture (i)); `ti.f64(0.0)` accumulator seeds in P2G scatter + G2P gather + APIC reconstruction (Stage-0 banked).

**`mpm_multimaterial_stack_d.sim`**:
- `sim_runner_seeded(seed: int, out_dir: Path) -> Path` (canonical `drop-impact-128cube-seed42-step500`; threads + interpolates `seed` into the descriptor — clean contract per D7/Stage-0; NOT the Phase-1 hardcoded-descriptor residue).
- `sim_runner_diagnostic(seed: int, out_dir: Path) -> Path` (`drop-impact-16cube-seed42-step50` diagnostic tier).

**`mpm_multimaterial_stack_d.invariants`**:
- `mass_conservation_p2g_g2p(positions, masses, grid_n=16, grid_dx=1/16) -> tuple[float, float]`.
- `partition_of_unity_b_spline(p: float) -> float`.

## § 4. Convention M anchor re-verification (Convention #8)

| Anchor | HEAD-verified | Match? |
|---|---|---|
| conventions doc | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | FACT |
| architecture | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | FACT |
| workspace members | 17 → **18** (`+packages/mpm-multimaterial-stack-d`) | FACT |
| evidence committed-blob sha256 | `2e8d7ea9…82458d` (== footer) | FACT |

No conventions/architecture drift. No edit to Phase-1-sealed `packages/mpm-multimaterial/` (D7 closed-as-not-a-defect).

## § 5. Shifts + cumulative

**N1 (Stage 1a; process hygiene — NOT a methodology shift):** the first `git commit` attempt HARD_FAILed on the ruff-check/ruff-format pre-commit hooks (I001 import-sort + RUF100 unused-noqa; ruff-format reformatted 2 files). Per commit-first discipline I ran `ruff check --fix` + `ruff format` (6 fixed, 0 remaining; all checks pass), which shifted traceback line numbers, so the failing-tests evidence was RE-CAPTURED post-ruff (`12-36-43Z`, the authoritative blob). The aborted attempt had left the pre-ruff evidence blob (`12-35-09Z`) staged in the index; it rode into `b72bccb` and was removed in cleanup commit `bca55c1`. Both blobs show the identical 6 clean `ModuleNotFoundError` RED outcome (only traceback line numbers differ); the canonical `12-36-43Z` is footer-cited + authoritative. No RED-state defect; no methodology change.

**Cumulative at Stage-1a close: 144** (143 entering + N1).

## § 6. Verdict + Stage 1b dispatch readiness

**Verdict: SHIFTED-with-N1.** RED state structurally correct (clean `ModuleNotFoundError` on the 3 named submodules); workspace resolves cleanly; footer cites correctly. NOT BLOCKED. Hard Rule 2 NOT triggered.

**Stage 1b dispatch readiness:** READY. Carry-forward from Stage 0 (banked):
- Determinism posture: `cpu_max_num_threads=1` (posture (i); run-to-run bit-exact at the derisk scale); `ti.f64(0.0)` accumulator seeds throughout the P2G scatter / G2P gather / APIC reconstruction / stress / deformation kernels.
- Expected gate-14 (Stage 1c): GREEN at 1e-4 with ~5-order margin (cross-stack ~1e-9 single-step; R-M2 full-horizon roll-up load-bearing).
- D5 lean (b) PARTIAL HOLDS + REFINEMENT (atomic-scatter-on-Stack-D-side subsection).
- Stage 1b implements the § 3 public-API contract verbatim, ports the Phase-1 `mls_mpm.py` algorithm to Taichi-DSL, produces ONE canonical capture, gate-4 golden + gates 5/6/10/11 GREEN, re-skips `test_cross_stack_equivalence.py`.

---

*End of Stage 1a checkpoint. SHA back-fill follows (Convention #12 + N1 enumeration).*
