"""PBT witnesses (gate-11; ≥2 invariants) for 3dgs-mpm.

Exercises the shared predicate forms (``property.sims.gs_mpm.invariants``) on
Hypothesis-sampled Gaussian/deformation batches:

1. ``gaussian_count_invariant`` — ``couple_gaussians`` preserves the Gaussian count.
2. ``def_grad_determinant_positive`` — for ``det(F) > 0`` inputs (the valid-material
   envelope), the deformed covariance stays SPD (all output scales > 0).
"""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st
from property.sims.gs_mpm.invariants import all_determinants_positive, count_preserved

from gs_mpm import couple_gaussians, reconstruct_covariance


def _unit_quat(a: float, b: float, c: float, d: float) -> np.ndarray:
    q = np.array([a, b, c, d], dtype=np.float64)
    n = np.linalg.norm(q)
    if n < 1e-9:
        return np.array([1.0, 0.0, 0.0, 0.0])
    return q / n


_finite = st.floats(min_value=-2.0, max_value=2.0, allow_nan=False, allow_infinity=False)
_pos = st.floats(min_value=0.05, max_value=3.0, allow_nan=False, allow_infinity=False)


@settings(max_examples=60, deadline=None)
@given(
    n=st.integers(min_value=1, max_value=16),
    s=st.lists(_pos, min_size=3, max_size=3),
    q=st.lists(_finite, min_size=4, max_size=4),
)
def test_gaussian_count_invariant(n: int, s: list[float], q: list[float]) -> None:
    """``couple_gaussians`` returns exactly ``n`` Gaussians (no creation/destruction)."""
    scales = np.tile(np.asarray(s, dtype=np.float64), (n, 1))
    quats = np.tile(_unit_quat(*q), (n, 1))
    fgrads = np.tile(np.eye(3, dtype=np.float64), (n, 1, 1))
    out_scales, out_quats = couple_gaussians(scales, quats, fgrads)
    assert count_preserved(scales.shape[0], out_scales.shape[0], n)
    assert out_quats.shape[0] == n


@settings(max_examples=60, deadline=None)
@given(
    s=st.lists(_pos, min_size=3, max_size=3),
    q=st.lists(_finite, min_size=4, max_size=4),
    diag=st.lists(_pos, min_size=3, max_size=3),
)
def test_def_grad_determinant_positive_keeps_spd(
    s: list[float], q: list[float], diag: list[float]
) -> None:
    """A ``det(F) > 0`` deformation keeps ``Σ' = F·A·Fᵀ`` SPD (output scales > 0)."""
    scales = np.asarray(s, dtype=np.float64)[None, :]
    quats = _unit_quat(*q)[None, :]
    # F = R·diag(>0) with R a proper rotation -> det(F) > 0 by construction.
    fgrad = np.diag(np.asarray(diag, dtype=np.float64))[None, :, :]
    assert all_determinants_positive(fgrad)
    out_scales, out_quats = couple_gaussians(scales, quats, fgrad)
    assert np.all(out_scales > 0.0)
    # SPD round-trip: reconstructed covariance is symmetric positive-definite.
    cov = reconstruct_covariance(out_scales[0], out_quats[0])
    eigs = np.linalg.eigvalsh(cov)
    assert float(eigs.min()) > 0.0
