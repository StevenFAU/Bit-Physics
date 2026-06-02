"""Phase-5 pypi-release pyproject linter (phase plan § 6.3, Appendix D step 5d).

Enforces packaging metadata for a sim's ``pyproject.toml``:
  * required ``[project]`` fields (name, version, license, dependencies);
  * explicit (non-empty) dependency declaration;
  * a build backend;
  * the spec § 4.6 ``bit-physics-<category>-<sim>`` namespace.

Severity model (R1 / "Phase 5 does not patch sims"):
  * ``fail``    — a genuinely broken/unbuildable package (missing version etc.).
  * ``shifted`` — a documented divergence we do NOT auto-fix (the namespace: no
                  spot-checked sim ships the bit-physics-<category>-<sim> name;
                  renaming a published package is out of Phase-5 scope).
  * ``warn``    — advisory (e.g. missing classifiers).

Invoked by PATH, like pipeline.py:
    python tools/productization/pypi-release/lint.py packages/<sim>/pyproject.toml
"""

from __future__ import annotations

import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

Severity = Literal["fail", "shifted", "warn"]


@dataclass(frozen=True)
class LintIssue:
    code: str
    severity: Severity
    message: str


def lint_pyproject(doc: dict[str, Any], *, sim_name: str) -> list[LintIssue]:
    issues: list[LintIssue] = []
    project = doc.get("project", {})

    if not project.get("name"):
        issues.append(LintIssue("missing-name", "fail", "no [project].name"))
    if not project.get("version"):
        issues.append(LintIssue("missing-version", "fail", "no [project].version"))
    if not project.get("license"):
        issues.append(LintIssue("missing-license", "fail", "no [project].license"))
    deps = project.get("dependencies")
    if not deps:
        issues.append(
            LintIssue(
                "missing-dependencies", "fail", "[project].dependencies is empty/absent"
            )
        )
    if "build-system" not in doc:
        issues.append(LintIssue("missing-build-system", "fail", "no [build-system]"))

    # PEP 621: a sim must not ship both setup.py-era and pyproject metadata.
    if "tool" in doc and "setuptools" in doc.get("tool", {}) and "build-system" in doc:
        # not fatal on its own; the legacy-setup.py case is detected by the caller.
        pass

    # spec § 4.6 namespace — SHIFTED, never fail (no sim follows it; do not rename).
    name = project.get("name", "")
    if name and not name.startswith("bit-physics-"):
        issues.append(
            LintIssue(
                "namespace-divergence",
                "shifted",
                f"name {name!r} does not follow spec § 4.6 'bit-physics-<category>-<sim>'; "
                "Phase 5 does not patch sims — namespace reservation is a post-phase go-live step",
            )
        )

    # Classifiers (advisory).
    classifiers = project.get("classifiers", [])
    if not any("Programming Language :: Python" in c for c in classifiers):
        issues.append(
            LintIssue(
                "missing-classifiers",
                "warn",
                "no Programming-Language/OS classifiers (advisory)",
            )
        )
    return issues


def lint_file(path: Path) -> list[LintIssue]:
    doc = tomllib.loads(path.read_text(encoding="utf-8"))
    sim_name = doc.get("project", {}).get("name", path.parent.name)
    issues = lint_pyproject(doc, sim_name=sim_name)
    # Legacy setup.py alongside pyproject (Appendix D anticipated problem).
    if (path.parent / "setup.py").exists():
        issues.append(
            LintIssue(
                "legacy-setup-py",
                "shifted",
                "setup.py present alongside pyproject.toml (PEP 621): sim owner "
                "removes setup.py post-phase",
            )
        )
    return issues


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print("usage: lint.py <pyproject.toml> [...]", file=sys.stderr)
        return 2
    worst = 0
    for arg in argv:
        path = Path(arg)
        issues = lint_file(path)
        for i in issues:
            print(f"{path}: [{i.severity}] {i.code}: {i.message}")
            if i.severity == "fail":
                worst = 1
    return worst


if __name__ == "__main__":
    raise SystemExit(main())
