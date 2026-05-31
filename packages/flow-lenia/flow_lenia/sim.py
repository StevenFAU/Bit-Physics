"""FlowLeniaSim — Stack-D Taichi-backed Flow Lenia (mass-conservative, reintegration tracking).

The engine convolves the affinity ``U = K * A`` (``convolve``), computes the flow ``F = ∇U``
(``flow_field``), and transports the mass by reintegration tracking (``reintegrate`` — forward
bilinear splat, ``ti.atomic_add`` scatter; mass-conserving to summation roundoff). Determinism via
``common_py.determinism.set_taichi_deterministic(config, arch="cpu")`` (single-thread serial fixes
the scatter order → bit-identical run-to-run; the mass INVARIANT is conserved to ~Nε — distinct from
the run-to-run determinism). The mass-conservation / non-negativity / zero-flow invariants are the
rigorous moat (verified vs the NumPy reference in :mod:`.forward`).
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from .forward import FlowLeniaConfig, gaussian_kernel, initial_mass

__all__ = ["FlowLeniaSim"]


class FlowLeniaSim:
    """Stack-D Taichi-backed Flow Lenia sim (mass-conservative reintegration tracking)."""

    def __init__(self, config: FlowLeniaConfig) -> None:
        self.config = config
        self._taichi_initialized = False
        self._a = initial_mass(config)
        self._kernel = gaussian_kernel(config.kernel_radius, config.kernel_sigma)
        n = config.grid
        self._u = np.zeros((n, n), dtype=np.float64)
        self._fx = np.zeros((n, n), dtype=np.float64)
        self._fy = np.zeros((n, n), dtype=np.float64)
        self._next = np.zeros((n, n), dtype=np.float64)

    def _ensure_taichi(self) -> None:
        if self._taichi_initialized:
            return
        from common_py.determinism import Config as DeterminismConfig
        from common_py.determinism import set_taichi_deterministic

        det_cfg = DeterminismConfig(deterministic=True, seed=int(self.config.seed))
        set_taichi_deterministic(det_cfg, arch="cpu")
        self._taichi_initialized = True

    def step(self) -> None:
        """Advance one mass-conservative step (convolve → flow → reintegrate)."""
        self._ensure_taichi()
        from . import _taichi_kernels as _k

        cfg = self.config
        n = cfg.grid
        _k.convolve(self._a, self._kernel, self._u, n, cfg.kernel_radius)
        _k.flow_field(self._u, self._fx, self._fy, n)
        self._next.fill(0.0)  # reintegrate scatters via atomic_add into a zeroed buffer
        _k.reintegrate(self._a, self._fx, self._fy, self._next, n, float(cfg.dt))
        np.copyto(self._a, self._next)

    def mass_field(self) -> NDArray[np.float64]:
        """Return the current mass field as a NumPy 2-D float64 array."""
        return self._a.copy()

    def capture(self, out_dir: str | Path) -> Path:
        """Write the canonical Flow Lenia rollout capture; return the manifest path.

        Consumes :class:`common_py.capture.Writer` (IC-2 API ``write_step`` + ``finalize``). Each
        step stores the ``(grid, grid)`` mass field ``A``."""
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
        descriptor = f"flow-lenia-{cfg.grid}sq-seed{cfg.seed}-step{cfg.steps}"
        manifest_path = out_dir / f"{descriptor}.json"
        payload_path = out_dir / f"{descriptor}.h5"

        manifest = Manifest(
            schema_version="1.0.0",
            sim=SimMeta(name="flow-lenia", category="continuous-ca", variant="frontier-flow-lenia"),
            stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
            config=ConfigMeta(
                tier="reference",
                dims=[cfg.grid, cfg.grid],
                dtype="f64",
                seed=int(cfg.seed),
                params={
                    "kernel_radius": int(cfg.kernel_radius),
                    "kernel_sigma": float(cfg.kernel_sigma),
                    "dt": float(cfg.dt),
                    "scheme": "reintegration-tracking",
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
                claimed="bit-exact-same-hw", atomic_ops=True, subgroup_ops=False
            ),
        )

        writer = Writer(manifest_path, manifest)
        t0 = time.perf_counter()
        writer.write_step(0, StepData(fields={"A": self.mass_field()}))
        for s in range(1, cfg.steps + 1):
            self.step()
            writer.write_step(s, StepData(fields={"A": self.mass_field()}))
        manifest.run.wall_clock_seconds = float(time.perf_counter() - t0)
        writer.finalize()
        return manifest_path
