"""Variant tolerance spec + per-axis tolerance-budget enforcement (§4.2.F).

WU-F ratifies variant tolerances for the 27 Phase-4 frontier sims. Per spec §2.6
+ plan §7.7, a proposed variant tolerance must be within the per-axis cap;
``assert_within_budget`` raises :class:`ToleranceBudgetExceeded` otherwise (Cat-X
HARD_FAILs over-budget overrides). Widening a cap needs a separate
operator-approved tolerance-budget-amendment commit + audit.
"""

from __future__ import annotations

from dataclasses import dataclass

_NORMS = ("L2", "Linf", "wasserstein")


@dataclass
class VariantToleranceSpec:
    """Per-output-of-interest tolerance for variant-vs-reference comparison.

    Field names follow the §4.2.P canonical registry (e.g. ``"density"``).
    """

    output_name: str
    absolute_tol: float
    relative_tol: float
    norm: str  # "L2" | "Linf" | "wasserstein"

    def __post_init__(self) -> None:
        if self.norm not in _NORMS:
            raise ValueError(f"norm must be one of {_NORMS}; got {self.norm!r}")
        if self.absolute_tol < 0.0 or self.relative_tol < 0.0:
            raise ValueError("tolerances must be non-negative")


class ToleranceBudgetExceeded(Exception):
    """Raised when a proposed variant tolerance exceeds its per-axis budget cap."""


#: Per-axis tolerance-budget caps (plan §7.7 v9 addendum; numerically as specced).
#: ``*_max`` keys are ceilings (proposed must be <= cap); ``*_floor`` keys are
#: floors (proposed must be >= floor, for higher-is-better metrics).
_AXIS_BUDGETS: dict[str, dict[str, float]] = {
    # Differentiable: gradient verification — default 1e-3 rel, cap 1e-2.
    "differentiable": {"relative_max": 1e-2},
    # Sparse: sparse-vs-dense diff — default 1e-6 abs, cap 1e-4.
    "sparse": {"absolute_max": 1e-4},
    # Neural: render-similarity — default PSNR>=35/SSIM>=0.9, floor PSNR>=25/SSIM>=0.7.
    "neural": {"psnr_min_floor": 25.0, "ssim_min_floor": 0.7},
    # Frontier-algorithm: per-paper-specific; caps set per frontier paper at the
    # variant-stage dispatch — no fixed foundation cap.
    "frontier": {},
    # Newton-backed: USD-round-trip-fidelity — default fp32, cap fp16 (~2**-10).
    "newton": {"absolute_max": 9.765625e-4},
    # Learned-dynamics: rollout-stability — default norm-bound <=1.5x, cap <=3x.
    "learned": {"norm_bound_max": 3.0},
}

#: Convenience aliases for the variant-axis names.
_AXIS_ALIASES = {"diff": "differentiable", "neural-rendered": "neural", "newton-backed": "newton"}


def _canonical_axis(variant_axis: str) -> str:
    axis = _AXIS_ALIASES.get(variant_axis, variant_axis)
    if axis not in _AXIS_BUDGETS:
        raise ValueError(
            f"Unknown variant axis {variant_axis!r}; choose from {sorted(_AXIS_BUDGETS)}."
        )
    return axis


def budget_for_axis(variant_axis: str) -> dict[str, float]:
    """Return the per-axis budget caps (empty for ``frontier``)."""
    return dict(_AXIS_BUDGETS[_canonical_axis(variant_axis)])


def assert_within_budget(variant_axis: str, proposed_tolerance: dict[str, float]) -> None:
    """Raise :class:`ToleranceBudgetExceeded` if ``proposed_tolerance`` exceeds the cap.

    ``proposed_tolerance`` is a mapping of metric name -> value, e.g.
    ``{"relative": 5e-3}`` (differentiable), ``{"absolute": 1e-5}`` (sparse),
    ``{"psnr_min": 30.0, "ssim_min": 0.85}`` (neural), ``{"norm_bound": 2.0}``
    (learned). Metrics absent from the axis budget are ignored; ``frontier`` has
    no fixed cap (always within budget — the per-paper cap is set at dispatch).
    """
    budget = _AXIS_BUDGETS[_canonical_axis(variant_axis)]
    for key, cap in budget.items():
        # "relative_max" -> ("relative","max"); "psnr_min_floor" -> ("psnr_min","floor").
        metric, _, kind = key.rpartition("_")
        if metric not in proposed_tolerance:
            continue
        value = proposed_tolerance[metric]
        if kind == "max" and value > cap:
            raise ToleranceBudgetExceeded(
                f"{variant_axis}: proposed {metric}={value} exceeds budget cap {cap}"
            )
        if kind == "floor" and value < cap:
            raise ToleranceBudgetExceeded(
                f"{variant_axis}: proposed {metric}={value} below budget floor {cap}"
            )
