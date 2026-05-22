"""Regression test for the mutation-testing wrapper script's target-path validator.

Landed at sub-phase-mutation-script-hotfix per the validator-bug
surfaced at sub-phase-particle-fluids-sph-water Stage 2 (the first
file-shaped target, ``sph_water_dfsph_generator`` at commit
``dae7040``, exposed an implicit "directory-only" assumption in the
pre-check at ``tools/testkit/mutation/run-mutation.sh``).

Tests follow the same shape pattern as the replay-tool-hotfix
regression suite at ``test_replay_prior_phase.py``:

1. ``test_run_mutation_validator_uses_existence_check_not_directory_only``
   — source-level assertion that the validator uses ``-e`` (existence)
   rather than ``-d`` (directory-only). Fast; deterministic; catches
   any future regression at the source level.

2. ``test_run_mutation_baseline_passes_with_current_config`` — end-to-
   end test that runs ``bash run-mutation.sh --baseline`` and asserts
   it exits 0 with no validator-FAIL messages. Re-verifies the
   integration at HEAD's actual mutmut-config.toml (which includes the
   file-shaped sph_water_dfsph_generator target). The script writes a
   baseline-<UTC>.json artifact; the test cleans up the artifact it
   creates.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SCRIPT = _REPO_ROOT / "tools/testkit/mutation/run-mutation.sh"


def test_run_mutation_validator_uses_existence_check_not_directory_only() -> None:
    """Validator must accept both file and directory paths (use ``-e``).

    Source-level assertion that locks in the post-fix behavior. The
    pre-fix source used ``[[ ! -d "${path}" ]]`` (directory-only,
    failed on the file-shaped sph_water_dfsph_generator target). The
    post-fix source uses ``[[ ! -e "${path}" ]]``.

    If a future refactor regresses to a directory-only check, this
    test will fail with the offending flag named in the message.
    """
    assert _SCRIPT.exists(), f"script missing at {_SCRIPT}"
    source = _SCRIPT.read_text(encoding="utf-8")
    # Match the validator regardless of comment / whitespace context.
    # The validator's structural shape is ``[[ ! -X "${path}" ]]`` for
    # some flag X. We want X == 'e' (existence) so both files and
    # directories pass.
    matches = re.findall(r'\[\[\s*!\s*-([a-zA-Z])\s+"\$\{path\}"\s*\]\]', source)
    assert matches, (
        f"could not find target-path validator at expected shape in {_SCRIPT}; "
        f"a refactor may have changed the structural shape — update this regression "
        f"test to match the new shape, but do NOT relax the determinism contract "
        f"(both file and directory paths must be accepted)"
    )
    assert "d" not in matches, (
        "validator regression: ``-d`` (directory-only) flag found at line(s) "
        'matching ``[[ ! -d "${path}" ]]``; should be ``-e`` (existence) '
        "per the sub-phase-mutation-script-hotfix repair. mutmut accepts "
        "both file and directory paths for --paths-to-mutate; the wrapper's "
        "pre-check must match."
    )
    assert all(m == "e" for m in matches), (
        f"validator regression: unexpected flag(s) {matches!r}; should be 'e' "
        f"(existence check). If you intended a refactor to a different shape, "
        f"update this regression test deliberately."
    )


def test_run_mutation_baseline_passes_with_current_config() -> None:
    """End-to-end: ``bash run-mutation.sh --baseline`` exits 0 with the live config.

    Re-verifies integration with HEAD's tools/testkit/mutation/mutmut-config.toml,
    which includes the file-shaped sph_water_dfsph_generator target
    (landed at sub-phase-particle-fluids-sph-water Stage 2 commit
    ``dae7040``). Pre-fix this test would fail with
    ``FAIL: target sph_water_dfsph_generator path missing: ...``.

    The script's --baseline mode writes a baseline-<UTC>.json artifact;
    we record the artifact path before/after to clean up the one this
    test creates. (Other prior baselines stay in place — those are
    historical artifacts the team has chosen to retain.)
    """
    before = {p.name for p in (_REPO_ROOT / "tools/testkit/mutation").glob("baseline-*.json")}
    result = subprocess.run(
        ["bash", str(_SCRIPT), "--baseline"],
        cwd=_REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
    )
    after = {p.name for p in (_REPO_ROOT / "tools/testkit/mutation").glob("baseline-*.json")}
    new_artifacts = after - before
    # Clean up the test-induced baseline JSON so the repo stays clean
    # (regardless of pass/fail outcome).
    import contextlib

    for fname in new_artifacts:
        with contextlib.suppress(OSError):
            (_REPO_ROOT / "tools/testkit/mutation" / fname).unlink()

    assert result.returncode == 0, (
        f"run-mutation.sh --baseline exited {result.returncode}; expected 0\n"
        f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    )
    assert "FAIL: target" not in result.stderr, (
        f"validator rejected a target path:\n{result.stderr}"
    )
    # Sanity-check expected progress line ("N target paths validated").
    assert "target paths validated" in result.stdout, (
        f"expected 'target paths validated' message in stdout; got:\n{result.stdout}"
    )


def test_run_mutation_validator_rejects_truly_missing_path(tmp_path: Path) -> None:
    """Safety check: the validator still REJECTS paths that don't exist at all.

    The fix (``-d`` → ``-e``) widens acceptance from directory-only to
    "any path that exists." It must NOT regress to "always pass" — a
    typo'd path in mutmut-config.toml should still surface as a
    validator FAIL.

    Approach: write a synthetic mutmut-config.toml in tmp_path with a
    target pointing to a path that does not exist, then run a minimal
    bash snippet that mirrors the validator. This avoids running the
    full run-mutation.sh script against a synthetic config (the script
    has hardcoded ``cd "$(dirname "$0")"/../../..`` and config-path
    expectations).
    """
    nonexistent = tmp_path / "definitely-does-not-exist"
    # Mirror the post-fix validator logic exactly.
    snippet = f'''\
path="{nonexistent}"
if [[ ! -e "${{path}}" ]]; then
  echo "FAIL: missing"
  exit 1
fi
echo "PASS"
'''
    result = subprocess.run(
        ["bash", "-c", snippet],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 1, (
        f"validator should reject nonexistent path; got exit {result.returncode}"
    )
    assert "FAIL: missing" in result.stdout
