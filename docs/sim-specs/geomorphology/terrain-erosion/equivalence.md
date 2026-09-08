# Equivalence

The fixed 32², dt=.01, 100-step canonical runs lake, dam, settling and channel
fixtures through the production shader. The verifier reconstructs f32-rounded
initial conditions independently and advances the NumPy f64 reference.
Maximum absolute field error must be <=2e-4. Budgets use the same initial
2e-4 normalized limit. Neither bound may be widened for a failing preset.
The family cap is registered in the common equivalence tables.
