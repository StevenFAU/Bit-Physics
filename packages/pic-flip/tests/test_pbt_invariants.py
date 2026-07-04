"""PBT invariants — 6 declared in spec-ref § 6.6 (gate 12)."""

from __future__ import annotations

from pic_flip.invariants import (
    angular_momentum_conserved_across_transfers,
    angular_momentum_pic_negative_control,
    apic_affine_roundtrip_preserved,
    apic_roundtrip_pic_negative_control,
    divergence_free_post_projection_masked,
    divergence_matches_masked_operator,
    mass_momentum_conservation_p2g,
    partition_of_unity_quadratic_bspline,
    regularizers_inert_at_rest,
)


def test_partition_of_unity() -> None:
    partition_of_unity_quadratic_bspline()


def test_mass_momentum_conservation_p2g() -> None:
    mass_momentum_conservation_p2g()


def test_divergence_free_post_projection() -> None:
    divergence_free_post_projection_masked()


def test_affine_roundtrip_preserved() -> None:
    apic_affine_roundtrip_preserved()


def test_affine_roundtrip_pic_negative_control() -> None:
    apic_roundtrip_pic_negative_control()


def test_angular_momentum_conserved() -> None:
    angular_momentum_conserved_across_transfers()


def test_angular_momentum_pic_negative_control() -> None:
    angular_momentum_pic_negative_control()


def test_regularizers_inert_at_rest() -> None:
    regularizers_inert_at_rest()


def test_divergence_diagnostic_consistency() -> None:
    divergence_matches_masked_operator()
