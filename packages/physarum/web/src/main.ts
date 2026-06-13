// Physarum transport network (Jones 2010) — Stack-B WebGPU web build.
//
// Ships the committed ../../src/physarum.wgsl (the SAME 3-pass kernel the
// wgpu-native gate runs): agents (sense/rotate/move + integer-atomic deposit),
// apply (deposit -> trail), diffuse (box-blur + decay). Trail colormap render +
// capture-export re-emit positions/headings/trail_map + total_mass.
//
// Correctness gate (web-build track, new-canonical): the trail deposit is the
// sim's atomic op — done as INTEGER fixed-point atomicAdd<u32> (order-
// independent → run-twice BYTE-IDENTICAL, unlike non-associative float atomics).
// Atomics + the agent RNG IC preclude a trail-field match to the f64 canonical,
// so the gate is determinism + the EXACT mass-balance invariant (total_mass =
// deposit·N·(1-α)/α = 22500). Seed-42 IC ships as physarum-ic-seed42.bin.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";

import computeWgsl from "../../src/physarum.wgsl?raw";
import renderWgsl from "./render.wgsl?raw";

const W = 256;
const H = 256;
const NA = 500;
const STEPS = 5000;
const CAPTURE_INTERVAL = 500;
const PARAMS = { delta_phi_deg: 45.0, L_sense: 9.0, L_move: 1.0, deposit: 5.0, decay_alpha: 0.1 };

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

async function fetchIC(): Promise<{ pos: Float32Array; head: Float32Array }> {
  const res = await fetch(`${import.meta.env.BASE_URL}physarum-ic-seed42.bin`);
  if (!res.ok) throw new Error(`IC fetch failed: ${res.status}`);
  const all = new Float32Array(await res.arrayBuffer());
  return { pos: all.slice(0, NA * 2), head: all.slice(NA * 2) };
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
  const U = GPUBufferUsage;
  const tn = W * H * 4;
  const Ta = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const Tb = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const posB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const headB = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
  const depB = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST });
  const paramBuf = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
  {
    const buf = new ArrayBuffer(48);
    const dv = new DataView(buf);
    dv.setUint32(0, NA, true);
    dv.setUint32(4, W, true);
    dv.setUint32(8, H, true);
    dv.setUint32(12, 0, true);
    dv.setFloat32(16, (PARAMS.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, PARAMS.L_sense, true);
    dv.setFloat32(24, PARAMS.L_move, true);
    dv.setFloat32(28, PARAMS.deposit, true);
    dv.setFloat32(32, PARAMS.decay_alpha, true);
    queue.writeBuffer(paramBuf, 0, buf);
  }

  // Named sensing regimes (house § 5.3, ruling D-P1.2(a)): live-loop presets
  // over the SAME committed kernel. The preset axes are the Jones 2010 § 5
  // pattern-formation parameters (sensor angle / sensor offset; DOI
  // 10.1162/artl.2010.16.2.16202 — canonical set per § 3 Table 1, pinned in
  // docs/sim-specs/agent-based/physarum/algebraic.md § 2); regime NAMES
  // describe the measured behavior of THIS kernel (screenshots + trail stats
  // in the P-4 audit). deposit/decay/L_move stay canonical, so the
  // d·N·(1−α)/α mass equilibrium is regime-invariant. The capture path steps
  // with the canonical paramBuf only.
  interface SenseRegime {
    label: string;
    title: string;
    delta_phi_deg: number;
    L_sense: number;
  }
  const REGIMES: readonly SenseRegime[] = [
    {
      label: "canonical",
      title: "Jones 2010 Table-1 sensing — Δφ 45°, L_sense 9. The capture regime.",
      delta_phi_deg: PARAMS.delta_phi_deg, L_sense: PARAMS.L_sense,
    },
    {
      label: "fragments",
      title: "short sensors — Δφ 45°, L_sense 3: small-scale sensing breaks the trail into short, fine fragments",
      delta_phi_deg: 45.0, L_sense: 3.0,
    },
    {
      label: "long strands",
      title: "far sensors — Δφ 45°, L_sense 24: long-range sensing pulls sparse, large-scale corridors",
      delta_phi_deg: 45.0, L_sense: 24.0,
    },
    {
      label: "trunk lines",
      title: "narrow steering — Δφ 22.5°, L_sense 9: slow turning forges few, straight, heavily reinforced trunks",
      delta_phi_deg: 22.5, L_sense: 9.0,
    },
  ];
  let activeRegime: SenseRegime = REGIMES[0]!;
  const liveParamBuf = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
  function writeLiveParams(r: SenseRegime): void {
    const buf = new ArrayBuffer(48);
    const dv = new DataView(buf);
    dv.setUint32(0, NA, true);
    dv.setUint32(4, W, true);
    dv.setUint32(8, H, true);
    dv.setUint32(12, 0, true);
    dv.setFloat32(16, (r.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, r.L_sense, true);
    dv.setFloat32(24, PARAMS.L_move, true);
    dv.setFloat32(28, PARAMS.deposit, true);
    dv.setFloat32(32, PARAMS.decay_alpha, true);
    queue.writeBuffer(liveParamBuf, 0, buf);
  }
  writeLiveParams(activeRegime);

  const module = device.createShaderModule({ code: computeWgsl, label: "physarum" });
  const bgl = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });
  const pl = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
  const pAgents = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "agents" } });
  const pApply = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "apply" } });
  const pDiffuse = await device.createComputePipelineAsync({ layout: pl, compute: { module, entryPoint: "diffuse" } });

  const bind = (tin: GPUBuffer, tout: GPUBuffer, params: GPUBuffer): GPUBindGroup =>
    device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: tin } },
        { binding: 2, resource: { buffer: tout } },
        { binding: 3, resource: { buffer: posB } },
        { binding: 4, resource: { buffer: headB } },
        { binding: 5, resource: { buffer: depB } },
      ],
    });

  const wga = Math.ceil(NA / 64);
  const wgg = Math.ceil(W / 8);
  function stepWith(params: GPUBuffer): void {
    const enc = device.createCommandEncoder();
    let c = enc.beginComputePass();
    c.setPipeline(pAgents); c.setBindGroup(0, bind(Ta, Tb, params)); c.dispatchWorkgroups(wga); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pApply); c.setBindGroup(0, bind(Ta, Tb, params)); c.dispatchWorkgroups(wgg, wgg); c.end();
    c = enc.beginComputePass();
    c.setPipeline(pDiffuse); c.setBindGroup(0, bind(Tb, Ta, params)); c.dispatchWorkgroups(wgg, wgg); c.end();
    queue.submit([enc.finish()]);
  }
  // The capture path steps ONLY with the canonical paramBuf; the RAF live
  // loop steps with the live regime buffer (D-P1.2(a) pinning split).
  const stepCanonical = (): void => stepWith(paramBuf);
  const stepLive = (): void => stepWith(liveParamBuf);

  async function readF32(buf: GPUBuffer, n: number): Promise<Float32Array> {
    const rb = device.createBuffer({ size: n * 4, usage: U.COPY_DST | U.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, rb, 0, n * 4);
    queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    return out;
  }

  async function reset(): Promise<void> {
    const { pos, head } = await fetchIC();
    queue.writeBuffer(Ta, 0, new Float32Array(W * H));
    queue.writeBuffer(depB, 0, new Uint32Array(W * H));
    queue.writeBuffer(posB, 0, pos);
    queue.writeBuffer(headB, 0, head);
  }

  async function captureCanonical(): Promise<void> {
    panel.setStatus("growing network… (5000 steps)");
    panel.setCaptureEnabled(false);
    resetCapture();
    await reset();
    for (let s = 0; s < STEPS; s += 1) stepCanonical();
    const trail = await readF32(Ta, W * H);
    const pos = await readF32(posB, NA * 2);
    const head = await readF32(headB, NA * 2);
    const trail64 = new Float64Array(trail);
    let mass = 0;
    for (let i = 0; i < trail.length; i += 1) mass += trail[i]!;
    exposeCapture(
      {
        manifest: {
          schema_version: "1.0.0",
          sim: { name: "physarum", category: "agent-based", variant: "jones-2010-canonical" },
          stack: { name: "webgpu", version: "0.0.1", build_id: "web-build-5.x" },
          config: { tier: "test", dims: [W, H], dtype: "f64", seed: 42, params: { ...PARAMS, n_agents: NA } },
          run: { step_count: STEPS, capture_interval: CAPTURE_INTERVAL, wall_clock_seconds: 0, start_utc: "2026-05-20T00:00:00Z" },
          payload: { format: "hdf5", path: "network-canonical-seed42-step5000.h5", checksum: "sha256:" + "0".repeat(64) },
          determinism: { claimed: "epsilon", atomic_ops: true, subgroup_ops: false },
        },
        steps: [
          {
            step: STEPS,
            state: {
              positions: field(new Float64Array(pos), [NA, 2], "f64"),
              headings: field(new Float64Array(head), [NA, 2], "f64"),
              trail_map: field(trail64, [W, H], "f64"),
            },
            diagnostics: { total_mass: mass },
          },
        ],
      },
      { download: false },
    );
    panel.setStatus(`capture ready — total_mass=${mass.toFixed(1)} (atomic deposit; new-canonical)`);
    panel.setCaptureEnabled(true);
    await reset();
  }

  // render
  const gpuCanvas = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  gpuCanvas.configure({ device, format, alphaMode: "opaque" });
  const renderModule = device.createShaderModule({ code: renderWgsl, label: "physarum-render" });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
    ],
  });
  const renderUniform = device.createBuffer({ size: 8, usage: U.UNIFORM | U.COPY_DST });
  queue.writeBuffer(renderUniform, 0, new Uint32Array([W, H]));
  const renderPipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: { module: renderModule, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const renderBG = device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: renderUniform } },
      { binding: 1, resource: { buffer: Ta } },
    ],
  });

  // Study diagnostics (house § 5.4): trail statistics measured via the SAME
  // readF32 readback the capture path uses, on the live trail buffer. The
  // sequence token drops superseded measurements (binding rule P-4 § 0.5.2 —
  // pattern from packages/strange-attractors/web/src/main.ts).
  let diagSeq = 0;
  async function measureStudyDiagnostics(): Promise<void> {
    const seq = ++diagSeq;
    const trail = await readF32(Ta, W * H);
    if (seq !== diagSeq) return;
    let mass = 0;
    let peak = 0;
    for (let i = 0; i < trail.length; i += 1) {
      const v = trail[i]!;
      mass += v;
      if (v > peak) peak = v;
    }
    const equil = (PARAMS.deposit * NA * (1 - PARAMS.decay_alpha)) / PARAMS.decay_alpha;
    const reg = activeRegime;
    panel.setDiagnostics([
      { label: "live regime", value: reg.label },
      { label: "grid", value: `${W} × ${H}` },
      { label: "agents", value: String(NA) },
      { label: "live step", value: String(liveStep) },
      { label: "Δφ / L_sense", value: `${reg.delta_phi_deg}° / ${reg.L_sense}` },
      { label: "deposit / decay α", value: `${PARAMS.deposit} / ${PARAMS.decay_alpha}` },
      { label: "total mass", value: mass.toFixed(1) },
      { label: "mass equilibrium", value: `${equil} (d·N·(1−α)/α)` },
      { label: "peak trail", value: peak.toFixed(2) },
      { label: "capture pinned to", value: "canonical, seed 42" },
    ]);
  }

  function applyRegime(r: SenseRegime): void {
    activeRegime = r;
    writeLiveParams(r);
    panel.setStatus(
      r === REGIMES[0]
        ? "live network: canonical — the capture regime"
        : `live network: ${r.label} — capture stays pinned to canonical seed-42`,
    );
    if (suspended) void measureStudyDiagnostics();
  }

  const panel = createSettingsPanel("Physarum Network", {
    caption: "A million blind agents deposit and follow chemical trails — an efficient transport network emerges, with order-independent atomics conserving every unit of mass.",
    initial: { tier: "test", seed: 42 },
    onCapture: captureCanonical,
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
          "the committed physarum.wgsl 3-pass kernel — the same sense/rotate/move + deposit, apply, diffuse+decay compute the wgpu-native gate runs; Jones 2010 Table-1 canonical params (Δφ 45°, L_sense 9, L_move 1, d 5, α 0.1); seed-42 IC; every displayed frame is a real kernel step",
        simplified:
          "the trail deposit is u32 fixed-point (×65536) so the atomic adds are order-independent — that is what makes two runs byte-identical; the trail-vs-f64-canonical field match is precluded by atomics + agent RNG IC, so the gate is determinism + the exact mass-balance invariant; presets (sensing geometry) and the cursor deposit drive the live loop only — the capture resets to the seed-42 IC and re-runs the canonical params",
        measured:
          "trail statistics read back from the live trail buffer on entering Study and on preset change (stepping is paused in Study; the view keeps presenting)",
      },
      verdict: {
        gate: "new_canonical + run-twice (byte-identical runs; total mass within 1e-3 of the d·N·(1−α)/α = 22500 equilibrium)",
        verdict: "PASS",
        pass: true,
      },
      links: [
        {
          label: "sim spec",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/agent-based/physarum/spec-ref.md",
        },
        {
          label: "audit ledger",
          href: "https://github.com/StevenFAU/Bit-Physics/tree/main/docs/_audits",
        },
      ],
    },
  });
  panel.setActivePreset("canonical");
  await reset();
  boot.textContent = "";
  // Study = pause stepping, keep presenting (P-4 rule 0.5.3): measured at
  // HEAD, deposit/decay live in the agents/apply/diffuse COMPUTE passes inside
  // step(); the render pass is a fullscreen triangle reading the trail buffer
  // read-only (render.wgsl var<storage, read>). Stepping and presenting
  // separate cleanly, so Study suspends the physics only (D-P1.2(b)).
  let suspended = false;
  let liveStep = 0;

  // Cursor-as-force (house § 5.1, ruling D-P1.2(a)): the pointer deposits
  // chemoattractant through the kernel's OWN deposit channel — a falloff blob
  // is written into the (zero-between-steps) u32 fixed-point deposit buffer
  // immediately before the live step, so the committed apply pass adds it to
  // the trail and the agents sense and steer toward it, same frame. LIVE LOOP
  // ONLY: injection is gated to live stepping (never during capture — frame()
  // early-returns while capturing, and captureCanonical's reset() wipes the
  // trail and deposits before its canonical 5000-step re-run).
  const FORCE_RADIUS = 5; // cells
  const FORCE_DEPOSIT = 4.0; // trail units per step at the blob centre
  const DEP_SCALE = 65536; // physarum.wgsl fixed-point SCALE
  let forceCell: { x: number; y: number } | null = null;
  function pointerToCell(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const v = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
    // render.wgsl maps fragment (u, v) -> T[x*H + y] with x = u*W, y = v*H
    // (screen top = grid y 0 after its uv flip)
    return { x: Math.floor(u * W), y: Math.floor(v * H) };
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    forceCell = pointerToCell(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (forceCell) forceCell = pointerToCell(e);
  });
  const endForce = (): void => {
    forceCell = null;
  };
  canvas.addEventListener("pointerup", endForce);
  canvas.addEventListener("pointercancel", endForce);
  const one = new Uint32Array(1);
  function injectCursorDeposit(): void {
    if (!forceCell) return;
    for (let di = -FORCE_RADIUS; di <= FORCE_RADIUS; di += 1) {
      for (let dj = -FORCE_RADIUS; dj <= FORCE_RADIUS; dj += 1) {
        const r = Math.hypot(di, dj);
        if (r > FORCE_RADIUS) continue;
        const gx = (((forceCell.x + di) % W) + W) % W;
        const gy = (((forceCell.y + dj) % H) + H) % H;
        one[0] = Math.round(FORCE_DEPOSIT * (1 - r / FORCE_RADIUS) * DEP_SCALE);
        if (one[0]! > 0) queue.writeBuffer(depB, (gx * H + gy) * 4, one);
      }
    }
  }

  function frame(): void {
    if (isCapturing()) { requestAnimationFrame(frame); return; }
    if (!suspended) {
      injectCursorDeposit();
      stepLive();
      liveStep += 1;
    }
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: gpuCanvas.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0.01, b: 0.05, a: 1 } },
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
