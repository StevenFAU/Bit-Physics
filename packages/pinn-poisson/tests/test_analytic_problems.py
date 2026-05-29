"""Analytic-core sanity (Stage 1a — PASSES).

These verify the *ground truth* the PINN/FD are measured against: the three
closed forms are backend-generic (numpy == torch), the source terms equal the
Laplacian of the exact solution, and the Dirichlet data is consistent. They do
NOT exercise the PINN or FD reference (those are the RED acceptance tests).
"""

from __future__ import annotations

import numpy as np
import pytest
import torch

from pinn_poisson import ANCHOR1, ANCHOR2, ANCHOR3, ANCHORS


def test_three_independent_anchors() -> None:
    """Cat-3 needs >=3 anchors; they must be distinct references."""
    assert len(ANCHORS) >= 3
    refs = {p.reference for p in ANCHORS}
    assert len(refs) == len(ANCHORS), "anchors must cite independent references"


@pytest.mark.parametrize("problem", ANCHORS, ids=[p.name for p in ANCHORS])
def test_numpy_torch_backend_agreement(problem: object) -> None:
    """The SAME closed form drives numpy (golden/FD) and torch (PINN) sides."""
    pts = np.linspace(0.05, 0.95, 7)
    gx, gy = np.meshgrid(pts, pts)
    u_np = problem.u_exact(gx, gy, np)  # type: ignore[attr-defined]
    f_np = problem.source(gx, gy, np)  # type: ignore[attr-defined]
    tx, ty = torch.from_numpy(gx), torch.from_numpy(gy)
    u_t = problem.u_exact(tx, ty, torch).numpy()  # type: ignore[attr-defined]
    f_t = problem.source(tx, ty, torch).numpy()  # type: ignore[attr-defined]
    np.testing.assert_allclose(u_np, u_t, atol=1e-12, rtol=1e-12)
    np.testing.assert_allclose(f_np, f_t, atol=1e-12, rtol=1e-12)


@pytest.mark.parametrize("problem", ANCHORS, ids=[p.name for p in ANCHORS])
def test_source_equals_laplacian(problem: object) -> None:
    """f(x,y) must equal a high-accuracy central-difference Laplacian of u_exact."""
    x0, y0 = 0.4, 0.6
    h = 1e-4
    u = lambda a, b: float(problem.u_exact(np.array(a), np.array(b), np))  # type: ignore[attr-defined]  # noqa: E731
    lap = (u(x0 + h, y0) + u(x0 - h, y0) + u(x0, y0 + h) + u(x0, y0 - h) - 4 * u(x0, y0)) / h**2
    f = float(problem.source(np.array(x0), np.array(y0), np))  # type: ignore[attr-defined]
    np.testing.assert_allclose(lap, f, atol=1e-3, rtol=1e-3)


def test_harmonic_anchors_have_zero_source() -> None:
    pts = np.linspace(0.1, 0.9, 5)
    for problem in (ANCHOR1, ANCHOR2):
        assert problem.harmonic
        np.testing.assert_allclose(problem.source(pts, pts, np), 0.0, atol=1e-14)


def test_anchor3_zero_dirichlet_bc() -> None:
    """Anchor 3 (MMS) vanishes on all four edges of the unit square."""
    s = np.linspace(0.0, 1.0, 11)
    zero, one = np.zeros_like(s), np.ones_like(s)
    edges = ((zero, s), (one, s), (s, zero), (s, one))
    for bx, by in edges:
        np.testing.assert_allclose(ANCHOR3.boundary_value(bx, by, np), 0.0, atol=1e-12)
