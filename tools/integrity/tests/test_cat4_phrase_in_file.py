"""Cat 4 grammar (b) — ``<phrase "X" in Y>`` tests (charter § 1.7 R8).

Positive + negative cases for the phrase-in-file verifier.
"""

from __future__ import annotations

from pathlib import Path

from integrity.cat4_draft_time.grammars.phrase_in_file import (
    CHECK_ID,
    run_cat4_phrase_in_file,
)
from integrity.common.types import FailureMode


def _write(repo: Path, rel: str, body: str) -> None:
    full = repo / rel
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(body, encoding="utf-8")


def test_positive_phrase_in_named_file(tmp_path: Path) -> None:
    """A phrase that actually exists in the cited file produces no findings."""
    _write(tmp_path, "src/hello.py", "def hello():\n    return 'world'\n")
    _write(
        tmp_path,
        "docs/draft.md",
        'The function returns the literal <phrase "world" in src/hello.py>.\n',
    )
    findings = run_cat4_phrase_in_file(tmp_path, [Path("docs/draft.md")])
    assert findings == [], f"expected clean run, got: {findings}"


def test_positive_phrase_in_glob(tmp_path: Path) -> None:
    """A phrase present in at least one glob match passes."""
    _write(tmp_path, "common/a/sig.py", "SIGNATURE = 'mark-of-grammar-b'\n")
    _write(tmp_path, "common/b/other.py", "# unrelated\n")
    _write(
        tmp_path,
        "docs/draft.md",
        "The marker <phrase 'mark-of-grammar-b' in common/**/*.py> is exported.\n",
    )
    findings = run_cat4_phrase_in_file(tmp_path, [Path("docs/draft.md")])
    assert findings == [], f"expected clean run, got: {findings}"


def test_negative_phrase_missing(tmp_path: Path) -> None:
    """Phrase absent in cited file is HARD_FAIL with a clear diagnostic."""
    _write(tmp_path, "src/hello.py", "def hello():\n    return 'world'\n")
    _write(
        tmp_path,
        "docs/draft.md",
        'Claim: <phrase "absent-needle" in src/hello.py>.\n',
    )
    findings = run_cat4_phrase_in_file(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    f = findings[0]
    assert f.check == CHECK_ID
    assert f.severity == FailureMode.HARD_FAIL
    assert "absent-needle" in f.message
    assert "phrase not found" in f.message


def test_negative_target_does_not_resolve(tmp_path: Path) -> None:
    """Path that doesn't exist HARD_FAILs with a target-resolution diagnostic."""
    _write(
        tmp_path,
        "docs/draft.md",
        '<phrase "anything" in src/imaginary/module.py>.\n',
    )
    findings = run_cat4_phrase_in_file(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    f = findings[0]
    assert f.check == CHECK_ID
    assert f.severity == FailureMode.HARD_FAIL
    assert "does not resolve" in f.message


def test_negative_absolute_path_rejected(tmp_path: Path) -> None:
    """Absolute paths are rejected (the verifier never reads outside repo)."""
    _write(tmp_path, "docs/draft.md", '<phrase "x" in /etc/passwd>.\n')
    findings = run_cat4_phrase_in_file(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    assert "absolute" in findings[0].message


def test_glob_with_no_matches_hard_fails(tmp_path: Path) -> None:
    """A glob that matches no files HARD_FAILs (caller's pattern is wrong)."""
    _write(tmp_path, "docs/draft.md", '<phrase "x" in unmatched/**/*.py>.\n')
    findings = run_cat4_phrase_in_file(tmp_path, [Path("docs/draft.md")])
    assert len(findings) == 1, findings
    assert "does not resolve" in findings[0].message
