"""f64 NumPy reference — 2D TMz Yee FDTD with TF/SF + 1D Fresnel helper.

The 2D TMz update (`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md`
§ 3.2, normalized lossless units, Courant number ``S_c``):

    Hx[i,j] -= S_c * (Ez[i,j+1] - Ez[i,j])          # Hx at (i, j+1/2)
    Hy[i,j] += S_c * (Ez[i+1,j] - Ez[i,j])          # Hy at (i+1/2, j)
    Ez[i,j] += S_c * cb[i,j] * (Hy[i,j] - Hy[i-1,j] - Hx[i,j] + Hx[i,j-1])

with ``cb = 1/eps_r`` per cell. The plane wave enters through a TF/SF box
(§ 3.5) fed by a 1-D auxiliary Yee grid (uFDTD Ch. 3 § 3.10 / Ch. 8
§§ 8.5-8.6) so the injected incident field is grid-dispersion-consistent
for the grid-aligned incidence the gate uses.

NORMATIVE: ``run_tfsf`` on the ``GATE_SCENE`` is the behavior-frozen gate
prototype — this exact update order and slicing is the contract shared with
the WGSL and JS implementations. Do NOT "improve" it; the committed
checkpoint sha256 (pinned in ``fdtd_optics.sim``) witnesses every byte.

All steppers are dtype-preserving so the same code runs the f64 gates AND
the f32 WGSL-proxy tolerance measurement (the heat-equation/schrodinger
proxy pattern). Source time-signatures are always evaluated in f64 and cast
once on injection — the committed-f64-trig posture (§ 9).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Final

import numpy as np

OnStep = Callable[[int, np.ndarray, np.ndarray, np.ndarray, np.ndarray], None]

# ---------------------------------------------------------------------------
# Scenes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TfsfScene:
    """2D TMz TF/SF scattering scene (grid-aligned +x plane-wave incidence).

    The TF/SF box is the Ez-node rectangle ``[ia, ib] x [ja, jb]``
    (inclusive); the 1-D auxiliary grid has ``na`` cells with a hard Ricker
    source at its left end. The scatterer is a dielectric cylinder
    (``eps_cyl``; set 1.0 for the empty-box leakage control, § 6 G-selfconsist).
    """

    n: int = 128
    sc: float = 0.5
    ia: int = 24
    ib: int = 104
    ja: int = 24
    jb: int = 104
    na: int = 320
    t0: float = 80.0
    tau: float = 20.0
    cx: int = 80
    cy: int = 64
    r: int = 18
    eps_cyl: float = 2.25
    steps: int = 512
    checkpoints: tuple[int, ...] = (128, 256, 384, 512)


#: The web-gate scene (spec § 6.2): 128^2, S_c=0.5, eps_r=2.25 cylinder,
#: 512 steps, checkpoints every 128. Behavior-frozen.
GATE_SCENE: Final[TfsfScene] = TfsfScene()


# ---------------------------------------------------------------------------
# Source signature
# ---------------------------------------------------------------------------


def ricker(t: float, t0: float, tau: float) -> np.float64:
    """Ricker wavelet (2nd-derivative-of-Gaussian, no DC — spec § 3.5),
    always evaluated in f64 regardless of the run dtype."""
    a = ((t - t0) / tau) ** 2
    return (1.0 - 2.0 * a) * np.exp(-a)


# ---------------------------------------------------------------------------
# 2D TMz TF/SF gate solver (NORMATIVE)
# ---------------------------------------------------------------------------


def make_cb(scene: TfsfScene, dtype: type = np.float64) -> np.ndarray:
    """Per-cell Ez update coefficient cb = 1/eps_r: vacuum 1 everywhere,
    ``1/eps_cyl`` inside the cylinder (inclusive circle test, integer grid)."""
    cb = np.ones((scene.n, scene.n), dtype)
    ii, jj = np.meshgrid(np.arange(scene.n), np.arange(scene.n), indexing="ij")
    cb[(ii - scene.cx) ** 2 + (jj - scene.cy) ** 2 <= scene.r * scene.r] = (
        1.0 / scene.eps_cyl
    )
    return cb


def run_tfsf(
    scene: TfsfScene,
    dtype: type = np.float64,
    on_step: OnStep | None = None,
) -> dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]]:
    """Run the TF/SF scattering scene; return ``{step: (ez, hx, hy)}`` copies
    at the scene checkpoints.

    NORMATIVE update order per step (do not reorder — the contract):
    H-update, TF/SF H-correction, 1-D auxiliary grid advance + hard Ricker
    source, E-update, TF/SF E-correction. Unreferenced grid edges stay 0
    (PEC box — the gate window ends before reflections matter).

    ``on_step(step, ez, hx, hy, ezi)`` is invoked with LIVE arrays after each
    completed step (read-only observers such as the leakage monitor); it must
    not mutate them.
    """
    n, na = scene.n, scene.na
    ia, ib, ja, jb = scene.ia, scene.ib, scene.ja, scene.jb
    s = dtype(scene.sc)
    ez = np.zeros((n, n), dtype)
    hx = np.zeros((n, n), dtype)  # hx[i, j] ~ Hx at (i, j+1/2), valid j<n-1
    hy = np.zeros((n, n), dtype)  # hy[i, j] ~ Hy at (i+1/2, j), valid i<n-1
    ezi = np.zeros(na, dtype)  # 1-D auxiliary incident grid
    hyi = np.zeros(na, dtype)
    cb = make_cb(scene, dtype)
    caps: dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
    for t in range(scene.steps):
        hx[:, :-1] -= s * (ez[:, 1:] - ez[:, :-1])
        hy[:-1, :] += s * (ez[1:, :] - ez[:-1, :])
        hy[ia - 1, ja : jb + 1] -= s * ezi[ia]
        hy[ib, ja : jb + 1] += s * ezi[ib]
        hx[ia : ib + 1, ja - 1] += s * ezi[ia : ib + 1]
        hx[ia : ib + 1, jb] -= s * ezi[ia : ib + 1]
        hyi[:-1] += s * (ezi[1:] - ezi[:-1])
        ezi[1:-1] += s * (hyi[1:-1] - hyi[:-2])
        ezi[0] = dtype(ricker(t, scene.t0, scene.tau))
        ez[1:-1, 1:-1] += (
            s
            * cb[1:-1, 1:-1]
            * (hy[1:-1, 1:-1] - hy[:-2, 1:-1] - hx[1:-1, 1:-1] + hx[1:-1, :-2])
        )
        ez[ia, ja : jb + 1] -= s * hyi[ia - 1]
        ez[ib, ja : jb + 1] += s * hyi[ib]
        if t + 1 in scene.checkpoints:
            caps[t + 1] = (ez.copy(), hx.copy(), hy.copy())
        if on_step is not None:
            on_step(t + 1, ez, hx, hy, ezi)
    return caps


def scattered_field_mask(scene: TfsfScene, margin: int = 14) -> np.ndarray:
    """Boolean Ez mask for the scattered-field leakage monitor: everything
    outside the TF box, excluding a ``margin``-cell outer shell (the PEC-edge
    neighborhood where the incomplete edge H-updates live)."""
    n = scene.n
    ii, jj = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    inside_tf = (
        (ii >= scene.ia) & (ii <= scene.ib) & (jj >= scene.ja) & (jj <= scene.jb)
    )
    in_frame = (ii >= margin) & (ii < n - margin) & (jj >= margin) & (jj < n - margin)
    return in_frame & ~inside_tf


def tfsf_leakage(
    scene: TfsfScene, steps: int = 500, margin: int = 14
) -> tuple[float, float]:
    """Empty-box TF/SF leakage control (spec § 3.5 trap; test e).

    Runs the scene geometry with NO scatterer (``eps_cyl=1``) and returns
    ``(max_sf_abs_ez, peak_incident)`` — the running max |Ez| over the
    scattered-field mask vs the running max |Ez^inc| on the auxiliary grid.
    A consistent 1-D feed keeps the ratio at the f64 round-off floor.
    """
    empty = TfsfScene(
        n=scene.n,
        sc=scene.sc,
        ia=scene.ia,
        ib=scene.ib,
        ja=scene.ja,
        jb=scene.jb,
        na=scene.na,
        t0=scene.t0,
        tau=scene.tau,
        cx=scene.cx,
        cy=scene.cy,
        r=scene.r,
        eps_cyl=1.0,
        steps=steps,
        checkpoints=(steps,),
    )
    mask = scattered_field_mask(empty, margin)
    peak_sf = 0.0
    peak_inc = 0.0

    def watch(
        _step: int,
        ez: np.ndarray,
        _hx: np.ndarray,
        _hy: np.ndarray,
        ezi: np.ndarray,
    ) -> None:
        nonlocal peak_sf, peak_inc
        peak_sf = max(peak_sf, float(np.max(np.abs(ez[mask]))))
        peak_inc = max(peak_inc, float(np.max(np.abs(ezi))))

    run_tfsf(empty, np.float64, on_step=watch)
    return peak_sf, peak_inc


# ---------------------------------------------------------------------------
# 1D Yee helper — Fresnel normal-incidence gate (spec § 4 golden A)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Fresnel1dScene:
    """1D Ez/Hy Yee scene: vacuum up to ``iface``, then ``eps2``; soft Ricker
    at ``src``; Mur-1 ABC at both ends; time series recorded at ``probe``."""

    n: int = 6000
    sc: float = 0.5
    iface: int = 3000
    eps2: float = 2.25
    src: int = 100
    probe: int = 2000
    t0: float = 240.0
    tau: float = 60.0
    steps: int = 9000


def run_yee_1d(scene: Fresnel1dScene, with_interface: bool = True) -> np.ndarray:
    """Run the 1D Yee scene; return the Ez time series at the probe.

    Update order per step: capture boundary olds, H-update, E-update
    (interior), soft Ricker source, Mur-1 at both ends with
    ``k = (S_c - 1)/(S_c + 1)``:

        ez[0]  <- ez_old[1]  + k * (ez_new[1]  - ez_old[0])
        ez[-1] <- ez_old[-2] + k * (ez_new[-2] - ez_old[-1])
    """
    n = scene.n
    s = np.float64(scene.sc)
    k = (scene.sc - 1.0) / (scene.sc + 1.0)
    cb = np.ones(n, np.float64)
    if with_interface:
        cb[scene.iface :] = 1.0 / scene.eps2
    ez = np.zeros(n, np.float64)
    hy = np.zeros(n, np.float64)  # hy[i] ~ Hy at (i+1/2), valid i<n-1
    series = np.zeros(scene.steps, np.float64)
    for t in range(scene.steps):
        ez_l0, ez_l1 = ez[0], ez[1]
        ez_r0, ez_r1 = ez[-1], ez[-2]
        hy[:-1] += s * (ez[1:] - ez[:-1])
        ez[1:-1] += s * cb[1:-1] * (hy[1:-1] - hy[:-2])
        ez[scene.src] += ricker(t, scene.t0, scene.tau)
        ez[0] = ez_l1 + k * (ez[1] - ez_l0)
        ez[-1] = ez_r1 + k * (ez[-2] - ez_r0)
        series[t] = ez[scene.probe]
    return series


def fresnel_reflectance_1d(scene: Fresnel1dScene | None = None) -> float:
    """Measured normal-incidence reflectance by two-run subtraction
    (spec § 4 golden A; validated spike: 0.040167 vs exact 0.04, 0.42% off).

    R = sum(ref^2) / sum(inc^2) with ref = total - incident at the probe,
    the incident run being the same scene with eps=1 everywhere.
    """
    scene = scene or Fresnel1dScene()
    total = run_yee_1d(scene, with_interface=True)
    incident = run_yee_1d(scene, with_interface=False)
    reflected = total - incident
    return float(np.sum(reflected**2) / np.sum(incident**2))


__all__ = [
    "GATE_SCENE",
    "Fresnel1dScene",
    "TfsfScene",
    "fresnel_reflectance_1d",
    "make_cb",
    "ricker",
    "run_tfsf",
    "run_yee_1d",
    "scattered_field_mask",
    "tfsf_leakage",
]
