# Derivation — eulerian-smoke-neural coupling golden (`eulerian-smoke-neural-coupling.json`)

> Gate-4 numerical golden for the smoke-density→Gaussian coupling (spec § 5.11 "3dgs-smoke").
> Three independent, source-named anchors. The forward physics is the parent
> `eulerian-smoke-stack-e` `stable_fluids_step_3d` (UNCHANGED); the NOVEL surface is the coupling.

## Anchors

1. **`anchor1-beer-lambert`** — per-voxel opacity `α = 1 − exp(−density)` (the WU-C
   `default_density_to_opacity`, `common/common-3dgs/src/common_3dgs/coupling.py:97`). Hand values:
   `d = 0 → α = 0`; `d = ln2 → α = 0.5`; `d = 5 → α = 1 − e⁻⁵ = 0.993262…`. Monotone, bounded
   `[0,1)` in exact arithmetic. Source: Beer-Lambert volume-rendering opacity.

2. **`anchor2-kerbl-compositing`** — a single centred Gaussian of opacity `a = 0.8` and DC colour
   `c = (0.6, 0.7, 0.8)` over a black background composites the centre pixel to `a·c =
   (0.48, 0.56, 0.64)`: the projected Gaussian peak is 1 at its centre, so the front-to-back
   emission-absorption result is `α_eff·c + (1−α_eff)·bg = a·c` (bg = 0). Source: Kerbl et al.
   2023 (ACM TOG 42(4)) Eq. (6). Verified against the `common-3dgs` renderer to `compositing_abs`
   (`2e-2`; render is f32 + the EWA projected-peak approximation — MEASURED to clear it).

3. **`anchor3-zero-density`** — `density ≡ 0` → every opacity `= 1 − exp(0) = 0` → the render is
   the background frame, independent of positions/colour. Source: hand-derivation (degenerate).

Tolerances: `opacity_abs = 1e-12` (Beer-Lambert, f64-exact); `compositing_abs = 2e-2` (Kerbl
render) — `tools/testkit/equivalence/tolerance.toml`
`[golden_tolerance.neural-rendered.eulerian-smoke-neural]`. The implementation
(`packages/eulerian-smoke-neural/eulerian_smoke_neural/coupling.py`) matches A1/A3 to 1e-12 and
A2 (centre pixel) to within `compositing_abs`.
