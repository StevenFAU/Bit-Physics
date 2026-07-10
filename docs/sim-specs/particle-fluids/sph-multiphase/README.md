# sph-multiphase — Interfacial Fluid Lab

This directory is the executable contract for the two-fluid SPH simulation.
The research synthesis that motivated it remains at
[`docs/planning/particle-fluids-multiphase-sph-spec.md`](../../../planning/particle-fluids-multiphase-sph-spec.md).

The shipped v1 represents exactly two immiscible, incompressible Newtonian
liquids and an unsampled exterior. It does not claim water/air at 1000:1,
phase change, calibrated surfactant transport, dynamic contact-angle
hysteresis, or arbitrary multilayer optical path tracing.

Evidence tiers:

- **verified primitives:** kernels, number density, neighbour equivalence,
  pressure algebra, pair momentum, analytic regime relations, deterministic
  diagnostic trajectory;
- **verified browser gate:** same-device run-twice capture, phase/count/mass
  invariants, finite state, number-density/interface diagnostics;
- **live instrument:** the same WGSL number-density, pressure, viscosity and
  surface-force passes at larger, interactive particle counts;
- **experimental:** painted Marangoni proxy and artistic adhesion mode.

See [spec-ref.md](spec-ref.md), [algebraic.md](algebraic.md),
[determinism.md](determinism.md), and [equivalence.md](equivalence.md).
