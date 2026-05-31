# mypy: ignore-errors
"""Tape-differentiable smoke-step Warp kernels (IC-12 dedicated kernel module; F-RB-3).

The landed ``eulerian-smoke-stack-e`` reference's primitives are NumPy-marshalling wrappers
(``wp.from_numpy(...)`` → ``wp.launch`` → ``out.numpy()``) — the ``.numpy()`` round-trip severs
the ``wp.Tape``. The differentiable variant therefore re-implements the two load-bearing smoke
primitives as **on-device** ``requires_grad`` ``@wp.kernel`` s recorded inside a single
``wp.Tape``:

* :func:`sl_advect_2d` — bilinear semi-Lagrangian backtrace gather. Mirrors the reference
  ``_sl_advect_2d_k`` (in ``eulerian_smoke_stack_e.reference.stable_fluids_warp``, lines
  83-114) op-order verbatim (``_pmod`` positive-modulus + ``wp.int32(xb) % n`` base node +
  bilinear combine order) so forward-equivalence to the reference holds bit-exact. The
  data-dependent integer base node ``wp.int32(xb)`` is non-differentiable (zero-gradient cell
  selector); the bilinear weights ``fx,fy`` carry the gradient → the adjoint is the exact
  transpose ``Mᵀ`` of the linear advect operator *within a cell* (probe: rel 1.1e-16 vs the
  analytic operator under a constant velocity).
* :func:`diffuse_2d` — one explicit-diffusion step ``u' = u + dt·nu·∇²u`` with the 5-point
  periodic Laplacian (mirrors the reference ``_lap5_k`` lines 161-177). ``nu`` is a length-1
  ``requires_grad`` array so ``∂Loss/∂nu`` flows (the A3 anchor).

:func:`load_field_2d` copies the flat ``requires_grad`` parameter vector (``ParamSpec.flat``)
into the 2D field-0 INSIDE the tape (a linear copy → the gradient flows back to the params).
:func:`accumulate_l2_2d` is the 2D L2 objective (the base ``common_warp`` ``accumulate_l2`` is
1-D; the smoke fields are 2D, so the subclass overrides ``loss`` with this).

DETERMINISM (D9): the forward advect/diffuse are pure per-cell gathers (NO atomic scatter →
``forward`` row ``atomic_ops = none``); the L2 reduction + the gather adjoint use
``wp.atomic_add`` (sum reduction → ``gradient`` row ``atomic_ops = sum-only``). Warp CPU
``wp.launch`` is single-thread serial → bit-identical run-to-run (bit-exact-same-hw).
``# mypy: ignore-errors`` per F-RB-3 (Warp ships partial type stubs).
"""

import warp as wp

ONE = wp.float64(1.0)


@wp.func
def _pmod(x: wp.float64, n: wp.float64) -> wp.float64:
    # NumPy-positive modulus (np.mod): result carries the divisor's sign. Mirrors the
    # reference `_pmod` (stable_fluids_warp.py lines 77-80).
    return x - n * wp.floor(x / n)


@wp.kernel
def load_field_2d(
    flat: wp.array(dtype=wp.float64, ndim=1),
    ny: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=2),
):
    """Tape-safe linear copy ``out[i, j] = flat[i*ny + j]`` (params → field-0)."""
    i, j = wp.tid()
    out[i, j] = flat[i * ny + j]


@wp.kernel
def sl_advect_2d(
    field: wp.array(dtype=wp.float64, ndim=2),
    u: wp.array(dtype=wp.float64, ndim=2),
    v: wp.array(dtype=wp.float64, ndim=2),
    dt: wp.float64,
    dx: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=2),
):
    """Bilinear semi-Lagrangian backtrace gather (reference ``_sl_advect_2d_k`` op-order)."""
    i, j = wp.tid()
    xb = _pmod(wp.float64(i) - u[i, j] * dt / dx, wp.float64(nx))
    yb = _pmod(wp.float64(j) - v[i, j] * dt / dx, wp.float64(ny))
    i0 = wp.int32(xb) % nx
    j0 = wp.int32(yb) % ny
    i1 = (i0 + 1) % nx
    j1 = (j0 + 1) % ny
    fx = xb - wp.float64(i0)
    fy = yb - wp.float64(j0)
    out[i, j] = (
        (ONE - fx) * (ONE - fy) * field[i0, j0]
        + (ONE - fx) * fy * field[i0, j1]
        + fx * (ONE - fy) * field[i1, j0]
        + fx * fy * field[i1, j1]
    )


@wp.kernel
def diffuse_2d(
    field: wp.array(dtype=wp.float64, ndim=2),
    nu: wp.array(dtype=wp.float64, ndim=1),
    dt: wp.float64,
    inv_dx2: wp.float64,
    nx: wp.int32,
    ny: wp.int32,
    out: wp.array(dtype=wp.float64, ndim=2),
):
    """Explicit-diffusion step ``u' = u + dt·nu·∇²u`` (5-point periodic Laplacian)."""
    i, j = wp.tid()
    im = (i - 1 + nx) % nx
    ip = (i + 1) % nx
    jm = (j - 1 + ny) % ny
    jp = (j + 1) % ny
    lap = (
        field[im, j] + field[ip, j] + field[i, jm] + field[i, jp] - wp.float64(4.0) * field[i, j]
    ) * inv_dx2
    out[i, j] = field[i, j] + dt * nu[0] * lap


@wp.kernel
def accumulate_l2_2d(
    pred: wp.array(dtype=wp.float64, ndim=2),
    tgt: wp.array(dtype=wp.float64, ndim=2),
    loss: wp.array(dtype=wp.float64, ndim=1),
):
    """2D L2 objective ``Σ_ij (pred - tgt)²`` accumulated into ``loss[0]``."""
    i, j = wp.tid()
    d = pred[i, j] - tgt[i, j]
    wp.atomic_add(loss, 0, d * d)
