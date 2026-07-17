// Gray-Scott reaction-diffusion 2D — Stack-B WebGPU web build (verification-
// visible demo, verification-demo-spec.md v0.2).
//
// Ships the committed ../../src/gray_scott.wgsl (the SAME compute kernel the
// wgpu-native round-trip gate runs) through a Vite browser bundle: a live
// canvas render loop, the shared settings panel, and a capture-export hook
// that re-emits the canonical descriptor for the 5.1 bootstrap round-trip —
// now raised to an instrument: live F/k sliders + a draggable Pearson
// mini-map (INTERACT), equation→code panels (EXPLAIN), a run-twice +
// live-gate-re-run proof and the divergence post-mortem (PROVE), and a
// bilinear/relief/glow presentation shader (RENDER).
//
// Correctness gate (web-build track): the identical gray_scott.wgsl is driven
// by tools/productization/web-deploy against the canonical capture at
// captures/reaction-diffusion-2d-ref/ and round-trips within the
// [defaults.reaction-diffusion] rel=1e-4 budget (measured 2.64e-5, ==
// wgpu-native, post harness-race fix). The seed-42 initial condition —
// numpy's PCG64 uniform(-1e-3,1e-3) perturbation, not reproducible
// in-browser — ships as the binary asset rd2d-ic-seed42.bin.
//
// HARD SEPARATION (spec § 6): the capture path reloads the canonical IC and
// steps ONLY with the canonical paramBuf (stepCanonical); sliders, presets,
// mini-map, brush and dt explorer drive liveParamBuf / the live state buffer
// only. The render stack reads state through read-only bindings; the gate
// reads buffer readbacks, never pixels.

import "../../../../common/common-web/src/theme.css";

import type { DeviceContext } from "../../../../common/common-ts/src/context.js";
import { createContext } from "../../../../common/common-ts/src/context.js";
import { makeBindGroup, makeBindGroupLayout } from "../../../../common/common-ts/src/bindgroups.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureManifestLike, CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";
import {
  COLORMAPS,
  PACKED_FLOATS,
  emitColormapWgsl,
  getColormap,
  ghostFor,
  packColormap,
} from "../../../../common/common-web/src/colormap.js";

import computeWgsl from "../../src/gray_scott.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";
import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";

const N = 128;
const CANONICAL_STEPS = 2000;
const CAPTURE_INTERVAL = 200;
const PARAMS = { Du: 0.16, Dv: 0.08, F: 0.0367, k: 0.0649, dx: 1.0, dt: 1.0 };

// The data spine (src/generated/verification.json) carries the committed
// canonical values verbatim; the compute constants above must agree with it.
// Drift means the generated file is stale (or the constants changed) — fail
// loudly at boot rather than display values the kernel is not running.
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

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function setBoot(msg: string): void {
  boot.textContent = msg;
}

// Per-sim presentation CSS (spec § 3): hand-rolled on the theme tokens; the
// shared theme.css surface is consumed, never edited. rd- namespace only.
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.rd-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.rd-row > label { color: var(--dim); min-width: 14px; flex: none; white-space: nowrap; }
.rd-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.rd-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 52px; flex: none; text-align: right; font-size: 11.5px; }
.rd-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.rd-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.rd-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 0; cursor: pointer; }
.rd-ticks { position: relative; height: 11px; font-size: 9px; color: var(--faint); }
.rd-ticks span { position: absolute; top: 0; transform: translateX(-50%); cursor: pointer; white-space: nowrap; }
.rd-ticks span:hover { color: var(--accent); }
.rd-ticks span:last-child { transform: translateX(-100%); }
.rd-check { display: flex; align-items: center; gap: 7px; margin: 7px 0; color: var(--dim);
  font-size: 11.5px; cursor: pointer; }
.rd-check input { accent-color: var(--accent); margin: 0; }
.rd-details summary { cursor: pointer; color: var(--dim); font-size: 11px; }
.rd-details[open] summary { color: var(--txt); margin-bottom: 4px; }
.rd-eq { margin: 8px 0; }
.rd-eq-math { color: var(--txt); font-size: 12.5px; margin-bottom: 3px; }
.rd-eq-math small { color: var(--faint); font-size: 9.5px; margin-left: 6px; }
.rd-code { display: block; font-size: 10px; color: var(--accent); background: rgba(0, 0, 0, .35);
  border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px;
  overflow-x: auto; white-space: pre; }
.rd-eq-link { font-size: 9.5px; color: var(--dim); text-decoration: none;
  border-bottom: 1px dotted var(--accent-d); }
.rd-eq-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
.rd-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-all; margin-top: 6px; }
.rd-hash b { color: var(--txt); font-weight: 500; }
.rd-hash .ok { color: var(--accent); }
.rd-hash .no { color: var(--bad); }
.rd-note-line { font-size: 10px; color: var(--warm); margin: 6px 0 2px; }
.rd-select { flex: 1; min-width: 0; font: inherit; font-size: 11.5px; color: var(--txt);
  background: rgba(0, 0, 0, .35); border: 1px solid var(--line); border-radius: 4px;
  padding: 2px 4px; outline: none; cursor: pointer; }
.rd-select:focus { border-color: var(--accent-d); }
.rd-chiprow { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
.rd-chip { font: inherit; font-size: 9.5px; color: var(--dim); background: rgba(0, 0, 0, .3);
  border: 1px solid var(--line); border-radius: 9px; padding: 1px 7px; cursor: pointer; }
.rd-chip:hover { color: var(--accent); border-color: var(--accent-d); }
.rd-chip[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }
.rd-map { margin: 8px 0 4px; }
.rd-map-cap { font-size: 10px; color: var(--dim); margin-bottom: 3px; cursor: help; }
.rd-map canvas { width: 100%; height: auto; display: block; background: rgba(0, 0, 0, .25);
  border: 1px solid var(--line); border-radius: 4px; cursor: crosshair; touch-action: none; }
.rd-diag-live { margin: 2px 0 0; }
.rd-timeline { margin: 6px 0 4px; padding-left: 18px; font-size: 10px; line-height: 1.5; color: var(--dim); }
.rd-timeline li { margin: 5px 0; }
.rd-timeline b { color: var(--txt); font-weight: 500; }
`;
  document.head.appendChild(style);
}

/** Build the seed-42 canonical IC by fetching the committed binary asset. */
async function fetchCanonicalIC(): Promise<Float32Array<ArrayBuffer>> {
  const res = await fetch(`${import.meta.env.BASE_URL}rd2d-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC asset fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ic = new Float32Array(buf);
  if (ic.length !== N * N * 2) {
    throw new Error(`IC asset length ${ic.length} != ${N * N * 2}`);
  }
  return ic;
}

/** Deterministic exploratory IC for non-canonical seeds (display only). */
function exploratoryIC(seed: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(N * N * 2);
  let s = (seed >>> 0) || 1;
  const half = N / 2;
  const ss = Math.max(4, N / 16);
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const idx = (j * N + i) * 2;
      const inSeed = i >= half - ss && i < half + ss && j >= half - ss && j < half + ss;
      // LCG noise in [-1e-3, 1e-3]
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const noise = (s / 0xffffffff) * 2e-3 - 1e-3;
      out[idx + 0] = Math.min(1, Math.max(0, (inSeed ? 0.5 : 1.0) + noise));
      out[idx + 1] = Math.min(1, Math.max(0, (inSeed ? 0.25 : 0.0) + noise));
    }
  }
  return out;
}

async function main(): Promise<void> {
  injectStyles();
  let ctx: DeviceContext;
  try {
    ctx = await createContext();
  } catch (e) {
    setBoot(`WebGPU unavailable: ${(e as Error).message}`);
    throw e;
  }
  const { device, queue } = ctx;

  // hiDPI backing store (spec § 3.4): CSS size × min(dpr, 2), sized once at
  // boot (deterministic under the headless driver, where dpr = 1)
  {
    const css = canvas.clientWidth || canvas.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(256, Math.round(css * dpr));
    canvas.width = px;
    canvas.height = px;
  }

  const cellCount = N * N;
  const bufBytes = cellCount * 2 * 4;
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const buffers = [
    device.createBuffer({ size: bufBytes, usage, label: "state-a" }),
    device.createBuffer({ size: bufBytes, usage, label: "state-b" }),
  ];
  // Render-owned snapshot of the state buffer (spec § 3.4 activity glow):
  // refreshed by copyBufferToBuffer on a frame-indexed cadence — a queue
  // copy, not a compute pass; sim state is read-only with respect to it.
  const snapBuf = device.createBuffer({ size: bufBytes, usage, label: "state-snapshot" });

  // Compute pipeline (the committed gray_scott.wgsl).
  const computeLayout = makeBindGroupLayout(
    ctx,
    [
      { binding: 1, visibility: GPUShaderStage.COMPUTE, type: "read-only-storage" },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, type: "storage" },
    ],
    [{ binding: 0, visibility: GPUShaderStage.COMPUTE }],
    "rd2d-compute-bgl",
  );
  const computeModule = device.createShaderModule({ code: computeWgsl, label: "gray-scott" });
  const computePipeline = await device.createComputePipelineAsync({
    label: "rd2d-compute",
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: { module: computeModule, entryPoint: "main" },
  });

  // Render pipeline v2 (presentation shader + the shared colormap samplers —
  // map switches are uniform writes, never pipeline rebuilds).
  const ctxGpu = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctxGpu.configure({ device, format, alphaMode: "opaque" });
  const renderLayout = makeBindGroupLayout(
    ctx,
    [
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, type: "read-only-storage" },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, type: "read-only-storage" },
    ],
    [{ binding: 0, visibility: GPUShaderStage.FRAGMENT }],
    "rd2d-render-bgl",
  );
  const renderModule = device.createShaderModule({
    code:
      renderWgsl +
      emitColormapWgsl({ stopsExpr: "rp.cmap", countExpr: "rp.cmap_meta.x", fnName: "cmap_sample" }) +
      emitColormapWgsl({ stopsExpr: "rp.cmap2", countExpr: "rp.cmap2_meta.x", fnName: "cmap2_sample" }),
    label: "rd2d-render",
  });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "rd2d-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  // RP = 8 base floats + two packed colormap blocks (8×vec4 + meta each)
  const RP_FLOATS = 8 + PACKED_FLOATS * 2;
  const renderUniform = device.createBuffer({
    size: RP_FLOATS * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "rd2d-render-uniform",
  });

  // display look state (spec § 3.4) — presentation-only
  const VIEW_MODES = ["V field", "U field", "duotone"] as const;
  let viewMode = 0;
  let rawGrid = false;
  let relief = 0.4;
  let glow = 0.3;
  let exposure = 1.35;
  let colormapName = "magma"; // closest heir of the v1 hand-rolled ramp
  const V_GAIN = 3.5; // v1's V-channel gain, kept as the calibrated default
  let cmapPrimary = packColormap(getColormap(colormapName));
  let cmapSecondary = packColormap(ghostFor(colormapName));

  const rpData = new Float32Array(RP_FLOATS);
  function writeRenderUniform(): void {
    rpData[0] = N;
    rpData[1] = viewMode;
    rpData[2] = rawGrid ? 1 : 0;
    rpData[3] = relief;
    rpData[4] = glow;
    rpData[5] = exposure;
    rpData[6] = V_GAIN;
    rpData[7] = 0;
    rpData.set(cmapPrimary, 8);
    rpData.set(cmapSecondary, 8 + PACKED_FLOATS);
    queue.writeBuffer(renderUniform, 0, rpData);
  }
  writeRenderUniform();

  // Named Gray-Scott regimes (house § 5.3, ruling D-P1.2(a)): live-loop
  // presets over the SAME committed kernel — only the F/k uniform values
  // differ (Du/Dv/dx/dt stay canonical unless the advanced explorer is used).
  // The F/k plane is the classic Gray-Scott pattern-selection map (Pearson
  // 1993, Science 261:189, DOI 10.1126/science.261.5118.189); regime NAMES
  // describe the measured behavior of THIS kernel from the seed-square IC
  // (field statistics + screenshots in the P-5 audit). The capture path steps
  // ONLY with the canonical paramBuf.
  interface FkRegime {
    label: string;
    title: string;
    F: number;
    k: number;
  }
  const REGIMES: readonly FkRegime[] = [
    {
      label: "canonical",
      title: "the capture regime — F 0.0367, k 0.0649: dividing-spot λ-class growth. ",
      F: PARAMS.F, k: PARAMS.k,
    },
    {
      label: "solitons",
      title: "F 0.030, k 0.062: isolated self-maintaining spots",
      F: 0.030, k: 0.062,
    },
    {
      label: "coral",
      title: "F 0.0545, k 0.062: fronts that branch into coral-like labyrinths",
      F: 0.0545, k: 0.062,
    },
    {
      label: "maze",
      title: "F 0.029, k 0.057: ring fronts that lock into long maze corridors",
      F: 0.029, k: 0.057,
    },
  ];

  // Live-loop parameters (spec § 3.1): sliders / mini-map / dt explorer write
  // THIS record and nothing else; the canonical PARAMS object stays frozen
  // for the capture path. dx is not exposed (grid geometry).
  const live = { Du: PARAMS.Du, Dv: PARAMS.Dv, F: PARAMS.F, k: PARAMS.k, dx: PARAMS.dx, dt: PARAMS.dt };
  let stepsPerFrame = 8;

  // Capture-pinning split (binding rule P-4 § 0.5.3, pattern verbatim from
  // packages/physarum/web/src/main.ts): TWO param uniforms. The capture
  // re-run steps ONLY with the canonical paramBuf; the RAF live loop steps
  // ONLY with liveParamBuf (live slider values). Disjoint call sites:
  // stepCanonical appears in captureCanonical's loop alone, stepLive in the
  // RAF frame alone.
  const uUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  const paramBuf = device.createBuffer({ size: 32, usage: uUsage, label: "params-canonical" });
  const liveParamBuf = device.createBuffer({ size: 32, usage: uUsage, label: "params-live" });

  interface StepParams {
    Du: number;
    Dv: number;
    F: number;
    k: number;
    dx: number;
    dt: number;
  }
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

  function stepWith(params: GPUBuffer, p: StepParams): void {
    writeStepParams(params, p, stepCounter + 1);
    const dst = 1 - src;
    const bg = makeBindGroup(
      ctx,
      computeLayout,
      [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: buffers[src]! } },
        { binding: 2, resource: { buffer: buffers[dst]! } },
      ],
      `rd2d-cbg-${stepCounter}`,
    );
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
  const stepCanonical = (): void => stepWith(paramBuf, PARAMS);
  const stepLive = (): void => stepWith(liveParamBuf, live);

  // Prebuilt render bind groups per ping-pong side (state + snapshot + look)
  const renderBGs = buffers.map((b, i) =>
    makeBindGroup(
      ctx,
      renderLayout,
      [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: b } },
        { binding: 2, resource: { buffer: snapBuf } },
      ],
      `rd2d-rbg-${i}`,
    ),
  );

  function renderFrame(): void {
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctxGpu.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBGs[src]!);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
  }

  function snapshotState(): void {
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buffers[src]!, 0, snapBuf, 0, bufBytes);
    queue.submit([enc.finish()]);
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

  async function loadIC(seed: number): Promise<void> {
    const ic = seed === 42 ? await fetchCanonicalIC() : exploratoryIC(seed);
    queue.writeBuffer(buffers[0]!, 0, ic);
    queue.writeBuffer(snapBuf, 0, ic); // no stale activity-glow flash
    src = 0;
    stepCounter = 0;
  }

  // Capture-export: reproduce the canonical descriptor (seed 42, 2000 steps).
  // Pinned by construction: reloads the canonical seed-42 IC, then steps ONLY
  // via stepCanonical (canonical paramBuf) — preset, slider and cursor state
  // cannot reach it; frame() early-returns while isCapturing().
  async function captureCanonical(): Promise<void> {
    panel.setStatus("capturing… (2000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    await loadIC(42);
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
      }
    }
    // Manifest metadata sourced from the committed data spine (spec § 4):
    // params verbatim (boot drift-check pins PARAMS == the committed
    // manifest), the REAL committed payload checksum (the placeholder zeros
    // were a false statement about an artifact this path names), and the
    // browser determinism claim. Step/state arrays above are untouched — the
    // gate compares those.
    exposeCapture(
      {
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
      },
      { download: false },
    );
    // restore the live view IC
    await loadIC(panel.getState().seed);
    panel.setStatus("capture ready (window.__bitPhysicsCapture)");
    panel.setCaptureEnabled(true);
  }

  // Study = pause stepping, keep presenting (P-4 rule 0.5.3): measured at
  // HEAD, all state mutation lives in the compute dispatch inside stepWith();
  // the render pass reads the state buffer through read-only-storage bindings
  // (renderLayout above) and dispatches no compute (D-P1.2(b)).
  let suspended = false;

  // Field statistics measured via the SAME readState() readback the capture
  // path uses, on the live state buffer. The sequence token drops superseded
  // measurements (P-4 rule 0.5.5). One measurement feeds BOTH the always-on
  // readout (spec § 3.1) and, in Study, the panel's diagnostics block.
  let diagSeq = 0;
  interface FieldStats {
    massU: number;
    massV: number;
    peakV: number;
    coverage: number;
  }
  function computeStats(st: Float32Array): FieldStats {
    let massU = 0;
    let massV = 0;
    let peakV = 0;
    let covered = 0;
    for (let c = 0; c < cellCount; c += 1) {
      const u = st[c * 2] ?? 0;
      const v = st[c * 2 + 1] ?? 0;
      massU += u;
      massV += v;
      if (v > peakV) peakV = v;
      if (v > 0.1) covered += 1;
    }
    return { massU, massV, peakV, coverage: covered / cellCount };
  }

  function matchRegime(): FkRegime | null {
    return REGIMES.find((r) => r.F === live.F && r.k === live.k) ?? null;
  }

  const fmtF = (v: number): string => v.toFixed(4);

  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const st = await readState(src);
    if (seq !== diagSeq) return;
    const s = computeStats(st);
    updateLiveDiag(s);
    const reg = matchRegime();
    panel.setDiagnostics([
      { label: "live regime", value: reg ? reg.label : "custom F/k" },
      { label: "grid", value: `${N} × ${N}` },
      { label: "live step", value: String(stepCounter) },
      { label: "F / k", value: `${fmtF(live.F)} / ${fmtF(live.k)}` },
      { label: "Du / Dv / dt", value: `${live.Du} / ${live.Dv} / ${live.dt}` },
      { label: "mass U", value: s.massU.toFixed(1) },
      { label: "mass V", value: s.massV.toFixed(1) },
      { label: "peak V", value: s.peakV.toFixed(3) },
      { label: "V coverage (V>0.1)", value: s.coverage.toFixed(4) },
      { label: "capture pinned to", value: "canonical F/k, seed 42" },
    ]);
  }

  // ---------------------------------------------------------------- panel --
  const panel = createSettingsPanel("Reaction-Diffusion 2D", {
    caption: "Two chemicals feed, react, and diffuse — Turing’s recipe for pattern: spots, stripes, and living labyrinths from one PDE.",
    initial: { tier: "test", seed: V.canonical.seed },
    onCapture: captureCanonical,
    onChange: (st) => {
      void loadIC(st.seed);
    },
    presets: REGIMES.map((r) => ({
      label: r.label,
      title: r.title,
      apply: () => {
        void applyRegime(r);
      },
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
          "the committed gray_scott.wgsl 5-point-Laplacian kernel — the same compute the wgpu-native round-trip gate runs; canonical params " +
          `F ${PARAMS.F}, k ${PARAMS.k}, Du ${PARAMS.Du}, Dv ${PARAMS.Dv}; seed-42 numpy IC asset; every displayed frame is a real kernel step`,
        simplified:
          "presets, F/k sliders, the Pearson mini-map, the brush and the Du/Dv/dt explorer drive the live loop only — the capture reloads the " +
          `canonical IC and re-runs the canonical params, round-tripping within rel ${V.gate.declared.relative} (measured ` +
          `${V.gate.measured_max_abs.toExponential(2)}, == wgpu-native); the display (bilinear reconstruction, relief lighting, activity glow, ` +
          "colormaps, tonemap) is render-side presentation over the unmodified state buffer — the raw-grid toggle shows the exact texels",
        measured:
          "field statistics read back from the live state buffer ~1.4×/s in Play and on entering Study (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate:
          `capture_roundtrip (browser capture vs the f64 canonical within rel ${V.gate.declared.relative}; ` +
          `measured max_abs ${V.gate.measured_max_abs.toExponential(2)}, run-twice ${V.gate.run_twice})`,
        verdict: "PASS",
        pass: true,
      },
      links: [
        { label: "sim spec", href: blobUrl(V.links.spec) },
        { label: "resolution audit", href: blobUrl(V.links.resolution_audit) },
      ],
    },
  });

  // ------------------------------------ INTERACT: F/k plane (spec § 3.1) --
  const fkGroup = panel.addGroup("feed / kill — the Pearson plane");

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
    step: number,
    value: number,
    fmt: (v: number) => string,
    onSet: (v: number) => void,
    ticks?: { v: number; title: string }[],
  ): SliderHandle {
    const row = document.createElement("div");
    row.className = "rd-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const box = document.createElement("div");
    box.className = "rd-slider-box";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "rd-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const val = document.createElement("span");
    val.className = "rd-val";
    val.textContent = fmt(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = fmt(v);
      onSet(v);
    });
    box.appendChild(input);
    if (ticks) {
      const tickRow = document.createElement("div");
      tickRow.className = "rd-ticks";
      for (const t of ticks) {
        const s = document.createElement("span");
        s.textContent = String(t.v);
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

  // Pearson window (spec § 3.1) — tick annotations at the documented presets
  const F_MIN = 0.01, F_MAX = 0.08, K_MIN = 0.045, K_MAX = 0.07;
  const fTicks = REGIMES.map((r) => ({ v: r.F, title: `${r.label} — F ${r.F}` }));
  const kTicks = REGIMES.map((r) => ({ v: r.k, title: `${r.label} — k ${r.k}` }));

  function announceFk(): void {
    const m = matchRegime();
    panel.setActivePreset(m ? m.label : null);
    panel.setStatus(
      m
        ? m.label === "canonical"
          ? "live field: canonical — the capture regime"
          : `live field: ${m.label} — capture stays pinned to canonical seed-42`
        : `live field: custom F ${fmtF(live.F)} / k ${fmtF(live.k)} — capture stays pinned to canonical seed-42`,
    );
  }

  // Slider / mini-map drags morph the running field continuously (no IC
  // reload — pattern selection is history-dependent, and the morph IS the
  // point); preset chips regrow from the seed-square IC (applyRegime below).
  function setFk(F: number, k: number): void {
    live.F = Math.min(F_MAX, Math.max(F_MIN, F));
    live.k = Math.min(K_MAX, Math.max(K_MIN, k));
    syncFkUI();
    announceFk();
    if (suspended) void measureStudyDiagnostics();
  }

  const fSlider = addSlider(fkGroup, "F", F_MIN, F_MAX, 0.0001, live.F, fmtF, (v) => setFk(v, live.k), fTicks);
  const kSlider = addSlider(fkGroup, "k", K_MIN, K_MAX, 0.0001, live.k, fmtF, (v) => setFk(live.F, v), kTicks);

  // F/k mini-map (spec § 3.1): the Pearson plane made navigable — canvas-2D,
  // two-way (drag sets F/k). Preset dots are the four documented regimes of
  // THIS kernel; they are annotations, not measured region boundaries.
  const mapWrap = document.createElement("div");
  mapWrap.className = "rd-map";
  const mapCap = document.createElement("div");
  mapCap.className = "rd-map-cap";
  mapCap.textContent = "the (k, F) plane — drag to fly through pattern space";
  mapCap.title =
    "Pearson 1993's pattern-selection map: each point selects a morphology. Dots mark this kernel's documented regimes; drag anywhere to steer the live field. Display/live-loop only.";
  const mapCanvas = document.createElement("canvas");
  const MAP_W = 240, MAP_H = 190;
  mapWrap.append(mapCap, mapCanvas);
  fkGroup.appendChild(mapWrap);

  const mapCtx = mapCanvas.getContext("2d");
  function drawMinimap(): void {
    if (!mapCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (mapCanvas.width !== MAP_W * dpr) {
      mapCanvas.width = MAP_W * dpr;
      mapCanvas.height = MAP_H * dpr;
    }
    const c = mapCtx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, MAP_W, MAP_H);
    const x = (k: number): number => 8 + ((k - K_MIN) / (K_MAX - K_MIN)) * (MAP_W - 16);
    const y = (F: number): number => MAP_H - 8 - ((F - F_MIN) / (F_MAX - F_MIN)) * (MAP_H - 16);
    // frame + axis labels
    c.strokeStyle = "rgba(255,255,255,0.14)";
    c.strokeRect(8, 8, MAP_W - 16, MAP_H - 16);
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.font = "8.5px system-ui, sans-serif";
    c.fillText(`k ${K_MIN}`, 8, MAP_H - 1);
    c.textAlign = "right";
    c.fillText(String(K_MAX), MAP_W - 8, MAP_H - 1);
    c.save();
    c.translate(6, MAP_H - 10);
    c.rotate(-Math.PI / 2);
    c.textAlign = "left";
    c.fillText(`F ${F_MIN} → ${F_MAX}`, 0, 0);
    c.restore();
    c.textAlign = "left";
    // preset dots
    for (const r of REGIMES) {
      const px = x(r.k), py = y(r.F);
      c.fillStyle = "rgba(255,255,255,0.5)";
      c.beginPath();
      c.arc(px, py, 2.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.42)";
      c.fillText(r.label === "canonical" ? "λ canonical" : r.label, px + 5, py + 3);
    }
    // live cursor
    const lx = x(live.k), ly = y(live.F);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4dd8c0";
    c.strokeStyle = accent;
    c.fillStyle = accent;
    c.beginPath();
    c.arc(lx, ly, 3.4, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.5;
    c.beginPath();
    c.moveTo(lx - 8, ly);
    c.lineTo(lx + 8, ly);
    c.moveTo(lx, ly - 8);
    c.lineTo(lx, ly + 8);
    c.stroke();
    c.globalAlpha = 1;
  }

  function mapPointToFk(e: PointerEvent): void {
    const rect = mapCanvas.getBoundingClientRect();
    const relX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const relY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    // invert the 8px frame padding in canvas units
    const fx = Math.min(Math.max((relX * MAP_W - 8) / (MAP_W - 16), 0), 1);
    const fy = Math.min(Math.max((relY * MAP_H - 8) / (MAP_H - 16), 0), 1);
    setFk(F_MIN + (1 - fy) * (F_MAX - F_MIN), K_MIN + fx * (K_MAX - K_MIN));
  }
  let mapDragging = false;
  mapCanvas.addEventListener("pointerdown", (e) => {
    mapDragging = true;
    mapCanvas.setPointerCapture(e.pointerId);
    mapPointToFk(e);
  });
  mapCanvas.addEventListener("pointermove", (e) => {
    if (mapDragging) mapPointToFk(e);
  });
  const endMapDrag = (): void => {
    mapDragging = false;
  };
  mapCanvas.addEventListener("pointerup", endMapDrag);
  mapCanvas.addEventListener("pointercancel", endMapDrag);

  function syncFkUI(): void {
    fSlider.input.value = String(live.F);
    fSlider.val.textContent = fmtF(live.F);
    kSlider.input.value = String(live.k);
    kSlider.val.textContent = fmtF(live.k);
    drawMinimap();
  }

  addSlider(fkGroup, "speed", 1, 32, 1, stepsPerFrame, (v) => `${v}×`, (v) => {
    stepsPerFrame = Math.round(v);
  });

  async function applyRegime(r: FkRegime): Promise<void> {
    live.F = r.F;
    live.k = r.k;
    syncFkUI();
    // Regrow from the seed-square IC so the regime forms its own morphology
    // (Gray-Scott patterns are history-dependent). Live view only.
    await loadIC(panel.getState().seed);
    announceFk();
    if (suspended) void measureStudyDiagnostics();
  }

  // ------------------------------------- INTERACT: brush (spec § 3.1) -----
  // Cursor-as-seed (house § 5.1, ruling D-P1.2(a)): the pointer writes the
  // IC's own seed values (U 0.5, V 0.25) — or, in erase mode, the background
  // state (U 1, V 0) — into the live state buffer through the SAME
  // queue.writeBuffer path loadIC uses; the committed kernel consumes the
  // written cells on the next step. No new compute-side buffer or pass (P-4
  // rule 0.5.4). LIVE LOOP ONLY: injection happens inside the !suspended live
  // branch, and captureCanonical reloads the canonical IC before its pinned
  // re-run.
  const brushGroup = panel.addGroup("brush — paint the chemistry");
  let seedRadius = 4; // cells
  let brushErase = false;
  const brushChips = document.createElement("div");
  brushChips.className = "rd-chiprow";
  const seedChip = document.createElement("button");
  seedChip.type = "button";
  seedChip.className = "rd-chip";
  seedChip.textContent = "seed (U .5, V .25)";
  seedChip.title = "Paint the IC's own seed values — new growth wherever you draw.";
  const eraseChip = document.createElement("button");
  eraseChip.type = "button";
  eraseChip.className = "rd-chip";
  eraseChip.textContent = "erase (U 1, V 0)";
  eraseChip.title = "Paint the background state — carve dead zones and watch fronts re-invade.";
  const clearChip = document.createElement("button");
  clearChip.type = "button";
  clearChip.className = "rd-chip";
  clearChip.textContent = "clear field";
  clearChip.title = "Reload the initial condition for the current seed.";
  brushChips.append(seedChip, eraseChip, clearChip);
  brushGroup.appendChild(brushChips);
  const syncBrushChips = (): void => {
    seedChip.setAttribute("aria-pressed", String(!brushErase));
    eraseChip.setAttribute("aria-pressed", String(brushErase));
  };
  syncBrushChips();
  seedChip.addEventListener("click", () => {
    brushErase = false;
    syncBrushChips();
  });
  eraseChip.addEventListener("click", () => {
    brushErase = true;
    syncBrushChips();
  });
  clearChip.addEventListener("click", () => {
    void loadIC(panel.getState().seed);
    panel.setStatus("field cleared — reloaded the IC");
  });
  addSlider(brushGroup, "radius", 1, 16, 1, seedRadius, (v) => `${v} px`, (v) => {
    seedRadius = Math.round(v);
  });

  let seedCell: { x: number; y: number } | null = null;
  function pointerToCell(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    // render.wgsl maps fragment (u, v) -> state[(j*N + i)*2] with i = u*N,
    // j = (1-uv.y)*N (screen top = grid row 0 after its uv flip)
    return { x: Math.floor(u * N), y: Math.floor(v * N) };
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    seedCell = pointerToCell(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (seedCell) seedCell = pointerToCell(e);
  });
  const endSeed = (): void => {
    seedCell = null;
  };
  canvas.addEventListener("pointerup", endSeed);
  canvas.addEventListener("pointercancel", endSeed);
  function injectCursorSeed(): void {
    if (!seedCell) return;
    const bu = brushErase ? 1.0 : 0.5;
    const bv = brushErase ? 0.0 : 0.25;
    for (let dj = -seedRadius; dj <= seedRadius; dj += 1) {
      const j = seedCell.y + dj;
      if (j < 0 || j >= N) continue;
      const half = Math.floor(Math.sqrt(seedRadius * seedRadius - dj * dj));
      const i0 = Math.max(0, seedCell.x - half);
      const i1 = Math.min(N - 1, seedCell.x + half);
      if (i1 < i0) continue;
      const span = new Float32Array((i1 - i0 + 1) * 2);
      for (let c = 0; c < span.length; c += 2) {
        span[c] = bu;
        span[c + 1] = bv;
      }
      queue.writeBuffer(buffers[src]!, (j * N + i0) * 2 * 4, span);
    }
  }

  // --------------- INTERACT: Du/Dv/dt explorer (spec § 3.1, optional) -----
  // Default-collapsed. dt crossing the forward-Euler diffusive stability
  // bound ∆t ≤ ∆x²/(4·max(Du,Dv)) visibly blows the live field up — honest
  // numerics pedagogy (the EXPLAIN stability note is the theory side).
  // Live-loop only via the same `live` record; capture params are pinned.
  {
    const advGroup = panel.addGroup("advanced — diffusion & timestep", {
      open: false,
      hint: "Du / Dv / dt — push dt past the stability bound and watch the scheme blow up, honestly",
    });
    const body = document.createElement("div");
    advGroup.appendChild(body);

    const stabilityBound = (): number => (live.dx * live.dx) / (4 * Math.max(live.Du, live.Dv));
    const boundNote = document.createElement("div");
    boundNote.className = "rd-note-line";
    const syncBoundNote = (): void => {
      const b = stabilityBound();
      const over = live.dt > b;
      boundNote.textContent = over
        ? `dt ${live.dt.toFixed(2)} > stability bound ${b.toFixed(3)} — the explicit scheme is now honestly unstable; “clear field” recovers`
        : `diffusive stability bound: dt ≤ dx²/(4·max(Du,Dv)) = ${b.toFixed(3)} — canonical dt ${PARAMS.dt} sits inside`;
      boundNote.style.color = over ? "var(--bad)" : "";
    };

    const duS = addSlider(body, "Du", 0.02, 0.3, 0.005, live.Du, (v) => v.toFixed(3), (v) => {
      live.Du = v;
      syncBoundNote();
    });
    const dvS = addSlider(body, "Dv", 0.01, 0.2, 0.005, live.Dv, (v) => v.toFixed(3), (v) => {
      live.Dv = v;
      syncBoundNote();
    });
    const dtS = addSlider(
      body,
      "dt",
      0.2,
      2,
      0.05,
      live.dt,
      (v) => v.toFixed(2),
      (v) => {
        live.dt = v;
        syncBoundNote();
      },
      [{ v: 1.5625, title: "diffusive stability bound at canonical Du 0.16 — beyond here the scheme blows up" }],
    );
    const resetRow = document.createElement("div");
    resetRow.className = "rd-chiprow";
    const resetChip = document.createElement("button");
    resetChip.type = "button";
    resetChip.className = "rd-chip";
    resetChip.textContent = "back to canonical Du/Dv/dt";
    resetChip.addEventListener("click", () => {
      live.Du = PARAMS.Du;
      live.Dv = PARAMS.Dv;
      live.dt = PARAMS.dt;
      duS.input.value = String(live.Du);
      duS.val.textContent = duS.fmt(live.Du);
      dvS.input.value = String(live.Dv);
      dvS.val.textContent = dvS.fmt(live.Dv);
      dtS.input.value = String(live.dt);
      dtS.val.textContent = dtS.fmt(live.dt);
      syncBoundNote();
      panel.setStatus("Du/Dv/dt back to canonical");
    });
    resetRow.appendChild(resetChip);
    body.appendChild(resetRow);
    body.appendChild(boundNote);
    syncBoundNote();
  }

  // ------------------- always-on field diagnostics (spec § 3.1, measured) --
  const liveDiagGroup = panel.addGroup("field diagnostics — measured live");
  const liveDiagDl = document.createElement("dl");
  liveDiagDl.className = "bps-diag rd-diag-live";
  liveDiagGroup.appendChild(liveDiagDl);
  function updateLiveDiag(s: FieldStats): void {
    liveDiagDl.textContent = "";
    const rows: [string, string][] = [
      ["live step", String(stepCounter)],
      ["mass U · mass V", `${s.massU.toFixed(1)} · ${s.massV.toFixed(1)}`],
      ["peak V", s.peakV.toFixed(3)],
      ["V coverage", s.coverage.toFixed(4)],
    ];
    for (const [k, v] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      liveDiagDl.append(dt, dd);
    }
  }
  const liveDiagNote = document.createElement("div");
  liveDiagNote.className = "rd-note-line";
  liveDiagNote.textContent = "∫(U+V) is not conserved — the feed term forces it (see equations → code)";
  liveDiagGroup.appendChild(liveDiagNote);
  window.setInterval(() => {
    if (isCapturing() || suspended) return;
    const seq = ++diagSeq;
    void readState(src).then((st) => {
      if (seq !== diagSeq) return;
      updateLiveDiag(computeStats(st));
    });
  }, 700);

  // ------------------------------------ RENDER controls (spec § 3.4) ------
  const displayGroup = panel.addGroup("display");
  function addSelect(
    group: HTMLElement,
    label: string,
    options: readonly string[],
    value: string,
    onSet: (v: string) => void,
  ): HTMLSelectElement {
    const row = document.createElement("div");
    row.className = "rd-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    sel.className = "rd-select";
    for (const o of options) {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener("change", () => {
      onSet(sel.value);
    });
    row.append(lab, sel);
    group.appendChild(row);
    return sel;
  }
  addSelect(displayGroup, "view", VIEW_MODES, VIEW_MODES[viewMode]!, (v) => {
    viewMode = Math.max(0, VIEW_MODES.indexOf(v as (typeof VIEW_MODES)[number]));
    writeRenderUniform();
  });
  addSelect(displayGroup, "map", COLORMAPS.map((c) => c.name), colormapName, (v) => {
    colormapName = v;
    cmapPrimary = packColormap(getColormap(v));
    cmapSecondary = packColormap(ghostFor(v));
    writeRenderUniform();
  });
  addSlider(displayGroup, "relief", 0, 1, 0.01, relief, (v) => v.toFixed(2), (v) => {
    relief = v;
    writeRenderUniform();
  });
  addSlider(displayGroup, "glow", 0, 1, 0.01, glow, (v) => v.toFixed(2), (v) => {
    glow = v;
    writeRenderUniform();
  });
  addSlider(displayGroup, "exposure", 0.3, 3, 0.01, exposure, (v) => v.toFixed(2), (v) => {
    exposure = v;
    writeRenderUniform();
  });
  const rawRow = document.createElement("label");
  rawRow.className = "rd-check";
  const rawInput = document.createElement("input");
  rawInput.type = "checkbox";
  const rawText = document.createElement("span");
  rawText.textContent = "raw grid — what the buffer actually holds";
  rawRow.title =
    "Nearest-cell texels, lighting and glow bypassed: the honest 128² view. Everything smoother is display-side reconstruction of the same bytes.";
  rawRow.append(rawInput, rawText);
  displayGroup.appendChild(rawRow);
  rawInput.addEventListener("change", () => {
    rawGrid = rawInput.checked;
    writeRenderUniform();
  });
  const dispNote = document.createElement("div");
  dispNote.className = "rd-note-line";
  dispNote.textContent = "relief = lit gradient of the field · glow = |V − snapshot| — both derived from the data, never re-simulated";
  displayGroup.appendChild(dispNote);

  // EXPLAIN + PROVE layers (spec §§ 3.2–3.3)
  installExplainPanel(panel);
  installVerifyPanel({
    panel,
    device,
    queue,
    computePipeline,
    computeBGL: computeLayout,
    n: N,
    bufBytes,
    fetchCanonicalIC,
    writeCanonicalParams: (buf) => {
      writeStepParams(buf, PARAMS, 0);
    },
  });

  panel.setActivePreset("canonical");
  drawMinimap();

  await loadIC(V.canonical.seed);
  setBoot("");

  // Activity-glow snapshot cadence: every SNAP_FRAMES live frames (frame-
  // indexed — deterministic under the poster/loop RAF pump).
  const SNAP_FRAMES = 4;
  let frameCount = 0;

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      injectCursorSeed();
      for (let i = 0; i < stepsPerFrame; i += 1) stepLive();
      frameCount += 1;
      if (frameCount % SNAP_FRAMES === 0) snapshotState();
    }
    renderFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Mark the app booted for the headless smoke harness.
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
