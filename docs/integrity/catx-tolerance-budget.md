# Cat-X — Tolerance-budget enforcement

Spec § 2.6. **HARD_FAIL.**

## What it checks (Phase 0 scope)

`catx.tolerance-budget`: every `[overrides.<sim>]` entry in
`tools/testkit/equivalence/tolerance.toml` MUST stay within the
corresponding cap in `tools/testkit/equivalence/tolerance-budget.toml`.
The check runs whenever either file changes (workflow trigger in
`.github/workflows/tolerance-budget-check.yml`).

## Override semantics

An override entry looks like:

```toml
[overrides.rd-2d]
category = "reaction-diffusion"
relative = 5e-4    # required if loosening from the category default
absolute = 0.0
```

The check verifies:

- `category` is a string that matches a `[budgets.<category>.cross_stack]`
  table in `tolerance-budget.toml`.
- `relative` (if present) ≤ `budgets.<category>.cross_stack.relative`.
- `absolute` (if present) ≤ `budgets.<category>.cross_stack.absolute`.

## Operator-approved amendments

Operators may raise a budget cap via an amendment audit at
`docs/_audits/tolerance-budget-amendments/<utc>-<topic>.md` with
canonical front-matter:

```yaml
---
date: 2026-...
author: operator
phase: 0
artifact: tolerance-budget-amendment
verdict: CONFIRMED
amendments:
  - { category: "reaction-diffusion", dimension: "cross_stack",
      relative: 1e-3, absolute: 0.0 }
evidence_paths:
  - path/to/operator-signature.asc
head_sha: ...
---
```

Cat-X reads every CONFIRMED amendment audit and uses the *maximum* of
the original cap and the amendment value as the effective cap. Phase 0
ships zero amendments.

## Failure modes

| Condition | Severity |
|---|---|
| `tolerance.toml` or `tolerance-budget.toml` missing | HARD_FAIL |
| Override `category` references a missing budget | HARD_FAIL |
| Override `relative` or `absolute` exceeds the effective cap | HARD_FAIL |
| Override values non-numeric | HARD_FAIL |
