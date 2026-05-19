# Cat 2 — Contract verification

Spec § 3.2. **HARD_FAIL.**

## What it checks (Phase 0 scope)

`cat2.python-exports`: every public symbol declared in a Python
package's `__init__.py` is bound to a real implementation:

- If `__all__` is present, every name in it MUST be imported into the
  module namespace (and reachable through a real submodule definition
  when imported via `from .submod import X`).
- If `__all__` is absent, the implicit public surface is the set of
  imported names from same-package modules; every such import MUST
  resolve.

## Out of scope at Phase 0

- Cross-package re-exports (`from third_party import X`).
- Conditional imports inside `try/except` or `if` blocks.
- Star imports.
- C++ headers (`cat2.cpp-headers`) — Phase 1+.
- TypeScript `.d.ts` surfaces (`cat2.ts-exports`) — Phase 1+.

## Failure modes

| Condition | Severity |
|---|---|
| `__all__` declares a name not bound in module | HARD_FAIL |
| `from .X import Y` where `X` is not a same-package module | HARD_FAIL |
| `from .X import Y` where module exists but `Y` is not defined in it | HARD_FAIL |
| Syntax error parsing `__init__.py` | HARD_FAIL |
