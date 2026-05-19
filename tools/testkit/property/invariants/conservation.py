"""Conservation invariants (mass / momentum / energy).

Each invariant compares a conserved scalar (sum of `field` per step, or
sum of `field_x` * weights for momentum / kinetic-energy-style sums)
against the step-0 reference and asserts the absolute drift is bounded.

These invariants are conservative by design: they detect monotonic drift
and arbitrary deviation, not natural floating-point noise.
"""

from __future__ import annotations

import numpy as np

from capture import Capture

from ..harness import Fail, Invariant, InvariantOutcome, Pass


def _check_scalar_conservation(
    capture: Capture, field: str, tolerance: float, label: str
) -> InvariantOutcome:
    step_states = list(capture.steps())
    if len(step_states) < 2:
        return Pass(detail=f"{label}: fewer than two steps; vacuously holds")
    if field not in step_states[0].state:
        return Fail(
            detail=f"{label}: field {field!r} missing from step 0",
            counter_example={"missing_field": field},
        )
    initial = float(np.sum(step_states[0].state[field]))
    drifts: list[tuple[int, float]] = []
    for s in step_states[1:]:
        if field not in s.state:
            return Fail(
                detail=f"{label}: field {field!r} missing from step {s.step}",
                counter_example={"missing_field": field, "step": s.step},
            )
        current = float(np.sum(s.state[field]))
        drift = abs(current - initial)
        drifts.append((s.step, drift))
        if drift > tolerance:
            return Fail(
                detail=(
                    f"{label}: drift {drift:g} at step {s.step} exceeds "
                    f"tolerance {tolerance:g} (initial sum {initial:g})"
                ),
                counter_example={
                    "step": s.step,
                    "initial_sum": initial,
                    "current_sum": current,
                    "drift": drift,
                },
            )
    return Pass(detail=f"{label}: drift bounded; max {max(d for _, d in drifts):g}")


def conservation_mass(field: str = "U", tolerance: float = 1e-8) -> Invariant:
    """Sum of `field` is conserved across all steps (absolute drift below tolerance)."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        return _check_scalar_conservation(capture, field, tolerance, label="mass")

    return Invariant(
        name=f"conservation_mass:{field}",
        applies_to_category="continuous-ca",
        check_fn=check_fn,
    )


def conservation_momentum(field: str = "P", tolerance: float = 1e-8) -> Invariant:
    """Sum of `field` is conserved across all steps."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        return _check_scalar_conservation(capture, field, tolerance, label="momentum")

    return Invariant(
        name=f"conservation_momentum:{field}",
        applies_to_category="particle-fluid",
        check_fn=check_fn,
    )


def conservation_energy(field: str = "E", tolerance: float = 1e-8) -> Invariant:
    """Sum of `field` (representing a quadratic energy) is conserved across all steps."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        return _check_scalar_conservation(capture, field, tolerance, label="energy")

    return Invariant(
        name=f"conservation_energy:{field}",
        applies_to_category="rigid-body",
        check_fn=check_fn,
    )
