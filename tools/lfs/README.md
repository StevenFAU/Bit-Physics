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

## `r2-bulk-upload.sh` — M3 bulk upload (charter § 6 M3)

Uploads the **in-use** LFS objects to R2 via `lfs-s3`, then verifies every object
round-trips back from R2 (`sha256 == OID`). "In use" = the union of objects
referenced by `HEAD` and each prior phase tag (`v0.0.0-phase-0`, `v0.1.0-phase-1`,
`v0.2.0-phase-2`) — **the same set the M4 sweep walks**, so the upload surface and
the verification surface are identical.

It pushes via `git lfs push --object-id <remote> --stdin` over the exact OID list,
**not** `git lfs push --all`: an all-refs walk drags in referenced-by-nothing
historical degenerates (e.g. an empty-file OID from a long-since-fixed `.gitattributes`
glob mismatch) that no inspected ref needs and that aren't in the local cache. This
refines charter § 6 M3's planning-time `git lfs push --all` to the ref-union scope
(see the **AMENDMENT — Stage 1c** block in the charter; operator-ratified).

```bash
# Dry-run (no credentials, no transfer — prints the work-list + JSON manifest):
tools/lfs/r2-bulk-upload.sh --dry-run

# Real upload + full round-trip verify (needs the same R2 env as setup-lfs-s3.sh):
export R2_ACCOUNT_ID=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... S3_BUCKET=...
tools/lfs/r2-bulk-upload.sh 2>&1 | tee /tmp/m3-upload-$(date -u +%Y%m%dT%H%M%SZ).log
```

It `source`s `setup-lfs-s3.sh` for the real upload, so it inherits the **same env
contract** (`R2_ACCOUNT_ID` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` +
`S3_BUCKET`; `AWS_REGION` optional). The dry-run path needs **no** credentials.

- **Idempotent.** Objects are content-addressed (R2 key = OID), so a re-run re-PUTs
  identical bytes — no "already present" query needed (`lfs-s3` exposes none).
- **Verifies every object, not a sample.** Post-upload it re-fetches each object
  from R2 into a *temporary* `lfs.storage` dir (canonical `.git/lfs/objects`
  untouched) and asserts `sha256 == OID`. Any mismatch/absence ⇒ exit 1 (STOP).
- **JSON manifest** (`--manifest <path>`, default `/tmp/m3-bulk-upload-<UTC>.json`):
  per-object `{oid, path, size, push_status, roundtrip_sha256}` — the structured
  M3 evidence pasted into the M3 audit.

## Migration ordering (M3 → M4 → M5)

1. **M3** — `r2-bulk-upload.sh` puts every in-use object in R2 (additive; GitHub LFS
   still holds them — D4 fallback intact). Gate: all objects PASS round-trip.
2. **M4** — `.github/workflows/r2-sweep-proof.yml` proves every LFS pointer at `HEAD`
   and each prior phase tag resolves *from R2*. Gate: every pointer resolves.
3. **M5** — commit the root `.lfsconfig` that flips default resolution to R2 for all
   consumers. **D4 fallback ends here**: from this commit, a clone/CI run needs
   `lfs-s3` + R2 creds (or the read path R2 exposes) to resolve LFS content. Local
   dev that pulled LFS before M5 keeps its cache; fresh clones need the agent.

Each step gates the next; a failure at any step is a HARD RULE 2 STOP (no auto-recover).

## Proof

`.github/workflows/r2-roundtrip-proof.yml` (M2) is a `workflow_dispatch` proof
that the agent reaches R2 with the repo secrets and round-trips an object by
content-OID. Evidence: `docs/_audits/phase-2/sub-phase-lfs-architecture/`.
