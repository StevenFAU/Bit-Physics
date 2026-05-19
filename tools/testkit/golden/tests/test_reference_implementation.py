"""Tests for the cubic-spline Python reference implementation.

These tests exercise the reference in isolation (without involving the
verifier), to ensure errors get surfaced at the right layer.
"""

from __future__ import annotations

import math

import pytest

from golden.reference_implementations.cubic_spline import evaluate


def test_peak_at_q_zero() -> None:
    out = evaluate({"q": 0.0, "h": 1.0})
    assert out["W"] == pytest.approx(1.0 / math.pi, abs=1e-15)
    assert out["grad_W_magnitude"] == 0.0


def test_piecewise_boundary_at_q_one() -> None:
    out = evaluate({"q": 1.0, "h": 1.0})
    assert out["W"] == pytest.approx(1.0 / (4.0 * math.pi), abs=1e-15)
    assert out["grad_W_magnitude"] == pytest.approx(3.0 / (4.0 * math.pi), abs=1e-15)


def test_compact_support_at_q_two() -> None:
    out = evaluate({"q": 2.0, "h": 1.0})
    assert out["W"] == 0.0
    assert out["grad_W_magnitude"] == 0.0


def test_kernel_is_zero_beyond_support() -> None:
    for q in (2.5, 3.0, 100.0):
        out = evaluate({"q": q, "h": 1.0})
        assert out["W"] == 0.0
        assert out["grad_W_magnitude"] == 0.0


def test_kernel_scales_as_h_to_minus_three() -> None:
    """W(q, h=2) should equal W(q, h=1) / 2^3 at the same q."""
    base = evaluate({"q": 0.3, "h": 1.0})
    scaled = evaluate({"q": 0.3, "h": 2.0})
    assert scaled["W"] == pytest.approx(base["W"] / 8.0, rel=1e-14)
    # Gradient magnitude scales as 1/h^4.
    assert scaled["grad_W_magnitude"] == pytest.approx(base["grad_W_magnitude"] / 16.0, rel=1e-14)


def test_negative_q_raises() -> None:
    with pytest.raises(ValueError):
        evaluate({"q": -0.1, "h": 1.0})


def test_non_positive_h_raises() -> None:
    with pytest.raises(ValueError):
        evaluate({"q": 0.5, "h": 0.0})
    with pytest.raises(ValueError):
        evaluate({"q": 0.5, "h": -1.0})
