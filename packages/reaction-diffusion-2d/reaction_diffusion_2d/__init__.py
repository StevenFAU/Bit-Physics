"""Reaction-diffusion 2D — Phase 0 Block 8 integration sim.

Public surface:
    - `reference.gray_scott_numpy.step` and `evolve` — NumPy ground-truth
      Gray-Scott integrator.
    - `sim` — SimRunner / SimRunnerPBT wrappers used by the test suite.

The WebGPU implementation lives under `packages/reaction-diffusion-2d/src/`
(TypeScript, exercised locally with a real GPU adapter per spec § 7.8).
"""
