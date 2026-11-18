# 08 — Water in Hand (SPH)

> Part of [Rebuild v2](README.md). Replaces `packages/sph-water/web`. Wave C.
> Status: planning, v0.1, 2026-10-17; M0 built 2026-11-18 (below). Elsewhere, targets are unmeasured.
>
> **Implementation status (2026-11-18): M0 built** as the `v2/` page of `packages/sph-water/web`
> (served at `/sims/sph-water/v2/`, gated through `pipeline.py` `PAGES`; v1 unchanged). The Glass and
> Still Water: the shipped DFSPH in a glass on a kitchen table, drawn by the new shared `LiquidSurface`
> (F4, 00-foundation.md), the Drop and Camera tools, Tune (render-only), Learn and Prove. Measured on the
> RX 6800 XT (snap Chromium, RADV) unless a line says otherwise.
>
> - **The gate, ported verbatim** (`src/v2/proof/gate.ts`): v1's capture path (CANON, the lazy
>   `sph-gate-ic.bin` / `sph-gate-refs.bin`, `checkpointErrors`, `computeGateArtifacts`, v1's manifest) on
>   its own `createSphGpu` instance — the same `sph_core.wgsl` / `dfsph_solver.wgsl` pipelines, the
>   per-cell id-sort, the CSR `cell_start`, h = 0.026. The live loop stays off the GPU while it runs (v1's
>   exclusivity guard). `pipeline.py validate --sim sph-water` passes on both pages, run twice: worst
>   pointwise error 12.3% of the [defaults.sph] rel 1e-4 budget, as on v1, runs byte-identical; v2 ready
>   in 9–19 ms. The capture's states hash the same on v1 built from main, v1 and v2 on this branch
>   (sha256 `713611ee…`).
> - **The live solver is the shipped DFSPH, byte for byte, 4.1× faster.** The shipped passes walk the
>   3×3×3 stencil (~370 candidates for ~57 neighbours) in each of ~26 gathers a step: 41.9 ms a step at
>   193k particles. Water in Hand builds each particle's neighbour list once a step in the shipped
>   visiting order (`src/v2/model/lists.wgsl`, k-major so a wave's loads coalesce — i-major made a step
>   3.7× slower), runs the shipped expressions over it, reads ρ through a 4-byte array, and every 32 steps
>   permutes the particles into cell order with the per-cell sort keyed on each particle's original index
>   (mixing had made the gathers 1.7× slower): 10.2 ms a step at 193k. From the same state the shipped
>   passes, the lists and the lists with the re-sort give the same bytes (Prove, and the acceptance run).
>   A per-particle κ/ρ table was faster still but rounds differently (the shipped division is fused into
>   its sum), so it was dropped.
> - **The recipe at this scale** (glass 0.6 m across, water 0.38 m deep): h = 1.2 spacing, dt = 0.4 h/5,
>   8 density / 4 divergence iterations, warm start off, speed cap 0.315·2h/dt = 7.875 m/s, XSPH — as
>   recorded. **The mass is re-measured:** an interior lattice at h = 1.2 s sums to 1.00081 ρ₀ (computed;
>   the GPU reads 1000.8 kg/m³), so v1's ρ₀s³ × 1.07 started the glass 7% compressed and its first step
>   threw particles at 6.2 m/s; the mass is ρ₀s³ / 1.00081, and still water now gains only gravity's
>   0.014 m/s in each of its first 16 steps. The glass is a cylinder wall and floor projected after the
>   shipped box walls (boundary particles are M1).
> - **Particles per tier — measured, then declared; the targets do not hold.** A step costs 1.4 / 3.6 /
>   5.8 / 10.2 ms at 29k / 76k / 115k / 193k particles (water mixed by drops), and dt shrinks as N^(−1/3),
>   so 200k at 60 fps runs one step a frame, about 22× slower than real time. Declared: **T3 80,000**
>   (76,245 in the glass) at 0.18 model seconds per wall second (5.6× slow motion; with the glass 0.6 m
>   across, slower still than a real glass): 60 fps at 1280×720 and 2560×1440, GPU 11.5 ms a frame at p50
>   — solver 12.3 ms (2.8 steps) against LiquidSurface 0.22 ms (0.53 ms at 2560×1440). **T2 24,000** and
>   **T1 10,000** are estimates scaled from T3 by throughput at equal playback speed (cost ∝ N^(4/3)):
>   there is no iGPU or phone on the bench. On the 6800 XT they hold 60 fps (GPU 10.7 / 5.9 ms; the card
>   idles its clocks at that load). SwiftShader (Playwright Chromium, T1, 9,198 particles): ready at
>   404 ms, live at 837 ms, 417 ms a frame (2.4 fps) — solver 133 ms for 3 steps, surface 201 ms.
> - **The first ten seconds and the director:** a blob of water (r = 7.5 cm) starts 30 cm above the
>   water and falls in; the fastest particle passes 0.8 m/s within a second. A drop moves the highest
>   particles (as many as the blob holds) to a blob above the glass at rest, from positions read back at
>   that step, so drops replay byte for byte; the director drops again every 2.6 model seconds at
>   seeded spots (three drops by t = 6 s). The Drop tool drops where you click (an edit, undoable by
>   replay ≡ never dropping, with a 0.45 s cooldown).
> - **Prove:** the release gate re-run in the page (12.3% of budget, run twice identical); the shipped
>   solver ≡ the lists ≡ the lists with the re-sort; **hydrostatic pressure (illustrative):** after
>   2.5 s of Still Water, ρ Σκ / steps over both solves and 200 steps gives dp/dd = 8,777 Pa/m =
>   0.89 ρ₀g over 42,000 interior particles; the depth-bin means lie on a line (R² 0.9993), each
>   particle's 200-step mean keeps its own noise (per-particle R² 0.88). One step's density-solve κ alone
>   shows no gradient (R² 0.01 — the weight is carried by both solves); **incompressibility, live (illustrative):** mean
>   compression 0.09%, max 2.6%, largest neighbour count 68 (lists hold 96), against no declared tolerance
>   — the recipe runs fixed iterations; Bender & Koschier report < 0.01% iterating to tolerance. The
>   Archimedes gate is M2.
> - **Checks:** `v2-acceptance.mjs` 32/32; `web/tools/check-studio.mjs` 0 problems, 0 axe violations at
>   all four viewports.

## Verdict on the prototype

- **Keep:** DFSPH (divergence-free + density solvers), per-cell id-sort for run-twice byte
  identity, CSR `cell_start` (within the 8-storage-buffer limit), the f64 mirror with
  committed kernel coefficients, the pointwise gate against the committed 100K canonical,
  the RAF/replay GPU-exclusivity guard, the live DFSPH recipe (dt, iteration counts, speed
  cap, mass tweak) recorded in the 2026-07 spec review.
- **Drop:** "dam break in a box" as the identity (PIC/FLIP and MPM also do it); a flat green
  slab under a grid seen from an odd angle; 30K particles labelled `30K (iGPU` in a clipped
  select; ten scene chips that are variations of the same box.
- **Lesson:** SPH's strength is *small-scale, interactive liquid with things in it* —
  droplets, splashes, floating objects. Make the visitor hold the water.

## The experience

**Pitch:** *A glass of water you tilt, pour, and drop things into.*

**First ten seconds:** a clear glass of water on a wooden table in soft window light. The
water's surface catches highlights; the table shows a bright caustic under the glass. A
small ice cube drops in from above, splashes, bobs and floats. The prompt: "Drag to tilt.
Drop something in."

**Signature moment — Pour:** tilt the glass towards a second, empty glass. Water sheets
over the lip in a coherent stream, breaks into droplets, splashes into the second glass and
settles. On a phone, tilting the phone tilts the glass (opt-in).

**Second signature — Float or sink:** drop a cork, an ice cube, a wooden block and a stone.
They settle at the depths Archimedes predicts; the Learn panel shows predicted vs measured
draft for each.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **The Glass** (default) | a glass on a table, an ice cube | "Tilt it. Drop something in." |
| **Pour** | two glasses | "Pour without spilling. (You'll spill.)" |
| **Float or Sink** | five objects of different density | "Which ones float? How deep?" |
| **Stir** | a spoon you drag; a vortex forms | "Stir, then let go." |
| **Tap** | a faucet filling a bowl; drag the bowl under it | "Fill it to the line." |
| **Drops** | zero-gravity blobs with surface tension; merge and wobble | "Throw two blobs together." |
| **Hydrostatic** (Learn) | still water with a pressure-colour view and probe | "Pressure grows with depth — exactly ρgh." |

### Tools

*Tilt* (drag rotates the held container around its base), *Drop* (pick an object from a
small shelf), *Stir* (a spoon follows the pointer), *Pour* (move the second container),
*Probe* (pressure, velocity, density error at a point), *Camera*.

## The model

- **DFSPH** (Bender & Koschier): the shipped solver, with the recorded live recipe as the
  starting point (dt = 0.4h/5, 8/4 iterations, speed cap 0.315·2h/dt, mass ×1.07) and
  re-measured at the new scales.
- **Moving containers:** container walls sampled as boundary particles (Akinci et al.
  2012) on a kinematic rigid body driven by the user; wall velocity enters the divergence
  solve so the water is pushed, not leaked.
- **Floating objects:** dynamic rigid bodies with boundary particles; fluid pressure forces
  summed into body force/torque (two-way coupling); simple rigid-body integrator with
  object–container contact (spheres/boxes only).
- **Surface tension:** Akinci et al. 2013 cohesion + curvature, needed for droplets, the
  poured stream breaking up, and the Drops scene.
- **Viscosity:** XSPH for water; optional implicit viscosity for a *Honey* variant (stretch).
- **Diffuse particles:** spray, foam and bubbles generated from trapped-air and wave-crest
  potentials (Ihmsen et al. 2012), advected cheaply, never fed back — render-only.
- Scale: T3 200k, T2 80k, T1 30k fluid particles (measure M0; neighbour search dominates).

## The look

- Art direction: **kitchen table, window light**. Warm wood table, a soft out-of-focus
  room behind (procedural gradient + bokeh shapes), one key light from the side.
- Liquid via the shared `LiquidSurface` renderer: depth → narrow-range filter → normals;
  thickness for Beer–Lambert absorption (a faint blue-green); screen-space refraction of
  the scene behind; Fresnel reflection of the environment; sharp specular; foam layer from
  diffuse particles.
- Glass containers: thin refractive shells with edge highlights; contact shadow and an
  approximate caustic on the table (projected light through the liquid's normal field —
  stretch, but it is what makes the first frame look real).
- Learn views: particles coloured by pressure/velocity/density error with `ColorScale`.

## The proof

- Keep the `new_canonical` gate (pointwise reproduction of the committed canonical +
  run-twice) and port the gated DFSPH kernels exactly; the gate scene stays separate from
  the hero scenes.
- **Archimedes (new analytic gate):** a floating box of density ratio s settles to a draft
  of s × height (rectangular body, still water); measured draft within a declared tolerance
  after settling. Shown in Float or Sink as predicted vs measured.
- **Hydrostatic (existing scene, now a Prove card):** pressure vs depth vs ρgh.
- **Incompressibility:** mean and max density error per step vs the solver's declared
  threshold, live.
- Diffuse particles and caustics are labelled *rendering only*.

## Performance targets

| Tier | Fluid particles | Target |
|---|---|---|
| T3 | 200,000 | 60 fps |
| T2 | 80,000 | 60 fps |
| T1 | 30,000 | 30–60 fps |

## Risks and open questions

- Boundary handling for thin rotating glass walls is the classic leak point; use two
  layers of boundary particles and cap tilt angular velocity.
- Two-way rigid coupling stability with light objects (cork) — sub-step the rigid bodies.
- Phone tilt needs iOS permission from a gesture and must be off by default.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Shipped DFSPH in the shell; `LiquidSurface` with refraction/absorption; gate ported |
| M1 | Kinematic container (Tilt) with boundary particles; The Glass, Pour |
| M2 | Rigid floating objects with two-way coupling; Float or Sink with the Archimedes gate |
| M3 | Surface tension (Drops), diffuse particles, Stir, Tap, phone tilt, posters/loops |

## References

- Bender & Koschier 2015, *Divergence-free smoothed particle hydrodynamics*, SCA
- Akinci et al. 2012, *Versatile rigid-fluid coupling for incompressible SPH*, ACM TOG 31(4)
- Akinci, Akinci & Teschner 2013, *Versatile surface tension and adhesion for SPH fluids*, ACM TOG 32(6)
- Ihmsen et al. 2012, *Unified spray, foam and air bubbles for particle-based fluids*, The Visual Computer 28
- van der Laan, Green & Sainz 2009, *Screen space fluid rendering with curvature flow*, I3D
- Truong & Yuksel 2018, *A narrow-range filter for screen-space fluid rendering*, I3D
- matsuoka-601, *WebGPU-Ocean* (MIT; WebGPU SSFR reference) — [github.com/matsuoka-601/WebGPU-Ocean](https://github.com/matsuoka-601/WebGPU-Ocean)
