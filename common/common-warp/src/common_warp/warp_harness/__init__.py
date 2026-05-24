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
