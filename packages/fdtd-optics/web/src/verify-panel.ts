// fdtd-optics — PROVE layer (spec-ref § 5.4): the deploy gate and the
// analytic instruments, each re-runnable on the visitor's GPU with live
// pass/fail against the committed goldens.

import { GATE64, maxAbs, maxAbsDiff } from "./fdtd64.mjs";
import V from "./generated/verification.json";
import { FRESNEL, MIE, runFresnelGate, runGateScene, runMieGate } from "./capture.js";

export interface VerifyDeps {
  device: GPUDevice;
}

async function fetchReferenceBin(): Promise<Float64Array> {
  const resp = await fetch("./fdtd-gate-tfsf-cyl128-step512.bin");
  if (!resp.ok) throw new Error(`reference fetch failed: ${resp.status}`);
  return new Float64Array(await resp.arrayBuffer());
}

export function installVerifyPanel(deps: VerifyDeps): void {
  const root = document.createElement("details");
  root.className = "fo-verify";
  const sum = document.createElement("summary");
  sum.textContent = "PROVE — re-run the deploy gate + analytic optics on YOUR GPU";
  root.appendChild(sum);

  const meta = document.createElement("div");
  meta.className = "fo-vcard";
  meta.innerHTML =
    `<b>committed gate</b> — kind: <code>${V.gate.kind}</code>, scene ` +
    `<code>${V.gate.descriptor}</code> (${V.gate.n}², S_c=${V.gate.sc}, ${V.gate.steps} steps, ` +
    `checkpoints ${V.gate.checkpoints.join("/")}), reference: Python f64 ` +
    `<code>${V.reference_bin.file}</code> (sha256 ${V.reference_bin.sha256.slice(0, 12)}…), ` +
    `budget <code>[defaults.fdtd-optics] relative = ${V.tolerance.relative}</code> ` +
    `(${V.tolerance.measured_basis}). Determinism witness ` +
    `${V.gate.determinism_witness.slice(0, 12)}… (Python run-twice).`;
  root.appendChild(meta);

  const mkRow = (
    label: string,
    run: (out: HTMLSpanElement) => Promise<void>,
  ): void => {
    const row = document.createElement("div");
    row.className = "fo-vrow";
    const btn = document.createElement("button");
    btn.textContent = label;
    const out = document.createElement("span");
    out.textContent = "—";
    btn.addEventListener("click", () => {
      btn.disabled = true;
      out.textContent = "running…";
      out.className = "";
      void run(out).finally(() => {
        btn.disabled = false;
      });
    });
    row.append(btn, out);
    root.appendChild(row);
  };

  mkRow("G-matched: gate vs committed f64", async (out) => {
    const [run, ref] = await Promise.all([runGateScene(deps.device), fetchReferenceBin()]);
    const n2 = GATE64.n * GATE64.n;
    let worst = 0;
    GATE64.checkpoints.forEach((cp, ci) => {
      const ez = run.steps[ci].state.ez.data;
      const hx = run.steps[ci].state.hx.data;
      const hy = run.steps[ci].state.hy.data;
      const base = ci * 3 * n2;
      const refEz = ref.subarray(base, base + n2);
      const refHx = ref.subarray(base + n2, base + 2 * n2);
      const refHy = ref.subarray(base + 2 * n2, base + 3 * n2);
      const peak = maxAbs(refEz);
      const err = Math.max(
        maxAbsDiff(Float64Array.from(ez), Float64Array.from(refEz)),
        maxAbsDiff(Float64Array.from(hx), Float64Array.from(refHx)),
        maxAbsDiff(Float64Array.from(hy), Float64Array.from(refHy)),
      );
      worst = Math.max(worst, err / peak);
      void cp;
    });
    const pass = worst <= V.tolerance.relative;
    out.textContent = `worst rel ${worst.toExponential(2)} vs budget ${V.tolerance.relative} → ${
      pass ? "PASS" : "FAIL"
    } (live JS-f64 matched: ${run.worstMatchedRel.toExponential(2)})`;
    out.className = pass ? "fo-pass" : "fo-fail";
  });

  mkRow("G-runtwice: byte-identical re-run", async (out) => {
    const a = await runGateScene(deps.device);
    const b = await runGateScene(deps.device);
    const pass = a.trajectorySha === b.trajectorySha;
    out.textContent = pass
      ? `PASS — sha ${a.trajectorySha.slice(0, 16)}… twice`
      : `FAIL — ${a.trajectorySha.slice(0, 12)} ≠ ${b.trajectorySha.slice(0, 12)}`;
    out.className = pass ? "fo-pass" : "fo-fail";
  });

  mkRow("G-fresnel: R vs exact 0.04 (±2%)", async (out) => {
    const r = await runFresnelGate(deps.device);
    const pass = r.relErr <= 0.02;
    out.textContent =
      `R = ${r.rMeasured.toFixed(6)} (exact ${r.rExact}) — ` +
      `${(r.relErr * 100).toFixed(3)}% off → ${pass ? "PASS" : "FAIL"} ` +
      `(air→n=1.5, ${FRESNEL.nx}-cell strip, two-run subtraction)`;
    out.className = pass ? "fo-pass" : "fo-fail";
  });

  mkRow("G-mie2d: Q_sca vs Bohren–Huffman table", async (out) => {
    const m = await runMieGate(deps.device);
    const budget = V.tolerance.mie_relative;
    const pass = m.relErr.every((e) => e <= budget);
    out.textContent = m.x
      .map(
        (x, k) =>
          `x=${x}: ${m.qMeasured[k].toFixed(3)} vs ${m.qGolden[k].toFixed(3)} ` +
          `(${(m.relErr[k] * 100).toFixed(1)}%)`,
      )
      .join(" · ") + ` → ${pass ? "PASS" : "FAIL"} (budget ${(budget * 100).toFixed(0)}%; ` +
      `r=${MIE.r} cells, staircased, no subpixel smoothing)`;
    out.className = pass ? "fo-pass" : "fo-fail";
  });

  const tables = document.createElement("div");
  tables.className = "fo-vcard";
  const mieRows = V.goldens.mie_cylinder_tm
    .map((r: { x: number; q_sca: number }) => `x=${r.x}: ${r.q_sca.toFixed(4)}`)
    .join(" · ");
  tables.innerHTML =
    `<b>committed goldens</b> (offline-generated, cross-anchored, in ` +
    `<code>tools/testkit/golden/tables/electromagnetics/</code>): cylinder-Mie TM m=1.5 ` +
    `{${mieRows}} — trust-anchored by Wiscombe sphere Q=3.105425 @ x=5.21282; ` +
    `Fresnel R₀=0.04 exact, Brewster 56.31°, critical 41.81°; slab n_eff pair ` +
    `TE₀ ${V.goldens.slab_te0} / TM₀ ${V.goldens.slab_tm0}; grating m=1 → 30.00°; ` +
    `numerical dispersion ≤ ${V.goldens.dispersion_worst_pct}% at N_λ ≥ 10 (S_c 0.5).`;
  root.appendChild(tables);

  document.body.appendChild(root);
}
