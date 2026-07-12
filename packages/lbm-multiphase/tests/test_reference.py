"""NORMATIVE kernel invariants: conservation, equilibrium table, wetting
walls, dtype preservation (spec § 6; PBT-adjacent deterministic checks)."""

import json
from pathlib import Path

import numpy as np

from lbm_multiphase.goldens import feq_shifted
from lbm_multiphase.reference import (
    CX,
    CY,
    OPP,
    W,
    MultiphaseScene,
    build_psi_lut,
    droplet_ic,
    load_psi_lut,
    psi_from_lut,
    run_scene,
)

REPO = Path(__file__).resolve().parents[3]
TABLES = REPO / "tools" / "testkit" / "golden" / "tables" / "lattice"


def test_d2q9_constants():
    assert float(W.sum()) == 1.0
    assert (W[OPP] == W).all()
    assert (CX[OPP] == -CX).all()
    assert (CY[OPP] == -CY).all()
    # lattice-weight isotropy: sum w c c = cs^2 I (the § 3.3 convention)
    assert abs(float((W * CX * CX).sum()) - 1.0 / 3.0) < 1e-15
    assert abs(float((W * CY * CY).sum()) - 1.0 / 3.0) < 1e-15
    assert abs(float((W * CX * CY).sum())) < 1e-15


def test_equilibrium_matches_committed_table():
    table = json.loads((TABLES / "d2q9-equilibrium.json").read_text())
    for tp in table["test_points"]:
        rho = tp["inputs"]["rho"]
        ux, uy = tp["inputs"]["u"]
        got = feq_shifted(rho, ux, uy)
        want = tp["expected"]["f_eq_shifted"]
        assert np.allclose(got, want, rtol=0, atol=1e-15)
        f = np.array(got) + W
        assert abs(float(f.sum()) - rho) < 1e-14
        assert abs(float((f * CX).sum()) - rho * ux) < 1e-14
        assert abs(float((f * CY).sum()) - rho * uy) < 1e-14


def _mass(scene: MultiphaseScene, steps: int) -> tuple[float, float]:
    from dataclasses import replace

    sc = replace(scene, steps=steps, checkpoints=(steps,))
    res = run_scene(sc)
    rho = res.checkpoints[steps][0]
    solid = scene.solid if scene.solid is not None else np.zeros(rho.shape, bool)
    m0 = float(scene.rho_ic[~solid].sum())
    m1 = float(rho[~solid].sum())
    return m0, m1


def test_mass_conservation_periodic():
    ic = droplet_ic(64, 64, 0.5, 2.0, 32.0, 32.0, 12.0, 12.0, 3.0)
    sc = MultiphaseScene(
        name="mass",
        nx=64,
        ny=64,
        psi_kind="exp-lut",
        g=-9.0,
        tau=1.0,
        forcing="guo",
        steps=1,
        checkpoints=(1,),
        rho_ic=ic,
    )
    m0, m1 = _mass(sc, 200)
    assert abs(m1 / m0 - 1.0) < 1e-12


def test_mass_conservation_with_walls():
    """Halfway bounce-back must conserve fluid mass exactly (wetting force
    changes momentum, never mass)."""
    nx, ny = 64, 48
    solid = np.zeros((nx, ny), bool)
    solid[:, :2] = True
    x = np.arange(nx, dtype=np.float64)[:, None]
    y = np.arange(ny, dtype=np.float64)[None, :]
    r = np.sqrt((x - 32.0) ** 2 + (y - 2.0) ** 2)
    rho = 0.4557 + (2.2494 - 0.4557) * 0.5 * (1.0 - np.tanh((r - 14.0) / 3.0))
    sc = MultiphaseScene(
        name="mass-wall",
        nx=nx,
        ny=ny,
        psi_kind="exp-lut",
        g=-9.0,
        tau=1.0,
        forcing="guo",
        steps=1,
        checkpoints=(1,),
        solid=solid,
        rho_wall=1.4,
        rho_ic=rho,
    )
    m0, m1 = _mass(sc, 300)
    assert abs(m1 / m0 - 1.0) < 1e-12


def test_dtype_preserved_and_f32_close():
    ic = droplet_ic(48, 48, 0.5, 2.0, 24.0, 24.0, 10.0, 10.0, 3.0)
    sc = MultiphaseScene(
        name="dtype",
        nx=48,
        ny=48,
        psi_kind="exp-lut",
        g=-9.0,
        tau=1.0,
        forcing="guo",
        steps=50,
        checkpoints=(50,),
        rho_ic=ic,
    )
    r64 = run_scene(sc, np.float64).checkpoints[50][0]
    r32 = run_scene(sc, np.float32).checkpoints[50][0]
    assert r64.dtype == np.float64
    assert r32.dtype == np.float32
    assert float(np.abs(r32.astype(np.float64) - r64).max()) < 1e-4


def test_psi_lut_matches_exact_exp():
    lut = load_psi_lut()
    rho = np.linspace(0.05, 5.5, 999)
    exact = np.exp(-1.0 / rho)
    got = psi_from_lut(rho, lut)
    assert float(np.abs(got - exact).max()) < 5e-7


def test_psi_lut_committed_copies_and_generator():
    # The runtime data spine and the browser copy must be byte-identical;
    # both live in git, so this pins the pair on every host.
    lut = load_psi_lut()
    web = (
        REPO / "packages" / "lbm-multiphase" / "web" / "public" / "lbm-psi-lut-f64.bin"
    )
    assert web.read_bytes() == lut.tobytes()
    # The generator must agree with the committed bytes to fp tolerance only:
    # np.exp is microarch-dependent (SIMD ULP drift), which is exactly why the
    # sha-pinned paths load the committed bytes instead of rebuilding.
    built = build_psi_lut()
    assert float(np.abs(built - lut).max()) <= 1e-15
