"""Local-only WGSL B-inference capture generator (spec § 7.8).

Executes the committed ``../typescript/src/nca_inference.wgsl`` via the wgpu-py
binding (wgpu-native / Vulkan) on a GPU host to produce the committed Stack-B
B-inference capture. CI never runs this — it reads the committed capture and
verifies it with the pure-NumPy oracle (``neural_ca.reference.nca_numpy``).

This is the §0.3-documented capture-generation path for an environment without a
Node WebGPU runtime; the ``../typescript/src/index.ts`` driver is the Phase-5
web-deploy path. Requires the ``local-gpu`` extra (``wgpu``).
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from .model import ALIVE_THRESHOLD  # noqa: F401  (documents the shared 0.1 threshold)

_WGSL_PATH = Path(__file__).resolve().parents[1].parent / "typescript/src/nca_inference.wgsl"
_CN = 16


def run_wgsl_inference(
    buffer_path: Path,
    layout_path: Path,
    *,
    grid_size: int,
    steps: int,
    seed: int = 42,
    fire_rate: float = 0.5,
    capture_every: int = 50,
) -> NDArray[np.float32]:
    """Roll the WGSL NCA forward on the GPU; return ``(n_frames, H, W, 4)`` RGBA
    clamped to [0, 1]. Frame 0 is the seed; thereafter every ``capture_every``."""
    import wgpu

    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    weights = np.fromfile(str(buffer_path), dtype="<f4")
    t = layout["tensors"]
    b1_off = int(t["w1.bias"]["offset"])
    w1_off = int(t["w1.weight"]["offset"])
    w2_off = int(t["w2.weight"]["offset"])

    adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    device = adapter.request_device_sync()
    shader = device.create_shader_module(code=_WGSL_PATH.read_text(encoding="utf-8"))

    n_cells = grid_size * grid_size
    state_len = n_cells * _CN

    # Seed state: single live center cell (channels 3: = 1).
    seed_state = np.zeros((grid_size, grid_size, _CN), dtype=np.float32)
    mid = grid_size // 2
    seed_state[mid, mid, 3:] = 1.0
    flat_seed = seed_state.reshape(-1)

    usage = wgpu.BufferUsage
    cur = device.create_buffer_with_data(data=flat_seed, usage=usage.STORAGE | usage.COPY_SRC)
    mid_buf = device.create_buffer(
        size=state_len * 4, usage=usage.STORAGE | usage.COPY_SRC | usage.COPY_DST
    )
    nxt = device.create_buffer(
        size=state_len * 4, usage=usage.STORAGE | usage.COPY_SRC | usage.COPY_DST
    )
    wbuf = device.create_buffer_with_data(data=weights, usage=usage.STORAGE)

    bgl = device.create_bind_group_layout(
        entries=[
            {
                "binding": 0,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.uniform},
            },
            {
                "binding": 1,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.read_only_storage},
            },
            {
                "binding": 2,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.read_only_storage},
            },
            {
                "binding": 3,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.storage},
            },
            {
                "binding": 4,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.read_only_storage},
            },
        ]
    )
    pl = device.create_pipeline_layout(bind_group_layouts=[bgl])
    pipe_update = device.create_compute_pipeline(
        layout=pl, compute={"module": shader, "entry_point": "update"}
    )
    pipe_mask = device.create_compute_pipeline(
        layout=pl, compute={"module": shader, "entry_point": "mask"}
    )

    def make_uniform(step: int) -> object:
        # Params: grid, step, seed, fire_rate, b1_off, w1_off, w2_off, _pad.
        u32 = np.array([grid_size, step, seed], dtype=np.uint32)
        f32 = np.array([fire_rate], dtype=np.float32)
        tail = np.array([b1_off, w1_off, w2_off, 0], dtype=np.uint32)
        raw = u32.tobytes() + f32.tobytes() + tail.tobytes()
        return device.create_buffer_with_data(
            data=np.frombuffer(raw, dtype=np.uint8), usage=usage.UNIFORM
        )

    def bind(p: object, b1: object, b2: object, b3: object) -> object:
        return device.create_bind_group(
            layout=bgl,
            entries=[
                {"binding": 0, "resource": {"buffer": p, "offset": 0, "size": 32}},
                {"binding": 1, "resource": {"buffer": b1, "offset": 0, "size": state_len * 4}},
                {"binding": 2, "resource": {"buffer": b2, "offset": 0, "size": state_len * 4}},
                {"binding": 3, "resource": {"buffer": b3, "offset": 0, "size": state_len * 4}},
                {"binding": 4, "resource": {"buffer": wbuf, "offset": 0, "size": weights.nbytes}},
            ],
        )

    wg = (grid_size + 7) // 8

    def readback(buf: object) -> NDArray[np.float32]:
        raw = device.queue.read_buffer(buf)
        arr = np.frombuffer(raw, dtype=np.float32).reshape(grid_size, grid_size, _CN)
        return np.clip(arr[:, :, :4], 0.0, 1.0).astype(np.float32).copy()

    frames: list[NDArray[np.float32]] = [readback(cur)]
    for step in range(steps):
        params = make_uniform(step)
        enc = device.create_command_encoder()
        # Pass 1 (update): in=cur, out=mid_buf (binding2 dummy=cur).
        cp = enc.begin_compute_pass()
        cp.set_pipeline(pipe_update)
        cp.set_bind_group(0, bind(params, cur, cur, mid_buf))
        cp.dispatch_workgroups(wg, wg)
        cp.end()
        device.queue.submit([enc.finish()])
        # Pass 2 (mask): pre=cur, post=mid_buf, out=nxt.
        enc2 = device.create_command_encoder()
        cp2 = enc2.begin_compute_pass()
        cp2.set_pipeline(pipe_mask)
        cp2.set_bind_group(0, bind(params, cur, mid_buf, nxt))
        cp2.dispatch_workgroups(wg, wg)
        cp2.end()
        device.queue.submit([enc2.finish()])
        cur, nxt = nxt, cur  # rotate
        if (step + 1) % capture_every == 0:
            frames.append(readback(cur))
    return np.stack(frames, axis=0)


def write_b_inference_capture(
    frames: NDArray[np.float32],
    out_dir: Path,
    *,
    grid_size: int,
    steps: int,
    seed: int,
    capture_every: int,
    torch_version: str,
) -> Path:
    """Write the committed Stack-B B-inference capture from WGSL frames."""
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

    descriptor = f"growing-emoji-{grid_size}sq-seed{seed}-step{steps}-wgsl"
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / f"{descriptor}.json"
    payload_path = out_dir / f"{descriptor}.h5"

    manifest = Manifest(
        schema_version="1.0.0",
        sim=SimMeta(name="neural-ca", category="continuous-ca", variant="growing-neural-ca"),
        stack=StackMeta(name="wgsl", version="webgpu", build_id="wgpu-native-vulkan"),
        config=ConfigMeta(
            tier="reference",
            dims=[grid_size, grid_size],
            dtype="f32",
            seed=int(seed),
            params={"channel_n": _CN, "steps": int(steps), "capture_every": int(capture_every)},
        ),
        run=RunMeta(
            step_count=int(steps),
            capture_interval=int(capture_every),
            wall_clock_seconds=0.0,
            start_utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        ),
        payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
        determinism=DeterminismMeta(claimed="epsilon", atomic_ops=False, subgroup_ops=False),
    )

    writer = Writer(manifest_path, manifest)
    for i, frame in enumerate(frames):
        writer.write_step(
            i * capture_every, StepData(fields={"rgba": np.asarray(frame, dtype=np.float32)})
        )
    writer.finalize()
    return manifest_path
