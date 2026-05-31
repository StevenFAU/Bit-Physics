"""ParticleLeniaSim — Stack-D Taichi-backed Particle Lenia (energy-based, LOCAL rule).

The engine computes the per-particle force ``f_i = -∇E(p_i)`` in the Taichi kernel
``particle_lenia._taichi_kernels.particle_force`` (the analytic closed-form gradient; explicit f64
accumulators, single-thread serial → bit-exact same-stack-same-hw) and integrates forward Euler
``p_i ← p_i + dt·f_i``. Determinism via
``common_py.determinism.set_taichi_deterministic(config, arch="cpu")``.

The Taichi engine force is verified against the independent NumPy analytic mirror (A1), central FD
(A2), and the total-energy translation symmetry (A3) — see :mod:`.forward`. Particle Lenia uses the
canonical LOCAL rule, so the TOTAL energy is NOT monotonic (no Lyapunov golden); the rigorous moat
is the force/symmetry INVARIANT, not the traj.
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from .forward import ParticleLeniaConfig, initial_positions

__all__ = ["ParticleLeniaSim"]


class ParticleLeniaSim:
    """Stack-D Taichi-backed Particle Lenia sim (LOCAL energy-descent rule)."""

    def __init__(self, config: ParticleLeniaConfig) -> None:
        self.config = config
        self._taichi_initialized = False
        self._pos = initial_positions(config)
        n = config.n_particles
        self._force_np = np.zeros((n, 2), dtype=np.float64)
        self._next_np = np.zeros((n, 2), dtype=np.float64)

    def _ensure_taichi(self) -> None:
        if self._taichi_initialized:
            return
        from common_py.determinism import Config as DeterminismConfig
        from common_py.determinism import set_taichi_deterministic

        det_cfg = DeterminismConfig(deterministic=True, seed=int(self.config.seed))
        set_taichi_deterministic(det_cfg, arch="cpu")
        self._taichi_initialized = True

    def compute_force(self, positions: NDArray[np.float64] | None = None) -> NDArray[np.float64]:
        """Return the engine per-particle force ``f_i = -∇E(p_i)`` (``(N, 2)``; Taichi kernel)."""
        self._ensure_taichi()
        from . import _taichi_kernels as _k

        cfg = self.config
        pos = self._pos if positions is None else np.ascontiguousarray(positions, dtype=np.float64)
        force = np.zeros((cfg.n_particles, 2), dtype=np.float64)
        _k.particle_force(
            pos,
            force,
            cfg.n_particles,
            float(cfg.mu_k),
            float(cfg.sigma_k),
            float(cfg.w_k),
            float(cfg.mu_g),
            float(cfg.sigma_g),
            float(cfg.c_rep),
        )
        return force

    def step(self) -> None:
        """Advance one forward-Euler step ``p ← p + dt·(-∇E)``."""
        self._ensure_taichi()
        from . import _taichi_kernels as _k

        cfg = self.config
        _k.particle_force(
            self._pos,
            self._force_np,
            cfg.n_particles,
            float(cfg.mu_k),
            float(cfg.sigma_k),
            float(cfg.w_k),
            float(cfg.mu_g),
            float(cfg.sigma_g),
            float(cfg.c_rep),
        )
        _k.euler_step(self._pos, self._force_np, self._next_np, cfg.n_particles, float(cfg.dt))
        np.copyto(self._pos, self._next_np)

    def positions(self) -> NDArray[np.float64]:
        """Return the current positions as a NumPy ``(N, 2)`` float64 array."""
        return self._pos.copy()

    def capture(self, out_dir: str | Path) -> Path:
        """Write the canonical Particle Lenia rollout capture; return the manifest path.

        Consumes :class:`common_py.capture.Writer` (IC-2 API ``write_step(idx, data)`` +
        ``finalize()``). Each step stores the ``(N, 2)`` particle positions field ``P``."""
        from common_py.capture import (
            ConfigMeta,
            DeterminismMeta,
            Manifest,
            PayloadMeta,
            RunMeta,
            SimMeta,
            StackMeta,
            StepData,
            Writer,
        )

        cfg = self.config
        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        descriptor = f"particle-lenia-{cfg.n_particles}p-seed{cfg.seed}-step{cfg.steps}"
        manifest_path = out_dir / f"{descriptor}.json"
        payload_path = out_dir / f"{descriptor}.h5"

        manifest = Manifest(
            schema_version="1.0.0",
            sim=SimMeta(
                name="particle-lenia", category="continuous-ca", variant="frontier-particle-lenia"
            ),
            stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
            config=ConfigMeta(
                tier="reference",
                dims=[cfg.n_particles, 2],
                dtype="f64",
                seed=int(cfg.seed),
                params={
                    "mu_k": float(cfg.mu_k),
                    "sigma_k": float(cfg.sigma_k),
                    "w_k": float(cfg.w_k),
                    "mu_g": float(cfg.mu_g),
                    "sigma_g": float(cfg.sigma_g),
                    "c_rep": float(cfg.c_rep),
                    "dt": float(cfg.dt),
                    "rule": "local",
                },
            ),
            run=RunMeta(
                step_count=int(cfg.steps),
                capture_interval=1,
                wall_clock_seconds=0.0,
                start_utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            ),
            payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
            determinism=DeterminismMeta(
                claimed="bit-exact-same-hw", atomic_ops=False, subgroup_ops=False
            ),
        )

        writer = Writer(manifest_path, manifest)
        t0 = time.perf_counter()
        writer.write_step(0, StepData(fields={"P": self.positions()}))
        for s in range(1, cfg.steps + 1):
            self.step()
            writer.write_step(s, StepData(fields={"P": self.positions()}))
        manifest.run.wall_clock_seconds = float(time.perf_counter() - t0)
        writer.finalize()
        return manifest_path
