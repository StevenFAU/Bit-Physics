// Lorenz strange attractor — Stack-B WebGPU web build.
//
// Ships the committed ../../src/lorenz_rk4.wgsl (the SAME RK4 integrator the
// wgpu-native gate runs): a compute pass integrates the trajectory, a render
// pass draws it as an orbiting point cloud. Settings panel + capture-export
// re-emit the lorenz-trajectory descriptor (position + radius at the canonical
// sample steps).
//
// Correctness gate (web-build track, new-canonical): f32 RK4 of the chaotic
// Lorenz system diverges pointwise from the f64 canonical by the trajectory end
// — so the gate is structural attractor invariants (bounding box + spread) +
// run-twice byte-identical determinism, NOT a pointwise round-trip.

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/settings-panel.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/lorenz_rk4.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const N_STEPS = 10000;
const CAPTURE_INTERVAL = 1000;
const SIGMA = 10.0;
const RHO = 28.0;
const BETA = 8.0 / 3.0;
const DT = 0.01;
const CANONICAL_IC: readonly [number, number, number] = [1, 1, 1];
// seed-42 grid jitter = 1e-6 * numpy default_rng(42).standard_normal(3)
const SEED42_OFFSET: readonly [number, number, number] = [
  3.047170797544313e-7, -1.0399841062404955e-6, 7.504511958064573e-7,
];

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function main(): Promise<void> {
  let ctx;
  try {
    ctx = await createContext();
  } catch (e) {
    boot.textContent = `WebGPU unavailable: ${(e as Error).message}`;
    throw e;
  }
  const { device, queue } = ctx;

  const nPoints = N_STEPS + 1;
  const trajBytes = nPoints * 3 * 4;
  const traj = device.createBuffer({
    size: trajBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // compute the trajectory once (seed-42 IC)
  const paramBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const pp = new ArrayBuffer(48);
  const dv = new DataView(pp);
  dv.setUint32(0, N_STEPS, true);
  dv.setUint32(4, 0, true);
  dv.setFloat32(8, SIGMA, true);
  dv.setFloat32(12, RHO, true);
  dv.setFloat32(16, BETA, true);
  dv.setFloat32(20, DT, true);
  dv.setFloat32(24, CANONICAL_IC[0] + SEED42_OFFSET[0], true);
  dv.setFloat32(28, CANONICAL_IC[1] + SEED42_OFFSET[1], true);
  dv.setFloat32(32, CANONICAL_IC[2] + SEED42_OFFSET[2], true);
  queue.writeBuffer(paramBuf, 0, pp);

  const computeModule = device.createShaderModule({ code: computeWgsl, label: "lorenz" });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computePipeline = await device.createComputePipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const computeBG = device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer: paramBuf } },
      { binding: 1, resource: { buffer: traj } },
    ],
  });
  {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, computeBG);
    pass.dispatchWorkgroups(1);
    pass.end();
    queue.submit([enc.finish()]);
  }

  // render
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "lorenz-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "point-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: traj } },
    ],
  });

  async function captureCanonical(): Promise<void> {
    panel.setStatus("reading trajectory…");
    panel.setCaptureEnabled(false);
    resetCapture();
    const rb = device.createBuffer({ size: trajBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(traj, 0, rb, 0, trajBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const all = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    const steps: CaptureStepDescriptor[] = [];
    for (let s = 0; s <= N_STEPS; s += 1) {
      if (s % CAPTURE_INTERVAL !== 0 && s !== N_STEPS) continue;
      const x = all[s * 3]!, y = all[s * 3 + 1]!, z = all[s * 3 + 2]!;
      const pos = new Float64Array([x, y, z]);
      steps.push({
        step: s,
        state: { position: field(pos, [3], "f64") },
        diagnostics: { radius: Math.sqrt(x * x + y * y + z * z) },
      });
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "strange-attractors", category: "closed-form", variant: "lorenz" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [3], dtype: "f64", seed: 42, params: { sigma: SIGMA, rho: RHO, beta: BETA, dt: DT, ic_jitter_scale: 1e-6 } },
          run: { step_count: N_STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "lorenz-trajectory-seed42-step10000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps,
      },
      { download: false },
    );
    panel.setStatus(`capture ready — ${steps.length} sampled states (chaotic; new-canonical)`);
    panel.setCaptureEnabled(true);
  }

  const panel = createSettingsPanel("Lorenz Attractor", {
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
  });

  boot.textContent = "";
  let angle = 0;
  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    angle += 0.003;
    queue.writeBuffer(renderUniform, 0, new Float32Array([canvas.width / canvas.height, angle, nPoints, 0]));
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBG);
    pass.draw(nPoints);
    pass.end();
    queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
