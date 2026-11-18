# 10 — Materials (MPM multi-material sandbox)

> Part of [Rebuild v2](README.md). Replaces `packages/mpm-multimaterial/web`. Wave C.
> Status: planning, v0.1, 2026-10-17. **M0 spike measured 2026-11-18: go, with one fallback and
> three limits** (below). Elsewhere, targets are unmeasured.
>
> **PB-MPM 3D spike (2026-11-18, M0): go, with fallbacks.** PB-MPM runs in 3D in WebGPU. Nothing
> produced a non-finite value in any run, including an 8 m/s hammer that enters at full speed
> through every material at three time steps. Five materials are usable in it; snow is not.
> - The 400k-particle T3 Table costs **12.3 ms of GPU per 60 fps frame** at 4 substeps × 5
>   iterations, but only once particles are binned by brick and scattered through shared-memory
>   tiles. Seed order costs 118 ms.
> - **Snow falls back** to the shipped explicit MLS-MPM path; PB-MPM snow packs but never
>   shatters.
> - The limits: the jelly breaks under the violent hammer; the sand's slope ignores its friction
>   angle; honey is a yield-stress paste, not a slow liquid.
>
> Code: `packages/mpm-multimaterial/pbmpm-spike/` (throwaway, outside the npm workspace). The
> gated kernel, the v1 page and its capture path are untouched; the spike imports
> `packages/mpm-multimaterial/src/mpm_prelude.wgsl` read-only. Raw numbers and the run configs:
> `packages/mpm-multimaterial/pbmpm-spike/results/` (`summary.json`, `runs/`, four contact sheets).
> Measured on the RX 6800 XT (snap Chromium, RADV, GPU time from timestamp queries) unless a line
> says otherwise.
>
> | Material | PB-MPM in 3D | Standard test (S4K5, T3 grid) | 8 m/s hammer | M1 path |
> |---|---|---|---|---|
> | Water | reference liquid, ported | dam break flows wall to wall by 1 s; mean J 0.854 at 0.25 s, 0.986 at 3 s | stable; J 0.988 after | **PB-MPM** |
> | Sand | reference Drucker–Prager, ported | column collapses to a 25.2° cone (φ = 35°) | stable; a few dozen grains thrown at up to 5× hammer speed | **PB-MPM**; repose not yet controllable (below) |
> | Jelly | reference elastic (target R) | 0.32 m cube drops 0.4 m, rebounds, rests at 0.311 m (2.7% sag), det F 0.954; pressed to 52% and released, back to 91% | stable but breaks: 19 pieces, max \|F\| 236 | **PB-MPM**, with limits |
> | Clay | added: von Mises in Hencky strain, yield 0.1 | pressed to 52%, released: stays at 56% | stable, smeared, one piece | **PB-MPM** |
> | Honey | reference visco blend (ratio 0.3) + von Mises (yield 0.1) | 0.61 m column slumps to a 0.19 m mound in 0.5 s, then holds; a pour piles in rope-like folds | stable | **PB-MPM**, with limits |
> | Snow | added: Stomakhin clamp + Jp, three hardening forms | the snowball packs (mean Jp 0.85) but the wall drapes like dough; everything slumps by 2 s | stable, crushed flat, one piece | **explicit MLS-MPM** (shipped kernel): it crumbles, the wall ends stand |
>
> - **What the reference covers.** electronicarts/pbmpm has four materials on `main` and on
>   `siggraph2024`: Liquid, Elastic, Sand (Klár Drucker–Prager) and Visco (a volume-preserving
>   stretch clamp). The coiling demo emits Visco (elasticity ratio 0.07), not a viscous liquid.
>   Nothing models snow, and Elastic is a corotated shape target, not neo-Hookean.
> - **The 3D port.**
>   - A 27-node stencil, volume terms over three axes, and the unit-determinant target F/∛det F.
>   - The Drucker–Prager factor becomes (3λ + 2μ)/(2μ).
>   - The existing fixed-point i32 P2G, M = 4 × 10⁶.
>   - The prelude's `svd3`. Its U·Σ·Vᵀ reconstruction holds on RADV and on SwiftShader: worst
>     relative error 6.7 × 10⁻⁷ near identity, 2.4 × 10⁻⁴ near-singular, orthonormality at the f32
>     floor.
>   - Each iteration is one dispatch: G2P, then the constraint, then P2G. The last iteration
>     integrates instead and does not scatter.
> - **"Stable at any time step" means no NaN, not the right material.**
>   - At dt = 1/60 (1 substep) the jelly never blows up, but F drifts: det F reaches 2–6 and the
>     cube melts flat. Water's J drifts to 2.07 under the hammer.
>   - At 2 substeps × 4 iterations with relaxation 1.5, the jelly fragments.
>   - Jelly holds at 4 × 5 (the reference's 240 Hz) and at 2 × 8.
>   - The limit is motion per substep (about a cell), not stiffness. Stiffness itself depends on
>     iterations, dt and object height: an untouched 24 cm block sags 8% at 4 × 5.
>   - **M1 default: 4 substeps × 5 iterations; 3 × 5 is the step-down.**
> - **Cost per tier** (Table scene: castle, jelly tower, snowman, clay, honey, pond; same scene on
>   each tier's grid, 8 particles per cell).
>   - T3, 128×64×128, 399,320 particles: **12.3 ms** at 4 × 5, 11.1 at 3 × 5, 12.0 at 2 × 8,
>     5.1 at 1 × 8.
>   - T2, 96×48×96, 168,459 particles: 2.6–4.8 ms. T1, 64×32×64, 49,619 particles: 1.2–2.0 ms.
>   - T2 and T1 are short benches, noisy from GPU clock ramp. No integrated GPU or phone was
>     measured.
>   - SwiftShader (Subzero, CPU), T1: 1.12 s a frame at 4 × 5 and 0.43 s at 1 × 8. A software
>     adapter can only run Prove's small scenes.
>   - The T3 figures are GPU time six frames after a brick sort. They leave out the sort itself:
>     a per-frame GPU counting sort, `CountingSort` in `@bp/gpu`, not measured here.
> - **The particle pass is the whole cost, and its layout decides it.**
>   - At T3, 4 × 5, the 16 dense grid solves take 0.45 ms of the frame.
>   - Particles in seed (lattice) order: 118 ms, because a wave's lanes hit the same few nodes.
>   - Brick-sorted: 95 ms. Plus the shared-memory tile (6³ nodes, one global atomic per node and
>     channel): 49.5 ms. Plus interleaving each brick (lane *l* takes the *r*-th particle of cell
>     *l*): 26.5 ms.
>   - With the sort refreshed: 8–12 ms. If the sort is stale, cost climbs with motion: 27–32 ms
>     when the order was set at seed time.
>   - Tiled and untiled scatter give byte-identical states over the same order (`7dab29ba…`), and a
>     2.5 s Table run with the hammer is byte-identical run to run (`49286699…`).
>   - Compiling the SVD out (water only) changes nothing. Register pressure is not the cost.
> - **Dense or block-sparse: dense.**
>   - The Table leaves the domain mostly empty: 5.9–8.2% of cells, 9.4–14.7% of 4³ bricks and
>     14.5–23% of 8³ bricks hold mass, rising after the hammer.
>   - The dense grid costs 0.45 ms of 12.3 at T3 (two 16 MB buffers), so skipping empty bricks
>     would save little.
>   - Bricks matter for the particles (binning and tiles), not for the grid.
>   - Fixed-point headroom: the largest per-cell quanta is 0.35–0.53% of i32 at M = 4 × 10⁶.
> - **The snow fallback, measured.**
>   - The shipped explicit MLS-MPM snow (prelude `stress_snow` and `snow_return_map` verbatim, the
>     v1 material, 0.4·dx/dt speed guard) runs in the spike as a two-dispatch substep.
>   - At the T3 dx of 2 cm, CFL needs 57 substeps per 60 fps frame. v1 managed only by playing
>     at 0.24× real time (`frameAdvance` 0.004).
>   - It looks like snow: the struck middle crumbles to powder, the wall ends stand (80% height at
>     2 s), the ball stays packed. Under the hammer: no NaN, max speed 21.6 m/s.
>   - Cost at T3: the snowball scene (73k) **28 ms** against PB-MPM's 6.6 ms; a calm 197k column
>     11.9 against 5.9; the whole 400k Table at the explicit cadence 27 ms.
>   - So snow at T3 needs fewer particles in snow scenes, or multi-rate coupling with the PB-MPM
>     materials (an open M1 design question).
> - **The existing gate is unaffected and ports as v1 does.**
>   - `pipeline.py validate --sim mpm-multimaterial` passes on this branch: worst 2.72% of the
>     [defaults.mpm] budget, run twice byte-identical, golden B-spline f64 deviation 0.0, and every
>     invariant artifact OK (mass leak 299 of 67,500 quanta, snow σ in range, sand cases 1–3 seen).
>   - `gate.ts`, `solver.ts`, `mirror.ts` and both WGSL files import as modules. M1 lifts
>     `captureCanonical` from `packages/mpm-multimaterial/web/src/main.ts` into a capture module
>     verbatim (as the Swarm and Grow v2 pages did) and adds the v2 page to `pipeline.py` `PAGES`.
> - **Limits, for M1 and M2.**
>   - *Sand repose ignores φ*: 24–27° at φ = 25°–60°, both step settings. The reference sand only
>     resists compression.
>     - Giving it the jelly's full elastic target restores the dependence (φ 15° gives 16.5°,
>       φ 25° gives 19.8°).
>     - But from φ 35° up an aspect-1 column never collapses (spurious cohesion: welcome for a
>       sand castle, wrong for the Hourglass).
>     - The Hourglass repose check needs a calibration study first.
>   - *Jelly under the violent hammer* breaks into 13–19 pieces at every setting (det F 1.4–2.3).
>     It wobbles under the press and the drop.
>   - *Honey*:
>     - With the reference coil's ratio 0.07 the column flattens in 0.5 s.
>     - A 2.5-cell stream spreads along the grid axes in a "+".
>     - As a viscous liquid (viscosity 0.95) it spreads flat.
>     - The M1 setting (ratio 0.3, table friction 0.5, 8 cm stream) gives the mound and folds;
>       slow creep and a clean coil are not reproduced.
>   - *Wall friction* must be per material. 0.5 at the walls (the reference default) holds water in
>     a tent against them, so the grid needs a mass-weighted friction channel.
>   - *Kinematic colliders* must stop further penetration in the collider's frame. Snapping nodes
>     that are already inside out to the surface broke F under the press (det F 2–3, max \|F\| 7000).
> - **What M1 should use.**
>   - PB-MPM at 4 × 5.
>   - Brick-sorted, interleaved particles, re-binned every frame by a GPU counting sort, and the
>     tiled P2G.
>   - A dense 128×64×128 grid at T3 (96 at T2, 64 at T1).
>   - The spike's collider rule.
>   - Five materials on PB-MPM; snow on the explicit kernel with its particle budget set by the 28 ms
>     measurement.
>   - Particle budgets of about 400k / 170k / 50k, once the sort and the renderer are in the
>     frame.

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
