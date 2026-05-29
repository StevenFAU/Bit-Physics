---
date: 2026-05-29T22-55-29Z
author: phase-3 3dgs-mpm landing (Claude Code)
subject: Phase 3 FINALE (task-8 3dgs-mpm, FIRST neural-rendered CATEGORY) — sub-phase LANDING audit (Stages 0->2 combined session)
verdict: closed-with-shifted-8
head_sha: ad09c516f6e0bdd1080b41a9871a9cd56d694742
anchor_sha: 28b005c5bf9bd02549204cd3ce5c2d23ed75edda
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: b6ace974d5808a848c09900f5586f76f1fa641a7726b258152ce48fbc41abe93
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
tag: none
evidence_paths:
  - docs/phases/sub-phase-phase-3-3dgs-mpm.md
  - docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md
  - references/PhysGaussian/MANIFEST.toml
  - docs/spec-amendments-proposed.md
  - packages/3dgs-mpm/gs_mpm/coupling.py
  - tools/testkit/golden/tables/3dgs-mpm-coupling.json
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - docs/perf-ledger.md
  - tools/testkit/failing-tests-evidence/3dgs-mpm-2026-05-29T22-15-39Z.txt
evidence_hashes:
  docs/phases/sub-phase-phase-3-3dgs-mpm.md: sha256:982be1d91520a9b492eb6d15cc63eec4d5108d941974ed88b1b578ebd754e53a
  docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md: sha256:9ac38e1c5844822ca55889cb3582c69e4c2aa7d1862e5b99e72eabb94e10e3e3
  references/PhysGaussian/MANIFEST.toml: sha256:d71eef0653c4c64f5cb576ac4cad04fe337df272e531e108403db35d6d109585
  docs/spec-amendments-proposed.md: sha256:bd20de1d1d7865408a261658ddb86bc698f07caa93a7f3d5b56907dfa8cc0da0
  packages/3dgs-mpm/gs_mpm/coupling.py: sha256:835e0a790072970bc196a651b62b544a0699f730df8a4090f144a0ce6c2bfe61
  tools/testkit/golden/tables/3dgs-mpm-coupling.json: sha256:266974929a211096b6acce308e350c6f568730ec22fb637cc5327069fe021dc4
  tools/testkit/equivalence/tolerance.toml: sha256:1414ed56581081d6682a3d7a30e3567f86a71bd17974a2a0ebe9df44cb9ac395
  tools/testkit/determinism/registry.toml: sha256:058b3ff7a623c2e8341c041e7b1236ca9b91934b3b7f2be00061b15ddb6c4db9
  docs/perf-ledger.md: sha256:06c7a42eba538c825cd6fec6abedd51c4a3e8c71a4026381b7751189c4ddabfa
  tools/testkit/failing-tests-evidence/3dgs-mpm-2026-05-29T22-15-39Z.txt: sha256:6053e228a8d116d892eb2830b54a0fc4dd02e7b5f766e08c07648a3abd009bcb
---

# Phase 3 — task-8 3dgs-mpm — sub-phase LANDING audit (the Phase-3 FINALE)

> **FIRST neural-rendered-CATEGORY sim**, single-stack Stack E (Warp + Python), CPU-only.
> PhysGaussian-style MPM->3DGS coupling: the Phase-2 MPM solver is CONSUMED; the NOVEL work
> is the sim-local coupling (`gs_mpm.coupling`). Verified TWO-PRONGED. Stages 0->2 in one
> session, trunk-based to `main`, NO tag (D-TAG NO). Verdict **closed-with-shifted-8**.

## § 1 — Commit chain (all pushed origin/main)

| SHA | Stage | Summary |
|---|---|---|
| `237931262` | 0 | cite-only manifest + A-7 + spec-ref skeleton + probe re-verify + charter v2 flip |
| `9ab063e8` | 0 | Stage-0 audit (CONFIRMED) |
| `42bc3260` | 0 | Convention-#12 back-fill of the Stage-0 audit head_sha |
| `ce50829f` | 1a | scaffold + RED tests (two-pronged TDD; gate-3 evidence) |
| `1dbae8d7` | 1b | coupling + render pipeline + both golden prongs GREEN + D-DET measured + goldens (LFS) |
| `eed9f05b` | 1c | CI job (test-3dgs-mpm) + perf-ledger + tier-3 diagnostic + schema-corpus fixture (LFS) |
| `ad09c516` | 1c | gate-13 fix — failing-tests evidence to stdout-only (L-PINN-1 extension); **HEAD** |

Anchor probe at `28b005c`; landing at `ad09c516`.

## § 2 — 13-gate acceptance (single-stack: NO gate-14, NO mutation)

| Gate | Result | Evidence |
|---|---|---|
| 1 spec sheet + §6 posture | PASS | `docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md` §1-13 (two-pronged + deterministic-golden-render boundary + CPU-scope) |
| 2 probe report | PASS | `tools/testkit/probes/reports/3dgs-mpm.md` (Stage-0 live re-verification + Inria-probe) |
| 3 failing suite + sha256 footer | PASS | `failing-tests-evidence/3dgs-mpm-2026-05-29T22-15-39Z.txt` (12 failed/1 passed RED at `ce50829`); footer sha + exact replay cmd |
| **4 golden (Cat 3), two prongs** | **PASS** | **Prong 1** numerical coupling golden, 3 anchors (Eq.(8) covariance transform / polar-decomp stretch §2.4-caveat / F=I identity) within 1e-9. **Prong 2** render-similarity vs OWN committed goldens: PSNR 59.94-63.80 / SSIM 0.99973-0.99992 / LPIPS 0.00001 — clears §2.12 floors (28/0.85/0.15); NOT below-floor -> NO STOP-RENDER-FLOOR |
| 5 Tier-1 diagnostics | PASS | NaN/Inf finite + det(F)>0 (tier-3 `deformation_health`: min det(F) 0.0801 @frame 200, min scale 0.00197) |
| 6 Tier-2 (category) | PASS | inherits the consumed MPM Tier-2 + the coupling tier-3 diagnostic |
| 7 citation chain (Cat 1) | PASS | PhysGaussian Eq.(8)/(9) (cite-only, arXiv:2311.12198); Kerbl 2023 (via common-3dgs); Stomakhin/Hu MLS-MPM (via mpm-multimaterial-stack-e) |
| 8 public API (Cat 2) | PASS | `packages/3dgs-mpm` CLI (`python -m gs_mpm run`) + sim-local coupling surface |
| 9 replayable capture | PASS | `.h5`+`.json` with BOTH MPM particle + Gaussian-set state; byte-reproducible (sha256 match two runs) |
| 10 determinism <-> capture | PASS | `[neural-rendered.3dgs-mpm]` bit-exact-same-hw == capture `determinism.claimed`; MEASURED HELD |
| 11 PBT (>=2) | PASS | `gaussian_count_invariant` + `def_grad_determinant_positive` (envelope held; min det(F) 0.0801>0) |
| 12 perf-ledger row | PASS | `docs/perf-ledger.md` warp-cpu drop-blob-256gaussians-32grid-step300 0.313s + CPU mem ~169 MB (verified row exists, S2-RD2C1) |
| 13 landing replay | PASS | `replay_failing_tests --commit ce50829 --pytest-target packages/3dgs-mpm` -> normalized sha `1c49bdd3…` match=True |

No gate-14 (single-stack, no cross-stack pair). No mutation (sim; `coupling.py` sim-local;
common-3dgs baseline is task-1's, Phase-4 WU-C extends).

## § 3 — Integrity / replay / append-only / verify_evidence / CI (landing checks)

- **§R integrity (two-field):** `0 HARD_FAIL / 14 SOFT_WARN` HELD; digest `b6ace974…`
  measured live at HEAD (drifted from the Stage-0 `5c7172a2…` due to this sub-phase's doc/
  audit additions — §R measure-don't-copy; the 0HF/14SW invariant is the stable check).
- **Cross-phase replay:** `replay_prior_phase --prior-phase phase-2` -> `ok=True` (8/8). I1/I2.
- **Append-only:** `audit-append-only` CI workflow PASS at HEAD (I-checks; no audit mutation).
- **verify_evidence:** this sub-phase's Stage-0 audit 16/0 (post Convention-#12 back-fill);
  this landing audit's evidence back-filled per Convention #12 (following commit).
- **§S.5 full CI green at HEAD `ad09c516`:** all 9 workflows success — integrity, python-
  strict (incl. the new `test-3dgs-mpm` job), cpp-strict, ts-strict, equivalence,
  determinism, tolerance-budget-check, structure, audit-append-only. (The first `test-3dgs-
  mpm` run failed on the R2 LFS pull because the golden/fixture OIDs were not yet in R2; see
  §6 LFS note — resolved by an explicit `--object-id --stdin` R2 push, then re-run green.)

## § 4 — Hard deps + CPU-render + Inria-probe + coupling-eq verification

- **Two hard deps PRESENT + USABLE:** common-3dgs (`GaussianSplatModel`/`render`/`Camera`,
  CPU-render via `wp.launch(device="cpu")`) + render-similarity (`from render_similarity
  import psnr, ssim, lpips`). Phase-2 MPM kernel sequence consumed. Re-confirmed live Stage 0.
- **Inria-probe CLEAN:** common-3dgs's own runtime carries NO vendored Inria source
  (docstring citations only); `references/3DGS-reference/` is a properly-licensed NON-
  COMMERCIAL oracle (LICENSE.md present) whose clause 3dgs-mpm inherits (`used_by_sims`); the
  sim depends on the reimplemented renderer, not the reference. NO HARD-RULE-2 surface.
- **Coupling equation numbers** re-verified verbatim against arXiv:2311.12198v3 (Convention
  #8): **Eq. (8)** `x_p(t)=φ(X_p,t)`, `a_p(t)=F_p A_p F_pᵀ` (§3.4, the MVP transform); **Eq.
  (9)** `f^t(d)=f^0(Rᵀd)` polar-decomp (§3.5, SH-rotation stretch); **Eq. (10)** rate-form
  (§3.6, NOT used). Eq. (7) = the time-dependent Gaussian-kernel definition consuming Eq.(8).

## § 5 — Coupling-anchor results (Prong 1) + D-DET

- **Anchor 1 (Eq.(8) covariance transform):** rotated Gaussian + diagonal F -> Σ'=diag(16,
  0.25,20.25); matches hand-derived within 1e-9.
- **Anchor 2 (polar decomposition F=R·S):** isotropic Gaussian -> Σ'=diag(9,4,16),
  sorted scales (2,3,4) = singular values of S. **§2.4 caveat documented** (same THEORY as
  PhysGaussian Eq.(9), not impl-independent).
- **Anchor 3 (F=I identity, fully independent):** Σ'=A unchanged; scales (1,2,3). The clean
  independent check — confirms no spurious transform.
- **D-DET MEASURED HELD:** two runs of `run_canonical_sim(seed=0)` byte-identical across all
  frame images + `particle_F` + Gaussian params + capture `.h5` sha256. Registry
  `[neural-rendered.3dgs-mpm]` class=bit-exact declaration HOLDS (no re-declaration).
- **PBT:** `def_grad_determinant_positive` envelope HELD as-declared (min det(F) 0.0801>0 at
  the floor-impact frame; no inversion). `gaussian_count_invariant` HELD.

## § 6 — §1.3 SHIFT set + execution shifts (closed-with-shifted-8)

Charter §1.3 carried 8 pre-execution SHIFTs (API names, render-sim import path, MPM path,
layout, CI workflow, eq numbers, cite-only vendoring, below-floor=STOP semantics) — all
confirmed at execution. The **closed-with-shifted-8** grade enumerates the EXECUTION-stage
on-evidence shifts:

1. **Import package `gs_mpm`** — the dir `packages/3dgs-mpm/` is digit-leading (PEP 8
   forbids a leading-digit module); the distribution name + sim id stay `3dgs-mpm`. The
   testkit property + tier3 subtrees use `gs_mpm/` for the same reason.
2. **Coupling-eq precision** — Eq. **(8)** is the operative covariance+center transform
   (Eq. (7) = the kernel definition); refines the charter §1.3-6 "Eq.(7)-(8)" framing.
3. **D-CI = SINGLE job, NO two-tier split** — measured cost 3.7 s wall / 1.3 GB peak on the
   runner, far below the L-PINN-2 split threshold (pinn split at ~70 min training). One
   `test-3dgs-mpm` job runs the full coupled suite + a selective golden-render LFS pull.
4. **SH-update stretch DEFERRED to Phase-4 `3dgs-mpm-sh-update`** (see §10).
5. **Render-similarity measured ~60 dB, not byte-identical ∞** — the render is byte-identical
   run-to-run (D-DET), but the committed goldens are 8-bit PNGs, so render(float32)-vs-PNG is
   quantization-limited (~60 dB). Clears the §2.12 floors by ~+32 dB; the deterministic-own-
   pipeline-regression intent is satisfied (a below-floor would have been STOP-RENDER-FLOOR).
6. **gate-13 evidence stdout-only + repo-root paths (L-PINN-1 extension)** — the RED evidence
   was first captured with `2>&1` (stderr merged), but `replay_failing_tests` compares
   pytest STDOUT-only -> 52-line mismatch; re-captured stdout-only from a worktree at the
   failing commit, rewriting the capture-worktree path to the real repo root so the replay's
   repo-root substitution collapses it (the residual 4-line path diff). gate-13 then PASS.
7. **LFS R2 mirror requires explicit `git lfs push --object-id --stdin origin`** — the
   `git lfs push origin main` form silently no-ops (git-lfs treats the OIDs as already pushed
   to origin via GitHub LFS), so R2 stayed empty and the CI R2-pull failed hard (no GitHub-
   LFS fallback within the pull). Fixed by force-pushing the 5 OIDs to R2 via `--object-id
   --stdin`, then re-running CI green. (Banked friction for every later LFS-bearing sim.)
8. **Capture manifest required the structured capture-v1 schema** — `sim`/`stack` objects +
   `config.dims`/`dtype`/`tier`/`seed`/`params` (a naive flat `sim="3dgs-mpm"` manifest
   failed validation); resolved on-evidence to match the ising/pinn precedent.

## § 7 — Cite-only posture + A-7 + corrigendum

- `references/PhysGaussian/MANIFEST.toml` is a **cite-only pointer** (`source_vendored=
  false`; the only file in the dir). No PhysGaussian source committed; no Inria submodule.
- **A-7** (`docs/spec-amendments-proposed.md`): spec `docs/architecture.md:2551` PhysGaussian
  License "MIT" -> NONE/cite-only (live-verified license=null / no LICENSE / SHA `8339ed6a…`
  matches §2.18). Operator applies at a phase boundary (spec frozen in Phase 3).

## § 8 — Appendix D.2.3 capture-descriptor proposal (operator)

Propose adding to spec Appendix D.2.3:

> `3dgs-mpm` | `drop-blob-256gaussians-32grid-step300` | neural-rendered | Stack E (warp-cpu)
> | capture carries BOTH MPM particle state (`particle_pos (N,3) f64`, `particle_F (N,3,3)
> f64`) AND Gaussian-set state (`gaussian_positions/scales (N,3) f32`, `gaussian_rotations
> (N,4) f32` wxyz) per captured step | bit-exact-same-hw.

## § 9 — coupling.py SIM-LOCAL promotion candidacy

`gs_mpm/coupling.py` is SIM-LOCAL (rule-of-three unmet; the only consumer is this sim). It is
a clean promotion candidate for **Phase-4 WU-C** (PhysGaussian-coupling into common-3dgs),
alongside the common-3dgs mutation-baseline extension. Do NOT promote now (charter §1.2).

## § 10 — SH-update (stretch) decision: DEFERRED to Phase-4 `3dgs-mpm-sh-update`

**MVP shipped** (MPM drives Gaussian centers + def-grad F -> scale/rotation via Eq.(8); SH
FROZEN). The **stretch (per-frame SH rotation, Eq.(9)) is DEFERRED**. Reason (D-SCOPE defer
criterion): the canonical synthetic scene is **SH degree-0** (DC-only), where a rotation of
the SH basis is a mathematical **no-op** (the DC term is rotation-invariant) — so the stretch
would be **unobservable and untestable on the shipped scene**. Shipping it meaningfully would
require ALSO building a higher-degree (>=1) scene + a Wigner-D SH-rotation implementation +
its own golden — net-new scope beyond the "straightforward" bar. Deferred to Phase-4
`3dgs-mpm-sh-update` (consumes the promoted coupling, WU-C). Recorded in progress.md.

## § 11 — Verdict

**closed-with-shifted-8.** Both gate-4 prongs GREEN; 13 gates PASS (no gate-14, no mutation);
D-DET measured-held; render-similarity clears the §2.12 floors (no STOP-RENDER-FLOOR);
PhysGaussian cite-only + A-7; Inria-probe clean; charter D-classes flipped RESOLVED v2;
all 9 CI workflows green at HEAD; gate-13 replay PASS. NO tag (D-TAG NO). task-8 TERMINAL on
produce. **Phase 3 is substantively complete (8 sub-phases: tasks 1-8).**
