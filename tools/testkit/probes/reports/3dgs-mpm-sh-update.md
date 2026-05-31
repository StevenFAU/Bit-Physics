---
artifact_id: phase-4-batch-2-3dgs-mpm-sh-update-probe
sub_phase: phase-4-batch-2 (neural-rendered frontier; Sim A of 2)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: 953b081
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 0ed0f92423af69393e911ad5201f98b1230c7d69b73b6af269f512d656254559
evidence_paths:
  - docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md
  - packages/3dgs-mpm/gs_mpm/coupling.py
  - packages/3dgs-mpm/gs_mpm/scene.py
  - packages/3dgs-mpm/gs_mpm/sim.py
  - common/common-3dgs/src/common_3dgs/render.py
---

# Pre-implementation probe — 3dgs-mpm-sh-update (phase-4 batch-2, Sim A / 2)

> Live-repo Stage-0 probe per the batch-2 charter
> (`docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md` §3.1 + §4.1 + §5).
> Every cite checked at assertion (Convention #8). The three load-bearing Stage-0
> residuals the coordinator flagged (real-SH basis order; DIRECT-F vs rate-form; the
> PhysGaussian SH-rotation equation) are resolved in §1. FACT = ran/read at HEAD
> `953b081`; INFERENCE = reasoned. **This is a forward-render sim, NOT differentiable**
> — no `wp.Tape` is involved (the Warp-native-tape lesson does not bind here; the SH
> rotation is pure deterministic NumPy algebra on the coefficients).

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `953b081` (clean; batch-2 charter PROPOSED→ratified, pushed origin/main) | `git rev-parse HEAD` (FACT) |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → **ALL PASSED (exit 0)** | this session (FACT) |
| Integrity | `uv run --directory tools/integrity python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0, digest `0ed0f924…656254559` (COUNTS are the invariant; drifts as golden tables land) | this session (FACT) |
| Cross-phase replay | base `v0.3.0-phase-3` (highest landed tag, §D.4); `replay_prior_phase --prior-phase phase-3 --audit docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md` (run from **repo root** — the `--directory tools/integrity` form resolves `--audit` under `tools/integrity/` → spurious `FileNotFoundError`). **ok=False (6/8 PASS)** — see §0.1 | this session (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0 (`lfs-s3 ready`, R2 endpoint live) | this session (FACT) |
| Parent physics (MPM) | `packages/mpm-multimaterial-stack-e/` (MLS-MPM Warp kernels; consumed via `gs_mpm`) | read (FACT) |
| Landed MVP coupling (build-on) | `packages/3dgs-mpm/gs_mpm/coupling.py` (`couple_gaussians`, `apply_deformation`, `reconstruct_covariance`, `extract_scale_rotation`) | read (FACT) |
| Renderer (degree-1/2/3 real SH) | `common/common-3dgs/src/common_3dgs/render.py` (`_eval_sh`, `render`) | read (FACT) |

## 0.1 Cross-phase replay disposition — SHIFTED (ok=False = two known environmental artifacts; phase-3 INTACT)

`ok=False` with **6/8 gates PASS at the `v0.3.0-phase-3` tag** — integrity, equivalence,
determinism, perf-ledger, property, tolerance-budget all **PASS** (the load-bearing
prior-phase-intact evidence). The two FAILs are **pre-existing environmental artifacts, NOT a
phase-3 regression** (and nothing I built — the tree is clean at `953b081`):

- **`pytest` FAIL — config/plugin artifact, REPRODUCED AT HEAD (decisive).** The gate runs
  `uv run pytest -W error tools/testkit/`. Run at HEAD it aborts at COLLECTION with
  `INTERNALERROR > pytest.PytestConfigWarning: Unknown config option: timeout` (exit 3): a
  `timeout` config option is declared but the `pytest-timeout` plugin is absent in the venv, and
  `-W error` fatalizes the config-time warning. This reproduces at HEAD identically → it is an
  environment/`-W error` interaction, **not** a tag-specific code break (and not LFS-smudge —
  collection never reaches a capture-reading test). The scoped equivalence/determinism/property
  pytest gates (subdir-scoped) collect fine and PASS.
- **`mutation` FAIL — mutmut/baseline artifact.** mutmut is unprovisioned in this environment
  (batch-1-close §6 / C-D documented MEASURE-deferred-advisory across all batch-1 sims); the
  Phase-4.1 `mutation-promoted-floor` baseline post-dates the phase-3 tag.

**Disposition: NOT a BLOCK, NOT a HARD-RULE-2 conflict.** The replay's purpose (confirm phase-3
is intact to build on) is satisfied by the 6 substantive gates; the 2 FAILs are known
non-regressions. Proceed (the dispatch ratified this replay base; the batch-1 cadence anticipated
exactly this `ok`-with-environmental-caveat).

## 1. Load-bearing Stage-0 determinations (the coordinator's residuals)

### 1.1 Covariance update form — **DIRECT F-form (Σ' = F A Fᵀ), NOT the rate-form** (FACT)

`packages/3dgs-mpm/gs_mpm/coupling.py:102` (`apply_deformation`) computes `Sigma' = F A Fᵀ`
directly (Eq. 8); `couple_gaussians` (`:132`) does `A = R diag(s²) Rᵀ → F A Fᵀ → eig`. The
docstring (`:22`) states the rate-form (Eq. 10) is **unused**. So the discretized code is the
**DIRECT F-form** — the SH-update reuses this for the covariance/scale/rotation path (UNCHANGED)
and adds the SH rotation alongside it. **A3 covariance-consistency anchor is pinned to the
direct F-form** (the batch-1 "pin the anchor to the discretized code" lesson).

### 1.2 Real-SH basis order → the degree-1 Wigner-D closed form (FACT + derivation)

`common/common-3dgs/src/common_3dgs/render.py:87` evaluates the degree-1 band as
`result = result − C1·y·sh[1] + C1·z·sh[2] − C1·x·sh[3]`, i.e. the degree-1 basis values are
`(−y, +z, −x)·C1` in coefficient order `(sh[1], sh[2], sh[3])`. Define the signed permutation
`P = [[0,−1,0],[0,0,1],[−1,0,0]]` (so the degree-1 basis vector is `v(d) = P·d`). Requiring
rotation-equivariance `eval_SH(D₁(R)·c, R·d) = eval_SH(c, d)` against this exact basis yields
the closed form **`D₁(R) = P · R · Pᵀ`** (derivation: `Dᵀ P R = P` ⇒ `D = (P R⁻¹ P⁻¹)ᵀ = P R Pᵀ`
since `R` orthogonal, `P` orthogonal). This is the "degree-1 Wigner-D == rotation matrix up to a
known permutation `P`" the coordinator named (A1). The DC term (degree 0) is rotation-invariant
(unchanged); the renderer's `+0.5` colour offset is a constant and does not affect equivariance.

### 1.3 PhysGaussian SH rotation — VERIFIED (web + coordinator + landed verbatim note)

PhysGaussian (Xie et al. 2024, arXiv:2311.12198) rotates the SH coefficients by the **rotation
`R` from the polar decomposition `F = R S`** of the deformation gradient (equivalently, applies
the inverse rotation to view directions) via a **Wigner D-matrix** on the coefficients — confirmed
by web search of arXiv:2311.12198v3 ("when an ellipsoid is rotated over time, the orientations of
its spherical harmonics are rotated as well … by applying inverse rotation on view directions; the
local rotation is readily obtained in the deformation gradient … expansion coefficients are
transformed by … a Wigner D-matrix"), the coordinator's primary-source verification, and the landed
`packages/3dgs-mpm/gs_mpm/coupling.py:21` note ("Eq. (9) SH rotation … re-verified verbatim against
arXiv:2311.12198v3"). **The equivariance identity (A2) IS PhysGaussian's "inverse rotation on view
directions"** — `D(R)·c` on coefficients ≡ `R⁻¹·d` on directions. Citation pinned: PhysGaussian
Eq. (9) (cite-only; reimplemented independently per spec §2.4, as the MVP did).

### 1.4 The canonical scene is degree-0 (DC-only) → a degree-1 scene is REQUIRED (FACT)

`packages/3dgs-mpm/gs_mpm/scene.py:47` builds **degree-0 SH (K=1)** ("Degree-0 SH (K=1): colour
each Gaussian by its normalized position…"). Degree-0 is rotation-invariant ⇒ SH-rotation is a
**no-op** on the landed scene. So the SH-update sim **authors a NEW ≥degree-1 directional-SH scene**
(the charter §1.2 FLAG / the "heavier anchor surface"): same blob positions as the MVP (so the MPM
physics is bit-comparable to the parent) but degree-1 SH (K=4) whose directional term makes the
rotation **observable** in the render (Prong-2 non-vacuous).

## 2. Design (Stage-1a/1b plan; NO code built at Stage 0)

- **Package:** `packages/3dgs-mpm-sh-update/` (§0.3 flat; SIBLING — does NOT mutate the frozen
  `packages/3dgs-mpm/`). Import name `gs_mpm_sh_update` (leading-digit dir → PEP-8 module rename,
  the `gs_mpm` precedent). Deps: `bit-physics-common-3dgs`, `bit-physics-common-warp`, `3dgs-mpm`
  (the MVP coupling, by import), `mpm-multimaterial-stack-e` (MPM kernels), warp.
- **SH rotation (NumPy, deterministic):** `polar_rotation(F (N,3,3)) -> R (N,3,3)` via SVD
  `F = U Σ Vᵀ`, `R = U Vᵀ`, det-corrected to a proper rotation; `rotate_sh_degree1(sh (N,K,3),
  R) -> sh'` applying `D₁(R) = P R Pᵀ` to band-1 (DC unchanged). **Scope: degree ≤ 1** (the
  canonical scene is degree-1; band-1 dipole rotation is the rigorous, closed-form-anchored
  frontier delta). Coefficients with degree ≥ 2 raise a clear `NotImplementedError` (documented
  scope; higher-band Wigner-D is a further extension — not asserted unverified).
- **Driver:** reuse the MVP loop shape (`gs_mpm.sim.run_coupled_sim`) by re-implementing the thin
  per-frame step in `gs_mpm_sh_update` — same MPM kernels + `gs_mpm.couple_gaussians` (covariance
  path UNCHANGED) + the NEW `rotate_sh_degree1(scene.sh, polar_rotation(fgrad))` before building
  the `GaussianSplatModel`. Physics-equivalence-vs-parent then holds **by construction** (identical
  kernels/constants/positions → the MPM trajectory + covariance are bit-equal to `gs_mpm`).
- **D-COUPLING-REUSE:** SH rotation lands **sim-local** (only consumer today; Rule-of-Three not
  met → promote to `common-3dgs` only when a 2nd/3rd SH-rotating consumer appears). NO mutation of
  common-3dgs.

## 3. Verification-anchor plan (≥3 independent; pinned to the discretized code)

**Prong-1 — SH-rotation numerical golden `c' = D₁(R)·c`:**
- **A1 (closed-form, independent):** for a specific `R` (e.g. `R_z(90°)`), `rotate_sh_degree1`
  output equals `P R Pᵀ · c` computed by hand. Source: §1.2 closed-form derivation (independent of
  the renderer).
- **A2 (rotation-equivariance vs the LANDED renderer — PRIMARY, implementation-independent):**
  `eval_SH(rotate_sh_degree1(c, R), R·d) == eval_SH(c, d)` for random `(c, R, d)`, using
  `common/common-3dgs/src/common_3dgs/render.py:83` `_eval_sh`. Source: the defining SO(3)
  equivariance = PhysGaussian's inverse-rotation-on-view-directions (§1.3). Distinct code path
  from A1 (the renderer, not the `P R Pᵀ` algebra).
- **A3 (pure-stretch / identity frozen — degenerate, independent):** `polar_rotation` of a pure
  stretch `F = S` (SPD) gives `R = I` ⇒ `rotate_sh` is the identity ⇒ `c' == c` (recovers the MVP
  "SH frozen" as the `R=I` case); `polar_rotation` of a pure rotation `F = R` returns `R` exactly.
  Source: hand-derivation + MVP consistency (`gs_mpm.coupling`).

**Prong-2 — perceptual render-similarity golden:** render the SH-update coupled sim on the
degree-1 scene vs committed golden PNGs; floors PSNR≥28 / SSIM≥0.85 / LPIPS≤0.15
(`tools/testkit/equivalence/tolerance.toml:315` family). Deterministic own-pipeline regression
(MEASURE rasterization order-exactness, §5).

## 4. D-class resolutions

| D-class | Resolution |
|---|---|
| D-PLACEMENT | **SIBLING** `packages/3dgs-mpm-sh-update/`; docs `docs/sim-specs/neural-rendered/3dgs-mpm/spec-sh-update.md` (NEW file — only `spec-ref.md` exists there; the ledger 4.11 slot reconciled at Stage 2). Operator-ratified. |
| D-SCENE | NEW degree-1 directional-SH scene REQUIRED (§1.4). |
| D-WIGNER-FORM | `D₁(R) = P R Pᵀ`, `P=[[0,−1,0],[0,0,1],[−1,0,0]]` (§1.2); degree ≤ 1 scope. |
| D-COUPLING-REUSE | sim-local SH rotation; reuse `gs_mpm.couple_gaussians` for covariance (§2). |
| D-DET | MEASURE at 1b (`run_twice_and_diff` on the full pipeline); expect bit-exact same-hw (SVD+P R Pᵀ deterministic; MVP + render already bit-exact). Registry row `[neural-rendered.3dgs-mpm-sh-update]` (read schema first, §S.2). |
| D-CI | `python-strict.yml` `test-3dgs-mpm-sh-update` job with a selective LFS pull of the committed scene/render/capture (mirror `test-3dgs-mpm`). |
| D-TAG | NO (phase-close-only, I7). |
| gate-14 | N/A (single-stack); WU-F neural-axis floor + physics-equivalence-vs-parent apply. |

## 5. PBT / determinism / capture / mutation / tolerance

- **PBT (≥2):** `sh_rotation_equivariant` (the A2 oracle as a Hypothesis property over random
  `R∈SO(3)`, degree ≤ 1) + `covariance_spd_preserved` (`Σ'=FΣFᵀ` SPD, scales > 0 under random
  det>0 `F` — the MVP coupling re-scoped). Re-declared on falsification, never widened.
- **Determinism:** rasterization atomic-ordering (`composite_splats` `wp.atomic_add`) is the
  sensitive surface — MEASURE; the landed `[neural-rendered.common-3dgs]` row declares bit-exact
  serial-CPU. No EFECT.
- **Capture:** coupled-sim `.h5` (MPM state + gaussian-transform history incl. rotated SH), via
  `common_warp.Capture` + `write_capture` (the MVP shape).
- **Mutation:** register `[targets.gs_mpm_sh_update]` (the SH-rotation source); advisory unless it
  clears its floor on oracle tests (A1/A2/A3 + equivariance); snapshots forbidden. `render_similarity`
  (0.9242) + `variant` (0.8702) HARD gates untouched (consumer only) → re-confirmed at landing.
- **Tolerance schema (§S.2):** add a single-stack key (e.g. `sh_rotation_abs`) under the existing
  `[golden_tolerance.neural-rendered.3dgs-mpm]`-family branch (additive, the lenia/ising precedent)
  OR a new `[golden_tolerance.neural-rendered.3dgs-mpm-sh-update]` — read `tolerance-schema.json`
  first; STOP-SCHEMA-FIT on misfit.

## 6. Disposition

**NO BLOCK.** All Stage-0 residuals resolved: DIRECT-F form (§1.1), degree-1 Wigner-D `P R Pᵀ`
(§1.2), PhysGaussian SH-rotation verified (§1.3), degree-1 scene required (§1.4). Anchors named to
source, ≥3 independent, pinned to the discretized code. Proceed to Stage 1a (scaffold + RED).
