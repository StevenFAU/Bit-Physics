"""Gate 11 — Property-based invariants for the Stack-D sph-water port.

The same TWO invariants Stack-B declares at spec-ref.md § 6.6 ported verbatim
(same algorithm, same invariants — exactly 2 per probe finding, NOT 3 like
RD-2D):

- ``density_nonneg``: SPH density stays non-negative under random valid
  particle configurations.
- ``kernel_normalization_unit_volume``: the cubic-spline self-contribution
  matches sigma_3 / h^3 at the kernel peak.

The Stack-D invariants module ``sph_water_stack_d.invariants`` does NOT exist
at the failing-tests commit — collection fails with ``ModuleNotFoundError``
cleanly until Stage 1b implements it.
"""

from __future__ import annotations

from sph_water_stack_d.invariants import (  # type: ignore[import-not-found]
    density_nonneg,
    kernel_normalization_unit_volume,
)


def test_density_nonneg() -> None:
    """SPH density stays non-negative under random configurations."""
    density_nonneg()


def test_kernel_normalization_unit_volume() -> None:
    """Self-contribution alone matches sigma_3 / h^3 at the kernel peak."""
    kernel_normalization_unit_volume()
