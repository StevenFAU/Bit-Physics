# Derivation — heat-equation two-spectra Laplacian eigenvalue convention (golden C)

> **Canonical reference:** von Neumann stability analysis of the 2D 5-point
> FTCS stencil + the Fourier symbol of the continuum Laplacian
> (`docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 3.2);
> the landed schrodinger-smoke precedent
> (`tools/testkit/golden/derivations/isf-laplacian-eigenvalues.md`).

Algorithm: `heat-equation-laplacian-eigenvalues-two-spectra`. Category:
`volumetric-grid`.

## 1. Statement (the #1 porting trap)

The two gated solver paths each get their **own** Laplacian spectrum:

- **Spectral solver** (continuous): `λ_c(k) = -(2π)²(m² + n²)` on the unit
  box — the exact Fourier symbol of the continuum Laplacian. The per-mode
  decay `exp(α·λ_c·Δt)` is then the machine-exact propagator (golden A).
- **FTCS solver** (discrete): `λ_h(k) = -(4/Δx²)[sin²(πm/N) + sin²(πn/N)]`
  — the exact Fourier symbol of the 5-point stencil. The amplification
  `g_h = 1 + αΔt·λ_h` and its power `g_h^N` are exact-to-FP for the
  discrete method (golden B).

## 2. Why FTCS MUST be compared against λ_h

`sin(2πm·x)sin(2πn·y)` sampled on the DFT nodes is an **eigenvector of the
separable 5-point stencil**: one FTCS step multiplies it by exactly `g_h`
(no other modes are excited; the stencil is diagonal in this basis). After
N steps the amplitude is `g_h^N` to FP round-off. Comparing the same run
against the continuous decay `exp(-α|k|²t)` instead leaks the
`O(Δt)+O(Δx²)` truncation error into what should be an exact check — the
committed `truncation_separation_rel` in golden B is that leak made a
number, and `test_two_spectra_negative_control` asserts an FTCS run sits
≥ 10³× closer to `g_h^N` than to the continuous curve.

## 3. What the table pins

Six `(N, mode)` pairs including both Nyquist extremes (axis mode `(64,0)`
at N=128 and the diagonal `(128,128)` at N=256 — the largest spectra
separations: continuous `-(2π·N/2)²` vs discrete `-8N²` at the diagonal).
Both stacks recompute: the f64 reference (`--verify` checks
`continuous_laplacian_eigenvalues` / `discrete_laplacian_eigenvalues` in
`packages/heat-equation/heat_equation/spectral.py`) and the web build spine
(pure-JS f64 recomputation, HARD-FAIL — spec § 5.6).

## 4. Independent-reference anchors

1. **FD symbol trig identity** `-(2-2cos(k·Δx))/Δx² = -(4/Δx²)sin²(k·Δx/2)`,
   asserted inside the generator at every case.
2. **Fourier symbol of the continuum Laplacian** (Trefethen, *Spectral
   Methods in MATLAB*, ch. 3).
3. **Empirical teeth**: `packages/heat-equation/tests/test_fourier_decay_golden.py`
   `test_two_spectra_negative_control` (≥ 10³× separation on a live run).
