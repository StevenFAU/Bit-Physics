# fdtd-optics — Reference Spec

> **Status:** Phase-6 candidate spec sheet — **research draft v0.2 (2026-07-09)**,
> deep-web-research pass (6 parallel research lanes: first-principles Yee numerics,
> boundaries/sources, materials/dispersion, applications/benchmark-goldens,
> industry-landscape/moat, GPU-optimization/visualization; ~50 primary sources fetched
> across Meep / Lumerical / Tidy3D / gprMax docs, Schneider *uFDTD*, Taflove & Hagness,
> and the analytic-golden literature; every headline number cross-checked against a
> named source). **v0.2 (same day): adversarial re-verification pass** — 4 independent
> re-research lanes (prior-art re-sweep, golden recomputation, method-claim
> primary-source audit, WebGPU perf/viz) + repo-consistency audit. Outcome: all 15
> analytic goldens CONFIRMED by independent recomputation (precision pins added,
> § 4); 3 prior-art projects the v0.1 sweep missed (efs / wifi-solver / heaviside —
> moat re-worded, § 2.3 / § 14); Falstad emwave mischaracterization fixed; PML-failure
> claim split into its two real modes (§ 3.4); TF/SF chapter refs corrected +
> Tan–Potter oblique state-of-the-art added (§ 3.5); Kerr n₂ convention pinned to
> Boyd-intensity (§ 8.6); CPML defaults provenance resolved (§ 3.4, closes open
> decision § 13.2); iGPU perf budget corrected from bandwidth math (§ 11); RENDER /
> INTERACT envelope expanded from verified prior-art feature inventories (§ 5).
> NOT executed. Gate rows below are **declared targets** to be MEASURED
> at build per `docs/architecture.md` § 2.6 / Appendix D (measured-then-declared).
>
> **Category:** electromagnetics — a **NEW portfolio family** (master catalog
> `docs/planning/bit-physics-master-catalog.md` § 14, "Electromagnetism and Optics";
> Tier-0 instance charted at § 14.5.1). Fills the portfolio's **no-waves/light gap**
> and is the first sim in which the medium being simulated is *light itself*. Distinct
> from the waves family (catalog § 15) by the **vector nature of EM and the presence of
> polarization**.
>
> **Primary surface:** web-deployable (Stack B / WebGPU + TypeScript, **f32**) driven by
> a verified **f64 reference** (JS or NumPy) AND, uniquely for this sim, a battery of
> **closed-form analytic references** (Fresnel, Mie, grating, waveguide-mode). Matched
> against published photonics benchmarks. Tier-0 per master catalog § 4.2 / § 14.5.1.
>
> **Strategic role:** the **Tier-0 twin of a frontier Tier-2 production code** — the
> exact public-good gap the master catalog names at § 2.5 Gap 1: *"Tidy3D is a
> multi-Gcells/s FDTD, but there is no public web sim of a Mie-scattering nanoparticle
> that uses the same numerical method."* This sim closes that gap: the **first browser
> FDTD with published, reproducible analytic validation gates (Fresnel / Brewster /
> Mie / grating) and real-time interactive stepping** (§ 14 moat — re-scoped v0.2
> after the efs finding; the bare "first verification-hardened browser FDTD" is
> retired, § 2.2).
>
> **RELATIONSHIP TO `common-em` (deliberate, ambitious scope per owner steer
> 2026-07-09).** The master catalog proposes a `common-em` module (§ 3 module table,
> "Maxwell, plasmonics, FDTD") for the whole EM family. This sim's recommended
> discretization — a **regular Yee grid + finite differences** — is precisely the
> Maxwell-solver core that `common-em` would export, so this sim ships **standalone**
> today and is the **natural nucleus** of `common-em` when the EM cluster lands. It does
> NOT depend on the unstructured-mesh `common-fem`/`common-mesh` modules. (An
> unstructured-FEM/FDFD route exists and is the frequency-domain state of the art —
> § 3.6 — but it is the wrong tool for a real-time WebGPU time-domain sim.)
>
> **Five load-bearing honesty boundaries (repeated in web copy, § 1.1):**
> 1. **NOT "the first FDTD in a browser" — and NOT even "the first client-side WebGPU
>    Maxwell FDTD."** Drysdale's WebGL-FDTD (2017), RobinKa/maxwell-simulation,
>    **wifi-solver.com (2024, client-side WebGPU 2D FDTD, real units, unvalidated,
>    closed)**, **roman01la/efs (2026-04, openEMS→WASM + WebGPU backend, 3D, real
>    units, native-vs-WebGPU cross-validated)**, and **heaviside (2026-05, WebGPU
>    TMz/TEz Yee sandbox, PML, unvalidated)** all predate us (§ 2.3). The defensible
>    claim is the **conjunction**: *published, reproducible analytic-validation gates
>    (Fresnel/Brewster/Mie/grating) + real-time interactive stepping + real units +
>    client-side WebGPU* — which no prior browser EM sim satisfies (§ 14; efs is the
>    nearest neighbor and is differentiated there explicitly).
> 2. **This is a verified visualizer, not a metrology tool.** f32 is *sufficient and
>    correct* for the core (§ 9), but quantitative accuracy is **disclaimed for extreme
>    field concentration** (deep plasmonic hot spots, ultra-high-Q resonators) where the
>    dynamic range exceeds ~10⁷–10⁸; gates are **measured-tolerance / analytic-anchored,
>    never bit-exact** to a reference.
> 3. **PML is not universal — two distinct failure modes (Oskooi 2008; Loh 2009).**
>    (a) Media that vary *along the absorption direction* (gratings / photonic crystals
>    / periodic structures) break the coordinate-stretching argument: PML there has
>    **irreducible reflection even at infinite resolution**. (b) **Backward-wave modes**
>    (negative-index metamaterials, some plasmonic waveguide regimes) turn the PML into
>    **gain — exponential amplification**. Both are cured by a graded **adiabatic
>    absorber** (§ 3.4). Disclosed, not hidden.
> 4. **The 2D sim is single-polarization.** Tier-0 solves one 2D polarization (TMz *or*
>    TEz — § 1); the full vector/polarization physics that distinguishes EM from scalar
>    waves is a **3D Tier-1** upgrade (§ 10). s-pol ↔ TEz, p-pol ↔ TMz is stated
>    explicitly so Fresnel/Brewster claims are unambiguous.
> 5. **Nonlinear χ³ carries a convention trap.** Pinned to **Boyd's intensity
>    convention**: $n_2 = 3\chi^{(3)}/(4n_0^2\varepsilon_0 c)$ [SI], which is exactly
>    Meep's $n_2 = 3\chi^{(3)}/(4n_0^2)$ with $\varepsilon_0 c\to1$ in normalized
>    units. The rival *field* convention family ($\Delta n = n_2|E|^2$, e.g.
>    $3\chi^{(3)}/(8n_0)$) differs by factors of $n_0\varepsilon_0 c$ — the exact
>    unit-drift class that has reddened prior specs. **Pinned, cited, and gated**
>    (§ 8.6).

---

## 1. Scope

This sim solves **Maxwell's equations in the time domain** on a fixed regular grid via
the **Yee finite-difference time-domain (FDTD)** scheme. It propagates real
electromagnetic fields — you watch light diffract, refract, scatter, resonate, and
couple into materials, as the emergent solution of Maxwell's curl equations, not an
authored ray or shader effect.

Governing system (SI form; **σ** = electric conductivity, **σ\*** = magnetic loss,
**J** = source current):

$$
\mu\,\frac{\partial \mathbf{H}}{\partial t} = -\nabla\times\mathbf{E} - \sigma^{*}\mathbf{H},
\qquad
\varepsilon\,\frac{\partial \mathbf{E}}{\partial t} = \nabla\times\mathbf{H} - \sigma\mathbf{E} - \mathbf{J}
$$

with constitutive relations $\mathbf{D}=\varepsilon_0\varepsilon_r\mathbf{E}$,
$\mathbf{B}=\mu_0\mu_r\mathbf{H}$. Only the two **curl** equations are integrated; the two
Gauss (divergence) laws are satisfied **automatically to machine precision** by the Yee
construction (the discrete divergence of a discrete curl vanishes identically) — so no
divergence cleaning is ever needed.

**Yee staggering** (the defining trick, Yee 1966): each **E** component lives on a cell
*edge*, each **H** component on the cell *face* it threads; **E** is sampled at integer
time steps $n$, **H** at half-steps $n+\tfrac12$. Every spatial and temporal derivative
is then a **centered** (2nd-order) difference with no averaging, and the two updates
interleave into an explicit, non-iterative **leapfrog** — **two stencil passes per step,
no linear solve.** This is the single reason FDTD is an ideal WebGPU target: the entire
physics is a local stencil.

**Normalized units (mandatory — § 9).** The sim runs in the community-standard
dimensionless system $c=\varepsilon_0=\mu_0=1$ with a characteristic length $a$ (Meep
convention: frequency $f=a/\lambda$ in units of $c/a$), and impedance-normalizes
$\tilde{\mathbf E}=\mathbf E/\eta_0$ so $|\mathbf E|\approx|\mathbf H|$ in vacuum. Every
field and coefficient is then $O(0.1$–$10)$, which is what makes **f32 well-conditioned
in the browser**. The dimensionless coupling constant is the **Courant number**
$S_c = c\,\Delta t/\Delta$.

**2D reductions** (invariant along $z$, $\partial/\partial z = 0$): Maxwell decouples into
two independent scalar polarizations —

- **TMz** $\{E_z, H_x, H_y\}$ — E out of plane; **the recommended Tier-0 target** (one
  scalar field to color-map). Maps to **p-polarization** at an interface.
- **TEz** $\{H_z, E_x, E_y\}$ — H out of plane. Maps to **s-polarization**.

Convention is **Schneider's TMz/TEz (transverse-to-z)**, stated explicitly because
optics/waveguide texts define "TE/TM" relative to a different axis and often mean the
opposite (§ 1.1 honesty boundary #4).

### 1.1 Load-bearing honesty boundary (repeated in web copy)

v1 is a **verified electromagnetics instrument**: it reproduces analytic optics (Fresnel,
Mie, grating, waveguide dispersion) to a stated tolerance and runs interactively in the
browser. It is **not** a production photonics-design tool (Meep/Lumerical/Tidy3D are more
accurate and orders of magnitude higher throughput — § 14). The five status-block
disclosures appear verbatim in the EXPLAIN layer.

---

## 2. Independent-reference anchors, prior-art, and refuted claims

### 2.1 Independent-reference anchors (spec § 2.4 — ≥3 required)

1. **Yee 1966**, *Numerical solution of initial boundary value problems involving
   Maxwell's equations in isotropic media*, IEEE-TAP 14:302–307 —
   <https://ieeexplore.ieee.org/document/1138693>. The founding scheme (staggered
   E/H grid + leapfrog). Everything downstream is a boundary/source/material extension
   of this update.
2. **Schneider, *Understanding the FDTD Method* (uFDTD)** — the free gold-standard
   textbook; source of the exact 1D/2D update coefficients, the Courant number, the
   magic-time-step / dispersion analysis, and the TF/SF plane-wave boundary with its
   1-D auxiliary incident-field grid. Code + text: <https://github.com/john-b-schneider/uFDTD>
   (dispersion chapter: <https://eecs.wsu.edu/~schneidj/ufdtd/>).
3. **Taflove & Hagness, *Computational Electrodynamics: The FDTD Method*, 3rd ed.
   (2005)** — the canonical reference for UPML/CPML, TF/SF, and dispersive-material
   (ADE/recursive-convolution) FDTD —
   <https://us.artechhouse.com/Computational-Electrodynamics-The-Finite-Difference-Time-Domain-Method-Third-Edition-P1929.aspx>.
4. **Oskooi et al. 2010**, *Meep: A flexible free-software package for electromagnetic
   simulations by the FDTD method*, Comput. Phys. Commun. 181:687–702 —
   <https://math.mit.edu/~stevenj/papers/OskooiRo10.pdf>. The academic reference
   implementation; source of the normalized-unit convention (§ 1), the subpixel-smoothing
   accuracy trick (§ 3.7), the unified dispersive-permittivity model (§ 8.3), the Padé
   nonlinear D→E factor (§ 8.6, verified from `src/step_generic.cpp` in
   <https://github.com/NanoComp/meep>), and the analytic-benchmark validation discipline
   (Fresnel/Mie) we adopt as our gate.

### 2.2 Refuted / must-not-ship framings

- **REFUTED — "the first FDTD in a browser."** Prior WebGL FDTDs exist (Drysdale 2017;
  RobinKa/maxwell-simulation — § 2.3). Ship only the **conjunction** claim (§ 14). Any
  bare "first browser FDTD" is false and a reviewer will pounce.
- **REFUTED (v0.2 re-sweep) — "the first client-side WebGPU Maxwell FDTD" and "the
  first verification-hardened browser FDTD" (as bare phrases).** wifi-solver.com
  (2024) is a shipped client-side WebGPU 2D Maxwell FDTD with real units; and
  **roman01la/efs** (2026-04) is a client-side WASM+WebGPU port of openEMS (full 3D,
  real units) with a **native-vs-WebGPU cross-validation pipeline** (~600 tests) —
  a genuine verification posture, just code-vs-code equivalence rather than analytic
  gates, and batch-solve rather than real-time interactive. The survivable superlative
  must therefore name the analytic gates and the real-time interactivity explicitly
  (§ 14). This is the single most important v0.2 correction.
- **REFUTED (v0.2) — "Falstad emwave1/emwave2 are scalar."** They are real 2D
  **Maxwell** TE/TM electrodynamics sims (color = out-of-plane field, arrows =
  in-plane field; reflection/refraction/dipole radiation). Still qualitative,
  unit-less, unvalidated, CPU — but calling them scalar is false. (Falstad *ripple*
  is scalar — that part stands.)
- **REFUTED — "Tidy3D proves FDTD already runs in the browser."** Tidy3D is a **cloud**
  solver; the browser is a job submitter (`upload → task_id → poll → download`). The
  honest distinction is **client-side (your GPU, no upload/account/cost) vs cloud** —
  state it explicitly (§ 14).
- **CAUTION — "PML absorbs everything."** False in two distinct ways: periodic media
  along the absorption direction ⇒ irreducible reflection; backward-wave media ⇒
  amplification. Use an adiabatic absorber there (§ 3.4, honesty boundary #3).

### 2.3 Prior-art neighbors (v0.1 sweep 2026-07-09 + v0.2 adversarial re-sweep same
day; see § 14 for the moat)

- **Professional FDTD (desktop/cloud, non-interactive):** **Meep** (MIT, GPL, CPU-only —
  the academic reference, validates against Fresnel/Mie); **Ansys Lumerical FDTD**
  (commercial gold standard, foundry-certified); **Tidy3D/Flexcompute** (GPU-*cloud*,
  20 Gcells/s A100 / 33 Gcells/s H100 — remote datacenter compute, browser is UI only);
  **gprMax** (open, CUDA, GPR); **fdtd-z** (Lu et al., open CUDA systolic); **openEMS**
  (antennas/RF). All are batch/scripted; none is client-side real-time interactive.
- **Client-side browser Maxwell FDTDs (the honest prior art — v0.2 re-sweep found
  three the v0.1 pass missed):**
  - **roman01la/efs "Electromagnetic Field Solver"** (2026-04,
    <https://github.com/roman01la/efs>, live <https://efs.roman01la.workers.dev/>) —
    **the nearest neighbor.** openEMS (EC-FDTD, C++) cross-compiled to **WASM with a
    custom WebGPU compute backend**; full **3D Maxwell, real units** (mm/GHz,
    S-parameters, radiation patterns), entirely client-side, GPL-3.0. Verification:
    a **native-openEMS-vs-WebGPU cross-validation pipeline** + ~600 tests — serious,
    but **code-vs-code equivalence, no analytic gates** (no Fresnel/Mie/grating
    numbers). UX: parametric-script **batch solve** (seconds/run, RF/antenna domain),
    not real-time interactive field-stepping. Reported 3000 Mcells/s WebGPU.
  - **wifi-solver.com** (2024-10, jasmcole; blog
    <https://jasmcole.com/2024/10/18/a-decade-of-wifi/>) — client-side **WebGPU 2D
    Maxwell FDTD** with real units (2.4/5 GHz WiFi on real floorplans, material
    walls). **No published validation**, closed source. Nice feature to steal: the
    instantaneous-field ⇄ time-averaged-power view toggle.
  - **frankie-eight-days/heaviside "EM Playground"** (2026-05,
    <https://github.com/frankie-eight-days/heaviside>) — WebGPU WGSL 2D Yee in
    **both TMz and TEz** + Berenger split-field PML + a 3D/CPML engine in progress;
    brush painting, probes with FFT spectrum panels, VSWR. **Normalized units, no
    analytic validation**, undeployed/unpublicized (0 stars) as of 2026-07-09 —
    closest in spirit; watch it.
  - **WebGL-era:** **timdrysdale/webgl-fdtd** (2017, TM-only, Mur ABC, no units,
    unvalidated, IEEE/EQEC 2017 — <https://github.com/timdrysdale/webgl-fdtd>);
    **RobinKa/maxwell-simulation** (WebGL Yee ε/μ/σ, no units, unvalidated, last
    real commit 2020 — <https://github.com/RobinKa/maxwell-simulation>).
  - **Smaller/CPU:** bcerjan/simpleFDTD (C→WASM 2D dispersive, visible-λ, no
    validation); olofer/wasmem, Miki-AG/fdtd-wasm, atangent15/fdtd-em (2D TMz
    toys, normalized, unvalidated).
  - **Common denominator: none publishes a quantitative validation against an
    analytic reference, and none combines that with real-time interactive stepping.**
- **Browser wave toys (not Maxwell):** **Falstad ripple tank** (`falstad.com/ripple` —
  *scalar* wave eq., ~60 presets, the interaction gold standard — § 5.2); **Falstad
  emwave1/emwave2** (**real 2D Maxwell TE/TM** — v0.2 correction — but qualitative,
  unit-less, unvalidated, CPU); **VisualPDE** (generic GPU PDE engine incl. the scalar
  wave equation, *not* a Maxwell/optics solver with materials — <https://visualpde.com>);
  huj31415/wave-webgpu (WebGPU *scalar* wave — image-import-as-index-map feature worth
  stealing, § 5.2).
- **Educational EM applets:** EMANIM, PhET bending-light (draggable protractor /
  intensity-meter tools — § 5.2), ricktu288 ray-optics (element toolbox + user scene
  gallery) — all ray/animation, not full-wave Maxwell.
- **Analytic Mie in the browser:** omlc.org / saviot.cnrs.fr / miepython-JupyterLite
  Mie *calculators* (series evaluation, no solver) — confirms master-catalog Gap-1:
  **no browser sim computes Mie scattering with the production method (FDTD)**.

---

## 3. Solver strategy (the crux) — Yee grid, explicit leapfrog, in-place, matrix-free

### 3.1 Discretization decision

| Route | GPU-parallel | Geometry / BC | Verdict |
|---|---|---|---|
| **Regular Yee grid + explicit leapfrog FDTD** | Excellent — 1:1 with two compute passes/step, in-place, no global solve | Arbitrary rectangular domains, PML/periodic/PEC | **RECOMMENDED v1** |
| Frequency-domain FDFD (sparse solve) | Poor — global sparse indefinite solve | Any | Steady-state accuracy, wrong tool for real-time time-domain |
| Unstructured-FEM / DGTD | Poor — sparse solve / mesh bookkeeping | Curved geometry (no staircasing) | CPU/cluster state of the art; needs `common-mesh` (not this sim) |
| RCWA / FMM (Fourier modal) | N/A (frequency domain) | Periodic only | The **grating golden reference** (§ 4), not the solver |
| Spectral (reuse repo Stockham WGSL FFT) | Excellent | Periodic BC only | Not for open scattering; FFT reused instead for **DFT flux monitors** (§ 3.5, § 12) |

**Rationale for Yee FD leapfrog:** most GPU-parallel of all Maxwell discretizations; the
leapfrog is **naturally in-place** (E and H in separate arrays, each update reads only the
*other* field → no read-after-write hazard → **no ping-pong double-buffering**, half the
footprint of a same-buffer CA); handles the non-periodic open-domain scattering the
benchmarks require; and one time-domain solver delivers the **entire capability catalog**
(§ 8) plus every visually stunning scene (§ 5) from the same kernel.

### 3.2 Per-frame pass structure (WGSL compute dispatches)

Per physics substep (N substeps per rendered frame — § 3.8):

1. **H-update** — $\mathbf H^{n+1/2} = \mathbf H^{n-1/2} - \tfrac{\Delta t}{\mu}\nabla_h\times\mathbf E^{n}$ (one dispatch; lossy variant carries the $\tfrac{1-\sigma^{*}\Delta t/2\mu}{1+\sigma^{*}\Delta t/2\mu}$ prefactor).
2. **PML/absorber auxiliary update** (boundary shell only — § 3.4): CPML $\psi$ recursion.
3. **Material/dispersion pass** (if active — § 8.3): time-step the auxiliary polarization/current fields (Drude $J$, Lorentz $P,P^{n-1}$) via ADE.
4. **E-update** — $\mathbf E^{n+1} = C_a\mathbf E^{n} + C_b(\nabla_h\times\mathbf H^{n+1/2} - \mathbf J - \textstyle\sum\text{aux})$; the **local nonlinear D→E inversion** (Kerr/χ² Padé factor, § 8.6) rides here — no neighbor data, embarrassingly parallel.
5. **Source injection** — soft additive current at source cells; TF/SF boundary correction (§ 3.5).
6. **DFT monitor accumulation** (if spectra active — § 3.5): $\text{Re}\mathrel{+}=f\cos\omega t,\ \text{Im}\mathrel{+}=f\sin\omega t$ per monitor cell × frequency (Kahan-summed — § 9).

Explicit 2D TMz update coefficients (lossless, normalized): $E_z$ curl of $(H_y,H_x)$;
$H_x,H_y$ from $\pm\partial E_z$. Lossy form uses the standard
$C_a=\tfrac{1-\sigma\Delta t/2\varepsilon}{1+\sigma\Delta t/2\varepsilon}$,
$C_b=\tfrac{\Delta t/\varepsilon}{1+\sigma\Delta t/2\varepsilon}\cdot\tfrac{1}{\Delta}$
(Luebbers) — two precomputed per-cell coefficient fields, no new time-stepped array.

### 3.3 Stability — the CFL limit (a hard cliff)

$$\Delta t \le \frac{1}{c\sqrt{1/\Delta x^2 + 1/\Delta y^2 + 1/\Delta z^2}}
\quad\Longrightarrow\quad S_c \le 1/\sqrt{d}\ \ (\text{cubic grid}):\ \tfrac{1}{\sqrt2}\approx0.707\ (\text{2D}).$$

Violation is **exponential blow-up to NaN within tens of steps** — no graceful
degradation. **Ship $S_c\approx0.5$** (comfortably below the 2D limit) to leave margin
against material inhomogeneity, lossy coefficients, and f32 round-off nudging a marginal
$S_c$ over the edge. A cheap per-N-frame NaN/energy watchdog flags blow-ups for the
harness. Spatial rule: **$\Delta x \le \lambda_{\min}/10$** (≥10 cells per shortest
wavelength; use 10–20 for low numerical dispersion — § 3.7).

**CFL under CPML and dispersive media (verified v0.2):** with the **semi-implicit ADE
forms of § 8.3** the vacuum CFL limit is **preserved exactly** for Drude/Lorentz media
(von-Neumann + Routh–Hurwitz analyses — the "stability-improved ADE" literature exists
precisely because *sloppy* ADE discretizations lose margin; use the § 8.3 forms and
gate each pole). CPML's CFS terms are purely lossy and $\kappa\ge1$ only slows the
stretched-coordinate speed, so standard CPML does not tighten the vacuum limit either.
$S_c=0.5$ therefore stands across the whole v1 material palette (nonlinear χ³ is the
one exception — § 8.6 has its own safeguards).

### 3.4 Boundaries

| Boundary | Tier | Cost / method | Notes |
|---|---|---|---|
| **Mur 2nd-order ABC** | **v1 default** | boundary-only pass, ~1–5% reflection | cheap; adequate for normal-incidence demos; run *after* the E/H update (needs the just-updated interior node) |
| **CPML (CFS-PML)** | **v1 hardened** | 1 aux $\psi$ array per PML-face-component, ~10-cell shell, reflection 10⁻⁵–10⁻⁸ | the modern standard; $\kappa$ absorbs evanescent, $\alpha$ (complex-freq-shift) fixes grazing incidence & low-freq; **required for clean Mie/broadband gates** |
| **Adiabatic absorber** | v1 hardened | graded scalar $\sigma$, reflectionless only in the thick limit | **mandatory where PML fails** (two modes, § 1.1 #3): periodic media along the absorption direction ⇒ PML has *irreducible reflection* (Oskooi–Zhang–Avniel–Johnson, Opt. Express 16:11376, 2008); backward-wave media (negative-index, some plasmonic regimes) ⇒ PML *amplifies* (Loh–Oskooi–Ibanescu–Skorobogatiy–Johnson, PRE 79:065601(R), 2009) |
| **PEC / PMC** | v1 free | tangential E=0 / H=0, boolean mask | mirrors, waveguide walls; PEC is the default unreferenced-edge behavior |
| **Periodic / Bloch** | v1 / v1.x | index wrap / $e^{i\mathbf k\cdot\mathbf R}$ phase | Bloch needs **complex fields** (Re/Im, 2× storage) → oblique incidence + band sweeps for gratings/photonic crystals |

**CPML grading (the numbers to copy — provenance resolved v0.2):**
$\sigma(\ell)=\sigma_{\max}(\ell/d)^m$, $m\approx3$–$4$,
$\sigma_{\max}=-(m+1)\ln R/(2\eta_0 d)$. Full recursion (verified against the
Roden–Gedney form / Taflove Ch. 7 eq. 7.99–7.102):

$$b_\xi=\exp\!\big[-(\sigma_\xi/\kappa_\xi+\alpha_\xi)\Delta t/\varepsilon_0\big],\qquad
a_\xi=\frac{\sigma_\xi\,(b_\xi-1)}{\kappa_\xi(\sigma_\xi+\kappa_\xi\alpha_\xi)},\qquad
\psi^{n+1}=b_\xi\,\psi^{n}+a_\xi\,\big(\partial_\xi\text{field}\big)^{n+1/2}.$$

The **$\kappa_{\max}=13.5$, $\alpha_{\max}=0.225$** defaults are real published
numbers — the FDTD++ production defaults (10-layer, $m=3.5$, $m_\alpha=2$,
$1.1\times\sigma_{\rm opt}$), which cite Taflove & Hagness 3rd ed. Ch. 7 — but they
are *a tuned default, not a universal optimum* (Giannopoulos's higher-order-CPML work
uses $\kappa_{\max}=5$, $\alpha$ graded *decreasing outward*). Ship the FDTD++/Taflove
set, converge by thickness-doubling, and let the reflection gate (not the constants)
carry the correctness claim. $R\sim10^{-7}$ target. WebGPU pattern: one kernel over
the whole grid, PML-ness carried as **depth-indexed coefficient buffers** (0/identity
in the interior) — no hot-loop branching; interleave $\psi$ components into `vec4` to
respect the 8-storage-buffer limit.

### 3.5 Sources

- **Soft additive** (physically a current $J$) — transparent to backscatter; the default.
  Hard sources (overwrite a node) act as a PEC and reflect returning waves — **avoided.**
- **TF/SF plane-wave injection** — *the* workhorse for clean scattering (Mie/RCS). The
  grid splits into an inner **total-field** zone (scatterer + incident + scattered) and
  an outer **scattered-field** zone (scattered only → runs into the PML). The incident
  wave is injected **only at the TF/SF boundary** by adding/subtracting the analytic
  incident field on the straddling Yee updates, so SF-zone monitors see the **pure
  scattered field**. **Critical trap (honesty):** the injected incident field must be
  **grid-dispersion-consistent** — supplied by a small **1-D auxiliary FDTD** with the
  same dispersion relation — or it leaks into the scattered field and poisons the Mie
  gate (§ 4). Source pinned v0.2: **uFDTD Ch. 3 § 3.10 (1D) and Ch. 8 §§ 8.5–8.6 (2D
  TMz/TEz with the 1-D aux grid)** — *not* Ch. 5. For **grid-aligned** incidence the
  1-D aux grid is essentially exact (on-axis 2D dispersion reduces to the 1-D
  relation) — sufficient for the v1 Mie gate. For **oblique** incidence the naive
  aux grid leaks (Schneider IEEE-TAP 2004); the state of the art is dispersion-matched
  discrete-plane-wave propagators (**Tan & Potter FDTD-DPW / Schneider AFP-TFSF**,
  leakage at finite-precision ~−300 dB) — **v1.x**, needed only for the oblique
  Brewster/grating set pieces (v1 does those with an angled *interface* under
  grid-aligned incidence instead, which is exactly equivalent physics).
- **Time signatures:** **Ricker wavelet** (2nd-derivative-of-Gaussian, no DC, single
  parameter) is the preferred broadband pulse; ramped **CW sinusoid** for steady-state
  (must ramp smoothly or the turn-on injects broadband transients). Modulated Gaussian
  for a band. Point/dipole, line, Gaussian-beam, and waveguide-eigenmode sources round it
  out (eigenmode needs an offline mode solve — Tier-1).
- **Broadband-in-one-run (THE efficiency trick):** drive one Ricker pulse, accumulate an
  **on-the-fly DFT** at monitors → the entire transmission/reflection/scattering spectrum
  from a single simulation. Reuses the repo's Stockham FFT machinery conceptually (§ 12);
  watch the WGSL builtin-trig hazard (§ 9) — precompute the source/DFT trig tables in
  f64.

### 3.6 Why NOT frequency-domain / unstructured FEM (documented, so the choice is auditable)

FDFD and FEM/DGTD give steady-state accuracy and staircase-free curved boundaries, but
both require a **global sparse solve** that does not parallelize onto a WebGPU compute
pass and would kill interactivity. They are the right tools for a Tier-2 vendored port
(and the natural home of a future `common-mesh`), not for a real-time in-browser sim. RCWA
(frequency-domain Fourier modal method) is retained only as the **grating golden
reference** (§ 4), not as a solver.

### 3.7 Numerical dispersion, anisotropy & subpixel smoothing (accuracy story)

The Yee scheme is only *approximately* non-dispersive. Master relation:

$$\Big[\tfrac{1}{c\Delta t}\sin\tfrac{\omega\Delta t}{2}\Big]^2 = \sum_\xi\Big[\tfrac{1}{\Delta\xi}\sin\tfrac{\tilde k_\xi\Delta\xi}{2}\Big]^2
\ \xrightarrow{\Delta\to0}\ \tfrac{\omega^2}{c^2}=k^2 .$$

The **magic time step** $S_c=1$ gives **zero dispersion in 1D at any resolution** but
**does not exist in 2D/3D** (always residual). **Numerical anisotropy:** phase-velocity
error is **largest on-axis, smallest on the diagonal** — an under-resolved circular wave
renders square-ish. This relation is itself a **quantitative golden** (§ 4 K): launch a
plane wave at a known angle, measure $\tilde c_p$ vs the formula. **Subpixel smoothing**
(Meep's anisotropic effective-tensor average from fill-fraction + interface normal,
$\tilde\varepsilon^{-1}=P\langle\varepsilon^{-1}\rangle+(1-P)\langle\varepsilon\rangle^{-1}$)
restores clean 2nd-order convergence at staircased curved interfaces and lets geometry
vary continuously sub-cell — shipped as a **v1.x accuracy upgrade** and a citable
convergence-order golden (staircase ~1st order → smoothed ~2nd order, § 8.10).

### 3.8 Substepping vs render rate

CW sources need **13 000–70 000 steps** to reach steady state; rendering every step would
take minutes. Decouple: run **N FDTD substeps per rendered frame** (N a "simulation
speed" slider), present once at 60 fps → steady state in seconds while the display stays
smooth. Each substep stays CFL-stable; smoothness comes from the fixed present, not from N.

---

## 4. Analytic & reference goldens (calculation-validation anchors)

FDTD-for-optics is **unusually rich in closed-form goldens** — the sim's headline
verification asset. Every entry below is a named source with a concrete number; all are
2D-feasible unless flagged 3D. Goldens marked **grid-independent** tighten as $\Delta x\to0$
(a built-in convergence test), unlike the discretization-limited scattering gates.

| # | Golden | Exact reference value | Source | Role |
|---|---|---|---|---|
| A | **Fresnel reflectance** (air $n{=}1$ → glass $n{=}1.5$, normal) | $R=\big(\tfrac{n_1-n_2}{n_1+n_2}\big)^2=$ **0.04 exactly**; $T=1{-}R$ | Bohren/Wikipedia Fresnel | **primary** — grid-independent |
| B | **Brewster angle** | $\theta_B=\arctan(n_2/n_1)=$ **56.31°** ($R_p\to0$) | Fresnel | polarization (p ↔ TMz) |
| C | **Critical angle / TIR** (glass→air) | $\theta_c=\arcsin(1/1.5)=$ **41.81°**; $R{=}1$ above | Snell | evanescent + TIR |
| D | **Grating equation** (1000 ln/mm, 500 nm, m=1) | $\sin\theta_1=0.5\Rightarrow$ **30.00° exact**; discrete order count | Wikipedia diffraction grating | Bloch/periodic gate |
| E | **2D-cylinder Mie** (TM/TE, dielectric rod) | $Q_{sca},Q_{ext}$ from Bessel/Hankel series (B&H Ch. 8) — **generate + commit own table** (x=1,3,5,10; m=1.5,1.33) | Bohren & Huffman Ch. 8 | **primary 2D scattering** — TF/SF (§ 3.5) |
| E′ | **3D-sphere Mie** (Tier-1 anchor) | r=0.525 µm, λ=632.8 nm ⇒ **x=5.21282** (not "5.213" if quoting 6 figures), m=1.55 → **$Q_{ext}{=}Q_{sca}{=}3.10543$** (lossless ⇒ ext≡sca self-check; independently recomputed v0.2, 3.105426); x=100, m=1.5−1i → $Q_{ext}{=}2.097502$, $Q_{sca}{=}1.283697$. **SIGN-CONVENTION TRAP (hit live during v0.2 verification):** Wiscombe's $m=1.5-1i$ is the $e^{+i\omega t}$ convention; under B&H's $e^{-i\omega t}$ use $m=1.5+1i$ or the "absorber" becomes gain and $Q_{sca}$ blows up | Wiscombe MIEV0 / miepython | trust-anchor for Bessel/Hankel code |
| F | **Slab-waveguide mode** (220 nm Si n=3.48 in SiO₂ n=1.44, 1.525 µm) | **$n_{\rm eff}({\rm TE_0})=2.8632$** (recomputed v0.2 via brentq on $u\tan u=\sqrt{V^2-u^2}$, V=1.4358, single-moded). **Polarization-specific: TM₀ of the same slab is 2.083** — a golden *pair* that itself demos polarization. 1-D slab, NOT the SOI strip (~2.4) | BYU ECE360 §7.3 / Fosco | waveguide dispersion + TE/TM split |
| G | **2D photonic bandgap** (square rods ε=12, r=0.2a) | **TM gap 0.283–0.419** ($ωa/2πc$; MPB 0.282623–0.419335, 38.9%) | MPB tutorial | Bloch band sweep + Harminv |
| H | **Surface-plasmon dispersion** (Drude interface) | $k_{spp}=k_0\sqrt{\varepsilon_m\varepsilon_d/(\varepsilon_m{+}\varepsilon_d)}$; asymptote **$\omega_{sp}=\omega_p/\sqrt2$** (vacuum) | Maier *Plasmonics* | plasmonics (§ 8.4) |
| I | **AR coating** (MgF₂ n=1.38 QW on glass 1.52) | **R = 1.26%** (vs 4.26% bare); transfer-matrix | Byrnes `tmm` / PVEducation | thin-film / dispersion |
| J | **Energy conservation** | **$R+T+A=1$** (lossless: $A{=}0\Rightarrow R{+}T{=}1$) | Meep flux tutorials | **reference-free self-check** |
| K | **Numerical-dispersion relation** | $\tilde c_p(\theta)$ vs the § 3.7 master relation | Schneider uFDTD | discretization correctness |
| L | **Fabry-Perot** (mirror R=0.9) | finesse $\mathcal F=\pi\sqrt R/(1-R)=$ **29.80**; FSR $=c/2nL$ | RP Photonics | resonator (stretch) |
| M | **Phased-array steering angle** (v0.2) | $\theta_0=\arcsin\!\big(\Delta\phi\,\lambda/2\pi d\big)$ — exact, free with the § 5.5 preset 10 | any antenna text (array factor) | multi-source phase (grid-independent) |

**Reference generators (offline, committed):** `miepython`/`scattnlay` for the Mie
trust-anchor; a self-authored Bessel/Hankel cylinder-Mie routine (cross-checked against
the sphere table); Steven Byrnes' `tmm` (MIT) for thin-film R/T; MPB for the photonic
bandgap; a Newton/bisection root for the slab-waveguide $n_{\rm eff}$. Meep's published
FDTD-vs-analytic floor — **2.2% at resolution 20, 1.5% at resolution 25** (Mie tutorial
with subpixel smoothing; corrected v0.2 from a blanket "~1–2%", and note it is a Mie
number, no comparably quantified Fresnel benchmark exists in the Meep docs) — sets the
realistic tolerance. Gate on a measured band, never bit-agreement (§ 6, § 9). All 15
goldens in this section were **independently recomputed during the v0.2 verify pass**
(own Mie code, brentq slab root, closed forms) — every value confirmed.

---

## 5. Web surface — visualization & interaction

House four-layer structure (RENDER / INTERACT / EXPLAIN / PROVE), matching the landed
heat-equation / schrödinger-smoke / signal-workbench demos.

### 5.1 RENDER — legible in < 5 s, many effects in ONE budget

All field-space layers composite in **one uber-pass** reading each field once
(heat-equation's budget pattern), uniform-branch toggles, half-res mip bloom. The § 11
bandwidth math says the FDTD stencil is the *only* expensive thing on a discrete GPU
(~10–30% of frame) — **the entire effects stack below rides in the remainder**, which
is what makes the "many effects at once" ambition realistic. Cost tags: *cheap* = one
fragment shader over the field buffer; *moderate* = extra accumulator/reduction;
*expensive* = multi-pass/iterative.

**Colormap triple (one per field kind — Moreland discipline):** signed instantaneous
field → **Moreland cool-warm diverging** (perceptually linear, near-white at zero, the
ParaView default; committed 257-entry LUT); unsigned amplitude/energy → sequential
(viridis/inferno-class); phase → cyclic hue wheel. Never a rainbow on signed data.

- **Signed E-field, cool-warm diverging (white=0)** — *cheap*, the mesmerizing
  "living wave," Falstad's core render. **Ship first.**
- **Amplitude + phase via running-DFT phasors** — *moderate*, and the load-bearing
  accumulator for three other layers: per cell accumulate
  $\mathrm{Re}\mathrel{+}=E_z\cos\omega t,\ \mathrm{Im}\mathrel{+}=E_z\sin\omega t$
  during stepping (the standard practice in Meep/OptiFDTD — one wave period suffices at
  steady state); amplitude $=\sqrt{Re^2+Im^2}$, phase $=\operatorname{atan2}$. The
  per-substep $\cos\omega t/\sin\omega t$ are **uniforms computed JS-f64** (per step,
  not per cell) — which neatly sidesteps the WGSL 2⁻¹¹ trig hazard (§ 9). Feeds:
  **domain coloring** (hue=phase, brightness=amplitude — the classic gorgeous CW
  steady-state EM image), time-averaged $\langle\mathbf S\rangle$ for the flow layers,
  and the isophase contours. Cost ≈ 8 B/cell/substep, or accumulate every Nth substep.
- **Animated isophase contours** — *cheap* once phasors exist:
  `fract(phase·N)` + `fwidth` line pass (the heat-equation fwidth-isoline pattern);
  contours **march outward at the phase velocity** — wavefronts made visible.
- **Log-scaled energy density / time-avg intensity** ($u=\tfrac12\varepsilon E^2+\tfrac12\mu H^2$;
  $\langle S\rangle=\tfrac12\mathrm{Re}[\mathbf E\times\mathbf H^*]$ from the phasors) —
  *moderate*; **log scaling + auto-exposure essential** for plasmonic hot spots (near
  fields span ~3 orders of magnitude).
- **Schlieren / shadowgraph layer** — *cheap* (v0.2 addition): intensity ∝
  $|\nabla(\text{field})|$ with directional knife-edge tinting via central
  differences/`fwidth` over $E_z$ **and the ε-map** — the "photograph of invisible
  physics" look; dielectric objects shimmer where waves cross them. One uber-pass
  branch, nearly free, physically grounded (Gladstone–Dale).
- **Poynting energy flow — two-tier (v0.2 rework):** (1) **advected-noise flow map**
  (*moderate, the default*): semi-Lagrangian ping-pong texture advected by
  $\langle\mathbf S\rangle$ with noise re-injection and previous-frame fade — the
  windy.com/Mapbox-wind technique, ~1/10 the cost of true LIC and visually near-identical
  to the MIT-TEAL DLIC look (Belcher–Koleci; Sundquist DLIC). (2) **True animated LIC**
  (*expensive*, v1.x expert toggle): ~32-tap streamline convolution — <1 ms at 512²,
  affordable, but tier-2 because the flow map already delivers the look. Advect by
  **time-averaged** $\langle\mathbf S\rangle$, not instantaneous $\mathbf S$ (which
  oscillates at 2ω and jitters).
- **Photon-tracer particles** — *moderate* (v0.2 addition): 100k–500k bright sparks
  advected by $\langle\mathbf S\rangle$, respawned at sources weighted by emitted power,
  trail-faded via previous-frame dim. Strong precedent: 1M-particle advection at 60 fps
  was routine even in WebGL (Mapbox wind); storage-buffer WebGPU makes it trivial —
  one compute + one draw, a fraction of one FDTD substep. **The signature "light as a
  flow" visual**, and it composites over every other layer.
- **3D height-field view** — *moderate* (v0.2 addition): Falstad's beloved "3D" toggle,
  modernized — static grid mesh, vertex displacement by $E_z$ (vertex texture fetch),
  screen-space normals from derivatives, specular lighting: interference patterns
  become rippling glass. One extra draw of a static mesh; pairs beautifully with the
  lens/double-slit presets.
- **HDR bloom + tone-map** — *moderate*: composite emissive energy view into
  **rgba16float** → thresholded bright-pass → **mip-chain blur** (13-tap down / 9-tap
  tent up, the CoD-style modern default; dual-Kawase is the cheaper alternative) →
  additive → **ACES** (its highlight shoulder beats Reinhard under bloom). ~6–8 passes
  over shrinking targets, well under 1 ms at 1024². Resonances and focal spots
  literally bleed light — and an FDTD lens produces **real caustics from the physics**,
  so the render job is just letting them blaze.
- **Material-index underlay** — $n(x,y)$ as a subtle grayscale/contour beneath the field,
  with source / PML / monitor markers — *cheap*, huge legibility win. Include
  wifi-solver's **outline/fill/hide toggles** so the field reads through geometry.
- **Envelope / peak-hold view** — *cheap* (v0.2, from heaviside): exponential-moving-max
  of $|E_z|$ in the step kernel — makes standing-wave patterns pop from CW sources
  without waiting for the DFT to converge.
- **Live T(λ)/R(λ) spectra plot** — DFT on flux-monitor lines, normalized to an incident
  run — *moderate*; makes it feel like a **real instrument** (à la Meep/Lumerical).

### 5.2 INTERACT

The gold-standard loop (Falstad, PhET): **drag the source + paint materials + live-slider
the wavelength, everything recomputing in real time.** Falstad's ripple tank (~60 named
presets, mouse-drawn walls/media, per-source phase, movable probes, 3D view) is the bar
to clear. Ranked by wow-per-effort (v0.2 re-ranked after the prior-art feature
inventory):

1. **Drag to place/move the source** — trivial, huge delight.
2. **Paint materials with the mouse** — brush $\varepsilon_r$, $\sigma$, metal into the
   material buffer to build slits, lenses, prisms, mirrors, waveguides live (zero solver
   cost) — cheap, enormous payoff.
3. **Multi-source with per-source phase + a phased-array preset** (v0.2 addition) —
   drag a phase slider and **watch the beam steer**: arguably the single most "wow"
   interactive EM demo, and it is *free* (source injection already parameterizes
   amplitude/phase, § 6.2's JS-f64 loading protocol). Falstad ships phased arrays;
   ours steers in real time with real units.
4. **Live wavelength/frequency slider** — diffraction/refraction/resonance shift
   continuously.
5. **Draggable oscilloscope probes** (v0.2 addition, signal-workbench DNA) — click-drop
   probes that plot $E_z(t)$ and its **live spectrum** at that point (GPU ring-buffer →
   the repo's Stockham FFT); PhET's lesson is that **draggable measurement tools create
   the "I'm doing science" feeling**. Pairs with the PROVE layer: park a probe behind
   the slab and watch the Fresnel number converge.
6. **Preset scenes** (§ 5.5) — one-click load a material buffer; **`?preset=` boot
   param** (landed signal-workbench pattern) so every scene is a shareable URL; encode
   slider state too (efs-style full-scene URL sharing).
7. **Image-import as refractive-index map** (v0.2 addition, from huj31415/wave-webgpu) —
   draw a lens in any paint app, drop the PNG on the sim, luminance → $n(x,y)$.
   Cheapest possible "bring your own scene" and a natural social-share hook.
8. **Click-drop a dipole/point emitter**; **source-angle slider** (Brewster / TIR set
   pieces).
9. **Stamp a photonic-crystal lattice** — watch a bandgap open (pairs with the live
   spectra plot).
10. **Tune a metal's plasma frequency $\omega_p$** — mirrors become plasmonic
    resonators, hot spots light up (pairs with log-intensity + bloom) — highest physics
    wow, needs the dispersive update (§ 8.4).
11. **Challenge scenes** (v1.x stretch, from the optics-puzzle genre: route the beam to
    a goal through paintable materials — turns the sandbox into a game for zero solver
    cost; a "goal region" is just a flux monitor with a target threshold).
12. Rewind / time-scrub / pause (state snapshots).

Plus: expert-drawer sliders for grid resolution, $S_c$, N-substeps, PML thickness;
material presets (vacuum, glass, silicon, gold, silver, water); **instantaneous-field ⇄
time-averaged-power master toggle** (wifi-solver's best idea: waves for wow, power for
meaning) — it's just a colormap/source switch over layers § 5.1 already computes.

### 5.3 EXPLAIN

- What Maxwell's equations are; the Yee staggering picture; TMz vs TEz ↔ p/s
  polarization; normalized units; the CFL cliff; numerical dispersion (why an
  under-resolved wave goes square-ish).
- All **five honesty disclosures** (§ 1.1) verbatim.
- **Snell/Fresnel set piece** (goldens A–C): sweep the incidence angle, watch the
  reflected fraction trace the Fresnel curve, hit $R_p{=}0$ at Brewster and $R{=}1$ at
  the critical angle.

### 5.4 PROVE

- **Live analytic-match panel:** the f32 GPU run vs the closed-form golden for the current
  scene — Fresnel $R(\theta)$, the grating diffraction angle, the 2D-Mie cross-section vs
  the committed Bessel/Hankel table — with %-error read out live.
- **Live spectrum panel:** T(λ)/R(λ)/A(λ) from the DFT monitors, with **$R+T+A=1$**
  (golden J) displayed as the reference-free conservation check.
- **Matched-pair panel:** the f32 GPU field vs the f64 JS/NumPy reference on a fixed short
  scenario, pointwise error over time (gate G-matched, § 6).
- **Numerical-dispersion lens:** measured $\tilde c_p(\theta)$ dots dropped onto the § 3.7
  master curve (golden K) — the discretization made visible.
- **Comparison mode:** TMz|TEz, or Mur|CPML, or resolution-A|resolution-B side by side.

### 5.5 Showcase presets (ranked; each is a live-field scene with a golden)

1. **Double-slit interference** *(v1 core — cheapest, most iconic).* Plane wave → barrier
   with two gaps → the interference fan forms live. Highest visual-payoff-per-line.
2. **Refraction at a dielectric interface (Snell)** *(v1 core).* Straight wavefronts kink
   and compress across the boundary with a partial reflection — golden A–C.
3. **Cylinder scattering (Mie, TF/SF)** *(v1 core).* Flat wavefront sheds concentric
   scattered rings off a rod — the money-shot wavefront motion; golden E.
4. **Dielectric lens focusing** *(v1 core).* Wavefronts curve and collapse to a bright
   focal spot (plain curved-$\varepsilon$ lens = 90% of the visual for a fraction of a
   metalens's cost).
5. **Diffraction grating** *(v1.x).* Wave fans into discrete ordered beams at the golden-D
   angles.
6. **Bent waveguide** *(v1.x).* Guided mode rounds a 90° bend with visible corner
   radiation — the Meep-iconic clip; golden F for the mode.
7. **Total-internal-reflection + frustrated-TIR** *(v1.x).* Full reflection above the
   critical angle + the evanescent skin coupling across a nearby gap.
8. **Photonic-crystal bandgap / 90° PhC bend** *(v1.x).* Light blocked in-gap vs snaking
   around a hard corner; golden G + the live spectrum.
9. **Plasmonic hot spot** *(v1.x — the dispersive showpiece).* Painted gold nanoparticles;
   sub-wavelength field enhancement in the gap, log-intensity + bloom; golden H anchors
   the resonance.
10. **Phased-array beam steering** *(v1 core — v0.2 addition, near-zero cost).* A line
    of point sources with a live per-source phase-gradient slider; the beam swings
    across the domain in real time. The array factor
    $\theta_0=\arcsin(\Delta\phi\,\lambda/2\pi d)$ is a **free analytic golden** for
    the PROVE panel.
11. **Anti-reflective coating** *(v1.x).* Toggle the MgF₂ quarter-wave layer on/off and
    watch the reflected beam dim from 4.26% to 1.26% (golden I) live on the flux
    monitor — Falstad ships this scene; ours has the number.
12. **Doppler / moving-source** *(v1.x stretch).* Source dragged at constant speed;
    wavefront compression live. Qualitative only (no golden claimed — source motion on
    a fixed grid has its own artifacts; EXPLAIN discloses).

**Preset gallery is the front door** (Falstad's Example menu is why it's sticky):
target **≥12 curated scenes at v1** across cores + set pieces, each with its golden
readout wired to the PROVE panel, each a `?preset=` shareable URL.

### 5.6 Acoustic layer (stretch — the sonification hook)

Light has no sound, but the **spectrum is audible**: map a swept-wavelength scan or a
resonator's mode spectrum to pitch (reusing `packages/signal-workbench/web/src/audio.ts`).
Optional, clearly labeled as sonification-of-data (not physical acoustics); ships behind
the same f32-trig-synthesis guard as signal-workbench (audio math stays in JS-f64).

### 5.7 Effects budget (v0.2 — the "many effects at once" architecture)

The § 11 bandwidth analysis makes the frame plan explicit. Per rendered frame at the
default tier (512², 16 substeps):

| Stage | Passes | Cost class |
|---|---|---|
| FDTD substeps (E+H+PML+ADE+source+DFT accum) | 16 × ~4 dispatches | **the budget** — the only iGPU-limited stage |
| Uber-composite (field + underlay + schlieren + isophase + envelope) | 1 | one read of each field, uniform branches |
| Advected-noise flow map | 2 (advect + inject) | small ping-pong texture |
| Photon tracers (100k–500k) | 1 compute + 1 draw | fraction of one substep |
| 3D height view (when toggled, replaces uber-quad) | 1 draw | static mesh + VTF |
| Bloom chain + ACES | ~6–8 shrinking | <1 ms |
| Probe readback / spectra | async | off the critical path |

**Rules:** (1) every field-space effect lives in the ONE uber-pass — adding a layer
adds a uniform branch, never a full-res pass; (2) the DFT/⟨S⟩ accumulators are shared
plumbing — domain coloring, isophase, flow map, tracers, and the PROVE spectra all
feed off the same two phasor buffers, so the marginal cost of each additional effect
is near zero; (3) the **adaptive substep controller** (§ 11) sheds N, never effects —
on an iGPU the sim slows down but never stops being gorgeous; (4) effect toggles
default ON for the landing loop (poster/loop generator captures the full stack) with
a "minimal" view for the PROVE screenshots.

---

## 6. Verification gates

### 6.1 Gate philosophy — a NEW tolerance category (`fdtd-optics`)

A browser-native **f32** solver cannot match a reference to machine precision (§ 9), and —
better than most sims — it doesn't need to: FDTD-for-optics gates against **closed-form
analytic answers**. New tolerance category (same route as the repo's other
new-category gates — cf. pic-flip `picflip-observable`, phase-field-fracture):

| Gate | Criterion | Declared target (MEASURE at build) |
|---|---|---|
| G-fresnel | Reflectance $R(\theta)$ vs analytic Fresnel (s & p) on a flat interface | within **±2%** (Meep's Mie floor: 2.2% @ res 20 / 1.5% @ res 25); normal-incidence $R{=}0.04$ |
| G-brewster | $R_p$ minimum angle | **56.3° ± 1°**; $R_p<$ ε at min |
| G-critical | Onset of total internal reflection | $\theta_c=$ **41.8° ± 1°**; $R\to1$ above |
| G-grating | 1st-order diffraction angle + propagating-order count | **30.0° ± 1°**; correct order count |
| G-mie2d | 2D-cylinder $Q_{sca}/Q_{ext}$ vs committed Bessel/Hankel table (TM & TE) | band declared at build (target ≤ ~3–5%, res-dependent) |
| G-selfconsist | Lossless Mie ext≡sca; $R{+}T{+}A=1$ | within accumulated-flux tolerance |
| G-dispersion | Measured $\tilde c_p(\theta)$ vs § 3.7 master relation | ~10⁻³ relative |
| G-stability | No NaN/energy-blow-up over the gated run at $S_c{=}0.5$ | zero blow-ups |
| G-matched | f32 GPU vs f64 reference, pointwise on a fixed short scene | **declared after the § 13 spike** |
| G-runtwice | Byte-identical re-run (determinism) | 0 ULP diff |
| G-conv (v1.x) | Convergence order: staircase ~1st → subpixel ~2nd (§ 3.7) | monotone order improvement |

### 6.2 The `new_canonical` deploy gate

Follows the landed pattern (heat-equation / signal-workbench / phase-field-fracture):
capture the uniforms pack from **committed IC params** (never live UI state); snapshot the
IC **before** the mutating step loop; run-twice byte-identity; live analytic + f64
reference re-run on the gated scenario. Loading-protocol values (source amplitude/phase)
computed JS-f64 → dynamic-offset uniform.

### 6.3 Rigor disclosure gate

An audit check that the five § 1.1 disclosures (not-first-browser-FDTD-*including the
v0.2 middle band: efs / wifi-solver / heaviside*; visualizer-not-metrology;
PML-two-failure-modes; 2D-single-polarization; Kerr $n_2$ Boyd-intensity convention)
are present in the shipped EXPLAIN copy. The honesty is contractual, not optional.

---

## 7. Golden tables (offline-generated, committed)

- **§ 7.A–D, I, L** — analytic closed forms (Fresnel s/p vs angle; Brewster/critical;
  grating orders; MgF₂ AR-coating R(λ) via `tmm`; Fabry-Perot finesse) — recomputed, not
  digitized, so each is exact to reference precision.
- **§ 7.E/E′** — committed **cylinder-Mie** $Q$ table (self-authored Bessel/Hankel,
  cross-checked vs `miepython`/`scattnlay`), anchored by the 3D Wiscombe MIEV0 sphere
  table (ext≡sca self-check) proving the special-function code.
- **§ 7.F** — slab-waveguide $n_{\rm eff}$ transcendental-root table (Newton/bisection).
- **§ 7.G** — MPB photonic-bandgap band-edge table (0.283–0.419).
- **§ 7.H** — f64 reference short-scenario capture (matched-pair anchor) — committed
  **PLAIN, not LFS** (per repo trap).
- **§ 7.K** — numerical-dispersion $\tilde c_p(\theta;S_c,N_\lambda)$ reference curve,
  regenerated from the § 3.7 master relation for the shipped $S_c$.

Cat-3 discipline: ≥3 DISTINCT independent-reference sources per gate family (analytic
recompute / second-implementation cross-check / published tabulated value).

---

## 8. Model palette / full feature envelope

Everything FDTD-for-optics can do, with Tier-0 feasibility. See § 10 for the shipping
order. **Four v1 material features carry the realism-per-cost** (single Drude pole ⭐,
single Lorentz pole, diagonal anisotropy ⭐, Kerr χ³ ⭐).

### 8.1 Boundaries & sources (v1 core + hardened) — see § 3.4 / § 3.5.

### 8.2 Simple media (v1 core, free)
Non-dispersive $\varepsilon_r$ (scalar); lossy $\sigma$ / magnetic loss $\sigma^*$ (two
precomputed damping coefficients, Luebbers); PEC (boolean mask). Zero extra time-stepped
arrays.

### 8.3 Frequency-dispersive media via ADE (v1 core — the "makes optics real" feature)
Meep unified permittivity
$\varepsilon(\omega)=\big(1+\tfrac{i\sigma_D}{\omega}\big)\big[\varepsilon_\infty+\sum_n\tfrac{\sigma_n\omega_n^2}{\omega_n^2-\omega^2-i\omega\gamma_n}\big]$.
Carried in the time domain by **auxiliary differential equations** (ADE recommended over
recursive convolution — transparent, composes with nonlinear/anisotropic, maps to a
compute pass), $\mathbf D=\varepsilon_\infty\mathbf E+\sum\mathbf P$:
- **Single Drude pole** (free-electron metals; ADE current
  $J^{n+1}=kJ^n+\beta(E^{n+1}{+}E^n)$ with — pinned v0.2, standard semi-implicit form —
  $k=\tfrac{1-\gamma\Delta t/2}{1+\gamma\Delta t/2}$,
  $\beta=\tfrac{\varepsilon_0\omega_p^2\Delta t/2}{1+\gamma\Delta t/2}$; the $E^{n+1}$
  on the RHS is substituted into Ampère's law and solved linearly — still explicit
  overall, and this exact averaging is what preserves the vacuum CFL, § 3.3)
  — **+1 buffer**, cheap, delivers real silver/gold plasmonics. **v1 ⭐** (highest
  value-to-cost in the catalogue).
- **Single Lorentz pole** (bound-electron/dielectric resonance; 3-level ADE recursion
  needs $P$ and $P^{n-1}$) — **+2 buffers**. **v1.**
- **Multi-pole Drude-Lorentz** (quantitative Rakić 1998 fits: Au $\omega_p{=}9.03$ eV,
  $f_0{=}0.76$, $\Gamma_0{=}0.053$ eV; Ag $\omega_p{=}9.01$ eV, $f_0{=}0.845$; Al
  $\omega_p{=}14.98$ eV — verified v0.2 against the LD.m/refractiveindex.info fit
  tables) — pack poles into `vec4`, **stability-gate each pole**
  (von-Neumann/Routh-Hurwitz). **v1.x.** A single Drude pole captures Ag/Au
  qualitatively; 1 Drude + 1–2 Lorentz is quantitative across 400–1000 nm.
  **BUG-IN-WAITING (v0.2):** in the Rakić LD model the Drude term is weighted by
  $f_0$ — a **bare** single-Drude material must use the *effective* plasma frequency
  $\sqrt{f_0}\,\omega_p$ (Au: $\sqrt{0.76}\cdot9.03\approx7.87$ eV; Ag:
  $\sqrt{0.845}\cdot9.01\approx8.28$ eV), NOT the headline $\omega_p$ — else the v1
  gold preset is wrong by ~15% in $\omega_p$ and the LSPR golden misses.

### 8.4 Plasmonics (v1.x — reuses § 8.3 Drude)
Surface plasmon polaritons (golden H), nanoparticle LSPR (Fröhlich
$\varepsilon_m=-2\varepsilon_d$ sphere / $-\varepsilon_d$ cylinder — **pick the golden
for the dimensionality**; the cylinder condition verified v0.2 via the exact 2D
polarizability pole $\alpha\propto(\varepsilon-\varepsilon_d)/(\varepsilon+\varepsilon_d)$,
equivalently depolarization $L{=}1/2$ transverse vs sphere $L{=}1/3$ — and it holds for
**E perpendicular to the cylinder axis**, so in our 2D convention it is the **TEz**
scene; TMz E-along-axis has no such resonance), bowtie/dimer **hot spots** (10²–10³×
field enhancement, the flagship dramatic visual). Note: plasmon scenes need the
**adiabatic absorber**, not PML (§ 3.4).

### 8.5 Anisotropy (v1 core + v1.x)
- **Diagonal (axis-aligned) anisotropy** — replace scalar $1/\varepsilon_r$ with a
  `vec3`; birefringence / waveplates fall out. **v1 ⭐** (highest value/lowest cost of
  all — a `vec3` swap). Calcite $n_o{=}1.658$, $n_e{=}1.486$.
- **Full off-diagonal tensor** — store 6-float symmetric $\varepsilon^{-1}$, 3×3 matvec +
  Yee-edge averaging. **v1.x** (Werner–Cary stability).
- **Gyrotropic / Faraday** (magneto-optic, nonreciprocal isolators) — Lorentz $P$ +
  precession $\mathbf b\times\mathbf P$. **v1.x, f32-precision-gated** (small accumulated
  rotation over many wavelengths; near-singular at resonance).

### 8.6 Nonlinear optics (v1 flagship + v1.x)
Architectural key: **all instantaneous nonlinearity lives in the local, algebraic D→E
inversion** — no neighbor data, no new field array, embarrassingly parallel.
- **Instantaneous Kerr χ³** ($\mathbf D=(\varepsilon+\chi^{(3)}|\mathbf E|^2)\mathbf E$;
  self-focusing, spatial solitons, self-phase modulation). Meep ships a **branch-free
  Padé factor** — verified v0.2 **verbatim in `src/step_generic.cpp`**
  (`c2 = Di·chi2·chi1inv²; c3 = Dsqr·chi3·chi1inv³; return (1+c2+2c3)/(1+2c2+3c3)`,
  with the in-source comment that it replaces solving a cubic), $E=\chi_1^{-1}fD$ —
  ~6 FLOPs, **zero extra buffers**, GPU-ideal. **v1 ⭐.** f32 tip: solve for the
  perturbation $\delta E$. **CONVENTION TRAP (honesty #5), pinned v0.2:** ship
  **Boyd's intensity convention** $n_2=3\chi^{(3)}/(4n_0^2\varepsilon_0 c)$ [SI];
  Meep's documented $n_2=3\chi^{(3)}/(4n_0^2)$ is *the same convention* with
  $\varepsilon_0 c\to1$ in normalized units (Meep's own docs warn the literature
  conflicts). The $3\chi^{(3)}/(8n_0)$-family numbers belong to the **field**
  convention ($\Delta n=n_2|E|^2$) — do not mix; the gate golden states its
  convention inline.
- **χ² second-harmonic generation** — shares the Padé factor (update free); needs a poled
  grating (QPM/PPLN) + a spectrum panel (2ω sits far below the pump → f32 dynamic-range
  stress). **v1.x.**
- **Nonlinear Lorentz / temporal solitons** — **v1.x stretch**; Raman / filamentation —
  **research-tier.**
- **Stability:** CFL is necessary but not sufficient under nonlinearity (self-focusing
  genuinely collapses; strong χ³ → modulation instability). Safeguards: conservative
  Courant, χ³ slider soft-capped to the visible-stable band, an intensity clamp doubling
  as an f32 blow-up guard.

### 8.7 Dimensionality
2D TMz (v1 core) → 2D TEz (v1, the other polarization) → **full 3D vector** (Tier-1 — the
polarization physics that distinguishes EM from scalar waves; 2× buffers, third dispatch
axis, same kernel).

### 8.8 Exotics (v1.x / research)
Graphene intraband tunable-plasmon sheet (surface current on a plane, μ_c slider — killer
interactive; **v1.x**); negative-index metamaterial (Drude ε + Lorentz μ; **v1.x**);
time-varying media ε(t) (photonic time crystal — march **D** not E, zero new buffers,
eye-catching; **v1.x**); gain/lasing (Maxwell-Bloch 4-level — stiff, f32-hostile positive
feedback, **research-tier defer-with-cause**); PT-symmetric / chiral-bianisotropic
(**research**).

### 8.9 Frequency-domain observables (v1.x)
Near-to-far-field transform (radiation patterns, RCS), Harminv-style Q-extraction
(ring/microdisk resonators — golden L / Bessel-Hankel WGM), S-parameters, mode
decomposition.

### 8.10 Subpixel smoothing (v1.x accuracy moat) — see § 3.7.

---

## 9. f32 precision analysis (FAVORABLE — the inverse of phase-field-fracture)

Where phase-field-fracture had a genuine f32 crux ($G_c/\ell$ six decades below $E$), FDTD
is the **easy case**, which de-risks the whole build:

- **Production GPU FDTD already runs f32 (verified v0.2 — the strongest form of the
  argument):** **Tidy3D's default precision is single** (`'auto'` = single unless the
  scene contains a good conductor, documented as "practically sufficient in almost all
  cases"); **Meep offers `--enable-single`** documented as a significant speedup "often
  without any loss in simulation accuracy." Our f32 posture matches the frontier codes'
  own defaults, not a compromise.
- **The mechanism (heuristic — stated as such):** the leapfrog is non-dissipative /
  energy-conserving (symplectic-like), so round-off plausibly accumulates as a
  **random walk $\propto\sqrt{N}\cdot\varepsilon_{\rm mach}$** ≈
  $\sqrt{10^5}\cdot6\times10^{-8}\approx2\times10^{-5}$ over 100k steps — negligible
  for a visualizer. The v0.2 audit found **no primary citation** for this exact
  statement in the FDTD literature, so it ships as a heuristic backed by the
  production-default evidence above and is **measured directly by the § 13 spike**
  (f32-vs-f64 drift over 10⁴–10⁵ steps) rather than asserted.
- **The one mandatory move is normalization** ($c=\varepsilon_0=\mu_0=1$, impedance-
  normalized E; § 1). SI units in f32 waste the exponent ($\varepsilon_0\sim10^{-11}$,
  $c\sim10^8$) and erode the stability margin. **Never run SI.**
- **The narrow, known traps:** (a) don't sit exactly on the CFL limit — use $S_c{=}0.5$;
  (b) isolate small scattered fields with **TF/SF** for high-dynamic-range Mie / high-Q;
  (c) **Kahan-sum** the long accumulators (time-averaged intensity, DFT flux monitors);
  (d) avoid float `==` branches; (e) the **WGSL builtin-trig hazard** (Vulkan sin/cos only
  $2^{-11}$ accurate — the schrödinger-smoke/heat-equation finding) → **precompute source
  time-signature and DFT trig tables in f64**, upload as buffers.
- **No native f64 in WGSL** → gates are **measured tolerance / analytic-anchored, not
  bit-exact** (the repo's "numeric equivalence, not bytes" pattern). This is honesty
  boundary #2: the sim is a **verified visualizer**, and quantitative accuracy is
  disclaimed for extreme field concentration (>10⁷–10⁸ dynamic range).

---

## 10. Roadmap / shipping order

**v1 core (the shippable verified demo — RENDER/INTERACT lists expanded v0.2 per
owner steer "visually stunning + many effects"):**
2D TMz + TEz, normalized f32, $S_c{=}0.5$, 512² default (iGPU-comfortable) / 1024²
high (discrete tier) + N-substeps slider **with adaptive shedding** (§ 11);
Mur ABC → **CPML**; **TF/SF plane-wave** + soft dipole/line + Ricker/ramped-CW; on-the-fly
DFT monitors + **per-cell running-DFT phasors** (§ 5.1 shared plumbing); materials
{dielectric, loss, PEC, **single Drude, single Lorentz, diagonal anisotropy, Kerr χ³**};
gates {G-fresnel, G-brewster, G-critical, G-grating, G-mie2d, G-selfconsist,
G-dispersion, G-stability, G-matched, G-runtwice}; RENDER {signed-field cool-warm +
material underlay + schlieren + isophase contours + envelope view → domain coloring +
log-energy + bloom/ACES + advected-noise Poynting flow + photon tracers}; INTERACT
{drag-source, paint-materials, wavelength slider, **multi-source per-source phase
(phased-array steering)**, draggable oscilloscope probes, field⇄power master toggle,
`?preset=` shareable scenes}; presets {double-slit, Snell, cylinder-Mie, lens,
**phased-array**, … target ≥12 (§ 5.5)}.

**v1.x:** multi-pole Rakić metals, full-tensor + gyrotropic anisotropy, χ² SHG + spectrum
panel, plasmonic hot spots (adiabatic absorber), photonic-crystal bandgaps + Bloch bands,
waveguide modes + bent-waveguide, ring/microdisk Q (Harminv/Bessel-Hankel), near-to-far
radiation patterns/RCS, subpixel smoothing (convergence-order golden), true animated
Poynting LIC (expert toggle over the v1 flow map), 3D height-field view (stretch-into-v1
if budget allows — § 5.1; else first v1.x item, it's one static-mesh draw),
live T/R/A spectra, image-import index maps, challenge scenes,
dispersion-matched oblique TF/SF (Tan–Potter), tunable graphene sheet, negative-index
metamaterial, time-varying media, sonification layer.

**Stretch / research (defer-with-cause):** full 3D vector (Tier-1), gain/lasing
(Maxwell-Bloch), Raman/filamentation, metalenses, PT-symmetric media, adjoint inverse
design (the `common-em` + autodiff frontier, catalog § 14.5.2).

---

## 11. GPU optimization

- **Memory-bandwidth-bound** (arithmetic intensity ≈ 0.25 flops/byte, ~100× below what a
  modern GPU wants) → never ALU-bound; judge every optimization by global-memory-traffic-
  per-cell-per-step. Keep everything GPU-resident.
- **In-place leapfrog** (E, H in separate storage buffers, each update reads only the
  other → no ping-pong; half the footprint of a same-buffer CA).
- **Storage-buffer budget** (verified v0.2: Core default **8**; *requestable* up to 10
  on Chrome 120+ and up to 16 on Chrome 146 via `requiredLimits`; **Chrome 146 also
  shipped compat mode**, whose floor is **4**, so the low end is now a real audience) —
  **portable target 8**, opportunistically request more, keep a vec-interleaved
  fallback in mind for compat. Recommended 2D TMz layout: E buffer + H buffer
  (`vec2`=(Hx,Hy), read together in the E-update) + material/coefficient buffer + small
  uniform ≈ **3 storage + 1 uniform**, leaving headroom for the DFT phasor pair
  (§ 5.1), monitor + color-output buffers, and PML $\psi$ (interleave into `vec4`).
  Grid state in **storage (std430 tight)**, not uniform (std140 bloats arrays to 16 B).
- **Stencil:** start one-cell-per-thread coalesced (`@workgroup_size(16,16)`); workgroup
  shared-memory tiling is the classic bandwidth lever but for a 2D 5-point stencil at
  these sizes the win is modest (neighbors already L1/L2-resident) — tile only if
  profiling shows bandwidth starvation (tiling's big payoff is 3D/wide-radius). A
  cheaper bandwidth lever first: **quantized material index (u8/u16) + coefficient
  LUT** instead of full per-cell f32 coefficient fields.
- **Substepping** (§ 3.8): N substeps/frame; expose as a speed slider **plus an
  adaptive controller** (v0.2): shed N on sustained frame-time overrun, using the
  RAF-delta heuristic — do NOT build adaptive quality on `timestamp-query` (shipped in
  Chrome 121+ but quantized to 100 µs absent a dev flag; fine for a dev-HUD, wrong for
  production control).
- **Realistic budget (corrected v0.2 by bandwidth math):** per cell per substep the 2D
  TMz kernel moves ~40–60 B effective (3 fields + coefficients; neighbor reads mostly
  cache-resident). 2D CFL $S_c\le1/\sqrt2$ (use 0.5). **512² @ 16 substeps @ 60 fps ≈
  250 Mcell/s ≈ ~12 GB/s — comfortable on any iGPU: the shipping default.** 1024² @ 16
  ≈ 1 Gcell/s ≈ 40–60 GB/s — **at/above nominal integrated-GPU bandwidth (50–100 GB/s,
  ~half achievable in practice), so 1024² is the discrete-GPU "high" tier**, with the
  adaptive controller shedding substeps on iGPUs; 2048² is the discrete bandwidth
  ceiling. Calibrate real achievable GB/s on target hardware with the jrprice WebGPU
  bandwidth microbenchmark. Grounding: Meep CPU ~50 Mcells/s; gprMax CUDA 1194
  (Kepler) / 3405 (Pascal) Mcells/s; **efs self-reports 3000 Mcells/s for its WebGPU
  openEMS backend (3D)** — so ~1 Gcell/s browser 2D on discrete is credible. Ours
  would be the first *benchmarked-and-published* WebGPU-FDTD throughput figure
  (efs's README table is the only prior data point — v0.1's "no published WebGPU-FDTD
  throughput exists" is hereby corrected).
- **Effects stack is not the bottleneck:** everything in § 5.7 besides the stencil
  costs ≲2 ms combined at 1024² on discrete — the correct mental model is "one
  expensive physics stage + a dozen nearly-free composite layers" (§ 5.7 rules).

---

## 12. Repo reuse posture

- **f64 reference pattern** — mirror `packages/heat-equation/web/src/heat64.mjs` /
  `packages/schrodinger-smoke/web/src/isf64.mjs`: a committed JS-f64 (or NumPy) Yee
  solver on the gated short scenario, matched-pair against the f32 GPU run (G-matched).
- **WGSL core + house four-layer** — mirror the landed structure
  (`packages/heat-equation/web/src/heat_core.wgsl`, `render.wgsl`, `solver.ts`,
  `scenes.ts`, `capture.ts`, `verify-panel.ts`, `explain.ts`).
- **DFT / spectra** — reuse the Stockham radix-2 WGSL FFT already shipped for
  schrödinger-smoke / heat-equation for the on-the-fly monitor spectra and any
  frequency-domain observable (§ 8.9); precompute trig tables in f64 (§ 9).
- **Sonification (stretch)** — `packages/signal-workbench/web/src/audio.ts`.
- **Decoupled from `common-em`** — ships standalone; is the natural Maxwell-solver nucleus
  of `common-em` when the EM cluster lands (status-block relationship note). Does **not**
  depend on `common-fem`/`common-mesh`.
- **Boot/harness plumbing (v0.2, names pinned from landed code):** `?preset=` boot
  query param (signal-workbench pattern) extended to encode slider state for
  efs-style shareable scenes; `__bitPhysicsReady` global for the validate/poster
  harness (heat-equation `packages/heat-equation/web/src/main.ts` pattern);
  generator `cfg.query`/`cfg.hide` for the landing-loop capture.
- **Landing tile + poster/loop + web-deploy** — follow the landed add-a-sim checklist
  (hardcoded `index.html` card + make-posters/make-loops SIMS entry + check-links SIMS
  mirror + `EXPECTED_SIMS` in the web-deploy smoke test; assets committed PLAIN not LFS).
- **Landing checklist (v0.2, from the repo-consistency audit — so execution doesn't
  rediscover it):** add `[defaults.fdtd-optics]` (measured relative/absolute) to
  `tools/testkit/equivalence/tolerance.toml` + the matching budget row in
  `tools/testkit/equivalence/tolerance-budget.toml`, both with measured-then-declared
  provenance comments; `packages/fdtd-optics/web/src/capture.ts` per the new_canonical
  pattern; committed golden tables (Fresnel R(θ) s/p, cylinder+sphere Mie Q, grating
  orders, slab n_eff TE₀/TM₀ pair, ≥3 distinct anchors per family); the sibling
  `algebraic.md` / `determinism.md` / `equivalence.md` when the family matures past
  spec-ref-only; perf-ledger row at first landing. Cat-4/`integrity --all` citation
  discipline: full-repo-root paths in backtick citations, run `integrity --all`
  before pushing (the Cat-4 pre-commit scope gap).

---

## 13. Open decisions & recommended first action

1. **Discretization + f32 confidence spike (recommended first action — LOW risk here).**
   Unlike phase-field-fracture, the f32 story is favorable (§ 9), so the spike is
   *confirmatory, not make-or-break*: a throwaway 1D/2D Yee FDTD + JS-f64 reference that
   (a) verifies **normalized-unit f32 reproduces the Fresnel $R=0.04$ golden** to ~1–2%,
   (b) measures the run-twice determinism and f32-vs-f64 drift over 10⁴–10⁵ steps to set
   G-matched (this also converts the § 9 random-walk heuristic into a measured claim),
   (c) validates the **TF/SF 1-D auxiliary incident grid** cleanly separates the
   scattered field for the 2D-Mie gate (the single biggest leakage trap), and
   (d — v0.2) measures **achievable browser bandwidth** (jrprice microbenchmark + the
   spike stencil itself) on one iGPU + one discrete GPU to lock the § 11 tier table.
   This pins the tolerance category numbers before any v1 build.
2. **CPML coefficient provenance (RESOLVED v0.2).** Exact $a_\xi/b_\xi/\psi$ recursion
   verified and inlined at § 3.4 (matches Taflove Ch. 7 eq. 7.99–7.102 form);
   $\kappa_{\max}{=}13.5$/$\alpha_{\max}{=}0.225$ traced to the FDTD++ production
   defaults citing Taflove Ch. 7 — real, but *tuned defaults, not universal optima*;
   the reflection gate carries correctness.
3. **v1 material breadth (RESOLVED — ambitious).** Ship the four-feature palette (single
   Drude ⭐, single Lorentz, diagonal anisotropy ⭐, Kerr χ³ ⭐) in v1, per owner steer
   2026-07-09. Each is v1-cheap (Drude +1 buffer, anisotropy a `vec3`, Kerr buffer-free
   Padé) and each is a distinct "wow." *(Lower-risk fallback if the spike surfaces
   trouble: ship pure linear optics in v1, defer all materials to v1.x.)*
4. **Category home (RESOLVED — ambitious).** NEW `electromagnetics` category (not folded
   into `volumetric-grid`), per owner steer — it is a whole physics domain, not a variant
   (catalog § 14). This sim seeds the family and the future `common-em` module.
5. **Architecture banking** — no spec `architecture.md` electromagnetics section exists
   today; if banked it is co-authored at EM-cluster landing.
6. **Prior-art watch (NEW v0.2).** Re-run the prior-art sweep at execution time:
   **roman01la/efs** (nearest neighbor — if it grows analytic gates or a real-time
   mode, the § 14 differentiation paragraph must be re-checked) and
   **frankie-eight-days/heaviside** (undeployed as of 2026-07-09 — if it deploys with
   validation, same). The moat sentence is dated for exactly this reason.
7. **v1 preset count (NEW v0.2, minor).** § 5.5 targets ≥12 curated scenes at v1
   (Falstad's gallery is the stickiness bar); if build time pressures, the four v1-core
   presets + phased-array are the floor — cut count, never the golden wiring.

---

## 14. Moat

The FDTD ecosystem splits into two camps plus — **v0.2 correction** — a thin middle
band, and **none occupies the target quadrant**:

- **The pros** (Meep, Lumerical, Tidy3D, gprMax, fdtd-z): quantitatively validated against
  Fresnel/Mie, real units, 3D, dispersive — but **desktop or cloud, batch/scripted,
  non-interactive**. Even Tidy3D's browser product is a **job submitter** to a datacenter
  GPU; the browser never runs the solver.
- **The middle band (client-side browser Maxwell FDTDs — must be named, § 2.3):**
  **efs** (openEMS→WASM+WebGPU, 3D, real units, native-vs-WebGPU cross-validated —
  but **batch-solve UX, RF/antenna domain, and no analytic gates**: its verification
  is code-vs-code equivalence against openEMS, it never publishes a
  Fresnel/Mie/grating number); **wifi-solver.com** (WebGPU 2D Maxwell, real units —
  **zero published validation**, closed); **heaviside** (WebGPU TMz/TEz+PML sandbox —
  normalized units, qualitative demos only, undeployed).
- **The browser toys** (Falstad ripple/emwave, timdrysdale/webgl-fdtd, RobinKa,
  VisualPDE): genuinely interactive and real-time — but **unverified, unit-less, 2D,
  PML-less or physics-lite**, self-described as qualitative teaching aids.

**Across all camps: not one ships a published, reproducible validation against an
analytic reference — and none combines any validation with real-time interactive
stepping.** efs comes closest on verification and is nowhere near on interactivity;
Falstad is the inverse.

**The white space (precise, v0.2 re-verified):** *there is no browser EM sim in the
intersection {client-side compute, real-time interactive stepping, real physical
units + real optics, shipped analytic-validation gate (Fresnel/Brewster/Mie/grating)}*
— which remains **empty as of 2026-07-09**. The master catalog names it directly
(§ 2.5 Gap 1): *"Tidy3D is a multi-Gcells/s FDTD, but there is no public web sim of a
Mie-scattering nanoparticle that uses the same numerical method… Tier-0 sims that are
matched-pair-equivalent to a frontier Tier-2 production code are a real public-good
gap."* — and the Gap-1 Mie clause specifically **survives untouched**: browser Mie
tools are analytic series calculators; no browser sim computes Mie scattering *with
the production method*.

**Strongest honest superlative (re-worded v0.2 — the v0.1 "first verification-hardened
FDTD in the browser" is now contestable because of efs):** *"the first browser FDTD
with published, reproducible analytic validation gates — Fresnel, Brewster, Mie,
grating — and real-time interactive stepping, in real physical units, running entirely
on the user's GPU via WebGPU."* Equivalent survivable phrasing: *"the first browser
EM-wave simulator whose accuracy you can check against textbook optics, live, in the
PROVE panel."* Never the bare "first FDTD in a browser," never "first client-side
WebGPU FDTD" (wifi-solver), never un-qualified "first verification-hardened" (efs) —
§ 1.1 #1. When efs comes up, the differentiation is: *analytic gates vs code-vs-code
equivalence; real-time interactive optics vs batch RF solves* — say it respectfully
and precisely; it's good work. We compete on **interactive + analytically-verified
in-browser**, explicitly NOT on accuracy or throughput (the pros win both — honesty
boundary #2).

---

## 15. Selected citations (full URLs; see the lane reports for the ~50-source set)

**Method / numerics:** Yee 1966 <https://ieeexplore.ieee.org/document/1138693>; Schneider
uFDTD <https://github.com/john-b-schneider/uFDTD>; Taflove & Hagness 3rd ed.
<https://us.artechhouse.com/Computational-Electrodynamics-The-Finite-Difference-Time-Domain-Method-Third-Edition-P1929.aspx>;
Meep (Oskooi 2010) <https://math.mit.edu/~stevenj/papers/OskooiRo10.pdf>, Introduction
(units) <https://meep.readthedocs.io/en/latest/Introduction/>, Subpixel Smoothing
<https://meep.readthedocs.io/en/latest/Subpixel_Smoothing/>; numerical-dispersion
anisotropy <https://arxiv.org/pdf/2001.10721>.
**Boundaries / sources:** Meep PML <https://meep.readthedocs.io/en/latest/Perfectly_Matched_Layer/>;
Roden & Gedney CPML (2000) <https://onlinelibrary.wiley.com/doi/10.1002/1098-2760(20001205)27:5%3C334::AID-MOP14%3E3.0.CO;2-A>;
FDTD++ CPML defaults (κmax/αmax provenance) <http://wiki.fdtdxx.com/view/Absorbing_boundary_condition>;
Oskooi, Zhang, Avniel & Johnson 2008 (PML failure: periodic ⇒ irreducible reflection) <https://opg.optica.org/oe/fulltext.cfm?uri=oe-16-15-11376&id=167814>;
Loh, Oskooi, Ibanescu, Skorobogatiy & Johnson 2009 (PML failure: backward-wave ⇒ amplification) <https://math.mit.edu/~stevenj/papers/LohOs09.pdf>;
Shin & Fan 2012 (PML grading) <https://web.stanford.edu/group/fan/publication/Shin_JCP_231_3406_2012.pdf>;
Schneider Ch. 3 §3.10 + Ch. 8 §§8.5–8.6 (TF/SF + 1-D aux grid) <https://eecs.wsu.edu/~schneidj/ufdtd/chap3.pdf>, <https://eecs.wsu.edu/~schneidj/ufdtd/chap8.pdf>;
Schneider 2004 (nearly-perfect TFSF / oblique leakage) <https://ieeexplore.ieee.org/document/1364144/>.
**Materials:** Meep Materials (dispersion/ADE, nonlinear, anisotropic)
<https://meep.readthedocs.io/en/latest/Materials/>; Meep `step_generic.cpp` (Padé
nonlinear) <https://github.com/NanoComp/meep/blob/master/src/step_generic.cpp>; Meep
Units_and_Nonlinearity ($n_2$ convention) <https://meep.readthedocs.io/en/latest/Units_and_Nonlinearity/>;
Rakić 1998 (metal fits) <https://opg.optica.org/ao/abstract.cfm?uri=ao-37-22-5271>,
tables <https://refractiveindex.info/?shelf=main&book=Au&page=Rakic-LD>; ADE Drude/Lorentz
updates <https://pmc.ncbi.nlm.nih.gov/articles/PMC2763393/>.
**Goldens:** Meep Mie tutorial <https://meep.readthedocs.io/en/latest/Python_Tutorials/Basics/>;
miepython algorithm/tests <https://miepython.readthedocs.io/en/latest/07_algorithm.html>;
Bohren & Huffman (cylinder Mie, Ch. 8); Byrnes `tmm` <https://pypi.org/project/tmm/> +
arXiv:1603.02720; MPB bandgap <https://mpb.readthedocs.io/en/latest/Python_Tutorial/>;
BYU slab-waveguide <http://ece360web.groups.et.byu.net/notes/ln_dielectric_slab.pdf>;
Maier *Plasmonics* (SPP dispersion, Fröhlich); Wikipedia Fresnel / diffraction-grating.
**Landscape / moat / performance:** master catalog § 14 & § 2.5 Gap 1
(`docs/planning/bit-physics-master-catalog.md`); Tidy3D <https://www.flexcompute.com/tidy3d/>;
Tidy3D single-precision default <https://docs.flexcompute.com/projects/tidy3d/en/latest/api/_autosummary/tidy3d.Simulation.html>;
Optica OPN GPU-FDTD (20/33 Gcells/s) <https://www.optica-opn.org/home/articles/volume_35/september_2024/features/gpu-accelerated_photonic_simulations/>;
gprMax CUDA (CPC 2019) <https://www.sciencedirect.com/science/article/pii/S0010465518303990>;
FDTD roofline/AI (systolic FDTD, Lu et al. 2025) <https://arxiv.org/abs/2502.20610>;
**v0.2 prior-art additions:** roman01la/efs <https://github.com/roman01la/efs>,
wifi-solver <https://wifi-solver.com/> + <https://jasmcole.com/2024/10/18/a-decade-of-wifi/>,
heaviside <https://github.com/frankie-eight-days/heaviside>,
bcerjan/simpleFDTD <https://github.com/bcerjan/simpleFDTD>;
timdrysdale/webgl-fdtd <https://github.com/timdrysdale/webgl-fdtd>;
RobinKa/maxwell-simulation <https://github.com/RobinKa/maxwell-simulation>;
Falstad ripple <https://www.falstad.com/ripple/>, emwave2 (2D Maxwell TM) <https://www.falstad.com/emwave2/>.
**WebGPU platform:** Chrome 120 limits <https://developer.chrome.com/blog/new-in-webgpu-120>;
Chrome 146 limits + compat <https://developer.chrome.com/blog/new-in-webgpu-146>;
timestamp-query (121) <https://developer.chrome.com/blog/new-in-webgpu-121>;
bandwidth microbenchmark <https://github.com/jrprice/webgpu-bandwidth>.
**Visualization:** Kenneth Moreland diverging maps <https://www.kennethmoreland.com/color-maps/>;
domain coloring <https://en.wikipedia.org/wiki/Domain_coloring>; LIC / animated-texture EM
energy flow (Belcher–Koleci) <https://arxiv.org/abs/0802.4034>; Sundquist DLIC
<https://web.mit.edu/8.02t/www/802TEAL3D/visualizations/resources/DLICArticle.pdf>;
Mapbox wind (advected-particle flow, 1M@60fps WebGL) <https://blog.mapbox.com/how-i-built-a-wind-map-with-webgl-b63022b5537f>;
dual-Kawase vs mip-chain blur comparison <https://blog.frost.kiwi/dual-kawase/>;
Learn-wgpu HDR (rgba16float pipeline) <https://sotrh.github.io/learn-wgpu/intermediate/tutorial13-hdr/>;
synthetic schlieren recipe <https://curiosityfluids.com/2019/04/28/creating-synthetic-schlieren-and-shadowgraph-images-in-paraview/>;
LearnOpenGL Bloom/HDR <https://learnopengl.com/Advanced-Lighting/Bloom>.
