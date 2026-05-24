---
date: 2026-05-24T20-03-28Z
author: common-warp-bootstrap-stage-0-agent
phase: 2
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-stage-0
stage: stage-0-checkpoint
subject: "Stage 0 (pre-flight) CLOSE for sub-phase-common-warp-bootstrap (Stack-E / NVIDIA Warp workspace surface). VERDICT CONFIRMED. Empirical-verification stage: Warp 1.13.0 installed + version-pin verified (>=1.13,<2.0; still latest, no 1.14.x/2.x); CPU-mode bit-determinism VERIFIED 6/6 (digest 24d44c7e...0746f314 = W-2 baseline, D4); filterwarnings D13 = NO filter needed (Warp emits no Warning under strict pytest); common-py layout = src/ (Stage-1a mirror inputs documented); W-5 format-interop contract enumerated (compare_captures sim.{name,category} HARD_FAIL surface); Subsystem-7 design-time trajectory BOUNDED+MONOTONE-DECAYING (max 1.0->0.219/400 steps); 1a/1b/1c scope CONFIRMED toward charter §2 with one reconciliation (S0-W1). Task 0.0: bit-identity replay 9399fc33...718909f34 HELD (33rd+); integrity sweep c19492ad...d22cb52 baseline-MATCH (streak HELD, 9th sub-phase, FIRST Stack-E). 1 shift (S0-W1); cumulative 168 -> 169. NOT implementation: common/common-warp/ NOT created. No -phase-N tag. Operator routes Stage 1a separately."
head_sha: dd7106e71fb9d27343c5d758b4c1e289ce83871d
head_sha_at_checkpoint: 090ac940dec42c3c4821e8f35ec2358745e0cc5d
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/plan-drafting-landing-2026-05-24T18-47-00Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/plan-drafting-probe-2026-05-24T18-47-00Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-checkpoint-2026-05-23T14-06-40Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/landing-2026-05-24T18-30-00Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-evidence-warp-determinism-2026-05-24T20-03-28Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-replay-2026-05-24T20-03-28Z.txt
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-integrity-sweep-2026-05-24T20-03-28Z.txt
  - docs/phases/sub-phase-common-warp-bootstrap.md
  - docs/conventions/sub-phase-conventions.md
  - docs/common/taichi.md
  - tools/testkit/schemas/capture-v1.json
  - tools/testkit/equivalence/harness.py
  - common/common-py/pyproject.toml
evidence_hashes:
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-replay-2026-05-24T20-03-28Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-integrity-sweep-2026-05-24T20-03-28Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
  docs/conventions/sub-phase-conventions.md: sha256:f4eb7eb705f6a8577127a3d83170ca68b4a1baec28c017be770f995daa7b292d
  docs/common/taichi.md: sha256:a420d275a154508bb03859addd169585e562301c2a9afb736945a3888b372e04
  tools/testkit/schemas/capture-v1.json: sha256:7715a50a1bce771f86935b596326283773b7fa58fa40afac2c0fe7c030943735
  tools/testkit/equivalence/harness.py: sha256:4a1478c86b1e23aa4ab89faf17286290305c94d999db0ca7f627ef24acff9958
  common/common-py/pyproject.toml: sha256:a663ea10adb8ba1d25dc1266c7d5b15546b5c537f7291cf57ac8b0c75f108b3f
---

# Common-Warp Bootstrap — Stage 0 (Pre-Flight) Checkpoint

> Stack-E (Python / NVIDIA Warp) workspace-surface bootstrap. Stage 0 is the
> **empirical-verification** stage: Warp installed, CPU determinism probed,
> filterwarnings HEAD-verified, common-py layout characterized, W-5 contract
> enumerated, Subsystem-7 trajectory design-checked, 1a/1b/1c scope confirmed.
> **Stage 0 is NOT the implementation** — `common/common-warp/` is NOT created
> here (that is Stage 1a, routed separately by the operator). The Task 0.2
> verification kernel is ephemeral; its source lives in the Stage-0 determinism
> evidence artifact, NOT in `common/common-warp/`.

## § 1. Scope

(FACT — charter `docs/phases/sub-phase-common-warp-bootstrap.md` § 2 Stage-0
row + operator Stage-0 dispatch SECTION 4 Tasks 0.0–0.8.)

Stage 0 pre-flights the common-warp bootstrap: it empirically verifies the
preconditions the Stage-1a/1b/1c implementation depends on and produces the
Stage-1a-dispatch inputs. Additive-only (Convention A): this checkpoint + the
determinism evidence artifact + the two reproducibility `.txt` files are the
only deliverables; **no source modification, no `common/common-warp/` tree, no
workspace-member edit, no `docs/dependencies.md`/`warp.md` authoring** (those
are Stage 1a/1c). The Warp install was **ephemeral** (`/tmp` venv); no tracked
`pyproject.toml` was touched.

## § 2. Operator routing consumed (D1–D14 ratified)

All fourteen ratifications from the Stage-0 dispatch SECTION 1 were consumed as
given. Stage-0-relevant rows:

| D | Ratification | Stage-0 action |
|---|---|---|
| D1 | name `sub-phase-common-warp-bootstrap` | charter/audit-dir already match (no action) |
| D2 | 3-stage; Stage 1 sub-split 1a/1b/1c per §1.9.1 | Task 0.7 confirms allocation |
| D3 | pin `warp-lang>=1.13,<2.0` | Task 0.1 re-verifies at install (1.13.0; still latest) |
| D4 | CPU bit-exact-same-hw / GPU epsilon-bounded | Task 0.2 empirically verifies CPU bit-identity (6/6) |
| D5 | smoke = §1.9.1 Subsystem-7 (2D adv-diff 64×64, decaying) | Task 0.6 design-checks trajectory (Stage 0 does NOT implement) |
| D6 | pkg `bit-physics-common-warp` / import `common_warp` | Task 0.4 verifies common-py layout (src/) + proposes mirror |
| D7 | `warp.md` mirrors `taichi.md` 8-section | Stage 1c authors (Stage 0 read taichi.md for reference) |
| D8 | W-5 = format-interoperability | Task 0.5 documents the contract at HEAD |
| D9 | next sub-phase MPM Stack-E | informational; routed separately |
| D10 | NO TAG | honored (§ 14) |
| D11 | replay anchor `v0.1.0-phase-1` | Task 0.0 (33rd+ invocation) |
| D12 | CI-red LFS-bandwidth ONGOING known-banked | Task 0.8 documents (§ 11) |
| D13 | filterwarnings iff-Warp-emits | Task 0.3 verdict: NO filter needed |
| D14 | 20th workspace member at Stage 1a | Stage 0 does NOT register (§ 6 boundary) |

## § 3. Task 0.0 — Preflight

(FACT — `git rev-parse HEAD`; `stage-0-replay-2026-05-24T20-03-28Z.txt`
sha256 `9399fc33…718909f34`; `stage-0-integrity-sweep-2026-05-24T20-03-28Z.txt`
sha256 `c19492ad…d22cb52`.)

- **HEAD == `090ac940dec42c3c4821e8f35ec2358745e0cc5d`.** No drift since
  plan-drafting close. Working tree carries only untracked artifacts (`.claude/`;
  two `captures/eulerian-smoke-stack-d/taylor-green-128cube-seed42-step500.{h5,json}`
  held-local per smoke landing § 11) — **no tracked-state change** (Hard Rule 2
  drift-check clear).
- **Bit-identity replay (D11).** `python -m integrity.scripts.replay_prior_phase
  --prior-phase phase-1 --audit …/phase-1/landing-…md --gates integrity,pytest,
  equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` →
  8/8 gates PASS, `ok=True`, exit 0. Output sha256
  `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` —
  **byte-identical to the bit-identity replay invariant. HELD (33rd+ invocation;**
  32nd was eulerian-smoke-stack-d landing § 4).
- **Integrity sweep baseline-match.** `python -m integrity --all --mode strict`
  → `0 HARD_FAIL, 14 SOFT_WARN`, output sha256
  `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
  **baseline-MATCH. Byte-identical streak HELD into the 9th sub-phase** (the
  FIRST Stack-E entrant). (`.claude/` untracked dir did not perturb the sweep —
  integrity scans tracked files only.)
- **Plan-drafting artifacts present + unedited.** probe (`3ae3d281`), charter
  (`7ff2874e`), plan-drafting landing (`a0ec85be`), SHA back-fill (`090ac94`) all
  present; no working-tree modification.

Task 0.0 verdict: **PASS** (bit-identity HELD 33rd+; integrity baseline-MATCH;
no drift; artifacts intact).

## § 4. Task 0.1 — Warp 1.13.0 install + version-pin verify

(FACT — ephemeral `uv venv /tmp/warp-probe --python 3.12` + `uv pip install
'warp-lang>=1.13,<2.0' 'numpy>=2.0'`; Convention #8 web-fetch
`github.com/NVIDIA/warp/releases` 2026-05-24.)

- **(a) Install:** `warp-lang==1.13.0` + `numpy==2.4.6` installed cleanly into
  the throwaway `/tmp/warp-probe` venv (131.9 MiB wheel). **No tracked-file edit**
  (Convention A; the install is ephemeral for empirical verification, NOT a
  workspace dep — that is Stage 1a).
- **(b) Version pin:** `import warp; warp.__version__` → `1.13.0`. **Pin range
  `warp-lang>=1.13,<2.0` (D3) CONFIRMED** — 1.13.0 satisfies it.
- **(c) Latest-version re-fetch:** `github.com/NVIDIA/warp/releases` lists
  **1.13.0 as the latest stable**; no 1.14.x and no 2.x has shipped since
  plan-drafting (1.13.0 released 2026-05-04 per probe § 6; recent line 1.12.1 /
  1.12.0 / 1.11.x / 1.10.x). **No re-pin needed.** (Stage 1a re-fetches at the
  moment of dependency declaration per Convention #8.)
- **(d) Python ABI compatibility:** wheel metadata `Requires-Python: >=3.10`;
  classifiers Python 3.10/3.11/3.12/3.13/3.14. Repo constraint `requires-python =
  ">=3.12"` → **compatible** (3.12 in range; verified by clean import on CPython
  3.12.3). The wheel bundles the native runtime (`warp.so`); only runtime dep is
  `numpy`. No Python-version blocker.

Task 0.1 verdict: **PASS** (1.13.0 installed; pin confirmed; ABI-compatible;
still upstream-latest).

## § 5. Task 0.2 — CPU-mode determinism empirical verification (W-2 baseline)

(FACT — full kernel source + raw 6-run output in
`stage-0-evidence-warp-determinism-2026-05-24T20-03-28Z.md`.)

A minimal `@wp.kernel` pair on `device="cpu"` exercising the three Task-0.2(b)
surfaces — pure-literal f64 constants (`1.0/3.0` + `0.1`; banked #7 / O-W2),
scalar reduction via `wp.atomic_add` (atomic surface), array-to-array write —
plus a seeded `wp.rand_init`/`wp.randf` fill. 6 independent in-process runs
(3 pairs), identical `SEED=42` + inputs, sha256 over `(out||acc)` bytes:

```
run 1..6: 24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314
unique_hashes=1  →  VERDICT: DETERMINISTIC (6/6 bit-identical)
```

**6/6 sha256 match. CPU bit-exact-same-hw VERIFIED.** This digest
`24d44c7e…0746f314` is the empirical **W-2 baseline** under the D4 posture.
On the CPU backend the launch runs serially over the launch dimension (single
thread), so the `atomic_add` f64 reduction is order-deterministic — the Warp
analog of Taichi `cpu_max_num_threads=1` / numba `parallel=False` (R-W1). GPU
atomics remain non-deterministic (out of bootstrap scope; CPU is the
determinism path). **Hard Rule 2 (CPU bit-determinism failure) NOT triggered.**

Task 0.2 verdict: **PASS (6/6).**

## § 6. Task 0.3 — Filterwarnings posture HEAD-verify (D13)

(FACT — `python -W error -c "import warp; wp.init()"`; minimal Warp pytest under
`-W error` CLI **and** `filterwarnings=["error"]` ini.)

- **(a) Runtime strict-pytest:** a minimal Warp-using test (`wp.init()` +
  `wp.launch` of a CPU kernel) under BOTH `pytest -W error` and a
  `filterwarnings=["error"]` `pytest.ini` (mirroring `common-py`'s posture) →
  **`1 passed`, exit 0** in both. No warning converted to a test failure.
- **(b) Compile/import-time:** `import warp; wp.init()` and kernel decoration /
  compilation under `-W error` raise **no** Python `SyntaxWarning` /
  `DeprecationWarning` (the Task 0.2 run also compiled kernels under `-W error`
  with no warning-as-error before its verdict).
- **(c)/(d) Verdict — NO filter needed.** **D13 resolves to its "no" branch:
  Warp 1.13.0 emits no Python `Warning` that reaches pytest's strict gate, so
  `common-warp/pyproject.toml` needs NO bare-form `filterwarnings` entry** —
  unlike `common-py`, which needed `ignore::DeprecationWarning:taichi.*` +
  the locale filter for Taichi. The S0-1 bare-form discipline stays available
  but is not exercised (the lean was "iff Warp warns"; it does not).

**Observation (non-blocking, forward-flag for Stage 1a):** a single
`ResourceWarning` (implicit cleanup of Warp's precompiled-header
`TemporaryDirectory /tmp/wp_pch_*`) fires in the interpreter-**shutdown** weakref
finalizer (`_exitfunc`), observable under raw `python -W error`. It does NOT
reach pytest's `filterwarnings` gate (it occurs after the session ends) and does
NOT fail the run. IF a future Stage-1a test harness is configured to capture
shutdown-time warnings (non-default), revisit; under the standard `common-py`
posture, no filter is required. (Recorded as observation O-W5.)

Task 0.3 verdict: **PASS — no-emission; no Stage-1a filter line required.**

## § 7. Task 0.4 — common-py layout HEAD-verify (D6 → Stage-1a inputs)

(FACT — `common/common-py/` tree at HEAD; `pyproject.toml` sha256
`a663ea10…108b3f`; `src/common_py/__init__.py`.)

- **(a) Layout = `src/` (NOT flat).** common-py is
  `common/common-py/src/common_py/` (modules: `capture.py`, `determinism.py`,
  `alembic.py`, `vdb.py`, `plotting.py`, `ggui.py`, `hotreload.py`), with
  `tests/` and `smoke/` siblings of `src/`. The §1.9.1 spec illustrates a **flat**
  `common/common-warp/common_warp/`; common-py's established workspace precedent
  is **`src/`**. **Proposal for Stage 1a (D6): adopt `src/common_warp/`** for
  common-py parity (consistent hatchling `packages=["src/common_warp"]`, mypy
  `files=["src/common_warp"]` + `mypy_path="src"`). The layout decision is
  **Stage-1a's first commit**, not Stage 0's; recorded here as the recommended
  input. (Operator may instead route the spec-literal flat layout.)
- **(b) `pyproject.toml` specifics common-warp will mirror:**
  - `[project]` `name = "bit-physics-common-py"`, `version = "0.0.0"`,
    `requires-python = ">=3.12"`, `license = { file = "../../LICENSE" }`.
    → common-warp: `name = "bit-physics-common-warp"`, `version = "0.1.0"`
    (§1.9.1; bumps at Phase-3.7), same `requires-python`/license.
  - `dependencies` pattern: `bit-physics-testkit` (workspace) + `h5py>=3.10` +
    `numpy>=2.0` + the runtime DSL (`taichi>=1.7,<2.0`). → common-warp swaps the
    DSL line for `warp-lang>=1.13,<2.0` (D3) and keeps testkit/h5py/numpy
    (watchfiles is common-py-specific hot-reload; likely not needed).
  - `[project.optional-dependencies].dev`: `mypy>=1.10`, `pytest>=8.0`,
    `pytest-cov>=5.0`, `ruff>=0.5`. → mirror verbatim (add `pytest-timeout` only
    if a Stage-1 test needs it; common-py does not declare it).
  - **`[tool.pytest.ini_options].filterwarnings`:** common-py = `["error",
    "ignore::DeprecationWarning:taichi.*", "ignore:.*locale\\.getdefaultlocale.*
    :DeprecationWarning"]`. → common-warp = **`["error"]` only** per Task 0.3
    (NO Warp filter needed). `testpaths = ["tests"]`.
  - `[build-system]` `hatchling` / `[tool.hatch.build.targets.wheel] packages =
    ["src/common_py"]`. → `["src/common_warp"]`.
  - `[tool.ruff]` `line-length = 100`, `target-version = "py312"`;
    `[tool.ruff.lint] select = ["E","F","I","B","UP","SIM","RUF"]`. → mirror.
  - `[tool.mypy]` `strict = true`, `python_version = "3.12"`,
    `files = ["src/common_py"]`, `mypy_path = "src"` + an `[[overrides]]` block
    `ignore_missing_imports = true` for untyped deps. → common-warp adds
    `warp`/`warp.*` to the override list (Warp ships partial type stubs; verify
    at Stage 1a).
  - `[tool.uv.sources] bit-physics-testkit = { workspace = true }`.
  - **Workspace registration position:** root `pyproject.toml
    [tool.uv.workspace].members` (19 entries at HEAD — enumerated § 10);
    common-py is the 14th entry. common-warp appends as the **20th** (D14) —
    **at Stage 1a**, NOT here.
- **(c) Module-internal / public-API pattern:** `src/common_py/__init__.py`
  re-exports submodules via `from . import <mod>` + an explicit `__all__` list
  (module-level surface, not symbol-level). → common-warp's
  `src/common_warp/__init__.py` mirrors this with the §1.9.1 top-level import
  contract (`init`, `deterministic_context`, `Capture`, `read_capture`,
  `write_capture`, `set_seed`, `get_seed`, `assert_deterministic_run`,
  `Particles`, `allocate_particles`, `ScalarField3D`, `VectorField3D`,
  `allocate_*`, `HashGrid`) + `__version__ = "0.1.0"`, plus a private
  `_internal/` (not exported).

Task 0.4 verdict: **PASS — layout = src/; Stage-1a mirror inputs documented.**

## § 8. Task 0.5 — W-5 format-interoperability contract HEAD-verify (D8)

(FACT — `tools/testkit/equivalence/harness.py` sha256 `4a1478c8…ff9958` read
end-to-end; `tools/testkit/schemas/capture-v1.json` sha256 `7715a50a…943735`.)

- **(a) `compare_captures(left, right, tolerance_table_path=None) ->
  EquivalenceVerdict`** loads both captures (`capture.load_capture`), resolves
  category tolerance from `tolerance.toml`, and diffs field-by-field per step.
  HARD_FAIL surfaces (return `within_tolerance=False` with a synthetic
  `per_field_diff` key) are, in order: **(i)** `sim.category` OR `sim.name`
  mismatch → `sim:category-mismatch` (harness lines 104–115); **(ii)** step-set
  mismatch → `step:set-mismatch`; **(iii)** per-field missing → `…:missing`;
  **(iv)** shape mismatch → `…:shape-mismatch`. A **dtype** mismatch raises
  `TypeError` (not a soft verdict). Otherwise it returns per-field
  `{max_abs_err, max_rel_err}` and `within_tolerance` against `atol + rtol*scale`.
- **(b) Capture-format requirements** (the producer common-warp must satisfy so
  `compare_captures` ingests its capture):
  - **HDF5 payload + JSON manifest sidecar** (`<path>.h5` + `<path>.json`), read
    by the flat `capture` module (`load_capture`). The manifest validates against
    `capture-v1.json`: required top-level keys `schema_version, sim, stack,
    config, run, payload, determinism` (`additionalProperties:false`).
  - `sim`: required `{name, category, variant}` (all non-empty strings).
  - `stack`: required `{name, version, build_id}`.
  - `config`: required `{tier, dims (int array ≥1), dtype ∈ {f32,f64}, seed
    (int), params (object)}`.
  - `run`: required `{step_count, capture_interval≥1, wall_clock_seconds≥0,
    start_utc}`.
  - `payload`: required `{format == "hdf5", path, checksum
    "^sha256:[0-9a-f]{64}$"}` — `checksum` is **informational only** (determinism
    contract lives at the spec § 2.5 harness, not byte-equality).
  - `determinism`: required `{claimed ∈ {bit-exact-same-hw, epsilon,
    non-deterministic}, atomic_ops (bool), subgroup_ops (bool)}`. → common-warp's
    CPU smoke declares **`bit-exact-same-hw`** (grounded by Task 0.2).
- **(c) Concrete W-5 acceptance criterion (D8 = format-interoperability):** *the
  common-warp Subsystem-7 smoke capture, when passed to `compare_captures`
  alongside an equivalent common-py/common-cpp smoke capture, produces an
  `EquivalenceVerdict` (`within_tolerance=True|False`) **without** a HARD_FAIL
  schema/category/step/shape error or a dtype `TypeError`.* Whether the verdict
  is `True` or `False` is **NOT** the W-5 criterion — W-5 is format-interop.
  **Constraint (R-W7):** the partner captures at HEAD are common-py
  `hello-taichi-smoke` (category `smoke`, 1D `dims=[64]`, f64) and
  `advection-1d-smoke`; `compare_captures` HARD_FAILs on `sim.{name,category}`
  mismatch, so a *meaningful* (non-`sim:category-mismatch`) diff requires Stage 1c
  to **align the hello-warp manifest `sim.{name,category}` to a partner**
  (e.g. category `smoke`) — physics differs (2D vs 1D) so a real numeric diff is
  expected; numeric cross-stack equivalence is deferred to the per-sim Stack-E
  ports (D8). Stage 1c's W-5 test demonstrates the format-interop verdict.

Task 0.5 verdict: **PASS — contract + schema requirements enumerated; D8 criterion
made concrete.**

## § 9. Task 0.6 — Subsystem-7 design-time bounded-trajectory check (S6 analog)

(FACT — pure-NumPy reference, NOT Warp, pre-Stage-1c; run on this runner.)

- **(a) Canonical parameters Stage 1c implements:** grid **64×64**, IC localized
  **Gaussian** bump (σ = N/12, centered), advection velocity **U=(0.5, 0.3)**
  cells/time (small constant), diffusion coefficient **D=0.10**, time step
  **dt=0.5**, horizon **400 steps**, periodic BC, explicit FTCS diffusion +
  first-order upwind advection (both dissipative). Stability:
  diffusion-number `D·dt/dx² = 0.05` (< 0.25, stable); advection Courant
  `(|ux|+|uy|)·dt/dx = 0.40` (< 1, stable).
- **(b) Result — BOUNDED + MONOTONICALLY DECAYING:**
  ```
  step    0: max_field=1.000000e+00
  step   50: max_field=6.855799e-01
  step  100: max_field=5.267213e-01
  step  200: max_field=3.582617e-01
  step  400: max_field=2.186833e-01   decay_ratio=0.2187   n_increases=0
  mass(sum) ratio = 1.000000 (conserved under periodic BC)
  VERDICT: BOUNDED + MONOTONICALLY-DECAYING (S6 design-time check PASS)
  ```
- **(c) Stage-1c implementation target:** `max_field` strictly non-increasing
  from 1.0 → ~0.219 over 400 steps (zero increases); finite throughout; mass
  conserved. The `test_smoke_e2e.py` (W-3) asserts bounded/non-growing
  max-field. This is the **laminar opposite** of the chaotic Taylor-Green
  smoke-Stack-D port — the S6 false-laminar risk (conventions § L.4) does NOT
  apply (the decay is genuine, diffusion + numerical-diffusion driven).
  *Note:* the global Péclet is high (≈512), but the local cell-Péclet
  (`|u|·dx/D = 8`) keeps upwind advection stable + diffusive; Stage 1c MAY raise
  D / lower U for a more purely diffusion-dominated regime — the monotone-decay
  W-3 criterion holds at the verified set regardless.

Task 0.6 verdict: **PASS — bounded-decaying confirmed at design time.**

## § 10. Task 0.7 — 1a/1b/1c scope-analysis (Stage-1a-dispatch input)

(FACT — §1.9.1 seven-subsystem numbering from charter § 4 layout; charter § 2
Stage table; harness/determinism coupling verified at HEAD.)

**Canonical §1.9.1 subsystem numbering** (charter § 4): **1** Runtime
(`init`/`deterministic_context`), **2** Capture (`Capture`/`read_capture`/
`write_capture`), **3** Determinism (`set_seed`/`get_seed`/
`assert_deterministic_run`), **4** Particles, **5** Grids
(`ScalarField3D`/`VectorField3D`), **6** HashGrid, **7** Smoke-sim.

**Proposed allocation — CONFIRMS charter § 2** (subsystem-decomposition split per
D2), with the dispatch-prompt Task-0.7 restatement reconciled to it (see S0-W1):

| Sub-stage | §1.9.1 subsystems | W-Gates | Touch set (additive) |
|---|---|---|---|
| **1a** | **1 Runtime + 3 Determinism** (+ pkg/registration) | **W-2 mechanism** | create `common/common-warp/` skeleton (`pyproject.toml` `bit-physics-common-warp`, `warp-lang>=1.13,<2.0` D3, hatchling, `src/common_warp/` per § 7 D6; `README.md`); `src/common_warp/runtime.py` (`init`/`deterministic_context`; `device="cpu"` override of GPU-default per R-W3); `src/common_warp/determinism.py`; `__init__.py` skeleton; **register 20th workspace member** (root `pyproject.toml` + `[tool.uv.sources]`; D14); `tools/testkit/warp_harness/` non-shadowing determinism regression test (numba § 2 N2; baseline = Task 0.2 digest `24d44c7e…`); `tests/test_runtime.py` + `tests/test_determinism.py`. **No `filterwarnings` line** (Task 0.3). |
| **1b** | **2 Capture + 4 Particles + 5 Grids + 6 HashGrid** | **W-1** | `src/common_warp/capture.py` (`Capture`/`write_capture`/`read_capture` over h5py + testkit `capture` + jsonschema vs `capture-v1.json`; **disambiguate from `wp.capture_*` CUDA-graph capture — O-W1**); `particles.py`, `grids.py`, `hashgrid.py`; `tests/test_capture.py` + `test_particles.py` + `test_grids.py` + `test_hashgrid.py`. |
| **1c** | **7 Smoke** (+ public API + verification) | **W-3, W-4, W-5, W-6** (+ W-2 completion) | `examples/hello/` 2D adv-diff (Task 0.6 params; `@wp.kernel` f64-literal discipline per O-W2/banked #7); `tests/test_smoke_e2e.py` (bounded-trajectory assert); **W-5 format-interop test** (D8; align manifest `sim.{name,category}`); `docs/common/warp.md` (8-section `taichi.md` mirror, D7); `docs/dependencies.md` `warp-lang` row; the full §1.5.2 W-2 gate ("testkit determinism harness GREEN on the smoke simulator") completes here via `run_twice_and_diff` on the smoke runner. |

**Reconciliations (S0-W1; § 12):**
1. The dispatch-prompt's Task-0.7 sub-numbering (`1a={1,2,5}`, `1b={3,6}`,
   `1c={4,7}`) diverges from both probe § 8 D2 and charter § 2 and is internally
   label-inconsistent (it labels subsystem 2/5 as "determinism"). **Reconciled to
   the charter's clean §1.9.1-subsystem grouping** (1a=1+3 foundation; 1b=2+4+5+6;
   1c=7) on dependency grounds.
2. **W-2 splits:** the §1.5.2 W-2 gate references "the smoke simulator," and the
   canonical testkit gate `run_twice_and_diff` diffs **captures**. So the *full*
   W-2 gate completes at **1c** (needs Subsystem 7 + Capture), while the W-2
   **mechanism** (`--deterministic`/seed + the `warp_harness/` regression test,
   baselined by Task 0.2) lands at **1a**. Operators should not expect a
   fully-green §1.5.2 W-2 on the smoke sim at 1a close — only the determinism
   mechanism + the self-contained regression test.
3. **Capture placement:** Capture (Subsystem 2) co-locates with the data
   structures it serializes (Particles/Grids/HashGrid) and the W-1 round-trip at
   **1b** — slightly later than the charter's literal "W-1 + W-2 gated at 1a,"
   because the W-2 mechanism does not depend on Capture (the regression test is a
   self-contained NumPy-vs-Warp comparison, like `taichi_harness`).

**Open scope consideration for Stage 1c (not a blocker):** §1.5.2 W-3 says the
smoke "exercises every public subsystem," but a pure-grid 2D advection-diffusion
naturally exercises Runtime + Determinism + Grids + Capture and **NOT** Particles
(4) or HashGrid (6). Stage 1c either (a) augments the hello sim to touch
Particles/HashGrid token-ly, or (b) exercises 4/6 via their own unit tests
(`test_particles.py`/`test_hashgrid.py`) and reads W-3 "exercises every public
subsystem" as collective-across-the-test-suite. Surfaced for the Stage-1c
dispatch.

Task 0.7 verdict: **CONFIRMED (toward charter § 2) + 1 reconciliation shift
(S0-W1).** Stage-1a touch set is explicit above.

## § 11. Task 0.8 — D12 CI-red banked acknowledgment

(FACT — eulerian-smoke-stack-d landing § 11 / smoke D13; charter § 8 + D12.)

The remote-CI red state (GitHub Actions LFS download-**bandwidth-quota**
exhaustion on `.h5` smudge during checkout) is **ONGOING / known-banked**. No
action at Stage 0. Local verification is unaffected: Task 0.0 replay + integrity
sweep both ran GREEN locally; common-warp's eventual hello capture is tiny
(64×64 2D scalar field ≪ MB → negligible LFS pressure). Stage 2 will document the
local-only posture if the quota still blocks CI at landing time.

Task 0.8 verdict: **ACKNOWLEDGED (no action).**

## § 12. Banked items / observations / methodology-precedents consumed

- **Banked precedents honored (conventions § L.4):** S6-trajectory-simulation
  (Task 0.6 design-time analog — bounded-decaying verified, the laminar opposite
  of chaotic Taylor-Green); cross-stack-as-defect-amplifier (informs W-5, not
  exercised at bootstrap — no cross-stack pair); banked #7 pure-literal f64-seed
  (Task 0.2 kernel uses explicit `wp.float64(1.0)/wp.float64(3.0)`; documented as
  inherited O-W2 discipline for the Stack-E ports — Warp's literal inference to be
  finalized in Stage-1c kernels).
- **Observations:** O-W1 (`wp.capture_*` CUDA-graph vs HDF5-capture naming
  collision — Stage 1b `capture.py` + Stage 1c `warp.md` must disambiguate);
  O-W2 (pure-literal f64 in `@wp.kernel`); O-W4 (common-warp is "shipped, then
  wired" — consumed only by its own tests at landing, wired by the Stack-E ports);
  **O-W5 (NEW) — Warp PCH `ResourceWarning` at interpreter shutdown** (§ 6;
  non-load-bearing; does not reach pytest's gate).
- **STAY-BANKED (no fold path through bootstrap):** LFS-architecture (D12), LBM
  `sim_runner_diagnostic` cosmetic, actionlint/check-yaml/supply-chain,
  manifest-equality test, Phase-1 open items, methodology full-formalization,
  Phase-1-canonical re-characterization (inherited by the Stack-E smoke port).

## § 13. Stage 1a readiness verdict

**READY.** All Stage-1a preconditions verified: Warp 1.13.0 installable +
pin-compatible + ABI-compatible (Task 0.1); CPU bit-determinism empirically holds
(Task 0.2 — the W-2 baseline); no `filterwarnings` work needed (Task 0.3);
common-py `src/` layout + pyproject pattern documented as the Stage-1a mirror
(Task 0.4); the Stage-1a touch set is explicit (§ 10). No blocking dependency; no
Hard Rule 2 trigger. Operator routes Stage 1a separately (workspace registration
+ Runtime/Determinism + W-2 determinism mechanism + `warp_harness/`).

## § 14. Verdict

**Stage 0 CONFIRMED.** Empirical-verification stage complete; `common/common-warp/`
NOT created (Stage 1a's scope). 1 shift this stage (**S0-W1** scope-allocation
reconciliation); cumulative **168 → 169**. Bit-identity replay HELD (33rd+);
integrity sweep baseline-MATCH (streak HELD into the 9th sub-phase, the FIRST
Stack-E entrant). **No `-phase-N` tag** (D10; spec § 7.12 reserves `v0.<N>.0-
phase-<N>` for spec-phase boundaries). This checkpoint + the determinism evidence
artifact land on `main` (trunk-based; no push, no tag); the Convention #12 SHA
back-fill follows as a SEPARATE commit.

---

*End of Stage-0 checkpoint. SHA back-fill follows (Convention #12 + N1
enumeration); operator reviews this close and dispatches Stage 1a separately.*
