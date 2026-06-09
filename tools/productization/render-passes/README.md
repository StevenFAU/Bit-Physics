# render-passes (Phase 5 sub-phase 5.4)

Build-and-validate a deterministic Cycles render for the canonical render sim
(`eulerian-smoke`, v9 R4). See `docs/productization/render-passes.md` for the full
spec, the determinism boundary, and the § 0.3 SHIFTs.

```
# discover the render canonical (§13 render:true + committed 3D .h5 capture)
python tools/productization/render-passes/pipeline.py discover --json

# convert → VDB export (+integrity) → render ×2 → determinism/quality gate
BIT_PHYSICS_BLENDER=/path/to/blender \
  python tools/productization/render-passes/pipeline.py validate \
  --sim eulerian-smoke --artifacts OUT --json
```

- `pipeline.py` — § 5.5 API (discover / validate / results JSON).
- `convert.py` — `.h5` → render field `.npy` + asset-meta (uv/h5py).
- `blender/` — Blender-Python modules: `vdb_export` (`.npy`→OpenVDB + integrity),
  `scene_setup`, `cycles_config`, `import_asset`, `camera`, `lighting`, `render`
  (the entry Blender runs), `presets/<category>`.
- `smoke/` — fast Blender-free contract tests; the heavy gate is behind
  `BIT_PHYSICS_RENDER_BOOTSTRAP=1`.

The gate is **determinism** (two renders → bit-identical decoded pixels) +
**asset-integrity** (h5→VDB DoubleGrid round-trips the capture field bit-exactly),
NOT "it produced an image". Bootstrap § 3.8 is N/A for renders (Appendix E).
NO publish — `render-passes.yml`'s `deploy` job is gated off.
