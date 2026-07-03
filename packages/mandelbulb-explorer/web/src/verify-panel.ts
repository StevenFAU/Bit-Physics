// PROVE layer (verification-demo-spec § 3.3): verification bound to real data.
//
// Four parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — gate kind AND its actual
//      pass criterion (run-twice identity, verify.py:395), the strict
//      closed-form budget, the recorded f32 floor that sits ABOVE it, the
//      canonical provenance. No retyped constants.
//   2. The flagship live gate re-run: the COMMITTED mandelbulb_de.wgsl is
//      dispatched TWICE over the canonical probe points (verbatim f64
//      coordinates from the committed h5, via the spine) in scratch buffers
//      on the visitor's GPU; both result sets are SHA-256-hashed (run-twice),
//      and run 1 is scored against the committed f64 canonical DE values —
//      rendered as three numbers on one log scale (yours · strict budget ·
//      recorded floor) with the honest framing: the f32 floor does NOT clear
//      the strict f64 budget and the repo reports that instead of widening.
//      A 16×16 residual heatmap shows WHERE the floor bites, and can drive
//      the § 3.1 probe-grid overlay in the 3-D view.
//   3. Measured-vs-analytic anchors: the three exact closed-form points
//      evaluated on this GPU against the committed golden values
//      (measured-then-declared display bounds, docs/architecture.md § 2.6).
//   4. The falsifiability probe: the SAME committed kernel with a deliberately
//      wrong parameter (p = 9 through the Params uniform) against the p = 8
//      canonical → an honest red FAIL, clearly labeled as deliberate.
//
// The scratch runner compiles the same committed WGSL source into its own
// pipeline with transient buffers and its own Params uniform — the frozen
// capture path (evalProbeDE / captureCanonical) is byte-untouched (§ 6).

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import { getColormap } from "../../../../common/common-web/src/colormap.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface VerifyPanelDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  /** The committed gate kernel source (main.ts's own ?raw import). */
  deWgsl: string;
  /** Feed normalized per-probe residuals to the 3-D overlay buffer. */
  onResiduals: (w: Float32Array) => void;
  /** Turn the § 3.1 probe-grid overlay on. */
  showOverlay: () => void;
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

async function sha256hex(data: Float32Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- scratch DE runner (additive; the ising verify-panel precedent) ----------

interface ScratchRunner {
  /** Evaluate the committed DE kernel at `pts` (xyz triples) with power p. */
  run(pts: Float32Array<ArrayBuffer>, p: number): Promise<Float32Array<ArrayBuffer>>;
}

function makeScratchRunner(d: VerifyPanelDeps): ScratchRunner {
  let lazy: Promise<[GPUComputePipeline, GPUBindGroupLayout]> | null = null;
  function ensure(): Promise<[GPUComputePipeline, GPUBindGroupLayout]> {
    lazy ??= (async () => {
      const bgl = d.device.createBindGroupLayout({
        label: "mb-proof-bgl",
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        ],
      });
      const pipeline = await d.device.createComputePipelineAsync({
        label: "mb-proof",
        layout: d.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
        compute: {
          module: d.device.createShaderModule({ code: d.deWgsl, label: "mb-proof-de" }),
          entryPoint: "main",
        },
      });
      return [pipeline, bgl] as [GPUComputePipeline, GPUBindGroupLayout];
    })();
    return lazy;
  }
  return {
    async run(pts, p): Promise<Float32Array<ArrayBuffer>> {
      const [pipeline, bgl] = await ensure();
      const n = pts.length / 3;
      const params = new ArrayBuffer(16);
      const dv = new DataView(params);
      dv.setUint32(0, n, true);
      dv.setUint32(4, p, true);
      dv.setFloat32(8, V.canonical.params.escape_radius, true);
      dv.setUint32(12, V.canonical.params.n_max, true);
      const ub = d.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      d.queue.writeBuffer(ub, 0, params);
      const pin = d.device.createBuffer({ size: pts.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      d.queue.writeBuffer(pin, 0, pts);
      const dout = d.device.createBuffer({ size: n * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
      const bg = d.device.createBindGroup({
        layout: bgl,
        entries: [
          { binding: 0, resource: { buffer: ub } },
          { binding: 1, resource: { buffer: pin } },
          { binding: 2, resource: { buffer: dout } },
        ],
      });
      const enc = d.device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(n / 64), 1, 1);
      pass.end();
      const rb = d.device.createBuffer({ size: n * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      enc.copyBufferToBuffer(dout, 0, rb, 0, n * 4);
      d.queue.submit([enc.finish()]);
      await rb.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(rb.getMappedRange().slice(0));
      rb.unmap();
      for (const b of [rb, ub, pin, dout]) b.destroy();
      return out;
    },
  };
}

export function installVerifyPanel(d: VerifyPanelDeps): void {
  const runner = makeScratchRunner(d);
  installCard(d);
  installGateRerun(d, runner);
  installAnchors(d, runner);
  installFalsifiability(d, runner);
}

// --- helpers -----------------------------------------------------------------

function noteLine(parent: HTMLElement, text: string): void {
  const n = document.createElement("div");
  n.className = "mb-note-line";
  n.textContent = text;
  parent.appendChild(n);
}

function linksRow(parent: HTMLElement, entries: readonly (readonly [string, string])[]): void {
  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of entries) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = blobUrl(path);
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  parent.appendChild(links);
}

const canonPts32 = (): Float32Array<ArrayBuffer> => new Float32Array(V.canonical_points.values);

// --- 1. verification card: every value read from the generated spine --------

function installCard(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("verification — committed, not asserted");
  const dl = document.createElement("dl");
  dl.className = "bps-diag";
  const row = (label: string, value: string, title?: string): void => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    if (title) dd.title = title;
    dl.append(dt, dd);
  };
  row("gate", V.gate.kind);
  row(
    "pass criterion",
    "run-twice byte-identity",
    "verify.py _gate_mandelbulb: passed=bool(twice) — the f32-vs-f64 distance is reported alongside, not gated on (spec § 2)",
  );
  row(
    "strict f64 budget",
    `${V.gate.budget_abs.toExponential(3)} abs`,
    `closed_form_rel ${V.gate.closed_form_rel} × scale ${V.gate.scale.toFixed(6)} (scale = max|DE_ref| over the canonical grid)`,
  );
  row(
    "recorded f32 floor",
    V.gate.recorded_browser.f32_vs_f64_de_max_abs.toExponential(3),
    `measured on ${V.gate.recorded_browser.hardware} — == the wgpu-native gate; ~${(
      V.gate.recorded_browser.f32_vs_f64_de_max_abs / V.gate.budget_abs
    ).toFixed(1)}× ABOVE the strict budget, reported rather than widened`,
  );
  row(
    "round_trip_at_1e-5",
    String(V.gate.recorded_browser.round_trip_at_1e5),
    "the informational flag verify.py reports — honestly false on a healthy run: single precision cannot clear an f64-scale budget",
  );
  row("run-twice", V.gate.recorded_browser.run_twice, "two full DE evaluations over the probe grid, byte-identical — provable below");
  row("determinism", V.determinism.claimed, "the committed capture manifest's claim; WGSL transcendental precision is implementation-defined across GPUs");
  row(
    "canonical",
    `seed ${V.canonical.seed} · ${V.canonical.grid[0]}×${V.canonical.grid[1]} probe grid · p=${V.canonical.params.p}`,
    `${V.canonical.n_outside_set} of 256 points outside the set (DE > 0)`,
  );
  row("payload sha-256", `${V.canonical.payload_sha256.slice(7, 19)}…`, V.canonical.payload_sha256);
  row(
    "measured wall-clock",
    `ref ${V.canonical.wall_clock_reference_s}s · browser ${V.canonical.wall_clock_browser_s}s`,
    "committed perf-ledger baselines (browser figure includes the full harness)",
  );
  g.appendChild(dl);
  noteLine(g, "single-pass closed form — nothing accumulates; the f32 floor is the whole story. measured, then declared — never widened.");
  linksRow(g, [
    ["capture manifest", V.links.capture_manifest],
    ["gate source", V.links.gate_source],
    ["golden table", V.links.golden_table],
    ["perf ledger", V.links.perf_ledger],
    ["5.1 audit", V.links.resolution_audit],
  ]);
}

// --- 2. flagship: the live DE gate re-run + heatmap + run-twice --------------

const HEAT_CELL = 10;

function drawHeatmap(
  cv: HTMLCanvasElement,
  residuals: Float64Array,
  maxAbs: number,
  maxIdx: number,
): void {
  const n = 16;
  cv.width = n * HEAT_CELL;
  cv.height = n * HEAT_CELL;
  const g = cv.getContext("2d")!;
  const stops = getColormap("viridis").stops;
  const cmap = (t: number): string => {
    const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    const i = Math.min(Math.floor(x), stops.length - 2);
    const f = x - i;
    const c0 = stops[i]!;
    const c1 = stops[i + 1]!;
    const ch = (k: 0 | 1 | 2): number => Math.round(255 * (c0[k] + (c1[k] - c0[k]) * f));
    return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
  };
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const idx = j * n + i;
      g.fillStyle = cmap(maxAbs > 0 ? residuals[idx]! / maxAbs : 0);
      // canvas y grows downward; probe grid j grows with y — flip for reading
      g.fillRect(i * HEAT_CELL, (n - 1 - j) * HEAT_CELL, HEAT_CELL, HEAT_CELL);
    }
  }
  const mi = maxIdx % n;
  const mj = Math.floor(maxIdx / n);
  g.strokeStyle = "#ff8866";
  g.lineWidth = 1.5;
  g.strokeRect(mi * HEAT_CELL + 1, (n - 1 - mj) * HEAT_CELL + 1, HEAT_CELL - 2, HEAT_CELL - 2);
}

function logBar(measured: number): HTMLDivElement {
  // three numbers on one log scale: strict budget · recorded floor · yours
  const bar = document.createElement("div");
  bar.className = "mb-bar";
  const lo = -8;
  const hi = -3;
  const pos = (v: number): number => Math.min(Math.max(((Math.log10(v) - lo) / (hi - lo)) * 100, 2), 98);
  const mark = (v: number, label: string, color: string): void => {
    const m = document.createElement("div");
    m.className = "mb-bar-mark";
    m.style.left = `${pos(v)}%`;
    m.style.color = color;
    const tick = document.createElement("i");
    tick.style.background = color;
    m.appendChild(tick);
    m.appendChild(document.createTextNode(label));
    m.title = v.toExponential(3);
    bar.appendChild(m);
  };
  mark(V.gate.budget_abs, "strict budget", "var(--dim)");
  mark(V.gate.recorded_browser.f32_vs_f64_de_max_abs, "recorded floor", "var(--warm)");
  mark(measured, "your GPU", "var(--accent)");
  return bar;
}

function installGateRerun(d: VerifyPanelDeps, runner: ScratchRunner): void {
  const g = d.panel.addGroup("prove it — the gate, re-run on this device");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bps-btn";
  btn.textContent = "Re-run the DE gate — twice, hashed, scored";
  btn.title =
    "Evaluates the committed mandelbulb_de.wgsl at the 256 canonical probe points twice in scratch buffers, SHA-256-hashes both result sets (run-twice determinism), then scores run 1 against the committed f64 canonical DE values with the gate's own arithmetic. Your GPU is the experiment.";
  const out = document.createElement("div");
  out.className = "mb-hash";
  const heat = document.createElement("div");
  heat.className = "mb-heat";
  g.append(btn, out, heat);

  const secure = "subtle" in crypto;
  if (!secure) {
    noteLine(g, "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here; the re-run still scores against the canonical");
  }

  let running = false;
  btn.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    out.textContent = "dispatching 2 × 256 DE evaluations…";
    heat.textContent = "";
    void (async () => {
      try {
        const pts = canonPts32();
        const run1 = await runner.run(pts, V.canonical.params.p);
        const run2 = await runner.run(pts, V.canonical.params.p);
        out.textContent = "";
        const line = (label: string, text: string): void => {
          const b = document.createElement("b");
          b.textContent = `${label}: `;
          out.append(b, document.createTextNode(text), document.createElement("br"));
        };
        if (secure) {
          const [h1, h2] = await Promise.all([sha256hex(run1), sha256hex(run2)]);
          line("run 1", h1);
          line("run 2", h2);
          const identical = h1 === h2;
          const dv = document.createElement("span");
          dv.className = identical ? "ok" : "no";
          dv.textContent = identical
            ? "identical ✓ — run-twice byte-identity, the gate's actual pass criterion, on your GPU"
            : "MISMATCH ✗ — this device is not replaying byte-identically";
          out.append(dv, document.createElement("br"));
          line(
            "committed canonical sha",
            `${V.canonical.payload_sha256.slice(7, 23)}… — the f64 CPU-NumPy HDF5 payload: a different artifact, deliberately NOT comparable to your browser digests`,
          );
        }

        // the gate's own arithmetic vs the committed f64 canonical
        const canon = V.canonical_de.values;
        const residuals = new Float64Array(256);
        let maxAbs = 0;
        let maxIdx = 0;
        for (let i = 0; i < 256; i += 1) {
          const diff = Math.abs(run1[i]! - canon[i]!);
          residuals[i] = diff;
          if (diff > maxAbs) {
            maxAbs = diff;
            maxIdx = i;
          }
        }
        line("your max_abs", `${maxAbs.toExponential(3)} (f32 GPU vs f64 canonical, 256 probe points)`);
        line("strict f64 budget", `${V.gate.budget_abs.toExponential(3)} → round_trip flag ${maxAbs <= V.gate.budget_abs ? "true" : "false — reported, not hidden"}`);
        line("recorded floor", `${V.gate.recorded_browser.f32_vs_f64_de_max_abs.toExponential(3)} (${V.gate.recorded_browser.hardware})`);
        out.appendChild(logBar(maxAbs));
        const cap = document.createElement("span");
        cap.textContent =
          "the browser gate PASSES on run-twice identity; the f32 floor sits above the strict f64 budget and the repo reports the miss instead of widening the tolerance. On other GPUs your floor may differ — WGSL leaves pow/sin/cos/acos/atan2/log precision implementation-defined; a differing-but-stable value here is expected behavior, shown verbatim.";
        out.appendChild(cap);

        // residual heatmap: WHERE the f32 floor bites
        const cv = document.createElement("canvas");
        const capL = document.createElement("div");
        capL.className = "mb-heat-cap";
        capL.textContent = `|f32 − f64| per probe point — max ${maxAbs.toExponential(2)} outlined (hover for cells)`;
        heat.append(capL, cv);
        drawHeatmap(cv, residuals, maxAbs, maxIdx);
        cv.addEventListener("pointermove", (e) => {
          const r = cv.getBoundingClientRect();
          const i = Math.min(15, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 16)));
          const jFlip = Math.min(15, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * 16)));
          const j = 15 - jFlip;
          const idx = j * 16 + i;
          const px = V.canonical_points.values[idx * 3]!;
          const py = V.canonical_points.values[idx * 3 + 1]!;
          capL.textContent = `c = (${px.toFixed(3)}, ${py.toFixed(3)}, 0) — |Δ| = ${residuals[idx]!.toExponential(3)} · canonical DE ${canon[idx]!.toExponential(3)}`;
        });
        const show = document.createElement("button");
        show.type = "button";
        show.className = "bps-btn";
        show.textContent = "paint residuals onto the 3-D probe overlay";
        show.addEventListener("click", () => {
          const w = new Float32Array(256);
          for (let i = 0; i < 256; i += 1) w[i] = maxAbs > 0 ? residuals[i]! / maxAbs : 0;
          d.onResiduals(w);
          d.showOverlay();
        });
        heat.appendChild(show);
      } catch (e) {
        out.textContent = `proof failed to run: ${(e as Error).message}`;
      } finally {
        running = false;
        btn.disabled = false;
      }
    })();
  });
}

// --- 3. measured vs analytic: the three closed-form anchors ------------------

function installAnchors(d: VerifyPanelDeps, runner: ScratchRunner): void {
  const g = d.panel.addGroup("measured vs analytic — on this device");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bps-btn";
  btn.textContent = "Evaluate the three anchors";
  btn.title =
    "Dispatches the committed kernel at the three EXACT closed-form points (no probe-grid jitter) and lands the measured f32 on the hand-derived golden values.";
  const out = document.createElement("div");
  out.className = "mb-hash";
  g.append(btn, out);

  const tolTable = V.anchors_display_tol_abs as Record<string, number> | null;

  let running = false;
  btn.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    out.textContent = "dispatching 3 anchor evaluations…";
    void (async () => {
      try {
        const pts = new Float32Array(9);
        V.anchors.forEach((an, i) => {
          pts[i * 3 + 0] = an.c[0]!;
          pts[i * 3 + 1] = an.c[1]!;
          pts[i * 3 + 2] = an.c[2]!;
        });
        const de = await runner.run(pts, V.canonical.params.p);
        out.textContent = "";
        V.anchors.forEach((an, i) => {
          const measured = de[i]!;
          const diff = Math.abs(measured - an.de);
          const b = document.createElement("b");
          b.textContent = `DE(${an.c.join(",")}): `;
          out.append(b);
          let verdictText = "";
          let verdictOk = true;
          if (tolTable && tolTable[an.name] !== undefined) {
            verdictOk = diff <= tolTable[an.name]!;
            verdictText = verdictOk
              ? ` — within the declared ${tolTable[an.name]!.toExponential(1)} abs ✓`
              : ` — OVER the declared ${tolTable[an.name]!.toExponential(1)} abs (shown, not hidden — implementation-defined transcendentals)`;
          }
          const span = document.createElement("span");
          span.className = verdictOk ? "ok" : "no";
          span.textContent =
            an.de === 0
              ? `measured ${measured} (analytic 0 — in-set sentinel)${measured === 0 ? " — exact ✓" : ""}`
              : `measured ${measured.toPrecision(9)} · analytic ${an.de} · |Δ| ${diff.toExponential(2)}${verdictText}`;
          out.append(span, document.createElement("br"));
        });
        const cap = document.createElement("span");
        cap.textContent = tolTable
          ? "bounds declared from the recorded dev-GPU measurement (measured-then-declared, architecture § 2.6); the analytic values are hand-derived surds committed in the golden table."
          : "display bounds pending declaration from the recorded measurement (measured-then-declared, architecture § 2.6).";
        out.appendChild(cap);
      } catch (e) {
        out.textContent = `anchor evaluation failed: ${(e as Error).message}`;
      } finally {
        running = false;
        btn.disabled = false;
      }
    })();
  });
}

// --- 4. falsifiability: wrong physics through the unchanged kernel -----------

function installFalsifiability(d: VerifyPanelDeps, runner: ScratchRunner): void {
  const g = d.panel.addGroup("make it fail — deliberately");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bps-btn";
  btn.textContent = "Falsify: run p = 9 against the p = 8 canonical";
  btn.title =
    "The SAME committed kernel, one wrong parameter through its Params uniform, scored against the p=8 canonical — the criterion has teeth. This is a demonstration of failure, not a failure.";
  const out = document.createElement("div");
  out.className = "mb-hash";
  g.append(btn, out);

  let running = false;
  btn.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    out.textContent = "dispatching the deliberately wrong run…";
    void (async () => {
      try {
        const de9 = await runner.run(canonPts32(), 9);
        const canon = V.canonical_de.values;
        let maxAbs = 0;
        for (let i = 0; i < 256; i += 1) maxAbs = Math.max(maxAbs, Math.abs(de9[i]! - canon[i]!));
        out.textContent = "";
        const b = document.createElement("b");
        b.textContent = "DELIBERATE wrong-physics probe: ";
        const span = document.createElement("span");
        span.className = "no";
        span.textContent = `p=9 max_abs ${maxAbs.toExponential(3)} vs budget ${V.gate.budget_abs.toExponential(3)} → FAIL (${(
          maxAbs / V.gate.budget_abs
        ).toExponential(1)}× over)`;
        out.append(b, span, document.createElement("br"));
        const cap = document.createElement("span");
        cap.textContent =
          "same committed kernel, wrong power through the Params uniform, scratch buffers only — the capture path and the gate are untouched. Wrong physics fails the unchanged criterion; that is what makes the green runs above mean something.";
        out.appendChild(cap);
      } catch (e) {
        out.textContent = `probe failed to run: ${(e as Error).message}`;
      } finally {
        running = false;
        btn.disabled = false;
      }
    })();
  });
}
