"""Determinism harness (spec § 2.5).

Public surface pinned in `docs/phases/phase-0-plan.md` § 3.3.2.
"""

from __future__ import annotations

from .harness import DeterminismVerdict, SimRunner, run_twice_and_diff

__all__ = ["DeterminismVerdict", "SimRunner", "run_twice_and_diff"]
