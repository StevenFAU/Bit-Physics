"""Branch-coverage tests for cat4 grammar (a) — `path:line` draft citations.

R1 mutation moat (back-test `findings-ledger.md` B-2 / cat4_draft_time 0.0669):
the cat4 mutation target covers the whole `cat4_draft_time` package, but its
runner ran a single adversarial test that exercised only the does-not-exist
branch of `run_cat4_path_line_assertions`. These tests constrain every branch:
the citation regex, the scope filter, escapes-repo-root, target-missing,
line-range-out-of-bounds (incl. the trailing-newline line count), the in-range
pass, multi-citation lines, and the files=None tracked-files path.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from integrity.cat4_draft_time.path_line_assertions import (
    CHECK_ID,
    run_cat4_path_line_assertions,
)
from integrity.common.types import FailureMode


def _doc(repo: Path, rel: str, body: str) -> Path:
    p = repo / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body, encoding="utf-8")
    return Path(rel)


def test_valid_in_range_citation_passes(tmp_path: Path) -> None:
    """A citation whose target exists and whose line is in range yields nothing."""
    target = tmp_path / "tools" / "x.py"
    target.parent.mkdir(parents=True)
    target.write_text("a\nb\nc\nd\ne\n", encoding="utf-8")  # 5 lines
    rel = _doc(tmp_path, "docs/d.md", "see `tools/x.py:3` for detail\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert findings == []


def test_missing_target_is_hard_fail(tmp_path: Path) -> None:
    rel = _doc(tmp_path, "docs/d.md", "broken `tools/nope.py:3`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert findings[0].severity == FailureMode.HARD_FAIL
    assert findings[0].check == CHECK_ID
    assert "does not exist" in findings[0].message
    assert findings[0].line == 1


def test_out_of_range_line_is_hard_fail(tmp_path: Path) -> None:
    target = tmp_path / "tools" / "x.py"
    target.parent.mkdir(parents=True)
    target.write_text("a\nb\nc\n", encoding="utf-8")  # 3 lines
    rel = _doc(tmp_path, "docs/d.md", "see `tools/x.py:9`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert "out of range" in findings[0].message
    assert "3 lines" in findings[0].message


def test_range_end_out_of_bounds_is_hard_fail(tmp_path: Path) -> None:
    target = tmp_path / "tools" / "x.py"
    target.parent.mkdir(parents=True)
    target.write_text("a\nb\nc\nd\n", encoding="utf-8")  # 4 lines
    rel = _doc(tmp_path, "docs/d.md", "range `tools/x.py:2-9`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert "out of range" in findings[0].message


def test_range_within_bounds_passes(tmp_path: Path) -> None:
    target = tmp_path / "tools" / "x.py"
    target.parent.mkdir(parents=True)
    target.write_text("a\nb\nc\nd\ne\nf\n", encoding="utf-8")  # 6 lines
    rel = _doc(tmp_path, "docs/d.md", "range `tools/x.py:2-5`\n")
    assert run_cat4_path_line_assertions(tmp_path, [rel]) == []


def test_line_count_handles_no_trailing_newline(tmp_path: Path) -> None:
    """A target whose last line lacks a trailing newline still counts that line."""
    target = tmp_path / "tools" / "x.py"
    target.parent.mkdir(parents=True)
    target.write_text("a\nb\nc", encoding="utf-8")  # 3 lines, no trailing \n
    rel_ok = _doc(tmp_path, "docs/ok.md", "`tools/x.py:3`\n")
    assert run_cat4_path_line_assertions(tmp_path, [rel_ok]) == []
    rel_bad = _doc(tmp_path, "docs/bad.md", "`tools/x.py:4`\n")
    assert len(run_cat4_path_line_assertions(tmp_path, [rel_bad])) == 1


def test_escapes_repo_root_is_hard_fail(tmp_path: Path) -> None:
    rel = _doc(tmp_path, "docs/d.md", "escape `../outside.py:1`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert "escapes repo root" in findings[0].message


def test_non_prose_suffix_is_out_of_scope(tmp_path: Path) -> None:
    """A .py file is not prose — its `path:line`-looking text is not scanned."""
    rel = _doc(tmp_path, "docs/code.py", "x = '`tools/nope.py:9`'\n")
    assert run_cat4_path_line_assertions(tmp_path, [rel]) == []


def test_file_outside_prose_roots_is_out_of_scope(tmp_path: Path) -> None:
    """A markdown file outside docs/ + the named roots is not scanned."""
    rel = _doc(tmp_path, "packages/foo/NOTES.md", "`tools/nope.py:9`\n")
    assert run_cat4_path_line_assertions(tmp_path, [rel]) == []


def test_readme_root_is_in_scope(tmp_path: Path) -> None:
    """README.md at the repo root IS scanned (a named prose root)."""
    rel = _doc(tmp_path, "README.md", "`tools/nope.py:9`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert "does not exist" in findings[0].message


def test_multiple_citations_on_one_line_each_flagged(tmp_path: Path) -> None:
    rel = _doc(tmp_path, "docs/d.md", "`a/x.py:1` and `b/y.py:2`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 2
    assert all(f.line == 1 for f in findings)


def test_line_number_reported_is_the_prose_line(tmp_path: Path) -> None:
    rel = _doc(tmp_path, "docs/d.md", "intro\n\n\nbad `tools/nope.py:1`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert findings[0].line == 4


def test_files_none_scans_tracked_prose(tmp_path: Path) -> None:
    """With files=None the scan uses git-tracked files and finds the bad cite."""
    subprocess.run(["git", "init"], cwd=tmp_path, capture_output=True, check=True)
    _doc(tmp_path, "docs/d.md", "`tools/nope.py:9`\n")
    subprocess.run(["git", "add", "."], cwd=tmp_path, capture_output=True, check=True)
    findings = run_cat4_path_line_assertions(tmp_path, None)
    assert any("does not exist" in f.message for f in findings)


def test_directory_citation_target_is_not_a_file(tmp_path: Path) -> None:
    """A citation pointing at a directory (not a file) is flagged."""
    (tmp_path / "tools" / "pkg").mkdir(parents=True)
    rel = _doc(tmp_path, "docs/d.md", "`tools/pkg:1`\n")
    findings = run_cat4_path_line_assertions(tmp_path, [rel])
    assert len(findings) == 1
    assert "does not exist" in findings[0].message
