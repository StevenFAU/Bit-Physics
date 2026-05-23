"""Evidence-path verification (spec § 7.5, Appendix G.7).

CLI:
    python -m integrity.scripts.verify_evidence --audit <path> [--strict]

Behavior:
    - Reads the audit's YAML front-matter.
    - For each ``evidence_paths`` entry, asserts the file exists at the
      audit's ``head_sha`` (via ``git show <sha>:<path>``) and is non-empty.
    - For each ``evidence_hashes`` entry (mapping path → sha256), computes
      the sha256 of the file content at ``head_sha`` and compares. For
      LFS-tracked artifacts (``git show`` returns a pointer stub, not smudged
      content) the comparison uses the content OID parsed from the pointer's
      ``oid sha256:`` line — the content-addressed sha256 the audit records
      per conventions doc § B.1 / § B.6 (IC-16). No git-lfs smudge needed.
    - Exit 0 on all-pass; exit 1 on any failure.

Used by:
    - The founder at every stage-boundary review (manual invocation).
    - The phase-closing-audit agent before writing CONFIRMED verdict
      (automated; agent inspects the script output).
    - Cat 5 provenance check (per-audit drill-down on demand).
"""

from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from ..common.repo import file_at_sha, find_repo_root, lfs_pointer_oid

_FRONT_MATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


@dataclass
class EvidenceCheckResult:
    audit_path: Path
    head_sha: str
    passes: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures


def _read_front_matter(audit_path: Path) -> dict[str, object]:
    text = audit_path.read_text(encoding="utf-8")
    m = _FRONT_MATTER.match(text)
    if m is None:
        raise ValueError(f"audit {audit_path} has no YAML front-matter")
    data = yaml.safe_load(m.group(1))
    if not isinstance(data, dict):
        raise ValueError(f"audit {audit_path} front-matter is not a mapping")
    return data


def _sha_exists(repo_root: Path, sha: str) -> bool:
    result = subprocess.run(
        ["git", "cat-file", "-e", sha],
        cwd=repo_root,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def verify_evidence(audit_path: Path, repo_root: Path | None = None) -> EvidenceCheckResult:
    audit_path = audit_path.resolve()
    root = repo_root or find_repo_root()
    fm = _read_front_matter(audit_path)
    head_sha = fm.get("head_sha")
    if not isinstance(head_sha, str) or len(head_sha) < 7:
        raise ValueError(f"audit {audit_path} front-matter missing valid head_sha")
    result = EvidenceCheckResult(audit_path=audit_path, head_sha=head_sha)
    if not _sha_exists(root, head_sha):
        result.failures.append(f"head_sha {head_sha} not present in repo")
        return result

    evidence_paths = fm.get("evidence_paths") or []
    if not isinstance(evidence_paths, list):
        result.failures.append("evidence_paths is not a list")
        return result

    for entry in evidence_paths:
        if not isinstance(entry, str):
            result.failures.append(f"evidence_paths entry {entry!r} is not a string")
            continue
        blob = file_at_sha(root, head_sha, entry)
        if blob is None:
            result.failures.append(f"evidence path {entry!r} not present at {head_sha}")
            continue
        if len(blob) == 0:
            result.failures.append(f"evidence path {entry!r} is empty at {head_sha}")
            continue
        result.passes.append(entry)

    evidence_hashes = fm.get("evidence_hashes") or {}
    if not isinstance(evidence_hashes, dict):
        result.failures.append("evidence_hashes is not a mapping")
        return result
    for path_str, claimed in evidence_hashes.items():
        if not isinstance(path_str, str) or not isinstance(claimed, str):
            result.failures.append(f"evidence_hashes entry {path_str!r}: {claimed!r} is malformed")
            continue
        blob = file_at_sha(root, head_sha, path_str)
        if blob is None:
            result.failures.append(f"hashed evidence path {path_str!r} not present at {head_sha}")
            continue
        # LFS-tracked evidence: ``git show`` returns the pointer stub, whose
        # embedded ``oid sha256:`` IS the content OID the audit records (§ B.6
        # Mode 2 RESOLVED). Non-LFS blobs hash normally (oid is None).
        oid = lfs_pointer_oid(blob)
        actual = oid if oid is not None else hashlib.sha256(blob).hexdigest()
        claimed_hex = claimed[len("sha256:") :] if claimed.startswith("sha256:") else claimed
        if actual != claimed_hex:
            result.failures.append(
                f"sha256 mismatch for {path_str!r}: claimed={claimed} actual={actual}"
            )
            continue
        result.passes.append(f"{path_str} (sha256 OK)")

    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m integrity.scripts.verify_evidence")
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument(
        "--strict",
        action="store_true",
        help=(
            "Exit 1 even on transient git failures; default exits 0 for "
            "all-pass and 1 for any structured failure."
        ),
    )
    args = parser.parse_args(list(argv) if argv is not None else sys.argv[1:])

    try:
        result = verify_evidence(args.audit)
    except (FileNotFoundError, ValueError) as exc:
        print(f"verify_evidence: {exc}", file=sys.stderr)
        return 1
    for p in result.passes:
        print(f"  PASS  {p}")
    for f in result.failures:
        print(f"  FAIL  {f}", file=sys.stderr)
    print(
        f"summary: {len(result.passes)} pass / {len(result.failures)} fail "
        f"at head_sha {result.head_sha[:12]}"
    )
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
