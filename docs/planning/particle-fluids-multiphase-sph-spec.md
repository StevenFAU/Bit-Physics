# Research and implementation spec — Multiphase / surface-tension SPH

> **Proposed sim:** sph-multiphase
>
> **Category:** particle-fluids
>
> **Working product title:** Interfacial Fluid Lab
>
> **Primary surface:** WebGPU browser instrument, with a small deterministic
> Python reference and committed validation captures.
>
> **Status:** v1 implemented and browser-gated, 2026-07-10. The executable
> contract is in `docs/sim-specs/particle-fluids/sph-multiphase/`; the f64
> oracle and WebGPU product are in `packages/sph-multiphase/`. Verified claims
> are limited to the gates named there. Research-upgrade lanes remain
> experiments until their own before/after evidence lands.
>
> **Research posture:** FACT, DECISION, TARGET, and EXPERIMENT are used
> deliberately. A TARGET is not a measured result. An EXPERIMENT must not be
> presented as verified until its own reference and gates land.

---

## 1. Ship outcome

Build a 3-D, two-fluid SPH instrument where the main subject is the interface:
droplets round up, flatten, oscillate, merge, split, wet solids, rise or sink
under density contrast, stretch in shear, and move under a painted
surface-tension gradient. It should be immediately beautiful, but its strongest
claim should be that the image is downstream of quantitative interfacial-flow
tests rather than a collection of visually tuned attraction forces.

The release experience should support:

1. Two explicitly simulated, immiscible, incompressible Newtonian liquids.
2. Different phase densities, viscosities, optical properties, and equal rest
   particle volumes.
3. A controllable physical interfacial-tension coefficient, with the distinction
   between a requested coefficient and its resolution-calibrated effective
   value visible in the UI.
4. Fluid-fluid surface tension, fluid-solid adhesion/wetting, buoyancy, gravity
   tilt, moving SDF obstacles, emitters, suction, stirring, and phase painting.
5. A phase-aware screen-space renderer that exposes both the outer free surface
   and internal liquid-liquid interfaces.
6. Live dimensionless numbers, conservation metrics, interface diagnostics,
   solver convergence, GPU timing, and benchmark comparisons.
7. Adaptive quality that preserves the equations. It may reduce resolution or
   rendering quality, but must not silently weaken surface tension, viscosity,
   or the pressure solve to maintain frame rate.

The signature interaction is an **interfacial conductor**:

- inject either phase;
- drag a stirrer or obstacle through the tank;
- paint wetting properties onto a wall;
- paint a temperature/surfactant proxy along an interface in the experimental
  Marangoni mode;
- tilt gravity;
- pause, step, scrub, and inspect the interface normal, curvature, pressure
  jump, and local regime numbers.

The signature shot is a dense colored droplet field in a transparent bath:
several droplets collide, one coats a moving solid, a surface-tension gradient
pulls another sideways, and a cutaway reveals the pressure jump and interface
normal field.

---

## 2. Repository and deployed-product audit

### 2.1 Reusable assets already present

The repo is unusually well prepared for this sim.

| Existing surface | What to reuse | What must change |
|---|---|---|
| packages/sph-water/web | WebGPU uniform-grid neighbor search, particle reorder, DFSPH-style iteration, SDF walls, emitters, orbit camera, adaptive particle count, raw-particle debug rendering, half-resolution screen-space fluid rendering, narrow-range filtering, Beer-Lambert absorption, Fresnel, foam channel, PROVE/EXPLAIN/INTERACT/RENDER structure | Standard density summation and the single-phase live pressure path are not correct at a discontinuous rest-density interface. Rendering assumes one optical medium and one front surface. |
| packages/sph-water reference and goldens | Monaghan support-2h cubic-spline kernel, density/continuity fixtures, spatial-hash equivalence pattern, deterministic sorted-neighbor discipline | Add number-density, phase-aware pressure, cohesion/curvature, interface, wetting, and two-phase benchmark anchors. |
| packages/pic-flip/web | Pressure-residual visualization, mode comparison, conservation instruments, screen-space renderer reuse discipline | The numerical method remains SPH; do not import grid-transfer semantics. |
| packages/mpm-multimaterial/web | Material registry, per-material rendering, fixed-point/overflow discipline, adaptive hardware tiers, timing HUD, material brush interaction | A shared MPM grid is not a model for a sharp SPH liquid-liquid interface. |
| packages/boids-3d/web | Cinematic camera modes, disturbances with a visual story, adaptive LOD, strong flagship-shot thinking | Fluid controls and validation remain method-specific. |
| common/common-web | Panel shell, house style, colormaps, capture/export conventions, device loss and quality patterns | Add only genuinely reusable controls after the sim proves their value. |
| tools/productization/web-deploy | Headless browser-WebGPU validation, new-canonical gates, posters and loops, deployed-card conventions | Add a new gate only after thresholds are measured from the implemented browser path. |

### 2.2 Lessons from the live site

The deployed site is built around three identities that this sim should retain:

- **artwork:** a strong hero image and motion loop;
- **instrument:** direct manipulation plus readable observables;
- **proof:** a visitor can run the same primitives used by the live scene
  against committed artifacts.

The strongest existing sims avoid a generic slider wall. They offer named,
seeded scenes with a scientific or visual purpose. This sim should therefore
ship a curated scene gallery and a small number of derived, unit-aware controls.

The existing SPH demo also exposes a gap that this project should not repeat:
its gated reference primitives and its visually rich live DFSPH solver are
separate evidence tiers. For sph-multiphase, the number-density pressure path
and the surface-tension path used in the hero scenes must be present in the
reference and validation suite before the demo calls them verified.

### 2.3 Proposed repo layout

The planning document does not create these files. The implementation should
eventually use:

    docs/sim-specs/particle-fluids/sph-multiphase/
      README.md
      spec-ref.md
      algebraic.md
      determinism.md
      equivalence.md

    packages/sph-multiphase/
      pyproject.toml
      sph_multiphase/
        reference/
        invariants.py
        sim.py
      tests/
      web/
        verification-demo-spec.md
        gen-verification.mjs
        src/
        public/

Reuse source by extracting narrowly shared SPH/WebGPU modules only after the
new solver works. Do not begin with a broad sph-water refactor.

---

## 3. Physical scope and honesty boundary

### 3.1 v1 physical system

**DECISION:** v1 models two immiscible, incompressible Newtonian liquids plus an
unsampled exterior. It is primarily a liquid-liquid simulator, not a resolved
water-air compressible solver.

For phase \(k\in\{A,B\}\):

\[
\frac{D\rho_k}{Dt}=-\rho_k\nabla\cdot\mathbf{u}_k,
\]

\[
\rho_k\frac{D\mathbf{u}_k}{Dt}
=-\nabla p_k+\nabla\cdot
\left[\mu_k(\nabla\mathbf{u}_k+\nabla\mathbf{u}_k^T)\right]
+\rho_k\mathbf{g}+\mathbf{f}_{\sigma,k}.
\]

For incompressible phases, \(\rho_k=\rho_{0,k}\) and
\(\nabla\cdot\mathbf{u}_k=0\). At the moving liquid-liquid interface:

- normal velocity is continuous;
- normal stress jumps by the Young-Laplace term;
- tangential stress is continuous for constant surface tension;
- a nonuniform \(\sigma\) adds the Marangoni shear
  \(\nabla_s\sigma\).

In continuum-surface-force notation:

\[
\mathbf{f}_{\sigma}
=\left(\sigma\kappa\mathbf{n}+\nabla_s\sigma\right)\delta_s.
\]

For a sphere of radius \(R\), the static pressure jump is
\(\Delta p=2\sigma/R\); in a 2-D circular benchmark it is
\(\Delta p=\sigma/R\).

### 3.2 Property envelope

The implementation must distinguish defaults, targets, and claims.

| Quantity | v1 default gallery | v1 test target | Explicit non-goal |
|---|---:|---:|---|
| Density ratio | 0.5–2 | 0.1–10, both orderings | Resolved water-air at about 1000:1 |
| Dynamic-viscosity ratio | 0.25–4 | 0.1–10 | Arbitrary non-Newtonian rheology |
| Interfacial tension | dimensionless gallery range calibrated to Weber/Bond number | stable from weak to capillary-dominated test cases | Claiming SI fidelity without a unit map and convergence study |
| Particle count | adaptive | measured hardware tiers | A fixed one-million live badge |
| Phases | exactly two | exactly two | Ternary contact and Neumann-triangle laws |

Wang et al.'s 2023 INDSPH paper reports density-ratio experiments up to 1:75
for its wider fluid/elastic coupling system, but also states that it does not
resolve liquid-air ratios beyond two orders of magnitude. This spec adopts a
more conservative 0.1–10 v1 acceptance envelope until this independent
implementation measures otherwise.

### 3.3 Non-goals for v1

- phase change, boiling, dissolution, chemical reaction, or miscible diffusion;
- compressible gas acoustics;
- surfactant transport as a physically calibrated advection-diffusion PDE;
- contact-angle hysteresis or a microscopic moving-contact-line model;
- more than two fluids;
- adaptive particle sizes or multi-resolution coupling;
- two-way dynamic rigid-body coupling;
- engineering certification.

Marangoni interaction is allowed as an **experimental field-driven extension**
after the constant-\(\sigma\) core is green. Its UI and captures must say
experimental until a thermocapillary benchmark lands.

---

## 4. Why ordinary SPH fails at a two-fluid interface

### 4.1 The discontinuity problem

Standard SPH estimates mass density with

\[
\rho_i=\sum_j m_j W_{ij}.
\]

Equal-volume particles in two liquids have different masses
\(m_i=\rho^0_{k(i)}V_0\). Near the interface, the kernel combines both masses.
The dense side is underestimated and the light side overestimated. An equation
of state or density constraint then converts that interpolation error into a
pressure error, producing a gap, a false repulsive interface tension, and
eventually instability.

Solenthaler and Pajarola demonstrated this failure directly and replaced mass
density near the interface by particle number density. Their formulation
handled sharp density changes without adding asymptotic computational cost.

### 4.2 Number density and particle volume

Define

\[
\delta_i=\sum_j W_{ij},\qquad
\tilde{\rho}_i=m_i\delta_i,\qquad
V_i=\frac{m_i}{\tilde{\rho}_i}=\frac{1}{\delta_i}.
\]

Every neighbor contributes one sample to \(\delta_i\), independent of its
phase mass. The sharp material density is carried by \(m_i/V_i\); the local
compression state is carried by \(\delta_i/\delta_i^0\). This separates
material identity from sampling compression.

The particle approximation becomes

\[
A_i\approx\sum_j\frac{A_j}{\delta_j}W_{ij},\qquad
\nabla A_i\approx\sum_j\frac{A_j}{\delta_j}\nabla W_{ij}.
\]

This is the central first-principles reason the new sim cannot be a phase-color
field added to the current sph-water solver.

### 4.3 Chosen incompressibility formulation

**DECISION:** use the number-density incompressible SPH formulation, INDSPH,
published by Wang et al. in 2023, as the v1 reference algorithm. It is a direct
implicit extension of the number-density idea to DFSPH-like pressure
iterations and was demonstrated on silicone-oil/water coupling.

The paper relates pressure and number density through a stiffness
\(\kappa_i\):

\[
\nabla p_i=\kappa_i\nabla\delta_i
=\kappa_i\sum_j\nabla W_{ij}.
\]

It predicts an advection velocity from non-pressure forces, predicts the
intermediate number density through

\[
\frac{D\delta_i}{Dt}
=\sum_j(\mathbf{v}_i-\mathbf{v}_j)\cdot\nabla W_{ij},
\]

and iteratively applies pairwise pressure forces until the global
number-density compression error is below tolerance. With equal rest volume,
\(\delta_i^0=1/V_0\) for both phases; different material density enters through
particle mass and therefore through acceleration.

The implementation must port the paper's equations and iteration order
line-by-line into the Python reference before WGSL is written. It must not
invent a phase-weighted variant inside the shader.

### 4.4 Divergence-free extension

The 2023 INDSPH method supplies the density/number-density projection. The
existing repo DFSPH live path also includes a divergence solve.

**EXPERIMENT:** after the density solve is correct, derive the analogous
number-density rate constraint for a divergence-free warm solve. It may reduce
iterations and improve stability, as DFSPH does for single-phase fluids, but it
is not part of the v1 correctness claim until:

1. its algebraic derivation is written;
2. a small-N finite-difference or matrix solve cross-check exists;
3. it improves measured work per simulated second;
4. it does not introduce cyclic warm-start compression.

The v1 gate may ship with density-only INDSPH if this extension does not clear
those tests.

---

## 5. Surface-tension model decision

### 5.1 Model families reviewed

| Family | Strengths | Failure/cost modes | Disposition |
|---|---|---|---|
| Color-field CSF, Morris / Solenthaler-Pajarola | Direct continuum interpretation; easy Laplace and curvature instrumentation | Noisy normals/curvature; multiple neighbor passes; naive discretization is not pairwise momentum conserving | Reference comparison and possible v2 |
| Density-weighted CSF, Adami-Hu-Adams 2010 | Designed for multiphase interfaces; reproducing divergence; reported density ratio 1000 and viscosity ratio 100 with convergence tests | More involved curvature path; still vulnerable to interface disorder and explicit capillary time step | Strong v2 candidate |
| Hu-Adams surface stress | Avoids explicit curvature; can be discretized in momentum-conserving form | Interface gradient and stress-divergence implementation is less familiar; requires its own verification | Frontier lane |
| Akinci-Akinci-Teschner 2013 pairwise cohesion + curvature | Efficient, robust visual behavior; published adhesion; already represented by vendored kernel code; supported by SPlisHSPlasH; used with INDSPH in the chosen 2023 paper | Effective \(\sigma\) must be measured; free-surface-oriented lineage; explicit force; particle-distribution sensitivity | **v1 default** |
| Jeske et al. 2023 implicit cohesion | Removes the explicit surface-tension stability weakness; strongly couples implicit viscosity; code exists | Linearized implicit solve and added memory/iterations; not established here for two unequal-density phases | v2 performance experiment |
| Probst-Teschner 2024 unified pressure/tension/friction | Pressure, surface tension, and wall friction are solved consistently; excellent droplet/wetting behavior | Large implementation jump; paper targets free-surface droplets; adaptation to liquid-liquid INDSPH is research | v2/v3 research branch |
| Zhang-Lourenço-Hu 2025 surface stress + zero-energy penalty | Momentum conserving; targets the interface-disorder root cause; reported ratios 1000/100 and high Re/We; open SPHinXsys implementation | Very recent; Riemann-WCSPH lineage differs from the selected incompressible solver | Reproduce in CPU lab, then decide |
| Pure artificial repulsion | Cheap and prevents crossing | Does not reproduce surface energy or Laplace law by itself | Stabilization only, never labeled surface tension |

### 5.2 v1 default

**DECISION:** implement the Akinci 2013 cohesion and curvature terms exactly as
used by the chosen INDSPH source, then calibrate the effective interfacial
tension with static and dynamic tests.

Reasons:

- it is the published combination closest to the desired solver;
- it needs a normal pass and a force pass, not a noisy third curvature-
  divergence pass over all bulk particles;
- the repo already vendors the cohesion and adhesion kernel definitions;
- SPlisHSPlasH exposes a current implementation for code-level cross-checking;
- it supports the visually important wetting/adhesion path;
- it is compatible with interface-only work compaction.

The coefficient exposed to users is \( \sigma_{\mathrm{target}} \). Internally,
a resolution-specific mapping produces \(k_{\mathrm{cohesion}}\). The mapping
is generated by the static-droplet pressure jump and oscillating-drop tests,
not hand-tuned by eye.

### 5.3 Surface-model upgrade contract

Every alternate model must implement a common interface:

    prepare_interface(neighbors, phase, delta) -> normal, interface_weight
    apply_surface_force(neighbors, normal, material_pair, dt) -> acceleration
    report_surface_energy_or_proxy() -> diagnostic

Only one surface model is canonical. An alternate mode must show its evidence
tier:

- verified;
- benchmarked experimental;
- visual experiment.

The first upgrade comparison should be Adami 2010 or Hu-Adams surface stress,
not a second arbitrary attraction kernel.

### 5.4 Explicit capillary time-step limit

Surface tension creates fast short-wavelength capillary waves. An explicit
method must obey a constraint of the form

\[
\Delta t_{\sigma}\le C_{\sigma}
\sqrt{\frac{(\rho_A+\rho_B)\ell^3}{\sigma}},
\]

where \(\ell\) is the resolved interface length scale. The classical Brackbill
form uses

\[
\Delta t_{\sigma}=
\sqrt{\frac{(\rho_A+\rho_B)\Delta x^3}{4\pi\sigma}}.
\]

This \(\Delta x^{3/2}\) scaling means resolution and strong surface tension can
make substeps, not particle count, the main performance cost.

The live timestep is:

\[
\Delta t=\min(
\Delta t_{\mathrm{CFL}},
\Delta t_{\mathrm{acc}},
\Delta t_{\nu},
\Delta t_{\sigma},
\Delta t_{\max}).
\]

The HUD must name the active limiter. If capillarity forces the app below real
time, it should enter visible slow-motion or lower the spatial tier; it must not
reduce \(\sigma\) silently.

---

## 6. Viscosity and interfacial stress

The current sph-water demo uses XSPH as a cheap visual stabilizer and states
that it is not a physical viscosity model. That is inadequate for a sim whose
controls claim phase viscosity and viscosity ratio.

### 6.1 v1 viscosity

Use a pairwise, momentum-symmetric physical viscosity discretization with the
harmonic mean at a discontinuous interface:

\[
\mu_{ij}=\frac{2\mu_i\mu_j}{\mu_i+\mu_j}.
\]

The Hu-Adams and INDSPH literature should determine the final volume-weighted
operator. The reference must verify:

- two-layer Poiseuille flow with discontinuous viscosity;
- continuity of tangential velocity;
- continuity of shear stress;
- non-increase of kinetic energy in an isolated viscous decay test.

XSPH may remain as a separate, default-off numerical regularizer with its own
label. It must not be the meaning of the viscosity slider.

### 6.2 Implicit viscosity decision point

Explicit viscosity has a diffusive timestep restriction approximately
\(\Delta t_\nu\propto h^2/\nu_{\max}\). If the high-viscosity gallery scenes
become substep-bound, evaluate the existing implicit-SPH literature and the
Jeske coupled viscosity/tension path. Do not pre-commit before profiling.

---

## 7. Boundaries, adhesion, and wetting

### 7.1 v1 boundary representation

Reuse analytic SDF primitives for interaction and rendering:

- plane;
- sphere;
- capsule;
- rounded box;
- cylinder;
- torus;
- moving piston;
- optional imported low-resolution SDF after the primitive path is correct.

For fluid pressure, pure post-integration collision is not enough near a
contact line. The reference path should use either:

1. sampled boundary particles with calibrated rest volume, following the
   Akinci boundary lineage; or
2. a verified ghost/density-map equivalent.

**DECISION:** begin with sampled boundary particles for the reference because
the surface-tension and adhesion source already defines their interaction.
Keep the analytic SDF as the collision safety net and render representation.

### 7.2 Adhesion

Implement the Akinci adhesion kernel exactly, with a material-pair coefficient
for phase A/solid and phase B/solid. This provides intuitive wetting contrast
and connects to the existing vendored kernel.

### 7.3 Contact angle

Adhesion strength is not itself a contact angle. The product should expose
either:

- a raw adhesion coefficient in an explicitly artistic mode; or
- a requested equilibrium contact angle \(\theta_e\) backed by a calibration
  table for the current resolution and material pair.

The verified mode uses the second. A sessile-drop test measures the final
angle, base radius, and height. Calibration covers at least
\(30^\circ,60^\circ,90^\circ,120^\circ,150^\circ\).

Young's law provides the continuum relation

\[
\gamma_{SV}-\gamma_{SL}=\gamma_{LV}\cos\theta_e.
\]

The solver does not need to expose inaccessible solid surface energies, but the
calibration and UI must preserve this interpretation.

Dynamic contact-angle hysteresis, pinning on roughness, and microscopic slip
are deferred. Painted wall wetting in v1 is a spatially varying equilibrium
target, not a claim to model chemical hysteresis.

---

## 8. Proposed GPU simulation pipeline

### 8.1 Data representation

Use structure-of-arrays or tightly packed vec4 arrays. A target layout is:

| Buffer | Suggested fields | Notes |
|---|---|---|
| position | xyz, radius/active | f32 simulation state |
| velocity | xyz, phase-packed or flags | keep phase in u32 if packing harms clarity |
| predicted velocity | xyz | ping-pong pressure solve |
| phase/material | phase id, active, persistent id | u32 |
| scalar state | number density, error, alpha/denominator, kappa | vec4 f32 |
| interface state | normal.xyz, interface weight | vec4 f32 |
| acceleration | xyz | optional if pass fusion is insufficient |
| grid | cell counts, offsets, cursors, sorted ids | u32/i32 |
| phase draw lists | compacted A ids, B ids, interface ids | indirect rendering |
| diagnostics | reductions and flags | GPU-resident |

Do not use f16 for positions, velocity, pressure, number density, normals, or
solver reductions. f16 is acceptable for render-only optical attributes after
an image comparison.

### 8.2 Uniform-grid neighbor search

Use cell size equal to the compact-support radius. In the repo's current
support-2h convention that is \(2h\), giving a 27-cell scan in 3-D.

Pipeline:

1. clear cell counts;
2. histogram particles into cells;
3. exclusive prefix sum;
4. seed cursors;
5. scatter particle ids;
6. deterministically sort ids inside each cell for the gated path;
7. reorder all per-particle state into cell-major arrays;
8. build phase/interface compact lists.

The current sph-water local cell sort is the first implementation reference.
Measure its occupancy saturation with the larger interface clustering created
by surface tension. A stable radix sort is a fallback, not the default.

### 8.3 Per-substep passes

The intended pass graph is:

    adaptive dt reduction
      -> grid build and state reorder
      -> fused number-density + pressure denominator + interface detection
      -> interface compaction
      -> interface normal / curvature preparation
      -> physical viscosity + gravity + user/SDF forces
      -> cohesion/curvature and adhesion
      -> predict velocity
      -> INDSPH pressure iterations
      -> integrate
      -> boundary safety projection
      -> diagnostic reductions

The fused first neighbor pass should compute:

- \(\delta_i\);
- rest-number-density error;
- pressure denominator terms independent of iteration;
- same-phase and cross-phase neighbor counts;
- raw phase-gradient/normal contribution;
- surface/interface flag;
- neighbor count and grid-overflow diagnostics.

The second surface pass runs only over the compact interface list where
possible. Pressure still runs over all active particles.

### 8.4 Pressure iteration without CPU stalls

Do not map a reduction buffer every iteration. Use:

- GPU reductions for maximum and mean compression;
- a GPU convergence flag;
- fixed maximum dispatches whose shaders early-out after convergence; or
- indirect dispatch arguments written on GPU if that is measurably better and
  portable across the deployed browser set.

Expose actual iterations, residual history, and early-exit state. Fixed
iteration presets can exist for performance comparisons, but the verified mode
must meet an error tolerance.

### 8.5 Warm start

Warm starting can reduce pressure iterations, but the current repo research
already documents a cyclic compression-decompression instability at real-time
iteration counts.

Default v1:

- warm start off;
- optional damped warm start as an experiment;
- a hydrostatic scene that plots compression error over time;
- automatic disable when a periodic residual oscillation is detected.

### 8.6 Determinism

Gather-style neighbor loops avoid float atomics, but cell scatter changes
neighbor order. The gated path therefore sorts ids within every cell and
accumulates in ascending persistent-id order.

Claims:

- same-device, same-build, same-seed run-twice byte identity for short canonical
  browser captures;
- cross-device numerical tolerance for f32;
- no cross-device bit-exact claim.

Fixed-point atomics are useful for counters and deterministic histograms, not
for the floating pressure solve. Any integer encoding must publish its
per-cell overflow and quantization bounds.

### 8.7 Workgroup and feature posture

Baseline workgroup size: 64 unless measurement favors 128 on all target
classes.

Core WebGPU only for the verified path. The current platform exposes optional
subgroups and shader-f16, but:

- subgroup size varies by device;
- subgroup reduction order complicates determinism;
- optional feature coverage is not universal.

Subgroups may accelerate prefix sums and reductions in an opt-in path after
equivalence and timing tests. They must not be required to load the sim.

---

## 9. Performance architecture and budgets

### 9.1 What actually costs time

At a roughly fixed neighbor count, each full neighbor sweep is \(O(Nk)\), with
\(k\) around 40–80. Surface tension adds interface preparation and forces, but
the largest costs are likely:

1. pressure-iteration neighbor sweeps;
2. number of physical substeps per display frame;
3. grid scatter/reorder;
4. screen-space splatting and filtering at high pixel count;
5. GPU/CPU synchronization;
6. interface passes only after the first four.

The capillary timestep can make stronger surface tension slower even when the
particle count does not change. The performance UI should therefore report
milliseconds per **simulated millisecond**, not just milliseconds per frame.

### 9.2 Adaptive quality tiers

These are TARGETS to measure, not promises.

| Tier | Initial particle target | Render | Physics posture |
|---|---:|---|---|
| fallback / software GPU | 8K–15K | particles or quarter-res SSFR | same equations, lower resolution |
| mobile / weak iGPU | 20K–35K | half/quarter-res, one filter iteration if image gate permits | adaptive dt and tolerance preserved |
| mainstream iGPU | 35K–70K | half-res phase-aware SSFR | full v1 effects, capped secondary particles |
| desktop dGPU | 80K–160K | half-res or dynamic 0.67 scale | full effects |
| high-end dGPU stretch | 200K+ | dynamic | only if measured frame and memory budgets pass |

Initial acceptance targets:

- 60 fps at a 30K moderate-tension default on a representative iGPU;
- 60 fps at 100K on the repo's representative mid-range dGPU;
- 30 fps floor for the densest gallery scene at its declared tier;
- no per-frame mapped readback;
- no unbounded emitter allocation;
- graceful device-loss recovery.

The implementation checkpoint records particle count, neighbor count,
pressure iterations, substeps, simulation ms, render ms, and memory bytes.

### 9.3 Optimization order

Optimize in this order:

1. measure pass timings with timestamp queries where supported and a coarse
   CPU submission fallback elsewhere;
2. eliminate readback and buffer creation in the frame loop;
3. reduce physical substeps through a correct adaptive dt, not coefficient
   weakening;
4. precompute pressure terms that are invariant across iterations;
5. compact interface-only work;
6. fuse compatible neighbor passes when register pressure remains acceptable;
7. persist reordered state and avoid unnecessary inverse scatters;
8. use indirect draws/dispatch for active and phase lists;
9. lower SSFR resolution dynamically;
10. test subgroup reductions as an optional fast path;
11. investigate implicit surface tension only if capillary dt dominates.

Do not begin with Morton/Hilbert ordering. Existing SPH research found only
marginal gains in at least one GPU study, while the current cell-major reorder
already captures the large locality benefit.

### 9.4 Buffer and renderer reuse

Create pipelines, bind-group layouts, buffers, and textures once. Recreate only
on a capacity or canvas-size boundary. The current sph-water renderer builds
some bind groups in draw; the new renderer should cache all stable variants.

Keep simulation and rendering on the same device and read the cell-major
position buffer directly. Rendering should use compact phase lists rather than
scanning inactive capacity.

---

## 10. Rendering specification

### 10.1 Why single-phase SSFR is insufficient

The existing renderer produces one nearest depth and one accumulated thickness.
Two transparent liquids can have:

- an outer free surface;
- a liquid-liquid interface;
- a foreground layer, internal layer, and background layer along one ray;
- phase-specific absorption and refractive index.

A single nearest depth cannot reconstruct this ordering.

### 10.2 v1 phase-aware screen-space renderer

Reuse the existing half-resolution pipeline and narrow-range filter, but render
per phase:

1. front depth for phase A;
2. front depth for phase B;
3. additive thickness for A;
4. additive thickness for B;
5. phase-specific narrow-range filtering;
6. interface mask/depth where opposite-phase neighborhoods meet;
7. ordered composite of the nearest two phase surfaces;
8. container, obstacles, shadows, and secondary particles.

Each phase has:

- absorption \(\boldsymbol{\alpha}_k\);
- scattering/tint;
- roughness;
- refractive index \(n_k\);
- optional emission for stylized gallery modes.

At an A/B interface, use the relative index \(n_B/n_A\), not a hard-coded
air-water offset. Use Schlick Fresnel with

\[
F_0=\left(\frac{n_A-n_B}{n_A+n_B}\right)^2.
\]

Beer-Lambert transmission is

\[
\mathbf{T}_k=\exp(-\boldsymbol{\alpha}_k\,d_k).
\]

### 10.3 Layering limits

Two front-depth layers will not correctly render arbitrary nested droplets or
many alternating transparent layers.

v1 honesty:

- accurate enough for the curated scenes with at most two important layers;
- raw-particle and interface debug modes always available;
- no claim of general refractive path tracing.

v2 candidates:

- front/back depth per phase;
- dual-depth peeling for four ordered interfaces;
- low-resolution 3-D density/material texture and raymarch;
- stochastic direct SPH volume rendering.

Choose only after visual/performance comparisons. The 2017 multiphase SSFR
paper is an implementation reference, but its million-particle/60-fps claim
must not be transferred to WebGPU without local measurement.

### 10.4 Surface quality

Retain the Truong-Yuksel narrow-range filter already implemented in
sph-water. It preserves discontinuities better than broad blurs and reaches a
smooth result with a small number of passes.

Add:

- phase-aware filter thresholds;
- temporal reprojection with rejection at phase/depth discontinuities only if
  it improves stability without ghosting;
- velocity-stretched splats for thin jets;
- interface-normal debug overlay;
- phase-boundary edge highlights in Study mode;
- high-quality anisotropic-kernel reconstruction as an offline/poster option,
  not a v1 live requirement.

Yu and Turk's anisotropic kernels are valuable for thin sheets and smooth
surfaces but require a neighborhood covariance and eigenbasis. They compete
with pressure for GPU time and should first be tested as a render-only lower-
frequency pass.

### 10.5 Lighting and effects

Required:

- HDR intermediate color;
- filmic tone mapping;
- procedural or bundled environment lighting;
- directional key light and soft container shadow;
- phase-dependent absorption and Fresnel;
- contact shadow/ambient occlusion around obstacles;
- optional bloom for emissive scientific overlays;
- motion blur only as a render effect, never on debug/proof views.

Secondary effects:

- spray: ballistic particles emitted from high-energy, low-neighbor regions;
- foam: advected near an outer free surface;
- entrained bubbles: buoyant secondary particles in a liquid;
- microdroplets: phase-tagged and optically shaded.

The Ihmsen 2012 diffuse-particle model is the primary reference. v1 may ship a
bounded visual implementation, but it must be labeled secondary visual physics
and must not be confused with the explicitly simulated second liquid.

---

## 11. Interaction and scene gallery

### 11.1 Direct interactions

- left drag: push/pull or stir on the camera-facing interaction plane;
- phase injector: continuous or pulse emitter for A/B;
- suction tool: remove nearby particles while tracking removed mass;
- droplet stamp: seeded spherical/capsule regions;
- obstacle tool: place and drag SDF primitives;
- wall brush: paint target contact angle;
- heat/surfactant brush: experimental \(\sigma\) field;
- gravity vector: pointer dial and device tilt;
- pause, single-step, slow motion, reset, and deterministic replay;
- orbit, cutaway, follow-a-droplet, and macro camera modes.

All tools must show their radius and affected region in world space.

### 11.2 Named presets

| Preset | Scientific/visual purpose | Primary readout |
|---|---|---|
| Laplace lens | Static droplet in a density-matched bath | measured \(\Delta p\) versus \(2\sigma/R\), spurious velocity |
| Ringing drop | Quadrupole-deformed droplet in zero gravity | oscillation frequency and damping |
| Capillary keyboard | Row of droplet sizes/tensions released together | \(\tau_\sigma\sim\sqrt{\rho R^3/\sigma}\) |
| Oil over water | Density-stratified layers with injected droplets | center of mass, interface height, Bond number |
| Rayleigh-Taylor | Dense fluid initially above light fluid | growth and interface spectrum |
| Rising bubble analogue | Light liquid droplet in heavy bath | rise speed, circularity, center of mass |
| Taylor shear cell | Droplet between counter-moving walls | deformation \(D\) versus Capillary number |
| Wetting atlas | Identical droplets on \(30^\circ\)–\(150^\circ\) wall patches | measured contact angle |
| Capillary maze | Two wetting materials and narrow channels | wetting front and capillary rise |
| T-junction | One phase pinched into droplets by the other | droplet size/frequency, Ca and We |
| Coalescence lab | Equal droplets collide over a speed/tension sweep | merge/bounce/break map |
| Emulsion storm | Many droplets, stirrer, high interface area | interface area proxy and work budget |
| Zero-g marbles | Colored liquid marbles collide in microgravity | surface-energy relaxation |
| Marangoni painter | Painted \(\sigma\) gradient pulls a droplet | migration direction and speed; experimental |
| The gate scene | Small deterministic canonical benchmark | browser-reference error and hashes |

Presets are data, seeded, URL-shareable, and state-round-trippable. Each carries
material properties, resolution tier, camera, tools, and an explanation of
what a physically correct change should look like.

### 11.3 Controls

Prefer derived physical controls:

- density ratio \(\rho_A/\rho_B\);
- viscosity ratio \(\mu_A/\mu_B\);
- interfacial tension;
- gravity;
- requested contact angle per phase/material;
- droplet radius or injector radius;
- resolution;
- solver tolerance and max iterations under Advanced;
- render quality and optical materials under View.

Always display:

- Reynolds number \(Re=\rho UL/\mu\);
- Weber number \(We=\rho U^2L/\sigma\);
- Capillary number \(Ca=\mu U/\sigma\);
- Bond number \(Bo=\Delta\rho gL^2/\sigma\);
- Ohnesorge number \(Oh=\mu/\sqrt{\rho\sigma L}\).

Derive \(U\) and \(L\) from the active scene/tool and state exactly how.

---

## 12. Verification, validation, and proof design

### 12.1 Verification ladder

No single benchmark proves a multiphase solver. Ship the following ladder.

#### Gate A — kernel and number-density primitives

- existing support-2h cubic-spline values unchanged;
- cohesion and adhesion kernel values at branch points and support limits;
- \(\delta_i=\sum_jW_{ij}\) on hand-derived two- and lattice-particle fixtures;
- \(V_i=1/\delta_i\);
- phase mass changes \(\tilde\rho_i=m_i\delta_i\) without changing compression;
- gradient antisymmetry \(\nabla W_{ij}=-\nabla W_{ji}\).

#### Gate B — small-N pressure algebra

- INDSPH denominator and \(\kappa\) fixtures from a 2–8 particle configuration;
- one iteration matched by Python f64 and WGSL f32;
- net internal pressure force near zero;
- density-ratio sweep with equal rest volume;
- finite-difference check of the number-density change induced by a pressure
  impulse.

#### Gate C — surface-force algebra

- cohesion and curvature pair fixtures;
- equal-and-opposite internal force;
- zero net force for a symmetric bulk stencil;
- zero or threshold-bounded torque in an isolated pair/symmetric fixture;
- requested/effective coefficient calibration artifact.

#### Gate D — optimized-neighbor equivalence

- grid neighbor set equals brute force at small N;
- sorted grid accumulation equals brute-force accumulation in the same order;
- deliberately undersized cells fail the falsifiability probe;
- interface compaction contains exactly the particles selected by the brute
  predicate.

### 12.2 Analytic and canonical tests

| Test | Observable | Acceptance posture |
|---|---|---|
| Static 2-D circle and 3-D sphere | pressure jump vs \(\sigma/R\) and \(2\sigma/R\) | convergence with resolution; slope and intercept, not one tuned radius |
| Static droplet | maximum parasitic velocity; interface thickness; COM drift | bounded and decreasing under refinement |
| Oscillating droplet | dominant frequency and viscous damping | Rayleigh-Lamb reference in the regime where assumptions hold |
| Capillary wave | frequency from \(\omega^2=[\Delta\rho gk+\sigma k^3]/(\rho_A+\rho_B)\) for deep layers | phase/frequency convergence |
| Two-layer Poiseuille | velocity profile and shear-stress continuity | analytic profile |
| Taylor shear drop | \(D=(L-B)/(L+B)\), low-Ca slope; for unbounded creeping flow \(D=Ca(19\lambda+16)/(16\lambda+16)\) | restricted to small deformation and low Re |
| Hydrostatic layers | pressure gradient, flat interface, zero velocity | long-run drift bound |
| Sessile drop | contact angle, height, base radius | calibrated angle sweep |
| Capillary rise | equilibrium rise versus Jurin/Young-Laplace relation | resolution study |
| Rising bubble | circularity, center of mass, rise velocity | Hysing-style benchmark, adapted carefully to represented phases |
| Rayleigh-Taylor | interface growth and symmetry | comparison to a trusted reference at declared regime |

### 12.3 Conservation and health invariants

Every frame or diagnostic interval:

- phase-A particle count and represented mass;
- phase-B particle count and represented mass;
- total mass including explicit emitter/suction accounting;
- total linear momentum in isolated periodic/zero-g scenes;
- total angular momentum in isolated symmetric tests;
- maximum/mean number-density compression;
- minimum particle separation;
- maximum cell occupancy and sort saturation;
- number of cross-phase penetrations or phase-order inversions;
- maximum speed and active timestep limiter;
- kinetic energy;
- viscous dissipation sign;
- surface-energy proxy or interface-area proxy;
- total internal surface-force sum;
- pressure iterations and residual;
- NaN/Inf and out-of-domain flags.

### 12.4 Browser-visible PROVE panel

The visitor can run:

1. kernel goldens;
2. number-density versus standard-density interface fixture, showing why the
   ordinary formula fails;
3. hash-grid versus brute-force equivalence;
4. static-droplet Laplace pressure test;
5. run-twice deterministic replay;
6. pressure residual and phase-mass plots;
7. requested versus effective surface tension;
8. contact-angle calibration check.

The hero scene is paused during expensive proof runs. Proof buffers and live
buffers are separate so a proof cannot corrupt the playground.

### 12.5 Canonical capture

Prefer a small, non-chaotic calibration scene over a visually violent hero:

- 2-D or small 3-D zero-gravity droplet in a bath;
- density ratio 1 or 2;
- known radius and \(\sigma\);
- relaxation from a small deterministic perturbation;
- checkpoints contain positions, velocities, phase ids, number density,
  pressure/stiffness proxy, interface normal, and diagnostics.

Gate chaotic hero scenes by robust observables, not pointwise trajectories.

### 12.6 Independent references

Use at least:

- Python f64 reference written from the algebraic spec;
- SPlisHSPlasH kernel and Akinci implementation for code-level checks;
- the published INDSPH equations and figures;
- SPHinXsys wetting/two-phase examples for scenario-level comparison;
- a separate Eulerian reference such as Basilisk/Aphros for selected
  continuum benchmarks where practical.

Do not use one implementation both to generate and to validate a golden.

---

## 13. Product UI and explanatory layer

### 13.1 Panel structure

- **Play:** preset cards and primary controls.
- **Study:** live regime numbers, conservation, pressure residual, interface
  statistics, and timing.
- **Prove:** the verification ladder and canonical replay.
- **Explain:** continuum equations, number-density derivation, surface model,
  timestep limits, rendering approximation, and links to exact Python/WGSL
  code.
- **Advanced:** solver tolerance, max iterations, dt safety factors, surface
  model experiments, debug buffers.

### 13.2 Debug views

- phase id;
- number density and relative compression;
- pressure/stiffness;
- speed;
- physical viscosity;
- neighbor count;
- cross-phase neighbor count;
- interface normal;
- curvature/interface force;
- surface-force magnitude;
- contact/wetting force;
- pressure residual;
- cell occupancy;
- active timestep limiter;
- raw particles;
- reconstructed surfaces;
- per-phase thickness.

### 13.3 Honest labels

The UI must distinguish:

- simulated second liquid versus secondary bubble/foam particles;
- physical dynamic viscosity versus XSPH smoothing;
- requested versus measured effective surface tension;
- equilibrium contact-angle calibration versus dynamic hysteresis;
- constant-\(\sigma\) verified core versus experimental Marangoni field;
- simulation surface versus screen-space render reconstruction;
- same-device determinism versus cross-device tolerance.

---

## 14. Implementation stages

### Stage 0 — executable research probes

1. Reproduce the INDSPH small-N equations in a notebook or test module.
2. Reproduce the Akinci cohesion/adhesion kernels from the vendored header.
3. Implement a 2-D f64 static droplet with brute-force neighbors.
4. Measure Laplace pressure, parasitic current, interface thickness, and
   coefficient-to-effective-\(\sigma\) mapping.
5. Compare Akinci with one conservative CSF/surface-stress formulation on the
   same fixtures.
6. Decide the canonical surface model from evidence; update this spec if the
   v1 decision shifts.

**Checkpoint:** no WGSL before the 2-D reference has a stable static droplet,
oscillating drop, and two-layer viscosity test.

### Stage 1 — verified Python package

1. Author the five sim-spec files and algebraic derivation.
2. Add kernel, number-density, pressure, surface, viscosity, and wetting
   goldens.
3. Implement seeded 2-D and small 3-D references.
4. Add property-based invariants and deterministic ordering.
5. Add analytic benchmark tests and canonical capture.
6. Record performance and limitations.

### Stage 2 — WebGPU solver core

1. Scaffold from sph-water without changing the parent package.
2. Port number-density and INDSPH passes.
3. Port the canonical surface model and physical viscosity.
4. Add phase material buffers and compact phase/interface lists.
5. Reuse and then specialize the counting-sort grid.
6. Match small-N f64 fixtures and the canonical robust observables.
7. Measure per-pass cost and declare hardware tiers.

**Checkpoint:** physics gates and timing before the new renderer or full UI.

### Stage 3 — phase-aware rendering

1. Raw particle renderer with phase/material/debug modes.
2. Per-phase depth and thickness.
3. Per-phase narrow-range filter.
4. Ordered two-layer refraction, Fresnel, absorption, and interface highlight.
5. Environment, shadows, tonemapping, cutaway, and camera modes.
6. Visual comparison against raw particles and offline reference images.

### Stage 4 — interaction and instrument

1. Named preset registry.
2. Phase injector, suction, stirrer, obstacle, gravity, wall-wetting brush.
3. Live nondimensional numbers and conservation plots.
4. PROVE and EXPLAIN panels.
5. URL state, replay, accessibility, mobile gestures.
6. Secondary spray/foam/bubbles if the core budget permits.

### Stage 5 — productization

1. Browser gate registration and thresholds measured from two independent runs.
2. Headless WebGPU validation.
3. device-loss and fallback tests;
4. poster and deterministic motion loop;
5. landing card and explanatory copy;
6. deploy only after the operator dispatches the existing workflow.

### Stage 6 — research upgrades

Evaluate independently:

- Adami 2010 reproducing-divergence CSF;
- Hu-Adams surface stress;
- Zhang-Lourenço-Hu 2025 zero-surface-energy penalty;
- Jeske implicit surface tension;
- Probst-Teschner unified pressure/tension/friction;
- thermocapillary/Marangoni transport;
- anisotropic-kernel surface reconstruction;
- more than two render layers;
- two-way rigid coupling;
- multi-resolution SPH.

Each upgrade needs a before/after benchmark and an explicit canonical decision.

---

## 15. Acceptance criteria

### Physics and verification

1. The live hero solver uses the same number-density pressure and surface-force
   primitives exercised by the Python reference and browser proof fixtures.
2. Static 2-D and 3-D droplets converge toward the correct Laplace pressure
   jump across at least three resolutions and three radii.
3. Maximum static-droplet parasitic speed decreases under refinement or has a
   documented resolution floor.
4. Oscillation frequency, capillary-wave frequency, two-layer Poiseuille, and
   low-Ca Taylor deformation meet predeclared tolerances.
5. Phase mass is exact except for explicitly accounted emit/suction operations.
6. Pairwise internal pressure and surface forces conserve momentum to the
   declared numerical budget.
7. Requested contact-angle calibration passes at five angles.
8. Grid and brute-force neighbor/interface results agree on proof fixtures.
9. Same-device canonical replay is byte-identical twice; cross-device results
   meet measured numerical tolerances.
10. No tolerance is widened after a failing final gate.

### Performance

1. No frame-loop buffer allocation, shader compilation, or mapped readback.
2. Adaptive dt names the active limiter and never silently changes material
   coefficients.
3. At least the fallback, iGPU, and dGPU tiers are measured on real adapters.
4. The declared default scene meets its frame target with full physics.
5. Pressure iterations, neighbor count, substeps, simulation/render ms, memory,
   and grid saturation are visible.
6. Device loss produces a recoverable message or reinitialization.

### Product and visuals

1. At least ten named presets, including four quantitative benchmark scenes and
   four visual hero scenes.
2. Direct phase injection, stirring, obstacle dragging, gravity tilt, and
   wetting painting work with mouse, pen, and touch.
3. Internal A/B interfaces remain visually legible under the curated
   transparent-material presets.
4. Raw-particle and scientific debug views remain available.
5. The UI is usable at 375 CSS pixels and at desktop width.
6. Motion reduction, keyboard navigation, readable contrast, and non-color-only
   phase identification are supported.
7. Poster and loop are derived from a deterministic preset/frame.

---

## 16. Risk and rejected-with-cause ledger

### R1 — Add a phase id to sph-water

**REJECTED.** Standard density summation mixes unequal particle masses across
the kernel and creates the interface error the sim is supposed to study.

### R2 — Use WCSPH because it is simpler

**REJECTED for v1.** Riemann-WCSPH is a serious high-density-ratio method and
the 2019/2025 Hu-group work is a valuable reference, but acoustic timestep
limits fight the browser target. The existing repo and the 2023 number-density
paper make incompressible iteration the lower-risk starting point for two
liquids. Reconsider for an explicit air-water sim.

### R3 — Claim water-air at 1000:1

**REJECTED.** The selected INDSPH source itself states a limitation beyond two
orders of magnitude. The product is liquid-liquid v1.

### R4 — Treat a repulsive force as surface tension

**REJECTED.** Repulsion can suppress phase crossing but does not establish the
correct pressure jump, capillary-wave dispersion, or surface energy.

### R5 — Expose the raw Akinci coefficient as SI \(\sigma\)

**REJECTED.** Its effective macroscopic tension is resolution- and kernel-
dependent. Calibrate and display requested versus measured values.

### R6 — Curvature-only CSF without momentum audit

**REJECTED.** A naive CSF can generate parasitic currents and non-antisymmetric
forces. It may land only with pairwise force, torque, and droplet tests.

### R7 — Full 3-D density-grid raymarch in v1

**DEFERRED.** It solves deeper compositing but adds splat atomics, memory,
raymarch cost, and another resolution scale. Start with phase-aware SSFR and
measure its visual failure cases.

### R8 — Anisotropic reconstruction every substep

**DEFERRED.** Neighborhood covariance/eigendecomposition competes with pressure
for time. Try it at render frequency or offline first.

### R9 — Make warm start default

**REJECTED.** The repo already documents cyclic instability. It remains a
visible experiment with detection.

### R10 — Maintain frame rate by reducing \(\sigma\)

**REJECTED.** That changes Weber, Bond, Capillary, and Ohnesorge regimes. Reduce
resolution, rendering, or playback rate instead.

### R11 — Claim a browser first

**REJECTED without a publication-time survey.** Aphros Explorer already runs
interactive two-liquid surface-tension CFD in a browser, and several browser
SPH/MPM demos exist. The defensible differentiator is a 3-D WebGPU
number-density SPH instrument with a repo-bound verification spine. Any
first-of-kind claim requires a fresh, documented systematic search.

### R12 — Copy full upstream source

**REJECTED.** Cite and independently implement equations; extend the existing
vendored manifest only through the repo's vendoring discipline if more source
is truly required.

---

## 17. Research synthesis and implementation references

### Core SPH and multiphase formulation

- J. J. Monaghan, “Smoothed Particle Hydrodynamics,” 1992, and the 2005 review:
  baseline SPH and the support-2h cubic spline already used by the repo.
- X. Y. Hu and N. A. Adams, “A multi-phase SPH method for macroscopic and
  mesoscopic flows,” JCP 213 (2006), DOI
  [10.1016/j.jcp.2005.09.001](https://doi.org/10.1016/j.jcp.2005.09.001).
  Specific-volume formulation, discontinuous properties, surface stress, and
  multiphase benchmarks. Author PDF:
  [2006-jcp.pdf](https://xiangyu-hu.userweb.mwn.de/papers/2006-jcp.pdf).
- X. Y. Hu and N. A. Adams, “An incompressible multi-phase SPH method,” JCP
  227 (2007), DOI
  [10.1016/j.jcp.2007.07.013](https://doi.org/10.1016/j.jcp.2007.07.013).
  Fractional projection with discontinuous density/viscosity and a symmetric
  linear system. [Author PDF](https://xiangyu-hu.userweb.mwn.de/papers/2007-incompressible.pdf).
- B. Solenthaler and R. Pajarola, “Density Contrast SPH Interfaces,” SCA 2008.
  The direct source for number density, adapted pressure/viscosity, normalized
  color fields, and the standard-density failure demonstration.
  [Paper](https://diglib.eg.org/server/api/core/bitstreams/46a25c7c-370c-4d51-829a-da340c22dcf3/content).
- X. Wang et al., “Implicit smoothed particle hydrodynamics model for
  simulating incompressible fluid-elastic coupling,” CAVW 2023, DOI
  [10.1002/cav.2146](https://doi.org/10.1002/cav.2146). The selected INDSPH
  number-density pressure formulation and the published INDSPH+Akinci
  multiphase combination.
- J. Bender and D. Koschier, “Divergence-Free SPH,” SCA 2015, DOI
  [10.1145/2786784.2786796](https://doi.org/10.1145/2786784.2786796).
- D. Koschier et al., “SPH Techniques for the Physics Based Simulation of
  Fluids and Solids,” Eurographics tutorial.
  [arXiv:2009.06944](https://arxiv.org/abs/2009.06944).

### Surface tension, wetting, and recent research

- J. P. Morris, “Simulating surface tension with SPH,” IJNMF 33 (2000).
- S. Adami, X. Y. Hu, and N. A. Adams, “A new surface-tension formulation for
  multi-phase SPH using a reproducing divergence approximation,” JCP 229
  (2010), DOI
  [10.1016/j.jcp.2010.03.022](https://doi.org/10.1016/j.jcp.2010.03.022).
  [Author PDF](https://mediatum.ub.tum.de/doc/1188525/442081.pdf).
- N. Akinci, G. Akinci, and M. Teschner, “Versatile Surface Tension and
  Adhesion for SPH Fluids,” TOG 2013, DOI
  [10.1145/2508363.2508395](https://doi.org/10.1145/2508363.2508395).
  [Author PDF](https://cg.informatik.uni-freiburg.de/publications/2013_SIGGRAPHASIA_surfaceTensionAdhesion.pdf).
- M. Huber et al., “Evaluation of Surface Tension Models for SPH-Based Fluid
  Animations Using a Benchmark Test,” VRIPHYS 2015.
  [Eurographics record](https://diglib.eg.org/items/4058c309-8d08-4405-bec2-0fc7ffff7a24).
- S. R. Jeske et al., “Implicit Surface Tension for SPH Fluid Simulation,” TOG
  2023, DOI [10.1145/3631936](https://doi.org/10.1145/3631936), with
  [project and source](https://srjeske.de/publications/2023-tog-sph-surface-tension/).
- M. Blank, P. Nair, and T. Pöschel, “Surface tension and wetting at free
  surfaces in SPH,” JFM 987 (2024), DOI
  [10.1017/jfm.2024.410](https://doi.org/10.1017/jfm.2024.410). Open-access
  CSF, kernel correction, equilibrium contact angle, and wetting benchmarks.
- T. Probst and M. Teschner, “Unified Pressure, Surface Tension and Friction
  for SPH Fluids,” TOG 44 (2024), DOI
  [10.1145/3708034](https://doi.org/10.1145/3708034).
- S. Zhang, S. D. N. Lourenço, and X. Hu, “Multiphase SPH for surface tension:
  resolving zero-surface-energy modes and achieving high Reynolds number
  simulations,” 2025.
  [arXiv:2503.16082](https://arxiv.org/abs/2503.16082).
- D. N. G. Fourtakas et al., “A SPH approach for thermo-capillary flows,”
  Computers & Fluids 176 (2018), DOI
  [10.1016/j.compfluid.2018.09.010](https://doi.org/10.1016/j.compfluid.2018.09.010).

### Implementations and industry practice

- [SPlisHSPlasH](https://github.com/InteractiveComputerGraphics/SPlisHSPlasH):
  open-source graphics SPH with DFSPH and multiple surface-tension methods.
  The repo already vendors its kernels at a pinned SHA.
- [SPHinXsys](https://github.com/Xiangyu-Hu/SPHinXsys): open-source
  engineering/multiphysics SPH. Its
  [2-D wetting example](https://www.sphinxsys.org/html/examples/example18_2D_wetting.html)
  is a concrete Riemann multiphase, color-gradient, tension, and wetting
  implementation.
- [DualSPHysics features](https://dual.sphysics.org/features/): CUDA/OpenMP
  production SPH with Newtonian/Newtonian, gas-liquid, and granular multiphase
  solvers. Its training material documents CSF color-gradient surface tension.
- [PySPH equations](https://pysph.readthedocs.io/en/main/reference/equations.html):
  executable documentation for volume summation, transport-velocity, harmonic
  viscosity, and generated CPU/OpenCL/CUDA equation kernels.
- [Aphros Explorer](https://cselab.github.io/aphros/wasm/aphros_doc.html):
  existing browser two-liquid CFD reference with density, viscosity, gravity,
  surface tension, and runtime controls. It is Eulerian rather than SPH.
- [lammps-sph-multiphase](https://github.com/slitvinov/lammps-sph-multiphase):
  open color-gradient and surface-tension examples, including square-to-sphere
  and droplet oscillation.
- [NVIDIA Flex manual](https://docs.nvidia.com/gameworks/content/gameworkslibrary/physx/flex/manual.html):
  a real-time, position-based industry reference for phase/group encoding,
  active particle sets, cohesion, surface tension, adhesion, vorticity
  confinement, smoothed positions, and render anisotropy. Its explicit warning
  that it is visual-effects physics rather than gameplay truth is the right
  model for separating spectacle controls from verification claims.
- [Ansys FreeFlow](https://www.ansys.com/products/fluids/ansys-freeflow) is a
  current single-phase engineering SPH product with surface tension, thermal,
  adaptive element size, and multi-GPU positioning. The related
  [Rocky SPH technical manual](https://ansyshelp.ansys.com/public/Views/Secured/corp/v252/en/pdf/Rocky_SPH_Technical_Manual.pdf)
  documents CSF/CSS and pairwise cohesion/adhesion formulations. These are
  useful model and UX comparisons, not evidence that FreeFlow is a two-fluid
  solver.
- Siemens' [Simcenter SPH Flow 2206 release](https://blogs.sw.siemens.com/simcenter/simcenter-sph-flow-2206-released-whats-new/)
  documents multiple immiscible liquids with distinct viscosities, while the
  [STAR-CCM+ 2410 release](https://blogs.sw.siemens.com/simcenter/simcenter-star-ccm-2410-released/)
  adds SPH surface tension and hydrophilic/hydrophobic wall interaction. This
  reinforces the product value of material presets, wettability, and demanding
  industrial scenes such as mixing, washing, painting, and lubrication.
- Commercial SPH products such as PreonLab remain useful visual and workflow
  references. Public product imagery is not a numerical truth anchor.

### Browser and WebGPU implementation references

- [WebGPU-Ocean](https://github.com/matsuoka-601/WebGPU-Ocean) contains both
  browser SPH and MLS-MPM paths, a GPU fixed-radius neighbor search, and
  screen-space fluid rendering. Its documented SPH neighborhood bottleneck is
  direct evidence for making neighbor traversal the first profiling target.
- [Splash](https://github.com/matsuoka-601/Splash) combines WebGPU MLS-MPM,
  narrow-range-filter SSFR, density-grid ray-marched shadows, and interaction.
  It is a visual/performance reference, not an SPH accuracy reference.
- [WaterBall](https://github.com/matsuoka-601/WaterBall) is useful for spherical
  containers, moving gravity, and constrained-domain art direction.
- [jeantimex/fluid](https://github.com/jeantimex/fluid) provides current WebGPU
  SPH and PIC/FLIP implementations plus 2-D and 3-D rendering experiments.
- [Wumpf/blub](https://github.com/Wumpf/blub) is a Rust/WebGPU 3-D fluid
  experiment whose code organization and GPU tooling are relevant to shader
  pipeline inspection.

These browser projects establish that interactive WebGPU fluids and polished
SSFR already exist. The proposed sim's differentiator must therefore be the
combination of two-liquid interface physics, transparent diagnostics,
quantitative verification, and portfolio-level art direction—not a generic
claim of being the first browser fluid.

### Rendering and secondary effects

- W. van der Laan, S. Green, and M. Sainz, “Screen Space Fluid Rendering with
  Curvature Flow,” I3D 2009, DOI
  [10.1145/1507149.1507164](https://doi.org/10.1145/1507149.1507164).
- N. Truong and C. Yuksel, “A Narrow-Range Filter for Screen-Space Fluid
  Rendering,” I3D 2018.
  [Project and paper](https://ttnghia.github.io/posts/narrow-range-filter/).
- J. Yu and G. Turk, “Reconstructing Surfaces of Particle-Based Fluids Using
  Anisotropic Kernels,” SCA 2010.
  [Paper and video](https://diglib.eg.org/items/2d966af2-5428-41ca-b90c-2cf76c1f4b53).
- C. Brito et al., “Screen Space Rendering Solution for Multiphase SPH
  Simulation,” SVR 2017.
  [Paper](https://cjsb.github.io/cjsb_files/svr2017.pdf).
- M. Ihmsen et al., “Unified Spray, Foam and Bubbles for Particle-Based
  Fluids,” 2012.
  [Author PDF](https://cg.informatik.uni-freiburg.de/publications/2012_CGI_sprayFoamBubbles.pdf).

### Platform constraints

- [WebGPU specification](https://gpuweb.github.io/gpuweb/) and
  [WGSL specification](https://www.w3.org/TR/WGSL/): authoritative limits,
  memory model, integer atomics, and shader semantics.
- [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API):
  availability, secure-context, adapter, device, and compatibility guidance.
- [Chrome WebGPU subgroups](https://developer.chrome.com/blog/new-in-webgpu-134):
  subgroups became available in Chrome 134 but remain optional and
  device-dependent.

### Validation references

- S. Hysing et al., “Quantitative benchmark computations of two-dimensional
  bubble dynamics,” IJNMF 60 (2009), DOI
  [10.1002/fld.1934](https://doi.org/10.1002/fld.1934).
- G. I. Taylor, small-deformation droplet theory. The applicable low-Ca result
  and assumptions are summarized in modern droplet-deformation literature; the
  gate must cite the original in its derivation.
- Brackbill, Kothe, and Zemach, CSF and capillary timestep lineage. A modern
  derivation and comparison is available in
  [Denner et al.](https://doi.org/10.1016/j.jcp.2022.111213).

---

## 18. Implemented outcome

`sph-multiphase` shipped as a new verified sim, not as a feature toggle inside
`sph-water`.

The implemented v1 contains:

- equal-rest-volume, phase-mass particles;
- INDSPH number-density incompressibility;
- published Akinci compact cohesion plus color-normal curvature; the discrete
  curvature is Young–Laplace calibrated, while the live force coefficient is
  explicitly dimensionless rather than presented as measured SI tension;
- physical discontinuous viscosity;
- analytic SDF box/sphere safety collisions;
- spatial equilibrium-wetting targets with five spherical-cap geometry anchors
  (not dynamic contact-line hysteresis);
- adaptive capillary-aware timestep;
- cell-major WebGPU neighbor search with deterministic local id sort;
- phase-aware single-front SSFR with separate per-phase thickness and an
  explicit arbitrary-nesting limitation; multi-front depth peeling remains a
  research upgrade;
- fifteen named experiments;
- discrete Young–Laplace curvature, Rayleigh–Lamb and capillary-wave scaling,
  two-layer Poiseuille interface conditions, Taylor relation, wetting geometry,
  conservation, grid-oracle, and run-twice gates.

The f64 suite additionally holds discrete 2-D circle and 3-D sphere curvature
against Young–Laplace across three resolutions (and three circle radii), the
two-layer Poiseuille interface conditions, Rayleigh–Lamb scaling, five
spherical-cap contact angles, capillary-wave/Taylor relations, pair momentum,
grid-oracle equivalence, and run-twice determinism. The browser gate runs the
same live number-density, pressure, viscosity, and interface passes twice and
requires byte-identical fields, finite state, positive number density, two
preserved phases, a present interface, positive phase masses, bounded startup
compression/speed, and an unsaturated sorted grid. The deploy validator
measured 79/74 ms readiness on the available local browser adapter; the WebGPU
privacy surface did not expose an adapter class, so no iGPU/dGPU-specific rate
is claimed. The fallback/balanced/high/ultra particle tiers are product choices,
not cross-device performance claims.

The most valuable post-v1 research is not another visual effect. It is an
adversarial comparison of the v1 pairwise model against a conservative
surface-stress formulation, including the 2025 zero-surface-energy penalty,
under the same static-drop, capillary-wave, high-Re, and GPU-cost harness. That
comparison could turn a strong interactive sim into a genuinely useful
research artifact.
