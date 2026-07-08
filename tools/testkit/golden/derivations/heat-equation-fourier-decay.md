# Derivation — heat-equation two-amplitude Fourier decay (golden B)

> **Canonical reference:** von Neumann analysis of 2D FTCS
> (`docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 3.1–3.2,
> § 4.2); golden C for the eigenvalue tables.

Algorithm: `heat-equation-fourier-decay-two-amplitudes`. Category:
`volumetric-grid`.

## 1. Statement

For the unforced periodic problem with IC `sin(2πm·x)sin(2πn·y)`, the table
commits BOTH amplitudes after N steps:

- `continuous_amplitude = exp(-α|k|²·NΔt)` — what the **spectral** solver
  must reproduce to machine precision (it IS the analytic solution).
- `discrete_amplitude = g_h^N`, `g_h = 1 + αΔt·λ_h` — what the **FTCS**
  solver must reproduce to FP round-off (the eigenmode is an eigenvector of
  the separable 5-point stencil, so `g_h^N` is exact *for the discrete
  method it claims to implement* — a strictly stronger check than a
  continuous-only comparison).

`truncation_separation_rel = |cont - disc|/cont` is committed per point:
the FTCS truncation error made a number. The committed cases cover the web
gate window (128², 512 steps), the canonical window (256², 1024 steps), and
the negative-control sweep case (64², 256 steps).

## 2. Stability posture

Every committed case asserts `0 < g_h < 1` in-generator (stable AND
decaying — a committed case going unstable or negative would silently turn
the golden into nonsense). The deliberate instability case
(`dt = 1.2× bound`) lives in the package tests as `UNSTABLE_EXPECTED`,
never in the table.

## 3. Independent-reference anchors

1. **Eigenvector argument** (golden C derivation § 2): one step multiplies
   the mode by exactly `g_h`.
2. **pow vs exp/log** cross-check asserted in-generator
   (`g^N` vs `exp(N·log g)`).
3. **Empirical teeth**:
   `packages/heat-equation/tests/test_fourier_decay_golden.py` runs live
   FTCS and spectral evolutions against both table columns and asserts the
   two-spectra negative control (≥ 10³× separation).
