"""Ising-classical PBT invariants (shared module form for per-sim consumption)."""

from __future__ import annotations

from .invariants import (
    energy_per_spin_bounded_invariant,
    magnetization_bounded_invariant,
)

__all__ = [
    "energy_per_spin_bounded_invariant",
    "magnetization_bounded_invariant",
]
