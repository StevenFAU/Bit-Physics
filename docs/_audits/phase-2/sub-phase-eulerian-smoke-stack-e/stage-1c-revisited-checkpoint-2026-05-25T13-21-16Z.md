---
date: 2026-05-25T13-21-16Z
author: eulerian-smoke-stack-e-stage-1c-revisited-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1c-revisited
subject: "Stage-1c-revisited checkpoint. VERDICT: CONFIRMED. Coordinator-routed re-spec stage: amended charter sections 1/3/5 from the falsified chaotic-regime/R-P2 prediction to the empirical cross-stack BIT-EXACT verdict, and landed the charter section 2/section 4 Stage-1c sim-spec deliverables under the corrected shape (equivalence.md section E bit-exactness witness; gate-14 tests un-skipped + bit-exactness assertions; 2D schema-corpus subset fixture; D6 reuse verify-only). gate-14 GREEN (within_tolerance=True, max_abs_err=0.0, BOTH descriptors); full stack-e suite 17 passed; corpus round-trip 15 passed. O-2 checkpoint 4 lands under the BIT-EXACT shape; determinism chain complete. 1 shift (S1c-r-SME1 charter-amendment-landing precedent); cumulative 207 -> 208."
verdict-state: CONFIRMED
head_sha: 9ba8cb386fed142d3ca2d76fb680039500736ef3
head_sha_at_checkpoint: 4dc1fd00574b376800e25ade983c8634a3af4ae4
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-checkpoint-2026-05-25T13-21-16Z.md
evidence_paths:
  - docs/phases/sub-phase-eulerian-smoke-stack-e.md
  - docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md
  - packages/eulerian-smoke-stack-e/tests/test_cross_stack_equivalence.py
  - tests/fixtures/legacy-captures/phase-2-eulerian-smoke-stack-e.json
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-evidence/gate-14-dual-verdict-2026-05-25T13-21-16Z.txt
---

# Stage-1c-revisited Checkpoint — Sub-Phase Eulerian-Smoke-Stack-E

> **VERDICT: CONFIRMED.** Coordinator-routed re-spec stage after the Stage-1c
> Hard Rule 2 empirical falsification. The charter prediction is amended to match
> reality, and the charter § 2/§ 4 Stage-1c sim-spec deliverables are landed under
> the corrected **cross-stack BIT-EXACT** verdict shape.

## § 1. Why this stage exists (mid-sub-phase charter amendment)

Stage 1c (STOP-evidence: `stage-1c-checkpoint-2026-05-25T13-21-16Z.md`,
`stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md`) executed formal gate-14 and hit
Hard Rule 2: `within_tolerance=True` (cross-stack BIT-EXACT), falsifying the
plan-drafting chaotic-regime / R-P2 prediction. Charters are normally ratified at
plan-drafting and held; this stage amends mid-sub-phase because empirical reality
overturned a load-bearing charter prediction — coordinator routed "amend the spec
to match reality rather than execute against a known-wrong spec." Banked as
**S1c-r-SME1** (charter-amendment-landing precedent for empirical-falsification
events).

## § 2. Charter amendments (§§ 1, 3, 5 + AMENDED banner) — Deliverable (A)

`SHIFTED` (FACT/INFERENCE/SHIFTED-tagged inline; empirical citations to the Stage-1c
evidence audit):

- **§ 1 defining-regime:** chaotic-regime R-P2 divergence-rate witness → **cross-stack
  BIT-EXACT witness**. The 3D ~5e19 blow-up is empirically confirmed (stays); the
  committed 2D reference is laminar-bounded (`max|u| ≈ 2.08`, NOT the predicted
  `1.64e3 @ step 5`) — descriptive acknowledgment only; Phase-1 provenance NOT
  adjudicated (D17 banked).
- **§ 3 gate-14 row + header:** predicted `within_tolerance=False` (R-P2) →
  empirically FALSIFIED; the gate-14 test asserts `within_tolerance=True` AND
  bit-exactness (`max_abs_err == 0.0`) AND tolerance resolves `smoke`/`1e-4` (D6).
- **§ 5 R-SME1 + closing:** `within_tolerance=True`/bit-exact is the EXPECTED Stack-E
  verdict, NOT a STOP; STOP only on a step-1 port-faithfulness failure (inert —
  step-1 is bit-exact per S1b-SME2).
- The R-P2 references remaining in §§ 6–7 are SUPERSEDED; reconcile at Stage 2
  (methodology § 6 R-P2 re-characterization + D5 substance) — out of scope this stage.

## § 3. Sim-spec deliverables (charter § 2/§ 4 Stage-1c) — Deliverable (B)

| Deliverable | Status | Evidence |
|---|---|---|
| `equivalence.md` additive Stack-E section (§ E bit-exactness witness) | LANDED | descriptive prose; gate-14 verdict + bit-exact-through-blow-up (E.3) + distinct-provenance (E.4) + S1b-SME2 consistency (E.5); Stack-D §§ 1–7 unchanged; scope-table row added |
| gate-14 tests un-skipped (2D + 3D) | LANDED | assertions: `within_tolerance=True` + worst `max_abs_err == 0.0` + resolved `smoke`/`1e-4`; 3D skip-guarded on held-local capture (D14; `_both_present` MPM-Stack-E precedent) |
| 2D schema-corpus representative-subset fixture | LANDED | `tests/fixtures/legacy-captures/phase-2-eulerian-smoke-stack-e.{h5,json}`; byte-identical copy preserving LFS-oid `aa67929f…`; payload.path rewired |
| tolerance-override REUSE verify-only (D6) | VERIFIED (no edit) | the gate-14 assertion confirms `[overrides.eulerian-smoke]` resolves `smoke`/`1e-4` post-amendment; no `tolerance.toml` edit |

`FACT` test results: full stack-e suite **17 passed** (was 15 passed + 2 skipped at
Stage 1b — the 2 gate-14 tests now RUN + PASS bit-exact); legacy-captures corpus
**15 passed** (new `phase-2-eulerian-smoke-stack-e` entry round-trips + schema-validates,
all existing entries unaffected). Operational note: ruff re-sorted the test imports
(first-party `eulerian_smoke_stack_e`; the S1a-SME2-predicted churn that did not
materialise at Stage 1b materialised here — not a shift).

## § 4. § L.7 O-2 four-checkpoint chain — COMPLETE

- ✓ ckpt 1 (Stage 0): R-A1 `79d15705…`
- ✓ ckpt 2 (Stage 1b): gate-10 `assert_deterministic_run`
- ✓ ckpt 3 (Stage 1b): 2D canonical 2-run, worst_abs_diff 0.0
- ✓ ckpt 4 (Stage 1c → 1c-revisited): formal gate-14 LANDED under the **cross-stack
  BIT-EXACT** shape (`within_tolerance=True`, `max_abs_err=0.0`, BOTH descriptors).
  The determinism chain (within-stack + cross-stack both bit-exact) was always
  intact; this stage corrected only the verdict-shape prediction. **Chain complete.**

## § 5. Banked shift + D-class updates

- **S1c-r-SME1** (NEW shift) — charter-amendment-landing precedent: a load-bearing
  charter prediction (§ 1/§ 3/§ 5 verdict shape) was amended mid-sub-phase, in place,
  with FACT/INFERENCE/SHIFTED tagging + empirical citation + an AMENDED banner, after
  an empirical-falsification STOP. Cumulative **207 → 208**.
- **D5 substance UPDATED** (recorded; Stage 2 acts): IC-15 stays PARTIAL; R-P2
  stack-portability **OVERTURNED** (S1c-SME2); cross-stack BIT-EXACT through the
  chaotic horizon is the empirical Stack-E result.
- **D17 ADDED** (recorded; banked): the committed 2D-reference laminar-bounded
  anomaly → candidate Phase-1-canonical re-characterization sub-phase trigger (a
  banked observation from smoke-Stack-D acquires its empirical second instance here).
- Prior carries unchanged (S1a-SME1 charter § 6 stale; S1a-SME2; S1b-SME1 O-W7;
  S1b-SME2 step-1 bit-exact; S1b-SME3 uv-sync prune; S1c-SME1; S1c-SME2).

## § 6. Entering-state anchors (verified GREEN; FACT)

HEAD `f81de327` at entry; conventions `1937a7cf…` / methodology `a154d10c…` /
architecture `e82b7b8e…` match; 2D `.h5` `aa67929f…` (= LFS oid) + 3D `.h5`
`6b5158e8…` STOP-anchors HOLD; charter unchanged by Stage-1c audits; D6
LEFT/RIGHT manifests agree on `sim.{name,category,variant}` (verified post-amendment
via the passing gate-14 assertion).

## § 7. Boundaries honored (dispatch BOUNDARIES)

NOT touched: methodology (R-P2 re-characterization — Stage 2); conventions (§ L.7 O-1
taxonomy / § L.4 R-SME9 / § L.6 O-W7 — Stage 2); warp.md (Stage 2); Phase-1 source /
common-warp / Stack-E implementation (locked from Stage 1b); CHANGELOG (Stage 2);
`tolerance.toml` (D6 no-op); the Phase-1-canonical 2D-reference investigation (D17
banks the trigger; not adjudicated). NO push, NO tag (D12). Local-only (D13). The
§ 3 / § 5 / § 1 charter edits ARE this stage's coordinator-routed work (not a
boundary breach).

## § 8. Consolidated Stage 2 carry-forward stack

- **methodology § 6** — R-P2 re-characterization: NOT stack-portable Taichi → Warp
  (S1c-SME2); the cross-stack-BIT-EXACT result is a new data point (the inverse of
  the Stack-D chaotic-regime instance).
- **conventions § L.7 O-1** — verdict-taxonomy refinement (S1c-SME1: "BIT-EXACT
  through a chaotic horizon" = candidate 4th shape, or a shape-(a) refinement
  dropping the algebraically-tame qualifier).
- **conventions § L.6** — O-W7 narrowing (S1b-SME1, fresh-var float index).
- **conventions § L.4** — R-SME9 resolution-dependence refinement (D16).
- **charter §§ 6–7** — reconcile the residual R-P2 references (S1a-SME1 also flags
  § 6 lines stale) with the amended §§ 1/3/5.
- **D5 substance update** (this checkpoint § 5) → methodology + equivalence cross-refs.
- **D17** — Phase-1-canonical 2D-reference re-characterization sub-phase trigger.
- **warp.md § 6** line-207 smoke-consumption refinement (D15).
- **CHANGELOG** entry; portfolio regression sweep (22 members); integrity sweep
  (informational, `c19492ad…` baseline); N1 per-package pytest-config certification.

## § 9. Verdict

**stage-1c-revisited-CONFIRMED.** Charter §§ 1/3/5 amended to the empirical
cross-stack BIT-EXACT verdict shape (S1c-r-SME1); the charter § 2/§ 4 Stage-1c
sim-spec deliverables landed under the corrected shape (equivalence.md § E; gate-14
un-skip + bit-exactness assertions; 2D schema-corpus fixture; D6 reuse verify-only).
gate-14 GREEN (`within_tolerance=True`, `max_abs_err=0.0`, BOTH descriptors); full
stack-e suite 17 passed; corpus 15 passed. O-2 checkpoint 4 lands; the
four-checkpoint determinism chain is complete. 1 shift (S1c-r-SME1); cumulative
**207 → 208**. No `-phase-N` tag (D12). Local-only (D13). Coordinator routes Stage 2
(landing) separately. head_sha placeholder-deferred (back-filled in the SHA back-fill
commit).
