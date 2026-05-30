"""``DeterminismDeclaration`` — per-solver Newton determinism posture (§4.2.D, spec §6.5)."""

from __future__ import annotations

from dataclasses import dataclass

#: Per-solver determinism posture (Newton 1.0 docs; §4.2.D docstring):
#: MuJoCo Warp is bit-exact on identical hardware; Featherstone + semi_implicit
#: are deterministic; XPBD is deterministic given fixed iteration order; Kamino
#: and VBD have stochastic contact resolution (non-deterministic by design).
_SOLVER_POSTURE: dict[str, str] = {
    "mujoco_warp": "bit-exact-same-hw",
    "featherstone": "bit-exact-same-hw",
    "semi_implicit": "bit-exact-same-hw",
    "xpbd": "bit-exact-same-hw",
    "kamino": "non-deterministic-by-design",
    "vbd": "non-deterministic-by-design",
}

_VALID_POSTURES = ("bit-exact-same-hw", "epsilon-bounded", "non-deterministic-by-design")


@dataclass
class DeterminismDeclaration:
    """Per-solver, per-hardware determinism declaration (spec §6.5).

    ``posture`` is one of ``bit-exact-same-hw`` | ``epsilon-bounded`` |
    ``non-deterministic-by-design``.
    """

    posture: str
    solver: str
    hardware_class: str
    epsilon: float = 0.0
    notes: str = ""

    def __post_init__(self) -> None:
        if self.posture not in _VALID_POSTURES:
            raise ValueError(f"Unknown posture {self.posture!r}; choose from {_VALID_POSTURES}.")

    @classmethod
    def for_solver(
        cls, solver: str, *, hardware_class: str = "cpu", notes: str = ""
    ) -> DeterminismDeclaration:
        """Construct the standard declaration for a Newton solver."""
        if solver not in _SOLVER_POSTURE:
            raise ValueError(f"Unknown solver {solver!r}; no determinism posture registered.")
        return cls(
            posture=_SOLVER_POSTURE[solver],
            solver=solver,
            hardware_class=hardware_class,
            notes=notes,
        )
