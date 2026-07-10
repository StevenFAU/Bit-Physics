# Spec — Boids 3D Rebuild (starling murmuration instrument)

> **Sim:** `boids-3d` (`agent-based`)
> **Surface:** Stack-B WebGPU demo in `packages/boids-3d/web/`, with a new
> flagship model beside the existing Reynolds reference kernel.
> **Working title:** **Murmuration Lab**.
> **Status:** v0.1 — research-backed implementation draft, 2026-07-09.
> **Scope decision:** this is a new simulation variant and renderer, not Lane-B
> polish. The committed `packages/boids-3d/src/boids.wgsl` and its existing
> capture remain frozen as the legacy `reynolds-1987-canonical` path.
> **Related work:** the planned 2D Reynolds/Vicsek instrument remains specified
> in [`../../boids-2d/web/verification-demo-spec.md`](../../boids-2d/web/verification-demo-spec.md).
> The two products must not collapse into the same demo: 2D owns million-agent
> active-matter phase transitions; 3D owns starling flight, collective turns,
> predator response, camera, depth, and cinematic rendering.

---

## 1. Ship outcome

Replace the current impression of “small colored squares orbiting in clip
space” with a scientifically grounded, cinematic 3D flock that can be explored
as both an artwork and an instrument.

The flagship experience is a dusk murmuration of tens of thousands of birds.
Each bird coordinates with a small topological neighborhood, respects a hard
personal-space rule, turns and banks with bounded response, and remains near a
roost volume. A user can orbit the flock, follow one bird, introduce a falcon,
paint a gust, place an obstacle, freeze time, or inspect the measured group
state. A falcon strike should produce the release's signature shot: an escape
wave tears a dark channel through the flock, the flock splits, then heals.

The product claim is deliberately stronger than “more boids”:

1. **A better model:** a `starling-topological-v1` variant grounded in measured
   starling interaction structure and published 3D flock models.
2. **A better GPU system:** exact, no-drop uniform-grid neighbor search with a
   brute-force oracle; no `O(N²)` live path at production counts.
3. **A better image:** real perspective, depth, oriented and flapping bird
   instances, density silhouette, LOD, atmosphere, temporal motion, and
   restrained post-processing.
4. **A better instrument:** GPU-measured polarization, milling, shape, density,
   neighbor, and response observables, with the simulation's simplifications
   stated in the page.
5. **A better interaction:** predator, attractor/repulsor, wind, obstacles,
   camera modes, pause/step/replay, shareable seeds and presets.

Success is not a million-agent badge at the expense of appearance. The release
gate is a beautiful 32k–100k flock on desktop with adaptive lower tiers; a
high-count impostor mode is a stretch target.

## 2. Baseline audit — why the deployed demo reads as weak

The current implementation is correct for its original canonical contract, but
that contract is far smaller than the desired product.

| Surface | Current evidence | Consequence |
|---|---|---|
| Scale | `NA = 1000` is hard-coded in [`src/main.ts`](./src/main.ts#L24). | The flock never develops a convincing density silhouette. |
| Neighbor search | Every invocation loops over every other agent in [`../src/boids.wgsl`](../src/boids.wgsl#L52). | `O(N²)` makes a meaningful count increase impossible. |
| Model | One radius and a weighted sum of separation/alignment/cohesion; no field of view, reaction delay, turn bound, bank, altitude, environment, or threat state. | Motion looks like unconstrained particles, not aerial animals. |
| World | Positions are unbounded; the live state is forcibly reloaded after 1,000 steps in [`src/main.ts`](./src/main.ts#L448). | There is no persistent place, story, or long-running behavior. |
| Camera | One yaw angle, an orthographic-like hand transform, and no view/projection matrix or depth attachment in [`src/render.wgsl`](./src/render.wgsl). | “3D” is communicated mainly by rotation, not by perspective, occlusion, scale, or parallax. |
| Marks | Each agent is an axis-aligned six-vertex square with constant clip-space size. | Birds have no heading, bank, wingbeat, body, or silhouette. |
| Framing | A full position buffer is copied and mapped every 250 ms to fit the view in [`src/main.ts`](./src/main.ts#L367). | The hot experience contains avoidable GPU→CPU synchronization and allocations. |
| Diagnostics | Full position and velocity buffers are read back for study statistics. | Diagnostics do not scale with agent count. |
| Frame scheduling | Each step creates a command encoder and bind group, submits compute, then the frame creates another encoder and submit for render. | Per-frame host overhead grows before the GPU work does. |
| Interaction | Pointer input only rotates the camera. | The user cannot touch the flock or create an event. |

The legacy kernel should not be “fixed” in place: it is the committed reference
used by the existing gate and capture. The rebuild adds a new variant, a new
gate, and a new display pipeline while preserving the old path as a selectable
**Classic Reynolds** preset and regression oracle.

## 3. Research synthesis

### 3.1 Academic anchors and what they change in the product

| Source | Finding used here | Product consequence |
|---|---|---|
| [Reynolds 1987](https://red3d.com/cwr/papers/1987/boids.html) | Aggregate motion can emerge from independent actors using local perception, simulated physics, and steering behaviors. | Keep the local-rule foundation and expose force contributions; do not script a global flock path. |
| [Couzin et al. 2002](https://case.edu/affil/sigmaxi/documents/collectiveMemoryAndSpatialSortingInAnimalGroups_CouzinKrauseJamesRuxtonFranks.pdf) | A 3D model with prioritized repulsion plus zones of orientation and attraction produces swarm, torus, dynamic-parallel, and highly parallel states; transitions can show hysteresis. | Use prioritized hard avoidance, distinct behavioral zones, bounded turning, a Couzin state gallery, and an A→B→A parameter sweep that can reveal path dependence. |
| [Ballerini et al. 2008](https://pmc.ncbi.nlm.nih.gov/articles/PMC2234121/) | Reconstructed starling flocks were better explained by a roughly fixed number of interacting neighbors—about six to seven—than by a fixed metric radius. | The flagship model uses `kSocial = 7` topological neighbors within a safety/perception cap. Classic metric Reynolds remains a comparison mode. |
| [Cavagna et al. 2010](https://arxiv.org/abs/0911.4393) | Velocity-fluctuation correlations scale with flock size, supporting long-range collective response from short-range interactions. | Measure a sampled velocity-fluctuation correlation length; show it as an observable, not a guaranteed result of the simplified model. |
| [Hildenbrandt, Carere & Hemelrijk 2010](https://arxiv.org/abs/0908.2677) | Starling-like 3D displays required aerial locomotion, a small constant number of interaction partners, and preferential motion above a roost. Their StarDisplay model includes lift/drag/gravity and banking. | The default scene is roost-bound and topological; turn rate, bank, cruise-speed relaxation, altitude, and a rear blind cone are model state, not render-only decoration. |
| [Attanasi et al. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/) | Collective turns propagate through flocks rather than occurring as instantaneous global steering. | External threats seed a local response that propagates through neighbors with reaction and refractory times. The page plots response fraction vs time. |
| [Hemelrijk & Hildenbrandt 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4436282/) | In their starling model, avoiding one nearest neighbor rather than all 6–7 coordination neighbors increased internal diffusion. | Separate `kAvoid` (default 1) from `kSocial` (default 7); do not use one neighbor definition for every behavior. |
| [Papadopoulou et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6404399/) | Empirical predator responses include blackening, wave events, splits, flash expansion, cordons, and vacuoles. | Predator scenes have named response templates and observable definitions; they do not promise that every event will occur from one generic repel force. |
| [Papadopoulou et al. 2026](https://research.rug.nl/en/publications/a-mechanistic-understanding-of-collective-escape-in-starling-floc/) | A recent data-driven 3D model identifies response propagation speed, responder position relative to the predator, and prior flock state as determinants of escape patterns. | Predator response has explicit local responders, propagation speed, relative attack geometry, and checkpoint/replay. This is the v1 research frontier, not a decorative cursor. |

### 3.2 Production and open implementation audit

| Implementation | Useful pattern | Caveat / decision |
|---|---|---|
| [Official WebGPU `computeBoids`](https://webgpu.github.io/webgpu-samples/samples/computeBoids/) | Ping-pong storage buffers feed both compute and instanced render without CPU copies; optional timestamp queries are a good instrumentation pattern. | It remains a small, brute-force `O(N²)` teaching sample. It is an API reference, not the target architecture. |
| [jtsorlinis/BoidsWebGPU](https://github.com/jtsorlinis/BoidsWebGPU) | Demonstrates that a uniform spatial grid can move browser flocking from tens of thousands to millions; its author self-reports about 4M simple 3D boids at 60 fps on an M1 Max. | Treat the count as an unverified ceiling, not a release benchmark. Our richer model and mesh render target lower counts with measured budgets. |
| [Unity DOTS Boids sample](https://github.com/Unity-Technologies/EntityComponentSystemSamples/tree/master/EntitiesSamples/Assets/Boids) | Data-oriented jobs, a sparse spatial hash, boid variants, moving targets, obstacles, and cell-level aggregation show the production value of separating data, behavior, and scene controls. | Cell aggregates are an approximation suited to that sample. This spec requires exact topological candidate selection and a brute oracle. |
| [Houdini POP Flock / steer nodes](https://www.sidefx.com/docs/houdini/nodes/dop/popflock.html) | Artist-facing flock systems compose avoid, velocity match, attraction, noise, targets, obstacles, paths, speed/force limits, and turn constraints. Houdini also layers animation by turn rate. | Copy the modular UX and force-debug view, not the closed implementation. Four headline controls stay visible; advanced forces live in disclosure. |
| [WebGPU position-based crowd project](https://github.com/wayne-wu/webgpu-crowd-simulation) | Hash-grid construction, GPU sorting, look-ahead avoidance, shadow mapping, camera controls, and timestamp instrumentation form a useful browser architecture study. Its profiling found complex mesh rendering could dominate compute. | LOD and vertex bandwidth are first-order design requirements, not cleanup after the simulation ships. Counting sort is preferable to repeated bitonic passes for the bounded dense grid here. |
| [GPU Gems 3, ch. 32](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-32-broad-phase-collision-detection-cuda) | Uniform spatial subdivision prunes all-pairs work by restricting comparisons to the same and adjacent cells. | 3D means a 27-cell stencil, and worst-case dense occupancy is still quadratic locally. Occupancy must be measured and bounded by scene density. |
| [Hoetzlein 2014](https://ramakarl.com/pdfs/2014_Hoetzlein_Fast_Neighbors.pdf) | Counting-sort fixed-radius neighbors—histogram, prefix sum, scatter, cell ranges—are a strong fit for millions of similarly sized particles. | Use a work-efficient scan and exact no-drop ranges; avoid fixed per-cell capacities. |
| [GPU Gems 3, ch. 39](https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda) | A hierarchical Blelloch up-sweep/down-sweep is work-efficient `O(n)` and extends to arrays larger than one workgroup. | Use a portable two-level scan first. Do not make a global-progress-dependent single-pass look-back algorithm a v1 portability risk. |
| [GPU Gems 3 animated crowds](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-2-animated-crowd-rendering) | Instancing, per-instance animation state, frustum culling, and distance LOD are the established large-crowd rendering pattern. | Birds can use much cheaper procedural wing animation than skeletal skinning, but still need GPU LOD and culling. |

**Code provenance rule:** these implementations are design references, not a
license shortcut. Reimplement the pipeline in project-native TypeScript/WGSL;
record the exact upstream revision and license before copying any source. Keep
the procedural bird, sky, and animation code-native so the shipped visual does
not acquire an ambiguous mesh/texture license.

### 3.3 White space and positioning

The survey finds many browser boids demos that optimize count, and many academic
models that explain real flocks. It finds far fewer experiences at their
intersection. The defensible niche is:

> **A WebGPU starling murmuration that combines topological 3D flocking,
> bank-coupled flight, measured collective response, an interactive predator,
> exact grid-vs-brute neighbor verification, and a cinematic GPU-driven
> renderer.**

This intentionally does not compete with the 2D spec on Vicsek noise sweeps,
million-agent points, or two-way 2D fluid coupling.

## 4. Simulation model

### 4.1 Variants

1. **`reynolds-1987-canonical` — frozen legacy.** Existing f32 WGSL, seed-42
   asset, capture, tests, and gate. Selectable in the new UI as **Classic
   Reynolds**. It is never routed through the new grid and never relabeled.
2. **`starling-topological-v1` — flagship.** New reference, WebGPU kernel,
   canonical descriptor, validation metrics, and gate. It is explicitly
   **StarDisplay-inspired**, not a byte-for-byte reproduction of StarDisplay.
3. **`couzin-zones-v1` — parameterization of the flagship kernel.** Same
   integrator and broadphase, but zone radii/weights and roost/threat terms are
   selected to expose swarm, torus, dynamic-parallel, and highly-parallel
   states. It shares the new variant's verification posture.

### 4.2 State

Keep state GPU-native and 16-byte aligned:

```text
position_speed : vec4<f32>  // xyz position, cruise-relative speed
heading_roll   : vec4<f32>  // normalized heading xyz, bank angle
behavior       : vec4<f32>  // response timer, refractory timer, energy, spare
identity       : vec4<u32>  // stable id, species/role, RNG key, flags
```

Ping-pong the two kinematic vectors. `behavior` is ping-ponged only in scenes
that enable threat propagation; the dry murmuration aliases a smaller layout.
Identity is stable and never inferred from cell-scatter order. Wing phase is a
hash of `(seed, stable_id)` plus simulation time, so animation needs no state.

### 4.3 Exact neighborhood definition

The default model uses two neighborhood counts:

- `kAvoid = 1`: closest visible or non-visible neighbor inside the hard
  separation radius; avoidance is all-around and highest priority.
- `kSocial = 7`: closest neighbors inside `rSocial` and outside the rear blind
  cone for alignment/cohesion.

For every boid, scan all candidates in the 27 cells overlapped by a sphere of
radius `rSocial` (grid cell edge = `rSocial`). Maintain a fixed-size register
list of the closest `K_MAX = 12` candidates, ordered lexicographically by
`(distanceSquared, stableId)`. The final selected set is therefore independent
of atomic scatter order. Reduce selected neighbors in stable-ID order so f32
addition order is stable on one adapter.

There is **no cell capacity and no dropped neighbor**. If a scene exceeds its
occupancy budget, it becomes slower and raises an occupancy warning; it does not
silently change the physics. The brute path enumerates all agents and applies
the identical candidate/tie logic.

### 4.4 Behavioral rule

For agent `i`, with normalized heading `h_i`:

```text
if closest_distance < rHard:
    desired = separation(closest kAvoid)              // highest priority
else:
    desired = normalize(
        wAlign   * mean_heading(kSocial)
      + wCohere  * direction_to_neighbor_centroid
      + wRoost   * roost_field(position)
      + wWind    * wind_field(position, time)
      + wThreat  * escape_field(local threat state)
      + wObstacle* anticipatory_obstacle_avoidance
    )
```

Important details:

- Separation uses softened inverse-square weighting and a finite hard core; a
  zero-distance tie is resolved by stable ID, never by division by zero.
- A rear blind cone applies to alignment and attraction, not collision
  avoidance.
- Acceleration and angular response are capped independently. A normalized
  weighted sum is not allowed to produce an instantaneous turn.
- Speed relaxes toward species cruise speed over `tauSpeed`; an escape event
  temporarily raises the target but still respects `vMax`.
- Noise is a seeded, temporally correlated angular perturbation. Never call a
  stateful global RNG inside the kernel.

### 4.5 Bank-coupled flight

The flagship needs aerial inertia without pretending to be a full flapping-wing
solver.

1. Project desired steering onto the plane perpendicular to heading.
2. Clamp the lateral acceleration to `aLatMax` and rotate heading by at most
   `omegaMax * dt`.
3. Set target bank `betaTarget = clamp(atan(aLateral / g), ±betaMax)` and relax
   bank toward it over `tauRoll`.
4. Couple bank to altitude/speed with a bounded lift-loss term, so hard turns
   compress and dip the flock instead of remaining perfectly planar.
5. Integrate with fixed-step semi-implicit Euler. Recommended starting point:
   `dt = 1/120 s`, two substeps at a 60 Hz simulation tick; mobile may run one
   `1/60 s` step only after equivalence is measured.

**Honesty boundary:** this is a bank-coupled kinematic flight controller based
on the qualitative mechanisms in Hildenbrandt et al. It does not solve an
aerodynamic wake, feather deformation, unsteady lift, or Navier–Stokes flow.
The page must say so. A research-faithful fixed-wing force model can be a later
variant if it gets its own reference and validation.

### 4.6 Roost, obstacles, and threat propagation

- **Roost:** soft horizontal attraction to an ellipse/spline plus preferred
  altitude; never a teleporting box boundary. Default scene remains spatially
  bounded so a dense grid is exact and camera composition is stable.
- **Obstacles:** analytic sphere/capsule/box/torus SDFs. Avoidance uses
  time-to-collision probes along heading and the SDF gradient, not only a force
  after penetration.
- **Threat:** a predator writes threat only to boids that can perceive it.
  Alert state spreads through the selected social graph after a reaction delay,
  then enters a refractory period. Escape maneuver is a preset-selectable bank,
  flash expansion, or turn-away response.
- **Falcon:** v1 supports pointer-driven flight and an autopilot pursuit curve.
  The falcon is an external agent, not a magic spherical repel field.

## 5. WebGPU architecture

### 5.1 Frame graph

One command encoder and one queue submission per displayed frame:

```text
fixed-time scheduler
  └─ for each simulation substep
       1. clear cell counts + flags
       2. histogram agents into dense 3D cells
       3. scan cell counts per block (Blelloch)
       4. scan block sums
       5. add block offsets
       6. seed scatter cursors
       7. scatter stable agent indices into cell order
       8. step topological/Couzin dynamics
  └─ low-rate GPU instruments
       9. reduce centroid / covariance / order parameters / health
  └─ render preparation
      10. frustum cull + classify LOD + write three indirect draw records
  └─ render
      11. sky/roost
      12. bird LOD 0/1/2 draws
      13. optional threat wave / force debug overlay
      14. bloom + temporal persistence + tone map
```

All buffers, pipelines, bind groups, query sets, and post textures are
persistent. Recreate only size-dependent textures on resize. Prebuild both
ping-pong bind-group directions. Never allocate, create a bind group, map a
buffer, or await the queue in the RAF hot path.

### 5.2 Dense counting-sort grid

Use a bounded dense cell ID, not an unverified hash collision:

```text
cell = floor((position - gridMin) / cellSize)
cellId = x + nx * (y + ny * z)
```

- Cell edge equals the maximum social perception radius.
- The roost bounds and density-preserving world scale determine `(nx, ny, nz)`.
- Bounds include a guard band of at least one social radius. Out-of-range agents
  clamp into boundary cells for correctness (distance checks still reject false
  candidates), set an overflow flag, and receive a stronger return field. A
  sustained overflow triggers a visible warning and a larger-grid reset; it
  never wraps or silently disappears.
- Histogram uses `atomic<u32>` counts; scan produces exact starts; atomic
  cursors scatter every stable ID once.
- A device-scoped permutation proof verifies `sortedIndices` contains every ID
  exactly once and each ID lies inside its declared cell range.
- The minimum portable path uses a two-level work-efficient Blelloch scan.
  Subgroups are an optional measured optimization only. WGSL explicitly warns
  that subgroup size and invocation mapping vary, so correctness cannot depend
  on either ([WGSL subgroup semantics](https://www.w3.org/TR/WGSL/#subgroups)).
- WGSL atomics are `i32`/`u32` only
  ([WGSL atomic types](https://www.w3.org/TR/WGSL/#atomic-types)); no design may
  assume float atomics.

Separate grid construction, simulation, instruments, and culling into bind
groups/pipelines so each shader remains within the portable storage-buffer
limit. Query actual adapter limits and clamp counts before allocation.

### 5.3 State order and determinism

v1 scatters **indices**, not the entire agent state. Simulation invocation `i`
always writes output slot `i`, preserving stable identity and making captures
canonical without a GPU reorder. Neighbor reads are indirect but cell-local.

If profiling proves the gather is the bottleneck, v2 may reorder full agent
records into cell order for cache locality. That optimization is conditional on
a permutation-aware capture and proof; it does not land as an unmeasured
complexity increase.

### 5.4 GPU instruments, no full readback

Hierarchical reductions write one compact `FlockStats` block:

```text
centroid.xyz, radius
mean_heading.xyz, polarization
angular_momentum.xyz, milling
covariance symmetric 3x3
mean/max speed, min/mean nearest-neighbor distance
mean/max cell occupancy, underfilled-neighbor count
alerted count, response-front radius, finite/error flags
```

Render and auto-framing can consume the GPU block directly. The UI reads one
ring-buffered compact block at 2–4 Hz without awaiting it in RAF. Full agent
readback happens only during exclusive capture or an explicit deep-analysis
action.

### 5.5 Scheduling and capability tiers

- Use a real fixed-time accumulator; simulation speed never depends on monitor
  refresh rate.
- Cap catch-up work. If a tab stalls, drop accumulated wall time rather than
  dispatching hundreds of unstable steps.
- Request default/core WebGPU first. A compatibility-mode path may request
  `featureLevel: "compatibility"` on supporting browsers and disables HDR,
  timestamp queries, high counts, and expensive LOD—not the simulation rules.
- Feature-detect `timestamp-query`, `shader-f16`, and subgroups. None is required
  for correctness. f16 is restricted to optional render/cull data; simulation
  state and canonical capture remain f32.
- Handle device loss with a visible message and one controlled reinitialize.
  Surface uncaptured GPU errors in the UI during development.

Current browser posture supports this target: WebGPU is available in current
Chromium, Firefox on supported platforms, and Safari 26; platform coverage still
varies, so the demo must report why an adapter is unavailable rather than show a
blank canvas ([Chrome overview](https://developer.chrome.com/docs/web-platform/webgpu/overview),
[Safari 26 WebGPU](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/),
[Firefox status](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#webgpu_api)).

## 6. Rendering specification

### 6.1 Art direction

**Dusk murmuration:** a deep blue-black sky with a low amber horizon; birds read
primarily as a coherent dark silhouette with cool rim light and occasional warm
edge highlights. Scientific color modes can replace the natural palette, but
the default should look like an authored scene, not a debug plot.

The image succeeds when three signals are obvious at a glance:

1. **Density silhouette:** thick regions become nearly opaque; sparse edges are
   lace-like and legible.
2. **Local coherence:** orientation, banking, and motion make neighborhoods read
   as one deforming body.
3. **Response waves:** a turn or threat visibly travels through the flock.

### 6.2 Perspective, depth, and camera

- Real view and WebGPU perspective projection matrices, `depth24plus`, depth
  test/write for opaque bird meshes, correct resize/DPR handling.
- Orbit: yaw, pitch, pan, dolly, inertia, pointer capture, touch gestures.
- Auto-camera eases around GPU-reduced centroid/radius; it does not spin at a
  constant rate while the user is interacting.
- Modes: **Orbit**, **Chase selected bird**, **Bird POV**, and **Director**
  (seeded camera spline for poster/loop capture).
- Clicking a bird uses an ID/depth picking pass. Selected ID is stable because
  v1 does not reorder state.

### 6.3 Bird representation and animation

Use one procedural/code-native bird asset with three GPU LODs:

| LOD | Representation | Intended use |
|---|---|---|
| 0 | Low-poly body + hinged wings + tail, approximately 24–40 triangles | Hero birds near the camera; capped count. |
| 1 | 6–12 triangle wedge/swallow silhouette with vertex-animated wings | Most visible flock members. |
| 2 | Two-triangle camera-facing, velocity-stretched bird-shaped impostor with analytic alpha | Far field and high-count mode. |

The vertex shader builds an orthonormal basis from heading plus bank. Wing angle
is a seeded phase with frequency/amplitude modulated by speed, vertical effort,
and escape state. Turning birds bank; escaping birds flap harder. Do not add a
skeletal dependency for a motion achievable with two hinge rotations.

GPU culling appends visible stable IDs to one list per LOD and writes three
`drawIndexedIndirect` records. Use hysteresis in screen-space LOD thresholds to
prevent popping. At least 1.25–1.5 px of conservative far-field coverage keeps
the silhouette from disappearing.

### 6.4 Shading and post

- One directional sun, sky/height fog, simple rim + diffuse bird shading.
- Default birds are opaque/depth-tested; LOD2 uses alpha-to-coverage when MSAA
  is enabled or a dithered cutout otherwise. Avoid order-dependent blended
  transparency for the primary silhouette.
- Optional HDR target, thresholded half/quarter-resolution bloom, filmic tone
  map, exposure control. LDR compatibility path skips HDR/bloom.
- **Temporal echo:** a screen-space persistence buffer reveals coherent motion.
  It must reset or reproject when the camera moves substantially; uncontrolled
  camera ghosting is not a feature. Default persistence is subtle.
- Scientific color modes consume the existing shared colormap module:
  natural, heading (cyclic), speed, neighbor count/density, local velocity
  fluctuation, alert age, and connected flocklet ID.
- Force-debug mode draws short vectors for separation, alignment, cohesion,
  roost, obstacle, and threat on a sampled subset only.

### 6.5 Visual performance rule

Every effect is either `O(screen pixels)`, `O(visible agents)`, or a fixed small
scene pass. Shadow mapping is optional and must be separately timed; the WebGPU
crowd implementation survey shows complex geometry can dominate after compute
is optimized. The release does not ship a beautiful 100k-agent solver hidden
behind a 20k-agent vertex bottleneck.

## 7. Interaction and product surface

### 7.1 Play controls

Keep the first view legible:

- Preset gallery
- Agent count / quality
- Separation, alignment, cohesion, response
- Tool: camera / attract / repel / falcon / gust / obstacle
- Pause, single step, reset, seed, share

Advanced disclosure contains neighbor counts/radii, FOV, turn/bank/speed,
roost, threat propagation, render, profiling, and debug controls.

Pointer tools operate in real 3D. Intersect the camera ray with a camera-facing
plane through the GPU-reduced flock centroid; mouse wheel/two-finger motion
moves the tool along the ray. Show the brush volume, force direction, and
falloff so interaction is predictable.

### 7.2 Required presets

| Preset | Model / event | Visual thesis |
|---|---|---|
| **Dusk murmuration** | Topological 7, roost, moderate bank/response | Default portfolio hero and long-running loop. |
| **Falcon strike** | Local perception + propagated escape + autopilot predator | Signature split/escape-wave/heal sequence. |
| **Flash expansion** | Fast above-flock attack, radial early responder maneuver | One empirically named predator-response study. |
| **Torus / mill** | Couzin zones, low global translation | Makes polarization vs milling legible. |
| **Dynamic parallel** | Wider orientation zone | Coherent traveling group and comparison to torus. |
| **Split and merge** | Two roost targets that converge | Tests components, framing, and cohesion. |
| **Wind canyon** | Analytic obstacles + curl gust | Interaction/avoidance showcase; consumes the repo's curl-noise vocabulary. |
| **Classic Reynolds** | Frozen current kernel and seed | Honest before/after and legacy capture access. |

Every preset definition includes seed, model, full parameters, expected
observable ranges, evidence posture, citation, director camera, poster frame,
and loop frame range. Generate the runtime registry from one checked data spine;
missing citations or expected observables fail the build.

### 7.3 Study mode

Study freezes stepping but keeps camera and render live. It presents:

- polarization `Phi = |mean(h_i)|`;
- normalized angular momentum / milling about current center of mass;
- shape eigenvalues and aspect ratios from the covariance tensor;
- mean/min nearest-neighbor distance and cell occupancy;
- sampled velocity-fluctuation correlation `C(r)` and estimated zero crossing;
- alerted fraction and response-front curve during a predator event;
- GPU timings by pass and active evidence posture;
- faithful/simplified/measured honesty text.

The `Phi × milling` trace is a hero graphic, not a tiny stat. Predator presets
add a response-time strip showing where and when the wave begins.

### 7.4 Replay and sharing

- URL state includes variant, preset, parameters, seed, count tier, camera, and
  render mode. Transient pointer position is excluded.
- A checkpoint ring supports rewind/scrub for counts up to a measured cap
  (initial target 32k). Checkpoints are device buffers copied to a bounded ring,
  not CPU arrays.
- Replaying from a checkpoint with the same event log must reproduce the same
  canonical-by-ID trajectory on the same adapter; branching after rewind creates
  a visibly new event branch.

## 8. Verification and validation

### 8.1 Preserve the existing proof

The existing legacy capture, short-horizon f32↔f64 comparison, speed clamp, and
run-twice gate stay green. The rebuild is not allowed to route the legacy
capture through the new scheduler, grid, parameters, or render-derived state.

### 8.2 New CPU oracle

Add a small f64 reference for `starling-topological-v1`:

- brute all-pairs candidate enumeration;
- the same `(distance², stableId)` topological tie-break;
- the same prioritized behavioral zones;
- bank/turn/speed/roost integrator;
- deterministic threat event log.

Use it for N≤256 algebraic/golden tests and short-horizon WebGPU equivalence,
not as a large-flock performance reference.

### 8.3 Device-side proof rows

1. Scan equals a CPU exclusive scan on adversarial count arrays.
2. Scatter is a permutation: no duplicate, missing, or out-of-range IDs.
3. Every scattered ID belongs to the declared dense cell.
4. Grid neighbor IDs equal brute neighbor IDs for random and boundary-heavy
   fixtures.
5. Brute and grid one-step state agree under the declared tolerance.
6. No per-cell truncation; occupancy sum equals N.
7. Count conserved; positions/headings/speeds/bank finite.
8. Heading norm remains within tolerance and speed remains within bounds.
9. Run twice on one adapter produces the same canonical-by-ID trajectory hash
   for the no-noise and seeded-noise canonicals.
10. Changing cell scatter order does not change selected topological IDs.
11. Compact GPU observables agree with CPU reductions at small N.
12. Threat propagation respects reaction/refractory bounds and never alerts an
    agent before the causal event can reach it.

### 8.4 Determinism posture

- **Same adapter/browser/build:** target byte-identical canonical-by-ID capture
  for the flagship path. Stable top-K selection and stable-ID reduction remove
  scatter-order dependence; measure before claiming.
- **Cross device/browser:** epsilon at short horizon plus statistical/observable
  validation over longer horizons. Flocking is sensitive and GPU transcendental
  behavior varies; do not claim cross-device pointwise identity.
- **Metric all-neighbor debug mode:** epsilon unless it also imposes a stable
  reduction order. The UI shows this posture change.
- **Render:** never part of physics equivalence. Visual screenshot checks are a
  separate product gate.

If run-twice is not byte-identical on a supported adapter, do not hide it behind
a hash. Report the first divergent field/step, downgrade honestly, and keep the
invariant/observable gates.

### 8.5 Model validation

Published measurements are comparison anchors, not automatic pass criteria for
a simplified model.

- Default topological neighborhood distribution must center on the configured
  seven social partners; the query underfill rate is reported.
- Presets have measured ranges for polarization, milling, component count,
  aspect ratios, NND, and response time. Ranges come from repeated seeded runs,
  not hand labels.
- The Couzin sweep must show distinct swarm/torus/parallel regions and an A→B→A
  hysteresis probe before its captions say “collective memory.”
- The starling scene plots sampled `C(r)` and correlation length. It may compare
  to Cavagna's scale-free finding, but it must not label itself scale-free unless
  multiple N/volume runs demonstrate the scaling.
- Predator templates classify response geometry using declared measurements.
  A generic repel event is not labeled “vacuole” or “flash expansion” by taste.

### 8.6 Visual and UX gate

Playwright captures desktop and mobile for every required preset and asserts:

- nonblank canvas and no WebGPU validation error;
- flock content occupies a sane screen-space bounding box;
- perspective/depth ordering is present in the fixture;
- controls do not overlap or clip;
- LOD transition images stay within an SSIM/error budget;
- preset thumbnails are measurably distinct;
- Falcon strike shows a time-separated baseline, disruption, and recovery;
- deterministic Director mode reproduces poster and loop frames.

## 9. Performance, memory, and adaptive quality

### 9.1 Release targets

Targets are measured on named adapter/browser/OS combinations and published as
a table; no single hero number stands in for portability.

| Tier | Comfortable default | Floor target | Render |
|---|---:|---:|---|
| Compatibility / weak mobile | 4,096 | 30 fps at 720p-equivalent | LOD1/2, LDR, no bloom/shadow |
| Mobile / integrated | 12,288–32,768 | 30–60 fps at 720p | Three LODs, reduced post |
| Desktop integrated | 32,768 | p95 ≤16.7 ms at 720p | Full default image |
| Mid-range discrete | 65,536–100,000 | p95 ≤16.7 ms at 1080p | Full default image |
| Showcase / high-end | 250,000 stretch | interactive, measured | Mostly LOD2; not a v1 gate |

At the discrete 100k target, initial budgets are:

```text
grid + scan + scatter   <= 3.0 ms
topological step x2     <= 6.0 ms
instruments + cull      <= 1.5 ms amortized
birds + sky             <= 4.0 ms
post + UI               <= 2.0 ms
```

These are hypotheses until timestamp measurements exist. The profiler must
report every row and p50/p95, not only FPS.

### 9.2 Density and worst cases

With fixed density, world linear extent grows as `N^(1/3)` so average neighbor
work remains approximately constant. Count changes do not silently increase
density. A deliberate compression tool may exceed the budget, but the UI shows
max cell occupancy and warns before performance collapses.

The broadphase is average `O(N + cells + candidates)`, not a universal `O(N)`
guarantee. All agents in one cell remains a worst-case all-pairs candidate scan.

### 9.3 Quality adaptation order

On sustained p95 budget misses:

1. lower post-process resolution and bloom iterations;
2. lower LOD0/LOD1 quotas and disable shadows;
3. reduce DPR/render scale;
4. run instruments less frequently;
5. offer/apply the next lower agent-count tier on reset.

Never compensate by increasing physics `dt`, dropping neighbors, capping cell
occupancy, or changing `kSocial` without showing a model change.

### 9.4 Host and GPU hygiene

- DPR cap 2; resize observer; destroy replaced textures.
- No full-agent CPU readback outside exclusive capture.
- No per-frame resource or typed-array allocation.
- One queue submission per frame.
- Storage-buffer vertex pulling from the simulation state; no CPU instance
  matrix upload.
- GPU timestamp queries when available; coarse CPU frame timings clearly
  labeled when not.
- Warm pipeline creation asynchronously before revealing the canvas.
- A short startup calibration chooses a comfortable count; user choice always
  overrides it.

### 9.5 Memory budget

At allocation time, print and expose a byte ledger for state ping-pong, grid,
scan scratch, cull/LOD lists, indirect records, capture ring, depth/HDR, and
post textures. Initial release targets are **under 32 MiB of agent/grid buffers
at 100k** and **under 96 MiB at the 250k stretch tier**, excluding screen-sized
attachments. Check every individual binding against the adapter's
`maxStorageBufferBindingSize` and every allocation against `maxBufferSize`
before creation.

Do not pack canonical position/heading into f16 to hit a count target. First
reuse scan scratch between non-overlapping passes, alias optional behavior
buffers in dry scenes, allocate one total-capacity LOD ID pool with three
ranges, and shrink checkpoint depth. Memory adaptation must be visible in the
quality/tier report.

## 10. Implementation plan

### v1a — retire the algorithmic risk

1. Freeze and regression-test the legacy path.
2. Implement f64 `starling-topological-v1` oracle and fixtures.
3. Implement dense 3D histogram → hierarchical scan → scatter.
4. Implement brute and grid top-K selection with shared tie semantics.
5. Land grid/brute neighbor proof, permutation proof, invariant tests, and GPU
   timings before building the large UI.
6. Implement fixed-time scheduler, persistent resources, one-submit frame.

**Checkpoint:** demonstrate 32k agents with exact no-drop neighbors, the compact
stats block, and a published pass-timing table. Stop and profile if the neighbor
pass misses budget.

### v1b — model and signature interaction

7. Add turn/bank/speed/roost behavior and validate against the CPU oracle.
8. Add threat state, reaction/refractory propagation, pointer/autopilot falcon,
   and deterministic event logging.
9. Add Couzin presets and the hysteresis sweep.
10. Add SDF obstacle avoidance and gust field.
11. Add canonical asset/capture and the new gate without changing legacy gate
    semantics.

### v1c — make it portfolio-leading

12. Perspective/depth camera and procedural LOD bird renderer.
13. GPU cull/LOD/indirect draws, wing/bank animation, sky/fog, HDR compatibility
    split, bloom/tonemap, temporal echo.
14. Tools, preset gallery, share URL, replay ring, Study instruments, force
    debug, honesty and proof panels.
15. Director camera, poster/loop generation, desktop/mobile visual tests, landing
    asset replacement.
16. Benchmark at least one weak/mobile, one integrated, and one discrete adapter;
    tune comfortable tiers from evidence.

### v2+ — only after v1 evidence

- Full StarDisplay-like lift/drag/thrust force model.
- Aerodynamic wake / V-formation mode. This is a separate model—ibis
  measurements show upwash use and flap phasing
  ([Portugal et al. 2014](https://www.nature.com/articles/nature12939)); it must
  not be faked by a V-shaped attractor and called aerodynamic.
- Full 3D fluid coupling or volumetric wind solve.
- Multi-species predator strategy and confusion-effect experiment.
- Cell-sorted state reorder, Morton layout, subgroup scan, or GPU radix sort,
  only when profiling justifies them.
- Multi-flock graph/components and large-N correlation laboratory.
- WebXR after the base WebGPU path and controls are stable.

## 11. Definition of done

The rebuild can replace the current landing-card media when all are true:

1. Legacy canonical tests/capture/gate remain unchanged and green.
2. New CPU reference, canonical descriptor, capture, and gate are committed.
3. Grid candidate and selected-neighbor sets equal brute force on adversarial
   fixtures; scatter proves no drops.
4. Default is `starling-topological-v1` with `kSocial = 7`, prioritized
   `kAvoid`, bounded turn, visible banking, cruise-speed control, and roost.
5. Dusk murmuration runs indefinitely without a hidden 1,000-step reset.
6. Falcon strike visibly disrupts and heals the flock, and its response curve is
   measured from simulation state.
7. The page ships all required presets, share URL, pause/step/reset, orbit/chase/
   POV, and pointer/touch tools.
8. No full-state readback, per-frame bind-group creation, per-frame GPU resource
   allocation, or multiple queue submissions exist in the normal frame loop.
9. GPU instrumentation publishes p50/p95 pass timings and adaptive tier choice.
10. The performance floor table in §9.1 passes on named hardware, or the table is
    revised from measurements before release—never waived silently.
11. LOD0/1/2, depth, perspective, density silhouette, atmosphere, and subtle
    motion persistence pass desktop/mobile visual checks.
12. Study mode reports polarization, milling, shape, NND/occupancy, response,
    timings, and evidence posture without pausing for full readback.
13. The page states the model boundary: topological, StarDisplay-inspired,
    bank-coupled kinematics; not a full aerodynamic or biological replica.
14. Poster and motion loop are generated from a seeded Director scene and are
    materially stronger than the current square-sprite asset.
15. TypeScript strict build, shader validation, web deploy discovery, capture
    export, Playwright smoke, and all repository gates pass.

## 12. Proposed file map

```text
packages/boids-3d/
  boids_3d/
    reference.py                 # legacy, unchanged
    starling_reference.py        # new small-N f64 oracle
    starling_invariants.py
  src/
    boids.wgsl                   # legacy, frozen
    starling_common.wgsl
    grid_histogram.wgsl
    grid_scan.wgsl
    grid_scatter.wgsl
    starling_brute.wgsl
    starling_step.wgsl
    starling_reduce.wgsl
    starling_cull.wgsl
  web/
    gen-verification.mjs         # preset/evidence data spine
    src/
      main.ts                    # orchestration only
      engine.ts                  # buffers, passes, scheduling
      camera.ts
      interaction.ts
      presets.ts                 # generated/typed registry
      instruments.ts
      capture.ts
      verify-panel.ts
      bird.wgsl
      sky.wgsl
      post.wgsl
      picking.wgsl
```

Do not let `main.ts` become another monolith. The current 486-line file is small
only because the product is small; this rebuild needs explicit engine, camera,
interaction, instrument, and capture boundaries.

## 13. Principal risks and rejected shortcuts

| Risk / shortcut | Decision |
|---|---|
| “Just increase N in the current kernel.” | Rejected: quadratic work and square sprites make both compute and image fail. |
| “Copy the 2D million-boid product into 3D.” | Rejected: duplicates the portfolio and misses the starling/flight opportunity. |
| Fixed-cap cell lists | Rejected: silent neighbor loss changes physics exactly when density is visually interesting. |
| Unverified hash collisions | Rejected in v1: bounded roost permits exact dense cell IDs. |
| Global attractor animates the flock | Useful as one force/tool, rejected as the default story; no scripted hero path. |
| Predator = radial repel cursor | Rejected as the flagship. Threat perception and propagation are explicit state. |
| Bank only rotates the mesh | Rejected: bank affects turn/altitude dynamics; otherwise the page would present animation as physics. |
| Full aerodynamic claim | Rejected for v1. Bank-coupled kinematics is the honest scope. |
| One high-poly mesh for every bird | Rejected: audited WebGPU crowd work shows render geometry can dominate compute. |
| Additive glow for all birds | Rejected as the natural default: it destroys opaque density silhouette and depth. Keep an artistic/science mode. |
| CPU auto-fit over full state | Rejected: GPU compact reductions already provide the needed values. |
| Cross-device trajectory identity | Rejected: long-horizon flocking and GPU f32/transcendentals demand observable/statistical validation. |
| Unmeasured “4M birds” marketing | Rejected: publish named-hardware p50/p95 tables for this implementation. |

---

**Recommended product call:** approve `starling-topological-v1` plus the frozen
legacy path, and build v1a before any rendering overhaul. The exact neighbor
pipeline is the first risk. Once it holds 32k with proof and timings, the
predator model and cinematic renderer turn that engine into the portfolio piece.
