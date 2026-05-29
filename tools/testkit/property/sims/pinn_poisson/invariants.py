"""PINN-Poisson PBT invariants (shared module form for per-sim consumption).

The in-package witness tests at
``packages/pinn-poisson/tests/test_pbt_invariants.py`` exercise these on
Hypothesis-sampled point batches of the trained network via the testkit property
surface; this shared module hosts the canonical predicate forms + ``Invariant``
factories (for harness consumers that read a residual-diagnostics capture).

**Regime-scoping (charter § 6; ENVELOPE-SCOPED, RE-DECLARED on evidence, NOT
widened).** A PINN does NOT extrapolate, and its soft-constraint residuals are NOT
zero — they are driven down to a small trained envelope. The invariants therefore
assert that, for points sampled **within the trained domain** ``[0,1]²``:

1. ``pde_residual_bounded`` — ``|Δu_NN(x,y) - f(x,y)|`` stays within the trained
   interior-residual envelope.
2. ``boundary_residual_bounded`` — ``|u_NN(x,y) - g(x,y)|`` stays within the trained
   boundary-residual envelope on ``∂Ω``.

The envelope magnitudes are MEASURED at Stage 1b-PINN (the trained residual scale +
a safety margin) and supplied by the caller — they are the training regime, not an
extrapolation claim. On falsification the regime is re-declared (never widen a
tolerance to force a falsified form — the free-cloth / lenia / neural-ca precedent).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from capture import Capture
from property.harness import Fail, Invariant, InvariantOutcome, Pass


def residual_within_envelope(values: NDArray[np.floating], envelope: float) -> bool:
    """Predicate: all ``|values|`` are finite and bounded by ``envelope``."""
    a = np.asarray(values, dtype=np.float64)
    return bool(np.isfinite(a).all() and float(np.abs(a).max(initial=0.0)) <= envelope)


def _bounded_invariant(name: str, field: str, envelope: float) -> Invariant:
    def check_fn(capture: Capture) -> InvariantOutcome:
        for stp in capture.steps():
            if field not in stp.state:
                return Fail(detail=f"{name}: missing field {field!r} at step {stp.step}")
            vals = np.asarray(stp.state[field], dtype=np.float64)
            if not residual_within_envelope(vals, envelope):
                return Fail(
                    detail=f"{name}: |{field}| exceeds envelope {envelope:.3e} at step {stp.step}",
                    counter_example={"step": stp.step, "max_abs": float(np.abs(vals).max())},
                )
        return Pass(detail=f"{name}: |{field}| <= {envelope:.3e} all steps")

    return Invariant(name=name, check_fn=check_fn)


def pde_residual_bounded(envelope: float) -> Invariant:
    """Interior PDE residual ``|Δu_NN - f|`` bounded by the trained envelope.

    Reads the ``pde_residual`` state field written by the PBT runner.
    """
    return _bounded_invariant("pde_residual_bounded", "pde_residual", envelope)


def boundary_residual_bounded(envelope: float) -> Invariant:
    """Boundary residual ``|u_NN - g|`` bounded by the trained envelope.

    Reads the ``boundary_residual`` state field written by the PBT runner.
    """
    return _bounded_invariant("boundary_residual_bounded", "boundary_residual", envelope)
