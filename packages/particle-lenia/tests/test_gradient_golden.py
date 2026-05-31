"""Gate-4 gradient golden table — ≥3 independent anchors (energy-based, LOCAL rule).

The golden table ``tools/testkit/golden/tables/particle-lenia-gradient.json`` stores the Taichi
engine's per-particle force ``f_i = -∇E(p_i)`` at canonical seeded configs, each verified against an
independent reference:

* **A1** the NumPy analytic closed-form ``-∇E`` mirror (hand-derived; the engine implements the same
  analytic gradient — a bit-faithful cross-implementation check).
* **A2** central finite differences of ``E`` (independent numerical method).
* **A3** translation invariance of the TOTAL energy ``E_total(P + δ) == E_total(P)`` (exact
  symmetry; ``Σ_i ∇_{p_i} E_total = 0``). Energy MONOTONICITY is NOT asserted (unsound for the LOCAL
  rule).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from golden import verify_against_table

from particle_lenia.forward import (
    ParticleLeniaConfig,
    grad_E_analytic,
    grad_E_fd,
    initial_positions,
    total_energy,
)
from particle_lenia.sim import ParticleLeniaSim

ALGORITHM = "particle-lenia-gradient"
_INDICES = (0, 3, 7)


def _cfg(inp: dict[str, Any]) -> ParticleLeniaConfig:
    return ParticleLeniaConfig(n_particles=inp["n"], seed=inp["seed"])


def _engine_force_components(inp: dict[str, Any]) -> dict[str, float]:
    cfg = _cfg(inp)
    pos = initial_positions(cfg)
    force = ParticleLeniaSim(cfg).compute_force(pos)
    out: dict[str, float] = {}
    for i in _INDICES:
        out[f"f{i}_x"] = float(force[i, 0])
        out[f"f{i}_y"] = float(force[i, 1])
    return out


def _translation_residual(inp: dict[str, Any]) -> dict[str, float]:
    cfg = _cfg(inp)
    pos = initial_positions(cfg)
    delta = np.array([inp["dx"], inp["dy"]], dtype=np.float64)
    e0 = total_energy(pos, cfg)
    e1 = total_energy(pos + delta[None, :], cfg)
    return {"e_total_translation_residual": float(e1 - e0)}


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's measured quantity."""
    anchor = inputs["anchor"]
    if anchor in ("a1-analytic", "a2-fd"):
        return _engine_force_components(inputs)
    if anchor == "a3-translation":
        return _translation_residual(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_engine_matches_analytic() -> None:
    """A1: the Taichi engine force == the NumPy analytic -∇E mirror (machine-exact)."""
    for seed in (42, 7):
        cfg = ParticleLeniaConfig(n_particles=16, seed=seed)
        pos = initial_positions(cfg)
        force = ParticleLeniaSim(cfg).compute_force(pos)
        analytic = -grad_E_analytic(pos, cfg)
        assert float(np.max(np.abs(force - analytic))) <= 1e-12


def test_a2_engine_matches_finite_difference() -> None:
    """A2: the engine force == central FD of E (numerical baseline)."""
    for seed in (42, 7):
        cfg = ParticleLeniaConfig(n_particles=16, seed=seed)
        pos = initial_positions(cfg)
        force = ParticleLeniaSim(cfg).compute_force(pos)
        fd = -grad_E_fd(pos, cfg, eps=1e-6)
        denom = max(float(np.max(np.abs(fd))), 1e-6)
        assert float(np.max(np.abs(force - fd))) / denom < 1e-5


def test_a3_total_energy_translation_invariant() -> None:
    """A3: E_total is invariant under uniform translation (exact symmetry; Σ∇E_total = 0)."""
    for seed in (42, 7):
        cfg = ParticleLeniaConfig(n_particles=24, seed=seed)
        pos = initial_positions(cfg)
        for delta in (np.array([3.7, -2.1]), np.array([-5.0, 8.3])):
            e0 = total_energy(pos, cfg)
            e1 = total_energy(pos + delta[None, :], cfg)
            assert abs(e1 - e0) <= 1e-9 + 1e-9 * abs(e0)
