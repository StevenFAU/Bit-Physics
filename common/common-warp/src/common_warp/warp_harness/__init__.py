"""Warp determinism harness — sub-phase-common-warp-bootstrap.

Non-shadowing subpackage name (``warp_harness`` not bare ``warp``) per
the sub-phase-numba-integration § 8 N2 lesson — a bare ``warp``
subpackage would shadow the upstream ``warp`` import at collection time
(sister precedent: ``tools/testkit/taichi_harness`` /
``tools/testkit/numba_harness``).

W-2 mechanism surface (the gate fully completes at Stage 1c via the
testkit ``run_twice_and_diff`` on the hello smoke simulator):

- :func:`~common_warp.warp_harness.determinism.set_warp_deterministic`,
  :func:`~common_warp.warp_harness.determinism.get_seed`,
  :func:`~common_warp.warp_harness.determinism.deterministic_context`
- :func:`~common_warp.warp_harness.harness.set_seed`,
  :func:`~common_warp.warp_harness.harness.assert_deterministic_run`

**§1.9.1 socket reconciliation (S1b-3 / Stage-1c Task 1c.1).** The
public symbol *names* (re-exported at the ``common_warp`` top level) were
correct since Stage 1a; Stage 1c reconciles their *signatures* to the
phase-2 plan §1.9.1 verbatim — ``deterministic_context()`` is no-arg and
``assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)`` — so the
Stack-E ports code against §1.9.1 exactly. See the per-module docstrings.
"""

from __future__ import annotations

from .determinism import (
    deterministic_context,
    get_seed,
    set_warp_deterministic,
)
from .harness import assert_deterministic_run, set_seed

__all__ = [
    "assert_deterministic_run",
    "deterministic_context",
    "get_seed",
    "set_seed",
    "set_warp_deterministic",
]
