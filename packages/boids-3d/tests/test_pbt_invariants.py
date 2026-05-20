"""PBT invariant tests (gate 11; spec § 6.6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the agent-based sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1; the imported
invariants are Hypothesis-decorated callables defined in
``boids_3d.invariants``).
"""

from __future__ import annotations

from boids_3d.invariants import (
    particle_count_invariant,
    v_max_clamp_respected,
)


def test_v_max_clamp_respected() -> None:
    """Reynolds clamp keeps every agent at or below v_max post-step."""
    v_max_clamp_respected()


def test_particle_count_invariant() -> None:
    """Reynolds step preserves agent count."""
    particle_count_invariant()
