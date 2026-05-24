---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-d-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: 41310ac5a1154687d9e5a9ca52c81cd6a2015c88
head_sha_at_checkpoint: b973fd9405cf6684d94fedb296ab8ec1c877a75e
date: 2026-05-24T11-52-00Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-mpm-multimaterial-stack-d.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-probe-2026-05-24T11-45-06Z.md
---

# Plan-drafting landing — sub-phase-mpm-multimaterial-stack-d

> FOURTH spec-Phase-2 per-sim cross-stack port. Plan-drafting (probe + charter)
> complete. D1–D10 surfaced for operator routing; Stage 0 dispatchable after routing.
> Coordinator-side Convention #8 discipline exemplified: every dispatch-referenced
> value treated as "believed-true; verify at HEAD"; the probe's empirical Phase-1
> `sim.py` read (S6) is the load-bearing anchor — and it FALSIFIED two dispatch
> premises (the D7 MPM seed-propagation defect; the "multimaterial" framing).

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-probe-2026-05-24T11-45-06Z.md` | `4d1bcc5bb33f8069c76bf000996c9e259c1fe0a5` |
| Charter | `docs/phases/sub-phase-mpm-multimaterial-stack-d.md` | `b973fd9405cf6684d94fedb296ab8ec1c877a75e` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-24T11-52-00Z.md` | back-filled below |
| SHA back-fill | — | this back-fill commit (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no blocking dependencies. **Hard Rule 2 NOT triggered as a blocker** — but two dispatch premises were FALSIFIED at HEAD (D7 seed defect; "multimaterial" framing) and surfaced cleanly (§ 3 / § 5). These are believed-state corrections, not structural wrongness; drafting proceeds with the corrected leans.

## § 2. S6 banked-precedent application outcome (load-bearing)

Phase-1 MPM characterized at HEAD by reading `packages/mpm-multimaterial/mpm_multimaterial/{sim.py, reference/{mls_mpm,shape_functions,__init__}.py, invariants.py}` (NOT just spec sheets) + empirical execution:
- **Variant:** MLS-MPM (Hu et al. 2018), APIC affine-velocity reconstruction (`4/dx²` quadratic-B-spline coefficient). `variant="mls-mpm-hu-2018-multimaterial"`. NOT PIC/FLIP/standard/implicit-MPM.
- **Material model:** neo-Hookean **SINGLE material** (`material_id` all-0, never mutated; E=4000, ν=0.3). Multi-material constitutive table **declared-only** (`algebraic.md` § 3; Phase 2+). → "multimaterial" is the sph-water pattern (richer spec, simplified reference).
- **Source stack:** `stack.name="numpy-numba-reference"` (`sim.category="hybrid-pg"`). → NumPy+numba-reference ↔ Taichi-CPU pair (the sph-water/LBM pattern). SECOND numba-using sim.
- **Atomic-scatter:** the Phase-1 reference has **NONE** (single-thread `@njit(parallel=False)` sequential `+=` scatter; sorted-particle lex + fixed 27-cell stencil → bit-exact). **BUT** `determinism.md` explicitly anticipates the canonical Stack-D Taichi P2G `ti.atomic_add` (declaring `epsilon-same-stack`); the reference OVER-ACHIEVES to bit-exact. → **MPM is the FIRST cross-stack pair to put deferred IC-15 aspect #3 (atomic-scatter) in play, on the Stack-D side.**
- **Iterative components:** **NONE** (single-pass explicit: stress→P2G→grid-update→G2P→deformation-update→advect; symplectic-Euler). Deferred aspect #5 NOT exercised.
- **Material discontinuities:** **NONE** (elastic neo-Hookean). The trajectory is a contact-rich drop-impact (rebound off sticky floor over 500 steps) + a non-smooth `j_det≤0→log_j=−30` stress branch → a MILD/WEAK R-P2 (deferred aspect #1) candidate, not a strong one.
- **Trajectory vs spec:** SIMPLIFIED (single-material; sph-water pattern).
- **Seed handling (D7):** **threads `seed` correctly** into the blob rejection-sampler (`np.random.default_rng(int(seed))`); empirically `seed=42`≠`seed=99` (`max_abs_diff=0.283`). The banked "ignores seed" defect is INACCURATE for MPM at HEAD; only the descriptor filename hardcodes `seed42` (cosmetic). `sim.py` created `9bd770e`, unchanged since.

**Expected gate-14 shape:** **methodology-validation-at-fourth-regime exercising deferred aspect #3 partially** — most likely `within_tolerance=True` at 1e-4 with FP-round-off-to-small margin IF the Stack-D P2G atomic-scatter is serialised in the reference's order (posture (i)); a non-trivial scale (possibly toward 1e-4) + potential D8 activation IF parallel atomic-scatter (posture (ii)). Aspects #1 (weak) and #5 (unexercised) keep full formalization premature.

## § 3. D1–D10 verdicts (lean + alternative + downstream)

| D | Verdict (lean) | Alternative(s) | Downstream |
|---|---|---|---|
| **D1** naming | **`sub-phase-mpm-multimaterial-stack-d`** (pkg `packages/mpm-multimaterial-stack-d/`; captures `captures/mpm-multimaterial-stack-d/`) — CONFIRMS dispatch (S-M3) | abbreviated `mpm-stack-d` (rejected) | full-name precedent for remaining ports |
| **D2** stage decomp | **1a/1b/1c**; 1b ~1300–1700 LOC, no sub-split | sub-split 1b (not needed) | Stage-0 confirms scope |
| **D3** tolerance | **`1e-4`** (`[defaults.mpm]`; HEAD) — looser than LBM 1e-5 (S-M2) | amendment if gate-14 > 1e-4 (R-M1) | more headroom than LBM |
| **D4** step-horizon | **full** (500 steps, cadence-50, 11 frames) | shorter (not pre-committed) | R-M2 roll-up load-bearing |
| **D5** IC-15 disposition | **(b) PARTIAL HOLDS + REFINEMENT** (additive: particle-scatter FP-accumulation + atomic-scatter-posture + golden-only-single-capture; keep #1/#5 deferred) | **(d)** substantive expansion if parallel-scatter + D8; **(a)** full (premature; #1/#5 unexercised); **(c)** unchanged (too weak) | tempers dispatch's (a)-into-play framing |
| **D6** override | **MANDATORY** `[overrides.mpm-multimaterial] category="mpm"` (4th override; `hybrid-pg`→`mpm`; at-budget) | none | KeyError without it |
| **D7** seed defect | **(b) STAY BANKED / close-as-NOT-A-DEFECT** (MPM threads seed correctly — SHIFT from dispatch (a) FOLD-IN; S-M4) | (a) FOLD-IN (rejected — nothing to fix; sealed-code edit for zero gain); (c) standalone (unwarranted) | NO seal-exception; NO edit to `packages/mpm-multimaterial/` |
| **D8** comparison-projection | **deferred** unless Stage-1c parallel-scatter divergence | per-grid-node mass histogram / Σ-mass / Σ-momentum / energy | resolves with D5 |
| **D9** variant/material | **MLS-MPM + APIC + neo-Hookean single material** (HEAD); cross-stack surface = P2G scatter + G2P/APIC + stress det/log | none (reference is fixed) | no MRT/multi-material/plastic |
| **D10** corpus sizing | **surface to operator** — canonical ~1 GiB vs diagnostic-tier in corpus; LFS + CI `lfs:true` configured | (i) canonical (LBM precedent, ~1 GiB); (ii) diagnostic-tier (lighter) | S-CI1 CI round-trip before Stage-2 GREEN |

## § 4. Probe inventory summary (HEAD-verified)

- **Anchors:** conventions `69aa39fc…4602bf45`, architecture `e82b7b8e…9292d267`, methodology `3c2149f6…6189cc` — all MATCH dispatch verbatim (Convention M; § 0 probe). No conventions/architecture/methodology drift.
- **Infrastructure:** IC-11/12/13/14/15-partial/16 all landed + consumed; `.gitattributes` `legacy-captures/**/*.h5 filter=lfs` (LBM); CI checkout `lfs:true` (`b027f60`).
- **IC surface:** IC-15 partial (`3c2149f6…`; 5 codified + § 4 LBM subsections + 5 deferred). MPM is the FIRST sub-phase consuming BOTH IC-5 (particle) AND IC-6 (vector_field) at Tier-2.
- **tolerance.toml:** `[defaults.mpm]=1e-4/0.0`; `[budgets.mpm.cross_stack]=1e-4/0.0`; NO `[overrides.mpm-multimaterial]` at HEAD (Stage-1c adds the 4th override).
- **Canonical capture (count = ONE):** `captures/mpm-ref/drop-impact-128cube-seed42-step500.h5` (content `73e00d0976a663a8e9c1de87334cba701a385ae9b044ead929eac8b540b5ebae`; 1,125,718,712 B / ~1.05 GiB; LFS) + `.json` (blob `ea3531e032c4658bd5c06a7bf5c0b76e18b50515d67bd932efaa4a5cd28d1a2f`).
- **Perf baseline:** **158.052 s** (1M particles × 128³ × 500 steps; numpy-numba-reference).
- **Gate surface (Phase-1):** gate-4 GOLDEN-only (quadratic-B-spline; 4 anchors; no MMS); gate-6 Tier-2 IC-5+IC-6; gate-10 determinism (run_twice_and_diff); gate-11 PBT (2 invariants). R-MPM-1..3 + R15 (mutation pathology → B17 PATH-B lean).
- **Spec § 11.3:** MPM = item **2.3 = "Stack E (Warp port)"**; Stack-D arm NOT enumerated (S-M1; systematic-program extension).

## § 5. Shifts surfaced (plan-drafting)

Entering: **137** (LBM close). New (6):

| Shift | Description | Disposition |
|---|---|---|
| S-M1 | spec § 11.3 item 2.3 = Stack-E-only; Stack-D arm not enumerated (systematic-program extension) | recorded |
| S-M2 | tolerance 1e-4 (looser than LBM 1e-5; same as RD-2D/sph) | recorded |
| S-M3 | D1 full-name `sub-phase-mpm-multimaterial-stack-d` | recorded |
| S-M4 | **D7 FALSIFIED** — no MPM seed-propagation defect at HEAD (SHIFT from dispatch (a)→(b)) | recorded |
| S-M5 | **S6** — single-material neo-Hookean MLS-MPM (simplified-variant; multi-material declared-only) | recorded |
| S-M6 | scope shape — gate-4 golden-only (no MMS); ONE capture; first IC-5+IC-6 Tier-2; atomic-scatter (deferred #3) = cross-stack surface on Stack-D side | recorded |

**Cumulative at plan-drafting close: 143.**

## § 6. Blocking dependencies + drift for operator attention

- **No blocking dependencies.** Stage 0 is dispatchable after D1–D10 routing.
- **Drift surfaced (believed-state corrections — operator attention before Stage 0):**
  1. **D7 premise falsified** (S-M4): the dispatch's coordinator-lean (a) FOLD-IN is predicated on a non-existent MPM seed-propagation defect. Recommended re-route: **close the MPM-side bank as not-a-defect**; NO edit to Phase-1-sealed `packages/mpm-multimaterial/`; NO seal-exception. (The LBM-side stays banked per LBM § 12.)
  2. **"multimaterial" is single-material** (S-M5): the Stack-D port mirrors the single-material neo-Hookean reference; do NOT implement a multi-material constitutive table (out of scope; declared-only).
  3. **spec § 11.3 Stack-D arm absent** (S-M1): MPM→Stack-D is a systematic-program extension (the literal item 2.3 is the Stack-E Warp port, deferred).
  4. **D10 ~1 GiB corpus sizing**: surface the canonical-vs-diagnostic-tier corpus-entry choice; verify CI round-trip (S-CI1).
- **D5 calibration** depends on the Stage-1b atomic-scatter posture (Stage-0 Task 0.3 produces the calibration datum) + Stage-1c gate-14 margin.

## § 7. verify_evidence self-check

`verify_evidence --strict` over this landing audit: both evidence_paths present; the charter + probe are non-LFS `.md` blobs (git-blob sha256). Result appended at commit time; the SHA back-fill sets `head_sha` to this landing's own commit + back-fills the probe's `head_sha`.

## § 8. Next-step recommendation

Operator routes D1–D10 (§ 3), then dispatches Stage 0 per charter § 7.1. Spec-Phase-2 cross-stack ports after MPM: smoke (item 2.4 Stack D+E) + the Stack-C/E variants + the literal MPM Stack-E Warp port (item 2.3).

---

*End of plan-drafting landing. SHA back-fill follows (Convention #12 + N1 enumeration).*
