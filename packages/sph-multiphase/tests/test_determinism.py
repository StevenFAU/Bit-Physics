from __future__ import annotations

import numpy as np

from sph_multiphase.sim import compute_diagnostic_trajectory


def test_run_twice_byte_identical() -> None:
    a = compute_diagnostic_trajectory(2)
    b = compute_diagnostic_trajectory(2)
    for sa, sb in zip(a, b, strict=True):
        for key in ("position", "velocity", "phase"):
            assert np.array_equal(sa[key], sb[key])
