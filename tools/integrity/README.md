# Bit-Physics integrity toolkit

Layer 1 of the portfolio (spec § 3.2). Catches drift and fabrication at
write-time. Six categories, every check declares a failure mode
(`HARD_FAIL`, `SOFT_WARN`, or `AUDIT_LOG`).

Per-category docs at [`../../docs/integrity/`](../../docs/integrity/).

## CLI

```bash
# All checks across the repo:
uv run python -m integrity --all

# Single category:
uv run python -m integrity --cat 1
uv run python -m integrity --cat tolerance-budget

# Pre-commit usage (Cat 4 only, on staged files):
uv run python -m integrity --cat 4 --staged-only

# Advisory mode (no exit-1 on SOFT_WARN; still returns findings):
uv run python -m integrity --all --mode advisory
```

## Layout

```
tools/integrity/
├── pyproject.toml
├── integrity/
│   ├── __main__.py            CLI entry point
│   ├── runner.py              Orchestrates checks; aggregates findings
│   ├── common/                Shared types + repo helpers + suppressions
│   ├── cat1_citations/
│   ├── cat2_contracts/
│   ├── cat3_numerical/
│   │   └── evaluators/        Per-algorithm shims (cubic_spline.py, ...)
│   ├── cat4_draft_time/
│   ├── cat5_provenance/
│   ├── catx_tolerance_budget/
│   └── scripts/               verify_evidence, replay_prior_phase, audit_prose_freshness
└── tests/
    ├── fixtures/
    │   ├── known_good/
    │   └── adversarial/
    └── test_*.py
```

## Suppression annotation

Inline `# integrity-allow: <check>; <reason>; <tracking-id>` per
spec § 3.2. Every suppression is itself auditable.
