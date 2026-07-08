# Derivation — heat-equation spectral per-mode decay (golden A)

> **Canonical reference:** Cox & Matthews (2002), "Exponential time
> differencing for stiff systems," *J. Comput. Phys.* 176(2):430–455,
> DOI 10.1006/jcph.2002.6995 (ETD1 / φ₁ form);
> `docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 3.2.

Algorithm: `heat-equation-spectral-per-mode-decay`. Category:
`volumetric-grid`.

## 1. Statement

On the periodic box the constant-α heat equation diagonalizes in Fourier
space: each mode obeys the scalar ODE `d/dt T̂_k = -α|k|² T̂_k + Ŝ_k` with
`|k|² = (2πm)² + (2πn)²` (unit box). The **exact** unforced one-step update
is the multiply

```
T̂_k(t+Δt) = exp(-α|k|²Δt) · T̂_k(t)
```

— machine-exact per mode, unconditionally stable: no CFL, no amplitude
error, no phase error. This is the heat analogue of schrodinger-smoke's
free-step phase golden and the sim's strongest gate.

With forcing, the exact constant-per-step update is ETD1:
`T̂ ← e^{-λΔt} T̂ + φ₁(λΔt)·Δt·Ŝ` with `φ₁(z) = (e^z - 1)/z`, i.e. the
coefficient `(1 - e^{-λΔt})/λ`, and `φ₁(0) = 1` giving the k=0 limit `Δt`
exactly (the 0/0 trap made explicit; `expm1` in the implementation keeps
full precision at small `λΔt`). The semigroup property (n steps of Δt equal
one step of nΔt for constant Ŝ) is asserted in
`packages/heat-equation/tests/test_spectral_exact.py`.

## 2. Honesty floor (recorded per table point)

The exactness claim is **absolute per unit initial amplitude**
(`|measured - expected| ≤ 1e-13 · amp(0)`). Once a mode decays below the
FFT round-off floor (~1e-16 of the field scale) a *relative* comparison
against a denormal expected value is meaningless — the deep-decay case
`(31,17), α=1` is committed precisely to document this floor.

## 3. Precision rule shared with the WGSL port (spec § 5.2)

The per-mode factors are **CPU-f64-precomputed** (`decay_factors` /
`phi1_factors`) and, for the web gate scene, committed by the build spine —
never evaluated with WGSL builtin `exp` (guaranteed only 3+2|x| ULP; the
schrodinger-smoke 63×-on-lavapipe lesson). The browser's per-mode multiply
is a pure `mul` of byte-pinned tables.

## 4. Independent-reference anchors

1. **Integrating-factor ODE solution** (ETD1 with S=0; Cox–Matthews 2002).
2. **Per-axis factorization** `exp(a+b) = exp(a)·exp(b)` asserted
   in-generator at every case (with the |a+b|-amplified rounding envelope).
3. **numpy.exp vs math.exp** agreement asserted in-generator.
4. **Empirical teeth**: `test_unconditional_stability_large_step` (dt at
   400× the FTCS bound stays exact); the two-spectra control (golden C).
