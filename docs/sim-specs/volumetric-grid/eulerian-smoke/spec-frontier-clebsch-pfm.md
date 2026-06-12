# spec-frontier-clebsch-pfm.md — eulerian-smoke (frontier-clebsch-pfm variant)

> **Status:** IN-BUILD (Phase-6 cluster C-1, unit U-4). Drafted at C-1 U-4 stage 1c as
> the per-variant sheet; the shared `spec-frontier.md` stub STAYS for the remaining
> frontier variants 4.16/4.17/4.22 (probe § 2: the eulerian-smoke stub claims the slot
> for FOUR variants — unlike U-3's single-variant lattice stub, it is not consumed).
> **Parent reference sim:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`.
> **Variant type:** `frontier-clebsch-pfm`. **Primary stack:** C (C++ / Vulkan f64,
> lavapipe-pinned, + deterministic host transport) — the FIRST particle-flow-map (PFM)
> surface in the repo (the greenfield substrate of the deferral record; U-5 vpfm reuses
> it).
> **Package:** `packages/eulerian-smoke-frontier-clebsch-pfm/` (CMake-only D11
> registration; NOT a uv member).
> **Frontier paper:** Li, Lin, Chen, Zhou, Xiong, Zhu, "Clebsch Gauge Fluid on Particle
> Flow Maps", ACM TOG 44(4), SIGGRAPH 2025 (Best Paper HM), DOI `10.1145/3731194` —
> re-verified live at probe (§ 1: ACM DL 403'd; author-maintained project page + the
> author-hosted CC-BY PDF, sha256 `2e5eb375…`, are the live bibliographic witnesses;
> arXiv:2409.06246 re-confirmed to be a DIFFERENT paper). CITE-DON'T-IMPORT (no public
> code release exists).
> **Stage-0 probe:** `docs/_audits/phase-6/c1-u4-clebsch-pfm-probe-2026-06-11T22-19-57Z.md`.
> **Charter:** `docs/phases/phase-6/c1-charter.md` § 3.4 (RATIFIED § 10).

## § 1 Scope

Inviscid incompressible Euler (paper Eq. 8) via **Clebsch wave functions evolved on
particle flow maps**: a two-component complex wave function Ψ=(Ψ₁,Ψ₂), u = ħ⟨∇Ψ,iΨ⟩_ℝ
(Eq. 12), gauge-transformed to Φ = Ψ·e^{iΓ/ħ} so that **DΦ/Dt = 0** (Eq. 16, App. A)
— Φ is a pure 0-form: particles carry Φ_{p,s} UNCHANGED between reinitializations (the
paper's central insight) and only ∇Φ maps through the backward flow-map Jacobian
(∇Φ)_p = T̃ᵀ(∇Φ)_{p,s′} (Eq. 18), with dual reinit cadences n_v (value map) / n_g
(gradient map). Per step (Alg. 3): RK4 advection of (x_p, T̃_p); APIC P2G of the mapped
spinors (Eq. 6); **enhanced wave→velocity conversion** u_f = (ħ/Δxˢ)·arg⟨Φ_{f₁},Φ_{f₂}⟩
on particle-backed points Δxˢ = Δx/2 apart (Eq. 23 — the paper's contribution 2);
MAC-grid Poisson projection (Eq. 20); periodic standardization Φ ← Φ·e^{−iq/ħ},
Δq = ∇·u* + normalization (Eq. 26). Periodic unit cube; the canonical regime needs no
solid/source/open boundaries (no β-blending).

**Adaptations vs the paper (documented):** fixed dt = 0.005 (descriptor parity; the
paper's CFL-adaptive Δt is unused at the canonical CFL ≈ 0.64); fixed-count MG V(2,2)
Poisson (deterministic by count) instead of residual-tested MGPCG; previous-step u_f
drives the flow-map advection (the paper permits this explicitly, § 5); P2G is the
weighted APIC mean (Eq.-6 sums normalized by Σw — a positive scalar field that cancels
exactly in arg⟨·,·⟩, so the reconstructed velocity is identical; documented for
robustness); passive smoke density transported by the parent's semi-Lagrangian
op-order (parent capture field parity).

## § 2 Derivations (hand-derivation anchor; full notes in `src/clebsch_pfm_detail.hpp`)

- **2D-TG closed-form lift:** Clebsch pair λ = −2cos2πx, μ = −cos2πy/(2π) gives
  ∇λ×∇μ = ω_TG exactly and TG = λ∇μ + ∇φ, φ = −cos2πx·cos2πy/(2π) — so the projection
  of the lift-induced velocity IS the TG field, continuum-exactly. Hopf section
  Ψ = (cos(α/2)e^{iθ/2}, sin(α/2)e^{−iθ/2}) with z = cosα = λ/2, θ = 4μ/ħ. Verified:
  unit-norm exact-to-FP; Eq.-19 reconstruction → λ∇μ (x-faces exactly 0 ≤ 1e-13;
  y-faces resolution-converging, ratio ≥ 1.5 asserted).
- **Wave-fit init (3D TG; the paper's own § 7 limitation made concrete):** projected
  gradient descent on E(Ψ) = ½∫|u(Ψ)−u_t|², δE/δΨ̄_k = −(iħ/2)[2e·∇Ψ_k + (∇·e)Ψ_k]
  (hand-derived; fixed iterations/τ/seed ⇒ deterministic). **Stage-1c defect, honestly
  recorded:** plain fine-level descent is a stiff problem — cell-scale phase noise
  feeds back through (∇·e)Ψ at rate τ·ħ²/(2dx²) (diffusion-like CFL; hand-derived and
  MEASURED: τ=0.2 diverged at every n; 1/n scaling still diverged at n=32; the first
  canonical run landed a deterministically-garbage IC, residual 350, and was discarded
  — the silent gap was that no test asserted 3D init quality, now gated in the PBT
  sweep). **Fix:** cascadic multigrid init — converge at the 16³ reference level from
  the z-modulated closed-form seed (z = −cos2πx·cos2πz, same Hopf section; its ω_z
  matches the 3D TG exactly), prolong (trilinear + renormalize) and clean up per level
  with τ_eff = τ·(16/n)²·(0.5/ħ)², per-level iteration budget halving from 2000.
  MEASURED residual ladder: 0.108 (16³) → 0.053 (32³) → 0.046 (64³) → 0.0459 (128³);
  E₀ = 0.1225 at 128³ vs the analytic 0.125 (98%). The achieved residual is MEASURED
  into the result + capture manifest.
- **Flow-map composition (anchor A2):** d(T̃F̃)/dt = −T̃∇uF̃ + T̃∇uF̃ ≡ 0 — the identity
  is algebraically exact in continuous time; the measured residual is pure RK4
  truncation, hence **dt-converging** (refines charter anchor (b)'s
  "resolution-converging" to the discretization parameter that actually governs it).

## § 3 Verification surfaces

1. **A1 — wave-function normalization + gauge structure:** closed-form lift unit-norm
   ≤ 1e-15; global-phase gauge invariance of Eq.-19 ≤ 1e-12 (closed-form identity);
   carried Φ_{p,s} bit-drift MEASURED **exactly 0.0** (0-form transport, the design
   invariant); post-reinit grid normalization deviation ≤ 1e-14 / ≤ 1e-12 across PBT
   regimes. `tests/test_clebsch_pfm.cpp`.
2. **A2 — flow-map composition:** ‖T̃F̃ − I‖_max MEASURED 3.7e-9 (n=16, dt=0.005,
   10 steps) → declared ≤ 1e-7 (~25× margin), with the O(dt⁴) contraction gate
   (dt-halving ratio ≥ 8 asserted; measured ~16×).
3. **A3 — adapted inviscid Taylor-Green steady anchor (probe § 4.1 SHIFT):** the
   z-invariant 2D TG is an exact steady Euler solution: steady drift ≤ 0.10 over 50
   steps at n=32; kinetic-energy conservation MEASURED 8.7e-3 rel → declared ≤ 2.5e-2;
   closed-form-IC velocity residual after projection MEASURED 2.66e-3 (n=32) →
   declared ≤ 1e-2.
4. **REFRAMED frontier-vs-parent equivalence (charter § 3.4; metric-based, no new
   tolerance category):** budget-metric fixtures derived from both canonical captures
   (`tests/python/derive_budget_metrics.py` → committed JSONs under
   `clebsch-pfm-equivalence/`; CI never pulls the LFS captures — probe § 4.4).
   **MEASURED REALITY SHIFTs (1c):** (i) the landed parent canonical trajectory is
   numerically BLOWN UP by its first captured interval (KE 0.125 → 1.5e13 at step 50,
   u_max → 1.337e8, 4.9e20 max; enstrophy NaN-saturated; consistent with the parent
   equivalence.md chaotic-regime record) — frame-by-frame vorticity agreement is
   physically empty beyond frame 0. (ii) the VARIANT stays physical through step 100
   (KE conserved to 1.91e-2 rel; enstrophy growing by real vortex stretching
   14.602 → 46.76 = 3.20×; u_max ≤ 1.099), then the inviscid 3D-TG cascade reaches
   grid scale and the trajectory saturates by step 150 at the wave-representation
   ceiling (u_max 476.7 max over all frames ≈ the arg-saturation scale ħπ/dx·𝒪(1)) —
   5+ orders below the parent's blowup; with the paper's CFL-adaptive Δt the step
   would shrink as the cascade sharpens (fixed dt = 0.005 is the declared
   descriptor-parity adaptation; documented regime finding, not a tolerance problem).
   **DECLARED gate (margins ≥ 2.5×):** (a) frame-0 agreement — KE rel ≤ 5e-2
   (measured 1.996e-2), enstrophy rel ≤ 4e-2 (1.287e-2), u_max abs ≤ 2.5e-2
   (8.09e-3), blob mass/m2 rel ≤ 1e-12 (FP-tight, ~5e-16); (b) parent step-50 blowup
   present (u_max ≥ 1e6); (c) variant physical window [0,100] — KE drift ≤ 5e-2,
   enstrophy/enstrophy₀ ∈ [0.8, 5.0], u_max ≤ 1.5, smoke-mass drift ≤ 0.25 (measured
   1.31e-1; semi-Lagrangian in a strengthening flow); (d) saturation contrast —
   variant u_max ≤ 600 over ALL frames vs the parent ≥ 1e6 by step 50.
   `tests/python/test_reframed_equivalence.py` (ctest `clebsch_pfm_reframed_equivalence`).

## § 4 Determinism

MEASURED bit-exact same-stack-same-hw: 2-run bit-identity witness at every
`run_clebsch` invocation (tolerance 0.0; witness run #2 IS the capture run, so the
capture bytes are the asserted-identical bytes). Design: gather-only fixed-order
particle transfers (counting-sort binning, sequential scatter + reductions), no
atomics, colour-parallel RB-GS, fixed-count MG, f64 transcendentals on host (GLSL has
no f64 trig — atan2/sin/cos run host-side; same glibc across witness runs; the
R-CPPB2-style cross-build caveat applies to libm versions and is documented, gated on
numeric equivalence not bytes). **Cross-optimization-level identity MEASURED:** the
per-target `-O3 -ffp-contract=off` build (strict IEEE: no FMA fusion, no
reassociation) is bit-identical to `-O0` — witness `c932298d…` at n=32/10 steps both
builds. Canonical witness: `45ae09f3d0188dec0eb4a5707aca936337c81427cdef4bc853640ae1084da1bc`. Registry:
`[volumetric-grid.eulerian-smoke-frontier-clebsch-pfm]`. No EFECT.

## § 5 Capture

`captures/eulerian-smoke-frontier-clebsch-pfm/taylor-green-128cube-seed42-step500.{h5,json}`
— the Appendix D.2.3 descriptor row VERBATIM. Fields u/v/w/density (each
128×128×128 f64, **[x][y][z] axis layout matching the parent** — the internal
x-fastest order is transposed at write; MEASURED at 1c against the parent's frame-0 TG
structure), 11 frames at cadence 50, schema 1.0.0 (no gradient_fields — the corpus
invariant reads 1.1.0 as differentiable-consumer). IC: deterministic wave-fit of the
parent's analytic 3D TG (§ 2) + the parent's density blob (σ=0.1, amplitude 1, mass
parity MEASURED at frame 0); `init_velocity_residual` recorded in the manifest params
(MEASURED 0.045913 at 128³; cascadic ladder § 2). Payload sha256
`ed4e5689eca33029056614b8522339b19f8472295d2038937a5ec5c39c27f0bc`.

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`wave_function_normalized`** (charter § 3.4 proposal): carried-value bit-identity
   (drift = 0.0) + post-reinit grid norm ≤ 1e-12, swept across ħ ∈ {0.25, 0.5, 1.0} ×
   both ICs (doctest deterministic sweeps — the Stack-C gate-11 analogue).
2. **`velocity_reconstruction_divergence_bounded`** (charter § 3.4 proposal),
   reformulated **scale-free** at 1b: post-projection max|∇·u| ≤ 1e-3 × pre-projection
   max|∇·u_m| (4 fixed V(2,2) cycles contract ~1e-4 hand-derived; 10× margin) — an
   absolute ceiling would bake in the rhs scale, which varies across regimes.
3. (bonus) global-phase gauge invariance closed-form golden (ships inside A1).

## § 7 Citations (Cat 1)

- Li, Lin, Chen, Zhou, Xiong, Zhu (2025), DOI 10.1145/3731194 — the frontier method.
- Chern, Knöppel, Pinkall, Schröder, Weißmann (2016), "Schrödinger's Smoke" — ISF
  foundation; Eq.-19 conversion provenance.
- Chern (2017), *Fluid dynamics with incompressible Schrödinger flow* (thesis) —
  velocity↔wave conversion context (our descent scheme is hand-derived, § 2).
- Zhou et al. (2024) — impulse-based PFM (Algs. 2-3 provenance; APIC transfers).
- Clebsch (1859) — gauge variables.
- Registry-slug correction (`clebsch-pfm-2024` → 2025) routes to cluster close (D-6).

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

A1 closed-form normalization/gauge identities (hand-derived § 2 + the paper's Eq. 13),
A2 the flow-map composition identity (hand-derived, algebraically exact), A3 the
inviscid steady 2D-TG-in-3D Euler solution (analytic, classical) + the REFRAMED
budget-metric comparison vs the landed parent capture. See § 3.

## § 9 Replayable capture

§ 5 capture + corpus seed `tests/fixtures/legacy-captures/phase-6-c1-clebsch-pfm.{h5,json}`
(8-step n=16 short-horizon fixture, schema 1.0.0; corpus lock 38→39).

## § 10 Determinism ↔ capture

Manifest `determinism.claimed = "bit-exact-same-hw"` ↔ § 4 registry row.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Canonical capture invocation row in `docs/perf-ledger.md` (gate-12; stage 1c):
12,480 s wall (3h28m: cascadic init + 2-run bit-identity witness + the capturing
run-2 + 738 MB capture write; ~12 s/step per run at 128³ with 16.8M particles on
20 CPU threads at nice 5, ~10 min of it contended by a stray duplicate launch;
CPU-only informational). The package
builds `-O3 -ffp-contract=off` per-target (§ 4; the tree default is -O0 — measured
infeasible: ~10× slower).

## § 13 Gate-13

RED ctest evidence hashed in the stage-1a commit footer (9 cases, 0 passed; sha
`13580a91…`); GREEN evidence at 1b (`3493901e…`). The pytest replay tool does not
drive ctest — the landing replay re-runs the RED suite shape in a worktree (the U-3
banked adaptation).

## Gate-14 / mutation / tolerance routing

**Gate-14:** N/A (no cross-stack sibling; charter § 3.4 — the REFRAMED metric gate of
§ 3.4 is the frontier equivalence). **Mutation:** N/A (C++; mutmut is python-only —
the rd2d/U-3 precedent). **Tolerance routing:** `smoke` category untouched; no new
category; the REFRAMED thresholds are declared HERE (§ 3.4) per the ratified
charter language ("metric-based, declared in the spec sheet — no budget widening").
