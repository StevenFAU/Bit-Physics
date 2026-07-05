# curl-noise — WebGPU verification demo spec (v0.3)

> **Status:** **SPEC v0.3 — EXECUTED 2026-07-05** (v0.2 review pass 2026-07-05:
> noise-basis correction — psrdnoise is NOT trig-free, default basis is
> webgl-noise-style trig-free analytic-gradient simplex (§ 1, backend § 2.5);
> persistence-trail / stretched-sprite / hero-ribbon render stack (§ 5);
> Jacobian-trace div audit (§ 3, § 4); three new templates incl. the "break the
> certificate" anti-demo (§ 2); license guard (§ 7). **v0.3 EXECUTION CORRECTION:**
> the v0.2 "cross-product helicity `v·(∇×v) ≡ 0`" claim is FALSE (refuted by
> counterexample and f64 measurement — backend spec status block); the machine-exact
> flagship identities are gradient orthogonality `v·∇f₁ ≡ v·∇f₂ ≡ 0` (the
> chaos-immunity mechanism) and the Clebsch integrand `ψ·v ≡ 0`, `ψ = f₁∇f₂`;
> kinetic helicity is displayed honestly NONZERO — §§ 3–4 instruments corrected.)
> **EXECUTED RESULTS (2026-07-05, RADV):** gate GREEN — run-twice byte-identical,
> browser IC matches the committed canonical seeds to 3.0e-8, live-f64 iso-residual
> worst 1.175e-5 = **0.088 of the [defaults.curl-noise] budget** (and within 1% of
> the NumPy-f32 proxy that set the tolerance — the measure-then-declare basis
> validated end-to-end); local `pipeline.py validate --sim curl-noise` PASS.
> **Execution deviations (deferred-with-cause, v1 ships without):** hero ribbons,
> iso-contour raymarch, sorted-alpha, half-res particle target, adaptive count
> controller and per-pass GPU-timestamp HUD (frame-ms + count HUD ships; the heavy
> options were § 5.5 default-off extras — roadmap, not gate surface). Template 10
> compares **Bridson multiplicative vs Curl-Flow additive** live; the Ding-Batty C¹
> construction is documented (2D-only, backend § 2) but NOT ported — its medial-axis
> problem statement is exercised in the backend test suite instead. Template 12
> ships as a quasi-static draggable SDF (exact tangency holds instantaneously);
> Bridson Eq. 6's full rigid-body potential is roadmap.
> Backend contract: `docs/sim-specs/closed-form/curl-noise/spec-ref.md`. Research
> task `w96xgvh0g` (25 confirmed / 0 refuted at research; one v0.2 review claim —
> the helicity zero — refuted at execution).
>
> **Sim:** Curl-noise — Bridson, Hourihan, Nordenstam, *"Curl-Noise for Procedural
> Fluid Flow,"* SIGGRAPH 2007 — with the modern divergence-free-noise frontier
> (Curl-Flow 2022, Ding & Batty 2023, Bærentzen et al. SIGGRAPH Asia 2025).
>
> **Gate kind:** `new_canonical` (moat = closed-form divergence / iso-value goldens +
> run-twice device-scoped bit-identity + chaos-immune observables; precedent
> `strange-attractors`).
>
> **The hook:** a **grid-free** procedural field means the spectacle is **pure tracer
> count** — the "max particles on screen" architecture, evaluated analytically per
> particle with **no solver step and no velocity texture**. And unlike every pretty
> browser flow-field toy, this one **proves it is divergence-free** (machine-exact on a
> matched grid; O(h²) on the analytic field) and **proves its streamlines stay on the
> closed-form manifold** — while stating plainly the one thing it is not: a fluid solver.

---

## 0 · Why this sim's moat is real but *narrow* (and why that honesty is the moat)

Most web curl-noise demos are eye-candy with **no** correctness claim. This one certifies
exactly the two properties the method actually has, and — as loudly — names the ones it
does not:

- **Incompressibility is provable, at two honest tiers.** On a **matched staggered grid**
  the discrete `div v` is **machine-zero** by the `DIV·CURL≡0` null-space identity
  (Hyman & Shashkov 1999) — a flat-zero heatmap the viewer watches stay flat. On the
  **per-tracer analytic field** an independent-stencil divergence probe converges at
  **O(h²)** — a measured, honest slope. The demo never blurs the two.
- **Streamlines stay on a closed-form manifold (the flagship).** For the cross-product
  construction `v = ∇f₁ × ∇f₂` (Bærentzen 2025), streamlines are *exactly* the
  intersections `{f₁=f₁(x₀)} ∩ {f₂=f₂(x₀)}`. The **iso-value residual `‖f(x)−f(x₀)‖`** is
  a directly-measurable, **chaos-immune** verification target: a tracer may slide
  chaotically *along* the intersection curve, but its distance *to* the manifold stays
  ~0, and a Newton reprojection drives it to machine-zero on screen.
- **Boundary tangency is provable** (continuum-exact; O(h) discretized; degrades at the
  medial axis — shown honestly, § 4).
- **The honesty panel is permanent, not a footnote:** "This is a **procedural** flow
  field. It is provably incompressible and boundary-tangent. It has **no pressure, no
  momentum/energy conservation, and no self-advection** — it does **not** solve
  Navier–Stokes. It looks like fluid without being fluid." (Our paraphrase — Bridson's
  verbatim is "fluid-like velocity fields"; v0.2 Cat-1 discipline, backend § 2. Never
  label the paraphrase verbatim in demo copy.)

That last bullet is the differentiator: a demo that *proves what it can* and *disowns
what it can't* is more trustworthy than one that implies a full solver.

---

## 1 · Architecture (the grid-free max-particle field)

```
 PROCEDURAL FIELD  (analytic, grid-free)              TRACER CLOUD  (0.5M – millions)
 ────────────────────────────────────────            ──────────────────────────────
 v(x) = ∇f₁ × ∇f₂        (3D flagship)            ──► evaluate v(x) analytically PER TRACER
   f_i = FBM(psrdnoise, octaves)                       RK2 advect position (RK4 toggle)
   ∇f_i exact analytic (one eval, no FD)               optional Newton reproject → iso-manifold
 v(x) = rot(∇ψ)          (2D stream function)          recycle by age / respawn (PCG hash)
 boundary: substitute one f_i with the SDF            color by speed / vorticity / angle / age
```

**Why grid-free, and why it is *also* the moat-superior choice.** The obvious "bake `v`
to a 3D texture and trilinear-sample" path is **rejected on moat grounds**: Curl-Flow
(arXiv:2104.00867) proves that **bilinear/trilinear interpolation of a discretely-
incompressible field is not pointwise incompressible** — it manufactures artificial
sources/sinks and produces visible **particle clustering and voids**. Per-tracer analytic
evaluation keeps incompressibility exact-in-continuum *and* removes the grid resolution
cap *and* is the frontier "max particles" path. One decision, three wins. (A texture-bake
fallback exists for very weak adapters, explicitly badged as degrading the
incompressibility guarantee — itself a teachable verification moment.)

- **Tracer count is MEASURED, not asserted.** No throughput/FPS figure survived research
  verification (search surfaced WebGPU-in-browser GPGPU particle demos at ~1M points, but
  none as a certified number). The demo ships an **adaptive** count that probes the device
  and reports the sustained figure in the RENDER HUD. No "millions" claim in copy the
  running demo can't back live (schrodinger-smoke precedent).
- **Cost per tracer:** cross-product 3D = 2 analytic-gradient simplex evals × octaves
  (each fully polynomial, § noise basis below), plus one cross product. No solver step,
  no texture fetch. Embarrassingly parallel. **Design references (non-certified,
  § 5.5):** the shipping GPU precedent measures the cross-product construction at
  ~1.33× one simplex eval vs ~2.6× for classic 3-gradient `∇×ψ` (atyuwen, GTX 1060) —
  the flagship is also the *cheapest* honest construction; FD-curl web demos burn
  ~18 noise evals/particle/frame (KAYAC, 1M @ Apple M1) — ~6× our analytic path, with
  no machine-zero divergence story. Production alignment: Houdini ships exactly this
  construction as `curlxnoise` (`vector4 xyzt`), and Niagara's GPU curl uses the
  analytic simplex **Jacobian** (`JacobianSimplex_ALU`: curl from the antisymmetric
  part, **div = trace(J)** — the same Jacobian powers a free in-shader divergence
  audit, § 4).

**Noise basis (greenfield — verified at review: no procedural noise or SDF utility
exists anywhere in the repo). ⚠ v0.2 BASIS CORRECTION:** *psrdnoise* as published is
**NOT trig-free** — its gradient generation uses GPU `sin/cos` on angles unreduced up
to ~1120 rad in both 2D and 3D (backend § 2.5) — so the gated WGSL basis is the
**webgl-noise-style trig-free analytic-gradient simplex** (`snoise(vec3, out
gradient)`, McEwan et al. 2012 / `ashima/webgl-noise` lineage, MIT):
permutation-polynomial hash `((34x+10)·x) mod 289` — **v0.3 EXECUTION DEVIATION
(measured): computed in exact u32/i32 INTEGER arithmetic, as is every discrete
gradient-selection decision** (float-emulated `mod289` rounds differently in f32 vs
f64 near multiples of 289, and the `gh == 0` octahedron-edge sign selection flips
between precisions — measured to blow the f32↔f64 iso-residual to O(1); integer
selection drops it to the true f32 floor 1.19e-5, backend § 2.5; the float emulation
was only ever a GLSL-ES-1.0 workaround and WGSL has native integers; **never
evaluate any gated arithmetic in f16**), polynomial gradients, radial falloff
`(0.5−r²)⁴` (**not** Perlin's 0.6 — that constant makes the noise AND its gradient
discontinuous at simplex boundaries ⇒ divergence spikes exactly where the gate looks;
**not** the streaky `(34x+1)·x` permutation still in stock webgl-noise master).
`gen-verification.mjs` HARD-FAILs on the falloff/permutation constants AND on any
float-modulo hash in gated WGSL (§ 6).
Gustavson's official MIT **WGSL** port of psrdnoise (`stegu/psrdnoise`) is a structure
reference only. **License guard:** atyuwen `bitangent_noise` is **CC BY-NC — never
port that code**; the cross-product construction is implemented from the math (DeWolf
2005 / Bærentzen 2025) over the MIT bases. Fixed committed permutation table → device
determinism.

**Reuse (verified at review).** The tracer cloud is a near-drop-in from
`packages/schrodinger-smoke/web/src/tracers.wgsl`: single `array<vec4<f32>>` buffer
(`.xyz` = position, `.w` = age), RK2/RK4 advect, instanced billboards + additive glow,
per-index **PCG respawn (deterministic, no atomics)**. The only change is the velocity
source — **replace the `sample_vel` texture read with an inline analytic `curl_noise(p)`
eval.** Panel / capture / colormap from `packages/common-web`
(`colormap.ts`, `panel-shell.ts`, `capture-export.ts`).

---

## 2 · Layer INTERACT

- **Templates (presets — registry-driven, sibling to `strange-attractors/web/src/attractors.ts`).**
  Each carries a badge:
  1. **Open turbulence** (FBM curl-noise, no obstacle) — the base field.
  2. **Flow past sphere** (3D cross-product, SDF-substitution boundary) — **canonical /
     gated** scene (exercises divergence + iso-value + boundary gates).
  3. **Flow past cylinder** (2D stream function, Bridson multiplicative ramp).
  4. **ABC flow** (closed-form `v=(A sin z+C cos y, B sin x+A cos z, C sin y+B cos x)`) —
     an **exact div-free analytic reference** with chaotic streamlines; the "you can see
     the ground truth" template (trig → range-reduced kernel, § 5).
  5. **Vortex seeds** (superposed analytic vortex primitives + noise; div-free preserved
     by linearity).
  6. **Layered turbulence** (live octaves / lacunarity / gain).
  7. **4D animated** (time-evolving field via `w=t`; Houdini `curlnoise4d` analog).
  8. **Wind tunnel** (uniform flow + curl perturbation — uniform flow is div-free).
  9. **Iso-contour ribbons** (cross-product: render the iso-surfaces the streamlines live
     on — a *verification-visible display* where you watch tracers stay on the surfaces).
  10. **Boundary comparison** (same obstacle under Bridson multiplicative vs Curl-Flow
      additive vs Ding-Batty C¹ ramp — the free-slip / medial-axis differences shown
      live; **2D scene** — the Ding-Batty C¹ fix is 2D-only, backend § 2).
  11. **Smoke ring / plume** (Bridson Eq. 8 vortex-curve potential + noise octaves —
      smoke rings and plumes straight from the source paper; superposable, div-free by
      linearity).
  12. **Rigid-body obstacle** (Bridson Eq. 6 rigid-body potential — a *moving* sphere
      the flow stays tangent to; drag it and watch `v·n` hold).
  13. **Break the certificate** (anti-demo, deliberately ungated: a naive
      velocity-space mouse attractor — a pure sink, the exact object the certificate
      excludes. The divergence heatmap lights up, tracers cluster into voids exactly as
      Curl-Flow's figures predict, the badge grays. The moat, taught by violating it.)
- **Controls:** noise scale `ℓ₀`, octaves / lacunarity / gain ("roughness"),
  construction (2D rot / 3D `∇×ψ` / 3D `∇f₁×∇f₂`), **field transform**
  (rotate/translate the noise domain) and **4D time-pan speed** (the Houdini
  `curlxnoise(vector4 xyzt)` / Unity VFX *Turbulence* control set — the two production
  panels this one deliberately mirrors), per-octave speed weighting via Bridson's
  `A/L` scaling law (backend § 3), tracer count (adaptive/manual), RK2/RK4, **Newton
  reprojection on/off** (cross-product; iterations pinned to 1 — measured saturation,
  backend § 3), timestep, colormap switch, **mouse-driven potential well** (a moving
  Gaussian bump added to `ψ` — a *principled* interaction that stays div-free, not an
  ad-hoc velocity blob), **vortex brush** (click-drag strength → a rotational potential
  blob) and **wind gust** (time-pulsed linear potential `½ U×x` term — uniform flow is
  its curl), obstacle brush (moves the SDF), pause/step, reset.
- **Interaction honesty:** the potential-well / vortex / gust brushes and obstacle
  moves all modify `ψ`, never `v` — div-free preserved by linearity, state stays
  **gated**; switching to the Flow-Noise rotating-gradient path or an un-range-reduced
  trig field flips the state **ungated** (badge grays) until reset (§ 5 trig hazard).
  The ONLY velocity-space interaction in the demo is template 13, which exists to be
  wrong on purpose. Audio-reactive modulation (amplitude/gain/octaves from FFT bands)
  is parameter modulation — div-free safe but non-canonical ⇒ ungated toggle.

## 3 · Layer EXPLAIN

- The construction as a live diagram: noise potential `ψ` (or `f₁,f₂`) → analytic gradient
  → curl / cross-product → `v` → tracers. For the cross-product, draw the two iso-surfaces
  and their intersection curve, and show a tracer riding it.
- `∇·(∇×)≡0` as the one-line reason for incompressibility (Schwarz/Clairaut), with the
  explicit caveat: **exact in the continuum; discretization-dependent** — and the demo
  shows *which* discretization makes it machine-zero (matched grid) vs O(h²) (analytic
  probe).
- The boundary mechanism: solid = isocontour of `ψ` ⇒ `v` tangent. Slide the ramp width
  and watch the flow hug the obstacle; near a non-convex corner, watch the medial-axis
  kink appear (Ding & Batty 2023) — the honest limit, shown not hidden.
- **Streamline-confinement panel (v0.3 — execution-corrected):** why the iso-value
  gate is chaos-immune — the cross-product field is orthogonal to both factor
  gradients (`v·∇f₁ ≡ v·∇f₂ ≡ 0`, machine-exact triple-product identities), so `f₁`
  and `f₂` are exact invariants and streamlines are confined to iso-intersections
  and **cannot be chaotic**; ABC is the opposite pole (Beltrami `∇×v = v`, chaotic
  regions coexist with regular ones). **The v0.2 "zero helicity" framing is
  retired** — kinetic helicity `v·(∇×v)` is NOT zero for cross-product fields
  (backend status block) and is shown honestly nonzero; the second machine-exact
  meter is the Clebsch integrand `ψ·v ≡ 0` (`ψ = f₁∇f₂`). Honest visual note kept:
  confinement to smooth iso-surfaces reads *laminar* — the turbulent eye-candy
  templates are the unconstrained `∇×ψ` ones, envelope-posture rather than
  iso-gated. The live meter switches role per template (confinement zero-meters /
  Beltrami-residual / "no invariant ⇒ can be chaotic").
- **The anti-demo, explained (template 13):** a naive mouse attractor is a pure
  source/sink — the exact thing the certificate excludes. Curl-Flow's
  clustering-and-voids result reproduced live in your browser, next to the same
  interaction done right (the potential-well brush).
- The **honesty panel** (permanent): the "procedural, not a solver" statement (§ 0), with
  citations. Plus the lineage-hygiene note: cross-product idea = DeWolf 2005 / Wu 2021,
  nD proof + reprojection = Bærentzen 2025; medial-axis caveat = Bærentzen 2025;
  additive ramp = Chang 2022; C¹ critique/fix (2D) = Ding 2023; curl-of-noise core =
  Kniss & Hart 2004; **Bridson = boundaries + modulation** (backend § 2 priority
  block).

## 4 · Layer PROVE (the flagship)

Live, on the running f32 WebGPU state unless noted. Each carries a **machine-exact** or a
**measured-convergent** badge — never blurred.

| Instrument | What it shows | Badge |
|---|---|---|
| **Matched-grid divergence heatmap** | discrete `max\|div v\|` on the staggered grid → flat machine-zero (~1e-6, f32) while the flow churns | ✅ machine-exact (route A) |
| **Cross-product div identity** | `div(∇f₁×∇f₂)` via analytic Hessian → 0 to FP | ✅ machine-exact (golden C) |
| **Iso-value residual meter** | `‖f(x)−f(x₀)‖` per tracer; toggle Newton reprojection and watch it drop to machine-zero — **chaos-immune** | ✅ machine-zero (reproject) |
| **Analytic-vs-FD gradient MMS** | analytic noise gradient vs central-difference under an `h`-slider → O(h²) collapse | ⚠ measured slope (golden B) |
| **Analytic-field divergence probe** | independent-stencil `max\|div v\|` on the per-tracer field → O(h²) → 0 | ⚠ measured O(h²) |
| **Boundary `v·n` probe** | `max\|v·n\|` on the obstacle surface → ~0 (smooth) with the O(h) label; medial-axis row shows the honest degradation | ⚠ measured O(h) |
| **FBM divergence-linearity** | add/remove octaves → matched-grid div stays machine-zero | ✅ machine-exact (golden E) |
| **Confinement identities (v0.3)** | cross-product `v·∇f₁`, `v·∇f₂` and Clebsch `ψ·v` (`ψ=f₁∇f₂`) → 0 to FP — next to the honest NONZERO kinetic helicity `v·(∇×v)` readout; ABC shows the Beltrami residual `‖∇×v−v‖ → 0` instead | ✅ machine-exact (golden F) |
| **Jacobian-trace div audit** | in-shader `div = trace(J)` from analytic second derivatives — a second, independent machine-exact divergence instrument (Niagara-identity precedent; psrdnoise supp. +18% cost precedent) | ✅ machine-exact identity (f32 FP floor) |
| **ABC-flow ground truth** | closed-form field: measured `v` vs analytic to FP, `div ≡ 0` | ✅ analytic (golden E) |
| **Run-twice hash** | two runs on this device → byte-identical trajectory sha | ✅ device-scoped |

- **Live f64-reference re-run** (the `new_canonical` gate, per `_gate_curl_noise`): the
  backend re-runs the canonical sphere-obstacle scene at f64 and the demo shows the f32↔f64
  delta on **chaos-immune** observables (iso-value residual, discrete divergence) inside
  the declared tolerance — the "backend drives the frontend" proof. **Not** a long-window
  pointwise trajectory match — helical fields (`∇×ψ`, ABC) have chaotic streamline
  regions, and even the zero-helicity flagship accumulates unbounded *along-manifold*
  drift; the distance-*to*-manifold residual is the invariant instrument (backend § 3
  helicity dichotomy).
- **Vorticity / kinetic "energy" are shown but NOT gated** — displayed as *illustrative*
  fields with an explicit "no conservation law here (kinematic field)" badge.

## 5 · Layer RENDER + determinism

- **Tracer rendering:** instanced quads from the storage buffer for counts ≤ ~4M;
  **vertex pulling** (one draw, `vertexCount = 6·N`, index math in shader) above —
  design ref: TU Wien 2023 measures the crossover ≈ 4M with 41–46% render-pass savings
  at 10M (10M quads @ 63 FPS, GTX 1060). WebGPU `point-list` is fixed 1px — kept only
  as the cheapest "dust" mode. Additive blending for the glow — **default no-sort**
  (order-independent; the schrodinger-smoke lesson: at millions of points the raster,
  not the field eval, is the bottleneck — additive needs no sort), optional
  sorted-alpha mode. Overdraw guards: clamp sprite size in NDC, exposure scales
  ÷ tracer count, optional half-res particle target composited up (GPU Gems 3 ch. 23
  pattern) for when the camera enters a dense cluster. Color by **speed**, **vorticity
  magnitude**, **streamline angle** (`atan2_p` → hue — **angle is cyclic, so add a
  CET-C6-style cyclic colormap to `packages/common-web/src/colormap.ts`**; repo audit:
  the current eight maps are all linear, and a linear map puts a false seam at the
  wrap), or **age**. Linear colormaps from `packages/common-web/src/colormap.ts`
  (aurora, ember, viridis, inferno, magma, plasma, turbo, cividis). Point-render
  precedent: `packages/schrodinger-smoke/web/src/tracers.wgsl` +
  `packages/sph-water/web/src/render/particles.wgsl`.
- **Persistence trails (v0.2 — the genre's highest wow-per-cost feature; Mapbox /
  earth.nullschool wind-map lineage):** ping-pong two offscreen **RGBA16F** targets —
  each frame draw the previous frame dimmed (×~0.96), splat particles on top, swap.
  Cost is **independent of tracer count** (~33 MB @ 1080p); tracer state is untouched,
  so trails are pure post-fx and **stay ON in the gated state**. fp16 accumulation is
  mandatory — 8-bit dim-factor quantization leaves permanent gray ghosts; never
  `preserveDrawingBuffer`. Default ON (this is the landing-poster look).
- **Velocity-stretched sprites:** stretch each quad along `v·dt` (length ∝ speed) — a
  one-frame motion trail, zero memory, large perceptual win; pairs with the trails.
- **Hero ribbons (subset-only):** ring-buffer position history → triangle-strip
  ribbons on a **10–50K tracer subset ONLY** — full-cloud history is a memory trap
  (1M × 32 samples × vec3 f32 = 384 MB). Off by default; own HUD cost line.
- **Bloom + depth cueing:** thresholded blur on the fp16 HDR target for the glow
  bloom; depth fog + size attenuation + slow auto-orbit camera for 3D-ness. Each a
  toggle with its own measured cost.
- **Field eval per tracer:** inline analytic `curl_noise(p)` (no texture) — keeps
  incompressibility exact-in-continuum (§ 1) and unbounds resolution. Positions stay
  **f32** (fp16 is allowed only in render targets / trail history — never in the
  integrated state or the noise hash, § 1).
- **Tracer respawn determinism:** per-index PCG hash (neural-ca matched-PCG precedent) —
  tracers stay outside the gated hash but captures replay bit-identically on the same
  device.
- **Iso-contour ribbon render** (cross-product scenes): raymarch a narrow band of
  `|f₁−f₁(x₀)|<ε ∧ |f₂−f₂(x₀)|<ε` to show the manifold the tracers ride — the
  verification made visible.
- **Determinism:** gated state is a **pure per-tracer gather, no scatter, no atomics** →
  fixed evaluation order gives **device-scoped bit-exact** run-twice. Tracers excluded
  from the gated hash (PCG-seeded). **Cross-device is distributional** (f32 noise eval
  differs by GPU) — the honest, established boundary, stated in the HUD.
- **⚠ WGSL TRIG-PRECISION HAZARD (inherited, schrodinger-smoke).** Vulkan builtin
  `sin/cos` is only 2⁻¹¹-accurate (~4.9e-4); lavapipe implements exactly that floor. The
  **default simplex path is polynomial → trig-free**, so the base field dodges the hazard.
  But the **ABC-flow** and **Flow-Noise rotating-gradient** templates use `sin/cos`: on the
  **gated** path they must use range-reduced polynomial trig (the
  `packages/schrodinger-smoke/web/src/isf_core.wgsl` precedent — quadrant-reduced Taylor
  sin/cos, Cephes atan2), or their divergence / iso-value gates can go tens-of-× over
  budget on lavapipe while passing on RADV. Off-path (ungated) templates may use builtins.

## 5.5 · Performance budget (measured, never asserted)

Per-tracer cost: 2 analytic-gradient simplex evals × octaves + 1 cross product + RK2 (2
field evals) → ~`4·octaves` noise evals/tracer/frame (RK4 doubles it; reprojection adds
one Newton step — pinned to 1 iteration, measured saturation, backend § 3). No solver
dispatch, no texture fetch — the field is grid-free, so cost scales purely with tracer
count. The raster (additive-blended points) is expected to dominate at ≥ 2M points, per
the schrodinger-smoke profile — but **every number ships from the RENDER HUD, none from
this paragraph**.

**Design expectations (v0.2, non-certified — the HUD remains the only authority):**
browser WebGPU precedents put 1–4M analytically-advected particles at 60 FPS on
mid-range hardware (TU Wien 2023: 10M instanced quads @ 63 FPS, GTX 1060; KAYAC: 1M @
Apple M1 *with 18 FD noise evals per particle* — the analytic path is ~6× cheaper per
field eval; this repo: 4.19M tracers @ 165 FPS, RADV, schrodinger-smoke). Integrated
GPUs: 0.5–1M comfortable. Persistence trails are count-independent and are NOT part of
the degrade ladder.

Adaptive controller: probe upward from 0.5M tracers to sustained-60-FPS; degrade order
under load: hero ribbons → bloom → sprite size → tracer count → octaves → RK4→RK2 →
reprojection off (persistence trails stay). HUD reports field-ms / advect-ms /
render-ms / post-ms separately so the sustained figure is attributable. Heavy options
(iso-contour raymarch, sorted alpha, matched-grid divergence readback, hero ribbons)
each display their own measured cost and default off on weak adapters.

---

## 6 · Data spine (build-time)

`gen-verification.mjs` (Node builtins only, prebuild/predev, idempotent, HARD-FAIL on
unmatched anchors / sha drift), mirroring the other sims:

- Emits the committed golden tables (A divergence, B gradient-MMS, C cross-product +
  iso-value, D boundary, E analytic-fields) as JSON the PROVE layer reads.
- Recomputes the machine-exact tables independently at build in **pure-JS f64**: the
  matched-grid telescoping divergence, the cross-product analytic-Hessian identity, the
  ABC-flow `div≡0`, and the FBM-linearity witness are all closed-form (no external deps) —
  HARD-FAIL on mismatch vs the committed tables.
- Emits the canonical sphere-obstacle capture metadata + payload sha for the f64 re-run
  gate; snapshots the IC (tracer seed positions + per-tracer `f₁(x₀), f₂(x₀)`
  iso-values — the reprojection gate replays against them) **before** the mutating
  advect loop (the pic-flip lesson: gen-gate refs must capture IC pre-mutation).
- **Noise-constants check (v0.2, HARD-FAIL):** asserts the WGSL basis carries the
  falloff constant `0.5` (not Perlin's `0.6`) and the permutation polynomial
  `(34x+10)·x mod 289` (not the streaky `+1` variant) — the two silent-killer
  constants (backend § 2.5); and greps that no builtin `sin/cos` appears in gated-path
  WGSL (the range-reduced kernel is the only trig allowed there).
- Adds an `uncapturederror` listener + a **layout-explicit** bind-group check (the
  pic-flip lesson: layout-auto bind-group mismatch silently discards submits).
- **Registry:** `packages/curl-noise/web/src/presets.ts`, sibling of
  `packages/strange-attractors/web/src/attractors.ts`, extended with
  `badges: string[]` + `gated: boolean` per template (repo audit: strange-attractors
  carries only a `conservative` boolean — 13 templates need per-template
  construction / gated / anti-demo badges).
- **Wiring checklist (repo-audited):** `GATE_KIND["curl-noise"] = "new_canonical"` in
  `tools/productization/web-deploy/pipeline.py`; `_gate_curl_noise` in the web-deploy
  verify module (live-f64 + run-twice + chaos-immune envelope, eulerian-smoke/
  strange-attractors precedent); `[defaults.curl-noise]` + `[overrides.curl-noise]`
  in `tools/testkit/equivalence/tolerance.toml` (MEASURED basis); golden tables A–F
  under `tools/testkit/golden/tables/closed-form/` (F = helicity, backend § 7).

`window.__bitPhysicsReady` hook; capture-export + settings panel from common-web.

**Deployment / validate traps (v0.2, inherited repo lessons):** the web-deploy
validate serves each sim's dist **standalone** — shared `../../assets` refs 404 and
hard-fail; per-sim assets ride vite `public/` as `./x`. Local validate needs
`CHROME_BIN` + `DISPLAY` and `uv run --no-sync`. Ship a landing card + poster/loop
(schrodinger-smoke precedent — the persistence-trail look is the poster shot). The
sim must be MERGED TO MAIN before the deploy workflow's discover step will pick it up.

---

## 7 · Hard boundaries (do not touch)

- No edits to verified kernels, golden tables, or sibling packages. Reuse is by *reading*
  validated fixtures (schrodinger-smoke tracers, common-web helpers), not mutating them.
- **The three divergence routes are pinned and labeled** (backend § 6.2): matched-grid =
  machine-exact; analytic per-tracer probe = O(h²); never relabel the O(h²) probe as
  machine-exact to make a gate look tighter.
- **The honesty boundary is load-bearing:** never imply pressure / momentum / energy /
  vorticity conservation or a Navier–Stokes solve. Certifiable = incompressibility +
  boundary tangency, full stop.
- **Trig hazard:** any gated-path `sin/cos` (ABC flow, Flow Noise) uses the range-reduced
  polynomial kernel; builtins only off the gated path. **v0.2: this includes the noise
  basis itself** — psrdnoise-as-published is trig-laden and is NOT the gated basis
  (§ 1).
- **Noise constants are pinned** (falloff `0.5`, permutation `(34x+10)·x`) — § 6
  HARD-FAIL; a wrong constant produces divergence spikes at simplex boundaries, i.e.
  a silently broken gate (backend § 2.5).
- **License:** never port atyuwen `bitangent_noise` code (CC BY-NC) — the cross-product
  construction is implemented from the math over the MIT bases (webgl-noise /
  psrdnoise-WGSL structure reference).
- **Verbatim discipline:** no quote is labeled verbatim unless byte-true against the
  source PDF (v0.2 fixes: Bridson's words are "fluid-like velocity fields" and "we
  have not yet tried it") — the CI `integrity --all` sweep scans this file; run it
  before pushing.
- **fp16 discipline:** f16 only in render targets / trail accumulation — never in the
  integrated tracer state and never in the noise hash (the mod-289 scheme is f32-exact
  by design and breaks under f16).
- **Do not bake the field to a velocity texture on the gated path** — trilinear
  interpolation destroys pointwise incompressibility (Curl-Flow); the texture-bake fallback
  is ungated and badged.

## 8 · Operator decisions (inherited from spec-ref § 13.4)

Naming (`curl-noise` own identity); category (`closed-form` vs new `procedural-field`);
flagship 3D construction (`∇f₁×∇f₂` vs `∇×ψ`); canonical scene (sphere obstacle vs open
turbulence); tolerance category (`[defaults.curl-noise]`); tracer integrator +
reprojection (RK2 + RK4 toggle + optional Newton). Recommendations in the backend spec.

## 9 · References

Backend `docs/sim-specs/closed-form/curl-noise/spec-ref.md` (anchors 1–5 + implementation
references + v0.2 § 2.5 port checklist); structural sibling
`docs/sim-specs/closed-form/strange-attractors/spec-ref.md`
+ `packages/strange-attractors/web` (registry-driven multi-template precedent);
`packages/schrodinger-smoke/web/src/tracers.wgsl` (tracer-cloud reuse + trig-hazard
lesson; `packages/schrodinger-smoke/web/src/isf_core.wgsl` range-reduced trig kernel —
repo-audited as cleanly copyable); `packages/sph-water/web/src/render/particles.wgsl`
(point-render precedent); `packages/common-web` (colormap, panel-shell,
capture-export; cyclic-colormap addition § 5). Noise: McEwan et al. 2012 /
webgl-noise `noise3Dgrad` (MIT — the gated basis); Gustavson & McEwan psrdnoise
(JCGT 2022; official MIT WGSL port, structure reference); stegu sdnoise. Frontier:
DeWolf 2005; Wu (atyuwen) bitangent noise 2021 (CC BY-NC — math only, no code);
Bærentzen et al. SIGGRAPH Asia 2025; Chang et al. Curl-Flow (SIGGRAPH Asia 2022);
Ding & Batty 2023 (2D). Render/perf design refs (non-certified): TU Wien Peter 2023
(instancing↔vertex-pulling crossover); Mapbox / earth.nullschool wind maps
(persistence trails); David Li flow, Edan Kwan The Spirit, KAYAC WebGPU demo
(genre visual bar); GPU Gems 3 ch. 23 (half-res particles). Production panels:
Houdini `curlxnoise` (4D xyzt); Unreal Niagara `JacobianSimplex_ALU`; Unity VFX Graph
Turbulence. Research: task `w96xgvh0g` (25 confirmed / 0 refuted, 2026-07-05) +
v0.2 review agents (source re-verification, implementation survey, repo audit,
2026-07-05).
