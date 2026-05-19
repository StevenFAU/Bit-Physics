"""Scalar-field invariants (monotone bounds, prescribed-divergence-free)."""

from __future__ import annotations

import numpy as np

from capture import Capture

from ..harness import Fail, Invariant, InvariantOutcome, Pass


def monotone_bounds(field: str, lo: float, hi: float) -> Invariant:
    """Field stays within [lo, hi] at every step.

    Block-6 (DIAGNOSTICS) ships the same logical check at Tier 2; the PBT
    version uses Hypothesis-generated ICs to find counter-examples that a
    fixed-IC sweep would miss.
    """

    def check_fn(capture: Capture) -> InvariantOutcome:
        for s in capture.steps():
            if field not in s.state:
                return Fail(
                    detail=f"monotone_bounds: field {field!r} missing at step {s.step}",
                    counter_example={"missing_field": field, "step": s.step},
                )
            arr = s.state[field]
            if arr.size == 0:
                continue
            mn = float(np.min(arr))
            mx = float(np.max(arr))
            if mn < lo or mx > hi:
                return Fail(
                    detail=(
                        f"monotone_bounds: field {field!r} out of [{lo}, {hi}] "
                        f"at step {s.step}: min={mn}, max={mx}"
                    ),
                    counter_example={"step": s.step, "min": mn, "max": mx},
                )
        return Pass(detail=f"monotone_bounds: {field} in [{lo}, {hi}] across all steps")

    return Invariant(
        name=f"monotone_bounds:{field}:[{lo},{hi}]",
        applies_to_category="continuous-ca",
        check_fn=check_fn,
    )


def divergence_free_where_prescribed(
    field_x: str = "Vx",
    field_y: str = "Vy",
    tolerance: float = 1e-6,
) -> Invariant:
    """Discrete divergence of (field_x, field_y) is below tolerance per step.

    The discrete divergence uses periodic differences via `np.roll`. Phase-1+
    sims may swap in stencils that match their grid conventions.
    """

    def check_fn(capture: Capture) -> InvariantOutcome:
        for s in capture.steps():
            if field_x not in s.state or field_y not in s.state:
                return Fail(
                    detail=(
                        f"divergence_free_where_prescribed: missing field "
                        f"({field_x!r} or {field_y!r}) at step {s.step}"
                    ),
                    counter_example={"step": s.step},
                )
            vx = s.state[field_x]
            vy = s.state[field_y]
            if vx.shape != vy.shape:
                return Fail(
                    detail=(
                        f"divergence_free_where_prescribed: shape mismatch "
                        f"at step {s.step}: {vx.shape} vs {vy.shape}"
                    ),
                    counter_example={"step": s.step},
                )
            div = (np.roll(vx, -1, axis=-1) - np.roll(vx, 1, axis=-1)) * 0.5
            if vx.ndim > 1:
                div = div + ((np.roll(vy, -1, axis=-2) - np.roll(vy, 1, axis=-2)) * 0.5)
            mx = float(np.max(np.abs(div)))
            if mx > tolerance:
                return Fail(
                    detail=(
                        f"divergence_free_where_prescribed: |div|_max={mx:g} > "
                        f"{tolerance:g} at step {s.step}"
                    ),
                    counter_example={"step": s.step, "max_abs_div": mx},
                )
        return Pass(
            detail=f"divergence_free_where_prescribed: |div|<= {tolerance} across all steps"
        )

    return Invariant(
        name=f"divergence_free_where_prescribed:({field_x},{field_y})",
        applies_to_category="incompressible-flow",
        check_fn=check_fn,
    )
