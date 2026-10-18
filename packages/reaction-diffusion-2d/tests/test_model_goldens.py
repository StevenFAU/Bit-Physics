"""The extra models' goldens and the analytic Turing check (rebuild-v2 M3).

docs/planning/rebuild-v2/01-reaction-diffusion.md § The proof: each new model
(Brusselator, Gierer-Meinhardt, FitzHugh-Nagumo) ships with a committed golden,
and the Prove drawer checks the live FFT's fastest-growing wavenumber against
the dispersion relation. These tests hold the Python side in CI:

* the committed goldens regenerate byte-for-byte from the f64 reference;
* every canonical starting field is exactly representable in f32 (the GPU and
  the reference start from the same numbers);
* the dispersion relation reproduces the Brusselator's closed forms
  (Turing onset B_c, critical wavenumber q_c, Hopf line B_H);
* the committed Turing prediction regenerates, and the measurement protocol
  run on the f64 reference lands inside the declared band
  (tools/testkit/equivalence/tolerance.toml
  [golden_tolerance.continuous-ca.reaction-diffusion-2d].turing_wavenumber_rel).
"""

from __future__ import annotations

import json
import math
import tomllib
from pathlib import Path

import numpy as np
import pytest

from reaction_diffusion_2d.reference import goldens as G
from reaction_diffusion_2d.reference import models as M

from .conftest import REPO_ROOT

GOLDEN_DIR = REPO_ROOT / "packages" / "reaction-diffusion-2d" / "web" / "public" / "goldens"
TOLERANCE = REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"


def _row() -> dict[str, float]:
    with TOLERANCE.open("rb") as fh:
        data = tomllib.load(fh)
    row: dict[str, float] = data["golden_tolerance"]["continuous-ca"]["reaction-diffusion-2d"]
    return row


def _sidecar(path: Path) -> dict[str, object]:
    out: dict[str, object] = json.loads(path.read_text())
    return out


@pytest.mark.parametrize("spec", G.GOLDENS, ids=lambda g: g.descriptor)
def test_golden_regenerates_byte_for_byte(spec: G.GoldenSpec) -> None:
    ic, final = G.run_golden(spec)
    committed = (GOLDEN_DIR / f"{spec.descriptor}.bin").read_bytes()
    assert np.ascontiguousarray(final, dtype="<f8").tobytes() == committed
    side = _sidecar(GOLDEN_DIR / f"{spec.descriptor}.json")
    assert side == json.loads(json.dumps(G.golden_sidecar(spec, ic, final)))


@pytest.mark.parametrize("spec", G.GOLDENS, ids=lambda g: g.descriptor)
def test_golden_starting_field_is_exact_in_f32(spec: G.GoldenSpec) -> None:
    ic = M.canonical_field(spec.model, spec.n, spec.n, spec.ic)
    assert np.array_equal(ic.astype(np.float32).astype(np.float64), ic)


@pytest.mark.parametrize("spec", G.GOLDENS, ids=lambda g: g.descriptor)
def test_golden_is_well_into_its_dynamics(spec: G.GoldenSpec) -> None:
    """A golden that barely moved from its start would pin nothing."""
    ic, final = G.run_golden(spec)
    moved = float(np.abs(final - ic).max())
    scale = float(np.abs(ic).max())
    assert moved > 0.1 * scale, f"{spec.descriptor} moved only {moved:.3g} of {scale:.3g}"
    assert np.isfinite(final).all()


def test_turing_check_starts_exact_in_f32() -> None:
    t = G.TURING
    ic = M.canonical_field(t.model, t.n, t.n, t.ic)
    assert np.array_equal(ic.astype(np.float32).astype(np.float64), ic)
    assert float(np.abs(ic[..., 0] - M.REST[t.model][0]).max()) > 0.0


def test_brusselator_closed_forms() -> None:
    """At B = B_c the dispersion maximum is zero, at q_c; q = 0 loses stability at B_H."""
    s = M.setup("brusselator", 8, 8)
    A, Du, Dv = s.F, s.Du, s.Dv
    cf = M.brusselator_closed_forms(A, Du, Dv)
    q2, sig = M.fastest_growing_continuum(M.brusselator_jacobian(A, cf["B_c"]), Du, Dv)
    assert abs(sig) < 1e-10
    assert q2 == pytest.approx(cf["q_c2"], rel=1e-5)
    assert M.growth_continuum(M.brusselator_jacobian(A, cf["B_H"] - 1e-9), Du, Dv, 0.0) < 0.0
    assert M.growth_continuum(M.brusselator_jacobian(A, cf["B_H"] + 1e-9), Du, Dv, 0.0) > 0.0
    # the scene sits between Turing onset and the Hopf line: patterns, no bulk oscillation
    assert cf["B_c"] < s.k < cf["B_H"]


def test_discrete_scheme_tends_to_the_continuum() -> None:
    """As dx, dt -> 0 the stencil + Euler growth rate approaches the continuum relation."""
    s = M.setup("brusselator", 8, 8)
    J = M.brusselator_jacobian(s.F, s.k)
    q2, sig_c = M.fastest_growing_continuum(J, s.Du, s.Dv)
    q = math.sqrt(q2)
    errs = []
    for scale in (1.0, 0.5, 0.25):
        dx, dt, n = s.dx * scale, s.dt * scale * scale, 4096
        r = M.wavenumber_to_ring(q, dx, n)
        errs.append(abs(M.ring_growth(J, s.Du, s.Dv, dx, dt, n, r) - sig_c))
    assert errs[0] > errs[1] > errs[2]
    assert errs[1] / errs[0] < 0.3  # second order in dx


def test_turing_prediction_regenerates() -> None:
    committed = _sidecar(GOLDEN_DIR / "turing-brusselator-256sq.json")
    pred = G.turing_prediction()
    for key, value in committed["prediction"].items():  # type: ignore[union-attr]
        assert pred[key] == pytest.approx(value, rel=1e-12), key


def test_turing_protocol_on_the_reference_is_inside_the_declared_band() -> None:
    """The measurement method itself (no GPU): f64 reference, the instrument's spectrum, the fit."""
    band = _row()["turing_wavenumber_rel"]
    run = G.turing_measure_f64()
    assert abs(run["rel_err"]) <= band
    # and it discriminates: the continuum and onset wavenumbers are outside the band
    pred = G.turing_prediction()
    assert abs(pred["r_star_continuum"] - pred["r_star"]) / pred["r_star"] > band
    assert abs(pred["r_c_onset"] - pred["r_star"]) / pred["r_star"] > band
