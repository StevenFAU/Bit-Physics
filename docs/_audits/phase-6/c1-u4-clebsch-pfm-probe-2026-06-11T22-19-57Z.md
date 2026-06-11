# C-1 / U-4 `eulerian-smoke` frontier-clebsch-pfm — pre-implementation probe (gate 2)

> **Cluster:** Phase 6 / C-1 (charter `docs/phases/phase-6/c1-charter.md`, RATIFIED § 10).
> **Unit:** U-4 = Phase-4 ledger row 23 / spec § 11.5 item 4.15 — Stack C; opens the
> greenfield particle-flow-map (PFM) substrate (first PFM surface in the repo).
> **Session:** build dispatch 2 (2026-06-11); probe at HEAD `43221d6` (U-1/U-2/U-3 landed;
> dispatch-2 § 1 provenance check closed at § 11 of the charter; CI sweep green).

## § 1 — Anchor re-verification (live, Convention #8)

- **Canonical anchor unchanged:** "Clebsch Gauge Fluid on Particle Flow Maps" — Zhiqi Li,
  Candong Lin, Duowen Chen, Xinyi Zhou, Shiying Xiong, Bo Zhu; ACM TOG 44(4), SIGGRAPH
  2025, Best Paper Award Honorable Mention; DOI `10.1145/3731194` (charter § 2 row 3,
  SHIFT S-2 already applied).
- **Live fetches this session:** the author-maintained project page
  (<https://pearseven.github.io/PFMClebschProject/>) confirms title/authors/venue/award
  verbatim. The **ACM DL landing page returned HTTP 403 today** (it was readable at the
  charter session) — bibliographic verification therefore rests on the project page plus
  the **author-hosted full PDF**
  (<https://pearseven.github.io/PFMClebschProject/static/pdfs/SIG_2025__Clebsch_PFM_Upload.pdf>),
  downloaded this session and read in full; sha256
  `2e5eb3751db1f8c2f7d7f86d4e0f6f0398a15bb8ccce4c55b97e5239ec0c7ab0` (CC-BY 4.0 per the
  PDF's own license block; ACM ref block in the PDF states TOG 44(4), August 2025, DOI
  10.1145/3731194 — matches the charter record). Access-mode note only; **no anchor SHIFT**.
- **arXiv confusion re-verified live:** `arXiv:2409.06246` (the only arXiv link on the
  project page) is still "Particle-Laden Fluid on Flow Maps" (Li/Chen/Lin/Liu/Zhu,
  SIGGRAPH Asia 2024) — a *different* paper, exactly as the charter § 2 row 3 recorded.
  No arXiv preprint of the anchor exists; the DOI + author-hosted PDF are canonical.

## § 2 — Landed surfaces (measured at HEAD)

- **Parent reference:** `packages/eulerian-smoke/` — numpy Stam-Fedkiw stable fluids;
  3D pipeline `stable_fluids_step_3d` (`packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py:515`),
  semi-Lagrangian advect, 20-sweep fixed Jacobi projection, vorticity confinement OFF at
  canonical (`vorticity_eps=0.0`), periodic unit cube, dt=0.005, n=128, nu=0.01, f64.
  Canonical capture `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.{h5,json}`
  present locally (738 MB; payload sha256 `4604ebdc40b7fdf80c0354c4429f6fb0a12fd566c5bc301ad9ceed60dcd4e2ed`),
  11 frames at cadence 50, fields u/v/w/density. TG IC at
  `packages/eulerian-smoke/eulerian_smoke/sim.py:181`-212 (u=sin·cos·cos, v=−cos·sin·cos,
  w=0, k=2π, Gaussian density blob σ=0.1, rescale to [0,1]³).
- **Parent posture:** determinism `epsilon-same-stack-same-hw`; tolerance category
  `smoke` (rel 1e-4 / abs 0.0); cross-stack history: Stack-D = CHAOTIC-REGIME escape
  hatch (Lyapunov λ≈0.12–0.29/step on this very TG descriptor), Stack-E = bit-exact.
  The chaotic-regime finding is load-bearing for U-4: **pointwise long-horizon
  comparison vs the parent is physically meaningless here** — which is exactly why the
  ratified equivalence is the REFRAMED metric-based gate (charter § 3.4).
- **Stack-C exemplars (two, per handoff):**
  `packages/lattice-boltzmann-d3q19-frontier-moment-encoded/` (U-3 — Vulkan f64 compute,
  `require_float64` + `assert_deterministic_float_controls`, NoContraction shaders,
  embedded SPIR-V via `bitphysics_embed_compute_shader`, `cap::Hdf5Writer` manifest+h5,
  `assert_deterministic_run` 2-run sha256 witness, ctest + uv-driven Python equivalence
  ctest, lavapipe pin VK_DRIVER_FILES+LP_NUM_THREADS=0) and
  `packages/reaction-diffusion-2d-stack-c/` (D11 CMake-subdirectory pattern, not a uv
  member). Shared infra: `common/common-cpp` (capture/determinism/hash/vulkan_compute).
- **Spec stub:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md` is a
  SINGLE stub claiming the folder slot for **all four** frontier variants
  (4.15/4.16/4.17/4.22). Unlike U-3 (single-variant lattice stub, de-stubbed in place),
  U-4 creates a per-variant sheet `spec-frontier-clebsch-pfm.md` and the stub **stays**
  for U-5/U-6/U-7 (spec § 3.7 folder convention anticipates per-variant drafting "at
  variant-stage dispatch").
- **Descriptor (D.2.3 verbatim):** `eulerian-smoke` / `frontier-clebsch-pfm` /
  `taylor-green-128cube-seed42-step500` (`docs/architecture.md:2522`). Capture dir per
  precedent: `captures/eulerian-smoke-frontier-clebsch-pfm/`.
- **Environment traps applied from start (handoff bank):** TMPDIR=~/.cache/bp-tmp for
  worktree uv; GIT_LFS_SKIP_SMUDGE=1 for worktree ops; R2-first LFS push;
  `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`; eof-fixer rewrites capture `.json` (re-add).

## § 3 — Method core (from the anchor PDF, read in full this session)

Two-component complex wave function Ψ=(Ψ₁,Ψ₂)∈ℂ², u = ħ⟨∇Ψ, iΨ⟩_ℝ (Eq. 12),
normalization ‖Ψ‖=1 (Eq. 13), solenoidal constraint (Eq. 14); wave-function Euler
evolution DΨ/Dt = −(i/ħ)(p/ρ − |u|²/2)Ψ (Eq. 15). **Gauge transformation**
Φ = Ψ·e^{iΓ_{s→t}/ħ} with Γ the trajectory integral of (p/ρ − |u|²/2) turns the
evolution into **DΦ/Dt = 0** (Eq. 16, proof App. A) — Φ is a pure 0-form: particles
carry Φ_{p,s} **unchanged** between reinitializations (the paper's central insight; no
Jacobian needed for the value), and only ∇Φ needs the backward-map Jacobian:
(∇Φ)_p(t) = T̃_pᵀ(∇Φ)_{p,s′} (Eq. 18), with dual initial times s (value) / s′ (gradient,
shorter map; reinit cadences n_V / n_G). Pipeline per Algorithm 3: RK4 advection of
x_p and T̃_p (dT̃/dt = −T̃∇u, Eq. 3); APIC P2G Φ_g = Σ_p(Φ_p + (∇Φ)_p·(x_g−x_p))w (Eq. 6);
enhanced wave-to-velocity u_{m,f} = (ħ/Δxˢ)·arg⟨Φ_{f₁},Φ_{f₂}⟩ on closer particle-backed
points (Eqs. 19/23); Poisson solve ΔΓ = ∇·u_m + projection u_f = u_{m,f} − ∇Γ (Eq. 20);
reinit: redistribute particles, normalize Φ←Φ/|Φ|, standardize Φ←Φe^{−iq/ħ} with
Δq = ∇·u* (Eq. 26); G2P (Eqs. 24/25). MAC grid; ħ∈[0.15,1.5] by resolution;
|ℙ|/|𝔾|∈[8,16]; reference implementation Taichi f64 on RTX 4090 (Table 2) — ours is the
Stack-C (C++/Vulkan-f64/lavapipe) greenfield, no vendoring (no public code release).

## § 4 — SHIFTs + findings vs charter prose (documented, not absorbed — HARD RULE 2)

1. **SHIFT (minor, anchor-detail): charter § 3.4 anchor (c) "Taylor–Green analytic
   early-time vorticity decay" assumed a viscous solver.** Measured against the paper
   read in full: Clebsch-PFM solves **inviscid Euler** (Eq. 8; § 7 limitations — viscosity
   enters only via the β-blending hack for solid boundaries, N/A at canonical). Analytic
   *viscous* decay e^{−2νk²t} is not reproducible by construction. **Adapted anchor (c):**
   the z-invariant 2D Taylor–Green field embedded in 3D (u=(sin2πx·cos2πy, −cos2πx·sin2πy, 0))
   is an **exact steady solution of incompressible Euler** (u·∇u = −∇p with
   p = −ρ/4·(cos4πx+cos4πy)) — the rigorous analytic fixture is steady-state drift
   bounded + resolution-converging, plus kinetic-energy conservation bounded (inviscid
   invariant). Same Taylor–Green analytic family the charter named; decay → steadiness
   is the inviscid specialization. Scope unchanged; REFRAMED qualitative
   vorticity-preservation fixtures vs the landed parent stand as ratified.
2. **Wave-function initialization is the paper's own stated limitation** (§ 7: complex
   velocity-to-wave-function init deferred to [Chern 2017]). The canonical TG IC will be
   realized by the standard ISF-style constrained init (phase seed + fixed-count
   normalize/project iterations, Eq. 26 machinery; deterministic, seeded) and the
   **achieved init-velocity residual vs the parent's analytic TG IC is MEASURED then
   declared** in the spec sheet — the capture's IC provenance is the declared procedure,
   not an assumed exact equality.
3. **Feasibility sizing (estimate now; MEASURE at stage 1b before the canonical run):**
   128³ = 2.10M cells; at |ℙ|/|𝔾|=8 → 16.8M particles × ~224 B (x, Φ_s, (∇Φ)_{s′}, T̃)
   ≈ 3.8 GB particle state + grid fields ≈ 0.3 GB on lavapipe host RAM (30 GB machine,
   ~13 GB headroom measured) — feasible. Canonical 500-step runtime is hours-scale on
   20 CPU cores (vs 34.6 s for U-3) and the determinism witness doubles it; the
   perf-ledger row is informational (CPU-only). If stage-1b measurement refutes
   feasibility at the locked descriptor, that is a HARD-STOP-5 surface — flagged now.
4. **CI equivalence-fixture strategy:** the REFRAMED gate is metric-based
   (vorticity/energy budgets + agreement metrics), so CI does **not** need the 738 MB
   parent capture: the parent-side budget metrics are derived ONCE locally from the
   landed capture (provenance: payload sha256 `4604ebdc…` + committed derivation script
   + logged run) into a small committed JSON fixture; the variant side recomputes its
   own metrics live in CI. Avoids a 738 MB LFS pull per CI run (the U-3 `lbm-ref`
   include was 202 MB; 738 MB would more than double the cpp-strict LFS budget for a
   comparison that is not pointwise anyway). Full-fidelity pointwise diffing remains a
   local-only diagnostic (chaotic regime makes it advisory at best — § 2).
5. **Gate 14:** N/A per charter § 3.4 (no cross-stack sibling; the vs-parent REFRAMED
   comparison is the frontier equivalence). Gate-13 replay: ctest path per the U-3
   banked adaptation (hash-footer + manual worktree replay).

## § 5 — Plan of record

- **Package:** `packages/eulerian-smoke-frontier-clebsch-pfm/` (CMake subdirectory per
  D11; NOT a uv member). Vulkan f64 NoContraction compute kernels (RK4
  advect+T̃-evolve, particle counting-sort/prefix-sum binning, **gather-style APIC P2G**
  (no atomics — deterministic by construction, per the U-3 "no atomics, no subgroup
  ops" posture), wave→velocity arg⟨·,·⟩ conversion (Eq. 19/23), divergence, fixed-count
  grid Poisson solver (fixed-iteration deterministic scheme; exact scheme + count
  measured at build for the declared divergence bound), projection, reinit
  normalize/standardize, G2P). Host orchestration in C++ per the lbm-me shape;
  `cap::Hdf5Writer` capture; `assert_deterministic_run` 2-run sha256 witness.
- **Posture expectation (charter: FP-round-off; exemplar precedent: bit-exact):** the
  gather-only no-atomics design targets **bit-exact-same-stack-same-hw** under the
  lavapipe pin (the boids-3d WGSL lesson is priced in: no scatter races, no unordered
  reductions; all reductions fixed-tree) — MEASURED then declared in the determinism
  registry, never assumed.
- **Anchors (≥3):** **A1** wave-function normalization: carried Φ_{p,s} norm constant
  between reinits (exact-to-FP) + post-reinit grid normalization ‖Φ_g‖=1 exact-to-FP +
  global-phase gauge invariance of reconstructed velocity (arg⟨e^{iθ}Φ₁,e^{iθ}Φ₂⟩ ≡
  arg⟨Φ₁,Φ₂⟩ — closed-form identity golden). **A2** flow-map composition identity:
  test-mode forward Jacobian F̃ (dF̃/dt = ∇u·F̃) alongside T̃ → ‖T̃F̃ − I‖ bounded over
  short horizons and resolution-converging (charter anchor (b) verbatim). **A3** the
  adapted inviscid Taylor–Green steady-state anchor (§ 4.1: drift + energy-conservation
  bounds, resolution-converging) + REFRAMED qualitative vorticity-preservation fixtures
  vs the landed parent capture (metric-based: enstrophy/energy budget trajectories +
  declared agreement thresholds, § 4.4 fixture strategy). All bounds
  MEASURED-then-declared in the spec sheet § 6 posture.
- **PBT (≥2, per charter § 3.4 proposal):** `wave_function_normalized` (A1 sweep across
  seeds/regimes) + `velocity_reconstruction_divergence_bounded` (post-projection
  divergence ≤ declared bound across property sweeps); candidate third (gauge-transform
  invariance) ships inside A1 as a closed-form golden. Doctest property-style sweeps
  per the Stack-C precedent (no Hypothesis in C++).
- **Tolerance routing:** existing `smoke` category for any pointwise comparisons
  (advisory only in the chaotic regime); the REFRAMED gate's metric thresholds are
  declared in the spec sheet (charter § 3.4: "no budget widening", no new category —
  D-2-style action NOT needed).
- **Capture:** `captures/eulerian-smoke-frontier-clebsch-pfm/taylor-green-128cube-seed42-step500.{h5,json}`
  — descriptor VERBATIM; fields u/v/w/density at cadence 50 (parent parity; density via
  passive transport documented in the spec sheet); schema 1.1.0; corpus seed (lock
  38→39); registry `[volumetric-grid.eulerian-smoke-frontier-clebsch-pfm]`; run_twice
  byte-identity BEFORE the capture becomes a reference; perf-ledger row.
- **TDD stages (Convention A ≤500-line commits, new-files-first):** stage 1a spec sheet
  (`spec-frontier-clebsch-pfm.md`, § 6 posture + § 8 anchors) + scaffold + RED failing
  ctest evidence (hash-footed) → stage 1b implementation to doctest GREEN at small
  resolutions (32³/48³ anchors A1/A2/A3-steady) + feasibility measurement → stage 1c
  canonical capture + REFRAMED fixtures + registry/corpus/perf/CI → stage 2 landing fold.
- **Citations (gate 7):** DOI 10.1145/3731194 (anchor, live-verified § 1); Chern,
  Knöppel, Pinkall, Schröder, Weißmann 2016 "Schrödinger's Smoke" (ISF foundation, Eq.
  19 provenance); Chern 2017 thesis (velocity↔wave conversion); Zhou et al. 2024
  (impulse PFM, Algs. 2–3 provenance); Clebsch 1859 (gauge variables). Registry slug
  correction (`clebsch-pfm-2024` → 2025) stays routed to cluster close per D-6.
