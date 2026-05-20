"""Tier 1 + Tier 2 closed_form diagnostics tests — Phase 2+ contract.

The Tier 2 closed_form check functions (IC-7) already exist at
``tools/diagnostics/diagnostics/tier2/closed_form/`` per Stage 1; this
test confirms they are *invoked* against the strange-attractors sim's
capture. Phase 1 ships failing imports.
"""

from __future__ import annotations

from strange_attractors.sim import sim_runner_seeded  # type: ignore[import-not-found]  # noqa: F401


def test_tier1_health_no_nan_inf() -> None:
    raise NotImplementedError("Phase 2+ contract.")


def test_tier2_closed_form_bound_preservation() -> None:
    raise NotImplementedError("Phase 2+ contract.")


def test_tier2_closed_form_output_stability_parameter_sweep() -> None:
    raise NotImplementedError("Phase 2+ contract.")


def test_tier2_closed_form_precision_sensitivity_single_vs_double() -> None:
    raise NotImplementedError("Phase 2+ contract.")
