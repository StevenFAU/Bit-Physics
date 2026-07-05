# Derivation — ISF per-mode free-step phase advance (golden B)

> **Canonical reference:** Chern et al. (2016), ACM TOG 35(4), DOI
> 10.1145/2897824.2925868, Alg. 2 + App. E Eq. 18.

Algorithm: `isf-free-step-per-mode-phase`. Category: `volumetric-grid`.

## 1. Statement

The free Schrödinger equation `∂ψ/∂t = i(ħ/2)Δψ` diagonalizes in Fourier:
`Δ e^{ik·x} = -|k|² e^{ik·x}`, so a single mode evolves as
`ψ̂_k(Δt) = e^{-i(ħΔt/2)|k|²}·ψ̂_k(0)` — the phase advance is **exactly**
`-(ħΔt/2)|k|²` with `|k|² = (2π)²(k₁²+k₂²+k₃²)` on the unit box (the
**continuous** Laplacian eigenvalues, paper Eq. 18; the two-spectra rule is
pinned separately by
`tools/testkit/golden/tables/volumetric-grid/isf-laplacian-eigenvalues.json`).

## 2. What the table pins

Four `(k, ħ, Δt, N)` cases with the closed-form wrapped phase committed.
`--verify` recomputes the closed form AND seeds each mode through the live
solver's `free_step` (one step, arg of the mode ratio) — the measured phase
must land within `1e-12` absolute of the table. Note the wrap: at 128³-class
grids `(ħΔt/2)|k|²` reaches tens of radians; the table stores principal-branch
values and comparisons are made mod 2π (the same mod-2π reduction the WGSL
port's f64-precomputed multiplier tables require — web spec § 1).

## 3. Independent-reference anchors

1. **Fourier diagonalization of Δ** (any spectral-methods text; Trefethen,
   *Spectral Methods in MATLAB*, Ch. 3).
2. **Paper Alg. 2 / Eq. 18** — the free step is defined as exactly this
   multiplier on the continuous spectrum.
3. **Exact-propagator corollary**: the flatline golden
   (`tools/testkit/golden/tables/volumetric-grid/isf-gaussian-dispersion.json`)
   independently witnesses that the composed multiplier has no Δt error.
