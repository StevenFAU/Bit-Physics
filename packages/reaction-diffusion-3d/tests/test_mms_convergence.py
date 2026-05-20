"""MMS-based code-verification test for RD-3D.

Runs a 3-grid convergence study against the manufactured solution at
``tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/``
and asserts observed order of accuracy matches the formal order
(p_formal = 2) within ±0.5 per spec § 2.2.

Phase 1 state: ``reaction_diffusion_3d.reference`` does not exist;
the test fails with ``ModuleNotFoundError``.
"""

from __future__ import annotations

from reaction_diffusion_3d.reference import (  # type: ignore[import-not-found]  # noqa: F401
    gray_scott_step_with_source,
)


def test_mms_observed_ooa_matches_formal_within_half_an_order() -> None:
    raise NotImplementedError("Phase 2+ contract.")
