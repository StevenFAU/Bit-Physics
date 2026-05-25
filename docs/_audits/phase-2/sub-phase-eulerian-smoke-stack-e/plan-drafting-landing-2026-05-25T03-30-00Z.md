---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: <COMMIT_3_SHA_PENDING>
head_sha_at_checkpoint: 879be47551dbfd8801a0ccfefc592bf6dcc9d60f
date: 2026-05-25T03-30-00Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-eulerian-smoke-stack-e.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/plan-drafting-probe-2026-05-25T03-30-00Z.md
---

# Plan-drafting landing — sub-phase-eulerian-smoke-stack-e

> SEVENTH spec-Phase-2 per-sim cross-stack port; SECOND Stack-E port; SECOND
> `eulerian-smoke` port. Plan-drafting (probe + charter) complete. D1–D17 surfaced
> for operator routing; Stage 0 dispatchable after routing. Coordinator-side
> Convention #8 discipline exemplified: every dispatch-referenced value treated as
> "believed-true; verify at HEAD." The probe's **Task 1.6 S6-trajectory-simulation**
> (load-bearing per conventions § L.4) is the empirical anchor — it **CONFIRMED both
> canonical trajectories are CHAOTIC (positive-Lyapunov)** at canonical resolution
> on the Stack-E premise, reproducing the smoke-Stack-D regime and predicting the
> **R-P2 chaotic-regime escape-hatch (`within_tolerance=False`) — the FIRST R-P2
> instance on Stack-E, the SECOND overall (stack-portable Taichi → Warp)**.

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/plan-drafting-probe-2026-05-25T03-30-00Z.md` | `1ec2eae113165522de0a7155b61f4f82a98d2255` |
| Charter | `docs/phases/sub-phase-eulerian-smoke-stack-e.md` | `879be47551dbfd8801a0ccfefc592bf6dcc9d60f` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-25T03-30-00Z.md` | back-filled below (COMMIT 4) |
| SHA back-fill | `…/sha-back-fill-2026-05-25T03-30-00Z.md` | COMMIT 4 (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no blocking
dependencies. **Hard Rule 2 NOT triggered** (§ 6). Two dispatch/doc premises were
refined at HEAD (warp.md § 6 line-207 smoke-consumption prediction → socket-only;
the tolerance override is reuse, not new) — believed-state refinements, not structural
wrongness; drafting proceeds with the refined leans. The S6 verdict is **CHAOTIC**
(the dispatch's stated expectation, empirically CONFIRMED — not assumed).

## § 2. Task 1.6 S6-trajectory-simulation result (LOAD-BEARING; conventions § L.4)

Executed the Phase-1 `eulerian_smoke` canonical trajectory at HEAD
(`compute_canonical_trajectory_3d` 3D + a direct `stable_fluids_step` /
`semi_lagrangian_advect_2d` loop 2D; read-only; no source edit; no committed
artifact).

- **3D Taylor-Green (n=128 canonical):** `max|u|` step-0 `0.999` → step-10 `0.937`
  → step-20 `1.64e2` → step-50 `1.34e8` → step-60 `1.08e10`. Field-amplification rate
  `ln(1.34e8/0.999)/50 ≈ 0.374/step` — matches the smoke-Stack-D landing's
  `≈ 0.36/step` (step-50 `1.34e8` is the same order as the landing's `8.1e7`;
  → `5.1e19 @ step 250` per the landing).
- **3D Taylor-Green (n=64 derisk):** `max|u|` `0.996 → 0.597 @ step 60` — monotone
  DECAY (laminar). The instability is **resolution-dependent** (R-SME9; the
  under-resolved fixed-20-sweep Jacobi leaves a far larger divergence residual at
  128³).
- **2D lid-driven-cavity (n=128 canonical):** `max|u|` `0.990 → 0.977 (step 1) →
  7.21 (step 2) → 1.23e4 (step 3) → 1.64e3 (step 5)` — Kelvin-Helmholtz blow-up;
  `~1.64e3 @ step 5` EXACTLY matches the smoke-Stack-D landing's "`~1.6e3` by step 5."
- **Chaotic-regime characterization:** **CHAOTIC (positive-Lyapunov), both canonicals**
  at canonical resolution. The SEALED Phase-1 reference itself blows up → cross-stack
  content-equivalence is physically impossible. The inverse of MPM Stack-E (BOUNDED).

This re-confirms the methodology § 6 / conventions § L.4 chaotic-regime characterization
on the Stack-E premise. gate-14 predicted `within_tolerance=False` (R-P2 escape-hatch,
O-1 verdict shape (c)).

## § 3. Believed-state reconciliation — verdicts on each dispatch item

| Item | Verdict | HEAD evidence |
|---|---|---|
| **Repo anchors** | **CONFIRMED** | HEAD `d4e52f9`; conventions `1937a7cf…`; methodology `a154d10c…`; architecture `e82b7b8e…`; 21 workspace members; replay `9399fc33…` HELD (47th); integrity `c19492ad…` baseline (10 sub-phases); cumulative 193. (conventions/methodology sha differ from the MPM-E *probe* values — the MPM-E *landing* amended both additively; expected carry-forward.) |
| **(a) S6-simulation** | **APPLIED — CHAOTIC** | Task 1.6 (§ 2). Positive-Lyapunov both canonicals at canonical resolution; resolution-dependent (R-SME9). |
| **(b) Predicted gate-14 verdict** | **R-P2 escape-hatch; within_tolerance=False (shape (c))** | Field instability CONFIRMED at HEAD; step-1 port-faithfulness predicted `~1e-16` (f64-algorithm-parity; a Stage-1 measurement). FIRST R-P2 on Stack-E / SECOND overall (stack-portable). |
| **(c) common-warp consumption** | **RESOLVED — socket-only (warp.md § 6.1 confirmed)** | Runtime + Capture + Determinism substantive; Particles (no particles) / Grids (f32-pinned; smoke f64) / HashGrid (no neighbor-search) NOT structural. SECOND f64 socket-only consumer; first where the f32 Grids surface structurally fits yet is f64-blocked. line-207 prediction refined. |
| **(d) Tolerance reuse** | **CONFIRMED — no new row** | `[overrides.eulerian-smoke] category="smoke"` present (count 1; smoke-Stack-D Stage 1); `compare_captures` keys on LEFT/reference `sim.name`. SECOND port to skip the Stage-1c override edit. |
| **Banked sweep** | **CLEAN — no surprises** | probe § 4; all STAY-BANKED (LFS D13, mypy warp-stub, N1, S0-1, manifest-equality, Phase-1-canonical question). |
| **Inherited methodology (§ L.4–L.7)** | **ALL FOUR APPLY** | § L.4 chaotic-regime (APPLIED); § L.5 S1a-2/S1b-3/S1c-1; § L.6 O-W6/O-W7 (names Smoke Stack-E); § L.7 O-1 (shape (c)) + O-2 (four-checkpoint chain). |

## § 4. Closing-commit anchor re-check (Convention M)

(FACT — re-verified at HEAD `879be475` after the charter commit; every probe +
charter citation re-resolved.)

| Anchor | Re-check result |
|---|---|
| `docs/conventions/sub-phase-conventions.md` sha256 | `1937a7cf…b269d031` — **unchanged** |
| `docs/conventions/cross-stack-equivalence-methodology.md` sha256 | `a154d10c…b1d76421` — **unchanged** |
| `docs/architecture.md` sha256 | `e82b7b8e…9292d267` — **unchanged** |
| `tools/testkit/equivalence/harness.py` (`compare_captures` + `_resolve_tolerance`) | resolve to LEFT-manifest tolerance resolution / category-mismatch check — **exist** |
| `captures/eulerian-smoke-ref/{taylor-green-128cube-…, lid-driven-cavity-128sq-…}.{h5,json}` | tracked (LFS) — **present** (TWO descriptors) |
| `init` / `assert_deterministic_run` / `write_capture` socket signatures | `init(device: str \| None = None, deterministic: bool = False)`; `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)`; `write_capture` dtype-preserving — **verbatim** |
| `[overrides.eulerian-smoke]` | present (count 1) — **reuse-able; no new row** |

All anchors resolve. **Closing-anchor re-check CLEAN.**

## § 5. Plan-drafting shifts surfaced (S-SME*)

| Shift | Description |
|---|---|
| **S-SME1** | **S6 — CHAOTIC CONFIRMED on the Stack-E premise.** Task 1.6 re-characterized both canonicals as positive-Lyapunov at canonical resolution (3D `0.999 → 1.34e8 @ step 50`; 2D KH `0.99 → 1.64e3 @ step 5`), reproducing the smoke-Stack-D regime. gate-14 = R-P2 escape-hatch (`within_tolerance=False`); FIRST R-P2 on Stack-E / SECOND overall (stack-portable Taichi → Warp). (D3/D5) |
| **S-SME2** | **common-warp consumption socket-only.** Smoke is f64 → Runtime + Capture + Determinism + own f64 `wp.array`s; the f32 Grids surface (smoke's natural structural fit) is f64-blocked. CONFIRMS warp.md § 6.1 (SECOND f64 instance; line-207 prediction refined). (D7/D15) |
| **S-SME3** | **Tolerance-override REUSE.** `[overrides.eulerian-smoke]` already exists (smoke-Stack-D); `compare_captures` keys on LEFT/reference `sim.name` → no new row. SECOND cross-stack port to skip the Stage-1c override edit (MPM Stack-E first). (D6) |
| **S-SME4** | **R-SME2 f64 posture + O-W7.** Own `wp.array(dtype=wp.float64)`; pure-literal `wp.float64(1.0)/wp.float64(6.0)` for the 3D Jacobi normaliser (the EXACT constant that leaked `~1e-9` in Taichi; Warp also infers f32). f32 would change the chaotic trajectory itself. (D8) |
| **S-SME5** | **gate-14 STOP-discipline INVERTED.** `within_tolerance=False` is EXPECTED (R-P2), NOT a STOP; STOP on a step-1 port-faithfulness failure. gate-14 planned as a divergence-rate witness from the start — improvement over smoke-Stack-D's surprise Stage-1 STOP. (D10) |
| **S-SME6** | **R-SME9 resolution-dependent false-laminar trap (NEW).** 64³ derisk DECAYS; 128³ canonical BLOWS UP → the § L.4 trajectory-simulation probe must run at (or near) canonical resolution (a second false-laminar trap beyond the code-read trap). Candidate § L.4 refinement. (D16) |

**Cumulative shifts:** entering **193** → this plan-drafting **6** (S-SME1..S-SME6)
→ **199**.

## § 6. Hard Rule 2 + blocking-dependency assessment

| Hard Rule 2 condition | Assessment |
|---|---|
| HEAD drifted load-bearingly since `d4e52f9` | **NO** — HEAD `d4e52f9` at probe anchor; clean tree (only expected untracked). |
| Phase-1 smoke canonical trajectory unexpected behaviour | **NO** — Task 1.6 CHAOTIC, which is EXPECTED (smoke-Stack-D established it); gate-14 planned as a divergence-rate witness. Chaos is the documented physical regime, not a blocker. |
| common-warp socket signatures differ from § 1.9.1 verbatim | **NO** — verified verbatim at HEAD (§ 4). |
| Warp 1.13.0 CPU determinism cannot be achieved | **NO** — MPM Stack-E established the O-2 four-checkpoint chain (CPU `bit-exact-same-hw`); smoke has no atomic-scatter (even simpler); within-stack determinism is bit-exact even for chaos. |

**Hard Rule 2 NOT triggered.** No blocking dependencies. The CHAOTIC S6 verdict
(S-SME1) is the planned regime (gate-14 = divergence-rate witness; R-P2 escape-hatch),
NOT a blocker; the warp.md § 6 line-207 refinement (S-SME2) + R-SME9 resolution-
dependence (S-SME6) are design-shaping findings routed via D5/D15/D16.

## § 7. D-class routing summary (D1–D17)

All seventeen surfaced in probe § 9 / charter § 9 with leans; NONE pre-committed.
Operator routes. Highlights: D3 CHAOTIC; D5 (most consequential) methodology § 6
R-P2 SECOND-INSTANCE refinement (stack-portable) + equivalence.md Stack-E section +
R-SME9 § L.4 candidate; D6 reuse override (no new row); D7 socket-only consumption;
D8 own f64 `wp.array`s (recommended); D10 gate-14 divergence-rate witness (STOP only
on step-1-faithfulness failure); D14 3D 738 MB capture held local; D15 warp.md § 6
line-207 refinement noted (no edit at plan-drafting).

## § 8. Boundary + verify-self-check

- **Boundary honored:** no sim source, common-warp, workflow, conventions, methodology,
  `tolerance.toml`, `equivalence.md`, or `dependencies.md` edits. Task 1.6 was READ-ONLY
  execution of the existing Phase-1 surface (no committed artifact).
- **evidence_paths** (front-matter) are existence-checks (charter + probe) — no
  committed-blob hashes recorded here, deliberately, to avoid back-fill-induced
  sha-drift (audit-chain-correctness § 9 N2). The stable doc anchors are hashed in the
  probe (conventions `1937a7cf…`, methodology `a154d10c…`, architecture `e82b7b8e…`)
  and are unaffected by back-fill (those docs were untouched by this chain).
- **SHA back-fill (Convention #12):** this landing's `head_sha` was placeholder-deferred
  (`<COMMIT_3_SHA_PENDING>`) and is back-filled to its own committing-commit SHA
  (COMMIT 3) in COMMIT 4 (separate commit; never `--amend`; N1 enumeration). The probe's
  `head_sha` (placeholder `<COMMIT_1_SHA_PENDING>`) is back-filled to its committing
  commit `1ec2eae113165522de0a7155b61f4f82a98d2255` (COMMIT 1). The charter
  (`docs/phases/`) carries no `head_sha` front-matter (it is a plan, not an audit) —
  recorded for the chain at `879be47551dbfd8801a0ccfefc592bf6dcc9d60f` (COMMIT 2); no
  back-fill. See the SHA back-fill ledger for the full enumeration.

## § 9. Next step

Operator reviews plan-drafting close, routes D1–D17, dispatches Stage 0 (Pre-flight)
separately. Stage 0 first task: Convention-M anchor re-check at the then-HEAD, then
the common-warp socket consumption probe + the Warp-CPU determinism R-A1 anchor
(O-2 chain checkpoint 1; a Jacobi-projection or SL-backtrace `@wp.kernel`), then the
f64-storage + `wp.float64()` pure-literal-seed audit (the 3D Jacobi `1.0/6.0`).

---

*End of plan-drafting landing. Verdict: plan-drafting-CONFIRMED. Cumulative
193 → 199 (6 shifts). gate-14 planned as a chaotic-regime divergence-rate witness
(R-P2; `within_tolerance=False` expected). No `-phase-N` tag. Local-only per D13.*
