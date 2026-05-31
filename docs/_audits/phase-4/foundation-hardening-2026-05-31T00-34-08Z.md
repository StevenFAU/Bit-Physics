---
date: 2026-05-31T00-34-08Z
author: phase-4.1 foundation-hardening campaign (Claude Code)
subject: "Phase-4.1 FOUNDATION HARDENING — mutation-score hardening pass (5 SOFT_WARN-advisory targets) + promotion dispositions"
kind: foundation-hardening
verdict: HARDENING-COMPLETE-2-PROMOTED-3-ADVISORY
head_sha: 07667e5c53d94224485cc803a7148fc9e6d67771
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
parent_audits:
  - docs/_audits/phase-4/foundation-close-2026-05-30T21-54-07Z.md
  - docs/_audits/phase-4/pre-dispatch-review-2026-05-30T17-54-54Z.md
  - docs/_audits/phase-4/pre-dispatch-probe-2026-05-30T17-04-02Z.md
---

# Phase-4.1 FOUNDATION HARDENING — mutation-score hardening pass

> A hardening pass that runs BEFORE the Run-2 frontier sims so the 27 sims are
> built against a stronger verification bar. Mutation-score hardening done by
> adding **oracle-grounded** constraining tests (analytic results, cited anchor
> equations, conservation/symmetry laws, tolerance-boundary values) — NEVER by
> snapshotting current code output. Each surviving mutant is CLASSIFIED:
> (i) REAL TEST GAP → add oracle test; (ii) EQUIVALENT MUTANT → document, do not
> fake-kill; (iii) OUT-OF-SCOPE SOURCE → narrow target with justification.
>
> Findings are FACT (ran/read) or INFERENCE (reasoned); verdicts four-state
> (CONFIRMED / SHIFTED / BLOCKED / FLAGGED). Self-driven, committed directly to
> `main` (trunk-based); no tag pushed (operator-only, I7). Progress is written
> here (the committed audit), not to memory.

## §0 — PHASE 0 contract re-confirmation (gate; done FIRST) — CONFIRMED

Independently re-confirmed at HEAD `1623d1a` by RUNNING/READING (not trusting the
foundation-close report):

**WU-A (Autodiff schema bump) — CONFIRMED.**
- `tools/testkit/schemas/tests/test_legacy_captures_roundtrip.py`: **28 passed**
  in 4.78s (17 real captures round-trip + 9 Phase-1 placeholder classified-loudly
  + 2 meta). The 26-pair corpus round-trip HARD gate holds. (FACT — ran.)
- `schema_version` is **1.1.0** + `MAX_SUPPORTED_VERSION = "1.1.0"` in all four
  surfaces: testkit `tools/testkit/capture/manifest.py:21`, common-py `common/common-py/src/common_py/capture.py:52`,
  common-warp `common/common-warp/src/common_warp/capture/writer.py:37`, common-cpp `common/common-cpp/include/bit_physics/common/capture.hpp:67`
  (`kMaxSupportedSchemaVersion`, default `schema_version` field = that constant).
  (FACT — read.)
- `gradient_fields` is in `properties` (`tools/testkit/schemas/capture-v1.json:100`) and **NOT** in the
  root `required` list (7 keys: schema_version/sim/stack/config/run/payload/
  determinism, lines 8–16). `CaptureManifest.from_dict` accepts it (optional,
  default `None`; omitted from `to_dict` when `None`). (FACT — read.)

**WU-F (Variant tolerance budgets) — CONFIRMED.**
- The 6 per-axis caps as landed (`tools/testkit/equivalence/variant/tolerance.py:43-57`): differentiable
  `relative_max 1e-2`; sparse `absolute_max 1e-4`; neural `psnr_min_floor 25.0` /
  `ssim_min_floor 0.7`; frontier (no fixed cap); newton `absolute_max 9.765625e-4`
  (fp16); learned `norm_bound_max 3.0`. (FACT — read.)
- `assert_within_budget` boundary behavior MEASURED live: at the cap value it does
  NOT raise (inclusive: `value > cap` for max axes, `value < cap` for floor axes);
  one `math.nextafter` epsilon OVER a `*_max` cap RAISES `ToleranceBudgetExceeded`;
  one epsilon UNDER a `*_floor` RAISES. Verified on differentiable (rel), newton
  (abs), neural (psnr floor). (FACT — ran.)

**Both contracts hold → no broken-foundation HARD-STOP; PHASE 1 proceeds.**

## §1 — PHASE 1 mutation hardening (target by target) — IN PROGRESS

Five SOFT_WARN-advisory targets (foundation-native first, then carryovers):

| Target | Threshold | Pre (measured at close) | After | Survivor classes (i gap / ii equiv / iii oos) | Disposition |
|---|---|---|---|---|---|
| `render_similarity` (metrics.py) | 0.85 | 0.663 (140/211) | **0.9242 (195/211)** | killed 55 gaps; residual 16 = 5 equiv + 11 oos | **CLEARS → PROMOTE** |
| `variant` | 0.85 | 0.695 (91/131) | **0.8702 (114/131)** | killed 23 gaps; residual 17 = 6 equiv + 11 oos | **CLEARS → PROMOTE** |
| `common_3dgs` (src) | 0.80 | 0.663 (978/1475) | **0.7708 (1137/1475)** | +159 killed; 326 residual (mixed real-gap + np.empty-flaky + oos) | **STAYS ADVISORY** (genuine hardening, below floor — not forced) |
| `code_verification_mms` | 0.80 | 0.215 (138/642) | **0.438 (138/315) narrowed** | class-(iii) narrowed (−327 cross-driven); residual = report/HDF5/CLI glue | **STAYS ADVISORY + SURFACED** (narrowing + RD-2D coverage gap) |
| `property` | 0.80 | 0.170 (151/890) ¹ | **0.6453 (151/234) narrowed** | class-(iii) narrowed (−656 test-files + per-sim); residual 83 = core real-gap | **STAYS ADVISORY + SURFACED** (narrowing + core-oracle lever) |

¹ Re-measured live at HEAD (890 mutants — the `property` package GREW with WU-C/D/E
satellite PBT test-dirs since the A3 437-mutant figure; A3's 0.3455 is stale).

(Per-target detail sections appended below as each lands.)

### §1.A — `render_similarity` (metrics.py) — CLEARS 0.85, PROMOTE

**Before → after: 0.663 (140/211) → 0.9242 (195/211)** (measured live; mutmut 2.5.1,
cache cleared before each run; runner `pytest render_similarity/tests/`). New tests
in `tools/testkit/render_similarity/tests/test_metrics_mutation_oracles.py` (19 tests,
all oracle-grounded — NO snapshots). The score counts the 16 residual mutants as
survivors, so the clear is genuine (NOT reached via equivalent-exclusion).

**55 REAL-GAP mutants killed (class i) — oracle per group:**

| Mutants | Surface | Oracle |
|---|---|---|
| 73–76 | LPIPS `(x/MAX_I)*2-1` input normalization | Zhang 2018 / lpips package documented [-1,1] convention — built the convention-correct tensors and called the cached model directly; our `lpips()` must match (identity tests can't catch this — both images transform identically). |
| 84–88 | `_MS_SSIM_WEIGHTS` (5 values) | Wang/Simoncelli/Bovik 2003 Table-1 published constants (direct anchor + sum≈1). |
| 91–101 | `_to_luminance` BT.601 coeffs + channel indices | ITU-R BT.601 luma (pure-R/G/B/white → 0.299/0.587/0.114/1.0, hand-derived). |
| 102,106,111,114–130 | `_downsample_2x` 0.25 box-average + crop dims | hand-computed 2×2 mean (4 distinct corners) + odd/non-square crop-shape assertions. |
| 135–146, 175 | `_ssim_l_cs` c1=(0.01·dr)², c2=(0.03·dr)², gaussian(σ=1.5,trunc=3.5), L·cs | independent Wang-2004 Eq.6 re-derivation, parametrised over data_range∈{1.0, 255.0} (the uint8 case pins the `·data_range` operator — `·` vs `/` coincide at dr=1). |
| 179, 182–183 | `min(shape[0],shape[1])`, `min_dim < 2` guard | non-square scale-count + min-dim-2-does-not-raise. |
| 187,193,195,199,203,206,208,210,211 | ms_ssim Eq.7 assembly (scale branch, clip, weight idx/renorm, `*=`) | full Wang-2003 Eq.7 re-derivation from independently-validated parts, on 8×8 (3-scale) + 4×16/16×4. |
| 30 | `requires_grad_(False)` | D-DET docstring contract: cached model params all frozen. |

**16 residual survivors (HONESTLY excluded; NOT fake-killed):**
- **5 class-(ii) EQUIVALENT** — no observable behavioral change: `28` `LPIPS(verbose=False→True)` (console only); `31` `_ = torch → _ = None` (pure lint no-op); `190`/`191` `mssim_final = 1.0 → 2.0/None` (init is unconditionally overwritten — n_scales≥1 always, since min_dim≥2 ⇒ the loop hits `scale==n_scales-1`); `200` `np.clip(…, 0.0, 1.0) → (…, 0.0, 2.0)` (cs ≤ 1 for in-domain inputs, so the upper clamp never binds).
- **11 class-(iii) OUT-OF-SCOPE** — error-MESSAGE string wording (`17,21,22,23,34,37,42,44,46,47,184`): mutate the human-readable text inside `ValueError`/`AssertionError` messages. The behavioral contract (the exception TYPE + that it fires) is already tested via `pytest.raises(match=…)`; the surviving mutants only alter wording. Killing them needs brittle exact-full-string assertions — the snapshot anti-pattern the §2.13/core-principle forbids. Recorded, not padded.

**Disposition: PROMOTE to HARD_FAIL-at-landing (§2.13).** Clears 0.85 by +0.074 on
real oracle tests, no snapshot padding, equivalents counted as survivors.

### §1.B — `variant` (tolerance.py + harness.py) — CLEARS 0.85, PROMOTE

**Before → after: 0.695 (91/131) → 0.8702 (114/131)** (measured live; baseline
re-confirmed with the new tests moved aside = exactly the foundation-close 91/131).
New tests in `tools/testkit/equivalence/variant/tests/test_harness_oracles.py` (12)
+ `tools/testkit/equivalence/variant/tests/test_tolerance_oracles.py` (4). The 40
baseline survivors concentrated in `harness.py` (the relative-tol term, the
Wasserstein branch, time/sim_time frame-matching — `test_compare.py` only ever
used `relative_tol=0.0`, the L2/Linf norms, and step-index matching) + tolerance
edge cases. Clears 0.85 by **+0.0202** (NOT the <0.02 borderline band).

**23 REAL-GAP mutants killed (class i) — oracle per group:**

| Mutants | Surface | Oracle |
|---|---|---|
| 34, 36, 47 | L2 norm order, ref_norm order, threshold `abs + rel·‖ref‖` (`+`→`-`) | hand-computed ‖[3,4]‖₂=5, error 0.5, threshold boundary (rel=0.11 pass / 0.05 fail). |
| 44, 76 | Wasserstein branch + `_NORMS` membership | W1([0,0,0,0],[1,1,1,1])=1.0 (every unit of mass moves distance 1); abs=1.5 pass / 0.5 fail. |
| 40 | Linf empty-field error fallback | empty (size-0) field → Linf error 0.0 (mutated 1.0 would exceed a 0.5 budget). |
| 4, 6, 11, 13 | `"time"`/`"sim_time"` diagnostic frame-matching | time/sim_time-keyed match (vs step index) — distinguishing IC where time-match ≠ step-match. |
| 8?,9,10,16,17 | `reshape(-1)[0]` index / `t=None` | the time/sim_time tests exercise the reshape+index (None / out-of-range index raise). |
| 23 | `min(.., key=abs(t - at_sim_time))` (`-`→`+`) | nearest-time selection: times{10,20,30}, at_sim_time=21 → picks 20 (mutated `+` picks 10). |
| 67 | pass criterion `error <= threshold` (`<=`→`<`) | error EXACTLY == threshold (0.5==0.5) must pass (inclusive). |
| 95, 129 | neural psnr floor value 25.0 + floor `<` inclusivity | psnr_min=25.0 (exactly at the plan-§7.7 floor) must pass; 24.999 raises. |
| 108–111 | `neural-rendered` / `newton-backed` axis aliases | the aliases resolve to neural/newton budgets (untested — only `diff` was). |

**17 residual survivors (HONESTLY excluded; entirely equivalent / out-of-scope — NO real gaps left):**
- **6 class-(ii) EQUIVALENT**: `7,8,14,15` `reshape(-1)`→`reshape(+1)`/`reshape(-2)` on the
  scalar (size-1) time/sim_time diagnostic — all reshape variants yield the same scalar;
  `42,45` Linf/Wasserstein `ref_norm` empty-array fallback (`0.0`→`1.0`/`None`) — on an empty
  field the error is necessarily 0, so the ref_norm fallback can never flip a verdict (and
  Wasserstein raises on an empty distribution, so that branch is unreachable for empty input).
- **11 class-(iii) OUT-OF-SCOPE**: error-MESSAGE string wording (`22,29,58,59,61,62` in harness;
  `80,86,115,126,131` in tolerance) — the exception TYPE + firing is tested via `pytest.raises(match=…)`;
  only the human-readable text mutates. Killing needs brittle exact-string assertions (snapshot anti-pattern, forbidden).

**Disposition: PROMOTE to HARD_FAIL-at-landing (§2.13).** Clears 0.85 by +0.0202 on
real oracle tests; all 17 residual are equivalent / out-of-scope (counted as
survivors — no exclusion-to-reach-floor).

### §1.C — `common_3dgs` (src) — genuine hardening below floor, STAYS ADVISORY

**Before → after: 0.663 (978/1475) → 0.7708 (1137/1475)** (+159 killed, two oracle
batches; measured live). New tests in `common/common-3dgs/tests/test_mutation_oracles.py`
(54 tests). **Does NOT reach the 0.80 floor → recorded honestly (measure-then-declare),
NOT forced.** `common_3dgs` is a §2.13 **advisory satellite target** (not one of the
six spec-floored testkit/integrity modules).

**Genuine oracle kills (class i) — by group:**
- **coupling 197→88** (−109): scipy quaternion↔matrix round-trip across all 4
  `_matrix_to_quat_wxyz` trace/diagonal branches (forward + recovery); PhysGaussian
  Eq.8 eigenvalue preservation under a pure rotation; the `(N,3,3)` shape-guard `or`.
- **render 138→106** (−32): real-SH DC + degree-1/2/3 signed-coefficient terms at
  specific directions; `_quaternions_to_matrices` vs scipy; on-axis perspective
  projection to the principal point.
- **training 64→47** (−17): Adam first-step bias-corrected update (Kingma & Ba 2015,
  hand-evaluated at t=1, m=v=0); SGD `θ -= lr·g`; PSNR `10·log10(1/MSE)` closed form.

**326 residual survivors — classification (honest):**
- **class (iii) OUT-OF-SCOPE (~12+)**: `viewer.py` (10) — `launch_interactive_viewer`
  is **runtime-only per spec §7.8, explicitly NOT CI-gated**; `image_io.py` (1) —
  matplotlib `save_png` glue; plus error-MESSAGE-string mutants scattered across files.
- **class (ii)/borderline `np.empty`-flaky**: several off-diagonal rotation-matrix
  mutants redirect an assignment, leaving a cell as uninitialised `np.empty` memory
  that frequently reads back as the correct value (often 0) — non-deterministically
  killable; a deterministic-init (`np.zeros`) refactor of the source would make them
  reliably killable (a source change, out of scope for a test-only hardening pass).
- **class (i) REAL GAP — the remaining lever (documented, not yet closed)**: `model.py`
  (45) PLY binary parser/writer — symmetric save→load round-trips hide many offset/loop
  mutants; killing them needs **known-byte-layout** fixtures (assert against a
  hand-authored `.ply`), not a round-trip. `render.py` EWA covariance/Jacobian/conic
  determinant value tests. `training.py` FD-gradient / `_loss_for` / `_apply_theta`
  internals. `_kernels.py` (19) Warp compositing — single-splat Kerbl-Eq.6 hand-derived
  pixel oracles (Warp recompiles per mutation; integration-heavy).

**Disposition: STAYS SOFT_WARN advisory (§2.13).** +159 genuine oracle kills banked;
0.7708 < 0.80 recorded honestly; NOT promoted, NOT widened, NOT snapshot-padded. The
remaining lever (model PLY known-byte fixtures + render covariance value tests +
deterministic-init for the `np.empty` mutants + Warp single-splat compositing oracles)
is a follow-up, surfaced not forced.

### §1.D — `code_verification_mms` (Phase-3 carryover) — class-(iii) NARROWED, STAYS ADVISORY + SURFACED

**Measured 0.215 (138/642, 6 timeout)** at HEAD (matches the A3 0.2243 carryover).
The dispatch's mms oracle — "a manufactured solution with KNOWN convergence order;
a deliberately-wrong term is DETECTED" — **already exists** (`test_convergence`,
`test_broken_solver`, the 422-line `test_analyze_constraining`, `test_derive`,
`test_eigenfunction_decay`); the MMS-pipeline VERIFICATION math is well-constrained.
The low kill-rate is the class-(iii) artifact A3 anticipated.

**Survivor diagnosis (FACT, measured):** of 498 baseline survivors, **327 (66%)**
are three sibling sim-solution dirs the `mms/tests/` runner never imports —
`solutions/incompressible_ns_2d` (84), `solutions/reaction_diffusion_2d` (113),
`solutions/reaction_diffusion_3d` (130). They are driven by their OWN sim packages'
runners. **class-(iii) NARROWING applied** (`mutmut-config.toml`, with written
justification): exclude those three dirs (mutmut prunes them by directory name —
mutmut comma-splits the exclude list and fnmatches each pattern against directory names during its source walk). Narrowed
re-measure: **138/315 = 0.438** (pool 642→315, confirming the exclusion).

**Coverage-integrity check (FACT):** `incompressible_ns_2d` and `reaction_diffusion_3d`
retain dedicated mutmut targets (`incompressible_ns_2d_mms`, `reaction_diffusion_3d_mms`),
so excluding them de-duplicates rather than orphans. **`reaction_diffusion_2d` has NO
dedicated target** — its MMS verification belongs to RD-2D's (not-yet-landed, Phase-2+)
MMS gate, so it is currently un-targeted. **SURFACED for ratification:** add a
`reaction_diffusion_2d_mms` target (+ a RD-2D MMS convergence test) when that gate lands.

**Residual 171 narrowed survivors — classification (FACT, sampled):** dominated by
NON-VERIFICATION glue — `derive.render_markdown` (markdown report ~L88-126),
`analyze.render_acceptance_markdown` (markdown), `runner.persist_runner_result`
(HDF5 attrs/datasets) + `main` (CLI). These are class-(iii) (report/persistence/CLI),
not MMS-verification logic. NO snapshot tests added (forbidden anti-pattern).

**Disposition: STAYS SOFT_WARN advisory (§2.13); SURFACED, not promoted.** 0.438 < 0.80
recorded honestly. Two SURFACED levers (operator-ratifiable): (1) the
`reaction_diffusion_2d_mms` coverage gap; (2) a finer function-level narrowing of the
report/HDF5/CLI glue (file-level fnmatch cannot target functions) OR an explicit
"glue is non-load-bearing for the MMS-verification floor" ruling.

### §1.E — `property` (Phase-3 carryover) — class-(iii) NARROWED, STAYS ADVISORY + SURFACED

**Measured 0.170 (151/890)** at HEAD (the package grew to 890 mutants with the WU-C/D/E
satellite PBT dirs; A3's 0.3455/437 is stale). **656/739 = 89%** of survivors are
class-(iii) OUT-OF-SCOPE for the property-TESTKIT target:
- **453 in satellite PBT TEST files** — `common_3dgs/test_common_3dgs_pbt.py` (93),
  `common_py_learned/test_learned_pbt.py` (117), `common_warp_newton/test_newton_pbt.py`
  (108), `variant_equivalence/test_variant_equivalence_pbt.py` (135). These are TEST
  files (not under `tests/`, so A3's `tests` glob missed them) — mutating test files is
  the tests-mutation anti-pattern.
- **203 in per-sim invariant modules** — `sims/{gs_mpm,ising_classical,lenia,mass_spring_cloth,neural_ca,pinn_poisson,rigid_body_pedagogical}/invariants.py`.
  Each is exercised by its OWN package's PBT test (`packages/<sim>/tests/test_pbt_invariants.py`),
  NOT by `property/tests/` (confirmed: `property/sims/lenia/invariants.py` docstring cites
  `packages/lenia/tests/test_pbt_invariants.py`).

**class-(iii) NARROWING applied** (`mutmut-config.toml`, written justification): exclude
`sims` + the 4 satellite dirs (dir-name fnmatch) + keep `tests`. Narrowed re-measure:
**151/234 = 0.6453** (pool 890→234, confirming the exclusion).

**SURFACED (operator-ratifiable):** the per-sim `sims/*/invariants.py` are
exercised-but-not-mutation-targeted (the per-sim package mutmut targets mutate
`packages/<sim>/<sim>`, not these shared invariant modules) — per-sim invariant mutation
targets are a follow-up.

**83 narrowed survivors — class (i) REAL GAP in the testkit core (the remaining lever):**
`invariants/scalar_field.py` (25), `strategies.py` (25), `invariants/conservation.py` (13),
`invariants/geometry.py` (13), `harness.py` (7). The existing `test_harness_constraining.py`
covers `conservation_mass`/`overlap`/`monotone_bounds`/`divergence_free` boundaries, but
other invariant-checker functions + the Hypothesis strategy internals are unpinned. The
lever is the dispatch's **property-checker oracle** — inputs KNOWN to satisfy/violate each
declared invariant, asserting the checker's verdict (+ the strategy shape/bound contracts).
A focused follow-up batch (deliberately NOT written here: reserving the pass's remaining
budget for the PHASE-2 promotion dispositions + §2.13 + close report, which are the
required closing deliverables — property is an advisory, non-spec-floored target).

**Disposition: STAYS SOFT_WARN advisory (§2.13); SURFACED, not promoted.** 0.6453 < 0.80
recorded honestly; narrowing applied; core-gap lever + per-sim-target gap surfaced. No
snapshot/test-file padding.

## §S.5 — workflow sweeps per push

| Push SHA | Scope | Sweep result |
|---|---|---|
| `cf50b6a`→`57c297a` | render_similarity tests + audit | **RED** — `python-strict / test-render-similarity` FAILED on `mypy --strict` (CI mypy-checks the whole `render_similarity/` dir; commit hooks do not). STOP-and-fixed (not forced). |
| `a4f9c90` | render mypy hotfix (2 `# type: ignore`) | **all green** (python-strict incl. test-render-similarity ✓; integrity, equivalence, determinism, cpp-strict, ts-strict, tolerance-budget, audit-append-only, structure). |
| `e8685f9`→`ce7cda7` | variant tests + audit | **all green** (python-strict success; equivalence + 8 others success). |
| `6ea32f8`→`e488235` | common-3dgs tests (×2) + audit | **all green** (python-strict incl. test-common-3dgs ✓ at `e488235`). |
| `b3845a6` | mms narrowing (config) + audit | **all green** (mutation-testing ✓ — config narrowing safe; python-strict + integrity success). |
| `2570614` | property narrowing (config) + audit | green (config + audit; equivalence/integrity success). |
| `59a9289`→`cc8db7b` | promotion gate + ledger + §2.13 | (final sweep at close push below) |
| _(close-report push)_ | this audit close + verdict | **final §S.5 swept at the close HEAD — see Provenance.** |

**§R measured-live at close:** `integrity --all --mode strict` = **0 HARD_FAIL / 14 SOFT_WARN**
(the load-bearing invariant; the §2.13 edit added prose + a posture table, no golden table /
audit-log emitter, so no new HF/SW). Per the recorded discipline, the 0HF/14SW counts are
the invariant, not a digest literal.

## §2 — PHASE 2 promotion dispositions

Per the operator-ratified PRE-AUTHORIZED RULE: a target that clears its floor on
real oracle tests (no snapshot padding, equivalents honestly excluded) → PROMOTE to
HARD_FAIL-at-landing + wire the gate; one that does not → stays SOFT_WARN advisory,
residual + lever recorded. BORDERLINE cases (clears only via class-(iii) narrowing;
<0.02 margin; large equivalent-exclusion share) are SURFACED, not auto-flipped.

| Target | After | Disposition | Rationale |
|---|---|---|---|
| `render_similarity` | 0.9242 | **PROMOTED → HARD_FAIL-at-landing** | clears 0.85 by +0.074 on oracle tests; 16 residual all equivalent/oos (counted as survivors — not exclusion-to-floor). |
| `variant` | 0.8702 | **PROMOTED → HARD_FAIL-at-landing** | clears 0.85 by +0.0202 (≥0.02, not the <0.02 borderline band) on oracle tests; 17 residual all equivalent/oos. |
| `common_3dgs` | 0.7708 | **STAYS ADVISORY** | +159 genuine kills; below 0.80; recorded honestly, not forced (lever §1.C). |
| `code_verification_mms` | 0.438 (narrowed) | **STAYS ADVISORY + SURFACED** | clears NOTHING (0.438<0.80); class-(iii) narrowing applied; residual glue; RD-2D coverage gap surfaced (§1.D). |
| `property` | 0.6453 (narrowed) | **STAYS ADVISORY + SURFACED** | clears NOTHING (0.6453<0.80); class-(iii) narrowing applied; testkit-core lever + per-sim-target gap surfaced (§1.E). |

**§2.13 + ledger edits (CONFIRMED, wired — not aspirational):**
- `docs/architecture.md` §2.13: changelog bullet + enforcement paragraph (earned-promotions
  table) + advisory-paragraph — render_similarity + variant promoted; the rest advisory.
- `tools/testkit/mutation/phase-4.1-hardening-2026-05-31T05-09-12Z.json`: real-scores ledger
  (5 targets, before→after, posture, residual classification).
- `tools/testkit/mutation/mutmut-config.toml`: the mms + property class-(iii) narrowings
  (with written justification in-file).
- `tools/integrity/integrity/scripts/gate_helpers.py` `mutation-promoted-floor` + meta-test
  `tools/integrity/tests/test_gate_helpers_promoted_floor.py` (5 tests): enforces every
  `posture: HARD_FAIL-at-landing` ledger target meets floor; advisory targets do not gate.
  Live run on the committed ledger PASSES (render_similarity=0.9242, variant=0.8702).

**SURFACED (operator-ratifiable, NOT auto-flipped):**
1. `code_verification_mms` `reaction_diffusion_2d/solution.py` is now un-mutation-targeted
   (no dedicated target; RD-2D's MMS gate is Phase-2+) — add `reaction_diffusion_2d_mms` when it lands.
2. `property` per-sim `sims/*/invariants.py` are exercised-but-not-mutation-targeted —
   per-sim invariant mutation targets are a follow-up.
3. Finer function-level narrowing of the mms report/HDF5/CLI glue (file-level fnmatch can't
   target functions) OR an explicit "glue is non-load-bearing for the floor" ruling.
4. The advisory below-floor levers (common_3dgs model-PLY/EWA/Warp; property testkit-core
   checker oracles) — focused follow-up batches.

## §9 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected | Measured live | Disposition |
|---|---|---|---|
| C-1 | Commit hooks gate what CI gates | CI `python-strict` mypy-checks the whole `render_similarity/` dir (incl. tests); commit hooks do NOT run mypy | **§S.5 caught it** — `57c297a` RED on mypy, fixed `a4f9c90`. Going-forward: run `mypy --strict` on test files in the CI per-sim mypy scope before pushing. |
| C-2 | `property` baseline ≈ A3's 437 mutants / 0.3455 | 890 mutants / 0.170 at HEAD (pkg grew with WU-C/D/E satellite PBT dirs) | **measure-then-declare** — used the live baseline, not the stale A3 figure. |
| C-3 | mms narrowing cleanly removes all 3 cross-driven sim-solution dirs | `reaction_diffusion_2d` has NO dedicated target — excluding it orphans it | **SURFACED** — exclusion still correct (RD-2D's responsibility), the coverage gap flagged (§2 SURFACED-1). |
| C-4 | common_3dgs asymmetric-quat batch would kill ~40 | only +12 (off-diagonal mutants leave `np.empty` garbage that reads back correct ~non-deterministically) | **honest record** — `np.empty`-flaky mutants noted as borderline-equivalent / deterministic-init lever (§1.C). |
| C-5 | All 5 targets reach floor (dispatch goal framing) | only 2 of 5 clear; 3 stay advisory after genuine hardening | **not forced** — "hitting the floor is NOT the objective" (dispatch core principle); below-floor recorded honestly with levers. |

## §10 — Disposition (close)

PHASE 0 CONFIRMED (WU-A + WU-F contracts hold). PHASE 1 mutation hardening done
target-by-target with oracle-grounded tests (NO snapshot padding) — **2 of 5 targets
cleared their floors and were PROMOTED to HARD_FAIL-at-landing** (render_similarity
0.9242, variant 0.8702); **3 stayed SOFT_WARN advisory** (common_3dgs 0.7708 genuine
hardening below floor; mms 0.438-narrowed + property 0.6453-narrowed class-(iii)
narrowed), recorded honestly per "hitting the floor is NOT the objective." PHASE 2
promotions wired (§2.13 + real-scores ledger + `mutation-promoted-floor` gate +
meta-test). 4 levers/gaps SURFACED for operator ratification (§2). Every push §S.5-swept
(§S.5); integrity 0 HF / 14 SW held throughout. No HARD-RULE-2 conflict was forced. No
tag pushed (I7 — operator-only).

## Provenance

Convention #12 SHA back-fill applies to `head_sha:` (the campaign-open SHA; per-target
commit SHAs are in §S.5 + git log). Integrity invariant (0 HARD_FAIL / 14 SOFT_WARN)
measured live at close (§R) and preserved throughout. The final §S.5 sweep is run at the
close-report push HEAD (recorded by the author after push). No tag (I7).
