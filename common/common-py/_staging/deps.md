# common-py — staged dependency entries (Phase 1 Stage 1)

Staged for Stage 3 consolidation into `docs/dependencies.md`. Format
matches the per-stack section pattern used by Phase 0.

## common-py dependencies (Phase 1)

### Runtime

| Name | Version | Rationale (spec § 9.2) | Provenance |
|---|---|---|---|
| `bit-physics-testkit` | workspace (= 0.0.0) | Reuses Phase 0's canonical `capture` (HDF5 manifest + payload) and `determinism` packages so common-py never re-implements that surface. | Listed in `common/common-py/pyproject.toml` `[project] dependencies`; `[tool.uv.sources]` resolves it as a workspace member. (FACT) |
| `h5py` | `>= 3.10` | Required transitively by the testkit `capture` module; surfaced here so consumers installing only common-py still get the right floor. | `common/common-py/pyproject.toml` `[project] dependencies` (FACT) |
| `numpy` | `>= 2.0` | Capture payload tensors; IC-4 plumbing; smoke sim. | `common/common-py/pyproject.toml` (FACT) |
| `watchfiles` | `>= 0.21` | Hot-reload (`common_py.hotreload.watch_and_reexec`) per spec § 4.4. | `common/common-py/pyproject.toml` (FACT) |

### Optional (`bit-physics-common-py[taichi]`)

| Name | Version | Rationale | Provenance |
|---|---|---|---|
| `taichi` | `>= 1.7` | Stack D runtime; consumed by `set_taichi_deterministic` and by Stack D sims (Phase 1 Stage 2 boostraps `mpm-multimaterial`). Kept optional so Stack B/C users do not download the CUDA/Vulkan binaries. | `common/common-py/pyproject.toml` `[project.optional-dependencies.taichi]` (FACT) |

### Optional (`bit-physics-common-py[plotting]`)

| Name | Version | Rationale | Provenance |
|---|---|---|---|
| `matplotlib` | `>= 3.8` | `common_py.plotting` helpers; lazy-imported so headless consumers never load it. | `common/common-py/pyproject.toml` `[project.optional-dependencies.plotting]` (FACT) |

### Dev (`bit-physics-common-py[dev]`)

| Name | Version | Rationale | Provenance |
|---|---|---|---|
| `mypy` | `>= 1.10` | Strict type-checking mirrors Phase 0 testkit. | `pyproject.toml` `[project.optional-dependencies.dev]` (FACT) |
| `pytest` | `>= 8.0` | Test runner. | (FACT) |
| `pytest-cov` | `>= 5.0` | Coverage. | (FACT) |
| `ruff` | `>= 0.5` | Lint + format. | (FACT) |

## Notes for Stage 3 consolidation

- Stage 3 appends these tables to `docs/dependencies.md`'s
  per-stack section; the staging file should then be deleted per
  the Stage 3 procedure.
- No floor changes vs Phase 0 inheritance — `bit-physics-testkit`
  already pins `h5py >= 3.10`, `numpy >= 2.0`. common-py's pins
  match.
- No new license obligations beyond Phase 0; Taichi (Apache-2.0)
  and matplotlib (PSF-based) are both compatible with the MIT
  project licence (`LICENSE` at repo root).
