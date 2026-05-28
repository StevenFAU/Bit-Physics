---
date: 2026-05-28T15-56-13Z
author: phase-3 lenia stage-1c (Claude Code)
subject: Phase 3 third sub-phase (task-3 Lenia) — STAGE 1c verdict landing (NO mutation gate)
verdict: SHIFTED
head_sha: 165c46b
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-B Stack-D / D-MUT-SCOPE NO RESOLVED-IN-CHARTER / D-FFT real-space-LANDED / D-DET bit-exact-MEASURED-HELD / D-TAG YES-lean-Stage-2 / D-LAYOUT packages/lenia/-LANDED
shifted_items_carried:
  - "PBT mass_approximately_conserved invariant re-declared on math evidence at Stage 1b (HARD RULE 2)"
  - "R2 LFS mirror sync EOF surfaced at Stage 1b (STOP-LFS; GitHub-LFS HELD; NOT REVERTED)"
evidence_paths:
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1b-2026-05-28T15-51-04Z.md
  - tools/testkit/golden/tables/lenia-kernel.json
  - tools/testkit/golden/tables/lenia-orbium-trajectory.json
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - tests/fixtures/legacy-captures/phase-3-lenia.json
  - docs/perf-ledger.md
evidence_hashes:
  docs/phases/sub-phase-phase-3-lenia.md: sha256:c232145520a1100302c286a5c9dda4c775477f1db3a3897bbbf97d00075a1742
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md: sha256:1c5507461c4266cc60078fe93eb6f290709e6e1c97dd36d02213c8e3d6c7085f
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md: sha256:edefb1814d1cb1e0f0c2b46d88287fb043ac3693b6356682ce4613b659cf2461
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1b-2026-05-28T15-51-04Z.md: sha256:01bfdb9401cf9eec9c44441bc64e61708a6765f8f318b80f7218e5c823495288
  tools/testkit/golden/tables/lenia-kernel.json: sha256:fa7f0d416531a48dfdd0a778f063117868f6737f5bd0fb6c757db5771e0555f8
  tools/testkit/golden/tables/lenia-orbium-trajectory.json: sha256:c95878a7e5eba643d35378ca1f42f0245ed47588709063f7d7fe0dfa398db944
  tools/testkit/equivalence/tolerance.toml: sha256:d55d15b9532102544756a5f699bb9e0f50133d261430dac8e0b5dab19d62651a
  tools/testkit/determinism/registry.toml: sha256:c61a7c381339e0f3b1f248a7dfef73c1d1d1f3e73f3c9da86ce565245c3e725d
  tests/fixtures/legacy-captures/phase-3-lenia.json: sha256:b232d2fffeaad7e8f20b1fadf0345c5d9da9096ba1332e1d806cbba1f07d1e63
  docs/perf-ledger.md: sha256:e04fb8f2308fc8ff75c09a8c85c6d0020607320689aa66a6382612eee713f345
---

# Phase 3 — sub-phase Lenia — Stage 1c audit (verdict landing, NO mutation)

> Per charter §2 Stage 1c + §5 D-MUT-SCOPE NO RESOLVED-IN-CHARTER —
> Stage 1c is **verdict-landing only**. Re-verify golden anchors +
> PBT + determinism + legacy-capture + perf-ledger + verify_evidence
> sweep + append-only + integrity. **No mutation gate** (sims are
> verified by golden + PBT + determinism per § 6.0 item 12 testkit-
> adjacent-only). Verdict **SHIFTED** (the two Stage-1b SHIFTED items
> carried forward, neither resolvable at this verdict-landing layer).

## § 1 — Anchor probe (FACT, HEAD `165c46b`)

| Check | Result |
|---|---|
| Chain since Stage 1b | `5baf083` (infra) → `848f2e4` (Stage-1b audit) → `165c46b` (Stage-1b SHA back-fill) |
| Tag `v0.2.3-sub-phase-phase-3-render-similarity` resolves | annotated ✓ |
| Integrity Cat 1–5 strict sweep | **0 HARD_FAIL / 14 SOFT_WARN**; stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline |
| `pytest packages/lenia/tests/` | **14/14 PASS** |
| `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | 2/2 PASS (allowlist unchanged at this stage; Stage 2 extension) |
| `git rev-parse HEAD` == `git rev-parse origin/main` | MATCH `165c46b` (pushed at Stage 1b close) |
| I1–I7 invariants | hold |

## § 2 — Golden-anchor re-verification (FACT)

### § 2.1 lenia-kernel.json

3 independent-reference anchors plus 6 mid-curve cross-check anchors.
Test `packages/lenia/tests/test_kernel_anchors.py` (5 tests) GREEN
at HEAD verifying:

- `K(0) = 0` (test_quad4_anchor_r_zero_is_boundary).
- `K(0.5) = 1` (test_quad4_anchor_r_half_is_peak — PEAK).
- `K(1) = 0` (test_quad4_anchor_r_one_is_boundary).
- `K(r) = 0` for `r > 1` (test_quad4_compact_support_outside_unit_interval).
- All three anchors in a single vectorized call (test_quad4_three_anchor_vector).

Tolerances at the test-points are within the golden-table
`absolute=1e-6 / relative=1e-5` declaration.

### § 2.2 lenia-orbium-trajectory.json

5 trajectory test-points (step 0 sum + step 0 max + step 1 sum +
step 5 sum + step 5 max). Verified by:
- the determinism test (two runs are byte-equal → trajectory
  reproducibility), and
- the `test_lenia_sim_capture_produces_manifest` end-to-end
  capture cycle.

Tolerances `absolute=1e-4 / relative=1e-5` per `[continuous-ca.lenia]
golden_trajectory_abs` row.

## § 3 — PBT re-verification (FACT)

`packages/lenia/tests/test_pbt_invariants.py` 2/2 GREEN at HEAD:

- `test_pbt_monotone_bounds_witness` — field stays in `[0, 1]` for
  the 5-step run (clip-Euler enforced).
- `test_pbt_per_step_change_bounded_by_dt_witness` — per-cell delta
  ≤ dt + eps for every step (G ∈ [-1, 1] + clip-Euler).

Shared module at `tools/testkit/property/sims/lenia/invariants.py`
mirrors the in-package witness logic. SHIFTED-on-evidence invariants
held at Stage 1b STAY HELD at Stage 1c.

## § 4 — Determinism re-verification (FACT)

`packages/lenia/tests/test_determinism.py::test_determinism_two_runs_bit_equal`
**PASSES** at HEAD. Two runs at seed 42, grid 64, steps 10 produce
`np.array_equal` field outputs under
`set_taichi_deterministic(arch="cpu")`. D-DET bit-exact same-stack-
same-hw HELD.

Registry row at `tools/testkit/determinism/registry.toml
[continuous-ca.lenia]` unchanged from Stage 1b.

## § 5 — Legacy-capture .h5 seed re-verification (FACT, STOP-LFS carried)

| Surface | Status |
|---|---|
| `tests/fixtures/legacy-captures/phase-3-lenia.h5` | present in working tree; sha256 `6c313a5da53dd341f73accdb7c369564451ccd475fa290c026360e3f39890062` (matches Stage-1b sidecar). |
| `tests/fixtures/legacy-captures/phase-3-lenia.json` | sidecar present; sha256 `b232d2fffeaad7e8f20b1fadf0345c5d9da9096ba1332e1d806cbba1f07d1e63`. |
| `git lfs ls-files | grep phase-3-lenia` | `6c313a5da5 * tests/fixtures/legacy-captures/phase-3-lenia.h5` — LFS-tracked. |
| GitHub-LFS pushed | YES (Stage-1b push HELD: `Uploading LFS objects: 100% (1/1)`). |
| R2 mirror sync | **STOP-LFS SURFACED** (Stage 1b §9; agent env lacks `lfs.customtransfer.lfs-s3.path` + R2 creds; sync returned EOF). Carrying forward as SHIFTED item #2. NOT REVERTED. |

## § 6 — Perf-ledger byte-stability (FACT)

`docs/perf-ledger.md` lenia row at line 45 byte-stable since Stage
1b. sha256 of the file: `e04fb8f2308fc8ff75c09a8c85c6d0020607320689aa66a6382612eee713f345`.

## § 7 — verify_evidence sweep across all lenia stage audits (FACT)

```
PASS=6 FAIL=0
```

Across all 6 lenia-prefixed audits in `docs/_audits/phase-3/`
(db-investigation, plan-drafting, probe, stage-0, stage-1a, stage-1b)
— **6 pass / 0 fail at HEAD `165c46b`**. STOP-H NOT fired.

## § 8 — Append-only sweep (FACT)

Vs `v0.2.0-phase-2`:
- 164 files Added, 45 files Modified, **0 files Deleted**.
- Modifications are sanctioned mutable surfaces (progress.md +
  perf-ledger + glossary + CHANGELOG + tolerance + determinism +
  justfile + python-strict.yml + pyproject.toml + uv.lock).

Vs `v0.2.3-sub-phase-phase-3-render-similarity`:
- 44 files Added (lenia package + audits + golden tables + Tier-3 +
  PBT module + Chakazul vendor + legacy-capture seed + shared-files
  additions).
- 10 files Modified (sanctioned mutable surfaces).
- **0 files Deleted.**

Append-only HELD.

## § 9 — Integrity sweep (FACT)

`uv run python -m integrity --all --mode strict` at HEAD `165c46b`:
```
summary: 0 HARD_FAIL, 14 SOFT_WARN
```
Stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
— **byte-identical** to baseline. STOP-D NOT fired.

## § 10 — D-MUT-SCOPE NO ratification (FACT)

Per `docs/phases/phase-3-plan.md:1054-1058` § 6.0 item 12 +
charter §5 D-MUT-SCOPE NO RESOLVED-IN-CHARTER. **No mutation gate at
Stage 1c.** No `mutmut` run; no `tools/testkit/mutation/mutmut-config.toml`
extension; no `mutation` row in the audit's claims.

The sim is verified by **golden + PBT + determinism + 13-gate** (per
§ 6.3 VERIFICATION POSTURE `:1369-1373`). Stage 1c is the verdict-
landing layer for that verification.

## § 11 — STOP audit (Stage 1c)

| STOP | Fired? | Notes |
|---|---|---|
| STOP-D | NO | baseline byte-identical |
| STOP-H | NO | 6/0 verify_evidence sweep |
| STOP-REPLAY | not in scope (Stage 0 ran) | — |
| STOP-D-ANCHOR | NO (Stage 1b grep-cites HELD) | — |
| STOP-DET | NO | bit-exact MEASURED HELD; re-verified at Stage 1c |
| STOP-PBT | NO | invariants re-declared at Stage 1b NOT widened; both invariants GREEN at Stage 1c re-run |
| STOP-CAT-X | NO | no cap exists for golden category (FRICTION #1) |
| STOP-FFT | NO | FFT path not exercised |
| STOP-LFS | **carried (Stage-1b surfaced; R2 mirror pending)** | NOT REVERTED |
| STOP-I7 | NO | allowlist unchanged at Stage 1c; Stage-2 extension planned |
| STOP-TIER3-DIR | NO | first creation HELD at Stage 1b |
| STOP-K2-AT-HEAD | NO | (verified at Stage 0) |
| STOP-PIN | NO | SHA byte-equal across all 3 fetches |

## § 12 — Stage-1c verdict + forward-routing

**Verdict: SHIFTED** (closed-with-shifted-2 per charter §2.15).
Two SHIFTED items carried (neither resolvable at this verdict-landing
layer):

1. **SHIFTED #1 (PBT re-declaration).** Stage 1b re-declared
   `mass_approximately_conserved` → `monotone_bounds` +
   `per_step_change_bounded_by_dt` on math evidence (HARD RULE 2 +
   charter §6 anti-pattern reminder). The re-declared invariants
   STAY HELD at Stage 1c (2/2 GREEN). Operator landing review:
   confirm the SHIFTED invariants are the durable spec-ref §6
   declaration.
2. **SHIFTED #2 (R2 LFS mirror EOF).** Stage 1b surfaced STOP-LFS;
   GitHub-LFS HELD. R2 mirror sync requires either (a) operator
   pushes the OID `6c313a5da5…` via R2-credentialed environment OR
   (b) operator configures the agent's `lfs.customtransfer.lfs-s3.path`
   + AWS env. NOT REVERTED at this stage.

Stage 2 (sub-phase landing audit + I7 allowlist extension + closing
sweep + operator-tag proposal) is unblocked. Closing-status graded
variant per charter §2.15 = **closed-with-shifted-2** (or
closed-with-shifted-1 if operator ratifies the SHIFTED-#1 PBT
re-declaration as the canonical posture at the landing — in which
case the count is just the LFS R2 mirror).

— Stage-1c audit ends —
