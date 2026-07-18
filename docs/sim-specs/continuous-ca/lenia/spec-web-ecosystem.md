# Flow Lenia Ecosystem — WebGPU implementation specification

> **Status:** IMPLEMENTED — research/audit, M1 f64 scientific oracle, M0 WebGPU feasibility, M2
> Organism Lab, M3 visual laboratory, M4 localized ecosystems, M5 Arena Lab, and M6
> productization are complete. See
> `implementation-plan.md`, `m0-webgpu-benchmark.md`, `m2-organism-validation.md`, and
> `m3-visual-laboratory-validation.md`, `m4-localized-ecosystem-validation.md`, and
> `m5-m6-arena-release-validation.md`.
> **Target:** a new interactive browser simulation at `packages/flow-lenia/web/`.
> **Scientific lineage:** Flow Lenia (Plantec et al., 2022/2025), Reintegration Tracking,
> multi-kernel/multi-channel Lenia, and the localized-parameter ecosystem experiments of
> Etcheverry et al. (2025–2026).
> **Relationship to the landed package:** additive. The existing Taichi package and
> `spec-frontier-flow.md` remain the verified conservative-transport primitive. This specification
> adds the published affinity, density-pressure, square-distribution reintegration, multi-channel
> kernels, localized parameters, mixing, mutation, environment, and WebGPU product surface.
> **Date:** 2026-07-18.

## 1. Ship outcome

Ship a visually rich, scientifically legible Flow Lenia ecosystem laboratory that runs entirely in
the browser. A visitor must be able to:

1. grow and disturb mass-conserving Flow Lenia organisms;
2. see how affinity gradients, density pressure, and conservative transport create motion;
3. introduce localized, heritable rule parameters and watch lineages collide, mix, mutate, spread,
   fragment, or disappear;
4. sculpt soft environments such as walls, corridors, islands, and affinity landscapes;
5. inspect mass, flow, affinity, kernel response, lineage, and ecosystem metrics without leaving
   the canvas;
6. replay a deterministic seed and export/import a compact experiment;
7. distinguish the faithful model, optional experimental extensions, and purely artistic render
   effects.

The default experience is an organism-scale Flow Lenia scene with immediate motion and a clear
visual identity. “Ecosystem mode” then reveals genotype color, mutation, mixing, lineage, and
environment controls. The UI should teach by direct manipulation rather than require prior
artificial-life knowledge.

This is a synthetic artificial-life model. It is not a model of biological cells, biochemical
kinetics, disease, or an ecological population in physical units. Terms such as organism, genome,
species, feeding, and evolution are operational metaphors whose in-simulation definitions must be
available in the information panel.

## 2. Existing repository baseline

### 2.1 What is already trustworthy

The current `packages/flow-lenia/` implementation establishes a small, rigorous transport oracle:

- one non-negative scalar mass field;
- a normalized Gaussian convolution;
- affinity flow given by a central-difference gradient;
- periodic boundaries;
- forward bilinear point splatting;
- f64, serial Taichi CPU execution;
- property tests for mass conservation and non-negativity;
- a zero-flow pointwise identity anchor;
- deterministic canonical capture and testkit integration.

Its conservation proof is reusable: if every source redistributes all of its non-negative mass
through non-negative weights whose destination sum is one, total mass is conserved to floating-point
summation error.

### 2.2 What it does not yet implement

The current package is intentionally a frontier primitive, not the complete published Flow Lenia
model. It omits:

- Lenia’s multi-ring kernels and bell-shaped growth responses;
- multiple channels and source-to-target kernel connections;
- the density-dependent pressure term;
- finite square distributions and exact overlap-based reintegration;
- localized kernel weights carried with matter;
- genome selection, mixing, mutation, and lineage;
- environment affinity fields, obstacles, food, and ecosystem diagnostics;
- a WebGPU application and public-site integration.

The new work must not silently redefine the old package as though those features were already
verified.

### 2.3 Reusable browser infrastructure

The repository already provides the major product and GPU building blocks:

- `common/common-web/src/fft-wgsl.ts`: radix-2 Stockham FFT WGSL with driver-stable trigonometric
  approximation;
- `packages/heat-equation/web/src/solver.ts`: a working 2D FFT ping-pong and bind-layout pattern;
- `packages/physarum/web/`: fixed-point atomic deposition and agent-field visualization patterns;
- shared panel, colormap, capture, canonical-reference, and readiness helpers;
- the `packages/<sim>/web` Vite app convention;
- WebGPU Chromium smoke/capture validation and the 13-gate productization flow.

The current FFT requires power-of-two dimensions. The initial supported simulation sizes are
therefore 128, 256, and an opt-in 512 cinematic tier.

## 3. Research synthesis

### 3.1 Academic model lineage

| Work | Contribution used here | Implementation consequence |
|---|---|---|
| [Flow-Lenia, ALIFE 2022 preprint](https://arxiv.org/abs/2212.07906) and [2025 Artificial Life journal article](https://direct.mit.edu/artl/article/31/2/228/130572/Flow-Lenia-Emergent-Evolutionary-Dynamics-in-Mass) | Recasts Lenia growth as an affinity field, adds density pressure, conserves matter through Reintegration Tracking, and localizes parameters. | Defines the faithful simulation core and conservation contract. |
| [Reintegration Tracking](https://michaelmoroz.github.io/Reintegration-Tracking/) | Represents each cell as a finite distribution and analytically reintegrates its overlap with destination cells. | Use exact uniform-square overlap in a destination-gather compute pass. |
| [Lenia and Expanded Universe](https://direct.mit.edu/isal/article/doi/10.1162/isal_a_00297/98400/Lenia-and-Expanded-Universe) | Multi-kernel, multi-channel rules produce differentiated and interacting structures. | Default ecosystem uses three channels and nine connected kernels. |
| [Exploring Flow Lenia Universes](https://arxiv.org/html/2505.15998) | Curiosity search, localized genomes, alternative mixing rules, mutations, walls/corridors, long-horizon evolutionary-activity and complexity measurements. | Separates ecosystem mechanics from the organism solver and motivates negotiation, stochastic gene-wise inheritance, lineage, and environmental experiments. |
| [Sensorimotor Lenia](https://arxiv.org/abs/2402.10236) | Obstacles, perturbations, curriculum, and diversity search expose robust agency. | Include obstacle arenas, disturbance tests, tracking, and recovery diagnostics. |
| [Flow-Lenia.png](https://arxiv.org/abs/2408.06374) | Genetic search with multiscale compression complexity and polar rerasterization to avoid radial-symmetry bias. | Add lightweight live complexity proxies; reserve compression scoring and search for offline tooling. |
| [Large-scale evolutionary Lenia](https://arxiv.org/abs/2304.05639) | Local genotypes can produce implicit reproduction and selection, but unconstrained runs may be dominated by fast expanders. | Supply spatial structure and explicit resource experiments; do not equate expansion with open-ended evolution. |
| [Quality Diversity through AI Feedback](https://arxiv.org/abs/2406.04235) | MAP-Elites and learned/hand-designed descriptors can curate diverse Lenia behaviors. | Reserve an archive/discovery gallery as a later mode, not part of the hot simulation loop. |

The most recent ecosystem study reports that mixing rule matters: negotiation sustained the greatest
measured non-neutral evolutionary activity in its experiments; stochastic gene-wise inheritance was
also active; simple averaging created diffuse, continuously blended parameter identities that showed
almost no exact-genome activity. Its ecosystem search used 256 × 256 worlds, three channels, nine
kernels, and 10,000-step runs. Those are empirical results for the study’s regimes, not universal
guarantees. The application should make the rules comparable under identical seeds.

### 3.2 Research-engineering and industry-adjacent implementations

This survey found no mature commercial Flow Lenia simulator to copy. The relevant “industry”
evidence is research-lab engineering around accelerator-native artificial life:

| Implementation | Relevant lesson |
|---|---|
| [Official Flow Lenia JAX code](https://github.com/erwanplantec/FlowLenia) and [model notes](https://sites.google.com/view/flowlenia/model) | Primary executable reference for kernels, growth, pressure, Reintegration Tracking, and local parameter transport. |
| [Exploring-Flowlenia](https://github.com/Thomick/Exploring-Flowlenia) and its [current companion archive](https://developmentalsystems.org/Flow-Lenia-Universes-Journal/) | Current ecosystem reference: mixing variants, mutation, walls, food experiments, evolutionary metrics, curiosity search, and a browsable discovery manifold. |
| [Google DeepMind publication page](https://deepmind.google/research/publications/106327/) | Confirms active research-lab interest and the journal version’s scope. |
| [Google Research Particle Lenia](https://google-research.github.io/self-organising-systems/particle-lenia/) | Strong browser UX precedent: direct manipulation, reproducible configurations, and PNG previews that carry a full creature configuration. |
| [CAX](https://github.com/maxencefaldor/cax) / [paper](https://arxiv.org/abs/2410.02651) | Modular perceive/update decomposition, vectorization, scan, and selectable convolution backends are useful architectural patterns. |
| [Leniax](https://github.com/morgangiraud/leniax) / [documentation](https://leniax.readthedocs.io/en/latest/overview.html) | Batch simulation, differentiation, evolution, and reproducible configuration should remain possible outside the interactive renderer. |

The official JAX repositories are scientific references, not browser code dependencies. Equations,
small golden fixtures, and documented preset values may be independently reimplemented. Source must
not be copied without reviewing and recording license compatibility.

### 3.3 Community implementations and product lessons

| Project | Feature lesson | Provenance constraint |
|---|---|---|
| [Lenia portal](https://chakazul.github.io/lenia.html) and [Chakazul/Lenia](https://github.com/Chakazul/Lenia) | Species galleries, immediate preset switching, FFT history, and evolutionary exploration make a difficult model approachable. | Treat the species catalogue as reference material; verify licenses before redistributing presets or media. |
| [Open Lenia](https://openlenia.github.io/) | A clean public entry point and accessible explanation are as important as solver depth. | Design inspiration only unless assets are explicitly compatible. |
| [Adrian Margel’s WebGL experiment](https://adrianmargel.ca/projects/lenia/) and [GPL repository](https://github.com/AdrianMargel/flow-lenia) | Genotype hue, density lighting, mutation-by-click, image adhesion, trails, zoom, and material coupling make the field visually expressive. | The project is GPL-3.0 and scientifically diverges from the published affinity model. Do not copy code or shaders; independently implement only general interaction ideas. |
| [Exploring Flow Lenia archive](https://developmentalsystems.org/Flow-Lenia-Universes-Journal/) | Pan/zoom discovery maps, video previews, goal metadata, and export make generated behaviors explorable. | A future discovery surface, not a requirement for the first simulator release. |

Scientific reference mode must never be replaced by a visually attractive but undocumented “fluid
Lenia” variant. Experimental coupling, blur, trails, and lighting belong behind labeled render or
model toggles.

## 4. Model from first principles

### 4.1 Intuition

Ordinary Lenia repeatedly creates or removes activation according to how closely a local
neighborhood matches a preferred density. Flow Lenia instead reads that response as a potential:
matter moves uphill in favorable affinity. When matter becomes dense, a pressure term pushes it away
from crowded regions. The complete mass distribution is moved and reintegrated; it is not incremented
or decremented.

An ecosystem appears when the rule weights are fields carried by that matter. Colliding material can
inherit one incoming rule vector, combine vectors, or choose a vector according to contextual
affinity. Local mutation creates new rule vectors. Differential persistence and spread can then be
measured without an explicit birth/death loop.

### 4.2 State and topology

For a square N × N torus:

- A_c(x) ≥ 0 is mass in channel c, with c in [0, C).
- H_k(x) is the localized weight of kernel k carried by matter.
- Q_k(x) is an optional localized negotiation/mixing weight.
- Z(x) is a packed identity record: a 64-bit genome fingerprint, lineage ID, and identity flags.
- E_c(x) is a static or slowly changing external affinity field.

Release defaults:

| Parameter | Default | Notes |
|---|---:|---|
| N | 256 desktop, 128 adaptive | Power of two |
| C | 3 | Renderable as RGB and consistent with ecosystem references |
| K | 9 | Three source-to-target connections per channel |
| dt | 0.2 | Reference-scale preset value |
| dd | 5 cells | Reintegration search radius |
| sigma | 0.65 cell | Uniform-square half-width |
| theta_A | 2.0 | Density-pressure scale |
| n | 2.0 | Density-pressure exponent |
| boundary | periodic | The only closed, verified release boundary |
| seed | explicit u32 pair | Controls initialization, mixing, and mutation |

Every shipped preset records all values. “Reference” presets preserve values from a cited source;
curated presets identify their Bit-Physics authoring origin.

### 4.3 Kernel perception

Kernel k reads source channel s(k), influences target channel t(k), and is a normalized radial
mixture of three rings:

K_k(r) = S(r) Σ_j b_kj exp(-(r - a_kj)² / w_kj), then K_k ← K_k / Σ_x K_k(x).

S smoothly suppresses the kernel outside its nominal radius. Kernel radius, relative radius, ring
locations a, widths w, and amplitudes b are global preset parameters. The exact reference formula,
cutoff, centering, and discrete normalization must be frozen in the CPU oracle before GPU work.

Perception and growth are:

U_k(x) = K_k ∗ A_s(k)(x)

I_k(x) = 2 exp[-0.5 ((U_k(x) - m_k) / s_k)²] - 1.

The target-channel affinity is:

V_c(x) = Σ over k where t(k)=c of H_k(x) I_k(x) + E_c(x).

For organism mode, H_k is a global constant and no genome buffers are needed. Ecosystem mode makes
H local and advected.

### 4.4 Pressure and flow

Let rho(x) = Σ_c A_c(x). The crowding gate and flow are:

alpha_c(x) = clamp((A_c(x) / theta_A)^n, 0, 1)

F_c(x) = (1 - alpha_c(x)) grad V_c(x) - alpha_c(x) grad rho(x).

The first term follows affinity. The second moves dense material down the total-density gradient.
The faithful reference uses the same Sobel gradient convention and boundary wrapping as the official
code. A central-difference comparison may exist as a labeled experiment because the landed Taichi
primitive uses it, but it is not the reference default.

Displacement is dt F_c, component-clamped so that every source distribution remains within the
declared dd gather neighborhood. The UI reports the fraction of cells hitting this clamp; a sustained
high clamp rate means the chosen timestep or field strength is invalid.

### 4.5 Conservative reintegration

Each source cell p and channel c becomes a uniform axis-aligned square centered at
p + dt F_c(p), with half-width sigma. For a destination cell q, let W(q, p, c) be the exact overlap
area between that square and q’s unit cell, divided by 4 sigma²:

A'_c(q) = Σ_p A_c(p) W(q, p, c).

On the torus, all overlap pieces are wrapped and:

- W is non-negative;
- Σ_q W(q, p, c) = 1 for every source;
- therefore Σ_q,c A'_c(q) = Σ_p,c A_c(p), to floating-point accumulation error;
- non-negative input remains non-negative;
- zero displacement is the identity only for the reference sigma/cell geometry whose overlap is
  frozen by the oracle. General sigma may introduce controlled numerical diffusion even at zero
  flow.

The browser implements destination gather, not source scatter. Each destination examines the fixed
(2dd + 1)² source neighborhood and sums contributions in a stable order. This matches the analytical
model, needs no float atomics, and makes reproducibility tractable.

Never substitute backward semi-Lagrangian advection in reference mode: it is convenient and smooth
but not mass conservative. A point-distribution bilinear splat may later be offered as a separately
named fast transport comparison, never as “the same” solver.

### 4.6 Localized inheritance

For destination q, the mass arriving from source p is:

M(p → q) = Σ_c A_c(p) W(q, p, c).

The genome mixer chooses or combines H, Q, and Z from candidates with M > 0:

| Rule | Definition | Expected character |
|---|---|---|
| None / fixed | Global H; no local genome | Faithful organism laboratory |
| Mass-weighted average | H' = Σ M H / Σ M | Smooth diffuse blends; destroys discrete identity |
| Whole-genome stochastic | Select one source with probability M / Σ M | Maintains coherent inherited vectors |
| Gene-wise stochastic | Select each component independently by mass | Recombines traits and can sustain variation |
| Dot / best affinity | Select highest contextual score with stable tie break | Deterministic competitive selection |
| Negotiation | Sample from softmax of beta M S, where S = Σ_k I_k Q_k | Context-sensitive inheritance used by the recent ecosystem study |

Stochastic rules use stateless counter-based hashing keyed by seed, step, destination, candidate, and
gene. They are repeatable for a fixed adapter and configuration; they do not depend on scheduling.
Ordinary mass-proportional sampling uses a streaming weighted reservoir. Negotiation uses streaming
Gumbel-max over its logits, avoiding a candidate array and an explicit softmax normalization.

The gather pass must not materialize 121 candidate genomes per destination. It streams candidates:

- weighted averaging accumulates moments;
- deterministic selection keeps best score and source index;
- stochastic selection uses weighted reservoir sampling;
- gene-wise selection maintains one reservoir per gene;
- negotiation computes the candidate logit and updates a Gumbel-max winner on the fly.

Genome buffers are fetched only after overlap mass is known to be positive.

### 4.7 Mutation and lineage

Mutation is an event, not per-cell white noise:

1. a pointer brush, scheduled event, or low-rate ecological trigger selects a contiguous patch of
   matter;
2. one deterministic Gaussian delta is applied to selected H and/or Q components with bounded
   parameter transforms;
3. the patch receives one new lineage ID derived from parent ID, event index, and seed;
4. the event is appended to a bounded lineage ring with parent, child, time, centroid, mass, and
   parameter delta.

This preserves visible lineages. Independently mutating every cell would make nearly every floating
vector unique and render “species count” meaningless.

Selection-based rules copy genome fingerprint and lineage. Gene-wise recombination hashes the chosen
gene-parent identities into a new genome fingerprint and marks ancestry as mixed. Weighted averaging
bit-hashes the resulting H/Q vector and uses a mixed-lineage sentinel; exact-genome activity is
disabled by default because almost every blended cell can become unique. Mutation creates both a new
fingerprint and lineage event.

For visualization, a selection lineage is exact by ID. A genome fingerprint is a reproducible
64-bit proxy whose collision risk is reported, while verification can compare the complete H/Q bits.
A phenotype cluster is a quantized distance bin in H/Q space. None is automatically a biological
species. The UI labels all definitions.

### 4.8 Open-system extensions

The verified core is closed and conserves matter. These optional actions make it open:

- add/remove mass brush;
- decay;
- food/resource conversion;
- absorbing boundaries;
- scripted source/sink fields.

Every open-system step writes an explicit mass ledger:

mass_after = mass_before + user_added - user_removed + resource_converted - decay - absorbed.

A closed “pipette” brush should be the default sculpting tool: it transfers mass from a donor ring to
the pointer center rather than creating mass. Food is a post-release extension. If implemented, it
must track organism mass, resource mass, and combined matter separately.

## 5. Product modes and scope

### 5.1 Release modes

1. **Organism Lab** — global parameters, no genomes. The simplest faithful full Flow Lenia solver.
2. **Ecosystem Lab** — localized H/Q, lineage, selectable mixing, mutation, and ecosystem metrics.
3. **Arena Lab** — Ecosystem Lab plus editable affinity walls, corridors, islands, and scripted
   perturbations.
4. **Compare Lab** — two synchronized views share initial state and seed but differ by one model
   parameter, such as pressure, mixing rule, sigma, or mutation.

Organism Lab is both the onboarding path and the numerical reference surface. Ecosystem mechanics
cannot block shipping or validating the base solver.

### 5.2 Release exclusions

Do not put these in the initial critical path:

- online IMGEP, MAP-Elites, or population-scale evolutionary search;
- differentiable optimization;
- food/resource metabolism;
- hard no-flux walls;
- fluid/Navier–Stokes coupling;
- arbitrary imported shader code;
- claims of open-ended evolution;
- mobile 256² guarantees;
- bit-identical behavior across different GPU vendors.

They remain explicit stretch tracks after the core gate is green.

## 6. Interactive mechanics

### 6.1 Pointer tools

| Tool | Direct effect | Conservation |
|---|---|---|
| Pipette / move | Draw from an annulus and deposit under brush | Closed |
| Add matter | Paint chosen channel or sampled organism | Open; ledgered |
| Erase matter | Remove proportional channel mass | Open; ledgered |
| Stir | Add a temporary external affinity dipole or displacement impulse | Closed after impulse |
| Mutate | Create one mutation patch and lineage event | Mass closed |
| Sample | Inspect local A, V, F, H, Q, lineage, and neighborhood response | Read only |
| Clone | Copy selected patch to another position, subtracting source by default | Closed by default |
| Soft wall | Paint negative affinity environment | Mass closed |
| Affinity paint | Paint attractive/repulsive scalar environment | Mass closed |
| Track | Lock camera and graphs to a selected lineage or connected mass component | Read only |

Pointer semantics must remain stable: primary applies, secondary reverses/removes, wheel changes
radius, Shift changes strength, and Alt samples where possible. Touch exposes a radial tool selector.

### 6.2 Environment mechanics

- soft circular and polygonal obstacles;
- maze and corridor stamps;
- founder islands separated by editable passages;
- radial, linear, checker, noise, and image-derived affinity fields;
- slowly rotating or translating attractors;
- a “storm” pulse that perturbs affinity without changing mass;
- periodic gates that connect and isolate populations;
- optional per-channel environment response;
- torus seam preview so users understand wraparound.

Soft walls are negative affinity, not hard collision geometry. Label them accordingly. Hard walls
require reflected or locally renormalized Reintegration Tracking and their own conservation proof.

### 6.3 Experiment cards

Every card loads a preset, a camera, an optional event timeline, and success metrics:

1. **Affinity swimmer** — a solitary translating body; inspect flow and pressure.
2. **Spinner collision** — counter-rotating organisms collide and recover or merge.
3. **Dividing droplets** — fragmentation and regrowth without implicit biological claims.
4. **Three founders** — three lineages meet under each mixing rule.
5. **Negotiation sea** — mutation pulses and contextual inheritance.
6. **Corridor divergence** — isolated founders reconnect after a timed gate.
7. **Maze navigation** — moving affinity source beyond soft walls.
8. **Storm recovery** — standardized perturbation with time-to-recover graph.
9. **Pressure ablation** — synchronized comparison with alpha pressure on/off.
10. **Sigma phase** — particle-like to field-like reintegration sweep.
11. **Identity dilution test** — average versus gene-wise versus negotiation mixing.
12. **Expansion trap** — demonstrates why occupied area alone is not evolutionary progress.

At least six cards must ship with authored, stable seeds. Research-derived presets need source,
license, parameter transformation, and expected-behavior notes.

### 6.4 Time, camera, and sharing

- pause, single step, 0.25× to maximum stable steps/frame;
- 2D pan/zoom, follow lineage, reset, and fit occupied mass;
- optional torus ghost copies near seams;
- render-only trails with adjustable persistence;
- a sparse rewind ring using compressed CPU checkpoints at low cadence;
- URL-encoded preset/seed/tool state when compact;
- binary or JSON experiment export/import;
- image export with a human-readable metadata sidecar.

Encoding a complete state inside a PNG, inspired by Particle Lenia, is a stretch goal after the
basic state format is versioned.

## 7. Visual system

### 7.1 Required render modes

1. **Organism glow** — density drives opacity/luminance; channel mixture drives hue.
2. **Lineage color** — stable lineage ID hashes to a perceptually spaced hue; density controls
   luminance and alpha.
3. **Phenotype color** — a projection of H/Q into color, with a legend and warning that nearby color
   is only an approximate parameter relationship.
4. **Channels** — direct RGB visualization of three mass channels.
5. **Affinity** — signed diverging map of V_c with isolines.
6. **Flow** — vectors or short streamlets over density; arrow sampling adapts to zoom.
7. **Pressure** — alpha and grad rho overlay.
8. **Flux** — recently transported mass and clamp hot spots.
9. **Environment** — soft walls and external fields, independently adjustable.

The default combines lineage hue, density glow, subtle gradient-based relief, and low-persistence
flow trails. Lighting and bloom are render-only and must never feed the solver.

### 7.2 Visually expressive but honest effects

- gradient-normal relief and rim lighting;
- density-dependent emissive bloom;
- age/persistence tint from a render-only exponential field;
- mutation pulse rings and short lineage trails;
- velocity-aligned streaks;
- affinity contour animation;
- collision flashes based on incoming lineage diversity;
- split-screen ablations;
- selected-lineage silhouette and center-of-mass trail;
- kernel-ring inset and live response curve;
- magnifying lens that shows cells, mass distributions, and flow vectors.

All diagnostic modes must use fixed numeric legends. Artistic exposure, bloom, and trail controls
must not change metric computation.

### 7.3 Color identity

Lineage color is derived from a stable hash into OKLCH-like evenly separated hues, clamped to the
display gamut. Parent and child hues remain related by using a small deterministic hue offset for
mutations, but a separate outline pattern distinguishes exact IDs. Avoid red/green-only semantics.

## 8. Ecosystem instrumentation

### 8.1 Always available

- total, per-channel, added, removed, and converted mass;
- relative mass drift against the ledger;
- min/max density and NaN/non-finite count;
- maximum flow and displacement-clamp fraction;
- occupied fraction above a documented threshold;
- center-of-mass speed on the torus;
- active lineage count and top lineage mass;
- Shannon diversity over lineage mass;
- phenotype-cluster diversity;
- mutation and extinction event counts;
- frame time, simulation step time, and active quality tier.

### 8.2 Research diagnostics

- non-neutral evolutionary activity using the referenced mass-change definition;
- spatial multiscale entropy or matter-distribution descriptors;
- temporal novelty of downsampled density;
- recovery time and retained mass after a scripted disturbance;
- lineage transition graph;
- kernel response histograms;
- environment-region abundance for founder-island experiments.

MP4 or PNG compression complexity is an offline/export analysis because codec cost and browser
implementation differences make it unsuitable as a live scientific metric. The live entropy/novelty
proxies must not be labeled “compression complexity.”

Metrics are reduced on GPU and read back at a low cadence. No GPU-to-CPU synchronization is allowed
in the per-step hot loop.

## 9. WebGPU architecture

### 9.1 State layout

Use structure-of-arrays and ping-pong buffers:

- `mass[2]`: vec4f per cell; xyz are the three channels;
- `genomeH[2]`: three vec4f records per cell for nine H values;
- `genomeQ[2]`: three vec4f records per cell for nine Q values;
- `identity[2]`: vec4u per cell containing a two-u32 genome fingerprint, lineage ID, and flags;
- batched complex FFT ping/pong buffers;
- complex precomputed kernel spectra;
- kernel responses I;
- target affinity V;
- flow x/y packed by channel;
- environment fields;
- small reduction and event buffers.

The transport/mixing pipeline binds current and next mass, H, Q, and identity: eight storage buffers,
matching the portable per-stage floor used by this repository. Other pipelines use smaller,
purpose-specific explicit layouts. Organism mode allocates no per-cell genome buffers.

At 256², the complete ecosystem state plus FFT workspace should remain below a provisional 128 MiB
GPU-memory budget. The probe milestone must publish actual byte counts by buffer.

### 9.2 Per-step frame graph

1. Apply queued environment, closed-brush, open-source/sink, and mutation events at a fixed step
   boundary.
2. Pack the C mass channels into one batched complex FFT buffer.
3. Execute one batched forward 2D FFT across all C planes.
4. Multiply source spectra by each precomputed kernel spectrum, producing K planes.
5. Execute one batched inverse 2D FFT across all K planes.
6. Normalize, evaluate growth I_k, and reduce weighted target affinities V_c.
7. Compute Sobel gradients, density pressure, flow, and displacement clamp diagnostics.
8. Destination-gather Reintegration Tracking; simultaneously resolve genome mixing and lineage.
9. Apply post-transport mutation parameter bounds and open-system accounting.
10. Reduce diagnostics at their requested cadence.
11. Render from the newly completed state.

All work for the simulation step is encoded into one command encoder and normally one queue
submission. Rendering may share that encoder when the app structure permits.

### 9.3 FFT batching

A naive C=3, K=9 implementation would run three forward and nine inverse transforms independently.
At 256² and 16 one-dimensional Stockham stages per 2D transform, that is approximately 192 FFT
dispatches per simulation step.

Extend the shared FFT kernel with a batch/plane dimension so each stage processes every active plane:

- 16 dispatches for all forward source-channel planes;
- pointwise kernel expansion;
- 16 dispatches for all inverse kernel-response planes.

The core path is then approximately 32 FFT dispatches plus packing, spectral multiply, growth,
gradient, transport, and diagnostics. Cache kernel spectra and rebuild them only while paused or at
a deliberately throttled cadence. Radial kernels should have a nearly real spectrum after the
correct discrete center shift, but the reference path retains both components. A real-only spectrum
is allowed only after its imaginary residual and CPU–GPU error are gated.

Kernel shape, radius, m, and s remain global. Only H/Q are local in the initial ecosystem. Per-cell
kernel shapes would invalidate FFT convolution and are out of scope.

### 9.4 Reintegration optimization

The faithful gather examines 121 candidates per destination at dd=5. Optimize without changing the
sum:

- wrap coordinates with integer arithmetic and a power-of-two mask;
- compute overlap mass before loading genome data;
- branch out when overlap is exactly zero;
- keep candidate reduction order fixed;
- tile only source mass in portable workgroup memory;
- leave flow in global memory if a mass+flow halo would exceed the 16 KiB portable workgroup floor;
- use an 8×8 destination tile and benchmark 16×4 and 8×16 alternatives;
- pack channels in vec4;
- use f32 fused arithmetic consistently and document compiler sensitivity;
- specialize pipelines for organism mode, averaged genome, stochastic genome, and negotiation rather
  than placing every rule in one branch-heavy shader.

Do not use floating-point atomic scatter. [WGSL atomic types](https://www.w3.org/TR/WGSL/#atomic-types)
are portable only for i32/u32. A later fixed-point u32 point-splat variant may reuse the Physarum
pattern, but it changes the transport distribution and adds quantization.

### 9.5 Scheduler and precision

- Solver state, FFT, transport, and metrics use f32.
- f16 may be used only for optional render intermediates after image comparison.
- Fixed simulation dt never changes to hide a slow frame.
- The scheduler performs an integer number of simulation steps and may hold/interpolate rendering.
- No readback, `mapAsync`, pipeline creation, buffer allocation, or kernel-spectrum rebuild occurs
  in the hot step.
- Static parameter changes are coalesced and applied at a step boundary.
- A hidden developer overlay reports dispatch count, allocated bytes, readbacks, and timing.

### 9.6 Performance tiers and go/no-go budgets

These are design budgets to measure, not current performance claims:

| Tier | Configuration | Product target |
|---|---|---|
| Adaptive | 128², C=3, K=9, faithful gather | p95 step ≤ 16.7 ms on reference desktop; usable ≥30 steps/s on representative integrated GPU |
| Desktop | 256², C=3, K=9, faithful gather | p95 step ≤ 33.3 ms; GPU memory <128 MiB |
| Cinematic | 512² or expensive overlays | Explicit slow/record mode; no real-time promise |

Use timestamp queries when supported and a portable queue-completion benchmark otherwise. Publish
reference browser, OS, adapter, resolution, mode, and warm-up. If the 256² target fails, default to
128² rather than silently switching to a non-conservative solver.

### 9.7 Proposed browser package map

Keep model, presentation, and verification separable:

| Path under packages/flow-lenia/web/src | Responsibility |
|---|---|
| main.ts / app.ts | Lifecycle, device selection, fixed-step scheduler, panel wiring |
| model/config.ts | Versioned configuration schema, validation, safe bounds, preset migration |
| model/solver.ts | Resource ownership and the per-step command graph |
| model/fft-batch.ts | Batched wrapper around the shared Stockham core |
| model/kernels.ts | CPU kernel construction, normalization, spectrum cache and provenance |
| shaders/perceive.wgsl | Pack, spectral multiply, normalize, growth and affinity |
| shaders/flow.wgsl | Sobel gradient, pressure, flow and clamp diagnostics |
| shaders/reintegrate-*.wgsl | Specialized organism and inheritance gather pipelines |
| shaders/events.wgsl | Brushes, mutation patches and environment events |
| metrics/reduce.ts | GPU reductions, low-cadence readback and ledger reconciliation |
| render/renderer.ts | Scientific and artistic render modes; no solver writes |
| render/overlays.ts | Flow, contours, lineage, inspector, graphs and legends |
| presets/ | Authored/reference presets plus source and license metadata |
| experiments/ | Cards, timelines, expected metrics and explanatory copy |
| capture.ts | Standard capture hook, schema versioning, export/import |
| prove.ts | Live invariants, canonical comparison and developer diagnostics |

The configuration has four explicit namespaces: model, ecosystem, environment, and render. Render
configuration is excluded from the scientific state hash. Every serialized experiment stores its
schema version, seed, fixed step, open-system ledger, and preset provenance.

## 10. CPU reference and verification

### 10.1 Reference implementation

Add a new f64 reference beside, not inside, the existing simplified behavior:

- `flow_lenia/ecosystem_config.py`;
- `flow_lenia/ecosystem_reference.py`;
- direct periodic convolution for small grids;
- exact ring kernel/growth/Sobel/pressure equations;
- destination-gather square Reintegration Tracking;
- deterministic localized mixing and mutation;
- small JSON golden fixtures.

Keep the existing `FlowLeniaSim`, invariants, capture, and performance ledger valid. The new API and
capture schema use a distinct name such as `flow-lenia-ecosystem-v1`.

### 10.2 Independent anchors

At minimum:

1. discrete kernel sums to one and matches frozen radial samples;
2. growth is exactly 1 at U=m and matches hand-computed off-center values;
3. uniform affinity and density produce zero flow;
4. a hand-derived pressure-gradient case has the expected direction and magnitude;
5. one translated square has analytically known four/nine-cell overlap weights;
6. closed torus transport conserves total and per-channel mass to honest f64/f32 tolerances;
7. non-negative mass remains non-negative;
8. a constant incoming genome remains constant under every mixing rule;
9. selection rules return only valid incoming genomes where their definition requires it;
10. fixed seed/event mutation produces the frozen child lineage and parameter delta.

### 10.3 Property tests

Generate bounded random grids, flows, sigma, kernels, channels, and candidate genomes:

- mass ledger closes;
- per-channel transport mass closes;
- no negative or non-finite mass;
- overlap weights are non-negative and source-normalized;
- torus translation equivariance;
- zero-field flow;
- no-mutation lineage IDs come only from incoming candidates;
- weighted-average genomes remain in the componentwise incoming convex hull;
- stochastic samplers are repeatable for the same seed;
- displacement never exceeds dd-sigma after clamp.

Tolerance is derived from operation count and measured residual distribution. It may not be widened
to absorb a systematic drift.

### 10.4 CPU–GPU gates

Use two complementary gates:

**Short-horizon numerical gate**

- 32² or 64²;
- reference and at least three adversarial fixtures;
- compare kernel response, affinity, flow, one transport step, and a short rollout;
- component-specific absolute/relative tolerances;
- save the first divergent intermediate on failure.

**Long-horizon structural gate**

- 128², C=3, K=9;
- 256–1,024 steps depending on CI budget;
- require no non-finite/negative values, a closed mass ledger, bounded clamp rate, valid lineage mass,
  and reproducible same-adapter metrics;
- compare structural summaries rather than pointwise equality after chaotic divergence.

The reference-mode solver uses no atomics and stateless random hashing. Same-browser, same-adapter,
same-configuration runs are expected to be byte-identical, but that claim must be measured before it
is registered. Cross-vendor bit identity is not claimed.

### 10.5 Falsification controls

Developer-only comparisons should intentionally demonstrate:

- backward advection loses/gains mass;
- removing pressure causes high-density collapse or clamp saturation in selected presets;
- weighted averaging dilutes discrete identity faster than stochastic/negotiation rules in the
  documented test;
- disabling mutation prevents new lineage IDs;
- an unnormalized kernel changes response magnitude;
- an open brush changes mass exactly by its ledger entry.

These are diagnostics, not permanent public novelty toggles.

### 10.6 Capture and public PROVE surface

- expose the standard capture hook and `window.__bitPhysicsReady`;
- commit one organism and one ecosystem canonical reference;
- include state/config schema version, seed, adapter, shader hash, mode, and open-system ledger;
- run a small live verification on the visitor’s GPU;
- show mass drift, non-negativity, short-horizon reference residual, determinism status, and model
  variant in a compact PROVE panel;
- never hide a failed invariant behind an attractive image.

## 11. UI information architecture

### 11.1 Primary controls

- preset and experiment card;
- play/pause/step/speed;
- tool, radius, and strength;
- render mode, exposure, trails, and overlays;
- Organism/Ecosystem/Arena/Compare mode;
- mixing rule and mutation enable;
- reset exact seed and randomize seed.

### 11.2 Advanced controls

Group by causal role:

- **Perception:** radius, ring shape, source/target connections;
- **Response:** m, s, H;
- **Flow:** dt, pressure theta/n, displacement clamp;
- **Transport:** sigma, dd, boundary;
- **Inheritance:** rule, beta, Q, mutation rate/scale/patch;
- **Environment:** channel response, wall/field strength;
- **Quality:** resolution, steps/frame, metric cadence.

Unsafe combinations display a specific warning such as “12.4% of cells are displacement-clamped;
reduce dt or affinity strength,” not a generic unstable label.

### 11.3 Inspection

The inspect lens shows:

- channel mass and total density;
- affinity and pressure contribution;
- flow direction, magnitude, and clamped displacement;
- lineage/phenotype identity and parent event;
- H/Q bars;
- contributing kernel growth values;
- local incoming lineage mixture after the last step.

The kernel inspector displays the spatial rings, normalized spectrum, growth curve, and the sampled
cell’s location on that curve.

## 12. Milestones

### M0 — feasibility probe

- port/extend the shared FFT to batched planes;
- benchmark 128² and 256² with C=3/K=9;
- prototype faithful dd=5 gather at mass-only and full-genome bandwidth;
- inventory buffer bytes, storage bindings, dispatches, and browser limits;
- decide default resolution from measurements.

Exit: no unknown architectural blocker and a published benchmark note.

### M1 — full f64 scientific oracle

- freeze equations and reference presets;
- implement direct convolution, growth, Sobel pressure, exact reintegration;
- add anchors, property tests, and golden fixtures;
- add localized mixing and mutation tests without changing the old package.

Exit: reference suite green and independently reviewable.

### M2 — WebGPU Organism Lab

- batched FFT perception;
- growth, affinity, pressure, faithful gather;
- density/channels/affinity/flow renders;
- CPU–GPU short and structural gates;
- exact-seed reset and capture.

Exit: full published base model passes gates before ecosystem complexity is enabled.

**Implementation status:** complete. The browser ships the four required M2 scientific views,
exact-seed reset/capture, a low-cadence mass ledger, f64-derived intermediate and rollout checks,
two same-adapter 256-step structural replays, and a measured complete-step 256² performance gate.
See `m2-organism-validation.md` for the frozen tolerances and results.

### M3 — interaction and visual laboratory

- tools, camera, trails, inspector, kernel view;
- six stable organism/ablation cards;
- mass ledger and performance overlay;
- accessible touch/keyboard controls.

Exit: a new visitor can form, perturb, inspect, and reset a system without reading the paper.

**Implementation status:** complete. The browser schedules open and closed tools at fixed step
boundaries, reconciles add/erase with an explicit GPU ledger, preserves pipette/stir through the
faithful gather, and supplies camera/time controls, trails, contours, glyphs, pressure/flux views,
cell and kernel inspection, accessible input paths, and six authored organism/ablation cards. Two
cards run synchronized causal comparisons. The committed browser gate covers exact event replay,
all card rollouts, comparison divergence, product-surface mounting, and byte-exact render-only
integrity. See `m3-visual-laboratory-validation.md`.

### M4 — localized ecosystem

- H/Q and lineage state;
- averaging, whole-genome, gene-wise, best-affinity, and negotiation pipelines;
- patch mutation and lineage ring;
- lineage/phenotype render modes and core diversity metrics;
- three-founder and identity-dilution comparison cards.

Exit: ecosystem rules are reproducible, mass-conserving, and separately falsifiable.

**Implementation status:** complete. Ecosystem mode allocates packed H/Q and identity ping-pong
state only in its dedicated solver, compiles all five inheritance rules as gather specializations at
the portable eight-storage binding floor, and adds deterministic mutation patches, a bounded
lineage ring, exact-lineage and approximate-phenotype metrics/views, and three authored ecosystem
cards. The committed browser gate covers every rule against the f64 fixture, byte-exact
same-adapter replay, mutation identity and affected mass, card stability, identity-dilution
divergence, render-only integrity, the product surface, and the 256² memory/timing budgets. See
`m4-localized-ecosystem-validation.md`.

### M5 — Arena Lab

- soft walls, corridors, islands, affinity painting, timed gates;
- corridor-divergence, maze, storm-recovery cards;
- environment-region metrics and lineage graph;
- export/import versioned experiments.

Exit: long-horizon environmental experiments survive reload and canonical capture.

**Implementation status:** complete. Arena mode is an opt-in ecosystem specialization: authored
and GPU-painted scalar environments add per-channel affinity before the unchanged density-pressure
and finite-square transport path. It supplies labeled soft walls, timed gates, an orbiting
attractor, a scripted mass-neutral storm, three region maps, region-abundance/recovery histories,
and a bounded lineage transition graph. Complete-state JSON export carries packed mass, H/Q,
identity, environment, regions, dynamics, lineage history, fixed step, seed, ledger and provenance;
SHA-256 is verified before import, and the committed gate proves byte-exact restore plus continued
same-adapter evolution. See `m5-m6-arena-release-validation.md`.

### M6 — productization

- responsive panel and landing copy;
- poster/live/canonical assets;
- browser smoke, quality, performance, determinism, and integrity gates;
- add to the public site only after references and provenance are committed.

**Implementation status:** complete. The release has a responsive 128² adaptive/256² desktop
surface, keyboard/pointer/touch Arena tools, versioned canonical capture and shader hashes, authored
poster/live assets, honest browser-compatibility copy, a dedicated deploy verifier, and a public
catalogue card. Catalogue integration occurred only after the M0/M2/M3/M4/M6 gates, the standard
two-profile capture driver, and the assembled-site link audit were green.

## 13. Acceptance criteria

Release requires all of the following:

- the browser default is the full affinity/pressure/square-reintegration model, not the existing
  point-splat simplification;
- Organism Lab passes the f64–f32 numerical and long-horizon structural gates;
- a closed torus run keeps mass within its declared measured tolerance and never creates negative
  mass;
- open tools reconcile against the explicit mass ledger;
- same-adapter fixed-seed ecosystem runs satisfy the measured determinism claim;
- all five inheritance rules have unit/property coverage and visible rule labels;
- at least six organism and four ecosystem/arena experiment cards are stable;
- inspect, affinity, flow, lineage, channels, and density render modes work;
- no hot-loop readback or allocation is observed;
- adaptive 128² meets the published reference-device budget, or the measured default is revised in
  this specification;
- source, license, and transformation provenance exists for every non-original preset/asset;
- public copy makes no biological, chemical, medical, or open-ended-evolution guarantee;
- the existing Taichi package, old capture, tests, and `spec-frontier-flow.md` remain valid.

## 14. Risks and decisions

| Risk | Decision / mitigation |
|---|---|
| “Flow Lenia” name hides multiple incompatible implementations | Expose exact model variant; default to the published affinity/pressure/reintegration equations. |
| FFT dispatch or memory dominates | Batch planes per stage, cache real spectra, power-of-two tiers, one submission, benchmark at M0. |
| Reintegration gather is bandwidth heavy | Fixed dd, mass-first branch, specialized mixers, vec4 packing, portable mass tiling. |
| Browser has no float atomics | Faithful destination gather; no atomic scatter in reference mode. |
| Local genomes explode identity count | Event-level patch mutation plus stable lineage IDs and separately defined phenotype clusters. |
| Averaging erases discrete identity | Mark blended ancestry, disable misleading exact-genome activity by default, and make mixing a controlled comparison. |
| Chaotic divergence frustrates GPU comparison | Short numerical gates plus long structural invariants; no unjustified pointwise long-horizon tolerance. |
| Pretty effects contaminate science | Render-only effect buffers and explicit model-vs-render controls. |
| Obstacles break conservation | Ship soft affinity walls first; hard walls require a new proof and tests. |
| Expansion is mistaken for evolution | Show diversity, lineage, NNEA, environment, and ablations; state metric limitations. |
| Community code has incompatible licensing | Reimplement from papers/equations; record provenance; do not copy GPL shaders/code. |
| Research presets are fragile | Freeze exact versions and source notes; maintain authored fallback presets. |

## 15. Resolved implementation choices

- **Full model versus current primitive:** full model, with the primitive retained as an independent
  transport reference.
- **Transport:** finite uniform-square Reintegration Tracking by destination gather.
- **Convolution:** batched 2D Stockham FFT derived from the repository’s shared core.
- **Default topology:** periodic torus.
- **Default scale:** 256² desktop, frozen by the measured M0 result; 128² adaptive.
- **Channels/kernels:** C=3, K=9.
- **Localized parameters:** kernel weights H first; separate Q for negotiation; kernel shapes remain
  global.
- **Randomness:** stateless, seed-addressed GPU hashing.
- **Mutation:** contiguous event patches with explicit lineage.
- **Walls:** soft affinity fields in release; hard collision walls deferred.
- **Food:** deferred open-system extension.
- **Evolution search:** deferred offline/worker feature.
- **Visual identity:** lineage hue plus density light, with scientific overlays.
- **Scientific posture:** measurable artificial-life dynamics, not a biological simulator or proof
  of open-ended evolution.

## 16. Primary references

1. Plantec et al., [Flow-Lenia: Towards open-ended evolution in cellular automata through mass
   conservation and parameter localization](https://arxiv.org/abs/2212.07906), ALIFE 2022.
2. Plantec et al., [Flow-Lenia: Emergent Evolutionary Dynamics in Mass Conservative Continuous
   Cellular Automata](https://direct.mit.edu/artl/article/31/2/228/130572/Flow-Lenia-Emergent-Evolutionary-Dynamics-in-Mass),
   Artificial Life 31(2), 2025.
3. [Official Flow Lenia implementation](https://github.com/erwanplantec/FlowLenia).
4. Moroz, [Reintegration Tracking](https://michaelmoroz.github.io/Reintegration-Tracking/).
5. Etcheverry et al., [Exploring Flow Lenia Universes](https://arxiv.org/html/2505.15998), current
   version consulted July 2026.
6. [Exploring-Flowlenia implementation](https://github.com/Thomick/Exploring-Flowlenia).
7. Chan, [Lenia and Expanded Universe](https://direct.mit.edu/isal/article/doi/10.1162/isal_a_00297/98400/Lenia-and-Expanded-Universe).
8. Hamon et al., [Discovering Sensorimotor Agency in Cellular Automata using Diversity Search](https://arxiv.org/abs/2402.10236).
9. Faldor et al., [CAX: Cellular Automata Accelerated in JAX](https://arxiv.org/abs/2410.02651).
10. [WebGPU specification limits](https://www.w3.org/TR/webgpu/#limits) and
    [WGSL atomic types](https://www.w3.org/TR/WGSL/#atomic-types).

Research conclusions in this document describe the cited configurations and implementations as of
the date above. They are design evidence, not a claim that every behavior generalizes to all Flow
Lenia parameter regimes.
