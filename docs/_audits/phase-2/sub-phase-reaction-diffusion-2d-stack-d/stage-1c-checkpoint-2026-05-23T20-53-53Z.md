---
date: 2026-05-23T20-53-53Z
author: reaction-diffusion-2d-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: reaction-diffusion-2d-stack-d-stage-1c
subject: "Stage 1c cross-stack equivalence + gate-14 GREEN — SHIFTED (N1 + N2). The FIRST true matching-sim cross-stack invocation surfaced a sim.category/tolerance-category taxonomy resolution gap: compare_captures raised KeyError because sim.category='continuous-ca' (physics-family) does not key any tolerance.toml [defaults.*] (numerical-method-family) and no per-sim override existed. Operator routed Option 1 (at-budget per-sim override, NOT a widening). With [overrides.reaction-diffusion-2d] category='reaction-diffusion' the harness resolves relative=1e-4 and gate-14 is within_tolerance=True: step-0 bit-identical, PEAK max_abs_err=1.898481e-14 @ step:1600:U, PEAK max_rel_err=1.246518e-13 @ step:1600:V, margin ~5.27e9x; diff stays at FP-round-off scale through step-2000. R-P2 chaotic-divergence hypothesis EMPIRICALLY FALSIFIED for this pair. equivalence.md authored (IC-15 candidate). Schema-corpus entry seeded. SKIP removed; 16 package tests GREEN. All 14 gates GREEN. Single monolithic commit 2b5353a."
verdict-state: SHIFTED
head_sha: PENDING-CONVENTION-12-BACKFILL
head_sha_at_checkpoint: PENDING-CONVENTION-12-BACKFILL
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-landing-2026-05-23T17-47-51Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-checkpoint-2026-05-23T18-10-17Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1a-checkpoint-2026-05-23T18-31-28Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1b-checkpoint-2026-05-23T20-35-18Z.md
evidence_paths:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md
  - docs/conventions/sub-phase-conventions.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-budget.toml
  - packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py
  - tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.h5
  - tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.json
  - captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5
  - captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json
  - captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5
  - captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1c-evidence/gate-14-cross-stack-harness-2026-05-23T20-53-53Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1c-evidence/gate-14-pytest-post-skip-removal-2026-05-23T20-53-53Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
  docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md: sha256:1df9035e34560d5ab30af00f3047c104c3a3576b1d541751e728bf4ee6337744
  tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.h5: sha256:2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d
  tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.json: sha256:c88bd2c35b82a65f225798c437094ee6cba7b8d4704b4b9f91c5230055b574d3
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5: sha256:bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json: sha256:585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc
  captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5: sha256:2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d
  captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json: sha256:a7780645d2159208e281a49c95b9d43c66ffd8b7e6ca3524345be19c468abd68
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1c-evidence/gate-14-cross-stack-harness-2026-05-23T20-53-53Z.txt: sha256:fc161cd206aba1ec42c929865302a04e815c1dc699739e96e90facede260cdc2
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1c-evidence/gate-14-pytest-post-skip-removal-2026-05-23T20-53-53Z.txt: sha256:a7eab064df4af8418cf10ebb32905b426a9e2b8e106aed15dbfd5b2a72d8cef1
---

# Stage 1c Checkpoint — Sub-Phase RD-2D → Stack-D

## 1. Scope summary

(FACT — charter § 4.2.3 7-step sequence; operator-routed amendments folded in.)

Stage 1c (cross-stack equivalence harness extension + landing-prep) of the FIRST per-sim cross-stack port sub-phase under spec-Phase-2. Single Claude Code session. Single monolithic sub-bundle commit (`2b5353a`) per Convention A; new files first + additive edits.

This stage is the **gate-14 cross-stack equivalence + methodology-pattern stage**. It is the FIRST true matching-sim cross-stack invocation of `compare_captures` in the portfolio (R-P1).

**Verdict: SHIFTED (N1 + N2).** Gate-14 is GREEN at `relative = 1e-4` — but only after closing a `sim.category`/tolerance-category resolution gap that the plan-drafting probe (D3) did not catch by structural inspection alone. The first empirical `compare_captures` invocation raised `KeyError` (no `[defaults.continuous-ca]`; no per-sim override). Operator routed Option 1 — an at-budget per-sim `[overrides.reaction-diffusion-2d] category = "reaction-diffusion"` (resolution wiring, NOT a tolerance widening). With the override the harness resolves `relative=1e-4` and `within_tolerance == True`.

## 2. 14-row gate-status table

(FACT — charter § 2 14-row table; all GREEN at Stage 1c close.)

| Gate | Status | Witness |
|---|---|---|
| 1 spec sheet | **GREEN** | `spec-ref-stack-d.md` (Stage 1b) |
| 2 probe report | **GREEN** | `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` (Stage 1b) |
| 3 failing-tests committed | **GREEN** | Stage 1a `ca9bc0b…`; evidence `685e5cc0…23ad6446` |
| 4 code verification (MMS) | **GREEN** | Stage 1b OOA combined=1.9972 (formal 2.0, ±0.5) |
| 5 Tier 1 (NaN/Inf) | **GREEN** | Stage 1b `test_stack_d_canonical_capture_is_healthy` |
| 6 Tier 2 scalar_field | **GREEN** | Stage 1b U,V ∈ [0,1] across 11 frames |
| 7 Cat 1 citations | **GREEN** | Stage 1b `spec-ref-stack-d.md` § 2 |
| 8 Cat 2 public API | **GREEN** | Stage 1b `reaction_diffusion_2d_stack_d.{reference,sim,invariants}` |
| 9 canonical capture + testkit-replayable | **GREEN** | Stage 1b capture `2e93a751…1041b13d` / `a7780645…468abd68`; Stage 1c schema-corpus entry seeded (§ 6) |
| 10 determinism (IC-13) | **GREEN** | Stage 1b `content_equivalent=True` |
| 11 PBT (3 invariants) | **GREEN** | Stage 1b 3/3 at n_examples=20 |
| 12 perf-ledger row | **GREEN** | Stage 1b 0.568 s (0.61× Stack-B baseline) |
| 13 failing-tests replay | **GREEN (structural)** | Stage 1b worktree replay 6/6 ModuleNotFoundError |
| 14 cross-stack equivalence (Phase-2) | **GREEN** | `compare_captures` Stack-B↔Stack-D `within_tolerance=True` at `relative=1e-4`; per-field witness § 4; test un-skipped + PASS (§ 7) |

## 3. 7-step per-step results table

(FACT — charter § 4.2.3 7-step sequence; amended per operator routing.)

| STEP | Artifact / Outcome | Result |
|---|---|---|
| 1 | Author `equivalence.md` (NEW; expanded per operator) | Authored; sha256 `1df9035e…337744`; covers harness invocation, two-taxonomy resolution wiring, step-horizon discipline, per-field diff witness, R-P2 empirical disposition, IC-15-candidate methodology template |
| 2 | Run cross-stack harness | **First invocation raised `KeyError`** (`sim.category='continuous-ca'` unresolvable; no override). After operator-routed at-budget override: `within_tolerance=True`, resolved `category=reaction-diffusion relative=1e-4 absolute=0.0`. Evidence `fc161cd2…60cdc2` |
| 3 | Gate-14 acceptance | **GREEN** — `within_tolerance=True`; peak `max_abs_err=1.898481e-14`; never approaches 1e-4 |
| 4 | Tolerance.toml override | **DONE (operator-routed Option 1)** — at-budget `[overrides.reaction-diffusion-2d] category="reaction-diffusion"`; `tolerance-budget.toml` untouched; schema-valid; Cat-X clean |
| 5 | Schema-corpus entry | `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}`; h5 `2e93a751…1041b13d` (== canonical), json `c88bd2c3…b574d3` (SHIFTED; payload.path rewritten); round-trips via `load_capture` (11 frames, U+V) |
| 6 | Remove SKIP + run | `pytest …test_cross_stack_equivalence.py` 1 PASSED; full package 16 passed; ruff clean; evidence `a7eab064…2d8cef1` |
| 7 | Monolithic Stage 1c commit | `2b5353a` `feat(reaction-diffusion-2d-stack-d-stage1c)`; 7 files, +364/-21; pre-commit hooks (toml/json/ruff/integrity Cat-4/conventional-commit) all passed |

## 4. Cross-stack equivalence witness

(FACT — Stage 1c evidence `gate-14-cross-stack-harness-2026-05-23T20-53-53Z.txt` sha256 `fc161cd2…60cdc2`.)

- **within_tolerance = True.**
- **Tolerance resolved:** `category=reaction-diffusion, relative=1e-4, absolute=0.0` (via `[overrides.reaction-diffusion-2d]`; budget cap `[budgets.reaction-diffusion.cross_stack] relative=1e-4`).

Per-frame max_abs_err / max_rel_err for U + V (11 frames):

| step | U abs | U rel | V abs | V rel |
|---|---|---|---|---|
| 0    | 0.000000e+00 | 0.000000e+00 | 0.000000e+00 | 0.000000e+00 |
| 200  | 6.661338e-16 | 1.297690e-15 | 5.273559e-16 | 5.423365e-15 |
| 400  | 8.881784e-16 | 1.786274e-15 | 6.938894e-16 | 5.638413e-15 |
| 600  | 1.776357e-15 | 3.159543e-15 | 1.360023e-15 | 1.103427e-14 |
| 800  | 2.331468e-15 | 4.488092e-15 | 1.887379e-15 | 1.515314e-14 |
| 1000 | 2.664535e-15 | 5.279403e-15 | 2.109424e-15 | 1.693436e-14 |
| 1200 | 6.106227e-15 | 1.187523e-14 | 5.107026e-15 | 3.585036e-14 |
| 1400 | 1.465494e-14 | 2.998018e-14 | 1.182388e-14 | 8.994185e-14 |
| 1600 | **1.898481e-14** | 3.051906e-14 | 1.221245e-14 | **1.246518e-13** |
| 1800 | 1.143530e-14 | 2.270126e-14 | 8.937295e-15 | 7.105501e-14 |
| 2000 | 1.132427e-14 | 2.098539e-14 | 8.798517e-15 | 7.176378e-14 |

**Step-horizon analysis (informational banked data).** Step 0 is bit-identical (NumPy IC shared; P27 cause #1 ruled out). The diff grows roughly monotonically to a peak near step 1600 (`max_abs_err ≈ 1.9e-14`), then recedes slightly through steps 1800/2000. It **never approaches or exceeds the 1e-4 tolerance** at any horizon — peak `max_abs_err` is ~5.27×10⁹ below tolerance. The "step at which the cross-stack diff approaches/exceeds 1e-4" is therefore **never within the step-2000 horizon** for this pair.

## 5. equivalence.md content summary + sha256

(FACT — `sha256sum docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md`.)

sha256 `1df9035e34560d5ab30af00f3047c104c3a3576b1d541751e728bf4ee6337744`. Sections: (1) the cross-stack pair; (2) harness invocation pattern + `EquivalenceVerdict` shape; (3) tolerance resolution wiring (the two-taxonomy distinction: physics-family `sim.category` vs numerical-method tolerance-category; per-sim override mechanism; at-budget vs routed-widening); (4) step-horizon documentation discipline; (5) per-field diff witness (the 11-frame table); (6) R-P2 empirical disposition (falsified for this pair; not auto-inherited); (7) methodology precedent for the 7 subsequent cross-stack pairs (IC-15 candidate, with the `particle-fluids→sph` / `volumetric-grid→smoke` / `lattice→lbm` override map).

## 6. Schema-corpus entry sha256s

(FACT — `sha256sum tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.*`.)

| File | sha256 |
|---|---|
| `…phase-2-reaction-diffusion-2d-stack-d.h5` | `2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d` (== Stack-D canonical; binary unchanged) |
| `…phase-2-reaction-diffusion-2d-stack-d.json` | `c88bd2c35b82a65f225798c437094ee6cba7b8d4704b4b9f91c5230055b574d3` (SHIFTED from `a7780645…468abd68`; `payload.path` rewritten to `phase-2-reaction-diffusion-2d-stack-d.h5` per the `phase-<N>-<sim>` legacy convention; `payload.checksum` preserved) |

Round-trips via `capture.load_capture` (11 frames; state keys U, V).

## 7. test_cross_stack_equivalence.py SKIP-removal + GREEN evidence

(FACT — `gate-14-pytest-post-skip-removal-2026-05-23T20-53-53Z.txt` sha256 `a7eab064…2d8cef1`.)

Module-level `pytestmark = pytest.mark.skip(...)` removed (with the now-unused `import pytest`); stale "PLACEHOLDER at Stage 1a" docstring updated to the Stage-1c-active description. `test_stack_d_capture_within_tolerance_of_stack_b` invokes `compare_captures(left=stack_b_manifest_path, right=stack_d_manifest_path)` and asserts `within_tolerance`. Result: **1 passed**; full package suite **16 passed** (Stage 1b's 15-pass + 1-skip becomes 16-pass + 0-skip); ruff clean.

## 8. New SHIFTs surfaced at Stage 1c

| ID | Description |
|---|---|
| **N1 (Stage 1c)** | **First true matching-sim cross-stack invocation surfaced a `sim.category` / tolerance-category taxonomy gap.** The plan-drafting probe (D3 disposition) inferred from `tolerance.toml` structure that "no per-sim override needed at HEAD" — but did NOT empirically invoke `_resolve_tolerance` or `compare_captures` against a real-sim manifest. The Stage 1c step-2 empirical invocation surfaced the `KeyError` that probe inspection alone could not catch (`sim.category='continuous-ca'` is the physics-family taxonomy; `tolerance.toml [defaults.*]` keys are the numerical-method-family taxonomy; the two are intentionally distinct and do not coincide). Resolution: at-budget per-sim `[overrides.reaction-diffusion-2d] category="reaction-diffusion"` establishing the precedent for subsequent cross-stack port sub-phases. **Banked methodology-precedent:** plan-drafting probes for cross-stack equivalence MUST empirically invoke `_resolve_tolerance` (or `compare_captures` end-to-end with a real-sim or synthetic-with-real-`sim.category` manifest) — NOT just verify `tolerance.toml` structure. Stage 0 R-P1 task scope expands for subsequent cross-stack port sub-phases: validate end-to-end harness invocation against a synthetic Stack-X capture manifest carrying the real `sim.category` value, NOT just parser performance at scale. |
| **N2 (Stage 1c)** | **Cross-stack equivalence verdict establishes IC-15 candidate at the methodology-template + at-budget-resolution-wiring level.** The two-taxonomy distinction (physics-family `sim.category` vs numerical-method-family tolerance-category) is explicitly preserved at the harness level; resolution wiring goes in `tolerance.toml [overrides.<sim>]` per-sim. Subsequent Stack-D port sub-phases (sph-water → `particle-fluids` → `sph`; eulerian-smoke → `volumetric-grid` → `smoke`; LBM → `lattice` → `lbm`) add their own per-sim overrides as part of their Stage 1c. The pattern is uniform; the IC-15 spec-template can formalize after the second cross-stack pair lands (D5 full-consolidation defer per charter § 11.2). |

**R-P2 empirical disposition (banked precedent).** The Gray-Scott chaotic-regime divergence hypothesis is **empirically falsified for this cross-stack pair** at the full step-2000 horizon: NumPy-bit-identical IC (step-0 diff = 0) + algebraically-identical update means only FP-accumulation primitives differ, and the cross-stack diff stays at ~10⁻¹⁴ (peak ~1.9e-14 @ step 1600), never amplifying toward 1e-4. This disposition is NOT auto-inherited by future pairs; each runs its own step-horizon analysis.

**Known supersession (informational; for Stage 2 reconciliation).** `spec-ref-stack-d.md` § 9 (Stage 1b) and `spec-ref.md` § 9 (Phase 0, append-only-protected) both state "no per-sim override." Stage 1c's at-budget `[overrides.reaction-diffusion-2d]` supersedes that statement for the Stack-D sheet. Not amended here (out of Stage 1c scope per dispatch; `spec-ref-stack-d.md` is a Stage 1b deliverable). `equivalence.md` (the canonical cross-stack methodology doc) documents the override accurately. Flagged for Stage 2 additive reconciliation if the operator routes it.

**Cumulative shift count at Stage 1c close.** 113 (entering) + 2 (N1, N2) = **115** entering Stage 2.

## 9. Stage 2 dispatch readiness

(FACT — per charter § 4.3.)

All 14 gates GREEN; landing-prep complete. Stage 2 (landing) is dispatchable verbatim per charter § 7.5 / § 4.3 Steps 2.1 → 2.12. Stage-2-specific notes carried from Stage 1c:

- **Integrity sweep (Step 2.4):** byte-identical streak against `810cd6e3…23411f98` is expected to BREAK — Stage 1c adds new files (equivalence.md, schema-corpus entry) and an additive `tolerance.toml` override. Document per-Cat deltas; the streak is informational, not load-bearing.
- **Tolerance-budget (Step 2.x):** the `[overrides.reaction-diffusion-2d]` entry is at-budget; `tolerance-budget.toml` is unchanged. No Cat-X risk.
- **spec-ref-stack-d.md § 9 supersession (§ 8 above):** candidate for Stage 2 additive reconciliation.
- **Convergence (Step 2.9):** CHANGELOG + `docs/dependencies.md` additive entries; perf-ledger row already landed at Stage 1b.

---

This checkpoint lands at HEAD `PENDING-CONVENTION-12-BACKFILL` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(reaction-diffusion-2d-stack-d-stage1c-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time). The Stage 1c implementation commit is `2b5353aee4971823ddec6e5678df90bd9e3b80b8`.

Verdict: **SHIFTED (N1 + N2)** — gate-14 GREEN; all 14 gates GREEN; sub-phase landing-prep complete.
