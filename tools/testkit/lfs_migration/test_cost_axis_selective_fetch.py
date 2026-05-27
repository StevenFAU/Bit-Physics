"""Cost-axis -- selective LFS fetch (probe section P3; charter section 4.2).

The dashboard-anchored load-bearing constraint is monthly LFS *bandwidth*, not
storage. The lever is selective fetch: a workflow may pull the full LFS object
set at checkout (``lfs: true``) only if it genuinely needs the canonical
captures. Per probe section P3 *no* workflow does -- ``cpp-strict`` needs none;
``python-strict`` needs only the legacy-captures corpus, which Stage 1b fetches
with a targeted ``git lfs pull --include=`` after ``lfs: false``.

This file encodes that RULE (not merely the current state):

* ``test_workflow_capture_requirements_registry_is_complete`` -- GREEN lock:
  the declared requirement registry covers exactly the workflow set, so a new
  workflow added without a declaration is caught.
* ``test_no_workflow_overfetches_lfs`` -- RED until Stage 1b: a workflow whose
  declared requirement is not ``full`` must not set ``lfs: true``. Two
  workflows (``python-strict``, ``cpp-strict``) violate this today.

Satisfaction target (Stage 1b): ``cpp-strict`` -> ``lfs: false``;
``python-strict`` -> ``lfs: false`` + ``git lfs pull
--include="tests/fixtures/legacy-captures/**"``. Then zero workflows set
``lfs: true`` and the RED test goes GREEN (its strict-xfail XPASS forces the
marker off).
"""

from __future__ import annotations

from lfs_migration._helpers import red_until_stage_1b, repo_root

# Per-workflow committed-capture requirement (probe section P3).
#   "none"        -> reads no committed LFS object
#   "corpus-only" -> needs only tests/fixtures/legacy-captures/** (targeted pull)
#   "full"        -> genuinely needs the full canonical capture set (none today)
WORKFLOW_CAPTURE_REQUIREMENT: dict[str, str] = {
    "structure.yml": "none",
    "integrity.yml": "none",
    "tolerance-budget-check.yml": "none",
    "audit-append-only.yml": "none",
    "ts-strict.yml": "none",
    "determinism.yml": "none",
    "equivalence.yml": "none",
    "python-strict.yml": "corpus-only",
    "cpp-strict.yml": "none",
    "mutation-testing.yml": "none",
}

_WORKFLOW_DIR = ".github/workflows"


def _workflow_files() -> set[str]:
    return {p.name for p in (repo_root() / _WORKFLOW_DIR).glob("*.yml")}


def _sets_lfs_true(name: str) -> bool:
    text = (repo_root() / _WORKFLOW_DIR / name).read_text(encoding="utf-8")
    return "lfs: true" in text


def test_workflow_capture_requirements_registry_is_complete() -> None:
    """The requirement registry covers exactly the present workflow set."""
    assert set(WORKFLOW_CAPTURE_REQUIREMENT) == _workflow_files(), (
        "registry drift: declare a capture requirement for every workflow "
        "(undeclared additions / stale removals are a STOP-class signal)"
    )


@red_until_stage_1b(
    "cpp-strict -> lfs:false; python-strict -> lfs:false + targeted "
    "`git lfs pull --include=tests/fixtures/legacy-captures/**` (so no "
    "non-`full` workflow sets lfs:true)"
)
def test_no_workflow_overfetches_lfs() -> None:
    """Only a workflow declared ``full`` may set ``lfs: true``."""
    overfetchers = [
        name
        for name, requirement in WORKFLOW_CAPTURE_REQUIREMENT.items()
        if _sets_lfs_true(name) and requirement != "full"
    ]
    assert not overfetchers, (
        f"workflows set lfs:true without a 'full' capture requirement: {sorted(overfetchers)}"
    )
