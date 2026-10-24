# Rebuild v2 — twelve sims, built again from the ground up

> **Status:** planning specification, v0.1, 2026-10-17. Implemented so far (2026-10-23): the
> Wave 0 foundation with Turing Patterns M0–M3, Slime Mould M0 and Swarm M0 (2026-10-24) — each spec's status block
> records what was built and measured. Elsewhere, performance figures, particle counts and
> timings are **targets to be measured**, not results. Prior-art claims were checked by web search on this date; anything marked
> *verify before claiming* must be re-checked before it appears on the site.
>
> **Posture:** a planning artifact in the sense of [docs/planning](../README.md). It does not
> amend [the architecture](../../architecture.md) or authorize a release.

## Why rebuild

The 22 live sims are working prototypes. They boot fast, hold 60 fps on a discrete GPU,
throw no errors, and — the part worth protecting — every one re-runs its own verification
gate on the visitor's GPU. A 2026-10 review drove all of them on real hardware and found
that what is weak is not the physics but everything around it:

- **The look.** Additive renderers with no tone mapping clip to white (Schrödinger's
  Smoke); square canvases sit letterboxed beside a panel; the default palette is the same
  teal-on-navy for a slime mould, a heat plate and a quantum fluid.
- **The first minute.** Physarum booted with 500 agents and showed five wisps; MPM's
  showcase had already settled into a pancake before the page finished loading; Neural CA
  starts as a grey dot on a white field.
- **The controls.** A monospace instrument panel of sliders named after symbols (`L_sense`,
  `Δφ`, `ħ`), with the developer's capture button as the largest thing on screen.
- **The structure.** Every sim re-solved camera, tone mapping, layout and input on its own,
  so fixes never propagate and quality varies wildly.

The one sim built most recently — Canyon Lab (terrain erosion) — shows the way: a full-bleed
scene, a named experiment with a one-line prompt, verbs for tools, a transport bar with
save points and A/B compare, and instruments one click away instead of on top of the art.

This rebuild applies that standard to twelve sims, on a shared foundation, starting from a
blank page rather than from the prototypes' UI.

## What carries over, what does not

**Keep (the moat):** the Python/f64 reference implementations, committed goldens and
canonicals, the tolerance ledger and its measured-then-declared rule, the capture schema,
the browser-gate pipeline (`pipeline.py`, `verify.py`, the registry in
`tools/productization/web-deploy/sims.json`), and the honest-claims voice of the copy.
Where a rebuilt sim keeps its model, its gated kernel is ported **exactly** and re-earns its
gate; rendering and UI are free.

**Do not carry over:** the `.bps` instrument panel as the primary UI, per-sim camera and
tone-mapping code, letterboxed square stages, jargon-first labels, and any preset that only
works at a parameter value the visitor can't find again.

**Change deliberately:** where a better model exists for the experience (PB-MPM instead of
explicit MLS-MPM, whitewater FLIP, an ensemble view of chaos, in-browser NCA training), the
spec says so and adds the reference and gate work it implies.

## The documents

| # | File | Rebuilt sim (working title) | One line |
|---|---|---|---|
| — | [00-foundation.md](00-foundation.md) | Field Studies platform | Shared shell, render core, runtime, proof layer and engineering setup every sim builds on. |
| 01 | [01-reaction-diffusion.md](01-reaction-diffusion.md) | **Turing Patterns** (Gray–Scott) | Fly across the (F, k) map of pattern space, then grow coral on a 3D object. |
| 02 | [02-physarum.md](02-physarum.md) | **Slime Mould** (physarum) | Feed a slime mould and watch it build the road network — reliably, every time. |
| 03 | [03-boids-2d.md](03-boids-2d.md) | **Swarm** (2D collective motion) | A million fish that school, mill and scatter; you are the shark. |
| 04 | [04-neural-ca.md](04-neural-ca.md) | **Grow** (neural cellular automata) | Draw a creature and teach a living texture to grow it, in your browser. |
| 05 | [05-strange-attractors.md](05-strange-attractors.md) | **Chaos** (Lorenz and family) | Release a million butterflies from one point and watch certainty dissolve. |
| 06 | [06-curl-noise.md](06-curl-noise.md) | **Flow Sculpture** (curl noise) | Sculpt luminous, exactly incompressible flow around shapes you place. |
| 07 | [07-boids-3d.md](07-boids-3d.md) | **Murmuration** (3D starlings) | A dusk sky, a hundred thousand starlings, and a falcon you fly. |
| 08 | [08-sph-water.md](08-sph-water.md) | **Water in Hand** (SPH) | A glass of water you tilt, pour and drop things into. |
| 09 | [09-pic-flip.md](09-pic-flip.md) | **Wave Tank** (PIC/FLIP/APIC) | Breaking waves with spray and foam, and the transfer scheme you can switch live. |
| 10 | [10-mpm-multimaterial.md](10-mpm-multimaterial.md) | **Materials** (MPM) | Snow, sand, jelly, clay and honey in one solver; build it, then smash it. |
| 11 | [11-eulerian-smoke.md](11-eulerian-smoke.md) | **Plume** (3D smoke and fire) | Light a fire, add wind, and see numerical dissipation eat a vortex. |
| 12 | [12-schrodinger-smoke.md](12-schrodinger-smoke.md) | **Vortex Rings** (Schrödinger's smoke) | Smoke rings that leapfrog, collide and untie knots — a wavefunction as a fluid. |

Every sim document uses the same sections: the verdict on the prototype, the experience
(first ten seconds, signature moment, scenes, tools), the model, the look, the proof,
performance targets, risks, milestones and references.

## Distinct identities

Several of these sims cover similar physics. Each gets a job the others don't do:

- **Three liquids.** SPH is *small and held* (a glass, a jug, floating objects, device tilt);
  PIC/FLIP is *large and violent* (a wave tank with whitewater); MPM is *many materials*
  (water is only one of six). None of them is "a dam break in a box".
- **Three smokes.** Eulerian smoke is *real 3D smoke and fire with light*; curl noise is
  *procedural motion as an art instrument* — honestly "fluid-like, not fluid"; Schrödinger's
  smoke is *vortex filaments*, the thing grid smoke cannot keep.
- **Two flocks.** 2D owns *phase transitions and ecology at a million agents*; 3D owns
  *starling flight, camera and the falcon*.
- **Three pattern makers.** Gray–Scott is *chemistry's parameter space*; physarum is
  *agents building networks*; neural CA is *learned growth and regeneration*.

## Build order

Build the foundation with a pilot, then go in waves that each add one new kind of
rendering, so shared work is done once and proven before the expensive sims need it.

| Wave | Sims | New shared capability it proves | Relative size |
|---|---|---|---|
| 0 | Foundation + **Turing Patterns** pilot | Shell, 2D field renderer, brushes, scenes, history, proof panel, workspace | Foundation L, pilot M |
| A | **Slime Mould**, **Swarm**, **Grow** | Agents at scale, trails, GPU sorting, in-browser training | M, L, XL |
| B | **Chaos**, **Flow Sculpture**, **Murmuration** | 3D camera, HDR accumulation, ribbons, instanced meshes, sky | M, M, L |
| C | **Water in Hand**, **Wave Tank**, **Materials** | Screen-space liquid rendering, P2G atomics, whitewater | L, XL, XL |
| D | **Plume**, **Vortex Rings** | Volume ray-marching with lighting, 3D FFT/multigrid | L, L |

Sizes are relative effort (S < M < L < XL), not calendar estimates. Within a wave the sims
are independent and can be built in parallel once the foundation work for that wave lands.

**Release rule:** a v2 sim replaces its v1 at `/sims/<sim>/` only after it passes its
browser gate in CI and the product acceptance checks in its spec. Until then v1 stays live;
afterwards v1 is kept at `/sims/<sim>/v1/` for one release so the change can be compared.

## Cross-cutting acceptance (every sim)

These are the bar for "better taste", made checkable. Each sim spec adds its own.

1. **Ten seconds:** the default scene is the hero shot and is moving, legible and beautiful
   within ten seconds of load with no input.
2. **Sixty seconds:** within a minute the visitor has changed something and seen the
   system respond in a way they could describe.
3. **Five minutes:** the scene is still alive — no settled pancakes, no dead fields. Scenes
   either self-sustain or have a director that re-triggers events.
4. **No letterboxing, no clipping:** full-bleed canvas at every aspect ratio; every additive
   or emissive renderer accumulates in float and tone-maps with measured exposure.
5. **Plain words first:** no symbol-named control in the default layer; physics vocabulary
   lives in Learn and Prove.
6. **Phone:** works one-handed at 390×844 with the simulation visible; touch gestures
   are native, not mouse emulation.
7. **Proof intact:** the sim's gate passes in CI on lavapipe and run-twice where applicable,
   and the Prove layer re-runs it on the visitor's GPU.
8. **Accessible:** keyboard-operable, labelled controls, reduced-motion honoured (sim starts
   paused or slowed, no auto-orbit), colour scales readable without red/green.
