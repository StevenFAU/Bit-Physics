"""MMS-based OOA test for eulerian-smoke (Taylor-Green-style NS-2D)."""

from __future__ import annotations

from eulerian_smoke.reference import stable_fluids_step  # type: ignore[import-not-found]  # noqa: F401


def test_mms_observed_ooa_advection_matches_formal() -> None:
    raise NotImplementedError("Phase 2+ contract.")


def test_mms_observed_ooa_projection_matches_formal() -> None:
    raise NotImplementedError("Phase 2+ contract.")
