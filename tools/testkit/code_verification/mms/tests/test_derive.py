"""Test (a) -- the derive pipeline reproduces the expected source term.

The expected source for u(x, t) = sin(2 pi x / L) cos(t) under
u_t = D u_xx + S is
    S(x, t) = sin(2 pi x / L) * [D (2 pi / L)^2 cos(t) - sin(t)]
which simplifies symbolically. We assert that `derive_heat_1d()` returns
a symbolically-equal expression and that re-rendering the markdown report
is deterministic (idempotent regeneration -- spec § 2.2).
"""

from __future__ import annotations

import sympy as sp

from code_verification.mms.derive import (
    derive_heat_1d,
    render_markdown,
    write_derivation,
)


def test_derive_heat_1d_matches_expected_source() -> None:
    result = derive_heat_1d()
    x, t = result.coordinate, result.time
    L = result.parameters["L"]
    D = result.parameters["D"]
    k = 2 * sp.pi / L
    expected = sp.sin(k * x) * (D * k**2 * sp.cos(t) - sp.sin(t))
    assert sp.simplify(result.source_symbolic - expected) == 0


def test_derive_heat_1d_solution_substituted_yields_residual_zero() -> None:
    """Substituting u into u_t - D u_xx - S must be identically zero."""
    result = derive_heat_1d()
    x, t = result.coordinate, result.time
    D = result.parameters["D"]
    u = result.u_symbolic
    residual = sp.diff(u, t) - D * sp.diff(u, x, 2) - result.source_symbolic
    assert sp.simplify(residual) == 0


def test_render_markdown_is_deterministic() -> None:
    a = render_markdown(derive_heat_1d())
    b = render_markdown(derive_heat_1d())
    assert a == b
    assert "# MMS derivation" in a


def test_write_derivation_round_trip(tmp_path) -> None:  # type: ignore[no-untyped-def]
    target = tmp_path / "derivation.md"
    write_derivation(target)
    assert target.exists()
    assert "Source term" in target.read_text(encoding="utf-8")
