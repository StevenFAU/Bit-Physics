---
sub_phase: sub-phase-phase-3-3dgs-mpm
task: task-8
sim_identity: 3dgs-mpm
package_leaf: packages/3dgs-mpm
category: neural-rendered (NEW category)
stack: E (Warp)
stage: plan-drafting (charter + probe are the deliverable; execution Stage 0→2 is a separate dispatch)
verdict: CONFIRMED-SHIFTED (plan-drafting) — preconditions DISCHARGED, CPU-render FEASIBLE; D-classes routed with leans; A-7 staged
date: 2026-05-29
head_sha: 3a2a7aeda23b1952cb9232a95b28f1a78d35571f
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
revisions:
  - v2 (2026-05-29) — EXECUTION Stage 0 (HEAD 28b005c). Operator RATIFIED all 8
    §11 items (D-PRECONDITIONS/CPU-RENDER discharge, D-RENDER-DET + the
    deterministic-golden-render boundary = STOP-RENDER-FLOOR, D-ANCHOR-COUPLING
    corrected eq numbers + Anchor-2 caveat, D-VENDOR-ROLE/SHA cite-only,
    D-SCOPE-MVP/STRETCH boundary, D-CI measure-then-split, D-SCENE small-synthetic,
    A-7). ALL §6 D-classes now RESOLVED (see the per-class "RESOLVED (operator-ratified
    v2)" markers + §11). Stage-0 live re-verifications (Convention #8): PhysGaussian
    license=null / no LICENSE / SHA 8339ed6a… (matches §2.18); coupling Eq.(8) covariance+
    center / Eq.(9) SH-rotation / Eq.(10) rate-form re-fetched verbatim from
    arXiv:2311.12198v3; MPM kernel sequence + F(N,3,3)f64 re-read; integrity 0HF/14SW
    (digest 5c7172a2… live); replay phase-2 ok=True. Inria-probe CLEAN (common-3dgs
    runtime carries NO vendored Inria source — citation comments only; references/3DGS-
    reference/ is a properly-licensed non-commercial oracle whose clause 3dgs-mpm inherits).
    A-7 filed in docs/spec-amendments-proposed.md; references/PhysGaussian/MANIFEST.toml
    cite-only pointer authored (source_vendored=false). NO BLOCK; execution proceeds.
  - v1 (2026-05-29) — initial plan-drafting charter; Phase-3 FINALE. Preconditions probed
    PRESENT (common-3dgs + render_similarity + Phase-2 MPM); CPU-render probed FEASIBLE
    (common-3dgs render() runs Warp-CPU, CI green on ubuntu-latest, no CUDA). common-3dgs
    rasterizer DECLARED bit-exact/same-hw → the golden-render gate is a TIGHT
    deterministic own-pipeline regression that MUST clear the §2.12 floors (below-floor =
    STOP-to-investigate, NOT a stochastic quality-flag close). PhysGaussian web-verified
    NO-LICENSE (license=null, no LICENSE file) SHA 8339ed6a… (matches §2.18) → cite-only,
    NO source vendoring. Coupling anchors SHIFTed Eq.(8)-(10) → Eq.(7)-(8) MVP + Eq.(9)
    stretch. A-7 staged (spec line 2551 PhysGaussian License "MIT" is WRONG). D-classes
    routed with leans; operator ratifies §6 before execution Stage 0.
---

# Sub-phase charter — task-8 3DGS-MPM coupling (Phase 3, sub-phase 3.5) — the Phase-3 FINALE

> **Authority precedence:** spec (`docs/architecture.md` v2.4) → plan §6.8
> (`docs/phases/phase-3-plan.md`) → conventions (`docs/conventions/sub-phase-conventions.md`)
> → sibling charters. Spec FROZEN in Phase 3 (§9.6): spec corrections route to
> `docs/spec-amendments-proposed.md` (A-7+); plan corrections are documented as SHIFTs (§0.3,
> agent does NOT edit the plan). Every cite checked at assertion (Convention #8).
>
> **PLAN-DRAFTING ONLY.** This charter + its probe (`tools/testkit/probes/reports/3dgs-mpm.md`)
> are the deliverable. Execution (Stage 0→2) is a separate dispatch after the operator
> ratifies the operator-pending D-classes in §6. task-8 is **TERMINAL on produce** (plan
> §3.1 `:330`; task-9 is the soft/informational common-warp consumer).

## 1. Scope and posture

task-8 is the **first neural-rendered-CATEGORY** sim and **Phase 3's hardest sub-phase**,
placed last (plan `:766`) so the surrounding infrastructure (common-3dgs task-1,
render-similarity task-2, Stack-E common-warp tasks 4/7, the two-tier CI pattern L-PINN-2)
is validated before the frontier work. It implements **PhysGaussian-style MPM→3DGS
coupling on Stack E (Warp)**: the Phase-2 MPM solver
(`packages/mpm-multimaterial-stack-e/`) is **CONSUMED** (stepped); the **NOVEL** work is the
sim-local `coupling.py` (per-frame: MPM step → per-Gaussian deformation-gradient `F` →
update Gaussian scale/rotation [+SH if the stretch lands] → render via common-3dgs).

**Verification is TWO-PRONGED** (spec §5.11 `:1202`, §3.5):
1. a **tight NUMERICAL coupling-correctness golden** (`F` → Gaussian-param transform; ≥3
   independent anchors; bit-exact-or-epsilon tolerance), AND
2. a **PERCEPTUAL render-similarity golden** (rendered frames vs the project's OWN committed
   golden renders at canonical frames, via task-2's harness).

The underlying MPM's own verification (gates 5/6/11 + its golden) **still runs** — the 3DGS
coupling is verified *additionally* (spec §5.11 `:1227`).

> **THE DETERMINISTIC-GOLDEN-RENDER BOUNDARY (load-bearing; do not lose).** The
> render-similarity gate here compares the sim's render against the project's **own committed
> golden renders** at canonical frames — a **DETERMINISTIC own-pipeline regression**, NOT a
> cross-stack/stochastic comparison. 3dgs-mpm is **single-stack** (Stack E only) with **no
> stochastic mask**, so it **CANNOT** invoke task-6's stochastic-RNG-divergence argument
> (the whole below-floor story for NCA). The golden-render gate **MUST clear** the §2.12
> floors (PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15) on its own. A below-floor result is a
> **STOP-to-INVESTIGATE** (rasterization non-determinism or a coupling bug), **NOT** a
> quality-flag close. The plan §6.8 deliverable-E "IF below §2.12 floors: quality concern
> flag" clause (`:2092`) does **NOT** license a stochastic-style close here — it is a SHIFT
> (§1.3). This boundary is grounded in common-3dgs's **bit-exact** rasterizer declaration
> (§6 D-RENDER-DET) and the task-6 gate-14 diagnosis (`5cddb6c`).

### 1.1 Friction table — two hard deps + two-pronged verification + frontier risk

CONTEXT-BRIDGE (read `docs/_audits/phase-3/progress.md` tasks 1–7; ESPECIAL attention to
task-1 common-3dgs and task-2 render-similarity — the hard deps — and tasks 4/7 for Stack-E
common-warp consumption patterns).

| Friction / relief | Disposition | Where handled |
|---|---|---|
| **TWO hard deps** must be present + usable: common-3dgs (CPU-render) + render-similarity | **DISCHARGED at probe:** both present; common-3dgs renders Warp-CPU (CI green ubuntu-latest); render_similarity direct-importable. NO BLOCK | §5, §6 D-PRECONDITIONS/CPU-RENDER |
| **Two-pronged verification** (numerical coupling golden + perceptual render golden) — both are **gate-4 Cat-3 goldens** | numerical = bit-exact-or-epsilon `golden_tolerance`; perceptual = render-similarity vs OWN committed renders, MUST clear §2.12 floors | §6 D-ANCHOR-COUPLING, D-TOL, §7 gate-4 |
| **Single-stack → NO gate-14, NO cross-stack budget.** Render-similarity is the **gate-4 Cat-3 golden**, NOT a cross-stack gate-14 | the deterministic-golden-render boundary (above): below-floor = STOP-to-investigate, NOT NCA's statistical quality-flag | §1.3, §6 D-RENDER-DET, §7 |
| **CPU-only env** (no CUDA — task-7 finding) | common-3dgs renders Warp-CPU unconditionally (`wp.launch(device="cpu")`); MPM is Warp-CPU serial; coupling is numpy/Warp-CPU. The §6.8 "GPU memory peak" perf note (`:2072`) is moot → record **CPU memory** | §6 D-CPU-RENDER, §6 D-CI, §8 perf-ledger |
| **common-3dgs API names in plan are STALE** (`GaussianSet`/`forward_splat`) | real landed API = `GaussianSplatModel` / `render` (§1.3 SHIFT; §6 D-API) | §1.3, §6 D-API |
| **MPM has no monolithic `step()`** — modular kernels (P2G→grid→G2P→def-grad→advect) | coupling sequences them (or wraps a sim-local `step()`); per-particle `F` is `(N,3,3) f64` | §6 D-MPM-DET, §3 deliverable D |
| **PhysGaussian NO LICENSE** (web-verified: `license=null`, no LICENSE file) | cite-only; do **NOT** vendor source; `references/PhysGaussian/manifest.yaml` is a cite-only pointer; A-7 (spec line 2551 says "MIT" — wrong) | §6 D-VENDOR-ROLE/SHA, §1.3 |
| **Coupling anchor eq numbers stale** (plan: "Eq. (8)-(10)") | web-verified SHIFT: MVP covariance/center = **Eq. (7)-(8)**; stretch SH-rotation (polar decomp `F=RS`) = **Eq. (9)**; Eq. (10) = alternative incremental rate-form (not the F-direct MVP) | §1.3, §6 D-ANCHOR-COUPLING |
| **MVP / stretch boundary + defer** (SH-update) | MVP ships (centers + scale/rot from F; SH FROZEN); stretch = per-frame SH rotation; defer >~3 days → Phase 4 `3dgs-mpm-sh-update` | §6 D-SCOPE-MVP/STRETCH, §4 |
| **HEAVIEST LFS footprint of Phase 3** (golden render PNGs + capture .h5 with MPM+Gaussian state + canonical scene) | §Q Stage-0 bootstrap FIRST after anchor probe; keep canonical scene **small/synthetic** (few-hundred Gaussians) | §6 D-SCENE, §8 §Q |
| Inherited Warp-sim friction: **F-RB-1** (`failing-tests-evidence/` excluded from trailing-whitespace hook) + **F-RB-3** (`# mypy: ignore-errors` scoped to Warp-touching files) + **L-PINN-1** (gate-13 replay needs the EXACT `replay_failing_tests` cmd) | apply at Stage 1a/1b/1c; cf. task-4 + task-7 landings | §8 |

### 1.2 Inheritance and re-frames

- **Trunk-based to `main`; no PR; no tag (D-TAG NO).** The plan §6.8 "BASE BRANCH / YOUR
  BRANCH / MERGE PROTOCOL §4.3" lines (`:2003-2004`, `:2116`) are SUPERSEDED (plan v8/v9;
  tasks 4–7). Commit directly to `main`.
- **`coupling.py` is SIM-LOCAL** (plan `:2041-2042`, `:330`): NOT promoted to common-3dgs
  (rule-of-three not met). Phase-4 WU-C promotes it. Document the promotion candidacy in the
  landing report; do NOT touch common-3dgs's public surface.
- **task-8 is TERMINAL on produce** (plan §3.1 `:330`). task-9 (common-warp maturation) is a
  soft/informational consumer downstream.

### 1.3 §0.3 SHIFTs (follow-discovered; the §6.8 deliverable anchors carry stale prose)

The plan §6.8 prose was written before tasks 1/2/4/7 landed and before the live PhysGaussian
fetch. The following are **SHIFTs** (documented here; the agent does NOT edit the plan per
§0.3). Each is corroborated in §6 with a live-probe citation.

1. **API names** — plan `:2032-2033`, `:2089` say `GaussianSet`, `forward_splat`. Real
   landed surface (`common/common-3dgs/src/common_3dgs/__init__.py:13-26`):
   **`GaussianSplatModel`** (class), **`render(model, camera, *, image_height, image_width,
   background)`** (function), `Camera` + `Camera.look_at(...)`, `GaussianSplatModel.load_ply`,
   `save_ply`, `save_png`. → §6 D-API.
2. **render-similarity import path** — plan `:2021`, `:2034`, `:2085`, `:2103` say
   `tools/testkit/equivalence/render_similarity.py`. Real surface is a **package** at
   `tools/testkit/render_similarity/` with direct import
   `from render_similarity import psnr, ssim, lpips` (`tools/testkit/render_similarity/__init__.py:20`;
   NCA consumed it this way at
   `packages/neural-ca/python/tests/test_cross_stack_equivalence.py:25`). → §6 D-API.
3. **MPM consumption path** — plan `:2036`, `:2060` say
   `hybrid-pg/mpm-multimaterial/python-warp/`. Real landed package is
   **`packages/mpm-multimaterial-stack-e/`** (`mpm_multimaterial_stack_e/sim.py`,
   `reference/mls_mpm_warp.py`). → §6 D-MPM-DET.
4. **Package layout** — plan `:2040-2041` say `neural-rendered/3dgs-mpm/python/`. Real
   Phase-3 convention (§0.3; all sims tasks 3–7) = **`packages/3dgs-mpm/`** (flat; no
   `python/` subdir). sim-spec stays at `docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md`
   (category-prefixed). → §6 D-LAYOUT.
5. **CI workflow** — plan §6.8-I `:2102` says `.github/workflows/build-py.yml`. It does **not
   exist**; the Python CI is `.github/workflows/python-strict.yml` (`test-3dgs-mpm` job). →
   §6 D-CI.
6. **Coupling-anchor equation numbers** — plan `:2071` says "PhysGaussian Eq. (8)-(10)".
   Web-verified (CVPR'24 paper, p.4392-4393): MVP covariance/center transform = **Eq. (7)**
   (`G_p(x,t) = exp(−½(x−x_p)ᵀ(F_p A_p F_pᵀ)⁻¹(x−x_p))`, i.e. `Σ' = F A Fᵀ`) **+ Eq. (8)**
   (`x_p(t)=φ(X_p,t)`, `a_p(t)=F_p A_p F_pᵀ` — center + covariance together); the SH-rotation
   stretch = **Eq. (9)** (polar decomposition `F_p = R_p S_p`, `f¹(d)=f⁰(Rᵀd)`); **Eq. (10)**
   is the *alternative incremental rate-form* covariance update (`aⁿ⁺¹=aⁿ+Δt(∇v·a+a·∇vᵀ)`) —
   NOT the F-direct MVP transform. → §6 D-ANCHOR-COUPLING.
7. **PhysGaussian vendoring** — plan §6.8-F `:2093` ("vendored at pinned SHA") +
   `:2043`/`:2063`. Web-verified NO LICENSE → **cite-only, NO source vendoring** (matches
   §2.18 `:276-280`). `references/PhysGaussian/manifest.yaml` = cite-only pointer (citation +
   SHA + license-note); executor MAY clone transiently as a derivation oracle (NOT committed).
   → §6 D-VENDOR-ROLE/SHA.
8. **Below-floor render-similarity semantics** — plan §6.8-E `:2092` ("quality concern
   flag"). SHIFT to **STOP-to-investigate** (single-stack deterministic own-pipeline; §1.3
   boundary). → §1, §6 D-RENDER-DET.

## 2. Stage cadence

Mirrors the pinn/NCA/rigid-body arc; **Stage 1b splits into three sub-stages** because the
deliverable has three independently-testable layers (coupling math, render wiring, the two
golden prongs).

- **Stage 0 — anchor + preconditions + LFS bootstrap + vendor-posture + corrigenda.**
  Anchor probe (base sha). **§Q FIRST ACTION after anchor probe:** `source
  tools/lfs/setup-lfs-s3-local.sh` (non-zero → STOP-LFS-PUSH surfaced). Discharge
  preconditions (§5). Probe report at `tools/testkit/probes/reports/3dgs-mpm.md` (verbatim
  live API of common-3dgs / render_similarity / MPM / common-warp). Resolve PhysGaussian
  posture (cite-only; `references/PhysGaussian/manifest.yaml`; transient-clone oracle).
  Stage A-7 corrigendum (spec line 2551 License). Draft `spec-ref.md` skeleton (§3, §4
  algebraic form with corrected eq numbers, §9 bounds placeholder).
- **Stage 1a — scaffold + RED.** Scaffold `packages/3dgs-mpm/` (flat). Failing TDD: (a)
  coupling-correctness tests (Eq.(7)-(8) `Σ'=F A Fᵀ`; polar-decomp single-Gaussian; `F=I`
  identity), (b) render-similarity tests vs golden renders (RED — goldens not yet generated).
  Capture failing output → `tools/testkit/failing-tests-evidence/3dgs-mpm-<UTC>.txt`; sha256
  in commit footer (gate-3). Apply F-RB-1 / F-RB-3.
- **Stage 1b-1 — coupling layer.** Implement `coupling.py`: reconstruct per-Gaussian
  covariance `A = R·diag(s²)·Rᵀ` from stored (scale, rotation-quaternion); apply
  `Σ' = F·A·Fᵀ`; re-extract (scale', rotation') from `Σ'` (symmetric eigendecomposition →
  quaternion). MVP: SH FROZEN. → numerical coupling-correctness golden GREEN (≥3 anchors).
- **Stage 1b-2 — render wiring + capture.** Pipeline: step MPM (sequence the
  `packages/mpm-multimaterial-stack-e` kernels) → per-Gaussian `F` → `coupling.py` → `render`
  via common-3dgs → frames. Write capture (`common_warp.write_capture`, schema 1.0.0) with
  **BOTH** MPM particle state AND Gaussian-set state (document schema fields in spec-ref §7).
  MEASURE end-to-end determinism → `tools/testkit/determinism/registry.toml`
  `[neural-rendered.3dgs-mpm]` row.
- **Stage 1b-3 — golden renders + render-similarity prong.** Generate
  `tools/testkit/golden/renders/3dgs-mpm-canonical-frame-{N}.png`. MEASURE PSNR/SSIM/LPIPS of
  the sim's render vs these committed goldens → **LOCK** `[render_similarity.neural-rendered.3dgs-mpm]`
  bounds in spec-ref §9. **MUST clear §2.12 floors** (else STOP-to-investigate per §1.3).
- **Stage 1c — gates 4–13 + perf + CI decision + landing audit.** Gates 4–13 GREEN (see §7;
  verify the gate-12 perf-row exists — S2-RD2C1 lesson). Perf-ledger row (CPU wall-clock +
  **CPU memory**). CI two-tier DECISION on measured cost (§6 D-CI). gate-13 replay via the
  EXACT `replay_failing_tests` cmd (L-PINN-1). Stage-1c landing audit.
- **Stage 2 — sub-phase landing.** Reconcile deliverables; `closed-with-shifted-N` grade
  (§2.15); propose Appendix D.2.3 capture descriptor + the PhysGaussian Appendix D.3
  vendor-row posture (cite-only); progress.md entry (SH-update deferral status); **NO tag**
  (D-TAG NO). Convention #12 SHA back-fill if any audit cites its own commit.

## 3. Deliverables (Layer 4 per §5.4; §6.8 A–N + v9 addendum, with §1.3 SHIFTs)

| # | Deliverable | Path (SHIFTed where noted) |
|---|---|---|
| A | sim-spec | `docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md` (§3 algorithm; §4 algebraic form w/ corrected PhysGaussian eq numbers; §7 capture schema incl. Gaussian-set state; §9 render-similarity bounds locked from measurement; MVP/stretch scope per §2.13) |
| B | probe report | `tools/testkit/probes/reports/3dgs-mpm.md` |
| C | failing TDD | `packages/3dgs-mpm/tests/` — coupling-correctness + render-similarity-vs-golden (both RED) |
| D | sim + coupling | `packages/3dgs-mpm/` (Warp + common-3dgs + common-warp); `packages/3dgs-mpm/.../coupling.py` SIM-LOCAL; CLI per §3.2.6 |
| E | golden renders | `tools/testkit/golden/renders/3dgs-mpm-canonical-frame-{N}.png` (bounds in spec-ref §9; below-floor = STOP, §1.3) |
| F | PhysGaussian ref | `references/PhysGaussian/manifest.yaml` — **cite-only** (citation + SHA `8339ed6a…` + NO-LICENSE note); NO source tree (§1.3-7) |
| G | Tier 3 diagnostic | `tools/diagnostics/tier3/3dgs-mpm/` per §3.2.9 |
| H | Cat 1/2/3 gates | green |
| I | shared-file updates | `README.md`, `CHANGELOG.md`, `docs/glossary.md` (PhysGaussian, deformation gradient, SH update — merge w/ task-6 SH entry), `justfile`, **`.github/workflows/python-strict.yml`** (`test-3dgs-mpm`; SHIFT from build-py.yml), `tools/testkit/equivalence/tolerance.toml` (TWO rows — §6 D-TOL), `tools/testkit/determinism/registry.toml` (`[neural-rendered.3dgs-mpm]`) |
| J | progress.md | `docs/_audits/phase-3/progress.md` entry (SH-update deferral status) |
| K | report | `docs/_audits/phase-3/task-8-3dgs-mpm.md` per §5.1 (§10 lists SH-update deferral) |
| L | PBT | `tools/testkit/property/sims/3dgs-mpm/` — ≥2: `gaussian_count_invariant` + `def_grad_determinant_positive` (plan `:2070`) |
| M | numerical coupling golden | `tools/testkit/golden/tables/3dgs-mpm-coupling.json` (≥3 anchors per §6 D-ANCHOR-COUPLING) |
| N | corrigendum A-7 | appended to `docs/spec-amendments-proposed.md` (spec line 2551 License "MIT" → NONE/cite-only) |

## 4. Out of scope (Phase 4+)

3DGS-SPH, 3DGS-smoke; i-PhysGaussian, GASP, PhysSplat, PIDG, MILo; training new 3DGS scenes;
differentiable splatting; promotion of `coupling.py` to common-3dgs (Phase-4 WU-C);
common-3dgs mutation-baseline extension (Phase-4 WU-C); USD export (§6 D-USD); gate-14
(no cross-stack pair). **Stretch SH-update** ships only if straightforward (§6
D-SCOPE-MVP/STRETCH); otherwise deferred to Phase 4 `3dgs-mpm-sh-update`.

## 5. Pre-flight checks (Stage 0 discharges)

| Check | Status at probe (HEAD `3a2a7ae`) |
|---|---|
| `uv run python tools/dispatch/preflight-phase.py 3` | **exit 0** (8/8 PASS incl. integrity-all-green) |
| common-3dgs present | ✓ `common/common-3dgs/` + `docs/common/3dgs.md` |
| render-similarity present | ✓ `tools/testkit/render_similarity/metrics.py` (package; direct import) |
| Phase-2 MPM present | ✓ `packages/mpm-multimaterial-stack-e/` |
| common-3dgs renders CPU-only | ✓ `render()` calls `wp.launch(..., device="cpu")` unconditionally; `test-common-3dgs` green on `ubuntu-latest` |
| integrity invariant | **0 HARD_FAIL / 14 SOFT_WARN** (digest `5c7172a2…` measured live per §R) |

**No BLOCK.** Both hard deps present; CPU-render feasible. (Re-verify live at execution
Stage 0; the digest is point-in-time per §R — record `integrity_digest_at_head` freshly, do
NOT copy.)

## 6. D-class decision routing

Leaned per §0.3 + precedent; STOP/BLOCK only on real conflict. Load-bearing:
**D-PRECONDITIONS/CPU-RENDER**, **D-RENDER-DET** (+ golden-floor boundary),
**D-ANCHOR-COUPLING**.

### D-PRECONDITIONS / CPU-RENDER ⚠ (BLOCK gate) — **RESOLVED (operator-ratified v2): proceed (DISCHARGED; re-confirmed live Stage 0)**
Both deps present; common-3dgs renders Warp-CPU (CI green ubuntu-latest; `render()` →
`wp.launch(device="cpu")`; CI scale 36 Gaussians @ 32²–128²; no CUDA imports/conditionals).
The MPM is Warp-CPU serial; coupling is numpy/Warp-CPU. → **no feasibility BLOCK.** Re-verify
live at Stage 0.

### D-RENDER-DET ⚠ — **RESOLVED (operator-ratified v2): bit-exact → tight regression; below-floor = STOP-RENDER-FLOOR-to-investigate**
common-3dgs's rasterizer is declared **`bit-exact / same-stack-same-hw`**
(`tools/testkit/determinism/registry.toml:49-60` `[neural-rendered.common-3dgs]`;
`docs/common/3dgs.md:69-82`): "render() run twice on identical inputs is byte-identical
(max_abs_diff = 0.0, identical sha256) … per-pixel front-to-back over a depth-sorted splat
list (no atomic scatter, no subgroup ops) → bit-identical run-to-run on the Warp CPU backend
(serial wp.launch)." **No atomic alpha-compositing**, so NO epsilon from compositing order.
⇒ The golden-render gate is a **tight deterministic regression**: sim render vs its own
committed golden should be byte-identical (PSNR → ∞, far above the §2.12 floors). **Below the
floors = STOP-to-investigate** (a coupling bug or a real rasterization non-determinism), NOT
NCA's statistical quality-flag close (§1.3 boundary; task-6 gate-14 diagnosis `5cddb6c`
established that the stochastic argument required a stochastic mask — absent here). The
render-similarity bounds are LOCKED from Stage-1b-3 measurement into spec-ref §9.

### D-ANCHOR-COUPLING ⚠ — **RESOLVED (operator-ratified v2): 3 anchors w/ corrected eq numbers (Eq.(8) re-verified live Stage 0) + Anchor-2 caveat**
Numerical coupling-correctness golden, ≥3 independent anchors (§2.4):
- **Anchor 1 — PhysGaussian Eq. (7)-(8)** (web-verified; SHIFT from plan's "(8)-(10)"):
  `Σ' = F·A·Fᵀ` (covariance transform) + `x_p(t) = φ(X_p,t)` (center). The MVP coupling core.
  Cite paper §3.4 / Eq. (7)-(8); cross-check against the PhysGaussian repo (transient clone,
  cite repo lines not paper prose per Convention #8).
- **Anchor 2 — hand-derived polar decomposition `F = R·S`** applied to a single Gaussian
  (rotation `R` composes with the stored quaternion; stretch `S` scales). **§2.4 caveat
  (load-bearing, document explicitly): Anchor 2 is independent of PhysGaussian's
  *implementation* but cites the same *theory*** (PhysGaussian Eq. (9) uses the same polar
  decomposition). It is NOT a fully-independent reference — flag this in spec-ref §4 + the
  golden-table provenance.
- **Anchor 3 — trivial case `F = I`**: Gaussian params unchanged (`Σ' = Σ`, scale/rotation
  identical). A clean **fully-independent** check.
Lands at `tools/testkit/golden/tables/3dgs-mpm-coupling.json`. NO plan edit (§0.3).

> **Coupling mechanics note (for spec-ref §4):** common-3dgs stores per-Gaussian
> `scales (N,3)` + `rotations (N,4)` quaternion (wxyz), NOT a raw covariance `A`. So
> `coupling.py` must (1) reconstruct `A = R·diag(s²)·Rᵀ`, (2) apply `Σ' = F·A·Fᵀ`, (3)
> re-extract (scale', rotation') from `Σ'` by symmetric eigendecomposition → quaternion. The
> numerical golden tests this round-trip. SH coefficients FROZEN in MVP.

### D-MPM-DET — **RESOLVED (operator-ratified v2): end-to-end bit-exact-same-hw (MEASURE at 1b-2); compose each stage**
The Phase-2 Stack-E MPM declares `bit-exact-same-hw` at `device="cpu"` (serial `wp.launch`;
`atomic_ops=True` but serialized → bit-exact; `packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py:213-217` +
`:1-42`). Particle state: `pos/vel (N,3) f64`, **`F (N,3,3) f64`**, `affine_c (N,3,3) f64`,
`mass (N,) f64`, `material_id (N,) i32`, `stress (N,3,3) f64`, `volume_p (N,) f64`. **No
monolithic `step()`** — sequence the kernels `compute_particle_stresses → p2g_with_stress →
grid_update → g2p → deformation_update → advect_particles` (`reference/mls_mpm_warp.py`); the
per-particle `F` is read after `deformation_update`. The end-to-end registry row
`[neural-rendered.3dgs-mpm]` (stack=E, class=bit-exact, scope=same-stack-same-hw) **composes**
MPM (bit-exact) → coupling (deterministic numpy/Warp) → render (bit-exact). MEASURE at
Stage 1b-2; the capture carries BOTH MPM particle state AND Gaussian-set state (document in
spec-ref §7).

### D-SCOPE-MVP/STRETCH — **RESOLVED (operator-ratified v2): ship MVP; defer SH-update if >~3 days (execution decides)**
- **MVP (must-ship):** MPM drives Gaussian centers (translation) + def-grad `F` → Gaussian
  scale/rotation (Eq. (7)-(8)); **SH coefficients FROZEN** at scene-load values.
- **Stretch (ship if straightforward):** per-frame SH rotation under deformation (Eq. (9),
  `f¹(d)=f⁰(Rᵀd)` with `R` from polar decomp).
- **Defer criterion:** if stretch > ~3 days OR hits test-stability issues → **DEFER** to
  Phase 4 as `3dgs-mpm-sh-update`, ship MVP only, surface in report §10 + progress.md.
  Execution decides; the charter states the boundary + mechanism (plan §2.13 `:232-235`).

### D-VENDOR-ROLE / SHA — **RESOLVED-IN-CHARTER: cite-only, NO source vendoring**
Web-verified live (`gh api repos/XPandora/PhysGaussian`): **`license=null`, NO LICENSE file**
in the root tree; default-branch HEAD SHA **`8339ed6aa2cd5d50e1001a254a3d95aea678a956`**
(matches the §2.18 pin `:274` byte-for-byte; security-advisories empty). No license =
all-rights-reserved by default ⇒ **cite-only; do NOT vendor source** (consistent with §2.18
`:276-280` + spec §2.4 independent-derivation). Reimplement the coupling from the PAPER Eq.
(7)-(9); the executor MAY clone the repo transiently as a derivation oracle (cross-check at
derivation time) but does **NOT** commit it. `references/PhysGaussian/manifest.yaml` is a
**cite-only pointer** (citation + SHA + NO-LICENSE note); citation also in Cat-1 chain + spec
Appendix A.2 (`docs/architecture.md:2230`). MANIFEST/manifest format per §6 D-MANIFEST-FMT.

### D-CI — **RESOLVED (operator-ratified v2): python-strict.yml `test-3dgs-mpm`; measure-then-split (two-tier IF measured-expensive)**
SHIFT: build-py.yml does not exist → `.github/workflows/python-strict.yml` (`test-3dgs-mpm`).
**Apply the L-PINN-2 two-tier pattern (the `3a2a7ae` split) IF** the full
MPM-sim-from-scratch + re-render is expensive on the CPU runner: always-on fast gate loads a
committed reference state + golden renders and compares (cheap); the full sim-from-scratch +
re-render goes on a path-filtered on-change job. **MEASURE the per-push cost at Stage 1c;
split only if it warrants** (cf. pinn-poisson ~70 min → split). `test-3dgs-mpm` reads
committed LFS captures → needs a selective `git lfs pull` step (cf. ising `test-ising-classical`).

### D-TOL — **RESOLVED-IN-CHARTER: TWO prongs, both fit the schema (no STOP-SCHEMA-FIT)**
The tolerance schema **already anticipates task-8** (`tools/testkit/equivalence/tolerance-schema.json:38` "Tasks 6 and
8 add rows", `neural-rendered` named as an example category). Two rows, single-stack (no
`overrides`/cross-stack cap):
- **Numerical coupling:** `[golden_tolerance.neural-rendered.3dgs-mpm]` — bespoke
  per-anchor keys (e.g. `covariance_transform_abs`, `polar_decomp_rotation_rel`,
  `identity_invariance_abs`); `additionalProperties` numeric/bool/string per
  `tools/testkit/equivalence/tolerance-schema.json:68-83` (§S.3 shape 3).
- **Perceptual:** `[render_similarity.neural-rendered.3dgs-mpm]` — required triple
  `psnr_min` / `ssim_min` / `lpips_max` (`tools/testkit/equivalence/tolerance-schema.json:36-67`; §S.3 shape 2),
  LOCKED to the §2.12 floors (≥28 / ≥0.85 / ≤0.15); measured value far above (bit-exact).
Per §S.2: at execution, read the schema + one existing entry of EACH branch before appending
(existing: `[golden_tolerance.rigid-body.articulated-pedagogical]` and
`[render_similarity.continuous-ca.neural-ca]`). NOTE: NCA's row (23/0.80/0.05) is *below* the
floors by design (statistical); 3dgs-mpm's must be *at-or-above* (deterministic) — do NOT
copy NCA's values.

### D-LAYOUT — **RESOLVED-IN-CHARTER: `packages/3dgs-mpm/` (flat)**
SHIFT from `neural-rendered/3dgs-mpm/python/` (stale category-prefix anchor). sim-spec stays
category-prefixed at `docs/sim-specs/neural-rendered/3dgs-mpm/`.

### D-API — **RESOLVED-IN-CHARTER: resolve names against landed reality**
`GaussianSplatModel` (not GaussianSet); `render(model, camera, *, image_height, image_width,
background)` returns `(H,W,3) float32` in `[0,1]` (not forward_splat);
`GaussianSplatModel.load_ply(path, *, device)`; `Camera` + `Camera.look_at(...)`; `save_png`.
Gaussian fields: `positions (N,3) f32`, `scales (N,3) f32`, `rotations (N,4) f32` quat-wxyz,
`opacities (N,) f32`, `sh_coefficients (N,K,3) f32`, Warp-backed. render_similarity:
`from render_similarity import psnr, ssim, lpips` (`lpips(a,b,net="alex"|"vgg")`; `ms_ssim`
raises NotImplementedError — Phase-4). The consumption pattern (reconstruct→transform→render)
fits the public surface; if a mismatch surfaces at execution, raise it (§3.2.1 anticipates).

### D-MANIFEST-FMT — **RESOLVED-IN-CHARTER**
Match the in-repo references vendoring convention. Recent sims used `MANIFEST.toml`
(mass-spring-cloth) / `manifest.yaml` (per plan §2.11). For PhysGaussian (cite-only, no
source) the manifest records citation + SHA + license-note only; confirm the exact filename
+ format against the most recent `references/*/` precedent at execution.

### D-USD — **DEFER** (task-4 ratified Phase-3-Stack-E-WIDE policy; closed-with-shifted item).

### D-MUTATION — **none** (sim; `coupling.py` is sim-local; common-3dgs baseline is task-1's,
extended Phase-4 WU-C). No mutation target (plan §6.0 item 12 testkit-adjacent-only).

### D-SCENE — **RESOLVED-IN-CHARTER: small synthetic, few-hundred Gaussians**
Drive a SMALL/SYNTHETIC 3DGS object (e.g. a procedurally-seeded blob of ~200–500 Gaussians,
generated deterministically and committed as a small `.ply` or built at test time) — NOT a
vendored full photorealistic Inria scene. Rationale: CPU tractability + render determinism +
LFS-lightness (§Q HEAVIEST footprint). Document the scene-construction in spec-ref §3.

### D-CAPTURE-DESC / D-NAMING — **RESOLVED-IN-CHARTER**: sim-id `3dgs-mpm`; propose the
Appendix D.2.3 capture descriptor (incl. the Gaussian-set state fields) at landing.

### D-TAG — **RESOLVED-IN-CHARTER: NO** (plan dispatch D-TAG=NO; phase-close-only cadence).

## 7. Thirteen-gate acceptance map (spec §3.5 / D.6 v2.4) — NO gate-14

Single-stack ⇒ **no gate-14** (no cross-stack pair). Render-similarity is realized as the
**gate-4 Cat-3 golden** (deterministic own-pipeline; MUST clear §2.12 floors).

| Gate | 3dgs-mpm specialization |
|---|---|
| 1 spec sheet + §6 posture | spec-ref §3/§4/§9 + two-pronged posture |
| 2 probe report | `tools/testkit/probes/reports/3dgs-mpm.md` |
| 3 failing suite + sha256 footer | `failing-tests-evidence/3dgs-mpm-<UTC>.txt`; hash in footer (F-RB-1: exclude from whitespace hook) |
| **4 golden (Cat 3), ≥3 anchors** | **TWO prongs:** numerical coupling golden (Anchor 1 Eq.(7)-(8) / Anchor 2 polar-decomp w/ §2.4 caveat / Anchor 3 F=I) **AND** render-similarity vs committed goldens (MUST clear §2.12 floors; below = STOP-to-investigate) |
| 5 Tier 1 diagnostics | NaN/Inf; det(F) > 0 |
| 6 Tier 2 (category) | inherits MPM Tier 2 + the coupling tier-3 |
| 7 citation chain (Cat 1) | PhysGaussian Eq.(7)-(9) (cite repo lines per Conv #8), Kerbl 2023, Stomakhin 2013 (MPM) |
| 8 public API (Cat 2) | `packages/3dgs-mpm` CLI + sim-local coupling surface |
| 9 replayable capture | `.h5` with MPM + Gaussian-set state; testkit replay |
| 10 determinism ↔ capture | `[neural-rendered.3dgs-mpm]` row matches capture sidecar `claimed` (bit-exact-same-hw) |
| 11 PBT (≥2) | `gaussian_count_invariant` + `def_grad_determinant_positive` |
| 12 perf-ledger row | CPU wall-clock + **CPU memory** (GPU-peak moot CPU-only); VERIFY the row exists (S2-RD2C1) |
| 13 landing replay | re-run gate-3 failing tests via the EXACT `replay_failing_tests` cmd (L-PINN-1); hash matches |

## 8. Convention operationalization

- **§Q (LFS, HEAVIEST footprint):** Stage-0 first action after anchor probe — `source
  tools/lfs/setup-lfs-s3-local.sh` (non-zero → STOP-LFS-PUSH). New `.h5` capture + golden
  PNGs + canonical scene are LFS-tracked; back-fill to R2 by landing (§Q.5). GitHub push =
  `git -c lfs.standalonetransferagent= push`; R2 sync = `source setup-lfs-s3-local.sh && git
  lfs push --object-id --stdin origin` (SAME shell — ising root-cause). Keep the scene small
  (D-SCENE).
- **§R (integrity measure-don't-copy):** record `integrity_invariant: "0 HARD_FAIL / 14
  SOFT_WARN"` (STOP-D if it changes) + `integrity_digest_at_head` measured live at each audit
  (this charter: `5c7172a2…`). Never copy the digest.
- **§S / §S.2 / §S.3 (tolerance schema):** read `tolerance-schema.json` + one existing entry
  of EACH branch before appending the two rows (D-TOL). Both branches schematized → no
  STOP-SCHEMA-FIT.
- **§S.5 (post-push CI sweep):** within ~2 min of each push, `gh run list --commit
  $(git rev-parse HEAD) --limit 30`; any failure on ANY workflow → STOP-CI-RED.
- **Inherited Warp friction:** F-RB-1 (whitespace-hook exclusion for failing-tests-evidence),
  F-RB-3 (`# mypy: ignore-errors` scoped to Warp-touching files), L-PINN-1 (exact replay cmd),
  S2-RD2C1 (verify the perf-row at landing). end-of-file-fixer may mutate tool-written JSON
  sidecars → recompute sha256 post-hook (cf. mass-spring-cloth).

## 9. Execution-session agent prompts (copy-paste at dispatch; one stage per session)

### Stage 0 (anchor + LFS bootstrap + preconditions + vendor-posture + corrigenda)
> Execute task-8 3dgs-mpm Stage 0 per `docs/phases/sub-phase-phase-3-3dgs-mpm.md`. Anchor
> probe (base sha). **FIRST after probe:** `source tools/lfs/setup-lfs-s3-local.sh` (non-zero
> → STOP-LFS-PUSH). Re-verify preconditions (§5) + CPU-render live; re-measure integrity
> digest (§R). Write `tools/testkit/probes/reports/3dgs-mpm.md` (verbatim live API:
> common-3dgs `GaussianSplatModel`/`render`/`Camera`/`load_ply`; render_similarity direct
> import; MPM kernels + `F`; common-warp Capture). Resolve PhysGaussian cite-only posture +
> `references/PhysGaussian/manifest.yaml` (SHA `8339ed6a…`, NO source). File A-7 in
> `docs/spec-amendments-proposed.md`. Draft `spec-ref.md` skeleton w/ corrected eq numbers
> (Eq.(7)-(8) MVP, Eq.(9) stretch). Commit to main; §S.5 CI sweep.

### Stage 1a → 1c (scaffold/RED → coupling → render+capture → goldens → gates)
> Stage 1a: scaffold `packages/3dgs-mpm/` (flat); failing TDD (coupling-correctness + render-
> similarity-vs-golden, both RED); evidence file + sha256 footer (F-RB-1/F-RB-3). Stage 1b-1:
> `coupling.py` (reconstruct A → `Σ'=F·A·Fᵀ` → re-extract scale/rot; SH FROZEN) → numerical
> golden GREEN (≥3 anchors, Anchor-2 §2.4 caveat). Stage 1b-2: MPM-step→coupling→render
> pipeline + capture (MPM + Gaussian state); MEASURE determinism → registry row. Stage 1b-3:
> generate golden renders; MEASURE PSNR/SSIM/LPIPS vs them; LOCK spec-ref §9; MUST clear
> §2.12 floors (else STOP-to-investigate). Stage 1c: gates 4–13; perf-row (CPU wall+mem,
> verify it exists); CI two-tier DECISION on measured cost (D-CI); gate-13 exact replay
> (L-PINN-1); landing audit. Commit each; §S.5 sweep.

### Stage 2 (landing)
> Reconcile deliverables A–N; grade `closed-with-shifted-N` (§2.15); propose Appendix D.2.3
> descriptor + PhysGaussian D.3 cite-only row; progress.md entry (SH-update deferral status);
> **NO tag**. Convention #12 SHA back-fill if needed. §S.5 sweep.

## 10. Audit / report paths

- Charter: `docs/phases/sub-phase-phase-3-3dgs-mpm.md` (this file).
- Probe: `tools/testkit/probes/reports/3dgs-mpm.md`.
- Stage audits: `docs/_audits/phase-3/sub-phase-phase-3-3dgs-mpm-stage-{0,1a,1b,1c}-<UTC>.md`.
- Landing report: `docs/_audits/phase-3/task-8-3dgs-mpm.md` (§10 SH-update deferral status).
- progress.md: `docs/_audits/phase-3/progress.md`.
- Corrigendum: `docs/spec-amendments-proposed.md` (A-7).

## 11. Closing criteria & operator-ratification items

**Plan-drafting verdict: CONFIRMED-SHIFTED.** Preconditions DISCHARGED (both hard deps
present); CPU-render FEASIBLE; no BLOCK / no HARD-RULE-2 surface. task-8 is **TERMINAL on
produce**; both hard deps satisfied.

**Operator RATIFIED all 8 items before execution Stage 0 (v2, 2026-05-29; see the dispatch
"RATIFIED D-CLASSES" block). All §6 D-classes are now RESOLVED.** Recorded for the audit
trail:
1. **D-PRECONDITIONS/CPU-RENDER** — accept the discharge (proceed, no BLOCK).
2. **D-RENDER-DET + the deterministic-golden-render boundary** — accept that below-floor =
   STOP-to-investigate (NOT a quality-flag close), grounded in common-3dgs's bit-exact
   declaration. This is SHIFT §1.3-8 of plan §6.8-E.
3. **D-ANCHOR-COUPLING** — accept the corrected eq numbers (Eq.(7)-(8) MVP + Eq.(9) stretch,
   SHIFT from "(8)-(10)") and the Anchor-2 §2.4 same-theory caveat.
4. **D-VENDOR-ROLE/SHA** — accept cite-only (NO source vendoring), SHA `8339ed6a…`.
5. **D-SCOPE-MVP/STRETCH** — accept the MVP/stretch boundary + the >~3-day defer mechanism.
6. **D-CI** — accept measure-then-split (two-tier IF expensive).
7. **D-SCENE** — accept small-synthetic canonical scene (no full Inria scene).
8. **A-7** — accept staging the spec line-2551 License correction.

**RESOLVED-IN-CHARTER (no operator action):** D-TOL (both prongs fit schema), D-LAYOUT,
D-API, D-MANIFEST-FMT, D-USD (defer), D-MUTATION (none), D-CAPTURE-DESC/D-NAMING, D-TAG (NO).
