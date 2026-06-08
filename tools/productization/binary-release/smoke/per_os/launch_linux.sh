#!/usr/bin/env bash
# Per-OS headless launch harness — Linux (phase plan § 6.2: smoke/per_os/).
#
# Confirms a built capture binary launches headless under the lavapipe software
# Vulkan device + the determinism pin (D14/D4) and emits a manifest. This is the
# per-OS smoke complement to the full § 3.8 bootstrap gate in pipeline.py (which
# also runs the correctness round-trip / witness + PBT). Linux is the validated
# OS this sub-phase; Windows + macOS launchers are DEFERRED-to-Phase-6 (per-OS
# software-Vulkan device + R-CPPB2 cross-build determinism — see
# docs/productization/binary-release.md § go-live).
set -euo pipefail

BIN="${1:?usage: launch_linux.sh <capture_binary> [out_manifest.json]}"
OUT="${2:-/tmp/binary-release-smoke-$(basename "$BIN").json}"

export VK_DRIVER_FILES="${VK_DRIVER_FILES:-/usr/share/vulkan/icd.d/lvp_icd.json}"
export LP_NUM_THREADS="${LP_NUM_THREADS:-0}"

# X11 is not required (compute-only Vulkan); xvfb-run is available as a fallback
# for any future ImGui/GGUI sim that needs a display (§ 6.2 X11 note).
"$BIN" "$OUT"
test -s "$OUT" || { echo "launch_linux: no manifest at $OUT" >&2; exit 1; }
echo "launch_linux: OK — $BIN emitted $OUT under lavapipe"
