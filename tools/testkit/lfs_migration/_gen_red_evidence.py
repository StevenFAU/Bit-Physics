"""Deterministic RED-evidence generator for the lfs_migration surface.

Not a test module (leading underscore). Run manually to (re)produce the
Stage 1a failing-tests evidence file and its sha256:

    cd tools/testkit
    uv run --no-sync python -m lfs_migration._gen_red_evidence <out-file>

It runs the RED surface with ``--runxfail`` (so the ``red_until_stage_1b``
xfail markers are ignored and the three RED tests fail for real), captures the
output, and applies the *canonical* project normalization
(``integrity.scripts.replay_failing_tests.normalize_pytest_output``: timing
summary -> ``NN.NNs``; platform interpreter -> ``<INTERPRETER>``; absolute repo
path -> ``<REPO>``). The normalized bytes are written to the evidence file; its
sha256 is the value recorded in the commit footer and is reproducible by
re-running this generator on the same surface.

Pinned pytest invocation (the reproducibility contract):
    python -m pytest --runxfail -v --tb=short -p no:cacheprovider lfs_migration/
"""

from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

from integrity.scripts.replay_failing_tests import normalize_pytest_output

from lfs_migration._helpers import repo_root, workspace_python

_PYTEST_ARGS = [
    "-m",
    "pytest",
    "--runxfail",
    "-v",
    "--tb=short",
    "-p",
    "no:cacheprovider",
    "lfs_migration/",
]


def generate(out_path: Path) -> str:
    """Run the RED surface, normalize, write ``out_path``, return its sha256."""
    testkit = repo_root() / "tools" / "testkit"
    proc = subprocess.run(
        [workspace_python(), *_PYTEST_ARGS],
        cwd=str(testkit),
        capture_output=True,
        check=False,
    )
    normalized = normalize_pytest_output(proc.stdout, (bytes(str(repo_root()), "utf-8"),))
    # The canonical normalizer's summary regex consumes the trailing newline;
    # re-add exactly one so the artifact is EOF-clean (end-of-file-fixer no-op)
    # and the recorded sha256 stays stable across the commit hook.
    normalized = normalized.rstrip(b"\n") + b"\n"
    out_path.write_bytes(normalized)
    return hashlib.sha256(normalized).hexdigest()


def main(argv: list[str] | None = None) -> int:
    args = list(argv) if argv is not None else sys.argv[1:]
    if len(args) != 1:
        print("usage: python -m lfs_migration._gen_red_evidence <out-file>", file=sys.stderr)
        return 2
    out_path = Path(args[0])
    if not out_path.is_absolute():
        out_path = (repo_root() / out_path).resolve()
    digest = generate(out_path)
    print(f"evidence: {out_path}")
    print(f"sha256:   {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
