"""Property-based invariants for the frozen-gate DiffLogic CA (PBT source + mutation target).

Two regime-scoped invariants (charter § 3.2):

* :func:`hard_limit_matches_truth_table` - the variant-axis invariant: every soft gate
  evaluated at binary corners returns EXACTLY its boolean truth-table entry (the hard
  limit; multilinear extensions are exact small-integer arithmetic at corners). **Regime:**
  binary inputs; exact equality, no tolerance.
* :func:`gradient_matches_finite_difference` - the WU-A differentiable invariant: autodiff
  ``dLoss/dalpha`` agrees with central FD. **Regime:** alpha in [0,1] (state stays in
  [0,1]; the composed multilinear map is a smooth polynomial). Re-declared on
  falsification, never widened (HARD RULE 2).

Candidate third (exercised in goldens, not PBT-declared): soft-gate [0,1]-boundedness.
"""

from __future__ import annotations

from .forward import GATE_TRUTH_TABLES, DiffLogicConfig, soft_gate
from .sim import SoftExcitationID


def hard_limit_matches_truth_table(gate: int) -> bool:
    """True iff gate ``gate``'s multilinear extension is exact at all four binary corners."""
    t = GATE_TRUTH_TABLES[gate]
    return all(
        soft_gate(gate, float(a), float(b)) == float(t[a * 2 + b]) for a in (0, 1) for b in (0, 1)
    )


def gradient_matches_finite_difference(
    cfg: DiffLogicConfig,
    *,
    alpha: float,
    rel_tol: float = 1e-3,
    eps: float = 1e-6,
) -> bool:
    """True iff autodiff ``dLoss/dalpha`` matches central FD within ``rel_tol``.

    The target is the forward at a perturbed ``alpha`` so the gradient is non-zero (off
    the minimum). Soft-polynomial regime, alpha in [0,1]."""
    prob = SoftExcitationID(cfg)
    target = prob.final_state(min(1.0, float(alpha) + 0.15))
    prob.set_target(target)
    report = prob.check_gradient(params={"alpha": float(alpha)}, eps=eps, rel_tol=rel_tol)
    return bool(report.passed)
