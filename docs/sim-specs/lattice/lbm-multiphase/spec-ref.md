# lbm-multiphase — Reference Spec

> **Status:** Phase-6 candidate spec sheet — **research draft v0.1 (2026-07-10)**,
> deep-web-research pass (2 workflow runs, 103 + 104 agents, ~6.2M tokens, ~1,370 tool
> calls; run 1: 25 claims adversarially 3-vote verified → **23 CONFIRMED, 2 REFUTED**;
> run 2 covered the GPU/industry, browser-prior-art, and visuals/perf lanes — its fetch
> agents re-checked every claim against primaries, but the 3-vote adversarial panels
> were killed by an infrastructure failure mid-run, so run-2 claims are marked
> **[fetch-verified]** = single-agent source-grounded, not panel-verified; two targeted
> formula agents downloaded the full primary corpus — including the TU Dortmund Hysing
> reference data files — before dying at the same cutoff; extraction completed locally).
> NOT executed. Gate rows below are **declared targets** to be MEASURED at build per
> `docs/architecture.md` § 2.6 / Appendix D (measured-then-declared).
>
> **Category:** lattice (master catalog § 9.7.4 — "Composes with … multi-phase") —
> the lattice family's **first web-deployable (Stack B) member** and the portfolio's
> **first multiphase-with-surface-tension sim** (catalog § 9.7.14 puts
> surface-tension-driven flow at Tier 0; catalog Part IV priority row 11 names
> multiphase + surface tension a "major fluid-family gap").
>
> **Primary surface:** web-deployable (Stack B / WebGPU + TypeScript, **f32**) driven by
> a verified **f64 NumPy reference** plus a battery of analytic/published goldens
> (Maxwell coexistence, Young–Laplace, Lamb oscillation, Young contact angle, Hysing
> rising bubble). Sibling of the existing NATIVE single-phase
> `packages/lattice-boltzmann-d3q19` (Stack C Vulkan, Qian 1992 BGK) — this sim reuses
> its derivation culture and single-phase gates but is a **new D2Q9 package**, not a
> port of the D3Q19 code.
>
> **Strategic role:** the browser fluid-sim landscape has famous single-phase toys and
> zero multiphase LBM of any kind (§ 2.3). A pseudopotential D2Q9 with **live droplets,
> coalescence, and wetting — each gated against an analytic law** — is simultaneously
> the most visually rich thing LBM does at 2D browser scale and the portfolio's
> cleanest "no one has ever validated this in a browser" claim since fdtd-optics.
>
> **Five load-bearing honesty boundaries (repeated in web copy, § 1.1):**
> 1. **NOT "the first browser LBM"** — Schroeder's CPU-JS D2Q9 (2013), a WebGPU-compute
>    D2Q9 (huj31415, 2025), a WebGL2 TRT+solute sim (rafaelanderka, 2020), and CPU/WASM
>    toys all predate us (§ 2.3, all single-phase, none validated). The defensible
>    claim is the **conjunction**: *multiphase (liquid–vapor with surface tension and
>    wetting) + published analytic gates (Maxwell / Laplace / Lamb / Young) + real-time
>    WebGPU interactivity* — no browser LBM has ANY of the first two.
> 2. **The pseudopotential model is thermodynamically inconsistent at the discrete
>    level** (Chen 2014; Hosseini–Karlin 2023; Czelusniak 2025 — § 2.2). Coexistence
>    densities match the Maxwell equal-area construction ONLY for ψ ∝ exp(−1/ρ) with
>    Guo forcing; every other configuration (including our showcase C–S tier) is gated
>    against the **forcing-specific mechanical-stability integral or measured
>    references, never raw Maxwell numbers**. Disclosed, not hidden.
> 3. **Density ratio is bounded and viscosity has a floor.** Published stability
>    envelopes (all f64): σ-tuned forcing + C–S EOS stable to T/T_c ≥ 0.63 at τ=0.6
>    (ρ_l/ρ_v ~ 700 at T/T_c = 0.5) where SC/EDM/Guo forcing die at T/T_c
>    0.86/0.73/0.87; lowest liquid kinematic viscosity at ratio ~700 is ≈ 0.075 lu with
>    equal relaxation times (Li–Luo–Li 2012/2013). Air–water at true 1000:1 + high Re
>    in f32 is NOT claimed; the honest v1 dynamic envelope is **measured at build** and
>    displayed. FluidX3D-class raindrop scenes use free-surface VoF (a different,
>    liquid-only model) — we say so (§ 2.2, § 8.9).
> 4. **Spurious currents exist and are shown, not hidden.** The interface force loses
>    isotropy at 5th order → parasitic vortices at curved interfaces, growing with
>    density ratio and 1/W (Hosseini–Karlin § 2.2). We gate their ceiling (published
>    anchors: |u|_max 0.028 BGK → 0.0053 MRT, Yu–Fan) and ship a "parasite view" that
>    displays them — the honesty boundary as a feature.
> 5. **f32 is conditionally sufficient, with named exceptions.** Lehmann's
>    precision study (PRE 106, 015308): FP32 ≈ FP64 for LBM across six benchmark
>    systems **provided DDF-shifting is used**, except at very low velocities and
>    round-off-triggered symmetry breaking. We adopt DDF-shifting from day one, keep
>    gated observables away from the exception zones, and (per house rule) never use
>    WGSL builtin transcendentals in gated kernels.

---

## 1. Scope

This sim solves **isothermal liquid–vapor multiphase flow** on a D2Q9 lattice via the
**pseudopotential (Shan–Chen lineage) lattice Boltzmann method**: the fluid's phase
separation, droplet dynamics, coalescence, capillarity, and wall wetting **emerge from
a single nearest-neighbor interaction force** added to the kinetic equation — no
interface tracking, no Poisson solve, no authored surface effects.

Governing update (lattice units δx = δt = 1):

$$
f_i(\mathbf{x}+\mathbf{c}_i, t+1) = f_i(\mathbf{x},t)
  - \frac{1}{\tau}\bigl(f_i - f_i^{\mathrm{eq}}(\rho,\mathbf{u}^{\mathrm{eq}})\bigr) + F_i
$$

with D2Q9 constants (derivation to be added at
`tools/testkit/golden/derivations/d2q9.md`, sibling of the existing
`tools/testkit/golden/derivations/d3q19.md`):

- velocities $\mathbf{c}_0=(0,0)$; $\mathbf{c}_{1..4}$ axis, speed 1; $\mathbf{c}_{5..8}$
  diagonal, speed $\sqrt2$;
- weights $w_0 = 4/9$, $w_{1..4} = 1/9$, $w_{5..8} = 1/36$; $c_s^2 = 1/3$;
- equilibrium $f_i^{\mathrm{eq}} = w_i\rho\left[1 + \frac{\mathbf{c}_i\cdot\mathbf{u}}{c_s^2}
  + \frac{(\mathbf{c}_i\cdot\mathbf{u})^2}{2c_s^4} - \frac{\mathbf{u}^2}{2c_s^2}\right]$
  (identical family form to `docs/sim-specs/lattice/lattice-boltzmann-d3q19/algebraic.md` § 2);
- kinematic viscosity $\nu = c_s^2(\tau - 1/2)$ (Chapman–Enskog, family staple).

**The multiphase ingredient** — the Shan–Chen interaction force, written here **in the
lattice-weight convention** (Krüger et al. 2017 ch. 9 form; convention table § 3.3):

$$
\mathbf{F}(\mathbf{x}) = -G\,\psi(\mathbf{x})\sum_i w_i\,\psi(\mathbf{x}+\mathbf{c}_i)\,\mathbf{c}_i
$$

where $\psi(\rho)$ is the pseudopotential and $G<0$ the interaction strength. Taylor
expansion gives $\mathbf{F} \approx -Gc_s^2\left[\psi\nabla\psi + \frac{1}{6}\psi\nabla(\Delta\psi) + O(\nabla^5)\right]$:
the first term shifts the bulk EOS to

$$
p = \rho c_s^2 + \frac{G c_s^2}{2}\psi^2(\rho),
$$

the second is the Korteweg-like term that **is** the surface tension, and the truncated
5th-order anisotropy **is** the spurious-current source (Hosseini–Karlin 2023 § 2.2).
A non-monotone $p(\rho)$ (G below critical) phase-separates spontaneously — that single
line of physics buys droplets, menisci, coalescence, and nucleation.

**Two-tier formulation strategy (the crux — full argument § 3):**

- **Tier A — the analytic-exact gate tier.** $\psi = \psi_0\exp(-\rho_0/\rho)$ + **Guo
  forcing**: the ONLY pseudopotential configuration whose coexistence provably reduces
  to the Maxwell equal-area rule, τ-independent (verified 3-0, § 2.1 A3). Moderate
  density ratio, narrowest stability window — the *metrology scene*, not the showcase.
- **Tier B — the showcase-dynamics tier.** **Carnahan–Starling EOS** via Yuan–Schaefer
  ψ + **Li–Luo–Li σ-tuned forcing** (σ = 0.105, ε ≈ 1.68) + **weighted MRT**: the
  state-of-the-art route to approximately-consistent high-density-ratio dynamics
  (droplet splashing at ratio ~700, Re up to 1000 published). Gated with MEASURED
  tolerances against the σ-scheme's own mechanical-stability integral + Laplace/Lamb.

Both tiers are the SAME kernel with different ψ/forcing/collision uniforms — one
codebase, two verification postures.

**Non-goals (v1):** 3D (§ 8.8), thermal/phase-change (§ 8.6), multicomponent SC
(ruled out for high contrast — § 2.2 R6), free-surface VoF (§ 8.9, candidate sibling
sim), compressible/acoustic physics, porous-media Darcy validation.

### 1.1 Load-bearing honesty boundary (repeated in web copy)

v1 is a **verified multiphase-flow instrument at browser scale**: it reproduces
Maxwell coexistence (Tier A exact), the Young–Laplace law, Lamb's oscillation
frequency, and Young's contact angle to stated, displayed tolerances, and runs
interactively on consumer GPUs. It is **not** a production CFD tool (FluidX3D,
waLBerla, OpenLB, Palabos, M-Star are orders of magnitude faster and 3D — § 2.3.2),
and its density-ratio/viscosity envelope is bounded (§ 1 boundary 3). The five
status-block disclosures appear verbatim in the EXPLAIN layer.

---

## 2. Independent-reference anchors, prior-art, and refuted claims

### 2.1 Independent-reference anchors (spec § 2.4 — ≥3 required)

Verification lineage of each headline claim: **[3-0]** = adversarially panel-verified
(run 1), **[fetch-verified]** = source-grounded by a fetch agent, panel not run (run 2
infra failure), **[local-extract]** = quoted verbatim from the downloaded primary in
this session's corpus.

1. **Shan & Chen 1993** (PRE 47:1815, DOI 10.1103/PhysRevE.47.1815) and **Shan & Chen
   1994** (J. Stat. Phys / PRE 49:2941) — the founding pseudopotential papers: EOS
   "exactly expressed in terms of the inter-particle potential", critical point
   "analytically calculable", coexistence from the mechanical balance condition
   [local-extract from the 1994 full text].
2. **Li, Luo & Li 2012** (PRE 86, 016709, arXiv:1204.4098) — forcing-scheme mechanism
   and the σ-tuned scheme: $\mathbf{v}' = \mathbf{v} + \sigma\mathbf{F}/(\nu\psi^2)$,
   $\varepsilon = -2(\alpha + 24G\sigma)/\beta$, σ = 0.105 → ε = 1.68 for C–S;
   stability envelope T/T_c ≥ 0.63 at τ = 0.6 vs 0.86/0.73/0.87 for SC/EDM/Guo [3-0,
   4 claims merged]. **Li, Luo & Li 2013** (PRE 87, 053301, arXiv:1211.6932) — MRT
   version; droplet splashing at ratio > 500, Re 40–1000; **Lamb 2D oscillation golden**
   (§ 4 E) [local-extract].
3. **Li et al. 2016 review** (Prog. Energy Combust. Sci. 55:52, arXiv:1508.00940) —
   the definitive four-family comparison; Guo+exp-ψ coexistence "basically independent
   of τ and consistent with … Maxwell" [3-0]; MRT spurious-current 5× reduction
   (0.028 → 0.0053, Yu & Fan PRE 82, 046708) [3-0]; class ranking: baseline
   free-energy/color-gradient unstable in DYNAMIC large-ratio flows, pseudopotential
   and phase-field succeed [3-0]. *Self-citation caveat: Li & Luo review their own
   scheme; cross-checked by verifiers against Huang–Krafczyk–Lu PRE 84, 046710 (2011).*
4. **Chen et al. 2014 critical review** (IJHMT 76:210, DOI
   10.1016/j.ijheatmasstransfer.2014.04.032) — original-SC density ratio O(10);
   Yuan–Schaefer EOS route to >1000 static (with large spurious currents at τ=1);
   thermodynamic consistency ⟺ ψ ∝ exp(−1/ρ) (verifier re-derived symbolically:
   unique solution family); MCMP limits (ratio ≈ 1, viscosity ratio < 5) [all 3-0].
5. **Hosseini & Karlin 2023** (Physics Reports 1030:1, arXiv:2301.02011) — 5th-order
   anisotropy → spurious currents ∝ density ratio, ∝ W^−2.6 (model-specific exponent);
   interface thickening restores Maxwell convergence at large ratios; surface tension
   in single-range SC enslaved to stencil+ψ (κ = Gδr²/3 in their convention, eq. 603)
   [3-0 for the mechanism claims; the *convention-sensitive formulas* are re-pinned in
   § 3.3 after two claims failed verification over exactly this — § 2.2 R1/R2].
6. **Fakhari, Mitchell, Leonardi & Bolster 2017** (PRE 96, 053301, DOI
   10.1103/PhysRevE.96.053301) — the conservative Allen–Cahn phase-field fallback:
   robust at large density AND viscosity contrast, only nonlocal variable is the phase
   field, validated on layered Poiseuille (exact analytic), Rayleigh–Taylor, Taylor
   bubble [3-0, 4 claims merged]. GPU corroboration: Holzer et al. 2021
   (arXiv:2012.06144) ran this model roofline-limited at ratio 1000 [fetch-verified].
7. **Hysing et al. 2009** (Int. J. Numer. Meth. Fluids 60:1259, DOI 10.1002/fld.1934)
   — the rising-bubble golden; exact parameter tables and TP2D reference values
   [local-extract from the paper text AND the raw TU Dortmund data files — § 4 G].
8. **Huang, Thorne, Schaap & Sukop 2007** (PRE 76, 066701) — Young-equation contact
   angle: $\cos\theta_1 = \dfrac{G_{\mathrm{ads},2}-G_{\mathrm{ads},1}}{G_c\,(\rho_1-\rho_2)/2}$
   [local-extract, eq. 8 verbatim].
9. **Lehmann et al. 2022** (PRE 106, 015308, arXiv:2112.08926) — FP32 ≈ FP64 for LBM
   with DDF-shifting (attributed to Skordos), exceptions pinned; FP16S/FP16C formats;
   collision-operator cost free under bandwidth bound [fetch-verified ×3 sources].
   **Lehmann 2022** (Computation 10(6):92) — Esoteric-Pull in-place streaming: one DDF
   copy, D3Q19 169→55 B/node with FP16, FSLBM 181→105→67 B/node (in-place costs FSLBM
   ~20% perf — a nuance the README omits) [fetch-verified].
10. **Geier et al. 2015** (Comput. Math. Appl. 70:507 — cumulant LBM): improved-BGK
    unstable above Re 8000 in sphere flow (artifacts from Re 2000), cumulant stable to
    Re 10⁵ there; **classical orthogonal MRT the LEAST stable operator tested**
    (orthogonalization flips hyper-viscosity sign); plain cumulant **ill-conditioned in
    single precision** (Appendix J well-conditioned reformulation required)
    [fetch-verified]. Re ~10⁶ belongs to **Geier, Pasquali & Schönherr 2017** (JCP
    348:889, Part II) [fetch-verified — corrects a conflated salvage claim, § 2.2 R5].
11. **Coreixas et al. 2019** (arXiv:1904.12948) + **Coreixas & Latt 2020**
    (arXiv:2002.05265) — on D2Q9 with a single relaxation rate, raw/Hermite/central/
    central-Hermite moment collisions all reduce to BGK; only recursive-regularized
    AND cumulant differ [fetch-verified — corrects the salvage claim that named only RR].
12. **Krüger, Kusumaatmaja, Kuzmin, Shardt, Silva & Viggen 2017** *The Lattice
    Boltzmann Method* (ISBN 978-3-319-44649-3) — **citation-only per the family's R8
    amendment** (no companion-code vendoring); the convention anchor for § 3.3.
13. **Czelusniak et al. 2025** (Physica A, PII S0378437125000263, arXiv:2403.11167) —
    matched-condition pseudopotential vs well-balanced free-energy: FE more accurate,
    **pseudopotential more stable** (static AND dynamic); pseudopotential still
    thermodynamically inconsistent even with literature corrections [3-0 ×2].
    *Credibility note: the authors are pseudopotential specialists; the accuracy
    finding runs against their own specialty.*

### 2.2 Refuted / corrected / must-not-ship claims (house refuted-list)

- **R1 (REFUTED 0-3, run 1): "SC bulk EOS is $P=\rho c_s^2 + (G/2)\psi^2$ with
  critical point $\rho_c=\rho_0\ln 2$, $G_c=-2c_s^2/\rho_0$" — as a
  convention-free statement.** Resolution (§ 3.3): the *critical density*
  $\rho_c = \rho_0\ln 2$ is convention-independent (it depends only on ψ's shape);
  the *EOS prefactor and G_c are not*. In Hosseini–Karlin's normalization (their
  eqs. 599–602, force weights $w(|c_i|)$ with $\sum w(|c_i|)c_ic_i = \mathbf{I}$) the
  claim is exactly right; in the lattice-weight convention used by this spec it is
  $P = \rho c_s^2 + \frac{Gc_s^2}{2}\psi^2$ and $G_c = -4/\rho_0$ (§ 3.3 derivation).
  **Ship rule: every SC formula in code, docs, or web copy names its convention; the
  f64 reference cross-checks G_c numerically at build.**
- **R2 (REFUTED 1-2, run 1): "κ = Gδr²/3 fixed surface tension" as a general SC
  statement.** Same convention trap (it is HK eq. 603 in HK's normalization). The
  load-bearing physics survives both refutations: **single-range SC surface tension is
  NOT independently tunable** — it is enslaved to G, ψ, and the stencil; independent
  control needs multirange (Sbragaglia et al. PRE 75, 026702). v1 measures σ from the
  Laplace fit rather than predicting it analytically; the Tier-A flat-interface σ
  integral is computed by the f64 reference via Shan's discrete pressure tensor
  (Shan PRE 77, 066702 — the continuum-Taylor pressure tensor is the known pitfall).
- **R3 (must-not-ship framing): "coexistence gate = Maxwell equal-area", untiered.**
  Only true for Tier A. Tier B gates against the ε-weighted mechanical-stability
  integral (weight $\psi'/\psi^{1+\varepsilon}$) or measured references [3-0].
- **R4 (must-not-ship framing): "MRT is a straightforward stability upgrade over
  BGK."** Geier 2015: the classical orthogonal MRT was the *least* stable operator in
  their shear-wave tests. What the multiphase literature means by "MRT stabilizes
  pseudopotential LBM" is specific tuned/weighted variants (Yu–Fan; Li–Luo–Li 2013;
  waLBerla's weighted-orthogonal for phase-field). The spec says "weighted MRT (Li
  2013 variant)", never bare "MRT" [fetch-verified + 3-0 for the 5× number].
- **R5 (corrected conflation):** cumulant Re-10⁶ sphere flow is Geier 2017 Part II,
  not Geier 2015 (which stops at 10⁵) [fetch-verified].
- **R6 (scope exclusion, 3-0): multicomponent SC for v1.** With only $g_{\sigma\bar\sigma}$
  free: component density ratio ≈ 1, viscosity ratio < 5. MCMP returns in v1.x only as
  the *matched-density immiscible* scene (fingering, wetting displacement — § 8.5).
- **R7 (framing guard): "multiphase LBM is how GPU codes do stunning liquids."**
  FluidX3D's raindrop/dam-break showcases are **free-surface VoF (liquid+vacuum,
  PLIC curvature)** — a different model class; M-Star ships the same class
  [fetch-verified ×2]. Our EXPLAIN layer distinguishes liquid–vapor (vapor simulated,
  nucleation/coalescence physics, bounded ratio) from free-surface (vapor ignored,
  unbounded effective ratio, no vapor physics).
- **R8 (currency caveat on the class ranking, 3-0 with verifier note):** the
  "free-energy/color-gradient unstable in dynamic large-ratio flows" ranking is
  as-of-2015 baseline models; Ba et al. PRE 94, 023310 (MRT color-gradient) and
  Wöhrwag et al. PRL 120, 234501 (entropic free-energy, We 800/Re 7200) later
  succeeded WITH heavy collision-operator stabilization — which is exactly the
  mechanism the ranking identifies. Standing for our BGK/TRT-class f32 budget.

### 2.3 Prior-art neighbors (run-2 sweep 2026-07-10; all [fetch-verified], demos
visited where live)

**2.3.1 Browser LBM (the moat lane) — five found, ALL single-phase, NONE validated:**

| Demo | Stack | Model | Validation | Notes |
|---|---|---|---|---|
| Schroeder, physics.weber.edu/schroeder/fluids | CPU JS canvas | D2Q9 BGK | none — explicit "not for serious engineering use" | max 600×240; Re ceiling "a few hundred" (author); barriers, tracers, curl/speed plots, force readout; 2013-era, the canonical one |
| huj31415.github.io/lattice-boltzmann-webgpu | **WebGPU compute** | D2Q9 BGK (τ slider = 3ν+0.5) | none (no README, no license, 0 stars) | 16×16 workgroups, f32 buffers; curl/schlieren/speed/density; barrier click + image-upload obstacles |
| rafaelanderka/lattice-boltzmann-simulator | WebGL2 fragment | D2Q9 **TRT** + solute ADR | none; `max(0.,·)` positivity clamp in BOTH fluid and solute collisions silently breaks conservation/TRT exactness | demo offline (404 as of 2026-07-10); SynBIM outreach tool, dormant since 2023 |
| briansemrau/fluidsim | CPU JS | LBM toy | none | free surface only a "future plan"; water demo self-described broken; abandoned 2018 |
| csnje/wasm-lbm | Rust→WASM CPU, canvas 2D | D2Q9 BGK | none | fixed 401×201, Re 200, pause/play only |

GitHub `lattice-boltzmann` topic (151 repos): no browser implementation in the top ~20
by stars; the only multiphase entries are **native research codes** (MPLBM-UT, Python,
Shan–Chen; listLBM, Fortran). **No browser multiphase LBM of any kind was found** —
not on GitHub Pages, the topic index, or the named candidates. *Disclosed sweep
limits: Shadertoy and compute.toys were in the sweep brief but no per-entry
enumeration survived the infra failure; a 15-minute execution-time re-sweep of those
two indexes is required before the moat sentence ships (§ 13).*

**2.3.2 Adjacent visual-bar demos (not LBM):** PavelDoGreat/WebGL-Fluid-Simulation
(16.5k stars) is GPU-Gems-38 incompressible Navier–Stokes — its virality is a
default-on post stack (multi-pass bloom, sunrays, shading, dithering) and Gaussian
splat mouse injection of velocity+dye, all MIT-licensed patterns we can adopt (§ 5).
Amanda Ghassaei / cake23 sims: not LBM-multiphase. Production/native tier: FluidX3D
(5.2k stars, top LBM repo; SRT/TRT only; FSLBM VoF; **non-commercial license — methods
reimplementable from papers, code not reusable**), waLBerla (ships BOTH free-surface
LBM and conservative Allen–Cahn phase-field, cross-validated against FluidX3D and
TCLB), OpenLB 1.6 (ships Shan–Chen SCMP with ShanChen93/94, C–S, P–R potentials +
free-energy MCMP + free-surface; BGK/TRT/MRT/KBC/cumulant/entropic), M-Star CFD
(commercial D3Q19/27 + free-surface VoF).

**2.3.3 Moat consequence.** The claim that survives: **first browser lattice-Boltzmann
simulation of multiphase flow — droplets, coalescence, wetting — with published,
reproducible analytic validation gates (Maxwell coexistence / Young–Laplace / Lamb
frequency / Young contact angle), running client-side on WebGPU** (§ 14). Every prior
browser LBM is single-phase and validation-free; multiphase LBM exists only as native
research/production code.

---

## 3. Solver strategy (the crux) — one D2Q9 kernel, two formulation tiers

### 3.1 Why pseudopotential (and not the other three families)

First-principles selection against the four multiphase-LBM families (all inputs
verified run 1):

- **Free-energy (Swift–Osborne–Yeomans lineage):** more accurate under matched
  conditions, **less stable** — pseudopotential permits lower reduced temperatures
  in both static and dynamic tests (Czelusniak 2025, [3-0]). Baseline variants
  unstable in dynamic large-ratio flows (R8). For a browser sim whose failure mode is
  a user-visible NaN blow-up, stability > last-decimal accuracy; we *disclose* FE as
  the accuracy benchmark.
- **Color-gradient (Gunstensen/Rothman–Keller lineage):** same dynamic-instability
  class finding at baseline (R8); recoloring + perturbation operators add per-step
  cost and have no analytic coexistence gate as clean as Tier A's Maxwell reduction.
- **Phase-field (conservative Allen–Cahn, Fakhari 2017):** the high-contrast champion
  and maximally GPU-local (only nonlocal extra = the phase field itself, no biased
  stencils, [3-0]) — but it carries TWO distribution sets (≈2× memory/bandwidth),
  needs a weighted-orthogonal MRT for stability, its diffuse interface forces
  ~10-cell minimum droplet diameter (vs ~3 for sharp-interface), and waLBerla reports
  **no generally applicable mobility/interface-width choice** — rising bubbles evolved
  into non-physical shapes and collapsed even at their highest resolution
  [fetch-verified from arXiv:2206.11637]. Wrong default for a many-droplet interactive
  toy; RIGHT fallback if f32 pseudopotential dynamics prove fatally fragile (§ 3.6).
- **Pseudopotential:** one distribution set + one scalar ψ gather; parameters are two
  knobs users can feel (G or T/T_c, G_ads); the emergent-EOS story is the best
  EXPLAIN content in the family; and it owns the only exact analytic coexistence gate
  (Tier A). Chosen.

**Single-component liquid–vapor, not two-component:** R6. SCMP gives density-contrast
droplets, nucleation, and coalescence — the visual physics — with half the state of
MCMP and an analytic gate MCMP lacks.

### 3.2 Formulation tiers and forcing schemes (a first-class model choice)

Forcing determines the recovered momentum equation, the coexistence curve, the
τ-dependence, and the stability envelope — it is physics, not plumbing [3-0, 4 claims]:

| Scheme | Extra recovered term | τ-dependence of coexistence | Stability (C–S, τ=0.6 droplet) | Role here |
|---|---|---|---|---|
| Shan–Chen velocity shift | $-\nabla\cdot(\rho^{-1}\mathbf{FF})$, coeff τ² | strong (unphysical ν-coupling, also in σ) | dies below T/T_c = 0.86 | pedagogy toggle only (§ 5.3) |
| Kupershtokh EDM | same form, coeff τδt | approx. removed (residual (∇ψ)²) | dies below 0.73 | not shipped v1 |
| Guo et al. 2002 | none (exact N–S, ε=0) | none | **worst**: dies below 0.87 | **Tier A** (with exp-ψ) |
| **Li–Luo–Li σ-tuned** | tuned $\varepsilon = -2(\alpha+24G\sigma)/\beta$ | ≈ none under MRT | **stable to T/T_c ≥ 0.63** | **Tier B** |

(All from PRE 86, 016709 verbatim [3-0]; the "Guo has the WORST stability despite the
best Maxwell agreement" inversion is the single most spec-shaping fact in the lane —
extra-term-induced effective repulsion is what stabilizes, which is why consistency
and robustness fight.)

- **Tier A:** $\psi = \psi_0 e^{-\rho_0/\rho}$, Guo forcing, BGK or TRT, moderate G.
  Coexistence = Maxwell equal-area **exactly** (the mechanical-stability weight
  $\psi'/\psi$ reduces to the $\rho^{-2}$ Maxwell weight — verifier re-derivation,
  run 1). τ-independence is itself a gate: re-run at τ ∈ {0.8, 1.0, 1.2}, coexistence
  must not move beyond tolerance.
- **Tier B:** C–S EOS $p = \rho RT\frac{1+b\rho/4+(b\rho/4)^2-(b\rho/4)^3}{(1-b\rho/4)^3} - a\rho^2$
  with a=1, b=4, R=1 (T_c = 0.0943, ρ_c ≈ 0.13044 — Li–Luo–Li values [3-0]);
  $\psi = \sqrt{2(p_{\mathrm{EOS}} - \rho c_s^2)/(G c^2)}$ (Yuan–Schaefer; G merely a
  sign carrier, set −1); Li σ-forcing σ = 0.105 (ε = 1.68 ∈ (1,2) as theory requires);
  weighted MRT (Li 2013). Interface-width lever: C–S `a` from 1.0 → 0.25 widens the
  interface to 4–5 lu and cuts spurious currents (arXiv:1211.6932 [local-extract]);
  the 4–6 lu interface floor is also the multicomponent stability folklore
  [salvaged, PMC7645066]. **σ = 0.105 is specific to C–S/G=−1/nearest-neighbor and its
  Maxwell fit was quantified only graphically — our f64 generator quantifies it and
  the gate uses the MEASURED offset** (run-1 caveat, honored).

### 3.3 Convention table (the R1/R2 fix — normative for all code and docs)

**This spec's convention (= Krüger et al. 2017 ch. 9; matches the family's
lattice-weight style):** force $\mathbf{F} = -G\psi(\mathbf{x})\sum_i w_i\psi(\mathbf{x}+\mathbf{c}_i)\mathbf{c}_i$
with the **D2Q9 lattice weights** $w_i$ (so $\sum_i w_i\mathbf{c}_i\mathbf{c}_i = c_s^2\mathbf{I}$), giving

$$
p = \rho c_s^2 + \frac{G c_s^2}{2}\psi^2 .
$$

Critical point for $\psi = \rho_0(1-e^{-\rho/\rho_0})$: solving $\partial_\rho p =
c_s^2(1+G\psi\psi') = 0$ together with $\partial^2_\rho p = 0$ ⇒ $\psi'^2 = -\psi\psi''$
⇒ $e^{-\rho/\rho_0} = \tfrac12$ ⇒

$$
\rho_c = \rho_0\ln 2, \qquad G_c = -\frac{1}{\psi\psi'}\Big|_{\rho_c} = -\frac{4}{\rho_0}
$$

(with ρ0 = 1: the folklore **G_c = −4**, "phase separation for G < −4"). In
**Hosseini–Karlin's convention** (force weights normalized to $\sum w(|c_i|)\mathbf{c}_i\mathbf{c}_i=\mathbf{I}$,
plus sign): $p = \rho c_s^2 + \frac{G}{2}\psi^2$, $G_c = -2c_s^2/\rho_0$ (their eqs.
599–602 [local-extract]). Identical physics; couplings map by the weight normalization
and sign. **ρ_c = ρ0 ln 2 is convention-independent; any G value without its
convention is meaningless** — this is what killed claims R1/R2 in verification, and it
is precisely the class of drift (G·c² vs g·c_s²) the run-1 caveat flags as a live
hazard across the literature. The f64 reference asserts G_c numerically at import time
(bisection on the double root of $\partial_\rho p$) as a permanent negative control.

### 3.4 Collision operators

- **v1 core: BGK and TRT** (magic parameter Λ = 3/16 default), selected per scene.
  Rationale: on D2Q9 with a single relaxation rate, moment-space reshuffles ARE BGK
  (Coreixas [fetch-verified]) — the honest upgrades are TRT (bounce-back accuracy,
  cheap) and the Li 2013 weighted MRT (Tier B stability + Yu–Fan 5× spurious-current
  cut). Collision arithmetic is bandwidth-free on GPU (Lehmann [fetch-verified]), so
  operator choice is a stability/accuracy decision, not a perf one.
- **Tier B: Li–Luo–Li 2013 weighted MRT** exactly as published (their moment set +
  relaxation vector + σ-forcing in moment space) — NOT a generic orthogonal MRT (R4).
- **Cumulant: explicitly out of v1.** Its plain form is f32-ill-conditioned (needs the
  Geier Appendix-J well-conditioned reformulation) [fetch-verified]; a
  well-conditioned D2Q9 cumulant/recursive-regularized high-Re *single-phase* wind
  tunnel is a v1.x lens (§ 8.7), gated by the family's existing single-phase staples.

### 3.5 Streaming, memory layout, and determinism posture

- **v1: two-buffer pull streaming** (read f_in at x+c_i, write f_out at x; fused
  stream-collide-force in ONE dispatch after a ψ-precompute dispatch). Two buffers ×
  9 × f32 is well within budget at target grids (§ 11), the access pattern is the
  simplest to make **run-twice byte-identical** (house gate), and pull+fuse minimizes
  passes. SoA layout (nine scalar planes), never `vec3` arrays (WGSL 16-byte padding
  trap [fetch-verified, toji.dev]).
- **DDF-shifting from day one:** store $\bar f_i = f_i - w_i$ (equilibrium-at-rest
  shift, Skordos lineage), the single highest-leverage f32 conditioning trick
  [fetch-verified ×2 — "absolutely crucial" for 16-bit, benefits FP32 at low
  velocities]; specify the exact order of operations in the equilibrium evaluation as
  Lehmann does, and keep it IDENTICAL between WGSL and the NumPy f32 proxy.
- **Esoteric-Pull = v1.x memory option** (§ 8.10), NOT v1: it halves DDF memory and is
  *faster on iGPUs* [fetch-verified], but the even/odd in-place addressing couples
  every kernel to step parity — a determinism-audit surface we take on only after the
  gate battery is green on two-buffer. (FluidX3D data point: in-place streaming cost
  its FSLBM ~20%.)
- **Wetting:** solid nodes carry a virtual wall density ρ_w (equivalently ψ(ρ_w)) in
  the ψ field; the SAME interaction sum then produces the adhesion force — no second
  kernel. G_ads-style two-parameter control and the Huang 2007 cosθ prediction (§ 4 D)
  are exposed in the f64 reference; the browser exposes θ directly via a calibrated
  ρ_w↦θ LUT measured by the reference (monotone, near-linear over the useful range —
  the chemical-potential analogue is linear [salvaged]).
- **Boundaries:** halfway bounce-back walls (family staple), periodic default;
  body-force gravity for bubble/RT scenes (Guo-consistent: the SAME forcing scheme
  carries both interaction and gravity — mixing schemes per-force is a known
  inconsistency source).

### 3.6 Pre-verified fallback (recorded, not planned)

If execution finds f32 Tier-B dynamics unshippable (NaN under interactive abuse at
the target τ), the fallback is **Fakhari 2017 conservative Allen–Cahn phase-field**
(§ 2.1 A6): exact layered-Poiseuille golden, RT/Taylor-bubble benchmarks, GPU-local,
ratio-1000 capable — at 2× memory, ~10-cell droplets, weighted-orthogonal-MRT
requirement, and documented mobility/ξ tuning fragility [fetch-verified]. The gate
battery §§ 4 C–G transfers; § 4 B (coexistence) is replaced by the phase-field
interface-profile golden $\phi(z) = \tfrac12[1+\tanh(2z/\xi)]$.

### 3.7 Substepping vs render rate

LBM lattice-unit velocities must stay ≲ 0.1–0.15 c_s for low-Ma validity; visually
lively scenes therefore need **N substeps per rendered frame** (N ~ 4–20, § 11
budget). Substep count is a quality slider (the house pattern from
`packages/schrodinger-smoke` / `packages/sph-water`); gated captures pin N exactly.

---

## 4. Analytic & reference goldens (calculation-validation anchors)

Sources per row; f64 generator = committed NumPy scripts (goldens A–G), house
generator pattern (`gen-verification.mjs` build-time data spine). All tolerances
**measured-then-declared** at build; the values below are the published anchors the
measurements are compared against.

| # | Golden | Exact statement | Anchor values | Tier |
|---|---|---|---|---|
| A | Single-phase staples (inherited) | Taylor–Green decay $u \propto e^{-2\nu k^2 t}$; Poiseuille profile; D2Q9 $f^{eq}$ table (new, sibling of `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`) | machine-level vs f64; existing family MMS (NS-2D) applies via Chapman–Enskog | v1 |
| B | Flat-interface coexistence | Tier A: Maxwell equal-area on $p(\rho)$, exact; Tier B: ε-weighted mechanical-stability integral (weight $\psi'/\psi^{1+\varepsilon}$, ε = 1.68) | Tier A: $(\rho_l,\rho_v)$ from the f64 equal-area solver at 3+ G values incl. the τ-independence re-run; Tier B: C–S T_c=0.0943, ρ_c=0.13044 + generator table; Li 2012 Fig-anchor "fit well" quantified at build | v1 |
| C | Young–Laplace | 2D: $\Delta p = \sigma/R$; σ extracted as the slope of Δp vs 1/R over ≥4 radii, linearity gated | published SC practice: linear-fit protocol at fixed G [salvaged, PMC7645066: rel. err generally < 1e-2 class]; radii span ≥ 2× with interface ≥ 4–5 lu | v1 |
| D | Young contact angle | predicted $\cos\theta_1 = \frac{G_{ads,2}-G_{ads,1}}{G_c(\rho_1-\rho_2)/2}$ (Huang 2007 eq. 8, MCMP form; SCMP uses the f64-calibrated ρ_w↦θ map); measured by the **zero-gravity spherical-cap protocol**: $R = \frac{4H^2+L^2}{8H}$, $\tan\theta = \frac{L}{2(R-H)}$ | size/resolution-invariance is itself gated (published: invariant over r0 = 20–200 lu [salvaged]); mean-density contour + linear interpolation locates the interface | v1 |
| E | Lamb droplet oscillation | 2D period $T_a = 2\pi\left[n(n^2-1)\frac{\sigma}{\rho_l R_0^3}\right]^{-1/2}$, n=2, **liquid density only** (the 2D-vs-3D and ρ_g-inclusion confusion is a real trap — 3D Rayleigh–Lamb is $\omega_n^2 = n(n-1)(n+2)\sigma/(\rho_l R^3)$) | Li–Luo–Li 2013 setup verbatim: 200×200, T/T_c=0.5 (ratio ~700), ellipse 30×27, $R_0=\sqrt{R_{max}R_{min}}$; σ from golden C feeds this — a two-golden consistency loop | v1 |
| F | Spurious-current ceiling | max\|u\| at equilibrated static droplet, fixed scene | published anchors: 0.028 (BGK) / 0.0053 (MRT) lattice units (Yu–Fan case [3-0]); E4→E8 isotropy 0.013→0.007; ceiling DECLARED from our measurement, anchors bound the sanity range | v1 |
| G | Hysing rising bubble, case 1 | ρ1/ρ2 = 1000/100, μ1/μ2 = 10/1, g = 0.98, σ = 24.5 (Re 35, Eo 10); bubble r0=0.25 at (0.5,0.5) in 1×2 domain, t ∈ [0,3]; no-slip top/bottom, free-slip sides | TP2D finest (h=1/320): **c_min = 0.9013 (t=1.9041), V_c,max = 0.2417 (t=0.9213), y_c(3) = 1.0813**; full convergence table extracted (h=1/40..1/320: c_min 0.9016→0.9013, V 0.2418→0.2417, y_c 1.0818→1.0813); raw TU Dortmund time-series (c1g1l6/7, c1g2l3, c1g3l4 + case-2 files) already downloaded — commit as reference curves, gate on curve distance not just extrema; three-group cross-code spread defines the honest tolerance floor | v1 flagship |
| H | Capillary-wave damping (Prosperetti AIVS) | analytic initial-value solution of the linearized two-fluid problem; valid cases: free surface (ρ_b=μ_b=0) or **equal kinematic viscosities ν_a=ν_b** — use the latter (both phases live); inviscid check $\omega_0^2 = \sigma k^3/(\rho_a+\rho_b)$ | Prosperetti Phys. Fluids 24:1217 (1981); Denner–Paré–Zaleski arXiv:1701.07613 as the modern implementation guide [local-extract] | v1.x |
| I | Rayleigh–Taylor | He–Chen–Zhang 1999 (JCP 152:642) canonical LBM setup, At = 0.5; spike/bubble fronts vs t | reference curves digitized at execution (multiple corpus papers reproduce it); linear-regime growth rate cross-check | v1.x |
| J | Layered two-phase Poiseuille | exact piecewise-parabolic profile with viscosity jump at the interface (continuity of u and shear stress) — elementary derivation committed alongside the generator; the diffuse interface converges to the sharp profile only as W→0, so gate at matched W (Fakhari caveat [3-0]) | Fakhari PRE 96, 053301 / Zu–He PRE 87, 043301 as published users | v1.x (v1 if fallback § 3.6 activates, where it becomes the exact flagship gate) |

**Negative controls (house discipline):** (i) Tier-A run with SC velocity-shift
forcing must FAIL the τ-independence gate (the τ² term is real); (ii) G > G_c must
NOT phase-separate; (iii) coexistence gate evaluated with raw-Maxwell targets on
Tier B must fail by the documented ε-offset (proves the gate can see the
inconsistency it claims to handle); (iv) G_c bisection vs analytic −4/ρ0 (§ 3.3).

---

## 5. Web surface — visualization & interaction

House four-layer architecture (INTERACT / EXPLAIN / PROVE / RENDER) + build-time data
spine (`gen-verification.mjs`), matching the landed rd2d/schrodinger/heat-equation
pattern. The user steer for this sim: **optimization so MANY effects coexist
on-screen; visually stunning.**

### 5.1 RENDER — the effects budget

One uber-composite principle (heat-equation lesson: the render stack, not the physics
stencil, is the frame budget): a single fragment pass reads ρ, u, ψ, flags once and
layers uniform-branch effects; heavy extras run at half-res with mip bloom.

- **Phase field as the hero:** ρ colormapped through a liquid/vapor dual-tone ramp
  (house colormaps in `common/common-web/src/colormap.ts`; rainbow banned per family
  rule). The diffuse interface anti-aliases itself; an `fwidth`-based iso-band at
  ρ = (ρ_l+ρ_v)/2 draws the droplet outline (fwidth hoisted out of varying branches —
  heat-equation trap).
- **Refraction/caustic shimmer (the wow layer):** screen-space refraction of a
  background pattern through the density gradient (∇ρ as a normal proxy), plus a
  cheap two-tap chromatic offset. Droplets read as *glass* without any raytracing.
  (FluidX3D's lesson — render straight from sim VRAM, never export — is free in
  WebGPU: the composite pass binds the live storage buffers.)
- **Velocity/vorticity lenses:** curl view (the Schroeder/huj31415 staple, done
  better: signed curl through a diverging map), speed, and **schlieren** (|∇ρ| —
  uniquely satisfying in multiphase where interfaces are real density shocks).
- **Tracer particles:** STORAGE|VERTEX shared buffer (compute writes, render pipeline
  reads — no copy [fetch-verified, toji.dev]); ~64–256k point sprites advected by u,
  fading by phase (dye in liquid only) — the murmuration/curl-noise lineage.
- **Parasite view (honesty-as-feature):** toggle exaggerating spurious currents around
  a static droplet with the measured ceiling displayed live against the § 4 F gate.
- **Post stack (PavelDoGreat's viral trio, MIT-reimplementable):** half-res mip bloom
  on speed/curl highlights, optional sunrays radial mask, ordered dithering — all
  behind one quality dropdown; every post effect OFF in gated captures.

### 5.2 INTERACT

- **Pointer = force splat + optional condensation seed:** drag injects momentum
  (Gaussian splat, PavelDoGreat pattern); a "condense" tool locally raises ρ past the
  spinodal so droplets nucleate under the cursor; "boil" lowers it. (Splat encoding
  trap from heat-equation: submit splat command buffers separately from uniform
  writes.)
- **Wettability painting (the signature interaction):** draw walls with a brush whose
  **contact angle is a slider** (ρ_w LUT § 3.5) — paint a hydrophilic channel and
  watch capillary rise; paint a hydrophobic patch and watch droplets bead and roll.
  No browser fluid demo has wetting at all.
- **Live knobs:** T/T_c (Tier B) or G (Tier A), gravity vector (device tilt on
  mobile?, v1.x), viscosity/τ within the stable window (bounds displayed, § 1
  boundary 3), substeps/quality, tier switch (A "metrology" / B "showcase").
- **Obstacle drawing** with erase (family staple), image-upload obstacles (huj31415
  parity), preset scene gallery (§ 5.5), reset/pause/single-step.
- **?preset= boot param + cfg.hide** embedded-lab chrome support (landing-tile
  workflow requirements).

### 5.3 EXPLAIN

The pseudopotential story is unusually tellable: *"every site pulls on its neighbors
a little harder where the fluid is denser; below a critical temperature that runaway
makes two fluids out of one equation."* Layered cards: the p(ρ) isotherm with live
Maxwell construction overlay and the CURRENT operating point; the forcing-scheme
inversion (why the "exact" scheme is the fragile one — § 3.2 table, with the SC-shift
pedagogy toggle demonstrating τ-drift live); liquid–vapor vs free-surface disclosure
(R7); the five honesty boundaries verbatim.

### 5.4 PROVE

House live-gate pattern: coexistence densities measured live vs the f64 targets with
error bars; Laplace Δp-vs-1/R live scatter + fitted slope vs σ_ref; contact-angle
spherical-cap measurement drawn ON the droplet (protractor overlay); Lamb period from
a live FFT of the interface radius vs the predicted T_a; run-twice SHA witness;
the § 4 G Hysing curves plotted sim-vs-reference when the bubble scene runs.

### 5.5 Showcase presets (each a live scene with a golden or a disclosed demo)

1. **Droplet rain & coalescence cascade** (Tier B, gravity + random nucleation) —
   visually the headline; Laplace gate lives here.
2. **Spinodal decomposition** (quench from supercritical — the whole field
   phase-separates; the *because physics* moment; coexistence gate).
3. **Contact-angle laboratory** (three painted patches θ ∈ {45°, 90°, 135°}, one
   droplet each; gate D live).
4. **Capillary rise / hydrophilic channel race** (wetting painting demo).
5. **Rising bubble (Hysing case 1)** — the flagship quantitative scene (gate G).
6. **Oscillating droplet** (gate E, protractor + FFT overlay).
7. **Dam break (liquid–vapor)** — honest label: *not* a free-surface model demo (R7).
8. **Single-phase wind tunnel** (G=0 von Kármán street, curl view — family
   continuity with the native D3Q19 sibling; TRT at low ν).

### 5.6 Effects-budget architecture

All § 5.1 layers coexist at 60 fps because: physics is 2 dispatches/substep (§ 3.5),
render is 1 composite + optional half-res bloom chain + 1 particle pass, and every
layer reads the same already-bound buffers. Measured budget table (per-pass ms on
RADV iGPU + dGPU) is a § 13 execution deliverable; the § 11 roofline says physics at
512² × 10 substeps consumes ≲ 25% of an iGPU frame.

---

## 6. Verification gates

### 6.1 Gate philosophy — a NEW tolerance category

New `[defaults.lbm-multiphase]` in `tools/testkit/equivalence/tolerance.toml`,
**measured-then-declared** (house rule; the native `[defaults.lbm]` 1e-5 is a
cross-stack f64 budget and MUST NOT be reused for an f32 web gate — same reasoning
that minted `[defaults.heat-equation]` and `[defaults.fdtd-optics]`). Expected order
from the f32-proxy discipline: interface-integral observables (coexistence densities,
σ slope, θ) are spatial aggregates and should gate tightly; pointwise field
comparison after many steps is chaotic-adjacent near interfaces — gate curves and
aggregates, not late-time pointwise fields (sph/pic-flip lineage lesson).

### 6.2 The `new_canonical` deploy gate

`_gate_lbm_multiphase` (verify.py, house shape): canonical scene (Tier-A flat
interface + one Tier-B droplet scene), fixed seeds/substeps → (i) live f64 (NumPy)
re-run comparison on ρ and u fields at pinned checkpoints; (ii) run-twice
byte-identity on the full state buffer; (iii) goldens B, C, F evaluated in-gate;
(iv) negative controls § 4 (i)–(iv) asserted failing/passing as declared. Analytic
gates (Maxwell/Laplace) are **CI-held in verify.py**, not just PROVE-panel — the
fdtd-optics moat-conjunction precedent.

### 6.3 Rigor disclosure gate

The web PROVE layer displays: gate ratio vs budget, run-twice SHA, measured spurious
ceiling vs anchors, measured stability envelope (the T/T_c frontier actually reached
in f32, vs the published f64 numbers § 1 boundary 3 — expected to be narrower;
DISPLAYED, not asserted equal), and the § 2.3 prior-art sentence with its date.

---

## 7. Golden tables (offline-generated, committed)

- `maxwell_coexistence.json` — Tier A: equal-area (ρ_l, ρ_v) vs G table (f64
  bisection solver, committed generator + derivation note); Tier B: C–S coexistence
  vs T/T_c with BOTH raw-Maxwell and ε-weighted targets (the difference IS the
  thermodynamic-inconsistency exhibit, R3).
- `laplace_reference.json` — per-scene σ slope references from the f64 runs.
- `contact_angle_map.json` — ρ_w ↦ θ calibration (f64, spherical-cap protocol § 4 D).
- `lamb_oscillation.json` — scene spec + predicted T_a + f64-measured period.
- `hysing_case1/` — the TU Dortmund reference files (c1g1l7 finest + coarser + the
  two sister groups for spread), committed PLAIN not LFS (landing-asset lesson), with
  provenance README (featflow.de origin, retrieved 2026-07-10).
- `d2q9-equilibrium.json` — new lattice golden, generated per the d3q19 derivation
  pipeline (Cat-3 note: ≥3 DISTINCT independent anchors per table — Qian 1992,
  Krüger 2017, and the first-principles derivation doc).

Every number that reaches WGSL as a constant (weights, MRT matrices, σ, EOS
coefficients, decay LUTs) ships as **committed f64-generated buffers/consts** — never
computed by JS `Math.*` at runtime (heat-equation/signal-workbench JS-engine-drift
rule) and never via WGSL builtin transcendentals in gated kernels (house 2⁻¹¹ rule;
note ψ for C–S needs sqrt only, which is correctly-rounded in WGSL — one of the
reasons the pseudopotential form is WGSL-friendly).

---

## 8. Model palette / full feature envelope

- **8.1 v1 core:** SCMP pseudopotential D2Q9; Tier A (exp-ψ + Guo + BGK/TRT) +
  Tier B (C–S + σ-forcing + weighted MRT); wetting ρ_w; gravity; halfway bounce-back +
  periodic; presets § 5.5; gates § 4 A–G.
- **8.2 v1 hardened:** Hysing gate G as CI-held curve gate; capillary-wave H;
  layered-Poiseuille J as cross-check; measured stability-envelope map (T/T_c × τ
  scan, auto-generated figure — the honest-envelope exhibit).
- **8.3 Thermal DDF (v1.x flagship candidate):** second distribution for temperature,
  Boussinesq → **Rayleigh–Bénard convection** with critical-Ra gate (Ra_c = 1707.76
  analytic anchor) — the catalog § 9.7.4 "composes with thermal DDF" route; a
  liquid–vapor + thermal composition later enables boiling/condensation (research
  tier, disclosed as such).
- **8.4 Multirange/tunable σ (v1.x):** Sbragaglia PRE 75, 026702 second-belt force →
  independent surface-tension knob + thicker interfaces (spurious ↓ up to 10×) [3-0].
- **8.5 Matched-density MCMP (v1.x):** immiscible fingering / displacement in painted
  porous media (R6-compliant scope), Huang 2007 gate D in its native MCMP form.
- **8.6 Phase change / thermal multiphase (research tier only).**
- **8.7 High-Re single-phase lens (v1.x):** recursive-regularized or well-conditioned
  cumulant D2Q9 wind tunnel (§ 3.4), reusing this package's kernels; Schroeder's
  "few hundred Re" ceiling is the sentence to beat, with the § 2.2 R4/R5 rigor.
- **8.8 3D (Tier-1 future):** D3Q19 multiphase — bridges to the native sibling; note
  D3Q19's axisymmetry defect at moderate/high Re (D3Q27 recovers) [fetch-verified] —
  a 3D droplet sim should budget for Q27.
- **8.9 Free-surface VoF (candidate SIBLING sim, not this package):** FluidX3D-class
  splash visuals with PLIC curvature — different model, different gates; the catalog
  § 9.7.5 slot.
- **8.10 Esoteric-Pull + packed storage (v1.x optimization):** § 3.5; pack2x16float
  DDF experiments BEHIND the gate (shader-f16 availability is poor on Android/Qualcomm
  — 0% as of 2024-12; uniformAndStorageBuffer16BitAccess only ~42% of Android
  [fetch-verified, gpuweb#5006] — so f16 storage is an enhancement, never a
  requirement).

---

## 9. f32 precision analysis (FAVORABLE with three engineered guards)

The favorable base: Lehmann PRE 106, 015308 [fetch-verified ×3] — FP32
indistinguishable from FP64 across six LBM systems *given DDF-shifting*, exceptions =
very low velocities + round-off symmetry breaking. Guards:

1. **DDF-shifting everywhere** (§ 3.5), with pinned operation order shared by WGSL
   and the NumPy f32 proxy. |f̄_i| stays O(10⁻²–10⁻¹) at our Ma — the well-conditioned
   band.
2. **The σ-forcing vapor-phase hazard:** $\mathbf{v}' = \mathbf{v} + \sigma\mathbf{F}/(\nu\psi^2)$
   divides by ψ² which is smallest exactly where F is also small (deep vapor). The f64
   reference and the WGSL kernel share ONE regularization (ψ² clamped at a committed
   εψ chosen so the correction term's error is below gate resolution in f64 sweeps);
   an open question from run 1, resolved by measurement at build (§ 13).
3. **Symmetry-breaking honesty:** perfectly symmetric ICs (e.g. the oscillating
   droplet) WILL break symmetry through round-off differently per GPU — so gated
   observables are symmetric aggregates (radius spectrum, coexistence means), never
   left-right differences; deliberately-symmetric scenes get seeded asymmetry ε_IC.
   (Karman street onset explicitly non-gated [fetch-verified].)

Additional f32 notes: spurious currents grow as τ→0.5 and BGK diverges there [3-0] —
the τ slider floor is the measured f32 divergence point with margin; interface
thickening (C–S `a` ↓) is the single strongest conditioning lever [3-0 W^−2.6-class +
Sbragaglia 10×]; no transcendental hazard in the core kernel (polynomial equilibria +
sqrt in ψ; exp-ψ Tier A uses a committed f64 LUT over the reachable ρ range with the
house LUT-interp pattern).

---

## 10. Roadmap / shipping order

1. **Backend package `packages/lbm-multiphase/`** (Python f64 + f32-proxy NumPy
   reference, mirroring `packages/lattice-boltzmann-d3q19` layout): D2Q9 core,
   Tier A/B, goldens A–F generators + tests; derivation doc
   `tools/testkit/golden/derivations/d2q9.md`; convention negative control § 3.3.
2. **Gate trilogy** (equivalence manifest + tolerance category + verify.py gate),
   canonical scenes captured; measured-then-declared pass.
3. **Web v1 core** (`packages/lbm-multiphase/web/`, vite + WGSL): kernels, RENDER
   § 5.1 minimum (phase hero + curl + schlieren), INTERACT core, PROVE coexistence +
   Laplace live.
4. **Wetting + presets 1–4, 6, 8; post stack; PROVE completion.**
5. **Hysing scene + curve gate (flagship); landing tile + poster/loop
   (`tools/…` SIMS entries, budget-aware webm per the landing-tile traps).**
6. v1.x per § 8 priority: thermal DDF → multirange σ → Esoteric-Pull → high-Re lens.

Execution sequencing note: steps 1–2 are where the two run-1 REFUTED formulas get
their permanent regression tests; do NOT begin WGSL until the f64 Maxwell/G_c
controls pass.

---

## 11. GPU optimization (the "many effects" enabler)

**Roofline arithmetic (declared, to be measured):** two-buffer pull D2Q9 multiphase
per cell per substep ≈ 36 B (read 9 f̄) + 36 B (write 9 f̄) + ~12 B (ψ pass:
read-9-f̄-reduce is fused into the previous step's write in v1.0 by storing ρ, ψ as a
vec2 aux — one extra 8 B write + 4 B flag read) + ψ neighbor gathers riding L2 ≈
**~90–120 B/cell/substep effective**. At 512² = 262k cells: ~26–31 MB/substep → a
40 GB/s iGPU at 50% efficiency sustains ~650–770 substeps/s ≈ **10+ substeps/frame at
60 fps with the full render stack**; 1024² on a 200–400 GB/s dGPU sustains 15–30.
FluidX3D's measured envelope (58–90% of theoretical bandwidth across devices
[fetch-verified — note the range extends DOWN to 58%; do not assume 80–90%]) brackets
the efficiency assumption; MLUPS sanity anchors: ~180 MLUPS/K20X-2015 f32 D3Q27
cumulant [fetch-verified], 5624 MLUPS/RTX4090 D3Q19 FP32 (FluidX3D README).

**WebGPU specifics:**
- Default limits are floors (raise via requiredLimits with clean rejection
  [fetch-verified]): 128 MiB maxStorageBufferBindingSize caps ONE f32 D2Q9 f̄ buffer
  at ~3.7M cells (1920²) — above the v1 target, so **v1 ships within default
  limits**; 2048²+ presets request higher limits progressively.
- **8 storage buffers/stage** is the binding wall (house scar tissue): budget = f_in,
  f_out, ρψ-vec2 aux, flags+ρ_w (packed u32), tracers, + uniforms(non-storage) → 5,
  leaving headroom for PROVE reduction buffers without the heat-equation interleave
  emergency.
- Workgroups: 64–256 invocations (8×8 or 16×16), measured per-device; compat-mode
  floor 128/wg (house note). Scalar SoA planes; no vec3 storage arrays
  [fetch-verified].
- Tracers render from the STORAGE|VERTEX buffer (no copy) [fetch-verified]; the
  composite pass binds sim buffers directly — the FluidX3D render-from-VRAM
  architecture is WebGPU-native.
- Reductions (coexistence means, max|u|, interface extraction for PROVE) via the
  house two-stage workgroup reduction; readbacks armed post-settle (Chromium
  boot-window mapAsync poisoning — phase-field-fracture trap).
- GPU-exclusivity guard for RAF vs replay (sph-water lesson); record/replay of brush
  events reuses the heat-equation substep-quantized event-stream pattern.

---

## 12. Repo reuse posture

- **Family lineage:** D2Q9 derivation doc modeled on
  `tools/testkit/golden/derivations/d3q19.md`; algebraic form extends
  `docs/sim-specs/lattice/lattice-boltzmann-d3q19/algebraic.md`; single-phase MMS
  reuse per that spec's § 6.1; this spec's § 8.7 lens eventually feeds back a web
  surface for the native sibling.
- **Web commons:** `common/common-web/src/colormap.ts` (+ possible dual-tone liquid
  ramp contribution), house WGSL reduction/LUT patterns, `gen-verification.mjs` spine,
  `__bitPhysicsReady` + `?preset=` + `cfg.hide` conventions, playwright+snap-chromium
  verify recipe (driver flags per phase-field-fracture).
- **Process:** new tolerance category via the Cat-X-safe route (new category, not an
  override widening — pic-flip precedent); `integrity --all` run before pushing docs
  (full-path citation rule — this file complies); landing tile + poster/loop + smoke
  EXPECTED_SIMS checklist at ship time.

## 13. Open decisions & recommended first action

1. **Package/sim name:** `lbm-multiphase` (this spec) vs `lattice-boltzmann-multiphase`
  (family-verbose). Owner call at scaffold time; URLs favor the short form.
2. **Tier-B default operating point** (T/T_c, τ, grid) — pick from the measured f32
  envelope scan (step 2), optimizing "liveliest stable scene", not max ratio.
3. **εψ regularization constant** for σ-forcing (§ 9 guard 2) — measured sweep.
4. **Shadertoy/compute.toys moat re-sweep** (15 min, § 2.3.1 gap) before any "first"
  sentence ships.
5. **Hysing curve-gate metric** (L² on resampled series vs extrema tuple) and whether
  case 1 runs at ratio 10 with true Hysing parameters via Tier B or a rescaled
  matched-Re/Eo lattice scene (the standard LBM practice — declare the mapping).
6. **Thermal DDF vs multirange σ as first v1.x** — defer to post-ship telemetry.
7. **Recommended first action:** scaffold `packages/lbm-multiphase/` backend with the
  § 3.3 convention negative control + Tier-A Maxwell solver, and run the f64
  coexistence + Laplace + Lamb loop end-to-end (goldens B/C/E prototype) before any
  GPU code — it derisks every formula in this spec for ~a day of work.

## 14. Moat

**The conjunction (per § 2.3.3):** *first browser LBM multiphase sim — liquid–vapor
droplets, coalescence, and paintable wetting — with CI-held analytic validation gates
(Maxwell coexistence exact on Tier A; Young–Laplace slope; Lamb frequency; Young
contact angle; Hysing curve) and live PROVE display, client-side WebGPU.* Nearest
neighbors and why they don't overlap: Schroeder/huj31415/rafaelanderka/wasm-lbm
(browser LBM, single-phase, unvalidated — § 2.3.1 table); FluidX3D/waLBerla/OpenLB
(validated multiphase/free-surface, native, not browser); PavelDoGreat (browser,
stunning, not LBM, not multiphase, unvalidated). The moat is honest only WITH the
§ 1 boundaries (esp. #1 and #3) and falls if v1 ships without the CI-held analytic
gates — the gates ARE the product, as with fdtd-optics.

## 15. Selected citations

Full lane reports in session corpus. Primaries: Shan & Chen PRE 47:1815 (1993); Shan
& Chen PRE 49:2941 (1994); Qian, d'Humières & Lallemand EPL 17:479 (1992); Li, Luo &
Li PRE 86:016709 (2012) [arXiv:1204.4098]; Li, Luo & Li PRE 87:053301 (2013)
[arXiv:1211.6932]; Li et al. Prog. Energy Combust. Sci. 55:52 (2016)
[arXiv:1508.00940]; Chen et al. IJHMT 76:210 (2014); Hosseini & Karlin Phys. Rep.
1030:1 (2023) [arXiv:2301.02011]; Czelusniak et al. Physica A (2025)
[arXiv:2403.11167]; Fakhari et al. PRE 96:053301 (2017); Yuan & Schaefer Phys. Fluids
18:042101 (2006); Guo, Zheng & Shi PRE 65:046308 (2002); Kupershtokh et al. (EDM);
Sbragaglia et al. PRE 75:026702 (2007); Shan PRE 77:066702 (2008); Huang, Thorne,
Schaap & Sukop PRE 76:066701 (2007); Yu & Fan PRE 82:046708 (2010); Hysing et al.
IJNMF 60:1259 (2009) + featflow.de reference data; Prosperetti Phys. Fluids 24:1217
(1981); Denner, Paré & Zaleski (2017) [arXiv:1701.07613]; He, Chen & Zhang JCP
152:642 (1999); Lamb, *Hydrodynamics* (1932); Geier et al. CMA 70:507 (2015); Geier,
Pasquali & Schönherr JCP 348:889 (2017); Coreixas et al. [arXiv:1904.12948,
arXiv:2002.05265]; Lehmann et al. PRE 106:015308 (2022) [arXiv:2112.08926]; Lehmann
Computation 10(6):92 (2022); Lehmann & Gekle IWOCL '22 (DOI 10.1145/3529538.3529542);
Holzer et al. (2021) [arXiv:2012.06144]; Schwarzmeier et al. (2022)
[arXiv:2206.11637]; OpenLB 1.6 release notes [arXiv:2307.11752]; Krüger et al.,
*The Lattice Boltzmann Method* (2017), citation-only; Sukop & Thorne, *Lattice
Boltzmann Modeling* (2006). Browser prior art URLs in § 2.3.1 (retrieved 2026-07-10).

---

```yaml
productization:
  web: true      # 5.1 — Stack B web demo (primary surface)
  binary: false  # 5.2 — native release is the D3Q19 sibling's lane
  pypi: true     # 5.3 — reference package (golden_table_surrogate route)
  render: true   # 5.4 — offline render pass (droplet scenes)
  preprint: true # 5.5 — first-validated-browser-multiphase-LBM note
```
