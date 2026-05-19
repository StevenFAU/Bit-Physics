"""Conservation tests."""

from __future__ import annotations

import pytest
from capture import Capture

from diagnostics.tier2.scalar_field.conservation import check_conservation


def test_conserved_passes(conserving_capture: Capture) -> None:
    report = check_conservation(conserving_capture, field="U", rtol=1e-12)
    assert report.ok is True
    assert report.max_abs_drift == 0.0
    assert report.first_offending_step is None


def test_leaky_fails(leaky_capture: Capture) -> None:
    report = check_conservation(leaky_capture, field="U", rtol=1e-12)
    assert report.ok is False
    assert report.max_abs_drift > 0.0
    assert report.first_offending_step is not None


def test_invalid_tolerance_raises(conserving_capture: Capture) -> None:
    with pytest.raises(ValueError):
        check_conservation(conserving_capture, field="U", atol=-1.0)
    with pytest.raises(ValueError):
        check_conservation(conserving_capture, field="U", rtol=-1.0)
