"""Analytic Poisson boundary-value problems on the unit square ``[0,1]^2``.

The verification ground truth for ``pinn-poisson``: three **independent-reference**
closed-form solutions of ``Du = f`` with Dirichlet boundary data ``u = g`` on
``∂Ω``. These are the analytic anchors the golden tables (Cat-3), the classical
FD reference, and the trained PINN are all measured against.

Each closed form is **backend-generic**: ``u_exact``/``source`` take an array module
``xp`` (``numpy`` for golden tables + FD + verification; ``torch`` for the PINN
interior/boundary loss), so the SAME formula drives both sides — no risk of a
numpy-vs-torch transcription drift (asserted in ``tests/test_analytic_problems.py``).

Anchors (all verified symbolically — see ``docs`` derivation H):

- **Anchor 1** — ``u = 1/2 · ln((x+1/2)^2 + (y+1/2)^2)`` — *harmonic* (``f=0``),
  the 2D fundamental solution with its singularity placed OUTSIDE ``Ω`` at
  ``(-1/2,-1/2)`` so it is smooth on ``[0,1]^2``. Reference: Evans, *PDE* 2e
  **§ 2.2 "Laplace's Equation"** (§ 2.2.1 fundamental solution
  ``Φ = -1/2π · log|x|``, ``n=2``).
- **Anchor 2** — ``u = sinh(πx) sin(πy)`` — *harmonic* (``f=0``), the
  separation-of-variables solution of Laplace on a rectangle (non-zero Dirichlet
  data only on the ``x=1`` edge). Reference: Strauss, *PDE* 2e **§ 6.2
  "Rectangles and Cubes"**.
- **Anchor 3** — ``u = sin(πx) sin(πy) → f = -2π^2 sin(πx) sin(πy)`` — the
  load-bearing **inhomogeneous (``f≠0``) MMS** case with zero Dirichlet BC.
  Reference: hand-derived (method of manufactured solutions).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np

# An array module exposing ``pi``, ``sin``, ``sinh``, ``log`` and broadcasting
# arithmetic. Both ``numpy`` and ``torch`` satisfy this structurally; typed
# ``Any`` because numpy/torch share no nominal base.
ArrayModule = Any
ArrayLike = Any

_ClosedForm = Callable[[ArrayLike, ArrayLike, ArrayModule], ArrayLike]


@dataclass(frozen=True)
class PoissonProblem:
    """A Dirichlet BVP ``Du = f`` on ``[0,1]^2`` with a known closed-form solution.

    ``u_exact`` is the analytic solution; ``source`` is ``f = Du``; the Dirichlet
    boundary value ``g`` is the trace of ``u_exact`` on ``∂Ω`` (``boundary_value``).
    """

    name: str
    reference: str
    harmonic: bool
    _u: _ClosedForm
    _f: _ClosedForm

    def u_exact(self, x: ArrayLike, y: ArrayLike, xp: ArrayModule = np) -> ArrayLike:
        """Analytic solution ``u(x, y)`` evaluated with array module ``xp``."""
        return self._u(x, y, xp)

    def source(self, x: ArrayLike, y: ArrayLike, xp: ArrayModule = np) -> ArrayLike:
        """Source term ``f(x, y) = Du`` evaluated with array module ``xp``."""
        return self._f(x, y, xp)

    def boundary_value(self, x: ArrayLike, y: ArrayLike, xp: ArrayModule = np) -> ArrayLike:
        """Dirichlet datum ``g = u`` on the boundary (trace of the exact solution)."""
        return self._u(x, y, xp)


def _anchor1_u(x: ArrayLike, y: ArrayLike, xp: ArrayModule) -> ArrayLike:
    # 1/2 ln((x+1/2)^2 + (y+1/2)^2): fundamental solution, singularity at (-1/2,-1/2).
    return 0.5 * xp.log((x + 0.5) ** 2 + (y + 0.5) ** 2)


def _anchor2_u(x: ArrayLike, y: ArrayLike, xp: ArrayModule) -> ArrayLike:
    return xp.sinh(xp.pi * x) * xp.sin(xp.pi * y)


def _anchor3_u(x: ArrayLike, y: ArrayLike, xp: ArrayModule) -> ArrayLike:
    return xp.sin(xp.pi * x) * xp.sin(xp.pi * y)


def _zero_source(x: ArrayLike, y: ArrayLike, xp: ArrayModule) -> ArrayLike:
    # f = 0 for the two harmonic anchors (broadcast-shaped to x).
    return x * 0.0


def _anchor3_source(x: ArrayLike, y: ArrayLike, xp: ArrayModule) -> ArrayLike:
    # f = Du3 = -2 pi^2 sin(pi x) sin(pi y).
    return -2.0 * (xp.pi**2) * xp.sin(xp.pi * x) * xp.sin(xp.pi * y)


ANCHOR1 = PoissonProblem(
    name="anchor1-harmonic-fundamental",
    reference="Evans PDE 2e § 2.2 (§ 2.2.1 fundamental solution, n=2)",
    harmonic=True,
    _u=_anchor1_u,
    _f=_zero_source,
)

ANCHOR2 = PoissonProblem(
    name="anchor2-harmonic-separation",
    reference="Strauss PDE 2e § 6.2 'Rectangles and Cubes'",
    harmonic=True,
    _u=_anchor2_u,
    _f=_zero_source,
)

ANCHOR3 = PoissonProblem(
    name="anchor3-mms-sine-source",
    reference="hand-derived MMS (f = -2 pi^2 sin(pi x) sin(pi y), zero Dirichlet BC)",
    harmonic=False,
    _u=_anchor3_u,
    _f=_anchor3_source,
)

#: The three independent-reference anchors, in golden-table order.
ANCHORS: tuple[PoissonProblem, ...] = (ANCHOR1, ANCHOR2, ANCHOR3)

#: The load-bearing inhomogeneous case the PINN is trained on + captured at
#: (descriptor ``poisson-sine-source-64sq-seed42-step1``).
CANONICAL_PROBLEM = ANCHOR3


def anchor_by_name(name: str) -> PoissonProblem:
    """Look up an anchor by its ``name`` (raises ``KeyError`` if unknown)."""
    for problem in ANCHORS:
        if problem.name == name:
            return problem
    raise KeyError(f"unknown anchor {name!r}; known: {[p.name for p in ANCHORS]}")
