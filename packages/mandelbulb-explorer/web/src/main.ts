// Mandelbulb explorer — Stack-B WebGPU web build.
//
// Display: a sphere-tracing ray-march of the Quilez triplex-power mandelbulb
// (render.wgsl) with live display uniforms — power (incl. fractional morph),
// Julia c-offset, coloring, lighting, camera orbit/zoom/pan, quality tiers,
// and the § 3.1 probe-grid overlay (verification-demo-spec v0.2).
// Capture-export: evaluates the distance estimator at the canonical 16×16
// probe grid using the COMMITTED ../../src/mandelbulb_de.wgsl compute kernel —
// the same shader the wgpu-native gate runs — and re-emits the
// de-probe-points descriptor. Every live control drives DISPLAY uniforms only;
// the capture path is pinned to p=8 on the probe grid (§ 6).
//
// Correctness gate (web-build track, new-canonical): passed = run-twice
// byte-identity (verify.py _gate_mandelbulb); the f32 GPU DE sits at the
// single-precision floor vs the f64 canonical — reported against the strict
// closed-form budget it does NOT clear (an f32 limit, not a defect; no
// tolerance widened). The PROVE panel (verify-panel.ts) re-runs all of it live.

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

import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";

import deWgsl from "../../src/mandelbulb_de.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const GRID = 16;
const BOX = 1.5;
const P = 8;
const ESCAPE_RADIUS = 2.0;
const N_MAX = 16;
// Seed-42 grid-origin jitter = 1e-6 * numpy default_rng(42).standard_normal(3),
// frozen so the browser reproduces the canonical IC (numpy PCG64 is not
// reproducible in-browser). Matches packages/mandelbulb-explorer sim.py.
const SEED42_OFFSET: readonly [number, number, number] = [
  3.047170797544313e-7, -1.0399841062404955e-6, 7.504511958064573e-7,
];

// The data spine (src/generated/verification.json) carries the committed
// canonical values verbatim; the compute constants above must agree with it.
// Drift means the generated file is stale — fail loudly at boot rather than
// display values the kernel is not running.
if (
  V.canonical.params.p !== P ||
  V.canonical.params.escape_radius !== ESCAPE_RADIUS ||
  V.canonical.params.n_max !== N_MAX ||
  V.canonical.params.box_half_extent !== BOX ||
  V.canonical.seed !== 42 ||
  V.canonical.grid[0] !== GRID
) {
  throw new Error("verification.json canonical values drifted from compute constants — rerun gen-verification.mjs");
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

// Per-sim presentation CSS (spec § 3): hand-rolled on the theme tokens; the
// shared theme.css surface is consumed, never edited. mb- namespace only.
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.mb-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.mb-row > label { color: var(--dim); min-width: 14px; flex: none; white-space: nowrap; }
.mb-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.mb-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 56px; flex: none; text-align: right; font-size: 11.5px; }
.mb-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.mb-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.mb-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 0; cursor: pointer; }
.mb-check { display: flex; align-items: center; gap: 7px; margin: 7px 0; color: var(--dim);
  font-size: 11.5px; cursor: pointer; }
.mb-check input { accent-color: var(--accent); margin: 0; }
.mb-select { flex: 1; min-width: 0; font: inherit; font-size: 11.5px; color: var(--txt);
  background: rgba(0, 0, 0, .35); border: 1px solid var(--line); border-radius: 4px;
  padding: 2px 4px; outline: none; cursor: pointer; }
.mb-select:focus { border-color: var(--accent-d); }
.mb-details summary { cursor: pointer; color: var(--dim); font-size: 11px; }
.mb-details[open] summary { color: var(--txt); margin-bottom: 4px; }
.mb-eq { margin: 8px 0; }
.mb-eq-math { color: var(--txt); font-size: 12.5px; margin-bottom: 3px; }
.mb-eq-math small { color: var(--faint); font-size: 9.5px; margin-left: 6px; }
.mb-code { display: block; font-size: 10px; color: var(--accent); background: rgba(0, 0, 0, .35);
  border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px;
  overflow-x: auto; white-space: pre; }
.mb-eq-link { font-size: 9.5px; color: var(--dim); text-decoration: none;
  border-bottom: 1px dotted var(--accent-d); }
.mb-eq-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
.mb-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-all; margin-top: 6px; }
.mb-hash b { color: var(--txt); font-weight: 500; }
.mb-hash .ok { color: var(--accent); }
.mb-hash .no { color: var(--bad); }
.mb-note-line { font-size: 10px; color: var(--warm); margin: 6px 0 2px; }
.mb-anchor { margin: 7px 0; padding: 5px 7px; border: 1px solid var(--line); border-radius: 5px; }
.mb-anchor-head { color: var(--txt); font-size: 11px; }
.mb-anchor-form { color: var(--accent); font-size: 11.5px; margin: 2px 0; }
.mb-anchor-sub { color: var(--dim); font-size: 9.5px; }
.mb-bar { position: relative; height: 34px; margin: 8px 0 2px; border-bottom: 1px solid var(--line); }
.mb-bar-mark { position: absolute; bottom: 0; transform: translateX(-50%); text-align: center; font-size: 9px; }
.mb-bar-mark i { display: block; width: 2px; height: 12px; margin: 0 auto 2px; }
.mb-heat { margin: 8px 0 4px; }
.mb-heat canvas { width: 100%; height: auto; display: block; image-rendering: pixelated;
  background: rgba(0, 0, 0, .25); border: 1px solid var(--line); border-radius: 4px; cursor: crosshair; }
.mb-heat-cap { font-size: 10px; color: var(--dim); margin: 3px 0; min-height: 13px; }
.mb-ind { position: fixed; left: 14px; bottom: 12px; z-index: 5; font: 11px/1.5 var(--mono);
  color: var(--dim); background: rgba(4, 7, 12, .78); border: 1px solid var(--line);
  border-radius: 6px; padding: 5px 9px; max-width: 46ch; }
.mb-ind b { color: var(--accent); font-weight: 500; }
.mb-ind.mb-explore b { color: var(--warm); }
.mb-ind button { display: inline; font: inherit; font-size: 10px; color: var(--accent);
  background: none; border: 0; padding: 0; margin-left: 6px; cursor: pointer;
  text-decoration: underline dotted; }
`;
  document.head.appendChild(style);
}

/** Build the canonical 16×16 z=0 probe grid + seed-42 origin jitter. */
function probeGrid(): Float64Array {
  const out = new Float64Array(GRID * GRID * 3);
  for (let j = 0; j < GRID; j += 1) {
    for (let i = 0; i < GRID; i += 1) {
      const x = -BOX + (2 * BOX * i) / (GRID - 1);
      const y = -BOX + (2 * BOX * j) / (GRID - 1);
      const idx = (j * GRID + i) * 3;
      out[idx + 0] = x + SEED42_OFFSET[0];
      out[idx + 1] = y + SEED42_OFFSET[1];
      out[idx + 2] = 0 + SEED42_OFFSET[2];
    }
  }
  return out;
}

// ---- display state (render uniforms ONLY — never read by the capture path) --

interface DisplayState {
  angle: number;
  elev: number;
  dist: number;
  target: [number, number, number];
  power: number;
  julia: boolean;
  jc: [number, number, number];
  nIter: number;
  bailout: number;
  colorMode: number; // 0 normal · 1 orbit trap · 2 smooth escape
  cmap: string;
  lightAz: number;
  lightEl: number;
  shadowSoft: number;
  quality: number; // 0 fast · 1 balanced · 2 high
  overlay: boolean;
  exposure: number;
  morph: boolean;
}

const CANONICAL_VIEW: DisplayState = {
  angle: 0.6,
  elev: 0.26,
  dist: 2.55,
  target: [0, 0, 0],
  power: 8,
  julia: false,
  jc: [0.38, 0.28, 0.36],
  nIter: 24,
  bailout: 2,
  colorMode: 1,
  cmap: "inferno",
  lightAz: 0.95,
  lightEl: 0.55,
  shadowSoft: 8,
  quality: 1,
  overlay: false,
  exposure: 1.55,
  morph: false,
};

const disp: DisplayState = { ...CANONICAL_VIEW, target: [...CANONICAL_VIEW.target], jc: [...CANONICAL_VIEW.jc] };

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

  // ---- display render pipeline ----
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const displayWgsl = renderWgsl.replace(
    "//__CMAP__",
    emitColormapWgsl({ stopsExpr: "ru.stops", countExpr: "ru.cmeta.x" }),
  );
  const renderModule = device.createShaderModule({ code: displayWgsl, label: "mb-render" });
  const RU_FLOATS = 24 + PACKED_FLOATS; // scalars + colormap block
  const renderUniform = device.createBuffer({
    size: RU_FLOATS * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // § 3.1 probe-grid overlay: canonical probe coordinates (verbatim from the
  // committed h5 via the data spine) + a color scalar per point.
  const probesBuffer = device.createBuffer({
    size: 256 * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: "mb-probes",
  });
  const probePts = V.canonical_points.values;
  function writeProbeColors(w: Float32Array): void {
    const data = new Float32Array(256 * 4);
    for (let k = 0; k < 256; k += 1) {
      data[k * 4 + 0] = probePts[k * 3 + 0]!;
      data[k * 4 + 1] = probePts[k * 3 + 1]!;
      data[k * 4 + 2] = probePts[k * 3 + 2]!;
      data[k * 4 + 3] = w[k]!;
    }
    queue.writeBuffer(probesBuffer, 0, data);
  }
  // default coloring: canonical DE normalized by the committed scale
  writeProbeColors(new Float32Array(V.canonical_de.values.map((d) => d / V.gate.scale)));

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "mb-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: probesBuffer } },
    ],
  });

  // ---- DE compute pipeline (committed shader; capture path) ----
  const deModule = device.createShaderModule({ code: deWgsl, label: "mb-de" });
  const deBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const dePipeline = await device.createComputePipelineAsync({
    label: "mb-de",
    layout: device.createPipelineLayout({ bindGroupLayouts: [deBGL] }),
    compute: { module: deModule, entryPoint: "main" },
  });

  // One DE-evaluation path for BOTH the capture export and the Study
  // diagnostics (the strange-attractors readTrajectory pattern): the
  // COMMITTED mandelbulb_de.wgsl on the canonical probe grid, transient
  // buffers only — no persistent state anywhere.
  async function evalProbeDE(pts32: Float32Array): Promise<Float32Array> {
    const nP = GRID * GRID;
    const params = new ArrayBuffer(16);
    const dv = new DataView(params);
    dv.setUint32(0, nP, true);
    dv.setUint32(4, P, true);
    dv.setFloat32(8, ESCAPE_RADIUS, true);
    dv.setUint32(12, N_MAX, true);
    const ub = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    queue.writeBuffer(ub, 0, params);
    const pin = device.createBuffer({ size: pts32.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    queue.writeBuffer(pin, 0, pts32);
    const dout = device.createBuffer({ size: nP * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const bg = device.createBindGroup({
      layout: deBGL,
      entries: [
        { binding: 0, resource: { buffer: ub } },
        { binding: 1, resource: { buffer: pin } },
        { binding: 2, resource: { buffer: dout } },
      ],
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(dePipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(nP / 64), 1, 1);
    pass.end();
    const rb = device.createBuffer({ size: nP * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyBufferToBuffer(dout, 0, rb, 0, nP * 4);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const de32 = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    ub.destroy();
    pin.destroy();
    dout.destroy();
    return de32;
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("evaluating DE on 256 probe points…");
    panel.setCaptureEnabled(false);
    resetCapture();
    const pts64 = probeGrid();
    const nP = GRID * GRID;
    const de32 = await evalProbeDE(new Float32Array(pts64));

    const de = new Float64Array(nP);
    let nOutside = 0;
    let maxDe = -Infinity;
    for (let i = 0; i < nP; i += 1) {
      de[i] = de32[i] ?? 0;
      if (de[i]! > 0) nOutside += 1;
      if (de[i]! > maxDe) maxDe = de[i]!;
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "mandelbulb-explorer", category: "closed-form", variant: "quilez-p8" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: {
            tier: "test", dims: [GRID, GRID], dtype: "f64", seed: 42,
            params: { p: P, escape_radius: ESCAPE_RADIUS, n_max: N_MAX, box_half_extent: BOX, grid_jitter_scale: 1e-6 },
          },
          run: { step_count: 1, capture_interval: 1, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          // Provenance pointer to the COMMITTED f64 canonical payload (spec
          // § 4.2, the landed three-sim convention) — the placeholder zeros
          // were a false statement about a committed artifact.
          payload: { format: "hdf5", path: "de-probe-points-seed42.h5", checksum: V.canonical.payload_sha256 },
          // gen-verification.mjs HARD-FAILs unless the committed claim is
          // exactly "bit-exact-same-hw", so this narrowing is build-verified
          determinism: { claimed: V.determinism.claimed as "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
        },
        steps: [
          {
            step: 0,
            state: {
              points: field(pts64, [GRID, GRID, 3], "f64"),
              de: field(de, [GRID, GRID], "f64"),
            },
            diagnostics: { n_outside_set: nOutside, max_de: maxDe },
          },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — n_outside_set=${nOutside}, max_de=${maxDe.toFixed(4)}`);
    panel.setCaptureEnabled(true);
  }

  // Study diagnostics (house § 5.4): DE probe statistics recomputed via the
  // SAME evalProbeDE() path the capture uses, on entering Study. The display
  // has no evolving state — the ray-march re-renders from a camera uniform —
  // so Study freezes the presented frame (the RAF chain ends; a drag
  // one-shot-renders the frozen view). Supersession-guarded (P-4 rule 0.5.5).
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const de32 = await evalProbeDE(new Float32Array(probeGrid()));
    if (seq !== diagSeq) return;
    let nOutside = 0;
    let maxDe = -Infinity;
    let minPos = Infinity;
    for (let i = 0; i < de32.length; i += 1) {
      const d = de32[i]!;
      if (d > 0) {
        nOutside += 1;
        if (d < minPos) minPos = d;
      }
      if (d > maxDe) maxDe = d;
    }
    panel.setDiagnostics([
      { label: "probe grid", value: `${GRID} × ${GRID} (z = 0)` },
      { label: "power p", value: String(P) },
      { label: "escape radius / N_max", value: `${ESCAPE_RADIUS} / ${N_MAX}` },
      { label: "n outside set (DE>0)", value: String(nOutside) },
      { label: "n inside set (DE=0)", value: String(de32.length - nOutside) },
      { label: "max DE", value: maxDe.toFixed(4) },
      { label: "min positive DE", value: minPos.toFixed(6) },
      { label: "camera azimuth", value: `${((disp.angle * 180) / Math.PI).toFixed(1)}°` },
      { label: "capture pinned to", value: "16×16 probe grid, seed 42" },
    ]);
  }

  boot.textContent = "";
  let suspended = false;
  let rafQueued = false;
  const morphT0 = performance.now();

  // hiDPI backing store, capped per quality tier (§ 3.4 performance guard)
  function sizeCanvas(): void {
    const dprCap = [1, 1.5, 2][disp.quality] ?? 1.5;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(64, Math.round(rect.width * dpr));
    const h = Math.max(64, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  new ResizeObserver(() => {
    sizeCanvas();
    if (suspended && !isCapturing()) renderFrame();
  }).observe(canvas);

  const uCpu = new Float32Array(RU_FLOATS);
  function renderFrame(): void {
    sizeCanvas();
    if (disp.morph) {
      const t = (performance.now() - morphT0) * 0.00035;
      disp.power = 5 + 3 * Math.sin(t); // 2 ↔ 8 ping-pong, the classic unfolding
      powerCtl?.reflect();
    }
    uCpu[0] = canvas.width / canvas.height;
    uCpu[1] = disp.angle;
    uCpu[2] = disp.elev;
    uCpu[3] = disp.dist;
    uCpu[4] = disp.target[0];
    uCpu[5] = disp.target[1];
    uCpu[6] = disp.target[2];
    uCpu[7] = disp.power;
    uCpu[8] = disp.julia ? 1 : 0;
    uCpu[9] = disp.jc[0];
    uCpu[10] = disp.jc[1];
    uCpu[11] = disp.jc[2];
    uCpu[12] = disp.nIter;
    uCpu[13] = disp.bailout;
    uCpu[14] = disp.colorMode;
    uCpu[15] = disp.lightAz;
    uCpu[16] = disp.lightEl;
    uCpu[17] = disp.shadowSoft;
    uCpu[18] = disp.quality;
    uCpu[19] = disp.overlay ? 1 : 0;
    uCpu[20] = disp.exposure;
    packColormap(getColormap(disp.cmap), uCpu.subarray(24));
    queue.writeBuffer(renderUniform, 0, uCpu);
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBG);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
  }

  function queueFrame(): void {
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(frame);
  }

  function frame(): void {
    rafQueued = false;
    if (isCapturing()) { queueFrame(); return; }
    if (suspended) return; // Study mode: RAF chain ends here (D-P1.2(b))
    if (performance.now() - lastPointerMs > AUTO_ORBIT_IDLE_MS) disp.angle += 0.004;
    renderFrame();
    queueFrame();
  }

  // Cursor-as-camera (house § 5.1, D-P1.2(a) class): drag orbits (azimuth +
  // elevation), wheel zooms, shift/right-drag pans the target — all display
  // uniforms only; nothing here is read by captureCanonical or evalProbeDE.
  // Auto-orbit resumes after AUTO_ORBIT_IDLE_MS without pointer input; in
  // Study (RAF suspended) a drag one-shot-renders the frozen view.
  const AUTO_ORBIT_IDLE_MS = 4000;
  const DRAG_RAD_PER_PX = 0.008;
  let lastPointerMs = -AUTO_ORBIT_IDLE_MS; // boot: auto-orbit live immediately
  let dragPointer: number | null = null;
  let dragX = 0;
  let dragY = 0;
  let dragPan = false;
  canvas.style.cursor = "grab";
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    dragPointer = e.pointerId;
    dragX = e.clientX;
    dragY = e.clientY;
    dragPan = e.shiftKey || e.button === 2;
    lastPointerMs = performance.now();
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragPointer !== e.pointerId) return;
    const dx = e.clientX - dragX;
    const dy = e.clientY - dragY;
    dragX = e.clientX;
    dragY = e.clientY;
    if (dragPan) {
      // pan in the camera plane, scaled by zoom
      const k = 0.0016 * disp.dist;
      const ca = Math.cos(disp.angle);
      const sa = Math.sin(disp.angle);
      // camera right (uu) and up-ish (vv) directions projected from JS
      disp.target[0] -= (dx * ca) * k;
      disp.target[2] -= (-dx * sa) * k;
      disp.target[1] += dy * k;
    } else {
      disp.angle += dx * DRAG_RAD_PER_PX;
      disp.elev = Math.min(1.45, Math.max(-1.45, disp.elev + dy * 0.006));
    }
    lastPointerMs = performance.now();
    if (suspended && !isCapturing()) renderFrame();
  });
  const endDrag = (e: PointerEvent): void => {
    if (dragPointer !== e.pointerId) return;
    dragPointer = null;
    lastPointerMs = performance.now();
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      disp.dist = Math.min(8, Math.max(0.02, disp.dist * Math.exp(e.deltaY * 0.0012)));
      lastPointerMs = performance.now();
      if (suspended && !isCapturing()) renderFrame();
    },
    { passive: false },
  );

  // ---- honest framing (spec § 3.1): the display/gate indicator ----
  const stage = document.getElementById("app") as HTMLDivElement;
  const ind = document.createElement("div");
  ind.className = "mb-ind";
  stage.appendChild(ind);
  function updateIndicator(): void {
    const canonicalObject = disp.power === 8 && !disp.julia && !disp.morph;
    ind.textContent = "";
    ind.classList.toggle("mb-explore", !canonicalObject);
    const b = document.createElement("b");
    if (canonicalObject) {
      b.textContent = "● verified object";
      ind.append(
        b,
        document.createTextNode(
          " — display mirrors the gated p=8 kernel · gate pinned: 16×16 probe grid, seed 42",
        ),
      );
    } else {
      const what = disp.morph
        ? `morphing p≈${disp.power.toFixed(2)}`
        : disp.julia
          ? `Juliabulb c=(${disp.jc.map((v) => v.toFixed(2)).join(", ")})`
          : `p=${disp.power.toFixed(2)}`;
      b.textContent = "○ exploring (display only)";
      ind.append(
        b,
        document.createTextNode(` ${what} — the gate still verifies the committed p=8 kernel`),
      );
      const back = document.createElement("button");
      back.type = "button";
      back.textContent = "return to verified view";
      back.addEventListener("click", () => applyTemplate("canonical-p8"));
      ind.appendChild(back);
    }
  }

  // ---- INTERACT controls (all display uniforms — § 3.1) ----
  interface Ctl { reflect: () => void }
  const ctls: Ctl[] = [];
  function slider(
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    set: (v: number) => void,
    fmt: (v: number) => string = (v) => v.toFixed(2),
  ): Ctl {
    const row = document.createElement("div");
    row.className = "mb-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const box = document.createElement("div");
    box.className = "mb-slider-box";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "mb-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());
    const val = document.createElement("span");
    val.className = "mb-val";
    val.textContent = fmt(get());
    input.addEventListener("input", () => {
      set(Number(input.value));
      val.textContent = fmt(get());
      onDisplayChange();
    });
    box.appendChild(input);
    row.append(lab, box, val);
    parent.appendChild(row);
    const ctl = {
      reflect(): void {
        input.value = String(get());
        val.textContent = fmt(get());
      },
    };
    ctls.push(ctl);
    return ctl;
  }
  function check(parent: HTMLElement, label: string, get: () => boolean, set: (v: boolean) => void): Ctl {
    const lab = document.createElement("label");
    lab.className = "mb-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = get();
    input.addEventListener("change", () => {
      set(input.checked);
      onDisplayChange();
    });
    lab.append(input, document.createTextNode(label));
    parent.appendChild(lab);
    const ctl = { reflect: (): void => { input.checked = get(); } };
    ctls.push(ctl);
    return ctl;
  }
  function select(
    parent: HTMLElement,
    label: string,
    optionsList: [string, string][],
    get: () => string,
    set: (v: string) => void,
  ): Ctl {
    const row = document.createElement("div");
    row.className = "mb-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    sel.className = "mb-select";
    for (const [value, text] of optionsList) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = text;
      sel.appendChild(o);
    }
    sel.value = get();
    sel.addEventListener("change", () => {
      set(sel.value);
      onDisplayChange();
    });
    row.append(lab, sel);
    parent.appendChild(row);
    const ctl = { reflect: (): void => { sel.value = get(); } };
    ctls.push(ctl);
    return ctl;
  }

  function onDisplayChange(): void {
    updateIndicator();
    if (suspended && !isCapturing()) renderFrame();
  }
  function reflectAll(): void {
    for (const c of ctls) c.reflect();
    updateIndicator();
  }

  // ---- template gallery (§ 3.1): display-uniform presets from the § 4 spine --
  interface TemplateParams {
    power?: number;
    julia?: boolean;
    juliaC?: number[];
    colorMode?: number;
    cmap?: string;
    nIter?: number;
    overlay?: boolean;
    morph?: boolean;
    lightAz?: number;
    lightEl?: number;
    shadowSoft?: number;
    exposure?: number;
    camera?: { angle: number; elev: number; dist: number; target: number[] };
  }
  function applyTemplate(id: string): void {
    const t = V.templates.find((x) => x.id === id);
    if (!t) return;
    const p = t.params as TemplateParams;
    // reset to the canonical baseline, then apply the template's overrides —
    // templates are self-contained looks, not deltas
    Object.assign(disp, {
      ...CANONICAL_VIEW,
      target: [...CANONICAL_VIEW.target],
      jc: [...CANONICAL_VIEW.jc],
      // camera persists unless the template pins one (keep the visitor's view)
      angle: disp.angle,
      elev: disp.elev,
      dist: disp.dist,
    });
    disp.target = [...CANONICAL_VIEW.target];
    if (p.power !== undefined) disp.power = p.power;
    if (p.julia !== undefined) disp.julia = p.julia;
    if (p.juliaC) disp.jc = [p.juliaC[0]!, p.juliaC[1]!, p.juliaC[2]!];
    if (p.colorMode !== undefined) disp.colorMode = p.colorMode;
    if (p.cmap) disp.cmap = p.cmap;
    if (p.nIter !== undefined) disp.nIter = p.nIter;
    if (p.overlay !== undefined) disp.overlay = p.overlay;
    disp.morph = p.morph ?? false;
    if (p.lightAz !== undefined) disp.lightAz = p.lightAz;
    if (p.lightEl !== undefined) disp.lightEl = p.lightEl;
    if (p.shadowSoft !== undefined) disp.shadowSoft = p.shadowSoft;
    if (p.exposure !== undefined) disp.exposure = p.exposure;
    if (p.camera) {
      disp.angle = p.camera.angle;
      disp.elev = p.camera.elev;
      disp.dist = p.camera.dist;
      disp.target = [p.camera.target[0]!, p.camera.target[1]!, p.camera.target[2]!];
    }
    panel.setActivePreset(t.label);
    reflectAll();
    if (suspended && !isCapturing()) renderFrame();
  }

  const panel = createSettingsPanel("Mandelbulb Explorer", {
    caption: "The 3-D cousin of the Mandelbrot set, sphere-traced in real time by a distance-estimator ray march — infinite detail from one formula.",
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
    presets: V.templates.map((t) => ({
      label: t.label,
      title: `${t.caption}  [${t.source}]`,
      apply: () => applyTemplate(t.id),
    })),
    modes: {
      initial: "play",
      onMode: (m) => {
        suspended = m === "study";
        if (suspended) {
          renderFrame();
          void measureStudyDiagnostics();
        } else {
          queueFrame();
        }
      },
    },
    study: {
      diagnostics: [{ label: "diagnostics", value: "measuring…" }],
      honesty: {
        faithful:
          "the capture and the Study diagnostics evaluate the COMMITTED mandelbulb_de.wgsl distance estimator — the exact compute kernel the wgpu-native gate runs — on the canonical 16×16 seed-42-jittered probe grid (Quilez p8, escape radius 2, N_max 16)",
        simplified:
          `the DISPLAY is a separate sphere-tracing shader (render.wgsl) that mirrors the DE but adds live power/Julia/coloring/lighting — visual fidelity, not the gate kernel; the f32 GPU DE sits at the single-precision floor (recorded ${V.gate.recorded_browser.f32_vs_f64_de_max_abs}) against the f64 canonical — ABOVE the strict closed-form budget ${V.gate.budget_abs.toExponential(2)} (= ${V.gate.closed_form_rel}·scale), an f32 limit reported rather than widened; every slider drives display uniforms only`,
        measured:
          "DE probe statistics recomputed via the committed kernel on entering Study (the view is frozen in Study; dragging re-renders the frozen frame)",
      },
      verdict: {
        gate: `new_canonical — passed = run-twice byte-identity (verify.py); f32-vs-f64 max_abs reported vs the ${V.gate.closed_form_rel}·scale budget, not widened`,
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: `https://github.com/StevenFAU/Bit-Physics/blob/main/${V.links.spec}`,
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });

  // ---- control groups ----
  const gFractal = panel.addGroup("display — fractal (never the gate)");
  const powerCtl = slider(gFractal, "power", 2, 16, 0.01, () => disp.power, (v) => {
    disp.power = v;
    disp.morph = false;
  });
  check(gFractal, "Julia mode (fixed c — derivative drops the +1)", () => disp.julia, (v) => { disp.julia = v; });
  slider(gFractal, "c·x", -1, 1, 0.01, () => disp.jc[0], (v) => { disp.jc[0] = v; });
  slider(gFractal, "c·y", -1, 1, 0.01, () => disp.jc[1], (v) => { disp.jc[1] = v; });
  slider(gFractal, "c·z", -1, 1, 0.01, () => disp.jc[2], (v) => { disp.jc[2] = v; });
  slider(gFractal, "iterations", 6, 40, 1, () => disp.nIter, (v) => { disp.nIter = v; }, (v) => v.toFixed(0));
  slider(gFractal, "bailout", 1.6, 6, 0.05, () => disp.bailout, (v) => { disp.bailout = v; });

  const gLook = panel.addGroup("display — look");
  select(
    gLook,
    "coloring",
    [["0", "normal-shaded"], ["1", "orbit trap"], ["2", "smooth escape"]],
    () => String(disp.colorMode),
    (v) => { disp.colorMode = Number(v); },
  );
  select(
    gLook,
    "palette",
    COLORMAPS.map((c) => [c.name, c.name]),
    () => disp.cmap,
    (v) => { disp.cmap = v; },
  );
  slider(gLook, "light az", -Math.PI, Math.PI, 0.01, () => disp.lightAz, (v) => { disp.lightAz = v; });
  slider(gLook, "light el", 0.05, 1.5, 0.01, () => disp.lightEl, (v) => { disp.lightEl = v; });
  slider(gLook, "penumbra k", 2, 24, 0.5, () => disp.shadowSoft, (v) => { disp.shadowSoft = v; }, (v) => v.toFixed(1));
  slider(gLook, "exposure", 0.6, 3, 0.05, () => disp.exposure, (v) => { disp.exposure = v; });
  select(
    gLook,
    "quality",
    [["0", "fast (no shadows)"], ["1", "balanced"], ["2", "high"]],
    () => String(disp.quality),
    (v) => { disp.quality = Number(v); },
  );
  check(gLook, "probe-grid overlay — the 256 gated points", () => disp.overlay, (v) => { disp.overlay = v; });
  const camReset = document.createElement("button");
  camReset.type = "button";
  camReset.className = "bps-btn";
  camReset.textContent = "reset camera";
  camReset.addEventListener("click", () => {
    disp.angle = CANONICAL_VIEW.angle;
    disp.elev = CANONICAL_VIEW.elev;
    disp.dist = CANONICAL_VIEW.dist;
    disp.target = [...CANONICAL_VIEW.target];
    onDisplayChange();
  });
  gLook.appendChild(camReset);
  const camHint = document.createElement("div");
  camHint.className = "mb-note-line";
  camHint.textContent = "drag orbit · wheel zoom · shift-drag pan";
  gLook.appendChild(camHint);

  // ---- EXPLAIN + PROVE (spec § 3.2 / § 3.3) ----
  installExplainPanel(panel);
  installVerifyPanel({
    panel,
    device,
    queue,
    deWgsl,
    onResiduals: (w) => {
      writeProbeColors(w);
      if (suspended && !isCapturing()) renderFrame();
    },
    showOverlay: () => {
      disp.overlay = true;
      reflectAll();
      if (suspended && !isCapturing()) renderFrame();
    },
  });

  updateIndicator();
  queueFrame();
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
