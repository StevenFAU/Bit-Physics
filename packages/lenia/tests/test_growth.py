"""Stage 1a RED tests — Lenia growth function (Chan 2019 § 2.2 form).

``G(u) = 2 · exp(-((u - mu) / sigma)^2 / 2) - 1``

Sanity anchors (subject to Stage-1b grep-cite against Chakazul source;
the closed-form math is invariant):

- ``G(mu) = 2·exp(0) - 1 = 1`` — at the center, growth saturates positive.
- ``G(u → ±∞) → -1`` — far from the center, growth saturates negative.

Stage 1a — these tests FAIL with ``NotImplementedError`` from the
shell at ``packages/lenia/lenia/growth.py:43``. Stage 1b implements
the closed form; the anchors then PASS within tolerance.
"""

from __future__ import annotations

import numpy as np


def _load_growth() -> object:
    """Deferred import — Stage-1a shell raises in the function body."""
    from lenia import growth_lenia  # type: ignore[attr-defined]

    return growth_lenia


def test_growth_at_mu_is_positive_peak() -> None:
    """G(mu) = 1 (the bell-curve peak after the 2·exp(...) - 1 mapping)."""
    g = _load_growth()
    u = np.array([0.15])
    result = g(u, mu=0.15, sigma=0.015)
    np.testing.assert_allclose(result, [1.0], atol=1e-6, rtol=1e-5)


def test_growth_far_from_mu_is_negative() -> None:
    """G(u) → -1 for |u - mu| >> sigma."""
    g = _load_growth()
    u = np.array([1.0])  # far from mu=0.15 relative to sigma=0.015
    result = g(u, mu=0.15, sigma=0.015)
    np.testing.assert_allclose(result, [-1.0], atol=1e-6, rtol=1e-5)
