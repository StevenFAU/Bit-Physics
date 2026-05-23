"""PBT invariants for the Stack-D Gray-Scott port (spec-ref.md § 6).

Three invariants ported verbatim from Stack-B's
``packages/reaction-diffusion-2d/tests/test_pbt_invariants.py`` (same
algorithm, same physical contract; only the inner update primitive
differs — NumPy vectorised vs Taichi-DSL per-cell). Consumed by
``tests/test_pbt_invariants.py`` at ``n_examples = 20`` per
spec § 2.14 + phase-2-plan § 1.5.1 Gate 11.

- :func:`monotone_bounds_uv` — U, V each stay within ``[-slack, 1+slack]``
  at every step (default ``slack = 0.5`` per Stack-B's forward-Euler
  transient-overshoot PROXY-INVARIANT note).
- :func:`mass_approximately_conserved` — total mass drift bounded by
  source/sink capacity; tolerance 0.5 (Gray-Scott is non-conservative).
- :func:`periodic_bc_satisfied` — opposite-boundary values agree within
  tolerance (boundary-smoothness proxy for the periodic-stencil contract).
"""

from __future__ import annotations

import numpy as np
from capture import Capture
from property.harness import Fail, Invariant, InvariantOutcome, Pass


def monotone_bounds_uv(slack: float = 0.5) -> Invariant:
    """U, V each stay within ``[-slack, 1 + slack]`` at every step.

    PROXY-INVARIANT note (mirrors Stack-B): the continuous Gray-Scott PDE
    preserves U, V ∈ [0, 1] *only* when starting from physically
    meaningful ICs (``U₀ ≈ 1, V₀ ≈ 0`` modulo a small seed). Hypothesis-
    generated smooth random ICs in [0, 1] can drive forward-Euler
    transient overshoots of O(F·Δt) per step on either species. The
    Phase-0/Phase-2 invariant accepts a generous slack (default 0.5) so
    it detects catastrophic blow-up (NaN-driven runaway, sign flip,
    >50% over-/under-shoot) without false-positiving on arbitrary smooth
    ICs. The strict-bound invariant (``slack = 1e-9``) belongs to the
    canonical-seed diagnostics test, not the PBT sweep.
    """

    def check_fn(capture: Capture) -> InvariantOutcome:
        lo = -slack
        hi = 1.0 + slack
        for s in capture.steps():
            for fld in ("U", "V"):
                if fld not in s.state:
                    return Fail(detail=f"missing field {fld!r} at step {s.step}")
                arr = s.state[fld]
                mn, mx = float(np.min(arr)), float(np.max(arr))
                if not np.isfinite(mn) or not np.isfinite(mx) or mn < lo or mx > hi:
                    return Fail(
                        detail=(
                            f"monotone_bounds: {fld} out of [{lo}, {hi}] at step "
                            f"{s.step}: min={mn}, max={mx}"
                        ),
                        counter_example={"step": s.step, "field": fld, "min": mn, "max": mx},
                    )
        return Pass(detail=f"monotone_bounds: U, V in [{lo}, {hi}] across all steps")

    return Invariant(
        name="monotone_bounds_uv",
        applies_to_category="continuous-ca",
        check_fn=check_fn,
    )


def mass_approximately_conserved(tolerance: float = 0.5) -> Invariant:
    """``Sum(U) + Sum(V)`` doesn't drift more than ``tolerance * initial`` per step.

    Gray-Scott is not strictly conservative (feed + kill terms force the
    sum); this invariant checks the drift stays bounded by the source/sink
    capacity rather than asserting exact conservation. Tolerance is wide
    on purpose: PBT counter-examples should surface for catastrophic
    blow-up (NaN-driven sum collapse), not for ordinary Gray-Scott
    dynamics.
    """

    def check_fn(capture: Capture) -> InvariantOutcome:
        steps = list(capture.steps())
        if len(steps) < 2:
            return Pass(detail="fewer than two steps; vacuously holds")
        initial = float(
            np.sum(steps[0].state.get("U", np.zeros(0)))
            + np.sum(steps[0].state.get("V", np.zeros(0)))
        )
        for s in steps[1:]:
            current = float(
                np.sum(s.state.get("U", np.zeros(0))) + np.sum(s.state.get("V", np.zeros(0)))
            )
            drift = abs(current - initial)
            cap = tolerance * max(abs(initial), 1.0)
            if drift > cap:
                return Fail(
                    detail=(
                        f"mass drift {drift:g} exceeds {cap:g} at step "
                        f"{s.step} (initial={initial:g}, current={current:g})"
                    ),
                    counter_example={"step": s.step, "drift": drift, "initial": initial},
                )
        return Pass(detail="mass drift bounded across all steps")

    return Invariant(
        name="mass_approximately_conserved",
        applies_to_category="continuous-ca",
        check_fn=check_fn,
    )


def periodic_bc_satisfied(tolerance: float = 1e-10) -> Invariant:
    """Opposite-boundary values agree at every step (smoothness proxy).

    Gray-Scott's periodic BCs make the *stencil-wrap* consistent at every
    step; the Phase-0 simplification used by Stack-B (and inherited here)
    checks the field's edge cells are close in value — a smoothness proxy
    that PBT smooth-IC strategies satisfy by construction. Tolerance
    defaults at 1e-10 (ULP-bound); callers (the test surface) raise it to
    2.0 to accommodate arbitrary smooth ICs.
    """

    def check_fn(capture: Capture) -> InvariantOutcome:
        for s in capture.steps():
            for fld in ("U", "V"):
                if fld not in s.state:
                    continue
                arr = s.state[fld]
                if arr.ndim != 2:
                    return Fail(
                        detail=f"periodic_bc: field {fld!r} must be 2-D, got shape {arr.shape}",
                        counter_example={"step": s.step, "field": fld, "shape": arr.shape},
                    )
                top_bottom = float(np.max(np.abs(arr[0, :] - arr[-1, :])))
                left_right = float(np.max(np.abs(arr[:, 0] - arr[:, -1])))
                if top_bottom > tolerance or left_right > tolerance:
                    return Fail(
                        detail=(
                            f"periodic_bc: large jump at boundary of {fld!r} "
                            f"at step {s.step}; top-bottom={top_bottom:g}, "
                            f"left-right={left_right:g}"
                        ),
                        counter_example={
                            "step": s.step,
                            "field": fld,
                            "top_bottom": top_bottom,
                            "left_right": left_right,
                        },
                    )
        return Pass(detail="periodic boundary agreement holds")

    return Invariant(
        name="periodic_bc_satisfied",
        applies_to_category="continuous-ca",
        check_fn=check_fn,
    )
