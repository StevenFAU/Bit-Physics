# Sim specifications

Per-sim reference specs grouped by category (spec § 5). Each sim's
directory follows the 5-file pattern: `README.md`, `spec-ref.md`,
`algebraic.md`, `determinism.md`, `equivalence.md`. The 13-section
spec-ref template lives at [`_template.md`](_template.md).

## Phase 0 sims (Block 8)

### Continuous CA

- [reaction-diffusion-2d](continuous-ca/reaction-diffusion-2d/) —
  Gray-Scott (Pearson 1993) λ regime. Stack B (WebGPU compute +
  NumPy reference). Phase 0 ships the canonical integration sim;
  Phase 1 Stage 2 adds the RD-2D MMS at
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`
  per the R8 co-bundle amendment.

## Phase 1 sims (Stage 2 TDD bootstraps)

Per charter § 4.3 sequencing. All 9 sims ship spec docs + failing
tests + goldens / MMS; sim implementation deferred to per-sim Phase
2+ phases.

### Closed-form

- [strange-attractors](closed-form/strange-attractors/) — Lorenz /
  Rössler / Aizawa / Sprott / Pickover ODEs. Stack B. Charter § 7.4.
- [mandelbulb-explorer](closed-form/mandelbulb-explorer/) — 3D
  fractal distance estimator (Quilez 2009 / Hart 1996). Stack B.
  Charter § 7.4.

### Agent-based

- [boids-3d](agent-based/boids-3d/) — Reynolds 1987 three-rule
  flocking. Stack B. Charter § 7.5.
- [physarum](agent-based/physarum/) — Jones 2010 mold transport.
  Stack B. Charter § 7.5.

### Continuous CA (Phase 1 extension)

- [reaction-diffusion-3d](continuous-ca/reaction-diffusion-3d/) — 3D
  Gray-Scott. Stack C. Charter § 7.6. Co-bundles the RD-2D MMS.

### Particle fluids

- [sph-water](particle-fluids/sph-water/) — DFSPH (Bender-Koschier
  2015) with screen-space rendering. Stack C, references the Phase
  0-vendored SPlisHSPlasH (`references/SPlisHSPlasH/`). Charter § 7.7.

### Volumetric grid

- [eulerian-smoke](volumetric-grid/eulerian-smoke/) — Stam-Fedkiw
  stable-fluids stack. Stack C. Charter § 7.8.

### Lattice

- [lattice-boltzmann-d3q19](lattice/lattice-boltzmann-d3q19/) — BGK
  D3Q19 (Qian-d'Humières-Lallemand 1992). Stack C. Algebraic
  reference only per R8 amendment (no Krüger 2017 vendoring).
  Charter § 7.9.

### Hybrid particle-grid

- [mpm-multimaterial](hybrid-pg/mpm-multimaterial/) — MLS-MPM (Hu et
  al. 2018) with multi-material constitutive declarations. Stack D
  (Taichi). Charter § 7.10.

## Phase 1 testkit artifacts

Per the Phase 1 landing audit + the registry at
`tools/integrity/integrity/phase1_registry.toml`:

- **3 MMS solutions:** reaction_diffusion_2d (co-bundle),
  reaction_diffusion_3d, incompressible_ns_2d (shared by
  eulerian-smoke and lattice-boltzmann per Stage 2 shift #18).
- **7 Stage 2 golden tables:** Lorenz structural, mandelbulb DE,
  boids 3-agent, physarum deposit, DFSPH density-evolution, D3Q19
  equilibrium, MLS-MPM quadratic-B-spline. Plus Phase 0's
  cubic-spline-kernel.

See also: [`docs/phases/phase-1-plan.md`](../phases/phase-1-plan.md)
for the full charter; the Phase 1 landing audit at
`docs/_audits/phase-1/landing-<UTC>.md` for the closing-summary
reference.
