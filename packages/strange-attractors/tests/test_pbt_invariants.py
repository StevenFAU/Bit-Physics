"""PBT invariant tests — declarations per spec § 2.14 R9 amendment.

Phase 1 Stage 2 declares ≥ 2 invariants (lorenz_origin_volume_contraction,
rk4_time_reversibility_modulo_dissipation) in
``docs/sim-specs/closed-form/strange-attractors/spec-ref.md`` § 6.6.
Implementation lives at ``strange_attractors.invariants`` and is
deferred to Phase 2+; Stage 2 ships only the failing imports below.
"""

from __future__ import annotations

from strange_attractors.invariants import (  # type: ignore[import-not-found]  # noqa: F401
    rk4_time_reversibility_modulo_dissipation,
    volume_contraction_rate_constant,
)


def test_lorenz_origin_volume_contraction() -> None:
    raise NotImplementedError(
        "Phase 2+ — PBT implementation deferred per R9 amendment.",
    )


def test_rk4_time_reversibility_sprott_a() -> None:
    raise NotImplementedError(
        "Phase 2+ — PBT implementation deferred per R9 amendment.",
    )
