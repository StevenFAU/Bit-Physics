// Gray-Scott reaction-diffusion 2D — Stack-B WebGPU web build.
//
// Ships the committed ../../src/gray_scott.wgsl (the SAME compute kernel the
// wgpu-native round-trip gate runs) through a Vite browser bundle: a live
// canvas render loop, the shared settings panel, and a capture-export hook
// that re-emits the canonical descriptor for the 5.1 bootstrap round-trip.
//
// Correctness gate (web-build track): the identical gray_scott.wgsl is driven
// by tools/productization/web-build against the canonical capture at
// captures/reaction-diffusion-2d-ref/ and round-trips within the
// [overrides.reaction-diffusion-2d] rel=1e-4 budget (MEASURED 2.6e-5). The
// seed-42 initial condition — numpy's PCG64 uniform(-1e-3,1e-3) perturbation,
// not reproducible in-browser — ships as the binary asset rd2d-ic-seed42.bin.

import "../../../../common/common-web/src/theme.css";

import type { DeviceContext } from "../../../../common/common-ts/src/context.js";
import { createContext } from "../../../../common/common-ts/src/context.js";
import { makeBindGroup, makeBindGroupLayout } from "../../../../common/common-ts/src/bindgroups.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/gray_scott.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const N = 128;
const CANONICAL_STEPS = 2000;
const CAPTURE_INTERVAL = 200;
const PARAMS = { Du: 0.16, Dv: 0.08, F: 0.0367, k: 0.0649, dx: 1.0, dt: 1.0 };
const STEPS_PER_FRAME = 8;

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function setBoot(msg: string): void {
  boot.textContent = msg;
}

/** Build the seed-42 canonical IC by fetching the committed binary asset. */
async function fetchCanonicalIC(): Promise<Float32Array> {
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
function exploratoryIC(seed: number): Float32Array {
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
  let ctx: DeviceContext;
  try {
    ctx = await createContext();
  } catch (e) {
    setBoot(`WebGPU unavailable: ${(e as Error).message}`);
    throw e;
  }
  const { device, queue } = ctx;

  const cellCount = N * N;
  const bufBytes = cellCount * 2 * 4;
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const buffers = [
    device.createBuffer({ size: bufBytes, usage, label: "state-a" }),
    device.createBuffer({ size: bufBytes, usage, label: "state-b" }),
  ];

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

  // Render pipeline (colormap of the V channel).
  const ctxGpu = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctxGpu.configure({ device, format, alphaMode: "opaque" });
  const renderLayout = makeBindGroupLayout(
    ctx,
    [{ binding: 1, visibility: GPUShaderStage.FRAGMENT, type: "read-only-storage" }],
    [{ binding: 0, visibility: GPUShaderStage.FRAGMENT }],
    "rd2d-render-bgl",
  );
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "rd2d-render" });
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "rd2d-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const renderUniform = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([N, 0]));

  // Named Gray-Scott regimes (house § 5.3, ruling D-P1.2(a)): live-loop
  // presets over the SAME committed kernel — only the F/k uniform values
  // differ (Du/Dv/dx/dt stay canonical). The F/k plane is the classic
  // Gray-Scott pattern-selection map (Pearson 1993, Science 261:189, DOI
  // 10.1126/science.261.5118.189); regime NAMES describe the measured
  // behavior of THIS kernel from the seed-square IC (field statistics +
  // screenshots in the P-5 audit). The capture path steps ONLY with the
  // canonical paramBuf.
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
  let activeRegime: FkRegime = REGIMES[0]!;

  // Capture-pinning split (binding rule P-4 § 0.5.3, pattern verbatim from
  // packages/physarum/web/src/main.ts): TWO param uniforms. The capture
  // re-run steps ONLY with the canonical paramBuf; the RAF live loop steps
  // ONLY with liveParamBuf (active regime F/k). Disjoint call sites:
  // stepCanonical appears in captureCanonical's loop alone, stepLive in the
  // RAF frame alone.
  const uUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  const paramBuf = device.createBuffer({ size: 32, usage: uUsage, label: "params-canonical" });
  const liveParamBuf = device.createBuffer({ size: 32, usage: uUsage, label: "params-live" });

  function writeStepParams(buf: GPUBuffer, F: number, k: number, step: number): void {
    const ab = new ArrayBuffer(32);
    const view = new DataView(ab);
    view.setUint32(0, N, true);
    view.setUint32(4, step, true);
    view.setFloat32(8, PARAMS.Du, true);
    view.setFloat32(12, PARAMS.Dv, true);
    view.setFloat32(16, F, true);
    view.setFloat32(20, k, true);
    view.setFloat32(24, PARAMS.dx, true);
    view.setFloat32(28, PARAMS.dt, true);
    queue.writeBuffer(buf, 0, ab);
  }

  const wg = Math.ceil(N / 8);
  let src = 0;
  let stepCounter = 0;

  function stepWith(params: GPUBuffer, F: number, k: number): void {
    writeStepParams(params, F, k, stepCounter + 1);
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
  const stepCanonical = (): void => stepWith(paramBuf, PARAMS.F, PARAMS.k);
  const stepLive = (): void => stepWith(liveParamBuf, activeRegime.F, activeRegime.k);

  function renderFrame(): void {
    const bg = makeBindGroup(
      ctx,
      renderLayout,
      [
        { binding: 0, resource: { buffer: renderUniform } },
        { binding: 1, resource: { buffer: buffers[src]! } },
      ],
      "rd2d-rbg",
    );
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
    pass.setBindGroup(0, bg);
    pass.draw(3);
    pass.end();
    queue.submit([enc.finish()]);
  }

  async function readState(index: number): Promise<Float32Array> {
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
    src = 0;
    stepCounter = 0;
  }

  // Capture-export: reproduce the canonical descriptor (seed 42, 2000 steps).
  // Pinned by construction: reloads the canonical seed-42 IC, then steps ONLY
  // via stepCanonical (canonical paramBuf) — preset and cursor state cannot
  // reach it; frame() early-returns while isCapturing().
  async function captureCanonical(): Promise<void> {
    panel.setStatus("capturing… (2000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    await loadIC(42);
    const steps: CaptureStepDescriptor[] = [];
    const recordStep = (idx: number, interleaved: Float32Array): void => {
      const U = new Float64Array(cellCount);
      const V = new Float64Array(cellCount);
      let massU = 0;
      let massV = 0;
      for (let c = 0; c < cellCount; c += 1) {
        U[c] = interleaved[c * 2] ?? 0;
        V[c] = interleaved[c * 2 + 1] ?? 0;
        massU += U[c];
        massV += V[c];
      }
      steps.push({
        step: idx,
        state: { U: field(U, [N, N], "f64"), V: field(V, [N, N], "f64") },
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
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "reaction-diffusion-2d", category: "continuous-ca", variant: "gray-scott" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [N, N], dtype: "f64", seed: 42, params: PARAMS },
          run: {
            step_count: CANONICAL_STEPS,
            capture_interval: CAPTURE_INTERVAL,
            wall_clock_seconds: 0,
            start_utc: "2026-05-20T00:00:00Z",
          },
          payload: { format: "hdf5", path: "gray-scott-lambda-128sq-seed42-step2000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
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
  // the render pass reads the state buffer through a read-only-storage
  // binding (renderLayout above) and dispatches no compute (D-P1.2(b)).
  let suspended = false;

  // Study diagnostics (house § 5.4): field statistics measured via the SAME
  // readState() readback the capture path uses, on the live state buffer.
  // The sequence token drops superseded measurements (P-4 rule 0.5.5).
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const st = await readState(src);
    if (seq !== diagSeq) return;
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
    const reg = activeRegime;
    panel.setDiagnostics([
      { label: "live regime", value: reg.label },
      { label: "grid", value: `${N} × ${N}` },
      { label: "live step", value: String(stepCounter) },
      { label: "F / k", value: `${reg.F} / ${reg.k}` },
      { label: "Du / Dv", value: `${PARAMS.Du} / ${PARAMS.Dv}` },
      { label: "mass U", value: massU.toFixed(1) },
      { label: "mass V", value: massV.toFixed(1) },
      { label: "peak V", value: peakV.toFixed(3) },
      { label: "V coverage (V>0.1)", value: (covered / cellCount).toFixed(4) },
      { label: "capture pinned to", value: "canonical F/k, seed 42" },
    ]);
  }

  async function applyRegime(r: FkRegime): Promise<void> {
    activeRegime = r;
    // Regrow from the seed-square IC so the regime forms its own morphology
    // (Gray-Scott patterns are history-dependent). Live view only.
    await loadIC(panel.getState().seed);
    panel.setStatus(
      r === REGIMES[0]
        ? "live field: canonical — the capture regime"
        : `live field: ${r.label} — capture stays pinned to canonical seed-42`,
    );
    if (suspended) void measureStudyDiagnostics();
  }

  // Cursor-as-seed (house § 5.1, ruling D-P1.2(a)): the pointer writes the
  // IC's own seed values (U 0.5, V 0.25) into the live state buffer through
  // the SAME queue.writeBuffer path loadIC uses — the kernel-owned state
  // double-buffer; the committed kernel consumes the written cells on the
  // next step. No new compute-side buffer or pass (P-4 rule 0.5.4). LIVE
  // LOOP ONLY: injection happens inside the !suspended live branch, and
  // captureCanonical reloads the canonical IC before its pinned re-run.
  const SEED_RADIUS = 4; // cells
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
    for (let dj = -SEED_RADIUS; dj <= SEED_RADIUS; dj += 1) {
      const j = seedCell.y + dj;
      if (j < 0 || j >= N) continue;
      const half = Math.floor(Math.sqrt(SEED_RADIUS * SEED_RADIUS - dj * dj));
      const i0 = Math.max(0, seedCell.x - half);
      const i1 = Math.min(N - 1, seedCell.x + half);
      if (i1 < i0) continue;
      const span = new Float32Array((i1 - i0 + 1) * 2);
      for (let c = 0; c < span.length; c += 2) {
        span[c] = 0.5;
        span[c + 1] = 0.25;
      }
      queue.writeBuffer(buffers[src]!, (j * N + i0) * 2 * 4, span);
    }
  }

  const panel = createSettingsPanel("Reaction-Diffusion 2D", {
    caption: "Two chemicals feed, react, and diffuse — Turing’s recipe for pattern: spots, stripes, and living labyrinths from one PDE.",
    initial: { tier: "test", seed: 42 },
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
          "the committed gray_scott.wgsl 5-point-Laplacian kernel — the same compute the wgpu-native round-trip gate runs; canonical params F 0.0367, k 0.0649, Du 0.16, Dv 0.08; seed-42 numpy IC asset; every displayed frame is a real kernel step",
        simplified:
          "presets (the F/k feed–kill point) and the cursor seed drive the live loop only — each preset regrows from the seed-square IC; the capture reloads the canonical IC and re-runs the canonical params, round-tripping within rel 1e-4 (measured 2.6e-5); the display colormap is the V channel",
        measured:
          "field statistics read back from the live state buffer on entering Study and on preset change (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate: "capture_roundtrip (browser capture vs the f64 canonical within rel 1e-4; measured max_abs_err 2.6e-5)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });
  panel.setActivePreset("canonical");

  await loadIC(42);
  setBoot("");

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      injectCursorSeed();
      for (let i = 0; i < STEPS_PER_FRAME; i += 1) stepLive();
    }
    renderFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Mark the app booted for the headless smoke harness.
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
