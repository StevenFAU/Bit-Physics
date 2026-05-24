"""Reference-sanity tests for the Stack-D DFSPH port (gate 5).

These exercise the Stack-D Taichi-DSL reference module directly without the
testkit's SimRunner protocol. Mirrors the Stack-B reference-sanity pattern and
pins the canonical DFSPH parameters the Stack-D port MUST commit to (matching
the Phase-1 NumPy reference's ``canonical_params``; probe § 1).

The Stack-D reference module ``sph_water_stack_d.reference.dfsph_taichi`` does
NOT exist at the failing-tests commit — collection fails with
``ModuleNotFoundError`` cleanly until Stage 1b implements the module.
"""

from __future__ import annotations

import math

from sph_water_stack_d.reference import dfsph_taichi  # type: ignore[import-not-found]


def test_canonical_params_lock_dfsph_descriptor() -> None:
    """Stack-D MUST commit to the same canonical params as the NumPy reference."""
    p = dfsph_taichi.canonical_params()
    assert float(p["h"]) == 0.05
    assert float(p["rho_0"]) == 1000.0
    assert float(p["dt"]) == 1e-3
    assert float(p["g_z"]) == -9.81
    # DFSPH inner-iteration caps pinned (P24 cause #3; determinism prerequisite).
    assert int(p["max_iter_density"]) == 50
    assert int(p["max_iter_divergence"]) == 50
    assert float(p["density_tolerance"]) == 1e-4
    assert float(p["divergence_tolerance"]) == 1e-4


def test_cubic_spline_kernel_peak_value() -> None:
    """W(q=0, h=1) equals sigma_3 = 1/pi (3D Monaghan cubic-spline peak)."""
    assert dfsph_taichi.W(0.0, 1.0) == (1.0 / math.pi)


def test_kernel_compact_support_vanishes_beyond_2h() -> None:
    """The cubic-spline kernel has compact support: W(q>=2, h) == 0."""
    assert dfsph_taichi.W(2.0, 1.0) == 0.0
    assert dfsph_taichi.W(2.5, 1.0) == 0.0
