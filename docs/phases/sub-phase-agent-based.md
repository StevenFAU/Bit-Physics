# Agent-Based Pair Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for the agent-based pair, scoped under spec-Phase-1's full inventory.
> **Sub-phase identity:** Second per-sim implementation sub-phase per Phase 1 charter § 2.5 / Phase 1 landing audit § 15 (the closed-form pair was first). This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (N a single integer; the next phase tag is `v0.2.0-phase-2`). No `-phase-N` tag is proposed for this sub-phase. See § 5 + § 11.4 for tag posture.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.5, 2.6, 2.7, 2.13, 2.14, 2.15, 3.5, 5.3, 7.12, 7.13, 11.2, 11.7 + Appendix D § D.2.3.
> **Parent charter:** `docs/phases/phase-1-plan.md`. **Parent sub-phase template:** `docs/phases/sub-phase-closed-form.md`. This sub-phase inherits role model, IC contracts, audit / append-only discipline, checkpoint discipline, problem-solving playbook, conventions, and the three-stage cadence from those two documents and does NOT re-derive them.
> **Parent audits / pre-conditions:**
> - Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); landing audit `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` verdict-state CONFIRMED.
> - Closed-form sub-phase landed at SHA `2cc0f21` (post-Convention-#12 SHA back-fill); landing audit `docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` verdict-state CONFIRMED.
> **Inherited shifts:** 32 documented to date (21 from Phase 1 audit § 14 + 6 closed-form Stage 1 + 5 closed-form Stage 2). Carried forward by reference; not re-stated, not re-litigated.
> **Date drafted:** 2026-05-20.
> **Status:** dispatch-ready.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase is

This sub-phase takes **boids-3d** and **physarum** from spec-Phase-1's gates 1–3 (spec sheet + probe + failing tests, committed at SHA `5dd919c`) through gates 4–13 of spec § 3.5 (v2.4 expanded set). Per Phase 1 audit § 15 / closed-form sub-phase audit § 10, the agent-based pair is the second per-sim implementation surface and the first to exercise the implementation pipeline against **agent-based dynamics**: Stack B (WebGPU compute) target category per spec § 5.3, particle Tier 2 diagnostics (IC-5, newly load-bearing for this sub-phase), and — for physarum — the first sub-phase to declare a `non-deterministic-by-design` / distributional posture per spec § 2.5.

At close, both sims ship all 13 gates GREEN. The 13-gate posture, per-sim acceptance contract, three-stage cadence (Stage 0 pre-flight → Stage 1 per-sim implementation → Stage 2 landing), audit / append-only discipline, checkpoint discipline, conventions, and problem-solving playbook are all inherited from `docs/phases/sub-phase-closed-form.md` (the parent sub-phase template, committed at `91429f3`). This document records only the deltas.

### § 1.2 What this sub-phase is NOT

- A new spec-phase. The next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2` (cross-stack replication); intermediate per-sim implementation work accumulates to `main` without a `-phase-N` tag (see § 5 + § 11.4).
- Implementation of any other Phase 1 sim. Continuous-CA (RD-3D + RD-2D as MMS target) + sph-water, eulerian-smoke + lattice-boltzmann, mpm-multimaterial are subsequent per-sim implementation sub-phases per Phase 1 audit § 15 / closed-form audit § 10.
- Cross-stack replication (Phase 2) or frontier variants (Phase 4).
- Editing any Phase 0, Phase 1, or closed-form sub-phase artifact. Audit chain is append-only.
- Stack B (WebGPU compute) implementation. This sub-phase ships the **Python reference + sim runner + invariants + Hypothesis PBT + canonical capture + perf-ledger row** for each sim; the Stack B compute path at `packages/<sim>/src/` is Phase-2+ cross-stack work per each sim's spec § 5.
- Pre-deciding B17 routing (PATH-A rework vs PATH-B re-bank-to-continuous-CA) or Cat 3 `_SUBDIRS_PICKED_UP` extension for the agent-based subdir. Both are Stage 2 decisions at dispatch time (§ 4.3 Steps 2.3, 2.7).

### § 1.3 Honesty caveats — assumptions Stage 0 will re-anchor

Drafted against HEAD = `2cc0f21` (post-closed-form SHA back-fill). Working assumptions:

- Sim packages at `packages/boids-3d/` and `packages/physarum/` ship Phase-1-committed intentionally-empty `<sim>/__init__.py` packages.
- Failing tests at `packages/<sim>/tests/test_{determinism,diagnostics,*_golden,pbt_invariants}.py` import `<sim>.{reference,sim,invariants}` — those imports are this sub-phase's API target.
- Goldens at `tools/testkit/golden/tables/agent-based/{boids-3agent-step1,physarum-deposit-step1}.json` carry Phase 1 derivations forward unchanged. Each table records three independent published references in a single `independent_reference` block; whether this satisfies the Cat 3 anchor-count count-mechanism is **the** open Cat 3 question for Stage 2 (closed-form audit § 8.2 N4 explicitly flagged that the agent-based / hybrid-pg / lattice / particle-fluids tables would HARD_FAIL on the count-of-discrete-anchors at HEAD — Stage 2 Step 2.3 verifies and decides additive-lift-vs-bank).
- IC-5 (particle Tier 2 diagnostics) imports resolve at HEAD: `diagnostics.tier2.particle.{check_no_overlap,check_count_invariance,check_neighbor_list_integrity,check_momentum_conservation}` per the closed-form-audit-validated doubled-directory layout `tools/diagnostics/diagnostics/`. Physarum additionally consumes `diagnostics.tier2.scalar_field.{check_bounds,check_conservation}` (Phase 0 surface).
- Canonical capture descriptors per spec Appendix D § D.2.3 (FACT — `docs/architecture.md` lines 2508–2509):
  - boids-3d/ref: `flock-3agents-canonical-seed42-step1000` **and** `flock-1000agents-seed42-step1000`. The descriptor row carries two descriptors; both ship as Phase-1-implementation deliverables of this sub-phase. (Stage 1 Step 3 below treats them as two captures under one sub-bundle commit per sim.)
  - physarum/ref: `network-canonical-seed42-step5000`.
- Phase 1 failing-tests-evidence sha256s (FACT — Phase 1 landing audit § 5 / `evidence_hashes:`):
  - `tools/testkit/failing-tests-evidence/boids-3d-2026-05-20T13-04-01Z.txt` → `sha256:7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b`
  - `tools/testkit/failing-tests-evidence/physarum-2026-05-20T13-04-01Z.txt` → `sha256:8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855`
- PBT invariants declared in Phase 1 spec § 6.6 (≥ 2 per sim per R9 amendment):
  - boids-3d: `v_max_clamp_respected`, `particle_count_invariant`.
  - physarum: `trail_mass_conserves_modulo_decay`, `agent_count_invariant`.
- Phase 1 TDD bootstrap SHA for both agent-based sims is `5dd919c` (FACT — Phase 1 landing audit § 4 row 111–112). This is the gate-13 worktree replay anchor for this sub-phase.

Re-anchor drift → SHIFTED per parent playbook P1 / P14; HEAD wins.

### § 1.4 Determinism posture — agent-based ≠ closed-form

The closed-form sub-phase shipped two sims that were trivially deterministic: ODE integration over a fixed step grid, no atomics, no parallel reductions, no ordering-dependent operations. The agent-based pair introduces **two new determinism risks** that the closed-form pipeline did NOT exercise:

1. **Atomic scatter-add on shared cells (physarum deposit step).** Multiple agents may write to the same grid cell on the same step. The Python reference implementation can pin summation order via `numpy.add.at` with a sorted index, but a Stack B WebGPU port (Phase 2+) cannot in general; this sub-phase declares the Python reference as `bit-exact-same-hw` and explicitly defers the chaotic-regime distributional posture per spec § 2.5 to Phase 2+ where the Stack B path lands. Gate 10 within THIS sub-phase covers the deterministic-limit (zero-trail IC) for physarum; the chaotic-regime determinism test is the second test file `test_run_twice_epsilon_chaotic_regime` declared in the physarum probe report § 6, kept advisory at this sub-phase per the determinism declaration's "chaotic regime: epsilon same-stack same-hw" posture.

2. **Neighbor-enumeration ordering (both sims).** Boids' steering computations sum forces over a neighbor set. At the 3-agent fixture size the nested-loop enumeration is trivially deterministic; at the 1000-agent fixture size a spatial-hash broadphase requires pinned bucket-sort + deterministic in-bucket iteration. The Python reference uses nested-loop at both fixture sizes (1000 agents is well below the broadphase-crossover); declared as `bit-exact-same-hw`.

**Stage 1 discipline:** before drafting any sim's implementation, the agent records the determinism strategy explicitly — which reductions are sequenced, which index orderings are pinned, which RNG draws are threaded, and which (if any) operations are deliberately deferred to Phase 2+'s cross-stack scope. The declaration is committed alongside the sim's bundle (`docs/sim-specs/agent-based/<sim>/determinism.md` is the Phase 1 declaration; the Stage 1 commit message footer cites which clauses of that declaration are implemented and which are deferred). See § 7.2 Stage 1 prompt for the verbatim instruction.

### § 1.5 Role model, conventions, audit discipline

Inherited from `sub-phase-closed-form.md` § 1.4, § 7 standing orders, § 8, § 10. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Doubled-directory paths, additive-edits-only on pre-existing files, Convention #12 SHA back-fill at every stage close (closed-form audit § 8.2 N2 explicitly surfaced Stage 0 SHA back-fill omission as a defect to apply at every stage close, not just landing close — see § 8 below).

### § 1.6 Architecture — three stages

- **Stage 0 — Pre-flight.** Cross-phase audit replay against `v0.1.0-phase-1` (NOT against the closed-form sub-phase; the closed-form sub-phase is a sibling, not a parent, in the phase chain — see § 11.4 replay-chain non-participation); tolerance-budget carryover; re-verify Phase 1 boids-3d + physarum failing-tests evidence sha256 (gate-13 precondition).
- **Stage 1 — Per-sim implementation.** Two sub-bundles, one commit each: boids-3d first (simpler — closed-form arithmetic on a 3-agent fixture, 1000-agent capture for the second descriptor), physarum second (deposit-step deterministic limit, then the seed-42-step5000 canonical capture). Each sub-bundle covers gates 4–13.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, integrity registries if any), integrity sweep, gate-13 replay verification per sim, B17 routing decision (PATH-A vs PATH-B re-bank-to-continuous-CA), Cat 3 `_SUBDIRS_PICKED_UP` decision (additive-lift-to-≥-3-anchors-then-pickup vs further-bank), mutation artifact, sub-phase landing audit, Convention #12 SHA back-fill. **No tag is prepared** — see § 5 + § 11.4 for the tag posture.

---

## § 2. Deliverables (per sim, by gate)

The 13-gate per-sim acceptance contract is inherited verbatim from `sub-phase-closed-form.md` § 2. Deltas for agent-based:

| # | boids-3d | physarum |
|---|---|---|
| 4 | `tests/test_3agent_golden.py` GREEN against `boids-3agent-step1.json` (3 test-points A/B/C; abs `1e-12`) | `tests/test_deposit_golden.py` GREEN against `physarum-deposit-step1.json` (`test_deposit_cells_exact` + `test_total_mass_after_decay`) |
| 5 | Tier 1 NaN/Inf scan over the 1000-agent canonical capture trajectory | Tier 1 NaN/Inf scan over the 256×256 trail-map grid |
| 6 | `test_diagnostics.py` GREEN — IC-5 particle (`check_no_overlap`, `check_count_invariance`, `check_neighbor_list_integrity`); `check_momentum_conservation` advisory | `test_diagnostics.py` GREEN — IC-5 particle (`check_count_invariance`, optionally `check_neighbor_list_integrity` advisory) + Phase-0 scalar_field (`check_bounds` on trail map, `check_conservation` advisory) |
| 7 | Cat 1 citations — Reynolds 1987 (DOI 10.1145/37401.37406) + Reynolds 1999 (red3d.com GDC notes) resolve | Cat 1 citations — Jones 2010 (DOI 10.1162/artl.2010.16.2.16202) resolves |
| 8 | Cat 2 public API — `boids_3d.{reference,sim,invariants}` symbols expose probe § 5 contract (`reference.{step_one,evolve,canonical_params}`; `sim.sim_runner_seeded`; `invariants.{v_max_clamp_respected,particle_count_invariant}`) | `physarum.{reference,sim,invariants}` symbols expose probe § 5 contract (`reference.{step_to_deposit,evolve,canonical_params}`; `sim.sim_runner_seeded`; `invariants.{trail_mass_conserves_modulo_decay,agent_count_invariant}`) |
| 9 | **Two captures** per Appendix D § D.2.3: `captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.{h5,json}` AND `captures/boids-3d-ref/flock-1000agents-seed42-step1000.{h5,json}` | **One capture** per Appendix D § D.2.3: `captures/physarum-ref/network-canonical-seed42-step5000.{h5,json}` |
| 10 | `test_determinism.py::test_run_twice_bit_exact` GREEN on both capture descriptors | `test_determinism.py::test_run_twice_bit_exact_zero_trail_limit` GREEN; `test_run_twice_epsilon_chaotic_regime` advisory at this sub-phase per § 1.4 (Phase 2+ owns) |
| 11 | Hypothesis tests at `boids_3d.invariants` for the 2 declared invariants (spec § 6.6) | Hypothesis tests at `physarum.invariants` for the 2 declared invariants (spec § 6.6) |
| 12 | Row appended to `docs/perf-ledger.md` — one row per descriptor (two rows for boids); mirror Phase 0 RD-2D `hardware_id` format | Row appended for `network-canonical-seed42-step5000` |
| 13 | Phase 1 evidence `boids-3d-2026-05-20T13-04-01Z.txt` (sha256 `7d59ffdb…39b7b`) still matches; replay at SHA `5dd919c` reproduces the RED collection-error mode; HEAD GREEN | Phase 1 evidence `physarum-2026-05-20T13-04-01Z.txt` (sha256 `8ee52dc7…3855`) still matches; replay at `5dd919c` reproduces RED; HEAD GREEN |

Acceptance for "sub-phase complete": all 13 gates GREEN for both sims; Cat 1/2/3/4/5/X GREEN at HEAD (or DEGRADED-PASS with explicit per-deferral rationale per Phase 1 audit § 7 Step 5a precedent); mutation artifact committed; landing audit committed; SHA back-fill committed. **No `-phase-N` tag is pushed**; optional non-phase point-release tag (`v0.1.2`, no suffix) is a banked operator decision at Stage 2 close (§ 5 / § 11.4).

---

## § 3. IC contracts inherited (not redefined)

- **IC-2** (capture I/O Python) — `common_py.capture.Writer` writes the canonical captures. (Closed-form Stage 1 shift S6 documented that the in-practice surface used by the closed-form sub-phase was `tools/testkit/capture` directly; agent-based Stage 1 re-anchors and applies the same equivalence at HEAD.)
- **IC-4** (determinism config Python) — `common_py.determinism.Config` plumbs seed. **Load-bearing for agent-based** per § 1.4: every stochastic step (physarum tie-break) draws from a seeded PRNG threaded through `Config`.
- **IC-5** (Tier 2 **particle** diagnostics) — `diagnostics.tier2.particle.*` consumed by both sims' `test_diagnostics.py`. **This sub-phase's load-bearing Tier 2 substack** (the closed-form sub-phase's load-bearing substack was IC-7 `closed_form`; the agent-based pair pivots to IC-5 `particle`).
- **Phase-0 scalar_field substack** — physarum's `test_diagnostics.py` additionally consumes `diagnostics.tier2.scalar_field.{check_bounds,check_conservation}`; trail-map field. No new IC; already shipped at Phase 0.
- **IC-8** (probe report) — `tools/testkit/probes/reports/{boids-3d,physarum}.md` § 5 is the public-API contract this sub-phase implements against.
- **IC-9** (phase audit body) — this sub-phase's checkpoint + landing audits follow Phase 1 charter § 3.9 structure.
- **IC-10** (spec § 6 verification posture) — pinned at Phase 1; this sub-phase implements against it.

No new ICs. Stage 0 replay against the 8-gate set catches any consumed-surface drift. The IC-7→IC-5 substack pivot is the only IC delta vs the closed-form sub-phase; Stage 1's diagnostics tests resolve `diagnostics.tier2.particle.*` rather than `diagnostics.tier2.closed_form.*`.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay (8-gate canonical set).**
  ```
  uv run python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  Replay target is `phase-1` → `v0.1.0-phase-1` per `_resolve_phase_handle`'s single-integer regex; **NOT** the closed-form sub-phase landing (charter § 11.4 — closed-form is a sibling, not a parent, and the resolver mechanically rejects multi-segment / suffixed phase handles). Closed-form sub-phase audit § 8.1 entry "replay invocation form `uv run python -m …`" is the workspace-validated form; carry it forward.
  Exit 0 → proceed. Exit 1 → BLOCKED (parent playbook P20); write `docs/_audits/phase-1/sub-phase-agent-based/stage-0-blocked-replay-<UTC>.md`.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-agent-based"`, bump `opened_at`. NO `[budgets.*]` widening (per spec § 2.6 a widening needs separate operator amendment). Commit: `chore(agent-based-stage0-tolerance-budget): sub-phase carryover from phase-1`.

- **Task 0.2 — Re-verify Phase 1 failing-tests evidence sha256.** Hash both `tools/testkit/failing-tests-evidence/{boids-3d,physarum}-2026-05-20T13-04-01Z.txt`; compare to the Phase 1 landing audit's `evidence_hashes:` values (`7d59ffdb…39b7b`, `8ee52dc7…3855`). Mismatch → BLOCKED (gate-13 precondition).

- **Closing.** `docs/_audits/phase-1/sub-phase-agent-based/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` (Phase 1 shift #19; closed-form audit § 8.2 N2 reinforces this is load-bearing at EVERY stage close, not just landing). Commit: `chore(agent-based-stage0-checkpoint): Stage 0 pre-flight complete`. Apply Convention #12 SHA back-fill if the closing-commit SHA differs from the audit's `head_sha:` value: NEW commit `chore(agent-based-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1 — Per-sim implementation (one session per sim)

Order: **boids-3d → physarum**. Per sim, one commit covers all gates 4–13. Per-sim 8-step sequence inherited from `sub-phase-closed-form.md` § 4.2 with the following deltas:

1. **Implement.** `<sim>.reference`, `<sim>.sim` (`sim_runner_seeded` matching testkit `SimRunner` Protocol), `<sim>.invariants`. **Determinism-strategy declaration first** per § 1.4: before any implementation, the agent records (a) the reduction-ordering posture, (b) the index-sorting / iteration-order pinning for any potentially-non-deterministic operation, (c) the RNG threading through `common_py.determinism.Config`. Recorded as a docstring at the top of `<sim>.sim` and cited in the Stage 1 commit message footer.
2. **Run `pytest packages/<sim>/tests/ -v`** → all test files GREEN. Capture verbatim to `tools/testkit/failing-tests-evidence/<sim>-implemented-<UTC>.txt`; sha256 it. Phase 1 RED evidence is UNTOUCHED.
3. **Produce canonical captures (gate 9).** Boids: TWO captures (`flock-3agents-canonical-seed42-step1000`, `flock-1000agents-seed42-step1000`). Physarum: ONE capture (`network-canonical-seed42-step5000`). Written under `captures/<sim>-ref/` per Appendix D § D.2.3. Use the same capture-writer surface validated by the closed-form sub-phase (`tools/testkit/capture` per closed-form Stage 1 shift S6, which implements spec § 2.7 schema; on-disk bytes equivalent to the IC-2 wrapper).
4. **Determinism (gate 10).** Capture-twice-and-diff via `tools/testkit/determinism/`. Boids: bit-exact at both descriptors. Physarum: bit-exact at the zero-trail deterministic limit (`test_run_twice_bit_exact_zero_trail_limit`); the chaotic-regime test (`test_run_twice_epsilon_chaotic_regime`) is **advisory at this sub-phase** per § 1.4 — record the actual epsilon distance observed but do not block on it (Phase 2+ Stack B port owns the cross-stack distributional posture per spec § 2.6 / § 5.3).
5. **PBT (gate 11).** Hypothesis tests for the 2 invariants declared per sim in Phase 1 spec § 6.6; commit `.hypothesis/` example database per spec § 2.14. R6 (Hypothesis testkit strategies file) inherited verbatim from closed-form sub-phase § 9 R1 — extend `<sim>.invariants` additively; do NOT modify `tools/testkit/property/strategies.py`.
6. **Perf-ledger row (gate 12).** Append per descriptor: two rows for boids (one per descriptor), one row for physarum. Mirror Phase 0 RD-2D `hardware_id` format exactly (closed-form Stage 1 shift S2 concretized `i7-12700KF-linux-6.17`; re-anchor at Stage 1 — the actual hardware may differ).
7. **Gate-13 verification.** `git worktree add /tmp/bp-replay-5dd919c-<sim> 5dd919c` (NOT `git checkout 5dd919c -- packages/<sim>/tests/` — closed-form Stage 1 shift S5 documented the partial-checkout form leaves HEAD implementation modules in place and shifts the failure mode; worktree is the validated form). Run `PYTHONPATH=. uv run pytest packages/<sim>/tests/ -v` in the worktree; sha256 the output; assert the failure-mode matches the Phase 1 RED evidence file's failure-mode (NOT full text — pytest banners include timestamps per Phase 1 audit § 5b; load-bearing checks are sha256-of-on-disk-evidence + failure-mode reproduction). Remove the worktree (`git worktree remove --force`).
8. **Commit.** `feat(agent-based-stage1-<sim>): implementation through gate 13`. Footer cites: Phase 1 RED evidence + sha256, new GREEN evidence + sha256, capture sidecar paths (with sha256 of each `.h5`), perf-ledger wall_clock_seconds, **determinism-strategy declaration summary** (per § 1.4).

REPEAT for physarum.

**Closing.** `docs/_audits/phase-1/sub-phase-agent-based/stage-1-checkpoint-<UTC>.md` per IC-9. Body: per sim, 13-row gate-status table + capture sha256(s) + GREEN evidence sha256 + gate-13 replay outcome + **determinism-strategy declaration summary** + SHIFTED / banked items (especially B17 status carried in from closed-form audit § 9). Front-matter: both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(agent-based-stage1-checkpoint): Stage 1 per-sim implementation complete`. Apply Convention #12 SHA back-fill commit if needed (per closed-form audit § 8.2 N2).

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

Inherits `sub-phase-closed-form.md` § 4.3 Steps 2.1 → 2.11 structure. Deltas:

- **Step 2.1 — Closing-commit anchor re-check** (Convention 7.9). Re-grep every concrete path / SHA / sha256 across this plan + both stage checkpoints + new spec § 5 deliverables + probe reports + closed-form audit (which is an input contract). Drift → SHIFTED addendum.

- **Step 2.2 — Test sweep.** Both agent-based sims GREEN at HEAD; closed-form pair STILL GREEN (regression); Phase 0 RD-2D GREEN (regression); other 5 Phase 1 sims still RED with `ModuleNotFoundError` (unaffected: eulerian-smoke, lattice-boltzmann-d3q19, mpm-multimaterial, reaction-diffusion-3d, sph-water); `tools/diagnostics`, `tools/testkit`, `tools/integrity` GREEN. Apply Stage 1 closed-form shift N1: invoke pytest one package at a time (each `tests/conftest.py` shares module path).

- **Step 2.3 — Integrity sweep (Cat 1, 2, 3, 4, 5, X) + Cat 3 _SUBDIRS_PICKED_UP decision.** Cat 3 for the agent-based subdir is the load-bearing call this stage. Closed-form audit § 8.2 N4 documented that `_SUBDIRS_PICKED_UP` was extended additively for the `closed-form/` subdir only, and explicitly noted: "Picking up agent-based / hybrid-pg / lattice / particle-fluids would currently HARD_FAIL on the anchor-count (each table has only 1 anchor < spec § 2.4's ≥ 3)". For this sub-phase the agent re-anchors:
  - Count the **discrete-anchor structure** in `tools/testkit/golden/tables/agent-based/{boids-3agent-step1,physarum-deposit-step1}.json` as the Cat 3 checker reads it (the existing tables store three references inside one `independent_reference.source` field — verify the checker's actual count semantics at HEAD).
  - **Decision A (preferred if achievable additively):** lift each agent-based golden table to ≥ 3 discrete anchors (split the multi-citation `source` block into 3 `independent_reference` array entries, preserving every existing citation verbatim) AND add `Path("agent-based")` to the `_SUBDIRS_PICKED_UP` tuple at `tools/integrity/integrity/cat3_numerical/golden_values.py`. Commits: `chore(agent-based-stage2-cat3-anchors): lift agent-based goldens to ≥ 3 discrete anchors` + `chore(agent-based-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for agent-based subdir`. Cat 3 then runs live for both subdirs.
  - **Decision B (bank, only if Decision A non-additive at HEAD):** record in landing audit § 9 that agent-based subdir is banked to the next per-sim implementation sub-phase (continuous-CA) for pickup; no commit. The agent does NOT modify the existing closed-form-subdir Cat 3 wiring.
  Decision recorded in landing audit § 8 (new shift) with rationale.

- **Step 2.4 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits. `sha256:HEX` prefix is tool-accepted at HEAD (closed-form Stage 2 N3 / commit `3b79cfa`); use the prefix form throughout.

- **Step 2.5 — Gate-13 replay verification per sim.** Re-run Stage 1 step 7 from the landing perspective (worktree at `5dd919c`); record both the Phase 1 RED replay outcome and the HEAD GREEN outcome as FACT in the landing audit. Worktree removed post-replay.

- **Step 2.6 — Append-only check.** CI semantics + strict-mode. The append-only protected set now includes Phase 0 + Phase 1 Stage 3 audits + the closed-form sub-phase's entire audit chain (Stage 0 / Stage 1 checkpoints + landing audit + SHA back-fill). No edits to any file present at the closed-form sub-phase landing SHA (`2cc0f21`) within those protected paths.

- **Step 2.7 — Mutation-score artifact (B17 routing decision, carried in from closed-form audit § 9).** Closed-form audit § 7.6 re-banked B17 PATH-A to "the next per-sim implementation sub-phase (agent-based: boids-3d + physarum), unless the operator re-routes ownership at dispatch time to continuous-CA per Phase 1 audit § 13." This sub-phase therefore inherits B17 ownership by default. The plan does NOT pre-decide:
  - **PATH-A** — add per-sim mutmut targets (`boids_3d`, `physarum`) to `mutmut-config.toml`; rework the runner harness for uv-workspace member-import resolution; produce real per-target kill-rate baseline against spec § 2.13 thresholds. Commit: `chore(agent-based-stage2-mutation-runners): per-target rewrite + first real baseline`. Captures the infrastructure for ALL subsequent per-sim sub-phases (lower amortization cost than closed-form's two-sim surface).
  - **PATH-B** — produce framework-validated `tools/testkit/mutation/sub-phase-agent-based-<UTC>.json` with `sub-phase-agent-based` provenance; re-bank B17 again, owner-routable to continuous-CA per closed-form audit § 7.6 / Phase 1 audit § 13 (continuous-CA is the larger Stack-C surface that amortizes the rework best). Commit: `chore(agent-based-stage2-mutation-baseline): framework-validated carry-forward + B17 re-bank`.
  Either path: record artifact sha256 in landing audit `evidence_hashes:`. Record decision rationale. **Default lean** (closed-form audit § 7.6 continued): continuous-CA is the better PATH-A surface, so PATH-B re-bank is the lean — but this is not a pre-commitment.

- **Step 2.8 — CHANGELOG additive entry.** Append `### sub-phase-agent-based` heading under `[Unreleased]` (no semver section — no tag). Itemize per-sim gate-13 GREEN-flip + capture descriptors landed + perf-ledger first-landing rows + Cat 3 disposition (A or B) + B17 disposition (A or B). Commit: `docs(agent-based-stage2-changelog): sub-phase-agent-based entry`.

- **Step 2.9 — Sub-phase landing audit.** `docs/_audits/phase-1/sub-phase-agent-based/landing-<UTC>.md` per IC-9 body. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-agent-based`, both `head_sha:` AND `head_sha_at_checkpoint:`. `evidence_paths:` + `evidence_hashes:` enumerate both stage-checkpoint logs + mutation JSON + both Phase 1 RED evidence files (FACT-tagged as still-matching) + both sub-phase GREEN evidence files + all three (boids 2 + physarum 1) capture sidecars + perf-ledger + CHANGELOG. Verdict-state CONFIRMED. Commit: `chore(agent-based-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.10 — Convention #12 SHA back-fill.** `git rev-parse HEAD` → replace placeholder; new commit. NEVER `--amend`. Commit: `chore(agent-based-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.11 — Final summary.** No `-phase-N` tag is proposed. Optional `v0.1.2` non-phase point-release tag banked for operator. Surface to operator with landing-audit path, gate-status table, B17 disposition, Cat 3 disposition, and next-sub-phase recommendation (continuous-CA + sph-water per Phase 1 audit § 15 / closed-form audit § 10 — with the § 11.2 scope-flag below).

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-closed-form.md` § 5. Identity reads "agent-based sub-phase coordinator chat"; § 7 prompts are the dispatchable units.

**Tag posture.** Same as closed-form sub-phase § 5 + § 11.4. No `-phase-N` tag. Lean: no intermediate tag. Optional non-phase point-release `v0.1.2` (no `-phase-N` suffix) is a banked operator decision. The agent never pushes any tag (operator-only per spec § 7.12).

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / closed-form sub-phase § 6 verbatim; identity reads "agent-based sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + evidence reverify | pending | — | — | — |
| 1 | boids-3d implementation | pending | — | — | — |
| 1 | physarum implementation | pending | — | — | — |
| 2 | integrity + replay sweep + Cat 3 decision | pending | — | — | — |
| 2 | mutation artifact (B17 PATH-A or PATH-B) | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these **sub-phase conventions** (inherited from `sub-phase-closed-form.md` § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` + `agent-based-stage<N>-<scope>` (non-phase form; no `-phase-N` tag exists).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`.
- Stack B is pytest. Goldens at `tools/testkit/golden/tables/agent-based/`.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` (Phase 1 shift #19; closed-form audit § 8.2 N2 reinforces this applies at EVERY stage close).
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1` OR within the closed-form sub-phase audit chain (closed-form landing SHA `2cc0f21`).
- Convention #12 — never `--amend`. SHA back-fill is a follow-up commit at EVERY stage close (closed-form audit § 8.2 N2 raised this from "landing-only" to "every-stage-close" discipline).
- Operator-only tag-pushing per spec § 7.12; the agent NEVER runs `git tag` or `git push origin <tag>`.
- `verify_evidence` accepts `sha256:HEX` prefix at HEAD (closed-form Stage 2 N3 / commit `3b79cfa`); use the prefix form in `evidence_hashes:` throughout.
- When stuck → Phase 1 charter § 9 playbook + closed-form sub-phase § 9 + this sub-phase's § 9 (the new P22 determinism-debug entry).

### § 7.1 Stage 0 — Pre-flight

```
You are the agent-based sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-agent-based.md (this sub-phase's charter — source of truth). § 7 standing orders are inherited; apply them.
  2. docs/phases/sub-phase-closed-form.md (parent sub-phase template; this charter inherits its structure).
  3. docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md (parent landing audit — input contract; § 8 lists 32 cumulative inherited shifts; do NOT propose corrections to them; § 9 lists open banked items, including B17 carried into this sub-phase).
  4. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing audit — § 14 the 21 baseline shifts).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA 9998bc1); closed-form sub-phase landed at 2cc0f21. Stage 0 is pre-flight only; you do NOT implement either sim.

Execute Tasks 0.0 → 0.1 → 0.2 → closing per sub-phase charter § 4.1 exactly:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate canonical set. Use the `uv run python -m …` invocation form validated by closed-form Stage 0. Exit 0 → proceed. Exit 1 → write docs/_audits/phase-1/sub-phase-agent-based/stage-0-blocked-replay-<UTC>.md per playbook P20; surface; stop.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-agent-based"; bump opened_at. NO [budgets.*] widening. Commit per charter § 4.1.

  Task 0.2 — sha256sum both Phase 1 failing-tests-evidence files for boids-3d + physarum; compare to the values in the Phase 1 landing audit's evidence_hashes: (charter § 1.3 has the verbatim values). Mismatch → BLOCKED (gate-13 precondition).

  Closing — Commit docs/_audits/phase-1/sub-phase-agent-based/stage-0-checkpoint-<UTC>.md per IC-9 abbreviated structure. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit per charter § 4.1, then apply Convention #12 SHA back-fill (closed-form audit § 8.2 N2): if HEAD differs from the audit's head_sha:, new commit `chore(agent-based-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`. Surface and stop.

Out of scope: any sim work; any edit outside tolerance-budget.toml + new audit files.
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the agent-based sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-agent-based.md §§ 1.4 (determinism posture), 2 (per-gate deliverables), 3 (IC contracts), 4.2 (Stage 1 8-step sequence), 7 (standing orders), 9 (R6 + P22 playbook entry).
  2. docs/phases/sub-phase-closed-form.md § 4.2 (the parent 8-step sequence — applies wholesale with the deltas in § 4.2 of this charter).
  3. docs/_audits/phase-1/sub-phase-agent-based/stage-0-checkpoint-<UTC>.md (Stage 0 pre-flight; replay PASS confirmed).
  4. PER SIM, before drafting that sim's bundle: docs/sim-specs/agent-based/<sim>/{README,spec-ref,algebraic,determinism,equivalence}.md, tools/testkit/probes/reports/<sim>.md (§ 5 is the API contract), packages/<sim>/tests/*.py (the GREEN target), tools/testkit/golden/tables/agent-based/<golden>.json (DO NOT modify; match its values).

Scope — two sims, in order:
  1. boids-3d (closed-form arithmetic on 3-agent fixture; two canonical captures per Appendix D § D.2.3: flock-3agents-canonical-seed42-step1000 + flock-1000agents-seed42-step1000).
  2. physarum (deposit-step closed-form-deterministic-limit golden; one canonical capture: network-canonical-seed42-step5000; chaotic-regime determinism test is advisory per charter § 1.4).

**Determinism-strategy declaration first** (charter § 1.4 — load-bearing for this sub-phase). Before drafting either sim's implementation, write the determinism strategy as a docstring at the top of <sim>.sim:
  - which reductions are sequenced and in what order
  - which index orderings / iteration orders are pinned and how
  - which RNG draws are threaded through common_py.determinism.Config
  - which (if any) operations are deliberately deferred to Phase 2+ (e.g. physarum chaotic-regime distributional posture; Stack B atomics ordering)
Cite this docstring in the Stage 1 commit message footer.

Per sim, deliver gates 4–13 in one sub-bundle commit per the 8-step sequence in charter § 4.2:
  1. Implement <sim>.reference, <sim>.sim (with the determinism docstring), <sim>.invariants per probe § 5.
  2. pytest packages/<sim>/tests/ -v → all GREEN; capture verbatim to tools/testkit/failing-tests-evidence/<sim>-implemented-<UTC>.txt + sha256. Phase 1 RED evidence UNTOUCHED (gate-13 anchor).
  3. Produce canonical capture(s) — TWO for boids, ONE for physarum — via sim_runner_seeded; write captures/<sim>-ref/<descriptor>.{h5,json}. Descriptors per spec Appendix D § D.2.3 (charter § 1.3 lists them verbatim).
  4. Determinism: capture-twice-and-diff. Boids: bit-exact at both descriptors. Physarum: bit-exact at zero-trail deterministic limit; chaotic-regime test advisory (charter § 1.4).
  5. PBT: 2 invariants per sim per spec § 6.6; commit .hypothesis/ DB.
  6. Perf-ledger: one row per descriptor (two rows for boids, one for physarum); mirror Phase 0 RD-2D hardware_id format.
  7. Gate-13 verification: git worktree add /tmp/bp-replay-5dd919c-<sim> 5dd919c (NOT partial checkout per closed-form S5); run PYTHONPATH=. uv run pytest packages/<sim>/tests/ -v in the worktree; sha256 the output; assert failure-mode reproduction matches Phase 1 RED evidence. Remove the worktree.
  8. Commit: feat(agent-based-stage1-<sim>): implementation through gate 13. Footer cites Phase 1 RED evidence sha256, new GREEN evidence sha256, all capture sidecar paths + .h5 sha256s, perf-ledger wall_clock_seconds, determinism-strategy declaration summary.

REPEAT for physarum.

Closing — Commit docs/_audits/phase-1/sub-phase-agent-based/stage-1-checkpoint-<UTC>.md per IC-9. Body: per sim, 13-row gate-status table + capture sha256(s) + GREEN evidence sha256 + gate-13 replay outcome + determinism-strategy declaration summary + SHIFTED/banked items (especially B17 status carried in). Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit: chore(agent-based-stage1-checkpoint): Stage 1 per-sim implementation complete. Apply Convention #12 SHA back-fill if needed (closed-form audit § 8.2 N2). Then stop.

Out of scope: modifying any Phase 1, closed-form-sub-phase, or Phase 0 artifact; implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); reworking tools/testkit/mutation/ runners (Stage 2's B17 decision); Stack B WebGPU implementation (Phase 2+).

Stuck → charter § 9 (P22 determinism debug) + closed-form sub-phase § 9 + Phase 1 charter § 9 (P9, P10, P12, P14 especially).
```

### § 7.3 Stage 2 — Landing

```
You are the agent-based sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-agent-based.md §§ 4.3, 7.
  2. docs/_audits/phase-1/sub-phase-agent-based/stage-0-checkpoint-<UTC>.md, docs/_audits/phase-1/sub-phase-agent-based/stage-1-checkpoint-<UTC>.md.
  3. docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md (parent landing audit — § 7.6 B17 routing context; § 8.2 N4 Cat 3 anchor-count context; § 9 banked items inherited).
  4. docs/phases/sub-phase-closed-form.md § 4.3 (parent Stage 2 step structure).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per charter § 4.3 exactly. Load-bearing items:

  Step 2.3 — Cat 3 _SUBDIRS_PICKED_UP decision. Closed-form audit § 8.2 N4 explicitly flagged that picking up the agent-based subdir at HEAD would HARD_FAIL on anchor-count (each table records its citations in one `independent_reference.source` block; the Cat 3 checker counts discrete-anchor structure). Verify the checker's actual count semantics at HEAD by reading tools/integrity/integrity/cat3_numerical/golden_values.py + running it against the agent-based subdir. Then choose:
    Decision A (preferred if additive): lift each agent-based golden table to ≥ 3 discrete `independent_reference` array entries (split the existing multi-citation source into 3 entries, preserving every citation verbatim — no information loss); add Path("agent-based") to _SUBDIRS_PICKED_UP. Two commits per charter § 4.3 Step 2.3.
    Decision B (bank): record in landing audit § 9 that agent-based subdir is banked to continuous-CA sub-phase; no commit.
  Either decision is appended to the SHIFTED register as a new entry.

  Step 2.5 — Gate-13 replay per sim. Worktree at 5dd919c (NOT partial checkout). Record both RED-replay outcome and HEAD-GREEN outcome as FACT.

  Step 2.7 — Mutation-score artifact (B17 routing). Carried in from closed-form audit § 7.6. Charter § 4.3 Step 2.7 brackets PATH-A (per-sim mutmut targets for boids_3d + physarum + runner rework + real per-target baseline; commit chore(agent-based-stage2-mutation-runners): per-target rewrite + first real baseline) vs PATH-B (framework-validated carry-forward + re-bank again, owner-routable to continuous-CA; commit chore(agent-based-stage2-mutation-baseline): framework-validated carry-forward + B17 re-bank). Default lean per closed-form audit § 7.6 continued: continuous-CA is the better PATH-A surface (Stack-C amortization); PATH-B re-bank is the lean. Not a pre-commitment. Record artifact sha256 in landing audit evidence_hashes:.

  Step 2.9 — Sub-phase landing audit. docs/_audits/phase-1/sub-phase-agent-based/landing-<UTC>.md per IC-9. Front-matter: artifact: sub-phase, artifact_id: sub-phase-agent-based, both head_sha: AND head_sha_at_checkpoint:. evidence_paths: + evidence_hashes: enumerate every artifact (charter § 4.3 Step 2.9 has the verbatim list). Verdict-state CONFIRMED.

  Step 2.10 — SHA back-fill (Convention #12) — git rev-parse HEAD → replace placeholders; new commit. NEVER --amend.

  Step 2.11 — Final summary. NO -phase-N tag. Surface to operator: "Agent-based sub-phase landed at SHA <final>. Both agent-based sims now ship all 13 gates GREEN. Phase 0 + Phase 1 + closed-form sub-phase infrastructure unaffected; other 5 Phase 1 sims still RED with ModuleNotFoundError pending their own per-sim implementation sub-phases. B17 disposition: <A or B>. Cat 3 disposition: <A or B>. No -phase-N tag pushed; optional non-phase point-release tag (e.g., v0.1.2) is a banked operator decision. Next sub-phase: continuous-CA + sph-water per Phase 1 audit § 15 — see charter § 11.2 for the probable scope-decomposition flag."

Stuck → charter § 9 + closed-form sub-phase § 9 + Phase 1 charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits `sub-phase-closed-form.md` § 8 verbatim. Paths:
- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-agent-based/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself (no separate checkpoint).
- Continuation prompt with `agent-based-stage<N>-...` slug.

**Convention #12 SHA back-fill at EVERY stage close**, not landing-only. Closed-form audit § 8.2 N2 explicitly surfaced a Stage 0 SHA back-fill omission as a load-bearing defect (the Stage 0 checkpoint audit's `head_sha:` was set to the prior tolerance-budget commit rather than the closing-commit). This sub-phase applies the back-fill discipline at the close of every stage where the audit's recorded `head_sha:` differs from the actual closing-commit SHA.

---

## § 9. Risk surface — sub-phase-specific

Beyond `sub-phase-closed-form.md` § 9 (inherited verbatim — R1 PBT framework, R2 perf-ledger format, R3 gate-13 replay reproducibility, R5 Cat 3 `_gather_tables`, R6 sim_runner Protocol drift; the closed-form R4 B17 PATH-A vs PATH-B is now load-bearing again here):

- **R7 (determinism strategy declaration enforcement).** Per § 1.4, agent-based determinism is not trivial; Stage 1 step 1 requires the strategy declaration be written BEFORE implementation. Risk: agent drafts implementation first and writes the docstring retroactively, missing a non-deterministic-ordering bug that the declaration would have surfaced. Mitigation: § 7.2 prompt orders the steps; commit message footer must cite the declaration as a load-bearing artifact.

- **R8 (Cat 3 anchor-count format vs intent).** The agent-based golden tables record three references but in one `source` block — closed-form audit § 8.2 N4 documented this counts as 1 anchor by the checker. Stage 2 Step 2.3 surfaces and decides; Decision A is additive (no information loss) but requires a precise lift of every existing citation into a discrete entry.

- **R9 (physarum two-descriptor capture vs one).** Probe report § 4 lists `tests/fixtures/legacy-captures/physarum-ref.{h5,json}` as a placeholder for `physarum-jones-256x256-seed42-step10000`, but Appendix D § D.2.3 (the authoritative table per spec § 2.7) names `network-canonical-seed42-step5000`. The two-name discrepancy is a probe-vs-spec drift; Appendix D wins per spec § 2.7. Stage 1 step 3 uses the Appendix D name; the probe-report drift is documented as a SHIFTED entry in Stage 1's checkpoint.

### § 9.1 New playbook entry (P22)

> **P22 — Agent-based determinism debugging when a sim is bit-non-reproducible across runs.**
> *When to apply:* gate-10 capture-twice-and-diff fails for an agent-based sim that the determinism declaration claims is `bit-exact-same-hw`.
> *Common causes, in priority order:*
> 1. **Unordered reduction over agent set** — e.g. summing forces over a neighbor list whose ordering depends on iteration of an unsorted set/dict. Fix: sort the neighbor list by stable agent id before the reduction.
> 2. **`numpy.add.at` over an unsorted index** — atomic-equivalent scatter-add. Fix: sort the index before the scatter, OR use `numpy.bincount` with an ordered length.
> 3. **Python dict / set iteration order leaking** through `dict.items()` on an agent state map. Fix: explicit `sorted(...)` at every iteration site.
> 4. **Hypothesis-generated input non-determinism** — fixed-seed config not threaded through `common_py.determinism.Config` into every stochastic step (physarum tie-break is the canonical site). Fix: re-thread; assert the seed flows through every stochastic draw.
> 5. **NumPy default RNG global state** — `numpy.random.*` (vs explicit `Generator`) uses process-global state that the seed harness does not pin. Fix: use `np.random.default_rng(seed)` exclusively; ban bare `np.random.*` in `<sim>.reference` and `<sim>.sim`.
> 6. **FMA fusion drift across runs of the same Python process** — extremely rare in pure NumPy; if suspected, pin BLAS / NumPy thread count to 1 and re-run.
> *Debug-step ordering:* binary-search the step count (capture at step 1, step N/2, step N) to localize when the divergence first appears; then binary-search the per-step computation (force calc, position update, deposit) using a single-step harness.

---

## § 10. Audit-trail discipline

Inherits `sub-phase-closed-form.md` § 10 verbatim. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-agent-based/`. Convention #12 SHA back-fill applies at every stage close (closed-form audit § 8.2 N2). Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` OR within the closed-form sub-phase audit chain at SHA `2cc0f21`.

Audit front-matter `artifact:` enum (spec § 7.13 / Appendix-D canonical schema): Stage 0 + Stage 1 checkpoints use `artifact: stage` (`artifact_id: agent-based-stage-0` / `agent-based-stage-1`); Stage 2 landing audit uses `artifact: sub-phase` (`artifact_id: sub-phase-agent-based`).

---

## § 11. Sub-phase coherence

### § 11.1 Phase 1 + closed-form sub-phase → this sub-phase (inputs)

Verified by Stage 0 Task 0.0 replay against the 8-gate set:

- Both agent-based TDD bundles (5 spec docs + 1 probe + 4 failing tests per sim) at SHA `5dd919c`.
- Goldens at `tools/testkit/golden/tables/agent-based/{boids-3agent-step1,physarum-deposit-step1}.json`.
- IC-2 / IC-4 / IC-5 infrastructure (common_py + tier2/particle + tier2/scalar_field).
- The 32 cumulative shifts (21 Phase 1 + 6 closed-form Stage 1 + 5 closed-form Stage 2) — baseline reality; do NOT propose corrections.
- Closed-form sub-phase's resolved items: Cat 3 `closed-form` subdir picked up (commit `20d02e0`); `verify_evidence` `sha256:` prefix tolerance (commit `3b79cfa`); both apply to this sub-phase as established tool behavior.

### § 11.2 Banked items inherited (and probable scope flag for the next sub-phase)

- **B17** (per-target mutation runners + first real kill-rate baseline). Stage 2 Step 2.7 PATH-A vs PATH-B decision. Default lean per closed-form audit § 7.6: PATH-B re-bank, owner-routable to continuous-CA.
- **Cat 3 _SUBDIRS_PICKED_UP for agent-based subdir** (closed-form audit § 8.2 N4). Stage 2 Step 2.3 Decision A (lift + pick up) vs Decision B (bank).
- **Cat 3 _SUBDIRS_PICKED_UP for hybrid-pg / lattice / particle-fluids subdirs** (closed-form audit § 9). Untouched by this sub-phase; each subdir is the work of its own per-sim implementation sub-phase. Mpm-multimaterial is hybrid-pg; sph-water is particle-fluids; lattice-boltzmann is lattice. Same anchor-count lift discipline applies to each.
- **Cat 3 evaluator shims** for `lorenz-structural-invariants` and `mandelbulb-distance-estimator-p8-quilez-2009` (closed-form audit § 9 banked). Out of agent-based scope; continuous-CA sub-phase may pick up additively.
- **B2 / B3 / B4 / B5 / B6 / B11 / B16** (Phase 1 open). Out of this sub-phase's scope.

**Probable scope flag for the NEXT sub-phase (continuous-CA):** the next sub-phase per Phase 1 audit § 15 / closed-form audit § 10 row 2 bundles **reaction-diffusion-3d + sph-water**, and per closed-form audit § 7.6 / Phase 1 audit § 13 may additionally take over B17 PATH-A ownership. This is a larger surface than either the closed-form pair (2 sims, no MMS) or the agent-based pair (2 sims, no MMS, particle/scalar_field tier-2 IC-5). RD-3D introduces first Stack C MMS work; sph-water consumes Phase-0-vendored SPlisHSPlasH. The continuous-CA sub-phase plan may warrant decomposition into two sub-sub-phases (RD-3D alone first, sph-water second) or a different stage decomposition. This is **not** a decision of this sub-phase; surface it in the agent-based landing audit § 10 (Next-sub-phase recommendations) as a flag for the operator dispatching the continuous-CA plan-drafting session.

### § 11.3 This sub-phase → subsequent per-sim sub-phases (outputs)

- Both agent-based sims through 13 gates GREEN — equivalence baseline for Phase 2 cross-stack (Stack B → other-stack ports for Stack-C-defined sims; agent-based sims are Stack-B-only by design per spec § 5.3, so the cross-stack target is `Stack B (Python reference) → Stack B (WebGPU)` at Phase 2).
- Three new canonical captures land in `captures/` per Appendix D § D.2.3 (two for boids, one for physarum) — first-class entries in the legacy-capture corpus.
- IC-5 particle tier-2 substack exercised end-to-end for the first time at sim-test scale (Phase 0 / Phase 1 stubs only).
- Determinism-strategy-declaration discipline (§ 1.4) is the new template subsequent per-sim sub-phases with non-trivial determinism (sph-water atomics, MPM scatter, LBM bit-exact effort, smoke FMA fusion) inherit.
- P22 playbook entry added; subsequent per-sim sub-phases with parallel-reduction risk inherit.
- B17 disposed (PATH-A landed OR re-banked to continuous-CA); Cat 3 agent-based subdir disposed (Decision A landed OR banked to continuous-CA).

### § 11.4 Replay-chain non-participation + tag posture

Inherits `sub-phase-closed-form.md` § 11.4 verbatim with identifier substitutions. This sub-phase does NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (spec-Phase-2 Stage 0) replays against `v0.1.0-phase-1` — NOT against the closed-form sub-phase, NOT against this sub-phase. The replay resolver's regex `^phase-(\d+)$` (single integer) and `^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` (single integer N) at `tools/integrity/integrity/scripts/replay_prior_phase.py` mechanically prevent multi-segment or suffixed phase tags from resolving.

What protects this sub-phase's work across the gap to spec-Phase-2 is spec § 3.5 gate 13: the Phase 1 failing-tests-evidence sha256s (`7d59ffdb…39b7b` for boids-3d, `8ee52dc7…3855` for physarum) must continue to match at the `v0.1.0-phase-1` commit even after the implementations land here. Implementations consume the bootstrap tests as the GREEN target; they do NOT modify the failing-tests-evidence files. Stage 2 Steps 2.5–2.6 verify this discipline before declaring CONFIRMED.

**Tag-posture decision banked for operator at Stage 2 close:**

- **Lean recommendation: no intermediate tag.** Sub-phase commits accumulate to `main`; the landing audit + per-sim commits provide the audit trail.
- **Alternative: non-phase point-release tag `v0.1.2`** (no `-phase-N` suffix). Distinguishes this sub-phase landing in `git log`. Acceptable per spec § 7.12; operator-pushed.
- **Forbidden either way:** any tag carrying `-phase-N`. Reserved for spec-phase boundaries.

---

*End of agent-based sub-phase charter. Inherits Phase 1's and the closed-form sub-phase's role model, audit discipline, conventions, IC contracts (with the IC-7→IC-5 substack pivot per § 3), and problem-solving playbook wholesale; adds the determinism-strategy declaration discipline (§ 1.4) and the P22 playbook entry (§ 9.1) as deltas required by agent-based dynamics. Establishes that subsequent per-sim implementation sub-phases (continuous-CA + sph-water next, per Phase 1 audit § 15) inherit both deltas.*
