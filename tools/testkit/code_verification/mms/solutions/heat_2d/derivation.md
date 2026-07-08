# Derivation — 2D heat-equation manufactured solution

Extends the committed `heat_1d` MMS
(`tools/testkit/code_verification/mms/solutions/heat_1d/derivation.md`) to
two dimensions per
`docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 4.4.

## Manufactured solution

With `kx = 2π/Lx`, `ky = 2π/Ly`:

```
T(x, y, t) = sin(kx·x) · sin(ky·y) · cos(t)
```

## Source derivation

The 2D heat operator with source is `T_t = α(T_xx + T_yy) + S`, so the
manufactured source is `S = T_t − α(T_xx + T_yy)`:

- `T_t   = −sin(kx·x)·sin(ky·y)·sin(t)`
- `T_xx  = −kx²·sin(kx·x)·sin(ky·y)·cos(t)`
- `T_yy  = −ky²·sin(kx·x)·sin(ky·y)·cos(t)`

```
S(x, y, t) = sin(kx·x)·sin(ky·y) · [α·(kx² + ky²)·cos(t) − sin(t)]
```

Properties (mirroring heat_1d):

1. **Periodic** on `[0,Lx]×[0,Ly]` — opposite boundaries agree to machine
   precision, so the periodic FTCS stencil needs no BC special-casing.
2. **Non-trivial source** — `T` is NOT a free solution of the unaugmented
   equation (the `−sin(t)` term never cancels `α(kx²+ky²)cos(t)` for all t),
   so the source-injection path is genuinely exercised.
3. **Separable eigenmode** — `sin(kx·x)sin(ky·y)` is an eigenvector of the
   separable 5-point discrete Laplacian, so the spatial truncation error is
   attributable entirely to the stencil symbol (the two-spectra fixture,
   golden C).

## Acceptance

Formal spatial order 2.0 (centered second differences); temporal order 1
rides at O(dx²) because the runner scales `dt ∝ dx²` at fixed CFL. Observed
L2 order must land within ±0.5 of 2.0 (`acceptance.md`, generated from the
committed sweep in `packages/heat-equation/tests/test_mms_convergence.py`).

## Scope honesty (Salari–Knupp)

MMS order testing detects ONLY coding mistakes that affect the observed
order of accuracy — same-order errors, round-off, and post-processing bugs
are not caught (spec-ref § 6.1). The machine-exact spectral gates cover the
sharper class; the sim carries both.
