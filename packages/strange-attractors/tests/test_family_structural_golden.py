"""Code-verification tests for the family structural-invariants golden tables.

Loads the X-A expansion tables at
``tools/testkit/golden/tables/closed-form/{rossler,aizawa,sprott-a}-structural.json``
and asserts that the sim's NumPy reference implementations reproduce
every expected value within the table's tolerance block:

- fixed points (Rössler inner/outer, Aizawa on-axis cubic roots,
  Sprott-A empty equilibrium set);
- Jacobian eigenvalues via both the closed-form helpers and
  ``numpy.linalg.eigvals`` on the reference Jacobians;
- divergence values / probe points, the Aizawa origin field probe, and
  the Sprott-A parity residual at sampled points.

SymPy-side verification of the same tables lives in the generators at
``tools/testkit/golden/generator/{rossler,aizawa,sprott_a}_structural.py``.
"""

from __future__ import annotations

import ast
import json
from pathlib import Path

import numpy as np
import pytest

from strange_attractors.reference import aizawa, rossler, sprott

SYSTEMS = ("rossler", "aizawa", "sprott-a")

TABLES_DIR = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "closed-form"
)


def _load_table(system: str) -> dict[str, object]:
    with (TABLES_DIR / f"{system}-structural.json").open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


@pytest.fixture(scope="module")
def goldens() -> dict[str, dict[str, object]]:
    return {system: _load_table(system) for system in SYSTEMS}


def _expected(golden: dict[str, object], quantity: str) -> dict[str, object]:
    block = next(
        tp
        for tp in golden["test_points"]  # type: ignore[union-attr]
        if tp["inputs"]["quantity"] == quantity  # type: ignore[index]
    )
    return block["expected"]  # type: ignore[no-any-return]


def _atol(golden: dict[str, object]) -> float:
    return float(golden["tolerance"]["absolute"])  # type: ignore[index,call-overload]


@pytest.mark.parametrize("system", SYSTEMS)
def test_fixed_point_set(system: str, goldens: dict[str, dict[str, object]]) -> None:
    """Each system's reference reproduces its golden fixed-point set."""
    golden = goldens[system]
    atol = _atol(golden)
    if system == "rossler":
        expected = _expected(golden, "fixed_points")
        computed = rossler.fixed_points(a=0.2, b=0.2, c=5.7)
        for key in ("P_in", "P_out"):
            assert computed[key] == pytest.approx(expected[key], abs=atol)
    elif system == "aizawa":
        expected = _expected(golden, "axis_fixed_points")
        computed = aizawa.axis_fixed_points(a=0.95, c=0.6)
        assert computed == pytest.approx(expected["z_roots_ascending"], abs=atol)
    else:
        expected = _expected(golden, "equilibrium_count")
        assert sprott.equilibria() == []
        assert len(sprott.equilibria()) == expected["count"]


@pytest.mark.parametrize("system", SYSTEMS)
def test_divergence_probes(system: str, goldens: dict[str, dict[str, object]]) -> None:
    """Each system's divergence helper reproduces the golden probe values."""
    golden = goldens[system]
    atol = _atol(golden)
    if system == "rossler":
        expected = _expected(golden, "divergence")
        p_in = rossler.fixed_points(a=0.2, b=0.2, c=5.7)["P_in"]
        assert rossler.divergence(p_in, a=0.2, b=0.2, c=5.7) == pytest.approx(
            expected["at_inner_fixed_point"], abs=atol
        )
        assert rossler.divergence(
            [0.0, 0.0, 0.0], a=0.2, b=0.2, c=5.7
        ) == pytest.approx(expected["at_origin"], abs=atol)
    elif system == "aizawa":
        expected = _expected(golden, "divergence_and_origin_probe")
        assert aizawa.divergence(
            [0.0, 0.0, 0.0], a=0.95, b=0.7, e=0.25, f=0.1
        ) == pytest.approx(expected["divergence_at_origin"], abs=atol)
    else:
        expected = _expected(golden, "divergence")
        for point_key, want in expected["at_probe_points"].items():  # type: ignore[union-attr]
            point = list(ast.literal_eval(point_key))
            assert sprott.divergence(point) == pytest.approx(want, abs=atol)
            # Cross-check against the trace of the reference Jacobian.
            assert np.trace(sprott.jacobian(point)) == pytest.approx(want, abs=atol)


def test_rossler_inner_eigenvalues_via_numpy_eigvals(
    goldens: dict[str, dict[str, object]],
) -> None:
    """numpy.linalg.eigvals of J(P_in) reproduces the golden (re, im) pairs."""
    golden = goldens["rossler"]
    atol = _atol(golden)
    expected_pairs = sorted(
        tuple(pair)
        for pair in _expected(golden, "inner_fixed_point_jacobian_eigenvalues")[
            "eigenvalues_re_im_sorted"
        ]
    )
    p_in = rossler.fixed_points(a=0.2, b=0.2, c=5.7)["P_in"]
    eigs = np.linalg.eigvals(rossler.jacobian(p_in, a=0.2, b=0.2, c=5.7))
    computed_pairs = sorted((float(ev.real), float(ev.imag)) for ev in eigs)
    for got, want in zip(computed_pairs, expected_pairs, strict=True):
        assert got == pytest.approx(want, abs=atol)


def test_aizawa_axis_eigenvalues_closed_form_and_numpy(
    goldens: dict[str, dict[str, object]],
) -> None:
    """Both the closed-form helper and numpy eigvals match the golden per-root values."""
    golden = goldens["aizawa"]
    atol = _atol(golden)
    per_root = _expected(golden, "axis_jacobian_eigenvalues")["per_root"]
    roots = aizawa.axis_fixed_points(a=0.95, c=0.6)
    for key, want in per_root.items():  # type: ignore[union-attr]
        key_z = float(key.removeprefix("z="))
        z = min(roots, key=lambda r: abs(r - key_z))
        assert z == pytest.approx(key_z, abs=1e-9)

        # Route 1: closed-form helper.
        closed = aizawa.axis_jacobian_eigenvalues(z, a=0.95, b=0.7, d=3.5)
        # Route 2: numpy.linalg.eigvals on the full reference Jacobian.
        numeric = np.linalg.eigvals(
            aizawa.jacobian([0.0, 0.0, z], a=0.95, b=0.7, d=3.5, e=0.25, f=0.1)
        )
        for eigs in (closed, numeric):
            spiral = sorted(
                (ev for ev in eigs if abs(ev.imag) > 1e-9), key=lambda ev: ev.imag
            )
            real = [ev for ev in eigs if abs(ev.imag) <= 1e-9]
            assert len(spiral) == 2 and len(real) == 1
            for ev in spiral:
                assert ev.real == pytest.approx(want["spiral_pair_re"], abs=atol)
                assert abs(ev.imag) == pytest.approx(
                    want["spiral_pair_im_abs"], abs=atol
                )
            assert real[0].real == pytest.approx(want["real_eigenvalue"], abs=atol)


def test_aizawa_origin_field_probe(goldens: dict[str, dict[str, object]]) -> None:
    """The Aizawa field at the origin is (0, 0, c) per the golden table."""
    golden = goldens["aizawa"]
    expected = _expected(golden, "divergence_and_origin_probe")["field_at_origin"]
    computed = aizawa.aizawa_field(
        np.zeros(3), a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1
    )
    assert list(computed) == pytest.approx(expected, abs=_atol(golden))


def test_sprott_a_parity_residual_zero(goldens: dict[str, dict[str, object]]) -> None:
    """f(P s) - P f(s) is exactly zero at sampled points (P = diag(-1,-1,1))."""
    golden = goldens["sprott-a"]
    want = _expected(golden, "parity_symmetry")["residual"]
    rng = np.random.default_rng(42)
    samples = [np.zeros(3), np.array([1.0, 2.0, 3.0]), np.array([-4.0, 1.0, -2.5])]
    samples.extend(rng.uniform(-8.0, 8.0, size=3) for _ in range(8))
    for state in samples:
        residual = sprott.sprott_a_field(
            sprott.parity_transform(state)
        ) - sprott.parity_transform(sprott.sprott_a_field(state))
        assert float(np.max(np.abs(residual))) == want == 0.0
