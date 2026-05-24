"""Warp determinism harness — sub-phase-common-warp-bootstrap.

Non-shadowing subpackage name (``warp_harness`` not bare ``warp``) per
the sub-phase-numba-integration § 8 N2 lesson — a bare ``warp``
subpackage would shadow the upstream ``warp`` import at collection time
(sister precedent: ``tools/testkit/taichi_harness`` /
``tools/testkit/numba_harness``).

Scaffold placeholder (Stage 1a COMMIT 1). The W-2 mechanism surface
(``set_warp_deterministic`` / ``get_seed`` / ``deterministic_context`` /
``set_seed`` / ``assert_deterministic_run``) is wired in COMMIT 2.
"""

from __future__ import annotations
