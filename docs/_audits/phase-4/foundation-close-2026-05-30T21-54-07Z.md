---
date: 2026-05-30T21-54-07Z
author: phase-4 foundation campaign (Claude Code, PHASE B WU-C..WU-G)
subject: "Phase-4 FOUNDATION CLOSE — WU-C..WU-G completion report (PHASE B)"
kind: foundation-close
verdict: FOUNDATION-COMPLETE-WITH-WU-D-CUDA-BLOCKED-CPU-FALLBACK
head_sha: 9bc92f549ae67a0d6c7e0569c8d6f6ec4ff6ad60
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 45eed4cacb64b711c461f6e3b76958a646e6b0517302c3921bce2f18ef3018d2
parent_audits:
  - docs/_audits/phase-4/wu-c-probe-2026-05-30T20-40-03Z.md
  - docs/_audits/phase-4/wu-d-probe-2026-05-30T21-20-10Z.md
  - docs/_audits/phase-4/wu-e-probe-2026-05-30T21-41-13Z.md
  - docs/_audits/phase-4/wu-f-probe-2026-05-30T21-47-31Z.md
  - docs/_audits/phase-4/wu-g-probe-2026-05-30T21-51-41Z.md
  - docs/_audits/phase-4/pre-dispatch-review-2026-05-30T17-54-54Z.md
---

# Phase-4 FOUNDATION CLOSE — PHASE B (WU-C → WU-G)

> The Phase-4.0 foundation is **substantively complete (8/8 WUs)**. PHASE A
> (A1-A7 + replay residue + Option-A entry gate), WU-P (Stage 1), WU-A (Stage 2),
> and WU-B (Stage 3) landed before this session. This report covers the remaining
> **PHASE B** stages WU-C..WU-G (Stages 4-8), self-driven and committed directly
> to `main` (trunk-based). No tag pushed (operator-only, I7). Findings are FACT
> (ran/read) or INFERENCE (reasoned); verdicts four-state (CONFIRMED / SHIFTED /
> BLOCKED / FLAGGED).

## §0 — Headline

| Stage | WU | Tip SHA (pushed) | Verdict | §S.5 sweep |
|---|---|---|---|---|
| 4 | WU-C Gaussian Splatting | `6815e24` | **CONFIRMED** | all green |
| 5 | WU-D Newton Physics | `65908e5` | **SHIFTED** (CPU surface + USD landed; **Newton runtime BLOCKED** — CUDA absent, operator-ratified CPU-fallback) | all green |
| 6 | WU-E Learning Harness | `5689a2b` | **CONFIRMED** (pins re-resolved live) | all green |
| 7 | WU-F Variant Equivalence | `55b3422` | **CONFIRMED** | all green |
| 8 | WU-G Phase Ledger | `9bc92f5` | **CONFIRMED** | all green |

Integrity invariant **0 HARD_FAIL / 14 SOFT_WARN** held at every push; §R digest
at foundation-close HEAD = `45eed4ca…3018d2` (measured live; unchanged from the
entry-gate — the foundation added no golden tables / audit-log emitters).

## §1 — WU-C Gaussian Splatting (Stage 4) — CONFIRMED

Commits: probe `a86398d` → `cca05ea` (common-3dgs surface) → `ebb689f`
(render_similarity) → `6815e24` (docs). Extends the Phase-3 `common-3dgs`
baseline (symbols imported UNCHANGED) with `TrainingLoop`/`TrainingHistory`,
`PhysicsCoupling`, viewer (`render_to_image`/`launch_interactive_viewer`), and
testkit `ms_ssim` + `RenderSimilarityReport`. 114 tests green; ruff + mypy
--strict clean.

**3 named anchors (FACT):**
1. **Kerbl et al. 2023 SIGGRAPH Eq. 6 alpha-compositing** — exercised by the
   landed `test_render_values.py` (front-to-back compositing; centred splat
   brightest at centre, background where opacity→0).
2. **PhysGaussian Eq. (8) Σ' = F Σ Fᵀ** — `test_coupling.py`: F=diag(2,3,5) on an
   axis-aligned Σ → new scales {0.2,0.3,0.5} (covariance reconstruct→deform→
   eigendecompose).
3. **Hand-derivation, F=I identity** — `test_coupling.py`: identity deformation
   preserves scales.

**2 PBT:** `render_similarity_self_identity` + `gaussian_serialization_round_trip`.

**Mutation-vs-Phase-3 (§2.13 SOFT_WARN-advisory; A3 record-honestly-don't-widen):**
- `render_similarity/metrics.py`: **140/211 killed = 0.663**, 71 survived. This
  is a **regression vs the Phase-3 banked 0.7857** (render-similarity sub-phase
  banked below the 0.85 threshold; mutant pool grew 84→211 as `ms_ssim` landed
  real code). Survivors concentrate in the lpips-infrastructure region + ms_ssim
  arithmetic-constant mutants. Per §2.13 + the exact A3/Phase-3 precedent on THIS
  target: **banked, threshold UNCHANGED at 0.85, NOT widened**; ms_ssim
  mutation-hardening (target-specific constraining tests) routed as a follow-up.
  NB: there is no `phase-3-task-1-<UTC>.json` common-3dgs baseline file — the
  "no-regression vs Phase-3 baseline" acceptance degenerates to the 0.80 floor.
- `common-3dgs/src`: measured in the consolidated close-batch (§7).

Perf-ledger: `common-3dgs warp-cpu smoke-render-256-gaussians 0.143s`.

## §2 — WU-D Newton Physics (Stage 5) — SHIFTED (runtime CUDA-BLOCKED)

Commits: probe+vendor `2b12749` → `348d39c` (newton/usd surface) → `65908e5`
(registration + docs). **Newton version pin = v1.0.0** (`d6046f18…`, 2026-04-13,
**Apache-2.0** confirmed via the tag `LICENSE.md`; latest upstream v1.2.0 — pinned
to the 1.0.x line per §3.3). **usd-core 26.5** (LicenseRef-TOST-1.0 = Modified
Apache-2.0).

**CUDA availability: ABSENT** (`torch.cuda.is_available()` False; no
`nvidia-smi`/`nvcc`; warp CPU-only). **Disposition = the operator-ratified
CPU-fallback (spec §12.8 + plan §7.5 v9 addendum: "CPU determinism + USD export
validates"):**
- **LANDED on CPU:** `NewtonBackend` metadata (SOLVERS×6, solver validation,
  `determinism_declaration`), `NewtonState`, `DeterminismDeclaration`,
  `create_scene_template` + `export_capture_to_usd` (USD is CPU-only), PBT
  `usd_round_trip_preserves_pose` + `determinism_declaration_consistent`. 85
  common-warp tests green; ruff + mypy --strict clean.
- **BLOCKED (surfaced loudly, never silently no-op'd):** the Newton solver
  runtime (`step`/`state`/`newton_instance`/`reset_to_initial`) — needs the
  `newton` package + CUDA 12 / driver 545+; the wrapper lazy-imports + raises a
  clear `RuntimeError`. The suggested `solver_no_overpenetration` PBT (needs the
  solver runtime) is BLOCKED. Mirrors WU-B's `SparseVolume.from_voxels` gating.
- Newton vendored as `references/newton/` = MANIFEST + LICENSE + `fetch.sh`
  (§0.3 "fetch script" shape — full source is large, LFS-bound, unrunnable
  without CUDA; cited for independent derivation per §2.4).

Perf-ledger: `common-warp-usd usd-round-trip-100steps-8bodies 0.032s`; the
`common-warp-newton smoke-pendulum` row is BLOCKED (CUDA).

## §3 — WU-E Learning Harness (Stage 6) — CONFIRMED

Commits: probe `6a5a331` → `27490f0` (learned surface) → `5689a2b` (registration
+ docs). **Live-resolved runtime pins (the dispatch's load-bearing ask):**
- **PyTorch Lightning = `lightning` 2.6.5** (Apache-2.0; pinned `>=2.6,<3.0`).
- **NVIDIA PhysicsNeMo = `nvidia-physicsnemo` 2.1.0** (Apache-2.0, 2026-05-26).
  **The plan's "specific 1.x" guidance is STALE (A-6 confirmed live):** core 1.x
  ended v1.3.0; the framework is 2.x. Base 2.1.0 is CPU-installable (no cu12/cu13
  extras); installed cleanly with the workspace torch pin (2.12.0+cu130) intact;
  `physicsnemo.Module` is subclassable (the adapter wraps it for real).

Landed: `CaptureDataset` (deterministic seed-pinned split), `CaptureLightningDataModule`,
`default_trainer` (seed_everything+deterministic, ModelCheckpoint topk=3,
EarlyStopping), `warp_to_torch`/`torch_to_warp`, `PhysicsNeMoAdapter`. common-py
58 + common-warp 86 green; PBT 2 (`dataset_split_no_overlap` +
`seed_determinism_within_lightning`). **§0.3 SHIFT:** `common_py.learned` is NOT
eagerly registered in `common_py/__init__` (would force torch+lightning on every
Taichi-based common-py consumer); `common_warp.learned` IS (import-light).
Perf-ledger: `common-py-learned smoke-train-1-epoch-fake-data 0.037s`.

## §4 — WU-F Variant Equivalence (Stage 7) — CONFIRMED

Commits: probe `fa38ae7` → `cec1643` (variant harness) → `55b3422` (mutmut
target). `equivalence.variant`: `VariantToleranceSpec`, `compare_captures`,
`EquivalenceReport`, `assert_within_budget`/`ToleranceBudgetExceeded`. 18
equivalence tests green; ruff + mypy --strict (source) clean. PBT
`identity_variant_passes` + `tolerance_monotone`.

**The 6 per-axis tolerance-budget caps as landed (numerically as specced, plan §7.7):**

| Axis | Metric | Default | Budget cap |
|---|---|---|---|
| differentiable | relative (gradient verification) | 1e-3 | ≤ 1e-2 |
| sparse | absolute (sparse-vs-dense) | 1e-6 | ≤ 1e-4 |
| neural | PSNR / SSIM (render-similarity) | ≥35 / ≥0.9 | floor ≥25 / ≥0.7 |
| frontier | per-paper | — | no fixed cap (set at variant-stage dispatch) |
| newton | absolute (USD-round-trip) | fp32 | ≤ fp16 (9.765625e-4) |
| learned | norm-bound (rollout-stability) | ≤1.5× | ≤ 3× |

Mutation target `[targets.variant]` threshold **0.85**; measured in §7.

## §5 — WU-G Phase Ledger (Stage 8) — CONFIRMED

Commit `9bc92f5` (documentation-only; no TDD per plan §2359). `docs/phase4/ledger.md`
= **27 rows 1:1 with spec §11.5 4.1-4.27** (verified 27 rows / 27 unique items;
13 cols incl. v9 PBT-invariants + perf-row); `dependency-graph.md`; `_audits/.gitkeep`;
**16 variant stubs** (6 diff / 3 sparse / 3 neural / 4 frontier; §4.2.G header +
v9 §6/§8 TODO); `rigid-body` + `learned-dynamics` category READMEs.

**§0.3 code-path SHIFT (ratified, consistent with WU-P):** Phase-4 variant CODE
lands under **flat `packages/<sim>-<variant>/`** (WU-P's flat-`packages/`
ratification extended; the plan's `<category>/<sim>/<variant>/` has ZERO landed
precedent); the DOCS path `docs/sim-specs/<category>/<sim>/spec-<variant>.md`
stays category-nested. Recorded in the ledger header + the WU-G probe.

## §6 — §S.5 workflow sweeps (all pushed SHAs)

| SHA | Stage | Result |
|---|---|---|
| `6815e24` | WU-C | all workflows success (python-strict, integrity, equivalence, determinism, cpp-strict, ts-strict, tolerance-budget, mutation-testing, audit-append-only, structure) |
| `65908e5` | WU-D | all workflows success |
| `5689a2b` | WU-E | all workflows success |
| `55b3422` | WU-F | all 10 workflows success (incl. mutation-testing — `[targets.variant]` framework-validation green) |
| `9bc92f5` | WU-G | all 9 workflows success (python-strict, integrity, equivalence, determinism, cpp-strict, ts-strict, tolerance-budget-check, audit-append-only, structure) |

## §7 — Consolidated mutation batch (§2.13 SOFT_WARN-advisory)

Mutation is run in a consolidated close-batch (serialized to avoid corrupting
the in-flight test venv during the WUs). FOLDED IN at §8 below. Measured: WU-F
`variant` (threshold 0.85) + WU-C `common_3dgs` (threshold 0.80). WU-D
`newton/usd` + WU-E `learned` mutation is **expected below floor** (much surface
is CUDA/dep-gated runtime that raises rather than executes → unkillable on CPU);
banked per §2.13 + the A3 record-honestly precedent, NOT widened — target-specific
constraining tests are the lever, routed as a Phase-4.1 follow-up.

## §8 — Mutation results + WU-G sweep (measured)

**WU-F `variant` (threshold 0.85):** **91/131 killed = 0.695** (40 survived).
BELOW the 0.85 threshold. Survivors concentrate in `harness.py` (the per-norm
error/threshold arithmetic + frame-matching) + tolerance budget edge messages.
Per §2.13 (SOFT_WARN-advisory) + the A3 / Phase-3-render-sim record-honestly
precedent: **banked, threshold UNCHANGED at 0.85, NOT widened** — target-specific
constraining tests are the lever (routed as a Phase-4.1 follow-up).

**WU-C `common-3dgs/src` (threshold 0.80):** the target now spans the whole src
(~1475 mutants after the WU-C additions — training/coupling/viewer/splatting +
the Phase-3 model/render/camera/_kernels). Early trend (~32/52 ≈ 0.62) and the
~440 new lines of behaviorally-tested-but-not-constant-pinned surface (FD
optimiser internals, quaternion helpers, viewer guards) predict **below the 0.80
floor**, consistent with render_similarity (0.663) and variant (0.695). Per
§2.13 + A3: banked, threshold unchanged, not widened. There is no Phase-3
common-3dgs baseline file, so "no-regression" degenerates to the 0.80 floor.
**Final measured value folded in via a Convention-#12-style follow-up if the
batch completes; otherwise this is the honest disposition.**

**WU-D `newton/usd` + WU-E `learned`:** NOT separately measured — much of their
surface is CUDA/dep-gated runtime that *raises* rather than executes on CPU
(unkillable), so a kill-rate would be artificially deflated and non-informative.
Banked per §2.13; the runtime mutation lands when a CUDA host runs Stages 31-35.

**Campaign-wide mutation posture (honest):** every Phase-4 foundation mutation
target measured sits below its threshold (render_sim 0.663, variant 0.695,
common-3dgs ≈0.6-0.7), continuing the ratified Phase-3 pattern (render-sim banked
0.7857; A3 `code_verification_mms` 0.2243 / `property` 0.3455). §2.13 is
SOFT_WARN-everywhere (HARD_FAIL is an earned per-target promotion); none widened,
none faked. The lever across all is target-specific constraining tests — a
Phase-4.1 mutation-hardening pass.

**WU-G §S.5 sweep (`9bc92f5`):** all 9 workflows success (§6).

## §9 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / plan / probe) | Measured live | Disposition |
|---|---|---|---|
| C-1 | WU-D CUDA available → Newton runtime validates | CUDA ABSENT; Newton runtime can't run | **SHIFTED/BLOCKED** — CPU surface + USD landed per the operator-ratified CPU-fallback; runtime surfaced BLOCKED (§2). |
| C-2 | physicsnemo "specific 1.x" (plan §3.3/§7.6) | latest is 2.1.0; core 1.x ended v1.3.0 | **A-6 confirmed** — pin re-resolved to 2.1.0 (§3). |
| C-3 | plan §4.2.C contract (`n_gaussians`, `Camera.fovx`, `(3,H,W)`) | landed Phase-3 surface differs (`num_gaussians`, `Camera.view_matrix`, `(H,W,3)`) | **SHIFTED** — built on the landed surface (imported UNCHANGED) per §0.3 (§1). |
| C-4 | plan "skip `mpm-multimaterial/spec-neural.md`" (exists) | does NOT exist (task-8 = `neural-rendered/3dgs-mpm/`) | **SHIFTED** — all 16 stubs created; skip-if-exists skipped nothing (§5). |
| C-5 | plan `particle-fluid/sph-water` | landed dir is `particle-fluids/` (plural) | **SHIFTED** — followed landed reality (§5). |
| C-6 | render_similarity ≥0.85 (Phase-3 banked 0.7857) | 0.663 (ms_ssim grew the pool) | **SHIFTED** — banked, threshold unchanged, not widened (§1). |
| C-7 | no `test-common-py`/`test-common-warp` CI job | confirmed absent — WU-C/D/E common-* tests validated locally, not CI-gated | Surfaced (§3 probe); deps recorded in lockfile + dependencies.md. |

## §10 — Disposition

**PHASE B complete (WU-C..WU-G landed + pushed to `main`).** The Phase-4.0
foundation is substantively complete (8/8 WUs). WU-D's Newton solver runtime is
BLOCKED on CUDA (operator-ratified CPU-fallback; the CPU surface + USD + determinism
declaration landed). All §S.5 sweeps green; integrity 0 HF / 14 SW held. No tag
pushed (I7 — operator-only). Frontier Stages 9-35 have their WU-G stubs + ledger
rows + dependency-graph sockets ready. Convention #12 SHA back-fill applies to
this audit's `head_sha`.
