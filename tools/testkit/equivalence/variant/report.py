"""``EquivalenceReport`` — variant-vs-reference comparison result (§4.2.F)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class EquivalenceReport:
    """Per-output variant-vs-reference equivalence verdict at a matched sim time."""

    passed: bool
    per_output_errors: dict[str, float]
    per_output_passed: dict[str, bool]
    reference_capture: str
    variant_capture: str
    at_sim_time: float
    reference_schema_version: str
    variant_schema_version: str
    skipped_fields: list[str]
