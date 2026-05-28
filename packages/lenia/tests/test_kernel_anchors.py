"""Stage 1a RED tests — Quad4 kernel golden anchors.

The three canonical anchors of Chakazul's Quad4 kernel
``K(r) = (4 r (1 - r))^4``:

- ``K(0)   = 0`` (compact-support boundary, NOT a peak)
- ``K(0.5) = 1`` (PEAK)
- ``K(1)   = 0`` (compact-support boundary)

Stage 1a — these tests FAIL with ``NotImplementedError`` from the
shell at ``packages/lenia/lenia/kernel.py:51``. Stage 1b implements
the closed form, all three anchors PASS within tolerance
``golden_kernel_abs=1e-6 / golden_kernel_rel=1e-5`` (per
``docs/phases/phase-3-plan.md:426-433`` § 3.2.4 pre-baked row).

Charter §1.2 + §0.3 SHIFT-from-discovered (mathematical): §6.3 prose
at ``docs/phases/phase-3-plan.md:1351`` says "kernel at r=0 (peak
K(0))" — Quad4 evaluates K(0)=0, not a peak; the peak is at r=0.5.
These tests encode the CORRECT anchors per the closed-form math; NOT
the §6.3 prose.
"""

from __future__ import annotations

import numpy as np


def _load_kernel() -> object:
    """Deferred import — Stage-1a shell raises in the function body, but the
    module imports cleanly. Stage 1b's implementation replaces the body."""
    from lenia import quad4_kernel  # type: ignore[attr-defined]

    return quad4_kernel


def test_quad4_anchor_r_zero_is_boundary() -> None:
    """K(0) = 0 (compact-support boundary, NOT a peak)."""
    quad4 = _load_kernel()
    r = np.array([0.0])
    result = quad4(r)
    np.testing.assert_allclose(result, [0.0], atol=1e-6, rtol=1e-5)


def test_quad4_anchor_r_half_is_peak() -> None:
    """K(0.5) = 1 (PEAK)."""
    quad4 = _load_kernel()
    r = np.array([0.5])
    result = quad4(r)
    np.testing.assert_allclose(result, [1.0], atol=1e-6, rtol=1e-5)


def test_quad4_anchor_r_one_is_boundary() -> None:
    """K(1) = 0 (compact-support boundary)."""
    quad4 = _load_kernel()
    r = np.array([1.0])
    result = quad4(r)
    np.testing.assert_allclose(result, [0.0], atol=1e-6, rtol=1e-5)


def test_quad4_compact_support_outside_unit_interval() -> None:
    """K(r) = 0 for r > 1 (compact support; Stage 1b masks via r<=1)."""
    quad4 = _load_kernel()
    r = np.array([1.5, 2.0, 5.0])
    result = quad4(r)
    np.testing.assert_allclose(result, [0.0, 0.0, 0.0], atol=1e-6, rtol=1e-5)


def test_quad4_three_anchor_vector() -> None:
    """All three anchors together in a single vectorized call."""
    quad4 = _load_kernel()
    r = np.array([0.0, 0.5, 1.0])
    result = quad4(r)
    np.testing.assert_allclose(result, [0.0, 1.0, 0.0], atol=1e-6, rtol=1e-5)
