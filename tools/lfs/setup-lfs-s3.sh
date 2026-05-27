#!/usr/bin/env bash
# tools/lfs/setup-lfs-s3.sh — per-job Cloudflare R2 transfer-agent configuration.
#
# SOURCE this script (do not execute) inside a CI run-block that needs to fetch
# or push git-LFS objects from/to R2. It installs the lfs-s3 custom-transfer
# agent and registers it as the standalone transfer agent FOR THE CURRENT
# CHECKOUT ONLY, then exports the S3 endpoint/region that lfs-s3 reads:
#
#     source tools/lfs/setup-lfs-s3.sh
#     git lfs pull --include="tests/fixtures/legacy-captures/**"
#
# WHY per-job (not a committed root .lfsconfig): lfs-s3 activates via
# `lfs.standalonetransferagent`, which routes ALL git-LFS transfers through it
# and bypasses GitHub LFS. A committed root .lfsconfig would impose that on local
# dev + every workflow, breaking object resolution wherever lfs-s3/credentials
# are absent — i.e. the M5 cutover, not the additive M1. Configuring it per job
# keeps the committed repo GitHub-LFS-default (charter § 6 M1 amendment; D4
# fallback: a checkout without R2 config resolves via GitHub LFS exactly as today).
#
# Required environment (a CI job sets these from repo secrets):
#   R2_ACCOUNT_ID          — Cloudflare account id; builds the S3 endpoint
#   AWS_ACCESS_KEY_ID      = secrets.R2_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY  = secrets.R2_SECRET_ACCESS_KEY
#   S3_BUCKET              = secrets.R2_BUCKET_NAME
# Optional:
#   AWS_REGION             (default: auto — Cloudflare R2 convention)
#   LFS_S3_VERSION         (default: 0.2.2 — pinned release tag, un-prefixed)
#   LFS_S3_BIN_DIR         (default: $HOME/.local/bin)
#
# lfs-s3 (nicolas-graves, v0.2.2) reads S3_BUCKET / AWS_S3_ENDPOINT / AWS_REGION /
# AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from the environment, so credentials
# are never written into git config or process args.
set -euo pipefail

: "${R2_ACCOUNT_ID:?set R2_ACCOUNT_ID (Cloudflare account id)}"
: "${AWS_ACCESS_KEY_ID:?set AWS_ACCESS_KEY_ID (= secrets.R2_ACCESS_KEY_ID)}"
: "${AWS_SECRET_ACCESS_KEY:?set AWS_SECRET_ACCESS_KEY (= secrets.R2_SECRET_ACCESS_KEY)}"
: "${S3_BUCKET:?set S3_BUCKET (= secrets.R2_BUCKET_NAME)}"

export AWS_REGION="${AWS_REGION:-auto}"
export AWS_S3_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

_lfs_s3_version="${LFS_S3_VERSION:-0.2.2}"
_lfs_s3_bin_dir="${LFS_S3_BIN_DIR:-${HOME}/.local/bin}"
mkdir -p "${_lfs_s3_bin_dir}"

# Install the pinned release binary. lfs-s3 tags are un-prefixed (e.g. "0.2.2"),
# so `go install ...@vX.Y.Z` does not apply; the linux release asset is used.
if ! command -v lfs-s3 >/dev/null 2>&1; then
  _url="https://github.com/nicolas-graves/lfs-s3/releases/download/${_lfs_s3_version}/lfs-s3-linux"
  curl -fsSL "${_url}" -o "${_lfs_s3_bin_dir}/lfs-s3"
  chmod +x "${_lfs_s3_bin_dir}/lfs-s3"
fi
export PATH="${_lfs_s3_bin_dir}:${PATH}"

# Register lfs-s3 as the standalone transfer agent for THIS checkout only
# (--replace-all keeps re-runs idempotent). No credentials touch git config.
git config --local --replace-all lfs.standalonetransferagent lfs-s3
git config --local --replace-all lfs.customtransfer.lfs-s3.path "$(command -v lfs-s3)"

echo "lfs-s3 ready: $(command -v lfs-s3) | endpoint=${AWS_S3_ENDPOINT} bucket=${S3_BUCKET} region=${AWS_REGION}"
