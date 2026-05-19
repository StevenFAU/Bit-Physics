---
date: 2026-05-19T11-44-35Z
author: phase-0-block-3-agent
phase: 0
artifact: block
artifact_id: block-3-harnesses
verdict: CONFIRMED
evidence_paths:
  - tools/testkit/determinism/__init__.py
  - tools/testkit/determinism/harness.py
  - tools/testkit/determinism/policy.md
  - tools/testkit/determinism/tests/__init__.py
  - tools/testkit/determinism/tests/test_harness.py
  - tools/testkit/equivalence/__init__.py
  - tools/testkit/equivalence/harness.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/equivalence/tests/__init__.py
  - tools/testkit/equivalence/tests/test_harness.py
  - tools/testkit/property/__init__.py
  - tools/testkit/property/harness.py
  - tools/testkit/property/strategies.py
  - tools/testkit/property/invariants/__init__.py
  - tools/testkit/property/invariants/conservation.py
  - tools/testkit/property/invariants/geometry.py
  - tools/testkit/property/invariants/scalar_field.py
  - tools/testkit/property/tests/__init__.py
  - tools/testkit/property/tests/test_harness.py
  - tools/testkit/pyproject.toml
  - docs/testkit/determinism.md
  - docs/testkit/equivalence.md
  - docs/testkit/property.md
  - docs/testkit/overview.md
head_sha: 89a8b0b115395a77eb4e5f89386d41d3b2201716
deferred_items:
  - { item: "PBT example database committed alongside Phase-1+ sims", target_phase: 1,
      rationale: "Phase 0 PBT runs use database=None to keep the test environment hermetic; Phase-1+ sims may commit a `.hypothesis/` cache per-package once shrunken counter-examples become load-bearing" }
ci_activation:
  - { workflow: .github/workflows/determinism.yml, action: "remove `if: ${{ false }}` (top-level workflow gate); enable in Block 9 LANDING" }
  - { workflow: .github/workflows/equivalence.yml, action: "remove `if: ${{ false }}` (top-level workflow gate); enable in Block 9 LANDING" }
  - { workflow: .github/workflows/property.yml, action: "NEW workflow — Block 1 did not ship a `property.yml`; Block 9 creates it as part of CI activation alongside enabling the gate" }
top_level_deps_to_merge:
  - { file: tools/testkit/pyproject.toml, addition: "hypothesis>=6.0 (resolved to hypothesis 6.152.8 at execution time)" }
---

## What was built

FACT — Determinism harness at `tools/testkit/determinism/` exposing the
public API in `docs/phases/phase-0-plan.md` § 3.3.2: `SimRunner` Protocol,
`DeterminismVerdict` dataclass, `run_twice_and_diff(runner, seed=42,
tmp_dir=None)`. The harness invokes the runner twice in independent
`run-a/` and `run-b/` subdirectories, then diffs the resulting captures
via Block-1's `diff_captures(..., mode="bit-exact")`. Verdicts carry
either `"captures match exactly"` or a structured first-mismatch detail.

FACT — `tools/testkit/determinism/policy.md` documents per-stack
determinism guidance for Stack A (CPython / NumPy), Stack B (TS /
WebGPU), Stack C (C++ / CUDA / HIP), Stack D (Taichi), Stack E (JAX),
plus the `epsilon` -> `bit-exact-same-hw` promotion path.

FACT — Three determinism tests pass:
  - `test_deterministic_stub_passes_the_gate` exercises a stub that
    re-seeds `np.random.default_rng(seed)` on every call.
  - `test_nondeterministic_stub_fails_the_gate` exercises a stub that
    uses `np.random.default_rng()` without a seed.
  - `test_harness_creates_two_independent_run_dirs` confirms the harness's
    output-directory contract.

FACT — Equivalence harness at `tools/testkit/equivalence/` exposes the
public API in § 3.3.3: `EquivalenceVerdict` dataclass,
`compare_captures(left, right, tolerance_table_path=None)`,
`load_tolerance_table(path)`. Tolerance resolution is per-sim override
first, per-category default second.

FACT — `tools/testkit/equivalence/tolerance.toml` ships the spec § 2.6
default tolerance table: `closed_form` (rtol=1e-5), `reaction-diffusion`
(rtol=1e-4), `sph` (rtol=1e-4), `mpm` (rtol=1e-4), `smoke` (rtol=1e-4),
`lbm` (rtol=1e-5). Validated against
`tools/testkit/equivalence/tolerance-schema.json` (Draft 2020-12). No
per-sim overrides at Phase 0 close.

FACT — Four equivalence tests pass:
  - `test_stack_b_within_tolerance_of_stack_a` — same polynomial
    evaluated through different float orderings; within 1e-4 rtol.
  - `test_stack_wrong_fails_the_gate` — perturbed polynomial; fails at
    `max_abs_err > 1e-3`.
  - `test_load_tolerance_table_validates_against_schema` — tolerance
    table validates.
  - `test_load_tolerance_table_rejects_malformed_table` — a negative
    `relative` raises `jsonschema.ValidationError`.

FACT — Property-based testing harness at `tools/testkit/property/` ships
the contracted surface: `Pass`, `Fail`, `Invariant`, `InvariantResult`,
`PropertyVerdict`, `run_invariants(sim_runner, invariants, strategy=None,
n_examples=100, tmp_dir=None)`. Hypothesis is the backing engine; the
shrinker drives counter-example minimization on `Fail` outcomes.

FACT — Built-in invariants at `tools/testkit/property/invariants/`:
  - `conservation_mass(field, tolerance)` (category continuous-ca)
  - `conservation_momentum(field, tolerance)` (category particle-fluid)
  - `conservation_energy(field, tolerance)` (category rigid-body)
  - `monotone_bounds(field, lo, hi)` (category continuous-ca)
  - `divergence_free_where_prescribed(field_x, field_y, tolerance)`
    (category incompressible-flow)
  - `no_particle_overlap_within_epsilon(positions_field, epsilon)`
    (category particle-fluid)

FACT — Built-in strategies at `tools/testkit/property/strategies.py`:
  - `smooth_scalar_field_in_unit_box(shape, lo, hi)` (continuous-CA)
  - `random_particle_configuration_1d(n_particles, domain)`
    (particle-fluid)
  - `random_seed()` (generic)

FACT — Two PBT tests pass:
  - `test_pbt_passes_on_mass_conserving_sim` exercises a sim where every
    step is `np.roll(field, 1)` (pure permutation); mass conservation
    holds at every example.
  - `test_pbt_fails_and_shrinks_on_drifting_sim` exercises a sim that
    adds `+1e-4` per step; `run_invariants` surfaces a shrunken
    counter-example.

FACT — `tools/testkit/pyproject.toml` updated:
  - `dependencies` now includes `hypothesis>=6.0`.
  - `[tool.hatch.build.targets.wheel] packages` extended with
    `determinism`, `equivalence`, `property`.
  - `[tool.mypy] files` extended; `tool.mypy.overrides` adds
    `hypothesis`/`hypothesis.*` to the `ignore_missing_imports` set.
  - `[tool.pytest.ini_options] testpaths` now includes the three new
    `tests/` directories.

FACT — Self-verification at audit-write time:
  - `uv run ruff check .` — All checks passed.
  - `uv run ruff format --check .` — clean after one auto-format pass.
  - `uv run mypy --strict capture code_verification determinism
    equivalence property` — Success: no issues found in 40 source files.
  - `uv run pytest -W error` (testkit) — 28 passed (capture 11, mms 8,
    determinism 3, equivalence 4, property 2).
  - `pre-commit run --all-files` — all hooks passed.

FACT — Documentation at `docs/testkit/{determinism,equivalence,property}.md`;
overview index updated.

## Design decisions made

INFERENCE — Top-level package name `property` shadows the Python builtin
`property` decorator when used as `from property import ...`. The
shadowing is intentional and matches the deliverable-3 directory name in
the Block-3 prompt verbatim. Inside the package the builtin remains
accessible via `builtins.property`. A future renaming to
`property_testing` (or similar) would be a SHIFTED amendment to the
plan; not done here to keep the directory tree aligned with the prompt.

INFERENCE — A separate `tolerance-schema.json` ships at the equivalence
module root (Draft 2020-12). Block 1 ships three schemas under
`tools/testkit/schemas/` but the tolerance table is a Block-3 concept
and belongs alongside `tolerance.toml`; this was not added to the
top-level `schemas/` directory to avoid implying it belongs to the
capture-format family.

INFERENCE — `compare_captures` does NOT consult
`tolerance-budget.toml`. The budget cap is a separate concern enforced
by Block-5 INTEGRITY's Cat-X check (spec § 2.6); the equivalence
harness reads `tolerance.toml` (the per-sim/per-category effective
table) only. This separation matches the spec's two-file design and
keeps the harness composable.

INFERENCE — `.gitignore` was inspected for a `.hypothesis/` entry; none
present. The Block-3 prompt's directive to "REMOVE `.hypothesis/` from
`.gitignore`" was vacuously satisfied. Phase-0 PBT tests pass
`database=None` to `@settings` to keep CI hermetic; per-sim databases
become a Phase-1+ choice (deferred item).

INFERENCE — Determinism harness uses `tempfile.mkdtemp(prefix="det-")`
as the fall-back base dir when `tmp_dir is None`. The fall-back path is
NOT cleaned up by the harness; callers can inspect artifacts post-run.
Tests always supply `tmp_dir=tmp_path` (pytest's per-test temp dir)
so the test environment is hermetic.

INFERENCE — Cat-X tolerance-budget enforcement is out of scope for
Block 3. The harness ships its own tolerance schema; the budget cap is
Block-5 INTEGRITY's job. The `ci_activation` list reflects that:
`equivalence.yml` activates the equivalence run, not the budget check.

## Open items

`property.yml` workflow does not exist yet (Block 1 shipped
`determinism.yml` and `equivalence.yml` but not `property.yml`). Block 9
(LANDING) must create it as part of CI activation, not just flip a gate.
The `ci_activation` front-matter entry calls this out explicitly.

`.hypothesis/` example databases are deferred — see `deferred_items`.

## Conventions honored

Convention #8: Hypothesis version, ruff/mypy/pytest outputs all
grep-or-execute-verified at audit-write time; spec § 2.6 default
tolerance table mirrored exactly into `tolerance.toml`.

Convention M: Block-1 capture module + writer signature re-read before
referencing them; pyproject re-read before each edit; capture-test
manifest builder pattern re-anchored before the Block-3 stubs copied it.

Convention A: every new file lives under a new module namespace
(`determinism/`, `equivalence/`, `property/`). The only modifications
to prior-block files are additive (pyproject, gitignore inspection,
docs-overview link flip).

Conventional Commits + FACT/INFERENCE tagging applied here. The single
Block-3 commit is `feat(testkit): determinism + equivalence + PBT
harnesses`, matching the Block-9 commit-chain target (Commit 3 of the
LANDING construction).
