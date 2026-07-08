"""PBT invariant sweeps (§ 6.3) — parametrized seeds + Hypothesis cases."""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from signal_workbench.invariants import (
    biquad_stable_poles_in_unit_circle,
    coherent_tone_single_bin,
    fm_energy_identity,
    linearity_and_parseval_under_gain,
    parseval_energy_exact,
    window_dc_gain_is_coherent_gain,
)
from signal_workbench.windows import WINDOW_NAMES

SEEDS = (0, 1, 7)


@pytest.mark.parametrize("seed", SEEDS)
@pytest.mark.parametrize("n", (512, 4096))
def test_parseval(seed: int, n: int) -> None:
    passed, res = parseval_energy_exact(n, seed)
    assert passed, f"Parseval residual {res:.3e}"


@pytest.mark.parametrize("seed", SEEDS)
@pytest.mark.parametrize("k0", (7, 331, 1023))
def test_coherent_single_bin(seed: int, k0: int) -> None:
    passed, leak = coherent_tone_single_bin(4096, k0, seed)
    assert passed, f"leak {leak:.3e}"


@given(index=st.floats(min_value=0.01, max_value=12.0))
@settings(max_examples=40, deadline=None)
def test_fm_energy_identity(index: float) -> None:
    passed, res = fm_energy_identity(index)
    assert passed, f"identity residual {res:.3e} at I={index}"


@given(
    f0_frac=st.floats(min_value=1e-3, max_value=0.499),
    q=st.floats(min_value=0.05, max_value=200.0),
    gain_db=st.floats(min_value=-24.0, max_value=24.0),
)
@settings(max_examples=60, deadline=None)
def test_biquad_stability(f0_frac: float, q: float, gain_db: float) -> None:
    for kind in ("lpf", "peaking", "lowshelf"):
        passed, radius = biquad_stable_poles_in_unit_circle(kind, f0_frac, q, gain_db)
        assert passed, f"{kind} pole radius {radius} at f0={f0_frac} Q={q}"


@pytest.mark.parametrize("name", WINDOW_NAMES)
def test_window_dc_gain(name: str) -> None:
    passed, err = window_dc_gain_is_coherent_gain(name, 4096)
    assert passed, f"{name} CG err {err:.3e}"


@given(gain=st.floats(min_value=1e-3, max_value=1e3))
@settings(max_examples=40, deadline=None)
def test_linearity_under_gain(gain: float) -> None:
    passed, worst = linearity_and_parseval_under_gain(2048, 101, gain, 3)
    assert passed, f"linearity/Parseval-under-gain worst {worst:.3e}"
