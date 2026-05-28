# Cross-stack equivalence harness

Field-by-field diff (spec § 2.6) of two captures against a per-category
tolerance table. The harness lives at
`tools/testkit/equivalence/harness.py` and exports the public surface
pinned in `docs/phases/phase-0-plan.md` § 3.3.3:
`EquivalenceVerdict`, `compare_captures()`, `load_tolerance_table()`.

## Tolerance table

`tools/testkit/equivalence/tolerance.toml` ships the spec § 2.6 default
tolerance table (`closed_form`, `reaction-diffusion`, `sph`, `mpm`,
`smoke`, `lbm`). The file is schema-validated by
`tolerance-schema.json`. Per-sim overrides may tighten or loosen the
defaults; overrides must remain within
`tools/testkit/equivalence/tolerance-budget.toml`'s caps. Block-5
INTEGRITY's Cat-X check enforces the cap; the harness itself does not.

## How it works

1. Read the LEFT manifest's `sim.name` + `sim.category`; require that the
   RIGHT manifest agrees (mismatch → `within_tolerance=False`).
2. Resolve the effective `{relative, absolute}` from the tolerance table
   (per-sim override if present, otherwise per-category default).
3. Diff every state field at every step. For each field, compute
   `max_abs_err` and `max_rel_err`. The field passes iff
   `max_abs_err <= absolute + relative * max(|right_field|)`.
4. The verdict is `within_tolerance=True` iff every field at every step
   passes.

## Tests

`tools/testkit/equivalence/tests/test_harness.py` ships three stub
stacks evaluating a quadratic on a 1D grid. Stacks A and B evaluate the
SAME polynomial through different floating-point orderings (round-off
~1e-16); stack `wrong` evaluates a polynomial with an extra `+1e-2*x`
term. Tests assert: A vs B is within tolerance; A vs wrong fails; the
tolerance table validates against its schema; a malformed table is
rejected.

## Render-similarity mode

`tools/testkit/render_similarity/` ships the **render-similarity metric
module + harness mode** that gates Phase-3 tasks 6 (NCA D↔B equivalence)
and 8 (MPM-3DGS golden render) + every subsequent neural-rendered sim.

### Public surface (consumer import path)

```python
from render_similarity import psnr, ssim, lpips, ms_ssim
```

- `psnr(a, b) -> float` — peak signal-to-noise ratio (dB). Sentinel
  `float('inf')` for identical inputs (MSE = 0).
- `ssim(a, b) -> float` — structural similarity (Wang 2004 Eq. 13) in
  `[-1, 1]`; `1.0` for identical inputs.
- `lpips(a, b, net='alex'|'vgg') -> float` — Zhang 2018 learned
  perceptual similarity via the `lpips` PyPI package; `>= 0`, `0` for
  identical inputs (within float32 floor).
- `ms_ssim(a, b) -> float` — multi-scale SSIM SHELL only; raises
  `NotImplementedError` until Phase 4 WU-C.

Input contract: `(H, W, 3)` NumPy arrays, `uint8 [0, 255]` OR
`float32 [0, 1]` (auto-detect by dtype). Shape / dtype / channel
mismatch → `ValueError`. LPIPS additionally requires `H, W >= 64`
(AlexNet max-pool cascade collapses smaller inputs).

### CLI invocation

```bash
python -m equivalence \
  --mode render-similarity \
  --left  <capture-dir-or-image-sequence> \
  --right <capture-dir-or-image-sequence> \
  --tolerance-key <e.g., continuous-ca.neural-ca>
```

The harness pairs frames by index, applies PSNR / SSIM / LPIPS per pair,
and compares against `tolerance.toml`'s `[render_similarity.<category>.<sim>]`
thresholds — `psnr_min` (dB floor), `ssim_min` ([0, 1] floor),
`lpips_max` (ceiling). Reports pass/fail per frame and aggregate.

### Tolerance-table additive section (D-SCHEMA)

The schema additively extends `tolerance-schema.json` with a top-level
`render_similarity` key (category → sim → `{psnr_min, ssim_min,
lpips_max}`); the existing `[defaults.<cat>]` / `[overrides.<sim>]`
trees are unchanged.

```toml
[render_similarity.<category>.<sim>]
psnr_min = <float>     # dB floor; spec § 2.12 quality floor = 28
ssim_min = <float>     # [0, 1] floor; spec § 2.12 quality floor = 0.85
lpips_max = <float>    # ceiling, ≥ 0; spec § 2.12 quality floor = 0.15
```

Tasks 6 (NCA D↔B) and 8 (MPM-3DGS) add per-sim rows at their dispatch;
render-similarity ships the SCHEMA only.

### Determinism (D-DET) — bit-exact / same-stack-same-hw, CPU-only LPIPS

PSNR and SSIM are pure numpy / skimage pipelines and trivially bit-exact
across runs. LPIPS is bit-exact under `model.eval()` + `torch.no_grad()`
+ CPU-only + pinned linear-head weights (R-3 sha256 assertion). See
`tools/testkit/render_similarity/tests/test_determinism.py` for the
Stage-1b measurement.

**R-4 cross-hardware caveat:** a consumer running LPIPS on **GPU** will
diverge from the CI CPU value (different reduction order). The
determinism *gate* is the CPU value; sim consumers may run LPIPS on GPU
for performance but the equivalence comparison uses CPU values.

### Weights handling (D-WEIGHTS)

The bundled lpips v0.1 linear-head weights (`<lpips>/weights/v0.1/<net>.pth`,
~6-11 KB) ship inside the `lpips==0.1.4` wheel and are sha256-asserted on
first call (R-3 mitigation; mismatch → `AssertionError`). The AlexNet
(~243 MB) / VGG (~528 MB) backbone weights download via torchvision into
`~/.cache/torch/hub/checkpoints/` on first call; CI caches that path via
`actions/cache` keyed on Python + lpips version.

### Adversarial-fixture coverage

Two hand-written adversarial fixtures + meta-test at
`tools/testkit/render_similarity/tests/fixtures/adversarial/`:

- `ssim_false_positive/` — inverted-checkerboard pair (same global mean /
  variance; pixel-wise wildly different) that a buggy SSIM (luminance
  only) would score ~1.0; the correct skimage SSIM scores it ~0.04. The
  meta-test asserts SSIM < 0.5.
- `lpips_false_negative/` — near-identical uint8 pair (1/255 perturbation
  at a single pixel) that a buggy LPIPS (no `[0, 255]` → `[-1, 1]`
  normalization) would score driven by the 100x scale mismatch. The
  meta-test asserts LPIPS < 0.05.

The meta-test (`test_adversarial_coverage.py`) is testkit-local — NOT
under `tools/integrity/tests/fixtures/adversarial/`. The integrity
toolkit's Cat 1-5 + Cat-X semantic schema (`docs/architecture.md:720-770`)
governs golden-value numerical correctness; image-pair classification
sits outside Cat 3's scope. Both `integrity.yml` and `python-strict.yml`
trigger identically (push to main + pull_request, no path filters), so
the meta-test riding the `test-render-similarity` job under
python-strict.yml provides identical breadth/frequency coverage.
