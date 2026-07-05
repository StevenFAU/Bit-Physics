// Growing Neural CA — Stack-B WebGPU web build (verification-visible demo,
// verification-demo-spec.md v0.2).
//
// Ships the committed ../../typescript/src/nca_inference.wgsl (the SAME shader
// the wgpu-native round-trip gate runs) + the converted Persistent/disk-target
// checkpoint through a Vite bundle — now raised from a free-running canvas to an
// instrument: a damage/seed brush + template gallery (INTERACT), equation→code
// panels (EXPLAIN), a backend-conditional live gate re-run + run-twice hash +
// per-step divergence scrubber + honesty-arc post-mortem (PROVE), and a
// multi-mode single-pass presentation shader — organism / hidden channels /
// alive / |Δ| / tiled (RENDER).
//
// Correctness gate (web-build track): the committed shader is BIT-EXACT vs the
// WGSL canonical (captures/neural-ca-ref/…-wgsl) on the obtainable RADV
// backends, run-twice byte-identical — resolves via [defaults.continuous-ca]
// 0.0/0.0. Bit-exactness is backend-conditional (the resolution audit § 4): the
// PROVE layer MEASURES and DISPLAYS the visitor's own max_abs rather than
// asserting zero.
//
// HARD SEPARATION (spec § 6): the capture path (captureCanonical / stepOnce /
// readState / seedState / reset / writeParams — numerics BYTE-FROZEN) re-runs
// the pinned seed-42 protocol at fire 0.5 and is UNTOUCHED. Brush, sliders,
// templates and the batched live stepper drive the live state buffer / live
// uniform only; frame() early-returns while isCapturing(). Render + the client
// verify re-run read buffer readbacks; the gate never reads canvas pixels.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";
import { COLORMAPS, PACKED_FLOATS, emitColormapWgsl, getColormap, packColormap } from "../../../../common/common-web/src/colormap.js";

import inferenceWgsl from "../../typescript/src/nca_inference.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";
import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";

const GRID = 64;
const CN = 16;
const CANONICAL_STEPS = 1000;
const CAPTURE_EVERY = 50;
const FIRE_RATE = 0.5; // capture-pinned; the LIVE loop uses `liveFireRate`
const RGBA = 4;

// The data spine (src/generated/verification.json) carries the committed
// canonical values verbatim; the compute constants must agree with it. Drift
// means the generated file is stale — fail loudly at boot.
if (
  V.canonical.grid[0] !== GRID ||
  V.model.channels !== CN ||
  V.canonical.step_count !== CANONICAL_STEPS ||
  V.canonical.capture_interval !== CAPTURE_EVERY
) {
  throw new Error("verification.json drifted from compute constants — rerun gen-verification.mjs");
}

interface Layout {
  tensors: Record<string, { offset: number }>;
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

// Per-sim presentation CSS (spec § 3): hand-rolled on the theme tokens; the
// shared theme.css surface is consumed, never edited. nc- namespace only.
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.nc-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.nc-row > label { color: var(--dim); min-width: 44px; flex: none; white-space: nowrap; }
.nc-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.nc-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 46px; flex: none; text-align: right; font-size: 11.5px; }
.nc-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.nc-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.nc-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.nc-chiprow { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
.nc-chip { font: inherit; font-size: 9.5px; color: var(--dim); background: rgba(0, 0, 0, .3);
  border: 1px solid var(--line); border-radius: 9px; padding: 1px 7px; cursor: pointer; }
.nc-chip:hover { color: var(--accent); border-color: var(--accent-d); }
.nc-chip[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }
.nc-select { flex: 1; min-width: 0; font: inherit; font-size: 11.5px; color: var(--txt);
  background: rgba(0, 0, 0, .35); border: 1px solid var(--line); border-radius: 4px; padding: 2px 4px; outline: none; cursor: pointer; }
.nc-select:focus { border-color: var(--accent-d); }
.nc-check { display: flex; align-items: center; gap: 7px; margin: 7px 0; color: var(--dim); font-size: 11.5px; cursor: pointer; }
.nc-check input { accent-color: var(--accent); margin: 0; }
.nc-note-line { font-size: 10px; color: var(--warm); margin: 6px 0 2px; }
.nc-details summary { cursor: pointer; color: var(--dim); font-size: 11px; }
.nc-details[open] summary { color: var(--txt); margin-bottom: 4px; }
.nc-eq { margin: 8px 0; }
.nc-eq-math { color: var(--txt); font-size: 12.5px; margin-bottom: 3px; }
.nc-eq-math small { color: var(--faint); font-size: 9.5px; margin-left: 6px; }
.nc-code { display: block; font-size: 10px; color: var(--accent); background: rgba(0, 0, 0, .35);
  border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px; overflow-x: auto; white-space: pre; }
.nc-eq-link { font-size: 9.5px; color: var(--dim); text-decoration: none; border-bottom: 1px dotted var(--accent-d); }
.nc-eq-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
.nc-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-all; margin-top: 6px; }
.nc-hash b { color: var(--txt); font-weight: 500; }
.nc-hash .ok { color: var(--accent); }
.nc-hash .no { color: var(--bad); }
.nc-btn { font: inherit; font-size: 11px; color: var(--txt); background: rgba(0,0,0,.35);
  border: 1px solid var(--line); border-radius: 5px; padding: 4px 9px; cursor: pointer; margin: 3px 0; }
.nc-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.nc-btn:disabled { opacity: .5; cursor: default; }
.nc-spark { width: 100%; height: auto; display: block; background: rgba(0,0,0,.25);
  border: 1px solid var(--line); border-radius: 4px; margin: 4px 0; }
.nc-scrub { width: 100%; height: auto; display: block; image-rendering: pixelated;
  background: rgba(0,0,0,.3); border: 1px solid var(--line); border-radius: 4px; margin: 4px 0; }
.nc-timeline { margin: 6px 0 4px; padding-left: 18px; font-size: 10px; line-height: 1.5; color: var(--dim); }
.nc-timeline li { margin: 5px 0; }
.nc-timeline b { color: var(--txt); font-weight: 500; }
.nc-diag-live { margin: 2px 0 0; }
`;
  document.head.appendChild(style);
}

function seedState(): Float32Array {
  // Single live centre cell: channels 3.. = 1.0 (alpha + hidden).
  const s = new Float32Array(GRID * GRID * CN);
  const mid = Math.floor(GRID / 2);
  const base = (mid * GRID + mid) * CN;
  for (let c = 3; c < CN; c += 1) s[base + c] = 1.0;
  return s;
}

/** Seed pattern for a single cell (rgb 0, alpha + hidden 1) — the brush write. */
function seedCellPattern(): Float32Array {
  const c = new Float32Array(CN);
  for (let k = 3; k < CN; k += 1) c[k] = 1.0;
  return c;
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

  const [weightsBuf, layout] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}nca-weights.bin`).then((r) => r.arrayBuffer()),
    fetch(`${import.meta.env.BASE_URL}nca-layout.json`).then((r) => r.json() as Promise<Layout>),
  ]);
  const weights = new Float32Array(weightsBuf);
  const b1Off = layout.tensors["w1.bias"]!.offset;
  const w1Off = layout.tensors["w1.weight"]!.offset;
  const w2Off = layout.tensors["w2.weight"]!.offset;

  const stateLen = GRID * GRID * CN;
  const stateBytes = stateLen * 4;
  const U = GPUBufferUsage;
  const makeState = (): GPUBuffer =>
    device.createBuffer({ size: stateBytes, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST });
  let cur = makeState();
  const mid = makeState();
  let nxt = makeState();
  const wbuf = device.createBuffer({ size: weights.byteLength, usage: U.STORAGE | U.COPY_DST });
  queue.writeBuffer(wbuf, 0, weights);
  const paramBuf = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST }); // capture-pinned
  const liveParamBuf = device.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST }); // live loop

  const module = device.createShaderModule({ code: inferenceWgsl, label: "nca" });
  const bgl = device.createBindGroupLayout({
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

  // writeParams(buf, step, seed, fireRate): the 32-byte Params block. The
  // capture path calls it with FIRE_RATE + seed 42; the live loop with the
  // slider values. Byte layout is the frozen kernel's Params struct.
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

  // --- FROZEN capture path (numerics byte-identical; spec § 6) --------------
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

  // --- OPTIMIZE (spec § 3.5): batched live stepper + cached bind groups -----
  // Each live step is update+mask in ONE encoder + ONE submit (implicit hazard
  // sync between the two compute passes). NOTE: the kernel's PCG fire mask reads
  // `step`, so each step needs its own params write → steps cannot be batched
  // together, but update+mask (one step, one params value) collapse to one
  // submit — halving the capture-era 2-submits-per-step. Bind groups are cached
  // by the `cur` buffer object (2 possible values), never re-allocated per step.
  const liveUpdCache = new Map<GPUBuffer, GPUBindGroup>();
  const liveMaskCache = new Map<GPUBuffer, GPUBindGroup>();
  function liveUpd(c: GPUBuffer): GPUBindGroup {
    let g = liveUpdCache.get(c);
    if (!g) { g = bind(liveParamBuf, c, c, mid); liveUpdCache.set(c, g); }
    return g;
  }
  function liveMask(c: GPUBuffer, n: GPUBuffer): GPUBindGroup {
    let g = liveMaskCache.get(c);
    if (!g) { g = bind(liveParamBuf, c, mid, n); liveMaskCache.set(c, g); }
    return g;
  }

  let liveSeed = 42;
  let liveFireRate = FIRE_RATE;
  function stepLive(step: number): void {
    writeParams(liveParamBuf, step, liveSeed, liveFireRate);
    const enc = device.createCommandEncoder();
    const p1 = enc.beginComputePass();
    p1.setPipeline(pipeUpdate);
    p1.setBindGroup(0, liveUpd(cur));
    p1.dispatchWorkgroups(wg, wg);
    p1.end();
    const p2 = enc.beginComputePass();
    p2.setPipeline(pipeMask);
    p2.setBindGroup(0, liveMask(cur, nxt));
    p2.dispatchWorkgroups(wg, wg);
    p2.end();
    queue.submit([enc.finish()]);
    [cur, nxt] = [nxt, cur];
  }

  // --- RENDER (spec § 3.4): multi-mode single-pass shader --------------------
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({
    code: renderWgsl + emitColormapWgsl({ stopsExpr: "rp.cmap", countExpr: "rp.cmap_meta.x", fnName: "cmap_sample" }),
    label: "nca-render",
  });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  // canonical FINAL frame (rgba) for the |Δ| render mode — zero until loaded
  const canonRef = device.createBuffer({ size: GRID * GRID * RGBA * 4, usage: U.STORAGE | U.COPY_DST });
  // RP uniform: 8 header floats + packed colormap (PACKED_FLOATS)
  const RP_FLOATS = 8 + PACKED_FLOATS;
  const renderUniform = device.createBuffer({ size: RP_FLOATS * 4, usage: U.UNIFORM | U.COPY_DST });
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  // display state (presentation only)
  const MODES = ["organism", "hidden channels", "alive mask", "|Δ| vs canonical", "tiled (all)"] as const;
  let renderMode = 0;
  let hiddenChannel = 8; // 4..15
  let hiddenScale = 1.0;
  let deltaGain = 4.0;
  let colormapName = "viridis";
  let canonLoaded = false;
  const rpData = new Float32Array(RP_FLOATS);
  function writeRenderUniform(): void {
    rpData[0] = GRID;
    rpData[1] = CN;
    rpData[2] = renderMode;
    rpData[3] = hiddenChannel;
    rpData[4] = 0; // tileN (reserved)
    rpData[5] = hiddenScale;
    rpData[6] = deltaGain;
    rpData[7] = canonLoaded ? 1 : 0;
    rpData.set(packColormap(getColormap(colormapName)), 8);
    queue.writeBuffer(renderUniform, 0, rpData);
  }
  writeRenderUniform();

  const renderBGCache = new Map<GPUBuffer, GPUBindGroup>();
  function renderBind(c: GPUBuffer): GPUBindGroup {
    let g = renderBGCache.get(c);
    if (!g) {
      g = device.createBindGroup({
        layout: renderBGL,
        entries: [
          { binding: 0, resource: { buffer: renderUniform } },
          { binding: 1, resource: { buffer: c } },
          { binding: 2, resource: { buffer: canonRef } },
        ],
      });
      renderBGCache.set(c, g);
    }
    return g;
  }

  // --- capture-export: reproduce the canonical descriptor (FROZEN) ----------
  async function captureCanonical(): Promise<void> {
    panel.setStatus("rolling NCA forward… (1000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
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
      if ((s + 1) % CAPTURE_EVERY === 0) recordFrame(s + 1, await readState());
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "neural-ca", category: "continuous-ca", variant: "growing-neural-ca" },
          stack: { name: "wgsl", version: "webgpu", build_id: "web-build-5.x" },
          config: { tier: "reference", dims: [GRID, GRID], dtype: "f32", seed: 42, params: { channel_n: CN, steps: CANONICAL_STEPS, capture_every: CAPTURE_EVERY } },
          run: { step_count: CANONICAL_STEPS, capture_interval: CAPTURE_EVERY, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          // REAL committed payload checksum (was a "0".repeat(64) placeholder);
          // this is the HDF5 payload FILE hash, not the rgba-frame digest.
          payload: { format: "hdf5", path: "growing-emoji-64sq-seed42-step1000-wgsl.h5", checksum: V.canonical.payload_sha256 },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps,
      },
      { download: false },
    );
    panel.setStatus(`capture ready — ${steps.length} frames`);
    panel.setCaptureEnabled(true);
    reset();
    liveStep = 0;
    resetMassHistory();
  }

  // --- Study diagnostics + live α-mass -------------------------------------
  let suspended = false;
  let liveStep = 0;
  let holdPattern = false; // template: never restart (Persistent hold)
  let restartEvery = 400;
  let stepsPerFrame = 2;

  const massHistory: number[] = [];
  const damageMarks: number[] = [];
  let lastDamageStep = -1;
  function resetMassHistory(): void {
    massHistory.length = 0;
    damageMarks.length = 0;
    lastDamageStep = -1;
  }

  let diagSeq = 0;
  function computeStats(st: Float32Array): { alive: number; alphaMass: number; maxAlpha: number } {
    let alive = 0;
    let alphaMass = 0;
    let maxAlpha = 0;
    for (let c = 0; c < GRID * GRID; c += 1) {
      const a = st[c * CN + 3] ?? 0;
      if (a > 0.1) alive += 1;
      alphaMass += a;
      if (a > maxAlpha) maxAlpha = a;
    }
    return { alive, alphaMass, maxAlpha };
  }

  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const st = await readState();
    if (seq !== diagSeq) return;
    const s = computeStats(st);
    panel.setDiagnostics([
      { label: "grid / channels", value: `${GRID} × ${GRID} / ${CN}` },
      { label: "live step", value: String(liveStep) },
      { label: "fire rate", value: liveFireRate.toFixed(2) },
      { label: "alive cells (α>0.1)", value: String(s.alive) },
      { label: "alive fraction", value: (s.alive / (GRID * GRID)).toFixed(4) },
      { label: "alpha mass", value: s.alphaMass.toFixed(1) },
      { label: "max alpha", value: s.maxAlpha.toFixed(3) },
      { label: "capture pinned to", value: "canonical 1000-step, seed 42, fire 0.5" },
    ]);
  }

  // --- panel ----------------------------------------------------------------
  const probe: { run: () => void } = { run: () => {} };
  const panel = createSettingsPanel("Growing Neural CA", {
    caption:
      "A cellular automaton whose update rule is a trained neural network: one seed cell grows into a stable organism. One checkpoint, gated bit-exact — measured live on your GPU.",
    initial: { tier: "reference", seed: 42 },
    onCapture: captureCanonical,
    onChange: (st) => {
      liveSeed = st.seed;
      reset();
      liveStep = 0;
      resetMassHistory();
    },
    presets: [
      { label: "grow", title: V.templates[0]!.caption, apply: () => applyTemplate("grow-from-seed") },
      { label: "hold", title: V.templates[1]!.caption, apply: () => applyTemplate("persistent-hold") },
      { label: "damage", title: V.templates[2]!.caption, apply: () => applyTemplate("damage-measure") },
      { label: "multi-seed", title: V.templates[3]!.caption, apply: () => applyTemplate("multi-seed") },
      { label: "fire sweep", title: V.templates[4]!.caption, apply: () => applyTemplate("fire-rate-sweep") },
      { label: "hidden tour", title: V.templates[5]!.caption, apply: () => applyTemplate("hidden-channel-tour") },
      { label: "backend Δ", title: V.templates[6]!.caption, apply: () => applyTemplate("backend-divergence-probe") },
    ],
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
          "the committed nca_inference.wgsl — the exact two-dispatch (update + mask) compute step the wgpu-native gate runs, with the converted Persistent/disk-target checkpoint; every displayed frame is a real kernel step from the single-live-cell seed",
        simplified:
          "the live view free-runs the seed-42 stochastic fire mask (brush, sliders and templates drive the live state buffer / live uniform only); the capture re-runs the canonical 1000-step rollout from the same seed state at fire 0.5 — nothing in the live loop feeds it. The multi-mode display (hidden-channel false-color, |Δ| heatmap, alive, tiled) is render-side presentation over the unmodified state buffer",
        measured:
          "alive-cell statistics + α-mass read back from the live state buffer on entering Study and ~3×/s in Play; the α-mass recovery curve is measured after each damage brush (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate: `capture_roundtrip bit-exact 0/0 vs the WGSL canonical (all ${V.gate.n_frames} frames, RADV); run-twice byte-identical — measured live below`,
        verdict: "PASS",
        pass: true,
      },
      links: [
        { label: "sim spec", href: `${V.repo_blob_base}${V.links.spec}` },
        { label: "resolution audit", href: `${V.repo_blob_base}${V.links.resolution_audit}` },
      ],
    },
  });

  // ---- INTERACT: brush + templates (spec § 3.1) ----------------------------
  const brushGroup = panel.addGroup("brush — damage & seed the organism");
  type BrushMode = "off" | "erase" | "seed";
  let brushMode: BrushMode = "erase";
  let brushRadius = 5;
  const brushChips = document.createElement("div");
  brushChips.className = "nc-chiprow";
  const chip = (label: string, title: string, on: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "nc-chip";
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", on);
    brushChips.appendChild(b);
    return b;
  };
  const eraseChip = chip("damage (erase)", "Zero a disk of cells — the recognizable NCA experiment. This checkpoint is Persistent (not damage-trained), so expect PARTIAL recovery; the α-mass curve measures it.", () => setBrush("erase"));
  const seedChip = chip("seed (grow)", "Paint the seed cell (α + hidden = 1) — new organisms grow wherever you draw.", () => setBrush("seed"));
  const offChip = chip("look (off)", "Disable the brush — drag does nothing.", () => setBrush("off"));
  brushGroup.appendChild(brushChips);
  function setBrush(m: BrushMode): void {
    brushMode = m;
    eraseChip.setAttribute("aria-pressed", String(m === "erase"));
    seedChip.setAttribute("aria-pressed", String(m === "seed"));
    offChip.setAttribute("aria-pressed", String(m === "off"));
  }
  setBrush("erase");

  // α-mass recovery sparkline
  const spark = document.createElement("canvas");
  spark.className = "nc-spark";
  spark.width = 240;
  spark.height = 54;
  brushGroup.appendChild(spark);
  const sparkCap = document.createElement("div");
  sparkCap.className = "nc-note-line";
  sparkCap.textContent = "α-mass (measured) — drops at each damage tick, then partially recovers";
  brushGroup.appendChild(sparkCap);
  const sparkCtx = spark.getContext("2d");
  function drawSpark(): void {
    if (!sparkCtx) return;
    const w = spark.width;
    const h = spark.height;
    sparkCtx.clearRect(0, 0, w, h);
    if (massHistory.length < 2) return;
    const max = Math.max(1, ...massHistory);
    const n = massHistory.length;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4dd8c0";
    // damage marks
    sparkCtx.strokeStyle = "rgba(255,120,120,0.5)";
    for (const m of damageMarks) {
      const x = (m / Math.max(1, n - 1)) * (w - 2) + 1;
      sparkCtx.beginPath();
      sparkCtx.moveTo(x, 2);
      sparkCtx.lineTo(x, h - 2);
      sparkCtx.stroke();
    }
    sparkCtx.strokeStyle = accent;
    sparkCtx.lineWidth = 1.2;
    sparkCtx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const x = (i / (n - 1)) * (w - 2) + 1;
      const y = h - 2 - (massHistory[i]! / max) * (h - 4);
      if (i === 0) sparkCtx.moveTo(x, y);
      else sparkCtx.lineTo(x, y);
    }
    sparkCtx.stroke();
  }

  // pointer → grid cell (render.wgsl: i = uv.x·g, j = (1−uv.y)·g; canvas top = row 0)
  let pendingBrush: { x: number; y: number } | null = null;
  function pointerToCell(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    return { x: Math.floor(u * GRID), y: Math.floor(v * GRID) };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (brushMode === "off") return;
    canvas.setPointerCapture(e.pointerId);
    pendingBrush = pointerToCell(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pendingBrush) pendingBrush = pointerToCell(e);
  });
  const endBrush = (): void => { pendingBrush = null; };
  canvas.addEventListener("pointerup", endBrush);
  canvas.addEventListener("pointercancel", endBrush);

  const zeroCell = new Float32Array(CN);
  function applyBrush(): void {
    if (!pendingBrush || brushMode === "off") return;
    const pat = brushMode === "seed" ? seedCellPattern() : zeroCell;
    for (let dj = -brushRadius; dj <= brushRadius; dj += 1) {
      const j = pendingBrush.y + dj;
      if (j < 0 || j >= GRID) continue;
      const half = Math.floor(Math.sqrt(brushRadius * brushRadius - dj * dj));
      const i0 = Math.max(0, pendingBrush.x - half);
      const i1 = Math.min(GRID - 1, pendingBrush.x + half);
      if (i1 < i0) continue;
      const span = new Float32Array((i1 - i0 + 1) * CN);
      for (let c = 0; c < i1 - i0 + 1; c += 1) span.set(pat, c * CN);
      queue.writeBuffer(cur, (j * GRID + i0) * CN * 4, span);
    }
    if (brushMode === "erase" && liveStep !== lastDamageStep) {
      lastDamageStep = liveStep;
      damageMarks.push(massHistory.length);
    }
  }

  // ---- INTERACT: live controls --------------------------------------------
  const ctrlGroup = panel.addGroup("live controls");
  function addSlider(
    group: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    fmt: (v: number) => string,
    onSet: (v: number) => void,
  ): HTMLInputElement {
    const row = document.createElement("div");
    row.className = "nc-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const box = document.createElement("div");
    box.className = "nc-slider-box";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "nc-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const val = document.createElement("span");
    val.className = "nc-val";
    val.textContent = fmt(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = fmt(v);
      onSet(v);
    });
    box.appendChild(input);
    row.append(lab, box, val);
    group.appendChild(row);
    return input;
  }
  addSlider(ctrlGroup, "fire", 0.05, 1, 0.05, liveFireRate, (v) => v.toFixed(2), (v) => { liveFireRate = v; });
  addSlider(ctrlGroup, "speed", 1, 16, 1, stepsPerFrame, (v) => `${v}×`, (v) => { stepsPerFrame = Math.round(v); });
  addSlider(ctrlGroup, "brush r", 1, 14, 1, brushRadius, (v) => `${v}`, (v) => { brushRadius = Math.round(v); });

  // play / pause / step / restart + hold
  const stepChips = document.createElement("div");
  stepChips.className = "nc-chiprow";
  const mkChip = (label: string, title: string, on: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "nc-chip";
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", on);
    stepChips.appendChild(b);
    return b;
  };
  const pauseChip = mkChip("pause", "Freeze the live loop (render keeps presenting).", () => setPaused(!paused));
  mkChip("+1 step", "Advance a single kernel step while paused.", () => { if (paused) { stepLive(liveStep); liveStep += 1; } });
  mkChip("restart", "Reset to the single-cell seed.", () => { reset(); liveStep = 0; resetMassHistory(); });
  let paused = false;
  function setPaused(p: boolean): void {
    paused = p;
    pauseChip.textContent = p ? "resume" : "pause";
    pauseChip.setAttribute("aria-pressed", String(p));
  }
  ctrlGroup.appendChild(stepChips);
  const holdRow = document.createElement("label");
  holdRow.className = "nc-check";
  const holdInput = document.createElement("input");
  holdInput.type = "checkbox";
  const holdText = document.createElement("span");
  holdText.textContent = "hold pattern — never auto-restart (Persistent regime)";
  holdRow.title = "The pool-trained Persistent checkpoint holds the disk indefinitely; leave on to watch it stay stable past step 1000.";
  holdRow.append(holdInput, holdText);
  holdInput.addEventListener("change", () => { holdPattern = holdInput.checked; });
  ctrlGroup.appendChild(holdRow);

  // ---- RENDER controls (spec § 3.4) ---------------------------------------
  const dispGroup = panel.addGroup("display");
  function addSelect(group: HTMLElement, label: string, options: readonly string[], value: string, onSet: (v: string) => void): void {
    const row = document.createElement("div");
    row.className = "nc-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    sel.className = "nc-select";
    for (const o of options) {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener("change", () => onSet(sel.value));
    row.append(lab, sel);
    group.appendChild(row);
  }
  addSelect(dispGroup, "mode", MODES, MODES[renderMode]!, (v) => {
    renderMode = Math.max(0, MODES.indexOf(v as (typeof MODES)[number]));
    writeRenderUniform();
  });
  addSelect(dispGroup, "map", COLORMAPS.map((c) => c.name), colormapName, (v) => {
    colormapName = v;
    writeRenderUniform();
  });
  const chanSlider = addSlider(dispGroup, "hidden ch", 4, 15, 1, hiddenChannel, (v) => `${v}`, (v) => {
    hiddenChannel = Math.round(v);
    writeRenderUniform();
  });
  addSlider(dispGroup, "Δ gain", 1, 32, 1, deltaGain, (v) => `${v}×`, (v) => { deltaGain = v; writeRenderUniform(); });
  const dispNote = document.createElement("div");
  dispNote.className = "nc-note-line";
  dispNote.textContent = "hidden = arctan-squashed latent channels · |Δ| = live vs committed canonical final frame · every pixel is a real channel of the state";
  dispGroup.appendChild(dispNote);

  // ---- template actions ----------------------------------------------------
  function applyTemplate(id: string): void {
    setPaused(false);
    switch (id) {
      case "grow-from-seed":
        reset(); liveStep = 0; resetMassHistory();
        holdPattern = false; holdInput.checked = false;
        renderMode = 0; break;
      case "persistent-hold":
        reset(); liveStep = 0; resetMassHistory();
        holdPattern = true; holdInput.checked = true;
        renderMode = 0; break;
      case "damage-measure":
        // ensure a grown disk, then punch the centre and measure recovery
        if (liveStep < 120) { for (let i = liveStep; i < 160; i += 1) { stepLive(i); } liveStep = 160; }
        pendingBrush = { x: GRID / 2, y: GRID / 2 };
        setBrush("erase");
        brushRadius = 9;
        applyBrush();
        pendingBrush = null;
        renderMode = 0; break;
      case "multi-seed":
        reset(); liveStep = 0; resetMassHistory();
        for (const [x, y] of [[20, 20], [44, 24], [30, 44]] as const) {
          const span = seedCellPattern();
          queue.writeBuffer(cur, (y * GRID + x) * CN * 4, span);
        }
        renderMode = 0; break;
      case "fire-rate-sweep":
        reset(); liveStep = 0; resetMassHistory();
        liveFireRate = 0.35;
        (ctrlGroup.querySelector(".nc-range") as HTMLInputElement | null)?.setAttribute("value", "0.35");
        renderMode = 0; break;
      case "hidden-channel-tour":
        renderMode = 1;
        hiddenChannel = 8;
        chanSlider.value = "8"; break;
      case "backend-divergence-probe":
        renderMode = 3;
        probe.run(); break;
    }
    writeRenderUniform();
    panel.setStatus(`template: ${id}`);
  }

  // ---- always-on live α diagnostics ---------------------------------------
  window.setInterval(() => {
    if (isCapturing() || suspended) return;
    const seq = ++diagSeq;
    void readState().then((st) => {
      if (seq !== diagSeq) return;
      const s = computeStats(st);
      massHistory.push(s.alphaMass);
      if (massHistory.length > 160) {
        massHistory.shift();
        for (let i = 0; i < damageMarks.length; i += 1) damageMarks[i]! -= 1;
        while (damageMarks.length && damageMarks[0]! < 0) damageMarks.shift();
      }
      drawSpark();
    });
  }, 320);

  // EXPLAIN + PROVE (spec §§ 3.2–3.3)
  installExplainPanel(panel);
  installVerifyPanel({
    panel,
    device,
    queue,
    pipeUpdate,
    pipeMask,
    bgl,
    wbuf,
    grid: GRID,
    cn: CN,
    canonicalSteps: CANONICAL_STEPS,
    captureEvery: CAPTURE_EVERY,
    fireRate: FIRE_RATE,
    writeParams,
    seedState,
    registerProbe: (run) => { probe.run = run; },
    setRenderMode: (m) => { renderMode = m; writeRenderUniform(); },
  });

  // ---- load the committed canonical frames asset (for |Δ| render mode) -----
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${V.canonical_frames.asset}`);
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      if (buf.byteLength !== V.canonical_frames.bytes) return;
      const frameFloats = GRID * GRID * RGBA;
      const finalFrame = new Float32Array(buf, (V.canonical_frames.n_frames - 1) * frameFloats * 4, frameFloats);
      queue.writeBuffer(canonRef, 0, finalFrame);
      canonLoaded = true;
      writeRenderUniform();
    } catch {
      /* |Δ| mode simply stays dark until/if the asset loads */
    }
  })();

  reset();
  boot.textContent = "";

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended && !paused) {
      applyBrush();
      for (let i = 0; i < stepsPerFrame; i += 1) {
        stepLive(liveStep);
        liveStep += 1;
        if (!holdPattern && liveStep > restartEvery) { reset(); liveStep = 0; resetMassHistory(); }
      }
    }
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 1, g: 1, b: 1, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBind(cur));
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
