"""Featherstone Articulated-Body Algorithm — forward dynamics (Stack E / Warp).

ABA (Featherstone 2008, Ch. 7 §7.3 "The Articulated-Body Algorithm", pp.
123-131) is the O(n) reduced/generalized-coordinate forward-dynamics algorithm:
given joint state ``(q, qd)`` and applied joint torques ``tau``, it returns the
generalized accelerations ``qdd`` via three passes over the kinematic tree
(pass 1 outward velocity/bias propagation; pass 2 inward articulated-inertia
propagation; pass 3 outward acceleration propagation). It avoids forming the
joint-space inertia matrix ``H(q)`` explicitly — contrast the composite-rigid-
body + RNEA dense formulation used as the independent test oracle.

D-ALGO (charter §6, operator-ratified): **ABA, reduced-coordinate** (spec §5.8's
"maximal-coordinate" is the verified error — corrigendum A-1 in
``docs/spec-amendments-proposed.md``).

D-DET (charter §6): bit-exact same-stack-same-hw. The forward dynamics run on
the Warp CPU backend with a single-threaded ``wp.launch`` (serial reduction
order) and ``dtype=wp.float64`` throughout — the determinism mechanism shared
with mpm-multimaterial-stack-e (Warp analog of Taichi ``cpu_max_num_threads=1``).

Stage 1a: ``aba_forward_dynamics`` raises ``NotImplementedError``; the planar
spatial-vector recursion (Plücker coordinates; joint motion subspace; spatial
inertia / cross products per Featherstone Ch. 2-3) lands as a ``@wp.kernel`` at
Stage 1b. See ``docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md``.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .model import ArticulatedChain

_STAGE_1B = (
    "articulated-pedagogical ABA forward dynamics Stage 1a scaffold: the planar "
    "spatial-vector ABA recursion lands as a Warp @wp.kernel at Stage 1b. See "
    "docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md (Featherstone "
    "Ch. 7 §7.3, pp. 123-131) + spec-ref.md §5."
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
    raise NotImplementedError(_STAGE_1B)


__all__ = ["aba_forward_dynamics"]
