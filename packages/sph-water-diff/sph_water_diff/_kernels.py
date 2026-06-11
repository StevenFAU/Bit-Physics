# mypy: ignore-errors
"""Tape-differentiable SPH free-fall + cubic-spline density Taichi kernels (IC-12).

Dedicated kernel module WITHOUT ``from __future__ import annotations`` and WITHOUT
``-> None`` return hints (Taichi 1.7.4 reads kernel argument annotations as live objects).
``# mypy: ignore-errors`` because ``@ti.kernel`` is untyped.

Tape-safety constraints (the batch-1 lenia/mpm banked findings, applied here):

1. **Time-indexed ``needs_grad`` fields** (DiffTaichi pattern): every per-step write
   (``v[f+1]``, ``x[f+1]``) is single-write inside one tape run.
2. **Accumulators are zeroed by a KERNEL and written only with ``+=``** (``rho``, ``loss``):
   a ``.fill(0)`` inside the tape re-triggers the kernel-structure error (lenia-diff
   finding); a zeroing kernel + pure accumulation is tape-safe.
3. **``ti.static`` unrolled neighbor loop**: ``n_particles`` is a compile-time constant, so
   the O(N^2) pair loop unrolls to straight-line accumulation (no runtime-nested loop inside
   a differentiated kernel). Deliberately NOT the parent's spatial hash - integer cell
   indices are non-differentiable and the hash insertion order is irrelevant at N=8; the
   arithmetic per pair is identical to the parent's ``_compute_density`` (same cubic-spline
   branches, same self-term-first convention).
4. **Explicit-scalar arithmetic** component-wise, mirroring the parent's ``_integrate``
   (``v_z += g*dt`` then ``x += dt*v_new``) so the float op-order matches the reference
   (WU-F equivalence) and the tape sees clean stores.

Determinism-sensitive surface: the ``loss`` / ``rho`` ``+=`` accumulations (sum-only
atomics), serialised bit-exact under ``cpu_max_num_threads=1``. MEASURED in
``tests/test_determinism.py``.
"""

from typing import Any

import taichi as ti

SIGMA_3D = 0.3183098861837907  # 1/pi, f64; matches forward.SIGMA_3D / parent SIGMA_3D

# Cache of config-specialised kernel bundles (ti.static needs compile-time constants).
_KERNEL_CACHE: dict[tuple, dict[str, Any]] = {}


@ti.kernel
def first_density(rho: ti.template(), out: ti.template()):
    """Project rho[0] into a 0-D loss field (the A3 standalone-tape readout)."""
    out[None] += rho[0]


def make_sph_kernels(
    *,
    n_particles: int,
    steps: int,
    dt: float,
    g_z: float,
    mass: float,
) -> dict[str, Any]:
    """Return (compiling once per config) the tape-differentiable SPH kernels.

    Constants (P/STEPS/dt/g_z/mass) are baked at compile time. Bundled: load_velocity,
    advance, comp_loss_pos, clear_rho, density_from_h, comp_loss_rho.
    """
    key = (n_particles, steps, dt, g_z, mass)
    cached = _KERNEL_CACHE.get(key)
    if cached is not None:
        return cached

    P = int(n_particles)
    STEPS = int(steps)
    DT = float(dt)
    G_Z = float(g_z)
    MASS = float(mass)

    @ti.kernel
    def load_velocity(v: ti.template(), v0z: ti.template()):
        """Copy the (needs_grad) shared initial vertical velocity into v[0,p] (in-tape).

        Single-write kernel copy so ti.ad.Tape backprops dLoss/d(v[0]) to the param field;
        x,y start at rest (the parent's dam-break IC is at rest; v0z is the control)."""
        for p in range(P):
            v[0, p][0] = 0.0
            v[0, p][1] = 0.0
            v[0, p][2] = v0z[0]

    @ti.kernel
    def advance(f: ti.i32, x: ti.template(), v: ti.template()):
        """One semi-implicit explicit-Euler step (parent ``_integrate`` arithmetic).

        ``v_z[f+1] = v_z[f] + g*dt`` (x,y carried), then ``x[f+1] = x[f] + dt*v[f+1]`` -
        the new-velocity position update, component-wise, single-write per element."""
        for p in range(P):
            v[f + 1, p][0] = v[f, p][0]
            v[f + 1, p][1] = v[f, p][1]
            v[f + 1, p][2] = v[f, p][2] + G_Z * DT
            x[f + 1, p][0] = x[f, p][0] + DT * v[f + 1, p][0]
            x[f + 1, p][1] = x[f, p][1] + DT * v[f + 1, p][1]
            x[f + 1, p][2] = x[f, p][2] + DT * v[f + 1, p][2]

    @ti.kernel
    def comp_loss_pos(x: ti.template(), target: ti.template(), loss: ti.template()):
        """L2 final-position loss: loss += sum_p sum_c (x[STEPS,p][c] - target[p,c])^2."""
        for p in range(P):
            for c in ti.static(range(3)):
                d = x[STEPS, p][c] - target[p, c]
                loss[None] += d * d

    @ti.kernel
    def clear_rho(rho: ti.template()):
        """Zero the density accumulator (tape-safe kernel zeroing; re-runs per forward)."""
        for p in range(P):
            rho[p] = 0.0

    @ti.kernel
    def density_from_h(xs: ti.template(), h: ti.template(), rho: ti.template()):
        """SPH cubic-spline density at fixed positions, differentiable w.r.t. ``h``.

        rho[p] += m*sigma_3/h^3 * f(|x_p - x_j| / h) over the self term (f(0)=1) and all
        pairs (ti.static-unrolled; same branch arithmetic as the parent's
        ``_compute_density``). Piecewise branches are smooth at every evaluated fixture
        point (regime: away from the q=1 / q=2 knots)."""
        for p in range(P):
            hh = h[0]
            sigma_inv_h3 = SIGMA_3D / (hh * hh * hh)
            rho[p] += MASS * sigma_inv_h3  # self-contribution f(0) = 1
            for j in ti.static(range(P)):
                if j != p:
                    rx = xs[p][0] - xs[j][0]
                    ry = xs[p][1] - xs[j][1]
                    rz = xs[p][2] - xs[j][2]
                    q = ti.sqrt(rx * rx + ry * ry + rz * rz) / hh
                    if q < 1.0:
                        rho[p] += MASS * sigma_inv_h3 * (1.0 - 1.5 * q * q + 0.75 * q * q * q)
                    elif q < 2.0:
                        rho[p] += MASS * sigma_inv_h3 * 0.25 * ((2.0 - q) * (2.0 - q) * (2.0 - q))

    @ti.kernel
    def comp_loss_rho(rho: ti.template(), target: ti.template(), loss: ti.template()):
        """L2 density loss: loss += sum_p (rho[p] - target[p])^2."""
        for p in range(P):
            d = rho[p] - target[p]
            loss[None] += d * d

    bundle: dict[str, Any] = {
        "load_velocity": load_velocity,
        "advance": advance,
        "comp_loss_pos": comp_loss_pos,
        "clear_rho": clear_rho,
        "density_from_h": density_from_h,
        "comp_loss_rho": comp_loss_rho,
    }
    _KERNEL_CACHE[key] = bundle
    return bundle
