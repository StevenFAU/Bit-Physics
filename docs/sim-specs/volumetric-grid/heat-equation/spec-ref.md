# heat-equation — Reference Spec

> **Status:** Phase-6 candidate spec sheet — **research draft v0.3 (2026-07-08)**,
> deep-web-research pass (v0.2) + first-principles verification review (v0.3: every
> load-bearing citation re-checked against primary sources; repo-reuse and prior-art
> surveys folded in). NOT executed. Gate rows below are **declared targets** to be
> MEASURED at build per `docs/architecture.md` § 2.6 / Appendix D
> (measured-then-declared).
>
> **v0.2 research changes (what moved from v0.1):**
> 1. **Spectral / exponential-integrator solver promoted to a first-class canonical
>    path** (§ 3.2). For a periodic box the Laplacian diagonalizes in Fourier space,
>    so each mode's evolution is the **machine-exact** multiply `exp(−α|k|²Δt)` — the
>    direct heat analogue of schrodinger-smoke's per-mode phase golden. This is the
>    single largest moat upgrade over v1's "Fourier decay as an overlay" framing.
> 2. **Two-spectra discipline made explicit** (§ 3.2, § 4, § 6.5): the FTCS run is
>    compared against its **discrete** amplification `gₕ = 1 + αΔt·λₕ`, the spectral
>    run against the **continuous** decay `exp(−α|k|²t)`. Mixing them is the #1 porting
>    trap (same lesson as schrodinger's Eq-17/Eq-18 split).
> 3. **Two new analytic goldens added, turning "visual toys" into verified templates:**
>    the **erfc semi-infinite step-BC** solution + its **product-form 2D bounded-block**
>    extension (§ 4.5, plate template), and the **Rosenthal moving-source** solution
>    (§ 4.6, laser-engraving template) — each with its honesty caveats.
> 4. **DuFort–Frankel re-scoped as an honest negative-lesson mode, NOT marketed as
>    unconditionally stable** — the classic claim is **refuted** (Corem & Ditkowski
>    2012; consistency fails when Δt = O(Δx)) (§ 3.6, § 2 refuted list).
>    *(Attribution refined in v0.3 item 2 below.)*
> 5. **MMS claims scoped precisely** — it detects only coding mistakes that **affect
>    the order of accuracy**, not all bugs (Salari–Knupp's own "can and cannot be
>    exposed" caveat) (§ 6.1 honesty note, § 2 refuted list).
> 6. **GPU optimization rewritten with measured primary-source numbers** — shared-mem
>    tiling + halo read-redundancy, 2.5D/temporal blocking **with its bottleneck-shift
>    caveat**, memory-bound roofline framing, PCR tridiagonal for ADI, and the
>    low-occupancy-for-stencils result that challenges occupancy folklore (§ 11).
> 7. **Visualization section grounded in colormap science + physically-based blackbody
>    color** (§ 5.5): perceptually-uniform maps + the anti-rainbow literature; the glow
>    color is **physically derived** from the Planck locus, not arbitrary.
> 8. **Web surface adopts the house four-layer INTERACT/EXPLAIN/PROVE/RENDER structure
>    + build-time data spine** (§ 5.6), matching the landed rd2d / schrodinger demos.
>
> **v0.3 review changes (first-principles + primary-source verification pass; what moved from v0.2):**
> 1. **Rosenthal golden corrected to the thin-plate (2D, Bessel-K₀) solution** (§ 4.6, § 7 E).
>    v0.2 gated on the 3D thick-plate/semi-infinite form `P/(2πλR)·exp(...)` — that solves the
>    **3D** heat equation; a 2D grid solver can never converge to it. The 2D golden is
>    `T = T₀ + q/(2πλg)·e^(−Uw/2κ)·K₀(Ur/2κ)`; the 3D form is demoted to an EXPLAIN note.
> 2. **Corem–Ditkowski attribution fixed** (§ 2 anchor 3, § 3.6): their new result is that
>    DuFort–Frankel is **not unconditionally stable** (non-normal amplification-matrix norm
>    growth despite a passing von Neumann check) *and* that a properly-defined truncation error
>    vanishes as h,k→0; the Δt=O(Δx) telegraph-limit inconsistency is the classical result they
>    revisit, not their finding.
> 3. **Gated-WGSL precision rule made load-bearing** (§ 5.2, § 6.5): WGSL/Vulkan guarantee
>    builtin sin/cos only 2⁻¹¹ *absolute* on [−π,π] (nothing outside) and exp only 3+2|x| ULP —
>    the exact hazard schrodinger-smoke measured (63× budget on lavapipe). All gated spectral
>    math uses CPU-f64-precomputed per-mode decay/twiddle buffers or the committed poly-trig
>    kernels; a new negative control locks the rule.
> 4. **FFT is ported, not rewritten** (§ 5.2, § 11): the repo already ships a Stockham radix-2
>    WGSL FFT with the poly-trig fix and f64 multiplier tables
>    (`packages/schrodinger-smoke/web/src/isf_core.wgsl`); heat-equation adapts it to 2D
>    batched form. Public WGSL FFT libraries are immature — no dependency.
> 5. **Blackbody glow upgraded from empirical fit to a committed exact Planck-locus LUT**
>    (§ 5.5, new golden § 7 F): offline Planck → CIE XYZ → sRGB generator + derivation + table;
>    the Helland fit becomes a cross-check anchor. Even the glow color has a golden table.
> 6. **Prior-art survey added** (§ 2.1): Energy2D ("trades accuracy for speed… cannot guarantee
>    its validity" — Xie) and VisualPDE (f32 explicit FD; self-check = a NaN scan) are the named
>    neighbors; no surveyed tool shows its own error vs exact solutions or couples blackbody/IR
>    rendering to a live simulated field — § 14's claims are now citable.
> 7. **Live 2D spectrum view added** (§ 5.4, § 5.5): log|T̂ₖ| rendered as a layer with predicted
>    iso-decay ellipses and pinned-mode error sparklines — the machine-exact moat made visible;
>    nearly free on the spectral path.
> 8. **Product-form sign convention pinned** (§ 4.5): the rule factorizes the *unaccomplished*
>    ratio (uniform T_i, same BC on all exposed faces, no generation, constant properties).
> 9. **"Many effects on screen" made a budget, not a vibe** (§ 5.5, § 11): one uber-composite
>    pass reads T once with uniform-branch layers; half-res mip bloom + LIC; fwidth fragment
>    isolines replace marching squares; per-pass GPU timings surfaced. GPU-lit corrections
>    folded in (PPoPP 28× is vs *sequential CPU* LAPACK; WebGPU compat mode caps 128
>    invocations/workgroup → 16×8 fallback; k=0 φ₁ special case; EBISU = "Revisiting Temporal
>    Blocking Stencil Optimizations," ICS'23).
>
> **Category:** volumetric-grid / scalar-field parabolic PDE.
> **Primary surface:** web-deployable (Stack B / WebGPU + TypeScript, f32) driven by a
> verified **f64 NumPy reference**, reusing the repo's heat-equation MMS lineage under
> `tools/testkit/code_verification/mms/solutions/heat_1d/`.
> **Strategic role:** first-class thermal scalar field; enabling primitive for
> buoyancy-driven flow, wildfire, additive-manufacturing thermal fields, chip cooling,
> reaction heat, and composition-layer testing.

---

## 1. Scope

This sim models transient heat diffusion on a 2D grid, with optional source, sink,
material-mask, and simplified boundary effects:

$$
\rho c_p \frac{\partial T}{\partial t}
= \nabla \cdot (k \nabla T) + Q - h(T-T_\infty)
$$

For the canonical verified core, use the nondimensional constant-coefficient form:

$$
\frac{\partial T}{\partial t}
= \alpha \nabla^2 T + S(x,y,t)
$$

where $T$ is temperature, $\alpha = k/(\rho c_p)$ is thermal diffusivity, and $S$ is a
manufactured or user source term.

**Two gated solver paths (both first-class, distinct gates — § 6.5):**

- **FTCS explicit stencil** — the interactive default; the on-screen update. Compared
  live against the **discrete** amplification golden and the 2D MMS (§ 3.1).
- **Spectral / exponential-integrator** — the machine-exact reference solver on the
  periodic box; each Fourier mode decays by exactly `exp(−α|k|²Δt)` (§ 3.2). This is
  the analytic yardstick the FTCS run is measured against **and** a selectable solver
  with its own per-mode-exact golden.

### 1.1 Load-bearing honesty boundary (repeated in web copy)

v1 is a **verified conduction / scalar-diffusion instrument**, not a multiphysics
thermal package. COMSOL's Heat Transfer Module (the industrial baseline) couples
conduction **and** convection **and** radiation, isotropic/anisotropic and
temperature-dependent conductivity, phase change (apparent-heat-capacity + Stefan
interface), surface-to-surface radiation, and thermal-structural stress in one
finite-element solver. v1 covers only the **conduction/scalar-field floor** and exposes
the extension path honestly. Everything beyond constant-α linear diffusion is either a
labeled beyond-canonical toggle (variable material, boundary modes) or an explicitly
**illustrative-only** visual (nonlinear radiation `T⁴`, temperature-dependent `k`,
apparent-heat-capacity phase-front) that is **ungated by construction** (§ 3.7).

**Non-goals for v1:**

- Full conjugate heat transfer with a solved fluid velocity.
- Full radiative view-factor / DOM / P1 radiation transport.
- Full phase-change Stefan-front tracking (only the visual apparent-`cₚ` toy).
- 3D STL voxel thermal analysis.
- Industrial validation against proprietary COMSOL / Ansys models.

Those are later tracks. v1 earns its place by being a verified, interactive,
composition-ready thermal scalar field with excellent visual and pedagogical
instrumentation.

## 2. Upstream and reference anchors

This is a from-scratch Bit-Physics sim. No upstream code is vendored.

**Local anchors already in the repo:**

- `common/common-ts/examples/hello-physics/heat-equation.ts` — existing 2D FTCS
  TypeScript heat evolver + Gaussian closed-form comparison (`gaussianAtTime`,
  `σ²(t)=σ₀²+2Dt`). Reused as the closed-form Gaussian-kernel fixture (§ 4.3, § 7).
- `tools/testkit/code_verification/mms/solutions/heat_1d/` — existing heat-1D MMS
  derivation + source term + acceptance report (observed L2 order **2.004**, formal 2.0,
  ±0.5 tolerance). Extended to `heat_2d/` (§ 4.4, § 7).
- `common/common-web/src/colormap.ts` — shared colormap facility (matplotlib
  viridis/inferno/magma/plasma/turbo/cividis at 8 stops + house aurora/ember ramps;
  `packColormap()` → uniform write, `emitColormapWgsl()` → data-driven WGSL sampler).
  Consumed by the render layer (§ 5.5) — never forked.
- `docs/testkit/mms.md` — current MMS documentation.

**External research anchors (Cat-1 citations; verified in the 2026-07-08 research pass):**

*Numerics / schemes.*

1. **Crank, J. & Nicolson, P. (1947).** "A practical method for numerical evaluation of
   solutions of partial differential equations of the heat-conduction type." *Math. Proc.
   Camb. Phil. Soc.* 43(1):50–67. DOI 10.1017/S0305004100023197. Historical anchor for
   the implicit, unconditionally-stable, `O(Δt²)+O(Δx²)` solver (§ 3.5).
2. **Peaceman, D.W. & Rachford, H.H. (1955).** "The numerical solution of parabolic and
   elliptic differential equations." *J. Soc. Ind. Appl. Math.* 3(1):28–41.
   DOI 10.1137/0103003. The ADI method: split the 2D update into two tridiagonal
   half-steps (x-implicit, then y-implicit); unconditionally stable, 2nd-order in space
   and time (§ 3.5).
3. **Corem, N. & Ditkowski, A. (2012).** "New analysis of the Du Fort–Frankel methods."
   *J. Sci. Comput.* DOI 10.1007/s10915-012-9627-2. **Refutes** the classic
   "unconditional stability" claim: the schemes pass a von Neumann (eigenvalue) check,
   but powers of the **non-normal** amplification matrix grow in norm. Recorded honestly
   (v0.3): the same paper shows the *properly-defined* truncation error does vanish as
   `h,k→0`; the `Δt=O(Δx)` telegraph-limit **inconsistency** is the classical 1953-era
   result they revisit, not their contribution (§ 3.6). Original scheme: DuFort &
   Frankel (1953), *Math. Tables Aids Comput.* 7(43):135–152, DOI 10.2307/2002754.

*Verification.*

4. **Roy, C.J. (2005).** "Review of code and solution verification procedures for
   computational simulation." *J. Comput. Phys.* 205(1):131–156. DOI
   10.1016/j.jcp.2004.10.036. The V&V levels the repo already cites; the order-of-accuracy
   test is the recommended acceptance criterion (§ 6).
5. **Salari, K. & Knupp, P. (2000).** "Code verification by the Method of Manufactured
   Solutions." Sandia SAND2000-1444, OSTI 759450, DOI 10.2172/759450. MMS + the
   **precise scoping caveat** (§ 6.1): MMS exposes only mistakes that *affect the order
   of accuracy* — the report's own blind-test protocol demonstrates what it *can and
   cannot* catch.

*Analytic benchmarks.*

6. **Semi-infinite `erfc` + product-form bounded block.** The suddenly-heated
   semi-infinite solid has similarity solution `T_d = erfc(x'/(2√t_d))`; a 2D/3D
   rectangular block factorizes as the **product of 1D slab solutions** — precisely: the
   *unaccomplished* ratio factorizes, `1 − T_d = ∏ᵢ (1 − T_d,i)` (§ 4.5 for conditions),
   letting a 2D golden be assembled from independent 1D analytic solutions. Anchor:
   Zhou, Oldenburg, Rutqvist & Birkholzer, "Revisiting the Fundamental Analytical
   Solutions of Heat and Mass Transfer," *Water Resources Research* 53:9960–9979 (2017),
   DOI 10.1002/2017WR021040 — combined erfc-series (early-time) / exponential-series
   (late-time) solutions to `<1e-7` relative error on 1D–3D blocks (product form cites
   Crank, *The Mathematics of Diffusion*, 2nd ed., 1975, p. 25) (§ 4.5).
7. **Rosenthal moving heat source — thin-plate (2D) form.** Rosenthal, D. (1946), "The
   theory of moving sources of heat and its application to metal treatments," *Trans.
   ASME* 68:849–866. **The golden for this sim is the thin-plate solution** (line source
   through thickness `g` — genuinely the 2D heat equation):
   `T = T₀ + q/(2πλg)·exp(−Uw/2κ)·K₀(Ur/2κ)`, `w = x−Ut`, `r = √(w²+y²)` — Bessel `K₀`,
   log-singular at the source. The better-known **thick-plate / semi-infinite 3D** form
   `T = T₀ + P/(2πλR)·exp[−(U/2κ)(R+x)]` solves the *3D* equation and is kept only as an
   EXPLAIN-layer comparison (§ 4.6, v0.3 correction). Assumption/limit framing confirmed
   against a 2022 derivation review and the AM-regime literature
   (DOI 10.1016/j.addma.2018.05.032 for LPBF gradients/cooling rates).

*GPU / WebGPU.*

8. **Micikevicius, P. (2009).** "3D finite difference computation on GPUs using CUDA."
   GPGPU-2, DOI 10.1145/1513895.1513905. Canonical stencil-on-GPU paper: 2.5D blocking,
   shared-memory tile + halo, the read-redundancy formula `(nm + kn + km)/(nm)`, and the
   **memory-bandwidth-bound** finding (§ 11).
9. **Zhang, Y., Cohen, J. & Owens, J.D. (2010).** "Fast tridiagonal solvers on the GPU."
   PPoPP 2010, DOI 10.1145/1693453.1693472. Thomas is inherently serial; cyclic reduction
   (CR) / parallel cyclic reduction (PCR) / hybrids are the GPU route — named application:
   **ADI methods** (§ 3.5, § 11).
10. **Harris, M.** "Fast Fluid Dynamics Simulation on the GPU." *GPU Gems*, ch. 38 —
    diffusion as a GPU-solved PDE term; production graphics lineage for grid PDE passes.
    https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu

*Substrate / platform.*

11. **MDN, "WebGPU API"** (compute pipelines + WGSL for general-purpose GPU compute);
    **W3C WGSL** https://www.w3.org/TR/WGSL/ — including the **floating-point accuracy
    table** (builtin `sin`/`cos`: `2⁻¹¹` *absolute* on `[−π,π]`, no guarantee outside;
    `exp`/`exp2`: `3+2|x|` ULP), mirrored from the Vulkan SPIR-V precision appendix —
    the normative source for the § 5.2 precision rule; **W3C WebGPU limits table**
    https://www.w3.org/TR/webgpu/#limits (§ 11).

*Visualization science.*

12. **Borland, D. & Taylor, R.M. (2007).** "Rainbow color map (still) considered harmful."
    *IEEE CG&A* 27(2):14–17. DOI 10.1109/MCG.2007.323435. The standard anti-rainbow
    citation: no perceptual ordering, uncontrolled luminance, misleading gradients (§ 5.5).
13. **Kovesi, P. (2015).** "Good colour maps: how to design them." arXiv:1509.03700.
    Lightness-uniformity is the dominant design factor; flat spots hide ~10% of the data
    range; CIELAB is only perceptually uniform at low spatial frequency (§ 5.5).
14. **Crameri, F., Shephard, G.E. & Heron, P.J. (2020).** "The misuse of colour in science
    communication." *Nature Communications* 11:5444. DOI 10.1038/s41467-020-19160-7.
    Rainbow interpretation can diverge >7% of displayed data variation (§ 5.5).
15. **Blackbody → RGB.** The physically-honest path is Planck's law → CIE XYZ (via the
    CIE colour-matching functions) → sRGB along the Planckian locus — shipped as a
    **committed exact LUT** computed offline by a house golden generator (§ 5.5, § 7 F).
    The Tanner Helland 2012 empirical fit (Mitchell Charity's blackbody datafile / CIE
    1964 10° observer; per-channel R² 0.988–0.998, designed 1000–40000 K, best
    1500–15000 K; Helland himself: "not accurate enough for serious scientific use") is
    a **cross-check anchor, not the shipped path** (v0.3 upgrade).
16. **IR palettes.** Teledyne FLIR thermal-palette guide — White Hot / Black Hot / Ironbow
    / Rainbow HC / Isotherm overlay; the thermal-camera template (§ 5.4).

*Industry surface.*

17. **COMSOL, "Heat Transfer Module"** (conduction/convection/radiation, aniso + temp-dep
    `k`, apparent-`cₚ` + Stefan phase change, surface-to-surface radiation, thermal stress)
    https://www.comsol.com/heat-transfer-module ; **Ansys, "Thermal Analysis"**
    https://www.ansys.com/applications/thermal-analysis-simulation-software . Define the
    industrial target surface and v1's honest floor (§ 1.1).
18. **Thermal resistance networks** — the discrete lumped model `K·T = b`, `T = K⁻¹b`
    (junction-temperature / heat-spreading extraction), the circuit-board template's
    calculation-verification hand-check (§ 5.4, § 6.4).

*Exponential integrators / GPU FFT (added v0.3).*

19. **Cox, S.M. & Matthews, P.C. (2002).** "Exponential time differencing for stiff
    systems." *J. Comput. Phys.* 176(2):430–455. DOI 10.1006/jcph.2002.6995. The § 3.2
    per-mode update is exactly ETD1 / the `φ₁` integrating-factor form — exact for
    constant per-step forcing, with `φ₁(0)=1` giving the `k→0` limit.
20. **Lloyd, D.B., Boyd, C. & Govindaraju, N. (2008).** "Fast computation of general
    Fourier transforms on GPUs." Microsoft Research TR-2008-62. Stockham auto-sort is
    the standard GPU FFT formulation (no bit-reversal; fixed ping-pong pass order — the
    § 8 determinism property). Public WGSL FFT libraries remain immature (small,
    unmaintained repos) → port the house kernel, do not add a dependency (§ 5.2).

*Prior art (added v0.3 — see § 2.1).*

21. **Xie, C. (2012).** "Interactive heat transfer simulations for everyone." *The
    Physics Teacher* 50(4):237–240 (Energy2D). Prior-art anchor.
22. **Walker, B.J., Townsend, A.K., Chudasama, A.K. & Krause, A.L. (2023).** "VisualPDE:
    rapid interactive simulations of partial differential equations." *Bull. Math.
    Biol.* 85:113, arXiv:2308.01245. Prior-art anchor.

**Do NOT claim (refuted or over-reached in the research pass — votes recorded):**

- **"DuFort–Frankel is unconditionally stable"** — refuted (Corem & Ditkowski 2012:
  von-Neumann-sense stable, yet powers of the non-normal amplification matrix grow in
  norm). Independently — and classically, since the scheme's own era — its truncation
  error is `O(Δt² + Δx² + Δt²/Δx²)`, so it is **inconsistent when Δt=O(Δx)**: it silently
  solves a different equation (a hyperbolic telegraph-type perturbation) unless
  `Δt/Δx → 0`. Present it as the negative-lesson mode (§ 3.6), never as a free lunch —
  and do not credit the consistency defect to Corem–Ditkowski (their consistency result
  actually *softens* it).
- **"MMS finds all coding bugs"** — over-reach; refuted 3/3 against Salari–Knupp's own
  abstract. MMS/order-of-accuracy testing detects **only** mistakes that degrade the
  observed order of accuracy; same-order errors, round-off, iterative-convergence, and
  post-processing bugs are **not** caught. Scope the copy accordingly (§ 6.1).
- **"Rainbow/jet is fine for temperature"** — refuted by Borland–Taylor / Crameri / Kovesi.
  Temperature is an ordered scalar; the default map must be monotonic in luminance.
- **"The Rosenthal field is an accurate melt-pool model"** — it is an *analytic
  benchmark*, not a validated melt-pool model: it assumes steady state, adiabatic
  surfaces, temperature-independent properties, a singular source, and it mispredicts
  cooling rates (constant-`k`) and underestimates melt-pool length at high scan speed.
  Golden-of-the-equation, not model-validation (§ 4.6, § 6.3).
- **"The 3D Rosenthal formula can gate a 2D grid"** — refuted at review (v0.3,
  first-principles): `P/(2πλR)·exp(...)` solves the **3D** heat equation
  (thick-plate/semi-infinite); a 2D solver converges to the **thin-plate `K₀`** solution
  instead. Using the 3D form as the golden would bake a never-passing (or
  silently-widened) gate into § 7 E (§ 4.6).
- **"WGSL builtin `sin`/`cos`/`exp` are accurate enough for gated math"** — refuted by
  spec + repo measurement: WGSL/Vulkan guarantee only `2⁻¹¹` *absolute* error for
  sin/cos on `[−π,π]` (none outside) and `3+2|x|` ULP for exp; schrodinger-smoke
  measured 63× budget overshoot on lavapipe from exactly this before switching to
  polynomial trig. All gated spectral math here uses precomputed-f64 tables or the
  poly-trig kernels (§ 5.2).

### 2.1 Prior art — interactive heat/diffusion sims (surveyed 2026-07-08) and the gap

- **Energy2D** (Xie / Concord Consortium; anchor 21) — the closest neighbor: conduction
  (FTCS-family FD) + CFD convection + radiation, a full authorable sandbox (draw shapes,
  assign materials, thermometers/flux sensors, dozens of prebuilt scenarios), Java
  desktop plus a frozen 2012-era WebGL1 port. Its accuracy posture is the differentiator:
  Xie's own paper — *"the computational engine trades accuracy for speed… results should
  be considered as approximate solutions… that may break down"* — and the project page's
  *"we cannot, however, guarantee its validity."* Validation shown is qualitative
  (side-by-side IR photographs).
- **VisualPDE** (anchor 22) — the interactivity bar to clear: solve-as-you-type
  equations, brush painting, walls/domains, presets; WebGL fragment-shader explicit FD
  in f32. Its only runtime self-check is a periodic NaN/±Inf scan; no error norms, no
  analytic overlay, no convergence display.
- **WebGPU/shader tier** — WebHeat (STL FDM heatmap toy), Shadertoy/compute.toys
  buffer-feedback Laplacians, robert-leitl's WebGPU reaction-diffusion (the current
  render-polish bar for diffusion-family demos). None state their scheme's order or
  compare against anything.
- **Industry "live thermal"** — Ansys Discovery's GPU solver is explicitly
  speed-over-fidelity with a separate refine mode; SimScale solves cloud-side (minutes,
  not milliseconds); COMSOL Apps are parameter-in/solution-out wrappers around served
  FEM models. Even here, no on-screen error estimate.

**The gap this spec occupies (citable, not vibes):** no surveyed browser tool computes
and displays its own error against exact solutions, gates on it in CI, offers a
determinism contract, or couples blackbody/IR rendering to a *live simulated*
temperature field. Energy2D ships the disclaimer; this sim ships the measurement (§ 14).

## 3. Algorithm

### 3.1 Canonical explicit FTCS (interactive default)

2D explicit forward-time, centered-space finite difference on a uniform grid. For
constant $\alpha$, spacings $\Delta x,\Delta y$, step $\Delta t$:

$$
T^{n+1}_{i,j}=T^n_{i,j}
+ r_x(T^n_{i+1,j}-2T^n_{i,j}+T^n_{i-1,j})
+ r_y(T^n_{i,j+1}-2T^n_{i,j}+T^n_{i,j-1})
+ \Delta t\,S^n_{i,j},\qquad
r_x=\frac{\alpha\Delta t}{\Delta x^2},\ r_y=\frac{\alpha\Delta t}{\Delta y^2}
$$

FTCS is **first-order in time, second-order in space, conditionally stable.** The von
Neumann limit in 2D is

$$
r_x+r_y \le \tfrac12
\quad\Longleftrightarrow\quad
\Delta t \le \frac{1}{2\alpha\left(1/\Delta x^2+1/\Delta y^2\right)},
$$

which for square cells reduces to $\alpha\Delta t/\Delta x^2 \le 1/4$. The UI may expose
"visual speed" as substeps/frame, but the solver **computes $\Delta t$ from the stability
bound and clamps the user's request**; the clamp is visible in the verification panel
(never hidden — § 11). The stability-margin meter reads $\tfrac12-(r_x+r_y)$.

### 3.2 Spectral / exponential-integrator solver (machine-exact reference — the moat headliner)

On the periodic box the discrete Laplacian is **diagonalized by the FFT**: each Fourier
mode $\hat T_{\mathbf k}$ is an eigenvector, and the constant-α heat equation decouples
into independent scalar ODEs

$$
\frac{d}{dt}\hat T_{\mathbf k}= -\alpha|\mathbf k|^2\,\hat T_{\mathbf k}+\hat S_{\mathbf k},
\qquad |\mathbf k|^2=k_x^2+k_y^2 .
$$

The **exact** update over one step (integrating factor / ETD) is

$$
\hat T_{\mathbf k}(t+\Delta t)=e^{-\alpha|\mathbf k|^2\Delta t}\,\hat T_{\mathbf k}(t)
\;+\;\underbrace{\frac{1-e^{-\alpha|\mathbf k|^2\Delta t}}{\alpha|\mathbf k|^2}}_{\to\,\Delta t\ \text{as}\ |\mathbf k|\to0}\ \hat S_{\mathbf k},
$$

i.e. FFT → per-mode multiply → IFFT. For the **unforced** problem this is
**machine-exact per mode and unconditionally stable** — there is no CFL, no amplitude
error, no phase error. This is the exact heat analogue of schrodinger-smoke's free-step
per-mode phase golden, and it is the strongest gate the sim can carry (§ 6.5, § 7 A).

**Implementation rule (gated precision, v0.3):** the per-mode factors
$e^{-\alpha|\mathbf k|^2\Delta t}$ and the forcing coefficient
$(1-e^{-\lambda\Delta t})/\lambda$ are **precomputed in f64 on the CPU** and uploaded as
read-only buffers (recomputed only when $\alpha$/$\Delta t$ change), never evaluated with
WGSL builtin `exp` inside the kernel — the same f64-multiplier-table discipline as
schrodinger-smoke's `freeMul`/`invLam` buffers (§ 5.2). The $\mathbf k=0$ mode is
special-cased to $\Delta t$ (and near-zero $\lambda$ uses the series form of $\varphi_1$)
— the $0/0$ trap is explicit, not incidental.

**Two-spectra discipline (the #1 porting trap — same lesson as schrodinger's Eq-17/Eq-18):**

- The **spectral** solver uses the **continuous** eigenvalue $-\alpha|\mathbf k|^2$ with the
  standard periodic wavenumbers $\mathbf k=2\pi\cdot\text{fftfreq}\cdot N$. Its golden is the
  continuous decay $\exp[-\alpha|\mathbf k|^2 t]$ — machine-exact.
- The **FTCS** solver realizes the **discrete** 5-point Laplacian eigenvalue
  $\lambda_h=-\tfrac{4}{\Delta x^2}\sin^2\!\tfrac{k_x\Delta x}{2}-\tfrac{4}{\Delta y^2}\sin^2\!\tfrac{k_y\Delta y}{2}$,
  with exact amplification $g_h=1+\alpha\Delta t\,\lambda_h$. Its golden is $g_h^{N}$
  (§ 4.2) — the exact discrete method it *claims* to implement, a strictly stronger check
  than a continuous-only comparison.

Comparing an FTCS run against $\exp[-\alpha|\mathbf k|^2 t]$ (rather than $g_h^N$) leaks the
$O(\Delta t)+O(\Delta x^2)$ truncation error into what should be a machine-exact check —
the porting bug the two-spectra table (§ 7 E) exists to catch.

Because the spectral solver is exact and unconditionally stable, it doubles as the
**"turbo / large-step" solver** for the interactive product (arbitrary $\Delta t$ on the
periodic templates) — honestly, not as a hack. Cost is $O(N^2\log N)$ per step vs FTCS's
$O(N^2)$; on the target grids the FFT is fast enough for interactivity and its determinism
posture is clean (§ 8).

### 3.3 Boundary modes

v1 supports:

- **Periodic** — canonical verification mode (FTCS **and** spectral).
- **Dirichlet** — fixed-temperature walls (plate/cooling templates; ghost cells).
- **Neumann zero-flux** — insulated walls (mirror ghost cells).
- **Robin-lite** — simplified ambient cooling sink $h(T-T_\infty)$, implemented as a local
  source/sink term, not a full boundary integral.

Only periodic and Dirichlet are required for the v1 gates. Neumann and Robin-lite are
interactive-product features with invariant tests where applicable. **Non-periodic BCs
break the spectral solver's FFT-natural exactness** (a DCT variant recovers
Neumann/insulated; Dirichlet on a bounded block has its own erfc/product-form golden,
§ 4.5) — the periodic spectral path stays the machine-exact anchor.

### 3.4 Material-mask mode (conservative variable diffusivity)

Per-cell material buffer `material_id → {alpha, heat_capacity_scale, source_scale,
color_hint}`. Variable diffusivity uses the **conservative face-flux** form (finite-volume,
so interface energy is conserved by construction):

$$
T^{n+1}_{i,j}=T^n_{i,j}
+\Delta t\!\left[\frac{F^x_{i+1/2,j}-F^x_{i-1/2,j}}{\Delta x}
+\frac{F^y_{i,j+1/2}-F^y_{i,j-1/2}}{\Delta y}\right]
+\Delta t\,S^n_{i,j},\quad
F^x_{i+1/2,j}=\alpha_{i+1/2,j}\frac{T^n_{i+1,j}-T^n_{i,j}}{\Delta x}
$$

with **harmonic-mean** face diffusivity (the physically-correct series-resistance average
for conduction across a material interface — cf. thermal-resistance networks, § 6.4):

$$
\alpha_{i+1/2,j}=\frac{2\alpha_{i,j}\alpha_{i+1,j}}{\alpha_{i,j}+\alpha_{i+1,j}+\epsilon}.
$$

Constant-α is the canonical gate path. Variable material mode is important for user
templates but must not weaken canonical tolerances (a uniform material buffer must
reproduce the constant-α path bit-for-bit, § 9). Industry precedent: COMSOL's aniso /
temperature-dependent conductivity (§ 2 anchor 17).

### 3.5 Implicit A/B study modes (v2 — separate gates, not a hidden replacement)

After v1 lands, add implicit solvers as **labeled A/B variants**, each with its own gate:

| Scheme | Order | Stability | GPU solve |
|---|---|---|---|
| Backward Euler (BTCS) | `O(Δt)+O(Δx²)` | unconditional | Jacobi / red-black Gauss–Seidel / SOR sweeps, or multigrid V-cycle |
| Crank–Nicolson | `O(Δt²)+O(Δx²)` | unconditional | as BTCS (θ=½ average of the spatial term) |
| ADI (Peaceman–Rachford) | 2nd order, both | unconditional | two tridiagonal half-steps via **PCR** (Thomas is serial — § 2 anchor 9) |

The implicit systems are solved iteratively on-GPU: **red-black Gauss–Seidel / SOR
in-place** (checkerboard parallelism) or a **multigrid V-cycle** for the Poisson-like
operator. ADI's tridiagonal solves use **parallel cyclic reduction (PCR)** rather than the
serial Thomas algorithm. Value: a live A/B showing the accuracy/stability tradeoff — FTCS
(simple, fast, conditionally stable) vs Crank–Nicolson (large steps, implicit solve) vs the
machine-exact spectral solver as the arbiter. Implicit mode is a separate solver variant
with its own gate, **not** a silent substitute for the canonical FTCS/spectral paths.

### 3.6 DuFort–Frankel — the honest negative-lesson mode (NOT a canonical solver)

DuFort–Frankel is a 3-level explicit scheme (Richardson stencil with
$u^n_j\to\tfrac12(u^{n+1}_j+u^{n-1}_j)$):

$$
u^{n+1}_j=\frac{1}{1+2D}\Big[(1-2D)u^{n-1}_j+2D\,(u^n_{j+1}+u^n_{j-1})\Big],\quad D=\frac{\alpha\Delta t}{\Delta x^2}.
$$

It is often *marketed* as the "unconditionally stable explicit" scheme. **The demo must not
repeat that claim.** Corem & Ditkowski (2012) refute the stability half (von-Neumann-sense
stable, yet powers of the non-normal amplification matrix grow in norm), while the
**classical** consistency defect — the one the demo visualizes — is load-bearing: the
truncation error is
$O(\Delta t^2+\Delta x^2+\Delta t^2/\Delta x^2)$, so **when $\Delta t=O(\Delta x)$ the scheme is
inconsistent** — it converges to a *different* (telegraph-type hyperbolic) equation, not the
heat equation. It also needs an FTCS bootstrap for its first step. Ship it as an
**explicitly-labeled teaching mode**: run it at $\Delta t=O(\Delta x)$ next to the spectral
reference and *watch it solve the wrong equation* — the discretization's edge shown, not
hidden. This is a negative control (§ 6), not a product default.

### 3.7 Nonlinear extensions — illustrative-only, ungated by construction

Radiative loss $\varepsilon\sigma(T^4-T_\infty^4)$, temperature-dependent conductivity
$k(T)$, and an apparent-heat-capacity phase-front toy (raise $c_p$ across a melt band) are
**visual, ungated** toggles. They are physically motivated (COMSOL models all three) but
have no analytic golden in v1 and break the linear-diffusion invariants by construction —
so they are labeled "illustrative, not verified" wherever exposed, exactly as
schrodinger-smoke labels its Alg-4 constraint toggles.

## 4. Algebraic form

### 4.1 Governing nondimensional PDE

$$
T_t=\alpha(T_{xx}+T_{yy})+S(x,y,t)
$$

### 4.2 Periodic Fourier eigenmode + discrete amplification

For the unforced periodic problem on $[0,L_x]\times[0,L_y]$ with
$T(x,y,0)=\sin(k_x x)\sin(k_y y)$, $k_x=2\pi m/L_x$, $k_y=2\pi n/L_y$:

$$
T(x,y,t)=\sin(k_xx)\sin(k_yy)\exp[-\alpha(k_x^2+k_y^2)t]\quad(\text{continuous — spectral golden}).
$$

The FTCS run instead tracks the **discrete** amplification (§ 3.2):
$g_h=1+\alpha\Delta t\,\lambda_h$, so after $N$ steps the measured amplitude is $g_h^{N}$.
The live overlay shows both curves; the FTCS trace must track $g_h^N$ (its own method) to
f32 tolerance, and the spectral trace must track $\exp[-\alpha|\mathbf k|^2 t]$ to machine
precision.

### 4.3 Gaussian heat kernel (reused closed form)

For a Gaussian hot spot on a domain large vs the spot, $\sigma^2(t)=\sigma_0^2+2\alpha t$
and amplitude $\sigma_0^2/\sigma^2(t)$ — the existing `common-ts` `gaussianAtTime` fixture
(§ 2). Periodic-image caveat: valid while $\sigma\ll L$ so the wrapped tails stay below the
tolerance floor (mirrors the schrodinger periodization caveat).

### 4.4 Manufactured solution (2D MMS)

Extending the repo's heat-1D pattern to 2D:

$$
T(x,y,t)=\sin(2\pi x/L_x)\sin(2\pi y/L_y)\cos t
$$

$$
S(x,y,t)=\sin(2\pi x/L_x)\sin(2\pi y/L_y)\Big[\alpha\big((2\pi/L_x)^2+(2\pi/L_y)^2\big)\cos t-\sin t\Big]
$$

Exercises the 2D stencil, source injection, and the norm/reduction path. Formal spatial
order 2.0; observed L2 order must be within ±0.50 (the heat-1D acceptance measured 2.004).

### 4.5 Semi-infinite `erfc` + product-form 2D bounded block (NEW — plate template golden)

Suddenly-applied fixed surface temperature on a semi-infinite solid has the similarity
solution (dimensionless $x'$ from the boundary, Fourier number $t_d$):

$$
T_d=\operatorname{erfc}\!\left(\frac{x'}{2\sqrt{t_d}}\right).
$$

A finite 1D slab has the exponential eigenmode series
$T_d=1-2\sum_{n\ge1}\frac{2(-1)^{n-1}}{(2n-1)\pi}\exp\!\big[-\big(\tfrac{2n-1}{2}\big)^2\pi^2 t_d\big]\cos\big(\tfrac{2n-1}{2}\pi x_d\big)$,
each mode decaying as $\exp(-k^2 t_d)$. **Key for a 2D golden — sign convention pinned
(v0.3):** the product rule applies to the **unaccomplished (deficit) ratio**
$\theta=(T-T_s)/(T_i-T_s)$, which factorizes as $\theta_{2D}=\theta_x\,\theta_y$; in the
accomplished ratio $T_d=1-\theta$ this reads
$T_d = 1-\prod_i\big(1-T_{d,i}(x_{d,i},t_{d,i})\big)$ (Crank 1975 p. 25; § 2 anchor 6).
Validity conditions, stated in the template copy: uniform initial temperature, the *same*
step BC on every exposed face pair, no interior generation, constant properties. The erfc
series converges fast at small/moderate $t_d$;
the exponential series at moderate/large $t_d$ — a combined solution with an optimized
switchover reaches `<1e-7` relative error with two terms each. This gives the
Dirichlet **metal-plate** template a real analytic overlay, not just "it looks diffusive."

### 4.6 Rosenthal moving heat source — thin-plate (2D) form (laser-engraving template golden)

**Dimensional honesty (v0.3 correction):** the sim solves the **2D** heat equation, so its
steady moving-source golden must be Rosenthal's **thin-plate** solution — a line source of
absorbed power $q$ through plate thickness $g$, moving at speed $U$; in the moving frame
($w=x-Ut$ along track, $r=\sqrt{w^2+y^2}$, $\lambda$ conductivity, $\kappa$ diffusivity):

$$
T=T_0+\frac{q}{2\pi\lambda g}\,
\exp\!\left(-\frac{Uw}{2\kappa}\right)K_0\!\left(\frac{Ur}{2\kappa}\right),
$$

with $K_0$ the modified Bessel function of the second kind (log-singular at the source;
long thermal tail behind, sharp decay ahead). The better-known **thick-plate /
semi-infinite 3D** form $T=T_0+\frac{P}{2\pi\lambda R}\exp[-\frac{U}{2\kappa}(R+x)]$
solves the *3D* equation — a 2D grid can never converge to it; it appears only as an
EXPLAIN-layer comparison note.

**Golden protocol:** the sim runs a small Gaussian source (finite spot) at constant $U$
until quasi-steady in the moving frame; the golden is evaluated on **probe lines/annuli
excluding the source core**, where the point-source idealization and the finite spot
legitimately differ and $K_0$ diverges. Generator anchor: `scipy.special.k0` (f64).

**Assumptions / honesty caveats (§ 6.3, web copy):** quasi-steady state, adiabatic faces,
temperature-independent properties, no advection/radiation/convection/phase change; a
line source ⇒ a logarithmic singularity at the origin. Constant-property Rosenthal
mispredicts cooling rates and underestimates melt-pool length at high $U$. It is a
**golden of the equation** (verify the moving-source solver reproduces the analytic
teardrop isotherms in the steady frame), explicitly **not** a validated melt-pool model.
The AM/LPBF regime it idealizes has measured gradients 5–20 K/µm and cooling rates
1–40 K/µs (§ 10 diagnostics anchor).

## 5. Implementation

### 5.1 Proposed package layout

```text
packages/heat-equation/
  README.md
  pyproject.toml
  heat_equation/
    __init__.py
    reference.py          # f64 NumPy reference: FTCS + spectral, canonical captures
    spectral.py           # FFT exponential-integrator reference (machine-exact path)
    sim.py                # SimRunner / CLI entry
    invariants.py         # PBT predicates
    capture.py            # capture fields + manifest
  tests/
    test_mms_convergence.py        # 2D MMS observed order (heat_2d)
    test_fourier_decay_golden.py   # continuous + discrete amplification
    test_spectral_exact.py         # per-mode machine-exact decay (spectral)
    test_erfc_product_golden.py    # semi-infinite + product-form block
    test_rosenthal_golden.py       # moving-source steady field (thin-plate K0, § 4.6)
    test_pbt_invariants.py
    test_diagnostics.py
    test_determinism.py
    test_capture.py
  web/
    index.html
    package.json
    vite.config.ts
    gen-verification.mjs           # build-time data spine (§ 5.6)
    src/
      main.ts
      solver.ts                    # FTCS + spectral dispatch
      presets.ts                   # templates (§ 5.4)
      render.ts
      verify-panel.ts              # PROVE layer (§ 5.6)
      explain.ts                   # EXPLAIN layer
      heat.wgsl                    # FTCS + material-flux kernels
      fft.wgsl                     # 2D-batched Stockham radix-2, ported from
                                   #   packages/schrodinger-smoke/web/src/isf_core.wgsl
                                   #   (poly-trig twiddles + f64 tables — § 5.2)
      render.wgsl                  # colormap / IR / isotherms / relief / LIC / spectrum
      generated/verification.json  # committed; no retyped constants
      generated/blackbody-lut.json # committed Planck-locus LUT (§ 5.5, § 7 F)
```

The reference package is Python f64 for gates; the product demo is WebGPU f32; the web demo
consumes generated verification metadata (house pattern). New MMS + golden artifacts land
under `tools/testkit/code_verification/mms/solutions/heat_2d/` and
`tools/testkit/golden/{generator,derivations,tables/volumetric-grid}/` (§ 7).

### 5.2 WebGPU data layout

Two ping-pong scalar fields plus auxiliaries:

```text
T0, T1: array<f32>            # ping-pong state (storage buffers preferred for capture)
source: array<f32>
material: array<u32>
spectrum_re, spectrum_im: array<f32>   # spectral-path work buffers
diagnostics: small storage buffer for GPU reductions
params: uniform buffer (α, dx, dt, r, BC flags, colormap block)
```

Storage buffers are preferred for the canonical compute state (portable capture export);
rendering reads them in a fullscreen pass or copies to an `r32float` texture for colormap
sampling. **Separate simulation resolution from display resolution** (§ 11).

WGSL kernels:

- `step_constant_periodic` (canonical FTCS), `step_constant_boundary`, `step_material_flux`
- `fft_stockham` / `spectral_multiply` (the machine-exact spectral path)
- `paint_source`, `reduce_diagnostics`
- `render_temperature`, `render_gradient`, `render_isolines`

Canonical gate path is `step_constant_periodic` + the spectral reference; richer effects are
opt-in and clearly labeled in verification metadata.

**Gated-WGSL precision rule (repo lesson, load-bearing — v0.3):** WGSL/Vulkan guarantee
builtin `sin`/`cos` only to `2⁻¹¹` **absolute** error on `[−π,π]` — and nothing outside —
and `exp` only to `3+2|x|` ULP (W3C WGSL floating-point accuracy table; Vulkan SPIR-V
precision appendix — § 2 anchor 11). schrodinger-smoke measured the consequence:
builtin-trig twiddles put lavapipe 63× over budget while RADV passed. Therefore:
(a) the FFT ports schrodinger's Stockham radix-2 with **polynomial trig twiddles**
(`sin_poly4`/`cos_poly4`/`cs_p` in `packages/schrodinger-smoke/web/src/isf_core.wgsl`),
adapted to 2D batched form — not silently forked (promotion to `common/common-web` is an
operator decision, § 13.2); (b) per-mode decay/forcing factors are **CPU-f64-precomputed
buffers** (§ 3.2), making `spectral_multiply` a pure multiply — cheaper *and* portable;
(c) any `sin`/`cos` in IC seeding or golden overlays on the gated path follows the same
rule. Compat-mode note: default `maxComputeInvocationsPerWorkgroup` is 256 but **128 in
WebGPU compatibility mode** — 16×16 tiles need a 16×8 fallback (§ 11).

### 5.3 Dispatch order (per animation frame)

1. Apply user splats / scripted heat sources into `source`.
2. Run `N_substeps` heat steps (FTCS: one compute dispatch each — WebGPU has no
   cross-workgroup sync inside a dispatch, so a global step ≠ one dispatch; spectral: FFT
   → multiply → IFFT).
3. GPU diagnostics reduction at a configurable cadence.
4. Render the selected visual layer.
5. Update live verification widgets **without CPU readback in the hot path**.

Tile-local multi-step "turbo" FTCS is a visual-only mode and is not canonical (the spectral
solver is the honest large-step path — § 3.2).

### 5.4 Interaction templates (ship templates, not a blank canvas)

| Template | Purpose | Verification hook |
|---|---|---|
| **Fourier decay lab** | one eigenmode decays; live amplitude overlay + **live 2D spectrum view** (§ 5.5) | **discrete amplification golden** (FTCS) **+ machine-exact spectral** (§ 4.2) |
| **Gaussian heat kernel** | hot spot spreads into a wider Gaussian | closed-form `σ²(t)=σ₀²+2αt` (§ 4.3, common-ts lineage) |
| **Metal plate, sudden edge heat** | fixed-temperature wall drives a diffusive front | **erfc / product-form golden** (§ 4.5) |
| **Circuit-board thermal map** | chip hotspots, heat sinks, material mask | energy/source accounting + **thermal-resistance hand-check** (§ 6.4) |
| **Laser engraving** | moving hot source writes glowing tracks | **Rosenthal thin-plate `K₀` golden** (§ 4.6) |
| **Anisotropic crystal** | directional diffusion (tensor / split-α) | v2 / optional, not canonical |
| **Thermal camera** | paint heat, view IR/blackbody palette | deterministic interaction hash (record/replay) |
| **Buoyant plume handoff** | temperature exports as smoke buoyancy source | composition-readiness gate (§ 14) |
| **Phase-front sketch** | apparent-`cₚ` phase-change toy | explicitly **visual-only** (§ 3.7) |

Default template = **circuit-board thermal map** (visually legible, industry-relevant, with
the verification layer one click away). The first screen is the usable sim, not a landing
page.

### 5.5 Visual features (visually stunning, physics-honest)

**The visual rule:** every aesthetic layer reads the *same* temperature field; no separate
fake simulation is allowed (the rd2d/schrodinger "physics-honest color" contract).

Required v1 rendering modes:

- **Perceptually-uniform temperature colormap** from `common/common-web/src/colormap.ts`
  (inferno / magma / viridis / turbo + house ramps). Default map is **monotonic in
  luminance** — temperature is an ordered scalar, so a rainbow/jet default is a documented
  perceptual error (Borland–Taylor 2007; Crameri 2020 >7% divergence; Kovesi 2015 flat
  spots hide ~10% of the range). A "raw values / honest texel" toggle is available.
- **Physically-based blackbody glow (moat visual).** Above a user threshold, map temperature
  in Kelvin to color along the **Planck locus** (Planck's law → CIE XYZ via the CIE
  colour-matching functions → sRGB), so a glowing-hot region's color is *physically
  derived, not arbitrary*. **v0.3 upgrade:** the interactive path samples a **committed
  exact Planck-locus LUT** (1D texture) generated offline under the house golden
  convention — generator + derivation + table (§ 7 F) — so *even the glow color has a
  golden table*. The Helland empirical fit is demoted to a cross-check anchor (§ 2
  anchor 15). No surveyed public demo couples blackbody rendering to a live simulated
  field (§ 2.1).
- **IR / thermal-camera palettes** — White Hot, Black Hot, Ironbow, Rainbow-HC, Isotherm
  overlay (FLIR convention; thermal-camera template).
- **Isotherm contours** as **fwidth-antialiased fragment-shader level sets** (Iñigo
  Quilez's filterable-procedurals technique — v0.3, replaces marching squares):
  resolution-independent, zero readback, ~free inside the composite pass. CPU marching
  squares only if/when vector export is wanted (same field either way; a rendering pass,
  not a solver).
- **Heat-flux visualization** — gradient arrows and/or **line-integral convolution (LIC)**
  (Cabral & Leedom 1993) of $-\nabla T$ (finite-differenced from the state buffer —
  data-derived, no separate ODE; computed at half resolution, § 11).
- **Analytic error heatmap** for Fourier / MMS / erfc / Rosenthal modes (the visible error
  field — moat point 4).
- **Live 2D spectrum view (NEW v0.3 — the moat made visible).** Render
  $\log|\hat T_{\mathbf k}|$ as its own layer: the spectrum visibly collapses inward as
  high-$|\mathbf k|$ modes die, with **predicted iso-decay ellipses**
  $\alpha|\mathbf k|^2 t=\text{const}$ overlaid and per-mode measured-vs-exact error
  sparklines for a pinned mode set. The spectral solver computes $\hat T$ anyway, so the
  layer is nearly free; on the FTCS path a low-cadence FFT of the state feeds the same
  view — watching the *discrete* spectrum deviate from the continuous ellipses is the
  two-spectra lesson (§ 3.2) as a picture. No surveyed public demo has this (§ 2.1).
- **Stability-margin meter** $\tfrac12-(r_x+r_y)$; **live mass / max / energy plots.**

Optional polish (all read the same field): heat-shimmer/schlieren refraction over a
background grid (index-of-refraction ∝ temperature gradient; noise-UV post pass);
threshold **mip-chain bloom** for glowing regions (Jimenez SIGGRAPH-2014;
PavelDoGreat's WebGL fluid is the browser precedent); temperature as **height-relief
displacement** with Horn-1981 hillshade emboss (the "make it look like matter" move);
particles drifting down $-\nabla T$ via the `packages/curl-noise/web/src/tracers.wgsl`
pattern (labeled a *visualization* layer, not the PDE).

**Composite architecture ("many effects at once" is a budget, not a vibe — § 11):** all
per-pixel layers (colormap/IR/blackbody, isolines, error heatmap, relief, LIC lookup,
spectrum inset) live in **one uber-composite fragment pass** that reads the state once
and selects layers by uniform flags — coherent branches, no pipeline-permutation
explosion, no repeated field traffic. Bloom and LIC run at half resolution in their own
small passes; the § 10 Tier-3 per-pass GPU timings put the render budget on screen next
to the sim budget.

### 5.6 Web frontend — house four-layer structure + build-time data spine

Adopt the landed rd2d / schrodinger-smoke pattern (four additive layers; nothing here
mutates the compute kernel, capture pinning, gate, or `tolerance*.toml`):

- **INTERACT** — solver toggle (FTCS ↔ spectral), α / substeps / dt sliders (dt annotated
  with the live stability bound; crossing it visibly blows up FTCS while the spectral solver
  stays exact — honest numerics pedagogy, **with containment**: the Tier-1 NaN/Inf scan
  auto-pauses the run, shows a "the scheme diverged — here is the von Neumann bound you
  crossed" callout, and offers one-click reset, so the lesson never soft-locks the demo),
  heat-brush painting + material stamps + probe thermometer, template mini-map,
  record/replay of the interaction stream (§ 8).
- **EXPLAIN** — the two PDEs and both discretizations (FTCS stencil + spectral multiply)
  rendered next to the **committed WGSL lines** (per-term code links extracted at build time
  by `packages/heat-equation/web/gen-verification.mjs`; HARD-FAIL on an unmatched anchor, so
  links are self-healing), plus the stability-bound and two-spectra notes.
- **PROVE** — live "run it twice → identical SHA-256" (spectral path is run-twice
  byte-identical, § 8); **live gate re-run** computing max_abs/max_rel of the FTCS f32 field
  vs the committed f64 canonical *on the visitor's GPU*, displayed verbatim next to the
  declared budget; the per-mode-exact spectral golden recomputed live; the stability clamp
  shown, not hidden.
- **RENDER** — § 5.5, hiDPI, poster/loop generators.

Data spine: a build-time `gen-verification.mjs` (Node builtins only) reads the real
committed values (tolerance rows, gate fn thresholds, canonical manifest, WGSL anchors) and
emits committed `packages/heat-equation/web/src/generated/verification.json` — **no retyped
constants in the UI**; `node gen-verification.mjs && git diff --exit-code` must be idempotent
at HEAD. Standalone-serve constraint: all data rides the Vite bundle; per-sim `public/`
assets referenced as `./x` (no `../../` cross-refs — the known standalone-serve 404 trap).

## 6. Verification posture (Roy 2005 V&V)

- **Code verification:** YES. 2D MMS convergence (observed order); discrete Fourier
  amplification golden; **spectral per-mode machine-exact golden**; erfc/product-form and
  Rosenthal analytic goldens; negative-control unstable-FTCS case.
- **Solution verification:** YES for canonical modes. GCI / Richardson study on MMS and
  Fourier decay at multiple resolutions.
- **Model validation:** NO in v1. The model is linear heat diffusion; no external physical
  experiment is claimed (the Rosenthal/LPBF material is benchmark-of-the-equation +
  literature-anchored diagnostics, not validation — § 4.6, § 10).
- **Calculation verification:** PARTIAL. The circuit-board template compares against a
  lumped **thermal-resistance** hand calculation `K·T=b` (§ 6.4), not an industrial model.

### 6.1 Code-verification honesty note (MMS scope — refuted over-reach, § 2)

MMS's order-of-accuracy test is the recommended, most-sensitive acceptance criterion
(Roy 2005), **but it detects only coding mistakes that affect the observed order of
accuracy.** Same-order errors, round-off, iterative-convergence, and post-processing bugs
are **not** caught by MMS (Salari–Knupp 2000, blind-test protocol). The gate copy says so;
the machine-exact spectral and mass-conservation gates (§ 6.5) cover a different, sharper
class of errors than MMS, which is precisely why the sim carries both.

### 6.2 Exact-vs-continuum gate table (the moat's integrity)

| Quantity | Status | Gate? |
|---|---|---|
| Spectral per-mode decay $\exp[-\alpha|\mathbf k|^2\Delta t]$ (unforced, periodic) | **machine-exact** | ✅ gate (f64 `≤1e-13`) |
| Total heat / mass conservation (periodic, no source) | **machine-exact** (spectral) / measured (FTCS) | ✅ gate |
| Parseval / Plancherel (FFT normalization) | **machine-exact** | ✅ gate `≤1e-13` |
| FTCS discrete amplification $g_h^N$ | exact-to-FP for the discrete method | ✅ golden (two-spectra, § 7 E) |
| 2D MMS observed order = 2.0 ±0.5 | measured-convergent | ✅ code-verif (order test only, § 6.1) |
| Gaussian kernel `σ²=σ₀²+2αt` | analytic (periodization-bounded) | ✅ code-verif |
| erfc / product-form bounded block | analytic (series-truncation-bounded) | ✅ golden (§ 4.5) |
| Rosenthal **thin-plate** steady field ($K_0$) | analytic **of the idealized equation** | ⚠ golden, labeled non-validation (§ 4.6) |
| L2 energy non-increasing (periodic, no source) | continuum property | ⚠ measured (f32 tolerance) |
| Maximum principle (stable FTCS, no source) | continuum property | ⚠ measured (f32 tolerance) |
| DuFort–Frankel at Δt=O(Δx) | **inconsistent** (solves a different eq.) | ❌ negative control, never a gate (§ 3.6) |
| Nonlinear radiation / phase-front toy | illustrative | ❌ ungated by construction (§ 3.7) |

### 6.3 PBT invariants (≥2 required)

- `mass_conserved_periodic_no_source` — periodic BC, zero source: $\sum T$ conserved
  (machine-exact on the spectral path; f32-tolerance on FTCS).
- `maximum_principle_stable_no_source` — stable $\Delta t$, no source, constant-α FTCS keeps
  values within the prior min/max envelope up to f32 tolerance.
- `l2_energy_nonincreasing` — periodic zero-source diffusion: $\|T\|_2$ does not increase.
- `nonnegative_preserved` — nonnegative IC + nonnegative source stay nonnegative under the
  stable explicit update.
- `spectral_per_mode_exact` — seed a single mode; assert its amplitude advances by exactly
  $\exp[-\alpha|\mathbf k|^2\Delta t]$ to machine precision (spectral path).
- `source_integral_accounted` — total heat change equals integrated source plus
  boundary/sink accounting in source-enabled modes.

### 6.4 Calculation-verification hand-check (circuit-board template)

The lumped **thermal-resistance network** `K·T=b` (`T=K⁻¹b`, `K` = conductance matrix, `b` =
loads + BC products) gives a spreadsheet-level junction-temperature estimate for a
multi-chip board; the grid solver's steady state must land within an engineering tolerance
of the network solve on a matched geometry. Not an industrial validation — a hand-check
(§ 2 anchor 18).

### 6.5 Negative controls

- Violate $r_x+r_y\le\tfrac12$ (FTCS) → gate reports `UNSTABLE_EXPECTED`, not pass.
- Flip the Laplacian sign → MMS / Fourier / spectral gates fail.
- Nonconservative material face average → material-interface conservation test catches it.
- Run DuFort–Frankel at $\Delta t=O(\Delta x)$ vs the spectral reference → assert the measured
  deviation grows (it is solving a different equation), locking the § 3.6 honesty claim.
- Compare an FTCS run against the **continuous** $\exp[-\alpha|\mathbf k|^2 t]$ instead of
  $g_h^N$ → the two-spectra control (§ 3.2); the O(Δt) floor appears, proving the goldens
  are distinguishing the two operators.
- Swap the FFT's poly-trig twiddles / precomputed decay tables for WGSL builtin
  `sin`/`cos`/`exp` → the spectral gate must degrade toward the `2⁻¹¹` builtin floor on
  at least one CI adapter (the lavapipe precedent) — locking the § 5.2 precision rule the
  same way the two-spectra control locks the goldens.

## 7. Golden values / Manufactured solutions

House convention: generator `.py` (`--verify`) + derivation `.md` + table `.json` (≥3
independent-reference anchors) under
`tools/testkit/golden/{generator,derivations,tables/volumetric-grid}/`, plus the MMS
directory.

- **A · `heat-equation-spectral-decay.json`** — per-mode machine-exact decay
  $\exp[-\alpha|\mathbf k|^2\Delta t]$ over $(k,\alpha,\Delta t)$. Anchors: Fourier
  diagonalization of $\Delta$; integrating-factor exact solution; the schrodinger
  free-step precedent. **Machine-exact.**
- **B · `heat-equation-fourier-decay.json`** — continuous amplitude
  $\exp[-\alpha(k_x^2+k_y^2)t]$ **and** discrete $g_h^N$ over
  $(m,n,L_x,L_y,\Delta x,\Delta y,\alpha,\Delta t,N)$, with expected f64 NumPy amplitude and
  expected f32/WebGPU tolerance. Anchors: von Neumann analysis; discrete Laplacian symbol;
  the heat-1D free-decay-rate lineage.
- **C · `heat-equation-laplacian-eigenvalues.json`** — paired **continuous**
  ($-\alpha|\mathbf k|^2$) and **discrete** ($-\tfrac{4}{\Delta x^2}\sin^2\tfrac{k\Delta x}{2}-\dots$)
  tables pinning the two-spectra convention (§ 3.2) in a committed artifact both stacks
  recompute — the #1 porting trap made a fixture. Anchors: FD symbol trig identity; Fourier
  symbol of $\Delta$; schrodinger's Eq-17/Eq-18 precedent.
- **D · `heat-equation-erfc-block.json`** — semi-infinite `erfc` + product-form bounded-block
  values with the series-truncation error bound (§ 4.5). Anchors: Carslaw & Jaeger /
  Crank 1975 p. 25 product form; the combined-series analysis (DOI 10.1002/2017WR021040);
  `scipy.special.erfc`.
- **E · `heat-equation-rosenthal-thin-plate.json`** — steady moving-source field
  $T=T_0+\frac{q}{2\pi\lambda g}e^{-Uw/2\kappa}K_0(Ur/2\kappa)$ sampled on probe
  lines/annuli **excluding the source core** (§ 4.6), **labeled non-validation**. Anchors:
  Rosenthal 1946 (thin-plate case); `scipy.special.k0` (f64 generator); the AM-regime
  literature (DOI 10.1016/j.addma.2018.05.032). The 3D thick-plate form is recorded in
  the derivation as the *wrong-dimension counterexample* (v0.3 correction).
- **F · `blackbody-planck-locus.json`** — the § 5.5 glow LUT as a golden table: Planck
  spectral radiance → CIE XYZ (colour-matching-function integration) → sRGB at pinned
  temperature stops. Anchors: Planck's law; CIE 1931 2° colour-matching functions;
  IEC 61966-2-1 sRGB. Cross-checks: Mitchell Charity's blackbody datafile + the Helland
  fit (§ 2 anchor 15). The committed web LUT
  (`packages/heat-equation/web/src/generated/blackbody-lut.json`) must byte-match the
  table's stops at build time.
- **`heat_2d` MMS** — the § 4.4 solution + source, with an acceptance report (observed order
  within ±0.5 of 2.0), mirroring the committed heat-1D acceptance.

## 8. Determinism

**Reference Python:** `bit-exact-same-platform` for f64 NumPy captures (no BLAS in the
stencil path). **The spectral path is a pure grid solver** (FFT → per-mode multiply → IFFT,
no particle scatter, no atomics), so it is run-twice bit-identical on fixed hardware — the
witness run #2 *is* the capture run (schrodinger precedent). NumPy FFT (pocketfft) can
differ at the ULP level across BLAS/FFT builds and hardware → the honest cross-build boundary
is **numeric equivalence**, not byte identity (the R-CPPB2-style caveat already codified for
the repo).

**WebGPU:** `epsilon-same-adapter-same-browser` for f32 canonical runs (FTCS is
reduction-order-free; a fixed FFT pass order keeps the spectral path device-scoped
bit-exact); `epsilon-cross-adapter` for browser/device variation (distributional, the
established boundary).

Two v0.3 additions: (1) the spectral path's decay/twiddle inputs are
**CPU-f64-precomputed buffers** (§ 3.2, § 5.2) — for the gate scene they are emitted at
build time by `packages/heat-equation/web/gen-verification.mjs` and committed, so the
browser run's per-mode multipliers are byte-pinned, not recomputed per visitor;
(2) interaction record/replay would be the repo's **first event-stream replay**
(boids-3d records captures, not events) — events are quantized to substep boundaries at
record time, and replay takes the GPU exclusively (the sph-water RAF/replay exclusivity
lesson).

Determinism descriptors:

```text
heat-equation-fourier-256sq-seed42-step1024
heat-equation-gaussian-512sq-seed42-step2048
heat-equation-circuit-512sq-seed42-step4096
```

Interactive splats are deterministic when the event stream is recorded — the web demo
supports "record interaction" / "replay interaction" so a user can export a reproducible
thermal sketch.

## 9. Equivalence

Equivalence pairs:

- NumPy f64 reference ↔ TypeScript CPU f64 micro-reference (small grids).
- NumPy f64 reference ↔ WebGPU f32 canonical for $128^2/256^2/512^2$ (FTCS **and** spectral).
- Constant-α FTCS ↔ material path with a uniform material buffer (must match bit-for-bit).
- FTCS ↔ spectral on the periodic templates (both converge to the same continuum solution;
  the *difference* is the FTCS truncation error, itself a measured diagnostic).

Metrics: L2 relative, L∞ absolute, total-heat/mass error, Fourier-amplitude error,
diagnostic-scalar agreement.

**Tolerance category — operator decision, flagged (§ 13).** The FTCS canonical path is a
5-point stencil (kin to reaction-diffusion's `[defaults.reaction-diffusion]` 1e-4); the
spectral path's f32↔f64 boundary is FFT-accumulation-specific (kin to
schrodinger's `[defaults.isf]`, which was made its own category for exactly this reason).
**Recommendation:** a new `[defaults.heat-equation]` measured-then-declared from the WGSL-f32
proxy vs f64 reference on the canonical scene, capped by `[budgets.heat-equation]` — do not
reuse a foreign budget by convenience. Proposed starting row (**MEASURE before landing; do
not widen to pass**):

```toml
[heat-equation.numpy_f64__webgpu_f32]
l2_relative = 5e-5
linf_absolute = 5e-5
mass_absolute = 5e-5
fourier_amplitude_relative = 5e-5
```

## 10. Diagnostics

**Tier 1:** NaN/Inf scan; min/max/mean/total heat; stability margin; source integral.

**Tier 2 (scalar-field):** L2-norm monotonicity (no-source periodic); max-principle
violation heatmap; boundary residual (Dirichlet/Neumann); material-interface flux
imbalance; **analytic error heatmap** (Fourier / MMS / erfc / Rosenthal).

**Tier 3 (product):** GPU timing per pass; substeps/frame; effective cell-updates/sec;
dropped-frame counter; current dispatch dims + workgroup size.

**Model-verification instruments (literature-anchored, ungated):** thermal-gradient (K/µm)
and cooling-rate (K/µs) meters on the laser template, annotated against the LPBF regime
(5–20 K/µm, 1–40 K/µs; a stripe-edge 500 °C drop in ~5 ms) — a *comparison to the
literature*, not a gate. Blackbody-color / emissivity honesty note: an emissivity
uncertainty of 0.1 maps to ~40 °C at 1000 °C, so IR-color is illustrative, not a
measurement.

The demo's PROVE layer makes at least three diagnostics visible: **stability margin, analytic
decay overlay (both spectra), and the error heatmap.**

## 11. Build, run, and optimization

Reference tests:

```bash
uv run --no-sync pytest packages/heat-equation/tests/
```

Web:

```bash
cd packages/heat-equation/web && npm install && npm run dev && npm run build
```

Suggested CLI:

```bash
uv run python -m heat_equation --mode fourier   --solver spectral --n 256 --steps 1024 --out captures/heat-equation
uv run python -m heat_equation --mode circuit    --solver ftcs     --n 512 --steps 4096 --out captures/heat-equation
uv run python -m heat_equation --mode rosenthal  --n 512 --out captures/heat-equation
```

**Performance targets:** $512^2$ canonical FTCS at 60 FPS with 4–16 substeps/frame on a
midrange desktop GPU; $1024^2$ at interactive FPS on a discrete GPU; $256^2$ mobile/integrated
fallback; **no CPU readback in the render loop** except optional verification snapshots.

**Optimization — grounded in the stencil-GPU literature (§ 2 anchors 8, 9, 17):**

- **Stencil kernels are memory-bandwidth-bound, not compute-bound.** Micikevicius 2009
  measured a 3D FD kernel sustaining 45–55 GB/s of a 102 GB/s theoretical peak (Tesla
  10-series), roughly independent of stencil order — arithmetic is cheap, bandwidth is
  the wall. Reason on a **roofline**: the win is cutting global-memory traffic, not
  adding FLOPs. Corollary at this sim's scale: a 512² f32 step moves ~4 MB — **the
  render/effects stack, not the FTCS step, is the frame budget**; optimize the composite
  (§ 5.5) before the stencil.
- **Shared-memory tiling + halo.** Load a tile plus its halo into workgroup memory once, then
  compute the interior from on-chip data. Read redundancy is $(nm+kn+km)/(nm)$: a 16×16 tile
  gives ~2× for an order-8 stencil, 32×32 lowers it to ~1.5×. **Wide stencils demand larger
  tiles** (for order-8 the four halo strips cost as much bandwidth as the tile itself). The
  5-point heat stencil is order-2 (k=2), so halo overhead is modest — but the same tiling
  pays off most for the material-flux and gradient passes.
- **Temporal / 2.5D blocking — with its caveat.** Fusing several time steps so intermediate
  slices stay on-chip raises arithmetic intensity and is the standard iterated-stencil win.
  **But it does not improve monotonically:** as blocking depth grows, the bottleneck shifts
  from memory throughput to memory *latency* or *register pressure* (the overhead of
  resolving temporal dependencies grows with depth). Modern low-occupancy deep-blocking work
  (EBISU — "Revisiting Temporal Blocking Stencil Optimizations," ICS'23) reports up to
  2.53× / geomean 1.49× over prior temporal-blocking tools — but
  only by deliberately targeting **low occupancy (≈12.5%)** and spending the freed
  registers/shared memory on locality. This **challenges the "maximize occupancy" folklore**
  directly relevant to WebGPU tile-size tuning: **measure, don't assume.**
- **Workgroup size is empirical — inside WebGPU's limits.** 8×8 / 16×16 / 32×8 are
  starting points; the optimum depends on the stencil, the pass, and the device
  (Micikevicius used 16×16 for stencil-only runs but 32×16 threadblocks computing 32×32
  output tiles for the wider wave kernel). Defaults that bound the search: 256
  invocations/workgroup (**128 in compatibility mode** → 16×16 needs a 16×8 fallback),
  16 KiB workgroup storage; a 1024² f32 field is 4 MiB/buffer, far under the 128 MiB
  storage-binding default. The 64-thread baseline is folklore; the sim must **measure per
  browser/device** and record the choice.
- **Implicit solves:** red-black Gauss–Seidel / SOR in-place (checkerboard); multigrid V-cycle
  for the Poisson-like operator; **PCR/CR-hybrid (Thomas is sequential per system)** for
  ADI tridiagonals — Zhang–Cohen–Owens measured up to 28× vs *sequential CPU LAPACK*
  (12× vs a multithreaded CPU solver), and NVIDIA's production `gtsv` remains a
  PCR+Thomas hybrid (§ 2 anchor 9).
- **Spectral path:** Stockham auto-sort FFT (no bit-reversal; fixed ping-pong pass order —
  the standard GPU formulation per Lloyd et al. TR-2008-62, and the § 8 determinism
  property), **ported from `packages/schrodinger-smoke/web/src/isf_core.wgsl`** to 2D
  batched form (§ 5.2) — public WGSL FFT libraries are immature, so port the house
  kernel, don't add a dependency. The per-mode multiply reads CPU-f64-precomputed factors
  and is trivially parallel — the honest large-step solver.
- **Housekeeping:** ping-pong buffers, no per-frame allocation; encode multiple substep
  dispatches in one command buffer; GPU reductions for diagnostics (CPU reads only reduced
  scalars, low cadence); separate simulation resolution from display resolution; **`shader-f16`
  only as a visual mode — canonical gates use f32**; **never hide the stability clamp — show
  it.**

## 12. References

See § 2 for the full anchor list with DOIs (Crank–Nicolson 1947; Peaceman–Rachford 1955;
Corem–Ditkowski 2012 + DuFort–Frankel 1953; Roy 2005; Salari–Knupp 2000; Zhou et al. 2017
DOI 10.1002/2017WR021040 + Crank 1975; Rosenthal 1946 thin-plate + AM literature;
Cox–Matthews 2002; Micikevicius 2009; Zhang–Cohen–Owens 2010; Lloyd et al. TR-2008-62;
GPU Gems ch. 38; MDN WebGPU / W3C WGSL + Vulkan precision tables; Borland–Taylor 2007;
Kovesi 2015; Crameri 2020; Planck-locus LUT + Helland cross-check; FLIR palettes; COMSOL /
Ansys heat-transfer modules; thermal-resistance networks; prior art § 2.1: Xie/Energy2D
2012, VisualPDE 2023) and the refuted list.

## 13. Productization status

```yaml
productization:
  web: true
  binary: false
  pypi: true
  render: true
  preprint: true
```

Rationale:

- `web: true` — primarily a browser-verification instrument.
- `binary: false` for v1; no Stack-C target planned.
- `pypi: true` — the NumPy reference (FTCS + spectral), captures, and validation utilities.
- `render: true` — thermal-camera loops, circuit-board heat maps, Fourier/spectral decay
  overlay stills, Rosenthal teardrop isotherms, buoyancy-handoff visuals.
- `preprint: true` — a compact demonstration of the Bit-Physics moat: analytic PDE, WebGPU
  compute, live falsifiability, and composition readiness.

### 13.1 Web gate wiring (planned)

- `GATE_KIND["heat-equation"] = "new_canonical"` in
  `tools/productization/web-deploy/pipeline.py` (moat = machine-exact spectral goldens +
  discrete-amplification golden + live f64 reference re-run + run-twice byte-identity; the
  closest precedents are `schrodinger-smoke` / `eulerian-smoke` = "new_canonical"
  live-f64-reference re-run).
- `_gate_heat_equation` in `tools/productization/web-deploy/verify.py`: live f64 reference
  re-run of the canonical scene + run-twice byte-identity + the machine-exact spectral and
  Parseval goldens recomputed live.
- `[defaults.heat-equation]` in `tools/testkit/equivalence/tolerance.toml`, MEASURED-then-
  declared, capped by `[budgets.heat-equation]` in
  `tools/testkit/equivalence/tolerance-budget.toml` (§ 9 operator decision).

### 13.2 Operator decisions (flagged for execution)

1. **Canonical web solver split** — FTCS is the interactive/gated on-screen path; the
   spectral solver is the machine-exact reference + selectable "turbo" solver. Recommend
   shipping both first-class (§ 1, § 3.2).
2. **Tolerance category** — new `[defaults.heat-equation]` vs reuse of
   reaction-diffusion/isf; recommend new + measured (§ 9).
3. **Default template** — circuit-board thermal map (§ 5.4).
4. **DuFort–Frankel** — ship as a labeled negative-lesson toggle, not a solver default
   (recommend include; operator may strike if deliberate wrong-equation display is judged
   off-tone — the rd2d dt-explorer precedent).
5. **FFT placement (v0.3)** — port schrodinger's Stockham into
   `packages/heat-equation/web` vs promote a shared 1D/2D/3D Stockham into
   `common/common-web` (two consumers would then exist); recommend the sim-local port
   first, promotion as a follow-up chip (§ 5.2).
6. **IR / blackbody palette placement (v0.3)** — FLIR-style ramps into
   `common/common-web/src/colormap.ts` (shared facility, never forked) vs web-local;
   recommend common for the ramps, sim-local for the Planck-locus LUT until a second
   consumer appears (§ 5.5, § 7 F).

## 14. Moat and product thesis

The highest-value version of this sim is not "a heatmap toy" — public heat demos already
exist and are named in § 2.1 (Energy2D, VisualPDE, WebHeat, the Shadertoy tier). The
surveyed field splits into sandboxes that *disclaim* accuracy in prose and eye-candy that
never states its scheme's order; none display their own error, gate on it, or tie
rendering to a physical color standard. The Bit-Physics moat is:

1. **Machine-exact spectral truth.** The unforced periodic solver decays each Fourier mode by
   exactly $\exp[-\alpha|\mathbf k|^2\Delta t]$ — a machine-precision gate, the heat analogue
   of schrodinger-smoke's per-mode phase golden.
2. **The exact FTCS update on screen is compared to that reference** — against its own
   **discrete** amplification $g_h^N$, not a hand-wave; the two-spectra table proves the
   goldens distinguish the two operators.
3. **The stability condition is live, enforced, and falsifiable** — the clamp is shown; the
   DuFort–Frankel negative-lesson mode demonstrates what happens when a scheme silently solves
   the wrong equation.
4. **The error field is visible, not hidden** — Fourier, MMS, erfc, and Rosenthal
   (thin-plate) analytic overlays; the live 2D spectrum view with predicted iso-decay
   ellipses (§ 5.5); a live gate re-run on the visitor's GPU.
5. **Templates are visually rich but trace back to the same scalar conservation accounting** —
   erfc (plate), Rosenthal thin-plate (laser), thermal-resistance (board), Gaussian
   kernel — each a *verified* template, not decoration; and even the blackbody glow color
   is physically derived from a committed Planck-locus golden table (§ 7 F). No surveyed
   tool couples blackbody/IR rendering to a live simulated field (§ 2.1).
6. **The temperature field exports as a composition input** — especially for buoyancy-driven
   flow (the plume-handoff gate).

Ship the visual surface as an **instrument**: a user paints heat, drops materials, switches
templates and solvers, exports reproducible captures, and can see — down to a per-mode
machine-exact check — why the numerics are trustworthy.
