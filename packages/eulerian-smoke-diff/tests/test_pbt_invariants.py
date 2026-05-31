"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``gradient_matches_finite_difference`` — the differentiable-specific invariant (autodiff
  ∂Loss/∂u₀ ≈ central FD ≤ 1e-3). Regime: constant velocity, short horizon, small grid.
* ``advect_field_bounded_by_input_range`` — a forward-physics invariant: bilinear SL advect is a
  convex combination of source cells → the advected field stays within ``[min(u₀), max(u₀)]``
  (range-preserving). Regime: pure advection (no diffusion source).
"""

from __future__ import annotations

import numpy as np
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from eulerian_smoke_diff.forward import SmokeDiffConfig
from eulerian_smoke_diff.invariants import (
    advect_field_bounded_by_input_range,
    gradient_matches_finite_difference,
)


def _field_from(amp: float, sx: float, sy: float, n: int = 5) -> np.ndarray:
    """A smooth single-bump field parameterized by amplitude + center (smooth interior)."""
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    x, y = np.meshgrid(idx, idx, indexing="ij")
    return amp * np.exp(-((x - sx) ** 2 + (y - sy) ** 2) / (2.0 * 0.2 * 0.2))


@given(
    amp=st.floats(min_value=0.3, max_value=2.0),
    sx=st.floats(min_value=0.3, max_value=0.7),
    sy=st.floats(min_value=0.3, max_value=0.7),
)
@settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    # Skip shrink: on the Stage-1a RED state every example fails (forward raises
    # NotImplementedError); shrinking would re-run hundreds of times, pushing the failing suite
    # past 60s and emitting a `(H:MM:SS)` summary suffix the gate-13 replay normalizer does not
    # strip. derandomize + skip-shrink keep RED fast (<60s) and byte-stable.
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_gradient_matches_finite_difference_pbt(amp: float, sx: float, sy: float) -> None:
    cfg = SmokeDiffConfig(grid_n=5, steps=1)
    u0 = _field_from(amp, sx, sy, n=5)
    assert gradient_matches_finite_difference(cfg, u0, rel_tol=1e-3)


@given(
    amp=st.floats(min_value=0.3, max_value=2.0),
    sx=st.floats(min_value=0.3, max_value=0.7),
    sy=st.floats(min_value=0.3, max_value=0.7),
)
@settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_advect_field_bounded_by_input_range_pbt(amp: float, sx: float, sy: float) -> None:
    cfg = SmokeDiffConfig(grid_n=8, steps=3)
    u0 = _field_from(amp, sx, sy, n=8)
    assert advect_field_bounded_by_input_range(cfg, u0)
