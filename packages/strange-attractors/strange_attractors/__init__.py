"""strange-attractors — Phase 1 Stage 2 TDD bootstrap.

Implementation is deferred to Phase 2+ per spec § 2.5 and charter
§ 7.4. This package's public surface is **intentionally empty** in
Phase 1 so the failing-tests suite at `tests/` exercises the Phase 2+
contract via ``ModuleNotFoundError`` on the deferred submodules
(``strange_attractors.reference``, ``strange_attractors.sim``,
``strange_attractors.invariants``).

See ``docs/sim-specs/closed-form/strange-attractors/spec-ref.md`` § 5
for the Phase 2+ contract.
"""

from __future__ import annotations

__all__: list[str] = []
