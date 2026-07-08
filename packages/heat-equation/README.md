# heat-equation

Phase 6 — 2D transient heat diffusion, `T_t = alpha * (T_xx + T_yy) + S`, as a
**verified conduction / scalar-diffusion instrument**
(spec: `docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md`).

Two gated solver paths, both first-class:

- **FTCS explicit stencil** (`heat_equation/reference.py`) — the interactive
  default; first-order in time, second-order in space, conditionally stable
  (`r_x + r_y <= 1/2`). Gated against its own **discrete** amplification
  `g_h^N` and the 2D MMS.
- **Spectral / exponential-integrator** (`heat_equation/spectral.py`) — on the
  periodic box each Fourier mode decays by exactly `exp(-alpha*|k|^2*dt)`
  (ETD1 / phi_1 forcing, k=0 special-cased): **machine-exact per mode,
  unconditionally stable**. The analytic yardstick and the honest
  large-step solver.

Two-spectra discipline (the #1 porting trap): FTCS vs the **discrete**
eigenvalues, spectral vs the **continuous** ones — pinned by golden C
(`tools/testkit/golden/tables/volumetric-grid/heat-equation-laplacian-eigenvalues.json`).

Run the tests:

```bash
uv run --no-sync pytest packages/heat-equation/tests/
```

Generate the canonical capture (fourier-multi, 256², 1024 steps, run-twice
witnessed):

```bash
uv run --no-sync python -m heat_equation --out captures/heat-equation
```

The WebGPU product demo lives in `packages/heat-equation/web/` and is gated by
`tools/productization/web-deploy/verify.py::_gate_heat_equation`
(`new_canonical`: live f64 reference re-run + run-twice byte-identity +
machine-exact spectral/Parseval checks).
