// PROVE layer (verification-demo-spec § 3.3): verification bound to real data.
//
// Four parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — gate kind/threshold, the
//      recorded browser mass measurement, determinism claims, canonical
//      provenance, the cross-hardware honesty note, audit links. No retyped
//      constants.
//   2. The flagship live mass-conservation gate: the visitor's measured
//      total_mass, pushed every readback tick, plotted as it converges to and
//      holds at the d·N·(1−α)/α equilibrium line, with mass_rel re-computed vs
//      the 1e-3 threshold → PASS/FAIL. The invariant is a single sum, so unlike
//      rd2d/ising this runs continuously on the live field (spec § 3.3).
//   3. The falsifiability probe: the SAME criterion checked against a
//      deliberately wrong canonical mass → mass_rel ≫ threshold → FAIL, red, on
//      demand. (The open-system "food converges to a predicted higher line"
//      half is driven by the live loop feeding an adjusted equilibrium.)
//   4. The run-twice proof: the committed 5000-step protocol replayed twice
//      into SCRATCH buffers on the visitor's GPU, each trail_map SHA-256-hashed,
//      the two identical digests shown with the integer-atomics explanation and
//      the cross-hardware honesty contrast (they match each other; the committed
//      sha only on the reference GPU).
//
// SCRATCH DISCIPLINE (spec § 6): the run-twice proof runs the COMMITTED
// physarum.wgsl module (reused from main.ts) on buffers created and destroyed
// here — the live Ta/Tb/pos/head/dep, the capture path and the gate are never
// touched.

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface VerifyPanelDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  /** The committed physarum.wgsl shader module compiled by main.ts. */
  computeModule: GPUShaderModule;
  W: number;
  H: number;
  NA: number;
  /** The committed seed-42 IC asset, fetched fresh (never the live buffers). */
  fetchCanonicalIC: () => Promise<{ pos: Float32Array; head: Float32Array }>;
}

export interface VerifyPanelHandle {
  /**
   * Feed the live measured total_mass and the equilibrium it should hold at
   * (the food-adjusted line in open-system scenarios) into the flagship gate.
   */
  pushLiveMass(mass: number, equilibrium: number): void;
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

async function sha256hex(data: Float32Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
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
  installCard(d);
  const handle = installLiveGate(d);
  installProof(d, makeScratchRunner(d));
  return handle;
}

// --- scratch protocol runner (the committed 3-pass kernel, own buffers) -----

interface ScratchRunner {
  /** Replay the canonical 5000-step protocol from the seed-42 IC; return the
   *  final trail_map (W·H f32). Buffers are created and destroyed per call. */
  runCanonical(
    ic: { pos: Float32Array; head: Float32Array },
    onProgress?: (done: number, total: number) => void,
  ): Promise<Float32Array>;
}

function makeScratchRunner(d: VerifyPanelDeps): ScratchRunner {
  const { device, queue, W, H, NA } = d;
  const U = GPUBufferUsage;
  const tn = W * H * 4;
  const STEPS = V.canonical.steps;
  const CHUNK = 200; // steps per submit (600 dispatches)

  interface Built {
    bgl: GPUBindGroupLayout;
    pAgents: GPUComputePipeline;
    pApply: GPUComputePipeline;
    pDiffuse: GPUComputePipeline;
  }
  let builtPromise: Promise<Built> | null = null;

  function ensure(): Promise<Built> {
    builtPromise ??= (async (): Promise<Built> => {
      const bgl = device.createBindGroupLayout({
        label: "physarum-proof-bgl",
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
          { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
          { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
          { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        ],
      });
      const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
      const mk = (entryPoint: string): Promise<GPUComputePipeline> =>
        device.createComputePipelineAsync({ layout, compute: { module: d.computeModule, entryPoint } });
      const [pAgents, pApply, pDiffuse] = await Promise.all([mk("agents"), mk("apply"), mk("diffuse")]);
      return { bgl, pAgents, pApply, pDiffuse };
    })();
    return builtPromise;
  }

  return {
    async runCanonical(ic, onProgress): Promise<Float32Array> {
      const { bgl, pAgents, pApply, pDiffuse } = await ensure();
      const Ta = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
      const Tb = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC });
      const pos = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST });
      const head = device.createBuffer({ size: NA * 2 * 4, usage: U.STORAGE | U.COPY_DST });
      const dep = device.createBuffer({ size: tn, usage: U.STORAGE | U.COPY_DST });
      const params = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
      {
        const buf = new ArrayBuffer(48);
        const dv = new DataView(buf);
        const p = V.canonical.params;
        dv.setUint32(0, NA, true);
        dv.setUint32(4, W, true);
        dv.setUint32(8, H, true);
        dv.setUint32(12, 0, true);
        dv.setFloat32(16, (p.delta_phi_deg * Math.PI) / 180, true);
        dv.setFloat32(20, p.L_sense, true);
        dv.setFloat32(24, p.L_move, true);
        dv.setFloat32(28, p.deposit, true);
        dv.setFloat32(32, p.decay_alpha, true);
        queue.writeBuffer(params, 0, buf);
      }
      // init: trail 0, deposit 0, agents at the seed-42 IC
      queue.writeBuffer(Ta, 0, new Float32Array(W * H));
      queue.writeBuffer(dep, 0, new Uint32Array(W * H));
      queue.writeBuffer(pos, 0, ic.pos);
      queue.writeBuffer(head, 0, ic.head);

      const bind = (tin: GPUBuffer, tout: GPUBuffer): GPUBindGroup =>
        device.createBindGroup({
          layout: bgl,
          entries: [
            { binding: 0, resource: { buffer: params } },
            { binding: 1, resource: { buffer: tin } },
            { binding: 2, resource: { buffer: tout } },
            { binding: 3, resource: { buffer: pos } },
            { binding: 4, resource: { buffer: head } },
            { binding: 5, resource: { buffer: dep } },
          ],
        });
      const bgAB = bind(Ta, Tb); // agents reads Ta; apply Ta->Tb
      const bgBA = bind(Tb, Ta); // diffuse Tb->Ta
      const wga = Math.ceil(NA / 64);
      const wgg = Math.ceil(W / 8);

      let done = 0;
      while (done < STEPS) {
        const batch = Math.min(CHUNK, STEPS - done);
        const enc = device.createCommandEncoder();
        for (let s = 0; s < batch; s += 1) {
          let c = enc.beginComputePass();
          c.setPipeline(pAgents); c.setBindGroup(0, bgAB); c.dispatchWorkgroups(wga); c.end();
          c = enc.beginComputePass();
          c.setPipeline(pApply); c.setBindGroup(0, bgAB); c.dispatchWorkgroups(wgg, wgg); c.end();
          c = enc.beginComputePass();
          c.setPipeline(pDiffuse); c.setBindGroup(0, bgBA); c.dispatchWorkgroups(wgg, wgg); c.end();
        }
        queue.submit([enc.finish()]);
        await queue.onSubmittedWorkDone();
        done += batch;
        onProgress?.(done, STEPS);
      }

      const rb = device.createBuffer({ size: tn, usage: U.COPY_DST | U.MAP_READ });
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(Ta, 0, rb, 0, tn);
      queue.submit([enc.finish()]);
      await rb.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(rb.getMappedRange().slice(0));
      rb.unmap();
      rb.destroy();
      for (const b of [Ta, Tb, pos, head, dep, params]) b.destroy();
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
  row("gate", `${V.gate.kind} — mass_rel < ${V.gate.mass_rel_threshold}`, V.gate.criterion);
  row(
    "recorded browser mass",
    `${V.gate.recorded_browser.total_mass} (rel ${V.gate.recorded_browser.mass_rel})`,
    `${V.gate.recorded_browser.backend}, ${V.gate.recorded_browser.date} — the committed perf-ledger measurement, not a claim`,
  );
  row(
    "mass equilibrium",
    `${V.mass_equilibrium.canonical_value.toLocaleString()} = ${V.mass_equilibrium.formula}`,
    V.mass_equilibrium.derivation,
  );
  row("run-twice", V.gate.run_twice, V.gate.atomic_strategy);
  row("determinism", V.determinism.claimed, V.determinism.field_note);
  row(
    "canonical run",
    `seed ${V.canonical.seed} · ${V.canonical.grid[0]}² · ${V.canonical.n_agents} agents · ${V.canonical.steps} steps`,
  );
  row("payload sha-256", `${V.canonical.payload_sha256.slice(7, 19)}…`, V.canonical.payload_sha256);
  row(
    "measured wall-clock",
    `ref ${V.canonical.wall_clock_reference_s}s · browser ${V.canonical.wall_clock_browser_s}s`,
    "committed perf-ledger baselines (browser figure includes the full harness)",
  );
  g.appendChild(dl);

  const note = el("div", "ig-note-line");
  note.textContent = "measured, then declared — never widened.";
  g.appendChild(note);

  const links = el("div", "bps-links");
  for (const [label, path] of [
    ["capture manifest", V.links.capture_manifest],
    ["gate source", V.links.gate_source],
    ["kernel", V.links.kernel],
    ["perf ledger", V.links.perf_ledger],
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

// --- 2. flagship: the live mass-conservation gate ---------------------------

function installLiveGate(d: VerifyPanelDeps): VerifyPanelHandle {
  const g = d.panel.addGroup("mass conservation — live, on this GPU");

  const wrap = el("div", "ig-map");
  const cap = el("div", "ig-map-cap");
  cap.textContent = "total_mass / equilibrium: convergence to and hold at the closed-form line";
  cap.title =
    "the trail field's total mass, measured live on your GPU and divided by the d·N·(1−α)/α equilibrium it must hold at. " +
    "It climbs to 1.0 as the network grows and stays there — a conserved quantity, checked every readback. In an open-system " +
    "science scenario the equilibrium jumps to the food-adjusted line and the ratio re-approaches 1.";
  wrap.appendChild(cap);
  const W = 252;
  const H = 104;
  const [, ctx] = scaledCanvas(wrap, W, H);
  g.appendChild(wrap);

  const gateRow = el("div", "ig-hash");
  g.appendChild(gateRow);

  const chips = el("div", "ig-chiprow");
  const failChip = chip(
    "⚠ make it fail — wrong target on purpose",
    `Falsifiability probe: re-check the live mass against a deliberately wrong canonical mass (${V.falsify.wrong_mass_factor}× the equilibrium). ` +
      "The true conserved mass then reads mass_rel ≫ threshold → FAIL. Clearly labelled; nothing is wrong with the sim.",
  );
  chips.append(failChip);
  g.appendChild(chips);

  const history: { r: number }[] = [];
  let last: { mass: number; eq: number } | null = null;
  const MAXH = 160;

  function draw(): void {
    if (!ctx) return;
    const accent = cssVar("--accent", "#4dd8c0");
    const warm = cssVar("--warm", "#d8b04d");
    ctx.clearRect(0, 0, W, H);
    const x0 = 26;
    const yTop = 10;
    const yBot = H - 16;
    const rMax = 1.2;
    const Y = (r: number): number => yBot - (Math.min(r, rMax) / rMax) * (yBot - yTop);
    // frame
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.strokeRect(x0, yTop, W - x0 - 8, yBot - yTop);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.font = "8.5px system-ui, sans-serif";
    ctx.fillText("1.2", 4, Y(1.2) + 3);
    ctx.fillText("1.0", 4, Y(1.0) + 3);
    ctx.fillText("0", 4, Y(0) + 3);
    // equilibrium target line at r = 1
    ctx.strokeStyle = warm;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, Y(1));
    ctx.lineTo(W - 8, Y(1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = warm;
    ctx.fillText("equilibrium", x0 + 3, Y(1) - 3);
    // convergence trace
    if (history.length > 1) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < history.length; i += 1) {
        const x = x0 + (i / (MAXH - 1)) * (W - x0 - 8);
        const y = Y(history[i]!.r);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  draw();

  function renderGate(mass: number, eq: number, targetEq: number, deliberate: boolean): void {
    const rel = Math.abs(mass - targetEq) / targetEq;
    const pass = rel < V.gate.mass_rel_threshold;
    gateRow.textContent = "";
    const b = el("b");
    b.textContent = deliberate ? `falsify (target ${targetEq.toFixed(0)}, wrong): ` : "live mass gate: ";
    const text = document.createTextNode(
      `M ${mass.toFixed(1)} · M_eq ${eq.toFixed(0)} · mass_rel ${rel.toExponential(2)} · < ${V.gate.mass_rel_threshold} → `,
    );
    const verdict = el("span", pass ? "ok" : "no");
    verdict.textContent = pass ? "PASS ✓" : "FAIL ✗";
    gateRow.append(b, text, verdict);
    if (deliberate) {
      gateRow.appendChild(document.createElement("br"));
      const capn = el("span");
      capn.textContent = `— deliberately wrong target: the conserved mass is right, the check is wrong, so it FAILs. The gate has teeth.`;
      gateRow.appendChild(capn);
    }
  }

  failChip.addEventListener("click", () => {
    if (!last) {
      gateRow.textContent = "no live sample yet — let the network grow for a moment first.";
      return;
    }
    renderGate(last.mass, last.eq, last.eq * V.falsify.wrong_mass_factor, true);
  });

  return {
    pushLiveMass(mass: number, equilibrium: number): void {
      last = { mass, eq: equilibrium };
      history.push({ r: equilibrium > 0 ? mass / equilibrium : 0 });
      if (history.length > MAXH) history.shift();
      draw();
      renderGate(mass, equilibrium, equilibrium, false);
    },
  };
}

// --- 3. run-twice proof + integer-atomics + cross-hardware honesty ----------

function installProof(d: VerifyPanelDeps, runner: ScratchRunner): void {
  const g = d.panel.addGroup("prove it — run the protocol twice, hash both");

  const prov = el("div", "ig-hash");
  prov.textContent =
    `protocol: seed ${V.canonical.seed} IC · ${V.canonical.grid[0]}² · ${V.canonical.n_agents} agents · ` +
    `${V.canonical.steps} steps · payload ${V.canonical.payload_sha256.slice(7, 15)}…`;
  prov.title = V.gate.atomic_strategy;
  g.appendChild(prov);

  const twiceBtn = el("button", "bps-btn");
  twiceBtn.type = "button";
  twiceBtn.textContent = "Run the canonical protocol twice — hash both trail fields";
  twiceBtn.title =
    `Replays the committed seed-42 IC and runs the canonical ${V.canonical.steps}-step protocol twice into scratch buffers, ` +
    "SHA-256-hashing each final trail_map. Integer atomics make the two digests identical on your GPU.";
  const twiceOut = el("div", "ig-hash");
  g.append(twiceBtn, twiceOut);

  if (!("subtle" in crypto)) {
    twiceBtn.disabled = true;
    twiceOut.textContent = "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here";
    return;
  }

  let busy = false;
  twiceBtn.addEventListener("click", () => {
    if (busy || isCapturing()) return;
    busy = true;
    twiceBtn.disabled = true;
    const orig = twiceBtn.textContent;
    void (async () => {
      try {
        const ic = await d.fetchCanonicalIC();
        twiceOut.textContent = `2 × ${V.canonical.steps} canonical steps + hashing…`;
        const run1 = await runner.runCanonical(ic, (done, total) => {
          twiceBtn.textContent = `run 1: ${Math.round((done / total) * 100)}%`;
        });
        const run2 = await runner.runCanonical(ic, (done, total) => {
          twiceBtn.textContent = `run 2: ${Math.round((done / total) * 100)}%`;
        });
        twiceBtn.textContent = orig;
        const [h1, h2] = await Promise.all([sha256hex(run1), sha256hex(run2)]);
        let mass = 0;
        for (let i = 0; i < run1.length; i += 1) mass += run1[i]!;
        const rel = Math.abs(mass - V.mass_equilibrium.canonical_value) / V.mass_equilibrium.canonical_value;
        const massOk = rel < V.gate.mass_rel_threshold;
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
          ? `identical ✓ — two full runs, one hash (${(run1.length * 4).toLocaleString()} bytes each): ${V.determinism.claimed}`
          : "MISMATCH ✗ — this device is not replaying byte-identically";
        twiceOut.append(dv, document.createElement("br"));
        // the mass invariant, re-checked on the scratch run
        const mb = el("b");
        mb.textContent = "mass invariant: ";
        const mv = el("span", massOk ? "ok" : "no");
        mv.textContent = massOk ? "PASS ✓" : "FAIL ✗";
        twiceOut.append(
          mb,
          document.createTextNode(`M ${mass.toFixed(1)} vs ${V.mass_equilibrium.canonical_value} · mass_rel ${rel.toExponential(2)} → `),
          mv,
          document.createElement("br"),
        );
        // the cross-hardware honesty contrast
        line("committed reference sha", V.canonical.payload_sha256.slice(7));
        const contrast = el("span");
        contrast.textContent = "— " + V.gate.cross_hw_note;
        twiceOut.appendChild(contrast);
      } catch (e) {
        twiceBtn.textContent = orig;
        twiceOut.textContent = `proof failed to run: ${(e as Error).message}`;
      } finally {
        busy = false;
        twiceBtn.disabled = false;
      }
    })();
  });
}
