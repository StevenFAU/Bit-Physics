// PROVE layer (verification-demo-spec § 3.3): verification bound to real data.
//
// Two parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — committed tolerances,
//      layered determinism claims, canonical provenance, measured wall-clocks,
//      audit links. No retyped constants.
//   2. The live "run it twice" proof: the canonical integration is dispatched
//      TWICE into scratch buffers (never traj/liveTraj), each trajectory's
//      raw bytes SHA-256-hashed via crypto.subtle, alongside a hash of the
//      boot-time canonical buffer — three independent integrations, one hash.
//      A chaotic system, replayed bit-for-bit: determinism as a feature,
//      demonstrated on the visitor's own GPU.
//
// The scratch runs reuse the boot paramBuf (canonical params, written once,
// never rewritten) and the committed compute pipeline. Nothing here touches
// the capture path or the live display buffers.

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface VerifyPanelDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  computePipeline: GPUComputePipeline;
  computeBGL: GPUBindGroupLayout;
  /** Canonical params uniform — written once at boot, never after. */
  paramBuf: GPUBuffer;
  trajBytes: number;
  /** Readback of the boot-time canonical trajectory buffer. */
  readCanonical: () => Promise<Float32Array<ArrayBuffer>>;
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

async function sha256hex(data: Float32Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function installVerifyPanel(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("verification — committed, not asserted");

  // --- card: every value read from the generated spine ---------------------
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
    "envelope tolerance",
    `rel ${V.gate.tolerances.strange_minmaxstd_rel} · abs ${V.gate.tolerances.strange_mean_abs}`,
    "per-axis attractor-envelope margin — established thresholds, never widened",
  );
  row("determinism (ref stack)", V.determinism.reference_claimed, "the f64 reference capture's committed claim");
  row(
    "determinism (browser)",
    `run-twice ${V.determinism.run_twice}`,
    `pointwise vs the f64 canonical the browser f32 build is ${V.determinism.browser_claimed}-class — which is WHY the gate is structural, not pointwise`,
  );
  row("canonical run", `seed ${V.canonical.seed} · ${V.canonical.step_count} steps`);
  row(
    "payload sha-256",
    `${V.canonical.payload_sha256.slice(7, 19)}…`,
    V.canonical.payload_sha256,
  );
  row(
    "measured wall-clock",
    `ref ${V.canonical.wall_clock_reference_s}s · browser ${V.canonical.wall_clock_browser_s}s`,
    "committed perf-ledger baselines (browser figure includes the full harness)",
  );
  g.appendChild(dl);

  const note = document.createElement("div");
  note.className = "lz-note-line";
  note.textContent = "measured, then declared — never widened.";
  g.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["landing audit", V.links.audit],
    ["determinism.md", V.links.determinism],
    ["perf ledger", V.links.perf_ledger],
    ["gate source", "tools/productization/web-deploy/verify.py"],
  ] as const) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = blobUrl(path);
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  g.appendChild(links);

  // --- the live proof -------------------------------------------------------
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bps-btn";
  btn.textContent = "Run it twice — prove determinism";
  btn.title =
    "Integrates the canonical trajectory twice more into scratch buffers on your GPU and SHA-256-hashes each — plus the boot run. Chaotic, and byte-identical.";
  const out = document.createElement("div");
  out.className = "lz-hash";
  g.append(btn, out);

  if (!("subtle" in crypto)) {
    // crypto.subtle needs a secure context (https / localhost) — say so
    // plainly instead of offering a broken button
    btn.disabled = true;
    out.textContent = "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here";
    return;
  }

  let running = false;
  btn.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    out.textContent = "integrating twice + hashing…";
    void (async () => {
      try {
        const hashes: string[] = [];
        for (let k = 0; k < 2; k += 1) {
          const scratch = d.device.createBuffer({
            size: d.trajBytes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
          });
          const bg = d.device.createBindGroup({
            layout: d.computeBGL,
            entries: [
              { binding: 0, resource: { buffer: d.paramBuf } },
              { binding: 1, resource: { buffer: scratch } },
            ],
          });
          const enc = d.device.createCommandEncoder();
          const pass = enc.beginComputePass();
          pass.setPipeline(d.computePipeline);
          pass.setBindGroup(0, bg);
          pass.dispatchWorkgroups(1);
          pass.end();
          const rb = d.device.createBuffer({
            size: d.trajBytes,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          });
          enc.copyBufferToBuffer(scratch, 0, rb, 0, d.trajBytes);
          d.queue.submit([enc.finish()]);
          await rb.mapAsync(GPUMapMode.READ);
          const data = new Float32Array(rb.getMappedRange().slice(0));
          rb.unmap();
          rb.destroy();
          scratch.destroy();
          hashes.push(await sha256hex(data));
        }
        const bootHash = await sha256hex(await d.readCanonical());
        const identical = hashes[0] === hashes[1] && hashes[1] === bootHash;
        out.textContent = "";
        const addLine = (label: string, hex: string): void => {
          const b = document.createElement("b");
          b.textContent = `${label}: `;
          out.append(b, document.createTextNode(hex), document.createElement("br"));
        };
        addLine("run 1", hashes[0]!);
        addLine("run 2", hashes[1]!);
        addLine("boot run", bootHash);
        const verdict = document.createElement("span");
        verdict.className = identical ? "ok" : "no";
        verdict.textContent = identical
          ? `identical ✓ — three integrations, one hash (${d.trajBytes.toLocaleString()} bytes each)`
          : "MISMATCH ✗ — this device is not replaying byte-identically";
        out.appendChild(verdict);
      } catch (e) {
        out.textContent = `proof failed to run: ${(e as Error).message}`;
      } finally {
        running = false;
        btn.disabled = false;
      }
    })();
  });
}
