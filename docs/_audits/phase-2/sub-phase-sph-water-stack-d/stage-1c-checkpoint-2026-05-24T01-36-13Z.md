---
date: 2026-05-24T01-36-13Z
author: sph-water-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sph-water-stack-d-stage-1c
subject: "Stage 1c (cross-stack equivalence + gate-14) CLOSE for the sph-water -> Stack-D port. VERDICT CONFIRMED. GATE 14 GREEN; all gates 1-14 GREEN at sub-phase close. compare_captures(NumPy-ref, Stack-D) within_tolerance=True at resolved {category:sph, relative:1e-4, absolute:0.0} via the new [overrides.sph-water]. Per-field step-horizon (11 frames): position+velocity bit-identical (0.0); density max_abs 2.557954e-13 / max_rel 1.585292e-15 (~11 orders below 1e-4); no amplification. equivalence.md EXTENDED additively (Phase-1 stub; +7 IC-15 sections + S6 calibration; sha fb85655b). tolerance.toml [overrides.sph-water] category=sph at-budget (sha ebf383a1; FIRST tolerance.toml SHIFT post-audit-chain-correctness; SECOND per-sim override). Schema-corpus phase-2-sph-water-stack-d.{h5,json} (.h5 8435f166 content unchanged; .json d982b5d9; corpus round-trip GREEN; first >3MB non-LFS legacy entry @61MB < 2GB ceiling). test_cross_stack_equivalence.py skip removed -> suite 15/15 GREEN. S6 calibration banked for D5 Stage-2: two-pair validation at algebraically-identical-trajectory regime -> option (c) partial formalization well-supported. 0 new shifts; cumulative 130. feat 497bd4e."
verdict-state: CONFIRMED
head_sha: bfb33123399c30b6967dc2af79f7dba819a02824
head_sha_at_checkpoint: bfb33123399c30b6967dc2af79f7dba819a02824
parent_audits:
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1b-checkpoint-2026-05-24T01-16-13Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1c-evidence/gate14-compare-captures-2026-05-24T01-36-13Z.txt
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1c-evidence/cross-stack-test-green-2026-05-24T01-36-13Z.txt
  - docs/sim-specs/particle-fluids/sph-water/equivalence.md
  - tools/testkit/equivalence/tolerance.toml
  - tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.json
  - tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.h5
  - packages/sph-water-stack-d/tests/test_cross_stack_equivalence.py
evidence_hashes:
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1c-evidence/gate14-compare-captures-2026-05-24T01-36-13Z.txt: sha256:9eb67d0a951fe5cd524660f2cedd356ac5c87bbb35c1f6afdf41cfaf1a1b09f7
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1c-evidence/cross-stack-test-green-2026-05-24T01-36-13Z.txt: sha256:42551e8afee3d2af807e31546542e1b8a68ab2945ea0ccd5d9ff0627b07ec939
  docs/sim-specs/particle-fluids/sph-water/equivalence.md: sha256:fb85655bfdaeaeda446e6daeee8f0877519b1a098110ff931fd05f74e7bd832e
  tools/testkit/equivalence/tolerance.toml: sha256:ebf383a1e0548bf5e2bcc46deecd415358dd12bb1113a9004232c43b10495b46
  tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.json: sha256:d982b5d9e5c0e5035886ffb0f92b0e66b88134915dc12f81192c5f47190811ff
  tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.h5: sha256:8435f16677a496d0191ac001e7fafb3c650d4430d9d1203a6a9a1eda54c1678b
  packages/sph-water-stack-d/tests/test_cross_stack_equivalence.py: sha256:843195eab268285f3645a5de13c44379a289b57725d91a727170d3621b0e0ed6
---

# Stage 1c Checkpoint — Sub-Phase sph-water → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8);
> commit-first-then-sha256 for text artifacts. FACT / INFERENCE / SHIFTED tagging.

## § 1. Scope summary

Stage 1c is the **gate-14 cross-stack equivalence + IC-15 methodology-pattern +
S6-calibration-banking** stage. Diffs the Stack-D Taichi capture against the
Phase-1 NumPy-reference capture, lands the MANDATORY `[overrides.sph-water]` (D6),
extends `equivalence.md`, seeds the schema-corpus, and un-skips the gate-14 test.
**Gate 14 GREEN; all gates 1-14 GREEN at sub-phase close.**

## § 2. 14-row gate-status table (all GREEN)

| # | Gate | Status |
|---|---|---|
| 1 | Spec sheet | GREEN (Stage 1b) |
| 2 | Probe report | GREEN (Stage 1b) |
| 3 | Failing-tests anchor | GREEN (Stage 1a `3a6eb82`) |
| 4 | Code verification (golden 4a+4b) | GREEN (err 0.0) |
| 5 | Tier-1 diagnostics | GREEN |
| 6 | Tier-2 particle (IC-5) | GREEN |
| 7 | Cat-1 citations | GREEN |
| 8 | Cat-2 public API | GREEN |
| 9 | Canonical capture | GREEN |
| 10 | Determinism (IC-14) | GREEN |
| 11 | PBT (2 invariants) | GREEN |
| 12 | Perf-ledger row | GREEN |
| 13 | Failing-tests replay | GREEN |
| **14** | **Cross-stack equivalence** | **GREEN** (within_tolerance=True; § 4) |

Stack-D test suite at Stage 1c close: **15 passed, 0 skipped**.

## § 3. Per-step results (charter § 4.2.3)

| Step | Outcome |
|---|---|
| 1 `[overrides.sph-water]` | added (`category="sph"`, at-budget); tolerance.toml sha `ebf383a1…` |
| 2 extend `equivalence.md` | additive (Convention A; +7 IC-15 sections + S6); sha `fb85655b…` |
| 3 run gate-14 diff | `within_tolerance=True`; witness captured (§ 4) |
| 4 gate-14 disposition | GREEN (no operator routing needed) |
| 5 schema-corpus | `phase-2-sph-water-stack-d.{h5,json}`; corpus round-trip GREEN |
| 6 un-skip test | `pytest.mark.skip` removed; test GREEN; suite 15/15 |
| 7 commit | `feat(sph-water-stack-d-stage1c)` `497bd4e` |

(Dispatch's 8-step numbering [Step 5 widening NO-OP] maps to the charter's 7-step
§ 4.2.3; same set. Step 5 widening was a NO-OP — at-budget, no widening needed.)

## § 4. Cross-stack equivalence witness

(FACT — `stage-1c-evidence/gate14-compare-captures-2026-05-24T01-36-13Z.txt`.)

- **within_tolerance: True.**
- **Resolved tolerance:** `{category: sph, relative: 1e-4, absolute: 0.0}` (via
  `[overrides.sph-water]` → `[defaults.sph]`).
- **Per-field step-horizon roll-up** (max over all 11 frames; steps 0,100,…,1000):

  | Field | max_abs_err | max_rel_err | vs target (rel ≤ 1e-4) |
  |---|---|---|---|
  | position | `0.0` | `0.0` | bit-identical |
  | velocity | `0.0` | `0.0` | bit-identical |
  | density | `2.557954e-13` | `1.585292e-15` | **~11 orders of margin** |

- **Step-horizon analysis:** NO step approaches `1e-4`. Density `max_rel_err` is
  flat across the horizon (step 0 `1.59e-15`; steps 100–1000 in `[1.31e-15,
  1.44e-15]`) — FP-accumulation-order noise, NOT amplification (rigid free-fall →
  static density per S6). Position + velocity `0.0` at **every** frame (identical
  NumPy `default_rng(42)` IC + FP-order-independent explicit-Euler update).

## § 5. equivalence.md content summary

Phase-1 stub (439 B) EXTENDED additively (Convention A per plan-drafting S3):
preserved the tolerance-row + cross-stack-scope tables; updated the stale "Stack D
↔ Stack C / Not planned" framing to the actual NumPy-reference ↔ Taichi-CPU pair;
added 7 IC-15 methodology sections (the cross-stack pair; harness invocation;
two-taxonomy tolerance resolution; step-horizon discipline; per-field witness;
R-S1/R-S2/R-P2 disposition under S6; methodology precedent for subsequent pairs).
sha256 `fb85655bfdaeaeda446e6daeee8f0877519b1a098110ff931fd05f74e7bd832e`.

## § 6. [overrides.sph-water] tolerance.toml addition

`[overrides.sph-water] category = "sph"` appended after `[overrides.reaction-diffusion-2d]`
(Convention A; comments preserved). At-budget per `[budgets.sph.cross_stack]=1e-4`
(verified UNCHANGED at HEAD; NOT a widening — resolution wiring only). The **FIRST
tolerance.toml content SHIFT since audit-chain-correctness**, and the **SECOND
per-sim override** in the portfolio (after RD-2D Stack-D). New tolerance.toml
sha256 `ebf383a1e0548bf5e2bcc46deecd415358dd12bb1113a9004232c43b10495b46`.

## § 7. Schema-corpus entry

`tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.{h5,json}`:
- `.h5` (full real capture; content sha256 `8435f166…1678b` UNCHANGED from the
  canonical capture). **NOT LFS** (legacy-captures is outside the `captures/**/*.h5`
  LFS rule) — **first >3 MB non-LFS legacy corpus entry (61 MB)**, under the 2 GB
  large-files hook ceiling. (Observation for operator awareness; future large
  captures may warrant an LFS rule for `tests/fixtures/legacy-captures/`.)
- `.json` (`payload.path` rewritten to the legacy basename `phase-2-sph-water-stack-d.h5`;
  `payload.checksum` unchanged); sha256 `d982b5d9e5c0e5035886ffb0f92b0e66b88134915dc12f81192c5f47190811ff`.
- The corpus round-trip + manifest-schema tests PASS for the new `phase-*` entry
  (it is globbed + its payload is read end-to-end, so a placeholder would NOT
  suffice — contrast the non-`phase-*` Phase-1 `sph-water-ref.h5` placeholder).

## § 8. test_cross_stack_equivalence.py SKIP-removal

`@pytest.mark.skip` (+ the now-unused `import pytest`) removed; the test invokes
`compare_captures(ref, stack_d)` and asserts `within_tolerance`. GREEN. Suite
**15 passed, 0 skipped**. Post-edit sha256
`843195eab268285f3645a5de13c44379a289b57725d91a727170d3621b0e0ed6`.

## § 9. Sub-phase coherence outputs

- **Cross-stack equivalence empirically verified at full step-1000 horizon:**
  within_tolerance=True at `1e-4`; ~11 orders of margin (density); position +
  velocity bit-identical.
- **S6 methodology-precedent calibration (R-S6):** the IC-15 candidate methodology
  validates across TWO physics families (continuous-ca via RD-2D Stack-D +
  particle-fluids via sph-water Stack-D), **but both at the
  algebraically-identical-trajectory regime** where the cross-stack diff stays at
  FP-round-off scale. It has **NOT** been stress-tested at iterative-solver /
  atomic-scatter / chaotic-amplification / lattice-velocity-quantization regimes.
- **D5 Stage-2 routing implication:** **option (c) partial formalization** is the
  well-supported disposition — codify what's validated across two pairs
  (position-exact comparison + category-default tolerance + per-frame diff witness
  + per-sim `tolerance.toml` override); defer the un-stress-tested aspects (R-P2
  chaotic-regime escape-hatch details, D8 comparison-projection axis, atomic-scatter
  handling). Option (a) full formalization is less well-supported. Operator routes
  at Stage 2 close.
- **D8:** comparison-projection axis NOT needed for this pair (position-exact at
  1e-4 passes with ~11 orders margin); a third pair at a non-trivial regime may
  surface it.
- **Banked methodology-precedent (S6):** plan-drafting probes for cross-stack ports
  MUST read the Phase-1 `sim.py` implementation, not just spec sheets.
- **Cumulative banked precedents propagating to subsequent sub-phases:**
  commit-first-then-sha256; SHA back-fill enumerates every placeholder-bearing
  audit (N1); Stage-0 R-A1/R-S5 end-to-end harness invocation pre-Stage-1c; read
  Phase-1 `sim.py` at probe (S6); large non-LFS legacy corpus entries (§ 7).

## § 10. New Stage 1c SHIFTs

**0 new shifts.** Gate-14 GREEN as the Stage-1b informational preview indicated;
S6 was already counted at Stage 1b. The 61 MB non-LFS schema-corpus entry (§ 7) is
recorded as an **observation** (first large non-LFS legacy entry), not a plan
deviation. Cumulative shift count holds at **130**.

## § 11. Stage 2 dispatch readiness

READY. Stage 2 (landing) inherits:
- All gates 1-14 GREEN; the Stack-D port complete.
- **D5 IC-15 formalization disposition:** option (c) partial formalization
  well-supported (§ 9); operator routes at Stage 2 close.
- Stage 2 owns: CHANGELOG additive; `docs/dependencies.md` additive (new workspace
  member + Taichi-DSL consumption); integrity sweep; portfolio-scale regression
  sweep (§ B.7); gate-13 worktree replay; IC-16 evidence-path verification;
  append-only check; mutation artifact (PATH-B lean); landing audit + SHA back-fill.
- Observation to weigh at landing: the 61 MB non-LFS `tests/fixtures/legacy-captures/`
  entry (§ 7) — operator may consider an LFS rule for that directory.
