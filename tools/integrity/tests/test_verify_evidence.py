"""Tests for the verify_evidence script (plan § 7.5 deliverable 9)."""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

import pytest

from integrity.scripts.verify_evidence import verify_evidence


def _init_repo(path: Path) -> str:
    subprocess.run(["git", "init", "-b", "main"], cwd=path, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.name", "test"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.email", "test@t.test"], cwd=path, check=True)
    return ""


def _commit_all(path: Path, msg: str = "fixture") -> str:
    subprocess.run(["git", "add", "."], cwd=path, capture_output=True, check=True)
    subprocess.run(["git", "commit", "-m", msg], cwd=path, capture_output=True, check=True)
    out = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=path, capture_output=True, text=True, check=True
    )
    return out.stdout.strip()


def _write_audit(
    repo: Path,
    name: str,
    evidence: list[str],
    head_sha: str,
    evidence_hashes: dict[str, str] | None = None,
) -> Path:
    fm_lines = [
        "---",
        "date: 2026-05-19T00-00-00Z",
        "author: test",
        "phase: 0",
        "artifact: block",
        f"artifact_id: {name}",
        "verdict: CONFIRMED",
        "evidence_paths:",
        *[f"  - {p}" for p in evidence],
        f"head_sha: {head_sha}",
    ]
    if evidence_hashes:
        fm_lines.append("evidence_hashes:")
        for p, h in evidence_hashes.items():
            fm_lines.append(f'  "{p}": "{h}"')
    fm_lines += [
        "deferred_items: []",
        "ci_activation: []",
        "top_level_deps_to_merge: []",
        "---",
        "",
        f"# {name}",
        "",
    ]
    target = repo / "docs" / "_audits" / f"{name}.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(fm_lines), encoding="utf-8")
    return target


def test_verify_evidence_valid_paths_pass(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    (repo / "real.py").write_text("# real file\n", encoding="utf-8")
    audit = _write_audit(repo, "good-block", ["real.py"], "PLACEHOLDER")
    sha = _commit_all(repo)
    # Rewrite audit with the real SHA, then amend.
    audit.write_text(
        audit.read_text(encoding="utf-8").replace("PLACEHOLDER", sha), encoding="utf-8"
    )
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    new_sha = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(audit.read_text(encoding="utf-8").replace(sha, new_sha), encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    final_sha = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(
        audit.read_text(encoding="utf-8").replace(new_sha, final_sha), encoding="utf-8"
    )
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    head_sha = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(
        audit.read_text(encoding="utf-8").replace(final_sha, head_sha), encoding="utf-8"
    )
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    # The "real.py" file is present in every commit since the first
    # commit-after-bootstrap, and the audit's `head_sha` now matches HEAD.
    result = verify_evidence(audit, repo_root=repo)
    assert result.ok, f"unexpected failures: {result.failures}"


def test_verify_evidence_missing_path_fails(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    (repo / "real.py").write_text("# only this file exists\n", encoding="utf-8")
    audit = _write_audit(repo, "missing-block", ["does-not-exist.py"], "X")
    sha = _commit_all(repo)
    audit.write_text(
        audit.read_text(encoding="utf-8").replace("head_sha: X", f"head_sha: {sha}"),
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(audit.read_text(encoding="utf-8").replace(sha, head), encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    final_head = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(audit.read_text(encoding="utf-8").replace(head, final_head), encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    final = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(audit.read_text(encoding="utf-8").replace(final_head, final), encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    result = verify_evidence(audit, repo_root=repo)
    assert not result.ok
    assert any("not present" in f for f in result.failures)


def test_verify_evidence_hash_mismatch_fails(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    content = b"# content\n"
    (repo / "real.py").write_bytes(content)
    sha256_actual = hashlib.sha256(content).hexdigest()
    audit = _write_audit(
        repo,
        "hash-block",
        ["real.py"],
        "X",
        evidence_hashes={"real.py": "0" * 64},
    )
    _commit_all(repo)
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(
        audit.read_text(encoding="utf-8").replace("head_sha: X", f"head_sha: {head}"),
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    final = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(audit.read_text(encoding="utf-8").replace(head, final), encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    result = verify_evidence(audit, repo_root=repo)
    assert not result.ok
    assert any("sha256 mismatch" in f for f in result.failures), (
        f"expected sha256 mismatch; got {result.failures}; actual sha={sha256_actual}"
    )


def test_verify_evidence_accepts_sha256_prefix(tmp_path: Path) -> None:
    """Audits routinely store ``evidence_hashes`` as ``sha256:HEX``; the
    verifier must accept that prefix (the de-facto convention used by the
    Phase 1 landing audit and the closed-form sub-phase checkpoints)."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    content = b"# content\n"
    (repo / "real.py").write_bytes(content)
    sha256_actual = hashlib.sha256(content).hexdigest()
    audit = _write_audit(
        repo,
        "prefix-block",
        ["real.py"],
        "X",
        evidence_hashes={"real.py": f"sha256:{sha256_actual}"},
    )
    _commit_all(repo)
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(
        audit.read_text(encoding="utf-8").replace("head_sha: X", f"head_sha: {head}"),
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    final = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.strip()
    audit.write_text(audit.read_text(encoding="utf-8").replace(head, final), encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "--amend", "--no-edit"], cwd=repo, capture_output=True, check=True
    )
    result = verify_evidence(audit, repo_root=repo)
    assert result.ok, f"expected pass with sha256: prefix; got failures={result.failures}"


def test_verify_evidence_no_frontmatter_raises(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo(repo)
    audit = repo / "no-fm.md"
    audit.write_text("# no front-matter here\n", encoding="utf-8")
    _commit_all(repo)
    with pytest.raises(ValueError):
        verify_evidence(audit, repo_root=repo)
