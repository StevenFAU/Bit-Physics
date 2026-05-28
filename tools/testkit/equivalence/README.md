# equivalence — cross-stack & render-similarity harnesses

The equivalence package provides two complementary verification surfaces:

## Cross-stack equivalence (`compare_captures`)

Field-by-field numeric diff (spec § 2.6) of two captures produced by different
stacks (or the same stack at different commit hashes), against the per-category
tolerance table in `tolerance.toml`. Programmatic surface:

```python
from equivalence import EquivalenceVerdict, compare_captures, load_tolerance_table

verdict: EquivalenceVerdict = compare_captures(
    Path("left.capture/"),
    Path("right.capture/"),
)
```

The harness pulls `sim.name` + `sim.category` from each manifest, resolves the
effective `{relative, absolute}` from `tolerance.toml` (per-sim override → per-
category default), then diffs every state field at every step.
`within_tolerance=True` iff every field passes
`max_abs_err <= absolute + relative * max(|right_field|)`.

## Render-similarity mode (`python -m equivalence --mode render-similarity`)

Phase-3 task-2 / sub-phase `render-similarity` ships the metric module +
harness CLI dispatch for image-similarity gating (consumed by tasks 6 and 8).

```bash
python -m equivalence \
  --mode render-similarity \
  --left  <capture-dir-or-image-sequence> \
  --right <capture-dir-or-image-sequence> \
  --tolerance-key <e.g., continuous-ca.neural-ca>
```

Pairs frames by index, applies PSNR / SSIM / LPIPS per pair, compares against
`tolerance.toml`'s `[render_similarity.<category>.<sim>]` thresholds
(`psnr_min` floor, `ssim_min` floor, `lpips_max` ceiling). The metric
functions are independently consumable:

```python
from render_similarity import psnr, ssim, lpips

# (H, W, 3) NumPy arrays — uint8 [0, 255] OR float32 [0, 1]
# (auto-detected by dtype); LPIPS requires H, W >= 64.
score = lpips(image_a, image_b, net="alex")
```

Full documentation:
[`docs/testkit/equivalence.md`](../../../docs/testkit/equivalence.md).

## Tolerance table

`tolerance.toml` ships:

- the spec § 2.6 cross-stack defaults (`closed_form`, `reaction-diffusion`,
  `sph`, `mpm`, `smoke`, `lbm`) + per-sim overrides (one per Phase-1/2 sim);
- the Phase-3-additive render-similarity threshold tree (D-SCHEMA;
  `[render_similarity.<category>.<sim>] = {psnr_min, ssim_min, lpips_max}`).

Both are validated by `tolerance-schema.json` via `jsonschema`. Per-sim
override widening is capped by `tolerance-budget.toml` (Block-5 INTEGRITY's
Cat-X check enforces; the harness itself does not).
