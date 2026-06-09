// Gray-Scott reaction-diffusion 2D — Stack-B WebGPU web build.
//
// Ships the committed ../../src/gray_scott.wgsl (the SAME compute kernel the
// wgpu-native round-trip gate runs) through a Vite browser bundle: a live
// canvas render loop, the shared settings panel, and a capture-export hook
// that re-emits the canonical descriptor for the 5.1 bootstrap round-trip.
//
// Correctness gate (web-build track): the identical gray_scott.wgsl is driven
// by tools/productization/web-build against the canonical capture at
// captures/reaction-diffusion-2d-ref/ and round-trips within the
// [overrides.reaction-diffusion-2d] rel=1e-4 budget (MEASURED 2.6e-5). The
// seed-42 initial condition — numpy's PCG64 uniform(-1e-3,1e-3) perturbation,
// not reproducible in-browser — ships as the binary asset rd2d-ic-seed42.bin.

import type { DeviceContext } from "../../../../common/common-ts/src/context.js";
import { createContext } from "../../../../common/common-ts/src/context.js";
import { makeBindGroup, makeBindGroupLayout } from "../../../../common/common-ts/src/bindgroups.js";
import { createSettingsPanel } from "../../../../common/common-web/src/settings-panel.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/gray_scott.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const N = 128;
const CANONICAL_STEPS = 2000;
const CAPTURE_INTERVAL = 200;
const PARAMS = { Du: 0.16, Dv: 0.08, F: 0.0367, k: 0.0649, dx: 1.0, dt: 1.0 };
const STEPS_PER_FRAME = 8;

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function setBoot(msg: string): void {
  boot.textContent = msg;
}

/** Build the seed-42 canonical IC by fetching the committed binary asset. */
async function fetchCanonicalIC(): Promise<Float32Array> {
  const res = await fetch(`${import.meta.env.BASE_URL}rd2d-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC asset fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ic = new Float32Array(buf);
  if (ic.length !== N * N * 2) {
    throw new Error(`IC asset length ${ic.length} != ${N * N * 2}`);
  }
  return ic;
}

/** Deterministic exploratory IC for non-canonical seeds (display only). */
function exploratoryIC(seed: number): Float32Array {
  const out = new Float32Array(N * N * 2);
  let s = (seed >>> 0) || 1;
  const half = N / 2;
  const ss = Math.max(4, N / 16);
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const idx = (j * N + i) * 2;
      const inSeed = i >= half - ss && i < half + ss && j >= half - ss && j < half + ss;
      // LCG noise in [-1e-3, 1e-3]
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const noise = (s / 0xffffffff) * 2e-3 - 1e-3;
      out[idx + 0] = Math.min(1, Math.max(0, (inSeed ? 0.5 : 1.0) + noise));
      out[idx + 1] = Math.min(1, Math.max(0, (inSeed ? 0.25 : 0.0) + noise));
    }
  }
  return out;
}

async function main(): Promise<void> {
  let ctx: DeviceContext;
  try {
    ctx = await createContext();
  } catch (e) {
    setBoot(`WebGPU unavailable: ${(e as Error).message}`);
    throw e;
  }
  const { device, queue } = ctx;

  const cellCount = N * N;
  const bufBytes = cellCount * 2 * 4;
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const buffers = [
    device.createBuffer({ size: bufBytes, usage, label: "state-a" }),
    device.createBuffer({ size: bufBytes, usage, label: "state-b" }),
  ];

  // Compute pipeline (the committed gray_scott.wgsl).
  const computeLayout = makeBindGroupLayout(
    ctx,
    [
      { binding: 1, visibility: GPUShaderStage.COMPUTE, type: "read-only-storage" },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, type: "storage" },
    ],
    [{ binding: 0, visibility: GPUShaderStage.COMPUTE }],
    "rd2d-compute-bgl",
  );
  const computeModule = device.createShaderModule({ code: computeWgsl, label: "gray-scott" });
  const computePipeline = await device.createComputePipelineAsync({
    label: "rd2d-compute",
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: { module: computeModule, entryPoint: "main" },
  });

  // Render pipeline (colormap of the V channel).
  const ctxGpu = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctxGpu.configure({ device, format, alphaMode: "opaque" });
  const renderLayout = makeBindGroupLayout(
    ctx,
    [{ binding: 1, visibility: GPUShaderStage.FRAGMENT, type: "read-only-storage" }],
    [{ binding: 0, visibility: GPUShaderStage.FRAGMENT }],
    "rd2d-render-bgl",
  );
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "rd2d-render" });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "rd2d-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const renderUniform = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([N, 0]));

  function paramsBuffer(step: number): GPUBuffer {
    const buf = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    const view = new DataView(buf.getMappedRange());
    view.setUint32(0, N, true);
    view.setUint32(4, step, true);
    view.setFloat32(8, PARAMS.Du, true);
    view.setFloat32(12, PARAMS.Dv, true);
    view.setFloat32(16, PARAMS.F, true);
    view.setFloat32(20, PARAMS.k, true);
    view.setFloat32(24, PARAMS.dx, true);
    view.setFloat32(28, PARAMS.dt, true);
    buf.unmap();
    return buf;
  }

  const wg = Math.ceil(N / 8);
  let src = 0;
  let stepCounter = 0;

  function computeStep(): void {
    const dst = 1 - src;
    const params = paramsBuffer(stepCounter + 1);
    const bg = makeBindGroup(
      ctx,
      computeLayout,
      [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: buffers[src]! } },
        { binding: 2, resource: { buffer: buffers[dst]! } },
      ],
      `rd2d-cbg-${stepCounter}`,
    );
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(wg, wg, 1);
    pass.end();
    queue.submit([enc.finish()]);
    src = dst;
    stepCounter += 1;
  }

  function renderFrame(): void {
    const bg = makeBindGroup(
      ctx,
      renderLayout,
      [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: buffers[src]! } },
      ],
      "rd2d-rbg",
    );
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctxGpu.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, bg);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
  }

  async function readState(index: number): Promise<Float32Array> {
    const rb = device.createBuffer({ size: bufBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buffers[index]!, 0, rb, 0, bufBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0)).slice();
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function loadIC(seed: number): Promise<void> {
    const ic = seed === 42 ? await fetchCanonicalIC() : exploratoryIC(seed);
    queue.writeBuffer(buffers[0]!, 0, ic);
    src = 0;
    stepCounter = 0;
  }

  // Capture-export: reproduce the canonical descriptor (seed 42, 2000 steps).
  async function captureCanonical(): Promise<void> {
    panel.setStatus("capturing… (2000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    const ic = await fetchCanonicalIC();
    queue.writeBuffer(buffers[0]!, 0, ic);
    let s = 0;
    let stepN = 0;
    const steps: CaptureStepDescriptor[] = [];
    const recordStep = (idx: number, interleaved: Float32Array): void => {
      const U = new Float64Array(cellCount);
      const V = new Float64Array(cellCount);
      let massU = 0;
      let massV = 0;
      for (let c = 0; c < cellCount; c += 1) {
        U[c] = interleaved[c * 2] ?? 0;
        V[c] = interleaved[c * 2 + 1] ?? 0;
        massU += U[c];
        massV += V[c];
      }
      steps.push({
        step: idx,
        state: { U: field(U, [N, N], "f64"), V: field(V, [N, N], "f64") },
        diagnostics: { mass_U: massU, mass_V: massV },
      });
    };
    recordStep(0, await readState(s));
    for (stepN = 1; stepN <= CANONICAL_STEPS; stepN += 1) {
      const dst = 1 - s;
      const params = paramsBuffer(stepN);
      const bg = makeBindGroup(
        ctx,
        computeLayout,
        [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: buffers[s]! } },
          { binding: 2, resource: { buffer: buffers[dst]! } },
        ],
        `rd2d-capbg-${stepN}`,
      );
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.end();
      queue.submit([enc.finish()]);
      s = dst;
      if (stepN % CAPTURE_INTERVAL === 0 || stepN === CANONICAL_STEPS) {
        recordStep(stepN, await readState(s));
      }
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "reaction-diffusion-2d", category: "continuous-ca", variant: "gray-scott" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [N, N], dtype: "f64", seed: 42, params: PARAMS },
          run: {
            step_count: CANONICAL_STEPS,
            capture_interval: CAPTURE_INTERVAL,
            wall_clock_seconds: 0,
            start_utc: "2026-05-20T00:00:00Z",
          },
          payload: { format: "hdf5", path: "gray-scott-lambda-128sq-seed42-step2000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps,
      },
      { download: false },
    );
    // restore the live view IC
    await loadIC(panel.getState().seed);
    panel.setStatus("capture ready (window.__bitPhysicsCapture)");
    panel.setCaptureEnabled(true);
  }

  const panel = createSettingsPanel("Reaction-Diffusion 2D", {
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
    onChange: (st) => {
      void loadIC(st.seed);
    },
  });

  await loadIC(42);
  setBoot("");

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    for (let i = 0; i < STEPS_PER_FRAME; i += 1) computeStep();
    renderFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Mark the app booted for the headless smoke harness.
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
