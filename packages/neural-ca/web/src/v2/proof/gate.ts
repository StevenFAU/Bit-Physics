// The gate path — ported unchanged from the v1 page (src/main.ts writeParams /
// bind / stepOnce / readState / reset / captureCanonical, and
// src/verify-panel.ts runRollout / fetchCanonFrames / maxAbsAllFrames).
//
// HARD SEPARATION: the gate owns its own state buffers, its own weights
// buffer and its own capture-pinned param uniform. It runs the committed
// ../../../../typescript/src/nca_inference.wgsl byte for byte — the same
// two-dispatch (update + mask) step the wgpu-native gate runs — from the
// single-centre-cell seed at fire rate 0.5, seed 42. Nothing the visitor does
// on the page (scenes, tools, Tune, the live solver) can reach it. The
// headless driver clicks [data-bp="capture"] → captureCanonical() →
// exposeCapture(); verify.py then applies the established capture_roundtrip
// gate unchanged: rgba bit-exact (max_abs == 0.0) against the WGSL canonical
// over all 21 frames (_gate_neural_ca).

import inferenceWgsl from "../../../../typescript/src/nca_inference.wgsl?raw";
import V from "../../generated/verification.json";
import { simAsset } from "../../sim-root.js";
import { field, sha256hex } from "@bp/verify";
import type { CaptureBundle, CaptureStepDescriptor } from "@bp/verify";

export const GRID = 64;
export const CN = 16;
export const CANONICAL_STEPS = 1000;
export const CAPTURE_EVERY = 50;
export const FIRE_RATE = 0.5; // capture-pinned
export const CANONICAL_SEED = 42;
const RGBA = 4;

// Same drift check as v1: the compute constants must agree with the
// committed data spine, or the page refuses to boot.
if (
  V.canonical.grid[0] !== GRID ||
  V.model.channels !== CN ||
  V.canonical.step_count !== CANONICAL_STEPS ||
  V.canonical.capture_interval !== CAPTURE_EVERY ||
  V.canonical.seed !== CANONICAL_SEED ||
  V.model.fire_rate !== FIRE_RATE
) {
  throw new Error("verification.json drifted from the compute constants — rerun gen-verification.mjs");
}

/** The committed kernel's source text (the live solver compiles the same bytes). */
export const KERNEL_WGSL: string = inferenceWgsl;

/** A public asset (dist root), resolved from the bundle so any page depth works. */
export function assetUrl(name: string): string {
  return simAsset(name);
}

export interface Layout {
  tensors: Record<string, { offset: number }>;
}

/** The committed checkpoint, as shipped: flat f32 weights + the offsets the kernel reads. */
export interface Checkpoint {
  weights: Float32Array<ArrayBuffer>;
  b1Off: number;
  w1Off: number;
  w2Off: number;
  /** SHA-256 of the weights file as fetched (compared with verification.json in Prove). */
  sha256: string;
}

export async function fetchCheckpoint(): Promise<Checkpoint> {
  const [weightsBuf, layout] = await Promise.all([
    fetch(assetUrl("nca-weights.bin")).then((r) => {
      if (!r.ok) throw new Error(`weights fetch failed: ${r.status}`);
      return r.arrayBuffer();
    }),
    fetch(assetUrl("nca-layout.json")).then((r) => {
      if (!r.ok) throw new Error(`layout fetch failed: ${r.status}`);
      return r.json() as Promise<Layout>;
    }),
  ]);
  return {
    weights: new Float32Array(weightsBuf),
    b1Off: layout.tensors["w1.bias"]!.offset,
    w1Off: layout.tensors["w1.weight"]!.offset,
    w2Off: layout.tensors["w2.weight"]!.offset,
    sha256: await sha256hex(weightsBuf),
  };
}

/** Single live centre cell: channels 3.. = 1.0 (alpha + hidden). */
export function seedState(grid = GRID): Float32Array<ArrayBuffer> {
  const s = new Float32Array(grid * grid * CN);
  const mid = Math.floor(grid / 2);
  const base = (mid * grid + mid) * CN;
  for (let c = 3; c < CN; c += 1) s[base + c] = 1.0;
  return s;
}

export interface GateProof {
  hashes: [string, string];
  identical: boolean;
  /** max_abs over all 21 frames, run 1 vs the committed canonical frames. */
  maxAbs: number;
  bitExact: boolean;
  seconds: number;
  /** Run 1's frames (rgba, clamped), for the per-frame |Δ| view. */
  frames: Float32Array[];
  canon: Float32Array[];
}

export interface GateRunner {
  /** The capture the headless gate reads (v1 captureCanonical, verbatim). */
  captureCanonical(onProgress?: (step: number) => void): Promise<CaptureBundle>;
  /** One scratch rollout of the canonical protocol (v1 verify-panel runRollout, verbatim); 21 rgba frames. */
  runRollout(seed: number, fire: number, onProgress?: (done: number) => void): Promise<Float32Array[]>;
  /** The committed canonical frames asset, sha-checked. */
  fetchCanonFrames(): Promise<Float32Array[]>;
  /** Two rollouts, hashed (run-twice), run 1 scored against the committed frames (max_abs, all frames). */
  runTwiceAndScore(seed?: number, onProgress?: (msg: string) => void): Promise<GateProof>;
}

export function maxAbsAllFrames(run: readonly Float32Array[], canon: readonly Float32Array[]): number {
  let m = 0;
  const kmax = Math.min(run.length, canon.length);
  for (let k = 0; k < kmax; k += 1) {
    const r = run[k]!;
    const cf = canon[k]!;
    for (let i = 0; i < r.length; i += 1) {
      const dd = Math.abs(r[i]! - cf[i]!);
      if (dd > m) m = dd;
    }
  }
  return m;
}

export async function createGateRunner(device: GPUDevice, ck: Checkpoint): Promise<GateRunner> {
  const queue = device.queue;
  const { weights, b1Off, w1Off, w2Off } = ck;

  const stateLen = GRID * GRID * CN;
  const stateBytes = stateLen * 4;
  const U = GPUBufferUsage;
  // capture-path buffers (v1 main.ts, dedicated to the gate here)
  const makeState = (label: string): GPUBuffer =>
    device.createBuffer({ size: stateBytes, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST, label });
  let cur = makeState("gate-cur");
  const mid = makeState("gate-mid");
  let nxt = makeState("gate-nxt");
  const wbuf = device.createBuffer({ size: weights.byteLength, usage: U.STORAGE | U.COPY_DST, label: "gate-weights" });
  queue.writeBuffer(wbuf, 0, weights);
  const paramBuf = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST, label: "gate-params-canonical" });

  const module = device.createShaderModule({ code: inferenceWgsl, label: "nca" });
  const bgl = device.createBindGroupLayout({
    label: "nca-gate-bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ],
  });
  const pl = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
  const pipeUpdate = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "update" } });
  const pipeMask = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "mask" } });

  // writeParams(buf, step, seed, fireRate): the 32-byte Params block. Byte
  // layout is the frozen kernel's Params struct.
  function writeParams(buf: GPUBuffer, step: number, seed: number, fireRate: number): void {
    const ab = new ArrayBuffer(32);
    const dv = new DataView(ab);
    dv.setUint32(0, GRID, true);
    dv.setUint32(4, step, true);
    dv.setUint32(8, seed, true);
    dv.setFloat32(12, fireRate, true);
    dv.setUint32(16, b1Off, true);
    dv.setUint32(20, w1Off, true);
    dv.setUint32(24, w2Off, true);
    dv.setUint32(28, 0, true);
    queue.writeBuffer(buf, 0, ab);
  }

  function bind(param: GPUBuffer, a: GPUBuffer, b: GPUBuffer, out: GPUBuffer): GPUBindGroup {
    return device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: param } },
        { binding: 1, resource: { buffer: a } },
        { binding: 2, resource: { buffer: b } },
        { binding: 3, resource: { buffer: out } },
        { binding: 4, resource: { buffer: wbuf } },
      ],
    });
  }

  const wg = Math.ceil(GRID / 8);

  // --- FROZEN capture path (numerics byte-identical; v1 spec § 6) -----------
  // stepOnce: TWO submits (update then mask). Untouched from the landed gate
  // driver; the capture re-runs the pinned protocol through this alone.
  function stepOnce(step: number, seed: number): void {
    writeParams(paramBuf, step, seed, FIRE_RATE);
    const enc1 = device.createCommandEncoder();
    const p1 = enc1.beginComputePass();
    p1.setPipeline(pipeUpdate);
    p1.setBindGroup(0, bind(paramBuf, cur, cur, mid));
    p1.dispatchWorkgroups(wg, wg);
    p1.end();
    queue.submit([enc1.finish()]);
    const enc2 = device.createCommandEncoder();
    const p2 = enc2.beginComputePass();
    p2.setPipeline(pipeMask);
    p2.setBindGroup(0, bind(paramBuf, cur, mid, nxt));
    p2.dispatchWorkgroups(wg, wg);
    p2.end();
    queue.submit([enc2.finish()]);
    [cur, nxt] = [nxt, cur];
  }

  async function readState(buf: GPUBuffer = cur): Promise<Float32Array> {
    const rb = device.createBuffer({ size: stateBytes, usage: U.COPY_DST | U.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, rb, 0, stateBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  function reset(): void {
    queue.writeBuffer(cur, 0, seedState());
    queue.writeBuffer(mid, 0, new Float32Array(stateLen));
    queue.writeBuffer(nxt, 0, new Float32Array(stateLen));
  }

  // --- capture-export: reproduce the canonical descriptor (FROZEN) ----------
  async function captureCanonical(onProgress?: (step: number) => void): Promise<CaptureBundle> {
    reset();
    const steps: CaptureStepDescriptor[] = [];
    const recordFrame = (idx: number, st: Float32Array): void => {
      const rgba = new Float32Array(GRID * GRID * 4);
      for (let c = 0; c < GRID * GRID; c += 1) {
        for (let ch = 0; ch < 4; ch += 1) {
          rgba[c * 4 + ch] = Math.min(1, Math.max(0, st[c * CN + ch] ?? 0));
        }
      }
      steps.push({ step: idx, state: { rgba: field(rgba, [GRID, GRID, 4], "f32") }, diagnostics: {} });
    };
    recordFrame(0, await readState());
    for (let s = 0; s < CANONICAL_STEPS; s += 1) {
      stepOnce(s, 42);
      if ((s + 1) % CAPTURE_EVERY === 0) {
        recordFrame(s + 1, await readState());
        onProgress?.(s + 1);
      }
    }
    const bundle: CaptureBundle = {
      manifest: {
        schema_version: "1.0.0",
        sim: { name: "neural-ca", category: "continuous-ca", variant: "growing-neural-ca" },
        stack: { name: "wgsl", version: "webgpu", build_id: "web-build-5.x" },
        config: { tier: "reference", dims: [GRID, GRID], dtype: "f32", seed: 42, params: { channel_n: CN, steps: CANONICAL_STEPS, capture_every: CAPTURE_EVERY } },
        run: { step_count: CANONICAL_STEPS, capture_interval: CAPTURE_EVERY, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
        // REAL committed payload checksum; this is the HDF5 payload FILE hash,
        // not the rgba-frame digest.
        payload: { format: "hdf5", path: "growing-emoji-64sq-seed42-step1000-wgsl.h5", checksum: V.canonical.payload_sha256 },
        determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
      },
      steps,
    };
    reset();
    return bundle;
  }

  // ---- the in-page proof (v1 verify-panel runRollout, verbatim) -------------
  const cells = GRID * GRID;
  const frameFloats = cells * RGBA;
  const nFrames = V.canonical_frames.n_frames;

  async function grab(buf: GPUBuffer): Promise<Float32Array> {
    const rb = device.createBuffer({ size: stateBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, rb, 0, stateBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const full = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    const rgba = new Float32Array(frameFloats);
    for (let c = 0; c < cells; c += 1) {
      for (let ch = 0; ch < 4; ch += 1) rgba[c * 4 + ch] = Math.min(1, Math.max(0, full[c * CN + ch] ?? 0));
    }
    return rgba;
  }

  async function runRollout(seed: number, fire: number, onProgress?: (done: number) => void): Promise<Float32Array[]> {
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    let a = device.createBuffer({ size: stateBytes, usage, label: "nca-proof-a" });
    const b = device.createBuffer({ size: stateBytes, usage, label: "nca-proof-mid" });
    let c = device.createBuffer({ size: stateBytes, usage, label: "nca-proof-c" });
    const proofParams = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "nca-proof-params" });
    queue.writeBuffer(a, 0, seedState());
    const zeros = new Float32Array(cells * CN);
    queue.writeBuffer(b, 0, zeros);
    queue.writeBuffer(c, 0, zeros);
    const updCache = new Map<GPUBuffer, GPUBindGroup>();
    const maskCache = new Map<GPUBuffer, GPUBindGroup>();
    try {
      const frames: Float32Array[] = [await grab(a)];
      for (let s = 0; s < CANONICAL_STEPS; s += 1) {
        writeParams(proofParams, s, seed, fire);
        let upd = updCache.get(a);
        if (!upd) { upd = bind(proofParams, a, a, b); updCache.set(a, upd); }
        let msk = maskCache.get(a);
        if (!msk) { msk = bind(proofParams, a, b, c); maskCache.set(a, msk); }
        const enc = device.createCommandEncoder();
        const p1 = enc.beginComputePass();
        p1.setPipeline(pipeUpdate);
        p1.setBindGroup(0, upd);
        p1.dispatchWorkgroups(wg, wg);
        p1.end();
        const p2 = enc.beginComputePass();
        p2.setPipeline(pipeMask);
        p2.setBindGroup(0, msk);
        p2.dispatchWorkgroups(wg, wg);
        p2.end();
        queue.submit([enc.finish()]);
        [a, c] = [c, a];
        if ((s + 1) % CAPTURE_EVERY === 0) {
          frames.push(await grab(a));
          onProgress?.(s + 1);
        }
        if ((s + 1) % 128 === 0) await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
      }
      return frames;
    } finally {
      a.destroy();
      b.destroy();
      c.destroy();
      proofParams.destroy();
    }
  }

  async function fetchCanonFrames(): Promise<Float32Array[]> {
    const res = await fetch(assetUrl(V.canonical_frames.asset));
    if (!res.ok) throw new Error(`canonical-frames asset fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== V.canonical_frames.bytes) throw new Error(`canonical-frames asset is ${buf.byteLength} bytes, want ${V.canonical_frames.bytes}`);
    if ((await sha256hex(buf)) !== V.canonical_frames.sha256) throw new Error("canonical-frames asset sha mismatch — refusing to gate against unverified bytes");
    const all = new Float32Array(buf);
    const out: Float32Array[] = [];
    for (let k = 0; k < nFrames; k += 1) out.push(all.subarray(k * frameFloats, (k + 1) * frameFloats));
    return out;
  }

  async function runTwiceAndScore(seed = CANONICAL_SEED, onProgress?: (msg: string) => void): Promise<GateProof> {
    const t0 = performance.now();
    const label = (run: number) => (done: number) => onProgress?.(`run ${run} of 2 — step ${done.toLocaleString()} of ${CANONICAL_STEPS.toLocaleString()}`);
    const run1 = await runRollout(seed, FIRE_RATE, label(1));
    const run2 = await runRollout(seed, FIRE_RATE, label(2));
    const flat1 = new Float32Array(run1.length * frameFloats);
    const flat2 = new Float32Array(run2.length * frameFloats);
    run1.forEach((f, i) => flat1.set(f, i * frameFloats));
    run2.forEach((f, i) => flat2.set(f, i * frameFloats));
    const [h1, h2] = await Promise.all([sha256hex(flat1), sha256hex(flat2)]);
    const canon = await fetchCanonFrames();
    const maxAbs = maxAbsAllFrames(run1, canon);
    return {
      hashes: [h1, h2],
      identical: h1 === h2,
      maxAbs,
      bitExact: maxAbs === 0 && run1.length === nFrames,
      seconds: (performance.now() - t0) / 1000,
      frames: run1,
      canon,
    };
  }

  return { captureCanonical, runRollout, fetchCanonFrames, runTwiceAndScore };
}
