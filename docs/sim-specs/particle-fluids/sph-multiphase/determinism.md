# sph-multiphase — determinism declaration

The f64 reference claims bit-exact same-stack/same-hardware diagnostic replay.
Particles and unordered pairs are visited in persistent-id order; cell lists
sort ids before gathers; pressure uses fixed maximum iterations and a fixed
tolerance comparison; RNG is used only by seeded scene construction; no
parallel floating reduction or BLAS operation appears in a step.

The WebGPU gate claims same-adapter, same-browser-build run-twice byte identity.
Histogram/scatter uses integer atomics, then each cell is sorted before any
floating gather. Pressure, viscosity and surface passes are gather-style.
The live adaptive timestep is a deterministic function of declared material
parameters and measured state, never wall time.

Across GPU vendors the claim is numerical tolerance, not byte identity,
because f32 expression contraction and transcendental implementation may
differ. Optional f16 and subgroup paths are excluded from the verified path.

Device loss aborts the current replay rather than emitting a partial capture.
Capture owns the solver buffers while it runs, so the animation loop cannot
interleave work.
