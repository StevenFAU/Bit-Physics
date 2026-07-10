# sph-multiphase — reference/browser equivalence

The equivalence projection is deliberately robust for capillary dynamics:

- exact phase id, particle count and persistent ordering;
- phase mass and total represented mass;
- phase centers of mass and total momentum;
- mean/max number-density compression;
- interface-particle count and interface-area proxy;
- finite-state, grid saturation and active limiter flags;
- small-N WGSL primitive rows against committed f64 values.

Short non-chaotic fixtures additionally compare position, velocity, number
density and interface weight pointwise. Hero presets are not pointwise gates:
coalescence and breakup are chaotic at f32 perturbation scale.

The browser capture is run twice on one adapter and must be byte identical.
Cross-device acceptance uses the declared per-observable budgets in the deploy
verifier. A final gate failure may only be fixed in code or by correcting a
documented derivation; tolerances are not widened after failure.

Independent anchors are the analytic Young–Laplace, capillary-wave and Taylor
relations plus the published Monaghan, Solenthaler–Pajarola, Wang and Akinci
equations. The f64 implementation and WGSL implementation are separately
authored; neither is treated as its own independent truth source.
