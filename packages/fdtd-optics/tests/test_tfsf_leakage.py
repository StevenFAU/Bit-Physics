"""TF/SF leakage control — empty box must show a numerically silent
scattered-field zone (spec
`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 3.5).

The incident field is injected only at the TF/SF boundary from a 1-D
auxiliary grid sharing the grid dispersion relation; with NO scatterer the
scattered-field zone must stay at the f64 round-off floor. A
dispersion-inconsistent feed (the § 3.5 trap) leaks orders of magnitude
above this gate and would poison the Mie comparison.
"""

from __future__ import annotations

from fdtd_optics.reference import GATE_SCENE, tfsf_leakage


def test_empty_box_scattered_field_is_silent() -> None:
    peak_sf, peak_inc = tfsf_leakage(GATE_SCENE, steps=500, margin=14)
    assert peak_inc > 0.99  # the Ricker actually launched (peak 1.0 at t0)
    assert peak_sf < 1e-12 * peak_inc, (
        f"TF/SF leakage {peak_sf:.3e} above 1e-12 x peak incident {peak_inc:.3e}"
    )
