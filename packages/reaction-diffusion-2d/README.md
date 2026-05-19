# reaction-diffusion-2d

Phase 0 Block 8 — Gray-Scott reaction-diffusion 2D integration sim.

This package proves the Phase 0 foundation works end-to-end by exercising
every gate the prior blocks established. It ships:

- A Python NumPy reference at `reaction_diffusion_2d/reference/gray_scott_numpy.py`.
- A WebGPU compute-shader implementation at `src/` (TypeScript, Stack B).
- A Python `sim` module at `reaction_diffusion_2d/sim.py` that wires the
  reference into the testkit's `SimRunner` + `SimRunnerPBT` protocols.
- The canonical capture at
  `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`
  (descriptor LOCKED per spec Appendix D § D.2.3 / plan v0.9 amendment).

## Layout

```
packages/reaction-diffusion-2d/
├── pyproject.toml
├── README.md
├── reaction_diffusion_2d/
│   ├── __init__.py
│   ├── sim.py                          # Python SimRunner wrappers
│   └── reference/
│       └── gray_scott_numpy.py         # NumPy ground truth
├── src/                                # TypeScript+WGSL WebGPU impl
└── tests/                              # pytest suite (4 classes)
```

See:
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md`
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md`
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/determinism.md`
- `tools/testkit/probes/reports/reaction-diffusion-2d.md`
