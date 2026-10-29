// The gate path — ported unchanged from the v1 page (src/main.ts reset /
// stepCanonical / captureCanonical, and src/verify-panel.ts runCanonical).
//
// HARD SEPARATION: the gate owns its own buffers and its own canonical param
// uniform. It runs the committed ../../../src/physarum.wgsl byte for byte —
// the same 3-pass kernel the wgpu-native gate runs — from the committed
// seed-42 IC asset, with the canonical params written by v1's writer. Nothing
// the visitor does on the page (scenes, sliders, the 2M-agent live solver)
// can reach it. The headless driver clicks [data-bp="capture"] →
// captureCanonical() → exposeCapture(); verify.py then applies the
// established new_canonical gate unchanged: run-twice byte identity plus
// |M − 22500| / 22500 < 1e-3 (_gate_physarum).

import gatedWgsl from "../../../../src/physarum.wgsl?raw";
import V from "../../generated/verification.json";
import { simAsset } from "../../sim-root.js";
import { field, sha256hex } from "@bp/verify";
import type { CaptureBundle } from "@bp/verify";

export const W = 256;
export const H = 256;
export const NA = 500;
export const STEPS = 5000;
export const CAPTURE_INTERVAL = 500;
export const PARAMS = { delta_phi_deg: 45.0, L_sense: 9.0, L_move: 1.0, deposit: 5.0, decay_alpha: 0.1 };
export type JonesParams = typeof PARAMS;

// Same drift check as v1: the compute constants must agree with the
// committed data spine, or the page refuses to boot.
if (
  V.canonical.grid[0] !== W ||
  V.canonical.grid[1] !== H ||
  V.canonical.n_agents !== NA ||
  V.canonical.steps !== STEPS ||
  V.canonical.capture_interval !== CAPTURE_INTERVAL ||
  V.canonical.params.delta_phi_deg !== PARAMS.delta_phi_deg ||
  V.canonical.params.L_sense !== PARAMS.L_sense ||
  V.canonical.params.L_move !== PARAMS.L_move ||
  V.canonical.params.deposit !== PARAMS.deposit ||
  V.canonical.params.decay_alpha !== PARAMS.decay_alpha ||
  V.mass_equilibrium.canonical_value !== (PARAMS.deposit * NA * (1 - PARAMS.decay_alpha)) / PARAMS.decay_alpha
) {
  throw new Error("verification.json drifted from the compute constants — rerun gen-verification.mjs");
}

/** The closed-form equilibrium mass d·N·(1−α)/α (verification.json mass_equilibrium). */
export const equilibriumMass = (p: Pick<JonesParams, "deposit" | "decay_alpha">, n: number): number =>
  (p.deposit * n * (1 - p.decay_alpha)) / p.decay_alpha;

/** A public asset (dist root), resolved from the bundle so any page depth works. */
export function assetUrl(name: string): string {
  return simAsset(name);
}

export interface CanonicalIC {
  pos: Float32Array<ArrayBuffer>;
  head: Float32Array<ArrayBuffer>;
}

/** The committed seed-42 IC (500 positions, then 500 headings), shipped verbatim. */
export async function fetchCanonicalIC(): Promise<CanonicalIC> {
  const res = await fetch(assetUrl(V.ic_asset.asset));
  if (!res.ok) throw new Error(`IC fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength !== V.ic_asset.bytes) throw new Error(`IC asset is ${buf.byteLength} bytes, want ${V.ic_asset.bytes}`);
  const all = new Float32Array(buf);
  return { pos: all.slice(0, NA * 2), head: all.slice(NA * 2) };
}

export interface GateProof {
  hashes: [string, string];
  identical: boolean;
  mass: number;
  massRel: number;
  pass: boolean;
  seconds: number;
  /** The final trail of run 1 (x-major, as the gated kernel lays it out). */
  trail: Float32Array;
}

export interface GateRunner {
  captureCanonical(onProgress?: (step: number) => void): Promise<CaptureBundle>;
  runTwiceAndAgree(onProgress?: (msg: string) => void): Promise<GateProof>;
  /** One scratch run of the canonical protocol; the final trail (for the live ≡ gated check). */
  runCanonicalTrail(onProgress?: (done: number, total: number) => void): Promise<Float32Array<ArrayBuffer>>;
}

export async function createGateRunner(device: GPUDevice): Promise<GateRunner> {
  const queue = device.queue;
  const U = GPUBufferUsage;
  const tn = W * H * 4;
  // capture-path buffers (v1 main.ts, dedicated to the gate here)
  const Ta = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "gate-trail-a" });
  const Tb = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "gate-trail-b" });
  const posB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "gate-pos" });
  const headB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "gate-head" });
  const depB = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "gate-dep" });
  const paramBuf = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST, label: "gate-params-canonical" });

  function writeCanonicalParams(buf: GPUBuffer): void {
    const ab = new ArrayBuffer(48);
    const dv = new DataView(ab);
    dv.setUint32(0, NA, true);
    dv.setUint32(4, W, true);
    dv.setUint32(8, H, true);
    dv.setUint32(12, 0, true);
    dv.setFloat32(16, (PARAMS.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, PARAMS.L_sense, true);
    dv.setFloat32(24, PARAMS.L_move, true);
    dv.setFloat32(28, PARAMS.deposit, true);
    dv.setFloat32(32, PARAMS.decay_alpha, true);
    queue.writeBuffer(buf, 0, ab);
  }
  writeCanonicalParams(paramBuf);

  const module = device.createShaderModule({ code: gatedWgsl, label: "physarum" });
  const bgl = device.createBindGroupLayout({
    label: "physarum-gate-bgl",
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
  const [pAgents, pApply, pDiffuse] = await Promise.all([
    device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "agents" } }),
    device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "apply" } }),
    device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "diffuse" } }),
  ]);

  const bindCompute = (tin: GPUBuffer, tout: GPUBuffer, pos: GPUBuffer, head: GPUBuffer, dep: GPUBuffer, params: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: tin } },
        { binding: 2, resource: { buffer: tout } },
        { binding: 3, resource: { buffer: pos } },
        { binding: 4, resource: { buffer: head } },
        { binding: 5, resource: { buffer: dep } },
      ],
    });

  // ---- capture path (v1 main.ts, verbatim) ----------------------------------
  const wgaCanon = Math.ceil(NA / 64);
  const wggCanon = Math.ceil(W / 8);
  function stepWith(params: GPUBuffer): void {
    const enc = device.createCommandEncoder();
    let c = enc.beginComputePass();
    c.setPipeline(pAgents); c.setBindGroup(0, bindCompute(Ta, Tb, posB, headB, depB, params)); c.dispatchWorkgroups(wgaCanon); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pApply); c.setBindGroup(0, bindCompute(Ta, Tb, posB, headB, depB, params)); c.dispatchWorkgroups(wggCanon, wggCanon); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pDiffuse); c.setBindGroup(0, bindCompute(Tb, Ta, posB, headB, depB, params)); c.dispatchWorkgroups(wggCanon, wggCanon); c.end();
    queue.submit([enc.finish()]);
  }
  const stepCanonical = (): void => stepWith(paramBuf);

  async function readF32(buf: GPUBuffer, n: number): Promise<Float32Array<ArrayBuffer>> {
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
    const { pos, head } = await fetchCanonicalIC();
    queue.writeBuffer(Ta, 0, new Float32Array(W * H));
    queue.writeBuffer(depB, 0, new Uint32Array(W * H));
    queue.writeBuffer(posB, 0, pos);
    queue.writeBuffer(headB, 0, head);
  }

  async function captureCanonical(onProgress?: (step: number) => void): Promise<CaptureBundle> {
    await reset();
    for (let s = 0; s < STEPS; s += 1) {
      stepCanonical();
      // progress only; never waits on the GPU mid-run, as in v1
      if ((s + 1) % CAPTURE_INTERVAL === 0) onProgress?.(s + 1);
    }
    const trail = await readF32(Ta, W * H);
    const pos = await readF32(posB, NA * 2);
    const head = await readF32(headB, NA * 2);
    const trail64 = new Float64Array(trail);
    let mass = 0;
    for (let i = 0; i < trail.length; i += 1) mass += trail[i]!;
    const bundle: CaptureBundle = {
      manifest: {
        schema_version: "1.0.0",
        sim: { name: "physarum", category: "agent-based", variant: "jones-2010-canonical" },
        stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
        config: { tier: "test", dims: [W, H], dtype: "f64", seed: 42, params: { ...PARAMS, n_agents: NA } },
        run: { step_count: STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
        payload: { format: "hdf5", path: "network-canonical-seed42-step5000.h5", checksum: V.canonical.payload_sha256 },
        determinism: { claimed: "bit-exact-same-hw", atomic_ops: true, subgroup_ops: false },
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
    };
    await reset();
    return bundle;
  }

  // ---- the in-page proof (v1 verify-panel runCanonical, verbatim) -----------
  const CHUNK = 200; // steps per submit (600 dispatches)
  async function runCanonicalTrail(onProgress?: (done: number, total: number) => void): Promise<Float32Array<ArrayBuffer>> {
    const ic = await fetchCanonicalIC();
    const sTa = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "proof-trail-a" });
    const sTb = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC, label: "proof-trail-b" });
    const pos = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST, label: "proof-pos" });
    const head = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST, label: "proof-head" });
    const dep = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST, label: "proof-dep" });
    const params = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST, label: "proof-params" });
    writeCanonicalParams(params);
    queue.writeBuffer(sTa, 0, new Float32Array(W * H));
    queue.writeBuffer(dep, 0, new Uint32Array(W * H));
    queue.writeBuffer(pos, 0, ic.pos);
    queue.writeBuffer(head, 0, ic.head);
    const bgAB = bindCompute(sTa, sTb, pos, head, dep, params); // agents reads Ta; apply Ta->Tb
    const bgBA = bindCompute(sTb, sTa, pos, head, dep, params); // diffuse Tb->Ta
    const wga = Math.ceil(NA / 64);
    const wgg = Math.ceil(W / 8);
    try {
      let done = 0;
      while (done < STEPS) {
        const batch = Math.min(CHUNK, STEPS - done);
        const enc = device.createCommandEncoder();
        for (let s = 0; s < batch; s += 1) {
          let c = enc.beginComputePass();
          c.setPipeline(pAgents); c.setBindGroup(0, bgAB); c.dispatchWorkgroups(wga); c.end();
          c = enc.beginComputePass();
          c.setPipeline(pApply); c.setBindGroup(0, bgAB); c.dispatchWorkgroups(wgg, wgg); c.end();
          c = enc.beginComputePass();
          c.setPipeline(pDiffuse); c.setBindGroup(0, bgBA); c.dispatchWorkgroups(wgg, wgg); c.end();
        }
        queue.submit([enc.finish()]);
        await queue.onSubmittedWorkDone();
        done += batch;
        onProgress?.(done, STEPS);
      }
      return await readF32(sTa, W * H);
    } finally {
      for (const b of [sTa, sTb, pos, head, dep, params]) b.destroy();
    }
  }

  async function runTwiceAndAgree(onProgress?: (msg: string) => void): Promise<GateProof> {
    const t0 = performance.now();
    const run1 = await runCanonicalTrail((d, t) => onProgress?.(`run 1 of 2 — step ${d.toLocaleString()} of ${t.toLocaleString()}`));
    const run2 = await runCanonicalTrail((d, t) => onProgress?.(`run 2 of 2 — step ${d.toLocaleString()} of ${t.toLocaleString()}`));
    const [h1, h2] = await Promise.all([sha256hex(run1), sha256hex(run2)]);
    let mass = 0;
    for (let i = 0; i < run1.length; i += 1) mass += run1[i]!;
    const eq = V.mass_equilibrium.canonical_value;
    const massRel = Math.abs(mass - eq) / eq;
    const finite = Number.isFinite(mass);
    return {
      hashes: [h1, h2],
      identical: h1 === h2,
      mass,
      massRel,
      pass: h1 === h2 && finite && massRel < V.gate.mass_rel_threshold,
      seconds: (performance.now() - t0) / 1000,
      trail: run1,
    };
  }

  return { captureCanonical, runTwiceAndAgree, runCanonicalTrail };
}
