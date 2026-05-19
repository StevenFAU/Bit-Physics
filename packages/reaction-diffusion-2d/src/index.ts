// Stack-B WebGPU implementation of Gray-Scott RD-2D.
//
// Phase 0 ships the WGSL kernel + the TypeScript driver that wires it
// through `@bit-physics/common-ts`. Local-only — Phase 0 CI excludes
// WebGPU-device-requiring tests per spec section 7.8. Phase 1+
// exercises this path on a GPU host and verifies cross-stack
// agreement against the canonical capture at
// `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { DeviceContext } from "../../../common/common-ts/src/context.js";
import { createContext } from "../../../common/common-ts/src/context.js";
import {
  makeBindGroup,
  makeBindGroupLayout,
} from "../../../common/common-ts/src/bindgroups.js";
import { ComputePipeline } from "../../../common/common-ts/src/pipelines.js";
import type { CaptureManifest } from "../../../common/common-ts/src/capture.js";
import { CaptureWriter } from "../../../common/common-ts/src/capture.js";

export interface GrayScottParams {
  n: number;
  Du: number;
  Dv: number;
  F: number;
  k: number;
  dx: number;
  dt: number;
}

export const CANONICAL_PARAMS: GrayScottParams = {
  n: 128,
  Du: 0.16,
  Dv: 0.08,
  F: 0.0367,
  k: 0.0649,
  dx: 1.0,
  dt: 1.0,
};

export const CANONICAL_DESCRIPTOR = "gray-scott-lambda-128sq-seed42-step2000";

function loadKernel(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, "gray_scott.wgsl"), "utf8");
}

function paramsBuffer(ctx: DeviceContext, p: GrayScottParams, step: number): GPUBuffer {
  // Layout matches the WGSL `Params` struct: u32 n, u32 step, then six
  // f32 coefficients. 32-byte aligned (8 * 4 bytes).
  const buf = ctx.device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  const view = new DataView(buf.getMappedRange());
  view.setUint32(0, p.n, true);
  view.setUint32(4, step, true);
  view.setFloat32(8, p.Du, true);
  view.setFloat32(12, p.Dv, true);
  view.setFloat32(16, p.F, true);
  view.setFloat32(20, p.Dv, true); // intentional? no — keep symmetric to struct order
  view.setFloat32(20, p.k, true);
  view.setFloat32(24, p.dx, true);
  view.setFloat32(28, p.dt, true);
  buf.unmap();
  return buf;
}

function gaussianSeed(p: GrayScottParams): Float32Array {
  // Same initial condition as the NumPy reference (modulo float32 vs
  // float64 truncation): U≈1, V≈0 with a centred V-seed square.
  const out = new Float32Array(p.n * p.n * 2);
  const half = Math.floor(p.n / 2);
  const seedSize = Math.max(4, Math.floor(p.n / 16));
  for (let j = 0; j < p.n; j += 1) {
    for (let i = 0; i < p.n; i += 1) {
      const idx = (j * p.n + i) * 2;
      const inSeed = i >= half - seedSize && i < half + seedSize && j >= half - seedSize && j < half + seedSize;
      out[idx + 0] = inSeed ? 0.5 : 1.0;
      out[idx + 1] = inSeed ? 0.25 : 0.0;
    }
  }
  return out;
}

export interface RunOptions {
  params?: Partial<GrayScottParams>;
  steps?: number;
  captureInterval?: number;
  outDir: string;
  payloadName?: string;
}

/**
 * Run the WebGPU Gray-Scott sim and write the canonical capture.
 *
 * Requires a live WebGPU adapter; throws cleanly when navigator.gpu is
 * undefined (Phase 0 CI path).
 */
export async function runWebgpuGrayScott(options: RunOptions): Promise<string> {
  const p: GrayScottParams = { ...CANONICAL_PARAMS, ...(options.params ?? {}) };
  const steps = options.steps ?? 2000;
  const captureInterval = options.captureInterval ?? 200;
  const payloadName = options.payloadName ?? `${CANONICAL_DESCRIPTOR}.h5`;

  const ctx = await createContext();
  const kernel = loadKernel();

  const cellCount = p.n * p.n;
  const bufBytes = cellCount * 2 * 4;
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const buffers: GPUBuffer[] = [
    ctx.device.createBuffer({ size: bufBytes, usage, label: "state-a" }),
    ctx.device.createBuffer({ size: bufBytes, usage, label: "state-b" }),
  ];
  const readback = ctx.device.createBuffer({
    size: bufBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  ctx.queue.writeBuffer(buffers[0]!, 0, gaussianSeed(p));

  const layout = makeBindGroupLayout(
    ctx,
    [
      { binding: 1, visibility: GPUShaderStage.COMPUTE, type: "read-only-storage" },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, type: "storage" },
    ],
    [{ binding: 0, visibility: GPUShaderStage.COMPUTE }],
    "rd-2d-bgl",
  );
  const pipeline = await ComputePipeline.create(ctx, kernel, {
    label: "rd-2d-compute",
    bindGroupLayouts: [layout],
  });

  const manifest: CaptureManifest = {
    schema_version: "1.0.0",
    sim: { name: "reaction-diffusion-2d", category: "continuous-ca", variant: "gray-scott" },
    stack: { name: "webgpu", version: "0.0.1", build_id: "phase-0" },
    config: {
      tier: "test",
      dims: [p.n, p.n],
      dtype: "f32",
      seed: 42,
      params: { Du: p.Du, Dv: p.Dv, F: p.F, k: p.k, dx: p.dx, dt: p.dt },
    },
    run: {
      step_count: steps,
      capture_interval: captureInterval,
      wall_clock_seconds: 0,
      start_utc: new Date(0).toISOString(),
    },
    payload: { format: "hdf5", path: payloadName, checksum: "sha256:" + "0".repeat(64) },
    determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
  };

  const writer = new CaptureWriter(manifest, options.outDir);

  async function snapshot(stepIdx: number, srcIdx: number): Promise<void> {
    const encoder = ctx.device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffers[srcIdx]!, 0, readback, 0, bufBytes);
    ctx.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const cellsView = new Float32Array(readback.getMappedRange());
    const U = new Float32Array(cellCount);
    const V = new Float32Array(cellCount);
    for (let k = 0; k < cellCount; k += 1) {
      U[k] = cellsView[k * 2] ?? 0;
      V[k] = cellsView[k * 2 + 1] ?? 0;
    }
    readback.unmap();
    writer.addStep(stepIdx, { U, V }, {});
  }

  let src = 0;
  let dst = 1;
  await snapshot(0, src);
  for (let stepIdx = 1; stepIdx <= steps; stepIdx += 1) {
    const params = paramsBuffer(ctx, p, stepIdx);
    const bindGroup = makeBindGroup(
      ctx,
      layout,
      [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: buffers[src]! } },
        { binding: 2, resource: { buffer: buffers[dst]! } },
      ],
      `rd-2d-bg-step-${stepIdx.toString()}`,
    );
    const encoder = ctx.device.createCommandEncoder();
    const wgX = Math.ceil(p.n / 8);
    const wgY = Math.ceil(p.n / 8);
    pipeline.dispatch(encoder, [wgX, wgY, 1], [bindGroup]);
    ctx.queue.submit([encoder.finish()]);
    [src, dst] = [dst, src];
    if (stepIdx % captureInterval === 0 || stepIdx === steps) {
      await snapshot(stepIdx, src);
    }
  }

  return writer.finalize();
}
