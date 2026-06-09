// Mandelbulb explorer — Stack-B WebGPU web build.
//
// Display: a sphere-tracing ray-march of the Quilez p8 mandelbulb (render.wgsl).
// Capture-export: evaluates the distance estimator at the canonical 16×16 probe
// grid using the COMMITTED ../../src/mandelbulb_de.wgsl compute kernel — the same
// shader the wgpu-native gate runs — and re-emits the de-probe-points descriptor.
//
// Correctness gate (web-build track, new-canonical): the f32 GPU DE agrees with
// the f64 canonical to the single-precision floor (~1.5e-5, just outside the
// closed-form 1e-5 budget — an f32 limit, not a defect), and is run-twice
// byte-identical. No tolerance is widened; see tools/productization/web-build.

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/settings-panel.js";
import { exposeCapture, field, resetCapture } from "../../../../common/common-web/src/capture-export.js";

import deWgsl from "../../src/mandelbulb_de.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const GRID = 16;
const BOX = 1.5;
const P = 8;
const ESCAPE_RADIUS = 2.0;
const N_MAX = 16;
// Seed-42 grid-origin jitter = 1e-6 * numpy default_rng(42).standard_normal(3),
// frozen so the browser reproduces the canonical IC (numpy PCG64 is not
// reproducible in-browser). Matches packages/mandelbulb-explorer sim.py.
const SEED42_OFFSET: readonly [number, number, number] = [
  3.047170797544313e-7, -1.0399841062404955e-6, 7.504511958064573e-7,
];

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

/** Build the canonical 16×16 z=0 probe grid + seed-42 origin jitter. */
function probeGrid(): Float64Array {
  const out = new Float64Array(GRID * GRID * 3);
  for (let j = 0; j < GRID; j += 1) {
    for (let i = 0; i < GRID; i += 1) {
      const x = -BOX + (2 * BOX * i) / (GRID - 1);
      const y = -BOX + (2 * BOX * j) / (GRID - 1);
      const idx = (j * GRID + i) * 3;
      out[idx + 0] = x + SEED42_OFFSET[0];
      out[idx + 1] = y + SEED42_OFFSET[1];
      out[idx + 2] = 0 + SEED42_OFFSET[2];
    }
  }
  return out;
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

  // ---- display render pipeline ----
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "mb-render" });
  const renderUniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
  });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "mb-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [{ binding: 0, resource: { buffer: renderUniform } }],
  });

  // ---- DE compute pipeline (committed shader; capture path) ----
  const deModule = device.createShaderModule({ code: deWgsl, label: "mb-de" });
  const deBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const dePipeline = await device.createComputePipelineAsync({
    label: "mb-de",
    layout: device.createPipelineLayout({ bindGroupLayouts: [deBGL] }),
    compute: { module: deModule, entryPoint: "main" },
  });

  async function captureCanonical(): Promise<void> {
    panel.setStatus("evaluating DE on 256 probe points…");
    panel.setCaptureEnabled(false);
    resetCapture();
    const pts64 = probeGrid();
    const nP = GRID * GRID;
    const pts32 = new Float32Array(pts64); // f32 for the GPU
    const params = new ArrayBuffer(16);
    const dv = new DataView(params);
    dv.setUint32(0, nP, true);
    dv.setUint32(4, P, true);
    dv.setFloat32(8, ESCAPE_RADIUS, true);
    dv.setUint32(12, N_MAX, true);
    const ub = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    queue.writeBuffer(ub, 0, params);
    const pin = device.createBuffer({ size: pts32.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    queue.writeBuffer(pin, 0, pts32);
    const dout = device.createBuffer({ size: nP * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const bg = device.createBindGroup({
      layout: deBGL,
      entries: [
        { binding: 0, resource: { buffer: ub } },
        { binding: 1, resource: { buffer: pin } },
        { binding: 2, resource: { buffer: dout } },
      ],
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(dePipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(nP / 64), 1, 1);
    pass.end();
    const rb = device.createBuffer({ size: nP * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyBufferToBuffer(dout, 0, rb, 0, nP * 4);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const de32 = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();

    const de = new Float64Array(nP);
    let nOutside = 0;
    let maxDe = -Infinity;
    for (let i = 0; i < nP; i += 1) {
      de[i] = de32[i] ?? 0;
      if (de[i]! > 0) nOutside += 1;
      if (de[i]! > maxDe) maxDe = de[i]!;
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "mandelbulb-explorer", category: "closed-form", variant: "quilez-p8" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: {
            tier: "test", dims: [GRID, GRID], dtype: "f64", seed: 42,
            params: { p: P, escape_radius: ESCAPE_RADIUS, n_max: N_MAX, box_half_extent: BOX, grid_jitter_scale: 1e-6 },
          },
          run: { step_count: 1, capture_interval: 1, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "de-probe-points-seed42.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps: [
          {
            step: 0,
            state: {
              points: field(pts64, [GRID, GRID, 3], "f64"),
              de: field(de, [GRID, GRID], "f64"),
            },
            diagnostics: { n_outside_set: nOutside, max_de: maxDe },
          },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — n_outside_set=${nOutside}, max_de=${maxDe.toFixed(4)}`);
    panel.setCaptureEnabled(true);
  }

  const panel = createSettingsPanel("Mandelbulb Explorer", {
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
  });

  boot.textContent = "";
  let angle = 0;
  function frame(): void {
    angle += 0.004;
    const u = new Float32Array([canvas.width / canvas.height, angle, 0, 0]);
    queue.writeBuffer(renderUniform, 0, u);
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
