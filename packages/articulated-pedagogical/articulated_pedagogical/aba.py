# mypy: ignore-errors
# ^ Warp-orchestration surface: `wp.zeros` / `wp.array` / `wp.launch` /
#   `wp.float64` / `.numpy()` read as untyped calls under `mypy --strict` (Warp
#   ships partial types). The public signature (`aba_forward_dynamics(...) ->
#   NDArray[np.floating]`) is still honored by importers. See F-RB-3 +
#   `_warp_kernels.py`.
"""Featherstone Articulated-Body Algorithm — forward dynamics (Stack E / Warp).

ABA (Featherstone 2008, Ch. 7 §7.3 "The Articulated-Body Algorithm", pp.
123-131) is the O(n) reduced/generalized-coordinate forward-dynamics algorithm:
given joint state ``(q, qd)`` and applied joint torques ``tau``, it returns the
generalized accelerations ``qdd`` via three passes over the kinematic tree. It
avoids forming the joint-space inertia matrix ``H(q)`` explicitly — contrast the
composite-rigid-body + RNEA dense formulation used as the independent test
oracle.

D-ALGO (charter §6, operator-ratified): **ABA, reduced-coordinate** (spec §5.8's
"maximal-coordinate" is the verified error — corrigendum A-1 in
``docs/spec-amendments-proposed.md``).

D-DET (charter §6): bit-exact same-stack-same-hw. The recursion runs in a
single-threaded ``wp.launch`` (``dim=1``) on the Warp CPU backend with
``dtype=wp.float64`` throughout (the determinism mechanism shared with
mpm-multimaterial-stack-e). The planar spatial-vector kernel lives in
``_warp_kernels.py``.
"""

from __future__ import annotations

import common_warp
import numpy as np
import warp as wp
from numpy.typing import NDArray

from ._warp_kernels import aba_kernel
from .model import ArticulatedChain

_DEVICE = "cpu"


def _f64_array(values: NDArray[np.floating]) -> wp.array:
    return wp.array(
        np.ascontiguousarray(values, dtype=np.float64), dtype=wp.float64, device=_DEVICE
    )


def aba_forward_dynamics(
    chain: ArticulatedChain,
    q: NDArray[np.floating],
    qd: NDArray[np.floating],
    tau: NDArray[np.floating] | None = None,
) -> NDArray[np.floating]:
    """Return generalized accelerations ``qdd`` for state ``(q, qd)``.

    ``tau`` defaults to zero (free, frictionless joints — gravity is the only
    generalized force). ``q``, ``qd`` are length-``n_links`` joint-space arrays.
    """
    n = chain.n_links
    q = np.asarray(q, dtype=np.float64)
    qd = np.asarray(qd, dtype=np.float64)
    if q.shape != (n,) or qd.shape != (n,):
        raise ValueError(f"q and qd must have shape ({n},); got {q.shape}, {qd.shape}")
    tau_arr = np.zeros(n, dtype=np.float64) if tau is None else np.asarray(tau, dtype=np.float64)

    # Idempotent; selects the CPU backend (serial wp.launch = determinism).
    common_warp.init(_DEVICE, deterministic=True)

    q_w = _f64_array(q)
    qd_w = _f64_array(qd)
    tau_w = _f64_array(tau_arr)
    length_w = _f64_array(np.array(chain.lengths))
    cdist_w = _f64_array(np.array(chain.com_distances))
    mass_w = _f64_array(np.array(chain.masses))
    inertia_w = _f64_array(np.array(chain.inertias))

    jpos = wp.zeros(n, dtype=wp.vec2d, device=_DEVICE)
    cpos = wp.zeros(n, dtype=wp.vec2d, device=_DEVICE)
    smot = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE)
    vel = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE)
    ia = wp.zeros(n, dtype=wp.mat33d, device=_DEVICE)
    pa = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE)
    uvec = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE)
    dscalar = wp.zeros(n, dtype=wp.float64, device=_DEVICE)
    uscalar = wp.zeros(n, dtype=wp.float64, device=_DEVICE)
    accel = wp.zeros(n, dtype=wp.vec3d, device=_DEVICE)
    qdd = wp.zeros(n, dtype=wp.float64, device=_DEVICE)

    wp.launch(
        aba_kernel,
        dim=1,
        inputs=[
            q_w,
            qd_w,
            tau_w,
            length_w,
            cdist_w,
            mass_w,
            inertia_w,
            wp.float64(0.0),
            wp.float64(-float(chain.gravity)),
            wp.int32(n),
            jpos,
            cpos,
            smot,
            vel,
            ia,
            pa,
            uvec,
            dscalar,
            uscalar,
            accel,
            qdd,
        ],
        device=_DEVICE,
    )
    return qdd.numpy().astype(np.float64)


__all__ = ["aba_forward_dynamics"]
