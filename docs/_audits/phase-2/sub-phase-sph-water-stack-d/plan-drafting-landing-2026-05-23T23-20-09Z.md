---
date: 2026-05-23T23-20-09Z
author: sph-water-stack-d-plan-drafting-agent
phase: 2
artifact: plan-drafting-landing
artifact_id: sub-phase-sph-water-stack-d
subject: "Plan-drafting landing — SECOND spec-Phase-2 cross-stack port (sph-water → Stack-D Taichi). Charter + anchor-probe authored and committed. Three dispatch-anchor falsifications surfaced + corrected in-charter (Stack-B-WGSL → NumPy-reference source; spec §11.3 item 2.1.X → 2.2; R12-R20 scaling-not-atomic-scatter). D1-D8 surfaced with leans. golden-table gate-4 (no MMS); pre-existing equivalence.md extend-not-create; 100K descriptor; mandatory [overrides.sph-water]; first IC-16 production consumer; IC-15-candidate second validation pair (D5 formalization operative). 4 plan-drafting shifts (125 → 129). No blocking conditions."
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER-BACKFILL-CONVENTION-12>
head_sha_at_checkpoint: <PLACEHOLDER-BACKFILL-CONVENTION-12>
parent_audits:
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
evidence_paths:
  - docs/phases/sub-phase-sph-water-stack-d.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md
evidence_hashes:
  docs/phases/sub-phase-sph-water-stack-d.md: sha256:08e891f4ac865dcff19e760f3f44dac6a40f0fcfb44b23e6eabff4ff86d6ea8d
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md: sha256:a6a61e21c56fdc43ebfcb0bb481a7b76f1e9a31f2312d90648c7a898e3df4714
---

# Plan-Drafting Landing Audit — sph-water → Stack-D

## 1. Scope

Plan-drafting for the **SECOND per-sim cross-stack port under spec-Phase-2**:
`sph-water` (Phase-1 NumPy reference) → Stack-D (Python / Taichi-DSL / CPU). Two
artifacts authored + committed:

| Artifact | Path | Commit | blob sha256 |
|---|---|---|---|
| Anchor-probe | `docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md` | `30f18dbf97d4b6f16de06434d76223915a1b527b` | `a6a61e21c56fdc43ebfcb0bb481a7b76f1e9a31f2312d90648c7a898e3df4714` |
| Charter | `docs/phases/sub-phase-sph-water-stack-d.md` | `e7d469eb102a60a8efbb6310a58f81e9f39d7af6` | `08e891f4ac865dcff19e760f3f44dac6a40f0fcfb44b23e6eabff4ff86d6ea8d` |

This landing audit is commit 3; the Convention #12 SHA back-fill is commit 4.

**Verdict: CONFIRMED.** Charter is dispatchable subject to operator routing of
D1–D8 (§ 4). No blocking conditions (§ 6).

## 2. Probe inventory summary

(FACT — probe §§ 1–6; all HEAD-verified at `ce49cd4`.)

- **Phase-1 sph-water baseline:** DFSPH (Bender-Koschier 2015) implemented as
  **Python NumPy + scipy.cKDTree + numba** (`stack.name="numpy-reference"`); **no
  WGSL / Vulkan exists**. Determinism: sorted-sequential per-particle accumulation
  → `bit-exact-same-stack-same-hw`. Canonical capture
  `dam-break-100K-particles-seed42-step1000` (100K per R20; spec 1M = Stack-C
  forward contract). **No MMS** — golden-table gate-4/5 (cubic-spline-kernel +
  dfsph-density-evolution). 2 PBT invariants. 22 tests. Perf baseline 1291.854 s
  (~1390× RD-2D).
- **Infrastructure:** IC-2/4/5/8/9/11/12/13/14 available; **IC-16** (verify_evidence
  LFS-content-OID) RESOLVED at audit-chain-correctness (§B.6 Mode-2 annotations
  RETIRED) — this sub-phase is its first production consumer. `compare_captures`
  signature + `_resolve_tolerance` KeyError-without-override behavior verified.
  RD-2D Stack-D package + `equivalence.md` are the implementation + methodology
  templates.
- **IC-15 candidate methodology:** RD-2D `equivalence.md` 5-section template
  (harness invocation; two-taxonomy tolerance resolution; step-horizon discipline;
  per-field diff witness; per-pair R-P2). Formalization deferred to "the second
  cross-stack pair" = THIS sub-phase (D5 operative).
- **tolerance.toml [defaults.sph]:** `relative = 1e-4, absolute = 0.0`
  (HEAD-verified, not from memory). `[budgets.sph.cross_stack]` = same (at-budget).
  **No `[overrides.sph-water]`** at HEAD; Stage 1c adds it (MANDATORY — KeyError
  without it).
- **Reference capture sha256s (gate-14 LEFT inputs):** `.json`
  `84dbc44892e6ab941ac9469f25ed18827b7a6db6e2611df0a63f95a392ff5865` (committed
  blob == working-tree; no phantom); `.h5` LFS content OID
  `7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f`.
- **IC-11/12/13/14/16 surface state:** all present + consumed-by-reference; no
  amendment in scope.

## 3. Anchor-sketch verification (Convention M) + dispatch-anchor falsifications

(FACT — probe §§ 7, 9.)

**phase-2-plan § 2.6 / § 1.3.1 anchor sketches:** spec § 11.3 item **2.2** + work
item **2.2.D** VERIFY; the § 2.6 monolithic stage-data block is SUPERSEDED as a
dispatch vehicle (consumed as reference). **DRIFTED** sketches resolved at HEAD:
IMPL_DIR → `packages/sph-water-stack-d/` (RD-2D D6 portfolio shape);
spec-sheet/equivalence paths → plural `particle-fluids/`; descriptor → 100K (not
1M); `equivalence.md` "(create)" → already-exists-extend; convergence files →
CHANGELOG + dependencies.md + perf-ledger (not project-state.md);
momentum-conservation → advisory; "common-warp" → Taichi/common-py.

**Three dispatch-anchor FALSIFICATIONS (coordinator-side Convention #8; RD-2D N4 +
audit-chain-correctness S1+S2 precedent):**
- **F1:** "Stack-B WGSL" source → sph-water has **no WGSL**; spec primary is
  Stack-C (Vulkan, unimplemented); the gate-14 diff partner is the **NumPy
  reference**. Charter § 1.1/§ 1.4.2 framed accordingly.
- **F2:** "spec § 11.3 item 2.1.<X>" → actual item is **2.2**.
- **F3:** "R12–R20 established atomic-scatter cross-stack divergence" → R12–R20 are
  **scaling/scope remediations**; atomic-scatter is a spec § 2.5 epsilon-class
  declaration for a hypothetical Stack-C, not exhibited by the reference. R-S1/R-S2
  re-framed accurately.

None is blocking; the sub-phase is structurally sound (only the framing values
were mis-stated). Surfacing them IS the mandated discipline.

## 4. D1–D8 verdicts (lean + alternative + downstream)

| D | Lean | Alternative | Downstream |
|---|---|---|---|
| **D1** naming | `sub-phase-sph-water-stack-d` (§ C.1 + RD-2D D1) | `…-port-stack-d` | precedent for 6 remaining cross-stack ports |
| **D2** Stage-1 decomp | 1a/1b/1c (RD-2D) | split 1b if Stage-0 surfaces neighbor-search scope-expansion (R-S3) | ~14 commits |
| **D3** tolerance | HEAD `relative=1e-4, absolute=0.0` (`[defaults.sph]`) — NOT pre-committed beyond HEAD | if gate-14 exceeds: spec § 2.6 amendment OR step-horizon override | empirical at Stage 1c (R-S1) |
| **D4** step-horizon | full canonical step-1000 (matches reference descriptor) | shorter if Stage-0 wall-clock breach (R-S3) or Stage-1c amplification (R-S1) | documented regardless |
| **D5** IC-15 formalization | **empirics-driven:** clean gate-14 pass → formalize (a); needs routing → partial (c) | continue deferring to third pair (b) | subsequent ports consume IC-15-proper or candidate |
| **D6** `[overrides.sph-water]` | **MANDATORY** `category="sph"` (at-budget; KeyError without it) | — | second per-sim override precedent |
| **D7** LBM/MPM diagnostic defect | STAYS BANKED (not sph-water) | — | next LBM/MPM sub-phase |
| **D8 (NEW)** comparison-projection | cannot pre-decide (no Stack-D capture) | per-particle position vs density vs aggregate; ties to D5c | potential IC-15 axis amendment |

## 5. Estimated Stage 1 diff size + sub-decomposition recommendation (D2)

- **Stage 1a (failing-tests):** ~8 test files, ~+250 lines net.
- **Stage 1b (implementation):** the heaviest stage — DFSPH Taichi port (cubic-spline
  kernel + inlined spatial-hash neighbor search + density solve + divergence-free +
  constant-density iterative correctors + integrate) + sim wrappers + invariants +
  spec sheet + probe report. Estimate **~+1100 to +1600 lines net** (larger than
  RD-2D's ~+800–1200; DFSPH iterative solver + SPH neighbor search exceed Gray-Scott's
  single-pass stencil). Decomposition (D2 = 1a/1b/1c) is justified. If Stage 0
  Task 0.4 surfaces neighbor-search scope-expansion, operator may further split 1b.
- **Stage 1c (cross-stack + landing-prep):** `[overrides.sph-water]` +
  `equivalence.md` extension + gate-14 witness + schema-corpus. ~+200 lines net.
- **Recommendation:** retain 1a/1b/1c. The wall-clock of the canonical capture
  (R-S3) is the bigger Stage-1b risk than line-count; route at Stage 0.

## 6. Blocking dependencies (Hard Rule 2)

**None.** Specifically cleared (probe § 11):
- DFSPH atomic-scatter does NOT preclude cross-stack equivalence (reference is
  bit-exact same-stack; a Taichi port can mirror sorted-sequential accumulation;
  gate-14 outcome is empirical, not foreclosed).
- Taichi-DSL SPH neighbor-iteration is a **Stage-0 empirical question** (R-S3 Task
  0.4), not a known blocker; the inline-hash-grid pattern (not common-py) is known-good.
- `[defaults.sph]` exists at `1e-4`; the `KeyError`-without-override gap is the
  designed D6 Stage-1c deliverable, pre-checked by R-S5 (Stage-0 Task 0.6).

**Two items needing operator attention before Stage 0 dispatch:**
1. **D5 IC-15 formalization disposition** is the most consequential routing — but it
   is genuinely empirics-driven and resolves at Stage 2, not Stage 0; operator only
   needs to acknowledge the (a)/(b)/(c) frame now.
2. **Stage-0 wall-clock routing (R-S3):** if the canonical-descriptor scope-analysis
   estimates the Taichi-cpu 100K×1000-step capture near the 3-hour alarm, operator
   pre-routes (shorter horizon / diagnostic-tier-only / accept) — surface from Stage 0.

## 7. Cumulative shift count

**125 entering** (audit-chain-correctness § 9). **4 plan-drafting shifts** (probe § 10):
- **S1** — cross-stack source-stack is the Phase-1 NumPy reference, not a GPU stack
  (first such pair; framing precedent for eulerian-smoke / LBM).
- **S2** — gate-4 is golden-table, not MMS (first golden-table cross-stack port;
  establishes the variant of the template).
- **S3** — `equivalence.md` pre-exists as a Phase-1 stub (extend additively, not
  create de novo).
- **S4** — canonical-descriptor scope-analysis is load-bearing (1291.854 s baseline
  ~1390× RD-2D), promoting Phase-1 banked § 9.3(1) to a genuine Stage-0 gate.

**Cumulative at plan-drafting close: 129** entering Stage 0.

## 8. Tag posture

No `-phase-N` tag. Optional `v0.1.13` non-phase point-release banked for operator
(lean: NO tag, per all spec-Phase-2 sub-phase precedents). Agent never pushes tags.

---

This landing audit lands at HEAD `<PLACEHOLDER-BACKFILL-CONVENTION-12>` (back-filled
per Convention #12 + § B.2 in a separate `chore(sph-water-stack-d-plan-drafting-sha-backfill)`
commit; full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** — charter dispatchable subject to D1–D8 operator routing.
