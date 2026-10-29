// The gate path — ported unchanged from the v1 page (src/main.ts
// captureCanonical + src/verify-panel.ts runCanonicalScratch).
//
// HARD SEPARATION: the gate owns its own buffers and its own canonical param
// uniform. It runs the committed ../../gray_scott.wgsl byte for byte, from
// the committed seed-42 IC asset, with the canonical params written by the
// same writer as v1 — nothing the visitor does on the page (scenes, sliders,
// brushes, dives, the live solver) can reach it. The headless driver clicks
// [data-bp="capture"] → captureCanonical() → exposeCapture(); verify.py then
// applies the established capture_roundtrip gate within
// [defaults.reaction-diffusion] (rel 1e-4), unchanged.

import gatedWgsl from "../../../../src/gray_scott.wgsl?raw";
import V from "../../generated/verification.json";
import { simAsset } from "../../sim-root.js";
import { agreement, field, sha256hex } from "@bp/verify";
import type { CaptureBundle, CaptureManifestLike, CaptureStepDescriptor, FieldAgreement } from "@bp/verify";

export const N = 128;
export const CANONICAL_STEPS = 2000;
export const CAPTURE_INTERVAL = 200;
export const PARAMS = { Du: 0.16, Dv: 0.08, F: 0.0367, k: 0.0649, dx: 1.0, dt: 1.0 };

// Same drift check as v1: the compute constants must agree with the
// committed data spine, or the page refuses to boot.
if (
  V.canonical.params.Du !== PARAMS.Du ||
  V.canonical.params.Dv !== PARAMS.Dv ||
  V.canonical.params.F !== PARAMS.F ||
  V.canonical.params.k !== PARAMS.k ||
  V.canonical.params.dx !== PARAMS.dx ||
  V.canonical.params.dt !== PARAMS.dt ||
  V.canonical.step_count !== CANONICAL_STEPS ||
  V.canonical.capture_interval !== CAPTURE_INTERVAL ||
  V.canonical.grid[0] !== N
) {
  throw new Error("verification.json canonical values drifted from compute constants — rerun gen-verification.mjs");
}

/** A public asset (dist root), resolved from the bundle so any page depth works. */
export function assetUrl(name: string): string {
  return simAsset(name);
}

/** The committed seed-42 IC (numpy PCG64 perturbation, shipped verbatim). */
export async function fetchCanonicalIC(): Promise<Float32Array<ArrayBuffer>> {
  const res = await fetch(assetUrl(V.ic_asset.asset));
  if (!res.ok) throw new Error(`IC asset fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ic = new Float32Array(buf);
  if (ic.length !== N * N * 2) throw new Error(`IC asset length ${ic.length} != ${N * N * 2}`);
  return ic;
}

export interface GateRunner {
  captureCanonical(onProgress?: (step: number) => void): Promise<CaptureBundle>;
  runTwiceAndAgree(onProgress?: (msg: string) => void): Promise<GateProof>;
}

export interface GateProof {
  hashes: [string, string];
  identical: boolean;
  U: FieldAgreement;
  V: FieldAgreement;
  pass: boolean;
  seconds: number;
}

export async function createGateRunner(device: GPUDevice): Promise<GateRunner> {
  const queue = device.queue;
  const cellCount = N * N;
  const bufBytes = cellCount * 2 * 4;
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const buffers = [
    device.createBuffer({ size: bufBytes, usage, label: "gate-state-a" }),
    device.createBuffer({ size: bufBytes, usage, label: "gate-state-b" }),
  ];
  const computeLayout = device.createBindGroupLayout({
    label: "rd2d-compute-bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computeModule = device.createShaderModule({ code: gatedWgsl, label: "gray-scott" });
  const computePipeline = await device.createComputePipelineAsync({
    label: "rd2d-compute",
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const paramBuf = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "params-canonical",
  });

  type StepParams = typeof PARAMS;
  function writeStepParams(buf: GPUBuffer, p: StepParams, step: number): void {
    const ab = new ArrayBuffer(32);
    const view = new DataView(ab);
    view.setUint32(0, N, true);
    view.setUint32(4, step, true);
    view.setFloat32(8, p.Du, true);
    view.setFloat32(12, p.Dv, true);
    view.setFloat32(16, p.F, true);
    view.setFloat32(20, p.k, true);
    view.setFloat32(24, p.dx, true);
    view.setFloat32(28, p.dt, true);
    queue.writeBuffer(buf, 0, ab);
  }

  const wg = Math.ceil(N / 8);
  let src = 0;
  let stepCounter = 0;

  function stepCanonical(): void {
    writeStepParams(paramBuf, PARAMS, stepCounter + 1);
    const dst = 1 - src;
    const bg = device.createBindGroup({
      layout: computeLayout,
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: buffers[src]! } },
        { binding: 2, resource: { buffer: buffers[dst]! } },
      ],
      label: `rd2d-cbg-${stepCounter}`,
    });
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

  async function readState(index: number): Promise<Float32Array<ArrayBuffer>> {
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

  async function loadIC(): Promise<void> {
    const ic = await fetchCanonicalIC();
    queue.writeBuffer(buffers[0]!, 0, ic);
    src = 0;
    stepCounter = 0;
  }

  async function captureCanonical(onProgress?: (step: number) => void): Promise<CaptureBundle> {
    await loadIC();
    const steps: CaptureStepDescriptor[] = [];
    const recordStep = (idx: number, interleaved: Float32Array): void => {
      const U = new Float64Array(cellCount);
      const Vf = new Float64Array(cellCount);
      let massU = 0;
      let massV = 0;
      for (let c = 0; c < cellCount; c += 1) {
        U[c] = interleaved[c * 2] ?? 0;
        Vf[c] = interleaved[c * 2 + 1] ?? 0;
        massU += U[c];
        massV += Vf[c];
      }
      steps.push({
        step: idx,
        state: { U: field(U, [N, N], "f64"), V: field(Vf, [N, N], "f64") },
        diagnostics: { mass_U: massU, mass_V: massV },
      });
    };
    recordStep(0, await readState(src));
    for (let stepN = 1; stepN <= CANONICAL_STEPS; stepN += 1) {
      stepCanonical();
      if (stepN % CAPTURE_INTERVAL === 0 || stepN === CANONICAL_STEPS) {
        recordStep(stepN, await readState(src));
        onProgress?.(stepN);
      }
    }
    return {
      manifest: {
        schema_version: "1.0.0",
        sim: { name: "reaction-diffusion-2d", category: "continuous-ca", variant: "gray-scott" },
        stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
        config: { tier: "test", dims: [N, N], dtype: "f64", seed: V.canonical.seed, params: PARAMS },
        run: {
          step_count: CANONICAL_STEPS,
          capture_interval: CAPTURE_INTERVAL,
          wall_clock_seconds: 0,
          start_utc: "2026-05-20T00:00:00Z",
        },
        payload: {
          format: "hdf5",
          path: `${V.canonical.descriptor}.h5`,
          checksum: V.canonical.payload_sha256,
        },
        determinism: {
          claimed: V.determinism.browser_claimed as CaptureManifestLike["determinism"]["claimed"],
          atomic_ops: false,
          subgroup_ops: false,
        },
      },
      steps,
    };
  }

  // --- the in-page proof (v1 verify-panel runCanonicalScratch, verbatim) --
  async function runCanonicalScratch(params: GPUBuffer, ic: Float32Array<ArrayBuffer>): Promise<Float32Array<ArrayBuffer>> {
    const a = device.createBuffer({ size: bufBytes, usage, label: "rd2d-proof-a" });
    const b = device.createBuffer({ size: bufBytes, usage, label: "rd2d-proof-b" });
    queue.writeBuffer(a, 0, ic);
    const bind = (s: GPUBuffer, d: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: computeLayout,
        entries: [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: s } },
          { binding: 2, resource: { buffer: d } },
        ],
      });
    const ab = bind(a, b);
    const ba = bind(b, a);
    const CHUNK = 500;
    for (let s = 0; s < CANONICAL_STEPS; s += CHUNK) {
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      for (let k = s; k < Math.min(s + CHUNK, CANONICAL_STEPS); k += 1) {
        pass.setBindGroup(0, k % 2 === 0 ? ab : ba);
        pass.dispatchWorkgroups(wg, wg, 1);
      }
      pass.end();
      queue.submit([enc.finish()]);
    }
    const rb = device.createBuffer({ size: bufBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(CANONICAL_STEPS % 2 === 0 ? a : b, 0, rb, 0, bufBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const final = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    a.destroy();
    b.destroy();
    return final;
  }

  async function fetchCanonicalFields(): Promise<{ U: Float64Array; V: Float64Array }> {
    const res = await fetch(assetUrl(V.canonical_final_fields.asset));
    if (!res.ok) throw new Error(`canonical-fields asset fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== V.canonical_final_fields.bytes) {
      throw new Error(`canonical-fields asset is ${buf.byteLength} bytes, want ${V.canonical_final_fields.bytes}`);
    }
    if ((await sha256hex(buf)) !== V.canonical_final_fields.sha256) {
      throw new Error("canonical-fields asset sha mismatch — refusing to gate against unverified bytes");
    }
    return { U: new Float64Array(buf, 0, cellCount), V: new Float64Array(buf, cellCount * 8, cellCount) };
  }

  async function runTwiceAndAgree(onProgress?: (msg: string) => void): Promise<GateProof> {
    const t0 = performance.now();
    const params = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "rd2d-proof-params",
    });
    writeStepParams(params, PARAMS, 0);
    const ic = await fetchCanonicalIC();
    onProgress?.("run 1 of 2 — 2000 canonical steps");
    const run1 = await runCanonicalScratch(params, ic);
    onProgress?.("run 2 of 2 — 2000 canonical steps");
    const run2 = await runCanonicalScratch(params, ic);
    params.destroy();
    const [h1, h2] = await Promise.all([sha256hex(run1), sha256hex(run2)]);
    onProgress?.("scoring against the committed float64 reference");
    const canon = await fetchCanonicalFields();
    const declared = { relative: V.gate.declared.relative, absolute: V.gate.declared.absolute };
    const U = agreement(canon.U, run1, declared, 2, 0);
    const Vv = agreement(canon.V, run1, declared, 2, 1);
    return {
      hashes: [h1, h2],
      identical: h1 === h2,
      U,
      V: Vv,
      pass: U.pass && Vv.pass,
      seconds: (performance.now() - t0) / 1000,
    };
  }

  return { captureCanonical, runTwiceAndAgree };
}
