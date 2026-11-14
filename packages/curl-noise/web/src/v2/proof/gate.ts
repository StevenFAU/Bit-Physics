// The release gate's capture, ported verbatim from the v1 page
// (packages/curl-noise/web/src/main.ts: runGateOnce + captureGate, and
// src/capture.ts). Gate kernels are frozen (00-foundation.md § 5): the same
// shader source (field.wgsl + the colormap uniform + tracers.wgsl, the
// concatenation v1 compiles), the same `advect` and `anchor_f0` entry points
// with layout "auto", the same 144-byte field and 224-byte tracer uniforms
// packed from the COMMITTED gate-ic.json params (t = 0, no interaction
// potentials, no wrap, RK4 + one Newton reprojection per step), the same
// dedicated per-run buffers, the same 64 steps each in its own submit and
// checkpoints every 8th step, f0 in the first checkpoint, the whole run done
// twice and its position bytes hashed. The bundle is v1's (capture.ts
// makeBundle); verify.py's _gate_curl_noise applies the established
// new_canonical gate unchanged: run-twice identity, the IC against the
// committed seeds, and the iso residual recomputed in f64 at the browser's
// f32 positions against [defaults.curl-noise] 2e-4 of the iso scale.
//
// The gate runs on its own uniforms and buffers: nothing the live page draws
// or the visitor changes reaches it.

import fieldWgsl from "../../field.wgsl?raw";
import tracersWgsl from "../../tracers.wgsl?raw";
import V from "../../generated/verification.json";
import { emitColormapWgsl } from "../../../../../../common/common-web/src/colormap.js";
import type { GateIc } from "../../capture.js";
import { field, makeBundle, sha256hex } from "../../capture.js";
import { simAsset } from "../../sim-root.js";
import type { CaptureBundle, CaptureStepDescriptor } from "@bp/verify";
import { isoValues } from "../../curlnoise64.mjs";

export type { GateIc };

/** The data spine's declared budget: [defaults.curl-noise] relative, of the iso scale. */
export const T_CURL_REL: number = V.tolerance.relative;
/** verify.py's IC slack: the browser's f32 IC against the committed f64 seeds. */
export const T_CURL_IC_ABS = 1e-6;
/** The repository's blob base (links in Learn and Prove). */
export const REPO_BLOB = "https://github.com/StevenFAU/Bit-Physics/blob/main/";
export const GATE_IC_SHA256: string = V.gate_ic_sha256;

// v1 main.ts CONSTRUCTION_ID
const CONSTRUCTION_ID: Record<string, number> = { crossprod: 0, curl3d: 1, curl2d: 2, abc: 3 };

// v1 main.ts: the colormap uniform the tracer module is compiled with
const CMAP_FN = emitColormapWgsl({ stopsExpr: "CM.stops", countExpr: "CM.cmeta.x", fnName: "colormap_sample" });
const CMAP_STRUCT = `
struct CU { stops: array<vec4<f32>, 8>, cmeta: vec4<f32> }
@group(0) @binding(6) var<uniform> CM: CU;
`;

/** The tracer module's source, as v1 builds it (shared with the live ≡ gated check). */
export const GATE_TRACER_SOURCE: string = fieldWgsl + CMAP_STRUCT + CMAP_FN + tracersWgsl;

// v1 main.ts: the boot camera's matrices (render-only fields of the tracer
// uniform; the compute entry points never read them — packed as v1 packs them)
function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = (near * far) / (near - far);
  return out;
}
function lookAtOrbit(yaw: number, pitch: number, dist: number): Float32Array {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const eye = [dist * cp * sy, dist * sp, dist * cp * cy];
  const f = eye.map((e) => -e / dist);
  const up = [0, 1, 0];
  const s = [f[1]! * up[2]! - f[2]! * up[1]!, f[2]! * up[0]! - f[0]! * up[2]!, f[0]! * up[1]! - f[1]! * up[0]!];
  const sl = Math.hypot(...s) || 1;
  const sn = s.map((v) => v / sl);
  const u = [sn[1]! * f[2]! - sn[2]! * f[1]!, sn[2]! * f[0]! - sn[0]! * f[2]!, sn[0]! * f[1]! - sn[1]! * f[0]!];
  const out = new Float32Array(16);
  out[0] = sn[0]!; out[4] = sn[1]!; out[8] = sn[2]!;
  out[1] = u[0]!; out[5] = u[1]!; out[9] = u[2]!;
  out[2] = -f[0]!; out[6] = -f[1]!; out[10] = -f[2]!;
  out[12] = -(sn[0]! * eye[0]! + sn[1]! * eye[1]! + sn[2]! * eye[2]!);
  out[13] = -(u[0]! * eye[0]! + u[1]! * eye[1]! + u[2]! * eye[2]!);
  out[14] = f[0]! * eye[0]! + f[1]! * eye[1]! + f[2]! * eye[2]!;
  out[15] = 1;
  return out;
}

/** v1's writeFUCanonical: the field uniform from the COMMITTED ic.params. */
export function packCanonicalField(ic: GateIc): Float32Array<ArrayBuffer> {
  const P = ic.params;
  const fuData = new Float32Array(36);
  fuData.fill(0);
  fuData.set([...P.obstacle_center, P.obstacle_radius], 0);
  fuData.set([P.obstacle_ramp_width, P.obstacle_noise_amp, 0.37, 0], 4);
  fuData.set([P.ell0, P.lacunarity, P.gain, P.amplitude], 8);
  fuData.set([CONSTRUCTION_ID[P.construction]!, P.octaves, 0, 0], 12);
  // gust/brush/attractor blocks stay zero; abc defaults are unused
  fuData.set([1, 1, 1, 0], 32);
  return fuData;
}

/**
 * v1's writeTU({ dt, count, wrap: 0, reproject: 1, rk4: 1 }) in the boot
 * state (canonical template "sphere", 262,144 display tracers, trail fade
 * 0.96, the boot camera on a square canvas).
 */
export function packGateTracerUniform(ic: GateIc): ArrayBuffer {
  const tuData = new ArrayBuffer(224);
  const tuF = new Float32Array(tuData);
  const tuU = new Uint32Array(tuData);
  const displayCount = 262144;
  const trailFade = 0.96;
  tuF.set(lookAtOrbit(0.6, 0.35, 1.9), 0);
  tuF.set(perspective(0.9, 1, 0.05, 20), 16);
  tuF[32] = ic.params.dt;
  tuU[33] = ic.params.tracers;
  tuU[34] = 0; // colour mode (speed)
  tuF[35] = 0.0016; // sprite size
  tuF[36] = 2.5 * 1.0 * 8; // speed scale (amplitude 1, crossprod)
  tuU[37] = 42;
  tuF[38] = 14.0; // max_age (sim seconds)
  tuU[39] = 1; // rk4
  const trailGain = 1.0 / Math.max(1.0 - trailFade, 0.04);
  tuF[40] = (2.6 / trailGain) * Math.sqrt(262144 / Math.max(displayCount, 1024));
  tuU[41] = 0; // wrap
  tuU[42] = 1; // reproject
  tuF[43] = 2.0; // stretch
  tuU[44] = 0; // seed type
  tuF[45] = 1.0; // exposure
  tuF.set([0.5, 0.5, 0.5], 48);
  tuF[51] = 0.3; // seed radius
  tuF[55] = 0.06; // seed thick
  return tuData;
}

/** The committed initial condition (public/gate-ic.json), fetched once. */
let icPromise: Promise<GateIc> | null = null;
export function loadGateIc(): Promise<GateIc> {
  icPromise ??= fetch(simAsset("gate-ic.json")).then(async (res) => {
    if (!res.ok) throw new Error(`gate-ic.json fetch failed: ${res.status}`);
    return (await res.json()) as GateIc;
  });
  return icPromise;
}

export interface GateRun {
  steps: CaptureStepDescriptor[];
  sha: string;
  f0: Float32Array;
}

/** The gate path: the frozen kernels on their own buffers. */
export class GateRunner {
  private constructor(
    private readonly device: GPUDevice,
    private readonly advectPipe: GPUComputePipeline,
    private readonly anchorPipe: GPUComputePipeline,
    private readonly fuBuf: GPUBuffer,
    private readonly tuBuf: GPUBuffer,
    readonly adapterInfo: string,
  ) {}

  static async create(device: GPUDevice, adapter: GPUAdapter): Promise<GateRunner> {
    const tracerModule = device.createShaderModule({ code: GATE_TRACER_SOURCE, label: "curl-gate-tracers" });
    const [advectPipe, anchorPipe] = await Promise.all([
      device.createComputePipelineAsync({ layout: "auto", compute: { module: tracerModule, entryPoint: "advect" } }),
      device.createComputePipelineAsync({ layout: "auto", compute: { module: tracerModule, entryPoint: "anchor_f0" } }),
    ]);
    const fuBuf = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "curl-gate-fu" });
    const tuBuf = device.createBuffer({ size: 224, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "curl-gate-tu" });
    // v1: `${adapter.info?.vendor ?? "?"}/${adapter.info?.architecture ?? "?"}`
    const info = (adapter as GPUAdapter & { info?: GPUAdapterInfo }).info;
    const adapterInfo = `${info?.vendor ?? "?"}/${info?.architecture ?? "?"}`;
    return new GateRunner(device, advectPipe, anchorPipe, fuBuf, tuBuf, adapterInfo);
  }

  private bind(pipe: GPUComputePipeline, tBuf: GPUBuffer, fBuf: GPUBuffer): GPUBindGroup {
    return this.device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.fuBuf } },
        { binding: 1, resource: { buffer: this.tuBuf } },
        { binding: 2, resource: { buffer: tBuf } },
        { binding: 3, resource: { buffer: fBuf } },
      ],
    });
  }

  /** v1's runGateOnce: one run of the gate scene on dedicated buffers. */
  async runOnce(ic: GateIc): Promise<GateRun> {
    const device = this.device;
    const n = ic.params.tracers;
    const gTracer = device.createBuffer({
      size: n * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    const gF0 = device.createBuffer({
      size: n * 8,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    const gRead = device.createBuffer({ size: n * 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const gF0Read = device.createBuffer({ size: n * 8, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    try {
      const pos = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        pos[i * 4] = ic.positions[i * 3]!;
        pos[i * 4 + 1] = ic.positions[i * 3 + 1]!;
        pos[i * 4 + 2] = ic.positions[i * 3 + 2]!;
        pos[i * 4 + 3] = 0;
      }
      device.queue.writeBuffer(gTracer, 0, pos);
      // canonical FU/TU from the COMMITTED params (t=0, no interactions,
      // no wrap, RK4 + reproject) — independent of any UI state
      device.queue.writeBuffer(this.fuBuf, 0, packCanonicalField(ic));
      device.queue.writeBuffer(this.tuBuf, 0, packGateTracerUniform(ic));
      const gAdvectBG = this.bind(this.advectPipe, gTracer, gF0);
      const gAnchorBG = this.bind(this.anchorPipe, gTracer, gF0);
      {
        const enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(this.anchorPipe);
        pass.setBindGroup(0, gAnchorBG);
        pass.dispatchWorkgroups(Math.ceil(n / 256));
        pass.end();
        device.queue.submit([enc.finish()]);
      }
      // read f0 (the browser's f32 iso anchors — a gate input)
      {
        const enc = device.createCommandEncoder();
        enc.copyBufferToBuffer(gF0, 0, gF0Read, 0, n * 8);
        device.queue.submit([enc.finish()]);
        await gF0Read.mapAsync(GPUMapMode.READ);
      }
      const f0 = new Float32Array(gF0Read.getMappedRange().slice(0));
      gF0Read.unmap();

      const steps: CaptureStepDescriptor[] = [];
      const shaChunks: Float32Array[] = [];
      const checkpoint = async (step: number): Promise<void> => {
        const enc = device.createCommandEncoder();
        enc.copyBufferToBuffer(gTracer, 0, gRead, 0, n * 16);
        device.queue.submit([enc.finish()]);
        await gRead.mapAsync(GPUMapMode.READ);
        const snap = new Float32Array(gRead.getMappedRange().slice(0));
        gRead.unmap();
        const xyz = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          xyz[i * 3] = snap[i * 4]!;
          xyz[i * 3 + 1] = snap[i * 4 + 1]!;
          xyz[i * 3 + 2] = snap[i * 4 + 2]!;
        }
        shaChunks.push(xyz);
        steps.push({
          step,
          state: { positions: field(xyz, [n, 3], "f32") },
          diagnostics: {},
        });
      };
      await checkpoint(0);
      for (let s = 1; s <= ic.params.steps; s++) {
        const enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(this.advectPipe);
        pass.setBindGroup(0, gAdvectBG);
        pass.dispatchWorkgroups(Math.ceil(n / 256));
        pass.end();
        device.queue.submit([enc.finish()]);
        if (s % ic.params.capture_interval === 0 || s === ic.params.steps) {
          await checkpoint(s);
        }
      }
      // include f0 in the first checkpoint state
      steps[0]!.state["f0"] = field(f0, [n, 2], "f32");
      const total = new Float32Array(shaChunks.reduce((a, c) => a + c.length, 0));
      let off = 0;
      for (const c of shaChunks) {
        total.set(c, off);
        off += c.length;
      }
      return { steps, sha: await sha256hex(total), f0 };
    } finally {
      gTracer.destroy();
      gF0.destroy();
      gRead.destroy();
      gF0Read.destroy();
    }
  }

  /** v1's captureGate, the bundle half: two runs, v1's bundle and manifest fields. */
  async capture(): Promise<{ bundle: CaptureBundle; runs: [GateRun, GateRun]; ic: GateIc }> {
    const t0 = performance.now();
    const ic = await loadGateIc();
    const run1 = await this.runOnce(ic);
    const run2 = await this.runOnce(ic);
    const twice = run1.sha === run2.sha;
    const bundle = makeBundle(ic, run2.steps, 42, (performance.now() - t0) / 1000, this.adapterInfo);
    bundle.manifest.config.params["run_twice_identical"] = twice;
    bundle.manifest.config.params["trajectory_sha256"] = run2.sha;
    return { bundle, runs: [run1, run2], ic };
  }
}

// ---- the gate's criterion, in the page (Prove) -----------------------------
// verify.py _gate_curl_noise, with the pure-JS double-precision mirror
// (src/curlnoise64.mjs, checked against the committed f64 anchors by
// gen-verification.mjs at every build) standing in for the Python reference.

export interface GateCheck {
  identical: boolean;
  checkpoints: number[];
  checkpointsOk: boolean;
  icMaxAbsDev: number;
  icOk: boolean;
  /** Worst ‖f64 f(x_f32) − f0_f32‖ over every tracer at every checkpoint. */
  isoWorst: number;
  isoScale: number;
  budgetAbs: number;
  fraction: number;
  passed: boolean;
  tracers: number;
}

/** The f64 mirror's config for the committed gate params. */
export function mirrorConfig(ic: GateIc): Record<string, unknown> {
  const P = ic.params;
  return {
    octaves: P.octaves,
    ell0: P.ell0,
    gain: P.gain,
    lacunarity: P.lacunarity,
    amplitude: P.amplitude,
    seed: 0,
    obstacleCenter: P.obstacle_center,
    obstacleRadius: P.obstacle_radius,
    obstacleRampWidth: P.obstacle_ramp_width,
    obstacleNoiseAmp: P.obstacle_noise_amp,
  };
}

/** Apply verify.py's criterion to the two runs of one capture. */
export function checkGate(ic: GateIc, a: GateRun, b: GateRun): GateCheck {
  const n = ic.params.tracers;
  const expected = [0];
  for (let s = 1; s <= ic.params.steps; s += 1) if (s % ic.params.capture_interval === 0 || s === ic.params.steps) expected.push(s);
  const ids = a.steps.map((s) => s.step);
  const checkpointsOk = ids.length === expected.length && ids.every((s, i) => s === expected[i]);
  const pos = (st: CaptureStepDescriptor): ArrayLike<number> => st.state["positions"]!.data;
  const identical =
    a.sha === b.sha &&
    a.steps.length === b.steps.length &&
    a.steps.every((s, i) => {
      const p = pos(s);
      const q = pos(b.steps[i]!);
      if (p.length !== q.length) return false;
      for (let k = 0; k < p.length; k += 1) if (p[k] !== q[k]) return false;
      return true;
    });
  let icDev = 0;
  const p0 = pos(a.steps[0]!);
  for (let k = 0; k < n * 3; k += 1) icDev = Math.max(icDev, Math.abs(p0[k]! - ic.positions[k]!));
  let scale = 0;
  for (const v of a.f0) scale = Math.max(scale, Math.abs(v));
  scale = Math.max(scale, 1e-9);
  const cfg = mirrorConfig(ic);
  let worst = 0;
  for (const st of a.steps) {
    const p = pos(st);
    for (let i = 0; i < n; i += 1) {
      const f = isoValues([p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!], cfg) as number[];
      const d = Math.hypot(f[0]! - a.f0[i * 2]!, f[1]! - a.f0[i * 2 + 1]!);
      if (d > worst) worst = d;
    }
  }
  const budgetAbs = T_CURL_REL * scale;
  return {
    identical,
    checkpoints: ids,
    checkpointsOk,
    icMaxAbsDev: icDev,
    icOk: icDev <= T_CURL_IC_ABS,
    isoWorst: worst,
    isoScale: scale,
    budgetAbs,
    fraction: worst / budgetAbs,
    passed: identical && checkpointsOk && icDev <= T_CURL_IC_ABS && worst <= budgetAbs,
    tracers: n,
  };
}
