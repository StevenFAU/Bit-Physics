"""PBT invariants (gate-11, ≥2 per spec § 2.14).

Per ``docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md`` § 6 + charter §6.
The two declared invariants are **envelope-scoped** to the trained regime (a PINN's
soft-constraint residuals are small-but-nonzero, and a PINN does not extrapolate):

1. **`pde_residual_bounded`** — for interior points sampled within ``[0,1]²``,
   ``|Δu_NN - f|`` stays within the trained interior-residual envelope.
2. **`boundary_residual_bounded`** — for boundary points sampled on ``∂Ω``,
   ``|u_NN - g|`` stays within the trained boundary-residual envelope.

The envelope magnitudes are MEASURED at Stage 1b-PINN (the trained residual scale +
safety margin) — see the Stage-1b-PINN audit. The canonical predicate forms live in
``tools/testkit/property/sims/pinn_poisson/`` (consumed here via
``property.sims.pinn_poisson``). Hypothesis samples the points; the trained model is
cached once for the whole module.
"""

from __future__ import annotations

from functools import lru_cache

import torch
from hypothesis import given, settings
from hypothesis import strategies as st
from property.sims.pinn_poisson import residual_within_envelope

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig, train_pinn
from pinn_poisson.residual import poisson_residual

# MEASURED envelopes (Stage 1b-PINN; trained-residual max over fresh samples +
# margin). pde: |Δu_NN - f| over interior; boundary: |u_NN - g| over ∂Ω.
# MEASURED trained-A3 residuals (locked config, 4000 fresh interior + 1600 boundary
# samples): pde max 0.0126 (mean 0.0012), boundary max 0.00065 (mean 0.00022). These
# envelopes carry ~8x / ~15x headroom — the trained regime, NOT a widened tolerance.
_PDE_ENVELOPE = 0.1
_BOUNDARY_ENVELOPE = 0.01
_EPS = 1e-3  # keep interior samples strictly inside the domain


@lru_cache(maxsize=1)
def _trained_model() -> object:
    return train_pinn(CANONICAL_PROBLEM, PINNConfig()).model


@settings(max_examples=15, deadline=None)
@given(seed=st.integers(min_value=0, max_value=2**31 - 1))
def test_pde_residual_bounded(seed: int) -> None:
    model = _trained_model()
    gen = torch.Generator().manual_seed(seed)
    x = (1 - 2 * _EPS) * torch.rand(256, 1, dtype=torch.float64, generator=gen) + _EPS
    y = (1 - 2 * _EPS) * torch.rand(256, 1, dtype=torch.float64, generator=gen) + _EPS
    x.requires_grad_(True)
    y.requires_grad_(True)
    res = poisson_residual(model, x, y, CANONICAL_PROBLEM).detach().numpy()
    assert residual_within_envelope(res, _PDE_ENVELOPE), (
        f"pde residual max {abs(res).max():.3e} exceeds envelope {_PDE_ENVELOPE}"
    )


@settings(max_examples=15, deadline=None)
@given(seed=st.integers(min_value=0, max_value=2**31 - 1))
def test_boundary_residual_bounded(seed: int) -> None:
    model = _trained_model()
    gen = torch.Generator().manual_seed(seed)
    nb = 256
    t = torch.rand(nb, 1, dtype=torch.float64, generator=gen)
    edge = torch.randint(0, 4, (nb, 1), generator=gen)
    zero = torch.zeros(nb, 1, dtype=torch.float64)
    one = torch.ones(nb, 1, dtype=torch.float64)
    x = torch.where(edge == 0, zero, torch.where(edge == 1, one, t))
    y = torch.where(edge == 2, zero, torch.where(edge == 3, one, t))
    with torch.no_grad():
        u = model(x, y)
        g = CANONICAL_PROBLEM.boundary_value(x, y, torch)
    res = (u - g).numpy()
    assert residual_within_envelope(res, _BOUNDARY_ENVELOPE), (
        f"boundary residual max {abs(res).max():.3e} exceeds envelope {_BOUNDARY_ENVELOPE}"
    )
