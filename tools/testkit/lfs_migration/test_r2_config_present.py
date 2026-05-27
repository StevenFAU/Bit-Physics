"""R2 integration config surface (probe section P4; charter sections 5-6).

GREEN at Stage 1b. These were RED at Stage 1a; Stage 1b satisfied them via the
operator-ratified **per-job** mechanism (charter Stage-1b amendment): there is
deliberately **no committed root ``.lfsconfig``** — that standalone-agent switch
would bypass GitHub LFS for the whole repo (the M5 cutover, not the additive
M1). Instead a CI job that needs R2 sources ``tools/lfs/setup-lfs-s3.sh`` to
register the agent for its checkout only. The committed root ``.lfsconfig`` is
deferred to the operator-gated **M5** cutover (charter § 6 M5), so it is NOT a
Stage-1b assertion here.

There is no live-network test; R2 reachability was proven once by the M2
round-trip workflow (``.github/workflows/r2-roundtrip-proof.yml``), evidenced at
``docs/_audits/phase-2/sub-phase-lfs-architecture/r2-roundtrip-proof-*.md``.
"""

from __future__ import annotations

from lfs_migration._helpers import repo_root

R2_SECRET_NAMES = (
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ACCOUNT_ID",
    "R2_BUCKET_NAME",
)

_WORKFLOW_DIR = ".github/workflows"
_SETUP_SCRIPT = "tools/lfs/setup-lfs-s3.sh"


def test_per_job_r2_transfer_agent_configured() -> None:
    """The per-job R2 mechanism exists: the helper registers the lfs-s3 agent + endpoint.

    This is the ratified Stage-1b realization of charter § 6 M1 (per-job, not a
    committed root ``.lfsconfig``). The committed-``.lfsconfig`` cutover is an M5
    target and is intentionally NOT asserted here.
    """
    script = repo_root() / _SETUP_SCRIPT
    assert script.exists(), f"{_SETUP_SCRIPT} (per-job R2 agent helper) missing"
    text = script.read_text(encoding="utf-8")
    assert "lfs.standalonetransferagent lfs-s3" in text, "helper must register the standalone agent"
    assert "lfs.customtransfer.lfs-s3.path" in text, "helper must set the custom-transfer path"
    assert "r2.cloudflarestorage.com" in text, "helper must target the Cloudflare R2 S3 endpoint"
    # No committed root .lfsconfig at Stage 1b (deferred to the M5 cutover).
    assert not (repo_root() / ".lfsconfig").exists(), (
        "a committed root .lfsconfig is the M5 cutover, not Stage 1b (per-job config only)"
    )


def test_all_r2_secrets_referenced_by_a_workflow() -> None:
    """Each of the four R2 secrets is referenced by at least one workflow."""
    blob = "\n".join(
        p.read_text(encoding="utf-8") for p in (repo_root() / _WORKFLOW_DIR).glob("*.yml")
    )
    unreferenced = [name for name in R2_SECRET_NAMES if f"secrets.{name}" not in blob]
    assert not unreferenced, f"R2 secrets not referenced by any workflow: {unreferenced}"
