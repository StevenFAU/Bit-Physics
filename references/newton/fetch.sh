#!/usr/bin/env bash
# Fetch the NVIDIA Newton 1.0 GA reference source at the §3.3-pinned SHA.
#
# WU-D vendors only LICENSE.md + MANIFEST.toml + this script (the §0.3 vendoring
# shape — see references/newton/MANIFEST.toml). The full Python source is
# fetch-on-demand here: it is a large tree, its runtime needs CUDA 12 / driver
# 545+ (absent on the CPU-only Phase-4.0 host), and it is cited for independent
# derivation (spec §2.4), not redistributed. Run this to materialise the source
# locally for inspection; do NOT commit the fetched tree.
set -euo pipefail

NEWTON_VERSION="v1.0.0"
NEWTON_SHA="d6046f187f1f6c6b8f8da98c5d0f93b8944eb5f0"
DEST="${1:-/tmp/newton-${NEWTON_VERSION}}"

git clone --depth 1 --branch "${NEWTON_VERSION}" \
  https://github.com/newton-physics/newton.git "${DEST}"
git -C "${DEST}" rev-parse HEAD | grep -q "${NEWTON_SHA}" \
  && echo "OK: ${DEST} at ${NEWTON_VERSION} (${NEWTON_SHA})" \
  || { echo "WARN: HEAD != pinned ${NEWTON_SHA}" >&2; }
