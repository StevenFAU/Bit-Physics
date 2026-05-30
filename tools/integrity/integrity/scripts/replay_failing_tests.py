"""TDD-discipline replay verification (spec § 1.3 step 4 + Appendix G.7.5).

Given a failing-tests commit (Convention-A test commit shipping
*failing* tests + an evidence file at
``tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt``), this script:

1. Checks out the failing-tests commit in a worktree.
2. Runs the same `pytest` command that produced the evidence.
3. Compares the resulting output to the committed evidence file's
   content under a canonical normalization (defined below).
4. Returns 0 on byte-identical normalized match; 1 otherwise.

Canonical normalization (spec amendment Block 8 surfaced, accepted at
Block 9 LANDING). Two sources of pytest-output non-determinism are
neutralized before sha256 computation:

1. **Pytest timing-summary line**::

       ============= 10 failed, 4 passed in 0.52s =============

   The elapsed-time field (``0.52s``) varies across runs on the same
   hardware; it is replaced with ``NN.NNs``.

2. **Absolute repo path**. The recorded evidence cites paths under the
   real checkout (``/home/.../Bit-Physics``); the replay runs in a
   temporary worktree (``/tmp/.replay-<sha12>``). The two roots are both
   collapsed to ``<REPO>`` so paths line up. The ``rootdir:`` / ``cachedir:``
   header lines are collapsed generically so evidence recorded under a
   DIFFERENT original checkout still matches.

3. **Pytest / pluggy / Python version trio + interpreter path** in the
   ``platform ...`` header. These vary with a toolchain upgrade or a
   differently-named venv; the raw evidence keeps them, but the hashed form
   replaces the version numbers and interpreter path with placeholders so a
   replay after a pytest bump is still byte-stable (R3, back-test re-audit).

Together these reduce comparison to a structural test: per-test outcomes,
error types, traceback lines, captured-output excerpts all stay intact.

CLI::

    python -m integrity.scripts.replay_failing_tests \\
        --commit <failing-tests-sha> \\
        --evidence <path/to/failing-tests-evidence-file> \\
        --pytest-target packages/<sim>/tests/

Used by:
    - Block 9 LANDING re-verifies the Block-8 RD-2D failing-tests
      commit (this script's first canonical consumer).
    - Phase-1+ first-stage replay against the Phase-0 landing audit.
    - Cat 5 audit-link drill-down on demand.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from ..common.repo import find_repo_root

# Matches pytest's wall-clock summary line at end of output:
#   "===... <N> failed, <M> passed in <T>s ==="
#   "===... <N> passed in <T>s ==="
# Captures the message portion so we can replace just the timing field.
_PYTEST_SUMMARY = re.compile(
    rb"^(={2,}\s+(?:.*?)\s+)in\s+\d+\.\d+s\s+(={2,})\s*$",
    re.MULTILINE,
)

_PYTEST_SUMMARY_PLACEHOLDER = rb"\1in NN.NNs \2"

# Pytest's platform header looks like:
#   "platform linux -- Python 3.12.3, pytest-9.0.3, pluggy-1.6.0 -- /path/to/python(3)"
# The interpreter-path suffix varies with the venv name and whether the
# binary symlink is `python` or `python3`; the version trio left of `--`
# is the load-bearing reproducibility claim.
# R3 (back-test re-audit): byte-exact replay was sensitive to the pytest /
# pluggy / Python VERSION trio and to the interpreter path. The raw evidence
# keeps these for human inspection, but the HASHED form canonicalizes them so
# gate-3/13 replay is byte-stable across a pytest upgrade or a different venv —
# the structural RED (per-test outcomes, tracebacks) is what the hash attests.
_PYTEST_PLATFORM = re.compile(
    rb"^(platform\s+\S+\s+--\s+Python)\s+\S+(,\s+pytest-)\S+(,\s+pluggy-)\S+\s+--\s+\S+$",
    re.MULTILINE,
)
_PYTEST_PLATFORM_PLACEHOLDER = rb"\1 <PYVER>\2<VER>\3<VER> -- <INTERPRETER>"

# rootdir/cachedir carry an absolute path that varies with the checkout
# location. The `paths_to_canonicalize` substitution only collapses the CURRENT
# root + worktree, so a rootdir line recorded under a DIFFERENT original
# checkout survives and breaks the match. Collapse them generically.
_PYTEST_ROOTDIR = re.compile(rb"^(rootdir|cachedir):\s+.*$", re.MULTILINE)
_PYTEST_ROOTDIR_PLACEHOLDER = rb"\1: <REPO>"


_REPO_PLACEHOLDER = b"<REPO>"


def normalize_pytest_output(
    raw: bytes,
    paths_to_canonicalize: tuple[bytes, ...] = (),
) -> bytes:
    """Strip non-deterministic fields from pytest output before hashing.

    Idempotent: re-normalizing an already-normalized output returns the
    same bytes. Operates on bytes (not str) so encoding-detection
    differences across runs don't perturb the hash.

    `paths_to_canonicalize` is a tuple of absolute path prefixes (bytes)
    that are replaced with `<REPO>` so the real-checkout and worktree
    runs produce identical output.
    """
    out = _PYTEST_SUMMARY.sub(_PYTEST_SUMMARY_PLACEHOLDER, raw)
    out = _PYTEST_PLATFORM.sub(_PYTEST_PLATFORM_PLACEHOLDER, out)
    out = _PYTEST_ROOTDIR.sub(_PYTEST_ROOTDIR_PLACEHOLDER, out)
    # Substitute longer paths first so worktree paths (which may share a
    # prefix with the real root in some setups) collapse before the root
    # substitution shadows them.
    for path in sorted(paths_to_canonicalize, key=len, reverse=True):
        if path:
            out = out.replace(path, _REPO_PLACEHOLDER)
    return out


@dataclass
class ReplayResult:
    commit: str
    evidence_path: Path
    pytest_target: str
    expected_normalized_sha256: str
    actual_normalized_sha256: str
    structural_match: bool
    raw_diff_lines: int = 0
    failures: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.expected_normalized_sha256 == self.actual_normalized_sha256


def _checkout_worktree(repo_root: Path, sha: str) -> Path:
    # Place the worktree OUTSIDE repo_root so the root substitution in
    # normalize_pytest_output() doesn't shadow the (longer) worktree path
    # substitution. Inside-repo worktrees would otherwise produce a
    # half-canonicalized prefix like `<REPO>/.replay-...` and never match
    # the recorded `<REPO>/` paths.
    target = Path(tempfile.gettempdir()) / f".bit-physics-replay-{sha[:12]}-{os.getpid()}"
    if target.exists():
        shutil.rmtree(target)
    subprocess.run(
        ["git", "worktree", "add", "--detach", str(target), sha],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    return target


def _remove_worktree(repo_root: Path, target: Path) -> None:
    subprocess.run(
        ["git", "worktree", "remove", "--force", str(target)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)


def replay(
    commit: str,
    evidence_path: Path,
    pytest_target: str,
    repo_root: Path | None = None,
) -> ReplayResult:
    root = repo_root or find_repo_root()
    if not evidence_path.is_absolute():
        evidence_path = (root / evidence_path).resolve()
    if not evidence_path.exists():
        raise FileNotFoundError(f"evidence file not found at {evidence_path}")

    expected_raw = evidence_path.read_bytes()

    worktree = _checkout_worktree(root, commit)
    try:
        # Run pytest in the worktree against the same target the original
        # evidence captured. The pytest_target argument is interpreted
        # relative to the worktree (e.g., `packages/reaction-diffusion-2d`).
        # `--extra dev` pulls in pytest itself per the workspace member's
        # optional-dependencies group.
        proc = subprocess.run(
            [
                "uv",
                "run",
                "--directory",
                pytest_target,
                "--extra",
                "dev",
                "pytest",
                "-v",
                "--tb=short",
            ],
            cwd=worktree,
            capture_output=True,
            check=False,
        )
        # stdout only: uv emits environment-setup notices on stderr
        # ("Creating virtual environment at ...", "VIRTUAL_ENV does not
        # match...") which are tooling noise, not pytest's report.
        actual_raw = proc.stdout
    finally:
        _remove_worktree(root, worktree)

    paths = (bytes(str(root), "utf-8"), bytes(str(worktree), "utf-8"))
    expected_norm = normalize_pytest_output(expected_raw, paths)
    actual_norm = normalize_pytest_output(actual_raw, paths)
    expected_sha = hashlib.sha256(expected_norm).hexdigest()
    actual_sha = hashlib.sha256(actual_norm).hexdigest()

    raw_diff_lines = sum(
        1
        for a, b in zip(
            expected_raw.splitlines(keepends=True),
            actual_raw.splitlines(keepends=True),
            strict=False,
        )
        if a != b
    )
    structural_match = expected_sha == actual_sha
    failures: list[str] = []
    if not structural_match:
        failures.append(f"normalized sha256 mismatch: expected={expected_sha} actual={actual_sha}")

    return ReplayResult(
        commit=commit,
        evidence_path=evidence_path,
        pytest_target=pytest_target,
        expected_normalized_sha256=expected_sha,
        actual_normalized_sha256=actual_sha,
        structural_match=structural_match,
        raw_diff_lines=raw_diff_lines,
        failures=failures,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m integrity.scripts.replay_failing_tests")
    parser.add_argument("--commit", required=True, help="Failing-tests commit SHA.")
    parser.add_argument("--evidence", required=True, type=Path)
    parser.add_argument(
        "--pytest-target",
        required=True,
        help="Path to the package directory pytest runs against (uv run --directory).",
    )
    args = parser.parse_args(list(argv) if argv is not None else sys.argv[1:])

    try:
        result = replay(args.commit, args.evidence, args.pytest_target)
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        print(f"replay_failing_tests: {exc}", file=sys.stderr)
        return 1

    print(f"  commit                  {result.commit}")
    print(f"  evidence                {result.evidence_path}")
    print(f"  expected_sha256_norm    {result.expected_normalized_sha256}")
    print(f"  actual_sha256_norm      {result.actual_normalized_sha256}")
    print(f"  match                   {result.ok}")
    print(f"  raw_lines_differing     {result.raw_diff_lines}")
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
