---
date: 2026-05-20
author: phase1-agent
phase: 1
stage: 2-per-sim-tdd
verdict-state: partial-needs-continuation
head_sha_at_checkpoint: 5dd919ca498c638362251e1dc4fedc637c6bcaa7
parent_audit: docs/_audits/phase-1/stage-1-checkpoint-final-2026-05-20T12-10-58Z.md
evidence_hashes:
  - strange-attractors-2026-05-20T12-54-18Z.txt: sha256:c4f72e2595bfe0702ac1d1721371e65ea985661be89c114e100da783104cac63
  - mandelbulb-explorer-2026-05-20T12-54-18Z.txt: sha256:d4a89d3e782e639c179238d7fc5f4c307a99cf0ec74d9ebb5d8db547b37e2ca0
  - boids-3d-2026-05-20T13-04-01Z.txt: sha256:7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b
  - physarum-2026-05-20T13-04-01Z.txt: sha256:8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855
  - stage-2-prereq-b12-2026-05-20T12-32-45Z.cat2-output.txt: sha256:1b3fb482140de9da7c86e142ee65b80c92753ba4ebe074d791b71d3810cf89f6
---

# Phase 1 Stage 2 — partial checkpoint (4 of 9 sims complete)

## 1. Summary (FACT)

This session **opened** Stage 2 after landing the dispatch's Part 0
B12 prerequisite. Four of the nine Stage 2 sims are committed clean
(closed-form pair + agent-based pair, charter § 4.3 order #1–4).
Verdict-state is **`partial-needs-continuation`**: a follow-up
session needs to land the remaining five sims (RD-3D, sph-water,
eulerian-smoke, lattice-boltzmann-d3q19, mpm-multimaterial) plus
the closing checkpoint.

The agent halted at this checkpoint rather than risk a partial,
context-truncated sim mid-flight. Per dispatch standing order 9
and charter § 5.3 ("Stage 2 likely needs 3–7 sessions total").

## 2. Commits in this stage (FACT)

| # | SHA | Subject | Sim(s) | Files | Rationale |
|---|---|---|---|---|---|
| 1 | `bcd9cb2` | `fix(phase1-stage2-prereq-b12): align common-py __init__.py with module surface` | (prereq) | 2 | Part 0 / B12 — added `from . import alembic, capture, determinism, ggui, hotreload, plotting, vdb` so cat2.python-exports clears (0 HARD_FAIL, was 7). Confirms Stage 3 failing-tests gate baseline. |
| 2 | `9766498` | `feat(phase1-stage2-closed-form): TDD bootstrap for strange-attractors + mandelbulb-explorer` | strange-attractors, mandelbulb-explorer | 42 | Pair commit per charter § 7.4. |
| 3 | `5dd919c` | `feat(phase1-stage2-agent-based): TDD bootstrap for boids-3d + physarum` | boids-3d, physarum | 42 | Pair commit per charter § 7.5. |

## 3. Per-sim deliverable summary (FACT)

| Sim | Spec docs | Probe (IC-8) | Failing tests (sha256) | Goldens / MMS | Legacy-capture placeholder |
|---|---|---|---|---|---|
| strange-attractors | docs/sim-specs/closed-form/strange-attractors/{README,spec-ref,algebraic,determinism,equivalence}.md | tools/testkit/probes/reports/strange-attractors.md | strange-attractors-2026-05-20T12-54-18Z.txt (sha256:c4f72e25…cac63) | tools/testkit/golden/{tables/closed-form/lorenz-structural.json, derivations/lorenz-structural.md, generator/lorenz_structural.py} | tests/fixtures/legacy-captures/strange-attractors-ref.{h5,json} |
| mandelbulb-explorer | docs/sim-specs/closed-form/mandelbulb-explorer/{...}.md (5 files) | tools/testkit/probes/reports/mandelbulb-explorer.md | mandelbulb-explorer-2026-05-20T12-54-18Z.txt (sha256:d4a89d3e…2ca0) | tools/testkit/golden/{tables/closed-form/mandelbulb-de-samples.json, derivations/mandelbulb-de-samples.md, generator/mandelbulb_de_samples.py} | tests/fixtures/legacy-captures/mandelbulb-explorer-ref.{h5,json} |
| boids-3d | docs/sim-specs/agent-based/boids-3d/{...}.md (5 files) | tools/testkit/probes/reports/boids-3d.md | boids-3d-2026-05-20T13-04-01Z.txt (sha256:7d59ffdb…39b7b) | tools/testkit/golden/{tables/agent-based/boids-3agent-step1.json, derivations/boids-3agent-step1.md, generator/boids_3agent_step1.py} | tests/fixtures/legacy-captures/boids-3d-ref.{h5,json} |
| physarum | docs/sim-specs/agent-based/physarum/{...}.md (5 files) | tools/testkit/probes/reports/physarum.md | physarum-2026-05-20T13-04-01Z.txt (sha256:8ee52dc7…3855) | tools/testkit/golden/{tables/agent-based/physarum-deposit-step1.json, derivations/physarum-deposit-step1.md, generator/physarum_deposit_step1.py} | tests/fixtures/legacy-captures/physarum-ref.{h5,json} |

Each failing-tests-output file shows `ModuleNotFoundError` on the
deferred Phase 2+ submodules (`<sim>.reference`, `<sim>.sim`,
`<sim>.invariants`). The TDD-bootstrap contract per dispatch
standing order 4 is satisfied.

### Remaining sims (5 of 9; for the continuation session)

| Sim | Charter § | Estimated effort | Notes for continuation |
|---|---|---|---|
| reaction-diffusion-3d | § 7.6 | Single-sim commit. MMS solution at `tools/testkit/code_verification/mms/solutions/reaction-diffusion-3d/` plus the RD-2D MMS co-bundle (R8 amendment). | The Phase 0 heat-1D MMS at `tools/testkit/code_verification/mms/solutions/heat_1d/` is the template (SymPy-derive source term + derivation.md). |
| sph-water | § 7.7 | Single-sim commit. Phase 0 vendored SPlisHSPlasH at `references/SPlisHSPlasH/`. New DFSPH density-evolution golden at `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`. Phase 0's `cubic-spline-kernel.json` is the schema template; **do not re-derive**. | Re-anchor cited manifest paths from the live vendoring (playbook P4). |
| eulerian-smoke | § 7.8 | Single-sim commit. Incompressible-NS MMS at `tools/testkit/code_verification/mms/solutions/incompressible-ns-2d/` (Taylor-Green vortex). | SymPy-derive source for the projected NS step. |
| lattice-boltzmann-d3q19 | § 7.9 | Single-sim commit. D3Q19 equilibrium golden at `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`; derivation at `tools/testkit/golden/derivations/d3q19.md`. **Algebraic-only**; R8 amendment forbids Krüger vendoring. | Verify Krüger 2017 was not vendored at HEAD before declaring algebraic-only. |
| mpm-multimaterial | § 7.10 | Single-sim commit. MLS-MPM quadratic-B-spline weights golden at `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`; derivation at `tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`. Stack D Taichi. | Spec § 4.4 Taichi limitations to document in spec-ref.md § 11. |

## 4. PBT invariant declarations (≥ 2 per sim) (FACT)

Declared per spec § 6.6 of each sim's `spec-ref.md`. Implementation
is deferred to per-sim implementation phase per R9 amendment.

| Sim | Invariant 1 | Invariant 2 |
|---|---|---|
| strange-attractors | `lorenz_origin_volume_contraction` — div(f) = −(σ+1+β) = −41/3 constant in x | `rk4_time_reversibility_modulo_dissipation` — forward-then-backward Sprott-A trajectory recovers IC within O(dt⁵) |
| mandelbulb-explorer | `de_lower_bound_property` — DE(c) ≤ dist(c, S) | `map_p8_z_inversion_symmetry` — z^p invariant under φ → φ+π/4 for p=8 |
| boids-3d | `v_max_clamp_respected` — ‖v_i‖ ≤ v_max post-clamp | `particle_count_invariant` — agent count conserved across steps |
| physarum | `trail_mass_conserves_modulo_decay` — exact algebraic mass-balance equation | `agent_count_invariant` — agent count conserved |

## 5. Independent-reference anchors per golden table (≥ 3 each) (FACT)

| Golden table | Test points | Anchor sources |
|---|---|---|
| `lorenz-structural.json` | 3 (fixed points; origin Jacobian eigenvalues; divergence) | (1) Lorenz 1963 §§ 3, p. 137; (2) Sparrow 1982 §§ 1.1–1.2; (3) Strogatz 1994 § 9.2; (aux) SymPy generator |
| `mandelbulb-de-samples.json` | 3 (origin; bounding-sphere x-axis; far-field x-axis) | (1) Quilez 2009 article; (2) Hart-Sandin-Kauffman 1989 SIGGRAPH; (3) Hart 1996 VC; (aux) SymPy hand-derivation |
| `boids-3agent-step1.json` | 1 test point covering 3-agent-step1-canonical (all 3 agents) | (1) Hand-derivation; (2) Reynolds 1987 § 2 (DOI 10.1145/37401.37406); (3) Reynolds 1999 (GDC notes — canonical weights); (aux) Python re-derivation |
| `physarum-deposit-step1.json` | 1 test point covering 4-agent-zero-trail-cardinal-headings | (1) Hand-derivation in deterministic limit; (2) Jones 2010 § 3 Table 1; (3) Python re-derivation |

## 6. Charter shifts surfaced this session (FACT)

| # | Shift | Reason | Documented in |
|---|---|---|---|
| 11 | Stack-B per-sim tests use pytest, not vitest. | Phase 0 RD-2D at `packages/reaction-diffusion-2d/tests/` is pytest (the WebGPU/TS code in `src/` is local-only; tests live in Python). Hard Rule 2 — Phase 0 layout wins. | Commit `9766498` message; closed-form & agent-based spec-ref §§ 11. |
| 12 | Stage 2 sim packages are NOT registered in the root `pyproject.toml` workspace at this stage. Convergence-file discipline (B7) defers workspace registration to Stage 3. Tests run via `(cd packages/<sim> && PYTHONPATH=. python3 -m pytest tests/ -v)`. | Spec § R5 — convergence files concentrated in Stage 3. | Each `packages/<sim>/README.md` documents the invocation. |
| 13 | Mandelbulb far-field anchor uses SymPy 30-digit precision value (11.512925464970229), not Python-f64 (11.512925321058724). The latter accumulates rounding error in intermediate quantities. | f64 vs higher-precision symbolic — the SymPy value is the higher-fidelity reference; the f64 artifact is documented as a cross-check. | `derivations/mandelbulb-de-samples.md` § 3; commit `9766498` message. |
| 14 | Phase 0's `tolerance.toml` has no `agent-based` category default. The boids-3d 3-agent fixture and the physarum deposit-step golden consume the `closed_form` default. | Phase 0 design choice; the closed-form arithmetic in the canonical fixtures justifies it. | `equivalence.md` for boids-3d and physarum. |
| 15 (anticipated) | The continuation session for Stack C sims (RD-3D, sph-water, eulerian-smoke, lattice-boltzmann) may need to use pytest at `packages/<sim>/tests/` rather than `ctest` because per-sim CMake test infrastructure does not yet exist (Stage 1 common-cpp's CMake is standalone; per-sim CMake is Phase 2+ implementation-phase work). | Phase 0 RD-2D's pytest-on-Stack-B precedent suggests Stack C sims can also use pytest at TDD-bootstrap level; the Phase 2+ implementation phase adds C++ build infrastructure when actual C++ code lands. | To be confirmed in the continuation session; not a hard ruling yet. |

## 7. Banked items for Stage 3 or operator attention

Carried forward from Stage 1's banked list (still open):

- **B2** Cross-stack equivalence common-cpp ↔ common-ts — Per-sim Stack C.
- **B3** Cross-stack equivalence common-py ↔ common-cpp — Per-sim Stack C.
- **B4** HDF5 vendoring for common-cpp — Per-sim.
- **B5** OpenVDB / Alembic / USD / Dear ImGui — Per-sim.
- **B6** Vulkan device-init runtime — Per-sim.
- **B7** Workspace registration in root `pyproject.toml` / top-level CMake — Stage 3.
- **B8** `docs/dependencies.md` consolidation — Stage 3.
- **B9** Diagnostics testpaths registration in `tools/diagnostics/pyproject.toml` — Stage 3.
- **B11** libclang-backed robust C++ AST resolver for grammar (c) — Phase 4 or earlier per-sim phase.

Resolved this session:
- **B12** common-py `__all__` vs cat2 mismatch — LANDED at commit `bcd9cb2`. REMOVE from banked list.

New in this session:

| # | Item | Reason | Owner |
|---|---|---|---|
| B13 | Workspace registration for the four new Stage 2 sim packages (`strange-attractors`, `mandelbulb-explorer`, `boids-3d`, `physarum`) in root `pyproject.toml [tool.uv.workspace].members`. | Convergence-file discipline (B7) defers workspace edits to Stage 3. The packages are currently runnable only via `PYTHONPATH=. python3 -m pytest`. | Stage 3 (consolidates with B7). |
| B14 | Stage 3 / per-sim implementation phase decision on Stack C TDD-bootstrap framework: pytest (this session's precedent) or ctest+doctest (dispatch's intent). | Surfaced under shift #15 above. | Stage 3 (or first Stack-C continuation session). |

## 8. Stage 3 readiness

**NOT YET READY.** Five sims remain. A continuation session (or 2–3
sessions) is required to close Stage 2 before Stage 3 can dispatch.

Specific remaining-work list for the continuation session:

1. Pair-or-single commit for **reaction-diffusion-3d** (charter § 7.6), including the RD-2D MMS co-bundle per R8 amendment.
2. Single-sim commit for **sph-water** (charter § 7.7) — verify Phase 0 SPlisHSPlasH vendoring before citing.
3. Single-sim commit for **eulerian-smoke** (charter § 7.8) — Taylor-Green MMS.
4. Single-sim commit for **lattice-boltzmann-d3q19** (charter § 7.9) — algebraic-only per R8 amendment.
5. Single-sim commit for **mpm-multimaterial** (charter § 7.10).
6. Final closing Stage 2 checkpoint (replaces this partial-needs-continuation entry, supersedes it).

Standing orders from the original dispatch carry forward to the
continuation session unchanged.
