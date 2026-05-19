"""Cat 4 — Draft-time spec verification (spec § 3.2). HARD_FAIL at pre-commit.

Phase 0 ships grammar (a) — backtick-fenced `path:line` and
`path:start-end` citations — only. Grammars (b) phrase-present-in-file and
(c) API-shape land in Phase 1+ (spec § 3.2).
"""

from __future__ import annotations

from .path_line_assertions import run_cat4_path_line_assertions

__all__ = ["run_cat4_path_line_assertions"]
