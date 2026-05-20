"""PBT invariant tests — ≥ 2 invariants declared in spec § 6.6."""

from __future__ import annotations

from boids_3d.invariants import (  # type: ignore[import-not-found]  # noqa: F401
    particle_count_invariant,
    v_max_clamp_respected,
)


def test_v_max_clamp_respected() -> None:
    raise NotImplementedError("Phase 2+ — PBT implementation deferred.")


def test_particle_count_invariant() -> None:
    raise NotImplementedError("Phase 2+ — PBT implementation deferred.")
