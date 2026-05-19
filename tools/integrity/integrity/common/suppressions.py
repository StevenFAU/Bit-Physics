"""Parse `# integrity-allow: <check>; <reason>; <tracking-id>` annotations.

Per spec § 3.2. Each suppression is itself audited (provenance trace,
grandfather catalog).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

_PATTERN = re.compile(
    r"integrity-allow\s*:\s*"
    r"(?P<check>[^;]+?)\s*;\s*"
    r"(?P<reason>[^;]+?)\s*;\s*"
    r"(?P<tracking_id>\S+)"
)


@dataclass(frozen=True)
class SuppressionAnnotation:
    path: Path
    line: int
    check: str
    reason: str
    tracking_id: str


def parse_suppressions(path: Path, text: str) -> list[SuppressionAnnotation]:
    """Parse all `# integrity-allow:` annotations in ``text``.

    Returns one annotation per matching line. Multiple annotations on one
    line are not supported (they'd be ambiguous to chain-suppress anyway).
    """
    out: list[SuppressionAnnotation] = []
    for idx, line in enumerate(text.splitlines(), start=1):
        m = _PATTERN.search(line)
        if m is None:
            continue
        out.append(
            SuppressionAnnotation(
                path=path,
                line=idx,
                check=m.group("check"),
                reason=m.group("reason"),
                tracking_id=m.group("tracking_id"),
            )
        )
    return out


def applies(annotation: SuppressionAnnotation, check: str) -> bool:
    """Return True if ``annotation`` suppresses findings for ``check``.

    Exact-match on the check name. No glob support in Phase 0.
    """
    return annotation.check == check
