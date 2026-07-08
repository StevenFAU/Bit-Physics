// heat-equation — PROVE layer (spec-ref § 5.6): live gate re-run on the
// visitor's GPU vs the committed f64 reference, run-twice byte-identity,
// and the machine-exact spectral/two-spectra goldens recomputed live.
// Committed values come from the data spine (generated/verification.json);
// the f64 reference checkpoints come from the sha-pinned public bin.

import V from "./generated/verification.json";
import { GATE, runGateScene } from "./capture.js";
import { continuousEigenvalue, discreteEigenvalue } from "./heat64.mjs";

interface Deps {
  device: GPUDevice;
  decayF64: Float64Array;
  /** capture/live-loop exclusivity wrapper (house rule). */
  exclusive: (fn: () => Promise<void>) => Promise<void>;
}

async function fetchReference(): Promise<{ ftcs: Float64Array[]; spec: Float64Array[] }> {
  const resp = await fetch(`./${V.reference_bin.file}`);
  if (!resp.ok) throw new Error(`reference fetch failed: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const n2 = GATE.n * GATE.n;
  const checkpoints = GATE.steps / GATE.captureInterval + 1;
  if (buf.byteLength !== checkpoints * 2 * n2 * 8) {
    throw new Error(`reference bin size ${buf.byteLength} unexpected`);
  }
  const ftcs: Float64Array[] = [];
  const spec: Float64Array[] = [];
  for (let c = 0; c < checkpoints; c++) {
    ftcs.push(new Float64Array(buf, c * 2 * n2 * 8, n2));
    spec.push(new Float64Array(buf, (c * 2 + 1) * n2 * 8, n2));
  }
  return { ftcs, spec };
}

export function installVerifyPanel(deps: Deps): void {
  const root = document.createElement("details");
  root.className = "he-verify";
  const summary = document.createElement("summary");
  summary.textContent = "PROVE — re-run the verification on YOUR GPU";
  root.appendChild(summary);
  const body = document.createElement("div");
  root.appendChild(body);
  document.body.appendChild(root);

  // --- committed gate metadata card (data spine, never retyped) -------------
  const card = document.createElement("div");
  card.className = "he-vcard";
  card.innerHTML = `
<b>Committed gate (${V.gate.kind}):</b> ${V.gate.descriptor}<br>
n=${V.gate.n}, α=${V.gate.alpha}, Δt=${V.gate.dt} (0.8× the von Neumann
bound — the clamp is shown, not hidden), ${V.gate.steps} steps, checkpoints
every ${V.gate.capture_interval}.<br>
<b>Budget:</b> per-checkpoint per-field max|browser−f64| ≤
${V.tolerance.relative} × max|field| ([defaults.${V.tolerance.category}],
measured-then-declared: ${V.tolerance.measured_basis}).<br>
<b>Reference:</b> ${V.reference_bin.file} (sha256 ${V.reference_bin.sha256.slice(0, 16)}…,
f64 run-twice witness ${V.reference_bin.witness_sha256.slice(0, 16)}…).`;
  body.appendChild(card);

  const mkRow = (label: string): { row: HTMLDivElement; out: HTMLSpanElement; btn: HTMLButtonElement } => {
    const row = document.createElement("div");
    row.className = "he-vrow";
    const btn = document.createElement("button");
    btn.textContent = label;
    const out = document.createElement("span");
    out.textContent = " —";
    row.appendChild(btn);
    row.appendChild(out);
    body.appendChild(row);
    return { row, out, btn };
  };

  // --- 1. live gate re-run vs the committed f64 reference -------------------
  const gate = mkRow("run the gate now (f32 GPU vs committed f64)");
  gate.btn.onclick = () => {
    void deps.exclusive(async () => {
      gate.out.textContent = " running (512 steps × 2 solvers)…";
      try {
        const [run, ref] = await Promise.all([
          runGateScene(deps.device, deps.decayF64),
          fetchReference(),
        ]);
        let worstRatio = 0;
        let worst = 0;
        run.steps.forEach((st, ci) => {
          for (const [key, refFields] of [
            ["t_ftcs", ref.ftcs],
            ["t_spec", ref.spec],
          ] as const) {
            const browser = st.state[key].data;
            const reference = refFields[ci];
            let maxAbs = 0;
            let peak = 0;
            for (let i = 0; i < browser.length; i++) {
              maxAbs = Math.max(maxAbs, Math.abs(browser[i] - reference[i]));
              peak = Math.max(peak, Math.abs(browser[i]));
            }
            worst = Math.max(worst, maxAbs);
            worstRatio = Math.max(worstRatio, maxAbs / (V.tolerance.relative * peak));
          }
        });
        const pass = worstRatio <= 1;
        gate.out.textContent = ` ${pass ? "PASS" : "FAIL"} — worst max_abs ${worst.toExponential(2)}, ${(worstRatio * 100).toFixed(1)}% of budget; worst spectral pinned-mode rel err ${run.worstModeRelErr.toExponential(2)} (≤ ${V.gate.mode_rel_threshold})`;
        gate.out.className = pass ? "he-pass" : "he-fail";
      } catch (e) {
        gate.out.textContent = ` ERROR: ${e instanceof Error ? e.message : String(e)}`;
        gate.out.className = "he-fail";
      }
    });
  };

  // --- 2. run twice → identical SHA-256 -------------------------------------
  const twice = mkRow("run it twice → identical SHA-256");
  twice.btn.onclick = () => {
    void deps.exclusive(async () => {
      twice.out.textContent = " running twice…";
      try {
        const r1 = await runGateScene(deps.device, deps.decayF64);
        const r2 = await runGateScene(deps.device, deps.decayF64);
        const same = r1.trajectorySha === r2.trajectorySha;
        twice.out.textContent = ` ${same ? "BYTE-IDENTICAL" : "MISMATCH"} — ${r1.trajectorySha.slice(0, 16)}… vs ${r2.trajectorySha.slice(0, 16)}…`;
        twice.out.className = same ? "he-pass" : "he-fail";
      } catch (e) {
        twice.out.textContent = ` ERROR: ${e instanceof Error ? e.message : String(e)}`;
        twice.out.className = "he-fail";
      }
    });
  };

  // --- 3. two-spectra golden recompute (pure JS f64, table C points) --------
  const spectra = mkRow("recompute the two-spectra golden (table C)");
  spectra.btn.onclick = () => {
    let worst = 0;
    for (const p of V.goldens.laplacian_points) {
      const [m, k] = p.mode;
      const lc = continuousEigenvalue(p.n, m, k);
      const ld = discreteEigenvalue(p.n, m, k);
      worst = Math.max(
        worst,
        Math.abs(lc - p.lambda_continuous) / Math.max(1, Math.abs(p.lambda_continuous)),
        Math.abs(ld - p.lambda_discrete) / Math.max(1, Math.abs(p.lambda_discrete)),
      );
    }
    const pass = worst <= 1e-12;
    spectra.out.textContent = ` ${pass ? "PASS" : "FAIL"} — ${V.goldens.laplacian_points.length} committed points, worst rel dev ${worst.toExponential(2)} (≤ 1e-12)`;
    spectra.out.className = pass ? "he-pass" : "he-fail";
  };

  // --- 4. decay-table recompute (golden A points, JS exp vs committed) ------
  const decay = mkRow("recompute per-mode decay factors (golden A)");
  decay.btn.onclick = () => {
    let worst = 0;
    for (const p of V.goldens.spectral_decay_points) {
      const [m, k] = p.mode;
      const lam = continuousEigenvalue(p.n, m, k);
      const js = Math.exp(p.alpha * lam * p.dt);
      worst = Math.max(worst, Math.abs(js - p.decay_factor) / Math.max(p.decay_factor, 1e-300));
    }
    const pass = worst <= 1e-13;
    decay.out.textContent = ` ${pass ? "PASS" : "FAIL"} — worst rel dev ${worst.toExponential(2)} (≤ 1e-13; committed table is f64 numpy exp)`;
    decay.out.className = pass ? "he-pass" : "he-fail";
  };
}
