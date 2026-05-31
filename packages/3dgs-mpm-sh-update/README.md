# 3dgs-mpm-sh-update (Phase-4 batch-2, Sim A)

The **SH-update** deferred from Phase-3 task-8 (`3dgs-mpm`): per-frame spherical-harmonic
rotation under the MPM deformation's rotation part (polar decomposition `F = R S`;
PhysGaussian Eq. (9), arXiv:2311.12198, CITE-ONLY).

This is a **sibling** of `packages/3dgs-mpm` — it does **not** mutate the frozen MVP. It
imports `gs_mpm.couple_gaussians` (the covariance `Σ'=F A Fᵀ` path, UNCHANGED) and the MPM
kernels, and **adds** the degree-1 Wigner-D SH rotation `D₁(R) = P R Pᵀ` (`P` from the landed
common-3dgs real-SH basis) on a **new degree-1 directional-SH scene** (the landed scene is
degree-0/DC-only, on which an SH rotation is a no-op).

- Import package: `gs_mpm_sh_update` (the dir is digit-leading).
- Verification (two-pronged): SH-rotation numerical golden (≥3 anchors — A1 `P R Pᵀ` closed
  form / A2 rotation-equivariance vs the renderer / A3 pure-stretch frozen) + perceptual
  render-similarity vs OWN committed renders (PSNR≥28 / SSIM≥0.85 / LPIPS≤0.15).
- Single-stack (Stack E); gate-14 N/A; WU-F neural-axis floor applies.
- Scope: degree ≤ 1 (the canonical scene is degree-1).

```
python -m gs_mpm_sh_update --out captures/3dgs-mpm-sh-update-ref --render-dir docs/renders/3dgs-mpm-sh-update-neural
```
