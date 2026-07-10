# Interfacial Fluid Lab

`sph-multiphase` is the verified reference and WebGPU implementation of a
two-immiscible-liquid SPH simulation. Equal-volume particles carry
phase-dependent mass; incompressibility is expressed through particle number
density so a density discontinuity does not become a false compression error.

The reference implements deterministic brute-force and cell-list neighbours,
number-density INDSPH pressure primitives, harmonic physical viscosity,
Akinci-style pairwise cohesion/curvature, capillary timestep selection, and
analytic interfacial-flow observables. The browser instrument adds interactive
phase injection, stirring, wetting, density/viscosity/tension controls,
scientific views, and phase-aware screen-space reconstruction.

```bash
uv run pytest --rootdir=packages/sph-multiphase packages/sph-multiphase/tests -q
cd packages/sph-multiphase/web && npm ci && npm run build
```

Scientific scope and limitations are declared in
`docs/sim-specs/particle-fluids/sph-multiphase/`.
