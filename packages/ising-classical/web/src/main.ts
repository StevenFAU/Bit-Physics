// 2D Ising (Metropolis) — Stack-B WebGPU web build.
//
// Ships the committed ../../src/metropolis.wgsl (the SAME checkerboard
// parallel-Metropolis kernel the wgpu-native gate runs) through a Vite bundle:
// a live spin-lattice render, the shared settings panel, and a capture-export
// hook that re-emits the spins + energy/magnetization observables.
//
// Correctness gate (web-build track, observable / new-canonical): the WGSL RNG
// (in-shader PCG hash) differs from the NumPy reference's PCG64, so a spin-FIELD
// match would be fake. Instead the gate checks run-twice BYTE-IDENTICAL
// determinism + STATISTICAL equivalence of energy_per_spin to the NumPy
// reference ensemble (z = 0.3 over 6 seeds). The seed-42 IC ships as
// ising-ic-seed42.bin so the browser reproduces the canonical protocol.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/metropolis.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const N = 128;
const CANONICAL_STEPS = 10000;
const CAPTURE_INTERVAL = 1000;
const PARAMS = { J: 1.0, h: 0.0, T: 2.27 };
const STEPS_PER_FRAME = 4;
// Onsager 1944 exact critical temperature, J=1: T_c = 2/ln(1+√2) ≈ 2.2691853
// (docs/sim-specs/lattice-spin/ising-classical/spec-ref.md § "Critical
// temperature"; golden table ising-classical-critical-temperature.json).
const T_C = 2 / Math.log(1 + Math.SQRT2);

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function fetchCanonicalIC(): Promise<Int32Array> {
  const res = await fetch(`${import.meta.env.BASE_URL}ising-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC asset fetch failed: ${res.status}`);
  const ic = new Int32Array(await res.arrayBuffer());
  if (ic.length !== N * N) throw new Error(`IC length ${ic.length} != ${N * N}`);
  return ic;
}

/** Deterministic exploratory ±1 IC for non-canonical seeds (display only). */
function exploratoryIC(seed: number): Int32Array {
  const out = new Int32Array(N * N);
  let s = (seed >>> 0) || 1;
  for (let i = 0; i < out.length; i += 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s & 0x80000000 ? 1 : -1;
  }
  return out;
}

function energyPerSpin(spins: Int32Array): number {
  let bonds = 0;
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const s = spins[j * N + i]!;
      const right = spins[j * N + ((i + 1) % N)]!;
      const down = spins[((j + 1) % N) * N + i]!;
      bonds += -PARAMS.J * s * (right + down);
    }
  }
  return bonds / (N * N);
}

function magnetization(spins: Int32Array): number {
  let sum = 0;
  for (let i = 0; i < spins.length; i += 1) sum += spins[i]!;
  return sum / spins.length;
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

  const bytes = N * N * 4;
  const spinBuffer = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const uUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  // Capture-pinning split (binding rule P-4 § 0.5.3, pattern verbatim from
  // packages/physarum/web/src/main.ts): TWO param uniforms + two bind groups.
  // The capture re-run sweeps ONLY with the canonical paramBuffer (T 2.27,
  // seed 42); the RAF live loop sweeps ONLY with liveParamBuffer (active
  // temperature regime + panel seed). Disjoint call sites: stepCanonical in
  // captureCanonical's loop alone, stepLive in the RAF frame alone.
  const paramBuffer = device.createBuffer({ size: 32, usage: uUsage, label: "params-canonical" });
  const liveParamBuffer = device.createBuffer({ size: 32, usage: uUsage, label: "params-live" });

  const computeModule = device.createShaderModule({ code: computeWgsl, label: "ising" });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const computePipeline = await device.createComputePipelineAsync({
    label: "ising",
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  const makeComputeBG = (params: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: spinBuffer } },
      ],
    });
  const computeBG = makeComputeBG(paramBuffer);
  const computeBGLive = makeComputeBG(liveParamBuffer);

  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "ising-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 8, usage: uUsage });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([N, 0]));
  const renderPipeline = await device.createRenderPipelineAsync({
    label: "ising-render",
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: spinBuffer } },
    ],
  });

  // Named temperature regimes (house § 5.3, ruling D-P1.2(a)): live-loop
  // presets over the SAME committed kernel — only the T uniform differs
  // (J/h stay canonical). Names are the physically canonical phases relative
  // to the exact Onsager 1944 critical temperature T_c = 2/ln(1+√2) ≈ 2.2692
  // (in-repo: docs/sim-specs/lattice-spin/ising-classical/spec-ref.md, the
  // "Critical temperature" block + ising-classical-critical-temperature.json
  // golden table). The capture path sweeps with the canonical T 2.27 only.
  interface TempRegime {
    label: string;
    title: string;
    T: number;
  }
  const REGIMES: readonly TempRegime[] = [
    {
      label: "sub-critical",
      title: "T 1.5 < T_c 2.269 — ordered phase: domains coarsen toward spontaneous magnetization",
      T: 1.5,
    },
    {
      label: "critical",
      title: "T 2.27 ≈ T_c 2.269 (Onsager 1944: 2/ln(1+√2)) — the capture regime: fluctuations at all scales",
      T: PARAMS.T,
    },
    {
      label: "super-critical",
      title: "T 3.5 > T_c 2.269 — disordered paramagnet: short-range flicker, M ≈ 0",
      T: 3.5,
    },
  ];
  let activeRegime: TempRegime = REGIMES[1]!;

  let step = 0;
  const wg = Math.ceil(N / 8);

  function sweepWith(params: GPUBuffer, bg: GPUBindGroup, T: number, seed: number): void {
    step += 1;
    for (let color = 0; color < 2; color += 1) {
      const buf = new ArrayBuffer(32);
      const dv = new DataView(buf);
      dv.setUint32(0, N, true);
      dv.setUint32(4, step, true);
      dv.setUint32(8, color, true);
      dv.setUint32(12, seed, true);
      dv.setFloat32(16, PARAMS.J, true);
      dv.setFloat32(20, PARAMS.h, true);
      dv.setFloat32(24, T, true);
      dv.setFloat32(28, 0, true);
      queue.writeBuffer(params, 0, buf);
      const enc = device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(wg, wg, 1);
      pass.end();
      queue.submit([enc.finish()]);
    }
  }
  const stepCanonical = (): void => sweepWith(paramBuffer, computeBG, PARAMS.T, 42);
  const stepLive = (): void =>
    sweepWith(liveParamBuffer, computeBGLive, activeRegime.T, panel.getState().seed);

  async function readSpins(): Promise<Int32Array> {
    const rb = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(spinBuffer, 0, rb, 0, bytes);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Int32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function loadIC(seed: number): Promise<void> {
    const ic = seed === 42 ? await fetchCanonicalIC() : exploratoryIC(seed);
    queue.writeBuffer(spinBuffer, 0, ic);
    step = 0;
  }

  // Pinned by construction: reloads the canonical seed-42 IC, then sweeps
  // ONLY via stepCanonical (canonical paramBuffer, T 2.27, seed 42) — preset
  // and cursor state cannot reach it; frame() early-returns while capturing.
  async function captureCanonical(): Promise<void> {
    panel.setStatus("equilibrating… (10000 sweeps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    queue.writeBuffer(spinBuffer, 0, await fetchCanonicalIC());
    step = 0;
    for (let s = 0; s < CANONICAL_STEPS; s += 1) stepCanonical();
    const spins = await readSpins();
    const f64 = new Float64Array(N * N);
    for (let i = 0; i < f64.length; i += 1) f64[i] = spins[i]!;
    const E = energyPerSpin(spins);
    const M = magnetization(spins);
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "ising-classical", category: "lattice-spin", variant: "metropolis" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "reference", dims: [N, N], dtype: "f64", seed: 42, params: PARAMS },
          run: { step_count: CANONICAL_STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "metropolis-128sq-T2.27-seed42-step10000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: false, subgroup_ops: false },
        },
        steps: [
          { step: CANONICAL_STEPS, state: { spins: field(f64, [N, N], "f64") }, diagnostics: { energy_per_spin: E, magnetization: M } },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — E/N=${E.toFixed(4)}, M=${M.toFixed(4)}`);
    panel.setCaptureEnabled(true);
    await loadIC(panel.getState().seed);
  }

  // Study = pause stepping, keep presenting (P-4 rule 0.5.3): measured at
  // HEAD, the only state mutation is the Metropolis compute dispatch inside
  // sweepWith(); the render pass reads the spin lattice through a
  // read-only-storage binding (renderBGL above) and dispatches no compute
  // (D-P1.2(b)).
  let suspended = false;

  // Study diagnostics (house § 5.4): the SAME energy/magnetization
  // observables the capture path computes, measured on the live lattice via
  // the same readSpins() readback. Supersession-guarded (P-4 rule 0.5.5).
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const spins = await readSpins();
    if (seq !== diagSeq) return;
    const E = energyPerSpin(spins);
    const M = magnetization(spins);
    const reg = activeRegime;
    panel.setDiagnostics([
      { label: "live regime", value: reg.label },
      { label: "lattice", value: `${N} × ${N}` },
      { label: "live sweep", value: String(step) },
      { label: "T", value: reg.T.toFixed(2) },
      { label: "T / T_c", value: (reg.T / T_C).toFixed(3) },
      { label: "T_c (Onsager)", value: `${T_C.toFixed(4)} = 2/ln(1+√2)` },
      { label: "J / h", value: `${PARAMS.J} / ${PARAMS.h}` },
      { label: "E per spin", value: E.toFixed(4) },
      { label: "M", value: M.toFixed(4) },
      { label: "|M|", value: Math.abs(M).toFixed(4) },
      { label: "capture pinned to", value: "T 2.27, seed 42" },
    ]);
  }

  function applyRegime(r: TempRegime): void {
    activeRegime = r;
    panel.setStatus(
      r.T === PARAMS.T
        ? "live lattice: critical — the capture regime"
        : `live lattice: ${r.label} (T ${r.T}) — capture stays pinned to T 2.27, seed 42`,
    );
    if (suspended) void measureStudyDiagnostics();
  }

  // Cursor-as-spin-flip (house § 5.1, ruling D-P1.2(a)): the pointer paints a
  // disk of +1 spins into the live lattice through the SAME queue.writeBuffer
  // path loadIC uses — the kernel-owned in-place spin buffer; the committed
  // Metropolis dynamics then evolve the droplet (it survives sub-critically,
  // gets eaten at/above T_c). No new compute-side buffer or pass (P-4 rule
  // 0.5.4). LIVE LOOP ONLY: injection happens inside the !suspended live
  // branch, and captureCanonical reloads the canonical IC before its pinned
  // re-run.
  const FLIP_RADIUS = 6; // cells
  let flipCell: { x: number; y: number } | null = null;
  function pointerToCell(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    // render.wgsl maps fragment (u, v) -> spins[j*N + i] with i = u*N,
    // j = (1-uv.y)*N (screen top = lattice row 0 after its uv flip)
    return { x: Math.floor(u * N), y: Math.floor(v * N) };
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    flipCell = pointerToCell(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (flipCell) flipCell = pointerToCell(e);
  });
  const endFlip = (): void => {
    flipCell = null;
  };
  canvas.addEventListener("pointerup", endFlip);
  canvas.addEventListener("pointercancel", endFlip);
  function injectCursorSpins(): void {
    if (!flipCell) return;
    for (let dj = -FLIP_RADIUS; dj <= FLIP_RADIUS; dj += 1) {
      const j = flipCell.y + dj;
      if (j < 0 || j >= N) continue;
      const half = Math.floor(Math.sqrt(FLIP_RADIUS * FLIP_RADIUS - dj * dj));
      const i0 = Math.max(0, flipCell.x - half);
      const i1 = Math.min(N - 1, flipCell.x + half);
      if (i1 < i0) continue;
      const span = new Int32Array(i1 - i0 + 1).fill(1);
      queue.writeBuffer(spinBuffer, (j * N + i0) * 4, span);
    }
  }

  const panel = createSettingsPanel("2D Ising — Metropolis", {
    caption: "Lattice spins at T = 2.27 — the critical point, where fluctuations live at every scale. Checkerboard Monte Carlo, statistics verified against a CPU ensemble.",
    initial: { tier: "reference", seed: 42 },
    onCapture: captureCanonical,
    onChange: (st) => { void loadIC(st.seed); },
    presets: REGIMES.map((r) => ({
      label: r.label,
      title: r.title,
      apply: () => applyRegime(r),
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
          "the committed metropolis.wgsl — the exact checkerboard parallel-Metropolis kernel the wgpu-native gate runs (two colour dispatches per sweep, detailed balance preserved on the bipartite lattice); J 1, h 0, canonical T 2.27 ≈ T_c; seed-42 IC asset; every displayed frame is real sweeps",
        simplified:
          "the in-shader PCG hash RNG differs from the NumPy reference's PCG64, so a spin-field match would be fake — the gate is run-twice determinism + statistical equivalence of energy_per_spin to the reference ensemble; presets (temperature) and the cursor's painted +1 spins drive the live loop only — the capture reloads the seed-42 IC and re-runs the canonical T 2.27 protocol",
        measured:
          "energy per spin and magnetization — the same observables the capture exports — read back from the live lattice on entering Study and on preset change (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate: "observable + run-twice (two runs byte-identical; energy_per_spin statistically equivalent to the NumPy reference ensemble, z ≈ 0.3 over 6 seeds)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/lattice-spin/ising-classical/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });
  panel.setActivePreset("critical");

  await loadIC(42);
  boot.textContent = "";

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      injectCursorSpins();
      for (let i = 0; i < STEPS_PER_FRAME; i += 1) stepLive();
    }
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
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
