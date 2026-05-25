"""Reference sanity — canonical-descriptor lock + kernel-surface export.

Guards the Phase-1-frozen canonical contract (D4/D6) and the public kernel
surface (gate-8 Cat-2 substrate).
"""

from __future__ import annotations

import math

from mpm_multimaterial_stack_e.reference import (
    CANONICAL_BLOB_RADIUS,
    CANONICAL_BLOB_VELOCITY_Z,
    CANONICAL_CAPTURE_INTERVAL,
    CANONICAL_DESCRIPTOR,
    CANONICAL_FLOOR_Z_INDEX,
    CANONICAL_GRID_N,
    CANONICAL_LAMBDA,
    CANONICAL_MU,
    CANONICAL_N_PARTICLES,
    CANONICAL_N_STEPS,
    CANONICAL_POISSON_RATIO,
    CANONICAL_SEED,
    CANONICAL_YOUNGS_MODULUS,
    N,
    advect_particles,
    compute_particle_stresses,
    deformation_update,
    g2p,
    grid_update,
    p2g_with_stress,
    partition_of_unity_sum,
)


def test_canonical_descriptor_lock() -> None:
    """Stack-E commits to the Phase-1-frozen canonical descriptor (D4/D6)."""
    assert CANONICAL_DESCRIPTOR == "drop-impact-128cube-seed42-step500"
    assert int(CANONICAL_GRID_N) == 128
    assert int(CANONICAL_N_PARTICLES) == 1_000_000
    assert int(CANONICAL_N_STEPS) == 500
    assert int(CANONICAL_CAPTURE_INTERVAL) == 50
    assert int(CANONICAL_FLOOR_Z_INDEX) == 4
    assert int(CANONICAL_SEED) == 42


def test_neo_hookean_single_material_params() -> None:
    """neo-Hookean SINGLE material; Lame params derived from (E, nu)=(4000, 0.3)."""
    assert CANONICAL_YOUNGS_MODULUS == 4.0e3
    assert CANONICAL_POISSON_RATIO == 0.3
    e, nu = CANONICAL_YOUNGS_MODULUS, CANONICAL_POISSON_RATIO
    assert math.isclose(CANONICAL_MU, e / (2.0 * (1.0 + nu)))
    assert math.isclose(CANONICAL_LAMBDA, e * nu / ((1.0 + nu) * (1.0 - 2.0 * nu)))
    assert CANONICAL_BLOB_RADIUS == 0.15
    assert CANONICAL_BLOB_VELOCITY_Z == -2.0


def test_quadratic_bspline_peak_and_partition_of_unity() -> None:
    """Quadratic B-spline center weight N(0)=3/4; 3-node partition-of-unity = 1."""
    assert N(0.0) == 0.75
    assert abs(partition_of_unity_sum(0.3) - 1.0) <= 1e-15
    assert abs(partition_of_unity_sum(-1.4) - 1.0) <= 1e-15


def test_mls_mpm_kernel_surface_exported() -> None:
    """The MLS-MPM/APIC transfer + update kernels are part of the public API."""
    for kernel in (
        p2g_with_stress,
        g2p,
        grid_update,
        deformation_update,
        compute_particle_stresses,
        advect_particles,
    ):
        assert callable(kernel)
