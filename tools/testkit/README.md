# bit-physics-testkit

The Bit-Physics testkit defines what "correct" looks like across every stack,
every simulation category, and every variant. It is the foundation of the
portfolio's verification discipline (Layer 0 in
[`docs/architecture.md`](../../docs/architecture.md) § 3.1).

## Status

| Component | Block | Status |
|---|---|---|
| `capture/` — capture format reader/writer/diff/manifest | Phase 0 Block 1 | shipped |
| `schemas/` — JSON Schemas for capture / golden / reference manifest | Phase 0 Block 1 | shipped |
| `code_verification/mms/` — Method of Manufactured Solutions pipeline | Phase 0 Block 2 | pending |
| `determinism/` — capture-twice-and-diff harness | Phase 0 Block 3 | pending |
| `equivalence/` — cross-stack equivalence harness | Phase 0 Block 3 | pending |
| `property/` — Hypothesis-based property testing harness | Phase 0 Block 3 | pending |
| `golden/` — golden-value verification | Phase 0 Block 4 | pending |
| `probes/` — pre-implementation probe template + reports | Phase 0 Block 1 (template) | template shipped |
| `solution_verification/` — Richardson / GCI pipeline | Phase 1+ | deferred |
| `mutation/` — mutation testing for testkit/integrity | Phase 0 Block 5 | pending |
| `failing-tests-evidence/` — TDD verbatim-output ledger | Phase 0 Block 1 (scaffold) | scaffold shipped |

## API surfaces

Public APIs are pinned in
[`docs/phases/phase-0-plan.md`](../../docs/phases/phase-0-plan.md) § 3.3.

## Layout

```
tools/testkit/
├── pyproject.toml
├── README.md
├── schemas/                              # JSON Schemas (Block 1)
├── capture/                              # Capture format module (Block 1)
├── code_verification/mms/                # MMS pipeline (Block 2)
├── determinism/                          # Determinism harness (Block 3)
├── equivalence/                          # Cross-stack equivalence (Block 3)
├── property/                             # Property-based testing (Block 3)
├── golden/                               # Golden-value tables (Block 4)
├── probes/                               # Probe template + reports
├── solution_verification/                # Deferred to Phase 1+
├── failing-tests-evidence/               # TDD verbatim-output evidence
├── mutation/                             # Mutation testing (Block 5)
└── references -> ../../references        # Symlink to vendored references
```
