"""Cat 4 grammar extensions (charter § 1.7 R8 amendments).

This subpackage hosts grammars (b) and (c) — phrase-present-in-file
and API-has-shape — added in Phase 1 Stage 1 per charter
docs/phases/phase-1-plan.md § 1.7. Grammar (a) (`path:line` citations)
remains at the parent module (cat4_draft_time/path_line_assertions.py),
which is Phase 0 territory and intentionally untouched here.
"""

from __future__ import annotations

from .api_shape import run_cat4_api_shape
from .phrase_in_file import run_cat4_phrase_in_file

__all__ = [
    "run_cat4_api_shape",
    "run_cat4_phrase_in_file",
]
