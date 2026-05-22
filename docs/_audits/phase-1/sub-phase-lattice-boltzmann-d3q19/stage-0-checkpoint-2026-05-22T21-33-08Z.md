---
date: 2026-05-22
author: lattice-boltzmann-d3q19-sub-phase-agent
artifact: stage
artifact_id: lattice-boltzmann-d3q19-stage-0
stage: 0-preflight
subject: "LBM sub-phase Stage 0 pre-flight checkpoint (replay PASS bit-identity; NS-2D MMS + D3Q19 golden reverify; Task 0.4 canonical-descriptor scope-analysis FITS both descriptors at full cadence)"
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER-CONVENTION-12-BACKFILL>
head_sha_at_checkpoint: <PLACEHOLDER-CONVENTION-12-BACKFILL>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-1/sub-phase-mutation-script-hotfix/repair-2026-05-22T02-57-31Z.md
  - docs/_audits/phase-1/sub-phase-conventions-consolidation/landing-2026-05-22T03-25-55Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md
evidence_paths:
  - docs/phases/sub-phase-lattice-boltzmann-d3q19.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-evidence/replay-2026-05-22T21-29-20Z.txt
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-evidence/mms-spot-check-2026-05-22T21-31-11Z.txt
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-evidence/scope-analysis-microbench-2026-05-22T21-32-38Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt
  - tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py
  - tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md
  - tools/testkit/golden/tables/lattice/d3q19-equilibrium.json
evidence_hashes:
  docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-evidence/replay-2026-05-22T21-29-20Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-evidence/mms-spot-check-2026-05-22T21-31-11Z.txt: sha256:3bf12716e59374c5a2c9dfc0b17049f92eaca5c5dbcc2609615a422d346cf17c
  docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-evidence/scope-analysis-microbench-2026-05-22T21-32-38Z.txt: sha256:e8541253aefa32b83d09b6a04edd3a3f2d6491519d23678683788b1f5c50f56d
  tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt: sha256:c78de8bee93a5cb06c0ccc78a843766b98c93685b344c63d772cf3374b6ef3cd
  tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py: sha256:30e490a736cbfac26a549180f97219388549465d9d9557de9061106561320d8e
  tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md: sha256:30dfc29483435361881214581f53e026ffd0d856a3ac0657ece9587f4ac86e76
  tools/testkit/golden/tables/lattice/d3q19-equilibrium.json: sha256:47bd1237a5bfcd5e072ae309eb3bf2f3d1313fa442361036aac84605ede93d5c
---

# Lattice-Boltzmann-D3Q19 Sub-Phase — Stage 0 Pre-flight Checkpoint

## 1. Stage 0 scope

(FACT — `docs/phases/sub-phase-lattice-boltzmann-d3q19.md` § 4.1 +
§ 7.1.) Sixth per-sim implementation sub-phase under spec-Phase-1;
first in the `lattice` category (spec § 5.7); second sub-phase to
exercise conventions doc § N (Task 0.4) as established discipline
per the eulerian-smoke landing § 9.3 row 1 graduation
recommendation. Stage 0 is pre-flight only; no LBM implementation.

Five tasks executed per the plan's § 7.1 prompt:

| Task | Result |
|---|---|
| 0.0 — Cross-phase replay (8-gate canonical set) | **PASS** — sha256 byte-identical to bit-identity invariant `9399fc33…909f34` (conventions doc § D.3; **14th invocation**). |
| 0.1 — Tolerance-budget carryover | `[phase].phase = "sub-phase-lattice-boltzmann-d3q19"`; `opened_at = 2026-05-22T21:29:20Z`; NO `[budgets.*]` widening. Commit `c463df0`. |
| 0.2 — LBM Phase 1 RED evidence reverify | **PASS** — `c78de8bee93a5cb06c0ccc78a843766b98c93685b344c63d772cf3374b6ef3cd` matches Phase 1 landing audit § 9. |
| 0.3 — Shared NS-2D MMS + D3Q19 golden reverify + Appendix D drift | **PASS** — solution.py + derivation.md byte-identical since eulerian-smoke consumption; SymPy ≡ NumPy spot-check max diff 9.018e-16 (under 1e-12 tolerance); D3Q19 golden sha256 captured; Appendix D depth resolution surfaced (§ 4). |
| 0.4 — Canonical-descriptor scope-analysis (Poiseuille + Couette) | **FITS both descriptors at full cadence** (§ 5). Per-step floors 1.43 ms / 0.47 ms; with ~1.5× correction, full-runtime projections 2.15 s / 0.35 s — well under 1-hour threshold. NO STOP-AND-SURFACE. |

## 2. Task 0.0 — cross-phase replay

(FACT —
`stage-0-evidence/replay-2026-05-22T21-29-20Z.txt`
sha256 `9399fc33…909f34`.)

Invocation form per conventions doc § D.5:

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

All 8 gates `PASS audit_verdict=None`; summary
`prior_phase=v0.1.0-phase-1 ok=True`. sha256 of the replay output
is **byte-identical** to the bit-identity invariant. This is the
**14th invocation** of the invariant (6 sub-phase Stage 0s + 4
hotfix V validations + 3 LFS-migration verifications + this).

## 3. Task 0.1 — tolerance-budget carryover

(FACT — commit `c463df0`.) Single edit to
`tools/testkit/equivalence/tolerance-budget.toml`:

```diff
 [phase]
-phase = "sub-phase-eulerian-smoke"
-opened_at = "2026-05-22T12:00:56Z"
+phase = "sub-phase-lattice-boltzmann-d3q19"
+opened_at = "2026-05-22T21:29:20Z"
```

The `[budgets.lbm.cross_stack]` row (`relative = 1e-5`,
`absolute = 0.0`) was already present from Phase 1; UNCHANGED.
NO `[budgets.*]` widening.

## 4. Task 0.3 — shared NS-2D MMS + D3Q19 golden reverify + Appendix D drift

### 4.1 Shared NS-2D MMS reverify

(FACT — sha256 spot-check at HEAD.)

| File | Expected (eulerian-smoke Stage 0 / landing § 7.5) | At HEAD |
|---|---|---|
| `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py` | `30e490a7…320d8e` | `30e490a736cbfac26a549180f97219388549465d9d9557de9061106561320d8e` ✓ |
| `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md` | `30dfc294…ac86e76` | `30dfc29483435361881214581f53e026ffd0d856a3ac0657ece9587f4ac86e76` ✓ |

**No drift** since eulerian-smoke consumption + landing audit
§ 7.5 anchor recheck (eulerian-smoke Stage 2 close). LBM is the
**second consumer** of this MMS; the cross-discretization OOA
comparison at Stage 1 § 7.2 step 4 is now well-anchored.

### 4.2 SymPy ≡ NumPy spot-check

(FACT —
`stage-0-evidence/mms-spot-check-2026-05-22T21-31-11Z.txt`
sha256 `3bf12716…346cf17c`.)

Canonical test point per eulerian-smoke landing § 6:
`(x=0.3, y=0.5, t=0.7, ν=0.01)`.

| Quantity | NumPy | SymPy | |diff| |
|---|---|---|---|
| u | -7.274081461543511e-01 | -7.274081461543510e-01 | 1.110e-16 |
| v |  2.894443327591903e-17 |  0.000000000000000e+00 | 2.894e-17 |
| p | -2.793048017920541e-02 | -2.793048017920542e-02 | 6.939e-18 |
| S_u | -2.122091090244276e+00 | -2.122091090244276e+00 | 0.000e+00 |
| S_v | -9.017785535094746e-16 |  0.000000000000000e+00 | 9.018e-16 |

**Max diff: 9.018e-16**  (< 1e-12 tolerance — **PASS**).

Analytic divergence simplifies to `0` (verified via
`sp.simplify(sp.diff(u, x) + sp.diff(v, y))`). The spot-check
matches the eulerian-smoke Stage 0 / landing § 2 finding
(`9.02e-16`) to within rounding — **the shared MMS surface is
discretization-invariant across the two sub-phases that consume
it**.

### 4.3 D3Q19 equilibrium golden reverify

(FACT — sha256 captured at HEAD.)

| File | sha256 (first recording) |
|---|---|
| `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` | `47bd1237a5bfcd5e072ae309eb3bf2f3d1313fa442361036aac84605ede93d5c` |

This is the first sub-phase to consume the D3Q19 golden table;
the sha256 anchor is recorded here as load-bearing for Stage 1
gate-5 (a) at absolute 1e-15 + Stage 2 Cat 3 Decision A lift
preimage. The file at HEAD has **1 `test_points` entry** with **1
packed `independent_reference.source` block containing 4 packed
citations** (hand-derivation; Qian 1992 § 2 eq. (3a) + Table 1;
Krüger 2017 Ch. 3 Table 3.4; Python re-derivation via
`d3q19_equilibrium.py --verify`). Per conventions doc § I.3
anchor-count semantics, this counts as **1 anchor** — below the
spec § 2.4 R9 ≥ 3 floor. **Stage 2 Step 2.3 owns the Decision A
lift** per plan § 4.3 (two-commit pattern: anchor lift +
`_SUBDIRS_PICKED_UP` extend for `lattice`).

### 4.4 Appendix D N_z (third-dimension) resolution

(FACT — Appendix D § D.2.3 vs probe report § 4 drift inherited
from Phase 1 Stage 2 shift #17 — same drift class as
eulerian-smoke; resolved at this Stage 0.)

| Source | LBM `ref` descriptor(s) |
|---|---|
| Appendix D § D.2.3 (load-bearing per shift #17) | `poiseuille-64x32-seed42-step1000` + `couette-32x16-seed42-step500` |
| Probe report § 4 (legacy-capture placeholder) | `poiseuille-channel-32cube-seed42-step5000` |

**Appendix D wins.** The probe report's placeholder name + single
descriptor + 32³ shape + 5000 step count is inherited drift; the
two-descriptor list is canonical.

The "64x32" / "32x16" labels are 2D channel-flow conventions; LBM
is D3Q19 (3D lattice). **The third-dimension (N_z) is NOT
explicitly stated in Appendix D or in any sim-spec doc** —
spec/sim-spec/algebraic only describe 3D lattice constants
without committing to a canonical channel-flow extrusion depth.

**Stage 0 resolution (operator-routable):** **depth-3 z-periodic
slab** (`N_z = 3`).

Rationale:

1. Both Poiseuille and Couette are translation-invariant in z for
   their classic 2D analytic profiles (planar Poiseuille:
   parabolic u_x(y) at all z; planar Couette: linear u_x(y) at
   all z). Choosing a thin z-extrusion preserves the canonical
   benchmark identity without wasting compute on a degree of
   freedom that has no physical content.
2. D3Q19's 19 directions include face neighbors at z=±1 + edge
   neighbors at z=±1. The minimum N_z that exercises the
   19-direction streaming with periodic wraparound and no
   self-wrap-on-one-step is **N_z = 3** (cells at
   z=0,1,2; periodic).
3. Larger N_z (e.g. N_z = N_y) wastes compute + storage on a
   translation-invariant direction; the canonical channel-flow
   profile is unchanged. Stage 0 Task 0.4 (§ 5) confirms depth-3
   fits all ceilings with comfortable headroom.

**Operator may route an alternative N_z** (e.g., square-cubic
N_z=N_y; explicit depth-2 with bidirectional periodicity; or a
spec-amendment to enumerate N_z directly in Appendix D § D.2.3 to
seal the convention). Stage 1 § 7.2 prompt's "depth per Stage 0
Task 0.4" clause picks up the depth-3 resolution unless the
operator routes otherwise. Surface to operator at this Stage 0
close — see § 7.

## 5. Task 0.4 — canonical-descriptor scope-analysis

(FACT —
`stage-0-evidence/scope-analysis-microbench-2026-05-22T21-32-38Z.txt`
sha256 `e8541253…5c50f56d`.)

Hardware at measurement: `i7-12700KF-linux-6.17` (matches
inherited perf-ledger `hardware_id` convention). NumPy
streaming + BGK collision skeletal implementation (pure
`np.roll` + vectorized BGK; no boundary conditions; no capture
serialization — the corrected `~1.5×` factor absorbs the
production-overhead delta per eulerian-smoke § 9.3 row 2).

### 5.1 Poiseuille `poiseuille-64x32-seed42-step1000` (N_z = 3)

| Component | Value | Ceiling | Fits? |
|---|---|---|---|
| Per-step floor (skeletal NumPy) | **1.431 ms** | n/a | — |
| Full-runtime (1000 steps, skeletal) | 1.431 s | — | — |
| Full-runtime × ~1.5 (~1.5× production-corrected per eulerian-smoke § 9.3 row 2) | **2.147 s** | 3600 s (1 h) | **YES** |
| Per-frame f-distribution bytes | 933,888 B (0.93 MB) | n/a | — |
| Full-cadence storage (1000 frames) | **933.89 MB** | 1024 MB pre-commit ceiling | **YES** (tight; 91% utilization) |
| Cadence-10 storage (100 frames) | 93.39 MB | 1024 MB | YES |
| Peak working-set (rough) | 2.95 MB | host RAM headroom | YES |

### 5.2 Couette `couette-32x16-seed42-step500` (N_z = 3)

| Component | Value | Ceiling | Fits? |
|---|---|---|---|
| Per-step floor (skeletal NumPy) | **0.470 ms** | n/a | — |
| Full-runtime (500 steps, skeletal) | 0.235 s | — | — |
| Full-runtime × ~1.5 | **0.353 s** | 3600 s | **YES** |
| Per-frame f-distribution bytes | 233,472 B (0.23 MB) | n/a | — |
| Full-cadence storage (500 frames) | 116.74 MB | 1024 MB | **YES** (trivial) |
| Peak working-set (rough) | 0.74 MB | host RAM headroom | YES |

### 5.3 Cadence recommendation

**Default lean: full cadence for both descriptors.** Couette is
trivial. Poiseuille at full cadence is 933.89 MB — within the
1024 MB pre-commit ceiling but at 91% utilization. LFS handles
the GitHub 100 MB hard limit transparently per the
git-lfs-migration discipline (the 933 MB Poiseuille capture lands
as an LFS pointer just like the eulerian-smoke 705 MB
Taylor-Green capture did).

**Operator-routable alternative: cadence-10** (93 MB Poiseuille
capture). Pros: more comfortable headroom against the 1024 MB
ceiling; mirrors eulerian-smoke's cadence-50 routing approach.
Cons: drops temporal resolution from 1000 to 100 frames; may
affect post-hoc diagnostic granularity. Default lean stays at
full cadence unless the operator routes otherwise.

(The 1024 MB pre-commit ceiling is the binding numerical
constraint; LFS handles the GitHub hard limit transparently;
neither is the wall-clock or memory.)

### 5.4 Cross-discretization comparison — second ~1.5× data point

(FACT — second sub-phase exercising conventions doc § N as
established discipline; first was eulerian-smoke.) The
~1.5× factor was established as a rule of thumb at eulerian-smoke
(Stage 0 skeletal 0.93 s → Stage 1 measured 1.348 s, +45%
factor). LBM Stage 0 records the second data point at Stage 1
landing audit § 12 retrospective:

- **Poiseuille:** skeletal floor 1.431 ms × ~1.5 ≈ 2.15 ms
  production estimate. Stage 1 measurement TBD; landing audit
  § 12 confirms or refutes the factor.
- **Couette:** skeletal floor 0.470 ms × ~1.5 ≈ 0.71 ms
  production estimate.

If Stage 1 reveals the factor is materially off (e.g., LBM
production overhead is closer to 2× or to 1.2× because the
bounce-back boundary cost dominates differently than
eulerian-smoke's pressure-projection-iteration cost), the
landing audit records the refinement for the conventions-doc § N
graduation discussion.

## 6. SHIFTED register

### 6.1 Inherited shifts going into Stage 1

(FACT — conventions doc § M tally + eulerian-smoke landing § 8.3
final tally = **73 cumulative**.) No new SHIFTED items surfaced at
Stage 0.

### 6.2 Stage 0 banked observations

| ID | Description | Recommendation |
|---|---|---|
| S0-1 | **Appendix D N_z not enumerated.** "64x32" / "32x16" descriptor labels are 2D-shape; D3Q19 needs N_z. Stage 0 resolution: **N_z = 3** depth-3 z-periodic slab. | Operator-routable at this Stage 0 close (§ 7); default lean stands unless re-routed. |
| S0-2 | **D3Q19 golden sha256 anchor (first recording).** `47bd1237…ede93d5c`. | Carry forward to Stage 1 gate-5 (a) + Stage 2 Cat 3 Decision A lift preimage. |
| S0-3 | **Cross-discretization MMS confirmation.** Shared NS-2D MMS solution.py + derivation.md byte-identical since eulerian-smoke consumption (`30e490a7…320d8e` + `30dfc294…ac86e76`); SymPy ≡ NumPy spot-check matches eulerian-smoke's `9.02e-16` finding at the canonical test point. | Carry forward; informational. The MMS surface is now confirmed discretization-invariant across two sub-phases that consume it. |
| S0-4 | **Conventions doc § N PROPOSED-vs-established framing.** Plan treats § N as established per eulerian-smoke § 9.3 row 1 graduation recommendation; conventions doc itself still says PROPOSED. | Banked for operator decision at LBM landing per plan § 11.5 item 2. |
| S0-5 | **Full-cadence Poiseuille capture at 91% of 1024 MB ceiling.** Tight but fits. | Operator-routable cadence-10 alternative documented (§ 5.3); default lean stands at full cadence. |

## 7. Operator surface (Stage 0 close)

For explicit operator routing at Stage 1 dispatch time:

1. **Appendix D N_z resolution (§ 4.4).** Default lean: **depth-3
   z-periodic slab** (N_z = 3) for both descriptors. Alternative:
   spec-amendment to enumerate N_z in Appendix D, or alternative
   depth (e.g., N_z = N_y square-cubic; depth-2 minimum).
2. **Poiseuille cadence (§ 5.3).** Default lean: **full cadence
   (1000 frames, 933.89 MB)**. Alternative: cadence-10 (100
   frames, 93.39 MB) for more headroom vs 1024 MB pre-commit
   ceiling.
3. **Conventions doc § N graduation.** Plan-and-Stage-0 treat
   § N as established; the conventions doc edit to graduate it
   PROPOSED → established is banked operator decision at LBM
   landing per plan § 11.5 item 2.
4. **B17 routing posture at Stage 2.** Already CONFIRMED PATH-A
   continue at Stage 2 dispatch routing (plan § 11.5 item 3 —
   operator pre-confirmed at the Stage 0 dispatch prompt).
5. **P25 (plan § 9.2).** Already CONFIRMED ADD per the Stage 0
   dispatch prompt. Stage 1 retrospective refines the worked
   example or routes SKIP based on actual debugging surfaced.
6. **v0.1.6 tag (plan § 11.5 item 5).** Already CONFIRMED no
   intermediate tag.
7. **Cat 3 Decision A (plan § 4.3 Step 2.3).** Already CONFIRMED
   at Stage 2; Stage 1 leaves the D3Q19 golden table unchanged.

## 8. Stage 0 close posture

Stage 0 is **CLEAN** — all 5 tasks PASS; no R-class
STOP-AND-SURFACE; no SHIFTED items; both canonical descriptors
fit all ceilings with comfortable headroom.

The single-session Stage 1 expectation per eulerian-smoke
landing § 9.3 row 3 (empirical session-budget convention
"Stage 0 scope-analysis fits within ceilings → Stage 1 budget
matches → no continuation needed") is reinforced by this Stage
0's findings: Poiseuille at 2.15 s + Couette at 0.35 s + LBM
implementation complexity comparable to or lower than
eulerian-smoke (no semi-Lagrangian backtrace, no Jacobi
pressure-projection iteration; simpler per-step kernel) → Stage
1 is expected to land in a single session.

This audit's `head_sha` field is back-filled per Convention #12
+ conventions doc § B.2 in a separate commit
`chore(lattice-boltzmann-d3q19-stage0-sha-backfill)` per the
two-commit pattern. Convention #12 lesson "capture full 40-hex
SHA via `git rev-parse HEAD`, never transcribe from short-SHA
`git log` output" (per eulerian-smoke landing § 9.3 row 5) is
applied here.

Verdict: **CONFIRMED**. Stage 1 dispatchable in a fresh session.
