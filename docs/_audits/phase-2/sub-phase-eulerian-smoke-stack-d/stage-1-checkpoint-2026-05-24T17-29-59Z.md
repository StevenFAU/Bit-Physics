---
date: 2026-05-24T17-29-59Z
author: eulerian-smoke-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-d-stage-1
subject: "Stage 1 (collapsed cross-stack port; all 14 gates) PARTIAL CLOSE for eulerian-smoke -> Stack-D (FIFTH spec-Phase-2 cross-stack port). VERDICT Hard-Rule-2-STOP. Task 1 preflight PASS: HEAD==d868e88 at dispatch; bit-identity replay 9399fc33...718909f34 byte-identical (HELD, 30th+); integrity baseline c19492ad...d22cb52 byte-identical (streak HELD). tolerance.toml [overrides.eulerian-smoke] category=smoke landed (5th per-sim override; COMMIT 1 29837da). Failing-tests gate-3 anchor landed (COMMIT 2 2341920; 6 ModuleNotFoundError). Stack-D Taichi Stam-Fedkiw implementation landed (COMMIT 3 42ed61e); gates 4-13 GREEN (MMS advection OOA 1.9892 / projection 1.9976; gate-10 content-equivalent; gate-11 2 PBT @ 50; gate-13 worktree replay reproduces 6 ModuleNotFoundError). f64-seed banked precedent #7 applies NON-vacuously (3D Jacobi pure-literal 1.0/6.0 inferred f32, ~1e-9 leak; seeded ti.f64). GATE-14 HARD-RULE-2 STOP: BOTH verdicts within_tolerance=False -- BOTH canonical trajectories are numerically UNSTABLE (NOT laminar, contra probe S6/§6): 2D Kelvin-Helmholtz shear instability (reference u->1.6e3 by step 5); 3D Taylor-Green blowup (reference max|u| 0.999->8.1e7[step50]->5.1e19[step250]). IC-15 deferred aspect #1 (chaotic-regime) EXERCISED, inverting the D5(b)/D11 disarmed-aspect-#5 premise. Port is FAITHFUL (matches sealed NumPy reference to ~1e-16 while stable; blowup is in the reference, verified independently). STOPPED per dispatch SECTION 2; equivalence.md + IC-15 §6 amendment NOT landed; gate-14 tests SKIPPED pending operator routing; 3D 738MB capture held local (D13). Operator re-routes."
verdict-state: Hard-Rule-2-STOP
head_sha: 1617a2b817e388cd6cd123110e15c23ba62264c5
head_sha_at_checkpoint: 42ed61eb794ddb5accc9f07b52f13b9c4f0502ab
parent_audits:
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-landing-2026-05-24T16-30-00Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-checkpoint-2026-05-24T16-50-22Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-evidence/gate14-verdicts-2026-05-24T17-29-59Z.txt
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-evidence/gate13-replay-2026-05-24T17-29-59Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-evidence/gate14-verdicts-2026-05-24T17-29-59Z.txt: sha256:19ae932eede201e31b3650ddb5ff9223e85320c01fa851358e33d6c0a57493eb
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-evidence/gate13-replay-2026-05-24T17-29-59Z.txt: sha256:8c205d33024de75283882d2ec5e0e10d8ab9b9b7018b308853f6c4fd1c11d49b
---

# Stage 1 partial checkpoint — sub-phase-eulerian-smoke-stack-d

> FIFTH spec-Phase-2 per-sim cross-stack port; collapsed single Stage 1 (all 14
> gates). **VERDICT: Hard-Rule-2-STOP.** Gates 1–13 GREEN; the implementation is
> a faithful Taichi-DSL Stam-Fedkiw port. **Gate-14 returned `within_tolerance=
> False` on BOTH canonical descriptors** because BOTH Phase-1 canonical
> trajectories are numerically UNSTABLE (the cross-stack test exposed a latent
> instability that within-stack determinism/NaN-Inf gates could not see). Stopped
> per dispatch SECTION 2; operator re-routes. No silent tolerance widening, no
> horizon-shortening, no canonical re-characterization performed.

## § 1. Scope

Stage 1 of the `eulerian-smoke` NumPy-reference → Stack-D (Taichi-DSL CPU) port,
collapsed to a single stage (1a+1b+1c) per the coordinator dispatch. In scope:
the Stack-D Taichi implementation, the `[overrides.eulerian-smoke]` tolerance
entry, TWO canonical captures, gates 4–13, the gate-14 cross-stack diffs, the
IC-15 §6 methodology amendment (D5), and the §6 deliverable commit chain. The
stage HALTED at gate-14 (Hard Rule 2); the IC-15 §6 amendment + `equivalence.md`
authoring are NOT landed (their premise is inverted by the finding — § 6/§ 10).

## § 2. Operator routing consumed (D1–D13 + S0-1 inheritance)

| D | Ratified routing | Stage-1 action |
|---|---|---|
| D1 | name `sub-phase-eulerian-smoke-stack-d` | package `packages/eulerian-smoke-stack-d/` created |
| D2 | 1a/1b/1c | COLLAPSED to single Stage 1 per dispatch; TDD anchor commit retained (§ 10 S1-1) |
| D3 | S-2.1 filterwarnings FOLD (Stage 0) | inherited; new port carries bare `ignore::SyntaxWarning` natively (S0-1) |
| D4 | full step-horizons | 3D 500/cadence-50; 2D 1000/cadence-100; 11 frames each — the full horizons are what surfaced the instability (§ 6) |
| D5 | IC-15 (b) PARTIAL HOLDS + REFINEMENT | **BLOCKED/INVERTED** — the (b) premise (disarmed aspect #5; aspect #1 unexercised) is contradicted; § 7 |
| D6 | `[overrides.eulerian-smoke] category="smoke"` MANDATORY | landed COMMIT 1; resolves `volumetric-grid`→`smoke`@1e-4 |
| D7 | manifest-equality DEFER | honored (no manifest test) |
| D8 | comparison-projection unneeded | N/A — the failure is chaotic divergence, not a projection-axis question (§ 6) |
| D9 | Stam-Fedkiw collocated periodic | implemented verbatim |
| D10 | small 2D corpus / 3D local | 3D capture HELD LOCAL (§ 6); no corpus entry landed (Stage-2 scope; moot pending routing) |
| D11 | continue + note IC-15 limitation | **SUPERSEDED** — aspect #1 is not a "limitation to note" but an EXERCISED-and-FAILING regime (§ 7) |
| D12 | NO TAG | honored |
| D13 | CI-red LFS-bandwidth KNOWN-BANKED | honored; 3D 738MB capture held local partly for LFS-bandwidth conservation |

**S0-1 inheritance (CONFIRMED):** the new port's `pyproject.toml` filterwarnings
uses the bare `ignore::SyntaxWarning` form (NOT the charter §1.4.6 R-T3 / §4.2.2
step 1 `:taichi.*` form, which is empirically ineffective per Stage 0), with the
3-line explanatory comment. Charter §1.4.6 R-T3 + §4.2.2 step 1 remain
SHIFTED-AT-STAGE-0; the charter is not amended (audit-append-only). See § 12.

## § 3. Task 1 — Preflight + tolerance override

| Check | Result | Detail |
|---|---|---|
| HEAD == `d868e88` at dispatch | PASS | working tree clean except untracked `.claude/` |
| Bit-identity replay `9399fc33…718909f34` | HELD (30th+) | `replay_prior_phase --prior-phase phase-1` → 8/8 gates PASS, `ok=True`; output sha256 byte-identical |
| Integrity baseline `c19492ad…d22cb52` | MATCH | `python -m integrity --all --mode strict` → 0 HARD_FAIL, 14 SOFT_WARN; output sha256 byte-identical (streak HELD at preflight) |
| `[overrides.eulerian-smoke]` | LANDED (COMMIT 1 `29837da`) | `category="smoke"`; at-budget; 5th per-sim override; resolves `volumetric-grid`→`smoke`@1e-4 (KeyError without it) |

## § 4. Task 2-3-4 — Implementation summary (gates 1-3, 9; COMMIT 2 + 3)

- **Gate 3 (TDD anchor; COMMIT 2 `2341920`):** test surface (`test_reference_sanity`,
  `test_mms_convergence`, `test_diagnostics`, `test_pbt_invariants`,
  `test_determinism`, `test_cross_stack_equivalence`) importing the absent
  `eulerian_smoke_stack_d.{reference,sim,invariants}` → 6 clean ModuleNotFoundError.
  Failing-tests evidence sha256 `80969ace…fa8708`.
- **Implementation (COMMIT 3 `42ed61e`):** `reference/stable_fluids_taichi.py`
  (Taichi `@ti.kernel` primitives: `_k_sl_advect_{2d,3d}`, `_k_laplacian_{5,7}point`,
  `_k_divergence_{2d,3d}`, `_k_jacobi_sweep_{2d,3d}`, `_k_subtract_grad_{2d,3d}`,
  `_k_curl_3d` + NumPy wrappers mirroring the Phase-1 reference signatures); `sim.py`
  (`sim_runner_seeded` 3D, `sim_runner_seeded_2d` 2D, `sim_runner_diagnostic`,
  `compute_canonical_trajectory_3d`); `invariants.py` (2 PBT @ 50 ex.); CANONICAL_*
  re-derived VERBATIM (no Phase-1 import). Gate-1 spec sheet + gate-2 probe report
  authored. Workspace registered (19th member); `uv.lock` updated.
- **Gate 9 (captures):** both descriptors emitted at the verbatim Phase-1 sizes —
  2D `lid-driven-cavity-128sq-re100-seed42-step1000.h5` 4,385,176 B (committed; LFS
  OID `db05a65254bfb5e5e544641f93de2b8dbe47b575a3a301c31f1c0b202aee6c34`; `.json`
  blob sha256 `8ebf117e…d592d`); 3D `taylor-green-128cube-seed42-step500.h5`
  738,260,192 B (HELD LOCAL; sha256 `2c854bc8…0076d75`; `.json` sha256 `914895f8…e246efc8`).

## § 5. Task 5 — Gates 4-13 verification

| Gate | Status | Notes |
|---|---|---|
| 4 (MMS OOA) | GREEN | MMS-only (no golden); advection OOA **1.9892**, projection OOA **1.9976** — both within ±0.5 of formal p=2 (Phase-1 ref 1.99/2.00) |
| 5 (Tier 1) | GREEN | NaN/Inf scan over the diagnostic trajectory clean |
| 6 (Tier 2) | GREEN | `vector_field` (IC-6): divergence-free advisory + circulation/helicity/energy-spectrum finite |
| 7 (Cat 1) | GREEN | Stam 1999 / Fedkiw 2001 / Taylor 1937 cited in spec sheet + probe |
| 8 (Cat 2) | GREEN | public API matches probe § 4 |
| 9 (Captures) | GREEN | 3D 738,260,192 B / 2D 4,385,176 B (sizes byte-identical to Phase-1 reference) |
| 10 (Determinism) | GREEN | `run_twice_and_diff(sim_runner_diagnostic)` content_equivalent=True; over-achieves `bit-exact-same-stack-same-hw` |
| 11 (PBT) | GREEN | `divergence_free_post_projection` + `smoke_density_nonneg` @ 50 examples each |
| 12 (perf-ledger) | GREEN | 2D 8.470s (1.66× ref) + 3D 698.986s (1.01× ref) — both within the 2× band (R-S8) |
| 13 (failing-tests-replay) | GREEN | worktree at `2341920` reproduces 6 ModuleNotFoundError (§ E) |

All 13 stack-agnostic gates GREEN; the package test suite is `14 passed, 2 skipped`
(the 2 skips are the gate-14 verdicts — § 6). The implementation is a faithful port.

## § 6. Task 6 — Gate-14 result (HARD-RULE-2 STOP)

**BOTH cross-stack verdicts `within_tolerance=False`** at `relative=1e-4` (`smoke`
category). Evidence: `stage-1-evidence/gate14-verdicts-2026-05-24T17-29-59Z.txt`.

| Descriptor | within_tolerance | max_abs_err (worst field) | margin vs 1e-4 |
|---|---|---|---|
| taylor-green-128cube-seed42-step500 (3D) | **False** | `5.86e+20` (v) | EXCEEDED by ~24 orders |
| lid-driven-cavity-128sq-re100-seed42-step1000 (2D) | **False** | `1.07e+01` (v) | EXCEEDED by ~5 orders |

**Root cause — BOTH canonical trajectories are numerically UNSTABLE (the probe's
"both laminar" S6 characterization is WRONG):**

- **2D lid-driven-cavity:** the thin lid-shear-layer `0.5(1+tanh((y-0.95)/0.02))`
  on a PERIODIC grid is Kelvin-Helmholtz unstable. The sealed Phase-1 reference
  trajectory reaches `max|u| ~ 1.6e3` by step 5 (`U_lid=1`), then settles to `~O(10)`
  — dominated by numerical instability, not physics.
- **3D Taylor-Green:** blows up under the collocated-grid / under-resolved-(20-sweep)-
  Jacobi numerics. The sealed reference reaches `max|u|` `0.999 → 8.1e7 (step 50) →
  5.1e19 (step 250)`. (Density stays bounded `~0.03` — passively-advected scalar,
  max-principle.) NOT the "smooth analytic decay `~exp(-2νk²t)`" the spec/probe describe.

**The port is FAITHFUL — the blowup is in the SEALED Phase-1 reference, verified
independently** (a fresh NumPy `sim_runner_seeded_2d` reproduces the committed
reference capture bit-for-bit, `max|u diff|=0.0`; and a fresh NumPy reference 3D
run blows up to `5.1e19` on its own). Step-by-step the Stack-D port matches the
NumPy reference to FP-round-off WHILE the trajectory is stable (2D: 0.0 @ step 1,
8.9e-16 @ step 2; 3D 64³: 5.6e-16 @ step 1, 1.1e-10 @ step 60), then the flow's
positive Lyapunov exponent amplifies the FP-round-off perturbation to O(field).

**This is IC-15 deferred aspect #1 (R-P2 chaotic-regime) being EXERCISED for the
first time across all five cross-stack pairs** — and chaotic trajectories CANNOT
be cross-stack content-equivalent at 1e-4 over the full horizon (sensitive
dependence + FP-round-off differences = divergence). Cross-stack equivalence
testing surfaced a latent instability in the Phase-1 canonical that within-stack
gates (determinism is bit-exact even for chaos; NaN/Inf passed because 5e19 is
finite) could not detect.

**STOPPED per dispatch SECTION 2** ("Gate-14 returns within_tolerance=False" +
"S6-equivalent finding"). Per charter § 1.4.2 / § 2: no silent tolerance widening,
no horizon-shortening, no canonical re-characterization. The two gate-14 tests are
SKIPPED with a documented Hard-Rule-2 reason; resolution is operator-routed.

## § 7. Task 7 — IC-15 §6 amendment: NOT LANDED (premise inverted)

The dispatch TASK 7 / D5 (b) routing presumed an additive "§6 iterative-solver
FP-accumulation (deferred aspect #5, disarmed fixed-cap form)" refinement, reusing
§5.1 PRESENT-but-NOT-EXERCISED (vorticity) and extending §5.3 S6. **That premise is
inverted by the gate-14 finding:** aspect #5 (iterative solver) is NOT the
operative surface — the fixed-cap Jacobi does behave as FP-accumulation while the
flow is stable (matched to ~1e-16); the operative surface is the previously-deferred
aspect **#1 (chaotic-regime)**, which is now EXERCISED and produces
`within_tolerance=False`. Landing a "(b) partial-holds refinement" amendment would
mis-describe the methodology's state. The IC-15 disposition is **BLOCKED pending
operator routing** — this pair is the methodology's first encounter with a
chaotic-regime cross-stack FAILURE, which is a substantive event (the deferred R-P2
escape-hatch playbook, IC-15 §2 item 1, is now needed), not a routine additive
refinement. `equivalence.md` is likewise NOT extended (no validated witness to author).

The NON-vacuous f64-seed finding (banked precedent #7 biting the 3D Jacobi
pure-literal `1.0/6.0`, seeded `ti.f64(1.0)/ti.f64(6.0)`; first port where #7 hits
a CONSTANT not a reduction) IS a clean, landable methodology datum — but it is
folded into the code + this checkpoint, not into the IC-15 doc, pending the
operator's broader routing of the aspect-#1 finding.

## § 8. Task 8 — Local verification sweep (partial)

- **Package suite:** `pytest packages/eulerian-smoke-stack-d/tests/` → 14 passed,
  2 skipped (gate-14, documented). Gates 4-13 GREEN.
- **Preflight replay + integrity:** bit-identity `9399fc33…` HELD; integrity baseline
  `c19492ad…` MATCH (measured at preflight, pre-implementation).
- **Cross-package regression sweep + final integrity sweep + bit-identity replay
  (post-implementation):** NOT RUN — deferred with the STOP (these are Stage-2/landing
  concerns; the stage halted at gate-14). The new package + skipped gate-14 will
  perturb a full-portfolio sweep; that is a landing-stage measurement the operator
  routes after the gate-14 disposition.

## § 9. S-S3 corrections honored

- MacCormack is 2D-only; the 3D canonical uses plain trilinear SL. CONFIRMED.
- Collocated cell-centered grid; no face-centered / MAC-staggered velocities. CONFIRMED.
- Vorticity confinement PRESENT-but-NOT-EXERCISED (`vorticity_eps=0.0` dead path;
  `_vorticity_confinement_3d` early-returns zeros). CONFIRMED.
- Jacobi fixed-cap `n_jacobi=20`, no early-stop. CONFIRMED. (NB: § 6 shows the
  under-resolved 20-sweep Jacobi is a CONTRIBUTOR to the 3D instability — the fixed
  cap is determinism-safe but does not fully solve the Poisson system, leaving a
  residual that the trajectory amplifies.)

## § 10. Banked items / observations + shifts surfaced

**Shifts this Stage 1 (4): S1-1..S1-4.** Cumulative entering: 159 (per Stage-0).
Cumulative after Stage 1: **163.**

| Shift | Description | Disposition |
|---|---|---|
| **S1-1** | Collapsed single-stage retained a TDD failing-tests anchor commit (COMMIT 2) because gate-3 + gate-13 (worktree replay) REQUIRE a bootstrap SHA where modules are absent. Standard stage-1a pattern folded in. | recorded (routine; documented) |
| **S1-2** | Test/file layout follows the HEAD prior-port convention (`test_mms_convergence`, `test_diagnostics`, `test_pbt_invariants`, `test_determinism`, `test_reference_sanity`, `test_cross_stack_equivalence`) NOT the dispatch SECTION-5 speculative sketch (`test_taylor_green.py`, `config/default.toml`, `docs/port-notes.md`, `test_failing_tests_replay.py`). Convention M (HEAD wins on drift); the charter § 4.2.1 names the HEAD layout. | recorded (routine) |
| **S1-3** | Banked precedent #7 (f64 accumulator-seed) applies NON-vacuously: the 3D Jacobi pure-literal `1.0/6.0` infers f32 (no `default_fp`), leaking ~1e-9 cross-stack; seeded `ti.f64(1.0)/ti.f64(6.0)`. FIRST cross-stack port where #7 bites a pure-literal CONSTANT rather than an in-kernel reduction accumulator (the probe predicted #7 was vacuous for smoke). | recorded (clean methodology datum) |
| **S1-4** | **SUBSTANTIVE / Hard-Rule-2.** BOTH canonical trajectories are numerically UNSTABLE (2D Kelvin-Helmholtz; 3D collocated-grid blowup), NOT laminar — inverting the probe S6/§6 + charter § 1.4.2 + plan-drafting-landing § 2 "both laminar / aspect #1 unexercised" characterization. Gate-14 `within_tolerance=False` on BOTH descriptors; IC-15 deferred aspect #1 (chaotic-regime) EXERCISED and FAILING. This is the THIRD instance of methodology-precedent #13 / methodology §5.3 (canonical trajectory ≠ characterization) — in INVERTED form (the canonical exercises MORE/chaotic, not less). | **surfaced; Hard-Rule-2 STOP** |

Other banks unchanged (B-3 actionlint etc. STAY BANKED; B-7 manifest-equality DEFER
honored; methodology-doc-header-stale untouched).

## § 11. Stage 2 (landing) readiness — BLOCKED

Stage 2 is **NOT dispatchable** until the operator routes the gate-14 aspect-#1
finding (S1-4). Routing options surfaced (NOT pre-decided):

1. **Re-characterize the canonical(s) to a genuinely stable/laminar regime** —
   smaller `dt`, more Jacobi sweeps (resolve the Poisson solve), lower-amplitude /
   smoother IC, or a shorter pre-instability horizon — so the trajectory is
   physically meaningful and cross-stack-equivalent. This changes the Phase-1
   canonical descriptors (D4/D9 territory; touches the SEALED Phase-1 package or
   re-defines the Stack-D canonical) — a significant decision.
2. **Accept `within_tolerance=False` as a legitimate landing state** (charter § 2:
   "a within_tolerance==False outcome that has been operator-routed per R-S1 is a
   legitimate landing state — the methodology validation is the deliverable") and
   land the FIRST chaotic-regime cross-stack pair as the IC-15 R-P2 escape-hatch
   exercise (§2 item 1), authoring the methodology amendment around aspect #1 (now
   data-backed) rather than aspect #5.
3. **Shorten the gate-14 horizon to the pre-instability window** (2D ≤ step ~2; 3D
   ≤ step ~30) — but D4 ratified full horizons; a horizon override needs operator
   approval (charter § 1.4.2 "do NOT pre-commit a shorter horizon").

The implementation (gates 1-13) stands regardless of routing. The 3D 738MB capture
is held local (sha256 `2c854bc8…0076d75`) pending the decision (it would likely be
superseded by option 1).

## § 12. Charter §1.4.6 / §4.2.2 SHIFTED-AT-STAGE-0 inheritance — CONFIRMED

The new port's `pyproject.toml` `[tool.pytest.ini_options].filterwarnings` uses the
bare `ignore::SyntaxWarning` form (the only effective form; compile-time
SyntaxWarnings carry a filename-derived NULL module so a `:taichi.*` qualifier never
matches) with the 3-line explanatory comment, mirroring the 4 prior ports' Stage-0
fold-in. Charter §1.4.6 R-T3 + §4.2.2 step 1 (which prescribe `:taichi.*`) remain
SHIFTED-AT-STAGE-0 per S0-1; the charter is NOT amended (audit-append-only).

## § 13. Verdict

**Hard-Rule-2-STOP.** Gates 1-13 GREEN; the Stack-D Taichi Stam-Fedkiw port is
faithful and complete. **Gate-14 `within_tolerance=False` on BOTH canonical
descriptors** because BOTH Phase-1 canonical trajectories are numerically UNSTABLE
(2D Kelvin-Helmholtz shear instability; 3D collocated-grid/under-resolved-Jacobi
blowup to `5e19`), contradicting the plan-drafting probe's "both laminar / IC-15
aspect #1 unexercised" S6 characterization. IC-15 deferred aspect #1 (chaotic-regime)
is EXERCISED for the first time and FAILS — a substantive methodology event, not
the disarmed-aspect-#5 refinement the D5 (b) routing presumed. The port is faithful
(blowup verified in the sealed reference). Stopped per dispatch SECTION 2; IC-15 §6
amendment + `equivalence.md` NOT landed; gate-14 SKIPPED pending operator routing.
Bit-identity invariant HELD (30th+); integrity baseline MATCH (at preflight).
Operator re-routes per § 11.

---

*End of Stage 1 partial checkpoint. SHA back-fill follows (Convention #12 + N1
enumeration). Operator routing required before any Stage 2.*
