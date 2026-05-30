# 3dgs — Stack-E 3D-Gaussian-Splatting convention + `common-3dgs` public API

> The `common/common-3dgs/` module — a Stack-E (Python / NVIDIA Warp) common
> surface for 3D Gaussian Splatting (Kerbl et al. 2023). Introduced by Phase-3
> task-1 (sub-phase `phase-3-common-3dgs`, spec § 11.4 item 3.8). Consumed by
> task-8 (3dgs-mpm) and Phase-4 WU-C **unchanged**. Follows the shape of
> [`docs/common/warp.md`](warp.md).

## 1. Overview

A Gaussian-splat scene is a set of N anisotropic 3D Gaussians, each with a centre,
an anisotropic scale, an orientation quaternion (wxyz), an opacity, and a bank of
spherical-harmonic (SH) colour coefficients. `common-3dgs` provides:

- `GaussianSplatModel` — the scene data abstraction (Warp-array-backed) with
  Inria `.ply` load/save.
- `Camera` — view + projection construction.
- `render(...)` — a deterministic forward EWA-splatting rasterizer.
- `save_png(...)` — the rendered-RGB-image PNG writer.

It is a forward (non-differentiable) renderer; differentiable splatting,
training, `TrainingLoop`, and `PhysicsCoupling` are Phase-4 WU-C scope.

## 2. Installation + version pin

Workspace member `common/common-3dgs` (`bit-physics-common-3dgs`); deps in
`common/common-3dgs/pyproject.toml`: `bit-physics-testkit`, `numpy>=2.0`,
`warp-lang>=1.13,<2.0` (Stack-E runtime; same pin as `common-warp`),
`matplotlib>=3.8` (the PNG writer).

## 3. Public API surface (§3.2.1)

### `GaussianSplatModel`
Fields (NumPy or Warp arrays accepted; stored as Warp `float32`):

| Field | Shape | Meaning |
|---|---|---|
| `positions` | `(N, 3)` | centres in world coordinates |
| `scales` | `(N, 3)` | per-axis scales (covariance eigen-diagonal) |
| `rotations` | `(N, 4)` | unit quaternions, **wxyz** |
| `opacities` | `(N,)` | in `[0, 1]` |
| `sh_coefficients` | `(N, K, 3)` | SH coeffs per RGB channel, `K = (degree+1)²` |

`__init__` validates shapes/dtypes (raises `ValueError`). Accessors:
`num_gaussians`, `sh_degree`, `to_numpy()` (dict of NumPy fields), `len()`.

- `GaussianSplatModel.load_ply(path) -> GaussianSplatModel` (classmethod) — reads
  Inria `.ply` 3DGS scenes.
- `model.save_ply(path)` — writes the same format.

### `Camera`
Carries `view_matrix` (4×4 world→view), `projection_matrix` (4×4 view→clip),
`near`, `far`, `image_height`, `image_width`, plus derived `camera_center` and
`fov_y`. Constructor `Camera.look_at(position, target, up=(0,1,0), *, fov_y,
image_height, image_width, near=0.01, far=100.0)`.

### `render`
`render(model, camera, *, image_height=None, image_width=None,
background=(0,0,0)) -> (H, W, 3) float32` image in `[0, 1]`. Dimensions default to
the camera's. An empty model — or one whose every Gaussian is culled — returns a
background-filled image. **Deterministic given fixed inputs** (§4).

### `save_png`
`save_png(image, path) -> Path` — clamps to `[0, 1]`, quantizes to 8-bit, writes
PNG (matplotlib `imsave`). Chosen as the D-D capture-writer because no existing
common-* module exposes an RGB-array PNG writer (common-py's `plot_field_2d` is a
colormapped single-channel field plot).

## 3a. Phase-4 WU-C extensions (training / splatting / viewer / coupling)

Phase-4 WU-C (plan §4.2.C) matures `common-3dgs` from the Phase-3 introductory
surface into the infrastructure the Phase-4.3 neural-rendered sims (4.11–4.14)
consume. The Phase-3 symbols (`GaussianSplatModel`, `Camera`, `render`,
`save_png`) are imported **unchanged**; WU-C adds new modules. (§0.3: plan
§4.2.C's idealized signatures — `n_gaussians`, `Camera.fovx`, `(3,H,W)` —
describe a contract the landed Phase-3 surface never matched; the landed surface
is authoritative and is the one extended here.)

### `common_3dgs.training` — `TrainingLoop`, `TrainingHistory`

`TrainingLoop(*, model, optimizer="adam"|"sgd", lr_position, lr_color,
lr_opacity, lr_scale, lr_rotation, max_iter, densify_interval, prune_interval)`
ships the reusable optimisation-loop scaffold: `fit(*, train_views, callbacks)
-> TrainingHistory` and `step(batch) -> {"loss", "psnr"}`, with densify/prune
exposed as interval-fired callbacks. `TrainingHistory` tracks `losses`, `psnr`,
`n_gaussians`, `iter_count` (distinct from the §4.2.A autodiff `History`).

**Optimiser posture (load-bearing).** The landed `render` is a *forward* Warp
rasteriser with no differentiable tape wired. Per plan §2523 the differentiable
rasterizer is an explicit per-sim concern at the neural-rendered stages
(esp. 4.14, "try gsplat-style first; SHIFTED to FD if blocked"), **not** a WU-C
foundation deliverable. WU-C therefore ships a genuine **finite-difference
reference optimiser** over a global appearance offset (DC spherical-harmonic
colour + opacity logit) that demonstrably reduces render MSE / raises PSNR;
per-gaussian differentiable-rasterizer training is wired per-sim downstream.

### `common_3dgs.splatting` — `Camera`, `render`

Thin re-export of the landed `camera.py` / `render.py` so the `common_3dgs.splatting`
import path in the §4.2.C API contract resolves; no re-definition.

### `common_3dgs.viewer` — `render_to_image`, `launch_interactive_viewer`

`render_to_image(model, camera, output_path)` is headless + CI-gated (drives the
CPU `render` + `save_png`). `launch_interactive_viewer(model, *, initial_camera)`
is **runtime-only per spec § 7.8** (does NOT gate CI); it raises `RuntimeError`
when no interactive display (`$DISPLAY` / `$WAYLAND_DISPLAY`) is present rather
than importing a GUI toolkit at module-import time.

### `common_3dgs.coupling` — `PhysicsCoupling`

`PhysicsCoupling(model)` binds physics state to the Gaussians (one Gaussian per
primitive; `N == model.num_gaussians`):
`update_positions_from_particles`, `update_covariance_from_deformation` (PhysGaussian
Eq. (8) `Σ' = F Σ Fᵀ` via covariance reconstruction → deform → symmetric
eigendecomposition), and `update_opacity_from_density` (default Beer–Lambert
`1 - exp(-density)`). Derived independently from the cited PhysGaussian
formulation (spec § 2.4); not imported from the NON-COMMERCIAL Inria upstream.

## 4. Determinism contract (D-C)

`render` is declared **`bit-exact / same-stack-same-hw`** in
`tools/testkit/determinism/registry.toml` (`[neural-rendered.common-3dgs]`).

The projection / covariance / SH-colour preprocessing and the **stable** depth
sort run on the host in NumPy (deterministic); the per-pixel front-to-back
alpha-compositing — the rasterizer inner loop — runs in the Warp kernel
`common_3dgs._kernels.composite_splats` as a pure per-pixel gather (no atomic
scatter, no parallel reduction). On Warp's CPU backend `wp.launch` runs serially
over the launch dimension, so the image is **bit-identical run-to-run** at fixed
inputs. Stage-1b MEASURED this directly (render twice on identical inputs →
`max_abs_diff = 0.0`, identical sha256); the declaration holds, not
re-characterized.

## 5. Geometry conventions

Documented and cross-checked against the vendored Inria upstream
(`references/3DGS-reference/utils/graphics_utils.py` —
`getWorld2View2` / `getProjectionMatrix`):

- **Right-handed**, column-vector (`p_view = view @ p_world`), 4×4 row-major
  `float32`.
- The camera looks down its **+Z** axis (COLMAP / Inria convention): a point in
  front has `view-space z > 0`. The image y-axis points down.
- The renderer uses EWA splatting (Zwicker et al. 2001): the local-affine
  Jacobian of the perspective map dilates the 3D covariance into a 2D screen-space
  conic, with a `+0.3` low-pass diagonal so each splat covers ≥ ~1px.
- SH→RGB evaluation matches `references/3DGS-reference/utils/sh_utils.py`
  (`eval_sh`, constants `C0`/`C1`/…): `colour = Σ_k C_k(dir)·sh[k] + 0.5`,
  clamped ≥ 0.

## 6. `.ply` 3DGS scene format

The loader/saver speak Inria's `.ply` layout, cited from
`references/3DGS-reference/scene/gaussian_model.py`
(`construct_list_of_attributes` / `save_ply` / `load_ply`). Per vertex,
binary-little-endian `float32`:
`x y z  nx ny nz  f_dc_0..2  f_rest_0..3(K-1)-1  opacity  scale_0..2  rot_0..3`.
Inria stores `scale_* = log(scale)` and `opacity = logit(opacity)`; the loader
applies `exp` / `sigmoid`. `f_rest` is channel-major. The parser is derived
independently from this layout (spec § 2.4 symmetric-bug guard); `f_dc` /
`f_rest` map to `sh_coefficients[:, 0, :]` / `[:, 1:, :]`.

## 7. Usage

```python
import math
from common_3dgs import Camera, GaussianSplatModel, render, save_png

model = GaussianSplatModel.load_ply("scene.ply")            # or construct directly
camera = Camera.look_at((0, 0, 3), (0, 0, 0), fov_y=math.radians(50),
                        image_height=512, image_width=512)
image = render(model, camera, background=(0, 0, 0))         # (512, 512, 3) f32
save_png(image, "frame.png")
```

The `3dgs-smoke` simulator (`common/common-3dgs/examples/smoke_3dgs/sim.py`,
`just run-3dgs-smoke`) renders one frame of a small generated scene and writes a
PNG + a Layer-0 HDF5 capture.

## 8. License posture — NON-COMMERCIAL upstream

`references/3DGS-reference/` vendors the Inria gaussian-splatting source at the
§2.18-pinned SHA `54c035f7…` under the **NON-COMMERCIAL** Gaussian-Splatting
research license (`references/3DGS-reference/LICENSE.md`). The vendored source is
cited research material for independent derivation (spec § 2.4 / § 2.8), read-only
(`docs/architecture.md` Appendix D § D.8); it is **not** a redistributed
dependency. The non-commercial clause binds every downstream 3DGS consumer
(task-8, Phase-4 WU-C): no commercial use, no relicensing.

## 9. References

- Kerbl, Kopanas, Leimkühler, Drettakis (2023), *3D Gaussian Splatting for
  Real-Time Radiance Field Rendering* — `references/3DGS-reference/`.
- Zwicker, Pfister, van Baar, Gross (2001), *EWA Volume Splatting*.
- Inria upstream conventions: `references/3DGS-reference/scene/gaussian_model.py`,
  `references/3DGS-reference/utils/graphics_utils.py`,
  `references/3DGS-reference/utils/sh_utils.py`.
