"""PBT invariant tests — ≥ 2 invariants declared in spec § 6.6."""

from __future__ import annotations

from physarum.invariants import (  # type: ignore[import-not-found]  # noqa: F401
    agent_count_invariant,
    trail_mass_conserves_modulo_decay,
)


def test_trail_mass_conserves_modulo_decay() -> None:
    raise NotImplementedError("Phase 2+ — PBT implementation deferred.")


def test_agent_count_invariant() -> None:
    raise NotImplementedError("Phase 2+ — PBT implementation deferred.")
