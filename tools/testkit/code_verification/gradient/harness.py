"""Gradient-verification harness (plan § 4.2.A testkit companion).

``verify_sim_gradients`` loads a sim module, instantiates its
``InverseProblem`` subclass, runs ``check_gradient`` at every canonical test
point, and aggregates pass/fail into a :class:`GradientVerificationReport`.

Backend-agnostic: it never imports ``common_py`` / ``common_warp`` directly —
the sim module's class does, and the harness only relies on the published
``InverseProblem`` surface (``set_target`` + ``check_gradient``).
"""

from __future__ import annotations

import importlib
import json
from pathlib import Path
from typing import Any

import numpy as np

from .report import GradientVerificationReport


def _load_inverse_problem_class(sim_module: str, inverse_problem_class: str) -> Any:
    module = importlib.import_module(sim_module)
    try:
        return getattr(module, inverse_problem_class)
    except AttributeError as exc:  # pragma: no cover - defensive
        raise AttributeError(f"{sim_module!r} has no attribute {inverse_problem_class!r}") from exc


def verify_sim_gradients(
    sim_module: str,
    inverse_problem_class: str,
    test_points_file: str,
    *,
    rel_tol: float = 1e-5,
) -> GradientVerificationReport:
    """Run ``check_gradient`` at every canonical test point for one sim.

    ``test_points_file`` is a JSON document: a list of ``{"params": {...},
    "target": [...]}`` objects. Each point instantiates a fresh problem, sets
    its target, and cross-checks the autodiff gradient against finite
    differences at ``params``.
    """
    klass = _load_inverse_problem_class(sim_module, inverse_problem_class)
    points = json.loads(Path(test_points_file).read_text(encoding="utf-8"))
    if not isinstance(points, list):
        raise ValueError(f"{test_points_file!r} must contain a JSON list of test points")

    per_point: list[Any] = []
    for point in points:
        problem = klass()
        problem.set_target(np.asarray(point["target"], dtype=np.float64))
        report = problem.check_gradient(params=point["params"], rel_tol=rel_tol)
        per_point.append(report)

    passed = sum(1 for r in per_point if r.passed)
    return GradientVerificationReport(
        sim=sim_module,
        test_points_passed=passed,
        test_points_total=len(per_point),
        per_test_point=per_point,
        all_passed=passed == len(per_point) and len(per_point) > 0,
    )
