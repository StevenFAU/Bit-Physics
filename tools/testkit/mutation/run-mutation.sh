#!/usr/bin/env bash
# Mutation-testing orchestrator (spec § 2.13).
#
# Phase 0 LANDING posture: framework-validated baseline only. Real
# kill-rate numbers require a per-target pytest runner that respects
# the uv-workspace member-import resolution (target tests live in
# tools/testkit/<sub>/tests/ but import sibling workspace members like
# `diagnostics` from tools/diagnostics/ — pytest at the repo root can't
# discover all of them without per-member sync). Surfaced at Block 9
# LANDING; deferred to Phase 1 (see docs/_audits/phase-0/landing-*.md).
#
# Modes:
#   --baseline       Framework validation + emit baseline JSON (CI mode).
#   --target <name>  Run mutmut against a single target (manual mode).
#                    Per-target runner config lives in mutmut-config.toml.
#
# CI workflow: .github/workflows/mutation-testing.yml runs `--baseline`.

set -euo pipefail

cd "$(dirname "$0")"/../../..  # repo root

# mutmut 2.x mutates source files in-place and writes a .bak alongside.
# If interrupted (SIGINT, OOM, CI timeout) the source can stay mutated.
# This trap restores every *.bak it finds back over the live file on
# script exit, regardless of success/failure.
restore_bak_files() {
  while IFS= read -r -d '' bak; do
    src="${bak%.bak}"
    if [[ -f "${bak}" ]]; then
      mv -f "${bak}" "${src}"
      echo "restored ${src} from .bak" >&2
    fi
  done < <(find tools/testkit tools/integrity -name '*.bak' -print0 2>/dev/null)
}
trap restore_bak_files EXIT INT TERM

CONFIG="tools/testkit/mutation/mutmut-config.toml"
UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="tools/testkit/mutation"
OUT_FILE="${OUT_DIR}/baseline-${UTC}.json"

MODE="${1:-}"
if [[ "${MODE}" != "--baseline" && "${MODE}" != "--target" ]]; then
  echo "Usage: $0 --baseline | --target <name>" >&2
  exit 2
fi

# Validate the framework: mutmut present, config parses, every target
# path and runner-test-file exists. Any failure here is a real defect.
echo "Validating mutation-testing framework setup..."
if ! uv run --no-sync mutmut version >/dev/null 2>&1; then
  echo "FAIL: mutmut not installed in the workspace venv." >&2
  exit 1
fi
MUTMUT_VERSION="$(uv run --no-sync mutmut version 2>&1 | tail -n1)"
echo "  mutmut: ${MUTMUT_VERSION}"

mapfile -t TARGETS < <(uv run python - <<'PY'
import tomllib
with open("tools/testkit/mutation/mutmut-config.toml", "rb") as fh:
    cfg = tomllib.load(fh)
for name, entry in cfg.get("targets", {}).items():
    runner = entry.get("runner", "")
    exclude = entry.get("exclude", "")
    print(f"{name}|{entry['path']}|{entry['threshold']}|{runner}|{exclude}")
PY
)

for line in "${TARGETS[@]}"; do
  IFS='|' read -r name path threshold runner exclude <<< "${line}"
  # Use ``-e`` (existence) rather than ``-d`` (directory-only) so the
  # validator accepts both file and directory ``path`` shapes. mutmut's
  # ``--paths-to-mutate`` accepts either; the wrapper's pre-check should
  # match. Surfaced when sub-phase-particle-fluids-sph-water Stage 2
  # added the first file-shaped target (sph_water_dfsph_generator,
  # commit dae7040). See sub-phase-mutation-script-hotfix audit.
  if [[ ! -e "${path}" ]]; then
    echo "FAIL: target ${name} path missing: ${path}" >&2
    exit 1
  fi
done
echo "  ${#TARGETS[@]} target paths validated"

if [[ "${MODE}" == "--target" ]]; then
  want="${2:-}"
  if [[ -z "${want}" ]]; then
    echo "Usage: $0 --target <name>" >&2
    exit 2
  fi
  for line in "${TARGETS[@]}"; do
    IFS='|' read -r name path threshold runner exclude <<< "${line}"
    if [[ "${name}" != "${want}" ]]; then
      continue
    fi
    echo
    echo "==== mutation: ${name} (${path}; threshold=${threshold}; exclude='${exclude}') ===="
    RUNNER_ARGS=()
    if [[ -n "${runner}" ]]; then
      RUNNER_ARGS=(--runner "${runner}")
    fi
    # Phase-4 A3: optional `exclude` (mutmut --paths-to-exclude, fnmatch on
    # basename) keeps a target SOURCE-ONLY by dropping nested tests/ subtrees
    # the default tests-dir guess misses.
    EXCLUDE_ARGS=()
    if [[ -n "${exclude}" ]]; then
      EXCLUDE_ARGS=(--paths-to-exclude "${exclude}")
    fi
    uv run --no-sync mutmut run --paths-to-mutate "${path}" "${EXCLUDE_ARGS[@]}" "${RUNNER_ARGS[@]}" \
      2>&1 | tee "/tmp/mutmut-${name}.log"
    exit 0
  done
  echo "FAIL: target ${want} not in config" >&2
  exit 1
fi

# --baseline: emit framework-validated JSON, no real mutation runs.
echo
echo "Producing framework-validated baseline at ${OUT_FILE}"

ENTRIES=""
for line in "${TARGETS[@]}"; do
  IFS='|' read -r name path threshold runner exclude <<< "${line}"
  if [[ -n "${ENTRIES}" ]]; then ENTRIES="${ENTRIES},"$'\n'; fi
  ENTRIES="${ENTRIES}    {\"target\": \"${name}\", \"path\": \"${path}\", \"threshold\": ${threshold}, \"score\": 0.0, \"killed\": 0, \"survived\": 0, \"status\": \"framework-validated-baseline-deferred-to-phase-1\"}"
done

cat > "${OUT_FILE}" <<JSON
{
  "schema_version": "1.1.0",
  "produced_utc": "${UTC}",
  "status": "framework-validated",
  "mutmut_version": "${MUTMUT_VERSION}",
  "rationale": "Phase 0 LANDING (Block 9) validated the mutation-testing framework end-to-end: mutmut installed, mutmut-config.toml parses, every target path exists, the .bak-restore trap is in place. Real per-target kill-rate baseline production is deferred to Phase 1 Stage 1 — Block 5's per-target pytest runners need rewriting to respect uv-workspace member-import resolution (target tests at the repo root cannot discover sibling workspace members without per-member sync). The framework-validation contract is the load-bearing CI invariant for Phase 0 close; real numbers are the Phase 1 first-stage gate.",
  "targets": [
${ENTRIES}
  ]
}
JSON
echo "Baseline written to ${OUT_FILE}"
