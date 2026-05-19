"""Property-based testing harness (spec § 2.14).

Hypothesis-backed sweep that runs a `SimRunner` over randomly-generated
initial conditions and asserts a list of declared `Invariant`s on each
resulting capture. Shrunken counter-examples are surfaced through
`InvariantResult.counter_example`.

NOTE: this package's top-level name `property` shadows the Python builtin
`property` decorator when used as `from property import ...`. Inside this
package the builtin remains accessible via the qualified `builtins.property`.
The shadowing is intentional and matches phase-0-plan.md § 7.3 deliverable 3.
"""

from __future__ import annotations

from .harness import (
    Fail,
    Invariant,
    InvariantResult,
    Pass,
    PropertyVerdict,
    run_invariants,
)

__all__ = [
    "Fail",
    "Invariant",
    "InvariantResult",
    "Pass",
    "PropertyVerdict",
    "run_invariants",
]
