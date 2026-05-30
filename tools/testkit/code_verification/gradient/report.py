"""Gradient-verification report dataclass (plan § 4.2.A testkit companion)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class GradientVerificationReport:
    """Aggregate of per-test-point autodiff-vs-finite-difference checks.

    ``per_test_point`` holds the backend-native ``GradientCheckReport`` objects
    returned by ``InverseProblem.check_gradient`` (``common_py.autodiff`` or
    ``common_warp.autodiff`` — duck-typed on ``.passed``).
    """

    sim: str
    test_points_passed: int
    test_points_total: int
    per_test_point: list[Any]
    all_passed: bool
