# Derivation — ISF two-spectra Laplacian eigenvalue convention (golden E)

> **Canonical reference:** Chern et al. (2016), ACM TOG 35(4), DOI
> 10.1145/2897824.2925868, Appendix E, Eqs. 17–18.

Algorithm: `isf-laplacian-eigenvalues-two-spectra`. Category:
`volumetric-grid`.

## 1. Statement (the #1 porting trap)

The paper deliberately assigns each operator its **own** Laplacian spectrum:

- **Free step** (Eq. 18, continuous): `λ(k) = -(2π)²·Σᵢ kᵢ²/Lᵢ²` — the exact
  Fourier symbol of the continuum Laplacian; anything else would make the
  "exact propagator" property false.
- **Pressure projection** (Eq. 17, discrete): `λ̃(k) = -(4/dx²)·Σᵢ sin²(π kᵢ/Nᵢ)`
  — the exact Fourier symbol of the 7-point finite-difference stencil that
  the edge-phase divergence `Σ(η̃⁺-η̃⁻)/dx²` is built from.

## 2. Why the projection MUST use Eq. 17 (telescoping exactness)

The gauge `Ψ_v ← Ψ_v e^{-iφ_v}` shifts every edge phase **exactly**:
`η̃_vw ← η̃_vw - (φ_w - φ_v)` (arg of a unit-modulus factor — no
approximation, thesis App. 1.C). The post-projection divergence is therefore
`ξ - Δ_disc φ` with `Δ_disc` the same 7-point stencil. Solving
`Δ_disc φ = ξ` by FFT requires dividing by the **stencil's** eigenvalues;
the residual then telescopes to FP-zero. Dividing by continuous `-|k|²`
solves a *different* operator and leaves an O(h²) residual — the solver
still looks right, but the machine-zero divergence gate fails. Caveat: the
telescoping holds on the principal branch only (no edge re-wraps past ±π —
guarded by `edge_phase_headroom`, spec § 3).

## 3. What the table pins

Six `(N, k)` pairs including the Nyquist axis mode (largest separation
between the two spectra: continuous `-(2π·16)² ≈ -10.1e3` vs discrete
`-4N²` at N = 32). Both stacks recompute: the f64 reference (`--verify`
checks `continuous_laplacian_eigenvalues` / `discrete_laplacian_eigenvalues`
in `packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py`) and the
web build spine (pure-JS f64 recomputation, HARD-FAIL — web spec § 6).

## 4. Independent-reference anchors

1. **Paper App. E Eqs. 17–18** — the explicit two-spectra assignment.
2. **FD symbol trig identity**: `-(2-2cos(k·dx))/dx² = -(4/dx²)sin²(k·dx/2)`,
   asserted inside the generator at every case.
3. **Fourier symbol of the continuum Laplacian** (spectral-methods standard;
   Trefethen Ch. 3) for Eq. 18.
4. **Empirical teeth**: `packages/schrodinger-smoke/tests/test_isf_invariants.py`
   `test_two_spectra_rule_is_load_bearing` shows the wrong-spectrum residual
   sits ≥ 10³× above the discrete solve on the canonical scene.
