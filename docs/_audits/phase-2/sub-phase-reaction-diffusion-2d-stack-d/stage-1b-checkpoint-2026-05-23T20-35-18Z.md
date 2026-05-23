---
date: 2026-05-23T20-35-18Z
author: reaction-diffusion-2d-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: reaction-diffusion-2d-stack-d-stage-1b
subject: "Stage 1b Stack-D Taichi-DSL Gray-Scott implementation through gate 13 CONFIRMED. Single monolithic sub-bundle commit 276bd85… lands the package skeleton (reference/__init__.py + reference/gray_scott_taichi.py + sim.py + invariants.py), Stack-D spec sheet sibling (spec-ref-stack-d.md), pre-implementation probe report, Stack-D canonical capture at the HEAD-frozen descriptor, GREEN evidence (15 pass + 1 skip), perf-ledger row, and the additive test-body fills for gate-4 MMS + gate-10 IC-13 same-stack content-equivalence. MMS gate-4 observed OOA combined=1.9972 against formal 2.0 (within ±0.5 tolerance). Gate-13 replay structurally reproduces 6/6 ModuleNotFoundError on the same 3 Stage-1b submodule targets in a worktree at ca9bc0b…. Gate-14 cross-stack equivalence PENDING-Stage-1c per charter § 4.2.3 (SKIPPED at module-level)."
verdict-state: CONFIRMED
head_sha: c36a1b4c7ff8c1ec83f1a8a92aaf57c5b2a8cf08
head_sha_at_checkpoint: c36a1b4c7ff8c1ec83f1a8a92aaf57c5b2a8cf08
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-landing-2026-05-23T17-47-51Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-checkpoint-2026-05-23T18-10-17Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1a-checkpoint-2026-05-23T18-31-28Z.md
evidence_paths:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md
  - docs/conventions/sub-phase-conventions.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md
  - tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md
  - packages/reaction-diffusion-2d-stack-d/pyproject.toml
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/__init__.py
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/invariants.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_code_verification.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py
  - captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5
  - captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json
  - tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt
  - tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-2026-05-23T20-34-08Z.txt
  - docs/perf-ledger.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
  tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt: sha256:685e5cc0ecbd44670885115de859dd68b99580c8038aa39c1266cc4123ad6446
  tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-2026-05-23T20-34-08Z.txt: sha256:90e1f80a90191dcdbacf8426767164fb7f1a09859eae4b2b6ee20138838d1713
  captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5: sha256:2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d
  captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json: sha256:a7780645d2159208e281a49c95b9d43c66ffd8b7e6ca3524345be19c468abd68
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5: sha256:bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json: sha256:585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc
---

# Stage 1b Checkpoint — Sub-Phase RD-2D → Stack-D

## 1. Stage-1b scope summary

(FACT — charter § 4.2.2 12-step sequence.)

Stage 1b (implementation commit) of the FIRST per-sim cross-stack port sub-phase under spec-Phase-2. Single Claude Code session. Single monolithic sub-bundle commit (`276bd85…`) per Convention A; new files first + additive edits to pre-existing files; ~+1500 net lines.

**Verdict: CONFIRMED.** All 12 charter steps executed cleanly. Gates 4-13 GREEN; gate-14 PENDING-Stage-1c (cross-stack equivalence harness extension owns the SKIP removal). MMS gate-4 observed OOA combined = 1.9972 against formal 2.0 (within ±0.5 tolerance). Stack-D canonical capture is byte-reproducible across re-runs (fixed `start_utc` + `wall_clock_seconds=0.0` mirror Stack-B pattern). Gate-13 worktree replay structurally reproduces 6/6 ModuleNotFoundError on the expected submodules.

## 2. 13-row gate-status table

(FACT — charter § 2 14-row table; gate-14 stays PENDING-1c at Stage 1b close.)

| Gate | Status | Witness |
|---|---|---|
| 1 spec sheet | **GREEN** | `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` (13-section template; § 5 cites Stack-D Taichi impl; § 8 declares `bit-exact-same-hw` at `arch="cpu"`; § 9 declares cross-stack tolerance `relative = 1e-4`) |
| 2 probe report | **GREEN** | `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` (sibling to `reaction-diffusion-2d.md`; enumerates IC-2/4/8/11-14 consumption + MMS pipeline + tolerance.toml + R-P3/4/5 risk surfaces) |
| 3 failing-tests committed | **GREEN (Stage 1a)** | Stage 1a commit `ca9bc0b…`; evidence file sha256 `685e5cc0…23ad6446` cited as `Failing-tests-output-hash-witnessed` in Stage 1b commit footer |
| 4 code verification (MMS) | **GREEN** | `test_mms_observed_order_at_canonical_params` PASS; observed OOA U=1.9972, V=1.9160, combined=1.9972 (formal 2.0, tol ±0.5) |
| 5 Tier 1 (NaN/Inf) | **GREEN** | `test_stack_d_canonical_capture_is_healthy` PASS over all 11 captured frames |
| 6 Tier 2 scalar_field | **GREEN** | `test_stack_d_canonical_capture_{U,V}_in_unit_interval` PASS (U, V ∈ [0, 1] across every captured step) |
| 7 Cat 1 citations | **GREEN** | `spec-ref-stack-d.md` § 2 cites Gray-Scott 1983 + Pearson 1993 (shared with Stack-B) + Stack-B `spec-ref.md` cross-reference + IC-11/12/13/14 audit source references |
| 8 Cat 2 public API | **GREEN** | `reaction_diffusion_2d_stack_d.{reference, sim, invariants}` exports match probe § 5 contract |
| 9 canonical capture + testkit-replayable | **GREEN** | `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` sha256s `2e93a751…1041b13d` + `a7780645…468abd68`; load_capture round-trip verified; manifest is byte-reproducible across re-runs |
| 10 determinism (IC-13) | **GREEN** | `test_stack_d_is_content_equivalent` invokes `run_twice_and_diff(sim_runner_seeded, seed=42)`; verdict `content_equivalent=True`, detail "captures match exactly" |
| 11 PBT (3 invariants, n_examples=20) | **GREEN** | 3/3 invariants pass (`monotone_bounds_uv`, `mass_approximately_conserved`, `periodic_bc_satisfied`); Hypothesis sweep at `n_examples=20` clean |
| 12 perf-ledger row | **GREEN** | `docs/perf-ledger.md` appended: `reaction-diffusion-2d \| taichi-cpu \| gray-scott-lambda-128sq-seed42-step2000 \| 0.568 \| i7-7700HQ-linux-6.17 \| (this commit) \| 2026-05-23 \| baseline` |
| 13 failing-tests replay | **GREEN (structural)** | `git worktree add /tmp/bp-replay-ca9bc0b-rd2d-stack-d ca9bc0b…` → `uv sync --all-packages --all-extras` → `pytest tests/`; 6/6 collection errors with ModuleNotFoundError on `reaction_diffusion_2d_stack_d.{sim, invariants, reference}` reproduced; committed evidence file sha256 `685e5cc0…23ad6446` reproduces byte-identically in the worktree |
| 14 cross-stack equivalence (Phase-2) | **PENDING-1c** | `test_stack_d_capture_within_tolerance_of_stack_b` carries `pytest.mark.skip` at module level; Stage 1c authors `equivalence.md` + removes the SKIP + activates the harness invocation |

## 3. Per-step results table

(FACT — charter § 4.2.2 12-step sequence.)

| STEP | Artifact / Outcome | Result |
|---|---|---|
| 1 | reference/__init__.py + verify pyproject deps + Taichi-locale filterwarnings additive edit | `reaction_diffusion_2d_stack_d.reference` package init created; pyproject.toml filter additive edit per docs/common/taichi.md § 4.5 |
| 2 | `reference/gray_scott_taichi.py` — `@ti.kernel step_diffuse_react` + `step_diffuse_react_with_source` + `canonical_params` + `initial_condition` + `step` + `evolve` | Module imports clean; kernels compile + run; uniform IC stays uniform (max\|U-1\| = 0.0, max\|V\| = 0.0 over 50 steps at n=16) |
| 3 | `sim.py` — `sim_runner_seeded`, `sim_runner_pbt`, `sim_runner_with_source_term` with determinism-strategy docstring at file top | Docstring carries the 4-clause § F.1 declaration; sim runners produce valid captures consumable by `load_capture` |
| 4 | `invariants.py` — 3 PBT invariants from spec-ref.md § 6 | Module imports clean; invariants are `Invariant` instances with `applies_to_category="continuous-ca"` |
| 5 | `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` | 13-section template; sibling to existing `spec-ref.md`; IC-15 template seed |
| 6 | `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` | Sibling to `reaction-diffusion-2d.md`; enumerates testkit + common-py + taichi + MMS API surfaces |
| 7 | Fill test bodies + run `uv run pytest packages/reaction-diffusion-2d-stack-d/tests/ -v` → GREEN | 15 pass + 1 skip (cross-stack at module-level SKIP) in 4.04 s; evidence captured at `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-2026-05-23T20-34-08Z.txt`, sha256 `90e1f80a…838d1713` |
| 8 | Stack-D canonical capture | Produced at `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`; sha256 H5 `2e93a751…1041b13d`, JSON `a7780645…468abd68`; byte-reproducible across re-runs (verified twice) |
| 9 | `docs/perf-ledger.md` append | Stack-D row appended: 0.568 s (warm Taichi cache) vs Stack-B baseline 0.931 s (0.61×; well below 2× regression band) |
| 10 | Verify root pyproject.toml workspace registration + uv.lock consistency | NO-OP — `packages/reaction-diffusion-2d-stack-d` already in members (Stage 1a); `uv sync --all-packages --all-extras` clean (resolved 70 packages; 69 checked) |
| 11 | Gate-13 worktree replay against Stage 1a SHA `ca9bc0b…` | `git worktree add /tmp/bp-replay-ca9bc0b-rd2d-stack-d ca9bc0b…` → `uv sync --all-packages --all-extras` → `pytest tests/`; 6/6 ModuleNotFoundError on expected submodules reproduced; committed evidence sha256 reproduces byte-identically in the worktree; worktree removed cleanly |
| 12 | Stage 1b main commit `feat(reaction-diffusion-2d-stack-d-stage1b)` | Commit `276bd85…`; 13 files changed, 1501 insertions + 33 deletions; footer cites all gate evidence sha256s + replay-chain hashes |

## 4. Canonical Stack-D capture sha256s

(FACT — `sha256sum captures/reaction-diffusion-2d-stack-d/*.{h5,json}` at commit time; reproducibility verified by re-running `sim_runner_seeded(seed=42, out_dir=...)` in a temporary directory and confirming sha256 stability.)

| File | sha256 |
|---|---|
| `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5` | `2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d` |
| `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json` | `a7780645d2159208e281a49c95b9d43c66ffd8b7e6ca3524345be19c468abd68` |

**Reproducibility witness.** Two consecutive `sim_runner_seeded(seed=42, out_dir=...)` invocations in independent tmpdir produce sha256-equal outputs for both files. The manifest's `start_utc` is pinned to `"2026-05-23T00:00:00Z"` and `wall_clock_seconds` to `0.0` (mirroring Stack-B's canonical-capture manifest discipline); live wall-clock is recorded externally for the perf-ledger row.

**Stack-D vs Stack-B raw-file sha256 expectation.** Stack-D's `.h5` and `.json` sha256s do NOT match Stack-B's (`bcae544a…f92148f0` + `585d7d8a…03d3a7bc`) — this is expected. Cross-stack equivalence per spec § 2.6 is content-equivalent at `relative = 1e-4`, NOT raw-file-byte-equal. Stage 1c at gate-14 diffs the parsed Capture projections via `compare_captures`; the per-field U + V error bound is the load-bearing test.

## 5. GREEN evidence sha256

(FACT — `sha256sum tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-2026-05-23T20-34-08Z.txt`.)

| File | sha256 |
|---|---|
| `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-2026-05-23T20-34-08Z.txt` | `90e1f80a90191dcdbacf8426767164fb7f1a09859eae4b2b6ee20138838d1713` |

Body: 15 passed + 1 skipped in 4.08 s; the skip is `test_stack_d_capture_within_tolerance_of_stack_b` at module level (gate-14 deferred to Stage 1c). Per-test breakdown:

- `test_code_verification.py`: 4/4 PASS (canonical-descriptor-matches-filename + canonical-capture-exists + MMS observed-order at canonical params + canonical-capture-matches-Stack-D-reconstruction bit-identical).
- `test_cross_stack_equivalence.py`: 1 SKIPPED (Stage 1c scope).
- `test_determinism.py`: 2/2 PASS (Stack-D is content-equivalent + different seeds diverge).
- `test_diagnostics.py`: 3/3 PASS (canonical capture healthy + U in unit interval + V in unit interval).
- `test_pbt_invariants.py`: 3/3 PASS (monotone bounds + mass approximately conserved + periodic BC).
- `test_reference_sanity.py`: 3/3 PASS (uniform field stays uniform + canonical params lock λ pattern + evolve yields initial and final).

## 6. Gate-13 replay outcome

(FACT — Step 11 execution; live replay against Stage 1a `ca9bc0b…` worktree at `/tmp/bp-replay-ca9bc0b-rd2d-stack-d/`.)

**Procedure:**

```bash
git worktree add /tmp/bp-replay-ca9bc0b-rd2d-stack-d ca9bc0b66099f8e4721b7054ff5f3fc449fe8e74
cd /tmp/bp-replay-ca9bc0b-rd2d-stack-d
uv sync --all-packages --all-extras        # Stage 1a N1 banked observation
cd packages/reaction-diffusion-2d-stack-d
uv run pytest tests/ -v --tb=short          # 6 collection errors expected
```

**Outcome:**

| Check | Expected | Observed |
|---|---|---|
| Collection-time `ModuleNotFoundError` count | 6 errors | 6 errors |
| `reaction_diffusion_2d_stack_d.sim` missing in test_code_verification, test_cross_stack_equivalence, test_determinism, test_diagnostics, test_pbt_invariants | 5 distinct file-level errors on `.sim` | 5 distinct file-level errors on `.sim` |
| `reaction_diffusion_2d_stack_d.invariants` missing in test_pbt_invariants | 1 errors on `.invariants` | 1 errors on `.invariants` (co-resident with test_pbt_invariants' `.sim` error per pytest collection ordering) |
| `reaction_diffusion_2d_stack_d.reference` missing in test_reference_sanity | 1 error on `.reference` | 1 error on `.reference` |
| Committed Stage 1a evidence file sha256 in the worktree | `685e5cc0…23ad6446` | `685e5cc0…23ad6446` (byte-identical) |

**Live-re-run sha256 vs committed evidence sha256 distinction.** The committed Stage 1a evidence file (`tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt`) carries sha256 `685e5cc0…23ad6446` — this is the load-bearing audit-chain anchor cited as `Failing-tests-output-hash-witnessed` in the Stage 1b commit footer. The live `pytest tests/ -v` re-run inside the worktree produces output that differs byte-for-byte from the committed evidence file by exactly three substring patterns: (1) absolute worktree path (`/tmp/bp-replay-ca9bc0b-rd2d-stack-d/` vs original `/home/otacon/Projects/Bit-Physics/`), (2) venv interpreter symlink (`.venv/bin/python` vs `.venv/bin/python3`), (3) pytest's `cachedir` location which is worktree-relative. Per charter § 2 row 13 ("**structural reproduction (not full-text sha256)**"), the audit-chain contract is satisfied: the committed evidence file's sha256 is byte-stable in the worktree AND the live failure-mode structure matches the Stage 1a per-test breakdown. (See § 9 N1 below for the dispatch-vs-charter wording reconciliation banked as an informational observation.)

**Cleanup.** `git worktree remove /tmp/bp-replay-ca9bc0b-rd2d-stack-d` clean; `git worktree list` shows only HEAD at `89b7327`/`276bd85` post-commit.

## 7. Determinism-strategy declaration summary

(FACT — `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py` top-of-file docstring; cited in commit footer.)

```
"""SimRunner adapters wiring the Stack-D Taichi-DSL Gray-Scott into testkit protocols.

Determinism strategy declaration (conventions doc § F.1; cited from the
Stage 1b commit footer):

- Reduction-ordering posture. No in-kernel reductions. ...
- Index-sorting / iteration-order pinning. ti.ndrange(n, n) row-major + cpu_max_num_threads=1 ...
- RNG threading. NumPy default_rng(seed) IC only; Taichi ti.random surface unused ...
- Phase-2+ deferred. GPU arch determinism; FMA fusion; subgroup-collectives (NOT in scope).
...
"""
```

Path: `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py:1-50`.

## 8. MMS gate-4 observed-order summary

(FACT — `test_mms_observed_order_at_canonical_params` live output at Stage 1b implementation commit; pretty-printed for footer + audit.)

```
MMS convergence-rate ladder (RD-2D Stack-D, t_final=0.05):
  N= 16  dx=1.250000e-01  dt=8.333333e-03  n_steps=    6  ||e_U||_2=5.185981e-04  ||e_V||_2=6.969726e-06
  N= 32  dx=6.250000e-02  dt=2.380952e-03  n_steps=   21  ||e_U||_2=1.304956e-04  ||e_V||_2=2.001647e-06
  N= 64  dx=3.125000e-02  dt=6.097561e-04  n_steps=   82  ||e_U||_2=3.263738e-05  ||e_V||_2=5.185505e-07
  N=128  dx=1.562500e-02  dt=1.524390e-04  n_steps=  328  ||e_U||_2=8.154778e-06  ||e_V||_2=1.306630e-07
observed OOA: U=1.9972  V=1.9160  combined=1.9972  (formal=2.0, tolerance ±0.5)
```

**Verdict.** Combined L2 OOA = 1.9972, which is within ±0.5 of the formal 5-point Laplacian spatial order 2.0. Gate-4 PASS. The per-grid `||e_V||_2` is two orders of magnitude smaller than `||e_U||_2` because the manufactured V solution oscillates faster (sin(t) factor) and the time-stepping at this CFL ratio captures it nearly exactly; combined L2 is dominated by U which dominates the slope fit.

**Load-bearing mitigations carried from RD-3D P23 playbook.** (i) `L_domain = 2 · mms.L` per `_build_mms_grid` — without this the 5-point periodic stencil reads from a sign-flipped copy of sin(κx) at the boundary and OOA collapses to ~1.0; (ii) `dt = cfl_safety · dx² / (4 · max(D_u, D_v))` with `cfl_safety = 0.4` — without this larger N runs CFL-violated and the L2 errors at larger N diverge non-monotonically, contaminating the slope fit.

## 9. New SHIFTs surfaced at Stage 1b

| ID | Description |
|---|---|
| **N1 (Stage 1b)** | **Gate-13 replay-output sha256 reproduction is byte-EXACT for the committed evidence FILE but STRUCTURAL-only for the live pytest re-run.** The dispatch instruction "Verify the output sha256 reproduces EXACTLY: 685e5cc0…" admits two readings: (a) the committed Stage 1a evidence file's sha256 must reproduce byte-identically in the worktree, OR (b) the live `pytest tests/ -v` re-run output's sha256 must equal the committed evidence file's sha256. Reading (a) is physically achievable and verified — the file IS byte-stable in the worktree at `ca9bc0b…`. Reading (b) is physically IMPOSSIBLE for any worktree at a different absolute path, because pytest's `-v` output embeds the venv path + rootdir + test file path. Charter § 2 row 13 explicitly says "**structural reproduction (not full-text sha256)**" — this is the authoritative wording. Banked observation: subsequent per-sim cross-stack port Stage-1b dispatch prompts should align the "(f) sha256 reproduces EXACTLY" wording to mean (a) (file-sha256 stable in the worktree) + (g) (failure-mode structural match). Not a portfolio convention amendment; dispatch-wording-clarification-level. |
| **N2 (Stage 1b)** | **`ti.types.ndarray()` arg type chosen over `ti.template()` for kernel signatures.** The dispatch suggested `ti.template()` for the U/V/source field arguments. In Taichi 1.7.4, `ti.template()` requires the kernel to consume `ti.field()` references whose shapes were determined at allocation time; the snode-tree is finalised on first kernel launch, which means new fields cannot be allocated for a different N after the first kernel call. Since the Stack-D port runs the kernel at both n=128 (canonical) and n ∈ {16, 32, 64, 128} (gate-4 MMS sweep) within the same test session, `ti.template()` would have required a per-N `ti.reset()` + re-`ti.init()` + re-allocate cycle, OR a complex FieldsBuilder ladder. `ti.types.ndarray()` takes NumPy arrays directly at kernel launch — no snode-tree allocation, zero-copy where dtype + layout match, deterministic kernel-launch semantics under `cpu_max_num_threads=1`. The determinism contract is unchanged (`ti.ndrange(n, n)` row-major + serialised; no in-kernel reductions). Stage 0 evidence at `r-p5-mms-stack-d-2026-05-23T17-33-13Z.txt` (sha256 `5270108c…7b2bada77`) empirically witnesses this kernel-arg form with a smoke `@ti.kernel`. Banked observation for subsequent Phase-2 Stack-D port sub-phases: prefer `ti.types.ndarray()` over `ti.template()` when the same kernel needs to run at multiple resolutions in the same process. |

**Stage 1b R-class surfaces.** R-P3 (Taichi field-init order) mitigated structurally: `_ensure_taichi()` lazily calls `set_taichi_deterministic` before the first kernel launch; `@ti.kernel` decoration at module load is acceptable in Taichi 1.7 (lowering deferred until first call). R-P4 (kernel-launch grid sizing) acknowledged in design docstring: Stack-D uses no workgroup analog (different from Stack-B WGSL's 8×8). R-P5 (MMS source-term injection) mitigated empirically: gate-4 observed OOA = 1.9972 passes at the 4-grid ladder. No new R-class surfaces emerged.

**Cumulative shift count at Stage 1b close.** 111 + 2 = **113** entering Stage 1c.

## 10. Stage 1c dispatch readiness

(FACT — per charter § 4.2.3.)

Stage 1c (cross-stack equivalence + landing-prep) is dispatchable verbatim per charter § 4.2.3. The Stack-D canonical capture (`captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`) is produced + committed at this Stage 1b close; Stage 1c reads it alongside the Stack-B Phase-0-frozen capture (`captures/reaction-diffusion-2d-ref/...`) and runs `compare_captures` at `relative = 1e-4, absolute = 0.0`.

**Stage 1c scope (per charter § 4.2.3, 7 steps):**

1. Create `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (NEW file).
2. Run cross-stack equivalence harness against the Stack-D + Stack-B captures.
3. Gate-14 acceptance verdict — `within_tolerance == True` at `relative = 1e-4`.
4. Tolerance.toml per-sim override decision (probe lean: NOT needed).
5. Schema-corpus entry at `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}`.
6. Remove the module-level `pytest.mark.skip` from `tests/test_cross_stack_equivalence.py`; verify GREEN.
7. Commit + checkpoint audit + Convention #12 SHA back-fill.

**Cross-stack diff readiness — informational.** A step-by-step diff against the Stack-B canonical capture is NOT performed at Stage 1b (Stage 1c's gate-14 owns that). However, the load-bearing R-P2 concern from the charter (Pearson-λ chaotic regime divergence between Stack-B and Stack-D at the 2000-step horizon due to different FP-accumulation orders) is mitigated by design: Stack-D's IC is NumPy-bit-identical to Stack-B's at step 0 (both use the same `numpy.random.default_rng(seed=42)` perturbation), the algorithm is algebraically identical (forward Euler + 5-point Laplacian + reaction), and only the FP-arithmetic accumulation primitives differ (NumPy vectorised vs Taichi-DSL per-cell). The cross-stack diff at step 2000 is expected to be near-zero relative to the chaotic-regime amplitude (which is O(1) in the λ-pattern). Stage 1c will measure this empirically and document the step-horizon at which the diff approaches the 1e-4 tolerance.

**Acceptance for Stage 1c.** Gate-14 GREEN; `equivalence.md` authored; schema-corpus entry seeded; cross-stack-equivalence test un-skipped + passing; single sub-bundle commit + checkpoint + Convention #12 back-fill.

---

This checkpoint lands at HEAD `c36a1b4c7ff8c1ec83f1a8a92aaf57c5b2a8cf08` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(reaction-diffusion-2d-stack-d-stage1b-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time). The Stage 1b implementation commit is `276bd854cc1c41749c87cc6b9f05eea4fed4021e`.

Verdict: **CONFIRMED**.
