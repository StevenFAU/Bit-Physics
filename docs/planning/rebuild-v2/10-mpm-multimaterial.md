# 10 — Materials (MPM multi-material sandbox)

> Part of [Rebuild v2](README.md). Replaces `packages/mpm-multimaterial/web`. Wave C.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

- **Keep:** one grid solve for snow, sand, jelly and water; deterministic fixed-point P2G
  (measured 86.8% i32 headroom per cell at M = 4×10⁶); the golden B-spline and fixture
  suite; per-material invariants; the hard-won lesson that only a UΣVᵀ reconstruction check
  pins an SVD (σ-blind invariants passed while sand friction was silently dead); the
  sphere-impostor + density-shadow renderer as a starting point; the pointwise canonical gate.
- **Drop:** a *showcase* that has finished — snow packed, sand piled, jelly settled — before
  the page loads (the review saw a pancake at 7 s); four sliders (`stiffness ×`) as the main
  interaction; the 720 px letterbox.
- **Lesson:** the joy of MPM is *materials meeting*: snow hitting sand, jelly knocking over
  a tower, honey coiling. The product is a sandbox where you build things from materials
  and then break them — and the solver must survive anything the visitor does.

## The experience

**Pitch:** *Snow, sand, jelly, clay, honey and water in one solver — build it, then smash it.*

**First ten seconds:** a tabletop diorama in warm studio light: a sand castle, a jelly
tower, a snowman. A snowball arcs in from off-screen and bursts against the castle; sand
slumps, jelly wobbles, snow powders. The director lobs another every few seconds until the
visitor touches anything; then it waits.

**Signature moment — Build then Smash:** pick a material, draw or stamp shapes (cube,
sphere, ramp, letters) on the table, press play, and swing the hammer. Every material
responds in its own way in the same impact.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **The Table** (default) | castle, tower, snowman + snowball director | "Throw something. Then build your own." |
| **Hourglass** | sand flowing through a neck; angle of repose | "Flip it. The pile always finds the same slope." |
| **Honey** | a viscous stream coiling on a plate | "Pour slowly. It coils like rope." |
| **Jelly Tower** | stacked elastic cubes | "Knock it over. Watch it wobble." |
| **Crusher** | a hydraulic press over mixed materials | "Same press, six materials." |
| **Snow Day** | snowballs vs a snow wall (Stomakhin-style fracture) | "Snow packs, then shatters." |
| **Free Table** | empty table, all tools | "Build anything." |

### Tools

*Paint material* (6 materials; brush sizes), *Stamp shape*, *Hammer* (kinematic collider
following the pointer), *Press* (a piston), *Throw* (fling a ball of the selected
material), *Pour* (emitter), *Cut* (remove material), *Camera*. Tune per material (one
slider each, plain words): *Snow: wet ↔ powdery*, *Sand: grip*, *Jelly: firmness*,
*Honey: thickness*, *Clay: softness*.

## The model

- **Live solver: PB-MPM** (Lewin, SIGGRAPH 2024) — a semi-implicit compliant-constraint
  MPM that is stable at any time step and simple to implement; BSD-3 WebGPU reference code
  exists. A violent hammer swing cannot explode the sim.
- **Materials** (constitutive models in PB-MPM's constraint form):
  water (weakly compressible + viscosity), sand (Drucker–Prager, Klár et al. 2016),
  snow (Stomakhin et al. 2013 plasticity with hardening), jelly (neo-Hookean), clay
  (von Mises plasticity), honey (high viscosity / viscoplastic). Materials share one grid;
  particles carry a material id and per-material state.
- **M0 spike — decide or fall back:** confirm PB-MPM in 3D for all six materials (the
  reference demo is 2D; verify which materials it covers). If any material fails, that
  material runs on the existing MLS-MPM explicit path with sub-stepping.
- Colliders: table, walls, kinematic hammer/press as SDFs with friction.
- P2G with the existing fixed-point atomics; grid 128×64×128 (T3) dense, or block-sparse if
  M0 shows the table scenes leave most of the domain empty.
- Scale: T3 ~400k particles, T2 ~150k, T1 ~50k (measure; PB-MPM iterations dominate).

## The look

- Art direction: **stop-motion diorama**. Warm studio key light, soft shadows, a wooden
  table, shallow depth of field; each material shaded as itself:
  - water and honey via `LiquidSurface` (honey: amber absorption, high gloss, slow normals);
  - sand and snow as screen-space-smoothed granular surfaces with grain-scale normal
    detail (sand: warm, matte; snow: bright, subsurface-ish, sparkle as the prototype had);
  - jelly as a smooth translucent surface (thickness-based colour);
  - clay as a matte smoothed surface.
- Learn views: particles by material, by stress, by plastic strain, with `ColorScale`.

## The proof

- Keep the existing gate (pointwise reproduction of the committed 16-cube canonical, golden
  B-spline, fixed-point mass conservation, per-material invariants, UΣVᵀ reconstruction,
  run-twice) running the **MLS-MPM reference kernel** on the canonical scene, independent of
  the live solver. Prove states plainly which solver produced the live view.
- **PB-MPM reference (new):** a CPU mirror in the Python package with goldens; then a
  PB-MPM gate under measured-then-declared budgets. Until it lands, the live solver is
  labelled *live solver, verified separately on the canonical scene*.
- **Analytic checks (new):**
  - Hourglass: measured angle of repose vs the Drucker–Prager friction angle (within a band;
    piles need aspect ≈ 1 to show repose — recorded lesson).
  - Jelly: fundamental frequency of a clamped jelly cantilever vs Euler–Bernoulli beam theory.
  - Water: hydrostatic pressure in a still tank.
- Fixed-point mass conservation stays a live Prove card (leak quanta vs bound).

## Performance targets

| Tier | Particles | Target |
|---|---|---|
| T3 | ~400k | 60 fps |
| T2 | ~150k | 60 fps |
| T1 | ~50k | 30 fps |

## Risks and open questions

- PB-MPM coverage of snow and clay plasticity in 3D is unverified (M0 decides).
- Multi-material screen-space rendering needs per-material depth layers; budget the passes.
- The snowball director must stop as soon as the visitor acts and resume only after a
  minute of idleness.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | PB-MPM 3D spike (all six materials or documented fallbacks); existing gate ported |
| M1 | The Table with director; Hammer/Throw/Paint/Stamp tools; per-material rendering |
| M2 | Hourglass + repose check; Jelly Tower + cantilever check; Honey |
| M3 | Crusher, Snow Day, Free Table, PB-MPM reference + gate, posters/loops |

## References

- Lewin 2024, *A Position-Based Material Point Method*, SIGGRAPH Talks — [EA SEED](https://www.ea.com/seed/news/siggraph2024-pbmpm), code [github.com/electronicarts/pbmpm](https://github.com/electronicarts/pbmpm) (BSD-3)
- Hu et al. 2018, *A moving least squares material point method with displacement discontinuity and two-way rigid body coupling*, ACM TOG 37(4)
- Stomakhin et al. 2013, *A material point method for snow simulation*, ACM TOG 32(4)
- Klár et al. 2016, *Drucker–Prager elastoplasticity for sand animation*, ACM TOG 35(4)
- Jiang et al. 2016, *The material point method for simulating continuum materials*, SIGGRAPH course
- matsuoka-601, *WebGPU-Ocean* (MLS-MPM in WebGPU, fixed-point P2G) — [github.com/matsuoka-601/WebGPU-Ocean](https://github.com/matsuoka-601/WebGPU-Ocean)
