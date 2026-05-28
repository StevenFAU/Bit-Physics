// Stack-B WebGPU implementation of the 2D Ising-classical Metropolis sim.
//
// Ships the WGSL parallel-Metropolis kernel + the TypeScript driver that
// wires it through `@bit-physics/common-ts`. Local-only — Phase-3 CI
// excludes WebGPU-device-requiring tests per spec section 7.8. The NumPy
// reference (ising_classical/reference/ising_numpy.py) is the CI-visible
// oracle; this path is exercised on a GPU host and writes the canonical
// capture at
// `captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}`.

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

export interface IsingParams {
  n: number;
  J: number;
  h: number;
  T: number;
}

export const CANONICAL_PARAMS: IsingParams = {
  n: 128,
  J: 1.0,
  h: 0.0,
  T: 2.27,
};

export const CANONICAL_DESCRIPTOR = "metropolis-128sq-T2.27-seed42-step10000";

function loadKernel(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, "metropolis.wgsl"), "utf8");
}

function paramsBuffer(
  ctx: DeviceContext,
  p: IsingParams,
  step: number,
  color: number,
  seed: number,
): GPUBuffer {
  // Layout matches the WGSL `Params` struct: u32 n, step, color, seed,
  // then f32 J, h, T, _pad. 32-byte aligned (8 * 4 bytes).
  const buf = ctx.device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  const view = new DataView(buf.getMappedRange());
  view.setUint32(0, p.n, true);
  view.setUint32(4, step, true);
  view.setUint32(8, color, true);
  view.setUint32(12, seed, true);
  view.setFloat32(16, p.J, true);
  view.setFloat32(20, p.h, true);
  view.setFloat32(24, p.T, true);
  view.setFloat32(28, 0.0, true);
  buf.unmap();
  return buf;
}

function seededSpins(p: IsingParams, seed: number): Int32Array {
  // Deterministic +/-1 spins from a small LCG seeded by `seed` (mirrors the
  // NumPy reference's seeded IC; the exact bit-stream differs from NumPy's
  // PCG64 — cross-stack equivalence is Phase-4+ scope, this path is the
  // Stack-B local oracle only).
  const out = new Int32Array(p.n * p.n);
  let state = (seed >>> 0) || 1;
  for (let k = 0; k < out.length; k += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out[k] = state & 0x80000000 ? 1 : -1;
  }
  return out;
}

export interface RunOptions {
  params?: Partial<IsingParams>;
  steps?: number;
  captureInterval?: number;
  seed?: number;
  outDir: string;
  payloadName?: string;
}

/**
 * Run the WebGPU Ising Metropolis sim and write the canonical capture.
 *
 * Requires a live WebGPU adapter; throws cleanly when navigator.gpu is
 * undefined (CI no-GPU path per spec section 7.8).
 */
export async function runWebgpuIsing(options: RunOptions): Promise<string> {
  const p: IsingParams = { ...CANONICAL_PARAMS, ...(options.params ?? {}) };
  const steps = options.steps ?? 10000;
  const captureInterval = options.captureInterval ?? 1000;
  const seed = options.seed ?? 42;
  const payloadName = options.payloadName ?? `${CANONICAL_DESCRIPTOR}.h5`;

  const ctx = await createContext();
  const kernel = loadKernel();

  const cellCount = p.n * p.n;
  const bufBytes = cellCount * 4; // i32 per cell
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const spinBuffer = ctx.device.createBuffer({ size: bufBytes, usage, label: "spins" });
  const readback = ctx.device.createBuffer({
    size: bufBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  ctx.queue.writeBuffer(spinBuffer, 0, seededSpins(p, seed));

  const layout = makeBindGroupLayout(
    ctx,
    [{ binding: 1, visibility: GPUShaderStage.COMPUTE, type: "storage" }],
    [{ binding: 0, visibility: GPUShaderStage.COMPUTE }],
    "ising-bgl",
  );
  const pipeline = await ComputePipeline.create(ctx, kernel, {
    label: "ising-metropolis",
    bindGroupLayouts: [layout],
  });

  const manifest: CaptureManifest = {
    schema_version: "1.0.0",
    sim: { name: "ising-classical", category: "lattice-spin", variant: "metropolis" },
    stack: { name: "webgpu", version: "0.0.1", build_id: "phase-3" },
    config: {
      tier: "reference",
      dims: [p.n, p.n],
      dtype: "f64",
      seed,
      params: { J: p.J, h: p.h, T: p.T },
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

  async function snapshot(stepIdx: number): Promise<void> {
    const encoder = ctx.device.createCommandEncoder();
    encoder.copyBufferToBuffer(spinBuffer, 0, readback, 0, bufBytes);
    ctx.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const ints = new Int32Array(readback.getMappedRange());
    const f = new Float64Array(cellCount);
    for (let k = 0; k < cellCount; k += 1) {
      f[k] = ints[k] ?? 0;
    }
    readback.unmap();
    writer.addStep(stepIdx, { spins: f }, {});
  }

  await snapshot(0);
  const wgX = Math.ceil(p.n / 8);
  const wgY = Math.ceil(p.n / 8);
  for (let stepIdx = 1; stepIdx <= steps; stepIdx += 1) {
    for (let color = 0; color < 2; color += 1) {
      const params = paramsBuffer(ctx, p, stepIdx, color, seed);
      const bindGroup = makeBindGroup(
        ctx,
        layout,
        [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: spinBuffer } },
        ],
        `ising-bg-step-${stepIdx.toString()}-c${color.toString()}`,
      );
      const encoder = ctx.device.createCommandEncoder();
      pipeline.dispatch(encoder, [wgX, wgY, 1], [bindGroup]);
      ctx.queue.submit([encoder.finish()]);
    }
    if (stepIdx % captureInterval === 0 || stepIdx === steps) {
      await snapshot(stepIdx);
    }
  }

  return writer.finalize();
}
