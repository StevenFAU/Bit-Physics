#!/usr/bin/env bash
# binary-release signing hook — NO-OP in Phase 5 (unsigned; § 4.3).
# Stable call site for the go-live packaging pipeline (deploy gated off this phase).
set -euo pipefail
target="${1:-<binary>}"
echo "binary-release sign.sh: Phase-5 posture is UNSIGNED — no signing performed for '${target}'."
echo "  macOS end-users: xattr -d com.apple.quarantine '${target}'  (see sign/README.md)."
exit 0
