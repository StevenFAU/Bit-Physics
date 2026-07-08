# Derivation — Rosenthal thin-plate (K₀) moving source (golden E)

> **Canonical reference:** Rosenthal, D. (1946), "The theory of moving
> sources of heat and its application to metal treatments," *Trans. ASME*
> 68:849–866 — the **thin-plate** case. Spec:
> `docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 4.6
> (v0.3 dimensional correction). **Labeled non-validation** — golden of the
> idealized equation, not a melt-pool model.

Algorithm: `heat-equation-rosenthal-thin-plate-k0`. Category:
`volumetric-grid`.

## 1. The solution (and the dimension trap)

A line source of absorbed power `q` through plate thickness `g` moving at
speed `U` in `x`; in the moving frame (`w = x - Ut`, `r = √(w² + y²)`,
conductivity `λ`, diffusivity `κ`) the steady 2D field is

```
T = T₀ + q/(2πλg) · exp(-Uw/(2κ)) · K₀(Ur/(2κ)).
```

`K₀` is log-singular at the source; the field has a long algebraic-decay
tail behind (`e^{z}K₀(z) → √(π/2z)`) and sharp exponential decay ahead.

**The wrong-dimension counterexample (the v0.3 catch):** the better-known
thick-plate / semi-infinite form `T₀ + P/(2πλR)·exp(-U(R+w)/2κ)` solves the
**3D** heat equation. A 2D grid can never converge to it. The generator
asserts this executably: the thin-plate form's 2D moving-frame PDE residual
`κ(T_ww + T_yy) + U·T_w` is ~0 (FD-truncation scale) at every probe, while
the 3D form's residual is ≥ 100× larger. Each table point records both the
residual and the 3D form's (wrong) value at that probe.

## 2. Probe protocol (why an annulus, and what "differs" means)

Probes EXCLUDE the source core for two reasons: `K₀` diverges at `r = 0`,
and a real sim uses a **finite Gaussian spot** (σ) rather than a line
source. The dominant sim-vs-golden residual is the finite-spot convolution
deficit on the wake ridge, ≈ `σ²U/(4κr)` relative — **resolution-
independent physics**, measured 2026-07-08 at σ=0.005, κ=0.005, U=1:
3.1e-2 on the inner band r∈[0.03,0.04] (N=320), decaying outward, and
grid-independent between N=224 and N=320. The package test therefore
asserts (a) a 5e-2 declared ceiling (1.6× measured), (b) outward decay of
the deficit, and (c) grid-independence — a converge-with-N assertion would
be the WRONG test for a physical (not discretization) mismatch.

## 3. Honesty caveats (web copy must repeat)

Quasi-steady state, adiabatic faces, temperature-independent properties, no
advection/radiation/convection/phase change. Constant-property Rosenthal
mispredicts cooling rates and underestimates melt-pool length at high scan
speed (AM/LPBF regime: gradients 5–20 K/µm, cooling 1–40 K/µs — comparison
literature, DOI 10.1016/j.addma.2018.05.032).

## 4. Independent-reference anchors

1. **Abramowitz & Stegun 9.8.5/9.8.6** rational K₀ approximations —
   a scipy-independent recomputation asserted to ≤ 3e-6 relative at every
   probe (branch point z=2 covered on both sides).
2. **Far-field asymptotic** `K₀(z) ~ √(π/2z)·e^{-z}` checked at z=8.
3. **2D-PDE residual** ~0 for thin-plate / ≥100× for the 3D form (the
   executable dimension pin).
4. **Empirical teeth**: the moving-Gaussian-spot FTCS run
   (`test_moving_source_quasi_steady_matches_thin_plate`).
