# spec-ref.md — schrodinger-smoke (Incompressible Schrödinger Flow, canonical reference)

> **Status:** **BACKEND EXECUTED 2026-07-05** (v0.2 spec; reference + goldens
> A–F + tests landed at `packages/schrodinger-smoke/`). Gate rows below were
> declared as targets and are now MEASURED (see the MEASURED block at the end
> of § 6), per the `docs/architecture.md` § 2.6 / Appendix D posture.
>
> **Review v0.2 changes (paper PDF + thesis re-read; repo grounding; implementation
> survey):** (1) the pressure projection must divide by the **discrete** Laplacian
> eigenvalues (paper Eq. 17), not continuous −|k|² — the machine-zero divergence gate
> fails as previously written (§ 3, § 6.2, new golden E); (2) the free step is the
> **exact propagator** — a step-1-only Δt-refinement MMS measures nothing; the Δt-order
> study moved to full-split Richardson (§ 6.1); (3) new **edge-phase aliasing bound**
> `|u| ≲ πħ/dx` (paper Shortcomings) as a guard + instrument (§ 3); (4) nozzle/obstacles
> re-scoped: paper Alg. 4 velocity constraints in the **periodic** box, no DCT needed
> (§ 1, § 13.3); (5) vortex-ring / knot IC recipes pinned to primary sources (§ 5);
> (6) `E(k)` is not free (§ 10). Thesis "1/e thinner" quote verified verbatim.
>
> **Category:** `volumetric-grid` · **Method family:** Clebsch / flow-map fluids
> (this is the **family root**; the repo already ships the downstream Stack-C
> variants `eulerian-smoke-frontier-{clebsch-pfm, vpfm, edge}`).
>
> **Primary surface:** web-deployable (Stack B / WebGPU) driven by a verified
> **f64 NumPy reference** (`packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py`),
> exactly the eulerian-smoke posture (`docs/sim-specs/volumetric-grid/eulerian-smoke/`
> parent + `packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py`).
>
> **Operator decision (naming/placement) — flagged, § 13.4.** Filed here as its own
> top-billed identity `schrodinger-smoke` (pic-flip precedent). The family-sibling
> alternative `eulerian-smoke-frontier-isf` is documented and non-preferred.

---

## § 1 Scope

Incompressible **Schrödinger Flow (ISF)** — Chern, Knöppel, Pinkall, Schröder,
Weißmann, *"Schrödinger's Smoke"*, ACM TOG 35(4) / SIGGRAPH 2016 (DOI
10.1145/2897824.2925868); Chern PhD thesis, *Fluid Dynamics with Incompressible
Schrödinger Flow*, Caltech 2017.

The fluid **state** is a normalized two-component complex wavefunction (spinor)
`Ψ = (ψ₁, ψ₂) : 𝕋³ → ℂ²`, `|ψ₁|² + |ψ₂|² = 1`. It evolves by a **split-step
Fourier** (pseudospectral) Schrödinger integrator; the velocity is read out by the
Madelung/Clebsch formula `u = ħ·Im(ψ̄·∇ψ)`. Incompressibility is enforced by an
**FFT pressure projection**. The visible smoke is a **separate, passive Lagrangian
tracer system** advected in the extracted velocity field — the tracers do **not**
feed back into `Ψ` (this decoupling is what makes the gated state a pure grid solver;
§ 8).

**In scope (canonical reference):**

- Periodic unit box `[0,1]³` (FFT-natural). The canonical scenes (vortex rings,
  leapfrogging/colliding rings, knots) live cleanly in a periodic box.
- `ħ` as the sole fluid parameter (vortex-core thickness / circulation quantum).
- Split-step per timestep: (1) free-Schrödinger FFT phase multiply; (2) pointwise
  normalize; (3) FFT pressure projection.
- Closed-form verification suite (§ 6, § 7): unitary norm/mass, per-mode phase,
  Parseval, Gaussian-dispersion MMS, quantized circulation (measured-convergent),
  Madelung curl-free limit, and reuse of the landed spherical-Clebsch Taylor-Green lift.

**Out of scope for the reference (labeled beyond-canonical in the web layer, § 13.3):**

- Boundaries and forcing beyond the plain periodic box — **re-scoped at review**: the
  paper's own jet nozzle and obstacles are **Alg. 4 velocity-constraint regions**
  (plane-wave phase blend inside Ω, volume-penalization limit, one constraint
  projection at end of step) and run **in the periodic box — no DCT required**.
  Buoyancy is a linear potential applied to `ψ₂` only (paper § 3.3). DCT/Neumann is
  needed only for closed-box *walls*. All of these break the unitary-norm gate by
  construction (they overwrite/re-phase `Ψ`), so they are exploratory web toggles,
  **not gated** (§ 6.5 O-2, § 13.3).
- The full flow-map machinery (backward-map Jacobians, gauge transform, dual reinit
  cadences) — that is the **downstream** `clebsch-pfm`/`vpfm`/`edge` scope, already
  landed on Stack C. ISF deliberately omits all of it (that is its web advantage).

**Load-bearing honesty boundary (§ 6.3, repeated in web copy).** ISF is **not** an
exact incompressible-Euler solver. Chern's thesis proves ISF is *"an Euler equation
modified with a Landau-Lifshitz term,"* under which *"a vortex … moves at a speed as
if the vortex is 1/e thinner than its actual thickness."* It is a consistent
approximation that converges to Euler as `ħ → 0`. The 2025 Clebsch-PFM paper
**explicitly excludes** ISF from its Euler-equivalence benchmarks on this ground
(*"solving a different equation that is not equivalent to the Euler equations"*). The
demo must be marketed as a **Schrödinger-equation model of incompressible flow with
exactly quantized vortices**, never as "solves Euler exactly."

---

## § 2 Upstream anchors (Cat 1 citations)

1. Chern, Knöppel, Pinkall, Schröder, Weißmann (2016), *"Schrödinger's Smoke,"* ACM
   TOG 35(4), DOI 10.1145/2897824.2925868. Method core: Eq. 1 (velocity 1-form),
   Theorem 1 (vorticity = Hopf pullback), Alg. 1–3 (split-step). **Primary.**
2. Chern (2017), *Fluid Dynamics with Incompressible Schrödinger Flow* (Caltech PhD
   thesis). Alg. 1 (split-step verbatim), App. 1.C (edge-circulation exactness under
   geodesic CP¹ interpolation), the Landau-Lifshitz / 1/e-thinner result. **Primary.**
3. Li, Lin, Chen, Zhou, Xiong, Zhu (2025), *"Clebsch Gauge Fluid on Particle Flow
   Maps,"* ACM TOG 44(4), DOI 10.1145/3731194. Confirms the **shared primitives**
   (Eq. 12 `u = ħ⟨∇Ψ, iΨ⟩ℝ`, Eq. 13 `‖Ψ‖² = 1`, Eq. 14 solenoidal `⟨ΔΨ, iΨ⟩ℝ = 0`)
   and the ISF-excludes rationale. The landed variant lives at
   `packages/eulerian-smoke-frontier-clebsch-pfm/`. **Primary (reuse anchor).**
4. Kleckner, Kauffman, Irvine, *Nature Physics* 12, 650 (2016); Scheeler et al.,
   *PNAS* 111 (2014), arXiv:1404.6513 — helicity is only **partially** preserved
   through reconnection (converted to helical coils across scales; small helices
   radiated as sound). Grounds the **helicity-is-not-a-gate** decision (§ 6.5).
5. Onsager–Feynman circulation quantum `Γ = κ·h/m = 2πκħ/m` (κ ∈ ℤ) — arXiv:2003.03590
   Eq. 44 — reused in `ħ`-normalized ISF units as `∮ u·dl = 2πħ·n` (§ 7, continuum
   target).
6. Tao, Ren, Tong, Xiong (2021), *"Construction and evolution of knotted vortex tubes
   in incompressible Schrödinger flow,"* Phys. Fluids 33, 077112 — two-component
   wave functions for knotted ICs built from **two complex polynomials** (centerline
   shape + twist), verified at review (title/authors/venue confirmed). **Primary for
   the knot/link IC route** (§ 5) — practical, unlike the paper's Seifert-surface
   imprint whose tooling (SeifertView) is legacy Windows software.

**Cat-2 context (verified to exist at review, beyond-canonical options only):**
SIGGRAPH 2024 poster *"Non-Hermitian Absorbing Layers for Schrödinger's Smoke"* (DOI
10.1145/3641234.3671033) — open boundaries without DCT; *"A finite element
implementation of the incompressible Schrödinger flow method,"* Phys. Fluids 36,
017138 (2024) — non-spectral ISF exists but is out of scope.

**Do NOT cite (refuted in research, votes recorded):** Covector Fluids "significantly
better vorticity/energy preservation" (1-2); GPE non-dimensional `Γ = 2π` without the
`ħ/m` factor (0-3); the 61–74% / `(r₀/ξ)^-0.5` helicity-retention figures (0-3); "GP
has exactly three integral invariants" framing (0-3).

---

## § 3 Algorithm

**State.** `Ψ = (ψ₁, ψ₂)`, complex, on an `N³` periodic grid, `dx = 1/N`. `ħ` scalar.

**Per timestep `Δt` (thesis Alg. 1):**

```
1. Schrödinger free step (Alg. 2):   Ψ̂ = FFT(Ψ);  Ψ̂ ← Ψ̂ · exp(-i·(ħΔt/2)·|k|²);  Ψ = IFFT(Ψ̂)
2. Normalize (pointwise):            Ψ ← Ψ / |Ψ|                    (|Ψ| = √(|ψ₁|²+|ψ₂|²))
3. Pressure projection (Alg. 3):     div = Σ_axis (η̃_e⁺ − η̃_e⁻)/dx²   with η̃_e = arg⟨Ψ_a, Ψ_b⟩ℂ
                                      (Alg. 3 runs on the ħ-scaled η̃ = η/ħ — the ħ cancels through the solve)
                                      φ̂ = FFT(div) / λ̃_k               λ̃_k = **discrete** Laplacian eigenvalues (paper Eq. 17):
                                      φ = IFFT(φ̂)                        λ̃ = −(4/dx²)·Σᵢ sin²(π kᵢ/Nᵢ);  φ̂[0]=0; DCT for Neumann walls
                                      Ψ ← Ψ · exp(−i·φ)                 (pure phase → gauge; φ is already ħ-scaled)
```

- **Step 1** diagonalizes exactly in Fourier: each mode is multiplied by a
  **unit-modulus** phase `exp(-i(ħΔt/2)|k|²)`. This is per-mode exact and unitary
  (§ 7 golden B). `|k|²` uses the standard periodic wavenumbers `k = 2π·(fftfreq·N)`
  — the **continuous** Laplacian eigenvalues (paper Eq. 18). **Two-spectra rule
  (review catch #1, pinned by golden E):** paper App. E deliberately assigns each
  operator its own spectrum — free step = continuous Eq. 18, projection = discrete
  Eq. 17. Mixing them is the single most likely porting bug: the solver still *looks*
  right, but the machine-zero divergence gate (§ 6.2) fails with an O(h²) floor.
- **Step 2** is a **correction**: pointwise `|Ψ| = 1` *drifts* under the free step
  (the constraint is exact only in smooth theory). Global L² norm is exact by
  unitarity (§ 7 golden A); the pointwise renormalization restores `ρ = 1`.
- **Step 3** enforces discrete divergence-freeness by a pure phase shift. *Why the
  discrete eigenvalues make it exact-to-FP:* the gauge `Ψ_v ← Ψ_v·e^{−iφ_v}` shifts
  every edge phase exactly, `η̃_vw ← η̃_vw − (φ_w − φ_v)` (arg of a unit-modulus
  factor — no approximation), so the new divergence is `ξ − Δ_disc φ`, with `Δ_disc`
  the same 7-point stencil the divergence was built from. Solving `Δ_disc φ = ξ` via
  FFT therefore needs the **stencil's** eigenvalues `−(4/dx²)Σsin²(πkᵢ/Nᵢ)` (Eq. 17);
  the residual then telescopes to FP-zero. Dividing by continuous `−|k|²` solves a
  *different* operator and leaves an O(h²) residual. Caveat: the telescoping holds on
  the principal branch — it assumes no edge re-wraps past ±π (see the aliasing bound
  below). Still one exact solve vs the parent eulerian-smoke's Jacobi-20 iterative
  projection.

**Velocity readout (Eq. 1 / Eq. 4).** Continuous `u = ħ·Im(ψ̄·∇ψ)`; discrete edge
circulation `η_e = ħ·arg⟨Ψ_a, Ψ_b⟩ℂ` with `⟨a,b⟩ℂ = ā₁b₁ + ā₂b₂` (the exact circulation
of the geodesic-interpolated 1-form; App. 1.C). Cell-centred `u` averages the six
incident MAC faces (parent-capture field parity, § 5).

**Sign convention (guard — research flagged a genuine ambiguity).** `u = ħ·Im(ψ̄·∇ψ) =
+ħ·Re⟨∇ψ, iψ⟩`. The forms `Re(ψ̄·i∇ψ)` and `Im(ψ̄·∇ψ)` are **negatives** of each other
(`Re(iz) = −Im(z)`); the reference asserts the paper-matching `+ħ·Im(ψ̄·∇ψ)` sign with
a unit-test on a known plane-wave (§ 7).

**Velocity aliasing bound (review catch #3 — paper "Shortcomings", previously
missing).** `η̃_e = arg⟨·,·⟩` lives on the principal branch `(−π, π]`: an edge can
represent at most `|u| ≲ πħ/dx` before the velocity aliases — and before the
projection's telescoping exactness can 2π-wrap. This couples the knobs: thin cores
(small `ħ`) at high speed need finer grids, independently of any CFL. Scene design
keeps `max|η̃|` comfortably below π; the reference records
`edge_phase_headroom = max|η̃|/π` per run (declared ceiling, MEASURED) and the web
HUD shows it live (web spec § 4).

**Passive tracers (visualization).** RK2/RK4 advection of massless points in `u`
(thesis uses RK4). Tracers have their **own** advective CFL (`|u|Δt/dx ≲ 1`) — the
"unconditional stability" of step 1 is a *linear* property of the wavefunction solver
and does **not** cover tracer advection.

**Splitting order (review catch #2 — corrected).** Step 1 alone is the **exact free
propagator**: the FFT phase multiply *is* `e^{−iHΔt}`, so for band-limited data it has
**no Δt error at all** — a step-1-only Δt-refinement study (the pre-review MMS plan)
measures the FP floor, not an order. Splitting error exists only in the *composition*
with normalize + project. The reference implements both the Lie split (paper-verbatim)
and a Strang-symmetrized variant; order of accuracy is demonstrated by **Richardson
self-convergence** (Δt-halving vs a tiny-Δt reference) on the canonical ring scene,
slope **MEASURED-then-declared** — Lie ≈ 1 and Strang ≈ 2 are *targets*, not
assertions (classical splitting theory does not directly cover projection/
normalization sub-steps, which are not flows).

---

## § 4 Algebraic form

- **Constraints ↔ physics** (thesis § 1.2): `|Ψ|² = 1 ↔ ρ = 1`; `⟨ΔΨ, iΨ⟩ℝ = 0 ↔
  ∇·u = 0`. `ħ` is the sole free parameter.
- **Madelung.** Writing `ψ = √ρ·e^{iθ}`, `u = ħ∇θ` recovers potential flow; the
  spinor's second component supplies the **rotational** (non-gradient) part via the
  Clebsch map (§ below), which single-component Madelung cannot represent.
- **Clebsch / Hopf structure (Theorem 1).** `s = ψ̄·i·ψ : 𝕋³ → S²` is the Hopf map
  image; vorticity is the **exact** pullback of the S² area form:
  `ω = (ħ/2)·s*(dA_{S²})`. Vortex filaments are preimages of points on S²; their
  circulation is quantized to `2πħ·n` (`n` = winding). **Continuum-exact; O(h) on a
  grid** (§ 6.5, § 7 golden F).
- **Reused closed-form lift (from the landed variant).** The spherical-Clebsch lift
  `Ψ = (cos(α/2)·e^{iθ/2}, sin(α/2)·e^{−iθ/2})`, `cos α = z`, is unit-norm exact-to-FP
  and its induced velocity equals a target Clebsch field up to a gradient the
  projection removes — verified in
  `packages/eulerian-smoke-frontier-clebsch-pfm/` (`taylor_green_wave_2d`,
  spec `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier-clebsch-pfm.md`
  § 2). Reused here as a cross-check fixture (§ 7 golden C).
- **Euler relationship (honesty).** ISF ≈ Euler + Landau-Lifshitz term; NOT exact
  Euler; converges as `ħ → 0` (§ 1, § 6.3).

---

## § 5 Implementation

**Reference:** `packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py` — NumPy
f64, `np.fft.fftn`/`ifftn`. Pure grid solver (no particle scatter). Deterministic
same-hardware (§ 8). Mirrors the eulerian-smoke reference structure.

Core surfaces (planned):

- `isf_step(psi, hbar, dt, k2) -> psi` — the 3-step split (Strang).
- `velocity_from_wave(psi, hbar, dx) -> (u,v,w)` — edge `η_e = ħ·arg⟨·,·⟩` then
  MAC-face → cell-centre average. Reuses the validated `wave_velocity_face` pattern.
- `pressure_project(psi, dx, lam_discrete) -> psi` — FFT Poisson with the **discrete**
  eigenvalue table (§ 3); DCT branch for closed-box walls (beyond-canonical).
- `constraint_project(psi, region_mask, k_vec, hbar, t) -> psi` — paper Alg. 4: blend
  the prescribed plane-wave phase inside Ω (amplitude-preserving), then pressure
  project. One surface serves three uses: IC settling (iterate 5–10×, paper § 3.2),
  the jet nozzle (fixed Ω each step), and obstacles (`η_Ω = 0`, Ω may move). Periodic
  box, no DCT.
- `hopf_s2(psi) -> s` and `vorticity(psi, hbar) -> ω` — `s = ψ̄iψ`, area-form pullback.
- Analytic host fixtures: `gaussian_packet(x, t, hbar, sigma0)` (closed-form free
  dispersion, § 7 D); `spherical_clebsch_lift(...)` (reused, § 7 C);
  `vortex_ring_wave(center, radius, core_r, hbar)` — the paper's § 3.1 slab imprint,
  pinned at review: `φ = e^{iθ}` with `θ = π(1 + d/r)` inside the `|d| < r` slab
  around the disk spanning the ring (`d` = signed distance to the disk), `θ = 0`
  outside; `Ψ = (φ, ε)` with `ε = 0.01` — the paper's explicit **zero-guard** so
  normalization never divides by ~0 — then normalize + pressure-project (and for
  multi-ring scenes, componentwise products of single-ring `φ`s);
  `knot_wave(polynomial_pair, hbar)` for trefoil/link scenes via the Tao–Ren–Tong–
  Xiong polynomial construction (§ 2 anchor 6).
- `run_isf(cfg, capture_manifest=None) -> IsfResult` — trajectory + 2-run bit-identity
  witness (asserted before any capture write; § 8).

`IsfResult` measured diagnostics (measured-then-declared): `norm_l2_drift` (unitary
gate), `per_mode_phase_max_err`, `parseval_rel_err`, `max_div_postproj`,
`circulation_measured` + `circulation_target = 2πħ·n` + `circulation_rel_err`,
`irrotational_curl_max` (Madelung), `energy_initial/final`, `edge_phase_headroom`
(§ 3 aliasing guard), `splitting_order_measured` (§ 6.1 Richardson slope),
`determinism_witness_sha256`.

**Grid / params (canonical):** `N = 128`. Paper Table 2 (verified from the PDF at
review): every shipped scene is a 64³–128³-class grid (e.g. 128³, 128×64×64,
192×64×64), `dt ∈ {1/24, 1/48}` s, `ħ ∈ [0.01, 0.05]` m²s⁻¹, boxes 2–5 m; 256³ is a
common-practice extrapolation, not paper-cited — do not assert. `dt` from the tracer
CFL **and** the § 3 edge-phase headroom, not the (unconditional) wavefunction step.
Perf anchors for scale (all third-party, none WebGPU — verified at review): authors'
MATLAB/Houdini < 1 s/step at 128³ on a 3.5 GHz i7 (paper § 3); CMU 15-418 CUDA port
≈ 750× the MATLAB, 5M tracers @ 48 FPS at 128×64×64, and it found the solver
**trig-bound**, not bandwidth-bound; Unity compute port ~200 ms/step at 512×128×128.

---

## § 6 Verification posture (Roy 2005 V&V; architecture § 2)

### 6.1 Code verification (MMS / analytic)

- **Free Gaussian wave-packet dispersion (exact-propagator + spectral-Δx golden —
  re-scoped at review).** The free Schrödinger equation has a closed-form Gaussian-
  packet solution (width `σ(t)`, complex amplitude). Step 1 *is* the exact propagator
  (§ 3), so vs the analytic solution the error is **Δt-independent** — the study
  asserts the error curve is *flat at the FP/band-limit floor* under Δt-halving (that
  flatness is itself the check), and `Δx`-refinement demonstrates **spectral**
  (super-algebraic) collapse of the band-limit truncation. Periodization caveat: pick
  `σ₀` and the time window so the ℝ³ formula's periodic images stay below 1e-12 at
  the box boundary (the closed form is free-space; the solver is on 𝕋³).
  `packages/schrodinger-smoke/tests/test_isf_mms.py`.
- **Full-split order of accuracy (Richardson — new at review).** Δt-halving
  self-convergence of the complete split (steps 1–3) on the canonical translating-ring
  scene vs a tiny-Δt reference; slope MEASURED-then-declared for Lie (target ≈ 1) and
  Strang (target ≈ 2) — a measurement, never an assertion (§ 3 splitting note).
  **Together these two are the code-verification gate.**
- **Per-mode phase exactness.** Seed a single Fourier mode; assert its phase advances
  by exactly `−(ħΔt/2)|k|²` to machine precision (§ 7 B).

### 6.2 Solution verification

- **FFT Poisson projection residual.** Post-projection **discrete** divergence →
  machine-zero, *provided* the solve divides by the discrete Eq.-17 eigenvalues
  matching the divergence stencil (§ 3 — with continuous `−|k|²` this gate fails at
  an O(h²) floor) *and* no edge re-wraps past ±π (guarded by `edge_phase_headroom`).
  Declared ceiling `≤ 1e-12` (f64), MEASURED at build on the canonical scene.
- **Reused steady anchor.** The z-invariant 2D-Taylor-Green-in-3D is an exact steady
  Euler solution (validated in the landed variant, A3); ISF holds it steady to a
  MEASURED drift over a fixed window (declared ceiling, MEASURED). *Caveat:* ISF's
  Landau-Lifshitz term means this is a **near-steady** check, not exact-steady — the
  declared ceiling absorbs the `ħ`-dependent modification.

### 6.3 Model verification (honesty boundary)

- ISF ≈ Euler + Landau-Lifshitz; vortices 1/e thinner; converges as `ħ → 0`. The
  reference records the `ħ`-scan of a translating-vortex-ring speed vs the classical
  thin-core ring speed, **documenting** the systematic offset rather than gating it to
  zero. No "matches Euler" claim anywhere.

### 6.4 Calculation verification (conservation)

- **Global L² norm / mass** preserved by the free step to machine precision (unitary).
  **This is the strongest gate.** Declared `≤ 1e-13` (f64).
- **Parseval / Plancherel:** `Σ|Ψ|² = (1/N³)·Σ|Ψ̂|²` to machine precision (validates the
  FFT normalization convention). Declared `≤ 1e-13`.
- **Kinetic energy** `½Σ|u|²dx³` — an *inviscid invariant of the model*, tracked and
  declared with a MEASURED drift ceiling (NOT machine-exact; the split + normalization
  + finite `ħ` induce real drift).

### 6.5 Gate status — exact vs continuum (the moat's integrity)

| Quantity | Status | Gate? |
|---|---|---|
| Global L² norm / mass (unitary) | **machine-exact** | ✅ gate `≤1e-13` |
| Per-Fourier-mode phase `e^{-i(ħΔt/2)|k|²}` | **machine-exact** | ✅ golden B |
| Parseval / Plancherel identity | **machine-exact** | ✅ gate `≤1e-13` |
| Gaussian dispersion (exact propagator; spectral Δx) | **exact analytic** | ✅ code-verif |
| Full-split Δt order (Richardson, ring scene) | measured slope | ✅ code-verif (MEASURED) |
| FFT projection discrete `max|∇·u|` (Eq.-17 eigenvalues) | **machine-zero (telescoping)** | ✅ gate `≤1e-12` |
| Edge-phase headroom `max|η̃|/π` | representability guard | ⚠ guard (MEASURED ceiling), not a law |
| Quantized circulation `∮u·dl = 2πħ·n` | continuum-exact, **O(h)** | ⚠ measured-convergent, labeled approximate |
| Vorticity = S² area-form pullback | continuum-exact, **O(h)** | ⚠ measured-convergent |
| Irrotational IC stays curl-free (Madelung) | continuum-exact | ⚠ measured-convergent |
| Helicity / Hopf invariant | **partially** conserved, scale-dep. | ❌ NOT a gate — illustrative only |
| Pointwise `|Ψ| = 1` | **drifts** (needs step 2) | ❌ correction, not a law |

**Open question O-2 (re-scoped at review):** Alg-4 constraint regions (nozzle,
obstacles) are periodic-box compatible but overwrite `Ψ` inside Ω, breaking the
unitary-norm gate; DCT closed-box walls swap the transform and would need their own
golden-B analogue. Both stay web beyond-canonical, ungated.

### 6.5b MEASURED block (backend execution 2026-07-05)

- **Unitary norm drift** (free step, canonical run): measured ~5e-16 —
  declared gate `≤ 1e-13` holds with margin.
- **Parseval rel err**: measured ~7e-16 — declared `≤ 1e-13` holds.
- **Post-projection `max|∇·u|`** (discrete Eq.-17 solve): measured 3.1e-12 at
  48³ / canonical-class scenes. The pre-execution target of 1e-12 did not
  survive measurement because the divergence carries a **1/dx² amplification**
  of the phase-level FP residual (~1e-15 in phase units); the declared ceiling
  is **`≤ 1e-10`** (tests) with the scale note recorded — the phase-level
  residual, not the raw ceiling, is the physical content. The wrong-spectrum
  control (continuous −|k|² solve) sits ≥ 10³× higher on the same state
  (`packages/schrodinger-smoke/tests/test_isf_invariants.py`).
- **Exact-propagator flatline**: measured ~2.3e-14 max-abs, flat across the
  2/4/8/16-step ladder (declared `≤ 1e-13` + flatness ≤ 10× spread).
- **Spectral Δx collapse**: measured 7.6e-3 → 3.1e-5 → 1.7e-8 → 2.3e-14 over
  N ∈ {16, 24, 32, 48} (golden D ceilings = 4× measured).
- **Full-split Richardson slope** (velocity-L2 metric, T = 0.05, base 16
  steps, 32³ thickened ring — coarser dt is pre-asymptotic): **Lie = 1.71,
  Strang = 1.65**. The classical Lie ≈ 1 / Strang ≈ 2 separation was NOT
  reproduced (the normalize/project corrections dominate both schemes'
  leading error) — recorded honestly; declared regression band [0.8, 3.5].
- **Ring circulation**: measured 0.31413 vs 2πħ = 0.314159 (rel ≈ 1e-4,
  N-independent at 32/48/64 — the loop sum is projection-invariant by
  telescoping, so the residual is the ε-component + core discretization,
  not O(h) as conservatively labeled). Golden F ceiling 2e-3.
- **Edge-phase headroom**: canonical 32³ run measured 0.16–0.90 across the
  window (settled IC is the max) — below 1, no re-wraps; guard live.
- **f32↔f64 proxy** (NumPy complex64 path with f64-precomputed multipliers,
  canonical 64³ × 96): worst per-checkpoint max_abs **1.4e-5** of field peak
  → `[defaults.isf]` relative = 1e-4 declared (× 4.05 family spread × ~1.75
  margin, the pic-flip formula).

### 6.6 PBT invariants (≥ 2 required; architecture § 2.14)

1. **`norm_mass_unitary_conserved`** — global L² norm preserved by the free step
   `≤ 1e-13`, swept `ħ ∈ {0.05, 0.1, 0.3} × N ∈ {32,64} × dt`. (Machine-exact.)
2. **`projection_divergence_bounded`** (scale-free) — post-projection `max|∇·u| ≤
   1e-6 × pre-projection max|∇·u|` (spectral projection contracts to FP-zero; the
   ratio form avoids baking in the RHS scale, matching the landed variant's PBT #2).
3. *(bonus)* **`per_mode_phase_exact`** — free-step phase golden swept over modes.
4. *(bonus, continuum)* **`irrotational_stays_curl_free`** — Madelung limit, MEASURED
   convergence under refinement (labeled continuum, not machine-exact).

---

## § 7 Golden values / MMS

House convention: generator `.py` (`--verify`) + derivation `.md` + table `.json`
(≥ 3 independent-reference anchors), under `tools/testkit/golden/{generator,derivations,tables/volumetric-grid}/`.

- **A · `isf-unitary-norm.json`** — free-step global L² norm preservation. Anchors:
  unitarity of `e^{-iHΔt}` (Schrödinger); thesis Alg. 2; splitting-methods report
  (Exl, univie). Machine-exact.
- **B · `isf-free-step-phase.json`** — per-mode phase advance `arg(Ψ̂_k(Δt)/Ψ̂_k(0)) =
  −(ħΔt/2)|k|²` for a set of `(k, ħ, Δt)`. Anchors: paper Alg. 2; thesis Eq.;
  Fourier diagonalization of the Laplacian. Machine-exact.
- **C · `isf-clebsch-velocity.json`** — the spherical-Clebsch lift → `η_e = ħ·arg⟨·,·⟩`
  → velocity, unit-norm `≤1e-15`. **Reuses** the landed `taylor_green_wave_2d` fixture
  as an independent cross-check. Anchors: paper Eq. 1/4; thesis App. 1.C; the landed
  clebsch-pfm A1 surface.
- **D · `isf-gaussian-dispersion.json`** — free Gaussian packet closed-form `σ(t)`,
  amplitude; the exact-propagator / spectral-Δx reference (§ 6.1 — **not** a Δt-order
  probe; the free step has no Δt error). Anchors: standard QM free-packet solution;
  thesis Alg. 2; the periodization bound (§ 6.1).
- **E · `isf-laplacian-eigenvalues.json`** — paired tables of the **continuous**
  (paper Eq. 18, free step) and **discrete** (paper Eq. 17, projection) Laplacian
  eigenvalues over `(k, N, dx)`, pinning the two-spectra convention (§ 3, the #1
  porting trap found at review) in a committed artifact both stacks recompute.
  Anchors: paper App. E Eqs. 17–18; FD symbol `−(2−2cos(kdx))/dx²` trig identity;
  Fourier symbol of Δ.
- **F · `isf-circulation-quantum.json`** — `∮u·dl` around a single-winding vortex ring
  → `2πħ` (**continuum target**; table records the MEASURED O(h) convergence ratio,
  labeled approximate per the paper's own "approximately 2πħ_h"). Anchors:
  Theorem 1 / § 4.4; Onsager–Feynman quantum (arXiv:2003.03590 Eq. 44); knotted-ISF
  construction paper (Phys. Fluids 33, 077112).

---

## § 8 Determinism

**MEASURED bit-exact same-stack-same-hw.** The gated state is a **pure grid solver**:
FFT (grid→grid), pointwise normalize, FFT Poisson, gather velocity readout. **No
particle→grid scatter** (tracers are passive, visualization-only, downstream of the
gated state). Therefore f64 NumPy FFT is run-twice bit-identical on fixed hardware
without any fixed-point-atomic machinery (contrast MPM/pic-flip P2G). 2-run
bit-identity witness at every `run_isf` (tolerance 0.0; witness run #2 IS the capture
run). Registry: `[volumetric-grid.schrodinger-smoke]` in
`tools/testkit/equivalence/tolerance.toml`.

**Cross-build / cross-hardware caveat (documented).** NumPy FFT dispatches to
pocketfft; results can differ across BLAS/FFT builds and hardware at the ULP level →
the honest boundary is **numeric-equivalence** (declared tolerance), not byte-identity,
across builds (the R-CPPB2-style caveat already codified for the repo).

**WebGPU / WGSL boundary (frontend, § 13.2).** The f32 WGSL 3D-FFT is **device-scoped
bit-exact** under a **fixed Stockham butterfly/pass order** (no reduction-order
nondeterminism, no atomics). **Cross-device is distributional** (different GPUs /
subgroup widths accumulate f32 differently) — the established honest boundary. The
web gate compares the WGSL f32 run against the live **f64 reference** re-run within a
declared tolerance (§ 13), and asserts run-twice byte-identity **on the same device**.

---

## § 9 Equivalence

- **Canonical scene = a single translating vortex ring** (laminar, **non-chaotic**
  over the capture window). This is deliberate: the landed 3D-Taylor-Green canonical
  **blows up** (chaotic inviscid cascade — recorded in the clebsch-pfm equivalence
  ledger), which makes frame-by-frame pointwise agreement physically empty. A
  translating ring is deterministic and non-chaotic, so a pointwise capture round-trip
  is meaningful (the SPH "rigid free-fall, not chaos" lesson).
- **Cross-stack:** the ISF reference (f64 NumPy) ↔ WGSL f32 frontend equivalence is
  the web gate (§ 13). No Stack-C ISF pairing is planned (the flow-map variants solve
  a *different* equation and are not equivalence targets for ISF — § 2 anchor 3).
- **Vs the eulerian-smoke parent:** ISF is a *different model* (Euler+Landau-Lifshitz),
  so a REFRAMED metric equivalence to the Stam parent is **not** claimed; the shared
  artifact is only the Poisson/spinor *machinery*, not the trajectory.

---

## § 10 Diagnostics (Tier 2)

- Phase field `arg(ψ₁)`, `|ψ₁|²−|ψ₂|²`, Hopf-S² image `s`, vorticity magnitude,
  enstrophy, kinetic-energy spectrum `E(k)` — **on-demand, not free (corrected at
  review):** `u` is quadratic in `ψ`, so `û` is a convolution of `Ψ̂`, not a readout
  of it; `E(k)` costs three extra real-field FFTs when requested.
- Edge-phase headroom meter `max|η̃|/π` (§ 3) — live in the HUD.
- Strouhal / superfluid-Reynolds meters on the vortex-street scene (paper § 5:
  `Re_s = |v|D/(2πħ)`, measured `St ≈ 0.12–0.18` vs the superfluid literature the
  paper cites) — ungated, literature-anchored model-verification instrument.
- Divergence-residual field (pre/post projection) — reuses the eulerian-smoke
  divergence instrument.
- Circulation-loop probe: `∮u·dl` on user-placed loops → `2πħ·n` readout with the
  MEASURED O(h) convergence label.
- Vortex core-line extraction (`|Ψ|`-min / `s`-preimage) for the knot/link scenes.

---

## § 11 Build / run

- Reference: `uv run --no-sync python -m schrodinger_smoke.reference.isf …`
  (uv workspace; `uv sync --all-packages --all-extras` for a full venv per the repo
  env notes).
- Golden regen: `python tools/testkit/golden/generator/isf_*.py --verify`.
- Tests: `pytest packages/schrodinger-smoke/tests/…` (MMS, PBT sweeps, determinism
  witness).
- Web: `packages/schrodinger-smoke/web` (§ 13; verification-demo-spec.md).

---

## § 12 References

See § 2 (anchors 1–6 + Cat-2 context) + the refuted list. Implementation survey
(review 2026-07-05, perf anchors § 5): authors' code release (MATLAB + Houdini,
project page `SchrodingersSmokeCode.zip`); CMU 15-418 CUDA port (5M @ 48 FPS);
`linwe2012/SchroedingerSmoke` (Unity compute); `SimonDanisch/SchroedingersSmoke.jl`
(Julia). No browser 3D ISF found (web spec § 1). Additional context: Nabizadeh, Wang,
Ramamoorthi, Chern (2022) *Covector Fluids* (SIGGRAPH) — lineage only, the
"better preservation" claim is **refuted, not cited**; Wang et al. (2025) *VPFM*
(arXiv:2505.21946) — lineage; the landed
`docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier-clebsch-pfm.md` (reuse).

---

## § 13 Productization status

### 13.1 Surfaces
- **Backend:** f64 NumPy ISF reference (this spec) — 13-gate target posture.
- **Frontend:** WebGPU/WGSL demo — `packages/schrodinger-smoke/web/verification-demo-spec.md`.

### 13.2 Web gate wiring
- `GATE_KIND["schrodinger-smoke"] = "new_canonical"` in
  `tools/productization/web-deploy/pipeline.py` (moat = closed-form spectral goldens +
  structural run-twice bit-identity + robust observables; the closest precedent is
  `eulerian-smoke` = "new_canonical" live-f64-reference re-run).
- `_gate_schrodinger_smoke` in the web-deploy `verify.py`: live f64 reference re-run of
  the canonical translating-ring scene + run-twice byte-identity + the machine-exact
  goldens (A,B,Parseval) recomputed live.
- `[defaults.isf]` (or reuse `[defaults.smoke]`) in `tolerance.toml` — **new category
  preferred** because ISF's f32↔f64 tolerance is spectral-solver-specific, not the
  Stam-smoke budget. Operator decision, flagged.

### 13.3 Beyond-canonical (labeled, ungated — re-scoped at review)
The paper's own nozzle and obstacles need **no DCT**: they are Alg-4
velocity-constraint regions in the periodic box (§ 1, § 5 `constraint_project`).
Toggles: jet nozzle; obstacle placement/drag (`η_Ω = 0`, movable); buoyancy
(plane-wave multiply on `ψ₂` only, paper § 3.3 — cheap, one pointwise pass);
closed-box walls (DCT Neumann — the only DCT case); live `ħ`-sweep; alternate
splittings. Documented-future: non-Hermitian absorbing layers for open boundaries
(SIGGRAPH 2024 poster, § 2 context). All rendered but explicitly **outside** the
gate — constraint/potential steps overwrite or re-phase `Ψ` and break the
unitary-norm gate by construction.

### 13.4 Operator decisions (RESOLVED at backend execution 2026-07-05,
operator-delegated "proceed as you see best")
1. **Naming/placement:** `schrodinger-smoke` own identity — **TAKEN**
   (pic-flip precedent, web hero).
2. **Tolerance category:** new `[defaults.isf]` — **TAKEN**, MEASURED basis
   in `tools/testkit/equivalence/tolerance.toml` + capped by
   `[budgets.isf]` in `tools/testkit/equivalence/tolerance-budget.toml`.
3. **Canonical scene:** single translating vortex ring — **TAKEN**
   (non-chaotic; descriptor `translating-ring-64cube-hbar0.05-step96`).
4. **Tracer integrator:** RK2 default + RK4 toggle — **TAKEN** as the review
   lean; final default confirmed by the web demo's MEASURED tracer budget.
