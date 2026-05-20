"""PBT invariant tests (gate 12; spec § 6.6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies; the
continuous-CA-rd3d sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1 + agent-based
sub-phase Stage 1 audit S1; the imported invariants are Hypothesis-
decorated callables defined in ``reaction_diffusion_3d.invariants``).
"""

from __future__ import annotations

from reaction_diffusion_3d.invariants import (  # type: ignore[import-not-found]
    monotone_bounds,
    periodic_bc_satisfied,
)


def test_monotone_bounds() -> None:
    """U and V stay in [0, 1] across short canonical-parameter runs."""
    monotone_bounds()


def test_periodic_bc_satisfied() -> None:
    """Opposite-boundary cells agree to machine precision after each step."""
    periodic_bc_satisfied()
