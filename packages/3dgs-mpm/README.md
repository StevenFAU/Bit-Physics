# 3dgs-mpm — PhysGaussian-style MPM→3DGS coupling (Phase-3 task-8, FINALE)

FIRST neural-rendered-CATEGORY sim. Single-stack **Stack E** (NVIDIA Warp + Python),
CPU-only. The Phase-2 MPM solver (`packages/mpm-multimaterial-stack-e`) is **consumed**;
the **novel** work is the sim-local coupling (`gs_mpm/coupling.py`):

> per frame: MPM step → per-particle deformation gradient `F (N,3,3)` → Gaussian covariance
> `Σ' = F·A·Fᵀ` (PhysGaussian Eq. (8)) → Gaussian scale/rotation (SH frozen for MVP) →
> render via common-3dgs.

The import package is **`gs_mpm`** (the dir `3dgs-mpm` is digit-leading; PEP 8 forbids a
leading-digit module). The distribution name and sim identity remain `3dgs-mpm`.

## Verification (two-pronged)

1. **Numerical coupling-correctness golden** — `Σ'=F·A·Fᵀ` round-trip, ≥3 anchors
   (`tools/testkit/golden/tables/3dgs-mpm-coupling.json`): Eq. (8) covariance transform,
   polar-decomposition stretch (Eq. (9); §2.4 same-theory caveat), and the F=I identity
   (fully independent).
2. **Perceptual render-similarity golden** — rendered canonical frames vs the project's OWN
   committed golden renders (`tools/testkit/golden/renders/`). DETERMINISTIC own-pipeline
   regression: MUST clear the §2.12 floors (PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15);
   below-floor = STOP-RENDER-FLOOR-to-investigate, not a quality-flag close.

## Run

```
uv run --directory packages/3dgs-mpm python -m gs_mpm run --out <dir>
```

PhysGaussian (Xie et al. 2024, arXiv:2311.12198) is **CITE-ONLY** (no upstream LICENSE →
all-rights-reserved); the coupling is reimplemented from the paper's published equations.
See `references/PhysGaussian/MANIFEST.toml` and `docs/sim-specs/neural-rendered/3dgs-mpm/`.
