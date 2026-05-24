"""W-2 determinism harness mechanism — sub-phase-common-warp-bootstrap.

The phase-2 plan §1.9.1 ``assert_deterministic_run`` surface + the public
``set_seed`` wrapper. This is the **W-2 mechanism** (the gate itself
fully completes at Stage 1c, which runs the testkit determinism harness
``run_twice_and_diff`` on the hello smoke simulator's capture). At Stage
1a the mechanism is verified directly against the Stage-0 Task-0.2
baseline sha256 ``24d44c7e…0746f314`` (see ``tests/test_harness.py``).
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable, Sequence

import numpy as np

from .determinism import set_seed

__all__ = ["assert_deterministic_run", "set_seed"]


def _digest(result: np.ndarray | Sequence[np.ndarray]) -> str:
    arrays = [result] if isinstance(result, np.ndarray) else list(result)
    h = hashlib.sha256()
    for arr in arrays:
        h.update(np.ascontiguousarray(arr).tobytes())
    return h.hexdigest()


def assert_deterministic_run(
    run_fn: Callable[..., np.ndarray | Sequence[np.ndarray]],
    *args: object,
    n_runs: int = 2,
) -> str:
    """Run ``run_fn(*args)`` ``n_runs`` times and assert bit-identity.

    Each invocation must return the state to hash as a NumPy array (or a
    sequence of arrays, hashed in declaration order). The sha256 over the
    concatenated raw bytes is computed per run; all ``n_runs`` digests
    must be identical. Returns the matched sha256 hex — the determinism
    witness (the value Stage 1c asserts equals the smoke sim's reference).

    Raises :class:`AssertionError` if any two runs diverge (the
    same-stack-same-hw contract is broken — do NOT relax; investigate per
    R-W1 / banned-flag discipline).
    """
    if n_runs < 2:
        raise ValueError(f"n_runs must be >= 2 to compare runs; got {n_runs}")
    digests = [_digest(run_fn(*args)) for _ in range(n_runs)]
    unique = sorted(set(digests))
    if len(unique) != 1:
        raise AssertionError(
            f"assert_deterministic_run: {n_runs} runs produced {len(unique)} distinct "
            f"sha256 digests {unique} — output is NOT bit-deterministic (violates the "
            f"D4 bit-exact-same-hw contract; check device=cpu + R-W1 atomic discipline)"
        )
    return unique[0]
