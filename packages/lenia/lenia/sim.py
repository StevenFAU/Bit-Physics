"""LeniaSim — Stack-D Taichi-backed reference Lenia.

Stage 1b implementation. Real-space Quad4 convolution in a
module-level ``@ti.kernel`` (``lenia._taichi_kernels.lenia_convolve``);
per-cell growth + clip-Euler update in
``lenia._taichi_kernels.lenia_update``. No atomic ops in the forward
conv (each thread writes to a unique ``(i, j)`` cell). Determinism via
:func:`common_py.determinism.set_taichi_deterministic(config, arch="cpu")`
per ``docs/common/taichi.md`` § 2 + § 7.3 D-DET.

Reduction-ordering posture (D-DET; mirrors RD-2D-Stack-D
``packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py``):

- **No in-kernel reductions.** The forward convolution is a per-cell
  inner accumulation written to a unique cell; no Taichi
  ``ti.atomic_*`` surface; no cross-cell accumulators.
- **Index-sorting / iteration-order pinning.** ``ti.ndrange(n, n)``
  + ``cpu_max_num_threads=1`` serializes the iteration in row-major;
  per-cell writes happen in a deterministic order.
- **RNG threading.** RNG entry is exclusively through ``numpy.random``
  in :func:`_init_orbium_field`; the Taichi kernels read only per-step
  ``(i, j)`` fields, never ``ti.random``.

Stage 1b lands the Orbium unicaudatus preset minimum
(``R=13``, ``T=10``, ``mu=0.15``, ``sigma=0.015``, ``kn=1``, ``gn=1``)
grep-cited from ``references/Chakazul-Lenia/Python/animals.json:5``.
The capture I/O uses :class:`common_py.capture.Writer`.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from .kernel import quad4_kernel

# Taichi-kernel module — IMPORTED lazily inside ``_ensure_taichi`` so
# the module-load doesn't pay the Taichi init cost.


@dataclass(frozen=True)
class LeniaConfig:
    """Lenia preset + grid + seed configuration.

    Defaults reflect the Orbium unicaudatus preset grep-cited from
    ``references/Chakazul-Lenia/Python/animals.json:5``
    (``R=13, T=10, m=0.15, s=0.015, kn=1, gn=1``); ``dt = 1.0 / T``
    per the Lenia convention. ``grid`` is the periodic-BC square
    side length; ``steps`` is the number of Euler updates.
    """

    preset: str = "orbium-unicaudatus"
    grid: int = 64
    R: int = 13
    mu: float = 0.15
    sigma: float = 0.015
    T: int = 10
    dt: float = 0.1  # = 1/T
    seed: int = 42
    steps: int = 100


def _radial_distance_grid(R: int) -> NDArray[np.float64]:
    """Per-pixel radial distance ``r/R`` in the ``(2R+1, 2R+1)`` window."""
    size = 2 * R + 1
    coords = np.arange(size, dtype=np.float64) - float(R)
    yy, xx = np.meshgrid(coords, coords, indexing="ij")
    return np.sqrt(xx * xx + yy * yy) / float(R)


def _build_kernel_window(R: int) -> NDArray[np.float64]:
    """Build the normalized Quad4 kernel window (``(2R+1)^2``)."""
    r = _radial_distance_grid(R)
    K = quad4_kernel(r)
    total = float(K.sum())
    if total <= 0.0:
        raise ValueError(f"Quad4 kernel window sum is non-positive ({total})")
    # ``K`` is float64; dividing by a Python ``float`` is mathematically
    # dtype-preserving, but NumPy 2.x stubs widen the result to
    # ``ndarray[..., floating[Any]]``. Pin the dtype explicitly (no-op copy
    # since the underlying dtype matches) so the signature stays honest.
    return (K / total).astype(np.float64, copy=False)


def _init_orbium_field(grid: int, seed: int) -> NDArray[np.float64]:
    """Seed a deterministic Orbium-like initial condition.

    Stage 1b posture: a small Gaussian blob + small random perturbation,
    seeded via ``numpy.random.default_rng(seed)``. Stage 1b's
    ``LeniaSim`` is bit-exact reproducible from the seed; the canonical
    Orbium "cells" payload from ``animals.json`` is **NOT** decoded
    here (RLE-decoder is out-of-scope at Stage 1b per § 6.3 OUT OF
    SCOPE creature-UX; the implementation focuses on the integrator
    + golden anchors). The IC nonetheless exercises the forward
    convolution + growth at a non-trivial spatial profile.
    """
    rng = np.random.default_rng(seed)
    cy = grid // 2
    cx = grid // 2
    yy, xx = np.meshgrid(np.arange(grid), np.arange(grid), indexing="ij")
    dy = yy.astype(np.float64) - float(cy)
    dx = xx.astype(np.float64) - float(cx)
    sigma_ic = float(grid) / 8.0
    blob = np.exp(-(dx * dx + dy * dy) / (2.0 * sigma_ic * sigma_ic))
    perturb = 0.05 * rng.random((grid, grid))
    field = 0.5 * blob + perturb
    return np.clip(field, 0.0, 1.0)


class LeniaSim:
    """Stack-D Taichi-backed Lenia sim.

    Initialization pins Taichi's determinism mode (CPU,
    ``cpu_max_num_threads=1``, ``random_seed=config.seed``); the
    forward Euler loop consumes :func:`step` which delegates to the
    module-level Taichi convolution + growth kernels in
    ``lenia._taichi_kernels``.
    """

    def __init__(self, config: LeniaConfig) -> None:
        self.config = config
        self._taichi_initialized = False
        self._field_np = _init_orbium_field(config.grid, config.seed)
        self._kernel_window = _build_kernel_window(config.R)
        # Pre-allocated working buffers used by ``step`` (avoid GC churn
        # across the Euler horizon; preserves byte-deterministic
        # behavior across runs).
        self._conv_np = np.zeros_like(self._field_np)
        self._next_np = np.zeros_like(self._field_np)

    def _ensure_taichi(self) -> None:
        if self._taichi_initialized:
            return
        from common_py.determinism import (
            Config as DeterminismConfig,
        )
        from common_py.determinism import set_taichi_deterministic

        det_cfg = DeterminismConfig(deterministic=True, seed=int(self.config.seed))
        set_taichi_deterministic(det_cfg, arch="cpu")
        self._taichi_initialized = True

    def step(self) -> None:
        """Advance one Euler step.

        Real-space Quad4 convolution (Taichi kernel, no atomics) +
        per-cell Quad4 polynomial growth + clip-Euler update. The
        update writes ``field_{n+1} = clip(field_n + dt · G(K * field_n),
        0, 1)``.
        """
        self._ensure_taichi()
        from . import _taichi_kernels as _k

        n = self.config.grid
        R = self.config.R
        _k.lenia_convolve(self._field_np, self._kernel_window, self._conv_np, n, R)
        _k.lenia_update(
            self._field_np,
            self._conv_np,
            self._next_np,
            float(self.config.mu),
            float(self.config.sigma),
            float(self.config.dt),
            n,
        )
        # Bit-deterministic swap: copy back into the live field. We
        # don't swap-by-reference because the kernel argument
        # ``ti.types.ndarray`` binding is per-call; the next call to
        # ``lenia_convolve`` reads ``self._field_np`` again.
        np.copyto(self._field_np, self._next_np)

    def field(self) -> NDArray[np.float64]:
        """Return the current field as a NumPy 2-D ``float64`` array."""
        return self._field_np.copy()

    def capture(self, out_dir: Path) -> Path:
        """Write the canonical Orbium capture to ``out_dir``; return the manifest path.

        Consumes :class:`common_py.capture.Writer` with the IC-2 API
        (``write_step(idx, data)`` + ``finalize()``).
        """
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

        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        descriptor = (
            f"{self.config.preset}-{self.config.grid}sq"
            f"-seed{self.config.seed}-step{self.config.steps}"
        )
        manifest_path = out_dir / f"{descriptor}.json"
        payload_path = out_dir / f"{descriptor}.h5"

        manifest = Manifest(
            schema_version="1.0.0",
            sim=SimMeta(name="lenia", category="continuous-ca", variant="lenia"),
            stack=StackMeta(name="taichi", version="1.7", build_id="cpu-det"),
            config=ConfigMeta(
                tier="reference",
                dims=[self.config.grid, self.config.grid],
                dtype="f64",
                seed=int(self.config.seed),
                params={
                    "preset": self.config.preset,
                    "R": int(self.config.R),
                    "mu": float(self.config.mu),
                    "sigma": float(self.config.sigma),
                    "T": int(self.config.T),
                    "dt": float(self.config.dt),
                    "kn": 1,
                    "gn": 1,
                },
            ),
            run=RunMeta(
                step_count=int(self.config.steps),
                capture_interval=1,
                wall_clock_seconds=0.0,
                start_utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            ),
            payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
            determinism=DeterminismMeta(
                claimed="bit-exact-same-hw",
                atomic_ops=False,
                subgroup_ops=False,
            ),
        )

        writer = Writer(manifest_path, manifest)
        t0 = time.perf_counter()
        writer.write_step(0, StepData(fields={"A": self.field()}))
        for s in range(1, self.config.steps + 1):
            self.step()
            writer.write_step(s, StepData(fields={"A": self.field()}))
        wall = time.perf_counter() - t0
        manifest.run.wall_clock_seconds = float(wall)
        writer.finalize()

        return manifest_path
