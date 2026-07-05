# schrodinger-smoke — WebGPU verification demo spec (v0.2)

> **Review v0.2 (2026-07-05, first-principles + implementation survey):** inherits the
> backend spec's corrections (discrete-vs-continuous Laplacian eigenvalues → golden E;
> free-step-is-exact-propagator MMS re-scope; πħ/dx edge-phase aliasing bound; Alg-4
> nozzle/obstacles re-scope — no DCT). Web-side changes: Ψ/FFT storage pinned to f32;
> two-tier FFT plan with f64-precomputed multiplier tables (the CUDA port measured the
> solver trig-bound); core-line extraction fixed (zeros of ψ₁, not "|Ψ|-minima" —
> |Ψ| ≡ 1 after normalization); tracer sampling pinned to staggered-MAC trilinear;
> template roster expanded from the paper's own scene table (oblique collision, von
> Kármán street + Strouhal meter, buoyant jet); prior-art scan recorded to back the
> "first browser" claim honestly; performance budget section added (§ 5.5).

> **Sim:** Incompressible Schrödinger Flow (ISF) — Chern et al., *"Schrödinger's
> Smoke,"* SIGGRAPH 2016. Backend contract:
> `docs/sim-specs/volumetric-grid/schrodinger-smoke/spec-ref.md`.
>
> **Gate kind:** `new_canonical` (moat = closed-form spectral goldens + run-twice
> device-scoped bit-identity + robust observables; precedent `eulerian-smoke`).
>
> **Status:** **EXECUTED 2026-07-05** (v0.2 spec; backend landed first at
> PR #11). Implementation notes vs spec: WGSL Tier-1 Stockham FFT shipped
> (Tier-2 shared-memory deferred until a MEASURED need); grids 32/64/128
> (radix-2 — the 96³ option dropped); web-gate canonical =
> `translating-ring-32cube-hbar0.05-step24-webgate` (pic-flip reduced-tier
> precedent; the visible demo runs 64³/128³); IC built AND settled in
> pure-JS f64 (`packages/schrodinger-smoke/web/src/isf64.mjs`, the backend
> algorithm) so the only IC divergence vs the f64 reference is one f32 cast;
> core-line raymarch deferred (HUD-honest), divergence/headroom live via the
> stats readback. MEASURED numbers in the § 5.5 block below the gate run.
>
> **The hook:** the wavefunction grid is small (64³–128³) but the tracer cloud is
> **millions** — the "max particles on screen" architecture the user asked for, and
> the FIRST browser Schrödinger's-Smoke that also *proves* its numerics.

---

## 0 · Why this sim is the strongest web moat in the fluid set

Every prior fluid demo's moat is a *chaos-immune* artifact (closed-form goldens,
hash≡oracle, error-convergence). ISF is unique: its verification targets are
**closed-form and spectral**, several **machine-exact**:

- **Unitary norm/mass** — the free step preserves global `Σ|Ψ|²` to machine precision.
  A flat line the viewer can watch stay flat while the fluid churns.
- **Per-Fourier-mode phase** `e^{-i(ħΔt/2)|k|²}` — an exact per-mode golden. Pick a
  mode, watch its measured phase land on the closed form to ~1e-6 (f32).
- **Parseval identity** across the FFT — real-space energy == Fourier-space energy.
- **Gaussian-packet dispersion** — the free step is the *exact propagator*: vs the
  analytic packet the error is flat in Δt at the FP floor (that flatness is the demo)
  and collapses super-algebraically under grid refinement. Δt *order* is a separate
  full-split Richardson meter (Lie ≈ 1 / Strang ≈ 2, MEASURED — see § 4).
- **Quantized circulation** `∮u·dl → 2πħ·n` — measured-convergent (honestly labeled
  approximate/O(h), per the paper's own "approximately 2πħ").

And the **honesty** is the moat, not a footnote: ISF is **not** exact Euler (Euler +
Landau-Lifshitz; vortices 1/e thinner; the newer Clebsch-PFM *excludes* ISF from its
Euler benchmarks). The demo states this plainly and shows the machine-exact gates
that ARE real. That is the differentiator vs pretty-but-uncertified browser fluid.

---

## 1 · Architecture (the max-particle separation)

Two decoupled systems, the key ISF property:

```
 WAVEFUNCTION GRID  (64³ / 96³ / 128³)          TRACER CLOUD  (0.5M – 8M points)
 ─────────────────────────────────────          ──────────────────────────────
 Ψ = (ψ₁,ψ₂)  rgba32float storage           ──►  sample u(x) staggered-MAC trilinear
   step 1: WGSL Stockham 3D-FFT × phase          RK2 advect position (RK4 toggle)
   step 2: normalize                             recycle by age / respawn (PCG hash)
   step 3: FFT Poisson project (discrete λ̃)      color by phase / Hopf-S² / speed / age
   readout: u = ħ·arg⟨Ψ_a,Ψ_b⟩ → rgba16f 3D tex

 Precision rule (pinned at review): Ψ and every FFT scratch buffer are f32
 (rgba32float) — f16 accumulates FFT roundoff far past the PROVE budgets. f16 is
 allowed only downstream of the gated state: the velocity sample texture
 (rgba16float — hardware-trilinear-filterable everywhere, unlike rgba32float which
 needs the optional float32-filterable feature) and render-only fields.
```

- The grid solve is **O(N³ log N)** and cheap at 64³–128³; the spectacle is the
  tracer count, which is **independent** of grid size. Tracers are passive — they do
  **not** feed back into `Ψ` (this is what keeps the gated state deterministic, § 5).
- **Tracer count is MEASURED, not asserted.** Research's headline number (5M @ 48 FPS)
  is a *third-party CUDA* port, not WebGPU. The demo ships an adaptive count that
  probes the device and reports the sustained figure in the RENDER HUD. No "millions"
  claim in copy that the running demo can't back live.

**WGSL 3D-FFT (greenfield — verified at review: no WGSL FFT exists anywhere in the
repo; glsl-fft is a packing-pattern reference only).** Batched 1D Stockham radix-2
over each axis (fixed pass order → device determinism, § 5). Spinor packs naturally:
`RG = (Re,Im)ψ₁`, `BA = (Re,Im)ψ₂` in one rgba buffer — every FFT sweep transforms
both components at once. Powers-of-two grid. No float atomics anywhere (FFT is
structured gather; projection is FFT). Per step: **6 logical C2C 3D FFTs** (Ψ
forward + inverse = 2×2 batched as 2, divergence forward + φ inverse = 2).

Two implementation tiers, promoted only on MEASURED wins (HUD-reported):
- **Tier 1 (ship first):** one dispatch per Stockham pass over global memory —
  `3·log₂N` passes per FFT (21 at 128³). Simple, obviously deterministic, easy to
  golden-test per-pass.
- **Tier 2:** one dispatch per *axis* — a full 64–128-point line fits in workgroup
  shared memory, so each workgroup runs all log₂N butterfly stages locally
  (`workgroupBarrier` between stages, still a fixed order → same determinism class).
  Cuts ~126 dispatches/step to ~20.

**Precomputed multiplier tables (CUDA-port lesson: the solver is trig-bound, not
bandwidth-bound; precomputing coefficients was a measured win).** Both per-mode
tables — the free-step phase `exp(−i(ħΔt/2)|k|²)` on the **continuous** eigenvalues
(paper Eq. 18) and the Poisson reciprocal `1/λ̃` on the **discrete** Eq.-17
eigenvalues — are computed once in **f64 on the CPU** with mod-2π reduction (at 128³,
`(ħΔt/2)|k|²` reaches tens of radians; naive f32 `sin/cos` of large angles wastes the
per-mode-phase budget), cast to f32, uploaded as textures, and regenerated only when
`ħ·Δt` or `N` changes. The two-spectra rule is a hard boundary (§ 7) pinned by
golden E.

**Prior art (scan dated 2026-07-05, backs the "first browser" hook honestly):** no
browser 3D ISF found. Known ports are native — authors' MATLAB/Houdini (< 1 s/step at
128³, CPU), CMU 15-418 CUDA (5M tracers @ 48 FPS at 128×64×64, ≈750× MATLAB), Unity
compute (~200 ms/step at 512×128×128), Julia — plus 2D Shadertoy toys. Demo copy says
"first *that we could find*, as of <date>" and links the scan.

**Reuse.** FFT Poisson projection and the divergence-residual instrument mirror the
eulerian-smoke web demo; velocity readout `η_e = ħ·arg⟨·,·⟩` mirrors the landed
clebsch-pfm `wave_velocity_face`; the spherical-Clebsch lift fixture is reused for the
golden self-test (§ 4).

---

## 2 · Layer INTERACT

- **Templates (presets)** — the iconic ISF scenes. Ring scenes use the paper's § 3.1
  slab phase-imprint (`θ = π(1+d/r)`, `ψ₂ = ε = 0.01` zero-guard, 5–10 IC settling
  projections — backend spec § 5); knots use the Tao–Ren–Tong–Xiong polynomial
  construction. Each template carries its badge:
  1. **Translating vortex ring** (canonical / **gated** scene — non-chaotic).
  2. **Leapfrogging rings** (two coaxial rings threading each other — Fig. 4).
  3. **Head-on colliding rings** (expand and reconnect).
  4. **Oblique ring collision** (paper Fig. 14 parameters: `ħ = 0.05`, radius 0.6 m,
     ±45°, centers 2 m apart — a committed-parameter reproduction of a paper figure).
  5. **Hopf link untying** → two separate rings (topology change).
  6. **Trefoil knot reconnection** (the paper's hero shot; polynomial IC).
  7. **Jet nozzle** (continuous emitter — Alg-4 velocity constraint in the periodic
     box, **no DCT** (corrected at review); ungated).
  8. **Buoyant jet** (paper Fig. 10 — jet + `ψ₂` buoyancy potential; ungated).
  9. **Von Kármán vortex street** (paper Fig. 15 — cylinder obstacle via `η_Ω = 0`
     constraint; live **Strouhal + superfluid-Reynolds meters**, § 4; ungated).
  10. **Random turbulence** (seeded phase noise → decaying tangle; deterministic
      PCG-seeded).
- **Controls:** `ħ` slider (vortex-core thickness — the single physical knob; slides
  live by regenerating the precomputed f64 multiplier tables, which is cheap), grid
  resolution (64/96/128), tracer count (adaptive/manual), timestep, **impulse brush**
  — a *principled* interaction: a spherical Alg-4 constraint region carrying the
  drag-direction plane wave for one step (not an ad-hoc phase blob) — obstacle brush
  (movable `η_Ω = 0` region), colormap switch (phase / Hopf-S² / speed / age),
  pause/step, reset.
- **Guard-coupled UI:** the `ħ` and timestep sliders show the live edge-phase
  headroom `max|η̃|/π` (backend § 3 aliasing bound `|u| ≲ πħ/dx`) and warn (never
  silently clamp) as it approaches 1 — the knob physics made visible: thin cores at
  high speed *need* a finer grid, and the demo says so.
- **Interaction honesty:** brushes, nozzle, obstacles, buoyancy are available in any
  scene but flip the state to **ungated** (badge + hash strip grays out) until reset
  — constraint/potential steps overwrite `Ψ` and void the unitary-norm gate.

## 3 · Layer EXPLAIN

- The wavefunction → velocity pipeline as a live diagram: `Ψ` phase field → `arg⟨·,·⟩`
  → `u` → tracers. The Hopf map `s = ψ̄iψ : ℝ³→S²` shown as a color sphere.
- `ħ`'s role: slide it and watch vortex cores thicken/thin and circulation quantum
  `2πħ` change — plus the flip side the paper lists as a shortcoming: an edge phase
  can only represent `|u| ≲ πħ/dx`, so thinner cores buy less speed headroom (the
  live headroom meter makes the trade visible instead of hiding it).
- The **honesty panel** (permanent, not hidden): "ISF is a Schrödinger-equation model
  of incompressible flow. Its vortices are *exactly quantized*, but it is **not** the
  exact Euler equation — it adds a Landau-Lifshitz term (vortices move as if 1/e
  thinner) and converges to Euler only as ħ→0." With the citation.

## 4 · Layer PROVE (the flagship)

Live, on the running f32 WebGPU state unless noted. Each has a **machine-exact** or a
**measured-convergent** badge — the demo never blurs the two.

| Instrument | What it shows | Badge |
|---|---|---|
| **Unitary norm readout** | `Σ|Ψ|²` across a free step — flat to ~1e-6 (f32) while flow churns | ✅ machine-exact |
| **Per-mode phase golden** | picked mode's measured `Δarg` vs `−(ħΔt/2)|k|²` | ✅ machine-exact |
| **Parseval meter** | real-space vs Fourier-space energy equal | ✅ machine-exact |
| **Exact-propagator flatline** | analytic Gaussian σ(t) vs numeric under Δt-halving → error curve FLAT at the f32 floor (the free step has *no* time error — few solvers can show this plot) | ✅ machine-exact |
| **Spectral-Δx collapse** | same packet under N-refinement → super-algebraic error collapse | ✅ analytic |
| **Full-split order meter** | Richardson Δt-halving on the ring scene → MEASURED slope (Lie ≈1 / Strang ≈2 targets) | ⚠ measured slope |
| **Divergence heatmap** | post-projection discrete `max|∇·u|` → ~0 — requires the discrete Eq.-17 eigenvalue table (golden E); reused smoke instrument | ✅ telescoping-exact |
| **Edge-phase headroom** | `max|η̃|/π` vs the πħ/dx aliasing bound — the guard that also protects projection exactness | ⚠ guard, live |
| **Circulation probe** | `∮u·dl` on a loop around a ring → `2πħ` | ⚠ measured O(h) |
| **Strouhal / Re_s meters** | street scene only: measured shedding `St` vs the superfluid literature's 0.12–0.18 band; `Re_s = |v|D/(2πħ)` | ⚠ ungated, literature-anchored |
| **Clebsch-lift self-test** | reused Taylor-Green lift: unit-norm ≤1e-6, `η_e=ħ·arg` | ✅ golden C |
| **Run-twice hash** | two runs on this device → byte-identical trajectory sha | ✅ device-scoped |

- **Live f64-reference re-run** (the `new_canonical` gate, per `_gate_schrodinger_smoke`):
  the backend re-runs the canonical translating-ring scene at f64 and the demo shows
  the f32↔f64 max-abs field delta inside the declared tolerance — the "backend
  drives the frontend" proof.
- **Helicity is shown but NOT gated** — displayed on the knot/link scenes as an
  *approximately-conserved, physically-illustrative* quantity (converts to helical
  coils across scales), explicitly badged "not a verification gate."

## 5 · Layer RENDER + determinism

- **Tracer rendering:** instanced points / indirect draw from a storage buffer;
  additive blending for the glow — **default no-sort** (the CUDA port's measured
  lesson: at millions of points naive rendering, not the solver, became the
  bottleneck; additive blending is order-independent so no sort is needed) — with an
  optional sorted-alpha mode. Color by **phase** (`arg ψ₁` → hue, the natural
  physical map), **Hopf-S²** (color sphere), **speed**, or **age**. Point-render
  precedent to reuse: `packages/sph-water/web/src/render/particles.wgsl` +
  `packages/common-web` panel/capture helpers.
- **Tracer sampling (pinned at review):** advection samples the **staggered MAC**
  faces per-component (hardware trilinear on the rgba16f velocity texture) — the
  cell-centred six-face average exists only for parent-capture field parity, and
  using it for advection smears exactly the thin-core detail ISF is for.
- **Tracer respawn determinism:** per-index PCG hash (the neural-ca matched-PCG
  precedent) — tracers stay outside the gated hash but captures still replay
  bit-identically on the same device.
- **Vortex core-lines** for knot/link scenes — **corrected at review**: after
  normalization `|Ψ| ≡ 1` everywhere, so "`|Ψ|`-minima" is meaningless. Filament
  tubes are the level set `s_z = |ψ₁|² − |ψ₂|² = 0` and cores are the zeros of `ψ₁`
  (equivalently the `s = (0,0,−1)` preimage) — the paper's own convention (its
  Figs. 7/13 render exactly these two). v1 renders the tube look by raymarching a
  narrow-band indicator of `s_z ≈ −1+ε`; explicit marching-cubes tubes are a v1b
  stretch.
- **Determinism:** gated state is pure grid-FFT + gather, **no scatter, no atomics**
  → fixed Stockham butterfly order gives **device-scoped bit-exact** run-twice. Tracers
  are excluded from the gated hash (passive, PCG-seeded respawn). **Cross-device is
  distributional** (f32 FFT accumulation differs by GPU/subgroup) — the honest,
  established boundary, stated in the HUD.

## 5.5 · Performance budget (measured, never asserted)

Derived load per step (128³, Tier 1 FFT): 6 C2C FFTs × 21 passes ≈ 126 compute
dispatches over 2M cells + ~6 pointwise passes (phase multiply, normalize,
divergence, gauge, velocity readout) — Tier 2 cuts this to ~20–26 dispatches. The
grid solve is expected cheap relative to tracers at ≥ 2M points (advect + additive
raster dominate — the CUDA port's profile agrees), but **every number ships from the
RENDER HUD, none from this paragraph**. Adaptive controller: probe the device upward
from 0.5M tracers to sustained-60-FPS; degrade order under load: tracer count → grid
96³ → 64³ → tick rate. The HUD reports grid-ms / tracer-ms / render-ms separately so
the sustained figure is attributable. Optional heavy effects (core-line raymarch,
sorted alpha, E(k) panel — three extra FFTs on demand) each display their own
measured cost and default off on weak adapters.

---

## 5.6 · MEASURED block (execution 2026-07-05, RADV; every number from a live run)

- **Deploy gate (local web-deploy validate, snap-chromium):** PASS —
  `run_twice_identical: true` (the WGSL Stockham FFT is device-scoped
  bit-exact end to end), worst per-checkpoint max_abs **3.28e-5** (u) /
  2.24e-5 (v) / 2.66e-5 (w) vs the LIVE f64 reference re-run = **0.34 of the
  [defaults.isf] 1e-4 budget** (complex64-proxy prediction was 1.4e-5 —
  the real WGSL f32 path lands 2.3× the proxy, comfortably inside; no
  tolerance widened). Browser norm_l2 flat at f32 scope; reference re-run
  max div 9.9e-13, headroom 0.158.
- **In-browser goldens (PROVE panel, this device):** golden B closed-form
  phase max err 0.0; golden E two-spectra max rel err 0.0; golden A live
  pure-JS f64 FFT norm drift 6.24e-14 ≤ 1e-13; Parseval 2.07e-14 ≤ 1e-13;
  total cost 25 ms.
- **Sustained figures (RADV, 1400×1100):** 165 FPS at **4.19M tracers**
  (adaptive controller topped out at the 4M cap) on the 64³ grid; encode
  ~0.1 ms. All 10 templates exercised headlessly with zero console errors;
  live headroom 1–46% of π across scenes (jet/buoyant/street highest —
  constraint-driven flows).
- **Implementation lessons (recorded):** (1) one-sim-step-per-frame
  fast-forwards the physics on high-Hz displays — the loop now steps at the
  paper's 24 steps/s wall cadence; (2) uniform tracer seeding in an
  incompressible flow stays uniform forever — the iconic look needs per-scene
  dye seed regions (disk for rings, nozzle slab for jets), added as
  `SceneSpec.seed`; (3) additive glow must normalize by tracer count or 4M
  points saturate to white.

## 6 · Data spine (build-time)

`gen-verification.mjs` (Node builtins only, prebuild/predev, idempotent, HARD-FAIL on
unmatched anchors / sha drift), mirroring the other sims:

- Emits the committed golden tables (A unitary, B per-mode phase, C Clebsch-lift, D
  Gaussian dispersion, E Laplacian eigenvalue pair — continuous Eq. 18 vs discrete
  Eq. 17, the two-spectra trap — F circulation) as JSON the PROVE layer reads.
- Recomputes the machine-exact tables independently at build in **pure-JS f64**: B
  and E are closed-form (no FFT needed); A/Parseval run a tiny self-contained radix-2
  f64 FFT at N = 32 (Node builtins only — no deps), HARD-FAIL on mismatch vs the
  committed tables.
- Emits the canonical translating-ring capture metadata + payload sha for the f64
  re-run gate.
- Snapshots the IC **before** the mutating step loop (the pic-flip lesson: gen-gate
  refs must capture IC pre-mutation).
- Adds an `uncapturederror` listener + a layout-explicit bind-group check (the pic-flip
  lesson: layout-auto bind-group mismatch silently discards submits).

`window.__bitPhysicsReady` hook; capture-export from common-web; settings panel.

---

## 7 · Hard boundaries (do not touch)

- No edits to verified kernels, golden tables, or the landed clebsch-pfm/vpfm/edge
  packages. Reuse is by *reading* the validated fixtures, not mutating them.
- The velocity **sign** is pinned: `u = ħ·Im(ψ̄·∇ψ)` (guard against the Re/Im flip a
  unit-test asserts on a plane wave).
- The **two-spectra rule** is pinned (golden E): free step = continuous eigenvalues
  (paper Eq. 18); Poisson projection = discrete sin² eigenvalues (paper Eq. 17).
  Never mix — the divergence gate fails at an O(h²) floor and nothing else looks
  wrong.
- `Ψ` and FFT scratch are **f32, full stop** — no f16 anywhere upstream of the gated
  state.
- Machine-exact vs continuum badges are load-bearing — never relabel a measured-
  convergent quantity as exact to make a gate look tighter.

## 8 · Operator decisions (inherited from spec-ref § 13.4)

Naming (`schrodinger-smoke` vs `eulerian-smoke-frontier-isf`); tolerance category
(`[defaults.isf]` new vs reuse `smoke`); canonical scene (translating ring vs
leapfrogging); tracer integrator (RK2 vs RK4). Recommendations in the backend spec.

## 9 · References

Backend `docs/sim-specs/volumetric-grid/schrodinger-smoke/spec-ref.md` (anchors 1–6 +
Cat-2 context); landed
`docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier-clebsch-pfm.md`
(reuse); the eulerian-smoke web demo (Poisson/divergence instrument + live-f64-gate
precedent); `packages/sph-water/web` (particle rendering precedent);
`packages/common-web` (capture-export, settings-panel, panel-shell, colormap);
glsl-fft (WGSL-port packing pattern, WebGL→WebGPU). Implementation survey (review
2026-07-05): authors' MATLAB/Houdini code release; CMU 15-418 CUDA port (perf
anchor + trig-bound + render-bottleneck lessons); Unity compute port; Julia port;
Tao–Ren–Tong–Xiong Phys. Fluids 33, 077112 (knot ICs). Research: task `w6hw6st37`
(21 confirmed / 4 refuted claims) + this review's paper/thesis PDF re-read.
