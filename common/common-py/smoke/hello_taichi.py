"""Hello-physics Taichi smoke (charter § 2 deliverable 5).

NOTE — module deliberately does NOT use `from __future__ import
annotations` per spec § 4.4 limitation #2 + docs/common/taichi.md § 4.2
(stringified annotations break `@ti.kernel` argument-type resolution at
decoration time).

Exercises every public Taichi-relevant common-py surface end-to-end:

- ``set_taichi_deterministic`` via CLI flags (``add_args`` /
  ``from_args``) — IC-4 + IC-11.
- ``Capture.write_capture`` — IC-2 capture I/O.
- ``FKeyDispatcher`` — IC-3 GGUI key-trap workaround (CI-skipped per
  spec § 7.8; the dispatcher is constructed + a handler bound but the
  poll loop runs only under ``--gui`` runtime flag).
- ``watch_and_reexec`` — hot-reload workaround per spec § 4.4
  limitation #1 (CI-skipped per spec § 7.8; entered only under
  ``--hot-reload`` runtime flag).

Sim shape: a deterministic 1D diffusion on a 64-cell grid, Taichi
backend, 100 steps, capture interval 10. Sibling to
``common/common-py/smoke/advection_1d.py`` (numpy reference); designed
so the two smoke captures can be compared via the testkit equivalence
harness (W-Gate 5 analogue per phase-2 plan § 1.5.2).

Mirrors the sister hello smoke shape from phase-2 plan § 1.9.1
Subsystem 7 (common-warp's hello sim), adapted from Stack E to
Stack D.
"""

import argparse
import time
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import taichi as ti

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
from common_py.determinism import Config, add_args, from_args, set_taichi_deterministic
from common_py.ggui import FKeyDispatcher
from common_py.hotreload import watch_and_reexec

GRID_N = 64
STEP_COUNT = 100
CAPTURE_INTERVAL = 10
DX = 1.0 / GRID_N
DIFFUSIVITY = 0.05
DT = 0.25 * DX * DX / DIFFUSIVITY  # CFL = 0.25 for explicit diffusion

# Taichi fields — created at runtime in ``run()`` (after ti.init).
# Declared at module scope as ``None`` placeholders for static checkers.
u_curr: "ti.Field | None" = None
u_next: "ti.Field | None" = None


@ti.kernel
def initial_condition():
    """Gaussian pulse centered at x=0.5 — deterministic, IC-4-seed-blind.

    No ``-> None`` return annotation per Taichi 1.7.4 ``@ti.kernel`` AST
    transformer: ``transform_as_kernel`` iterates ``ctx.func.return_type``,
    which is ``None`` when the function is annotated ``-> None``, raising
    ``TypeError``. Kernels with no return value omit the annotation.
    """
    for i in range(GRID_N):
        x = (i + 0.5) * DX
        u_curr[i] = ti.exp(-((x - 0.5) ** 2) / (2.0 * 0.05 * 0.05))


@ti.kernel
def step_diffuse():
    """Explicit central-difference diffusion step (periodic BC).

    No ``-> None`` annotation per the same Taichi 1.7.4 AST-transformer
    limitation documented at :func:`initial_condition`.
    """
    alpha = DIFFUSIVITY * DT / (DX * DX)
    for i in range(GRID_N):
        left = u_curr[(i - 1) % GRID_N]
        right = u_curr[(i + 1) % GRID_N]
        u_next[i] = u_curr[i] + alpha * (left - 2.0 * u_curr[i] + right)
    for i in range(GRID_N):
        u_curr[i] = u_next[i]


def read_grid() -> np.ndarray:
    """Copy Taichi grid state back to NumPy for capture I/O."""
    out = np.empty(GRID_N, dtype=np.float64)
    for i in range(GRID_N):
        out[i] = float(u_curr[i])
    return out


def _alloc_fields() -> None:
    """Allocate Taichi fields. Called after ``ti.init`` inside ``run``."""
    global u_curr, u_next
    u_curr = ti.field(dtype=ti.f64, shape=GRID_N)
    u_next = ti.field(dtype=ti.f64, shape=GRID_N)


def run(out_dir: Path, config: Config) -> Path:
    """Run the Taichi hello-physics smoke; write a capture; return manifest path."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    descriptor = f"hello-taichi-cpu-seed{config.seed}-step{STEP_COUNT}"
    payload_path = Path(f"{descriptor}.h5")
    manifest = Manifest(
        schema_version="1.0.0",
        sim=SimMeta(name="hello-taichi-smoke", category="smoke", variant="common-py-taichi"),
        stack=StackMeta(
            name="common-py-taichi", version="0.0.0", build_id="sub-phase-taichi-integration"
        ),
        config=ConfigMeta(
            tier="reference",
            dims=[GRID_N],
            dtype="f64",
            seed=int(config.seed),
            params={"diffusivity": DIFFUSIVITY, "dt": DT, "dx": DX},
        ),
        run=RunMeta(
            step_count=STEP_COUNT,
            capture_interval=CAPTURE_INTERVAL,
            wall_clock_seconds=0.0,
            start_utc=datetime.now(UTC).isoformat(),
        ),
        payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
        determinism=DeterminismMeta(
            claimed="bit-exact-same-hw" if config.deterministic else "epsilon",
            atomic_ops=False,
            subgroup_ops=False,
        ),
    )

    # IC-11 Taichi init via the determinism wrapper. CPU arch + pinned
    # cpu_max_num_threads=1 + offline_cache=True per the convention.
    set_taichi_deterministic(config, arch="cpu")
    if not config.deterministic:
        # Even without --deterministic, init Taichi (on the configured
        # arch) so the kernels can run. The non-deterministic path is
        # rare for this smoke; mainly here so the CLI exercises both
        # branches of the wrapper.
        ti.init(arch=ti.cpu, random_seed=int(config.seed))

    _alloc_fields()
    initial_condition()

    writer = Writer(out_dir / f"{descriptor}.json", manifest)
    t0 = time.perf_counter()
    for step in range(STEP_COUNT + 1):
        if step % CAPTURE_INTERVAL == 0:
            writer.write_step(step, StepData(fields={"u": read_grid()}))
        if step < STEP_COUNT:
            step_diffuse()
    manifest.run.wall_clock_seconds = time.perf_counter() - t0
    writer.finalize()
    return out_dir / f"{descriptor}.json"


def _gui_loop(out_dir: Path, config: Config) -> int:
    """GGUI poll-then-dispatch loop (CI-skipped per spec § 7.8).

    Constructs an :class:`FKeyDispatcher` with an F5 hotkey bound to a
    screenshot stub; opens a minimal GGUI window; polls until close.
    Documented but not exercised by CI; visual-verification-pending per
    phase-2 plan § 1.6.6.
    """
    dispatcher = FKeyDispatcher()
    dispatcher.bind("F5", lambda: print(f"[F5] screenshot stub for {out_dir}/{config.seed}"))
    window = ti.ui.Window(name="hello-taichi", res=(GRID_N * 8, 256), vsync=True)
    canvas = window.get_canvas()
    while window.running:
        dispatcher.poll(window)
        # Run one step per frame so the user sees diffusion proceeding.
        step_diffuse()
        # Render: stretch the 1D grid into a 2D banner via tile.
        frame = np.tile(read_grid(), (32, 1)).astype(np.float32)
        canvas.set_image(frame)
        window.show()
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="common-py Taichi hello-physics smoke sim")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("common/common-py/smoke/captures"),
    )
    parser.add_argument(
        "--gui",
        action="store_true",
        help="Open the GGUI poll loop (visual-verification only; CI-skipped per spec § 7.8).",
    )
    parser.add_argument(
        "--hot-reload",
        action="store_true",
        help="Watch this file + re-exec on change (CI-skipped per spec § 7.8).",
    )
    add_args(parser)
    args = parser.parse_args(argv)
    config = from_args(args)

    if args.hot_reload:
        # Enters the watchfiles loop; never returns under normal use.
        watch_and_reexec([Path(__file__).resolve()])
        return 0  # pragma: no cover - unreachable

    manifest_path = run(args.out_dir, config)
    print(f"wrote {manifest_path}")

    if args.gui:
        return _gui_loop(args.out_dir, config)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
