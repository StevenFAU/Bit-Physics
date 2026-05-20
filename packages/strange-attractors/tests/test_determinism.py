"""Determinism tests — Phase 2+ implementation contract.

Phase 1 Stage 2 ships these as failing imports per the spec's
TDD discipline.
"""

from __future__ import annotations

from strange_attractors.sim import sim_runner_seeded  # type: ignore[import-not-found]  # noqa: F401


def test_run_twice_bit_exact(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """`run_twice_and_diff` is byte-equal on a canonical seeded run."""
    raise NotImplementedError(
        "Phase 2+ implementation contract — Phase 1 ships only the failing import.",
    )


def test_cross_seed_distinct(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """Two distinct seeds produce distinct captures."""
    raise NotImplementedError(
        "Phase 2+ implementation contract — Phase 1 ships only the failing import.",
    )
