"""Gate-5 golden: APIC affine round trip (Prop 5.1, grid -> particle -> grid).

Replays ``tools/testkit/golden/tables/particle-fluids/
apic-affine-roundtrip.json`` through the package kernels. Dyadic
points: bit-for-bit reproduction of the affine field at every massed
node; generic point: 1e-14 relative. PIC control: pinned nonzero
deviation.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from pic_flip.reference import apic

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "particle-fluids"
    / "apic-affine-roundtrip.json"
)

_GRID_N = 16


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def _affine_field(v0: np.ndarray, c_mat: np.ndarray, dx: float, d: int) -> np.ndarray:
    xs = np.arange(_GRID_N) * dx
    grids = np.meshgrid(*([xs] * d), indexing="ij")
    field = np.zeros((*[_GRID_N] * d, d), dtype=np.float64)
    for a in range(d):
        field[..., a] = v0[a]
        for b in range(d):
            field[..., a] += c_mat[a, b] * grids[b]
    return field


@pytest.mark.parametrize("idx", [0, 1, 2, 3])
def test_roundtrip_replay(golden: dict[str, object], idx: int) -> None:
    tp = golden["test_points"][idx]
    inp = tp["inputs"]
    dx = float(inp["dx"])
    v0 = np.array(inp["v0"], dtype=np.float64)
    c_mat = np.array(inp["C"], dtype=np.float64)
    pos = np.array(inp["positions"], dtype=np.float64)
    mass = np.array(inp["masses"], dtype=np.float64)
    d = pos.shape[1]
    dyadic = bool(inp["dyadic_exact_configuration"])
    field = _affine_field(v0, c_mat, dx, d)

    vel_p = np.empty_like(pos)
    c_p = np.empty((pos.shape[0], d, d), dtype=np.float64)
    if d == 2:
        apic.g2p_2d(pos, field, dx, True, vel_p, c_p)
    else:
        apic.g2p_3d(pos, field, dx, True, vel_p, c_p)

    # G2P reconstruction is exact: v_p == v0 + C x_p and C_p == C.
    want_vp = v0 + pos @ c_mat.T
    if dyadic:
        assert np.array_equal(vel_p, want_vp)
        assert all(np.array_equal(c_p[k], c_mat) for k in range(pos.shape[0]))
    else:
        assert vel_p == pytest.approx(want_vp, rel=1e-13)
        for k in range(pos.shape[0]):
            assert c_p[k] == pytest.approx(c_mat, rel=1e-13)

    # P2G back: massed nodes reproduce the affine field.
    grid_mass = np.zeros((_GRID_N,) * d, dtype=np.float64)
    grid_mom = np.zeros((*[_GRID_N] * d, d), dtype=np.float64)
    if d == 2:
        apic.p2g_2d(pos, vel_p, mass, c_p, grid_mass, grid_mom, dx)
    else:
        apic.p2g_3d(pos, vel_p, mass, c_p, grid_mass, grid_mom, dx)
    recon = apic.grid_velocity_from_momentum(grid_mass, grid_mom)
    massed = grid_mass > 0.0
    assert int(np.sum(massed)) == int(tp["expected"]["n_massed_nodes_checked"])
    if dyadic:
        assert np.array_equal(recon[massed], field[massed])
    else:
        assert recon[massed] == pytest.approx(field[massed], rel=1e-13, abs=1e-15)

    # Table spot value.
    node = tuple(tp["expected"]["sample_node"])
    assert list(recon[node]) == pytest.approx(
        tp["expected"]["sample_node_velocity"], rel=1e-13, abs=1e-16
    )

    # PIC negative control: dropping B breaks the reproduction.
    zero_c = np.zeros_like(c_p)
    vel_pic = np.empty_like(pos)
    grid_mass[...] = 0.0
    grid_mom[...] = 0.0
    if d == 2:
        apic.g2p_2d(pos, field, dx, False, vel_pic, zero_c)
        apic.p2g_2d(pos, vel_pic, mass, zero_c, grid_mass, grid_mom, dx)
    else:
        apic.g2p_3d(pos, field, dx, False, vel_pic, zero_c)
        apic.p2g_3d(pos, vel_pic, mass, zero_c, grid_mass, grid_mom, dx)
    recon_pic = apic.grid_velocity_from_momentum(grid_mass, grid_mom)
    dev = float(np.max(np.abs(recon_pic[massed] - field[massed])))
    assert dev == pytest.approx(
        tp["expected"]["f64_pic_max_abs_deviation_measured"], rel=1e-12, abs=1e-15
    )
    assert dev > 1e-8
