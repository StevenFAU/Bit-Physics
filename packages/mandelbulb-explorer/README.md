# mandelbulb-explorer (package)

Phase 1 Stage 2 — TDD bootstrap. Sim implementation deferred to a per-sim
implementation phase (Phase 2+).

See [`docs/sim-specs/closed-form/mandelbulb-explorer/`](../../docs/sim-specs/closed-form/mandelbulb-explorer/)
for the full reference spec.

## Run the failing test suite (Phase 1 contract)

```bash
uv run pytest packages/mandelbulb-explorer/tests/ -v
```

## What is committed at Phase 1

| Path | Contents |
|---|---|
| `mandelbulb_explorer/__init__.py` | Empty surface placeholder. |
| `tests/` | pytest test files for Phase 2+ public API. |
