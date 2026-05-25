"""Reference-sanity tests for the Stack-E Stam-Fedkiw port (gate 5).

Exercise the Stack-E NVIDIA Warp reference module directly (its NumPy-marshalling
wrappers present the Phase-1 API verbatim), pinning the canonical constants +
descriptors the Stack-E port MUST commit to (matching the Phase-1-frozen NumPy
reference: the two canonical capture descriptors, the analytic seed, the fixed
Jacobi sweep cap) and witnessing two algebraic properties of the primitives
(constant-field semi-Lagrangian invariance; divergence reduction under
pressure-projection). Mirrors the eulerian-smoke Stack-D reference-sanity pattern
(same sim; content-equivalent).

The Stack-E reference module ``eulerian_smoke_stack_e.reference`` does NOT exist
at the failing-tests commit (Stage 1a) -- collection fails with
ModuleNotFoundError cleanly until the Stage-1b implementation lands.
"""

from __future__ import annotations

import numpy as np
from eulerian_smoke_stack_e.reference import (  # type: ignore[import-not-found]
    _DEFAULT_N_JACOBI,
    CANONICAL_DESCRIPTOR_2D,
    CANONICAL_DESCRIPTOR_3D,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT_2D,
    CANONICAL_STEP_COUNT_3D,
    project_pressure,
    semi_lagrangian_advect_2d,
    semi_lagrangian_advect_3d,
)


def test_canonical_descriptors_lock() -> None:
    """Stack-E MUST commit to the Phase-1-frozen canonical descriptors (D4)."""
    assert CANONICAL_DESCRIPTOR_3D == "taylor-green-128cube-seed42-step500"
    assert CANONICAL_DESCRIPTOR_2D == "lid-driven-cavity-128sq-re100-seed42-step1000"
    assert int(CANONICAL_SEED) == 42
    assert int(CANONICAL_STEP_COUNT_3D) == 500
    assert int(CANONICAL_STEP_COUNT_2D) == 1000
    assert int(_DEFAULT_N_JACOBI) == 20


def test_constant_field_advection_is_invariant_2d() -> None:
    """Semi-Lagrangian backtrace of a constant field returns the constant.

    Bilinear interpolation is a convex combination summing to 1, so a spatially
    constant field is invariant under advection by any velocity (a maximum-
    principle witness; cross-stack-parity with the NumPy reference)."""
    n = 16
    field = np.full((n, n), 2.5, dtype=np.float64)
    rng = np.random.default_rng(0)
    u = rng.uniform(-1.0, 1.0, size=(n, n)).astype(np.float64)
    v = rng.uniform(-1.0, 1.0, size=(n, n)).astype(np.float64)
    out = semi_lagrangian_advect_2d(field, u, v, dt=0.01, dx=1.0 / n)
    assert np.allclose(out, 2.5, atol=1e-12), f"max dev = {np.max(np.abs(out - 2.5)):.3e}"


def test_constant_field_advection_is_invariant_3d() -> None:
    """Trilinear backtrace of a constant 3D field returns the constant."""
    n = 12
    field = np.full((n, n, n), -1.25, dtype=np.float64)
    rng = np.random.default_rng(1)
    u = rng.uniform(-1.0, 1.0, size=(n, n, n)).astype(np.float64)
    v = rng.uniform(-1.0, 1.0, size=(n, n, n)).astype(np.float64)
    w = rng.uniform(-1.0, 1.0, size=(n, n, n)).astype(np.float64)
    out = semi_lagrangian_advect_3d(field, u, v, w, dt=0.01, dx=1.0 / n)
    assert np.allclose(out, -1.25, atol=1e-12), f"max dev = {np.max(np.abs(out + 1.25)):.3e}"


def test_projection_reduces_divergence_2d() -> None:
    """Pressure-projection drives the discrete divergence toward the floor.

    A smooth divergent IC has its post-projection L-inf divergence reduced by
    orders of magnitude relative to the pre-projection field (the Helmholtz
    decomposition the Jacobi solver approximates)."""
    n = 32
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    two_pi = 2.0 * np.pi
    u = np.sin(two_pi * X) * np.cos(two_pi * Y)
    v = np.sin(two_pi * X) * np.sin(two_pi * Y)
    dx = 1.0 / n
    params = {"dx": dx, "dt": 0.005, "rho": 1.0}

    def _div(uu: np.ndarray, vv: np.ndarray) -> float:
        inv_2dx = 0.5 / dx
        d = (np.roll(uu, -1, axis=0) - np.roll(uu, +1, axis=0)) * inv_2dx + (
            np.roll(vv, -1, axis=1) - np.roll(vv, +1, axis=1)
        ) * inv_2dx
        return float(np.max(np.abs(d)))

    div_before = _div(u, v)
    u_p, v_p, _p = project_pressure(u, v, params, n_iter=400)
    div_after = _div(u_p, v_p)
    assert div_after < 0.05 * div_before, (
        f"projection failed to reduce divergence: before={div_before:.3e} after={div_after:.3e}"
    )
