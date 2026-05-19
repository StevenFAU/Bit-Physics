# Tier 2 — Scalar-field diagnostics

For sims where the primary state is one or more 2-D or 3-D scalar
fields (e.g. RD-2D, heat equation, Cahn-Hilliard).

## Modules

### `monotone_bounds` — `check_bounds(capture, field, lo, hi) -> BoundsReport`

For a scalar field whose PDE prescribes a bound (e.g. RD-2D's U, V in
`[0, 1]`), assert every value in every step lies in `[lo, hi]`.

```python
@dataclass(frozen=True)
class BoundsReport:
    ok: bool
    field: str
    violations: list[dict]   # {step, location, value, bound, kind: "below" | "above"}
```

At most four violations per step are recorded (the check's purpose is
to surface that a violation occurred, not to enumerate every cell).

Raises `ValueError` on `lo > hi`.

### `spectral_content` — `check_spectral_content(capture, field, cutoff_fraction, max_high_fraction) -> SpectralReport`

For a scalar field with bounded spectral support, verify the energy in
the high-wavenumber band stays below `max_high_fraction`. The band is
the set of FFT bins with `|k| / k_Nyquist > cutoff_fraction`.

`cutoff_fraction` defaults to `0.5` (upper half of |k|);
`max_high_fraction` defaults to `0.1`. Both are tunable per sim.

```python
@dataclass(frozen=True)
class SpectralReport:
    ok: bool
    field: str
    cutoff_fraction: float
    max_high_fraction: float
    per_step_high_fraction: list[tuple[int, float]]
    first_offending_step: int | None
```

Raises `ValueError` on `cutoff_fraction <= 0`, `cutoff_fraction > 1`, or
`max_high_fraction < 0`.

### `conservation` — `check_conservation(capture, field, atol, rtol) -> ConservationReport`

For a closed scalar system (e.g. mass-conserving reaction-diffusion),
verify `sum(field)` stays within tolerance of the initial step's total.
Tolerance follows `|drift| <= atol + rtol * |initial|` (matches
`numpy.isclose`).

```python
@dataclass(frozen=True)
class ConservationReport:
    ok: bool
    field: str
    initial_total: float
    max_abs_drift: float
    max_rel_drift: float
    per_step_total: list[tuple[int, float]]
    first_offending_step: int | None
```

Raises `ValueError` on negative `atol` or `rtol`.

## Composition example

```python
from diagnostics.tier2.scalar_field import (
    check_bounds, check_conservation, check_spectral_content,
)

bounds  = check_bounds(capture, "U", 0.0, 1.0)
spectra = check_spectral_content(capture, "U", cutoff_fraction=0.5,
                                 max_high_fraction=0.1)
cons    = check_conservation(capture, "U", rtol=1e-10)

assert bounds.ok and spectra.ok and cons.ok
```

## Failure modes addressed

- **Numerical blow-up** caught by `monotone_bounds` (the field
  exits its physical range) and `spectral_content` (high-wavenumber
  energy accumulates).
- **Mass / charge leak** caught by `conservation` (sum drifts).
- **Field disappears** caught by `monotone_bounds` (a sentinel lower
  bound at 0) and `conservation` (total sum drops).
