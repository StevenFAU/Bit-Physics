"""Common ODE-system protocol + registry (spec-ref § 5 implementation contract).

``System`` is the per-attractor record the sim layer, tests, captures and
the web attractor registry all read: the vector field, its canonical
parameters, and the canonical run configuration (IC / dt / step count)
calibrated at implementation time against the step-halving sanity probe
(spec § 6.2 posture; results recorded in each golden derivation doc).

The chartered family is *Lorenz, Rössler, Aizawa, Sprott-A, Pickover*
(spec-ref § 1). Pickover is **deferred-with-cause** (operator-voidable):
the commonly cataloged form (algebraic.md § 6) integrates as an ODE but is
not a strange attractor — measured 2026-07-03, trajectories either diverge
unboundedly in y (max|y| > 2e4 from 3 of 4 probe ICs) or converge to a
stable fixed point. It is the classical discrete *map*, mislabeled with
dots; shipping it would need a map iterator, which spec-ref § 3 (RK4-only)
excludes.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass, field as dc_field
from types import MappingProxyType

import numpy as np

from .reference.aizawa import aizawa_field
from .reference.lorenz import lorenz_field
from .reference.rossler import rossler_field
from .reference.sprott import sprott_a_field

FieldFn = Callable[..., np.ndarray]


@dataclass(frozen=True)
class System:
    """One chartered attractor: field + canonical run configuration.

    Calling the instance evaluates the field at the canonical parameters
    (the ``f(x, t)`` protocol shape; ``t`` is accepted and ignored —
    every chartered field is autonomous).
    """

    name: str
    field: FieldFn
    canonical_params: Mapping[str, float]
    canonical_ic: tuple[float, float, float]
    canonical_dt: float
    canonical_step_count: int
    canonical_capture_interval: int
    ic_jitter_scale: float = 1e-6
    #: volume-preserving (div f integrates to zero) — drives which PBT
    #: invariant class applies (spec-ref § 6.6)
    conservative: bool = False
    notes: str = dc_field(default="")

    def __call__(self, state: np.ndarray, t: float | None = None) -> np.ndarray:
        _ = t
        return self.field(state, **dict(self.canonical_params))

    @property
    def descriptor(self) -> str:
        return f"{self.name}-trajectory-seed42-step{self.canonical_step_count}"

    def seeded_initial_condition(self, seed: int) -> np.ndarray:
        rng = np.random.default_rng(int(seed))
        jitter = self.ic_jitter_scale * rng.standard_normal(3)
        return np.asarray(self.canonical_ic, dtype=np.float64) + jitter


def _sys(**kw: object) -> System:
    kw["canonical_params"] = MappingProxyType(dict(kw["canonical_params"]))  # type: ignore[arg-type]
    return System(**kw)  # type: ignore[arg-type]


#: The implemented family. Canonical dt / IC / horizon per system were
#: calibrated 2026-07-03 with the RK4 step-halving probe (halving error over
#: the first 10% of the horizon ≤ 3.1e-7 for every row; full-horizon
#: trajectories finite and bounded) — details in each system's
#: tools/testkit/golden/derivations/<name>-structural.md § "calibration".
SYSTEMS: Mapping[str, System] = MappingProxyType(
    {
        "lorenz": _sys(
            name="lorenz",
            field=lorenz_field,
            canonical_params={"sigma": 10.0, "rho": 28.0, "beta": 8.0 / 3.0},
            canonical_ic=(1.0, 1.0, 1.0),
            canonical_dt=0.01,
            canonical_step_count=10000,
            canonical_capture_interval=1000,
            notes="Lorenz 1963; the Phase-1 canonical.",
        ),
        "rossler": _sys(
            name="rossler",
            field=rossler_field,
            canonical_params={"a": 0.2, "b": 0.2, "c": 5.7},
            canonical_ic=(1.0, 1.0, 1.0),
            canonical_dt=0.02,
            canonical_step_count=10000,
            canonical_capture_interval=1000,
            notes="Rössler 1976 single-scroll; slower timescale than Lorenz, "
            "dt=0.02 covers ~30 orbits in the canonical horizon.",
        ),
        "aizawa": _sys(
            name="aizawa",
            field=aizawa_field,
            canonical_params={
                "a": 0.95,
                "b": 0.7,
                "c": 0.6,
                "d": 3.5,
                "e": 0.25,
                "f": 0.1,
            },
            canonical_ic=(0.1, 0.0, 0.0),
            canonical_dt=0.01,
            canonical_step_count=10000,
            canonical_capture_interval=1000,
            notes="Aizawa 1982 / Sprott 2003 catalog form; spherical shell + spike.",
        ),
        "sprott_a": _sys(
            name="sprott_a",
            field=sprott_a_field,
            canonical_params={},
            canonical_ic=(0.0, 5.0, 0.0),
            canonical_dt=0.01,
            canonical_step_count=10000,
            canonical_capture_interval=1000,
            conservative=True,
            notes="Sprott 1994 case A (= Nosé–Hoover oscillator): conservative, "
            "no equilibria; IC (0, 5, 0) sits in the chaotic sea.",
        ),
    }
)


def get_system(name: str) -> System:
    try:
        return SYSTEMS[name]
    except KeyError:
        raise KeyError(
            f"unknown attractor {name!r}; implemented: {sorted(SYSTEMS)}"
        ) from None


__all__ = ["SYSTEMS", "FieldFn", "System", "get_system"]
