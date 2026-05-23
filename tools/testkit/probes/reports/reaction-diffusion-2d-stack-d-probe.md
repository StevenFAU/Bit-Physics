# Pre-implementation probe — reaction-diffusion-2d-stack-d

> Per template at `tools/testkit/probes/template.md`. Sibling to
> `reaction-diffusion-2d.md` (Stack-B Phase 0 Block 8 probe). First
> per-sim cross-stack port probe under spec-Phase-2.

## 1. Scope

Substantiates the API surfaces, upstream citations, and fixture paths
the RD-2D Gray-Scott Stack-D port depends on. Read before authoring the
implementation. Every surface below is grep-verified against the live
source at probe time. Stage-1b's implementation consumes this report's
contract verbatim.

## 2. API surfaces consumed

### 2.1 `capture` (testkit) — Block 1 + IC-2 wrappers

| Symbol | Source | Used for |
|---|---|---|
| `CaptureManifest` | `tools/testkit/capture/__init__.py` | Manifest dataclass for the Stack-D canonical capture |
| `StepState` | `tools/testkit/capture/__init__.py` | Per-step state tuple (U + V arrays + diagnostics) |
| `Capture`, `load_capture` | `tools/testkit/capture/__init__.py` | Re-load the Stack-D + Stack-B canonical captures |
| `write_capture` | `tools/testkit/capture/__init__.py` | Produce the Stack-D canonical capture |

### 2.2 `determinism` (testkit) — IC-14 Python

| Symbol | Source | Used for |
|---|---|---|
| `SimRunner` (Protocol) | `tools/testkit/determinism/harness.py` | Sim-runner protocol for `run_twice_and_diff` |
| `DeterminismVerdict` | `tools/testkit/determinism/harness.py` | Verdict dataclass (`content_equivalent`, `detail`) |
| `run_twice_and_diff` | `tools/testkit/determinism/harness.py` | Gate-10 determinism witness |

### 2.3 `property` (testkit) — Block 3 + Phase-1 extension

| Symbol | Source | Used for |
|---|---|---|
| `Invariant`, `Pass`, `Fail`, `InvariantOutcome`, `PropertyVerdict` | `tools/testkit/property/harness.py` | Invariant declarations |
| `run_invariants` | `tools/testkit/property/harness.py` | PBT test driver |
| `strategies.smooth_scalar_field_in_unit_box(shape, lo, hi)` | `tools/testkit/property/strategies.py` | IC strategy for Stack-D PBT |

### 2.4 `diagnostics` (Block 6) — Tier 1 + Tier 2 scalar_field

| Symbol | Source | Used for |
|---|---|---|
| `check_health` | `tools/diagnostics/diagnostics/__init__.py` | NaN/Inf scan against Stack-D canonical capture |
| `check_bounds` (Tier 2 scalar_field) | `tools/diagnostics/diagnostics/__init__.py` | U, V ∈ [0, 1] verification |

### 2.5 `equivalence` (testkit) — gate-14 cross-stack diff (Stage 1c consumption)

| Symbol | Source | Used for |
|---|---|---|
| `compare_captures` | `tools/testkit/equivalence/harness.py` | Cross-stack diff Stack-B ↔ Stack-D |
| `EquivalenceVerdict` | `tools/testkit/equivalence/harness.py` | Verdict (`within_tolerance`, `per_field_diff`, `tolerance_table_used`) |
| `tolerance.toml` `[budgets.reaction-diffusion].relative = 1e-4` | `tools/testkit/equivalence/tolerance.toml` | Category default; no per-sim override per Stage 0 Task 0.1 |

### 2.6 `common_py` — IC-11 + IC-2 Python wrappers

| Symbol | Source | Used for |
|---|---|---|
| `Config(deterministic, seed)` | `common/common-py/src/common_py/determinism.py` | IC-4 config dataclass |
| `set_taichi_deterministic(config, arch="cpu")` | `common/common-py/src/common_py/determinism.py` | IC-11 Taichi init wrapper |

### 2.7 `taichi` (Stack-D DSL) — IC-12 contract

| Surface | Used for |
|---|---|
| `taichi >= 1.7, < 2.0` (pinned at `common/common-py/pyproject.toml`) | Stack-D Taichi-DSL kernels |
| `@ti.kernel` + `ti.types.ndarray(dtype=ti.f64, ndim=2)` | Kernel signature; consumes NumPy ndarrays directly (no Taichi snode-tree allocation per resolution) |
| `ti.ndrange(n, n)` row-major iteration | Per-cell stencil index space |
| IC-12 § 4.2 — NO `from __future__ import annotations` in kernel modules | Annotation-resolver discipline |
| IC-12 § 4.6 — NO `-> None` return annotation on `@ti.kernel` | AST-transformer discipline |
| IC-12 § 4.5 — `filterwarnings` includes `ignore::DeprecationWarning:taichi.*` + locale-specific filter | Strict-warnings posture under Python 3.12 locale deprecation |

### 2.8 MMS pipeline (Phase-1 RD-3D R8 deliverable)

| Symbol | Source | Used for |
|---|---|---|
| `GrayScott2DSolution` | `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` | Gate-4 manufactured solution; `evaluate(X, Y, t)` + `source_term(X, Y, t)` |
| `derivation.md` | `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/derivation.md` | SymPy derivation reference |

## 3. Upstream citations

- Gray, P. & Scott, S. K. (1983) — `chemistry-engineering-science 39 (6), 1087-1097`.
- Pearson, J. E. (1993) — `science 261 (5118), 189-192`.
- Salari & Knupp (2000) — MMS methodology (consumed via the testkit's
  MMS pipeline; not a vendored anchor at this sub-phase).
- `spec-ref.md` (Stack-B sibling) — primary cross-reference.
- `docs/common/taichi.md` — Stack-D convention; IC-12.

No new vendored code. The citations are textual references in
`spec-ref-stack-d.md` § 2 (sibling-cross-references Stack-B's `spec-ref.md`).

## 4. Test-fixture paths

| Path | Purpose | Producer |
|---|---|---|
| `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5` | Stack-D canonical capture payload | `sim_runner_seeded(seed=42, ...)` |
| `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json` | Stack-D canonical capture manifest | `sim_runner_seeded(seed=42, ...)` |
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` | Stack-B canonical capture (cross-stack equivalence partner) | Stack-B Phase 0 Block 8 (FROZEN; sha256 `bcae544a…f92148f0` + `585d7d8a…03d3a7bc`) |
| `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt` | Stage 1a failing-tests RED evidence (sha256 `685e5cc0…23ad6446`) | Stage 1a commit `ca9bc0b…` |
| `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-<UTC>.txt` | Stage 1b GREEN evidence | Stage 1b commit |
| `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}` | Schema-corpus entry (Stage 1c) | Stage 1c commit (deferred from Stage 1b) |

## 5. Public types / functions / structs exported

The Stack-D package will export (Cat 2 `python-exports` surface):

```python
# packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/__init__.py
# (minimal — submodules carry the public-API)

# reference/__init__.py
from .gray_scott_taichi import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT,
    GrayScottParams,
    canonical_params,
    evolve,
    initial_condition,
    step,
)

# reference.gray_scott_taichi
@dataclass(frozen=True)
class GrayScottParams:
    n: int
    Du: float
    Dv: float
    F: float
    k: float
    dx: float
    dt: float

def canonical_params() -> GrayScottParams
def initial_condition(p, seed) -> tuple[np.ndarray, np.ndarray]
def step(u, v, p) -> tuple[np.ndarray, np.ndarray]
def evolve(p, seed, n_steps, *, capture_interval) -> Iterator[(int, np.ndarray, np.ndarray)]

@ti.kernel
def step_diffuse_react(u, v, u_next, v_next, D_u, D_v, F, k, dt, dx, n): ...
@ti.kernel
def step_diffuse_react_with_source(u, v, u_next, v_next, s_u, s_v, D_u, D_v, F, k, dt, dx, n): ...

# sim
def sim_runner_seeded(seed: int, out_dir: Path) -> Path
def sim_runner_pbt(initial_condition_sample, out_dir: Path) -> Path
def sim_runner_with_source_term(seed, out_dir, *, mms, n, t_final, cfl_safety) -> Path

# invariants
def monotone_bounds_uv(slack=0.5) -> Invariant
def mass_approximately_conserved(tolerance=0.5) -> Invariant
def periodic_bc_satisfied(tolerance=1e-10) -> Invariant
```

Cat 2 (`python-exports`) parses every public symbol declared in the
public modules above.

## 6. Risk surfaces propagating from charter § 9

- **R-P3 — Taichi field-initialization order (R-T1 inherited).** `ti.init`
  via `set_taichi_deterministic` MUST precede every `@ti.kernel` *launch*
  (decoration can be lazy in Taichi 1.7). The Stack-D module follows the
  pattern: module-level `import taichi as ti` → `@ti.kernel` decorations
  → lazy `_ensure_taichi()` invocation inside `step` / `evolve` / sim
  runners before the first kernel launch. Stage 0 + Stage 1b smoke
  verified the pattern empirically.
- **R-P4 — Kernel-launch grid sizing.** Stack-B WGSL uses 8×8 workgroups
  at 128² grid; Stack-D Taichi-cpu uses `ti.ndrange(n, n)` with
  `cpu_max_num_threads=1` (no workgroup analog). Cross-stack equivalence
  is content-equivalent at 1e-4, NOT bit-exact (per spec § 4.4
  limitation #4 FMA fusion + WGSL workgroup-reduction-order differences).
- **R-P5 — MMS pipeline source-term injection.** Mitigated at Stage 0
  Task 0.5; Taichi `field.from_numpy` round-trip bit-exact at float64.
  Stage 1b implements `step_diffuse_react_with_source` using
  `ti.types.ndarray()` arg type (zero-copy NumPy→Taichi at kernel
  launch); gate-4 observed OOA ≥ 1.5 verified across N ∈ {16, 32, 64,
  128}.

## 7. Gate-to-deliverable mapping (charter § 2)

| # | Gate | Stack-D deliverable | Test |
|---|---|---|---|
| 1 | Spec sheet | `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` | (artifact) |
| 2 | Probe report | THIS FILE | (artifact) |
| 3 | Failing tests committed | `packages/reaction-diffusion-2d-stack-d/tests/` + `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt` | Stage 1a `ca9bc0b…` |
| 4 | Code verification (MMS) | `step_diffuse_react_with_source` + `sim_runner_with_source_term` | `test_code_verification.py::test_mms_observed_order_at_canonical_params` |
| 5 | Tier 1 diagnostics | (consumes canonical capture) | `test_diagnostics.py::test_stack_d_canonical_capture_is_healthy` |
| 6 | Tier 2 scalar_field | (consumes canonical capture) | `test_diagnostics.py::test_stack_d_canonical_capture_{U,V}_in_unit_interval` |
| 7 | Cat 1 citations | spec-ref-stack-d.md § 2 + Stack-B cross-ref | `integrity --cat 1` |
| 8 | Cat 2 public API | reference + sim + invariants exports | `integrity --cat 2` |
| 9 | Canonical capture | `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` | (artifact) |
| 10 | Determinism (IC-13) | `sim_runner_seeded` + `run_twice_and_diff` | `test_determinism.py::test_stack_d_is_content_equivalent` |
| 11 | PBT | `invariants.py` + `sim_runner_pbt` | `test_pbt_invariants.py` (3 tests) |
| 12 | Perf-ledger row | `docs/perf-ledger.md` baseline row | (artifact) |
| 13 | Failing-tests replay | `git worktree add /tmp/bp-replay-<stage-1a-sha>-rd2d-stack-d <stage-1a-sha>` | Stage 1b STEP 11 |
| 14 (Phase-2 specific) | Cross-stack equivalence | `compare_captures(stack_b, stack_d)` at `relative = 1e-4` | Stage 1c `test_cross_stack_equivalence.py` (currently SKIPPED) |

## 8. Out-of-scope at Stage 1b (Stage 1c / Stage 2 owners)

- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (Stage 1c).
- Removing the SKIP from `test_cross_stack_equivalence.py` (Stage 1c).
- Schema-corpus entry at `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}` (Stage 1c).
- `CHANGELOG` + `docs/dependencies.md` additive edits (Stage 2 convergence).
- Mutation-score artifact (Stage 2; PATH routing per Stage 2 dispatch).
- Modification of Stack-B Phase-0 code at `packages/reaction-diffusion-2d/` (append-only-protected per conventions doc § A).
- Stack-C / Stack-E anything.
