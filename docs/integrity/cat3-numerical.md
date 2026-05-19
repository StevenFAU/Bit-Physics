# Cat 3 — Numerical correctness

Spec § 3.2. **SOFT_WARN** for numeric mismatches; **HARD_FAIL** for
missing independent-reference anchors per spec § 2.4.

## What it checks (Phase 0 scope)

`cat3.golden-values`: for every JSON file under
`tools/testkit/golden/tables/`:

1. Schema-validate against
   `tools/testkit/schemas/golden-v1.json`.
2. Count `independent_reference` anchors; HARD_FAIL if < 3.
3. Look up the algorithm name in
   `tools/integrity/integrity/cat3_numerical/evaluators/__init__.py:REGISTRY`.
4. Call
   `bit_physics_testkit.golden.verifier.verify_against_table(table, evaluator)`
   per phase-0-plan § 3.3.4 exactly.
5. Emit one SOFT_WARN per point that diverges from the registered
   evaluator's output.

## Evaluator registry

| Algorithm name | Evaluator import | Reference impl |
|---|---|---|
| `cubic-spline-kernel-3d-monaghan` | `integrity.cat3_numerical.evaluators.cubic_spline.evaluate` | `bit_physics_testkit.golden.reference_implementations.cubic_spline.evaluate` (the **only** Python impl in the repo) |

Tables whose algorithm isn't registered are emitted as AUDIT_LOG (not a
finding; just a note).

## Out of scope at Phase 0

- MMS-derived order-of-accuracy verification — stub hook; Phase 1+
  consumes Block 2's MMS pipeline at runtime.
- GCI / solution verification — Phase 1+.

## Anti-fragility (spec § 2.4)

Every golden table must carry ≥ 3 `independent_reference` anchors whose
expected values were derived **independent** of both the SymPy generator
and any vendored upstream implementation. A typo in either path is
caught by the other.
