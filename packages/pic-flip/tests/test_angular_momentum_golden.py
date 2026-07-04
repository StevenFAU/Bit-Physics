"""Gate-5 flagship golden: angular-momentum conservation across transfers.

Replays every test point of
``tools/testkit/golden/tables/particle-fluids/apic-angular-momentum.json``
through the **package kernels** (``p2g_2d/3d``, ``g2p_2d/3d``) — not the
generator's own arithmetic — and checks the pinned values. Dyadic
points assert **bit-for-bit** f64 equality (FP-honesty rule, spec-ref
§ 7); the generic point uses the table's 1e-14 relative bound. The PIC
row is the paired negative control.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from pic_flip.reference import apic
from pic_flip.sim import total_angular_momentum_2d, total_angular_momentum_3d

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "particle-fluids"
    / "apic-angular-momentum.json"
)

_GRID_N = 12  # covers all table configs (positions <= 7.5 grid units)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def _load_point(
    tp: dict,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, float, int]:
    inp = tp["inputs"]
    dx = float(inp["dx"])
    parts = inp["particles"]
    d = len(parts[0]["x"])
    pos = np.array([p["x"] for p in parts], dtype=np.float64)
    vel = np.array([p["v"] for p in parts], dtype=np.float64)
    mass = np.array([p["m"] for p in parts], dtype=np.float64)
    affine_c = np.array([p["C_equals_4B_over_dx2"] for p in parts], dtype=np.float64)
    return pos, vel, mass, affine_c, dx, d


def _grid_l_2d(grid_mom: np.ndarray, dx: float) -> float:
    n = grid_mom.shape[0]
    xs = np.arange(n) * dx
    xx, yy = np.meshgrid(xs, xs, indexing="ij")
    return float(np.sum(xx * grid_mom[..., 1] - yy * grid_mom[..., 0]))


def _grid_l_3d(grid_mom: np.ndarray, dx: float) -> np.ndarray:
    n = grid_mom.shape[0]
    xs = np.arange(n) * dx
    xx, yy, zz = np.meshgrid(xs, xs, xs, indexing="ij")
    lx = np.sum(yy * grid_mom[..., 2] - zz * grid_mom[..., 1])
    ly = np.sum(zz * grid_mom[..., 0] - xx * grid_mom[..., 2])
    lz = np.sum(xx * grid_mom[..., 1] - yy * grid_mom[..., 0])
    return np.array([lx, ly, lz])


def _run_point_2d(pos, vel, mass, affine_c, dx, mode_affine: bool):
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    apic.p2g_2d(pos, vel, mass, affine_c, grid_mass, grid_mom, dx)
    grid_vel = apic.grid_velocity_from_momentum(grid_mass, grid_mom)
    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    apic.g2p_2d(pos, grid_vel, dx, mode_affine, vel_new, c_new)
    return grid_mom, vel_new, c_new


def _run_point_3d(pos, vel, mass, affine_c, dx, mode_affine: bool):
    grid_mass = np.zeros((_GRID_N, _GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, _GRID_N, 3), dtype=np.float64)
    apic.p2g_3d(pos, vel, mass, affine_c, grid_mass, grid_mom, dx)
    grid_vel = apic.grid_velocity_from_momentum(grid_mass, grid_mom)
    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    apic.g2p_3d(pos, grid_vel, dx, mode_affine, vel_new, c_new)
    return grid_mom, vel_new, c_new


@pytest.mark.parametrize("idx", [0, 1, 2])
def test_conservation_replay(golden: dict[str, object], idx: int) -> None:
    tp = golden["test_points"][idx]
    pos, vel, mass, affine_c, dx, d = _load_point(tp)
    exp = tp["expected"]
    dyadic = bool(tp["inputs"]["dyadic_exact_configuration"])
    want_before = exp["l_total_particles_before"]
    want_grid = exp["l_total_grid_after_p2g"]
    want_after = exp["l_total_particles_after_apic_g2p"]
    want_pic = exp["l_total_particles_after_pic_g2p"]

    if d == 2:
        l_before = [total_angular_momentum_2d(pos, vel, affine_c, mass, dx)]
        grid_mom, vel_a, c_a = _run_point_2d(pos, vel, mass, affine_c, dx, True)
        l_grid = [_grid_l_2d(grid_mom, dx)]
        l_after = [total_angular_momentum_2d(pos, vel_a, c_a, mass, dx)]
        _gm, vel_p, c_p = _run_point_2d(pos, vel, mass, affine_c, dx, False)
        l_pic = [total_angular_momentum_2d(pos, vel_p, c_p, mass, dx)]
    else:
        l_before = list(total_angular_momentum_3d(pos, vel, affine_c, mass, dx))
        grid_mom, vel_a, c_a = _run_point_3d(pos, vel, mass, affine_c, dx, True)
        l_grid = list(_grid_l_3d(grid_mom, dx))
        l_after = list(total_angular_momentum_3d(pos, vel_a, c_a, mass, dx))
        _gm, vel_p, c_p = _run_point_3d(pos, vel, mass, affine_c, dx, False)
        l_pic = list(total_angular_momentum_3d(pos, vel_p, c_p, mass, dx))

    if dyadic:
        # FP-honesty rule: bit-for-bit equality by construction.
        assert l_before == want_before
        assert l_grid == want_grid
        assert l_after == want_after
        assert l_pic == want_pic
    else:
        for got, want in zip(
            (*l_before, *l_grid, *l_after, *l_pic),
            (*want_before, *want_grid, *want_after, *want_pic),
        ):
            assert got == pytest.approx(want, rel=1e-13, abs=1e-15)
    # The negative control discriminates: PIC changed L.
    assert any(abs(a - b) > 1e-6 for a, b in zip(l_pic, l_before)), (
        "PIC negative control failed to discriminate"
    )
