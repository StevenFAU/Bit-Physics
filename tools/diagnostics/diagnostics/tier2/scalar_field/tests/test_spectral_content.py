"""Spectral-content tests."""

from __future__ import annotations

import pytest
from capture import Capture

from diagnostics.tier2.scalar_field.spectral_content import check_spectral_content


def test_low_wavenumber_field_passes(low_spectrum_capture: Capture) -> None:
    report = check_spectral_content(
        low_spectrum_capture, field="U", cutoff_fraction=0.5, max_high_fraction=0.05
    )
    assert report.ok is True
    assert report.first_offending_step is None
    # Every step's high-band fraction should be tiny.
    for _step, frac in report.per_step_high_fraction:
        assert frac < 0.05


def test_white_noise_fails(high_spectrum_capture: Capture) -> None:
    report = check_spectral_content(
        high_spectrum_capture, field="U", cutoff_fraction=0.5, max_high_fraction=0.05
    )
    assert report.ok is False
    assert report.first_offending_step is not None


def test_invalid_cutoff_raises(low_spectrum_capture: Capture) -> None:
    with pytest.raises(ValueError):
        check_spectral_content(low_spectrum_capture, field="U", cutoff_fraction=1.5)
    with pytest.raises(ValueError):
        check_spectral_content(low_spectrum_capture, field="U", max_high_fraction=-1.0)
