# &lt;Sim Name&gt; — Reference Spec

> Template per `docs/architecture.md` § 8.2 (13-section template). Section 13
> "Productization status" was added in spec v2.1.

## 1. Scope

What this sim simulates, its category, its non-goals.

## 2. Upstream and reference anchor

Vendored upstream(s), SHA(s), algebraic derivation pointer.

## 3. Algorithm

High-level description of the numerical method.

## 4. Algebraic form

Equations in LaTeX, with citations to upstream line numbers.

## 5. Implementation

File layout, dispatch order, data structures.

## 6. Verification posture

Code verification (MMS / golden), solution verification (GCI), model
validation, calculation validation — declared per Roy 2005. Declare which
of the sim's invariants are PBT-covered per `architecture.md` § 2.14.

## 7. Golden values / Manufactured solutions

Pointer to testkit fixtures.

## 8. Determinism

Declared posture; reference to `determinism.md`.

## 9. Equivalence

Cross-variant and cross-stack tolerance. Reference to
`tools/testkit/equivalence/tolerance.toml` overrides if any; overrides
exceeding the budget at `tools/testkit/equivalence/tolerance-budget.toml`
trigger Cat-X HARD_FAIL until a separate operator-approved tolerance-budget
amendment lands.

## 10. Diagnostics

Which Tier 1 / Tier 2 / Tier 3 modules apply.

## 11. Build and run

Build commands, run flags, capture output.

## 12. References

Full bibliography.

## 13. Productization status

Per-stream opt-out flags consumed by Phase 5. Each subkey is a boolean
defaulting to `true`. Set `false` to opt a sim out of a given
productization stream. Phase 5 sub-phases skip any sim with the
corresponding flag set to `false`.

```yaml
productization:
  web: true      # 5.1 — Stack B web demo
  binary: true   # 5.2 — Stack C binary release
  pypi: true     # 5.3 — Stack D/E PyPI package
  render: true   # 5.4 — offline render pass
  preprint: true # 5.5 — academic preprint extraction
```

The flag set is closed; Phase 5 reads only these five keys.
