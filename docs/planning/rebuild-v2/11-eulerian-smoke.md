# 11 — Plume (3D smoke and fire)

> Part of [Rebuild v2](README.md). Replaces `packages/eulerian-smoke/web`. Wave D.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

- **Keep:** the live f64 reference gate on a non-chaotic canonical (Taylor–Green), the WGSL
  port's guarded wrap (the reference's floating-point edge bug stays quarantined), the dye
  decay lesson at small Δt, the honest "swirl = vorticity confinement — aesthetic forcing,
  injects energy" note, and the divergence-residual view.
- **Drop:** 2D-only smoke that reads as a soft orange smear (semi-Lagrangian dissipation
  plus a glow pass); eight scenes on a 720 px square; Play mode showing PROVE prose and
  orange caveats on top of the art.
- **Lesson:** browser 2D stable-fluids demos are common; what is rare is **3D smoke and fire
  with real light**, and an honest view of the numerical choices that make or break it.
  The backend already has 3D captures (the 128³ frontier canonicals), so the reference side
  of a 3D gate exists.

## The experience

**Pitch:** *Light a fire, add wind, and watch numerical dissipation eat a vortex.*

**First ten seconds:** a campfire on dark ground at night. Flames lick upward with
blackbody colour; smoke rises above them, self-shadowed, catching the firelight from below
and fading into the dark. A slow breeze bends the column. It looks like a VFX shot.

**Signature moment — Dissipation Lab:** the same smoke ring launched into two side-by-side
tanks, one with semi-Lagrangian advection, one with MacCormack (and a third with flow maps
on T3). One ring smears out within seconds; the other keeps its core. A plot of kinetic
energy vs time per scheme makes the cost of each choice visible. This is the scene that
explains why the field invests in advection schemes.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **Campfire** (default) | fuel source, combustion, smoke, breeze | "Feed it. Blow on it." |
| **Chimney** | a tall stack in a crosswind | "Turn the wind up until the plume breaks." |
| **Candle** | laminar flame that turns turbulent above | "Where does smooth become turbulent?" |
| **Obstacle Course** | smoke past a sphere and a building; 3D wake | "Place obstacles; read the wake." |
| **Smoke Rings** | a ring launcher | "Fire two rings. (Then try Vortex Rings.)" |
| **Dissipation Lab** | side-by-side advection schemes, energy plot | "Same physics, different numerics." |

### Tools

*Emitter* (smoke or fuel; place and size), *Ignite*, *Wind* (direction + strength),
*Blow* (impulse at the pointer), *Obstacle* (sphere, box, building), *Slice* (a plane
showing velocity, pressure, vorticity, divergence, temperature), *Camera*.

## The model

- 3D grid (MAC staggered velocity), fields: velocity, smoke density, temperature, fuel.
  Grids: T3 128³ (or 192×128×128 for Chimney), T2 96³, T1 64³.
- **Advection:** MacCormack with a limiter (default); semi-Lagrangian (comparison);
  flow-map advection (one-step flow maps for real time — T3 only, stretch).
- **Forces:** buoyancy from temperature and density; vorticity confinement as a labelled
  option (off in the gated path); wind as a boundary inflow and a large-scale body force.
- **Combustion:** fuel advects and burns above ignition temperature, releasing heat and
  soot (Nguyen et al. 2002-style simplified model), with expansion as a divergence source
  in the pressure solve.
- **Pressure:** MGPCG (shared with Wave Tank); Jacobi as the T1 fallback with a declared
  residual.
- **Obstacles:** voxelised SDFs with no-slip/free-slip choice.

## The look

- Art direction: **night VFX plate**. Dark ground with a little firelit texture; warm key
  light from the fire itself, a cool moonlit fill; haze.
- `VolumeMarch`: single-scattering ray-march of smoke density with a light-march shadow
  volume (computed at half resolution into a 3D texture), Henyey–Greenstein phase, blue-
  noise jitter + temporal accumulation; fire emission from temperature through the
  committed Planck-locus LUT already used by heat-equation; AgX tone map, light bloom on
  flames only.
- Slice view: crisp 2D field with `ColorScale`, drawn as a glass plane in the scene.

## The proof

- Port the gated kernels for the existing 2D Taylor–Green gate unchanged, or replace the
  gate with a 3D Taylor–Green canonical at a small tier (e.g. 32³) re-run live against the
  f64 reference — following the live-reference pattern already used by the smoke, ISF and
  heat gates. Either way, measured-then-declared.
- **Projection residual:** max |∇·u| after the pressure solve, live, vs the declared bound.
- **Taylor–Green energy decay:** early-time viscous decay rate vs the analytic rate.
- **Advection honesty:** Dissipation Lab's energy curves are measured on the visitor's GPU;
  MacCormack's non-conservation of smoke mass is shown, not hidden.
- Vorticity confinement and combustion are labelled *added forcing / simplified model*.

## Performance targets

| Tier | Grid | Target |
|---|---|---|
| T3 | 128³ | 60 fps sim + volume render |
| T2 | 96³ | 60 fps |
| T1 | 64³ | 30 fps |

## Risks and open questions

- 128³ MGPCG + MacCormack + volume render at 60 fps is ambitious on WebGPU; measure each
  pass in M0 and allow the sim to run at 30 Hz with render interpolation.
- Self-shadowing quality vs cost: half-resolution light volume, updated every other frame.
- Fire is easy to make ugly; art-direct with reference footage and keep emission subtle.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | 3D smoke (no fire) with `VolumeMarch` + shadow volume; MGPCG measured; gate decision made |
| M1 | Campfire (combustion + blackbody), Wind, Emitter, Obstacle tools |
| M2 | Dissipation Lab with energy plots; Slice view |
| M3 | Chimney, Candle, Smoke Rings, flow-map advection (T3), posters/loops |

## References

- Stam 1999, *Stable fluids*, SIGGRAPH
- Fedkiw, Stam & Jensen 2001, *Visual simulation of smoke*, SIGGRAPH
- Selle et al. 2008, *An unconditionally stable MacCormack method*, J. Sci. Comput. 35
- Nguyen, Fedkiw & Jensen 2002, *Physically based modeling and animation of fire*, SIGGRAPH
- McAdams, Sifakis & Teran 2010, *A parallel multigrid Poisson solver*, SCA
- Crane, Llamas & Tariq 2007, *Real-time simulation and rendering of 3D fluids*, GPU Gems 3 ch. 30 — [NVIDIA](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids)
- *One-Step Flow Maps for Real-Time Fluid Simulation with Dynamic Boundaries* (Georgia Tech thesis, 2025) — [repository](https://repository.gatech.edu/entities/publication/d1cf0296-3425-438c-968e-2eaeabf3147f)
