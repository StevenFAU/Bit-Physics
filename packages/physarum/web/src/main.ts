// Physarum transport network (Jones 2010) — Stack-B WebGPU web build.
//
// Ships the committed ../../src/physarum.wgsl (the SAME 3-pass kernel the
// wgpu-native gate runs): agents (sense/rotate/move + integer-atomic deposit),
// apply (deposit -> trail), diffuse (box-blur + decay). This build wraps that
// kernel in the verification-visible instrument (verification-demo-spec v0.2):
//   INTERACT — a template gallery (morphology regimes + food-seeded science
//              scenarios with a client-side MST-optimum overlay), live sliders,
//              coupled-grid swarm scaling toward ~1M agents, shareable URLs.
//   EXPLAIN  — the Jones update next to the committed WGSL (src/explain.ts).
//   PROVE    — the live mass-conservation gate, the run-twice + integer-atomics
//              honesty proof, the falsifiability probe (src/verify-panel.ts).
//   RENDER   — bilinear concentration colormap + gradient-lit relief + the
//              deposit-channel flow layer + inspection lens (src/render.wgsl).
//
// Correctness gate (web-build track, new-canonical): the trail deposit is the
// sim's atomic op — done as INTEGER fixed-point atomicAdd<u32> (order-
// independent -> run-twice BYTE-IDENTICAL). The gate is determinism + the EXACT
// mass-balance invariant (total_mass = deposit*N*(1-a)/a = 22500). The capture
// path (reset/stepCanonical/captureCanonical) is pinned to the committed
// seed-42 IC + canonical params and is never touched by the live controls.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import {
  COLORMAPS,
  PACKED_FLOATS,
  emitColormapWgsl,
  getColormap,
  packColormap,
} from "../../../../common/common-web/src/colormap.js";

import computeWgsl from "../../src/physarum.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";
import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";

const W = 256;
const H = 256;
const NA = 500;
const STEPS = 5000;
const CAPTURE_INTERVAL = 500;
const PARAMS = { delta_phi_deg: 45.0, L_sense: 9.0, L_move: 1.0, deposit: 5.0, decay_alpha: 0.1 };

// The data spine carries the committed canonical values verbatim; the compute
// constants above must agree with it. Drift means the generated file is stale.
if (
  V.canonical.grid[0] !== W ||
  V.canonical.grid[1] !== H ||
  V.canonical.n_agents !== NA ||
  V.canonical.steps !== STEPS ||
  V.canonical.params.deposit !== PARAMS.deposit ||
  V.canonical.params.decay_alpha !== PARAMS.decay_alpha ||
  V.mass_equilibrium.canonical_value !== (PARAMS.deposit * NA * (1 - PARAMS.decay_alpha)) / PARAMS.decay_alpha
) {
  throw new Error("verification.json drifted from the compute constants — rerun gen-verification.mjs");
}

interface LiveParams {
  delta_phi_deg: number;
  L_sense: number;
  L_move: number;
  deposit: number;
  decay_alpha: number;
}

// The generated templates array is heterogeneous (morphology vs scenario); a
// local shape lets the optional fields typecheck under a single view.
interface Template {
  id: string;
  category: string;
  title: string;
  caption: string;
  params: LiveParams;
  source?: string;
  mass_axis?: string;
  mass_equilibrium?: number;
  food?: number[][];
  mst_overlay?: boolean;
  open_system?: boolean;
}
const TEMPLATES = V.templates as unknown as Template[];

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

// Per-sim presentation CSS (spec § 3): hand-rolled on the theme tokens; the
// shared theme.css surface is consumed, never edited. ig- namespace only.
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.ig-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.ig-row > label { color: var(--dim); min-width: 62px; flex: none; white-space: nowrap; }
.ig-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.ig-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 84px; flex: none; text-align: right; font-size: 10px; line-height: 1.3; }
.ig-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.ig-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.ig-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 0; cursor: pointer; }
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
.ig-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-word; margin-top: 6px; }
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
  border: 1px solid var(--line); border-radius: 9px; padding: 1px 8px; cursor: pointer; }
.ig-chip:hover { color: var(--accent); border-color: var(--accent-d); }
.ig-chip[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }
.ig-chip:disabled { opacity: 0.5; cursor: default; }
.ig-gallery-label { font-size: 9px; color: var(--faint); text-transform: uppercase; letter-spacing: .06em; margin: 4px 0 2px; }
.ig-map { margin: 8px 0 4px; }
.ig-map-cap { font-size: 10px; color: var(--dim); margin-bottom: 3px; cursor: help; }
.ig-map canvas { width: 100%; height: auto; display: block; background: rgba(0, 0, 0, .25);
  border: 1px solid var(--line); border-radius: 4px; }
.bps-overlay { position: absolute; pointer-events: none; }
`;
  document.head.appendChild(style);
}

async function fetchIC(): Promise<{ pos: Float32Array; head: Float32Array }> {
  const res = await fetch(`${import.meta.env.BASE_URL}physarum-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC fetch failed: ${res.status}`);
  const all = new Float32Array(await res.arrayBuffer());
  return { pos: all.slice(0, NA * 2), head: all.slice(NA * 2) };
}

// Prim's minimum spanning tree over food points (grid coords). Deterministic;
// trivial for the ≤36-point scenarios. Returns index-pair edges.
function minimumSpanningTree(points: readonly (readonly [number, number])[]): [number, number][] {
  const n = points.length;
  if (n < 2) return [];
  const inTree = new Array<boolean>(n).fill(false);
  const best = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  best[0] = 0;
  const edges: [number, number][] = [];
  for (let it = 0; it < n; it += 1) {
    let u = -1;
    let bu = Infinity;
    for (let i = 0; i < n; i += 1) if (!inTree[i] && best[i]! < bu) { bu = best[i]!; u = i; }
    if (u < 0) break;
    inTree[u] = true;
    if (from[u]! >= 0) edges.push([from[u]!, u]);
    const [ux, uy] = points[u]!;
    for (let v = 0; v < n; v += 1) {
      if (inTree[v]) continue;
      const [vx, vy] = points[v]!;
      const d = Math.hypot(ux - vx, uy - vy);
      if (d < best[v]!) { best[v] = d; from[v] = u; }
    }
  }
  return edges;
}

const equilibriumOf = (p: LiveParams, na: number): number =>
  (p.deposit * na * (1 - p.decay_alpha)) / p.decay_alpha;

// density-adaptive trail tone gain: maps ~8× the mean cell to full brightness
const gainFor = (eqBase: number, cells: number): number => {
  const meanPerCell = eqBase / cells;
  return Math.min(1.2, Math.max(0.1, 1 / Math.log(1 + 8 * meanPerCell)));
};

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
  const U = GPUBufferUsage;
  const tn = W * H * 4;
  // Capture-path buffers (pinned; shared with the canonical live view under the
  // isCapturing lock, exactly as before). depB gains COPY_SRC so the live flow
  // layer can snapshot it — a usage flag only, no kernel-behavior change.
  const Ta = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const Tb = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const posB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const headB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const depB = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const flowCanon = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST });
  const paramBuf = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
  {
    const buf = new ArrayBuffer(48);
    const dv = new DataView(buf);
    dv.setUint32(0, NA, true);
    dv.setUint32(4, W, true);
    dv.setUint32(8, H, true);
    dv.setUint32(12, 0, true);
    dv.setFloat32(16, (PARAMS.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, PARAMS.L_sense, true);
    dv.setFloat32(24, PARAMS.L_move, true);
    dv.setFloat32(28, PARAMS.deposit, true);
    dv.setFloat32(32, PARAMS.decay_alpha, true);
    queue.writeBuffer(paramBuf, 0, buf);
  }

  const liveParamBuf = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
  const live: LiveParams = { ...PARAMS };
  function writeLiveParams(sim: LiveSim): void {
    const buf = new ArrayBuffer(48);
    const dv = new DataView(buf);
    dv.setUint32(0, sim.NA, true);
    dv.setUint32(4, sim.W, true);
    dv.setUint32(8, sim.H, true);
    dv.setUint32(12, 0, true);
    dv.setFloat32(16, (live.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, live.L_sense, true);
    dv.setFloat32(24, live.L_move, true);
    dv.setFloat32(28, live.deposit, true);
    dv.setFloat32(32, live.decay_alpha, true);
    queue.writeBuffer(liveParamBuf, 0, buf);
  }

  const module = device.createShaderModule({ code: computeWgsl, label: "physarum" });
  const bgl = device.createBindGroupLayout({
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
  const pAgents = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "agents" } });
  const pApply = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "apply" } });
  const pDiffuse = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "diffuse" } });

  const bindCompute = (
    tin: GPUBuffer,
    tout: GPUBuffer,
    pos: GPUBuffer,
    head: GPUBuffer,
    dep: GPUBuffer,
    params: GPUBuffer,
  ): GPUBindGroup =>
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

  // ---- capture path (PINNED — never touched by the live controls) ----------
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

  async function readF32(buf: GPUBuffer, n: number): Promise<Float32Array> {
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
    const { pos, head } = await fetchIC();
    queue.writeBuffer(Ta, 0, new Float32Array(W * H));
    queue.writeBuffer(depB, 0, new Uint32Array(W * H));
    queue.writeBuffer(posB, 0, pos);
    queue.writeBuffer(headB, 0, head);
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("growing network… (5000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    await reset();
    for (let s = 0; s < STEPS; s += 1) stepCanonical();
    const trail = await readF32(Ta, W * H);
    const pos = await readF32(posB, NA * 2);
    const head = await readF32(headB, NA * 2);
    const trail64 = new Float64Array(trail);
    let mass = 0;
    for (let i = 0; i < trail.length; i += 1) mass += trail[i]!;
    exposeCapture(
      {
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
      },
      { download: false },
    );
    panel.setStatus(`capture ready — total_mass=${mass.toFixed(1)} (atomic deposit; new-canonical)`);
    panel.setCaptureEnabled(true);
    await reset();
  }

  // ---- render pipeline v2 (bilinear + colormap + relief + flow) -------------
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  // hiDPI backing store — bilinear + relief want the pixels
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssPx = Math.min(Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.9), 768);
  canvas.width = Math.round(cssPx * dpr);
  canvas.height = Math.round(cssPx * dpr);
  canvas.style.width = `${cssPx}px`;
  canvas.style.height = `${cssPx}px`;
  canvas.style.imageRendering = "auto";

  const renderModule = device.createShaderModule({
    code: renderWgsl + emitColormapWgsl({ stopsExpr: "rp.cmap", countExpr: "rp.cmap_meta.x", fnName: "cmap_sample" }),
    label: "physarum-render",
  });
  const RP_FLOATS = 12 + PACKED_FLOATS;
  const renderUniform = device.createBuffer({ size: RP_FLOATS * 4, usage: U.UNIFORM | U.COPY_DST });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  // display state
  let colormapName = "aurora";
  let cmapPacked = packColormap(getColormap(colormapName));
  let reliefGain = 0.6;
  let flowGain = 0.7;
  let exposure = 1.35;
  let rawGrid = false;
  const lens = { x: 0, y: 0, r: 0, zoom: 4, active: false };
  const rpData = new Float32Array(RP_FLOATS);
  function writeRenderUniform(): void {
    rpData[0] = current.W;
    rpData[1] = rawGrid ? 1 : 0;
    rpData[2] = reliefGain;
    rpData[3] = flowGain;
    const lensShown = lens.active && lens.r > 0.5;
    rpData[4] = lensShown ? lens.x * dpr : 0;
    rpData[5] = lensShown ? lens.y * dpr : 0;
    rpData[6] = lensShown ? canvas.width * 0.16 : 0;
    rpData[7] = lens.zoom;
    rpData[8] = canvas.width;
    rpData[9] = canvas.height;
    rpData[10] = exposure;
    rpData[11] = current.gain;
    rpData.set(cmapPacked, 12);
    queue.writeBuffer(renderUniform, 0, rpData);
  }

  // ---- live simulation state (swappable for coupled-grid swarm scaling) -----
  interface LiveSim {
    label: string;
    W: number;
    H: number;
    NA: number;
    gain: number;
    canonical: boolean;
    trailA: GPUBuffer;
    trailB: GPUBuffer;
    pos: GPUBuffer;
    head: GPUBuffer;
    dep: GPUBuffer;
    flow: GPUBuffer;
    bindAB: GPUBindGroup;
    bindBA: GPUBindGroup;
    renderBG: GPUBindGroup;
  }

  function makeRenderBG(trail: GPUBuffer, flow: GPUBuffer): GPUBindGroup {
    return device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: trail } },
        { binding: 2, resource: { buffer: flow } },
      ],
    });
  }

  // the canonical live sim reuses the pinned capture buffers (as before)
  const canonSim: LiveSim = {
    label: "canonical",
    W, H, NA,
    gain: gainFor(equilibriumOf(PARAMS, NA), W * H),
    canonical: true,
    trailA: Ta, trailB: Tb, pos: posB, head: headB, dep: depB, flow: flowCanon,
    bindAB: bindCompute(Ta, Tb, posB, headB, depB, liveParamBuf),
    bindBA: bindCompute(Tb, Ta, posB, headB, depB, liveParamBuf),
    renderBG: makeRenderBG(Ta, flowCanon),
  };
  let current: LiveSim = canonSim;
  let bigSim: LiveSim | null = null;

  const SWARM_LEVELS = [
    { label: "canonical", gridN: W, na: NA },
    { label: "20k", gridN: 512, na: 20000 },
    { label: "200k", gridN: 768, na: 200000 },
    { label: "1M", gridN: 1024, na: 1000000 },
  ] as const;

  function destroyBig(): void {
    if (!bigSim) return;
    for (const b of [bigSim.trailA, bigSim.trailB, bigSim.pos, bigSim.head, bigSim.dep, bigSim.flow]) b.destroy();
    bigSim = null;
  }

  function buildBigSim(gridN: number, na: number, label: string): LiveSim {
    const cells = gridN * gridN;
    const bytes = cells * 4;
    const trailA = device.createBuffer({ size: bytes, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
    const trailB = device.createBuffer({ size: bytes, usage: U.STORAGE | U.COPY_DST });
    const pos = device.createBuffer({ size: na * 2 * 4, usage: U.STORAGE | U.COPY_DST });
    const head = device.createBuffer({ size: na * 2 * 4, usage: U.STORAGE | U.COPY_DST });
    const dep = device.createBuffer({ size: bytes, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
    const flow = device.createBuffer({ size: bytes, usage: U.STORAGE | U.COPY_DST });
    // random exploratory IC (live-only; the capture stays on the seed-42 IC)
    const posArr = new Float32Array(na * 2);
    const headArr = new Float32Array(na * 2);
    for (let i = 0; i < na; i += 1) {
      posArr[i * 2] = Math.random() * gridN;
      posArr[i * 2 + 1] = Math.random() * gridN;
      const a = Math.random() * Math.PI * 2;
      headArr[i * 2] = Math.cos(a);
      headArr[i * 2 + 1] = Math.sin(a);
    }
    queue.writeBuffer(trailA, 0, new Float32Array(cells));
    queue.writeBuffer(dep, 0, new Uint32Array(cells));
    queue.writeBuffer(pos, 0, posArr);
    queue.writeBuffer(head, 0, headArr);
    return {
      label, W: gridN, H: gridN, NA: na,
      gain: gainFor(equilibriumOf(live, na), cells),
      canonical: false,
      trailA, trailB, pos, head, dep, flow,
      bindAB: bindCompute(trailA, trailB, pos, head, dep, liveParamBuf),
      bindBA: bindCompute(trailB, trailA, pos, head, dep, liveParamBuf),
      renderBG: makeRenderBG(trailA, flow),
    };
  }

  function setSwarm(idx: number): void {
    const lvl = SWARM_LEVELS[idx]!;
    clearFood(); // scenarios live only on the canonical grid
    if (lvl.label === "canonical") {
      destroyBig();
      current = canonSim;
      canonSim.gain = gainFor(equilibriumOf(live, NA), W * H);
    } else {
      destroyBig();
      bigSim = buildBigSim(lvl.gridN, lvl.na, lvl.label);
      current = bigSim;
    }
    writeLiveParams(current);
    writeRenderUniform();
    updateOverlay();
    panel.setStatus(
      current.canonical
        ? "live: canonical 500-agent network — capture stays pinned to seed-42"
        : `live: ${current.NA.toLocaleString()} agents on ${current.W}² (live-only; capture unchanged)`,
    );
    if (suspended) void measureDiagnostics();
  }

  // ---- flow-aware live step (deposit snapshot between agents and apply) ------
  function stepLive(sim: LiveSim): void {
    const wga = Math.ceil(sim.NA / 64);
    const wgg = Math.ceil(sim.W / 8);
    const bytes = sim.W * sim.H * 4;
    const enc = device.createCommandEncoder();
    let c = enc.beginComputePass();
    c.setPipeline(pAgents); c.setBindGroup(0, sim.bindAB); c.dispatchWorkgroups(wga); c.end();
    enc.copyBufferToBuffer(sim.dep, 0, sim.flow, 0, bytes); // the living pulse, before apply clears it
    c = enc.beginComputePass();
    c.setPipeline(pApply); c.setBindGroup(0, sim.bindAB); c.dispatchWorkgroups(wgg, wgg); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pDiffuse); c.setBindGroup(0, sim.bindBA); c.dispatchWorkgroups(wgg, wgg); c.end();
    queue.submit([enc.finish()]);
  }

  // ---- food (science scenarios) + cursor brush ------------------------------
  const DEP_SCALE = 65536;
  const FOOD_RADIUS = 4;
  const FOOD_DEPOSIT = 6.0;
  let brushRadius = 5;
  const BRUSH_DEPOSIT = 4.0;
  let food: [number, number][] = [];
  let mstEdges: [number, number][] = [];
  let cursorCell: { x: number; y: number } | null = null;
  const blobStamp = new Uint32Array(1);

  // per-step external mass injected by persistent food (for the open-system
  // equilibrium the live gate plots against)
  function foodTotalPerStep(): number {
    if (food.length === 0) return 0;
    let perPoint = 0;
    for (let di = -FOOD_RADIUS; di <= FOOD_RADIUS; di += 1) {
      for (let dj = -FOOD_RADIUS; dj <= FOOD_RADIUS; dj += 1) {
        const r = Math.hypot(di, dj);
        if (r > FOOD_RADIUS) continue;
        perPoint += FOOD_DEPOSIT * (1 - r / FOOD_RADIUS);
      }
    }
    return perPoint * food.length;
  }

  function stamp(cx: number, cy: number, radius: number, amp: number): void {
    const sim = current;
    for (let di = -radius; di <= radius; di += 1) {
      for (let dj = -radius; dj <= radius; dj += 1) {
        const r = Math.hypot(di, dj);
        if (r > radius) continue;
        const gx = (((cx + di) % sim.W) + sim.W) % sim.W;
        const gy = (((cy + dj) % sim.H) + sim.H) % sim.H;
        blobStamp[0] = Math.round(amp * (1 - r / radius) * DEP_SCALE);
        if (blobStamp[0]! > 0) queue.writeBuffer(sim.dep, (gx * sim.H + gy) * 4, blobStamp);
      }
    }
  }

  function injectFrameDeposits(): void {
    for (const [fx, fy] of food) stamp(fx, fy, FOOD_RADIUS, FOOD_DEPOSIT);
    if (cursorCell) stamp(cursorCell.x, cursorCell.y, brushRadius, BRUSH_DEPOSIT);
  }

  function clearFood(): void {
    food = [];
    mstEdges = [];
    updateOverlay();
  }

  function setScenario(id: string): void {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t || t.category !== "scenario" || !t.food) return;
    // scenarios force the canonical grid (readable network scale)
    if (!current.canonical) setSwarm(0);
    food = t.food.map(([x, y]) => [x!, y!] as [number, number]);
    mstEdges = t.mst_overlay ? minimumSpanningTree(food) : [];
    Object.assign(live, t.params);
    canonSim.gain = gainFor(equilibriumOf(live, NA), W * H);
    current.gain = canonSim.gain;
    writeLiveParams(current);
    writeRenderUniform();
    updateOverlay();
    void reInitLiveField();
    panel.setStatus(`scenario: ${t.title} — open system (mass converges to the predicted higher line)`);
  }

  // re-seed the canonical live field from the committed IC (a clean slate for a
  // scenario/template) — live buffers only; the capture path resets itself.
  async function reInitLiveField(): Promise<void> {
    if (!current.canonical) return;
    const { pos, head } = await fetchIC();
    queue.writeBuffer(Ta, 0, new Float32Array(W * H));
    queue.writeBuffer(depB, 0, new Uint32Array(W * H));
    queue.writeBuffer(posB, 0, pos);
    queue.writeBuffer(headB, 0, head);
  }

  function applyMorphology(id: string): void {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t || t.category !== "morphology") return;
    clearFood();
    Object.assign(live, t.params);
    if (current.canonical) canonSim.gain = gainFor(equilibriumOf(live, NA), W * H);
    else current.gain = gainFor(equilibriumOf(live, current.NA), current.W * current.H);
    writeLiveParams(current);
    writeRenderUniform();
    syncSliders();
    writeUrl();
    panel.setStatus(
      t.mass_axis === "invariant"
        ? `${t.title} — morphology axis: mass holds at 22500`
        : `${t.title} — deposition axis: the equilibrium moves, the formula still predicts it`,
    );
    if (suspended) void measureDiagnostics();
  }

  // ---- MST / food overlay (Canvas-2D over the WebGPU canvas) -----------------
  const overlay = document.createElement("canvas");
  overlay.className = "bps-overlay";
  const octx = overlay.getContext("2d");
  (canvas.parentElement ?? document.body).appendChild(overlay);
  function updateOverlayGeom(): void {
    const r = canvas.getBoundingClientRect();
    const pr = (canvas.parentElement ?? document.body).getBoundingClientRect();
    overlay.style.left = `${r.left - pr.left}px`;
    overlay.style.top = `${r.top - pr.top}px`;
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
    overlay.width = Math.round(r.width * dpr);
    overlay.height = Math.round(r.height * dpr);
    octx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function updateOverlay(): void {
    if (!octx) return;
    updateOverlayGeom();
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / current.W;
    const sy = rect.height / current.H;
    octx.clearRect(0, 0, rect.width, rect.height);
    if (food.length === 0) return;
    // MST edges — the exact optimum baseline
    octx.strokeStyle = "rgba(255,255,255,0.34)";
    octx.setLineDash([4, 3]);
    octx.lineWidth = 1;
    octx.beginPath();
    for (const [i, j] of mstEdges) {
      octx.moveTo(food[i]![0] * sx, food[i]![1] * sy);
      octx.lineTo(food[j]![0] * sx, food[j]![1] * sy);
    }
    octx.stroke();
    octx.setLineDash([]);
    // food nodes
    octx.fillStyle = cssAccent();
    for (const [fx, fy] of food) {
      octx.beginPath();
      octx.arc(fx * sx, fy * sy, 3, 0, Math.PI * 2);
      octx.fill();
    }
  }
  const cssAccent = (): string =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4dd8c0";
  window.addEventListener("resize", updateOverlay);

  // ---- shareable URL (exploration inputs, NOT a correctness claim) ----------
  function writeUrl(): void {
    const q = new URLSearchParams();
    q.set("dphi", live.delta_phi_deg.toFixed(2));
    q.set("ls", live.L_sense.toFixed(1));
    q.set("lm", live.L_move.toFixed(2));
    q.set("dep", live.deposit.toFixed(2));
    q.set("a", live.decay_alpha.toFixed(3));
    q.set("map", colormapName);
    history.replaceState(null, "", `?${q.toString()}`);
  }
  function readUrl(): void {
    const q = new URLSearchParams(location.search);
    const num = (k: string, d: number): number => {
      const v = Number(q.get(k));
      return Number.isFinite(v) && q.has(k) ? v : d;
    };
    live.delta_phi_deg = num("dphi", live.delta_phi_deg);
    live.L_sense = num("ls", live.L_sense);
    live.L_move = num("lm", live.L_move);
    live.deposit = num("dep", live.deposit);
    live.decay_alpha = Math.max(0.001, num("a", live.decay_alpha));
    const m = q.get("map");
    if (m && COLORMAPS.some((c) => c.name === m)) colormapName = m;
  }

  // ---- Study diagnostics ----------------------------------------------------
  let diagSeq = 0;
  async function measureDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const sim = current;
    const trail = await readF32(sim.trailA, sim.W * sim.H);
    if (seq !== diagSeq) return;
    let mass = 0;
    let peak = 0;
    for (let i = 0; i < trail.length; i += 1) {
      const v = trail[i]!;
      mass += v;
      if (v > peak) peak = v;
    }
    const eqBase = equilibriumOf(live, sim.NA);
    const eq = eqBase + (foodTotalPerStep() * (1 - live.decay_alpha)) / live.decay_alpha;
    verifyHandle.pushLiveMass(mass, eq);
    panel.setDiagnostics([
      { label: "live view", value: `${sim.NA.toLocaleString()} agents · ${sim.W}²` },
      { label: "Δφ / L_sense", value: `${live.delta_phi_deg}° / ${live.L_sense}` },
      { label: "deposit / decay α", value: `${live.deposit} / ${live.decay_alpha}` },
      { label: "total mass", value: mass.toFixed(1) },
      { label: "equilibrium", value: `${eq.toFixed(0)} (${food.length ? "open: (dN+food)(1−α)/α" : "d·N·(1−α)/α"})` },
      { label: "mass_rel", value: (Math.abs(mass - eq) / eq).toExponential(2) },
      { label: "peak trail", value: peak.toFixed(2) },
      { label: "capture pinned to", value: "canonical, seed 42" },
    ]);
  }

  // ---- panel ----------------------------------------------------------------
  readUrl();
  const panel = createSettingsPanel("Physarum Network", {
    caption:
      "Hundreds to a million blind agents deposit and follow chemical trails — a transport network emerges, with order-independent integer atomics conserving every unit of mass.",
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
    modes: {
      initial: "play",
      onMode: (m) => {
        suspended = m === "study";
        if (suspended) void measureDiagnostics();
      },
    },
    study: {
      diagnostics: [{ label: "diagnostics", value: "measuring…" }],
      honesty: {
        faithful:
          "the committed physarum.wgsl 3-pass kernel — the same sense/rotate/move + deposit, apply, diffuse+decay the wgpu-native gate runs; Jones 2010 Table-1 canonical params; seed-42 IC; every displayed frame is a real kernel step",
        simplified:
          "the trail deposit is u32 fixed-point (×65536) so the atomic adds are order-independent — that is what makes two runs byte-identical; templates (sensing geometry, food scenarios) and swarm scaling drive the live loop only — the capture always resets to the seed-42 IC and re-runs the canonical params",
        measured:
          "total mass + peak read back from the live trail buffer; the mass gate re-checks mass_rel against the d·N·(1−α)/α equilibrium every readback",
      },
      verdict: {
        gate: `${V.gate.kind} — run-twice byte-identical + mass_rel < ${V.gate.mass_rel_threshold} of the ${V.mass_equilibrium.canonical_value.toLocaleString()} equilibrium`,
        verdict: "PASS",
        pass: true,
      },
      links: [
        { label: "sim spec", href: `${V.repo_blob_base}${V.links.spec}` },
        { label: "audit ledger", href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits" },
      ],
    },
  });

  // ---- INTERACT: template gallery ------------------------------------------
  const gallery = panel.addGroup("templates");
  const morphChips = new Map<string, HTMLButtonElement>();
  const scenChips = new Map<string, HTMLButtonElement>();
  function clearGalleryPressed(): void {
    for (const c of morphChips.values()) c.setAttribute("aria-pressed", "false");
    for (const c of scenChips.values()) c.setAttribute("aria-pressed", "false");
  }
  {
    const ml = document.createElement("div");
    ml.className = "ig-gallery-label";
    ml.textContent = "morphology — live params over the committed kernel";
    gallery.appendChild(ml);
    const mrow = document.createElement("div");
    mrow.className = "ig-chiprow";
    for (const t of TEMPLATES.filter((x) => x.category === "morphology")) {
      const c = document.createElement("button");
      c.className = "ig-chip";
      c.type = "button";
      c.textContent = t.id;
      c.title = t.caption;
      c.addEventListener("click", () => {
        clearGalleryPressed();
        c.setAttribute("aria-pressed", "true");
        applyMorphology(t.id);
      });
      mrow.appendChild(c);
      morphChips.set(t.id, c);
    }
    gallery.appendChild(mrow);

    const sl = document.createElement("div");
    sl.className = "ig-gallery-label";
    sl.textContent = "science scenarios — food-seeded, with the MST optimum drawn";
    gallery.appendChild(sl);
    const srow = document.createElement("div");
    srow.className = "ig-chiprow";
    for (const t of TEMPLATES.filter((x) => x.category === "scenario")) {
      const c = document.createElement("button");
      c.className = "ig-chip";
      c.type = "button";
      c.textContent = t.id;
      c.title = t.caption;
      c.addEventListener("click", () => {
        clearGalleryPressed();
        c.setAttribute("aria-pressed", "true");
        setScenario(t.id);
        syncSliders();
        writeUrl();
      });
      srow.appendChild(c);
      scenChips.set(t.id, c);
    }
    gallery.appendChild(srow);
    const note = document.createElement("div");
    note.className = "ig-note-line";
    note.textContent = "science scenarios open the closed system by design — the mass converges to a predicted higher line (see PROVE).";
    gallery.appendChild(note);
  }

  // ---- INTERACT: swarm scaling ----------------------------------------------
  const swarmGroup = panel.addGroup("swarm — scale the agent count");
  {
    const row = document.createElement("div");
    row.className = "ig-chiprow";
    SWARM_LEVELS.forEach((lvl, i) => {
      const c = document.createElement("button");
      c.className = "ig-chip";
      c.type = "button";
      c.textContent = lvl.label === "canonical" ? "500" : lvl.label;
      c.title =
        lvl.label === "canonical"
          ? "the committed 500-agent network on 256² — matches the capture"
          : `${lvl.na.toLocaleString()} agents on ${lvl.gridN}² (live-only; the capture stays pinned to 500/256²)`;
      c.setAttribute("aria-pressed", String(i === 0));
      c.addEventListener("click", () => {
        for (const b of row.querySelectorAll("button")) b.setAttribute("aria-pressed", "false");
        c.setAttribute("aria-pressed", "true");
        setSwarm(i);
      });
      row.appendChild(c);
    });
    swarmGroup.appendChild(row);
    const note = document.createElement("div");
    note.className = "ig-note-line";
    note.textContent = "the live grid scales WITH the swarm so density — and the network — stay legible; big modes cost GPU memory.";
    swarmGroup.appendChild(note);
  }

  // ---- INTERACT: live parameter sliders -------------------------------------
  const paramGroup = panel.addGroup("parameters — live");
  const sliders: { sync: () => void }[] = [];
  function addSlider(
    group: HTMLElement,
    label: string,
    minV: number,
    maxV: number,
    stepV: number,
    get: () => number,
    set: (v: number) => void,
    fmt: (v: number) => string,
  ): void {
    const row = document.createElement("div");
    row.className = "ig-row";
    const l = document.createElement("label");
    l.textContent = label;
    const box = document.createElement("div");
    box.className = "ig-slider-box";
    const input = document.createElement("input");
    input.className = "ig-range";
    input.type = "range";
    input.min = String(minV);
    input.max = String(maxV);
    input.step = String(stepV);
    input.value = String(get());
    box.appendChild(input);
    const val = document.createElement("div");
    val.className = "ig-val";
    val.textContent = fmt(get());
    input.addEventListener("input", () => {
      set(Number(input.value));
      val.textContent = fmt(get());
      clearGalleryPressed();
      canonSim.gain = gainFor(equilibriumOf(live, NA), W * H);
      if (!current.canonical) current.gain = gainFor(equilibriumOf(live, current.NA), current.W * current.H);
      writeLiveParams(current);
      writeRenderUniform();
      writeUrl();
      if (suspended) void measureDiagnostics();
    });
    row.append(l, box, val);
    group.appendChild(row);
    sliders.push({
      sync: () => {
        input.value = String(get());
        val.textContent = fmt(get());
      },
    });
  }
  function syncSliders(): void {
    for (const s of sliders) s.sync();
  }
  addSlider(paramGroup, "Δφ (deg)", 5, 80, 0.5, () => live.delta_phi_deg, (v) => (live.delta_phi_deg = v), (v) => `${v.toFixed(1)}°`);
  addSlider(paramGroup, "L_sense", 1, 30, 0.5, () => live.L_sense, (v) => (live.L_sense = v), (v) => v.toFixed(1));
  addSlider(paramGroup, "L_move", 0.25, 3, 0.05, () => live.L_move, (v) => (live.L_move = v), (v) => v.toFixed(2));
  addSlider(paramGroup, "deposit d", 1, 15, 0.5, () => live.deposit, (v) => (live.deposit = v), (v) => v.toFixed(1));
  addSlider(paramGroup, "decay α", 0.02, 0.4, 0.005, () => live.decay_alpha, (v) => (live.decay_alpha = v), (v) => v.toFixed(3));
  addSlider(paramGroup, "brush r", 1, 16, 1, () => brushRadius, (v) => (brushRadius = v), (v) => `${v}px`);
  {
    const row = document.createElement("div");
    row.className = "ig-chiprow";
    const clearBtn = document.createElement("button");
    clearBtn.className = "ig-chip";
    clearBtn.type = "button";
    clearBtn.textContent = "clear field";
    clearBtn.title = "wipe the live trail (live loop only; the capture path re-seeds itself)";
    clearBtn.addEventListener("click", () => {
      clearFood();
      void reInitLiveField();
    });
    row.appendChild(clearBtn);
    paramGroup.appendChild(row);
  }

  // ---- RENDER controls ------------------------------------------------------
  const displayGroup = panel.addGroup("display");
  {
    const row = document.createElement("div");
    row.className = "ig-row";
    const l = document.createElement("label");
    l.textContent = "colormap";
    const sel = document.createElement("select");
    sel.className = "ig-select";
    for (const c of COLORMAPS) {
      const o = document.createElement("option");
      o.value = c.name;
      o.textContent = c.name;
      if (c.name === colormapName) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => {
      colormapName = sel.value;
      cmapPacked = packColormap(getColormap(colormapName));
      writeRenderUniform();
      writeUrl();
    });
    row.append(l, sel);
    displayGroup.appendChild(row);
  }
  addSlider(displayGroup, "relief", 0, 1, 0.02, () => reliefGain, (v) => (reliefGain = v), (v) => v.toFixed(2));
  addSlider(displayGroup, "flow", 0, 1.5, 0.02, () => flowGain, (v) => (flowGain = v), (v) => v.toFixed(2));
  addSlider(displayGroup, "exposure", 0.4, 3, 0.05, () => exposure, (v) => (exposure = v), (v) => v.toFixed(2));
  {
    const label = document.createElement("label");
    label.className = "ig-check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", () => {
      rawGrid = cb.checked;
      writeRenderUniform();
    });
    label.append(cb, document.createTextNode("raw grid (nearest texels — what the buffer holds)"));
    displayGroup.appendChild(label);
    const hint = document.createElement("div");
    hint.className = "ig-note-line";
    hint.textContent = "drag on the canvas to deposit chemoattractant · hold Shift to inspect raw trail values.";
    displayGroup.appendChild(hint);
  }

  // ---- EXPLAIN + PROVE ------------------------------------------------------
  installExplainPanel(panel);
  const verifyHandle = installVerifyPanel({
    panel,
    device,
    queue,
    computeModule: module,
    W, H, NA,
    fetchCanonicalIC: fetchIC,
  });

  // ---- pointer (cursor food brush) + lens -----------------------------------
  function pointerToCell(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    return { x: Math.floor(u * current.W), y: Math.floor(v * current.H) };
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    cursorCell = pointerToCell(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (cursorCell) cursorCell = pointerToCell(e);
    const rect = canvas.getBoundingClientRect();
    lens.x = e.clientX - rect.left;
    lens.y = e.clientY - rect.top;
  });
  const endBrush = (): void => {
    cursorCell = null;
  };
  canvas.addEventListener("pointerup", endBrush);
  canvas.addEventListener("pointercancel", endBrush);
  canvas.addEventListener("pointerenter", () => {
    lens.active = true;
  });
  canvas.addEventListener("pointerleave", () => {
    lens.active = false;
    lens.r = 0;
  });
  // hold Shift to enable the inspection lens
  window.addEventListener("keydown", (e) => {
    if (e.key === "Shift") lens.r = 1;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "Shift") lens.r = 0;
  });

  // ---- boot -----------------------------------------------------------------
  panel.setActivePreset(null);
  syncSliders();
  writeLiveParams(current);
  writeRenderUniform();
  await reset();
  updateOverlay();
  writeUrl();
  boot.textContent = "";

  let suspended = false;
  let stepsPerFrame = 2;

  // low-rate live readback: mass gate + Study diagnostics (sequence-guarded)
  window.setInterval(() => {
    if (isCapturing() || suspended) return;
    void measureDiagnostics();
  }, 650);

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      injectFrameDeposits();
      for (let i = 0; i < stepsPerFrame; i += 1) stepLive(current);
    }
    writeRenderUniform(); // cheap 192-byte write; keeps lens/gain/exposure live
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0.01, b: 0.03, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, current.renderBG);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
