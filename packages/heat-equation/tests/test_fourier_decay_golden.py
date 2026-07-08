"""Two-spectra Fourier decay goldens (spec-ref.md § 4.2, § 6.5; goldens B/C).

The FTCS run must track its own DISCRETE amplification g_h^N to FP round-off;
the spectral run must track the CONTINUOUS decay exp(-alpha*|k|^2*t) to
machine precision. The negative control asserts the two goldens genuinely
distinguish the operators: comparing FTCS against the continuous curve leaves
an O(dt) + O(dx^2) floor orders of magnitude above the discrete comparison.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from heat_equation.reference import (
    continuous_decay,
    discrete_amplification,
    fourier_mode,
    ftcs_step,
    sinsin_amplitude,
    stability_bound_dt,
)
from heat_equation.spectral import spectral_step

REPO = Path(__file__).resolve().parents[3]
TABLES = REPO / "tools/testkit/golden/tables/volumetric-grid"


def _run_ftcs_mode(
    n: int, alpha: float, dt: float, mode: tuple[int, int], steps: int
) -> float:
    dx = 1.0 / n
    t = fourier_mode(n, n, mode[0], mode[1])
    for _ in range(steps):
        t = ftcs_step(t, alpha, dt, dx, dx)
    return sinsin_amplitude(t, mode[0], mode[1])


def test_ftcs_tracks_discrete_amplification_table() -> None:
    table = json.loads((TABLES / "heat-equation-fourier-decay.json").read_text())
    for tp in table["test_points"]:
        inp = tp["inputs"]
        n, alpha, dt, steps = inp["n"], inp["alpha"], inp["dt"], inp["steps"]
        mode = tuple(inp["mode"])
        measured = _run_ftcs_mode(n, alpha, dt, mode, steps)
        want = float(tp["expected"]["discrete_amplitude"])
        rel = float(table["tolerance"]["relative"])
        scale = max(abs(want), 1e-30)
        assert abs(measured - want) <= rel * scale, (
            f"FTCS vs g_h^N at n={n} mode={mode}: {measured} != {want}"
        )
        # And the closed form in reference.py agrees with the committed table.
        g = discrete_amplification(alpha, dt, 1.0 / n, 1.0 / n, mode[0], mode[1], n, n)
        assert abs(g**steps - want) <= rel * scale


def test_spectral_tracks_continuous_decay_table() -> None:
    table = json.loads((TABLES / "heat-equation-fourier-decay.json").read_text())
    for tp in table["test_points"]:
        inp = tp["inputs"]
        n, alpha, dt, steps = inp["n"], inp["alpha"], inp["dt"], inp["steps"]
        mode = tuple(inp["mode"])
        t = fourier_mode(n, n, mode[0], mode[1])
        for _ in range(steps):
            t = spectral_step(t, alpha, dt)
        measured = sinsin_amplitude(t, mode[0], mode[1])
        want = float(tp["expected"]["continuous_amplitude"])
        scale = max(abs(want), 1e-30)
        assert abs(measured - want) <= 1e-12 * scale
        assert (
            abs(continuous_decay(alpha, mode[0], mode[1], steps * dt) - want)
            <= 1e-12 * scale
        )


def test_two_spectra_negative_control() -> None:
    """Compare an FTCS run against the WRONG (continuous) golden: the
    truncation-error floor must appear, >= 1000x the discrete-comparison
    error (the § 6.5 control that proves the goldens distinguish the two
    operators — the schrodinger Eq-17/Eq-18 lesson)."""
    n, alpha, mode, steps = 64, 0.02, (3, 2), 256
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    measured = _run_ftcs_mode(n, alpha, dt, mode, steps)
    g = discrete_amplification(alpha, dt, dx, dx, mode[0], mode[1], n, n)
    right = abs(measured - g**steps)
    wrong = abs(measured - continuous_decay(alpha, mode[0], mode[1], steps * dt))
    assert wrong >= 1000.0 * max(right, 1e-16), (
        f"two-spectra control failed: wrong-golden error {wrong:.3e} "
        f"not >> right-golden error {right:.3e}"
    )


def test_laplacian_eigenvalue_table() -> None:
    """Golden C: paired continuous/discrete eigenvalues pin the two-spectra
    convention in a committed artifact both stacks recompute."""
    from heat_equation.spectral import (
        continuous_laplacian_eigenvalues,
        discrete_laplacian_eigenvalues,
    )

    table = json.loads(
        (TABLES / "heat-equation-laplacian-eigenvalues.json").read_text()
    )
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        n = inp["n"]
        m, k = tp["inputs"]["mode"]
        lam_c = continuous_laplacian_eigenvalues(n, n)[m % n, k % n]
        lam_d = discrete_laplacian_eigenvalues(n, n)[m % n, k % n]
        want_c = float(tp["expected"]["lambda_continuous"])
        want_d = float(tp["expected"]["lambda_discrete"])
        assert abs(lam_c - want_c) <= rel * max(1.0, abs(want_c))
        assert abs(lam_d - want_d) <= rel * max(1.0, abs(want_d))


def test_spectral_decay_factor_table() -> None:
    """Golden A: per-mode machine-exact decay factors exp(-alpha*|k|^2*dt)."""
    from heat_equation.spectral import continuous_laplacian_eigenvalues, decay_factors

    table = json.loads((TABLES / "heat-equation-spectral-decay.json").read_text())
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        n, alpha, dt = inp["n"], inp["alpha"], inp["dt"]
        m, k = inp["mode"]
        lam = continuous_laplacian_eigenvalues(n, n)
        got = float(decay_factors(lam, alpha, dt)[m % n, k % n])
        want = float(tp["expected"]["decay_factor"])
        assert abs(got - want) <= rel * max(abs(want), 1e-30)


@pytest.mark.parametrize("n,mode", [(64, (1, 1)), (64, (5, 3)), (128, (2, 7))])
def test_unstable_dt_blows_up(n: int, mode: tuple[int, int]) -> None:
    """Negative control (§ 6.5): dt at 1.2x the von Neumann bound must
    amplify the Nyquist band, not decay — UNSTABLE_EXPECTED, never a pass."""
    alpha = 0.02
    dx = 1.0 / n
    dt = 1.2 * stability_bound_dt(alpha, dx, dx)
    rng = np.random.default_rng(9)
    t = fourier_mode(n, n, mode[0], mode[1]) + 0.01 * rng.standard_normal((n, n))
    pre = float(np.max(np.abs(t)))
    for _ in range(200):
        t = ftcs_step(t, alpha, dt, dx, dx)
    assert float(np.max(np.abs(t))) > 100.0 * pre
