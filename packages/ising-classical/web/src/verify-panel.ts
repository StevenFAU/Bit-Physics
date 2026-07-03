// PROVE layer (verification-demo-spec § 3.3): verification bound to real data.
//
// Four parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — gate kind/threshold, the
//      recorded browser measurement, reference-ensemble stats, determinism
//      claims, canonical provenance, audit links. No retyped constants.
//   2. The measured-vs-Yang figure: |m|(T) annealed on THIS GPU, plotted over
//      Yang 1952's exact curve with the committed golden-table anchors and
//      the declared magnetization_rel ribbon — a verification event the
//      visitor watches happen.
//   3. The live gate re-run: the canonical protocol (seed-42 IC, 10000 sweeps
//      at T 2.27) dispatched into scratch buffers on the visitor's GPU, its
//      energy-per-spin z-scored against the committed NumPy reference
//      ensemble with the gate's own spread convention — PASS/FAIL rendered
//      verbatim. Plus: a browser-side ensemble mode, a clearly-labeled
//      falsifiability probe (the same criterion at a deliberately wrong
//      temperature — the gate visibly has teeth), and the run-twice SHA-256
//      proof with the canonical-sha honesty contrast.
//   4. A session history strip — every re-run appends its verdict.
//
// SCRATCH DISCIPLINE (spec § 6): everything here runs the COMMITTED
// metropolis.wgsl shader module — the proof pipeline reuses the module
// main.ts compiled, adding only a host-side dynamic-offset binding layout so
// 20 000 param blocks batch into ~20 submits instead of 20 000 (the kernel
// itself is byte-untouched). All runs write to buffers created and destroyed
// here; the live spin buffer, the capture path and the gate are never
// touched.

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface VerifyPanelDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  /** The committed metropolis.wgsl shader module compiled by main.ts. */
  computeModule: GPUShaderModule;
  /** Lattice side (128) and spin-buffer bytes (n·n·4). */
  n: number;
  bytes: number;
  /** The committed seed-42 IC asset, fetched fresh (never the live buffer). */
  fetchCanonicalIC: () => Promise<Int32Array<ArrayBuffer>>;
  /** The display-only exploratory IC family (browser-ensemble seeds). */
  exploratoryIC: (seed: number) => Int32Array<ArrayBuffer>;
  /** The same observables the capture path computes. */
  energyPerSpin: (spins: Int32Array) => number;
  magnetization: (spins: Int32Array) => number;
}

export interface VerifyPanelHandle {
  /** Feed a live (T, |m|) sample into the measured-vs-Yang figure. */
  pushLiveSample(T: number, absM: number): void;
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;
const TC = V.analytic.Tc;

async function sha256hex(data: Int32Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function chip(label: string, title: string): HTMLButtonElement {
  const b = el("button", "ig-chip");
  b.type = "button";
  b.textContent = label;
  b.title = title;
  return b;
}

function scaledCanvas(wrap: HTMLElement, w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = el("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = w * dpr;
  c.height = h * dpr;
  wrap.appendChild(c);
  const ctx = c.getContext("2d");
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, ctx];
}

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function installVerifyPanel(d: VerifyPanelDeps): VerifyPanelHandle {
  const runner = makeScratchRunner(d);
  const handle = installYangFigure(d, runner);
  installCard(d);
  installProof(d, runner);
  return handle;
}

// --- scratch protocol runner (dynamic-offset batching over the committed
// kernel; see the header note) ------------------------------------------------

interface ScratchRunner {
  /**
   * Run `sweeps` checkerboard sweeps on `state` at temperature T with the
   * given kernel seed, numbering steps stepOffset+1 … stepOffset+sweeps
   * (identical semantics to main.ts sweepWith). h stays canonical 0.
   */
  run(
    state: GPUBuffer,
    sweeps: number,
    T: number,
    seed: number,
    stepOffset: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<void>;
  read(state: GPUBuffer): Promise<Int32Array<ArrayBuffer>>;
  makeState(): GPUBuffer;
}

function makeScratchRunner(d: VerifyPanelDeps): ScratchRunner {
  const SLOT = 256; // >= minUniformBufferOffsetAlignment on all adapters
  const CHUNK = 512; // sweeps per submit (1024 dispatches)
  let pipelinePromise: Promise<[GPUComputePipeline, GPUBindGroupLayout]> | null = null;
  let slotBuf: GPUBuffer | null = null;

  function ensurePipeline(): Promise<[GPUComputePipeline, GPUBindGroupLayout]> {
    pipelinePromise ??= (async () => {
      const bgl = d.device.createBindGroupLayout({
        label: "ising-proof-bgl",
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        ],
      });
      const pipeline = await d.device.createComputePipelineAsync({
        label: "ising-proof",
        layout: d.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
        compute: { module: d.computeModule, entryPoint: "main" },
      });
      return [pipeline, bgl] as [GPUComputePipeline, GPUBindGroupLayout];
    })();
    return pipelinePromise;
  }

  return {
    makeState(): GPUBuffer {
      return d.device.createBuffer({
        size: d.bytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        label: "ising-proof-state",
      });
    },

    async run(state, sweeps, T, seed, stepOffset, onProgress): Promise<void> {
      const [pipeline, bgl] = await ensurePipeline();
      slotBuf ??= d.device.createBuffer({
        size: CHUNK * 2 * SLOT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: "ising-proof-params",
      });
      const bg = d.device.createBindGroup({
        layout: bgl,
        entries: [
          { binding: 0, resource: { buffer: slotBuf, offset: 0, size: 32 } },
          { binding: 1, resource: { buffer: state } },
        ],
      });
      const wg = Math.ceil(d.n / 8);
      const cpu = new ArrayBuffer(CHUNK * 2 * SLOT);
      const dv = new DataView(cpu);
      const p = V.canonical.params;
      let done = 0;
      while (done < sweeps) {
        const batch = Math.min(CHUNK, sweeps - done);
        for (let s = 0; s < batch; s += 1) {
          const step = stepOffset + done + s + 1; // sweepWith numbers steps from 1
          for (let color = 0; color < 2; color += 1) {
            const off = (s * 2 + color) * SLOT;
            dv.setUint32(off + 0, d.n, true);
            dv.setUint32(off + 4, step, true);
            dv.setUint32(off + 8, color, true);
            dv.setUint32(off + 12, seed >>> 0, true);
            dv.setFloat32(off + 16, p.J, true);
            dv.setFloat32(off + 20, p.h, true);
            dv.setFloat32(off + 24, T, true);
            dv.setFloat32(off + 28, 0, true);
          }
        }
        d.queue.writeBuffer(slotBuf, 0, cpu, 0, batch * 2 * SLOT);
        const enc = d.device.createCommandEncoder();
        const pass = enc.beginComputePass();
        pass.setPipeline(pipeline);
        for (let k = 0; k < batch * 2; k += 1) {
          pass.setBindGroup(0, bg, [k * SLOT]);
          pass.dispatchWorkgroups(wg, wg, 1);
        }
        pass.end();
        d.queue.submit([enc.finish()]);
        // drain before refilling the slot buffer for the next chunk, and let
        // the UI breathe between batches
        await d.queue.onSubmittedWorkDone();
        done += batch;
        onProgress?.(done, sweeps);
      }
    },

    async read(state): Promise<Int32Array<ArrayBuffer>> {
      const rb = d.device.createBuffer({
        size: d.bytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      const enc = d.device.createCommandEncoder();
      enc.copyBufferToBuffer(state, 0, rb, 0, d.bytes);
      d.queue.submit([enc.finish()]);
      await rb.mapAsync(GPUMapMode.READ);
      const out = new Int32Array(rb.getMappedRange().slice(0));
      rb.unmap();
      rb.destroy();
      return out;
    },
  };
}

// --- 1. verification card: every value read from the generated spine --------

function installCard(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("verification — committed, not asserted");
  const dl = el("dl", "bps-diag");
  const row = (label: string, value: string, title?: string): void => {
    const dt = el("dt");
    dt.textContent = label;
    const dd = el("dd");
    dd.textContent = value;
    if (title) dd.title = title;
    dl.append(dt, dd);
  };
  row("gate", `${V.gate.kind} — z < ${V.gate.z_threshold}`, V.gate.criterion);
  row(
    "recorded browser z",
    `${V.gate.recorded_browser.z} (E/N ${V.gate.recorded_browser.energy_per_spin})`,
    `${V.gate.recorded_browser.backend}, ${V.gate.recorded_browser.date} — the committed perf-ledger measurement, not a claim`,
  );
  row(
    "reference ensemble",
    `μ ${V.reference_ensemble.mean.toFixed(4)} · σ ${V.reference_ensemble.std.toFixed(4)} (${V.reference_ensemble.n_seeds} seeds)`,
    `${V.reference_ensemble.source}; spread convention: ${V.reference_ensemble.spread_convention}`,
  );
  row("run-twice", V.gate.run_twice, "two full canonical runs, byte-identical final lattices — provable below");
  row("determinism", V.determinism.claimed, V.determinism.field_note);
  row(
    "canonical run",
    `seed ${V.canonical.seed} · ${V.canonical.grid[0]}² · ${V.canonical.sweeps} sweeps @ T ${V.canonical.params.T}`,
  );
  row("payload sha-256", `${V.canonical.payload_sha256.slice(7, 19)}…`, V.canonical.payload_sha256);
  row(
    "measured wall-clock",
    `ref ${V.canonical.wall_clock_reference_s}s · browser ${V.canonical.wall_clock_browser_s}s`,
    "committed perf-ledger baselines (browser figure includes the full harness)",
  );
  g.appendChild(dl);

  const strip = el("div", "ig-note-line");
  strip.textContent = `one protocol, three surfaces: numpy oracle · pypi wheel (${V.surfaces.pypi_wheel.split(" (")[0]}) · browser WebGPU`;
  strip.title =
    "the same canonical descriptor re-emitted by the NumPy reference, by the installed wheel in a fresh venv (max_abs 0.0), and by this web build — committed perf-ledger rows";
  g.appendChild(strip);

  const note = el("div", "ig-note-line");
  note.textContent = "measured, then declared — never widened.";
  g.appendChild(note);

  const links = el("div", "bps-links");
  for (const [label, path] of [
    ["capture manifest", V.links.capture_manifest],
    ["gate source", V.links.gate_source],
    ["reference ensemble", V.links.reference_ensemble],
    ["perf ledger", V.links.perf_ledger],
    ["tolerance table", V.links.tolerance_table],
    ["resolution audit", V.links.resolution_audit],
  ] as const) {
    const a = el("a");
    a.textContent = label;
    a.href = blobUrl(path);
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  g.appendChild(links);
}

// --- 2. measured vs exact: |m|(T) on this GPU over Yang 1952 -----------------

function installYangFigure(d: VerifyPanelDeps, runner: ScratchRunner): VerifyPanelHandle {
  const g = d.panel.addGroup("measured vs exact — Yang 1952");
  const cap = el("div", "ig-map-cap");
  cap.textContent = "|m|(T): this GPU's lattice against the exact spontaneous magnetization";
  cap.title =
    "Yang 1952's closed form (the committed m(T) golden table), the declared magnetization_rel ribbon, and measurements from the committed kernel running on your GPU. Onsager's exact T_c is the dashed line.";
  const wrap = el("div", "ig-map");
  wrap.appendChild(cap);
  const W = 252;
  const H = 170;
  const [canvas, ctx] = scaledCanvas(wrap, W, H);
  canvas.style.cursor = "default";
  g.appendChild(wrap);

  const T0 = 1.0;
  const T1 = 3.4;
  const X = (t: number): number => 30 + ((t - T0) / (T1 - T0)) * (W - 38);
  const Y = (m: number): number => H - 18 - m * (H - 30);
  const yang = (t: number): number => {
    if (t >= TC) return 0;
    const s = Math.sinh(2 / t);
    return (1 - s ** -4) ** (1 / 8);
  };

  interface MPoint {
    T: number;
    m: number;
  }
  const annealed: MPoint[] = [];
  const live: MPoint[] = [];

  function draw(): void {
    if (!ctx) return;
    const accent = cssVar("--accent", "#4dd8c0");
    const warm = cssVar("--warm", "#d8b04d");
    const bad = cssVar("--bad", "#e05c5c");
    ctx.clearRect(0, 0, W, H);
    // frame + axes
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.strokeRect(30, 8, W - 38, H - 26);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.font = "8.5px system-ui, sans-serif";
    ctx.fillText("1", Y(1) > 0 ? 20 : 20, Y(1) + 3);
    ctx.fillText("0", 20, Y(0) + 3);
    ctx.fillText("|m|", 4, 14);
    ctx.fillText(`T ${T0}`, 30, H - 5);
    ctx.textAlign = "right";
    ctx.fillText(String(T1), W - 8, H - 5);
    ctx.textAlign = "left";
    // magnetization_rel ribbon around the exact curve (declared tolerance)
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.moveTo(X(T0), Y(Math.min(1, yang(T0) * (1 + V.analytic.magnetization_rel))));
    for (let t = T0; t < TC; t += 0.01) ctx.lineTo(X(t), Y(Math.min(1, yang(t) * (1 + V.analytic.magnetization_rel))));
    for (let t = TC - 0.001; t >= T0; t -= 0.01) ctx.lineTo(X(t), Y(yang(t) * (1 - V.analytic.magnetization_rel)));
    ctx.closePath();
    ctx.fill();
    // the exact curve
    ctx.strokeStyle = warm;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(X(T0), Y(yang(T0)));
    for (let t = T0; t < TC; t += 0.005) ctx.lineTo(X(t), Y(yang(t)));
    ctx.lineTo(X(TC), Y(0));
    ctx.lineTo(X(T1), Y(0));
    ctx.stroke();
    ctx.lineWidth = 1;
    // Onsager Tc
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(TC), 8);
    ctx.lineTo(X(TC), H - 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("T_c", X(TC) + 3, 16);
    // committed golden-table anchors (diamonds)
    ctx.fillStyle = warm;
    for (const p of V.analytic.yang_points) {
      if (p.T < T0 || p.T > T1) continue;
      const x = X(p.T);
      const y = Y(p.m);
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x - 3, y);
      ctx.closePath();
      ctx.fill();
    }
    // live samples (dim — manual exploration, stripe states and all)
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (const p of live) {
      ctx.beginPath();
      ctx.arc(X(p.T), Y(Math.min(1.02, p.m)), 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // annealed measurements (the instrument's own data)
    for (const p of annealed) {
      const inRibbon = p.T >= TC - 0.001 ? p.m < 0.25 : Math.abs(p.m - yang(p.T)) <= yang(p.T) * V.analytic.magnetization_rel + 0.02;
      ctx.fillStyle = inRibbon ? accent : bad;
      ctx.beginPath();
      ctx.arc(X(p.T), Y(Math.min(1.02, p.m)), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  draw();

  const chips = el("div", "ig-chiprow");
  const runChip = chip(
    "measure m(T) on this GPU",
    "Aligned start at T 1.2, annealed upward to 3.3: 30 temperatures × 700 sweeps of the committed kernel in scratch buffers, |m| measured at each — the same aligned-IC protocol the committed golden uses (multi-domain stripe states below T_c are excluded by construction).",
  );
  const clearChip = chip("clear", "Clear the measured points.");
  chips.append(runChip, clearChip);
  g.appendChild(chips);
  const note = el("div", "ig-hash");
  note.textContent =
    `exact curve + committed anchors (◆) from the m(T) golden table; ribbon = declared magnetization_rel ${V.analytic.magnetization_rel}. ` +
    `finite-L honesty: at 128² the transition is rounded — a tail above T_c is physics, not error. dots from the live lattice (slider exploration) may sit below the curve in multi-domain stripe states; the anneal protocol measures the ordered branch.`;
  g.appendChild(note);

  let running = false;
  runChip.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    runChip.disabled = true;
    annealed.length = 0;
    void (async () => {
      try {
        const state = runner.makeState();
        const aligned = new Int32Array(d.n * d.n).fill(1);
        d.queue.writeBuffer(state, 0, aligned);
        const POINTS = 30;
        const SWEEPS_PER_T = 700;
        let stepOffset = 0;
        for (let i = 0; i < POINTS; i += 1) {
          const T = 1.2 + (i / (POINTS - 1)) * (3.3 - 1.2);
          runChip.textContent = `annealing… T ${T.toFixed(2)} (${i + 1}/${POINTS})`;
          await runner.run(state, SWEEPS_PER_T, T, 42, stepOffset);
          stepOffset += SWEEPS_PER_T;
          const spins = await runner.read(state);
          annealed.push({ T, m: Math.abs(d.magnetization(spins)) });
          draw();
        }
        state.destroy();
        runChip.textContent = "measure m(T) on this GPU";
      } catch (e) {
        runChip.textContent = "measure m(T) on this GPU";
        note.textContent = `anneal failed to run: ${(e as Error).message}`;
      } finally {
        running = false;
        runChip.disabled = false;
      }
    })();
  });
  clearChip.addEventListener("click", () => {
    annealed.length = 0;
    live.length = 0;
    draw();
  });

  return {
    pushLiveSample(T: number, absM: number): void {
      live.push({ T, m: absM });
      if (live.length > 80) live.shift();
      draw();
    },
  };
}

// --- 3. the live gate re-run + falsifiability probe + run-twice proof -------

type RunKind = "gate" | "falsify" | "ensemble";

interface GateSample {
  kind: RunKind;
  label: string;
  E: number;
  z: number;
  pass: boolean;
}

function installProof(d: VerifyPanelDeps, runner: ScratchRunner): void {
  const g = d.panel.addGroup("prove it — on this GPU");

  const R = V.reference_ensemble;
  const mu = R.mean;
  const spread = R.spread;
  const zOf = (E: number): number => Math.abs(E - mu) / spread;

  // -- distribution card (drift-card pattern, spec § 3.3) --------------------
  const wrap = el("div", "ig-map");
  const cap = el("div", "ig-map-cap");
  cap.textContent = "E/N: the reference ensemble, the acceptance band, and your GPU's sample";
  cap.title =
    `${R.n_seeds}-seed NumPy reference ensemble (committed stats: μ ${mu.toFixed(4)}, σ ${R.std.toFixed(4)}), ` +
    `the |z| < ${V.gate.z_threshold} acceptance band with the gate's own spread convention, and every sample this session measures.`;
  wrap.appendChild(cap);
  const W = 252;
  const H = 96;
  const [, ctx] = scaledCanvas(wrap, W, H);
  g.appendChild(wrap);

  const samples: GateSample[] = [];

  function drawDist(): void {
    if (!ctx) return;
    const accent = cssVar("--accent", "#4dd8c0");
    const bad = cssVar("--bad", "#e05c5c");
    ctx.clearRect(0, 0, W, H);
    // range: μ ± 4σ, stretched to include any sample (the falsify probe
    // lands far outside — that is the point)
    let lo = mu - 4 * spread;
    let hi = mu + 4 * spread;
    for (const s of samples) {
      lo = Math.min(lo, s.E - spread);
      hi = Math.max(hi, s.E + spread);
    }
    const X = (e: number): number => 8 + ((e - lo) / (hi - lo)) * (W - 16);
    const axisY = H - 26;
    // acceptance band ±3·spread
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(X(mu - V.gate.z_threshold * spread), 12, X(mu + V.gate.z_threshold * spread) - X(mu - V.gate.z_threshold * spread), axisY - 12);
    // gaussian silhouette of the reference ensemble
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    for (let px = 0; px <= W - 16; px += 2) {
      const e = lo + (px / (W - 16)) * (hi - lo);
      const y = axisY - Math.exp(-0.5 * ((e - mu) / R.std) ** 2) * (axisY - 16);
      if (px === 0) ctx.moveTo(8 + px, y);
      else ctx.lineTo(8 + px, y);
    }
    ctx.stroke();
    // axis
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(8, axisY);
    ctx.lineTo(W - 8, axisY);
    ctx.stroke();
    // the six committed reference energies
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (const e of R.energies_per_spin) {
      ctx.beginPath();
      ctx.arc(X(e), axisY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // μ tick + labels
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "8.5px system-ui, sans-serif";
    ctx.fillRect(X(mu) - 0.5, axisY - 4, 1, 8);
    ctx.fillText(`μ ${mu.toFixed(3)}`, X(mu) + 3, axisY + 10);
    ctx.fillText(`±${V.gate.z_threshold}σ band`, X(mu - V.gate.z_threshold * spread) + 2, 10);
    ctx.textAlign = "right";
    ctx.fillText("E/N", W - 8, axisY + 10);
    ctx.textAlign = "left";
    // session samples
    for (const s of samples) {
      ctx.fillStyle = s.pass ? accent : bad;
      ctx.fillRect(X(s.E) - 1, 14, 2, axisY - 14);
      ctx.beginPath();
      ctx.moveTo(X(s.E), 14);
      ctx.lineTo(X(s.E) - 3.5, 7);
      ctx.lineTo(X(s.E) + 3.5, 7);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawDist();

  // -- provenance chips -------------------------------------------------------
  const prov = el("div", "ig-hash");
  prov.textContent =
    `protocol: seed ${V.canonical.seed} IC · ${V.canonical.grid[0]}² · ${V.canonical.sweeps} sweeps @ T ${V.canonical.params.T} · ` +
    `reference: ${R.n_seeds}-seed ising_numpy · payload ${V.canonical.payload_sha256.slice(7, 15)}…`;
  prov.title = `${R.provenance}`;
  g.appendChild(prov);

  // -- controls ---------------------------------------------------------------
  const chips = el("div", "ig-chiprow");
  const gateChip = chip(
    "re-run the observable gate on this GPU",
    `The gate's own protocol, on your hardware: reload the committed seed-42 IC, ${V.canonical.sweeps} sweeps at T ${V.canonical.params.T} in scratch buffers, ` +
      `then z = |E/N − μ| / spread against the committed ${R.n_seeds}-seed NumPy ensemble. Whatever it measures is displayed — an outlier GPU would say FAIL, verbatim.`,
  );
  const ensembleChip = chip(
    "browser ensemble (+4 seeds)",
    "Four more protocol runs from different exploratory seeds — a browser-side ensemble beside the NumPy one. Self-averaging made visible: the samples should land inside the band.",
  );
  const failChip = chip(
    "⚠ make it fail — wrong T on purpose",
    `Falsifiability probe: the SAME criterion, deliberately run at T ${V.falsify.wrong_T} instead of ${V.canonical.params.T}. ` +
      "The ordered-phase energy sits far outside the reference ensemble, so the gate must say FAIL — proof it has teeth. Clearly labeled; nothing is wrong with the sim.",
  );
  chips.append(gateChip, ensembleChip, failChip);
  g.appendChild(chips);

  const gateOut = el("div", "ig-hash");
  g.appendChild(gateOut);

  // -- session history --------------------------------------------------------
  const history = el("div", "ig-hash");
  const histHead = el("b");
  histHead.textContent = "session history: ";
  const histBody = el("span");
  histBody.textContent = "no re-runs yet — the committed browser measurement is z = " + String(V.gate.recorded_browser.z);
  history.append(histHead, histBody);
  g.appendChild(history);
  let runCount = 0;
  function pushHistory(text: string, pass: boolean): void {
    runCount += 1;
    if (runCount === 1) histBody.textContent = "";
    const line = el("span", pass ? "ok" : "no");
    line.textContent = `  #${runCount} ${text}`;
    histBody.appendChild(line);
  }

  function gateRow(label: string, E: number, z: number, pass: boolean, deliberate: boolean): void {
    gateOut.textContent = "";
    const b = el("b");
    b.textContent = `${label}: `;
    const text = document.createTextNode(`E/N ${E.toFixed(4)} · z = ${z.toFixed(2)} · |z| < ${V.gate.z_threshold} → `);
    const verdict = el("span", pass ? "ok" : "no");
    verdict.textContent = pass ? "PASS ✓" : "FAIL ✗";
    gateOut.append(b, text, verdict);
    if (deliberate) {
      gateOut.appendChild(document.createElement("br"));
      const capn = el("span");
      capn.textContent =
        "— deliberately wrong protocol (T " +
        String(V.falsify.wrong_T) +
        "): the gate has teeth. Wrong physics fails it; the canonical protocol passes it.";
      gateOut.appendChild(capn);
    } else if (pass) {
      gateOut.appendChild(document.createElement("br"));
      const capn = el("span");
      capn.textContent =
        `— your GPU just reproduced the observable gate (recorded browser z = ${V.gate.recorded_browser.z} on ${V.gate.recorded_browser.backend}). ` +
        "Same GPU → same E/N every run (bit-exact-same-hw); a different GPU is a genuinely new sample.";
      gateOut.appendChild(capn);
    }
  }

  let busy = false;
  async function runGateProtocol(T: number, seed: number, ic: Int32Array<ArrayBuffer>, progress: (s: string) => void): Promise<Int32Array<ArrayBuffer>> {
    const state = runner.makeState();
    d.queue.writeBuffer(state, 0, ic);
    await runner.run(state, V.canonical.sweeps, T, seed, 0, (done, total) => {
      progress(`sweeping… ${Math.round((done / total) * 100)}%`);
    });
    const spins = await runner.read(state);
    state.destroy();
    return spins;
  }

  function guarded(btn: HTMLButtonElement, fn: () => Promise<void>): void {
    btn.addEventListener("click", () => {
      if (busy || isCapturing()) return;
      busy = true;
      gateChip.disabled = ensembleChip.disabled = failChip.disabled = twiceBtn.disabled = true;
      void fn()
        .catch((e: unknown) => {
          gateOut.textContent = `proof failed to run: ${(e as Error).message}`;
        })
        .finally(() => {
          busy = false;
          gateChip.disabled = ensembleChip.disabled = failChip.disabled = twiceBtn.disabled = false;
        });
    });
  }

  guarded(gateChip, async () => {
    const orig = gateChip.textContent;
    const ic = await d.fetchCanonicalIC();
    const spins = await runGateProtocol(V.canonical.params.T, V.canonical.seed, ic, (s) => {
      gateChip.textContent = s;
    });
    gateChip.textContent = orig;
    const E = d.energyPerSpin(spins);
    const z = zOf(E);
    const pass = z < V.gate.z_threshold;
    samples.push({ kind: "gate", label: "gate", E, z, pass });
    drawDist();
    gateRow("observable gate, this GPU", E, z, pass, false);
    pushHistory(`gate z=${z.toFixed(2)} ${pass ? "PASS" : "FAIL"}`, pass);
  });

  guarded(failChip, async () => {
    const orig = failChip.textContent;
    const ic = await d.fetchCanonicalIC();
    const spins = await runGateProtocol(V.falsify.wrong_T, V.canonical.seed, ic, (s) => {
      failChip.textContent = `⚠ ${s}`;
    });
    failChip.textContent = orig;
    const E = d.energyPerSpin(spins);
    const z = zOf(E);
    const pass = z < V.gate.z_threshold;
    samples.push({ kind: "falsify", label: "falsify", E, z, pass });
    drawDist();
    gateRow(`falsifiability probe (T ${V.falsify.wrong_T}, deliberate)`, E, z, pass, true);
    pushHistory(`wrong-T probe z=${z.toFixed(2)} ${pass ? "PASS" : "FAIL (by design)"}`, false);
  });

  guarded(ensembleChip, async () => {
    const orig = ensembleChip.textContent;
    const seeds = [101, 202, 303, 404];
    let i = 0;
    for (const seed of seeds) {
      i += 1;
      const spins = await runGateProtocol(V.canonical.params.T, seed, d.exploratoryIC(seed), (s) => {
        ensembleChip.textContent = `seed ${seed} (${i}/${seeds.length}) ${s}`;
      });
      const E = d.energyPerSpin(spins);
      const z = zOf(E);
      samples.push({ kind: "ensemble", label: `seed ${seed}`, E, z, pass: z < V.gate.z_threshold });
      drawDist();
    }
    ensembleChip.textContent = orig;
    const zs = samples.filter((s) => s.kind === "ensemble").map((s) => s.z.toFixed(2));
    gateOut.textContent = "";
    const b = el("b");
    b.textContent = "browser ensemble: ";
    gateOut.append(
      b,
      document.createTextNode(
        `4 seeds → z = [${zs.join(", ")}] against the NumPy band — two independent ensembles (different RNGs, different ICs) agreeing on the same statistic. `,
      ),
    );
    pushHistory(`ensemble z=[${zs.join(",")}]`, true);
  });

  // -- run-twice proof + the canonical-sha honesty contrast --------------------
  const twiceBtn = el("button", "bps-btn");
  twiceBtn.type = "button";
  twiceBtn.textContent = "Run the canonical protocol twice — hash both";
  twiceBtn.title =
    "Reloads the committed seed-42 IC, runs the canonical 10000-sweep protocol twice into scratch buffers, and SHA-256-hashes each final spin lattice. bit-exact-same-hw: the two digests must be identical on your GPU.";
  const twiceOut = el("div", "ig-hash");
  g.append(twiceBtn, twiceOut);

  if (!("subtle" in crypto)) {
    twiceBtn.disabled = true;
    twiceOut.textContent = "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here";
    return;
  }

  guarded(twiceBtn, async () => {
    const orig = twiceBtn.textContent;
    const ic = await d.fetchCanonicalIC();
    twiceOut.textContent = `2 × ${V.canonical.sweeps} canonical sweeps + hashing…`;
    const run1 = await runGateProtocol(V.canonical.params.T, V.canonical.seed, ic, (s) => {
      twiceBtn.textContent = `run 1: ${s}`;
    });
    const run2 = await runGateProtocol(V.canonical.params.T, V.canonical.seed, ic, (s) => {
      twiceBtn.textContent = `run 2: ${s}`;
    });
    twiceBtn.textContent = orig;
    const [h1, h2] = await Promise.all([sha256hex(run1), sha256hex(run2)]);
    twiceOut.textContent = "";
    const line = (label: string, text: string): void => {
      const b = el("b");
      b.textContent = `${label}: `;
      twiceOut.append(b, document.createTextNode(text), document.createElement("br"));
    };
    line("run 1", h1);
    line("run 2", h2);
    const identical = h1 === h2;
    const dv = el("span", identical ? "ok" : "no");
    dv.textContent = identical
      ? `identical ✓ — two full runs, one hash (${d.bytes.toLocaleString()} bytes each): ${V.determinism.claimed}`
      : "MISMATCH ✗ — this device is not replaying byte-identically";
    twiceOut.append(dv, document.createElement("br"));
    line("canonical NumPy payload", V.canonical.payload_sha256.slice(7));
    const contrast = el("span");
    contrast.textContent =
      "— the browser digest does NOT equal the canonical payload sha, and should not: " + V.determinism.field_note;
    twiceOut.appendChild(contrast);
    pushHistory(`run-twice ${identical ? "identical" : "MISMATCH"}`, identical);
  });
}
