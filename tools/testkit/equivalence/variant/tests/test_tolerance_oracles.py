"""Oracle-grounded mutation-hardening for ``equivalence.variant.tolerance``.

Phase-4.1 foundation-hardening pass. Pins the previously-unexercised surface of
``tolerance.py``: the EXACT published floor value (Wang-style neural budget), the
floor-comparison inclusivity, and the two untested axis aliases (``test_tolerance.py``
exercises only the ``diff`` alias). Values are grounded in the plan §7.7 published
caps, not in code output.
"""

from __future__ import annotations

import pytest

from equivalence.variant import ToleranceBudgetExceeded, assert_within_budget, budget_for_axis


def test_neural_psnr_floor_is_exactly_25() -> None:
    """The neural PSNR floor is exactly 25.0 (plan §7.7), and the bound is inclusive.

    ``psnr_min = 25.0`` (exactly at the floor) must NOT raise: the criterion is
    ``value < floor`` (strict). This pins both the floor VALUE (a mutation to 26.0
    would reject 25.0) and the comparison inclusivity (``<`` vs ``<=`` would reject
    25.0). ``psnr_min = 24.999`` (one notch below) must raise.
    """
    assert_within_budget("neural", {"psnr_min": 25.0})  # exactly at floor → within
    with pytest.raises(ToleranceBudgetExceeded, match="psnr_min"):
        assert_within_budget("neural", {"psnr_min": 24.999})


def test_neural_ssim_floor_is_exactly_0_7() -> None:
    """The neural SSIM floor is exactly 0.7 (plan §7.7); inclusive at the floor."""
    assert_within_budget("neural", {"ssim_min": 0.7})  # exactly at floor → within
    with pytest.raises(ToleranceBudgetExceeded, match="ssim_min"):
        assert_within_budget("neural", {"ssim_min": 0.699})


def test_neural_rendered_alias_resolves_to_neural() -> None:
    """The ``neural-rendered`` alias maps to the ``neural`` axis (untested by test_tolerance).

    Kills the alias-dict key/value string mutations: a within-floor proposal under
    the alias must NOT raise, and the alias must expose the neural floor budget.
    """
    assert_within_budget("neural-rendered", {"psnr_min": 30.0})  # above floor → within
    assert budget_for_axis("neural-rendered") == {"psnr_min_floor": 25.0, "ssim_min_floor": 0.7}
    with pytest.raises(ToleranceBudgetExceeded, match="psnr_min"):
        assert_within_budget("neural-rendered", {"psnr_min": 20.0})


def test_newton_backed_alias_resolves_to_newton() -> None:
    """The ``newton-backed`` alias maps to the ``newton`` axis (untested by test_tolerance)."""
    assert_within_budget("newton-backed", {"absolute": 1e-6})  # fp32 → within
    assert budget_for_axis("newton-backed") == {"absolute_max": 9.765625e-4}
    with pytest.raises(ToleranceBudgetExceeded, match="absolute"):
        assert_within_budget("newton-backed", {"absolute": 1e-2})
