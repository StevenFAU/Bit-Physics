---
date: 2026-05-24T00-06-11Z
author: sph-water-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sph-water-stack-d-stage-1a
subject: "Stage 1a (failing-tests RED-state anchor) CLOSE for the sph-water -> Stack-D port. VERDICT CONFIRMED. NEW package skeleton packages/sph-water-stack-d/ (pyproject + README + sph_water_stack_d/__init__.py) + 9-file test surface (charter § 4.2.1: golden-table gate-4 split into test_cubic_spline_kernel_golden.py + test_dfsph_density_golden.py — NOT a single test_code_verification.py; the largest delta from the RD-2D template). Root pyproject.toml additively extended (workspace members 15 -> 16 total at HEAD; dispatch's '12 -> 13' was an unverified RD-2D-era carryover). uv sync --all-packages clean. RED-state: pytest fails at collection with 7 clean ModuleNotFoundError on the Stage-1b targets sph_water_stack_d.{reference (4 tests), sim (2), invariants (1)}; no skeleton/uv/parse errors (Hard Rule 2 satisfied). Failing-tests-evidence committed-blob sha256 e5243412...0ec253 (commit-first-then-sha256; load-bearing TDD anchor). Main commit 3a6eb82. 0 new SHIFTs (clean RED-anchor); 3 Convention #8 dispatch-vs-HEAD reconciliations recorded (analogous to plan-drafting F1/F2/F3, not shifts). Cumulative 129."
verdict-state: CONFIRMED
head_sha: 65dad914d20f78e9f1b4c728f8aea123209ac91f
head_sha_at_checkpoint: 65dad914d20f78e9f1b4c728f8aea123209ac91f
parent_audits:
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-checkpoint-2026-05-23T23-40-26Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/sph-water-stack-d-2026-05-24T00-06-11Z.txt
  - packages/sph-water-stack-d/pyproject.toml
  - packages/sph-water-stack-d/tests/conftest.py
  - packages/sph-water-stack-d/sph_water_stack_d/__init__.py
evidence_hashes:
  tools/testkit/failing-tests-evidence/sph-water-stack-d-2026-05-24T00-06-11Z.txt: sha256:e524341293638f88de8b9b73a66620a620e4a6ea26334a1fa70e54b6200ec253
  packages/sph-water-stack-d/pyproject.toml: sha256:59bd3a565aa644220c295c029bd525181dbd75ed32dab8427cdb36ded83d0a83
  packages/sph-water-stack-d/tests/conftest.py: sha256:45a0ced44495b067b8cc180ba88fecf05fd200eac827af99283a114636a6f2d4
  packages/sph-water-stack-d/sph_water_stack_d/__init__.py: sha256:fe60f51d03d378d50b3262068a7d5f9b5202644ae7fac5210b9c91e3cf866a87
---

# Stage 1a Checkpoint — Sub-Phase sph-water → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8);
> no value inherited from the dispatch without verification. FACT / INFERENCE /
> SHIFTED tagging throughout.

## § 1. Scope summary

Stage 1a is the **RED-state anchor** stage of the SECOND per-sim cross-stack
port under spec-Phase-2 (sph-water → Stack-D Taichi DFSPH). It ships ONLY the
failing-tests surface + package skeleton + workspace registration; the
reference / sim / invariants modules are Stage 1b deliverables. Mirrors the
RD-2D Stack-D Stage 1a 5-step sequence, with the **golden-table gate-4 delta**
(two golden test files, not an MMS `test_code_verification.py`).

## § 2. 5-step results

| Step | Artifact | sha256 (committed-blob) | Status |
|---|---|---|---|
| 1 | Package skeleton (`pyproject.toml`, `README.md`, `sph_water_stack_d/__init__.py`) + root-pyproject workspace edit + `uv sync` | pyproject `59bd3a56…`; `__init__.py` `fe60f51d…` | **PASS** — `uv sync --all-packages --all-extras` clean; member built + installed |
| 2 | 9-file test surface at `tests/` (charter § 4.2.1) | conftest `45a0ced4…` | **PASS** — 7 `test_*.py` + `conftest.py` + `__init__.py`; ruff `RUF`/`I` + format clean |
| 3 | `pytest tests/ -v` | — | **PASS (RED as designed)** — 7 collection errors, all clean `ModuleNotFoundError` on the 3 Stage-1b targets; no skeleton/uv/parse errors (Hard Rule 2 satisfied) |
| 4 | `failing-tests-evidence/sph-water-stack-d-2026-05-24T00-06-11Z.txt` | **`e524341293638f88de8b9b73a66620a620e4a6ea26334a1fa70e54b6200ec253`** | **PASS** — committed-blob sha256 (commit-first-then-sha256; verified stable post-commit; THE load-bearing TDD anchor) |
| 5 | Commit `test(sph-water-stack-d-stage1a): …` | commit `3a6eb824e157cea0885e9777182e7c44afc67e8c` | **PASS** — footer cites evidence sha + Stage-0 head_sha `2f27681` + `Implements-failing-tests-target` |

## § 3. RED-state validation (for gate-13 / Stage-2 worktree replay)

(FACT — `failing-tests-evidence/sph-water-stack-d-2026-05-24T00-06-11Z.txt`.)

7 test files fail at **collection** with `ModuleNotFoundError`, mapped to the
three Stage-1b target submodules:

| Missing submodule | Count | Tests |
|---|---|---|
| `sph_water_stack_d.reference` | 4 | `test_cubic_spline_kernel_golden`, `test_dfsph_density_golden`, `test_diagnostics`, `test_reference_sanity` |
| `sph_water_stack_d.sim` | 2 | `test_determinism`, `test_cross_stack_equivalence` |
| `sph_water_stack_d.invariants` | 1 | `test_pbt_invariants` |

`pytest` exit code 2 (collection errors). Parent package `sph_water_stack_d`
imports cleanly; `diagnostics` / `determinism` / `equivalence` / `capture` /
`property` testkit modules all resolve via workspace editable installs. The RED
points **exactly** at the three Stage-1b targets — structurally correct.

Per RD-2D Stack-D Stage 1b N1: Stage-2 gate-13 replay verifies **structural
reproduction** (7 `ModuleNotFoundError` on the same 3 submodules), NOT
byte-identical sha256 (absolute-path embedding makes byte-identity impossible);
the footer cites the committed-state sha256.

## § 4. Workspace registration outcome

(FACT — `uv sync` output; root `pyproject.toml` at HEAD.)

`uv sync --all-packages --all-extras` resolved 71 packages; built + installed
`sph-water-stack-d==0.0.0` as a new workspace member; `uv.lock` auto-updated
(+39 lines). Root `[tool.uv.workspace].members` extended additively (Convention
A). **HEAD-verified member count: 15 → 16 total** (11 `packages/` + `tools/`
{testkit, integrity, diagnostics} + `common/common-py` + this). The dispatch's
"12 → 13" was an unverified RD-2D-era carryover (Convention #8 catch — the
fourth dispatch-vs-HEAD discrepancy banked across this sub-phase; recorded, not
load-bearing).

## § 5. New SHIFTs surfaced at Stage 1a

**0 new shifts.** Stage 1a was clean RED-anchor work (the dispatch predicted
"likely 0"). Cumulative shift count holds at **129**.

Three **Convention #8 dispatch-vs-HEAD reconciliations** were surfaced — these
are coordinator-side verification catches (analogous to the plan-drafting
F1/F2/F3 dispatch-anchor falsifications, which were likewise NOT counted as
shifts), NOT deviations from the plan:

1. **Test-surface count: 9 (charter) over 8 (dispatch).** The dispatch's "RED
   MUST LOOK LIKE … 8 test files" + STEP 2 `test_code_verification.py` is an
   RD-2D-template carryover. The charter § 4.2.1 (source of truth) + the HEAD
   Stack-B sph-water surface split gate-4 into TWO golden-table files
   (`test_cubic_spline_kernel_golden.py` + `test_dfsph_density_golden.py`)
   because sph-water has **no MMS** (probe S2/F3; spec-ref § 7). Executing the
   charter as written is not a shift; the dispatch's count was the error.
2. **Member count: 15 → 16 (HEAD) over 12 → 13 (dispatch)** — § 4.
3. **Footer `Failing-tests-output-hash` ordering** — resolved via the
   newline-terminated evidence + commit-first-then-sha256 post-commit
   verification (§ 2 Step 4); committed-blob sha256 confirmed stable.

None blocking; none a plan deviation. Surfacing them IS the mandated Convention
#8 discipline (the fourth/fifth/sixth such catch banked across this sub-phase).

## § 6. Stage 1b dispatch readiness

Stage 1b is dispatchable. It inherits, from the Stage-0 banked observations:

1. **f64 precision requirement (load-bearing):** the kernel module MUST pin
   `default_fp=ti.f64` (or f64-type all locals) — `set_taichi_deterministic`
   does NOT set `default_fp`; under f32 default the cubic-spline golden gate-4a
   fails at ~1e-8 (Stage-0 Task 0.5). Port-local config; NOT an IC-11 edit.
2. **Iteration-count instrumentation (R-S3):** instrument the actual combined
   DFSPH per-step iteration count early; if ≥ ~18–20 (→ canonical capture
   > 43 min), STOP and surface for operator R-S3 routing (full / shorter horizon
   / diagnostic-tier-only). Central estimate at k≈10 was ~28–32 min.
3. **Public-API contract pinned by this RED surface:** Stage 1b must satisfy the
   imports this test surface targets —
   `sph_water_stack_d.reference.dfsph_taichi.{W, grad_W_magnitude, density,
   density_evolution, canonical_params}`;
   `sph_water_stack_d.sim.{sim_runner_seeded, sim_runner_diagnostic,
   compute_diagnostic_trajectory, neighbor_lists_at}`;
   `sph_water_stack_d.invariants.{density_nonneg,
   kernel_normalization_unit_volume}`.
4. `canonical_params()` must lock `h=0.05, rho_0=1000.0, dt=1e-3, g_z=-9.81,
   max_iter_density=50, max_iter_divergence=50, density_tolerance=1e-4,
   divergence_tolerance=1e-4` (test_reference_sanity pins these).
