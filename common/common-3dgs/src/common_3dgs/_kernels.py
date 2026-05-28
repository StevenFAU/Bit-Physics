# mypy: ignore-errors
"""Warp compositing kernel for the forward 3DGS rasterizer (Stack-E).

Kept in a dedicated module (excluded from mypy via the file-level
``# mypy: ignore-errors`` directive) because ``@wp.kernel`` argument annotations
use Warp's runtime type constructors (``wp.array(dtype=...)``) that mypy cannot
type-check. The module deliberately omits ``from __future__ import annotations``
so Warp resolves the kernel annotations at decoration time (banked precedent
O-W6 / the common-warp kernel-module posture).

**Determinism (D-C).** Each pixel is an independent thread that walks the
depth-sorted splat list front-to-back and alpha-composites with a pure gather
(no atomic scatter, no parallel reduction). On Warp's CPU backend ``wp.launch``
runs serially over the launch dimension, so the image is bit-identical
run-to-run at fixed inputs.
"""

import warp as wp

#: Minimum per-splat alpha contribution (Inria 1/255 cull) and the
#: transmittance floor at which front-to-back compositing terminates.
ALPHA_MIN = wp.constant(1.0 / 255.0)
T_MIN = wp.constant(1.0e-4)
ALPHA_MAX = wp.constant(0.99)


@wp.kernel
def composite_splats(
    mean_u: wp.array(dtype=wp.float32),
    mean_v: wp.array(dtype=wp.float32),
    conic_a: wp.array(dtype=wp.float32),
    conic_b: wp.array(dtype=wp.float32),
    conic_c: wp.array(dtype=wp.float32),
    color_r: wp.array(dtype=wp.float32),
    color_g: wp.array(dtype=wp.float32),
    color_b: wp.array(dtype=wp.float32),
    opacity: wp.array(dtype=wp.float32),
    n_splats: wp.int32,
    bg_r: wp.float32,
    bg_g: wp.float32,
    bg_b: wp.float32,
    out: wp.array(dtype=wp.float32, ndim=3),
):
    py, px = wp.tid()
    fx = wp.float32(px)
    fy = wp.float32(py)

    transmit = wp.float32(1.0)
    acc_r = wp.float32(0.0)
    acc_g = wp.float32(0.0)
    acc_b = wp.float32(0.0)

    for i in range(n_splats):
        dx = fx - mean_u[i]
        dy = fy - mean_v[i]
        power = -0.5 * (conic_a[i] * dx * dx + conic_c[i] * dy * dy) - conic_b[i] * dx * dy
        if power <= 0.0:
            alpha = opacity[i] * wp.exp(power)
            if alpha > ALPHA_MAX:
                alpha = ALPHA_MAX
            if alpha >= ALPHA_MIN:
                weight = transmit * alpha
                acc_r += weight * color_r[i]
                acc_g += weight * color_g[i]
                acc_b += weight * color_b[i]
                transmit *= 1.0 - alpha
                if transmit < T_MIN:
                    break

    r = acc_r + transmit * bg_r
    g = acc_g + transmit * bg_g
    b = acc_b + transmit * bg_b

    out[py, px, 0] = wp.clamp(r, 0.0, 1.0)
    out[py, px, 1] = wp.clamp(g, 0.0, 1.0)
    out[py, px, 2] = wp.clamp(b, 0.0, 1.0)
