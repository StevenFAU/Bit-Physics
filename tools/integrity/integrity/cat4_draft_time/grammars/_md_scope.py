"""Markdown-aware "narrative scope" helpers for Cat 4 grammars (b) and (c).

Grammars (b) ``<phrase "X" in Y>`` and (c) ``<API X has shape Y>`` are
*narrative* assertions: a sentence in prose makes a verifiable claim
about the code. Meta-documentation about the grammar itself (the spec,
this module's docstring, README explanations) routinely embeds the
literal grammar inside backtick-fenced inline code spans or fenced
code blocks; matching the meta-doc would generate false positives
against the very documents that teach the grammar.

The helpers below identify and remove non-narrative scope from a line
before pattern matching:

- Triple-backtick fenced code blocks (toggled across lines).
- Indented (4-space) code blocks.
- Inline code spans (``backtick … matching backtick``).

A grammar assertion appearing inside any of these is treated as
documentation, not as a live assertion, and is silently skipped.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass

_FENCE_RE = re.compile(r"^\s*(```|~~~)")


@dataclass
class _State:
    in_fence: bool = False


def strip_inline_code_spans(line: str) -> str:
    """Return ``line`` with inline backtick spans replaced by spaces.

    A backtick run of length N opens a span that closes only at the
    next backtick run of length N (CommonMark rule). This is the
    minimum needed for the cat4 grammars to ignore documentation
    embedded in backticks.
    """
    out: list[str] = []
    i = 0
    n = len(line)
    while i < n:
        if line[i] == "`":
            j = i
            while j < n and line[j] == "`":
                j += 1
            run_len = j - i
            # Find a matching closing run of identical length.
            k = j
            while k < n:
                if line[k] == "`":
                    p = k
                    while p < n and line[p] == "`":
                        p += 1
                    if p - k == run_len:
                        # Replace open-content-close with spaces of equal width
                        out.append(" " * (p - i))
                        i = p
                        break
                    k = p
                else:
                    k += 1
            else:
                # Unmatched backtick run; emit the backticks verbatim
                # and keep scanning past them.
                out.append(line[i:j])
                i = j
                continue
        else:
            out.append(line[i])
            i += 1
    return "".join(out)


def iter_narrative_lines(text: str) -> Iterable[tuple[int, str]]:
    """Yield ``(line_no, narrative_line)`` for every line outside code.

    Code-block lines are skipped entirely. Lines inside narrative
    have inline code spans stripped (replaced by equivalent-width
    whitespace so column reporting upstream is unaffected).
    """
    state = _State()
    for line_no, raw in enumerate(text.splitlines(), start=1):
        if _FENCE_RE.match(raw):
            state.in_fence = not state.in_fence
            continue
        if state.in_fence:
            continue
        # Indented code block: a line with ≥ 4 leading spaces (CommonMark
        # informal heuristic; we are not building a full Markdown parser).
        if raw.startswith("    ") and raw.strip():
            continue
        yield line_no, strip_inline_code_spans(raw)
