"""Golden-value verification toolkit (spec § 2.4).

Public surface per `docs/phases/phase-0-plan.md` § 3.3.4:

- `verify_against_table(table_path, evaluator) -> GoldenVerifierResult`
- `KernelEvaluator` (Protocol)
- `GoldenVerifierResult` (dataclass)

The canonical Python reference implementations live under
`reference_implementations/`. Block 5 (INTEGRITY) imports the cubic-spline
reference from `bit_physics_testkit.golden.reference_implementations.cubic_spline`;
there is exactly one Python implementation of the kernel in the repo.
"""

from __future__ import annotations

from .verifier import GoldenVerifierResult, KernelEvaluator, verify_against_table

__all__ = [
    "GoldenVerifierResult",
    "KernelEvaluator",
    "verify_against_table",
]
