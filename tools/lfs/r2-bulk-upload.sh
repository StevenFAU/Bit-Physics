#!/usr/bin/env bash
# tools/lfs/r2-bulk-upload.sh — M3 bulk upload of in-use LFS objects to Cloudflare R2.
#
# Charter: docs/phases/sub-phase-lfs-architecture.md § 6 M3
#   (as amended Stage 1c — mechanism refined from literal `git lfs push --all`
#    to `git lfs push --object-id <union-OID-list>`; see the charter AMENDMENT block).
#
# WHAT IT DOES
#   Uploads to R2, via the `lfs-s3` standalone transfer agent, exactly the set of
#   LFS objects "in use" — defined as the union of objects referenced by HEAD and
#   every v0.*-phase-* / v0.*-sub-phase-* tag enumerated dynamically from
#   `git tag -l` at run time (so a new sub-phase tag is picked up automatically;
#   the in-use ref set is never a frozen literal — see Convention §R measure-
#   don't-copy, banked observation L-R2CD-2 in the r2-credentials-durability fix).
#   This is the SAME object set the M4 sweep (.github/workflows/r2-sweep-proof.yml)
#   walks, so M3's upload surface == M4's verification surface (no asymmetry).
#
#   `git lfs push --all` is deliberately NOT used: an all-refs walk includes
#   referenced-by-nothing historical degenerates (e.g. the empty-file OID
#   e3b0c442…852b855 from commit 11d2b93's brief LFS-glob mismatch) that no
#   inspected ref references and that are absent from the local cache. Scoping to
#   the ref-union keeps M3 deterministic and aligned with M4 (charter AMENDMENT
#   Stage 1c; operator-ratified per Convention M — live ref-walk wins over the
#   planning spec's literal command).
#
# IDEMPOTENCY (§ P4)
#   LFS objects are content-addressed: the R2 key IS the sha256 OID. Re-running
#   this script re-PUTs identical bytes under the same key — inherently idempotent
#   (no "already present" query is needed; lfs-s3 exposes none). A "mismatched
#   sha256 in R2" cannot arise from correct operation and IS detected loudly: the
#   post-upload verify (below) re-fetches every object FROM R2 and asserts
#   sha256 == OID. Any mismatch or absence fails the run (exit 1) → STOP.
#
# VERIFICATION (§ P4 — every object, not a sample)
#   After upload, fetch every object back from R2 into a *temporary* LFS storage
#   dir (`-c lfs.storage=<tmp>`), leaving the canonical .git/lfs/objects untouched,
#   and assert sha256 == OID for each. The temp dir starts empty, so the bytes are
#   genuinely retrieved from R2 (not a local cache hit). ~4.852 GiB R2→local
#   download; R2 egress is free. This turns the git-lfs/lfs-s3 version-skew risk
#   banked at M2 into a loud failure if it ever corrupts a transfer.
#
# USAGE
#   Dry-run (no credentials, no transfer — prints the work-list + manifest):
#       tools/lfs/r2-bulk-upload.sh --dry-run
#   Real upload + verify (requires R2 env per tools/lfs/setup-lfs-s3.sh § contract):
#       export R2_ACCOUNT_ID=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... S3_BUCKET=...
#       tools/lfs/r2-bulk-upload.sh 2>&1 | tee /tmp/m3-upload-$(date -u +%Y%m%dT%H%M%SZ).log
#
#   Options:
#       --dry-run            Enumerate the union work-list + emit manifest; no upload.
#       --remote <name>      Git remote to push against (default: origin). With the
#                            standalone transfer agent the URL is bypassed; the name
#                            only scopes the ref-walk.
#       --manifest <path>    Write the JSON manifest here (default:
#                            /tmp/m3-bulk-upload-<UTC>.json).
#
# The JSON manifest is the structured M3 evidence: per-object {oid, path, size,
# push_status, roundtrip_sha256}. Paste it + this script's stdout verbatim into
# docs/_audits/phase-2/sub-phase-lfs-architecture/m3-bulk-upload-<UTC>.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
DRY_RUN=0
REMOTE="origin"
MANIFEST=""

# The refs whose LFS-object union defines M3's scope (== M4's sweep scope).
# Dynamic enumeration: HEAD plus every v0.*-phase-* / v0.*-sub-phase-* tag at run
# time, sorted by `sort -V`. The ref-set was a frozen literal through lfs-architecture
# Stage 1c (HEAD + v0.0.0-phase-0 + v0.1.0-phase-1 + v0.2.0-phase-2); every later
# sub-phase tag added the same staleness. The dynamic form picks up
# v0.2.1-sub-phase-lfs-architecture, v0.2.2-sub-phase-phase-3-common-3dgs, every
# v0.2.x-sub-phase-* tag, and any future v0.3.x-* / v0.4.x-* phase or sub-phase tag
# without a script edit (L-R2CD-2 closure; Convention §R measure-don't-copy).
mapfile -t TAG_REFS < <(git tag -l 'v0.*-phase-*' 'v0.*-sub-phase-*' | sort -V)
UNION_REFS=(HEAD "${TAG_REFS[@]}")
# `git -c lfs.storage=<tmp> lfs fetch` on a pre-LFS ref is a no-op (zero objects),
# so we fetch every UNION_REFS entry rather than maintaining a parallel hand-curated
# fetch list. This collapses the M3-vs-M4 surface to a single source of truth.
FETCH_REFS=("${UNION_REFS[@]}")

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --remote)  REMOTE="${2:?--remote needs a value}"; shift 2 ;;
    --manifest) MANIFEST="${2:?--manifest needs a value}"; shift 2 ;;
    -h|--help) sed -n '2,60p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "r2-bulk-upload: unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$MANIFEST" ] || MANIFEST="/tmp/m3-bulk-upload-${UTC}.json"

log() { printf '%s\n' "$*" >&2; }

# ── Build the union OID set + per-OID representative path & local size ──────────
declare -A OID_PATH OID_SIZE
while read -r oid _flag path; do
  [ -n "$oid" ] || continue
  [ -n "${OID_PATH[$oid]:-}" ] || OID_PATH[$oid]="$path"
done < <(for ref in "${UNION_REFS[@]}"; do git lfs ls-files --long "$ref" 2>/dev/null || true; done)

# Deterministic, sorted OID list.
mapfile -t OIDS < <(printf '%s\n' "${!OID_PATH[@]}" | sort)
COUNT=${#OIDS[@]}
[ "$COUNT" -gt 0 ] || { log "FATAL: union of ${UNION_REFS[*]} contains 0 LFS objects"; exit 1; }

# Preflight: every object must be present in the local LFS cache to be pushed.
MISSING_LOCAL=0
TOTAL_BYTES=0
for oid in "${OIDS[@]}"; do
  obj=".git/lfs/objects/${oid:0:2}/${oid:2:2}/${oid}"
  if [ -f "$obj" ]; then
    sz=$(stat -c%s "$obj"); OID_SIZE[$oid]=$sz; TOTAL_BYTES=$((TOTAL_BYTES + sz))
  else
    OID_SIZE[$oid]=-1; MISSING_LOCAL=$((MISSING_LOCAL + 1))
    log "PREFLIGHT FAIL: object absent from local cache: $oid (${OID_PATH[$oid]})"
  fi
done
if [ "$MISSING_LOCAL" -ne 0 ]; then
  log "FATAL: $MISSING_LOCAL object(s) missing locally — cannot bulk-upload from this clone (HARD RULE 2 STOP)"
  exit 1
fi

log "── M3 bulk upload — union(${UNION_REFS[*]}) ──"
log "objects=$COUNT  total_bytes=$TOTAL_BYTES ($(awk "BEGIN{printf \"%.3f\", $TOTAL_BYTES/1073741824}") GiB)  remote=$REMOTE  utc=$UTC"
for oid in "${OIDS[@]}"; do log "  $oid  ${OID_SIZE[$oid]}  ${OID_PATH[$oid]}"; done

# ── Manifest emitter ────────────────────────────────────────────────────────────
declare -A PUSH_STATUS RT_STATUS
emit_manifest() {
  local verdict="$1"
  local refs_json="" r
  for r in "${UNION_REFS[@]}"; do refs_json="${refs_json:+$refs_json, }\"$r\""; done
  {
    printf '{\n'
    printf '  "milestone": "M3",\n'
    printf '  "utc": "%s",\n' "$UTC"
    printf '  "remote": "%s",\n' "$REMOTE"
    printf '  "mechanism": "git lfs push --object-id --stdin (union of HEAD + phase tags)",\n'
    printf '  "union_refs": [%s],\n' "$refs_json"
    printf '  "object_count": %d,\n' "$COUNT"
    printf '  "total_bytes": %d,\n' "$TOTAL_BYTES"
    printf '  "dry_run": %s,\n' "$([ "$DRY_RUN" -eq 1 ] && echo true || echo false)"
    printf '  "objects": [\n'
    local i=0
    for oid in "${OIDS[@]}"; do
      i=$((i + 1))
      printf '    {"oid": "%s", "path": "%s", "size": %d, "push_status": "%s", "roundtrip_sha256": "%s"}' \
        "$oid" "${OID_PATH[$oid]}" "${OID_SIZE[$oid]}" "${PUSH_STATUS[$oid]:-n/a}" "${RT_STATUS[$oid]:-n/a}"
      [ "$i" -lt "$COUNT" ] && printf ',\n' || printf '\n'
    done
    printf '  ],\n'
    printf '  "verdict": "%s"\n' "$verdict"
    printf '}\n'
  } >"$MANIFEST"
  log "manifest written: $MANIFEST"
}

if [ "$DRY_RUN" -eq 1 ]; then
  for oid in "${OIDS[@]}"; do PUSH_STATUS[$oid]="dry-run"; RT_STATUS[$oid]="skipped"; done
  emit_manifest "DRY_RUN"
  cat "$MANIFEST"
  log "DRY-RUN complete: $COUNT object(s) would be pushed via --object-id. No transfer performed."
  exit 0
fi

# ── Real upload: configure the R2 transfer agent, then push the exact OID list ──
log "── configuring lfs-s3 transfer agent (tools/lfs/setup-lfs-s3.sh) ──"
# shellcheck source=tools/lfs/setup-lfs-s3.sh
source "$SCRIPT_DIR/setup-lfs-s3.sh"

log "── uploading $COUNT object(s) to R2 via: git lfs push --object-id $REMOTE --stdin ──"
if printf '%s\n' "${OIDS[@]}" | git lfs push --object-id "$REMOTE" --stdin; then
  for oid in "${OIDS[@]}"; do PUSH_STATUS[$oid]="pushed"; done
else
  rc=$?
  for oid in "${OIDS[@]}"; do PUSH_STATUS[$oid]="PUSH-ERROR"; done
  emit_manifest "HALTED-push-error"
  log "FATAL: git lfs push exited $rc (HARD RULE 2 STOP) — do NOT advance to M4"
  exit 1
fi

# ── Verify EVERY object round-trips from R2 (sha256 == OID), via temp storage ────
TMP_STORAGE="$(mktemp -d -t m3-verify.XXXXXX)"
trap 'rm -rf "$TMP_STORAGE"' EXIT
log "── verifying round-trip from R2 (temp lfs.storage=$TMP_STORAGE; canonical cache untouched) ──"
git -c lfs.storage="$TMP_STORAGE" lfs fetch "$REMOTE" "${FETCH_REFS[@]}"

FAIL=0
for oid in "${OIDS[@]}"; do
  f="$TMP_STORAGE/objects/${oid:0:2}/${oid:2:2}/${oid}"
  if [ -f "$f" ]; then
    got="$(sha256sum "$f" | awk '{print $1}')"
    if [ "$got" = "$oid" ]; then RT_STATUS[$oid]="PASS"; else RT_STATUS[$oid]="FAIL:sha=$got"; FAIL=$((FAIL + 1)); fi
  else
    RT_STATUS[$oid]="FAIL:absent-from-R2"; FAIL=$((FAIL + 1))
  fi
  log "  ${RT_STATUS[$oid]}  $oid  ${OID_PATH[$oid]}"
done

if [ "$FAIL" -ne 0 ]; then
  emit_manifest "HALTED-verify-fail"
  log "FATAL: $FAIL/$COUNT object(s) failed sha256 round-trip from R2 (HARD RULE 2 STOP) — do NOT advance to M4"
  exit 1
fi

emit_manifest "CONFIRMED"
cat "$MANIFEST"
log "── M3 CONFIRMED: $COUNT/$COUNT objects uploaded + sha256-verified round-trip from R2 ──"
