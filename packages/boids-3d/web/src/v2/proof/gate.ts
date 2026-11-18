// The release gate's capture, ported verbatim from the v1 page
// (packages/boids-3d/web/src/legacy-capture.ts, captureLegacyCanonical).
// Gate kernels are frozen (00-foundation.md § 5): the committed
// packages/boids-3d/src/boids.wgsl (Reynolds 1987/1999, all-pairs, f32), the
// same 32-byte parameter block (N 1,000, perception 5, v_max 3, weights
// 1.5 / 1 / 1, dt 0.05), the committed seed-42 initial condition
// (public/boids-ic-seed42.bin), 1,000 steps each in its own submit with a
// readback of positions and velocities every 100th step, and v1's manifest
// field for field. verify.py's _gate_boids applies the established
// new_canonical gate unchanged: run-twice identity, the v_max clamp, and the
// step-100 positions against the f64 NumPy reference within T_BOIDS_SHORT.
//
// Only one thing differs from v1, and it is not part of the capture: v1 found
// the initial condition at `${import.meta.env.BASE_URL}boids-ic-seed42.bin`,
// which is page-relative and so right only for the root page; v2 resolves it
// from the bundle (src/sim-root.ts), the same file.
//
// The gate runs on its own buffers and uniforms: nothing the live flock does
// or the visitor changes reaches it.

import computeWgsl from "../../../../src/boids.wgsl?raw";
import { simAsset } from "../../sim-root.js";
import type { CaptureBundle, CaptureStepDescriptor } from "@bp/verify";
import { field, sha256hex } from "@bp/verify";

export const N = 1000;
export const STEPS = 1000;
export const CAPTURE_INTERVAL = 100;
export const PARAMS = {
  perception: 5,
  v_max: 3,
  w_sep: 1.5,
  w_align: 1,
  w_cohere: 1,
  dt: 0.05,
} as const;

/** verify.py's thresholds (T_BOIDS_SHORT, T_BOIDS_VMAX_TOL), restated for the in-page check. */
export const T_BOIDS_SHORT = 1e-2;
export const T_BOIDS_VMAX_TOL = 1e-4;
/** The repository's blob base (links in Learn and Prove). */
export const REPO_BLOB = "https://github.com/StevenFAU/Bit-Physics/blob/main/";

export interface InitialConditions {
  positions: Float32Array;
  velocities: Float32Array;
}

/** The committed initial condition (public/boids-ic-seed42.bin), fetched once. */
let icPromise: Promise<InitialConditions> | null = null;
export function loadInitialConditions(): Promise<InitialConditions> {
  icPromise ??= fetch(simAsset("boids-ic-seed42.bin")).then(async (response) => {
    if (!response.ok) throw new Error(`legacy IC fetch failed: ${response.status}`);
    const all = new Float32Array(await response.arrayBuffer());
    return { positions: all.slice(0, N * 3), velocities: all.slice(N * 3) };
  });
  return icPromise;
}

export interface GateRun {
  steps: CaptureStepDescriptor[];
  /** sha256 of every checkpoint's f32 positions and velocities, in order. */
  sha: string;
}

/** The gate path: the frozen kernel on its own buffers. */
export class GateRunner {
  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPUComputePipeline,
    private readonly layout: GPUBindGroupLayout,
  ) {}

  static async create(device: GPUDevice): Promise<GateRunner> {
    const module = device.createShaderModule({ code: computeWgsl, label: "legacy-boids" });
    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const pipeline = await device.createComputePipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      compute: { module, entryPoint: "main" },
    });
    return new GateRunner(device, pipeline, layout);
  }

  /** v1's captureLegacyCanonical, the run: dedicated buffers, 1,000 steps, a checkpoint every 100th. */
  async runOnce(): Promise<GateRun> {
    const device = this.device;
    const usage = GPUBufferUsage;
    const bytes = N * 3 * 4;
    const makeState = (): GPUBuffer =>
      device.createBuffer({
        size: bytes,
        usage: usage.STORAGE | usage.COPY_DST | usage.COPY_SRC,
      });
    const positions = [makeState(), makeState()];
    const velocities = [makeState(), makeState()];
    const staging = device.createBuffer({
      size: bytes,
      usage: usage.COPY_DST | usage.MAP_READ,
    });
    const params = device.createBuffer({
      size: 32,
      usage: usage.UNIFORM | usage.COPY_DST,
    });
    try {
      const packed = new ArrayBuffer(32);
      const view = new DataView(packed);
      view.setUint32(0, N, true);
      view.setFloat32(4, PARAMS.perception, true);
      view.setFloat32(8, PARAMS.v_max, true);
      view.setFloat32(12, PARAMS.w_sep, true);
      view.setFloat32(16, PARAMS.w_align, true);
      view.setFloat32(20, PARAMS.w_cohere, true);
      view.setFloat32(24, PARAMS.dt, true);
      device.queue.writeBuffer(params, 0, packed);

      const bindGroups = [0, 1].map((source) =>
        device.createBindGroup({
          layout: this.layout,
          entries: [
            { binding: 0, resource: { buffer: params } },
            { binding: 1, resource: { buffer: positions[source]! } },
            { binding: 2, resource: { buffer: velocities[source]! } },
            { binding: 3, resource: { buffer: positions[1 - source]! } },
            { binding: 4, resource: { buffer: velocities[1 - source]! } },
          ],
        }),
      );
      const initial = await loadInitialConditions();
      device.queue.writeBuffer(positions[0]!, 0, initial.positions);
      device.queue.writeBuffer(velocities[0]!, 0, initial.velocities);
      let source = 0;

      const read = async (buffer: GPUBuffer): Promise<Float32Array> => {
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(buffer, 0, staging, 0, bytes);
        device.queue.submit([encoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        return result;
      };
      const rows: CaptureStepDescriptor[] = [];
      const chunks: Float32Array[] = [];
      const record = async (step: number): Promise<void> => {
        const position = await read(positions[source]!);
        const velocity = await read(velocities[source]!);
        chunks.push(position, velocity);
        let max = 0;
        let sum = 0;
        for (let i = 0; i < N; i += 1) {
          const speed = Math.hypot(velocity[i * 3]!, velocity[i * 3 + 1]!, velocity[i * 3 + 2]!);
          max = Math.max(max, speed);
          sum += speed;
        }
        rows.push({
          step,
          state: {
            position: field(new Float64Array(position), [N, 3], "f64"),
            velocity: field(new Float64Array(velocity), [N, 3], "f64"),
          },
          diagnostics: { max_speed: max, mean_speed: sum / N },
        });
      };

      await record(0);
      for (let step = 1; step <= STEPS; step += 1) {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroups[source]!);
        pass.dispatchWorkgroups(Math.ceil(N / 64));
        pass.end();
        device.queue.submit([encoder.finish()]);
        source = 1 - source;
        if (step % CAPTURE_INTERVAL === 0) await record(step);
      }
      const total = new Float32Array(chunks.reduce((a, c) => a + c.length, 0));
      let off = 0;
      for (const c of chunks) {
        total.set(c, off);
        off += c.length;
      }
      return { steps: rows, sha: await sha256hex(total) };
    } finally {
      for (const buffer of [...positions, ...velocities, staging, params]) buffer.destroy();
    }
  }
}

/** v1's manifest, field for field, around a run's rows. */
export function buildBundle(rows: CaptureStepDescriptor[]): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "boids-3d", category: "agent-based", variant: "reynolds-1987-canonical" },
      stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
      config: {
        tier: "test",
        dims: [N, 3],
        dtype: "f64",
        seed: 42,
        params: {
          ...PARAMS,
          n_agents: N,
          perception_radius: PARAMS.perception,
          ic_jitter_scale: 1e-6,
        },
      },
      run: {
        step_count: STEPS,
        capture_interval: CAPTURE_INTERVAL,
        wall_clock_seconds: 0,
        start_utc: "2026-05-20T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: "flock-1000agents-seed42-step1000.h5",
        checksum: `sha256:${"0".repeat(64)}`,
      },
      determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
    },
    steps: rows,
  };
}

// ---- the gate's criterion, in the page (Prove) -----------------------------
// verify.py _gate_boids with a JavaScript double-precision mirror of
// boids_3d.reference._flock_step standing in for the NumPy reference. CI
// starts the reference from the f64 seed-42 state; the page starts it from
// the committed f32 initial condition both GPU runs start from (within 1e-6
// of it, the ic_jitter_scale in the manifest).

/** One Reynolds step in f64: boids_3d.reference._flock_step, pair by pair. */
export function flockStep64(p: Float64Array, v: Float64Array): void {
  const n = p.length / 3;
  const perc = PARAMS.perception;
  const np = new Float64Array(p.length);
  const nv = new Float64Array(v.length);
  for (let i = 0; i < n; i += 1) {
    const pix = p[i * 3]!, piy = p[i * 3 + 1]!, piz = p[i * 3 + 2]!;
    let wSum = 0, sx = 0, sy = 0, sz = 0, vx = 0, vy = 0, vz = 0, px = 0, py = 0, pz = 0, count = 0;
    for (let j = 0; j < n; j += 1) {
      if (j === i) continue;
      const dx = pix - p[j * 3]!, dy = piy - p[j * 3 + 1]!, dz = piz - p[j * 3 + 2]!;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (Math.sqrt(d2) > perc) continue;
      const w = 1 / d2;
      wSum += w;
      sx += w * p[j * 3]!; sy += w * p[j * 3 + 1]!; sz += w * p[j * 3 + 2]!;
      vx += v[j * 3]!; vy += v[j * 3 + 1]!; vz += v[j * 3 + 2]!;
      px += p[j * 3]!; py += p[j * 3 + 1]!; pz += p[j * 3 + 2]!;
      count += 1;
    }
    const sepX = pix * wSum - sx, sepY = piy * wSum - sy, sepZ = piz * wSum - sz;
    let ax = PARAMS.w_sep * sepX, ay = PARAMS.w_sep * sepY, az = PARAMS.w_sep * sepZ;
    if (count > 0) {
      ax += PARAMS.w_align * (vx / count - v[i * 3]!) + PARAMS.w_cohere * (px / count - pix);
      ay += PARAMS.w_align * (vy / count - v[i * 3 + 1]!) + PARAMS.w_cohere * (py / count - piy);
      az += PARAMS.w_align * (vz / count - v[i * 3 + 2]!) + PARAMS.w_cohere * (pz / count - piz);
    }
    let nvx = v[i * 3]! + PARAMS.dt * ax, nvy = v[i * 3 + 1]! + PARAMS.dt * ay, nvz = v[i * 3 + 2]! + PARAMS.dt * az;
    const mag = Math.hypot(nvx, nvy, nvz);
    if (mag > PARAMS.v_max) {
      const s = PARAMS.v_max / mag;
      nvx *= s; nvy *= s; nvz *= s;
    }
    nv[i * 3] = nvx; nv[i * 3 + 1] = nvy; nv[i * 3 + 2] = nvz;
    np[i * 3] = pix + PARAMS.dt * nvx; np[i * 3 + 1] = piy + PARAMS.dt * nvy; np[i * 3 + 2] = piz + PARAMS.dt * nvz;
  }
  p.set(np);
  v.set(nv);
}

export interface GateCheck {
  identical: boolean;
  /** max |x_browser − x_f64| at step 100 (verify.py short_horizon_step100_pos_max_abs). */
  shortAbs: number;
  vmaxObserved: number;
  clampOk: boolean;
  shortOk: boolean;
  passed: boolean;
  checkpoints: number;
}

/** Apply verify.py _gate_boids's criterion to two runs of one capture. */
export async function checkGate(a: GateRun, b: GateRun): Promise<GateCheck> {
  const ic = await loadInitialConditions();
  const p = Float64Array.from(ic.positions);
  const v = Float64Array.from(ic.velocities);
  for (let s = 0; s < 100; s += 1) flockStep64(p, v);
  const at100 = a.steps.find((s) => s.step === 100);
  let shortAbs = Infinity;
  if (at100) {
    shortAbs = 0;
    const got = at100.state["position"]!.data;
    for (let k = 0; k < got.length; k += 1) shortAbs = Math.max(shortAbs, Math.abs(got[k]! - p[k]!));
  }
  let vmax = 0;
  for (const s of a.steps) {
    const vel = s.state["velocity"]!.data;
    for (let i = 0; i < N; i += 1) vmax = Math.max(vmax, Math.hypot(vel[i * 3]!, vel[i * 3 + 1]!, vel[i * 3 + 2]!));
  }
  const identical = a.sha === b.sha && a.steps.length === b.steps.length;
  const clampOk = vmax <= PARAMS.v_max * (1 + T_BOIDS_VMAX_TOL);
  const shortOk = shortAbs < T_BOIDS_SHORT;
  return { identical, shortAbs, vmaxObserved: vmax, clampOk, shortOk, passed: identical && clampOk && shortOk, checkpoints: a.steps.length };
}
