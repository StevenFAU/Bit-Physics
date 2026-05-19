"""Tests for the suppression annotation parser."""

from __future__ import annotations

from pathlib import Path

from integrity.common.suppressions import applies, parse_suppressions


def test_parse_single_annotation() -> None:
    text = "x = 1  # integrity-allow: cat1.intra-repo; legacy citation; ABC-123\n"
    out = parse_suppressions(Path("foo.py"), text)
    assert len(out) == 1
    a = out[0]
    assert a.check == "cat1.intra-repo"
    assert a.reason == "legacy citation"
    assert a.tracking_id == "ABC-123"


def test_applies_matches_check() -> None:
    text = "# integrity-allow: cat3.golden-values; staging override; ABC-1\n"
    annotations = parse_suppressions(Path("x.py"), text)
    assert applies(annotations[0], "cat3.golden-values")
    assert not applies(annotations[0], "cat1.intra-repo")


def test_parse_no_match_returns_empty() -> None:
    assert parse_suppressions(Path("x.py"), "no annotation here\n") == []
