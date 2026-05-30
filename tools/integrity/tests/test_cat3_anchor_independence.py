"""Cat 3 anchor-INDEPENDENCE gate (back-test re-audit M-3 / M-4 / M-5).

The prior gate counted test_points that merely HAD an ``independent_reference``
field, so three IDENTICAL anchors passed the spec §2.4 ≥3-independent-anchor
requirement (rigid-body-6dof and -double-pendulum slipped through with a single
restated invariant). These tests pin the fixed semantics: ≥3 DISTINCT normalized
sources for non-exempt tables, an explicit numerical-baseline exemption, and the
de-hard-coded recursive subdir walk.
"""

from __future__ import annotations

import json
from pathlib import Path

from integrity.cat3_numerical.golden_values import (
    _distinct_anchor_sources,
    _is_section_2_4_exempt,
    run_cat3_golden_values,
)
from integrity.common.types import FailureMode

_TABLES_REL = Path("tools/testkit/golden/tables")


def _anchor(src: str) -> dict:
    return {
        "inputs": {"x": 0},
        "expected": {"v": 0.0},
        "independent_reference": {"source": src, "derived_by": "test"},
    }


def _table(sources: list[str], *, upstream: str = "textbook X") -> dict:
    return {
        "schema_version": "1.0.0",
        "algorithm": "unregistered-test-algorithm",  # -> numeric verify skipped
        "category": "closed-form",
        "derivation": {
            "doc": "d",
            "upstream": upstream,
            "upstream_sha": "n/a",
            "upstream_path": "n/a",
        },
        "test_points": [_anchor(s) for s in sources],
        "tolerance": {"absolute": 1e-9, "relative": 1e-9},
    }


def _write(repo: Path, rel: str, table: dict) -> Path:
    p = repo / _TABLES_REL / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(table), encoding="utf-8")
    return _TABLES_REL / rel


def _hard_fails(findings) -> list:
    return [f for f in findings if f.severity == FailureMode.HARD_FAIL]


# --- unit: the two new helpers ---


def test_distinct_sources_collapses_identical_and_whitespace() -> None:
    table = _table(["Onsager 1944", "onsager  1944", "ONSAGER 1944"])
    assert _distinct_anchor_sources(table) == {"onsager 1944"}


def test_distinct_sources_counts_genuinely_distinct() -> None:
    table = _table(["A 2001", "B 2002", "C 2003"])
    assert len(_distinct_anchor_sources(table)) == 3


def test_exempt_detection_on_numerical_baseline_upstream() -> None:
    assert _is_section_2_4_exempt(_table(["x"], upstream="n/a-numerical-baseline"))
    assert not _is_section_2_4_exempt(_table(["x"], upstream="Marion & Thornton"))


# --- gate behaviour ---


def test_three_identical_anchors_hard_fail(tmp_path: Path) -> None:
    """THE gate proof: three restatements of ONE source must HARD_FAIL."""
    rel = _write(tmp_path, "identical.json", _table(["E(t)=E(0)"] * 3))
    findings = run_cat3_golden_values(tmp_path, [rel])
    hf = _hard_fails(findings)
    assert len(hf) == 1
    assert "DISTINCT" in hf[0].message
    assert "1 DISTINCT" in hf[0].message


def test_three_distinct_anchors_pass(tmp_path: Path) -> None:
    rel = _write(tmp_path, "distinct.json", _table(["A 1", "B 2", "C 3"]))
    assert _hard_fails(run_cat3_golden_values(tmp_path, [rel])) == []


def test_two_distinct_anchors_hard_fail(tmp_path: Path) -> None:
    """Two distinct sources is still short of the §2.4 minimum of three."""
    rel = _write(tmp_path, "two.json", _table(["A 1", "B 2", "A 1"]))
    hf = _hard_fails(run_cat3_golden_values(tmp_path, [rel]))
    assert len(hf) == 1
    assert "2 DISTINCT" in hf[0].message


def test_numerical_baseline_is_exempt_not_failed(tmp_path: Path) -> None:
    """An explicit numerical baseline with 1 distinct source is exempt (AUDIT_LOG)."""
    rel = _write(
        tmp_path,
        "baseline.json",
        _table(["E(t)=E(0)"] * 4, upstream="n/a-numerical-baseline"),
    )
    findings = run_cat3_golden_values(tmp_path, [rel])
    assert _hard_fails(findings) == []
    assert any(
        f.severity == FailureMode.AUDIT_LOG and "exempt numerical baseline" in f.message
        for f in findings
    )


def test_nested_subdir_table_is_picked_up(tmp_path: Path) -> None:
    """M-3 secondary: a golden in an UNLISTED subdir is no longer skipped."""
    rel = _write(tmp_path, "brand-new-subdir/identical.json", _table(["one"] * 3))
    # files=None -> recursive walk must discover the nested table and flag it.
    findings = run_cat3_golden_values(tmp_path, None)
    assert any(f.severity == FailureMode.HARD_FAIL and "DISTINCT" in f.message for f in findings)
    # and the explicit-files path resolves it too
    assert _hard_fails(run_cat3_golden_values(tmp_path, [rel]))
