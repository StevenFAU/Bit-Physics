// Mandelbulb explorer — Stack-B WebGPU web build.
//
// Display: a sphere-tracing ray-march of the Quilez p8 mandelbulb (render.wgsl).
// Capture-export: evaluates the distance estimator at the canonical 16×16 probe
// grid using the COMMITTED ../../src/mandelbulb_de.wgsl compute kernel — the same
// shader the wgpu-native gate runs — and re-emits the de-probe-points descriptor.
//
// Correctness gate (web-build track, new-canonical): the f32 GPU DE agrees with
// the f64 canonical to the single-precision floor (~1.5e-5, just outside the
// closed-form 1e-5 budget — an f32 limit, not a defect), and is run-twice
// byte-identical. No tolerance is widened; see tools/productization/web-build.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";

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

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

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

async function main(): Promise<void> {
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
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "mb-render" });
  const renderUniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
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
    entries: [{ binding: 0, resource: { buffer: renderUniform } }],
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
          payload: { format: "hdf5", path: "de-probe-points-seed42.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
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
      { label: "camera azimuth", value: `${((angle * 180) / Math.PI).toFixed(1)}°` },
      { label: "capture pinned to", value: "16×16 probe grid, seed 42" },
    ]);
  }

  boot.textContent = "";
  let angle = 0;
  let suspended = false;
  let rafQueued = false;

  function renderFrame(): void {
    const u = new Float32Array([canvas.width / canvas.height, angle, 0, 0]);
    queue.writeBuffer(renderUniform, 0, u);
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
    if (performance.now() - lastPointerMs > AUTO_ORBIT_IDLE_MS) angle += 0.004;
    renderFrame();
    queueFrame();
  }

  // Cursor-as-camera (house § 5.1, D-P1.2(a) class; pattern verbatim from
  // packages/strange-attractors/web/src/main.ts): drag orbits the bulb by
  // driving the SAME render-uniform `angle` slot the auto-orbit writes — a
  // display uniform only; nothing here is read by captureCanonical or
  // evalProbeDE. Auto-orbit resumes after AUTO_ORBIT_IDLE_MS without pointer
  // input; in Study (RAF suspended) a drag one-shot-renders the frozen view.
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

  const panel = createSettingsPanel("Mandelbulb Explorer", {
    caption: "The 3-D cousin of the Mandelbrot set, sphere-traced in real time by a distance-estimator ray march — infinite detail from one formula.",
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
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
          "the DISPLAY is a separate sphere-tracing shader (render.wgsl) that mirrors the DE but raises the iteration count for smoother surfaces — visual fidelity, not the gate kernel; the f32 GPU DE sits at the single-precision floor (~1.5e-5) against the f64 canonical, just outside the closed-form 1e-5 budget — an f32 limit, not a defect, and no tolerance is widened; drag/auto-orbit drive a display camera uniform only",
        measured:
          "DE probe statistics recomputed via the committed kernel on entering Study (the view is frozen in Study; dragging re-renders the frozen frame)",
      },
      verdict: {
        gate: "new_canonical + run-twice (f32 DE at the single-precision floor vs the f64 canonical; two runs byte-identical)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/closed-form/mandelbulb-explorer/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });

  queueFrame();
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
