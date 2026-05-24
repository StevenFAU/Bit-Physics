---
date: 2026-05-24T13-13-46Z
author: mpm-multimaterial-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-d-stage-1c
subject: "Stage 1c cross-stack equivalence CLOSE for the mpm-multimaterial -> Stack-D port (FOURTH spec-Phase-2 cross-stack port). VERDICT SHIFTED (carries N1+N2 from Stage 1b; 0 new Stage-1c shifts). ALL 14 GATES GREEN. Gate-14 compare_captures(mpm-ref LEFT, mpm-multimaterial-stack-d RIGHT) within_tolerance=True at {category: mpm, relative: 1e-4, absolute: 0.0} resolved via the FOURTH per-sim override [overrides.mpm-multimaterial] category=mpm (Stage-0 Task 0.4 R-S5 confirmed KeyError without it). Full canonical step-500 horizon (11 frames); step-horizon roll-up max_abs_err: particle_pos 0.0 (BIT-EXACT) / particle_material_id 0.0 / grid_mom 1.502225e-32 / particle_vel 6.247778e-28 -- LARGEST cross-stack margin of any port to date (~24+ orders below 1e-4); monotone growth but never approaches 1e-4; D8 NOT activated. equivalence.md EXTENDED additively (stub -> full IC-15 methodology sections + N2 + S6 + D9). All 15 tests GREEN (cross-stack un-skipped). N2: rigid-free-fall canonical (j_det=1.0; F=I -> zero stress); atomic-scatter (deferred IC-15 aspect #3) PRESENT but NOT EXERCISED. S6 second-instance pattern (sph-water + MPM). R-S6 calibration: IC-15 partial validates across 4 physics families at FP-round-off-or-below; D5 Stage 2 routing (b) PARTIAL HOLDS + REFINEMENT well-supported. Schema-corpus DEFERRED to Stage 2 (D10). Cumulative 146. NOT BLOCKED. Stage 2 dispatchable."
verdict-state: SHIFTED
head_sha: b1cef58e86debaaf0a8332043051a0c008c873c0
head_sha_at_checkpoint: b1cef58e86debaaf0a8332043051a0c008c873c0
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-1b-checkpoint-2026-05-24T12-53-50Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-checkpoint-2026-05-24T12-16-58Z.md
  - docs/phases/sub-phase-mpm-multimaterial-stack-d.md
  - docs/conventions/cross-stack-equivalence-methodology.md
evidence_paths:
  - docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md
  - tools/testkit/equivalence/tolerance.toml
  - packages/mpm-multimaterial-stack-d/tests/test_cross_stack_equivalence.py
  - tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-stage1c-gate14-2026-05-24T13-13-46Z.txt
  - captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.h5
  - captures/mpm-ref/drop-impact-128cube-seed42-step500.h5
evidence_hashes:
  docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md: sha256:9f8c9f1f39a22cba241ab5d12311b1606436a7d0ba281caeee2cb1261e50f918
  tools/testkit/equivalence/tolerance.toml: sha256:0605b08f9134f64fbf703441180bdf51aad940acc96f2216868208721df6aeed
  packages/mpm-multimaterial-stack-d/tests/test_cross_stack_equivalence.py: sha256:604924fcb69dc0118319fe3ac59ac9a2b6623c469ccfef6372c613ededffec86
  tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-stage1c-gate14-2026-05-24T13-13-46Z.txt: sha256:348575126dd57fa7ff8fab8a7f70374458475d178cfa08e7b90ad10b9fe829b6
  captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.h5: sha256:d8d38c8d228e319c72d2a4accb7c45e1e0764aa789cc7a8cd30c353603ad7edc
  captures/mpm-ref/drop-impact-128cube-seed42-step500.h5: sha256:73e00d0976a663a8e9c1de87334cba701a385ae9b044ead929eac8b540b5ebae
---

# Stage 1c cross-stack equivalence checkpoint — sub-phase-mpm-multimaterial-stack-d

> FOURTH spec-Phase-2 per-sim cross-stack port. ALL 14 GATES GREEN. Stage 2
> dispatchable. Verdict SHIFTED (carries N1+N2; 0 new Stage-1c shifts). Convention M
> re-anchor at HEAD: methodology `3c2149f6…` consumed AS-IS (Stage 2 amends per D5 (b)).

## § 1. Scope summary

Stage 1c is the gate-14 cross-stack equivalence stage + the IC-15-methodology-pattern
+ R-S6-calibration-banking + N2-recalibration-documenting stage. Single-capture (D4)
gate-14 against the Phase-1 NumPy+numba reference; the FOURTH validation pair for the
IC-15 PARTIAL-formalization methodology (hybrid-particle-grid physics family).

## § 2. 14-row gate-status table (all GREEN)

| Gate | Status |
|---|---|
| 1–13 | GREEN (Stage 1b; § stage-1b-checkpoint) |
| **14 cross-stack equivalence** | **GREEN** — `within_tolerance=True` @ 1e-4; ~24-order margin |

All 15 package tests GREEN (cross-stack un-skipped at Stage 1c).

## § 3. Per-step results

| Step | Result |
|---|---|
| 1 equivalence.md authored (EXTENDED stub additively; Convention A) | PASS (`9f8c9f1f…`) |
| 2 `[overrides.mpm-multimaterial] category="mpm"` added (FOURTH override) | PASS (`tolerance.toml` `0605b08f…`) |
| 3 gate-14 `compare_captures` invocation | PASS (`within_tolerance=True`) |
| 4 gate-14 acceptance (GREEN; ~24-order margin) | PASS |
| 5 tolerance widening | NO-OP (at-budget; not needed) |
| 6 schema-corpus entry | DEFERRED to Stage 2 (D10) |
| 7 `test_cross_stack_equivalence.py` SKIP removed → GREEN | PASS (`604924fc…`) |
| 8 commit `9c21de7` | PASS |

## § 4. Cross-stack equivalence witness (verbatim)

- **`within_tolerance = True`**
- `tolerance_table_used = {category: mpm, relative: 0.0001, absolute: 0.0}` (resolved via `[overrides.mpm-multimaterial]`)
- 44 `per_field_diff` entries (11 frames × 4 state fields: `particle_pos`, `particle_vel`, `particle_material_id`, `grid_mom`)

Step-horizon roll-up (max_abs_err over all frames, per field):

| Field | max_abs_err | max_rel_err (peak) |
|---|---|---|
| `particle_pos` | `0.000000e+00` (BIT-EXACT) | `0.0` |
| `particle_material_id` | `0.000000e+00` | `0.0` |
| `grid_mom` | `1.502225e-32` (step 500) | `~5.8e-9` |
| `particle_vel` | `6.247778e-28` (step 500) | `~9.1e-7` (near-zero-field artifact) |

Per-frame `particle_vel` max_abs_err: 50→`1.18e-30`, 100→`3.94e-30`, 150→`1.26e-29`, 200→`2.21e-29`, 250→`4.42e-29`, 300→`8.52e-29`, 350→`1.51e-28`, 400→`2.59e-28`, 450→`3.91e-28`, 500→`6.25e-28`. Monotone growth (APIC reconstruction FP residual) but ~24 orders below 1e-4 at every frame. **Step-horizon analysis: NO amplification approaching 1e-4; D8 comparison-projection NOT activated.** High `max_rel_err` on `particle_vel` is a near-zero-field artifact (LBM § 4.5 guidance: read `within_tolerance` + `max_abs_err`); the harness verdicts on `abs_err > atol + rtol·field_scale` (`field_scale ≈ |vz|` ~0.05), which the `~1e-28` abs error clears by ~24 orders.

## § 5. equivalence.md content summary + sha256

`docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` (committed-blob `9f8c9f1f39a22cba241ab5d12311b1606436a7d0ba281caeee2cb1261e50f918`): EXTENDED the Phase-1 stub additively (preserved the tolerance-row table; updated the stale "Stack-D self-replicates / Not yet exercised" cross-stack-scope row to the VALIDATED NumPy+numba ↔ Taichi pair). Added: harness invocation; tolerance routing (hybrid-pg→mpm); gate-14 verdict + full per-frame step-horizon table; **N2 atomic-scatter-present-but-not-exercised subsection**; **S6 second-instance-pattern subsection**; D9 MLS-MPM/APIC/neo-Hookean-single-material subsection; methodology precedent (FOURTH pair; D5 (b) Stage-2 routing).

## § 6. `[overrides.mpm-multimaterial]` + tolerance.toml sha256

`tools/testkit/equivalence/tolerance.toml` (committed-blob `0605b08f9134f64fbf703441180bdf51aad940acc96f2216868208721df6aeed`): added the FOURTH per-sim override `[overrides.mpm-multimaterial] category = "mpm"` (after RD-2D + sph-water + LBM). At-budget per `[defaults.mpm]` (relative=1e-4, absolute=0.0); `[budgets.mpm.cross_stack]`=1e-4 UNCHANGED (NOT a widening). Prior three overrides untouched.

## § 7. Schema-corpus disposition

**DEFERRED to Stage 2** per D10 representative-subset routing. Stage 1c does NOT add a schema-corpus entry. Banked for Stage 2 Step 2.9: representative-subset extraction methodology (~20-100 MB subset of the ~1.05 GiB canonical) + entry addition at `tests/fixtures/legacy-captures/` + corpus round-trip verification in CI (via `gh`) per S-CI1 before declaring GREEN.

## § 8. `test_cross_stack_equivalence.py` SKIP-removal + GREEN evidence

SKIP marker (Stage 1b) removed; the test invokes `compare_captures` + asserts `within_tolerance`. Committed-blob `604924fc69dc0118319fe3ac59ac9a2b6623c469ccfef6372c613ededffec86`. GREEN evidence (verdict dump + test run): `tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-stage1c-gate14-2026-05-24T13-13-46Z.txt` (committed-blob `348575126dd57fa7ff8fab8a7f70374458475d178cfa08e7b90ad10b9fe829b6`). `1 passed` (cross-stack) / `15 passed` (full suite).

## § 9. Sub-phase coherence outputs (LOAD-BEARING for Stage 2 D5 routing)

- **Gate-14 GREEN** at full canonical horizon; `within_tolerance=True` at 1e-4 with **~24+ order margin (largest of any cross-stack port to date)**; `particle_pos` bit-exact at every frame.
- **N2 (substantive):** canonical trajectory is rigid free-fall (F=I; j_det=1.0; zero neo-Hookean stress). The P2G atomic-scatter surface (deferred IC-15 aspect #3) is **PRESENT in the kernel** (Stage-0 Task 0.3 confirmed `~8.5e-10` at a non-degenerate small-scale derisk) **BUT NOT EXERCISED by the canonical trajectory** (uniform velocity + zero stress → order-independent scatter sums; the residual `~1e-28` vel diff is the APIC reconstruction FP residual, not scatter-order divergence). Aspect #3 stays substantively un-stress-tested at canonical scale.
- **R-S6 calibration:** IC-15 PARTIAL-formalization now validates across **four physics families** (continuous-ca + particle-fluids + lattice + hybrid-particle-grid) at the algebraically-identical-trajectory + FP-round-off-or-below regime. Remaining deferred aspects (#1 R-P2 chaotic — j_det clamp never fired; #3 atomic-scatter substantively; #5 iterative-solver — single-pass explicit) STAY un-stress-tested.
- **S6 pattern = TWO-INSTANCE banked observation** (sph-water S6 + MPM N2): Phase-1 canonical trajectories may exercise far less than spec-described dynamics; the methodology validates the canonical-trajectory cross-stack equivalence, NOT the spec-described regime. Worth methodology-doc codification (Stage 2 D5 (b)): "downstream cross-stack pairs HEAD-verify the canonical trajectory's algebraic surface against spec-described dynamics at the plan-drafting probe (S6)."
- **D5 Stage 2 routing well-supported = option (b) PARTIAL HOLDS + REFINEMENT.** Stage 2 amends `docs/conventions/cross-stack-equivalence-methodology.md` ADDITIVELY with: (1) atomic-scatter-Stack-D-side present-but-not-exercised subsection (banked for a fifth pair to stress-test #3 substantively); (2) hybrid-particle-grid taxonomy (`hybrid-pg`→`mpm`); (3) the two-instance S6-pattern methodology consideration. DOES NOT promote partial → full (four pairs at the same regime; deferred aspects substantively un-stress-tested). (a) FULL not supported; (c) UNCHANGED less precise than (b).
- **Firsts:** hybrid-particle-grid taxonomy; atomic-scatter-Stack-D-side surface (present-but-not-exercised at canonical); Taichi-cpu wall-clock 2.28× the NumPy-numba baseline (N1; FLAGGED per spec § 2.15 at landing review — first Stack-D port over 2×).
- **Banked precedents propagating to Stage 2 + the fifth pair:** S6 pattern second-instance bank; atomic-scatter-present-but-not-exercised disposition; Taichi-cpu-vs-NumPy-numba perf ratio is workload-/kernel-launch-shape-dependent (RD-2D 0.61×, sph-water 0.195×, LBM 1.31×/1.61×, MPM 2.28×).

## § 10. New Stage 1c SHIFTs

**0 new Stage-1c shifts.** Gate-14 GREEN as the Stage-1b informal preview predicted (N2); the override + equivalence.md + un-skip are the planned MANDATORY deliverables (D6); no drift surfaced. The sub-phase carries N1 (perf 2.28× flag) + N2 (rigid-free-fall / atomic-scatter-not-exercised recalibration) from Stage 1b. **Cumulative at Stage-1c close: 146.**

## § 11. Stage 2 dispatch readiness

**READY.** Stage 2 (landing): convergence edits (CHANGELOG + dependencies.md + perf-ledger cross-check); portfolio-scale regression sweep (§ B.7; verify the 4 `[overrides.*]` non-interference + no regression in the now-18 workspace members); integrity sweep; gate-13 replay; IC-16 evidence-path verification; **D10 schema-corpus representative-subset entry + CI round-trip verification (S-CI1)**; **D5 (b) IC-15 methodology amendment** (additive: atomic-scatter-present-but-not-exercised + hybrid-pg taxonomy + S6-pattern consideration); append-only check; landing audit + SHA back-fill. N1 perf 2.28× FLAGGED for landing-audit review. No `-phase-N` tag.

---

*End of Stage 1c checkpoint. SHA back-fill follows (Convention #12 + N1 enumeration).*
