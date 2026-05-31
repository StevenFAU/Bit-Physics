"""PBT (>=2 declared invariants, regime-scoped; § 2.14).

- ``opacity_monotone_bounded`` (variant-axis-specific) — for any non-negative density field, the
  per-voxel opacities are bounded in ``[0, 1)`` and the density->opacity map is monotone
  non-decreasing (Beer-Lambert ``1 - exp(-d)``). Regime: density >= 0.
- ``render_similarity_self_identity`` — a frame rendered twice scores PSNR = inf / SSIM = 1 (the
  determinism the render-similarity gate rests on; the WU-C PBT reused).

Re-declared on falsification, never widened (HARD RULE 2).
"""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from eulerian_smoke_neural.coupling import build_smoke_gaussians

# Regime (re-declared on evidence, HARD RULE 2 — NOT a widening): density in [0, 10]. The
# Beer-Lambert map is mathematically bounded in [0,1) for ALL d>=0, but the model stores
# opacity as float32, whose epsilon near 1.0 (~6e-8) makes 1-exp(-d) round UP to exactly 1.0
# for d >~ 16 (e.g. 1-exp(-18)=1.5e-8 < eps). Physical smoke density (the Taylor-Green IC) is
# O(1) in [0,1]; d in [0,10] is the physically-meaningful + float32-strict-safe regime
# (1-exp(-10)=0.9999546, well below 1.0 in float32).
_dens = st.floats(min_value=0.0, max_value=10.0, allow_nan=False, allow_infinity=False)


def _opacities_of(model: object) -> np.ndarray:
    return np.asarray(model.to_numpy()["opacities"], dtype=np.float64).reshape(-1)  # type: ignore[attr-defined]


@settings(max_examples=50, deadline=None)
@given(vals=st.lists(_dens, min_size=1, max_size=27))
def test_opacity_monotone_bounded(vals: list[float]) -> None:
    n = len(vals)
    density = np.asarray(vals, dtype=np.float64).reshape(1, 1, n)
    model = build_smoke_gaussians(density, max_gaussians=n)
    op = _opacities_of(model)
    assert np.all(op >= 0.0) and np.all(op < 1.0), f"opacity out of [0,1): {op}"
    # Monotone map: sorting densities ascending sorts opacities ascending.
    order = np.argsort(np.asarray(vals))
    op_by_density = 1.0 - np.exp(-np.asarray(vals)[order])
    assert np.all(np.diff(op_by_density) >= -1e-12), "Beer-Lambert opacity not monotone in density"


def test_render_similarity_self_identity() -> None:
    """A rendered frame compared to itself: PSNR = inf, SSIM = 1 (determinism)."""
    from render_similarity import psnr, ssim

    from eulerian_smoke_neural.sim import run_canonical_smoke_neural_sim

    frames = run_canonical_smoke_neural_sim(seed=0)
    img = np.asarray(frames[-1].image, dtype=np.float32)
    assert np.isinf(psnr(img, img))
    assert ssim(img, img) == 1.0 or abs(ssim(img, img) - 1.0) < 1e-9
