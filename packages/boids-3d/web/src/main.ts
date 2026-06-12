// Boids 3D (Reynolds flocking) — Stack-B WebGPU web build.
//
// Ships the committed ../../src/boids.wgsl (the SAME flocking kernel the
// wgpu-native gate runs): a ping-pong compute step + an orbiting point-cloud
// render. Settings panel + capture-export re-emit the flock descriptor
// (position + velocity + speed diagnostics).
//
// Correctness gate (web-build track, new-canonical): flocking is sensitive-
// dependent — f32 vs the f64 canonical agrees to ~3e-3 at step 100 (correct
// Reynolds dynamics) but diverges by step 1000 — so the gate is run-twice
// byte-identical determinism + short-horizon correctness + the v_max clamp
// invariant, NOT a pointwise round-trip. Seed-42 IC ships as boids-ic-seed42.bin.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/boids.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const NA = 1000;
const STEPS = 1000;
const CAPTURE_INTERVAL = 100;
const PARAMS = { perception: 5.0, v_max: 3.0, w_sep: 1.5, w_align: 1.0, w_cohere: 1.0, dt: 0.05 };

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function fetchIC(): Promise<{ pos: Float32Array; vel: Float32Array }> {
  const res = await fetch(`${import.meta.env.BASE_URL}boids-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC fetch failed: ${res.status}`);
  const all = new Float32Array(await res.arrayBuffer());
  return { pos: all.slice(0, NA * 3), vel: all.slice(NA * 3) };
}

async function main(): Promise<void> {
  let ctx;
  try {
    ctx = await createContext();
  } catch (e) {
    boot.textContent = `WebGPU unavailable: ${(e as Error).message}`;
    throw e;
  }
  const { device, queue } = ctx;
  const nb = NA * 3 * 4;
  const U = GPUBufferUsage;
  const mk = (): GPUBuffer => device.createBuffer({ size: nb, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const posB = [mk(), mk()];
  const velB = [mk(), mk()];
  let s = 0;

  const paramBuf = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST });
  {
    const buf = new ArrayBuffer(32);
    const dv = new DataView(buf);
    dv.setUint32(0, NA, true);
    dv.setFloat32(4, PARAMS.perception, true);
    dv.setFloat32(8, PARAMS.v_max, true);
    dv.setFloat32(12, PARAMS.w_sep, true);
    dv.setFloat32(16, PARAMS.w_align, true);
    dv.setFloat32(20, PARAMS.w_cohere, true);
    dv.setFloat32(24, PARAMS.dt, true);
    dv.setFloat32(28, 0, true);
    queue.writeBuffer(paramBuf, 0, buf);
  }

  // Named flock regimes (house § 5.3, ruling D-P1.2(a)): live-loop presets
  // over the SAME committed kernel — weight/perception uniforms only (v_max
  // and dt stay canonical). Names describe the measured behavior of THIS
  // kernel (distinctness screenshots + order parameters in the P-4 audit).
  // The capture path steps with the canonical paramBuf above, never with the
  // live regime buffer below.
  interface FlockRegime {
    label: string;
    title: string;
    w_sep: number;
    w_align: number;
    w_cohere: number;
    perception: number;
  }
  const REGIMES: readonly FlockRegime[] = [
    {
      label: "canonical",
      title: "Reynolds 1987 canonical weights — w_sep 1.5, w_align 1.0, w_cohere 1.0, perception 5. The capture regime.",
      w_sep: PARAMS.w_sep, w_align: PARAMS.w_align, w_cohere: PARAMS.w_cohere, perception: PARAMS.perception,
    },
    {
      label: "tight swarm",
      title: "cohesion-dominant — w_cohere 2.5, w_sep 0.5: the flock contracts into a dense ball",
      w_sep: 0.5, w_align: 1.0, w_cohere: 2.5, perception: 5.0,
    },
    {
      label: "midge cloud",
      title: "cohesion without alignment — w_cohere 2.0, w_sep 2.0, w_align 0.2, perception 8: a fast, agitated swarm that holds together without a common heading",
      w_sep: 2.0, w_align: 0.2, w_cohere: 2.0, perception: 8.0,
    },
    {
      label: "flocklets",
      title: "short sight — canonical weights at perception 2: the flock fragments into many small independent groups",
      w_sep: 1.5, w_align: 1.0, w_cohere: 1.0, perception: 2.0,
    },
  ];
  let activeRegime: FlockRegime = REGIMES[0]!;
  const liveParamBuf = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST });
  function writeLiveParams(r: FlockRegime): void {
    const buf = new ArrayBuffer(32);
    const dv = new DataView(buf);
    dv.setUint32(0, NA, true);
    dv.setFloat32(4, r.perception, true);
    dv.setFloat32(8, PARAMS.v_max, true);
    dv.setFloat32(12, r.w_sep, true);
    dv.setFloat32(16, r.w_align, true);
    dv.setFloat32(20, r.w_cohere, true);
    dv.setFloat32(24, PARAMS.dt, true);
    dv.setFloat32(28, 0, true);
    queue.writeBuffer(liveParamBuf, 0, buf);
  }
  writeLiveParams(activeRegime);

  const computeModule = device.createShaderModule({ code: computeWgsl, label: "boids" });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computePipeline = await device.createComputePipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const computeBG = (src: number, params: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: posB[src]! } },
        { binding: 2, resource: { buffer: velB[src]! } },
        { binding: 3, resource: { buffer: posB[1 - src]! } },
        { binding: 4, resource: { buffer: velB[1 - src]! } },
      ],
    });

  const wg = Math.ceil(NA / 64);
  function stepWith(params: GPUBuffer): void {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, computeBG(s, params));
    pass.dispatchWorkgroups(wg);
    pass.end();
    queue.submit([enc.finish()]);
    s = 1 - s;
  }
  // The capture path steps ONLY with the canonical paramBuf; the RAF live
  // loop steps with the live regime buffer (D-P1.2(a) pinning split).
  const stepCanonical = (): void => stepWith(paramBuf);
  const stepLive = (): void => stepWith(liveParamBuf);

  async function readBuf(buf: GPUBuffer): Promise<Float32Array> {
    const rb = device.createBuffer({ size: nb, usage: U.COPY_DST | U.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, rb, 0, nb);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function loadIC(): Promise<void> {
    const { pos, vel } = await fetchIC();
    queue.writeBuffer(posB[0]!, 0, pos);
    queue.writeBuffer(velB[0]!, 0, vel);
    s = 0;
  }

  function speeds(vel: Float32Array): { max: number; mean: number } {
    let max = 0;
    let sum = 0;
    for (let a = 0; a < NA; a += 1) {
      const m = Math.hypot(vel[a * 3]!, vel[a * 3 + 1]!, vel[a * 3 + 2]!);
      if (m > max) max = m;
      sum += m;
    }
    return { max, mean: sum / NA };
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("flocking… (1000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    await loadIC();
    const steps: CaptureStepDescriptor[] = [];
    const record = async (idx: number): Promise<void> => {
      const pos = await readBuf(posB[s]!);
      const vel = await readBuf(velB[s]!);
      const p64 = new Float64Array(pos);
      const v64 = new Float64Array(vel);
      const sp = speeds(vel);
      steps.push({
        step: idx,
        state: { position: field(p64, [NA, 3], "f64"), velocity: field(v64, [NA, 3], "f64") },
        diagnostics: { max_speed: sp.max, mean_speed: sp.mean },
      });
    };
    await record(0);
    for (let st = 1; st <= STEPS; st += 1) {
      stepCanonical();
      if (st % CAPTURE_INTERVAL === 0 || st === STEPS) await record(st);
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "boids-3d", category: "agent-based", variant: "reynolds-1987-canonical" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [NA, 3], dtype: "f64", seed: 42, params: { ...PARAMS, n_agents: NA, perception_radius: PARAMS.perception, ic_jitter_scale: 1e-6 } },
          run: { step_count: STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "flock-1000agents-seed42-step1000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps,
      },
      { download: false },
    );
    panel.setStatus(`capture ready — ${steps.length} frames (sensitive; new-canonical)`);
    panel.setCaptureEnabled(true);
    await loadIC();
  }

  // render
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "boids-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 16, usage: U.UNIFORM | U.COPY_DST });
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  // Study diagnostics (house § 5.4): flock statistics measured via the SAME
  // readBuf readback the capture path uses, on the live state buffers. The
  // sequence token drops superseded measurements (P-3 §9 lesson, binding rule
  // P-4 §0.5.2 — pattern from packages/strange-attractors/web/src/main.ts).
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const pos = await readBuf(posB[s]!);
    const vel = await readBuf(velB[s]!);
    if (seq !== diagSeq) return;
    const sp = speeds(vel);
    // polarization |Σ v̂|/N (1 = all aligned) and rms distance to centroid
    let ux = 0, uy = 0, uz = 0, cx = 0, cy = 0, cz = 0;
    for (let a = 0; a < NA; a += 1) {
      const m = Math.hypot(vel[a * 3]!, vel[a * 3 + 1]!, vel[a * 3 + 2]!);
      if (m > 1e-12) {
        ux += vel[a * 3]! / m; uy += vel[a * 3 + 1]! / m; uz += vel[a * 3 + 2]! / m;
      }
      cx += pos[a * 3]!; cy += pos[a * 3 + 1]!; cz += pos[a * 3 + 2]!;
    }
    cx /= NA; cy /= NA; cz /= NA;
    let r2 = 0;
    for (let a = 0; a < NA; a += 1) {
      r2 += (pos[a * 3]! - cx) ** 2 + (pos[a * 3 + 1]! - cy) ** 2 + (pos[a * 3 + 2]! - cz) ** 2;
    }
    const reg = activeRegime;
    panel.setDiagnostics([
      { label: "live regime", value: reg.label },
      { label: "agents", value: String(NA) },
      { label: "live step", value: `${liveStep} (IC reset @ ${STEPS})` },
      { label: "weights s/a/c", value: `${reg.w_sep} / ${reg.w_align} / ${reg.w_cohere}` },
      { label: "perception", value: reg.perception.toFixed(1) },
      { label: "mean speed", value: sp.mean.toFixed(3) },
      { label: "max speed", value: `${sp.max.toFixed(3)} (clamp ${PARAMS.v_max})` },
      { label: "polarization", value: (Math.hypot(ux, uy, uz) / NA).toFixed(3) },
      { label: "rms spread", value: Math.sqrt(r2 / NA).toFixed(2) },
      { label: "capture pinned to", value: "canonical, seed 42" },
    ]);
  }

  function applyRegime(r: FlockRegime): void {
    activeRegime = r;
    writeLiveParams(r);
    panel.setStatus(
      r === REGIMES[0]
        ? "live flock: canonical — the capture regime"
        : `live flock: ${r.label} — capture stays pinned to canonical seed-42`,
    );
    if (suspended) void measureStudyDiagnostics();
  }

  const panel = createSettingsPanel("Boids 3D", {
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
    presets: REGIMES.map((r) => ({
      label: r.label,
      title: r.title,
      apply: () => applyRegime(r),
    })),
    modes: {
      initial: "play",
      onMode: (m) => {
        suspended = m === "study";
        if (suspended) void measureStudyDiagnostics();
      },
    },
    study: {
      diagnostics: [{ label: "diagnostics", value: "measuring…" }],
      honesty: {
        faithful:
          "the committed boids.wgsl Reynolds kernel — the same flocking compute the wgpu-native gate runs (w_sep 1.5, w_align 1.0, w_cohere 1.0, perception 5, v_max 3, dt 0.05; seed-42 IC); every displayed frame is a real kernel step",
        simplified:
          "f32 + sensitive dependence: agreement with the f64 canonical holds at the step-100 short horizon but diverges by step 1000, so the gate is determinism + invariants, not pointwise; presets and cursor drive the live loop only — the capture re-runs from the seed-42 IC with the canonical params; the live flock restarts from the IC every 1000 steps",
        measured:
          "flock statistics read back from the live position/velocity buffers on entering Study and on preset change (stepping is paused in Study; the view keeps rendering)",
      },
      verdict: {
        gate: "new_canonical + run-twice (byte-identical runs; step-100 match to the f64 reference; v_max clamp)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/agent-based/boids-3d/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });
  panel.setActivePreset("canonical");
  await loadIC();
  boot.textContent = "";
  let angle = 0;
  let liveStep = 0;
  // Study = pause stepping, keep presenting (P-4 rule 0.5.3): measured at
  // HEAD, the render path is read-only over pos/vel (render.wgsl declares
  // var<storage, read>; the render encoder dispatches no compute), so
  // render-without-step is a clean separation — the frozen flock stays
  // orbitable while the physics is suspended (D-P1.2(b)).
  let suspended = false;

  // Cursor-as-camera (house § 5.1, D-P1.2(a) class): drag orbits the flock by
  // driving the SAME render-uniform angle slot the auto-orbit writes — live
  // loop only; nothing here is read by captureCanonical/readBuf/step. The
  // auto-orbit resumes after AUTO_ORBIT_IDLE_MS without pointer input. The
  // render loop keeps presenting in Study, so dragging works there too.
  const AUTO_ORBIT_IDLE_MS = 4000;
  const DRAG_RAD_PER_PX = 0.008;
  let lastPointerMs = -AUTO_ORBIT_IDLE_MS; // boot: auto-orbit live immediately
  let dragPointer: number | null = null;
  let dragX = 0;
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", (e) => {
    dragPointer = e.pointerId;
    dragX = e.clientX;
    lastPointerMs = performance.now();
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragPointer !== e.pointerId) return;
    angle += (e.clientX - dragX) * DRAG_RAD_PER_PX;
    dragX = e.clientX;
    lastPointerMs = performance.now();
  });
  const endDrag = (e: PointerEvent): void => {
    if (dragPointer !== e.pointerId) return;
    dragPointer = null;
    lastPointerMs = performance.now();
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      stepLive();
      liveStep += 1;
      if (liveStep > STEPS) { void loadIC(); liveStep = 0; }
    }
    if (performance.now() - lastPointerMs > AUTO_ORBIT_IDLE_MS) angle += 0.003;
    queue.writeBuffer(renderUniform, 0, new Float32Array([canvas.width / canvas.height, angle, NA, 0]));
    const renderBG = device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: posB[s]! } },
        { binding: 2, resource: { buffer: velB[s]! } },
      ],
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBG);
    pass.draw(NA * 6); // 6 vertices per agent — quad sprites (render.wgsl)
    pass.end();
    queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
