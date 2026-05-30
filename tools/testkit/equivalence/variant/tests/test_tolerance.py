"""``equivalence.variant.tolerance`` tests — spec validation + per-axis budgets."""

from __future__ import annotations

import pytest

from equivalence.variant import (
    ToleranceBudgetExceeded,
    VariantToleranceSpec,
    assert_within_budget,
    budget_for_axis,
)


def test_spec_validates_norm_and_signs() -> None:
    VariantToleranceSpec(output_name="density", absolute_tol=1e-4, relative_tol=1e-3, norm="L2")
    with pytest.raises(ValueError, match="norm"):
        VariantToleranceSpec(output_name="d", absolute_tol=0.0, relative_tol=0.0, norm="L3")
    with pytest.raises(ValueError, match="non-negative"):
        VariantToleranceSpec(output_name="d", absolute_tol=-1.0, relative_tol=0.0, norm="L2")


def test_unknown_axis_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown variant axis"):
        assert_within_budget("bogus", {"relative": 1e-3})


def test_differentiable_budget() -> None:
    assert_within_budget("differentiable", {"relative": 1e-3})  # default, within
    assert_within_budget("diff", {"relative": 1e-2})  # at cap, alias
    with pytest.raises(ToleranceBudgetExceeded, match="relative"):
        assert_within_budget("differentiable", {"relative": 2e-2})


def test_sparse_budget() -> None:
    assert_within_budget("sparse", {"absolute": 1e-6})
    with pytest.raises(ToleranceBudgetExceeded, match="absolute"):
        assert_within_budget("sparse", {"absolute": 1e-3})


def test_neural_floor_budget() -> None:
    assert_within_budget("neural", {"psnr_min": 35.0, "ssim_min": 0.9})  # defaults, above floor
    with pytest.raises(ToleranceBudgetExceeded, match="psnr_min"):
        assert_within_budget("neural", {"psnr_min": 20.0})
    with pytest.raises(ToleranceBudgetExceeded, match="ssim_min"):
        assert_within_budget("neural", {"ssim_min": 0.5})


def test_newton_fp16_budget() -> None:
    assert_within_budget("newton", {"absolute": 1e-6})  # fp32, within
    with pytest.raises(ToleranceBudgetExceeded, match="absolute"):
        assert_within_budget("newton", {"absolute": 1e-2})


def test_learned_norm_bound_budget() -> None:
    assert_within_budget("learned", {"norm_bound": 1.5})  # default
    assert_within_budget("learned", {"norm_bound": 3.0})  # at cap
    with pytest.raises(ToleranceBudgetExceeded, match="norm_bound"):
        assert_within_budget("learned", {"norm_bound": 4.0})


def test_frontier_has_no_fixed_cap() -> None:
    assert_within_budget("frontier", {"relative": 1.0, "absolute": 1.0})  # no cap
    assert budget_for_axis("frontier") == {}


def test_budget_for_axis_returns_caps() -> None:
    assert budget_for_axis("differentiable") == {"relative_max": 1e-2}
    assert budget_for_axis("learned") == {"norm_bound_max": 3.0}
