# mypy: ignore-errors
# ^ NVIDIA Warp ships partial type info: `@wp.kernel` parameter annotations
#   (`wp.array(dtype=...)`) are function-calls-in-annotations and in-kernel
#   `wp.float64(...)` / `wp.vecNd` arithmetic read as untyped calls under
#   `mypy --strict`. Warp is the runtime, not a typed library here; this file is
#   the Warp DSL surface. (Taichi sims escape this only because Taichi ships no
#   types; the Phase-2 Stack-E ports had no per-sim mypy CI job. F-RB-3.)
"""Warp ``@wp.kernel`` for the planar revolute-chain ABA forward dynamics.

World-frame planar spatial-vector formulation (Featherstone Ch. 7 §7.3, planar
specialization — see ``docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md``).
Planar spatial vectors are 3-D ``(omega_z, v_x, v_y)`` expressed in the common
inertial (world) frame, so the only inter-link transform is a pure translation
between joint origins — folded into the joint motion subspace
``S_i = (1; jpos_y; -jpos_x)`` and the about-origin spatial inertia.

The kernel is launched with ``dim=1`` (single thread): the ABA recursion is
inherently sequential, and the single-threaded CPU launch fixes the reduction
order, giving bit-exact run-to-run determinism (D-DET). All arithmetic is
``wp.float64`` — every literal is seeded ``wp.float64(...)`` (the f64-accumulator
discipline carried from the lenia Taichi f32-downcast lesson).
"""

from __future__ import annotations

import warp as wp


@wp.kernel
def aba_kernel(
    q: wp.array(dtype=wp.float64),
    qd: wp.array(dtype=wp.float64),
    tau: wp.array(dtype=wp.float64),
    length: wp.array(dtype=wp.float64),
    cdist: wp.array(dtype=wp.float64),
    mass: wp.array(dtype=wp.float64),
    inertia: wp.array(dtype=wp.float64),
    gx: wp.float64,
    gy: wp.float64,
    n: wp.int32,
    jpos: wp.array(dtype=wp.vec2d),
    cpos: wp.array(dtype=wp.vec2d),
    smot: wp.array(dtype=wp.vec3d),
    vel: wp.array(dtype=wp.vec3d),
    ia: wp.array(dtype=wp.mat33d),
    pa: wp.array(dtype=wp.vec3d),
    uvec: wp.array(dtype=wp.vec3d),
    dscalar: wp.array(dtype=wp.float64),
    uscalar: wp.array(dtype=wp.float64),
    accel: wp.array(dtype=wp.vec3d),
    qdd: wp.array(dtype=wp.float64),
) -> None:
    tid = wp.tid()
    if tid != 0:
        return

    zero = wp.float64(0.0)
    one = wp.float64(1.0)

    # Pass 0 — forward kinematics: joint + COM world positions.
    ang = zero
    px = zero
    py = zero
    for i in range(n):
        ang = ang + q[i]
        jpos[i] = wp.vec2d(px, py)
        dx = wp.sin(ang)
        dy = -wp.cos(ang)
        cpos[i] = wp.vec2d(px + cdist[i] * dx, py + cdist[i] * dy)
        px = px + length[i] * dx
        py = py + length[i] * dy

    # Pass 1 — motion subspaces + outward spatial velocities.
    vprev = wp.vec3d(zero, zero, zero)
    for i in range(n):
        jp = jpos[i]
        si = wp.vec3d(one, jp[1], -jp[0])
        smot[i] = si
        vel[i] = vprev + si * qd[i]
        vprev = vel[i]

    # Pass 1b — spatial inertia about O + velocity-product bias - gravity force.
    for i in range(n):
        m = mass[i]
        c = cpos[i]
        cx = c[0]
        cy = c[1]
        ic = inertia[i]
        isp = wp.mat33d(
            ic + m * (cx * cx + cy * cy),
            -m * cy,
            m * cx,
            -m * cy,
            m,
            zero,
            m * cx,
            zero,
            m,
        )
        ia[i] = isp
        v = vel[i]
        iv = isp * v
        w = v[0]
        # crf(v) @ iv where crf = [[0,-vy,vx],[0,0,-w],[0,w,0]]
        pbias = wp.vec3d(-v[2] * iv[1] + v[1] * iv[2], -w * iv[2], w * iv[1])
        fx = m * gx
        fy = m * gy
        n_o = cx * fy - cy * fx
        pa[i] = pbias - wp.vec3d(n_o, fx, fy)

    # Pass 2 — inward articulated-inertia + bias-force propagation.
    for ii in range(n):
        i = n - 1 - ii
        si = smot[i]
        ui = ia[i] * si
        uvec[i] = ui
        di = wp.dot(si, ui)
        dscalar[i] = di
        usc = tau[i] - wp.dot(si, pa[i])
        uscalar[i] = usc
        if i > 0:
            ia_art = ia[i] - wp.outer(ui, ui) * (one / di)
            v = vel[i]
            w = v[0]
            sqd = si * qd[i]
            # crm(v) @ sqd where crm = [[0,0,0],[vy,0,-w],[-vx,w,0]]
            crmv = wp.vec3d(zero, v[2] * sqd[0] - w * sqd[2], -v[1] * sqd[0] + w * sqd[1])
            pa_art = pa[i] + ia_art * crmv + ui * (usc / di)
            ia[i - 1] = ia[i - 1] + ia_art
            pa[i - 1] = pa[i - 1] + pa_art

    # Pass 3 — outward acceleration propagation; read off joint accelerations.
    aprev = wp.vec3d(zero, zero, zero)
    for i in range(n):
        si = smot[i]
        v = vel[i]
        w = v[0]
        sqd = si * qd[i]
        crmv = wp.vec3d(zero, v[2] * sqd[0] - w * sqd[2], -v[1] * sqd[0] + w * sqd[1])
        aprime = aprev + crmv
        qddi = (uscalar[i] - wp.dot(uvec[i], aprime)) / dscalar[i]
        qdd[i] = qddi
        accel[i] = aprime + si * qddi
        aprev = accel[i]
