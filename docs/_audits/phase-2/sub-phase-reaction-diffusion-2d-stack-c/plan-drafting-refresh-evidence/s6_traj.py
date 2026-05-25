"""S6-trajectory regime characterization at CANONICAL resolution (128^2, 2000
steps) per conventions §L.4 + §L.8 R-SME9 (must run at canonical resolution).
Reports max|U|, max|V| growth to classify laminar/bounded vs chaotic-amplifying."""

from __future__ import annotations

import numpy as np

from reaction_diffusion_2d.reference.gray_scott_numpy import (
    canonical_params,
    initial_condition,
    step,
)

p = canonical_params()
u, v = initial_condition(p, seed=42)
print("step    max|U|              max|V|              minU        minV")
for i in range(0, 2001):
    if i % 200 == 0:
        print(
            f"{i:5d}   {np.max(np.abs(u)):.12e}  {np.max(np.abs(v)):.12e}  "
            f"{u.min():.4e}  {v.min():.4e}"
        )
    if i < 2000:
        u, v = step(u, v, p)
finite = np.isfinite(u).all() and np.isfinite(v).all()
print(
    f"\nfinite_through_horizon={finite}  bounded(U,V in O(1))={np.max(np.abs(u)) < 2.0 and np.max(np.abs(v)) < 2.0}"
)
