#!/usr/bin/env bash
# D4 mutation driver @ HEAD 4ee0ea9 — testkit/integrity self-integrity scope (charter D4).
# Re-measure of the prior back-test (which found 10/11 below §2.13 threshold, cat4=0.067).
# Runs mutmut DIRECTLY per target (banked lesson: wrapper EXIT-trap race), cheap-first,
# per-target timeout RAISED to 2400s (40min, was 1500) to convert golden's lower-bound to a
# real number where feasible; per-target JSON checkpoint so a kill leaves partial results.
# Score = killed/(killed+survived) (repo convention).
set -uo pipefail
cd /home/otacon/Projects/bp-audit-2
CKPT=docs/_audits/back-test-20260530T010943Z/checkpoints/mutation
mkdir -p "$CKPT"
LOG="$CKPT/_driver.log"
PER_TARGET_TIMEOUT="${PER_TARGET_TIMEOUT:-2400}"

restore_bak() {
  while IFS= read -r -d '' bak; do mv -f "$bak" "${bak%.bak}" 2>/dev/null && echo "restored ${bak%.bak}" >>"$LOG"; done \
    < <(find tools/testkit tools/integrity packages common -name '*.bak' -print0 2>/dev/null)
}
trap restore_bak EXIT INT TERM

# cheap-first; testkit + integrity scope only (charter D4 universe) — SAME 11 as prior run for comparability
TARGETS=(sph_water_dfsph_generator incompressible_ns_2d_mms reaction_diffusion_3d_mms determinism equivalence render_similarity capture property cat4_draft_time code_verification_mms golden)

echo "=== driver start $(date -u +%FT%TZ) PER_TARGET_TIMEOUT=${PER_TARGET_TIMEOUT}s ===" >"$LOG"
for name in "${TARGETS[@]}"; do
  read -r path thr runner < <(uv run --no-sync python - "$name" <<'PY'
import tomllib,sys
cfg=tomllib.load(open("tools/testkit/mutation/mutmut-config.toml","rb"))
e=cfg["targets"][sys.argv[1]]
print(e["path"], e["threshold"], e.get("runner",""))
PY
)
  echo "" >>"$LOG"; echo "==== $name path=$path thr=$thr start=$(date -u +%T) ====" >>"$LOG"
  rm -f .mutmut-cache 2>/dev/null
  rlog="$CKPT/${name}.run.log"
  timeout "$PER_TARGET_TIMEOUT" uv run --no-sync mutmut run --paths-to-mutate "$path" --runner "$runner" >"$rlog" 2>&1
  rc=$?
  restore_bak
  fin=$(tr '\r' '\n' < "$rlog" | grep -E '🎉' | tail -1)
  killed=$(printf '%s' "$fin" | grep -oP '🎉[^0-9]*\K[0-9]+' | head -1)
  surv=$(printf '%s'   "$fin" | grep -oP '🙁[^0-9]*\K[0-9]+' | head -1)
  tmo=$(printf '%s'    "$fin" | grep -oP '⏰[^0-9]*\K[0-9]+' | head -1)
  susp=$(printf '%s'   "$fin" | grep -oP '🤔[^0-9]*\K[0-9]+' | head -1)
  killed=${killed:-0}; surv=${surv:-0}; tmo=${tmo:-0}; susp=${susp:-0}
  denom=$((killed+surv))
  if [ "$denom" -gt 0 ]; then score=$(awk "BEGIN{printf \"%.4f\", $killed/($killed+$surv)}"); else score="null"; fi
  status="completed"; [ "$rc" = "124" ] && status="BLOCKED(resource)-timeout-partial"
  [ "$denom" -eq 0 ] && status="ERROR-no-mutants-parsed(rc=$rc)"
  cat > "$CKPT/${name}.json" <<JSON
{"target":"$name","path":"$path","threshold":$thr,"killed":$killed,"survived":$surv,"timeout":$tmo,"suspicious":$susp,"score":$score,"meets_threshold":$( [ "$score" != "null" ] && awk "BEGIN{print ($score>=$thr)?\"true\":\"false\"}" || echo null ),"status":"$status","rc":$rc,"finished_utc":"$(date -u +%FT%TZ)"}
JSON
  echo "$name -> killed=$killed survived=$surv score=$score thr=$thr status=$status rc=$rc" | tee -a "$LOG"
done
echo "=== driver done $(date -u +%FT%TZ) ===" >>"$LOG"
