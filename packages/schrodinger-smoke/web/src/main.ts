// schrodinger-smoke — Schrödinger's Smoke in the browser (Stack-B WebGPU,
// verification-visible demo; web spec v0.2).
//
// FIRST browser 3D Incompressible Schrödinger Flow that we could find
// (prior-art scan 2026-07-05: CUDA / Unity / Julia / MATLAB ports only —
// see the EXPLAIN panel). The wavefunction grid is small; the spectacle is
// the passive tracer cloud, which never feeds back into the gated state.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import {
  exposeCapture,
  isCapturing,
  resetCapture,
} from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";

import tracersWgsl from "./tracers.wgsl?raw";
import V from "./generated/verification.json";
import { GATE, makeBundle, runGateScene, sha256hex } from "./capture.js";
import { installExplainPanel } from "./explain.js";
import { sceneByKey, SCENES } from "./scenes.js";
import { IsfGpu } from "./solver.js";
import { installVerifyPanel } from "./verify-panel.js";

// ---------------------------------------------------------------------------
// data-spine drift check (fail loudly at boot, eulerian precedent)
// ---------------------------------------------------------------------------
if (
  V.gate.n !== GATE.n ||
  V.gate.hbar !== GATE.hbar ||
  V.gate.steps !== GATE.steps ||
  V.gate.capture_interval !== GATE.captureInterval ||
  V.gate.kind !== "new_canonical"
) {
  throw new Error(
    "verification.json gate values drifted from compute constants — rerun gen-verification.mjs",
  );
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;
const setBoot = (m: string): void => {
  boot.textContent = m;
};

// ---------------------------------------------------------------------------
// tiny mat4 helpers (column-major, WebGPU clip space)
// ---------------------------------------------------------------------------

type Mat4 = Float32Array;

function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = (near * far) / (near - far);
  return out;
}

function lookAt(eye: [number, number, number], target: [number, number, number]): Mat4 {
  const up: [number, number, number] = [0, 1, 0];
  const zx = eye[0] - target[0];
  const zy = eye[1] - target[1];
  const zz = eye[2] - target[2];
  const zl = Math.hypot(zx, zy, zz);
  const z = [zx / zl, zy / zl, zz / zl];
  const x = [
    up[1] * z[2] - up[2] * z[1],
    up[2] * z[0] - up[0] * z[2],
    up[0] * z[1] - up[1] * z[0],
  ];
  const xl = Math.hypot(x[0], x[1], x[2]);
  x[0] /= xl;
  x[1] /= xl;
  x[2] /= xl;
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];
  const out = new Float32Array(16);
  out[0] = x[0];
  out[1] = y[0];
  out[2] = z[0];
  out[4] = x[1];
  out[5] = y[1];
  out[6] = z[1];
  out[8] = x[2];
  out[9] = y[2];
  out[10] = z[2];
  out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  out[15] = 1;
  return out;
}

// ---------------------------------------------------------------------------
// app state
// ---------------------------------------------------------------------------

interface AppState {
  device: GPUDevice;
  gpu: IsfGpu;
  n: number;
  sceneKey: string;
  hbar: number;
  dt: number;
  running: boolean;
  ungated: boolean;
  colorMode: 0 | 1 | 2;
  rk4: boolean;
  tracerCount: number;
  tracerCap: number;
  adaptive: boolean;
  frame: number;
  stepCount: number;
  brushMode: boolean;
  glow: number;
}

async function start(): Promise<void> {
  setBoot("initializing WebGPU…");
  const ctx = await createContext();
  const device = ctx.device;
  // surface validation errors loudly (pic-flip lesson: layout-auto bind-group
  // mismatches silently discard submits without this)
  device.addEventListener("uncapturederror", (ev) => {
    console.error(
      "WebGPU uncaptured error:",
      (ev as GPUUncapturedErrorEvent).error.message,
    );
  });

  const surface = canvas.getContext("webgpu");
  if (!surface) throw new Error("no webgpu canvas context");
  const format = navigator.gpu.getPreferredCanvasFormat();
  surface.configure({ device, format, alphaMode: "opaque" });

  const st: AppState = {
    device,
    gpu: new IsfGpu(device, 64, { hbar: 0.05, dt: 1 / 24 }),
    n: 64,
    sceneKey: "ring",
    hbar: 0.05,
    dt: 1 / 24,
    running: true,
    ungated: false,
    colorMode: 1,
    rk4: false,
    tracerCount: 262144,
    tracerCap: 4194304,
    adaptive: true,
    frame: 0,
    stepCount: 0,
    brushMode: false,
    glow: 0.55,
  };

  // ---------------------------------------------------------------------
  // tracer system
  // ---------------------------------------------------------------------
  const tracerModule = device.createShaderModule({ label: "tracers", code: tracersWgsl });
  const tracerBuf = device.createBuffer({
    size: st.tracerCap * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const tuni = device.createBuffer({
    size: 208,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const boxBuf = device.createBuffer({
    size: 24 * 2 * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  {
    // 12 box edges as line-list vertices
    const c = [0, 1];
    const verts: number[] = [];
    const push = (p: number[]): void => {
      verts.push(p[0], p[1], p[2], 1);
    };
    for (const a of c)
      for (const b of c) {
        push([a, b, 0]);
        push([a, b, 1]);
        push([a, 0, b]);
        push([a, 1, b]);
        push([0, a, b]);
        push([1, a, b]);
      }
    device.queue.writeBuffer(boxBuf, 0, new Float32Array(verts));
  }

  type SeedRegion = { type: 0 | 1 | 2 | 3; center: [number, number, number]; radius: number; thick: number; maxAge: number };
  let seedRegion: SeedRegion = { type: 0, center: [0.5, 0.5, 0.5], radius: 0, thick: 0, maxAge: 20 };

  const seedTracers = (count: number): void => {
    const data = new Float32Array(count * 4);
    let s = 12345;
    const rnd = (): number => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const r = seedRegion;
    for (let i = 0; i < count; i++) {
      let px = rnd();
      let py = rnd();
      let pz = rnd();
      if (r.type === 1) {
        const th = 2 * Math.PI * px;
        const cz = 2 * py - 1;
        const sz = Math.sqrt(Math.max(0, 1 - cz * cz));
        const rr = r.radius * Math.cbrt(pz);
        px = r.center[0] + rr * sz * Math.cos(th);
        py = r.center[1] + rr * sz * Math.sin(th);
        pz = r.center[2] + rr * cz;
      } else if (r.type === 2) {
        px = r.center[0] + (px - 0.5) * 2 * r.thick;
      } else if (r.type === 3) {
        const th = 2 * Math.PI * px;
        const rr = r.radius * Math.sqrt(py);
        px = r.center[0] + (pz - 0.5) * 2 * r.thick;
        py = r.center[1] + rr * Math.cos(th);
        pz = r.center[2] + rr * Math.sin(th);
      }
      data[i * 4] = ((px % 1) + 1) % 1;
      data[i * 4 + 1] = ((py % 1) + 1) % 1;
      data[i * 4 + 2] = ((pz % 1) + 1) % 1;
      data[i * 4 + 3] = rnd() * r.maxAge;
    }
    device.queue.writeBuffer(tracerBuf, 0, data);
  };
  seedTracers(st.tracerCap);

  const velSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "repeat",
  });

  // compute (advect) and render need DIFFERENT views of the tracer buffer:
  // read_write storage is not allowed in vertex stages, so the render layout
  // binds the same buffer read-only at slot 4 (sph particles.wgsl precedent)
  const tracerComputeLayout = device.createBindGroupLayout({
    label: "tracer-compute-layout",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "float", viewDimension: "3d" },
      },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, sampler: { type: "filtering" } },
    ],
  });
  const tracerRenderLayout = device.createBindGroupLayout({
    label: "tracer-render-layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        texture: { sampleType: "float", viewDimension: "3d" },
      },
      { binding: 3, visibility: GPUShaderStage.VERTEX, sampler: { type: "filtering" } },
      {
        binding: 4,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });
  const lineLayout = device.createBindGroupLayout({
    label: "line-layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const mkTracerGroups = (): { compute: GPUBindGroup; render: GPUBindGroup } => ({
    compute: device.createBindGroup({
      label: "tracer-compute-group",
      layout: tracerComputeLayout,
      entries: [
        { binding: 0, resource: { buffer: tuni } },
        { binding: 1, resource: { buffer: tracerBuf } },
        { binding: 2, resource: st.gpu.velTex.createView() },
        { binding: 3, resource: velSampler },
      ],
    }),
    render: device.createBindGroup({
      label: "tracer-render-group",
      layout: tracerRenderLayout,
      entries: [
        { binding: 0, resource: { buffer: tuni } },
        { binding: 2, resource: st.gpu.velTex.createView() },
        { binding: 3, resource: velSampler },
        { binding: 4, resource: { buffer: tracerBuf } },
      ],
    }),
  });
  let tracerGroups = mkTracerGroups();
  const lineGroup = device.createBindGroup({
    label: "line-group",
    layout: lineLayout,
    entries: [
      { binding: 0, resource: { buffer: tuni } },
      { binding: 1, resource: { buffer: boxBuf } },
    ],
  });

  const advectPipe = device.createComputePipeline({
    label: "tracer_advect",
    layout: device.createPipelineLayout({ bindGroupLayouts: [tracerComputeLayout] }),
    compute: { module: tracerModule, entryPoint: "advect" },
  });
  const additive: GPUBlendState = {
    color: { srcFactor: "one", dstFactor: "one", operation: "add" },
    alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
  };
  const tracerRenderPipe = device.createRenderPipeline({
    label: "tracer_render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [tracerRenderLayout] }),
    vertex: { module: tracerModule, entryPoint: "vs_tracer" },
    fragment: {
      module: tracerModule,
      entryPoint: "fs_tracer",
      targets: [{ format, blend: additive }],
    },
    primitive: { topology: "triangle-list" },
  });
  const linePipe = device.createRenderPipeline({
    label: "box_lines",
    layout: device.createPipelineLayout({ bindGroupLayouts: [lineLayout] }),
    vertex: { module: tracerModule, entryPoint: "vs_line" },
    fragment: { module: tracerModule, entryPoint: "fs_line", targets: [{ format }] },
    primitive: { topology: "line-list" },
  });

  // ---------------------------------------------------------------------
  // camera (orbit) + brush
  // ---------------------------------------------------------------------
  const cam = { theta: 0.6, phi: 0.35, radius: 2.1 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let brushImpulse: { center: [number, number, number]; u: [number, number, number] } | null =
    null;

  const eyePos = (): [number, number, number] => [
    cam.radius * Math.cos(cam.phi) * Math.sin(cam.theta),
    cam.radius * Math.sin(cam.phi),
    cam.radius * Math.cos(cam.phi) * Math.cos(cam.theta),
  ];

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (st.brushMode) {
      // principled impulse brush (web spec § 2): a spherical Alg-4 constraint
      // region carrying the drag-direction plane wave for ONE step. Cursor is
      // mapped onto the plane through the box centre perpendicular to view.
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const eye = eyePos();
      // view-plane basis
      const fz = [-eye[0], -eye[1], -eye[2]];
      const fl = Math.hypot(fz[0], fz[1], fz[2]);
      const f = [fz[0] / fl, fz[1] / fl, fz[2] / fl];
      const r = [f[2], 0, -f[0]];
      const rl = Math.hypot(r[0], r[1], r[2]) || 1;
      const rx = [r[0] / rl, r[1] / rl, r[2] / rl];
      const upv = [
        rx[1] * f[2] - rx[2] * f[1],
        rx[2] * f[0] - rx[0] * f[2],
        rx[0] * f[1] - rx[1] * f[0],
      ];
      const half = Math.tan(0.45) * cam.radius;
      const wx = 0.5 + (ndcX * half * rx[0] - ndcY * half * upv[0]) * -1;
      const wy = 0.5 + (ndcX * half * rx[1] - ndcY * half * upv[1]) * -1;
      const wz = 0.5 + (ndcX * half * rx[2] - ndcY * half * upv[2]) * -1;
      const speed = 0.9;
      const dir = [
        (dx / rect.width) * rx[0] - (dy / rect.height) * upv[0],
        (dx / rect.width) * rx[1] - (dy / rect.height) * upv[1],
        (dx / rect.width) * rx[2] - (dy / rect.height) * upv[2],
      ];
      const dl = Math.hypot(dir[0], dir[1], dir[2]);
      if (dl > 1e-4) {
        brushImpulse = {
          center: [
            Math.min(0.95, Math.max(0.05, wx)),
            Math.min(0.95, Math.max(0.05, wy)),
            Math.min(0.95, Math.max(0.05, wz)),
          ],
          u: [
            ((dir[0] / dl) * speed * st.hbar) / st.hbar,
            ((dir[1] / dl) * speed * st.hbar) / st.hbar,
            ((dir[2] / dl) * speed * st.hbar) / st.hbar,
          ],
        };
      }
    } else {
      cam.theta -= dx * 0.008;
      cam.phi = Math.min(1.4, Math.max(-1.4, cam.phi + dy * 0.008));
    }
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.radius = Math.min(5, Math.max(0.8, cam.radius * (1 + e.deltaY * 0.001)));
  });

  // ---------------------------------------------------------------------
  // scene loading
  // ---------------------------------------------------------------------
  let sceneConstraint: (typeof SCENES)[number]["constraint"] | undefined;
  let sceneBuoyancy = 0;
  let omegaT = 0;

  const loadScene = (key: string): void => {
    const spec = sceneByKey(key);
    st.sceneKey = key;
    st.hbar = spec.hbar;
    st.dt = spec.dt;
    st.ungated = !spec.gated;
    st.stepCount = 0;
    omegaT = 0;
    sceneConstraint = spec.constraint;
    sceneBuoyancy = spec.buoyancy ?? 0;
    setBoot(`building ${spec.label} IC in f64…`);
    // f64 build+settle can take a moment at 128^3; yield so the boot line paints
    setTimeout(() => {
      const packed = spec.build(st.n, st.hbar);
      st.gpu.setParams({ hbar: st.hbar, dt: st.dt });
      st.gpu.uploadPsi(packed);
      st.gpu.ungated = false;
      applyConstraintUniforms();
      seedRegion = spec.seed
        ? { ...spec.seed }
        : { type: 0, center: [0.5, 0.5, 0.5], radius: 0, thick: 0, maxAge: 20 };
      seedTracers(st.tracerCap);
      setBoot("");
      updateStudy();
    }, 16);
  };

  const applyConstraintUniforms = (): void => {
    if (brushImpulse) {
      st.gpu.constraint = {
        kind: 1,
        center: brushImpulse.center,
        radius: 0.07,
        kvec: [
          (brushImpulse.u[0] * 0.9) / st.hbar,
          (brushImpulse.u[1] * 0.9) / st.hbar,
          (brushImpulse.u[2] * 0.9) / st.hbar,
        ],
        omegaT: 0,
      };
    } else if (sceneConstraint) {
      const u = sceneConstraint.u;
      st.gpu.constraint = {
        kind: sceneConstraint.kind,
        center: sceneConstraint.center,
        radius: sceneConstraint.radius,
        kvec: [u[0] / st.hbar, u[1] / st.hbar, u[2] / st.hbar],
        omegaT,
      };
    } else {
      st.gpu.constraint = { kind: 0, center: [0.5, 0.5, 0.5], radius: 0, kvec: [0, 0, 0], omegaT: 0 };
    }
    st.gpu.buoyancy = sceneBuoyancy;
    st.gpu.writeUniforms();
  };

  const rebuildGrid = (n: number): void => {
    st.gpu.destroy();
    st.n = n;
    st.gpu = new IsfGpu(device, n, { hbar: st.hbar, dt: st.dt });
    tracerGroups = mkTracerGroups();
    loadScene(st.sceneKey);
  };

  // ---------------------------------------------------------------------
  // panel
  // ---------------------------------------------------------------------
  const hud = document.createElement("div");
  hud.className = "ss-hud";
  document.body.appendChild(hud);

  let lastStats = { maxEta: 0, maxDiv: 0 };
  let fps = 0;
  let gridMs = 0;
  let frameMs = 16.7;

  const panel = createSettingsPanel("Schrödinger's Smoke — ISF (verified)", {
    caption:
      "Incompressible Schrödinger Flow (Chern et al. 2016): a quantum wavefunction whose phase IS the fluid — with machine-exact spectral gates re-run on your GPU.",
    onCapture: captureCanonical,
    presets: SCENES.map((s) => ({
      label: s.label,
      title: s.title,
      apply: () => loadScene(s.key),
    })),
    modes: {
      initial: "play",
      onMode: (m) => {
        st.running = m === "play";
      },
    },
    study: {
      diagnostics: [],
      honesty: {
        faithful:
          "split-step spectral ISF exactly as published (two-spectra rule, Eq. 17/18); f64-precomputed multiplier tables; velocity readout eta = hbar*arg<psi_a,psi_b>",
        simplified:
          "f32 GPU arithmetic (gate budget MEASURED vs the f64 backend); ISF itself is Euler + a Landau-Lifshitz term — vortices move as if 1/e thinner (NOT exact Euler)",
        measured: "2026-07-05 backend execution + this device's live gate re-run",
      },
      verdict: { gate: "new_canonical (isf rel 1e-4)", verdict: "run gate", pass: true },
      links: [
        {
          label: "spec-ref (backend)",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/volumetric-grid/schrodinger-smoke/spec-ref.md",
        },
        {
          label: "web demo spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/packages/schrodinger-smoke/web/verification-demo-spec.md",
        },
      ],
    },
  });

  const controls = panel.addGroup("physics");
  const addSlider = (
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (v: number) => void,
  ): HTMLInputElement => {
    const row = document.createElement("div");
    row.className = "bps-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(value);
    inp.addEventListener("input", () => onInput(Number(inp.value)));
    row.append(lab, inp);
    parent.appendChild(row);
    return inp;
  };

  addSlider(controls, "ħ (core thickness)", 0.01, 0.12, 0.005, st.hbar, (v) => {
    st.hbar = v;
    st.gpu.setParams({ hbar: v, dt: st.dt });
    applyConstraintUniforms();
  });
  addSlider(controls, "Δt", 1 / 96, 1 / 12, 1 / 96, st.dt, (v) => {
    st.dt = v;
    st.gpu.setParams({ hbar: st.hbar, dt: v });
  });

  const addSelect = (
    parent: HTMLElement,
    label: string,
    opts: [string, string][],
    value: string,
    onChange: (v: string) => void,
  ): void => {
    const row = document.createElement("div");
    row.className = "bps-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const sel = document.createElement("select");
    for (const [val, text] of opts) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = text;
      if (val === value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => onChange(sel.value));
    row.append(lab, sel);
    parent.appendChild(row);
  };

  addSelect(
    controls,
    "grid",
    [
      ["32", "32³"],
      ["64", "64³"],
      ["128", "128³"],
    ],
    "64",
    (v) => rebuildGrid(Number(v)),
  );

  const vis = panel.addGroup("visuals");
  addSelect(
    vis,
    "color",
    [
      ["0", "phase arg(ψ₁)"],
      ["1", "speed"],
      ["2", "age"],
    ],
    "1",
    (v) => {
      st.colorMode = Number(v) as 0 | 1 | 2;
    },
  );
  addSelect(
    vis,
    "tracers",
    [
      ["adaptive", "adaptive (60 FPS target)"],
      ["262144", "262k"],
      ["1048576", "1M"],
      ["4194304", "4M"],
    ],
    "adaptive",
    (v) => {
      st.adaptive = v === "adaptive";
      if (!st.adaptive) st.tracerCount = Math.min(Number(v), st.tracerCap);
    },
  );
  addSlider(vis, "glow", 0.1, 1.5, 0.05, st.glow, (v) => {
    st.glow = v;
  });

  const interact = panel.addGroup("interact");
  const addToggle = (
    parent: HTMLElement,
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ): void => {
    const row = document.createElement("div");
    row.className = "bps-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = value;
    inp.addEventListener("change", () => onChange(inp.checked));
    row.append(lab, inp);
    parent.appendChild(row);
  };
  addToggle(interact, "impulse brush (drag = Alg-4 kick; VOIDS gate until reset)", false, (v) => {
    st.brushMode = v;
  });
  addToggle(interact, "RK4 tracers (paper-faithful; RK2 default)", false, (v) => {
    st.rk4 = v;
  });
  {
    const btn = document.createElement("button");
    btn.className = "bps-btn";
    btn.type = "button";
    btn.textContent = "reset scene (restores gate eligibility)";
    btn.addEventListener("click", () => loadScene(st.sceneKey));
    interact.appendChild(btn);
  }

  const updateStudy = (): void => {
    panel.setDiagnostics([
      { label: "scene", value: st.sceneKey },
      { label: "grid", value: `${st.n}³ (f32 spectral)` },
      { label: "tracers", value: st.tracerCount.toLocaleString() },
      { label: "edge-phase headroom", value: `${((lastStats.maxEta / Math.PI) * 100).toFixed(1)}% of π` },
      { label: "max|∇·u| (phase units/dx²)", value: lastStats.maxDiv.toExponential(2) },
      { label: "gate state", value: st.gpu.ungated || st.ungated ? "UNGATED (interactive/beyond-canonical)" : "gated canonical" },
    ]);
  };

  installExplainPanel();
  installVerifyPanel({
    device,
    runGate: () => runGateScene(device),
    sha256hex,
  });

  // ---------------------------------------------------------------------
  // capture (the web-deploy driver clicks this)
  // ---------------------------------------------------------------------
  async function captureCanonical(): Promise<void> {
    resetCapture();
    panel.setStatus("gate run 1/2 (32³ ring, f64 IC)…");
    const t0 = performance.now();
    const run1 = await runGateScene(device);
    panel.setStatus("gate run 2/2 (determinism witness)…");
    const run2 = await runGateScene(device);
    const wall = (performance.now() - t0) / 1000;
    const identical = run1.trajectorySha === run2.trajectorySha;
    if (!identical) {
      panel.setStatus(`RUN-TWICE MISMATCH: ${run1.trajectorySha.slice(0, 12)} vs ${run2.trajectorySha.slice(0, 12)}`);
      panel.setVerdict({ gate: "run-twice byte-identity", verdict: "FAIL", pass: false });
      // expose anyway — verify.py must see the failure, not a silent pass
    } else {
      panel.setStatus(`captured; run-twice sha ${run2.trajectorySha.slice(0, 12)}… ✓`);
      panel.setVerdict({ gate: "run-twice byte-identity", verdict: "byte-identical", pass: true });
    }
    exposeCapture(makeBundle(run2, panel.getState().seed, wall));
  }

  // ---------------------------------------------------------------------
  // frame loop
  // ---------------------------------------------------------------------
  const tuniData = new ArrayBuffer(208);
  const writeTracerUniforms = (): void => {
    const dv = new DataView(tuniData);
    const aspect = canvas.width / canvas.height;
    const view = lookAt(eyePos(), [0, 0, 0]);
    const proj = perspective(0.9, aspect, 0.05, 20);
    new Float32Array(tuniData, 0, 16).set(view);
    new Float32Array(tuniData, 64, 16).set(proj);
    dv.setFloat32(128, st.n, true);
    dv.setFloat32(132, 1 / st.n, true);
    dv.setFloat32(136, st.dt, true);
    dv.setUint32(140, st.tracerCount, true);
    dv.setUint32(144, st.colorMode, true);
    dv.setFloat32(148, 0.0035, true);
    dv.setFloat32(152, st.hbar * 2 * Math.PI, true);
    dv.setUint32(156, st.frame, true);
    dv.setFloat32(160, seedRegion.maxAge, true);
    dv.setUint32(164, st.rk4 ? 1 : 0, true);
    // additive glow normalized by tracer density so millions of points
    // don't saturate to white (perceived brightness ~ count x glow)
    dv.setFloat32(168, st.glow * Math.min(1, 393216 / st.tracerCount), true);
    dv.setUint32(172, seedRegion.type, true);
    dv.setFloat32(176, seedRegion.center[0], true);
    dv.setFloat32(180, seedRegion.center[1], true);
    dv.setFloat32(184, seedRegion.center[2], true);
    dv.setFloat32(188, seedRegion.radius, true);
    dv.setFloat32(192, seedRegion.thick, true);
    device.queue.writeBuffer(tuni, 0, tuniData);
  };

  let lastT = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let simAccum = 0;
  // the paper's scenes run dt = 1/24 s in REAL time; without a cadence cap a
  // 140 fps device fast-forwards the physics 6x and the ring's life is over
  // in seconds (measured at first screenshot pass)
  const SIM_STEPS_PER_SECOND = 24;

  const frame = (): void => {
    requestAnimationFrame(frame);
    if (isCapturing()) return; // capture holds the GPU-state lock (house rule)
    const now = performance.now();
    frameMs = now - lastT;
    lastT = now;
    fpsAccum += frameMs;
    fpsFrames++;
    if (fpsAccum > 500) {
      fps = (fpsFrames * 1000) / fpsAccum;
      fpsAccum = 0;
      fpsFrames = 0;
      // adaptive tracer controller: probe upward to sustained 60, degrade first
      if (st.adaptive) {
        if (fps > 55 && st.tracerCount < st.tracerCap) {
          st.tracerCount = Math.min(st.tracerCap, st.tracerCount * 2);
        } else if (fps < 30 && st.tracerCount > 65536) {
          st.tracerCount = st.tracerCount >> 1;
        }
      }
    }
    st.frame++;

    const enc = device.createCommandEncoder();
    const t0 = performance.now();
    let stepsThisFrame = 0;
    if (st.running) {
      simAccum += Math.min(frameMs, 200);
      stepsThisFrame = Math.min(2, Math.floor(simAccum / (1000 / SIM_STEPS_PER_SECOND)));
      simAccum -= stepsThisFrame * (1000 / SIM_STEPS_PER_SECOND);
    }
    writeTracerUniforms();
    for (let s = 0; s < stepsThisFrame; s++) {
      if (brushImpulse) {
        applyConstraintUniforms();
      } else if (sceneConstraint) {
        const u = sceneConstraint.u;
        omegaT += ((u[0] ** 2 + u[1] ** 2 + u[2] ** 2) / (2 * st.hbar)) * st.dt;
        applyConstraintUniforms();
      }
      st.gpu.encodeStep(enc);
      st.stepCount++;
      if (brushImpulse) {
        // one-step impulse; clear and restore scene constraint next frame
        brushImpulse = null;
        st.gpu.constraint = { kind: 0, center: [0.5, 0.5, 0.5], radius: 0, kvec: [0, 0, 0], omegaT: 0 };
      }
      const p = enc.beginComputePass();
      p.setPipeline(advectPipe);
      p.setBindGroup(0, tracerGroups.compute);
      p.dispatchWorkgroups(Math.ceil(st.tracerCount / 256));
      p.end();
    }
    gridMs = performance.now() - t0;

    const view = surface.getCurrentTexture().createView();
    const rp = enc.beginRenderPass({
      colorAttachments: [
        { view, clearValue: { r: 0.012, g: 0.02, b: 0.035, a: 1 }, loadOp: "clear", storeOp: "store" },
      ],
    });
    rp.setPipeline(tracerRenderPipe);
    rp.setBindGroup(0, tracerGroups.render);
    rp.draw(6, st.tracerCount);
    rp.setPipeline(linePipe);
    rp.setBindGroup(0, lineGroup);
    rp.draw(24);
    rp.end();
    device.queue.submit([enc.finish()]);

    if (st.frame % 30 === 0) {
      void st.gpu.readStats().then((s) => {
        lastStats = s;
        const headroom = s.maxEta / Math.PI;
        const warn = headroom > 0.85 ? " ⚠ NEAR ALIASING BOUND — raise grid or lower speed/ħ⁻¹" : "";
        hud.textContent =
          `${fps.toFixed(0)} fps · encode ${gridMs.toFixed(1)} ms · ${st.n}³ grid · ` +
          `${(st.tracerCount / 1e6).toFixed(2)}M tracers · headroom ${(headroom * 100).toFixed(0)}%${warn} · ` +
          `${st.gpu.ungated || st.ungated ? "UNGATED" : "gated"} · step ${st.stepCount}`;
        updateStudy();
      });
    }
  };

  setBoot("");
  loadScene("ring");
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

start().catch((err: unknown) => {
  console.error(err);
  setBoot(`WebGPU init failed: ${err instanceof Error ? err.message : String(err)}`);
});
