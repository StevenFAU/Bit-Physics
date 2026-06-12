// Growing Neural CA — Stack-B WebGPU web build.
//
// Ships the committed ../../typescript/src/nca_inference.wgsl (the SAME shader
// the wgpu-native gate runs) + the converted checkpoint through a Vite bundle:
// a live RGBA render of the growing pattern, the shared settings panel, and a
// capture-export hook that re-emits the B-inference rgba frames.
//
// This is the browser implementation of the driver previously stubbed at
// ../../typescript/src/index.ts (Stage 1b-B): a two-dispatch step (update then
// mask) over three rotating state buffers, mirroring neural_ca.wgsl_harness.
//
// Correctness gate (web-build track): the committed shader is BIT-EXACT vs the
// WGSL canonical (captures/neural-ca-ref/...-wgsl) on the real GPU, run-twice
// byte-identical — resolves via [defaults.continuous-ca] 0.0/0.0 (no row added).

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";

import inferenceWgsl from "../../typescript/src/nca_inference.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const GRID = 64;
const CN = 16;
const CANONICAL_STEPS = 1000;
const CAPTURE_EVERY = 50;
const FIRE_RATE = 0.5;
const STEPS_PER_FRAME = 2;

interface Layout {
  tensors: Record<string, { offset: number }>;
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function seedState(): Float32Array {
  // Single live centre cell: channels 3.. = 1.0 (alpha + hidden).
  const s = new Float32Array(GRID * GRID * CN);
  const mid = Math.floor(GRID / 2);
  const base = (mid * GRID + mid) * CN;
  for (let c = 3; c < CN; c += 1) s[base + c] = 1.0;
  return s;
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

  const [weightsBuf, layout] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}nca-weights.bin`).then((r) => r.arrayBuffer()),
    fetch(`${import.meta.env.BASE_URL}nca-layout.json`).then((r) => r.json() as Promise<Layout>),
  ]);
  const weights = new Float32Array(weightsBuf);
  const b1Off = layout.tensors["w1.bias"]!.offset;
  const w1Off = layout.tensors["w1.weight"]!.offset;
  const w2Off = layout.tensors["w2.weight"]!.offset;

  const stateLen = GRID * GRID * CN;
  const stateBytes = stateLen * 4;
  const U = GPUBufferUsage;
  const makeState = (): GPUBuffer =>
    device.createBuffer({ size: stateBytes, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST });
  let cur = makeState();
  const mid = makeState();
  let nxt = makeState();
  const wbuf = device.createBuffer({ size: weights.byteLength, usage: U.STORAGE | U.COPY_DST });
  queue.writeBuffer(wbuf, 0, weights);
  const paramBuf = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST });

  const module = device.createShaderModule({ code: inferenceWgsl, label: "nca" });
  const bgl = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ],
  });
  const pl = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
  const pipeUpdate = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "update" } });
  const pipeMask = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "mask" } });

  function writeParams(step: number, seed: number): void {
    const buf = new ArrayBuffer(32);
    const dv = new DataView(buf);
    dv.setUint32(0, GRID, true);
    dv.setUint32(4, step, true);
    dv.setUint32(8, seed, true);
    dv.setFloat32(12, FIRE_RATE, true);
    dv.setUint32(16, b1Off, true);
    dv.setUint32(20, w1Off, true);
    dv.setUint32(24, w2Off, true);
    dv.setUint32(28, 0, true);
    queue.writeBuffer(paramBuf, 0, buf);
  }

  function bind(a: GPUBuffer, b: GPUBuffer, out: GPUBuffer): GPUBindGroup {
    return device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: a } },
        { binding: 2, resource: { buffer: b } },
        { binding: 3, resource: { buffer: out } },
        { binding: 4, resource: { buffer: wbuf } },
      ],
    });
  }

  const wg = Math.ceil(GRID / 8);

  function stepOnce(step: number, seed: number): void {
    writeParams(step, seed);
    // pass 1 (update): in=cur, out=mid (binding2 dummy=cur)
    const enc1 = device.createCommandEncoder();
    const p1 = enc1.beginComputePass();
    p1.setPipeline(pipeUpdate);
    p1.setBindGroup(0, bind(cur, cur, mid));
    p1.dispatchWorkgroups(wg, wg);
    p1.end();
    queue.submit([enc1.finish()]);
    // pass 2 (mask): pre=cur, post=mid, out=nxt
    const enc2 = device.createCommandEncoder();
    const p2 = enc2.beginComputePass();
    p2.setPipeline(pipeMask);
    p2.setBindGroup(0, bind(cur, mid, nxt));
    p2.dispatchWorkgroups(wg, wg);
    p2.end();
    queue.submit([enc2.finish()]);
    [cur, nxt] = [nxt, cur];
  }

  async function readState(): Promise<Float32Array> {
    const rb = device.createBuffer({ size: stateBytes, usage: U.COPY_DST | U.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(cur, 0, rb, 0, stateBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  function reset(): void {
    queue.writeBuffer(cur, 0, seedState());
    queue.writeBuffer(mid, 0, new Float32Array(stateLen));
    queue.writeBuffer(nxt, 0, new Float32Array(stateLen));
  }

  // render
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "nca-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 8, usage: U.UNIFORM | U.COPY_DST });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([GRID, CN]));
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  async function captureCanonical(): Promise<void> {
    panel.setStatus("rolling NCA forward… (1000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    reset();
    const steps: CaptureStepDescriptor[] = [];
    const recordFrame = (idx: number, st: Float32Array): void => {
      const rgba = new Float32Array(GRID * GRID * 4);
      for (let c = 0; c < GRID * GRID; c += 1) {
        for (let ch = 0; ch < 4; ch += 1) {
          rgba[c * 4 + ch] = Math.min(1, Math.max(0, st[c * CN + ch] ?? 0));
        }
      }
      steps.push({ step: idx, state: { rgba: field(rgba, [GRID, GRID, 4], "f32") }, diagnostics: {} });
    };
    recordFrame(0, await readState());
    for (let s = 0; s < CANONICAL_STEPS; s += 1) {
      stepOnce(s, 42);
      if ((s + 1) % CAPTURE_EVERY === 0) recordFrame(s + 1, await readState());
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "neural-ca", category: "continuous-ca", variant: "growing-neural-ca" },
          stack: { name: "wgsl", version: "webgpu", build_id: "web-build-5.x" },
          config: { tier: "reference", dims: [GRID, GRID], dtype: "f32", seed: 42, params: { channel_n: CN, steps: CANONICAL_STEPS, capture_every: CAPTURE_EVERY } },
          run: { step_count: CANONICAL_STEPS, capture_interval: CAPTURE_EVERY, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "growing-emoji-64sq-seed42-step1000-wgsl.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps,
      },
      { download: false },
    );
    panel.setStatus(`capture ready — ${steps.length} frames`);
    panel.setCaptureEnabled(true);
    reset();
    liveStep = 0;
  }

  // Study = pause stepping, keep presenting (P-4 rule 0.5.3): measured at
  // HEAD, all state mutation lives in the update/mask COMPUTE dispatches
  // inside stepOnce(); the render pass is a fullscreen triangle reading the
  // `cur` buffer through a read-only-storage binding (renderBGL above) and
  // dispatches no compute. Stepping and presenting separate cleanly, so Study
  // suspends the physics only (D-P1.2(b)).
  let suspended = false;
  let liveStep = 0;

  // Study diagnostics (house § 5.4): alive-cell statistics measured via the
  // SAME readState() readback the capture path uses, on the live state buffer.
  // "Alive" is the kernel's own criterion (nca_inference.wgsl alive mask:
  // maxpool_3x3(alpha) > 0.1; here per-cell alpha > 0.1). The sequence token
  // drops superseded measurements (binding rule P-4 § 0.5.5).
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const st = await readState();
    if (seq !== diagSeq) return;
    let alive = 0;
    let alphaMass = 0;
    let maxAlpha = 0;
    for (let c = 0; c < GRID * GRID; c += 1) {
      const a = st[c * CN + 3] ?? 0;
      if (a > 0.1) alive += 1;
      alphaMass += a;
      if (a > maxAlpha) maxAlpha = a;
    }
    panel.setDiagnostics([
      { label: "grid / channels", value: `${GRID} × ${GRID} / ${CN}` },
      { label: "live step", value: String(liveStep) },
      { label: "fire rate", value: FIRE_RATE.toFixed(2) },
      { label: "alive cells (α>0.1)", value: String(alive) },
      { label: "alive fraction", value: (alive / (GRID * GRID)).toFixed(4) },
      { label: "alpha mass", value: alphaMass.toFixed(1) },
      { label: "max alpha", value: maxAlpha.toFixed(3) },
      { label: "capture pinned to", value: "canonical 1000-step, seed 42" },
    ]);
  }

  const panel = createSettingsPanel("Growing Neural CA", {
    initial: { tier: "reference", seed: 42 },
    onCapture: captureCanonical,
    onChange: () => { reset(); liveStep = 0; },
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
          "the committed nca_inference.wgsl — the exact two-dispatch (update + mask) compute step the wgpu-native gate runs, with the converted training checkpoint; every displayed frame is a real kernel step from the single-live-cell seed",
        simplified:
          "the live view free-runs the seed-42 stochastic fire mask and restarts from the seed every 400 steps so the growth stays watchable; the capture re-runs the canonical 1000-step rollout from the same seed state — nothing in the live loop feeds it",
        measured:
          "alive-cell statistics read back from the live state buffer on entering Study (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate: "capture_roundtrip + run-twice (rgba frames bit-exact vs the WGSL canonical on the real GPU; two runs byte-identical)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/continuous-ca/neural-ca/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });

  reset();
  boot.textContent = "";

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      for (let i = 0; i < STEPS_PER_FRAME; i += 1) {
        stepOnce(liveStep, 42);
        liveStep += 1;
        if (liveStep > 400) { reset(); liveStep = 0; }
      }
    }
    const renderBG = device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: cur } },
      ],
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 1, g: 1, b: 1, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBG);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
