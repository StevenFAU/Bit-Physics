"""Gradient-verification harness (Layer 0 code-verification; plan § 4.2.A).

Testkit-side companion to ``common_py.autodiff`` / ``common_warp.autodiff``:
validates that a differentiable sim's autodiff gradients agree with finite
differences across a canonical test-point set. Consumed by Phase 4.1's six
differentiable sims' acceptance suites.
"""

from __future__ import annotations

from .harness import verify_sim_gradients
from .report import GradientVerificationReport

__all__ = [
    "GradientVerificationReport",
    "verify_sim_gradients",
]
