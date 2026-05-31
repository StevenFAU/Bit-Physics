# eulerian-smoke-neural (Phase-4 batch-2, Sim B — "3dgs-smoke")

Spec § 5.11 **3dgs-smoke**: couple the landed `eulerian-smoke-stack-e` volumetric smoke
(Stam/Fedkiw stable fluids; the 3D `density` field) to a Gaussian cloud via the WU-C
density→opacity Beer-Lambert hook (`common_3dgs.default_density_to_opacity`) and render it
(`common_3dgs.render`).

- One Gaussian per sampled smoke voxel (the K densest, deterministic); opacity = `1 − exp(−density)`;
  isotropic covariance (MVP); degree-0 DC SH = a fixed smoke colour.
- Reuses `stable_fluids_step_3d` by import → the `density` field is bit-equal to a direct
  `eulerian-smoke-stack-e` rollout (physics-equivalence-vs-parent holds by construction).
- Verification (two-pronged): coupling golden (≥3 anchors — A1 Beer-Lambert / A2 Kerbl 2023 Eq.6
  alpha-compositing / A3 zero-density background) + perceptual render-similarity vs OWN committed
  renders (PSNR≥28 / SSIM≥0.85 / LPIPS≤0.15).
- Single-stack (Stack E); gate-14 N/A; WU-C neural-axis floor applies. Small grid for CPU-tractability.

```
python -m eulerian_smoke_neural --out captures/eulerian-smoke-neural-ref --render-dir docs/renders/eulerian-smoke-neural
```
