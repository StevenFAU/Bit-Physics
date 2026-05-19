"""Cat 3.golden-values — every committed golden table verifies cleanly.

Spec § 3.2: SOFT_WARN by default for numerical mismatches; HARD_FAIL if a
table is missing the spec-§-2.4-mandated minimum of three
``independent_reference`` anchors.

Mechanics:
    1. Walk ``tools/testkit/golden/tables/`` for `*.json`.
    2. Parse each, schema-validate against
       ``tools/testkit/schemas/golden-v1.json``.
    3. Look up the algorithm name in the local evaluator registry.
       Tables whose algorithm isn't registered are skipped with an
       AUDIT_LOG (the algorithm hasn't shipped a Python evaluator yet).
    4. Call ``golden.verifier.verify_against_table(table, evaluator)``;
       emit a Finding per failure.
    5. Independently count ``independent_reference`` anchors per spec
       § 2.4; HARD_FAIL on < 3.
"""

from __future__ import annotations

import json
from pathlib import Path

from golden.verifier import verify_against_table

from ..common.types import FailureMode, Finding
from .evaluators import REGISTRY

CHECK_ID = "cat3.golden-values"

_TABLES_DIR = Path("tools/testkit/golden/tables")


def _gather_tables(repo_root: Path, files: list[Path] | None) -> list[Path]:
    if files is not None:
        return [
            (repo_root / p) if not p.is_absolute() else p
            for p in files
            if p.parent == _TABLES_DIR and p.suffix == ".json"
        ]
    base = repo_root / _TABLES_DIR
    if not base.exists():
        return []
    return sorted(base.glob("*.json"))


def _anchor_count(table: dict[str, object]) -> int:
    points = table.get("test_points", [])
    if not isinstance(points, list):
        return 0
    return sum(1 for p in points if isinstance(p, dict) and "independent_reference" in p)


def run_cat3_golden_values(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    findings: list[Finding] = []
    for table_path in _gather_tables(repo_root, files):
        rel = table_path.relative_to(repo_root)
        try:
            table = json.loads(table_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=rel,
                    line=None,
                    message=f"failed to load golden table: {exc}",
                )
            )
            continue

        anchors = _anchor_count(table)
        if anchors < 3:
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=rel,
                    line=None,
                    message=(
                        f"only {anchors} independent_reference anchors; spec § 2.4 requires ≥ 3"
                    ),
                )
            )

        algorithm = str(table.get("algorithm", ""))
        evaluator = REGISTRY.get(algorithm)
        if evaluator is None:
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.AUDIT_LOG,
                    path=rel,
                    line=None,
                    message=(
                        f"no Python evaluator registered for algorithm "
                        f"{algorithm!r}; skipping numeric verification"
                    ),
                )
            )
            continue

        try:
            result = verify_against_table(table_path, evaluator)
        except Exception as exc:
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=rel,
                    line=None,
                    message=f"verifier raised: {exc}",
                )
            )
            continue

        if not result.ok:
            for failure in result.failures:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.SOFT_WARN,
                        path=rel,
                        line=None,
                        message=(
                            f"algorithm={algorithm} point #{failure['index']} "
                            f"inputs={failure['inputs']} expected="
                            f"{failure['expected']} actual={failure['actual']} "
                            f"max_abs_err={failure['max_abs_err']:.3e}"
                        ),
                    )
                )
    return findings
