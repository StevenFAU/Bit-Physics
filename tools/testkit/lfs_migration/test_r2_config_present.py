"""R2 integration config surface (probe section P4; charter sections 5-6).

RED-only at Stage 1a: Stage 1a does not touch R2, .lfsconfig, or any workflow
secret. These tests encode Stage 1b's static-config PASS target so it is
unambiguous. There is deliberately NO live-network test here -- R2 endpoint
reachability is deferred to the Stage 1b M2 test-object proof (charter section
6, M2); Stage 1a asserts only repo-resident configuration.

The four R2 GitHub Actions secrets (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_ACCOUNT_ID, R2_BUCKET_NAME) exist at repo Settings per the Stage 1a
operator input (UNKNOWN-4 resolved). Their *values* are never read; this
surface checks only that workflows *reference* them by name.

Satisfaction targets (Stage 1b):
* M1 -> commit a repo-root ``.lfsconfig`` pointing at the R2 S3 endpoint via
  the ``lfs-s3`` standalone transfer agent.
* workflow edits -> reference all four R2 secrets via ``secrets.<NAME>``.
"""

from __future__ import annotations

from lfs_migration._helpers import red_until_stage_1b, repo_root

R2_SECRET_NAMES = (
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ACCOUNT_ID",
    "R2_BUCKET_NAME",
)

_WORKFLOW_DIR = ".github/workflows"
_R2_ENDPOINT_MARKERS = ("r2.cloudflarestorage.com", "lfs-s3")


@red_until_stage_1b("Stage 1b M1 commits a repo-root .lfsconfig pointing at the R2 endpoint")
def test_lfsconfig_points_to_r2() -> None:
    """A repo-root ``.lfsconfig`` exists and references the R2 / lfs-s3 backend."""
    lfsconfig = repo_root() / ".lfsconfig"
    assert lfsconfig.exists(), ".lfsconfig not present (Stage 1b M1 adds it)"
    text = lfsconfig.read_text(encoding="utf-8")
    assert any(marker in text for marker in _R2_ENDPOINT_MARKERS), (
        f".lfsconfig present but references none of {_R2_ENDPOINT_MARKERS}"
    )


@red_until_stage_1b("Stage 1b workflow edits reference all four R2 secrets via secrets.<NAME>")
def test_all_r2_secrets_referenced_by_a_workflow() -> None:
    """Each of the four R2 secrets is referenced by at least one workflow."""
    blob = "\n".join(
        p.read_text(encoding="utf-8") for p in (repo_root() / _WORKFLOW_DIR).glob("*.yml")
    )
    unreferenced = [name for name in R2_SECRET_NAMES if f"secrets.{name}" not in blob]
    assert not unreferenced, f"R2 secrets not referenced by any workflow: {unreferenced}"
