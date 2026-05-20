"""PBT invariant tests (gate 11; spec § 6.6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the agent-based sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1; the imported
invariants are Hypothesis-decorated callables defined in
``physarum.invariants``).
"""

from __future__ import annotations

from physarum.invariants import (
    agent_count_invariant,
    trail_mass_conserves_modulo_decay,
)


def test_trail_mass_conserves_modulo_decay() -> None:
    """Mass-balance recurrence holds for random IC."""
    trail_mass_conserves_modulo_decay()


def test_agent_count_invariant() -> None:
    """Jones-2010 step preserves agent count."""
    agent_count_invariant()
