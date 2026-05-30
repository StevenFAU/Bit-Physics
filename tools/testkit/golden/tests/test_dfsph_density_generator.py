"""Mutation-constraining tests for the DFSPH density-evolution GENERATOR.

B-2a (back-test re-audit `findings-ledger.md`): the `sph_water_dfsph_generator`
mutation target mutates this generator's source but its prior runner exercised
the *sim reference* (`dfsph.density`) against the frozen golden table — so
mutating the generator broke no test (0/127 killed). These tests exercise the
GENERATOR itself (`_f`, `_fprime`, `compute_canonical`) against INDEPENDENT
closed-form anchors of the 3D Monaghan cubic-spline kernel (Monaghan 1992,
Eq. 2.6) — derived from the kernel definition, not from running the generator —
plus a cross-check that the producer reproduces the committed table. A mutation
to any kernel constant, branch boundary, or sign now diverges from these anchors.

Mirrors the producer-test pattern already used for the cubic-spline generator in
`tools/testkit/golden/tests/test_generator.py`.
"""

from __future__ import annotations

import json
import math
from itertools import pairwise
from pathlib import Path

import pytest

from golden.generator import dfsph_density_evolution as gen

_TABLE_PATH = (
    Path(__file__).resolve().parent.parent
    / "tables"
    / "particle-fluids"
    / "dfsph-density-evolution.json"
)

# Independent closed-form anchors of the 3D Monaghan cubic spline f(q):
#   f(q) = 1 - 3/2 q^2 + 3/4 q^3        (0 <= q < 1)
#        = 1/4 (2 - q)^3                (1 <= q < 2)
#        = 0                            (q >= 2)
# Values below are computed by hand from that definition, NOT from gen._f.
_F_ANCHORS = {
    0.0: 1.0,  # peak
    0.5: 1.0 - 1.5 * 0.25 + 0.75 * 0.125,  # 0.71875
    1.0: 0.25,  # branch join: lim from below 1-1.5+0.75 = 0.25
    1.5: 0.25 * (0.5**3),  # 0.03125
    2.0: 0.0,  # compact-support boundary
    2.5: 0.0,  # outside support
}
# f'(q) = -3 q + 9/4 q^2   (0<=q<1);  = -3/4 (2-q)^2  (1<=q<2);  = 0  (q>=2)
_FPRIME_ANCHORS = {
    0.0: 0.0,  # zero-slope at peak
    0.5: -0.9375,  # first branch: -1.5 + 0.5625
    1.0: -0.75,  # branch join: -3+2.25 = -0.75
    1.5: -0.1875,  # SECOND branch, s=0.5: -0.75 * 0.25 (interior point, s != 1)
    2.0: 0.0,  # compact-support boundary
    2.5: 0.0,  # outside support
}


@pytest.mark.parametrize("q,expected", _F_ANCHORS.items())
def test_kernel_f_matches_independent_anchor(q: float, expected: float) -> None:
    """gen._f(q) reproduces the closed-form Monaghan cubic-spline value."""
    assert gen._f(q) == pytest.approx(expected, abs=1e-15)


@pytest.mark.parametrize("q,expected", _FPRIME_ANCHORS.items())
def test_kernel_fprime_matches_independent_anchor(q: float, expected: float) -> None:
    """gen._fprime(q) reproduces the closed-form derivative value."""
    assert gen._fprime(q) == pytest.approx(expected, abs=1e-15)


def test_kernel_f_is_continuous_at_branch_joins() -> None:
    """f is C0 across the q=1 and q=2 branch boundaries (catches a moved bound)."""
    eps = 1e-9
    assert gen._f(1.0 - eps) == pytest.approx(gen._f(1.0), abs=1e-7)
    assert gen._f(2.0 - eps) == pytest.approx(gen._f(2.0), abs=1e-7)


def test_kernel_f_is_monotone_nonincreasing_on_support() -> None:
    """f decreases from the q=0 peak to 0 (catches a sign/constant flip)."""
    qs = [i * 0.1 for i in range(0, 21)]  # 0.0 .. 2.0
    vals = [gen._f(q) for q in qs]
    assert vals[0] == pytest.approx(1.0, abs=1e-15)
    for a, b in pairwise(vals):
        assert b <= a + 1e-15
    assert vals[-1] == pytest.approx(0.0, abs=1e-15)


def test_kernel_fprime_is_nonpositive_on_support() -> None:
    """f' <= 0 on (0,2) — a monotone-decreasing kernel (catches a sign flip)."""
    for i in range(1, 20):
        q = i * 0.1
        assert gen._fprime(q) <= 1e-15


def test_compute_canonical_matches_independent_recomputation() -> None:
    """compute_canonical reproduces rho_0 / drho_dt_0 derived independently.

    sigma3 = 1/pi (3D normalization), h = 1, neighbor at q = 0.5, relative
    velocity (v0-v1)_x = -1, unit direction -1.
    """
    sigma3 = 1.0 / math.pi
    rho_0 = sigma3 * (_F_ANCHORS[0.0] + _F_ANCHORS[0.5])
    grad_w_x = sigma3 * _FPRIME_ANCHORS[0.5] * (-1.0)
    drho_dt_0 = 1.0 * (-1.0) * grad_w_x

    out = gen.compute_canonical()
    assert out["rho_0"] == pytest.approx(rho_0, abs=1e-15)
    assert out["drho_dt_0"] == pytest.approx(drho_dt_0, abs=1e-15)
    # sign / magnitude sanity: density positive, evolution negative (approaching)
    assert out["rho_0"] > 0.0
    assert out["drho_dt_0"] < 0.0


def test_generator_reproduces_committed_table() -> None:
    """The producer reproduces the committed golden table (verify() path).

    A mutation that changes compute_canonical's output diverges from the frozen
    table — the regenerate-and-compare check the prior runner never made.
    """
    with _TABLE_PATH.open(encoding="utf-8") as fh:
        table = json.load(fh)
    expected = table["test_points"][0]["expected"]
    out = gen.compute_canonical()
    assert out["rho_0"] == pytest.approx(expected["rho_0"], abs=1e-15)
    assert out["drho_dt_0"] == pytest.approx(expected["drho_dt_0"], abs=1e-15)
    # auxiliary kernel fields the table also pins
    sigma3 = 1.0 / math.pi
    assert sigma3 * gen._f(0.0) == pytest.approx(expected["kernel_W_at_0"], abs=1e-15)
    assert sigma3 * gen._f(0.5) == pytest.approx(expected["kernel_W_at_q_0p5"], abs=1e-15)
    assert gen._fprime(0.5) == pytest.approx(expected["kernel_fprime_at_q_0p5"], abs=1e-15)


def test_verify_passes_on_committed_table() -> None:
    """The generator's own --verify entrypoint returns OK against the table."""
    assert gen.verify(_TABLE_PATH) == 0


def test_verify_uses_correct_default_table_path() -> None:
    """verify() with no argument resolves the module TABLE_PATH and passes.

    Constrains the TABLE_PATH construction (parents[...] / dir segments): a
    mutated path fails to locate the table and verify() returns 1.
    """
    assert gen.verify() == 0
    assert gen.TABLE_PATH.exists()
    assert gen.TABLE_PATH == _TABLE_PATH


def test_verify_rejects_a_wrong_table(tmp_path: Path) -> None:
    """verify() returns 1 when a table value diverges beyond 1e-15.

    Constrains the failure-detection loop, the abs()>tol comparison, and the
    non-zero return — a mutated verifier that ignores divergence would wrongly
    return 0.
    """
    with _TABLE_PATH.open(encoding="utf-8") as fh:
        table = json.load(fh)
    table["test_points"][0]["expected"]["rho_0"] += 1.0  # gross divergence
    bad = tmp_path / "wrong-dfsph.json"
    with bad.open("w", encoding="utf-8") as fh:
        json.dump(table, fh)
    assert gen.verify(bad) == 1


def test_verify_failure_names_the_divergent_key(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """A failing verify() reports FAIL and names the divergent key on stderr.

    Constrains the failure-message construction and the FAIL print contract.
    """
    with _TABLE_PATH.open(encoding="utf-8") as fh:
        table = json.load(fh)
    table["test_points"][0]["expected"]["rho_0"] += 1.0
    bad = tmp_path / "wrong-dfsph.json"
    with bad.open("w", encoding="utf-8") as fh:
        json.dump(table, fh)
    gen.verify(bad)
    err = capsys.readouterr().err
    assert "FAIL" in err
    assert "rho_0" in err


def test_main_verify_flag_returns_zero_on_committed_table() -> None:
    """`--verify` dispatches to verify() against the default table → 0.

    Constrains the --verify flag name and its main() dispatch branch.
    """
    import sys

    argv = sys.argv
    sys.argv = ["dfsph_density_evolution.py", "--verify"]
    try:
        assert gen.main() == 0
    finally:
        sys.argv = argv


def test_verify_reports_missing_table(tmp_path: Path) -> None:
    """verify() returns 1 (not 0) when the table file is absent."""
    assert gen.verify(tmp_path / "does-not-exist.json") == 1


def test_main_print_emits_canonical_values(capsys: pytest.CaptureFixture[str]) -> None:
    """`--print` round-trips compute_canonical to stdout as JSON.

    Smoke-constrains main()'s argument dispatch and the --print branch.
    """
    import sys

    argv = sys.argv
    sys.argv = ["dfsph_density_evolution.py", "--print"]
    try:
        rc = gen.main()
    finally:
        sys.argv = argv
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out["rho_0"] == pytest.approx(gen.compute_canonical()["rho_0"], abs=1e-15)
    assert out["drho_dt_0"] == pytest.approx(gen.compute_canonical()["drho_dt_0"], abs=1e-15)
