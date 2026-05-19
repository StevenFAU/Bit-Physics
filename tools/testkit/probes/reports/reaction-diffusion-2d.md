# Pre-implementation probe — reaction-diffusion-2d

> Per template at `tools/testkit/probes/template.md`. Phase 0 Block 8.

## 1. Scope

Substantiates the API surfaces, upstream citations, and fixture paths
the RD-2D Gray-Scott sim depends on. Read before authoring the test
suite or implementation. Every surface below is grep-verified against
the live source at probe time (commit chain at session open through
`origin/main` 1eca036).

## 2. API surfaces consumed

### 2.1 `capture` (testkit) — Block 1

| Symbol | Source line | Used for |
|---|---|---|
| `CaptureManifest` | `tools/testkit/capture/__init__.py:9` | Manifest dataclass for the canonical capture |
| `StepState` | `tools/testkit/capture/__init__.py:10` | Per-step state tuple |
| `Capture`, `load_capture` | `tools/testkit/capture/__init__.py:10,11` | Re-load the canonical capture in tests + diagnostics |
| `write_capture` | `tools/testkit/capture/__init__.py:11` | Produce the canonical capture from the NumPy reference |
| `CaptureDiff`, `diff_captures` | `tools/testkit/capture/__init__.py:8` | Element-wise epsilon diff against the NumPy reference |

### 2.2 `determinism` (testkit) — Block 3

| Symbol | Source line | Used for |
|---|---|---|
| `SimRunner` (Protocol) | `tools/testkit/determinism/__init__.py:8` | Sim-runner protocol for `run_twice_and_diff` |
| `DeterminismVerdict` | `tools/testkit/determinism/__init__.py:8` | Verdict dataclass |
| `run_twice_and_diff` | `tools/testkit/determinism/__init__.py:8` | The determinism test class |

### 2.3 `property` (testkit) — Block 3

| Symbol | Source line | Used for |
|---|---|---|
| `Invariant`, `Pass`, `Fail`, `InvariantResult`, `PropertyVerdict` | `tools/testkit/property/__init__.py:18-22` | Invariant declarations |
| `run_invariants` | `tools/testkit/property/__init__.py:23` | PBT test driver |
| `strategies.smooth_scalar_field_in_unit_box(shape, lo, hi)` | `tools/testkit/property/strategies.py:16` | IC strategy for RD-2D |
| `invariants.scalar_field.monotone_bounds(field, lo, hi)` | (verified in module) | PBT invariant |

### 2.4 `diagnostics` (Block 6)

| Symbol | Source line | Used for |
|---|---|---|
| `check_health` | `tools/diagnostics/diagnostics/__init__.py:9` | NaN/Inf scan against canonical capture |
| `check_bounds` (Tier 2 scalar_field) | `tools/diagnostics/diagnostics/__init__.py:14` | U, V ∈ [0,1] verification |
| `check_conservation` | `tools/diagnostics/diagnostics/__init__.py:11` | Drift report (advisory; Gray-Scott is non-conservative) |
| `HealthReport`, `BoundsReport`, `ConservationReport` | `tools/diagnostics/diagnostics/__init__.py:6,9,11` | Report dataclasses |

### 2.5 `integrity` (Block 5)

| Surface | Path | Used for |
|---|---|---|
| `python -m integrity --all` CLI | `tools/integrity/integrity/__main__.py` | Block 8 self-verification |
| `cat3.golden-values` registry | `tools/integrity/integrity/cat3_numerical/evaluators/__init__.py` | (Cat 3 does NOT register RD-2D; the canonical capture is governed by Cat 1 citations + the test suite, not by a golden-table evaluator) |

### 2.6 `@bit-physics/common-ts` (Block 7)

| Symbol | Source line | Used for (Phase 0) |
|---|---|---|
| `createContext` | `common/common-ts/src/index.ts:4` | WebGPU device init (local-only) |
| `ComputePipeline`, `ComputePipelineOptions`, `ShaderReloadCallback` | `common/common-ts/src/index.ts:17-18` | Compute pipeline for the WGSL kernel |
| `makeBindGroupLayout`, `makeBindGroup` | `common/common-ts/src/index.ts:13` | Storage-buffer binding layouts |
| `CaptureWriter`, `CaptureManifest` | `common/common-ts/src/index.ts:20-21` | TypeScript-side capture writer (local GPU run) |

The CaptureWriter's dtype-string gotcha (`<d`/`<f`/`<i`/`<q`, NOT
`<f8`/`<f4`/`<i4`/`<i8`) is documented at `docs/common/ts.md` §
"dtype gotcha"; the RD-2D Stack B implementation imports the
exported dtype constant rather than hand-rolling.

## 3. Upstream citations

- Gray & Scott (1983) — `chemistry-engineering-science 39 (6), 1087-1097`.
- Pearson (1993) — `science 261 (5118), 189-192`.

No vendored code; the citations are textual references in
`spec-ref.md` § 2 and `algebraic.md`. No `references/` directory
entry needed at Phase 0 (Phase 1+ may vendor the Pearson 1993 paper
PDF if it becomes load-bearing).

## 4. Test-fixture paths

| Path | Purpose | Producer |
|---|---|---|
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5` | Canonical capture payload | NumPy reference (Phase 0); WebGPU (Phase 1+) |
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json` | Canonical capture manifest | same |
| `tests/fixtures/legacy-captures/phase-0-rd-2d-ref.{h5,json}` | Backward-compat regression seed | Block 8 (copies the canonical capture) |
| `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-ref-<UTC>.txt` | Failing-tests output evidence (spec § 1.3 step 4) | Block 8 commit (a) |

## 5. Public types / functions / structs exported

The RD-2D package will export:

```python
# packages/reaction-diffusion-2d/reaction_diffusion_2d/__init__.py
from .reference import GrayScottParams, canonical_params, evolve, step, initial_condition
from .sim import sim_runner_seeded, sim_runner_pbt

# reference.gray_scott_numpy
@dataclass(frozen=True)
class GrayScottParams:
    n: int; Du: float; Dv: float; F: float; k: float; dx: float; dt: float

def canonical_params() -> GrayScottParams
def initial_condition(p, seed) -> tuple[np.ndarray, np.ndarray]
def step(u, v, p) -> tuple[np.ndarray, np.ndarray]
def evolve(p, seed, n_steps, *, capture_interval) -> Iterator[(int, np.ndarray, np.ndarray)]

# sim
def sim_runner_seeded(seed: int, out_dir: Path) -> Path
def sim_runner_pbt(initial_condition: dict, out_dir: Path) -> Path
```

Cat 2 (`python-exports`) parses every public symbol declared in
`__init__.py` exports above.
