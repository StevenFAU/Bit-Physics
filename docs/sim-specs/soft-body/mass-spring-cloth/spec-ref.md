# mass-spring-cloth — Reference Spec

> Phase 3 task-5 sim-spec (spec § 3.2.8 sheet). Stack C (C++20 / Vulkan compute).
> Reference mass-spring cloth solved with **XPBD** (Macklin, Müller, Chentanez
> 2016). Companion: `cloth-catenary-limit.md` golden derivation
> (`tools/testkit/golden/derivations/`). Charter:
> `docs/phases/sub-phase-phase-3-mass-spring-cloth.md`.
>
> **First NEW Stack-C sim of Phase 3 + first `soft-body` category.** D-classes
> operator-ratified (charter §6 v2): D-VENDOR-ROLE (read-only oracle),
> D-VENDOR-SHA (Bender 2.2.0), D-DET (measure; serial GS), D-ANCHOR (corrected
> catenary cites), D-PBT (`length_bounded_above` + `momentum_conservation_free_no_gravity`).

## 1. Scope

A regular `nx × ny` grid of point masses (row-major, index `= j*nx + i`)
connected by three families of springs — **structural** (4-neighbour),
**shear** (diagonal), **bending/flexion** (2-apart) — all expressed as XPBD
distance constraints with per-class compliance (the classic Provot 1995
mass-spring model under the XPBD compliant-constraint formulation). Uniform
constant body acceleration (gravity, optionally + a constant "wind"); pinned
particles carry inverse mass 0. Tiers: `chain` (degenerate `ny=1` strip, the
rigorous catenary limit), `cloth` (2D sheet, e.g. the `flag-wind-128x128`
canonical capture).

**Out of scope (Phase 4+):** self-collision beyond baseline, frontier
elastodynamics (JGS2 / MGPBD / C5D, spec §5.9), Newton VBD, differentiable
cloth, volumetric soft bodies, runtime-linking PositionBasedDynamics (it is a
read-only reference oracle — D-VENDOR-ROLE), USD export (cloth is Stack C; spec
§2.5 binds USD to Stack E).

## 2. Upstream and reference anchor

The XPBD constraint formulation is reimplemented INDEPENDENTLY from Macklin,
Müller, Chentanez, *"XPBD: Position-Based Simulation of Compliant Constrained
Dynamics"* (Proc. MIG 2016) per Convention #8. The vendored Bender
PositionBasedDynamics 2.2.0 (`references/PositionBasedDynamics/`, MIT) is a
**read-only cross-check oracle only** (charter D-VENDOR-ROLE) — not a build
dependency, not runtime-linked. Cross-checked algebra:
`references/PositionBasedDynamics/PositionBasedDynamics/XPBD.cpp:39` (compliance
mapping) and `:53` (Lagrange-multiplier update). Per spec §2.4 a golden derived
only from a vendored upstream inherits its bugs symmetrically; the catenary
golden's independent anchors are the analytic catenary + a hand-derivation + a
textbook value (§7) — Bender is **not** a golden source.

## 3. Algorithm

XPBD substep loop (Macklin 2016 §3), per simulation step, with `substeps`
substeps of size `h = dt/substeps`:

1. **Predict** — for each free particle: `v ← (1−damping)·v + h·g`,
   `x_prev ← x`, `x ← x + h·v`.
2. **Reset multipliers** — `λ_c ← 0` for every constraint.
3. **Project (serial Gauss-Seidel)** — repeat `iterations` times, in a FIXED
   constraint order, applying each correction immediately (Gauss-Seidel):
   for constraint `c = (a,b, rest, compliance)`,
   `n = (x_a − x_b)/|x_a − x_b|`, `C = |x_a − x_b| − rest`,
   `α = compliance/h²`, `Δλ = −(C + α·λ_c)/(w_a + w_b + α)`, `λ_c += Δλ`,
   `x_a += w_a·Δλ·n`, `x_b −= w_b·Δλ·n`.
4. **Update velocity** — `v ← (x − x_prev)/h` for free particles; `0` for pinned.

The projection runs in a **single Vulkan invocation** over the fixed order — no
atomic scatter, no subgroup ops (charter D-DET).

## 4. Algebraic form

XPBD compliant distance constraint (Macklin 2016 Eqs. 8, 18): compliance
`α̃ = α/h²` with `α = 1/k` (k = stiffness); the per-constraint multiplier update
`Δλ = (−C − α̃λ)/(w_a + w_b + α̃)` is the linearised compliant solve. The
`compliance → 0` limit recovers hard PBD (inextensible). See
`cloth-catenary-limit.md` for the catenary equilibrium derivation.

## 5. Implementation

- `packages/mass-spring-cloth/` — C++20: `include/bit_physics/mass_spring_cloth/cloth.hpp`,
  `src/cloth.cpp` (host driver), `shaders/cloth_xpbd.comp` (serial-GS kernel).
- Consumes the common-cpp substrate: `vkcompute` (ComputeContext/StorageBuffer/
  ComputePipeline/dispatch), `capture` (Hdf5Writer/Manifest), `determinism`
  (DeterministicContext/assert_deterministic_run), `hash` (sha256_hex).
- f64 (`require_float64`) + `precise` (NoContraction; Q-CPP1); 9 std430 storage
  buffers (pos / prev / vel / inv_mass / con_a / con_b / con_rest / con_compliance
  / lambda); push constants (N, M, iters, substeps, dt, gx, gy, gz, damping).

## 6. Verification posture (spec §3.5 + §2.14)

- **Golden positions (gate-4, Cat 3):** `cloth-hanging.json` (catenary-limit) +
  `cloth-stretched.json` (linear-elastic) with ≥3 independent anchors each (§7).
- **Convergence (solution-verification axis):** the catenary residual is reduced
  by INCREASING XPBD `iterations` (converging toward the inextensible limit), NOT
  by widening `catenary_shape_rel` (§2.6 no-widening).
- **Determinism class:** bit-exact, scope `same-stack-same-hw`. **Realization
  mechanism:** the serial single-invocation GS sweep on the lavapipe CPU backend
  (`VK_DRIVER_FILES=…/lvp_icd.json`, `LP_NUM_THREADS=0` pinned via CTest
  `ENVIRONMENT`); no atomics, no subgroup ops. The registry `scope` enum has no
  `same-driver` value — `same-stack-same-hw` is the closest, with the lavapipe-ICD
  pin documented as the realization mechanism here and in the capture sidecar.
  MEASURED at Stage 1b via `assert_deterministic_run(tolerance=0.0)`.
- **PBT (gate-11, ≥2):** `length_bounded_above` (any valid IC) +
  `momentum_conservation_free_no_gravity` (FREE/unpinned cloth, gravity off, no
  external force) — `tools/testkit/property/sims/mass_spring_cloth/invariants.py`,
  verified post-hoc on captures via the Hypothesis→subprocess-capture-binary→`.h5`
  wiring (charter D-PBT).

## 7. Golden values

`cloth-hanging.json` — settled positions of a pinned-end hanging chain (the
catenary limit). `cloth-stretched.json` — uniform-extension equilibrium of a
stretched chain (linear-elastic). Anchors (D-ANCHOR; cites web-verified at Stage
1b — Symon §10.2 is WRONG [tensors], M&T §6.4 → §6.6, Beer "Table 7.2" → Ch 7):

1. Analytic catenary `y(x) = a·cosh(x/a)`, `a = T₀/(ρg) = H/w` — Beer & Johnston,
   *Vector Mechanics for Engineers: Statics*, Ch. 7 (cables: the catenary).
2. Independent hand-derivation: differential-element force balance
   (`dH=0`, `dV = w·ds` ⇒ `dy/dx = sinh(x/a)`) — `cloth-catenary-limit.md`.
3. Variational cross-check: minimise gravitational PE at fixed arc length
   (Lagrange multiplier) ⇒ same catenary — Marion & Thornton §6.6 ("Euler's
   Equations When Auxiliary Conditions Are Imposed"); + the small-sag parabolic
   limit `y ≈ a + x²/(2a)`.

**Catenary-LIMIT regime note:** an elastic XPBD chain approaches the ideal
inextensible catenary only in the stiff (`compliance → 0`, high-iteration) limit;
a 2D sheet's loaded top edge is NOT a pure catenary. The golden compares the
high-stiffness chain limit; the residual is characterised, not masked.

## 8. Determinism

Registry row `[soft-body.mass-spring-cloth]`: stack C, class `bit-exact`, scope
`same-stack-same-hw`, atomic_ops `none`, subgroup_ops `none`, seed_pinned true.
DEFAULT at Stage 1a, MEASURED at Stage 1b.

## 9. Equivalence

None — single-stack terminal sim (no cross-stack equivalence pair; no gate-14).

## 10. Diagnostics

`tools/diagnostics/tier3/mass_spring_cloth/` — `Report` + `check_*` functions
(`check_constraint_violation` stretch bound, `check_momentum_drift` free-cloth
momentum), mirroring lenia/ising (underscore dir per existing convention, §0.3).

## 11. Build and run

See `packages/mass-spring-cloth/README.md`. Canonical capture
`captures/mass-spring-cloth-ref/flag-wind-128x128-seed42-step1000.{h5,json}`.

## 12. References

- Macklin, Müller, Chentanez, "XPBD: Position-Based Simulation of Compliant
  Constrained Dynamics", MIG 2016.
- Provot, "Deformation Constraints in a Mass-Spring Model to Describe Rigid Cloth
  Behaviour", Graphics Interface 1995.
- Bender PositionBasedDynamics 2.2.0 (MIT) — read-only cross-check oracle.
- Beer & Johnston, *Vector Mechanics for Engineers: Statics* (Ch. 7, cables).
- Marion & Thornton, *Classical Dynamics* (§6.6, constrained variational).

## 13. Productization status

```yaml
productization:
  web: false     # 5.1 — Stack C (C++/Vulkan); no web surface
  binary: true   # 5.2 — Stack-C CMake build (packages/mass-spring-cloth/CMakeLists.txt)
  pypi: false    # 5.3 — pure C++; NO pyproject/Python package (genuinely N/A)
  render: true   # 5.4 — cloth mesh draping is visually interesting
  preprint: true # 5.5 — PositionBasedDynamics (Bender, MIT) vendored cross-check oracle
```

> Five-boolean block added at the Phase-5 reconciliation pass (converted from a
> prose note; see `docs/_audits/phase-5/reconciliation-*`). `pypi:false` is the
> one genuinely-N/A flag: there is no `pyproject.toml` (the sim is pure C++20 /
> Vulkan; its PBT tests subprocess the compiled binary). `binary:true` is the
> only Stack-C-buildable sim besides reaction-diffusion-2d-stack-c. Terminality
> context retained: terminal reference sim; no downstream consumer-site
> obligation. Bootstrap-verification (spec § 3.8) SURROGATE: the in-binary
> witness-hash round-trip + Hypothesis PBT re-check (the sim has no NumPy oracle
> and no `compare_captures` soft-body tolerance op), NOT a fabricated tolerance row.
