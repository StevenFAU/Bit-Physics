# Derivation — ISF free-step unitary L2-norm preservation (golden A)

> **Canonical reference:** Chern, Knöppel, Pinkall, Schröder, Weißmann (2016),
> *"Schrödinger's Smoke,"* ACM TOG 35(4), DOI 10.1145/2897824.2925868, Alg. 2;
> Chern (2017), *Fluid Dynamics with Incompressible Schrödinger Flow*, Caltech
> PhD thesis, Alg. 1–2.

Algorithm: `isf-free-step-unitary-l2-norm`. Category: `volumetric-grid`.

## 1. Statement

One free Schrödinger step multiplies every Fourier mode of the spinor
`Ψ = (ψ₁, ψ₂)` by `exp(-i·(ħΔt/2)·|k|²)` — a **unit-modulus** complex number.
Therefore `|Ψ̂_k|` is preserved per mode exactly, and by Parseval the spatial
global L2 norm `Σ|Ψ|²` is preserved exactly in exact arithmetic. In f64 the
only drift is FFT round-off; the declared machine-exact ceiling is `1e-13`
(spec `docs/sim-specs/volumetric-grid/schrodinger-smoke/spec-ref.md` § 6.4 —
"the strongest gate").

## 2. What the table pins

Three `(ħ, N, Δt)` sweep points on a seeded band-limited random unit spinor
(|k| ≤ 2 per axis, +2 bias on ψ₁, normalized). `--verify` re-runs the free
step live via `packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py`
and fails if any measured relative drift exceeds the committed ceiling. The
generation-time measured drifts (~5e-16) are recorded for provenance; the
gate is the ceiling, not the exact FP value (cross-build pocketfft ULP
variation is the documented numeric-equivalence boundary, spec § 8).

## 3. Independent-reference anchors

1. **Unitarity of the propagator**: `e^{-iHt}` for self-adjoint `H` preserves
   the L2 norm (Stone's theorem; any QM text).
2. **Thesis Alg. 2**: the split-step free integrator is exactly this
   per-mode phase multiply (Chern 2017, DOI 10.7907/Z98050N3).
3. **Parseval/Plancherel**: modulus preservation in Fourier space transfers
   to the spatial norm; independently gated by the Parseval row
   (spec § 6.4, `packages/schrodinger-smoke/tests/test_isf_invariants.py`).
