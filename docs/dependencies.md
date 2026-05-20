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
