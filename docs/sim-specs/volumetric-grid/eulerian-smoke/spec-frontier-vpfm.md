# spec-frontier-vpfm.md — eulerian-smoke (frontier-vpfm variant)

> **Status:** IN-BUILD (Phase-6 cluster C-1, unit U-5). Drafted at C-1 U-5 stage 1c as
> the per-variant sheet; the shared `spec-frontier.md` stub STAYS for the remaining
> frontier variants 4.16/4.22 (the U-4 folder convention).
> **Parent reference sim:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`.
> **Variant type:** `frontier-vpfm`. **Primary stack:** C (C++ / Vulkan f64,
> lavapipe-pinned, + deterministic host transport) — REUSES the U-4 particle-flow-map
> substrate (charter § 4 ordering rationale).
> **Package:** `packages/eulerian-smoke-frontier-vpfm/` (CMake-only D11 registration;
> NOT a uv member).
> **Frontier paper:** Wang, Zhou, Feng, Li, Sun, Chen, Turk, Zhu, "Fluid Simulation on
> Vortex Particle Flow Maps", ACM TOG 44(4), SIGGRAPH 2025, DOI `10.1145/3731198`,
> arXiv:2505.21946 — re-verified live at probe (§ 1: ACM DL 403'd, same access mode as
> U-4; the arXiv v1 record is the live bibliographic witness, title/authors verbatim).
> CITE-DON'T-IMPORT (no public code release found at probe).
> **Stage-0 probe:** `docs/_audits/phase-6/c1-u5-vpfm-probe-2026-06-13T00-19-01Z.md`.
> **Charter:** `docs/phases/phase-6/c1-charter.md` § 3.5 (RATIFIED § 10).

## § 1 Scope

Inviscid incompressible Euler in **vorticity form on particle flow maps**: vorticity
is the evolved quantity via the Cauchy formula ω_c = ℱ_{[a,c]}·ω_a (Eq. 12 —
stretching enters through the forward flow-map Jacobian, no finite-difference
stretching term); the vorticity gradient maps through the SHORT segment
∇ω_c = ℱ_b·∇ω_b·𝒯_b + ∇ℱ_b·ω_b (Eq. 13); Jacobians evolve per Dℱ/Dt = ∇u·ℱ,
D𝒯/Dt = −𝒯·∇u (Eq. 11), and the flow-map Hessian ∇ℱ evolves DIRECTLY on particles
(Eq. 14 — the paper's central innovation, buying 3–12× longer stable maps). Per step:
RK4 advection of (x, ℱ_long, ℱ_short, 𝒯_short, ∇ℱ); APIC P2G of the mapped (ω, ∇ω)
onto edge-centred grid vorticity (Eq. 20); velocity reconstruction — componentwise
vector-potential Poisson ΔΨ_d = −ω_d, u = ∇×Ψ on a staggered MAC grid (edge Ψ/ω,
face u); dual reinit cadences n_v = 20 (long) / n_g = 5 (short). Periodic unit cube.

**Adaptations vs the paper (documented):** fixed dt = 0.00125 — the MEASURED CFL-safe
fixed step at 128³ (stage-1c SHIFT, charter § 0.3). The locked descriptor
`taylor-green-128cube-seed42-step500` fixes the grid (128³) and step count (500),
which are matched VERBATIM; the fixed-dt VALUE is the documented descriptor-parity
adaptation (the paper's CFL-adaptive Δt is unused). The descriptor's nominal dt = 0.005
crosses the inviscid-TG cascade's CFL ceiling 1/(n·dt) = 1.56 (MEASURED u_max 6.46 by
step 200) and the run blows up to NaN by step 250; dt = 0.00125 (ceiling 6.25 — 4×
headroom) keeps all 500 steps a well-conditioned pre-cascade window (physical t = 0.625;
MEASURED u_max bounded ≤ 0.999 over EVERY frame, KE conserved to 0.97 %). The step-based
reinit cadences run 4× more often per physical time at the smaller dt, which is
additionally stabilizing. fixed-count MG V(2,2) per Ψ component
(deterministic by count) instead of AMGPCG; **solid-boundary surface DEFERRED with
cause** (probe § 4.2 — charter § 3.5 pre-authorized: the canonical periodic descriptor
exercises zero boundary code; cut-cell no-through + Brinkmann no-slip are the paper's
heaviest engineering and would be untested-by-the-capture surface area); the harmonic
correction reduces to mean handling in the periodic domain (the discrete curl output
is exactly mean-free per axis-slice telescoping; the TG family has zero mean flow);
passive smoke density transported by the parent's semi-Lagrangian op-order (parent
capture field parity, U-4 code reuse).

## § 2 Derivations (hand-derivation anchor; full notes in `src/vpfm_detail.hpp`)

- **Vorticity closed forms (ω = ∇×u, k = 2π), FD-verified in A1:**
  3D parent TG: ω = k·(−cos kx·sin ky·sin kz, −sin kx·cos ky·sin kz,
  2·sin kx·sin ky·cos kz). 2D-z-invariant: ω = (0, 0, 2k·sin kx·sin ky).
  (The probe § 4.1 wrote the 2D ω_z with cos·cos — a transcription slip corrected at
  1b-i; the sin·sin closed form here is FD-cross-checked at 216 assertion points.)
- **Eq.-14 re-derivation (commutator form):** with Dℱ_ij/Dt = (∇u)_ik ℱ_kj and
  D/Dt(∂_l φ) = ∂_l(Dφ/Dt) − (∂_l u_m)(∂_m φ):
  D(∂_l ℱ_ij)/Dt = (∇∇u)_ikl ℱ_kj + (∇u)_ik (∇ℱ)_kjl − (∇ℱ)_ijm (∇u)_ml — matches the
  paper's index form by the (k,l) symmetry of ∇∇u. ∇∇u sampled via the CONSTANT
  {1,−2,1}/h² quadratic-B-spline second-derivative stencil + mixed-partial chains.
- **Compatible curl/divergence stencil pair (probe § 4.3):** edge Ψ (+owner layout) →
  face u by edge-circulation differences; the 6-face divergence sum telescopes every
  edge value EXACTLY → div(u) is an FP-scale identity, not a truncation bound.
  MEASURED 1b: ~7.3e-15 across regimes (gate: 1e-12·max(1,‖u‖_∞)·n).
- **Hessian-vs-FD probe identity:** ±ε clones perturbed at the short-map start b
  measure ∇_ψℱ; the evolved quantity is ∇_xℱ; they relate through ∂ℱ_ij/∂x_l =
  (∂ℱ_ij/∂ψ_m)·𝒯_ml. **MEASURED REALITY (1b, honest record):** the velocity field is
  the quadratic-B-spline interpolant — C¹ only, with piecewise-constant second
  derivatives — so the pointwise Eq.-14 evolution and the interval-averaging FD
  differ by O(dx·∂³u·t) where clone pairs straddle stencil boundaries. Measured
  1.279e-1 (n=16) → 8.669e-2 (n=32) against signal ‖∇ℱ‖ ≈ 1.6 (~5–8% relative),
  resolution-DECREASING — the bug-vs-smoothness discriminator (an index/sign defect
  would not converge). Gate = convergence + measured ceilings at ~2× margin.

## § 3 Verification surfaces

1. **A1 — exact discrete structure + analytic goldens:** closed-form vorticity lift
   FD-cross-checked (≤1e-8 at 216 points); div(curl) exact identity (MEASURED
   7.3e-15); reconstruction golden — velocity from the edge-sampled analytic 2D-TG
   vorticity converges to analytic TG (O(dx²): ratio measured ~3.9× per halving,
   gate ≥3×; ceiling 5e-3 at n=32, measured ~1.6e-3); carried ω_a bit-drift MEASURED
   **exactly 0.0** between long-map reinits (the Cauchy payload is carried, never
   evolved — the U-4 0-form analogue). `tests/test_vpfm.cpp`.
2. **A2 — flow-map fidelity:** ‖𝒯ℱ − I‖_max MEASURED 3.461e-9 (n=16, dt=0.005,
   10 steps) → declared ≤ 1e-7 (~29× margin), with the O(dt⁴) contraction gate
   (dt-halving ratio ≥ 8 asserted; measured 16.3×); evolved-∇ℱ-vs-FD probe gate
   (§ 2 measured reality; convergence + ceilings 0.25/0.17 at n=16/32).
3. **A3 — adapted inviscid Taylor-Green steady anchor (U-4 adaptation inherited,
   probe § 4.1):** the z-invariant 2D TG is an exact steady Euler solution: steady
   drift MEASURED 5.411e-4 (n=32, 50 steps) → declared ≤ 2e-3; kinetic-energy
   conservation MEASURED 9.678e-4 rel → declared ≤ 3e-3; vorticity-lift IC residual
   MEASURED 1.600e-3 → declared ≤ 5e-3. (All ~3× margins; vs U-4's wave-fit init the
   closed-form vorticity lift is ~450× more accurate at 128³ — measured 1.003e-4
   canonical init residual vs U-4's 4.59e-2.)
4. **Kelvin budgets (charter § 3.5 anchor (b)):** total-vorticity component integrals
   MEASURED ≤ 4.34e-5 across all six (n_v, n_g, IC) sweep regimes → declared ≤ 2e-4;
   fixed-slice Stokes circulations (axis-perpendicular full cross-sections — exactly
   the periodic boundary circulation, 0 in continuum) drift MEASURED ≤ 2.14e-3 →
   declared ≤ 1e-2. PBT 2 surface.
5. **REFRAMED frontier-vs-parent equivalence (charter § 3.5; metric-based, no new
   tolerance category):** budget-metric fixtures (`tests/python/derive_budget_metrics.py`
   → committed JSON under `vpfm-equivalence/`; CI never pulls the LFS captures).
   Parent side: the U-4 committed fixture `clebsch-pfm-equivalence/parent-budget-metrics.json`
   is cross-referenced directly (single-source decision, probe § 4.5) — the parent
   canonical trajectory is MEASURED blown up by step 50 (u_max 1.337e8). Variant-side
   measured numbers + declared clauses in § 3.4-style table below (filled at 1c from
   the canonical capture).
   **DECLARED gate (clauses (a)–(d), bounds MEASURED-then-declared from the 1c
   canonical capture at dt = 0.00125; margins ≥ 2.5×):**
   - **(a) frame-0 (IC) agreement vs the parent's analytic 3D-TG** — the VPFM
     closed-form vorticity lift starts ~50× closer than the U-4 wave-fit: KE rel
     MEASURED 4.016e-4 → declared ≤ 1.2e-3; enstrophy rel 4.016e-4 → ≤ 1.2e-3; u_max
     abs 2.006e-4 → ≤ 6e-4; density-mass rel 2.20e-16 → ≤ 1e-12; second-moment rel
     5.74e-16 → ≤ 1e-12 (identical blob, FP-tight).
   - **(b) parent-fixture integrity** — the parent's step-50 blowup is present
     (MEASURED u_max 1.337e8 ≥ declared floor 1e6).
   - **(c) variant physical over the FULL window [0, 500]** (every captured frame):
     KE drift MEASURED ≤ 9.739e-3 → declared ≤ 2.5e-2; enstrophy/enstrophy(0) MEASURED
     ∈ [1.000, 4.439] (growth by real vortex stretching) → declared band [0.8, 12.0];
     u_max MEASURED ≤ 0.99890 → declared ≤ 2.5; density-mass drift MEASURED ≤ 1.742e-1
     (semi-Lagrangian, strengthening flow) → declared ≤ 0.45.
   - **(d) stability contrast (all 11 frames):** variant u_max MEASURED 0.99890 →
     declared ≤ 2.5 (NO saturation regime — bounded ≈ 1 throughout, unlike U-4's
     wave-ceiling saturation u_max ≈ 477); the parent exceeds 1e6 by step 50 — a ~20-order
     stability contrast (variant ≈ 1 vs parent → 4.87e20).

   | budget (variant frame) | step 0 | step 250 | step 500 | parent step 50 |
   |---|---|---|---|---|
   | kinetic_energy | 0.124950 | 0.125157 | 0.126167 | 1.509e13 |
   | enstrophy | 14.7866 | 22.3035 | 65.6334 | (NaN-saturated) |
   | u_max | 0.99890 | 0.93632 | 0.93292 | 1.337e8 |

   Variant fixture `vpfm-equivalence/variant-budget-metrics.json` (payload provenance
   sha256 `1e04a359…` travels inside); parent fixture cross-referenced single-source.
   `tests/python/test_reframed_equivalence.py` (ctest `vpfm_reframed_equivalence`) —
   GREEN at 1c.

## § 4 Determinism

MEASURED bit-exact same-stack-same-hw: 2-run bit-identity witness at every `run_vpfm`
invocation (tolerance 0.0; witness run #2 IS the capture run, so the capture bytes
are the asserted-identical bytes). Design: gather-only fixed-order particle transfers
(counting-sort binning, sequential scatter + reductions), no atomics, colour-parallel
RB-GS, fixed-count MG, f64 host transcendentals (R-CPPB2 libm caveat documented,
gated on numeric equivalence not bytes). **Cross-optimization-level identity
MEASURED:** the per-target `-O3 -ffp-contract=off` build (strict IEEE: no FMA fusion,
no reassociation) is bit-identical to `-O0` — witness `57035cdb…` at n=32/10 steps
both builds. Canonical witness: see § 5. Registry:
`[volumetric-grid.eulerian-smoke-frontier-vpfm]`. No EFECT.

## § 5 Capture

`captures/eulerian-smoke-frontier-vpfm/taylor-green-128cube-seed42-step500.{h5,json}`
— the Appendix D.2.3 descriptor row VERBATIM (grid 128³, seed 42, step 500). Fields
u/v/w/density (each 128×128×128 f64, **[x][y][z] axis layout matching the parent** —
the U-4 transpose lesson priced in from the start), 11 frames at cadence 50, schema
1.0.0. Captured at **dt = 0.00125** (the § 1 CFL-safe SHIFT — manifest `params.dt`).
IC: closed-form vorticity lift of the parent's analytic 3D TG (§ 2; deterministic, no
descent) + the parent's density blob (σ=0.1, amplitude 1); `init_velocity_residual`
recorded in the manifest params (MEASURED 1.00345e-4 at 128³ — no init-quality
pathology class exists for the direct lift; the U-4 § 2 instability does not arise).
Canonical 2-run witness sha256 `41caa46fe37a4f63d529b1b9befdb8914a394688761b6b3ef231342eb97e77ba`;
payload sha256 `1e04a35918a763997bcedc6f6603e8a8b84363b6f370dad5306c6d0ad0a218ae`
(MEASURED from the finished canonical run; KE 0.124950→0.126167 conserved, u_max
bounded ≤ 0.999, div_max 4.6e-14, total-vort 1.34e-4 — all 11 frames physical).

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`reconstructed_velocity_divergence_free`** (charter § 3.5 proposal): the exact
   div∘curl identity at FP scale EVERY step (measured max over the run ≤ 3.7e-15 at
   n=16 sweeps; declared ≤ 1e-12), swept across (n_v, n_g) ∈ {(20,5),(8,4),(6,2)} ×
   both ICs (doctest deterministic sweeps — the Stack-C gate-11 analogue).
2. **`total_circulation_bounded`** (charter § 3.5 proposal): Kelvin budget — total
   vorticity ≤ 2e-4 + slice-circulation drift ≤ 1e-2 across the same sweep (§ 3.4).
3. (bonus) the carried-ω_a zero-bit-drift assertion ships inside A1.

## § 7 Citations (Cat 1)

- Wang, Zhou, Feng, Li, Sun, Chen, Turk, Zhu (2025), DOI 10.1145/3731198 /
  arXiv:2505.21946 — the frontier method.
- Li, Lin, Chen, Zhou, Xiong, Zhu (2025), DOI 10.1145/3731194 — Clebsch PFM (the U-4
  substrate this unit reuses).
- Zhou et al. (2024) — impulse-based PFM (algorithm-family provenance, shared with U-4).
- Cottet & Koumoutsakos (2000), *Vortex Methods* — Cauchy vorticity formula provenance.
- Angot, Bruneau, Fabrie (1999) — Brinkmann penalization (context-only; boundary
  surface deferred, § 1).

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

A1 closed-form vorticity lift + exact discrete div∘curl identity (hand-derived § 2),
A2 the flow-map composition identity + Eq.-14 Hessian FD cross-validation
(hand-derived, algebraically exact in continuous time), A3 the inviscid steady
2D-TG-in-3D Euler solution (analytic, classical) + the REFRAMED budget-metric
comparison vs the landed parent capture. See § 3.

## § 9 Replayable capture

§ 5 capture + corpus seed `tests/fixtures/legacy-captures/phase-6-c1-vpfm.{h5,json}`
(8-step n=16 short-horizon fixture, schema 1.0.0, witness `c3ee30c0…`; corpus lock
39→40).

## § 10 Determinism ↔ capture

Manifest `determinism.claimed = "bit-exact-same-hw"` ↔ § 4 registry row.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Canonical capture invocation row in `docs/perf-ledger.md` (gate-12; stage 1c): see
the ledger row for the measured wall time (2-run bit-identity witness + 738 MB
capture write; ~12.2 GB peak RSS MEASURED at the locked descriptor — the probe § 4.4
HARD-STOP-5 surface CLOSED feasible). The package builds `-O3 -ffp-contract=off`
per-target (§ 4; tree default -O0 — the U-4 measured ~10× penalty applies).

## § 13 Gate-13

RED ctest evidence hashed in the stage-1a commit footer (10 cases, 0 passed; sha
`47f097f3…`); GREEN at 1b-iii (10/10, 147,722 assertions). The pytest replay tool
does not drive ctest — the landing replay re-runs the RED suite shape in a worktree
(the U-3/U-4 banked adaptation).

## Gate-14 / mutation / tolerance routing

**Gate-14:** N/A (no cross-stack sibling; charter § 3.5 — the REFRAMED metric gate of
§ 3.5 is the frontier equivalence). **Mutation:** N/A (C++; mutmut is python-only —
the rd2d/U-3/U-4 precedent). **Tolerance routing:** `smoke` category untouched; no
new category; the REFRAMED thresholds are declared HERE (§ 3.5) per the ratified
charter language ("metric-based, declared in the spec sheet — no budget widening").
