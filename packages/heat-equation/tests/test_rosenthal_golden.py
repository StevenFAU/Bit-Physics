"""Rosenthal thin-plate (K0) moving-source golden (spec-ref.md § 4.6; golden E).

THE v0.3 dimensional-honesty gate: the sim solves the 2D heat equation, so
the steady moving-source golden is the THIN-PLATE solution

    T = T0 + q/(2*pi*lambda*g) * exp(-U*w/(2*kappa)) * K0(U*r/(2*kappa))

(w = x - U*t, r = sqrt(w^2 + y^2)). The 3D thick-plate form solves a
different equation — asserted here as the wrong-dimension counterexample.

Solver check: a finite Gaussian spot moves at constant U across a periodic
box until quasi-steady in the moving frame; probes on an annulus EXCLUDING
the source core (where K0 is log-singular and the finite spot legitimately
differs). Labeled non-validation: golden of the idealized equation.
Tolerance is measured-then-declared (transient + finite-spot + wrap
effects), with a convergence assertion on the probe-annulus error.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from heat_equation.reference import (
    ftcs_step,
    grid_coords,
    rosenthal_thin_plate,
    stability_bound_dt,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO
    / "tools/testkit/golden/tables/volumetric-grid/heat-equation-rosenthal-thin-plate.json"
)

# Nondimensional scene: conductivity = diffusivity (rho*cp = 1), thickness 1.
KAPPA = 0.005
SPEED = 1.0
Q = 1.0
COND = KAPPA  # rho*cp = 1 => lambda = kappa
THICK = 1.0


def test_golden_table_matches_reference_function() -> None:
    table = json.loads(TABLE.read_text())
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        got = float(
            rosenthal_thin_plate(
                np.array([inp["w"]]),
                np.array([inp["y"]]),
                q=inp["q"],
                conductivity=inp["conductivity"],
                thickness=inp["thickness"],
                speed=inp["speed"],
                kappa=inp["kappa"],
                t0=inp["t0"],
            )[0]
        )
        want = float(tp["expected"]["temperature"])
        assert abs(got - want) <= rel * max(abs(want), 1e-12), (inp, got, want)


def test_3d_thick_plate_is_wrong_dimension() -> None:
    """The 3D form T0 + P/(2*pi*lambda*R)*exp(-U(R+w)/2k) does NOT satisfy the
    2D moving-frame steady equation kappa*(T_ww + T_yy) + U*T_w = 0; the
    thin-plate K0 form does (checked by high-order finite differences away
    from the source). This pins the § 4.6 correction as an executable fact."""

    def residual(f, w0: float, y0: float, h: float = 1e-4) -> float:
        def t(w, y):
            return f(np.array([w]), np.array([y]))[0]

        t_ww = (t(w0 + h, y0) - 2 * t(w0, y0) + t(w0 - h, y0)) / h**2
        t_yy = (t(w0, y0 + h) - 2 * t(w0, y0) + t(w0, y0 - h)) / h**2
        t_w = (t(w0 + h, y0) - t(w0 - h, y0)) / (2 * h)
        return KAPPA * (t_ww + t_yy) + SPEED * t_w

    def thin(w, y):
        return rosenthal_thin_plate(w, y, Q, COND, THICK, SPEED, KAPPA)

    def thick3d(w, y):
        r = np.hypot(w, y)
        return Q / (2.0 * np.pi * COND * r) * np.exp(-SPEED * (r + w) / (2.0 * KAPPA))

    probes = [(-0.03, 0.01), (0.005, 0.02), (-0.06, 0.03)]
    for w0, y0 in probes:
        scale = abs(float(thin(np.array([w0]), np.array([y0]))[0])) + 1e-12
        res_thin = abs(residual(thin, w0, y0)) / scale
        scale3 = abs(float(thick3d(np.array([w0]), np.array([y0]))[0])) + 1e-12
        res_thick = abs(residual(thick3d, w0, y0)) / scale3
        assert res_thin <= 1e-2, f"thin-plate residual {res_thin:.3e} at {(w0, y0)}"
        assert res_thick >= 100.0 * max(res_thin, 1e-9), (
            f"3D form unexpectedly satisfies the 2D equation at {(w0, y0)}"
        )


SIGMA_SPOT = 0.005  # physical spot width (fixed across grids)
T_END = 0.6
X_START = 0.15


def _moving_source_band_errors(n: int) -> tuple[float, float]:
    """Run the moving-Gaussian-spot scene; return max relative error vs the
    thin-plate golden on two probe bands r in [0.03, 0.04] and [0.04, 0.05]
    (both outside the source core, where the K0 singularity and the finite
    spot legitimately differ)."""
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(KAPPA, dx, dx)
    steps = int(np.ceil(T_END / dt))
    dt = T_END / steps
    x, y = grid_coords(n, n)
    y0 = 0.5
    t_field = np.zeros((n, n))
    for i in range(steps):
        cx = X_START + SPEED * i * dt
        src = (Q / (2.0 * np.pi * SIGMA_SPOT * SIGMA_SPOT)) * np.exp(
            -((x - cx) ** 2 + (y - y0) ** 2) / (2.0 * SIGMA_SPOT * SIGMA_SPOT)
        )
        t_field = ftcs_step(t_field, KAPPA, dt, dx, dx, source=src)
    w = x - (X_START + SPEED * T_END)
    r = np.hypot(w, y - y0)
    exact = rosenthal_thin_plate(w, y - y0, Q, COND, THICK, SPEED, KAPPA)

    def band(r_in: float, r_out: float) -> float:
        ann = (r >= r_in) & (r <= r_out)
        return float(np.max(np.abs(t_field[ann] - exact[ann])) / np.max(exact[ann]))

    return band(0.03, 0.04), band(0.04, 0.05)


def test_moving_source_quasi_steady_matches_thin_plate() -> None:
    """Measured-then-declared (2026-07-08, see golden E derivation): the
    dominant residual is the finite-spot convolution deficit on the wake
    ridge (~ sigma^2*U/(4*kappa*r), RESOLUTION-INDEPENDENT physics, measured
    3.1e-2 inner band at N=320) — so the honesty assertions are (a) a 5e-2
    declared ceiling (1.6x measured), (b) the deficit DECAYS outward
    (band2 < band1: the point-source idealization is recovered away from the
    core), and (c) grid-independence between N=224 and N=320 (the mismatch
    is physical, not discretization — a convergence-with-N assert would be
    the WRONG test here)."""
    inner_fine, outer_fine = _moving_source_band_errors(320)
    inner_coarse, _ = _moving_source_band_errors(224)
    assert inner_fine <= 0.05, f"inner-band relative error {inner_fine:.3e} > 5e-2"
    assert outer_fine < inner_fine, (
        f"finite-spot deficit not decaying outward: {inner_fine:.3e} -> {outer_fine:.3e}"
    )
    assert abs(inner_fine - inner_coarse) <= 0.02, (
        f"annulus mismatch is grid-dependent: N=224 {inner_coarse:.3e}, N=320 {inner_fine:.3e}"
    )
