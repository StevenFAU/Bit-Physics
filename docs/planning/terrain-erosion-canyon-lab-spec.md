# Canyon Lab — terrain erosion WebGPU specification

> **Status:** research-backed candidate specification, v0.1. Researched 2026-09-06; finalized 2026-09-07. Implementation has not started. Numerical tolerances, device coverage, preset outcomes and performance figures stated as targets below are unmeasured.
>
> **Audience:** Bit-Physics owner and implementation/review contributors.
>
> **Decision:** build a new `terrain-erosion` package: interactive shallow-water hydraulics coupled to layered bedrock incision, loose sediment, transport and deposition, presented as a polished 3D canyon laboratory.
>
> This planning document does not amend [the repository architecture](../architecture.md) or authorize a release. It follows the posture of [docs/planning](README.md). Research covered primary academic work, official terrain-tool documentation, browser implementations and the repository at commit `69265d2`.

## 1. The experience to build

**Give the visitor a river they can use to carve a canyon.** Start with an attractive layered plateau, a small upstream reservoir and a shallow drainage notch. Opening the outlet sends water into the notch. Loose cover washes away, soft rock incises faster than resistant layers, muddy water carries the removed material downstream, and deposits build where transport weakens. The visitor can reroute the source, excavate a diversion, build a sediment dam, pulse a flood and inspect what changed.

The ambition is a responsive landscape instrument with a compelling default scene. The first minute must make the relationship between intervention, water, rock and sediment understandable without reading equations. The numerical instruments are available at the point of curiosity.

The flagship loop is:

1. **Act:** move water, alter a barrier, or change a material.
2. **See:** flow responds, sediment changes color, terrain physically changes.
3. **Understand:** inspect a section, a flow arrow or a material budget.
4. **Compare:** rewind to a checkpoint, make a different intervention, and compare outcomes.

A handsome seed terrain is permitted. The excavation after initialization must come from the simulation; prerecorded canyon growth, hidden terrain morph targets and changing only the color map do not satisfy this specification.

### 1.1 What “canyon erosion” means here

The core models downcutting into a stratified substrate, removal of loose cover, sediment transport, deposition and granular slope relaxation. It produces an evolving **2.5D terrain rendered in 3D**: one ground elevation and one free-water surface at each horizontal position.

Alternating resistant and weak strata are essential to the visual direction. The National Park Service describes the different cliff/slope forms of Grand Canyon rock units and the combined roles of floods, weathering and rockfalls. That is the geological inspiration; the core does not reproduce every one of those mechanisms. [NPS, *Grand Canyon Geology*](https://www.nps.gov/grca/planyourvisit/upload/life_geology.pdf)

Actual arches, overhangs and caves require multiple occupied intervals in a terrain column. They belong to the specified frontier extension in §12, with a different representation and its own verification.

### 1.2 Three required release experiences

| Experience | Visitor action | Required visible response | What it demonstrates |
|---|---|---|---|
| **Cut the Plateau** — default | Open a reservoir, vary discharge, paint resistance | A channel deepens through soft strata; resistant bands persist longer; a sediment plume exits into a depositional basin | Flow-driven incision and material contrast |
| **River Heist** | Excavate a side channel or build a low sediment berm | Water divides or reroutes; the new route erodes and the abandoned route loses transport; deposits change | Terrain → flow → terrain feedback |
| **Break the Dam** | Build an alluvial dam, fill upstream, open a notch or increase inflow | Overtopping erodes the dam; a downstream water and sediment pulse creates deposits | Coupled water storage, entrainment and sediment export |

A fourth **Sediment Shield** experiment ships in the inspection workspace: compare the same bedrock channel with and without loose cover. It makes the bedrock-cover mechanism falsifiable and gives the moat a simple, legible centerpiece.

These are illustrative synthetic scenarios. “Break the Dam” represents erosion of a granular embankment, not concrete fracture, piping, geotechnical safety analysis or a reconstruction of a historical event.

## 2. Fit with Bit-Physics and the moat

The deployed portfolio already includes MPM, PIC/FLIP, SPH, multiphase fluids, smoke, heat and fracture. The new capability is a persistent evolving landscape driven by depth-averaged surface water. It is a new solver, not another MPM material preset.

The strongest precedents inside this repository are:

- [Heat’s reference specification](../sim-specs/volumetric-grid/heat-equation/spec-ref.md): visible error, independent analytic checks, live stability information and reproducible scenes.
- [PIC/FLIP’s reference specification](../sim-specs/particle-fluids/pic-flip/spec-ref.md): distinguish formal invariants, numerical equivalence and chaotic showcase behavior.
- [Fracture’s specification](../sim-specs/fracture/phase-field-fracture/spec-ref.md): constrain the differentiation claim to the demonstrated feature combination and name adjacent prior art.
- [The browser deployment pipeline](../../tools/productization/web-deploy/pipeline.py) and [verifier](../../tools/productization/web-deploy/verify.py): capture from the real browser solver, reapply the established gate and run twice.
- [The current catalog](../../tools/productization/web-deploy/web/pages/index.html): reuse the existing typography and instrument-like visual identity. The master catalog is design context, not an authoritative implementation inventory.

**Proposed moat:** an immediately playable canyon simulation whose water and sediment accounting, material response and numerical errors can be inspected and tested on the visitor’s GPU, with reproducible interventions and strong visual presentation.

Do not market this as “first browser erosion,” “first WebGPU erosion,” or “the only verified erosion.” Existing browser projects include TerrainX, LanLou’s sandbox and metarapi’s experiments. Hyperpoly also advertises conservation and GPU validation, although this research did not reproduce its claims. The differentiation must be demonstrated by our shipped experience and evidence. [TerrainX](https://github.com/GPU-Gang/WebGPU-Erosion-Simulation), [LanLou](https://github.com/LanLou123/Webgl-Erosion), [metarapi](https://github.com/Metarapi/eulerian-erosion), [Hyperpoly](https://github.com/GUINEA-PIG-TRENCH/hyperpoly-terrain)

### 2.1 Make the moat observable

The main viewport has a small **Water / Sediment / Stability** status strip. Selecting it opens the instruments; it does not cover the scene with a permanent test dashboard.

The inspection workspace exposes:

- Where excavated material went: **loose cover, waterborne sediment, deposited material and boundary export**.
- Water entering, stored and leaving; sources, drains and edits are separate ledger entries.
- A cross-section through the channel showing the initial bed, current bed, rock interfaces, loose cover and water surface.
- Local flow speed, depth, bed shear, active rock layer and incision/deposition rate.
- A compact analytic experiment run on the visitor’s adapter, with measured error and the declared acceptance threshold.
- Negative controls, such as a deliberately unmatched bed source or disabled sediment credit, executed in an isolated proof fixture.

Use precise labels: **analytic check passed**, **reference agreement passed**, **budget within tolerance**, **illustrative scenario**. A global green badge must not imply that every canyon shape is experimentally validated. An unavailable or stale result is shown as such.

## 3. Research decisions and alternatives

### 3.1 Industry lessons worth adopting

| Source | Observed capability | Design decision |
|---|---|---|
| QuadSpinner Gaea, Erosion_2 | Separate downcutting, feature scale and sediment controls; spatial precipitation; coarse-to-fine workflows | Small set of meaningful controls with spatial brushes; separate scene scale from speed |
| SideFX, HeightField Erode 3.0 | Feature size in metres; minimum feature size tied to grid resolution; masks; height/sediment/debris/flow outputs; freeze/history controls | Physical units, visible resolution, field overlays and checkpoint inspection |
| World Machine, Hurricane Ridge | Soil over rock, spatial parameter maps, repeatability and material-based outputs | Preserve separate rock/cover state; paint resistance; replay exact interventions |

Sources: [Gaea Erosion_2, current documentation](https://docs.gaea.app/using/using-gaea/understanding-erosion/erosion_2/), [SideFX HeightField Erode 3.0, introduced in 21.0; current docs](https://www.sidefx.com/docs/houdini/nodes/sop/heightfield_erode.html), [World Machine Hurricane Ridge, builds 4041–4051, 2024–2025](https://www.world-machine.com/version/hurricane-ridge).

These products establish useful authoring and presentation precedents. Their proprietary algorithms and vendor speed claims do not establish our physical validity or WebGPU frame rate. Their controls are not interchangeable physical coefficients.

### 3.2 Solver selection

| Method | Strength | Limitation for this product | Decision |
|---|---|---|---|
| Droplet/particle heightfield erosion | Simple authoring model, fine gullies | GPU scatter/ordering costs; often no persistent water dynamics | Reference comparison only |
| Virtual pipes on a heightfield | Established interactive GPU erosion architecture | Pipe-flow and advection choices need separate scrutiny; a pleasing result does not establish correct hydraulics | Historical baseline, not the core |
| **Finite-volume shallow water + explicit material exchange** | Persistent water, shocks, wetting/drying, direct water/material budgets | CFL cost; empirical erosion closure; steep thin-flow risks | **Selected core** |
| Coupled shallow water–Exner bedload | Strong morphodynamic formulation for appropriate sediment regimes | Additional closures and coupling complexity; does not automatically solve wet/dry robustness | Future sediment-model extension |
| Stream-power landscape evolution | Efficient large-scale drainage/incision | Does not supply the transient water response needed by the default sandbox | Possible generation/reference tool |
| Stochastic geomorphological transport | Recent momentum-aware long-timescale terrain method | Different temporal assumptions and porting work | Dedicated research variant after the core |
| Multilayer columns | Actual undercuts, arches and support loss | New topology, hydraulic representation and expensive rendering | Frontier expansion with explicit admission gates |
| Full 3D MPM/SPH/FLIP/voxels | Rich local solid/fluid interactions | Much higher cost for a large persistent landscape; overlaps existing portfolio | Later local coupling, not the landscape engine |

Mei, Decaudin and Hu’s 2007 GPU method is the foundational graphics baseline. Št’ava et al. demonstrated interactive layered erosion with user-controlled terrain/water in 2008. The selected core draws instead on well-balanced finite-volume hydraulics and explicit sediment reservoirs. [Mei et al., 2007](https://evasion.imag.fr/Publications/2007/MDH07/), [Št’ava et al., 2008](https://diglib.eg.org/items/60afda0c-a666-4df8-90dd-9b80afc554c2), [Audusse et al., 2004](https://publications.imp.fu-berlin.de/478/)

### 3.3 Why a plain height eroder is insufficient

One scalar “terrain height” cannot distinguish washing off soil from cutting rock, show sediment protection, or account for deposition with porosity. A persistent sediment state also creates a visible downstream consequence to upstream actions.

SPACE explicitly treats alluvium, bedrock and transported sediment, including shielding by cover. We adopt that reservoir/cover idea, but replace its landscape stream-power forcing with local shallow-water shear. **The result is a specified hybrid, not a SPACE implementation, and does not inherit SPACE’s validation.** [Shobe, Tucker and Barnhart, *SPACE 1.0*, 2017](https://gmd.copernicus.org/articles/10/4577/2017/)

## 4. Product and interaction specification

All dimensions and latency values in this section are proposed product targets.

### 4.1 Viewport and navigation

At desktop widths, the 3D viewport occupies at least roughly three quarters of the initial usable workspace. Use a compact top bar, a left tool shelf, a collapsible right inspector and a bottom transport/history strip. Start with the inspector collapsed.

Use the catalog’s IBM Plex family, dark surfaces and restrained turquoise accent. Sandstone, sediment and water supply most of the color. Avoid making every instrument compete for attention.

Provide orbit, pan, dolly, orthographic plan view and a saved canyon-overlook view. Double-click focuses on a point; an explicit **Home** restores the framing. Orbit uses an explicit mouse gesture and never paints terrain accidentally. Touch uses separate navigation and tool modes. A lower-resolution inspection experience on small screens is acceptable; desktop is the initial performance target.

A scale bar and north/grid orientation are available. Vertical exaggeration defaults to 1×, affects rendering only, and stays visibly labelled whenever changed.

### 4.2 Tool shelf

| Tool | Gesture and feedback | Physical/state semantics |
|---|---|---|
| **River source** | Place, drag, rotate inlet arrow; discharge slider | Volume source or boundary inflow with specified momentum |
| **Rain** | Paint a persistent rainfall mask; show intensity footprint | Adds measured water volume with zero horizontal momentum |
| **Dig** | Drag a cut; preview volume and affected area | Removes cover first, then rock; records exported solid volume |
| **Build** | Paint loose fill or draw a berm | Imports alluvium with explicit volume; it can later erode |
| **Resistance** | Paint softer/harder substrate; show overlay while painting | Changes a material multiplier, not terrain height |
| **Probe / section** | Hover/pin a value; drag a transect | Read-only sample or section chart |

A **Clear water** utility removes a declared volume and accounts for any entrained sediment removal; it never silently deletes a waterborne solid reservoir.

Every active tool has a clear cursor footprint, units, affected material, and an undo affordance. Keyboard shortcuts are optional accelerators, never the only route. Controls need labels, keyboard operation, visible focus and at least 44 CSS-pixel touch targets where used on touch devices.

Brush input is resampled by world distance and integrated against simulation time. Material/water amounts cannot depend on pointer event frequency, frame rate or device pixel ratio. Normalized source kernels preserve the requested total discharge when the footprint changes.

### 4.3 Controls and clocks

The default control surface contains discharge, rainfall, material response, loose-cover amount, pause and reset. Advanced controls contain friction, threshold stress, settling speed, porosity, cover length scale, grid spacing and solver diagnostics.

Two separate controls:

- **Playback speed:** advances more actual solver substeps if the device can afford them. Display requested and achieved hydraulic-time speed.
- **Material response:** multiplies incision and entrainment coefficients together, with matched source/sink transfers. It leaves sediment advection tied to the water flux. Display **“Material response ×N”**; do not label this “years.”

Physical benchmark fixtures lock response to 1×. The scenic default may use an accelerated coefficient set. Settling speed remains a separate parameter, and changing it must not be hidden inside the speed slider.

An **Erosion off** control sets incision and entrainment to zero; its description says **“Existing sediment can still settle and loose slopes can relax.”** For fixed-terrain hydraulic inspection, open a separate water-only comparison initialized from the selected terrain, with its own water budget and no mobile sediment; preserve the full coupled checkpoint for return. Halting the entire simulation freezes all state but preserves camera and inspection interaction.

### 4.4 History, comparison and export

Provide pause, single step, reset-to-preset and named checkpoints. Scrubbing restores a checkpoint and replays ordered events; it does not integrate dissipative physics backward.

Undo restores the state preceding an edit and replays the remaining event history if needed. It must not apply an inverse brush to an already eroded landscape and call that undo. While replay is running, keep the camera usable, show progress and allow cancellation.

A/B comparison uses one saved baseline and one current branch, with linked cameras and a difference view. On weaker hardware compare against a frozen baseline render/state; two full live solvers are optional.

Exports:

- Repository-compatible scientific capture with restart state and provenance.
- Portable project recipe: seed, initial fields or their hashes, dimensions, parameters, ordered events, solver version and checkpoint references.
- Float height/material field export plus readable metadata.
- PNG capture with optional instrument legend.

A URL may carry a small versioned recipe and seed. It must not imply that a large edited terrain has been uploaded or shared. Full state uses local file export/import or IndexedDB; no server is required.

### 4.5 Visual treatment

**Geometry:** GPU-displaced terrain mesh, crisp silhouette, continuously updated terrain normals, visible layer contacts and a cutaway section. Cosmetic triplanar rock detail can enrich surfaces but must not alter hydraulic geometry. Layer color follows the substrate’s world-space interfaces; it must not slide with normalized terrain height.

**Water:** render the evolved free surface with depth-dependent absorption, controlled reflection, shoreline blending and velocity-driven surface detail. Mud color/opacity is driven by the mobile sediment field. Use a bounded foam/tracer effect derived from flow; explain it as a visual indicator rather than resolved air entrainment.

**Change:** show erosion/deposition as a signed, stable-scale overlay. Provide an initial/current wipe and a section difference. Avoid auto-rescaling every frame, which can make negligible change appear dramatic.

**Lighting:** stable terrain shadows, limited ambient occlusion and subtle atmosphere. Screen-space effects and normal detail are expendable quality features. Preserve readability under a flat scientific-lighting preset.

**Temporal behavior:** smooth camera motion and bounded render interpolation between solver states. Reset temporal history after edits, checkpoint restoration or camera cuts. Do not interpolate across dry/wet transitions in a way that displays water on dry barriers.

Free-falling sheets, plunging-waterfall pressure, particle splashes that excavate rock, and underwater tunnels are outside the core hydraulic representation. Decorative effects cannot imply those are resolved.

## 5. Physical and numerical contract

This section specifies the proposed model. It combines published ideas with explicit design choices; it is not a claim of a previously validated coupled solver.

### 5.1 Domain and state

Uniform Cartesian horizontal grid with cell area `dx × dy`, local coordinates in metres and hydraulic time in seconds. Use f64 for the CPU reference and f32 for WebGPU state.

A starting **scene-design hypothesis** is a 256 m × 256 m domain with about 32 m relief, a shallow initial drainage route and an approximately 8 m-wide active channel. At 512² this gives 0.5 m cells and about 16 cells across that channel. These are prototype inputs, not calibrated geology or a promised final preset.

Primary conserved fields:

| Symbol | Meaning | Units |
|---|---|---|
| h | Carrier-water equivalent depth | m |
| qx, qy | Depth-integrated horizontal water discharge | m²/s |
| R | Compact bedrock surface elevation relative to local datum | m |
| A | Alluvial solid volume per horizontal area | m |
| S | Mobile solid volume per horizontal area | m |

Derived fields: water velocity `u = q/h`, physical loose-cover depth `H = A/(1-p)`, bed elevation `z = R + H`, water surface `eta = z + h`, and mobile concentration `C = S/h`.

Assumptions: constant water density, equal compact-rock and sediment-grain density, fixed alluvial porosity `p`, a single effective dilute mobile-sediment class, and hydrostatic depth-averaged water. The dilute approximation neglects sediment feedback on mixture density, pressure and momentum. It therefore has a declared concentration envelope; a starting ceiling of 0.02 is a design hypothesis to probe, not a universal scientific threshold.

Store a finite erosion floor and world-space rock-interface elevations. A material table holds each layer’s erodibility, threshold and appearance. Horizontal strata are sufficient initially; gently warped interfaces are allowed if strictly ordered. The active layer is determined from R. Sediment deposited above it remains alluvium rather than inheriting the underlying rock identity.

### 5.2 Water equations

For horizontal vector q and identity tensor I:

```text
∂t h + div(q) = rain + inlet - evaporation - drain
∂t q + div(q ⊗ q / h + 0.5 g h² I)
    = -g h grad(z) - Cf |u| u + declared momentum sources
```

Here `Cf` is dimensionless quadratic bed friction and `g` is gravitational acceleration. The paired bed-shear magnitude is `tau = rho_water Cf |u|²`. Friction is a dissipative source, not a mass sink.

Rain adds water with zero horizontal momentum. An inlet supplies its declared velocity. Drains remove local water and its corresponding momentum. Evaporation removes water, retains sediment, and uses an explicitly documented momentum convention: remove water at local horizontal velocity. Local source integration must never demand more water than exists.

Boundary types: impermeable walls, periodic boundaries for selected tests, prescribed discharge inlets and stage/radiation-compatible open outlets. Characteristic regime handling must avoid prescribing both discharge and stage where that overdetermines the flow. Record backflow and its prescribed sediment concentration. Do not delete water near an edge to mimic an outlet.

### 5.3 Discretization

Use a conservative finite-volume method with HLL face fluxes, a compatible well-balanced topographic source, limited MUSCL reconstruction and SSP RK2 for the fixed-bed homogeneous transport operator. Begin the probe with first-order reconstruction; the release solver must earn its higher-order claim on smooth tests.

Hydrostatic reconstruction provides a well-established foundation for equilibrium preservation and nonnegative depth when paired with an appropriate flux and timestep. It is not a complete proof for any arbitrary assembled implementation. [Audusse et al., 2004](https://publications.imp.fu-berlin.de/478/)

Compute shared face fluxes once, then gather them into adjacent cell updates. Depth draining limits must act on shared transfers; independently clipping final depths is prohibited. Use consistent water and sediment face transport, including limiter effects.

Start with a CFL target of 0.4 under the conservative two-dimensional bound:

```text
dt <= CFL / max_cells(
    (|u_x| + sqrt(g h))/dx + (|u_y| + sqrt(g h))/dy
)
```

This is an initial engineering choice, subject to the precise flux/source positivity derivation. Add source, erosion, settling and talus restrictions. A user speed request never overrides a stability bound.

Use a wet/dry velocity regularization whose parameters are scale-aware, serialized and tested. Tiny-depth water remains in the water budget; setting its momentum to zero is a recorded dissipative operation. Do not make epsilon-water appear or disappear to keep a cell wet.

**Critical canyon gate:** hydrostatic reconstruction can distort velocity/depth for steep beds, shallow water and coarse grids. Require a sloping thin-flow refinement test and monitor under-resolved wet terrain. Increasing the dry threshold is not a fix. [Delestre et al., *A Limitation of the Hydrostatic Reconstruction Technique*, 2012](https://arxiv.org/abs/1206.4986)

### 5.4 Sediment, cover and bedrock

The selected core has no separate bedload reservoir:

```text
∂t R = -Er
∂t A = D - Ea - div(q_talus)
∂t S + div(u S) = Ea + Er - D
```

Therefore the solid-volume integral of `R + A + S` changes only through declared solid transport boundaries, terrain edits and any explicitly added conversion processes. Account for bedrock changes relative to the initial reference, so a large datum does not conceal a small loss through cancellation.

Recommended v1 closure:

```text
Ea = ka       max(tau - tau_ca, 0) × (1 - exp(-H/Hstar))
Er = kr[layer] max(tau - tau_cr[layer], 0) × exp(-H/Hstar)
D  = ws × C
```

The excess-stress exponent is fixed at one. `ka` and `kr` have units m/(Pa·s); stress thresholds are Pa; `Hstar` is m; `ws` is m/s. A named “sandstone” visual preset does not establish a universal sandstone coefficient.

This combines cover logic with an excess-shear response. GPU shallow-water breach research supports excess-shear erosion as a useful calibrated model family, but one such study discards washed-away material and omits deposition. Our reservoir accounting deliberately retains that material. Its reported validation is not ours. [Dazzi, Vacondio and Mignosa, 2019](https://air.unipr.it/bitstream/11381/2859457/3/Dazzi_et_al_v13_REV1_IRIS.pdf)

Update rules:

1. Bound entrainment by available A and rock erosion by the available layer/floor.
2. Bound new mobile material by the declared concentration envelope. Unentrained material stays in its original reservoir.
3. Credit every decrement of R/A to S with the same accepted transfer amount.
4. At fixed h, settling uses `S_new = S_old exp(-ws dt/h)`; credit the difference exactly to A. Couple changing-h steps through the documented split.
5. If drying or water removal leaves excess concentration, conservatively deposit the excess; when fully dry, deposit all remaining S. Never clamp S away.
6. Process rock-interface crossings in bounded source substeps. Never apply a soft layer’s rate through a resistant layer.
7. Keep advected S nonnegative using a bounded conservative scalar method tied to the water flux. Concentration reconstruction must not create sediment or move it through a closed face.

In f32, the credited removal must agree with the represented donor change. If a bed increment is below representable resolution, either retain it in a serialized compensated/carry representation or defer the whole transfer; never increase S while R remains unchanged. Include this case in the precision fixtures.

The material response multiplier changes `ka` and `kr`, not water timestep, sediment velocity or the geological clock. The multiplier and closure version are stored in every capture.

### 5.5 Slope relaxation and bank behavior

Granular relaxation transports A downslope where the surface exceeds a specified repose angle:

```text
q_talus = -kt max(|grad(z)| - tan(phi), 0) × grad(z)/|grad(z)|
```

Use zero flux at zero slope, `kt` in m²/s, donor limits on A and a conservative face update. The discrete version must document how diagonal neighbors or directional splitting affect isotropy. Validate a rotated mound and ridge.

This permits loose banks to slump and alluvial dams to relax. It does not permit silently smoothing solid rock into sediment. Any later weathering rule must explicitly transfer `R → A`, conserve grain volume and carry its own rate/model label.

The core has no cantilever failure or resolved boulders. Call its effect **granular slope relaxation**, not rock fracture or a full landslide solver.

### 5.6 Coupling and budgets

For the initial release, use documented first-order operator splitting of water/transport, material exchange and talus. The fixed-bed transport subproblem may be second-order; **the complete coupled scheme is not advertised as second-order** until an upgraded split earns that claim.

Evolving z changes the next hydraulic solve. Keep h as stored water volume when the bed moves; recompute eta and let pressure gradients move the water. Artificially restoring the previous water level would create or destroy water. Moving-bed work and empirical erosion dissipation mean total mechanical-energy conservation is not a core claim.

Limit maximum accepted bed change per coupling step against local depth, horizontal cell scale and remaining layer thickness. The precise limits are declared in the M0 probe and locked before coupled acceptance runs. Subcycle exchanges as needed; expose when acceleration is limited by transport or geometry.

Water residual:

```text
water_residual = current_water - initial_water
               - cumulative_inputs + cumulative_outputs
```

Solid residual:

```text
solid_residual = integral[(R-R_initial) + (A-A_initial) + (S-S_initial)]
               - imported_solids + exported_solids
```

Use absolute residuals and residuals normalized by a declared throughput/initial-mobile scale. Do not normalize only by the enormous unchanging bedrock inventory. Separate numerical residual from intentional brush transfers.

## 6. WebGPU engineering and optimization

### 6.1 Runtime design

Use TypeScript, WGSL and Vite following current per-sim packages. Keep physics, renderer, scene/event model, instruments and capture code as separate modules. Reuse [common-ts](../../common/common-ts/src/context.ts) where its actual API fits, and follow existing [browser capture/export usage](../../packages/heat-equation/web/src/capture.ts). Probe helper APIs during implementation; do not copy obsolete signatures from planning documents.

The simulation remains GPU-resident. The CPU sends compact event/parameter buffers. Render directly from GPU state. Read back small diagnostic reductions asynchronously at approximately 2–4 Hz, with timestamps and stale-state handling. Full readback happens for explicit checkpoints, exports and tests.

A conceptual substep:

```text
ordered edits/sources
→ CFL and source-limit reductions
→ reconstruction and shared face fluxes
→ positivity/transport update (RK stages as required)
→ friction and conservative material exchange
→ donor-limited talus exchange
→ derived fields, clocks and diagnostics
```

This is a dependency graph, not a promise of seven dispatches. Global reductions require their own dispatch boundaries. Pre-encode a bounded number of substeps; each substep consumes current GPU timestep/status data. Shader-side guards stop unsafe advancement and record a reason.

Use distinct resources or correct ping-pong buffers for neighboring reads/writes. A workgroup barrier cannot synchronize the whole grid. Do not fuse passes across a required global dependency.

### 6.2 Optimization order

1. **Establish a dense gather baseline.** Avoid scatter-add for water/solid transport. WGSL atomic types are currently integer-only; floating-point accumulation would require another algorithm and a determinism/precision contract. [W3C WGSL, atomic types](https://www.w3.org/TR/WGSL/#atomic-types)
2. **Measure bandwidth and dispatch cost.** Compare 8×8 and 16×16 workgroups on named adapters; do not assume either wins everywhere.
3. **Pack fields by actual pass access.** Use aligned storage buffers for authoritative f32 state. Use textures for sampled/render data when useful; never quantize physical state to rgba8unorm.
4. **Reuse allocations and pipelines.** Compile known quality variants ahead of interaction and use a uniform/event ring. Avoid per-frame pipeline creation or rebuilding terrain meshes on the CPU.
5. **Keep frame scheduling bounded.** Simulation consumes a fixed frame budget; a slow device advances less hydraulic time. Do not accumulate unlimited catch-up work.
6. **Reduce render cost before physical resolution.** Lower internal pixel resolution, reflection/AO quality and decorative effects while keeping the numerical grid unchanged.
7. **Only then consider active tiles.** Dormant tiles must wake for incoming flux, sources, boundary changes and neighboring bed changes. Verify mass across tile edges and equivalence to the dense solver before promotion.
8. **Treat f16/subgroups as optional variants.** Keep conserved state f32. Optional feature availability must never change which equations the default solves without disclosure.

TerrainX provides browser precedent for caching reusable drainage work, testing workgroup size and avoiding unnecessary raymarch samples. It reports about 40 FPS with 4.5K textures on an RTX 3060 Laptop GPU, but it uses a different model; that is not a Canyon Lab benchmark. Its README’s generalization that storage textures require rgba8unorm is incorrect and must not be copied. [TerrainX performance analysis](https://github.com/GPU-Gang/WebGPU-Erosion-Simulation#performance-analysis)

### 6.3 Rendering strategy

Use a regular tiled terrain mesh displaced from the heightfield for the core. Draw skirts or matched LOD boundaries without exposing cracks. Compute updated normals/field textures on the GPU. Add terrain LOD only if measured mesh cost warrants it; geometry clipmaps are a relevant established approach, not a prerequisite for a bounded 512² scene. [NVIDIA GPU Gems 2, terrain geometry clipmaps](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-2-terrain-rendering-using-gpu-based-geometry)

Water uses the same horizontal grid or a conservative visible wet-region mesh. Separate terrain detail resolution, hydraulic resolution and output pixel resolution in UI/export metadata.

Use optional timestamp queries for GPU phase timings and CPU wall timings for responsiveness; distinguish them in reports. Timing support/precision is implementation-dependent. Shipping must not require experimental browser flags. [Chrome WebGPU timestamp-query documentation](https://developer.chrome.com/blog/new-in-webgpu-121?hl=en)

### 6.4 Proposed budgets

These are acceptance goals to test, not measured feasibility claims:

| Quality tier | Physical grid | Intended initial class | Presentation target | Application allocation target |
|---|---|---|---|---|
| Compact | 256² | Lower-power/integrated GPU | 60 FPS target at reduced internal pixels | ≤128 MiB |
| Balanced | 512² | Modern integrated or mainstream discrete GPU | 60 FPS target; responsive 30 FPS floor | ≤256 MiB |
| High | 1024² | Capable discrete GPU | 60 FPS goal, 30 FPS floor | ≤640 MiB |

Provisional allocation planning uses **256 bytes/cell** for all solver state, RK/scratch buffers, faces, geology and diagnostics: 16 MiB at 256², 64 MiB at 512² and 256 MiB at 1024². This is a conservative design allowance, not an exact layout. Render targets, staging, checkpoints and optional A/B state are additional and count against the application cap.

Query adapter limits, request only needed supported limits, and calculate allocations before creating them. Do not infer total free VRAM from WebGPU limits. The published baseline storage-buffer binding limit is 128 MiB; split large fields/bindings or negotiate supported larger limits explicitly. [WebGPU limits](https://gpuweb.github.io/gpuweb/#limits)

For a 60 FPS target, reserve a proposed 6–8 ms for simulation, 6–8 ms for rendering and the remainder for scheduling. Optimize against complete frame distributions, not isolated kernel averages. Report substeps/second and simulated seconds/wall-second alongside FPS; a fast-rendering paused solver is not a performance success.

On insufficient capability or device loss, preserve the last completed checkpoint where available and show a readable recovery/quality action. A static preview is acceptable on unsupported hardware, labelled as such. Do not claim a Canvas/WebGL fallback as a passing WebGPU run.

## 7. Verification specification

The moat requires three distinct results: correct implementation of the declared equations, bounded discretization error in applicable regimes, and experimentally supported physical prediction where claimed. Only the first two are planned release gates for the synthetic canyon model.

Follow [architecture §§2–3.5](../architecture.md): pre-implementation probe, failing acceptance evidence, independent reference anchors, applicable diagnostics, capture/replay, determinism, property tests, performance ledger and the repository’s landing gates.

### 7.1 Independent hydraulic fixtures

Use published solutions from SWASHES and analytic derivations independent of our f64 implementation. [Delestre et al., *SWASHES*, 2013](https://arxiv.org/abs/1110.0288)

| Fixture | Measurements | Failure it must catch |
|---|---|---|
| Lake at rest over variable bed and wet island | Free-surface error, spurious velocity, water residual | Mismatched pressure and bed source |
| Dry-bed dam break | Front position, depth/discharge profile, positivity, integrated mass | Wet/dry instability and wrong wave speed |
| Oscillating bowl | Shoreline, phase, depth error over repeated cycles | Cumulative wetting/drying loss |
| Smooth manufactured water + passive sediment fields | Spatial/time refinement; L1/L2/L∞ errors | Incorrect transport, boundary or source implementation |
| Steady friction flow | Discharge, equilibrium depth and friction balance | Units/sign/splitting mistakes |
| Steep thin flow | Depth/velocity at multiple resolutions and slopes | Hydrostatic-reconstruction pathology |

Do not expect second-order pointwise convergence across shocks, dry fronts or layer discontinuities. Separate smooth-order tests from nonsmooth solution-error tests.

### 7.2 Material and coupling fixtures

- Closed-cell settling: match exponential S decay and equal A gain.
- Stress threshold: no erosion below threshold or at zero erodibility.
- Empty-cover case: no entrainment from A=0.
- Cover shielding: compare local erosion-rate ratios for prescribed cover thicknesses with frozen hydraulics.
- Layer crossing: erode through a soft layer into a hard layer; verify the crossing event, bounded removal and updated rate.
- Prescribed transport: constant-concentration advection and sediment pulse through open boundaries; compare against independent analytic/finite-volume balance.
- Talus pair and mound: donor limit, solid conservation, finite state, angle relaxation and rotated-domain behavior.
- Brush/source invariance: identical physical input under different render rates and pointer sampling frequencies.
- Coupled rising-bed and falling-bed cases: preserve carrier water while changing z; account for all solid transfers.
- Restart: checkpoint → reload → replay agrees with uninterrupted evolution under the declared determinism contract.

For each golden table, include the repository-required independent anchors. A formula evaluated by the same function on CPU and GPU is not an independent anchor.

### 7.3 Tolerances and evidence

M0 produces candidate error envelopes; final thresholds are declared before acceptance tuning and bounded by the repository tolerance budget. Do not invent “measured” values in this spec or widen gates to accommodate a broken preset.

Each gate declaration records units, initial/boundary conditions, grid, timestep policy, duration, error norm, denominator/floor, precision, hardware/backend and expected order or tolerance. Near-zero fields need absolute tolerances; relative error alone is invalid.

Determinism aims: reproducible fixed-seed/event-log canonical runs on the same adapter/configuration; epsilon-bounded cross-adapter/reference comparisons. Use fixed reduction order where possible. Actual repeatability is measured. Long chaotic terrain trajectories use conserved budgets and meaningful observables rather than universal byte identity.

Browser proof fixtures call the **same shader implementations** as the sandbox, with controlled parameters and smaller grids. Separate simple proof shaders cannot certify the production solver.

### 7.4 Negative controls

A test-only flag breaks one mechanism at a time:

- Remove the matching bed-source correction: the still-water gate must fail.
- Remove the S credit from an erosion transfer: the solid budget must fail.
- Add a duplicated boundary sediment flux: the export ledger must fail.
- Use the wrong rock layer after crossing: the layer-response gate must fail.
- Use an oversized unsafe timestep: the stability guard must refuse advancement.

Keep adversarial modes isolated from saved user projects. These establish that the instruments detect relevant defects, rather than always showing green.

### 7.5 Experimental validation boundary

The default is a verified illustrative model with empirical material parameters. Hydrodynamic benchmarks do not validate canyon morphology. Matching another graphics implementation does not validate physical erosion.

A future physical-validation claim requires an identified laboratory dataset, units/material properties, a preregistered comparison, calibration separated from holdout evaluation and reported uncertainty. Potentially relevant breach literature supplies starting points, but its cohesive/bedload mechanisms may differ from our one-class model. No current release depends on claiming an unperformed experiment.

## 8. Behavioral and UI acceptance

Numerical success is necessary but insufficient. All values below are **proposed product gates**, to be finalized after M0 on named devices.

### 8.1 Default-scene gates

- First usable scene within 5 seconds after assets arrive on the target test system; controls and progress appear during compilation.
- A source/brush receives visible feedback within 100 ms at the 95th percentile under the target workload.
- Water responds visibly within 1 wall-second of opening the default source.
- A locked before/after section shows actual bed/cover change within 15 wall-seconds at the achieved default simulation rate.
- Within 60 wall-seconds, the main scenario shows both excavation and a downstream consequence: suspended material, deposition or measured export.
- A 10-minute uninterrupted run remains finite, within its budget/error envelope, and responsive; a 30-minute soak checks memory growth and checkpoint lifecycle.
- Changing discharge or cutting a diversion from an identical checkpoint creates a measurable, visually distinguishable response. Demonstrate it with paired captures rather than a narrative claim.
- Each scenario has at least one useful intervention after five minutes; the visitor must not be left with an inert drained bowl or completely flattened terrain.

Scene-specific ROI volumes, channel-profile changes, flow split and outlet sediment flux thresholds are locked from the prototype into an explicit acceptance artifact. They are not allowed to remain “looks interesting” checks.

If these fail, adjust the physical scene scale, initial cover, inlet/outlet setup or declared artistic material rates. Do not hide the failure with animated texture detail, exaggerated automatic color scaling or undocumented mass removal.

### 8.2 Visual and interaction review

Review at 1440×900, 1920×1080, a narrow mobile layout and 200% browser zoom:

- No clipped inspector, hidden transport control or unreadable plot legend.
- No camera/brush conflicts or accidental painting while scrolling controls.
- Stable terrain/water intersection, shadows and normals while editing.
- No procedural texture swimming or shimmering layer boundaries.
- Undo, replay and resolution changes preserve the documented state.
- Reduced-motion mode avoids automatic camera movement and unnecessary ambient animation.
- Field overlays use labeled scales and do not rely on red/green alone.
- A user can discover the main action, explain the visible change and locate the evidence without reading the spec.

Browser/device matrix must include at least one integrated GPU, one discrete GPU and two independent graphics backends where available. Record actual browser versions and device identifiers. A software/headless backend can establish correctness coverage, not interactive hardware performance.

## 9. Capture, events and reproducibility

The canonical scientific capture follows the existing manifest + payload conventions. Proposed new package fields must be registered through existing schema mechanisms rather than creating an unrelated format.

A restart contains h, qx, qy, R, A, S; interfaces/material masks; all source/boundary state; solver clock and substep counter; parameters including wet/dry limits and response factor; event cursor; cumulative water/solid ledger terms; seed and generator version. Store any required numerical residual/carry state. Visual foam/camera state may be separately optional.

Record grid dimensions, world extents, unit system, shader/model version, selected quality variant, adapter/backend and hashes of initial conditions/references.

Events use monotonically ordered IDs and simulation-substep application points. A source stroke includes world geometry, integrated strength, falloff and duration. Checkpoint restoration restores the accounting baseline and cumulative ledgers as well as visible fields.

Resolution changes are explicit project operations, not automatic quality reactions. Restrict/regrid conserved volumes and momentum with area-aware integration; sample geological interfaces consistently; record any representational change and re-run budgets. A smaller grid may not resolve the same canyon. Offer restart-at-resolution as the simple alternative.

## 10. Repository implementation map

All new paths below are **proposed**, not claims that files already exist.

| Area | Proposed integration |
|---|---|
| Candidate spec | This file, `docs/planning/terrain-erosion-canyon-lab-spec.md` |
| Adopted reference spec | `docs/sim-specs/geomorphology/terrain-erosion/spec-ref.md`; register the new category through the normal repo process |
| f64 reference | `packages/terrain-erosion/terrain_erosion/`: state, fluxes, sources, sediment, geology, talus, diagnostics, capture |
| Browser | `packages/terrain-erosion/web/src/`: WGSL kernels, solver, renderer, scenes/events, interaction, instruments, capture |
| Tests | `packages/terrain-erosion/tests/` plus browser acceptance fixtures |
| Goldens | `tools/testkit/golden/`: derivations, generators and tables with independent anchors |
| Browser gate | Register package in `tools/productization/web-deploy/pipeline.py` and add its established gate in `verify.py` |
| Presentation | Catalog card/poster/loop, scene metadata and relative Vite base for the existing Pages deployment |
| Release evidence | Existing audits, tolerance declarations, performance ledger and capture schema conventions |

Reuse the capture/determinism/productization infrastructure. Do not make a generic multiphysics framework, add another global UI framework or modify existing MPM/fluid packages merely to support this first coupled solver.

At implementation probe, pin exact upstream code revisions and verify licenses for any copied/vendor code. Research citation is not permission to copy arbitrary code/assets. TerrainX is BSD-3-Clause; LanLou and Clocktown advertise MIT. Metarapi’s inspected README has an empty license section, so it is a design reference only unless licensing is resolved. [TerrainX](https://github.com/GPU-Gang/WebGPU-Erosion-Simulation), [Clocktown](https://github.com/Clocktown/CUDA-3D-Hydraulic-Erosion-Simulation-with-Layered-Stacks)

Follow the actual [web-deploy workflow](../../.github/workflows/web-deploy.yml): browser validation precedes the operator-dispatched Pages release. The pipeline’s historical “NO publish” docstring is not the current workflow’s complete behavior.

## 11. Build sequence and stop conditions

| Milestone | Deliverable | Exit evidence |
|---|---|---|
| **M0 — resolve the hard parts** | Small f64/FV probe, minimum WGSL water/flux path, rough displaced terrain, one incision scenario | Wet/dry and steep-bed viability; independent budget derivation; device timing/allocation sample; visible sustained incision; locked numerical/product targets |
| **M1 — trustworthy water** | Production hydraulic kernel and source/boundary tools | Analytic/MMS gates, conservation, fixed-bed order, browser/reference agreement and same-device replay |
| **M2 — coupled material** | R/A/S model, ordered strata, cover response, deposition and talus | Material/source tests, coupled budgets, layer crossing, concentration envelope and replay |
| **M3 — compelling canyon slice** | Cut the Plateau with finished terrain/water presentation, source/dig/build/resistance tools | First-minute behavioral gates and interactive frame budget on integrated + discrete targets |
| **M4 — complete laboratory** | River Heist, Break the Dam, Sediment Shield, section view, history/A-B, proof instruments and export | Paired intervention captures, negative controls, restart/undo tests, full visual interaction review |
| **M5 — deployable release** | Optimized quality tiers, catalog assets and browser gate integration | Full repo requirements, headless WebGPU evidence, hardware performance matrix, long-run stability and release bundle |
| **M6 — layered frontier prototype** | Independent undercut/arch mode and modern renderer | §12 admission gates; no automatic promotion into core |
| **M7 — geological transport study** | Bounded research comparison of the 2026 transport method | Verified transport reference, measured WGSL feasibility and a justified product role |

M0 is a technical/product feasibility gate, not months of infrastructure. It must produce a rough scene that visibly cuts a channel while its budgets close. If no acceptable timestep/quality combination gives responsive water and meaningful incision, revise domain scale or model before building the polished interface.

M3 is a quality gate: do not multiply scenario count until the default scene is smooth, legible and satisfying. M5 is the complete first deployment; M6/M7 are specified expansion tracks, not hidden prerequisites.

No calendar estimate is asserted without the M0 measurements.

## 12. Ambitious expansions with concrete boundaries

### 12.1 Undercuts, arches and collapse

Use the Nilles et al. multilayer-column approach as the primary starting point. Their 2024 method adds horizontal erosion and support propagation, enabling overhangs, arches and some caves. It is a virtual-pipe-based CUDA implementation, not a drop-in replacement for the selected SWE solver. [Nilles et al., VMV 2024](https://diglib.eg.org/items/deefa865-6a25-4463-adcd-d8de2b37507e)

The 2025 follow-up substantially improves rendering through hierarchical traversal and smooth implicit visualization. Native RTX 4080 results include interactive dynamic large scenes, but quality, resolution and scene dependence matter. Consult that newer renderer rather than judging feasibility from the older visualization. [Nilles and Müller, VMV 2025](https://diglib.eg.org/bitstreams/37905fb9-2e91-45a2-9238-152be9d9fecc/download)

M6 requirements:

- Begin with a small isolated terrain tile and a fixed column-interval capacity.
- Overflow is detected and recoverable; never silently delete geological intervals.
- Track eroded/collapsed grain volume through all reservoirs.
- Verify support loss, collapse transfer and water connectivity independently.
- Demonstrate an actual eroded undercut and an arch, with matching raw occupancy and rendered views.
- Meet a measured interactive target with room for UI and diagnostics.
- Surface a distinct model/verification label. Do not extend the core SWE badge to the new water model.
- Preserve smooth rendering without geometry smoothing concealing an incorrect support/topology state.

This is the highest-value visual frontier once the core works. Integration with existing MPM for local rubble is a later experiment; it requires conservative handoff and return, not merely spawning decorative particles.

### 12.2 Long-term meanders, deltas and drainage evolution

McDonald and Cordonnier’s 2026 method models stochastic geomorphological transport with momentum-aware behavior over long timescales; authors demonstrate meanders, braided rivers and deltas. This directly addresses a different ambition: evolving a landscape over geological time rather than following a flood. [McDonald and Cordonnier, SIGGRAPH/TOG 2026](https://erosiv.studio/publications/stochastic-geomorphological-transport)

The official geotransport repository contains a minimal transport reference and points to soillib for a fuller erosion implementation. It is CUDA, not an established WebGPU deployment. [Official geotransport code](https://github.com/erosiv/geotransport)

M7 starts with reproducing its transport/convergence experiment, then investigates random sampling, gather/scatter, GPU memory and repeatability in WGSL. Evaluate whether it earns a separate **Landscape Time** workspace. Do not mix its clock or transported state with the event solver without a documented conservative handoff.

### 12.3 Ranked additions after the core

1. Multilayer undercuts/arches with the newer renderer.
2. A second sediment class and explicit bedload/active-layer model, if sediment sorting is a demonstrated user need.
3. Long-term transport workspace.
4. A locally coupled rubble/MPM experiment.
5. Weathering, infiltration or vegetation only when a specific interaction benefits.

A recent GPU SWE–Exner DOT paper is relevant to the bedload extension, but its published scope does not remove all wet/dry and higher-order work. It remains a comparison candidate, not a reason to replace a functioning core without evidence. [Dazzi and Ferrari, 2026, DOI record](https://doi.org/10.1016/j.compfluid.2026.107050)

## 13. Risks and decisions that remain measurement-dependent

| Risk | Consequence | Required response |
|---|---|---|
| Thin water crossing steep grid topography | False ponding or suppressed velocity/incision | Refine/test; constrain the advertised regime; revisit flux/source treatment |
| Canyon takes too long to change | Beautiful but uninteresting demo | Tune scene scale/supply/cover and declared material response; prove timed outcomes |
| Accelerated erosion overfills sediment capacity | Caps dominate; landscape response stalls | Display limiter activity; tune flow/material scale; keep paired accounting |
| Loose-cover relaxation rounds everything | Canyon loses geological character | Relax alluvium only; preserve resistant bedrock layers |
| Renderer dominates frame time | Interaction feels laggy | Lower secondary effects/pixel resolution before physical grid |
| f32 loses small bed increments | Erosion stalls or budget drifts | Local datum, delta-based accounting, compensated/carry representation if required and tested |
| “Verified” overstates the closure | Moat loses credibility | Separate implementation/solution checks from physical validation |
| Scope expands to geology + 3D fluid + fracture at once | No polished deployment | Complete M5 before promoting frontier tracks |

The concentration ceiling, erodibility ranges, layer-change bounds, wet/dry thresholds, final canonical sizes, per-gate tolerances and device-tier defaults remain **probe decisions**, with explicit owners in M0’s implementation report. They must be resolved before their dependent acceptance gates; they are not permission to fill in numbers after a failing release test.

## 14. Research coverage and evidence limits

Research was completed on 2026-09-06 using original papers/author repositories, official industry/platform documentation and the current local repo. The highest-impact choices were checked against primary sources, including the steep-bed limitation, bedrock/alluvium distinction, existing browser prior art, current layered renderer and stochastic transport source scope.

Full implementation details/performance from inaccessible papers were not inferred. The Mei 2007 primary publication record was available but direct PDF access was unreliable. The 2026 DOT extension was reviewed through author-lane evidence and its publication record; it is not required by the selected core. Commercial tools and external repositories were not built or benchmarked during this research. No erosion solver or performance measurement was produced in this task.

The decisive remaining uncertainties require a prototype: whether the chosen coupled model produces satisfying incision at browser budgets, and whether it remains within the declared numerical/model envelope. More broad web searching would not settle those questions.

**Definition of done:** the first deployment lets a visitor make a consequential change to a river, watch the canyon and sediment respond, rewind and compare, and inspect trustworthy evidence—all while the interface remains smooth.
