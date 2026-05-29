"""Prong 1 — numerical coupling-correctness golden (gate-4 Cat-3; ≥3 anchors).

Asserts ``gs_mpm.coupling`` reproduces the hand-derived golden table
(``tools/testkit/golden/tables/3dgs-mpm-coupling.json`` + derivation doc) for the three
anchors: Eq. (8) covariance transform (Anchor 1), polar-decomposition stretch (Anchor 2,
same-theory §2.4 caveat), and the F=I identity (Anchor 3, fully independent). Assertions
are on rotation-convention-independent quantities: the deformed covariance ``Σ'``
(reconstructed from the output ``(scale', quat')``) and the SORTED principal scales.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

from gs_mpm import (
    apply_deformation,
    couple_gaussians,
    extract_scale_rotation,
    reconstruct_covariance,
)

ANCHOR_KEY = {
    "anchor1-covariance-transform": "covariance_transform_abs",
    "anchor2-polar-decomposition": "polar_decomp_scale_abs",
    "anchor3-identity-F": "identity_invariance_abs",
}


def _anchors(coupling_golden: dict[str, Any]) -> list[dict[str, Any]]:
    return coupling_golden["test_points"]


def test_three_independent_anchors_present(coupling_golden: dict[str, Any]) -> None:
    """The golden carries ≥3 anchors incl. the fully-independent F=I case."""
    names = {tp["inputs"]["anchor"] for tp in _anchors(coupling_golden)}
    required = {"anchor1-covariance-transform", "anchor2-polar-decomposition", "anchor3-identity-F"}
    assert required <= names
    assert len(names) >= 3


@pytest.mark.parametrize(
    "anchor_name",
    ["anchor1-covariance-transform", "anchor2-polar-decomposition", "anchor3-identity-F"],
)
def test_anchor_covariance_transform(
    anchor_name: str,
    coupling_golden: dict[str, Any],
    golden_tolerance: dict[str, float],
) -> None:
    """``Σ' = F·A·Fᵀ`` matches the golden deformed covariance for each anchor."""
    tp = next(t for t in _anchors(coupling_golden) if t["inputs"]["anchor"] == anchor_name)
    scale = np.asarray(tp["inputs"]["scale"], dtype=np.float64)
    quat = np.asarray(tp["inputs"]["quat_wxyz"], dtype=np.float64)
    fgrad = np.asarray(tp["inputs"]["deformation_gradient"], dtype=np.float64)
    expected_cov = np.asarray(tp["expected"]["cov_deformed"], dtype=np.float64)
    tol = golden_tolerance[ANCHOR_KEY[anchor_name]]

    cov = reconstruct_covariance(scale, quat)
    deformed = apply_deformation(cov, fgrad)
    assert np.allclose(deformed, expected_cov, atol=tol, rtol=0.0)


@pytest.mark.parametrize(
    "anchor_name",
    ["anchor1-covariance-transform", "anchor2-polar-decomposition", "anchor3-identity-F"],
)
def test_anchor_scale_roundtrip(
    anchor_name: str,
    coupling_golden: dict[str, Any],
    golden_tolerance: dict[str, float],
) -> None:
    """Re-extracted sorted scales match; and reconstruct(extract(Σ')) round-trips to Σ'."""
    tp = next(t for t in _anchors(coupling_golden) if t["inputs"]["anchor"] == anchor_name)
    scale = np.asarray(tp["inputs"]["scale"], dtype=np.float64)
    quat = np.asarray(tp["inputs"]["quat_wxyz"], dtype=np.float64)
    fgrad = np.asarray(tp["inputs"]["deformation_gradient"], dtype=np.float64)
    expected_scale_sorted = np.asarray(tp["expected"]["scale_sorted"], dtype=np.float64)
    tol = golden_tolerance[ANCHOR_KEY[anchor_name]]

    deformed = apply_deformation(reconstruct_covariance(scale, quat), fgrad)
    out_scale, out_quat = extract_scale_rotation(deformed)
    assert np.allclose(np.sort(out_scale), expected_scale_sorted, atol=tol, rtol=0.0)
    # round-trip: the (scale', quat') represent the same ellipsoid as Σ'.
    assert np.allclose(reconstruct_covariance(out_scale, out_quat), deformed, atol=1e-9, rtol=0.0)


def test_couple_gaussians_batched_matches_per_gaussian(
    coupling_golden: dict[str, Any],
    golden_tolerance: dict[str, float],
) -> None:
    """Batched ``couple_gaussians`` equals the per-Gaussian transform over all anchors."""
    anchors = _anchors(coupling_golden)
    scales = np.asarray([a["inputs"]["scale"] for a in anchors], dtype=np.float64)
    quats = np.asarray([a["inputs"]["quat_wxyz"] for a in anchors], dtype=np.float64)
    fgrads = np.asarray([a["inputs"]["deformation_gradient"] for a in anchors], dtype=np.float64)

    out_scales, out_quats = couple_gaussians(scales, quats, fgrads)
    assert out_scales.shape == scales.shape
    assert out_quats.shape == quats.shape
    for i, a in enumerate(anchors):
        expected_cov = np.asarray(a["expected"]["cov_deformed"], dtype=np.float64)
        assert np.allclose(
            reconstruct_covariance(out_scales[i], out_quats[i]), expected_cov, atol=1e-9, rtol=0.0
        )


def test_identity_F_is_exact_invariance(golden_tolerance: dict[str, float]) -> None:
    """A separate F=I check on an arbitrary Gaussian: scale unchanged, covariance preserved."""
    scale = np.array([0.3, 1.7, 2.9], dtype=np.float64)
    quat = np.array([0.5, 0.5, 0.5, 0.5], dtype=np.float64)  # 120° about (1,1,1)
    eye = np.eye(3, dtype=np.float64)
    cov = reconstruct_covariance(scale, quat)
    deformed = apply_deformation(cov, eye)
    tol = golden_tolerance["identity_invariance_abs"]
    assert np.allclose(deformed, cov, atol=tol, rtol=0.0)
    out_scale, _ = extract_scale_rotation(deformed)
    assert np.allclose(np.sort(out_scale), np.sort(scale), atol=tol, rtol=0.0)
