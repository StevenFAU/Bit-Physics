"""Neural-CA PBT invariants (shared module form for per-sim consumption).

The in-package witness tests at
``packages/neural-ca/python/tests/test_pbt_invariants.py`` exercise these on
seed-sampled short inference rollouts of the trained checkpoint via the testkit
property harness; this shared module hosts the canonical predicate forms.

**Regime-scoping (charter § 6 D-DET; RE-DECLARED on evidence, NOT widened).**
The dispatch-suggested ``field_values_bounded`` as "all channels ∈ [0, 1]" is
mathematically FALSE for an NCA: only RGBA (channels 0-3) is interpreted; the 12
hidden channels (4-15) are UNBOUNDED real values that drift by design (measured:
a perturbed-weight model reaches |hidden| ≈ 2.5e7 after 30 steps; even RGBA-raw
diverges for an untrained model). The invariant is therefore scoped to the
implementation's regime: (a) the VISIBLE/clamped RGBA ∈ [0, 1] (the capture
clamps RGBA, mirroring the WGSL output), and (b) the FULL state stays FINITE
(no NaN/Inf — non-divergence) for the TRAINED checkpoint across sampled
fire-mask seeds. This is the free-cloth / lenia-monotone precedent
(re-declare-on-evidence, never widen a tolerance to force a falsified form).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from capture import Capture
from property.harness import Fail, Invariant, InvariantOutcome, Pass

# Channels 0-3 are RGBA (clamped to [0, 1] for the visible capture); 4-15 are
# unbounded hidden channels.
_RGBA = 4
_EPS = 1e-6


def rgba_clamped_in_unit_interval(rgba: NDArray[np.floating]) -> bool:
    """The visible (clamped) RGBA channels lie in [0, 1]."""
    a = np.asarray(rgba, dtype=np.float64)
    return bool(np.isfinite(a).all() and a.min() >= -_EPS and a.max() <= 1.0 + _EPS)


def state_is_finite(state: NDArray[np.floating]) -> bool:
    """The full cell state (all channels) is finite — non-divergence."""
    return bool(np.isfinite(np.asarray(state, dtype=np.float64)).all())


def field_values_bounded() -> Invariant:
    """Regime-scoped: at every captured step the full state is FINITE and the
    visible (clamped) RGBA channels lie in [0, 1]. Reads the raw ``state`` field
    (channel-first ``(C, H, W)``) written by the PBT runner."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        for stp in capture.steps():
            if "state" not in stp.state:
                return Fail(detail=f"missing field 'state' at step {stp.step}")
            state = np.asarray(stp.state["state"], dtype=np.float64)
            if not state_is_finite(state):
                return Fail(
                    detail=f"field_values_bounded: non-finite state at step {stp.step}",
                    counter_example={"step": stp.step},
                )
            rgba = np.clip(state[:_RGBA], 0.0, 1.0)
            if not rgba_clamped_in_unit_interval(rgba):
                return Fail(
                    detail=f"field_values_bounded: clamped RGBA out of [0,1] at step {stp.step}",
                    counter_example={"step": stp.step},
                )
        return Pass(detail="field_values_bounded: finite state + clamped RGBA ∈ [0,1] all steps")

    return Invariant(
        name="field_values_bounded",
        applies_to_category="continuous-ca",
        check_fn=check_fn,
    )
