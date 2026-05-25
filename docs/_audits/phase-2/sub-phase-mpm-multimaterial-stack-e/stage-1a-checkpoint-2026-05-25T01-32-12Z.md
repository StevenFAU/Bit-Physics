---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-1a
stage: stage-1a-checkpoint
phase: phase-2
head_sha: <COMMIT_3_SHA_PENDING>
head_sha_at_checkpoint: a450e6fceee7fa13306b074307f8a8dc013648f5
date: 2026-05-25T01-32-12Z
verdict: stage-1a-CONFIRMED
evidence_paths:
  - captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.json
  - captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.h5
  - docs/perf-ledger.md
---

# Stage 1a checkpoint — sub-phase-mpm-multimaterial-stack-e

> SIXTH per-sim cross-stack port; FIRST Stack-E port. Stage 1a (the substantive
> port) CLOSE. VERDICT stage-1a-CONFIRMED. Created
> `packages/mpm-multimaterial-stack-e/` (21st workspace member) with the full
> NVIDIA Warp `@wp.kernel` MLS-MPM/APIC neo-Hookean single-material
> implementation; **gates 4–13 GREEN (15 passed, 1 skipped=gate-14 Stage 1c)**.
> R-A1 anchor: the production P2G reproduces the Stage-0 digest
> `a8f6e654…07ff1fe1` EXACTLY. Integrity baseline-MATCH (`c19492ad…`); bit-identity
> replay HELD (`9399fc33…`, 42nd). 5 shifts (S1a-ME1..S1a-ME5); cumulative 182 → 187.

## § 1. Scope

Stage 1a of `sub-phase-mpm-multimaterial-stack-e`: the substantive port. Creates
the 21st workspace member with the Warp MLS-MPM implementation (P2G ±stress,
grid-update, G2P/APIC, deformation-update, neo-Hookean stress, advect) and passes
13 of 14 acceptance gates locally (gate-14 cross-stack equivalence is Stage 1c;
the full 128cube canonical capture is Stage 1b). Additive only (Convention A):
all new files under `packages/mpm-multimaterial-stack-e/` + the diagnostic capture
+ a `+1` workspace-member line + a `+1` perf-ledger row. No edits to Phase-1
source, common-warp, tolerance.toml, methodology, or warp.md (SECTION 7 boundary).

## § 2. Operator routing consumed (D1–D16 + Stage-0 inheritance)

All ratified D1–D16 in force. Load-bearing this stage: **D5/banked #8** (Warp CPU
serial launch → P2G `wp.atomic_add` bit-exact; no `cpu_max_num_threads=1`),
**D10/S-ME1** (socket-only common-warp consumption: Runtime + Capture +
Determinism), **D15/R-MPME-F64** (own `wp.array(dtype=wp.float64)`),
**D14** (`tolerance=0.0` CPU bit-exact). **Stage-0 R-A1 anchor** `a8f6e654…07ff1fe1`
+ **S0-ME1 O-W7** `wp.float64()`-taint workaround applied to all kernels.

## § 3. Task 1a.0 — Preflight

(FACT — `git rev-parse`; `/tmp/s1a-replay.out`; warm-env integrity re-run.)
HEAD entering = `2b280a2` (Stage-0 close). Bit-identity replay
`python -m integrity.scripts.replay_prior_phase … --gates integrity,pytest,…`
→ 8/8 PASS, `ok=True`, sha256 `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
— **HELD (42nd invocation).** Integrity sweep `python -m integrity --all --mode
strict` → `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256
`c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
**baseline-MATCH** (the new package + perf-ledger row + member registration add
ZERO integrity findings; verified by `diff` against the Stage-0 baseline — the
only delta was a spurious uv "Installed N packages" stderr line, absent on the
warm-env re-run). Hard Rule 2 (HEAD/invariant drift) NOT triggered.

## § 4. Task 1a.1 — Warp version re-fetch (Convention #8 fresh-at-edit)

(FACT — web-fetch `github.com/NVIDIA/warp/releases`, 2026-05-25.) **warp-lang
1.13.0 is upstream-latest** (no 1.13.x / 1.14.x / 2.x shipped). The package pins
`warp-lang>=1.13,<2.0` (direct, for the `import warp` in `reference/mls_mpm_warp.py`)
mirroring the common-warp transitive pin; no re-pin needed. All runs used
`warp 1.13.0` (logged at sim/test init).

## § 5. Task 1a.2 — Scaffold + 21st-member registration

`packages/mpm-multimaterial-stack-e/`: `pyproject.toml` (deps
`bit-physics-{testkit,diagnostics,common-warp}` + `h5py` + `hypothesis` +
`numpy` + `warp-lang>=1.13,<2.0`; `filterwarnings=["error"]` mirroring
common-warp — NO bare-form, S0-1 N/A for Warp; mypy overrides for `warp`/
`common_warp`/testkit), `README.md`, `docs/port-notes.md`, `config/default.toml`,
the package + `reference/` modules, `invariants.py`, `tests/` (6 files +
conftest). Registered the **21st workspace member** in root `pyproject.toml`
`[tool.uv.workspace].members` (additive comment block) + `uv lock` (resolved 78
packages). **Member-count delta verified: 20 → 21.**

## § 6. Task 1a.3 — Warp MLS-MPM implementation

`reference/mls_mpm_warp.py` re-derives the Phase-1 algebraic surface VERBATIM
(same operation order → cross-stack FP-round-off; no Phase-1 import). Seven
`@wp.kernel`s + NumPy-marshalling wrappers (in-place mutation contract matching
the Phase-1 API). Discipline applied:

- **f64 throughout** (D15): all `wp.array(dtype=wp.float64)`; every literal seeded
  `wp.float64(...)` (banked #7 / § L.4).
- **Warp CPU serial launch = determinism** (D5 / banked #8): `wp.launch` on CPU is
  single-threaded serial → P2G `wp.atomic_add` bit-exact; no knob.
- **O-W7 `wp.float64()`-taint workaround** (S0-ME1): int base via
  `wp.int32(<float_base>)` (float base not reused as int); B-spline weights + node
  offsets packed into `wp.vec3d` indexed by the pure-int loop variable (a `@wp.func`
  `_bspline_w` / `_node_off`). Verified de-risked: the kernel compiles + runs.
- **O-W6**: the kernel module omits `from __future__ import annotations`
  (defensive; mirrors common-warp). **SIM108** suppressed on the neo-Hookean
  `log_j` if/else (Warp-codegen-safe + Phase-1 parity; not a ternary).

CANONICAL_* constants re-derived (single-material neo-Hookean; `material_id`
all-0). **Correctness witness:** step-1 P2G mass-conservation `abs_err 2.22e-16`
(partition-of-unity exact, 1 ULP); the diagnostic trajectory reproduces the
Phase-1 Task-1.6 values to printed precision (`max|vel| = 2.049050`,
`min pos_z = 0.491517` at step 50 — rigid free-fall, BOUNDED).

## § 7. Task 1a.4 — sim.py + invariants.py

`sim.py`: `sim_runner_seeded` (canonical 128cube; Stage 1b emits) +
`sim_runner_diagnostic` (16cube; the gate-witness scale); consumes the
common-warp socket (`init("cpu", deterministic=True)` + `set_warp_deterministic`
+ `deterministic_context`); builds `common_warp.Capture` payloads (f64-preserving
`write_capture` — `np.asarray`, no downcast) with the Phase-1 state-field schema
(`particle_pos`/`particle_vel`/`particle_material_id`/`grid_mom`) +
diagnostics. `invariants.py`: the two spec § 6.6 PBT invariants
(`mass_conservation_p2g_g2p` via the Warp P2G; `partition_of_unity_b_spline`).

## § 8. Task 1a.5 — Gates 4–13 verification

(FACT — `uv run --package mpm-multimaterial-stack-e --extra dev python -m pytest`
→ **15 passed, 1 skipped**; integrity `--cat` baseline-MATCH; gate-13 worktree
replay.)

| Gate | Status | Notes |
|---|---|---|
| 4 (code-verification) | **GREEN** | quadratic-B-spline golden (`test_quadratic_bspline_golden.py`; 2 tests; `abs=1e-15`). **GOLDEN-only — NO MMS arm** (S1a-ME1; matches Stack-D + plan-drafting probe § 3). |
| 5 (Tier-1) | **GREEN** | `check_health` NaN/Inf scan clean across all diagnostic frames. |
| 6 (Tier-2) | **GREEN** | IC-5 `check_count_invariance` (=5000 all frames) + `check_momentum_conservation_drift` (finite, <1) + IC-6 `check_circulation_grid_mom_l1` (finite, bounded). |
| 7 (Cat-1 citations) | **GREEN** | `integrity --cat 1` clean (baseline-MATCH, 0 HARD_FAIL). Citations in `reference/mls_mpm_warp.py` docstring: Hu 2018 (DOI 10.1145/3197517.3201293) + 88-line reference + Steffen-Kirby-Berzins 2008 (DOI 10.1002/nme.2360). **Single-material neo-Hookean** — NO Drucker-Prager/Tait sand/water (S1a-ME2; § 5.3 spec-describes-more). Formal `spec-ref-stack-e.md` spec sheet → Stage 1b (Stack-D landed its spec sheet at its impl stage). |
| 8 (Cat-2 public API) | **GREEN** | `integrity --cat 2` clean (baseline-MATCH). Public surface exported (`reference` kernels + CANONICAL_* + `sim` runners + `invariants`). |
| 9 (Captures) | **GREEN** | diagnostic `drop-impact-16cube-seed42-step50.{h5,json}` emitted + LFS-tracked (`.h5` LFS oid `689609bb46dd03fc…227c9e`; `.json` committed-blob sha256 `621d96bd…f533`). `read_capture` round-trips. **Canonical 128cube → Stage 1b** (Task 0.7 scope). |
| 10 (Determinism) | **GREEN** | `run_twice_and_diff(sim_runner_diagnostic, 42)` content_equivalent + `assert_deterministic_run(…, tolerance=0.0)` (W-2 §1.9.1) + the R-A1 anchor (§ 9). |
| 11 (PBT) | **GREEN** | 2 invariants @ 50 examples each (`test_pbt_invariants.py`). |
| 12 (perf-ledger) | **GREEN** | `docs/perf-ledger.md` warp-cpu DIAGNOSTIC row (`drop-impact-16cube-seed42-step50`, 0.108 s). Canonical 128cube row → Stage 1b. |
| 13 (failing-tests replay) | **GREEN** | § E worktree: `git worktree add … 88687b17` (COMMIT 1 RED anchor) → `ModuleNotFoundError: No module named 'mpm_multimaterial_stack_e.reference'`; HEAD GREEN (15 passed). |
| 14 (cross-stack) | **DEFERRED** | `test_cross_stack_equivalence.py` SKIPPED at Stage 1a (Stack-E canonical capture is the Stage-1b deliverable); harness wired, ready for Stage 1c. |

## § 9. R-A1 anchor verification (D5 / banked #8)

- **Stage-0 baseline:** `a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1`.
- **Stage-1a production-kernel digest (R-A1 scenario):**
  `a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1`.
- **Match: YES (EXACT).** `test_determinism.py::test_r_a1_anchor_reproduces_stage0_p2g_digest`
  reconstructs the identical Stage-0 Task-0.6 IC (uniform-in-cube, seed 42, 5K
  particles, 16³) and runs the **production** `p2g` kernel → the grid digest
  reproduces the Stage-0 verification digest bit-for-bit. The production P2G
  atomic-scatter preserves the Stage-0 determinism contract.
- **S1a-ME4 (clarification):** the FULL `sim_runner_diagnostic` is a different
  computation (50-step sim on the sphere-rejection IC) with its OWN 6/6
  bit-identical digest; the dispatch's "production sim_runner_diagnostic
  reproduces a8f6e654" conflated the full-sim digest with the P2G-scatter
  contract. The R-A1 ANCHOR (the P2G atomic-scatter contract) is reproduced
  EXACTLY (Match: YES); the full-sim determinism is witnessed separately
  (gate-10 `run_twice_and_diff` content_equivalent + `assert_deterministic_run`).

## § 10. Task 1a.6 — Local verification sweep

- **Package tests:** 15 passed, 1 skipped (gate-14) under the package's own
  `filterwarnings=["error"]` config (N1 — no blanket `-W error`).
- **Integrity sweep:** `c19492ad…d22cb52` **baseline-MATCH** (0 HARD_FAIL, 14
  SOFT_WARN); streak HELD into the 10th sub-phase Stage-1a position.
- **Bit-identity replay:** `9399fc33…718909f34` **HELD (42nd)**.
- **R-A1 anchor:** EXACT (§ 9).
- **Cross-package regression (representative):** common-warp 38 passed; the
  closest sibling mpm-multimaterial-stack-d 15 passed; Phase-1 mpm-multimaterial
  10 passed — **ZERO regressions**. The change is purely additive (new member +
  perf-row + member-registration); combined with the integrity baseline-MATCH +
  replay HOLD, no existing package is affected. The FULL 21-root portfolio sweep
  is the Stage-2 landing task (per the established per-sim-port pattern).
- **ruff:** `ruff check --fix` + `ruff format` GREEN (pre-emptive #9).

## § 11. Banked items / observations (shifts S1a-ME1..S1a-ME5)

- **S1a-ME1 — gate-4 GOLDEN-only.** The dispatch Task 1a.5 framed an MMS arm
  (`test_golden_mms.py`); HEAD reality (Stack-D + plan-drafting probe § 3) is
  golden-only (no MMS for MPM). Reconciled to `test_quadratic_bspline_golden.py`.
- **S1a-ME2 — single-material neo-Hookean citations.** The dispatch Task 1a.3 /
  gate-7 listed multi-material sand/water/elastic (Drucker-Prager/Tait); the
  Phase-1 reference is single-material neo-Hookean (`material_id` all-0; § 5.3
  spec-describes-more). gate-7 citations = Hu 2018 + Steffen-Kirby-Berzins only.
- **S1a-ME3 — 6-file test layout.** Mirrors Stack-D's proven 6 files (the
  dispatch's 10-file enumeration consolidated: tier-1/tier-2 into
  `test_diagnostics.py`; gate-13 is the worktree-replay procedure, not a test
  file; gate-9 capture-emission is a verification step). Convention M → match the
  established Stack-D layout.
- **S1a-ME4 — R-A1 anchor is the P2G-scatter contract (Match: YES), distinct
  from the full-sim digest** (§ 9).
- **S1a-ME5 — commit decomposition.** COMMIT 1 = scaffold + tests RED (gate-13
  anchor); COMMIT 2 = implementation GREEN (adjusted from the dispatch's
  COMMIT 1=scaffold / COMMIT 2=impl+tests, to give gate-13 a clean RED anchor —
  the Stack-D TDD model).
- **Operational notes (not shifts):** `uv lock` required after member
  registration; package tests run via `uv run --package … --extra dev python -m
  pytest` (the bare `pytest` entrypoint / bare `uv run python -m integrity` use a
  different env post-lock — pin the package + `--extra dev`). The capture `.json`
  received an EOF-fixer trailing newline at commit (§ B.6 Mode 3; harmless —
  `json.load` whitespace-insensitive).
- **STAY-BANKED (D11):** LFS-architecture (D13); mypy-warp-stub; N1 per-package
  pytest-config — no surprises.

## § 12. Stage 1b readiness

**READY.** Stage 1b deliverables: (a) the full **128cube canonical capture**
`drop-impact-128cube-seed42-step500.{h5,json}` (1M particles × 500 steps;
LFS-tracked) via `sim_runner_seeded` + the warp-cpu canonical perf-ledger row;
(b) the formal `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md`
spec sheet (gate-7 documentation, mirroring Stack-D's Stage-1b spec sheet);
(c) the optional S0-ME1 / O-W7 conventions-doc amendment (Stage 1b decides;
Stage 2 alternative locus per D8). No blocking dependencies; the canonical-scale
run is the same kernels at production N (Stage-0 Task 0.4 wall-clock estimate
applies; re-measured at Stage 1b).

## § 13. Verdict

**stage-1a-CONFIRMED.** Gates 4–13 GREEN (15 passed, 1 skipped=gate-14);
R-A1 anchor EXACT (`a8f6e654…`); integrity baseline-MATCH (`c19492ad…`);
bit-identity replay HELD (`9399fc33…`, 42nd); representative regression ZERO.
5 shifts (S1a-ME1..S1a-ME5); cumulative **182 → 187**. No `-phase-N` tag (D12).
Local-only (D13). Operator routes Stage 1b separately.

---

*End of Stage 1a checkpoint. `head_sha` back-filled in COMMIT 4 (Convention #12;
separate commit; never `--amend`; N1 enumeration).*
