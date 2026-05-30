"""``NewtonBackend`` — thin wrapper around the NVIDIA Newton 1.0 GA solver (§4.2.D).

The Adapter that insulates Phase-4.5's rigid-body sims (4.23-4.25) from Newton's
1.0→2.0 API churn. The runtime (solver stepping) requires the ``newton`` package
+ CUDA 12 / driver 545+; on a CPU-only host (or without ``newton`` installed) the
runtime is **BLOCKED** and the runtime methods raise a clear ``RuntimeError``
(operator-ratified CPU-fallback per spec §12.8 + plan §7.5 v9 addendum — surfaced
loudly, never silently no-op'd). The metadata surface (``SOLVERS``, solver
validation, ``determinism_declaration``) is available without ``newton``/CUDA so
consumers and tests can resolve the contract on any host.
"""

from __future__ import annotations

from .determinism import DeterminismDeclaration
from .state import NewtonState

_NEWTON_BLOCKED_MSG = (
    "Newton solver runtime is unavailable: the `newton` package and/or a CUDA 12 "
    "(driver 545+) device is required. The Phase-4.0 build host is CPU-only, so "
    "the Newton runtime is BLOCKED (operator-ratified CPU-fallback per spec §12.8 "
    "+ plan §7.5). The metadata surface (SOLVERS, determinism_declaration, USD "
    "scene template + capture-to-USD export) is available on CPU; solver stepping "
    "is not. This is surfaced loudly, not silently degraded."
)


def _newton_runtime_available() -> bool:
    """True iff the ``newton`` package imports AND a CUDA device is present."""
    try:
        import newton  # noqa: F401
        import warp as wp
    except ImportError:
        return False
    try:
        return bool(wp.get_cuda_device_count())
    except Exception:
        return False


class NewtonBackend:
    """Wrapper around NVIDIA Newton 1.0 GA. ``.newton_instance`` is the escape hatch."""

    # All six solvers per Newton 1.0 GA + Isaac Sim 6.0 docs.
    SOLVERS = (
        "mujoco_warp",
        "kamino",
        "xpbd",
        "featherstone",
        "semi_implicit",
        "vbd",
    )

    def __init__(
        self,
        *,
        usd_path: str,
        solver: str = "mujoco_warp",
        dt: float = 1.0 / 60.0,
        substeps: int = 1,
    ) -> None:
        """Validate config; defer Newton load until runtime (CUDA-gated)."""
        if solver not in self.SOLVERS:
            raise ValueError(f"Unknown solver: {solver!r}. Choose from {self.SOLVERS}.")
        if substeps < 1:
            raise ValueError(f"substeps must be >= 1; got {substeps}")
        self.usd_path = usd_path
        self.solver = solver
        self.dt = dt
        self.substeps = substeps
        self._available = _newton_runtime_available()
        self._sim: object | None = None

    def _require_runtime(self) -> None:
        if not self._available:
            raise RuntimeError(_NEWTON_BLOCKED_MSG)

    @property
    def newton_instance(self) -> object:
        """Underlying ``newton.Sim`` (escape hatch). Raises if runtime BLOCKED."""
        self._require_runtime()
        if self._sim is None:
            import newton

            self._sim = newton.Sim.from_usd(
                self.usd_path, solver=self.solver, dt=self.dt, substeps=self.substeps
            )
        return self._sim

    def step(self, n_steps: int = 1) -> None:
        """Advance the simulation ``n_steps`` steps. Requires the Newton runtime."""
        self._require_runtime()
        sim = self.newton_instance
        for _ in range(n_steps):
            sim.step()  # type: ignore[attr-defined]

    def state(self) -> NewtonState:
        """Snapshot the current sim state. Requires the Newton runtime."""
        self._require_runtime()
        s = self.newton_instance.state()  # type: ignore[attr-defined]
        return NewtonState(
            body_positions=s.body_q,
            body_orientations=s.body_quat,
            body_linear_velocities=s.body_qd_lin,
            body_angular_velocities=s.body_qd_ang,
            joint_positions=s.joint_q,
            joint_velocities=s.joint_qd,
            sim_time=float(s.time),
        )

    def reset_to_initial(self) -> None:
        """Reset the sim to its initial state. Requires the Newton runtime."""
        self._require_runtime()
        self.newton_instance.reset()  # type: ignore[attr-defined]

    @property
    def determinism_declaration(self) -> DeterminismDeclaration:
        """The per-solver determinism declaration (available without the runtime)."""
        return DeterminismDeclaration.for_solver(
            self.solver,
            hardware_class="cuda" if self._available else "cpu",
            notes=f"solver={self.solver}; runtime_available={self._available}",
        )
