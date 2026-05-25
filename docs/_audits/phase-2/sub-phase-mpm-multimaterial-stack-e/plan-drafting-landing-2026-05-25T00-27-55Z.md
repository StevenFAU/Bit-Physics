---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: <COMMIT_3_SHA_PENDING>
head_sha_at_checkpoint: 93e29675c3e96a9eeefe4e8e65e0033639490d7c
date: 2026-05-25T00-27-55Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-mpm-multimaterial-stack-e.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/plan-drafting-probe-2026-05-25T00-27-55Z.md
---

# Plan-drafting landing — sub-phase-mpm-multimaterial-stack-e

> SIXTH spec-Phase-2 per-sim cross-stack port; FIRST Stack-E port. Plan-drafting
> (probe + charter) complete. D1–D16 surfaced for operator routing; Stage 0
> dispatchable after routing. Coordinator-side Convention #8 discipline
> exemplified: every dispatch-referenced value treated as "believed-true; verify
> at HEAD." The probe's **Task 1.6 S6-trajectory-simulation** (load-bearing per
> conventions § L.4) is the empirical anchor — it confirmed the canonical is
> **BOUNDED rigid free-fall** and, with the HEAD-verified common-warp f32 surface,
> CORRECTED warp.md § 6's MPM-consumption prediction.

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/plan-drafting-probe-2026-05-25T00-27-55Z.md` | `5862eb899159a67b1934350e28f7bc28e771bd8f` |
| Charter | `docs/phases/sub-phase-mpm-multimaterial-stack-e.md` | `93e29675c3e96a9eeefe4e8e65e0033639490d7c` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-25T00-27-55Z.md` | back-filled below (COMMIT 4) |
| SHA back-fill | `…/sha-back-fill-2026-05-25T00-27-55Z.md` | COMMIT 4 (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no
blocking dependencies. **Hard Rule 2 NOT triggered** (§ 6). One dispatch/doc
premise was corrected at HEAD (warp.md § 6 MPM-consumption prediction) and two
were refined (D6 capture path; D7 override reuse) — believed-state corrections,
not structural wrongness; drafting proceeds with the corrected leans.

## § 2. Task 1.6 S6-trajectory-simulation result (LOAD-BEARING; conventions § L.4)

Executed the Phase-1 `mpm_multimaterial.sim.sim_runner_diagnostic(42, …)` at
HEAD (16³, 5K particles, 50 steps; 0.222 s wall post-JIT) + a fine-cadence
100-step extension (read-only; no source edit; no committed artifact).

- **Max-field-value evolution:** `max|vel|` step-1 `2.000981` → step-100
  `2.098100`; ratio `1.048536`; per-step exponent `4.79e-04 /step`. `max|grid_mom|`
  `0.0373 → 0.0401` (linear). health all-zero; momentum drift = exactly
  `|g|·t·m_total`.
- **Lyapunov estimate:** **≈ 0** (linear free-fall, NOT exponential). step-100
  `max|vel| = 2.098100` EXACTLY matches analytic free-fall `|−2.0 + (−9.81)·t|`
  at `t = 0.0100 s`.
- **Chaotic-regime characterization:** **BOUNDED** (rigid free-fall; the blob
  never reaches the floor → `F=I` → zero neo-Hookean stress; single-material).
  The inverse of smoke's positive-Lyapunov first instance.

This re-confirms the methodology § 5.1/§ 5.3 characterization on a second
occasion. gate-14 predicted `within_tolerance=True` (no chaotic-regime
escape-hatch).

## § 3. Believed-state reconciliation — verdicts on each dispatch SECTION 1 item

| Item | Verdict | HEAD evidence |
|---|---|---|
| **Repo anchors** | **CONFIRMED** | HEAD `0fa284d`; conventions `49c90fc2…`; methodology `61350ee4…`; architecture `e82b7b8e…`; 20 workspace members; replay `9399fc33…` HELD; integrity `c19492ad…` baseline; cumulative 176 (= `common-warp` landing `165 → 176`). |
| **ITEM 1 — S6-simulation** | **APPLIED — BOUNDED** | Task 1.6 (§ 2). Non-chaotic rigid free-fall; Lyapunov ≈ 0. |
| **ITEM 2 — atomic-scatter** | **PRESENT-but-NOT-EXERCISED** | Same canonical as Stack-D (§ 5.1); doubly-disarmed under Warp CPU serial launch (D5). |
| **ITEM 3 — common-warp consumption** | **RESOLVED — warp.md § 6 corrected** | Runtime + Capture + Determinism substantive; Particles/Grids (f32-pinned) + HashGrid (fixed 27-cell stencil) NOT structural (probe § 3). |
| **ITEM 4 — IC-15 aspects** | **#1 N/A; #3 present-but-not-exercised; #5 N/A** | Task 1.6 BOUNDED; explicit single-pass MLS-MPM; same aspects as Stack-D. |
| **ITEM 5 — banked sweep** | **CLEAN — no surprises** | probe § 4; all STAY-BANKED (LFS D13, mypy warp-stub, N1, etc.). |
| **ITEM 6 — Stack-D template** | **CONFIRMED** | Same sim source + canonical + gate-14 LEFT; different stack (Warp) + consumption (common-warp). |

## § 4. Closing-commit anchor re-check (Convention M)

(FACT — re-verified at HEAD `93e29675` after the charter commit; every probe +
charter citation re-resolved.)

| Anchor | Re-check result |
|---|---|
| `docs/conventions/sub-phase-conventions.md` sha256 | `49c90fc2…0dbe0d74` — **unchanged** |
| `docs/conventions/cross-stack-equivalence-methodology.md` sha256 | `61350ee4…6d1da87` — **unchanged** |
| `docs/architecture.md` sha256 | `e82b7b8e…9292d267` — **unchanged** |
| `tools/testkit/equivalence/harness.py:93` + `tools/testkit/equivalence/harness.py:104` + `tools/testkit/equivalence/harness.py:118` | resolve to LEFT-manifest docstring / category-mismatch check / `_resolve_tolerance` call — **exist** |
| `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` | tracked (LFS) — **present** |
| `init` / `assert_deterministic_run` socket signatures | `init(device: str \| None = None, deterministic: bool = False)`; `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)` — **verbatim** |
| `[overrides.mpm-multimaterial]` | present (count 1) — **reuse-able; no new row** |

All anchors resolve. **Closing-anchor re-check CLEAN.**

## § 5. Plan-drafting shifts surfaced (S-ME*)

| Shift | Description |
|---|---|
| **S-ME1** | **common-warp consumption correction.** warp.md § 6 predicted MPM "consumes the most of the surface — Particles, HashGrid, ScalarField3D." HEAD-verification (Phase-1 fixed-stencil + f64; common-warp f32-pinned Particles/Grids) → Stack-E consumes Runtime + Capture + Determinism only. (D10/D16) |
| **S-ME2** | **tolerance-override REUSE.** Dispatch D7 leaned "existing `mpm` category OR extend to `mpm-e`." HEAD: `[overrides.mpm-multimaterial]` already exists + `compare_captures` keys on the LEFT/reference `sim.name` → **no new row**. FIRST cross-stack port to skip the Stage-1c override edit. (D7) |
| **S-ME3** | **gate-14 LEFT-partner capture path.** The reference capture artifact is `captures/mpm-ref/` (the `-ref` suffix convention), not `captures/mpm-multimaterial/` (the dispatch's source-package framing). (D6) |
| **S-ME4** | **R-MPME-F64 precision posture surfaced.** common-warp Particles/Grids are f32-pinned; MPM cross-stack reference + determinism contract are f64 → the port uses its own `wp.array(dtype=wp.float64)` (warp.md § 6 LBM-precedent). New decision D15. |
| **S-ME5** | **D5 atomic-scatter Warp analog resolved at plan-drafting.** Dispatch framed D5 as "design-time assessment; Stage 0 empirically verifies." The empirical verification ALREADY EXISTS (`common-warp` Stage-0: 6/6 bit-identical incl. `wp.atomic_add`); Warp CPU serial launch is structural (no `cpu_max_num_threads=1` knob). Stage-0 R-A1 re-verifies only the MPM-specific P2G kernel. |

**Cumulative shifts:** entering **176** → this plan-drafting **5** (S-ME1..S-ME5)
→ **181**.

## § 6. Hard Rule 2 + blocking-dependency assessment

| Hard Rule 2 condition | Assessment |
|---|---|
| HEAD drifted load-bearingly since `0fa284d` | **NO** — HEAD `0fa284d` at probe anchor; clean tree. |
| Phase-1 MPM canonical trajectory fails to bound / unexpected behavior | **NO** — Task 1.6 BOUNDED rigid free-fall; well-understood. |
| common-warp socket signatures differ from § 1.9.1 verbatim | **NO** — verified verbatim at HEAD (§ 4). |
| Warp 1.13.0 CPU determinism cannot be achieved for MPM atomic-scatter | **NO** — `common-warp` Stage-0 6/6 bit-identical (incl. `wp.atomic_add`); Warp docs corroborate CPU serial execution. |

**Hard Rule 2 NOT triggered.** No blocking dependencies. The warp.md § 6
prediction correction (S-ME1) + the R-MPME-F64 surface (S-ME4) are
design-shaping findings routed via D15/D16, not blockers.

## § 7. D-class routing summary (D1–D16)

All sixteen surfaced in probe § 9 / charter § 9 with leans; NONE pre-committed.
Operator routes. Highlights: D3 BOUNDED; D5 N/A (no knob); D7 reuse override (no
new row); D10 Runtime+Capture+Determinism only; D15 own f64 `wp.array`s
(recommended); D16 warp.md § 6 correction noted (no edit at plan-drafting).

## § 8. Boundary + verify-self-check

- **Boundary (dispatch SECTION 7) honored:** no sim source, common-warp,
  workflow, conventions, methodology, or `dependencies.md` edits. Task 1.6 was
  READ-ONLY execution of the existing Phase-1 surface (no committed artifact).
- **evidence_paths** (front-matter) are existence-checks (charter + probe) — no
  committed-blob hashes recorded here, deliberately, to avoid back-fill-induced
  sha-drift (audit-chain-correctness § 9 N2). The stable doc anchors are hashed
  in the probe (conventions `49c90fc2…`, methodology `61350ee4…`, architecture
  `e82b7b8e…`) and are unaffected by back-fill.
- **SHA placeholders:** this landing's `head_sha` is `<COMMIT_3_SHA_PENDING>`,
  back-filled to its own committing-commit SHA in COMMIT 4 (Convention #12;
  separate commit; never `--amend`; N1 enumeration). The probe's `head_sha`
  (`<COMMIT_1_SHA_PENDING>`) is back-filled to `5862eb89`.

## § 9. Next step

Operator reviews plan-drafting close, routes D1–D16, dispatches Stage 0
(Pre-flight) separately. Stage 0 first task: Convention-M anchor re-check at the
then-HEAD, then the common-warp socket consumption probe + the MPM P2G-kernel
Warp-CPU determinism re-verify (R-A1).

---

*End of plan-drafting landing. Verdict: plan-drafting-CONFIRMED. Cumulative
176 → 181 (5 shifts). No `-phase-N` tag. Local-only per D13.*
