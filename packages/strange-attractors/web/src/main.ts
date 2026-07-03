// Lorenz strange attractor — Stack-B WebGPU web build (verification-visible
// demo, verification-demo-spec.md).
//
// Ships the committed ../../src/lorenz_rk4.wgsl (the SAME RK4 integrator the
// wgpu-native gate runs): a compute pass integrates trajectories, a render
// stack draws them — additive ribbon + glow with optional afterglow trails,
// all presentation-side (spec § 3.4). Settings panel + capture-export re-emit
// the lorenz-trajectory descriptor (position + radius at the canonical sample
// steps).
//
// Correctness gate (web-build track, new-canonical): f32 RK4 of the chaotic
// Lorenz system diverges pointwise from the f64 canonical by the trajectory end
// — so the gate is structural attractor invariants (bounding box + spread) +
// run-twice byte-identical determinism, NOT a pointwise round-trip.
//
// HARD SEPARATION (spec § 6): the capture path reads ONLY the canonical
// `traj` buffer, integrated once at boot with the pinned seed-42 params.
// Sliders, presets, and the butterfly ghost integrate into live DISPLAY
// buffers (ruling D-P1.2(a) class); the render stack reads only those, and
// nothing render-side is read back into any capture.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
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

import computeWgsl from "../../src/lorenz_rk4.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";
import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";
import { installInstruments } from "./instruments.js";

const N_STEPS = 10000;
const CAPTURE_INTERVAL = 1000;
const SIGMA = 10.0;
const RHO = 28.0;
const BETA = 8.0 / 3.0;
const DT = 0.01;
const CANONICAL_IC: readonly [number, number, number] = [1, 1, 1];
// seed-42 grid jitter = 1e-6 * numpy default_rng(42).standard_normal(3)
const SEED42_OFFSET: readonly [number, number, number] = [
  3.047170797544313e-7, -1.0399841062404955e-6, 7.504511958064573e-7,
];
// butterfly ghost: displayed-only IC offset on x0 (stated in the UI copy)
const BUTTERFLY_DX = 1e-6;

// The data spine (src/generated/verification.json) carries the committed
// canonical params verbatim; the compute constants above must agree with it.
// Drift means the generated file is stale (or the constants changed) — fail
// loudly at boot rather than display values the kernel is not running.
if (
  V.canonical.params.sigma !== SIGMA ||
  V.canonical.params.rho !== RHO ||
  V.canonical.params.beta !== BETA ||
  V.canonical.params.dt !== DT
) {
  throw new Error("verification.json canonical params drifted from compute constants — rerun gen-verification.mjs");
}

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

// Per-sim presentation CSS (spec § 3): hand-rolled on the theme tokens; the
// shared theme.css surface is consumed, never edited. lz- namespace only.
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.lz-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.lz-row > label { color: var(--dim); min-width: 14px; flex: none; white-space: nowrap; }
.lz-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.lz-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 48px; flex: none; text-align: right; font-size: 11.5px; }
.lz-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.lz-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.lz-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 0; cursor: pointer; }
.lz-ticks { position: relative; height: 11px; font-size: 9px; color: var(--faint); }
.lz-ticks span { position: absolute; top: 0; transform: translateX(-50%); cursor: pointer; white-space: nowrap; }
.lz-ticks span:hover { color: var(--accent); }
.lz-ticks span:last-child { transform: translateX(-100%); }
.lz-check { display: flex; align-items: center; gap: 7px; margin: 7px 0; color: var(--dim);
  font-size: 11.5px; cursor: pointer; }
.lz-check input { accent-color: var(--accent); margin: 0; }
.lz-details summary { cursor: pointer; color: var(--dim); font-size: 11px; }
.lz-details[open] summary { color: var(--txt); margin-bottom: 4px; }
.lz-eq { margin: 8px 0; }
.lz-eq-math { color: var(--txt); font-size: 12.5px; margin-bottom: 3px; }
.lz-eq-math small { color: var(--faint); font-size: 9.5px; margin-left: 6px; }
.lz-code { display: block; font-size: 10px; color: var(--accent); background: rgba(0, 0, 0, .35);
  border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px;
  overflow-x: auto; white-space: pre; }
.lz-eq-link { font-size: 9.5px; color: var(--dim); text-decoration: none;
  border-bottom: 1px dotted var(--accent-d); }
.lz-eq-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
.lz-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-all; margin-top: 6px; }
.lz-hash b { color: var(--txt); font-weight: 500; }
.lz-hash .ok { color: var(--accent); }
.lz-hash .no { color: var(--bad); }
.lz-note-line { font-size: 10px; color: var(--warm); margin: 6px 0 2px; }
.lz-select { flex: 1; min-width: 0; font: inherit; font-size: 11.5px; color: var(--txt);
  background: rgba(0, 0, 0, .35); border: 1px solid var(--line); border-radius: 4px;
  padding: 2px 4px; outline: none; cursor: pointer; }
.lz-select:focus { border-color: var(--accent-d); }
.lz-chiprow { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
.lz-chip { font: inherit; font-size: 9.5px; color: var(--dim); background: rgba(0, 0, 0, .3);
  border: 1px solid var(--line); border-radius: 9px; padding: 1px 7px; cursor: pointer; }
.lz-chip:hover { color: var(--accent); border-color: var(--accent-d); }
.lz-inset { margin: 8px 0; }
.lz-inset-cap { font-size: 10px; color: var(--dim); margin-bottom: 3px; cursor: help; }
.lz-inset canvas { width: 100%; height: auto; display: block; background: rgba(0, 0, 0, .25);
  border: 1px solid var(--line); border-radius: 4px; }
`;
  document.head.appendChild(style);
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
    const px = Math.max(256, Math.round(css * dpr));
    canvas.width = px;
    canvas.height = px;
  }

  const nPoints = N_STEPS + 1;
  const trajBytes = nPoints * 3 * 4;
  const traj = device.createBuffer({
    size: trajBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // compute the canonical trajectory once (seed-42 IC) — the capture source
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
    dv.setFloat32(24, CANONICAL_IC[0] + SEED42_OFFSET[0], true);
    dv.setFloat32(28, CANONICAL_IC[1] + SEED42_OFFSET[1], true);
    dv.setFloat32(32, CANONICAL_IC[2] + SEED42_OFFSET[2], true);
    queue.writeBuffer(paramBuf, 0, pp);
  }

  const computeModule = device.createShaderModule({ code: computeWgsl, label: "lorenz" });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computePipeline = await device.createComputePipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const computeBG = device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer: paramBuf } },
      { binding: 1, resource: { buffer: traj } },
    ],
  });
  {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, computeBG);
    pass.dispatchWorkgroups(1);
    pass.end();
    queue.submit([enc.finish()]);
  }

  // Live-view trajectories (ruling D-P1.2(a)): the render stack reads ONLY
  // display buffers. liveTraj is seeded from the canonical trajectory at boot;
  // presets/sliders re-integrate the SAME committed kernel into it with their
  // own uniforms. ghostTraj holds the butterfly companion (IC + 1e-6 on x0).
  // The capture path never sees any of this: captureCanonical reads only
  // `traj` (canonical params, computed once above).
  const liveTraj = device.createBuffer({
    size: trajBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  const ghostTraj = device.createBuffer({
    size: trajBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const liveParamBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const ghostParamBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  {
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(traj, 0, liveTraj, 0, trajBytes);
    queue.submit([enc.finish()]);
  }
  const liveComputeBG = device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer: liveParamBuf } },
      { binding: 1, resource: { buffer: liveTraj } },
    ],
  });
  const ghostComputeBG = device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer: ghostParamBuf } },
      { binding: 1, resource: { buffer: ghostTraj } },
    ],
  });

  // ------------------------------------------------------- render stack --
  // spec § 3.4: HDR (rgba16float) additive ribbon + glow with 4x MSAA,
  // resolved per frame, accumulated with a blend-constant fade (trails),
  // tonemapped to the swapchain. Render passes only — no compute.
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const HDR: GPUTextureFormat = "rgba16float";
  const size = [canvas.width, canvas.height];
  const sceneTex = device.createTexture({
    size, format: HDR, sampleCount: 4, usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const frameTex = device.createTexture({
    size, format: HDR, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const accumTex = device.createTexture({
    size, format: HDR, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const sceneView = sceneTex.createView();
  const frameView = frameTex.createView();
  const accumView = accumTex.createView();
  const postSampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });

  // render.wgsl + the shared colormap sampler (data-driven mix chain over the
  // RU uniform stops — map switches are uniform writes, never pipeline builds)
  const renderModule = device.createShaderModule({
    code: renderWgsl + emitColormapWgsl({ stopsExpr: "ru.cmap", countExpr: "ru.cmap_meta.x" }),
    label: "lorenz-render",
  });
  const drawBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
    ],
  });
  const postBGL = device.createBindGroupLayout({
    entries: [
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });
  const drawLayout = device.createPipelineLayout({ bindGroupLayouts: [drawBGL] });
  const postLayout = device.createPipelineLayout({ bindGroupLayouts: [postBGL] });
  const emptyLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

  const additive: GPUBlendState = {
    color: { operation: "add", srcFactor: "one", dstFactor: "one" },
    alpha: { operation: "add", srcFactor: "one", dstFactor: "one" },
  };
  // dst × blend-constant: the trails fade (spec § 3.4 — no shader math)
  const fadeBlend: GPUBlendState = {
    color: { operation: "add", srcFactor: "zero", dstFactor: "constant" },
    alpha: { operation: "add", srcFactor: "zero", dstFactor: "constant" },
  };
  // src × blend-constant + dst: energy-compensated composite — the host sets
  // constant = 1 − trail, so steady-state luminance is trail-invariant
  const compositeBlend: GPUBlendState = {
    color: { operation: "add", srcFactor: "constant", dstFactor: "one" },
    alpha: { operation: "add", srcFactor: "constant", dstFactor: "one" },
  };

  const [linePipeline, glowPipeline, fadePipeline, compositePipeline, blitPipeline] = await Promise.all([
    device.createRenderPipelineAsync({
      layout: drawLayout,
      vertex: { module: renderModule, entryPoint: "vs_line" },
      fragment: { module: renderModule, entryPoint: "fs_line", targets: [{ format: HDR, blend: additive }] },
      primitive: { topology: "line-strip" },
      multisample: { count: 4 },
    }),
    device.createRenderPipelineAsync({
      layout: drawLayout,
      vertex: { module: renderModule, entryPoint: "vs_glow" },
      fragment: { module: renderModule, entryPoint: "fs_glow", targets: [{ format: HDR, blend: additive }] },
      primitive: { topology: "triangle-list" },
      multisample: { count: 4 },
    }),
    device.createRenderPipelineAsync({
      layout: emptyLayout,
      vertex: { module: renderModule, entryPoint: "vs_fs" },
      fragment: { module: renderModule, entryPoint: "fs_fade", targets: [{ format: HDR, blend: fadeBlend }] },
      primitive: { topology: "triangle-list" },
    }),
    device.createRenderPipelineAsync({
      layout: postLayout,
      vertex: { module: renderModule, entryPoint: "vs_fs" },
      fragment: { module: renderModule, entryPoint: "fs_composite", targets: [{ format: HDR, blend: compositeBlend }] },
      primitive: { topology: "triangle-list" },
    }),
    device.createRenderPipelineAsync({
      layout: postLayout,
      vertex: { module: renderModule, entryPoint: "vs_fs" },
      fragment: { module: renderModule, entryPoint: "fs_blit", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    }),
  ]);

  // RU = 16 base floats + packed colormap block (8×vec4 + meta) = 208 bytes
  const RU_FLOATS = 16 + PACKED_FLOATS;
  const RU_BYTES = RU_FLOATS * 4;
  const makeRU = (): GPUBuffer =>
    device.createBuffer({ size: RU_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const ruPrimaryBuf = makeRU();
  const ruGhostBuf = makeRU();
  // wall projections (spec § 3.1.c): three extra line-strip draws of the SAME
  // live display buffer with a flattened view — one RU per wall
  const ruProjBufs = [makeRU(), makeRU(), makeRU()] as const;
  const bindTraj = (ru: GPUBuffer, buf: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: drawBGL,
      entries: [
        { binding: 0, resource: { buffer: ru } },
        { binding: 1, resource: { buffer: buf } },
      ],
    });
  const drawBGPrimary = bindTraj(ruPrimaryBuf, liveTraj);
  const drawBGGhost = bindTraj(ruGhostBuf, ghostTraj);
  const drawBGProj = ruProjBufs.map((b) => bindTraj(b, liveTraj));
  // blit "look" uniforms (spec § 3.1.d): the former fs_blit magic constants,
  // now data — exposure, vignette, background theme
  const blitBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const postBGFrame = device.createBindGroup({
    layout: postBGL,
    entries: [
      { binding: 2, resource: postSampler },
      { binding: 3, resource: frameView },
      { binding: 4, resource: { buffer: blitBuf } },
    ],
  });
  const postBGAccum = device.createBindGroup({
    layout: postBGL,
    entries: [
      { binding: 2, resource: postSampler },
      { binding: 3, resource: accumView },
      { binding: 4, resource: { buffer: blitBuf } },
    ],
  });

  async function readBuffer(src: GPUBuffer): Promise<Float32Array<ArrayBuffer>> {
    const rb = device.createBuffer({ size: trajBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(src, 0, rb, 0, trajBytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const all = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return all;
  }

  // One readback path for BOTH the capture export and the Study diagnostics.
  // The capture path reads ONLY the canonical `traj` buffer — never liveTraj.
  function readTrajectory(): Promise<Float32Array<ArrayBuffer>> {
    return readBuffer(traj);
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("reading trajectory…");
    panel.setCaptureEnabled(false);
    resetCapture();
    const all = await readTrajectory();
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
    // payload checksum (the placeholder zeros were a false statement about an
    // artifact this path names), and the browser determinism claim. Step/state
    // arrays above are untouched — the gate compares those.
    exposeCapture(
      {
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
      },
      { download: false },
    );
    panel.setStatus(`capture ready — ${steps.length} sampled states (chaotic; new-canonical)`);
    panel.setCaptureEnabled(true);
  }

  // Named Lorenz-family regimes (house § 5.3, ruling D-P1.2(a)): live-loop
  // presets over the SAME committed kernel — now jump-to bookmarks on the
  // σ/ρ/β sliders (spec § 3.1). Names are the standard dynamical-systems
  // descriptions of these parameter ranges (σ=10, β=8/3 throughout): chaos at
  // ρ=28; stable fixed-point spirals below the ρ≈24.74 subcritical Hopf; the
  // well-known ρ≈99.65 periodic window; a single global limit cycle far above
  // the chaotic range.
  interface Regime {
    label: string;
    title: string;
    sigma: number;
    rho: number;
    beta: number;
  }
  const REGIMES: readonly Regime[] = [
    {
      label: "classic",
      title: "Lorenz 1963 — σ=10, ρ=28, β=8⁄3: the chaotic butterfly. The canonical capture regime.",
      sigma: SIGMA, rho: RHO, beta: BETA,
    },
    {
      label: "stable spiral",
      title: "ρ=15 — below the ρ≈24.74 chaos threshold: the trajectory spirals into one of the two fixed points.",
      sigma: 10, rho: 15, beta: 8 / 3,
    },
    {
      label: "periodic window",
      title: "ρ=99.65 — a known periodic window: the orbit closes into a repeating ribbon instead of wandering.",
      sigma: 10, rho: 99.65, beta: 8 / 3,
    },
    {
      label: "limit cycle",
      title: "ρ=350 — far past the chaotic range: one giant stable loop.",
      sigma: 10, rho: 350, beta: 8 / 3,
    },
  ];

  // ------------------------------------------------------ live-view state --
  const params = { sigma: SIGMA, rho: RHO, beta: BETA };
  let butterflyOn = false;
  let trail = 0.55;
  // display look state (spec § 3.1) — presentation-only; defaults reproduce
  // the pre-expansion output exactly, so poster/loop calibration is unchanged
  let colormapName = "aurora";
  let colorMode = 0; // 0 speed · 1 z-height · 2 age · 3 lobe · 4 curvature
  let projectionsOn = false;
  const BG_THEMES = [
    { name: "deep-space", mode: 0, base: [0.008, 0.011, 0.018] },
    { name: "paper", mode: 1, base: [0.94, 0.93, 0.9] },
    { name: "blueprint", mode: 0, base: [0.02, 0.055, 0.13] },
  ] as const;
  let bgTheme = 0;
  let exposure = 1.08;
  let vignette = 0.55;
  let cmapPrimary = packColormap(getColormap(colormapName));
  let cmapGhost = packColormap(ghostFor(colormapName));
  let paramsDirty = false; // consumed at most once per RAF (spec § 3.1 hot path)
  let suspended = false;
  let angle = 0;
  let rafQueued = false;

  function matchRegime(): Regime | null {
    return REGIMES.find((r) => r.sigma === params.sigma && r.rho === params.rho && r.beta === params.beta) ?? null;
  }

  function paramsPayload(dx: number, rhoOverride?: number): ArrayBuffer {
    const pp = new ArrayBuffer(48);
    const dv = new DataView(pp);
    dv.setUint32(0, N_STEPS, true);
    dv.setUint32(4, 0, true);
    dv.setFloat32(8, params.sigma, true);
    dv.setFloat32(12, rhoOverride ?? params.rho, true);
    dv.setFloat32(16, params.beta, true);
    dv.setFloat32(20, DT, true);
    dv.setFloat32(24, CANONICAL_IC[0] + SEED42_OFFSET[0] + dx, true);
    dv.setFloat32(28, CANONICAL_IC[1] + SEED42_OFFSET[1], true);
    dv.setFloat32(32, CANONICAL_IC[2] + SEED42_OFFSET[2], true);
    return pp;
  }

  // Re-integrate the SAME committed kernel into the live display buffer(s)
  // with the current slider params. One dispatch per trajectory; the render
  // pass reads the GPU buffer directly, so no CPU readback sits in the slider
  // hot path (spec § 3.1) — readbacks (fit, diagnostics) are low-rate.
  function integrateLive(): void {
    queue.writeBuffer(liveParamBuf, 0, paramsPayload(0));
    if (butterflyOn) queue.writeBuffer(ghostParamBuf, 0, paramsPayload(BUTTERFLY_DX));
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, liveComputeBG);
    pass.dispatchWorkgroups(1);
    if (butterflyOn) {
      pass.setBindGroup(0, ghostComputeBG);
      pass.dispatchWorkgroups(1);
    }
    pass.end();
    queue.submit([enc.finish()]);
    fitDirty = true;
  }

  // -------------------------------------------------- display-only framing --
  // P-6-ratified pattern (boids): fit_center/fit_scale render-uniform slots,
  // measured from low-rate readbacks of the DISPLAY buffer and damped per
  // frame. Buffers always hold raw physics values — Study diagnostics read
  // them un-framed, and slider sweeps never rewrite trajectory bytes.
  const FIT_TRIM = 500; // skip the fall-in transient when measuring the box
  const FIT_DAMP = 0.05; // per-frame exponential approach (frame-indexed)
  const fit = { cx: 0, cy: 0, cz: 25, scale: 0.035 }; // classic-calibrated seed
  const fitTarget = { ...fit };
  let fitDirty = false;
  let fitBusy = false;

  function measureFit(all: Float32Array): void {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    let found = false;
    for (let s = FIT_TRIM; s < nPoints; s += 1) {
      const x = all[s * 3]!, y = all[s * 3 + 1]!, z = all[s * 3 + 2]!;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      found = true;
      const v = [x, y, z];
      for (let i = 0; i < 3; i += 1) {
        if (v[i]! < lo[i]!) lo[i] = v[i]!;
        if (v[i]! > hi[i]!) hi[i] = v[i]!;
      }
    }
    if (!found) return; // diverged regime: keep the last good frame
    const half = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!, 2e-3) / 2;
    fitTarget.cx = (lo[0]! + hi[0]!) / 2;
    fitTarget.cy = (lo[1]! + hi[1]!) / 2;
    fitTarget.cz = (lo[2]! + hi[2]!) / 2;
    fitTarget.scale = 0.78 / half;
  }

  async function refreshFit(snap: boolean): Promise<void> {
    if (fitBusy) return;
    fitBusy = true;
    try {
      measureFit(await readBuffer(liveTraj));
      if (snap) Object.assign(fit, fitTarget);
    } finally {
      fitBusy = false;
    }
  }

  window.setInterval(() => {
    if (fitDirty && !isCapturing() && !fitBusy) {
      fitDirty = false;
      void refreshFit(suspended);
    }
  }, 200);

  // Study diagnostics (house § 5.4): measured from the displayed trajectory's
  // RAW values (buffers are never framed) — plus butterfly divergence when the
  // ghost is enabled. The sequence token drops superseded measurements.
  let diagSeq = 0;
  // instruments (spec § 3.2) install after the panel exists; diagnostics
  // feed them the same readback so Study costs one liveTraj map, not two
  let instruments: ReturnType<typeof installInstruments> | null = null;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const all = await readBuffer(liveTraj);
    const ghost = butterflyOn ? await readBuffer(ghostTraj) : null;
    if (seq !== diagSeq) return;
    instruments?.update(all, { ...params });
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let s = 0; s < nPoints; s += 1) {
      for (let i = 0; i < 3; i += 1) {
        const v = all[s * 3 + i]!;
        if (v < lo[i]!) lo[i] = v;
        if (v > hi[i]!) hi[i] = v;
      }
    }
    const fx = all[N_STEPS * 3]!, fy = all[N_STEPS * 3 + 1]!, fz = all[N_STEPS * 3 + 2]!;
    const r = (i: number): string => `${lo[i]!.toFixed(1)} … ${hi[i]!.toFixed(1)}`;
    const beta = params.beta === 8 / 3 ? "8/3" : String(params.beta);
    const rows = [
      { label: "live regime", value: matchRegime()?.label ?? "custom" },
      { label: "σ / ρ / β", value: `${params.sigma} / ${params.rho} / ${beta}` },
      { label: "integrator", value: `RK4, dt ${DT}` },
      { label: "steps", value: String(N_STEPS) },
      { label: "x range", value: r(0) },
      { label: "y range", value: r(1) },
      { label: "z range", value: r(2) },
      { label: "final |x|", value: Math.sqrt(fx * fx + fy * fy + fz * fz).toFixed(2) },
    ];
    if (ghost) {
      // sensitive dependence, measured: distance between the pair at the end,
      // and the first step where the 1e-6 IC offset has grown past 1
      let firstBig: number | null = null;
      for (let s = 0; s <= N_STEPS; s += 1) {
        const dx = all[s * 3]! - ghost[s * 3]!;
        const dy = all[s * 3 + 1]! - ghost[s * 3 + 1]!;
        const dz = all[s * 3 + 2]! - ghost[s * 3 + 2]!;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) > 1) {
          firstBig = s;
          break;
        }
      }
      const gx = ghost[N_STEPS * 3]!, gy = ghost[N_STEPS * 3 + 1]!, gz = ghost[N_STEPS * 3 + 2]!;
      const dFinal = Math.sqrt((fx - gx) ** 2 + (fy - gy) ** 2 + (fz - gz) ** 2);
      rows.push(
        { label: "‖Δ‖ at end (ghost)", value: dFinal.toExponential(2) },
        { label: "first ‖Δ‖ > 1", value: firstBig === null ? "never" : `step ${firstBig}` },
      );
      // live largest-Lyapunov estimate (spec § 3.2.c): least-squares slope of
      // ln‖Δ(t)‖ over the clean exponential-growth decades. The window is
      // ‖Δ‖ ∈ [1e-4, 1]: below 1e-4 the f32 pair sits near its rounding
      // noise floor (Δ₀ = 1e-6 ≈ f32 relative ε at state ~O(10)), above ~1
      // the separation starts saturating at attractor size — both regimes
      // bias the slope low. Measured, then compared to the literature value.
      let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
      for (let s = 1; s <= N_STEPS; s += 1) {
        const dx = all[s * 3]! - ghost[s * 3]!;
        const dy = all[s * 3 + 1]! - ghost[s * 3 + 1]!;
        const dz = all[s * 3 + 2]! - ghost[s * 3 + 2]!;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= 1) break; // saturation: past the exponential window
        if (d2 < 1e-8) continue; // f32 noise floor: not yet clean growth
        const t = s * DT;
        const y = 0.5 * Math.log(d2);
        sx += t; sy += y; sxx += t * t; sxy += t * y; m += 1;
      }
      const denomL = m * sxx - sx * sx;
      if (m >= 20 && denomL > 0) {
        const lam = (m * sxy - sx * sy) / denomL;
        const lit = matchRegime()?.label === "classic" ? " (lit. ≈ 0.9056)" : "";
        rows.push({ label: "λ₁, slope of ln‖Δ‖", value: `${lam.toFixed(3)}${lit}` });
      } else {
        rows.push({ label: "λ₁, slope of ln‖Δ‖", value: "n/a — separation saturated too fast" });
      }
    }
    rows.push({ label: "capture pinned to", value: "classic, seed 42" });
    panel.setDiagnostics(rows);
  }

  // Boot trace-in (P-7, presentation-only): the point/segment COUNT ramps over
  // the first TRACE_IN_FRAMES live frames, so the attractor draws itself in
  // integration order. Host-side draw-count only; frame-indexed, so it is
  // deterministic under the poster/loop generator's RAF pump. Re-armed on
  // preset change in Play; nothing here is read by the capture path.
  const TRACE_IN_FRAMES = 600;
  let traceFrame = 0;

  const ruData = new Float32Array(RU_FLOATS);
  function writeRU(buf: GPUBuffer, head: number, gain: number, cmap: Float32Array, proj: number): void {
    ruData[0] = canvas.width / canvas.height;
    ruData[1] = angle;
    ruData[2] = nPoints;
    ruData[3] = head;
    ruData[4] = fit.cx;
    ruData[5] = fit.cy;
    ruData[6] = fit.cz;
    ruData[7] = fit.scale;
    ruData[8] = 5.2 / canvas.height; // glow sprite half-size, clip units
    ruData[9] = gain;
    ruData[10] = DT;
    ruData[11] = colorMode;
    ruData[12] = proj;
    ruData[13] = 0;
    ruData[14] = 0;
    ruData[15] = 0;
    ruData.set(cmap, 16);
    queue.writeBuffer(buf, 0, ruData);
  }

  const blitData = new Float32Array(8);
  function writeBlit(): void {
    const t = BG_THEMES[bgTheme]!;
    blitData[0] = exposure;
    blitData[1] = vignette;
    blitData[2] = t.mode;
    blitData[3] = 0;
    blitData[4] = t.base[0];
    blitData[5] = t.base[1];
    blitData[6] = t.base[2];
    blitData[7] = 0;
    queue.writeBuffer(blitBuf, 0, blitData);
  }
  writeBlit();

  function renderFrame(): void {
    const drawn = Math.max(2, Math.min(nPoints, Math.ceil((nPoints * traceFrame) / TRACE_IN_FRAMES)));
    writeRU(ruPrimaryBuf, drawn - 1, 1.0, cmapPrimary, 0);
    if (butterflyOn) writeRU(ruGhostBuf, drawn - 1, 0.8, cmapGhost, 0);
    if (projectionsOn) {
      for (let k = 0; k < 3; k += 1) writeRU(ruProjBufs[k]!, drawn - 1, 0.22, cmapPrimary, k + 1);
    }
    const enc = device.createCommandEncoder();
    // 1. additive ribbon + glow into the MSAA scene, resolved to frameTex
    const scene = enc.beginRenderPass({
      colorAttachments: [
        {
          view: sceneView,
          resolveTarget: frameView,
          loadOp: "clear",
          storeOp: "discard",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });
    scene.setPipeline(linePipeline);
    if (projectionsOn) {
      // faint wall shadows first, so the primary ribbon reads over them
      for (const bg of drawBGProj) {
        scene.setBindGroup(0, bg);
        scene.draw(drawn);
      }
    }
    scene.setBindGroup(0, drawBGPrimary);
    scene.draw(drawn);
    if (butterflyOn) {
      scene.setBindGroup(0, drawBGGhost);
      scene.draw(drawn);
    }
    scene.setPipeline(glowPipeline);
    scene.setBindGroup(0, drawBGPrimary);
    scene.draw(drawn * 6);
    if (butterflyOn) {
      scene.setBindGroup(0, drawBGGhost);
      scene.draw(drawn * 6);
    }
    scene.end();
    // 2. trails: accum = accum × trail + frame (blend-constant fade, additive
    //    composite — render passes only, spec § 3.4)
    const accum = enc.beginRenderPass({
      colorAttachments: [{ view: accumView, loadOp: "load", storeOp: "store" }],
    });
    accum.setPipeline(fadePipeline);
    accum.setBlendConstant({ r: trail, g: trail, b: trail, a: trail });
    accum.draw(3);
    accum.setPipeline(compositePipeline);
    accum.setBindGroup(0, postBGFrame);
    const keep = 1 - trail;
    accum.setBlendConstant({ r: keep, g: keep, b: keep, a: keep });
    accum.draw(3);
    accum.end();
    // 3. tonemap to the swapchain
    const blit = enc.beginRenderPass({
      colorAttachments: [
        {
          view: gpuCanvas.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
        },
      ],
    });
    blit.setPipeline(blitPipeline);
    blit.setBindGroup(0, postBGAccum);
    blit.draw(3);
    blit.end();
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
    if (performance.now() - lastPointerMs > AUTO_ORBIT_IDLE_MS) angle += 0.003;
    if (traceFrame < TRACE_IN_FRAMES) traceFrame += 1;
    if (paramsDirty) {
      paramsDirty = false;
      integrateLive(); // at most one re-integration per RAF (spec § 3.1)
    }
    fit.cx += (fitTarget.cx - fit.cx) * FIT_DAMP;
    fit.cy += (fitTarget.cy - fit.cy) * FIT_DAMP;
    fit.cz += (fitTarget.cz - fit.cz) * FIT_DAMP;
    fit.scale += (fitTarget.scale - fit.scale) * FIT_DAMP;
    renderFrame();
    queueFrame();
  }

  // In Study (RAF suspended) a parameter change one-shot re-integrates,
  // re-measures and re-renders, debounced a frame's worth.
  let studyTimer = 0;
  function scheduleStudyApply(): void {
    window.clearTimeout(studyTimer);
    studyTimer = window.setTimeout(() => {
      if (!suspended || isCapturing()) return;
      if (paramsDirty) {
        paramsDirty = false;
        integrateLive();
      }
      void (async () => {
        fitDirty = false;
        await refreshFit(true);
        renderFrame();
        void measureStudyDiagnostics();
      })();
    }, 60);
  }

  function announceParams(): void {
    const m = matchRegime();
    panel.setActivePreset(m ? m.label : null);
    panel.setStatus(
      m
        ? `live view: ${m.label}${m.label === "classic" ? " — the canonical capture regime" : " — capture stays pinned to classic seed-42"}`
        : "live view: custom σ/ρ/β — capture stays pinned to classic seed-42",
    );
  }

  function onParamsChanged(): void {
    paramsDirty = true;
    announceParams();
    if (suspended) scheduleStudyApply();
  }

  async function applyRegime(r: Regime): Promise<void> {
    params.sigma = r.sigma;
    params.rho = r.rho;
    params.beta = r.beta;
    syncSliders();
    if (!suspended) traceFrame = 0; // re-trace the regime's trajectory in Play
    paramsDirty = true;
    announceParams();
    if (suspended) {
      paramsDirty = false;
      integrateLive();
      await refreshFit(true);
      renderFrame();
      void measureStudyDiagnostics();
    }
  }

  // Cursor-as-camera (house § 5.1, D-P1.2(a) class): drag orbits the cloud by
  // driving the SAME render-uniform `angle` slot the auto-orbit writes — live
  // loop only; nothing here is read by captureCanonical/readTrajectory. The
  // auto-orbit resumes after AUTO_ORBIT_IDLE_MS without pointer input; in
  // Study (RAF suspended) a drag one-shot-renders the frozen cloud instead.
  const AUTO_ORBIT_IDLE_MS = 4000;
  const DRAG_RAD_PER_PX = 0.008;
  let lastPointerMs = -AUTO_ORBIT_IDLE_MS; // boot: auto-orbit live immediately
  let dragPointer: number | null = null;
  let dragX = 0;
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", (e) => {
    dragPointer = e.pointerId;
    dragX = e.clientX;
    lastPointerMs = performance.now();
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragPointer !== e.pointerId) return;
    angle += (e.clientX - dragX) * DRAG_RAD_PER_PX;
    dragX = e.clientX;
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

  const panel = createSettingsPanel("Lorenz Attractor", {
    caption: "Three coupled equations, RK4-integrated into the butterfly that started chaos theory — deterministic, never repeating, forever on the attractor.",
    initial: { tier: "test", seed: V.canonical.seed },
    onCapture: captureCanonical,
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
        if (suspended) {
          // Frozen observation: settle any pending re-integration, snap the
          // fit, present once, then measure diagnostics from raw buffers.
          if (paramsDirty && !isCapturing()) {
            paramsDirty = false;
            integrateLive();
          }
          void (async () => {
            await refreshFit(true);
            renderFrame();
            void measureStudyDiagnostics();
          })();
        } else {
          queueFrame();
        }
      },
    },
    study: {
      diagnostics: [{ label: "diagnostics", value: "measuring…" }],
      honesty: {
        faithful:
          "the committed lorenz_rk4.wgsl — the exact f32 RK4 compute kernel the wgpu-native gate runs; every trajectory on screen (classic, presets, sliders, butterfly ghost) is that kernel re-integrated live on this GPU and drawn straight from its output buffer",
        simplified:
          "f32 on GPU — for a chaotic system the pointwise match to the f64 canonical decays by trajectory end, so the gate is structural (determinism + attractor envelope), not pointwise; sliders/presets/butterfly drive live display buffers only while the capture stays pinned to the classic seed-42 params; ribbon, glow, trails, wall projections and the damped auto-framing are render-side presentation over unmodified trajectory data (colour = a data-derived driver, finite-difference speed by default; colormap/theme/exposure are uniforms), and the boot trace-in is draw order, not re-integration",
        measured:
          "ranges — and butterfly divergence when enabled — read back from the displayed trajectory's raw values on entering Study and on parameter change; the capture reads the separate canonical buffer, integrated once at boot",
      },
      verdict: {
        gate: `${V.gate.kind} (two browser runs byte-identical; sampled points within the f64 attractor envelope — rel ${V.gate.tolerances.strange_minmaxstd_rel}, abs ${V.gate.tolerances.strange_mean_abs})`,
        verdict: "PASS",
        pass: true,
      },
      links: [
        { label: "sim spec", href: blobUrl(V.links.spec) },
        { label: "landing audit", href: blobUrl(V.links.audit) },
      ],
    },
  });

  // ---------------------------------------------- INTERACT: parameter group --
  const paramGroup = panel.addGroup("parameters — live re-integration");
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
    row.className = "lz-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const box = document.createElement("div");
    box.className = "lz-slider-box";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "lz-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const val = document.createElement("span");
    val.className = "lz-val";
    val.textContent = fmt(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = fmt(v);
      onSet(v);
    });
    box.appendChild(input);
    if (ticks) {
      const tickRow = document.createElement("div");
      tickRow.className = "lz-ticks";
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

  const fmtSigma = (v: number): string => v.toFixed(1);
  const fmtRho = (v: number): string => v.toFixed(2);
  const fmtBeta = (v: number): string => (v === 8 / 3 ? "8/3" : v.toFixed(3));
  const sSigma = addSlider(paramGroup, "σ", 1, 30, 0.1, params.sigma, fmtSigma, (v) => {
    params.sigma = v;
    onParamsChanged();
  });
  const sRho = addSlider(
    paramGroup,
    "ρ",
    0,
    350,
    0.05,
    params.rho,
    fmtRho,
    (v) => {
      params.rho = v;
      onParamsChanged();
    },
    [
      { v: 24.74, title: "subcritical Hopf — chaos onset" },
      { v: 99.65, title: "periodic window" },
      { v: 350, title: "global limit cycle" },
    ],
  );
  // the real Lorenz bifurcation sequence as clickable bookmarks (expansion
  // spec § 3.2.e) — chips instead of slider ticks because 1 / 13.93 / 24.06 /
  // 24.74 all land within 7% of the linear 0–350 track and labels collide
  {
    const RHO_MARKS = [
      { v: 1, label: "1 pitchfork", title: "ρ=1 — the origin loses stability; the C± fixed points are born" },
      { v: 13.93, label: "13.93 homoclinic", title: "ρ≈13.93 — homoclinic explosion; transient chaos appears" },
      { v: 24.06, label: "24.06 crisis", title: "ρ≈24.06 — the chaotic attractor becomes stable (coexists with C± until 24.74)" },
      { v: 24.74, label: "24.74 Hopf", title: "ρ≈24.74 — subcritical Hopf; C± lose stability, chaos is the only attractor" },
      { v: 99.65, label: "99.65 window", title: "ρ≈99.65 — a periodic window inside the chaotic range" },
    ];
    const chipRow = document.createElement("div");
    chipRow.className = "lz-chiprow";
    for (const mrk of RHO_MARKS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lz-chip";
      b.textContent = mrk.label;
      b.title = mrk.title;
      b.addEventListener("click", () => {
        params.rho = mrk.v;
        syncSliders();
        onParamsChanged();
      });
      chipRow.appendChild(b);
    }
    paramGroup.appendChild(chipRow);
  }
  const sBeta = addSlider(paramGroup, "β", 0.5, 5, 0.005, params.beta, fmtBeta, (v) => {
    params.beta = v;
    onParamsChanged();
  });

  function syncSliders(): void {
    for (const [h, v] of [
      [sSigma, params.sigma],
      [sRho, params.rho],
      [sBeta, params.beta],
    ] as const) {
      h.input.value = String(v);
      h.val.textContent = h.fmt(v);
    }
  }

  // butterfly toggle (spec § 3.1): a second live trajectory from an IC offset
  // by +1e-6 on x0 — same committed kernel, own display buffer, warm ramp
  const bfRow = document.createElement("label");
  bfRow.className = "lz-check";
  const bfInput = document.createElement("input");
  bfInput.type = "checkbox";
  const bfText = document.createElement("span");
  bfText.textContent = "butterfly ghost (+1e-6 on x₀)";
  bfRow.title =
    "Integrates a companion trajectory whose initial x differs by 1e-6 — sensitive dependence made visible. Display-only; the capture never sees it.";
  bfRow.append(bfInput, bfText);
  paramGroup.appendChild(bfRow);
  bfInput.addEventListener("change", () => {
    butterflyOn = bfInput.checked;
    paramsDirty = true; // integrate (or drop) the ghost on the next frame
    panel.setStatus(
      butterflyOn
        ? "butterfly ghost on — watch the warm twin peel away from a 1e-6 nudge"
        : "butterfly ghost off",
    );
    if (suspended) scheduleStudyApply();
  });

  // ------------------------------------------------ display (render) group --
  // All of it presentation-only (spec § 3.1): colormap + color-by drive the
  // RU uniform block, background/exposure/vignette drive the blit uniforms.
  // In Study (RAF suspended) any change one-shot re-renders the frozen cloud.
  const displayGroup = panel.addGroup("display");

  function displayChanged(): void {
    if (suspended && !isCapturing()) renderFrame();
  }

  function addSelect(
    group: HTMLElement,
    label: string,
    options: readonly string[],
    value: string,
    onSet: (v: string) => void,
  ): HTMLSelectElement {
    const row = document.createElement("div");
    row.className = "lz-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    sel.className = "lz-select";
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

  addSelect(displayGroup, "map", COLORMAPS.map((c) => c.name), colormapName, (v) => {
    colormapName = v;
    cmapPrimary = packColormap(getColormap(v));
    cmapGhost = packColormap(ghostFor(v));
    displayChanged();
  });
  const COLOR_MODES = ["speed", "z-height", "age", "lobe", "curvature"] as const;
  addSelect(displayGroup, "color by", COLOR_MODES, COLOR_MODES[colorMode]!, (v) => {
    colorMode = Math.max(0, COLOR_MODES.indexOf(v as (typeof COLOR_MODES)[number]));
    displayChanged();
  });
  addSelect(displayGroup, "theme", BG_THEMES.map((t) => t.name), BG_THEMES[bgTheme]!.name, (v) => {
    bgTheme = Math.max(0, BG_THEMES.findIndex((t) => t.name === v));
    writeBlit();
    displayChanged();
  });
  addSlider(displayGroup, "exposure", 0.3, 3, 0.01, exposure, (v) => v.toFixed(2), (v) => {
    exposure = v;
    writeBlit();
    displayChanged();
  });
  addSlider(displayGroup, "vignette", 0, 1, 0.01, vignette, (v) => v.toFixed(2), (v) => {
    vignette = v;
    writeBlit();
    displayChanged();
  });
  addSlider(displayGroup, "trail", 0, 0.94, 0.01, trail, (v) => v.toFixed(2), (v) => {
    trail = v;
    displayChanged();
  });
  const projRow = document.createElement("label");
  projRow.className = "lz-check";
  const projInput = document.createElement("input");
  projInput.type = "checkbox";
  const projText = document.createElement("span");
  projText.textContent = "wall projections (XY / XZ / YZ)";
  projRow.title =
    "Faint shadow of the trajectory flattened onto each axis plane — extra draws of the same display buffer; presentation only.";
  projRow.append(projInput, projText);
  displayGroup.appendChild(projRow);
  projInput.addEventListener("change", () => {
    projectionsOn = projInput.checked;
    displayChanged();
  });
  const trailNote = document.createElement("div");
  trailNote.className = "lz-note-line";
  trailNote.textContent = "afterglow trails — render-side accumulation, zero = off";
  displayGroup.appendChild(trailNote);

  // ------------------------------------- instruments (expansion spec § 3.2) --
  // Measured from Study readbacks of the DISPLAY buffer; the bifurcation
  // sweep re-dispatches the committed kernel into a dedicated scratch buffer
  // (PROVE pattern) — the capture path and liveTraj are never touched.
  const instrumentsGroup = panel.addGroup("instruments — measured, not asserted");
  {
    const sweepParamBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const sweepScratch = device.createBuffer({
      size: trajBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const sweepRB = device.createBuffer({ size: trajBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const sweepBG = device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: { buffer: sweepParamBuf } },
        { binding: 1, resource: { buffer: sweepScratch } },
      ],
    });
    instruments = installInstruments({
      group: instrumentsGroup,
      nPoints,
      dt: DT,
      integrateScratch: async (rho, out) => {
        queue.writeBuffer(sweepParamBuf, 0, paramsPayload(0, rho));
        const enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, sweepBG);
        pass.dispatchWorkgroups(1);
        pass.end();
        enc.copyBufferToBuffer(sweepScratch, 0, sweepRB, 0, trajBytes);
        queue.submit([enc.finish()]);
        await sweepRB.mapAsync(GPUMapMode.READ);
        out.set(new Float32Array(sweepRB.getMappedRange()));
        sweepRB.unmap();
      },
    });
  }

  // EXPLAIN + PROVE layers (spec §§ 3.2–3.3)
  installExplainPanel(panel);
  installVerifyPanel({
    panel,
    device,
    queue,
    computePipeline,
    computeBGL,
    paramBuf,
    trajBytes,
    readCanonical: readTrajectory,
  });

  panel.setActivePreset("classic");

  // boot framing: measure the canonical trajectory once and snap the fit —
  // the poster/loop path (classic, no param changes) is then fully
  // deterministic, no async fit updates in flight
  measureFit(await readTrajectory());
  Object.assign(fit, fitTarget);

  boot.textContent = "";
  queueFrame();
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
