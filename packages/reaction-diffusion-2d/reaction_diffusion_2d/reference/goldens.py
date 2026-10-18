"""Committed goldens for the extra models, and the analytic Turing check's prediction.

Writes, under packages/reaction-diffusion-2d/web/public/goldens/ (served with the
v2 page, which re-runs them on the visitor's GPU from the Prove drawer):

* ``<model>-64sq-seed42-step<N>.bin`` — the f64 reference state after N steps,
  little-endian, (u, v) interleaved per cell, row-major (the GPU state layout);
* ``<model>-64sq-seed42-step<N>.json`` — its sidecar: parameters, the canonical
  initial condition, sha256 of the initial and final f64 bytes, max |field|;
* ``turing-brusselator-256sq.json`` — the analytic Turing check: the canonical
  dish, the measurement protocol, and the dispersion-relation prediction.

Horizons were chosen by measurement (an f32 dtype-preserving NumPy proxy of the
live kernel against this f64 reference, 2026-10-17): long enough that each model
is well into its nonlinear dynamics, short of where pattern selection from noise
amplifies f32 round-off (Brusselator past ~1000 steps on 64 x 64).

    uv run --no-sync python -m reaction_diffusion_2d.reference.goldens --write
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

import numpy as np

from . import models as M

OUT_DIR: Final[Path] = Path(__file__).resolve().parents[2] / "web" / "public" / "goldens"
GENERATED_BY: Final[str] = (
    "packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/goldens.py"
)
REFERENCE: Final[str] = "packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/models.py"


@dataclass(frozen=True)
class GoldenSpec:
    model: M.ModelId
    n: int
    steps: int
    ic: M.CanonicalIC

    @property
    def descriptor(self) -> str:
        return f"{self.model}-{self.n}sq-seed{self.ic.seed}-step{self.steps}"


GOLDENS: Final[tuple[GoldenSpec, ...]] = (
    GoldenSpec("brusselator", 64, 512, M.CanonicalIC(seed=42, amp=2.0**-6, bump=8)),
    GoldenSpec("gierer-meinhardt", 64, 1024, M.CanonicalIC(seed=42, amp=2.0**-6, bump=8)),
    GoldenSpec("fitzhugh-nagumo", 64, 768, M.CanonicalIC(seed=42, amp=2.0**-6, bump=8)),
)


def run_golden(g: GoldenSpec) -> tuple[np.ndarray, np.ndarray]:
    s = M.setup(g.model, g.n, g.n)
    ic = M.canonical_field(g.model, g.n, g.n, g.ic)
    if not np.array_equal(ic.astype(np.float32).astype(np.float64), ic):
        raise AssertionError(
            f"{g.descriptor}: initial condition is not exactly representable in f32"
        )
    return ic, M.step(ic, s, g.steps)


def golden_sidecar(g: GoldenSpec, ic: np.ndarray, final: np.ndarray) -> dict[str, object]:
    s = M.setup(g.model, g.n, g.n)
    return {
        "_generated_by": GENERATED_BY,
        "reference": REFERENCE,
        "descriptor": g.descriptor,
        "model": g.model,
        "grid": [g.n, g.n],
        "periodic": True,
        "steps": g.steps,
        "params": {"F": s.F, "k": s.k, "c": s.c, "Du": s.Du, "Dv": s.Dv, "dx": s.dx, "dt": s.dt},
        "ic": {**asdict(g.ic), "rest": list(M.REST[g.model]), "seed_state": list(M.SEED[g.model])},
        "layout": "f64 little-endian, (u, v) interleaved per cell, row-major",
        "ic_sha256": M.sha256_f64(ic),
        "final_sha256": M.sha256_f64(final),
        "max_abs": {
            "u": float(np.abs(final[..., 0]).max()),
            "v": float(np.abs(final[..., 1]).max()),
        },
    }


# --------------------------------------------------------- Turing check --


@dataclass(frozen=True)
class TuringSpec:
    """The analytic Turing check's canonical dish and measurement protocol."""

    model: M.ModelId
    n: int
    ic: M.CanonicalIC
    t1: int
    t2: int
    #: half-width (bins) of the quadratic fit around the growth-rate maximum
    fit_half: int
    #: lowest ring considered (the instrument's own floor)
    r_min: int


TURING: Final[TuringSpec] = TuringSpec(
    model="brusselator",
    n=256,
    # 12 bits of 2^-7 noise: granularity 2^-19, coarser than the f32 ulp of
    # u* = 4.5 (2^-21), so the start is exact in f32. Smaller noise is not
    # resolvable by the f32 solver: at 2^-13 each step's change to the
    # perturbation is about one ulp of u, rounding swamps the linear dynamics,
    # and the measured peak scattered by up to 9% (measured on RADV and
    # reproduced by an f32 NumPy proxy). 2^-7 stays linear (max deviation
    # ~0.2% of u*) over the window below.
    ic=M.CanonicalIC(seed=1, amp=2.0**-7, bump=0, bits=12),
    t1=160,
    t2=800,
    fit_half=3,
    r_min=4,
)


def hann_ring_spectrum(field: np.ndarray, channel: int) -> np.ndarray:
    """The Learn instrument (spectrum.wgsl) in f64.

    Hann window, 2D FFT, mean power per round(|k|) ring.
    """
    n = field.shape[0]
    x = (np.arange(n) + 0.5) / n
    w = 0.5 - 0.5 * np.cos(2.0 * math.pi * x)
    p = np.abs(np.fft.fft2(field[..., channel] * np.outer(w, w))) ** 2
    f = np.fft.fftfreq(n) * n
    ring = np.rint(np.sqrt(f[None, :] ** 2 + f[:, None] ** 2)).astype(int)
    out = np.zeros(n // 2)
    for r in range(n // 2):
        sel = ring == r
        out[r] = p[sel].mean() if sel.any() else 0.0
    return out


def growth_peak(
    p1: np.ndarray, p2: np.ndarray, steps: int, dt: float, r_min: int, half: int
) -> tuple[float, np.ndarray]:
    """Measured growth rate per ring and its quadratic-fit peak.

    sigma(r) = ln(P2/P1) / (2 steps dt).
    """
    r = np.arange(len(p1), dtype=np.float64)
    with np.errstate(divide="ignore", invalid="ignore"):
        sig = np.log(p2 / p1) / (2.0 * steps * dt)
    sig[:r_min] = -np.inf
    i = int(np.argmax(sig))
    lo, hi = max(i - half, r_min), min(i + half + 1, len(sig))
    c = np.polyfit(r[lo:hi] - r[i], sig[lo:hi], 2)
    return float(r[i] - c[1] / (2.0 * c[0])), sig


def turing_prediction(t: TuringSpec = TURING) -> dict[str, float]:
    s = M.setup(t.model, t.n, t.n)
    if t.model != "brusselator":
        raise NotImplementedError(t.model)
    J = M.brusselator_jacobian(s.F, s.k)
    q2, sig_c = M.fastest_growing_continuum(J, s.Du, s.Dv)
    r_d, sig_d = M.fastest_growing_discrete(J, s.Du, s.Dv, s.dx, s.dt, t.n)
    cf = M.brusselator_closed_forms(s.F, s.Du, s.Dv)
    return {
        "r_star": r_d,
        "sigma_star": sig_d,
        "r_star_continuum": M.wavenumber_to_ring(math.sqrt(q2), s.dx, t.n),
        "q_star_continuum": math.sqrt(q2),
        "sigma_star_continuum": sig_c,
        "r_c_onset": M.wavenumber_to_ring(math.sqrt(cf["q_c2"]), s.dx, t.n),
        "B_c": cf["B_c"],
        "B_H": cf["B_H"],
        "q_c": math.sqrt(cf["q_c2"]),
    }


def turing_measure_f64(t: TuringSpec = TURING, seed: int | None = None) -> dict[str, float]:
    """Run the check's protocol on the f64 reference (the method's own error, no GPU)."""
    s = M.setup(t.model, t.n, t.n)
    ic = M.CanonicalIC(
        seed=t.ic.seed if seed is None else seed, amp=t.ic.amp, bump=t.ic.bump, bits=t.ic.bits
    )
    a = M.canonical_field(t.model, t.n, t.n, ic)
    a = M.step(a, s, t.t1)
    p1 = hann_ring_spectrum(a, M_SHOW[t.model])
    a = M.step(a, s, t.t2 - t.t1)
    p2 = hann_ring_spectrum(a, M_SHOW[t.model])
    r, _ = growth_peak(p1, p2, t.t2 - t.t1, s.dt, t.r_min, t.fit_half)
    pred = turing_prediction(t)
    return {"r_measured": r, "rel_err": (r - pred["r_star"]) / pred["r_star"]}


#: the field each model draws (and the instruments read): models.ts `show`
M_SHOW: Final[dict[str, int]] = {"brusselator": 0, "gierer-meinhardt": 0, "fitzhugh-nagumo": 0}


def turing_sidecar(seeds: int) -> dict[str, object]:
    s = M.setup(TURING.model, TURING.n, TURING.n)
    runs = [turing_measure_f64(TURING, seed) for seed in range(1, seeds + 1)]
    return {
        "_generated_by": GENERATED_BY,
        "reference": REFERENCE,
        "model": TURING.model,
        "grid": [TURING.n, TURING.n],
        "periodic": True,
        "params": {"F": s.F, "k": s.k, "c": s.c, "Du": s.Du, "Dv": s.Dv, "dx": s.dx, "dt": s.dt},
        "ic": {**asdict(TURING.ic), "rest": list(M.REST[TURING.model])},
        "protocol": {
            "channel": M_SHOW[TURING.model],
            "t1": TURING.t1,
            "t2": TURING.t2,
            "window": TURING.n,
            "fit_half": TURING.fit_half,
            "r_min": TURING.r_min,
            "observable": "sigma(r) = ln(P(r, t2) / P(r, t1)) / (2 (t2 - t1) dt) from the "
            "Hann-windowed ring-averaged power spectrum; quadratic fit over +/- fit_half "
            "rings around its maximum",
        },
        "prediction": turing_prediction(TURING),
        "reference_runs": {
            "seeds": list(range(1, seeds + 1)),
            "rel_err": [run["rel_err"] for run in runs],
            "worst_abs_rel_err": max(abs(run["rel_err"]) for run in runs),
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--write", action="store_true", help="write the goldens into web/public/goldens/"
    )
    ap.add_argument("--turing-seeds", type=int, default=8)
    a = ap.parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for g in GOLDENS:
        ic, final = run_golden(g)
        side = golden_sidecar(g, ic, final)
        print(g.descriptor, side["final_sha256"], side["max_abs"])
        if a.write:
            (OUT_DIR / f"{g.descriptor}.bin").write_bytes(
                np.ascontiguousarray(final, dtype="<f8").tobytes()
            )
            (OUT_DIR / f"{g.descriptor}.json").write_text(json.dumps(side, indent=2) + "\n")
    t = turing_sidecar(a.turing_seeds)
    print("turing", json.dumps(t["prediction"]), t["reference_runs"])
    if a.write:
        (OUT_DIR / f"turing-{TURING.model}-{TURING.n}sq.json").write_text(
            json.dumps(t, indent=2) + "\n"
        )


if __name__ == "__main__":
    main()
