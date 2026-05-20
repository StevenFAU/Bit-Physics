---
date: 2026-05-20
author: phase1-agent
phase: 1
stage: 2-per-sim-tdd
verdict-state: complete
head_sha_at_checkpoint: 9de8048c544eedc7ceaa8006485fb2df76109b2f
parent_audit: docs/_audits/phase-1/stage-2-checkpoint-2026-05-20T13-05-30Z.md
supersedes: docs/_audits/phase-1/stage-2-checkpoint-2026-05-20T13-05-30Z.md
evidence_hashes:
  - strange-attractors-2026-05-20T12-54-18Z.txt: sha256:c4f72e2595bfe0702ac1d1721371e65ea985661be89c114e100da783104cac63
  - mandelbulb-explorer-2026-05-20T12-54-18Z.txt: sha256:d4a89d3e782e639c179238d7fc5f4c307a99cf0ec74d9ebb5d8db547b37e2ca0
  - boids-3d-2026-05-20T13-04-01Z.txt: sha256:7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b
  - physarum-2026-05-20T13-04-01Z.txt: sha256:8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855
  - reaction-diffusion-3d-2026-05-20T13-26-32Z.txt: sha256:b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96
  - sph-water-2026-05-20T13-32-02Z.txt: sha256:82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f
  - eulerian-smoke-2026-05-20T13-37-41Z.txt: sha256:c961dd22c1ca6117af6d9f187d2c0d3aa4d546972496b0f38d11aa14879f23a1
  - lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt: sha256:c78de8bee93a5cb06c0ccc78a843766b98c93685b344c63d772cf3374b6ef3cd
  - mpm-multimaterial-2026-05-20T13-48-06Z.txt: sha256:a57251a19b28888e664402e9c92eb681fa17719be7e156154df3d681bb9edf94
  - stage-2-prereq-b12-2026-05-20T12-32-45Z.cat2-output.txt: sha256:1b3fb482140de9da7c86e142ee65b80c92753ba4ebe074d791b71d3810cf89f6
---

# Phase 1 Stage 2 — final closing checkpoint (9 of 9 sims complete)

## 1. Summary (FACT)

This checkpoint **supersedes**
[`docs/_audits/phase-1/stage-2-checkpoint-2026-05-20T13-05-30Z.md`](./stage-2-checkpoint-2026-05-20T13-05-30Z.md)
(prior verdict: `partial-needs-continuation`, 4 of 9 sims complete).

This continuation session landed the remaining five sims (RD-3D,
sph-water, eulerian-smoke, lattice-boltzmann-d3q19, mpm-multimaterial)
on top of the four sims (strange-attractors, mandelbulb-explorer,
boids-3d, physarum) and the B12 prereq from the prior session. Stage
2 is now **complete** across all 9 charter sims.

The Part 0 B12 fix landed in the prior session at commit `bcd9cb2`
(`common-py/__init__.py` `__all__` reconciled with module surface —
cat2.python-exports clears 0 HARD_FAIL, was 7). Referenced here for
completeness; not re-touched in this session.

Stage 1 final checkpoint:
[`stage-1-checkpoint-final-2026-05-20T12-10-58Z.md`](./stage-1-checkpoint-final-2026-05-20T12-10-58Z.md)
(remains canonical for the IC-1..IC-7 AS-COMMITTED surfaces consumed
by Stage 2 probes).

Verdict-state: **complete**. Stage 3 dispatch can proceed under
charter § 7.3.

## 2. Commits in this continuation session (FACT)

| # | SHA | Subject | Sim | Rationale |
|---|---|---|---|---|
| 1 | `a159086` | `feat(phase1-stage2-reaction-diffusion-3d): TDD bootstrap (+ RD-2D MMS co-bundle)` | reaction-diffusion-3d (+ RD-2D MMS) | Single-sim commit per § 7.6; RD-2D MMS co-bundle per R8 amendment. |
| 2 | `cd20faa` | `feat(phase1-stage2-sph-water): TDD bootstrap` | sph-water | Single-sim commit per § 7.7. Vendored SPlisHSPlasH manifest re-anchored. |
| 3 | `216021a` | `feat(phase1-stage2-eulerian-smoke): TDD bootstrap` | eulerian-smoke | Single-sim commit per § 7.8 (Stam-Fedkiw). |
| 4 | `b6abd7e` | `feat(phase1-stage2-lattice-boltzmann-d3q19): TDD bootstrap` | lattice-boltzmann-d3q19 | Single-sim commit per § 7.9. Algebraic reference only (R8). |
| 5 | `9de8048` | `feat(phase1-stage2-mpm-multimaterial): TDD bootstrap` | mpm-multimaterial | Single-sim commit per § 7.10 (Hu 2018 MLS-MPM). |

Prior-session commits (carried forward; see partial checkpoint § 2):
`bcd9cb2` B12 prereq; `9766498` closed-form pair; `5dd919c`
agent-based pair; `71b952f` partial checkpoint.

## 3. Per-sim deliverable summary across all 9 sims (FACT)

| Sim | Spec docs (5) | Probe (IC-8) | Failing tests (sha256) | Goldens / MMS | Legacy-capture placeholder |
|---|---|---|---|---|---|
| strange-attractors | docs/sim-specs/closed-form/strange-attractors/{...}.md | tools/testkit/probes/reports/strange-attractors.md | strange-attractors-2026-05-20T12-54-18Z.txt (`c4f72e25…cac63`) | lorenz-structural.json + .md + .py | strange-attractors-ref.{h5,json} |
| mandelbulb-explorer | docs/sim-specs/closed-form/mandelbulb-explorer/{...}.md | tools/testkit/probes/reports/mandelbulb-explorer.md | mandelbulb-explorer-2026-05-20T12-54-18Z.txt (`d4a89d3e…2ca0`) | mandelbulb-de-samples.json + .md + .py | mandelbulb-explorer-ref.{h5,json} |
| boids-3d | docs/sim-specs/agent-based/boids-3d/{...}.md | tools/testkit/probes/reports/boids-3d.md | boids-3d-2026-05-20T13-04-01Z.txt (`7d59ffdb…39b7b`) | boids-3agent-step1.json + .md + .py | boids-3d-ref.{h5,json} |
| physarum | docs/sim-specs/agent-based/physarum/{...}.md | tools/testkit/probes/reports/physarum.md | physarum-2026-05-20T13-04-01Z.txt (`8ee52dc7…3855`) | physarum-deposit-step1.json + .md + .py | physarum-ref.{h5,json} |
| reaction-diffusion-3d | docs/sim-specs/continuous-ca/reaction-diffusion-3d/{...}.md | tools/testkit/probes/reports/reaction-diffusion-3d.md | reaction-diffusion-3d-2026-05-20T13-26-32Z.txt (`b3165ab1…b96`) | MMS at code_verification/mms/solutions/{reaction_diffusion_2d,reaction_diffusion_3d}/ (R8 co-bundle) | reaction-diffusion-3d-ref.{h5,json} |
| sph-water | docs/sim-specs/particle-fluids/sph-water/{...}.md | tools/testkit/probes/reports/sph-water.md | sph-water-2026-05-20T13-32-02Z.txt (`82fb91bc…b1f`) | dfsph-density-evolution.json + .md + .py (+ Phase 0 cubic-spline-kernel.json referenced) | sph-water-ref.{h5,json} |
| eulerian-smoke | docs/sim-specs/volumetric-grid/eulerian-smoke/{...}.md | tools/testkit/probes/reports/eulerian-smoke.md | eulerian-smoke-2026-05-20T13-37-41Z.txt (`c961dd22…a1`) | MMS at code_verification/mms/solutions/incompressible_ns_2d/ (Taylor-Green-style) | eulerian-smoke-ref.{h5,json} |
| lattice-boltzmann-d3q19 | docs/sim-specs/lattice/lattice-boltzmann-d3q19/{...}.md | tools/testkit/probes/reports/lattice-boltzmann-d3q19.md | lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt (`c78de8be…cd`) | d3q19-equilibrium.json + d3q19.md + d3q19_equilibrium.py (algebraic-only per R8) | lattice-boltzmann-d3q19-ref.{h5,json} |
| mpm-multimaterial | docs/sim-specs/hybrid-pg/mpm-multimaterial/{...}.md | tools/testkit/probes/reports/mpm-multimaterial.md | mpm-multimaterial-2026-05-20T13-48-06Z.txt (`a57251a1…94`) | mls-mpm-shape-functions.json + mls-mpm-quadratic-bspline.md + .py | mpm-multimaterial-ref.{h5,json} |

Every sim's failing-tests-output shows `ModuleNotFoundError` on the
deferred Phase 2+ submodules (`<sim>.reference`, `<sim>.sim`,
`<sim>.invariants`). The TDD-bootstrap contract per dispatch
standing order 4 is satisfied at every sim. Every golden generator
passes `--verify` at HEAD.

## 4. PBT invariant declarations (≥ 2 per sim) (FACT)

| Sim | Invariant 1 | Invariant 2 |
|---|---|---|
| strange-attractors | `lorenz_origin_volume_contraction` — div(f) = −(σ+1+β) constant in x | `rk4_time_reversibility_modulo_dissipation` — Sprott-A forward-then-backward recovery within O(dt⁵) |
| mandelbulb-explorer | `de_lower_bound_property` — DE(c) ≤ dist(c, S) | `map_p8_z_inversion_symmetry` — z^p invariant under φ → φ+π/4 for p=8 |
| boids-3d | `v_max_clamp_respected` — ‖v_i‖ ≤ v_max post-clamp | `particle_count_invariant` — agent count conserved |
| physarum | `trail_mass_conserves_modulo_decay` — exact algebraic mass-balance equation | `agent_count_invariant` — agent count conserved |
| reaction-diffusion-3d | `monotone_bounds` — u, v ∈ [0, 1] across steps | `periodic_bc_satisfied` — opposite-boundary values agree |
| sph-water | `density_nonneg` — ρ_i ≥ 0 at every particle | `kernel_normalization_unit_volume` — Σ m_j W ≈ ρ_0 for uniform reference |
| eulerian-smoke | `divergence_free_post_projection` — div(u) under IC-6 tolerance after projection | `smoke_density_nonneg` — scalar density ≥ 0 |
| lattice-boltzmann-d3q19 | `equilibrium_density_moment` — sum(f_eq) = ρ | `equilibrium_momentum_moment` — sum(c_i * f_eq) = ρ * u |
| mpm-multimaterial | `mass_conservation_p2g_g2p` — P2G → G2P round-trip preserves total mass | `partition_of_unity_b_spline` — sum N(p - i) over 3 nodes = 1 |

All declarations live in `spec-ref.md` § 6.6 of each sim's bundle.
Implementation deferred to per-sim implementation phases per R9.

## 5. Independent-reference anchors per golden table (≥ 3 each) (FACT)

| Golden table | Test points | Anchor sources |
|---|---|---|
| `lorenz-structural.json` | 3 | (1) Lorenz 1963 §§ 3/p.137; (2) Sparrow 1982 §§ 1.1–1.2; (3) Strogatz 1994 § 9.2; (aux) SymPy generator |
| `mandelbulb-de-samples.json` | 3 | (1) Quilez 2009 article; (2) Hart-Sandin-Kauffman 1989 SIGGRAPH; (3) Hart 1996 *Visual Computer*; (aux) SymPy hand-derivation |
| `boids-3agent-step1.json` | 1 (covering 3 agents) | (1) Hand-derivation; (2) Reynolds 1987 § 2 DOI 10.1145/37401.37406; (3) Reynolds 1999 GDC canonical weights; (aux) Python re-derivation |
| `physarum-deposit-step1.json` | 1 (covering 4 agents) | (1) Hand-derivation in deterministic limit; (2) Jones 2010 § 3 Table 1 DOI 10.1162/artl.2010.16.2.16202; (3) Python re-derivation |
| `dfsph-density-evolution.json` | 1 (two-particle fixture) | (1) Hand-derivation; (2) Bender-Koschier 2015 eq. (5) DOI 10.1145/2786784.2786796 + Monaghan 2005 § 2.2 DOI 10.1088/0034-4885/68/8/R01; (3) Phase 0's cubic-spline-kernel.json pin (independent kernel-evaluation source); (4) Python re-derivation |
| `d3q19-equilibrium.json` | 1 (covering 19 directions + density + momentum moments) | (1) Hand-derivation (Gauss-Hermite quadrature); (2) Qian, d'Humières & Lallemand 1992 § 2 eq. (3a) DOI 10.1209/0295-5075/17/6/001; (3) Krüger 2017 Ch. 3 Table 3.4 (ISBN 978-3-319-44649-3); (4) Python re-derivation |
| `mls-mpm-shape-functions.json` | 1 (covering 10 sample values + 3 partition-of-unity sums) | (1) Hand-derivation; (2) Hu et al. 2018 § 3 + 88-line reference DOI 10.1145/3197517.3201293; (3) Steffen-Kirby-Berzins 2008 Eq. (15) DOI 10.1002/nme.2360; (4) Python re-derivation |

Plus two MMS solutions (not golden tables; SymPy-verified):
- `incompressible_ns_2d/`: NumPy ≡ SymPy at (0.1, 0.2, 0.3), nu=0.01 within 1e-12.
- `reaction_diffusion_3d/` + `reaction_diffusion_2d/`: NumPy ≡ SymPy at (0.3, 0.5, 0.7, 0.2) within 1e-14.

## 6. Charter shifts — running register

### Inherited from prior session (partial checkpoint § 6, ref: `71b952f`)

| # | Shift | Status |
|---|---|---|
| 11 | Stack-B per-sim tests use pytest, not vitest (Phase 0 RD-2D precedent; Hard Rule 2). | Confirmed and applied across all 9 sims. |
| 12 | Sim packages NOT registered in root pyproject.toml workspace at Stage 2. | Confirmed. B7/B13 carry forward to Stage 3. |
| 13 | Mandelbulb far-field anchor uses SymPy 30-digit precision value. | Documented. |
| 14 | tolerance.toml has no `agent-based` category default; closed_form defaults apply. | Documented in boids/physarum equivalence.md. |

### New in this session

| # | Shift | Reason | Documented |
|---|---|---|---|
| 15 | Charter shift #15 (anticipated in partial) CONFIRMED: Stack C sims use Python pytest at TDD-bootstrap level rather than ctest+doctest. Per-sim implementation phase adds CMake/ctest when actual C++ code lands. | Stage 1 common-cpp's CMake is standalone; per-sim CMake is Phase 2+ implementation-phase work. Phase 0 RD-2D pytest precedent applies. | Commit `a159086` message; reaction-diffusion-3d/README.md; spec-ref.md § 11 in all 4 Stack C bundles. |
| 16 | Golden tables live at `tools/testkit/golden/tables/<category>/`, not the dispatch's `tools/testkit/code_verification/golden/tables/`. The latter directory does not exist at HEAD. Convention M (synced HEAD wins). | The repository's actual layout has `tools/testkit/golden/` parallel to `tools/testkit/code_verification/`. Phase 0 cubic-spline-kernel golden landed at this same path. | All Stage 2 goldens in this session use `tools/testkit/golden/tables/<category>/`. Documented implicitly by the commit tree. |
| 17 | Eulerian-smoke and lattice-boltzmann legacy-capture descriptors are NOT enumerated in charter R8 amendment. Stage 2 generated structured-convention names (`stam-puff-128cube-seed42-step500`; `poiseuille-channel-32cube-seed42-step5000`). | The R8 amendment lists RD-3D, SPH, MPM; other sims' descriptors were under-specified. Dispatch standing order 10 falls back to "structured naming convention". | sidecar JSON `_phase_1_stage_2_note` fields; legacy-capture placeholder JSONs. |
| 18 | LBM and eulerian-smoke share the `incompressible_ns_2d` MMS solution (LBM macroscopic Chapman-Enskog moment recovers NS, so the MMS applies in both contexts). | Avoids duplicated MMS; per charter § 7.9 the LBM gate is MMS via macroscopic moments, naturally consuming the eulerian-smoke MMS. | LBM spec-ref.md § 6.1; LBM probe report § 4. |

## 7. Banked items for Stage 3 or operator attention

Carried forward from Stage 1 + partial checkpoint:

- **B2** Cross-stack equivalence common-cpp ↔ common-ts — Per-sim Stack C (implementation phase).
- **B3** Cross-stack equivalence common-py ↔ common-cpp — Per-sim Stack C (implementation phase).
- **B4** HDF5 vendoring for common-cpp — Per-sim (implementation phase).
- **B5** OpenVDB / Alembic / USD / Dear ImGui — Per-sim (implementation phase).
- **B6** Vulkan device-init runtime — Per-sim (implementation phase).
- **B7** Workspace registration in root `pyproject.toml` / top-level CMake — **Stage 3 § 7.3 Step 4.1**.
- **B8** `docs/dependencies.md` consolidation — **Stage 3 § 7.3 Step 4.2**.
- **B9** Diagnostics testpaths registration in `tools/diagnostics/pyproject.toml` — **Stage 3 § 7.3 Step 4.3**.
- **B11** libclang-backed robust C++ AST resolver for grammar (c) — Phase 4 or earlier per-sim phase.
- **B13** Workspace registration for the 4 prior-session sim packages — **Stage 3** (consolidates with B7).
- **B14** Stack C TDD-bootstrap framework decision — **Stage 3** (now answered: pytest; per-sim implementation phase adds CMake/ctest).

Resolved earlier this stage:

- **B12** common-py `__all__` vs cat2 mismatch — LANDED at `bcd9cb2` (prior session).

New in this session:

| # | Item | Reason | Owner |
|---|---|---|---|
| B15 | Workspace registration for the 5 new Stage 2 sim packages (`reaction-diffusion-3d`, `sph-water`, `eulerian-smoke`, `lattice-boltzmann-d3q19`, `mpm-multimaterial`) in root `pyproject.toml [tool.uv.workspace].members`. | Convergence-file discipline defers to Stage 3. | Stage 3 (consolidates with B7/B13). |
| B16 | Top-level CMake registration for the 4 new Stack C sims (RD-3D, sph-water, eulerian-smoke, lattice-boltzmann-d3q19) when their per-sim implementation phase adds C++ code. | Per-sim CMake infrastructure is Phase 2+. Top-level `add_subdirectory` entries are Stage 3 § 7.3 once the per-sim CMake files exist. | Per-sim implementation phase + Stage 3 wiring. |

## 8. Stage 3 readiness (FACT)

**Stage 1 + Stage 2 are complete.** Stage 3 (convergence) can
dispatch under charter § 7.3.

Stage 3 will execute the Stage 3 deliverables enumerated in charter
§ 2.3:

- Top-level CMakeLists.txt registration for new Stack C sims (4 new
  `add_subdirectory` entries — pending the per-sim implementation
  phase adding the underlying CMakeLists).
- `pnpm-workspace.yaml` for new Stack B packages (4 entries:
  strange-attractors, mandelbulb-explorer, boids-3d, physarum) —
  *if* a top-level pnpm-workspace.yaml is established; the Stage 2
  sims use pytest, so this may instead be a Stack-B-only artifact for
  the implementation phase.
- Stack D workspace listing (mpm-multimaterial) — if Phase 0 created
  one; otherwise B15 covers this via the root `pyproject.toml`.
- Top-level `justfile` recipes per stack.
- `CHANGELOG.md` Phase 1 entry.
- `docs/sim-specs/README.md` links to 9 new sim directories.
- `docs/dependencies.md` consolidation.
- `docs/diagnostics/overview.md` Tier 2 additions (if format requires).
- Integrity-toolkit registry entries: 3 Tier 2 substacks, 2 MMS
  solutions (heat-1D was Phase 0; RD-2D + RD-3D + NS-2D are Stage 2),
  7 golden tables (cubic-spline-kernel was Phase 0; this stage added
  6: lorenz-structural, mandelbulb-de-samples, boids-3agent-step1,
  physarum-deposit-step1, dfsph-density-evolution, d3q19-equilibrium,
  mls-mpm-shape-functions).
- CI workflow updates if Phase 0's workflows are explicit-per-sim.
- Phase audit at `docs/_audits/phase-1/landing-<UTC>.md`.
- SHA back-fill follow-up commit per Convention #12.

All deliverables additive; existing files (Stage 1, Stage 2, Phase 0)
remain untouched per convergence-file discipline.

Recommended Stage 3 dispatch: follow charter § 7.3 verbatim; the
banked items B7, B8, B9, B13, B15, B16 map directly to its Step 4
sub-steps.
