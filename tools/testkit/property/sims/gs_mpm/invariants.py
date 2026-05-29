"""3dgs-mpm PBT invariants (shared module form; import package ``gs_mpm``).

Two invariants (charter § 6, deliverable L):

1. ``gaussian_count_invariant`` — the coupling neither creates nor destroys Gaussians:
   ``N`` Gaussians in == ``N`` out (and ``== N`` particles bound 1:1).
2. ``def_grad_determinant_positive`` — ``det(F) > 0`` for every particle (no element
   inversion). **ENVELOPE-SCOPED** to physically-valid material/ICs (the canonical scene
   under the canonical MPM drive); **RE-DECLARED on falsification, NOT widened** (the
   free-cloth / lenia / neural-ca precedent). A positive-determinant ``F`` keeps
   ``Σ' = F·A·Fᵀ`` SPD, so the deformed Gaussian stays a valid (positive-scale) ellipsoid.

The capture-based ``Invariant`` factories below read the ``particle_F`` /
``gaussian_scales`` state fields written by the sim's capture (spec-ref § 7); the
in-package witness tests at ``packages/3dgs-mpm/tests/test_pbt_invariants.py`` exercise the
predicate forms on Hypothesis-sampled batches.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from capture import Capture
from property.harness import Fail, Invariant, InvariantOutcome, Pass


def count_preserved(n_in: int, n_out: int, n_particles: int) -> bool:
    """Predicate: Gaussian count is conserved and matches the 1:1 particle binding."""
    return n_in == n_out == n_particles


def all_determinants_positive(deformation_gradients: NDArray[np.floating]) -> bool:
    """Predicate: every ``(3,3)`` deformation gradient has finite ``det > 0``."""
    f = np.asarray(deformation_gradients, dtype=np.float64)
    if f.ndim != 3 or f.shape[1:] != (3, 3):
        return False
    dets = np.linalg.det(f)
    return bool(np.isfinite(dets).all() and float(dets.min(initial=np.inf)) > 0.0)


def gaussian_count_invariant(expected_n: int) -> Invariant:
    """``Invariant``: the Gaussian-set size equals ``expected_n`` at every captured step."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        for stp in capture.steps():
            if "gaussian_scales" not in stp.state:
                return Fail(
                    detail=f"gaussian_count_invariant: missing gaussian_scales at step {stp.step}"
                )
            n = int(np.asarray(stp.state["gaussian_scales"]).shape[0])
            if n != expected_n:
                return Fail(
                    detail=f"gaussian_count_invariant: {n} != {expected_n} at step {stp.step}",
                    counter_example={"step": stp.step, "n": n},
                )
        return Pass(detail=f"gaussian_count_invariant: N == {expected_n} all steps")

    return Invariant(name="gaussian_count_invariant", check_fn=check_fn)


def def_grad_determinant_positive() -> Invariant:
    """``Invariant``: ``det(F) > 0`` for all particles at every captured step (no inversion)."""

    def check_fn(capture: Capture) -> InvariantOutcome:
        for stp in capture.steps():
            if "particle_F" not in stp.state:
                return Fail(
                    detail=f"def_grad_determinant_positive: missing particle_F at step {stp.step}"
                )
            f = np.asarray(stp.state["particle_F"], dtype=np.float64)
            if not all_determinants_positive(f):
                min_det = float(np.linalg.det(f.reshape(-1, 3, 3)).min())
                return Fail(
                    detail=f"det_positive: min det {min_det:.3e} <= 0 @step {stp.step}",
                    counter_example={"step": stp.step, "min_det": min_det},
                )
        return Pass(detail="def_grad_determinant_positive: det(F) > 0 all steps")

    return Invariant(name="def_grad_determinant_positive", check_fn=check_fn)
