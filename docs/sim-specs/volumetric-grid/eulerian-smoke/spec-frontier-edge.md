# spec-frontier-edge.md — eulerian-smoke (frontier-edge variant)

> **Status:** IN-BUILD (Phase-6 cluster C-1, unit U-6). Drafted at C-1 U-6 stage 1c as
> the per-variant sheet; the shared `spec-frontier.md` stub STAYS for the remaining
> frontier variant 4.22 (the U-4/U-5 folder convention).
> **Parent reference sim:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`.
> **Variant type:** `frontier-edge`. **Primary stack:** C (C++ / Vulkan f64,
> lavapipe-pinned, + deterministic host transport) — COPY-ADAPTS only the Stack-C grid
> layer from U-5 vpfm (MAC grid, periodic MG Poisson, staggered curl/div f64 kernels,
> capture/determinism harness, TG closed forms); the grid backward-flow-map core is NEW
> (charter § 3.6: independent of the U-4/U-5 PARTICLE substrate — no particles).
> **Package:** `packages/eulerian-smoke-frontier-edge/` (CMake-only D11 registration;
> NOT a uv member).
> **Frontier paper:** Zhiqi Li\*, Ruicheng Wang\*, Junlin Li\*, Duowen Chen, Sinan Wang,
> Bo Zhu (\*co-first; all Georgia Institute of Technology), "EDGE: Epsilon-Difference
> Gradient Evolution for Buffer-Free Flow Maps", ACM TOG 44(4), SIGGRAPH 2025, DOI
> `10.1145/3731193` — re-verified live at probe + stage 1a (§ 1: no arXiv exists; ACM DL
> is the canonical record, the project page <https://pearseven.github.io/EDGEProject/>
> the live bibliographic + method witness, title/6-author list/venue verbatim).
> CITE-DON'T-IMPORT (no public code release found at probe). This is INCOMPRESSIBLE-Euler
> GRID flow maps — distinct from the compressible-flow-map paper DOI `10.1145/3731192`
> (D-1 conflation closed, charter § 10 / probe § 1).
> **Stage-0 probe:** `docs/_audits/phase-6/c1-u6-edge-probe-2026-06-15T15-42-50Z.md`.
> **Charter:** `docs/phases/phase-6/c1-charter.md` § 3.6 (RATIFIED § 10, incl. D-1 =
> EDGE proper).

## § 1 Scope

Inviscid incompressible Euler advected by a **GRID-side backward flow map with on-grid
gradient evolution** — buffer-free, O(1) memory in the flow-map length. The state is the
backward map ψ (stored as the periodic-smooth displacement d = ψ − x) and its first
Jacobian J = ∇ψ, both **evolved DIRECTLY on the grid** (the EDGE "gradient evolution",
anchor § 3 item 1 — no per-step velocity-buffer history retained). Per step, in the
frozen MAC velocity u:

- backtrace the departure point x_dep(x) by RK4 of dφ/ds = −u(φ), φ(0) = x, x_dep =
  φ(dt); JOINTLY evolve the backtrace Jacobian M = ∂x_dep/∂x by the variational equation
  dΨ/ds = −∇u(φ)·Ψ, Ψ(0) = I, M = Ψ(dt) — M is built from the evolved velocity gradient
  ∇u, NOT a finite-difference of a stored buffer (the gradient-evolution lever);
- compose the map by the chain rule (gather-only): d^{n+1}(x) = (x_dep − x) +
  interp(d^n, x_dep); J^{n+1}(x) = interp(J^n, x_dep) · M(x);
- reconstruct the edge vorticity by the Cauchy formula ω(x) = F · ω_ref(ψ(x)), F = J^{-1}
  (the forward deformation gradient); then velocity by the componentwise vector-potential
  Poisson ΔΨ_d = −ω_d, u = ∇×Ψ on a staggered MAC grid (edge Ψ/ω, face u — the U-5
  compatible curl/div stencil pair, copy-adapted verbatim);
- reinit every L steps (`reinit_interval`): d ← 0, J ← I, ω_ref ← current edge vorticity
  (bounds the map length; the O(1)-memory lever). Periodic unit cube.

**High-accuracy departure-point sampling (anchor § 3 item 3, "Hermite interpolation"):**
ω_ref is resampled at ψ by a periodic **interpolating Catmull-Rom cubic** (C¹, 3rd-order,
passes through node values) rather than the smoothing quadratic-B-spline gather — the
B-spline attenuated the oscillatory ω_ref ~0.5 %/resample and drove the steady-anchor
energy down ~2 %; the interpolating cubic removes that bias.

**Adaptations vs the paper (documented):**

- **fixed dt = 0.00125** — the MEASURED CFL-safe fixed step at 128³ (stage-1c SHIFT,
  charter § 0.3; method + measured window in § 5). The locked descriptor
  `taylor-green-128cube-seed42-step500` fixes the grid (128³) and step count (500), which
  are matched VERBATIM; the fixed-dt VALUE is the documented descriptor-parity adaptation
  (the paper's CFL-adaptive Δt is unused). The descriptor's nominal dt = 0.005 is **not**
  inherited — it was MEASURED at build to cross EDGE's CFL ceiling 1/(n·dt) = 1.56 at
  128³: the live u_max/Courant trace at dt = 0.005 ran 0.93 (step 100) → 2.07 (step 150,
  past the ceiling) → 67.3 (step 200) → 2541 (step 250), a runaway by t ≈ 1.0 (the U-5
  cascade failure class, re-measured for EDGE). dt = 0.00125 (ceiling 6.25, 4× the
  descriptor ceiling; Courant C ≈ 0.15 over the run — ~6× below the C ≈ 1 instability
  onset) keeps all 500 steps in the well-conditioned pre-cascade window (§ 5).
- **higher-order ε-difference (anchor § 3 item 2) DEFERRED with cause** — EDGE's first
  Jacobian ∇ψ is evolved EXACTLY by the variational equation (item 1), which suffices for
  the Cauchy transport ω = J^{-1}·ω_ref and the gated acceptance surfaces; the
  tetrahedron-based ε-difference for the map's HIGHER derivatives (curvature / Hessian) is
  an accuracy refinement not exercised by the gated anchors and is deferred (charter § 3.6
  scope; not required by gated acceptance). The unit's distinctive RIGOROUS claim is the
  O(1)-memory property (§ 6 PBT 2 + the perf-ledger memory row), which the item-1
  evolution + reinit already realize.
- **fixed-count MG V(2,2)** per Ψ component (deterministic by count) instead of AMGPCG;
  **solid-boundary surface DEFERRED with cause** (probe § 4.4 — charter § 3.6
  pre-authorized: the canonical periodic descriptor exercises zero boundary code); the
  harmonic correction reduces to mean handling in the periodic domain (the discrete curl
  output is exactly mean-free per axis-slice telescoping; the TG family has zero mean
  flow); passive smoke density transported by the parent's semi-Lagrangian op-order
  (parent capture field parity, U-5 code reuse).

## § 2 Derivations (hand-derivation anchor; full notes in `src/edge_detail.hpp`)

- **Vorticity closed forms (ω = ∇×u, k = 2π), FD-verified in A1 (identical to U-4/U-5):**
  3D parent TG: ω = k·(−cos kx·sin ky·sin kz, −sin kx·cos ky·sin kz,
  2·sin kx·sin ky·cos kz). 2D-z-invariant: ω = (0, 0, 2k·sin kx·sin ky). FD-cross-checked
  ≤ 1e-8 at 216 off-lattice points (A1).
- **Compatible curl/divergence stencil pair (U-5 verbatim):** edge Ψ (+owner layout) →
  face u by edge-circulation differences; the 6-face divergence sum telescopes every edge
  value EXACTLY → div(u) is an FP-scale identity, not a truncation bound. MEASURED 1b:
  ≤ 3.82e-15 across regimes (gate: 1e-12·max(1,‖u‖_∞)·n).
- **Backtrace Jacobian (the gradient-evolution lever, anchor § 3 item 1):** with
  dφ/ds = −u(φ) and the variational dΨ/ds = −(∇u)(φ)·Ψ, M = Ψ(dt) = ∂x_dep/∂x is integrated
  by the SAME RK4 as the departure point (one (u, ∇u) sample per RK stage, frozen field).
  The map Jacobian then composes by the chain rule J^{n+1} = J^n(x_dep)·M — this is the
  on-grid evolved ∇ψ, never reconstructed from a stored velocity buffer (the buffer-free
  property, anchor headline).
- **Cauchy vorticity transport:** with a = ψ(x) the origin and F = ∂x/∂a = (∇ψ)^{-1} the
  forward deformation gradient, ω(x) = F·ω_ref(a) = J(x)^{-1}·ω_ref(ψ(x)). For the
  z-invariant 2D field J is block-diagonal with F_zz = 1, so ω_z = ω_ref,z(ψ) — the
  materially-conserved-scalar limit (no stretching), recovered EXACTLY by the general
  form (the structural correctness check carried by A3 + the PBT sweep).
- **Gradient-evolution-vs-FD consistency (A2 item 1):** the evolved J must agree with a
  central difference of the evolved map ψ: ∂ψ_i/∂x_j|_fd = δ_ij + (d_i(c+ê_j) −
  d_i(c−ê_j))/(2h). The residual ‖J − (I + ∇d_fd)‖_max is the interp-vs-evolved mismatch
  — O(dx²)-ish and resolution-CONVERGING (an index/sign defect would NOT converge: the
  discriminator). MEASURED 1b: 1.097e-2 (n=16) → 3.414e-3 (n=32), converging ~3.2×.

## § 3 Verification surfaces

1. **A1 — exact discrete structure + analytic goldens:** closed-form vorticity lift
   FD-cross-checked (≤ 1e-8 at 216 pts); div(curl) exact identity (MEASURED ≤ 3.82e-15);
   reconstruction golden — velocity from the edge-sampled analytic 2D-TG vorticity
   converges to analytic TG (O(dx²): ratio measured ~3.96× per halving, gate ≥ 3×;
   ceiling 5e-3 at n=32, MEASURED 1.600e-3 — the shared U-5 reconstruct value).
   `tests/test_edge.cpp`.
2. **A2 — the EDGE flow-map surfaces (anchor § 3):** **gradient evolution (item 1)** —
   the evolved on-grid J = ∇ψ matches a central difference of the evolved map ψ, bounded
   + resolution-converging (MEASURED 1.097e-2 → 3.414e-3 at n=16/32, ~3.2×; ceilings
   0.04 / 0.012 at ~3.5× margin). **O(1) memory (item 4)** — the persistent backward-map
   working set (d: 3·ncell + J: 9·ncell + ω_ref: 3·ncell, all f64) is a function of n
   ONLY: the `backward_map_memory_constant` PBT runs the SAME trajectory at L = 10 and
   L = 40 (4× the flow-map length) and asserts the measured peak bytes are IDENTICAL (the
   falsifiable O(1) surface; buffer methods grow with L, EDGE does not).
3. **A3 — adapted inviscid Taylor-Green steady anchor (U-4/U-5 inherited, probe § 4.1):**
   the z-invariant 2D TG is an exact steady Euler solution: steady drift MEASURED 2.974e-4
   (n=32, 50 steps) → declared ≤ 1.5e-3; kinetic-energy conservation MEASURED 2.624e-5
   rel → declared ≤ 1e-4; vorticity-lift IC residual MEASURED 1.600e-3 → declared ≤ 5e-3
   (all ~3-5× margins). The interpolating Catmull-Rom departure-point resample (item 3) is
   what holds the steady anchor (the smoothing B-spline gather drove energy down ~2 %).
4. **Kelvin budgets (charter § 3.6 anchor (b)):** total-vorticity component integrals
   MEASURED ≤ 7.21e-14 + fixed grid-loop circulation drift MEASURED ≤ 1.16e-11 across all
   six (L, IC) sweep regimes → declared ≤ 1e-9 / ≤ 1e-8. **BOTH at FP-identity scale** —
   the grid Cauchy transport has no P2G scatter, so the analytically-zero TG integrals
   stay at FP zero, far tighter than the U-5 particle method's ~4e-5 budget. PBT 2-bonus
   surface.
5. **REFRAMED frontier-vs-parent equivalence (charter § 3.6; metric-based, no new
   tolerance category):** budget-metric fixtures (`tests/python/derive_budget_metrics.py`
   → committed JSON under `edge-equivalence/`; metrics byte-identical to U-4/U-5 by
   design; CI never pulls the LFS captures). Parent side: the U-4 committed fixture
   `clebsch-pfm-equivalence/parent-budget-metrics.json` is cross-referenced DIRECTLY
   (single-source decision, probe § 4.5 / the U-5 precedent) — the parent canonical
   trajectory is MEASURED blown up by step 50 (u_max 1.337e8). Variant-side measured
   numbers + declared clauses filled at 1c from the canonical capture.
   **DECLARED gate (clauses (a)–(d), bounds MEASURED-then-declared from the 1c canonical
   capture at dt = 0.00125; margins ≥ 2.5×):**
   - **(a) frame-0 (IC) agreement vs the parent's analytic 3D-TG** — the EDGE closed-form
     vorticity lift is the SAME direct lift as U-5 (so the frame-0 numbers match U-5 to
     the last digit): KE rel MEASURED 4.016e-4 → declared ≤ 1.2e-3; enstrophy rel 4.016e-4
     → ≤ 1.2e-3; u_max abs 2.006e-4 → ≤ 6e-4; density-mass rel 2.20e-16 → ≤ 1e-12;
     second-moment rel 5.74e-16 → ≤ 1e-12 (identical blob, FP-tight).
   - **(b) parent-fixture integrity** — the parent's step-50 blowup is present (MEASURED
     u_max 1.337e8 ≥ declared floor 1e6).
   - **(c) variant physical over the FULL window [0, 500]** (every captured frame): KE
     drift MEASURED ≤ 3.545e-2 (KE 0.124950 → 0.129379; the enstrophy-×4.42 vortex
     stretching feeds KE on the grid) → declared ≤ 9e-2; enstrophy/enstrophy(0) MEASURED
     ∈ [1.000, 4.415] → declared band [0.8, 12.0]; u_max MEASURED ≤ 0.998896 → declared
     ≤ 2.5; density-mass drift MEASURED ≤ 1.740e-1 (semi-Lagrangian, strengthening flow)
     → declared ≤ 0.45.
   - **(d) stability contrast (all 11 frames):** variant u_max MEASURED 0.998896 → declared
     ≤ 2.5 (NO saturation regime — bounded ≈ 1 throughout, the whole captured window is
     pre-cascade at dt = 0.00125); the parent exceeds 1e6 by step 50 (1.337e8) — a ~8-order
     stability contrast (variant ≈ 1 vs parent → 4.87e20 max).

   | budget (variant frame) | step 0 | step 250 | step 500 | parent step 50 |
   |---|---|---|---|---|
   | kinetic_energy | 0.124950 | 0.125619 | 0.129379 | 1.509e13 |
   | enstrophy | 14.7866 | 22.1473 | 65.2874 | (NaN-saturated) |
   | u_max | 0.998896 | 0.935188 | 0.988736 | 1.337e8 |

   Variant fixture `edge-equivalence/variant-budget-metrics.json` (payload provenance
   sha256 `6e8e10e9…` travels inside); parent fixture cross-referenced single-source.
   `tests/python/test_reframed_equivalence.py` (ctest `edge_reframed_equivalence`) —
   GREEN at 1c.

## § 4 Determinism

MEASURED bit-exact same-stack-same-hw: 2-run bit-identity witness at every `run_edge`
invocation (tolerance 0.0; witness run #2 IS the capture run, so the capture bytes are
the asserted-identical bytes). Design: gather-only fixed-order grid flow-map transfers
(per-cell/per-edge gather, no scatter), order-sensitive global reductions run
sequentially, no atomics, colour-parallel RB-GS, fixed-count MG, f64 host transcendentals
(R-CPPB2 libm caveat documented, gated on numeric equivalence not bytes).
**Cross-optimization-level identity (by construction; not a gate, not separately
re-measured for EDGE this session):** the package uses the IDENTICAL per-target
`-O3 -ffp-contract=off` strict-IEEE flags (no FMA fusion, GCC performs no FP reassociation
without fast-math) and the IDENTICAL determinism design (gather-only, sequential
reductions, no atomics) as the U-4/U-5 siblings, which MEASURED `-O3` ≡ `-O0` bit-identity
— so the property holds by construction; the explicit EDGE `-O0` witness is a deferred
non-gate robustness check (the gate-10 surface is the 2-run SAME-build witness above,
MEASURED). Canonical witness: see § 5. Registry:
`[volumetric-grid.eulerian-smoke-frontier-edge]`. No EFECT.

## § 5 Capture

`captures/eulerian-smoke-frontier-edge/taylor-green-128cube-seed42-step500.{h5,json}` —
the Appendix D.2.3 descriptor row VERBATIM (grid 128³, seed 42, step 500). Fields
u/v/w/density (each 128×128×128 f64, **[x][y][z] axis layout matching the parent** — the
U-4/U-5 transpose lesson priced in from the start), 11 frames at cadence 50, schema
1.0.0. Captured at **dt = 0.00125** (the § 1 CFL-safe SHIFT — manifest `params.dt`).
IC: closed-form vorticity lift of the parent's analytic 3D TG (§ 2; deterministic, no
descent) + the parent's density blob (σ=0.1, amplitude 1); `init_velocity_residual`
recorded in the manifest params (MEASURED 1.00345e-4 at 128³ — the direct lift, identical
to the U-5 sibling, no init-quality pathology). **CFL method + measured window
(measured-then-declared via the in-run u_max/Courant monitor):** the dt was sized by a
live trace of u_max and the advective Courant C = u_max·dt·n at 128³. At the descriptor
dt = 0.005 the inviscid-TG cascade crosses EDGE's CFL ceiling 1/(n·dt) = 1.56 by t ≈ 0.7
(u_max 0.93 → 2.07 at step 150 → 67.3 at step 200 → 2541 at step 250 — runaway, DISCARDED).
At **dt = 0.00125** (ceiling 6.25) the run's Courant stays C ≈ 0.149-0.160 (~6× below the
C ≈ 1 onset) and u_max is bounded ≤ 0.998896 over ALL 11 frames (KE 0.124950 → 0.129379,
3.5 % drift; enstrophy 14.79 → 65.29, ×4.42 by real vortex stretching; div_max 4.80e-14;
total-vort 7.72e-11). 500 steps at dt = 0.00125 = physical t = 0.625, the **pre-cascade
window** — the cascade onset (t ≈ 0.7, measured above) is OUTSIDE the captured window
(the U-5 characterization, independently re-measured for EDGE). Canonical 2-run witness
sha256 `508841448d461a57f31f4af72f89850cd46bd7939d39d5d13ab71badb867ae70`; payload sha256
`6e8e10e93da79bc4f3ae374605b0842db8155b2b8f056f672ab96b6ee2e79c75` (MEASURED from the
finished canonical run; KE conserved within 3.5 %, all 11 frames physical).

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`reconstructed_velocity_divergence_free`** (charter § 3.6 proposal): the exact
   div∘curl identity at FP scale EVERY step (measured max over the run ≤ 3.82e-15 across
   regimes; declared ≤ 1e-12), swept across reinit L ∈ {20, 8, 4} × both ICs (doctest
   deterministic sweeps — the Stack-C gate-11 analogue).
2. **`backward_map_memory_constant`** (charter § 3.6 proposal — THE distinctive rigorous
   gate, anchor § 3 item 4): the persistent backward-map peak working set is CONSTANT as
   the flow-map length L (reinit interval) grows. MEASURED: the same trajectory at L=10
   and L=40 has IDENTICAL peak bytes; absolute figure at 128³ = **251,658,240 bytes
   (240 MiB)** — exactly (3 displacement + 9 Jacobian + 3 ω_ref)·128³·8 = 15·n³·8, a
   function of n ONLY (independent of L; perf-ledger memory row). This is the unit's most
   falsifiable surface (buffer methods grow with L; EDGE does not).
3. (bonus) `total_circulation_bounded` (Kelvin: total-vort ≤ 1e-9 + slice-circ ≤ 1e-8,
   both at FP-identity scale) ships inside the PBT sweep.

## § 7 Citations (Cat 1)

- Li, Wang, Li, Chen, Wang, Zhu (2025), DOI 10.1145/3731193 — the frontier method (EDGE
  proper; buffer-free Hermite flow maps, O(1) memory). NOT DOI 10.1145/3731192 (the
  distinct compressible-flow-map paper; D-1 conflation closed).
- Li, Lin, Chen, Zhou, Xiong, Zhu (2025), DOI 10.1145/3731194 — Clebsch PFM (the U-4
  parent this unit's REFRAMED gate cross-references single-source).
- Wang, Zhou, Feng, Li, Sun, Chen, Turk, Zhu (2025), DOI 10.1145/3731198 — VPFM (the U-5
  sibling whose Stack-C grid layer this unit copy-adapts).
- Cottet & Koumoutsakos (2000), *Vortex Methods* — Cauchy vorticity formula provenance.

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

A1 closed-form vorticity lift + exact discrete div∘curl identity (hand-derived § 2),
A2 the gradient-evolution-vs-FD consistency (hand-derived, algebraically the variational
equation) + the MEASURED O(1)-memory property (the anchor's headline mechanically-testable
claim), A3 the inviscid steady 2D-TG-in-3D Euler solution (analytic, classical) + the
REFRAMED budget-metric comparison vs the landed parent capture. See § 3.

## § 9 Replayable capture

§ 5 capture + corpus seed `tests/fixtures/legacy-captures/phase-6-c1-edge.{h5,json}`
(8-step n=16 short-horizon fixture, 2 frames, schema 1.0.0, witness
`d6c7c4fcea754d001a157cd3ea0830cc250035a7d3a4ddd163f7f594a6c843b7`; corpus lock 40→41).

## § 10 Determinism ↔ capture

Manifest `determinism.claimed = "bit-exact-same-hw"` ↔ § 4 registry row.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Canonical capture invocation row in `docs/perf-ledger.md` (gate-12; stage 1c): **2459 s**
wall (2-run bit-identity witness + 738 MB capture write; ~2.5 s/step per run at 128³ —
faster than the U-5 ~5.9 s/step, the grid-side method having no 16.8M-particle transport)
+ **the O(1)-memory peak working set: ~3.52 GiB peak RSS MEASURED** (vs the U-5 particle
method's ~12.2 GB — the grid-side memory advantage) with the **240 MiB constant
backward-map state at 128³** (the headline rigorous figure; CONSTANT in flow-map length L
— the anchor's O(1) claim, mechanically measured). The package builds
`-O3 -ffp-contract=off` per-target (§ 4; tree default -O0 — the U-4/U-5 measured ~10×
penalty applies).

## § 13 Gate-13

RED ctest evidence hashed in the stage-1a commit footer (9 cases, 0 passed; sha
`4be97e88…`); GREEN at 1b (9/9, 147,718 assertions). The pytest replay tool does not
drive ctest — the landing replay re-runs the RED suite shape in a worktree (the U-3/U-4/
U-5 banked adaptation).

## Gate-14 / mutation / tolerance routing

**Gate-14:** N/A (no cross-stack sibling; charter § 3.6 — the REFRAMED metric gate of
§ 3.5 is the frontier equivalence). **Mutation:** N/A (C++; mutmut is python-only — the
rd2d/U-3/U-4/U-5 precedent). **Tolerance routing:** `smoke` category untouched; no new
category; the REFRAMED thresholds are declared HERE (§ 3.5) per the ratified charter
language ("metric-based, declared in the spec sheet — no budget widening").
