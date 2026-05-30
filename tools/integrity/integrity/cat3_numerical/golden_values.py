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

# M-3 (back-test re-audit): the prior `_SUBDIRS_PICKED_UP` hard-coded the five
# then-existing table subdirs, so a golden in a NEW subdir was silently skipped
# under an explicit ``files`` invocation. Walk the tree recursively instead.


def _is_under(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
    except ValueError:
        return False
    return True


def _gather_tables(repo_root: Path, files: list[Path] | None) -> list[Path]:
    tables_root = (repo_root / _TABLES_DIR).resolve()
    if files is not None:
        out: list[Path] = []
        for p in files:
            full = (p if p.is_absolute() else repo_root / p).resolve()
            if full.suffix == ".json" and _is_under(full, tables_root):
                out.append(full)
        return out
    base = repo_root / _TABLES_DIR
    if not base.exists():
        return []
    return sorted(base.rglob("*.json"))


def _normalize_source(value: object) -> str:
    return " ".join(str(value).split()).strip().lower()


def _distinct_anchor_sources(table: dict[str, object]) -> set[str]:
    """Distinct normalized ``independent_reference.source`` strings.

    M-3: the prior `_anchor_count` counted test_points that merely HAD an
    ``independent_reference`` field — so three IDENTICAL anchors passed the
    spec §2.4 ≥3-independent-anchor gate. Genuine independence requires
    distinct sources, not three restatements of one.
    """
    points = table.get("test_points", [])
    if not isinstance(points, list):
        return set()
    sources: set[str] = set()
    for p in points:
        if not isinstance(p, dict):
            continue
        ref = p.get("independent_reference")
        if isinstance(ref, dict):
            src = ref.get("source")
            if isinstance(src, str) and src.strip():
                sources.add(_normalize_source(src))
    return sources


def _is_section_2_4_exempt(table: dict[str, object]) -> bool:
    """True iff the table explicitly self-declares a numerical baseline.

    A chaotic / energy-only system (e.g. a double pendulum) cannot carry three
    genuinely independent published anchors; the honest posture (M-4/M-5) is to
    declare the table a NUMERICAL BASELINE — ``derivation.upstream`` literally
    ``n/a-numerical-baseline`` — exempt from §2.4, rather than restating one
    invariant three times to satisfy a presence count. Exempt tables are
    surfaced via AUDIT_LOG, never silently.
    """
    derivation = table.get("derivation")
    if not isinstance(derivation, dict):
        return False
    upstream = derivation.get("upstream")
    return isinstance(upstream, str) and upstream.strip().lower().startswith(
        "n/a-numerical-baseline"
    )


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

        if _is_section_2_4_exempt(table):
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.AUDIT_LOG,
                    path=rel,
                    line=None,
                    message=(
                        "§2.4-exempt numerical baseline (derivation.upstream="
                        "n/a-numerical-baseline); independent-anchor distinctness "
                        "not required"
                    ),
                )
            )
        else:
            distinct = _distinct_anchor_sources(table)
            if len(distinct) < 3:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel,
                        line=None,
                        message=(
                            f"only {len(distinct)} DISTINCT independent_reference "
                            "source(s); spec § 2.4 requires ≥ 3 genuinely "
                            "independent anchors (identical restatements do not "
                            "count). Mark as a numerical baseline "
                            "(derivation.upstream=n/a-numerical-baseline) if no "
                            "independent published anchors exist."
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
