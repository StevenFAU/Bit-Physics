// Eulerian smoke (Stam-Fedkiw stable fluids) — Stack-B WebGPU web build
// (verification-visible demo, verification-demo-spec.md v0.3).
//
// Ships the committed ../../src/stable_fluids_2d.wgsl — a faithful WGSL port
// of the verified NumPy reference (MacCormack SL velocity advection, explicit
// diffusion, zero-init Jacobi-20 projection, plain-SL density advection on a
// fully periodic collocated grid) — through a Vite bundle: a live canvas
// render loop, the shared settings panel, and a capture-export hook.
//
// GATE (web-deploy track, new_canonical): the demo's canonical descriptor is
// the 2D Taylor-Green scene at the frozen reference params
// (taylor-green-2d-128sq-seed42-step1000). verify.py's _gate_eulerian_smoke
// re-runs the FROZEN f64 reference live and compares every captured
// checkpoint per-field at the established [defaults.smoke] rel=1e-4, plus
// run-twice byte-identity and the sim's own invariants. Why not
// capture_roundtrip against the committed lid-driven-cavity capture: that
// trajectory was contaminated by a reference FP-edge bug this port discovered
// (see the PROVE post-mortem panel; the backend fix + canonical regeneration
// landed at P6-FPEDGE). Measured, shown, never laundered.
//
// HARD SEPARATION (spec § 7): the capture path reloads the canonical TG IC
// and steps ONLY with the canonical paramBuf (flags=0: MacCormack, no
// limiter, Jacobi-20 zero-init, no live extras); sliders, scenes, splats,
// obstacles and toggles drive liveParamBuf / live dispatch sequences only.
// The render stack reads state through read-only bindings; the gate reads
// buffer readbacks, never pixels.

import "../../../../common/common-web/src/theme.css";

import type { DeviceContext } from "../../../../common/common-ts/src/context.js";
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

import computeWgsl from "../../src/stable_fluids_2d.wgsl?raw";
import liveWgsl from "./live.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";
import V from "./generated/verification.json";
import { installExplainPanel } from "./explain.js";
import { installVerifyPanel } from "./verify-panel.js";

const N = 128;
const DYE_N = 512;
const CANONICAL_STEPS = 1000;
const CAPTURE_INTERVAL = 100;
const PARAMS = { nu: 0.01, rho: 1.0, dx: 1.0 / 128.0, dt: 0.001, n_jacobi: 20 };

// The data spine carries the committed canonical values verbatim; the compute
// constants above must agree with it. Drift means the generated file is stale
// — fail loudly at boot rather than display values the kernel is not running.
if (
  V.canonical.params.nu !== PARAMS.nu ||
  V.canonical.params.rho !== PARAMS.rho ||
  V.canonical.params.dx !== PARAMS.dx ||
  V.canonical.params.dt !== PARAMS.dt ||
  V.canonical.params.n_jacobi !== PARAMS.n_jacobi ||
  V.canonical.step_count !== CANONICAL_STEPS ||
  V.canonical.capture_interval !== CAPTURE_INTERVAL ||
  V.canonical.grid[0] !== N
) {
  throw new Error("verification.json canonical values drifted from compute constants — rerun gen-verification.mjs");
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function setBoot(msg: string): void {
  boot.textContent = msg;
}

// Per-sim presentation CSS (hand-rolled on theme tokens; es- namespace only).
function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
.es-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.es-row > label { color: var(--dim); min-width: 14px; flex: none; white-space: nowrap; font-size: 11px; }
.es-slider-box { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.es-val { color: var(--txt); font-variant-numeric: tabular-nums; width: 52px; flex: none; text-align: right; font-size: 11.5px; }
.es-range { appearance: none; -webkit-appearance: none; width: 100%; height: 2px; margin: 5px 0;
  background: var(--line); border-radius: 2px; outline: none; cursor: pointer; }
.es-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px;
  border-radius: 50%; background: var(--accent); border: 0; cursor: pointer; }
.es-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 0; cursor: pointer; }
.es-check { display: flex; align-items: center; gap: 7px; margin: 7px 0; color: var(--dim);
  font-size: 11.5px; cursor: pointer; }
.es-check input { accent-color: var(--accent); margin: 0; }
.es-select { flex: 1; min-width: 0; font: inherit; font-size: 11.5px; color: var(--txt);
  background: rgba(0, 0, 0, .35); border: 1px solid var(--line); border-radius: 4px;
  padding: 2px 4px; outline: none; cursor: pointer; }
.es-select:focus { border-color: var(--accent-d); }
.es-chiprow { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
.es-chip { font: inherit; font-size: 9.5px; color: var(--dim); background: rgba(0, 0, 0, .3);
  border: 1px solid var(--line); border-radius: 9px; padding: 1px 7px; cursor: pointer; }
.es-chip:hover { color: var(--accent); border-color: var(--accent-d); }
.es-chip[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }
.es-note-line { font-size: 10px; color: var(--warm); margin: 6px 0 2px; }
.es-details summary { cursor: pointer; color: var(--dim); font-size: 11px; }
.es-details[open] summary { color: var(--txt); margin-bottom: 4px; }
.es-eq { margin: 8px 0; }
.es-eq-math { color: var(--txt); font-size: 12.5px; margin-bottom: 3px; }
.es-eq-math small { color: var(--faint); font-size: 9.5px; margin-left: 6px; }
.es-code { display: block; font-size: 10px; color: var(--accent); background: rgba(0, 0, 0, .35);
  border: 1px solid var(--line); border-radius: 4px; padding: 3px 6px;
  overflow-x: auto; white-space: pre; }
.es-eq-link { font-size: 9.5px; color: var(--dim); text-decoration: none;
  border-bottom: 1px dotted var(--accent-d); margin-right: 8px; }
.es-eq-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
.es-hash { font-size: 9.5px; line-height: 1.55; color: var(--dim); word-break: break-all; margin-top: 6px; }
.es-hash b { color: var(--txt); font-weight: 500; }
.es-hash .ok { color: var(--accent); }
.es-hash .no { color: var(--bad); }
.es-diag-live { margin: 2px 0 0; }
.es-timeline { margin: 6px 0 4px; padding-left: 18px; font-size: 10px; line-height: 1.5; color: var(--dim); }
.es-timeline li { margin: 5px 0; }
.es-timeline b { color: var(--txt); font-weight: 500; }
.es-plot { margin: 8px 0 4px; }
.es-plot-cap { font-size: 10px; color: var(--dim); margin-bottom: 3px; cursor: help; }
.es-plot canvas { width: 100%; height: auto; display: block; background: rgba(0, 0, 0, .25);
  border: 1px solid var(--line); border-radius: 4px; }
`;
  document.head.appendChild(style);
}

// ------------------------------------------------------------------ ICs ----
// All ICs are analytic and computed in JS f64, cast to f32 on upload (the
// verify.py gate rebuilds the same closed form in NumPy f64; the f32 cast is
// ~6e-8, far under the rel=1e-4 budget).

interface ICFields {
  vel: Float32Array<ArrayBuffer>; // interleaved (u, v), idx = i*N + j
  density: Float32Array<ArrayBuffer>;
}

/** The gated canonical: 2D Taylor-Green vortex + centered Gaussian smoke blob. */
function taylorGreenIC(): ICFields {
  const vel = new Float32Array(N * N * 2);
  const density = new Float32Array(N * N);
  const k = 2.0 * Math.PI;
  const s2 = 2.0 * 0.05 * 0.05;
  for (let i = 0; i < N; i += 1) {
    const x = (i + 0.5) / N;
    for (let j = 0; j < N; j += 1) {
      const y = (j + 0.5) / N;
      const idx = i * N + j;
      vel[idx * 2] = Math.sin(k * x) * Math.cos(k * y);
      vel[idx * 2 + 1] = -Math.cos(k * x) * Math.sin(k * y);
      density[idx] = Math.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / s2);
    }
  }
  return { vel, density };
}

/** Kelvin-Helmholtz: periodic-clean DOUBLE shear layer + seeded perturbation.
 *  (The committed lid-shear canonical put a single layer against the wrap —
 *  an unresolved discontinuity; see the post-mortem panel.) */
function kelvinHelmholtzIC(): ICFields {
  const vel = new Float32Array(N * N * 2);
  const density = new Float32Array(N * N);
  const w = 0.02;
  for (let i = 0; i < N; i += 1) {
    const x = (i + 0.5) / N;
    for (let j = 0; j < N; j += 1) {
      const y = (j + 0.5) / N;
      const idx = i * N + j;
      const u = Math.tanh((y - 0.25) / w) - Math.tanh((y - 0.75) / w) - 1.0;
      vel[idx * 2] = 0.5 * u;
      vel[idx * 2 + 1] = 0.02 * Math.sin(4.0 * Math.PI * x);
      density[idx] = 0.5 * (1.0 + Math.tanh((y - 0.25) / w)) * 0.5 * (1.0 + Math.tanh((0.75 - y) / w));
    }
  }
  return { vel, density };
}

/** Two counter-rotating Gaussian vortices heading for a collision. */
function vortexPairIC(): ICFields {
  const vel = new Float32Array(N * N * 2);
  const density = new Float32Array(N * N);
  const centers: [number, number, number][] = [
    [0.35, 0.5, +9.0],
    [0.65, 0.5, -9.0],
  ];
  const s2 = 2.0 * 0.07 * 0.07;
  for (let i = 0; i < N; i += 1) {
    const x = (i + 0.5) / N;
    for (let j = 0; j < N; j += 1) {
      const y = (j + 0.5) / N;
      const idx = i * N + j;
      let u = 0;
      let v = 0;
      let d = 0;
      for (const [cx, cy, g] of centers) {
        const dx = x - cx;
        const dy = y - cy;
        const e = Math.exp(-(dx * dx + dy * dy) / s2);
        u += -g * dy * e;
        v += g * dx * e;
        d += e * 0.9;
      }
      vel[idx * 2] = u;
      vel[idx * 2 + 1] = v;
      density[idx] = Math.min(d, 1.2);
    }
  }
  return { vel, density };
}

function quiescentIC(): ICFields {
  return { vel: new Float32Array(N * N * 2), density: new Float32Array(N * N) };
}

/** Ink: three still blobs, motion comes from you (or nothing — that's the point). */
function inkIC(): ICFields {
  const ic = quiescentIC();
  const blobs: [number, number, number][] = [
    [0.32, 0.62, 0.06],
    [0.6, 0.4, 0.08],
    [0.68, 0.7, 0.05],
  ];
  for (let i = 0; i < N; i += 1) {
    const x = (i + 0.5) / N;
    for (let j = 0; j < N; j += 1) {
      const y = (j + 0.5) / N;
      let d = 0;
      for (const [cx, cy, s] of blobs) {
        d += Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
      }
      ic.density[i * N + j] = Math.min(d, 1.4);
    }
  }
  return ic;
}

interface Scene {
  id: string;
  label: string;
  title: string;
  ic: () => ICFields;
  view: number;
  colormap: string;
  live: Partial<LiveKnobs>;
  mask?: "cylinder";
  emitter?: (frame: number) => SplatSpec[];
}

interface LiveKnobs {
  nu: number;
  jacobiIters: number;
  maccormack: boolean;
  limiter: boolean;
  warmStart: boolean;
  confineEps: number;
  buoyancy: number;
  dissipateVel: number;
  dissipateDye: number;
  inflowU: number;
  obstacles: boolean;
}

interface SplatSpec {
  x: number; // sim grid units
  y: number;
  dvx: number;
  dvy: number;
  r: number; // rgb dye color
  g: number;
  b: number;
  amount: number; // density
  radius: number; // sim cells
}

function hsv(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number): number => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  return [f(5), f(3), f(1)];
}

// deterministic burst positions (frame-indexed; no Math.random — poster/loop
// and URL replay stay reproducible)
function lcg(seed: number): number {
  return ((Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0xffffffff;
}

const SCENES: readonly Scene[] = [
  {
    id: "plume",
    label: "plume",
    title: "buoyant smoke plume — a continuous hot source + upward body force on density (web-only forcing, labeled; not the gated path)",
    ic: quiescentIC,
    view: 0,
    colormap: "inferno",
    live: { buoyancy: 5.0, confineEps: 14.0, dissipateVel: 1.0, dissipateDye: 4.0 },
    emitter: (frame: number): SplatSpec[] => {
      const [r, g, b] = hsv(20 + 14 * Math.sin(frame * 0.02), 0.85, 0.95);
      return [
        { x: N / 2 + 3 * Math.sin(frame * 0.013), y: 5, dvx: 0.5 * Math.sin(frame * 0.021), dvy: 1.3, r, g, b, amount: 0.14, radius: 3.5 },
      ];
    },
  },
  {
    id: "taylor-green",
    label: "canonical (TG)",
    title: "the gated canonical — 2D Taylor-Green vortex at the frozen reference params; what CI verifies against the f64 reference, live",
    ic: taylorGreenIC,
    view: 3,
    colormap: "magma",
    live: {},
  },
  {
    id: "kelvin-helmholtz",
    label: "shear layer",
    title: "Kelvin-Helmholtz: a periodic-clean double shear layer rolls up — the honest cousin of the quarantined lid-shear canonical (see post-mortem)",
    ic: kelvinHelmholtzIC,
    view: 1,
    colormap: "inferno",
    live: {},
  },
  {
    id: "vortex-pair",
    label: "vortex pair",
    title: "two counter-rotating vortices collide — watch enstrophy trade against energy on the diagnostics plot",
    ic: vortexPairIC,
    view: 3,
    colormap: "viridis",
    live: {},
  },
  {
    id: "ink",
    label: "ink",
    title: "ink in still water — near-zero forcing, high dye persistence: your drags are the only physics",
    ic: inkIC,
    view: 0,
    colormap: "cividis",
    live: { dissipateVel: 0.02, dissipateDye: 0.0 },
    emitter: (): SplatSpec[] => [],
  },
  {
    id: "karman",
    label: "Kármán street",
    title: "inflow past a painted cylinder — vortex shedding (exploratory web-only interior BC: velocity masking; the reference has no walls)",
    ic: quiescentIC,
    view: 3,
    colormap: "plasma",
    live: { inflowU: 1.0, obstacles: true, dissipateDye: 2.0 },
    mask: "cylinder",
    emitter: (frame: number): SplatSpec[] => {
      if (frame % 3 !== 0) return [];
      const bands: SplatSpec[] = [];
      for (let bIdx = 0; bIdx < 3; bIdx += 1) {
        const [r, g, b] = hsv(160 + bIdx * 55, 0.8, 0.9);
        bands.push({ x: 2, y: N * (0.35 + 0.15 * bIdx), dvx: 0, dvy: 0, r, g, b, amount: 0.15, radius: 2.5 });
      }
      return bands;
    },
  },
  {
    id: "fireworks",
    label: "fireworks",
    title: "scripted deterministic splat bursts — the aesthetic ceiling demo (frame-indexed, so posters and shared URLs replay identically)",
    ic: quiescentIC,
    view: 0,
    colormap: "magma",
    live: { confineEps: 12.0, dissipateVel: 0.6, dissipateDye: 0.8 },
    emitter: (frame: number): SplatSpec[] => {
      if (frame % 55 !== 0) return [];
      const burst = frame / 55;
      const cx = N * (0.2 + 0.6 * lcg(burst * 7 + 1));
      const cy = N * (0.3 + 0.4 * lcg(burst * 13 + 5));
      const hue = 360 * lcg(burst * 29 + 11);
      const out: SplatSpec[] = [];
      for (let s = 0; s < 7; s += 1) {
        const a = (s / 7) * 2 * Math.PI;
        const [r, g, b] = hsv(hue, 0.9, 1.0);
        out.push({ x: cx, y: cy, dvx: 5 * Math.cos(a), dvy: 5 * Math.sin(a), r, g, b, amount: 0.5, radius: 3 });
      }
      return out;
    },
  },
];

// -------------------------------------------------------------- main -------
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

  // hiDPI backing store: CSS size × min(dpr, 2), sized once at boot
  {
    const css = canvas.clientWidth || canvas.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(256, Math.round(css * dpr));
    canvas.width = px;
    canvas.height = px;
  }

  const cells = N * N;
  const velBytes = cells * 2 * 4;
  const scalarBytes = cells * 4;
  const dyeBytes = DYE_N * DYE_N * 4 * 4;
  const sUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

  const vel0 = device.createBuffer({ size: velBytes, usage: sUsage, label: "vel-state" });
  const velPred = device.createBuffer({ size: velBytes, usage: sUsage, label: "vel-pred" });
  const velTmp = device.createBuffer({ size: velBytes, usage: sUsage, label: "vel-tmp" });
  const divBuf = device.createBuffer({ size: scalarBytes, usage: sUsage, label: "div" });
  const curlBuf = device.createBuffer({ size: scalarBytes, usage: sUsage, label: "curl" });
  const p0 = device.createBuffer({ size: scalarBytes, usage: sUsage, label: "p-ping" });
  const p1 = device.createBuffer({ size: scalarBytes, usage: sUsage, label: "p-pong" });
  const dens = [
    device.createBuffer({ size: scalarBytes, usage: sUsage, label: "dens-a" }),
    device.createBuffer({ size: scalarBytes, usage: sUsage, label: "dens-b" }),
  ];
  const snapBuf = device.createBuffer({ size: scalarBytes, usage: sUsage, label: "dens-snapshot" });
  const maskBuf = device.createBuffer({ size: scalarBytes, usage: sUsage, label: "mask" });
  const dye = [
    device.createBuffer({ size: dyeBytes, usage: sUsage, label: "dye-a" }),
    device.createBuffer({ size: dyeBytes, usage: sUsage, label: "dye-b" }),
  ];

  // ---- pipelines (layout: "auto"; bind groups built per entry point) ------
  const computeModule = device.createShaderModule({ code: computeWgsl, label: "stable-fluids-2d" });
  const liveModule = device.createShaderModule({ code: liveWgsl, label: "smoke-live" });
  const mkPipe = (module: GPUShaderModule, entryPoint: string): Promise<GPUComputePipeline> =>
    device.createComputePipelineAsync({ label: entryPoint, layout: "auto", compute: { module, entryPoint } });

  const [
    pAdvectSL,
    pCorrect,
    pDiffuse,
    pDivCurl,
    pJacobi,
    pGradSub,
    pAdvectDens,
    pSplatSim,
    pSplatDye,
    pAdvectDye,
    pBuoyancy,
    pConfine,
    pDissipate,
    pObstacle,
  ] = await Promise.all([
    mkPipe(computeModule, "advect_vel_sl"),
    mkPipe(computeModule, "advect_vel_maccormack_correct"),
    mkPipe(computeModule, "diffuse_vel"),
    mkPipe(computeModule, "divergence_curl"),
    mkPipe(computeModule, "jacobi"),
    mkPipe(computeModule, "gradient_subtract"),
    mkPipe(computeModule, "advect_density"),
    mkPipe(liveModule, "splat_sim"),
    mkPipe(liveModule, "splat_dye"),
    mkPipe(liveModule, "advect_dye"),
    mkPipe(liveModule, "buoyancy"),
    mkPipe(liveModule, "confine"),
    mkPipe(liveModule, "dissipate"),
    mkPipe(liveModule, "obstacle_apply"),
  ]);

  // ---- uniforms ------------------------------------------------------------
  // Capture-pinning split (binding rule verbatim from rd2d/physarum): TWO
  // solver param uniforms. The capture re-run steps ONLY with the canonical
  // paramBuf; the RAF live loop steps ONLY with liveParamBuf.
  const uUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  const paramBuf = device.createBuffer({ size: 48, usage: uUsage, label: "params-canonical" });
  const liveParamBuf = device.createBuffer({ size: 48, usage: uUsage, label: "params-live" });
  const liveLpBuf = device.createBuffer({ size: 48, usage: uUsage, label: "live-effects" });
  const splatBuf = device.createBuffer({ size: 400, usage: uUsage, label: "splats" });

  interface SolverParams {
    nu: number;
    rho: number;
    dx: number;
    dt: number;
  }
  function writeSolverParams(buf: GPUBuffer, p: SolverParams, flags: number): void {
    const ab = new ArrayBuffer(48);
    const dv = new DataView(ab);
    dv.setUint32(0, N, true);
    dv.setUint32(4, flags, true);
    dv.setFloat32(8, p.dt, true);
    dv.setFloat32(12, p.dx, true);
    dv.setFloat32(16, p.nu, true);
    dv.setFloat32(20, p.rho, true);
    dv.setFloat32(24, p.dt / p.dx, true);
    dv.setFloat32(28, p.dx * p.dx, true);
    dv.setFloat32(32, 1.0 / (p.dx * p.dx), true);
    dv.setFloat32(36, 0.5 / p.dx, true);
    dv.setFloat32(40, p.rho / p.dt, true);
    dv.setFloat32(44, p.dt / p.rho, true);
    queue.writeBuffer(buf, 0, ab);
  }
  writeSolverParams(paramBuf, PARAMS, 0); // canonical: flags=0, frozen forever

  function writeLiveEffects(k: LiveKnobs): void {
    const ab = new ArrayBuffer(48);
    const dv = new DataView(ab);
    dv.setUint32(0, N, true);
    dv.setUint32(4, DYE_N, true);
    dv.setFloat32(8, PARAMS.dt, true);
    dv.setFloat32(12, PARAMS.dx, true);
    dv.setFloat32(16, PARAMS.dt * DYE_N, true);
    dv.setFloat32(20, k.buoyancy, true);
    dv.setFloat32(24, k.confineEps, true);
    dv.setFloat32(28, k.dissipateVel, true);
    dv.setFloat32(32, k.dissipateDye, true);
    dv.setFloat32(36, k.inflowU, true);
    queue.writeBuffer(liveLpBuf, 0, ab);
  }

  // ---- bind groups ----------------------------------------------------------
  const mkBG = (pipe: GPUComputePipeline, entries: [number, GPUBuffer][], label: string): GPUBindGroup =>
    device.createBindGroup({
      label,
      layout: pipe.getBindGroupLayout(0),
      entries: entries.map(([binding, buffer]) => ({ binding, resource: { buffer } })),
    });

  // Solver bind-group set, built once per param uniform (canonical vs live) —
  // the disjointness that keeps slider state out of the capture path.
  interface SolverBGs {
    advectPred: GPUBindGroup; // vel0 -> velPred (MacCormack predictor)
    advectPlain: GPUBindGroup; // vel0 -> velTmp (exploratory plain-SL mode)
    correct: GPUBindGroup; // vel0 + velPred -> velTmp
    diffuse: GPUBindGroup; // velTmp -> velPred
    divCurlPre: GPUBindGroup; // velPred -> div, curl (projection input)
    divCurlPost: GPUBindGroup; // vel0 -> div, curl (residual display)
    jacobi01: GPUBindGroup; // p0 -> p1
    jacobi10: GPUBindGroup; // p1 -> p0
    gradSub: GPUBindGroup; // velPred + p0 -> vel0
    advectDens: [GPUBindGroup, GPUBindGroup]; // dens ping-pong
  }
  function mkSolverBGs(params: GPUBuffer, tag: string): SolverBGs {
    return {
      advectPred: mkBG(pAdvectSL, [[0, params], [1, vel0], [2, velPred]], `${tag}-advect-pred`),
      advectPlain: mkBG(pAdvectSL, [[0, params], [1, vel0], [2, velTmp]], `${tag}-advect-plain`),
      correct: mkBG(pCorrect, [[0, params], [1, vel0], [2, velTmp], [3, velPred]], `${tag}-correct`),
      diffuse: mkBG(pDiffuse, [[0, params], [1, velTmp], [2, velPred]], `${tag}-diffuse`),
      divCurlPre: mkBG(pDivCurl, [[0, params], [1, velPred], [5, divBuf], [6, curlBuf]], `${tag}-divcurl-pre`),
      divCurlPost: mkBG(pDivCurl, [[0, params], [1, vel0], [5, divBuf], [6, curlBuf]], `${tag}-divcurl-post`),
      jacobi01: mkBG(pJacobi, [[0, params], [4, p0], [5, p1], [6, divBuf]], `${tag}-jacobi01`),
      jacobi10: mkBG(pJacobi, [[0, params], [4, p1], [5, p0], [6, divBuf]], `${tag}-jacobi10`),
      gradSub: mkBG(pGradSub, [[0, params], [1, velPred], [2, vel0], [4, p0]], `${tag}-gradsub`),
      advectDens: [
        mkBG(pAdvectDens, [[0, params], [1, vel0], [4, dens[0]!], [5, dens[1]!]], `${tag}-dens01`),
        mkBG(pAdvectDens, [[0, params], [1, vel0], [4, dens[1]!], [5, dens[0]!]], `${tag}-dens10`),
      ],
    };
  }
  const canonicalBGs = mkSolverBGs(paramBuf, "canonical");
  const liveBGs = mkSolverBGs(liveParamBuf, "live");

  // live-effect bind groups (single set — canonical never dispatches these)
  const bgSplatSim = mkBG(pSplatSim, [[0, liveLpBuf], [1, splatBuf], [2, vel0], [3, dens[0]!]], "splat-sim-0");
  const bgSplatSim1 = mkBG(pSplatSim, [[0, liveLpBuf], [1, splatBuf], [2, vel0], [3, dens[1]!]], "splat-sim-1");
  const bgSplatDye = [
    mkBG(pSplatDye, [[0, liveLpBuf], [1, splatBuf], [6, dye[0]!]], "splat-dye-0"),
    mkBG(pSplatDye, [[0, liveLpBuf], [1, splatBuf], [6, dye[1]!]], "splat-dye-1"),
  ];
  const bgAdvectDye = [
    mkBG(pAdvectDye, [[0, liveLpBuf], [5, dye[0]!], [6, dye[1]!], [7, vel0]], "advect-dye-01"),
    mkBG(pAdvectDye, [[0, liveLpBuf], [5, dye[1]!], [6, dye[0]!], [7, vel0]], "advect-dye-10"),
  ];
  const bgBuoyancy = [
    mkBG(pBuoyancy, [[0, liveLpBuf], [2, vel0], [3, dens[0]!]], "buoy-0"),
    mkBG(pBuoyancy, [[0, liveLpBuf], [2, vel0], [3, dens[1]!]], "buoy-1"),
  ];
  const bgConfine = mkBG(pConfine, [[0, liveLpBuf], [2, vel0], [4, curlBuf]], "confine");
  const bgDissipate = [
    mkBG(pDissipate, [[0, liveLpBuf], [2, vel0], [3, dens[0]!]], "dissipate-0"),
    mkBG(pDissipate, [[0, liveLpBuf], [2, vel0], [3, dens[1]!]], "dissipate-1"),
  ];
  const bgObstacle = [
    mkBG(pObstacle, [[0, liveLpBuf], [2, vel0], [3, dens[0]!], [8, maskBuf]], "obstacle-0"),
    mkBG(pObstacle, [[0, liveLpBuf], [2, vel0], [3, dens[1]!], [8, maskBuf]], "obstacle-1"),
  ];

  // ---- render ---------------------------------------------------------------
  const ctxGpu = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctxGpu.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({
    code:
      renderWgsl +
      emitColormapWgsl({ stopsExpr: "rp.cmap", countExpr: "rp.cmap_meta.x", fnName: "cmap_sample" }) +
      emitColormapWgsl({ stopsExpr: "rp.cmap2", countExpr: "rp.cmap2_meta.x", fnName: "cmap2_sample" }),
    label: "smoke-render",
  });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "smoke-render",
    layout: "auto",
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const RP_FLOATS = 12 + PACKED_FLOATS * 2;
  const renderUniform = device.createBuffer({ size: RP_FLOATS * 4, usage: uUsage, label: "render-uniform" });

  const VIEW_MODES = ["dye", "smoke", "speed", "curl", "divergence |∇·u|", "schlieren", "pressure"] as const;
  let viewMode = 0;
  let rawGrid = false;
  let relief = 0.35;
  let glow = 0.15;
  let exposure = 1.7;
  let colormapName = "magma";
  let cmapPrimary = packColormap(getColormap(colormapName));
  let cmapSecondary = packColormap(ghostFor(colormapName));
  let maskOn = 0;

  const rpData = new Float32Array(RP_FLOATS);
  function writeRenderUniform(): void {
    rpData[0] = N;
    rpData[1] = DYE_N;
    rpData[2] = viewMode;
    rpData[3] = rawGrid ? 1 : 0;
    rpData[4] = relief;
    rpData[5] = glow;
    rpData[6] = exposure;
    rpData[7] = 1.0; // gain (density/speed/schlieren)
    rpData[8] = 0.02; // curl_scale
    rpData[9] = 0.08; // div_scale
    rpData[10] = maskOn;
    rpData[11] = 0;
    rpData.set(cmapPrimary, 12);
    rpData.set(cmapSecondary, 12 + PACKED_FLOATS);
    queue.writeBuffer(renderUniform, 0, rpData);
  }
  writeRenderUniform();

  // render bind groups per (density ping, dye ping)
  const renderBGCache = new Map<string, GPUBindGroup>();
  function renderBG(densIdx: number, dyeIdx: number): GPUBindGroup {
    const key = `${densIdx}-${dyeIdx}`;
    let bg = renderBGCache.get(key);
    if (!bg) {
      bg = device.createBindGroup({
        label: `render-${key}`,
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: renderUniform } },
          { binding: 1, resource: { buffer: vel0 } },
          { binding: 2, resource: { buffer: dens[densIdx]! } },
          { binding: 3, resource: { buffer: curlBuf } },
          { binding: 4, resource: { buffer: divBuf } },
          { binding: 5, resource: { buffer: p0 } },
          { binding: 6, resource: { buffer: dye[dyeIdx]! } },
          { binding: 7, resource: { buffer: snapBuf } },
          { binding: 8, resource: { buffer: maskBuf } },
        ],
      });
      renderBGCache.set(key, bg);
    }
    return bg;
  }

  // ---- solver stepping -------------------------------------------------------
  const wg = Math.ceil(N / 8);
  const wgDye = Math.ceil(DYE_N / 8);
  let densCur = 0;
  let dyeCur = 0;
  let stepCounter = 0;

  /** The gated canonical step — the frozen sequence, canonical uniforms only.
   *  Appears in captureCanonical (and the verify panel's scratch runner, on
   *  its own buffers) and NOWHERE else. */
  function encodeCanonicalStep(enc: GPUCommandEncoder): void {
    encodeSolverStep(enc, canonicalBGs, { maccormack: true, warmStart: false, jacobiIters: PARAMS.n_jacobi });
  }

  interface StepOpts {
    maccormack: boolean;
    warmStart: boolean;
    jacobiIters: number;
  }
  function encodeSolverStep(enc: GPUCommandEncoder, bgs: SolverBGs, opts: StepOpts): void {
    if (!opts.warmStart) enc.clearBuffer(p0);
    const pass = enc.beginComputePass();
    if (opts.maccormack) {
      pass.setPipeline(pAdvectSL);
      pass.setBindGroup(0, bgs.advectPred);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.setPipeline(pCorrect);
      pass.setBindGroup(0, bgs.correct);
      pass.dispatchWorkgroups(wg, wg, 1);
    } else {
      pass.setPipeline(pAdvectSL);
      pass.setBindGroup(0, bgs.advectPlain);
      pass.dispatchWorkgroups(wg, wg, 1);
    }
    pass.setPipeline(pDiffuse);
    pass.setBindGroup(0, bgs.diffuse);
    pass.dispatchWorkgroups(wg, wg, 1);
    pass.setPipeline(pDivCurl);
    pass.setBindGroup(0, bgs.divCurlPre);
    pass.dispatchWorkgroups(wg, wg, 1);
    pass.setPipeline(pJacobi);
    for (let k = 0; k < opts.jacobiIters; k += 1) {
      pass.setBindGroup(0, k % 2 === 0 ? bgs.jacobi01 : bgs.jacobi10);
      pass.dispatchWorkgroups(wg, wg, 1);
    }
    pass.setPipeline(pGradSub);
    pass.setBindGroup(0, bgs.gradSub);
    pass.dispatchWorkgroups(wg, wg, 1);
    pass.setPipeline(pAdvectDens);
    pass.setBindGroup(0, bgs.advectDens[densCur]!);
    pass.dispatchWorkgroups(wg, wg, 1);
    pass.end();
    densCur = 1 - densCur;
    stepCounter += 1;
  }

  // NOTE: odd Jacobi iteration counts leave the final pressure in p1 while
  // gradSub reads p0 — restrict the live slider to even counts (the canonical
  // 20 is even; the UI enforces step=2).

  // live knobs (sliders/scenes write THIS; canonical params stay frozen)
  const live: LiveKnobs = {
    nu: PARAMS.nu,
    jacobiIters: PARAMS.n_jacobi,
    maccormack: true,
    limiter: false,
    warmStart: false,
    confineEps: 0,
    buoyancy: 0,
    dissipateVel: 0,
    dissipateDye: 0.15,
    inflowU: 0,
    obstacles: false,
  };
  function syncLiveUniforms(): void {
    writeSolverParams(liveParamBuf, { nu: live.nu, rho: PARAMS.rho, dx: PARAMS.dx, dt: PARAMS.dt }, live.limiter ? 1 : 0);
    writeLiveEffects(live);
  }
  syncLiveUniforms();

  // pending splats (pointer + scene emitters), consumed on the next live frame
  let pendingSplats: SplatSpec[] = [];
  function writeSplats(list: SplatSpec[]): void {
    const ab = new ArrayBuffer(400);
    const dv = new DataView(ab);
    const count = Math.min(list.length, 8);
    dv.setUint32(0, count, true);
    for (let s = 0; s < count; s += 1) {
      const o = 16 + s * 48;
      const sp = list[s]!;
      dv.setFloat32(o + 0, sp.x, true);
      dv.setFloat32(o + 4, sp.y, true);
      dv.setFloat32(o + 8, sp.dvx, true);
      dv.setFloat32(o + 12, sp.dvy, true);
      dv.setFloat32(o + 16, sp.r, true);
      dv.setFloat32(o + 20, sp.g, true);
      dv.setFloat32(o + 24, sp.b, true);
      dv.setFloat32(o + 28, sp.amount, true);
      dv.setFloat32(o + 32, sp.radius, true);
    }
    queue.writeBuffer(splatBuf, 0, ab);
  }

  function encodeLiveFrameStep(enc: GPUCommandEncoder, splatsArmed: boolean): void {
    const pass = enc.beginComputePass();
    if (splatsArmed) {
      pass.setPipeline(pSplatSim);
      pass.setBindGroup(0, densCur === 0 ? bgSplatSim : bgSplatSim1);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.setPipeline(pSplatDye);
      pass.setBindGroup(0, bgSplatDye[dyeCur]!);
      pass.dispatchWorkgroups(wgDye, wgDye, 1);
    }
    if (live.confineEps > 0) {
      pass.setPipeline(pConfine);
      pass.setBindGroup(0, bgConfine);
      pass.dispatchWorkgroups(wg, wg, 1);
    }
    if (live.buoyancy !== 0) {
      pass.setPipeline(pBuoyancy);
      pass.setBindGroup(0, bgBuoyancy[densCur]!);
      pass.dispatchWorkgroups(wg, wg, 1);
    }
    pass.end();
    encodeSolverStep(enc, liveBGs, {
      maccormack: live.maccormack,
      warmStart: live.warmStart,
      jacobiIters: live.jacobiIters,
    });
    const post = enc.beginComputePass();
    if (live.obstacles || live.inflowU !== 0) {
      post.setPipeline(pObstacle);
      post.setBindGroup(0, bgObstacle[densCur]!);
      post.dispatchWorkgroups(wg, wg, 1);
    }
    if (live.dissipateVel > 0) {
      post.setPipeline(pDissipate);
      post.setBindGroup(0, bgDissipate[densCur]!);
      post.dispatchWorkgroups(wg, wg, 1);
    }
    // post-projection residual + curl for the heatmap/diagnostics/confinement
    post.setPipeline(pDivCurl);
    post.setBindGroup(0, liveBGs.divCurlPost);
    post.dispatchWorkgroups(wg, wg, 1);
    // decoupled high-res dye rides the projected velocity
    post.setPipeline(pAdvectDye);
    post.setBindGroup(0, bgAdvectDye[dyeCur]!);
    post.dispatchWorkgroups(wgDye, wgDye, 1);
    post.end();
    dyeCur = 1 - dyeCur;
  }

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
    pass.setBindGroup(0, renderBG(densCur, dyeCur));
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
  }

  function snapshotDensity(): void {
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(dens[densCur]!, 0, snapBuf, 0, scalarBytes);
    queue.submit([enc.finish()]);
  }

  async function readBuffer(src: GPUBuffer, bytes: number): Promise<Float32Array<ArrayBuffer>> {
    const rb = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(src, 0, rb, 0, bytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0)).slice();
    rb.unmap();
    rb.destroy();
    return out;
  }

  // ---- scene management -------------------------------------------------------
  let scene: Scene = SCENES[0]!;
  let frameCount = 0;
  let sceneStep = 0; // sim steps since scene load (drives the TG decay plot)
  let ke0 = 0; // measured KE at scene load

  function buildMask(kind: "cylinder" | null): void {
    const m = new Float32Array(cells);
    if (kind === "cylinder") {
      const cx = N * 0.25;
      const cy = N * 0.5;
      const r = N * 0.065;
      for (let i = 0; i < N; i += 1) {
        for (let j = 0; j < N; j += 1) {
          const d2 = (i - cx) ** 2 + (j - cy) ** 2;
          if (d2 < r * r) m[i * N + j] = 1;
        }
      }
    }
    queue.writeBuffer(maskBuf, 0, m);
  }

  function measureKE(vel: Float32Array): number {
    let ke = 0;
    for (let c = 0; c < cells; c += 1) {
      const u = vel[c * 2] ?? 0;
      const v = vel[c * 2 + 1] ?? 0;
      ke += u * u + v * v;
    }
    return 0.5 * ke;
  }

  function loadScene(s: Scene): void {
    scene = s;
    const ic = s.ic();
    queue.writeBuffer(vel0, 0, ic.vel);
    queue.writeBuffer(dens[0]!, 0, ic.density);
    queue.writeBuffer(dens[1]!, 0, ic.density);
    queue.writeBuffer(snapBuf, 0, ic.density);
    const dyeInit = new Float32Array(DYE_N * DYE_N * 4);
    // seed the dye from the density IC (upsampled), tinted by the scene map
    const tint = getColormap(s.colormap).stops[4] ?? [0.8, 0.8, 0.8];
    for (let i = 0; i < DYE_N; i += 1) {
      const si = Math.floor((i / DYE_N) * N);
      for (let j = 0; j < DYE_N; j += 1) {
        const sj = Math.floor((j / DYE_N) * N);
        const d = ic.density[si * N + sj] ?? 0;
        const idx = (i * DYE_N + j) * 4;
        dyeInit[idx] = d * (tint[0] ?? 0.8);
        dyeInit[idx + 1] = d * (tint[1] ?? 0.8);
        dyeInit[idx + 2] = d * (tint[2] ?? 0.8);
        dyeInit[idx + 3] = d;
      }
    }
    queue.writeBuffer(dye[0]!, 0, dyeInit);
    queue.writeBuffer(dye[1]!, 0, dyeInit);
    queue.writeBuffer(divBuf, 0, new Float32Array(cells));
    queue.writeBuffer(curlBuf, 0, new Float32Array(cells));
    queue.writeBuffer(p0, 0, new Float32Array(cells));
    densCur = 0;
    dyeCur = 0;
    frameCount = 0;
    sceneStep = 0;
    stepCounter = 0;
    ke0 = measureKE(ic.vel);
    kePlot.length = 0;
    // scene live-knob overrides on top of neutral defaults
    live.nu = PARAMS.nu;
    live.confineEps = 0;
    live.buoyancy = 0;
    live.dissipateVel = 0;
    live.dissipateDye = 0.15;
    live.inflowU = 0;
    live.obstacles = false;
    Object.assign(live, s.live);
    buildMask(s.mask ?? null);
    maskOn = s.mask ? 1 : 0;
    viewMode = s.view;
    colormapName = s.colormap;
    cmapPrimary = packColormap(getColormap(colormapName));
    cmapSecondary = packColormap(ghostFor(colormapName));
    syncLiveUniforms();
    syncControls();
    writeRenderUniform();
    updateShareUrl();
  }

  // ---- capture: the demo's canonical descriptor --------------------------------
  // Reproduces taylor-green-2d-128sq-seed42-step1000: reloads the canonical TG
  // IC, then steps ONLY via encodeCanonicalStep (canonical paramBuf, flags=0)
  // — scene, slider and cursor state cannot reach it; frame() early-returns
  // while isCapturing().
  async function captureCanonical(): Promise<void> {
    panel.setStatus("capturing… (1000 canonical steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    const savedScene = scene;
    const ic = taylorGreenIC();
    queue.writeBuffer(vel0, 0, ic.vel);
    queue.writeBuffer(dens[0]!, 0, ic.density);
    densCur = 0;
    const steps: CaptureStepDescriptor[] = [];
    const recordStep = async (idx: number): Promise<void> => {
      const velArr = await readBuffer(vel0, velBytes);
      const densArr = await readBuffer(dens[densCur]!, scalarBytes);
      const u = new Float64Array(cells);
      const v = new Float64Array(cells);
      const d = new Float64Array(cells);
      let mass = 0;
      let energy = 0;
      for (let c = 0; c < cells; c += 1) {
        u[c] = velArr[c * 2] ?? 0;
        v[c] = velArr[c * 2 + 1] ?? 0;
        d[c] = densArr[c] ?? 0;
        mass += d[c];
        energy += u[c] * u[c] + v[c] * v[c];
      }
      steps.push({
        step: idx,
        state: {
          u: field(u, [N, N], "f64"),
          v: field(v, [N, N], "f64"),
          density: field(d, [N, N], "f64"),
        },
        diagnostics: { mass_density: mass, energy: 0.5 * energy },
      });
    };
    await recordStep(0);
    // one submit per checkpoint interval: 100 steps × 26 dispatches per encoder
    for (let s = 0; s < CANONICAL_STEPS; s += CAPTURE_INTERVAL) {
      const enc = device.createCommandEncoder();
      const hi = Math.min(s + CAPTURE_INTERVAL, CANONICAL_STEPS);
      for (let k = s; k < hi; k += 1) encodeCanonicalStep(enc);
      queue.submit([enc.finish()]);
      await recordStep(hi);
    }
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "eulerian-smoke", category: "volumetric-grid", variant: "stam-fedkiw-stable-fluids-2d-taylor-green" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-6.x" },
          config: { tier: "test", dims: [N, N], dtype: "f64", seed: V.canonical.seed, params: { ...PARAMS } },
          run: {
            step_count: CANONICAL_STEPS,
            capture_interval: CAPTURE_INTERVAL,
            wall_clock_seconds: 0,
            start_utc: "2026-07-03T00:00:00Z",
          },
          payload: {
            format: "hdf5",
            path: `${V.canonical.descriptor}.h5`,
            checksum: `sha256:${V.gate_asset.sha256}`,
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
    loadScene(savedScene);
    panel.setStatus("capture ready (window.__bitPhysicsCapture)");
    panel.setCaptureEnabled(true);
  }

  // ---- diagnostics ---------------------------------------------------------------
  let suspended = false;
  let diagSeq = 0;
  const kePlot: { t: number; ke: number }[] = [];

  interface FieldStats {
    ke: number;
    enstrophy: number;
    mass: number;
    maxDiv: number;
    minDens: number;
  }
  async function measureStats(): Promise<FieldStats> {
    const [velArr, densArr, divArr, curlArr] = await Promise.all([
      readBuffer(vel0, velBytes),
      readBuffer(dens[densCur]!, scalarBytes),
      readBuffer(divBuf, scalarBytes),
      readBuffer(curlBuf, scalarBytes),
    ]);
    let ke = 0;
    let ens = 0;
    let mass = 0;
    let maxDiv = 0;
    let minDens = Infinity;
    for (let c = 0; c < cells; c += 1) {
      const u = velArr[c * 2] ?? 0;
      const v = velArr[c * 2 + 1] ?? 0;
      ke += u * u + v * v;
      const w = curlArr[c] ?? 0;
      ens += w * w;
      const d = densArr[c] ?? 0;
      mass += d;
      if (d < minDens) minDens = d;
      const dv = Math.abs(divArr[c] ?? 0);
      if (dv > maxDiv) maxDiv = dv;
    }
    return { ke: 0.5 * ke, enstrophy: 0.5 * ens, mass, maxDiv, minDens };
  }

  const fmtE = (x: number): string => x.toExponential(2);

  function updateLiveDiag(s: FieldStats): void {
    liveDiagDl.textContent = "";
    const rows: [string, string][] = [
      ["scene / step", `${scene.label} / ${stepCounter}`],
      ["kinetic energy", s.ke.toFixed(2)],
      ["enstrophy", s.enstrophy.toFixed(1)],
      ["smoke mass", s.mass.toFixed(1)],
      ["max |∇·u| (post-projection)", fmtE(s.maxDiv)],
      ["min density", fmtE(s.minDens)],
    ];
    for (const [k, v] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      liveDiagDl.append(dt, dd);
    }
  }

  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const s = await measureStats();
    if (seq !== diagSeq) return;
    updateLiveDiag(s);
    panel.setDiagnostics([
      { label: "scene", value: scene.label },
      { label: "grid / dye", value: `${N}² / ${DYE_N}²` },
      { label: "live step", value: String(stepCounter) },
      { label: "advection", value: live.maccormack ? (live.limiter ? "MacCormack+limiter" : "MacCormack") : "plain SL" },
      { label: "Jacobi iters (live)", value: `${live.jacobiIters}${live.warmStart ? " + warm-start" : " (zero-init)"}` },
      { label: "kinetic energy", value: s.ke.toFixed(2) },
      { label: "enstrophy", value: s.enstrophy.toFixed(1) },
      { label: "max |∇·u|", value: fmtE(s.maxDiv) },
      { label: "min density", value: fmtE(s.minDens) },
      { label: "capture pinned to", value: "canonical TG params, Jacobi-20, MacCormack" },
    ]);
  }

  // ---- panel ------------------------------------------------------------------
  const panel = createSettingsPanel("Eulerian Smoke — Stable Fluids", {
    caption:
      "Stam's unconditionally stable smoke solver: advect, diffuse, project. Finger-paint incompressible flow — and watch the divergence residual the projection can and cannot remove.",
    initial: { tier: "test", seed: V.canonical.seed },
    onCapture: captureCanonical,
    onChange: () => {
      loadScene(scene);
    },
    presets: SCENES.map((s) => ({
      label: s.label,
      title: s.title,
      apply: () => {
        loadScene(s);
        panel.setStatus(
          s.id === "taylor-green"
            ? "live scene: the gated canonical — capture reproduces exactly this"
            : `live scene: ${s.label} — capture stays pinned to the canonical TG run`,
        );
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
          "the committed stable_fluids_2d.wgsl — MacCormack SL advection (no limiter), explicit diffusion, zero-init Jacobi-20 projection, plain-SL density, fully periodic, exactly the frozen NumPy reference's sequence; the capture re-runs the canonical Taylor-Green scene at the frozen params " +
          `(ν ${PARAMS.nu}, dt ${PARAMS.dt}, ${N}², Jacobi-${PARAMS.n_jacobi})`,
        simplified:
          "scenes, splats, buoyancy, 2D confinement, dissipation, obstacles and every slider drive the live loop only (the 2D reference has no confinement or walls — those are labeled web-only additions); " +
          `the gate re-runs the frozen f64 reference live and holds every checkpoint to rel ${V.gate.declared_rel} per field (measured worst ratio ${V.gate.measured.worst_ratio} of budget), run-twice byte-identical; ` +
          "the display (bilinear reconstruction, relief, glow, colormaps, dither, tonemap) is render-side presentation — the raw-grid toggle shows the exact texels",
        measured:
          "field statistics (energy, enstrophy, mass, max |∇·u|, min density) read back from the live buffers ~1.4×/s in Play and on entering Study",
      },
      verdict: {
        gate: `new_canonical (live f64 reference re-run, per-field rel ${V.gate.declared_rel} across ${1 + CANONICAL_STEPS / CAPTURE_INTERVAL} checkpoints; run-twice byte-identical)`,
        verdict: "PASS",
        pass: true,
      },
      links: [
        { label: "sim spec", href: `${V.repo_blob_base}${V.links.spec}` },
        { label: "reference source", href: `${V.repo_blob_base}${V.links.reference}` },
      ],
    },
  });

  // ---- INTERACT: sliders + toggles ---------------------------------------------
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
  ): SliderHandle {
    const row = document.createElement("div");
    row.className = "es-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const box = document.createElement("div");
    box.className = "es-slider-box";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "es-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const val = document.createElement("span");
    val.className = "es-val";
    val.textContent = fmt(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = fmt(v);
      onSet(v);
    });
    box.appendChild(input);
    row.append(lab, box, val);
    group.appendChild(row);
    return { input, val, fmt };
  }
  function addCheck(group: HTMLElement, label: string, title: string, checked: boolean, onSet: (v: boolean) => void): HTMLInputElement {
    const row = document.createElement("label");
    row.className = "es-check";
    row.title = title;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    const span = document.createElement("span");
    span.textContent = label;
    row.append(input, span);
    group.appendChild(row);
    input.addEventListener("change", () => {
      onSet(input.checked);
    });
    return input;
  }
  function addSelect(
    group: HTMLElement,
    label: string,
    options: readonly string[],
    value: string,
    onSet: (v: string) => void,
  ): HTMLSelectElement {
    const row = document.createElement("div");
    row.className = "es-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    sel.className = "es-select";
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

  let stepsPerFrame = 4;
  let splatForce = 6.0;
  let splatRadius = 3.5;
  let dyeHue = 0;

  const fluidGroup = panel.addGroup("fluid — live loop only");
  const nuSlider = addSlider(fluidGroup, "ν", 0, 0.05, 0.001, live.nu, (v) => v.toFixed(3), (v) => {
    live.nu = v;
    syncLiveUniforms();
  });
  const dissVSlider = addSlider(fluidGroup, "u decay", 0, 2, 0.01, live.dissipateVel, (v) => v.toFixed(2), (v) => {
    live.dissipateVel = v;
    syncLiveUniforms();
  });
  const dissDSlider = addSlider(fluidGroup, "dye decay", 0, 8, 0.05, live.dissipateDye, (v) => v.toFixed(2), (v) => {
    live.dissipateDye = v;
    syncLiveUniforms();
  });
  const confineSlider = addSlider(fluidGroup, "swirl ε", 0, 30, 0.5, live.confineEps, (v) => v.toFixed(1), (v) => {
    live.confineEps = v;
    syncLiveUniforms();
  });
  addSlider(fluidGroup, "speed", 1, 12, 1, stepsPerFrame, (v) => `${v}×`, (v) => {
    stepsPerFrame = Math.round(v);
  });
  const confineNote = document.createElement("div");
  confineNote.className = "es-note-line";
  confineNote.textContent = "swirl = 2D vorticity confinement — aesthetic web-only forcing (not in the 2D reference); injects energy, watch the plot";
  fluidGroup.appendChild(confineNote);

  const splatGroup = panel.addGroup("splat — drag the canvas");
  addSlider(splatGroup, "force", 1, 20, 0.5, splatForce, (v) => v.toFixed(1), (v) => {
    splatForce = v;
  });
  addSlider(splatGroup, "radius", 1, 10, 0.5, splatRadius, (v) => v.toFixed(1), (v) => {
    splatRadius = v;
  });

  const numericsGroup = panel.addGroup("numerics — exploratory toggles (gate-inert)");
  const mcCheck = addCheck(
    numericsGroup,
    "MacCormack advection (off = plain SL)",
    "The canonical uses MacCormack (2nd order). Toggle OFF to feel plain semi-Lagrangian's extra smearing — the TG plot shows the energy-decay gap.",
    live.maccormack,
    (v) => {
      live.maccormack = v;
    },
  );
  const limCheck = addCheck(
    numericsGroup,
    "MacCormack limiter (clamp overshoot)",
    "Selle-2008-style clamp — deliberately OFF on the canonical (it would mute the certified 2nd-order convergence); ON tames splat ringing.",
    live.limiter,
    (v) => {
      live.limiter = v;
      syncLiveUniforms();
    },
  );
  const warmCheck = addCheck(
    numericsGroup,
    "Jacobi warm-start (reuse last pressure)",
    "PavelDoGreat's production trick. The canonical zero-initializes every step, matching the reference. Watch max |∇·u| drop when ON.",
    live.warmStart,
    (v) => {
      live.warmStart = v;
    },
  );
  const jacobiSlider = addSlider(numericsGroup, "Jacobi", 2, 120, 2, live.jacobiIters, (v) => String(Math.round(v)), (v) => {
    live.jacobiIters = 2 * Math.round(v / 2); // even counts keep pressure in p0
  });
  const jacobiNote = document.createElement("div");
  jacobiNote.className = "es-note-line";
  jacobiNote.textContent = "Harris (GPU Gems 38): 40–80 typical, don't go below 20. The residual floor that survives more iterations is the collocated-grid inconsistency — see equations → code.";
  numericsGroup.appendChild(jacobiNote);

  function syncControls(): void {
    nuSlider.input.value = String(live.nu);
    nuSlider.val.textContent = nuSlider.fmt(live.nu);
    dissVSlider.input.value = String(live.dissipateVel);
    dissVSlider.val.textContent = dissVSlider.fmt(live.dissipateVel);
    dissDSlider.input.value = String(live.dissipateDye);
    dissDSlider.val.textContent = dissDSlider.fmt(live.dissipateDye);
    confineSlider.input.value = String(live.confineEps);
    confineSlider.val.textContent = confineSlider.fmt(live.confineEps);
    jacobiSlider.input.value = String(live.jacobiIters);
    jacobiSlider.val.textContent = jacobiSlider.fmt(live.jacobiIters);
    mcCheck.checked = live.maccormack;
    limCheck.checked = live.limiter;
    warmCheck.checked = live.warmStart;
    panel.setActivePreset(scene.label);
    viewSel.value = VIEW_MODES[viewMode] ?? VIEW_MODES[0];
    mapSel.value = colormapName;
  }

  // ---- display controls ----------------------------------------------------------
  const displayGroup = panel.addGroup("display");
  const viewSel = addSelect(displayGroup, "view", VIEW_MODES, VIEW_MODES[viewMode]!, (v) => {
    viewMode = Math.max(0, VIEW_MODES.indexOf(v as (typeof VIEW_MODES)[number]));
    writeRenderUniform();
    updateShareUrl();
  });
  const mapSel = addSelect(displayGroup, "map", COLORMAPS.map((c) => c.name), colormapName, (v) => {
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
  addCheck(
    displayGroup,
    "raw grid — what the buffers actually hold",
    "Nearest-cell texels, lighting/glow/dither bypassed: the honest view. Everything smoother is display-side reconstruction of the same bytes.",
    rawGrid,
    (v) => {
      rawGrid = v;
      writeRenderUniform();
    },
  );
  const dispNote = document.createElement("div");
  dispNote.className = "es-note-line";
  dispNote.textContent =
    "divergence view = the PROVE residual heatmap · schlieren/curl/speed are data-derived, never re-simulated";
  displayGroup.appendChild(dispNote);

  // ---- always-on diagnostics + TG decay plot --------------------------------------
  const liveDiagGroup = panel.addGroup("diagnostics — measured live");
  const liveDiagDl = document.createElement("dl");
  liveDiagDl.className = "bps-diag es-diag-live";
  liveDiagGroup.appendChild(liveDiagDl);

  const plotWrap = document.createElement("div");
  plotWrap.className = "es-plot";
  const plotCap = document.createElement("div");
  plotCap.className = "es-plot-cap";
  plotCap.textContent = "kinetic energy vs the exact Navier-Stokes decay (TG scene)";
  plotCap.title =
    "The 2D Taylor-Green vortex is an exact NS solution: KE ∝ exp(−4νk²t). The gap between measured (accent) and analytic (dashed) is the scheme's numerical dissipation — toggle MacCormack↔SL and watch it change. Confinement dishonestly pushes the curve UP.";
  const plotCanvas = document.createElement("canvas");
  const PLOT_W = 240;
  const PLOT_H = 120;
  plotWrap.append(plotCap, plotCanvas);
  liveDiagGroup.appendChild(plotWrap);
  const plotCtx = plotCanvas.getContext("2d");

  function drawKePlot(): void {
    if (!plotCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (plotCanvas.width !== PLOT_W * dpr) {
      plotCanvas.width = PLOT_W * dpr;
      plotCanvas.height = PLOT_H * dpr;
    }
    const c = plotCtx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, PLOT_W, PLOT_H);
    c.strokeStyle = "rgba(255,255,255,0.14)";
    c.strokeRect(6, 6, PLOT_W - 12, PLOT_H - 12);
    if (kePlot.length < 2 || ke0 <= 0) {
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.font = "9px system-ui, sans-serif";
      c.fillText(scene.id === "taylor-green" ? "collecting…" : "select the canonical (TG) scene for the analytic overlay", 10, PLOT_H / 2);
      return;
    }
    const tMax = Math.max(kePlot[kePlot.length - 1]!.t, 1e-6);
    const x = (t: number): number => 6 + (t / tMax) * (PLOT_W - 12);
    const y = (r: number): number => PLOT_H - 6 - Math.max(0, Math.min(1, r)) * (PLOT_H - 12);
    const kDecay = 4.0 * live.nu * (2 * Math.PI) ** 2;
    // analytic (dashed)
    c.setLineDash([3, 3]);
    c.strokeStyle = "rgba(255,255,255,0.45)";
    c.beginPath();
    for (let s = 0; s <= 60; s += 1) {
      const t = (s / 60) * tMax;
      const py = y(Math.exp(-kDecay * t));
      if (s === 0) c.moveTo(x(t), py);
      else c.lineTo(x(t), py);
    }
    c.stroke();
    c.setLineDash([]);
    // measured
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4dd8c0";
    c.strokeStyle = accent;
    c.beginPath();
    kePlot.forEach((pt, i) => {
      const px = x(pt.t);
      const py = y(pt.ke / ke0);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    });
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.font = "8.5px system-ui, sans-serif";
    c.fillText("KE/KE₀ · dashed = exp(−4νk²t)", 10, 14);
  }

  window.setInterval(() => {
    if (isCapturing()) return;
    const seq = ++diagSeq;
    void measureStats().then((s) => {
      if (seq !== diagSeq) return;
      updateLiveDiag(s);
      if (scene.id === "taylor-green" && !suspended) {
        kePlot.push({ t: sceneStep * PARAMS.dt, ke: s.ke });
        if (kePlot.length > 400) kePlot.shift();
      }
      drawKePlot();
      if (suspended) void measureStudyDiagnostics();
    });
  }, 700);

  // ---- null-space probe --------------------------------------------------------
  const probeGroup = panel.addGroup("null-space probe — why MAC grids exist");
  const probeBtn = document.createElement("button");
  probeBtn.type = "button";
  probeBtn.className = "bps-btn";
  probeBtn.textContent = "Inject the (−1)^i checkerboard";
  probeBtn.title =
    "Adds the oscillating mode u += A(−1)^i, v += A(−1)^j to the LIVE velocity. The centered-difference stencil (u[i+1] − u[i−1])/2dx never reads u[i], so the divergence readout stays blind while the field is visibly corrupted (switch to the speed view). Bridson ch. 2's null-space, live. Live loop only — the capture path is untouched.";
  const probeOut = document.createElement("div");
  probeOut.className = "es-hash";
  probeGroup.append(probeBtn, probeOut);
  probeBtn.addEventListener("click", () => {
    if (isCapturing()) return;
    void (async () => {
      const before = await measureStats();
      const velArr = await readBuffer(vel0, velBytes);
      const amp = 0.25;
      for (let i = 0; i < N; i += 1) {
        for (let j = 0; j < N; j += 1) {
          const idx = (i * N + j) * 2;
          velArr[idx] = (velArr[idx] ?? 0) + amp * (i % 2 === 0 ? 1 : -1);
          velArr[idx + 1] = (velArr[idx + 1] ?? 0) + amp * (j % 2 === 0 ? 1 : -1);
        }
      }
      queue.writeBuffer(vel0, 0, velArr);
      // refresh the div/curl buffers so the readout reflects the corrupted field
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(pDivCurl);
      pass.setBindGroup(0, liveBGs.divCurlPost);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.end();
      queue.submit([enc.finish()]);
      const after = await measureStats();
      probeOut.textContent = "";
      const b = document.createElement("b");
      b.textContent = "centered |∇·u| before → after: ";
      probeOut.append(
        b,
        document.createTextNode(`${fmtE(before.maxDiv)} → ${fmtE(after.maxDiv)} — `),
      );
      const s = document.createElement("span");
      s.className = "ok";
      s.textContent =
        "the stencil is blind to the ±0.25 checkerboard now visibly corrupting the field (speed view). That blindness is the collocated null-space; the MAC-staggered grid removes it.";
      probeOut.appendChild(s);
      panel.setStatus("null-space mode injected — projection cannot see or remove it");
    })();
  });

  // ---- pointer splats ------------------------------------------------------------
  let pointer: { x: number; y: number; px: number; py: number } | null = null;
  function toGrid(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    return { x: u * N, y: (1 - v) * N }; // y up, matching the render mapping
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = toGrid(e);
    pointer = { ...p, px: p.x, py: p.y };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointer) return;
    const p = toGrid(e);
    pointer = { x: p.x, y: p.y, px: pointer.x, py: pointer.y };
    const dvx = (p.x - pointer.px) * splatForce * 0.4;
    const dvy = (p.y - pointer.py) * splatForce * 0.4;
    dyeHue = (dyeHue + 4) % 360;
    const [r, g, b] = hsv(dyeHue, 0.75, 0.95);
    pendingSplats.push({ x: p.x, y: p.y, dvx, dvy, r, g, b, amount: 0.35, radius: splatRadius });
  });
  const endPointer = (): void => {
    pointer = null;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  // ---- URL share -----------------------------------------------------------------
  function updateShareUrl(): void {
    const q = new URLSearchParams();
    if (scene.id !== SCENES[0]!.id) q.set("scene", scene.id);
    if (viewMode !== scene.view) q.set("view", String(viewMode));
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }
  function applyUrl(): Scene {
    const q = new URLSearchParams(window.location.search);
    const s = SCENES.find((x) => x.id === q.get("scene")) ?? SCENES[0]!;
    const v = Number(q.get("view"));
    if (Number.isFinite(v) && v >= 0 && v < VIEW_MODES.length && q.has("view")) {
      // applied after loadScene below
      window.setTimeout(() => {
        viewMode = v;
        writeRenderUniform();
        syncControls();
      }, 0);
    }
    return s;
  }

  // EXPLAIN + PROVE layers
  installExplainPanel(panel);
  installVerifyPanel({
    panel,
    device,
    queue,
    pipelines: {
      advectSL: pAdvectSL,
      correct: pCorrect,
      diffuse: pDiffuse,
      divCurl: pDivCurl,
      jacobi: pJacobi,
      gradSub: pGradSub,
      advectDens: pAdvectDens,
    },
    n: N,
    canonicalSteps: CANONICAL_STEPS,
    jacobiIters: PARAMS.n_jacobi,
    writeCanonicalParams: (buf) => {
      writeSolverParams(buf, PARAMS, 0);
    },
    buildCanonicalIC: taylorGreenIC,
  });

  loadScene(applyUrl());
  setBoot("");

  const SNAP_FRAMES = 4;

  function frame(): void {
    if (isCapturing()) {
      requestAnimationFrame(frame);
      return;
    }
    if (!suspended) {
      const emitted = scene.emitter ? scene.emitter(frameCount) : [];
      const splats = [...pendingSplats, ...emitted].slice(0, 8);
      pendingSplats = [];
      const armed = splats.length > 0;
      if (armed) writeSplats(splats);
      const enc = device.createCommandEncoder();
      for (let s = 0; s < stepsPerFrame; s += 1) {
        encodeLiveFrameStep(enc, armed && s === 0);
      }
      queue.submit([enc.finish()]);
      sceneStep += stepsPerFrame;
      frameCount += 1;
      if (frameCount % SNAP_FRAMES === 0) snapshotDensity();
    }
    renderFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Mark the app booted for the headless smoke harness.
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
