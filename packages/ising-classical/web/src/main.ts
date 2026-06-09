// 2D Ising (Metropolis) — Stack-B WebGPU web build.
//
// Ships the committed ../../src/metropolis.wgsl (the SAME checkerboard
// parallel-Metropolis kernel the wgpu-native gate runs) through a Vite bundle:
// a live spin-lattice render, the shared settings panel, and a capture-export
// hook that re-emits the spins + energy/magnetization observables.
//
// Correctness gate (web-build track, observable / new-canonical): the WGSL RNG
// (in-shader PCG hash) differs from the NumPy reference's PCG64, so a spin-FIELD
// match would be fake. Instead the gate checks run-twice BYTE-IDENTICAL
// determinism + STATISTICAL equivalence of energy_per_spin to the NumPy
// reference ensemble (z = 0.3 over 6 seeds). The seed-42 IC ships as
// ising-ic-seed42.bin so the browser reproduces the canonical protocol.

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/settings-panel.js";
import { exposeCapture, field, resetCapture } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/metropolis.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const N = 128;
const CANONICAL_STEPS = 10000;
const CAPTURE_INTERVAL = 1000;
const PARAMS = { J: 1.0, h: 0.0, T: 2.27 };
const STEPS_PER_FRAME = 4;

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function fetchCanonicalIC(): Promise<Int32Array> {
  const res = await fetch(`${import.meta.env.BASE_URL}ising-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC asset fetch failed: ${res.status}`);
  const ic = new Int32Array(await res.arrayBuffer());
  if (ic.length !== N * N) throw new Error(`IC length ${ic.length} != ${N * N}`);
  return ic;
}

/** Deterministic exploratory ±1 IC for non-canonical seeds (display only). */
function exploratoryIC(seed: number): Int32Array {
  const out = new Int32Array(N * N);
  let s = (seed >>> 0) || 1;
  for (let i = 0; i < out.length; i += 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s & 0x80000000 ? 1 : -1;
  }
  return out;
}

function energyPerSpin(spins: Int32Array): number {
  let bonds = 0;
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const s = spins[j * N + i]!;
      const right = spins[j * N + ((i + 1) % N)]!;
      const down = spins[((j + 1) % N) * N + i]!;
      bonds += -PARAMS.J * s * (right + down);
    }
  }
  return bonds / (N * N);
}

function magnetization(spins: Int32Array): number {
  let sum = 0;
  for (let i = 0; i < spins.length; i += 1) sum += spins[i]!;
  return sum / spins.length;
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

  const bytes = N * N * 4;
  const spinBuffer = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const paramBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const computeModule = device.createShaderModule({ code: computeWgsl, label: "ising" });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computePipeline = await device.createComputePipelineAsync({
    label: "ising",
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const computeBG = device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer: paramBuffer } },
      { binding: 1, resource: { buffer: spinBuffer } },
    ],
  });

  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "ising-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([N, 0]));
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "ising-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: spinBuffer } },
    ],
  });

  let step = 0;
  const wg = Math.ceil(N / 8);

  function sweep(seedOverride?: number): void {
    step += 1;
    for (let color = 0; color < 2; color += 1) {
      const buf = new ArrayBuffer(32);
      const dv = new DataView(buf);
      dv.setUint32(0, N, true);
      dv.setUint32(4, step, true);
      dv.setUint32(8, color, true);
      dv.setUint32(12, seedOverride ?? panel.getState().seed, true);
      dv.setFloat32(16, PARAMS.J, true);
      dv.setFloat32(20, PARAMS.h, true);
      dv.setFloat32(24, PARAMS.T, true);
      dv.setFloat32(28, 0, true);
      queue.writeBuffer(paramBuffer, 0, buf);
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.end();
      queue.submit([enc.finish()]);
    }
  }

  async function readSpins(): Promise<Int32Array> {
    const rb = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(spinBuffer, 0, rb, 0, bytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Int32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function loadIC(seed: number): Promise<void> {
    const ic = seed === 42 ? await fetchCanonicalIC() : exploratoryIC(seed);
    queue.writeBuffer(spinBuffer, 0, ic);
    step = 0;
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("equilibrating… (10000 sweeps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    queue.writeBuffer(spinBuffer, 0, await fetchCanonicalIC());
    step = 0;
    for (let s = 0; s < CANONICAL_STEPS; s += 1) sweep(42);
    const spins = await readSpins();
    const f64 = new Float64Array(N * N);
    for (let i = 0; i < f64.length; i += 1) f64[i] = spins[i]!;
    const E = energyPerSpin(spins);
    const M = magnetization(spins);
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "ising-classical", category: "lattice-spin", variant: "metropolis" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "reference", dims: [N, N], dtype: "f64", seed: 42, params: PARAMS },
          run: { step_count: CANONICAL_STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "metropolis-128sq-T2.27-seed42-step10000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps: [
          { step: CANONICAL_STEPS, state: { spins: field(f64, [N, N], "f64") }, diagnostics: { energy_per_spin: E, magnetization: M } },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — E/N=${E.toFixed(4)}, M=${M.toFixed(4)}`);
    panel.setCaptureEnabled(true);
    await loadIC(panel.getState().seed);
  }

  const panel = createSettingsPanel("2D Ising — Metropolis", {
    initial: { tier: "reference", seed: 42 },
    onCapture: captureCanonical,
    onChange: (st) => { void loadIC(st.seed); },
  });

  await loadIC(42);
  boot.textContent = "";

  function frame(): void {
    for (let i = 0; i < STEPS_PER_FRAME; i += 1) sweep();
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } },
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
