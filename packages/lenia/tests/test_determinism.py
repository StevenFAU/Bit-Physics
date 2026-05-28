"""Stage 1a RED — D-DET determinism MEASURE-twice-diff-zero test.

Per charter § 7.3 D-DET + spec-ref § 8: bit-exact same-stack-same-hw
via Taichi seed (no atomics in forward conv). Stage 1b lands the
``set_taichi_deterministic(arch="cpu")`` wiring + the real-space
Quad4 convolution; this test runs two `step()` calls with the same
seed + grid + steps and asserts bit-equal NumPy arrays.

Stage 1a — FAILS with ``NotImplementedError`` from ``LeniaSim.step``
shell. Stage 1b inverts to GREEN.
"""

from __future__ import annotations


def _load_sim_module() -> object:
    """Deferred import — module imports cleanly at Stage 1a (shells)."""
    import lenia  # type: ignore[attr-defined]

    return lenia


def test_determinism_two_runs_bit_equal() -> None:
    """D-DET MEASURE: two identical runs produce byte-equal arrays."""
    import numpy as np

    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=64, steps=10)

    sim_a = lenia.LeniaSim(config)
    for _ in range(config.steps):
        sim_a.step()
    field_a = sim_a.field()

    sim_b = lenia.LeniaSim(config)
    for _ in range(config.steps):
        sim_b.step()
    field_b = sim_b.field()

    np.testing.assert_array_equal(field_a, field_b)
