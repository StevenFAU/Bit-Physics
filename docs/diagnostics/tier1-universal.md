# Tier 1 — Universal diagnostics

Stack-agnostic, sim-agnostic. Operates entirely on Layer-0 captures.

## Modules

### `capture_io`

Thin layer over the testkit capture format with one extra
responsibility: **schema-version enforcement**. Every Tier 1 module
that walks a capture's steps calls `enforce_schema_version` first.

```python
from diagnostics.tier1 import (
    SUPPORTED_SCHEMA_MAJOR,
    enforce_schema_version,
    iter_step_arrays,
    iter_steps,
)
```

Rejects payloads where `schema_version.major > SUPPORTED_SCHEMA_MAJOR`.
See `docs/diagnostics/overview.md#schema-version-policy`.

### `health` — `check_health(capture) -> HealthReport`

Scans every floating-point state array in every captured step for NaN
and Inf. `HealthReport`:

```python
@dataclass(frozen=True)
class HealthReport:
    ok: bool                       # True iff nan_count == 0 and inf_count == 0
    nan_count: int
    inf_count: int
    first_offending_step: int | None
    first_offending_field: str | None
```

CLI convention (phase-0-plan § 3.3.6): `ok=True → exit 0`, `ok=False → exit 1`.

### `performance` — `check_performance(capture) -> PerformanceReport`

Reads `run.wall_clock_seconds`, `run.step_count`, `run.capture_interval`
from the manifest, plus optional metadata keys `gpu_dispatch_count` and
`memory_high_water_bytes`. Computes `seconds_per_step`.

Stacks that don't emit GPU dispatch counts or memory HWM leave the
fields as `None`; the report surfaces whatever the stack supplied.

### `determinism` — `check_determinism(runner, seed=42) -> DeterminismVerdict`

One-line composition of `determinism.run_twice_and_diff`.
No re-implementation. Same `SimRunner` protocol as the testkit's
harness.

### `reports` — `DiagnosticReport`

Aggregate envelope with `to_dict()` + `write_json(path)`. Used by Tier 3
sim shims to bundle multiple per-tier reports into one JSON artifact.

## Failure modes

| Module | What it catches |
|---|---|
| `health` | NaN/Inf in any state field (Category 6 — phantom-success guard). |
| `performance` | (Reporting only; no pass/fail in Phase 0.) |
| `determinism` | Inherits the testkit's bit-exact diff verdict. |
| `capture_io` | Schema-version drift (Category 3). |
