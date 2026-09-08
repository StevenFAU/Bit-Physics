"""Finite-volume shallow water and explicit conservative material exchange.

State columns: h,qx,qy,S,base,cut,A,resistance,water_input,solid_input,
incision,deposition,rain,unused,unused,unused. Bed = base-cut+A/.65.
Original implementation of Audusse hydrostatic reconstruction with HLL flux.
"""

from __future__ import annotations
import numpy as np

G = 9.81
POROSITY = 0.35
DRY = 1e-6


def flux(left, right):
    """HLL face flux in local normal/tangent coordinates, sediment upwind."""
    left_state, right_state = (
        np.asarray(left, dtype=float),
        np.asarray(right, dtype=float),
    )
    hl, hr = left_state[..., 0], right_state[..., 0]
    ul = left_state[..., 1] / np.maximum(hl, DRY)
    ur = right_state[..., 1] / np.maximum(hr, DRY)
    cl, cr = np.sqrt(G * np.maximum(hl, 0)), np.sqrt(G * np.maximum(hr, 0))
    sl, sr = (
        np.minimum(np.minimum(ul - cl, ur - cr), 0),
        np.maximum(np.maximum(ul + cl, ur + cr), 0),
    )
    fl = np.stack(
        [
            left_state[..., 1],
            left_state[..., 1] * ul + 0.5 * G * hl * hl,
            left_state[..., 2] * ul,
            left_state[..., 3] * ul,
        ],
        axis=-1,
    )
    fr = np.stack(
        [
            right_state[..., 1],
            right_state[..., 1] * ur + 0.5 * G * hr * hr,
            right_state[..., 2] * ur,
            right_state[..., 3] * ur,
        ],
        axis=-1,
    )
    f = (
        sr[..., None] * fl
        - sl[..., None] * fr
        + (sl * sr)[..., None] * (right_state - left_state)
    ) / np.maximum((sr - sl)[..., None], 1e-12)
    conc = np.where(
        f[..., 0] >= 0,
        left_state[..., 3] / np.maximum(hl, DRY),
        right_state[..., 3] / np.maximum(hr, DRY),
    )
    f[..., 3] = f[..., 0] * conc
    return f


def initial(n: int, scene: str = "dam"):
    s = np.zeros((n, n, 16), dtype=np.float64)
    s[..., 7] = 1
    if scene == "lake":
        y, x = (np.mgrid[:n, :n] + 0.5) / n
        s[..., 4] = 0.2 + 1.1 * np.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.025)
        s[..., 0] = np.maximum(1 - s[..., 4], 0)
    elif scene == "dam":
        s[:, : n // 2, 0] = 1
        s[:, : n // 2, 3] = 0.01
    elif scene == "settling":
        s[..., 0] = 1
        s[..., 3] = 0.01
    elif scene == "channel":
        s[..., 0] = 0.2
        s[..., 4] = 2
    return s


def stable_dt(s, dx):
    h = s[..., 0]
    wave = (abs(s[..., 1]) + abs(s[..., 2])) / np.maximum(h, DRY) + 2 * np.sqrt(
        G * np.maximum(h, 0)
    )
    return 0.4 * dx / max(float(wave.max()), 1e-8)


def budgets(s, dx=1):
    return (
        np.array(
            [
                np.sum(s[..., 0] - s[..., 15] - s[..., 8] - s[..., 13]),
                np.sum(-s[..., 5] + s[..., 6] + s[..., 3] - s[..., 9] - s[..., 14]),
            ]
        )
        * dx
        * dx
    )


def _faces(s, axis, open_boundary):
    # Array axis 1 is x; axis 0 is y. Normal q occupies state 1/2.
    ni = 2 - axis
    pad = np.pad(s, ((1, 1), (1, 1), (0, 0)), mode="edge")
    if axis == 1:
        pad[1:-1, 0, 1] *= -1
        pad[1:-1, -1, 1] *= -1
        left_state, right_state = pad[1:-1, :-1], pad[1:-1, 1:]
    else:
        pad[0, 1:-1, 2] *= -1
        pad[-1, 1:-1, 2] = (
            np.maximum(pad[-1, 1:-1, 2], 0) if open_boundary else -pad[-1, 1:-1, 2]
        )
        left_state, right_state = pad[:-1, 1:-1], pad[1:, 1:-1]
    zl = left_state[..., 4] - left_state[..., 5] + left_state[..., 6] / 0.65
    zr = right_state[..., 4] - right_state[..., 5] + right_state[..., 6] / 0.65
    z = np.maximum(zl, zr)
    hl = np.maximum(0, left_state[..., 0] + zl - z)
    hr = np.maximum(0, right_state[..., 0] + zr - z)
    ll = left_state[..., :4].copy()
    rr = right_state[..., :4].copy()
    ll *= (hl / np.maximum(left_state[..., 0], DRY))[..., None]
    rr *= (hr / np.maximum(right_state[..., 0], DRY))[..., None]
    ll[..., 0] = hl
    rr[..., 0] = hr
    if ni == 2:
        ll = ll[..., [0, 2, 1, 3]]
        rr = rr[..., [0, 2, 1, 3]]
    f = flux(ll, rr)
    if ni == 2:
        f = f[..., [0, 2, 1, 3]]
    return (
        f,
        0.5 * G * (left_state[..., 0] ** 2 - hl**2),
        0.5 * G * (right_state[..., 0] ** 2 - hr**2),
    )


def step(
    s,
    dt,
    *,
    dx=1,
    erosion=0,
    settling=0.02,
    friction=0.01,
    open_boundary=False,
    negative=0,
):
    if dt > stable_dt(s, dx) * (1 + 1e-10):
        raise ValueError("CFL timestep exceeded")
    out = s.copy()
    fx, cxl, cxr = _faces(s, 1, open_boundary)
    fy, cyl, cyr = _faces(s, 0, open_boundary)
    out[..., :4] -= dt / dx * (fx[:, 1:] - fx[:, :-1] + fy[1:] - fy[:-1])
    if negative != 1:
        out[..., 1] -= dt / dx * (cxl[:, 1:] - cxr[:, :-1])
        out[..., 2] -= dt / dx * (cyl[1:] - cyr[:-1])
    if open_boundary:
        out[-1, :, 8] -= dt / dx * fy[-1, :, 0]
        out[-1, :, 9] -= dt / dx * fy[-1, :, 3]
    out[..., 0] = np.maximum(out[..., 0], 0)
    out[..., 3] = np.maximum(out[..., 3], 0)
    h = out[..., 0]
    speed = np.hypot(out[..., 1], out[..., 2]) / np.maximum(h, DRY)
    out[..., 1:3] /= (1 + dt * friction * speed / np.maximum(h, DRY))[..., None]
    out[..., 1:3] = np.where((h > DRY)[..., None], out[..., 1:3], 0)
    stress = (
        1000 * friction * (np.hypot(out[..., 1], out[..., 2]) / np.maximum(h, DRY)) ** 2
    )
    cover = np.exp(-out[..., 6] / (0.65 * 0.08))
    # Horizontal layers repeat at 0.6m. Upper 0.12m is resistant caprock.
    rock = out[..., 4] - out[..., 5]
    hard = np.where(np.mod(rock, 0.6) > 0.48, 0.12, 1)
    ea = np.minimum(
        out[..., 6], erosion * 0.002 * np.maximum(stress - 0.5, 0) * (1 - cover) * dt
    )
    er = (
        erosion
        * 0.0008
        * hard
        / np.maximum(out[..., 7], 0.05)
        * np.maximum(stress - 1, 0)
        * cover
        * dt
    )
    er = np.minimum(er, np.maximum(rock + 0.5, 0))
    layer = np.mod(rock, 0.6)
    er = np.minimum(er, np.maximum(5e-7, np.where(layer > 0.48, layer - 0.48, layer)))
    capacity = np.maximum(0.02 * h - out[..., 3], 0)
    scale = np.minimum(1, capacity / np.maximum(ea + er, 1e-30))
    ea *= scale
    er *= scale
    previous = out[..., 5].copy()
    out[..., 5] += er
    er = out[..., 5] - previous
    out[..., 6] -= ea
    if negative != 2:
        out[..., 3] += ea + er
    out[..., 10] += er
    deposit = out[..., 3] * (1 - np.exp(-settling * dt / np.maximum(h, DRY)))
    deposit = np.maximum(deposit, out[..., 3] - 0.02 * h)
    deposit = np.where(h > DRY, deposit, out[..., 3])
    out[..., 3] -= deposit
    out[..., 6] += deposit
    out[..., 11] += deposit
    return out
