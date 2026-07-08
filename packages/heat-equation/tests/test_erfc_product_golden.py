"""erfc / product-form bounded-block golden (spec-ref.md § 4.5; golden D).

Sign convention pinned (v0.3): the UNACCOMPLISHED ratio factorizes,
theta_2D = theta_x * theta_y; accomplished T_d = 1 - theta_x*theta_y.
Validity: uniform T_i, the same step BC on every exposed face pair, no
generation, constant properties.

The solver check runs the Dirichlet FTCS plate scene (walls stepped to
T_s = 1, interior T_i = 0) and compares interior probes against the
product-form series. The tolerance is DISCRETIZATION-bounded (measured
convergent, not machine-exact): declared from the measured N=96 error with
margin, and a two-resolution convergence assertion keeps it honest.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from heat_equation.reference import (
    erfc_semi_infinite,
    ftcs_step_dirichlet,
    product_block_accomplished,
    slab_unaccomplished,
    stability_bound_dt,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO / "tools/testkit/golden/tables/volumetric-grid/heat-equation-erfc-block.json"
)

ALPHA = 1.0


def test_golden_table_matches_reference_functions() -> None:
    table = json.loads(TABLE.read_text())
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        kind = inp["kind"]
        if kind == "erfc_semi_infinite":
            got = float(
                erfc_semi_infinite(np.array([inp["x_dimless"]]), inp["t_fourier"])[0]
            )
        elif kind == "slab_unaccomplished":
            got = float(slab_unaccomplished(np.array([inp["x_d"]]), inp["t_d"])[0])
        else:
            got = float(
                product_block_accomplished(
                    np.array([inp["x_d"]]),
                    np.array([inp["y_d"]]),
                    inp["t_dx"],
                    inp["t_dy"],
                )[0]
            )
        want = float(tp["expected"]["value"])
        assert abs(got - want) <= rel * max(abs(want), 1e-12), (kind, inp, got, want)


def _plate_error(n: int, t_d: float) -> float:
    """Max abs error of the Dirichlet plate run vs the product-form golden on
    interior probes (walls at nodes 0 and n-1; dx = 1/(n-1) so the walls sit
    exactly on the unit square's boundary; half-thickness 1/2)."""
    dx = 1.0 / (n - 1)
    half = 0.5
    t_phys = t_d * half * half / ALPHA
    dt = 0.8 * stability_bound_dt(ALPHA, dx, dx)
    steps = int(np.ceil(t_phys / dt))
    dt = t_phys / steps
    t_field = np.zeros((n, n))
    t_field[0, :] = t_field[-1, :] = t_field[:, 0] = t_field[:, -1] = 1.0
    for _ in range(steps):
        t_field = ftcs_step_dirichlet(t_field, ALPHA, dt, dx, dx, wall_value=1.0)
    idx = np.arange(n) * dx
    xd = (idx - 0.5) / half
    xg, yg = np.meshgrid(xd, xd, indexing="ij")
    exact = product_block_accomplished(xg.ravel(), yg.ravel(), t_d, t_d).reshape(n, n)
    interior = np.s_[4:-4, 4:-4]
    return float(np.max(np.abs(t_field[interior] - exact[interior])))


def test_dirichlet_plate_matches_product_form() -> None:
    """Measured-then-declared: N=96 plate vs analytic product form. The
    declared ceiling (5e-3) sits ~2x above the measured value; the
    convergence assertion (error shrinks ~4x from N=48 to N=96) proves the
    agreement is the scheme converging, not a wide gate."""
    t_d = 0.2
    err_fine = _plate_error(96, t_d)
    err_coarse = _plate_error(48, t_d)
    assert err_fine <= 5e-3, f"plate vs product-form error {err_fine:.3e} > 5e-3"
    assert err_fine <= err_coarse / 2.5, (
        f"no second-order convergence: coarse {err_coarse:.3e}, fine {err_fine:.3e}"
    )


def test_product_form_sign_convention() -> None:
    """T_d = 1 - (1-T_dx)(1-T_dy), NOT prod(T_di): at the wall (x_d = 1) the
    accomplished ratio must be 1 (wall pinned at T_s) for all t_d."""
    got = product_block_accomplished(np.array([1.0]), np.array([0.3]), 0.1, 0.1)
    assert abs(float(got[0]) - 1.0) <= 1e-9
    # The WRONG convention prod(T_di) would give ~T_dy(0.3) != 1 there.
    wrong = float(
        (
            (1.0 - slab_unaccomplished(np.array([1.0]), 0.1))
            * (1.0 - slab_unaccomplished(np.array([0.3]), 0.1))
        )[0]
    )
    assert abs(wrong - 1.0) > 0.1


def test_erfc_slab_series_agree_in_overlap() -> None:
    """The erfc similarity solution (early time) and the eigenmode series
    (late time) describe the same near-wall physics: at small t_d the slab
    series near the wall must approach the semi-infinite erfc profile."""
    t_d = 0.02
    depth = np.linspace(0.0, 0.4, 40)  # distance in from the wall, x_d units
    series = 1.0 - slab_unaccomplished(1.0 - depth, t_d, terms=400)
    semi = erfc_semi_infinite(depth, t_d)
    assert float(np.max(np.abs(series - semi))) <= 2e-3
