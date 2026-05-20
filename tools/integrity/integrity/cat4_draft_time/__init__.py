"""Cat 4 — Draft-time spec verification (spec § 3.2). HARD_FAIL at pre-commit.

Phase 0 shipped grammar (a) — backtick-fenced `path:line` and
`path:start-end` citations — only. Grammars (b) ``<phrase "X" in Y>``
and (c) ``<API X has shape Y>`` land in Phase 1 Stage 1 per charter
docs/phases/phase-1-plan.md § 1.7 R8 amendments; their implementations
live under :mod:`integrity.cat4_draft_time.grammars`.
"""

from __future__ import annotations

from .grammars import run_cat4_api_shape, run_cat4_phrase_in_file
from .path_line_assertions import run_cat4_path_line_assertions

__all__ = [
    "run_cat4_api_shape",
    "run_cat4_path_line_assertions",
    "run_cat4_phrase_in_file",
]
