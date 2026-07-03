// PROVE layer (verification-demo-spec § 3.3): verification bound to real data.
//
// Three parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — declared tolerance, banked
//      measurement, determinism claims, canonical provenance, audit links.
//      No retyped constants.
//   2. The live proof: the canonical seed-42 run is dispatched TWICE into
//      scratch buffers (never the live state double-buffer), each final
//      U/V field SHA-256-hashed via crypto.subtle (run-twice determinism),
//      and then compared against the COMMITTED f64 canonical final frame
//      (public/rd2d-canonical-step2000.bin, sha-pinned by the build) using
//      the gate's own criterion — max_abs_err ≤ absolute + relative·max|field|
//      — computed client-side on the visitor's GPU. Whatever it measures is
//      displayed verbatim; on non-RADV hardware this is a genuinely new data
//      point, and an over-budget result is shown, not hidden.
//   3. The divergence post-mortem: the committed honesty arc (measured 0.074 →
//      tolerance NOT widened → hypothesis refuted → harness-race fix →
//      2.64e-5 — with the contingency gate left dormant and undeclared).
//
// The scratch runs reuse the committed compute pipeline with canonical params
// written by main.ts's own canonical writer. Nothing here touches the capture
// path or the live display state.

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface VerifyPanelDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  computePipeline: GPUComputePipeline;
  computeBGL: GPUBindGroupLayout;
  /** Grid side (128). */
  n: number;
  /** Interleaved f32 state bytes (n·n·2·4). */
  bufBytes: number;
  /** The committed seed-42 IC asset, fetched fresh (never the live buffer). */
  fetchCanonicalIC: () => Promise<Float32Array<ArrayBuffer>>;
  /** Write the canonical params (verbatim PARAMS) into a uniform buffer. */
  writeCanonicalParams: (buf: GPUBuffer) => void;
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

async function sha256hex(data: Float32Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface FieldDiff {
  maxAbs: number;
  maxRel: number;
  threshold: number;
  pass: boolean;
}

/** The gate criterion, verbatim from equivalence.harness.compare_captures. */
function diffField(run: Float32Array, canon: Float64Array, channel: number): FieldDiff {
  const cells = canon.length;
  let maxAbs = 0;
  let maxRel = 0;
  let scale = 0;
  for (let c = 0; c < cells; c += 1) {
    const a = canon[c]!; // left: the f64 canonical
    const b = run[c * 2 + channel]!; // right: this device's run
    const diff = Math.abs(a - b);
    if (diff > maxAbs) maxAbs = diff;
    const denom = Math.max(Math.abs(a), Math.abs(b));
    if (denom > 0 && diff / denom > maxRel) maxRel = diff / denom;
    const ab = Math.abs(b); // harness scale: max|right| over the field
    if (ab > scale) scale = ab;
  }
  const threshold = V.gate.declared.absolute + V.gate.declared.relative * scale;
  return { maxAbs, maxRel, threshold, pass: maxAbs <= threshold };
}

export function installVerifyPanel(d: VerifyPanelDeps): void {
  installCard(d);
  installProof(d);
  installPostmortem(d);
}

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
    "declared tolerance",
    `rel ${V.gate.declared.relative} · abs ${V.gate.declared.absolute}`,
    `criterion: ${V.gate.criterion} — established at Stack-D Stage 1c, never widened`,
  );
  row(
    "measured (RADV)",
    V.gate.measured_max_abs.toExponential(3),
    "max_abs vs the f64 canonical after the harness-race fix — bit-identical to the wgpu-native result on the same GPU",
  );
  row("run-twice", V.gate.run_twice, "two full browser runs, byte-identical final fields — provable below");
  row("determinism (ref stack)", V.determinism.reference_claimed, "the f64 reference capture's committed claim");
  row(
    "determinism (browser)",
    V.determinism.browser_claimed,
    "f32 vs the f64 canonical is epsilon-class by construction; per-device it replays byte-identically",
  );
  row(
    "canonical run",
    `seed ${V.canonical.seed} · ${V.canonical.grid[0]}² · ${V.canonical.step_count} steps @ ${V.canonical.capture_interval}`,
  );
  row("payload sha-256", `${V.canonical.payload_sha256.slice(7, 19)}…`, V.canonical.payload_sha256);
  row(
    "measured wall-clock",
    `ref ${V.canonical.wall_clock_reference_s}s · browser ${V.canonical.wall_clock_browser_s}s`,
    "committed perf-ledger baselines (browser figure includes the full harness)",
  );
  g.appendChild(dl);

  // cross-surface strip: one kernel, five surfaces (spec § 3.3)
  const strip = document.createElement("div");
  strip.className = "rd-note-line";
  strip.textContent = `one kernel, five surfaces: ${V.surfaces.stacks.join(" · ")} · ${V.surfaces.native_binary}`;
  strip.title =
    "committed perf-ledger baselines for the same Gray-Scott kernel across four stacks plus a validated native binary; the vulkan-cpp port is full-horizon BIT-EXACT vs the NumPy reference (gate-14 max_abs 0.0)";
  g.appendChild(strip);

  const note = document.createElement("div");
  note.className = "rd-note-line";
  note.textContent = "measured, then declared — never widened.";
  g.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["capture manifest", V.links.capture_manifest],
    ["determinism.md", V.links.determinism],
    ["tolerance table", V.links.tolerance_table],
    ["gate source", V.links.gate_source],
    ["perf ledger", V.links.perf_ledger],
  ] as const) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = blobUrl(path);
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  g.appendChild(links);
}

// --- 2. the live proof: run twice + the gate criterion, on THIS device ------

function installProof(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("prove it — on this device");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bps-btn";
  btn.textContent = "Run the canonical run twice — hash it, gate it";
  btn.title =
    "Reloads the committed seed-42 IC, steps the committed kernel 2000 steps twice into scratch buffers, SHA-256-hashes each final field, then scores run 1 against the committed f64 canonical with the gate's own criterion. Your GPU is the experiment.";
  const out = document.createElement("div");
  out.className = "rd-hash";
  g.append(btn, out);

  if (!("subtle" in crypto)) {
    // crypto.subtle needs a secure context (https / localhost) — say so
    // plainly instead of offering a broken button
    btn.disabled = true;
    out.textContent = "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here";
    return;
  }

  const cells = d.n * d.n;

  async function runCanonicalScratch(paramBuf: GPUBuffer, ic: Float32Array<ArrayBuffer>): Promise<Float32Array<ArrayBuffer>> {
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const a = d.device.createBuffer({ size: d.bufBytes, usage, label: "rd2d-proof-a" });
    const b = d.device.createBuffer({ size: d.bufBytes, usage, label: "rd2d-proof-b" });
    d.queue.writeBuffer(a, 0, ic);
    const bind = (src: GPUBuffer, dst: GPUBuffer): GPUBindGroup =>
      d.device.createBindGroup({
        layout: d.computeBGL,
        entries: [
          { binding: 0, resource: { buffer: paramBuf } },
          { binding: 1, resource: { buffer: src } },
          { binding: 2, resource: { buffer: dst } },
        ],
      });
    const ab = bind(a, b);
    const ba = bind(b, a);
    const wg = Math.ceil(d.n / 8);
    const CHUNK = 500;
    for (let s = 0; s < V.canonical.step_count; s += CHUNK) {
      const enc = d.device.createCommandEncoder();
      const pass = enc.beginComputePass();
      pass.setPipeline(d.computePipeline);
      for (let k = s; k < Math.min(s + CHUNK, V.canonical.step_count); k += 1) {
        pass.setBindGroup(0, k % 2 === 0 ? ab : ba);
        pass.dispatchWorkgroups(wg, wg, 1);
      }
      pass.end();
      d.queue.submit([enc.finish()]);
    }
    // 2000 steps: even count ⇒ the final write landed back in `a`
    const rb = d.device.createBuffer({ size: d.bufBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = d.device.createCommandEncoder();
    enc.copyBufferToBuffer(V.canonical.step_count % 2 === 0 ? a : b, 0, rb, 0, d.bufBytes);
    d.queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const final = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    a.destroy();
    b.destroy();
    return final;
  }

  async function fetchCanonicalFields(): Promise<{ U: Float64Array; V: Float64Array }> {
    const res = await fetch(`${import.meta.env.BASE_URL}${V.canonical_final_fields.asset}`);
    if (!res.ok) throw new Error(`canonical-fields asset fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== V.canonical_final_fields.bytes) {
      throw new Error(`canonical-fields asset is ${buf.byteLength} bytes, want ${V.canonical_final_fields.bytes}`);
    }
    const sha = await crypto.subtle.digest("SHA-256", buf);
    const hex = [...new Uint8Array(sha)].map((x) => x.toString(16).padStart(2, "0")).join("");
    if (hex !== V.canonical_final_fields.sha256) {
      throw new Error("canonical-fields asset sha mismatch — refusing to gate against unverified bytes");
    }
    return {
      U: new Float64Array(buf, 0, cells),
      V: new Float64Array(buf, cells * 8, cells),
    };
  }

  let running = false;
  btn.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    out.textContent = "stepping 2 × 2000 canonical steps + hashing…";
    void (async () => {
      try {
        const paramBuf = d.device.createBuffer({
          size: 32,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          label: "rd2d-proof-params",
        });
        d.writeCanonicalParams(paramBuf);
        const ic = await d.fetchCanonicalIC();
        const run1 = await runCanonicalScratch(paramBuf, ic);
        const run2 = await runCanonicalScratch(paramBuf, ic);
        paramBuf.destroy();
        const [h1, h2] = await Promise.all([sha256hex(run1), sha256hex(run2)]);
        out.textContent = "";
        const line = (label: string, text: string): void => {
          const b = document.createElement("b");
          b.textContent = `${label}: `;
          out.append(b, document.createTextNode(text), document.createElement("br"));
        };
        line("run 1", h1);
        line("run 2", h2);
        const identical = h1 === h2;
        const dv = document.createElement("span");
        dv.className = identical ? "ok" : "no";
        dv.textContent = identical
          ? `identical ✓ — two full runs, one hash (${d.bufBytes.toLocaleString()} bytes each)`
          : "MISMATCH ✗ — this device is not replaying byte-identically";
        out.append(dv, document.createElement("br"));

        // the gate criterion, on this hardware, against the committed f64 canonical
        out.appendChild(document.createTextNode("gating run 1 against the committed f64 canonical…"));
        const canon = await fetchCanonicalFields();
        const dU = diffField(run1, canon.U, 0);
        const dV = diffField(run1, canon.V, 1);
        out.removeChild(out.lastChild!);
        line(
          "U max_abs",
          `${dU.maxAbs.toExponential(3)} vs threshold ${dU.threshold.toExponential(3)} → ${dU.pass ? "within" : "OVER"}`,
        );
        line(
          "V max_abs",
          `${dV.maxAbs.toExponential(3)} vs threshold ${dV.threshold.toExponential(3)} → ${dV.pass ? "within" : "OVER"}`,
        );
        line("banked RADV measurement", V.gate.measured_max_abs.toExponential(3));
        const pass = dU.pass && dV.pass;
        const gv = document.createElement("span");
        gv.className = pass ? "ok" : "no";
        gv.textContent = pass
          ? "within the declared budget on your GPU ✓ — the final captured frame, scored with the gate's own criterion"
          : "OVER the declared budget on your GPU — displayed, not hidden: you may be looking at a backend family this repo has not yet measured (see the post-mortem below)";
        out.appendChild(gv);
        const cap = document.createElement("div");
        cap.className = "rd-note-line";
        cap.textContent =
          "final-frame criterion (the most divergence-prone of the 11 captured frames), not the full compare_captures sweep — the CI gate runs all 11.";
        out.appendChild(cap);
      } catch (e) {
        out.textContent = `proof failed to run: ${(e as Error).message}`;
      } finally {
        running = false;
        btn.disabled = false;
      }
    })();
  });
}

// --- 3. the divergence post-mortem: the committed honesty arc ---------------

function installPostmortem(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("the 0.074 that wasn't — a post-mortem");
  const pm = V.postmortem;
  const ol = document.createElement("ol");
  ol.className = "rd-timeline";
  const item = (head: string, text: string): void => {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = head;
    li.append(b, document.createTextNode(` ${text}`));
    ol.appendChild(li);
  };
  item(
    "measured, logged.",
    `The 5.1 web-deploy gate found the browser diverging from the f64 canonical: step-200 max_abs ~${pm.prefix_step200_max_abs.toExponential(0)}, ` +
      `${pm.prefix_step2000_max_abs} by step 2000 — while staying run-twice byte-identical. The perf-ledger row was written down and is retained unedited.`,
  );
  item(
    "not widened.",
    `tolerance.toml stayed byte-unchanged through the whole episode (sha-pinned in both audits). tolerance_widened: ${String(pm.tolerance_widened)}.`,
  );
  item(
    "diagnosed — hypothesis refuted.",
    `The charter's “cross-backend f32” hypothesis did not survive measurement: the root cause was a ${pm.root_cause.split(" — ")[0]!}. ` +
      "The capture loop and the live RAF loop were interleaving on shared GPU state.",
  );
  item(
    "fixed, everywhere.",
    `A shared capture/live-loop mutual-exclusion lock landed across all 7 web demos. Post-fix this sim measures max_abs ${pm.postfix_max_abs.toExponential(3)} ` +
      "vs the f64 canonical — bit-identical to the wgpu-native result on the same GPU.",
  );
  item(
    "contingency, undeclared.",
    `A structural fallback gate for a genuinely divergent backend exists (short horizon ≤ step ${pm.contingency.short_horizon_max_step}, ` +
      `field bound ${pm.contingency.field_bound}) but is ${pm.contingency.status}; its round-1 numeric bounds are ${pm.contingency.bounds} ` +
      "until a real third-backend measurement pass exists.",
  );
  g.appendChild(ol);

  const note = document.createElement("div");
  note.className = "rd-note-line";
  note.textContent = "the discipline caught its own harness bug instead of laundering it into a tolerance.";
  g.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["charter audit", pm.audits.charter],
    ["resolution audit", pm.audits.resolution],
    ["pre-fix ledger row", pm.perf_ledger_prefix_row],
  ] as const) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = blobUrl(path);
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  g.appendChild(links);
}
