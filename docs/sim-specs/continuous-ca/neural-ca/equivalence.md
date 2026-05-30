# Neural-CA — Cross-Stack Equivalence (gate-14, **STATISTICAL**)

> **Status:** authored at `sub-phase-phase-3-neural-ca` Stage 1c (gate-14).
> **Pair:** Stack-D (Python / PyTorch / CPU; D-inference) ↔ Stack-B (custom
> WGSL / WebGPU on a GPU host; B-inference), tied by ONE trained checkpoint.
> **Method:** **render-similarity** (PSNR / SSIM / LPIPS), NOT `compare_captures`.
> **Verdict:** STATISTICAL equivalence — locked to MEASURED bounds. Since the
> **Phase-4 A6 matched-RNG fix**, all three metrics (PSNR/SSIM/LPIPS) CLEAR the
> spec § 2.12 floors; the earlier below-floor QUALITY-CONCERN is **RESOLVED**.

This is the **FIRST cross-stack gate-14 of Phase 3** and the **FIRST statistical
(render-similarity) equivalence gate** in the portfolio — every prior Phase-3 sim
is single-stack (`no gate-14`) and every prior cross-stack pair (Phase-2 ports)
used bit/epsilon `compare_captures`. NCA is a **learned-dynamics** sim: a trained
model run in PyTorch f32 vs WGSL f32 is NOT bit-equivalent across stacks (spec
§ 2.6 learned row = `distributional`, `docs/architecture.md:414`; § 5.12), so the
gate is necessarily perceptual/distributional, not analytic.

---

## 1. The cross-stack pair

Both stacks roll the SAME trained checkpoint
(`tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors`) forward
from the canonical seed for 1000 steps, capturing RGBA every 50 steps → 21
frames.

| Stack | Capture | Build | Fire-mask RNG |
|---|---|---|---|
| Stack-D (PyTorch / CPU) | `captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.{h5,json}` | `pytorch` / `cpu` | `torch.rand` |
| Stack-B (WGSL / WebGPU) | `captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.{h5,json}` | `wgsl` / `wgpu-native-vulkan` | stateless PCG hash |

The checkpoint is identical (the converted WGSL artifact is bit-identical to the
`.safetensors` weights — round-trip tested). The two stacks diverge for **two**
reasons: (a) different f32 conv-reduction order (GPU vs CPU), and (b) a
**different stochastic fire-mask RNG** (`torch.rand` vs the WGSL PCG). (b)
dominates: the per-cell asynchronous update fires on different cells each step, so
the trajectories diverge per-pixel even though both converge to the same target
pattern. This is exactly why the gate is statistical.

## 2. Method — render-similarity (direct metric import)

The gate imports the task-2 metric module directly
(`from render_similarity import psnr, ssim, lpips`), composites each capture's
premultiplied RGBA to display RGB (`1 - α + rgb`), pairs frames by step index,
computes per-frame PSNR/SSIM/LPIPS(alex), and asserts the **mean over the 20
non-seed frame pairs** against `[render_similarity.continuous-ca.neural-ca]` in
`tools/testkit/equivalence/tolerance.toml`. (The step-0 seed frame is identical
in both stacks — PSNR ∞ — and is excluded from the aggregate.) Test:
`packages/neural-ca/python/tests/test_cross_stack_equivalence.py`.

This is NOT `compare_captures` (which is bit/epsilon analytic). task-2's
`harness_mode.run` orchestrator shell is out of scope (the direct import is the
RD-2D-precedented path).

## 3. Measured + locked bounds

MEASURED (mean over the 20 non-seed frame pairs), **after the Phase-4 A6
matched-RNG fix** (`model.forward(..., step, seed)` draws the matched stateless
PCG fire mask, identical to the WGSL/oracle `pcg_fire`; the D capture regenerated):

| Metric | Measured mean | Locked bound | § 2.12 floor | Floor status |
|---|---|---|---|---|
| PSNR (dB) | 144.562 | `psnr_min = 140.0` | ≥ 28 | **PASS** |
| SSIM | 1.0000 | `ssim_min = 0.99` | ≥ 0.85 | **PASS** |
| LPIPS (alex) | 0.0000 | `lpips_max = 0.01` | ≤ 0.15 | **PASS** |

**QUALITY-CONCERN RESOLVED (Phase-4 A6).** At Stage 1c the D-path drew its fire
mask from `torch.rand` while the B-path used the WGSL/oracle `pcg_fire` hash —
incompatible PRNG streams firing different cell sets, which dragged the
pixel-wise metrics below the § 2.12 floors (then: mean PSNR 23.92 < 28, SSIM
0.824 < 0.85; LPIPS 0.0316 ≤ 0.15 already passed). The matched-RNG fix makes both
stacks consume the SAME per-cell mask, lifting PSNR 23.92 → 144.562 and SSIM
0.824 → 1.0000. The residual ~144 dB (not ∞) is the GPU-vs-CPU f32
conv-reduction order alone, so the gate stays **statistical, not bit-exact**
(spec § 2.6 learned = distributional). Root-cause + per-horizon evidence:
`docs/_audits/phase-3/neural-ca-gate14-divergence-diagnosis-20260529T120252Z.md`
(H1 RNG-divergence ≈ 100% of the original shortfall; H2 f32-chaos negligible).

## 4. Determinism context

Each stack is internally reproducible (same seed → bit-exact, per the
`inference_determinism` PBT and the WGSL/NumPy-oracle 3.5e-6 reproduction). The
cross-stack gate is the ONLY non-bit-exact comparison — and it is statistical by
design. The EFECT training-loss bound (§ spec-ref § 8) is a SEPARATE,
training-convergence characterization; it does NOT gate cross-stack equivalence.

## 5. Disposition

`within_bounds == True` against the RE-LOCKED measured bounds, and (since A6) all
three metrics CLEAR the § 2.12 floors — the original QUALITY-CONCERN flag is
RESOLVED. This file is the statistical-cross-stack-gate methodology template
inherited by task-8 (3DGS-MPM golden-render) and Phase-4 neural-rendered sims.

> **Note (A6 scope).** The matched-RNG fix is the **inference** fire mask only
> (`infer.run_inference`); **training** (`train.py`) still uses the ambient
> `torch.rand` stochastic mask, which is correct — stochasticity drives learning.
> The diagnosis's "task-9 / Phase-5 candidate" framing was superseded by the
> operator's Phase-4 A6 directive to land the fix.
