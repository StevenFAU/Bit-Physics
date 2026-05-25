---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1a
stage: stage-1a-checkpoint
phase: phase-2
head_sha: <COMMIT_2_SHA_PENDING>
head_sha_at_checkpoint: b04cdbdefeeae90591e41e2dcbd7733cfb498382
date: 2026-05-25T12-08-25Z
verdict: stage-1a-CONFIRMED
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1a-failing-tests-2026-05-25T12-08-25Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1a-failing-tests-2026-05-25T12-08-25Z.txt: sha256:90b0fba721ed1eed4fb41510eb0b197dccc2315f737cd5b2e62b43d82cb2d313
---

# Stage 1a checkpoint — sub-phase-eulerian-smoke-stack-e

> SEVENTH per-sim cross-stack port; SECOND Stack-E port. Stage 1a (the
> failing-tests scaffold) CLOSE. VERDICT stage-1a-CONFIRMED. Created
> `packages/eulerian-smoke-stack-e/` (NOT yet a workspace member — registration
> is Stage 1b per charter § 4) with the pkg skeleton + the SIX final acceptance
> test files (ported from the same-sim `eulerian-smoke-stack-d` content + the
> common-warp determinism socket). The gate-13 failing-tests RED anchor:
> **all 6 tests collect to a clean `ModuleNotFoundError`** on the absent
> `reference`/`sim`/`invariants` submodules (`b04cdbde`; reproduced in a clean
> worktree). Integrity baseline-MATCH (`c19492ad…`; the new package adds ZERO
> findings); bit-identity replay HELD (`9399fc33…`). 2 shifts (S1a-SME1..S1a-SME2);
> cumulative 200 → 202.

## § 0. Scope-conflict resolution (operator-confirmed; charter-faithful)

The Stage-1a dispatch HEADER framed this stage as "scaffold + gate-13 RED anchor
+ § L.7 O-2 checkpoint 2 (gate-10 production reproduction)", and charter § 6's
O-2 summary line reads "Stage-1a gate-10 production reproduction". Both
**conflict** with charter § 2 (Stage-1a row: "skeleton + test surface at clean
`ModuleNotFoundError`; failing-tests evidence + sha256 … yes, single commit") +
§ 4 (Stage-1a "New" = the package; "Additive edits" = NONE; root registration +
implementation + O-2 checkpoints 2/3 are the **Stage-1b** row). gate-10
"production reproduction" is impossible at Stage 1a because there is no
production implementation (deferred to Stage 1b). The dispatch itself instructs:
"charter § 4 is authoritative for THIS stage's scope; dispatch framing is NOT
scope; charter wins; surface and STOP per Hard Rule 2." Per Convention M + Hard
Rule 2 the conflict was surfaced to the operator **before any edit**. **Operator
routing:** execute **charter-faithful Stage 1a (failing-tests scaffold ONLY)**;
implementation + gate-10/O-2-checkpoint-2 + workspace registration (21 → 22) are
Stage 1b. The charter § 6 O-2 line + the dispatch header are MPM-inherited drift
(MPM-Stack-E folded its implementation into its Stage 1a; this charter splits
1a/1b) — banked S1a-SME1 (Stage-2 candidate to reconcile § 6).

## § 1. Scope

Stage 1a of `sub-phase-eulerian-smoke-stack-e`: the failing-tests scaffold (TDD
RED anchor). Creates `packages/eulerian-smoke-stack-e/` (pkg skeleton +
`pyproject.toml` + `README.md` + `tests/` with the six final acceptance test
files) at a clean `ModuleNotFoundError`. **Additive only** (Convention A): all
new files under `packages/eulerian-smoke-stack-e/`. **NOT touched** (§ 0 + charter
§ 4 boundary): root `pyproject.toml` / `uv.lock` (registration is Stage 1b), the
`reference`/`sim`/`invariants` implementation (Stage 1b), `tolerance.toml`
(D6 no-op), `equivalence.md` / methodology / conventions / warp.md (Stage 2),
Phase-1 source, common-warp.

## § 2. Operator routing consumed (D1–D17 + Stage-0 inheritance)

All ratified D-leans in force + the § 0 scope routing. Load-bearing this stage:
**D7/D15** (socket-only common-warp consumption: Runtime + Capture + Determinism;
own `wp.array(dtype=wp.float64)` — reflected in the pkg docstrings + the gate-10
test's `assert_deterministic_run` arm), **D9** (`tolerance=0.0` CPU bit-exact,
even for chaos — gate-10 test), **D10** (gate-14 = divergence-rate witness;
`within_tolerance=False` EXPECTED; STOP only on step-1 faithfulness — gate-14
test docstring + skip), **D6** (override reuse — gate-14 test asserts the
resolved `smoke`/`1e-4`), **D14** (3D capture held local — gate-14 3D test
skipped). **Stage-0 R-A1 anchor** `79d15705…b342b2eea2` (the gate-10
`assert_deterministic_run` arm exercises the same 3D-Jacobi surface). No
re-litigation.

## § 3. Task 1a.0 — Preflight (Convention M + § D.5)

(FACT — `git rev-parse`; `/tmp/stage0/s1a-replay.txt`; `/tmp/stage0/s1a-integrity.txt`.)
HEAD entering = `5379431` (Stage-0 SHA back-fill close). Post-scaffold (at
`b04cdbde`): bit-identity replay
`python -m integrity.scripts.replay_prior_phase … --gates integrity,pytest,…`
→ 8/8 PASS, `ok=True`, sha256
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` — **HELD.**
Integrity sweep `python -m integrity --all --mode strict` → `0 HARD_FAIL,
14 SOFT_WARN`, findings sha256
`c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
**baseline-MATCH** (the new package adds ZERO integrity findings — no cat1/cat2/
cat5 entry references `eulerian-smoke-stack-e`; the change is purely additive
under `packages/`). Doc anchors unchanged (conventions `1937a7cf…`; methodology
`a154d10c…`; architecture `e82b7b8e…`). **Hard Rule 2 (HEAD/invariant drift,
new integrity findings) NOT triggered.**

## § 4. Task 1a.1 — Re-anchor + workspace member count

(FACT — root `pyproject.toml` `[tool.uv.workspace].members`.)

- **Workspace members: 21 — UNCHANGED.** Charter § 4 places root-workspace
  registration (21 → 22) at **Stage 1b**, NOT Stage 1a. `packages/eulerian-smoke-
  stack-e/` exists on disk but is NOT a uv-workspace member; the test `conftest.py`
  inserts the package root into `sys.path` so the on-disk package is importable
  (the smoke-Stack-D conftest pattern). No `uv.lock` edit this stage.
- Cumulative-shift count entering: **200** (S0-SME1 banked at Stage 0). No
  registration delta to reconcile (the Hard-Rule-2 "registration cumulative-shift
  mismatch" condition is N/A — Stage 1a does not register).

## § 5. Task 1a.2 — Scaffold

`packages/eulerian-smoke-stack-e/` (additive, Convention A):

- `pyproject.toml` — deps `bit-physics-{testkit,diagnostics,common-warp}` +
  `h5py` + `hypothesis` + `numpy>=2.0` + `warp-lang>=1.13,<2.0`;
  `filterwarnings=["error"]` mirroring common-warp (NO bare-form; S0-1 N/A for
  Warp — Stage-0 Task 0.2 evidence); mypy overrides for `warp`/`common_warp`/
  testkit; `[tool.uv.sources]` workspace refs.
- `README.md` — port summary (chaotic-regime R-P2; socket-only f64; gate map).
- `eulerian_smoke_stack_e/__init__.py` — package docstring skeleton (no
  implementation; O-W6 / socket-only / f64 posture documented).
- `tests/` — `__init__.py`, `conftest.py` (sys.path insertion + repo-root +
  capture-path fixtures), + the SIX final acceptance test files (§ 6).

The test bodies are the **final, real tests** (ported from the same-sim
`eulerian-smoke-stack-d` 6-file layout + the common-warp determinism socket from
`mpm-multimaterial-stack-e`); they reference the Stage-1b public API
(`reference.{semi_lagrangian_advect_2d/_3d, project_pressure/_3d,
stable_fluids_step, CANONICAL_*, _DEFAULT_N_JACOBI}`; `sim.{sim_runner_seeded,
sim_runner_seeded_2d, sim_runner_diagnostic, compute_canonical_trajectory_3d}`;
`invariants.{divergence_free_post_projection, smoke_density_nonneg}`) verbatim,
so Stage 1b makes them GREEN by landing the implementation against that contract.

## § 6. Task 1a.3 — Test surface (6 files; the gate-4..14 contract)

| File | Gate(s) | Contract |
|---|---|---|
| `test_mms_convergence.py` | 4 | MMS-ONLY (no golden); advection + projection OOA ≈ 2 ± 0.5 vs the shared `incompressible_ns_2d` source. |
| `test_diagnostics.py` | 5 + 6 | Tier-1 NaN/Inf scan + Tier-2 IC-6 `vector_field` (divergence-free advisory + circulation/helicity/spectrum finite) on `compute_canonical_trajectory_3d`. |
| `test_determinism.py` | 10 | testkit `run_twice_and_diff(sim_runner_diagnostic, 42)` + common-warp `assert_deterministic_run(_projection_state, tolerance=0.0)` on the 3D-Jacobi surface (the § L.7 O-2 checkpoint-2 surface; asserts DETERMINISM — see S1a-SME2). |
| `test_pbt_invariants.py` | 11 | `divergence_free_post_projection` + `smoke_density_nonneg` (≥ 50 examples each). |
| `test_reference_sanity.py` | 5 | canonical-descriptor lock (D4) + constant-field SL invariance (2D/3D) + projection divergence-reduction. |
| `test_cross_stack_equivalence.py` | 14 | R-P2 chaotic-regime escape-hatch (`within_tolerance=False`; resolved `smoke`/`1e-4`; worst O(field)). **SKIPPED at 1a/1b; un-skipped at Stage 1c** (Stack-E captures are the Stage-1b deliverable; 3D held local D14). |

## § 7. Task 1a.4 — gate-13 failing-tests RED anchor

(FACT — `python -m pytest` from the package dir + a clean-worktree replay at
`b04cdbde`.)

- **Working-tree pytest:** `6 errors during collection`; every test module raises
  `ModuleNotFoundError: No module named 'eulerian_smoke_stack_e.{reference|sim|
  invariants}'`. The top-level `eulerian_smoke_stack_e` imports (skeleton
  `__init__.py` via the conftest `sys.path` insertion); the absent Stage-1b
  submodules are the clean RED. Raw output committed:
  `stage-1a-failing-tests-2026-05-25T12-08-25Z.txt` (committed-blob sha256
  `90b0fba7…2cb2d313`).
- **gate-13 worktree replay (§ E):** `git worktree add --detach <wt> b04cdbde`
  → `python -m pytest` → **6 errors, 6 `ModuleNotFoundError`** (RED reproduced
  from a clean checkout). The **GREEN-resolve half of gate-13 is Stage 1b** (HEAD
  is the RED anchor itself at Stage 1a — there is no implementation yet; charter
  § 2 places the GREEN test bodies + the gate-13 replay-vs-GREEN at Stage 1b).

## § 8. R-A1 anchor posture (§ L.7 O-2 chain checkpoint 2 — Stage 1b)

The Stage-0 R-A1 digest `79d15705fdce26c31ffd92ae07592037cc112fb30c30736cea2c98b342b2eea2`
(6/6 bit-identical 3D Jacobi-projection) is checkpoint 1. **Checkpoint 2 (gate-10
production reproduction) is Stage 1b** (no implementation at Stage 1a). The
gate-10 `test_warp_harness_assert_deterministic_run` arm exercises the production
`project_pressure_3d` on the EXACT Stage-0 IC (16³, seed-42 `standard_normal`
u/v/w, dt=0.005, ρ=1.0, n_jacobi=20) and asserts bit-exact run-to-run
**determinism** (`tolerance=0.0`). It does **NOT** assert byte-equality to
`79d15705…` (S1a-SME2): the production `project_pressure_3d` follows the Phase-1
`np.roll` neighbor-summation order, which differs from the Stage-0 ephemeral
kernel's index order (`p[ip]+p[im]+…` vs `p[im]+p[ip]+…`); FP addition is
non-associative, so the two are determinism-equivalent but not byte-equal. The
`79d15705…` digest is re-witnessed by re-running the ephemeral Stage-0 kernel
(Stage-1b dispatch judgment), not via the production path — analogous to the
MPM-Stack-E S1a-ME4 "R-A1 anchor is the P2G-scatter contract, distinct from the
full-sim digest" clarification.

## § 9. Task 1a.5 — Local verification sweep

- **Package tests (RED):** 6 collection errors (`ModuleNotFoundError`) — the
  intended Stage-1a RED anchor; GREEN is Stage 1b.
- **Integrity sweep:** `c19492ad…d22cb52` **baseline-MATCH** (0 HARD_FAIL,
  14 SOFT_WARN); the new package adds ZERO findings.
- **Bit-identity replay:** `9399fc33…718909f34` **HELD**.
- **ruff:** `ruff check --fix` + `ruff format` GREEN (pre-emptive #9); all
  pre-commit hooks (eof-fixer / trailing-whitespace / cat4 / conventional)
  passed on COMMIT 1.

## § 10. Task 1a.6 — Stage 1b readiness

**READY.** Stage 1b deliverables (charter § 2/§ 4 Stage-1b row): (a) the Warp
Stam-Fedkiw reference (`reference/stable_fluids_warp.py`: `semi_lagrangian_advect`
2D/3D, `maccormack_advect_2d`, `diffuse`, `project_pressure`/`project_pressure_3d`
Jacobi-20, `vorticity_confinement` OFF, `curl`/`divergence` as `@wp.kernel`s over
own f64 `wp.array`s — O-W7 part-2 applies to the SL-backtrace base-node
derivation per S0-SME1) → `sim.py` + `invariants.py` + the `spec-ref-stack-e.md`
spec sheet → test bodies GREEN (gates 4–13) → TWO canonical captures (3D held
local) → perf-ledger rows (2D + 3D, warp-cpu) → **root `pyproject.toml`
workspace registration (21 → 22)** + `uv.lock` → gate-13 replay (RED `b04cdbde`
→ HEAD GREEN). O-2 checkpoints 2 + 3. No blocking dependencies.

## § 11. Banked items / observations (shifts S1a-SME1..S1a-SME2)

- **S1a-SME1 — Stage-1a scope conflict (dispatch header / charter § 6 vs charter
  § 2/§ 4).** The dispatch header + charter § 6's O-2 summary line place "O-2
  checkpoint 2 (gate-10 production reproduction)" at Stage 1a; charter § 2/§ 4
  (authoritative) scope Stage 1a as a failing-tests scaffold ONLY, deferring
  implementation + gate-10 + registration to Stage 1b. Resolved charter-faithful
  (operator-confirmed; § 0). The § 6 O-2 line is stale MPM-inherited phrasing —
  **Stage-2 candidate to reconcile § 6** with the § 2/§ 4 1a/1b split (no charter
  edit at Stage 1a). (Charter §6 / dispatch framing.)
- **S1a-SME2 — R-A1 reproduction is determinism-equivalent, NOT byte-equal.** The
  production `project_pressure_3d` cannot reproduce the Stage-0 ephemeral digest
  `79d15705…` byte-for-byte because Phase-1's `np.roll` neighbor-summation order
  differs from the Stage-0 kernel's index order (FP non-associativity). gate-10
  asserts determinism (`assert_deterministic_run`, `tolerance=0.0`); the Stage-0
  digest is re-witnessed via the ephemeral kernel at Stage 1b (§ 8). Analogous to
  MPM-Stack-E S1a-ME4. (Charter §6 / D9.)
- **Operational notes (NOT shifts):** (a) ruff isort groups the unregistered
  `eulerian_smoke_stack_e` with third-party imports (no first-party block,
  because the package is not yet installed/registered); Stage-1b registration may
  re-sort it into a first-party block (additive; harmless to gate-13). (b) Test
  layout = the 6-file `eulerian-smoke-stack-d` layout (`test_mms_convergence`
  where MPM uses `test_quadratic_bspline_golden`). (c) The package is run via
  `python -m pytest` from the package dir (not `uv run --package …`) since it is
  not a workspace member until Stage 1b.
- **STAY-BANKED:** LFS-architecture (D13); 3D-capture-held-local (D14); N1
  per-package pytest-config; R-SME9 resolution-dependence (Stage-2 § L.4
  candidate) — no surprises.

## § 12. Verdict

**stage-1a-CONFIRMED.** Failing-tests scaffold landed (`b04cdbde`); gate-13 RED
anchor established + worktree-reproduced (6 `ModuleNotFoundError`); integrity
baseline-MATCH (`c19492ad…`); bit-identity replay HELD (`9399fc33…`). NOT
implementation: `reference`/`sim`/`invariants` NOT created (Stage 1b); workspace
members UNCHANGED at 21 (registration is Stage 1b). 2 shifts (S1a-SME1..S1a-SME2);
cumulative **200 → 202**. No `-phase-N` tag (D12). Local-only (D13). Operator
routes Stage 1b separately.

---

*End of Stage 1a checkpoint. `head_sha` back-filled in COMMIT 3 (Convention #12;
separate commit; never `--amend`; N1 enumeration).*
