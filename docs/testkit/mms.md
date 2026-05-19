# MMS — Method of Manufactured Solutions

Layer-0 code verification pipeline (spec § 2.2, § 2.10). Phase 0 ships the
heat-equation-1D instance; Phase 1+ will extend the solutions library to
Poisson, advection-diffusion, Navier–Stokes incompressible, Euler, and
Gray-Scott (the last retro-fits to RD-2D).

## Pipeline shape

```
   solutions/heat_1d/solution.py        derive.py
        │  (u, S, BCs)                       │  (SymPy → S, derivation.md)
        ▼                                    ▼
   runner.py  ──(NumPy FTCS sweep)──► tests/fixtures/heat-1d-results.h5
        │                                    │
        ▼                                    ▼
   analyze.py  ──► ConvergenceResult ──► solutions/heat_1d/acceptance.md
```

The pipeline is intentionally NOT consuming the Block-1 capture format. MMS
emits analysis state (final-time field + grid) rather than simulation state;
the fixture HDF5 layout is documented in `runner.py`'s module docstring.

## Manufactured solution (heat-eq-1D)

The heat equation $u_t = D\,u_{xx} + S(x, t)$ on the periodic domain $[0, L]$
admits the manufactured solution

$$u(x, t) = \sin\!\left(\frac{2\pi x}{L}\right)\,\cos t.$$

This function is smooth, $L$-periodic by construction, and is NOT a free
solution of the unaugmented PDE (its required source has a non-trivial
amplitude). `derive.py` emits the SymPy-derived source

$$S(x, t) = \sin\!\left(\frac{2\pi x}{L}\right)\,\left[D\,(2\pi/L)^2\cos t
              \;-\;\sin t\right].$$

The committed derivation report at
`tools/testkit/code_verification/mms/solutions/heat_1d/derivation.md` is the
canonical reference; the runner does not re-derive at test time.

## Reference solver

`solvers/heat_1d_ftcs.py` is a minimal NumPy forward-time, central-space
integrator (formal temporal order 1; formal spatial order 2) with periodic
BCs via `np.roll`. CFL `dt = c · dx² / D` with `c = 0.25` keeps the temporal
truncation comfortably under the spatial truncation, so the analyzer's
observed-order fit is dominated by the spatial term.

The deliberately-broken negative-case solver at `solvers/heat_1d_broken.py`
substitutes a first-order forward difference for $u_{xx}$. Its observed
order collapses to roughly 1, which the analyzer rejects.

## Acceptance criterion

The analyzer fits observed convergence order by least squares in log-log
space against `dx`. Pass criterion (per spec § 2.2): observed L² order
within ±0.5 of the formal spatial order. The Phase-0 reference run on the
FTCS solver lands at L² order ≈ 2.00 (see
`tools/testkit/code_verification/mms/solutions/heat_1d/acceptance.md` for
the per-resolution error table).

## Tests

`tests/test_derive.py` — derive pipeline reproduces the expected source
(test (a) per Block 2 prompt).

`tests/test_eigenfunction_decay.py` — zero-source FTCS run with an
eigenfunction IC decays at the analytical rate (sanity check, test (b)).

`tests/test_convergence.py` — analyzer reports order ≈ 2 ± 0.5 on the
reference FTCS solver (test (c)).

`tests/test_broken_solver.py` — analyzer rejects the broken first-order
solver with observed order ≤ 1.5 (negative test, test (d)).

## Forward extension

A new manufactured solution is added as a single subpackage under
`solutions/`, with the same `evaluate / source_term / boundary_conditions`
shape. A new reference solver is added under `solvers/`. The runner +
analyzer stay sim-agnostic.

## CLI

- `uv run python -m code_verification.mms.derive` — regenerate
  `solutions/heat_1d/derivation.md` from the SymPy pipeline.
- `uv run python -m code_verification.mms.runner` — re-run the convergence
  sweep and re-emit the fixture HDF5.
