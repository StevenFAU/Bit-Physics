// 2D Ising (Metropolis) — Stack-B WebGPU web build (verification-visible
// demo, verification-demo-spec.md v0.2).
//
// Ships the committed ../../src/metropolis.wgsl (the SAME checkerboard
// parallel-Metropolis kernel the wgpu-native gate runs) through a Vite
// bundle — raised from a canvas + settings panel to an instrument: a live
// temperature slider spanning the transition, guided experiments, an
// external-field axis with a hysteresis tracer, a criticality panel
// (INTERACT); equation→code and closed-form-anchor panels (EXPLAIN); the
// observable gate re-run live on the visitor's GPU, a falsifiability probe,
// the measured-vs-Yang figure and the run-twice hash proof (PROVE); and an
// AA-nearest presentation shader with domain-wall emphasis, a flip-activity
// layer and an inspection lens (RENDER).
//
// Correctness gate (web-build track, observable): the WGSL RNG (in-shader
// PCG hash) differs from the NumPy reference's PCG64, so a spin-FIELD match
// would be fake. Instead the gate checks run-twice BYTE-IDENTICAL determinism
// + STATISTICAL equivalence of energy_per_spin to the NumPy reference
// ensemble (z < 3.0; the committed measurements live in the generated data
// spine, src/generated/verification.json). The seed-42 IC ships as
// ising-ic-seed42.bin so the browser reproduces the canonical protocol.
//
// HARD SEPARATION (spec § 6): the capture path reloads the canonical IC and
// sweeps ONLY with the canonical paramBuffer (stepCanonical); the T slider,
// experiments, h axis and brush drive liveParamBuffer / the live spin buffer
// only. The render stack (activity pass included) reads spins through
// read-only bindings and render targets; the gate reads buffer readbacks,
// never pixels.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { CaptureManifestLike } from "../../../../common/common-web/src/capture-export.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import {
  COLORMAPS,
  PACKED_FLOATS,
  emitColormapWgsl,
  getColormap,
  packColormap,
} from "../../../../common/common-web/src/colormap.js";

import computeWgsl from "../../src/metropolis.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";
import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";

const N = 128;
const CANONICAL_STEPS = 10000;
const CAPTURE_INTERVAL = 1000;
const PARAMS = { J: 1.0, h: 0.0, T: 2.27 };
// Onsager 1944 exact critical temperature, bound from the committed golden
// table via the data spine (gen-verification.mjs verifies it IS 2/ln(1+√2)).
const T_C = V.analytic.Tc;

// The data spine carries the committed canonical values verbatim; the compute
// constants above must agree with it. Drift means the generated file is stale
// (or the constants changed) — fail loudly at boot rather than display values
// the kernel is not running.
if (
  V.canonical.params.J !== PARAMS.J ||
  V.canonical.params.h !== PARAMS.h ||
  V.canonical.params.T !== PARAMS.T ||
  V.canonical.sweeps !== CANONICAL_STEPS ||
  V.canonical.capture_interval !== CAPTURE_INTERVAL ||
  V.canonical.grid[0] !== N ||
  Math.abs(T_C - 2 / Math.log(1 + Math.SQRT2)) > 1e-12
) {
  throw new Error("verification.json canonical values drifted from compute constants — rerun gen-verification.mjs");
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

// Per-sim presentation CSS (spec § 3): hand-rolled on the theme tokens; the
// shared theme.css surface is consumed, never edited. ig- namespace only.
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.ig-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.ig-row > label { color: var(--dim); min-width: 14px; flex: none; white-space: nowrap; }
.ig-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.ig-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 88px; flex: none; text-align: right; font-size: 10px; line-height: 1.3; }
.ig-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.ig-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.ig-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 0; cursor: pointer; }
.ig-ticks { position: relative; height: 11px; font-size: 9px; color: var(--faint); }
.ig-ticks span { position: absolute; top: 0; transform: translateX(-50%); cursor: pointer; white-space: nowrap; }
.ig-ticks span:hover { color: var(--accent); }
.ig-ticks span:last-child { transform: translateX(-100%); }
.ig-check { display: flex; align-items: center; gap: 7px; margin: 7px 0; color: var(--dim);
  font-size: 11.5px; cursor: pointer; }
.ig-check input { accent-color: var(--accent); margin: 0; }
.ig-details summary { cursor: pointer; color: var(--dim); font-size: 11px; }
.ig-details[open] summary { color: var(--txt); margin-bottom: 4px; }
.ig-eq { margin: 8px 0; }
.ig-eq-math { color: var(--txt); font-size: 12.5px; margin-bottom: 3px; }
.ig-eq-math small { color: var(--faint); font-size: 9.5px; margin-left: 6px; display: inline-block; }
.ig-code { display: block; font-size: 10px; color: var(--accent); background: rgba(0, 0, 0, .35);
  border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px;
  overflow-x: auto; white-space: pre; }
.ig-eq-link { font-size: 9.5px; color: var(--dim); text-decoration: none;
  border-bottom: 1px dotted var(--accent-d); }
.ig-eq-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
.ig-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-all; margin-top: 6px; }
.ig-hash b { color: var(--txt); font-weight: 500; }
.ig-hash .ok { color: var(--accent); }
.ig-hash .no { color: var(--bad); }
.ig-note-line { font-size: 10px; color: var(--warm); margin: 6px 0 2px; }
.ig-select { flex: 1; min-width: 0; font: inherit; font-size: 11.5px; color: var(--txt);
  background: rgba(0, 0, 0, .35); border: 1px solid var(--line); border-radius: 4px;
  padding: 2px 4px; outline: none; cursor: pointer; }
.ig-select:focus { border-color: var(--accent-d); }
.ig-chiprow { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
.ig-chip { font: inherit; font-size: 9.5px; color: var(--dim); background: rgba(0, 0, 0, .3);
  border: 1px solid var(--line); border-radius: 9px; padding: 1px 7px; cursor: pointer; }
.ig-chip:hover { color: var(--accent); border-color: var(--accent-d); }
.ig-chip[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }
.ig-chip:disabled { opacity: 0.6; cursor: default; }
.ig-map { margin: 8px 0 4px; }
.ig-map-cap { font-size: 10px; color: var(--dim); margin-bottom: 3px; cursor: help; }
.ig-map canvas { width: 100%; height: auto; display: block; background: rgba(0, 0, 0, .25);
  border: 1px solid var(--line); border-radius: 4px; }
.ig-diag-live { margin: 2px 0 0; }
`;
  document.head.appendChild(style);
}

async function fetchCanonicalIC(): Promise<Int32Array<ArrayBuffer>> {
  const res = await fetch(`${import.meta.env.BASE_URL}ising-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC asset fetch failed: ${res.status}`);
  const ic = new Int32Array(await res.arrayBuffer());
  if (ic.length !== N * N) throw new Error(`IC length ${ic.length} != ${N * N}`);
  return ic;
}

/** Deterministic exploratory ±1 IC for non-canonical seeds (display only). */
function exploratoryIC(seed: number): Int32Array<ArrayBuffer> {
  const out = new Int32Array(N * N);
  let s = (seed >>> 0) || 1;
  for (let i = 0; i < out.length; i += 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s & 0x80000000 ? 1 : -1;
  }
  return out;
}

function energyPerSpin(spins: Int32Array): number {
  let bonds = 0;
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const s = spins[j * N + i]!;
      const right = spins[j * N + ((i + 1) % N)]!;
      const down = spins[((j + 1) % N) * N + i]!;
      bonds += -PARAMS.J * s * (right + down);
    }
  }
  return bonds / (N * N);
}

function magnetization(spins: Int32Array): number {
  let sum = 0;
  for (let i = 0; i < spins.length; i += 1) sum += spins[i]!;
  return sum / spins.length;
}

/**
 * Same-spin nearest-neighbour cluster sizes (periodic BCs) via union-find —
 * the criticality panel's power-law histogram. 16 384 cells, display-only.
 */
function clusterSizes(spins: Int32Array): number[] {
  const cells = N * N;
  const parent = new Int32Array(cells);
  for (let i = 0; i < cells; i += 1) parent[i] = i;
  const find = (x: number): number => {
    let r = x;
    while (parent[r]! !== r) r = parent[r]!;
    while (parent[x]! !== r) {
      const nx = parent[x]!;
      parent[x] = r;
      x = nx;
    }
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const idx = j * N + i;
      const right = j * N + ((i + 1) % N);
      const down = ((j + 1) % N) * N + i;
      if (spins[idx] === spins[right]) union(idx, right);
      if (spins[idx] === spins[down]) union(idx, down);
    }
  }
  const counts = new Map<number, number>();
  for (let i = 0; i < cells; i += 1) {
    const r = find(i);
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return [...counts.values()];
}

async function main(): Promise<void> {
  injectStyles();
  let ctx;
  try {
    ctx = await createContext();
  } catch (e) {
    boot.textContent = `WebGPU unavailable: ${(e as Error).message}`;
    throw e;
  }
  const { device, queue } = ctx;

  // hiDPI backing store (spec § 3.4): CSS size × min(dpr, 2), sized once at
  // boot (deterministic under the headless driver, where dpr = 1)
  {
    const css = canvas.clientWidth || canvas.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(512, Math.round(css * dpr));
    canvas.width = px;
    canvas.height = px;
  }

  const bytes = N * N * 4;
  const bufUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const spinBuffer = device.createBuffer({ size: bytes, usage: bufUsage });
  // Render-owned snapshot of the spin buffer (spec § 3.4 activity layer):
  // refreshed by copyBufferToBuffer each live frame — a queue copy, not a
  // compute pass; sim state is read-only with respect to it.
  const snapBuffer = device.createBuffer({ size: bytes, usage: bufUsage, label: "spins-snapshot" });
  const uUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  // Capture-pinning split (binding rule P-4 § 0.5.3, pattern verbatim from
  // packages/physarum/web/src/main.ts): TWO param uniforms + two bind groups.
  // The capture re-run sweeps ONLY with the canonical paramBuffer (T 2.27,
  // seed 42); the RAF live loop sweeps ONLY with liveParamBuffer (active
  // temperature + field + panel seed). Disjoint call sites: stepCanonical in
  // captureCanonical's loop alone, stepLive in the RAF frame alone.
  const paramBuffer = device.createBuffer({ size: 32, usage: uUsage, label: "params-canonical" });
  const liveParamBuffer = device.createBuffer({ size: 32, usage: uUsage, label: "params-live" });

  const computeModule = device.createShaderModule({ code: computeWgsl, label: "ising" });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computePipeline = await device.createComputePipelineAsync({
    label: "ising",
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const makeComputeBG = (params: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: spinBuffer } },
      ],
    });
  const computeBG = makeComputeBG(paramBuffer);
  const computeBGLive = makeComputeBG(liveParamBuffer);

  // --- render stack v2 (presentation shader + shared colormap sampler) ------
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({
    code: renderWgsl + emitColormapWgsl({ stopsExpr: "rp.cmap", countExpr: "rp.cmap_meta.x", fnName: "cmap_sample" }),
    label: "ising-render",
  });

  // flip-activity ping-pong targets (r8unorm, render-owned; spec § 3.4)
  const activityTex = [0, 1].map((i) =>
    device.createTexture({
      label: `ising-activity-${i}`,
      size: [N, N],
      format: "r8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    }),
  );
  const activityViews = activityTex.map((t) => t.createView());

  const mainBGL = device.createBindGroupLayout({
    label: "ising-render-bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
    ],
  });
  const activityBGL = device.createBindGroupLayout({
    label: "ising-activity-bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
    ],
  });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "ising-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [mainBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const activityPipeline = await device.createRenderPipelineAsync({
    label: "ising-activity",
    layout: device.createPipelineLayout({ bindGroupLayouts: [activityBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_activity", targets: [{ format: "r8unorm" }] },
    primitive: { topology: "triangle-list" },
  });

  // RP = 12 base floats + one packed colormap block (8×vec4 + meta)
  const RP_FLOATS = 12 + PACKED_FLOATS;
  const renderUniform = device.createBuffer({ size: RP_FLOATS * 4, usage: uUsage, label: "ising-render-uniform" });
  const activityUniform = device.createBuffer({ size: 16, usage: uUsage, label: "ising-activity-uniform" });
  const ACTIVITY_DECAY = 0.94;
  queue.writeBuffer(activityUniform, 0, new Float32Array([N, ACTIVITY_DECAY, 0, 0]));

  // display look state (spec § 3.4) — presentation-only
  let colormapName = "aurora";
  let rawGrid = false;
  let boundaryGain = 0.45;
  let activityGain = 0.3;
  let exposure = 1.4;
  const LENS_MODES = ["off", "magnify — raw bits", "checkerboard parity"] as const;
  let lensMode = 0;
  let lensPos = { x: -1e4, y: -1e4 };
  const lensZoom = 6;
  let cmapPacked = packColormap(getColormap(colormapName));

  const rpData = new Float32Array(RP_FLOATS);
  function writeRenderUniform(): void {
    rpData[0] = N;
    rpData[1] = rawGrid ? 1 : 0;
    rpData[2] = boundaryGain;
    rpData[3] = activityGain;
    rpData[4] = lensPos.x;
    rpData[5] = lensPos.y;
    rpData[6] = lensMode > 0 ? canvas.width * 0.16 : 0;
    rpData[7] = lensZoom;
    rpData[8] = lensMode;
    rpData[9] = canvas.width;
    rpData[10] = canvas.height;
    rpData[11] = exposure;
    rpData.set(cmapPacked, 12);
    queue.writeBuffer(renderUniform, 0, rpData);
  }
  writeRenderUniform();

  const mainBGs = [0, 1].map((i) =>
    device.createBindGroup({
      layout: mainBGL,
      entries: [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: spinBuffer } },
        { binding: 2, resource: activityViews[i]! },
      ],
    }),
  );
  const activityBGs = [0, 1].map((i) =>
    device.createBindGroup({
      layout: activityBGL,
      entries: [
        { binding: 0, resource: { buffer: activityUniform } },
        { binding: 1, resource: { buffer: spinBuffer } },
        { binding: 2, resource: { buffer: snapBuffer } },
        { binding: 3, resource: activityViews[i]! },
      ],
    }),
  );
  let actIdx = 0; // activityTex[actIdx] holds the latest activity

  // Named temperature regimes (house § 5.3, ruling D-P1.2(a)) — now jump-to
  // bookmarks on the live T axis (spec § 3.1); the slider is primary.
  interface TempRegime {
    label: string;
    title: string;
    T: number;
  }
  const REGIMES: readonly TempRegime[] = [
    {
      label: "sub-critical",
      title: "T 1.5 < T_c 2.269 — ordered phase: domains coarsen toward spontaneous magnetization",
      T: 1.5,
    },
    {
      label: "critical",
      title: "T 2.27 ≈ T_c 2.269 (Onsager 1944: 2/ln(1+√2)) — the capture regime: fluctuations at all scales",
      T: PARAMS.T,
    },
    {
      label: "super-critical",
      title: "T 3.5 > T_c 2.269 — disordered paramagnet: short-range flicker, M ≈ 0",
      T: 3.5,
    },
  ];

  // Live-loop parameters (spec § 3.1): the T slider, experiments and the h
  // axis write THIS record and nothing else; the canonical PARAMS object
  // stays frozen for the capture path.
  const live = { T: PARAMS.T, h: 0.0 };
  let stepsPerFrame = 4;

  let step = 0;
  const wg = Math.ceil(N / 8);

  function sweepWith(params: GPUBuffer, bg: GPUBindGroup, T: number, seed: number, h: number): void {
    step += 1;
    for (let color = 0; color < 2; color += 1) {
      const buf = new ArrayBuffer(32);
      const dv = new DataView(buf);
      dv.setUint32(0, N, true);
      dv.setUint32(4, step, true);
      dv.setUint32(8, color, true);
      dv.setUint32(12, seed, true);
      dv.setFloat32(16, PARAMS.J, true);
      dv.setFloat32(20, h, true);
      dv.setFloat32(24, T, true);
      dv.setFloat32(28, 0, true);
      queue.writeBuffer(params, 0, buf);
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.end();
      queue.submit([enc.finish()]);
    }
  }
  const stepCanonical = (): void => sweepWith(paramBuffer, computeBG, PARAMS.T, 42, PARAMS.h);
  const stepLive = (): void =>
    sweepWith(liveParamBuffer, computeBGLive, live.T, panel.getState().seed, live.h);

  async function readSpins(): Promise<Int32Array<ArrayBuffer>> {
    const rb = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(spinBuffer, 0, rb, 0, bytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Int32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function loadIC(seed: number): Promise<void> {
    const ic = seed === 42 ? await fetchCanonicalIC() : exploratoryIC(seed);
    queue.writeBuffer(spinBuffer, 0, ic);
    queue.writeBuffer(snapBuffer, 0, ic); // no stale activity flash
    step = 0;
  }

  // Pinned by construction: reloads the canonical seed-42 IC, then sweeps
  // ONLY via stepCanonical (canonical paramBuffer, T 2.27, seed 42) — slider,
  // experiment and cursor state cannot reach it; frame() early-returns while
  // capturing. Manifest metadata is sourced from the committed data spine
  // (spec § 4.2): the REAL payload checksum (the placeholder zeros were a
  // false statement about an artifact this path names) and the committed
  // bit-exact-same-hw determinism claim.
  async function captureCanonical(): Promise<void> {
    panel.setStatus("equilibrating… (10000 sweeps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    queue.writeBuffer(spinBuffer, 0, await fetchCanonicalIC());
    step = 0;
    for (let s = 0; s < CANONICAL_STEPS; s += 1) stepCanonical();
    const spins = await readSpins();
    const f64 = new Float64Array(N * N);
    for (let i = 0; i < f64.length; i += 1) f64[i] = spins[i]!;
    const E = energyPerSpin(spins);
    const M = magnetization(spins);
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "ising-classical", category: "lattice-spin", variant: "metropolis" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "reference", dims: [N, N], dtype: "f64", seed: 42, params: PARAMS },
          run: { step_count: CANONICAL_STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: {
            format: "hdf5",
            path: `${V.canonical.descriptor}.h5`,
            checksum: V.canonical.payload_sha256,
          },
          determinism: {
            claimed: V.determinism.claimed as CaptureManifestLike["determinism"]["claimed"],
            atomic_ops: false,
            subgroup_ops: false,
          },
        },
        steps: [
          { step: CANONICAL_STEPS, state: { spins: field(f64, [N, N], "f64") }, diagnostics: { energy_per_spin: E, magnetization: M } },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — E/N=${E.toFixed(4)}, M=${M.toFixed(4)}`);
    panel.setCaptureEnabled(true);
    await loadIC(panel.getState().seed);
  }

  // Study = pause stepping, keep presenting (P-4 rule 0.5.3): the only state
  // mutation is the Metropolis compute dispatch inside sweepWith(); the
  // render stack reads the spin lattice through read-only bindings and
  // dispatches no compute (D-P1.2(b)); the activity pass is skipped while
  // suspended so the frozen field reads frozen.
  let suspended = false;

  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const spins = await readSpins();
    if (seq !== diagSeq) return;
    const E = energyPerSpin(spins);
    const M = magnetization(spins);
    panel.setDiagnostics([
      { label: "live regime", value: regimeLabel() },
      { label: "lattice", value: `${N} × ${N}` },
      { label: "live sweep", value: String(step) },
      { label: "T", value: live.T.toFixed(3) },
      { label: "T / T_c", value: (live.T / T_C).toFixed(3) },
      { label: "T_c (Onsager)", value: `${T_C.toFixed(4)} = ${V.analytic.Tc_formula}` },
      { label: "J / h", value: `${PARAMS.J} / ${live.h.toFixed(3)}` },
      { label: "E per spin", value: E.toFixed(4) },
      { label: "M", value: M.toFixed(4) },
      { label: "|M|", value: Math.abs(M).toFixed(4) },
      { label: "capture pinned to", value: `T ${PARAMS.T}, h 0, seed 42` },
    ]);
  }

  function regimeLabel(): string {
    const r = REGIMES.find((x) => Math.abs(x.T - live.T) < 1e-9);
    if (r) return r.label;
    if (Math.abs(live.T - T_C) < 5e-4) return "critical (T_c exact)";
    return live.T < T_C ? "sub-critical (custom T)" : "super-critical (custom T)";
  }

  // Cursor-as-spin-flip (house § 5.1, ruling D-P1.2(a)): the pointer paints a
  // ±1 disk into the live lattice through the SAME queue.writeBuffer path
  // loadIC uses; the committed Metropolis dynamics then evolve the droplet.
  // No new compute-side buffer or pass (P-4 rule 0.5.4). LIVE LOOP ONLY.
  let brushRadius = 6; // cells
  let brushSign: 1 | -1 = 1;
  let flipCell: { x: number; y: number } | null = null;
  function pointerToCell(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    // render.wgsl maps framebuffer px -> spins[j*N + i] with i = x/res*N,
    // j = y/res*N (screen top = lattice row 0)
    return { x: Math.floor(u * N), y: Math.floor(v * N) };
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    flipCell = pointerToCell(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (flipCell) flipCell = pointerToCell(e);
    // inspection lens follows the pointer (render-side only)
    const rect = canvas.getBoundingClientRect();
    lensPos = {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
    if (lensMode > 0) writeRenderUniform();
  });
  canvas.addEventListener("pointerleave", () => {
    lensPos = { x: -1e4, y: -1e4 };
    if (lensMode > 0) writeRenderUniform();
  });
  const endFlip = (): void => {
    flipCell = null;
  };
  canvas.addEventListener("pointerup", endFlip);
  canvas.addEventListener("pointercancel", endFlip);
  function injectCursorSpins(): void {
    if (!flipCell) return;
    for (let dj = -brushRadius; dj <= brushRadius; dj += 1) {
      const j = flipCell.y + dj;
      if (j < 0 || j >= N) continue;
      const half = Math.floor(Math.sqrt(brushRadius * brushRadius - dj * dj));
      const i0 = Math.max(0, flipCell.x - half);
      const i1 = Math.min(N - 1, flipCell.x + half);
      if (i1 < i0) continue;
      const span = new Int32Array(i1 - i0 + 1).fill(brushSign);
      queue.writeBuffer(spinBuffer, (j * N + i0) * 4, span);
    }
  }

  // ---------------------------------------------------------------- panel --
  const panel = createSettingsPanel("2D Ising — Metropolis", {
    caption: "Lattice spins at T = 2.27 — the critical point, where fluctuations live at every scale. Checkerboard Monte Carlo, statistics verified against a CPU ensemble.",
    initial: { tier: "reference", seed: 42 },
    onCapture: captureCanonical,
    onChange: (st) => { void loadIC(st.seed); },
    presets: REGIMES.map((r) => ({
      label: r.label,
      title: r.title,
      apply: () => { setT(r.T); },
    })),
    modes: {
      initial: "play",
      onMode: (m) => {
        suspended = m === "study";
        if (suspended) void measureStudyDiagnostics();
      },
    },
    study: {
      diagnostics: [{ label: "diagnostics", value: "measuring…" }],
      honesty: {
        faithful:
          "the committed metropolis.wgsl — the exact checkerboard parallel-Metropolis kernel the wgpu-native gate runs (two colour dispatches per sweep, detailed balance preserved on the bipartite lattice); J 1, canonical T 2.27 ≈ T_c, h 0; seed-42 IC asset; every displayed frame is real sweeps",
        simplified:
          "the in-shader PCG hash RNG differs from the NumPy reference's PCG64, so a spin-field match would be fake — the gate is run-twice determinism + statistical equivalence of energy_per_spin to the reference ensemble (re-run it live in the PROVE panel); the T slider, experiments, h axis and brush drive the live loop only — the capture reloads the seed-42 IC and re-runs the canonical T 2.27, h 0 protocol; the display (AA-nearest sampling, domain-wall emphasis, flip-activity layer, lens, colormaps) is render-side presentation over the unmodified spin buffer — the raw-grid toggle shows the exact texels",
        measured:
          "energy per spin, magnetization, χ, C and cluster sizes — read back from the live lattice ~1.4×/s in Play and on entering Study (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate:
          `observable + run-twice (two runs byte-identical; energy_per_spin z < ${V.gate.z_threshold} vs the ` +
          `${V.gate.n_seeds}-seed NumPy reference ensemble — recorded browser z = ${V.gate.recorded_browser.z}, ` +
          "re-runnable live in the PROVE panel)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        { label: "sim spec", href: blobUrl(V.links.spec) },
        { label: "audit ledger", href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits" },
      ],
    },
  });
  panel.setActivePreset("critical");

  // ---------------------- shared slider/select builders (rd2d idiom) -------
  interface SliderHandle {
    input: HTMLInputElement;
    val: HTMLSpanElement;
    fmt: (v: number) => string;
  }
  function addSlider(
    group: HTMLElement,
    label: string,
    min: number,
    max: number,
    stepSize: number,
    value: number,
    fmt: (v: number) => string,
    onSet: (v: number) => void,
    ticks?: { v: number; label: string; title: string }[],
  ): SliderHandle {
    const row = document.createElement("div");
    row.className = "ig-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const box = document.createElement("div");
    box.className = "ig-slider-box";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "ig-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(stepSize);
    input.value = String(value);
    const val = document.createElement("span");
    val.className = "ig-val";
    val.textContent = fmt(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = fmt(v);
      onSet(v);
    });
    box.appendChild(input);
    if (ticks) {
      const tickRow = document.createElement("div");
      tickRow.className = "ig-ticks";
      for (const t of ticks) {
        const s = document.createElement("span");
        s.textContent = t.label;
        s.title = t.title;
        s.style.left = `${((t.v - min) / (max - min)) * 100}%`;
        s.addEventListener("click", () => {
          input.value = String(t.v);
          val.textContent = fmt(t.v);
          onSet(t.v);
        });
        tickRow.appendChild(s);
      }
      box.appendChild(tickRow);
    }
    row.append(lab, box, val);
    group.appendChild(row);
    return { input, val, fmt };
  }
  function addSelect(
    group: HTMLElement,
    label: string,
    options: readonly string[],
    value: string,
    onSet: (v: string) => void,
  ): HTMLSelectElement {
    const row = document.createElement("div");
    row.className = "ig-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    sel.className = "ig-select";
    for (const o of options) {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener("change", () => { onSet(sel.value); });
    row.append(lab, sel);
    group.appendChild(row);
    return sel;
  }
  function makeChip(label: string, title: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ig-chip";
    b.textContent = label;
    b.title = title;
    return b;
  }

  // -------------------- INTERACT: temperature (spec § 3.1, primary axis) ---
  const tGroup = panel.addGroup("temperature — sweep the transition");
  const T_MIN = 0.5;
  const T_MAX = 5.0;
  const fmtT = (v: number): string => `${v.toFixed(3)} · T/T_c ${(v / T_C).toFixed(3)}`;

  // slow-cool ramp state (guided experiment) — cancelled by any manual set
  let ramp: { from: number; to: number; t0: number; ms: number } | null = null;

  // rolling χ/C window — reset whenever the physics axis moves
  let statsWindow: { m: number; e: number }[] = [];

  function setT(T: number, fromRamp = false): void {
    if (!fromRamp) ramp = null;
    live.T = Math.min(T_MAX, Math.max(T_MIN, T));
    statsWindow = [];
    tSlider.input.value = String(live.T);
    tSlider.val.textContent = fmtT(live.T);
    const r = REGIMES.find((x) => Math.abs(x.T - live.T) < 1e-9);
    panel.setActivePreset(r ? r.label : null);
    if (!fromRamp) {
      panel.setStatus(
        Math.abs(live.T - PARAMS.T) < 1e-9
          ? "live lattice: critical — the capture regime"
          : `live lattice: ${regimeLabel()} (T ${live.T.toFixed(3)}) — capture stays pinned to T 2.27, h 0, seed 42`,
      );
    }
    if (suspended) void measureStudyDiagnostics();
  }
  const tSlider = addSlider(
    tGroup,
    "T",
    T_MIN,
    T_MAX,
    0.005,
    live.T,
    fmtT,
    (v) => { setT(v); },
    [
      { v: 1.5, label: "1.5", title: "sub-critical bookmark — ordered phase" },
      { v: T_C, label: "T_c", title: `Onsager 1944: T_c = ${V.analytic.Tc_formula} = ${T_C.toFixed(7)}…` },
      { v: 3.5, label: "3.5", title: "super-critical bookmark — disordered paramagnet" },
    ],
  );
  addSlider(tGroup, "speed", 1, 16, 1, stepsPerFrame, (v) => `${v}×`, (v) => {
    stepsPerFrame = Math.round(v);
  });

  // guided experiments (spec § 3.1): protocols as presets, not prose
  const expRow = document.createElement("div");
  expRow.className = "ig-chiprow";
  const coolChip = makeChip(
    "slow cool 3.5 → 1.5",
    "Reload a hot lattice, then ramp T down through T_c over 20 s — watch symmetry break as domains nucleate and compete.",
  );
  const quenchChip = makeChip(
    "quench T ∞ → 1.5",
    "Reload a random (infinite-T) lattice and drop straight to T 1.5 — domain coarsening: walls straighten and domains grow (the L(t) ~ t^1/2 growth law).",
  );
  const critChip = makeChip(
    "sit at T_c",
    "Set T to Onsager's exact critical temperature — scale-free fluctuations; watch the activity layer seethe (critical slowing down, live).",
  );
  expRow.append(coolChip, quenchChip, critChip);
  tGroup.appendChild(expRow);
  coolChip.addEventListener("click", () => {
    void loadIC(panel.getState().seed).then(() => {
      setT(3.5);
      ramp = { from: 3.5, to: 1.5, t0: performance.now(), ms: 20000 };
      panel.setStatus("slow cool: T 3.5 → 1.5 over 20 s — symmetry breaks as you cross T_c");
    });
  });
  quenchChip.addEventListener("click", () => {
    void loadIC(panel.getState().seed).then(() => {
      setT(1.5);
      panel.setStatus("quenched: random (T ∞) lattice dropped to T 1.5 — domains coarsen, L(t) ~ t^1/2");
    });
  });
  critChip.addEventListener("click", () => {
    setT(T_C);
    panel.setStatus(`sitting at T_c = ${T_C.toFixed(7)}… — scale-free fluctuations; the activity layer is the acceptance-rate map`);
  });

  // -------------------- INTERACT: external field h (spec § 3.1, KEEP) ------
  const hGroup = panel.addGroup("external field — break the symmetry");
  let hDrive = false;
  let hPhase = 0;
  const H_DRIVE_AMP = 0.35;
  const H_DRIVE_PERIOD_S = 24;
  function setH(h: number): void {
    live.h = Math.min(0.5, Math.max(-0.5, h));
    statsWindow = [];
    hSlider.input.value = String(live.h);
    hSlider.val.textContent = hSlider.fmt(live.h);
    if (suspended) void measureStudyDiagnostics();
  }
  const hSlider = addSlider(hGroup, "h", -0.5, 0.5, 0.005, live.h, (v) => v.toFixed(3), (v) => {
    hDrive = false;
    driveBox.checked = false;
    setH(v);
  }, [{ v: 0, label: "0", title: "the canonical protocol — capture stays pinned here" }]);
  const driveRow = document.createElement("label");
  driveRow.className = "ig-check";
  const driveBox = document.createElement("input");
  driveBox.type = "checkbox";
  const driveText = document.createElement("span");
  driveText.textContent = `drive h(t) = ${H_DRIVE_AMP} · sin(2πt/${H_DRIVE_PERIOD_S}s) — trace the M–H loop`;
  driveRow.title =
    "A slow sinusoidal field sweep. Below T_c the M–H trace opens into a hysteresis loop (metastability + domain-wall pinning); above T_c it collapses to a single curve. Live loop only.";
  driveRow.append(driveBox, driveText);
  hGroup.appendChild(driveRow);
  driveBox.addEventListener("change", () => {
    hDrive = driveBox.checked;
    if (!hDrive) setH(0);
  });

  // M–H loop tracer (canvas-2D, fed by the shared readback loop)
  const hystWrap = document.createElement("div");
  hystWrap.className = "ig-map";
  const hystCap = document.createElement("div");
  hystCap.className = "ig-map-cap";
  hystCap.textContent = "M–H trace — hysteresis below T_c, single-valued above";
  hystCap.title = "m vs h from the live readback samples. Kinetic hysteresis at fixed sweep rate — the loop area is rate-dependent (a first-anywhere browser-Ising figure, per the spec § 2.2 survey).";
  const hystCanvas = document.createElement("canvas");
  const HYST_W = 240;
  const HYST_H = 150;
  {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    hystCanvas.width = HYST_W * dpr;
    hystCanvas.height = HYST_H * dpr;
    hystCanvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  hystWrap.append(hystCap, hystCanvas);
  hGroup.appendChild(hystWrap);
  const hystTrail: { h: number; m: number }[] = [];
  function drawHyst(): void {
    const c = hystCanvas.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, HYST_W, HYST_H);
    const X = (h: number): number => HYST_W / 2 + (h / 0.5) * (HYST_W / 2 - 10);
    const Y = (m: number): number => HYST_H / 2 - m * (HYST_H / 2 - 10);
    c.strokeStyle = "rgba(255,255,255,0.14)";
    c.beginPath();
    c.moveTo(X(-0.5), Y(0));
    c.lineTo(X(0.5), Y(0));
    c.moveTo(X(0), Y(-1));
    c.lineTo(X(0), Y(1));
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.font = "8.5px system-ui, sans-serif";
    c.fillText("h", HYST_W - 12, Y(0) - 4);
    c.fillText("m", X(0) + 4, 10);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4dd8c0";
    for (let i = 0; i < hystTrail.length; i += 1) {
      const p = hystTrail[i]!;
      c.globalAlpha = 0.15 + 0.85 * (i / hystTrail.length);
      c.fillStyle = accent;
      c.beginPath();
      c.arc(X(p.h), Y(p.m), 1.6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  drawHyst();
  const hNote = document.createElement("div");
  hNote.className = "ig-note-line";
  hNote.textContent = "capture stays pinned to h = 0 — this axis is live-view only";
  hGroup.appendChild(hNote);

  // -------------------- INTERACT: brush (spec § 3.1) -----------------------
  const brushGroup = panel.addGroup("brush — paint domains");
  const brushChips = document.createElement("div");
  brushChips.className = "ig-chiprow";
  const upChip = makeChip("paint +1", "Paint a disk of up spins — seed a domain and watch surface tension act on it.");
  const dnChip = makeChip("paint −1", "Paint a disk of down spins.");
  const clearChip = makeChip("clear field", "Reload the initial condition for the current seed.");
  brushChips.append(upChip, dnChip, clearChip);
  brushGroup.appendChild(brushChips);
  const syncBrush = (): void => {
    upChip.setAttribute("aria-pressed", String(brushSign === 1));
    dnChip.setAttribute("aria-pressed", String(brushSign === -1));
  };
  syncBrush();
  upChip.addEventListener("click", () => { brushSign = 1; syncBrush(); });
  dnChip.addEventListener("click", () => { brushSign = -1; syncBrush(); });
  clearChip.addEventListener("click", () => {
    void loadIC(panel.getState().seed);
    panel.setStatus("field cleared — reloaded the IC");
  });
  addSlider(brushGroup, "radius", 1, 16, 1, brushRadius, (v) => `${v} px`, (v) => {
    brushRadius = Math.round(v);
  });
  const brushNote = document.createElement("div");
  brushNote.className = "ig-note-line";
  brushNote.textContent = "try: paint a droplet at T 1.5 — below T_c it shrinks under surface tension";
  brushGroup.appendChild(brushNote);

  // -------------------- always-on observables (spec § 3.1, measured) -------
  const obsGroup = panel.addGroup("observables — measured live");
  const obsDl = document.createElement("dl");
  obsDl.className = "bps-diag ig-diag-live";
  obsGroup.appendChild(obsDl);
  let attemptsPerSec = 0;
  function updateObs(E: number, M: number): void {
    obsDl.textContent = "";
    const rows: [string, string][] = [
      ["T · T/T_c", `${live.T.toFixed(3)} · ${(live.T / T_C).toFixed(3)}`],
      ["E per spin", E.toFixed(4)],
      ["m · |m|", `${M.toFixed(4)} · ${Math.abs(M).toFixed(4)}`],
      ["live sweep", String(step)],
      ["Metropolis attempts/s", `${(attemptsPerSec / 1e6).toFixed(1)} M`],
    ];
    for (const [k, v] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      obsDl.append(dt, dd);
    }
  }
  const obsNote = document.createElement("div");
  obsNote.className = "ig-note-line";
  obsNote.textContent = "the same E/N and m the capture exports — read back from the live lattice, not estimated";
  obsGroup.appendChild(obsNote);

  // -------------------- criticality panel (spec § 3.1, KEEP) ---------------
  const critGroup = panel.addGroup("criticality — χ, C, clusters");
  const critDl = document.createElement("dl");
  critDl.className = "bps-diag ig-diag-live";
  critGroup.appendChild(critDl);
  const clusterWrap = document.createElement("div");
  clusterWrap.className = "ig-map";
  const clusterCap = document.createElement("div");
  clusterCap.className = "ig-map-cap";
  clusterCap.textContent = "cluster-size histogram (log-log) — power law at T_c";
  clusterCap.title =
    "Same-spin nearest-neighbour clusters from the live readback (union-find, periodic BCs). At T_c the distribution goes scale-free — the geometric face of criticality.";
  const clusterCanvas = document.createElement("canvas");
  const CL_W = 240;
  const CL_H = 110;
  {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    clusterCanvas.width = CL_W * dpr;
    clusterCanvas.height = CL_H * dpr;
    clusterCanvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  clusterWrap.append(clusterCap, clusterCanvas);
  critGroup.appendChild(clusterWrap);
  const critNote = document.createElement("div");
  critNote.className = "ig-note-line";
  critNote.textContent = "χ = N(⟨m²⟩−⟨|m|⟩²)/T, C = N(⟨e²⟩−⟨e⟩²)/T² over a rolling window — both peak near T_c (finite-size)";
  critGroup.appendChild(critNote);

  function updateCriticality(): void {
    critDl.textContent = "";
    const rows: [string, string][] = [];
    if (statsWindow.length >= 8) {
      const n = statsWindow.length;
      let mAbs = 0;
      let m2 = 0;
      let e1 = 0;
      let e2 = 0;
      for (const s of statsWindow) {
        mAbs += Math.abs(s.m);
        m2 += s.m * s.m;
        e1 += s.e;
        e2 += s.e * s.e;
      }
      mAbs /= n;
      m2 /= n;
      e1 /= n;
      e2 /= n;
      const chi = (N * N * Math.max(0, m2 - mAbs * mAbs)) / live.T;
      const cv = (N * N * Math.max(0, e2 - e1 * e1)) / (live.T * live.T);
      rows.push(["χ (susceptibility)", chi.toFixed(2)], ["C (specific heat)", cv.toFixed(2)], ["window", `${n} samples @ T ${live.T.toFixed(3)}`]);
    } else {
      rows.push(["χ / C", `accumulating… (${statsWindow.length}/8 samples at this T)`]);
    }
    for (const [k, v] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      critDl.append(dt, dd);
    }
  }
  updateCriticality();

  function drawClusters(sizes: number[]): void {
    const c = clusterCanvas.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, CL_W, CL_H);
    // log2 size bins → log10 counts
    const bins = new Array<number>(15).fill(0);
    for (const s of sizes) {
      const b = Math.min(14, Math.floor(Math.log2(s)));
      bins[b]! += 1;
    }
    const maxLog = Math.log10(Math.max(2, ...bins) + 1);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4dd8c0";
    const bw = (CL_W - 30) / bins.length;
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.font = "8.5px system-ui, sans-serif";
    c.fillText("count", 2, 10);
    c.fillText("size 1", 24, CL_H - 2);
    c.textAlign = "right";
    c.fillText("16k", CL_W - 4, CL_H - 2);
    c.textAlign = "left";
    for (let b = 0; b < bins.length; b += 1) {
      const h = bins[b]! > 0 ? (Math.log10(bins[b]! + 1) / maxLog) * (CL_H - 24) : 0;
      c.fillStyle = accent;
      c.globalAlpha = 0.75;
      c.fillRect(26 + b * bw, CL_H - 12 - h, Math.max(2, bw - 2), h);
    }
    c.globalAlpha = 1;
  }

  // -------------------- RENDER controls (spec § 3.4) -----------------------
  const displayGroup = panel.addGroup("display");
  addSelect(displayGroup, "map", COLORMAPS.map((c) => c.name), colormapName, (v) => {
    colormapName = v;
    cmapPacked = packColormap(getColormap(v));
    writeRenderUniform();
  });
  addSlider(displayGroup, "walls", 0, 1, 0.01, boundaryGain, (v) => v.toFixed(2), (v) => {
    boundaryGain = v;
    writeRenderUniform();
  });
  addSlider(displayGroup, "activity", 0, 1, 0.01, activityGain, (v) => v.toFixed(2), (v) => {
    activityGain = v;
    writeRenderUniform();
  });
  addSlider(displayGroup, "exposure", 0.3, 3, 0.01, exposure, (v) => v.toFixed(2), (v) => {
    exposure = v;
    writeRenderUniform();
  });
  addSelect(displayGroup, "lens", LENS_MODES, LENS_MODES[0], (v) => {
    lensMode = Math.max(0, LENS_MODES.indexOf(v as (typeof LENS_MODES)[number]));
    writeRenderUniform();
  });
  const rawRow = document.createElement("label");
  rawRow.className = "ig-check";
  const rawInput = document.createElement("input");
  rawInput.type = "checkbox";
  const rawText = document.createElement("span");
  rawText.textContent = "raw grid — what the buffer actually holds";
  rawRow.title =
    "Plain nearest-cell texels, wall emphasis and activity bypassed: the honest 128² view. The default view antialiases only the texel edges — the data is never smoothed.";
  rawRow.append(rawInput, rawText);
  displayGroup.appendChild(rawRow);
  rawInput.addEventListener("change", () => {
    rawGrid = rawInput.checked;
    writeRenderUniform();
  });
  const dispNote = document.createElement("div");
  dispNote.className = "ig-note-line";
  dispNote.textContent =
    "every glow is a physical quantity: walls = domain boundaries · activity = spins flipped this frame, decaying — frozen below T_c, seething at T_c";
  displayGroup.appendChild(dispNote);

  // -------------------- EXPLAIN + PROVE layers (spec §§ 3.2–3.3) -----------
  installExplainPanel(panel);
  const verifyHandle = installVerifyPanel({
    panel,
    device,
    queue,
    computeModule,
    n: N,
    bytes,
    fetchCanonicalIC,
    exploratoryIC,
    energyPerSpin,
    magnetization,
  });

  // -------------------- shared low-rate readback loop (spec § 3.1) ---------
  // One measurement feeds the always-on observables, the χ/C window, the
  // cluster histogram, the M–H trail and the Yang figure's live samples.
  let readTick = 0;
  window.setInterval(() => {
    if (isCapturing() || suspended) return;
    const seq = ++diagSeq;
    void readSpins().then((spins) => {
      if (seq !== diagSeq) return;
      readTick += 1;
      const E = energyPerSpin(spins);
      const M = magnetization(spins);
      updateObs(E, M);
      statsWindow.push({ m: M, e: E });
      if (statsWindow.length > 60) statsWindow.shift();
      updateCriticality();
      verifyHandle.pushLiveSample(live.T, Math.abs(M));
      if (hDrive || Math.abs(live.h) > 1e-9 || hystTrail.length > 0) {
        hystTrail.push({ h: live.h, m: M });
        if (hystTrail.length > 240) hystTrail.shift();
        drawHyst();
      }
      if (readTick % 3 === 0) drawClusters(clusterSizes(spins));
    });
  }, 700);

  await loadIC(42);
  boot.textContent = "";

  // -------------------- frame loop ------------------------------------------
  let lastT = performance.now();
  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;

    if (!suspended) {
      // guided-experiment ramp (slow cool) — live axis only
      if (ramp) {
        const f = Math.min(1, (now - ramp.t0) / ramp.ms);
        setT(ramp.from + (ramp.to - ramp.from) * f, true);
        if (f >= 1) ramp = null;
      }
      // sinusoidal h drive (hysteresis tracer) — live axis only
      if (hDrive) {
        hPhase += dt / H_DRIVE_PERIOD_S;
        live.h = H_DRIVE_AMP * Math.sin(2 * Math.PI * hPhase);
        hSlider.input.value = String(live.h);
        hSlider.val.textContent = hSlider.fmt(live.h);
      }
      injectCursorSpins();
      for (let i = 0; i < stepsPerFrame; i += 1) stepLive();
      attemptsPerSec = attemptsPerSec * 0.9 + (stepsPerFrame * N * N * (dt > 0 ? 1 / dt : 60)) * 0.1;

      // flip-activity update: render pass into the ping-pong target reading
      // the previous activity + the render-owned snapshot, THEN refresh the
      // snapshot (same encoder — command order guarantees the pass reads the
      // pre-copy snapshot). No compute pass (spec § 6).
      const next = 1 - actIdx;
      const enc = device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          { view: activityViews[next]!, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } },
        ],
      });
      pass.setPipeline(activityPipeline);
      pass.setBindGroup(0, activityBGs[actIdx]!);
      pass.draw(3);
      pass.end();
      enc.copyBufferToBuffer(spinBuffer, 0, snapBuffer, 0, bytes);
      queue.submit([enc.finish()]);
      actIdx = next;
    }

    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, mainBGs[actIdx]!);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
