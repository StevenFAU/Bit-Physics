# spec-sh-update.md — 3dgs-mpm (SH-update neural-rendered extension)

> **Status:** Phase-4 batch-2 Sim A; authored at Stage 1a (NEW file — the deferred-from-task-8
> slot per `docs/phases/sub-phase-phase-3-3dgs-mpm.md` § 4 / § 6 D-SCOPE-MVP/STRETCH).
> **Parent reference sim:** `docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md` (task-8 MVP).
> **Variant type:** `sh-update` (the PhysGaussian Eq. (9) stretch). **Primary stack:** E.
> **Package:** `packages/3dgs-mpm-sh-update/` (import `gs_mpm_sh_update`) — a SIBLING that does
> NOT mutate the frozen `packages/3dgs-mpm/` MVP.
> **Foundation consumed:** § 4.2.C (WU-C: `PhysicsCoupling` / `render` / `render_similarity`).
> **Stage-0 probe:** `tools/testkit/probes/reports/3dgs-mpm-sh-update.md`.
> **Charter:** `docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md` § 3.1 / § 4.1.

## § 1 Scope

The per-frame **spherical-harmonic rotation** deferred from Phase-3 task-8. Under an MPM
deformation gradient `F`, PhysGaussian rotates each Gaussian's view-dependent appearance by the
rotation part `R` of the polar decomposition `F = R S` (Eq. (9)); the MVP FROZE the SH (`R`
unused). This sim supplies the rotation and re-renders. Scope: **degree ≤ 1** (the canonical
scene is degree-1; degree ≥ 2 raises `NotImplementedError` — a documented further extension).

## § 2 Physics / governing equations

- Covariance (UNCHANGED, reused from the MVP): `Σ' = F A Fᵀ` (PhysGaussian Eq. (8); the DIRECT
  F-form — `packages/3dgs-mpm/gs_mpm/coupling.py:102`).
- SH rotation (NEW): coefficients rotate by the Wigner D-matrix of `R = polar(F)` (Eq. (9)).
  Degree-1 closed form against the landed renderer basis `(−y,+z,−x)` (`common/common-3dgs/src/common_3dgs/render.py:87`):
  `D₁(R) = P R Pᵀ`, `P = [[0,−1,0],[0,0,1],[−1,0,0]]`. DC band rotation-invariant.

## § 3 Verification surfaces

Two-pronged (spec § 5.11): (1) numerical SH-rotation golden (≥3 anchors, § 8); (2) perceptual
render-similarity vs OWN committed renders on the degree-1 scene (§ 9). Plus physics-equivalence
vs the parent (MPM `particle_pos`/`particle_F` bit-equal to `gs_mpm` — same kernels).

## § 4 Determinism

Bit-exact, same-stack-same-hw, seed-pinned. Composes MPM (serial `wp.launch` f64) → covariance
coupling (deterministic NumPy) → SH rotation (SVD polar + `P R Pᵀ`, deterministic NumPy) →
render (atomic-free serial CPU `wp.launch`). Rasterization atomic-ordering is the sensitive
surface — MEASURED at Stage 1b (`run_twice_and_diff`), not assumed. No EFECT.

## § 5 Capture

Coupled-sim `.h5` (+ `.json`): MPM particle state + the gaussian-transform history (positions,
scales, rotations, AND the rotated SH) per captured frame. Written via `common_warp.Capture` +
`write_capture` (the MVP shape).

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

- `sh_rotation_equivariant` (variant-axis) — `eval_SH(rotate(c,R), R·d) == eval_SH(c, d)` for
  any unit `R∈SO(3)`, degree 1.
- `covariance_spd_preserved` — `Σ' = F A Fᵀ` yields strictly positive scales for any `det(F)>0`.

## § 7 Citations (Cat 1)

- PhysGaussian (Xie et al. 2024, arXiv:2311.12198) — Eq. (8) covariance, Eq. (9) SH rotation
  (CITE-ONLY; reimplemented per spec § 2.4).
- Kerbl et al. 2023 (ACM TOG 42(4)) — Eq. (6) emission-absorption alpha-compositing (the render).
- Green, R. (2003), "Spherical Harmonic Lighting: The Gritty Details" — real-SH rotation.

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

- **A1** degree-1 Wigner-D `D₁(R) = P R Pᵀ` closed form, cross-checked by the INDEPENDENT
  dipole-rotation derivation (the band-1 dipole vector rotates by `R`). Hand-computed numeric:
  `c=(1,0,0)` under `R_z(90°)` → `(0,0,−1)`.
- **A2** rotation-equivariance vs the LANDED renderer `_eval_sh` (implementation-independent =
  PhysGaussian's inverse-rotation-on-view-directions).
- **A3** pure-stretch frozen (`polar(SPD F)=I` → SH unchanged, recovering the MVP) + pure-rotation
  (`polar(orthogonal F)=F`).

## § 9 Replayable capture

`captures/3dgs-mpm-sh-update-ref/` + the committed golden renders
`tools/testkit/golden/renders/3dgs-mpm-sh-update-canonical-frame-{N}.png` (LFS). Render-similarity
floors (§ 2.12): PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15 (`tools/testkit/equivalence/tolerance.toml`
`[render_similarity.neural-rendered.3dgs-mpm-sh-update]`).

## § 10 Determinism ↔ capture

Registry `[neural-rendered.3dgs-mpm-sh-update]` (`tools/testkit/determinism/registry.toml`)
`class = "bit-exact"` ↔ capture sidecar `determinism.claimed` (MEASURED at Stage 1b).

## § 11 PBT

§ 6 invariants under `tests/test_pbt_invariants.py` (Hypothesis). Re-declared on falsification,
never widened (HARD RULE 2).

## § 12 Perf-ledger

`docs/perf-ledger.md`: a `3dgs-mpm-sh-update` canonical-render wall-clock row (gate-12).

## § 13 Gate-13

Landing replays the Stage-1a failing-tests commit via `replay_failing_tests.py`; normalized hash
matches (`tools/testkit/failing-tests-evidence/3dgs-mpm-sh-update-<UTC>.txt` footer).

## Gate-14 / mutation

Gate-14 N/A (single-stack Stack E; no cross-stack neural sibling) — the WU-F neural-axis floor +
physics-equivalence-vs-parent apply. Mutation target `[targets.gs_mpm_sh_update]` (advisory;
oracle-grounded, snapshots forbidden). `render_similarity` (0.9242) + `variant` (0.8702) HARD
gates are touched as CONSUMER only → re-confirmed passing at landing.
