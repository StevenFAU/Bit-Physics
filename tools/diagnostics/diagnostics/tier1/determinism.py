"""Tier 1 — determinism check.

Phase 0 plan § 3.3.6: composes ``run_twice_and_diff`` directly. No
re-implementation; the testkit's harness is the canonical determinism
oracle.
"""

from __future__ import annotations

from determinism import DeterminismVerdict, SimRunner, run_twice_and_diff


def check_determinism(runner: SimRunner, seed: int = 42) -> DeterminismVerdict:
    return run_twice_and_diff(runner, seed=seed)


__all__ = ["DeterminismVerdict", "check_determinism"]
