"""CMakeLists linter for the binary-release sub-phase (§ 6.2 qualifying criteria).

A Stack-C sim qualifies for binary-release when its CMakeLists builds a headless
``*_capture`` executable target (the canonical capture writer) under cxx_std_20.
This linter reports advisory findings; per "Phase 5 does not patch sims",
non-fatal posture divergences are SHIFTED, never a build-failing ``fail`` — the
only ``fail`` is a genuinely missing capture target (the package cannot be
build-and-validated at all). Mirrors the pypi-release ``lint.py`` shape.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

Severity = Literal["fail", "shifted", "warn"]


@dataclass(frozen=True)
class Issue:
    code: str
    severity: Severity
    message: str


_CAPTURE_RE = re.compile(r"add_executable\(\s*[A-Za-z0-9_]*_capture\b", re.MULTILINE)
_CXX20_RE = re.compile(r"cxx_std_20", re.MULTILINE)
_LAVAPIPE_RE = re.compile(r"lvp_icd\.json", re.MULTILINE)


def lint_cmakelists(text: str, *, sim_name: str) -> list[Issue]:
    issues: list[Issue] = []
    if not _CAPTURE_RE.search(text):
        issues.append(
            Issue(
                "missing-capture-target",
                "fail",
                f"{sim_name}: no add_executable(*_capture …) headless capture target — "
                "cannot build-and-validate (§ 6.2).",
            )
        )
    if not _CXX20_RE.search(text):
        issues.append(
            Issue(
                "no-cxx20-feature",
                "shifted",
                f"{sim_name}: no explicit cxx_std_20 compile feature (may inherit a "
                "parent setting); SHIFTED, not a fail.",
            )
        )
    if not _LAVAPIPE_RE.search(text):
        issues.append(
            Issue(
                "no-lavapipe-pin",
                "warn",
                f"{sim_name}: CMakeLists does not pin the lavapipe ICD on its ctests "
                "(the pipeline sets VK_DRIVER_FILES itself at validate time).",
            )
        )
    return issues


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print("usage: lint.py <path/to/CMakeLists.txt>", file=sys.stderr)
        return 2
    path = Path(argv[0])
    text = path.read_text(encoding="utf-8")
    sim = path.parent.name
    issues = lint_cmakelists(text, sim_name=sim)
    for i in issues:
        print(f"{i.severity.upper()}\t{i.code}\t{i.message}")
    return 1 if any(i.severity == "fail" for i in issues) else 0


if __name__ == "__main__":
    raise SystemExit(main())
