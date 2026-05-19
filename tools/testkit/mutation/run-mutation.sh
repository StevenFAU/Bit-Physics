#!/usr/bin/env bash
# Mutation-testing orchestrator (spec § 2.13).
#
# Reads `mutmut-config.toml`, runs mutmut against each target, emits a
# JSON report at `baseline-<UTC>.json` with the mutation score per target.
#
# Phase 0 produces the baseline; Phase 1+ enforces the per-target
# thresholds via the SOFT_WARN-in-CI / HARD_FAIL-at-landing posture per
# spec § 2.13.
#
# Usage:
#   bash tools/testkit/mutation/run-mutation.sh --baseline
#   bash tools/testkit/mutation/run-mutation.sh --target golden

set -euo pipefail

cd "$(dirname "$0")"/../../..  # repo root

CONFIG="tools/testkit/mutation/mutmut-config.toml"
UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="tools/testkit/mutation"
OUT_FILE="${OUT_DIR}/baseline-${UTC}.json"

if [[ "${1:-}" == "--baseline" ]]; then
  echo "Producing Phase 0 mutation-score baseline at ${OUT_FILE}"
elif [[ "${1:-}" == "--target" ]]; then
  echo "Running mutmut against target ${2}"
else
  echo "Usage: $0 --baseline | --target <name>" >&2
  exit 2
fi

# Read targets from the TOML config via Python (tomllib in stdlib).
mapfile -t TARGETS < <(uv run python - <<'PY'
import tomllib
from pathlib import Path
with open("tools/testkit/mutation/mutmut-config.toml", "rb") as fh:
    cfg = tomllib.load(fh)
for name, entry in cfg.get("targets", {}).items():
    print(f"{name}|{entry['path']}|{entry['threshold']}")
PY
)

RESULTS=()
for line in "${TARGETS[@]}"; do
  IFS='|' read -r name path threshold <<< "${line}"
  if [[ "${1:-}" == "--target" && "${name}" != "${2}" ]]; then
    continue
  fi
  echo
  echo "==== mutation: ${name} (${path}; threshold=${threshold}) ===="
  # mutmut 3.x reads its own configuration from pyproject.toml under
  # [tool.mutmut]; we invoke it per-target by passing --paths-to-mutate.
  # Capture pass/fail counts via `mutmut results --json` after run.
  killed=0
  survived=0
  if uv run --no-sync mutmut run --paths-to-mutate "${path}" 2>&1 | tee /tmp/mutmut-${name}.log; then
    killed=$(grep -oE '🎉 [0-9]+' /tmp/mutmut-${name}.log | tail -n1 | awk '{print $2}' || echo "0")
    survived=$(grep -oE '🙁 [0-9]+' /tmp/mutmut-${name}.log | tail -n1 | awk '{print $2}' || echo "0")
  fi
  total=$((killed + survived))
  if [[ "${total}" -gt 0 ]]; then
    score=$(awk -v k="${killed}" -v t="${total}" 'BEGIN{printf "%.4f", k/t}')
  else
    score="0.0000"
  fi
  RESULTS+=("    {\"target\": \"${name}\", \"path\": \"${path}\", \"threshold\": ${threshold}, \"score\": ${score}, \"killed\": ${killed}, \"survived\": ${survived}}")
done

echo "[" > "${OUT_FILE}"
printf "%s,\n" "${RESULTS[@]:0:${#RESULTS[@]}-1}" >> "${OUT_FILE}" || true
printf "%s\n"  "${RESULTS[${#RESULTS[@]}-1]}"      >> "${OUT_FILE}" || true
echo "]" >> "${OUT_FILE}"
echo
echo "Baseline written to ${OUT_FILE}"
