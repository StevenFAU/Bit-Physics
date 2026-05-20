# common-py

Python-side common module for Bit-Physics Stack D sims. Phase 1
Stage 1 scaffold per charter
[`docs/phases/phase-1-plan.md`](../phases/phase-1-plan.md) § 2.1
(IC-2 + IC-4 + § 7.1 deliverables D-H).

## Module layout

| Module | Surface | IC | Status |
|---|---|---|---|
| `common_py.capture` | `Manifest`, `SimMeta`/`StackMeta`/`ConfigMeta`/`RunMeta`/`PayloadMeta`/`DeterminismMeta`, `StepData`, `Reader`, `Writer` | IC-2 (charter § 3.2) | FACT — exercised by `tests/test_capture_roundtrip.py` (3 tests) and the smoke sim (2 tests) |
| `common_py.determinism` | `Config`, `add_args`, `from_args`, `set_taichi_deterministic` | IC-4 (charter § 3.4) | FACT — exercised by `tests/test_determinism.py` (5 tests) |
| `common_py.alembic` | `ExportOptions`, `export_particles_to_alembic`, `AlembicExportError` | — | FACT — stub surface; raises `AlembicExportError` on call (test enforces) |
| `common_py.vdb` | `ExportOptions`, `export_volume_to_vdb`, `VdbExportError` | — | FACT — stub surface; same pattern as alembic |
| `common_py.plotting` | `plot_field_1d`, `plot_field_2d` | — | FACT — lazy-imports matplotlib; skipped under matplotlib-less CI but exercised when installed |
| `common_py.ggui` | `KEYS_TRAPPED_BY_GGUI`, `FKeyDispatcher` | — | FACT — exercised by `tests/test_module_surfaces.py` |
| `common_py.hotreload` | `watch_and_reexec` | — | FACT — surface exists; full behaviour requires a child process and `watchfiles` (deferred to integration test in implementation phases) |

## IC-2 — capture I/O

Round-trips a capture file (HDF5 payload + JSON manifest) per spec
§ 2.7. Implementation delegates to Phase 0's testkit `capture`
flat-module so the on-disk format is shared with common-ts and the
forthcoming common-cpp.

```python
from common_py.capture import (
    ConfigMeta, DeterminismMeta, Manifest, PayloadMeta,
    Reader, RunMeta, SimMeta, StackMeta, StepData, Writer,
)
```

INFERENCE: The charter spelt the IC-2 dataclasses independently;
common-py uses Phase 0's existing `capture.CaptureManifest` schema
underneath to avoid silent drift. The IC-2 dataclasses are thin
wrappers that re-export Phase 0's nested dict-shaped schema with
typed fields.

Round-trip discipline: `Writer` buffers steps in memory, `finalize`
writes them via `tools/testkit/capture.write_capture`. `Reader`
loads via `load_capture` and exposes positional `read_step(idx)`
indexing into the captured-step list.

## IC-4 — determinism Config

```python
from common_py.determinism import Config, add_args, from_args, set_taichi_deterministic

parser = argparse.ArgumentParser()
add_args(parser)
cfg = from_args(parser.parse_args())
set_taichi_deterministic(cfg)
```

`set_taichi_deterministic` is a no-op when Taichi is not installed
(IC-4 surface stays callable without pulling in Taichi). When
enabled and Taichi is importable it calls `ti.init(arch=ti.cpu,
deterministic_mode=True, random_seed=cfg.seed)`.

## Surface stubs (§ 4.4 limitations from spec)

- **`alembic.export_particles_to_alembic`** — raises
  `AlembicExportError`. Implementation deferred (recommend:
  mpm-multimaterial).
- **`vdb.export_volume_to_vdb`** — raises `VdbExportError`.
  Implementation deferred (recommend: eulerian-smoke).

## Plotting

`plot_field_1d` / `plot_field_2d` — thin matplotlib wrappers used by
the smoke sim and debugging notebooks. Matplotlib is imported lazily
so headless consumers do not pay the cost.

## GGUI F-key workaround

Taichi GGUI's overlay traps F1–F12 before the user callback. The
documented mitigation is *poll-then-dispatch*: read the window's raw
key state every frame and run handlers yourself.

```python
from common_py.ggui import FKeyDispatcher
dispatcher = FKeyDispatcher()
dispatcher.bind("F5", capture_screenshot)
# each frame:
dispatcher.poll(window)
```

`FKeyDispatcher` tracks rising edges so each handler fires once per
press, not once per frame held.

INFERENCE: This is the documented Taichi GGUI behaviour for the F-key
slots. Spec § 4.4 codifies the limitation; the dispatcher is the
ergonomic counterpart.

## Hot-reload

`watch_and_reexec(paths)` — blocks on `watchfiles.watch` and
`os.execvp`'s the current Python interpreter when any watched file
changes. Per spec § 4.4 this is the supported pattern for Taichi
sims since the runtime cannot be re-initialized in-process.

## Smoke sim

`common/common-py/smoke/advection_1d.py` — 1D advection on a periodic
64-cell grid, 100 steps, capture interval 10. Used to exercise the
Writer / Reader round-trip and the IC-4 plumbing end-to-end.

Run:

```bash
uv run --no-sync python -m smoke.advection_1d --deterministic --seed 42 --out-dir captures/common-py-smoke
```

INFERENCE — cross-stack equivalence test deferred. The charter's
`F` deliverable for common-py asks for an equivalence test "vs
common-ts + common-cpp smoke captures." Neither common-ts nor
common-cpp ship a `1D advection` smoke capture at the Stage 1
landing time (common-ts was scoped to the RD-2D path in Phase 0;
common-cpp's smoke sim ships alongside common-py in this stage).
The equivalence test ships in the matching common-cpp commit when
both stacks' smoke captures are available; documented in the
Stage 1 checkpoint log as a SHIFTED bank.

## Dependencies (Phase 1 Stage 1)

See [`common/common-py/_staging/deps.md`](../../common/common-py/_staging/deps.md)
for the full dependency table (Stage 3 will consolidate into
`docs/dependencies.md`).

## Stage 1 commit-time test outcome (FACT)

```
======================== 15 passed, 3 skipped in 0.24s =========================
```

3 skipped: matplotlib-dependent plot tests under matplotlib-less
.venv. All other tests pass.

## Out of scope this stage

- A full common-cpp ↔ common-py cross-stack equivalence harness
  (deferred per INFERENCE above).
- Real alembic / VDB output (stubs only).
- Taichi-dependent integration tests (skipped at runtime when Taichi
  not importable).
- Top-level workspace registration in root `pyproject.toml`
  (Convention A — Stage 3 owns).
