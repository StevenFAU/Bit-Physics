# sph-multiphase — reference specification

## Physical system

Each particle has persistent id, position, velocity, phase, equal rest volume
`V0`, and phase mass `m_i = rho0[phase_i] V0`. Material densities and dynamic
viscosities may be discontinuous. The accepted gallery range is density and
viscosity ratio 0.1–10.

Compression is `delta_i / delta0 - 1`, where `delta_i = sum_j W_ij`; it is
independent of phase mass. The density projection is the number-density
INDSPH formulation of Wang et al. (2023), descended from the density-contrast
formulation of Solenthaler and Pajarola (2008). Surface tension uses the
Akinci et al. (2013) compact cohesion and normal-difference curvature pair,
with a resolution-specific effective coefficient. Viscosity uses a symmetric
pair operator and harmonic interfacial dynamic viscosity.

## Shipped implementations

- f64 deterministic oracle: `packages/sph-multiphase/sph_multiphase/reference/`;
- WebGPU solver: `packages/sph-multiphase/src/` and `web/src/solver.ts`;
- product: `packages/sph-multiphase/web/`;
- tests: `packages/sph-multiphase/tests/`.

## Required gates

1. Cubic, cohesion and adhesion kernel branch goldens.
2. Number-density mass independence at a sharp interface.
3. INDSPH denominator, prediction and finite-difference checks.
4. Pairwise pressure, viscosity and surface momentum conservation.
5. Cell-list and brute-force neighbour/interface equivalence.
6. Laplace, capillary-wave, capillary-timestep and Taylor relations.
7. Same-stack run-twice bit identity.
8. Browser run-twice capture, finite fields, phase preservation, bounded
   compression and unsaturated cell sort.

## Product acceptance

The product ships at least ten seeded presets; phase injection/stamping,
stirring, suction, obstacle dragging, gravity, wetting and the experimental
surface-tension-gradient tool; live Re/We/Ca/Bo/Oh, mass, compression,
interface, neighbour, iteration, timestep-limiter and GPU timing readouts;
phase/raw/scientific rendering modes; keyboard/touch support; recovery text
for missing WebGPU or device loss; deterministic URL preset state.

Adaptive quality may change particle count, render scale, filter passes or
playback speed. It must not change density, viscosity, surface tension,
pressure tolerance or iteration cap without an explicit user action.
