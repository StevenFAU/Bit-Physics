#!/usr/bin/env bash
# tools/lfs/setup-lfs-s3-local.sh — durable LOCAL bootstrap for the lfs-s3
# Cloudflare-R2 transfer agent.
#
# The CI path (`tools/lfs/setup-lfs-s3.sh`) expects the R2 env vars to already
# be exported (in CI: from `secrets.R2_*`). On a developer / agent machine
# those secrets don't reach the shell automatically, and the lfs-architecture
# sub-phase landed without a one-command local opt-in — every Phase-3 sim
# Stage-1c LFS push from a local clone therefore failed (`STOP-LFS-PUSH`:
# common-3dgs Stage-1c paste-then-vanish; lenia STOP-LFS EOF).
#
# This script closes that gap: SOURCE it to (1) load the durable creds file at
# `~/.config/bit-physics/r2-credentials.env` (kept OUTSIDE the repo, mode 600),
# then (2) chain into `setup-lfs-s3.sh` so the lfs-s3 transfer agent is wired
# into THIS clone's trusted `.git/config` and exported into the environment.
# Idempotent. Never prints secret values. Errors loudly if the env file is
# missing, world-readable, or incomplete.
#
# USAGE
#   source tools/lfs/setup-lfs-s3-local.sh
#   tools/lfs/r2-bulk-upload.sh --dry-run            # work-list preview
#   tools/lfs/r2-bulk-upload.sh                      # real push + verify
#   git lfs push --object-id origin --stdin <<<"<oid>"   # single-object push
#
# OVERRIDE
#   BIT_PHYSICS_R2_ENV=/some/other/path source tools/lfs/setup-lfs-s3-local.sh
#
# WHY a separate file (not a flag on setup-lfs-s3.sh): keeps the CI script's
# contract narrow (env-only, no filesystem dependence on $HOME) — the CI path
# stays exactly as `r2-roundtrip-proof.yml` / `r2-sweep-proof.yml` source it.
#
# WHY ~/.config/bit-physics/ and not the repo: in-repo .lfsconfig CANNOT carry
# `lfs.standalonetransferagent` (git-lfs security ignores those keys from
# in-repo config — see docs/phases/sub-phase-lfs-architecture.md `AMENDMENT —
# Stage 1c / M5`). Secrets in $HOME, lfs.* keys in trusted .git/config: there
# is no fourth option.
set -u

# Refuse to run directly — the point is to export env into the calling shell.
# ${BASH_SOURCE[0]} == $0 means executed (no parent script); != means sourced.
if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  echo "setup-lfs-s3-local.sh: must be SOURCED, not executed (try: source $0)" >&2
  exit 2
fi

_bp_lfs_env="${BIT_PHYSICS_R2_ENV:-${HOME}/.config/bit-physics/r2-credentials.env}"

if [ ! -f "$_bp_lfs_env" ]; then
  echo "setup-lfs-s3-local.sh: credentials file not found: $_bp_lfs_env" >&2
  echo "  Create it (mode 600) with the six env vars listed in tools/lfs/README.md" >&2
  echo "  § 'Durable local credentials'. Never commit; never paste values into chat." >&2
  return 1 2>/dev/null || exit 1
fi

# Refuse a world- or group-readable creds file (other-bits set => 5,7).
_bp_lfs_env_mode="$(stat -c '%a' "$_bp_lfs_env" 2>/dev/null || stat -f '%A' "$_bp_lfs_env")"
case "$_bp_lfs_env_mode" in
  *[1-7][1-7]|*[1-7]) # group or other has any bits set
    echo "setup-lfs-s3-local.sh: $_bp_lfs_env has mode $_bp_lfs_env_mode; expected 600" >&2
    echo "  Run: chmod 600 $_bp_lfs_env" >&2
    return 1 2>/dev/null || exit 1
    ;;
esac

# Load the env file. `set -a` auto-exports everything assigned while it's on,
# so the values reach setup-lfs-s3.sh's `: "${VAR:?}"` checks AND lfs-s3 itself.
set -a
# shellcheck disable=SC1090
. "$_bp_lfs_env"
set +a

# Sanity-check WITHOUT printing values: every required var must be set + non-empty.
_bp_lfs_missing=""
for _v in S3_BUCKET R2_ACCOUNT_ID AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [ -z "${!_v:-}" ]; then _bp_lfs_missing="${_bp_lfs_missing:+$_bp_lfs_missing }$_v"; fi
done
if [ -n "$_bp_lfs_missing" ]; then
  echo "setup-lfs-s3-local.sh: missing required vars in $_bp_lfs_env: $_bp_lfs_missing" >&2
  unset _bp_lfs_env _bp_lfs_env_mode _bp_lfs_missing _v
  return 1 2>/dev/null || exit 1
fi

# Chain into the per-job script (installs agent + writes trusted .git/config).
# Locate it relative to THIS script so the order of `cd` in the caller doesn't matter.
_bp_lfs_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/lfs/setup-lfs-s3.sh
. "$_bp_lfs_dir/setup-lfs-s3.sh"

# Tidy up the bootstrap-only locals; leave the R2 env vars exported.
unset _bp_lfs_env _bp_lfs_env_mode _bp_lfs_missing _v _bp_lfs_dir
