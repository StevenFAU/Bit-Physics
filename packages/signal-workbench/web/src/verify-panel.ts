// signal-workbench — PROVE layer (spec-ref § 5.6): live gate re-run on the
// visitor's GPU vs the committed f64 reference, run-twice byte-identity,
// the FM Bessel golden recomputed live in JS f64, and the display-only
// negative control (§ 6.5). Committed values come from the data spine
// (generated/verification.json); the f64 reference from the sha-pinned bin.

import V from "./generated/verification.json";
import { GATE, runGateScene } from "./capture.js";
import { besselJArray, fmLineBins } from "./dsp64.mjs";

interface Deps {
  device: GPUDevice;
  exclusive: (fn: () => Promise<void>) => Promise<void>;
}

interface Reference {
  xFm: Float64Array;
  fmRe: Float64Array;
  fmIm: Float64Array;
  xLeak: Float64Array;
  leakRe: Float64Array;
  leakIm: Float64Array;
}

async function fetchReference(): Promise<Reference> {
  const resp = await fetch(`./${V.reference_bin.file}`);
  if (!resp.ok) throw new Error(`reference fetch failed: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const n = GATE.n;
  if (buf.byteLength !== 6 * n * 8) {
    throw new Error(`reference bin size ${buf.byteLength} unexpected`);
  }
  const arr = (i: number): Float64Array => new Float64Array(buf, i * n * 8, n);
  return {
    xFm: arr(0),
    fmRe: arr(1),
    fmIm: arr(2),
    xLeak: arr(3),
    leakRe: arr(4),
    leakIm: arr(5),
  };
}

export function installVerifyPanel(deps: Deps): void {
  const root = document.createElement("details");
  root.className = "sw-verify";
  const summary = document.createElement("summary");
  summary.textContent = "PROVE — re-run the verification on YOUR GPU";
  root.appendChild(summary);
  const body = document.createElement("div");
  root.appendChild(body);
  document.body.appendChild(root);

  const card = document.createElement("div");
  card.className = "sw-vcard";
  card.innerHTML = `
<b>Committed gate (${V.gate.kind}):</b> ${V.gate.descriptor}<br>
N=${V.gate.n}; path A: coherent FM (kc=${V.gate.fm_kc}, km=${V.gate.fm_km},
I=${V.gate.fm_index}, rectangular) vs the exact folded J_n(I) line spectrum;
path B: off-bin tone (f0=${V.gate.leak_f0_bins} bins, hann) vs the exact
shifted-Dirichlet window-DTFT skirt (the discrete-spectrum discipline).<br>
<b>Budget:</b> per-field max|browser−f64| ≤ ${V.tolerance.relative} ×
max|spectrum| ([defaults.${V.tolerance.category}], measured-then-declared:
${V.tolerance.measured_basis}).<br>
<b>Reference:</b> ${V.reference_bin.file} (sha256
${V.reference_bin.sha256.slice(0, 16)}…, f64 run-twice witness
${V.reference_bin.witness_sha256.slice(0, 16)}…).`;
  body.appendChild(card);

  const mkRow = (
    label: string,
  ): { out: HTMLSpanElement; btn: HTMLButtonElement } => {
    const row = document.createElement("div");
    row.className = "sw-vrow";
    const btn = document.createElement("button");
    btn.textContent = label;
    const out = document.createElement("span");
    out.textContent = " —";
    row.appendChild(btn);
    row.appendChild(out);
    body.appendChild(row);
    return { out, btn };
  };

  // --- 1. live gate re-run vs the committed f64 reference ------------------
  const gate = mkRow("run the gate now (f32 GPU vs committed f64)");
  gate.btn.onclick = () => {
    void deps.exclusive(async () => {
      gate.out.textContent = " running (two paths, N=4096)…";
      try {
        const [run, ref] = await Promise.all([runGateScene(deps.device), fetchReference()]);
        const pairs: Array<[Float32Array, Float64Array, Float64Array, Float64Array]> = [
          [run.fm.re, ref.fmRe, ref.fmRe, ref.fmIm],
          [run.fm.im, ref.fmIm, ref.fmRe, ref.fmIm],
          [run.leak.re, ref.leakRe, ref.leakRe, ref.leakIm],
          [run.leak.im, ref.leakIm, ref.leakRe, ref.leakIm],
        ];
        let worstRatio = 0;
        let worst = 0;
        for (const [browser, reference, pr, pi] of pairs) {
          let peak = 0;
          for (let i = 0; i < pr.length; i++) peak = Math.max(peak, Math.hypot(pr[i], pi[i]));
          let maxAbs = 0;
          for (let i = 0; i < browser.length; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(browser[i] - reference[i]));
          }
          worst = Math.max(worst, maxAbs);
          worstRatio = Math.max(worstRatio, maxAbs / (V.tolerance.relative * peak));
        }
        const parsevalOk =
          run.parsevalFm <= V.gate.parseval_threshold &&
          run.parsevalLeak <= V.gate.parseval_threshold;
        const pass = worstRatio <= 1 && parsevalOk;
        gate.out.textContent = ` ${pass ? "PASS" : "FAIL"} — worst max_abs ${worst.toExponential(2)}, ${(worstRatio * 100).toFixed(1)}% of budget; Parseval ${Math.max(run.parsevalFm, run.parsevalLeak).toExponential(2)} (≤ ${V.gate.parseval_threshold}: ${parsevalOk ? "ok" : "EXCEEDED"})`;
        gate.out.className = pass ? "sw-pass" : "sw-fail";
      } catch (e) {
        gate.out.textContent = ` ERROR: ${e instanceof Error ? e.message : String(e)}`;
        gate.out.className = "sw-fail";
      }
    });
  };

  // --- 2. run twice -> identical SHA-256 ------------------------------------
  const twice = mkRow("run it twice → identical SHA-256");
  twice.btn.onclick = () => {
    void deps.exclusive(async () => {
      twice.out.textContent = " running twice…";
      try {
        const r1 = await runGateScene(deps.device);
        const r2 = await runGateScene(deps.device);
        const same = r1.trajectorySha === r2.trajectorySha;
        twice.out.textContent = ` ${same ? "BYTE-IDENTICAL" : "MISMATCH"} — ${r1.trajectorySha.slice(0, 16)}… vs ${r2.trajectorySha.slice(0, 16)}…`;
        twice.out.className = same ? "sw-pass" : "sw-fail";
      } catch (e) {
        twice.out.textContent = ` ERROR: ${e instanceof Error ? e.message : String(e)}`;
        twice.out.className = "sw-fail";
      }
    });
  };

  // --- 3. FM Bessel golden recompute (pure JS f64 vs committed table C) -----
  const bessel = mkRow("recompute the FM Bessel golden (table C)");
  bessel.btn.onclick = () => {
    let worst = 0;
    const jt = besselJArray(V.goldens.fm_index, 16);
    for (const [order, want] of Object.entries(V.goldens.sideband_j_n)) {
      const n = Math.abs(Number(order));
      const sign = Number(order) < 0 && n % 2 === 1 ? -1 : 1;
      worst = Math.max(worst, Math.abs(sign * jt[n] - (want as number)));
    }
    // energy identity (DLMF 10.23.3) live
    const big = besselJArray(V.goldens.fm_index, 64);
    let total = big[0] * big[0];
    for (let k = 1; k <= 64; k++) total += 2 * big[k] * big[k];
    const identity = Math.abs(1 - total);
    const pass = worst <= 1e-12 && identity <= 1e-12;
    bessel.out.textContent = ` ${pass ? "PASS" : "FAIL"} — worst |J_n dev| ${worst.toExponential(2)} vs committed scipy values; energy identity residual ${identity.toExponential(2)}`;
    bessel.out.className = pass ? "sw-pass" : "sw-fail";
  };

  // --- 4. display-only negative control (§ 6.5) -----------------------------
  const disp = mkRow("toggle display-only transforms → capture SHA unchanged");
  disp.btn.onclick = () => {
    void deps.exclusive(async () => {
      disp.out.textContent = " running with persistence/waterfall toggled…";
      try {
        // runGateScene never dispatches the persistence/waterfall kernels —
        // the check proves the gate capture is independent of every render
        // path by re-running while the LIVE loop's display state differs.
        const r1 = await runGateScene(deps.device);
        window.dispatchEvent(new CustomEvent("sw-toggle-display-transforms"));
        const r2 = await runGateScene(deps.device);
        const same = r1.trajectorySha === r2.trajectorySha;
        disp.out.textContent = ` ${same ? "PASS — SHA identical" : "FAIL — SHA moved"} (${r1.trajectorySha.slice(0, 12)}…) — renderings never feed the gated arrays`;
        disp.out.className = same ? "sw-pass" : "sw-fail";
      } catch (e) {
        disp.out.textContent = ` ERROR: ${e instanceof Error ? e.message : String(e)}`;
        disp.out.className = "sw-fail";
      }
    });
  };

  // --- 5. folded-line consistency: fmLineBins vs live besselJ ---------------
  const fold = mkRow("recompute the folded line spectrum (fold bookkeeping)");
  fold.btn.onclick = () => {
    const amps = fmLineBins(GATE.n, GATE.fmKc, GATE.fmKm, GATE.fmIndex, GATE.fmAmplitude);
    let energy = 0;
    for (let k = 1; k < amps.length; k++) energy += 0.5 * amps[k] * amps[k];
    // sum of line powers = mean-square of the FM frame = A^2/2 (identity)
    const dev = Math.abs(energy - (GATE.fmAmplitude * GATE.fmAmplitude) / 2);
    const pass = dev <= 1e-12;
    fold.out.textContent = ` ${pass ? "PASS" : "FAIL"} — Σ line powers vs A²/2 dev ${dev.toExponential(2)} (folding conserves energy exactly)`;
    fold.out.className = pass ? "sw-pass" : "sw-fail";
  };
}
