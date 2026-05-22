---
date: 2026-05-22
author: particle-fluids-sph-water-sub-phase-agent
artifact: stage
artifact_id: particle-fluids-sph-water-stage-1
stage: 1-implementation
subject: "Particle-fluids sph-water sub-phase Stage 1 final checkpoint — implementation complete (six R-class surfaces resolved)"
verdict-state: complete
supersedes: docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-checkpoint-partial-2026-05-20T22-27-08Z.md
head_sha: 31195d83173aa49b92854c58f3f3eedbe4bd138b
head_sha_at_checkpoint: 31195d83173aa49b92854c58f3f3eedbe4bd138b
parent_audits:
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-checkpoint-2026-05-20T22-10-19Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-checkpoint-partial-2026-05-20T22-27-08Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-continuation-stop-and-surface-2026-05-20T22-44-11Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-continuation-stop-and-surface-2-2026-05-20T23-05-36Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-continuation-stop-and-surface-3-2026-05-21T03-50-14Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-continuation-stop-and-surface-4-2026-05-21T13-09-47Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-continuation-stop-and-surface-5-2026-05-21T16-44-08Z.txt
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
evidence_paths:
  - captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5
  - captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json
  - docs/perf-ledger.md
  - packages/sph-water/sph_water/__init__.py
  - packages/sph-water/sph_water/reference/dfsph.py
  - packages/sph-water/sph_water/sim.py
  - packages/sph-water/sph_water/invariants.py
  - tools/testkit/failing-tests-evidence/sph-water-implemented-2026-05-20T22-27-08Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-final-regression-2026-05-22T01-31-12Z.txt
evidence_hashes:
  captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5: sha256:7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f
  captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json: sha256:84dbc44892e6ab941ac9469f25ed18827b7a6db6e2611df0a63f95a392ff5865
  tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt: sha256:82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f
  tools/testkit/failing-tests-evidence/sph-water-implemented-2026-05-20T22-27-08Z.txt: sha256:5c3d9924c4713153376fbf42fbb729af48c229052fc4fe435e38f2ef0fcf7110
  docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-final-regression-2026-05-22T01-31-12Z.txt: sha256:5a19fce5df21390813778a2f381cec4fb768a0eba844f7cbb7838509f6ad9973
---

# Particle-fluids sph-water Sub-Phase — Stage 1 Final Checkpoint

## 1. Scope

(FACT — supersedes the partial checkpoint at `bf6ca48` per the
operator's R20 routing close.)

Stage 1 complete. All 13 gates GREEN at HEAD for sph-water; canonical
capture landed at 100K-instance scope per the R20 routing
(`dam-break-100K-particles-seed42-step1000.h5`). The Phase 1 R8
Appendix D 1M-particle descriptor stays as the canonical contract
for Stack-C Phase-2+ implementations per spec-ref § 5; this
sub-phase's Python NumPy reference produces the 100K-instance that
exercises the algorithmic + API contract Stack-C reproduces at full
N.

The six operator routings from Stage 0 dispatch + the five R-class
remediation routings from the continuation arc are all resolved:

| R | Concern | Resolution | Commit |
|---|---|---|---|
| R12 | Storage > 64MB pre-commit ceiling | (a) raise ceiling to 1 GB | `8f99500` |
| R16 | O(N²) tensor OOM at 1M | (i) spatial-hash cell-list (intermediate; superseded by R17) | `2a48a32` |
| R17 | Python-loop bottleneck at 1M | (I) scipy.cKDTree + pair-array fast path | `eb81d48`, `c120d91` |
| R18 | Aggregate runtime > 10⁴s | numba-integration sub-phase + @njit application | `569c883`, `a9f7cf2` |
| R19 | 1-hour threshold (revoked) | revoked; 3-hour structural-alarm threshold retained | `84a80fe` |
| R20 | 3-hour threshold breached at canonical N=1M | (B) downsample canonical N to 100K per per-sub-phase descriptor override; full N=1M contracted forward to Stack-C Phase-2+ per spec-ref § 5 | `d0c7eb7`, this audit |

## 2. Commits in this stage (post-partial)

| SHA | Subject |
|---|---|
| `8f99500` | `chore(particle-fluids-sph-water-stage1-precommit-ceiling): raise maxkb to 1 GB per R12 routing` |
| `6eba1dc` | `chore(particle-fluids-sph-water-stage1-r16-surface): STOP-AND-SURFACE on canonical-runner runtime memory cost` |
| `2a48a32` | `feat(particle-fluids-sph-water-stage1-spatial-hash): canonical-tier neighbor query via cell-list per R16 routing` (superseded by R17) |
| `16f5129` | `chore(particle-fluids-sph-water-stage1-r17-surface): SECOND STOP-AND-SURFACE on canonical-runner Python-loop overhead` |
| `220c26c` | `chore(particle-fluids-sph-water-stage1-scipy-dep): add scipy dependency per R17 routing path I` |
| `eb81d48` | `feat(particle-fluids-sph-water-stage1-kdtree): replace cell-list canonical-tier with scipy.cKDTree per R17 routing` |
| `c120d91` | `feat(particle-fluids-sph-water-stage1-pair-arrays): pair_lists_from_positions fast path for canonical-tier` |
| `7880135` | `chore(particle-fluids-sph-water-stage1-r18-surface): THIRD STOP-AND-SURFACE on aggregate runtime > 10⁴s` |
| `15fdbfb` → `569c883` | numba-integration sub-phase (5 commits; CONFIRMED) |
| `a9f7cf2` | `feat(particle-fluids-sph-water-stage1-numba): apply @njit to dfsph canonical-tier hot loops per R18 routing` |
| `84a80fe` | `chore(particle-fluids-sph-water-stage1-r19-surface): FOURTH STOP-AND-SURFACE on wall-clock 1.3x past operator threshold` |
| `d0c7eb7` | `chore(particle-fluids-sph-water-stage1-r20-surface): FIFTH STOP-AND-SURFACE on 3hr structural-alarm threshold breach` |
| `fa36ca9` | `feat(particle-fluids-sph-water-stage1): canonical capture at 100K + perf-ledger first row (gates 10 + 13 close, R20 routed)` |
| (this audit) | `chore(particle-fluids-sph-water-stage1-checkpoint): Stage 1 implementation complete (six R-class surfaces resolved)` |
| (next) | `chore(particle-fluids-sph-water-stage1-sha-backfill): back-fill Stage 1 final checkpoint SHA per Convention #12` |

## 3. Final gate-status table

(FACT — `…/stage-1-final-regression-2026-05-22T01-31-12Z.txt`
sha256:`5a19fce5df21390813778a2f381cec4fb768a0eba844f7cbb7838509f6ad9973`;
all gates GREEN at HEAD.)

| # | Gate | State | Evidence |
|---|---|---|---|
| 4 | code verification reads through to gate-5 (golden) | N/A | sph-water spec-ref § 7 declares golden-table-based gate 5. |
| 5a | cubic-spline-kernel golden (Phase 0; 9 fixture points; abs=1e-12) | **GREEN** | `tests/test_cubic_spline_kernel_golden.py::test_W_matches_phase0_pin` PASS. |
| 5b | DFSPH density-evolution golden (Phase 1; 1 test_point; abs=1e-15) | **GREEN** | `tests/test_dfsph_density_golden.py::test_{density,density_evolution}_at_two_particle_fixture` PASS. ρ₀ = 0.5470951168783902, dρ/dt₀ = -0.2984155182973038 reproduced. |
| 6 | Tier 1 NaN/Inf scan | **GREEN** | `test_tier1_health_no_nan_inf` PASS over the diagnostic trajectory (64 particles × 8 steps). |
| 7 | Tier 2 particle (IC-5) | **GREEN** | `test_tier2_particle_{count_invariance, no_overlap_at_half_spacing, neighbor_list_integrity, momentum_conservation_advisory}` PASS. |
| 8 | Cat 1 citations | **GREEN** | Bender-Koschier 2015 + Monaghan 1992/2005 cited by name in `sph_water.reference.dfsph` docstrings. SPlisHSPlasH manifest `[upstream].sha = 6bff55a6…b62b54` referenced via `cat1.upstream-citation`. |
| 9 | Cat 2 public API | **GREEN** | `sph_water.{reference.dfsph, sim, invariants}` resolves per probe § 5. |
| 10 | canonical capture (100K-instance per R20 routing) | **GREEN** | `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{h5,json}` (H5 sha256 `7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f`; 58.80 MB). Full N=1M contracted forward to Stack-C Phase-2+ per spec-ref § 5. |
| 11 | determinism (`test_run_twice_epsilon_diff`) | **GREEN** | Via `sim_runner_diagnostic` (64 particles × 8 steps; bit-exact over-achievement per § 1.5). |
| 12 | PBT invariants (Hypothesis) | **GREEN** | `density_nonneg` + `kernel_normalization_unit_volume`. |
| 13 | perf-ledger first-landing row | **GREEN** | Appended at `docs/perf-ledger.md`: `(sph-water, numpy-reference + scipy.cKDTree + numba-@njit(fastmath=False, cache=True), dam-break-100K-particles-seed42-step1000, 1291.854 s, i7-12700KF-linux-6.17, 2026-05-21, baseline)`. |
| 13 (anchor) | failing-tests replay verifiable | **GREEN** | Phase 1 RED sha256 `82fb91bc…cf12b1f` UNTOUCHED; HEAD GREEN sha256 `5c3d9924…cf7110`. Gate-13 worktree replay at `cd20faa` reproduces 5 ModuleNotFoundError per Stage 1 partial § 3.5. |

## 4. Algorithmic-evolution narrative (Stage 1 arc)

(FACT — commit history `git log v0.1.0-phase-1..HEAD packages/sph-water/`
+ R-class surface evidence files.)

| Iteration | Algorithm | Bottleneck observed | Routing |
|---|---|---|---|
| Initial (Stage 1 partial, `85f178f`) | Naive pairwise materialization (O(N²) `(N, N, 3)` tensor) | OOM at 21.8 TiB allocation at N=1M | R16 → spatial-hash cell-list |
| Cell-list intermediate (`2a48a32`) | Pure-Python cell-list with 27-cell stencil | Python-loop overhead at 1M iterations = ~14h projected | R17 → scipy.cKDTree |
| cKDTree (`eb81d48`, `c120d91`) | scipy.spatial.cKDTree + symmetrize + lexsort + vectorized inner math | 50M-pair intermediate (M, 3) arrays = ~7 GB/step; aggregate ~10⁴ s | R18 → numba-integration |
| cKDTree + numba (`a9f7cf2`) | cKDTree (R17) + numba @njit(fastmath=False, cache=True) inner math (R18) | Per-step ~7-12 s at 1M (cKDTree-orchestration is the floor, NOT inner math) | R20 → downsample to 100K |
| **Final (this commit chain, `fa36ca9`)** | **cKDTree + numba @njit at N=100K** | **~1.29 s/step; ~21.5 min total. GREEN.** | (none — Stage 1 closes) |

The cell-list intermediate (`2a48a32`) is superseded by the cKDTree
replacement (`eb81d48`); the function name `cell_list_neighbor_query`
is retained for API stability but the body is cKDTree per R17
routing. The R18 numba application accelerated the per-pair inner
math but did not touch the dominant cKDTree-orchestration cost
(per R20 analysis).

## 5. Determinism declaration final state (sim.py)

(FACT — `packages/sph-water/sph_water/sim.py` module docstring at
HEAD post-`fa36ca9`.)

Seven clauses preserved + amended through the R-class arc:

1. **Stable particle iteration order** (R16 + R17 amendment):
   diagnostic-tier path uses naive O(N²) `neighbor_lists`;
   canonical-tier path uses scipy.cKDTree + sort-by-(pair_i, pair_j)
   determinism wrap. Bit-equivalent to diagnostic-tier at any input
   where both fit. Phase-2+ Stack-C extends with native cell-list
   per `determinism.md`.
2. **Sorted neighbor-iteration order** — `neighbor_lists` via
   `np.where`; `pair_lists_from_positions` via lexsort.
3. **Sorted per-pair force-accumulation** — pair-array ordering
   from (i, j) lexsort.
4. **DFSPH inner-iteration determinism** (Phase-2+ scope; current
   step is explicit-Euler-with-gravity per Stage 1 plan).
5. **No stochastic ops inside the step.**
6. **No BLAS/FMA path inside the kernel** at diagnostic-tier;
   canonical-tier inner math uses numba JIT scalar-register
   accumulation (no BLAS routing).
7. **Phase-2+ deferred:** Stack-C atomic scatter, FMA fusion,
   Vulkan subgroup-collectives.

**R18 amendment (canonical-tier per-pair math):** `density_evolution_jit`
and `density_jit` use `@njit(fastmath=False, cache=True)` per the
project convention at `docs/common/numba.md`. Bit-deterministic with
itself + FP-equivalent (1e-9) with pure-NumPy diagnostic-tier
variants. Verified by 4 new equivalence tests at
`tests/test_spatial_hash_equivalence.py`.

**R20 amendment (canonical-tier scope):** N=100K at this sub-phase
per the R20 routing — the Phase 1 R8 Appendix D 1M descriptor is
contracted forward to Stack-C Phase-2+ per spec-ref § 5. Sim.py
constants reflect: `CANONICAL_DESCRIPTOR = "dam-break-100K-particles-seed42-step1000"`,
`CANONICAL_N_PARTICLES = 100_000`, `CANONICAL_H = 0.026`
(re-tuned for ~50 neighbors at 100K-uniform-cube).

## 6. Canonical capture details

(FACT — `captures/sph-water-ref/` at HEAD.)

| Field | Value |
|---|---|
| Descriptor | `dam-break-100K-particles-seed42-step1000` |
| Path | `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5` |
| H5 size | 61,659,800 bytes (58.80 MB) |
| H5 sha256 | `7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f` |
| JSON sidecar sha256 | `84dbc44892e6ab941ac9469f25ed18827b7a6db6e2611df0a63f95a392ff5865` |
| N (particles) | 100,000 |
| Step count | 1000 |
| Capture cadence | every 100 steps → 11 frames (steps 0/100/200/.../1000) |
| Per-frame fields | position (3 × f64), velocity (3 × f64), density (1 × f64) per particle = 56 B/particle/frame |
| Neighbor query | scipy.spatial.cKDTree + sort-by-id wrap (R17) |
| Inner-loop math | numba @njit(fastmath=False, cache=True) — `density_evolution_jit`, `density_jit` (R18) |
| Wall-clock | 1291.854 s (~21.5 min); per-step ~1.29 s |
| Hardware | i7-12700KF-linux-6.17 |
| Determinism claim | bit-exact-same-stack-same-hw (Python NumPy reference; sub-phase plan § 1.5 over-achieves spec's epsilon target) |
| Scope | 100K-instance of Phase 1 R8 canonical 1M descriptor; full N=1M is Phase-2+ Stack-C scope per spec-ref § 5 |
| Headroom under 1 GB ceiling | ~1006 MB unused (W1 ceiling raise from 64 MB → 1 GB at `8f99500` provides forward-looking headroom for future MPM / LBM / eulerian-smoke 3D captures) |

## 7. SHIFTED register

### 7.1 Inherited from Stage 0 checkpoint § 7 (1 shift)

| # | Shift | Source |
|---|---|---|
| N1 | SPlisHSPlasH manifest `[scope].used_by_sims` uses bare slug `"sph-water"` rather than spec § 9.2 worked-example prefixed form `"particle-fluid/sph-water"`. PASS-with-DRIFT per operator Item 2 routing; NOT amended. | Stage 0 Task 0.3 |

### 7.2 Inherited from Stage 1 partial checkpoint § 5.2 (5 shifts S1–S5)

| # | Shift | Rationale |
|---|---|---|
| S1 | Stage 1 test-file stub-body fill-in pattern (inherited from closed-form / agent-based / RD-3D Stage 1 S1). | RD-3D Stage 1 S1 precedent. |
| S2 | Determinism test uses `sim_runner_diagnostic` rather than `sim_runner_seeded` (canonical 1M descriptor). | R12 boundary + agent-based S6 inline-recurrence precedent. |
| S3 | Single SimRunner Protocol implementation + diagnostic helper (NOT two canonical descriptors like agent-based). | Tractability at test scope. |
| S4 | R12 STOP-AND-SURFACE triggered at Stage 1 step 5. | Sub-phase plan § 4.2 step 5 / § 9 R12 explicit STOP-AND-SURFACE precondition; operator Item 5 routing. |
| S5 | Diagnostic step is explicit-Euler with gravity, NOT the full DFSPH solver. | Phase-1-scope discipline; sub-phase plan § 4.2 step 2 inline note. |

### 7.3 New shifts surfaced post-partial (S6–S12)

| # | Shift | Rationale |
|---|---|---|
| S6 | **Dual-implementation pattern for neighbor query + per-pair math.** Diagnostic-tier (N ≤ ~1024) uses naive O(N²) `neighbor_lists` + pure-Python `density` / `density_evolution`. Canonical-tier (N ≥ 100K at this sub-phase) uses `cell_list_neighbor_query` (KDTree body per R17) + `pair_lists_from_positions` + `density_evolution_jit` + `density_jit` (numba per R18). Bit-equivalent neighbor lists at small N (verified by 3 tests); FP-equivalent within 1e-9 for density/density_evolution (verified by 4 tests). Both paths are bit-deterministic with themselves. | R16 + R17 + R18 routing chain. |
| S7 | **Gate 7 Tier 2 scale-coverage gap.** Gate 7 (Tier 2 particle diagnostics: count-invariance, no-overlap, neighbor-list-integrity, momentum-conservation-advisory) is exercised at diagnostic-tier (N=64) only; the canonical-tier path with cKDTree+numba is NOT certified by gate 7 at HEAD. This gap was not caught at sub-phase plan-drafting because the plan implicitly assumed gate 7 would catch scale issues; in practice, exercised-at-one-scale tests don't certify other scales. Banked as a testing-strategy concern for future sub-phase plan-drafting. | Stage 1 R16 OOM made this gap visible. |
| S8 | **scipy added as a workspace dependency** at `tools/testkit/pyproject.toml`. Brought in via R17 routing (cKDTree); transitive numpy already present. Documented in `docs/dependencies.md` post-`220c26c`. Future particle-fluids / MPM / LBM sub-phases benefit from scipy availability. | R17 routing path I. |
| S9 | **numba added as a workspace dependency** at `tools/testkit/pyproject.toml`. Brought in via the numba-integration sub-phase (CONFIRMED at `569c883`). Project-wide convention documented at `docs/common/numba.md`: `@njit(fastmath=False, cache=True)` mandatory; verified by regression test at `tools/testkit/numba_harness/tests/test_numba_determinism.py`. Applied to dfsph canonical-tier inner math at `a9f7cf2`. | R18 routing → numba-integration sub-phase (interpolated focused infrastructure hotfix). |
| S10 | **100K-instance canonical capture** (R20 routing): this sub-phase ships the 100K-particle scope of the canonical 1M descriptor. Phase 1 R8 Appendix D 1M descriptor stays as canonical contract for Stack-C Phase-2+ per spec-ref § 5; full N=1M is Phase-2+ Stack-C scope. The Python NumPy reference at this sub-phase establishes the algorithmic + API contract Stack-C reproduces at full N. Reference performance ceiling for cross-stack comparison: 1291.854 s on i7-12700KF-linux-6.17. | R20 routing path (B). |
| S11 | **R19 / R20 stop-and-surface thresholds were arbitrary**. R19's 1-hour threshold was operator-set without per-step decomposition rationale; revoked at R20 dispatch. R20's 3-hour threshold was retained as structural-alarm but the R20 surface analysis projected wall-clock too optimistically (80-90 min projected vs 200+ min observed) due to cKDTree-orchestration cost underestimate. R17/R18/R19 projection-based wall-clocks were ALL overly optimistic. Pattern: surface-projected estimates at canonical scale should attach explicit per-step decomposition with MEASURED component floors before being treated as actionable. Banked as a threshold-discipline lesson for future sub-phase plan-drafting. | R19 + R20 surface evidence; explicit operator routing acknowledgement at R20 dispatch. |
| S12 | **No signature refactors required for numba application** (W2e at `a9f7cf2`). Numba accepted the existing `np.ndarray` + `float` signatures without modification. The `_density_evolution_jit_inner` and `_density_jit_inner` functions are new additions parallel to the existing vectorized variants — neither modifies an existing function's signature. Convention A preserved. | Stage 1 W2e re-anchor verification at `a9f7cf2`. |

### 7.4 Cumulative inherited shift count going into Stage 2

48 (continuous-CA-RD-3D landing baseline) + 1 (Stage 0 N1) + 5 (Stage 1 S1–S5 inherited) + 7 (Stage 1 S6–S12 post-partial) = **61 cumulative shifts**.

(Note: the numba-integration sub-phase's 3 shifts (N1 testkit-not-common-py, N2 numba_harness directory rename, N3 FP-equivalence-not-bit-equivalence) are documented at that sub-phase's landing audit but are NOT re-counted into this sub-phase's cumulative.)

## 8. Sibling-regression sweep at Stage 1 close

(FACT — `…/stage-1-final-regression-2026-05-22T01-31-12Z.txt`
sha256:`5a19fce5df21390813778a2f381cec4fb768a0eba844f7cbb7838509f6ad9973`.)

| Package / tool | Tests | Result | Wall-clock |
|---|---:|---|---:|
| `packages/sph-water/tests/` | 22 | PASS | 0.58 s |
| `packages/reaction-diffusion-3d/tests/` | 8 | PASS | 24.18 s |
| `packages/boids-3d/tests/` | 10 | PASS | 45.04 s |
| `packages/physarum/tests/` | 10 | PASS | 10.47 s |
| `packages/strange-attractors/tests/` | 11 | PASS | 0.78 s |
| `packages/mandelbulb-explorer/tests/` | 10 | PASS | 0.25 s |
| `packages/reaction-diffusion-2d/tests/` | 14 | PASS | 2.50 s |
| `tools/integrity/tests/` | 48 | PASS | 0.81 s |
| `tools/diagnostics/...` | 22 | PASS | 0.17 s |
| `tools/testkit/...` | 47 | PASS | 2.01 s |

202 tests GREEN total. No regressions. The R20 routing's canonical-
capture commit (`fa36ca9`) is purely additive on all sibling-sim
behavior; the only consumer-visible change is the new
`captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{h5,json}`
artifact + the new perf-ledger row.

## 9. Banked observations for testing-strategy + future sub-phase plan-drafting

(Carry-forward from Stage 1 arc — informational; out-of-scope for
Stage 2 but load-bearing for the next sub-phase's plan-drafting
sessions.)

1. **Canonical-descriptor scope-analysis as a Stage 0 task.** The
   R12 → R16 → R17 → R18 → R19 → R20 arc demonstrates that
   canonical-descriptor implementability at the sub-phase's stack
   should be validated BEFORE Stage 1 starts, not surfaced as
   in-flight STOP-AND-SURFACE events. A pre-flight script at Stage 0
   that reads (a) canonical descriptor's N, (b) spec-ref's stack
   scope bounds, (c) this sub-phase's implementation stack, and
   estimates feasibility (memory + storage + wall-clock against
   ceilings) would catch the scope mismatch as a Stage 0 question.
   **Recommendation:** future sub-phase plans include a Stage 0 task
   `Task 0.4 — canonical-descriptor feasibility analysis`.

2. **Threshold-discipline lesson.** R19 (1-hour) and R20 (3-hour)
   stop-and-surface thresholds were set without explicit per-step
   decomposition rationale at the prompt's authoring time. The R20
   surface analysis (per-step decomposition with measured component
   floors: cKDTree-call ~3-5 s/step + numba-inner ~0.5-1 s/step +
   pair-array materialization ~1-2 s/step) is what every threshold
   should attach. **Recommendation:** future stop-and-surface
   thresholds attach explicit rooted analysis (per-step decomposition
   or equivalent) so they're not arbitrary numbers.

3. **Gate 7 single-scale exercise pattern.** Gate 7's exercise at
   diagnostic-tier (N=64) does not certify canonical-tier (N=100K)
   behavior. This is a generic limitation of "exercise at one scale,
   trust at all scales" testing. For sims with canonical-tier-only
   algorithms (cKDTree+numba), gate 7 at diagnostic scale only
   exercises the diagnostic-tier path. **Recommendation:** future
   sub-phase plans either add a canonical-tier gate-7 exercise (heavy
   but truthful) or document the gap explicitly.

4. **`common-py` is not actually consumed in the workspace at HEAD.**
   The numba-integration sub-phase's re-anchor finding (declared at
   `15fdbfb` commit message + landing audit § 2) shows that
   `common/common-py/` is NOT in the uv workspace members + NOT
   imported by any sim package. The Phase 1 charter assumed
   common-py would be the natural shared-Python-infrastructure
   layer; in practice it's an island. Phase 1 deliverable
   completeness question banked.

5. **FP-equivalent-within-1e-9 contract for vectorized vs scalar
   paths.** This sub-phase's `density_evolution_vectorized` vs
   loop variant + the numba-integration sub-phase's regression
   test both formalized this contract: vectorized NumPy and scalar
   inner loops are FP-equivalent within ~1e-9 (NOT bit-equivalent
   due to SIMD-vs-scalar gap), but bit-deterministic with
   themselves. The pattern is now project-wide via the numba
   convention; future sub-phases adopting numba inherit it.

6. **R16 cell-list intermediate is superseded by R17 cKDTree.** The
   cell-list implementation landed at `2a48a32` was retained as a
   docstring-historical hop in the R17 cKDTree replacement at
   `eb81d48`. Source code no longer contains the cell-list inner;
   the function name `cell_list_neighbor_query` is preserved for
   public-API stability. Per the audit-chain discipline (the R16
   surface audit at `6eba1dc` is sealed), this is documented for
   posterity.

## 10. Stage 2 readiness

Stage 1 is complete. Stage 2 (sub-phase landing) is dispatchable per
sub-phase plan § 7.3.

Stage 2 deliverables per the plan:
- Step 2.3 Cat 3 routing — operator-routable at Stage 2 dispatch
  (Decision A leans: lift DFSPH golden to ≥ 3 anchors + extend
  `_SUBDIRS_PICKED_UP`; mirror agent-based commits `3ce7809` +
  `d156792`).
- Step 2.7 B17 routing — operator-routable (PATH-A-continue with
  sph-water source + DFSPH generator targets, OR PATH-A-rebank).
- CHANGELOG additive entry per Step 2.8.
- Sub-phase landing audit per Step 2.9.
- Convention #12 SHA back-fill per Step 2.10.
- Final summary per Step 2.11 (no `-phase-N` tag; lean no tag;
  optional `v0.1.4` banked).

Stage 2 inherits 61 cumulative shifts + the six R-class resolutions
+ the algorithmic-evolution narrative + the six banked observations
above.

## 11. Closing

Stage 1 complete. The operator's six routings from Stage 0 + the
operator's five R-class continuation routings (R12, R16/17, R18 →
numba-integration, R19 revoke, R20 downsample) all resolved.
Canonical capture landed at 100K-instance per R20 routing;
algorithmic + API contract preserved for Stack-C Phase-2+ to
reproduce at full N=1M per spec-ref § 5.

Convention #12 SHA back-fill at close per sub-phase plan § 4.2
closing / § 10 discipline: a NEW commit will replace the
`31195d83173aa49b92854c58f3f3eedbe4bd138b` placeholders in this
audit's front-matter after the closing commit lands.
