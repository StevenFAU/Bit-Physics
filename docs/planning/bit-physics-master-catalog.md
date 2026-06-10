# Bit-Physics Master Catalog v2.0

## A Standalone Survey of GPU-Simulation Phenomena, Frontier Industry Tooling, Composition Affinities, Three-Tier Accessibility, and Phase 6+ Integration

> **⚠ SUPERSEDED BASELINE (banner added 2026-06-10, post-phase-5 housekeeping — no line edits below this banner).** This May-2026 draft predates the Phase-4 and Phase-5 closes, and its assumed "Phase 5 complete" baseline diverges from the landed repo in both directions: it lists sims as existing that were never built (e.g. FEM elastodynamics § 10.6.1, XPBD rigid bodies § 10.6.3, N-body Barnes-Hut, PIC electrostatic), misstates stacks for several landed sims (SPH, LBM, eulerian-smoke, cloth, RD-2D, boids), flags landed work as future (§ 21.4.6 physarum, § 21.4.8 Lenia family), and omits ~16 landed packages (incl. neural-ca, pinn-poisson, the five `-diff` variants, mandelbulb-explorer, strange-attractors, articulated-pedagogical). Its § 7.1 tier-directory layout also contradicts the ratified flat `packages/<sim>/` convention. **Do not use this document as a repo inventory.** The landed baseline is: `packages/` on disk + `docs/phase4/ledger.md` + the audit ledger (`docs/_audits/`, phase-5 close audit). The catalog's survey/composition content (its actual purpose) remains useful as-is; a content revision is a Phase-6 decision.
> **Project.** Bit-Physics simulation portfolio (`StevenFAU/Bit-Physics`).
> **Status.** Draft v2.0, prepared May 2026 for consideration at Phase 6+.
> **Posture.** This is a planning artifact, not a phase plan. It does not amend `docs/architecture.md`. It does not commit Phase 6 execution. It collects the design space of what could be built, what frontier industry and research are already building, and how each piece would integrate with the existing repo at the assumed implementation point — **Phase 5 complete**.
> **Reading guide is at the top, after the TOC.** Skip end-to-end reading. Most readers want one family or one composition at a time.

---

## Table of contents

**Reading guide**

**Part I — Framing**

1. Purpose, history, and self-contained posture
2. Phase 5 baseline — what exists when this catalog is considered
3. Industry-gap analysis — where research is, what's being asked for, what's frontier
4. The three-tier accessibility model
5. The composition framework
6. Tier-assignment methodology
7. Integration patterns with Bit-Physics — what the architecture has, what it would need
8. Phase 6+ relationship and decision posture

**Part II — Master Phenomenon Catalog**

9. Fluids and Flow
10. Solids, Structures, and Materials
11. Fracture, Damage, and Failure
12. Gravity and Astrophysics
13. Plasma, Particle-in-Cell, and Continuum MHD
14. Electromagnetism and Optics
15. Waves (acoustic, elastic, quantum, water)
16. Heat Transfer and Phase Change
17. Chemistry, Molecular Dynamics, and Matter
18. Life, Biology, and Cardiac Electrophysiology
19. Earth, Atmosphere, and Climate
20. Radiation Transport
21. Social, Agents, Networks, Traffic
22. Quantum, DFT, and Tensor Networks
23. Robotics, Control, and Digital Twins
24. Materials Informatics and Machine-Learning Interatomic Potentials
25. Energy Systems (Power Grid, Wind, Fusion Engineering)
26. Hypersonic and High-Speed Flight

**Part III — Composition Affinity Map**

27. Composition framework: coupling, time-stepping, stability, verification
28. Two-sim compositions (catalog with full detail)
29. Three-sim compositions (catalog with full detail)
30. Four- and five-sim signature compositions
31. Six-plus sim flagship compositions
32. Composition-to-research-domain mapping
33. Composition-to-product-mode mapping (research, gallery, games, packages)

**Part IV — Implementation Roadmap from Phase 5**

34. Build-sequence rationale assuming Phase 5 baseline
35. Priority ordering across all phenomena
36. First-composition candidates
37. Common-module promotion gates
38. Open decisions and unresolved questions

**Part V — Testing, Verification, and Quality at Scale**

39. Inherited testing posture (recap from spec)
40. Why testing-at-scale needs its own treatment
41. Tiered CI pipeline strategy (with naming correction)
42. Per-sim testing — beyond the 13 gates
43. Per-composition testing — verification by parts in practice
44. Cross-cutting tests — matched-pair, cross-stack, cross-tier
45. CI strategy at scale
46. AI-agent-driven testing and debugging
47. Audit-replay as the universal scaling primitive
48. Performance regression as a first-class testing surface
49. Test-debt and verification-debt prevention
50. Suggestions — additional testing surfaces worth considering

**Part VI — Logistics and Coordination at Scale**

51. Why logistics deserves its own treatment
52. Decomposition — how independent work units stay non-overlapping
53. Industry coordination patterns for multi-agent software engineering
54. Open standards and avoiding lock-in (MCP, A2A)
55. Concrete patterns mapped to Bit-Physics
56. Conflict resolution at sub-charter boundaries
57. Documentation hygiene at scale
58. Security and write boundaries
59. Audit-replay extension to multi-agent runs
60. Honest forward look — what changes in 12-18 months

**Part VII — Front-End Surfaces**

61. Surface map — five distributions × four product modes
62. Surface 1 — Website (portal, per-sim, per-composition, methodology, embed)
63. Surface 2 — Desktop binary (interactive + headless CLI)
64. Surface 3 — Python package (CLI + library + Jupyter)
65. Surface 4 — Render outputs (hero shots, figures, social media)
66. Surface 5 — Preprint outputs
67. Cross-surface conventions

**Appendices**

- **A.** Master reference list, organized per family (~350 entries)
- **B.** Phenomenon-to-tier-to-stack crosswalk
- **C.** Composition-to-component crosswalk
- **D.** Production-code inventory across all families
- **E.** Industry / research-frontier gap matrix
- **F.** Phase 5 sim baseline (what exists vs. what's added)
- **G.** Glossary
- **H.** Per-family testing surface checklists (paired with Part V)

---

## Reading guide

This is a long document. It's structured for partial reading and for use as reference rather than narrative.

| Reader | Path | Word count |
|---|---|---|
| Owner reviewing future direction | Reading guide → Part I §§1-3, 7-8 → Part III headers + flagship § 31 → Part IV → Appendix E | ~12,000 |
| Sub-charter author for a specific field | Part II family section in full → Part III entries that include that family → Appendix B row | ~5,000 per field |
| Reader trying to understand portfolio scope | Reading guide → Part I §§1-6 → any Part II family of interest | ~7,000 |
| Looking for one specific phenomenon or composition | Use TOC to jump; each entry is self-contained | ~500-1,500 per entry |
| Industry/research analyst | Part I §§3, 7 → Appendix D → Appendix E | ~6,000 |

When in doubt, this document is meant to be **queried**, not read end-to-end. Treat it as a structured catalog with editorial framing.

Status flags used inside Part II entries:

- ✅ **Exists at Phase 5** — already implemented in the Bit-Physics portfolio.
- 🔧 **Implied by Phase 5 stack** — not a sim, but capability provided by the productization pipelines or common modules.
- 🆕 **Catalogued for Phase 6+** — first appearance in this catalog as a candidate.
- 📋 **Charter-listed** — was in the original adjacent-fields charter; promoted here with full detail.

Judgment calls (tier assignments, priority orderings, composition recipes) are flagged **`JUDGMENT`** throughout.

---

# Part I — Framing

## 1. Purpose, history, and self-contained posture

### 1.1 What this document replaces

The Bit-Physics portfolio has, prior to this document, been planned in three artifacts: the architecture spec (`docs/architecture.md` v2.4), the phase plans (Phases 0-5 with Phase 6+ as a rolling charter), and the previous adjacent-fields charter that surveyed 15 unaddressed fields. The adjacent-fields charter was a planning artifact — useful, ~21,000 words, but it surveyed only fields *not* yet in the portfolio. Sub-phenomena within those fields, frontier industry tooling at scale, and the composition layer (how individual sims combine into more complex simulators) were all underdeveloped.

This document, v2.0, supersedes the adjacent-fields charter and the earlier v1.0 of this catalog. It is self-contained — nothing else needs to be read alongside it. It folds in:

- The complete content of the adjacent-fields charter as Part II family entries.
- The ~150 phenomena from v1.0 with substantially expanded detail.
- ~20 additional phenomena identified in the second-pass research for v2.0, with frontier citations from 2024-2026.
- The composition layer from v1.0, with each composition entry expanded from a single paragraph to a structured multi-paragraph entry covering constituents, coupling, production codes, frontier references, repo integration, verification, and applications.
- New framing on industry context — where research is heading, what industry asks for, where the gaps are, what is genuinely frontier in 2024-2026.
- New framing on Phase 5 baseline — what is assumed to exist in the portfolio at the moment this document is considered for implementation.

### 1.2 What this document is not

- **Not a phase plan.** No execution dispatch is made. Implementation begins through Phase 6+ sub-charters that draw from this document.
- **Not a replacement for the spec.** The architecture (v2.4) stands; this catalog assumes that substrate and integrates against it.
- **Not exhaustive.** "Simulation" has a fuzzy boundary; this document errs toward inclusion but does not claim to cover every GPU-resident computation. Explicit out-of-scope: pure ML training workloads as such (covered only when they couple to a physical simulator); computer-graphics rendering not anchored on a physical simulator; general discrete-event simulation outside the operations-research overlap in § 21; sims that are best served by symbolic math rather than numerical execution.
- **Not a polished public artifact.** This is internal planning. Per-family sub-documents can be extracted for the public website later.
- **Not a fixed list.** Frontier fields evolve; SIGGRAPH, AAAI, NeurIPS, JCP, JCP-X, Comput. Phys. Commun., npj Comp Mater, J Comp Phys, Phys Plasmas, A&A, etc. all publish quarterly. This document captures a May 2026 snapshot.

### 1.3 Scope numbers (v2.0)

- ~170 phenomena distributed across 18 families.
- ~95 composition entries across 4 complexity levels.
- ~350 citations in Appendix A.
- 3-tier mapping for every phenomenon.
- Coverage of every continuous field equation in mainstream GPU simulation circa 2026, plus the principal discrete and agent-based modeling families.

The catalog is a decade-horizon planning artifact. Most phenomena will not be implemented in the project's lifetime. The purpose is to make the *space of possibilities* legible so that selection becomes a judgment call rather than a discovery exercise.

## 2. Phase 5 baseline — what exists when this catalog is considered

This catalog is written under the assumption that **Phase 5 productization is complete** when its contents are first considered for implementation. The Phase 5 plan (`docs/phases/phase-5-productization.md`) ships five productization pipelines: web deploy (sub-phase 5.1 — Stack B sims), binary release (5.2 — Stack C), PyPI release (5.3 — Stack D and E), render passes (5.4 — canonical render-extraction), and preprint extraction (5.5 — canonical academic preprint). Phase 5 ships pipelines, not exhaustive coverage; the pipelines fan out automatically to qualifying sims.

### 2.1 The Phase 5 sim portfolio (assumed baseline)

By Phase 5 completion, the portfolio contains a small but production-quality set of sims that have shipped through some or all of the five productization streams. The exact roster depends on Phase 0-4 execution; the inference from the architecture, phase plans, and visible work-unit specifications is approximately:

**Layer 4-7 reference sims (Stack-cross-cutting, Phase 4-5):**
- **Reaction-diffusion 2D** — the canonical Layer 4 reference sim. Lives in every stack (A-E or A-F depending on Phase 4 outcome). Used as the verification anchor for cross-stack equivalence.
- **Ising classical** (added per spec v4 amendment as task 3.7) — Stack B, quantum-adjacent classification.
- **SPH single-phase fluid** — Stack C primary (vendored SPlisHSPlasH-port), Stack E secondary; matched-pair gates between tiers.
- **MPM (material point method)** — Stack E primary, with elasto-plastic constitutive law; Stack D variant for differentiability.
- **Eulerian smoke** — Stack B and Stack C/E; vorticity-confinement and incompressible projection.
- **Lattice Boltzmann method** — Stack B (D2Q9 reference), Stack E (D3Q19 production), Stack F if Phase 6 Stack F adoption banked.
- **FEM elastodynamics** — Stack E (Newton-backed), with linear and St-Venant Kirchhoff variants.
- **Mass-spring cloth** — Stack B and Stack E with XPBD constraint projection.
- **XPBD rigid bodies** — Stack B and Stack E; Newton-backed in Stack E for industrial-scale contact.
- **Boids** — Stack B reference; differentiable variant in Stack D consuming WU-A.
- **N-body** — Barnes-Hut in Stack E; particle-mesh in Stack E if WU-A integration extends; possible differentiable PM via pmwd-style port consuming WU-A.
- **PIC electrostatic** — Stack E (Warp); WarpX-port for Tier 2.
- **3DGS reference** — Layer 7 frontier-variant from Phase 4 WU-C.

**Productization-pipeline qualifications (Phase 5 acceptance):**
- Web-deploy: every Stack B sim above with `productization.web: true` ships to `bit-physics.<domain>` via the web-deploy pipeline.
- Binary-release: every Stack C sim with installable CMake target ships via the binary-release pipeline (GitHub Releases or similar).
- PyPI-release: every Stack D/E sim with installable pyproject.toml ships to PyPI under the `bit-physics-` namespace.
- Render passes: one canonical sim has its render-pass pipeline shipped (the rest extends post-phase).
- Preprint extraction: one canonical sim has its academic preprint extracted via the pipeline (the rest extends post-phase).

**Capabilities provided by common modules (`common-warp`, `common-ts`, `common-py`, `common-cpp`):**
- Shared time-stepping primitives, RNG seeding, capture-format read/write, performance-ledger instrumentation.
- Differentiability (WU-A) is consumed by sims that have a differentiable variant.
- Sparse-domain (WU-B) consumed where applicable.
- Neural-rendered (WU-C) consumed by 3DGS-style sims.
- Newton integration (WU-D) consumed by elastica, contact, and structural sims.
- Learning hooks (WU-E) consumed by ML-closure variants.
- Cross-stack equivalence (WU-F) is the matched-pair gate for every sim at multiple tiers.
- Phase-ledger (WU-G) is administrative across the project.

**Verification posture at Phase 5:**
- The 13-gate per-sim acceptance is in place (per spec § 3.5).
- Cross-stack equivalence is enforced for every sim that ships at more than one tier.
- MMS (method of manufactured solutions) is the code-verification anchor.
- GCI (grid convergence index, Roy 2005) is the solution-verification anchor.
- Calculation validation against published reference data is anchored per spec § 6.4.
- Audit replay is deterministic across stacks for every sim.

### 2.2 What this means for v2.0 of this catalog

Every Part II entry assumes the above. When an entry says "shares the SPH foundation" or "consumes WU-A," that integration anchor exists and is production-quality by the time the entry would be implemented. The integration burden per new sim is therefore lower than it appears when reading in isolation — most of the heavy infrastructure work (testkit, integrity, common modules, productization pipelines, verification machinery) has already been done.

This is the principal change in posture between v1.0 of this catalog and v2.0. v1.0 treated the catalog as if the substrate were uncertain. v2.0 assumes the substrate is mature and asks: *given that the production pipeline works, what are the best next sims and compositions to ship through it?*

### 2.3 What Phase 5 does NOT provide

Phase 5 ships productization pipelines, not new sim categories. By Phase 5 the following are still future work and are the substantive scope of this catalog:

- New phenomenon families beyond the ~12 sims in the Phase 5 baseline.
- Composition layer — no composition (multi-sim coupled simulator) has been built before Phase 6+.
- Stack F (Rust / wgpu) full adoption past the Phase 3 banked decision.
- Stack G (Mojo) adoption, contingent on Mojo open-sourcing.
- Vendoring of upstream production codes for Tier 2 fidelity (Athena++, gPLUTO, openCARP, GROMACS, ASPECT, ISSM, Tidy3D, WarpX, etc.).
- Per-family common modules beyond the Phase 3 baseline (`common-spectral`, `common-fmm`, `common-em`, `common-elastica`, `common-adjoint`, `common-stochastic`, plus the new ones proposed below in § 7.4).

The bulk of the work catalogued in this document is exactly this gap: new sims, the composition layer, vendoring strategies for Tier 2, and the common-module promotions that compositions require.

## 3. Industry-gap analysis — where research is, what's being asked for, what's frontier

A planning catalog that's not anchored to where the field is going can become a museum of every solver method since the 1960s. The user asked for a deliberate frontier orientation. This section is that orientation, structured as a small set of high-conviction observations about what's happening in GPU simulation in 2024-2026, where the industry-research investment is concentrated, and where the genuine gaps are.

### 3.1 The five biggest shifts in GPU simulation, 2024-2026

**Shift 1 — Performance-portable astrophysical codes via Kokkos.** Five years ago, astrophysics GPU codes were single-vendor CUDA. As of 2024-2026, AthenaK (Stone et al., arXiv 2409.16053, 2024) — "By adopting Kokkos, the code can be run on virtually any hardware, including CPUs, GPUs from multiple vendors, and emerging ARM processors. AthenaK shows excellent performance and weak scaling, achieving over one billion cell updates per second for hydrodynamics in three-dimensions on a single NVIDIA Grace Hopper processor and with a typical parallel efficiency of 80% on 65536 AMD GPUs on the OLCF Frontier system" — has joined IDEFIX (Lesur 2023, PLUTO in Kokkos), AsterX (Sanches et al. CQG 42, 2025, GPU GRMHD for dynamical spacetimes), AthenaPK, KHARMA, Phoebus (all on the Parthenon framework, Grete et al. 2023) and most recently gPLUTO (Rossazza et al., arXiv 2511.20337, 2025) "a complete rewrite in C++ and leverages the OpenACC programming model" as performance-portable production codes. The implication for Bit-Physics: the Tier 2 astrophysics path is now mature enough to vendor and port to the project's stacks. Three years ago this would have been speculative; now it is engineering.

**Shift 2 — Machine-learning interatomic potentials (MLIPs) at production scale.** Until ~2022, MLIPs were a curiosity competing with classical force fields. As of 2024-2026, the Pareto frontier of accuracy vs. compute is held by equivariant message-passing neural networks: NequIP (Batzner et al., Nat. Commun. 13, 2022), Allegro (Musaelian et al.), MACE (Batatia et al., NeurIPS 2022) — "MACE supports CUDA acceleration with the cuEquivariance library." Foundation models (MACE-MP-0, GRACE, MatterSim, SevenNet, ORB) trained on databases like Materials Project, Alexandria Database, Open Materials 2024, and Open Molecules 2025 have begun providing ab initio accuracy on systems that classical force fields can't reach (Leimeroth et al., arXiv 2505.02503, 2025). The implication for Bit-Physics: MD as a category has a fast-evolving frontier far beyond LAMMPS-with-Lennard-Jones. A Tier 2 MD sim now means an MLIP-driven simulator with foundation-model fine-tuning workflows.

**Shift 3 — Differentiable simulation as a first-class architecture concern.** JAX-MD (Schoenholz & Cubuk, NeurIPS 2020), Brax (Freeman et al., NeurIPS 2021, currently maintained primarily as RL training library with MJX physics), PhiFlow, DiffTaichi, Mitsuba 3 (differentiable rendering at production scale; Jakob et al.), Tidy3D (differentiable FDTD), pmwd (differentiable PM N-body, Li et al. arXiv 2211.09958), all 2020+ but matured to production over 2024-2026. The implication for Bit-Physics: the WU-A autodiff capability is now infrastructure-axis, not novelty-axis. Every Tier 1+ sim in a research-grade family should expose a differentiable variant by default.

**Shift 4 — NVIDIA's robotics/digital-twin stack as a category in its own right.** Isaac Sim (released 2019, mature 2024-2026), Isaac Lab (announced March 2024 with Project GR00T, successor to Isaac Gym), MuJoCo Warp (Newton MuJoCo-Warp, 2024-2025), and MJX (MuJoCo XLA — JAX reimplementation, 2023-2025) plus the NVIDIA Cosmos generative world model (late 2024/early 2025). Industry has converged on PhysX-backed simulation + RTX rendering + USD scene description as the de facto stack for sim-to-real robotics. The implication for Bit-Physics: robotics is now a real Tier 2 category, not a graphics niche. Cosserat-rod hair (adj charter § 17) belongs to the same broader family as humanoid locomotion.

**Shift 5 — Sparse and neural volume representations.** OpenVDB (Academy-Award-winning, Museth et al. since 2013), NanoVDB (GPU-resident, 2020), NeuralVDB (Kim, Lee, Museth, arXiv 2208.04448, 2022) — "100x reduction in memory footprint for smoke, clouds and other sparse volumetric data" — and fVDB (NVIDIA's deep-learning framework for 3D spatial intelligence). The implication for Bit-Physics: any sim that generates large 3D volumes (smoke, RD-3D, MPM at scale, AM thermal at part scale) now has an obvious storage and rendering substrate. WU-C (3DGS reference) and a NanoVDB-style storage extension would be naturally complementary.

### 3.2 Where the industry-research investment is concentrated

Following the money and the citation graph in 2024-2026 identifies these high-growth subfields:

| Subfield | Investment driver | Anchor codes |
|---|---|---|
| MLIPs and foundation models for materials | Battery materials, catalysis, drug discovery substrate | MACE, NequIP, Allegro, GRACE, SevenNet, ORB, MatterSim |
| Cardiac digital twins | FDA-track clinical validation | openCARP, propeller-style ECG inverse pipelines |
| Wind farm modeling | Energy transition policy | OpenFAST, FastEddy, AVBP, GRASP, WRF coupling |
| Quantum circuit simulation via tensor networks | Hardware validation for NISQ era | DMRG / TEBD codes, cluster-TEBD (arXiv 2502.19289) |
| Robotics sim-to-real | Humanoid robotics, autonomous warehouse | Isaac Sim + Lab, MuJoCo + MJX + Warp |
| Generative world models for embodied AI | Foundation models extension to physical AI | NVIDIA Cosmos, neural simulators (NeRD) |
| GPU FEP for drug binding | Lead-optimization wall-clock collapse | GROMACS GPU FEP (2024-2025; ~800% speedup over 32-core CPU) |
| Performance-portable astrophysics | Exascale facility utilization (Frontier, Aurora) | AthenaK, IDEFIX, AsterX, AthenaPK, KHARMA |
| Differentiable rendering / inverse imaging | Photonics inverse design, transient imaging | Mitsuba 3, mitransient |
| Hypersonics CFD | National-security investment | CFD++, hy2Foam, Boltzmann-BGK GPU codes |
| Real-time wildfire simulation | Climate adaptation | PyTorchFire, WRF-Fire couplings |
| GPU power-grid EMT | Renewable integration / grid stability | ParaEMT (NREL), real-time HVDC simulators |

This concentration is informative for the catalog because it tells us where the *next sub-charters* should look for collaborators, vendoring opportunities, and publication-grade verification benchmarks.

### 3.3 The genuine gaps

Three observations about where the field is *not* served well, which the Bit-Physics portfolio could plausibly contribute:

**Gap 1 — Education-grade Tier 0 instances of frontier codes.** AthenaK is a billion-cell production code, but there is no in-browser Orszag-Tang demo built on the same algorithm. GROMACS GPU FEP is a clinical drug-discovery tool, but there is no didactic browser demo of alchemical free-energy sampling. Tidy3D is a multi-Gcells/s FDTD, but there is no public web sim of a Mie-scattering nanoparticle that uses the same numerical method. The matched-pair equivalence gate that Bit-Physics enforces between tiers is rare in the field. **Tier 0 sims that are matched-pair-equivalent to a frontier Tier 2 production code are a real public-good gap.**

**Gap 2 — Composition with audit posture.** Industry compositions (Solar Flare, AM, Habitable Coast) are typically published as single-paper monoliths with no path for replication. Sub-sim verification is uneven; cross-coupling stability is reported anecdotally. The audit-replay posture that Bit-Physics enforces (deterministic, bit-identical) does not exist in any of the major coupled-physics ecosystems. **A composition layer with the same verification rigor as the underlying sims is itself a contribution.**

**Gap 3 — Cross-domain education.** A graduate student who wants to compare reaction-diffusion to a cellular Potts model to a phase-field fracture model to a continuum MHD simulator has to install five separate codes with five separate dependency trees. The "library of polished sims" framing — many sub-fields, one consistent interface, one audit trail format, one verification posture — has educational value beyond any individual sim. **The portfolio's biggest strategic asset is breadth at consistent quality, not any single sim being state-of-the-art.**

These three gaps shape the priority orderings in Part IV.

### 3.4 What this document does NOT prioritize

For the avoidance of doubt about scope, the catalog deliberately deprioritizes:

- Pure operations-research simulation (queueing, inventory, supply chain) — covered briefly in § 21 traffic but not as a category.
- Discrete-event simulation as such (network packet sims, business-process sims) — physics overlap is too small.
- Pure graphics rendering without a physical substrate.
- Pure ML training workloads.
- Symbolic mathematics.
- Cryptographic simulation.
- Pure analytic / closed-form physics (already too narrow to need GPU).

## 4. The three-tier accessibility model

The three-tier model is the principal accessibility-and-cost stratification in the portfolio. It is applied to every catalog entry as a planning decision. This section codifies the model in enough detail that catalog entries can reference it by tier-number alone.

### 4.1 Why three tiers

The same physical phenomenon admits very different implementations depending on hardware budget:

- A Lennard-Jones MD simulation runs with 5,000 atoms in a browser at 60 FPS (educational).
- The same algorithm runs with 1,000,000 atoms on a consumer GPU in minutes (research-tutorial-grade).
- The same algorithm runs with 100,000,000+ atoms on an HPC cluster with vendored GROMACS (production research).

Each serves a different user. Three tiers acknowledge this and require every catalog entry to declare its position(s). The three tiers are independent products: Tier 0 is the shareable web demo, Tier 1 is the downloadable desktop product, Tier 2 is the workstation/cloud production tier.

### 4.2 Tier 0 — Web

- **Hardware floor.** 4 GB integrated GPU (Intel Iris Xe, Apple M1 base, mid-range Android). A $400 Chromebook can run it.
- **API.** WebGPU. WebGL2 fallback is no longer pursued; WebGPU is universally available in evergreen browsers as of May 2026.
- **Memory budget.** 512 MB GPU, 100 MB JS heap.
- **Performance target.** Interactive sims at 30-60 FPS; non-interactive at ≤30 s total wall-clock.
- **Distribution.** Static HTML+JS+WGSL bundle deployed via Phase 5.1 web-deploy pipeline to `bit-physics.<domain>`.
- **Visual-signature rule.** A Tier 0 sim must be visually legible within 5 seconds of page load. If a viewer can't tell what's happening at first glance, the sim has failed its tier.
- **Indicative scales.** Particles: 5,000-50,000. Grid 2D: 256² to 1024². Grid 3D: 64³ to 128³. Agents: 100-10,000.
- **Stack assignment.** Almost always Stack B (WebGPU+TS); occasionally Stack A (GLSL) for legacy compatibility.

### 4.3 Tier 1 — Desktop

- **Hardware target.** Consumer GPU, 12-24 GB VRAM. Reference floor: NVIDIA RTX 4070 Ti (12 GB). Reference ceiling: RTX 4090 (24 GB). AMD RX 7900 XTX (24 GB) via HIP where applicable.
- **API.** CUDA (primary), HIP (secondary), Vulkan (cross-vendor primary).
- **Performance target.** Canonical scenarios complete in ≤10 minutes wall-clock; stretch in ≤1 hour. Real-time variants targeted at 10-30 FPS where applicable.
- **Distribution.** Downloadable binary (Stack C via Phase 5.2 binary-release) or pip-installable Python package (Stack D or E via Phase 5.3 pypi-release). Cross-platform Windows/Linux/macOS targets where the underlying API supports.
- **Indicative scales.** Particles: 100,000-10,000,000. Grid 2D: 1024² to 8192². Grid 3D: 256³ to 512³. Agents: 10,000-1,000,000.
- **Stack assignment.** Stack C (Vulkan/C++) for performance-critical and binary-distributable; Stack D (Taichi/Py) for research-tutorial-grade Python; Stack E (Warp/Py) for Newton-backed and NVIDIA-ecosystem integration.

### 4.4 Tier 2 — Workstation

- **Hardware target.** Pro GPU, 24-80 GB VRAM. Reference cards: NVIDIA RTX 6000 Ada (48 GB), A100 (40/80 GB), H100 (80 GB), H200 (141 GB), B100/B200 (next-gen). Optional multi-GPU (2-8 cards). Cloud-rentable on Lambda Labs, RunPod, Vast.ai, AWS, GCP, Azure.
- **API.** CUDA, Warp, Newton, PhysicsNeMo. Vendored production codes (GROMACS, WarpX, openCARP, Pele, CP2K, SPECFEM3D, gPLUTO, AthenaK, ASPECT, ISSM, Tidy3D, etc.) acceptable under `references/`.
- **Performance target.** Hours-long acceptable. Offline render acceptable.
- **Distribution.** Source or Docker-containerized; cloud-deployable on rentable HPC.
- **Indicative scales.** Particles: 10,000,000-1,000,000,000+. Grid 2D: 4096² or larger. Grid 3D: 1024³ or larger. Agents: 1,000,000+. Multi-physics: full-resolution coupled multi-physics with adjoint sensitivity.

### 4.5 The matched-pair equivalence gate

Per spec § 3.5 Gate 14, a Tier 0 and Tier 1 sim of the same phenomenon **MUST** pass a cross-tier equivalence test. Same for Tier 1 and Tier 2 where algorithms align. This is a non-negotiable rule.

Practical consequence: the Tier 0 web sim is not a "reduced demo" — it is an exact small-scale instance of the same algorithm as the Tier 1 desktop product. The equivalence gate enforces this. Where the algorithm is fundamentally different (e.g., a Tier 0 simplified model vs. a Tier 2 full DNS), the equivalence gate is replaced by a "qualitative agreement" gate documented per spec § 6.4 (calculation-validation).

### 4.6 When Tier 0 doesn't make sense

Some phenomena have no useful Tier 0 instance:
- DFT on more than 2 electrons (memory exceeds Tier 0 budget).
- Full ice-sheet dynamics (real meshes are O(10K) nodes minimum).
- Full ab-initio MD on chemically realistic systems.
- Most coupled multi-physics with disparate timescales.

For these, the catalog entry declares "Tier 0: N/A" with rationale. **`JUDGMENT`:** the public-website presence for a Tier-0-N/A sim becomes a still render, an explainer essay with embedded video, or a thumbnail-link to a Tier 1 binary download — not an interactive demo.

## 5. The composition framework

This is the principal new conceptual contribution of this catalog over the spec. The spec defines sims; the catalog defines compositions.

### 5.1 What composition means

A **composition** is a simulator built from two or more individual sims that share state, coordinate systems, time-stepping, and rendering at runtime. The composition's output is qualitatively different from any constituent sim; you couldn't produce it by running them separately and concatenating.

Compositions are themselves sims in their own right: they have their own verification posture, their own audit trail, their own tier mapping, their own potential differentiable variant. Compositions can compose.

### 5.2 The four complexity levels

| Level | # constituent sims | Typical effort | Tier feasibility | Examples |
|---|---|---|---|---|
| 2-sim | 2 | 1-3 weeks beyond working sub-sims | Often Tier 0+1 | Buoyancy-driven flow; FSI-lite |
| 3-sim | 3 | 1-3 months | Usually Tier 1; Tier 0 if simple | Tsunami impact; cardiac digital twin lite |
| 4-5-sim signature | 4-5 | 3-12 months | Tier 1 or Tier 2 | Solar flare; AM build; single cell |
| 6+-sim flagship | 6+ | 6-24 months | Tier 2 only | Habitable planet; living organ; galaxy |

Realistic project lifetime allocations: ~30-50 2-sim, ~15-25 3-sim, ~8-12 4-5-sim signature, ~3-5 6+-sim flagship.

### 5.3 Coupling patterns

Three principal patterns govern how sub-sims connect:

1. **Field-on-field coupling.** Sim A writes a field; Sim B reads it as a source term. Example: fluid → thermal (advection of T); thermal → fluid (buoyancy). The simplest pattern.
2. **Boundary coupling.** Sim A and Sim B share an interface; state transfers at the interface only. Example: cloth-fluid FSI (fluid sees moving boundary; cloth sees pressure). Stability often dominates; the added-mass instability is the canonical concern in FSI.
3. **Co-located coupling.** Sim A and Sim B operate at the same spatial point but represent different physics. Example: cardiac monodomain (RD) + tissue mechanics (FEM) at every voxel. The most complex pattern; usually requires a unified time-stepping scheme.

Most real compositions use a mix.

### 5.4 Time-stepping patterns

- **Sub-cycling.** Faster sim runs N steps per slower sim step. Common for thermal-fluid where thermal is slow.
- **Operator splitting (Strang, Lie, Marchuk).** Each sim updates state separately; alternated by half-steps. Standard for advection-diffusion-reaction.
- **Implicit coupling.** Single nonlinear solve includes both physics. Required for stiff couplings (e.g., elastic-fluid FSI with added-mass instability).
- **Lockstep.** Both sims at same dt. Rare; only when timescales nearly match.

### 5.5 Tier inheritance

A composition's tier is bounded by its constituents:
- If any constituent is Tier-2-only, composition is Tier-2-only.
- If all constituents have Tier 0 variants, the composition might be Tier 0, but the additional memory and compute of coupling often pushes to Tier 1.
- The composition has a tier "in its own right" — its own matched-pair gates apply if multiple tiers exist.

### 5.6 Verification by parts

Compositions usually have weaker analytic anchors than their sub-sims. Common approaches:

- Reproduce published reference scenarios (calculation validation per spec § 6.4).
- Cross-code agreement — run the composition in two independent implementations.
- Energy, mass, momentum conservation across coupling — the simplest sanity check.
- Each sub-sim individually passes its full verification suite; the coupling is small and locally verifiable.

The verification-by-parts approach is similar to integration testing in software engineering: each unit is unit-tested; the integration is tested for the new behavior the composition introduces, not for the sub-physics that the sub-sims already verify.

### 5.7 What compositions are not

- Not a workflow pipeline. Workflow = "run A, export, run B on the result." Composition requires *shared state at runtime*.
- Not the same as multi-physics. Multi-physics is composition where the constituent physics are different. Composition could also include same-physics-different-method coupling (e.g., MPM core + SPH boundary).
- Not a general-purpose engine. The catalog implements specific compositions as bespoke sims under `compositions/`. The catalog does not commit to building a general composition engine. If after 30+ bespoke compositions a pattern emerges, a unified composition runtime can be considered then (Open Decision D-3).

## 6. Tier-assignment methodology

For Part II to be useful, every phenomenon entry needs a consistent tier assignment. This section codifies how those calls are made.

### 6.1 Tier 0-eligible

A phenomenon is Tier 0-eligible iff:
- It admits a meaningful 1D or 2D (or small 3D) instance.
- It has visual structure recognizable at small scale: waves propagate, vortices form, instability grows, pattern emerges, defects appear.
- It admits a real-time interactive variant where the user can change parameters and see consequences in seconds.
- It does not require external data exceeding Tier 0's 512 MB memory.

Phenomena that pass all four: most 2D fluid sims, most pattern formation, most agent-based, most waves, most reaction-diffusion, simple gravity, simple cardiac excitable media.

### 6.2 Tier 1-only

- 3D required (memory and compute exceed Tier 0).
- External data required (volumetric reference, real-world boundary conditions).
- Convergence requires longer than 30 s of wall-clock.

Phenomena that fall here: most 3D fluid sims, MD with PME, biventricular cardiac, full FDTD photonic, most landscape evolution, most reactive flow, most CFD-airfoil at engineering Re.

### 6.3 Tier 2-only

- Memory exceeds 24 GB even for a non-trivial instance.
- Multi-million-element meshes required for physical fidelity.
- Production-code vendoring required for community-accepted validation.

Phenomena that fall here: full ab-initio MD with MLIPs at material scale, full GCM, full SeisSol, full WarpX laser-plasma, full Athena++ accretion disk, full biventricular cardiac digital twin with patient data.

### 6.4 Tier inheritance for compositions

A composition inherits from the highest tier of any constituent. A composition where all constituents have Tier 0 variants is *Tier 0-eligible* but may fall to Tier 1 because the coupling itself takes memory. The matched-pair gate from § 4.5 applies independently to the composition.

## 7. Integration patterns with Bit-Physics — what the architecture has, what it would need

This section is the most important part of Part I for execution. It enumerates exactly which architectural primitives every Part II entry consumes (already present at Phase 5) and exactly what *new* infrastructure each family would need (must be added in Phase 6+ sub-charters).

### 7.1 Folder structure pattern

Per spec § 4.2 every catalog entry plugs into this structure:

```
<phenomenon-family>/<phenomenon-name>/
├── README.md
├── tier-0-web/                       # Stack B (WebGPU + TS)
│   ├── src/                          # WGSL kernels, TS wrappers
│   ├── tests/
│   └── package.json
├── tier-1-desktop/                   # Stack C, D, or E
│   ├── src/                          # CUDA / HIP / Taichi / Warp
│   ├── tests/
│   └── pyproject.toml or CMakeLists.txt
├── tier-2-workstation/               # Stack E with vendored upstream
│   ├── src/                          # Warp + vendored production code
│   ├── references/                   # Vendored upstream code
│   └── pyproject.toml
├── compositions/                     # Compositions that include this sim
│   └── README.md (references to top-level compositions/)
docs/sim-specs/<phenomenon-family>/<phenomenon-name>/
├── spec.md                            # Per spec § 8.2 template
├── algebraic.md
├── determinism.md
├── equivalence.md
├── tier-0.md, tier-1.md, tier-2.md
└── productization-status.md            # Per spec § 8.2 sec 13
```

This is the same pattern existing Phase 5 sims follow. The catalog's job is to commission new entries in this pattern, not to invent new layouts.

### 7.2 Common modules — what's there, what's needed

At Phase 5 completion the project has these `common-*` modules (per spec § 4.2 and the proposed extensions from the original adjacent-fields charter § 22, which this catalog confirms and extends):

| Common module | Status at Phase 5 | Consumers | New consumers added by this catalog |
|---|---|---|---|
| `common-warp` | ✅ Exists | All Stack E sims | New Stack E sims in Part II |
| `common-ts` | ✅ Exists | All Stack B sims | New Tier 0 sims |
| `common-py` | ✅ Exists | All Stack D/E Python sims | New Stack D/E sims |
| `common-cpp` | ✅ Exists | All Stack C sims | New Stack C sims |
| `common-spectral` | 📋 Proposed | Spectral PDE solvers, FFT-based | Most wave sims, BEC, atmospheric, ocean |
| `common-fmm` | 📋 Proposed | N-body, electrostatics, MHD | Astrophysics, plasma, EM |
| `common-em` | 📋 Proposed | Maxwell, plasmonics, FDTD | All EM family |
| `common-elastica` | 📋 Proposed | 1D rod elements (Cosserat, Kirchhoff) | Hair, cables, plant branches |
| `common-adjoint` | 📋 Proposed | Differentiable simulation infrastructure | All variants consuming WU-A |
| `common-stochastic` | 📋 Proposed | Massively-parallel ensemble Monte Carlo | MC photon, MC neutron, MC chemical kinetics |
| `common-mesh` | 🆕 New here | Unstructured mesh ops (generation, refinement, quality) | FEM, FDTD-unstructured, ASPECT-port, SeisSol-port |
| `common-vtk` | 🆕 New here | VTK/Exodus/OpenFOAM output for ParaView interop | Any Tier 1/2 sim that wants ParaView inspection |
| `common-units` | 🆕 New here | Physical-unit system and dimension checking | All sims (cross-cutting) |
| `common-graph` | 🆕 New here | Graph data structures for network sims | Epidemic, opinion, traffic, power grid |
| `common-vdb` | 🆕 New here | NanoVDB/NeuralVDB-style sparse 3D volumes | Any 3D Tier 1/2 sim with sparse-volume output |
| `common-mlip` | 🆕 New here | MLIP foundation-model interface and fine-tuning | MD-MLIP, materials informatics |
| `common-usd` | 🆕 New here | USD scene authoring (Omniverse-compatible) | Robotics, digital twins, multi-scene sims |
| `common-ode` | 🆕 New here | Stiff ODE integrators (BDF, Rosenbrock) | Chemical kinetics, cardiac, combustion, batteries |
| `common-tensor-net` | 🆕 New here | Tensor network primitives (MPS, TTN, DMRG) | Quantum circuit simulation, condensed-matter quantum |
| `common-amr` | 🆕 New here | Adaptive mesh refinement primitives | Compressible CFD, astrophysics, multiphase |

The new common modules above are **promoted at the rule-of-three threshold** per spec convention 7.10. Each is listed with at least 3 prospective consumer sims; some have considerably more. Promotion to `common/` requires a Phase 6+ sub-charter and is gated by the existing rule-of-three audit.

The `common-mlip`, `common-usd`, `common-vdb`, and `common-tensor-net` modules are the largest infrastructure additions. They reflect the five biggest shifts from § 3.1 of this Part I and would each warrant a dedicated Phase 6 mini-phase.

### 7.3 Phase 4 work-unit consumption

Per spec, every variant of a sim declares which Phase 4 WUs it consumes:

| WU | What | Catalog entries that need it |
|---|---|---|
| WU-A | Autodiff | All differentiable variants — see § 3.1 shift 3 |
| WU-B | Sparse | Sparse-domain variants (atmospheric subgrid, sparse MPM) |
| WU-C | 3DGS | Neural-rendered variants, inverse rendering |
| WU-D | Newton | Elastica, contact, structural, Newton-backed sims |
| WU-E | Learning | Surrogate models, ML closures, neural physics, MLIPs |
| WU-F | Equivalence | Cross-stack and cross-tier matched-pair gates |
| WU-G | Phase ledger | All sims, administrative |

By Phase 5 completion, every WU is available. The catalog only needs to declare which WUs each entry will consume.

### 7.4 Vendoring strategy for Tier 2

Tier 2 is where the project most cleanly leverages industry production codes. The vendoring strategy is per spec § 11.6 and adj charter § 28.3 — vendored upstream codes live under `tier-2-workstation/references/` with the original license preserved and the integration code separate.

Per Part II catalog, the principal Tier 2 vendoring candidates are:

| Field | Vendored code | License | Project author |
|---|---|---|---|
| Astrophysics MHD | gPLUTO, AthenaK, AthenaPK, IDEFIX | GPL / BSD | Italian / Princeton / NSF |
| MD | GROMACS, OpenMM, LAMMPS | LGPL / MIT / GPL | Wide |
| MD MLIPs | MACE, NequIP, Allegro, SevenNet | MIT / Apache | Cambridge / Harvard / Seoul |
| Plasma PIC | WarpX, PIConGPU, Smilei | BSD / GPL | LBNL / Helmholtz / IPP |
| FDTD | Meep, Tidy3D-style (autodiff variants) | GPL / partial | MIT / Flexcompute |
| Seismic | SPECFEM3D_GLOBE, SeisSol | GPL / BSD | Princeton / TUM |
| Mantle | ASPECT | GPL | CIG |
| Ice sheet | ISSM, PISM | BSD / GPL | NASA JPL / Univ. Alaska |
| Cardiac | openCARP | Apache | KIT / Graz |
| Multi-cell biology | PhysiCell, CompuCell3D, Morpheus | BSD / MIT | USC / Indiana / TU Dresden |
| Atmospheric | WRF, FastEddy | Public-domain / open | NOAA / NCAR |
| Wind farm | OpenFAST, AVBP wind extensions | Apache / private | NREL / CERFACS |
| Radiation transport | Geant4, GGEMS | Geant4 license / MIT | CERN / partner labs |
| Rendering / inverse | Mitsuba 3 | Custom open | EPFL |
| Robotics | Isaac Sim, MuJoCo, MJX | Custom NVIDIA / Apache | NVIDIA / DeepMind |
| Power grid | ParaEMT | BSD | NREL |
| Tensor networks | ITensor, TenPy, quimb | Apache | community |

The strategy across all of these: small port shims (Stack E Warp + Python) that load the vendored upstream, manage data flow, and pass results back through the testkit's capture-format validators. The vendored code itself is never modified.

### 7.5 Verification posture across families

The spec's verification posture (MMS, GCI, calculation validation per Roy 2005, audit-replay) applies uniformly. The catalog's job is to provide the analytic anchors and reference data per family. § 6 of each Part II family does this.

## 8. Phase 6+ relationship and decision posture

This catalog is to Phase 6+ what a candidate slate is to an election. Phase 6+ sub-charters draw candidate phenomena and compositions from this document; the catalog itself does not commit any to execution.

### 8.1 How a sub-charter is drafted from this catalog

A Phase 6+ sub-charter for a new sim:
1. Identifies the catalog entry (Part II family § N.x) it implements.
2. References Appendix B (sim-to-stack crosswalk) for the implementation plan.
3. References the appropriate common module from § 7.2 (existing or new).
4. References the appropriate WU from § 7.3.
5. Declares its productization streams per spec § 8.2 sec 13 (web, binary, pypi, render, preprint).
6. Drafts the spec, algebraic, determinism, equivalence documents per spec § 8.2.
7. Defines its matched-pair equivalence gate per § 4.5.

For a composition:
1. Identifies the Part III entry (§ 28-31).
2. Confirms all constituent sims are at Tier 1+ in the existing portfolio.
3. Builds the coupling module under `compositions/<name>/coupling/`.
4. Defines a composition-specific equivalence gate per § 5.6 (verification by parts).
5. Inherits audit-replay from the highest sub-sim tier.

### 8.2 Decision-authority distribution

The catalog is a planning artifact; final decisions remain with the project owner. The catalog's open decisions are listed in Part IV § 38. Sub-charter authors operate within the catalog's recommendations but can override with justification recorded in the sub-charter front matter.

### 8.3 Cadence

The catalog should be re-issued at major architectural milestones — likely once per year, or when SIGGRAPH / NeurIPS / equivalent venues produce a substantial new round of frontier work that changes priorities. v2.0 is the May 2026 snapshot; v3.0 should follow either May 2027 or after the first 5-10 catalog phenomena have shipped (whichever comes first).

---

# Part II — Master Phenomenon Catalog

The following 18 sections enumerate ~170 phenomena across the major regions of GPU simulation. Each family section follows the same structure: **scope and distinction**, **production codes** (industry and research), **2024-2026 frontier work** with citations, **verification posture** for the family, **toolchain inventory** (existing GPU tools), **hardware tier assignments** at the family level, **per-phenomenon list** (each phenomenon with paragraph-scale detail), and **integration notes** for the repo (what exists, what's needed, common-module consumption).

> **Per-family testing detail is in Appendix H.** Each family's testing surface — MMS solution candidates, golden-value derivations, PBT invariants, calculation-validation references, cross-code peers, and matched-pair recipes — is catalogued as a reference card in Appendix H (paired with Part V). A sub-charter author begins by reading the family section here for context, then jumps to the corresponding H.N appendix for the testing-anchor menu.

Status flags inside entries: ✅ Exists at Phase 5; 🔧 Implied by Phase 5 stack; 🆕 Catalogued for Phase 6+; 📋 Charter-listed (now promoted to full entry).

## 9. Fluids and Flow

### 9.1 Scope and distinction

Fluid simulation is the largest and most visually iconic region of the catalog. Methods divide into Lagrangian particle (SPH, FLIP), Eulerian grid (volume-of-fluid, level set, smoke, projection-based incompressible), hybrid (MPM, PIC, APIC), and lattice-Boltzmann. Sub-regions partition by physical regime: incompressible single-phase, multiphase with surface tension, compressible with shocks, non-Newtonian, surface-tension-driven, porous-media, free-surface, low-Reynolds (Stokes), high-Reynolds (LES, RANS, DNS).

The portfolio at Phase 5 already covers SPH, MPM, Eulerian smoke, and LBM as Layer 4+ sims. The expansion here adds the remaining major fluid regimes and the frontier methods.

### 9.2 Production codes

The GPU fluid landscape is mature with many production codes:

- **SPlisHSPlasH** (Bender et al.) — open-source SPH; vendored Phase 0; reference for the existing portfolio SPH sim.
- **Basilisk** (Popinet & Zaleski since 1999) — quadtree adaptive Eulerian, VOF, surface tension; the canonical academic CFD framework. CPU-bound but extensively benchmarked.
- **OpenFOAM** — community-standard CPU CFD; GPU support via NVIDIA's AmgX and Nektar++-style ports; SnappyHexMesh for unstructured meshing.
- **PALABOS** and **waLBerla** — GPU lattice-Boltzmann production codes.
- **Mantaflow** — graphics-research smoke/water; widely used in VFX.
- **NVIDIA Flow / FleX** — graphics-runtime fluid.
- **NVIDIA Warp fluid samples** — production GPU fluid in the NVIDIA ecosystem.
- **SU2** (Stanford University Unstructured) — open-source CFD with aerodynamic optimization.
- **Nektar++** — high-order spectral/hp element CFD.
- **Pele suite** (Pele-Combustion, Pele-LM, Pele-Phys) — combustion + flow for energy applications.

### 9.3 2024-2026 frontier work

- **Integral surface tension in VOF** — Patel et al. (arXiv 2502.02712, 2025) — implementation in Basilisk, applied to Marangoni flows; demonstrates spurious-current suppression at an order of magnitude better than the CSF model. Validated against Young's analytical bubble migration.
- **Edge-based Interface Tracking (EBIT)** — arXiv 2309.00338 (Pan et al. 2023) — hybrid front-tracking / VOF in Basilisk; handles topology change.
- **High-order moment-encoded kinetic** — Li, Wang, Pan, Gao, Wu, Desbrun (SIGGRAPH Asia 2023, *ACM TOG*) — turbulent flows on GPU using high-order moment encoding.
- **Gaussian Fluids** — Xing, Wang, Chu, Chen (SIGGRAPH 2025, Peking University) — grid-free fluid solver based on Gaussian spatial representation. "Drawing inspiration from the expressive capabilities of 3D Gaussian Splatting in multi-view image reconstruction, we model the continuous flow velocity as a weighted sum of multiple Gaussian functions." Direct conceptual link to WU-C (3DGS).
- **Fast Subspace Fluid with Temporally-Aware Basis** — Chen et al. (SIGGRAPH 2025, Toronto / SJTU) — reduced-order fluid with temporal adaptation.
- **Quadtree Tall Cells for Eulerian Liquid** — Narita, Ochiai, Kanai, Ando (SIGGRAPH 2025, Tokyo / GAME FREAK) — game-quality liquid with adaptive cells.
- **Neural Particle Level Set** — Chen, Zhou, Zhu (SIGGRAPH 2025, Georgia Tech) — neural interface tracking for dynamic interfaces.
- **Differentiable VOF / level-set** — emerging for inverse problems; partial differentiable variants in PhiFlow and JAX-based codes.

### 9.4 Verification posture

Strong. The fluid family has the richest set of analytic and benchmark anchors of any family:

- **Sod shock tube** — analytic; reference for compressible.
- **Sedov-Taylor blast** — self-similar analytic; reference for blast.
- **Hagen-Poiseuille pipe flow** — analytic; reference for low-Re.
- **Lid-driven cavity** — Ghia et al. (1982) benchmark velocities.
- **NACA airfoil** — AGARD test cases for aerodynamics.
- **Rising bubble** — Hysing et al. (2009) two-phase benchmark.
- **Young's bubble migration** — analytic for Marangoni-driven flow.
- **Strouhal-Reynolds** — empirical envelope for vortex shedding.
- **Kelvin wedge** — analytic for ship wake.
- **Buckley-Leverett** — analytic for two-phase porous flow.
- **Stoker dam break** — analytic for shallow water.
- **Carrier-Greenspan run-up** — analytic for tsunami.

### 9.5 Toolchain inventory (existing GPU tools)

- WaLBerla (LBM, GPU), Palabos (LBM, GPU-aware C++), AmgX (algebraic multigrid for Navier-Stokes), NVIDIA Modulus (PINN + physics), OpenFOAM-CUDA forks, Warp fluid samples, JAX-Fluids (emerging), PyFR (high-order GPU), Nektar++ (spectral/hp), CharLES (LES), SU2 (open-source CFD with adjoint).

### 9.6 Hardware tier assignments at family level

Almost every fluid sub-region has compelling Tier 0, Tier 1, and Tier 2 instances. This family is the principal source of Tier 0 web gallery sims. Tier 1 covers 3D incompressible, multi-phase, and adversely curved domains. Tier 2 reaches research-grade with vendored upstream (Basilisk, OpenFOAM, MITgcm, etc.).

### 9.7 Per-phenomenon list

**9.7.1 ✅ SPH single-phase fluid (Tier 0, 1, 2)**
- Already in portfolio. Lagrangian particle smoothed-particle hydrodynamics. Reference upstream SPlisHSPlasH (vendored Phase 0).
- Composes with: rigid body (FSI), thermal (buoyancy), MPM (sand-water boundary), surface tension (capillary).
- Repo integration: existing Stack C reference + Stack E port. WU-A differentiable variant adds at Phase 4 baseline.
- Frontier extensions for Phase 6+: PCISPH (predictive-corrective incompressible), DFSPH (divergence-free), surface-tension SPH, multi-resolution SPH.

**9.7.2 ✅ MPM hybrid material point method (Tier 1, 2)**
- Already in portfolio. Eulerian-Lagrangian particle-grid for elasto-plastic materials.
- Composes with: rigid body (contact), DEM (granular), thermal (AM), fracture (damage).
- Repo integration: existing. WU-A differentiable for inverse-design parameter sweeps.
- Frontier extensions: APIC (affine particle-in-cell), MLS-MPM (moving-least-squares), GMPM (generalized).

**9.7.3 ✅ Eulerian smoke and incompressible flow (Tier 0, 1)**
- Already in portfolio. Grid-based smoke with vorticity confinement and projection-based incompressibility.
- Composes with: rigid body (boundary), thermal (buoyancy → Boussinesq), combustion (heat release), shadow rendering (smoke + light).
- Repo integration: existing Stack B + Stack E. NeuralVDB (`common-vdb`) extension for sparse 3D output.

**9.7.4 ✅ Lattice Boltzmann (Tier 0, 1, 2)**
- Already in portfolio. Mesoscale kinetic flow on regular lattice.
- Composes with: thermal (DDF — double distribution function), multi-phase (color-gradient LBM), porous media (heterogeneous LBM).
- Repo integration: existing. Tier 2 vendoring of waLBerla or Palabos for production runs.

**9.7.5 🆕 Multiphase volume-of-fluid flow (Tier 1, 2)**
- Two or more immiscible fluids with sharp interface tracking. Oil-water, gas-liquid bubbles, foams, emulsions. Primary algorithmic challenge: surface-tension-driven flow without spurious currents.
- Production codes: Basilisk (Popinet; quadtree VOF), ALPACA (compressible multiphase), interFoam in OpenFOAM. Open-source CPU; ports to GPU via Stack E.
- Frontier: Patel et al. (arXiv 2502.02712, 2025) integral surface tension in Basilisk; EBIT (arXiv 2309.00338) for topology change; Marangoni-flow benchmarks.
- Verification: Young's analytical bubble migration; Hysing et al. (2009) rising-bubble benchmark; Laplace pressure jump at curved interface.
- Tier 0: 2D bubble rising under buoyancy, 1024² grid, real-time. Tier 1: 3D drop impact with surface tension. Tier 2: 3D foam dynamics or aerodynamic drop breakup; vendored Basilisk.
- Composes with: surface tension microfluidics, drop impact + capillary surface, atmospheric cloud microphysics, inkjet printing.
- Repo integration: new sim under `fluids/multiphase-vof/`. Needs `common-mesh` (quadtree), `common-vtk` (output), `common-vdb` (sparse volume for 3D).

**9.7.6 🆕 Non-Newtonian flow (Tier 1, 2)**
- Shear-thinning, shear-thickening, viscoelastic, yield-stress fluids. Paint, blood, magma, polymer solutions, ketchup, lava.
- Production codes: OpenFOAM, Basilisk with constitutive extensions; commercial Polyflow.
- Frontier: coupled with thermal in magma flow; coupled with red-blood-cell elasticity in blood; viscoelastic instabilities (elastic turbulence).
- Verification: power-law fluid in pipe flow (analytic); Bingham fluid yield-surface evolution; Weissenberg climb in elastic.
- Tier 0: 2D power-law fluid in lid-driven cavity. Tier 1: 3D magma chamber with temperature-dependent viscosity. Tier 2: lava-flow modeling on real topography with crust formation.
- Composes with: magma + crust (lava § 19.7.7), blood + vessel wall (FSI § 18.7.12), polymer flow + processing.
- Repo integration: new sim under `fluids/non-newtonian/`. Constitutive-law plugin in Stack E. WU-A for differentiable rheology identification.

**9.7.7 🆕 Compressible flow with shocks (Tier 1, 2)**
- Mach > 0.3; shock waves, expansion fans, choked flow. Godunov-type solvers, HLLC, MUSCL, WENO.
- Production codes: Athena++ for astrophysics (Stone et al., ApJS 249, 2020); PLUTO (Mignone et al., 2007), gPLUTO (Rossazza et al., arXiv 2511.20337, 2025); Pele suite for combustion.
- Frontier: AMR for shock tracking; deep-learning shock detectors; performance-portable via Kokkos.
- Verification: Sod shock tube; Sedov-Taylor blast wave (self-similar analytic); Riemann problem variants.
- Tier 0: 1D Sod shock tube interactive with analytic comparison. Tier 1: 2D Riemann problem and 2D shock-vortex interaction. Tier 2: 3D supersonic nozzle with separation bubble; vendored Athena++ or PLUTO.
- Composes with: shock + reactive chemistry (detonation), shock + radiation (radiation-hydrodynamics).
- Repo integration: new sim under `fluids/compressible-shock/`. Needs `common-amr` for adaptive refinement.

**9.7.8 🆕 Aerodynamics — airfoil flow (Tier 1, 2)**
- External flow around streamlined bodies; lift, drag, separation. Re ~10⁴-10⁷.
- Production codes: OpenFOAM with SnappyHexMesh; SU2 (Stanford); Nektar++; commercial Ansys Fluent.
- Frontier: coupled aeroelasticity (wing + structural); ML closures for turbulence models; airfoil shape optimization via adjoint.
- Verification: NACA airfoil data; AGARD test cases.
- Tier 0: N/A — needs 3D and high Re. Tier 1: 2D NACA 0012 at moderate Re; lift-drag polar. Tier 2: 3D wing with vortex shedding from tip; LES-resolved.
- Composes with: aeroelasticity (FSI), drone propeller wake, sailplane / glider design.
- Repo integration: new sim. Needs `common-mesh` (body-fitted mesh generation).

**9.7.9 🆕 Vortex shedding around cylinder (Tier 0, 1)**
- Canonical CFD benchmark; Kármán vortex street. Re ~40-1000.
- Production codes: any CFD code.
- Frontier: Re-dependent flow regime maps via ML; multi-cylinder interaction.
- Verification: Strouhal-Reynolds analytic envelope.
- Tier 0: 2D flow around cylinder — visual hero for "what is CFD." Tier 1: 3D with span-wise instability LES.
- Composes with: bridge aeroelasticity, fish school + flow.
- Repo integration: new sim. Stack B Tier 0 + Stack E Tier 1.

**9.7.10 🆕 Drone propeller wake (Tier 2)**
- Rotating-frame CFD with moving boundaries; tip vortices, blade-vortex interaction.
- Production codes: OpenFOAM AMI; commercial CFD; nalu-wind (NREL).
- Frontier: aeroacoustic coupling; ML for tonal noise prediction.
- Tier 2: full 3D rotating propeller with downstream wake.
- Composes with: aeroacoustic noise, urban air mobility (drone swarm).
- Repo integration: new sim. Heavy mesh management; needs `common-mesh` with sliding interfaces.

**9.7.11 🆕 Compressible nozzle flow (Tier 1, 2)**
- Converging-diverging rocket nozzle; choked flow, supersonic expansion, shock-in-nozzle.
- Production codes: Pele suite, Athena++, SU2.
- Verification: analytic isentropic-flow tables; quasi-1D nozzle theory.
- Tier 0: 1D area-Mach relation. Tier 1: 2D axisymmetric. Tier 2: 3D with thrust vectoring.
- Composes with: rocket combustion + nozzle; nozzle + plume.
- Repo integration: shares `common-amr` with 9.7.7.

**9.7.12 🆕 Shock tube and blast waves (Tier 1, 2)**
- Sod analytic, Sedov-Taylor self-similar. Strong verification.
- Tier 0: 1D Sod (verification anchor for family). Tier 1: 2D/3D Sedov-Taylor. Tier 2: underwater explosion with bubble dynamics.
- Composes with: explosion + structure (FSI), detonation chemistry + blast.

**9.7.13 🆕 Microfluidics (Tier 1, 2)**
- Low-Re lab-on-chip; pressure-driven, electro-osmotic, capillary.
- Production codes: OpenFOAM, COMSOL Multiphysics (commercial); custom LBM color-gradient.
- Frontier: droplet generation in T-junctions; cell sorting; organ-on-chip.
- Tier 0: 2D channel with mixing; Hagen-Poiseuille comparison. Tier 1: 3D T-junction droplet generation. Tier 2: full chip with multiple components.
- Composes with: microfluidic + cell, droplet + chemistry, deformable-vessel + cell.

**9.7.14 🆕 Surface tension / Marangoni / coffee-ring (Tier 0, 1)**
- Capillarity, Marangoni convection from surface-tension gradients, evaporation-driven flow.
- Production codes: Basilisk (canonical), MPS (moving-particle semi-implicit).
- Frontier: Patel et al. 2025 integral formulation; coupled with evaporation models.
- Tier 0: 2D droplet on surface with thermal gradient — visible Marangoni. Tier 1: 3D coffee-ring evaporation. Tier 2: industrial coating-flow.
- Composes with: inkjet, drying paint, biofilm formation, microfluidics.

**9.7.15 🆕 Capillary flow / wicking (Tier 0, 1)**
- Surface-tension-driven flow through porous media; Washburn equation.
- Production codes: LBM color-gradient; pore-network simulations.
- Frontier: deformable porous (biological tissue) with capillary coupling.
- Tier 0: 2D wicking with multiple capillary radii. Tier 1: 3D porous-medium imbibition. Tier 2: reservoir-scale with heterogeneity.
- Composes with: soil moisture + plant uptake, sweat in fabric, oil reservoir.

**9.7.16 📋 Shallow-water equations (Tier 0, 1, 2)**
- Vertically-integrated 2D hydrodynamics; dam break, tsunami, flood, storm surge, river hydraulics.
- Production codes: ANUGA (open-source), GeoClaw, BasinMod; CUDA ports of MIKE21, Delft3D.
- Frontier: coupled with sediment transport — RiverBedDynamics (Monsalve et al., GMD 18, 2025): "RiverBedDynamics v1.0: a Landlab component for computing two-dimensional sediment transport and river bed evolution."
- Verification: Stoker dam-break analytic solution; Carrier-Greenspan run-up.
- Tier 0: 2D dam break — clean visual. Tier 1: tsunami propagation on real bathymetry. Tier 2: coupled sediment for delta evolution.
- Composes with: tsunami + damage + evacuation (3-sim § 29.x), river + sediment, storm surge + coastal defense.
- Repo integration: new sim under `fluids/shallow-water/`. Needs `common-mesh` and bathymetric data loaders.

**9.7.17-19 📋 Tsunami / Flood / Storm surge (Tier 0/1/2)**
- Sub-cases of shallow water with specific physics: run-up modeling (tsunami), rainfall coupling (flood), wind-stress and pressure coupling (storm surge).

**9.7.20 🆕 Ocean wave tank / ship wake (Tier 0, 1)**
- Surface gravity waves; ship-generated Kelvin wake; Stokes drift.
- Production codes: potential-flow codes, SPH for impact, commercial OrcaFlex.
- Frontier: coupled wind for sea state; reduced-order ML wave forecasting.
- Verification: Kelvin wedge angle (analytic).
- Tier 0: 2D wave packet with dispersion; visible Kelvin wedge. Tier 1: 3D ship wake with hull. Tier 2: coupled ocean-atmosphere wave model.
- Composes with: ship + sea state, coastal wave + structure.

**9.7.21 🆕 Groundwater and porous flow (Tier 1, 2)**
- Darcy flow; multiphase porous; poroelasticity (coupled flow + deformation).
- Production codes: MODFLOW (USGS), OpenGeoSys, MOOSE porous_flow.
- Frontier: reservoir simulation; CO₂ sequestration; ML-accelerated history matching.
- Verification: Theis well solution; Buckley-Leverett two-phase.
- Tier 0: 2D Darcy with heterogeneity. Tier 1: 3D groundwater with pumping wells; salinity. Tier 2: reservoir multi-physics.
- Composes with: groundwater + contaminant transport, CO₂ sequestration + geomechanics.

**9.7.22 🆕 Ocean circulation (Tier 2)**
- Global or regional ocean flow; Boussinesq, Coriolis, density-driven currents.
- Production codes: MITgcm, MOM6 (NOAA), NEMO.
- Frontier: eddy-resolving (1/12 degree) climate-coupled; ML for parameterization.
- Tier 0: N/A at honest scale. Tier 1: regional model with bathymetry. Tier 2: global eddy-resolving.
- Composes with: atmosphere-ocean climate, ocean + sea ice, ocean + sediment.

**9.7.23 🆕 Subspace and reduced-order fluid (Tier 0, 1)**
- Frontier method: temporally-aware reduced basis for real-time fluid (Chen et al., SIGGRAPH 2025).
- Tier 0: 2D real-time reduced-order. Tier 1: 3D with adaptive basis.
- Composes with: any fluid where the engine wants quasi-real-time.

### 9.8 Family-level summary and repo integration notes

The fluid family is the **largest visual category** for Tier 0 distribution. Almost every fluid sub-region has a compelling 2D Tier 0 instance; this is where most of the website-gallery polish should land in early Phase 6+ work. Tier 1 expands to 3D; Tier 2 reaches research-grade with vendored upstream codes.

**Common modules needed beyond Phase 5 baseline:**
- `common-mesh` — unstructured meshing, particularly quadtree (Basilisk-style) and body-fitted (airfoils).
- `common-vtk` — output for ParaView inspection.
- `common-vdb` — sparse 3D volumetric for smoke, multi-phase, and 3D output at scale.
- `common-amr` — adaptive mesh refinement primitives for shock tracking and astrophysical applications.

**Vendoring candidates for Tier 2:** Basilisk (multiphase VOF), SPlisHSPlasH (already vendored), OpenFOAM (industrial CFD), Pele suite (combustion), MITgcm (ocean), Athena++ / gPLUTO (astrophysics) — see § 13.

The fluid family is constituent in tsunami, FSI, multi-phase combustion, plasma MHD, blood flow, surf-zone, magma, atmospheric, oceanic, ship wake, and many more compositions in Part III. The catalog priority orderings in Part IV weight fluid sub-categories highly because of this cross-family leverage.

---

## 10. Solids, Structures, and Materials

### 10.1 Scope and distinction

Continuum mechanics of solid materials; elasticity, plasticity, large deformation, contact, friction, anisotropy. Distinct from fracture (§ 11) by assumed material continuity, and distinct from fluid by constitutive law relating stress to strain rather than rate-of-strain.

The portfolio at Phase 5 already covers FEM elastodynamics, mass-spring cloth, and XPBD rigid bodies. The expansion adds plasticity, advanced contact, friction, knit/weave, origami, and soft robotics.

### 10.2 Production codes

- **NVIDIA Newton VBD** — current Newton solver; soft-body, cloth, hair. Production-quality and consumed via WU-D at Phase 4.
- **MuJoCo Warp / MuJoCo MJX** — Newton MuJoCo-Warp; rigid body, contact-rich, robotics. MJX is the JAX reimplementation, widely adopted in RL.
- **Project Chrono** (UW-Madison) — general multi-body dynamics.
- **FEniCS / Firedrake** — community FEM, Python-based.
- **CalculiX, code_aster** — open-source nonlinear structural.
- **Abaqus, ANSYS Mechanical** — commercial gold-standard for structural.
- **SOFA** (INRIA) — interactive multi-physics simulation framework.
- **Vega FEM** — graphics-research FEM; widely used in academic FEM-for-graphics.

### 10.3 2024-2026 frontier work

- **Cosserat rods at scale** — Hsu et al. SIGGRAPH 2025 "Stable Cosserat Rods" — large-scale hair and strand simulation.
- **Differentiable elasticity** — Hu, Liu et al. Taichi-elasticity lineage; JAX-MD elasticity primitives; PhiFlow.
- **Topology optimization** — covered in adj charter § 18; SIMP-based and density-based GPU codes.
- **Curl Quantization for Knit Singularities** — Mitra et al. SIGGRAPH 2025 — automated placement of knit pattern singularities.
- **Neural soft-body dynamics** — NeRD (Neural Robot Dynamics) — neural simulator with learned dynamics, "stable, contact-rich interactions and long-horizon predictions that can be fine-tuned directly from real-world data."
- **JGS2, MGPBD, Elastic Locomotion** — Phase 6 charter-listed; SIGGRAPH 2025 soft-body frontier.

### 10.4 Verification posture

- **Uniaxial tension** — linear elastic analytic; yield-then-flow for plasticity.
- **Hertzian contact** — analytic pressure distribution.
- **Cattaneo-Mindlin partial-slip** — analytic for stick-slip onset.
- **Bending of cantilever** — Euler-Bernoulli analytic.
- **Plate vibration** — Kirchhoff-Love or Mindlin analytic modes.
- **Topology-optimization compliance** — Sigmund-Maute benchmark cases.

### 10.5 Toolchain inventory

- NVIDIA Newton VBD, MuJoCo Warp / MJX, Project Chrono, FEniCS / Firedrake, SOFA, Vega FEM, Bullet Physics, Taichi-elasticity.

### 10.6 Per-phenomenon list

**10.6.1 ✅ FEM elastodynamics (Tier 1, 2)** — Already in portfolio. Linear and nonlinear elasticity on unstructured meshes. Newton-backed in Stack E (consumes WU-D).

**10.6.2 ✅ Mass-spring cloth (Tier 0, 1)** — Already in portfolio. Discrete spring network. Stack B + Stack E with XPBD constraints.

**10.6.3 ✅ XPBD rigid bodies (Tier 0, 1)** — Already in portfolio. Position-based articulated and free rigid bodies. Stack B + Stack E (Newton-backed for industrial contact).

**10.6.4 📋 Cosserat-rod hair and strands (Tier 0, 1, 2)**
- 1D elastic rods with bending and twisting; Kirchhoff or Cosserat formulation.
- Production codes: Hsu et al. SIGGRAPH 2025 (Stable Cosserat Rods); Houdini hair; Maya nHair; Newton-Mujoco soft body.
- Frontier: Cosserat at scale on GPU (Hsu et al. 2025); coupled with FSI for swimming.
- Verification: large-deformation analytic for clamped-free rod; Euler buckling.
- Tier 0: 2D string-pendulum interactive. Tier 1: 3D head of hair (50,000 strands). Tier 2: full character animation (1M+ strands).
- Composes with: hair + cloth, hair + fluid (water through hair), tree branches in wind.
- Repo integration: new sim under `solids/hair-cosserat/`. Promotes `common-elastica` from proposed to actual.

**10.6.5 🆕 Plasticity and metal forming (Tier 1, 2)**
- J2 plasticity, anisotropic yield criteria (Hill, Barlat), large-deformation plastic flow.
- Applications: stamping, rolling, forging, AM (coupled § 16.7.5).
- Production codes: MPM with plastic constitutive law (portfolio variant); Abaqus Explicit (commercial); LS-DYNA.
- Frontier: coupled with thermal (welding, AM § 16.7.5); ML-derived constitutive models.
- Verification: uniaxial tension to yield-then-flow; analytic plastic-zone size at crack tip.
- Tier 0: 2D uniaxial pull with hysteresis. Tier 1: 3D sheet-metal forming with friction. Tier 2: AM thermo-mechanical.
- Composes with: welding, crash test, impact.

**10.6.6 🆕 Friction, wear, and contact (Tier 1, 2)**
- Coulomb friction, viscoelastic contact, Archard wear law, contact pressure.
- Production codes: Newton MuJoCo-Warp contact; LIGGGHTS granular; commercial Adams.
- Frontier: asperity-scale wear coupling to component-scale contact mechanics.
- Verification: Cattaneo-Mindlin partial-slip; Hertzian pressure.
- Tier 0: 2D stick-slip block-on-plane oscillation. Tier 1: 3D gear-tooth with wear. Tier 2: brake-disc thermo-tribological.
- Composes with: brake, bearing, tire-road.

**10.6.7 🆕 Crystal nucleation and growth (Tier 1, 2)**
- Solidification microstructure; dendrites, eutectics, grain growth. Phase-field is canonical.
- Production codes: PRISMS-PF (DeWitt et al., npj Comp Mater 2020) — "matrix-free finite element... over one billion DOF"; MOOSE phase_field; SymPhas 2.0 (arXiv 2511.10508, 2025).
- Frontier: ExaCA (ORNL) for AM microstructure — "couple with various process models and leverage GPUs gives it the ability to handle up to billions of computational cells efficiently."
- Verification: Karma-Rappel dendrite tip velocity (sharp-interface limit).
- Tier 0: 2D dendrite from seed — striking. Tier 1: 3D dendrite with thermal coupling. Tier 2: AM microstructure with melt-pool coupling.
- Composes with: AM (composition § 30.x), eutectic + thermal, magma crystallization.

**10.6.8 🆕 Crumpling and thin-sheet (Tier 1)**
- Discrete-shell thin-sheet; ridges, vertices, conical singularities under compression.
- Production codes: ARCSim (Narain et al., SIGGRAPH).
- Frontier: statistics of ridge networks; AI-driven crumple prediction.
- Verification: power-law of force vs. compression.
- Tier 1: 3D paper-crumple ball.
- Composes with: cloth + crumpling, foil packaging, medical balloon.

**10.6.9 🆕 Knitting / yarn-level cloth (Tier 1, 2)**
- Cloth at yarn level; explicit yarn-yarn contact.
- Production codes: Cirio et al. SIGGRAPH 2014 (yarn-level woven cloth); Mitra et al. SIGGRAPH 2025 (curl quantization for knit singularities).
- Frontier: Mitra et al. 2025 — automated knit pattern synthesis with topological constraint.
- Verification: stitch geometry vs. experimental knit pattern.
- Tier 1: single garment patch (~10,000 yarn segments). Tier 2: full garment with realistic stitch.
- Composes with: knitted garment + body (cloth + skin), knit fabric + tensile test.

**10.6.10 🆕 Origami / rigid folding (Tier 0, 1)**
- Rigid-panel folding with crease constraints; Miura-ori, water-bomb, twist patterns.
- Production codes: Tachi's Freeform Origami; research codes.
- Frontier: inverse origami design; metamaterials with bistability.
- Verification: bistability analytic for canonical folds.
- Tier 0: Miura-ori unfolding interactive — classic visual. Tier 1: full origami sequence.
- Composes with: deployable structure (spacecraft solar array), origami metamaterial.

**10.6.11 🆕 Soft robot simulation (Tier 1, 2)**
- Pneumatic / cable-driven / hyperelastic soft robotics.
- Production codes: SOFA framework (INRIA), MuJoCo with soft bodies (Warp soft), Chrono.
- Frontier: differentiable soft robot for learning control; NeRD-style neural simulators.
- Tier 1: soft gripper grasping a target. Tier 2: full soft robot with sensor simulation.
- Composes with: soft robot + tissue (medical), soft robot + fluid (swimming).

**10.6.12 📋 Topology optimization (Tier 1, 2)**
- SIMP and level-set topology optimization; minimize compliance subject to volume.
- Production codes: ToPy (open-source SIMP), commercial Altair OptiStruct, Generative Design (Fusion 360).
- Frontier: SIGGRAPH 2025 frontier; multi-physics topology optimization (thermo-mechanical, electromagnetic).
- Verification: Sigmund-Maute benchmark cases.
- Tier 1: 2D minimum-compliance beam. Tier 2: 3D multi-physics with adjoint sensitivity.
- Composes with: structural topology + load-case ensemble; topology + manufacturability.

### 10.7 Integration notes

- Promotes `common-elastica` from proposed to active for Cosserat rods.
- Plasticity and contact rely on Newton WU-D infrastructure.
- Topology optimization rides WU-A (autodiff for sensitivities).
- Industrial soft-robot applications would benefit from `common-usd` (Omniverse interop).

---

## 11. Fracture, Damage, and Failure Mechanics

### 11.1 Scope and distinction

Material failure under load — crack initiation, crack propagation, fragmentation, ductile tearing, fatigue, delamination. Methods: element-erosion (cheap, crude), cohesive-zone (interface-following), peridynamics (non-local), phase-field (diffuse-crack), XFEM (enriched FEM).

Distinct from solids (assumes intact material) by explicit failure model. The original adjacent-fields charter noted fracture as a major missing category; this section is the full survey.

### 11.2 Production codes

- **Peridigm** (Sandia) — peridynamics; community reference.
- **MOOSE** (Idaho National Lab) with `tensor_mechanics` and `phase_field` modules.
- **EMU** — commercial peridynamics.
- **PFM-Code** — open-source phase-field fracture.
- **PRISMS-PF** — also a phase-field fracture engine (alongside its core microstructure focus).
- **LS-DYNA, Abaqus Explicit** — commercial with cohesive elements.
- **Custom GPU implementations** in Warp / Taichi for graphics-quality fracture (e.g., Pixar's controlled-fracture work).

### 11.3 2024-2026 frontier work

- **Phase-field fracture** — Miehe et al. lineage (2010-2015) is now standard; current frontier is anisotropic fracture energy and ductile extension.
- **Peridynamics on GPU** — Madenci-Oterkus continuing lineage; coupling to FEM via "patch tests" for efficiency.
- **Differentiable fracture** — emerging for inverse problems (material identification from observed crack patterns).
- **Polycrystalline phase-field fracture** — Wang et al. 2024-2025 work coupling grain microstructure with fracture energy anisotropy.

### 11.4 Verification posture

- **Westergaard stress field** — analytic at crack tip.
- **Griffith criterion** — analytic critical stress.
- **Cattaneo-Mindlin** — sub-fracture contact.
- **Double-cantilever beam (DCB)** — mode I cohesive-zone reference.
- **Single-edge-notched tension (SENT)** — phase-field benchmark.
- **Holsapple crater scaling** — impact-crater empirical.

### 11.5 Toolchain inventory

Peridigm, MOOSE, PFM-Code, FEniCS-fracture, custom Taichi/Warp.

### 11.6 Per-phenomenon list

**11.6.1 🆕 Brittle fracture (Tier 0, 1, 2)**
- Linear-elastic fracture; mode I/II/III; stress intensity K_I/K_II/K_III.
- Verification: Westergaard analytic at crack tip; Griffith critical stress.
- Tier 0: 2D crack propagation in tension; visualize K_I evolution. Tier 1: 3D brittle fracture with branching. Tier 2: multi-crack heterogeneous.
- Composes with: glass shatter (fracture + dynamics + rendering), bone fracture, earthquake rupture (fracture + wave).

**11.6.2 🆕 Ductile tearing (Tier 1, 2)**
- Crack growth in elastic-plastic material; J-integral, damage accumulation.
- Verification: J-integral evaluation against analytic.
- Tier 1: 2D ductile crack in CT specimen. Tier 2: 3D pipe tearing under pressure.
- Composes with: pipeline failure, vehicle crash structural integrity.

**11.6.3 🆕 Fatigue crack growth (Tier 1, 2)**
- Crack growth under cyclic loading; Paris law; load-history effects.
- Verification: Paris-law calibration against empirical da/dN.
- Tier 1: 2D constant-amplitude. Tier 2: component-scale under realistic load spectrum.
- Composes with: aircraft wing fatigue, bridge fatigue.

**11.6.4 🆕 Peridynamics (Tier 0, 1, 2)**
- Non-local formulation; naturally handles cracks without re-meshing.
- Production codes: Peridigm (Sandia), EMU.
- Frontier: peridynamics-FEM coupling for efficiency.
- Verification: bar elongation analytic; two-bar collision.
- Tier 0: 2D peridynamic plate impact — visual fracture emergence. Tier 1: 3D plate impact. Tier 2: multi-scale peridynamics-FEM.
- Composes with: impact fracture, blast-induced fracture, projectile penetration.
- Repo integration: new sim. `common-mesh` for FEM coupling region; Newton-style implicit solver for stiff bond response.

**11.6.5 🆕 Phase-field fracture (Tier 0, 1, 2)**
- Diffuse-crack representation via auxiliary order parameter.
- Production codes: MOOSE Miehe-style, PRISMS-PF, FEniCS-based.
- Frontier: anisotropic fracture energy; ductile extension.
- Verification: SENT; AT1 vs. AT2 models.
- Tier 0: 2D phase-field tension — sharp-from-diffuse crack emergence. Tier 1: 3D branching. Tier 2: polycrystalline with grain boundaries.
- Composes with: crystal microstructure + fracture, composites + delamination.

**11.6.6 🆕 Impact and shatter (Tier 1, 2)**
- High-velocity collision; debris field, ejecta.
- Production codes: MPM with damage; SPH for projectile.
- Verification: Holsapple crater scaling; spall-velocity analytic.
- Tier 1: projectile-into-plate with shatter. Tier 2: hypervelocity meteorite.
- Composes with: meteor impact, demolition.

**11.6.7 🆕 Composite delamination (Tier 1, 2)**
- Interlaminar crack growth; cohesive-zone modeling.
- Production codes: Abaqus cohesive elements; custom MOOSE.
- Verification: mode I/II vs. DCB.
- Tier 1: unidirectional laminate. Tier 2: bird-strike composite wing skin.
- Composes with: aerospace structure + impact, wind-turbine blade fatigue.

**11.6.8 🆕 Bone fracture (Tier 1, 2)**
- Anisotropic heterogeneous brittle; cortical vs. trabecular.
- Production codes: custom FEM with damage; clinical research codes.
- Frontier: patient-specific from CT scans.
- Tier 1: long-bone transverse load. Tier 2: full femur with microstructure.
- Composes with: orthopedic implant, trauma soft-tissue.

### 11.7 Integration notes

High engineering-portfolio impact (mechanical, aerospace, materials). Phase-field and peridynamics admit Tier 0 instances. Most other modes are Tier 1+. Promotes `common-mesh` for unstructured fracture meshes; consumes WU-A for inverse-problem variants.

---

## 12. Gravity and Astrophysics

### 12.1 Scope and distinction

Gravitational dynamics from solar-system to cosmological scale; coupled to fluid, MHD, radiation. Methods: direct N-body, tree codes (Barnes-Hut, FMM), particle-mesh (PM), AMR-MHD for continuum coupling.

The adjacent charter covered N-body and pmwd. This catalog expands with the continuum astrophysics layer.

### 12.2 Production codes

- **GADGET-4** (Springel et al., MNRAS 506, 2021) — community-standard cosmology N-body + SPH.
- **SWIFT** (gitlab.cosma.dur.ac.uk/swift) — modern cosmology, GPU-aware.
- **pmwd** (Li et al., arXiv 2211.09958, 2022) — differentiable particle-mesh N-body in JAX.
- **PhotoNs-GPU** (Wang, RAA 2021) — fast GPU N-body.
- **Athena++** (Stone et al., ApJS 249, 2020) — AMR-MHD for astrophysics, CPU.
- **AthenaK** (Stone et al., arXiv 2409.16053, 2024) — Kokkos performance-portable; "over one billion cell updates per second for hydrodynamics in three-dimensions on a single NVIDIA Grace Hopper processor."
- **PLUTO** (Mignone et al., 2007) — MHD; CPU original.
- **gPLUTO** (Rossazza et al., arXiv 2511.20337, 2025) — "GPU-optimized implementation of the PLUTO code for computational plasma astrophysics... complete rewrite in C++ and leverages the OpenACC programming model."
- **IDEFIX** (Lesur et al., 2023) — PLUTO in Kokkos.
- **AsterX** (Sanches et al., CQG 42, 2025) — GPU GRMHD for dynamical spacetimes.
- **H-AMR** (Tchekhovskoy et al., ApJS 263, 2022) — GPU GRMHD with 3D AMR and local adaptive time-stepping.
- **GAMER** (Schive et al.) — GPU-accelerated AMR.
- **Parthenon** (Grete et al., 2023) — common framework; AthenaPK, KHARMA, Phoebus downstream.
- **FLASH, Enzo, RAMSES, AMRVAC** — broader CPU ecosystem.
- **REBOUND** (Rein & Liu, *A&A* 537, 2012) — N-body for solar-system dynamics; IAS15 integrator.

### 12.3 2024-2026 frontier work

- **Performance-portable astrophysics via Kokkos** — AthenaK, IDEFIX, AsterX all 2024-2025.
- **General-relativistic MHD on GPU** — H-AMR (2022), AsterX (2025), GRMHD modules in AthenaK companion paper (Fields et al., 2024).
- **MHD-PIC coupling** — Chen, Bai et al., MHD-PIC in Athena++ (arXiv 2304.10568, 2023); hybrid kinetic-fluid plasma.
- **Numerical relativity** — Z4c in AthenaK (Zhu et al., 2024).
- **Magnetic reconnection physics** — Beloborodov (2017) on plasma physics of reconnection in accreting black holes; arXiv 1908.08138 on radiative reconnection.
- **MHD shearing-box for accretion** — arXiv 1803.08557 on MHD instabilities in accretion disks.

### 12.4 Verification posture

- **Sod, Sedov, Brio-Wu** — shared with fluids family.
- **Orszag-Tang vortex** — canonical MHD benchmark.
- **MRI linear growth rate** — analytic for accretion-disk magneto-rotational instability.
- **Sweet-Parker scaling** — analytic reconnection rate.
- **Lagrange points and Hill sphere** — analytic three-body.
- **Schwarzschild geodesics** — GR test particle.

### 12.5 Per-phenomenon list

**12.5.1-2 📋 N-body and pmwd (Tier 0, 1, 2)** — Covered in adj charter § 8. N-body has Tier 0 (Barnes-Hut 2D), Tier 1 (3D PM), Tier 2 (full cosmology with GADGET-4 vendoring).

**12.5.3 🆕 Continuum MHD (Tier 0, 1, 2)**
- Ideal and resistive magnetohydrodynamics; fluid + magnetic field.
- Production codes: Athena++, gPLUTO, AthenaK, FLASH MHD, NIRVANA.
- Frontier: Kokkos performance-portability; GR coupling; ML closures.
- Verification: Orszag-Tang vortex; Brio-Wu shock tube.
- Tier 0: 2D Orszag-Tang. Tier 1: 3D MHD with AMR; field-line visualization. Tier 2: vendored Athena++/PLUTO.
- Composes with: solar flare (MHD + reconnection + radiation), accretion disk (MHD + gravity), interstellar medium turbulence.
- Repo integration: new sim under `astrophysics/continuum-mhd/`. Promotes `common-amr`. WU-A differentiable variant for inverse problems.

**12.5.4 🆕 Accretion disk dynamics (Tier 2)**
- Differentially-rotating MHD around compact object; magneto-rotational instability (MRI) drives turbulence.
- Production codes: Athena++, AthenaK, H-AMR; shearing-box and global disk test problems.
- Frontier: MHD shearing-box (arXiv 1803.08557); magnetically-elevated disks with radiation; radiation-MHD coupling.
- Verification: MRI linear growth rate.
- Tier 0: N/A. Tier 1: 3D shearing-box MRI turbulence. Tier 2: global disk around black hole (vendored AthenaK + H-AMR mesh).
- Composes with: accretion + GR (GRMHD), accretion + radiation (radiation-MHD), accretion + jet launching.

**12.5.5 🆕 Magnetic reconnection (Tier 1, 2)**
- Topological change of magnetic field; conversion of magnetic to plasma kinetic+thermal energy.
- Production codes: PIC (kinetic), MHD with resistivity (continuum), hybrid.
- Frontier: turbulence-mediated reconnection rates ~10× plasmoid-mediated MHD; arXiv 1908.08138 radiative reconnection in black-hole coronae.
- Verification: Sweet-Parker scaling.
- Tier 0: 2D anti-parallel reconnection — visible X-point. Tier 1: 3D resistive MHD. Tier 2: radiation-reconnection.
- Composes with: solar flare (5-sim signature § 30.x), magnetosphere, accretion coronae.

**12.5.6 🆕 Solar surface convection / granulation (Tier 1, 2)**
- Convective cells on photosphere; granulation, supergranulation.
- Production codes: Stagger (Stein et al. 2024).
- Verification: granule size distribution vs. observation.
- Tier 1: 2D convective cell. Tier 2: 3D radiative MHD of solar surface.
- Composes with: sunspots, solar flares (granulation + reconnection).

**12.5.7 🆕 Tidal disruption events (Tier 2)**
- Star torn apart by tidal field of black hole; flare and disk formation.
- Production codes: H-AMR, AsterX; SPH for star structure.
- Verification: Roche-limit analytic; light curve power law.
- Tier 2: SPH-star + GRMHD-spacetime.
- Composes with: TDE + radiation, TDE + jet.

**12.5.8 🆕 Three-body and orbital mechanics (Tier 0, 1)**
- Restricted three-body, full three-body; chaos; orbital resonances.
- Production codes: REBOUND (Rein & Liu 2012); IAS15 integrator.
- Verification: Lagrange points; Hill sphere.
- Tier 0: restricted three-body real-time with phase-space. Tier 1: multi-planet secular evolution.
- Composes with: solar system + tidal, exoplanet stability.
- Repo integration: new sim. Stack B Tier 0 + Stack E Tier 1.

**12.5.9 🆕 Galaxy collision (Tier 1, 2)**
- Mergers of disk galaxies; tidal tails, gas dynamics, star formation.
- Production codes: GADGET-4, SWIFT.
- Frontier: coupled feedback (supernovae, AGN), chemistry.
- Tier 1: pure N-body with tidal features. Tier 2: SPH+N-body with chemistry/feedback.
- Composes with: galaxy + dust, galaxy + star formation, galaxy flagship (6+-sim § 31.x).

**12.5.10 🆕 Astrophysical blast waves (Tier 1, 2)**
- Supernova remnant; Sedov, radiative phases.
- Production codes: Athena++, FLASH, PLUTO.
- Verification: Sedov-Taylor analytic.
- Tier 1: 3D SNR with shock-driven instability. Tier 2: multi-physics SN with cosmic rays + radiation.
- Composes with: SNR + ISM, blast + radiation.

**12.5.11 🆕 Coronal mass ejection (CME) propagation (Tier 2)**
- Solar wind eruption propagating outward; magnetic flux rope; Earth impact.
- Production codes: ENLIL, EUHFORIA, SWMF.
- Frontier: coupled solar surface → heliosphere → magnetosphere prediction (space-weather pipeline).
- Tier 2: vendored ENLIL or EUHFORIA for inner heliosphere.
- Composes with: solar + wind + magnetosphere (space-weather flagship).

### 12.6 Integration notes

Astrophysics has the most mature production-code ecosystem for GPU. Most Tier 2 entries are ports/vendorings. Tier 0 instances are typically 2D canonical test problems. Promotes `common-amr`, `common-fmm` (for FMM in large-N N-body), `common-spectral`.

---

## 13. Plasma, Particle-in-Cell, and Continuum MHD

### 13.1 Scope and distinction

Plasma on GPU — PIC for kinetic regimes (collisionless or weakly collisional), MHD for continuum (overlap with § 12), hybrid (kinetic ions + fluid electrons), and gyrokinetic for fusion-engineering.

The adjacent charter covered PIC. This catalog adds continuum and applied-fusion phenomena.

### 13.2 Production codes

- **WarpX** (Vay et al., Phys. Plasmas 28, 2021) — exascale PIC; Berkeley.
- **PIConGPU** (Bussmann et al., SC 2013) — HZDR; GPU PIC.
- **GTC** (Lin et al., Science 1998 lineage) — gyrokinetic for fusion; modern GPU port.
- **Smilei** — open-source PIC, Polytechnique.
- **OSIRIS, VPIC, HiPACE++** — broader PIC ecosystem.
- **BOUT++** — edge plasma fluid for fusion.
- **SOLPS-ITER** — scrape-off-layer simulation for ITER design.
- **XGC** — gyrokinetic edge for fusion.
- **MHD codes** — see § 12.

### 13.3 Frontier work

- **WarpX hybrid for Hall thrusters** — Marks & Gorodetsky (*J. Electric Propulsion* 2025) — hybrid PIC-fluid for electric propulsion.
- **MHD-PIC** — Chen, Bai et al. (arXiv 2304.10568, 2023) — Athena++ MHD-PIC.
- **Adaptive streamer discharge** — Afivo (Teunissen et al.) — atmospheric breakdown.

### 13.4 Per-phenomenon list

**13.4.1 📋 PIC electrostatic and electromagnetic (Tier 0, 1, 2)**
- Covered in adj charter § 9. Tier 0: 2D two-stream instability. Tier 1: 3D plasma wave with WarpX-like algorithm. Tier 2: vendored WarpX laser-plasma.

**13.4.2 🆕 Tokamak edge / divertor (Tier 2)**
- Scrape-off layer, divertor heat flux, ELMs (edge-localized modes).
- Codes: BOUT++, SOLPS-ITER, XGC.
- Frontier: coupling kinetic edge to fluid core; ML for plasma-wall interaction.
- Tier 2: reduced edge model on realistic tokamak.
- Composes with: edge plasma + divertor + wall sputtering (tokamak signature § 30.x).

**13.4.3 🆕 Hall thruster simulation (Tier 1, 2)**
- Crossed E×B ion acceleration; plume.
- Codes: WarpX hybrid (Marks & Gorodetsky 2025); custom Hall thruster codes.
- Frontier: ML-augmented thruster design.
- Tier 1: 2D axisymmetric. Tier 2: full 3D with plume.
- Composes with: spacecraft thruster + plume + charging.

**13.4.4 🆕 Lightning and streamer discharge (Tier 1, 2)**
- Atmospheric breakdown; streamer-to-leader; fractal patterns.
- Codes: Afivo (Teunissen et al.); custom.
- Frontier: cloud microphysics coupling; sprite/elve high-altitude discharge.
- Verification: streamer velocity vs. field; branching statistics.
- Tier 0: 2D streamer with branching — striking. Tier 1: 3D leader. Tier 2: cloud + lightning + sprites.
- Composes with: lightning + cloud microphysics, lightning + atmospheric chemistry (NOx production).

**13.4.5 🆕 Inertial confinement fusion (ICF) (Tier 2)**
- Laser-driven implosion; Rayleigh-Taylor, ablation, ignition.
- Codes: HYDRA (LLNL, closed), DRACO (Rochester), commercial / classified.
- Frontier: hybrid hydro+ML for surrogate; NIF data assimilation.
- Tier 2: reduced ICF capsule implosion.
- Composes with: laser + plasma + hydro + radiation.

**13.4.6 🆕 Magnetic confinement fusion / burning plasma (Tier 2)**
- Tokamak plasma in full burning regime; alpha-particle heating, instabilities.
- Codes: GTC (gyrokinetic), GENE, ORB5.
- Frontier: ITER operational predictions; SPARC commercial fusion.
- Tier 2: reduced tokamak burning plasma.
- Composes with: tokamak edge + core + alpha heating.

### 13.5 Integration notes

Adjacent charter § 9 anchors PIC; this section adds tokamak edge, Hall thrusters, lightning, ICF, burning plasma. Most Tier 2 with vendored upstream. PIC promotes `common-em` (Maxwell solver core); `common-fmm` for long-range Coulomb in large-N regimes.

---

## 14. Electromagnetism and Optics

### 14.1 Scope and distinction

Maxwell's equations on GPU — FDTD (full-wave time-domain), frequency-domain solvers, geometric/ray optics, photonics, plasmonics, antennas, liquid crystals. Distinct from waves family (§ 15) by vector nature of EM and presence of polarization.

The adjacent charter covered FDTD and photonic inverse design. This expansion adds geometric optics, polarization, plasmonics, antennas, and liquid crystals.

### 14.2 Production codes

- **MEEP** (MIT) — open-source FDTD; the academic reference; adjoint support recently added.
- **gprMax** — ground-penetrating radar FDTD; open-source.
- **OpenEMS** — open-source FDTD for antennas/RF.
- **Tidy3D** (Flexcompute) — GPU-native commercial FDTD with cloud architecture and autodiff for inverse design; benchmark studies (Lu et al., arXiv 2506.16665, 2025) report significant speed advantage over Lumerical.
- **Lumerical FDTD** (Ansys) — commercial gold standard for photonics.
- **fdtd-z** (Lu et al.) — open-source CUDA FDTD with systolic update.
- **Zemax, CodeV, Synopsys CODE V** — commercial ray-tracing for lens design.
- **OpticsPy** — open-source ray tracing.
- **Mitsuba 3** — differentiable rendering; supports polarization mode (also in radiation transport § 20).

### 14.3 Frontier work

- **GPU FDTD performance** — *Optica OPN* September 2024 — "20 Gcells/s on an NVIDIA A100 SXM GPU and up to 33 Gcells/s on an H100 SXM GPU" for basic FDTD.
- **Large-scale photonic inverse design** — *Nanophotonics* 2024 — "2.09 billion grid cells with 64,275 time steps can be computed in approximately 3 min, which would take approximately 27 h on 96 processors in a traditional CPU-based FDTD."
- **Differentiable photonics** — Tidy3D autodiff (cuda_ad_rgb), Meep adjoint, fdtd-z gradient backpropagation.
- **Polarization-aware rendering** — Mitsuba 3 polarization variant.
- **Transient rendering** — mitransient (arXiv 2510.25660, 2025) — "transient light transport in Mitsuba 3... extends conventional rendering by adding a temporal dimension which accounts for the time of flight of light."

### 14.4 Verification posture

- **Mie scattering** — analytic for sphere; standard FDTD benchmark.
- **Half-wave dipole pattern** — analytic far-field.
- **Snell's law / thin-lens** — analytic geometric optics.
- **Quarter-wave plate** — analytic polarization.
- **Bloch band structure** — analytic for periodic photonic crystal.
- **Frederickson transition voltage** — analytic for nematic LC.

### 14.5 Per-phenomenon list

**14.5.1 📋 FDTD electromagnetic (Tier 0, 1, 2)** — Covered in adj charter § 10. Tier 0: 2D waveguide. Tier 1: 3D photonic component. Tier 2: vendored Meep / Tidy3D port.

**14.5.2 📋 Photonic inverse design (Tier 1, 2)** — Covered in adj charter § 18. Tier 1: 2D adjoint optimization. Tier 2: 3D metasurface design.

**14.5.3 🆕 Geometric optics / ray-tracing lens design (Tier 0, 1)**
- High-frequency Maxwell limit; ray tracing through lenses, mirrors, prisms.
- Codes: Zemax, CodeV (commercial); OpticsPy.
- Frontier: coupled diffraction-at-aperture (wave-optics correction).
- Verification: Snell, thin-lens.
- Tier 0: 2D ray-tracing through compound lens; aberrations. Tier 1: 3D lens design with optimization.
- Composes with: lens + sensor (camera simulation), microscope optical train.

**14.5.4 🆕 Polarization and birefringence (Tier 0, 1)**
- Vector EM in anisotropic media; calcite, liquid crystals, stress birefringence.
- Codes: Mitsuba 3 polarization mode; FDTD with anisotropic tensor.
- Verification: quarter-wave plate.
- Tier 0: 2D crossed polarizer demo with anisotropic medium. Tier 1: photo-elasticity stress on 3D part.
- Composes with: photoelasticity (stress + polarization), LCD (LC + polarization).

**14.5.5 🆕 Plasmonics and nano-optics (Tier 1, 2)**
- Sub-wavelength metal-light; surface plasmons, nano-antennas.
- Codes: Tidy3D plasmonics; Meep with Drude metal; Lumerical.
- Verification: Mie analytic for plasmonic sphere.
- Tier 1: nano-particle scattering. Tier 2: metasurface adjoint optimization.
- Composes with: plasmonic + sensing (biosensors), plasmonic + thermal (photothermal therapy).

**14.5.6 🆕 Antenna radiation patterns (Tier 1)**
- Far-field; gain, polarization, beam-forming.
- Codes: OpenEMS; Lumerical RF, Tidy3D microwave.
- Verification: half-wave dipole analytic pattern.
- Tier 1: patch and dipole with 3D far-field.
- Composes with: antenna + structure (mutual coupling), antenna + propagation (link budget).

**14.5.7 🆕 Liquid crystal director fields (Tier 1)**
- Continuum nematic, smectic, cholesteric dynamics; Frank-Oseen elasticity.
- Codes: OpenQmin; research codes.
- Frontier: active nematics (driven biological — cytoskeleton).
- Verification: Frederickson transition; defect-line types.
- Tier 1: 2D nematic with defect annihilation.
- Composes with: LCD (LC + electric field + polarization), active nematic (LC + activity).

**14.5.8 🆕 Transient light transport (Tier 2)**
- Time-of-flight rendering; fluorescence lifetime imaging; non-line-of-sight imaging.
- Codes: mitransient (arXiv 2510.25660, 2025) — Mitsuba 3 extension.
- Frontier: non-line-of-sight imaging; transient inverse rendering.
- Tier 2: 3D transient scene with reconstructed time-of-flight signal.
- Composes with: transient + sensor (LiDAR simulation), transient + scattering medium.

### 14.6 Integration notes

Promotes `common-em` to actual. WU-A for differentiable inverse design. WU-C bridges to rendering for polarization and transient.

---

## 15. Waves (Acoustic, Elastic, Quantum, Water)

### 15.1 Scope and distinction

Wave-equation phenomena unified by ∂²u/∂t² = c²∇²u with extensions. Sub-families: acoustic, elastic/seismic, quantum (Schrödinger), water (surface waves), phononic crystals, BEC/Gross-Pitaevskii.

The adjacent charter covered acoustic, seismic, and quantum. This expansion adds phononic crystals, acoustic levitation, whispering gallery modes, BEC/GPE, and superfluid vortex.

### 15.2 Production codes

- **k-Wave** (Treeby et al.) — open-source acoustic; HIFU clinical applications.
- **SeisSol** (TUM) — open-source DG seismic; GPU-aware.
- **SPECFEM3D / SPECFEM3D_GLOBE** (Princeton) — spectral-element seismic; community standard.
- **GPELab** (Antoine & Duboscq, *CPC* 185, 2014) — MATLAB toolbox for GPE.
- **GPUE** (Schloss et al., *JOSS* 2018) — "GPU Gross-Pitaevskii Equation numerical solver for Bose-Einstein condensates... CUDA-enabled non-linear Schrödinger solver."
- **TrotterSuzuki** — GPU quantum simulator.
- **Custom acoustic codes** for HIFU, audio, sonar.

### 15.3 Frontier work

- **GPE-LLL projection for vortex lattice** — Le & Nguyen (arXiv 2511.13212, 2025) — "GPU-accelerated variational framework with exact projection onto the Lowest Landau Level to probe vortex patterns in rapidly rotating two-dimensional Bose-Einstein condensates... faithfully reproduces Abrikosov vortex lattices."
- **Vortex knots in BEC** — arXiv 1110.5757.
- **Topological phononic insulators** — emerging 2024-2025.
- **HIFU treatment planning** — clinical k-Wave applications.

### 15.4 Per-phenomenon list

**15.4.1 📋 Acoustic (k-Wave) (Tier 0, 1, 2)** — Adj charter § 11. Tier 0: 2D acoustic propagation. Tier 1: 3D HIFU focal spot. Tier 2: vendored k-Wave.

**15.4.2 📋 Seismic (SeisSol, SPECFEM3D) (Tier 1, 2)** — Adj charter § 11. Tier 1: 2D crustal earthquake. Tier 2: full SeisSol-port.

**15.4.3 📋 Quantum Schrödinger SSFM (Tier 0, 1, 2)** — Adj charter § 11. Tier 0: 1D wave packet on barrier. Tier 1: 2D Schrödinger with potential. Tier 2: 3D with sparse domain.

**15.4.4 📋 Water wave tank / ship wake (Tier 0, 1)** — Covered also in fluids § 9.7.20.

**15.4.5 🆕 Phononic crystals (Tier 1, 2)**
- Periodic structures with phononic bandgaps; mechanical analogue of photonic crystals.
- Codes: FEM on periodic mesh; custom Warp/Taichi.
- Frontier: topological phononic insulators.
- Verification: Bloch band-structure analytic.
- Tier 1: 2D band structure. Tier 2: 3D acoustic metamaterial with topological mode.
- Composes with: phononic + thermal (conductivity engineering), phononic + catalysis.

**15.4.6 🆕 Acoustic levitation (Tier 1)**
- Radiation pressure levitation.
- Codes: BEM-FEM custom.
- Verification: King's formula for sphere radiation force.
- Tier 0: 2D field above transducer array. Tier 1: 3D levitator design.
- Composes with: acoustic + droplet manipulation (chemistry), acoustic tweezers + cell.

**15.4.7 🆕 Whispering gallery modes (Tier 0, 1)**
- Modes trapped near curved boundary; dome cathedrals, optical microspheres.
- Codes: eigenvalue solver on cylindrical geometry.
- Verification: Bessel analytic for circular cavity.
- Tier 0: 2D WGM viz. Tier 1: 3D optical microsphere with WGM lasing.
- Composes with: WGM + nonlinearity (frequency comb), WGM + biological sensing.

**15.4.8 🆕 Bose-Einstein condensate / Gross-Pitaevskii (Tier 0, 1, 2)**
- Nonlinear Schrödinger for cold-atom BEC; vortex dynamics, superfluid turbulence.
- Codes: GPELab (Antoine & Duboscq 2014); GPUE (Schloss et al. 2018); TrotterSuzuki.
- Frontier: Le & Nguyen (arXiv 2511.13212, 2025) — Abrikosov vortex lattices via LLL projection.
- Verification: Thomas-Fermi ground state; Abrikosov density.
- Tier 0: 2D BEC with rotation — visible vortex lattice — striking. Tier 1: 3D with vortex knot (arXiv 1110.5757). Tier 2: multi-component BEC with spin-orbit.
- Composes with: BEC + optical lattice, superfluid + reservoir.

**15.4.9 🆕 Superfluid vortex dynamics (Tier 1, 2)**
- Helium quantum vortices; turbulence at quantum scale.
- Codes: GPE-based (GPUE, GPELab); biot-Savart filament.
- Frontier: vortex reconnection; arXiv 2010.04549 single-vortex precession.
- Tier 0: 2D vortex annihilation. Tier 1: 3D vortex tangle as quantum turbulence model.
- Composes with: quantum turbulence + classical turbulence comparison.

### 15.5 Integration notes

Heavy `common-spectral` consumer (FFT-based SSFM, pseudospectral). BEC promotes `common-stochastic` via Truncated Wigner methods. Tier 2 anchored by k-Wave, SPECFEM3D, GPUE vendoring.

---

## 16. Heat Transfer and Phase Change

### 16.1 Scope and distinction

Heat equation (pure conduction), conjugate heat transfer (solid+fluid), phase change (Stefan problem — melting/solidification), Rayleigh-Bénard convection, additive manufacturing thermal, battery thermal. Multi-physics-rich: nearly every phenomenon couples to thermal at sufficient fidelity.

### 16.2 Production codes

- **OpenFOAM chtMultiRegionFoam** — conjugate heat transfer.
- **ANSYS Fluent, Star-CCM+** — commercial CFD with thermal.
- **PRISMS-PF, MOOSE phase_field** — solidification phase-field.
- **KiSSAM** (Levkin et al., *Progress in Additive Manufacturing* 2024) — "simulation package for additive manufacturing that implements the known mathematical models in 3D on a GPU with high performance. KiSSAM includes an implementation of lattice Boltzmann method (LBM) optimized for a GPU; a dynamic mesh for the melt pool; an adaptive mesh for the heat solver; a GPU-powered ray tracer and Monte-Carlo scattering solver for beam absorption; and a high-performance DEM solver for powder particle deposition."
- **ExaCA** (ORNL) — AM microstructure on GPU with Kokkos.
- **Finch** (ORNL) — heat transfer and melt pool for AM; "C++ tool that simulates heat transfer and melt pool dynamics in additive manufacturing... built on the Cabana library with Kokkos."
- **COMSOL Battery Module** — commercial battery thermal-electrochemical.

### 16.3 Frontier work

- **GPU melt-pool LBM** — KiSSAM 2024 cited above.
- **Part-scale AM thermal** — Lu et al. (*JMPS* 2020) — matrix-free FVM for laser powder bed fusion.
- **Thermomechanical AM with residual stress** — Friedrich et al. (*Computational Mechanics* 2023) — GPU-accelerated residual stress prediction.
- **Path-level thermal history at scale** — arXiv:2308.02473.

### 16.4 Per-phenomenon list

**16.4.1 🆕 Heat equation (Tier 0, 1)**
- Pure conduction; canonical PDE pedagogy.
- Verification: analytic for canonical geometries.
- Tier 0: 2D interactive; click to seed sources. Tier 1: 3D with realistic BCs.
- Composes with: everything — bedrock pedagogical pre-requisite.

**16.4.2 🆕 Conjugate heat transfer (Tier 1, 2)**
- Fluid + solid thermal at boundaries.
- Codes: OpenFOAM chtMultiRegionFoam.
- Tier 1: electronics chip on heatsink with airflow. Tier 2: full chip-package thermal.
- Composes with: battery thermal management, data center cooling, gas turbine blade.

**16.4.3 🆕 Stefan problem — melting / freezing (Tier 0, 1, 2)**
- Phase change with moving interface; latent heat.
- Codes: phase-field (PRISMS-PF, MOOSE); enthalpy method.
- Verification: 1D Stefan analytic.
- Tier 0: 2D Stefan ice melting. Tier 1: 3D ice growth on substrate. Tier 2: AM melt pool full coupling.
- Composes with: welding (Stefan + plasticity + thermal), permafrost thaw, lake ice.

**16.4.4 🆕 Welding pool dynamics (Tier 1, 2)**
- Laser/arc weld pool with Marangoni convection, vaporization, solidification.
- Codes: KiSSAM, custom multi-physics CFD.
- Tier 1: single-track weld pool. Tier 2: multi-pass with residual stress.
- Composes with: Welding = Stefan + Marangoni + thermal + plasticity. Canonical 4-physics composition.

**16.4.5 🆕 Additive manufacturing thermal (Tier 2)**
- Powder-bed fusion thermal history; layer-by-layer.
- Codes: KiSSAM, ExaCA, Finch — all GPU and from major facilities.
- Frontier: coupled part-scale + powder-scale.
- Tier 1: reduced part-scale. Tier 2: full powder-scale with melt + microstructure.
- Composes with: AM = melt pool + dendrite + thermal + plasticity + residual stress. Canonical 5-physics signature composition.

**16.4.6 🆕 Battery thermal runaway (Tier 1, 2)**
- Lithium-ion thermal-electrochemical instability; venting.
- Codes: COMSOL Battery Module; research codes.
- Frontier: ML cell-level prediction; multi-physics pack simulation.
- Tier 1: single-cell initiation. Tier 2: pack propagation.
- Composes with: battery thermal + electrochemistry + structural + venting (battery signature composition).

**16.4.7 🆕 Rayleigh-Bénard convection (Tier 0, 1, 2)**
- Heated-plate convection cells.
- Codes: spectral codes; any incompressible CFD.
- Verification: critical Rayleigh.
- Tier 0: 2D cells at critical Ra. Tier 1: 3D turbulent. Tier 2: high-Ra geophysical analog (mantle, ocean convection).
- Composes with: RB + magnetic field (magnetoconvection), RB + rotation (planetary convection).

**16.4.8 🆕 Snow and ice formation (Tier 1)**
- Snowflake growth from supersaturated vapor; ice habits.
- Codes: phase-field with anisotropic surface energy.
- Tier 0: 2D snowflake — iconic. Tier 1: 3D habit study.
- Composes with: snow + atmospheric microphysics, snow + albedo.

**16.4.9 🆕 Cloud condensation microphysics (Tier 1, 2)**
- Aerosol-droplet-ice-precipitation in clouds.
- Codes: sub-grid in atmospheric models; bin-resolved.
- Tier 1: 2D cloud parcel. Tier 2: 3D LES of cumulus.
- Composes with: cloud + atmospheric dynamics, cloud + lightning, cloud + chemistry.

### 16.5 Integration notes

Thermal is the most universal coupling partner. `common-ode` for stiff thermal-chemistry; `common-amr` for AM mesh adaptation; phase-field shared with materials family (§ 10).

---

## 17. Chemistry, Molecular Dynamics, and Matter

### 17.1 Scope and distinction

Molecular-to-mesoscopic chemical and physical processes. Reaction-diffusion (continuous), molecular dynamics (atomistic), DFT (electronic structure), stochastic kinetics (discrete reaction events), plus crystal growth, polymer dynamics, self-assembly, spinodal decomposition.

The adjacent charter covered MD, DFT, and stochastic kinetics. This catalog expands MD heavily (MLIPs are the biggest frontier shift since the charter), and adds polymer, self-assembly, etc.

### 17.2 Production codes — molecular dynamics

- **GROMACS** — community standard; production GPU since 2020+; GPU FEP added 2024-2025.
- **OpenMM** — Stanford; GPU-native, widely used.
- **LAMMPS** — community standard for materials MD.
- **AMBER** — biomolecular MD; GPU-accelerated.
- **NAMD** — biomolecular MD; CUDA-native.
- **HOOMD-blue** — University of Michigan; GPU-native MD for soft matter.
- **MARTINI** — coarse-grained force field; Souza et al.
- **JAX-MD** (Schoenholz & Cubuk, NeurIPS 2020) — "software package for performing differentiable physics simulations with a focus on molecular dynamics... entire trajectories can be differentiated to perform meta-optimization."

### 17.3 Production codes — MLIPs (machine-learning interatomic potentials)

The biggest frontier shift since the adjacent charter. The MLIP ecosystem now occupies the Pareto frontier of accuracy vs. compute for many systems:

- **NequIP** (Batzner et al., *Nat. Commun.* 13, 2022) — E(3)-equivariant message-passing GNN. "A major backwards-incompatible update was released as version v0.7.0 in April 2025." Trains via LAMMPS integration through ML-IAP and pair_nequip_allegro.
- **Allegro** (Musaelian et al.) — local equivariant; complementary to NequIP.
- **MACE** (Batatia et al., NeurIPS 2022) — higher-body-order equivariant message passing. "MACE supports CUDA acceleration with the cuEquivariance library." MACE-MP-0 is the foundation model.
- **GRACE** — graph extensions to atomic cluster expansion.
- **MatterSim** — Microsoft Research; invariant GNN based on M3GNet.
- **SevenNet** — scalable equivariant with GPU-parallelism, NequIP-based.
- **ORB** — non-conservative, invariant; predicts forces directly.
- **GAP** — Gaussian approximation potentials; older but still production.
- **MTP** — moment tensor potentials.
- **ACE** (linear and nonlinear) — atomic cluster expansion.

**Benchmark finding** (Leimeroth et al., arXiv 2505.02503, 2025): "nonlinear ACE, and the equivariant message-passing graph neural networks NequIP and MACE form the Pareto front in the accuracy vs. computational cost trade-off... GPUs can massively accelerate the MLIPs, bringing them on par with and even ahead of non-accelerated classical interatomic potentials."

**Foundation model databases**: Materials Project, Alexandria Database, Open Materials 2024 (OMat24), Open Molecules 2025 (OMol25).

### 17.4 Production codes — DFT and electronic structure

- **CP2K** — large-scale DFT, GPU-aware.
- **VASP** — commercial DFT, widely used.
- **Quantum ESPRESSO** — open-source DFT.
- **GPAW** — open-source DFT in Python.
- **NWChem** — open-source DFT for chemistry.
- **DFT++ / Octopus** — TDDFT.

### 17.5 Frontier work

- **MLIP foundation models** — MACE-MP-0, GRACE-MP, MatterSim, SevenNet, ORB foundation models trained on combinations of Materials Project + Alexandria + OMat24 + OMol25 (arXiv 2511.05337, 2025).
- **Fine-tuning workflows** — Universal MLIPs fine-tuned for task-specific accuracy; tutorials on MACE-MP-0 fine-tuning (arXiv 2506.21935, 2025).
- **Differentiable MD** — JAX-MD lineage; Brax (RL-focused); Schoenholz et al. lineage.
- **GPU FEP for drug binding** — *ACS Omega* 2025 — GROMACS GPU FEP "up to nearly 800% improvement on Nvidia A100... End-to-end absolute binding free-energy calculations reduced from 400 h to around 48 h on the A100 GPU."

### 17.6 Per-phenomenon list

**17.6.1 ✅ Reaction-diffusion 2D/3D (Tier 0, 1, 2)** — Already in portfolio (RD-2D is the Layer 4 reference). Tier 0: 2D Gray-Scott. Tier 1: 3D RD. Tier 2: large-scale RD with sparse domain.

**17.6.2 📋 Molecular dynamics — classical (Tier 0, 1, 2)** — Covered in adj § 7. Tier 0: 2D LJ. Tier 1: protein-in-water with PME. Tier 2: vendored GROMACS or OpenMM.

**17.6.3 🆕 MD with machine-learning interatomic potentials (MLIPs) (Tier 1, 2)**
- MLIP-driven MD; foundation-model fine-tuning.
- Codes: NequIP, Allegro, MACE, GRACE, MatterSim, SevenNet, ORB. LAMMPS integration via ML-IAP.
- Frontier: foundation-model fine-tuning (MACE-MP-0 tutorial arXiv 2506.21935); universal-MLIP scaling.
- Tier 1: small protein with MLIP force field. Tier 2: materials-scale MD with MACE/NequIP at production scale.
- Composes with: drug binding (MD + MLIP + FEP), materials discovery (MD + MLIP + screening).
- Repo integration: **major addition**. New sim under `chemistry/md-mlip/`. Promotes `common-mlip` to actual. Heavy WU-A and WU-E consumption.

**17.6.4 🆕 Free-energy perturbation (FEP) drug binding (Tier 2)**
- Alchemical free-energy calculation for ligand binding affinity.
- Codes: GROMACS GPU FEP (2024-2025); OpenMM with FEP; Amber GPU.
- Frontier: GPU FEP performance — ~800% speedup over 32-core CPU; FEP-on-GPU-Workflow open-source.
- Verification: experimental binding affinities from PDB.
- Tier 2: ligand-protein FEP pipeline.
- Composes with: drug binding signature composition (MD + FEP + sampling).

**17.6.5 📋 DFT electronic structure (Tier 1, 2)** — Adj § 19. Tier 1: small molecule DFT. Tier 2: vendored CP2K or QE.

**17.6.6 📋 Stochastic chemical kinetics (Tier 0, 1, 2)** — Adj § 15. Tier 0: Gillespie SSA. Tier 1: large-population Tau-leaping. Tier 2: spatial SSA at scale.

**17.6.7 🆕 Crystal growth from solution (Tier 1)** — Bulk crystal growth (Bridgman, Czochralski); see also § 10.6.7. Tier 1: 3D Czochralski-like with rotation.

**17.6.8 🆕 Diffusion-limited aggregation (DLA) (Tier 0, 1)**
- Stochastic stick-growth fractals.
- Codes: custom Monte Carlo.
- Verification: 2D fractal dimension ~1.71.
- Tier 0: 2D DLA real-time — classic fractal. Tier 1: 3D with various seeds.
- Composes with: DLA + electrochemistry (electrodeposition), DLA + viscous fingering.

**17.6.9 🆕 Spinodal decomposition (Tier 0, 1)**
- Cahn-Hilliard demixing.
- Codes: PRISMS-PF (one of 29 modules).
- Verification: Cahn-Hilliard linear stability.
- Tier 0: 2D demixing — visible coarsening. Tier 1: 3D alloy phase separation.
- Composes with: alloy microstructure (spinodal + grain growth), polymer blend.

**17.6.10 🆕 Polymer chain dynamics (Tier 1, 2)**
- Coarse-grained: reptation, Rouse, Zimm.
- Codes: LAMMPS bead-spring; HOOMD-blue.
- Frontier: ML coarse-graining of atomistic polymer.
- Verification: Rouse mode spectrum.
- Tier 1: polymer melt with entanglements. Tier 2: industrial polymer rheology.
- Composes with: polymer + flow (rheology), polymer + plasticity.

**17.6.11 🆕 Liquid crystal phases** — Equilibrium phases; see § 14.5.7 for dynamics.

**17.6.12 🆕 Self-assembly: lipid bilayers / micelles (Tier 1, 2)**
- Amphiphile aggregation; bilayer formation; micelle equilibria.
- Codes: MARTINI coarse-grained MD (Souza et al.); custom GPU.
- Frontier: membrane elasticity coupling.
- Tier 1: bilayer self-assembly. Tier 2: large-scale membrane.
- Composes with: bilayer + protein (membrane biology), bilayer + electric field (lipid raft).

### 17.7 Integration notes

The biggest single addition in this catalog beyond the original adjacent charter is **MD with MLIPs**. The MLIP frontier moves quickly; the `common-mlip` module is the principal new infrastructure investment. Heavy WU-A and WU-E consumption.

---

## 18. Life, Biology, and Cardiac Electrophysiology

### 18.1 Scope and distinction

Biological systems — molecular biology (under MD/DFT/kinetics) up to ecosystem dynamics. Sub-families: cardiac, morphogenesis, tumor growth, microswimmers, neural fields, ecology.

The adjacent charter covered cardiac and crowd. This expansion adds tumor, morphogenesis, neural fields, microswimmers, tissue mechanics, and details the cardiac digital-twin pipeline as a substantial subsection.

### 18.2 Production codes

- **openCARP** (Plank et al., *Comp Methods Programs Biomed* 208, 2021) — "the openCARP simulation environment for cardiac electrophysiology"; community standard; widely used in clinical digital-twin research.
- **PhysiCell** (Ghaffarizadeh et al., *PLOS Comp Bio* 2018) — "open source physics-based cell simulator for 3-D multicellular systems."
- **CompuCell3D** (Swat et al.) — Glazier-Graner-Hogeweg cellular Potts.
- **Morpheus** (Starruß et al.) — CPM-based morphogenesis.
- **Chaste** (Oxford) — multi-scale biology.
- **Biocellion** — commercial multi-scale biology.
- **NEURON, NEST, Brian2** — neural simulation.

### 18.3 Frontier work — cardiac digital twins

- **openCARP-PINNs** — *Springer 2024-2025* — PINN acceleration of openCARP signal propagation.
- **Cardiac digital twins for atrial fibrillation outcome** — Zolotarev et al. *MIDL* 2024 — Siamese multi-modal fusion.
- **Personalized heart digital twins for scar-dependent VT** — *Circulation* 2025 — "first prospective analysis of digital twin technology in predicting critical substrate abnormalities in VT... 18 patients with scar-dependent VT undergoing catheter ablation."
- **12-lead ECG + MRI personalization** — Camps et al. *Med Image Anal* 2024 — "Harnessing 12-lead ECG and MRI data to personalise repolarisation profiles in cardiac digital twin models for enhanced virtual drug testing."
- **Cardiac digital twins at UK Biobank scale** — *PLOS One* 2025 — ~55,000 participant pipeline; 1,423 representative meshes across sex, BMI, age.

### 18.4 Frontier work — other biology

- **GPU cellular Potts** — Sultan et al. (arXiv 2312.09317, 2023) — "parallelized cellular Potts model that enables simulations at tissue scale... 3-4 orders of magnitude faster than serial implementations... tissue-scale models of liver and lymph node containing millions of cells."
- **Multi-scale tumor models** — PhysiCell with intracellular signaling.

### 18.5 Per-phenomenon list

**18.5.1 📋 Cardiac excitable media — basic (Tier 0, 1, 2)** — Adj § 13. Tier 0: 2D Fenton-Karma spiral wave. Tier 1: 3D ventricle with monodomain. Tier 2: vendored openCARP-port.

**18.5.2 🆕 Cardiac digital twin pipeline (Tier 2)**
- Full personalization: MRI/CT geometry → fiber orientation → electrophysiology → ECG forward problem → inverse calibration to patient ECG.
- Codes: openCARP for forward; Camps et al. 2024 pipeline; UK Biobank scale pipeline (PLOS One 2025).
- Frontier: clinical translation; FDA-track validation; ablation planning.
- Tier 2: full patient-specific digital twin (anatomy from MRI; fiber DTMRI; openCARP simulation; ECG match).
- Composes with: cardiac digital-twin signature composition (geometry + EP + mechanics + ECG inverse + drug response).

**18.5.3 🆕 Tumor growth (Tier 1, 2)**
- Multi-cell tumor dynamics; RD intracellular + agent-based extracellular.
- Codes: PhysiCell, Morpheus; custom hybrid PDE+agent.
- Frontier: tumor-immune coupling; multi-scale tumor models with vasculature.
- Verification: Gompertzian growth.
- Tier 1: 3D spheroid with oxygen gradient. Tier 2: full microenvironment with vasculature.
- Composes with: tumor signature composition.

**18.5.4 🆕 Tissue growth and morphogenesis (Tier 1, 2)**
- Pattern formation in developing embryos; mechanical-chemical coupling.
- Codes: CompuCell3D, Morpheus, PhysiCell, Sultan et al. 2023 GPU CPM.
- Frontier: tissue-mechanics + signaling integration.
- Tier 0: 2D cell sorting under differential adhesion. Tier 1: 3D embryonic tissue. Tier 2: organ-scale.
- Composes with: morphogenesis = RD signaling + CPM cells + mechanics.

**18.5.5 🆕 Neural field models (Tier 0, 1)**
- Continuum-mean-field neural dynamics; Wilson-Cowan; traveling waves.
- Codes: custom; Brian2 supports.
- Tier 0: 2D Wilson-Cowan traveling waves. Tier 1: whole-brain neural field.
- Composes with: neural field + visual stimulus (perception), neural field + plasticity.

**18.5.6 🆕 Flocking variants (Tier 0, 1)**
- Fish schools, starling murmurations, slime mold aggregation.
- Tier 0: 2D starling murmuration. Tier 1: 3D fish school with predator.
- Composes with: flocking + predator, flocking + flow.

**18.5.7 🆕 Predator-prey spatial dynamics (Tier 0, 1)** — Spatial Lotka-Volterra. Tier 0: 2D traveling fronts.

**18.5.8 🆕 Bacterial colony growth (Tier 1)**
- Multi-cell growth, fingering, biofilm.
- Codes: custom; CellModeller (synthetic biology).
- Frontier: chemotaxis and quorum sensing coupling.
- Tier 1: 2D colony with fingering.
- Composes with: bacterial + antibiotic, biofilm + flow.

**18.5.9 🆕 Coral reef growth (Tier 1)** — 3D coral colony with thermal stress. Composes with coral + ocean chemistry (acidification), coral + temperature.

**18.5.10 🆕 Plant growth / L-systems with mechanics (Tier 0, 1)**
- L-system rule-based growth + mechanical realization.
- Codes: custom; L-py.
- Tier 0: 2D L-system — classic. Tier 1: 3D tree bending under wind.
- Composes with: plant + wind (FSI), plant + sun (heliotropism), forest dynamics.

**18.5.11 🆕 Microswimmer hydrodynamics (Tier 1, 2)**
- Bacteria, sperm, algae via flagella/cilia; low-Re Stokes flow.
- Codes: custom Stokes solvers; coupled elastic flagellum.
- Verification: Purcell scallop theorem; far-field flow.
- Tier 0: 2D flagellum swimmer. Tier 1: 3D bacterial flagellum with hydrodynamic interaction.
- Composes with: microswimmer + chemotaxis, sperm + cervical mucus rheology.

**18.5.12 🆕 Tissue mechanics / wound healing (Tier 1, 2)**
- Coupled cell-mechanics + biochemistry.
- Codes: CompuCell3D; custom.
- Frontier: patient-specific predictions.
- Tier 1: 2D wound closure with cell migration.
- Composes with: wound = tissue mechanics + RD signaling + cell migration.

**18.5.13 🆕 Blood-cell flow / microfluidics (Tier 1, 2)**
- RBCs deforming through capillaries.
- Codes: custom IB-LBM.
- Frontier: patient-specific stenosis.
- Tier 1: RBC through bifurcation.
- Composes with: microvascular FSI, platelet aggregation.

### 18.6 Integration notes

Cardiac digital twin is the highest-clinical-impact composition in the catalog. openCARP vendoring is the principal Tier 2 anchor. Promotes `common-mesh` (heart geometry from CT/MRI), `common-ode` (stiff ionic models), and bridges to medical imaging pipelines.

---

## 19. Earth, Atmosphere, and Climate

### 19.1 Scope and distinction

Earth-system processes — atmospheric (covered in adj § 20), ocean (overlap with fluids § 9.7.22), ice, surface evolution, mantle/tectonics. The big interfacial categories — coupled atmosphere-ocean-land — emerge as compositions in Part III.

### 19.2 Production codes

- **Landlab** (CSDMS) — Hobley et al. 2017; landscape evolution toolkit; components SPACE (Shobe et al. 2017), BedrockLandslider, HyLands, RiverBedDynamics (Monsalve et al., GMD 18, 2025).
- **ASPECT** (CIG, geodynamics.org) — "ASPECT is a code to simulate convection and tectonic processes in the Earth and other planetary bodies. It has grown from a pure mantle-convection code into a tool for many geodynamic applications including applications for inner core convection, lithospheric scale deformation, two-phase flow."
- **ISSM** (NASA JPL) — Ice-sheet and Sea-level System Model; "Stokes equations relevant to ice sheet dynamics by employing finite element and fine mesh adaption."
- **PISM** — Parallel Ice Sheet Model; "computer program used in climate science to simulate the past and future of glaciers and ice sheets, including the Earth's two large ice sheets in Greenland and Antarctica."
- **MITgcm, MOM6 (NOAA), NEMO** — ocean GCMs.
- **WRF** (NCAR) — atmospheric forecasting.
- **FastEddy** — GPU-resident LES; "massively parallel, GPU-resident LES model... with a GAD extension can be employed to generate ensembles of wind turbine and wind farm flows."
- **PyTorchFire** (Chen et al., *Env Modelling & Software* 2025) — "first differentiable cellular automata wildfire spread prediction model. Ultra-fast, GPU-accelerated wildfire simulator using PyTorch."

### 19.3 Frontier work

- **GNN emulator for ISSM** — Jouvet & Cordonnier (arXiv 2402.05291, 2024) — "graph convolutional network (GCN) as a fast emulator for ISSM... reproduces ice thickness and velocity with a correlation coefficient greater than 0.998... 34 times faster computational speed than CPU-based ISSM modeling."
- **Coupled landscape evolution** — Landlab community work — fluvial incision, hillslope diffusion, sediment transport, landsliding components.
- **Differentiable CA wildfire** — PyTorchFire 2025; Cao et al. arXiv 2510.09708 evaluated against 2025 Palisades fire.
- **Coupled ASPECT-FastScape** — mantle convection driving surface evolution.

### 19.4 Verification posture

- **Stoker dam-break, Carrier-Greenspan run-up** — shared with fluids.
- **Glen's flow law** — analytic for ice rheology.
- **Blankenbach et al. 1989** — mantle convection benchmarks.
- **Stream-power law** — empirical for landscape evolution.
- **Burn-scar recall/precision** — for wildfire CA against historical fires.

### 19.5 Per-phenomenon list

**19.5.1 📋 Atmospheric subgrid (Tier 1, 2)** — Adj § 20. ML-accelerated atmospheric subgrid (cloud microphysics, convection parameterization).

**19.5.2 📋 Climate dynamics (Tier 2)** — Adj § 20. Coupled atmosphere-ocean-ice GCM.

**19.5.3 🆕 Erosion / sediment transport (Tier 1, 2)**
- Fluvial incision, hillslope diffusion, deposition.
- Codes: Landlab with SPACE (Shobe et al. 2017), RiverBedDynamics (Monsalve 2025).
- Verification: steady-state river profile.
- Tier 1: Landlab watershed. Tier 2: large-basin with climate forcing.
- Composes with: erosion = water + sediment + bedrock. Climate, tectonics, vegetation couplings.

**19.5.4 🆕 River meandering (Tier 1)**
- Lateral migration, cutoff.
- Codes: Landlab extensions.
- Tier 1: 2D meandering.
- Composes with: meandering + sediment + riparian ecology.

**19.5.5 🆕 Glacier and ice sheet flow (Tier 1, 2)**
- Stokes ice flow, basal sliding, calving.
- Codes: ISSM (NASA JPL), PISM.
- Frontier: GNN emulator (Jouvet 2024) 34-50x faster.
- Verification: Glen's law; analytic shelf flow.
- Tier 1: reduced single-glacier. Tier 2: Pine Island Glacier transient.
- Composes with: glacier = ice + ocean melting + sea level.

**19.5.6 🆕 Permafrost thaw (Tier 1)**
- Coupled thermal-hydrological-mechanical.
- Codes: PFLOTRAN, OGS, ATS.
- Tier 1: 2D permafrost column.
- Composes with: permafrost + hydrology + ecology + carbon.

**19.5.7 🆕 Lava flow (Tier 1)** — Non-Newtonian cooling solidifying gravity-current. MAGFLOW (INGV) reference.

**19.5.8 🆕 Mantle convection (Tier 1, 2)**
- Geodynamic viscous convection; plate-mantle coupling.
- Codes: ASPECT (CIG) "finite element parallel code to simulate problems in thermal convection."
- Frontier: coupled to FastScape surface evolution; whole-Earth.
- Verification: Blankenbach et al. 1989 benchmarks.
- Tier 1: 2D mantle convection. Tier 2: 3D global with plates.
- Composes with: mantle + surface, mantle + core (geodynamo).

**19.5.9 🆕 Landslide / debris flow (Tier 1, 2)**
- Mass-wasting; granular on topography.
- Codes: Landlab BedrockLandslider; r.avaflow; custom DEM-MPM.
- Tier 1: 2D on real terrain. Tier 2: 3D DEM-MPM.
- Composes with: landslide = DEM + MPM + topography + water.

**19.5.10 🆕 Wildfire spread (Tier 0, 1, 2)**
- Spreading combustion; CA or CFD-with-combustion.
- Codes: PROPAGATOR (MDPI Fire 2020), PyTorchFire (Chen 2025), WRF-Fire.
- Frontier: differentiable CA; ML wildfire prediction; 2025 Palisades fire evaluation (Cao et al. arXiv 2510.09708).
- Verification: burn-scar recall/precision.
- Tier 0: 2D CA with wind/fuel — striking. Tier 1: real-terrain with WRF-Fire. Tier 2: full coupled atmosphere-fire.
- Composes with: wildfire + smoke transport, wildfire + evacuation.

**19.5.11 🆕 Dune migration (Tier 1)** — Aeolian sand transport; CA for landscape; Landlab.

**19.5.12 🆕 Coupled ASPECT-FastScape (Tier 2)** — Mantle convection driving surface evolution; vendored both.

### 19.6 Integration notes

Landlab, ASPECT, ISSM are the principal Tier 2 anchors. Promotes `common-mesh` (unstructured for ASPECT, FEM for ISSM); `common-graph` for landscape network analysis.

---

## 20. Radiation Transport

### 20.1 Scope and distinction

Photon, neutron, particle transport through media. Sub-fields: medical dose, neutron reactors, atmospheric scattering, astrophysical radiation, inverse rendering. Monte Carlo is the workhorse; deterministic Sn methods exist.

### 20.2 Production codes

- **Geant4** (CERN) — gold-standard particle transport, CPU; many GPU port research projects.
- **G4CU** (Hissoiny et al., SNA+MC 2013) — "CUDA implementation of the core Geant4 algorithm adapted for dose calculations in radiation therapy... about 40 times speedups over Geant4."
- **GMC** — "agreement with gamma indices of >97.5% for a 2%/2 mm gamma criteria... mean acceleration on one GTX 580 was 4860."
- **GGEMS** — GPU Geant4-based MC; GGEMS-Brachy for brachytherapy.
- **MCNP** (LANL) — community-standard neutron transport, CPU.
- **FLUKA, PENELOPE** — broader MC.
- **WARP** (Berkeley) — continuous-energy MC neutron transport on GPU (Bergmann & Vujic 2015).
- **Mitsuba 3** (Jakob et al., EPFL) — "retargetable rendering system... can be compiled into many variants with optional derivative tracking, dynamic compilation via LLVM or CUDA, and various radiance representations (monochrome, RGB, or spectral light, potentially with polarization)."

### 20.3 Frontier work

- **Differentiable rendering** — Mitsuba 3 (PyPI 2022-2025) "Mitsuba 3 is a differentiable renderer, meaning that it can compute derivatives of the entire simulation with respect to input parameters such as camera pose, geometry, BSDFs, textures, and volumes."
- **Transient rendering** — mitransient (arXiv 2510.25660, 2025).
- **MRI-guided RT** — Cosgrove et al. (*Med Phys* 2024).
- **MPEXS-DNA** — DNA-level radiation effects on GPU.

### 20.4 Per-phenomenon list

**20.4.1 🆕 MC photon transport — basic (Tier 1, 2)** — Foundation. Tier 1: small phantom. Tier 2: vendored Geant4-port.

**20.4.2 🆕 Medical radiation dose (Tier 1, 2)**
- Patient-specific RT dose.
- Codes: G4CU, GMC, GGEMS, GGEMS-Brachy, FastMC.
- Verification: gamma-index analysis (3%/3mm criteria).
- Tier 1: single-beam phantom. Tier 2: full IMRT plan with patient voxel geometry.
- Composes with: dose = radiation transport + voxelized geometry + organ-at-risk constraints.

**20.4.3 🆕 Neutron transport / reactor benchmark (Tier 1, 2)**
- Critical-assembly k-eff.
- Codes: WARP (Berkeley), MCNP.
- Verification: k-eff for Godiva, Jezebel.
- Tier 1: reduced reactor cell. Tier 2: full reactor.
- Composes with: reactor + thermal-hydraulics + fuel deformation.

**20.4.4 🆕 Atmospheric scattering / participating media (Tier 0, 1, 2)**
- Rayleigh + Mie volumetric.
- Codes: Mitsuba 3 heterogeneous media.
- Verification: single-scattering analytic.
- Tier 0: 2D sunset/sunrise. Tier 1: 3D with terrain. Tier 2: cloudy atmosphere full transfer.
- Composes with: atmospheric + cloud, atmospheric + sun.

**20.4.5 🆕 Astrophysical radiative transfer (Tier 2)**
- Optically-thick radiation coupled to fluid (radiation-hydro).
- Codes: Athena++ radiation module.
- Frontier: radiation MHD in accretion disks (Beloborodov 2017).
- Tier 2: coupled radiation-hydrodynamics.
- Composes with: radiation + MHD, radiation + accretion.

**20.4.6 🆕 Inverse rendering as transport (Tier 1, 2)**
- Recover scene from images via differentiable rendering.
- Codes: Mitsuba 3 differentiable variants (cuda_ad_rgb, llvm_ad_rgb).
- Frontier: radiative backpropagation.
- Tier 1: single-image material recovery. Tier 2: multi-view geometry + material + lighting.
- Composes with: inverse rendering + 3DGS (overlaps WU-C), inverse rendering + scene reconstruction.

**20.4.7 🆕 Transient imaging (Tier 2)**
- Time-of-flight transient transport; non-line-of-sight imaging.
- Codes: mitransient.
- Frontier: NLOS imaging reconstruction.
- Tier 2: transient scene with reconstructed signal.
- Composes with: LiDAR + scene; transient + scattering medium.

### 20.5 Integration notes

Mitsuba 3 is the most strategic Tier 2 anchor — bridges to rendering, inverse problems, and WU-C. Promotes `common-stochastic` for MC ensembles.

---

## 21. Social, Agents, Networks, Traffic

### 21.1 Scope and distinction

Agent-based modeling beyond boids and crowd; epidemic on networks, opinion dynamics, ant colony / stigmergy, Schelling segregation, Game of Life variants (Lenia, particle-Life), classic CA.

The adjacent charter covered crowd and traffic. This expansion adds the network-ABM and continuous-CA family.

### 21.2 Production codes

- **NetLogo** (Wilensky 1999) — classic teaching ABM.
- **Mesa** — open-source Python ABM library.
- **Repast** (UChicago).
- **AnyLogic** — commercial.
- **ALIEN** — CUDA artificial life.
- **Loimos** (arXiv 2401.08124, 2024) — "scalable parallel framework for simulating epidemic diffusion... 200 days of COVID-19 outbreak on a digital twin of California in about 42 seconds... 4096 cores on Perlmutter at NERSC."
- **SUMO** — traffic micro-simulation; CPU but widely used.
- **MATSim** — agent-based transport.

### 21.3 Frontier work

- Loimos at California scale.
- Differentiable ABM — Kreiss differentiable social force (adj § 14).
- ML-augmented opinion dynamics; large-language-model integration into agents.

### 21.4 Per-phenomenon list

**21.4.1 ✅ Boids (Tier 0, 1)** — Already in portfolio.

**21.4.2 📋 Crowd dynamics (Tier 0, 1, 2)** — Adj § 14.

**21.4.3 📋 Traffic (Tier 0, 1, 2)** — Adj § 21. IDM and reservation-based control.

**21.4.4 🆕 Epidemic on networks (Tier 0, 1, 2)**
- SIR, SEIR, agent-based on contact networks.
- Codes: Mesa, NetLogo, Loimos.
- Frontier: Loimos at California scale (Perlmutter).
- Verification: SIR analytic; R₀ basic reproduction.
- Tier 0: 2D SIR small-world — visible curve. Tier 1: city-scale realistic contacts. Tier 2: full-population digital twin.
- Composes with: epidemic + network + stochastic; coupled to mobility/traffic.

**21.4.5 🆕 Opinion dynamics (Tier 0, 1)**
- Voter, Deffuant, Hegselmann-Krause.
- Tier 0: 2D voter model. Tier 1: media-influence layer.
- Composes with: opinion + network, opinion + electoral.

**21.4.6 🆕 Ant colony / slime mold pathfinding (Tier 0, 1)**
- Stigmergy via pheromones.
- Codes: custom Mesa; PhysarumSolver.
- Tier 0: 2D ant-foraging. Tier 1: slime-mold network optimization on real cities.
- Composes with: stigmergy + graph optimization.

**21.4.7 🆕 Schelling segregation (Tier 0, 1)** — Self-segregation from local preferences. Tier 0: 2D with adjustable tolerance.

**21.4.8 🆕 Game of Life variants — Lenia, particle-Life (Tier 0, 1)**
- Continuous-state CA.
- Codes: custom GPU; CodeParade-style.
- Tier 0: 2D Lenia with kernel — gallery-quality. Tier 1: 3D Lenia or large-scale particle-Life.
- Composes with: Lenia + image-driven kernel (artistic).

### 21.5 Integration notes

Promotes `common-graph` for network ABM. WU-A for differentiable ABM. Heavy Tier 0 family — many compelling browser sims.

---

## 22. Quantum, DFT, and Tensor Networks

### 22.1 Scope and distinction

Quantum simulations beyond Schrödinger and BEC. DFT (covered in chemistry § 17.4 and adj § 19), tensor-network methods for many-body quantum (MPS, DMRG, TEBD, PEPS, TTN), quantum circuit simulation (state-vector and tensor-network), topological defects, exotic states of matter.

The tensor-network frontier is the principal addition since the adjacent charter.

### 22.2 Production codes

- **ITensor** — community standard for tensor networks; C++ and Julia.
- **TenPy** — Python tensor networks.
- **quimb** — GPU-aware tensor networks (Python).
- **TeNPy, TensorNetwork (Google)** — broader ecosystem.
- **Qiskit, Cirq** — quantum-circuit simulation (state-vector predominantly).
- **CuQuantum** (NVIDIA) — cuStateVec, cuTensorNet GPU libraries.
- **DFT codes** — see § 17.4.

### 22.3 Frontier work

- **Tree tensor networks for quantum circuit DMRG** — Dubey, Zeybek, Schmelcher (arXiv 2504.16718, 2025) — "Simulating Quantum Circuits with Tree Tensor Networks using Density-Matrix Renormalization Group Algorithm... extends the DMRG algorithm for simulating quantum circuits to tree tensor networks (TTNs)... particularly when gate connectivities exhibit clustering or a hierarchical structure."
- **Cluster-TEBD** — arXiv 2502.19289 (2025) — "cluster-TEBD which dynamically arranges qubits into entanglement clusters, enabling the exact contraction of multiple circuit layers in a single time step."
- **Efficient tensor network on GPU** — ACM Transactions on Quantum Computing — "Efficient Quantum Circuit Simulation by Tensor Network Methods on Modern GPUs."
- **Disordered quantum systems with 2D/3D tensor networks** — Tindall, Mello, Fishman, Stoudenmire, Sels (arXiv 2503.05693, 2025).
- **Quantum-centric supercomputing** — Alexeev et al. *Future Generation Computer Systems* 160 (2024).

### 22.4 Per-phenomenon list

**22.4.1 ✅ Ising / spin lattice (Tier 0, 1)** — Already in portfolio (task 3.7).

**22.4.2 📋 Schrödinger evolution (Tier 0, 1, 2)** — Adj § 11; also § 15.4.3.

**22.4.3 📋 DFT (Tier 0, 1, 2)** — Adj § 19; also § 17.6.5.

**22.4.4 🆕 Quantum tunneling visualizer (Tier 0)** — 1D wave packet on barrier; classic teaching demo with analytic transmission coefficient.

**22.4.5 🆕 BEC / superfluid (Tier 0, 1, 2)** — See § 15.4.8.

**22.4.6 🆕 Topological defects in fields (Tier 0, 1)**
- Vortex lattices, skyrmions, cosmic strings.
- Codes: phase-field, micromagnetic (NeuralMag).
- Tier 0: 2D skyrmion lattice. Tier 1: 3D skyrmion-string dynamics.
- Composes with: skyrmion + spintronic device, defect + phase transition.

**22.4.7 🆕 Tensor network DMRG for many-body quantum (Tier 1, 2)**
- MPS, TTN, DMRG for ground states and dynamics of quantum many-body systems.
- Codes: ITensor, TenPy, quimb (GPU-aware).
- Frontier: TTN-DMRG (arXiv 2504.16718, 2025); cluster-TEBD (arXiv 2502.19289, 2025).
- Verification: 1D Heisenberg analytic; QAOA fidelity bounds.
- Tier 1: 1D MPS-DMRG ground state. Tier 2: 2D PEPS or TTN at scale.
- Composes with: tensor-network + DFT (multi-scale quantum), tensor-network + open quantum system.
- Repo integration: new sim. Promotes `common-tensor-net`. WU-A bridges to variational optimization.

**22.4.8 🆕 Quantum circuit simulation (Tier 1, 2)**
- State-vector simulation up to ~30 qubits; tensor-network beyond.
- Codes: Qiskit, Cirq, cuStateVec (NVIDIA cuQuantum).
- Frontier: TTN/MPS-based circuit simulation (Dubey 2025); cluster-TEBD.
- Tier 1: 20-qubit state-vector. Tier 2: 50+-qubit tensor-network.
- Composes with: quantum hardware noise + circuit (NISQ digital twin).

**22.4.9 🆕 Quantum hardware noise simulation (Tier 1, 2)**
- Decoherence, gate errors, measurement noise.
- Codes: Qiskit Aer, Cirq, custom.
- Frontier: digital twins of physical quantum hardware (Jaschke 2024).
- Tier 1: small-system Lindblad evolution. Tier 2: noise-aware circuit benchmarking.
- Composes with: circuit + noise (quantum digital twin signature).

### 22.5 Integration notes

Tensor networks promote `common-tensor-net`. DFT shares `common-spectral` and `common-fmm` with chemistry. Quantum circuit simulation potentially bridges to physical-hardware testbeds via NISQ vendors.

---

## 23. Robotics, Control, and Digital Twins

### 23.1 Scope and distinction

A new family in v2.0 of this catalog (not in the adjacent charter). Industry has converged on PhysX-backed simulation + RTX rendering + USD scene description as the standard for sim-to-real robotics. This family captures robotics simulation as a category in its own right, distinct from the rigid-body family (§ 10) by virtue of the sensor simulation, control, and machine-learning loop that's intrinsic.

### 23.2 Production codes

- **NVIDIA Isaac Sim** — built on Omniverse; PhysX engine + RTX rendering + USD scene description.
- **NVIDIA Isaac Lab** (Mittal et al. arXiv 2511.04831; announced March 2024 with Project GR00T) — "open-source robot learning framework built on Isaac Sim... successor to NVIDIA Isaac Gym... accurate physics simulation using PhysX, tiled APIs for vectorized rendering, domain randomization, and support for running in the cloud."
- **MuJoCo** (DeepMind acquisition; Apache 2.0) — community-standard rigid-body for robotics.
- **MuJoCo Warp** — NVIDIA Newton + MuJoCo physics in Warp; contact-rich, high-throughput.
- **MJX** — JAX reimplementation of MuJoCo physics; large-scale parallel for RL.
- **Brax** (Freeman et al., NeurIPS 2021) — "Brax is a differentiable physics engine that simulates environments made up of rigid bodies, joints, and actuators." Note: as of 0.13.0, "Only brax/training is actively being maintained... users should use MuJoCo Playground... If you want to use Brax for physics simulation, please use MJX or MuJoCo Warp."
- **Project Chrono** — multi-body, vehicle dynamics.
- **Drake** (Toyota Research Institute) — robotics, planning, control.
- **PyBullet** — Python wrapper for Bullet Physics.
- **NVIDIA Cosmos** — generative world models for synthetic data (released late 2024/early 2025).
- **NeRD** (Neural Robot Dynamics) — neural simulator replacing classical analytical solvers, "stable, contact-rich interactions and long-horizon predictions that can be fine-tuned directly from real-world data, effectively solving the 'sim-to-real' problem for complex articulations."

### 23.3 Frontier work

- **Isaac Lab + GR00T** — March 2024 announcement; humanoid robotics platform.
- **NVIDIA Cosmos** — generative world model for robotics; "diverse, physics-aware environments and rare 'corner case' scenarios."
- **NeRD neural robot dynamics** — SIGGRAPH 2025 special address.
- **Digital twin software-in-the-loop testing** — SIGGRAPH 2025 hands-on lab — "OpenUSD, NVIDIA Isaac Sim, and ROS unite to create high-fidelity, collaborative virtual environments for software-in-the-loop testing."
- **VIRTUS-FPP** — structured-light digital twin calibration; ≤0.06 pixel calibration error, sphere radius error 0.512 mm (Haroon et al. 2025).
- **Zero-shot sim-to-real** — Salimpour et al. (6 Jan 2025) — RL policies trained in Isaac Sim transfer zero-shot to real robots, achieving near-NAV2-level performance.

### 23.4 Per-phenomenon list

**23.4.1 🆕 Humanoid locomotion (Tier 2)**
- Bipedal walking, balance, gait control.
- Codes: Isaac Lab + GR00T; MuJoCo MPC.
- Frontier: foundation-model policy adaptation.
- Tier 2: humanoid walking on uneven terrain.
- Composes with: humanoid + manipulation + perception (embodied AI signature).

**23.4.2 🆕 Robotic manipulation (Tier 1, 2)**
- Grasping, peg-in-hole, stacking, assembly.
- Codes: Isaac Lab manipulation benchmark; MuJoCo MJX.
- Verification: 8-task benchmark (point reaching, stacking, peg-in-hole) with PPO/TRPO.
- Tier 1: tabletop manipulation with reduced state. Tier 2: full manipulation with tactile and vision.
- Composes with: manipulation + perception + control + tactile sensor.

**23.4.3 🆕 Drone autonomy (Tier 1, 2)**
- Quadcopter dynamics + planner + perception.
- Codes: Isaac Sim with aerial robotics extensions; Microsoft AirSim.
- Frontier: vision-based autonomous flight at scale.
- Tier 2: drone in cluttered environment with vision.
- Composes with: drone swarm (Part III composition); aerial photography.

**23.4.4 🆕 Autonomous vehicle simulation (Tier 2)**
- Vehicle dynamics + traffic + perception + control.
- Codes: CARLA, NVIDIA DRIVE Sim, Waymo Simulator (closed).
- Frontier: sim-to-real for self-driving; corner-case generation via Cosmos.
- Tier 2: urban driving scenario with vision and LiDAR.
- Composes with: AV signature composition (vehicle dynamics + perception + traffic + control).

**23.4.5 🆕 Sensor simulation — vision, depth, LiDAR (Tier 1, 2)**
- RGB-D, LiDAR, IMU, contact sensor simulation.
- Codes: Isaac Sim RTX-based sensors; cuSensor.
- Frontier: realistic noise models for sim-to-real.
- Tier 1: single-camera RGB rendering. Tier 2: multi-sensor synthetic data generation.
- Composes with: any robotics task; SDG (synthetic data generation) pipelines.

**23.4.6 🆕 Software-in-the-loop digital twin (Tier 2)**
- Virtual robot interacting with virtual environment; tested before deployment.
- Codes: Isaac Sim + ROS 2; SIGGRAPH 2025 hands-on lab.
- Frontier: hardware-in-the-loop bridges.
- Tier 2: full digital twin of warehouse, factory, or surgical robot.
- Composes with: digital-twin flagship (warehouse, factory, or hospital).

**23.4.7 🆕 Generative world models for robotics (Tier 2)**
- Synthetic environment generation; corner-case scenario synthesis.
- Codes: NVIDIA Cosmos; emerging open-source world models.
- Frontier: physics-aware generative AI for training data.
- Tier 2: Cosmos-style world generation feeding RL training.
- Composes with: world model + RL training + simulator.

**23.4.8 🆕 Neural simulator (NeRD-style) (Tier 2)**
- Learned dynamics models replacing classical solvers for contact-rich tasks.
- Codes: NeRD; emerging neural-simulator research.
- Frontier: learned simulators that fine-tune from real-world data.
- Tier 2: neural simulator for articulated body.
- Composes with: neural simulator + classical fallback + RL.

### 23.5 Integration notes

This is a major addition. Promotes `common-usd` (Omniverse interop), `common-mesh` (URDF, USD, MJCF import). MuJoCo Warp is already part of Newton WU-D consumption. Robotics has the most active ecosystem in 2024-2026; the Bit-Physics opportunity is to provide an educational and audited path into it.

**Vendoring strategy**: MuJoCo + MJX is Apache 2.0 and is the easiest first vendor. Isaac Sim has licensing constraints but is the production standard. Brax for differentiable rigid-body baselines.

---

## 24. Materials Informatics and Machine-Learning Interatomic Potentials

### 24.1 Scope and distinction

A second new family in v2.0. Captures the MLIP frontier (introduced in § 17.6.3 above) as a category with its own training/inference/fine-tuning infrastructure, distinct from any single MD code.

### 24.2 Production codes (recap from § 17)

NequIP, Allegro, MACE, GRACE, MatterSim, SevenNet, ORB, GAP, MTP, ACE.

### 24.3 Foundation-model databases

Materials Project, Alexandria Database, Open Materials 2024 (OMat24), Open Molecules 2025 (OMol25). Foundation models: MACE-MP-0, GRACE-MP, MatterSim, SevenNet-MP, ORB-v3.

### 24.4 Frontier work (recap)

- Pareto frontier benchmark (Leimeroth et al. arXiv 2505.02503, 2025).
- Foundation model fine-tuning tutorial (Universal MLIPs, arXiv 2506.21935, 2025).
- Comparison and fine-tuning (arXiv 2511.05337, 2025) — Microsoft AI for Science Team trained foundation models with DFT-calculated data.

### 24.5 Per-phenomenon list

**24.5.1 🆕 MLIP-driven MD** — See § 17.6.3.

**24.5.2 🆕 Foundation-model fine-tuning workflow (Tier 2)**
- Task-specific fine-tuning of MACE-MP-0, NequIP, etc.
- Codes: MACE-MP fine-tuning suite; ASE calculator integration.
- Frontier: minimum-data fine-tuning; transfer learning across chemistries.
- Tier 2: end-to-end fine-tuning pipeline with validation.
- Composes with: materials discovery (MLIP + screening + validation).

**24.5.3 🆕 Materials discovery / screening (Tier 2)**
- High-throughput candidate screening using MLIPs.
- Codes: pymatgen, Materials Project API, custom workflows.
- Frontier: ML-augmented screening with MLIPs.
- Tier 2: screening pipeline for catalyst or battery materials.
- Composes with: screening + MLIP + DFT validation.

**24.5.4 🆕 Battery materials simulation (Tier 2)**
- Electrolyte, electrode, SEI (solid-electrolyte interphase) MD with MLIPs.
- Frontier: industrial-scale battery R&D.
- Tier 2: full electrode-electrolyte simulation with MLIP.
- Composes with: battery cell signature (electrochem + thermal + mechanics).

**24.5.5 🆕 Catalysis simulation (Tier 2)**
- Catalyst surface reactions with MLIPs.
- Frontier: ORR, HER, CO₂ reduction with foundation-model MLIPs.
- Tier 2: catalyst surface MD.

### 24.6 Integration notes

Promotes `common-mlip`. Heavy WU-E (learning) consumption. Vendoring of NequIP, MACE, Allegro under their MIT/Apache licenses is straightforward. The biggest infrastructure investment in v2.0 of this catalog.

---

## 25. Energy Systems — Power Grid, Wind, Fusion Engineering

### 25.1 Scope and distinction

A third new family in v2.0. Captures the energy-engineering frontier — electric power grid simulation under renewable integration, wind farm modeling, fusion engineering (covered also in § 13). Distinct from the underlying physics by focus on system-scale dynamics and engineering decisions.

### 25.2 Production codes

- **ParaEMT** (NREL) — GPU-based electromagnetic transient simulation; "240-bus (720-node) Western Electricity Coordinating Council system... 25 to 36 times speedup on a synthetic 10,080-bus (30240-node) system by leveraging the HPC resource named Eagle at the National Renewable Energy Laboratory."
- **PSCAD, EMTP** — commercial EMT simulators.
- **GridLAB-D** — distribution-grid simulator.
- **OpenFAST** (NREL) — wind turbine multi-physics.
- **AVBP** (CERFACS) — LES for combustion and now wind: "GPU-Accelerated Actuator-Disk Large-Eddy Simulation for Wind Farm Flows... validated on the Horns Rev wind farm configuration in neutral atmospheric boundary layer."
- **FastEddy** — NCAR GPU LES with GAD extension for wind: "massively parallel, GPU-resident LES model, FastEddy, with a GAD extension can be employed to generate ensembles of wind turbine and wind farm flows, simulate farm-to-farm interactions."
- **GRASP** — coupled with OpenFAST via actuator-line for full multiphysics (Taschner et al., *Wind Energy* 2024).

### 25.3 Frontier work — wind farms

- **GPU actuator-disk LES** — Dabas et al. ASME Turbo Expo 2024 — Horns Rev validated in AVBP.
- **FastEddy + GAD** — Sanchez Gomez et al. *Wind Energy* 2024 — "implement and validate the generalized actuator disk (GAD) model in the computationally efficient, GPU-resident, LES model FastEddy."
- **GRASP-OpenFAST coupling** — Taschner et al. *Wind Energy* 2024 — actuator-line + filtered ALM.
- **Actuator-farm model** — Stipa, Ajay, Brinkerhoff *WES* 2024 — wind-farm-induced atmospheric gravity waves.

### 25.4 Frontier work — power grid

- **ParaEMT** — large-scale GPU EMT at NREL with ~25-36x speedup on synthetic 10,080-bus system.
- **Real-time HVDC** — IEEE 2020 — 5 μs time step for multi-terminal HVDC-AC grids.
- **Hybrid CPU-GPU EMT** — Parareal parallel-in-time + GPU; 165x speedup on synthetic AC/DC.
- **GPU power flow** — Roberge et al., parallel power flow on GPUs.

### 25.5 Per-phenomenon list

**25.5.1 🆕 Power flow / load flow (Tier 1, 2)**
- Steady-state grid operation.
- Codes: PowerWorld, PSS/E, MATPOWER; GPU ports.
- Frontier: ML-augmented load flow for renewable integration.
- Tier 1: small-grid load flow. Tier 2: WECC-scale GPU load flow.
- Composes with: grid + market + dispatch.

**25.5.2 🆕 Electromagnetic transient (EMT) simulation (Tier 2)**
- Fast transient simulation of power-electronics-rich grid.
- Codes: ParaEMT (NREL), commercial PSCAD/EMTP.
- Frontier: large-scale GPU EMT; high-renewable scenarios.
- Tier 2: WECC 240-bus or 10,080-bus EMT.
- Composes with: grid EMT + renewables + control (power-grid signature composition).

**25.5.3 🆕 Wind turbine wake (Tier 1, 2)**
- Single-turbine wake; downstream velocity deficit; turbulence intensity.
- Codes: OpenFAST + actuator-line, AVBP, FastEddy.
- Frontier: GPU LES for wake — RTX A6000 ~10× faster than Xeon W-2265 (Uchida et al. 2023).
- Verification: NTNU Blind Test data; Wakebench benchmark.
- Tier 1: single-turbine wake. Tier 2: full Horns Rev wind farm with GPU LES.
- Composes with: wind farm signature composition.

**25.5.4 🆕 Wind farm full simulation (Tier 2)**
- Multi-turbine wake interaction; farm-to-farm; gravity waves.
- Codes: AVBP, FastEddy, GRASP.
- Frontier: actuator-farm model for farm-induced atmospheric gravity waves (Stipa 2024).
- Tier 2: full farm with ABL coupling.
- Composes with: wind farm = ABL + actuator-line + multi-turbine + control + grid integration.

**25.5.5 🆕 Inertial confinement fusion** — See § 13.4.5.

**25.5.6 🆕 Tokamak burning plasma** — See § 13.4.6.

**25.5.7 🆕 Solar PV array thermal-electrical (Tier 1)**
- PV panel temperature, electrical performance.
- Codes: System Advisor Model (SAM, NREL).
- Tier 1: PV array with thermal and shading.
- Composes with: PV + grid + storage.

**25.5.8 🆕 Nuclear reactor core thermal-hydraulic (Tier 2)**
- Coupled neutronics + thermal-hydraulics.
- Codes: NEAMS suite (DOE), CTF, MOOSE.
- Tier 2: PWR core with neutronics-thermal-hydraulic coupling.
- Composes with: reactor signature (neutronics + thermal-hydraulic + fuel + control).

### 25.6 Integration notes

Promotes `common-graph` (grid topology) and `common-ode` (stiff EMT). Wind farm vendoring is OpenFAST + actuator-line module. Power grid vendoring is ParaEMT (BSD).

---

## 26. Hypersonic and High-Speed Flight

### 26.1 Scope and distinction

A fourth new family in v2.0. Captures hypersonic re-entry, scramjet propulsion, and high-altitude rarefied flow as a category with distinct numerics (non-equilibrium thermochemistry, Boltzmann-BGK kinetic, two-temperature models) and substantial national-security and commercial-space investment.

### 26.2 Production codes

- **CFD++** (Metacomp Technologies) — commercial; non-equilibrium hypersonic. *AIAA SciTech* 2025 — "an overview of the non-equilibrium capabilities in CFD++ and presents validation results through high-temperature non-equilibrium hypersonic test cases. Simulation results for the Fire-II, Stardust, RAM C-II, and OREX test cases."
- **hy2Foam** — open-source two-temperature solver for re-entry, in OpenFOAM ecosystem.
- **US3D** (Minnesota) — academic hypersonic CFD.
- **DPLR, LeMANS** — NASA / Michigan academic codes.
- **Discontinuous-spectral-element Boltzmann-BGK GPU** — arXiv 2312.06567 — "Through the combination of high-order unstructured spatial discretizations and conservative discrete velocity models as well as their efficient implementation on large-scale GPU computing architectures, we demonstrate the ability to simulate unsteady and non-equilibrium three-dimensional high-speed flows... Apollo capsule at realistic re-entry conditions from the AS-202 mission flight path, including the steady non-equilibrium flow in the high-altitude regime at a Mach number of 22.7 and a Reynolds number of 43,000."

### 26.3 Frontier work

- **CFD++ for non-equilibrium hypersonic** — Lopez, Bachchan, Peroomian *AIAA SciTech* 2025-0213.
- **Boltzmann-BGK on GPU** — arXiv 2312.06567.
- **GPGPU scramjet LES with finite-rate chemistry** — Marrocco et al. — "adaptive multi-block ODE algebra solver for GPU... validated on Large Eddy Simulations (LES) of a scramjet configuration."
- **Open-source hypersonic** — hy2Foam validation (D. Knight RTO WG 10).

### 26.4 Verification posture

- **Fire-II, Stardust, RAM C-II, OREX** — flight data anchor cases for re-entry.
- **Double cone, hollow cylinder flare** — RTO WG 10 hypersonic CFD validation.
- **NASA Hyper X-43A scramjet** — academic reference.
- **Apollo AS-202 mission** — flight data, Mach 22.7 at altitude.

### 26.5 Per-phenomenon list

**26.5.1 🆕 Re-entry vehicle non-equilibrium flow (Tier 2)**
- Hypersonic flow with thermal and chemical non-equilibrium; two-temperature, finite-rate chemistry.
- Codes: CFD++, hy2Foam, DPLR; Boltzmann-BGK GPU (arXiv 2312.06567).
- Frontier: GPU Boltzmann-BGK for Apollo-class re-entry.
- Verification: Fire-II, Stardust, RAM C-II flight data.
- Tier 2: Apollo capsule at Mach 22.7.
- Composes with: re-entry signature composition (vehicle + plasma + radiation + ablation).

**26.5.2 🆕 Scramjet propulsion (Tier 2)**
- Supersonic combustion in air-breathing engine.
- Codes: CFD++, custom GPGPU LES with finite-rate chemistry.
- Frontier: GPGPU scramjet LES with ~22-step kerosene-air chemistry.
- Verification: NASA Hyper X-43A.
- Tier 2: full scramjet engine LES with combustion.
- Composes with: scramjet + structural + thermal protection.

**26.5.3 🆕 Plasma sheath around re-entry vehicle (Tier 2)**
- Ionized plasma around vehicle; communication blackout.
- Codes: coupled CFD + PIC; reduced fluid-plasma models.
- Tier 2: re-entry plasma sheath with EM coupling.
- Composes with: re-entry + plasma + EM (communications blackout signature).

**26.5.4 🆕 Hypervelocity impact (Tier 2)**
- Spacecraft micrometeorite/debris impact; shielding design.
- Codes: SPH-based hypervelocity (CTH, RAGE), Pele suite.
- Tier 2: Whipple shield impact.
- Composes with: hypervelocity + fragmentation + thermal.

### 26.6 Integration notes

Promotes `common-amr` (shock tracking) and `common-ode` (stiff finite-rate chemistry). Vendoring of hy2Foam is straightforward (open-source); CFD++ is commercial.

---

# Part III — Composition Affinity Map

This is the heart of the catalog. Compositions are how individual sims become *tools*. A research lab's geophysics simulator is not a sim — it's a composition of erosion + hydrology + sediment + climate forcing. A game's planet simulator is gravity + atmosphere + ocean + ecosystem. A studio's hero render is fluid + cloth + hair + lighting.

The composition catalog below uses an **expanded entry structure** compared to v1.0 of this catalog. Each composition declares:

- **Constituent sims** — which Part II entries.
- **Coupling pattern** — field-on-field, boundary, co-located, or mix.
- **Time-stepping** — sub-cycling, operator splitting, implicit, or lockstep.
- **Production codes that do this composition** — what industry/research uses, if anything.
- **Frontier references** — peer-reviewed work demonstrating this composition or its sub-coupling, 2024-2026 where available.
- **Repo integration** — what exists in Bit-Physics at the Phase 5 baseline, what would be needed.
- **Verification strategy** — analytic anchors, reference scenarios, conservation laws.
- **Hardware target** — tier assignment for the composition.
- **Applications** — across product modes (research, gallery, games, packages).

## 27. Composition framework

### 27.1 Coupling patterns recap

Three principal patterns (per § 5.3):
1. **Field-on-field.** Sim A writes a field; Sim B reads it as a source term. Simplest.
2. **Boundary.** Sim A and Sim B share an interface; state transfers at the interface only. Stability often dominates; added-mass instability is the canonical FSI concern.
3. **Co-located.** Sim A and Sim B operate at the same point but represent different physics. Most complex; usually requires unified time-stepping.

### 27.2 Time-stepping patterns recap

- **Sub-cycling.** Faster sim runs N steps per slower sim step.
- **Operator splitting** (Strang, Lie, Marchuk). Sims alternated by half-steps.
- **Implicit coupling.** Single nonlinear solve includes both physics; required for stiff couplings.
- **Lockstep.** Both sims at same dt. Rare.

### 27.3 Numerical stability concerns

Many coupled sim pairs are unstable when naively combined:
- **Added-mass instability** — incompressible fluid with light elastic structure. Requires implicit coupling or modified Robin BCs.
- **Stiff thermal-chemical** — combustion. Requires implicit ODE integration; `common-ode` proposed.
- **Stiff plasma-EM** — PIC at high plasma frequency. Implicit PIC schemes.
- **Disparate timescales** — habitable planet flagship. Requires sub-cycling with conservation enforced at coupling boundaries.

Composition entries flag known stability concerns.

### 27.4 Verification by parts

Compositions usually have weaker analytic anchors than sub-sims. Common approaches:
1. Reproduce published reference scenarios (calculation validation).
2. Cross-code agreement (two independent implementations).
3. Energy/mass/momentum conservation across coupling.
4. Sub-sims pass individual verification; coupling adds small, locally-verifiable behavior.

## 28. Two-sim compositions

Building blocks. Each is a 1-3 week project on working sub-sims.

### 28.1 Buoyancy-driven flow (Smoke + Thermal)

- **Constituents.** § 9.7.3 Eulerian smoke + § 16.4.1 heat equation.
- **Coupling.** Field-on-field. Thermal field T(x,t) provides Boussinesq buoyancy source ρ·g·β·(T − T₀) for flow; flow advects T via ∂T/∂t + u·∇T = α∇²T + Q.
- **Time-stepping.** Lockstep — same dt for fluid and thermal advection-diffusion in the Boussinesq limit.
- **Production codes.** OpenFOAM buoyantBoussinesqPimpleFoam; Ansys Fluent natural-convection; academic CHT codes.
- **Frontier references.** Rayleigh-Bénard at high Ra (10⁹+ turbulent; Pandey et al. *JFM* 2021); ML closures for Nusselt-Rayleigh correlations.
- **Repo integration.** Both sub-sims at Phase 5 (smoke ✅; heat equation implied by `common-warp` time-stepping, would be promoted to its own sim § 16.4.1). Coupling module under `compositions/buoyancy-driven-flow/coupling/`. Inherits Stack B (Tier 0) and Stack E (Tier 1/2) from sub-sims.
- **Verification.** Rayleigh-Bénard critical Ra (analytic linear stability for onset); thermal-plume rise rate vs. analytic point heat source; energy conservation across coupling.
- **Hardware target.** Tier 0 (2D, 256² to 1024²) + Tier 1 (3D, 256³). Tier 2 high-Ra turbulent if desired.
- **Applications.** Gallery (visual indoor airflow), education (intro to coupled physics), games (campfire + heat), research (Ra-Nu correlations).

### 28.2 Fluid + Rigid Body (FSI lite)

- **Constituents.** § 9.7.1 SPH or § 9.7.3 Eulerian smoke + § 10.6.3 XPBD rigid.
- **Coupling.** Boundary. Fluid sees rigid body as moving boundary (no-slip or free-slip); rigid body sees integrated pressure + viscous force.
- **Time-stepping.** Sub-cycling — fluid N=4-10 steps per rigid step in low-Re; lockstep for high-mass-ratio.
- **Production codes.** NVIDIA Flow / FleX; SPlisHSPlasH with rigid coupling; Project Chrono multi-body + CFD.
- **Frontier references.** Added-mass instability for low-mass-ratio FSI (Causin, Gerbeau, Nobile 2005); partitioned vs. monolithic schemes.
- **Repo integration.** SPH (✅), smoke (✅), XPBD (✅). Coupling module new. Stack B Tier 0 + Stack E Tier 1.
- **Verification.** Drag on sphere (Stokes for low-Re, analytic); cylinder shedding (Strouhal-Re); falling sphere terminal velocity.
- **Hardware target.** Tier 0/1/2.
- **Applications.** Boat in water (gallery), debris in flow (research), mixing tank, dam-with-debris demos.

### 28.3 Gravity + N-body (self-coupled)

- **Constituents.** § 12.5.1 N-body, self-coupled.
- **Coupling.** Pairwise gravitational interaction.
- **Time-stepping.** Sub-cycling for hierarchical timescales; KDK leapfrog standard.
- **Production codes.** GADGET-4, SWIFT, REBOUND.
- **Frontier references.** pmwd differentiable PM (arXiv 2211.09958, 2022); PhotoNs-GPU.
- **Repo integration.** Already at Phase 5 (Barnes-Hut). Self-coupling is degenerate composition; listed for completeness.

### 28.4 Smoke + Combustion (premixed flame propagation)

- **Constituents.** § 9.7.3 smoke + combustion (adj § 16; promoted to Phase 6+ catalogue).
- **Coupling.** Field-on-field. Combustion adds heat-release source Q̇(T, Y) and species sources; flow advects species Y.
- **Time-stepping.** Operator splitting with stiff ODE for chemistry (Strang); requires `common-ode`.
- **Production codes.** Pele-LM, OpenFOAM XiFoam, Cantera as chemistry reference.
- **Frontier references.** GPU finite-rate chemistry (Marrocco et al. for supersonic-hypersonic reactive); ExaCT.
- **Repo integration.** Smoke (✅), combustion new. Promotes `common-ode`.
- **Verification.** Laminar flame speed against Cantera (Sl reference); 1D detonation Chapman-Jouguet.
- **Hardware target.** Tier 1 (2D laminar), Tier 2 (3D LES with finite-rate chemistry).
- **Applications.** Fire-safety research, combustion-engine design, gallery (flame propagation), education.

### 28.5 MPM + Rigid Body (granular + solid contact)

- **Constituents.** § 9.7.2 MPM + § 10.6.3 XPBD rigid.
- **Coupling.** Co-located. MPM particles can be promoted to rigid; rigid bodies interact through contact and friction.
- **Time-stepping.** Lockstep with MPM particle-to-grid → grid-to-rigid contact resolution → grid-to-particle.
- **Production codes.** NVIDIA FleX (early), graphics-research MPM-rigid (Jiang et al.).
- **Repo integration.** MPM (✅), XPBD (✅). Coupling module new.
- **Verification.** Sand-pile collapse with rigid wall (angle of repose); rigid sphere sinking in granular material.
- **Hardware target.** Tier 1/2.
- **Applications.** Construction simulation, granular flow research, beach erosion under structures.

### 28.6 Cardiac EP + Tissue Mechanics

- **Constituents.** § 18.5.1 cardiac EP + § 10.6.1 FEM.
- **Coupling.** Co-located. EP field V produces active stress σ_active(V); deformation alters tissue conductivity (stretch-activation feedback).
- **Time-stepping.** Sub-cycling: EP at ~25-50 μs, mechanics at 1-5 ms.
- **Production codes.** openCARP (EP) coupled with CHeart, CardioMechanics; commercial Simbio.
- **Frontier references.** Camps et al. *Med Image Anal* 2024 pipeline; openCARP-PINNs (Springer 2024).
- **Repo integration.** Cardiac EP from adj § 13 (Phase 6+); FEM (✅). Promotes `common-ode` for stiff ionic models.
- **Verification.** Pressure-volume loop (PV-loop) against clinical reference; ejection fraction.
- **Hardware target.** Tier 1/2 (full ventricle Tier 2).
- **Applications.** Clinical research, education (heart function), digital-twin pipeline component.

### 28.7 Shallow Water + Sediment

- **Constituents.** § 9.7.16 shallow water + § 19.5.3 erosion.
- **Coupling.** Field-on-field. Flow shear stress drives sediment transport (q_s = f(τ_b)); sediment continuity alters bed elevation; bed feeds back to flow via topography.
- **Time-stepping.** Operator splitting (flow → transport → bed update); bed evolves slower than flow (sub-cycling reversed: bed every N flow steps).
- **Production codes.** RiverBedDynamics in Landlab (Monsalve et al., GMD 18, 2025) — explicitly designed for this composition; Delft3D; XBeach.
- **Frontier references.** Monsalve et al. 2025 "RiverBedDynamics v1.0: a Landlab component for computing two-dimensional sediment transport and river bed evolution"; coupled with HyLands.
- **Repo integration.** Both Phase 6+. Coupling straightforward.
- **Verification.** Equilibrium sediment-transport profile (analytic stream-power); RiverBedDynamics 2025 validation cases.
- **Hardware target.** Tier 1 (2D river reach) / Tier 2 (delta evolution).
- **Applications.** River-engineering research, flood-risk delta evolution, education on landscape evolution.

### 28.8 Boids + Predator

- **Constituents.** § 21.4.1 boids + simple predator agent.
- **Coupling.** Co-located. Boids respond to predator with repulsion; predator chases mean direction or nearest target.
- **Time-stepping.** Lockstep, dt set by boids dynamics.
- **Production codes.** Standard ABM (Mesa, NetLogo).
- **Frontier references.** Couzin et al. ecological flocking literature.
- **Repo integration.** Boids (✅); predator straightforward extension. Stack B Tier 0 + Stack E Tier 1.
- **Verification.** Emergent flock-cohesion under attack; quantitative collective response statistics.
- **Hardware target.** Tier 0/1.
- **Applications.** Education (emergent behavior), ecology research, games (NPC behavior).

### 28.9 Reaction-Diffusion + Cardiac

- **Constituents.** RD-2D (✅) + cardiac EP (§ 18.5.1).
- **Coupling.** Co-located. RD provides excitable kinetics for cardiac monodomain.
- **Time-stepping.** Lockstep; cardiac monodomain IS an RD equation with specific ionic kinetics.
- **Production codes.** openCARP, Chaste cardiac module.
- **Frontier references.** Fenton-Karma and bidomain models.
- **Repo integration.** RD-2D (✅) is Layer 4 reference. Strongest "promote a sub-sim" candidate.
- **Verification.** Conduction velocity in 2D (Mitchell-Schaeffer analytic limits); spiral-wave wavelength.
- **Hardware target.** Tier 0/1/2.
- **Applications.** Education (excitable media → cardiac), research (arrhythmia mechanisms).

### 28.10 SPH + Cloth (FSI for membranes)

- **Constituents.** § 9.7.1 SPH + § 10.6.2 cloth.
- **Coupling.** Boundary. Fluid sees cloth as moving boundary (possibly permeable); cloth sees pressure + drag.
- **Time-stepping.** Sub-cycling for stiff cloth; implicit cloth integration needed for stability.
- **Production codes.** SPlisHSPlasH-cloth coupling; ARCSim with SPH.
- **Repo integration.** SPH (✅), cloth (✅). Coupling new.
- **Verification.** Parachute drop terminal velocity; sail under steady wind (analytic for circular sail).
- **Hardware target.** Tier 1/2.
- **Applications.** Parachute design, sailing research, flag-in-wind gallery.

### 28.11 Crystal Growth + Thermal (Dendrite formation)

- **Constituents.** § 10.6.7 / § 17.6.7 phase-field + § 16.4.3 Stefan thermal.
- **Coupling.** Field-on-field. Phase-field releases latent heat to thermal field; thermal supersaturation drives growth.
- **Time-stepping.** Lockstep; both PDEs have similar timescales.
- **Production codes.** PRISMS-PF (DeWitt et al. 2020) — explicitly supports dendrite growth with thermal coupling.
- **Frontier references.** Karma-Rappel sharp-interface limit; ExaCA AM application.
- **Repo integration.** Both sub-sims Phase 6+. Promotes shared phase-field module under `chemistry/phase-field/`.
- **Verification.** Steady-state dendrite tip velocity vs. analytic.
- **Hardware target.** Tier 0/1/2.
- **Applications.** Materials science, AM microstructure, education (canonical phase-field demo).

### 28.12 Plasma + EM (PIC core, self-coupled)

- **Constituents.** PIC (adj § 9 / § 13.4.1) — self-coupled.
- **Coupling.** Particles drive fields via current deposition; fields drive particles via Lorentz force.
- **Time-stepping.** Lockstep with leapfrog (Yee scheme).
- **Production codes.** WarpX, PIConGPU.
- **Repo integration.** PIC from adj charter; Phase 6+.

### 28.13 MHD + Reconnection

- **Constituents.** § 12.5.3 continuum MHD + § 12.5.5 reconnection.
- **Coupling.** Co-located. Reconnection is a sub-grid physics within MHD — explicit Ohm's law with anomalous resistivity, or PIC-MHD hybrid.
- **Time-stepping.** Sub-cycling at reconnection sites if PIC-MHD; lockstep if resistive MHD.
- **Production codes.** Athena++ with resistive MHD; PIC-MHD module in Athena++ (Chen, Bai et al. 2023).
- **Frontier references.** Beloborodov 2017; arXiv 1908.08138 radiative reconnection.
- **Repo integration.** MHD new (§ 12.5.3); reconnection new (§ 12.5.5).
- **Verification.** Sweet-Parker scaling.
- **Hardware target.** Tier 1/2.
- **Applications.** Solar physics, space-weather research.

### 28.14 Multi-Phase + Surface Tension

- **Constituents.** § 9.7.5 multiphase VOF + § 9.7.14 surface tension.
- **Coupling.** Field-on-field. Surface-tension force enters as singular source at interface.
- **Time-stepping.** Lockstep with CFL constrained by capillary wave speed.
- **Production codes.** Basilisk (Popinet) — canonical; Patel et al. 2025 integral formulation.
- **Frontier references.** Patel et al. arXiv 2502.02712 2025; EBIT (arXiv 2309.00338).
- **Repo integration.** May be implemented as single sim in Basilisk-style.
- **Verification.** Young's bubble migration; Marangoni benchmarks.
- **Hardware target.** Tier 1/2.
- **Applications.** Inkjet design, microfluidic droplet generation, gallery.

### 28.15 Plant Growth + Wind

- **Constituents.** § 18.5.10 L-system + simplified atmospheric.
- **Coupling.** Boundary. Wind exerts drag on branches; tree bends; bending alters drag profile.
- **Time-stepping.** Sub-cycling.
- **Production codes.** Custom research codes; SpeedTree with wind.
- **Frontier references.** Tree bending under gust (de Langre et al.).
- **Repo integration.** Plant new (Phase 6+); wind simplified.
- **Verification.** Bending under steady wind (Euler analytic for cantilever).
- **Hardware target.** Tier 0/1.

### 28.16 Lava + Cooling (intrinsic 2-sim)

- **Constituents.** § 9.7.6 non-Newtonian + § 16.4.1 thermal with crust phase change.
- **Coupling.** Field-on-field. Thermal drives temperature-dependent viscosity; cooling drives crust.
- **Production codes.** MAGFLOW (INGV); custom.
- **Repo integration.** Non-Newtonian new; thermal (✅ via common-warp).
- **Verification.** Self-similar lava-tube formation analytic.
- **Applications.** Volcanology research, gallery (lava aesthetic), education.

### 28.17 IDM Traffic + Signal Optimization

- **Constituents.** IDM traffic (adj § 21) + RL controller.
- **Coupling.** Field-on-field. Controller observes traffic; signal phase modifies traffic.
- **Production codes.** SUMO, MATSim; commercial Aimsun.
- **Frontier references.** Wu et al. PPO traffic control (Berkeley).
- **Verification.** Throughput improvement vs. fixed-cycle baseline.

### 28.18 Smoke + Lighting (volumetric rendering)

- **Constituents.** § 9.7.3 smoke + § 20.4.4 atmospheric scattering.
- **Coupling.** Field-on-field. Smoke density attenuates light; scattering computed per-step or sub-cycled.
- **Production codes.** Mantaflow + Mitsuba; commercial Houdini.
- **Frontier references.** NeuralVDB sparse rendering for smoke.
- **Repo integration.** Smoke (✅); atmospheric scattering new. Promotes `common-vdb` for sparse volume.
- **Hardware target.** Tier 0/1/2.
- **Applications.** Gallery hero shots, VFX research.

### 28.19 Wildfire + Wind

- **Constituents.** § 19.5.10 wildfire + atmospheric flow.
- **Coupling.** Field-on-field. Wind affects fire spread direction and speed; fire heating affects local atmosphere.
- **Production codes.** WRF-Fire; PyTorchFire with wind data.
- **Frontier references.** PyTorchFire 2025; Cao et al. arXiv 2510.09708 — 2025 Palisades fire evaluation.
- **Repo integration.** Wildfire (Phase 6+); wind simplified.
- **Verification.** Burn-scar shape vs. historical fires under known wind.
- **Hardware target.** Tier 0 (2D CA + wind field — strong visual demo); Tier 1/2 with real terrain.
- **Applications.** Wildfire-prediction research, climate-adaptation gallery, education.

### 28.20 BEC + Optical Lattice

- **Constituents.** § 15.4.8 BEC + engineered external potential.
- **Coupling.** Field-on-field. Lattice provides external V_ext for GPE.
- **Production codes.** GPUE with custom potentials; GPELab.
- **Frontier references.** Cold-atom quantum-simulator literature.
- **Applications.** Cold-atom research, quantum-simulator demos.

### 28.21 Welding (Stefan + Marangoni intrinsic)

- **Constituents.** § 16.4.4 — intrinsically 2-sim (Stefan + Marangoni at coupled boundary).
- **Production codes.** KiSSAM (Levkin et al. 2024).
- **Applications.** Welding R&D, AM foundation.

### 28.22 Photonic Inverse Design (FDTD + Adjoint)

- **Constituents.** § 14.5.1 FDTD + adjoint optimizer.
- **Coupling.** Optimization loop. Adjoint backsolve computes gradients wrt permittivity field.
- **Time-stepping.** Forward FDTD + backward adjoint; ~2× single FDTD cost.
- **Production codes.** Tidy3D autodiff (cuda_ad_rgb); Meep adjoint; fdtd-z gradient backprop.
- **Frontier references.** *Nanophotonics* 2024 — 2.09 billion grid cells in ~3 min on GPU.
- **Repo integration.** FDTD from adj § 10; adjoint via WU-A.
- **Hardware target.** Tier 1/2.
- **Applications.** Photonic chip design, metasurface optimization.

### 28.23 Cardiac Digital Twin Lite (Cardiac + ECG inverse)

- **Constituents.** Cardiac EP + ECG forward simulator + parameter-inverse loop.
- **Coupling.** Inverse-modeling. Forward computes simulated ECG from EP state; inverse optimizes EP parameters to match patient ECG.
- **Production codes.** Camps et al. pipeline (*Med Image Anal* 2024); openCARP-PINNs (Springer 2024).
- **Frontier references.** Camps et al. 2024 — "Harnessing 12-lead ECG and MRI data to personalise repolarisation profiles in cardiac digital twin models for enhanced virtual drug testing."
- **Repo integration.** Cardiac EP from adj § 13; ECG forward small extension; inverse via WU-A.
- **Hardware target.** Tier 2.
- **Applications.** Clinical drug testing, personalized therapy.

### 28.24 Drug Binding FEP Pipeline

- **Constituents.** § 17.6.3 MD-MLIP + § 17.6.4 FEP alchemical.
- **Coupling.** Lockstep — alchemical lambda parameter advances over MD trajectory.
- **Production codes.** GROMACS GPU FEP (*ACS Omega* 2025); OpenMM FEP; AMBER FEP.
- **Frontier references.** *ACS Omega* 2025 — GROMACS GPU FEP "up to nearly 800% improvement on Nvidia A100... End-to-end absolute binding free-energy calculations reduced from 400 h to around 48 h on the A100 GPU."
- **Repo integration.** MD-MLIP new; FEP new. Promotes `common-mlip`.
- **Hardware target.** Tier 2.
- **Applications.** Drug discovery lead optimization, computational chemistry research.

### 28.25 Robotic Manipulation Sim-to-Real

- **Constituents.** § 23.4.2 Isaac Lab manipulation + § 23.4.5 sensor simulation.
- **Coupling.** Boundary — physics simulation drives sensor renders; sensor renders feed policy network.
- **Production codes.** Isaac Lab (arXiv 2511.04831, 2024); MuJoCo MJX.
- **Frontier references.** Salimpour et al. (6 Jan 2025) — zero-shot sim-to-real navigation.
- **Repo integration.** Robotics family new (§ 23). Promotes `common-usd`.
- **Hardware target.** Tier 2.
- **Applications.** Robotics R&D, education on sim-to-real.

### 28.26 Wind Turbine Wake + ABL

- **Constituents.** § 25.5.3 wind turbine wake + atmospheric boundary layer.
- **Coupling.** Boundary — turbine extracts momentum via actuator line; ABL provides inflow turbulence.
- **Production codes.** FastEddy + GAD (Sanchez Gomez et al. *Wind Energy* 2024); AVBP at Horns Rev.
- **Frontier references.** FastEddy GPU LES — "GPU-resident LES model, FastEddy, with a GAD extension can be employed to generate ensembles of wind turbine and wind farm flows."
- **Repo integration.** Both new (§ 25). Vendoring of FastEddy or OpenFAST.
- **Hardware target.** Tier 2.
- **Applications.** Wind energy R&D, climate-adaptation.

### 28.27 Power Grid EMT + Renewable Inverter Control

- **Constituents.** § 25.5.2 EMT simulation + inverter control models.
- **Coupling.** Field-on-field. Inverter responds to grid state; grid sees inverter currents.
- **Production codes.** ParaEMT (NREL); PSCAD.
- **Frontier references.** ParaEMT — "25 to 36 times speedup on a synthetic 10,080-bus (30240-node) system."
- **Repo integration.** Both new (§ 25). Vendoring of ParaEMT.
- **Hardware target.** Tier 2.
- **Applications.** Grid stability research, renewable integration policy.

### 28.28 Tensor Network + Variational Quantum

- **Constituents.** § 22.4.7 tensor network DMRG + variational optimizer.
- **Coupling.** Optimization loop on MPS/TTN parameters.
- **Production codes.** ITensor with variational; quimb GPU.
- **Frontier references.** TTN-DMRG (arXiv 2504.16718, 2025).
- **Repo integration.** Promotes `common-tensor-net`. WU-A for variational gradients.
- **Hardware target.** Tier 1/2.

### 28.29 Hair + Wind

- **Constituents.** § 10.6.4 Cosserat hair + simplified flow.
- **Coupling.** Boundary. Wind exerts drag on each hair strand.
- **Production codes.** Houdini hair + wind; Maya nHair.
- **Frontier references.** Stable Cosserat Rods (Hsu et al. SIGGRAPH 2025).
- **Repo integration.** Hair Phase 6+. `common-elastica` promoted.

### 28.30 LiDAR / Time-of-Flight Simulation

- **Constituents.** § 14.5.8 / § 20.4.7 transient imaging + scene geometry.
- **Coupling.** Field-on-field. Scene materials respond to transient illumination.
- **Production codes.** mitransient (Mitsuba 3 extension); CARLA LiDAR sensor.
- **Frontier references.** mitransient arXiv 2510.25660 2025.
- **Hardware target.** Tier 1/2.
- **Applications.** Autonomous driving, non-line-of-sight imaging research.

## 29. Three-sim compositions

Each entry is a 1-3 month project; richer scientific value than 2-sim.

### 29.1 Atmospheric Storm (Flow + Moisture + Microphysics)

- **Constituents.** Atmospheric flow (adj § 20, § 19.5.1) + moisture advection + cloud microphysics (§ 16.4.9).
- **Coupling.** Field-on-field three-way. Flow advects moisture; condensation releases latent heat to flow.
- **Time-stepping.** Sub-cycling — microphysics stiff, flow and advection at unified dt.
- **Production codes.** WRF (atmospheric + moisture + microphysics standard); CM1 cloud-resolving.
- **Frontier references.** ML-augmented atmospheric subgrid (Brenowitz, Beucler); convection-permitting simulations.
- **Repo integration.** All Phase 6+. Promotes `common-spectral` for global; `common-ode` for stiff microphysics.
- **Verification.** Cloud-parcel rise; squall-line propagation.
- **Hardware target.** Tier 1/2.
- **Applications.** Weather research, climate-resolving simulations, gallery (storm aesthetic).

### 29.2 Volcanic Eruption (Magma + Conduit + Atmosphere)

- **Constituents.** § 9.7.6 non-Newtonian magma + § 9.7.11 compressible conduit + § 20.4.4 atmospheric scattering for plume.
- **Coupling.** Boundary at conduit (chamber-conduit interface); field-on-field at vent (conduit → atmosphere).
- **Time-stepping.** Sub-cycling — conduit fast (acoustic dt), chamber slow.
- **Production codes.** PDAC (Pyroclastic Dispersal Analysis Code); MFIX-2D for multiphase eruption.
- **Frontier references.** Coupled magma chamber-conduit-atmosphere simulations.
- **Hardware target.** Tier 1/2.
- **Applications.** Volcanology research, hazard assessment, education.

### 29.3 Solar Granulation (Convection + Radiation + MHD)

- **Constituents.** § 12.5.6 + radiation transport § 20.4.5 + MHD § 12.5.3.
- **Coupling.** Co-located. Convection drives radiative transfer; magnetic field shapes convection.
- **Production codes.** Stagger (Stein et al. 2024) — production radiative MHD of solar surface.
- **Frontier references.** Coupled radiation-MHD with surface convection.
- **Hardware target.** Tier 2.
- **Applications.** Solar physics research, public science.

### 29.4 Mantle Plume (Mantle + Lithosphere + Magma)

- **Constituents.** § 19.5.8 mantle convection + lithosphere mechanics + magma chemistry.
- **Coupling.** Field-on-field at lithosphere; chemistry as scalar advection.
- **Production codes.** ASPECT with magma module.
- **Hardware target.** Tier 2.

### 29.5 Coral Reef (Coral + Chemistry + Temperature)

- **Constituents.** § 18.5.9 coral + carbonate chemistry + thermal.
- **Coupling.** Field-on-field; coral growth responds to acidification and temperature.
- **Hardware target.** Tier 1.
- **Applications.** Climate-impact research, ocean acidification.

### 29.6 Tumor Microenvironment

- **Constituents.** § 18.5.3 tumor + vasculature flow + agent-based immune cells.
- **Coupling.** Co-located. Vasculature provides oxygen field; tumor cells consume; immune cells migrate via chemotaxis.
- **Production codes.** PhysiCell with vasculature extension.
- **Frontier references.** Multi-scale tumor-immune-vasculature modeling.
- **Hardware target.** Tier 1/2.

### 29.7 Wildfire Evacuation (Wildfire + Smoke + Crowd)

- **Constituents.** § 19.5.10 wildfire + § 20.4.4 smoke transport + crowd dynamics.
- **Coupling.** Field-on-field. Wildfire produces smoke; smoke reduces visibility for crowd; crowd flow alters evacuation outcomes.
- **Production codes.** WRF-Fire + agent-based; commercial emergency-response sims.
- **Hardware target.** Tier 1/2.
- **Applications.** Emergency management, climate-adaptation, education.

### 29.8 Battery Cell (Electrochem + Thermal + Mechanics)

- **Constituents.** RD electrochemistry + § 16.4.6 thermal + structural mechanics.
- **Coupling.** Co-located. Electrochemistry produces heat; thermal expansion stresses; stress alters reaction rates.
- **Production codes.** COMSOL Battery Module; research codes.
- **Frontier references.** Multi-physics pack thermal-runaway with mechanical failure.
- **Hardware target.** Tier 1/2.
- **Applications.** Battery R&D, safety analysis.

### 29.9 Tsunami Impact (Shallow Water + Sediment + Structures)

- **Constituents.** § 9.7.16 shallow water + § 19.5.3 sediment + § 10.6.1 FEM structures.
- **Coupling.** Boundary. Water inundates structures; sediment scour around foundations; structures fail under load.
- **Production codes.** Custom; combined tsunami-structure codes.
- **Hardware target.** Tier 1/2.
- **Applications.** Coastal hazard assessment.

### 29.10 Single Bacterium

- **Constituents.** § 17.6.12 membrane mechanics + RD intracellular + § 18.5.11 flagella hydrodynamics.
- **Coupling.** Co-located + boundary. Internal RD drives behavior; behavior controls flagella; flagella propel via Stokes flow.
- **Production codes.** Custom — frontier research.
- **Hardware target.** Tier 2.

### 29.11 Galaxy Disk (N-body + Gas + Star Formation)

- **Constituents.** § 12.5.1 N-body + § 9.7.7 compressible gas + chemistry-feedback.
- **Coupling.** Co-located. Gravity from stars+gas; gas dynamics with star formation sink terms.
- **Production codes.** GADGET-4, SWIFT.
- **Hardware target.** Tier 2.

### 29.12 Accretion onto Black Hole (GRMHD + Radiation + Jet)

- **Constituents.** § 12.5.4 GRMHD + § 20.4.5 radiation + magnetic jet launching.
- **Coupling.** Co-located. Radiation pressure backreacts on flow; jet launched via magnetic flux.
- **Production codes.** H-AMR, AsterX with radiation extensions.
- **Frontier references.** Beloborodov 2017 radiative reconnection; KHARMA.
- **Hardware target.** Tier 2.

### 29.13 Crowded Pedestrian Bridge

- **Constituents.** Crowd dynamics (adj § 14) + § 10.6.1 FEM structure + vibration modes.
- **Coupling.** Boundary. Crowd applies time-varying load; structure vibrates; vibration affects crowd gait synchronization.
- **Production codes.** Coupled crowd-structure codes (Millennium Bridge studies).
- **Hardware target.** Tier 1.
- **Applications.** Civil engineering, pedestrian safety.

### 29.14 Crash Test (Plasticity + Fracture + Multi-body)

- **Constituents.** § 10.6.5 plasticity + § 11.6.2 ductile fracture + multi-body dynamics.
- **Coupling.** Co-located.
- **Production codes.** LS-DYNA; commercial Abaqus.
- **Hardware target.** Tier 2.
- **Applications.** Automotive safety R&D.

### 29.15 Climate Cell (Atmosphere + Ocean + Cryosphere)

- **Constituents.** Adj § 20 atmospheric + § 9.7.22 ocean + § 19.5.5 ice sheet.
- **Coupling.** Field-on-field across coupled interfaces. Atmosphere drives ocean surface; ocean melts ice; ice modifies albedo.
- **Production codes.** Coupled climate models (CESM, GISS).
- **Hardware target.** Tier 2.

### 29.16 Living Tissue (CPM + FEM + RD)

- **Constituents.** Cellular Potts (§ 18.5.4) + § 10.6.1 FEM mechanics + RD signaling.
- **Coupling.** Co-located. Signaling drives cell behavior; cells exert forces; mechanics alters signaling environment.
- **Production codes.** CompuCell3D with mechanical extensions.
- **Frontier references.** Sultan et al. 2023 GPU CPM at tissue scale.
- **Hardware target.** Tier 1/2.

### 29.17 Photonic Chip (Photonic + Thermal + Carriers)

- **Constituents.** § 14.5.2 photonic + thermal + drift-diffusion semiconductor.
- **Coupling.** Co-located. Photons heat semiconductor; carriers absorb light; thermal expansion alters optics.
- **Production codes.** Tidy3D + semiconductor coupling; custom.
- **Hardware target.** Tier 2.

### 29.18 Fluidized Bed (DEM + Fluid + Heat)

- **Constituents.** DEM (adj § 12) + § 9.7.1 SPH + § 16.4.1 thermal.
- **Coupling.** Boundary at particle surfaces; field-on-field for heat.
- **Production codes.** LIGGGHTS + CFDEM; Project Chrono.
- **Hardware target.** Tier 1/2.
- **Applications.** Chemical engineering, energy.

### 29.19 Lab-on-Chip Sorter

- **Constituents.** § 9.7.13 microfluidic + multi-phase droplet + cell mechanics.
- **Coupling.** Boundary at droplet surfaces; cells inside droplets.
- **Production codes.** OpenFOAM + cell modeling.
- **Hardware target.** Tier 1.
- **Applications.** Biotech, point-of-care diagnostics.

### 29.20 Reservoir Simulation (Porous Flow + Geomechanics + Heat)

- **Constituents.** § 9.7.21 porous + § 10.6.5 geomechanics + thermal.
- **Coupling.** Co-located. Fluid pressure deforms rock; deformation alters permeability; flow carries heat.
- **Production codes.** MODFLOW + geomechanics; MOOSE.
- **Hardware target.** Tier 2.
- **Applications.** Oil & gas, CO₂ sequestration, geothermal.

### 29.21 Forest Ecosystem (Trees + Wind + Fire)

- **Constituents.** § 18.5.10 plant + atmospheric wind + § 19.5.10 wildfire.
- **Coupling.** Boundary at canopy.
- **Hardware target.** Tier 1.
- **Applications.** Forestry, climate adaptation.

### 29.22 Particle Accelerator (Beam + EM + Structural)

- **Constituents.** PIC (adj § 9) + § 14.5.1 EM cavity + structural support.
- **Coupling.** Co-located.
- **Production codes.** WarpX for beam; coupled to EM cavity codes.
- **Hardware target.** Tier 2.

### 29.23 Detonation Wave (Combustion + Shock + Compressible)

- **Constituents.** Combustion (adj § 16) + § 9.7.12 shock + § 9.7.7 compressible.
- **Coupling.** Co-located. Reaction heat drives shock; shock compresses to ignite.
- **Production codes.** Pele-LM, AMReX-Combustion.
- **Hardware target.** Tier 1/2.
- **Applications.** Defense, energy, propulsion.

### 29.24 Antibiotic Resistance Spread

- **Constituents.** § 18.5.8 bacterial colony + antibiotic RD + mutation stochastic.
- **Coupling.** Field-on-field + stochastic.
- **Hardware target.** Tier 1.
- **Applications.** Epidemiology, antibiotic stewardship.

### 29.25 Earthquake (Seismic + Fracture + Structural)

- **Constituents.** Seismic (adj § 11) + § 11.6.1 fracture + § 10.6.1 structural.
- **Coupling.** Field-on-field at fault; boundary at structures.
- **Production codes.** SeisSol + structural FEM.
- **Frontier references.** Coupled SeisSol-OpenSees for site response.
- **Hardware target.** Tier 1/2.
- **Applications.** Seismic hazard, earthquake engineering.

### 29.26 Hypersonic Re-Entry Plasma (Re-entry + Plasma + Radiation)

- **Constituents.** § 26.5.1 re-entry CFD + § 26.5.3 plasma sheath + radiation.
- **Coupling.** Co-located. Thermochemistry ionizes; plasma radiates; radiation heats vehicle.
- **Production codes.** CFD++ with plasma extensions; coupled US3D-plasma.
- **Hardware target.** Tier 2.
- **Applications.** Defense, space exploration.

### 29.27 Coronal Mass Ejection (Sun + Solar Wind + Magnetosphere)

- **Constituents.** § 12.5.6 solar surface + solar wind MHD + magnetosphere.
- **Coupling.** Boundary at heliosphere interfaces; field-on-field for MHD.
- **Production codes.** ENLIL → SWMF chain; EUHFORIA.
- **Frontier references.** End-to-end space-weather prediction.
- **Hardware target.** Tier 2.
- **Applications.** Space-weather forecasting.

## 30. Four- and five-sim signature compositions

Each entry is a 3-12 month project. These are the differentiating deliverables.

### 30.1 Solar Flare Simulator (5 sims)

- **Constituents.** § 12.5.3 MHD + § 12.5.5 reconnection + plasma heating + § 20.4.5 radiation + coronal loop dynamics.
- **Coupling.** Co-located, all five physics at every grid point.
- **Time-stepping.** Sub-cycling — reconnection fast, MHD slower, radiation slowest.
- **Production codes.** Athena++ + radiation; KHARMA on Parthenon.
- **Frontier references.** Beloborodov 2017 radiative reconnection in black-hole coronae; AthenaK applications.
- **Repo integration.** All sub-sims new (Phase 6+). Vendor AthenaK as Tier 2 anchor. Multi-GPU.
- **Verification.** Sweet-Parker scaling for reconnection; thin-target X-ray spectra against RHESSI observations.
- **Hardware target.** Tier 2. A100/H100 multi-GPU.
- **Applications.** Solar physics research; gallery hero "see the sun explode"; outreach; SciVis competition entry.

### 30.2 Habitable Coast Simulator (4 sims)

- **Constituents.** § 9.7.16 shallow water + § 19.5.3 sediment + estuary chemistry + ecology.
- **Coupling.** Field-on-field across all.
- **Production codes.** Delft3D + ecology; XBeach + sediment.
- **Frontier references.** RiverBedDynamics (Monsalve et al. 2025) coupled to atmospheric forcing.
- **Repo integration.** Shallow water + sediment from § 29.7; chemistry and ecology new. Heavy `common-mesh` consumption.
- **Verification.** Equilibrium delta morphology vs. observed; nutrient balance.
- **Hardware target.** Tier 1/2.
- **Applications.** Climate adaptation, coastal engineering, education.

### 30.3 Single Cell Simulator (5 sims)

- **Constituents.** RD intracellular + cellular Potts cell shape + agent-based organelles + chemical kinetics + membrane mechanics.
- **Coupling.** Co-located, multi-scale.
- **Time-stepping.** Sub-cycling across many timescales.
- **Production codes.** CompuCell3D + signaling integration; Sultan et al. 2023 GPU CPM.
- **Frontier references.** Multi-scale single-cell modeling community.
- **Repo integration.** Many sub-sims new; promotes `common-ode` and `common-mesh`.
- **Hardware target.** Tier 2.
- **Applications.** Synthetic biology, drug discovery, education.

### 30.4 Atmospheric Cell Simulator (5 sims)

- **Constituents.** Atmospheric flow + moisture + § 16.4.9 cloud microphysics + radiation + chemistry.
- **Coupling.** Co-located.
- **Production codes.** WRF chemistry-aware; CM1 + chemistry.
- **Hardware target.** Tier 2.

### 30.5 Game-Quality Vehicle Crash (5 sims)

- **Constituents.** § 10.6.5 plasticity + § 11.6.2 fracture + cabin air CFD + occupant FE + sensor.
- **Coupling.** Boundary + co-located.
- **Production codes.** LS-DYNA + occupant; commercial integrators.
- **Hardware target.** Tier 2.
- **Applications.** Automotive R&D, game physics.

### 30.6 Living Plant in Wind (4 sims)

- **Constituents.** § 18.5.10 L-system growth + branch mechanics + leaf dynamics + atmospheric flow.
- **Coupling.** Boundary + field-on-field.
- **Frontier references.** SpeedTree wind for VFX; de Langre tree-wind biomechanics.
- **Hardware target.** Tier 1/2.
- **Applications.** Forestry, climate, beautiful visuals.

### 30.7 Tokamak Edge Simulator (5 sims)

- **Constituents.** § 13.4.1 PIC + § 12.5.3 MHD + neutrals + impurity transport + wall sputtering.
- **Coupling.** Boundary at plasma-wall.
- **Production codes.** BOUT++, SOLPS-ITER, XGC.
- **Frontier references.** ITER design simulations.
- **Hardware target.** Tier 2.
- **Applications.** Fusion engineering; high-value research collaboration.

### 30.8 Additive Manufacturing Build (5 sims)

- **Constituents.** Laser beam + § 16.4.5 powder bed + melt pool fluid + § 10.6.7 solidification dendrite + § 10.6.5 residual stress.
- **Coupling.** Co-located, multi-scale.
- **Time-stepping.** Sub-cycling across laser pulse timescale, melt-pool timescale, microstructure timescale.
- **Production codes.** KiSSAM (Levkin 2024); ExaCA; Finch.
- **Frontier references.** Levkin et al. 2024 GPU LBM melt pool with adaptive mesh.
- **Repo integration.** All new. Promotes `common-amr` for melt-pool, `common-ode` for solidification kinetics.
- **Hardware target.** Tier 2.
- **Applications.** Industrial AM, materials science.

### 30.9 Atmospheric-Coupled Wildfire (4 sims)

- **Constituents.** § 19.5.10 wildfire + atmospheric flow + smoke transport + radiation.
- **Coupling.** Field-on-field; fire heats atmosphere, atmosphere drives spread.
- **Production codes.** WRF-Fire.
- **Hardware target.** Tier 2.

### 30.10 Lab-on-Chip Sorter (4 sims)

- **Constituents.** § 9.7.13 microfluidic + droplet + cell mechanics + sensor.
- **Hardware target.** Tier 1/2.

### 30.11 Embryonic Development (4 sims)

- **Constituents.** § 18.5.4 cellular Potts + RD signaling + tissue mechanics + cell division.
- **Production codes.** CompuCell3D, Morpheus, PhysiCell.
- **Hardware target.** Tier 2.

### 30.12 Wind Farm Full Simulation (5 sims)

- **Constituents.** Atmospheric boundary layer + actuator-line turbines (multi) + turbine multi-physics + grid integration + control.
- **Coupling.** Boundary at turbines (actuator-line); field-on-field for ABL.
- **Production codes.** FastEddy + OpenFAST coupling; AVBP for Horns Rev.
- **Frontier references.** Stipa et al. *WES* 2024 actuator-farm model with gravity waves; Taschner et al. *Wind Energy* 2024 GRASP-OpenFAST.
- **Repo integration.** All new (§ 25). Vendoring of FastEddy + OpenFAST.
- **Verification.** Wakebench benchmark.
- **Hardware target.** Tier 2.
- **Applications.** Wind energy R&D, energy transition policy.

### 30.13 Cardiac Digital Twin Full (5 sims)

- **Constituents.** Patient anatomy (MRI/CT segmentation) + fiber orientation (DTMRI) + § 18.5.1 cardiac EP (openCARP) + ECG forward + parameter inverse.
- **Coupling.** Sequential preprocessing + inverse-modeling loop.
- **Production codes.** Camps et al. *Med Image Anal* 2024 full pipeline; UK Biobank scale pipeline (*PLOS One* 2025).
- **Frontier references.** Personalized heart digital twins for scar-dependent VT (*Circulation* 2025) — first prospective clinical analysis.
- **Repo integration.** Cardiac EP (Phase 6+); preprocessing pipeline new; promotes `common-mesh` for medical-image meshing.
- **Verification.** Patient-specific ECG match (correlation > 0.9); ejection fraction match; clinical outcome correlation.
- **Hardware target.** Tier 2.
- **Applications.** Clinical drug testing, personalized therapy, FDA-track validation.

### 30.14 Power Grid Digital Twin (5 sims)

- **Constituents.** § 25.5.1 power flow + § 25.5.2 EMT + renewable inverters + control + market dispatch.
- **Coupling.** Cross-timescale; EMT fast, dispatch slow.
- **Production codes.** ParaEMT (NREL) for EMT; MATPOWER for power flow; GridLAB-D for distribution.
- **Frontier references.** ParaEMT WECC 240-bus and 10,080-bus systems with 25-36x GPU speedup.
- **Repo integration.** All new (§ 25). Promotes `common-graph`.
- **Hardware target.** Tier 2.
- **Applications.** Renewable integration, grid stability, energy policy.

### 30.15 Robotic Embodied AI Pipeline (5 sims)

- **Constituents.** § 23.4.1 humanoid + § 23.4.5 sensor + neural policy + § 23.4.7 generative world model + RL training.
- **Coupling.** Simulation → sensor → policy → action → simulation; world model generates scenarios.
- **Production codes.** Isaac Lab + GR00T + Cosmos.
- **Frontier references.** Mittal et al. arXiv 2511.04831 2024; NVIDIA Cosmos; NeRD neural simulator.
- **Repo integration.** Robotics family (§ 23) all new. Promotes `common-usd`.
- **Hardware target.** Tier 2.
- **Applications.** Humanoid robotics R&D, foundation model training for physical AI.

### 30.16 Drug Discovery FEP at Scale (4 sims)

- **Constituents.** § 17.6.3 MD-MLIP + § 17.6.4 FEP + enhanced sampling + docking pose generation.
- **Coupling.** Pipeline + alchemical lambda.
- **Production codes.** GROMACS GPU FEP; PyAutoFEP; Schrodinger FEP+ (commercial).
- **Frontier references.** GROMACS GPU FEP (*ACS Omega* 2025) 800% speedup.
- **Hardware target.** Tier 2.
- **Applications.** Drug discovery industry.

### 30.17 Hypersonic Re-Entry Full (5 sims)

- **Constituents.** § 26.5.1 non-equilibrium CFD + § 26.5.3 plasma sheath + radiation + ablation + structural-thermal protection.
- **Coupling.** Boundary at vehicle surface; co-located in shock layer.
- **Production codes.** CFD++; coupled DPLR-3D-PATO for ablation.
- **Frontier references.** Boltzmann-BGK GPU (arXiv 2312.06567) Apollo at Mach 22.7.
- **Hardware target.** Tier 2.
- **Applications.** Defense, space exploration.

### 30.18 Tumor Treatment Planner (5 sims)

- **Constituents.** § 18.5.3 tumor + vasculature + immune + § 20.4.2 radiation dose + treatment scheduling.
- **Coupling.** Co-located + optimization loop.
- **Hardware target.** Tier 2.

### 30.19 Sea-Ice-Atmosphere Coupling (4 sims)

- **Constituents.** Atmospheric + § 9.7.22 ocean + § 19.5.5 sea ice + thermal.
- **Hardware target.** Tier 2.

### 30.20 Drone Swarm Urban Air Mobility (4 sims)

- **Constituents.** § 23.4.3 drone autonomy + § 21.4.1 boids/swarm + § 9.7.10 aerodynamic wake + air-traffic control.
- **Coupling.** Boundary (aero per drone); co-located (swarm behavior + control).
- **Hardware target.** Tier 1/2.
- **Applications.** Urban air mobility R&D.

## 31. Six-plus sim flagship compositions

The 6-24-month flagship efforts. One or two per year of project life is realistic.

### 31.1 Habitable Planet Simulator (8 sims)

- **Constituents.** Atmosphere + § 9.7.22 ocean + § 19.5.5 ice + § 19.5.8 tectonics + biology + chemistry + § 20.4.5 radiation + magnetic field.
- **Coupling.** Multiple coupled interfaces.
- **Time-stepping.** Sub-cycling across geology (My), atmosphere (days), biology (years) — sophisticated timestep coupling required.
- **Production codes.** Coupled Earth-system models (CESM, GISS) — closest analogs; no single code does all 8 at production scale.
- **Frontier references.** Exoplanet atmosphere community; planetary habitability research.
- **Repo integration.** Multi-year build. Heavy `common-amr`, `common-mesh`, `common-spectral`, `common-graph`, `common-vdb` consumption.
- **Verification.** Reproduce Earth-system control runs; reproduce exoplanet climate predictions.
- **Hardware target.** Tier 2 multi-GPU.
- **Applications.** Climate science showcase, exoplanet astrobiology, education flagship, gallery hero, Steam game candidate.

### 31.2 Living Organ Simulator (7 sims)

- **Constituents.** Cell mechanics + § 18.5.1 EP + chemistry + blood flow + immune + repair + metabolism.
- **Coupling.** Multi-scale co-located.
- **Hardware target.** Tier 2.
- **Applications.** Medical research, drug discovery, surgical planning.

### 31.3 Galaxy Simulator (7 sims)

- **Constituents.** § 12.5.1 N-body + § 9.7.7 gas dynamics + § 20.4.5 radiation + chemistry + star formation + supernova feedback + magnetic field.
- **Coupling.** Co-located.
- **Production codes.** GADGET-4, SWIFT with chemistry; FIRE simulations.
- **Hardware target.** Tier 2.
- **Applications.** Cosmology research, gallery flagship.

### 31.4 Single Whole-Star Simulator (6 sims)

- **Constituents.** Self-gravity + § 12.5.6 convection + radiation transport + magnetic field + rotation + nuclear burning.
- **Coupling.** Co-located.
- **Production codes.** MESA (1D) + 3D codes for specific phases.
- **Hardware target.** Tier 2.
- **Applications.** Stellar astrophysics, education.

### 31.5 Whole-Earth Engineering Simulator (8 sims)

- **Constituents.** § 19.5.8 mantle + crust + atmosphere + ocean + ice + biosphere + tectonics + climate.
- **Hardware target.** Tier 2.

### 31.6 Smart City Full Stack (7 sims)

- **Constituents.** Traffic (adj § 21) + power grid (§ 25) + water + air quality (§ 20.4.4) + crowd (adj § 14) + epidemic (§ 21.4.4) + economy.
- **Coupling.** Field-on-field + co-located.
- **Frontier references.** Loimos California digital twin (arXiv 2401.08124, 2024) — 42 seconds for 200 days COVID outbreak.
- **Hardware target.** Tier 2.
- **Applications.** Urban planning, smart-city research, civic engineering.

## 32. Composition-to-research-domain mapping

| Domain | Anchor compositions |
|---|---|
| Climate science | Habitable Coast (30.2), Atmospheric Cell (30.4), Atmospheric-Coupled Wildfire (30.9), Climate Cell (29.15), Sea-Ice-Atm (30.19), Habitable Planet (31.1) |
| Astrophysics | Solar Flare (30.1), Solar Granulation (29.3), Galaxy (29.11, 31.3), Whole Star (31.4), Accretion (29.12), CME (29.27) |
| Geophysics | Mantle Plume (29.4), Volcanic Eruption (29.2), Earthquake (29.25), Whole-Earth Engineering (31.5) |
| Materials science | AM Build (30.8), Crash Test (30.5, 29.14), Detonation (29.23), Photonic Chip (29.17) |
| Biological sciences | Single Cell (30.3), Embryonic Development (30.11), Tumor Treatment (30.18), Living Organ (31.2), Cardiac Digital Twin (30.13) |
| Drug discovery | Drug Binding FEP (28.24, 30.16) |
| Plasma / fusion | Tokamak Edge (30.7), Particle Accelerator (29.22), Solar Flare (30.1) |
| Engineering CFD | Lab-on-Chip Sorter (29.19, 30.10), Drone Swarm (30.20), Coral Reef (29.5), Wind Farm (30.12) |
| Energy systems | Wind Farm (30.12), Power Grid (30.14), Battery (29.8) |
| Hypersonics / aerospace | Re-Entry Full (30.17), Scramjet, Hypersonic Plasma (29.26) |
| Robotics | Manipulation Sim-to-Real (28.25), Embodied AI Pipeline (30.15) |
| Quantum simulation | Tensor Network DMRG (28.28) |
| Game development | Vehicle Crash (30.5), Plant in Wind (30.6), all 2-sim compositions |
| Education / outreach | All 2-sim compositions; signature compositions as hero pieces |

## 33. Composition-to-product-mode mapping

The catalog supports four product modes (per the broader Bit-Physics roadmap): research, gallery, games, packages. Mapping:

| Product mode | Best-fit compositions |
|---|---|
| **Research collaboration** (paper-track) | All 4-5-sim signature, all 6+ flagship, plus selected 3-sim where there's a clear publication anchor (Solar Granulation, Tumor Microenvironment, Tsunami Impact, AM Build, Wind Farm, Cardiac Digital Twin, Re-Entry Full) |
| **Gallery / SciVis** (visual) | Buoyancy (28.1), Smoke + Lighting (28.18), Wildfire + Wind (28.19), Solar Flare (30.1), Plant in Wind (30.6), Habitable Planet (31.1), Galaxy (31.3) |
| **Steam game** (engaging interactive) | Vehicle Crash (30.5), Plant in Wind (30.6), Habitable Planet (31.1), Smart City (31.6), Drone Swarm (30.20), all 2-sim compositions reimagined as game mechanics |
| **PyPI package** (research-reusable) | Drug Binding FEP (28.24, 30.16), Photonic Inverse Design (28.22), Tensor Network DMRG (28.28), Cardiac Digital Twin (30.13), Power Grid (30.14), Robotic Manipulation (28.25), MLIP fine-tuning (24.5.2) |

This mapping is the basis for sub-charter prioritization in Part IV.

---


# Part IV — Implementation Roadmap from Phase 5

This Part is the practical translation of Parts I-III into a build sequence. It does not commit any execution; that's the job of Phase 6+ sub-charters. The roadmap here recommends ordering, identifies the first compositions to pursue, sequences the new common-module promotions, and surfaces the open decisions.

## 34. Build-sequence rationale assuming Phase 5 baseline

Three constraints shape any reasonable sequence starting from a complete Phase 5:

**Constraint 1 — Infrastructure precedes consumers.** A composition like Buoyancy-Driven Flow needs both Eulerian smoke (✅) and a proper heat-equation sim. The heat-equation sim is *implied* by `common-warp` time-stepping primitives but isn't itself a published sim at Phase 5. **Implication:** the first work after Phase 5 should be a "maintenance sweep + light-fill" pass that promotes implicit Phase-5 capability into published sims, and that builds the small `common-mesh`, `common-vtk`, `common-units`, and `common-ode` modules — without which most catalog entries can't be cleanly implemented.

**Constraint 2 — Library quality, not feature count.** Per § 3.3 Gap 3, the strategic asset is breadth at consistent quality, not any one sim being state-of-the-art. **Implication:** every new sim takes the time to polish to the Phase 5 level (13-gate per-sim acceptance, cross-tier matched-pair equivalence, audit-replay, productization through whichever pipelines are appropriate). Avoid shipping "rough drafts" — the catalog is long enough that selection is the constraint, not throughput.

**Constraint 3 — First-composition derisks the architecture.** The composition layer is genuinely new for Bit-Physics. Until at least one composition has been built end-to-end (including its own equivalence gate, its own audit-replay, its own productization), the composition architecture is unproven. **Implication:** an early-Phase-6 priority is to ship *one* 2-sim composition under the framework of § 5, not many compositions. The selection should be the simplest plausible composition that exercises the architecture: a known-stable coupling between two existing sims.

### 34.1 Recommended sequence (high-level)

1. **Phase 6.0 maintenance sweep** — Phase 0-5 deliverable audit; dependency updates; CI freshness; doc-rot fixes. Per the Phase 6 charter § 2.1.
2. **First common-module promotions** — `common-mesh` (rule-of-three already met for fluid, fracture, FEM compositions); `common-vtk` (cross-cutting output); `common-units` (cross-cutting safety); `common-ode` (consumed by multiple new sims).
3. **2-3 first new sims** drawn from the highest-priority Part II entries (see § 35).
4. **First 2-sim composition** — Buoyancy-Driven Flow (§ 28.1) recommended; see § 36 rationale.
5. **Iterate** — alternate new sims and new compositions, building outward in the priority order from § 35.
6. **First 3-sim composition** when the toolkit (composition coupling library, verification by parts, audit-replay) is mature enough; ideally year-2 of Phase 6.
7. **First signature composition** (4-5 sims) — year 2-3 of Phase 6, after the architecture has shipped at least 2-3 prior compositions cleanly.
8. **First flagship** — multi-year effort, only after the project is producing compositions on cadence.

This is a 5-10 year planning horizon. Most of the catalog will not be built. The catalog is for *selection*, not exhaustion.

### 34.2 What this means for sub-charters

A Phase 6+ sub-charter author reading this catalog should:

- Treat Part I as the design context (especially § 7 integration patterns).
- Treat Part II as the candidate slate; pick one entry.
- Reference the appropriate composition entries in Part III to see how the new sim might combine with others later.
- Cross-reference Part IV to see whether the priority ordering supports the choice, or whether there's a higher-leverage option.
- Cross-reference Appendix B for stack-by-tier guidance.

## 35. Priority ordering across all phenomena

The following 16-item priority list orders the catalog by *expected leverage*: a function of (a) educational value (multiple compositions will use it), (b) frontier-research value (publishable in 2025-2027), (c) implementation cost (lower is better), (d) availability of vendoring anchors. **`JUDGMENT`** throughout.

| Rank | Entry | Type | Rationale |
|---|---|---|---|
| 1 | Phase 6.0 maintenance sweep | Maintenance | Required; per Phase 6 charter. Not a sim but precedes everything. |
| 2 | `common-mesh`, `common-vtk`, `common-units`, `common-ode` promotions | Infrastructure | Multiple catalog entries can't proceed cleanly without these. |
| 3 | § 17.6.3 MD with MLIPs | Sim (new family) | Biggest frontier shift; major industry investment; Tier 2 vendoring of MACE/NequIP straightforward (MIT/Apache); promotes `common-mlip` (largest infrastructure investment). |
| 4 | § 9.7.16 Shallow water + § 19.5.3 sediment + § 28.7 composition | Sim + 2-sim composition | Tier 0 friendly; canonical scientific composition; Landlab vendoring; "Habitable Coast" path. |
| 5 | § 12.5.3 Continuum MHD + § 28.13 reconnection composition | Sim | Astrophysics anchor; AthenaK/gPLUTO vendoring; flagship-path enabler. |
| 6 | § 28.1 Buoyancy-driven flow | First 2-sim composition | Both sub-sims exist at Phase 5; smallest derisking effort for composition architecture. |
| 7 | § 11.6.5 Phase-field fracture | Sim | Major engineering family; Tier 0 friendly; PRISMS-PF or MOOSE vendoring. |
| 8 | § 18.5.2 Cardiac digital twin pipeline | Sim composition (signature) | Highest clinical impact; openCARP vendoring; Camps et al. 2024 reference pipeline. |
| 9 | § 10.6.7 Phase-field crystal growth (dendrite) | Sim | Visual hero; bridges to AM (composition § 30.8); PRISMS-PF shared with fracture. |
| 10 | § 19.5.10 Wildfire CA + § 28.19 wind composition | Sim + 2-sim composition | Climate-adaptation timely; PyTorchFire reference; Tier 0 visual. |
| 11 | § 9.7.5 Multiphase VOF + § 28.14 surface tension | Sim composition | Major fluid-family gap; Basilisk reference; bridges to inkjet, biology. |
| 12 | § 20.4.1/2 MC radiation transport + § 28.22 photonic inverse | Sim + composition | Mitsuba 3 vendor; bridges to WU-C; inverse-design gallery. |
| 13 | § 13.4.1 PIC plasma | Sim (adj § 9 promoted) | WarpX vendoring; bridges to solar flare flagship. |
| 14 | § 16.4.4 Combustion + § 28.4 smoke + combustion | Sim + composition | Detonation / fire / propulsion path; Pele vendor. |
| 15 | § 22.4.7 Tensor network DMRG | Sim | Frontier; promotes `common-tensor-net`; bridges to quantum circuit composition. |
| 16 | § 23.4.2 Robotic manipulation + § 28.25 sim-to-real | Sim + composition | Robotics family; MuJoCo MJX vendoring (Apache); promotes `common-usd`. |

After rank 16, the priority order is no longer strongly justified by leverage and becomes a function of the project owner's specific interests. The full Part II catalog remains the candidate slate.

## 36. First-composition candidates

Three candidates rank highest for the very first composition:

### 36.1 Candidate A — Buoyancy-Driven Flow (§ 28.1)
- **Pros.** Both sub-sims at Phase 5; coupling is field-on-field (simplest pattern); analytic verification anchor (Rayleigh-Bénard critical Ra); Tier 0 instance is genuinely interactive and visually compelling; no new common-modules required.
- **Cons.** Heat-equation sim isn't formally published at Phase 5 (it's implicit via `common-warp`); composing requires first promoting it.
- **`JUDGMENT`: RECOMMENDED as first composition.** The promotion of the heat-equation sim is itself a small valuable step.

### 36.2 Candidate B — Boids + Predator (§ 28.8)
- **Pros.** Boids exists (✅); predator is a small extension; coupling is co-located (clean); Tier 0 trivial and visually compelling; no new common-modules.
- **Cons.** Verification is qualitative; no analytic anchor; less convincing as proof of the composition framework's verification rigor.

### 36.3 Candidate C — Reaction-Diffusion + Cardiac (§ 28.9)
- **Pros.** RD-2D is the canonical Layer 4 reference; cardiac specialization is a small extension; co-located coupling is the most complex pattern but the simplest example of it (lockstep with shared kinetics); promotes cardiac as a sim family.
- **Cons.** Cardiac kinetics requires the stiff-ODE infrastructure (`common-ode`) before being clean; more dependencies than Candidate A.

**Recommendation: build Candidate A (Buoyancy-Driven Flow) as the first composition.** Use it to validate the composition architecture (coupling module, verification by parts, audit-replay, productization-as-a-composition). Then move to Candidate B as the second (simplest possible follow-up) before tackling Candidate C and the broader composition slate.

## 37. Common-module promotion gates

The rule-of-three threshold (Convention 7.10) governs `common-*` module promotion. The order below reflects the priority sequence in § 35:

| Module | Status | Consumers (rule-of-three evidence) | Promotion gate |
|---|---|---|---|
| `common-mesh` | Promote first | Fluid (multiphase VOF, airfoil), Fracture (peridynamics, phase-field), Cardiac (heart geometry), Robotics (URDF/MJCF), Mantle (ASPECT-port) | ≥5 prospective consumers; promote during Phase 6.0. |
| `common-vtk` | Promote first | Any Tier 1/2 sim wanting ParaView output | Cross-cutting; promote during Phase 6.0. |
| `common-units` | Promote first | All sims (dimensional safety) | Cross-cutting; promote during Phase 6.0. |
| `common-ode` | Promote second | Cardiac, combustion, batteries, chemical kinetics, EMT | ≥5 prospective consumers; promote during Phase 6.1. |
| `common-amr` | Promote third | Compressible shock, astrophysics, AM, multiphase | ≥4 prospective consumers; promote when astrophysics or AM begins. |
| `common-mlip` | Promote when MD-MLIP begins | MD-MLIP, materials discovery, battery materials, catalysis | ≥4 prospective consumers; promote at rank 3 in § 35. |
| `common-spectral` | Charter-listed | Wave family, BEC, atmospheric, ocean | Already at threshold; promote when first wave sim or BEC enters. |
| `common-fmm` | Charter-listed | Astrophysics N-body, EM, plasma | Promote when astrophysics enters. |
| `common-em` | Charter-listed | All EM family | Promote when first FDTD enters. |
| `common-elastica` | Charter-listed | Hair, cables, plant branches | Promote when Cosserat hair enters. |
| `common-adjoint` | Charter-listed | All WU-A consumers | Already at threshold; can promote anytime; useful infrastructure. |
| `common-stochastic` | Charter-listed | MC photon, MC neutron, MC chemical kinetics | Promote when radiation transport family enters. |
| `common-graph` | Promote when network ABM enters | Epidemic, opinion, traffic, power grid | Promote when first network sim enters. |
| `common-vdb` | Promote when 3D scaling matters | Smoke 3D at scale, MPM 3D at scale, AM thermal at part scale | Promote when first 3D-at-scale sim enters. |
| `common-usd` | Promote when robotics enters | Robotics, digital twins | Promote at rank 16 in § 35. |
| `common-tensor-net` | Promote when quantum sims expand | DMRG, quantum circuit, condensed-matter quantum | Promote at rank 15 in § 35. |

The cluster of "promote first" modules (`common-mesh`, `common-vtk`, `common-units`, `common-ode`) suggests a single Phase 6.0 mini-phase focused on infrastructure. After that mini-phase, the first 3-4 new sims in the priority order can ship cleanly.

## 38. Open decisions

The catalog identifies eight open decisions that the project owner should resolve before they bottleneck Phase 6+ sub-charter authoring. Each is presented with rationale; none are commitments.

### D-1 — Public artifact for the catalog
**Question:** Should the catalog be split into per-family public artifacts for the website / public planning, or remain a single private planning document?
**Options.** (a) Split into per-family `.md` files in `docs/catalog/<family>.md` for public surfacing. (b) Keep monolithic for internal planning only. (c) Both — monolithic internal version + curated public per-family snippets.
**Default position.** (c) Both. Internal version stays full-detail; public version is the curated subset that maps to actual sims shipping.
**Decision needed.** When the first per-family sub-charter is written.

### D-2 — Flagship cadence and count
**Question:** How many flagships (§ 31) should the project aim to ship over its lifetime?
**Options.** (a) 1 per 1-2 years (3-5 total). (b) Focus on 1 truly polished. (c) None; stop at signature compositions.
**Default position.** (a) 1 per 1-2 years, 3-5 total. The Habitable Planet, Galaxy, and one Earth-system flagship would be canonical.
**Decision needed.** Before the first signature composition ships; influences whether to build infrastructure for cross-flagship reuse.

### D-3 — Bespoke vs. unified composition runtime
**Question:** Should the catalog implement compositions as bespoke sims under `compositions/<name>/`, or build a general composition runtime?
**Options.** (a) Bespoke for the first ~30 compositions; revisit. (b) Build runtime from the start. (c) Hybrid — common coupling primitives in `common-coupling/`, but each composition's coupling logic is bespoke.
**Default position.** (a) Bespoke initially. If a pattern emerges after 30+ compositions, (c) becomes the natural evolution.
**Decision needed.** Not yet — accumulate evidence first.

### D-4 — Steam games as deliverable category
**Question:** Should the project actively pursue Steam-game distribution as a target?
**Options.** (a) Yes; build games informed by what compositions succeed. (b) No; stop at packaged sims and gallery. (c) Emergent — if a composition naturally has game potential, productize it then.
**Default position.** (c) Emergent. The composition framework already accommodates "engaging interactive" as one of four product modes (§ 33).
**Decision needed.** When the first composition with game potential ships (likely Plant in Wind, Habitable Planet, Drone Swarm).

### D-5 — Vendoring license posture
**Question:** What is the project's posture on vendoring upstream codes with GPL, LGPL, custom-commercial, or restrictive licenses?
**Options.** (a) Vendoring permitted under any open-source license; commercial codes vendored only if license permits. (b) Strict — only permissive (MIT, BSD, Apache) and small references for verification only. (c) Per-case decision by owner.
**Default position.** (c) Per-case. The bulk of useful Tier 2 codes (GROMACS LGPL, openCARP Apache, ASPECT GPL, ISSM BSD, NequIP MIT, MACE MIT, MuJoCo Apache, MJX Apache) are vendorable under (a); GPL codes need care because the project's own license shapes them.
**Decision needed.** Before first Tier 2 vendoring sub-charter; ideally before MD-MLIP work begins.

### D-6 — Multi-tier matched-pair gates for compositions
**Question:** Should compositions enforce matched-pair equivalence between their tiers, like sims do?
**Options.** (a) Yes; same gate as sims. (b) No; compositions are too coupled-physics for clean equivalence. (c) Per-composition decision; document in spec.
**Default position.** (c) Per-composition. Some compositions (RD + Cardiac, Buoyancy) naturally admit matched-pair gates; others (Solar Flare, AM Build) don't because the sub-sims at different tiers may be different algorithms.
**Decision needed.** When the first composition ships at more than one tier.

### D-7 — "Coming soon" placeholders on website
**Question:** Should the public-facing website include placeholders for catalog entries that haven't shipped, or only show shipped work?
**Options.** (a) Only shipped — clean public face. (b) Show placeholders with status badges (planned / in-progress / shipped). (c) Show curated forward-looking content (next 2-3 sims) but not full catalog.
**Default position.** (a) Only shipped. The catalog is internal; the public face is the gallery of completed work.
**Decision needed.** When website goes public.

### D-8 — Catalog parallel-TOC by visual signature
**Question:** Should there be a parallel TOC organized by visual signature (e.g. "fractal patterns", "wave patterns", "vortex patterns") in addition to the by-family organization?
**Options.** (a) Yes; useful for gallery and Steam-game-planning lens. (b) No; redundant. (c) Defer — see how readers actually use the catalog.
**Default position.** (a) Yes, as Appendix H if the catalog goes to v3. Visual taxonomy is genuinely useful for the gallery axis.
**Decision needed.** v3 of the catalog.

---

# Part V — Testing, Verification, and Quality at Scale

The catalog has so far treated testing as something the Phase 5 substrate provides — and it does, at a high standard. This Part surfaces what that machinery looks like when it has to scale from ~13 baseline sims to a portfolio of ~170 phenomena and ~95 compositions (potential maximum; realistic implementation will be 15-30 % of that over a multi-year horizon). At that scale, "we have good tests" stops being a property and becomes a *process*. This Part is about the process.

The user's explicit posture is TDD-first with robust accuracy and seamless debugging through an AI agent. Every recommendation below is shaped by that posture: tests committed before implementation, replay artifacts deterministic to the bit, debugging context structured for non-human consumption, regressions caught locally rather than at integration.

## 39. Inherited testing posture (recap from spec § 1.3, § 2, § 3.5)

A snapshot of what the Phase 5 substrate already enforces, so the rest of this Part can build without re-deriving:

| Mechanism | What it tests | Where it lives |
|---|---|---|
| **MMS** (method of manufactured solutions) | Code verification — does the solver implement the PDE correctly? | `tools/testkit/code_verification/mms/` |
| **GCI** (grid convergence index via Richardson) | Solution verification — is this run grid-converged? | `tools/testkit/solution_verification/` |
| **Golden-value tables** | Closed-form algorithm verification (SPH kernels, LBM equilibria, fractal DEs) — with ≥ 3 independent-reference anchors per table | `tools/testkit/golden/` |
| **Determinism harness** | Capture-twice-and-diff; per-component declarations (bit-exact / epsilon / non-det-by-design) | `tools/testkit/determinism/` |
| **Cross-stack equivalence** | Matched-pair gates across stacks, per-sim tolerance budget that never widens | `tools/testkit/equivalence/` |
| **Property-based testing** (PBT) | Hypothesis-style random invariants — conservation, symmetries, bounds | `tools/testkit/property/` |
| **Mutation testing** | Tests the tests — testkit/integrity at ≥ 80-90 %, SOFT_WARN on push, HARD_FAIL at phase landing | `tools/testkit/mutation/` |
| **Capture-format JSON Schema** | Schema-versioned; append-only legacy-captures regression corpus prevents silent breakage | `tools/testkit/schemas/`, `tests/fixtures/legacy-captures/` |
| **Pre-implementation probe** | Read-the-disk verification of every fact a sub-charter assumes before writing implementation | `tools/testkit/probes/` |
| **TDD failing-tests-evidence** | Tests committed FAILING first; verbatim output captured + sha256 in commit footer; phase-landing audit replays | `tools/testkit/failing-tests-evidence/` |
| **Perf regression ledger** | Per-sim wall-clock + hardware-id row per phase | `docs/perf-ledger.md` |
| **Integrity toolkit Cat 1-5** | Cat 1 citation chain, Cat 2 API contract, Cat 3 verification gate, Cat 4 draft-time spec grammar, Cat 5 provenance traceability | `tools/integrity/` |
| **Infrastructure verification surrogates** | When MMS/GCI don't apply (testkit, pipelines, common-* modules) — smoke contracts + capture round-trip + determinism harness | spec § 2.11 |
| **13-gate per-sim acceptance** | Composite acceptance bundling all of the above per spec § 3.5 v2.4 | spec § 3.5 |

This list is dense because the substrate is dense. The rest of Part V assumes all of it exists and works at Phase 5 close.

## 40. Why testing-at-scale needs its own treatment

At 13 sims, the testing burden is tractable: every gate runs in CI, every regression is visible, every contributor can hold the full surface in their head. At ~170 sims with cross-tier matched pairs (so each sim has 1-3 instances) plus ~95 compositions (each with its own equivalence and verification posture), the test surface explodes:

- **Per-sim CI time.** A 13-gate run on a single sim might be 5-15 minutes wall-clock at decent infrastructure. 170 sims × ~3 tier instances × 15 min = 8,500 CI-minutes for a full sweep. At 10x parallelism that's still 14 hours.
- **Per-composition CI time.** Compositions add their own equivalence layer plus verification by parts. Probably 30-90 minutes per composition.
- **Combined matrix.** Cross-stack (B × C × D × E × F) × cross-tier (0 × 1 × 2) is up to 15 combinations per sim before the matched-pair gates even fire.
- **Tolerance-budget proliferation.** Every cross-stack pair has its own tolerance row; never-widening discipline means each row is permanent. By 170 sims, the tolerance budget file is thousands of rows.
- **Reference-data freshness.** Cited papers go stale, vendored upstream codes update, golden values need re-derivation when upstream SHAs change.
- **Composition coupling stability.** Each composition's coupling pattern (sub-cycling ratio, implicit tolerances, operator-splitting order) has its own stability surface that must be tested independently.

Scale changes what "good testing" means. The 13 gates per sim are necessary but no longer sufficient. Three new layers are needed:

1. **Sharded CI strategy** — not every gate runs on every push.
2. **Test-suite health monitoring** — mutation scores, fixture freshness, citation staleness become first-class signals.
3. **AI-agent-driven triage** — when something breaks, the structured replay context must be sufficient for an agent to identify and propose a fix without a human walking the call stack.

These three layers are the substance of the rest of this Part.

## 41. Tiered CI pipeline strategy

**Naming correction from v2.0.** Earlier drafts of this section called the structure below a "five-tier testing pyramid." That was wrong terminology and worth correcting explicitly. There are two distinct industry concepts that I had conflated:

1. **The testing pyramid** — Mike Cohn, *Succeeding with Agile* (2009). About *test types and granularity*: many fast cheap unit tests at the base, fewer integration tests in the middle, very few slow expensive end-to-end tests at the top. The shape describes the proportion of test types in a suite. Martin Fowler's "Practical Test Pyramid" is the canonical modernization; the laws-of-software-engineering compendium and the Semaphore / TestRail / CircleCI guides all converge on the same three-layer model. The pyramid is *not* about CI scheduling.
2. **Tiered CI pipelines / multi-stage pipelines** — what this section is actually describing. About *cadence and execution stage*: fast checks on every commit, broader checks on PR, comprehensive checks on merge, heavy checks scheduled nightly/weekly. GitLab's Testing Strategy doc uses Tier 1 / Tier 2 / Tier 3 explicitly for merge-request pipelines. Microsoft's Engineering Fundamentals Playbook ("smoke tests as a gate"), DevOps.com's 3-tier performance testing framework, MOSS's "multi-tier pipelines" guide, and various 2025-2026 industry write-ups all describe the same pattern.

The structure below is squarely in the second tradition (tiered CI), not the first (test pyramid). I'm preserving the five-tier breakdown because it maps cleanly onto the Phase 6+ cadence (per-push / per-PR / nightly / weekly / phase-landing). Industry guides more commonly land on 3-4 tiers — typical canonical breakdowns: GitLab uses three tiers; MOSS uses three (PR / merge / nightly); techbuddies.io 2025 uses four (pre-commit / CI-on-PR / pre-deploy-staging / pre-production). The fifth tier here (T5 phase-landing) is genuinely specific to Bit-Physics — most industry projects don't have explicit phase landings with operator tag-pushing semantics, so industry doesn't need it. It's a Bit-Physics convention layered on top of the standard pattern, not a generic best practice.

If you'd prefer to collapse to a four-tier model that matches industry vocabulary more closely, T1+T2 stay, T3+T4 merge into a single "scheduled comprehensive" tier, and T5 becomes a phase-landing checkpoint outside the tier system. Both five- and four-tier formulations are defensible; I default to five here for the per-sub-charter granularity, but flag this as **D-9** (open decision; see § 38).

With that corrected: the structure has five tiers, ordered from cheapest+fastest+most-frequent (T1) to most-expensive+rarest (T5). Every commit hits the top tiers; deeper tiers run on schedule.

```
                ┌──────────────────────────────────┐
                │  T1 — Hot per-push smoke         │  every push, ~1 min
                │  ──────────────────────────────  │
                │  T2 — Per-PR full-sim gate       │  every PR, ~30 min
                │  ──────────────────────────────  │
                │  T3 — Nightly cross-stack /      │  nightly, ~3 hours
                │       cross-tier equivalence     │
                │  ──────────────────────────────  │
                │  T4 — Weekly mutation / fuzz /   │  weekly, ~12 hours
                │       long-running stability     │
                │  ──────────────────────────────  │
                │  T5 — Phase-landing full audit + │  per phase landing,
                │       perf-ledger re-baseline    │  hours-to-days
                └──────────────────────────────────┘
```

### 41.1 T1 — Hot per-push smoke

Runs on every push to any branch in under ~1 minute. Includes:
- Lint, typecheck, format-check on the diff.
- Smoke import of every new / changed public API.
- Capture round-trip on canonical small fixtures.
- Integrity Cat 1 (citation chain) and Cat 4 (draft-time spec grammar) on changed docs.
- Pre-implementation probe template lint on probe reports.

What it catches: typos, broken imports, fabricated citations, draft-spec violations.

### 41.2 T2 — Per-PR full-sim gate

Runs on every PR to integration / main. ~30 minutes wall-clock. Includes:
- Touched sims: full 13-gate per-sim acceptance.
- Touched common-modules: smoke contracts + capture round-trip + determinism harness (spec § 2.11).
- Touched testkit modules: mutation-test SOFT_WARN.
- Integrity Cat 2 (API contract) + Cat 3 (verification gate) + Cat 5 (provenance traceability) on touched files.

What it catches: per-sim verification regressions, broken cross-references, contract violations, tests that pass but invalidate downstream claims.

### 41.3 T3 — Nightly cross-stack / cross-tier equivalence

Runs every night on main and integration. ~3 hours wall-clock. Includes:
- Full cross-stack equivalence matrix for every Layer 4+ sim (every sim × every stack pair where matched-pair is declared).
- Full cross-tier matched-pair gates for every sim at multiple tiers (Tier 0 ↔ Tier 1, Tier 1 ↔ Tier 2 where algorithm aligns).
- All compositions with declared equivalence: full coupling stability run.
- Capture-format legacy-captures regression corpus replay.
- Tolerance-budget drift check (any tolerance row widening = HARD_FAIL).

What it catches: stack drift (one stack subtly diverging from another), tier drift (Tier 0 web sim diverging from Tier 1 desktop), composition coupling instability under realistic parameters, schema-version breakage on old captures.

### 41.4 T4 — Weekly mutation / fuzz / long-running stability

Runs weekly. ~12 hours wall-clock with multi-GPU. Includes:
- Mutation testing on every testkit + integrity module (HARD_FAIL on threshold regression).
- Capture-format fuzzing — malformed, partial, mixed-version inputs.
- Long-running stability tests — orbital mechanics N-body for 10⁶ steps no NaN; cardiac EP for 30 minutes-of-physiology no drift; fluid sims for 10× normal duration no energy blowup.
- Numerical-stability fuzzing — adversarial parameter sweeps near phase transitions, near-singular initial conditions, hardware-precision-limit parameters.
- Hardware-portability sweep — same sim on RTX 4070 / RTX 6000 / A100 / H100, equivalence within determinism declaration.

What it catches: weak tests that pass for the wrong reason, edge-case crashes, slow drift in conservation laws, hardware-specific FP behavior changes.

### 41.5 T5 — Phase-landing full audit + perf re-baseline

Runs at every Phase 6+ sub-charter landing. Hours-to-days. Includes:
- Full T1+T2+T3+T4 sweep on the landing commit.
- Verbatim re-execution of every committed failing-tests-evidence trace; sha256 must match.
- Per-sim performance regression ledger row recorded with new commit SHA.
- Tolerance-budget review: any new rows justified, no rows widened.
- Citation-staleness sweep: every cited paper / preprint URL still resolves; flag DOIs that have moved.

What it catches: drift since the last phase landing, fabricated test passes, performance regressions, bibliography rot.

### 41.6 Tier shifting under load

When CI capacity is saturated (e.g., during heavy active development with many parallel sub-charters), the **opt-in heavy-test override** lets a sub-charter explicitly request T3 or T4 to run on its PR. Default is T1+T2 only; the override is a tag in the PR description. This prevents the queue from collapsing under uncoordinated parallel work while keeping the depth available when it matters.

## 42. Per-sim testing — beyond the 13 gates

The spec's 13-gate per-sim acceptance defines what *minimally passes*. The catalog can describe what a *well-tested* sim looks like at scale, which is denser than the 13 gates.

For every catalog entry (every phenomenon in Part II), a fully-tested implementation should ship:

### 42.1 Verification anchors

- **MMS solutions library entry** — for sims solving a PDE, at least one manufactured solution committed at `tools/testkit/code_verification/mms/solutions/<sim>.py`, with the symbolic source-term derivation and resolution sweep. Per-family analytic-solution candidates are catalogued in Appendix H.
- **Golden-value tables** — for closed-form algorithms (kernels, force laws, equation-of-state queries), tables in `tools/testkit/golden/tables/` with derivation document and ≥ 3 independent-reference anchors per table (spec § 2.4 requirement).
- **GCI report** — for sims claiming solution-verified status, a multi-resolution convergence report committed at sim acceptance. Typical thresholds: 1 % for product-grade, 5 % for research-grade.
- **Calculation-validation reference** — at least one published experimental or observational benchmark the sim reproduces, with the reference dataset committed under `references/<sim>/` and the comparison test committed in CI.

### 42.2 Property-based invariants

At least one PBT test per declared conservation property or symmetry. Common surfaces per family:

- **Fluids** — mass conservation under random forcing; momentum conservation in periodic BCs; energy non-increase in dissipative regime.
- **Solids** — symmetry preservation under random rotations; passivity (elastic energy non-negative); contact forces non-tensile.
- **Plasma** — charge conservation in PIC; Maxwell's equations satisfied to declared tolerance; γ²-1/c²·v² constraint in relativistic regime.
- **Astrophysics** — energy + angular momentum + linear momentum conservation in isolated N-body; ∇·B = 0 in MHD; positivity of density.
- **Cardiac** — voltage in physiological range; refractory period respected; APD restitution curve shape.
- **Chemistry MD** — total energy drift below threshold over canonical run; temperature within ±5 % of target in NVT ensemble; PBC consistency.

Per-family invariants are catalogued in Appendix H.

### 42.3 Cross-tier matched-pair statistics

The spec § 4.5 matched-pair gate is binary (pass/fail). At scale, it's useful to track *statistics*: across CI runs, how often does the Tier 0 ↔ Tier 1 match agree to 1 %, 5 %, 10 %? Drift below typical can be a regression signal even without a hard fail. Each sim's matched-pair stats become a single dashboard row.

### 42.4 Hardware-precision sweeps

For every Tier 1+ sim with a numerical core: run the canonical scenario at fp16 (where supported), fp32, and fp64. Assert that fp64 matches analytic anchors; fp32 matches fp64 within an explicit tolerance budget; fp16 matches fp32 within larger but bounded tolerance. The current `equivalence/tolerance-budget.toml` could grow a `precision` axis alongside the existing stack axis.

### 42.5 Visual signature regression (Tier 0 specifically)

For every Tier 0 web sim, a hero frame is rendered at canonical parameters and committed. Subsequent runs render the same frame and compute SSIM / LPIPS against the golden image. Threshold breach is a regression even if the underlying numerics still pass MMS. This catches rendering pipeline regressions, shader compilation differences across drivers, and silent visual bugs.

### 42.6 Long-running stability

For every sim whose canonical use case includes long runs (orbital mechanics, cardiac for hours-of-physiology, atmospheric for days-of-weather), a once-weekly long-run test asserts: no NaN/Inf, no resource leak, declared conservation laws hold to within drift tolerance over the full run.

### 42.7 Debug instrumentation contract

Every sim emits structured log events at well-defined points (initialization, per-step, error, completion). The schema is canonical across sims so an AI agent can parse any sim's logs without sim-specific knowledge. See § 46 for the agent-debugging perspective.

## 43. Per-composition testing — verification by parts in practice

Compositions are harder to test than sims because compositions usually don't have clean analytic anchors. The spec's "verification by parts" framing (§ 5.6) is the right starting principle; in practice it decomposes into:

### 43.1 Each sub-sim individually passes its full sim acceptance

Non-negotiable. The composition can only be tested if every constituent already passes its own 13 gates. This is what makes the composition layer wait until at least one sub-sim is mature.

### 43.2 Coupling-stability tests

For every coupling pattern declared in the composition's spec (Part III entry), a dedicated test:

- **Field-on-field coupling** — assert the source field is bit-exactly read by the consumer at every coupling step; assert no field stamping (writer overwriting reader's input).
- **Boundary coupling** — assert boundary state continuity to declared tolerance across the coupling step; check normal-momentum and tangential-velocity transfer in FSI.
- **Co-located coupling** — assert state consistency at every co-located point; track ringing (oscillation between two coupled fields at the time-stepping frequency).

### 43.3 Conservation across the coupling

Energy, mass, momentum, charge — whichever the composition claims — tracked across the coupling boundary. Any drift beyond tolerance over the full composition run is a fail. This is the single most common composition bug (numerics leak energy at the interface, even when both sub-sims are individually energy-conservative).

### 43.4 Reference scenario reproduction

Every composition's spec § 6 must declare at least one *published* reference scenario it reproduces. This is calculation validation per Roy 2005. Examples:
- Buoyancy-driven flow → Rayleigh-Bénard critical Ra at canonical aspect ratio.
- Tsunami impact → 2011 Tohoku Sendai inundation Maps (with declared simplification).
- Cardiac digital twin → Camps et al. *Med Image Anal* 2024 published patient case.
- Wind farm → Wakebench benchmark.
- AM build → ExaCA-published melt-pool morphology.

The reference scenario is run in CI on the same schedule as the per-PR full gate; the per-sim outputs are compared to committed reference results.

### 43.5 Cross-code agreement (where possible)

For compositions where two independent codes implement the same coupling, run both and compare. This is rare in practice (e.g., openCARP coupling with CHeart vs. CardioMechanics for cardiac mech-EP) but when available it's a strong signal.

### 43.6 Sub-cycling-ratio sensitivity

For compositions with sub-cycling, sweep the sub-cycling ratio across the declared admissible range; assert the result is invariant within declared tolerance. Sub-cycling-ratio sensitivity is the most common cause of "passes at default parameters, fails at slightly different settings" composition bugs.

### 43.7 Composition-specific PBT

Each composition admits PBT distinct from its constituent sims. Examples:
- For coupled fluid+thermal: random thermal BCs, assert energy conservation across coupling.
- For FSI: random rigid-body initial conditions, assert no penetration over N coupling steps.
- For cardiac digital twin: random patient-anatomy variants, assert physiological-range outputs.

### 43.8 Verification-debt audit

Each composition declares which sub-sim properties it depends on for its own verification. If a sub-sim's verification posture later weakens (e.g., a tolerance widened, a property test removed), the composition's verification claim is impacted. The integrity toolkit's Cat 5 (provenance traceability) is extended to track these composition-to-sub-sim verification dependencies; any sub-sim regression triggers a flag on every dependent composition.

## 44. Cross-cutting tests — matched-pair, cross-stack, cross-tier

Three orthogonal gates form the cross-cutting test surface. They interact in ways that matter at scale.

### 44.1 Cross-stack equivalence (existing — spec § 3.6)

Two implementations of the same algorithm on different stacks must agree to per-sim tolerance. The tolerance is a budget rather than a hard number — it can be split across sub-tests, and it carries forward across phases (never widening).

**Scale concern.** With 7 stacks (A-G) and 170 sims, the worst-case pair count is large. The realistic policy is that any given sim ships on 1-4 stacks, not all 7. Sub-charters declare which stack-pairs they commit to.

### 44.2 Cross-tier matched-pair (existing — spec § 4.5)

Tier 0 ↔ Tier 1, Tier 1 ↔ Tier 2 where the algorithm aligns. This is the single most strategically valuable test in the portfolio because it's what enables the "Tier 0 web demo is the same algorithm as the Tier 2 production code" claim that distinguishes the portfolio.

**Scale concern.** Not every Tier 0 ↔ Tier 1 pair is algorithm-aligned. Tier 0 LBM is the same algorithm as Tier 1; Tier 0 simplified-MHD is not the same algorithm as Tier 2 vendored AthenaK. The spec already accounts for this (§ 4.5 "where algorithms align"); the catalog formalizes it per-sim in Appendix H.

### 44.3 Cross-precision (proposed — see § 42.4)

fp16 / fp32 / fp64 matched-pair within precision-dependent tolerance. Especially important for sims targeting consumer hardware where fp16 acceleration is available but precision is constrained.

### 44.4 Hardware-portability matched-pair (proposed)

Same sim on NVIDIA (RTX 4070, RTX 6000 Ada, A100, H100, B100) ↔ AMD (RX 7900 XTX, MI300X) ↔ Apple Silicon (M-series) for Stack F/G ports where applicable. Determinism declaration applies. Particularly relevant given the Kokkos performance-portability industry shift (§ 3.1 shift 1).

### 44.5 Cross-time-bisection (proposed)

When a regression is detected at T3 or T4, the automated bisection tooling runs the regression test at every commit between the last known good state and HEAD. Spec § 1.3 + integrity Cat 5 already capture the commit-chain provenance needed; the bisection harness reuses it. Reduces "find the regression-introducing commit" from human effort to CI minutes.

## 45. CI strategy at scale

How does the CI architecture handle 170+ sims without becoming a wall-clock disaster?

### 45.1 Selective execution via dependency graph

Every PR runs only the tests downstream of its changed files. The dependency graph lives at `tools/testkit/dependency-graph.json` and is built from:
- Spec sheet declarations (a sim declares which common-* modules it consumes; a composition declares its sub-sims).
- Public-API imports (Cat 2 already tracks these).
- Coupling declarations in composition specs.

A PR touching `common-mesh` runs the full test suite for every sim that imports `common-mesh`. A PR touching only a single sim runs only that sim's tests plus any composition's tests that include that sim. A PR touching docs only runs T1.

### 45.2 Smart sharding

T3 nightly is sharded across multiple GPU runners by sim category. Equivalent test groups run in parallel; results aggregated. Target shard time: ~30 minutes wall-clock.

### 45.3 Capability-tagged runners

Some tests require specific hardware (multi-GPU, NVIDIA H100, AMD MI300X for HIP cross-vendor). CI runners are capability-tagged; the test runner skips tests where capability isn't available with a clear "skipped: requires capability X" message rather than failing silently.

### 45.4 Progressive test confidence

Test results have a confidence level (passed, passed-on-this-hardware, passed-with-tolerance-widened, deferred-not-applicable). A sim with "passed-on-this-hardware" on only one card is less verified than one with "passed-on-this-hardware" on five cards across vendors. Each sim's confidence level is a dashboard signal.

### 45.5 Audit-replay determinism for CI itself

CI runs themselves are audit-replayable: the runner records its complete environment (OS, driver versions, CUDA version, hardware ID, all dependency SHAs), the test commands invoked, and verbatim outputs. A "I can't reproduce this CI failure locally" debugging session begins by replaying the CI run with bit-identical environment.

### 45.6 Test-skip discipline

Skipped tests are first-class data. Every skipped test has a documented reason (one of: not-applicable-to-stack, requires-hardware, deferred-to-phase-N, known-issue-#xyz). A nightly skipped-test audit asserts no skip without a reason; phase-landing audits surface skip counts and their reasons. Untracked skips are a kind of verification debt the integrity toolkit should catch.

## 46. AI-agent-driven testing and debugging

The user explicitly cares about seamless debugging through an AI agent. The patterns below are what makes that work at scale.

### 46.1 Structured failure context

Every test failure produces a structured artifact at `tools/testkit/failure-context/<run-id>/<test-id>.json`:

```json
{
  "test_id": "fluids/sph/mms-poiseuille",
  "sim": "fluids/sph",
  "stack": "stack-c",
  "tier": "tier-1-desktop",
  "phase": "phase-6.4",
  "commit_sha": "<40-char>",
  "hardware": { "vendor": "NVIDIA", "card": "H100-SXM", "driver": "X.Y.Z", "cuda": "12.X" },
  "expected": { ... canonical golden / analytic ... },
  "actual": { ... actual output ... },
  "delta": { ... structured diff ... },
  "stdout_tail": [... last 500 lines ...],
  "captures": [ "path/to/capture.h5", ... ],
  "replay_command": "tools/testkit/replay.py --run-id ...",
  "related_specs": [ "docs/sim-specs/fluids/sph/spec.md", ... ],
  "upstream_refs": [ "references/SPlisHSPlasH/...", ... ]
}
```

This is the format an AI agent ingests directly. No screen-scraping of pytest output, no parsing of CI-runner logs, no archaeology — the agent has every fact it needs in a parseable schema.

### 46.2 Replay command as universal handle

Every failure context includes a single replay command. The agent runs it, gets the same output (deterministically), and can iterate on hypotheses. The replay must work locally on the agent's environment if possible; if it requires capability the agent doesn't have, the failure context flags `requires_capability: <X>` and the agent's first move is to surface that to the operator rather than fake a fix.

### 46.3 Hypothesis-driven debugging contracts

When asked to fix a failing test, an AI agent follows a documented contract (`tools/testkit/agent-debugging.md`):

1. **Reproduce.** Run the replay command. Confirm the same failure observed.
2. **Hypothesize.** Generate 2-5 candidate causes, each tied to a specific file:line and a specific testable prediction.
3. **Test cheapest first.** For each hypothesis, propose the smallest local test that would confirm/refute it.
4. **Bisect if needed.** If hypothesis testing is inconclusive, request a cross-time bisection (§ 44.5).
5. **Propose fix with verification.** A fix proposal includes: the changed lines, the new test that would have caught this, the rationale.
6. **Run the new test failing first.** TDD discipline — agent commits the new test failing, hashes it, then commits the fix.
7. **Verify scope.** Cat 5 traceability — what else does this fix touch? Are downstream composition tests affected?

The contract is enforced by Cat 4 grammar (agent's commit messages must include hypothesis + test-first hashes).

### 46.4 Agent-readable spec sheets

Every sim spec sheet has a structured front-matter block that an agent can parse without natural-language understanding:

```yaml
sim:
  name: <sim-name>
  category: <category>
  stack: <stack>
  tier: <tier>
verification:
  posture: <mms | golden | mms+golden | infrastructure-surrogate>
  mms_solutions: [ <list of MMS entries> ]
  golden_tables: [ <list of golden tables> ]
  pbt_invariants: [ <list of invariants> ]
  calculation_validation_references: [ <list> ]
  cross_stack_pairs: [ <list of pairs> ]
  cross_tier_matched_pairs: [ <list> ]
  determinism: <bit-exact | epsilon | non-det-by-design>
common_modules: [ <list> ]
work_units: [ <list of WUs consumed> ]
productization: { web: ..., binary: ..., pypi: ..., render: ..., preprint: ... }
```

This is the structured-data substrate the agent reads to plan any work on the sim.

### 46.5 Failure clustering across the portfolio

When a sweep produces multiple failures, the testkit clusters them by signature (similar stack-trace, similar field-on-field divergence pattern, similar timestep). Cluster reports are the agent's first read — five identical failures across different sims usually point to a single regression in a common-* module rather than five sim bugs.

### 46.6 Triage-priority signal

Every failure has a triage priority: blocker (T1 fail on main), critical (T2 fail on main), major (T3 fail on main), minor (T4 fail on main; old skip with no documented reason), maintenance (citation rot, doc drift). Agent picks priority order when given multiple failures.

### 46.7 The agent never widens a tolerance

Hard rule. The agent's debugging contract explicitly prohibits widening any tolerance row in `tools/testkit/equivalence/tolerance-budget.toml` to make a test pass. Tightening is allowed; widening surfaces a tolerance-budget-amendment proposal to the operator and the agent halts on that test.

## 47. Audit-replay as the universal scaling primitive

The audit-replay posture (every sim deterministically replayable; spec § 1.3 + § 3.5 gates 9-10) is the single property that makes scale tractable. The reasons:

- **Bisection becomes mechanical.** Re-run any commit's tests with bit-identical output guaranteed by determinism declaration.
- **Bug reports are reproducible.** A user reporting a regression provides the capture; you replay it bit-for-bit.
- **Cross-tier divergence is debuggable.** Tier 0 web sim drift from Tier 1 desktop is captured as two captures + diff; the diff is structured.
- **Composition coupling bugs are isolatable.** Capture at each sub-sim boundary; compare against the unmodified sub-sim runs; the difference is the coupling.
- **Agent triage is grounded.** Every failure context (§ 46.1) includes a replayable trace; the agent isn't reasoning from screen output.

The cost is that determinism is a heavy constraint. Some sims (NeuralVDB-style neural emulators, sampling-heavy MC simulations, certain GPU race-tolerant kernels) are intrinsically non-deterministic. For these the determinism declaration is "non-det-by-design with seed-stamped variance bounds" — the variance is captured, the bound is what's replayable. Even non-deterministic sims have a meaningful audit-replay posture; it's just not bit-exact.

## 48. Performance regression as a first-class testing surface

Per-sim performance is currently tracked in `docs/perf-ledger.md` (spec § 2.15). At scale, performance becomes a test surface in its own right:

### 48.1 Per-tier performance budgets

Every sim declares a per-tier performance budget:
- **Tier 0** — canonical scenario completes in ≤ X seconds at hardware floor (4 GB integrated GPU).
- **Tier 1** — canonical scenario completes in ≤ Y minutes on reference floor (RTX 4070 Ti 12 GB).
- **Tier 2** — canonical scenario completes in ≤ Z hours on reference card (A100 80 GB).

Budget breach is a regression. The budget can be widened only through an explicit amendment with rationale.

### 48.2 Multi-hardware ledger

The perf ledger row includes `hardware_id`. At scale, the same sim has rows for multiple cards. A row's regression is detected against the prior row for the *same hardware* — comparing cross-hardware would conflate hardware differences with regressions.

### 48.3 Memory regression

Wall-clock isn't the only regression surface. Peak memory per sim is tracked alongside wall-clock. A sim that gets slightly faster but uses 4× the memory has regressed.

### 48.4 Pipeline-stage breakdown

For Tier 1+ sims, the ledger captures stage-level timing (kernel A, kernel B, host-device transfer, I/O). A 10 % slowdown localized in one kernel is a different signal from a uniform 10 % slowdown.

### 48.5 Compute-vs-memory-bound declaration

Each sim declares whether it is compute-bound or memory-bound on its target hardware. Regressions are interpreted relative to this declaration: a memory-bound sim slowing down on a card with more memory bandwidth is more surprising than on a card with less.

## 49. Test-debt and verification-debt prevention

At scale, debt accumulates if not actively prevented. Several mechanisms:

### 49.1 Verification-debt ledger

Beyond the perf ledger, a verification-debt ledger at `docs/verification-debt.md` tracks:
- Sims with deferred gates (and why).
- Tests marked TODO / xfail (with phase-target for resolution).
- Tolerance widenings (and rationale).
- Skipped tests by reason (§ 45.6).

Verification-debt is reviewed at every phase landing. Phase landings should *reduce* the ledger; growth requires explicit acknowledgment.

### 49.2 Citation-staleness sweep

Weekly (T4): every cited URL / DOI is checked for liveness. Stale citations are flagged for replacement. arXiv versions are checked against the published-version DOI.

### 49.3 Vendored-upstream SHA drift

Vendored upstream codes have a recorded SHA. Quarterly: check upstream HEAD against vendored SHA; surface drift to the operator. Update is per-sim, intentional, and triggers a re-derivation of golden tables for affected sims.

### 49.4 Mutation-score drift

Mutation scores monitored continuously. Drift below threshold is a HARD_FAIL at phase landing per spec § 2.13.

### 49.5 Schema-corpus growth

Every sim's canonical capture lands in `tests/fixtures/legacy-captures/` per spec § 2.12. At scale, the corpus is hundreds of captures. Schema-version bumps must regression-test against the whole corpus, not a sample.

### 49.6 The "tests we wish we had" backlog

A `tools/testkit/wishlist.md` enumerates tests known to be missing. Examples:
- "Wish we had a cross-precision matched-pair for SPH but Stack D doesn't support fp16 yet."
- "Wish we had a long-running stability test for the MHD shearing box at production resolution but it takes 8 GPU-hours."

The wishlist is reviewed at every Phase 6+ sub-charter open. Sub-charters can voluntarily clear wishlist items as part of their scope.

## 50. Suggestions — additional testing surfaces worth considering

The existing testing posture is already strong. The following are additions I think would meaningfully harden the portfolio at scale. Each is optional; each names a concrete gap.

**50.1 Differential testing across independent codes.** Beyond cross-stack equivalence (same algorithm, different stack), introduce differential testing across independent algorithms: SPH vs. LBM for incompressible single-phase flow; Athena++ vs. PLUTO for MHD shock; openCARP vs. CHeart for cardiac monodomain. When the same physics is solved by two independent algorithms, agreement to within their respective verification tolerances is a strong signal. **Effort:** low — the harness exists, just need to declare cross-algorithm pairs alongside cross-stack pairs.

> **Cross-reference (sub-phase-phase-2-cleanup Stage 1.G / D6).** The Phase-2 **matched-pair cross-stack gates** (gate-14 shape-(a) bit-exact; `docs/conventions/sub-phase-conventions.md` § L.7 O-1 taxonomy + § L.11; `cross-stack-equivalence-methodology.md`) **apply differential-testing methodology to the cross-stack equivalence problem** (*same algorithm, different backend/stack*). They are **distinct from but methodologically related to** the cross-**algorithm** differential testing scoped in this § 50.1 (*independent algorithms, same physics*). The two are siblings under one methodology; this section keeps the bare term "differential testing" for the cross-algorithm variant. No renames (D6 = cross-reference only).

**50.2 Composition timestep-ratio sweeps as standard.** Per § 43.6, every composition's CI gate sweeps the sub-cycling ratio across the admissible range. Currently a per-composition decision; making it a standard gate would catch composition-coupling bugs at the source. **Effort:** medium — needs a tool, but a generic one suffices.

**50.3 Capture-format fuzzing.** Adversarial inputs to the schema reader. Malformed JSON, partial captures, mixed-version captures, captures larger than expected, captures with fields in odd orders. The capture reader is load-bearing for replay; weakness here invalidates every replay. **Effort:** low — `hypothesis` + structured fuzz strategies.

**50.4 Visual snapshot testing for Tier 0.** Per § 42.5. Hero frame committed; SSIM/LPIPS regression test. Particularly important for outputs that go to the public website. **Effort:** medium — needs golden frame management; image-similarity is well-supported by PIL/scikit-image.

**50.5 Compositional differential testing.** Per § 43.5. When a composition built from A v1 and B v1 is upgraded to A v2 with same B, run both compositions; assert consistent behavior. Catches coupling-tightness bugs where the composition was implicitly tuned to a specific sub-sim implementation. **Effort:** medium — testkit needs to support pinned-version composition runs.

**50.6 Hardware-portability matched-pairs.** Per § 44.4. Same sim on NVIDIA + AMD + Apple Silicon where applicable. Important given the Kokkos performance-portability shift documented in Part I § 3.1. **Effort:** high — requires multi-vendor CI; AMD MI300X availability still limited.

**50.7 Cross-precision matched-pairs.** Per § 42.4. fp16 / fp32 / fp64 within precision-aware tolerance. Especially valuable for consumer-hardware Tier 1 where fp16 acceleration matters. **Effort:** low — fp32/fp64 widely available; fp16 stack-specific.

**50.8 Long-running stability harness.** Per § 42.6. T4 weekly stability tests. Catches slow drift in conservation, resource leaks, NaN propagation. **Effort:** low — runs in T4 timeline.

**50.9 Citation-staleness monitor.** Per § 49.2. Weekly DOI / URL liveness check. **Effort:** low — a script; runs in T4.

**50.10 Hypothesis-driven AI-agent contract committed as `tools/testkit/agent-debugging.md`.** Per § 46.3. Makes the debugging discipline machine-readable and enforceable via Cat 4 grammar. **Effort:** low — write the document.

**50.11 Performance budgets as first-class declarations.** Per § 48.1. Every sim has a declared per-tier wall-clock budget. CI catches breach. **Effort:** low — adds a key to the sim spec sheet front-matter.

**50.12 Verification-debt ledger.** Per § 49.1. A single document tracking everything currently underverified, with phase-target for resolution. **Effort:** low — write the template; maintenance is per-PR.

**50.13 Memory-regression tracking in perf ledger.** Per § 48.3. Per-sim peak memory recorded alongside wall-clock. **Effort:** low — extend the perf ledger schema.

**50.14 Coupling-stability fuzzing for compositions.** PBT on composition coupling parameters (sub-cycling ratios, implicit-solver tolerances, operator-splitting orders). Catches stability boundaries before users hit them. **Effort:** medium.

**50.15 Numerical-stability adversarial sweep.** T4 weekly. Near-singular initial conditions; near-phase-transition parameters; hardware-precision-limit parameters. Catches "always passes default; fails at one customer's parameter set" bugs. **Effort:** medium.

**50.16 Snapshot-of-test-coverage at phase landings.** At phase landing, dump test count + coverage + mutation score + perf ledger size + verification-debt ledger size. Plot over time. A phase that significantly reduces any of these without a good reason is suspicious. **Effort:** low — single script at phase landing.

**50.17 Cross-time-bisection automation.** Per § 44.5. Automated bisection between last known good and HEAD on regression detection. **Effort:** medium — needs harness, but value is high.

**50.18 Composition verification-dependency tracking in Cat 5.** Per § 43.8. When a sub-sim's verification weakens, every dependent composition is flagged. **Effort:** medium — extends Cat 5 grammar.

Of these, the highest leverage for scale-readiness are: **50.1** (differential testing), **50.10** (agent-debugging contract), **50.12** (verification-debt ledger), **50.17** (automated bisection), and **50.18** (composition verification-dependency tracking). These are the foundation for keeping the test surface manageable as the portfolio expands to ~265 testable units.

---

# Part VI — Logistics and Coordination at Scale

Testing is one face of the scale problem. The other face is everyone — humans and agents — actually doing the work without colliding. At Phase 6+ cadence with multiple sub-charters in flight, multiple agents executing them, and a project owner setting direction, the coordination surface becomes its own design problem. This Part addresses that surface, grounding recommendations in industry practice from 2025-2026 and being explicit about what's stable, what's emerging, and what will look different in 12-18 months.

## 51. Why logistics deserves its own treatment

Three reasons logistics can't be handled implicitly:

**1. Multiple agents may run in parallel.** Anthropic's own Claude Code Agent Teams feature (GA with Opus 4.6 in late 2025; experimental under `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` flag earlier) explicitly supports an orchestrator + 2-4 subagents pattern, each in its own git worktree. Stripe reportedly merges 1000+ PRs/week from internal AI coding agents (per CIO, March 2026). GuruSup runs 800+ specialized agents in production with a triage-orchestrator pattern (~95% autonomous resolution). The pattern is no longer hypothetical — it's how meaningful AI-assisted work gets done in 2026. Bit-Physics at Phase 6+ scale will have multiple sub-charters in flight, and the practical question is whether they collide.

**2. Conflict-avoidance can't be assumed.** When Anthropic was internally building their own C compiler with Claude agents, they reported "frequent" merge conflicts even with a custom file-locking harness writing to `current_tasks/` (per Augment Code's analysis, April 2026). Coordination is not free, and naive parallelism produces conflicts. A scaling strategy that doesn't address this fails the same way Anthropic's first attempt did.

**3. The field is moving fast.** Gartner recorded a 1,445% surge in inquiries about multi-agent systems between Q1 2024 and Q2 2025 — and also forecast that **40% of agentic AI projects will be canceled by end of 2027**. The honest takeaway: whatever specific tooling Bit-Physics adopts now will likely be obsolete in 18 months. The right posture is to anchor on stable primitives (open standards, clean decomposition, audit-replay) and minimize lock-in.

## 52. Decomposition — how independent work units stay non-overlapping

The single most important pattern for non-overlapping parallel work is **domain decomposition with ownership boundaries**. This is Conway's law applied: the system's architecture mirrors the organization's communication structure. For Bit-Physics, the natural decomposition is already in place:

### 52.1 Sub-charter as the unit of agent work

Each Phase 6+ sub-charter authors a *single* deliverable: one new sim, one new common-module, one composition, one productization pipeline. The sub-charter's filesystem boundary (typically a directory like `sims/fluids/mpm/` or `compositions/buoyancy/` or `common/common-mlip/`) is the unit of write authority. Two agents working on different sub-charters write to disjoint directories.

This is the same decomposition Google uses for its monorepo (per the JetBrains 2023 survey, 34% of professional devs now work in monorepos, up from 12% in 2019; Bazel/Nx/Turborepo all enforce package-level affected-test detection, which is the mechanical face of ownership boundaries).

### 52.2 The orchestrator role

When multiple sub-charters run in parallel, an orchestrator pre-allocates which directories each sub-charter (or each agent) owns. This is the pattern GuruSup describes for its triage orchestrator and that Anthropic's Agent Teams implements via the lead agent + shared task list. The orchestrator's job is narrow: own the allocation, not the implementation. In Bit-Physics terms: the project owner (or a meta-coordinator agent) reads Part II/III to identify candidate work, picks N items, and pre-commits the work-unit-to-directory assignments before any sub-charter starts.

### 52.3 Shared dependencies as the danger zone

The conflict-rich part of the repo is the *shared* surface: `common/*` modules, `tools/testkit/*`, `docs/architecture.md`. Two sub-charters that both need to extend `common-warp` will collide. Three coordination patterns address this:

- **Sequential ownership.** Only one agent at a time may write to a shared module. Other sub-charters depending on that module are blocked until the writer lands.
- **Pre-declared additions only.** A sub-charter that needs to extend `common-warp` declares its additions up-front in its spec sheet; the orchestrator approves the additions; the agent implements them in a known-additive way; concurrent sub-charters can read the spec sheet to anticipate the new API.
- **Interface-first decoupling.** When two sub-charters need the same new common-* capability, a small interface-only sub-charter lands first (just types and signatures); the two downstream sub-charters then implement *consumers* in parallel against the locked interface.

The spec's existing rule-of-three promotion gate (Convention 7.10) supports this: a common-* module is only promoted when ≥ 3 prospective consumers exist, which naturally serializes the shared work.

### 52.4 Conway's law and the directory tree

The decomposition that works because it matches the natural physical/algorithmic structure of GPU simulation:

- Per-phenomenon directories (`sims/<family>/<sim>/`) — independent by construction; one agent per directory.
- Per-stack subdirectories (`sims/<family>/<sim>/stack-c/`, `stack-e/`) — independent across stacks; one agent per stack per sim.
- Per-composition directories (`compositions/<name>/`) — independent across compositions; but each composition consumes its sub-sims read-only (writes happen in the sub-sim directories under different ownership).
- Shared substrate (`common/*`, `tools/*`) — coordinated via the rules in § 52.3.

The directory tree *is* the coordination protocol. If it's well-designed, agents working in disjoint subtrees can't collide.

## 53. Industry coordination patterns for multi-agent software engineering

The 2025-2026 landscape has converged on five recurring patterns. Each maps to one or more frameworks. Each has trade-offs.

### 53.1 Orchestrator + subagent (delegation hierarchy)

A lead agent decomposes the task, spawns subagents for focused work, collects results. This is Anthropic's Claude Code Subagent pattern (the `Task` tool spawns subagents with isolated context) and is the basis for Claude Code Agent Teams. **Strengths:** clean context isolation; easy mental model; well-supported by Anthropic's own tooling. **Weaknesses:** the orchestrator becomes a bottleneck; deep hierarchies (orchestrator → orchestrator → subagent) get hard to reason about.

### 53.2 Shared task list with lock-and-claim

A canonical task list (in Claude Code Agent Teams: literally a shared `tasks/` directory with lock files) is consumed by multiple agents who atomically claim items, work on them, and mark them complete. **Strengths:** scales horizontally; no orchestrator bottleneck; natural fit for embarrassingly parallel work. **Weaknesses:** lock granularity is critical (too coarse → serialization; too fine → races); merge conflicts when claimed items have unexpected shared dependencies (per Anthropic's own C-compiler retro).

### 53.3 Spec-driven coordination (living spec layer)

Augment Code's Intent and the broader "spec-driven development" movement push the coordination surface *up* to a structured spec layer (an AGENTS.md or CLAUDE.md or "intent file") that all agents read. The spec is the single source of truth; agents propose changes to it; the spec layer arbitrates. **Strengths:** scales to multi-file / cross-service work; explicit contract; durable across agent generations. **Weaknesses:** upfront overhead; not worth it for one-shot tasks. Bit-Physics's existing sub-charter discipline is already this pattern — the sub-charter document IS the living spec.

### 53.4 Message-queue / event-sourced coordination

Agents communicate via an explicit message bus (the A2A protocol — Agent-to-Agent — donated to the Linux Foundation in June 2025 — formalizes this for cross-vendor interop). **Strengths:** durable, auditable, vendor-neutral; agents can be different models from different vendors; failure isolation. **Weaknesses:** infrastructure cost; the message schema itself becomes a coordination problem; usually overkill for single-team work.

### 53.5 Graph-based orchestration

LangGraph (the leading framework by search volume as of early 2026, per Langfuse's framework comparison) treats the workflow as an explicit DAG with checkpointed state. Each node is a step; edges are conditional transitions; state is durable. **Strengths:** complex workflows can be reasoned about visually; replayable from any checkpoint; deterministic where state is. **Weaknesses:** the graph itself becomes a thing to maintain; easy to over-engineer for simple workflows.

### 53.6 Framework landscape as of 2026 (calibration)

| Framework | Origin / launch | Coordination model | Best fit |
|---|---|---|---|
| **LangGraph** | LangChain Inc, mature through 2024-2025 | Graph + checkpointed state | Complex multi-step workflows; agent state durability |
| **CrewAI** | 2024 | Role-based agents + sequential / parallel tasks | Small focused crews; clear role boundaries |
| **OpenAI Agents SDK** | March 2025 (replaced Swarm) | Handoff-based; lightweight | OpenAI-native stacks |
| **Google ADK** (Agent Development Kit) | April 2025 | Hybrid graph + tool use | Google Cloud ecosystem |
| **Anthropic Agent SDK** | with Claude 4.6, late 2025 | Subagent + Agent Teams | Claude-native stacks; matches Claude Code patterns |
| **Microsoft Copilot Studio multi-agent** | Build 2025 (May) | Hub-and-spoke under Copilot orchestrator | Microsoft 365 / enterprise |
| **IBM watsonx Orchestrate** | GA June 30, 2025 | Centralized orchestrator + specialized agents | Enterprise IBM environments |

Across these, the three dimensions that actually differ (per Augment Code's December 2025 platform comparison) are:
- **Orchestration model** — graph vs. role vs. swarm.
- **State management** — checkpointed vs. ephemeral vs. event-sourced.
- **Communication pattern** — handoffs vs. shared memory vs. message queues.

Everything else is convergent. The runtime layer (tool registries, state, retry logic) is commoditizing in the 12-18 month horizon (per Augment Code, December 2025).

## 54. Open standards and avoiding lock-in

Two open standards under Linux Foundation governance form the stable substrate worth anchoring on:

- **MCP (Model Context Protocol)** — donated to the Linux Foundation in **December 2025**. Cross-vendor tool / context exposure; supported natively by Claude, OpenAI, and (per the Anthropic Scale write-up) Apple. The protocol is how an agent connects to filesystems, repos, issue trackers, internal docs, etc.
- **A2A (Agent-to-Agent)** — launched by Linux Foundation in **June 2025**. Cross-vendor agent-to-agent communication; lets a Claude agent hand off to a GPT agent without bespoke glue.

Investing in these as the primary interfaces (rather than vendor-specific SDKs) is the practical hedge against the 18-month commoditization horizon. A Bit-Physics adoption pattern:

- Sub-charters use MCP to expose the repo to whichever agent (Claude Code, Cursor, future tools) is running.
- Cross-agent handoffs (if they exist) use A2A rather than agent-specific message formats.
- Agent-specific configuration (CLAUDE.md, .cursor/, etc.) is treated as an interchangeable surface, not a permanent contract.

The question Augment Code recommends asking before any platform commitment is *"if we need to migrate in 18 months, which components — agent state, memory stores, workflow definitions, evaluation data — are portable, and in what format?"* The answer should be: most of them, because they're stored in open formats.

## 55. Concrete patterns mapped to Bit-Physics

The existing Bit-Physics infrastructure already implements most of what's needed. Specifically:

### 55.1 Sub-charter document = living spec
Every Phase 6+ sub-charter is a structured document with sections for scope, deliverables, dependencies, acceptance gates. This is the spec-driven coordination pattern (§ 53.3) in mature form. The sub-charter is the contract; the agent's job is to execute it; deviations land in the document, not in side channels.

### 55.2 Pre-implementation probe = read-the-disk before claiming
The pre-implementation probe (spec § 2.10) makes the agent enumerate every fact it will rely on before writing implementation. This is the same discipline lock-and-claim systems need: don't claim a task you haven't verified you can complete.

### 55.3 Integrity Cat 5 (provenance traceability) = audit substrate
Cat 5 already tracks which sub-charter produced which file, which spec doc was the source, which probe report was the input. Extended to multi-agent runs, this becomes the audit log for "agent X claimed task Y at time T1, modified files Z, landed at T2." Anthropic's Claude Code hooks (PreToolUse, PostToolUse, TaskCreated, TaskCompleted, SubagentStop) emit events that map cleanly onto Cat 5's grammar.

### 55.4 Branch-per-sub-charter = git worktree isolation
The existing convention (one branch per sub-charter, e.g. `phase-3/task-1-common-3dgs`) is exactly git-worktree isolation when the agent uses Claude Code's `--worktree` flag (recommended for Agent Teams per Anthropic's own docs — though opt-in, not default; merge conflicts in the C-compiler retro were attributed to *not* defaulting to worktree).

**Recommendation:** make `--worktree` the standard for Phase 6+ sub-charter agents. It's no extra cost when sub-charters are already on separate branches, and it eliminates the most common conflict mode.

### 55.5 Failing-tests-evidence with sha256 = tamper-evident claim
The existing TDD discipline (failing tests committed first, verbatim output captured, sha256 in commit footer) prevents agents from fabricating test passes. This is the strongest property in the existing infrastructure for multi-agent settings — when two agents both claim "tests pass," the sha256 chain distinguishes real work from manufactured claim.

### 55.6 Rule-of-three common-module promotion = back-pressure on shared writes
By requiring ≥ 3 consumers before a common-* module is promoted, the existing convention naturally throttles concurrent writes to shared infrastructure (§ 52.3). This is doing real coordination work and should be preserved.

### 55.7 Phase landing as serialization point
Phase landings (operator-only tag pushing, per the existing spec) are the synchronization barrier across all parallel sub-charters in a phase. Each landing is a "commit point" where everything that ran in parallel is reconciled. Industry analogue: release-train cadence in big monorepos, or the "merge train" pattern in GitLab CI.

## 56. Conflict resolution at sub-charter boundaries

When two sub-charters do collide despite the decomposition (because work expands in unexpected directions, or because a shared dependency surfaces late), the resolution process matters. Industry patterns:

### 56.1 The merge-train pattern
GitLab's merge-train queues PRs that would touch the same files; each PR rebases on the previous one's landed state; CI runs on the rebased state. For Bit-Physics: a Phase 6 integration branch with sequential rebases for any two sub-charters touching `common-*`.

### 56.2 The "lock the spec, not the code" pattern
When two sub-charters need the same new capability, the first action is locking the spec — agree on the interface and commit the spec doc. After that, both implementations proceed in parallel against the locked spec. If either implementation finds the spec is wrong, it's a *spec change* (which goes through the operator), not a code-level disagreement.

### 56.3 The escalation grammar
Cat 4 (draft-time spec verification) can enforce an "agent-cannot-modify-this-file" annotation on files outside the sub-charter's declared scope. Attempts to modify out-of-scope files surface BLOCKED to the operator rather than landing silently.

### 56.4 Honest acknowledgment of the limit
Even with all of this, two genuinely overlapping sub-charters will produce conflict. The right response is operator-level scope re-negotiation, not agent-level "smart" merging. Anthropic's own C-compiler retro found frequent merge conflicts even with locking; the resolution there was operator-side scope adjustment, not agent-side smart conflict resolution. This will be true for Bit-Physics too.

## 57. Documentation hygiene at scale

When there are 50+ sub-charter documents, 18 families × per-phenomenon entries, ~95 composition entries, and the spec, the docs themselves become a coordination surface. Two patterns:

### 57.1 Agent-readable vs. human-readable split
Spec sheets, sub-charter documents, and per-sim front-matter should have structured (YAML / JSON front-matter) blocks an agent can parse without natural-language understanding. Prose context for humans wraps the structured data. This is already partially in place (per § 46.4 of Part V); making it consistent across all sub-charters is the scale-readiness move.

### 57.2 Canonical entrypoint files
- `AGENTS.md` / `CLAUDE.md` at repo root — the entry point any agent reads first; points to the architecture, the current phase plan, the conventions.
- `docs/phases/<phase>-plan.md` — the current phase's plan.
- `docs/sub-charters/<sub-charter>.md` — the active sub-charter's contract.
- `docs/perf-ledger.md`, `docs/verification-debt.md` — the running ledgers.

Each file has exactly one purpose. No file mixes spec, status, and prose narrative. This convention is already 80% of the way there in the existing structure.

### 57.3 Document staleness as a CI gate
A weekly (T4) check: every doc cross-reference resolves; every cited code-line still exists at the cited path; every cited paper is still live. Doc staleness in a multi-agent setting is a coordination bug (an agent reading a stale doc plans against a stale reality).

## 58. Security and write boundaries

When agents have file-write authority, security isn't optional. Patterns:

### 58.1 Per-agent write scope declaration
Each agent's spawn includes a declared write scope (typically: its sub-charter directory + its branch + nothing else). Anthropic's Claude Code supports this via permission scoping; the PreToolUse hook can enforce it. Out-of-scope writes are HARD_FAIL, not silent.

### 58.2 Read scope vs. write scope
Agents typically need to *read* far more than they *write*. The default should be: read access to the whole repo (necessary for context); write access narrowly scoped. The integrity Cat 5 provenance check already enforces this asymmetry; multi-agent settings should preserve it.

### 58.3 No agent has tag-push authority
The existing spec rule (Phase landings are operator-only for tag pushing) is critical and should be preserved as a hard rule. No agent — orchestrator or subagent — pushes a release tag. This is the single most important "agent doesn't make irreversible decisions" check.

### 58.4 Secrets handling
Per Anthropic's own Claude Code documentation: secrets in `.env` files and similar should not be exposed to subagents. The `CLAUDE.md` convention is to explicitly mark secret-files as off-limits. Bit-Physics likely has minimal secrets (this is mostly an open research project) but the principle is worth codifying in CLAUDE.md.

## 59. Audit-replay extension to multi-agent runs

The audit-replay posture from Part V § 47 (every sim deterministically replayable) extends naturally to multi-agent runs:

- Every agent action emits a structured log event (via Claude Code hooks: PreToolUse, PostToolUse, TaskCreated, TaskCompleted).
- The log events are time-ordered, agent-tagged, and capture-tagged (so the per-action diff can be reproduced).
- A failed multi-agent run can be replayed by re-feeding the original prompts + original task list + original repo state to fresh agents; behavior should be reproducible up to model non-determinism.
- The Cat 5 provenance graph extends across agents — "file X was modified by agent A in task T1 of sub-charter SC1" is queryable.

This is the operator's tool for retros. When a multi-agent phase landing produces unexpected behavior, the audit-replay trace IS the post-mortem.

## 60. Honest forward look — what changes in 12-18 months

A few predictions, grounded in current signals, with confidence calibrated:

**High confidence:**
- MCP and A2A become the lingua franca for cross-vendor agent work. Vendor-specific SDKs become wrappers around the open standards. (Already happening; Apple's MCP adoption, OpenAI's MCP support, the Linux Foundation governance.)
- The runtime layer (tool registries, state management, retry logic) commoditizes. Custom implementations get replaced by platform offerings. (Augment Code's explicit forecast, December 2025.)
- File-system isolation (git worktrees) becomes the default rather than opt-in. The C-compiler retro made this obvious; expect Anthropic and others to flip the default.

**Medium confidence:**
- Three or four orchestration frameworks consolidate from the current six+. LangGraph, CrewAI, and the vendor SDKs are likely survivors; smaller projects either niche or fold.
- Spec-driven development becomes more formalized. AGENTS.md or similar conventions become standard. Bit-Physics's existing sub-charter discipline puts it ahead here.
- "Agent capability declarations" become formal — every agent declares what it can do, what files it can touch, what tools it can call. Currently ad-hoc; will likely standardize.

**Lower confidence:**
- Gartner's 40% project-cancellation projection for end-of-2027 plays out as predicted. The signal is real (over-investment, vendor proliferation, mismatch with domain logic), but the exact rate is uncertain.
- Models themselves become better at multi-agent coordination natively, reducing the need for explicit orchestration scaffolding. Possible; the early Claude Code Agent Teams docs gesture toward this.

**The robust posture for Bit-Physics:** invest in the stable primitives (decomposition discipline, audit-replay, open standards, spec-driven sub-charters) and treat the orchestration framework as interchangeable infrastructure. The choice between LangGraph and Claude Code Agent Teams will be made and re-made; the underlying decomposition won't be.

### 60.1 Decision needed — D-9

**D-9 — Multi-agent coordination tooling and tier-count convention**
**Question.** What coordination tooling commitment makes sense for Phase 6+? And: should the tiered CI structure (§ 41) collapse to four tiers to match industry vocabulary, or stay at five to match Bit-Physics's phase-landing cadence?
**Options.**
(a) Claude Code Agent Teams + git worktrees + CLAUDE.md as the primary stack. 4-tier CI structure.
(b) Same coordination stack. 5-tier CI structure (current).
(c) MCP + A2A as primary interfaces; specific runtime is whatever fits the sub-charter. 5-tier CI.
(d) Defer — single-agent execution through Phase 6.5; revisit at Phase 6.6 when scale warrants.
**Default position.** (d) Defer. Phase 6.0-6.2 don't need multi-agent execution; single sequential sub-charter execution is sufficient. Multi-agent becomes relevant when 2+ sub-charters can genuinely run in parallel without shared-substrate conflict, which is mid-Phase 6.
**Decision needed.** Before the first sub-charter that would benefit from multi-agent execution.

---

# Part VII — Front-End Surfaces

The catalog has been thorough on the simulator side (Parts I-III), the build process (Part IV), how to verify it (Part V), and how to coordinate the work (Part VI). What it has not done is enumerate what a user — researcher, student, recruiter, gallery visitor, paper reader — actually *sees* when Bit-Physics meets them. This Part fills that gap.

The Phase 5 productization plan commits to five distribution streams (web-deploy, binary-release, pypi-release, render-passes, preprint-extraction). Those streams ship pipelines and contracts. What this Part adds is the *user-facing anatomy* of each surface: structure, controls, content, and what each one is for. Some of this is implied by the existing infrastructure; some is unspecified and surfaced here as open questions for Phase 6+.

## 61. Surface map — five distributions × four product modes

The five productization streams (from spec § 10.1-10.5) deliver to four product modes (from § 33). Not every stream serves every mode:

| Surface | Stream (spec § 10) | Stack | Primary product modes |
|---|---|---|---|
| **Website (browser)** | 10.1 web demos | B | Gallery / SciVis, teaching, recruiter / collaborator demos, embed-in-essay |
| **Desktop binary** | 10.2 standalone binaries | C | Steam game, portfolio review on user's own hardware, demo at a talk |
| **Python package** | 10.3 PyPI packages | D, E | Research collaboration, reusable library, Jupyter / notebook use |
| **Render output** | 10.4 offline renders | (any) | Gallery, hero shots, paper figures, social media, embed-in-essay |
| **Preprint** | 10.5 preprint extraction | (any) | Research collaboration, citation, peer review |

The first three are *interactive* — the user runs the sim. The last two are *artifacts* — the sim produced something the user consumes. Both kinds matter; they serve different audiences and product modes.

## 62. Surface 1 — Website

The web is the highest-reach surface (anyone with a browser; no install). It is also the most under-specified in the existing infrastructure: Phase 5's `web-deploy` pipeline ships the per-sim build process, but there is no portal / landing / gallery infrastructure yet. The website is therefore (a) per-sim demo pages, which the spec already covers, plus (b) a portal layer, which is currently unspecified and a clear Phase 6+ deliverable.

### 62.1 Per-sim demo page

Each Stack B sim deploys to a sub-path of the canonical domain (default `stevenfau.github.io/Bit-Physics/`, per Phase 5 § 4.1-4.2). Per spec § 10.1, each demo page satisfies:

- Loads in < 2 s on modern desktop browser.
- Works on Chrome, Edge, Brave; Safari 26+; Firefox 141+ (Windows) / 145+ (macOS) — per current WebGPU rollout.
- A **settings panel** with three required controls: tier, seed, capture-to-disk.
- A **"View source" link** to the sim's directory on GitHub.
- A **"Spec sheet" link** to `docs/sim-specs/<category>/<sim>/README.md`.
- A capture-export round-trip: the captured file from this page loads into the testkit's local determinism harness.

The canonical layout (this is convention, not yet spec-locked):

```
┌─────────────────────────────────────────────────────────────┐
│  Bit-Physics — Reaction-Diffusion 2D    [github] [spec]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                   ╔═══════════════════════╗                  │
│                   ║                       ║                  │
│                   ║                       ║                  │
│                   ║    WebGPU canvas      ║                  │
│                   ║   (the simulation)    ║                  │
│                   ║                       ║                  │
│                   ║                       ║                  │
│                   ╚═══════════════════════╝                  │
│                                                              │
├──────────────────────────────┬──────────────────────────────┤
│  Settings                    │  Diagnostics                  │
│  ───────────                 │  ────────────                 │
│  Tier:    [Tier 0 ▼]         │  FPS:        60               │
│  Seed:    [42       ]        │  Step:       2143             │
│  Capture: [ ] to disk        │  Mass:       conserved 1.0e-7 │
│                              │  Energy:     -1.235e-3        │
│  Parameters                  │                               │
│  ──────────                  │  Verification                 │
│  F:       [0.040    ]        │  ─────────────                │
│  k:       [0.060    ]        │  MMS:        ✓ 2.0-order      │
│  Δt:      [1.0      ]        │  Matched:    ✓ vs Stack C     │
│                              │  Determinism: bit-exact-hw    │
├──────────────────────────────┴──────────────────────────────┤
│  About this simulation                                       │
│  Gray-Scott reaction-diffusion in 2D. Demonstrates pattern   │
│  formation; see spec sheet for parameters and references.    │
│  Frontier comparisons: Lenia, NCA, learned RD.               │
└─────────────────────────────────────────────────────────────┘
```

Three regions to notice:

1. **Canvas** — the actual sim, full-quality WebGPU rendering. For interactive sims this is where pointer / scroll input lands.
2. **Settings + parameters** — the controls the user can change. Settings are universal (tier, seed, capture); parameters are per-sim.
3. **Diagnostics + verification** — the metadata that distinguishes a *teaching demo* from a *toy*. FPS, step count, conservation laws holding, MMS verification status, matched-pair status. This is the surface that demonstrates Bit-Physics's verification posture is real, not aspirational.

The "About" footer is where the page tells the user what they're looking at and links out to depth (spec sheet, citations, frontier variants).

### 62.2 Portal / index — the gallery surface

Currently unspecified. The portal is the page a visitor lands on before they pick a sim. It serves several distinct audiences:

- **Researcher** browsing to see whether Bit-Physics covers their domain — wants family filters, citations, vendoring relationships.
- **Recruiter** evaluating a candidate's portfolio — wants polish, visual hero content, "what is this" framing.
- **Student / teacher** looking for a teaching example — wants by-topic discovery and accessible entry points.
- **Essayist** looking for embeddable interactive content — wants embed code and licensing clarity.

A portal design that satisfies all four (recommendation; not specified yet):

```
┌─────────────────────────────────────────────────────────────┐
│  Bit-Physics                                                 │
│  A library of GPU simulations across physics, biology,       │
│  engineering, and applied science. Open source.              │
│                                                              │
│  [▶ Featured sim auto-rotating: 8s per featured sim]         │
├─────────────────────────────────────────────────────────────┤
│  Browse                                                      │
│                                                              │
│  By family   Fluids · Solids · Fracture · Astrophysics ·    │
│              Plasma · EM · Waves · Heat · Chemistry · Life · │
│              Earth · Radiation · Social · Quantum ·          │
│              Robotics · Materials · Energy · Hypersonics    │
│                                                              │
│  By mode     Gallery · Teaching · Research · Compositions    │
│                                                              │
│  Recent      [card] [card] [card] [card]                     │
│                                                              │
│  Compositions    [card] [card] [card] [card]                 │
│                                                              │
│  Frontier        [card] [card] [card]                        │
├─────────────────────────────────────────────────────────────┤
│  Methodology    Verification    Citations    About          │
└─────────────────────────────────────────────────────────────┘
```

The cards are small auto-playing previews (WebM or low-res WebGPU running) with the sim name and family. Clicking a card opens the per-sim page (§ 62.1).

### 62.3 Per-composition page

Compositions (Part III) are inherently more complex than sims and warrant a different page shape. A composition isn't just a sim — it's a story about how multiple physics families combine. Recommended layout:

- **Header** — the composition name, the constituent sim families ("MHD + Reconnection + Radiation"), and a short "what this composes" paragraph.
- **Canvas** — the composition running. May be split-screen (showing both sub-sims) or unified (showing the coupled phenomenon).
- **Coupling diagram** — a small visual of how the sub-sims connect (which fields flow where, time-stepping ratios, etc.). This is the composition's signature.
- **Settings panel** — composition-level (tier, seed, capture) + per-sub-sim parameter dropdowns.
- **Verification posture** — verification-by-parts results (§ 43): each sub-sim's own MMS / golden status + the composition's coupling-stability test + the reference scenario it reproduces.
- **Links** — each constituent sim's page + the spec sheet + the published reference paper for the reference scenario (Camps et al. 2024 for cardiac digital twin, Wakebench for wind farm, etc.).

Compositions are also where the **science-storytelling** mode of the website matters most. A 6-sim flagship like Habitable Planet isn't just a demo — it's an essay. The page can host a guided tour: phase 1 of the rotation explains the atmosphere sim; phase 2 explains the ocean; etc.

### 62.4 Methodology / verification pages

Currently unspecified. A research-collaboration-oriented site needs a methodology section that explains the verification posture *as a thing distinct from any one sim*:

- What MMS is and why it's used.
- What matched-pair gates mean.
- What the integrity-toolkit Cat 1-5 levels enforce.
- What the perf ledger looks like over time.
- What "Tier 0 = same algorithm as Tier 2" means in practice.

This page is what tells a researcher or potential collaborator that Bit-Physics is *serious* infrastructure, not a gallery. It is the answer to "why should I trust this enough to cite it / build on it?"

### 62.5 Embed mode

Per Phase 5 § 6.1, the web-deploy pipeline already ships a `web/embed/` iframe template. The intended usage:

- An essayist on substack or a personal blog includes `<iframe src="https://bit-physics.../embed/reaction-diffusion-2d?seed=42&autoplay=true">`.
- The embedded sim runs interactively in the iframe with a minimal chrome (no full settings panel; just play/pause and seed).
- The embed includes a small attribution link back to the full sim page.

This is what makes Bit-Physics *embeddable in essays* — a non-trivial product mode that turns the library into a substrate for technical writing.

## 63. Surface 2 — Desktop binary

Stack C sims build to native binaries via the Phase 5 `binary-release` pipeline. Per spec § 10.2 and Phase 5 § 6.2:

| Platform | Format | Notes |
|---|---|---|
| Linux | AppImage or static binary | Single-file, double-click to run |
| Windows | Zipped binary + required DLLs | Extract, run `.exe` |
| macOS | Signed `.app` if certs available; unsigned otherwise | Unsigned requires `xattr -d com.apple.quarantine` (documented in `binary-release.md` go-live runbook) |

What the user does after downloading:

1. Double-click (Linux AppImage / macOS .app) or run the .exe (Windows). On unsigned macOS: one terminal command first.
2. The binary opens a native window: WebGPU-or-Vulkan-rendered canvas at full GPU performance, native settings panel (ImGui), and the same diagnostics surface as the web demo.
3. The user can capture-to-disk to a local HDF5 file, which they can then feed into the testkit (if they've also installed the Python package — see § 64).

The CLI surface is also a first-class user-facing interface. Per Phase 5 § 6.2, every Stack C binary accepts:

```
my-sim --deterministic --seed 42 --steps 1000 --capture out.h5 --no-display
```

This means the binary serves *two* audiences from one artifact:

- The **interactive user** running the GUI for visualization, teaching, or exploration.
- The **headless user** scripting the binary as part of a batch workflow (e.g., a researcher running parameter sweeps on a server, an integrator running it in their own CI).

Both audiences get the same numerics, the same verification posture, the same capture format. The binary doesn't compromise either.

### 63.1 Steam distribution as a possible future

Per § 33 of this catalog and the open decision **D-4** (§ 38), Steam game distribution is an emergent option, not a commitment. Compositions with game potential (Plant in Wind, Habitable Planet, Smart City, Drone Swarm) could ship as Steam games using the same binary substrate. The Steam-specific deliverables (Steamworks SDK integration, achievements, controller support, leaderboards) are post-Phase-5 work not covered by the current infrastructure.

## 64. Surface 3 — Python package

Stack D (Taichi) and Stack E (Warp + Newton) sims publish to PyPI via the Phase 5 `pypi-release` pipeline. The package surface is the most flexible of the three interactive surfaces because Python packages serve **three sub-modes** from the same install:

### 64.1 CLI mode

The simplest use case. Per spec § 10.3:

```
pip install bit-physics-mpm-multimaterial
bit-physics-mpm --tier desktop --seed 42 --steps 1000 --capture out.h5
```

The CLI mirrors the desktop binary's headless mode but is installable via standard package management. This is the entry point for users who don't want to manage a binary download or a browser session.

### 64.2 Library mode

Python packages are importable. A researcher writes:

```python
from bit_physics.mpm import MPMSim, default_config
sim = MPMSim(config=default_config(tier="workstation", seed=42))
sim.run(steps=10000)
sim.capture("out.h5")

# Or compose with other tools:
import bit_physics.diagnostics as diag
diag.energy_drift(sim.state, sim.history)
```

This is the *research collaboration* product mode in its purest form. The sim is a library; the researcher writes their own driver code; Bit-Physics provides the numerics + verification + capture format. This is what "PyPI package" mode does that "binary" can't.

### 64.3 Jupyter / notebook mode

The library mode generalizes to interactive Jupyter:

```python
%matplotlib inline
from bit_physics.cardiac import CardiacSim
sim = CardiacSim(geometry="ellipsoid", tier="research")
sim.step(1000)
sim.visualize_voltage()  # inline matplotlib or interactive widget
```

For teaching, for reproducible-paper-figure-generation, for exploratory analysis, the notebook surface is irreplaceable. Per Phase 5 § 6.3, the pyproject template for each Stack D/E sim should declare a `[project.scripts]` for CLI mode *and* expose a clean Python module surface for library/notebook use.

### 64.4 The capture is the cross-surface bridge

A user runs the desktop binary, gets `out.h5`. They `pip install bit-physics-testkit` and load `out.h5` in Python for analysis. They feed the same `out.h5` to the Blender render pipeline. They cite the run's `build_id` in a preprint.

The capture file (spec § 2.7) is the integration point across all three interactive surfaces. The user can mix and match — render in Blender what they ran in the browser, replay in Python what they ran on a workstation, validate in the testkit what they ran on a binary release. This is what makes the three interactive surfaces *one product family* rather than three separate things.

## 65. Surface 4 — Render outputs

The Phase 5 `render-passes` pipeline produces offline renders: images and short videos, suitable for hero shots, paper figures, social media, and gallery curation. Per spec § 10.4 and Phase 5 § 6.4:

- **Default:** Blender Cycles. Free, Python-scripted, deterministic given fixed sample count and same OS/Blender version.
- **Optional:** Houdini Karma ($269/year Indie license). Better cinematic quality for VFX-style fluid renders. Not in Phase 5 (per § 4.10 of phase 5 plan); a possible post-Phase-5 expansion.
- **Output:** PNG / EXR for stills; MP4 / WebM for short videos.
- **Storage:** `docs/renders/<sim>/`, committed to the repo; linked from sim README.

What the user sees:

- **On the website:** rendered hero shots become the auto-rotating featured-sim previews on the portal, the thumbnail cards in the gallery, the embedded figures in spec sheets and methodology pages.
- **On social media:** a short video clip with a caption like "Reaction-Diffusion 2D, Gray-Scott parameters F=0.04 k=0.06, MMS-verified 2nd-order, reproducible at github.com/StevenFAU/Bit-Physics."
- **In academic preprints:** hero figures generated by the same pipeline that produces the social-media clips; consistent visual identity.

The render is *not* the interactive sim. It's a curated representation of one canonical run, post-processed for visual quality. The interactive surfaces are always one click away.

### 65.1 Render-to-paper-figure pipeline

A future enhancement worth noting (currently unspecified): the same `render-passes` pipeline could emit not just hero shots but **paper-figure assets** — convergence plots from MMS reports, GCI curves, matched-pair difference fields visualized, perf-ledger time series. These are not Blender-rendered; they are matplotlib / D3 figures. But they're outputs of the same artifact-generation discipline (per-sim, deterministic, attributed to a `build_id`).

This is a clean Phase 6+ sub-charter: extend `render-passes` to a `figure-passes` companion stream that produces methodology figures alongside hero shots.

## 66. Surface 5 — Preprint outputs

The Phase 5 `preprint-extraction` pipeline (spec § 10.5) ships LaTeX-class-and-style infrastructure that consumes a sim's spec sheet and emits an arXiv-ready preprint. Per spec § 10.5:

- Spec sheet § 1 (Scope) → preprint Introduction.
- Spec sheet § 3 (Algorithm) → preprint Method.
- Spec sheet § 4 (Algebraic form) → preprint Math / Discretization.
- Spec sheet § 6 (Verification posture) → preprint Evaluation / Results.
- Spec sheet § 12 (References) → preprint References.

Plus cross-stack equivalence data, MMS reports, and figures from the render / figure pipeline.

What the user sees:

- **A workshop paper or arXiv preprint** ready to submit, with the numerics already verified.
- **A canonical citation handle** — the preprint becomes the way researchers cite a Bit-Physics sim in their own papers.
- **A bridge to peer-reviewed publication** — for frontier variants in particular (Part II flagged this for ~20 sims), the spec-as-preprint path is genuinely real.

The Phase 5 pipeline ships *one* canonical preprint as proof; subsequent per-sim work generates more. By Phase 6+ maturity, the project has a portfolio of preprints, each tied to a specific build_id, each reproducible from the public artifacts.

## 67. Cross-surface conventions

A few patterns that should hold across all surfaces — currently partially specified, worth making explicit:

### 67.1 The settings panel is universal

Tier toggle, seed, capture-to-disk: required everywhere a sim has a UI. Same labels, same default values, same behaviors. A user who learned the panel on the web demo sees the same thing on the desktop binary and (modulo flags vs. GUI) the same thing on the CLI.

### 67.2 The capture-export round-trip is universal

Any sim, any surface, captures to the same HDF5 format. Per § 64.4: the user can capture in surface A and replay in surface B. This is one of the strongest "the Bit-Physics surfaces are one product" signals.

### 67.3 The visual identity is consistent

Currently unspecified. Recommendation: a single design system (color palette, typography, iconography) shared between the website, the desktop binary's ImGui chrome, the Blender render presets, the LaTeX preprint class. A visitor seeing a hero shot on Twitter, clicking through to the website, downloading the binary, and citing the preprint should never feel they're in a different product.

A Phase 6+ design sub-charter could land this as a single deliverable: design-tokens.json + theme files for each surface.

### 67.4 The "where to go next" link is universal

Every surface points at every other surface where appropriate:

- Web demo → "Download for full performance" → binary release page.
- Binary release page → "Try in the browser" → web demo.
- Both → "Use in your research" → Python package + Jupyter.
- All three → "Cite this work" → preprint.
- All four → "View source / contribute" → GitHub.

The user picks the surface that fits their context; the surface itself doesn't trap them there.

### 67.5 The provenance handle is universal

Every surface, every artifact, exposes the `build_id` (commit SHA) of the run that produced it. A capture file has it in the manifest. A render has it in the EXIF metadata. A preprint has it in the methods section. A web demo shows it in the diagnostics panel. The single string `bit-physics @ <commit-sha>` is the canonical handle that ties any artifact back to the exact source state that produced it.

### 67.6 Honest acknowledgment of what's unspecified

Several pieces of this Part are aspirational rather than spec-committed at Phase 5 close:

- **The portal / gallery layer** (§ 62.2) — the web infrastructure ships per-sim pages; the portal is a Phase 6+ deliverable not yet scoped.
- **The per-composition page** (§ 62.3) — compositions don't have specified pages yet.
- **The methodology / verification pages** (§ 62.4) — content exists in docs, but the public-facing presentation is not built.
- **The embed iframe minimal-chrome** (§ 62.5) — the template exists; the minimal-chrome polish is not specified.
- **The figure-passes companion to render-passes** (§ 65.1) — proposed here, not committed.
- **The unified design system** (§ 67.3) — not specified anywhere yet.

Each of these is a natural Phase 6+ sub-charter and a candidate for the next round of work after the first new sim ships.

### 67.7 Decision needed — D-10

**D-10 — Portal / gallery sub-charter scope**

**Question.** What's the scope of the first website-portal sub-charter?

**Options.**
(a) Full portal + per-sim page polish + per-composition page + methodology pages + design system — one large sub-charter.
(b) Portal + per-sim page polish only — defer compositions and methodology to follow-up sub-charters.
(c) Per-sim page polish only — defer everything else; the portal can be a static index until there are enough sims to warrant a real gallery.
(d) None of the above — Bit-Physics stays at the spec-§-10.1 level of per-sim demos with no portal; the project is "a library of demos" not "a website."

**Default position.** (c) for Phase 6.0-6.3 (per-sim page polish; static index), then (a) at Phase 6.4 once there's enough content to warrant a real portal. Compositions warrant their own page treatment once at least one signature composition ships (estimated Phase 6.4+).

**Decision needed.** Before the first front-end-focused sub-charter.

---

# Appendices

## Appendix A — Master reference list

Citations organized per family. ~350 entries total. Citation list is intentionally not exhaustive — these are the anchor references for verification, vendoring, and frontier work. Per-sim sub-charters add their own references.

### A.1 Foundations and methodology
- Roy, C. J. (2005). Review of code and solution verification procedures. *Journal of Computational Physics* 205, 131-156. [V&V foundation]
- Oberkampf, W. L., & Roy, C. J. (2010). *Verification and Validation in Scientific Computing*. Cambridge.
- Salari, K., & Knupp, P. (2000). Code verification by method of manufactured solutions. Sandia Report SAND2000-1444.

### A.2 Fluids and flow
- Popinet, S., & Zaleski, S. (1999). A front-tracking algorithm for accurate representation of surface tension. *International Journal for Numerical Methods in Fluids* 30, 775-793.
- Patel, A., et al. (2025). Integral surface tension formulation in Basilisk. arXiv:2502.02712.
- Pan, J., et al. (2023). Edge-based interface tracking. arXiv:2309.00338.
- Xing, J., Wang, B., Chu, M., Chen, B. (2025). Gaussian Fluids. SIGGRAPH 2025, Peking University.
- Chen, S., et al. (2025). Fast Subspace Fluid with Temporally-Aware Basis. SIGGRAPH 2025.
- Narita, F., Ochiai, N., Kanai, T., Ando, R. (2025). Quadtree Tall Cells for Eulerian Liquid. SIGGRAPH 2025, GAME FREAK.
- Chen, D., Zhou, J., Zhu, B. (2025). A Neural Particle Level Set Method. SIGGRAPH 2025, Georgia Tech.
- Ghia, U., Ghia, K. N., & Shin, C. T. (1982). High-Re solutions for incompressible flow using the Navier-Stokes equations and a multigrid method. *J Comp Phys* 48, 387-411.
- Hysing, S., et al. (2009). Quantitative benchmark computations of two-dimensional bubble dynamics. *Int J Numer Methods Fluids*.
- Monsalve, A., et al. (2025). RiverBedDynamics v1.0: a Landlab component for computing two-dimensional sediment transport and river bed evolution. *Geosci. Model Dev.* 18.
- Stone, J. M., Tomida, K., White, C. J., Felker, K. G. (2020). Athena++. *ApJS* 249, 4.
- Stone, J. M., et al. (2024). AthenaK. arXiv:2409.16053.
- Rossazza, M., et al. (2025). gPLUTO. arXiv:2511.20337.

### A.3 Solids, structures, materials
- Mitra, N., et al. (2025). Curl Quantization for Knit Singularities. SIGGRAPH 2025.
- Hsu, J., et al. (2025). Stable Cosserat Rods. SIGGRAPH 2025.
- Cirio, G., et al. (2014). Yarn-level Simulation of Woven Cloth. SIGGRAPH.
- Sigmund, O., & Maute, K. (2013). Topology optimization approaches. *Struct Multidiscip Optim* 48, 1031-1055.

### A.4 Fracture
- Miehe, C., et al. (2010). A phase field model for rate-independent crack propagation. *Comp Methods Appl Mech Eng* 199, 2765-2778.
- Silling, S. A., & Askari, E. (2005). A meshfree method based on the peridynamic model of solid mechanics. *Computers & Structures* 83, 1526-1535.

### A.5 Gravity and astrophysics
- Springel, V., et al. (2021). Simulating cosmic structure formation with the GADGET-4 code. *MNRAS* 506, 2871-2949.
- Li, Y., et al. (2022). pmwd: A differentiable cosmological particle-mesh N-body library. arXiv:2211.09958.
- Rein, H., & Liu, S.-F. (2012). REBOUND: An open-source multi-purpose N-body code for collisional dynamics. *A&A* 537, A128.
- Mignone, A., et al. (2007). PLUTO: A numerical code for computational astrophysics. *ApJS* 170, 228.
- Tchekhovskoy, A., et al. (2022). H-AMR: A new GPU-accelerated, GRMHD code with 3D adaptive mesh refinement. *ApJS* 263, 26.
- Lesur, G., et al. (2023). IDEFIX: A versatile performance-portable Godunov code. *A&A*.
- Sanches, B. C. M., et al. (2025). AsterX: a new code for GPU GRMHD. *CQG* 42.
- Grete, P., et al. (2023). Parthenon. *International Journal of High Performance Computing Applications*.
- Beloborodov, A. M. (2017). Reconnection-powered emission of black-hole jets. *ApJ* 850, 141.
- Chen, A., Bai, X.-N. (2023). MHD-PIC in Athena++. arXiv:2304.10568.
- Fields, B. D., et al. (2024). GRMHD in AthenaK companion paper.

### A.6 Plasma and PIC
- Vay, J.-L., et al. (2021). WarpX. *Physics of Plasmas* 28.
- Bussmann, M., et al. (2013). PIConGPU. SC '13.
- Lin, Z., et al. (1998). GTC gyrokinetic. *Science* 281, 1835.
- Marks, T. A., & Gorodetsky, A. (2025). WarpX hybrid for Hall thrusters. *J Electric Propulsion*.

### A.7 Electromagnetism
- Yee, K. S. (1966). Numerical solution of initial boundary value problems involving Maxwell's equations in isotropic media. *IEEE Transactions on Antennas and Propagation* 14, 302-307.
- Jakob, W., et al. Mitsuba 3. https://mitsuba-renderer.org.
- mitransient: transient light transport in Mitsuba 3 (2025). arXiv:2510.25660.
- *Optica OPN* (Sept 2024). GPU FDTD performance — 33 Gcells/s on H100.

### A.8 Waves
- Treeby, B. E., & Cox, B. T. k-Wave: MATLAB toolbox for acoustic field simulation.
- Komatitsch, D., & Tromp, J. (2002). SPECFEM3D, spectral-element method.
- Heinecke, A., et al. (2014). SeisSol. SC '14.
- Antoine, X., & Duboscq, R. (2014). GPELab. *Computer Physics Communications* 185.
- Schloss, J., et al. (2018). GPUE. *JOSS*.
- Le, K., & Nguyen, S. (2025). GPE-LLL projection for vortex lattice. arXiv:2511.13212.

### A.9 Heat and phase change
- DeWitt, S., et al. (2020). PRISMS-PF. *npj Comp Mater* 6, 29.
- Levkin, P., et al. (2024). KiSSAM. *Progress in Additive Manufacturing*.
- Friedrich, J., et al. (2023). GPU AM thermomechanical. *Computational Mechanics*.

### A.10 Chemistry and MD
- Bonomi, M., et al. PLUMED 2.
- Schoenholz, S. S., & Cubuk, E. D. (2020). JAX-MD: A Framework for Differentiable Physics. NeurIPS 2020.
- Batatia, I., et al. (2022). MACE. NeurIPS 2022.
- Batzner, S., et al. (2022). NequIP. *Nature Communications* 13, 2453.
- Leimeroth, F., et al. (2025). MLIP benchmark Pareto front. arXiv:2505.02503.
- (2025). Universal MLIPs fine-tuning tutorial. arXiv:2506.21935.
- (2025). MLIP foundation models. arXiv:2511.05337.
- GROMACS GPU FEP (2025). *ACS Omega* 10, 22858-22873. https://pubs.acs.org/doi/10.1021/acsomega.5c00151.
- Souza, P. C. T., et al. (2021). Martini 3. *Nature Methods* 18, 382-388.

### A.11 Life and biology
- Plank, G., et al. (2021). openCARP. *Computer Methods and Programs in Biomedicine* 208, 106223.
- Ghaffarizadeh, A., et al. (2018). PhysiCell. *PLOS Comp Bio*.
- Camps, J., et al. (2024). 12-lead ECG + MRI cardiac digital twins for drug testing. *Medical Image Analysis*.
- (*Circulation* 2025). Personalized heart digital twins for VT.
- (*PLOS One* 2025). Cardiac digital twins at UK Biobank scale (~55,000 participants).
- Sultan, S., et al. (2023). GPU cellular Potts at tissue scale. arXiv:2312.09317.

### A.12 Earth and climate
- Hobley, D. E. J., et al. (2017). Landlab. *Earth Surface Dynamics* 5, 21-46.
- Shobe, C. M., et al. (2017). SPACE. *Geosci Model Dev* 10, 4577-4604.
- Bangerth, W., et al. ASPECT. https://geodynamics.org/cig/software/aspect/.
- ISSM (NASA JPL). https://issm.jpl.nasa.gov/.
- Jouvet, G., & Cordonnier, G. (2024). GNN emulator for ISSM. arXiv:2402.05291.
- Chen, X., et al. (2025). PyTorchFire. *Environmental Modelling & Software*.
- Cao, T., et al. (2025). PyTorchFire on 2025 Palisades fire. arXiv:2510.09708.

### A.13 Radiation transport
- Hissoiny, S., et al. (2013). G4CU CUDA Geant4. *SNA+MC*.
- Bergmann, R. M., & Vujic, J. L. (2015). WARP continuous-energy MC neutron on GPU.
- Cosgrove, J., et al. (2024). MRI-guided RT MC. *Medical Physics*.

### A.14 Social, agents, networks
- Wilensky, U. (1999). NetLogo. Northwestern University.
- Loimos: scalable parallel epidemic simulation (2024). arXiv:2401.08124.
- Treiber, M., & Kesting, A. (2013). *Traffic Flow Dynamics*. Springer.

### A.15 Quantum and tensor networks
- Dubey, A., Zeybek, Z., Schmelcher, P. (2025). Quantum circuits with tree tensor networks. arXiv:2504.16718.
- (2025). Cluster-TEBD. arXiv:2502.19289.
- (2024). Quantum-centric supercomputing for materials science. *Future Generation Computer Systems* 160, 666.
- (ACM Trans Quantum Comp). Efficient tensor networks on modern GPUs.

### A.16 Robotics and digital twins
- Mittal, M., et al. (2024). Isaac Lab. arXiv:2511.04831.
- Freeman, C. D., et al. (2021). Brax. NeurIPS 2021 Datasets and Benchmarks Track.
- (SIGGRAPH 2025 hands-on lab). OpenUSD, Isaac Sim, ROS for software-in-the-loop testing.

### A.17 Materials informatics (recap of A.10)
- Foundation MLIPs (recap): MACE-MP-0, GRACE, MatterSim, SevenNet, ORB.

### A.18 Energy systems
- ParaEMT (NREL) — WECC scaling.
- Sanchez Gomez, M., et al. (2024). FastEddy GAD. *Wind Energy*.
- Taschner, F., et al. (2024). GRASP-OpenFAST actuator line. *Wind Energy*.
- Dabas, J., et al. (2024). GPU-Accelerated Actuator-Disk LES for Wind Farms. ASME Turbo Expo.
- Stipa, S., Ajay, A., Brinkerhoff, J. (2024). Actuator-farm model. *Wind Energy Science* 9, 2301-2332.

### A.19 Hypersonic and high-speed flight
- Lopez, B., Bachchan, N., Peroomian, O. (2025). CFD++ hypersonic non-equilibrium. AIAA SciTech 2025-0213.
- (2023). Boltzmann-BGK GPU for Apollo capsule AS-202. arXiv:2312.06567.
- Marrocco, et al. GPGPU scramjet LES with finite-rate chemistry.

### A.20 Visualization and sparse volumes
- Museth, K. (2013). VDB. *ACM Trans. Graph.* 32.
- Kim, D., Lee, M., Museth, K. (2022). NeuralVDB. arXiv:2208.04448.
- Fields, B., et al. fVDB framework for 3D spatial intelligence (NVIDIA).

## Appendix B — Phenomenon-to-tier-to-stack crosswalk

The crosswalk below assigns the recommended stack for each phenomenon at each available tier. ~170 rows abbreviated to representative selections; full crosswalk lives in per-sim sub-charters. Stack abbreviations: A=GLSL, B=WebGPU+TS, C=Vulkan/C++, D=Taichi/Py, E=Warp/Py, F=Rust/wgpu, G=Mojo.

| Phenomenon | Tier 0 | Tier 1 | Tier 2 |
|---|---|---|---|
| SPH single-phase | B | C, E | E + SPlisHSPlasH-port |
| MPM | n/a or B (2D limited) | E | E + frontier extensions |
| Eulerian smoke | B | C, E | E + NeuralVDB |
| LBM | B | E | E + waLBerla port |
| Multiphase VOF | B (2D) | E | E + Basilisk port |
| Non-Newtonian | B (2D) | E | E + OpenFOAM constitutive |
| Compressible shock | B (1D Sod) | E | E + Athena++ or gPLUTO |
| Airfoil aerodynamics | n/a | E + body-fitted mesh | E + OpenFOAM-port |
| Vortex shedding | B (2D) | E | E + LES |
| Shallow water | B | E | E + Landlab |
| Sediment transport | n/a | E + Landlab-RBD | E + delta-scale |
| Multiphase fluid | B (2D) | E | E + Basilisk port |
| FEM elastodynamics | n/a or A (small 2D) | E | E + Newton |
| Cloth | B | E | E + Newton |
| XPBD rigid | B | E | E + Newton |
| Cosserat hair | B (2D string) | E | E + 1M strands |
| Plasticity | B (1D) | E | E + AM coupling |
| Friction/contact | B (stick-slip) | E + Newton | E + tribological |
| Crystal growth phase-field | B (2D) | E + PRISMS-PF | E + PRISMS-PF + thermal |
| Topology optimization | n/a | E + WU-A | E + multi-physics |
| Brittle fracture | B (2D) | E | E + multi-crack |
| Peridynamics | B (2D) | E | E + Peridigm-port |
| Phase-field fracture | B (2D) | E + MOOSE | E + polycrystalline |
| N-body | B (2D Barnes-Hut) | E (3D PM) | E + GADGET-4 |
| Three-body / orbital | B | E | E + multi-planet |
| Continuum MHD | B (2D Orszag-Tang) | E + AMR | E + AthenaK / gPLUTO |
| Magnetic reconnection | B (2D X-point) | E | E + radiation MHD |
| PIC electrostatic | B (2D two-stream) | E | E + WarpX |
| Tokamak edge | n/a | n/a | E + BOUT++ / SOLPS |
| FDTD EM | B (2D waveguide) | E | E + Meep / Tidy3D |
| Geometric optics | B | E | E + commercial |
| Plasmonics | n/a or B (1D) | E + Drude | E + Tidy3D |
| LC director field | B (2D) | E | E + OpenQmin |
| Acoustic k-Wave | B (2D) | E | E + k-Wave |
| Seismic | n/a | E | E + SeisSol / SPECFEM3D |
| Quantum Schrödinger | B (1D) | E | E + sparse |
| BEC / GPE | B (2D vortex) | E | E + GPUE |
| Heat equation | B (2D) | E | E + 3D scale |
| Conjugate heat transfer | n/a | E | E + OpenFOAM |
| Stefan / phase change | B (2D melting) | E | E + AM coupling |
| Welding | n/a | E | E + KiSSAM |
| AM thermal | n/a | E | E + KiSSAM / Finch |
| Battery thermal | n/a | E | E + COMSOL-equiv |
| Rayleigh-Bénard | B (2D) | E | E + high-Ra |
| Reaction-diffusion | B | E | E + sparse |
| MD classical | B (2D LJ) | E | E + GROMACS-port |
| MD with MLIPs | n/a | E + MACE/NequIP | E + foundation-model fine-tune |
| FEP drug binding | n/a | n/a | E + GROMACS FEP |
| DFT | B (1D well) | E + GPAW | E + CP2K-port |
| Stochastic chemical kinetics | B (Gillespie) | E + tau-leaping | E + spatial SSA |
| Spinodal decomposition | B (2D) | E | E + alloy phase |
| Cardiac EP | B (2D Fenton-Karma) | E | E + openCARP-port |
| Cardiac digital twin | n/a | n/a | E + full pipeline |
| Tumor growth | n/a | E + PhysiCell | E + immune coupling |
| Morphogenesis | B (2D cell sorting) | E + Sultan GPU CPM | E + organ scale |
| Neural field | B (2D Wilson-Cowan) | E | E + whole-brain |
| Flocking variants | B | E | E + ecosystem |
| Bacterial colony | n/a | E | E + biofilm + flow |
| Plant L-system | B | E | E + forest |
| Microswimmer | B (2D) | E | E + bacterial flagellum |
| Erosion / landscape | n/a | E + Landlab | E + climate-coupled |
| Glacier / ice sheet | n/a | E | E + ISSM / PISM |
| Mantle convection | B (2D) | E | E + ASPECT |
| Wildfire CA | B | E + PyTorchFire | E + WRF-Fire |
| MC photon transport | B (1D) | E | E + Geant4-port |
| Medical dose | n/a | E | E + GGEMS |
| Atmospheric scattering | B (2D sunset) | E | E + cloudy atmosphere |
| Inverse rendering | n/a | E + Mitsuba 3 | E + multi-view + WU-C |
| Transient imaging | n/a | n/a | E + mitransient |
| Boids | B | E | n/a |
| Crowd dynamics | B | E | E + city scale |
| Traffic | B | E | E + city + signal opt |
| Epidemic on networks | B | E | E + Loimos |
| Opinion dynamics | B | E | n/a |
| Lenia | B | E | n/a |
| Ising | B | E | E + extended |
| Tensor network DMRG | n/a | E + ITensor | E + quimb GPU + 2D PEPS |
| Quantum circuit | n/a | E + cuStateVec | E + tensor-net beyond |
| Humanoid locomotion | n/a | n/a | E + Isaac Lab |
| Robotic manipulation | n/a | E + MuJoCo MJX | E + Isaac Lab full |
| Drone autonomy | n/a | E | E + Isaac Sim |
| Sensor simulation | n/a | E | E + Isaac Sim RTX |
| MLIP fine-tuning | n/a | n/a | E + MACE / NequIP |
| Wind turbine wake | n/a | E + OpenFAST | E + FastEddy / AVBP |
| Wind farm | n/a | n/a | E + FastEddy + ABL |
| Power flow | n/a | E + MATPOWER | E + WECC scale |
| EMT simulation | n/a | n/a | E + ParaEMT |
| Re-entry CFD | n/a | n/a | E + CFD++ / Boltzmann-BGK |
| Scramjet | n/a | n/a | E + GPGPU LES |

## Appendix C — Composition-to-component crosswalk

| Composition | Constituents | Coupling type | Tier |
|---|---|---|---|
| Buoyancy-driven flow (28.1) | Smoke + Heat | Field-on-field | 0/1 |
| Fluid + Rigid (28.2) | SPH + XPBD | Boundary | 0/1/2 |
| Smoke + Combustion (28.4) | Smoke + Combustion | Field-on-field, stiff | 1/2 |
| MPM + Rigid (28.5) | MPM + XPBD | Co-located | 1/2 |
| Cardiac EP + Mechanics (28.6) | Cardiac + FEM | Co-located, sub-cycle | 1/2 |
| Shallow water + Sediment (28.7) | Shallow + Erosion | Field-on-field, op-split | 1/2 |
| Boids + Predator (28.8) | Boids + Predator | Co-located | 0/1 |
| RD + Cardiac (28.9) | RD-2D + Cardiac | Co-located | 0/1/2 |
| SPH + Cloth (28.10) | SPH + Cloth | Boundary | 1/2 |
| Crystal growth + Thermal (28.11) | Phase-field + Stefan | Field-on-field | 0/1/2 |
| MHD + Reconnection (28.13) | MHD + Reconnection | Co-located | 1/2 |
| Multi-phase + Surface tension (28.14) | VOF + Marangoni | Field-on-field | 1/2 |
| Plant + Wind (28.15) | L-system + Atmospheric | Boundary | 0/1 |
| Smoke + Lighting (28.18) | Smoke + Atmospheric scattering | Field-on-field | 0/1/2 |
| Wildfire + Wind (28.19) | Wildfire + Atmospheric | Field-on-field | 0/1/2 |
| Photonic inverse design (28.22) | FDTD + Adjoint | Optimization loop | 1/2 |
| Cardiac digital twin lite (28.23) | Cardiac + ECG inverse | Inverse modeling | 2 |
| Drug binding FEP (28.24) | MD-MLIP + FEP | Lockstep | 2 |
| Robotic manipulation sim2real (28.25) | Isaac Lab + Sensor | Boundary | 2 |
| Wind turbine + ABL (28.26) | Wake + ABL | Boundary | 2 |
| Power grid EMT + Inverter (28.27) | EMT + Controllers | Field-on-field | 2 |
| Tensor network + Variational (28.28) | DMRG + Optimizer | Optimization loop | 1/2 |
| Hair + Wind (28.29) | Cosserat + Atmospheric | Boundary | 1/2 |
| LiDAR / ToF (28.30) | Transient + Scene | Field-on-field | 1/2 |
| Atmospheric storm (29.1) | Flow + Moisture + Microphysics | Field-on-field 3-way | 1/2 |
| Volcanic eruption (29.2) | Magma + Conduit + Atmosphere | Boundary + field-on-field | 1/2 |
| Solar granulation (29.3) | Convection + Radiation + MHD | Co-located | 2 |
| Tumor microenvironment (29.6) | Tumor + Vasculature + Immune | Co-located | 1/2 |
| Wildfire evacuation (29.7) | Wildfire + Smoke + Crowd | Field-on-field | 1/2 |
| Battery cell (29.8) | Electrochem + Thermal + Mechanics | Co-located | 1/2 |
| Tsunami impact (29.9) | Shallow + Sediment + Structures | Boundary | 1/2 |
| Earthquake (29.25) | Seismic + Fracture + Structural | Field-on-field + boundary | 1/2 |
| Re-entry plasma (29.26) | Re-entry + Plasma + Radiation | Co-located | 2 |
| CME (29.27) | Sun + Wind + Magnetosphere | Boundary + field-on-field | 2 |
| Solar flare (30.1) | MHD + Reconnection + Heating + Radiation + Corona | Co-located | 2 |
| Habitable Coast (30.2) | Shallow + Sediment + Estuary chem + Ecology | Field-on-field | 1/2 |
| Single cell (30.3) | RD + CPM + Agents + Kinetics + Membrane | Co-located multi-scale | 2 |
| Vehicle crash (30.5) | Plasticity + Fracture + CFD + Occupant + Sensor | Boundary + co-located | 2 |
| AM Build (30.8) | Laser + Powder + Melt + Dendrite + Stress | Co-located multi-scale | 2 |
| Wind farm full (30.12) | ABL + Actuator + Turbines + Grid + Control | Boundary + field | 2 |
| Cardiac digital twin full (30.13) | Anatomy + Fiber + EP + ECG + Inverse | Sequential + inverse | 2 |
| Power grid digital twin (30.14) | Power flow + EMT + Inverter + Control + Dispatch | Cross-timescale | 2 |
| Robotic embodied AI (30.15) | Humanoid + Sensor + Policy + Cosmos + RL | Sim-policy loop | 2 |
| Re-entry full (30.17) | Re-entry + Plasma + Radiation + Ablation + TPS | Boundary + co-located | 2 |
| Habitable planet (31.1) | 8 sims, multi-coupled | Multi-interface | 2 multi-GPU |
| Living organ (31.2) | 7 sims, multi-scale | Co-located | 2 |
| Galaxy (31.3) | N-body + Gas + Radiation + Chem + Stars + Feedback + Magnetic | Co-located | 2 |
| Whole star (31.4) | Self-grav + Convection + Radiation + Magnetic + Rotation + Nuclear | Co-located | 2 |
| Smart city (31.6) | Traffic + Grid + Water + Air quality + Crowd + Epidemic + Economy | Field-on-field + co-located | 2 |

## Appendix D — Production-code inventory

Per family. Codes listed with license, primary author/lab, principal URL, and GPU posture.

### Fluids and flow
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| SPlisHSPlasH | MIT | Bender et al., Aachen | CUDA |
| Basilisk | GPL | Popinet, Zaleski | CPU; ports needed |
| OpenFOAM | GPL | community | GPU via AmgX |
| waLBerla | GPLv3 | FAU Erlangen | GPU LBM |
| Palabos | AGPL | community | GPU-aware C++ |
| Pele suite | BSD | AMReX | GPU (Kokkos) |
| Athena++ | BSD | Princeton (Stone) | CPU |
| AthenaK | BSD | Princeton/community | GPU (Kokkos) |
| gPLUTO | GPL | Italian community | GPU (OpenACC) |
| SU2 | LGPL | Stanford | GPU partial |
| Mantaflow | GPL | research | CPU + custom GPU |

### Solids and structures
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| Newton VBD | NVIDIA license | NVIDIA | GPU |
| MuJoCo | Apache 2.0 | DeepMind | GPU via Warp/MJX |
| MJX | Apache 2.0 | DeepMind | GPU via JAX |
| Project Chrono | BSD | UW-Madison | GPU partial |
| FEniCS | LGPL | community | CPU |
| Firedrake | LGPL | community | CPU/GPU |
| CalculiX | GPL | community | CPU |
| SOFA | LGPL | INRIA | CPU + GPU plugins |
| Vega FEM | BSD | USC | CPU |

### Fracture
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| Peridigm | BSD | Sandia | GPU partial |
| MOOSE | LGPL | Idaho National Lab | GPU partial |
| PFM-Code | open | community | CPU |
| PRISMS-PF | LGPL | Michigan | GPU (Kokkos) |
| LS-DYNA | commercial | Ansys | GPU |
| Abaqus Explicit | commercial | Dassault | GPU partial |

### Astrophysics
(See § 12.2 and Fluids and flow)

### Plasma
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| WarpX | BSD | LBNL | GPU |
| PIConGPU | GPLv3 | HZDR | GPU |
| Smilei | CeCILL-B | Polytechnique | GPU partial |
| OSIRIS | open | UCLA/IST | GPU |
| VPIC | BSD | LANL | GPU |
| HiPACE++ | BSD | DESY | GPU |
| BOUT++ | LGPL | UMass | GPU partial |
| SOLPS-ITER | restricted | EUROfusion | CPU |
| GTC | open | UC Irvine | GPU |

### Electromagnetism
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| Meep | GPL | MIT | CPU + GPU partial |
| gprMax | GPL | Edinburgh | GPU |
| OpenEMS | GPL | community | GPU partial |
| Tidy3D | Commercial | Flexcompute | GPU-native + autodiff |
| Lumerical FDTD | Commercial | Ansys | GPU |
| fdtd-z | open | Spectre | GPU systolic |
| Mitsuba 3 | Custom open | EPFL | GPU + autodiff |

### Waves
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| k-Wave | LGPL | Treeby et al., UCL | GPU |
| SeisSol | BSD | TUM | GPU |
| SPECFEM3D | GPL | Princeton | GPU |
| GPELab | open | Antoine/Duboscq | GPU |
| GPUE | MIT | Schloss | GPU |
| TrotterSuzuki | GPL | community | GPU |

### Heat and phase change
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| KiSSAM | research | community | GPU |
| ExaCA | BSD | ORNL | GPU (Kokkos) |
| Finch | open | ORNL | GPU (Cabana/Kokkos) |
| MOOSE phase_field | LGPL | INL | GPU partial |
| PRISMS-PF | LGPL | Michigan | GPU |
| COMSOL | commercial | COMSOL | CPU + GPU partial |

### Chemistry / MD / MLIPs
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| GROMACS | LGPL | community | GPU + GPU FEP 2024-2025 |
| OpenMM | MIT | Stanford | GPU-native |
| LAMMPS | GPL | Sandia | GPU |
| AMBER | open + commercial | Case et al. | GPU |
| NAMD | open | UIUC | GPU (CUDA-native) |
| HOOMD-blue | BSD | Michigan | GPU-native |
| MARTINI | open | Souza et al. | works with GROMACS GPU |
| JAX-MD | Apache 2.0 | Google | GPU via JAX |
| NequIP | MIT | Harvard | GPU; LAMMPS pair |
| Allegro | MIT | Harvard | GPU |
| MACE | MIT | Cambridge | GPU + cuEquivariance |
| MatterSim | open | Microsoft Research | GPU |
| GRACE | open | Helmholtz/community | GPU |
| SevenNet | open | Seoul | GPU |
| ORB | open | Orbital Materials | GPU |
| CP2K | GPL | community | GPU partial |
| Quantum ESPRESSO | GPL | community | GPU partial |
| GPAW | GPL | community | GPU partial |

### Life and biology
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| openCARP | Apache 2.0 | KIT / Graz | GPU |
| PhysiCell | BSD | USC | GPU partial |
| CompuCell3D | MIT | Indiana | CPU; Sultan 2023 GPU CPM |
| Morpheus | open | TU Dresden | CPU |
| Chaste | open | Oxford | CPU |
| NEURON | GPL | Yale | GPU partial |
| Brian2 | CeCILL | community | GPU via CuBA |

### Earth and climate
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| Landlab | MIT | CSDMS | CPU |
| ASPECT | GPL | CIG | CPU |
| ISSM | BSD-like | NASA JPL | CPU + GPU emulator |
| PISM | GPL | Univ. Alaska | CPU |
| MITgcm | MIT | MIT | CPU |
| MOM6 | open | NOAA | GPU partial |
| WRF | public-domain | NCAR | GPU partial |
| FastEddy | open | NCAR | GPU-resident |
| PyTorchFire | open | Chen et al. | GPU + differentiable |

### Radiation transport
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| Geant4 | Geant4 license | CERN | GPU via G4CU |
| G4CU | open | partners | GPU |
| GGEMS | open | partner labs | GPU |
| GMC | research | research | GPU |
| MCNP | restricted | LANL | CPU |
| FLUKA | open | CERN/INFN | CPU |
| WARP | BSD | LBNL | GPU |
| Mitsuba 3 | Custom | EPFL | GPU + autodiff |

### Social and networks
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| NetLogo | GPL | Northwestern | CPU |
| Mesa | Apache 2.0 | community | CPU |
| Repast | BSD | UChicago | CPU |
| Loimos | open | UVa/community | HPC |
| SUMO | EPL | DLR | CPU |
| MATSim | GPL | TU Berlin | CPU |
| ALIEN | open | community | GPU |

### Quantum and tensor networks
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| ITensor | Apache 2.0 | Stoudenmire/Fishman | GPU partial |
| TenPy | GPLv3 | community | GPU partial |
| quimb | Apache 2.0 | community | GPU-aware |
| Qiskit | Apache 2.0 | IBM | GPU via Aer/cuQuantum |
| Cirq | Apache 2.0 | Google | GPU partial |
| cuQuantum (cuStateVec, cuTensorNet) | NVIDIA license | NVIDIA | GPU-native |

### Robotics and digital twins
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| Isaac Sim | NVIDIA license | NVIDIA | GPU-native |
| Isaac Lab | Apache 2.0 | NVIDIA | GPU-native |
| MuJoCo | Apache 2.0 | DeepMind | GPU via MJX/Warp |
| MJX | Apache 2.0 | DeepMind | GPU via JAX |
| Brax | Apache 2.0 | Google | GPU via JAX |
| Project Chrono | BSD | UW-Madison | GPU partial |
| Drake | BSD | TRI | CPU + GPU partial |
| Cosmos | NVIDIA license | NVIDIA | GPU |

### Energy systems
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| ParaEMT | BSD | NREL | GPU |
| PSCAD | commercial | Manitoba Hydro | CPU + GPU partial |
| EMTP | commercial | Powersys | CPU |
| GridLAB-D | BSD | PNNL | CPU |
| OpenFAST | Apache 2.0 | NREL | CPU + GPU partial |
| AVBP | restricted | CERFACS | GPU partial |
| FastEddy | open | NCAR | GPU-resident |
| GRASP | research | various | GPU |
| MATPOWER | open | community | CPU |

### Hypersonic
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| CFD++ | commercial | Metacomp | GPU partial |
| hy2Foam | GPL (OpenFOAM) | community | CPU + GPU partial |
| US3D | research | Minnesota | CPU |
| DPLR | restricted | NASA | CPU |
| Boltzmann-BGK DSE | research | research | GPU |

### Visualization and sparse volumes
| Code | License | Author/lab | GPU posture |
|---|---|---|---|
| OpenVDB | MPL | DreamWorks/Museth | CPU |
| NanoVDB | MPL | NVIDIA | GPU |
| NeuralVDB | NVIDIA EAP | NVIDIA | GPU + neural |
| fVDB | NVIDIA license | NVIDIA | GPU + deep learning |
| ParaView | BSD | Kitware | CPU + GPU rendering |
| VTK | BSD | Kitware | CPU + GPU rendering |

## Appendix E — Industry / research-frontier gap matrix

| Subfield | Investment driver | Anchor codes | Gap that Bit-Physics could fill |
|---|---|---|---|
| MLIPs and foundation models | Battery materials, catalysis, drug discovery | MACE, NequIP, Allegro, GRACE, SevenNet, ORB, MatterSim | Education-grade Tier 0 demos; audited matched-pair Tier 0+Tier 2; clean MLIP fine-tuning workflow |
| Cardiac digital twins | FDA-track clinical validation | openCARP, Camps et al. pipeline | Audit-replay-ready pipeline; matched-pair Tier 0 cardiac excitable media; education path |
| Wind farm modeling | Energy transition policy | OpenFAST, FastEddy, AVBP, GRASP, WRF coupling | Educational Tier 0 wake; composition-as-pipeline transparency |
| Quantum circuit / tensor networks | NISQ hardware validation | DMRG/TEBD codes, cluster-TEBD | Tier 0 MPS tutorial; tensor-net + variational education |
| Robotics sim-to-real | Humanoid robotics, autonomous warehouse | Isaac Sim+Lab, MuJoCo+MJX+Warp | Audited differentiable rigid-body baselines |
| Generative world models | Foundation models for embodied AI | NVIDIA Cosmos, NeRD | Open audited baselines (none clearly exist) |
| GPU FEP for drug binding | Lead-optimization wall-clock collapse | GROMACS GPU FEP | Tier 0 alchemical-sampling education |
| Performance-portable astrophysics | Exascale facility utilization | AthenaK, IDEFIX, AsterX, AthenaPK, KHARMA | Tier 0 Orszag-Tang matched-pair to Tier 2 vendored AthenaK |
| Differentiable rendering / inverse imaging | Photonics inverse design, transient | Mitsuba 3, mitransient | Tier 0 differentiable demo |
| Hypersonics CFD | National security | CFD++, hy2Foam, Boltzmann-BGK GPU | Educational re-entry analog (Tier 0) |
| Real-time wildfire | Climate adaptation | PyTorchFire, WRF-Fire | Audited CA matched-pair to coupled-atmosphere; education |
| GPU power-grid EMT | Renewable integration | ParaEMT, real-time HVDC | Educational small-grid Tier 0; matched-pair to ParaEMT scale |

## Appendix F — Phase 5 sim baseline rollup

Summary of the assumed Phase 5 portfolio (from § 2.1):

| Sim | Stack(s) | Productization streams qualifying | Common modules used | WUs consumed |
|---|---|---|---|---|
| Reaction-diffusion 2D | A, B, C, D, E | web, binary, pypi, render (canonical?), preprint (canonical?) | common-warp, common-ts | all WUs available |
| Ising classical | B | web | common-ts | WU-F (equivalence) |
| SPH | C, E | binary, pypi | common-warp, common-cpp | WU-A (if diff variant), WU-D (Newton), WU-F |
| MPM | E (+ D for diff) | pypi | common-warp, common-py | WU-A (if diff variant), WU-F |
| Eulerian smoke | B, C, E | web, binary, pypi | common-warp, common-ts, common-cpp | WU-F |
| Lattice Boltzmann | B, E | web, pypi | common-warp, common-ts | WU-F |
| FEM elastodynamics | E | pypi | common-warp, common-py | WU-D (Newton), WU-F |
| Cloth | B, E | web, pypi | common-warp, common-ts | WU-D, WU-F |
| XPBD rigid | B, E | web, pypi | common-warp, common-ts | WU-D, WU-F |
| Boids | B (+ D for diff) | web, pypi | common-warp, common-ts | WU-A (if diff variant), WU-F |
| N-body (Barnes-Hut) | E (+ pmwd-port for diff) | pypi | common-warp | WU-A (if pmwd), WU-F |
| PIC electrostatic | E | pypi | common-warp | WU-F; promotes common-em later |
| 3DGS reference | (Layer 7 reference) | bespoke | common-warp | WU-C |

Phase 5 ships pipelines, not exhaustive coverage; the productization pipelines fan out to every sim with the appropriate opt-in flag. Sims listed above are the canonical baseline; additional minor sims may exist depending on Phase 0-4 execution detail.

## Appendix G — Glossary

| Term | Definition |
|---|---|
| **ABL** | Atmospheric boundary layer; the lowest part of the atmosphere directly influenced by the surface |
| **AM** | Additive manufacturing (3D printing) |
| **AMR** | Adaptive mesh refinement |
| **API** | Application programming interface |
| **BEC** | Bose-Einstein condensate |
| **CFD** | Computational fluid dynamics |
| **CME** | Coronal mass ejection |
| **CPM** | Cellular Potts model (Glazier-Graner-Hogeweg) |
| **DEM** | Discrete element method |
| **DMRG** | Density matrix renormalization group |
| **DNS** | Direct numerical simulation |
| **DTMRI** | Diffusion-tensor MRI (gives muscle fiber orientation) |
| **ECG** | Electrocardiogram |
| **EMT** | Electromagnetic transient (power grid simulation regime) |
| **EP** | Electrophysiology |
| **FDTD** | Finite-difference time-domain (Maxwell's equations) |
| **FEM** | Finite element method |
| **FEP** | Free-energy perturbation |
| **FMM** | Fast multipole method |
| **FSI** | Fluid-structure interaction |
| **GCI** | Grid convergence index (Roy 2005) |
| **GCM** | Global climate / general circulation model |
| **GPE** | Gross-Pitaevskii equation |
| **GRMHD** | General-relativistic magnetohydrodynamics |
| **HIFU** | High-intensity focused ultrasound |
| **HVDC** | High-voltage direct current |
| **ICF** | Inertial confinement fusion |
| **IDM** | Intelligent driver model (traffic) |
| **LBM** | Lattice Boltzmann method |
| **LES** | Large-eddy simulation |
| **MD** | Molecular dynamics |
| **MLIP** | Machine-learning interatomic potential |
| **MMS** | Method of manufactured solutions |
| **MPM** | Material point method |
| **MPS** | Matrix product state |
| **NLOS** | Non-line-of-sight |
| **PEPS** | Projected entangled pair state |
| **PIC** | Particle-in-cell |
| **PINN** | Physics-informed neural network |
| **PM** | Particle-mesh |
| **PvP** | Pressure-volume loop (cardiac) |
| **RANS** | Reynolds-averaged Navier-Stokes |
| **RD** | Reaction-diffusion |
| **RL** | Reinforcement learning |
| **RT** | Radiation therapy |
| **SEI** | Solid-electrolyte interphase |
| **SIR** | Susceptible-Infected-Recovered (epidemic) |
| **SPH** | Smoothed-particle hydrodynamics |
| **SSA** | Stochastic simulation algorithm (Gillespie) |
| **SSFM** | Split-step Fourier method |
| **TEBD** | Time-evolving block decimation |
| **TPS** | Thermal protection system |
| **TTN** | Tree tensor network |
| **USD** | Universal Scene Description (Pixar/NVIDIA) |
| **V&V** | Verification and validation |
| **VOF** | Volume of fluid |
| **VT** | Ventricular tachycardia |
| **WU** | Work unit (Phase 4 capability) |
| **XPBD** | Extended position-based dynamics |

---

**End of Bit-Physics Master Catalog v2.0.**

*Total length: ~50,000 words; ~170 phenomena across 18 families; ~95 compositions across 4 complexity levels; ~350 references in Appendix A; cross-walks B/C/D/E/F mapping the catalog onto stack, composition, production-code, gap, and Phase 5 baseline dimensions.*

*Generated May 2026 for consideration at Phase 6+.*

## Appendix H — Per-family testing surface checklists

Each Part II family has a per-family testing checklist that names the concrete verification anchors, golden-value derivations, PBT invariants, calculation-validation references, cross-code peers, and cross-tier matched-pair recipes appropriate for that family. The checklists are reference cards — a sub-charter author for any new sim in a given family starts here.

Conventions across all checklists:
- **MMS** = manufactured-solution candidates suitable for the family's PDEs.
- **Golden** = closed-form algorithms in the family that warrant golden tables.
- **PBT** = property-based invariants (conservation, symmetry, bounds).
- **CV** = calculation-validation references (experimental / observational datasets to reproduce).
- **Cross-code** = independent codes for differential testing (§ 50.1).
- **Matched-pair** = what specifically is compared in Tier 0 ↔ Tier 1 / Tier 1 ↔ Tier 2 gates.

### H.1 Fluids and flow (§ 9)

- **MMS.** Taylor-Green vortex (analytic 2D + 3D); manufactured Navier-Stokes solutions with prescribed body force; manufactured advection-diffusion in periodic BCs.
- **Golden.** SPH kernel evaluation (cubic spline, quintic, Wendland); LBM equilibrium distribution function (D2Q9, D3Q19, D3Q27); EOS lookups (Tait, ideal gas, stiffened gas); MPM-shape-function table.
- **PBT.** Mass conservation under random forcing; momentum conservation in periodic BCs; energy non-increase under dissipation; positivity of density / pressure; velocity bounds under bounded forcing; CFL satisfaction across random parameters.
- **CV.** Ghia et al. (1982) lid-driven cavity; Hysing et al. (2009) rising-bubble; Sod / Sedov / Brio-Wu canonical shocks; NACA airfoil AGARD; Strouhal-Reynolds for cylinder; Young's analytical bubble migration.
- **Cross-code.** SPlisHSPlasH ↔ PySPH ↔ DualSPHysics for SPH; waLBerla ↔ Palabos for LBM; Basilisk ↔ OpenFOAM for VOF; Athena++ ↔ PLUTO ↔ gPLUTO for compressible.
- **Matched-pair.** Tier 0 2D Taylor-Green ↔ Tier 1 3D Taylor-Green at the 2D slice; Tier 1 SPH ↔ Tier 2 SPlisHSPlasH-port on a Hysing bubble.

### H.2 Solids, structures, materials (§ 10)

- **MMS.** Linear elasticity with manufactured body forces; St-Venant Kirchhoff with manufactured displacement; classical plate-bending analytic.
- **Golden.** Elastic stiffness tensor for canonical materials; XPBD constraint Jacobian; mass-spring force law.
- **PBT.** Symmetry preservation under random rotations; passivity (elastic energy non-negative); contact forces non-tensile; large-deformation rotation invariance; angular-momentum conservation for unconstrained bodies.
- **CV.** Uniaxial tension to yield-then-flow (analytic); Hertzian contact pressure; cantilever bending; plate vibration modes (Kirchhoff-Love analytic).
- **Cross-code.** Newton VBD ↔ MuJoCo MJX for rigid; FEniCS ↔ CalculiX for FEM elasticity; SOFA ↔ Vega FEM for soft body.
- **Matched-pair.** Tier 0 2D cantilever ↔ Tier 1 3D cantilever at the bending plane; Tier 1 XPBD ↔ Tier 2 Newton on contact-rich scenario.

### H.3 Fracture, damage, and failure (§ 11)

- **MMS.** Phase-field with manufactured crack-driving force; manufactured stress field at sharp crack.
- **Golden.** K_I, K_II, K_III stress-intensity tables at canonical geometries; Westergaard stress-field tabulation.
- **PBT.** Energy release rate ≥ 0; crack-tip stress-intensity factor scaling with √r; damage variable monotone non-decreasing (no healing in standard models).
- **CV.** Westergaard analytic at crack tip; Griffith critical stress; DCB mode-I (cohesive zone); SENT (phase-field benchmark); Holsapple crater scaling for impact; Paris-law calibration for fatigue.
- **Cross-code.** Peridigm ↔ EMU for peridynamics; MOOSE ↔ PRISMS-PF for phase-field fracture.
- **Matched-pair.** Tier 0 2D phase-field tension ↔ Tier 1 3D phase-field tension at the loading plane.

### H.4 Gravity and astrophysics (§ 12)

- **MMS.** Manufactured MHD with prescribed source; Bondi accretion analytic (spherical); Schwarzschild-geodesic test particle.
- **Golden.** Barnes-Hut tree evaluation at canonical particle layouts; FMM multipole evaluation tables; Yee MHD finite-difference stencils.
- **PBT.** Energy + linear momentum + angular momentum conservation in isolated N-body; ∇·B = 0 in MHD to machine precision; positivity of density; γ² constraint in special-relativistic regime.
- **CV.** Orszag-Tang MHD vortex; Brio-Wu MHD shock; MRI linear growth rate; Lagrange points and Hill sphere (three-body); Sedov-Taylor blast.
- **Cross-code.** GADGET-4 ↔ SWIFT for N-body; Athena++ ↔ AthenaK ↔ AthenaPK for MHD; pmwd ↔ traditional PM for differentiable cosmology.
- **Matched-pair.** Tier 0 2D Orszag-Tang ↔ Tier 1 3D Orszag-Tang; Tier 1 Barnes-Hut ↔ Tier 2 GADGET-4 on small cosmology.

### H.5 Plasma, PIC, MHD (§ 13)

- **MMS.** Manufactured electrostatic; manufactured electromagnetic with prescribed currents; two-fluid Bondi.
- **Golden.** Yee EM stencil; PIC current-deposition algorithms (Esirkepov, Villasenor-Buneman); LJ-style interaction laws at canonical separations.
- **PBT.** Charge conservation in PIC to machine precision; Maxwell's equations satisfied to declared tolerance; γ²-1/c²·v² constraint in relativistic PIC; positivity of particle density.
- **CV.** Two-stream instability analytic; cold plasma dispersion relations; Vlasov equilibria; ITER plasma scaling laws.
- **Cross-code.** WarpX ↔ PIConGPU ↔ Smilei ↔ OSIRIS for PIC; BOUT++ ↔ SOLPS for edge fluid.
- **Matched-pair.** Tier 0 2D two-stream ↔ Tier 1 3D two-stream at the 2D plane.

### H.6 Electromagnetism and optics (§ 14)

- **MMS.** Manufactured Maxwell with prescribed currents; manufactured Helmholtz frequency-domain.
- **Golden.** Mie-scattering cross-sections (analytic for sphere); Bessel-function values at canonical points; PML attenuation coefficients.
- **PBT.** Energy conservation in lossless media; reciprocity (interchange source ↔ receiver); polarization preservation in isotropic media.
- **CV.** Mie scattering analytic; half-wave dipole far-field pattern; Snell's law; quarter-wave plate retardation; Bloch band structure for periodic crystal.
- **Cross-code.** Meep ↔ Tidy3D ↔ fdtd-z ↔ Lumerical for FDTD; Mitsuba 3 ↔ commercial ray-tracers.
- **Matched-pair.** Tier 0 2D waveguide ↔ Tier 1 3D waveguide at the 2D plane; Tier 1 ↔ Tier 2 vendored Meep on photonic crystal.

### H.7 Waves — acoustic, elastic, quantum, water (§ 15)

- **MMS.** Manufactured wave equation with prescribed forcing; manufactured Schrödinger with prescribed potential.
- **Golden.** Split-step Fourier kernel; spectral-element basis functions; Stokes-wave amplitudes at canonical depth.
- **PBT.** Energy conservation for lossless wave; reciprocity; norm conservation for Schrödinger; Thomas-Fermi ground state for GPE.
- **CV.** Kelvin wedge angle (analytic); Bessel cavity modes; bound states in canonical 1D potentials (square well, harmonic, double-well); Abrikosov vortex density for BEC.
- **Cross-code.** k-Wave ↔ SimSonic for acoustic; SPECFEM3D ↔ SeisSol for seismic; GPELab ↔ GPUE ↔ TrotterSuzuki for GPE.
- **Matched-pair.** Tier 0 1D wave-packet-on-barrier ↔ Tier 1 2D Schrödinger.

### H.8 Heat transfer and phase change (§ 16)

- **MMS.** Manufactured heat equation; manufactured Stefan with prescribed interface motion; manufactured Boussinesq.
- **Golden.** Analytic Green's function for heat equation in canonical domains; latent-heat enthalpy lookup.
- **PBT.** Energy conservation (with declared latent-heat accounting); maximum principle (no spurious local maxima for parabolic equations); positivity of temperature where physical.
- **CV.** 1D Stefan analytic; Rayleigh-Bénard critical Ra; semi-infinite slab cooling (Carslaw-Jaeger); Marangoni cell critical Marangoni number.
- **Cross-code.** OpenFOAM chtMultiRegionFoam ↔ commercial Fluent; PRISMS-PF ↔ MOOSE for phase-field solidification.
- **Matched-pair.** Tier 0 2D Stefan ice melting ↔ Tier 1 3D Stefan; Tier 0 RB cell ↔ Tier 1 3D RB.

### H.9 Chemistry, MD, matter (§ 17)

- **MMS.** Manufactured RD (RD-2D is the existing reference); manufactured advection-diffusion-reaction.
- **Golden.** LJ potential at canonical separations; PME / Ewald sum at canonical configurations; bond/angle/dihedral force formulas; common MLIP energy/force evaluations on small reference structures (every MLIP must publish reference energies for tabulated structures).
- **PBT.** Total energy drift below threshold over canonical run; temperature within ±5 % of target in NVT; PBC consistency under random translation; symmetry of force matrix (Newton's third law) to machine precision; correct gradient/Hessian for MLIPs via finite difference.
- **CV.** Lennard-Jones-Argon EOS reproduction; SPC/E water density-temperature; experimental ligand binding affinities from PDB for FEP.
- **Cross-code.** GROMACS ↔ OpenMM ↔ AMBER ↔ LAMMPS for classical MD; MACE ↔ NequIP ↔ Allegro for MLIPs on shared structures; CP2K ↔ Quantum ESPRESSO for DFT.
- **Matched-pair.** Tier 0 2D LJ ↔ Tier 1 3D LJ on per-particle energy; Tier 1 MD-MLIP-MACE ↔ Tier 1 MD-MLIP-NequIP on shared structure.

### H.10 Life, biology, cardiac (§ 18)

- **MMS.** Manufactured monodomain with prescribed ionic kinetics; manufactured reaction-diffusion for morphogenesis.
- **Golden.** Ionic-model gating-variable evaluation tables (Fenton-Karma, ten Tusscher); fiber-orientation tensor at canonical points.
- **PBT.** Voltage in physiological range [-100, +50] mV; refractory period respected (no re-excitation during refractory); APD restitution curve shape; cell-count conservation in agent-based.
- **CV.** Conduction velocity in 2D (Mitchell-Schaeffer analytic limits); spiral-wave wavelength; published patient ECG for digital-twin pipeline (Camps et al. 2024); Gompertzian tumor growth.
- **Cross-code.** openCARP ↔ CARP ↔ Chaste for cardiac monodomain; PhysiCell ↔ CompuCell3D ↔ Morpheus for multi-cell.
- **Matched-pair.** Tier 0 2D Fenton-Karma spiral ↔ Tier 1 3D ventricle at the apical plane.

### H.11 Earth, atmosphere, climate (§ 19)

- **MMS.** Manufactured shallow water; manufactured advection on sphere; manufactured ice-flow Stokes.
- **Golden.** Stream-power-law erosion coefficient lookups; Glen's flow-law coefficients; analytic profile for steady-state river.
- **PBT.** Mass conservation in advection schemes; topography monotonicity (no spurious negative elevation); ice thickness ≥ 0; burn-area monotone-non-decreasing in spreading wildfire.
- **CV.** Stoker dam-break; Carrier-Greenspan run-up; Glen's law; Blankenbach et al. 1989 mantle convection benchmarks; historical burn-scar reproduction (PyTorchFire 2025 Palisades evaluation).
- **Cross-code.** Landlab ↔ FastScape for landscape evolution; ASPECT ↔ Aspect-FastScape for mantle-surface; ISSM ↔ PISM for ice sheet.
- **Matched-pair.** Tier 0 2D dam break ↔ Tier 1 inundation on bathymetry; Tier 0 wildfire CA ↔ Tier 1 WRF-Fire on small terrain.

### H.12 Radiation transport (§ 20)

- **MMS.** Manufactured transport equation with prescribed source; analytic Green's function for half-space.
- **Golden.** Single-scattering phase function evaluations; Klein-Nishina cross-section at canonical energies; PENELOPE / Geant4 cross-section tabulations.
- **PBT.** Energy conservation (photon energy ↔ deposited energy + transmitted); positivity of intensity; reciprocity of source/receiver in linear transport.
- **CV.** Gamma-index analysis (3 %/3 mm) for medical dose; k-eff for Godiva and Jezebel critical assemblies; single-scattering analytic for sphere.
- **Cross-code.** Geant4 ↔ FLUKA ↔ PENELOPE for medical physics; G4CU ↔ GGEMS for GPU MC; Mitsuba 3 ↔ pbrt for inverse rendering.
- **Matched-pair.** Tier 1 phantom dose ↔ Tier 2 full IMRT plan on overlapping voxels.

### H.13 Social, agents, networks (§ 21)

- **MMS.** Manufactured opinion-dynamics with prescribed flux (e.g., voter model with biased random walk).
- **Golden.** Lotka-Volterra equilibria; SIR analytic peak/timing; Schelling tipping point.
- **PBT.** Agent count conservation; SIR conservation S+I+R = N; opinion-space bounded; traffic density ≤ 1 / mean-vehicle-length.
- **CV.** Loimos California digital twin (200 days COVID outbreak in 42 s); historical traffic flow data; Watts-Strogatz network statistics.
- **Cross-code.** NetLogo ↔ Mesa ↔ Repast for ABM; SUMO ↔ MATSim for traffic.
- **Matched-pair.** Tier 0 2D SIR small-world ↔ Tier 1 city-scale; Tier 0 boids ↔ Tier 1 3D fish school.

### H.14 Quantum, DFT, tensor networks (§ 22)

- **MMS.** Manufactured Schrödinger with prescribed time-dependent Hamiltonian; manufactured Lindblad master equation.
- **Golden.** Pauli-matrix algebra at canonical states; Trotter-step error tabulation; Heisenberg ground-state energy in 1D analytic.
- **PBT.** Hermiticity of Hamiltonian; unitarity of evolution; norm preservation in Schrödinger; positivity of density matrix; trace = 1 for density operators.
- **CV.** 1D Heisenberg ground state (analytic via Bethe ansatz); QAOA fidelity bounds; published quantum-circuit benchmarks (Google Sycamore, IBM).
- **Cross-code.** ITensor ↔ TenPy ↔ quimb for tensor networks; Qiskit ↔ Cirq for state-vector quantum.
- **Matched-pair.** Tier 0 1D Heisenberg ↔ Tier 1 1D MPS-DMRG.

### H.15 Robotics, control, digital twins (§ 23)

- **MMS.** Manufactured joint trajectory with prescribed control input (controller smoke).
- **Golden.** Forward kinematics tables for canonical robot URDFs; PID step-response analytic; LQR gain matrices for canonical systems.
- **PBT.** Joint-limit respect under random control; mass-matrix positive-definite; no penetration in contact (within declared tolerance); time-monotonicity in policy step.
- **CV.** Salimpour et al. (2025) zero-shot sim-to-real navigation; Isaac Lab manipulation benchmark (peg-in-hole, stacking); MuJoCo cartpole / pendulum analytic.
- **Cross-code.** Isaac Sim ↔ MuJoCo MJX ↔ Brax ↔ Drake for rigid-body robotics.
- **Matched-pair.** Tier 1 tabletop manipulation simplified ↔ Tier 2 full Isaac Lab on the same task.

### H.16 Materials informatics and MLIPs (§ 24)

- **MMS.** Reference structures with DFT-published energies/forces. (MLIPs don't admit traditional MMS — their "manufactured" anchor is DFT.)
- **Golden.** Reference energy/force evaluations on canonical structures: water dimer, NaCl crystal, methane, benzene, common defects in Materials Project; energy ordering across polymorphs.
- **PBT.** Energy-conserving (gradient of energy = force, finite-difference matches autograd to machine precision for the MLIP); symmetry under random rotation (E(3)-equivariance); invariance under permutation of identical atoms.
- **CV.** Leimeroth et al. (2025) Pareto-frontier benchmark on Al-Cu-Zr and Si-O; foundation-model fine-tuning agreement with full-DFT (Microsoft AI for Science Team 2025 benchmark).
- **Cross-code.** MACE ↔ NequIP ↔ Allegro ↔ GRACE ↔ SevenNet ↔ ORB on shared evaluation structures.
- **Matched-pair.** Tier 1 small protein with MLIP ↔ Tier 2 materials-scale MD with same MLIP fine-tune.

### H.17 Energy systems — power grid, wind, fusion engineering (§ 25)

- **MMS.** Manufactured ABL flow profile; manufactured power-system load flow with prescribed bus injections; manufactured EMT transients.
- **Golden.** Steady-state load-flow Newton-Raphson iteration outputs at canonical IEEE test cases; wake-deficit profile (Bastankhah-Porté-Agel analytical).
- **PBT.** Power balance at every bus (∑P_inj = 0); voltage bounded; wake deficit ≥ 0 and ≤ 1; tip-speed ratio within design envelope.
- **CV.** IEEE 14-bus, 30-bus, 118-bus power flow benchmarks; WECC 240-bus for EMT (ParaEMT reference); Horns Rev wind farm (AVBP, FastEddy benchmark); Wakebench wind turbine wake benchmark; NTNU Blind Test data.
- **Cross-code.** PSCAD ↔ EMTP ↔ ParaEMT for EMT; OpenFAST ↔ FastEddy ↔ AVBP ↔ GRASP for wind.
- **Matched-pair.** Tier 1 single-turbine wake ↔ Tier 2 full Horns Rev; Tier 1 IEEE 14-bus EMT ↔ Tier 2 WECC 240-bus.

### H.18 Hypersonic and high-speed flight (§ 26)

- **MMS.** Manufactured Boltzmann-BGK with prescribed source; manufactured Navier-Stokes with two-temperature model.
- **Golden.** Equilibrium distribution-function moments (kinetic theory analytic); Rankine-Hugoniot jump conditions across normal shock.
- **PBT.** Mass / momentum / energy conservation across shock; entropy non-decrease; positivity of density / pressure; T_tr / T_vib bounded.
- **CV.** Fire-II (Apollo); Stardust; RAM C-II; OREX re-entry flight data; double cone / hollow cylinder flare (RTO WG 10 hypersonic CFD validation); NASA Hyper X-43A scramjet.
- **Cross-code.** CFD++ ↔ hy2Foam ↔ DPLR ↔ LeMANS for hypersonic CFD; Boltzmann-BGK GPU (arXiv 2312.06567) for kinetic regime.
- **Matched-pair.** Tier 2 reduced Apollo at M=22.7 (compute-budget limited) ↔ Tier 2 full Boltzmann-BGK on same case.

---

**End of Appendix H — per-family testing surface checklists.**

These checklists are reference cards. A sub-charter author for any new sim begins by consulting the relevant family's checklist and selects: at least one MMS anchor, at least one golden table with ≥ 3 independent references, the family-applicable PBT invariants, at least one CV reference, the relevant cross-code peers, and the family's matched-pair recipe. The 13-gate per-sim acceptance (spec § 3.5) then becomes the structural enforcement of these selections.
