"""Rayleigh/Parseval energy gate — machine-exact for arbitrary input (§ 4.1)."""

import numpy as np
import pytest

from signal_workbench.reference import parseval_residual

CEILING = 1e-13
SEEDS = (0, 1, 7, 42)


@pytest.mark.parametrize("seed", SEEDS)
@pytest.mark.parametrize("n", (256, 1024, 4096))
def test_parseval_machine_exact_random(seed: int, n: int) -> None:
    rng = np.random.default_rng(seed)
    res = parseval_residual(rng.standard_normal(n))
    assert res <= CEILING, f"Parseval residual {res:.3e}"


def test_parseval_on_canonical_scenes() -> None:
    from signal_workbench.sim import run_canonical

    res = run_canonical()
    assert parseval_residual(res.x_fm) <= CEILING
    assert parseval_residual(res.x_leak) <= CEILING
