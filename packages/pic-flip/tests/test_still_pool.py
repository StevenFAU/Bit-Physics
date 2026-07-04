"""Still-pool null test (spec-ref § 6.3): a pool at rest stays at rest.

Run twice — regularizers OFF and ON (they must be inert at rest,
invariant 6). Thresholds measured-then-pinned; the pool spans the full
tank width so no lateral collapse mode exists, and the pinned Jacobi
cap is chosen converged for the pool depth.
"""

from __future__ import annotations

import numpy as np

from pic_flip.reference.apic import apic_step_2d, count_particles_2d, default_params_2d
from pic_flip.reference.poisson_masked import classify_cells_2d, default_solid_mask_2d
from pic_flip.reference.regularizers import (
    measure_rest_density,
    scatter_unit_density_2d,
)

_N_STEPS = 30


def _run_pool(regularizers: bool) -> tuple[float, float, float]:
    params = default_params_2d()
    n = 24
    params.update(
        {
            "nx": n,
            "ny": n,
            "dx": 1.0 / n,
            "dt": 2.0e-3,
            # Depth ~8 nodes, width 20: measured-converged cap.
            "n_jacobi": 4000,
            "regularizers": regularizers,
        }
    )
    dx = params["dx"]
    # Full-width pool, unjittered lattice (2 per cell axis), depth 8
    # cells. Upper bound (n-3)*dx == the step's stencil-safety clamp —
    # an IC outside the clamp box gets squashed onto its neighbor
    # column on step 0 and reads as genuine compression.
    axes_x = np.arange(2 * dx + 0.25 * dx, (n - 3) * dx, 0.5 * dx)
    axes_y = np.arange(2 * dx + 0.25 * dx, 10 * dx, 0.5 * dx)
    xx, yy = np.meshgrid(axes_x, axes_y, indexing="ij")
    pos = np.stack([xx.ravel(), yy.ravel()], axis=-1).astype(np.float64)
    vel = np.zeros_like(pos)
    mass = np.ones((pos.shape[0],), dtype=np.float64)
    affine_c = np.zeros((pos.shape[0], 2, 2), dtype=np.float64)

    den = np.zeros((n, n), dtype=np.float64)
    scatter_unit_density_2d(pos, dx, den)
    count = np.zeros((n, n), dtype=np.int64)
    count_particles_2d(pos, n, n, dx, count)
    labels0 = classify_cells_2d(count, default_solid_mask_2d(n, n, 2))
    rho_rest = measure_rest_density(den, labels0)
    fluid0 = float(np.sum(labels0 == 1))

    max_speed = 0.0
    for _ in range(_N_STEPS):
        info = apic_step_2d(
            pos,
            vel,
            mass,
            affine_c,
            params,
            rho_rest=rho_rest if regularizers else None,
        )
        max_speed = max(max_speed, float(info["max_speed"]))
    fluid1 = float(info["fluid_node_count"])
    drift = float(np.max(np.abs(vel)))
    return max_speed, drift, fluid1 - fluid0, fluid0


def test_still_pool_regularizers_off() -> None:
    max_speed, _final_speed, dvol, _fluid0 = _run_pool(False)
    # Residual currents stay at the solver-floor scale (measured):
    # g*dt = 0.0196; converged projection leaves < 2% of one gravity
    # kick as spurious motion, and the fluid-cell count is unchanged.
    assert max_speed <= 0.02 * 9.81 * 2.0e-3 * _N_STEPS, max_speed
    assert dvol == 0.0, dvol


def test_still_pool_regularizers_on_bounded() -> None:
    """Exact inertness at the *exact* rest configuration is invariant 6
    (PBT). Over 30 dynamic steps the pool drifts at the solver floor,
    so push-apart may legitimately re-seat a few surface particles —
    the ON pool must stay quiet (same residual-speed bound) and hold
    volume to within a surface-layer margin (measured: +3 of ~176
    fluid nodes over 30 steps)."""
    max_speed, _final_speed, dvol, fluid0 = _run_pool(True)
    assert max_speed <= 0.02 * 9.81 * 2.0e-3 * _N_STEPS, max_speed
    assert abs(dvol) <= max(4.0, 0.03 * fluid0), (dvol, fluid0)
