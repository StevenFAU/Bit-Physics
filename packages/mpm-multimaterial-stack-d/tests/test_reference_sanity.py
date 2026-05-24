"""Reference-sanity tests for the Stack-D MLS-MPM port (gate 5).

Exercise the Stack-D Taichi-DSL reference module directly, pinning the canonical
MLS-MPM constants + descriptor the Stack-D port MUST commit to (matching the
Phase-1-frozen NumPy+numba reference: the drop-impact-128cube descriptor, the
neo-Hookean single-material params E=4000/nu=0.3, the quadratic-B-spline shape
function, and the MLS-MPM/APIC kernel surface). Mirrors the LBM Stack-D
reference-sanity pattern (probe S-M5/S-M6: MLS-MPM Hu-2018 + APIC; neo-Hookean
SINGLE material -- "multimaterial" is a Phase-1 naming-only surface).

The Stack-D reference module ``mpm_multimaterial_stack_d.reference`` does NOT
exist at the failing-tests commit -- collection fails with ModuleNotFoundError
cleanly until Stage 1b implements it.
"""

from __future__ import annotations

import math

from mpm_multimaterial_stack_d.reference import (  # type: ignore[import-not-found]
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
    """Stack-D MUST commit to the Phase-1-frozen canonical descriptor (D4)."""
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
    # Blob IC geometry locks.
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
