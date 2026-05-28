---
date: 2026-05-28T22-30-00Z
author: phase-3 ising-classical stage-1c (Claude Code)
subject: Phase 3 ising-classical — STAGE 1c verdict landing (golden re-verify + PBT + determinism + .h5 resolvable + verify_evidence + append-only + integrity; NO mutation)
verdict: CONFIRMED
head_sha: af209e54f0c7e202eea69cf3c501bdfda762ac05
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-WEBGPU-DET bit-exact-re-verified / D-WIDE-TOL off-budget / D-ANCHOR 6-anchors-assert / D-DET-REGISTRY locked / D-TOL-SCHEMA golden_tolerance-branch / D-PBT pass / D-MUT-SCOPE NO (no mutmut) / D-TAG NO
evidence_paths:
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1b-2026-05-28T22-15-00Z.md
  - captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json
  - tools/testkit/determinism/registry.toml
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/golden/tables/ising-classical-critical-temperature.json
  - tools/testkit/golden/tables/ising-classical-magnetization.json
evidence_hashes:
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1b-2026-05-28T22-15-00Z.md: sha256:a06059ea76a6ef205c7e54a557116a3240eefd187f3ecb8fc3e61c69bcf7be21
  captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json: sha256:863963efe4e2f001fe5bf4c582b9b7b0a6e5e15852276cf98ab372f9637f1e58
  tools/testkit/determinism/registry.toml: sha256:ad3113e6261f0a314e4cfa21375783f5292c0d1d063193d7bc08b0d6584df346
  tools/testkit/equivalence/tolerance.toml: sha256:fb69b46f9c49d403ddcb7d1f0058d2aa01d46b42e8cab20a8d3153a2e2fd7233
  tools/testkit/golden/tables/ising-classical-critical-temperature.json: sha256:005d8ecfc498a78252fe5771f40987ea9b898cdfa10291994a1edc16042fc313
  tools/testkit/golden/tables/ising-classical-magnetization.json: sha256:9e1d33a836c1935b708aaa42a930eef92de16b67dfa686b3d9fcdc99fb6d1077
---

# Phase 3 — sub-phase Ising-classical — Stage 1c audit (verdict landing)

> Verdict-landing pass (NO mutation gate per D-MUT-SCOPE NO). Re-verify
> golden + PBT + determinism + .h5 resolvability + verify_evidence +
> append-only + integrity. Verdict **CONFIRMED**.

## § 1 — Golden-anchor re-verification (FACT)

`pytest test_golden_anchors.py test_reference_sanity.py` → **9 passed**.
All 6 golden anchors (3 per table) assert: `critical_temperature()` =
2.269185314213022 within rel 1e-3 of Onsager / Kramers-Wannier /
Landau-Binder; `onsager_magnetization(T)` reproduces Yang / Baxter /
Newman-Barkema at all table temperatures within rel 5e-2.

## § 2 — PBT re-run (FACT)

`pytest test_pbt_invariants.py` → **2 passed**: `magnetization_bounded`
(|m| ≤ 1) + `energy_per_spin_bounded` (E/N ∈ [-2, 2]), 20 examples each
at the §2.14 budget. **STOP-PBT NOT fired.**

## § 3 — Determinism re-verify (FACT)

`pytest test_determinism.py` → **2 passed** (17.45s): `run_twice_and_diff`
content_equivalent + different-seeds-diverge. Bit-exact same-stack-same-hw
re-confirmed (Layer-1 oracle). Registry row `[lattice-spin.ising-classical]`
byte-stable.

## § 4 — Legacy-capture .h5 R2 resolvability (FACT)

Canonical + legacy `.h5` share OID `cf844e5d…9cbc` (dedup), present in
**both GitHub LFS and R2** (Stage-1b § 6). R2 resolvability is confirmed
by the **green `test-ising-classical` CI job** at `d60fe3c` — that job
runs the R2-routed selective LFS pull (`git lfs pull --include=
captures/ising-classical-ref/**` after sourcing `tools/lfs/setup-lfs-s3.sh`
when the R2 secrets are present) and then passes pytest, which requires
the capture payload to resolve. `git lfs fsck --pointers` at HEAD flags
ONLY the pre-existing 12 SIBLING-FIXTURE-LFS non-pointer fixtures (since
`v0.1.0-phase-1`); ising's `.h5` is a proper pointer (not flagged).
**STOP-LFS NOT fired.**

## § 5 — Perf-ledger byte-stable (FACT)

The Stage-1b perf row `ising-classical | numpy-reference |
metropolis-128sq-T2.27-seed42-step10000 | 5.558 | …` is present + byte-
stable at HEAD (grep count = 1).

## § 6 — NO mutation gate (D-MUT-SCOPE NO) (FACT)

Per § 6.0 item 12 (testkit-adjacent-only) + §6.3a VERIFICATION POSTURE
(GOLDEN + PBT + DETERMINISM, no mutation) + lenia precedent. **mutmut
NOT run.** D-MUT-SCOPE RESOLVED-IN-CHARTER (NO).

## § 7 — verify_evidence + append-only + integrity (FACT)

- **verify_evidence** on the three ising stage audits (`--strict`):
  Stage-0 **16/0**, Stage-1a **18/0**, Stage-1b **32/0** — ALL PASS.
  §S6 real-hash discipline confirmed (no literal placeholders; the
  L-ISING-AUDIT-HYGIENE remediation rule held for every audit this
  session authored).
- **append-only** vs `v0.2.0-phase-2` AND `v0.2.4-sub-phase-phase-3-lenia`:
  zero M/D in `docs/_audits/**` except the sanctioned in-Phase-3
  `progress.md` append (common-3dgs + lenia precedent). R-1 HELD.
- **integrity** `--all --mode strict` at HEAD `af209e5`: **0 HARD_FAIL /
  14 SOFT_WARN**; live digest `688bc195…de127ff`. STOP-D NOT fired.

## § 8 — Verdict

**CONFIRMED.** Golden 9/9, PBT 2/2, determinism 2/2 bit-exact, .h5
resolvable from R2 (green CI), perf byte-stable, NO mutation,
verify_evidence 0-fail across all ising stage audits, append-only HELD,
integrity 0 HARD_FAIL. No HARD RULE 2 STOP fired. **Stage 2 (closing
sweep + landing audit, NO TAG) is safe to dispatch.**
