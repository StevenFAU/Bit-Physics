// lbm-multiphase — PROVE layer (spec § 5.4): the full deploy-gate battery,
// re-runnable on the visitor's GPU with live pass/fail against the
// committed f64 references and analytic laws.

import V from "./generated/verification.json";
import { runFullCapture, sha256hex } from "./capture.js";

export interface VerifyDeps {
  device: GPUDevice;
}

interface RowSpec {
  label: string;
  verdict: (s: Record<string, number>) => { text: string; pass: boolean };
}

const ROWS: RowSpec[] = [
  {
    label: "G-matched — browser f32 vs committed Python-f64 trajectories",
    verdict: (s) => ({
      text:
        `worst rel ${s.matched_worst_rel.toExponential(2)} vs budget ${V.tolerance.relative}` +
        ` ([defaults.lbm-multiphase], measured-then-declared)`,
      pass: s.matched_worst_rel <= V.tolerance.relative,
    }),
  },
  {
    label: "G-coexist — Tier-A flat coexistence vs Maxwell equal-area (f64)",
    verdict: (s) => {
      const el = Math.abs(s.coex_rho_l / s.coex_target_rho_l - 1);
      const ev = Math.abs(s.coex_rho_v / s.coex_target_rho_v - 1);
      return {
        text:
          `ρ_l ${s.coex_rho_l.toFixed(5)} (target ${s.coex_target_rho_l.toFixed(5)}, ` +
          `${(el * 100).toFixed(3)}%) · ρ_v ${s.coex_rho_v.toFixed(5)} ` +
          `(${(ev * 100).toFixed(3)}%) vs budgets ${V.tolerance.coex_rel_l}/${V.tolerance.coex_rel_v}`,
        pass: el <= V.tolerance.coex_rel_l && ev <= V.tolerance.coex_rel_v,
      };
    },
  },
  {
    label: "G-tau — Tier-A τ-independence (0.8 / 1.0 / 1.2)",
    verdict: (s) => ({
      text:
        `coexistence moved ≤ ${Math.max(s.tau_spread_rho_l, s.tau_spread_rho_v).toExponential(2)} ` +
        `across the τ sweep (budget ${V.tolerance.tau_spread_abs}; the f64 spread is ~2e-15 — ` +
        `Guo forcing keeps the equal-area rule τ-free)`,
      pass:
        Math.max(s.tau_spread_rho_l, s.tau_spread_rho_v) <= V.tolerance.tau_spread_abs,
    }),
  },
  {
    label: "G-laplace — Young–Laplace σ from Δp vs 1/R (four droplets)",
    verdict: (s) => {
      const rel = Math.abs(s.laplace_sigma / s.laplace_sigma_ref - 1);
      return {
        text:
          `σ ${s.laplace_sigma.toExponential(3)} vs f64 ${s.laplace_sigma_ref.toExponential(3)} ` +
          `(${(rel * 100).toFixed(2)}%, budget ${(V.tolerance.laplace_rel * 100).toFixed(0)}%) · ` +
          `R² ${s.laplace_r2.toFixed(5)} (≥ ${V.tolerance.laplace_r2_min})`,
        pass: rel <= V.tolerance.laplace_rel && s.laplace_r2 >= V.tolerance.laplace_r2_min,
      };
    },
  },
  {
    label: "G-spurious — parasitic-current ceiling at the Tier-B droplet",
    verdict: (s) => ({
      text:
        `max|u| ${s.spurious_max_u.toExponential(2)} (f64 ${s.spurious_ref_f64.toExponential(2)}, ` +
        `ceiling ${V.tolerance.spurious_max}; published anchors 0.028 BGK / 0.0053 MRT — ` +
        `shown, not hidden)`,
      pass: s.spurious_max_u <= V.tolerance.spurious_max,
    }),
  },
  {
    label: "G-nosep — negative control: G > G_c must NOT phase-separate",
    verdict: (s) => ({
      text:
        `density spread ${s.nosep_spread.toExponential(2)} after the control run ` +
        `(IC 1.6e-1, f64 ${s.nosep_spread_f64.toExponential(2)}, bound ${V.tolerance.nosep_spread_max})`,
      pass: s.nosep_spread <= V.tolerance.nosep_spread_max,
    }),
  },
];

export function installVerifyPanel(deps: VerifyDeps): void {
  const root = document.createElement("details");
  root.className = "lm-verify";
  const sum = document.createElement("summary");
  sum.textContent = "PROVE — re-run the deploy gate + analytic laws on YOUR GPU";
  root.appendChild(sum);

  const meta = document.createElement("div");
  meta.className = "lm-vcard";
  meta.innerHTML =
    `<b>committed gate</b> — kind: <code>new_canonical</code>, scenes ` +
    `<code>${V.gate.descriptor}</code> (checkpoints ${V.gate.checkpoints.join("/")}), ` +
    `references: Python-f64 <code>${V.reference_bins.flat.file}</code> ` +
    `(${V.reference_bins.flat.sha256.slice(0, 12)}…) + ` +
    `<code>${V.reference_bins.droplet.file}</code> ` +
    `(${V.reference_bins.droplet.sha256.slice(0, 12)}…), ψ-LUT ` +
    `${V.psi_lut_sha.slice(0, 12)}…, budget <code>[defaults.lbm-multiphase] ` +
    `relative = ${V.tolerance.relative}</code> (${V.tolerance.measured_basis}).`;
  root.appendChild(meta);

  const rows: Array<{ out: HTMLSpanElement; spec: RowSpec }> = [];
  for (const spec of ROWS) {
    const row = document.createElement("div");
    row.className = "lm-vrow";
    const label = document.createElement("span");
    label.className = "lm-vlabel";
    label.textContent = spec.label;
    const out = document.createElement("span");
    out.textContent = "—";
    row.append(label, out);
    root.appendChild(row);
    rows.push({ out, spec });
  }
  const shaRow = document.createElement("div");
  shaRow.className = "lm-vrow";
  const shaLabel = document.createElement("span");
  shaLabel.className = "lm-vlabel";
  shaLabel.textContent = "G-runtwice — byte-identical repeat (same GPU)";
  const shaOut = document.createElement("span");
  shaOut.textContent = "—";
  shaRow.append(shaLabel, shaOut);
  root.appendChild(shaRow);

  const btnRow = document.createElement("div");
  btnRow.className = "lm-vrow";
  const btn = document.createElement("button");
  btn.textContent = "run the full battery (≈ 30–120 s)";
  btnRow.appendChild(btn);
  const status = document.createElement("span");
  status.textContent = "";
  btnRow.appendChild(status);
  root.appendChild(btnRow);

  async function bundleSha(bundle: unknown): Promise<string> {
    const steps = (bundle as { steps: Array<{ state: Record<string, { data: number[] }> }> })
      .steps;
    const chunks: number[] = [];
    for (const st of steps)
      for (const k of Object.keys(st.state).sort()) chunks.push(...st.state[k].data);
    return sha256hex(new Uint8Array(Float32Array.from(chunks).buffer));
  }

  btn.addEventListener("click", () => {
    btn.disabled = true;
    void (async () => {
      try {
        status.textContent = "run 1/2…";
        const a = await runFullCapture(deps.device, 42, (m) => {
          status.textContent = `run 1/2 — ${m}`;
        });
        for (const { out, spec } of rows) {
          const v = spec.verdict(a.summary);
          out.textContent = `${v.text} → ${v.pass ? "PASS" : "FAIL"}`;
          out.className = v.pass ? "lm-pass" : "lm-fail";
        }
        status.textContent = "run 2/2 (byte-identity witness)…";
        const b = await runFullCapture(deps.device, 42);
        const [sa, sb] = await Promise.all([bundleSha(a.bundle), bundleSha(b.bundle)]);
        const pass = sa === sb;
        shaOut.textContent = pass
          ? `PASS — sha ${sa.slice(0, 16)}… twice`
          : `FAIL — ${sa.slice(0, 12)} ≠ ${sb.slice(0, 12)}`;
        shaOut.className = pass ? "lm-pass" : "lm-fail";
        status.textContent = "done.";
      } catch (e) {
        status.textContent = `failed: ${String(e)}`;
      } finally {
        btn.disabled = false;
      }
    })();
  });

  const tables = document.createElement("div");
  tables.className = "lm-vcard";
  tables.innerHTML =
    `<b>committed goldens</b> (offline f64, cross-anchored, in ` +
    `<code>tools/testkit/golden/tables/lattice/</code>): Maxwell coexistence ` +
    `G=−9 → ρ_l/ρ_v = ${V.goldens.coex_rho_l.toFixed(5)}/${V.goldens.coex_rho_v.toFixed(5)} ` +
    `(lattice measured within 0.02%, τ-spread ~2e-15); Laplace σ_A ` +
    `${V.goldens.sigma_a.toExponential(3)} (R² 0.99996); contact-angle map θ(ρ_w) ` +
    `103°→28° over ρ_w 1.0→1.8; Tier-B ε=1.68 targets (T/T_c=0.7 vapor rejects raw ` +
    `Maxwell by −3.1% and matches the ε-integral to +0.4% — the thermodynamic-` +
    `inconsistency exhibit); G_c bisection −4.000000 vs analytic −4 (sc94 ψ).`;
  root.appendChild(tables);

  document.body.appendChild(root);
}
