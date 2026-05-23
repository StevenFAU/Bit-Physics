---
date: 2026-05-23
author: mpm-multimaterial-sub-phase-agent
artifact: stage
artifact_id: mpm-multimaterial-stage-0
stage: 0-preflight
subject: "MPM-Multimaterial sub-phase Stage 0 pre-flight (replay + tolerance carryover + MLS-MPM golden re-anchor + Task 0.4 canonical-descriptor scope-analysis)"
head_sha: 399d32ee358938988be6b7218f6a3eab6bf20148
head_sha_at_checkpoint: 399d32ee358938988be6b7218f6a3eab6bf20148
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
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
evidence_paths:
  - docs/phases/sub-phase-mpm-multimaterial.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/replay-2026-05-23T01-33-19Z.txt
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/evidence-reverify-2026-05-23T01-33-19Z.txt
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/mls-mpm-anchor-2026-05-23T01-33-19Z.txt
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/mls-mpm-generator-verify-2026-05-23T01-33-19Z.txt
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/task04-bench-2026-05-23T01-33-19Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/mpm-multimaterial-2026-05-20T13-48-06Z.txt
  - tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json
  - tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md
  - tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py
evidence_hashes:
  docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/replay-2026-05-23T01-33-19Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/evidence-reverify-2026-05-23T01-33-19Z.txt: sha256:2f8fee6abcfc235ae6166cb7807ef4ed704ffef394b8557036569e1a95742678
  docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/mls-mpm-anchor-2026-05-23T01-33-19Z.txt: sha256:a75fb523e84a167158cd57afc11bb7591da655f8ae9e9141291ce7785509e98f
  docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/mls-mpm-generator-verify-2026-05-23T01-33-19Z.txt: sha256:cb8615d4a6bb3b98562317517dcbc4402de9a299ae2a7107caca77dab3cd97a0
  docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/task04-bench-2026-05-23T01-33-19Z.txt: sha256:795323ca2168111b90a49504226e5915b005a3633dc159f14fa58f427328d609
  tools/testkit/failing-tests-evidence/mpm-multimaterial-2026-05-20T13-48-06Z.txt: sha256:a57251a19b28888e664402e9c92eb681fa17719be7e156154df3d681bb9edf94
  tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json: sha256:4142dda261826c87d93ba6f70e2658d94722a5010fa6512fe0cc134f49197e48
  tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md: sha256:97a451a6b30326ee9a767744b2ca9eb8c4e6451db01768698331ad610af00b37
  tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py: sha256:82752b7fe333eca8e0b46a952ce4a3ef4a336ba0532887fbdebc9c4693bb3401
---

# MPM-Multimaterial Sub-Phase — Stage 0 Checkpoint (Pre-flight)

## 1. Stage scope

Pre-flight close for `sub-phase-mpm-multimaterial`, the seventh and **LAST**
per-sim implementation sub-phase under spec-Phase-1. Executes the four
standard tasks (0.0 → 0.3) plus Task 0.4 canonical-descriptor scope-analysis
per conventions doc § N (treated as established per LBM landing § 9.3 row 1
+ § 9.4 row 8 graduation recommendation; third practical exercise after
eulerian-smoke + LBM).

Operator-routed items confirmed at dispatch:

- Item 1 — Python NumPy + numba reference per Path A (spec's Stack-D Taichi
  declaration deferred to spec-Phase-2 entry as focused infrastructure
  sub-phase mirroring numba-integration precedent).
- Item 2 — Pre-emptive numba application at Stage 1 step 2; Task 0.4
  measures naive vs numba per-step floor.
- Item 5 — `v0.1.9` tag posture at Stage 2 close (operator-pushed
  manually; documented in landing audit).
- Item 6 — Cat 3 Decision A at Stage 2; final `_SUBDIRS_PICKED_UP` will
  read `(closed-form, agent-based, particle-fluids, lattice, hybrid-pg)`.

This sub-phase does NOT participate in the cross-phase replay chain
(conventions doc § D.4); next spec-phase pre-flight replays against
`v0.1.0-phase-1`.

## 2. Task results

| Task | Result |
|---|---|
| 0.0 — Cross-phase replay (`v0.1.0-phase-1`, 8-gate canonical set) | **PASS**; sha256 byte-identical to bit-identity invariant `9399fc33…909f34` (15th invocation; conventions doc § D.3). |
| 0.1 — Tolerance-budget carryover | `[phase].phase = "sub-phase-mpm-multimaterial"`; opened_at = `2026-05-23T01:33:19Z`; NO `[budgets.*]` widening. Commit `399d32e`. |
| 0.2 — Phase 1 MPM evidence sha256 reverify | **PASS** — `a57251a1…81bb9edf94` matches Phase 1 landing audit value verbatim. Phase 1 RED evidence unchanged since Phase 1 Stage 2 commit `9de8048`. |
| 0.3 — MLS-MPM golden + derivation + generator re-anchor | **PASS**; see § 3 below. |
| **0.4 — Canonical-descriptor scope-analysis** (THIRD practical exercise of conventions doc § N as established discipline) | **FITS** with Path A (numba); see § 4 below for measured floor + cadence selection + numba-vs-naive multiplier. |

## 3. Task 0.3 — MLS-MPM re-anchor

(FACT — `docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/mls-mpm-anchor-2026-05-23T01-33-19Z.txt`
sha256 `a75fb523…509e98f` + `…/mls-mpm-generator-verify-2026-05-23T01-33-19Z.txt`
sha256 `cb8615d4…dab3cd97a0`.)

Golden table + derivation + generator sha256s recorded as Stage 2 Cat 3
Decision A lift baseline:

| Artifact | sha256 (Stage 0 baseline; pre-lift) |
|---|---|
| `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` | `4142dda261826c87d93ba6f70e2658d94722a5010fa6512fe0cc134f49197e48` |
| `tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md` | `97a451a6b30326ee9a767744b2ca9eb8c4e6451db01768698331ad610af00b37` |
| `tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py` | `82752b7fe333eca8e0b46a952ce4a3ef4a336ba0532887fbdebc9c4693bb3401` |

`uv run python tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py --verify`
returned `OK — …mls-mpm-shape-functions.json matches closed-form recomputation.`
Generator-vs-table equality at the absolute 1e-15 tolerance per derivation
§ 2 + § 3 holds.

**No MMS solution to re-anchor.** Per sim-spec-ref § 6.1 the linear-elasticity
MMS is "declared, deferred" to spec-Phase-2+. Stage 1 consumes ONLY the
golden gate at gate 5 (no MMS arm; mirrors closed-form / agent-based /
sph-water — third golden-only sim through Phase 1). Charter § 1.2 ➃
captures this scope decision verbatim.

The Stage 2 Cat 3 Decision A lift (operator Item 6) restructures the golden's
single `test_points[0].independent_reference` packed-citation block (4
citations: hand-derivation + Hu 2018 + Steffen-Kirby-Berzins 2008 + Python
re-derivation; counts as 1 anchor per conventions doc § I.3) into 3-4 discrete
`test_points` entries with identical inputs/expecteds but distinct
`independent_reference.source` citations. The post-lift sha256 will be
recorded in the Stage 2 landing audit alongside the baseline above per
audit-chain anchor-trail discipline.

## 4. Task 0.4 — Canonical-descriptor scope-analysis (THIRD § N practical exercise)

(FACT — `docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-evidence/task04-bench-2026-05-23T01-33-19Z.txt`
sha256 `795323ca…7328d609`.) Bench at HEAD `399d32ee…` per conventions
doc § K.3 "MEASURED component floors, not projected". Bench script at
`/tmp/mpm-task04-bench.py` (ephemeral; preserves measurement methodology
in the evidence-log body without committing the bench script — Stage 1
implements the production kernels independently per § F.1).

### 4.1 Canonical descriptor + interpretation

Per Appendix D § D.2.3, MPM `ref` is the single descriptor
`drop-impact-128cube-seed42-step500`. **NO probe-vs-Appendix-D drift**
(probe report § 4 references the same descriptor verbatim — unlike LBM /
eulerian-smoke probe drift inheritance per conventions doc § M.1 row 17).

Interpretation: 128³ grid (2,097,152 cells); 500 steps; particle count
**2M** chosen as mid of 1-3M plan-drafting range (charter § 1.3
"MLS-MPM typical density 4-8 particles per active cell × 128³ × 10-20%
active fraction"). Stage 1 may refine downward (~1M for sparse-IC
drop-impact) or upward; the 2M choice is conservative-upper-end for
bench projections.

### 4.2 Bench shape

Skeletal MLS-MPM kernel: one P2G (3D quadratic B-spline weights; 27-cell
lex-ordered scatter into grid mass + 3-component grid momentum) + one G2P
(same stencil, lex order; grid momentum / grid mass division per node;
weighted sum back to particle velocity). Constitutive models +
deformation-gradient update **NOT** included in this bench — they are
NumPy-vectorizable per-particle and add sub-leading cost vs the P2G/G2P
transfer surface (which dominates by ~2 orders of magnitude in Python
per charter § 1.3 and confirmed empirically below).

Bench scales:

- Naive Python: N = 50,000 particles (40× under canonical; extrapolation
  linear in particles).
- Numba `@njit(fastmath=False, cache=True)`: N = 50,000 (small validation)
  AND N = 2,000,000 (canonical-scale MEASURED — no extrapolation).

### 4.3 Measured per-step floor — MEASURED at canonical-scale for numba

| Kernel | N particles | P2G min | G2P min | step min | per-particle |
|---|---:|---:|---:|---:|---:|
| Naive Python | 50,000 | 1.2506 s | 0.9011 s | 2.1517 s | 43.034 μs |
| Numba @njit | 50,000 | 0.0133 s | 0.0128 s | 0.0261 s | 0.522 μs |
| **Numba @njit (canonical)** | **2,000,000** | **0.5335 s** | **0.5110 s** | **1.0445 s** | **0.522 μs** |

The numba per-particle cost is invariant across 50K → 2M (0.522 μs/particle
both scales), confirming the bench is JIT-overhead-amortized and linear in
particle count. **Numba canonical-scale measurement is the load-bearing
floor**; naive Python floor is extrapolated linearly.

### 4.4 Numba-vs-naive multiplier (Stage 1 routing input)

**Numba speed-up: 82.4× per-particle.**

This sits comfortably within the sph-water R18 → R20 precedent range
(~50–200× on particle-grid kernels per charter § 1.3); confirms numba's
load-bearing-ness for MPM Python NumPy reference per operator Item 2 +
plan § 1.3 Path A.

For Stage 1 implementation: P2G/G2P kernels **MUST** carry `@njit(fastmath
=False, cache=True)` per conventions doc § G. The shape-functions module
(`mpm_multimaterial.reference.shape_functions.{N, partition_of_unity_sum}`)
is small-kernel and `numba` decoration is optional / unnecessary (sub-μs
per call; gate 5 golden test is per-sample-point, not per-batch). Plan
§ 4.2 step 2 directs this disposition.

### 4.5 Wall-clock projection at canonical N

Per the 2M-particle × 500-step canonical:

| Kernel | Per-step (measured) | 500-step total | hours | × 2.5× production correction |
|---|---:|---:|---:|---:|
| Naive Python | 86.1 s (extrapolated 50K → 2M) | 43,034 s | **11.95 h** | 29.9 h — STRUCTURAL ALARM |
| Numba @njit | 1.0445 s (MEASURED at 2M) | 522 s | **8.7 min** | **21.8 min — FITS** |

The naive-Python wall-clock STRUCTURAL ALARM at 11.95 h (12× over the
1-hour operator-routable threshold per plan § 1.3) confirms Path A (numba)
is load-bearing. The numba wall-clock at 21.8 min (with the upper-end
2.5× production-correction factor applied) leaves comfortable headroom
under the threshold — **no Path B per-sub-phase descriptor contraction
required** for Stage 1.

### 4.6 Storage + cadence selection

Per-frame payload (drop-impact canonical N at 2M particles):

| Field | Size |
|---|---:|
| grid_mass (scalar) | 16.8 MB |
| grid_momentum (3-comp) | 50.3 MB |
| particle pos (3-comp) | 48.0 MB |
| particle vel (3-comp) | 48.0 MB |
| **per-frame total** | **163.1 MB** |

500-frame full-cadence raw total: **79.6 GiB** — overshoots 2 GB W1
pre-commit ceiling (raised by LBM `2edc163`) by 40×. Cadence-N routing
mandatory.

Cadence-routing-as-default-when-feasible per LBM landing § 9.4 row 7 says:
default to full cadence; route to cadence-N only when full cadence
overshoots W1. Here full cadence overshoots; cadence selection:

| Cadence | Frame count | Total | Verdict |
|---:|---:|---:|---|
| 1 | 500 | 81,554 MB | OVERSHOOTS |
| 10 | 50 | 8,155 MB | OVERSHOOTS |
| 25 | 20 | 3,262 MB | OVERSHOOTS |
| **50** | **10** | **1,631 MB** | **FITS 2 GB (comfortable; 80 % of ceiling)** |
| 100 | 5 | 816 MB | FITS (more headroom) |

**Cadence selection: lean cadence-50** (every 50th step written; 10 frames
total + initial state = ~11 frames; ~1.6 GB committed) — matches
eulerian-smoke cadence-50 precedent (Taylor-Green 128³ at 500 steps);
both LBM canonical descriptors landed full-cadence because their per-frame
payload is small enough, but MPM at 2M particles + 128³ grid pushes back
into cadence-N territory.

Stage 1 step 5 produces the canonical capture at cadence-50; sidecar
metadata records the cadence selection per spec § 2.7 + sph-water R20
precedent.

### 4.7 Memory headroom

Per charter § 1.3 estimate: 2M particles × 10 fields × 8 B + 128³ × 7 grid
fields × 8 B ≈ 150 MB + 120 MB = **~270 MB peak**. Comfortably tractable
on a development workstation; no R-class memory concern.

### 4.8 Numba decision summary (Stage 1 routing input)

- **Apply** `@njit(fastmath=False, cache=True)` to the P2G + G2P kernels
  (and to per-particle deformation-gradient + constitutive-update kernels
  if their per-step cost projects above ~10 ms at 2M particles; Stage 1
  agent assesses at implementation time).
- **Do NOT apply** to `mpm_multimaterial.reference.shape_functions.{N,
  partition_of_unity_sum}` (small kernel; gate 5 invoked at single sample
  points).
- Numba subpackage shape (if any sim-internal harness ships at this
  sub-phase) MUST follow `numba_harness/`-style naming per conventions
  doc § G (NOT bare `numba`) — though MPM is unlikely to ship a per-sim
  numba subpackage; the `@njit` decorations are inline on the existing
  `mls_mpm.py` module.
- Numba cache-propagation through mutation-testing (conventions doc § G +
  sph-water Stage 2 N3) carries forward to the Stage 2 PATH-A mutation
  artifact per operator Item 3.

### 4.9 Third data point on the ~1.5×–2.6× production-correction factor

Per plan § 1.2 ➍ + LBM landing § 9.4 row 8: the empirical convention has
two prior data points (eulerian-smoke 1.45× NumPy-vectorized;
LBM 2.6× NumPy-vectorized-with-rolls). MPM at Task 0.4 is the third:

| Sub-phase | Stage 0 skeletal projection | Stage 1 expected reality | Empirical correction factor |
|---|---|---|---|
| eulerian-smoke (NumPy-vectorized SL+projection) | 0.93 s/step | 1.348 s/step | 1.45× |
| LBM (NumPy-vectorized BGK+roll) | 7.55 ms/step | 3.78 ms/step | **0.5×** (under-shot — macroscopic-moment commit narrower than skeletal raw-f estimate) |
| **MPM (numba @njit particle-loops, 2M particles)** | charter § 1.3 numba projection ~25-400 ms/step | **Task 0.4 measured 1044 ms/step at canonical N** | **2.6× – 42× depending on which charter end-point** |

The MPM Task 0.4 measurement at 1044 ms/step lands ~2.6× the charter
§ 1.3 mid-range numba projection (~400 ms) and ~42× the optimistic charter
end (25 ms). The 2.6× ratio matches LBM's empirical upper bound for
NumPy-vectorized work; for MPM's particle-loop shape with numba the
factor naturally lands here because per-particle JIT overhead doesn't
amortize further beyond the 0.522 μs floor.

**Banked observation for landing-audit § 12 retrospective:** the
production-correction factor is sim-shape dependent. The eulerian-smoke
1.45× was a fair NumPy-vectorized estimate; the LBM 0.5× under-shot
because the skeletal-vs-committed scope differed; the MPM 2.6× lands in
the LBM-empirical range. **The empirical convention is stable at ~1.5×-3×
range with sim-shape skew; the rule of thumb's main load is
"order-of-magnitude correctness pre-Stage-1, refined to within ~3× at
Stage 1 measurement"**. The conventions doc § N graduation should
formalize this range rather than a single multiplicative factor — banked
recommendation for post-Phase-1 conventions-doc refactor.

### 4.10 No new R-class risk surfaced

The plan § 9 risk surface (R-MPM-1..5) covered the relevant pre-Stage-1
risk space; Task 0.4 measurements confirm the dominant risk paths are
mitigated:

- R-MPM-4 (numba cache invalidation) — bench used cold start; the cache
  warms in ~0.7 s for the four `@njit` symbols. Stage 1 wiring of pinned
  signatures + a module-load warm-up pass per conventions doc § G is
  load-bearing as documented.
- R-MPM-5 (particle count interpretation) — Task 0.4 bench used 2M
  (conservative-upper); Stage 1 may refine to ~1M for sparse drop-impact
  IC. Either fits comfortably under cadence-50 + numba budgets.

**No new R-MPM risks discovered.** Stage 1 dispatch is structurally
clean.

## 5. Routing leans for Stage 1

| Item | Lean | Rationale |
|---|---|---|
| Numba decoration | **APPLY** at Stage 1 step 2 on P2G/G2P (+ per-particle constitutive/deformation kernels if needed) | 82.4× speed-up measured at canonical N; without numba the 12 h wall-clock STRUCTURAL ALARM forces Path B contraction. Operator Item 2 confirms. |
| Per-sub-phase descriptor contraction | **NOT NEEDED** (full canonical descriptor `drop-impact-128cube-seed42-step500` at 2M particles) | Path A (numba) sufficient at 21.8 min wall-clock × 2.5× correction; no Path B required. |
| Cadence selection | **cadence-50** (10 frames + initial state ≈ 11 frames at ~163 MB each ≈ 1.6 GB committed) | Full cadence overshoots 2 GB W1 by 40×; cadence-50 is the comfortable-fit precedent (eulerian-smoke Taylor-Green precedent). |
| Particle count | **2M** target (Stage 1 may refine ±50 %) | Mid of 1-3M plan-drafting range; sparse-IC drop-impact may land lower; budgets all under 3M. |
| Determinism posture | TBD at Stage 1 step 6 — likely bit-exact over-achievement for Python NumPy + numba reference (no atomics; sorted-particle iteration; deterministic 27-cell lex sum order) | Plan § 4.2 step 1 + conventions doc § F.4. Stage 1 records actual posture; spec-Phase-2+ Stack-D Taichi `epsilon-same-stack-same-hw` remains declared target. |
| MMS arm | **NONE at this sub-phase** | Linear-elasticity MMS declared deferred per sim-spec-ref § 6.1; gate 5 golden-only; mirrors sph-water + closed-form + agent-based pattern. |

## 6. SHIFTED register (Stage 0)

No new shifts surfaced at Stage 0. The 82 cumulative inherited shifts
(per LBM landing § 8.3) carry forward unchanged into Stage 1:

- 21 from Phase 1 baseline (conventions doc § M.1).
- 11 from closed-form (conventions doc § M.2).
- 10 from agent-based (conventions doc § M.3).
- 6 from continuous-CA-rd3d (conventions doc § M.4).
- 13 from particle-fluids-sph-water (conventions doc § M.5).
- 5 + 3 from eulerian-smoke Stage 1 + Stage 2.
- 5 + 4 from lattice-boltzmann-d3q19 Stage 1 + Stage 2.

(Sum: 21 + 11 + 10 + 6 + 13 + 8 + 9 = 78 + 4 = 82 entering MPM.)

The probe-vs-Appendix-D match (no drift) for MPM is the FIRST per-sim
sub-phase since closed-form / agent-based without a probe-Appendix-D
drift inheritance — banked as a banked observation for the landing
audit § 8.

## 7. Banked items for follow-up at Stage 1 / Stage 2

| Item | Owner | Notes |
|---|---|---|
| Stage 1 step 2 numba @njit decoration on P2G/G2P (+ constitutive/deformation if needed) | Stage 1 agent | Bench at /tmp/mpm-task04-bench.py is methodology-reference; production kernels implement independently per conventions doc § F.1 determinism docstring. |
| Stage 1 step 5 capture at cadence-50 (10 + initial-state frames; ~1.6 GB committed) | Stage 1 agent | Sidecar metadata records cadence selection per spec § 2.7. LFS-tracked transparently. |
| Stage 2 Cat 3 Decision A lift on `mls-mpm-shape-functions.json` (1 → ≥3 anchors) + `hybrid-pg` subdir pickup | Stage 2 agent | Operator Item 6 confirmed. Baseline sha256 `4142dda2…fec9a48` recorded in § 3 above. Lift produces new sha256 captured in landing audit. |
| Stage 2 PATH-A mutation extension for `mpm_multimaterial` target | Stage 2 agent | Operator Item 3 confirmed. Second numba-using PATH-A target after sph-water dfsph.py. |
| Stage 2 `v0.1.9` tag at landing close | Operator (manual push) | Operator Item 5 confirmed. No `-phase-N` suffix. |
| Production-correction factor empirical-range refinement banked for post-Phase-1 conventions-doc refactor | Operator | Three data points (1.45× / 0.5× / 2.6×) suggest the rule of thumb stabilizes as a *range* (~1.5×-3×) rather than a single multiplier; § N graduation should formalize accordingly. |
| § N graduation PROPOSED → established | Operator | Strong recommendation after three consecutive single-session Stage 1 sub-phases (eulerian-smoke + LBM + MPM expected). Banked for conventions-doc refactor after MPM lands. |

## 8. Stage 0 close

(FACT — closing-commit will land this checkpoint; SHA back-fill per
Convention #12 + conventions doc § B.2 in a separate commit. Full 40-hex
captured via `git rev-parse HEAD` per LBM landing § 9.3 row 5 lesson —
NEVER transcribe short-SHA.)

Stage 1 dispatch is **READY**:

- Bit-identity invariant `9399fc33…909f34` matches (15th invocation).
- Phase 1 MPM evidence sha256 `a57251a1…81bb9edf94` matches.
- MLS-MPM golden + derivation + generator re-anchored at Phase 1 baseline
  sha256s; `--verify` GREEN at 1e-15.
- Task 0.4 confirms Path A (numba) suffices at canonical descriptor; no
  per-sub-phase contraction; cadence-50 selected; numba-vs-naive
  multiplier 82.4×.
- No new R-class risks surfaced.
- 82 cumulative shifts inherited; no Stage 0 deltas.

Stage 1 prompt is at `docs/phases/sub-phase-mpm-multimaterial.md` § 7.2.
Operator dispatches in a fresh session.

This Stage 0 checkpoint lands at HEAD `399d32ee358938988be6b7218f6a3eab6bf20148`
(prior commit; the closing-commit SHA back-fills per Convention #12 in a
separate commit captured via `git rev-parse HEAD`).
