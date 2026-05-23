# Task 0.3 — Canonical-descriptor scope-analysis (R-S3, load-bearing) + Task 0.5 derisk summary

Companion to `dfsph-taichi-smoke-scope-analysis-2026-05-23T23-40-26Z.txt` (raw
smoke output). Throwaway smoke source: `/tmp/sphwater_stackd_stage0_smoke.py`
(NOT committed; Stage-0 scratch per charter § 7.1). Hardware: same host as the
NumPy-reference perf-ledger row (`i7-12700KF-linux-6.17`).

## Methodology (per dispatch Task 0.3 (a)-(d))

(a) **Smoke.** Faithful-shape Taichi-cpu DFSPH workload: inlined spatial-hash
neighbor search (cell = 2h cutoff = 0.10; 27-cell stencil), 3D Monaghan
cubic-spline density summation (`SIGMA_3D = 1/π`, support q<2), fixed-cap
density-corrector inner loop. Lattice spacing dx=h → ~33 neighbors/particle
(realistic SPH density). `cpu_max_num_threads=1` + `default_fp=ti.f64`.

(b) **Scaling regime — EMPIRICALLY FIT, not assumed.** Per-step steady-state
(JIT/warmup excluded) measured at N ∈ {1000, 2197, 4096, 8000}, k=10 inner iters:

| N | per-step |
|---|---|
| 1000 | 13.6 ms |
| 2197 | 31.6 ms |
| 4096 | 59.4 ms |
| 8000 | 121.1 ms |

Log-log fit: **T_step ∝ N^1.047 → O(N)**. Confirms the inlined spatial-hash
neighbor-search regime (NOT O(N log N) kd-tree, NOT O(N²) all-pairs). Inner-iter
linearity (N≈2000): T_step(k) ≈ 0.09 ms + 3.18 ms·k → per-step cost is linear in
the DFSPH inner-iteration count, as expected.

(c) **Cross-check vs NumPy reference (1291.854 s).** Extrapolating the O(N) fit to
100 000 particles × 1000 steps:

| DFSPH combined inner-iters k | per-step @100K | TOTAL | vs bands |
|---|---|---|---|
| k=5  | 0.96 s | 958 s | **16.0 min** — PROCEED |
| k=10 | 1.91 s | 1911 s | **31.8 min** — PROCEED (< 43 min) |
| k=20 | 3.82 s | 3817 s | **63.6 min** — SURFACE band (43 min–3 h) |
| k=50 | 9.53 s | 9534 s | **158.9 min** — SURFACE band (approaching 3 h) |

NumPy reference = 1291.854 s (21.5 min); 2× perf band = 2583.7 s (43.1 min);
3-hour structural alarm = 10800 s.

(d) **Wall-clock estimate + routing.** Central estimate at a representative DFSPH
combined-iteration count (k≈10) = **~28–32 min, UNDER the ~43-min 2× band →
escape-hatch NOT triggered → PROCEED, full canonical horizon (D4) holds.**

## Sensitivity / caveats (surfaced honestly for operator awareness)

1. **DFSPH iteration count is the dominant uncertainty.** The reference caps each
   solver at `max_iter_density=50` + `max_iter_divergence=50` (combined up to 100)
   with `<=`-tolerance early-exit. The estimate crosses 43 min at **k ≳ 18–20
   combined iters/step**. A dam-break impact transient can spike iteration counts.
2. **Model optimism.** The smoke uses ONE corrector pass per inner iter; full DFSPH
   runs TWO solvers (divergence-free + constant-density), each recomputing density
   + α-factors per iteration. Real per-step work at a given nominal k is HIGHER
   than this model. The 28–32 min central estimate is therefore a *floor-leaning*
   figure, not a ceiling.
3. **Routing recommendation for Stage 1b:** instrument the actual DFSPH combined
   per-step iteration count early in 1b. If it lands ≥ ~18–20 (→ canonical capture
   > 43 min), invoke the R-S3 escape-hatch at that point and request operator
   routing among {full canonical / shorter horizon / diagnostic-tier-only}. The
   100K capture is ~59 MB — well under the 1 GB W1 ceiling (storage is NOT the
   constraint; wall-clock is).

**Task 0.3 verdict: PROCEED** (central estimate < 43 min; escape-hatch not
triggered) with the iteration-count sensitivity flagged for Stage-1b vigilance.

## Task 0.5 — DFSPH-Taichi-cpu kernel-pattern derisk (R-S2 / R-S3)

(a) **Determinism across two runs at same seed:** `np.array_equal(final
positions) == True`, `max|Δ| = 0.0` over 20 steps × 10 inner iters at N=1000.
Taichi-cpu `cpu_max_num_threads=1` serialises even the `ti.atomic_add` grid
insertion (insertion order == particle-id order), so the spatial-hash + density
+ corrector + integrate pipeline is **bit-exact run-twice deterministic**.

(b) **Taichi-DSL handles SPH neighbor iteration cleanly.** The 27-cell spatial-hash
stencil, dynamic per-cell neighbor counts, and per-pair gradient accumulation all
expressed in idiomatic Taichi-DSL with NO R-S3 scope expansion. The existing
Taichi-integration infra (IC-11/IC-12) suffices; neighbor search is inlined in the
port (phase-2-plan Rule I3) — **no neighbor-search utility scope-expansion needed.**

(c) **Golden-table consumability (charter Task 0.5).** Taichi-side cubic-spline
`W(0,1) = 0.3183098861837907` and `W(0.5,1) = 0.22878523069459955` reproduce the
Phase-0 `cubic-spline-kernel.json` anchors with **|err| = 0.0 (abs < 1e-12)** —
BUT only after pinning `default_fp=ti.f64`.

### R-S2-adjacent precision finding (Stage-1b note; NOT a blocker)

`common_py.determinism.set_taichi_deterministic` initialises Taichi WITHOUT
`default_fp=ti.f64` (its `ti.init` form is `arch=ti.cpu, random_seed,
cpu_max_num_threads=1, offline_cache=True`). With Taichi's default f32, bare-literal
kernel locals (`acc = 0.0`, `f = 0.0`) infer f32 → the cubic-spline `W` returned
~1e-8 error (FAILS the abs=1e-12 golden gate). RD-2D Stack-D sidesteps this by using
explicitly `ti.f64`-typed `ti.types.ndarray` kernel args. **Stage 1b MUST EITHER**
(i) call `ti.init(..., default_fp=ti.f64)` for the sph-water port, OR (ii) f64-type
every kernel local/intermediate so type-inference yields f64. Option (i) is the
cleaner posture for an f64-throughout DFSPH port matching the NumPy reference.
This does NOT require editing the IC-11 helper (no infra change in scope); it is a
port-local `ti.init` configuration. f64 vs f32 wall-clock difference was negligible
on this memory-bound workload (13.6 ms vs 14.1 ms @ N=1000), so the scope-analysis
estimate is unaffected.

**Note on the toy convergence metric:** the smoke's max-density-residual stayed
flat (~0.409) across inner-iter counts — this is an artifact of the simplified
toy corrector + lattice IC (a fixed kernel-sum density offset dominates), NOT a
Taichi limitation and NOT the real DFSPH α-factor solver. True DFSPH convergence
dynamics are a Stage-1b deliverable; only the *determinism* of the kernel pipeline
(passed, bit-exact) was the Stage-0 derisk target.

**Task 0.5 verdict: PASS** — Taichi-cpu DFSPH-shape kernels are deterministic,
neighbor-iteration is clean (no scope expansion), golden tables are consumable at
1e-12 with f64. No Hard-Rule-2 trigger.
