---
date: 2026-05-23T17-33-13Z
author: reaction-diffusion-2d-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: reaction-diffusion-2d-stack-d-plan-drafting-probe
subject: "FIRST cross-stack port sub-phase plan-drafting probe — RD-2D Stack-B → Stack-D. Conventions doc sha256 167fe349…f2c58c2e verified at HEAD. Exhaustive Phase-0 Stack-B inventory + Taichi-integration infrastructure inventory + IC-13/14 surface inventory + MMS pipeline state + cross-stack equivalence harness state. Three load-bearing drifts surfaced vs phase-2-plan § 2.5 anchor sketches (canonical descriptor 128sq-step2000 not 512sq-step1000; cross-stack tolerance 1e-4 not 1e-5; portfolio directory shape post-Phase-1 places sim packages under packages/ not continuous-ca/<sim>/). D1-D6 surface preview."
verdict-state: CONFIRMED
head_sha: d72b80b47cfd4ddce8ef19883d6cbb0ba0dc0ebe
head_sha_at_checkpoint: d72b80b47cfd4ddce8ef19883d6cbb0ba0dc0ebe
parent_audits:
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
  - docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - docs/phases/phase-2-cross-stack-replication.md
  - docs/phases/sub-phase-agent-based.md
  - docs/phases/sub-phase-capture-determinism-contract.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/determinism.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/README.md
  - packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py
  - packages/reaction-diffusion-2d/reaction_diffusion_2d/sim.py
  - packages/reaction-diffusion-2d/src/gray_scott.wgsl
  - captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5
  - captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json
  - common/common-py/src/common_py/determinism.py
  - common/common-py/src/common_py/capture.py
  - common/common-py/smoke/hello_taichi.py
  - docs/common/taichi.md
  - tools/testkit/determinism/harness.py
  - common/common-ts/src/determinism/runTwiceAndDiff.ts
  - common/common-ts/src/determinism/diffCaptures.ts
  - common/common-ts/src/determinism/captureReader.ts
  - tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py
  - tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/derivation.md
  - tools/testkit/equivalence/harness.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-budget.toml
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5: sha256:bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json: sha256:585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc
---

# Plan-Drafting Probe — Sub-Phase RD-2D → Stack-D

## 1. Conventions doc sha256 verification

(FACT — `sha256sum docs/conventions/sub-phase-conventions.md` at HEAD = `c4be56b`.)

```
167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e  docs/conventions/sub-phase-conventions.md
```

**Matches the post-amendment canonical sha256 prescribed by the dispatch contract.** This is the FIRST sub-phase to dispatch against the post-amendment conventions doc (capture-determinism-contract landed the amendments at Stage 1 commit `26e1343` and locked the new baseline at Stage 2 close `9bf5b68`).

Line count: 854 lines (verified). § A.2 + § F.3 + § B.7 amendments load-bearing for THIS sub-phase per the new dual-language sweep template (§ B.7) and the new content-equivalent contract framing (§ F.3).

**No naming convention prescribed in § C (commit-message convention) for cross-stack port sub-phases.** Searched the whole doc for `stack-d` / `stack-c` / `stack-e` / `ref-stack` patterns — § P.2 mentions Stack-C / Stack-D Phase-2+ regeneration as a forward-looking concept, but no per-sim-cross-stack-port slug pattern is prescribed. D1 (sub-phase naming) is therefore a genuinely open question for THIS sub-phase to establish precedent.

## 2. Phase-0 Stack-B RD-2D baseline inventory

### 2.1 Directory tree at `packages/reaction-diffusion-2d/`

```
packages/reaction-diffusion-2d/
├── pyproject.toml
├── README.md
├── reaction_diffusion_2d/
│   ├── __init__.py
│   ├── sim.py                                  (sim_runner_seeded + sim_runner_pbt)
│   └── reference/
│       ├── __init__.py
│       └── gray_scott_numpy.py                 (NumPy reference + canonical_params)
├── src/
│   ├── README.md
│   ├── gray_scott.wgsl                         (WGSL compute shader)
│   └── index.ts                                (TS driver via @bit-physics/common-ts)
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_code_verification.py               (canonical-vs-fresh-NumPy diff at rtol 1e-4)
    ├── test_determinism.py                     (run_twice_and_diff)
    ├── test_diagnostics.py                     (Tier 1 + Tier 2 scalar_field)
    ├── test_pbt_invariants.py                  (3 Hypothesis invariants, n_examples=20)
    └── test_reference_sanity.py
```

(FACT — `ls -R packages/reaction-diffusion-2d/`.)

### 2.2 Algorithm + canonical parameters

(FACT — `packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py` + algebraic.md.)

Gray-Scott two-species reaction-diffusion on periodic 2D grid. Forward Euler in time + 5-point Laplacian in space.

| Parameter | Value | Source |
|---|---|---|
| `F` (feed) | 0.0367 | Pearson 1993 λ-region (algebraic.md § 2; spec-ref.md § 3) |
| `k` (kill) | 0.0649 | Pearson 1993 λ-region |
| `D_u` | 0.16 | Pearson 1993 |
| `D_v` | 0.08 | Pearson 1993 |
| `dx` | 1.0 | (algebraic.md § 4) |
| `dt` | 1.0 | within CFL bound 1.5625 (algebraic.md § 5) |
| Grid `n` | 128 | canonical capture descriptor |
| `step_count` | 2000 | canonical capture descriptor |
| `seed` | 42 | canonical capture descriptor |
| `capture_interval` | 200 | sim.py line 37; produces 11 frames at steps [0,200,…,2000] |

### 2.3 Canonical capture (frozen at Phase 0 Block 8; head_sha `aa76defc`)

(FACT — `block-8-rd-2d-2026-05-19T16-00-36Z.md` evidence_hashes.)

| Artifact | sha256 |
|---|---|
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5` | `bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0` |
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json` | `585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc` |
| Legacy-captures fixture `tests/fixtures/legacy-captures/phase-0-rd-2d-ref.h5` | `bcae544a…f92148f0` (same payload) |
| Failing-tests evidence `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-ref-2026-05-19T15-43-23Z.txt` | `ee9f2d3de9bc1ddf1a0826d672c6d6994abc270b9bc515db6ff32096b27b2988` (Stack-B; NOT consumed by Stack-D port — Stack-D ships its own failing-tests evidence) |

**Canonical descriptor at HEAD: `gray-scott-lambda-128sq-seed42-step2000`** (128² grid, 2000 steps).

### 2.4 Determinism declaration (Stack-B)

(FACT — `docs/sim-specs/continuous-ca/reaction-diffusion-2d/determinism.md`.)

- Posture: `bit-exact-same-hw` for same seed on same hardware.
- IC: `numpy.random.default_rng(seed)` reseeded every call; explicit seed plumbing.
- Reduction order: elementwise NumPy ops only; no in-loop reductions.
- Manifest declares `atomic_ops: false`, `subgroup_ops: false`.
- Mechanism on Stack-B: WebGPU double-buffered read/write pattern; deferred from CI per spec § 7.8 (local-only verification at Phase 0).

### 2.5 Test surface (14 tests at HEAD)

(FACT — `packages/reaction-diffusion-2d/tests/`; capture-determinism-contract landing § 5.1 confirms 14 tests GREEN.)

| File | Tests | Gate(s) it exercises |
|---|---:|---|
| `test_code_verification.py` | 1 | Gate 4 — `test_canonical_capture_matches_numpy_reference` (canonical-vs-fresh diff at rtol 1e-4) |
| `test_determinism.py` | 1 | Gate 10 — invokes `run_twice_and_diff` via IC-14 |
| `test_diagnostics.py` | 3 | Gates 5/6 — Tier 1 health + Tier 2 scalar_field bounds (U/V ∈ [0,1]) |
| `test_pbt_invariants.py` | 3 | Gate 11 — `monotone_bounds`, `mass_approximately_conserved`, `periodic_bc_satisfied` |
| `test_reference_sanity.py` | 6 | Reference-implementation unit sanity |

### 2.6 MMS pipeline state (verified Stack-D-callable)

(FACT — `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` + `derivation.md`.)

- Co-bundled with the 3D Gray-Scott MMS at RD-3D Stage 2 per Phase-1-charter R8 amendment.
- `GrayScott2DSolution` dataclass: `D_u=0.16, D_v=0.08, F=0.0367, k=0.0649, L=1.0`.
- Manufactured solution: `u(x,y,t) = (sin(πx/L) cos(πy/L) cos(t) + 2)/4`, `v(x,y,t) = (cos(πx/L) sin(πy/L) sin(t) + 2)/4`. Bounded in [0.25, 0.75]; smooth; periodic.
- `evaluate(x, y, t) -> (u, v)` + `source_term(x, y, t) -> (S_u, S_v)` + `boundary_conditions()` exposed.
- `formal_spatial_order = 2` (matches 5-point Laplacian's expected order of accuracy).
- **Pure NumPy + numpy.typing — Stack-D-callable from any Python-side harness; no WGSL coupling.** Phase 2 Stack-D port's gate-4 (code verification) consumes this MMS solution against the new Taichi-DSL implementation; expected order-of-accuracy within ±0.5 per phase-2-plan § 1.5.1 Gate 4.

## 3. Taichi-integration infrastructure inventory

(FACT — `sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md` § 2 + on-disk inspection.)

### 3.1 `common/common-py/src/common_py/determinism.py::set_taichi_deterministic`

```python
def set_taichi_deterministic(config: Config, *, arch: str = "cpu") -> None:
    """Initialize Taichi with the project's determinism contract.

    Equivalent to (when config.deterministic):
        ti.init(
            arch=<resolved>,
            random_seed=<seed>,
            cpu_max_num_threads=1,
            offline_cache=True,
        )

    Default arch="cpu" is the only backend with bit-determinism guarantees
    on Taichi 1.7.4 + Python 3.12 (per docs/common/taichi.md § 2.1).
    """
```

Supported archs (per `SUPPORTED_TAICHI_ARCHS`): `("cpu", "cuda", "vulkan", "metal")`. **For this sub-phase: arch="cpu" mandatory** to honour the inherited `bit-exact-same-hw` declaration. Other archs at Phase 4+ when GPU determinism is in scope.

### 3.2 `common/common-py/src/common_py/capture.py::Writer`

(FACT — Stack-D port consumes IC-2 wrapper for the canonical capture write.)

```python
class Writer:
    def __init__(self, manifest_path: Path, manifest: Manifest) -> None: ...
    def write_step(self, idx: int, data: StepData) -> None: ...
    def finalize(self) -> None: ...
```

Post-capture-determinism-contract: writer uses `track_times=False` + `libver="earliest"` at the h5py.File level (defense-in-depth; contract lives at the harness).

### 3.3 `common/common-py/smoke/hello_taichi.py` — structural exemplar

(FACT — `hello_taichi.py` 1D explicit-diffusion sim.)

- Module-scoped Taichi fields (`u_curr`, `u_next` ti.field allocation at runtime, AFTER `ti.init`).
- Kernels `@ti.kernel initial_condition()` + `@ti.kernel step_diffuse()` — both WITHOUT `-> None` return annotations (Taichi 1.7.4 AST-transformer limitation per Taichi-integration § 8.2 N3, docs/common/taichi.md § 4.6).
- Capture I/O: `Writer(manifest_path, manifest)` + `writer.write_step(step, StepData(fields={"u": ...}))` per IC-2.
- Determinism: `set_taichi_deterministic(Config(seed=42, deterministic=True), arch="cpu")` invoked BEFORE any `@ti.kernel` decoration (R-P3 enforcement).

**Structural pattern RD-2D Stack-D port follows:** 2D Taichi fields (`u_field`, `v_field`, `u_next`, `v_next` shape (128, 128)) + 2D explicit-diffusion kernel + 2D reaction kernel + capture write at every 200th step.

### 3.4 `docs/common/taichi.md` (IC-12)

Key rules consumed:
- § 2: required `ti.init` kwargs verbatim.
- § 2.1: arch=cpu mandatory for bit-determinism.
- § 4.5: filterwarnings against Python-3.12-locale-deprecation noise.
- § 4.6: NO `-> None` kernel annotations.

### 3.5 `tools/testkit/taichi_harness/` regression-test surface

(FACT — Taichi-integration Stage 1 STEP 6.)

```
tools/testkit/taichi_harness/
├── __init__.py
└── tests/
    ├── __init__.py
    └── test_taichi_determinism.py             (5 tests; all GREEN at Taichi-integration close)
```

Cold-vs-warm cache identity + run-to-run determinism + FP-equivalence baseline — every Stack-D port inherits this contract.

## 4. IC-13 + IC-14 surface inventory (capture-determinism-contract deliverables)

(FACT — `sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md` § 11 outputs.)

### 4.1 `tools/testkit/determinism/harness.py::run_twice_and_diff` (Python; IC-14)

```python
class SimRunner(Protocol):
    def __call__(self, seed: int, out_dir: Path) -> Path: ...

@dataclass
class DeterminismVerdict:
    content_equivalent: bool
    detail: str

def run_twice_and_diff(
    runner: SimRunner,
    seed: int = 42,
    tmp_dir: Path | None = None,
) -> DeterminismVerdict: ...
```

**Renamed from `bit_exact` → `content_equivalent`** at capture-determinism-contract Stage 1. Backward-compat shim retains `bit_exact` for one minor version with `DeprecationWarning`. Stack-D port's gate-10 (`test_determinism.py`) calls this surface with the Stack-D `sim_runner_seeded`.

### 4.2 `common/common-ts/src/determinism/runTwiceAndDiff.ts` (TypeScript; IC-14)

```typescript
export type SimRunner = (args: { seed: number; outDir: string }) => Promise<string>;

export interface DeterminismVerdict {
  contentEquivalent: boolean;
  detail: string;
}

export async function runTwiceAndDiff(
  runner: SimRunner,
  options: RunTwiceOptions = {},
): Promise<DeterminismVerdict>
```

**Not consumed by this sub-phase** — Stack-D is Python-only; TS-side IC-14 is not exercised here. But the dual-language contract is documented (consumed by future cross-stack sub-phases that touch Stack-B).

### 4.3 IC-13 (content-equivalence contract semantics)

(FACT — `docs/architecture.md` § 2.5 operator-routed wording per capture-determinism-contract D2-c.)

The canonical statement of "two captures are determinism-equivalent" expressed over the Capture data model. Same-stack bit-exact is the zero-tolerance special case of cross-stack content-equivalent posture per spec § 2.6. **This sub-phase is the FIRST per-sim sub-phase to ship under IC-13** (capture-determinism-contract landing § 10).

## 5. Cross-stack equivalence harness posture

### 5.1 `tools/testkit/equivalence/harness.py::compare_captures`

```python
def compare_captures(
    left: Path,
    right: Path,
    tolerance_table_path: Path | None = None,
) -> EquivalenceVerdict: ...

@dataclass
class EquivalenceVerdict:
    within_tolerance: bool
    per_field_diff: dict[str, dict[str, float]]
    tolerance_table_used: dict[str, Any]
```

(FACT — Taichi-integration Stage 2 Step 2.9 invoked this harness end-to-end against hello-taichi vs advection_1d — different-sim case; emitted `within_tolerance=False` as expected. RD-2D Stack-D port is the FIRST TRUE matching-sim cross-stack invocation in the portfolio.)

### 5.2 `tools/testkit/equivalence/tolerance.toml` — RD category state at HEAD

```toml
[defaults.reaction-diffusion]
relative = 1e-4
absolute = 0.0
```

**No per-sim override for `reaction-diffusion-2d` exists at HEAD.** Category default applies.

### 5.3 `tools/testkit/equivalence/tolerance-budget.toml` — current phase + RD budget

```toml
[phase]
phase = "sub-phase-capture-determinism-contract"
opened_at = "2026-05-23T16:04:12Z"

[budgets.reaction-diffusion.cross_stack]
relative = 1e-4
absolute = 0.0
```

**Cap matches the category default.** No per-sim override needed if the sub-phase commits to `relative = 1e-4`. If a per-sim override is needed (e.g., the Gray-Scott chaotic-regime makes 1e-4 untenable at step-2000 cross-stack), it must be SEPARATELY operator-approved per spec § 2.6 + conventions doc § L (NEVER inline this sub-phase).

## 6. Drift between phase-2-plan § 2.5 and HEAD state — LOAD-BEARING

(FACT — comparison of `docs/phases/phase-2-cross-stack-replication.md` lines 1852-1907 against HEAD at `c4be56b`. The phase-2-plan § 2.5 stage data was drafted **pre-Phase-0-Block-8** + **pre-Phase-1-landing**; the D1=SUPERSEDE ratification at Taichi-integration is exercised by THIS sub-phase consuming § 2.5 as reference, NOT as dispatch.)

### 6.1 DRIFT-1 — canonical capture descriptor (LOAD-BEARING)

- **phase-2-plan § 2.5 CAPTURES_REQUIRED:** `gray-scott-lambda-512sq-seed42-step1000` (512² grid, 1000 steps).
- **HEAD canonical (Block 8 frozen):** `gray-scott-lambda-128sq-seed42-step2000` (128² grid, 2000 steps).
- **Disposition:** the Phase-1-frozen canonical descriptor wins per Hard Rule 2 + Convention M (HEAD is authoritative). Stack-D port produces a capture matching the HEAD descriptor `gray-scott-lambda-128sq-seed42-step2000`. **The phase-2-plan's 512sq-step1000 was a pre-Block-8 hypothesis; it does NOT exist on disk and is NOT load-bearing for any downstream consumer.** Spec Appendix D § D.2.3 is the authoritative descriptor source (verified at spec-ref.md § 11).

### 6.2 DRIFT-2 — cross-stack tolerance (LOAD-BEARING)

- **phase-2-plan § 2.5 EQUIVALENCE_POSTURE:** "Bit-exact same-stack, epsilon 1e-5 cross-stack (per spec § 2.6)."
- **HEAD reality** at three independent sites:
  - `tools/testkit/equivalence/tolerance.toml` line 23: `[defaults.reaction-diffusion] relative = 1e-4`.
  - `tools/testkit/equivalence/tolerance-budget.toml` line 21: `[budgets.reaction-diffusion.cross_stack] relative = 1e-4`.
  - `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md` § 9 line 97: "category default tolerance is `relative = 1e-4`."
  - `docs/sim-specs/continuous-ca/reaction-diffusion-2d/determinism.md` line 33: "cross-stack equivalence falls under the `tolerance.toml` budget at the `reaction-diffusion` category default `relative = 1e-4`."
- **Disposition:** HEAD wins at three concordant load-bearing sites. The phase-2-plan's "1e-5" is stale (likely a pre-Phase-0 sketch). **D3 lean is corrected to `relative = 1e-4` (NOT 1e-5 as the dispatch contract's lean suggested).** The dispatch contract briefing was drafted against the phase-2-plan's outdated text; HEAD is authoritative.

### 6.3 DRIFT-3 — portfolio directory shape (LOAD-BEARING)

- **phase-2-plan § 2.5 IMPL_DIR:** `continuous-ca/reaction-diffusion-2d/ref-stack-d/reaction_diffusion_2d_stack_d/` (per spec § 3.7 `<category>/<sim>/ref-stack-<X>/`).
- **HEAD reality:** Phase-1 sims live under `packages/<sim>/` (e.g., `packages/reaction-diffusion-2d/`, `packages/sph-water/`, etc. — all 10 sim packages). The phase-2-plan's `continuous-ca/<sim>/ref-stack-<X>/` shape was the **pre-Phase-1** anticipated directory pattern; Phase-1 landed all 10 sims at `packages/<sim>/` instead. **No `continuous-ca/reaction-diffusion-2d/` directory exists at HEAD** (verified `ls continuous-ca/ 2>&1` returns no such dir — only the `docs/sim-specs/continuous-ca/` spec-sheet tree exists at that segment).
- **Disposition:** **D6 surface** (this sub-phase establishes the cross-stack-port directory precedent). Lean: `packages/reaction-diffusion-2d-stack-d/` (sibling workspace member to Phase-1's `packages/reaction-diffusion-2d/`). Alternatives: (b) `packages/reaction-diffusion-2d/stack_d/` (subpackage inside existing — violates Convention A by requiring modification of pre-existing Phase-1 package's structure), (c) `continuous-ca/reaction-diffusion-2d/ref-stack-d/` (phase-2-plan original; requires creating new top-level directory inconsistent with Phase-1's `packages/` discipline). **Operator routes at charter close.**

### 6.4 NON-DRIFT — captures + spec sheet + probe-report siblings

These phase-2-plan § 2.5 anchor sketches verify cleanly at HEAD:
- `captures/reaction-diffusion-2d-stack-d/` — does not exist yet; will be created by Stage 1 (sibling to existing `captures/reaction-diffusion-2d-ref/`).
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` — does not exist; will be sibling to existing `spec-ref.md` + `algebraic.md` + `determinism.md` + `README.md`. No drift in spec-sheet siblings location.
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` — **DOES NOT YET EXIST** (verified `ls` of the dir). Phase-2-plan § 2.5 says "append Stack D section"; Stage 1 must create the file de novo (the Stack-D port is the first cross-stack pair to land; equivalence.md is born here).
- `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` — does not exist; sibling to existing `reaction-diffusion-2d.md`.

### 6.5 NON-DRIFT — VERIFICATION_REGIME + TIER_2_SUBSTACKS + KEY_RISKS

- VERIFICATION_REGIME: MMS for diffusion (Salari & Knupp 2000 — wider toolkit) + Gray-Scott pattern reproduction (Pearson 1993) — anchor verified, MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` confirmed Python-callable.
- TIER_2_SUBSTACKS: scalar-field (matches Phase-1 RD-2D test_diagnostics.py monotone_bounds.check_bounds on U + V).
- KEY_RISKS verified consistent with Taichi-integration § 9 R-T1 through R-T5 (Taichi field-init order, kernel-launch grid sizing, pattern reproduction). These propagate to this sub-phase's § 9 R-P1 through R-P6 verbatim (per dispatch contract).

## 7. Anchor-sketch verification at HEAD (Convention M)

| # | Anchor | Verified at HEAD | Notes |
|---|---|---|---|
| A1 | Conventions doc sha256 `167fe349…58c2e` | ✓ matches dispatch | First sub-phase to dispatch against this sha256 |
| A2 | Phase-1 landing audit head_sha `9998bc1` → `v0.1.0-phase-1` | ✓ Stage 0 will replay | 19th invocation expected |
| A3 | Bit-identity replay invariant `9399fc33…909f34` | ✓ 18 invocations through capture-determinism-contract Stage 0 | Stage 0 Task 0.0 = 19th |
| A4 | Capture-determinism-contract landing head_sha `9bf5b68` | ✓ + SHA back-fill `c4be56b` | Immediately-prior sub-phase |
| A5 | Canonical capture sha256 `bcae544a…f92148f0` | ✓ matches Block 8 evidence | Sealed at Phase 0 |
| A6 | RD category tolerance `relative = 1e-4` at three sites | ✓ concordant | Phase-2-plan § 2.5's "1e-5" is stale |
| A7 | MMS solution `solution.py` exists + Python-callable | ✓ Phase-1 RD-3D Stage 2 deliverable | Stack-D port consumes via Phase-1+ MMS pipeline |
| A8 | IC-13 contract wording at spec § 2.5 | ✓ landed at capture-determinism-contract Stage 1 (commit `26e1343`) | New baseline; Stack-D port's first per-sim consumer |
| A9 | IC-14 Python `run_twice_and_diff` signature | ✓ at `tools/testkit/determinism/harness.py` | Stack-D port's gate-10 consumer |
| A10 | IC-11 `set_taichi_deterministic(config, arch="cpu")` | ✓ at `common/common-py/src/common_py/determinism.py` | Stack-D port's deterministic-init consumer |
| A11 | IC-2 `Writer` capture I/O Python | ✓ at `common/common-py/src/common_py/capture.py` | Stack-D port writes canonical capture via this |
| A12 | Hello-taichi smoke kernel exemplar | ✓ at `common/common-py/smoke/hello_taichi.py` | Structural pattern for RD-2D Stack-D kernel |
| A13 | Spec § 5 RD-2D primary stack = B | ✓ (spec-ref.md § 5 + phase-1-plan § 5.2.1) | Stack-D port is the FIRST per-sim sub-phase on a SECONDARY stack |
| A14 | Phase-2-plan § 2.5 directory shape `continuous-ca/<sim>/ref-stack-d/` | ✗ DRIFTED — Phase-1 puts sims under `packages/` | D6 surface |
| A15 | Phase-2-plan § 2.5 descriptor `512sq-step1000` | ✗ DRIFTED — Block 8 froze `128sq-step2000` | Canonical descriptor at HEAD wins |
| A16 | Phase-2-plan § 2.5 tolerance `1e-5` | ✗ DRIFTED — HEAD is `1e-4` at three sites | Phase-2-plan stale |

## 8. D-class decision surface preview (operator-routable at charter close)

### D1 — Sub-phase naming convention for cross-stack port sub-phases

(Conventions doc has NO prescription per § 1 of this probe.)

- **Lean:** `sub-phase-reaction-diffusion-2d-stack-d` (full sim slug + `-stack-d` suffix).
  - Rationale: preserves the full sim slug used at `packages/reaction-diffusion-2d/`, `captures/reaction-diffusion-2d-ref/`, `docs/sim-specs/continuous-ca/reaction-diffusion-2d/`, `tools/testkit/probes/reports/reaction-diffusion-2d.md`, etc. The phase-2-plan § 2.5 itself uses the `reaction-diffusion-2d-stack-d` slug at three paths (`captures/`, `spec-ref-stack-d.md`, `probe.md`) — corroborating the sim-slug-plus-stack pattern.
  - Establishes precedent for the 7 remaining Phase-2 cross-stack ports: `sub-phase-sph-water-stack-d`, `sub-phase-eulerian-smoke-stack-d`, `sub-phase-eulerian-smoke-stack-e`, `sub-phase-lattice-boltzmann-d3q19-stack-d`, `sub-phase-lattice-boltzmann-d3q19-stack-e`, `sub-phase-mpm-multimaterial-stack-e`, plus the Stack-C port if dispatched (`sub-phase-reaction-diffusion-2d-stack-c`).
- **Alternative A:** `sub-phase-rd2d-stack-d-port` (acronym + suffix). Shorter; loses sim-slug consistency.
- **Alternative B:** `sub-phase-reaction-diffusion-2d-port-stack-d` (port keyword explicit). Verbose; redundant.
- **Probe lean:** `sub-phase-reaction-diffusion-2d-stack-d`. Operator routes.

### D2 — Stage 1 decomposition (monolithic vs 1a/1b/1c)

- **Lean:** Stage 1a / 1b / 1c sub-decomposition.
  - Rationale: every per-sim Phase-1 sub-phase decomposed Stage 1 into (1) failing-tests-commit + (2) implementation-commit (capture-determinism-contract monolithic was a portfolio-wide contract-redesign EXCEPTION). The cross-stack port adds a third sub-stage: (3) cross-stack-equivalence-harness extension + post-implementation verification. IC-8 / spec § 1.3 step 4 / phase-2-plan § 1.5.1 Gate 3 all REQUIRE the failing-tests commit to precede the implementation commit, with the failing-tests-output-hash recorded in both commit footers.
  - Sub-stages:
    - **Stage 1a — Failing-tests commit.** New `packages/reaction-diffusion-2d-stack-d/tests/` test files importing the yet-to-exist Stack-D modules; failing-tests-evidence file at `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt` + sha256.
    - **Stage 1b — Implementation commit.** `packages/reaction-diffusion-2d-stack-d/<package>/` Taichi-DSL Gray-Scott implementation + canonical capture + Tier-1+Tier-2 + PBT + perf-ledger row + determinism declaration docstring.
    - **Stage 1c — Cross-stack equivalence + landing-prep.** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` creation + `tools/testkit/equivalence/tolerance.toml` per-sim override (only if needed) + cross-stack diff witness against Stack-B reference capture + spec-ref-stack-d.md.
- **Alternative:** monolithic Stage 1 (single sub-bundle commit). Acceptable only if dispatch-time scope estimate stays under +500/-50 lines net (Taichi-integration § 8.2 N5 precedent — operator-acknowledged). Probe estimate: ~+800 to +1200 lines (Taichi-DSL kernel + tests + spec sheet + probe report + equivalence.md + capture sidecar JSON). Decomposition justified.

### D3 — Cross-stack equivalence tolerance value

- **Lean:** `relative = 1e-4, absolute = 0.0` per HEAD `tolerance.toml` + `tolerance-budget.toml` + spec-ref.md § 9 + determinism.md (3 concordant sites). **NO per-sim override needed; category default applies.**
- **Phase-2-plan § 2.5's "1e-5" is stale** — corrected per DRIFT-2 above.
- **Alternative:** if Stage 1c surfaces that 1e-4 is untenable for Gray-Scott chaotic-regime cross-stack at step-2000 (R-P2), operator routes either (a) tolerance-budget amendment (separate operator-approved commit) OR (b) step-horizon override (compare at step ≤ N where 1e-4 holds; document beyond N).

### D4 — Step-horizon for cross-stack equivalence run

- **Lean:** full canonical step-2000 (the HEAD-frozen descriptor; full chaotic-regime stress test).
  - Document at Stage 1c the step at which cross-stack diff approaches or exceeds 1e-4 tolerance (record as Stage 1c witness).
  - Compare at the 11 captured frames [0, 200, ..., 2000] (capture interval 200); the equivalence harness diffs frame-by-frame.
- **Alternative:** shorter horizon (e.g., step ≤ 1000) if probe surfaces principled reasoning that step-2000 cross-stack is structurally untenable. Probe finds no such principled reason at this time — Gray-Scott λ-region pattern formation is well-resolved at 2000 steps; the Phase-0 Stack-B canonical capture lands there cleanly with `bit-exact-same-hw` declaration; same-IC + same-seed + same-arithmetic on Stack-D arch=cpu should produce content-equivalent output at the IC-13 contract level (same-stack at zero tolerance); cross-stack diff at 1e-4 is the relevant equivalence relation.

### D5 — Banked-items disposition (per dispatch contract)

(FACT — capture-determinism-contract landing § 9 + Taichi-integration landing § 9.)

| Banked item | Disposition at this sub-phase close |
|---|---|
| Testing-improvements sub-phase | **DEFER** (separate routing) |
| Cross-stack verification methodology | **PARTIAL SCOPE-IN** — this sub-phase IS the first cross-stack pair landing (Stack-B↔Stack-D). Lean: consolidate the harness invocation pattern + tolerance routing + step-horizon documentation discipline here in equivalence.md; defer full methodology consolidation to a later sub-phase when 2+ cross-stack pairs are available for pattern extraction. Alternative: full DEFER to second cross-stack pair (sph-water Stack-D or RD-2D Stack-C). |
| evidence_paths LFS remediation (per § B.6) | **DEFER** (focused infrastructure hotfix bundle candidate) |
| Conventions doc § B.6 addendum — empty-file rejection drift mode | **DEFER** (bundle candidate with LFS) |
| Mid-Phase-1 capture regeneration | **DEFER** (per-sim work; not RD-2D) |
| LBM/MPM `sim_runner_diagnostic` seed-propagation defect (capture-determinism-contract Stage 1 N1) | **DEFER** (NOT in scope; informs test-surface posture but does not gate this sub-phase) |

### D6 — Port directory shape (NEW; surfaced by DRIFT-3)

- **Lean:** Option A — `packages/reaction-diffusion-2d-stack-d/` (sibling workspace member).
  - Mirrors Phase-1's `packages/<sim>/` discipline (10 sims at HEAD).
  - New workspace member registered in root `pyproject.toml` `[tool.uv.workspace].members`.
  - Convention A respected: no modification of pre-existing `packages/reaction-diffusion-2d/` package; Stack-D is additive sibling.
  - Test surface `packages/reaction-diffusion-2d-stack-d/tests/`; module surface `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/`.
- **Alternative A:** subpackage `packages/reaction-diffusion-2d/stack_d/` (inside existing package). Violates Convention A (requires modification of Phase-1 sealed `pyproject.toml`).
- **Alternative B:** phase-2-plan-original `continuous-ca/reaction-diffusion-2d/ref-stack-d/`. Inconsistent with Phase-1 portfolio structure; requires creating new top-level directory.
- **Operator routes at charter close.**

## 9. Plan-drafting shifts surfaced (new)

| ID | Description |
|---|---|
| **N1 (plan-drafting)** | **FIRST cross-stack port sub-phase routing pattern.** Sub-phase plan-drafting for a SECONDARY-STACK sim implementation does not exist in the audit chain prior to this sub-phase. Every Phase-1 per-sim sub-phase (closed-form, agent-based, RD-3D, sph-water, eulerian-smoke, LBM, MPM) implemented its sim on its PRIMARY stack with no cross-stack equivalence gate active (Phase 1's gates 4-13 are stack-agnostic correctness gates; gate 14 = cross-stack equivalence is the Phase-2-specific addition per phase-2-plan § 1.5.1 v6 amendment). This sub-phase exercises gates 4-14 for the FIRST time at sim-test scale. **Banked precedent:** sub-phase plan-drafting for cross-stack ports inherits per-sim implementation template (agent-based) + adds cross-stack equivalence + port-directory-shape D-class question + sibling spec-sheet pattern (`spec-ref-stack-d.md` next to `spec-ref.md`). Subsequent Stack-D / Stack-E / Stack-C port sub-phases consume this pattern. |
| **N2 (plan-drafting)** | **Phase-2-plan § 2.5 supersedure pattern exercised structurally.** Per D1=SUPERSEDE ratification at Taichi-integration close, phase-2-plan § 2.5's monolithic 10-stage dispatch shape is consumed as REFERENCE not dispatch. The three load-bearing drifts (canonical descriptor, tolerance value, directory shape) surfaced cleanly via § 6 of this probe. **Banked precedent:** every subsequent Phase-2 cross-stack port sub-phase plan-drafting reads its corresponding phase-2-plan § 2.X stage data as reference, anchor-checks against HEAD per Convention M, and surfaces drifts as load-bearing structural questions at probe time (NOT silently follows the stale text). This sub-phase establishes the SUPERSEDE-not-follow pattern operationally. |
| **N3 (plan-drafting)** | **First per-sim sub-phase to ship cross-stack equivalence as gate-14 with a TRUE matching-sim pair.** Taichi-integration Stage 2 Step 2.9 invoked the equivalence harness against hello-taichi-cpu vs advection_1d — different-sim case; emitted `within_tolerance=False` as expected (per its banked § 8 N7 verification-pattern precedent). RD-2D Stack-D port is the FIRST TRUE matching-sim cross-stack invocation; gate-14 acceptance is `within_tolerance=True` at `relative = 1e-4` over the canonical capture. **Banked precedent:** subsequent Phase-2 cross-stack port sub-phases inherit the gate-14 acceptance contract from this sub-phase's Stage 1c witness. |

**Cumulative shift count at plan-drafting close (expected):** 107 (entering from capture-determinism-contract landing § 8.3) + 3 (N1 / N2 / N3 plan-drafting) = **110**.

## 10. Open blocking dependencies for Stage 0 dispatch

None surfaced at this probe.

(FACT — Stage 0 Task 0.0 will replay against `v0.1.0-phase-1` (19th invocation of `9399fc33…909f34`); Stage 0 Task 0.1 carries `[phase]` over to `"sub-phase-reaction-diffusion-2d-stack-d"`; Stage 0 Task 0.2 re-verifies Phase-1 RD-2D failing-tests evidence sha256 if reused (otherwise Stack-D port ships its own evidence at Stage 1a per IC-8); Stage 0 Task 0.3 — canonical-descriptor scope-analysis per conventions doc § N — RD-2D at 128² × 2000 steps × 11 frames is well within W1 + memory + wall-clock ceilings (probe estimate: capture size ≤ 3 MB, wall-clock floor ≤ 10 s on CPU arch); Stage 0 Task 0.4 — empirically validate Taichi-DSL kernel correctness via a small smoke-tier exercise mirroring `hello_taichi.py` shape before Stage 1 dispatch.)

**Potential dependencies to verify at Stage 0** (per conventions doc § N + dispatch contract Hard Rule 2):
- Taichi 1.7.4 + arch="cpu" actually supports the 5-point-Laplacian + reaction kernel pattern at the canonical 128² grid + 2000 steps. The hello-taichi smoke at 64 cells × 100 steps is 4× smaller in spatial × 20× smaller in temporal; verify scaling cleanly.
- MMS evaluator at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` is invokable from a Taichi-DSL sim wrapper at gate-4 time (the MMS solution itself is pure NumPy; the harness that injects source terms into the Taichi sim is the integration question — Stage 1b's gate-4 test surface).
- Cross-stack equivalence harness `compare_captures` consumes the Stack-D capture vs Stack-B reference capture cleanly given that both ship under the new IC-13 content-equivalent contract (Stack-B reference was Phase-0-Block-8-frozen pre-IC-13; verify the reference capture's manifest is still readable under the current capture-v1 schema).

---

This probe lands at HEAD `c4be56b1300ef5bb212b31a0fba4cb2ee1adff87`. Convention #12 SHA back-fill applies after the closing commit per § B.2 tightened-discipline; this audit's `head_sha:` will be back-filled in a follow-up commit if the closing-commit SHA differs.

Verdict: **CONFIRMED**.
