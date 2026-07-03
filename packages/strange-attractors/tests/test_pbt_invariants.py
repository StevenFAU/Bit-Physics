"""PBT invariant tests (gate 11; spec § 6.6).

Phase 1 shipped these as failing-imports; the closed-form sub-phase
Stage 1 fills in the bodies (SHIFTED per the Stage 1 checkpoint — the
imported invariants are Hypothesis-decorated callables defined in
``strange_attractors.invariants``).
"""

from __future__ import annotations

from strange_attractors.invariants import (
    aizawa_axis_fixed_points_null_field,
    chen_divergence_constant,
    chen_fixed_points_null_field,
    dadras_divergence_constant,
    dadras_origin_triangular_eigenvalues,
    fourwing_divergence_constant,
    fourwing_parity_equivariance,
    halvorsen_cyclic_equivariance,
    halvorsen_divergence_constant,
    thomas_cyclic_equivariance,
    thomas_divergence_constant,
    aizawa_divergence_matches_closed_form,
    rk4_time_reversibility_modulo_dissipation,
    rossler_divergence_affine_in_x,
    rossler_fixed_points_null_field,
    sprott_a_parity_equivariance,
    volume_contraction_rate_constant,
)


def test_lorenz_origin_volume_contraction() -> None:
    """Lorenz divergence is the canonical constant at any sampled point."""
    volume_contraction_rate_constant()


def test_rk4_time_reversibility_sprott_a() -> None:
    """Sprott-A RK4 round-trip error is O(dt^4)."""
    rk4_time_reversibility_modulo_dissipation()


# ---- X-A family expansion (≥ 2 invariants per system, spec § 6.6) ----


def test_rossler_divergence_affine_in_x() -> None:
    """Rössler div f = a + (x - c) at any sampled point."""
    rossler_divergence_affine_in_x()


def test_rossler_fixed_points_null_field() -> None:
    """Closed-form Rössler fixed points annihilate the field for any valid params."""
    rossler_fixed_points_null_field()


def test_aizawa_divergence_matches_closed_form() -> None:
    """Aizawa trace formula matches central differences at any sampled point."""
    aizawa_divergence_matches_closed_form()


def test_aizawa_axis_fixed_points_null_field() -> None:
    """Every real on-axis cubic root is a genuine Aizawa fixed point."""
    aizawa_axis_fixed_points_null_field()


def test_sprott_a_parity_equivariance() -> None:
    """Sprott-A f(Px) = P f(x) exactly, P = diag(-1, -1, 1)."""
    sprott_a_parity_equivariance()


# ---- X-B / X-C clusters (scope amendment, ratified 2026-07-03) ----


def test_thomas_divergence_constant() -> None:
    """Thomas div f = -3b anywhere, for any b."""
    thomas_divergence_constant()


def test_thomas_cyclic_equivariance() -> None:
    """Thomas f(Cx) = C f(x) exactly."""
    thomas_cyclic_equivariance()


def test_halvorsen_divergence_constant() -> None:
    """Halvorsen div f = -3a anywhere, for any a."""
    halvorsen_divergence_constant()


def test_halvorsen_cyclic_equivariance() -> None:
    """Halvorsen f(Cx) = C f(x) exactly."""
    halvorsen_cyclic_equivariance()


def test_dadras_divergence_constant() -> None:
    """Dadras div f = -p + r - e anywhere, for any (p, r, e)."""
    dadras_divergence_constant()


def test_dadras_origin_triangular_eigenvalues() -> None:
    """Dadras eig(J(0)) = (-p, r, -e) for any (p, r, e)."""
    dadras_origin_triangular_eigenvalues()


def test_chen_fixed_points_null_field() -> None:
    """Chen closed-form fixed points annihilate the field for any valid params."""
    chen_fixed_points_null_field()


def test_chen_divergence_constant() -> None:
    """Chen div f = c - a - b anywhere, for any (a, b, c)."""
    chen_divergence_constant()


def test_fourwing_parity_equivariance() -> None:
    """Four-wing f(Px) = P f(x) exactly."""
    fourwing_parity_equivariance()


def test_fourwing_divergence_constant() -> None:
    """Four-wing div f = a + d + e anywhere (canonical params)."""
    fourwing_divergence_constant()
