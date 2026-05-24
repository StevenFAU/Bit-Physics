"""W-2 determinism harness mechanism — sub-phase-common-warp-bootstrap.

The phase-2 plan §1.9.1 ``assert_deterministic_run`` surface + the public
``set_seed`` wrapper. This is the **W-2 mechanism** (the gate itself
fully completes at Stage 1c, which runs the testkit determinism harness
``run_twice_and_diff`` on the hello smoke simulator's capture). At Stage
1a the mechanism is verified directly against the Stage-0 Task-0.2
baseline sha256 ``24d44c7e…0746f314`` (see ``tests/test_harness.py``).

**§1.9.1 socket reconciliation (S1b-3 / Stage-1c Task 1c.1).** The
phase-2 plan §1.9.1 specifies ``assert_deterministic_run(sim_fn, *,
runs: int = 2, tolerance: float = 0.0)`` (verbatim, plan lines 982-998):
``sim_fn`` first-positional, ``runs`` + ``tolerance`` keyword-only;
``tolerance == 0.0`` is bit-exact, ``> 0.0`` admits epsilon-bounded
matches (the GPU posture per D4). Stage 1a landed
``assert_deterministic_run(run_fn, *args, n_runs=2)``. Stage 1c
reconciles the **signature** to §1.9.1 verbatim while **preserving the
determinism semantics**: the ``tolerance == 0.0`` path is byte-for-byte
the landed hash-comparison (so the W-2 baseline ``24d44c7e…0746f314``
reproduces unchanged), and the return value stays the sha256 witness (a
documented superset of §1.9.1's ``-> None``, mirroring ``runtime.init``'s
``-> str``). ``*args`` is dropped: §1.9.1's ``sim_fn`` is a zero-arg
callable.
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable, Sequence

import numpy as np

from .determinism import set_seed

__all__ = ["assert_deterministic_run", "set_seed"]

_ArrayResult = np.ndarray | Sequence[np.ndarray]


def _as_arrays(result: _ArrayResult) -> list[np.ndarray]:
    return [result] if isinstance(result, np.ndarray) else list(result)


def _digest(result: _ArrayResult) -> str:
    h = hashlib.sha256()
    for arr in _as_arrays(result):
        h.update(np.ascontiguousarray(arr).tobytes())
    return h.hexdigest()


def _max_abs_diff(ref: _ArrayResult, other: _ArrayResult) -> float:
    """Max absolute element-wise difference between two array results."""
    ref_arrays = _as_arrays(ref)
    other_arrays = _as_arrays(other)
    if len(ref_arrays) != len(other_arrays):
        raise AssertionError(
            f"assert_deterministic_run: runs returned differing array counts "
            f"({len(ref_arrays)} vs {len(other_arrays)})"
        )
    worst = 0.0
    for a, b in zip(ref_arrays, other_arrays, strict=True):
        if a.shape != b.shape:
            raise AssertionError(
                f"assert_deterministic_run: runs returned differing shapes ({a.shape} vs {b.shape})"
            )
        if a.size:
            worst = max(worst, float(np.abs(a.astype(np.float64) - b.astype(np.float64)).max()))
    return worst


def assert_deterministic_run(
    sim_fn: Callable[[], _ArrayResult],
    *,
    runs: int = 2,
    tolerance: float = 0.0,
) -> str:
    """Run ``sim_fn()`` ``runs`` times and assert determinism (§1.9.1).

    ``sim_fn`` is a zero-arg callable returning the state to compare as a
    NumPy array (or a sequence of arrays, compared in declaration order).

    - ``tolerance == 0.0`` (default; bit-exact): the sha256 over the
      concatenated raw bytes is computed per run; all ``runs`` digests must
      be identical (the D4 ``bit-exact-same-hw`` CPU contract).
    - ``tolerance > 0.0`` (epsilon-bounded; the D4 GPU posture): each run is
      compared element-wise against the first; the max absolute difference
      must not exceed ``tolerance``.

    Returns the sha256 hex of the first run — the determinism witness (the
    value the W-2 baseline test asserts equals the Stage-0 reference). For
    ``tolerance > 0.0`` the runs may differ in their low bits, so the digest
    is that of the reference (first) run.

    Raises :class:`AssertionError` if runs diverge beyond ``tolerance`` (the
    same-stack-same-hw contract is broken — do NOT relax; investigate per
    R-W1 / banned-flag discipline). Raises :class:`ValueError` for
    ``runs < 2`` or ``tolerance < 0.0``.
    """
    if runs < 2:
        raise ValueError(f"runs must be >= 2 to compare runs; got {runs}")
    if tolerance < 0.0:
        raise ValueError(f"tolerance must be >= 0.0; got {tolerance}")

    results = [sim_fn() for _ in range(runs)]

    if tolerance == 0.0:
        digests = [_digest(r) for r in results]
        unique = sorted(set(digests))
        if len(unique) != 1:
            raise AssertionError(
                f"assert_deterministic_run: {runs} runs produced {len(unique)} distinct "
                f"sha256 digests {unique} — output is NOT bit-deterministic (violates the "
                f"D4 bit-exact-same-hw contract; check device=cpu + R-W1 atomic discipline)"
            )
        return unique[0]

    ref = results[0]
    for k, other in enumerate(results[1:], start=1):
        worst = _max_abs_diff(ref, other)
        if worst > tolerance:
            raise AssertionError(
                f"assert_deterministic_run: run {k} diverges from run 0 by "
                f"max-abs-diff {worst:g} > tolerance {tolerance:g} — not "
                f"epsilon-bounded-deterministic (D4 GPU posture)"
            )
    return _digest(ref)
