---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-d-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: a9f8f9f50c61b96efe74dcb2de29383a418df7f5
head_sha_at_checkpoint: ae6f9ec78f2fe559d05c3900300d1cb7cbd61c6d
date: 2026-05-24T16-30-00Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-eulerian-smoke-stack-d.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-probe-2026-05-24T16-30-00Z.md
---

# Plan-drafting landing — sub-phase-eulerian-smoke-stack-d

> FIFTH spec-Phase-2 per-sim cross-stack port. Plan-drafting (probe + charter)
> complete. D1–D13 surfaced for operator routing; Stage 0 dispatchable after
> routing. Coordinator-side Convention #8 discipline exemplified: every
> dispatch-referenced value treated as "believed-true; verify at HEAD"; the
> probe's empirical Phase-1 `sim.py` + `reference/stable_fluids.py` read (S6) is
> the load-bearing anchor — and it CORRECTED three dispatch framings (the
> plain-SL-3D-not-MacCormack canonical; the collocated-not-face-centered grid;
> the vorticity-confinement PRESENT-but-NOT-EXERCISED `eps=0`).

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-probe-2026-05-24T16-30-00Z.md` | `54c523ae25e1c4cbcb541b1cfe6ba575a22a024d` |
| Charter | `docs/phases/sub-phase-eulerian-smoke-stack-d.md` | `ae6f9ec78f2fe559d05c3900300d1cb7cbd61c6d` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-24T16-30-00Z.md` | back-filled below |
| SHA back-fill | `…/sha-back-fill-2026-05-24T16-30-00Z.md` | this back-fill commit (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no
blocking dependencies. **Hard Rule 2 NOT triggered as a blocker** — but three
dispatch framings were corrected at HEAD (S-S3: canonical 3D uses plain
trilinear SL not MacCormack; the grid is collocated cell-centered with NO
face-centered velocities; vorticity confinement is OFF at canonical, `eps=0`).
These are believed-state corrections, not structural wrongness; drafting
proceeds with the corrected leans.

## § 2. S6 banked-precedent application outcome (load-bearing)

Phase-1 smoke characterized at HEAD by reading
`packages/eulerian-smoke/eulerian_smoke/{sim.py (593 L), reference/
stable_fluids.py (565 L), invariants.py}` + `pyproject.toml` + `tests/*.py` +
the four sim-spec files (NOT just the spec sheets):
- **Variant / scheme:** Stam-Fedkiw stable-fluids, **COLLOCATED cell-centered,
  periodic-BC**. `stack.name="numpy-reference"`, `sim.category="volumetric-grid"`,
  `variant="stam-fedkiw-stable-fluids"`. The cross-stack pair is **NumPy-reference
  ↔ Stack-D Taichi** (the sph-water/LBM/MPM pattern — frozen CPU reference as the
  gate-14 diff-partner). NOT a GPU partner; NOT MAC-staggered.
- **Advection:** MacCormack predictor-corrector is **2D-only** (lid-driven
  velocity advect + the gate-4 MMS); the canonical 3D Taylor-Green uses **plain
  trilinear `semi_lagrangian_advect_3d`**. → corrects the dispatch's "MacCormack
  at face-centered velocities" framing (MacCormack 2D-only; NO face-centered
  velocities anywhere — collocated grid; MAC-staggered deferred to Stack-C).
- **Vorticity confinement:** PRESENT but **NOT EXERCISED** — `canonical_params_3d()`
  sets `vorticity_eps = 0.0`; `_vorticity_confinement_3d` early-returns zeros.
  The methodology § 5.1 PRESENT-but-NOT-EXERCISED pattern (the smoke analog of
  MPM's serialised-scatter; even weaker — OFF).
- **Iterative components:** the Jacobi pressure-projection runs a **FIXED
  `n_jacobi = 20` sweeps, NO convergence-check early-stop** (the P24 pattern), at
  every step of both canonical captures + the gate-4 MMS. → **smoke is the FIRST
  cross-stack pair to put deferred IC-15 aspect #5 (iterative-solver) in play** —
  but in its determinism-SAFE fixed-cap form (the sweep count is identical across
  stacks → FP-accumulation, NOT iteration-count divergence).
- **Chaos / regime:** Taylor-Green decaying vortex (`∝ exp(−2νk²t)`, ν=0.01) +
  lid-driven Re=100 — both LAMINAR. Deferred aspect #1 (R-P2 chaotic) NOT
  exercised (tame canonicals; the smoke analog of MPM's "drop-impact ≈ rigid
  free-fall").
- **Atomic-scatter:** NONE (pure per-cell stencil / SL gather; `determinism.
  atomic_ops=False`). Deferred aspect #3 N/A.
- **Gate-4:** **MMS-ONLY** (NS-2D MMS via the shared `incompressible_ns_2d`
  solution; Phase-1 OOA advection 1.99 / projection 2.00; spec-ref § 7 "No
  closed-form golden table"). Opposite of MPM (golden-only); unlike LBM
  (dual-arm). NO-OP for `_SUBDIRS_PICKED_UP` (RD-3D precedent).
- **Captures:** **TWO** (the LBM two-capture/two-runner pattern, NOT MPM's one):
  `taylor-green-128cube-seed42-step500` (3D; `sim_runner_seeded`; ~704 MB;
  691.587 s) + `lid-driven-cavity-128sq-re100-seed42-step1000` (2D;
  `sim_runner_seeded_2d`; 4.2 MB; 5.099 s). Both present + LFS-tracked.
- **Trajectory vs spec:** SIMPLIFIED-subset (the "spec describes more than
  implementation does" two-instance pattern; banked #13 / methodology § 5.3).

**Expected gate-14 shape:** **methodology-validation-at-fifth-regime exercising
deferred aspect #5 in its fixed-cap form** — most likely BOTH verdicts
`within_tolerance=True` at FP-round-off scale (`~1e-14/1e-15`), at the 1e-4
`smoke` category (more headroom than LBM's 1e-5), because the fixed Jacobi sweep
count + deterministic stencils + f64 + serialised single-thread keep the delta
flat across the full step-horizons. Aspects #1 (laminar) and #3 (no scatter)
keep full formalization premature.

## § 3. D1–D13 verdicts (lean + alternative + downstream)

| D | Verdict (lean) | Alternative(s) | Downstream |
|---|---|---|---|
| **D1** naming | **`sub-phase-eulerian-smoke-stack-d`** (pkg `packages/eulerian-smoke-stack-d/`; captures `captures/eulerian-smoke-stack-d/`) | abbreviated `smoke-stack-d` (rejected) | full-name precedent for remaining ports |
| **D2** stage decomp | **1a/1b/1c**; 1b ~1100–1700 LOC, no sub-split | sub-split 1b (not needed) | Stage-0 confirms scope |
| **D3** S-2.1 filterwarnings FOLD | **FOLD** — new port native `ignore::SyntaxWarning:taichi.*`; 4-port retrofit folds into Stage 1b/2 (the § B.7 sweep exercises the cold-`.pyc` gap) | STANDALONE testing-improvements sub-phase (rejected — 4 trivial edits) | closes the S-2.1 bank |
| **D4** step-horizon | **full** (3D 500/cadence-50; 2D 1000/cadence-100; 11 frames each) | shorter (not pre-committed) | step-horizon witness load-bearing |
| **D5** IC-15 disposition | **(b) PARTIAL HOLDS + REFINEMENT** (additive §6 iterative-solver FP-accumulation; reuse §5.1 PRESENT-but-NOT-EXERCISED [vorticity]; extend §5.3 S6; keep #1/#3 deferred) | **(d)** substantive if gate-14 surprised; **(a)** full (premature; #1 unexercised, #5 fixed-cap); **(c)** unchanged (too weak) | fifth-pair refinement |
| **D6** override | **MANDATORY** `[overrides.eulerian-smoke] category="smoke"` (5th override; `volumetric-grid`→`smoke`; at-budget) | none | KeyError without it |
| **D7** manifest-equality (#14) | **DEFER** — private `_build_manifest_3d/_2d`; per-port fan-out is testing-improvements scope (none of 4 ports added one) | ADD strategy-(i) smoke test (defensible; diverges from 4-port precedent) | fan-out remains testing-improvements |
| **D8** comparison-projection | **unneeded** (position-exact per-cell; FP-round-off; no aggregate-scatter) | per-field projections (not needed) | resolves with D5 |
| **D9** variant/scheme | **Stam-Fedkiw collocated periodic** (plain-SL-3D + MacCormack-2D + 5/7pt diffuse + fixed-20-sweep Jacobi + eps=0 vorticity) | none (reference fixed) | no MAC/face-centered (Stack-C); no flow-map (Phase 4) |
| **D10** corpus sizing | **surface to operator** — small 2D (~4.2 MB) vs diagnostic-tier vs canonical 3D (~704 MB) | (i) 2D representative-subset (§5.4; lightest); (ii) diagnostic; (iii) canonical 3D (LBM/MPM precedent) | S-CI1/D13 CI round-trip where LFS-bandwidth permits |
| **D11** IC-15 stress posture | **continue + note limitation** (#1 laminar/unexercised; #5 fixed-cap) | augment high-Re/turbulent capture (rejected; § P.2) | SECTION 2 (c) |
| **D12** non-phase tag | **NO** (all spec-Phase-2 precedent; § D.2) | tag (rejected) | — |
| **D13** CI-red LFS-bandwidth | **record known-banked; no action** (local verify/replay unaffected; 21/21 LFS present) | fix (out of scope; operator-routed LFS-architecture bank) | Stage-2 documents local-only posture if quota blocks CI smudge |

## § 4. Probe inventory summary (HEAD-verified)

- **Anchors:** conventions `4ac8341a6cda45016c4e157823a3b5d2b2bd92d185ad367e1a7143c8ec037e0b` (matches dispatch verbatim); architecture `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267`; methodology `8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f` (post-MPM §5). No conventions/architecture drift; methodology consumed AS-IS.
- **Infrastructure:** IC-11/12/13/14/15-partial/16 all landed + consumed; `.gitattributes` `captures/**/*.h5 filter=lfs` + `legacy-captures/**/*.h5 filter=lfs`; CI checkout `lfs:true`. Remote CI currently red on LFS download-bandwidth-quota (local unaffected — 21/21 LFS objects present).
- **IC surface:** IC-15 partial (`8c760383…`; 5 codified + § 4 LBM + § 5 MPM + 5 deferred). Smoke is the FIRST sub-phase to put deferred aspect #5 (iterative-solver) in play (fixed-cap form).
- **tolerance.toml:** `[defaults.smoke]=1e-4/0.0`; `[budgets.smoke.cross_stack]=1e-4/0.0`; NO `[overrides.eulerian-smoke]` at HEAD (Stage-1c adds the 5th override; existing overrides = reaction-diffusion-2d / sph-water / lattice-boltzmann-d3q19 / mpm-multimaterial).
- **Canonical captures (count = TWO):** `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.h5` (LFS OID `4604ebdc40`; ~704 MB) + `lid-driven-cavity-128sq-re100-seed42-step1000.h5` (LFS OID `e13b0d0524`; 4.2 MB) + `.json` sidecars.
- **Perf baselines:** 691.587 s (3D 128³×500) + 5.099 s (2D 128²×1000); numpy-reference.
- **Gate surface (Phase-1):** gate-4 MMS-only (NS-2D; OOA 1.99/2.00; no golden); gate-6 Tier-2 `vector_field` (IC-6); gate-10 determinism (`run_twice_and_diff`); gate-11 PBT (`divergence_free_post_projection` + `smoke_density_nonneg`). Mutation kill: `sim.py` 0.1707, `reference/stable_fluids.py` 0.5990, `invariants.py` 0.5630, overall 0.4879. NO R-class arcs (single-session Stage 1).
- **Convention C API:** `set_taichi_deterministic(Config{deterministic,seed}, *, arch="cpu")` pins `cpu_max_num_threads=1`+`offline_cache` (NOT `default_fp=ti.f64` — the f64-seed need); capture at `tools/testkit/capture/` (`CaptureManifest`/`StepState`/`write_capture`/`load_capture`); `compare_captures(left,right,tolerance_table_path)`→`EquivalenceVerdict`, raises `KeyError` on unknown category w/o override; `run_twice_and_diff(runner,seed,tmp_dir)`→`DeterminismVerdict`.
- **Spec § 11.3:** Smoke = item **2.4 = "Smoke to Stack D and Stack E"**; Stack-D arm ENUMERATED (S-S1; clean spec-mandated port — favourable contrast to MPM's item-2.3 Stack-E-only).

## § 5. Shifts surfaced (plan-drafting)

Entering: **152** (ci-action-migration + setup-uv-v8-pin-hotfix close). New (6):

| Shift | Description | Disposition |
|---|---|---|
| S-S1 | spec § 11.3 item 2.4 = "Smoke to Stack D and Stack E" — Stack-D arm ENUMERATED (clean spec-mandated port; favourable contrast to MPM's S-M1 Stack-E-only; documents the believed-state "MPM Stack-D non-spec" observation by contrast) | recorded (CONFIRM) |
| S-S2 | tolerance category `smoke` = 1e-4 (same as RD-2D/sph/mpm; looser than LBM's 1e-5 → more gate-14 headroom); D1 full-name confirmed | recorded |
| S-S3 | **S6** — canonical TRAJECTORY: 3D plain trilinear SL (not MacCormack); MacCormack 2D-only; vorticity confinement `eps=0` (PRESENT-but-NOT-EXERCISED, §5.1); collocated grid (NO face-centered/MAC — Stack-C deferred); laminar regimes; Jacobi fixed-20-sweep (P24-safe). Corrects dispatch R-S2/R-S3/SECTION-2 framings | recorded |
| S-S4 | gate-4 **MMS-ONLY** (no golden; spec-ref § 7); NO-OP `_SUBDIRS_PICKED_UP`; MMS shared `incompressible_ns_2d` w/ LBM; 2D MacCormack-advect + Jacobi-project convergence study (LBM Stack-D template). Opposite of MPM (golden-only); unlike LBM (dual-arm) | recorded |
| S-S5 | scope shape — TWO canonical captures (LBM-shaped; two runners; TWO gate-14 verdicts); gate-6 Tier-2 `vector_field` (IC-6); **IC-15: FIRST pair to put deferred aspect #5 (iterative-solver/Jacobi) in play, in determinism-safe fixed-cap FP-accumulation form**; D5 lean (b) | recorded |
| S-S6 | banked dispositions — D3 S-2.1 filterwarnings FOLD (HEAD-confirmed gap across 4 ports); D7 manifest-equality (#14) DEFER (private `_build_manifest*`; per-port fan-out is testing-improvements scope) | recorded |

**Cumulative at plan-drafting close: 158** (152 + 6).

## § 6. Blocking dependencies + drift for operator attention

- **No blocking dependencies.** Stage 0 is dispatchable after D1–D13 routing.
- **Drift surfaced (believed-state corrections — operator attention before Stage 0):**
  1. **Canonical-trajectory framings corrected** (S-S3): the dispatch SECTION-2 / R-S2 "MacCormack at face-centered velocities" premise is corrected — MacCormack is 2D-only, the canonical 3D is plain SL, and there are NO face-centered velocities (collocated grid; MAC-staggered is the Stack-C deliverable). The dispatch's R-S3 (vorticity confinement) is PRESENT-but-NOT-EXERCISED (`eps=0`). Neither is a blocker; both are S6 findings that sharpen the port's algebraic surface.
  2. **IC-15 aspect #5 is real but determinism-safe** (S-S5): smoke IS the first pair to put the iterative-solver aspect in play, but the FIXED Jacobi cap means the determinism-threatening sub-aspect (variable iteration count) is structurally absent — so D5 leans (b) refinement, NOT (a) full (the dispatch SECTION-2 anticipated #5 amplification; the fixed-cap design keeps it FP-round-off).
  3. **MPM Stack-D non-spec-§11.3 observation is already documented** (probe § 3): MPM-probe § 0 (S-M1) + MPM charter § 1.1 record MPM→Stack-D as a systematic-program extension. Smoke contrasts favourably (item 2.4 enumerates the Stack-D arm). No new action; banked observation.
  4. **D3 S-2.1 FOLD + D10 corpus sizing + D13 CI-red** are the operator-routable knobs; D6 override is mechanically MANDATORY.
- **D5 calibration** depends on the Stage-1c gate-14 margin (Stage-0 Task 0.3 produces the f64-seed calibration datum).

## § 7. verify_evidence self-check

`verify_evidence --strict` over this landing audit: both evidence_paths present
(the charter + probe are non-LFS `.md` blobs — git-blob sha256). The SHA
back-fill (COMMIT 4) sets this landing's `head_sha` to its own committing commit
+ back-fills the probe's `head_sha`; the back-fill is the terminal plan-drafting
commit (its SHA reported to the coordinator, not further back-filled).

## § 8. Next-step recommendation

Operator routes D1–D13 (§ 3), then dispatches Stage 0 per charter § 7.1.
Spec-Phase-2 cross-stack ports after smoke: the literal item-2.4/2.5 Stack-E
(Warp) ports + the LBM Stack-E half + the Stack-C variants + the literal MPM
Stack-E Warp port (item 2.3).

---

*End of plan-drafting landing. SHA back-fill follows (Convention #12 + N1
enumeration).*
