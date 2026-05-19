# Cross-stack equivalence harness

Field-by-field diff (spec § 2.6) of two captures against a per-category
tolerance table. The harness lives at
`tools/testkit/equivalence/harness.py` and exports the public surface
pinned in `docs/phases/phase-0-plan.md` § 3.3.3:
`EquivalenceVerdict`, `compare_captures()`, `load_tolerance_table()`.

## Tolerance table

`tools/testkit/equivalence/tolerance.toml` ships the spec § 2.6 default
tolerance table (`closed_form`, `reaction-diffusion`, `sph`, `mpm`,
`smoke`, `lbm`). The file is schema-validated by
`tolerance-schema.json`. Per-sim overrides may tighten or loosen the
defaults; overrides must remain within
`tools/testkit/equivalence/tolerance-budget.toml`'s caps. Block-5
INTEGRITY's Cat-X check enforces the cap; the harness itself does not.

## How it works

1. Read the LEFT manifest's `sim.name` + `sim.category`; require that the
   RIGHT manifest agrees (mismatch → `within_tolerance=False`).
2. Resolve the effective `{relative, absolute}` from the tolerance table
   (per-sim override if present, otherwise per-category default).
3. Diff every state field at every step. For each field, compute
   `max_abs_err` and `max_rel_err`. The field passes iff
   `max_abs_err <= absolute + relative * max(|right_field|)`.
4. The verdict is `within_tolerance=True` iff every field at every step
   passes.

## Tests

`tools/testkit/equivalence/tests/test_harness.py` ships three stub
stacks evaluating a quadratic on a 1D grid. Stacks A and B evaluate the
SAME polynomial through different floating-point orderings (round-off
~1e-16); stack `wrong` evaluates a polynomial with an extra `+1e-2*x`
term. Tests assert: A vs B is within tolerance; A vs wrong fails; the
tolerance table validates against its schema; a malformed table is
rejected.
