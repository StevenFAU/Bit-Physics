// The release gate's capture, ported verbatim from the v1 page
// (packages/strange-attractors/web/src/main.ts: the canonical trajectory
// integrated at boot and captureCanonical()). Gate kernels are frozen
// (00-foundation.md § 5): the committed src/lorenz_rk4.wgsl, the same
// 48-byte parameter block (σ, ρ, β, dt and the seed-42 initial condition in
// f32), one invocation integrating all 10,000 steps into its own `traj`
// buffer, the same sampling (every 1,000th step and the last) and the same
// manifest fields from the committed data spine. The bundle is byte-for-byte
// v1's; verify.py's _gate_strange applies the established new_canonical gate
// unchanged (run-twice identity + containment in the dense f64 envelope).
//
// The live page never reads `traj`: its renderers read the live
// populations, and nothing render-side is read back into a capture.

import computeWgsl from "../../../../src/lorenz_rk4.wgsl?raw";
import V from "../../generated/verification.json";
import type { CaptureBundle, CaptureManifestLike, CaptureStepDescriptor } from "@bp/verify";
import { field } from "@bp/verify";

export const N_STEPS = 10000;
export const CAPTURE_INTERVAL = 1000;
export const SIGMA = 10.0;
export const RHO = 28.0;
export const BETA = 8.0 / 3.0;
export const DT = 0.01;
export const CANONICAL_IC: readonly [number, number, number] = [1, 1, 1];
// seed-42 grid jitter = 1e-6 * numpy default_rng(42).standard_normal(3)
export const SEED42_OFFSET: readonly [number, number, number] = [
  3.047170797544313e-7, -1.0399841062404955e-6, 7.504511958064573e-7,
];

// The data spine (src/generated/verification.json) carries the committed
// canonical params verbatim; the compute constants above must agree with it.
if (V.canonical.params.sigma !== SIGMA || V.canonical.params.rho !== RHO || V.canonical.params.beta !== BETA || V.canonical.params.dt !== DT) {
  throw new Error("verification.json canonical params drifted from compute constants — rerun gen-verification.mjs");
}

/** The repository's blob base (links in Learn and Prove). */
export const REPO_BLOB: string = V.repo_blob_base;

/** The gate path: the frozen kernel on its own buffers. */
export class GateRunner {
  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPUComputePipeline,
    private readonly layout: GPUBindGroupLayout,
  ) {}

  static async create(device: GPUDevice): Promise<GateRunner> {
    const computeModule = device.createShaderModule({ code: computeWgsl, label: "lorenz" });
    const computeBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const computeLayout = device.createPipelineLayout({ bindGroupLayouts: [computeBGL] });
    const pipeline = await device.createComputePipelineAsync({
      layout: computeLayout,
      compute: { module: computeModule, entryPoint: "main" },
    });
    return new GateRunner(device, pipeline, computeBGL);
  }

  /**
   * Integrate the canonical trajectory (seed-42 IC) into a fresh buffer and
   * read all of it back: (N_STEPS + 1) × 3 f32. With `ic` (Prove's fail
   * probe) the same kernel starts elsewhere.
   */
  async trajectory(ic?: readonly [number, number, number]): Promise<Float32Array<ArrayBuffer>> {
    const { device } = this;
    const queue = device.queue;
    const nPoints = N_STEPS + 1;
    const trajBytes = nPoints * 3 * 4;
    const traj = device.createBuffer({
      size: trajBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const paramBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    {
      const pp = new ArrayBuffer(48);
      const dv = new DataView(pp);
      dv.setUint32(0, N_STEPS, true);
      dv.setUint32(4, 0, true);
      dv.setFloat32(8, SIGMA, true);
      dv.setFloat32(12, RHO, true);
      dv.setFloat32(16, BETA, true);
      dv.setFloat32(20, DT, true);
      dv.setFloat32(24, ic ? ic[0] : CANONICAL_IC[0] + SEED42_OFFSET[0], true);
      dv.setFloat32(28, ic ? ic[1] : CANONICAL_IC[1] + SEED42_OFFSET[1], true);
      dv.setFloat32(32, ic ? ic[2] : CANONICAL_IC[2] + SEED42_OFFSET[2], true);
      queue.writeBuffer(paramBuf, 0, pp);
    }
    const computeBG = device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: traj } },
      ],
    });
    const rb = device.createBuffer({ size: trajBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, computeBG);
    pass.dispatchWorkgroups(1);
    pass.end();
    enc.copyBufferToBuffer(traj, 0, rb, 0, trajBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const all = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    traj.destroy();
    paramBuf.destroy();
    return all;
  }
}

/** v1's captureCanonical(), the bundle half: sampled states + the manifest. */
export function buildCapture(all: Float32Array): CaptureBundle {
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
  // Manifest metadata sourced from the committed data spine (spec § 4):
  // params verbatim from the canonical capture manifest, the REAL committed
  // payload checksum, and the browser determinism claim. Step/state arrays
  // above are untouched — the gate compares those.
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "strange-attractors", category: "closed-form", variant: "lorenz" },
      stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
      config: { tier: "test", dims: [3], dtype: "f64", seed: V.canonical.seed, params: V.canonical.params },
      run: { step_count: N_STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
      payload: { format: "hdf5", path: `${V.canonical.descriptor}.h5`, checksum: V.canonical.payload_sha256 },
      determinism: {
        claimed: V.determinism.browser_claimed as CaptureManifestLike["determinism"]["claimed"],
        atomic_ops: false,
        subgroup_ops: false,
      },
    },
    steps,
  };
}

// ---- the gate's criterion, in the page (Prove) -----------------------------
// verify.py _gate_strange: every browser point inside the dense f64 reference
// attractor's per-axis [min, max], widened by T_STRANGE_REL × extent +
// T_STRANGE_MEAN_ABS; the reference is RK4 from (1, 1, 1), 10,000 steps.
export const T_STRANGE_REL = 0.12;
export const T_STRANGE_MEAN_ABS = 1.5;

export interface GateCheck {
  identical: boolean;
  finite: boolean;
  /** Largest overshoot past the widened envelope (≤ 0 passes). */
  worstOut: number;
  /** Smallest margin left inside the envelope, as a fraction of the margin. */
  worstRatio: number;
  points: number;
  passed: boolean;
}

/** The dense f64 envelope verify.py builds (classic RK4 from (1, 1, 1)). */
export function referenceEnvelope(): { lo: number[]; hi: number[] } {
  let s = [1, 1, 1];
  const lo = [...s];
  const hi = [...s];
  const f = (p: number[]): number[] => [SIGMA * (p[1]! - p[0]!), p[0]! * (RHO - p[2]!) - p[1]!, p[0]! * p[1]! - BETA * p[2]!];
  for (let i = 0; i < N_STEPS; i += 1) {
    const k1 = f(s);
    const k2 = f(s.map((v, j) => v + 0.5 * DT * k1[j]!));
    const k3 = f(s.map((v, j) => v + 0.5 * DT * k2[j]!));
    const k4 = f(s.map((v, j) => v + DT * k3[j]!));
    s = s.map((v, j) => v + (DT / 6) * (k1[j]! + 2 * k2[j]! + 2 * k3[j]! + k4[j]!));
    for (let j = 0; j < 3; j += 1) {
      lo[j] = Math.min(lo[j]!, s[j]!);
      hi[j] = Math.max(hi[j]!, s[j]!);
    }
  }
  return { lo, hi };
}

/** Apply verify.py's criterion to two captures. */
export function checkGate(a: CaptureBundle, b: CaptureBundle): GateCheck {
  const pa = a.steps.map((s) => s.state["position"]!.data);
  const identical = JSON.stringify(a) === JSON.stringify(b);
  const finite = pa.every((p) => p.every((v) => Number.isFinite(v) && Math.abs(v) < 60));
  const env = referenceEnvelope();
  let worstOut = -Infinity;
  let worstRatio = 0;
  for (let i = 0; i < 3; i += 1) {
    const extent = Math.max(env.hi[i]! - env.lo[i]!, 1);
    const margin = T_STRANGE_REL * extent + T_STRANGE_MEAN_ABS;
    for (const p of pa) {
      const below = env.lo[i]! - margin - p[i]!;
      const above = p[i]! - (env.hi[i]! + margin);
      worstOut = Math.max(worstOut, below, above);
      // how far into the margin the point reaches (0 = inside the bare envelope, 1 = at the limit)
      const into = Math.max(env.lo[i]! - p[i]!, p[i]! - env.hi[i]!, 0) / margin;
      worstRatio = Math.max(worstRatio, into);
    }
  }
  return { identical, finite, worstOut, worstRatio, points: pa.length, passed: identical && finite && worstOut <= 0 };
}
