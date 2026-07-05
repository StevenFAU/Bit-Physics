# spec-ref.md — curl-noise (procedural divergence-free flow-field particles, canonical reference)

> **Status:** **SPEC v0.3 — EXECUTED 2026-07-05** (v0.1 research → spec; v0.2 review
> pass 2026-07-05: full-text re-verification of all five primary anchors +
> implementation survey + repo audit — noise-basis trig claim REFUTED as stated,
> psrdnoise is NOT trig-free (§ 2.5, § 8); verbatim-quote fixes (§ 1, § 2); DeWolf
> 2005 / Wu 2021 priority (§ 2). **v0.3 EXECUTION CORRECTION (2026-07-05):** the
> v0.2 claim "cross-product fields have pointwise-zero kinetic helicity
> `v·(∇×v) ≡ 0`" is **FALSE** — refuted at execution by counterexample
> (`f₁ = xy, f₂ = z + x²` ⇒ `v = (x, −y, −2x²)`, `∇×v = (0, 4x, 0)`,
> `v·(∇×v) = −4xy ≠ 0`) and by direct f64 measurement on the canonical field
> (|v·(∇×v)| up to ~1e4). The machine-exact identities the flagship DOES have —
> and which golden F now gates — are **gradient orthogonality** `v·∇f₁ ≡ v·∇f₂ ≡ 0`
> (the actual streamline-confinement / chaos-immunity mechanism) and the
> **Clebsch/Euler-potential helicity integrand** `ψ·v ≡ 0` for `ψ = f₁∇f₂`
> (`v = ∇×ψ`); kinetic helicity is displayed honestly NONZERO (§ 3, § 4, § 6.5,
> golden F). Canonical scene retuned at execution (§ 5): octaves 3, ℓ₀ = 0.5,
> dt = 2e-4 — measured f64 reprojected iso-residual max 1.2e-9 across checkpoints (64 RK4 steps);
> hotter fields push the 1-iteration Newton out of its basin.)
> Deep research task `w96xgvh0g` (104 agents, 25/25 claims confirmed at research;
> ONE v0.2 review-pass claim — the helicity zero — refuted at execution).
> Gate rows below were targets, now MEASURED at execution, per the
> `docs/architecture.md` § 2.6 / Appendix D posture (declare-then-measure).
>
> **Category:** `closed-form` · **Method family:** procedural / kinematic
> divergence-free vector fields (curl-noise). Structural sibling of
> `strange-attractors` (`docs/sim-specs/closed-form/strange-attractors/spec-ref.md`):
> both advect passive points through an **analytic velocity field** with a
> Runge–Kutta integrator and **no PDE solve**. The difference is temporal vs spatial —
> strange-attractors integrates an autonomous ODE (a dynamical system in time);
> curl-noise samples a procedural vector field in space. **Operator decision (category
> placement) — flagged, § 13.4:** `closed-form` (recommended, sibling-consistent) vs a
> new `procedural-field` category.
>
> **Primary surface:** web-deployable (Stack B / WebGPU) driven by a verified
> **f64 NumPy reference**, exactly the strange-attractors / schrodinger-smoke posture.
>
> **Operator decision (naming) — flagged, § 13.4.** Filed here as its own top-billed
> identity `curl-noise` (pic-flip / schrodinger-smoke precedent).
>
> **⚠ THE HONESTY BOUNDARY IS THE WHOLE SPEC (§ 1, § 6.3).** Curl-noise is a
> **kinematic/procedural** construction: it *manufactures* an incompressible velocity
> field that can be evaluated anywhere, WITHOUT solving any PDE. It has **no pressure
> projection, no momentum/energy conservation, and no self-advection** — it produces
> "fluid-like velocity fields" (Bridson 2007, verbatim); it looks like fluid without
> being fluid (**our paraphrase** — v0.2 verbatim fix, § 2). The certifiable moat is
> therefore **narrow but real and exactly two properties Bridson himself claims**:
> **incompressibility** (div v = 0) and **boundary tangency** (v·n = 0). It is NOT a
> fluid-dynamics solver and the demo must never be marketed as one.

---

## § 1 Scope

Curl-noise — Bridson, Hourihan, Nordenstam, *"Curl-Noise for Procedural Fluid Flow,"*
SIGGRAPH 2007 sketch (DOI 10.1145/1275808.1276435; author PDF
`cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf`) — with the modern
divergence-free-noise frontier layered on top (§ 2 anchors 3–5).

The **field** is a procedurally-defined, analytically **divergence-free** velocity
field `v : ℝⁿ (×ℝ_time) → ℝⁿ` obtained as the curl of a noise potential:

- **2D:** scalar stream function `ψ`; `v = (∂ψ/∂y, −∂ψ/∂x)` (90° rotation of `∇ψ`).
- **3D (classical):** vector potential `ψ = (ψ₁,ψ₂,ψ₃)` of decorrelated noise;
  `v = ∇×ψ`.
- **3D (frontier — the flagship construction):** cross-product-of-gradients
  `v = ∇f₁ × ∇f₂` (Bærentzen et al., SIGGRAPH Asia 2025). Exactly divergence-free
  (§ 6.1), and its **streamlines are exactly the intersections of the iso-contours
  `{f₁ = f₁(x₀)} ∩ {f₂ = f₂(x₀)}`** — a directly-measurable, closed-form verification
  target (§ 6.2, golden C) that no plain curl-noise offers.

The visible smoke is a **separate, passive Lagrangian tracer system** advected in `v`
by RK2/RK4; tracers do **not** feed back into the field (this decoupling is what makes
the gated state a pure per-point gather — § 8).

**In scope (canonical reference):**

- Analytic-derivative **simplex noise** basis — returns the exact closed-form gradient
  in one call, so the curl needs **no finite differences** (both an optimization and a
  verification target vs FD-convergence, § 6.1). **⚠ v0.2 BASIS CORRECTION (full-text
  verification):** *psrdnoise* (Gustavson & McEwan, JCGT 11(1) 2022) is **NOT trig-free
  as published** — the paper is explicit that gradient generation "for both 2D and 3D
  noise" uses GPU `sin/cos`, on hash-derived angles **unreduced up to ~1120 rad**
  (`theta = hash · 3.883222077`, hash < 289; the 2D path computes `cos/sin(psi)` even
  at rotation `alpha = 0`). The gated default basis is therefore the **trig-free
  predecessor**: webgl-noise-style analytic-gradient simplex — `snoise(vec3, out
  gradient)` per McEwan, Sheets, Gustavson, Richardson, *"Efficient Computational
  Noise in GLSL"* (JGT 16(2) 2012 / arXiv:1204.1461; `ashima/webgl-noise`
  `noise3Dgrad.glsl` lineage, MIT) — permutation-polynomial hash + `fract`-based
  polynomial gradients + polynomial radial falloff: **zero trig on the gated path**
  (port checklist § 2.5; hazard § 8). psrdnoise's tiling/flow extras are not needed
  here; its **optional analytic second derivatives** (supplementary GLSL, +18% cost)
  are the precedent for the in-shader Hessian divergence audit (§ 5, § 10).
- FBM / octave summation (lacunarity, gain). Divergence-freeness is preserved because
  the curl operator is **linear** — `Σ ∇×ψ_octave = ∇×(Σ ψ_octave)` (golden E).
- Boundary no-penetration via **SDF-ramped potential** (§ 3): Bridson multiplicative
  quintic ramp; Curl-Flow additive ramp; cross-product SDF-substitution.
- Time evolution — **executed decision (deviation-with-cause from the v0.2 4D-noise
  coordinate):** per-octave domain translation `x → x + t·drift_o` (a Galilean pan,
  decorrelated across octaves — committed drift table in `fields.py`). At every
  instant the field is a rigid translate of a static field, so spatial
  incompressibility is untouched; a true 4D simplex basis (Houdini
  `curlnoise(vector4 xyzt)` analog) is deferred-with-cause — the analytic 4D
  gradient+Hessian port roughly doubles the gated basis surface for an ungated
  display feature. Spatial incompressibility holds at **every instant** (the curl
  uses only spatial gradients; `t` is a parameter) under either scheme.
- A closed-form **ABC flow** analytic reference field (§ 4) as an exact div-free
  cross-check fixture (the Taylor-Green-reuse analog).

**Out of scope for the reference (labeled beyond-canonical in the web layer, § 13.3):**

- Any claim of solving fluid dynamics. No pressure, no momentum/energy conservation,
  no self-advection (Bridson on FlowNoise-style pseudo-advection: "we have not yet
  tried it" — verbatim, § 2 anchor 1; v0.2 fix: NOT the word "untried"). These are
  **not gated** because there is no PDE to gate (§ 6.3).
- Interaction with a real solver (curl-noise as a turbulence *guide* on top of a coarse
  simulation — a production use, but out of this reference's scope).

**Load-bearing honesty boundary (§ 6.3, repeated verbatim in web copy).** Curl-noise
is procedural/kinematic. Certifiable = **incompressibility** and **boundary tangency**.
NOT certifiable = fluid dynamics, momentum/energy/vorticity conservation, pressure. The
demo is marketed as a **provably-incompressible procedural flow field**, never as a
Navier–Stokes solver.

---

## § 2 Upstream anchors (Cat 1 citations)

1. Bridson, Hourihan, Nordenstam (2007), *"Curl-Noise for Procedural Fluid Flow,"*
   ACM SIGGRAPH 2007 sketches, DOI 10.1145/1275808.1276435. Method core: § 2.1
   `∇·∇×≡0`; 2D `v=(∂ψ/∂y,−∂ψ/∂x)`; 3D vector `ψ`; **FD evaluation** of the potential
   (displacement 10⁻⁴ of domain, "works fine in single precision" — verbatim); Eq. 3
   multiplicative ramp `ψ_constrained = ramp(d/d₀)·ψ`; Eq. 4 quintic C² ramp
   `15/8 r − 10/8 r³ + 3/8 r⁵`; Eq. 5 tangential-only ramp for inviscid `v·n=0`.
   **Primary.**
2. Hyman & Shashkov (1999), *"Mimetic Discretizations… Orthogonal Decomposition
   Theorems,"* SIAM J. Numer. Anal. 36(3):788–818 (`cnls.lanl.gov/~shashkov/papers/siam.pdf`).
   Eqs. 1.7–1.10: **DIV·CURL ≡ 0** and CURL·GRAD ≡ 0 **identically** (machine-exact by
   construction, not O(h)) for compatible/support-operator discretizations; discrete
   orthogonal Helmholtz decomposition; "div A = 0 iff A = curl B." **This is the
   mimetic anchor for the machine-exact divergence gate (§ 6.2, golden A).** Corroborated
   by DEC `d²=0` literature (arXiv:2006.16930). **Primary.**
3. Chang, Partono, Azevedo, Batty (2022), *"Curl-Flow: Boundary-Aware, Divergence-Free
   Fluid Simulation on Curved Surfaces,"* ACM TOG 41(6) / SIGGRAPH Asia 2022,
   arXiv:2104.00867. The **discrete-vs-continuum** result: bilinear interpolation of a
   discretely-incompressible field is **not** pointwise-incompressible (visible particle
   clustering/voids — verbatim); the remedy is to interpolate the **potential** and take
   its **analytic** curl (pointwise incompressible, `∇·u=∇·∇×ψ=0`); additive boundary
   ramp preserving the normal derivative. **Primary — grounds the "don't bake to a
   texture" moat decision (§ 5).**
4. Ding & Batty (2023), *"Differentiable Curl-Noise: Boundary-Respecting Procedural
   Incompressible Flows Without Discontinuities,"* (`cs.uwaterloo.ca/~c2batty/papers/Ding2023/Differentiable_Curl_Noise.pdf`).
   Both Bridson (multiplicative) and Curl-Flow (additive) ramps fail to yield an
   everywhere-C¹ `ψ` (kinks/discontinuities from the C⁰ `min{}` distance and non-unique
   closest-point at the **medial axis** of non-convex obstacles); constructs a C¹ `ψ'`.
   **Primary — the boundary-exactness honesty (§ 6.5) and the medial-axis caveat.**
5. Bærentzen, Martínez, Frisvad, Lefebvre (2025), *"Improving Curl Noise,"* SIGGRAPH
   Asia 2025, DOI 10.1145/3757377.3763980 (`people.compute.dtu.dk/jerf/papers/dfvn_lowres.pdf`).
   Cross-product-of-gradients `c = cross(∇f₁,…,∇f_{n−1})` proven divergence-free in
   **any dimension** via Schwarz (mixed-partial symmetry → determinant terms cancel
   pairwise), contingent on `f_i ∈ C²` (fails on a distance field's medial axis);
   streamlines = iso-contour intersections; **iso-value residual `‖f(x)−f(x₀)‖`** as a
   directly-measurable stopping criterion with a min-norm-Jacobian (Eq. 10) /
   Newton–Raphson (Eq. 12) **reprojection** onto the iso-contours; boundary handled by
   **substituting one noise function with the surface SDF** (`c` tangent to the surface).
   **Primary — the flagship 3D construction, the iso-value gate, and SDF-substitution
   boundary.**

**Cat-2 / implementation references (search-surfaced 2026-07-05, expanded at v0.2
review — design references, not certified facts):** McEwan, Sheets, Gustavson,
Richardson, *"Efficient Computational Noise in GLSL,"* JGT 16(2) 2012 /
arXiv:1204.1461 + `ashima/webgl-noise` `noise3Dgrad.glsl` (MIT — **the v0.2 default
gated basis**, § 2.5); Gustavson & McEwan, *"Tiling Simplex Noise and Flow Noise in
Two and Three Dimensions,"* JCGT 11(1) 2022 (psrdnoise, exact analytic derivatives +
optional second derivatives; official MIT **WGSL** port by Gustavson in
`stegu/psrdnoise` — structure reference, trig caveat § 2.5); DeWolf,
*"Divergence-free noise"* (2005 note — cross-product priority); Wu (atyuwen),
*"bitangent noise"* (2021 — shipping GPU `∇f₁×∇f₂`; measured ~1.33× one simplex eval
vs ~2.6× for classic 3-gradient curl on GTX 1060; **license CC BY-NC — code must NOT
be ported**, § 2.5); Kniss & Hart 2004 (curl-of-noise core Bridson credits); Perlin &
Neyret, *"Flow Noise,"* SIGGRAPH 2001 sketch (rotating gradients for swirl —
trig-based, § 8 hazard note); Perlin, *"Improving Noise,"* SIGGRAPH 2002 (quintic
fade); stegu `sdnoise1234.h` (simplex-with-derivatives C reference); Brian Sharpe,
*"Analytical Noise Derivatives"* (2015 blog). ABC flow: Dombre et al., *"Chaotic
streamlines in the ABC flows,"* J. Fluid Mech. 167 (1986). Production: Houdini
`curlxnoise` VEX (**exactly the flagship `∇f₁×∇f₂` construction, `vector4 xyzt`
signature** — production precedent for both the flagship and 4D time) + `curlnoise`;
Unreal Niagara *Curl Noise Force* (analytic simplex **Jacobian** via
`JacobianSimplex_ALU` in `Random.usf`: curl from the antisymmetric part, **div =
trace(J)** — precedent for the free in-shader divergence audit, § 5); Unity VFX Graph
*Turbulence* block (control-set precedent: octaves / roughness / intensity /
lacunarity / field transform); Emil Dziewanowski, *"Dissecting Curl Noise"*
(texture-bake tradeoff + SDF-gradient boundary, engine-side); KAYAC WebGPU 1M-particle
demo (FD curl = **18 noise evals/particle/frame** — the cost contrast the analytic
path removes); Peter, *"Particle System in WebGPU"* (TU Wien 2023 — 10M instanced
quads @ 63 FPS on GTX 1060; instancing↔vertex-pulling crossover ≈ 4M particles);
Mapbox / earth.nullschool wind maps (persistence-trail rendering lineage, web spec
§ 5). **No throughput/FPS figure is asserted as fact anywhere in this spec — v0.2
design-reference figures above inform the web budget (web spec § 5.5) but the RENDER
HUD remains the only asserted number (§ 5).**

**Do NOT overclaim (research caveats, verbatim discipline):**
- The continuum `div(∇×)≡0` identity does **NOT** transfer to Bridson's plain FD curl
  as a machine-zero discrete claim — Bridson 2007 uses finite differences and asserts
  no discrete exactness. "Analytic-derivative curl noise" is a **later variant**, a
  genuine frontier improvement, not the original method.
- The machine-exact discrete `DIV·CURL≡0` (anchor 2) is a property of the **mimetic /
  compatible operator family specifically** — it does **not** license calling an
  arbitrary staggered/FD curl "machine-exact." A demo claiming machine-zero discrete
  divergence must state which of the three routes (§ 6.2) it uses.
- The medial-axis / bounded-curvature SDF caveat and the cross-product construction
  belong to Bærentzen 2025 / DeWolf–von Funck lineage, NOT Bridson; the additive-ramp
  and C¹ critiques belong to Chang 2022 / Ding 2023, NOT Bridson. **Priority (v0.2):**
  the cross-product-of-gradients idea is **DeWolf 2005**, independently rediscovered as
  **Wu 2021 "bitangent noise"**; Bærentzen et al. 2025 contribute the nD generalization,
  the proof, and the iso-value residual / reprojection scheme. Bridson himself credits
  **Kniss & Hart 2004** for the curl-of-noise core — his contribution is boundaries +
  modulation. Cite accordingly.
- **Verbatim discipline (v0.2 fixes — full-text checked):** Bridson's actual words are
  "fluid-like velocity fields"; "looks like fluid without being fluid" is OUR
  paraphrase, never labeled verbatim. Bridson writes "we have not yet tried it" of
  pseudo-advection (not "untried"). Bridson never calls the Eq. 4 ramp "quintic" or
  "C²" — both are correct *derived* labels (ramp′(±1)=ramp″(±1)=0), stated as ours.
  **No "stringy/laminar" critique of classic curl noise appears in Bærentzen 2025** —
  do not cite that paper for it (the laminar observation belongs to the helicity
  argument, § 3, as our derived note).
- **Ding & Batty 2023 scope (v0.2):** the paper is **2D-only** (static, simple
  polygonal obstacles), and its C¹ `ψ'` yields a merely **continuous** velocity. It
  grounds the medial-axis *problem statement* in any dimension, but the *fix* only in
  2D — the golden-D boundary-comparison rows honor this (§ 7).
- The word "verification/certification" is **this repo's** framing — the source papers
  report image-RMSE and particle-distance metrics, never "certification." A legitimate
  reuse, but not presented as the papers' own claim.
- **Mimetic stencil pairing (v0.2, Hyman & Shashkov nuance):** `DIV·CURL ≡ 0` holds for
  the **natural** face-flux DIV composed with the **natural** edge-circulation CURL (or
  adjoint-with-adjoint) on the correct staggered spaces; mixing a natural with an
  adjoint operator yields a NON-zero compound. The route-A witness pins the
  natural/natural pair (§ 6.2). "Machine-exact" in floating point is our (sound)
  inference from term-by-term telescoping — the paper's `≡ 0` is exact-arithmetic
  operator identity.

### § 2.5 Noise-basis port checklist (v0.2 — load-bearing constants)

Full-text verification (JCGT 11(1) § 7 + reference GLSL) surfaced three demo-breaking
facts any simplex port MUST honor; the web build HARD-FAILs on the first two
(web spec § 6):

1. **Radial falloff `(0.5 − r²)⁴`, NOT Perlin's `(0.6 − r²)⁴`.** The 0.6 constant makes
   the region of influence too large: "the noise and its gradient have discontinuities
   at simplex boundaries" (JCGT § 7, citing Sharpe 2012) — i.e. **divergence spikes
   exactly where the gate looks**. Smoothness ladder (derived, v0.2): `(0.5−r²)⁴` ⇒
   noise **C³** ⇒ velocity **C²** ⇒ `div(∇×ψ)=0` holds classically with one class of
   margin; psrdnoise's `(0.5−r²)³` is exactly **C²** (zero margin). The reference uses
   k = 4.
2. **Permutation polynomial `((34x + 10)·x) mod 289`, NOT the older `(34x + 1)·x`** —
   the old constant produces "frequent diagonal streaks" (JCGT § 7); stock
   `ashima/webgl-noise` master still carries the streaky constant, so the port fixes it.
   **EXECUTION DEVIATION (v0.3, measured — an improvement over the float-emulation
   idiom):** the hash chain AND every discrete gradient-selection decision are computed
   in **exact integer arithmetic** (int64 in the f64 reference; u32/i32 in WGSL — WGSL
   has integer types; the float `mod289` emulation was a GLSL-ES-1.0 workaround).
   Measured at execution: float `x·(1/289)` rounds differently in f32 vs f64 near
   multiples of 289, and the octahedron-edge sign selection (`gh == 0` cells exist
   exactly: `|4x′−13| + |4y′−13| == 14`, 7 of the 49 hash cells) flips between
   precisions — the f32↔f64 iso-residual blew up to **O(1), the field scale**, with
   float-emulated selection, and dropped to the genuine f32 floor **1.19e-5** with
   integer selection (the tolerance-category basis, § 13.2). Simplex-boundary
   cell-assignment ties remain float but are harmless BY the 0.5-falloff pinning
   (the kernel vanishes there through three derivative classes — item 1 is
   load-bearing for the cross-precision gate, not just smoothness). The f16 ban
   stands for all gated arithmetic (web spec § 5).
3. **License:** atyuwen `bitangent_noise` (the shipping GPU `∇f₁×∇f₂` precedent) is
   **CC BY-NC 4.0 — its code must NOT be ported into this repo.** The construction is
   implemented from the math (DeWolf 2005; Bærentzen 2025 proof) on top of the MIT
   bases (`ashima/webgl-noise`; `stegu/psrdnoise` WGSL port as structure reference).

---

## § 3 Algorithm

**Field construction (continuum).**

```
2D scalar:      v = (∂ψ/∂y, −∂ψ/∂x),        ψ = FBM_octaves(noise_analytic)
3D classical:   v = ∇×ψ,                     ψ = (n₁, n₂, n₃)  (decorrelated offsets)
3D frontier:    v = ∇f₁ × ∇f₂                (flagship; iso-contour streamlines)
FBM:            ψ (or each f_i) = Σ_o  a_o · noise(x / ℓ_o),   ℓ_o = ℓ₀·lac^{−o}, a_o = gain^o
Time:           noise(x, t)  via a 4th coordinate w = t        (spatial curl only)
```

**Analytic derivatives (the optimization + verification target).** The velocity needs
only the **first** derivatives of the potential — `∇ψ` (2D) or `∇f₁, ∇f₂` (3D).
`psrdnoise`/`sdnoise` return `(value, gradient)` in a single evaluation, exactly, so
`v` is computed with **no finite-difference stencil** at all. Bridson 2007 by contrast
finite-differences the potential (displacement `h = 10⁻⁴·L`); the analytic path removes
that O(h²) truncation error — MEASURED against an FD gradient in golden B.

**Boundary no-penetration (SDF ramp).** Making the solid surface an **isocontour of `ψ`**
forces `v` tangent (`v·n=0`), because `v ⊥ ∇ψ` and on an isocontour `∇ψ ⊥ surface`:

```
Bridson multiplicative:  ψ' = ramp(d(x)/d₀) · ψ,   ramp(r)=15/8 r − 10/8 r³ + 3/8 r⁵ (C², r∈[0,1]),  d₀ = ℓ₀
Curl-Flow additive:      ψ' = ψ + (ψ_g − ψ(cp(x)))·(1−α)     (preserves ∂ψ/∂n → better free-slip)
Cross-product (3D):      v = ∇(SDF) × ∇f₂     (v tangent to the SDF iso-contours by construction)
```

`d(x)` = signed distance, `cp(x)` = closest surface point, `α = ramp(d/d₀)`. No-penetration
is **continuum-exact for smooth boundaries**; the discretized enforcement is **O(h)**;
exactness degrades at the **medial axis / sharp edges** (non-unique `cp`, C⁰ `min{}` —
Ding & Batty 2023). Bridson himself flags the inviscid `v·n=0` as an *approximation* of
viscous flow.

**Passive tracers (visualization).** RK2 (default) / RK4 advection of massless points
in `v`. Tracers have their own advective CFL `|v|Δt/Δx_seed ≲ 1`. **Frontier reprojection
(cross-product only):** after each RK step, an optional Newton step (anchor 5 Eq. 12)
projects the tracer back onto `{f₁=f₁(x₀)} ∩ {f₂=f₂(x₀)}`, driving the iso-value residual
`‖f(x)−f(x₀)‖` toward machine zero — the on-manifold verification instrument (§ 6.2).
**Defaults pinned by Bærentzen's measurements (v0.2):** **one** Newton iteration
saturates (RMSE 3.861 for 1 vs 3.882 for 10), and "64 steps of RK4 with reprojection
beats 512 steps of Euler integration both in terms of performance and RMSE error"
(M1 Max, image-warp @1024×576) — reprojection, when on, defaults to a single iteration.

**Bridson potential primitives (v0.2 — additional closed-form building blocks).**
Bridson 2007 also gives, in closed form: a **rigid-body potential** (his Eq. 6 — the
boundary treatment for *moving* solids), **vortex particles** (Eq. 7), and **vortex
curves** (Eq. 8 — smoke rings and plumes) as superposable potential primitives, plus a
scaling law worth exposing as the honest octave-weighting knob: a potential of
magnitude `A` varying over length scale `L` induces vortices of diameter ~`L` with
speeds ~`A/L`, so per-octave *speed* control weights `a_o·ℓ_o`, not `a_o`. All are
added to `ψ` — div-free preserved by linearity — and become templates/brushes in the
web layer (§ 13.3).

**Streamline-confinement dichotomy & the chaotic-streamline trap (v0.3 —
execution-corrected).** Steady 3D div-free fields split into two streamline regimes,
and the split is **whether the construction supplies invariants of the flow**:

- **Cross-product streamlines are never chaotic — because they are confined, not
  because helicity vanishes.** `v = ∇f₁×∇f₂` is orthogonal to both factor gradients
  (**`v·∇f₁ ≡ v·∇f₂ ≡ 0`**, a triple product with a repeated vector — machine-exact,
  golden F), so `f₁` and `f₂` are exact invariants and every streamline is confined
  to the codim-2 iso-intersection `{f₁=c₁}∩{f₂=c₂}` ⇒ **integrable** — which is *why*
  the iso-value residual is a legitimate, chaos-immune gate for the flagship. A
  second machine-exact identity: for the Clebsch/Euler potential `ψ = f₁∇f₂`
  (`v = ∇×ψ`), the helicity **integrand in that gauge** vanishes, `ψ·v ≡ 0` (hand
  proof: `f₁∇f₂·(∇f₁×∇f₂) = 0`). **⚠ v0.3 CORRECTION: the kinetic helicity density
  `v·(∇×v)` is NOT pointwise zero for cross-product fields** — counterexample
  `f₁ = xy, f₂ = z+x²` gives `v·(∇×v) = −4xy`; the canonical field measures |v·(∇×v)|
  up to ~1e4. The v0.2 "zero helicity ⇒ laminar look" note is retired with it (the
  flagship's look is set by confinement to smooth iso-surfaces, still laminar-leaning
  vs the unconstrained `∇×ψ` templates — derived note, ours).
- **Unconstrained fields (classic `∇×ψ`, ABC) generically have chaotic streamline
  regions.** ABC is the Beltrami pole (`∇×v = v`, helicity density `|v|²`); chaotic
  regions coexist with regular KAM-type regions, and the flow is integrable when any
  one of A,B,C vanishes (Dombre et al. 1986) — phrase as "chaotic regions exist,"
  never "chaotic everywhere." For these, a long-window **pointwise** f32↔f64 tracer
  match diverges exponentially (Lyapunov), exactly like `strange-attractors` and the
  chaotic-TG scene in schrodinger-smoke.

The reference therefore gates on **chaos-immune** quantities only: the iso-value
residual (distance to the manifold, invariant under sliding *along* it — and even the
integrable flagship accumulates unbounded *along-manifold* drift, so pointwise match
stays off the table there too), the discrete-divergence field, and run-twice
byte-identity — never raw pointwise trajectory match over many steps (§ 9). The two
poles are themselves a golden-table target (gradient-orthogonality + Clebsch-integrand
identities vs Beltrami residual — golden F, § 7).

---

## § 4 Algebraic form

- **Incompressibility ↔ construction.** `div v = div(∇×ψ) ≡ 0` (2D/3D curl) and
  `div(∇f₁×∇f₂) = ∇f₂·(∇×∇f₁) − ∇f₁·(∇×∇f₂) = 0 − 0 = 0` (cross-product), both from
  `∇·(∇×)≡0` / `∇×(∇)≡0`, i.e. **Schwarz/Clairaut mixed-partial symmetry**, exact for
  `C²` potentials. **Continuum-exact; discretization-dependent (§ 6.2).**
- **Boundary tangency ↔ isocontour.** `v·n=0` on `{ψ = const}` (2D) / when one
  cross-product factor is the SDF (3D). **Continuum-exact for smooth boundaries; O(h)
  discretized.**
- **FBM linearity.** `∇×` is linear ⇒ a sum of octave potentials has the sum of octave
  curls, still exactly div-free (golden E). Amplitude/frequency scaling changes spectrum,
  never divergence.
- **ABC flow (closed-form reference).** `v = (A sin z + C cos y, B sin x + A cos z,
  C sin y + B cos x)` has `div v = 0` **identically** (each term's partial is in a
  different variable). Streamlines chaotic for generic `A,B,C` — reused as an analytic
  ground-truth field (§ 6.1, golden E) and a display template (§ 13.3), the
  Taylor-Green-reuse analog.
- **Confinement / Clebsch identities (v0.3 — golden F, execution-corrected).**
  Cross-product: `v·∇f₁ ≡ v·∇f₂ ≡ 0` (triple product with a repeated vector) and
  `ψ·v ≡ 0` for the Clebsch potential `ψ = f₁∇f₂` — both machine-exact from analytic
  gradients. The kinetic helicity `v·(∇×v)` is **NOT** zero for cross-product fields
  (v0.3 correction, § 3) — it is displayed, honestly nonzero. ABC: Beltrami
  `∇×v = v` ⇒ helicity density `= |v|²` and Beltrami residual `‖∇×v − v‖ ≡ 0`. The
  two poles of § 3's dichotomy, both closed-form and both gateable.
- **What is NOT here (honesty).** No pressure Poisson, no momentum/energy balance, no
  vorticity transport. The only "dynamics" is time-varying/4D noise plus superposable
  primitives. Vorticity `ω = ∇×v` is *displayable* but obeys no conservation law here.

---

## § 5 Implementation

**Reference:** `packages/curl-noise/curl_noise/reference/curlnoise.py` — NumPy f64.
Pure per-point analytic evaluator (no particle scatter, no grid solve). Deterministic
same-hardware (§ 8). Mirrors the strange-attractors reference structure
(`packages/strange-attractors/strange_attractors/reference/`).

Core surfaces (planned):

- `simplex_noise_grad(x, seed) -> (value, grad)` — analytic-derivative simplex noise
  (psrdnoise-equivalent, f64); the single primitive everything is built from.
- `potential_2d(x, cfg) -> (psi, grad)` and `potential_3d(x, cfg) -> (f1,f2, grad1,grad2)`
  — FBM octave sums with the analytic gradients threaded through.
- `velocity(x, cfg) -> v` — the curl / cross-product construction (2D rot, 3D `∇×`,
  3D `∇f₁×∇f₂`), selected by `cfg.construction`.
- `apply_boundary(psi_or_f, sdf, cfg) -> ...` — Bridson multiplicative + Curl-Flow
  additive + cross-product SDF-substitution ramps.
- `discrete_curl_field(psi_grid, dx) -> v_faces` and `discrete_divergence(v_faces, dx)`
  — the **matched** staggered-grid discrete curl + divergence whose composition
  telescopes to machine-zero (§ 6.2, golden A). The mimetic/DEC exact-sequence witness.
- `iso_value_residual(x, x0, cfg) -> ‖f(x)−f(x0)‖` and `reproject(x, x0, cfg) -> x` —
  the cross-product on-manifold residual + Newton reprojection (anchor 5; default 1
  iteration, measured saturation § 3).
- `hessian(x, cfg) -> H` — analytic second derivatives of the noise (psrdnoise
  supplementary-GLSL precedent, +18% cost there): powers the closed-form
  `div = trace(J_v)` audit (the identity Niagara's `JacobianSimplex_ALU` exposes) and
  the golden-C/F Hessian identities.
- `helicity_density(x, cfg) -> v·(∇×v)` — kinetic helicity, displayed honestly
  NONZERO for all constructions (v0.3 correction); plus the machine-exact flagship
  identities `gradient_orthogonality(x, cfg) -> (v·∇f₁, v·∇f₂)` and
  `clebsch_helicity_integrand(x, cfg) -> ψ·v` (`ψ = f₁∇f₂`); Beltrami residual
  `∇×v − v` for ABC (golden F).
- `abc_flow(x, A, B, C) -> v` — the closed-form div-free reference field.
- `advect(points, cfg, steps, capture_manifest=None) -> CurlResult` — RK2/RK4 trajectory
  + 2-run bit-identity witness (asserted before any capture write; § 8).

`CurlResult` measured diagnostics (measured-then-declared): `discrete_div_max` (matched
stencil → machine-zero), `analytic_div_probe_max` + convergence order (independent
stencil → O(h²)), `gradient_mms_order` (analytic vs FD gradient slope), `iso_residual_max`
(with/without reprojection), `boundary_vn_max` + convergence (obstacle scenes),
`fbm_div_linearity_max`, `grad_orthogonality_max` + `clebsch_integrand_max`
(cross-product scenes → machine-zero; the honest `kinetic_helicity_max` alongside —
v0.3 correction; ABC → Beltrami residual `max‖∇×v−v‖`),
`determinism_witness_sha256`.

**Grid / params (canonical — MEASURED at execution).** Reference field seed fixed
(committed permutation-polynomial hash; no tables); canonical scene: octaves = 3,
lacunarity = 2.0, gain = 0.5, `ℓ₀ = 0.5`, amplitude 1.0, sphere obstacle center
(0.5,0.5,0.5) radius 0.18, ramp width 0.15; tracers 4096 (seed 42), 64 RK4 steps at
`dt = 2e-4`, reprojection 1 iteration — measured f64 reprojected iso-residual
max 1.2e-9 across capture checkpoints (no-reprojection control 4.3e-5, the O(Δt⁴) row). Retuned from the v0.2
draft (octaves 4, `ℓ₀ = 0.4`): the hotter field's `max|v|·dt` approached the finest
octave wavelength and pushed the 1-iteration Newton out of its convergence basin
(residuals O(1) — measured, the reason the tune is pinned). Display templates may
run hotter; the GATE scene must not. The staggered-grid witness runs at
`N ∈ {32,64,128}` for the divergence/MMS convergence tables.

**Perf note (honest — no throughput asserted).** No particle-count or FPS figure is
asserted as fact. v0.2: named design-reference figures now exist (§ 2 Cat-2 — TU Wien
10M quads @ 63 FPS GTX 1060; KAYAC 1M @ M1 with 18 FD evals/particle; atyuwen
cross-product ≈ 1.33× one simplex eval) and inform the web budget (web spec § 5.5),
still labeled non-certified. The per-tracer analytic field eval is embarrassingly
parallel and grid-free; the count is **MEASURED in the web HUD**, never asserted
(§ 13.2, schrodinger-smoke precedent).

---

## § 6 Verification posture (Roy 2005 V&V; architecture § 2)

### 6.1 Code verification (MMS / analytic)

- **Analytic-gradient MMS (the core code-verification gate).** The analytic noise
  gradient `∇(noise)` vs a central-difference gradient converges at **O(h²)** as the FD
  step `h → 0`; the psrdnoise/sdnoise derivatives are exact closed forms, so the slope
  is the check (golden B). This certifies the derivatives the velocity is built from.
- **ABC-flow exactness.** The closed-form ABC field reproduces `div v ≡ 0` analytically
  and its velocity matches the closed form to machine precision — an analytic ground
  truth independent of the noise basis (golden E anchor).
- **Cross-product divergence identity.** `div(∇f₁×∇f₂) = 0` via analytic Hessians:
  the mixed-partial terms `H_xy − H_yx` cancel bit-exactly when computed by a symmetric
  analytic formula (golden C). Machine-zero (exact arithmetic; subject to ordinary FP
  rounding of the surviving terms).

### 6.2 Solution verification (the divergence moat — three honest routes)

Discrete machine-zero divergence is achievable but **only** under a compatible
construction; the reference states which route each instrument uses:

- **Route A — matched staggered-grid curl (mimetic/DEC).** Build `v` as the *matched*
  discrete curl of a discrete potential on a MAC grid; the *matched* discrete divergence
  **telescopes to machine-zero** (each potential node enters the cell balance with `+1`
  and `−1`), the `DIV·CURL≡0` null-space identity of Hyman & Shashkov 1999. Declared
  ceiling `≤ 1e-13` (f64). **This is the "certified div-free to machine precision"
  flagship** (golden A). HONESTLY LABELED a property of the compatible operators — it
  does **not** transfer to the per-tracer analytic sampling. **Pairing caveat (v0.2):**
  the identity requires the *natural* DIV with the *natural* CURL (or adjoint with
  adjoint) — a natural/adjoint mix is NON-zero (§ 2 overclaim block); the witness pins
  the natural/natural pair.
- **Route B — analytic curl of an interpolated potential (Curl-Flow).** Interpolate the
  discrete potential, take its analytic curl → pointwise (sub-cell) incompressible
  everywhere. The route the per-tracer field effectively uses (the potential is the
  closed-form noise, so "interpolation" is exact evaluation).
- **Route C — same-stencil nested FD.** With the SAME displacement used throughout,
  mixed partials `ψ_xy = ψ_yx` cancel to ~1e-15 (a verifier reproduced this: same
  stencil → machine-zero; an **independent** probe stencil `g` → O(g²), e.g. `h=1e-4,
  g=1e-2 → max|div|≈4.4e-5`).
- **Continuum divergence probe (measured-convergent).** An **independent-stencil** FD
  divergence of the per-tracer analytic field → **O(h²) → 0**. Certifies the analytic
  field is genuinely div-free (the residual is the probe's truncation error, vanishing
  at 2nd order). Declared as a convergence slope, not a machine-zero ceiling (golden A,
  second table).
- **Iso-value residual (measured-convergent → machine-zero with reprojection).** For
  the cross-product field, `‖f(x(t))−f(x₀)‖` grows as `O(Δtᵖ)` under RK-p integration
  and is driven to machine-zero by Newton reprojection (golden C). A **chaos-immune**
  on-manifold instrument.

### 6.3 Model verification (honesty boundary)

Curl-noise solves **no** PDE. There is no model-to-Navier-Stokes error to converge — the
reference records the honesty statement, not a "matches fluid" gate. Where curl-noise is
used as a turbulence *guide* on a real solver (production), that coupling is out of scope.
**No momentum/energy/vorticity conservation is claimed or gated.**

### 6.4 Calculation verification (conservation — what little there is)

- **Incompressibility** (div v = 0) — the ONE genuine conservation-like invariant:
  machine-exact on the matched grid (route A), O(h²) on the analytic field. Gated.
- **FBM divergence-linearity** — div-free preserved under octave summation; machine-zero
  on the matched grid (golden E). Gated.
- **Kinetic "energy"** `½Σ|v|²` — *displayable* but obeys **no** conservation law (no
  dynamics); tracked, **NOT gated**.

### 6.5 Gate status — exact vs continuum (the moat's integrity)

| Quantity | Status | Gate? |
|---|---|---|
| Matched staggered-grid discrete `max\|div v\|` (route A telescoping) | **machine-exact** | ✅ gate `≤1e-13` |
| Cross-product `div(∇f₁×∇f₂)` via analytic Hessian | **machine-exact** | ✅ golden C |
| FBM octave-sum stays div-free (matched grid) | **machine-exact** | ✅ golden E |
| Cross-product gradient orthogonality `v·∇f₁`, `v·∇f₂` | **machine-exact zero** | ✅ golden F (v0.3) |
| Cross-product Clebsch integrand `ψ·v`, `ψ = f₁∇f₂` | **machine-exact zero** | ✅ golden F (v0.3) |
| Cross-product kinetic helicity `v·(∇×v)` | **NONZERO** (v0.3 correction) | ❌ NOT a gate — displayed honestly |
| ABC Beltrami residual `‖∇×v − v‖` | **machine-exact zero** | ✅ golden F |
| Iso-value residual with Newton reprojection | **machine-zero (reproject)** | ✅ golden C |
| Analytic noise gradient vs FD (O(h²) MMS) | measured slope | ✅ code-verif (MEASURED) |
| Per-tracer analytic field `max\|div v\|` (independent probe) | continuum-exact, **O(h²)** | ⚠ measured-convergent |
| Iso-value residual under RK, no reprojection | **O(Δtᵖ)** | ⚠ measured-convergent |
| Boundary no-penetration `max\|v·n\|` (smooth surface) | continuum-exact, **O(h)** | ⚠ measured-convergent |
| Boundary near medial axis / sharp edge | **degrades** (C⁰ `min{}`, non-unique cp) | ❌ NOT a gate — documented limit |
| Kinetic "energy" `½Σ\|v\|²` | no conservation law (kinematic) | ❌ NOT a gate — illustrative |
| Momentum / vorticity / pressure | **no PDE** | ❌ NOT gateable — never claimed |

### 6.6 PBT invariants (≥ 2 required; architecture § 2.14)

1. **`matched_curl_divergence_machine_zero`** — for random potentials on random
   `N ∈ {32,64,128}` grids, the matched staggered-grid discrete divergence `≤ 1e-13`
   (telescoping). Machine-exact. (Route A.)
2. **`analytic_divergence_converges`** (scale-free) — the independent-probe divergence
   of the analytic field decreases as `O(h²)` under stencil refinement (slope in
   `[1.7, 2.3]`), and `fbm_octave_sum` never raises it above the single-octave floor.
3. *(bonus)* **`gradient_matches_fd`** — analytic noise gradient vs central-difference,
   O(h²) convergence, swept over seeds/positions.
4. *(bonus, cross-product)* **`isovalue_residual_reprojects_to_zero`** — Newton
   reprojection drives `‖f(x)−f(x₀)‖ ≤ 1e-12`, swept over start points.
5. *(bonus, cross-product — v0.3 corrected)* **`confinement_identities_zero`** —
   `|v·∇f₁|, |v·∇f₂| ≤ 1e-12·scale` and `|ψ·v| ≤ 1e-12·scale` (`ψ = f₁∇f₂`) via
   analytic gradients, swept over seeds/positions; the kinetic helicity `v·(∇×v)` is
   asserted NONZERO on the same sweep (the honest counter-row); ABC control rows
   assert the Beltrami residual instead (golden F).

---

## § 7 Golden values / MMS

House convention: generator `.py` (`--verify`) + derivation `.md` + table `.json`
(≥ 3 independent-reference anchors), under
`tools/testkit/golden/{generator,derivations,tables/closed-form}/`.

- **A · `curl-noise-divergence.json`** — two paired tables: (1) matched staggered-grid
  discrete `max|div v|` → machine-zero (~1e-15, f64) over random potentials; (2)
  independent-probe divergence of the analytic field → O(h²) slope over `h`-refinement.
  Anchors: Hyman & Shashkov 1999 `DIV·CURL≡0` (Eqs. 1.7–1.10); telescoping-sum hand
  proof; DEC `d²=0` (arXiv:2006.16930); Curl-Flow bilinear `∇·u=(u_r−u_l+v_t−v_b)/h=0`.
- **B · `curl-noise-gradient-mms.json`** — analytic noise gradient vs central-difference
  → O(h²) convergence slope, per `(seed, position, h)`. Anchors: webgl-noise
  `noise3Dgrad` analytic derivatives (McEwan et al. 2012 — the v0.2 default basis,
  § 2.5); psrdnoise exact derivatives (Gustavson & McEwan JCGT 2022); sdnoise (stegu);
  Taylor-truncation O(h²); SymPy symbolic gradient of the simplex kernel.
- **C · `curl-noise-crossprod.json`** — (1) `div(∇f₁×∇f₂)=0` via analytic Hessian
  (machine-zero); (2) iso-value residual `‖f(x)−f(x₀)‖` under exact integration → 0,
  under RK2/RK4 → O(Δtᵖ), with Newton reprojection → ≤1e-12. Anchors: Bærentzen 2025
  Schwarz proof + Eqs. 10/12; vector identity `∇·(∇f×∇g)≡0`; SymPy verification.
- **D · `curl-noise-boundary.json`** — `max|v·n|` on a sphere SDF (3D) and a cylinder
  SDF (2D): continuum-exact isocontour (analytic) vs O(h) discretized, with the measured
  convergence ratio; a medial-axis probe row documenting the degradation (labeled
  NOT-a-gate). Anchors: Bridson 2007 Eqs. 3–5 (isocontour + quintic ramp); Curl-Flow
  additive ramp (Fig. 8 / Eq. 13); Ding & Batty 2023 C¹ construction + medial-axis
  caveat (**2D-only fix, § 2 — the C¹-remedy rows live on the 2D cylinder scene; the 3D
  sphere rows document the problem, not the remedy**).
- **F · `curl-noise-helicity.json`** (v0.3 — execution-corrected) — (1) cross-product
  **gradient orthogonality** `v·∇f₁ → 0`, `v·∇f₂ → 0` machine-zero, swept over
  points/seeds; (2) cross-product **Clebsch helicity integrand** `ψ·v → 0`
  (`ψ = f₁∇f₂`, `v = ∇×ψ`) machine-zero; (3) an honest **kinetic-helicity control
  row**: `v·(∇×v)` measured NONZERO on the same sweep (the v0.2 zero-claim, refuted
  by counterexample `f₁=xy, f₂=z+x²` ⇒ `v·(∇×v) = −4xy`); (4) ABC Beltrami residual
  `∇×v − v ≡ 0` and helicity density `= |v|²`. Anchors: triple-product hand proofs
  (repeated-vector identity, both zeros); Beltrami property of ABC (Dombre et al.
  1986; Arnold 1965); SymPy symbolic check of all four.
- **E · `curl-noise-analytic-fields.json`** — closed-form div-free reference fields:
  ABC flow (`div v ≡ 0` symbolic + velocity values), a single analytic Taylor–Green
  stream function, and the FBM-linearity witness (`div(Σ octaves) = 0` on the matched
  grid). Anchors: ABC flow (Dombre et al. 1986; Arnold 1965); Taylor–Green closed form;
  linearity of `∇×` hand proof.

---

## § 8 Determinism

**MEASURED bit-exact same-stack-same-hw (target).** The gated state is a **pure
per-point gather**: each tracer reads only its own position and evaluates the analytic
noise from a **fixed committed permutation + gradient table**. **No particle→grid
scatter, no float atomics** (contrast MPM/pic-flip P2G). Therefore the f64 NumPy
evaluator is run-twice bit-identical on fixed hardware; a 2-run bit-identity witness runs
at every `advect` (tolerance 0.0; witness run #2 IS the capture run). Registry:
`[closed-form.curl-noise]` in `tools/testkit/equivalence/tolerance.toml`.

**Cross-build / cross-hardware caveat (documented).** f64 evaluation order is fixed, but
across BLAS/libm builds the transcendental-free simplex path is robust; the honest
boundary remains **numeric-equivalence** (declared tolerance), not byte-identity, across
builds.

**WebGPU / WGSL boundary (frontend, § 13.2).** The f32 WGSL per-tracer evaluator is
**device-scoped bit-exact** under a fixed evaluation order (pure gather, no atomics).
**Cross-device is distributional** (different GPUs accumulate f32 differently). The web
gate compares the WGSL f32 run against the live f64 reference within a declared tolerance
on **chaos-immune** observables (iso-value residual, discrete divergence — NOT long-window
pointwise trajectory, § 9), and asserts run-twice byte-identity on the same device.

**⚠ WGSL TRIG-PRECISION HAZARD (inherited lesson, schrodinger-smoke; v0.2 — basis
corrected).** The Vulkan spec guarantees builtin `sin/cos` only to 2⁻¹¹ (~4.9e-4)
absolute; lavapipe implements exactly that floor. **v0.2 correction: psrdnoise as
published does NOT dodge this hazard** — it deliberately uses GPU trig for gradient
generation in both 2D and 3D, on hash-derived angles unreduced up to ~1120 rad
(§ 2.5). The gated default basis is therefore the **webgl-noise-style trig-free
analytic-gradient simplex** (§ 2.5) — zero `sin/cos` on the gated path by
construction. Nuance worth recording: even a trig-laden basis stays *per-device
consistent* (each lattice corner's gradient is a fixed constant, however inaccurate,
so the analytic divergence still cancels) — what breaks is the **f64-reference ↔ f32
agreement and any cross-hardware sha**, which is exactly what the web gate measures;
hence the trig-free choice. The **Flow-Noise rotating-gradient** variant (Perlin &
Neyret 2001) and the **ABC flow** field do use `sin/cos`: on any **gated** path they
must use range-reduced polynomial trig (the
`packages/schrodinger-smoke/web/src/isf_core.wgsl` `sin_poly4`/`cos_poly4`/`cs_p`
precedent — repo-audited as cleanly copyable, including `atan2_p` for the
streamline-angle hue), or the divergence / iso-value gates can go tens-of-× over
budget on lavapipe while passing on RADV. Off-gate templates may use builtins.

---

## § 9 Equivalence

- **Canonical scene = a fixed 3D cross-product curl-noise field with one spherical
  obstacle** (SDF-substitution boundary), fixed seed / octaves / tracer seed positions,
  advected a fixed number of steps. The gated observables are **chaos-immune**: the
  **iso-value residual** (with reprojection → machine-zero; without → measured `O(Δtᵖ)`),
  the **matched discrete divergence** (machine-zero), and **run-twice byte-identity** on
  the same device. This deliberately avoids the raw-pointwise trap — helical div-free
  fields have **chaotic streamline regions** (ABC-flow lesson, § 3), and even the
  zero-helicity flagship accumulates unbounded *along-manifold* drift, so a long-window
  pointwise f32↔f64 match would diverge and be physically empty (the SPH "rigid
  free-fall, not chaos" + schrodinger chaotic-TG lessons); the distance-to-manifold
  residual is the invariant instrument (§ 3 helicity dichotomy).
- **Cross-stack:** the curl-noise reference (f64 NumPy) ↔ WGSL f32 frontend equivalence
  is the web gate (§ 13). No Stack-C pairing planned.
- **Vs strange-attractors:** the shared machinery is only the **analytic-field +
  RK-advection + run-twice-envelope** posture, not any trajectory — curl-noise is a
  spatial kinematic field, not a temporal dynamical system.

---

## § 10 Diagnostics (Tier 2)

- Speed `|v|`, vorticity magnitude `|∇×v|` (displayable, not gated), potential value,
  streamline-angle (2D `atan2(v_y,v_x)` → hue).
- Divergence-residual field (matched grid → ~0; analytic probe → O(h²)) — the moat
  instrument, reused as a heatmap.
- Iso-value residual meter `‖f(x)−f(x₀)‖` (cross-product scenes) — live, with a
  reprojection-on/off toggle showing the drop to machine-zero.
- Boundary `v·n` probe on obstacle surfaces → `max|v·n|` readout with the MEASURED O(h)
  convergence label and the medial-axis degradation note.
- Confinement meter (v0.3 — corrected): cross-product scenes → live machine-zero
  `v·∇f₁`, `v·∇f₂` and `ψ·v` readouts (golden F) next to the honest NONZERO kinetic
  helicity `v·(∇×v)`; ABC → Beltrami residual `‖∇×v−v‖`; unconstrained `∇×ψ` scenes →
  "no invariant ⇒ CAN be chaotic" indicator (the § 3 dichotomy, made visible).
- Jacobian-trace divergence audit: `div = trace(J_v)` from analytic second derivatives
  (Niagara-identity precedent, § 5) — a second, independent machine-exact divergence
  instrument alongside the FD probe.
- Analytic-vs-FD gradient error meter (the MMS slope, live under an `h`-slider).
- Octave/spectrum panel: FBM energy spectrum vs the octave amplitude schedule (with
  Bridson's `A/L` speed-scaling law as the per-octave annotation, § 3).

---

## § 11 Build / run

- Reference: `uv run --no-sync python -m curl_noise.reference.curlnoise …`
  (uv workspace; `uv sync --all-packages --all-extras` for a full venv per the repo
  env notes).
- Golden regen: `python tools/testkit/golden/generator/curl_noise_*.py --verify`.
- Tests: `pytest packages/curl-noise/tests/…` (MMS, divergence, boundary, PBT sweeps,
  determinism witness).
- Web: `packages/curl-noise/web` (§ 13; verification-demo-spec.md).

---

## § 12 References

See § 2 (anchors 1–5 + Cat-2/implementation references) + the overclaim-discipline list.
Research: task `w96xgvh0g` (25 confirmed / 0 refuted claims, 2026-07-05). Structural
sibling: `docs/sim-specs/closed-form/strange-attractors/spec-ref.md`. Reuse targets:
`packages/schrodinger-smoke/web/src/tracers.wgsl` (tracer cloud), `packages/common-web`
(colormap, panel-shell, capture-export).

---

## § 13 Productization status

### 13.1 Surfaces
- **Backend:** f64 NumPy curl-noise reference (this spec) — divergence/MMS/boundary
  gate posture.
- **Frontend:** WebGPU/WGSL demo — `packages/curl-noise/web/verification-demo-spec.md`.
- Flags: `web: true`, `binary: false`, `pypi: false`, `render: true`, `preprint: false`.

### 13.2 Web gate wiring
- `GATE_KIND["curl-noise"] = "new_canonical"` in
  `tools/productization/web-deploy/pipeline.py` (moat = closed-form divergence/iso-value
  goldens + run-twice device-scoped bit-identity + chaos-immune observables; closest
  precedent `strange-attractors` = `new_canonical` + run-twice + envelope).
- `_gate_curl_noise` in the web-deploy `verify.py`: live f64 reference re-run of the
  canonical obstacle scene + run-twice byte-identity + the machine-exact goldens
  (matched-grid divergence, cross-product div, iso-value-reprojection) recomputed live;
  chaos-immune envelope (iso-value residual within tolerance), NOT pointwise trajectory.
- `[defaults.curl-noise]` in `tolerance.toml` — new category (the f32↔f64 tolerance is
  noise-evaluator-specific), **MEASURED at execution (2026-07-05)**: NumPy-f32 proxy of
  the full WGSL gated pipeline (integer-hash noise, FBM, obstacle potentials, RK4,
  1-iteration Newton reprojection, f32-stored positions) on the canonical scene —
  worst f64-recomputed iso-residual at f32 positions vs f32-stored initial iso values
  = 1.19e-5 absolute (1.79e-5 of the iso-value scale 0.666), × 4.05 worst observed
  RADV→lavapipe family spread × ~2.7 margin → **declared relative 2e-4** (of the
  iso-value scale). Ratified (operator decision 5).

### 13.3 Beyond-canonical (labeled, ungated)
Toggles: 4D time-animated field; Flow-Noise rotating gradients (trig-gated — § 8);
mouse-driven potential wells / vortex brush (added to `ψ`, div-free preserved);
wind-gust pulses (a time-pulsed *linear* potential term — uniform flow is the curl of
`½ U×x`, still analytic and div-free); vortex-curve smoke rings / plumes (Bridson
Eq. 8) and rigid-body moving obstacles (Eq. 6); source/sink-free uniform + curl
perturbation; ABC-flow and Taylor–Green analytic templates; Curl-Flow additive vs
Bridson multiplicative vs Ding-Batty C¹ boundary comparison (**2D scene — the C¹ fix
is 2D-only, § 2**); a **"break the certificate" anti-demo** (a deliberately naive
velocity-space mouse attractor — a pure sink, the exact object the certificate
excludes — with the divergence heatmap lighting up, tracers clustering into voids per
Curl-Flow Fig. 3, and the badge graying: the moat taught by violating it);
audio-reactive parameter modulation (amplitude/gain/octaves from FFT bands —
parameter modulation, not field surgery, so div-free is preserved, but non-canonical
⇒ ungated); live octave/lacunarity/gain sweep. All rendered; interaction that adds
constraint regions or switches to the trig path outside the range-reduced kernel flips
the state to **ungated** (badge grays) until reset.

### 13.4 Operator decisions (RATIFIED AT EXECUTION 2026-07-05 — all six taken as
recommended: (1) `curl-noise` own identity; (2) `closed-form` category; (3)
cross-product flagship; (4) sphere-obstacle canonical scene; (5) new
`[defaults.curl-noise]` tolerance category; (6) RK2 default + RK4 toggle +
1-iteration Newton reprojection — canonical GATE scene runs RK4 + reprojection)
1. **Naming/placement:** `curl-noise` own identity (recommended, pic-flip precedent) vs
   family-sibling under strange-attractors.
2. **Category:** `closed-form` (recommended, sibling-consistent — analytic field + RK
   advection, golden tables under `tools/testkit/golden/tables/closed-form/`) vs a new
   `procedural-field` category (honest that it is spatial/kinematic, not a temporal
   dynamical system).
3. **Flagship 3D construction:** cross-product-of-gradients `∇f₁×∇f₂` (recommended — the
   iso-value residual is a chaos-immune closed-form gate no plain curl offers, it is
   also the *cheapest* honest construction — ~1.33× one simplex eval vs ~2.6× for
   3-gradient `∇×ψ`, atyuwen design ref — and Houdini ships it as `curlxnoise`) vs
   classic 3-component vector-potential `∇×ψ` (both shipped as registry templates).
   **v0.3 note (corrected):** the flagship's streamlines are confined to smooth
   iso-surfaces so its look is laminar-leaning (NOT because of zero helicity —
   that claim was refuted, § 3); the unconstrained `∇×ψ` templates carry the
   turbulence spectacle — a reason to ship BOTH prominently, not to change the
   flagship.
4. **Canonical scene:** fixed cross-product field + spherical SDF obstacle (recommended,
   exercises boundary + iso-value gates) vs open FBM turbulence (simpler).
5. **Tolerance category:** new `[defaults.curl-noise]` (recommended) vs reuse closed-form
   defaults.
6. **Tracer integrator + reprojection:** RK2 default + RK4 toggle + optional Newton
   reprojection (recommended) — final default confirmed by the web demo's MEASURED budget.
