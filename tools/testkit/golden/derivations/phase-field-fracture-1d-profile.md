# phase-field-fracture-1d-profile — derivation

The 1D optimal damage profiles of the AT models and their regularized
crack-surface energies (Ambrosio–Tortorelli 1990 Γ-convergence; Miehe 2010
§ 2):

- AT2: `d(x) = exp(−|x|/ℓ)`, energy
  `(Gc/2) ∫ (d²/ℓ + ℓ d′²) dx = Gc` exactly.
- AT1: `d(x) = (1 − |x|/(2ℓ))²` on `|x| ≤ 2ℓ` (compact support), energy
  `(3Gc/8) ∫ (d/ℓ + ℓ d′²) dx = Gc` exactly.

The table pins the DISCRETE energies of
`phase_field_fracture.reference.surface_energy_1d` (forward-difference
gradient, midpoint sum) on `x ∈ [−20ℓ, 20ℓ]` at h ∈ {0.1, 0.05, 0.02,
0.01, 0.005}, with three genuinely independent derivation routes
(spec § 2.4):

1. **Euler–Lagrange first integral** — pointwise profile anchors
   (`d(ℓ) = 1/e` transcendental for AT2; `d(ℓ) = 1/4` exact rational and
   the exact support edge for AT1), quadrature-free.
2. **Geometric-series closed form (AT2)** — the discrete energy summed
   analytically: w-sum = `h·coth(h)`, forward-difference gradient sum =
   `2(e^−h − 1)²/(h(1 − e^−2h))`; agrees with the numeric quadrature to
   ~1e-12 (truncation O(e^−2L) ≈ 4e-18 at L = 20ℓ).
3. **Exact rational finite sum (AT1)** — the compact-support polynomial
   profile summed in `fractions.Fraction` arithmetic (every term rational
   for rational h).

Measured deviations decay ~O(h²) toward the continuum Γ-limit 1 (1.25e-3
at h = 0.1 → 3.1e-6 at h = 0.005 for AT2), witnessed monotone by the
Γ-convergence test (gate G-gamma's analytic core).

Generated 2026-07-09; no vendored upstream code.
