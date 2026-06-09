// Physarum transport network (Jones 2010) — Stack-B WebGPU web build.
//
// Ships the committed ../../src/physarum.wgsl (the SAME 3-pass kernel the
// wgpu-native gate runs): agents (sense/rotate/move + integer-atomic deposit),
// apply (deposit -> trail), diffuse (box-blur + decay). Trail colormap render +
// capture-export re-emit positions/headings/trail_map + total_mass.
//
// Correctness gate (web-build track, new-canonical): the trail deposit is the
// sim's atomic op — done as INTEGER fixed-point atomicAdd<u32> (order-
// independent → run-twice BYTE-IDENTICAL, unlike non-associative float atomics).
// Atomics + the agent RNG IC preclude a trail-field match to the f64 canonical,
// so the gate is determinism + the EXACT mass-balance invariant (total_mass =
// deposit·N·(1-α)/α = 22500). Seed-42 IC ships as physarum-ic-seed42.bin.

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/settings-panel.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/physarum.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const W = 256;
const H = 256;
const NA = 500;
const STEPS = 5000;
const CAPTURE_INTERVAL = 500;
const PARAMS = { delta_phi_deg: 45.0, L_sense: 9.0, L_move: 1.0, deposit: 5.0, decay_alpha: 0.1 };

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function fetchIC(): Promise<{ pos: Float32Array; head: Float32Array }> {
  const res = await fetch(`${import.meta.env.BASE_URL}physarum-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC fetch failed: ${res.status}`);
  const all = new Float32Array(await res.arrayBuffer());
  return { pos: all.slice(0, NA * 2), head: all.slice(NA * 2) };
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
  const U = GPUBufferUsage;
  const tn = W * H * 4;
  const Ta = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const Tb = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const posB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const headB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const depB = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST });
  const paramBuf = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
  {
    const buf = new ArrayBuffer(48);
    const dv = new DataView(buf);
    dv.setUint32(0, NA, true);
    dv.setUint32(4, W, true);
    dv.setUint32(8, H, true);
    dv.setUint32(12, 0, true);
    dv.setFloat32(16, (PARAMS.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, PARAMS.L_sense, true);
    dv.setFloat32(24, PARAMS.L_move, true);
    dv.setFloat32(28, PARAMS.deposit, true);
    dv.setFloat32(32, PARAMS.decay_alpha, true);
    queue.writeBuffer(paramBuf, 0, buf);
  }

  const module = device.createShaderModule({ code: computeWgsl, label: "physarum" });
  const bgl = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const pl = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
  const pAgents = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "agents" } });
  const pApply = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "apply" } });
  const pDiffuse = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "diffuse" } });

  const bind = (tin: GPUBuffer, tout: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: tin } },
        { binding: 2, resource: { buffer: tout } },
        { binding: 3, resource: { buffer: posB } },
        { binding: 4, resource: { buffer: headB } },
        { binding: 5, resource: { buffer: depB } },
      ],
    });

  const wga = Math.ceil(NA / 64);
  const wgg = Math.ceil(W / 8);
  function step(): void {
    const enc = device.createCommandEncoder();
    let c = enc.beginComputePass();
    c.setPipeline(pAgents); c.setBindGroup(0, bind(Ta, Tb)); c.dispatchWorkgroups(wga); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pApply); c.setBindGroup(0, bind(Ta, Tb)); c.dispatchWorkgroups(wgg, wgg); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pDiffuse); c.setBindGroup(0, bind(Tb, Ta)); c.dispatchWorkgroups(wgg, wgg); c.end();
    queue.submit([enc.finish()]);
  }

  async function readF32(buf: GPUBuffer, n: number): Promise<Float32Array> {
    const rb = device.createBuffer({ size: n * 4, usage: U.COPY_DST | U.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, rb, 0, n * 4);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function reset(): Promise<void> {
    const { pos, head } = await fetchIC();
    queue.writeBuffer(Ta, 0, new Float32Array(W * H));
    queue.writeBuffer(depB, 0, new Uint32Array(W * H));
    queue.writeBuffer(posB, 0, pos);
    queue.writeBuffer(headB, 0, head);
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("growing network… (5000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    await reset();
    for (let s = 0; s < STEPS; s += 1) step();
    const trail = await readF32(Ta, W * H);
    const pos = await readF32(posB, NA * 2);
    const head = await readF32(headB, NA * 2);
    const trail64 = new Float64Array(trail);
    let mass = 0;
    for (let i = 0; i < trail.length; i += 1) mass += trail[i]!;
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "physarum", category: "agent-based", variant: "jones-2010-canonical" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [W, H], dtype: "f64", seed: 42, params: { ...PARAMS, n_agents: NA } },
          run: { step_count: STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "network-canonical-seed42-step5000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: true, subgroup_ops: false },
        },
        steps: [
          {
            step: STEPS,
            state: {
              positions: field(new Float64Array(pos), [NA, 2], "f64"),
              headings: field(new Float64Array(head), [NA, 2], "f64"),
              trail_map: field(trail64, [W, H], "f64"),
            },
            diagnostics: { total_mass: mass },
          },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — total_mass=${mass.toFixed(1)} (atomic deposit; new-canonical)`);
    panel.setCaptureEnabled(true);
    await reset();
  }

  // render
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "physarum-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 8, usage: U.UNIFORM | U.COPY_DST });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([W, H]));
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: Ta } },
    ],
  });

  const panel = createSettingsPanel("Physarum Network", { initial: { tier: "test", seed: 42 }, onCapture: captureCanonical });
  await reset();
  boot.textContent = "";
  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    step();
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0.01, b: 0.05, a: 1 } },
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
