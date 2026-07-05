// curl-noise — WebGPU verification demo (web spec v0.3).
//
// Grid-free analytic per-tracer field: no solver step, no velocity texture
// (texture-bake destroys pointwise incompressibility — Curl-Flow). The
// spectacle is pure tracer count + the persistence-trail post stack; the
// moat is the PROVE layer + the live-f64 web gate (_gate_curl_noise).

import "../../../../common/common-web/src/theme.css";
import {
  exposeCapture,
  isCapturing,
  runCaptureExclusive,
} from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";
import {
  COLORMAPS,
  emitColormapWgsl,
  getColormap,
  packColormap,
} from "../../../../common/common-web/src/colormap.js";
import {
  createSettingsPanel,
  type DiagnosticRow,
} from "../../../../common/common-web/src/panel-shell.js";
import fieldWgsl from "./field.wgsl?raw";
import instrumentsWgsl from "./instruments.wgsl?raw";
import tracersWgsl from "./tracers.wgsl?raw";
import trailsWgsl from "./trails.wgsl?raw";
import { loadGateIc, makeBundle, sha256hex, field, type GateIc } from "./capture.js";
import { CANONICAL_KEY, TEMPLATES, getTemplate, type TemplateDef } from "./presets.js";
import { VerifyPanel, type InstrumentAggregates } from "./verify-panel.js";

// ---------------------------------------------------------------------------
// tiny mat4 helpers (column-major, WebGPU clip conventions)
// ---------------------------------------------------------------------------
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
  const f = eye.map((e) => -e / dist); // toward origin
  const up = [0, 1, 0];
  const s = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]];
  const sl = Math.hypot(...s) || 1;
  const sn = s.map((v) => v / sl);
  const u = [sn[1] * f[2] - sn[2] * f[1], sn[2] * f[0] - sn[0] * f[2], sn[0] * f[1] - sn[1] * f[0]];
  const out = new Float32Array(16);
  out[0] = sn[0]; out[4] = sn[1]; out[8] = sn[2];
  out[1] = u[0]; out[5] = u[1]; out[9] = u[2];
  out[2] = -f[0]; out[6] = -f[1]; out[10] = -f[2];
  out[12] = -(sn[0] * eye[0] + sn[1] * eye[1] + sn[2] * eye[2]);
  out[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
  out[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
  out[15] = 1;
  return out;
}

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
const CONSTRUCTION_ID: Record<string, number> = { crossprod: 0, curl3d: 1, curl2d: 2, abc: 3 };

interface RenderState {
  template: TemplateDef;
  count: number;
  rk4: boolean;
  reproject: boolean;
  wrap: boolean;
  colorMode: number;
  colormap: string;
  trailFade: number;
  bloom: number;
  stretch: number;
  exposure: number;
  size: number;
  dt: number;
  timePan: number;
  octaves: number;
  ell0: number;
  gain: number;
  paused: boolean;
  autoOrbit: boolean;
}

const st: RenderState = {
  template: getTemplate(CANONICAL_KEY),
  count: 262144,
  rk4: false,
  reproject: true,
  wrap: true,
  colorMode: 0,
  colormap: "aurora",
  trailFade: 0.96,
  bloom: 0.6,
  stretch: 2.0,
  exposure: 1.0,
  size: 0.0016,
  dt: 0.0016,
  timePan: 0,
  octaves: 3,
  ell0: 0.5,
  gain: 0.5,
  paused: false,
  autoOrbit: true,
};

let simTime = 0;
let gustVec: [number, number, number] = [0, 0, 0];
let gustUntil = 0;
let brush = { x: 0.5, y: 0.5, z: 0.5, amp: 0, sigma: 0.12, ax: 0, ay: 0, az: 1 };
let attractorPos: [number, number, number] = [0.5, 0.5, 0.5];
let obstacleCenter: [number, number, number] = [0.5, 0.5, 0.5];
let cam = { yaw: 0.6, pitch: 0.35, dist: 1.9 };
let ungatedReason = "";

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const canvas = document.getElementById("view") as HTMLCanvasElement;
  if (!navigator.gpu) {
    (document.getElementById("nogpu") as HTMLElement).style.display = "block";
    return;
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) {
    (document.getElementById("nogpu") as HTMLElement).style.display = "block";
    return;
  }
  const device = await adapter.requestDevice();
  device.addEventListener("uncapturederror", (ev) => {
    // pic-flip lesson: silent bind-group mismatches discard submits — surface loudly
    console.error("WebGPU uncaptured error:", (ev as GPUUncapturedErrorEvent).error.message);
  });
  const adapterInfo = `${adapter.info?.vendor ?? "?"}/${adapter.info?.architecture ?? "?"}`;

  const ctx = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const css = canvas.clientWidth || 720;
  canvas.width = Math.round(css * dpr);
  canvas.height = Math.round(css * dpr);
  ctx.configure({ device, format, alphaMode: "opaque" });

  // --- shader modules -------------------------------------------------------
  const cmapFn = emitColormapWgsl({
    stopsExpr: "CM.stops",
    countExpr: "CM.cmeta.x",
    fnName: "colormap_sample",
  });
  const cmapStruct = `
struct CU { stops: array<vec4<f32>, 8>, cmeta: vec4<f32> }
@group(0) @binding(6) var<uniform> CM: CU;
`;
  const tracerModule = device.createShaderModule({
    code: fieldWgsl + cmapStruct + cmapFn + tracersWgsl,
  });
  const instModule = device.createShaderModule({ code: fieldWgsl + instrumentsWgsl });
  const trailsModule = device.createShaderModule({ code: trailsWgsl });

  // --- buffers ---------------------------------------------------------------
  const MAX_TRACERS = 4 << 20;
  const tracerBuf = device.createBuffer({
    size: MAX_TRACERS * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const f0Buf = device.createBuffer({
    size: MAX_TRACERS * 8,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const fuBuf = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const tuBuf = device.createBuffer({ size: 224, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cmBuf = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const puBuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const puBufH = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const puBufV = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // probes: 1024 volume + 256 surface
  const N_VOL = 1024, N_SURF = 256, N_PROBE = N_VOL + N_SURF;
  const probeData = new Float32Array(N_PROBE * 4);
  {
    let s = 12345;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
    for (let i = 0; i < N_VOL; i++) {
      probeData.set([0.08 + 0.84 * rnd(), 0.08 + 0.84 * rnd(), 0.08 + 0.84 * rnd(), 0], i * 4);
    }
    for (let i = 0; i < N_SURF; i++) {
      const th = Math.acos(2 * rnd() - 1), ph = 2 * Math.PI * rnd();
      probeData.set(
        [
          0.5 + 0.18 * Math.sin(th) * Math.cos(ph),
          0.5 + 0.18 * Math.sin(th) * Math.sin(ph),
          0.5 + 0.18 * Math.cos(th),
          1,
        ],
        (N_VOL + i) * 4,
      );
    }
  }
  const probeBuf = device.createBuffer({
    size: probeData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(probeBuf, 0, probeData);
  const INST_FLOATS = 12;
  const instBuf = device.createBuffer({
    size: N_PROBE * INST_FLOATS * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const instRead = device.createBuffer({
    size: N_PROBE * INST_FLOATS * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  // box + obstacle wireframe
  const lineVerts = new Float32Array(1024 * 4);
  const lineBuf = device.createBuffer({
    size: lineVerts.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  let lineCount = 0;
  function rebuildLines(): void {
    const v: number[] = [];
    const push = (a: number[], b: number[]) => v.push(...a, 0, ...b, 0);
    const c = [0, 1];
    for (const x of c) for (const y of c) push([x, y, 0], [x, y, 1]);
    for (const x of c) for (const z of c) push([x, 0, z], [x, 1, z]);
    for (const y of c) for (const z of c) push([0, y, z], [1, y, z]);
    const t = st.template;
    if (t.obstacle) {
      const [cx, cy, cz] = obstacleCenter;
      const r = t.obstacle.radius;
      const SEG = 48;
      for (const plane of [0, 1, 2]) {
        for (let i = 0; i < SEG; i++) {
          const a0 = (2 * Math.PI * i) / SEG, a1 = (2 * Math.PI * (i + 1)) / SEG;
          const p = (a: number) =>
            plane === 0
              ? [cx, cy + r * Math.cos(a), cz + r * Math.sin(a)]
              : plane === 1
                ? [cx + r * Math.cos(a), cy, cz + r * Math.sin(a)]
                : [cx + r * Math.cos(a), cy + r * Math.sin(a), cz];
          push(p(a0), p(a1));
        }
      }
    }
    lineCount = v.length / 4;
    lineVerts.set(v);
    device.queue.writeBuffer(lineBuf, 0, lineVerts, 0, v.length);
  }

  // --- trail / bloom targets --------------------------------------------------
  const mkTex = (w: number, h: number) =>
    device.createTexture({
      size: [w, h],
      format: "rgba16float",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
  let trailA = mkTex(canvas.width, canvas.height);
  let trailB = mkTex(canvas.width, canvas.height);
  const bw = canvas.width >> 1, bh = canvas.height >> 1;
  const bloomA = mkTex(bw, bh);
  const bloomB = mkTex(bw, bh);
  const samp = device.createSampler({ magFilter: "linear", minFilter: "linear" });

  // --- pipelines ---------------------------------------------------------------
  const advectPipe = device.createComputePipeline({
    layout: "auto",
    compute: { module: tracerModule, entryPoint: "advect" },
  });
  const seedPipe = device.createComputePipeline({
    layout: "auto",
    compute: { module: tracerModule, entryPoint: "seed" },
  });
  const anchorPipe = device.createComputePipeline({
    layout: "auto",
    compute: { module: tracerModule, entryPoint: "anchor_f0" },
  });
  const instPipe = device.createComputePipeline({
    layout: "auto",
    compute: { module: instModule, entryPoint: "instruments" },
  });
  const tracerRenderPipe = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: tracerModule, entryPoint: "vs_tracer" },
    fragment: {
      module: tracerModule,
      entryPoint: "fs_tracer",
      targets: [
        {
          format: "rgba16float",
          blend: {
            color: { srcFactor: "one", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });
  const linePipe = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: tracerModule, entryPoint: "vs_line" },
    fragment: {
      module: tracerModule,
      entryPoint: "fs_line",
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        },
      ],
    },
    primitive: { topology: "line-list" },
  });
  const mkPost = (entry: string, target: GPUTextureFormat) =>
    device.createRenderPipeline({
      layout: "auto",
      vertex: { module: trailsModule, entryPoint: "vs_fullscreen" },
      fragment: { module: trailsModule, entryPoint: entry, targets: [{ format: target }] },
      primitive: { topology: "triangle-list" },
    });
  const fadePipe = mkPost("fs_fade", "rgba16float");
  const brightPipe = mkPost("fs_bright", "rgba16float");
  const blurPipe = mkPost("fs_blur", "rgba16float");
  const compositePipe = mkPost("fs_composite", format);

  // --- bind groups -------------------------------------------------------------
  const mkComputeBG = (pipe: GPUComputePipeline, tBuf: GPUBuffer, fBuf: GPUBuffer) =>
    device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: fuBuf } },
        { binding: 1, resource: { buffer: tuBuf } },
        { binding: 2, resource: { buffer: tBuf } },
        { binding: 3, resource: { buffer: fBuf } },
      ],
    });
  let advectBG = mkComputeBG(advectPipe, tracerBuf, f0Buf);
  let seedBG = mkComputeBG(seedPipe, tracerBuf, f0Buf);
  let anchorBG = mkComputeBG(anchorPipe, tracerBuf, f0Buf);
  const instBG = device.createBindGroup({
    layout: instPipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: fuBuf } },
      { binding: 1, resource: { buffer: probeBuf } },
      { binding: 2, resource: { buffer: instBuf } },
    ],
  });
  const tracerRenderBG = device.createBindGroup({
    layout: tracerRenderPipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: fuBuf } },
      { binding: 1, resource: { buffer: tuBuf } },
      { binding: 4, resource: { buffer: tracerBuf } },
      { binding: 5, resource: { buffer: f0Buf } },
      { binding: 6, resource: { buffer: cmBuf } },
    ],
  });
  const lineBG = device.createBindGroup({
    layout: linePipe.getBindGroupLayout(0),
    entries: [
      // layout:"auto" prunes unused bindings — vs_line/fs_line touch only TU + verts
      { binding: 1, resource: { buffer: tuBuf } },
      { binding: 7, resource: { buffer: lineBuf } },
    ],
  });
  // layout:"auto" prunes unused bindings: only fs_composite touches bloomTex(3)
  const postBG = (
    pipe: GPURenderPipeline,
    pu: GPUBuffer,
    src: GPUTexture,
    bloom?: GPUTexture,
  ) =>
    device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pu } },
        { binding: 1, resource: src.createView() },
        { binding: 2, resource: samp },
        ...(bloom ? [{ binding: 3, resource: bloom.createView() }] : []),
      ],
    });

  // --- uniform packing -----------------------------------------------------------
  const fuData = new Float32Array(36);
  function writeFU(forCapture = false): void {
    const t = st.template;
    const obs = t.obstacle;
    fuData.set(obs ? [...obstacleCenter, obs.radius] : [0, 0, 0, 0], 0);
    fuData.set([obs?.ramp ?? 0.15, obs?.namp ?? 1.0, 0.37, forCapture ? 0 : simTime * st.timePan], 4);
    fuData.set([st.ell0, st.template.lacunarity, st.gain, t.amplitude], 8);
    fuData.set(
      [CONSTRUCTION_ID[t.construction], forCapture ? t.octaves : st.octaves, 0, t.boundary2d ?? 0],
      12,
    );
    const g = forCapture ? [0, 0, 0] : gustVec;
    fuData.set([...g, 0], 16);
    fuData.set(forCapture ? [0, 0, 0, 0] : [brush.x, brush.y, brush.z, brush.amp], 20);
    fuData.set([brush.ax, brush.ay, brush.az, brush.sigma], 24);
    const att = !forCapture && t.attractor ? 3.0 : 0.0;
    fuData.set([...attractorPos, att], 28);
    fuData.set(t.abc ? [...t.abc, 0] : [1, 1, 1, 0], 32);
    device.queue.writeBuffer(fuBuf, 0, fuData);
  }

  const tuData = new ArrayBuffer(224);
  const tuF = new Float32Array(tuData);
  const tuU = new Uint32Array(tuData);
  function writeTU(overrides?: Partial<{ dt: number; count: number; wrap: number; reproject: number; rk4: number }>): void {
    const aspect = canvas.width / canvas.height;
    tuF.set(lookAtOrbit(cam.yaw, cam.pitch, cam.dist), 0);
    tuF.set(perspective(0.9, aspect, 0.05, 20), 16);
    tuF[32] = overrides?.dt ?? st.dt;
    tuU[33] = overrides?.count ?? st.count;
    tuU[34] = st.colorMode;
    tuF[35] = st.size;
    tuF[36] = 2.5 * st.template.amplitude * (st.template.construction === "abc" ? 1 : 8);
    tuU[37] = 42;
    tuF[38] = 14.0; // max_age (sim seconds)
    tuU[39] = overrides?.rk4 ?? (st.rk4 ? 1 : 0);
    // overdraw guards (web spec § 5): steady-state trail gain is
    // 1/(1-fade); splat energy is normalized by it and by tracer count
    const trailGain = 1.0 / Math.max(1.0 - st.trailFade, 0.04);
    tuF[40] = (2.6 / trailGain) * Math.sqrt(262144 / Math.max(st.count, 1024));
    tuU[41] = overrides?.wrap ?? (st.wrap ? 1 : 0);
    tuU[42] = overrides?.reproject ?? (st.reproject && st.timePan === 0 ? 1 : 0);
    tuF[43] = st.stretch;
    tuU[44] = st.template.seedType ?? 0;
    tuF[45] = st.exposure;
    tuF.set([0.5, 0.5, 0.5], 48);
    tuF[51] = 0.3; // seed radius
    tuF[55] = 0.06; // seed thick
    device.queue.writeBuffer(tuBuf, 0, tuData);
  }

  function writeColormap(): void {
    device.queue.writeBuffer(cmBuf, 0, packColormap(getColormap(st.colormap)));
  }

  function writePost(): void {
    device.queue.writeBuffer(puBuf, 0, new Float32Array([st.trailFade, st.exposure * 1.4, st.bloom, 0.35, 0, 0, 0, 0]));
    device.queue.writeBuffer(puBufH, 0, new Float32Array([0, 1, 0, 0, 1.6 / bw, 0, 0, 0]));
    device.queue.writeBuffer(puBufV, 0, new Float32Array([0, 1, 0, 0, 0, 1.6 / bh, 0, 0]));
  }

  // --- sim control -----------------------------------------------------------------
  function reseed(): void {
    writeFU();
    writeTU();
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(seedPipe);
    pass.setBindGroup(0, seedBG);
    pass.dispatchWorkgroups(Math.ceil(st.count / 256));
    pass.end();
    device.queue.submit([enc.finish()]);
  }
  function reanchor(): void {
    writeFU();
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(anchorPipe);
    pass.setBindGroup(0, anchorBG);
    pass.dispatchWorkgroups(Math.ceil(st.count / 256));
    pass.end();
    device.queue.submit([enc.finish()]);
  }

  function applyTemplate(key: string): void {
    const t = getTemplate(key);
    st.template = t;
    st.dt = t.dt;
    st.colorMode = t.colorMode;
    st.octaves = t.octaves;
    st.ell0 = t.ell0;
    st.gain = t.gain;
    st.reproject = t.reproject ?? false;
    st.timePan = t.timePan;
    obstacleCenter = t.obstacle ? [...t.obstacle.center] : [0.5, 0.5, 0.5];
    gustVec = t.gustDemo ? [0.25, 0, 0] : [0, 0, 0];
    brush.amp = 0;
    ungatedReason = t.gated ? "" : "anti-demo: velocity-space attractor (a pure sink)";
    verifyPanel.setGated(t.gated, ungatedReason || "analytic div-free construction");
    rebuildLines();
    reseed();
    simTime = 0;
    shell.setActivePreset(t.label);
    syncControls();
  }

  // --- panels ------------------------------------------------------------------------
  const verifyPanel = new VerifyPanel();
  document.body.appendChild(verifyPanel.element);

  const extra = document.createElement("div");
  const shell = createSettingsPanel("curl-noise — provably divergence-free flow field", {
    initial: { tier: "test", seed: 42 },
    caption:
      "Bridson 2007 curl noise + the divergence-free-noise frontier: millions of analytically-advected tracers, machine-exact incompressibility instruments, and the one honest sentence — this looks like fluid without being fluid (our phrasing; no Navier–Stokes solve).",
    onCapture: () => captureGate(),
    presets: TEMPLATES.map((t) => ({
      label: t.label,
      title: t.caption,
      apply: () => applyTemplate(t.key),
    })),
    modes: { initial: "play" },
    study: {
      diagnostics: [],
      honesty: {
        faithful:
          "Analytic simplex-noise constructions (2D rot ψ, 3D ∇×ψ, cross-product ∇f₁×∇f₂), exact-integer hash, SDF boundaries, RK2/RK4 + 1-iteration Newton reprojection — the backend f64 reference algorithm, per point, in f32.",
        simplified:
          "Display cloud wraps the unit box and respawns by age (the GATE capture does neither); trails/bloom are post-fx; interaction brushes are ψ-space potentials (div-free) except the deliberate anti-demo.",
        measured: "2026-07-05 on this repo's RADV + lavapipe CI (tolerances in tolerance.toml).",
      },
      verdict: {
        gate: "run-twice byte-identity + live-f64 iso-residual (chaos-immune)",
        verdict: "capture to run",
        pass: true,
      },
      links: [
        {
          label: "spec-ref (backend contract)",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/closed-form/curl-noise/spec-ref.md",
        },
        {
          label: "web verification spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/packages/curl-noise/web/verification-demo-spec.md",
        },
      ],
    },
    extra,
  });

  // control sliders
  const controlDefs: {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    get: () => number;
    set: (v: number) => void;
    onSet?: () => void;
  }[] = [
    { id: "count", label: "tracers (k)", min: 32, max: 4096, step: 32, get: () => st.count / 1024, set: (v) => (st.count = Math.min(MAX_TRACERS, Math.round(v) * 1024)), onSet: () => reseed() },
    { id: "dt", label: "dt (×1e-3)", min: 0.2, max: 6, step: 0.1, get: () => st.dt * 1e3, set: (v) => (st.dt = v / 1e3) },
    { id: "oct", label: "octaves", min: 1, max: 6, step: 1, get: () => st.octaves, set: (v) => (st.octaves = v), onSet: () => reanchor() },
    { id: "ell", label: "noise scale ℓ₀", min: 0.2, max: 1.2, step: 0.05, get: () => st.ell0, set: (v) => (st.ell0 = v), onSet: () => reanchor() },
    { id: "gain", label: "gain (roughness)", min: 0.25, max: 0.75, step: 0.05, get: () => st.gain, set: (v) => (st.gain = v), onSet: () => reanchor() },
    { id: "pan", label: "time-pan speed", min: 0, max: 0.5, step: 0.02, get: () => st.timePan, set: (v) => (st.timePan = v) },
    { id: "fade", label: "trail persistence", min: 0, max: 0.985, step: 0.005, get: () => st.trailFade, set: (v) => (st.trailFade = v), onSet: () => writePost() },
    { id: "bloom", label: "bloom", min: 0, max: 2, step: 0.1, get: () => st.bloom, set: (v) => (st.bloom = v), onSet: () => writePost() },
    { id: "stretch", label: "velocity stretch", min: 0, max: 6, step: 0.25, get: () => st.stretch, set: (v) => (st.stretch = v) },
    { id: "expo", label: "exposure", min: 0.2, max: 3, step: 0.1, get: () => st.exposure, set: (v) => (st.exposure = v), onSet: () => writePost() },
    { id: "size", label: "sprite size", min: 0.4, max: 5, step: 0.2, get: () => st.size * 1e3, set: (v) => (st.size = v / 1e3) },
  ];
  const sliderEls = new Map<string, HTMLInputElement>();
  {
    const group = shell.addGroup("field & render");
    for (const c of controlDefs) {
      const rowEl = document.createElement("label");
      rowEl.className = "cn-ctl";
      const span = document.createElement("span");
      span.textContent = c.label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(c.min);
      input.max = String(c.max);
      input.step = String(c.step);
      input.value = String(c.get());
      input.addEventListener("input", () => {
        c.set(Number(input.value));
        c.onSet?.();
      });
      rowEl.append(span, input);
      group.appendChild(rowEl);
      sliderEls.set(c.id, input);
    }
    const toggles: { label: string; get: () => boolean; set: (b: boolean) => void; onSet?: () => void }[] = [
      { label: "RK4 (vs RK2)", get: () => st.rk4, set: (b) => (st.rk4 = b) },
      { label: "Newton reprojection (1 iter)", get: () => st.reproject, set: (b) => (st.reproject = b) },
      { label: "auto-orbit", get: () => st.autoOrbit, set: (b) => (st.autoOrbit = b) },
      { label: "pause", get: () => st.paused, set: (b) => (st.paused = b) },
    ];
    for (const t of toggles) {
      const rowEl = document.createElement("label");
      rowEl.className = "cn-ctl";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = t.get();
      input.addEventListener("change", () => {
        t.set(input.checked);
        t.onSet?.();
      });
      const span = document.createElement("span");
      span.textContent = t.label;
      rowEl.append(input, span);
      group.appendChild(rowEl);
    }
    const cmSel = document.createElement("select");
    for (const m of [...COLORMAPS.map((c) => c.name)]) {
      const o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      cmSel.appendChild(o);
    }
    cmSel.value = st.colormap;
    cmSel.addEventListener("change", () => {
      st.colormap = cmSel.value;
      writeColormap();
    });
    const modeSel = document.createElement("select");
    for (const [i, m] of ["speed", "angle (cyclic)", "age", "iso-residual"].entries()) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = m;
      modeSel.appendChild(o);
    }
    modeSel.addEventListener("change", () => {
      st.colorMode = Number(modeSel.value);
      if (st.colorMode === 1) {
        st.colormap = "cyclic";
        cmSel.value = "cyclic";
        writeColormap();
      }
    });
    const selRow = document.createElement("div");
    selRow.className = "cn-ctl";
    selRow.append(modeSel, cmSel);
    group.appendChild(selRow);
    const hint = document.createElement("div");
    hint.className = "cn-note";
    hint.textContent =
      "drag: orbit · wheel: zoom · shift-drag: vortex brush (ψ-space, stays gated) · G: wind gust · anti-demo template: attractor follows the cursor";
    group.appendChild(hint);
  }
  function syncControls(): void {
    for (const c of controlDefs) sliderEls.get(c.id)!.value = String(c.get());
  }

  // --- interaction -------------------------------------------------------------------
  let dragging = false, dragBrush = false, lastX = 0, lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragBrush = e.shiftKey;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const nx = e.offsetX / canvas.clientWidth;
    const ny = e.offsetY / canvas.clientHeight;
    if (st.template.attractor) {
      attractorPos = [nx, 1 - ny, 0.5];
    }
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (dragBrush) {
      brush.x = nx;
      brush.y = 1 - ny;
      brush.z = 0.5;
      brush.amp = 0.4;
      const view = lookAtOrbit(cam.yaw, cam.pitch, cam.dist);
      brush.ax = view[2];
      brush.ay = view[6];
      brush.az = view[10];
    } else if (st.template.key === "rigidbody") {
      obstacleCenter[0] = Math.min(0.85, Math.max(0.15, obstacleCenter[0] + dx / canvas.clientWidth));
      obstacleCenter[1] = Math.min(0.85, Math.max(0.15, obstacleCenter[1] - dy / canvas.clientHeight));
      rebuildLines();
    } else {
      cam.yaw += dx * 0.008;
      cam.pitch = Math.min(1.4, Math.max(-1.4, cam.pitch + dy * 0.008));
      st.autoOrbit = false;
    }
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
    brush.amp *= 0.0; // brush releases (potential removed — still div-free)
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.dist = Math.min(5, Math.max(0.7, cam.dist * (1 + e.deltaY * 0.001)));
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "g" || e.key === "G") {
      gustVec = [0.35, 0.08, 0];
      gustUntil = performance.now() + 900;
    }
  });

  // --- instruments loop -----------------------------------------------------------------
  let instrumentsBusy = false; // lavapipe lesson: a 1 Hz tick can fire
  // while the previous mapAsync is still pending — submitting the copy
  // then raises "used in submit while pending map" (CI-fatal)
  async function readInstruments(): Promise<void> {
    if (instrumentsBusy) return;
    instrumentsBusy = true;
    try {
      await readInstrumentsInner();
    } finally {
      instrumentsBusy = false;
    }
  }

  async function readInstrumentsInner(): Promise<void> {
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(instPipe);
    pass.setBindGroup(0, instBG);
    pass.dispatchWorkgroups(Math.ceil(N_PROBE / 64));
    pass.end();
    enc.copyBufferToBuffer(instBuf, 0, instRead, 0, N_PROBE * INST_FLOATS * 4);
    device.queue.submit([enc.finish()]);
    await instRead.mapAsync(GPUMapMode.READ);
    const data = new Float32Array(instRead.getMappedRange().slice(0));
    instRead.unmap();
    const agg: InstrumentAggregates = {
      speedMax: 0, divTraceMax: 0, fdDivMax: 0, conf1Max: 0, conf2Max: 0,
      clebschMax: 0, helicityMax: 0, isoResidMax: 0, vnMax: 0, beltramiMax: 0,
      vortMax: 0, construction: st.template.construction,
    };
    for (let i = 0; i < N_PROBE; i++) {
      const o = i * INST_FLOATS;
      agg.speedMax = Math.max(agg.speedMax, data[o]);
      agg.divTraceMax = Math.max(agg.divTraceMax, Math.abs(data[o + 1]));
      agg.fdDivMax = Math.max(agg.fdDivMax, Math.abs(data[o + 2]));
      agg.conf1Max = Math.max(agg.conf1Max, Math.abs(data[o + 3]));
      agg.conf2Max = Math.max(agg.conf2Max, Math.abs(data[o + 4]));
      agg.clebschMax = Math.max(agg.clebschMax, Math.abs(data[o + 5]));
      agg.helicityMax = Math.max(agg.helicityMax, Math.abs(data[o + 6]));
      agg.isoResidMax = Math.max(agg.isoResidMax, Math.abs(data[o + 7]));
      agg.vnMax = Math.max(agg.vnMax, Math.abs(data[o + 8]));
      agg.beltramiMax = Math.max(agg.beltramiMax, Math.abs(data[o + 9]));
      agg.vortMax = Math.max(agg.vortMax, Math.abs(data[o + 10]));
    }
    verifyPanel.update(agg);
    const rows: DiagnosticRow[] = [
      { label: "tracers", value: `${(st.count / 1024).toFixed(0)}k` },
      { label: "fps", value: fps.toFixed(0) },
      { label: "frame ms", value: frameMs.toFixed(2) },
      { label: "max |div| trace(J)", value: agg.divTraceMax.toExponential(2) },
      { label: "max |v·n| obstacle", value: agg.vnMax.toExponential(2) },
      { label: "construction", value: st.template.construction },
    ];
    shell.setDiagnostics(rows);
  }
  setInterval(() => {
    if (!isCapturing()) void readInstruments().catch(() => undefined);
  }, 1000);

  // --- gate capture -----------------------------------------------------------------------
  let gateIc: GateIc | null = null;
  async function runGateOnce(ic: GateIc): Promise<{
    steps: CaptureStepDescriptor[];
    sha: string;
    f0: Float32Array;
  }> {
    const n = ic.params.tracers;
    // dedicated buffers (never the display cloud)
    const gTracer = device.createBuffer({
      size: n * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    const gF0 = device.createBuffer({
      size: n * 8,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    const gRead = device.createBuffer({
      size: n * 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const gF0Read = device.createBuffer({
      size: n * 8,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    try {
      const pos = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        pos[i * 4] = ic.positions[i * 3];
        pos[i * 4 + 1] = ic.positions[i * 3 + 1];
        pos[i * 4 + 2] = ic.positions[i * 3 + 2];
        pos[i * 4 + 3] = 0;
      }
      device.queue.writeBuffer(gTracer, 0, pos);
      // canonical FU/TU (capture mode: t=0, no interactions, no wrap, RK4 + reproject)
      writeFU(true);
      writeTU({ dt: ic.params.dt, count: n, wrap: 0, reproject: 1, rk4: 1 });
      const gAdvectBG = mkComputeBG(advectPipe, gTracer, gF0);
      const gAnchorBG = mkComputeBG(anchorPipe, gTracer, gF0);
      {
        const enc = device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(anchorPipe);
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
          xyz[i * 3] = snap[i * 4];
          xyz[i * 3 + 1] = snap[i * 4 + 1];
          xyz[i * 3 + 2] = snap[i * 4 + 2];
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
        pass.setPipeline(advectPipe);
        pass.setBindGroup(0, gAdvectBG);
        pass.dispatchWorkgroups(Math.ceil(n / 256));
        pass.end();
        device.queue.submit([enc.finish()]);
        if (s % ic.params.capture_interval === 0 || s === ic.params.steps) {
          await checkpoint(s);
        }
      }
      // include f0 in the first checkpoint state
      steps[0].state["f0"] = field(f0, [n, 2], "f32");
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

  async function captureGate(): Promise<void> {
    await runCaptureExclusive(async () => {
      shell.setStatus("gate capture running…");
      const t0 = performance.now();
      gateIc ??= await loadGateIc();
      const run1 = await runGateOnce(gateIc);
      const run2 = await runGateOnce(gateIc);
      const twice = run1.sha === run2.sha;
      const bundle = makeBundle(
        gateIc,
        run2.steps,
        42,
        (performance.now() - t0) / 1000,
        adapterInfo,
      );
      bundle.manifest.config.params["run_twice_identical"] = twice;
      bundle.manifest.config.params["trajectory_sha256"] = run2.sha;
      exposeCapture(bundle, { download: false });
      shell.setStatus(`gate run ×2 — ${twice ? "byte-identical ✓" : "MISMATCH ✗"} sha ${run2.sha.slice(0, 10)}`);
      shell.setVerdict({
        gate: "run-twice byte-identity + live-f64 iso-residual",
        verdict: twice ? "run-twice PASS (f64 side runs in CI)" : "RUN-TWICE FAIL",
        pass: twice,
      });
      // restore display uniforms
      writeFU();
      writeTU();
    });
  }

  // --- frame loop ------------------------------------------------------------------------
  let fps = 0, frameMs = 0, lastT = performance.now();
  let pingA = true;
  applyTemplate(CANONICAL_KEY);
  writeColormap();
  writePost();

  function frame(): void {
    requestAnimationFrame(frame);
    if (isCapturing()) return;
    const now = performance.now();
    const dtWall = now - lastT;
    lastT = now;
    frameMs = frameMs * 0.9 + dtWall * 0.1;
    fps = 1000 / Math.max(frameMs, 1e-3);
    if (gustUntil && now > gustUntil) {
      gustVec = st.template.gustDemo ? [0.25, 0, 0] : [0, 0, 0];
      gustUntil = 0;
    }
    if (st.autoOrbit && !dragging) cam.yaw += 0.0012 * dtWall * 0.06;
    if (!st.paused) simTime += st.dt;
    writeFU();
    writeTU();

    const curr = pingA ? trailA : trailB;
    const prev = pingA ? trailB : trailA;
    pingA = !pingA;

    const enc = device.createCommandEncoder();
    if (!st.paused) {
      const pass = enc.beginComputePass();
      pass.setPipeline(advectPipe);
      pass.setBindGroup(0, advectBG);
      pass.dispatchWorkgroups(Math.ceil(st.count / 256));
      pass.end();
    }
    // 1. persistence fade: prev * fade -> curr
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [
          { view: curr.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } },
        ],
      });
      pass.setPipeline(fadePipe);
      pass.setBindGroup(0, postBG(fadePipe, puBuf, prev));
      pass.draw(3);
      pass.end();
    }
    // 2. splat tracers additively into curr
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view: curr.createView(), loadOp: "load", storeOp: "store" }],
      });
      pass.setPipeline(tracerRenderPipe);
      pass.setBindGroup(0, tracerRenderBG);
      pass.draw(6, st.count);
      pass.end();
    }
    // 3. bloom chain (bright -> blurH -> blurV)
    if (st.bloom > 0) {
      const b1 = enc.beginRenderPass({
        colorAttachments: [{ view: bloomA.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      });
      b1.setPipeline(brightPipe);
      b1.setBindGroup(0, postBG(brightPipe, puBuf, curr));
      b1.draw(3);
      b1.end();
      const b2 = enc.beginRenderPass({
        colorAttachments: [{ view: bloomB.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      });
      b2.setPipeline(blurPipe);
      b2.setBindGroup(0, postBG(blurPipe, puBufH, bloomA));
      b2.draw(3);
      b2.end();
      const b3 = enc.beginRenderPass({
        colorAttachments: [{ view: bloomA.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      });
      b3.setPipeline(blurPipe);
      b3.setBindGroup(0, postBG(blurPipe, puBufV, bloomB));
      b3.draw(3);
      b3.end();
    }
    // 4. composite -> canvas, then wireframe overlay
    {
      const view = ctx.getCurrentTexture().createView();
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 } }],
      });
      pass.setPipeline(compositePipe);
      pass.setBindGroup(0, postBG(compositePipe, puBuf, curr, bloomA));
      pass.draw(3);
      pass.setPipeline(linePipe);
      pass.setBindGroup(0, lineBG);
      pass.draw(lineCount);
      pass.end();
    }
    device.queue.submit([enc.finish()]);

    hud.textContent = `${(st.count / 1024).toFixed(0)}k tracers · ${fps.toFixed(0)} fps · ${frameMs.toFixed(1)} ms · ${st.template.construction}${st.template.gated ? "" : " · UNGATED"}`;
  }

  const hud = document.getElementById("hud") as HTMLElement;
  requestAnimationFrame(frame);
  (globalThis as Record<string, unknown>)["__bitPhysicsReady"] = true;

  // silence unused warnings for helpers reserved for the driver path
  void advectBG;
  void seedBG;
  void anchorBG;
}

void main();
