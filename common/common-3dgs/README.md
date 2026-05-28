# bit-physics-common-3dgs

Stack-E (Python / NVIDIA Warp) **3D-Gaussian-Splatting** common module — the
`common/common-3dgs/` workspace surface (spec § 11.4 item 3.8; phase-3-plan
§3.2.1). Introduced by Phase-3 task-1 (sub-phase `phase-3-common-3dgs`); consumed
by task-8 (3dgs-mpm) and Phase-4 WU-C **unchanged**.

## Public API (`common_3dgs`)

| Symbol | Kind | Purpose |
|---|---|---|
| `GaussianSplatModel` | class | 3DGS scene (positions / scales / rotations-wxyz / opacities / SH coefficients), Warp-array-backed. `load_ply` (classmethod) / `save_ply` (instance) speak Inria's .ply 3DGS format. |
| `Camera` | class | View + projection matrices, near/far, image dims; `look_at(...)` constructor. Conventions follow the vendored Inria upstream. |
| `render(model, camera, *, image_height, image_width, background)` | function | Deterministic forward EWA-splatting rasterizer → `(H, W, 3) float32` in `[0, 1]`. |
| `save_png(image, path)` | function | Rendered-RGB-image → PNG writer. |

## Layout

```
common/common-3dgs/
├── pyproject.toml
├── README.md
├── src/common_3dgs/        # the package (model / camera / render / image_io)
├── tests/                  # smoke-contract + property-based tests
└── examples/smoke_3dgs/    # the 3dgs-smoke simulator (just run-3dgs-smoke)
```

## Vendored reference

`references/3DGS-reference/` vendors the Inria gaussian-splatting source at the
§2.18-pinned SHA `54c035f7…` under its **NON-COMMERCIAL research license**
(`MANIFEST.toml`). It is cited research material (the .ply format + camera
conventions); the loader/renderer are derived independently (spec § 2.4). Per
`docs/architecture.md` Appendix D § D.8 the vendored source is **read-only**, and
the non-commercial clause binds every downstream 3DGS consumer.

## Determinism

`render` is `bit-exact / same-stack-same-hw` (CPU, per-pixel front-to-back gather
over a depth-sorted splat list; no atomic scatter). Declared in
`tools/testkit/determinism/registry.toml` (`[neural-rendered.common-3dgs]`).
