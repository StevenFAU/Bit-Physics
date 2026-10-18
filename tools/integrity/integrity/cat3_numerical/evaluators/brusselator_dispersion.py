"""Register the reaction-diffusion-2d dispersion relation; no duplicate numerical implementation."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

ALGORITHM_NAME = "brusselator-turing-dispersion"


def evaluate(inputs: dict[str, Any]) -> dict[str, Any]:
    package = Path(__file__).resolve().parents[5] / "packages/reaction-diffusion-2d"
    if str(package) not in sys.path:
        sys.path.insert(0, str(package))
    from reaction_diffusion_2d.reference import models

    jac = models.brusselator_jacobian(float(inputs["A"]), float(inputs["B"]))
    du, dv = float(inputs["Du"]), float(inputs["Dv"])
    q2, sigma = models.fastest_growing_continuum(jac, du, dv)
    sigma_q0 = models.growth_continuum(jac, du, dv, 0.0)
    return {"sigma_max": sigma, "q_star2": q2, "sigma_q0": sigma_q0}
