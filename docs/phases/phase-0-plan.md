# Phase 0 — Foundation: Coordinator + Build-Agent Plan

> **Version:** 0.10 (consolidation — May 18 2026)
> **Subject spec:** `gpu-sims-design-spec-v2.md` v2.4 (the design spec; vendored into the repo at `docs/architecture.md` by Block 1, including its Appendices D/E/F/G as part of the same file)
> **Subject repo:** `git@github.com:StevenFAU/Bit-Physics.git`
> **Drafted:** 2026-05-17 (v0.7); 2026-05-18 (v0.8 → v0.9 → v0.10 amendments)
> **Posture:** This plan operationalizes spec § 11.1 for sequential single-agent execution. **One claude.ai chat (the coordinator) and one Claude Code agent role per phase.** The agent runs with **auto-accept on**, reads this whole plan plus the spec at `docs/architecture.md` (post-Block-1) or the planning-folder spec (pre-Block-1), and works through all nine blocks in sequence — committing directly to `main` (trunk-based per spec § 7.12), reporting at each block close and at phase landing. Context-spanning sessions are supported: if context fills per spec Appendix D § D.9, the agent writes a continuation cue to `docs/_audits/phase-0/progress.md` and the coordinator dispatches a continuation session.
> **Hard Rule 2 still applies:** when this plan disagrees with the synced repo state, the synced state wins; the agent pauses and surfaces.

> **v0.10 amendments (May 18 2026 — consolidation pass):**
>
> - **Spec at v2.4** (v2.3 consolidated the previously-standalone planning docs as appendices D/E/F/G; v2.4 adds the verification-hardening pass — see spec § 1.3 step 4, §§ 2.13/2.14/2.15, § 3.5 13-gate expansion, § 7.5 mechanical audit-trail anchors, § 7.12 operator-only tag pushing).
> - **Block 1 deliverables reduced.** Old deliverables #3 (separate conventions.md), #7 (separate shared-invariants.md), #8 (separate agent-playbook.md) are removed — those contents are now appendices of the spec, vendored as part of deliverable #6 (the spec itself, committed to `docs/architecture.md`). Deliverables #7 and #8 are explicitly marked "Removed in v0.10."
> - **Preflight script embedded.** The preflight-phase.py source is now embedded in this plan at § 7.1.A as a markdown code block. Block 1 commits the script verbatim from that source. No separate preflight-phase.py file is referenced; the embedded source is canonical.
> - **No separate `docs/conventions.md`, `docs/shared-invariants.md`, `docs/agent-playbook.md`, `docs/dispatch-readiness-checklist.md` files.** All content lives in `docs/architecture.md` (the spec) as appendices.
> - **`docs/glossary.md` retained** as a standalone file for ergonomic lookup; mirrors spec Appendix C.
> - Other v0.9 amendments (empty-repo handling, LBM Krüger decision finalized, RD-2D descriptor lock, 13-section sim-spec template, license MIT, pacing language purge) carry forward unchanged.

> **v0.9 amendments (May 18 2026 — dispatch-hardening pass) — file-structure items superseded by v0.10; other amendments carry forward:**
>
> - **Block 1 sim-spec template** has **13 sections** (not 12). Section 13 is "Productization status" per spec § 8.2 v2.1 amendment.
> - **Empty-repo handling** (§ 7.1 amendment): if the repo at clone time contains auto-initialized `README.md`, `LICENSE`, `.gitignore` only, the agent treats this as the empty-state baseline.
> - **LBM Krüger 2017 vendoring decision** finalized: algebraic reference only, no vendored code.
> - **RD-2D canonical capture descriptor** locked: `gray-scott-lambda-128sq-seed42-step2000`.
> - **§ 7 block prompts framing**: per single-agent dispatch, there is one Claude Code session per phase; per-block prompts are sections the agent consults at each block boundary.
> - **License posture locked to MIT** per spec § 12.7.
> - **Pacing language purged**: superseded by spec § 11.0.

> **v0.8 amendments (May 18 2026):** Updated dispatch model from "coordinator dispatches per-block Claude Code session" to "coordinator dispatches one phase agent who works through all blocks with auto-accept; continuation sessions only on context-fill."

---

## 1. Purpose

Phase 0 builds the foundation that every later phase consumes. Per spec § 11.1, it ships thirteen deliverables (0.1 through 0.13). This plan groups them into nine sequential blocks, executed by one Claude Code agent role running auto-accept. The coordinator (a single claude.ai chat that Steven drives) dispatches the phase opener once; the agent reads this plan in full at session start and works through Block 1 → Block 9 sequentially, reporting one-line summaries back to the coordinator at each block close. Continuation sessions are dispatched only on context-fill per § 6.2.

This document covers what no other artifact covers:
- the **architecture** Phase 0 produces (what gets built, what each component's public surface is, how components wire together),
- the **execution sequencing** (the nine blocks, in order, with their inputs and outputs),
- the **block prompts** the agent consults at each block boundary (§ 7),
- the **coordinator brief** the coordinator chat reads at phase open (§ 6.1),
- the **acceptance gate** and **recovery paths** when something doesn't go to plan.

The design spec is the contract; this plan is the implementation strategy.

---

## 2. Source-of-truth pointers

| Artifact | Path | Role |
|---|---|---|
| Design spec | `/mnt/project/gpu-sims-design-spec-v2.md` (vendored into repo at `docs/design-spec-v2.md` by Block 1) | Authoritative contract |
| This plan | `phase-0-plan.md` | Implementation strategy for Phase 0 |
| Agent reports (output) | `docs/_audits/phase-0/block-<n>-<name>-report.md` | One per block |
| Phase-0 retro (output) | `docs/_audits/phase-0/landing-<UTC>.md` | Block 9 (LANDING) writes |
| Landing ledger (output) | `docs/_audits/phase-0/landing-ledger.md` | Coordinator appends each block as it reports |

---

## 3. Phase 0 architecture

This section is the architectural contract. It describes what each block produces, where it lives, and what its public surface looks like. Subsequent blocks consume earlier blocks' surfaces directly (no Protocols or mocks needed — sequential execution means each block sees the live, completed prior work).

### 3.1 The nine blocks

| # | Block name | Component built | Canonical path | Spec § 11.1 |
|---|---|---|---|---|
| 1 | **FOUNDATION** | Repo skeleton, conventions, glossary, capture format module + JSON schemas, CI scaffolding (including `audit-append-only.yml` and `tolerance-budget-check.yml`), pre-commit config, server-side branch-protection config doc, vendoring discipline doc, sim-spec template, probe template, references symlink, perf-ledger scaffold, failing-tests-evidence/ directory, tolerance-budget.toml stub, schema-corpus directory (`tests/fixtures/legacy-captures/`) | `tools/testkit/capture/`, `tools/testkit/schemas/`, `tests/fixtures/`, `docs/`, `.github/`, repo root | 0.1, 0.2, 0.3 |
| 2 | **MMS** | Method of Manufactured Solutions pipeline for heat equation 1D | `tools/testkit/code_verification/mms/` | 0.4 |
| 3 | **HARNESSES** | Determinism harness + cross-stack equivalence harness + property-based testing harness (Hypothesis bindings + invariant-declaration schema) | `tools/testkit/determinism/`, `tools/testkit/equivalence/`, `tools/testkit/property/` | 0.6, 0.7 |
| 4 | **VENDORING** | Sparse-checkout vendor of SPlisHSPlasH + cubic-spline kernel derivation, table (with mandatory independent-reference anchors from Monaghan 2005), generator, canonical Python reference implementation, verifier | `references/SPlisHSPlasH/`, `tools/testkit/golden/` | 0.5, 0.8 |
| 5 | **INTEGRITY** | Integrity toolkit Cat 1–5 with one check active per category; adversarial-fixture corpus + meta-test; `verify_evidence.py` script; `replay_prior_phase.py` script; mutation-testing configuration for testkit and integrity modules; tolerance-budget Cat-X check | `tools/integrity/` | 0.9, 0.10 |
| 6 | **DIAGNOSTICS** | Diagnostic toolchain Tier 1 universal + Tier 2 scalar-field | `tools/diagnostics/` | 0.11 |
| 7 | **COMMON-TS** | TypeScript/WebGPU common module + h5wasm-based capture I/O + hello-physics smoke sim | `common/common-ts/` | 0.12 |
| 8 | **RD-2D** | Reaction-diffusion-2D integration sim: NumPy reference, spec sheet, pre-implementation probe, failing tests (committed first, with verbatim output captured + sha256 in commit footer per spec § 1.3 step 4), WebGPU implementation, PBT invariant suite, first perf-ledger row | `packages/reaction-diffusion-2d/`, `docs/sim-specs/continuous-ca/reaction-diffusion-2d/` | 0.13 |
| 9 | **LANDING** | Final integrity-gate sweep, full test-suite run, CI workflow activation (including audit-append-only and tolerance-budget-check), dep merging, commit-chain construction, phase-0 retro. **No agent tag-pushing** — closing report ends with `Tag pushed: NO (operator action required)` per spec § 7.12 | (orchestration; no new sim code) | (acceptance) |

Each block writes one report at `docs/_audits/phase-0/block-<n>-<name>-report.md`. Block 9 also writes `docs/_audits/phase-0/landing-<UTC>.md`.

### 3.2 Sequential execution graph

```
Block 1: FOUNDATION
   │  produces capture/, schemas/, repo skeleton, CI scaffolds, conventions doc, glossary
   ▼
Block 2: MMS
   │  produces tools/testkit/code_verification/mms/ (heat-eq-1D pipeline)
   │  imports from: nothing in Phase 0 (uses only stdlib + sympy + numpy)
   ▼
Block 3: HARNESSES
   │  produces tools/testkit/determinism/, tools/testkit/equivalence/
   │  imports from: bit_physics_testkit.capture (diff_captures, load_capture)
   ▼
Block 4: VENDORING
   │  produces references/SPlisHSPlasH/ + tools/testkit/golden/ (table, generator,
   │             verifier, reference_implementations/cubic_spline.py)
   │  imports from: bit_physics_testkit.capture.manifest (load_reference_manifest)
   ▼
Block 5: INTEGRITY
   │  produces tools/integrity/ (Cat 1–5)
   │  imports from: bit_physics_testkit.golden (verifier, reference_implementations/cubic_spline)
   ▼
Block 6: DIAGNOSTICS
   │  produces tools/diagnostics/tier1/, tools/diagnostics/tier2/scalar_field/
   │  imports from: bit_physics_testkit.capture, bit_physics_testkit.determinism
   ▼
Block 7: COMMON-TS
   │  produces common/common-ts/ (WebGPU + h5wasm) + hello-physics smoke sim
   │  cross-language gate: writes HDF5 via h5wasm, Python reader loads it
   ▼
Block 8: RD-2D
   │  produces packages/reaction-diffusion-2d/ (NumPy reference, spec, failing
   │             tests committed first, then WebGPU impl)
   │  imports from: everything above (common-ts in TS, all testkit/diagnostics in Python tests)
   ▼
Block 9: LANDING
      runs all gates end-to-end, activates CI, builds final commit chain, writes retro
```

Three properties of this sequence:

1. **No back-dependency.** Block N only imports from blocks 1..N–1. The build agent in any session sees the live, completed prior work.
2. **Each block produces one commit** (block 8 produces two — failing tests, then implementation — per TDD discipline in spec § 1.3 and Convention A).
3. **Checkpoint discipline.** The coordinator reviews each block's report before dispatching the next. If a report surfaces a defect or design question, it's resolved before the next block starts — not deferred to LANDING.

### 3.3 Public API surfaces (the sockets)

These signatures are contracts between blocks. The build agent codes against these when it owns the producing block, and consumes them as written when it owns a consuming block. If the agent finds a contract here that doesn't make sense once it starts implementing, Hard Rule 2 applies: pause, surface, the user (or this plan) adjusts.

#### 3.3.1 `bit_physics_testkit.capture` — Block 1 ships; Blocks 3, 6, 7, 8 consume

```python
# tools/testkit/capture/__init__.py — public exports
from pathlib import Path
from typing import Iterable, Literal
from dataclasses import dataclass
import numpy as np

@dataclass
class CaptureManifest:
    schema_version: str          # e.g. "1.0.0", pattern ^\d+\.\d+\.\d+$
    sim: dict                    # {name, category, variant}
    stack: dict                  # {name, version, build_id}
    config: dict                 # {tier, dims, dtype, seed, params}
    run: dict                    # {step_count, capture_interval, wall_clock_seconds, start_utc}
    payload: dict                # {format: "hdf5", path, checksum}
    determinism: dict            # {claimed, atomic_ops, subgroup_ops}

@dataclass
class StepState:
    step: int
    state: dict[str, np.ndarray]      # field_name → array
    diagnostics: dict[str, float]     # check_name → scalar

class Capture:
    manifest: CaptureManifest
    metadata: dict
    def steps(self) -> Iterable[StepState]: ...
    def step(self, n: int) -> StepState: ...
    def field(self, step: int, name: str) -> np.ndarray: ...

@dataclass
class CaptureDiff:
    bit_exact: bool
    max_abs_err: float
    max_rel_err: float
    mismatched_fields: list[str]

def load_capture(manifest_path: Path) -> Capture: ...
def write_capture(state_iter: Iterable[StepState],
                  manifest_meta: CaptureManifest,
                  out_dir: Path) -> Path: ...
def diff_captures(left: Path, right: Path,
                  mode: Literal['bit-exact', 'epsilon'] = 'bit-exact',
                  rtol: float = 0.0, atol: float = 0.0) -> CaptureDiff: ...
def load_reference_manifest(manifest_path: Path) -> dict: ...
```

**HDF5 payload layout** (spec § 2.7, pinned so TS-written and Python-written captures interoperate):
- `/steps/{N}/state/{field_name}` — `np.ndarray` per field per step
- `/steps/{N}/diagnostics/{check_name}` — scalar per Tier 1 diagnostic per step
- `/metadata/` — replicated manifest fields

#### 3.3.2 `bit_physics_testkit.determinism` — Block 3 ships; Blocks 6, 8 consume

```python
from pathlib import Path
from typing import Protocol
from dataclasses import dataclass

class SimRunner(Protocol):
    """Caller-supplied: produces a capture file at the given seed."""
    def __call__(self, seed: int, out_dir: Path) -> Path: ...
    # Returns the path to the written manifest JSON.

@dataclass
class DeterminismVerdict:
    bit_exact: bool
    detail: str  # "captures match exactly" or "max_abs_err=1.2e-7 at field=U step=42"

def run_twice_and_diff(runner: SimRunner, seed: int = 42,
                       tmp_dir: Path | None = None) -> DeterminismVerdict: ...
```

#### 3.3.3 `bit_physics_testkit.equivalence` — Block 3 ships

```python
from pathlib import Path
from dataclasses import dataclass

@dataclass
class EquivalenceVerdict:
    within_tolerance: bool
    per_field_diff: dict[str, dict[str, float]]
    tolerance_table_used: dict

def compare_captures(left: Path, right: Path,
                     tolerance_table_path: Path | None = None) -> EquivalenceVerdict:
    """If tolerance_table_path is None, uses tools/testkit/equivalence/tolerance.toml."""
    ...
```

#### 3.3.4 `bit_physics_testkit.golden` — Block 4 ships; Block 5 consumes

```python
# tools/testkit/golden/verifier.py
from pathlib import Path
from typing import Protocol
from dataclasses import dataclass

class KernelEvaluator(Protocol):
    def __call__(self, inputs: dict) -> dict: ...

@dataclass
class GoldenVerifierResult:
    table_path: Path
    algorithm: str
    points_tested: int
    points_passed: int
    failures: list[dict]
    ok: bool

def verify_against_table(table_path: Path,
                         evaluator: KernelEvaluator) -> GoldenVerifierResult: ...
```

```python
# tools/testkit/golden/reference_implementations/cubic_spline.py
def evaluate(inputs: dict) -> dict:
    """
    Monaghan cubic-spline SPH kernel, 3D normalization.
    Args:    inputs: {"q": float, "h": float}
    Returns: {"W": float, "grad_W_magnitude": float}
    """
    ...
```

**Important:** there is exactly one Python implementation of the cubic-spline kernel in the repo. Block 5 (INTEGRITY) imports this; it does not re-implement.

#### 3.3.5 `bit_physics_integrity` — Block 5 ships

```python
# CLI: python -m integrity [--cat N] [--mode strict|advisory] [--staged-only] [files...]

# tools/integrity/integrity/common/types.py
from enum import Enum
from pathlib import Path
from dataclasses import dataclass

class FailureMode(Enum):
    HARD_FAIL = "HARD_FAIL"
    SOFT_WARN = "SOFT_WARN"
    AUDIT_LOG = "AUDIT_LOG"

@dataclass
class Finding:
    check: str           # e.g. "cat1.intra-repo"
    severity: FailureMode
    path: Path
    line: int | None
    message: str
```

Cat 3 wiring (consumes Block 4's reference impl directly):
```python
# tools/integrity/integrity/cat3_numerical/evaluators/cubic_spline.py
from bit_physics_testkit.golden.reference_implementations.cubic_spline import evaluate
ALGORITHM_NAME = "cubic-spline-kernel"
```

**Cat 4 verifier location** (resolving spec ambiguity between § 3.1 and § 3.2): the Cat 4 verifier *code* lives at `tools/integrity/integrity/cat4_draft_time/`. Block 1's `tools/testkit/probes/` directory holds the probe template and committed probe reports only — no verifier code there.

#### 3.3.6 Diagnostics — Block 6 ships

```python
# tools/diagnostics/tier1/health.py
from dataclasses import dataclass
from bit_physics_testkit.capture import Capture

@dataclass
class HealthReport:
    ok: bool                       # True iff nan_count == 0 and inf_count == 0
    nan_count: int
    inf_count: int
    first_offending_step: int | None
    first_offending_field: str | None

def check_health(capture: Capture) -> HealthReport: ...
# CLI: ok=True → exit 0; ok=False → exit 1
```

```python
# tools/diagnostics/tier1/determinism.py — composes Block 3's harness directly
from bit_physics_testkit.determinism import run_twice_and_diff, DeterminismVerdict

def check_determinism(runner, seed: int = 42) -> DeterminismVerdict:
    return run_twice_and_diff(runner, seed=seed)
```

```python
# tools/diagnostics/tier2/scalar_field/monotone_bounds.py
from dataclasses import dataclass
from bit_physics_testkit.capture import Capture

@dataclass
class BoundsReport:
    ok: bool
    field: str
    violations: list[dict]   # each: {step, location, value, bound, kind: "below" | "above"}

def check_bounds(capture: Capture, field: str,
                 lo: float, hi: float) -> BoundsReport: ...
```

#### 3.3.7 `@bit-physics/common-ts` — Block 7 ships; Block 8 consumes

```typescript
// common/common-ts/src/index.ts — public exports

export interface DeviceContext {
  device: GPUDevice;
  queue: GPUQueue;
  adapter: GPUAdapter;
  features: GPUFeatureName[];
}
export async function createContext(): Promise<DeviceContext>;

export interface ComputePipelineOptions {
  entryPoint?: string;            // default "main"
  label?: string;
  bindGroupLayouts: GPUBindGroupLayout[];
}

export class ComputePipeline {
  static create(ctx: DeviceContext, shaderSource: string,
                options: ComputePipelineOptions): Promise<ComputePipeline>;
  dispatch(commandEncoder: GPUCommandEncoder,
           workgroups: [number, number, number],
           bindGroups: GPUBindGroup[]): void;
}

// Capture types mirror the Python CaptureManifest (same JSON Schema validates both)
export interface CaptureManifest {
  schema_version: string;
  sim: { name: string; category: string; variant: string };
  stack: { name: string; version: string; build_id: string };
  config: { tier: string; dims: number[]; dtype: 'f32' | 'f64';
            seed: number; params: Record<string, unknown> };
  run: { step_count: number; capture_interval: number;
         wall_clock_seconds: number; start_utc: string };
  payload: { format: 'hdf5'; path: string; checksum: string };
  determinism: { claimed: 'bit-exact-same-hw' | 'epsilon' | 'non-deterministic';
                 atomic_ops: boolean; subgroup_ops: boolean };
}

export class CaptureWriter {
  constructor(manifest: CaptureManifest, outDir: string);
  addStep(step: number,
          state: Record<string, Float32Array | Float64Array>,
          diagnostics?: Record<string, number>): void;
  finalize(): Promise<string>;  // returns path to written manifest JSON
}
```

### 3.4 File-system layout at end of Phase 0

```
Bit-Physics/
├── .github/workflows/
│   ├── structure.yml          # Block 1 (active)
│   ├── python-strict.yml      # Block 1 (active)
│   ├── ts-strict.yml          # Block 1 (gated until Block 7; Block 9 activates)
│   ├── integrity.yml          # Block 1 (gated; Block 9 activates)
│   ├── determinism.yml        # Block 1 (gated; Block 9 activates)
│   └── equivalence.yml        # Block 1 (gated; Block 9 activates)
├── .pre-commit-config.yaml    # Block 1 base; Block 5 appends Cat 4 hook
├── .gitignore .gitattributes .editorconfig          # Block 1
├── README.md LICENSE CHANGELOG.md CITATION.cff      # Block 1
├── CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md   # Block 1
├── pyproject.toml             # Block 1 (uv workspace root)
├── justfile                   # Block 1
├── common/common-ts/          # Block 7
│   ├── package.json tsconfig.json tsconfig.build.json
│   ├── preflight/             # h5wasm preflight (deliverable 0 of Block 7)
│   ├── src/                   # context, bindgroups, pipelines, capture, indexeddb, index
│   ├── src/__tests__/
│   └── examples/hello-physics/
├── docs/
│   ├── architecture.md conventions.md glossary.md   # Block 1
│   ├── shared-invariants.md   # Block 1 (committed verbatim from planning folder)
│   ├── agent-playbook.md      # Block 1 (committed verbatim from planning folder)
│   ├── dependencies.md        # Block 1 (consolidates external-dep pins; per phase append)
│   ├── design-spec-v2.md      # Block 1 (vendored)
│   ├── common/ts.md           # Block 7
│   ├── diagnostics/           # Block 6
│   ├── integrity/             # Block 5
│   ├── retro/phase-0/         # Block 1 scaffolds; each block adds report; Block 9 adds retro.md
│   ├── sim-specs/             # Block 1 ships _template.md (13 sections); Block 8 adds reaction-diffusion-2d/
│   └── testkit/               # Block 1: overview + capture-format + references
│                              # Block 2: mms.md
│                              # Block 3: determinism.md + equivalence.md
│                              # Block 4: golden-values.md
├── packages/reaction-diffusion-2d/   # Block 8
│   ├── package.json
│   ├── reference/gray_scott_numpy.py
│   ├── src/                   # WebGPU implementation
│   └── tests/                 # Failing-tests commit first
├── references/                # Block 1 scaffolds; Block 4 vendors SPlisHSPlasH/
│   └── papers/                # Block 1 scaffolds; Phase 4 pre-dispatch vendors frontier papers
└── tools/
    ├── diagnostics/           # Block 6
    ├── dispatch/              # Block 1: preflight-phase-{0..5}.py templates
    ├── integrity/             # Block 5
    └── testkit/
        ├── pyproject.toml schemas/ capture/   # Block 1
        ├── code-verification/mms/             # Block 2
        ├── solution-verification/             # Block 1 stub (DEFERRED to Phase 1+)
        ├── determinism/ equivalence/          # Block 3
        ├── golden/                            # Block 4
        ├── probes/                            # Block 1: template + reports/
        └── references → ../../references      # Block 1 symlink
```

### 3.5 Cross-language interop

The TypeScript ↔ Python boundary is the cross-stack invariance gate:

```
   Block 7 (COMMON-TS)                    Block 1 (FOUNDATION)
   common/common-ts/                      tools/testkit/capture/
   ─────────────────                      ──────────────────────
   CaptureWriter.finalize()  ──HDF5──>    load_capture(manifest_path)
       uses h5wasm                            uses h5py
       writes manifest.json + payload.h5      reads same files

   Verified by Block 7's `test:cross-stack` script: writes a file with
   CaptureWriter, spawns Python subprocess that calls load_capture,
   asserts step values match within tolerance.
```

This is one test, in one place. If it passes, the cross-stack story holds.

### 3.6 Invariants

These hold across every component boundary; Block 9 verifies each.

1. **Capture format is byte-compatible across stacks.** TS-written and Python-written captures both validate against the same Draft 2020-12 JSON Schema and produce HDF5 with the same `/steps/{N}/state/{field}` layout.
2. **One reference implementation per algorithm.** The cubic-spline kernel has exactly one Python implementation (Block 4's `reference_implementations/cubic_spline.py`); Block 5's Cat 3 imports it.
3. **Convention #8 is universal.** Every concrete claim is grep-verified or web-fetched at moment of assertion.
4. **Append-only audits.** Block reports under `docs/_audits/phase-0/` are never edited; corrections are new entries.
5. **Hard Rule 2 holds at every layer.** When the spec disagrees with synced state, synced state wins; the agent pauses and surfaces.

---

## 4. Verified-current external dependencies

These dependencies are load-bearing for Phase 0 and were verified against current sources at plan time (May 17, 2026):

| Dependency | Source verified | Notes |
|---|---|---|
| **h5wasm** ([usnistgov/h5wasm](https://github.com/usnistgov/h5wasm)) | NIST-maintained, recently updated; supports `new File("x.h5", "w")` + `create_group()` + `create_dataset({name, data, shape, dtype})` + attributes; BigInt-based (requires modern browsers) | Block 7 uses this for HDF5 write |
| **conventional-pre-commit** ([compilerla/conventional-pre-commit](https://github.com/compilerla/conventional-pre-commit), PyPI Apache-2.0) | Current as of Feb 2026; requires `default_install_hook_types: [pre-commit, commit-msg]` and a `commit-msg` stage hook | Block 1 configures this |
| **uv workspace** ([docs.astral.sh/uv/concepts/projects/workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/)) | Current; `[tool.uv.workspace] members = [...]` plus optional `exclude`; cross-member deps via `[tool.uv.sources] pkg = { workspace = true }` | Block 1 root pyproject uses this |
| **pre-commit** ([pypi.org/project/pre-commit](https://pypi.org/project/pre-commit/)) | v4+ as of Apr 2026 | Standard Python pre-commit framework |
| **WebGPU browser support** | Chrome/Edge 113+, Firefox 141+ (Win) / 145+ (macOS), Safari 26+ | Block 7's smoke sim target |

The agent re-verifies versions and SHAs at execution time (Convention #8) — these are the current snapshots, but the agent does not assert version pins from this plan; it pins what's current when it runs.

---

## 5. Cross-block contracts

Most cross-component coupling has moved to § 3.3 (public APIs). What's left here is operational: how reports are formatted, where outputs land, what gets serialized across blocks.

### 5.1 Report front-matter schema

Every block report begins with YAML front-matter conforming to the canonical schema in spec § 7.5. The coordinator scans it and the LANDING block parses it programmatically.

```yaml
---
date: 2026-05-17T14-30-00Z         # UTC ISO 8601 with colons replaced by hyphens
author: phase-0-block-4-agent       # agent or role identifier
phase: 0
artifact: block                     # one of: block | stage | task | wu | sub-phase | phase-landing
artifact_id: block-4-vendoring      # unique within phase
verdict: CONFIRMED                  # CONFIRMED | SHIFTED | REFUTED | DEFERRED | BLOCKED | HALTED
                                    # compounds permitted (DISCONFIRMED-AT-HEAD, REFRAMED) — spec § 7.5
evidence_paths:                     # key files the block produced
  - references/SPlisHSPlasH/MANIFEST.toml
  - tools/testkit/golden/tables/cubic-spline-kernel.json
  - tools/testkit/golden/reference_implementations/cubic_spline.py
head_sha: <40-char SHA at time of report write>
deferred_items:                     # may be empty
  - { item: "Verify vendored C++ source at runtime", target_phase: 1,
      rationale: "Phase 1's first SPH sim exercises Cat 3 against C++" }
ci_activation:                      # may be empty for early blocks
  - { workflow: .github/workflows/integrity.yml, action: "flip if: false → true (line 12)" }
top_level_deps_to_merge:            # deps added during this block
  - { file: tools/testkit/pyproject.toml, addition: "sympy>=1.13" }
---
```

The block report lands at `docs/_audits/phase-0/block-<N>-<name>-<UTC>.md` per the audit-path convention (spec § 8.1). LANDING's phase-closing report lands at `docs/_audits/phase-0/landing-<UTC>.md`.

The `verdict` field drives the coordinator's "should I dispatch the next block" decision (§ 6.2). The rest drives LANDING's wiring (§ 7.9).

Below the front-matter, the prose body has four sections in this order:
1. **What was built** — FACT-tagged file list.
2. **Design decisions made** — INFERENCE-tagged judgment calls the block made beyond the prompt.
3. **Open items** — anything punted on; what the next block (or LANDING) needs to know.
4. **Conventions honored** — brief notes.

### 5.2 Conventions enforced across every block

These are the spec's load-bearing rules (Part VII + Appendix B). Every block's agent honors them; every block's report cites them.

- **Convention #8** — no assertion from memory; grep-verify or web-fetch every concrete claim.
- **Convention M** — re-anchor before edit; re-view files before modifying.
- **Convention A** — new-files-first decomposition; if you must modify a file an earlier block wrote, split into two commits (or surface to the user as Hard Rule 2).
- **Convention #12** — SHA back-fills are separate follow-up commits, never `git --amend`.
- **Conventional Commits** — every commit `type(scope): subject`; enforced by the `conventional-pre-commit` hook Block 1 installs.
- **FACT / INFERENCE tagging** — every concrete claim in any report is tagged.
- **Hard Rule 2** — when this plan or the prompt disagrees with synced state, the synced state wins; the agent pauses and surfaces.

---

## 6. Coordinator workflow

The coordinator is a single claude.ai chat in this project folder, opened once at phase start. **One coordinator chat. One Claude Code agent role. The agent runs the whole phase under auto-accept**, working through all nine blocks sequentially within that role. The coordinator dispatches the phase opener once and then dispatches a continuation session only on context-fill. § 6.1 is the brief the coordinator reads at the start of the chat; § 6.2 details the agent's per-block close pattern; § 6.3 explains why sequential is the right call.

### 6.1 Coordinator brief (paste into the claude.ai chat once at phase open)

> **▼▼▼ BEGIN COORDINATOR BRIEF — paste this into the claude.ai chat once at the start of Phase 0 ▼▼▼**

You are the Phase 0 coordinator for the Bit-Physics portfolio. Your job is operational: you dispatch one Claude Code agent at phase open with auto-accept on; that agent reads `phase-0-plan.md` in full and works through all nine blocks sequentially. You do not dispatch each block separately — the agent self-dispatches block-to-block once running. You receive each block's one-line summary from the agent (which the agent writes to `docs/_audits/phase-0/progress.md` and reports back). You only dispatch a continuation session if the agent's context fills (see § 6.2 below). You do not write code. You do not validate the plan against the design spec. You do not adjudicate verdicts.

**Workflow:**

1. Read `phase-0-plan.md` § 3 (architecture), § 6.2 (block-close pattern), § 7 (block prompts the agent will consult), and § 12 (recovery paths). You need orientation; you don't memorize the prompts.

2. **Dispatch the phase opener.** Paste this prompt into a fresh Claude Code session with auto-accept ON:

   ```
   You are the Phase 0 build agent for Bit-Physics. Auto-accept is on. Read docs/phases/phase-0-plan.md in full. Work through Blocks 1 → 9 sequentially per § 7. Commit directly to main per spec § 7.12. At each block close, follow § 6.2: commit, write the completion report, append to progress.md, and proceed to the next block unless context is near full. If context is near full, write a CONTINUE_FROM line to progress.md and end the session cleanly. Report each block close back to me with the one-line summary.
   ```

3. **Receive each block's one-line summary** as the agent reports it. Each summary is a single line of the form:
   `block <N> <name> <verdict> <head-sha> <audit-path>`

4. **For CONFIRMED verdicts:** acknowledge and let the agent proceed. The agent is already moving to the next block.

5. **For SHIFTED, REFUTED, DEFERRED, BLOCKED, HALTED verdicts:** surface to Steven (the owner). Read the report's "Design decisions" and "Open items" sections aloud so Steven can decide whether to (a) accept the shift and let the agent continue, (b) ask the agent to revise, or (c) pause the phase.

6. **If the agent's session ends with a CONTINUE_FROM line in progress.md** (context-fill checkpoint), dispatch a continuation session with this prompt:

   ```
   You are the Phase 0 agent for Bit-Physics, continuing from a prior session's context-fill checkpoint. Auto-accept on. Read docs/phases/phase-0-plan.md in full. Read docs/_audits/phase-0/progress.md for the CONTINUE_FROM cue. Resume at the named block and proceed sequentially per § 6.2.
   ```

7. **When Block 9 (LANDING) reports CONFIRMED**, Phase 0 is done. Append to landing ledger; surface phase-landing to Steven.

**You do not:**
- Dispatch blocks individually. The agent runs the phase.
- Spot-check the agent's work. Block 9 (LANDING) does end-to-end verification.
- Modify the plan, any prompt, or any report.
- Decide between options when a block reports SHIFTED. Surface to Steven.

**If something is unclear or off-script,** surface to Steven immediately. Do not improvise.

> **▲▲▲ END COORDINATOR BRIEF ▲▲▲**

### 6.2 Single-agent block sequence (v0.8 amendment; operative)

The coordinator dispatches ONE Claude Code agent for the whole phase, with auto-accept on. That agent reads this plan in full at session start, then works through Block 1 → Block 9 in order. At each block close:

1. The agent commits per Convention-A (one or two commits per block).
2. The agent writes the block's completion report at `docs/_audits/phase-0/block-<N>-<name>-<UTC>.md` per § 5.1 canonical front-matter.
3. The agent appends one line to `docs/_audits/phase-0/progress.md`:
   ```
   block <N> <name> <verdict> <head-sha> <audit-path>
   ```
4. The agent reports back to the coordinator with that same line.
5. The agent immediately proceeds to the next block UNLESS context is near full.

**Context-near-full protocol** (per spec Appendix D § D.9). If context utilization passes 70%, the agent finishes the current block, then writes a continuation cue as the LAST line of `docs/_audits/phase-0/progress.md`:
```
CONTINUE_FROM: block <N+1>; last_sha <SHA>
```
The agent then ends the session cleanly. The coordinator dispatches a continuation session per § 6.1 step 6.

**The coordinator's role is light.** It dispatches the phase opener once (§ 6.1). It receives one-line summaries at each block close. It surfaces non-CONFIRMED verdicts to Steven. It dispatches continuation sessions when context fills. It does not relitigate, re-architect, or re-verify.

If a block reports a hard blocker, the coordinator surfaces to Steven; recovery per § 12.

### 6.3 Why sequential is the right call here

Phase 0's cross-component contracts are too tightly coupled for parallel work to be lower-risk than sequential. The previous (v0.6) parallel plan required Protocols + mocks for cross-component surfaces during execution, a landing-time "wiring" pass that verified cross-agent assumptions, and six concrete "wires" that LANDING physically connected.

Sequential single-agent execution eliminates all of that. Block N sees Block N–1's live, committed code. INTEGRITY imports directly from VENDORING; DIAGNOSTICS imports directly from HARNESSES; RD-2D imports directly from everything. No drift risk. No wiring step. Recovery from a failed block is cheap (the agent re-attempts within scope, or the coordinator surfaces and the owner decides).

The cost relative to a hypothetical multi-agent parallel model is wall-clock: nine blocks in sequence is slower than (say) six in parallel. Per spec § 11.0, wall-clock under single-agent dispatch is hours-to-days bounded by external-dependency resolution and context-fill continuations, not by calendar pacing. For a foundation phase that runs once, sequential is the correct trade.

---

## 7. Block prompts

> **v0.10 amendment:** Per the single-agent dispatch model (§ 6.2), these block prompts are **sections the agent consults at each block boundary**, not separate dispatch targets. The agent reads `phase-0-plan.md` in full at session start, then refers to § 7.N when it begins block N. Block 1 is the exception — its prompt body IS the kickoff content the coordinator pastes (per § 6.1 step 2), because the agent hasn't started yet. From Block 2 onward, the agent is already running and consults § 7.N as a section.

Each prompt below is paste-ready. The format is:

```
▼▼▼ BEGIN PROMPT — Block N: NAME ▼▼▼
   [editorial framing — for the user, not the agent]
---
   [the actual prompt body — this is what the agent reads at block N boundary]
---
▲▲▲ END PROMPT — Block N: NAME ▲▲▲
```

For Block 1 (the kickoff): the coordinator pastes the body of § 7.1 into a fresh Claude Code session per § 6.1 step 2. For Blocks 2 through 9: the agent consults § 7.N's body at the block boundary, having already been running since Block 1.

---

### 7.1 Block 1: FOUNDATION

> **▼▼▼ BEGIN PROMPT — Block 1: FOUNDATION ▼▼▼**
>
> *(Coordinator pastes the body below into the agent's fresh Claude Code session at phase kickoff. From Block 2 onward, the agent consults § 7.N at each block boundary rather than being re-dispatched.)*

You are the Phase 0 build agent. This is Block 1 (FOUNDATION) — the first of nine sequential blocks. You build the repo skeleton, conventions, capture format module, JSON schemas, CI scaffolding, and pre-commit config. Every subsequent block builds on what you ship here.

**Action #1 (the universal preflight):** Phase 0 is a special case — there's no prior phase tag and the repo is empty/near-empty. Block 1 establishes what preflight checks for. Skip the preflight script for Block 1 only; from Block 2 onward, run `python tools/dispatch/preflight-phase.py 0` to verify Block N-1's state (you'll commit the script in Block 1 deliverable #10).

**Source of truth:** `gpu-sims-design-spec-v2.md` v2.4 (the design spec; vendored at `docs/architecture.md` by deliverable #6 of this block). Read in full: Front matter, Part I, Part II § 2.7 (capture format), Part II § 2.8 (reference vendoring), Part II § 2.12 (schema bump policy), Part II §§ 2.13/2.14/2.15 (mutation testing, PBT, perf-ledger — v2.4 additions), Part III § 3.1 (Layer 0 directory), Part III § 3.2 (integrity toolkit with adversarial fixtures — v2.4), Part VII (operating conventions; full text in Appendix G), Part VIII § 8.1 (documentation hierarchy), Appendix B (convention quick-lookup), Appendix C (glossary), Appendix D (shared invariants), Appendix E (agent playbook), Appendix F (dispatch operations), Appendix G (convention catalog full text — including G.7.5 TDD mechanical anchors, v2.4), § 11.0 (pacing), § 11.1 items 0.1–0.3.

**Also read (in the spec):** Appendix D (shared invariants), Appendix E (agent playbook), Appendix F (dispatch operations), Appendix G (convention catalog). These are part of the spec you vendor as deliverable #6; they ship to the repo at `docs/architecture.md` as Appendices D/E/F/G.

**Preflight script source:** the literal content of `tools/dispatch/preflight-phase.py` is embedded at the END of this prompt at § 7.1.A. Block 1 commits that script verbatim per deliverable #10.

**Also read:** `phase-0-plan.md` § 3 (architecture — your output is the contract every later block consumes), § 4 (verified dependencies — confirm current versions at execution time), § 5 (report schema).

**Repo bootstrap:** Clone the repo. Run `git log --oneline`.
- If empty (no commits): your work is the initial commit chain. `git checkout -b main` if needed.
- If GitHub auto-created `README.md`, `LICENSE`, and/or `.gitignore` only (no other files): view each; replace with the canonical versions below. Document the replacement in your report as a SHIFTED note. This is the v0.9 empty-repo-with-auto-init baseline; proceed normally.
- If anything beyond auto-init files is present (commits other than auto-init, additional directories): unexpected state. BLOCKED per Hard Rule 2. End session and surface.

**Deliverables:**

1. **Repo skeleton.** Every directory in `phase-0-plan.md § 3.4` exists. Each non-empty directory has a `README.md` stub pointing forward to the block that fills it.

2. **Top-level files:** `LICENSE` (MIT, spec § 12.7), `README.md` (project purpose + link to design spec + four target audiences from spec front matter), `CHANGELOG.md` (Keep a Changelog v1.1.0 format, semver 0.0.0 placeholder), `CITATION.cff` (skeleton, author "Steven Cohen"), `.gitignore`, `.gitattributes` (LF normalization for text; binary marker for `.h5`, `.png`, `.jpg`, `.pdf`), `.editorconfig`, `justfile` (stub `test`, `lint`, `build-all` recipes), top-level `pyproject.toml` (uv workspace declaration per `phase-0-plan.md § 4` — `[tool.uv.workspace] members = ["tools/testkit", "tools/integrity"]`), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.

3. **Convention catalog.** **v0.10 amendment:** the full convention catalog is now Appendix G of the design spec. Block 1 vendors the spec at `docs/architecture.md` (deliverable #6 below); Appendix G is part of that vendoring. There is NO separate `docs/conventions.md` file. Consumers reference `docs/architecture.md` Appendix G.

4. **Glossary** at `docs/glossary.md`. Reproduce spec Appendix C verbatim. (Glossary IS kept as a separate file for ergonomic lookup but mirrors spec Appendix C.)

5. **Architecture pointer.** The spec lives at `docs/architecture.md` after deliverable #6 below. The repo-root `README.md` points to it.

6. **Vendor the design spec.** Copy `gpu-sims-design-spec-v2.md` into the repo at `docs/architecture.md`. This brings the spec — including Appendices D (shared invariants), E (agent playbook), F (dispatch operations), G (convention catalog) — into the repo as the single canonical reference document. Phase plans reference it as `docs/architecture.md` plus the relevant appendix.

7. **(Removed in v0.10.)** Shared invariants are now Appendix D of `docs/architecture.md` per deliverable #6. No separate file.

8. **(Removed in v0.10.)** Agent playbook is now Appendix E of `docs/architecture.md` per deliverable #6. No separate file.

9. **External dependency pins** at `docs/dependencies.md`. Lists external deps with current known-good versions per spec Appendix D § D.4. Block 1 ships the file populated with verified-at-this-time versions; subsequent phases append rows.

10. **Pre-flight script** at `tools/dispatch/preflight-phase.py`. **v0.10 amendment:** the full script source is embedded at the end of this Block 1 prompt as a markdown code block. Block 1 commits the script verbatim from that embedded source. The script exposes `phase_0_preflight()` through `phase_5_preflight()` and a CLI entry point `python tools/dispatch/preflight-phase.py <N>`. Per spec § 9.6 this is the agent's Action #1 in any phase session.

11. **Testkit overview** at `docs/testkit/overview.md` — rollup describing every testkit component and which block builds it.

12. **Capture format module** at `tools/testkit/capture/` plus schemas at `tools/testkit/schemas/`:
    - Schemas (Draft 2020-12): `capture-v1.json`, `golden-v1.json`, `reference-manifest-v1.json`. Each validates against its meta-schema.
    - `capture-v1.json` fields match spec § 2.7 exactly: `schema_version` (string, pattern `^\d+\.\d+\.\d+$`), `sim`, `stack`, `config`, `run`, `payload`, `determinism`. Initial `schema_version` value: `"1.0.0"`. **Per spec § 2.12 schema-bump policy: no other phase besides Phase 4 WU-A is permitted to bump this.**
    - Python module per the public API in `phase-0-plan.md § 3.3.1`: `reader.py`, `writer.py`, `diff.py`, `manifest.py`, `__init__.py`. HDF5 payload layout exactly matches spec § 2.7 (`/steps/{N}/state/{field}`, `/steps/{N}/diagnostics/{check}`, `/metadata/`).
    - Tests at `tools/testkit/capture/tests/`: schema validation; HDF5 layout (writer produces documented structure); round-trip write→read; diff bit-exact same; diff epsilon-equal; diff fails on mismatch; diff raises typed exception on dtype mismatch; `load_reference_manifest` validates TOML via `tomllib.loads(text)` → `jsonschema.validate(dict, schema)`.
    - Documentation at `docs/testkit/capture-format.md`.

13. **CI workflows** at `.github/workflows/`:
    - `structure.yml` — verifies required dirs and top-level files exist. **Active.**
    - `python-strict.yml` — `ruff check`, `mypy --strict`, `pytest -W error` against `tools/testkit/` and `tools/integrity/`. Includes `pytest --cov=tools --cov-report=term --cov-report=xml` (advisory; no threshold). **Active.**
    - `ts-strict.yml` — `pnpm tsc --noEmit`, `pnpm eslint`, `pnpm vitest run` against `common/common-ts/`. WebGPU-device-requiring tests are marked skip-in-CI (per spec § 7.8). **Gated `if: ${{ false }}`** until Block 7 ships; Block 9 activates.
    - `integrity.yml` — `python -m integrity --all`. **Gated**; Block 9 activates.
    - `determinism.yml` — runs Block 3's harness against stub sim. **Gated**; Block 9 activates.
    - `equivalence.yml` — runs Block 3's harness against stub stacks. **Gated**; Block 9 activates.
    - `audit-append-only.yml` — verifies that every file under `docs/_audits/` already present at the most recent phase tag has only grown (the prior-tag content is a prefix of the HEAD content). HARD_FAIL on edit-or-shorten. **Gated**; Block 9 activates (no prior phase tag exists during Phase 0 itself; the workflow goes live for Phase 1 onward). See spec § 7.5 (Append-only CI enforcement) and Appendix G.7.
    - `tolerance-budget-check.yml` — on any PR modifying `tools/testkit/equivalence/tolerance.toml`, asserts that no override exceeds the corresponding cap in `tools/testkit/equivalence/tolerance-budget.toml`. HARD_FAIL on over-budget overrides. **Gated**; Block 9 activates. See spec § 2.6 (Tolerance budget).
    - `mutation-testing.yml` — runs `mutmut` against `tools/testkit/` and `tools/integrity/` per the thresholds in spec § 2.13. SOFT_WARN on push; HARD_FAIL on phase landing only. **Gated**; Block 9 activates.

13a. **Server-side branch-protection configuration document** at `docs/ops/branch-protection.md`. Documents the exact GitHub branch-protection rules the operator must configure (or the equivalent for self-hosted): no force-push to `main`; no non-fast-forward updates to `main`; no remote branches other than `main`; phase tags accept pushes only from the operator's GPG-signed identity (operator-only tag pushing per spec § 7.12). Block 1 ships the document; the operator applies the rules at phase open. The document includes a verification checklist the operator runs after applying.

14. **Pre-commit base config** at `.pre-commit-config.yaml`:
    ```yaml
    default_install_hook_types: [pre-commit, commit-msg]
    repos:
      - repo: https://github.com/pre-commit/pre-commit-hooks
        rev: <look up current tag at Block 1 time per spec Appendix D § D.4>
        hooks: [check-toml, check-yaml, check-json, end-of-file-fixer, trailing-whitespace, check-added-large-files]
      - repo: https://github.com/astral-sh/ruff-pre-commit
        rev: <look up current tag>
        hooks: [ruff-check, ruff-format]
      - repo: https://github.com/compilerla/conventional-pre-commit
        rev: <look up current tag>
        hooks:
          - id: conventional-pre-commit
            stages: [commit-msg]
    ```
    Look up current tags at execution time (Convention-8). Include a placeholder comment at the bottom: `# Block 5 (INTEGRITY) appends Cat 4 hook here.`

15. **Reference vendoring discipline doc** at `docs/testkit/references.md` — describes the policy from spec § 2.8 plus the sparse-checkout mechanism (see Block 4 prompt for details).

16. **`tools/testkit/references` symlink** to top-level `references/`. Also create top-level `references/` directory with `.gitkeep` and a `README.md` stub explaining "Block 4 vendors the first upstream here; Phase 4 pre-dispatch vendors frontier papers to `references/papers/`."

17. **Sim-spec template** at `docs/sim-specs/_template.md`. **v0.9 amendment:** reproduce the **13-section** template from spec § 8.2 (v2.1 amendment added § 13 "Productization status"; v2.2 confirms 13 sections). Sections 1–12 are the original spec § 8.2 template; section 13 is:

    ```markdown
    ## 13. Productization status

    ```yaml
    productization:
      web: true            # Stack B web demo (Phase 5 sub-phase 5.1)
      binary: true         # Stack C binary release (Phase 5 sub-phase 5.2)
      pypi: true           # Stack D/E PyPI package (Phase 5 sub-phase 5.3)
      render: true         # Offline render pass (Phase 5 sub-phase 5.4)
      preprint: true       # Academic preprint extraction (Phase 5 sub-phase 5.5)
    ```

    The five booleans default `true` (opt-in for productization). A sim sets a value `false` if it should NOT be picked up by the corresponding Phase 5 sub-phase (e.g., a Stack-D-only sim sets `web: false`).
    ```

    Block 8 uses this template for RD-2D (per spec Appendix D § D.1, RD-2D defaults all five to `true`).

18. **Pre-implementation probe template** at `tools/testkit/probes/template.md`. Per spec § 2.9: API surfaces consumed; upstream citations + verified SHAs; test-fixture paths; public types/functions/structs exported. Block 8 fills in `tools/testkit/probes/reports/reaction-diffusion-2d.md` from this template. **Note:** Cat 4 verifier code lives in `tools/integrity/integrity/cat4_draft_time/` (Block 5), not here. This directory holds templates and reports only.

19. **Solution-verification scaffold** at `tools/testkit/solution_verification/.gitkeep` + `README.md` explaining "Deferred to Phase 1+ per spec § 11.1 (not in Phase 0 deliverables)."

20. **Retro + audit scaffolds:** `docs/_audits/phase-0/.gitkeep`, `docs/diagnostics/_audits/.gitkeep`, `docs/integrity/_audits/.gitkeep`, `docs/_audits/tolerance-budget-amendments/.gitkeep` (per spec § 2.6 — for future tolerance-budget amendment audits).

21. **Performance regression ledger scaffold** at `docs/perf-ledger.md`. Initial content per spec § 2.15:

    ```markdown
    # Performance Regression Ledger

    Per spec § 2.15. Each row records first-landing or significant-change wall-clock for a (sim, stack, descriptor) tuple. Non-blocking — surfaces at landing-audit review time.

    | sim | stack | descriptor | wall_clock_seconds | hardware_id | commit_sha | date | regression |
    |---|---|---|---|---|---|---|---|
    | (Block 8 appends RD-2D's first row.) | | | | | | | |
    ```

    The ledger is consumed by every phase's closing audit. Block 8 (RD-2D) appends the first real row.

22. **Failing-tests evidence directory** at `tools/testkit/failing-tests-evidence/.gitkeep` + `README.md` explaining the discipline per spec § 1.3 step 4 (verbatim test output + sha256 in commit footer). Block 8's failing-tests commit produces the first real evidence file.

23. **Tolerance budget stub** at `tools/testkit/equivalence/tolerance-budget.toml`. Initial content per spec § 2.6:

    ```toml
    # Tolerance budget for the current phase.
    # Per-category caps on cross-stack tolerance.
    # Per-sim overrides in tolerance.toml that exceed these caps trigger Cat-X HARD_FAIL.
    # Amendments require a separate operator-approved commit per spec § 2.6.

    [phase]
    phase = "phase-0"
    opened_at = "<UTC at Block 1 land>"

    # Defaults from spec § 2.6 default tolerance table.
    [budgets.closed_form.cross_stack]
    relative = 1e-5
    absolute = 0.0

    [budgets.reaction-diffusion.cross_stack]
    relative = 1e-4
    absolute = 0.0

    [budgets.sph.cross_stack]
    relative = 1e-4
    absolute = 0.0

    [budgets.mpm.cross_stack]
    relative = 1e-4
    absolute = 0.0

    [budgets.smoke.cross_stack]
    relative = 1e-4
    absolute = 0.0

    [budgets.lbm.cross_stack]
    relative = 1e-5
    absolute = 0.0
    ```

    Block 9 activates `tolerance-budget-check.yml` against this file.

24. **Schema-version backward-compat regression corpus directory** at `tests/fixtures/legacy-captures/.gitkeep` + `README.md`. The README explains the corpus convention per spec § 2.7 + § 2.12:

    - Every phase that produces a canonical capture appends an entry: `phase-<N>-<sim>[-<variant>].h5` + sidecar `.json`.
    - Every schema bump round-trips every prior corpus entry through the post-bump reader (Phase 4 WU-A is the first such bump, 1.0.0 → 1.1.0).
    - Entries are append-only; deletions or renames break the regression guarantee.
    - First real entry seeded by Block 8 (RD-2D canonical capture).

    Block 1 creates the directory + README; Block 8 lands the first capture; Phase 4 WU-A consumes the full corpus in its acceptance test.

**Discipline you honor** (from `phase-0-plan.md § 5.2`): Convention-8, Convention-M, Convention-A, FACT/INFERENCE tagging, Conventional Commits.

**Failure modes to watch** (from spec § 9.4): Category 5 (Convention #8 fabrication — verify every tool version and pre-commit tag at execution time), Category 7 (spec self-consistency — committed schemas must match spec § 2.7 fields exactly), Category 9 (root-surface drift — `git status` should show every top-level file before you commit).

**Self-verification before reporting:**
- `ruff check tools/testkit/` passes.
- `mypy --strict tools/testkit/` passes.
- `pytest tools/testkit/ -W error` passes.
- Every JSON Schema validates against its meta-schema.
- `pre-commit run --all-files` passes (the conventional-commits hook runs on a test commit message).
- `git diff --stat` shows only new files.
- Every commit message follows Conventional Commits.

**Report back:** Write **one** report at `docs/_audits/phase-0/block-1-foundation-<UTC>.md` per the schema in `phase-0-plan.md § 5.1`. Front-matter `block: 1, name: foundation`. Verdict `CONFIRMED` if all deliverables landed; `SHIFTED` if you made a defensible design choice beyond the prompt; `REFUTED` if something blocks landing.

>
> **▲▲▲ END PROMPT — Block 1: FOUNDATION ▲▲▲**

---

#### § 7.1.A — Embedded preflight-phase.py source (Block 1 deliverable #10)

Block 1 commits the following content verbatim to `tools/dispatch/preflight-phase.py`. This is the universal preflight script invoked by every phase as Action #1. The agent SHOULD NOT modify this content during Block 1 — copy it byte-for-byte. (If the agent identifies a defect during execution, surface as SHIFTED in the Block 1 report; do not silent-edit.)

```python
#!/usr/bin/env python3
"""
Bit-Physics — Phase Preflight Script Template

Eventual repo location: tools/dispatch/preflight-phase-<N>.py

Every phase has its own preflight derived from this template. The agent's
FIRST action in any phase session is to run the relevant preflight:

    python tools/dispatch/preflight-phase-<N>.py

Exit 0  → all preconditions met; agent proceeds with phase work.
Exit 1  → at least one precondition failed; agent writes BLOCKED report
          with the script's stdout and ends session.

Each phase's preflight checks:
  1. Prior-phase tag exists (skip for Phase 0).
  2. Required paths exist.
  3. python -m bit_physics_integrity --all exits 0 (skip for Phase 0).
  4. pytest -W error in tools/ exits 0 (skip for Phase 0).
  5. Required capture descriptors present (per shared-invariants § 2.3).
  6. External dependencies installable (probe-only; no install).
  7. Phase-specific gates.

The script is FAIL-FAST: it stops at the first failed check and prints
exactly which check failed, with the path/command involved.

Authored by Phase 0 Block 1 (this template); each subsequent phase's
landing audit ships its successor's preflight.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class PreflightReport:
    phase: int
    checks: list[CheckResult] = field(default_factory=list)

    def add(self, name: str, passed: bool, detail: str = "") -> None:
        self.checks.append(CheckResult(name=name, passed=passed, detail=detail))

    @property
    def all_passed(self) -> bool:
        return all(c.passed for c in self.checks)

    def print(self) -> None:
        print(f"=== Phase {self.phase} preflight ===")
        for c in self.checks:
            mark = "[PASS]" if c.passed else "[FAIL]"
            print(f"  {mark} {c.name}")
            if c.detail and not c.passed:
                print(f"         {c.detail}")
        print(f"=== {'ALL PASSED' if self.all_passed else 'FAILED'} ===")


def check_path_exists(p: Path) -> CheckResult:
    return CheckResult(
        name=f"path-exists:{p}",
        passed=p.exists(),
        detail=f"missing: {p}" if not p.exists() else "",
    )


def check_command(cmd: list[str], name: str | None = None) -> CheckResult:
    name = name or f"command:{' '.join(cmd)}"
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120, check=False
        )
        return CheckResult(
            name=name,
            passed=result.returncode == 0,
            detail=f"exit={result.returncode}; stderr={result.stderr[:500]}"
            if result.returncode != 0 else "",
        )
    except FileNotFoundError:
        return CheckResult(name=name, passed=False, detail=f"command not found: {cmd[0]}")
    except subprocess.TimeoutExpired:
        return CheckResult(name=name, passed=False, detail="timeout (>120s)")


def check_phase_tag(prior_phase: int) -> CheckResult:
    name = f"prior-phase-tag:v0.{prior_phase}.0-phase-{prior_phase}"
    result = subprocess.run(
        ["git", "tag", "--list", f"v0.{prior_phase}.0-phase-{prior_phase}"],
        capture_output=True, text=True, check=False,
    )
    has_tag = bool(result.stdout.strip())
    return CheckResult(
        name=name, passed=has_tag,
        detail=f"tag v0.{prior_phase}.0-phase-{prior_phase} not found" if not has_tag else "",
    )


def check_tool_available(tool: str) -> CheckResult:
    return CheckResult(
        name=f"tool-available:{tool}",
        passed=shutil.which(tool) is not None,
        detail=f"{tool} not in PATH" if shutil.which(tool) is None else "",
    )


def check_capture_descriptors(descriptors: list[tuple[str, str]]) -> list[CheckResult]:
    """Each descriptor is (sim_variant_dir, descriptor_name) e.g. ('reaction-diffusion-2d-ref',
    'gray-scott-lambda-128sq-seed42-step2000')."""
    out = []
    for variant_dir, descriptor in descriptors:
        manifest = Path("captures") / variant_dir / f"{descriptor}.json"
        payload = Path("captures") / variant_dir / f"{descriptor}.h5"
        out.append(check_path_exists(manifest))
        out.append(check_path_exists(payload))
    return out


def phase_0_preflight() -> PreflightReport:
    """Phase 0: foundation. Repo may be empty; minimal checks.

    Checks:
      - Tools available: git, python (>=3.12), uv, pnpm, node (>=22).
      - Working directory is a git repo.
      - No conflicting top-level files (script enumerates expected state).
    """
    r = PreflightReport(phase=0)
    r.add(*_tool_pair(check_tool_available("git")))
    r.add(*_tool_pair(check_tool_available("python3")))
    r.add(*_tool_pair(check_tool_available("uv")))
    r.add(*_tool_pair(check_tool_available("pnpm")))
    r.add(*_tool_pair(check_tool_available("node")))
    # Verify we're in a git repo
    in_repo = subprocess.run(
        ["git", "rev-parse", "--git-dir"],
        capture_output=True, check=False,
    ).returncode == 0
    r.add("in-git-repo", in_repo, "not inside a git repository" if not in_repo else "")
    return r


def phase_1_preflight() -> PreflightReport:
    """Phase 1: TDD bootstrap, 3 stages, 9 sims.

    Preconditions: Phase 0 landed.
    """
    r = PreflightReport(phase=1)
    _add_check(r, check_phase_tag(0))
    for p in [
        # Spec at docs/architecture.md is the canonical document; its
        # Appendices D, E, F, G contain what was previously in separate
        # conventions / shared-invariants / agent-playbook / dispatch-readiness
        # files (post-v2.3 consolidation).
        Path("docs/architecture.md"),
        Path("docs/glossary.md"),
        Path("tools/testkit/schemas/capture-v1.json"),
        Path("tools/testkit/capture/__init__.py"),
        Path("tools/testkit/determinism/harness.py"),
        Path("tools/testkit/equivalence/harness.py"),
        Path("tools/testkit/equivalence/tolerance.toml"),
        Path("tools/testkit/code_verification/mms"),
        Path("tools/testkit/golden/tables"),
        Path("tools/testkit/probes/template.md"),
        Path("tools/integrity/integrity"),
        Path("tools/diagnostics/tier1"),
        Path("tools/diagnostics/tier2/scalar_field"),
        Path("common/common-ts"),
        Path("packages/reaction-diffusion-2d"),
        Path("references/SPlisHSPlasH"),
    ]:
        _add_check(r, check_path_exists(p))
    # RD-2D capture per shared-invariants
    for c in check_capture_descriptors([
        ("reaction-diffusion-2d-ref", "gray-scott-lambda-128sq-seed42-step2000"),
    ]):
        _add_check(r, c)
    # Integrity green
    _add_check(r, check_command(
        ["python", "-m", "bit_physics_integrity", "--all"],
        name="integrity-all-green",
    ))
    # Tests green
    _add_check(r, check_command(
        ["pytest", "-W", "error", "tools/"],
        name="pytest-tools-green",
    ))
    return r


def phase_2_preflight() -> PreflightReport:
    """Phase 2: cross-stack replication, 10 stages (incl. Stage 0 common-warp bootstrap).

    Preconditions: Phase 1 landed.
    """
    r = PreflightReport(phase=2)
    _add_check(r, check_phase_tag(1))
    for p in [
        Path("common/common-cpp"),
        Path("common/common-py"),
        Path("tools/diagnostics/tier2/particle"),
        Path("tools/diagnostics/tier2/vector_field"),
        Path("tools/diagnostics/tier2/closed_form"),
    ]:
        _add_check(r, check_path_exists(p))
    # Per-sim probe reports and spec sheets
    for sim in [
        "strange-attractors", "mandelbulb-explorer",
        "boids-3d", "physarum",
        "reaction-diffusion-3d", "sph-water", "eulerian-smoke",
        "lattice-boltzmann-d3q19", "mpm-multimaterial",
    ]:
        _add_check(r, check_path_exists(
            Path(f"tools/testkit/probes/reports/{sim}.md")
        ))
    # Source-sim captures per shared-invariants
    descriptors = [
        ("sph-water-ref", "dam-break-1M-particles-seed42-step1000"),
        ("eulerian-smoke-ref", "taylor-green-128cube-seed42-step500"),
        ("lattice-boltzmann-d3q19-ref", "poiseuille-64x32-seed42-step1000"),
        ("mpm-multimaterial-ref", "drop-impact-128cube-seed42-step500"),
    ]
    for c in check_capture_descriptors(descriptors):
        _add_check(r, c)
    _add_check(r, check_command(
        ["python", "-m", "bit_physics_integrity", "--all"],
        name="integrity-all-green",
    ))
    return r


def phase_3_preflight() -> PreflightReport:
    """Phase 3: secondary categories, 11 tasks."""
    r = PreflightReport(phase=3)
    _add_check(r, check_phase_tag(2))
    for p in [
        Path("common/common-warp"),
        Path("docs/common/warp.md"),
    ]:
        _add_check(r, check_path_exists(p))
    # Phase 2 port directories
    for port_dir in [
        "continuous-ca/reaction-diffusion-2d/ref-stack-c",
        "continuous-ca/reaction-diffusion-2d/ref-stack-d",
        "particle-fluid/sph-water/ref-stack-d",
        "hybrid-pg/mpm-multimaterial/ref-stack-e",
    ]:
        _add_check(r, check_path_exists(Path(port_dir)))
    _add_check(r, check_command(
        ["python", "-m", "bit_physics_integrity", "--all"],
        name="integrity-all-green",
    ))
    return r


def phase_4_preflight() -> PreflightReport:
    """Phase 4: frontier variants, 35 stages.

    Preconditions: Phase 3 landed. Stages 31-33 sim names locked. CUDA available
    OR documented fallback accepted.
    """
    r = PreflightReport(phase=4)
    _add_check(r, check_phase_tag(3))
    for p in [
        Path("common/common-3dgs"),
        Path("tools/testkit/render_similarity"),
        # Phase 3 sims
        Path("continuous-ca/lenia"),
        Path("continuous-ca/neural-ca"),
        Path("rigid-body/articulated-pedagogical"),
        Path("soft-body/cloth-xpbd"),
        Path("learned-dynamics"),
        # Pre-vendored frontier papers
        Path("references/papers"),
    ]:
        _add_check(r, check_path_exists(p))
    # CUDA availability check (best-effort; informational)
    nvidia_smi = shutil.which("nvidia-smi")
    cuda_ok = False
    if nvidia_smi:
        result = subprocess.run(["nvidia-smi"], capture_output=True, text=True, check=False)
        cuda_ok = result.returncode == 0
    r.add(
        "cuda-available",
        cuda_ok,
        "CUDA not detected; Stages 31-33 will run in CPU-only fallback per "
        "shared-invariants § 5" if not cuda_ok else "",
    )
    # cuda-available is informational; treat as warning, not blocker
    if not cuda_ok:
        r.checks[-1].passed = True  # don't block; fallback documented
    _add_check(r, check_command(
        ["python", "-m", "bit_physics_integrity", "--all"],
        name="integrity-all-green",
    ))
    return r


def phase_5_preflight() -> PreflightReport:
    """Phase 5: productization, 5 sub-phases.

    Preconditions: Phase 4 landed (partial Phase 4 acceptable per Phase 5 § 0).
    """
    r = PreflightReport(phase=5)
    _add_check(r, check_phase_tag(4))
    for p in [
        Path("tools/productization"),
        # Phase 5 doesn't require all of Phase 4 done, just _some_
        Path("docs/sim-specs"),
    ]:
        _add_check(r, check_path_exists(p))
    _add_check(r, check_command(
        ["python", "-m", "bit_physics_integrity", "--all"],
        name="integrity-all-green",
    ))
    return r


# Helpers
def _tool_pair(c: CheckResult) -> tuple[str, bool, str]:
    return c.name, c.passed, c.detail


def _add_check(report: PreflightReport, c: CheckResult) -> None:
    report.checks.append(c)


PREFLIGHTS = {
    0: phase_0_preflight,
    1: phase_1_preflight,
    2: phase_2_preflight,
    3: phase_3_preflight,
    4: phase_4_preflight,
    5: phase_5_preflight,
}


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: preflight-phase.py <phase-number>", file=sys.stderr)
        return 2
    try:
        phase = int(sys.argv[1])
    except ValueError:
        print(f"Phase must be integer, got {sys.argv[1]!r}", file=sys.stderr)
        return 2
    if phase not in PREFLIGHTS:
        print(f"No preflight for phase {phase}", file=sys.stderr)
        return 2
    report = PREFLIGHTS[phase]()
    report.print()
    return 0 if report.all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

```

End of embedded preflight script.

---

---

### 7.2 Block 2: MMS

> **▼▼▼ BEGIN PROMPT — Block 2: MMS ▼▼▼**
>
> *(Block 1 has completed. The agent consults this section at the Block 2 boundary, having been running since Block 1 per § 6.2.)*

You are the Phase 0 build agent. This is Block 2 (MMS) — the Method of Manufactured Solutions pipeline for the heat equation 1D.

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part II § 2.2 (MMS methodology), § 2.10 (Layer 0 → Layer N gate); skim § 2.4 for context.

**Also read:** `phase-0-plan.md` § 3.1 (your block's scope), § 5 (report schema).

**Foundation you build on:** Block 1 shipped `tools/testkit/capture/` and the schemas, but you do **not** use the capture format for MMS output — MMS produces analysis state (error tables, convergence orders), not simulation state. View Block 1's live state to confirm your imports work, but don't be constrained by it.

**Deliverables (all under `tools/testkit/code_verification/mms/`):**

1. **Solutions library** at `solutions/heat-1d/`:
   - Parameterized smooth manufactured solution for the heat equation 1D, periodic boundary conditions. Recommended: a smooth function `u(x, t)` that is not a free solution of the unaugmented PDE, so the source term is non-trivial. Define as a Python class with `evaluate(x, t)`, `source_term(x, t)`, `boundary_conditions()`.

2. **Symbolic derivation** at `derive.py` — SymPy pipeline that takes (PDE, manufactured solution) and produces the source term. Commit the derivation output at `solutions/heat-1d/derivation.md` (per spec § 2.2 — the runner does not re-derive at test time).

3. **Reference solver** at `solvers/heat_1d_ftcs.py` — minimal NumPy FTCS (forward-time central-space): explicit forward Euler in time (order 1), centered second differences in space (order 2), periodic BCs. CFL: `dt = c · dx² / D` with `c < 0.5`; pick c small enough (e.g., 0.25) that temporal truncation does not dominate spatial. Observed order in the converged regime should be ≈ 2 with dx-refinement at fixed final time.

4. **Runner** at `runner.py` — invokes the reference solver at N ∈ {16, 32, 64, 128} cells with the MMS source term; persists results as a small dataclass/dict to `tests/fixtures/heat-1d-results.h5` (plain HDF5 via `h5py`; does **not** use Block 1's capture format).

5. **Analyzer** at `analyze.py` — consumes runner output; computes L² and L-∞ errors against the manufactured solution per resolution; fits convergence curve via least squares in log-log space; reports observed order. Pass criterion: observed order within ±0.5 of formal order (2 here).

6. **Acceptance report** at `solutions/heat-1d/acceptance.md` — error table + observed order for the green run.

7. **Tests** at `tests/`:
   - (a) Derive pipeline reproduces the manually-derived source for the chosen manufactured solution.
   - (b) Reference solver with zero source and an eigenfunction initial condition decays at the analytical rate (sanity check).
   - (c) Analyzer reports order ≈ 2 ± 0.5 on the FTCS solver with MMS source.
   - (d) **Negative test:** a deliberately broken solver at `solvers/heat_1d_broken.py` — uses **first-order forward difference** for spatial derivative instead of second-order central. The analyzer reports observed order ≈ 1, outside the ±0.5 band around formal order 2; the test asserts the analyzer rejects this solver.

8. **Documentation** at `docs/testkit/mms.md`.

**Discipline:** Convention #8, M, A; FACT/INFERENCE tagging in report; tests-first within this module.

**Failure modes** (spec § 9.4): Category 6 (test-design fabrication — your negative test must fail for the right reason); Category 4 (numerical correctness — does FTCS actually produce observed order 2 at these resolutions?).

**Self-verification:** `ruff`, `mypy --strict`, `pytest -W error` all green on `tools/testkit/code_verification/mms/`. Acceptance report's observed order is within tolerance of formal order. Broken-solver test fails the analyzer's pass criterion as expected.

**Report back:** `docs/_audits/phase-0/block-2-mms-<UTC>.md` per § 5.1 schema. Front-matter `block: 2, name: mms`. `top_level_deps_to_merge` includes SymPy if not already in Block 1's pyproject.

>
> **▲▲▲ END PROMPT — Block 2: MMS ▲▲▲**

---

### 7.3 Block 3: HARNESSES

> **▼▼▼ BEGIN PROMPT — Block 3: HARNESSES ▼▼▼**
>
> *(Blocks 1–2 have completed with CONFIRMED.)*

You are the Phase 0 build agent. This is Block 3 (HARNESSES) — the determinism and cross-stack equivalence harnesses.

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part II § 2.5 (determinism), § 2.6 (cross-stack equivalence + the tolerance table), § 2.7 (capture format).

**Also read:** `phase-0-plan.md` § 3.3.2 + § 3.3.3 (the public APIs you ship), § 5 (report schema).

**Foundation you build on:** Block 1's `bit_physics_testkit.capture` (view it to confirm `diff_captures` signature).

**Deliverables:**

1. **Determinism harness** at `tools/testkit/determinism/`:
   - `harness.py` exposing the public API in `phase-0-plan.md § 3.3.2`: `SimRunner` Protocol, `DeterminismVerdict` dataclass, `run_twice_and_diff()` function.
   - `policy.md` — per-stack determinism guidance from spec § 2.5.
   - `tests/` — stub `SimRunner` that produces a deterministic NumPy capture (passes the gate); stub that uses `np.random.default_rng()` without re-seeding (fails the gate). Both use Block 1's `write_capture`.

2. **Equivalence harness** at `tools/testkit/equivalence/`:
   - `harness.py` exposing `compare_captures()` per § 3.3.3.
   - `tolerance.toml` — the spec § 2.6 default tolerance table in TOML form; schema-validated.
   - `tests/` — two Python "stub stacks" (just scripts evaluating the same polynomial on the same grid); test asserts captures match within tolerance. Negative test: a third stub produces a wrong answer; fails the equivalence gate.

3. **Property-based testing harness** at `tools/testkit/property/` (new in v0.11 amendment; spec § 2.14):
   - `harness.py` exposing `run_invariants(sim_runner, invariants, n_examples=100)` where `invariants` is a list of declared `Invariant` objects (each with `name`, `applies_to_category`, `check_fn`).
   - `invariants/` — built-in invariant library: `conservation_mass`, `conservation_momentum`, `conservation_energy`, `monotone_bounds`, `no_particle_overlap_within_epsilon`, `divergence_free_where_prescribed`. Each invariant declares its applicable Tier-2 substack and returns `Pass | Fail(counter_example)`.
   - `strategies.py` — Hypothesis strategies for generating valid random initial conditions per category (random smooth scalar fields for continuous-CA; random particle configurations for SPH; random divergence-free fields for incompressible flow; etc.).
   - `tests/` — stub sim that satisfies a declared mass-conservation invariant (PBT passes); stub sim that subtly violates it (PBT finds and shrinks a counter-example). Both fail loudly with a useful error including the shrunken minimal failing input.
   - `pyproject.toml` declares `hypothesis>=6.0` dependency.
   - `.hypothesis/` directory in `.gitignore` is REMOVED — the example database IS committed (per spec § 2.14, for reproducibility of shrunken counter-examples).

4. **CI activation** — your report's front-matter `ci_activation:` field lists the lines/jobs in `.github/workflows/determinism.yml`, `equivalence.yml`, and a new `property.yml` to flip on. Block 9 (LANDING) does the flipping. Do NOT edit workflow files directly.

5. **Documentation** at `docs/testkit/determinism.md`, `docs/testkit/equivalence.md`, `docs/testkit/property.md`.

**Discipline:** Convention #8, M, A; FACT/INFERENCE tagging; tests-first.

**Failure modes** (spec § 9.4): Category 3 (schema drift — `tolerance.toml` must validate); Category 6 (test-design fabrication — negative tests must fail for the right reason); for PBT specifically, watch for "PBT passes vacuously" when the invariant function returns Pass on degenerate inputs — assert via positive-failure stub.

**Self-verification:** `ruff`, `mypy --strict`, `pytest -W error` green on all three module roots. All six stubs (det pass, det fail, equiv pass, equiv fail, PBT pass, PBT fail) behave as expected.

**Report back:** `docs/_audits/phase-0/block-3-harnesses-<UTC>.md`. Front-matter `block: 3, name: harnesses`.

>
> **▲▲▲ END PROMPT — Block 3: HARNESSES ▲▲▲**

---

### 7.4 Block 4: VENDORING

> **▼▼▼ BEGIN PROMPT — Block 4: VENDORING ▼▼▼**
>
> *(Blocks 1–3 have completed.)*

You are the Phase 0 build agent. This is Block 4 (VENDORING) — vendoring the first upstream (SPlisHSPlasH) and the first golden-value table (cubic-spline kernel).

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part II § 2.4 (golden values), § 2.8 (reference vendoring); skim Appendix A for the SPlisHSPlasH citation.

**Also read:** `phase-0-plan.md` § 3.3.4 (the public APIs you ship — note that Block 5 will import your reference implementation directly).

**Foundation you build on:** Block 1's `reference-manifest-v1.json` schema + `load_reference_manifest` helper + the vendoring discipline doc.

**Deliverables:**

1. **Vendor SPlisHSPlasH** at `references/SPlisHSPlasH/`:
   - Look up the current published release SHA at `https://github.com/InteractiveComputerGraphics/SPlisHSPlasH`. **Do not assert a SHA from memory** (Convention #8).
   - **Use sparse-checkout** to vendor only the directory subtree the portfolio cites (at minimum the SPH kernel implementation files — view the upstream to find the actual path; `LICENSE`; the upstream `README.md`). Full-repo vendoring would bloat the new repo by hundreds of MB.
   - If sparse-checkout is impractical, fall back to full-repo vendoring and document the rationale.
   - Manifest at `references/SPlisHSPlasH/MANIFEST.toml` per `reference-manifest-v1.json`.
   - Validate the manifest via Block 1's `load_reference_manifest` before commit.

2. **Cubic-spline kernel derivation** at `tools/testkit/golden/derivations/cubic-spline-kernel.md`:
   - The Monaghan cubic-spline kernel W(q, h) is a well-known piecewise polynomial (Monaghan 1992, 2005). Derive it from the mathematical definition. Do **not** derive it by inspecting the SPlisHSPlasH source — the vendored source is the *test target*, not the source of truth.
   - Reproduce W(q) and |∇W|(q) in markdown + LaTeX. Pick 3D normalization as canonical.
   - Test points q ∈ {0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0} at h = 1.0. Compute expected values via SymPy; commit the derivation script.
   - Cite the file path within the vendored tree where SPlisHSPlasH implements the kernel.

3. **Golden table** at `tools/testkit/golden/tables/cubic-spline-kernel.json`. Schema-validate against Block 1's `golden-v1.json`.

   **Independent-reference anchors (mandatory per spec § 2.4).** At least three of the nine test points MUST include an `independent_reference` field whose `expected` values come from a source independent of the SymPy derivation AND independent of SPlisHSPlasH. Recommended anchors:
   - **q=0** (peak): hand-derivation from the analytic peak value `W(0, h=1) = 8/π` (3D normalization); cite Monaghan 2005 Eq. 2.7.
   - **q=1.0** (piecewise boundary): hand-derivation from the boundary continuity condition; cite Monaghan 2005 Eq. 2.7 piecewise switch.
   - **q=2.0** (compact support): exact zero; cite Monaghan 1992 §2.
   - Additional optional anchor: q=0.5 value cross-referenced from Liu & Liu 2003 *Smoothed Particle Hydrodynamics: A Meshfree Particle Method* Appendix B if available.

   Each anchor includes the source citation (paper + DOI + equation/page), the derivation method (`hand-derivation` or `cross-referenced`), and the independently-derived `expected` values. The SymPy derivation and the independent anchors MUST agree at the anchor points to within 1e-10 absolute; disagreement is REFUTED (HALT and surface — one of the two is wrong).

   This is the mechanical anti-fragility against symmetric upstream bugs per spec § 2.4. If SPlisHSPlasH's kernel has a typo, the SymPy derivation (which doesn't read the upstream) catches it; if the SymPy derivation itself has a typo, the independent anchors catch it.

4. **Generator** at `tools/testkit/golden/generator/cubic_spline.py` — regenerates the table from the SymPy derivation; idempotent. The generator also re-validates that committed `independent_reference` values agree with the SymPy values at the anchor points within tolerance.

5. **Canonical Python reference implementation** at `tools/testkit/golden/reference_implementations/cubic_spline.py` per `phase-0-plan.md § 3.3.4`. NumPy-based; signature `evaluate(inputs: dict) -> dict`. **This is the only Python implementation of the cubic-spline kernel in the repo.** Block 5 will import it.

6. **Verifier** at `tools/testkit/golden/verifier.py` — implements the API per § 3.3.4 exactly. Block 5's Cat 3 check consumes this; do not deviate.

7. **Tests** at `tools/testkit/golden/tests/`:
   - Generator produces the committed table byte-for-byte (idempotency).
   - Verifier returns `ok=True` on your reference implementation.
   - Verifier returns `ok=False` on a deliberately wrong implementation (e.g., wrong piecewise threshold q=1.5 instead of q=1.0).
   - API contract test: trivial fake evaluator; result type matches `GoldenVerifierResult`.

8. **Documentation** at `docs/testkit/golden-values.md`.

**Discipline:** Convention #8 (SHA looked up, not memory); Convention #12 (SHA back-fills are separate commits); FACT/INFERENCE tagging.

**Failure modes** (spec § 9.4): Category 5 (Convention #8 fabrication — especially the SHA); Category 1 (anchor drift — the derivation must cite the upstream file path correctly within the vendored tree).

**Self-verification:** Strict CI green. Committed table validates against schema. Idempotency passes. Verifier passes on reference impl; fails on wrong impl.

**Critical sanity check:** Before committing, hand-evaluate the kernel formula at q=0 (peak), q=1.0 (piecewise boundary), q=2.0 (W must be exactly 0 — compact support). Verify your committed values match. The whole pipeline rests on the table being correct.

**Report back:** `docs/_audits/phase-0/block-4-vendoring-<UTC>.md`. Front-matter `block: 4, name: vendoring`. **Include the vendored SHA** in `evidence_paths` and again as a FACT in the body — this is the most load-bearing fact your block produces.

>
> **▲▲▲ END PROMPT — Block 4: VENDORING ▲▲▲**

---

### 7.5 Block 5: INTEGRITY

> **▼▼▼ BEGIN PROMPT — Block 5: INTEGRITY ▼▼▼**
>
> *(Blocks 1–4 have completed.)*

You are the Phase 0 build agent. This is Block 5 (INTEGRITY) — the integrity toolkit with all five categories of check.

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part III § 3.2 (Layer 1 — integrity, categories, failure modes, directory, suppression). Skim Part VII (the conventions you enforce).

**Also read:** `phase-0-plan.md` § 3.3.5 (your public API), § 3.3.4 (Block 4's API you consume).

**Foundation you build on:** Block 1 (repo skeleton, capture, schemas, pre-commit base config). Block 4 (`bit_physics_testkit.golden` — your Cat 3 imports `reference_implementations.cubic_spline.evaluate` directly).

**Deliverables (under `tools/integrity/`):**

1. **Package skeleton:**
   - `pyproject.toml` (package `bit_physics_integrity`).
   - `integrity/__main__.py` — CLI: `python -m integrity [--cat N] [--mode strict|advisory] [--staged-only] [files...]`.
   - `integrity/runner.py` — orchestrates checks, aggregates findings.
   - `integrity/common/` — `types.py` (Finding, FailureMode per § 3.3.5), repo helpers (find_repo_root, git ls-files, head SHA), annotation parsing for `# integrity-allow: <check>; <reason>; <tracking-id>` suppressions.

2. **Cat 1 — Citation integrity** at `integrity/cat1_citations/`:
   - `intra_repo.py` (`cat1.intra-repo`): every `path:line` citation in repo-tracked files resolves to an existing file with that line count. Mode: HARD_FAIL. Restrict to repo-local paths.
   - Grammar parser; resolver against git HEAD.

3. **Cat 2 — Contract verification** at `integrity/cat2_contracts/`:
   - `python_module_exports.py` (`cat2.python-exports`): every public symbol declared in a Python package's `__init__.py` resolves to a real implementation. Mode: HARD_FAIL.
   - Stub modules for Stack-C and Stack-B contract checks (TODO markers; not active in Phase 0).

4. **Cat 3 — Numerical correctness** at `integrity/cat3_numerical/`:
   - `golden_values.py` (`cat3.golden-values`): for every JSON file under `tools/testkit/golden/tables/`, calls `bit_physics_testkit.golden.verifier.verify_against_table(table_path, evaluator)`. Mode: SOFT_WARN (spec § 3.2 default).
   - **Independent-reference anchor enforcement** (per spec § 2.4): for each golden table, asserts at least three test points carry an `independent_reference` field. Tables without independent anchors HARD_FAIL.
   - Per-algorithm registry at `evaluators/`. Phase 0 entry: `evaluators/cubic_spline.py` — a thin shim importing `bit_physics_testkit.golden.reference_implementations.cubic_spline.evaluate` and registering it under algorithm name `cubic-spline-kernel`. **Do not re-implement the kernel.**
   - Stub hook for MMS reports (placeholder; Block 2's MMS pipeline is consumed in Phase 1+).

5. **Cat 4 — Draft-time spec verification** at `integrity/cat4_draft_time/`:
   - **Phase 0 scope:** `cat4.path-line-assertions` only — scans spec/audit/retro prose for backtick-fenced `` `<path>:<line>` `` or `` `<path>:<start>-<end>` `` assertions; grep-verifies against repo HEAD. Mode: HARD_FAIL at pre-commit. Harder assertion forms documented in `docs/integrity/cat4-draft-time.md` as Phase 1+ deferrals.
   - **Append to `.pre-commit-config.yaml`** the local hook calling `python -m integrity --cat 4 --staged-only` at `commit-msg` stage.

6. **Cat 5 — Provenance traceability** at `integrity/cat5_provenance/`:
   - `audit_links.py` (`cat5.audit-links`): every block report's `evidence_paths` front-matter resolves; every FACT-tagged claim links to a file path. Mode: SOFT_WARN.

7. **Cat-X — Tolerance-budget check** at `integrity/catx_tolerance_budget/` (new in v0.11; per spec § 2.6):
   - `tolerance_budget.py` (`catx.tolerance-budget`): reads `tools/testkit/equivalence/tolerance.toml` and `tools/testkit/equivalence/tolerance-budget.toml`; for every per-sim override, asserts the override is within the budget for the corresponding category. Mode: HARD_FAIL.
   - Suppression for legitimate amendments: the check reads the most-recent `docs/_audits/tolerance-budget-amendments/*.md` audit and recognizes operator-approved amendments. Amendment-files use the canonical front-matter (verdict CONFIRMED + operator GPG signature in `evidence_paths`).
   - Phase 0 ships the check itself; activated by Block 9. Phase 0's `tolerance.toml` has no per-sim overrides, so the check passes trivially.

8. **Audit-prose freshness script** at `tools/integrity/scripts/audit_prose_freshness.py` — drafter-runs-before-commit re-verification of backtick-fenced citations. Standalone tool.

9. **Evidence-path verification script** at `tools/integrity/scripts/verify_evidence.py` (new in v0.11; per spec § 7.5 and Appendix G.7):
   - CLI: `python -m integrity.scripts.verify_evidence --audit <path> [--strict]`.
   - Reads the audit's YAML front-matter.
   - For each path in `evidence_paths:`, asserts the file exists at the audit's `head_sha` (uses `git show <sha>:<path>`) and is non-empty.
   - For each entry in `evidence_hashes:` (map of `path: sha256`), computes the sha256 of the file content at `head_sha` and asserts it matches.
   - Exit 0 on all-pass; exit 1 on any failure with a structured error listing each failing path and reason.
   - The script is used by:
     - The founder at every stage-boundary review (manual invocation).
     - The phase-closing-audit agent before writing CONFIRMED verdict (automated; agent inspects the script output and includes a passing-line in the closing report).
     - Cat 5 provenance check (calls into this script for every audit it scans).
   - Tests at `tools/integrity/tests/test_verify_evidence.py`: fixture audit with valid paths (passes); fixture audit with missing path (fails); fixture audit with mismatched hash (fails); fixture audit with deleted file at head_sha (fails).

10. **Cross-phase audit replay script** at `tools/integrity/scripts/replay_prior_phase.py` (new in v0.11; per spec § 7.5 and Appendix G.7):
    - CLI: `python -m integrity.scripts.replay_prior_phase --prior-phase <name> --audit <path> --gates <comma-list>`.
    - Acts: (1) checks out the prior-phase tag; (2) re-runs every gate listed in `--gates` (default: `integrity,pytest,equivalence,determinism,perf-ledger`); (3) compares the actual gate results to the verdicts asserted in the prior-phase landing audit; (4) returns a structured report.
    - Exit 0 if all replayed gates match the audit's claims; exit 1 if any discrepancy.
    - The script is Phase N+1's first stage's first action; mandatory for Phase 1 onward (Phase 0 has no prior phase to replay).
    - Tests at `tools/integrity/tests/test_replay_prior_phase.py`: stub-phase fixture with all gates green and matching audit (passes); stub-phase fixture where audit claimed CONFIRMED but a gate actually fails on replay (fails with structured discrepancy report).

11. **Adversarial-fixture corpus** at `tools/integrity/tests/fixtures/adversarial/` (new in v0.11; per spec § 3.2):
    - `cat1_broken_citations/` — markdown files with `path:line` citations to non-existent paths or wrong line numbers.
    - `cat2_phantom_contracts/` — `__init__.py` declaring exports that don't exist in the module.
    - `cat3_wrong_goldens/` — golden-table JSON files with off-by-one `expected` values (i.e., the table contradicts the canonical reference impl).
    - `cat4_unverified_assertions/` — spec-style markdown with backtick-fenced path:line citations to non-existent targets.
    - `cat5_orphan_claims/` — audit-style markdown with FACT-tagged claims whose `evidence_paths` are unresolvable.
    - `catx_over_budget_tolerance/` — `tolerance.toml` override exceeding `tolerance-budget.toml` cap.
    - Each subdirectory has a `manifest.json` declaring `expected_finding: {check: "cat1.intra-repo", mode: "HARD_FAIL", line_count: N}` so the meta-test can confirm exact behavior.

12. **Adversarial meta-test** at `tools/integrity/tests/test_adversarial_coverage.py`:
    - For each adversarial fixture, runs the corresponding Cat check.
    - Asserts the check produces the expected_finding count and severity.
    - Asserts no false-positives on the known-good fixtures.
    - HARD_FAIL on any adversarial fixture that goes undetected (Cat check did not flag it).
    - This is the load-bearing meta-test that makes the integrity toolkit's correctness testable.

13. **Mutation-testing configuration** at `tools/testkit/mutation/` (new in v0.11; per spec § 2.13):
    - `mutmut-config.toml` configured to target `tools/testkit/code_verification/`, `tools/testkit/golden/`, `tools/testkit/determinism/`, `tools/testkit/equivalence/`, `tools/testkit/capture/`, `tools/testkit/property/`, `tools/integrity/integrity/cat4_draft_time/`.
    - Per-target threshold:
      - `code_verification/mms/`: ≥ 80%.
      - `golden/`: ≥ 80%.
      - `determinism/`: ≥ 90%.
      - `equivalence/`: ≥ 85%.
      - `capture/`: ≥ 90%.
      - `property/`: ≥ 80%.
      - `cat4_draft_time/`: ≥ 90%.
    - `run-mutation.sh` — orchestration script; runs mutmut per target; emits a structured JSON report at `tools/testkit/mutation/baseline-<UTC>.json` recording the initial mutation score per target.
    - The Phase 0 mutation-testing run produces the baseline; the SOFT_WARN-in-CI / HARD_FAIL-at-landing posture per spec § 2.13 activates from Phase 1 onward.

14. **Strict-mode policy** at `docs/integrity/strict-mode.md` (spec § 7.7 soft-warn exception process).

15. **Per-category docs** at `docs/integrity/{overview.md, cat1-citations.md, cat2-contracts.md, cat3-numerical.md, cat4-draft-time.md, cat5-provenance.md, catx-tolerance-budget.md}`. Each documents Phase 0 scope + deferred scope.

16. **Tests** at `tools/integrity/tests/`. Each check has fixture-driven pass and fail cases.

17. **CI activation** in your report's front-matter — lines to flip in `.github/workflows/integrity.yml`, `audit-append-only.yml`, `tolerance-budget-check.yml`, `mutation-testing.yml`. Block 9 activates.

**Discipline:** Convention #8 (every assertion in your `docs/integrity/*.md` is grep-verified against the live repo). Convention H (filter rules query named properties, not string literals). Strict adherence to the § 3.3.4 verifier API.

**Failure modes** (spec § 9.4): Category 2 (API drift — your Cat 3 check calls `verify_against_table` with the exact § 3.3.4 signature); Category 7 (spec self-consistency — per-cat docs match check behavior); Category 6 (test-design fabrication — the adversarial meta-test must fail when a check fails to flag a known-bad fixture; verify by deliberately disabling a check and confirming the meta-test catches it).

**Self-verification:** Strict CI green. Every check has a passing-case test and a failing-case test, both behaving as expected. `python -m integrity --cat 1` runs cleanly. `python -m integrity --cat 4 docs/architecture.md` returns clean. Cat 3 runs cleanly against Block 4's table (including independent-reference anchor count). Cat-X runs cleanly against Block 1's `tolerance-budget.toml`. The adversarial meta-test passes (every adversarial fixture is detected, no false-positives on good fixtures). `verify_evidence.py` correctly verifies a fixture audit. `replay_prior_phase.py` correctly handles its stub-phase fixtures. Initial mutation-score baseline produced.

**Report back:** `docs/_audits/phase-0/block-5-integrity-<UTC>.md`. Front-matter `block: 5, name: integrity`. Include the mutation-score baseline values per target in the body as FACTs.

>
> **▲▲▲ END PROMPT — Block 5: INTEGRITY ▲▲▲**

---

### 7.6 Block 6: DIAGNOSTICS

> **▼▼▼ BEGIN PROMPT — Block 6: DIAGNOSTICS ▼▼▼**
>
> *(Blocks 1–5 have completed.)*

You are the Phase 0 build agent. This is Block 6 (DIAGNOSTICS) — the diagnostic toolchain (Tier 1 universal + Tier 2 scalar-field).

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part III § 3.3 (Layer 2 — diagnostics, three tiers, directory). Skim Part II § 2.7 (capture format) and § 2.5 (determinism).

**Also read:** `phase-0-plan.md` § 3.3.6 (your public APIs).

**Foundation you build on:** Block 1 (capture). Block 3 (`bit_physics_testkit.determinism.run_twice_and_diff` — your `tier1/determinism.py` composes this directly; no Protocol/mock needed in sequential execution).

**Deliverables (under `tools/diagnostics/`):**

1. **Tier 1 — Universal** at `tier1/`:
   - `capture_io.py` — thin layer over Block 1's `bit_physics_testkit.capture` for diagnostic use (iterate steps, extract per-step state arrays).
   - `health.py` per § 3.3.6 — `check_health(capture) -> HealthReport`. CLI: `ok=True → exit 0`, `ok=False → exit 1`.
   - `performance.py` — wall-clock timing aggregation, GPU dispatch counts (when stack emits them), memory high-water marks. Reads `run.wall_clock_seconds` from manifest.
   - `determinism.py` per § 3.3.6 — `check_determinism(runner, seed)` directly imports and calls `bit_physics_testkit.determinism.run_twice_and_diff`.
   - `reports.py` — common report types + serialization.

2. **Tier 2 — Scalar-field** at `tier2/scalar_field/`:
   - `monotone_bounds.py` per § 3.3.6.
   - `spectral_content.py` — FFT analysis; verifies expected spectral content (no spurious high-frequency growth).
   - `conservation.py` — total-mass conservation for closed scalar systems.

3. **Tier 2 stubs** at `tier2/{particle,vector_field,closed_form}/` — README stubs marking each directory reserved for Phase 1+ Tier 2 substacks.

4. **Tier 3** at `tier3/` — README stub describing the per-sim shim pattern.

5. **Tests** at `tier1/tests/` and `tier2/scalar_field/tests/`. Each module has passing-case + failing-case.

6. **Documentation** at `docs/diagnostics/overview.md`, `tier1-universal.md`, `tier2-scalar-field.md`. The overview links per-tier docs. Document the `schema_version` policy: reject unknown future versions (silently accepting forward-incompatible payloads creates phantom-success risk).

**Discipline:** Convention #8, M, A; FACT/INFERENCE tagging.

**Failure modes** (spec § 9.4): Category 3 (schema drift — `capture_io.py` must use Block 1's reader exactly); Category 6 (NaN/Inf checks must catch real cases, not just synthetic).

**Self-verification:** Strict CI green. Every diagnostic module has passing + failing case tests. Schema-version policy is documented.

**Report back:** `docs/_audits/phase-0/block-6-diagnostics-<UTC>.md`. Front-matter `block: 6, name: diagnostics`.

>
> **▲▲▲ END PROMPT — Block 6: DIAGNOSTICS ▲▲▲**

---

### 7.7 Block 7: COMMON-TS

> **▼▼▼ BEGIN PROMPT — Block 7: COMMON-TS ▼▼▼**
>
> *(Blocks 1–6 have completed.)*

You are the Phase 0 build agent. This is Block 7 (COMMON-TS) — the first common module (TypeScript/WebGPU), plus the cross-stack capture invariance gate.

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part III § 3.4 (Layer 3 — common infrastructure); Part IV § 4.2 (Stack B — TS/WebGPU). Skim § 7.8 (CI does not exercise display surfaces needing real GPUs).

**Also read:** `phase-0-plan.md` § 3.3.7 (TS public API), § 3.5 (cross-language interop), § 4 (h5wasm is the verified HDF5 strategy).

**Foundation you build on:** Block 1's HDF5 payload schema (`/steps/{N}/state/{field}`, `/steps/{N}/diagnostics/{check}`, `/metadata/`) — your TS-written captures must match this layout byte-for-byte so Block 1's Python reader can load them.

**Deliverables (under `common/common-ts/`):**

0. **h5wasm preflight check** — do this FIRST, before anything else. Write `preflight/h5wasm-check.mjs` using h5wasm to write a tiny HDF5 file (single 4-element float array at `/test/data`). Write `preflight/h5wasm-check.py` using `h5py` to read it; assert values match. Run both; confirm round-trip works. **If h5wasm fails to install, build, or round-trip:** stop, set verdict to REFUTED, explain in report. The plan depends on h5wasm; if it doesn't work, the user picks a different strategy before we proceed. Cost of preflight: ~30 minutes. Cost of discovering h5wasm doesn't work later: a full Block 7 redo.

1. **Package** as a pnpm TypeScript package:
   - `package.json` (`engines: { node: ">=22" }`), `tsconfig.json` (strict: true, noImplicitAny: true, noUncheckedIndexedAccess: true), `tsconfig.build.json`.
   - Source in `src/`, public exports in `src/index.ts`.

2. **Device init** at `src/context.ts`. `createContext()` per § 3.3.7.

3. **BindGroup management** at `src/bindgroups.ts` — helpers for layouts + bind groups.

4. **Shader compilation** at `src/pipelines.ts` — `ComputePipeline.create(...)` and `RenderPipeline.create(...)`. Hot-reload-friendly callback API.

5. **Capture I/O** at `src/capture.ts` — `CaptureWriter` per § 3.3.7 using h5wasm. Writes HDF5 payload matching spec § 2.7 layout + JSON manifest. Byte-compatible with Block 1's `h5py` reader.

6. **IndexedDB persistence** at `src/indexeddb.ts` — schema-versioned in-browser storage.

7. **Smoke simulator** at `examples/hello-physics/` — 2D heat diffusion with a closed-form analytical solution (evolve a Gaussian initial condition under the heat equation; the analytical solution is a wider Gaussian at later times). Tiny, deterministic, capture-producing. Verifiable against the closed form.

8. **Tests** at `src/__tests__/` (Vitest):
   - WebGPU-device-requiring tests (smoke sim run) marked skip-in-CI (per spec § 7.8); local-only.
   - **Cross-stack invariance test**: `package.json` script `test:cross-stack` — writes a capture via `CaptureWriter`, spawns `uv run python -c "from bit_physics_testkit.capture import load_capture; ..."`, asserts exit 0 + matching values. This script runs locally (Block 9 verifies it).
   - Hot-reload callback fires on shader update.
   - Hello-physics sim is bit-deterministic across two runs (same seed → byte-identical capture).

9. **Documentation** at `docs/common/ts.md` — public API, plus a "HDF5 in the browser" subsection explaining h5wasm.

**Discipline:** Convention #8, M, A; FACT/INFERENCE tagging; strict TS.

**Failure modes** (spec § 9.4): Category 3 (HDF5 layout must match spec § 2.7 exactly — verify by round-tripping); Category 4 (WGSL shader correctness — sign/orientation bugs surface as round-trip mismatches).

**Self-verification:** Preflight passes (deliverable 0). `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm eslint` green. `test:cross-stack` passes locally. Smoke sim bit-deterministic.

**Cross-stack invariance gate:** Before reporting CONFIRMED, manually run `uv run python -c "from bit_physics_testkit.capture import load_capture; c = load_capture('common/common-ts/examples/hello-physics/captures/sample/manifest.json'); print(c.step(0).state)"`. Confirm load + values match what the TS sim wrote.

**Report back:** `docs/_audits/phase-0/block-7-common-ts-<UTC>.md`. Front-matter `block: 7, name: common-ts`. `ci_activation` lists the lines to flip in `.github/workflows/ts-strict.yml`.

>
> **▲▲▲ END PROMPT — Block 7: COMMON-TS ▲▲▲**

---

### 7.8 Block 8: RD-2D

> **▼▼▼ BEGIN PROMPT — Block 8: RD-2D ▼▼▼**
>
> *(Blocks 1–7 have completed.)*

You are the Phase 0 build agent. This is Block 8 (RD-2D) — the integration sim. Your job is to prove the foundation works by taking a single stub simulation (reaction-diffusion 2D on Stack B) through the full TDD cycle, exercising every gate Phase 0 established.

**Source of truth:** `gpu-sims-design-spec-v2.md`. Read in full: Part I § 1.3 (TDD as load-bearing; v2.4 step 4 failing-output capture), Part II (every section — your sim exercises code verification, determinism, diagnostics, PBT, perf-ledger), Part III § 3.5 (Layer 4 thirteen-gate acceptance per v2.4 expansion), Part IV § 4.2 (Stack B), Part V § 5.2.1 (reaction-diffusion-2d).

**Also read:** `phase-0-plan.md` § 3 (the live state of everything you'll consume), § 5 (report schema).

**Foundation you build on:** Everything. View the live source for each before asserting anything about its API.

**The TDD cycle (in order, no skipping):**

1. **Python NumPy reference implementation** at `packages/reaction-diffusion-2d/reference/gray_scott_numpy.py` — clear, readable NumPy implementation of 2D Gray-Scott using explicit forward Euler + 5-point Laplacian + periodic BCs. **This is the ground-truth target.** Unit-test for basic sanity (uniform field stays uniform; mass approximately conserved short-term). Document scheme + conservation in `docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md`.

2. **Spec sheet** at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md` following Block 1's `docs/sim-specs/_template.md`. § 6 verification posture declares: code verification by comparison against Python NumPy reference (WebGPU output matches reference element-wise within `rtol=1e-4, atol=1e-6`); determinism by bit-exact-same-hw; MMS for Gray-Scott DEFERRED to Phase 1 with rationale (Block 2's MMS pipeline only covers heat eq 1D). § 6 also declares the PBT-covered invariants per item 4c below.

3. **Pre-implementation probe** at `tools/testkit/probes/reports/reaction-diffusion-2d.md` following Block 1's `probes/template.md`. Per spec § 2.9, enumerate every API surface from `@bit-physics/common-ts` you'll consume (grep-verified by viewing the actual module), every upstream citation, every test-fixture path, every public type/function exported.

4. **Test suite** at `packages/reaction-diffusion-2d/tests/` — committed and *failing* (no implementation yet). Four classes per spec § 1.3 and § 2.14:
   - **a. Code verification:** at canonical (F=0.0367, k=0.0649, T=2000 steps, seed=42, 128×128), the WebGPU sim's capture matches the NumPy reference's capture element-wise within tolerance. NumPy reference runs at test time (cheap at 128² × 2k); comparison uses Block 1's `diff_captures` in epsilon mode.
   - **b. Determinism:** Block 3's `run_twice_and_diff` against the sim.
   - **c. Property-based invariants** (per spec § 2.14): using Block 3's `tools/testkit/property/`, declare three invariants for RD-2D:
     - `monotone_bounds`: U ∈ [0, 1] and V ∈ [0, 1] at every step, under randomly-sampled initial conditions drawn from `strategies.smooth_scalar_field_in_unit_box(shape=(128, 128))`.
     - `mass_approximately_conserved`: total mass change per step within tolerance proportional to source/sink terms, under random F, k in plausible ranges.
     - `periodic_bc_satisfied`: opposite-boundary values agree at every step under random ICs.
     - Run each invariant with n_examples=20 (small for Phase 0 CI cost; Phase 1+ raises).
   - **d. Diagnostics:** Block 6's `tier1/health.check_health` (NaN/Inf) + `tier2/scalar_field/monotone_bounds.check_bounds` (U ∈ [0, 1], V ∈ [0, 1]) at the canonical seed.

5. **Commit the failing tests with failing-output capture** per spec § 1.3 step 4 + Convention-A:
   - Before committing, run the test suite once: `pytest packages/reaction-diffusion-2d/tests/ -v 2>&1 | tee tools/testkit/failing-tests-evidence/reaction-diffusion-2d-ref-<UTC>.txt`. The tests must fail with `ModuleNotFoundError` or equivalent "implementation missing" error, NOT with `pytest collection error` or `ImportError`-on-fixture. If failure mode is wrong, fix the test setup before committing.
   - Compute `sha256sum tools/testkit/failing-tests-evidence/reaction-diffusion-2d-ref-<UTC>.txt`. Record the hex.
   - Commit the test files AND the failing-output file in a single commit per Convention-A. Commit message:
     ```
     test(rd-2d): failing acceptance tests for Gray-Scott

     Failing-tests-output: tools/testkit/failing-tests-evidence/reaction-diffusion-2d-ref-<UTC>.txt
     Failing-tests-output-hash: sha256:<full-64-char-hex>
     ```
   - The git history must show this commit preceding the implementation commit.

6. **Implementation** at `packages/reaction-diffusion-2d/src/` — WebGPU compute-shader Gray-Scott using `@bit-physics/common-ts` primitives. Minimal viewer optional; capture-producing entry-point mandatory. Commit message:
   ```
   feat(rd-2d): WebGPU Gray-Scott implementation

   Implements-failing-tests-from: <failing-tests-commit-sha>
   Failing-tests-output-hash-witnessed: sha256:<same-hex>
   ```

7. **Capture file** at `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5` plus sidecar `.json`. **v0.9 amendment: this descriptor is locked per spec Appendix D § D.2.3.** Filename MUST be kebab-case lowercase, exactly as listed. Do NOT use underscores. Phase 1 Stage 2 (RD-3D) and Phase 2 Stage 1 (Stack C port) and Phase 2 Stage 2 (Stack D port) and Phase 4 Stage 9 (differentiable variant) all read this capture by exact descriptor name; pairing fails if the descriptor differs.

8. **All thirteen Layer 4 gates** per spec § 3.5 (expanded from ten in v2.4 amendment):
   1. Spec sheet committed with full § 6 verification posture ✓.
   2. Pre-implementation probe committed ✓.
   3. Acceptance test suite committed and originally-failing ✓ — git log shows the failing-tests commit AND its commit footer contains `Failing-tests-output-hash: sha256:<hex>` AND the file at `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-ref-<UTC>.txt` exists with matching hash.
   4. Code-verification tests pass (WebGPU output matches NumPy reference within tolerance). Golden table for RD-2D's NumPy reference (where applicable) has at least three independent-reference anchors per spec § 2.4 — for RD-2D this is satisfied by the NumPy reference itself serving as analytical anchor; document in spec § 6.
   5. Tier 1 diagnostics pass.
   6. Tier 2 scalar-field diagnostics pass.
   7. Citation chain resolves (`python -m integrity --cat 1`).
   8. Public API resolves (`python -m integrity --cat 2`).
   9. Ships with a capture file the testkit can replay. **Capture descriptor**: per item 7 above.
   10. Determinism declaration consistent with capture (re-run the harness; verdict matches declaration).
   11. Property-based tests pass for the three declared invariants (item 4c above). Per spec § 2.14.
   12. First-landing wall-clock recorded in `docs/perf-ledger.md` as the first real row. Per spec § 2.15. Format:
       ```
       | reaction-diffusion-2d | webgpu | gray-scott-lambda-128sq-seed42-step2000 | <seconds> | <hardware-id> | <commit-sha> | <date> | baseline |
       ```
   13. The block-8 report includes a `failing_tests_replay` FACT: agent has run `git checkout <failing-tests-commit-sha> -- packages/reaction-diffusion-2d/tests/`, executed pytest, captured output, computed sha256, and confirmed it matches the hash in the commit footer.

9. **Documentation** at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/{README.md, determinism.md}`.

10. **Spec sheet § 13 (Productization status)** populated per the v0.9 sim-spec template:
    ```yaml
    productization:
      web: true
      binary: false   # Stack B sim; no C++ binary
      pypi: false     # Stack B sim; no PyPI package
      render: true    # offline render of pattern formation
      preprint: true  # documents the testkit demonstration sim
    ```

11. **Backward-compatibility regression corpus seed** (per spec § 2.7 + § 2.12). The RD-2D canonical capture is the first entry in `tests/fixtures/legacy-captures/`. Block 8 copies the capture to that fixture directory (under a stable name `phase-0-rd-2d-ref.h5` + `.json`); subsequent phases that bump `schema_version` MUST round-trip this capture through the post-bump reader. Block 9 activates the corpus-replay test.

**Discipline:** Convention-8 (every API surface grep-verified — view the live module), Convention-M (re-anchor before each edit), Convention-A (failing-tests commit before implementation commit, with output-hash footer).

**Hard Rule 2:** If at any point this plan disagrees with the synced state of `common-ts` or any other earlier block's output, *stop and surface*. Do not silently adapt.

**Self-verification:**
- `python -m integrity --all` clean.
- Determinism harness passes.
- Tier 1 + Tier 2 scalar-field diagnostics pass.
- Code-verification test (WebGPU vs NumPy reference) passes within tolerance.
- Property-based tests pass for all three declared invariants.
- Capture file round-trips through Python reader.
- Capture file also round-trips through the `tests/fixtures/legacy-captures/` corpus path.
- Git history shows the failing-tests commit preceding the implementation commit.
- The failing-tests commit's footer contains the output-hash; the hash matches the committed evidence file's sha256.
- Replaying the failing-tests commit and re-running pytest produces output whose sha256 matches the recorded hash.
- `docs/perf-ledger.md` has the new RD-2D row.

**Report back:** `docs/_audits/phase-0/block-8-rd-2d-report.md`. Front-matter `block: 8, name: rd-2d`. Include `evidence_hashes:` map with the failing-tests-evidence file's sha256. `deferred_items` includes MMS-for-RD-2D with rationale. Body lists all thirteen gates with per-gate status.

>
> **▲▲▲ END PROMPT — Block 8: RD-2D ▲▲▲**

---

### 7.9 Block 9: LANDING

> **▼▼▼ BEGIN PROMPT — Block 9: LANDING ▼▼▼**
>
> *(Blocks 1–8 have completed. The coordinator bracket-fills `[VERDICT_*]` slots below from each block report's YAML before pasting.)*

You are the Phase 0 build agent. This is Block 9 (LANDING) — the final block. No new sim code; your job is to (a) verify everything blocks 1–8 shipped, (b) activate the CI workflows that were gated, (c) merge top-level deps, (d) construct the final commit chain (preserving the TDD git history from Block 8), and (e) write the phase-0 retro.

**Source of truth:** `gpu-sims-design-spec-v2.md` (vendored at `docs/design-spec-v2.md`).

**Also read:** All eight prior block reports at `docs/_audits/phase-0/block-{1..8}-*-report.md`. Read each report's YAML front-matter programmatically; that's how you know what to activate and merge.

**Your tasks in order (do not skip):**

1. **Parse every prior block's report front-matter.** Build an internal landing manifest: verdicts (cross-check the bracket-fills in this prompt against the file content), `evidence_paths`, `deferred_items`, `ci_activation`, `top_level_deps_to_merge`.

2. **Bracket-fill verdicts** (these are what the coordinator pasted; they should match what you see on disk):
   - Block 1 (FOUNDATION): [VERDICT_FOUNDATION]
   - Block 2 (MMS): [VERDICT_MMS]
   - Block 3 (HARNESSES): [VERDICT_HARNESSES]
   - Block 4 (VENDORING): [VERDICT_VENDORING]
   - Block 5 (INTEGRITY): [VERDICT_INTEGRITY]
   - Block 6 (DIAGNOSTICS): [VERDICT_DIAGNOSTICS]
   - Block 7 (COMMON-TS): [VERDICT_COMMON_TS]
   - Block 8 (RD-2D): [VERDICT_RD_2D]

3. **Re-anchor every prior report.** Per Convention M + spec § 7.9. View each report; verify every FACT-tagged claim resolves against the live repo. Stale anchors are defects; log and stop unless trivially resolvable.

4. **Cross-component contract spot-check.** Read `phase-0-plan.md § 3.3` (the public APIs). Verify against the live repo:
   - § 3.3.1: capture format module exists with the documented signatures; HDF5 payload layout matches.
   - § 3.3.2: `bit_physics_testkit.determinism` exports `run_twice_and_diff`.
   - § 3.3.3: `bit_physics_testkit.equivalence` exports `compare_captures`.
   - § 3.3.4: `bit_physics_testkit.golden` exports `verify_against_table` + `KernelEvaluator` Protocol + `reference_implementations.cubic_spline.evaluate`.
   - § 3.3.5: `bit_physics_integrity` CLI works; `cat3_numerical/evaluators/cubic_spline.py` imports from `bit_physics_testkit.golden.reference_implementations.cubic_spline`. **Verify exactly one Python implementation of the cubic-spline kernel exists in the repo.**
   - § 3.3.6: diagnostics tier1 + tier2 modules per spec.
   - § 3.3.7: `@bit-physics/common-ts` exports per the spec.

5. **Run the full integrity gate.** `cd tools/integrity && uv run python -m integrity --all`. Any HARD_FAIL blocks landing. SOFT_WARN findings logged in retro. Includes Cat-X tolerance-budget (vacuous on Phase 0; check passes).

6. **Run the audit-prose freshness check.** `uv run python tools/integrity/scripts/audit_prose_freshness.py`. Unresolved citations are defects.

7. **Run Cat 4 draft-time verification** on every spec/audit/retro authored this phase. Flagged assertions are defects.

8. **Run the verify_evidence script** on every block report. `for r in docs/_audits/phase-0/block-*-report*.md; do python -m integrity.scripts.verify_evidence --audit "$r" --strict; done`. Any failure means a block report cites missing or wrong-hash evidence; defect.

9. **Run the adversarial-fixture meta-test.** `pytest tools/integrity/tests/test_adversarial_coverage.py -W error`. Any miss is a defect in the integrity toolkit; do not land.

10. **Replay Block 8's failing-tests commit.** Check out `<block-8-failing-tests-commit-sha>`, run pytest on `packages/reaction-diffusion-2d/tests/`, capture output, compute sha256, compare to the hash in the commit footer. Mismatch is REFUTED.

11. **Verify schema-version backward-compat corpus.** Round-trip `tests/fixtures/legacy-captures/phase-0-rd-2d-ref.h5` through the capture reader; assert success. This is the load-bearing seed for the corpus (Phase 4 WU-A will round-trip it again post-schema-bump).

12. **Produce mutation-testing baseline.** `bash tools/testkit/mutation/run-mutation.sh --baseline`. Capture the per-target mutation scores; commit the baseline JSON at `tools/testkit/mutation/baseline-<UTC>.json`. No threshold gating in Phase 0 (baseline only); thresholds activate in Phase 1.

13. **Run the full test suite.** `pytest -W error` across the whole repo + `pnpm vitest run` + `pnpm test:cross-stack` for common-ts. This is the first end-to-end run across every block's tests together; defects in API drift surface here even if step 4 missed them.

14. **Verify Block 8's thirteen Layer 4 gates** per spec § 3.5 (cross-check against Block 8's report). Any gate that should pass but isn't is a defect.

15. **Run the determinism + equivalence + property harnesses end-to-end** against the RD-2D sim and the stub stacks. Verify green.

16. **Merge top-level dependencies.** From step 1's manifest, take the union of every block's `top_level_deps_to_merge`. Add to root `pyproject.toml` (uv workspace) and `package.json` (if any) at correct versions (use highest pinned on conflict). Include `hypothesis>=6.0` and `mutmut` from Blocks 3 and 5.

17. **Activate CI workflows.** From step 1's manifest, flip each `if: ${{ false }}` or commented-out step in `.github/workflows/` per each block's `ci_activation` instructions. Now-active workflows: `integrity.yml`, `determinism.yml`, `equivalence.yml`, `property.yml`, `audit-append-only.yml`, `tolerance-budget-check.yml`, `mutation-testing.yml`. (`audit-append-only.yml` first goes live for Phase 1's first push, since no prior phase tag exists at Phase 0 close.)

18. **Append perf-ledger entry from Block 8.** Confirm `docs/perf-ledger.md` has the RD-2D first-landing row from Block 8.

19. **Construct the commit chain** per Convention A. Aim for ≤500 lines per commit. Conventional Commits message format:
    - **Commit 1** — `feat(foundation): repo skeleton, capture format, schemas, CI scaffolds, pre-commit, perf-ledger, failing-tests-evidence, tolerance-budget, branch-protection doc`.
    - **Commit 2** — `feat(testkit/mms): heat-eq-1D MMS pipeline`.
    - **Commit 3** — `feat(testkit): determinism + equivalence + property-based-testing harnesses`.
    - **Commit 4** — `feat(references): vendor SPlisHSPlasH (sparse-checkout); cubic-spline kernel goldens with independent-reference anchors`.
    - **Commit 5** — `feat(integrity): Cat 1–5 + Cat-X toolkit + cat4 pre-commit hook + adversarial fixtures + verify_evidence + replay_prior_phase + mutation-testing config`.
    - **Commit 6** — `feat(diagnostics): Tier 1 + scalar-field Tier 2`.
    - **Commit 7** — `feat(common-ts): WebGPU module + h5wasm capture I/O + hello-physics smoke`.
    - **Commit 8** — `test(rd-2d): failing acceptance tests for Gray-Scott` (preserve from Block 8, with output-hash footer intact).
    - **Commit 9** — `feat(rd-2d): WebGPU Gray-Scott implementation` (preserve from Block 8, with witness-hash footer intact).
    - **Commit 10** — `chore(phase-0): landing ledger, retro, CI activation, dep merge, mutation baseline, schema-corpus seed`.

20. **SHA back-fill** per Convention #12. If the retro/ledger references commit SHAs, those references back-fill as a separate follow-up commit. Commit 11: `chore(phase-0): backfill SHA references in retro`.

21. **Prepare tag — DO NOT push.** Per spec § 7.12 (operator-only phase-tag pushing): the agent does NOT run `git tag` or `git push origin <tag>`. The agent's closing report includes the proposed tag name (`v0.0.0-phase-0`), the commit SHA to be tagged (commit 11's SHA, or commit 10's if no back-fill was needed), and the explicit line `Tag pushed: NO (operator action required)`. The operator runs `git tag -s v0.0.0-phase-0 <sha> && git push origin v0.0.0-phase-0` after reading and approving the landing audit.

22. **Write the retro** at `docs/_audits/phase-0/landing-<UTC>.md`:
    - YAML front-matter: `block: 9, name: landing, verdict`, including `evidence_paths` with sha256 hashes for the failing-tests-evidence file from Block 8.
    - **Verdict:** CONFIRMED if every § 8 acceptance criterion is met and all thirteen Layer 4 gates on RD-2D are hit. SHIFTED if landed with documented deferrals (list each, cite the block report that surfaced it). REFUTED if structural defect prevents landing — in which case the agent surfaces to operator (no tag push regardless).
    - **Banked patterns** — anything emerged this phase worth promoting to spec Appendix G? Note rule-of-three status.
    - **Defects found at landing** — anything caught in steps 1–15 that wasn't in prior block reports.
    - **Items deferred to Phase 1** — extracted from each block's `deferred_items` plus your own findings. Include: schema-version backward-compat corpus consumers; mutation-testing threshold activation; first cross-phase audit replay (Phase 1 first stage).
    - **Final summary line:** `Proposed tag: v0.0.0-phase-0` / `Tag commit SHA: <sha>` / `Tag pushed: NO (operator action required)`.
    - **FACT / INFERENCE tagging.**

>
> **▲▲▲ END PROMPT — Block 9: LANDING ▲▲▲**

---

## 8. Acceptance gate for Phase 0

Phase 0 is complete when:

1. All thirteen spec § 11.1 deliverables (0.1–0.13) are landed.
2. The RD-2D sim hits all thirteen Layer 4 gates from spec § 3.5 (the v2.4 expanded set; gates 11–13 are PBT, perf-ledger, and failing-tests-replay).
3. `python -m integrity --all` is clean (no HARD_FAIL), including Cat-X tolerance-budget.
4. `pytest -W error` is green across `tools/testkit/`, `tools/integrity/`, `tools/diagnostics/`.
5. `pnpm vitest run` is green for `common/common-ts/`.
6. `pnpm test:cross-stack` passes (HDF5 round-trips between TS and Python).
7. All CI workflows are active and green on the final tip commit (`integrity.yml`, `determinism.yml`, `equivalence.yml`, `property.yml`, `audit-append-only.yml`, `tolerance-budget-check.yml`, `mutation-testing.yml`).
8. Convention A is visible in git history (RD-2D's failing-tests commit precedes the implementation commit, AND the failing-tests commit's footer contains the output-hash, AND the witness-hash in the implementation commit footer matches).
9. The adversarial-fixture meta-test passes (every adversarial fixture is detected; no false-positives on good fixtures).
10. The mutation-testing baseline JSON is committed at `tools/testkit/mutation/baseline-<UTC>.json`.
11. The schema-version backward-compat corpus seed (`tests/fixtures/legacy-captures/phase-0-rd-2d-ref.h5`) is committed and round-trips through the reader.
12. The performance regression ledger has the first RD-2D row.
13. The branch-protection documentation is committed at `docs/ops/branch-protection.md` AND the operator has confirmed in the landing-audit thread that the rules have been applied to the GitHub repo.
14. The `v0.0.0-phase-0` tag exists on `main` — pushed by the operator after landing-audit review (NOT by the agent). The tag is GPG-signed by the operator.
15. `docs/_audits/phase-0/landing-<UTC>.md` is committed with CONFIRMED or acceptably-SHIFTED verdict; the closing report's final line confirms `Tag pushed: NO (operator action required)` (the agent's part) and the operator's tag push closes the loop.

---

## 9. Locked-in decisions

Every decidable Phase 0 choice is locked here. If something needs to change, change it here before Block 1 dispatches; after dispatch, changes are expensive.

### From user

| # | Decision | Choice |
|---|---|---|
| 1 | Repo URL | `git@github.com:StevenFAU/Bit-Physics.git` |
| 2 | Owner name (CITATION.cff) | Steven Cohen |
| 3 | Design spec in-repo location | `docs/design-spec-v2.md` |
| 4 | Execution model | **Sequential, one build-agent role, one coordinator chat** |

### From spec / established context

| # | Decision | Choice |
|---|---|---|
| 5 | License | MIT (spec § 12.7) |
| 6 | Python minimum | 3.12 (spec § 4.4 says 3.11+; pick the safer floor) |
| 7 | Python deps manager | `uv` (spec § 4.4 / § 9.1) |
| 8 | Linter / type checker | `ruff` strict + `mypy --strict` + `pytest -W error` (spec § 7.7) |
| 9 | HDF5 Python binding | `h5py` |
| 10 | JSON Schema | `jsonschema` library, Draft 2020-12 |
| 11 | TOML → schema validation | `tomllib.loads(text)` → `jsonschema.validate(dict, schema)` |
| 12 | Verdict vocabulary | CONFIRMED / SHIFTED / REFUTED / DEFERRED (compounds: DISCONFIRMED-AT-HEAD, REFRAMED — spec § 7.5) |
| 13 | Report storage | `docs/_audits/phase-0/block-<n>-<name>-<UTC>.md`; landing report at `docs/_audits/phase-0/landing-<UTC>.md` (per spec § 8.1) |
| 14 | First manufactured solution | Heat equation 1D, FTCS, periodic BCs, formal order 2 in space + 1 in time (with CFL `c<0.5` so spatial truncation dominates) |
| 15 | First golden table | Cubic-spline SPH kernel, 3D normalization, derived from math (not from upstream source) |
| 16 | First vendored upstream | SPlisHSPlasH at current release SHA (looked up at Block 4 execution) |
| 17 | Vendoring mechanism | **Sparse-checkout** for SPlisHSPlasH (avoids hundreds-of-MB bloat) |
| 18 | First common module | `common-ts` (Stack B; spec § 11.1 item 0.12) |
| 19 | First Tier 2 substack | scalar-field (matches RD's category) |
| 20 | Integration sim | reaction-diffusion-2d on Stack B (WebGPU compute) — complete Layer 4 reference, not a stub (per spec § 11.1 amendment) |
| 21 | RD-2D code verification | Python NumPy reference as ground truth; MMS for Gray-Scott DEFERRED to Phase 1 Stage 2 (co-bundled with RD-3D MMS work; owner phase per spec § 11.7) |
| 22 | Cat 4 grammar scope (Phase 0) | `path:line[-range]` form only; harder grammars (`<phrase X in Y>`, `<API X has shape Y>`) DEFERRED to Phase 1 Stage 1 (owner phase per spec § 11.7) |
| 23 | Cat 4 verifier code location | `tools/integrity/integrity/cat4_draft_time/` (resolves spec § 3.1 vs § 3.2 ambiguity) |

### Derived defaults (verified at plan time; agent re-verifies at execution time)

| # | Decision | Choice |
|---|---|---|
| 24 | Python package names | `bit_physics_testkit`, `bit_physics_integrity` (per spec § 7.11 naming convention: PyPI dist `bit-physics-testkit`, import `bit_physics_testkit`, mirrors repo `Bit-Physics`) |
| 25 | Node version | 22 LTS or later (Block 7 pins) |
| 26 | pnpm version | 10.x or later (Block 7 pins) |
| 27 | TypeScript config | strict: true, noImplicitAny: true, noUncheckedIndexedAccess: true |
| 28 | WebGPU browser target | Chrome/Edge 113+, Firefox 141+ Win / 145+ macOS, Safari 26+ |
| 29 | HDF5 in browser | **h5wasm** (NIST-maintained; verified May 2026) |
| 30 | Pre-commit framework | `pre-commit` Python tool + `.pre-commit-config.yaml`; Conventional Commits enforced via `compilerla/conventional-pre-commit` |
| 31 | Branch / tag | Single `main` branch; phase tag `v0.0.0-phase-0`; trunk-based development per spec § 7.12 (no protected branches, no long-lived feature branches) |
| 32 | Commit format | **Conventional Commits** `type(scope): subject` |
| 33 | Cross-platform | Linux primary; macOS expected to work; Windows untested in Phase 0 |
| 34 | CI advisory coverage | `pytest --cov` collects to XML; no coverage threshold enforced |
| 35 | Capture output convention | `captures/<sim>-<variant-or-ref>/<descriptor>.h5` + `<descriptor>.json` at repo root (per spec § 2.7); descriptor format `<test-name>-<config>-seed<N>-step<N>` |
| 36 | npm package scope | `@bit-physics/common-ts` (kebab-case, mirrors PyPI convention per spec § 7.11) |

If anything in this table needs to change, change it here before dispatching Block 1.

---

## 10. Failure modes to watch (build-agent + LANDING reference)

From spec § 9.4 categories, distilled for sequential execution:

- **Convention #8 fabrication** (Cat 5). Most likely surface: tool versions, SHA values, function signatures. Mitigation: every block verifies at execution time; LANDING's re-anchor (step 3) catches anything that drifted.
- **Schema drift** (Cat 3). Most likely surface: capture-format fields if Block 1 misreads spec § 2.7. Mitigation: Block 1 commits the schema; Blocks 3, 6, 7, 8 validate against it.
- **Test-design fabrication** (Cat 6). Most likely surface: negative tests that don't actually fail for the asserted reason. Mitigation: each block's prompt specifies the negative case concretely.
- **Spec self-consistency drift** (Cat 7). Most likely surface: per-cat docs in INTEGRITY drift from check behavior. Mitigation: docs are written from the actual check code.
- **Numerical correctness drift** (Cat 4). Most likely surface: FTCS observed order != 2; Gray-Scott regime not in the expected (F, k) basin. Mitigation: Block 2's sanity check (eigenfunction decay); Block 8's NumPy reference as ground truth.
- **Anchor drift** (Cat 1). Most likely surface: `path:line` citations in INTEGRITY's docs that don't resolve. Mitigation: Cat 1 itself runs against the docs at landing.

---

## 11. Phase 0 → Phase 1 inheritance and forward-compatibility

### 11.1 What Phase 1 will do

Per spec § 11.2: Phase 1 ships Layer 4 reference sims in parallel across categories — strange-attractors, mandelbulb-explorer, RD-3D (Phase 0 ships -2d), boids-3d, physarum, sph-water (Stack C using vendored SPlisHSPlasH), mpm-multimaterial (Stack D Taichi), eulerian-smoke (Stack C), lattice-boltzmann-d3q19 (Stack C). common-cpp and common-py mature alongside.

### 11.2 What Phase 0 ships that Phase 1 directly reuses

| Phase 0 component | Phase 1 consumer | Forward-compat requirement |
|---|---|---|
| Capture format schemas + Python module | Every Phase 1 sim writes captures | Schemas are extensible (additive bumps minor; breaking bumps major). |
| MMS pipeline | Every Phase 1 PDE-based sim adds a manufactured solution | Solutions library is a plugin point. |
| Determinism harness | Every Phase 1 sim's determinism gate | Harness is sim-agnostic. |
| Equivalence harness | Phase 2's cross-stack replication | Phase 0 ships pairwise; Phase 2 may need N-way wrapping. |
| Reference vendoring discipline + sparse-checkout | Every Phase 1 vendored upstream (NanoVDB, OpenVDB, Taichi packages) | Schema + helper stay stable. |
| Golden verifier | Phase 1 SPH sim uses cubic-spline table; new sims add new tables | Verifier API stays stable; new tables register evaluators. |
| Integrity Cat 1–5 | Every Phase 1 commit goes through the gate | Each Cat is extensible (new checks register). Phase 1 may activate harder Cat 4 grammars. |
| Diagnostics Tier 1 + scalar-field | Every Phase 1 sim uses Tier 1; category-matched Tier 2 | Particle/vector-field/closed-form stubs fill in. |
| common-ts | Phase 1 Stack B sims | API stable; additions OK. h5wasm dependency is the precedent for common-cpp (HighFive) and common-py (h5py). |
| RD-2D | Phase 2 replicates to Stack C, Stack D | The Phase 0 RD-2D spec + NumPy reference + capture are the equivalence baselines. |

### 11.3 Deliberate Phase 0 deferrals

- Solution verification (GCI / Richardson) — Phase 1 ships when a sim claims solution-verified status.
- MMS for non-heat-eq PDEs — Phase 1 adds Poisson, advection-diffusion, Navier-Stokes incompressible, Euler, Gray-Scott (retro-fits to RD-2D).
- Cat 4 harder grammars — Phase 1+.
- common-cpp, common-py — Phase 1.
- Other Tier 2 substacks — Phase 1.
- PyPI publishing + `gpu-sims-*` naming resolution — Phase 1.
- Stack C, Stack D, Stack E — Phase 1+.
- Cross-platform Windows — Phase 1+.
- Dependabot, Renovate, semantic-release, Sphinx/TypeDoc, Codecov threshold — Phase 1+ as needed.

### 11.4 Phase boundary tests (LANDING applies mentally)

- A Phase-1-style sim could be added without modifying any Phase 0 file.
- A new manufactured solution could be added as a single file to `tools/testkit/code_verification/mms/solutions/` without modifying runner/analyzer.
- A new golden-value table could be added as one JSON + one evaluator without modifying other Phase 0 code.
- A new integrity check could be added under any `cat{N}_*/` without modifying the runner.

If any test fails, LANDING surfaces it as a SHIFTED verdict on Phase 0.

---

## 12. Recovery paths

When a block reports a non-CONFIRMED verdict, the coordinator surfaces to the user. Here are the known-failure-mode recoveries.

### 12.1 Block 1 (FOUNDATION) — most common failure: tool version drift

**Symptom:** Block 1 reports SHIFTED because a tool's pinned version isn't current (e.g., `pre-commit-hooks` tag moved, `ruff-pre-commit` tag moved, `conventional-pre-commit` tag moved).
**Recovery:** Accept the SHIFTED if the version changes are forward-compatible. Block 1 reports the new versions; they propagate to later blocks via the report's `top_level_deps_to_merge` field.

**Symptom:** Block 1 reports REFUTED because the repo has unexpected committed state.
**Recovery:** Steven decides: (a) wipe and restart fresh, (b) merge the existing state with Block 1's output. Either is a coordinator decision, not the agent's.

### 12.2 Block 4 (VENDORING) — most common failure: upstream license/availability change

**Symptom:** SPlisHSPlasH at the current SHA has changed license, or the upstream repo has moved, or the kernel implementation file structure has changed.
**Recovery:** Block 4 reports SHIFTED with the new SHA / new path / new license. If license is still MIT or BSD: continue. If license changed to something incompatible: stop Phase 0; the user picks a different upstream or accepts the new license.

**Symptom:** Sparse-checkout impractical (the kernel sources are entangled with too many other files).
**Recovery:** Block 4 falls back to full-repo vendoring + documents the rationale. Phase 0 continues; the repo is larger than ideal.

### 12.3 Block 7 (COMMON-TS) — most consequential failure: h5wasm doesn't work

**Symptom:** Block 7's deliverable-0 preflight fails (h5wasm doesn't install, or doesn't round-trip with h5py).
**Recovery — choose one:**
- **(a) Different JS HDF5 library.** `jsfive` (read-only — would require Python to be the canonical writer; doesn't work for cross-stack tests where TS writes).
- **(b) Different intermediate format.** Stack B writes JSON+binary; a Python converter normalizes to HDF5. Adds a non-canonical format + a converter step. Acceptable but more code.
- **(c) Defer HDF5-in-browser to Phase 1.** Block 7's smoke sim writes JSON-only captures; Block 9's cross-stack invariance gate doesn't fire for Phase 0. The cross-stack story holds when common-cpp / common-py land in Phase 1 (both have native HDF5 bindings).
- **(d) Stop Phase 0.** Reconsider the cross-stack story entirely.

The coordinator surfaces to the user; the user picks. This decision is **not** Block 7's to make unilaterally.

### 12.4 Block 8 (RD-2D) — most common failure: WebGPU output doesn't match NumPy reference

**Symptom:** Code-verification test fails — WebGPU sim's output diverges from NumPy reference by more than the rtol/atol tolerance.
**Recovery:** Block 8 investigates. Likely causes (in order): WGSL shader has a sign / orientation / off-by-one bug; floating-point order-of-operations differs between WebGPU and NumPy (this is expected at tight tolerances — relax tolerance to `rtol=1e-3` if the deviation is consistent across runs and concentrated at high-gradient regions); the NumPy reference itself has a bug. Block 8 reports SHIFTED with the diagnosis and the resolved tolerance.

**Symptom:** Determinism harness fails — two runs of the WebGPU sim with the same seed produce different captures.
**Recovery:** Block 8 reports REFUTED. Likely cause: atomic ops or subgroup ops in the WGSL shader, or unseeded driver-level reorderings. The fix may require restructuring the shader. The user decides whether to fix in Phase 0 or declare RD-2D as `epsilon` rather than `bit-exact-same-hw` and accept that.

### 12.5 Block 9 (LANDING) — defects caught at the gate

**Symptom:** LANDING's full-suite `pytest -W error` finds a defect that no individual block surfaced.
**Recovery:** LANDING reports the defect with the surfacing test. The user decides: (a) fix-in-LANDING (small defect — LANDING patches and re-runs), (b) re-dispatch the responsible block.

**Symptom:** LANDING's Cat 4 finds a stale assertion in a block's report.
**Recovery:** LANDING fixes the assertion in-place. Per § 7.5 spec (append-only), the correction is a new addendum, not an edit. LANDING adds the addendum.

**Symptom:** LANDING's `verify_evidence.py` finds that a block report cites a missing or wrong-hash evidence file.
**Recovery:** REFUTED. The block's claim is unsupported by the evidence path it cited. LANDING surfaces immediately; operator decides whether to re-dispatch the block or accept a SHIFTED close with the gap documented. Do not push the tag.

**Symptom:** LANDING's adversarial-fixture meta-test fails — at least one adversarial fixture is not detected by the corresponding Cat check.
**Recovery:** REFUTED. The integrity toolkit has a real bug: it would let a similar fabrication ship in a future phase. LANDING surfaces; operator may direct a Block 5 re-dispatch to fix the check, or accept the gap as a known limitation logged as a Phase 1 priority item (NOT silently tolerated).

**Symptom:** LANDING's failing-tests replay (step 10) finds that the recorded output hash does NOT match the replay output.
**Recovery:** REFUTED — Block 8's TDD claim is unsubstantiated. Either the failing-tests commit was fabricated, or test infrastructure has drifted since commit. Operator investigates; do not push the tag.

**Symptom:** LANDING's schema-corpus seed (step 11) fails to round-trip.
**Recovery:** REFUTED. The capture format itself is broken. Block 1 / Block 7 / Block 8 share responsibility. Surface; do not push the tag.

### 12.6 General recovery: when in doubt, stop and surface

The coordinator's default action on any non-CONFIRMED verdict is to surface to the user. The user decides whether to continue, re-dispatch, or revise the plan. This is intentional — Steven is solo on this project; surfacing-by-default is the right discipline for a one-person team.

**The tag push is always the operator's act.** Even on CONFIRMED, the agent never pushes the phase tag. The operator reads the landing audit, runs `verify_evidence.py` independently, optionally runs `replay_prior_phase.py` from a Phase 1 perspective, and then signs and pushes. If the operator finds anything questionable during their review, the tag is deferred until resolved.

---

## 13. Final note on plan posture

This plan is anchor-sketch grade (Convention K). I drafted it from the design spec plus reasoning, plus a small number of verified-at-plan-time external dependency checks (§ 4). Nothing in this plan has been grep-verified against a real repo because the repo does not yet exist — that is the work Phase 0 produces.

Three architectural commitments are load-bearing:

1. **Sequential execution.** One build-agent role, one coordinator chat, nine ordered blocks. No parallel work. Block N sees blocks 1..N–1 as live, committed code.
2. **Each block produces one commit (except RD-2D, which produces two for TDD discipline).** Conventional Commits format. The git history is the audit trail.
3. **The architecture in § 3 is the contract.** Public APIs are pinned; deviations require Hard Rule 2 surfacing, not silent adaptation.

The single biggest risk in Phase 0 is **Block 7's h5wasm strategy** (the only verified-but-not-personally-tested external dependency). Mitigation: Block 7's preflight check fails fast if h5wasm doesn't work; recovery paths are documented (§ 12.3).

The single biggest invariant in Phase 0 is **tests come first**. Block 8's TDD cycle is the proof that the foundation works; if the test suite cannot be authored before the implementation, the foundation is incomplete.

The coordinator is a sequencing conduit, not a decision-maker. Every choice that could be made here has been made (§ 9). The coordinator dispatches, ledgers, and surfaces. If the coordinator finds themselves making judgments, that is a signal that something has shifted relative to this plan; the right action is to surface to Steven, not improvise.

*End of plan.*
