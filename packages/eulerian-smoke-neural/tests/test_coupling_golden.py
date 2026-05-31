"""Prong 1 — smoke-density->Gaussian coupling numerical golden (gate-4 Cat-3; >=3 anchors).

- **A1** Beer-Lambert opacity ``alpha = 1 - exp(-density)`` at known densities (the WU-C
  ``default_density_to_opacity`` map; exact).
- **A2** Kerbl 2023 Eq. (6) emission-absorption alpha-compositing: a single centred Gaussian of
  opacity ``alpha`` and DC colour ``c`` over a black background composites the centre pixel to
  ``~= alpha * c`` (the projected Gaussian peak = 1 at its centre).
- **A3** zero-density degenerate: ``density == 0`` -> all opacities 0 -> the render is the
  background frame (fully transparent; independent of positions/colour).

At Stage 1a these are RED (the coupling raises ``NotImplementedError`` + the golden table is not
yet committed); GREEN at Stage 1b.
"""

from __future__ import annotations

import numpy as np

from eulerian_smoke_neural.coupling import build_smoke_gaussians


def _opacities_of(model: object) -> np.ndarray:
    return np.asarray(model.to_numpy()["opacities"], dtype=np.float64).reshape(-1)  # type: ignore[attr-defined]


def test_a1_beer_lambert_opacity(coupling_tolerance: dict[str, float]) -> None:
    """A1: per-voxel opacity == 1 - exp(-density) at known densities."""
    tol = coupling_tolerance["opacity_abs"]
    # A 1x1x3 field with three known densities; all three are 'active' (max_gaussians=3).
    density = np.array([[[0.0, np.log(2.0), 5.0]]], dtype=np.float64)
    model = build_smoke_gaussians(density, max_gaussians=3)
    got = np.sort(_opacities_of(model))
    expected = np.sort(1.0 - np.exp(-np.array([0.0, np.log(2.0), 5.0])))
    np.testing.assert_allclose(got, expected, atol=tol)


def test_a2_kerbl_single_gaussian_compositing(coupling_tolerance: dict[str, float]) -> None:
    """A2: a single centred Gaussian (opacity a, colour c) renders centre pixel ~= a*c."""
    from common_3dgs import Camera, GaussianSplatModel, render

    tol = coupling_tolerance["compositing_abs"]
    c0 = 0.28209479177387814  # SH degree-0 DC normalization
    color = np.array([0.6, 0.7, 0.8], dtype=np.float32)
    alpha = 0.8
    sh = ((color - 0.5) / c0).reshape(1, 1, 3).astype(np.float32)
    model = GaussianSplatModel(
        positions=np.array([[0.5, 0.5, 0.5]], dtype=np.float32),
        scales=np.full((1, 3), 0.08, dtype=np.float32),
        rotations=np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32),
        opacities=np.array([alpha], dtype=np.float32),
        sh_coefficients=sh,
    )
    cam = Camera.look_at(
        (0.5, 0.5, -1.0),
        (0.5, 0.5, 0.5),
        (0.0, 1.0, 0.0),
        fov_y=0.8,
        image_height=64,
        image_width=64,
    )
    img = np.asarray(
        render(model, cam, image_height=64, image_width=64, background=(0.0, 0.0, 0.0)),
        dtype=np.float64,
    )
    center = img[32, 32, :]
    np.testing.assert_allclose(center, alpha * color, atol=tol)


def test_a3_zero_density_background(coupling_tolerance: dict[str, float]) -> None:
    """A3: density == 0 -> all opacities 0 (the render is the background, independent of colour)."""
    tol = coupling_tolerance["opacity_abs"]
    density = np.zeros((4, 4, 4), dtype=np.float64)
    model = build_smoke_gaussians(density, max_gaussians=8)
    np.testing.assert_allclose(_opacities_of(model), 0.0, atol=tol)


def test_golden_table_anchors(coupling_golden: dict) -> None:
    """The committed golden carries >=3 distinct-source anchors (gate-4 distinctness)."""
    sources = {pt["independent_reference"]["source"] for pt in coupling_golden["test_points"]}
    assert len(sources) >= 3, f"gate-4 needs >=3 distinct anchor sources; got {len(sources)}"
    tol = coupling_golden["tolerance"]["absolute"]
    for pt in coupling_golden["test_points"]:
        if pt["inputs"]["anchor"].startswith("anchor1"):
            d = np.asarray(pt["inputs"]["density_values"], dtype=np.float64)
            exp = np.asarray(pt["expected"]["opacities"], dtype=np.float64)
            np.testing.assert_allclose(1.0 - np.exp(-d), exp, atol=tol)
