# Testkit overview

The testkit is the portfolio's Layer 0 (spec § 3.1). It defines what
"correct" looks like for every stack, category, and variant. Every Layer N
(N ≥ 1) component imports against the testkit's public APIs.

## Components and ownership

| Component | Public path | Built by | Spec § |
|---|---|---|---|
| **Capture format** (manifest + HDF5 payload + reader/writer/diff) | `tools/testkit/capture/` + `tools/testkit/schemas/` | Phase 0 Block 1 | § 2.7 |
| **Method of Manufactured Solutions** | `tools/testkit/code_verification/mms/` | Phase 0 Block 2 | § 2.2 |
| **Determinism harness** | `tools/testkit/determinism/` | Phase 0 Block 3 | § 2.5 |
| **Cross-stack equivalence harness** | `tools/testkit/equivalence/` | Phase 0 Block 3 | § 2.6 |
| **Property-based testing harness** | `tools/testkit/property/` | Phase 0 Block 3 | § 2.14 |
| **Golden-value verification** | `tools/testkit/golden/` | Phase 0 Block 4 | § 2.4 |
| **Pre-implementation probes** | `tools/testkit/probes/` | Phase 0 Block 1 (template) + per-sim (Phase 0 Block 8 et seq.) | § 2.9 |
| **Solution verification (GCI)** | `tools/testkit/solution_verification/` | Deferred to Phase 1+ | § 2.3 |
| **Mutation testing config** | `tools/testkit/mutation/` | Phase 0 Block 5 | § 2.13 |
| **Failing-tests evidence ledger** | `tools/testkit/failing-tests-evidence/` | Phase 0 Block 1 (scaffold) + Phase 0 Block 8 (first entry) | § 1.3 step 4 |
| **Tolerance budget** | `tools/testkit/equivalence/tolerance-budget.toml` | Phase 0 Block 1 (stub) | § 2.6 |
| **Render similarity** | `tools/testkit/render_similarity/` | Phase 4 WU-C | § 3.1 |

## Public APIs

See `docs/phases/phase-0-plan.md` § 3.3 for the canonical surface of every
testkit module. Phase 0 Block 1 ships `bit_physics_testkit.capture`; later
blocks ship the rest.

## Documentation index

- [`capture-format.md`](capture-format.md) — capture manifest + HDF5 payload (Block 1).
- [`references.md`](references.md) — vendoring discipline (Block 1).
- `mms.md` — Method of Manufactured Solutions (Block 2, pending).
- `determinism.md` — determinism harness (Block 3, pending).
- `equivalence.md` — cross-stack equivalence (Block 3, pending).
- `property.md` — property-based testing (Block 3, pending).
- `golden-values.md` — golden-value tables (Block 4, pending).
