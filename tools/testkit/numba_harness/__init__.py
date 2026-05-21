"""Numba determinism harness — verification surface for the project-wide
numba convention documented at ``docs/common/numba.md``.

Directory named ``numba_harness/`` rather than ``numba/`` to avoid
shadowing the upstream ``numba`` package import in this workspace
(test-collection-time ``from numba import njit`` resolves to the
upstream package, not to this subpackage).

Phase 1 sub-phase-numba-integration landing: this subpackage is the
single source-of-truth for the determinism contract on JIT-compiled
reference-implementation hot loops. The contract:

- ``@njit(fastmath=False, cache=True)`` produces output bit-identical
  to the pure-NumPy reference at the same input;
- Run-to-run determinism (same input → same output);
- Cold-vs-warm cache identity (compiled artifact's bit pattern is
  consumer-invariant).

If any of these break under a numba version upgrade, the regression
test at :mod:`tools.testkit.numba_harness.tests.test_numba_determinism`
catches it before the upgrade lands.
"""
