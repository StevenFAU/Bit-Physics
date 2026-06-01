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

4. **The ``plugins:`` line** (Phase-4 consolidation C2). The installed-plugin
   list is env-dependent: the evidence is captured in the author's active venv
   (often a narrow root ``.venv``) while the replay runs in a worktree synced
   ``--all-packages --all-extras`` (a superset). The differing list is the sole
   cause of normalized-hash drift once paths/versions/timing collapse (the
   "anyio / plugin-set leak", batch-2/3-close §6); it is collapsed so the hash
   attests the structural RED, not the venv's plugin inventory.

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

# Pytest's `plugins:` line enumerates the plugins installed in the ACTIVE venv:
#   "plugins: cov-7.1.0, hypothesis-6.152.8, anyio-4.13.0"
# This set is env-dependent, NOT a property of the structural RED. The committed
# evidence is captured in whatever venv the author had active (often a narrow root
# `.venv`), while the replay runs in a worktree synced `--all-packages --all-extras`
# (a SUPERSET — e.g. + hydra-core, pytest-timeout, jaxtyping pulled by sibling
# members' dev extras). The differing plugin list is the sole load-bearing cause of
# normalized-hash drift once paths/versions/timing are collapsed (the "anyio /
# plugin-set leak", batch-2/3-close §6). Collapse the whole list so gate-3/13 attest
# the structural RED (per-test outcomes, error types, tracebacks) regardless of which
# venv produced the evidence — the same rationale as the version-trio/rootdir lines.
_PYTEST_PLUGINS = re.compile(rb"^(plugins:)\s+.*$", re.MULTILINE)
_PYTEST_PLUGINS_PLACEHOLDER = rb"\1 <PLUGINS>"


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
    out = _PYTEST_PLUGINS.sub(_PYTEST_PLUGINS_PLACEHOLDER, out)
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


def _sync_worktree(target: Path) -> None:
    """`uv sync` the checked-out worktree so the replay runs against a built env.

    Mirrors ``replay_prior_phase._checkout_worktree``'s sync. Two reasons this
    is load-bearing for gate-13 byte-stability (batch-2-close §6 findings #3/#4):

    1. **Plugin-set parity.** The committed failing-tests-evidence is captured in
       the project's standard root ``.venv`` (``uv sync --all-packages``), whose
       pytest ``plugins:`` line is the superset (e.g. ``cov, hypothesis, anyio``).
       A freshly-checked-out worktree run through a per-package ``uv run`` would
       otherwise resolve a NARROWER plugin set, changing the ``plugins:`` line and
       breaking the normalized-hash match. Syncing with the SAME
       ``--all-packages --all-extras`` reproduces the capture env's plugin set.
    2. **No first-run build stdout.** ``uv run`` in an unsynced worktree emits
       uv's first-run build output intermittently onto stdout (finding #4),
       perturbing the hash. Pre-syncing (then running the pytest step
       ``--no-sync``) removes that race.

    Best-effort + guarded exactly like ``replay_prior_phase``: stub fixtures
    (the unit tests under ``tools/integrity/tests/``) ship a bare git repo with
    no ``pyproject.toml``/``uv.lock`` — for those the sync is skipped so the
    stub path stays exercisable.
    """
    if (target / "pyproject.toml").exists() and (target / "uv.lock").exists():
        subprocess.run(
            ["uv", "sync", "--frozen", "--all-packages", "--all-extras"],
            cwd=target,
            capture_output=True,
            text=True,
            check=True,
        )


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
    _sync_worktree(target)
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


def _run_target_in_worktree(root: Path, commit: str, pytest_target: str) -> tuple[bytes, Path]:
    """Check out ``commit`` (synced), run the canonical pytest, clean up.

    Returns ``(stdout_bytes, worktree_path)``. The worktree is removed before
    return; the path string is still needed by callers for the ``<REPO>``
    canonicalization substitution. ``--no-sync`` on the run leans on the
    ``_sync_worktree`` step in ``_checkout_worktree`` so uv does not re-resolve
    (and so the run emits no first-run build stdout — batch-2-close §6 #4).

    This single code path is shared by ``replay`` (compare) and
    ``generate_evidence`` (emit) so the recorded evidence and the replay it is
    checked against are produced in the SAME worktree env (B-2: no
    root-.venv-vs-worktree plugin-set drift).
    """
    worktree = _checkout_worktree(root, commit)
    try:
        # Run pytest in the worktree against the same target the original
        # evidence captured. The pytest_target argument is interpreted
        # relative to the worktree (e.g., `packages/reaction-diffusion-2d`).
        # `--extra dev` pulls in pytest itself per the workspace member's
        # optional-dependencies group; `--no-sync` uses the already-synced
        # `.venv` so no first-run build output lands on stdout.
        proc = subprocess.run(
            [
                "uv",
                "run",
                "--no-sync",
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
        return proc.stdout, worktree
    finally:
        _remove_worktree(root, worktree)


def generate_evidence(
    commit: str,
    pytest_target: str,
    output_path: Path,
    repo_root: Path | None = None,
) -> Path:
    """Emit a failing-tests-evidence file from the worktree the replay uses.

    The B-2 evidence-from-worktree refinement: rather than capturing evidence
    in the developer's ambient root ``.venv`` (which can leak a different plugin
    set than the synced replay worktree), generate it by checking out the
    failing-tests commit, syncing the worktree, and capturing that worktree's
    raw pytest stdout. ``replay`` then re-runs the IDENTICAL path → byte-stable
    by construction. Writes RAW (un-normalized) bytes; normalization happens
    only at hash time, matching every other committed evidence file.
    """
    root = repo_root or find_repo_root()
    if not output_path.is_absolute():
        output_path = (root / output_path).resolve()
    actual_raw, _worktree = _run_target_in_worktree(root, commit, pytest_target)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(actual_raw)
    return output_path


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

    actual_raw, worktree = _run_target_in_worktree(root, commit, pytest_target)

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
    parser.add_argument(
        "--generate",
        action="store_true",
        help=(
            "Emit (instead of compare) the evidence file at --evidence by running "
            "the failing tests in the synced replay worktree (B-2 evidence-from-"
            "worktree refinement). Use this to author a byte-stable evidence file."
        ),
    )
    args = parser.parse_args(list(argv) if argv is not None else sys.argv[1:])

    if args.generate:
        try:
            out = generate_evidence(args.commit, args.pytest_target, args.evidence)
        except subprocess.CalledProcessError as exc:
            print(f"replay_failing_tests: {exc}", file=sys.stderr)
            return 1
        print(f"  generated evidence      {out}")
        print(f"  commit                  {args.commit}")
        print(f"  pytest_target           {args.pytest_target}")
        return 0

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
