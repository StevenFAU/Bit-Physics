# hello-physics — 2D heat diffusion smoke sim

The minimal sim that exercises every public surface of
`@bit-physics/common-ts`:

- `CaptureWriter` (HDF5 payload + manifest JSON).
- The cross-stack invariance gate (Python reads the TS-written capture).
- Determinism (same seed → byte-identical capture).

It runs without WebGPU. A finite-difference FTCS scheme on a periodic
N×N grid evolves a Gaussian initial condition; the closed-form
analytical solution (a wider Gaussian) is recovered for small
σ ≪ L.

## Run

```bash
cd common/common-ts
pnpm install
pnpm vitest run examples/hello-physics  # passes locally
```

## Layout

- `heat-equation.ts` — pure-math evolver + analytical reference.
- `run.ts` — driver that runs the sim and pipes every captured step
  into a `CaptureWriter`.
- `hello-physics.test.ts` — Vitest tests covering bit-determinism and
  agreement with the analytical Gaussian.

## What it doesn't do

No WebGPU. The Stack-B WebGPU shader path lands when a real GPU sim
ships (RD-2D in Block 8 is the first); hello-physics is the bare
floor that proves the I/O layer works.
