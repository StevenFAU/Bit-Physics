"""Prong 1 — SH-rotation numerical golden (gate-4 Cat-3; >=3 independent anchors).

- **A1** degree-1 Wigner-D == ``P R P^T`` closed form, cross-checked by the INDEPENDENT
  dipole-rotation derivation (the degree-1 band is a linear functional ``f(d)=a·d``; under
  rotation the dipole vector ``a`` rotates by ``R``). Hand-computed numeric: for the renderer
  basis ``(-y,+z,-x)``, ``c=(1,0,0)`` under ``R_z(90°)`` rotates to ``(0,0,-1)``.
- **A2** rotation-equivariance vs the LANDED renderer ``_eval_sh`` (implementation-independent;
  = PhysGaussian's "inverse rotation on view directions"): ``eval_SH(rotate(c,R), R·d) ==
  eval_SH(c, d)``.
- **A3** pure-stretch frozen (``polar_rotation`` of an SPD ``F`` is ``I`` -> SH unchanged,
  recovering the MVP "SH frozen") + pure-rotation (``polar_rotation`` of orthogonal ``F`` is
  ``F``).

At Stage 1a these are RED (``rotate_sh_degree1`` / ``polar_rotation`` raise
``NotImplementedError`` and the golden table is not yet committed); GREEN at Stage 1b.
"""

from __future__ import annotations

import numpy as np
import pytest

from gs_mpm_sh_update.sh_rotation import polar_rotation, rotate_sh_degree1


def _rot_z(theta: float) -> np.ndarray:
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]], dtype=np.float64)


def _random_rotation(seed: int) -> np.ndarray:
    """Deterministic SO(3) rotation from a seeded quaternion (no scipy dependency)."""
    rng = np.random.default_rng(seed)
    q = rng.standard_normal(4)
    q /= np.linalg.norm(q)
    w, x, y, z = q
    return np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
        ],
        dtype=np.float64,
    )


def test_a1_degree1_hand_derived_value(sh_rotation_tolerance: dict[str, float]) -> None:
    """A1: c=(1,0,0) [band-1, one channel] under R_z(90°) -> (0,0,-1) (hand-derived)."""
    tol = sh_rotation_tolerance["sh_rotation_abs"]
    sh = np.zeros((1, 4, 3), dtype=np.float64)
    sh[0, 1:4, 0] = (1.0, 0.0, 0.0)  # channel 0 band-1 coeffs
    rot = _rot_z(np.pi / 2.0)[None, :, :]
    out = rotate_sh_degree1(sh, rot)
    assert out[0, 0, 0] == sh[0, 0, 0]  # DC unchanged
    np.testing.assert_allclose(out[0, 1:4, 0], [0.0, 0.0, -1.0], atol=tol)


def test_a2_rotation_equivariance_vs_renderer(sh_rotation_tolerance: dict[str, float]) -> None:
    """A2: eval_SH(rotate(c,R), R·d) == eval_SH(c, d) for random (c, R, d) (the renderer)."""
    from common_3dgs.render import _eval_sh

    tol = sh_rotation_tolerance["sh_rotation_abs"]
    rng = np.random.default_rng(7)
    n = 5
    sh = rng.standard_normal((n, 4, 3))
    rot = np.stack([_random_rotation(s) for s in range(n)])
    d = rng.standard_normal((n, 3))
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    rd = np.einsum("nij,nj->ni", rot, d)
    base = _eval_sh(1, sh, d)
    rotated = _eval_sh(1, rotate_sh_degree1(sh, rot), rd)
    np.testing.assert_allclose(rotated, base, atol=1e-9 + 1e3 * tol)


def test_a3_pure_stretch_frozen_and_pure_rotation(
    sh_rotation_tolerance: dict[str, float],
) -> None:
    """A3: polar(SPD F)=I -> SH frozen; polar(orthogonal F)=F."""
    tol = sh_rotation_tolerance["sh_rotation_abs"]
    stretch = np.diag([2.0, 3.0, 4.0])[None, :, :]
    r_stretch = polar_rotation(stretch)
    np.testing.assert_allclose(r_stretch[0], np.eye(3), atol=tol)
    sh = np.random.default_rng(3).standard_normal((1, 4, 3))
    np.testing.assert_allclose(rotate_sh_degree1(sh, r_stretch), sh, atol=tol)

    rot = _rot_z(0.7)[None, :, :]
    np.testing.assert_allclose(polar_rotation(rot)[0], rot[0], atol=tol)


def test_golden_table_anchors(
    sh_rotation_golden: dict, sh_rotation_tolerance: dict[str, float]
) -> None:
    """Every committed golden anchor: rotate_sh_degree1 reproduces the expected coefficients."""
    tol = sh_rotation_golden["tolerance"]["absolute"]
    sources = {pt["independent_reference"]["source"] for pt in sh_rotation_golden["test_points"]}
    assert len(sources) >= 3, f"gate-4 needs >=3 distinct anchor sources; got {len(sources)}"
    for pt in sh_rotation_golden["test_points"]:
        sh = np.asarray(pt["inputs"]["sh_coefficients"], dtype=np.float64)
        rot = np.asarray(pt["inputs"]["rotation"], dtype=np.float64)
        expected = np.asarray(pt["expected"]["sh_rotated"], dtype=np.float64)
        out = rotate_sh_degree1(sh, rot)
        np.testing.assert_allclose(out, expected, atol=tol)


@pytest.mark.parametrize("k", [9, 16])
def test_degree_ge_2_raises(k: int) -> None:
    """Scope guard: degree >= 2 coefficients raise NotImplementedError (documented scope)."""
    sh = np.zeros((1, k, 3), dtype=np.float64)
    rot = np.eye(3)[None, :, :]
    with pytest.raises(NotImplementedError):
        rotate_sh_degree1(sh, rot)
