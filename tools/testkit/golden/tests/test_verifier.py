"""Verifier API + behavior tests (Phase 0 plan § 3.3.4)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from golden import GoldenVerifierResult, verify_against_table
from golden.reference_implementations.cubic_spline import evaluate as reference_evaluate

_TABLE_PATH = Path(__file__).resolve().parent.parent / "tables" / "cubic-spline-kernel.json"


def test_verifier_passes_reference_implementation() -> None:
    """The canonical reference implementation matches every table entry."""
    result = verify_against_table(_TABLE_PATH, reference_evaluate)
    assert isinstance(result, GoldenVerifierResult)
    assert result.algorithm == "cubic-spline-kernel-3d-monaghan"
    assert result.points_tested == 9
    assert result.points_passed == 9
    assert result.failures == []
    assert result.ok is True


def test_verifier_fails_deliberately_wrong_implementation() -> None:
    """A wrong piecewise threshold (q=1.5 instead of q=1.0) MUST be detected."""

    def wrong_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
        q = float(inputs["q"])
        h = float(inputs["h"])
        sigma = 1.0 / 3.141592653589793
        # Use q=1.5 as the piecewise threshold instead of q=1.0 — a
        # plausible-looking but incorrect implementation.
        if q < 1.5:
            f = 1.0 - 1.5 * q * q + 0.75 * q * q * q
        elif q < 2.0:
            d = 2.0 - q
            f = 0.25 * d * d * d
        else:
            f = 0.0
        return {"W": sigma / (h**3) * f, "grad_W_magnitude": 0.0}

    result = verify_against_table(_TABLE_PATH, wrong_evaluator)
    assert result.ok is False
    assert result.points_passed < result.points_tested
    assert result.failures, "expected at least one failure on wrong evaluator"
    for failure in result.failures:
        assert "max_abs_err" in failure
        assert "max_rel_err" in failure
        assert "inputs" in failure


def test_verifier_returns_result_type_for_trivial_evaluator(tmp_path: Path) -> None:
    """API-contract test: return is a `GoldenVerifierResult` regardless of pass/fail.

    Uses a one-point fake table to keep the test orthogonal to the real
    cubic-spline table.
    """
    table = {
        "schema_version": "1.0.0",
        "algorithm": "fake-algo",
        "category": "test-fake",
        "derivation": {
            "doc": "n/a",
            "upstream": "n/a",
            "upstream_sha": "n/a",
            "upstream_path": "n/a",
        },
        "test_points": [
            {"inputs": {"x": 1.0}, "expected": {"y": 2.0}},
        ],
        "tolerance": {"absolute": 1e-9, "relative": 1e-9},
    }
    table_path = tmp_path / "fake.json"
    table_path.write_text(json.dumps(table), encoding="utf-8")

    result = verify_against_table(table_path, lambda inputs: {"y": 2.0})
    assert isinstance(result, GoldenVerifierResult)
    assert result.algorithm == "fake-algo"
    assert result.points_tested == 1
    assert result.points_passed == 1
    assert result.ok is True
    assert result.failures == []


def test_verifier_raises_on_missing_output_key(tmp_path: Path) -> None:
    """If an evaluator omits a required expected key, KeyError surfaces."""
    table = {
        "schema_version": "1.0.0",
        "algorithm": "fake-algo",
        "category": "test-fake",
        "derivation": {
            "doc": "n/a",
            "upstream": "n/a",
            "upstream_sha": "n/a",
            "upstream_path": "n/a",
        },
        "test_points": [
            {"inputs": {"x": 1.0}, "expected": {"y": 2.0, "z": 3.0}},
        ],
        "tolerance": {"absolute": 1e-9, "relative": 1e-9},
    }
    table_path = tmp_path / "fake.json"
    table_path.write_text(json.dumps(table), encoding="utf-8")

    with pytest.raises(KeyError):
        verify_against_table(table_path, lambda inputs: {"y": 2.0})
