# `tools/lfs/` — Cloudflare R2 LFS transfer-agent tooling

Operational tooling for routing git-LFS object transfers to **Cloudflare R2** via
the [`lfs-s3`](https://github.com/nicolas-graves/lfs-s3) custom-transfer agent.
Landed by `sub-phase-lfs-architecture` Stage 1b. Authoritative design:
`docs/phases/sub-phase-lfs-architecture.md` §§ 5–6 (+ the Stage-1b amendment block).

## The per-job model (additive, not a cutover)

`lfs-s3` activates **only** by setting `lfs.standalonetransferagent lfs-s3`, which
routes **every** git-LFS transfer through it and bypasses GitHub LFS. Committing
that switch to a root `.lfsconfig` would impose it on local dev and all 8 non-LFS
workflows — breaking object resolution wherever `lfs-s3`/credentials are absent.
That is the **M5 cutover**, not the additive **M1**.

So Stage 1b configures R2 **per job**: a workflow that needs R2 sources
`setup-lfs-s3.sh`, which installs the agent and registers it for **that checkout
only**. The committed repo stays **GitHub-LFS-default**; a checkout without R2
config resolves LFS objects via GitHub LFS exactly as before (this is the D4
fallback through the transition). The committed root `.lfsconfig` is deferred to
the operator-gated M5 cutover.

## `setup-lfs-s3.sh`

`source` it (do not execute — it exports env + configures the local repo):

```bash
source tools/lfs/setup-lfs-s3.sh
git lfs pull --include="tests/fixtures/legacy-captures/**"
```

Required env (CI sets these from repo secrets; lfs-s3 reads the `AWS_*`/`S3_*`
vars directly, so credentials never enter git config or process args):

| Env var | Source |
|---|---|
| `R2_ACCOUNT_ID` | `secrets.R2_ACCOUNT_ID` (builds the S3 endpoint) |
| `AWS_ACCESS_KEY_ID` | `secrets.R2_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `secrets.R2_SECRET_ACCESS_KEY` |
| `S3_BUCKET` | `secrets.R2_BUCKET_NAME` |
| `AWS_REGION` | optional, default `auto` |

The S3 endpoint is constructed at runtime as
`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.

## Local developer setup

To push/pull LFS objects against R2 locally, export the same env vars (using your
own scoped R2 token — never the CI secrets) and `source` the script. Without it,
your clone keeps using GitHub LFS, which is the intended default.

## Proof

`.github/workflows/r2-roundtrip-proof.yml` (M2) is a `workflow_dispatch` proof
that the agent reaches R2 with the repo secrets and round-trips an object by
content-OID. Evidence: `docs/_audits/phase-2/sub-phase-lfs-architecture/`.
