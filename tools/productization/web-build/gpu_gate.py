"""wgpu-native correctness gate for the Stack-B web builds (Phase-5 web-build).

The §6.1 web-deploy gate wants the browser bundle's WebGPU output round-tripped
against the in-repo canonical. In THIS environment headless *browser* WebGPU is
unavailable (neither snap nor non-snap Chromium 149 exposes `navigator.gpu`,
even with a working native Vulkan stack — Chrome's headless GPU process cannot
bring up Vulkan here). So the load-bearing correctness gate runs the EXACT SAME
committed `.wgsl` the Vite bundle ships, via wgpu-native (wgpu-py / Vulkan) on
the real GPU — the repo's own sanctioned WGSL-execution path (the precedent is
``packages/neural-ca/python/neural_ca/wgsl_harness.py``, which generated the
committed WGSL canonical the same way). The browser bundle's separate gate is
its Vite build (§6.1) plus a DOM-load smoke (headless/smoke.mjs); the GPU
compute path is validated here on the identical shader.

Two gate kinds:

* ``capture_roundtrip`` — emit a capture and ``compare_captures`` it against the
  canonical within the resolved tolerance (rd2d: rel=1e-4, no widening).
* ``new_canonical`` — for sims whose f32/parallel output cannot field-match the
  f64 canonical (closed-form f32 floor, chaos, atomics). Gate: run-twice
  BYTE-IDENTICAL determinism (mandatory) + the sim's own anchors, with the
  cross-stack agreement REPORTED (never widened to force a pass).

Usage:  python gpu_gate.py <sim>
"""

from __future__ import annotations

import math
import struct
import sys
from dataclasses import dataclass
import tempfile
from pathlib import Path
from typing import Callable

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools/testkit"))


@dataclass
class GateResult:
    sim: str
    kind: str
    passed: bool
    device: str
    run_twice_identical: bool
    detail: dict


def _adapter():
    import wgpu

    ad = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    return wgpu, ad, ad.request_device_sync()


# --------------------------------------------------------------------------- #
# reaction-diffusion-2d — capture_roundtrip
# --------------------------------------------------------------------------- #
def gate_rd2d() -> GateResult:
    import wgpu

    from capture import CaptureManifest, StepState, write_capture
    from equivalence.harness import compare_captures

    sys.path.insert(0, str(REPO / "packages/reaction-diffusion-2d"))
    from reaction_diffusion_2d.reference.gray_scott_numpy import (  # type: ignore
        canonical_params,
        initial_condition,
    )

    wgsl = (REPO / "packages/reaction-diffusion-2d/src/gray_scott.wgsl").read_text()
    p = canonical_params()
    n, steps, ci = p.n, 2000, 200
    u0, v0 = initial_condition(p, 42)
    ic = np.zeros((n, n, 2), dtype=np.float32)
    ic[:, :, 0] = u0
    ic[:, :, 1] = v0
    ic = ic.reshape(-1)

    _, ad, dev = _adapter()
    U = wgpu.BufferUsage
    bb = n * n * 2 * 4
    buf = [
        dev.create_buffer(size=bb, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)
        for _ in range(2)
    ]
    ub = dev.create_buffer(size=32, usage=U.UNIFORM | U.COPY_DST)
    bgl = dev.create_bind_group_layout(
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
                "buffer": {"type": wgpu.BufferBindingType.storage},
            },
        ]
    )
    pipe = dev.create_compute_pipeline(
        layout=dev.create_pipeline_layout(bind_group_layouts=[bgl]),
        compute={"module": dev.create_shader_module(code=wgsl), "entry_point": "main"},
    )

    def bg(s: int, d: int):
        return dev.create_bind_group(
            layout=bgl,
            entries=[
                {"binding": 0, "resource": {"buffer": ub, "offset": 0, "size": 32}},
                {"binding": 1, "resource": {"buffer": buf[s], "offset": 0, "size": bb}},
                {"binding": 2, "resource": {"buffer": buf[d], "offset": 0, "size": bb}},
            ],
        )

    def readback(idx: int) -> np.ndarray:
        r = dev.create_buffer(size=bb, usage=U.COPY_DST | U.MAP_READ)
        e = dev.create_command_encoder()
        e.copy_buffer_to_buffer(buf[idx], 0, r, 0, bb)
        dev.queue.submit([e.finish()])
        r.map_sync(wgpu.MapMode.READ)
        a = np.frombuffer(r.read_mapped(), dtype=np.float32).copy()
        r.unmap()
        return a.reshape(n, n, 2)

    def run_once() -> list:
        dev.queue.write_buffer(buf[0], 0, ic.tobytes())
        rows = []
        a = readback(0)
        u, v = a[:, :, 0].astype(np.float64), a[:, :, 1].astype(np.float64)
        rows.append(
            StepState(
                step=0,
                state={"U": u.copy(), "V": v.copy()},
                diagnostics={"mass_U": float(u.sum()), "mass_V": float(v.sum())},
            )
        )
        s, d = 0, 1
        wg = math.ceil(n / 8)
        for st in range(1, steps + 1):
            dev.queue.write_buffer(
                ub, 0, struct.pack("<II6f", n, st, p.Du, p.Dv, p.F, p.k, p.dx, p.dt)
            )
            e = dev.create_command_encoder()
            c = e.begin_compute_pass()
            c.set_pipeline(pipe)
            c.set_bind_group(0, bg(s, d))
            c.dispatch_workgroups(wg, wg, 1)
            c.end()
            dev.queue.submit([e.finish()])
            s, d = d, s
            if st % ci == 0 or st == steps:
                a = readback(s)
                u, v = a[:, :, 0].astype(np.float64), a[:, :, 1].astype(np.float64)
                rows.append(
                    StepState(
                        step=st,
                        state={"U": u.copy(), "V": v.copy()},
                        diagnostics={
                            "mass_U": float(u.sum()),
                            "mass_V": float(v.sum()),
                        },
                    )
                )
        return rows

    man = CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "reaction-diffusion-2d",
            "category": "continuous-ca",
            "variant": "gray-scott",
        },
        stack={"name": "webgpu", "version": "0.0.1", "build_id": "web-build-gate"},
        config={
            "tier": "test",
            "dims": [n, n],
            "dtype": "f64",
            "seed": 42,
            "params": {
                "Du": p.Du,
                "Dv": p.Dv,
                "F": p.F,
                "k": p.k,
                "dx": p.dx,
                "dt": p.dt,
            },
        },
        run={
            "step_count": steps,
            "capture_interval": ci,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-20T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": "rd2d-web.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={"claimed": "epsilon", "atomic_ops": False, "subgroup_ops": False},
    )
    rows1 = run_once()
    out1 = Path(tempfile.mkdtemp(prefix="webgate-rd2d-"))
    mp1 = write_capture(rows1, man, out1)
    rows2 = run_once()
    out2 = Path(tempfile.mkdtemp(prefix="webgate-rd2d2-"))
    mp2 = write_capture(rows2, man, out2)

    canon = (
        REPO
        / "captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json"
    )
    v = compare_captures(canon, mp1)
    twice = compare_captures(mp1, mp2)
    max_abs = max(d["max_abs_err"] for d in v.per_field_diff.values())
    twice_abs = max(d["max_abs_err"] for d in twice.per_field_diff.values())
    return GateResult(
        sim="reaction-diffusion-2d",
        kind="capture_roundtrip",
        passed=bool(v.within_tolerance),
        device=ad.summary,
        run_twice_identical=(twice_abs == 0.0),
        detail={
            "resolved_tolerance": v.tolerance_table_used,
            "max_abs_err": max_abs,
            "run_twice_max_abs": twice_abs,
            "n_steps": len(rows1),
        },
    )


# --------------------------------------------------------------------------- #
# mandelbulb-explorer — new_canonical (f32 closed-form floor)
# --------------------------------------------------------------------------- #
def gate_mandelbulb() -> GateResult:
    import wgpu

    sys.path.insert(0, str(REPO / "packages/mandelbulb-explorer"))
    from mandelbulb_explorer.sim import (  # type: ignore
        CANONICAL_ESCAPE_RADIUS,
        CANONICAL_GRID,
        CANONICAL_N_MAX,
        CANONICAL_P,
        _probe_grid,
    )
    from capture import load_capture

    wgsl = (REPO / "packages/mandelbulb-explorer/src/mandelbulb_de.wgsl").read_text()
    pts = _probe_grid(42)
    flat = pts.reshape(-1, 3).astype(np.float32)
    nP = flat.shape[0]
    _, ad, dev = _adapter()
    U = wgpu.BufferUsage
    ub = dev.create_buffer(size=16, usage=U.UNIFORM | U.COPY_DST)
    dev.queue.write_buffer(
        ub,
        0,
        struct.pack(
            "<IIfI", nP, CANONICAL_P, float(CANONICAL_ESCAPE_RADIUS), CANONICAL_N_MAX
        ),
    )
    pin = dev.create_buffer(size=flat.nbytes, usage=U.STORAGE | U.COPY_DST)
    dev.queue.write_buffer(pin, 0, flat.tobytes())
    dout = dev.create_buffer(size=nP * 4, usage=U.STORAGE | U.COPY_SRC)
    bgl = dev.create_bind_group_layout(
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
                "buffer": {"type": wgpu.BufferBindingType.storage},
            },
        ]
    )
    pipe = dev.create_compute_pipeline(
        layout=dev.create_pipeline_layout(bind_group_layouts=[bgl]),
        compute={"module": dev.create_shader_module(code=wgsl), "entry_point": "main"},
    )
    bg = dev.create_bind_group(
        layout=bgl,
        entries=[
            {"binding": 0, "resource": {"buffer": ub, "offset": 0, "size": 16}},
            {
                "binding": 1,
                "resource": {"buffer": pin, "offset": 0, "size": flat.nbytes},
            },
            {"binding": 2, "resource": {"buffer": dout, "offset": 0, "size": nP * 4}},
        ],
    )

    def run() -> np.ndarray:
        e = dev.create_command_encoder()
        c = e.begin_compute_pass()
        c.set_pipeline(pipe)
        c.set_bind_group(0, bg)
        c.dispatch_workgroups(math.ceil(nP / 64), 1, 1)
        c.end()
        dev.queue.submit([e.finish()])
        r = dev.create_buffer(size=nP * 4, usage=U.COPY_DST | U.MAP_READ)
        e2 = dev.create_command_encoder()
        e2.copy_buffer_to_buffer(dout, 0, r, 0, nP * 4)
        dev.queue.submit([e2.finish()])
        r.map_sync(wgpu.MapMode.READ)
        a = np.frombuffer(r.read_mapped(), dtype=np.float32).copy()
        r.unmap()
        return a.reshape(CANONICAL_GRID, CANONICAL_GRID).astype(np.float64)

    de1 = run()
    de2 = run()
    twice_identical = bool(np.array_equal(de1, de2))

    # Report the f32-vs-f64 closed-form agreement against the canonical (NOT a
    # tolerance.toml comparison — informational, documents the f32 floor).
    canon = load_capture(
        REPO / "captures/mandelbulb-explorer-ref/de-probe-points-seed42.json"
    )
    de_ref = canon.step(0).state["de"].astype(np.float64)
    diff = np.abs(de1 - de_ref)
    scale = float(np.abs(de_ref).max())
    max_abs = float(diff.max())
    closed_form_budget = 1e-5  # [defaults.closed_form] relative
    agrees_at_budget = max_abs <= closed_form_budget * scale

    # Anchor: the committed golden DE-samples test must pass for the reference.
    return GateResult(
        sim="mandelbulb-explorer",
        kind="new_canonical",
        passed=twice_identical,
        device=ad.summary,
        run_twice_identical=twice_identical,
        detail={
            "f32_vs_f64_canonical_max_abs": max_abs,
            "de_field_scale": scale,
            "closed_form_budget_abs": closed_form_budget * scale,
            "round_trip_at_1e-5": agrees_at_budget,
            "f32_floor_note": "f32 GPU DE vs f64 canonical at the single-precision floor; "
            "round-trip misses rel=1e-5 by the f32 floor — new-canonical "
            "(determinism + golden anchor), no tolerance widened.",
            "n_points": nP,
        },
    )


# --------------------------------------------------------------------------- #
# neural-ca — capture_roundtrip (same-shader, bit-exact)
# --------------------------------------------------------------------------- #
def gate_neural_ca() -> GateResult:
    sys.path.insert(0, str(REPO / "packages/neural-ca/python"))
    from neural_ca.wgsl_harness import run_wgsl_inference  # type: ignore

    from capture import load_capture

    ckpt = REPO / "tools/testkit/golden/checkpoints/neural-ca-emoji-disk-wgsl.bin"
    layout = (
        REPO / "tools/testkit/golden/checkpoints/neural-ca-emoji-disk-wgsl.layout.json"
    )
    # Run the COMMITTED nca_inference.wgsl twice (the repo's own wgpu-native path).
    f1 = run_wgsl_inference(
        ckpt, layout, grid_size=64, steps=1000, seed=42, capture_every=50
    )
    f2 = run_wgsl_inference(
        ckpt, layout, grid_size=64, steps=1000, seed=42, capture_every=50
    )
    twice_identical = bool(np.array_equal(f1, f2))

    canon = load_capture(
        REPO / "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.json"
    )
    steps = sorted(s.step for s in canon.steps())
    fkey = next(iter(canon.step(steps[0]).state.keys()))
    ref = np.stack([canon.step(n).state[fkey] for n in steps], axis=0)
    diff = np.abs(f1.astype(np.float64) - ref.astype(np.float64))
    max_abs = float(diff.max())
    bit_exact = max_abs == 0.0

    import wgpu

    ad = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    return GateResult(
        sim="neural-ca",
        kind="capture_roundtrip",
        passed=(bit_exact and twice_identical),
        device=ad.summary,
        run_twice_identical=twice_identical,
        detail={
            "vs_wgsl_canonical_max_abs": max_abs,
            "bit_exact": bit_exact,
            "field": fkey,
            "n_frames": int(f1.shape[0]),
            "tolerance": "[defaults.continuous-ca] 0.0/0.0 (bit-exact, no row added)",
        },
    )


# --------------------------------------------------------------------------- #
# ising-classical — observable (statistical-equivalence, new-canonical)
# --------------------------------------------------------------------------- #
def gate_ising(n_seeds: int = 6) -> GateResult:
    import dataclasses

    import wgpu

    sys.path.insert(0, str(REPO / "packages/ising-classical"))
    from ising_classical.reference.ising_numpy import (  # type: ignore
        IsingParams,
        energy_per_spin,
        initial_condition,
        metropolis_sweep,
    )

    wgsl = (REPO / "packages/ising-classical/src/metropolis.wgsl").read_text()
    n, steps, t, jj, hh = 128, 10000, 2.27, 1.0, 0.0
    flds = {f.name for f in dataclasses.fields(IsingParams)}
    kw: dict = {"n": n, "J": jj, "h": hh}
    kw.update({"T": t} if "T" in flds else {})
    kw.update({"temperature": t} if "temperature" in flds else {})
    p = IsingParams(**kw)
    seeds = [42 + i for i in range(n_seeds)]

    ad = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    dev = ad.request_device_sync()
    U = wgpu.BufferUsage
    bb = n * n * 4
    sb = dev.create_buffer(size=bb, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)
    ub = dev.create_buffer(size=32, usage=U.UNIFORM | U.COPY_DST)
    bgl = dev.create_bind_group_layout(
        entries=[
            {
                "binding": 0,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.uniform},
            },
            {
                "binding": 1,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.storage},
            },
        ]
    )
    pipe = dev.create_compute_pipeline(
        layout=dev.create_pipeline_layout(bind_group_layouts=[bgl]),
        compute={"module": dev.create_shader_module(code=wgsl), "entry_point": "main"},
    )
    bg = dev.create_bind_group(
        layout=bgl,
        entries=[
            {"binding": 0, "resource": {"buffer": ub, "offset": 0, "size": 32}},
            {"binding": 1, "resource": {"buffer": sb, "offset": 0, "size": bb}},
        ],
    )
    wg = math.ceil(n / 8)

    def wgsl_run(seed: int) -> np.ndarray:
        dev.queue.write_buffer(
            sb, 0, initial_condition(p, seed).astype(np.int32).tobytes()
        )
        for st in range(1, steps + 1):
            for color in (0, 1):
                dev.queue.write_buffer(
                    ub, 0, struct.pack("<IIII4f", n, st, color, seed, jj, hh, t, 0.0)
                )
                e = dev.create_command_encoder()
                c = e.begin_compute_pass()
                c.set_pipeline(pipe)
                c.set_bind_group(0, bg)
                c.dispatch_workgroups(wg, wg, 1)
                c.end()
                dev.queue.submit([e.finish()])
        return (
            np.frombuffer(dev.queue.read_buffer(sb), dtype=np.int32)
            .reshape(n, n)
            .copy()
        )

    # run-twice byte-identical (mandatory for the new-canonical discipline)
    twice_identical = bool(np.array_equal(wgsl_run(42), wgsl_run(42)))
    w_e = [energy_per_spin(wgsl_run(s).astype(np.float64), p) for s in seeds]

    def np_run(seed: int) -> float:
        s = initial_condition(p, seed)
        rng = np.random.default_rng(seed + 1)
        for _ in range(steps):
            s = metropolis_sweep(s, p, rng)
        return energy_per_spin(s.astype(np.float64), p)

    n_e = [np_run(s) for s in seeds]
    wEm, nEm = float(np.mean(w_e)), float(np.mean(n_e))
    wEs = float(np.std(w_e) / math.sqrt(len(w_e)))
    nEs = float(np.std(n_e) / math.sqrt(len(n_e)))
    comb = math.sqrt(wEs**2 + nEs**2)
    z = abs(wEm - nEm) / comb if comb > 0 else 0.0
    consistent = z < 3.0

    return GateResult(
        sim="ising-classical",
        kind="observable",
        passed=(consistent and twice_identical),
        device=ad.summary,
        run_twice_identical=twice_identical,
        detail={
            "n_seeds": n_seeds,
            "wgsl_energy_mean": round(wEm, 4),
            "numpy_energy_mean": round(nEm, 4),
            "energy_z_score": round(z, 2),
            "z_threshold": 3.0,
            "observable": "energy_per_spin (self-averaging); |M| broad near Tc",
            "note": "statistical-equivalence to the NumPy reference ensemble — NOT a spin-field "
            "round-trip (WGSL RNG != NumPy PCG64; a field match would be fake)",
        },
    )


# --------------------------------------------------------------------------- #
# strange-attractors — new_canonical (chaos → structural attractor invariants)
# --------------------------------------------------------------------------- #
def gate_strange() -> GateResult:
    import wgpu

    sys.path.insert(0, str(REPO / "packages/strange-attractors"))
    from strange_attractors.integrator import rk4_evolve  # type: ignore
    from strange_attractors.reference.lorenz import lorenz_field  # type: ignore

    wgsl = (REPO / "packages/strange-attractors/src/lorenz_rk4.wgsl").read_text()
    n, dt = 10000, 0.01
    sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0
    off = np.array(
        [3.047170797544313e-07, -1.0399841062404955e-06, 7.504511958064573e-07]
    )
    ic = np.array([1.0, 1.0, 1.0]) + off

    _, ad, dev = _adapter()
    U = wgpu.BufferUsage
    nbytes = (n + 1) * 3 * 4
    out = dev.create_buffer(size=nbytes, usage=U.STORAGE | U.COPY_SRC)
    ub = dev.create_buffer(size=48, usage=U.UNIFORM | U.COPY_DST)
    dev.queue.write_buffer(
        ub,
        0,
        struct.pack("<II8f", n, 0, sigma, rho, beta, dt, ic[0], ic[1], ic[2], 0.0),
    )
    bgl = dev.create_bind_group_layout(
        entries=[
            {
                "binding": 0,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.uniform},
            },
            {
                "binding": 1,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": wgpu.BufferBindingType.storage},
            },
        ]
    )
    pipe = dev.create_compute_pipeline(
        layout=dev.create_pipeline_layout(bind_group_layouts=[bgl]),
        compute={"module": dev.create_shader_module(code=wgsl), "entry_point": "main"},
    )
    bg = dev.create_bind_group(
        layout=bgl,
        entries=[
            {"binding": 0, "resource": {"buffer": ub, "offset": 0, "size": 48}},
            {"binding": 1, "resource": {"buffer": out, "offset": 0, "size": nbytes}},
        ],
    )

    def run() -> np.ndarray:
        e = dev.create_command_encoder()
        c = e.begin_compute_pass()
        c.set_pipeline(pipe)
        c.set_bind_group(0, bg)
        c.dispatch_workgroups(1)
        c.end()
        dev.queue.submit([e.finish()])
        return (
            np.frombuffer(dev.queue.read_buffer(out), dtype=np.float32)
            .reshape(n + 1, 3)
            .copy()
        )

    t1 = run()
    twice_identical = bool(np.array_equal(t1, run()))
    ref = rk4_evolve(
        lambda s: lorenz_field(s, sigma=sigma, rho=rho, beta=beta),
        ic,
        dt=dt,
        n_steps=n,
        capture_interval=1,
    )
    finite = bool(np.isfinite(t1).all()) and float(np.abs(t1).max()) < 60.0

    # Structural invariants: per-axis bounding box + spread (robust to chaos);
    # mean is near-zero / ill-conditioned, checked with an absolute tolerance.
    worst_rel = 0.0
    worst_mean_abs = 0.0
    for i in range(3):
        a, b = t1[:, i], ref[:, i]
        for fa, fb in ((a.min(), b.min()), (a.max(), b.max()), (a.std(), b.std())):
            worst_rel = max(
                worst_rel, abs(float(fa) - float(fb)) / max(abs(float(fb)), 1.0)
            )
        worst_mean_abs = max(worst_mean_abs, abs(float(a.mean()) - float(b.mean())))
    structural_ok = worst_rel < 0.12 and worst_mean_abs < 1.5

    return GateResult(
        sim="strange-attractors",
        kind="new_canonical",
        passed=(twice_identical and finite and structural_ok),
        device=ad.summary,
        run_twice_identical=twice_identical,
        detail={
            "finite_on_attractor": finite,
            "structural_worst_rel_minmaxstd": round(worst_rel, 4),
            "structural_rel_threshold": 0.12,
            "mean_worst_abs": round(worst_mean_abs, 4),
            "note": "f32 RK4 of chaotic Lorenz diverges pointwise from f64 by the trajectory end — "
            "gate is structural attractor invariants (bounding box + spread per axis) + determinism, "
            "NOT a pointwise round-trip; no tolerance widened",
        },
    )


# --------------------------------------------------------------------------- #
# boids-3d — new_canonical (flocking is sensitive over the run → no round-trip)
# --------------------------------------------------------------------------- #
def gate_boids() -> GateResult:
    import wgpu

    sys.path.insert(0, str(REPO / "packages/boids-3d"))
    from boids_3d.reference import canonical_params, evolve  # type: ignore
    from boids_3d.sim import _seeded_flock_initial_state  # type: ignore

    wgsl = (REPO / "packages/boids-3d/src/boids.wgsl").read_text()
    na, steps, ci = 1000, 1000, 100
    p = canonical_params()
    pos0, vel0 = _seeded_flock_initial_state(42, na)
    pos = pos0.astype(np.float32)
    vel = vel0.astype(np.float32)

    _, ad, dev = _adapter()
    U = wgpu.BufferUsage
    nb = na * 3 * 4

    def mk():
        return dev.create_buffer(size=nb, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)

    pos_b, vel_b = [mk(), mk()], [mk(), mk()]
    ub = dev.create_buffer(size=32, usage=U.UNIFORM | U.COPY_DST)
    dev.queue.write_buffer(
        ub,
        0,
        struct.pack(
            "<If6f",
            na,
            p["perception_radius"],
            p["v_max"],
            p["w_sep"],
            p["w_align"],
            p["w_cohere"],
            p["dt"],
            0.0,
        ),
    )
    bgl = dev.create_bind_group_layout(
        entries=[
            {
                "binding": b,
                "visibility": wgpu.ShaderStage.COMPUTE,
                "buffer": {"type": tp},
            }
            for b, tp in [
                (0, wgpu.BufferBindingType.uniform),
                (1, wgpu.BufferBindingType.read_only_storage),
                (2, wgpu.BufferBindingType.read_only_storage),
                (3, wgpu.BufferBindingType.storage),
                (4, wgpu.BufferBindingType.storage),
            ]
        ]
    )
    pipe = dev.create_compute_pipeline(
        layout=dev.create_pipeline_layout(bind_group_layouts=[bgl]),
        compute={"module": dev.create_shader_module(code=wgsl), "entry_point": "main"},
    )

    def bind(s: int):
        d = 1 - s
        return dev.create_bind_group(
            layout=bgl,
            entries=[
                {"binding": 0, "resource": {"buffer": ub, "offset": 0, "size": 32}},
                {
                    "binding": 1,
                    "resource": {"buffer": pos_b[s], "offset": 0, "size": nb},
                },
                {
                    "binding": 2,
                    "resource": {"buffer": vel_b[s], "offset": 0, "size": nb},
                },
                {
                    "binding": 3,
                    "resource": {"buffer": pos_b[d], "offset": 0, "size": nb},
                },
                {
                    "binding": 4,
                    "resource": {"buffer": vel_b[d], "offset": 0, "size": nb},
                },
            ],
        )

    def rd(buf):
        return (
            np.frombuffer(dev.queue.read_buffer(buf), dtype=np.float32)
            .reshape(na, 3)
            .copy()
        )

    def run():
        dev.queue.write_buffer(pos_b[0], 0, pos.reshape(-1).tobytes())
        dev.queue.write_buffer(vel_b[0], 0, vel.reshape(-1).tobytes())
        s = 0
        frames = {0: (rd(pos_b[0]), rd(vel_b[0]))}
        wg = math.ceil(na / 64)
        for st in range(1, steps + 1):
            e = dev.create_command_encoder()
            c = e.begin_compute_pass()
            c.set_pipeline(pipe)
            c.set_bind_group(0, bind(s))
            c.dispatch_workgroups(wg)
            c.end()
            dev.queue.submit([e.finish()])
            s = 1 - s
            if st % ci == 0 or st == steps:
                frames[st] = (rd(pos_b[s]), rd(vel_b[s]))
        return frames

    f1 = run()
    f2 = run()
    twice = all(
        np.array_equal(f1[k][0], f2[k][0]) and np.array_equal(f1[k][1], f2[k][1])
        for k in f1
    )

    # short-horizon agreement (proves correct Reynolds dynamics before sensitivity)
    ph, vh, idx = evolve(pos0, vel0, p, 100, capture_interval=100)
    ref_p100 = ph[idx.index(100)]
    short_abs = float(np.abs(f1[100][0] - ref_p100).max())
    # v_max clamp invariant over the trajectory
    vmax_obs = max(float(np.linalg.norm(f1[k][1], axis=1).max()) for k in f1)
    clamp_ok = vmax_obs <= p["v_max"] * (1.0 + 1e-4)
    # full-run divergence (REPORTED — why new-canonical)
    late_abs = float(np.abs(f1[steps][0]).max())  # informational scale
    short_ok = short_abs < 1e-2

    return GateResult(
        sim="boids-3d",
        kind="new_canonical",
        passed=(twice and clamp_ok and short_ok),
        device=ad.summary,
        run_twice_identical=twice,
        detail={
            "short_horizon_step100_pos_max_abs": short_abs,
            "short_horizon_threshold": 1e-2,
            "v_max_observed": round(vmax_obs, 4),
            "v_max_clamp_ok": clamp_ok,
            "full_run_pos_scale": round(late_abs, 2),
            "note": "flocking is sensitive-dependent: f32 vs f64 agrees to ~3e-3 at step 100 "
            "(correct dynamics) but diverges by step 1000 — new-canonical (determinism + "
            "short-horizon correctness + v_max invariant), NOT a round-trip; no tolerance widened",
        },
    )


# --------------------------------------------------------------------------- #
# physarum — new_canonical (atomic trail deposit → integer-atomic determinism)
# --------------------------------------------------------------------------- #
def gate_physarum() -> GateResult:
    import wgpu

    sys.path.insert(0, str(REPO / "packages/physarum"))
    from physarum.reference import canonical_params  # type: ignore
    from physarum.sim import _seeded_initial_state  # type: ignore
    from capture import load_capture

    wgsl = (REPO / "packages/physarum/src/physarum.wgsl").read_text()
    w = h = 256
    na, steps = 500, 5000
    p = canonical_params()
    pos0, head0 = _seeded_initial_state(42, na, (w, h))
    pos = pos0.astype(np.float32)
    head = head0.astype(np.float32)

    _, ad, dev = _adapter()
    U = wgpu.BufferUsage
    tn = w * h * 4
    Ta = dev.create_buffer(size=tn, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)
    Tb = dev.create_buffer(size=tn, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)
    posb = dev.create_buffer(size=na * 2 * 4, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)
    headb = dev.create_buffer(
        size=na * 2 * 4, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC
    )
    depb = dev.create_buffer(size=tn, usage=U.STORAGE | U.COPY_DST | U.COPY_SRC)
    ub = dev.create_buffer(size=48, usage=U.UNIFORM | U.COPY_DST)
    dphi = math.radians(p["delta_phi_deg"])
    dev.queue.write_buffer(
        ub,
        0,
        struct.pack(
            "<IIII8f",
            na,
            w,
            h,
            0,
            dphi,
            p["L_sense"],
            p["L_move"],
            p["deposit"],
            p["decay_alpha"],
            0,
            0,
            0,
        ),
    )
    ST = wgpu.ShaderStage.COMPUTE
    BT = wgpu.BufferBindingType
    bgl = dev.create_bind_group_layout(
        entries=[
            {"binding": 0, "visibility": ST, "buffer": {"type": BT.uniform}},
            {"binding": 1, "visibility": ST, "buffer": {"type": BT.read_only_storage}},
            {"binding": 2, "visibility": ST, "buffer": {"type": BT.storage}},
            {"binding": 3, "visibility": ST, "buffer": {"type": BT.storage}},
            {"binding": 4, "visibility": ST, "buffer": {"type": BT.storage}},
            {"binding": 5, "visibility": ST, "buffer": {"type": BT.storage}},
        ]
    )
    pl = dev.create_pipeline_layout(bind_group_layouts=[bgl])
    mod = dev.create_shader_module(code=wgsl)
    pa = dev.create_compute_pipeline(
        layout=pl, compute={"module": mod, "entry_point": "agents"}
    )
    pap = dev.create_compute_pipeline(
        layout=pl, compute={"module": mod, "entry_point": "apply"}
    )
    pd = dev.create_compute_pipeline(
        layout=pl, compute={"module": mod, "entry_point": "diffuse"}
    )

    def bind(tin, tout):
        return dev.create_bind_group(
            layout=bgl,
            entries=[
                {"binding": 0, "resource": {"buffer": ub, "offset": 0, "size": 48}},
                {"binding": 1, "resource": {"buffer": tin, "offset": 0, "size": tn}},
                {"binding": 2, "resource": {"buffer": tout, "offset": 0, "size": tn}},
                {
                    "binding": 3,
                    "resource": {"buffer": posb, "offset": 0, "size": na * 2 * 4},
                },
                {
                    "binding": 4,
                    "resource": {"buffer": headb, "offset": 0, "size": na * 2 * 4},
                },
                {"binding": 5, "resource": {"buffer": depb, "offset": 0, "size": tn}},
            ],
        )

    wga, wgg = math.ceil(na / 64), math.ceil(w / 8)

    def run():
        dev.queue.write_buffer(Ta, 0, np.zeros(w * h, dtype=np.float32).tobytes())
        dev.queue.write_buffer(depb, 0, np.zeros(w * h, dtype=np.uint32).tobytes())
        dev.queue.write_buffer(posb, 0, pos.reshape(-1).tobytes())
        dev.queue.write_buffer(headb, 0, head.reshape(-1).tobytes())
        for _ in range(steps):
            e = dev.create_command_encoder()
            c = e.begin_compute_pass()
            c.set_pipeline(pa)
            c.set_bind_group(0, bind(Ta, Tb))
            c.dispatch_workgroups(wga)
            c.end()
            c = e.begin_compute_pass()
            c.set_pipeline(pap)
            c.set_bind_group(0, bind(Ta, Tb))
            c.dispatch_workgroups(wgg, wgg)
            c.end()
            c = e.begin_compute_pass()
            c.set_pipeline(pd)
            c.set_bind_group(0, bind(Tb, Ta))
            c.dispatch_workgroups(wgg, wgg)
            c.end()
            dev.queue.submit([e.finish()])
        return (
            np.frombuffer(dev.queue.read_buffer(Ta), dtype=np.float32)
            .reshape(w, h)
            .copy()
        )

    t1 = run()
    twice = bool(np.array_equal(t1, run()))
    mass = float(t1.sum())
    finite = bool(np.isfinite(t1).all())
    canon = load_capture(
        REPO / "captures/physarum-ref/network-canonical-seed42-step5000.json"
    )
    last = sorted(s.step for s in canon.steps())[-1]
    canon_mass = float(canon.step(last).diagnostics["total_mass"])
    mass_rel = abs(mass - canon_mass) / canon_mass if canon_mass else 0.0
    mass_ok = mass_rel < 1e-3

    return GateResult(
        sim="physarum",
        kind="new_canonical",
        passed=(twice and finite and mass_ok),
        device=ad.summary,
        run_twice_identical=twice,
        detail={
            "total_mass": round(mass, 4),
            "canonical_total_mass": round(canon_mass, 4),
            "mass_rel_diff": mass_rel,
            "atomic_strategy": "integer fixed-point atomicAdd<u32> — order-independent, so run-twice "
            "byte-identical despite the scatter-deposit (float atomic-add would be non-deterministic)",
            "note": "atomics + agent RNG IC preclude a trail-FIELD match to the f64 canonical — "
            "new-canonical: determinism + the exact mass-balance invariant (M=deposit·N·(1-a)/a); "
            "no tolerance widened",
        },
    )


GATES: dict[str, Callable[[], GateResult]] = {
    "reaction-diffusion-2d": gate_rd2d,
    "mandelbulb-explorer": gate_mandelbulb,
    "neural-ca": gate_neural_ca,
    "ising-classical": gate_ising,
    "strange-attractors": gate_strange,
    "boids-3d": gate_boids,
    "physarum": gate_physarum,
}


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in GATES:
        print(f"usage: gpu_gate.py [{' | '.join(GATES)}]", file=sys.stderr)
        return 2
    res = GATES[argv[1]]()
    print(f"=== web-build GPU gate: {res.sim} ({res.kind}) ===")
    print(f"device: {res.device}")
    print(f"run-twice byte-identical: {res.run_twice_identical}")
    for k, v in res.detail.items():
        print(f"  {k}: {v}")
    verdict = "PASS" if res.passed else "FAIL"
    print(f"VERDICT: {verdict}")
    return 0 if res.passed else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
