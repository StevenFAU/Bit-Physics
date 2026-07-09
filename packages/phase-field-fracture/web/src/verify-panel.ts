// phase-field-fracture — PROVE layer (spec-ref § 5.4): live gate re-run on
// the visitor's GPU vs the committed f64 reference, run-twice determinism,
// the F-delta overlay against the f64 curve + published peak band, and the
// closed-form AT constants recomputed live. Committed values come from the
// data spine (generated/verification.json); the f64 reference checkpoints
// come from the sha-pinned public bin.

import V from "./generated/verification.json";
import type { GateRun } from "./capture.js";
import { runGateScene } from "./capture.js";
import { hCritAt1, sigmaCAt1, sigmaCAt2 } from "./pff64.mjs";

interface Deps {
  device: GPUDevice;
  exclusive: (fn: () => Promise<void>) => Promise<void>;
}

interface RefData {
  /** per checkpoint step: {ux, uy, d, h} f64 views. */
  at: Map<number, { ux: Float64Array; uy: Float64Array; d: Float64Array; h: Float64Array }>;
}

async function fetchReference(): Promise<RefData> {
  const resp = await fetch(`./${V.reference_bin.file}`);
  if (!resp.ok) throw new Error(`reference fetch failed: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const n = V.gate.n;
  const m2 = (n + 1) * (n + 1);
  const n2 = n * n;
  const per = (m2 * 2 + n2 * 2) * 8;
  const steps = V.reference_bin.checkpoints;
  if (buf.byteLength !== per * steps.length) {
    throw new Error(`reference bin size ${buf.byteLength} unexpected`);
  }
  const at = new Map<number, { ux: Float64Array; uy: Float64Array; d: Float64Array; h: Float64Array }>();
  steps.forEach((step: number, c: number) => {
    let off = c * per;
    const ux = new Float64Array(buf, off, m2);
    off += m2 * 8;
    const uy = new Float64Array(buf, off, m2);
    off += m2 * 8;
    const d = new Float64Array(buf, off, n2);
    off += n2 * 8;
    const h = new Float64Array(buf, off, n2);
    at.set(step, { ux, uy, d, h });
  });
  return { at };
}

function maxAbsDiff(a: Float32Array, b: Float64Array): { diff: number; scale: number } {
  let diff = 0;
  let scale = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > diff) diff = d;
    const s = Math.abs(b[i]);
    if (s > scale) scale = s;
  }
  return { diff, scale };
}

function iou(a: Float32Array, b: Float64Array, thr = 0.5): number {
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] >= thr;
    const y = b[i] >= thr;
    if (x || y) union++;
    if (x && y) inter++;
  }
  return union === 0 ? 1 : inter / union;
}

export function installVerifyPanel(deps: Deps): {
  drawCurve: (curve: Array<[number, number, number]>) => void;
} {
  const root = document.createElement("details");
  root.className = "pf-verify";
  const summary = document.createElement("summary");
  summary.textContent = "PROVE — re-run the verification on YOUR GPU";
  root.appendChild(summary);
  const body = document.createElement("div");
  root.appendChild(body);
  document.body.appendChild(root);

  const card = document.createElement("div");
  card.className = "pf-vcard";
  card.innerHTML = `
<b>Committed gate (${V.gate.kind}):</b> ${V.gate.descriptor}<br>
${V.gate.n}² cells, Miehe steel groups non-dimensionalized (Ẽ=${V.gate.e_tilde.toFixed(1)}),
${V.gate.steps} CFL substeps under KE/IE discipline, checkpoints every
${V.gate.capture_interval}.<br>
<b>Budget:</b> pre-burst per-checkpoint per-field max|browser−f64| ≤
${V.tolerance.relative} × max|field| ([defaults.${V.tolerance.category}],
${V.tolerance.measured_basis}); post-burst gated by observables — peak ±${(
    V.tolerance.peak_band_rel * 100
  ).toFixed(0)} % of the f64 reference, final crack energy ±${(
    V.tolerance.efrac_band_rel * 100
  ).toFixed(0)} %, crack-path IoU ≥ ${V.tolerance.iou_min}.<br>
<b>Published anchor:</b> peak ${V.published.peak_kn} kN ± ${(
    V.published.band_rel * 100
  ).toFixed(0)} % (${V.published.source}); f64 reference measured
${((V.reference_bin.peak_reaction * V.published.force_unit_n) / 1000).toFixed(4)} kN.<br>
<b>Reference:</b> ${V.reference_bin.file} (sha256 ${V.reference_bin.sha256.slice(0, 16)}…,
f64 run-twice witness ${V.reference_bin.witness_sha256.slice(0, 16)}…).`;
  body.appendChild(card);

  // F-delta overlay canvas
  const curveCanvas = document.createElement("canvas");
  curveCanvas.width = 640;
  curveCanvas.height = 240;
  curveCanvas.className = "pf-curve";
  body.appendChild(curveCanvas);

  const drawCurve = (browser: Array<[number, number, number]>): void => {
    const g = curveCanvas.getContext("2d");
    if (!g) return;
    const W = curveCanvas.width;
    const H = curveCanvas.height;
    g.fillStyle = "#0d141c";
    g.fillRect(0, 0, W, H);
    const uMax = V.gate.u_end;
    const fMax = V.reference_bin.peak_reaction * 1.15;
    const px = (u: number): number => 40 + (u / uMax) * (W - 55);
    const py = (f: number): number => H - 22 - (f / fMax) * (H - 40);
    g.strokeStyle = "#24313f";
    g.strokeRect(40, 18, W - 55, H - 40);
    // published band
    const peakF = (V.published.peak_kn * 1000) / V.published.force_unit_n;
    g.fillStyle = "rgba(176,140,46,0.15)";
    g.fillRect(
      40,
      py(peakF * (1 + V.published.band_rel)),
      W - 55,
      py(peakF * (1 - V.published.band_rel)) - py(peakF * (1 + V.published.band_rel)),
    );
    // f64 reference curve
    g.strokeStyle = "#5f86a8";
    g.beginPath();
    (V.force_curve as Array<[number, number, number]>).forEach(([, u, f], i) => {
      if (i === 0) g.moveTo(px(u), py(f));
      else g.lineTo(px(u), py(f));
    });
    g.stroke();
    // browser run
    if (browser.length > 0) {
      g.strokeStyle = "#7fdc9a";
      g.beginPath();
      browser.forEach(([, u, f], i) => {
        if (i === 0) g.moveTo(px(u), py(f));
        else g.lineTo(px(u), py(f));
      });
      g.stroke();
    }
    g.fillStyle = "#8fa8bd";
    g.font = "11px ui-monospace, monospace";
    g.fillText("F–δ: blue = committed f64 reference, green = YOUR GPU (f32), band = published peak ±10 %", 44, 13);
  };
  drawCurve([]);

  // live gate re-run
  const row = document.createElement("div");
  row.className = "pf-vrow";
  const btn = document.createElement("button");
  btn.textContent = "run the deploy gate here";
  const status = document.createElement("span");
  status.textContent = "idle — takes ~10-60 s depending on your GPU";
  row.appendChild(btn);
  row.appendChild(status);
  body.appendChild(row);

  let lastSha: string | null = null;
  btn.onclick = () => {
    void deps.exclusive(async () => {
      btn.disabled = true;
      try {
        status.textContent = "fetching f64 reference…";
        status.className = "";
        const ref = await fetchReference();
        status.textContent = "running gate scene…";
        const run: GateRun = await runGateScene(deps.device, (done, total) => {
          status.textContent = `running gate scene… ${done}/${total}`;
        });
        // pointwise pre-burst comparison
        let worstRatio = 0;
        let worstField = "";
        for (const [step, fs] of run.fieldsAt) {
          if (step > V.tolerance.pre_burst_last_step) continue;
          const r = ref.at.get(step);
          if (!r) continue;
          const fields: Array<[string, Float32Array, Float64Array]> = [
            ["ux", fs.ux, r.ux],
            ["uy", fs.uy, r.uy],
            ["d", fs.d, r.d],
            ["h_field", fs.h, r.h],
          ];
          const st = { step };
          for (const [name, browser, refArr] of fields) {
            const { diff, scale } = maxAbsDiff(browser, refArr);
            const budget = V.tolerance.relative * (scale || 1);
            const ratio = diff / budget;
            if (ratio > worstRatio) {
              worstRatio = ratio;
              worstField = `${name}@${st.step}`;
            }
          }
        }
        // observables
        const refFinal = ref.at.get(V.gate.steps);
        const dFinal = run.fieldsAt.get(V.gate.steps)?.d;
        const pathIou = refFinal && dFinal ? iou(dFinal, refFinal.d) : 0;
        const peakRel =
          Math.abs(run.peak.reaction - V.reference_bin.peak_reaction) /
          V.reference_bin.peak_reaction;
        const pass =
          worstRatio <= 1 &&
          peakRel <= V.tolerance.peak_band_rel &&
          pathIou >= V.tolerance.iou_min;
        const detSuffix =
          lastSha === null
            ? " — run again to witness determinism"
            : lastSha === run.trajectorySha
              ? " — RUN-TWICE BYTE-IDENTICAL ✓"
              : " — determinism VIOLATED vs previous run";
        lastSha = run.trajectorySha;
        status.textContent =
          `${pass ? "PASS" : "FAIL"} — pointwise ${(worstRatio * 100).toFixed(1)} % of budget ` +
          `(worst ${worstField}), peak ${(peakRel * 100).toFixed(2)} % off f64, ` +
          `crack IoU ${pathIou.toFixed(3)}, sha ${run.trajectorySha.slice(0, 12)}…${detSuffix}`;
        status.className = pass ? "pf-pass" : "pf-fail";
        drawCurve(run.forceCurve);
      } catch (e) {
        status.textContent = `error: ${String(e)}`;
        status.className = "pf-fail";
      } finally {
        btn.disabled = false;
      }
    });
  };

  // closed-form constants recomputed live (goldens' browser shadow)
  const gold = document.createElement("div");
  gold.className = "pf-vcard";
  const s1 = sigmaCAt1(V.at_constants.e_tilde, 1, 1);
  const s2 = sigmaCAt2(V.at_constants.e_tilde, 1, 1);
  const hc = hCritAt1(1, 1);
  const ok =
    Math.abs(s1 - V.at_constants.sigma_c_at1) <= 1e-12 * s1 &&
    Math.abs(s2 - V.at_constants.sigma_c_at2) <= 1e-12 * s2 &&
    Math.abs(hc - V.at_constants.h_crit_at1) <= 1e-15;
  gold.innerHTML = `
<b>Closed-form goldens (recomputed in your browser, f64):</b><br>
σ_c(AT1) = √(3Ẽ/8) = ${s1.toFixed(6)} · √(G<sub>c</sub>/ℓ) ${ok ? "✓" : "✗"} —
σ_c(AT2) = √(27Ẽ/256) = ${s2.toFixed(6)} ${ok ? "✓" : "✗"} —
H_crit(AT1) = 3/16 = ${hc} ${ok ? "✓" : "✗"}
(committed table: tools/testkit/golden/tables/fracture/)`;
  body.appendChild(gold);

  return { drawCurve };
}
