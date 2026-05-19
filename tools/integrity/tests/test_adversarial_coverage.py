"""Adversarial-fixture meta-test (spec § 3.2).

For each adversarial fixture under ``fixtures/adversarial/<cat>/``:
    - Reads ``manifest.json`` to learn the check ID + expected count.
    - Invokes the corresponding Cat check restricted to the fixture
      directory.
    - Asserts the check produces ≥ ``expected_findings_min`` findings
      with the expected severity.

If any adversarial fixture goes undetected, the meta-test HARD_FAILs —
this is what makes the integrity toolkit's correctness testable per
spec § 3.2.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from integrity.cat1_citations.intra_repo import run_cat1_intra_repo
from integrity.cat2_contracts.python_module_exports import run_cat2_python_exports
from integrity.cat3_numerical.golden_values import run_cat3_golden_values
from integrity.cat4_draft_time.path_line_assertions import run_cat4_path_line_assertions
from integrity.cat5_provenance.audit_links import run_cat5_audit_links
from integrity.catx_tolerance_budget.tolerance_budget import run_catx_tolerance_budget
from integrity.common.types import FailureMode

_FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "adversarial"


def _read_manifest(fixture_dir: Path) -> dict[str, int]:
    """Return only the `expected_findings_min` slot (the only field tests use).

    Manifests carry richer metadata (check ID, severity, fixture_files) for
    human reading; tests just need the integer threshold.
    """
    with (fixture_dir / "manifest.json").open("r", encoding="utf-8") as fh:
        raw = json.load(fh)
    return {"expected_findings_min": int(raw["expected_findings_min"])}


def _files_under(root: Path, rel_root: Path) -> list[Path]:
    out: list[Path] = []
    for p in rel_root.rglob("*"):
        if p.is_file() and p.name != "manifest.json":
            out.append(p.relative_to(root))
    return out


def test_cat1_broken_citations_detected(tmp_path: Path) -> None:
    """Cat 1 must flag the three broken citations in the fixture."""
    fixture = _FIXTURE_ROOT / "cat1_broken_citations"
    manifest = _read_manifest(fixture)
    # Materialize fixture in tmp_path so paths in citations resolve against
    # a real repo-like layout (LICENSE + README.md must exist).
    repo = tmp_path
    shutil.copytree(fixture, repo / "fixture")
    (repo / "LICENSE").write_text("placeholder license\n", encoding="utf-8")
    (repo / "README.md").write_text("placeholder readme\n", encoding="utf-8")
    files = [Path("fixture/broken.md")]
    findings = run_cat1_intra_repo(repo, files)
    assert len(findings) >= manifest["expected_findings_min"], (
        f"cat1 missed broken citations; got {len(findings)} expected "
        f"≥{manifest['expected_findings_min']}: {findings}"
    )
    assert all(f.severity == FailureMode.HARD_FAIL for f in findings)


def test_cat2_phantom_exports_detected(tmp_path: Path) -> None:
    """Cat 2 must flag the two phantom names in __all__."""
    fixture = _FIXTURE_ROOT / "cat2_phantom_contracts"
    manifest = _read_manifest(fixture)
    repo = tmp_path
    shutil.copytree(fixture / "phantom_pkg", repo / "phantom_pkg")
    files = [Path("phantom_pkg/__init__.py")]
    findings = run_cat2_python_exports(repo, files)
    assert len(findings) >= manifest["expected_findings_min"], (
        f"cat2 missed phantom exports; got {len(findings)}: {findings}"
    )
    assert all(f.severity == FailureMode.HARD_FAIL for f in findings)


def test_cat3_wrong_goldens_detected(tmp_path: Path) -> None:
    """Cat 3 must flag the wrong-values fixture (both anchor count AND values)."""
    fixture = _FIXTURE_ROOT / "cat3_wrong_goldens"
    manifest = _read_manifest(fixture)
    repo = tmp_path
    (repo / "tools" / "testkit" / "golden" / "tables").mkdir(parents=True)
    shutil.copy(
        fixture / "wrong-cubic-spline.json",
        repo / "tools" / "testkit" / "golden" / "tables" / "wrong-cubic-spline.json",
    )
    findings = run_cat3_golden_values(repo, None)
    assert len(findings) >= manifest["expected_findings_min"], (
        f"cat3 missed wrong-goldens; got {len(findings)}: {findings}"
    )
    # Must include at least one HARD_FAIL (anchor count < 3) or SOFT_WARN
    # (numeric mismatch).
    severities = {f.severity for f in findings}
    assert FailureMode.HARD_FAIL in severities or FailureMode.SOFT_WARN in severities, (
        f"cat3 produced no actionable findings: {findings}"
    )


def test_cat4_unverified_assertions_detected(tmp_path: Path) -> None:
    """Cat 4 must flag the draft's two unresolved path:line citations."""
    fixture = _FIXTURE_ROOT / "cat4_unverified_assertions"
    manifest = _read_manifest(fixture)
    repo = tmp_path
    (repo / "docs").mkdir()
    shutil.copy(fixture / "docs" / "draft.md", repo / "docs" / "draft.md")
    (repo / "LICENSE").write_text("placeholder license\n", encoding="utf-8")
    findings = run_cat4_path_line_assertions(repo, [Path("docs/draft.md")])
    assert len(findings) >= manifest["expected_findings_min"], (
        f"cat4 missed unverified assertions; got {len(findings)}: {findings}"
    )
    assert all(f.severity == FailureMode.HARD_FAIL for f in findings)


def test_cat5_orphan_claims_detected(tmp_path: Path) -> None:
    """Cat 5 must flag the orphan audit with unresolvable evidence_paths."""
    fixture = _FIXTURE_ROOT / "cat5_orphan_claims"
    manifest = _read_manifest(fixture)
    repo = tmp_path
    (repo / "docs" / "_audits" / "phase-0").mkdir(parents=True)
    target = repo / "docs" / "_audits" / "phase-0" / "orphan-block.md"
    target.write_text(
        (fixture / "docs" / "_audits" / "orphan-block.md").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    # Initialize as a git repo so repo_tracked_files works.
    import subprocess

    subprocess.run(["git", "init"], cwd=repo, capture_output=True, check=True)
    subprocess.run(["git", "add", "."], cwd=repo, capture_output=True, check=True)
    subprocess.run(
        ["git", "-c", "user.name=test", "-c", "user.email=test@test", "commit", "-m", "fixture"],
        cwd=repo,
        capture_output=True,
        check=True,
    )
    findings = run_cat5_audit_links(repo, None)
    assert len(findings) >= manifest["expected_findings_min"], (
        f"cat5 missed orphan claims; got {len(findings)}: {findings}"
    )
    assert all(f.severity == FailureMode.SOFT_WARN for f in findings)


def test_catx_over_budget_detected(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Cat-X must flag the over-budget override."""
    fixture = _FIXTURE_ROOT / "catx_over_budget_tolerance"
    manifest = _read_manifest(fixture)
    repo = tmp_path
    target_dir = repo / "tools" / "testkit" / "equivalence"
    target_dir.mkdir(parents=True)
    shutil.copy(fixture / "tolerance.toml", target_dir / "tolerance.toml")
    shutil.copy(fixture / "tolerance-budget.toml", target_dir / "tolerance-budget.toml")
    findings = run_catx_tolerance_budget(repo, None)
    assert len(findings) >= manifest["expected_findings_min"], (
        f"catx missed over-budget override; got {len(findings)}: {findings}"
    )
    assert all(f.severity == FailureMode.HARD_FAIL for f in findings)


def test_meta_catches_a_disabled_check() -> None:
    """If a Cat check is deliberately disabled (returns []), the meta-test fails.

    Per spec § 3.2 and plan § 7.5 Category 6 failure-mode prevention: we
    must verify that an empty-finding-list response from a check causes
    the meta-test to surface the gap.
    """
    fixture = _FIXTURE_ROOT / "cat1_broken_citations"
    manifest = _read_manifest(fixture)
    findings: list[object] = []  # simulate the check returning nothing
    assert not (len(findings) >= manifest["expected_findings_min"]), (
        "meta-test contract: empty-findings must not satisfy expected count"
    )
