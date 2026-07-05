# Derivation — ISF free Gaussian dispersion: exact-propagator flatline + spectral Δx collapse (golden D)

> **Canonical reference:** standard QM free-packet closed form (heat kernel at
> complex diffusivity; e.g. Sakurai, *Modern Quantum Mechanics*, § 2.5);
> Chern (2017) thesis Alg. 2 for the solver side.

Algorithm: `isf-free-gaussian-dispersion-exact-propagator`. Category:
`volumetric-grid`.

## 1. Closed form

For `∂ψ/∂t = i(ħ/2)Δψ` on ℝ³, a centred Gaussian `ψ(x,0) = Π_d exp(-(x_d-c)²/(4a))`
with `a = σ₀²` evolves as the heat kernel at complex diffusivity `D = iħ/2`:

```
ψ(x,t) = Π_d √(a/a_t) · exp(-(x_d-c)²/(4a_t)),   a_t = a + iħt/2
|ψ|² width:  σ_t² = a·(1 + (ħt/(2a))²)
```

## 2. What this golden is — and is NOT (review catch #2)

The split-step free step **is** the exact propagator `e^{-iHΔt}` (a per-mode
phase multiply), so vs this closed form the error has **no Δt dependence at
all** for band-limited data. A Δt-refinement study on step 1 alone measures
the FP floor, not an order — the pre-review "Δt-order MMS" plan was
incoherent and was re-scoped (spec § 6.1):

- **Flatline row**: over the Δt-halving ladder (2/4/8/16 steps to the same
  T) the max-abs error must stay under the 1e-13 ceiling AND within 10× of
  its own minimum (flatness itself is the check). Measured at generation:
  ~2.3e-14 across the ladder.
- **Spectral row**: under N-refinement (16/24/32/48) the band-limit
  truncation collapses **super-algebraically** — measured ~7.6e-3 → 3.1e-5 →
  1.7e-8 → 2.3e-14, i.e. gaining more than an order of magnitude per step
  and 100× on the last (the committed ceilings are 4× the measured values).
- Δt **order** lives in the full-split Richardson study
  (`packages/schrodinger-smoke/tests/test_isf_mms.py`), slope
  MEASURED-then-declared.

## 3. Fixture bounds (periodization caveat)

`σ₀ = 0.04, ħ = 0.02, T = 0.08, c = 0.5`: the ℝ³ formula is free-space but
the solver lives on 𝕋³ — the parameters keep (a) periodic images below
1e-12 at the box boundary (`σ_T ≈ 0.045 < 0.048` bound) and (b) the N = 64
spectral tail `exp(-(πNσ₀)²)` below 1e-14 of peak.

## 4. Independent-reference anchors

1. **Textbook closed form** (heat-kernel analytic continuation; Sakurai
   § 2.5 / any QM text).
2. **Spectral-accuracy theory**: Fourier interpolation of an analytic
   function converges super-algebraically (Trefethen, *Spectral Methods in
   MATLAB*, Ch. 4) — the measured N-ladder matches the `exp(-(πNσ₀)²)`
   envelope.
3. **Per-mode phase golden B** — independently pins the same multiplier
   the flatline composes
   (`tools/testkit/golden/tables/volumetric-grid/isf-free-step-phase.json`).
