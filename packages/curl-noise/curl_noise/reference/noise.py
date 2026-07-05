"""Trig-free analytic-derivative 3D simplex noise (f64 reference).

Algorithm: the webgl-noise ``snoise(vec3, out gradient)`` lineage —
McEwan, Sheets, Gustavson, Richardson, "Efficient Computational Noise in
GLSL", JGT 16(2) 2012 / arXiv:1204.1461 (``ashima/webgl-noise``
``noise3Dgrad.glsl``, MIT) — reimplemented from the published algorithm
in vectorized NumPy f64 and extended with the exact analytic Hessian.

Load-bearing pinned constants (spec-ref § 2.5 — the two silent killers):

1. Radial falloff ``(0.5 - r^2)^4`` — NOT Perlin's ``0.6``. With 0.5 the
   per-corner kernel and its gradient vanish at the simplex boundary
   (support radius^2 = 0.5 <= boundary distance^2), so the noise is C^3
   and the velocity built from its gradient is C^2; 0.6 makes noise AND
   gradient discontinuous at simplex boundaries = divergence spikes
   exactly where the gate looks (JCGT 11(1) § 7, citing Sharpe 2012).
2. Permutation polynomial ``mod289((34x + 10) x)`` — NOT the older
   ``(34x + 1) x`` still in stock webgl-noise master ("frequent diagonal
   streaks", JCGT 11(1) § 7). Field size 289 = 17^2 keeps the max
   intermediate ~2.84e6 < 2^24: exact in f32/highp (and trivially in
   f64 here); never evaluate the hash in f16.

Zero trig anywhere on this path (the WGSL 2^-11 sin/cos hazard,
spec-ref § 8). ``TAYLOR_INV_SQRT_*`` is the published 1/sqrt Taylor
polynomial — kept (rather than an exact 1/sqrt) so the f64 reference and
the f32 WGSL port compute the *same* function of the input, making the
f32<->f64 delta pure rounding, not model mismatch.

EXECUTION DEVIATION (2026-07-05, improvement over the float-emulation
idiom): the permutation-hash chain AND every discrete gradient-selection
decision are computed in EXACT INTEGER arithmetic (int64 here, u32/i32
in the WGSL port) rather than the float-emulated ``mod289`` of the
WebGL1-era ports (GLSL ES 1.0 had no integer types; WGSL does). Measured
at execution: float ``x*(1/289)`` rounds differently in f32 vs f64 near
multiples of 289, so the two precisions pick DIFFERENT corner gradients
at some cells — the f32-proxy iso-residual blew up to O(1), the field
scale. The same hazard applies to the octahedron-edge sign selection
(``gh == 0`` cells exist exactly — |4x'-13| + |4y'-13| == 14). With
integer selection both stacks agree bit-exactly on every discrete
choice; only continuous arithmetic differs by rounding (measured f32
proxy residual after the fix: see tolerance.toml). Cell-assignment ties
at simplex boundaries remain float (floor of a continuous value) but are
harmless BY the 0.5-falloff pinning: the kernel and its first three
derivative classes vanish at the boundary, so either branch yields the
same value/gradient — the § 2.5 constant is load-bearing for the
cross-precision gate, not just for smoothness.

Gradient/Hessian derivation (ours; verified by SymPy in the golden-B/C
generators and by O(h^2) FD convergence in the MMS tests): with
``m_k = max(0.5 - |x_k|^2, 0)`` and constant per-corner gradient ``p_k``,

    n(x)      = S * sum_k m_k^4 (p_k . x_k)
    grad n    = S * sum_k [ -8 m_k^3 (p_k . x_k) x_k + m_k^4 p_k ]
    Hess n    = S * sum_k [ 48 m_k^2 (p_k.x_k) x_k x_k^T
                            - 8 m_k^3 (x_k p_k^T + p_k x_k^T)
                            - 8 m_k^3 (p_k.x_k) I ]

(each corner's simplex assignment and p_k are locally constant; both
change only across simplex boundaries, where m_k = 0 kills every term
through the third derivative — the k = 4 falloff class margin.)
"""

from __future__ import annotations

import numpy as np

# --- Pinned constants (spec-ref § 2.5; mirrored verbatim in the WGSL port) ---
FALLOFF: float = 0.5  # NOT 0.6 (Perlin) — C^3 continuity at simplex boundaries
PERM_MUL: float = 34.0
PERM_ADD: float = 10.0  # NOT +1 (streaky) — JCGT 11(1) § 7
PERM_MOD: float = 289.0  # 17^2; hash stays < 2^24 -> f32-exact by design
TAYLOR_INV_SQRT_A: float = 1.79284291400159
TAYLOR_INV_SQRT_B: float = 0.85373472095314
# Amplitude normalization (ours, committed): SCALE = 22.0 is pinned as
# part of the canonical field definition. Measured range at execution
# with the exact-integer gradient selection: max |n| ~ 0.21, std ~0.034
# over 2e6 uniform samples in [-50, 50]^3. (The earlier float-selection
# draft measured max ~0.98 — a tail artifact of the OTHER fold branch at
# the gh == 0 octahedron-edge cells; the integer selection follows GLSL
# step() exact-arithmetic semantics. SCALE is NOT retuned post-goldens;
# display normalization is a frontend concern.) Divergence-freeness is
# independent of SCALE (linearity).
SCALE: float = 22.0


def _permute_int(x: np.ndarray) -> np.ndarray:
    """Exact integer permutation: ((34 x + 10) x) mod 289 on int64.

    Inputs stay < 2*289 in the chain; max intermediate (34*578+10)*578
    ~ 1.14e7 — exact in int64 and in the WGSL u32 port."""
    return ((PERM_MUL_I * x + PERM_ADD_I) * x) % PERM_MOD_I


PERM_MUL_I: int = 34
PERM_ADD_I: int = 10
PERM_MOD_I: int = 289


def _taylor_inv_sqrt(r: np.ndarray) -> np.ndarray:
    return TAYLOR_INV_SQRT_A - TAYLOR_INV_SQRT_B * r


def snoise_grad_hess(
    v: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Simplex noise value, exact gradient, exact Hessian at points ``v``.

    Parameters
    ----------
    v : (N, 3) float64 array of evaluation points.

    Returns
    -------
    (value (N,), grad (N, 3), hess (N, 3, 3)) — all float64; the Hessian
    is symmetric by construction.
    """
    v = np.asarray(v, dtype=np.float64)
    if v.ndim == 1:
        v = v[None, :]
    n_pts = v.shape[0]

    c_x, c_y = 1.0 / 6.0, 1.0 / 3.0

    # First corner
    i = np.floor(v + np.sum(v, axis=1, keepdims=True) * c_y)
    x0 = v - i + np.sum(i, axis=1, keepdims=True) * c_x

    # Other corners (branchless simplex-corner ordering, per the paper)
    g = (x0 >= x0[:, [1, 2, 0]]).astype(np.float64)  # step(x0.yzx, x0.xyz)
    inv = 1.0 - g
    l_zxy = inv[:, [2, 0, 1]]
    i1 = np.minimum(g, l_zxy)
    i2 = np.maximum(g, l_zxy)

    x1 = x0 - i1 + c_x
    x2 = x0 - i2 + 2.0 * c_x
    x3 = x0 - 0.5  # = x0 - 1 + 3*C.x

    # Permutations — EXACT integer hash (module-docstring deviation).
    # i comes from floor(): exact integers stored in f64; negatives fold
    # into [0, 289) via Python-style mod (the WGSL port normalizes its
    # truncated i32 % the same way).
    i_int = np.mod(i.astype(np.int64), PERM_MOD_I)
    i1_int = i1.astype(np.int64)  # components are exactly 0 or 1
    i2_int = i2.astype(np.int64)
    zero = np.zeros(n_pts, dtype=np.int64)
    one = np.ones(n_pts, dtype=np.int64)
    corner_z = np.stack([zero, i1_int[:, 2], i2_int[:, 2], one], axis=1)
    corner_y = np.stack([zero, i1_int[:, 1], i2_int[:, 1], one], axis=1)
    corner_x = np.stack([zero, i1_int[:, 0], i2_int[:, 0], one], axis=1)
    p = _permute_int(
        _permute_int(_permute_int(i_int[:, 2:3] + corner_z) + i_int[:, 1:2] + corner_y)
        + i_int[:, 0:1]
        + corner_x
    )

    # Gradient selection: 7x7 points over a square mapped onto an
    # octahedron — ALL selection decisions in exact integers. In 1/14
    # units: gx = (4 x' - 13)/14, gy = (4 y' - 13)/14 (odd numerators,
    # never zero), fold height gh = (14 - |ax| - |ay|)/14; the fold
    # (gh <= 0) shifts the larger axis by +-1 exactly as the float
    # b0/s0/sh dance does — but the gh == 0 edge (|ax| + |ay| == 14
    # exists, e.g. x'=0, y'=3) is now decided identically in every
    # precision.
    j = p % 49
    x_ = j // 7
    y_ = j % 7
    ax = 4 * x_ - 13
    ay = 4 * y_ - 13
    gh_num = 14 - np.abs(ax) - np.abs(ay)
    interior = gh_num > 0
    sx = np.where(ax < 0, -1, 1)
    sy = np.where(ay < 0, -1, 1)
    px_num = np.where(interior, ax, ax - 14 * sx)
    py_num = np.where(interior, ay, ay - 14 * sy)
    grads = (
        np.stack([px_num, py_num, gh_num], axis=2).astype(np.float64) / 14.0
    )  # (N, 4, 3)
    norm = _taylor_inv_sqrt(np.sum(grads * grads, axis=2))
    grads = grads * norm[:, :, None]

    corners = np.stack([x0, x1, x2, x3], axis=1)  # (N, 4, 3)

    r2 = np.sum(corners * corners, axis=2)  # (N, 4)
    m = np.maximum(FALLOFF - r2, 0.0)
    m2 = m * m
    m3 = m2 * m
    m4 = m2 * m2
    pdotx = np.sum(grads * corners, axis=2)  # (N, 4)

    value = SCALE * np.sum(m4 * pdotx, axis=1)

    # grad = S * sum[ -8 m^3 (p.x) x + m^4 p ]
    grad = SCALE * np.sum(
        (-8.0 * m3 * pdotx)[:, :, None] * corners + m4[:, :, None] * grads,
        axis=1,
    )

    # hess = S * sum[ 48 m^2 (p.x) x x^T - 8 m^3 (x p^T + p x^T) - 8 m^3 (p.x) I ]
    xxt = corners[:, :, :, None] * corners[:, :, None, :]  # (N,4,3,3)
    xpt = corners[:, :, :, None] * grads[:, :, None, :]
    pxt = grads[:, :, :, None] * corners[:, :, None, :]
    eye = np.eye(3)[None, None, :, :]
    hess = SCALE * np.sum(
        (48.0 * m2 * pdotx)[:, :, None, None] * xxt
        - (8.0 * m3)[:, :, None, None] * (xpt + pxt)
        - (8.0 * m3 * pdotx)[:, :, None, None] * eye,
        axis=1,
    )

    return value, grad, hess
