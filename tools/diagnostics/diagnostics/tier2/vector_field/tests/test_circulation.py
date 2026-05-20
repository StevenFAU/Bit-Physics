"""IC-6 check_circulation tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.vector_field import check_circulation


def test_uniform_flow_around_closed_loop_is_zero() -> None:
    # u = (1, 0). Integral around any closed loop = 0.
    u = np.zeros((8, 8, 2))
    u[..., 0] = 1.0
    h = 1.0
    loop = [(1, 1), (5, 1), (5, 5), (1, 5)]
    result = check_circulation(u, h, loop, expected_value=0.0, tolerance_rel=1e-10)
    assert result.passed
    assert result.value == pytest.approx(0.0, abs=1e-12)


def test_solid_body_rotation_circulation() -> None:
    # u = (-y, x); circulation around a closed loop is 2 * area_enclosed.
    n = 21
    xs = np.linspace(-1.0, 1.0, n)
    ys = np.linspace(-1.0, 1.0, n)
    X, Y = np.meshgrid(xs, ys, indexing="ij")
    u = np.stack([-Y, X], axis=-1)
    h = 2.0 / (n - 1)
    # Closed square loop from (5,5) to (15,15) (corners), implicit
    # closing edge included. The expected continuous-limit
    # circulation is 2 * area.
    loop = [(5, 5), (15, 5), (15, 15), (5, 15)]
    edge_length = (15 - 5) * h
    expected = 2.0 * edge_length**2
    result = check_circulation(u, h, loop, expected_value=expected, tolerance_rel=0.02)
    assert result.passed


def test_no_expected_value_passes() -> None:
    u = np.zeros((4, 4, 2))
    loop = [(0, 0), (1, 0), (0, 1)]
    result = check_circulation(u, 1.0, loop, expected_value=None)
    assert result.passed
    assert result.value == 0.0


def test_loop_vertex_out_of_range_raises() -> None:
    u = np.zeros((4, 4, 2))
    with pytest.raises(ValueError, match="out of range"):
        check_circulation(u, 1.0, [(0, 0), (99, 0), (0, 99)])


def test_wrong_vertex_dim_raises() -> None:
    u = np.zeros((4, 4, 2))
    with pytest.raises(ValueError, match="dim"):
        check_circulation(u, 1.0, [(0, 0, 0), (1, 1, 1)])


def test_too_few_vertices_raises() -> None:
    u = np.zeros((4, 4, 2))
    with pytest.raises(ValueError, match="vertices"):
        check_circulation(u, 1.0, [(0, 0)])
