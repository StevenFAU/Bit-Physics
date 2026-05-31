# mypy: ignore-errors
"""Tape-differentiable 3D APIC neo-Hookean MLS-MPM Taichi kernels (IC-12 discipline).

Dedicated kernel module WITHOUT ``from __future__ import annotations`` and WITHOUT
``-> None`` return hints (Taichi 1.7.4 reads kernel argument annotations as live objects).
``# mypy: ignore-errors`` because ``@ti.kernel`` is untyped.

Four Stage-0/1b autodiff constraints (probe
``tools/testkit/probes/reports/mpm-multimaterial-diff.md`` section 1 + the lenia-diff
section 1.3 banked findings):

1. **The 27-cell P2G/G2P stencil uses ``ti.static`` unrolling.** A nested *runtime* stencil
   loop inside a differentiated kernel raises "Mixed usage of for-loops...".
   ``ti.static(ti.ndrange(3,3,3))`` unrolls the fixed stencil to straight-line ``acc += ...``
   so the tape sees a clean body.
2. **Explicit-SCALAR arithmetic, no local ``ti.Matrix`` mutation.** The neo-Hookean stress +
   APIC affine + F-update are written component-wise (mirroring the reference
   ``mls_mpm_taichi`` kernels). Building a local ``ti.Matrix`` and mutating it in place makes
   ``ti.ad.Tape`` reverse-compilation emit "Loading variable before anything is stored to
   it"; the explicit-scalar form is autodiff-clean AND keeps the float op-order close to the
   reference (WU-F equivalence).
3. **Time-indexed ``needs_grad`` fields** (DiffTaichi pattern): every per-step write
   (``x[f+1]``, ``v[f+1]``, ``C[f+1]``, ``F[f+1]``, ``grid_out[f]``) is single-write; the
   grid is scattered into ``grid_mom[f]`` / ``grid_mass[f]`` via ``ti.atomic_add``.
4. **Grid cleared by a KERNEL (not ``.fill``) inside the forward.** A ``.fill(0)``
   re-triggers the kernel-structure error inside the tape (lenia-diff section 1.3); a
   ``@ti.kernel`` zeroing the grid slices is tape-safe and re-zeros the accumulators between
   forward runs.

Determinism-sensitive surface: the P2G ``ti.atomic_add`` scatter reduction order, serialised
bit-exact under ``cpu_max_num_threads=1`` (the reference posture). MEASURE; see ``sim.py``.
The constitutive + transfer arithmetic mirrors the landed reference
``packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/reference/mls_mpm_taichi.py``.
Determinism note: this module relies on the runtime ``default_fp=ti.f64`` set by the diff's
conftest (NOT the reference's ``set_taichi_deterministic``, which leaves ``default_fp=f32``);
the diff is exercised only under its own f64 conftest, and the forward-equivalence test
shares that f64 runtime with the reference (see ``tests/test_forward_equivalence.py``).
"""

from typing import Any

import taichi as ti

DIM = 3

# Cache of config-specialised kernel bundles (ti.static needs compile-time constants).
_KERNEL_CACHE: dict[tuple, dict[str, Any]] = {}


@ti.kernel
def stress00_axis(eps: ti.template(), mu: ti.f64, lam: ti.f64, out: ti.template()):
    """Neo-Hookean sigma00 at F=diag(1+eps,1,1) (A3 constitutive anchor; standalone tape).

    J = det F = 1+eps, B00 = (1+eps)^2, so sigma00 = mu*(B00-1) + lam*log(J); ti.ad.Tape over
    this gives d(sigma00)/d(eps) = 2*mu+lam (verified exact). Same explicit-scalar form as p2g.
    """
    e = eps[None]
    f00 = 1.0 + e
    b00 = f00 * f00
    out[None] = mu * (b00 - 1.0) + lam * ti.log(f00)


def make_mpm_kernels(
    *,
    n_particles: int,
    grid_n: int,
    steps: int,
    dx: float,
    dt: float,
    mu: float,
    lam: float,
    gravity: float,
    volume: float,
    mass: float,
    floor_z: int,
) -> dict[str, Any]:
    """Return (compiling once) the tape-differentiable MLS-MPM kernels for this config.

    Constants (P/N/STEPS/dx/dt/material/floor_z) are baked at compile time (ti.static
    requires it). Bundled: clear_grid, load_velocity, p2g, grid_op, g2p, comp_loss.
    """
    key = (n_particles, grid_n, steps, dx, dt, mu, lam, gravity, volume, mass, floor_z)
    cached = _KERNEL_CACHE.get(key)
    if cached is not None:
        return cached

    P = int(n_particles)
    N = int(grid_n)
    STEPS = int(steps)
    ss = -4.0 * dt / (dx * dx)  # MLS-MPM stress scale (Hu 2018 88-line)
    asf = 4.0 / (dx * dx)  # APIC affine reconstruction scale
    ws = ss * volume

    @ti.kernel
    def clear_grid(gm: ti.template(), gv: ti.template(), go: ti.template()):
        """Zero the time-indexed grid mass/momentum/velocity slices (tape-safe; re-runs)."""
        for f, i, j, k in ti.ndrange(STEPS, N, N, N):
            gm[f, i, j, k] = 0.0
            for c in ti.static(range(DIM)):
                gv[f, i, j, k, c] = 0.0
                go[f, i, j, k, c] = 0.0

    @ti.kernel
    def load_velocity(v: ti.template(), v0: ti.template()):
        """Copy the (needs_grad) recovered initial velocity into v[0,p] (inside the tape).

        A single-write kernel copy so ti.ad.Tape backprops d(Loss)/d(v[0]) to the param field
        (the InitialStateRecoveryProblem gradient). Shared 3-vector v0 -> all particles.
        """
        for p in range(P):
            v[0, p] = ti.Vector([v0[0], v0[1], v0[2]])

    @ti.kernel
    def p2g(
        f: ti.i32,
        x: ti.template(),
        v: ti.template(),
        C: ti.template(),
        F: ti.template(),
        gm: ti.template(),
        gv: ti.template(),
    ):
        """Particle->grid mass+momentum scatter with neo-Hookean stress (APIC affine).

        Mirrors _k_p2g_with_stress: eff = mass*C + (-4 dt/dx^2 vol)*stress; node momentum =
        weight*(mass*v + eff*dpos_node). Stress = neo-Hookean Kirchhoff mu(B-I) + lam log(J) I
        (B = F F^T), all explicit-scalar (autodiff-clean).
        """
        for p in range(P):
            fx = x[f, p][0] / dx
            fy = x[f, p][1] / dx
            fz = x[f, p][2] / dx
            bx = ti.cast(ti.floor(fx + 0.5), ti.i32) - 1
            by = ti.cast(ti.floor(fy + 0.5), ti.i32) - 1
            bz = ti.cast(ti.floor(fz + 0.5), ti.i32) - 1
            fpx = fx - bx
            fpy = fy - by
            fpz = fz - bz
            wx = ti.Vector(
                [0.5 * (1.5 - fpx) ** 2, 0.75 - (fpx - 1.0) ** 2, 0.5 * (fpx - 0.5) ** 2]
            )
            wy = ti.Vector(
                [0.5 * (1.5 - fpy) ** 2, 0.75 - (fpy - 1.0) ** 2, 0.5 * (fpy - 0.5) ** 2]
            )
            wz = ti.Vector(
                [0.5 * (1.5 - fpz) ** 2, 0.75 - (fpz - 1.0) ** 2, 0.5 * (fpz - 0.5) ** 2]
            )
            f00 = F[f, p][0, 0]
            f01 = F[f, p][0, 1]
            f02 = F[f, p][0, 2]
            f10 = F[f, p][1, 0]
            f11 = F[f, p][1, 1]
            f12 = F[f, p][1, 2]
            f20 = F[f, p][2, 0]
            f21 = F[f, p][2, 1]
            f22 = F[f, p][2, 2]
            jd = (
                f00 * (f11 * f22 - f12 * f21)
                - f01 * (f10 * f22 - f12 * f20)
                + f02 * (f10 * f21 - f11 * f20)
            )
            b00 = f00 * f00 + f01 * f01 + f02 * f02
            b01 = f00 * f10 + f01 * f11 + f02 * f12
            b02 = f00 * f20 + f01 * f21 + f02 * f22
            b11 = f10 * f10 + f11 * f11 + f12 * f12
            b12 = f10 * f20 + f11 * f21 + f12 * f22
            b22 = f20 * f20 + f21 * f21 + f22 * f22
            log_j = ti.f64(-30.0)
            if jd > 0.0:
                log_j = ti.log(jd)
            si = lam * log_j
            s00 = mu * (b00 - 1.0) + si
            s01 = mu * b01
            s02 = mu * b02
            s11 = mu * (b11 - 1.0) + si
            s12 = mu * b12
            s22 = mu * (b22 - 1.0) + si
            cxx = C[f, p][0, 0]
            cxy = C[f, p][0, 1]
            cxz = C[f, p][0, 2]
            cyx = C[f, p][1, 0]
            cyy = C[f, p][1, 1]
            cyz = C[f, p][1, 2]
            czx = C[f, p][2, 0]
            czy = C[f, p][2, 1]
            czz = C[f, p][2, 2]
            e00 = mass * cxx + ws * s00
            e01 = mass * cxy + ws * s01
            e02 = mass * cxz + ws * s02
            e10 = mass * cyx + ws * s01
            e11 = mass * cyy + ws * s11
            e12 = mass * cyz + ws * s12
            e20 = mass * czx + ws * s02
            e21 = mass * czy + ws * s12
            e22 = mass * czz + ws * s22
            vx = v[f, p][0]
            vy = v[f, p][1]
            vz = v[f, p][2]
            for di, dj, dk in ti.static(ti.ndrange(3, 3, 3)):
                wt = wx[di] * wy[dj] * wz[dk]
                dxn = (di - fpx) * dx
                dyn = (dj - fpy) * dx
                dzn = (dk - fpz) * dx
                gi = bx + di
                gj = by + dj
                gk = bz + dk
                mvx = mass * vx + e00 * dxn + e01 * dyn + e02 * dzn
                mvy = mass * vy + e10 * dxn + e11 * dyn + e12 * dzn
                mvz = mass * vz + e20 * dxn + e21 * dyn + e22 * dzn
                gm[f, gi, gj, gk] += wt * mass
                gv[f, gi, gj, gk, 0] += wt * mvx
                gv[f, gi, gj, gk, 1] += wt * mvy
                gv[f, gi, gj, gk, 2] += wt * mvz

    @ti.kernel
    def grid_op(f: ti.i32, gm: ti.template(), gv: ti.template(), go: ti.template()):
        """Grid update: normalise momentum->velocity, add gravity, sticky-floor + wall clamps.

        Mirrors _k_grid_update; floor_z<0 disables the sticky floor (the diff regime is an
        interior free-flight blob, no boundary contact). Single-write to go[f].
        """
        for i, j, k in ti.ndrange(N, N, N):
            m = gm[f, i, j, k]
            vx = ti.f64(0.0)
            vy = ti.f64(0.0)
            vz = ti.f64(0.0)
            if m > 0.0:
                inv = 1.0 / m
                vx = gv[f, i, j, k, 0] * inv
                vy = gv[f, i, j, k, 1] * inv
                vz = gv[f, i, j, k, 2] * inv + gravity * dt
                if k <= floor_z:
                    vx = 0.0
                    vy = 0.0
                    vz = 0.0
                if k == 0 and vz < 0.0:
                    vz = 0.0
                if k == N - 1 and vz > 0.0:
                    vz = 0.0
                if i == 0 and vx < 0.0:
                    vx = 0.0
                if i == N - 1 and vx > 0.0:
                    vx = 0.0
                if j == 0 and vy < 0.0:
                    vy = 0.0
                if j == N - 1 and vy > 0.0:
                    vy = 0.0
            go[f, i, j, k, 0] = vx
            go[f, i, j, k, 1] = vy
            go[f, i, j, k, 2] = vz

    @ti.kernel
    def g2p(
        f: ti.i32,
        x: ti.template(),
        v: ti.template(),
        C: ti.template(),
        F: ti.template(),
        go: ti.template(),
    ):
        """Grid->particle velocity + APIC affine reconstruction, F-update, advect.

        Mirrors _k_g2p (4/dx^2 affine) + _k_deformation_update (F'=(I+dt C)F) + _k_advect
        (x'=x+dt v). Explicit-scalar; single-write per step-slice.
        """
        for p in range(P):
            fx = x[f, p][0] / dx
            fy = x[f, p][1] / dx
            fz = x[f, p][2] / dx
            bx = ti.cast(ti.floor(fx + 0.5), ti.i32) - 1
            by = ti.cast(ti.floor(fy + 0.5), ti.i32) - 1
            bz = ti.cast(ti.floor(fz + 0.5), ti.i32) - 1
            fpx = fx - bx
            fpy = fy - by
            fpz = fz - bz
            wx = ti.Vector(
                [0.5 * (1.5 - fpx) ** 2, 0.75 - (fpx - 1.0) ** 2, 0.5 * (fpx - 0.5) ** 2]
            )
            wy = ti.Vector(
                [0.5 * (1.5 - fpy) ** 2, 0.75 - (fpy - 1.0) ** 2, 0.5 * (fpy - 0.5) ** 2]
            )
            wz = ti.Vector(
                [0.5 * (1.5 - fpz) ** 2, 0.75 - (fpz - 1.0) ** 2, 0.5 * (fpz - 0.5) ** 2]
            )
            nvx = ti.f64(0.0)
            nvy = ti.f64(0.0)
            nvz = ti.f64(0.0)
            cxx = ti.f64(0.0)
            cxy = ti.f64(0.0)
            cxz = ti.f64(0.0)
            cyx = ti.f64(0.0)
            cyy = ti.f64(0.0)
            cyz = ti.f64(0.0)
            czx = ti.f64(0.0)
            czy = ti.f64(0.0)
            czz = ti.f64(0.0)
            for di, dj, dk in ti.static(ti.ndrange(3, 3, 3)):
                wt = wx[di] * wy[dj] * wz[dk]
                dxn = (di - fpx) * dx
                dyn = (dj - fpy) * dx
                dzn = (dk - fpz) * dx
                gi = bx + di
                gj = by + dj
                gk = bz + dk
                vix = go[f, gi, gj, gk, 0]
                viy = go[f, gi, gj, gk, 1]
                viz = go[f, gi, gj, gk, 2]
                nvx += wt * vix
                nvy += wt * viy
                nvz += wt * viz
                cxx += wt * vix * dxn
                cxy += wt * vix * dyn
                cxz += wt * vix * dzn
                cyx += wt * viy * dxn
                cyy += wt * viy * dyn
                cyz += wt * viy * dzn
                czx += wt * viz * dxn
                czy += wt * viz * dyn
                czz += wt * viz * dzn
            v[f + 1, p] = ti.Vector([nvx, nvy, nvz])
            n00 = asf * cxx
            n01 = asf * cxy
            n02 = asf * cxz
            n10 = asf * cyx
            n11 = asf * cyy
            n12 = asf * cyz
            n20 = asf * czx
            n21 = asf * czy
            n22 = asf * czz
            C[f + 1, p] = ti.Matrix([[n00, n01, n02], [n10, n11, n12], [n20, n21, n22]])
            a00 = 1.0 + dt * n00
            a01 = dt * n01
            a02 = dt * n02
            a10 = dt * n10
            a11 = 1.0 + dt * n11
            a12 = dt * n12
            a20 = dt * n20
            a21 = dt * n21
            a22 = 1.0 + dt * n22
            f00 = F[f, p][0, 0]
            f01 = F[f, p][0, 1]
            f02 = F[f, p][0, 2]
            f10 = F[f, p][1, 0]
            f11 = F[f, p][1, 1]
            f12 = F[f, p][1, 2]
            f20 = F[f, p][2, 0]
            f21 = F[f, p][2, 1]
            f22 = F[f, p][2, 2]
            F[f + 1, p] = ti.Matrix(
                [
                    [
                        a00 * f00 + a01 * f10 + a02 * f20,
                        a00 * f01 + a01 * f11 + a02 * f21,
                        a00 * f02 + a01 * f12 + a02 * f22,
                    ],
                    [
                        a10 * f00 + a11 * f10 + a12 * f20,
                        a10 * f01 + a11 * f11 + a12 * f21,
                        a10 * f02 + a11 * f12 + a12 * f22,
                    ],
                    [
                        a20 * f00 + a21 * f10 + a22 * f20,
                        a20 * f01 + a21 * f11 + a22 * f21,
                        a20 * f02 + a21 * f12 + a22 * f22,
                    ],
                ]
            )
            x[f + 1, p] = x[f, p] + dt * ti.Vector([nvx, nvy, nvz])

    @ti.kernel
    def comp_loss(x: ti.template(), target: ti.template(), loss: ti.template()):
        """Loss = sum_p ||x[STEPS,p] - target[p]||^2 (target is a (P,3) scalar field)."""
        for p in range(P):
            dxp = x[STEPS, p][0] - target[p, 0]
            dyp = x[STEPS, p][1] - target[p, 1]
            dzp = x[STEPS, p][2] - target[p, 2]
            loss[None] += dxp * dxp + dyp * dyp + dzp * dzp

    bundle: dict[str, Any] = {
        "clear_grid": clear_grid,
        "load_velocity": load_velocity,
        "p2g": p2g,
        "grid_op": grid_op,
        "g2p": g2p,
        "comp_loss": comp_loss,
    }
    _KERNEL_CACHE[key] = bundle
    return bundle
