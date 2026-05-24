"""Determinism subsystem (Subsystem 3) — seed state + deterministic context.

NVIDIA Warp has **no global RNG seed**: randomness is per-thread, seeded
inside kernels via ``wp.rand_init(seed, offset)`` -> per-thread state ->
``wp.randf(state)`` (Convention C — upstream names cited verbatim). This
module owns the canonical project-level seed that kernels thread in, plus
the device-pinning that makes a run bit-deterministic.

**Determinism contract (D4).** On Warp's CPU backend, ``wp.launch``
executes serially over the launch dimension in a single thread, so
floating-point reductions (including ``wp.atomic_add``) are
order-deterministic and bit-identical run-to-run — the Warp analog of
Taichi ``cpu_max_num_threads=1`` / numba ``parallel=False``. Empirically
verified at sub-phase-common-warp-bootstrap Stage-0 Task 0.2: 6/6
bit-identical sha256 ``24d44c7e…0746f314`` (the W-2 baseline). GPU
backends are ``epsilon-bounded-cross-stack`` (spec § 4.4) — GPU atomic
update order is non-deterministic; GPU certification is per-sim-port scope.
``set_warp_deterministic`` therefore defaults ``device="cpu"``.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from .. import runtime

#: CPU is the only backend with a bit-exact-same-hw guarantee (D4).
BIT_DETERMINISTIC_DEVICE = "cpu"

_seed: int | None = None


def set_seed(seed: int) -> None:
    """Store the canonical project-level RNG seed.

    Kernels read this via :func:`get_seed` and thread it into
    ``wp.rand_init(seed, tid)``. Does not initialize Warp on its own;
    :func:`set_warp_deterministic` is the device-pinning entry point.
    """
    global _seed
    _seed = int(seed)


def get_seed() -> int:
    """Return the current canonical seed; raise if none has been set."""
    if _seed is None:
        raise RuntimeError(
            "common_warp seed is unset; call set_seed()/set_warp_deterministic() first"
        )
    return _seed


def set_warp_deterministic(seed: int, device: str = BIT_DETERMINISTIC_DEVICE) -> int:
    """Pin Warp to a deterministic configuration and set the seed.

    Initializes the Warp runtime on ``device`` (default ``"cpu"`` — the
    only ``bit-exact-same-hw`` backend per D4) and stores ``seed`` as the
    canonical project seed. Returns ``seed`` as the determinism marker.

    ``device != "cpu"`` is permitted but is only ``epsilon-bounded-cross-
    stack`` (spec § 4.4); GPU atomic ordering is non-deterministic.
    """
    runtime.init(device)
    set_seed(seed)
    return get_seed()


@contextmanager
def deterministic_context() -> Iterator[int]:
    """Context manager yielding a deterministic Warp environment (§1.9.1).

    **§1.9.1 socket reconciliation (S1b-3 / Stage-1c Task 1c.1).** The
    phase-2 plan §1.9.1 specifies a **no-arg** ``deterministic_context()``
    (verbatim, plan lines 918-920) — "ensures deterministic execution
    inside the block." Stage 1a landed ``deterministic_context(seed,
    device)``. Stage 1c reconciles to the no-arg form: the seed and device
    come from the prior :func:`set_seed` / :func:`set_warp_deterministic` /
    ``runtime.init`` calls (the "current init() settings"), not from
    arguments.

    Yields the active seed (raising if none has been set, per the
    :func:`get_seed` contract) and restores the prior seed on exit so the
    block does not leak seed state into surrounding code. The device is the
    one selected by the prior ``init()`` (D4: CPU is the bit-exact backend;
    the CPU determinism guarantee is structural — serial launch).
    """
    global _seed
    prior_seed = _seed
    try:
        yield get_seed()
    finally:
        _seed = prior_seed
