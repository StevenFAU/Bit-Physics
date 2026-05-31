"""PBT (>=2 declared invariants, regime-scoped; §2.14).

- ``sh_rotation_equivariant`` (variant-axis-specific) — for any unit rotation ``R``, degree-1
  coefficients ``c`` and direction ``d``: ``eval_SH(rotate(c,R), R·d) == eval_SH(c, d)`` (the
  defining SO(3) equivariance = PhysGaussian's inverse-rotation-on-view-directions). Regime:
  unit ``R∈SO(3)``, degree 1.
- ``covariance_spd_preserved`` (coupling/physics) — for any deformation ``F`` with ``det>0``,
  the parent ``gs_mpm.couple_gaussians`` (``Σ'=FΣFᵀ``) yields strictly positive scales (the
  covariance stays SPD). Regime: ``det(F) > 0`` (no element inversion).

Re-declared on falsification, never widened (HARD RULE 2).
"""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from gs_mpm_sh_update.sh_rotation import rotate_sh_degree1

_finite = st.floats(min_value=-3.0, max_value=3.0, allow_nan=False, allow_infinity=False)
_pos = st.floats(min_value=0.05, max_value=3.0, allow_nan=False, allow_infinity=False)


def _quat_to_matrix(q: np.ndarray) -> np.ndarray:
    q = q / np.linalg.norm(q)
    w, x, y, z = q
    return np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
        ],
        dtype=np.float64,
    )


@settings(max_examples=50, deadline=None)
@given(
    quat=st.lists(_finite, min_size=4, max_size=4).filter(lambda q: np.linalg.norm(q) > 0.1),
    coeffs=st.lists(_finite, min_size=9, max_size=9),
    direction=st.lists(_finite, min_size=3, max_size=3).filter(lambda d: np.linalg.norm(d) > 0.1),
)
def test_sh_rotation_equivariant(
    quat: list[float], coeffs: list[float], direction: list[float]
) -> None:
    from common_3dgs.render import _eval_sh

    rot = _quat_to_matrix(np.asarray(quat, dtype=np.float64))[None, :, :]
    sh = np.asarray(coeffs, dtype=np.float64).reshape(1, 3, 3)
    sh = np.concatenate([np.zeros((1, 1, 3)), sh], axis=1)  # (1, 4, 3): DC + band-1
    d = np.asarray(direction, dtype=np.float64)
    d = (d / np.linalg.norm(d))[None, :]
    rd = np.einsum("nij,nj->ni", rot, d)
    base = _eval_sh(1, sh, d)
    rotated = _eval_sh(1, rotate_sh_degree1(sh, rot), rd)
    np.testing.assert_allclose(rotated, base, atol=1e-9)


@settings(max_examples=50, deadline=None)
@given(
    quat=st.lists(_finite, min_size=4, max_size=4).filter(lambda q: np.linalg.norm(q) > 0.1),
    stretch=st.lists(_pos, min_size=3, max_size=3),
    scale0=st.lists(_pos, min_size=3, max_size=3),
)
def test_covariance_spd_preserved(
    quat: list[float], stretch: list[float], scale0: list[float]
) -> None:
    from gs_mpm.coupling import couple_gaussians

    rot = _quat_to_matrix(np.asarray(quat, dtype=np.float64))
    fgrad = (rot @ np.diag(stretch))[None, :, :]  # det = prod(stretch) * det(R) > 0
    scales0 = np.asarray(scale0, dtype=np.float64).reshape(1, 3)
    quats0 = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float64)
    new_scales, _ = couple_gaussians(scales0, quats0, fgrad)
    assert np.all(new_scales > 0.0), f"non-SPD scales {new_scales}"
