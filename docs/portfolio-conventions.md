# Portfolio Conventions (Phase 4.0 / WU-P)

> **Canonical cross-sim convention reference for the Bit-Physics portfolio.**
> Landed by Phase-4 WU-P (Stage 1); referenced by every subsequent Phase-4 work
> unit and every Phase-4.1+ sim. Read once at the start of Phase 4.
>
> **Consumption pattern.** Every Phase-4.1+ sim's `spec-ref.md` (or variant spec)
> references this file: *"Conventions: `docs/portfolio-conventions.md` applied
> except where noted."* Deviations are explicit, with rationale, in the sim's own
> spec. Sources: phase-4-plan § 4.2.P; spec `docs/architecture.md` § 6.2 / § 6.4 /
> § 7.10.
>
> **Status.** Seed registry — the capture-field naming registry grows over time as
> new fields recur across ≥ 3 sims (the Rule-of-Three, spec § 7.10). Additions are
> additive; existing canonical names are stable.

---

## Units

**SI base units.** Length in **meters**, mass in **kilograms**, time in
**seconds**, temperature in **kelvin**, electric current in **amperes**. Derived
quantities follow SI (density kg/m³, pressure Pa = kg·m⁻¹·s⁻², force N = kg·m·s⁻²).

**Per-sim deviation** requires an explicit declaration in the sim's `spec-ref.md`
"Units" section with rationale. Typical legitimate deviations:

- **Non-dimensionalized CFD** sims (scaling studies) — declare the reference
  scales used to non-dimensionalize.
- **Cellular-automata / continuous-CA** sims (`neural-ca`, `lenia`, Lenia
  variants) — non-physical state; "units" are dimensionless lattice quantities.

## Coordinates

**Right-handed Cartesian, Y-up.** This matches the OpenUSD default (spec § 6.4
uses USD as a first-class export target; WU-D's `create_scene_template` defaults to
Y-up). Vector components are ordered `(x, y, z)`.

**Per-sim deviation:** scientific-visualization sims may prefer Z-up; the deviation
is declared in the sim's `spec-ref.md` "Coordinates" section. 2-D sims use the
`(x, y)` plane (the Y-up convention degenerates to standard 2-D Cartesian).

## Time semantics

- **`sim_time: float`**, in **seconds**, monotonically increasing from `0.0`.
- Capture frames carry `sim_time` as a required field for Phase-4 sims (existing
  Phase-0–3 captures are step-indexed; Phase-4 sims add `sim_time`).
- Time step **`dt`** in seconds for physical sims; **dimensionless `dt = 1.0`** for
  non-physical sims (cellular automata, Lenia variants), where a "step" is one
  update-rule application rather than a physical time increment.

## Capture-field naming registry

Required **canonical names** for fields appearing in **3 or more sims** (the
Rule-of-Three, spec § 7.10). A field recurring across ≥ 3 sims MUST use its
canonical name so cross-sim comparison and equivalence work without per-sim
conversion. Sim-specific fields (appearing in < 3 sims) use sim-specific names and
are documented in the sim's `spec-ref.md` "Captured fields" section.

| Canonical name | Meaning | Dtype | Shape pattern |
|---|---|---|---|
| `density` | Scalar density (kg/m³ for physical) | float32 | grid or particle |
| `velocity` | Vector velocity (m/s for physical) | float32 | grid or particle, 3-component |
| `pressure` | Scalar pressure (Pa for physical) | float32 | grid |
| `position` | Particle position | float32 | (N, 3) |
| `mass` | Particle mass (kg for physical) | float32 | (N,) |
| `force` | Force vector | float32 | (N, 3) |
| `temperature` | Scalar temperature | float32 | grid or particle |
| `deformation_gradient` | Deformation gradient F | float32 | (N, 3, 3) |

**Vector components** are accessed by dot-suffix: `velocity.x`, `velocity.y`,
`velocity.z` (and likewise `force.x`, etc.). The registry can grow over time;
this WU seeds it, and any field that crosses the Rule-of-Three threshold in a
later sim is added here (additively) at that sim's landing.

## Seed derivation

Stochastic operations derive their seeds from a **single sim-level seed** via
`numpy.random.SeedSequence`, so a sim is reproducible from one integer:

- The sim holds `sim_seed: int`. Each independent stochastic operation derives a
  child seed via `seed_seq.spawn(1)[0]` (NumPy's recommended non-overlapping
  stream spawning).
- **Per-step / per-stack** seeds are deterministically derived from the tuple
  `(sim_seed, step_index, stack_id)` via
  `numpy.random.SeedSequence((sim_seed, step_index, hash(stack_id)))`, so two
  stacks (or two steps) draw independent but reproducible streams.
- Frameworks with their own global RNG (PyTorch / Lightning) pin it from the same
  sim-level seed (e.g. `lightning.pytorch.seed_everything(sim_seed)` in WU-E,
  `torch.manual_seed(sim_seed)` in inference), and counter-based stateless hashes
  (e.g. the neural-ca matched PCG fire mask) key off `(coords, step, sim_seed)` so
  cross-stack runs draw identical streams.

The derivation is documented per sim so determinism claims are reproducible.

## Default tolerances per category

Mirrors spec § 6.2 and the established `tools/testkit/equivalence/tolerance.toml`
`[defaults.<category>]` values. Cross-stack / cross-variant comparison uses these
unless a sim's `equivalence.md` declares a tighter (never looser without an
operator-approved budget amendment) per-sim override.

| Category | Absolute | Relative | Norm |
|---|---|---|---|
| Physical sims (default) | 1e-4 | 1e-3 | L2 |
| Continuous-CA sims | 1e-6 | 1e-5 | L∞ |

Per-category defaults already wired in `tolerance.toml` (`closed_form` rel 1e-5;
`reaction-diffusion` / `sph` rel 1e-4; etc.) are the authoritative per-family
values; the table above is the two-bucket summary spec § 6.2 prescribes. Per-sim
overrides land in `docs/sim-specs/<category>/<sim>/equivalence.md`; the
`tolerance-budget.toml` caps (gated by WU-F's `assert_within_budget`, Cat-X
HARD_FAIL on over-budget) bound how loose any override may go (spec § 2.6).

---

## Provenance

Landed by Phase-4 WU-P (Stage 1, phase-4-plan § 7.1 / § 4.2.P). Docs-only; no API
surface, no failing-tests hash. Verified: markdown lint + `integrity --all`
(Cat 4 — no `path:line` assertions in this doc, passes trivially).
