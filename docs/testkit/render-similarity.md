# Render-similarity metrics — `tools/testkit/render_similarity`

> Layer-0 testkit (`docs/architecture.md:673`). The render-similarity gate-4
> primitives for neural-rendered sims. Introduced at Phase-3 task-2; `ms_ssim`
> + `RenderSimilarityReport` landed at Phase-4 WU-C (plan §4.2.C).

## Public surface

```python
from render_similarity import psnr, ssim, lpips, ms_ssim, RenderSimilarityReport
```

All four metric functions take two `(H, W, 3)` images of matching shape +
dtype (`uint8 [0, 255]` or `float32 [0, 1]`, auto-detected); shape/dtype/channel
violations raise `ValueError`.

| Function | Meaning | Identity value | Range |
|---|---|---|---|
| `psnr(a, b)` | Peak signal-to-noise ratio (dB); `20·log10(MAX_I/√MSE)` | `+inf` | higher better |
| `ssim(a, b)` | Structural similarity (Wang et al. 2004), skimage | `1.0` | `[-1, 1]` |
| `lpips(a, b, net='alex'\|'vgg')` | Learned perceptual similarity (Zhang 2018) | `~0` | `>= 0`, lower better |
| `ms_ssim(a, b)` | Multi-scale SSIM (Wang, Simoncelli & Bovik 2003) | `1.0` | `(-1, 1]` |

## `ms_ssim` — multi-scale SSIM (Phase-4 WU-C)

Computed on BT.601 luminance. At each scale the contrast·structure term is
accumulated with a Gaussian-windowed (σ=1.5) local-statistics estimate; the
luminance term is applied only at the coarsest scale; the result is the weighted
geometric mean `∏ mcs_s^{w_s} · mssim_M^{w_M}` with the Table-1 weights
`(0.0448, 0.2856, 0.3001, 0.2363, 0.1333)`.

The canonical 5 scales assume a ~176-px minimum dimension that portfolio smoke
renders rarely have, so the scale count **adapts**:
`M = min(5, floor(log2(min(H, W))))` with the used weights renormalised. Images
with `min(H, W) < 2` raise `ValueError`. Identical inputs return exactly `1.0`.

## `RenderSimilarityReport` (Phase-4 WU-C)

```python
report = RenderSimilarityReport.evaluate(
    predicted, target,
    thresholds={"psnr_min": 30.0, "ssim_min": 0.9, "ms_ssim_min": 0.9, "lpips_max": 0.15},
)
report.passed  # bool — every named threshold satisfied
```

`thresholds` keys use `<metric>_min` for higher-is-better metrics
(`psnr`/`ssim`/`ms_ssim`) and `<metric>_max` for lower-is-better (`lpips`);
unknown keys are ignored. The dataclass carries `psnr`, `ssim`, `lpips`,
`ms_ssim`, `passed`, and the `thresholds` dict.

## Determinism

PSNR/SSIM/MS-SSIM are pure NumPy/scipy/skimage numeric pipelines — bit-exact
same-op-order. LPIPS is CPU-only (`model.eval()` + `torch.no_grad()` + pinned
linear-head weights) for same-stack-same-hw bit-exactness; a GPU consumer
diverges (different reduction order). See `docs/testkit/equivalence.md`.

## References

- Wang, Bovik, Sheikh, Simoncelli (2004), *Image Quality Assessment: From Error
  Visibility to Structural Similarity*, IEEE TIP — SSIM.
- Wang, Simoncelli, Bovik (2003), *Multiscale Structural Similarity for Image
  Quality Assessment*, IEEE Asilomar — MS-SSIM.
- Zhang, Isola, Efros, Shechtman, Wang (2018), *The Unreasonable Effectiveness
  of Deep Features as a Perceptual Metric*, CVPR — LPIPS.
