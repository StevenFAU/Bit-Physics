# External dependency pins

Per spec § 9.2 and Appendix D § D.4. Each entry is a load-bearing external
dependency with a verification command. Pins are re-verified at each
consuming block/phase per Convention-8 (no fabrication from memory).

Phase 0 Block 1 seeds this file. Later blocks and phases append entries via
their landing audits.

## Verified at Phase 0 Block 1 (2026-05-18)

| Dependency | Used by | Pin (Block 1 known-good) | License | Verification command |
|---|---|---|---|---|
| **pre-commit/pre-commit-hooks** | `.pre-commit-config.yaml` | `v6.0.0` (2025-08-09) | MIT | `gh release view -R pre-commit/pre-commit-hooks` |
| **astral-sh/ruff-pre-commit** | `.pre-commit-config.yaml` | `v0.15.13` (2026-05-14) | MIT | `gh release view -R astral-sh/ruff-pre-commit` |
| **compilerla/conventional-pre-commit** | `.pre-commit-config.yaml` | `v4.4.0` (2026-02-18) | Apache-2.0 | `gh release view -R compilerla/conventional-pre-commit` |
| **uv** | repo-root + workspace members | `0.11.15` (May 2026) | Apache-2.0 / MIT | `uv --version` |
| **Python** | all Python phases | `3.12+` | PSF | `python3 --version` |
| **Node** | Block 7, Phase 5 web-deploy | `22 LTS+` | OpenJS / various | `node --version` |
| **pnpm** | Block 7, Stack B sims | `10.x+` | MIT | `pnpm --version` |
| **h5py** | `tools/testkit/capture/` | `>=3.10` | BSD-3-Clause | `pip index versions h5py` |
| **numpy** | `tools/testkit/capture/` | `>=2.0` | BSD-3-Clause | `pip index versions numpy` |
| **jsonschema** | `tools/testkit/capture/` | `>=4.20` | MIT | `pip index versions jsonschema` |

## Forward-looking pins (declared by later blocks/phases)

See Appendix D § D.3 (vendored dependency pins — SPlisHSPlasH, OpenVDB,
NVIDIA Newton, etc.) and § D.4 (additional non-vendored deps — h5wasm,
Lightning, PhysicsNeMo, Warp, Taichi) in
[`architecture.md`](architecture.md).

## Append discipline

Append-only. Each later phase appends rows; existing rows are NOT modified
without a separate operator-approved amendment commit.

## Operator notes

**Fresh-checkout sync.** The workspace root `pyproject.toml` declares
`[tool.uv] package = false` with no dependencies, so bare `uv sync` at the
repo root resolves the lockfile but installs no workspace members — the
`.venv` ends up empty. The canonical fresh-checkout invocation, matching
the per-job CI workflows (`.github/workflows/python-strict.yml`,
`determinism.yml`, `equivalence.yml`, `integrity.yml`,
`tolerance-budget-check.yml`), is per workspace member:

```
(cd tools/testkit               && uv sync --extra dev)
(cd tools/integrity             && uv sync --extra dev)
(cd tools/diagnostics           && uv sync --extra dev)
(cd packages/reaction-diffusion-2d && uv sync --extra dev)
```

This populates `.venv` with each member's runtime + dev deps (pytest,
ruff, mypy, mutmut, h5py, hypothesis, …). The Phase 1 preflight's
per-member `uv run --directory <member> pytest -W error` checks then
re-sync as needed and find the right `pytest` in `.venv/bin/`.

## Phase 1 Stage 3 — common-cpp dependencies (added 2026-05-20)

Source: `common/common-cpp/_staging/deps.md` (consolidated here per Stage 3
procedure; staging file removed at consolidation time).

### Active common-cpp dependencies

| Dependency | Used by | Pin | License | Verification command |
|---|---|---|---|---|
| `nlohmann/json` | `common/common-cpp/include/bit_physics/common/capture.hpp` (IC-1 JSON manifest) | `v3.11.3` | MIT | `grep 'nlohmann_json' common/common-cpp/CMakeLists.txt` |
| `doctest` | `common/common-cpp/tests/` | `v2.4.11` | MIT | `grep 'doctest' common/common-cpp/CMakeLists.txt` |
| `Vulkan SDK` (system) | `common/common-cpp/include/bit_physics/common/vulkan_init.hpp` | `1.3.x` (system loader; `find_package(Vulkan QUIET)`) | various | `vulkaninfo \| head -3` |

### Banked / deferred common-cpp dependencies

Per Stage 1 final checkpoint § 7 banked items B4, B5, B6 (carried
forward into the per-sim implementation phase):

| Dependency | Status | Reason | Owner |
|---|---|---|---|
| HDF5 | Not vendored | Phase 1 IC-1 uses `raw-binary-v1` payload + JSON manifest (Stage 1 shift). | Per-sim Stack C implementation phase (B4) |
| OpenVDB | Not vendored | `export_hooks.hpp` ships a stub. | eulerian-smoke implementation phase (B5) |
| Alembic | Not vendored | Same pattern. | mpm-multimaterial implementation phase (B5) |
| USD | Not vendored | Same pattern. | Per-sim phase (B5) |
| Dear ImGui | Not vendored | `imgui_hooks.hpp` ships empty stubs. | First sim wanting runtime UI (B5) |

## Phase 1 Stage 3 — common-py dependencies (added 2026-05-20)

Source: `common/common-py/_staging/deps.md` (consolidated here; staging
file removed at consolidation time).

### Runtime

| Dependency | Used by | Pin | License | Verification command |
|---|---|---|---|---|
| `bit-physics-testkit` (workspace) | `common-py.capture`, `common-py.determinism` | workspace (= 0.0.0) | MIT (repo) | `grep 'bit-physics-testkit' common/common-py/pyproject.toml` |
| `h5py` | `common-py.capture` (transitive via testkit) | `>= 3.10` | BSD-3-Clause | `pip index versions h5py` |
| `numpy` | `common-py.capture`, IC-4 plumbing | `>= 2.0` | BSD-3-Clause | `pip index versions numpy` |
| `watchfiles` | `common_py.hotreload.watch_and_reexec` (spec § 4.4) | `>= 0.21` | MIT | `pip index versions watchfiles` |

### Optional extras

| Dependency | Extra | Pin | License | Used by |
|---|---|---|---|---|
| `taichi` | `[taichi]` | `>= 1.7` | Apache-2.0 | `set_taichi_deterministic`; Stack D sims |
| `matplotlib` | `[plotting]` | `>= 3.8` | PSF-based | `common_py.plotting` (lazy-import) |

### Dev (`[dev]`)

| Dependency | Pin | Notes |
|---|---|---|
| `mypy` | `>= 1.10` | Strict type-checking, mirrors Phase 0 testkit. |
| `pytest` | `>= 8.0` | Test runner. |
| `pytest-cov` | `>= 5.0` | Coverage. |
| `ruff` | `>= 0.5` | Lint + format. |

## Phase 1 Stage 3 — Phase 1 Stage 2 sim packages (added 2026-05-20)

The 9 sim packages (closed-form, agent-based, RD-3D, sph-water,
eulerian-smoke, lattice-boltzmann-d3q19, mpm-multimaterial) each ship
with a Phase-1-light `pyproject.toml`: only `pytest >= 8.0` as a
`[dev]` extra. Phase 2+ implementation phases will append per-sim
runtime dependencies (numpy, h5py, hypothesis, …) when actual
implementations land.

Per Stage 2 shift #11 (Stack B pytest; not vitest) and shift #15
(Stack C pytest at TDD-bootstrap; per-sim implementation phase adds
CMake/ctest): the Phase-1-light pin set is uniform across stacks at
this phase.

## Phase 1 Stage 3 — fresh-checkout sync (Phase 1 extended)

Extending the Phase 0 list above (`tools/testkit`, `tools/integrity`,
`tools/diagnostics`, `packages/reaction-diffusion-2d`) with the
Phase 1 additions:

```
(cd common/common-py            && uv sync --extra dev)
(cd packages/strange-attractors && uv sync --extra dev)
(cd packages/mandelbulb-explorer && uv sync --extra dev)
(cd packages/boids-3d           && uv sync --extra dev)
(cd packages/physarum           && uv sync --extra dev)
(cd packages/reaction-diffusion-3d && uv sync --extra dev)
(cd packages/sph-water          && uv sync --extra dev)
(cd packages/eulerian-smoke     && uv sync --extra dev)
(cd packages/lattice-boltzmann-d3q19 && uv sync --extra dev)
(cd packages/mpm-multimaterial  && uv sync --extra dev)
```

common-cpp uses CMake / FetchContent, not uv; `cmake -S
common/common-cpp -B build/common-cpp -G Ninja` resolves the
`nlohmann/json` + `doctest` pins above.

## Phase 1 sub-phase-numba-integration — numba JIT acceleration (added 2026-05-21)

Source: sub-phase-numba-integration landing audit at
`docs/_audits/phase-1/sub-phase-numba-integration/landing-<UTC>.md`.
Motivated by the sub-phase-particle-fluids-sph-water Stage 1 R18
STOP-AND-SURFACE: even with `scipy.cKDTree` + vectorized pair-array
math, pure-Python NumPy at 1M-particle scale produced ~10⁴-s
wall-clock (~3.6 hours). The same Python-interpreter-overhead
bottleneck will recur at eulerian-smoke (grid sim), lattice-
boltzmann-d3q19 (lattice), and mpm-multimaterial (particle-grid
hybrid) canonical scales. Adding numba project-wide now amortizes
the dependency landing.

### Runtime

| Dependency | Used by | Pin | License | Verification command |
|---|---|---|---|---|
| `numba` | `tools/testkit` (declared at the universal workspace dep so every sim + integrity + diagnostics + every sub-phase consumer transitively gets it) | `>= 0.61, < 0.66` (0.65.1 known-good at this commit; PyPI latest at 2026-05-21) | BSD-2-Clause | `pip index versions numba` |
| `llvmlite` | numba transitive | per numba's pin | BSD-3-Clause | `pip index versions llvmlite` |

### Project-wide convention

The use convention is documented at [`docs/common/numba.md`](common/numba.md).
Load-bearing rules:

- `@njit(fastmath=False, cache=True)` is the **mandatory** decorator
  form. Both kwargs MUST be specified explicitly (no relying on
  defaults — audit clarity matters).
- `fastmath=True` is **banned** (re-associates float ops; breaks
  bit-exactness against the pure-NumPy reference).
- `parallel=True` without explicit reduction ordering is **banned**
  (numba's `prange` has nondeterministic reduction semantics by
  default).
- `error_model="numpy"` is **banned** if it affects determinism (it
  doesn't at HEAD, but explicit ban keeps the surface tight).

### Verification

The determinism contract is verified by the regression test at
[`tools/testkit/numba_harness/tests/test_numba_determinism.py`](../tools/testkit/numba_harness/tests/test_numba_determinism.py)
(directory named `numba_harness/` rather than `numba/` to avoid
shadowing the upstream `numba` package import in this workspace).
The test runs a known-deterministic numerical computation (multi-
particle force accumulation + density gradient — mirrors the kind of
arithmetic SPH and other sims use) under both pure NumPy and numba
JIT at N ∈ {64, 256, 1024} and asserts bit-identical output. If
numba ever produces drift (across version updates, platform changes,
etc.), this test catches it.

## spec-Phase-2 sub-phase-taichi-integration — Taichi DSL + common-py workspace adoption (added 2026-05-23)

Per `docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md`.
Establishes Stack D (Python / Taichi) infrastructure for subsequent
spec-Phase-2 per-sim Stack-D port sub-phases. Resolves the common-py
adoption decision banked since sub-phase-numba-integration § 2 re-anchor
finding (D2 row 2 transition: SCOPED IN → RESOLVED).

### Runtime — new workspace member

| Dependency | Used by | Pin | License | Verification command |
|---|---|---|---|---|
| **`bit-physics-common-py`** | `common/common-py/` workspace member; Stack-D sims | (workspace; tracks repo HEAD) | (per repo LICENSE) | `uv tree --workspace common-py` |
| **`taichi`** | `common/common-py/pyproject.toml` `[project].dependencies` | `>=1.7,<2.0` (1.7.4 known-good 2026-05-23) | Apache-2.0 | `pip index versions taichi` |
| **`llvmlite`** | taichi transitive (LLVM 15.0.4 bundled) | per taichi's bundle | BSD-3-Clause | (transitively pinned by taichi) |

### Project-wide convention

The use convention is documented at [`docs/common/taichi.md`](common/taichi.md).
Load-bearing rules per the convention doc:

- `ti.init(arch=ti.cpu, random_seed=<seed>, cpu_max_num_threads=1, offline_cache=True)`
  is the **mandatory** initialization form for the
  `bit-exact-same-stack-same-hw` declaration. **Note:** the
  `deterministic_mode=True` kwarg cited in spec § 4.4 is NOT a valid
  Taichi 1.7.4 `ti.init` parameter — the actual mechanism is the
  four-kwarg combination above (verified by signature inspection at
  sub-phase-taichi-integration Stage 1).
- `fast_math=True` is **banned** (re-associates float ops; breaks
  bit-exactness; same family as numba's `fastmath=True` ban).
- `default_fp=ti.f32` is **banned** when the sim uses `f64` (silent
  precision downgrade).
- Unguarded `cpu_max_num_threads > 1` is **banned** (nondeterministic
  parallel reductions; same family as numba's `parallel=True` ban).
- Module-scope `from __future__ import annotations` is **banned** in
  any module containing `@ti.kernel`-decorated functions (spec § 4.4
  limitation #2; Taichi resolves annotations at decoration time).
- `-> None` return annotations are **banned** on void `@ti.kernel`
  functions (Taichi-1.7.4 AST-transformer limitation; documented at
  `docs/common/taichi.md` § 4.6).
- Stack-B/C developers can install workspace members WITHOUT pulling
  common-py + Taichi by omitting common-py from their consumed
  workspace-member set (Taichi is Stack-D-only per Task 0.3 routing
  (a)).

### Verification

The determinism contract is verified by the regression test at
[`tools/testkit/taichi_harness/tests/test_taichi_determinism.py`](../tools/testkit/taichi_harness/tests/test_taichi_determinism.py)
(directory named `taichi_harness/` rather than `taichi/` to avoid
shadowing the upstream `taichi` package import in this workspace).
The test runs a known-deterministic 1D explicit-diffusion sim under
both pure NumPy and Taichi JIT at N ∈ {64, 256, 1024} and asserts
FP-equivalence within 1e-9 absolute (well below spec's cross-stack
1e-4 relative tolerance). Plus two bit-determinism contracts:
run-to-run identity + cold-vs-warm `offline_cache` identity.

All 5 tests use `pytest.importorskip("taichi")` at module top so they
skip cleanly when Taichi is unavailable in CI (R-T1 mitigation per
`docs/phases/sub-phase-taichi-integration.md` § 9; locally validated
during sub-phase-taichi-integration Stage 1).

### Re-pin policy

Raising the upper bound of `taichi>=1.7,<2.0` (e.g., to allow
Taichi 2.x) is a **separate operator-approved commit + audit entry +
regression-test re-verify** per
[`docs/conventions/sub-phase-conventions.md`](conventions/sub-phase-conventions.md)
§ H.4. Same discipline as numba § 5 + spec § 9.2 vendored-upstream
amendments.

## spec-Phase-2 sub-phase-capture-determinism-contract — content-equivalent determinism harness (added 2026-05-23)

Per `docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-<UTC>.md`.
Establishes the canonical determinism contract (content-equivalent over a
normalized capture-payload projection — every state array + every diagnostic
entry compared element-wise; wall-clock-influenced storage-format metadata
excluded) ahead of any further Stack-D port. Spec § 2.5 amended verbatim with
operator-routed wording; conventions doc § F.3 reworded; conventions doc
§ A.2 cross-references the harness as the gate-11 mechanism; conventions doc
§ B.7 (NEW additive sub-section) codifies the Python + TypeScript fan-out
shape for first-wiring sub-phases.

### Runtime — new module surfaces (no new external pins)

| Module surface | Used by | Public API |
|---|---|---|
| **`tools/testkit/determinism`** (Python; renamed contract) | every Phase-1 + Phase-0 sim's `tests/test_determinism.py`; every future Stack-{B,C,D,E} port sub-phase's gate-11 invocation | `run_twice_and_diff(runner, *, seed=42, tmp_dir=None) -> DeterminismVerdict { content_equivalent: bool, detail: str }`. Backward-compatibility shim: `DeterminismVerdict.bit_exact` returns `content_equivalent` with `DeprecationWarning` on access. |
| **`@bit-physics/common-ts/src/determinism`** (TypeScript; NEW) | hello-physics smoke test; every future Stack-B sim's vitest gate; every TS-side dual-language sub-phase invocation | `runTwiceAndDiff(runner, options) -> Promise<DeterminismVerdict { contentEquivalent: boolean, detail: string }>`. Sibling exports: `loadCapture`, `diffCaptures`, type `Capture`, type `CaptureStep`, type `DiffResult`, type `SimRunner`, type `RunTwiceOptions`. |

### Project-wide convention

The contract is documented at the canonical spec wording (`docs/architecture.md` § 2.5)
+ the harness's `policy.md` (`tools/testkit/determinism/policy.md`) + the
conventions doc (`docs/conventions/sub-phase-conventions.md` § F.3).
Load-bearing rules:

- The canonical determinism gate is the harness API — Python
  `run_twice_and_diff` or TypeScript `runTwiceAndDiff`. Both surfaces return
  `DeterminismVerdict { content_equivalent / contentEquivalent, detail }`.
  The harness is the **single source of truth** for "two captures of the
  same sim at the same seed are equivalent."
- Raw-file byte-equality is **NOT** the contract. Two captures of the same
  state written at different Unix instants may have different `.h5` raw
  sha256 because the HDF5 format embeds wall-clock-influenced metadata
  (`H5O_MTIME_NEW`, library version banners). The harness projects to the
  parsed `Capture` data model; that projection is wall-clock-independent.
- `payload.checksum` in the capture manifest is the raw-file sha256 of the
  HDF5 payload as written by the producer. It is **informational only** per
  the description annotation added to `tools/testkit/schemas/capture-v1.json`
  at this sub-phase; downstream consumers MUST NOT use byte-equality on
  this field as a determinism gate.
- Defense-in-depth at the writer surface (both implementations suppress
  wall-clock-influenced metadata at the source even though the harness
  contract makes this non-load-bearing):
  - **Python** (`tools/testkit/capture/writer.py`): `h5py.File(...,
    libver="earliest")` + `track_order=False` on every `create_group` +
    `track_times=False` on every `create_dataset`.
  - **TypeScript** (`common/common-ts/src/capture.ts`): `globalThis.Date.now`
    frozen to `() => 0` for the duration of the h5wasm write window via
    `try/finally` (h5wasm 0.10.1 does NOT expose `H5Pset_obj_track_times`
    at the WASM-symbol level; the global `Date.now` shim is the only viable
    userland path per Stage 0 Task 0.3(c) empirical verification).

### Verification

The contract is verified by the regression tests at:

- `tools/testkit/determinism/tests/test_harness.py` (3 tests; deterministic-
  stub PASS, nondeterministic-stub FAIL, two-run-dirs).
- `common/common-ts/src/determinism/__tests__/harness.test.ts` (5 tests;
  deterministic-stub PASS, nondeterministic-stub FAIL, two-run-dirs,
  loadCapture round-trip, diffCaptures first-mismatch).
- 3 R-D2 spot-checks across the refactored sites (V1 hello-physics, V2 LBM,
  V3 MPM): each refactored test FAILS as expected when a broken-determinism
  mock runner is injected, preserving the failure-mode-on-bug witness per
  charter § 9 R-D2 mitigation.

The per-sim fan-out is also gated at CI level: `.github/workflows/determinism.yml`
iterates over all 10 sims (per-package per § M.4 N1 import-path-collision
avoidance) and invokes `pytest tests/test_determinism.py -v`.

### Re-pin policy

No new external pins introduced at this sub-phase — only new internal module
surfaces. Future expansion of the harness (e.g., epsilon mode for cross-stack
sub-phases, distributional mode for chaotic-regime sims) follows the same
re-pin discipline per `docs/conventions/sub-phase-conventions.md` § H.4
applied to the public API surface; the contract semantics are pinned at
spec § 2.5 + the harness's `policy.md`.

## spec-Phase-2 sub-phase-reaction-diffusion-2d-stack-d — first per-sim cross-stack port (added 2026-05-23)

Per `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-<UTC>.md`.

### New workspace member

`packages/reaction-diffusion-2d-stack-d/` (sibling workspace member; D6
routing). Python-only Stack-D port of `reaction-diffusion-2d`; registered in
the root `pyproject.toml` `[tool.uv.workspace].members` at Stage 1b.

### Consumed surfaces (no new external pins)

No new external dependency pins introduced. The port consumes existing
workspace + external surfaces:

| Surface | Source | Use |
|---|---|---|
| `taichi>=1.7,<2.0` | Taichi-integration pin (added 2026-05-23 above) | Taichi-DSL Gray-Scott kernels (`@ti.kernel`); `arch="cpu"`, `cpu_max_num_threads=1` |
| `common_py.capture` (IC-2) | `common/common-py` | canonical-capture write/read |
| `common_py.determinism.set_taichi_deterministic` (IC-11) | `common/common-py` | deterministic Taichi init before kernel decoration |
| `tools/testkit/determinism` (IC-14) | testkit | gate-10 `run_twice_and_diff` content-equivalence |
| `tools/testkit/equivalence` | testkit | gate-14 `compare_captures` cross-stack diff |
| `tools/testkit/code_verification/mms` | testkit | gate-4 MMS observed-order verification |
| `numpy`, `h5py`, `hypothesis` | existing pins | IC, capture I/O, PBT |

### Tolerance table addition (at-budget; not a widening)

`tools/testkit/equivalence/tolerance.toml` gains an at-budget per-sim
override `[overrides.reaction-diffusion-2d] category = "reaction-diffusion"`
(resolution wiring; inherits `relative = 1e-4` from
`[defaults.reaction-diffusion]` = the `[budgets.reaction-diffusion.cross_stack]`
cap). `tolerance-budget.toml` is unchanged.

### Fresh-checkout sync

```bash
(cd packages/reaction-diffusion-2d-stack-d && uv sync --extra dev)
```

### Re-pin policy

No external pins introduced. Subsequent Stack-D / Stack-E cross-stack port
sub-phases consume the same `taichi` pin + per-sim tolerance-override pattern
per `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` § 7
(IC-15 candidate methodology template).

## spec-Phase-2 sub-phase-audit-chain-correctness — verify_evidence LFS-content-OID semantics (IC-16) (added 2026-05-23)

Focused-infrastructure sub-phase; no new external pins. Records the new
interface contract established by the `verify_evidence` LFS-content-OID fix.

### New interface contract

| IC | Surface | Established | Load-bearing for |
|---|---|---|---|
| **IC-16 — `verify_evidence` LFS-content-OID semantics** | For an `evidence_hashes` entry whose path is LFS-tracked, `verify_evidence` compares the claimed sha256 against the **content OID** parsed from the git-lfs pointer stub's `oid sha256:` line (offline; no smudge/network/auth); non-LFS paths compare the git-blob sha256 unchanged; mismatch→error preserved. | `sub-phase-audit-chain-correctness` Stage 1a (`tools/integrity/integrity/common/repo.py` `lfs_pointer_oid()` + the OID-aware comparison in `tools/integrity/integrity/scripts/verify_evidence.py`). Cited at spec `docs/architecture.md` § 7.5 + Appendix G.7 (Stage 1b, D3-positive). | Every subsequent sub-phase's gate-5 evidence check that cites LFS-tracked `.h5` evidence (every cross-stack port ships 2 capture `.h5`). |

### Cross-references

- **IC-2 (capture I/O)** — the `captures/**/*.h5` artifacts whose hashing IC-16
  corrects are IC-2 outputs (not modified; the hashing of them is).
- **Conventions doc § B.1** — content-OID-load-bearing posture (the recorded
  value IS the content OID; IC-16 makes `verify_evidence` honor it for LFS paths).
- **Conventions doc § B.6** — LFS-pointer-vs-content drift modes: **Mode 2
  RESOLVED** by IC-16 (Stage 1a); **Mode 3** (phantom-sha / trailing-newline)
  added Stage 1b. Subsequent landings need no § B.6 Option-3 annotation for
  LFS-tracked evidence.

### Verification

`verify_evidence` on the RD-2D Stack-D landing audit: pre-fix **29 pass / 2 fail**
(the two `captures/**/*.h5` pointer-vs-content shape-mismatches) → post-fix
**31 pass / 0 fail**. Test suite `tools/integrity/tests/test_verify_evidence.py`
10/10 GREEN (5 new LFS tests + 5 existing).

### Re-pin policy

No external pins introduced. IC-16 is consumed by reference (no per-sub-phase
re-declaration) by every subsequent sub-phase's gate-5 evidence verification.
