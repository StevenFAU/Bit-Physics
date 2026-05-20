# Tier 2 — Vector-field diagnostics

For sims whose primary state is a vector field on a uniform Cartesian
grid (eulerian-smoke, lattice-boltzmann-d3q19, reaction-diffusion-3d
when probing gradients, MPM grid-side velocities). Four checks
exercise divergence-freeness, circulation along a loop, helicity, and
the isotropic energy spectrum.

> Status: scaffolded in Phase 1 Stage 1 per charter
> [`docs/phases/phase-1-plan.md`](../phases/phase-1-plan.md) § 3.6
> (interface contract IC-6). No Phase 0 stub existed for this
> substack; the directory is newly created.

## Source layout

| Path | Role |
|---|---|
| `tools/diagnostics/diagnostics/tier2/_types.py` | Shared `CheckResult` type (FACT) |
| `tools/diagnostics/diagnostics/tier2/vector_field/__init__.py` | Re-exports the four checks (FACT) |
| `tools/diagnostics/diagnostics/tier2/vector_field/divergence_free.py` | `check_divergence_free` (FACT) |
| `tools/diagnostics/diagnostics/tier2/vector_field/circulation.py` | `check_circulation` (FACT) |
| `tools/diagnostics/diagnostics/tier2/vector_field/helicity.py` | `check_helicity` (FACT) |
| `tools/diagnostics/diagnostics/tier2/vector_field/energy_spectrum.py` | `check_energy_spectrum` (FACT) |
| `tools/diagnostics/diagnostics/tier2/vector_field/tests/` | Synthetic-fixture pytest suite (FACT — 24 tests pass) |

## Velocity-field conventions

Shape: `(*grid_shape, D)` with `D == len(grid_shape)`.

| Field | Shape | Components |
|---|---|---|
| 2D | `(Nx, Ny, 2)` | `(u_x, u_y)` |
| 3D | `(Nx, Ny, Nz, 3)` | `(u_x, u_y, u_z)` |

Grid spacing accepts either a scalar (isotropic) or a length-`D`
sequence.

## Checks

### `divergence_free` — `check_divergence_free(velocity_field, grid_spacing, tolerance_abs=1e-6) -> CheckResult`

Second-order central differences on the interior of the grid;
boundary cells excluded. `passed` iff the maximum absolute
divergence on the interior stays at or below `tolerance_abs`.

### `circulation` — `check_circulation(velocity_field, grid_spacing, loop_specification, expected_value=None, tolerance_rel=1e-3) -> CheckResult`

`loop_specification` is a sequence of grid-index vertices. The loop
is closed implicitly (last → first). For each edge the contribution
is midpoint-rule `u · dl` (velocity averaged at endpoints dotted with
the physical-space edge vector). `expected_value=None` is
diagnostic-only (always-pass; surfaces measured value).

### `helicity` — `check_helicity(velocity_field, grid_spacing, expected_value=None, tolerance_rel=1e-3) -> CheckResult`

**3D-only.** Computes `∫ u · (∇ × u) dV` via central-difference curl
on the interior and midpoint-rule volume integration. `expected_value=None`
is diagnostic-only.

### `energy_spectrum` — `check_energy_spectrum(velocity_field, grid_spacing, expected_slope=None, fit_range=None, tolerance_slope=0.2) -> CheckResult`

Isotropic radial power spectrum: FFT each component, sum
`0.5 |u_hat_d|²` into integer-radius shells. If `expected_slope` is
supplied, fits `log E` vs `log k` on `fit_range` (auto-selects the
25%–75% percentile of non-zero bins if `None`) and asserts the slope
agrees within `tolerance_slope`.

INFERENCE: the radial binning is integer-coarse and the FFT is not
windowed; this is an adequate "shape-detection" implementation for
Phase 1 but Phase 2+ sims that need precise slope fits (e.g.
eulerian-smoke for the inertial range, LBM for spectral validation)
should supply explicit `fit_range` and may want a Hann-windowed
spectrum. Tracked as a per-sim implementation-phase concern.

## Dependencies (Phase 1 Stage 1)

| Name | Version | Rationale (spec § 9.2) | Provenance |
|---|---|---|---|
| `numpy` | ≥ 2.0 | Array operations, central differences, FFT | Inherited from `tools/diagnostics/pyproject.toml` (FACT) |
| `pytest` | ≥ 8.0 | Test runner | Inherited dev dep (FACT) |

No new dependencies introduced.

## Verification posture (Roy 2005)

- **Code verification:** synthetic fixtures with analytic ground
  truth — solid-body rotation `u = (-y, x)` is divergence-free and
  has circulation `2A` around any loop enclosing area `A`; uniform
  flow has zero circulation around a closed loop; shear field
  `u = (z, 0, 0)` has helicity zero; single-mode sinusoid produces a
  spectrum peaked at one wavenumber bin. 24 tests; all pass on
  Stage 1 commit.

## Stage 1 commit-time test outcome (FACT)

```
============================== 24 passed in 0.19s ==============================
```

## Consumers (forward-looking)

Consumed by Phase 1 Stage 2's `reaction-diffusion-3d` (gradient
checks via velocity field formed from `∇U`), `eulerian-smoke`,
`lattice-boltzmann-d3q19`, and `mpm-multimaterial` (grid-side
velocities) failing-test suites per charter § 7.6–§ 7.10.
