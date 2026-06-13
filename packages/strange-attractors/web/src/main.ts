// Lorenz strange attractor — Stack-B WebGPU web build.
//
// Ships the committed ../../src/lorenz_rk4.wgsl (the SAME RK4 integrator the
// wgpu-native gate runs): a compute pass integrates the trajectory, a render
// pass draws it as an orbiting point cloud. Settings panel + capture-export
// re-emit the lorenz-trajectory descriptor (position + radius at the canonical
// sample steps).
//
// Correctness gate (web-build track, new-canonical): f32 RK4 of the chaotic
// Lorenz system diverges pointwise from the f64 canonical by the trajectory end
// — so the gate is structural attractor invariants (bounding box + spread) +
// run-twice byte-identical determinism, NOT a pointwise round-trip.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/lorenz_rk4.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

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

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function main(): Promise<void> {
  let ctx;
  try {
    ctx = await createContext();
  } catch (e) {
    boot.textContent = `WebGPU unavailable: ${(e as Error).message}`;
    throw e;
  }
  const { device, queue } = ctx;

  const nPoints = N_STEPS + 1;
  const trajBytes = nPoints * 3 * 4;
  const traj = device.createBuffer({
    size: trajBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // compute the trajectory once (seed-42 IC)
  const paramBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
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

  // render
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "lorenz-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "point-list" },
  });
  // Live-view trajectory for named-regime presets (ruling D-P1.2(a)).
  // The render pass reads liveTraj, a DISPLAY buffer seeded from the canonical
  // trajectory at boot; presets re-integrate the SAME committed kernel into it
  // with their own uniform params. The capture path never sees any of this:
  // captureCanonical reads only `traj` (canonical params, computed once above).
  const liveTraj = device.createBuffer({
    size: trajBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  const liveParamBuf = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
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

  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: liveTraj } },
    ],
  });

  async function readBuffer(src: GPUBuffer): Promise<Float32Array> {
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

  // One readback path for BOTH the capture export and the Study diagnostics,
  // so what Study displays is measured from the same buffer the capture reads.
  // The capture path reads ONLY the canonical `traj` buffer — never liveTraj.
  function readTrajectory(): Promise<Float32Array> {
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
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "strange-attractors", category: "closed-form", variant: "lorenz" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [3], dtype: "f64", seed: 42, params: { sigma: SIGMA, rho: RHO, beta: BETA, dt: DT, ic_jitter_scale: 1e-6 } },
          run: { step_count: N_STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "lorenz-trajectory-seed42-step10000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps,
      },
      { download: false },
    );
    panel.setStatus(`capture ready — ${steps.length} sampled states (chaotic; new-canonical)`);
    panel.setCaptureEnabled(true);
  }

  // Named Lorenz-family regimes (house § 5.3, ruling D-P1.2(a)): live-loop
  // presets over the SAME committed kernel — σ/ρ/β uniform values only. Names
  // are the standard dynamical-systems descriptions of these parameter ranges
  // (σ=10, β=8/3 throughout): chaos at ρ=28; stable fixed-point spirals below
  // the ρ≈24.74 subcritical Hopf; the well-known ρ≈99.65 periodic window; a
  // single global limit cycle far above the chaotic range. Distinctness is
  // measured (f32 host sweep + per-preset screenshots in the P-3 audit note).
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
  let activeRegime: Regime = REGIMES[0]!;
  // Raw (un-framed) live trajectory of the active non-classic regime, kept for
  // honest diagnostics; null ⇒ classic ⇒ diagnostics read the canonical buffer.
  let liveRaw: Float32Array | null = null;

  // Presentation-only auto-framing: render.wgsl's fixed framing is calibrated
  // to the classic attractor (centre z≈25, scale 0.035); other regimes live at
  // very different scales (ρ=350 reaches |y|>300). Map the regime's bbox
  // (transient-trimmed) into the classic-sized frame for DISPLAY; the physics
  // values diagnostics/captures read are never framed.
  function frameForDisplay(raw: Float32Array): Float32Array {
    const TRIM = 500; // skip the fall-in transient when measuring the box
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let s = TRIM; s < nPoints; s += 1) {
      for (let i = 0; i < 3; i += 1) {
        const v = raw[s * 3 + i]!;
        if (v < lo[i]!) lo[i] = v;
        if (v > hi[i]!) hi[i] = v;
      }
    }
    const c = [0, 1, 2].map((i) => (lo[i]! + hi[i]!) / 2);
    const half = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!) / 2 || 1;
    const k = 22 / half; // classic-sized half-extent target
    const out = new Float32Array(raw.length);
    for (let p = 0; p < nPoints; p += 1) {
      out[p * 3] = (raw[p * 3]! - c[0]!) * k;
      out[p * 3 + 1] = (raw[p * 3 + 1]! - c[1]!) * k;
      out[p * 3 + 2] = (raw[p * 3 + 2]! - c[2]!) * k + 25;
    }
    return out;
  }

  async function applyRegime(r: Regime): Promise<void> {
    activeRegime = r;
    if (r === REGIMES[0]) {
      // classic: restore the boot state — the raw canonical trajectory
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(traj, 0, liveTraj, 0, trajBytes);
      queue.submit([enc.finish()]);
      liveRaw = null;
      panel.setStatus("live view: classic — the canonical capture regime");
    } else {
      // re-integrate the SAME committed kernel with the regime's uniforms,
      // into the live display buffer only
      const lp = new ArrayBuffer(48);
      const lv = new DataView(lp);
      lv.setUint32(0, N_STEPS, true);
      lv.setUint32(4, 0, true);
      lv.setFloat32(8, r.sigma, true);
      lv.setFloat32(12, r.rho, true);
      lv.setFloat32(16, r.beta, true);
      lv.setFloat32(20, DT, true);
      lv.setFloat32(24, CANONICAL_IC[0] + SEED42_OFFSET[0], true);
      lv.setFloat32(28, CANONICAL_IC[1] + SEED42_OFFSET[1], true);
      lv.setFloat32(32, CANONICAL_IC[2] + SEED42_OFFSET[2], true);
      queue.writeBuffer(liveParamBuf, 0, lp);
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, liveComputeBG);
      pass.dispatchWorkgroups(1);
      pass.end();
      queue.submit([enc.finish()]);
      const raw = await readBuffer(liveTraj);
      liveRaw = raw;
      queue.writeBuffer(liveTraj, 0, frameForDisplay(raw));
      panel.setStatus(`live view: ${r.label} — capture stays pinned to classic seed-42`);
    }
    if (!suspended) traceFrame = 0; // re-trace the regime's trajectory in Play
    if (suspended) {
      renderFrame();
      void measureStudyDiagnostics();
    }
  }

  // Study diagnostics (house § 5.4): measured from the displayed regime's raw
  // trajectory — for classic that is the SAME buffer the capture exports
  // (capture-time values); for presets it is the live re-integration, un-framed.
  // The sequence token drops superseded measurements: a Study-entry readback
  // that resolves AFTER a preset's own measurement must not overwrite it.
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const reg = activeRegime;
    const all = liveRaw ?? (await readTrajectory());
    if (seq !== diagSeq) return;
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
    const beta = reg.beta === 8 / 3 ? "8⁄3" : String(reg.beta);
    panel.setDiagnostics([
      { label: "live regime", value: reg.label },
      { label: "σ / ρ / β", value: `${reg.sigma} / ${reg.rho} / ${beta}` },
      { label: "integrator", value: "RK4, dt 0.01" },
      { label: "steps", value: String(N_STEPS) },
      { label: "x range", value: r(0) },
      { label: "y range", value: r(1) },
      { label: "z range", value: r(2) },
      { label: "final |x|", value: Math.sqrt(fx * fx + fy * fy + fz * fz).toFixed(2) },
      { label: "capture pinned to", value: "classic, seed 42" },
    ]);
  }

  boot.textContent = "";
  let angle = 0;
  let suspended = false;
  let rafQueued = false;

  // Boot trace-in (P-7, presentation-only): the page formerly presented the
  // fully-integrated trajectory complete from the first frame; the point
  // COUNT now ramps over the first TRACE_IN_FRAMES live frames, so the
  // attractor draws itself in integration order — the motion shown is the
  // trajectory's own time axis, not a camera move. Host-side draw-count
  // only: same buffer, same shader, ru.n stays nPoints (stable colour
  // gradient); frame-indexed, so it is deterministic under the poster/loop
  // generator's RAF pump. Re-armed on preset change in Play (a frozen Study
  // view keeps the full cloud); nothing here is read by the capture path.
  const TRACE_IN_FRAMES = 600;
  let traceFrame = 0;

  function renderFrame(): void {
    const drawn = Math.max(2, Math.min(nPoints, Math.ceil((nPoints * traceFrame) / TRACE_IN_FRAMES)));
    queue.writeBuffer(renderUniform, 0, new Float32Array([canvas.width / canvas.height, angle, nPoints, 0]));
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 } },
      ],
    });
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBG);
    pass.draw(drawn);
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
    if (performance.now() - lastPointerMs > AUTO_ORBIT_IDLE_MS) angle += 0.003;
    if (traceFrame < TRACE_IN_FRAMES) traceFrame += 1;
    renderFrame();
    queueFrame();
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
    initial: { tier: "test", seed: 42 },
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
          // Frozen observation: one fresh present after the mode styles apply,
          // then measure the diagnostics from the capture buffer.
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
          "the committed lorenz_rk4.wgsl — the exact f32 RK4 compute kernel the wgpu-native gate runs (σ=10, ρ=28, β=8⁄3, dt=0.01, seed-42 jittered IC); the point cloud is that trajectory, untouched",
        simplified:
          "f32 on GPU — for a chaotic system the pointwise match to the f64 canonical decays by trajectory end, so the gate is structural (determinism + attractor envelope), not pointwise; presets and cursor drive the live view only (non-classic regimes are auto-framed for display), while the capture stays pinned to the classic seed-42 params; the boot trace-in is presentation-side draw order — the points revealed are the same already-integrated trajectory, nothing re-integrates",
        measured: "ranges read back from the displayed regime's raw trajectory on entering Study and on preset change — for classic, the same buffer the capture exports",
      },
      verdict: {
        gate: "new_canonical + run-twice (two browser runs byte-identical; all sampled points inside the f64 reference attractor envelope)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/closed-form/strange-attractors/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });
  panel.setActivePreset("classic");

  queueFrame();
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
