# Interfacial Fluid Lab — browser verification contract

The live and capture paths use the same compiled WGSL passes:

1. counting-sort grid with deterministic in-cell id sort;
2. number density and INDSPH denominator;
3. phase color gradient/interface normal;
4. harmonic physical viscosity, Akinci compact cohesion, color-normal
   curvature, gravity, tool, SDF and wetting forces;
5. fixed-cap number-density pressure iteration;
6. integration and SDF safety projection.

The capture owns the shared buffers, reseeds `gate-scene` at the 5.2K tier,
runs eight fixed steps, and emits checkpoints 1/4/8. CI launches two fresh
browser contexts. The gate requires byte-identical state fields, finite
position/velocity/phase/number-density/interface arrays, exactly two phase
labels, positive number density and phase mass, a detected interface, an
unsaturated cell sort, maximum relative number-density compression <= 0.5,
and maximum speed <= 50. These startup safety bounds were declared before the
final browser run; the observed local values were 0.11465 and 2.511.

The capture is a robust-observable gate, not a cross-vendor point trajectory.
Capillary breakup is sensitive to f32 backend differences. The f64 package
independently holds kernel, pair-force, grid, discrete curvature/Young–Laplace,
Poiseuille, capillary-wave, Rayleigh–Lamb, Taylor, wetting-geometry and
determinism tests.

Rendering is outside the physics gate. The phase-aware SSFR keeps one nearest
front depth plus separate phase A/B thickness; it highlights the internal
interface but does not claim arbitrary nested refraction.
