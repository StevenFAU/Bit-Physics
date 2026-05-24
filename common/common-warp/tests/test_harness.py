"""warp_harness W-2 mechanism tests — sub-phase-common-warp-bootstrap Stage 1a.

Kernel-defining module: deliberately reproduces the Stage-0 Task-0.2
verification kernel so ``assert_deterministic_run`` is checked against the
ratified empirical baseline sha256 ``24d44c7e…0746f314``. (Warp's
``@wp.kernel`` tolerates ``from __future__ import annotations`` — O-W6 —
but this module omits it, mirroring the tools/testkit/taichi_harness
defensive posture for kernel modules.)
"""

import numpy as np
import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import warp as wp

import common_warp

#: Ratified Stage-0 Task-0.2 CPU-determinism baseline (6/6 bit-identical).
STAGE0_BASELINE_SHA256 = "24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314"

_N = 4096


@wp.kernel
def _fill_seeded(seed: wp.int32, out: wp.array(dtype=wp.float64)):
    i = wp.tid()
    state = wp.rand_init(seed, i)
    out[i] = wp.float64(wp.randf(state))  # seeded RNG -> array write


@wp.kernel
def _transform_reduce(
    inp: wp.array(dtype=wp.float64),
    out: wp.array(dtype=wp.float64),
    acc: wp.array(dtype=wp.float64),
):
    i = wp.tid()
    # banked #7 pure-literal non-power-of-2 f64 constant (1.0/3.0) + 0.1
    v = inp[i] * (wp.float64(1.0) / wp.float64(3.0)) + wp.float64(0.1)
    out[i] = v  # array-to-array write
    wp.atomic_add(acc, 0, v)  # scalar reduction (atomic surface)


def _baseline_runner():
    """Reproduce the Stage-0 kernel; thread the harness seed via get_seed()."""
    seed = common_warp.get_seed()
    with wp.ScopedDevice("cpu"):
        seeded = wp.zeros(_N, dtype=wp.float64)
        wp.launch(_fill_seeded, dim=_N, inputs=[wp.int32(seed), seeded])
        out = wp.zeros(_N, dtype=wp.float64)
        acc = wp.zeros(1, dtype=wp.float64)
        wp.launch(_transform_reduce, dim=_N, inputs=[seeded, out, acc])
        wp.synchronize()
        return out.numpy().astype(np.float64), acc.numpy().astype(np.float64)


def test_set_warp_deterministic_returns_seed() -> None:
    assert common_warp.set_warp_deterministic(42) == 42
    assert common_warp.get_seed() == 42


def test_set_seed_get_seed_roundtrip() -> None:
    common_warp.set_seed(1234)
    assert common_warp.get_seed() == 1234


def test_deterministic_context_no_arg_yields_current_seed() -> None:
    """§1.9.1 no-arg ``deterministic_context()`` (S1b-3 / Task 1c.1).

    The context takes no args: the seed comes from the prior
    ``set_seed`` / ``set_warp_deterministic`` call. Mutating the seed
    inside the block does not leak out (restored on exit).
    """
    common_warp.set_warp_deterministic(7)
    assert common_warp.get_seed() == 7
    with common_warp.deterministic_context() as active:
        assert active == 7  # yields the current seed, not an argument
        common_warp.set_seed(99)
        assert common_warp.get_seed() == 99
    # prior seed restored on exit (no leak)
    assert common_warp.get_seed() == 7


def test_assert_deterministic_run_matches_stage0_baseline() -> None:
    """W-2 mechanism: assert_deterministic_run reproduces 24d44c7e…0746f314.

    THE LOAD-BEARING TEST for the §1.9.1 socket refactor (S1b-3 / Task
    1c.1): the baseline must reproduce under the refactored
    ``(sim_fn, *, runs=2, tolerance=0.0)`` signature. If this fails, the
    refactor changed determinism semantics not just the API surface
    (Hard Rule 2 — do NOT relax; investigate per R-W1).
    """
    common_warp.set_warp_deterministic(42, device="cpu")
    digest = common_warp.assert_deterministic_run(_baseline_runner, runs=6)
    assert digest == STAGE0_BASELINE_SHA256


def test_assert_deterministic_run_detects_nondeterminism() -> None:
    """A genuinely nondeterministic runner must trip the AssertionError."""
    rng = np.random.default_rng()

    def _nondet():
        return rng.standard_normal(8).astype(np.float64)

    with pytest.raises(AssertionError, match="NOT bit-deterministic"):
        common_warp.assert_deterministic_run(_nondet, runs=3)


def test_assert_deterministic_run_rejects_single_run() -> None:
    with pytest.raises(ValueError, match="runs must be >= 2"):
        common_warp.assert_deterministic_run(_baseline_runner, runs=1)


def test_assert_deterministic_run_tolerance_admits_epsilon() -> None:
    """``tolerance > 0.0`` admits epsilon-bounded matches (D4 GPU posture).

    A runner whose output drifts by < tolerance passes the epsilon-bounded
    check but FAILS the bit-exact (tolerance=0.0) check — the §1.9.1
    tolerance parameter is live, not inert.
    """
    base = np.linspace(0.0, 1.0, 16, dtype=np.float64)
    calls = {"n": 0}

    def _drifts():
        calls["n"] += 1
        # run 0 returns base; later runs drift by 1e-9 (< 1e-6, > 0)
        return base if calls["n"] == 1 else base + 1e-9

    assert common_warp.assert_deterministic_run(_drifts, runs=3, tolerance=1e-6)

    calls["n"] = 0
    with pytest.raises(AssertionError, match="NOT bit-deterministic"):
        common_warp.assert_deterministic_run(_drifts, runs=3, tolerance=0.0)
