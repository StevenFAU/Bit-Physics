"""Meta-test for the ``mutation-promoted-floor`` gate (Phase-4.1 §2.13 wiring).

Asserts the gate enforces that every ``posture: HARD_FAIL-at-landing`` target in
the latest ``phase-*-hardening-*.json`` ledger meets its floor: PASSES when all
promoted targets are at/above floor, FAILS when one regresses below, and PASSES
trivially when no hardening ledger is present (additive gate). Also confirms the
committed Phase-4.1 ledger itself passes.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from integrity.scripts.gate_helpers import _mutation_promoted_floor


def _write_ledger(tmp_path: Path, targets: list[dict]) -> None:
    mdir = tmp_path / "tools" / "testkit" / "mutation"
    mdir.mkdir(parents=True, exist_ok=True)
    (mdir / "phase-4.1-hardening-2026-01-01T00-00-00Z.json").write_text(
        json.dumps({"kind": "test", "targets": targets}), encoding="utf-8"
    )


def test_passes_when_promoted_targets_meet_floor(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    _write_ledger(
        tmp_path,
        [
            {
                "target": "render_similarity",
                "threshold": 0.85,
                "score": 0.92,
                "posture": "HARD_FAIL-at-landing",
            },
            {
                "target": "variant",
                "threshold": 0.85,
                "score": 0.87,
                "posture": "HARD_FAIL-at-landing",
            },
            {
                "target": "common_3dgs",
                "threshold": 0.80,
                "score": 0.77,
                "posture": "SOFT_WARN-advisory",
            },
        ],
    )
    monkeypatch.chdir(tmp_path)
    assert _mutation_promoted_floor() == 0


def test_fails_when_a_promoted_target_regresses_below_floor(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    _write_ledger(
        tmp_path,
        [
            {
                "target": "render_similarity",
                "threshold": 0.85,
                "score": 0.84,
                "posture": "HARD_FAIL-at-landing",
            },
        ],
    )
    monkeypatch.chdir(tmp_path)
    assert _mutation_promoted_floor() == 1


def test_advisory_target_below_floor_does_not_fail_the_gate(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    # An advisory target far below floor must NOT block (only promoted targets gate).
    _write_ledger(
        tmp_path,
        [
            {
                "target": "property",
                "threshold": 0.80,
                "score": 0.10,
                "posture": "SOFT_WARN-advisory",
            },
        ],
    )
    monkeypatch.chdir(tmp_path)
    assert _mutation_promoted_floor() == 0


def test_passes_trivially_when_no_hardening_ledger(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    (tmp_path / "tools" / "testkit" / "mutation").mkdir(parents=True, exist_ok=True)
    monkeypatch.chdir(tmp_path)
    assert _mutation_promoted_floor() == 0


def test_committed_phase_4_1_ledger_passes(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    # The real committed ledger (run from the repo root) must pass — the two
    # promoted targets (render_similarity 0.9242, variant 0.8702) are above floor.
    repo_root = Path(__file__).resolve().parents[3]
    monkeypatch.chdir(repo_root)
    if not sorted((repo_root / "tools" / "testkit" / "mutation").glob("phase-*-hardening-*.json")):
        pytest.skip("no committed hardening ledger at repo root")
    assert _mutation_promoted_floor() == 0
