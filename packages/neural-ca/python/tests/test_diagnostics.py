"""Gate-5/6 — Tier-1/Tier-2 diagnostics on the canonical D-inference capture.

Tier-1 (NaN/Inf health) + Tier-2 (scalar-field bounds, RGBA ∈ [0,1]) consumed via
the generic ``diagnostics`` surfaces. The sim-specific Tier-3 ``neural_ca`` module
(``tools/diagnostics/tier3/neural_ca/``) is a STANDALONE deliverable verified in
the Stage-1c audit (mirrors the lenia/ising/cloth/rigid-body tier3 precedent —
``tier3`` is not an importable package; it is path-loaded for verification).
"""

from __future__ import annotations

import pytest
from capture import load_capture
from diagnostics.tier1.health import check_health
from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds

from .conftest import D_INFERENCE_CAPTURE

pytestmark = pytest.mark.skipif(
    not D_INFERENCE_CAPTURE.exists(),
    reason="D-inference capture not present (Stage 1b-D generates it)",
)


def test_canonical_capture_is_healthy() -> None:
    capture = load_capture(D_INFERENCE_CAPTURE.with_suffix(".json"))
    report = check_health(capture)
    assert report.ok, (
        f"canonical neural-ca capture has NaN/Inf: nan={report.nan_count}, "
        f"inf={report.inf_count}, first_step={report.first_offending_step}"
    )


def test_canonical_capture_rgba_in_unit_interval() -> None:
    capture = load_capture(D_INFERENCE_CAPTURE.with_suffix(".json"))
    report = check_bounds(capture, field="rgba", lo=0.0, hi=1.0)
    assert report.ok, f"rgba bounds violations: {report.violations[:3]}"
