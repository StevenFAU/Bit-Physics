---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: cd74bcde27b94d3a89fd96a4a7ff42f2fe9dca28
head_sha_at_checkpoint: 80753c4dc4985996d65b64ec03f38198e6f4fc87
date: 2026-05-25T15-30-00Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-e.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/plan-drafting-probe-2026-05-25T15-30-00Z.md
---

# Plan-drafting landing — sub-phase-lattice-boltzmann-d3q19-stack-e

> EIGHTH spec-Phase-2 per-sim cross-stack port; THIRD Stack-E port; SECOND
> `lattice-boltzmann-d3q19` port. Plan-drafting (probe + charter) complete. D1–D17
> surfaced for operator routing; Stage 0 dispatchable after routing. Coordinator-side
> Convention #8 discipline exemplified: every dispatch-referenced value treated as
> "believed-true; verify at HEAD." The probe's **Task 1.6** is the empirical anchor —
> Part A (S6-trajectory, conventions § L.4) **CONFIRMED both canonical trajectories
> LAMINAR / bounded / dissipative** at canonical resolution; Part B (step-1
> cross-stack seed-difference, § L.8 / methodology § 6.1 (ii)) **MEASURED the step-1
> seed-difference = EXACTLY `0.0`** against a faithful scratch Warp f64 port. Predicted
> gate-14: **cross-stack BIT-EXACT (`within_tolerance=True`, `max_abs_err=0.0`) — the
> THIRD shape-(a) instance, the FIRST on a LAMINAR trajectory.** The smoke-Stack-E
> "predict-from-regime" anti-pattern is explicitly avoided (the verdict is MEASURED,
> not assumed).

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/plan-drafting-probe-2026-05-25T15-30-00Z.md` | COMMIT 1 = `68bddc2fa29019fba5dbead5957d7241dbcce005` (`head_sha` back-filled in COMMIT 4) |
| Charter | `docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-e.md` | COMMIT 2 = `80753c4dc4985996d65b64ec03f38198e6f4fc87` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-25T15-30-00Z.md` | COMMIT 3 = `cd74bcde27b94d3a89fd96a4a7ff42f2fe9dca28` (`head_sha` back-filled in COMMIT 4) |
| SHA back-fill | `…/sha-back-fill-2026-05-25T15-30-00Z.md` | COMMIT 4 (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no blocking
dependencies. **Hard Rule 2 NOT triggered** (§ 6). Two dispatch/doc premises were
refined at HEAD (warp.md § 6 line-208 LBM-row dtype prediction → f64, not f32; the
tolerance override is reuse, not new) — believed-state refinements, not structural
wrongness; drafting proceeds with the refined leans. The S6 verdict is **LAMINAR** and
the step-1 cross-stack seed-difference is **MEASURED `0.0`** (the gate-14 verdict shape
(a) is empirically grounded, not predicted-from-regime).

## § 2. Task 1.6 result (LOAD-BEARING; conventions § L.4 + § L.8 / methodology § 6.1)

Executed the Phase-1 `lattice_boltzmann_d3q19` surface at HEAD (read-only) + a faithful
scratch Warp 1.13.0 f64 CPU experiment (no source edit; no committed artifact; scratch
held outside the repo tree).

**Part A — S6-trajectory (canonical resolution; R-SME9 discipline):**
- **Poiseuille (64×32×3, τ=0.7, force_x=1e-5):** `max|u_lat|` step-0 `5.00e-6` → step-50
  `5.05e-4` → step-100 `1.00e-3` → step-1000 `8.65e-3`. Monotone, smoothly saturating;
  `Ma = 0.015 ≪ 0.1`. **Bounded, NOT exponential.**
- **Couette (32×16×3, τ=0.7, wall_v=0.05):** `max|u_lat|` → exactly `0.05` by step ~50,
  **bit-stable** through step 500 (`step500/step100 = 1.000000`); `Ma = 0.087 < 0.1`.
  **Converged steady linear shear.**
- **Verdict:** **LAMINAR / bounded / dissipative, both canonicals** (BGK `τ=0.7` damps).
  The analog of MPM Stack-E (BOUNDED); the inverse of smoke Stack-E (CHAOTIC).
  Reproduces the LBM-Stack-D regime. § 6.1 condition (i) FAILS → shape (c) ruled out.

**Part B — step-1 cross-stack seed-difference (faithful Warp f64 vs NumPy) — MEASURED:**
- NumPy-internal: `f.sum(axis=0)` (19) == sequential 19-add (`0.0`); `einsum` ==
  sequential (`0.0`) — NumPy's 19-element reductions are lex-sequential.
- Warp f64 component kernels vs NumPy: density `0.0`; momentum `0.0`; feq polynomial
  `0.0`; full BGK collision `0.0` (developed-flow state).
- LITERAL canonical step-1 (full faithful Warp step — collision + Guo + streaming +
  bounce-back incl. moving-wall injection): Poiseuille step 0→1 `0.0`; Couette step 0→1
  `0.0`; developed-state step `0.0`.
- **Verdict:** step-1 cross-stack seed-difference = **EXACTLY `0.0`** — a faithful Warp
  f64 CPU port (preserving the lex-sequential operation order; no FMA-contraction
  divergence) reproduces the sealed NumPy reference byte-for-byte. § 6.1 condition (ii)
  FAILS. **Predicted gate-14: shape (a) cross-stack BIT-EXACT** (`within_tolerance=True`,
  `max_abs_err=0.0`). The smoke-Stack-E phenomenon (Warp f64 == NumPy bit-for-bit),
  reproduced for LBM; the contrast to LBM-Stack-D Taichi (shape (b) `~6e-15`) confirms
  § 6.7 (the seed-difference is a backend-pair property, not the sim's) WITHIN a single
  laminar sim.

## § 3. Believed-state reconciliation — verdicts on each dispatch item

| Item | Verdict | HEAD evidence |
|---|---|---|
| **Repo anchors** | **CONFIRMED** | HEAD `c5806f3`; conventions `7713828f…`; methodology `f9c6a3cf…`; architecture `e82b7b8e…`; warp.md `eff17d30…`; 22 workspace members (LBM-E = 23rd); replay `9399fc33…` HELD; integrity `c19492ad…` baseline; cumulative 209. (conventions/methodology sha differ from the smoke-E *probe* values — the smoke-E *landing* amended both additively [§ L.8 / § 6.7]; expected carry-forward.) |
| **(a) S6-simulation** | **APPLIED — LAMINAR** | Task 1.6 Part A (§ 2). Bounded/dissipative both canonicals at canonical resolution; `Ma < 0.1`. |
| **(b) step-1 seed-difference + gate-14 verdict** | **MEASURED `0.0`; shape (a) BIT-EXACT** | Task 1.6 Part B (§ 2). Faithful Warp f64 full step == NumPy byte-for-byte (both canonical ICs + developed state + all components). THIRD shape-(a) instance; FIRST on a laminar trajectory. |
| **(c) common-warp consumption** | **RESOLVED — socket-only + own f64 `ndim=4` (warp.md § 6.1/§6.2 confirmed)** | Runtime + Capture + Determinism substantive; Particles (no particles) / Grids (f32-pinned + 19-component does not fit `ScalarField3D`) / HashGrid (no neighbor-search) NOT structural. THIRD f64 socket-only consumer. line-208 LBM-row dtype refined f32→f64. |
| **(d) Tolerance reuse** | **CONFIRMED — no new row** | `[overrides.lattice-boltzmann-d3q19] category="lbm"` present; `[defaults.lbm] relative=1e-5`; `compare_captures` keys on LEFT/reference `sim.name`. THIRD port to skip the Stage-1c override edit. |
| **Banked sweep** | **CLEAN — no surprises** | probe § 4; all STAY-BANKED (LFS D13, mypy warp-stub, N1, S0-1, manifest-equality, cross-cutting CHANGELOG/title cleanup, smoke D17). |
| **Inherited amendment sets (§ L.4–L.8)** | **ALL APPLY** | § L.4 S6 (APPLIED — laminar); § L.5 S1a-2/S1b-3/S1c-1; § L.6 O-W6/O-W7 (+ § L.8 fresh-var narrowing); § L.7 O-1 (shape (a)) + O-2 (four-checkpoint chain, ckpt 2/3 at Stage 1b); § L.8 "measure step-1" (APPLIED — Part B). |

## § 4. Closing-commit anchor re-check (Convention M)

(FACT — re-verified at HEAD after the charter commit; every probe + charter citation
re-resolved.)

| Anchor | Re-check result |
|---|---|
| `docs/conventions/sub-phase-conventions.md` sha256 | `7713828f…2b7d3164` — **unchanged** |
| `docs/conventions/cross-stack-equivalence-methodology.md` sha256 | `f9c6a3cf…ee8b808f` — **unchanged** |
| `docs/architecture.md` sha256 | `e82b7b8e…9292d267` — **unchanged** |
| `docs/common/warp.md` sha256 | `eff17d30…e000b75da` — **unchanged** (carries the line-208 LBM prediction; D15) |
| `tools/testkit/equivalence/harness.py` (`compare_captures` + `_resolve_tolerance`) | `_resolve_tolerance(table, sim_name, sim_category)` keys on LEFT `sim_name` — **exist** |
| `captures/lbm-ref/{poiseuille-64x32-…, couette-32x16-…}.{h5,json}` | tracked (LFS) — **present** (TWO descriptors; 202.35 MB + 27.41 MB; both ≤256 MiB) |
| `init` / `assert_deterministic_run` / `write_capture` socket signatures | `init(device: str \| None = None, deterministic: bool = False)`; `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)`; `write_capture` dtype-preserving — **verbatim** |
| `[overrides.lattice-boltzmann-d3q19]` / `[defaults.lbm]` | present (`category="lbm"`; `relative=1e-5, absolute=0.0`) — **reuse-able; no new row** |

All anchors resolve. **Closing-anchor re-check CLEAN.**

## § 5. Plan-drafting shifts surfaced (S-LBME*)

| Shift | Description |
|---|---|
| **S-LBME1** | **S6 — LAMINAR / bounded CONFIRMED (canonical resolution).** Poiseuille `5e-6 → 8.65e-3 @ step 1000` (`Ma=0.015`); Couette → exactly `0.05 @ step 50`, bit-stable (`Ma=0.087`). The inverse of smoke; reproduces LBM-Stack-D. § 6.1 (i) fails → shape (c) ruled out. (D3) |
| **S-LBME2** | **step-1 cross-stack seed-difference = EXACTLY `0.0`, MEASURED** (faithful Warp f64 full step vs NumPy; both canonical ICs + developed state + all components). gate-14 = shape (a) cross-stack BIT-EXACT predicted — THIRD shape-(a) instance, FIRST on a laminar trajectory. The load-bearing measurement (the smoke-E predict-from-regime anti-pattern avoided per § L.8). (D5/D10) |
| **S-LBME3** | **common-warp consumption socket-only + own f64 `ndim=4` array; warp.md § 6 line-208 LBM-row dtype REFINED f32→f64.** CONFIRMS the § 6.1/§ 6.2 f64-principle (3rd instance). (D7/D15) |
| **S-LBME4** | **Tolerance-override REUSE.** `[overrides.lattice-boltzmann-d3q19] category="lbm"` already exists (LBM-Stack-D); `compare_captures` keys on LEFT/reference `sim.name` → no new row. THIRD port to skip the Stage-1c override edit. (D6) |
| **S-LBME5** | **Capture LEFT-partners at `captures/lbm-ref/` (abbreviated path); both ≤256 MiB → both RIGHT captures LFS-committable, NO held-local artifact** (the contrast to smoke's 738 MB 3D). Couette 27 MB = schema-corpus representative-subset. (D4/D14) |
| **S-LBME6** | **Within-sim cross-backend verdict-shape split** — LBM-Stack-D (Taichi) shape (b) `~6e-15` vs LBM-Stack-E (Warp) shape (a) `0.0`; same laminar sim, different backend-pair arithmetic → corroborates § 6.7 WITHIN a single sim. Candidate methodology observation (Warp CPU f64 bit-faithful to NumPy; `n=2`). (D5) |
| **S-LBME7** | **gate-4 DUAL-ARM (golden 4a + MMS 4b) inherited** — Stack-E reproduces both (golden `abs=1e-15` bit-exact-achievable; MMS OOA ±0.5 of `p=2`). NEW vs smoke (MMS-only). (D17) |

**Cumulative shifts:** entering **209** → this plan-drafting **7** (S-LBME1..S-LBME7)
→ **216**.

## § 6. Hard Rule 2 + blocking-dependency assessment

| Hard Rule 2 condition | Assessment |
|---|---|
| HEAD drifted load-bearingly since `c5806f3` | **NO** — HEAD `c5806f3` at probe anchor; clean tree (only expected untracked `.claude/` + smoke held-local captures). |
| Phase-1 LBM canonical trajectory unexpected behaviour | **NO** — Task 1.6 Part A LAMINAR, which is EXPECTED (LBM-Stack-D established it; LBM canonicals are well-behaved stable physics). |
| common-warp socket signatures differ from § 1.9.1 verbatim | **NO** — verified verbatim at HEAD (§ 4). |
| Warp 1.13.0 CPU determinism cannot be achieved | **NO** — MPM-E + smoke-E established the O-2 four-checkpoint chain (CPU `bit-exact-same-hw`); LBM has no atomic-scatter (even simpler); step-1 seed-difference MEASURED `0.0`. |
| step-1 port-faithfulness failure (the LBM STOP surface) | **NO** — step-1 seed-difference MEASURED `0.0` against a faithful Warp port; the STOP surface is structurally inert. |

**Hard Rule 2 NOT triggered.** No blocking dependencies. The LAMINAR S6 verdict
(S-LBME1) + the MEASURED `0.0` step-1 seed-difference (S-LBME2) make the gate-14
shape-(a) prediction empirically grounded (no surprise risk in either direction — the
inverse of smoke-Stack-D's surprise STOP and smoke-Stack-E's falsified prediction). The
warp.md § 6 line-208 dtype refinement (S-LBME3) is a design-shaping finding routed via
D7/D15.

## § 7. D-class routing summary (D1–D17)

All seventeen surfaced in probe § 9 / charter § 9 with leans; NONE pre-committed.
Operator routes. Highlights: D3 LAMINAR; D5 (most consequential) methodology § 6.7
within-sim cross-backend corroboration + aspect-#4 second data point + equivalence.md
Stack-E bit-exactness witness + candidate "Warp CPU f64 bit-faithful to NumPy"
observation; D6 reuse override (no new row); D7 socket-only + own f64 `ndim=4`; D8 own
f64 `wp.array(dtype=wp.float64, ndim=4)` (recommended); D10 gate-14 bit-exactness
witness (STOP only on step-1-faithfulness failure; inert); D14 both captures
LFS-committable (no held-local); D15 warp.md § 6 line-208 LBM-row dtype f32→f64 refined
(no edit at plan-drafting); D17 gate-4 dual-arm (NEW vs smoke).

## § 8. Boundary + verify-self-check

- **Boundary honored:** no sim source, common-warp, workflow, conventions, methodology,
  `tolerance.toml`, `equivalence.md`, or `dependencies.md` edits. Task 1.6 was READ-ONLY
  execution of the existing Phase-1 surface + a scratch Warp f64 experiment held outside
  the repo tree (no committed artifact).
- **evidence_paths** (front-matter) are existence-checks (charter + probe) — no
  committed-blob hashes recorded here, deliberately, to avoid back-fill-induced
  sha-drift (audit-chain-correctness § 9 N2). The stable doc anchors are hashed in the
  probe (conventions `7713828f…`, methodology `f9c6a3cf…`, architecture `e82b7b8e…`,
  warp.md `eff17d30…`) and are unaffected by back-fill (those docs were untouched by
  this chain).
- **SHA back-fill (Convention #12):** this landing's `head_sha` is placeholder-deferred
  and is back-filled to its own committing-commit SHA `cd74bcde27b94d3a89fd96a4a7ff42f2fe9dca28`
  (COMMIT 3) in COMMIT 4 (separate commit; never `--amend`; N1 enumeration). The probe's
  `head_sha` is back-filled to its committing commit `68bddc2fa29019fba5dbead5957d7241dbcce005`
  (COMMIT 1). The charter (`docs/phases/`) carries no `head_sha` front-matter (it is a
  plan, not an audit) — recorded for the chain at `80753c4dc4985996d65b64ec03f38198e6f4fc87`
  (COMMIT 2); no back-fill. See the SHA back-fill ledger for the full enumeration.

## § 9. Next step

Operator reviews plan-drafting close, routes D1–D17, dispatches Stage 0 (Pre-flight)
separately. Stage 0 first task: Convention-M anchor re-check at the then-HEAD, then the
common-warp socket consumption probe + the Warp-CPU determinism R-A1 anchor (O-2 chain
checkpoint 1; a collision-or-streaming `@wp.kernel`), then the f64-storage + `wp.float64()`
seed audit (the `wp.float64(0.0)` reduction accumulators + the `wp.float64(1.0)` feq
literal + the precomputed f64 `c_s²`-derived constants).

---

*End of plan-drafting landing. Verdict: plan-drafting-CONFIRMED. Cumulative 209 → 216
(7 shifts). gate-14 planned as a cross-stack BIT-EXACT witness (shape (a);
`within_tolerance=True`, `max_abs_err=0.0` empirically grounded). No `-phase-N` tag.
Local-only per D13.*
