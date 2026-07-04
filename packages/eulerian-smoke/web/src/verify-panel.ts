// PROVE layer (verification-demo-spec § 4.3): verification bound to real data.
//
// Four parts:
//   1. A verification card whose every value comes from the generated data
//      spine (src/generated/verification.json) — gate kind, declared budget,
//      banked measurement, determinism claims, canonical provenance, links.
//      No retyped constants.
//   2. The live proof: the canonical Taylor-Green run is dispatched TWICE into
//      scratch buffers (never the live state), each final u/v/density field
//      SHA-256-hashed via crypto.subtle (run-twice determinism), then run 1 is
//      scored against the SHIPPED f64 reference final fields
//      (public/smoke-gate-tg-step1000.bin — computed by the FROZEN NumPy
//      reference via the committed extractor, sha-pinned by the build) using
//      the gate's own criterion: max_abs ≤ rel · max|field|, per field,
//      computed client-side on the visitor's GPU. Whatever it measures is
//      displayed verbatim; an over-budget result is shown, not hidden.
//   3. The FP-edge post-mortem: this port DISCOVERED a bug in the frozen f64
//      reference (the periodic-wrap fraction is unguarded), which contaminates
//      the committed lid-driven-cavity canonical. The numbers, the quarantine
//      decision, and the filed backend fix — the honesty arc, committed.
//   4. Why there is no pointwise gate on the chaotic scenes — chaos measured,
//      not hand-waved.
//
// The scratch runs rebuild the canonical sequence from the SAME committed
// pipelines main.ts steps with, driven by a locally-owned canonical param
// uniform. Nothing here touches the capture path or the live display state.

import V from "./generated/verification.json";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

export interface VerifyPanelDeps {
  panel: PanelShell;
  device: GPUDevice;
  queue: GPUQueue;
  pipelines: {
    advectSL: GPUComputePipeline;
    correct: GPUComputePipeline;
    diffuse: GPUComputePipeline;
    divCurl: GPUComputePipeline;
    jacobi: GPUComputePipeline;
    gradSub: GPUComputePipeline;
    advectDens: GPUComputePipeline;
  };
  n: number;
  canonicalSteps: number;
  jacobiIters: number;
  /** Write the canonical params (verbatim PARAMS, flags=0) into a uniform. */
  writeCanonicalParams: (buf: GPUBuffer) => void;
  /** Build the canonical TG IC (the same closed form the gate rebuilds). */
  buildCanonicalIC: () => { vel: Float32Array<ArrayBuffer>; density: Float32Array<ArrayBuffer> };
}

const blobUrl = (path: string): string => `${V.repo_blob_base}${path}`;

async function sha256hex(data: Float32Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ScratchResult {
  u: Float32Array<ArrayBuffer>;
  v: Float32Array<ArrayBuffer>;
  density: Float32Array<ArrayBuffer>;
}

export function installVerifyPanel(d: VerifyPanelDeps): void {
  installCard(d);
  installProof(d);
  installPostmortem(d);
}

// --- 1. verification card ----------------------------------------------------

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
  row("gate", V.gate.kind, "new_canonical: the browser authors its own canonical scene, verified against the frozen f64 reference re-run LIVE in CI (the boids/strange precedent)");
  row(
    "declared budget",
    `rel ${V.gate.declared_rel} · abs ${V.gate.declared_abs}`,
    `criterion: ${V.gate.criterion} — reuses the established [defaults.smoke] category tolerance; never widened`,
  );
  row(
    "measured (this build's hw)",
    `worst ratio ${V.gate.measured.worst_ratio} of budget`,
    V.gate.measured.provenance,
  );
  row("run-twice", V.determinism.run_twice, "two full browser runs, byte-identical u/v/density at every checkpoint — provable below");
  row("determinism (ref stack)", V.determinism.reference_claimed, "the f64 reference's committed claim (8-clause charter in sim.py)");
  row("determinism (browser)", V.determinism.browser_claimed, "f32 vs the f64 reference is epsilon-class by construction; per-device it replays byte-identically");
  row(
    "canonical run",
    `${V.canonical.descriptor}`,
    `seed ${V.canonical.seed} (inert — analytic IC, matching the reference convention) · ${V.canonical.grid[0]}² · ${V.canonical.step_count} steps @ ${V.canonical.capture_interval} · ν ${V.canonical.params.nu} · Jacobi-${V.canonical.params.n_jacobi} zero-init`,
  );
  row("reference fields sha-256", `${V.gate_asset.sha256.slice(0, 12)}…`, `${V.gate_asset.asset}: ${V.gate_asset.layout} — computed by the frozen NumPy reference via the committed extractor; re-hashed by every build`);
  g.appendChild(dl);

  const note = document.createElement("div");
  note.className = "es-note-line";
  note.textContent = "measured, then declared — and when measurement said the committed canonical was un-gateable, we said that instead (post-mortem below).";
  g.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["gate source", V.links.gate_source],
    ["tolerance table", V.links.tolerance_table],
    ["reference source", V.links.reference],
    ["extractor", V.links.extractor],
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

// --- 2. the live proof ---------------------------------------------------------

function installProof(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("prove it — on this device");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bps-btn";
  btn.textContent = "Run the canonical twice — hash it, gate it";
  btn.title =
    "Rebuilds the canonical Taylor-Green IC, steps the committed kernels 1000 canonical steps twice into scratch buffers, SHA-256-hashes each run's final fields, then scores run 1 against the shipped f64 reference fields with the gate's own criterion. Your GPU is the experiment.";
  const out = document.createElement("div");
  out.className = "es-hash";
  g.append(btn, out);

  if (!("subtle" in crypto)) {
    btn.disabled = true;
    out.textContent = "hashing needs a secure context (https or localhost) — crypto.subtle is unavailable here";
    return;
  }

  const n = d.n;
  const cells = n * n;
  const velBytes = cells * 2 * 4;
  const scalarBytes = cells * 4;

  async function runCanonicalScratch(): Promise<ScratchResult> {
    const dev = d.device;
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const uUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    const params = dev.createBuffer({ size: 48, usage: uUsage, label: "proof-params" });
    d.writeCanonicalParams(params);
    const vel0 = dev.createBuffer({ size: velBytes, usage, label: "proof-vel0" });
    const velPred = dev.createBuffer({ size: velBytes, usage, label: "proof-pred" });
    const velTmp = dev.createBuffer({ size: velBytes, usage, label: "proof-tmp" });
    const divB = dev.createBuffer({ size: scalarBytes, usage, label: "proof-div" });
    const curlB = dev.createBuffer({ size: scalarBytes, usage, label: "proof-curl" });
    const p0 = dev.createBuffer({ size: scalarBytes, usage, label: "proof-p0" });
    const p1 = dev.createBuffer({ size: scalarBytes, usage, label: "proof-p1" });
    const densA = dev.createBuffer({ size: scalarBytes, usage, label: "proof-densA" });
    const densB = dev.createBuffer({ size: scalarBytes, usage, label: "proof-densB" });

    const mk = (pipe: GPUComputePipeline, entries: [number, GPUBuffer][]): GPUBindGroup =>
      dev.createBindGroup({
        layout: pipe.getBindGroupLayout(0),
        entries: entries.map(([binding, buffer]) => ({ binding, resource: { buffer } })),
      });
    const P = d.pipelines;
    const bgs = {
      advectPred: mk(P.advectSL, [[0, params], [1, vel0], [2, velPred]]),
      correct: mk(P.correct, [[0, params], [1, vel0], [2, velTmp], [3, velPred]]),
      diffuse: mk(P.diffuse, [[0, params], [1, velTmp], [2, velPred]]),
      divCurl: mk(P.divCurl, [[0, params], [1, velPred], [5, divB], [6, curlB]]),
      jacobi01: mk(P.jacobi, [[0, params], [4, p0], [5, p1], [6, divB]]),
      jacobi10: mk(P.jacobi, [[0, params], [4, p1], [5, p0], [6, divB]]),
      gradSub: mk(P.gradSub, [[0, params], [1, velPred], [2, vel0], [4, p0]]),
      dens: [
        mk(P.advectDens, [[0, params], [1, vel0], [4, densA], [5, densB]]),
        mk(P.advectDens, [[0, params], [1, vel0], [4, densB], [5, densA]]),
      ] as const,
    };

    const ic = d.buildCanonicalIC();
    d.queue.writeBuffer(vel0, 0, ic.vel);
    d.queue.writeBuffer(densA, 0, ic.density);
    const wg = Math.ceil(n / 8);
    let densCur = 0;
    const CHUNK = 100;
    for (let s = 0; s < d.canonicalSteps; s += CHUNK) {
      const enc = dev.createCommandEncoder();
      for (let k = s; k < Math.min(s + CHUNK, d.canonicalSteps); k += 1) {
        enc.clearBuffer(p0);
        const pass = enc.beginComputePass();
        pass.setPipeline(P.advectSL);
        pass.setBindGroup(0, bgs.advectPred);
        pass.dispatchWorkgroups(wg, wg, 1);
        pass.setPipeline(P.correct);
        pass.setBindGroup(0, bgs.correct);
        pass.dispatchWorkgroups(wg, wg, 1);
        pass.setPipeline(P.diffuse);
        pass.setBindGroup(0, bgs.diffuse);
        pass.dispatchWorkgroups(wg, wg, 1);
        pass.setPipeline(P.divCurl);
        pass.setBindGroup(0, bgs.divCurl);
        pass.dispatchWorkgroups(wg, wg, 1);
        pass.setPipeline(P.jacobi);
        for (let it = 0; it < d.jacobiIters; it += 1) {
          pass.setBindGroup(0, it % 2 === 0 ? bgs.jacobi01 : bgs.jacobi10);
          pass.dispatchWorkgroups(wg, wg, 1);
        }
        pass.setPipeline(P.gradSub);
        pass.setBindGroup(0, bgs.gradSub);
        pass.dispatchWorkgroups(wg, wg, 1);
        pass.setPipeline(P.advectDens);
        pass.setBindGroup(0, bgs.dens[densCur]!);
        pass.dispatchWorkgroups(wg, wg, 1);
        pass.end();
        densCur = 1 - densCur;
      }
      d.queue.submit([enc.finish()]);
    }

    const read = async (src: GPUBuffer, bytes: number): Promise<Float32Array<ArrayBuffer>> => {
      const rb = dev.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = dev.createCommandEncoder();
      enc.copyBufferToBuffer(src, 0, rb, 0, bytes);
      dev.queue.submit([enc.finish()]);
      await rb.mapAsync(GPUMapMode.READ);
      const outArr = new Float32Array(rb.getMappedRange().slice(0)).slice();
      rb.unmap();
      rb.destroy();
      return outArr;
    };
    const velArr = await read(vel0, velBytes);
    const densArr = await read(densCur === 0 ? densA : densB, scalarBytes);
    const u = new Float32Array(cells);
    const v = new Float32Array(cells);
    for (let c = 0; c < cells; c += 1) {
      u[c] = velArr[c * 2] ?? 0;
      v[c] = velArr[c * 2 + 1] ?? 0;
    }
    for (const b of [params, vel0, velPred, velTmp, divB, curlB, p0, p1, densA, densB]) b.destroy();
    return { u, v, density: densArr };
  }

  async function fetchReferenceFields(): Promise<{ u: Float64Array; v: Float64Array; density: Float64Array }> {
    const res = await fetch(`${import.meta.env.BASE_URL}${V.gate_asset.asset}`);
    if (!res.ok) throw new Error(`reference-fields asset fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== V.gate_asset.bytes) {
      throw new Error(`reference-fields asset is ${buf.byteLength} bytes, want ${V.gate_asset.bytes}`);
    }
    const sha = await crypto.subtle.digest("SHA-256", buf);
    const hex = [...new Uint8Array(sha)].map((x) => x.toString(16).padStart(2, "0")).join("");
    if (hex !== V.gate_asset.sha256) {
      throw new Error("reference-fields asset sha mismatch — refusing to gate against unverified bytes");
    }
    return {
      u: new Float64Array(buf, 0, cells),
      v: new Float64Array(buf, cells * 8, cells),
      density: new Float64Array(buf, cells * 16, cells),
    };
  }

  interface FieldScore {
    maxAbs: number;
    threshold: number;
    pass: boolean;
  }
  function score(run: Float32Array, ref: Float64Array): FieldScore {
    let maxAbs = 0;
    let scale = 0;
    for (let c = 0; c < cells; c += 1) {
      const b = run[c]!;
      const diff = Math.abs(ref[c]! - b);
      if (diff > maxAbs) maxAbs = diff;
      const ab = Math.abs(b);
      if (ab > scale) scale = ab;
    }
    const threshold = V.gate.declared_abs + V.gate.declared_rel * scale;
    return { maxAbs, threshold, pass: maxAbs <= threshold };
  }

  let running = false;
  btn.addEventListener("click", () => {
    if (running || isCapturing()) return;
    running = true;
    btn.disabled = true;
    out.textContent = "stepping 2 × 1000 canonical steps + hashing…";
    void (async () => {
      try {
        const run1 = await runCanonicalScratch();
        const run2 = await runCanonicalScratch();
        const hash = async (r: ScratchResult): Promise<string> => {
          const cat = new Float32Array(cells * 3);
          cat.set(r.u, 0);
          cat.set(r.v, cells);
          cat.set(r.density, cells * 2);
          return sha256hex(cat);
        };
        const [h1, h2] = await Promise.all([hash(run1), hash(run2)]);
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
          ? `identical ✓ — two full runs, one hash (u ++ v ++ density, ${(cells * 3 * 4).toLocaleString()} bytes each)`
          : "MISMATCH ✗ — this device is not replaying byte-identically";
        out.append(dv, document.createElement("br"));

        out.appendChild(document.createTextNode("scoring run 1 against the frozen f64 reference…"));
        const ref = await fetchReferenceFields();
        const sU = score(run1.u, ref.u);
        const sV = score(run1.v, ref.v);
        const sD = score(run1.density, ref.density);
        out.removeChild(out.lastChild!);
        line("u max_abs", `${sU.maxAbs.toExponential(3)} vs threshold ${sU.threshold.toExponential(3)} → ${sU.pass ? "within" : "OVER"}`);
        line("v max_abs", `${sV.maxAbs.toExponential(3)} vs threshold ${sV.threshold.toExponential(3)} → ${sV.pass ? "within" : "OVER"}`);
        line("density max_abs", `${sD.maxAbs.toExponential(3)} vs threshold ${sD.threshold.toExponential(3)} → ${sD.pass ? "within" : "OVER"}`);
        const pass = sU.pass && sV.pass && sD.pass;
        const gv = document.createElement("span");
        gv.className = pass ? "ok" : "no";
        gv.textContent = pass
          ? "within the declared budget on your GPU ✓ — final-checkpoint criterion, scored with the gate's own formula (CI sweeps all 11 checkpoints against a live reference re-run)"
          : "OVER the declared budget on your GPU — displayed, not hidden: your backend's f32 rounding walks a measurably different path (see the chaos note below)";
        out.appendChild(gv);
      } catch (e) {
        out.textContent = `proof failed to run: ${(e as Error).message}`;
      } finally {
        running = false;
        btn.disabled = false;
      }
    })();
  });
}

// --- 3 + 4. the FP-edge post-mortem + the chaos note ---------------------------

function installPostmortem(d: VerifyPanelDeps): void {
  const g = d.panel.addGroup("the spike that wasn't physics — a post-mortem");
  const pm = V.postmortem;
  const ol = document.createElement("ol");
  ol.className = "es-timeline";
  const item = (head: string, text: string): void => {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = head;
    li.append(b, document.createTextNode(` ${text}`));
    ol.appendChild(li);
  };
  item(
    "planned.",
    `This demo was specced to gate against the committed ${pm.quarantined_descriptor} capture (payload ${pm.quarantined_sha.slice(0, 19)}…) — the standard capture_roundtrip story.`,
  );
  item(
    "measured — something was off.",
    `Porting required measuring f32-vs-f64 drift first. The committed f64 trajectory spikes to max|u| ≈ ${pm.spike_max_u} within ${pm.spike_step} steps of a ≤ 1 initial condition — not turbulence: a numerical event.`,
  );
  item(
    "root-caused in the FROZEN reference.",
    `The reference guards the periodic wrap's integer index against the np.mod FP edge (mod(-tiny, N) == N) but not the interpolation FRACTION: fx becomes ${pm.edge_fraction_value}, a ×${pm.edge_fraction_value} bilinear extrapolation. On the canonical's own lid-shear IC, ${pm.edge_cells_step1} cells fire it at the very first advection — in f64.`,
  );
  item(
    "quarantined, not laundered.",
    "No f32 port can (or should) reproduce a bug's fingerprint. The committed capture is quarantined as a gate target; a backend fix + canonical regeneration task is filed. The lid-shear scene in this demo runs the guarded port — its true physics is a quiet diffusive shear layer.",
  );
  item(
    "re-anchored.",
    `The gate binds to the Taylor-Green scene instead, where the frozen reference is provably edge-dormant (the extractor asserts max|u| ≤ ${pm.ref_sanity_maxu} over the whole run) — and the WGSL port carries the fraction-complete guard (see equations → code).`,
  );
  g.appendChild(ol);

  const note = document.createElement("div");
  note.className = "es-note-line";
  note.textContent = "the port work caught a bug in the verified reference instead of inheriting it. That is what the verification layer is for.";
  g.appendChild(note);

  // the chaos note: why no pointwise gate on the fun scenes
  const chaos = document.createElement("div");
  chaos.className = "es-hash";
  const b = document.createElement("b");
  b.textContent = "why the fun scenes aren't pointwise-gated: ";
  chaos.append(
    b,
    document.createTextNode(
      `2D Navier-Stokes at these Reynolds numbers amplifies perturbations exponentially — measured on the un-guarded-IC-free Taylor-Green at Re=100, an f32-scale seed (~1e-7) grows ~${pm.chaos_amplification} within 100 steps once an instability is excited. ` +
        "A pointwise f32-vs-f64 gate on a chaotic scene would fail for every port ever written; the honest portable properties are determinism, invariants, and integral diagnostics — exactly what this gate checks (the repo's boids/ising precedent). " +
        "The decaying Taylor-Green canonical is perturbation-contracting, so there the pointwise comparison is real — and it is the one CI runs.",
    ),
  );
  g.appendChild(chaos);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["quarantined capture manifest", V.links.quarantined_manifest],
    ["reference (the unguarded wrap)", V.links.reference],
    ["web spec (measurement log)", V.links.spec],
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
