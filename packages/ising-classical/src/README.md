# ising-classical — Stack-B WebGPU implementation

Local-only (spec §7.8 — Phase-3 CI excludes WebGPU-device-requiring
tests; the NumPy reference at
`ising_classical/reference/ising_numpy.py` is the CI-visible oracle).

- `metropolis.wgsl` — parallel-Metropolis compute shader. Checkerboard
  (red/black) sublattice update preserving detailed balance; PCG
  per-cell PRNG state; no atomics, no subgroup ops (preserves the
  bit-exact-same-hw determinism declaration). Lands at Stage 1b.
- `index.ts` — WebGPU runner glue wiring the kernel through
  `@bit-physics/common-ts` + capture output via `CaptureWriter`. Lands
  at Stage 1b. Produces the canonical capture
  `metropolis-128sq-T2.27-seed42-step10000.{h5,json}` on a GPU host.
