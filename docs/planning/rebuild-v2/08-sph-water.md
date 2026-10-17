# 08 — Water in Hand (SPH)

> Part of [Rebuild v2](README.md). Replaces `packages/sph-water/web`. Wave C.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

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
