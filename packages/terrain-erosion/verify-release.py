"""Reproducible local numerical release checks; browser evidence is separate."""

from __future__ import annotations
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "packages/terrain-erosion/evidence"
original = ROOT / "tools/testkit/failing-tests-evidence/terrain-erosion-20260907.txt"
recorded = hashlib.sha256(original.read_bytes()).hexdigest()
commit = subprocess.check_output(
    ["git", "show", "-s", "--format=%B", "c5aef3b"], cwd=ROOT, text=True
)
assert recorded in commit
with tempfile.TemporaryDirectory(prefix="canyon-failing-replay-") as tmp:
    test = Path(tmp) / "test_reference.py"
    test.write_bytes(
        subprocess.check_output(
            ["git", "show", "c5aef3b:packages/terrain-erosion/tests/test_reference.py"],
            cwd=ROOT,
        )
    )
    # Isolated temporary cwd, no current package import path.
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(test), "-q"],
        cwd=tmp,
        capture_output=True,
        text=True,
    )
    output = result.stdout + result.stderr
    assert result.returncode != 0 and "ModuleNotFoundError" in output
    (EVIDENCE / "failing-replay.txt").write_text(output)
(EVIDENCE / "failing-replay.json").write_text(
    json.dumps(
        {
            "commit": "c5aef3b",
            "recorded_output_sha256": recorded,
            "footer_matches": True,
            "isolated_preimplementation_tests_fail": True,
            "note": "Verbatim original output hash verified. Replayed traceback/time differ with cwd and pytest environment; failure class is reproduced.",
        },
        indent=2,
    )
    + "\n"
)
