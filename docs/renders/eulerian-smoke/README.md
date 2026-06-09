# eulerian-smoke — render hero shot (Phase 5 sub-phase 5.4)

Canonical deterministic Cycles render of the `eulerian-smoke` sim's committed `.h5`
capture. Sim spec sheet: [`docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`](../../sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md).
Pipeline + determinism boundary: [`docs/productization/render-passes.md`](../../productization/render-passes.md).

| file | what |
|---|---|
| `hero.png` | the canonical render — CPU Cycles, seed 42, 128 samples, 512², step-0 density volume. Re-encoded chunk-free → byte-stable. |
| `metadata.json` | provenance: Blender version, Cycles config, camera/lighting, source-capture sha256, render-asset sha256 (informational), `build_id`, render step. |
| `determinism-report.json` | the determinism gate: two renders → bit-identical decoded pixel buffers (`run1_pixel_sha256 == run2_pixel_sha256`); PSNR/SSIM quality. |
| `asset-integrity.json` | the h5→VDB conversion round-trip: DoubleGrid, `max_abs = max_rel = 0.0` (bit-exact). |

Source capture: `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.h5`
(3D Taylor-Green, 128³). The rendered frame is **step 0** — the structured smoke
blob; the passive density scalar homogenises to a uniform field by step 50 (MEASURED).

Regenerate: `BIT_PHYSICS_BLENDER=/path/to/blender python tools/productization/render-passes/pipeline.py validate --sim eulerian-smoke --artifacts OUT`.
