"""IC-5 check_momentum_conservation tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.particle import check_momentum_conservation


def test_unchanged_velocities_pass() -> None:
    v = np.array([[1.0, 0.0], [-1.0, 0.0]])
    m = np.array([1.0, 1.0])
    result = check_momentum_conservation(v, v, m, tolerance_rel=0.0)
    assert result.passed


def test_internal_collision_preserves_momentum() -> None:
    # Two particles, elastic head-on collision; total momentum unchanged.
    v0 = np.array([[1.0, 0.0], [-1.0, 0.0]])
    v1 = np.array([[-1.0, 0.0], [1.0, 0.0]])  # velocities swap
    m = np.array([1.0, 1.0])
    result = check_momentum_conservation(v0, v1, m, tolerance_rel=1e-12)
    # Initial total momentum is (0, 0); final also (0, 0). Abs-diff path.
    assert result.passed


def test_drift_exceeds_tolerance_fails() -> None:
    v0 = np.array([[1.0, 0.0], [1.0, 0.0]])
    v1 = np.array([[1.0, 0.0], [2.0, 0.0]])
    m = np.array([1.0, 1.0])
    result = check_momentum_conservation(v0, v1, m, tolerance_rel=1e-3)
    assert not result.passed


def test_shape_mismatch_raises() -> None:
    with pytest.raises(ValueError, match="shape"):
        check_momentum_conservation(np.zeros((2, 2)), np.zeros((3, 2)), np.ones(2))


def test_wrong_mass_shape_raises() -> None:
    with pytest.raises(ValueError, match="masses"):
        check_momentum_conservation(np.zeros((2, 2)), np.zeros((2, 2)), np.ones(5))


def test_negative_tolerance_raises() -> None:
    with pytest.raises(ValueError, match="tolerance_rel"):
        check_momentum_conservation(
            np.zeros((2, 2)), np.zeros((2, 2)), np.ones(2), tolerance_rel=-1.0
        )
