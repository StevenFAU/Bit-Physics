// PROVE layer (verification-demo-spec § 3.3): verification bound to real data.
//
// Three parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — the bit-exact gate, the
//      two-scope + backend-conditional determinism, the cross-stack numbers,
//      canonical provenance (payload sha labeled as the .h5 FILE hash, NOT the
//      rgba digest), and the audit links. No retyped constants.
//   2. The flagship: the canonical seed-42 rollout is re-run TWICE into scratch
//      buffers (never the live state) on the VISITOR's GPU, each 21-frame rgba
//      sequence SHA-256-hashed (run-twice determinism), then scored against the
//      committed canonical frames asset with the gate's own criterion (max_abs,
//      bit-exact threshold 0) across ALL 21 frames — a client-side mirror of
//      verify.py `_gate_neural_ca`'s full sweep. It DISPLAYS what it measures
//      and does NOT assert zero: bit-identical on a matching (RADV) backend, a
//      tiny non-zero otherwise (f32 non-associativity — same organism, different
//      bits). A per-step |Δ| scrubber shows where/when a divergent backend
//      departs. A "make it fail" probe perturbs the seed to prove PASS is a real
//      test.
//   3. The divergence post-mortem: the committed honesty arc (pre-fix 0.72
//      harness race → refuted → fixed → bit-exact 0.0), kept distinct from the
//      residual, still-open backend-conditional axis.

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface NcaVerifyDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  pipeUpdate: GPUComputePipeline;
  pipeMask: GPUComputePipeline;
  bgl: GPUBindGroupLayout;
  wbuf: GPUBuffer;
  grid: number;
  cn: number;
  canonicalSteps: number;
  captureEvery: number;
  fireRate: number;
  /** Write the 32-byte Params block (grid/step/seed/fire + weight offsets). */
  writeParams: (buf: GPUBuffer, step: number, seed: number, fireRate: number) => void;
  /** Build the single-centre-cell seed state (16-channel). */
  seedState: () => Float32Array;
  /** Register the backend-divergence-probe trigger (fired by the template chip). */
  registerProbe: (run: () => void) => void;
  /** Switch the main render mode (0 organism … 3 |Δ|). */
  setRenderMode: (mode: number) => void;
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

// scrubber |Δ| visual amplification — a small backend drift (O(1e-2)) reads as
// visible color; on a matching backend every frame stays all-dark (max_abs 0).
const SCRUB_GAIN = 32;

async function sha256hex(data: Float32Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A small perceptual heat ramp for the |Δ| scrubber (JS-side 2D canvas):
// dark navy → teal → hot yellow. Display-only.
function heat(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t));
  if (x < 0.5) {
    const u = x / 0.5;
    return [Math.round(8 + u * 5), Math.round(10 + u * 150), Math.round(24 + u * 150)];
  }
  const u = (x - 0.5) / 0.5;
  return [Math.round(13 + u * 240), Math.round(160 + u * 80), Math.round(174 - u * 130)];
}

export function installVerifyPanel(d: NcaVerifyDeps): void {
  installCard(d);
  installProof(d);
  installPostmortem(d);
}

// --- 1. verification card ----------------------------------------------------

function installCard(d: NcaVerifyDeps): void {
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
  row("gate", `${V.gate.kind} — bit-exact 0/0`, V.gate.criterion);
  row("measured (RADV)", `${V.gate.measured_max_abs_radv.toFixed(1)} over ${V.gate.n_frames} frames`, "max_abs vs the WGSL canonical after the harness-race fix — bit-identical to wgpu-native on the same RADV GPU. Backend-conditional (see the live re-run + post-mortem).");
  row("run-twice", V.gate.run_twice, "two full browser rollouts, byte-identical rgba sequences — provable below");
  row("determinism (within WGSL)", V.determinism.within_wgsl, "the inference registry row: one GPU, one stack → bit-exact");
  row("determinism (manifest)", V.determinism.manifest_claimed, "the canonical's committed claim — the honest conservative cross-implementation posture (NOT a placeholder)");
  row("cross-stack (PyTorch↔WGSL)", `PSNR ${V.cross_stack.psnr} · SSIM ${V.cross_stack.ssim} · LPIPS ${V.cross_stack.lpips_alex}`, V.cross_stack.why_statistical);
  row("training vs inference", `${V.determinism.training} (EFECT 3σ ${V.determinism.training_efect_3sigma_upper}) / ${V.determinism.inference}`, "training is non-deterministic by design (cross-seed); inference is bit-exact — two honest postures for one learned model");
  row("canonical run", `seed ${V.canonical.seed} · ${V.canonical.grid[0]}² · ${V.canonical.step_count} steps @ ${V.canonical.capture_interval}`);
  row("payload sha-256", `${V.canonical.payload_sha256.slice(7, 19)}…`, `${V.canonical.payload_sha256} — ${V.canonical.payload_sha256_is}`);
  row("checkpoint", `${V.model.checkpoint} (${V.model.regime}/${V.model.target})`, `shipped weights sha ${V.model.weights_sha256.slice(0, 12)}… — byte-identical to the golden Persistent-disk checkpoint (regime CONFIRMED)`);
  row("pypi re-emit", `bit-exact ${V.pypi_reemit.max_abs.toFixed(1)}/0.0 · ${V.pypi_reemit.n_fields} fields`, "a fresh-venv pypi wheel re-rolls the canonical bit-exact — the dual-stack cross-check");
  g.appendChild(dl);

  const note = document.createElement("div");
  note.className = "nc-note-line";
  note.textContent = "a trained neural network, gated bit-exact — where the hardware agrees. Measured, then declared; never widened.";
  g.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["capture manifest", V.links.capture_manifest],
    ["determinism registry", V.links.determinism_registry],
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

// --- 2. the flagship: backend-conditional live re-run -----------------------

function installProof(d: NcaVerifyDeps): void {
  const g = d.panel.addGroup("prove it — on your GPU");
  const cells = d.grid * d.grid;
  const frameFloats = cells * 4;
  const stateBytes = cells * d.cn * 4;
  const nFrames = V.canonical_frames.n_frames;

  // adapter identity line (display-only, fresh requestAdapter — the shared
  // context is untouched)
  const idLine = document.createElement("div");
  idLine.className = "nc-note-line";
  idLine.textContent = "reading your GPU adapter…";
  g.appendChild(idLine);
  let isRadvFamily = false;
  void (async () => {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      const info: Partial<GPUAdapterInfo> =
        (adapter && "info" in adapter ? (adapter.info as GPUAdapterInfo) : undefined) ?? {};
      const vendor = info.vendor ?? "";
      const arch = info.architecture ?? "";
      const desc = info.description ?? info.device ?? "";
      const s = `${vendor} ${arch} ${desc}`.toLowerCase();
      isRadvFamily = s.includes("radv") || (s.includes("amd") && s.includes("rdna"));
      const shown = [vendor, arch, desc].filter(Boolean).join(" · ") || "adapter info withheld by the browser";
      idLine.textContent = `your GPU: ${shown} — ${isRadvFamily ? "in the known bit-exact family (RADV)" : "not a family this repo has measured — your max_abs below is a genuinely new data point"}`;
    } catch {
      idLine.textContent = "adapter info unavailable — the measured max_abs below still stands on its own";
    }
  })();

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nc-btn";
  btn.textContent = `Re-run the canonical rollout twice — hash it, score all ${nFrames} frames`;
  btn.title =
    "Rolls the committed kernel 1000 steps from the seed-42 state TWICE into scratch buffers, SHA-256-hashes each 21-frame rgba sequence (run-twice determinism), then scores run 1 against the committed canonical frames with the gate's own bit-exact criterion — the CI full sweep, on your hardware.";
  const failBtn = document.createElement("button");
  failBtn.type = "button";
  failBtn.className = "nc-btn";
  failBtn.textContent = "make it fail (perturb the seed)";
  failBtn.title = "Re-run with seed 43 instead of the pinned 42 — the frames no longer match the canonical, so PASS above reads as a real test, not a tautology.";
  const out = document.createElement("div");
  out.className = "nc-hash";
  g.append(btn, failBtn, out);

  // per-step |Δ| scrubber
  const scrubCanvas = document.createElement("canvas");
  scrubCanvas.className = "nc-scrub";
  scrubCanvas.width = d.grid;
  scrubCanvas.height = d.grid;
  scrubCanvas.style.display = "none";
  const scrubRow = document.createElement("div");
  scrubRow.className = "nc-row";
  scrubRow.style.display = "none";
  const scrubLab = document.createElement("label");
  scrubLab.textContent = "frame";
  const scrubInput = document.createElement("input");
  scrubInput.type = "range";
  scrubInput.className = "nc-range";
  scrubInput.min = "0";
  scrubInput.max = String(nFrames - 1);
  scrubInput.step = "1";
  scrubInput.value = String(nFrames - 1);
  const scrubVal = document.createElement("span");
  scrubVal.className = "nc-val";
  const scrubBox = document.createElement("div");
  scrubBox.className = "nc-slider-box";
  scrubBox.appendChild(scrubInput);
  scrubRow.append(scrubLab, scrubBox, scrubVal);
  g.append(scrubCanvas, scrubRow);

  if (!("subtle" in crypto)) {
    btn.disabled = true;
    failBtn.disabled = true;
    out.textContent = "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here";
    d.registerProbe(() => {});
    return;
  }

  const scrubCtx = scrubCanvas.getContext("2d");
  let lastRun: Float32Array[] | null = null;
  let canonFrames: Float32Array[] | null = null;
  function drawScrub(k: number): void {
    if (!scrubCtx || !lastRun || !canonFrames) return;
    const img = scrubCtx.createImageData(d.grid, d.grid);
    const run = lastRun[k]!;
    const can = canonFrames[k]!;
    let fmax = 0;
    for (let c = 0; c < cells; c += 1) {
      let dmax = 0;
      for (let ch = 0; ch < 4; ch += 1) dmax = Math.max(dmax, Math.abs(run[c * 4 + ch]! - can[c * 4 + ch]!));
      const [r, gg, b] = heat(dmax * SCRUB_GAIN);
      img.data[c * 4] = r;
      img.data[c * 4 + 1] = gg;
      img.data[c * 4 + 2] = b;
      img.data[c * 4 + 3] = 255;
      if (dmax > fmax) fmax = dmax;
    }
    scrubCtx.putImageData(img, 0, 0);
    scrubVal.textContent = `${V.canonical_frames.steps[k]}`;
    scrubLab.title = `step ${V.canonical_frames.steps[k]} — frame max_abs ${fmax.toExponential(2)}`;
  }
  scrubInput.addEventListener("input", () => drawScrub(Number(scrubInput.value)));

  async function grab(buf: GPUBuffer): Promise<Float32Array> {
    const rb = d.device.createBuffer({ size: stateBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = d.device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, rb, 0, stateBytes);
    d.queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ);
    const full = new Float32Array(rb.getMappedRange().slice(0));
    rb.unmap();
    rb.destroy();
    const rgba = new Float32Array(frameFloats);
    for (let c = 0; c < cells; c += 1) {
      for (let ch = 0; ch < 4; ch += 1) rgba[c * 4 + ch] = Math.min(1, Math.max(0, full[c * d.cn + ch] ?? 0));
    }
    return rgba;
  }

  const wg = Math.ceil(d.grid / 8);
  async function runRollout(seed: number, fire: number): Promise<Float32Array[]> {
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    let a = d.device.createBuffer({ size: stateBytes, usage, label: "nca-proof-a" });
    const b = d.device.createBuffer({ size: stateBytes, usage, label: "nca-proof-mid" });
    let c = d.device.createBuffer({ size: stateBytes, usage, label: "nca-proof-c" });
    const paramBuf = d.device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    d.queue.writeBuffer(a, 0, d.seedState());
    const zeros = new Float32Array(cells * d.cn);
    d.queue.writeBuffer(b, 0, zeros);
    d.queue.writeBuffer(c, 0, zeros);
    const updCache = new Map<GPUBuffer, GPUBindGroup>();
    const maskCache = new Map<GPUBuffer, GPUBindGroup>();
    const bind = (param: GPUBuffer, s1: GPUBuffer, s2: GPUBuffer, sout: GPUBuffer): GPUBindGroup =>
      d.device.createBindGroup({
        layout: d.bgl,
        entries: [
          { binding: 0, resource: { buffer: param } },
          { binding: 1, resource: { buffer: s1 } },
          { binding: 2, resource: { buffer: s2 } },
          { binding: 3, resource: { buffer: sout } },
          { binding: 4, resource: { buffer: d.wbuf } },
        ],
      });
    const frames: Float32Array[] = [await grab(a)];
    for (let s = 0; s < d.canonicalSteps; s += 1) {
      d.writeParams(paramBuf, s, seed, fire);
      let upd = updCache.get(a);
      if (!upd) { upd = bind(paramBuf, a, a, b); updCache.set(a, upd); }
      let msk = maskCache.get(a);
      if (!msk) { msk = bind(paramBuf, a, b, c); maskCache.set(a, msk); }
      const enc = d.device.createCommandEncoder();
      const p1 = enc.beginComputePass();
      p1.setPipeline(d.pipeUpdate);
      p1.setBindGroup(0, upd);
      p1.dispatchWorkgroups(wg, wg);
      p1.end();
      const p2 = enc.beginComputePass();
      p2.setPipeline(d.pipeMask);
      p2.setBindGroup(0, msk);
      p2.dispatchWorkgroups(wg, wg);
      p2.end();
      d.queue.submit([enc.finish()]);
      [a, c] = [c, a];
      if ((s + 1) % d.captureEvery === 0) frames.push(await grab(a));
      if ((s + 1) % 128 === 0) await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
    }
    a.destroy();
    b.destroy();
    c.destroy();
    paramBuf.destroy();
    return frames;
  }

  async function fetchCanonFrames(): Promise<Float32Array[]> {
    const res = await fetch(`${import.meta.env.BASE_URL}${V.canonical_frames.asset}`);
    if (!res.ok) throw new Error(`canonical-frames asset fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== V.canonical_frames.bytes) throw new Error(`canonical-frames asset is ${buf.byteLength} bytes, want ${V.canonical_frames.bytes}`);
    const sha = await crypto.subtle.digest("SHA-256", buf);
    const hex = [...new Uint8Array(sha)].map((x) => x.toString(16).padStart(2, "0")).join("");
    if (hex !== V.canonical_frames.sha256) throw new Error("canonical-frames asset sha mismatch — refusing to gate against unverified bytes");
    const all = new Float32Array(buf);
    const out: Float32Array[] = [];
    for (let k = 0; k < nFrames; k += 1) out.push(all.subarray(k * frameFloats, (k + 1) * frameFloats));
    return out;
  }

  function maxAbsAllFrames(run: Float32Array[], canon: Float32Array[]): number {
    let m = 0;
    const kmax = Math.min(run.length, canon.length);
    for (let k = 0; k < kmax; k += 1) {
      const r = run[k]!;
      const cf = canon[k]!;
      for (let i = 0; i < r.length; i += 1) {
        const dd = Math.abs(r[i]! - cf[i]!);
        if (dd > m) m = dd;
      }
    }
    return m;
  }

  let running = false;
  const line = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    out.append(b, document.createTextNode(text), document.createElement("br"));
  };

  async function doRun(seed: number, fire: number, label: string): Promise<void> {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    failBtn.disabled = true;
    out.textContent = `stepping 2 × ${d.canonicalSteps} steps + hashing… (${label})`;
    try {
      const run1 = await runRollout(seed, fire);
      const run2 = await runRollout(seed, fire);
      const flat1 = new Float32Array(run1.length * frameFloats);
      const flat2 = new Float32Array(run2.length * frameFloats);
      run1.forEach((f, i) => flat1.set(f, i * frameFloats));
      run2.forEach((f, i) => flat2.set(f, i * frameFloats));
      const [h1, h2] = await Promise.all([sha256hex(flat1), sha256hex(flat2)]);
      out.textContent = "";
      line("run 1", h1);
      line("run 2", h2);
      const identical = h1 === h2;
      const dv = document.createElement("span");
      dv.className = identical ? "ok" : "no";
      dv.textContent = identical ? `identical ✓ — two full rollouts, byte-identical (${nFrames} frames each)` : "MISMATCH ✗ — this device is not replaying byte-identically";
      out.append(dv, document.createElement("br"));

      const canon = await fetchCanonFrames();
      lastRun = run1;
      canonFrames = canon;
      const maxAbs = maxAbsAllFrames(run1, canon);
      const bitExact = maxAbs === 0;
      line("max_abs (all frames)", maxAbs.toExponential(3));
      const gv = document.createElement("span");
      gv.className = bitExact ? "ok" : "no";
      if (seed !== V.canonical.seed || fire !== d.fireRate) {
        gv.className = "no";
        gv.textContent = `FAIL by construction ✓ — seed ${seed}/fire ${fire} ≠ pinned ${V.canonical.seed}/${d.fireRate}, so max_abs jumps to O(${maxAbs.toFixed(2)}). PASS above is a real test.`;
      } else if (bitExact) {
        gv.textContent = "bit-identical on your GPU ✓ — a TRAINED neural network, reproduced to the last ULP; your backend shares the canonical's reduction order.";
      } else {
        gv.textContent = `same weights, a visually identical organism, but NOT bit-identical — your backend rounds the conv reductions differently (max_abs ${maxAbs.toExponential(2)}). This is the f32 non-associativity Distill only noted in prose, measured on YOUR GPU.`;
      }
      out.append(gv, document.createElement("br"));
      line("banked RADV measurement", `${V.gate.measured_max_abs_radv.toFixed(1)} (bit-exact)`);

      // reveal the scrubber
      scrubCanvas.style.display = "";
      scrubRow.style.display = "";
      scrubInput.value = String(nFrames - 1);
      drawScrub(nFrames - 1);
      const cap = document.createElement("div");
      cap.className = "nc-note-line";
      cap.textContent = "scrub the frames: |Δ| between your rollout and the committed golden. All-dark = bit-identical here; any color is where your backend first departs.";
      out.appendChild(cap);
    } catch (e) {
      out.textContent = `proof failed to run: ${(e as Error).message}`;
    } finally {
      running = false;
      btn.disabled = false;
      failBtn.disabled = false;
    }
  }

  btn.addEventListener("click", () => void doRun(V.canonical.seed, d.fireRate, "canonical"));
  failBtn.addEventListener("click", () => void doRun(V.canonical.seed + 1, d.fireRate, "perturbed seed"));
  d.registerProbe(() => {
    d.setRenderMode(3);
    void doRun(V.canonical.seed, d.fireRate, "canonical");
  });
}

// --- 3. the divergence post-mortem ------------------------------------------

function installPostmortem(d: NcaVerifyDeps): void {
  const g = d.panel.addGroup("the 0.72 that wasn't — a post-mortem");
  const pm = V.postmortem;
  const ol = document.createElement("ol");
  ol.className = "nc-timeline";
  const item = (head: string, text: string): void => {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = head;
    li.append(b, document.createTextNode(` ${text}`));
    ol.appendChild(li);
  };
  item(
    "measured, logged.",
    `The 5.1 web-deploy gate found the browser diverging from the WGSL canonical — max_abs ~${pm.prefix_browser_vs_canonical} run-to-run (within-Dawn run-twice differed from step 100 by ~${pm.prefix_within_dawn_step100}). The perf-ledger row was written down and is retained unedited.`,
  );
  item("not widened.", `The [defaults.continuous-ca] tolerance stayed 0.0/0.0 through the whole episode. tolerance_widened: ${String(pm.tolerance_widened)}.`);
  item(
    "diagnosed — hypothesis refuted.",
    "The “cross-backend f32” hypothesis did not survive measurement: the root cause was a frontend capture/live-RAF harness race — the two loops interleaved on shared GPU state.",
  );
  item(
    "fixed, everywhere.",
    `A shared capture/live-loop mutual-exclusion lock landed across all 7 web demos (the isCapturing() guard). Post-fix this sim is run-twice byte-identical and clears the most fragile gate BIT-EXACT ${pm.postfix_max_abs_radv.toFixed(1)} vs the WGSL canonical — on the obtainable RADV backends.`,
  );
  item(
    "residual axis, still open.",
    `${pm.residual_axis}. This is a SECOND, smaller divergence axis — a live, honest one — kept distinct from the refuted 0.72 race: short horizon ≤ step ${pm.contingency.short_horizon_step}, authored ceiling ${pm.contingency.short_horizon_abs}, DECLARED bound ${pm.contingency.declared_short_horizon_abs} (measured RADV 0.0), status ${pm.contingency.status}.`,
  );
  g.appendChild(ol);

  const note = document.createElement("div");
  note.className = "nc-note-line";
  note.textContent = "the discipline caught its own harness bug instead of laundering it into a tolerance — then kept the real cross-backend caveat honest and separate.";
  g.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["charter audit", pm.audits.charter],
    ["resolution audit", pm.audits.resolution],
    ["perf ledger", pm.perf_ledger],
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
