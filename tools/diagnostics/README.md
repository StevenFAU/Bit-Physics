# Bit-Physics diagnostic toolchain

Layer 2 of the portfolio (spec § 3.3). Runtime inspection facilities
that consume the testkit's capture format + determinism harness and
add health/performance/data-structure-specific checks.

Per-tier docs at [`../../docs/diagnostics/`](../../docs/diagnostics/).

## Tiers

- **Tier 1 — Universal.** Stack-agnostic, sim-agnostic. Capture I/O,
  NaN/Inf health, wall-clock performance, determinism (extends
  `bit_physics_testkit.determinism.run_twice_and_diff`).
- **Tier 2 — Data-structure-specific.** Four substacks; Phase 0 ships
  `scalar_field` (monotone bounds, spectral content, conservation).
  `particle`, `vector_field`, `closed_form` are reserved for Phase 1+.
- **Tier 3 — Per-sim.** Thin shims composing Tier 1 + Tier 2 primitives.
  Each sim has its own Tier 3 module under `diagnostics/tier3/<sim>/`.

## Layout

```
tools/diagnostics/
├── pyproject.toml
├── diagnostics/
│   ├── tier1/
│   │   ├── capture_io.py     Schema-version policy + step iteration
│   │   ├── health.py         NaN / Inf scan
│   │   ├── performance.py    Wall-clock + dispatch counts + memory HWM
│   │   ├── determinism.py    Composes Block 3's harness
│   │   ├── reports.py        Shared report types
│   │   └── tests/
│   └── tier2/
│       ├── scalar_field/
│       │   ├── monotone_bounds.py
│       │   ├── spectral_content.py
│       │   ├── conservation.py
│       │   └── tests/
│       ├── particle/         (Phase 1+)
│       ├── vector_field/     (Phase 1+)
│       └── closed_form/      (Phase 1+)
└── diagnostics/tier3/        (per-sim shims; Phase 1+)
```

## Schema-version policy

Per `docs/diagnostics/overview.md`. Diagnostic modules reject unknown
forward-incompatible capture-format versions to prevent
phantom-success risk (silently accepting a future major would mean
diagnostics run against a payload they don't actually understand).
