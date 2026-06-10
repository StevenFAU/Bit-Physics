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

from lfs_migration._helpers import repo_root

# Per-workflow committed-capture requirement (probe section P3).
#   "none"              -> reads no committed LFS object
#   "corpus-only"       -> needs only tests/fixtures/legacy-captures/** (targeted pull)
#   "reference-capture" -> needs a narrow committed canonical capture set (targeted pull)
#   "full"              -> genuinely needs the full canonical capture set (none today)
WORKFLOW_CAPTURE_REQUIREMENT: dict[str, str] = {
    "structure.yml": "none",
    "integrity.yml": "none",
    "tolerance-budget-check.yml": "none",
    "audit-append-only.yml": "none",
    "ts-strict.yml": "none",
    "determinism.yml": "none",
    "equivalence.yml": "none",
    "python-strict.yml": "corpus-only",
    # Stage-1b finding: the RD-2D-Stack-C ctests read the committed RD-2D reference
    # capture (captures/reaction-diffusion-2d-ref/**) — probe § 4.1 "none" was wrong.
    "cpp-strict.yml": "reference-capture",
    "mutation-testing.yml": "none",
    # Phase-3 task-7 (pinn-poisson) added this per-sim training/inference CI job.
    # It checks out `lfs: false` and reads no committed capture or checkpoint
    # (scratch training + gate-12 PBT subprocess), so it needs no LFS object.
    "pinn-train.yml": "none",
    # Stage 1b: the M2 R2 round-trip proof — operates on a throwaway object,
    # reads no committed capture; checks out lfs: false.
    "r2-roundtrip-proof.yml": "none",
    # Stage 1c: the M4 R2 sweep proof legitimately fetches the FULL committed LFS
    # object set — but FROM R2, into a throwaway lfs.storage, to verify sha256 ==
    # OID at HEAD + every phase tag. It checks out lfs: false and fetches
    # explicitly (never lfs: true), so it does not over-fetch via the smudge path.
    "r2-sweep-proof.yml": "full",
    # Phase-5 productization workflows (declared at the post-phase-5 housekeeping
    # sweep — the registry lock caught their addition; operator-ratified 2026-06-10).
    # All five check out `lfs: false`; the four that read committed canonical
    # captures fetch them with a targeted `git lfs pull --include=` (R2-routed
    # when R2_* secrets are present, GitHub LFS otherwise).
    #
    # 5.1 web-deploy: per-sim validate jobs re-apply each sim's established gate
    # to the browser-emitted capture, comparing against that sim's committed
    # canonical (pull --include="captures/**" inside the per-sim job).
    "web-deploy.yml": "reference-capture",
    # 5.2 binary-release: § 3.8 bootstrap gate compares the clean-build capture
    # against the two qualifying packages' committed references
    # (captures/reaction-diffusion-2d-stack-c/** + captures/mass-spring-cloth-ref/**).
    "binary-release.yml": "reference-capture",
    # 5.3 pypi-release: per-sim bootstrap gate pulls the sim's canonical capture
    # as the compare surrogate (pull --include="captures/**" per-sim job; logs
    # 'no LFS captures for this sim (surrogate)' when a sim has none).
    "pypi-release.yml": "reference-capture",
    # 5.4 render-passes: convert step reads the matrix sim's committed canonical
    # capture (pull --include="captures/<sim>-ref/**").
    "render-passes.yml": "reference-capture",
    # 5.5 preprint-extraction: extracts LaTeX from tracked docs + compiles with a
    # pinned TinyTeX; reads no committed LFS object (no lfs pull anywhere).
    "preprint-extraction.yml": "none",
}

_WORKFLOW_DIR = ".github/workflows"


def _workflow_files() -> set[str]:
    return {p.name for p in (repo_root() / _WORKFLOW_DIR).glob("*.yml")}


def _sets_lfs_true(name: str) -> bool:
    """True iff the workflow has an actual ``lfs: true`` setting (not a comment mention)."""
    text = (repo_root() / _WORKFLOW_DIR / name).read_text(encoding="utf-8")
    return any(line.strip() == "lfs: true" for line in text.splitlines())


def test_workflow_capture_requirements_registry_is_complete() -> None:
    """The requirement registry covers exactly the present workflow set."""
    assert set(WORKFLOW_CAPTURE_REQUIREMENT) == _workflow_files(), (
        "registry drift: declare a capture requirement for every workflow "
        "(undeclared additions / stale removals are a STOP-class signal)"
    )


def test_no_workflow_overfetches_lfs() -> None:
    """Only a workflow declared ``full`` may set ``lfs: true``.

    GREEN at Stage 1b: the selective-fetch cutover (charter § 4.2) set both
    former over-fetchers to ``lfs: false`` (cpp-strict reads no capture;
    python-strict pulls only the legacy-captures corpus targeted). No workflow
    is ``full``, and none sets ``lfs: true``.
    """
    overfetchers = [
        name
        for name, requirement in WORKFLOW_CAPTURE_REQUIREMENT.items()
        if _sets_lfs_true(name) and requirement != "full"
    ]
    assert not overfetchers, (
        f"workflows set lfs:true without a 'full' capture requirement: {sorted(overfetchers)}"
    )
