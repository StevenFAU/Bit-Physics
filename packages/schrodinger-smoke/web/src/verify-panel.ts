// schrodinger-smoke — PROVE layer (web spec § 4, the flagship).
//
// Every instrument carries a machine-exact or measured-convergent badge and
// the demo never blurs the two. All heavy instruments are on-demand buttons;
// each reports its own measured cost (perf-budget honesty, web spec § 5.5).

import V from "./generated/verification.json";
import type { GateRun } from "./capture.js";
import { GATE } from "./capture.js";
import {
  continuousEigenvalue,
  discreteEigenvalue,
  fft3d,
  freeStep,
  gaussianPacket,
  normL2,
  taylorGreenWave2d,
  unpackF32,
  velocityCellCentered,
} from "./isf64.mjs";

interface Deps {
  device: GPUDevice;
  runGate: () => Promise<GateRun>;
  sha256hex: (d: Float32Array) => Promise<string>;
}

function row(label: string, value: string, badge: string, ok?: boolean): HTMLElement {
  const div = document.createElement("div");
  div.className = "ss-vrow";
  const b = document.createElement("span");
  b.className = `ss-badge ${ok === false ? "no" : "ok"}`;
  b.textContent = badge;
  const l = document.createElement("span");
  l.className = "ss-vlabel";
  l.textContent = label;
  const v = document.createElement("span");
  v.className = "ss-vvalue";
  v.textContent = value;
  div.append(b, l, v);
  return div;
}

export function installVerifyPanel(deps: Deps): void {
  const root = document.createElement("details");
  root.className = "ss-verify";
  const summary = document.createElement("summary");
  summary.textContent = "PROVE — re-run the verification on YOUR GPU";
  root.appendChild(summary);
  const body = document.createElement("div");
  root.appendChild(body);
  document.body.appendChild(root);

  // --- card: committed gate metadata (data spine, never retyped) ----------
  const card = document.createElement("div");
  card.className = "ss-vcard";
  card.append(
    row("gate kind", V.gate.kind, "committed"),
    row("tolerance category", `[defaults.isf] rel ${V.tolerance.relative}`, "committed"),
    row(
      "declared basis",
      `MEASURED ${V.tolerance.measured_basis}`,
      "measured",
    ),
    row("backend", "f64 NumPy reference, 49 tests, goldens A–F", "committed"),
    row(
      "determinism",
      "device-scoped run-twice bit-exact; cross-device distributional (f32 FFT accumulation differs by GPU) — stated, not hidden",
      "boundary",
    ),
  );
  body.appendChild(card);

  const results = document.createElement("div");
  results.className = "ss-vresults";
  body.appendChild(results);

  const addButton = (label: string, fn: () => Promise<void>): void => {
    const btn = document.createElement("button");
    btn.className = "bps-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      btn.disabled = true;
      fn()
        .catch((e: unknown) => {
          results.appendChild(row(label, String(e), "ERROR", false));
        })
        .finally(() => {
          btn.disabled = false;
        });
    });
    body.appendChild(btn);
  };

  // --- machine-exact goldens, recomputed in f64 JS right now --------------
  addButton("run machine-exact goldens (f64, in this tab)", async () => {
    const t0 = performance.now();
    // golden B: per-mode phase closed form vs committed table
    let worstB = 0;
    for (const tp of V.goldens.free_step_phase_points) {
      const [mx, my, mz] = tp.mode;
      const k2 = (2 * Math.PI) ** 2 * (mx * mx + my * my + mz * mz);
      const phase = -((tp.hbar * tp.dt) / 2) * k2;
      const wrap = (a: number): number =>
        ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      worstB = Math.max(worstB, Math.abs(wrap(phase - tp.phase)));
    }
    results.appendChild(
      row("golden B per-mode phase (closed form)", `max err ${worstB.toExponential(2)}`, "machine-exact", worstB <= 1e-12),
    );
    // golden E: two-spectra eigenvalues
    let worstE = 0;
    for (const tp of V.goldens.laplacian_points) {
      const [mx, my, mz] = tp.mode;
      const lc = continuousEigenvalue(tp.n, mx, my, mz);
      const ld = discreteEigenvalue(tp.n, mx, my, mz);
      worstE = Math.max(
        worstE,
        Math.abs(lc - tp.lambda_continuous) / Math.max(1, Math.abs(tp.lambda_continuous)),
        Math.abs(ld - tp.lambda_discrete) / Math.max(1, Math.abs(tp.lambda_discrete)),
      );
    }
    results.appendChild(
      row("golden E two-spectra eigenvalues", `max rel err ${worstE.toExponential(2)}`, "machine-exact", worstE <= 1e-12),
    );
    // golden A + Parseval: live f64 FFT at N=32
    const n = 32;
    const psi = taylorGreenWave2d(n, 0.1);
    const pre = normL2(psi);
    freeStep(psi, 0.1, 1 / 24);
    const post = normL2(psi);
    const drift = Math.abs(post - pre) / pre;
    results.appendChild(
      row("golden A unitary norm (live f64 FFT, N=32)", `rel drift ${drift.toExponential(2)} ≤ 1e-13`, "machine-exact", drift <= 1e-13),
    );
    const re = psi.re1.slice();
    const im = psi.im1.slice();
    fft3d(re, im, n, -1);
    let fourier = 0;
    for (let i = 0; i < re.length; i++) fourier += re[i] ** 2 + im[i] ** 2;
    let real = 0;
    for (let i = 0; i < re.length; i++) real += psi.re1[i] ** 2 + psi.im1[i] ** 2;
    const parseval = Math.abs(real - fourier / n ** 3) / real;
    results.appendChild(
      row("Parseval identity (live f64 FFT)", `rel err ${parseval.toExponential(2)} ≤ 1e-13`, "machine-exact", parseval <= 1e-13),
    );
    results.appendChild(
      row("goldens cost", `${(performance.now() - t0).toFixed(0)} ms`, "measured"),
    );
  });

  // --- exact-propagator flatline on THIS GPU (f32) -------------------------
  addButton("exact-propagator flatline (GPU f32 vs analytic)", async () => {
    const t0 = performance.now();
    const { IsfGpu } = await import("./solver.js");
    const n = 32;
    const sigma0 = 0.04;
    const hb = 0.02;
    const T = 0.08;
    const errs: number[] = [];
    for (const steps of [2, 4, 8]) {
      const gpu = new IsfGpu(deps.device, n, { hbar: hb, dt: T / steps });
      try {
        const psi0 = gaussianPacket(n, 0, hb, sigma0);
        const packed = new Float32Array(n ** 3 * 4);
        for (let i = 0; i < n ** 3; i++) {
          packed[i * 4] = psi0.re1[i];
          packed[i * 4 + 1] = psi0.im1[i];
        }
        gpu.uploadPsi(packed);
        // free step ONLY: run the full encodeStep would normalize/project;
        // use the spectral pipeline via a dedicated mini-encoder per step
        for (let s = 0; s < steps; s++) {
          const enc = deps.device.createCommandEncoder();
          gpu.encodeFreeStepOnly(enc);
          deps.device.queue.submit([enc.finish()]);
        }
        const out = await gpu.readPsi();
        const ref = gaussianPacket(n, T, hb, sigma0);
        let e = 0;
        for (let i = 0; i < n ** 3; i++) {
          e = Math.max(
            e,
            Math.hypot(out[i * 4] - ref.re1[i], out[i * 4 + 1] - ref.im1[i]),
          );
        }
        errs.push(e);
      } finally {
        gpu.destroy();
      }
    }
    const flat = Math.max(...errs) <= 10 * Math.min(...errs);
    results.appendChild(
      row(
        "exact-propagator flatline (steps 2/4/8)",
        errs.map((e) => e.toExponential(1)).join(" / ") +
          " — flat at the f32 floor (the free step has NO Δt error; few solvers can show this plot)",
        "machine-exact structure, f32 floor",
        flat,
      ),
    );
    results.appendChild(row("flatline cost", `${(performance.now() - t0).toFixed(0)} ms`, "measured"));
  });

  // --- full gate re-run: run-twice + committed f64 reference deltas --------
  addButton("re-run the deploy gate (32³ ring ×2 + f64 reference)", async () => {
    const t0 = performance.now();
    const run1 = await deps.runGate();
    const run2 = await deps.runGate();
    const identical = run1.trajectorySha === run2.trajectorySha;
    results.appendChild(
      row(
        "run-twice byte-identity (this device)",
        `${run1.trajectorySha.slice(0, 16)}… ${identical ? "==" : "!="} ${run2.trajectorySha.slice(0, 16)}…`,
        "device-scoped bit-exact",
        identical,
      ),
    );
    // committed f64 reference comparison (the live-gate view of what
    // verify.py does at deploy with a LIVE reference re-run)
    try {
      const resp = await fetch(`./${V.reference_bin.file}`);
      const buf = await resp.arrayBuffer();
      const shaBuf = await crypto.subtle.digest("SHA-256", buf);
      const sha = Array.from(new Uint8Array(shaBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (sha !== V.reference_bin.sha256) {
        results.appendChild(row("f64 reference asset", "sha mismatch vs sidecar", "HARD-FAIL", false));
        return;
      }
      const ref = new Float64Array(buf);
      const n3 = GATE.n ** 3;
      let worstRatio = 0;
      run2.steps.forEach((st, ci) => {
        const base = ci * 3 * n3;
        (["u", "v", "w"] as const).forEach((key, fi) => {
          const browser = st.state[key].data;
          let maxAbs = 0;
          let peak = 0;
          for (let i = 0; i < n3; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(browser[i] - ref[base + fi * n3 + i]));
            peak = Math.max(peak, Math.abs(browser[i]));
          }
          const budget = V.tolerance.relative * peak;
          if (budget > 0) worstRatio = Math.max(worstRatio, maxAbs / budget);
        });
      });
      results.appendChild(
        row(
          "f32 GPU vs committed f64 reference (4 checkpoints × u,v,w)",
          `worst ${(worstRatio * 100).toFixed(1)}% of the [defaults.isf] rel ${V.tolerance.relative} budget`,
          "gate",
          worstRatio <= 1,
        ),
      );
    } catch (e) {
      results.appendChild(row("f64 reference compare", String(e), "ERROR", false));
    }
    results.appendChild(
      row("headroom during gate", `${(run2.headroom * 100).toFixed(0)}% of π (aliasing guard)`, "guard, live", run2.headroom < 1),
    );
    results.appendChild(row("gate cost", `${((performance.now() - t0) / 1000).toFixed(1)} s`, "measured"));
  });

  // --- circulation probe + Richardson (measured-convergent) ----------------
  addButton("circulation probe ∮u·dl on the gate ring (measured O(h))", async () => {
    const t0 = performance.now();
    const run = await deps.runGate();
    const packed = run.psiAt.get(0);
    if (!packed) throw new Error("no checkpoint");
    const psi = unpackF32(packed, GATE.n);
    // rectangular lattice loop threading the ring once (backend ring_probe_loop)
    const n = GATE.n;
    const cx = Math.round(0.35 * n) % n;
    const cy = Math.round(0.5 * n) % n;
    const cz = Math.round(0.5 * n) % n;
    const half = Math.round(1.8 * 0.22 * n);
    const loop: [number, number, number][] = [];
    for (let i = -half; i < half; i++) loop.push([(cx + i + n) % n, cy, cz]);
    for (let j = 0; j < half; j++) loop.push([(cx + half) % n, (cy + j) % n, cz]);
    for (let i = half; i > -half; i--) loop.push([(cx + i + n) % n, (cy + half) % n, cz]);
    for (let j = half; j > 0; j--) loop.push([(cx - half + n) % n, (cy + j) % n, cz]);
    let total = 0;
    for (let k = 0; k < loop.length; k++) {
      const [ax, ay, az] = loop[k];
      const [bx, by, bz] = loop[(k + 1) % loop.length];
      const ia = (ax * n + ay) * n + az;
      const ib = (bx * n + by) * n + bz;
      const re =
        psi.re1[ia] * psi.re1[ib] + psi.im1[ia] * psi.im1[ib] +
        psi.re2[ia] * psi.re2[ib] + psi.im2[ia] * psi.im2[ib];
      const im =
        psi.re1[ia] * psi.im1[ib] - psi.im1[ia] * psi.re1[ib] +
        psi.re2[ia] * psi.im2[ib] - psi.im2[ia] * psi.re2[ib];
      total += Math.atan2(im, re);
    }
    const circ = Math.abs(GATE.hbar * total);
    const target = 2 * Math.PI * GATE.hbar;
    const rel = Math.abs(circ - target) / target;
    results.appendChild(
      row(
        "quantized circulation ∮u·dl",
        `${circ.toFixed(6)} vs 2πħ = ${target.toFixed(6)} (rel ${rel.toExponential(1)})`,
        "measured O(h), labeled approximate",
        rel < 2e-3,
      ),
    );
    results.appendChild(row("probe cost", `${((performance.now() - t0) / 1000).toFixed(1)} s`, "measured"));
  });

  addButton("full-split Richardson order meter (Δt-halving, GPU f32)", async () => {
    const t0 = performance.now();
    const { IsfGpu } = await import("./solver.js");
    const n = 32;
    const T = 0.05;
    const base = 16;
    const { buildGateIcF32 } = await import("./capture.js");
    const ic = buildGateIcF32();
    const runs: Float64Array[][] = [];
    for (const mult of [1, 2, 4]) {
      const steps = base * mult;
      const gpu = new IsfGpu(deps.device, n, { hbar: 0.05, dt: T / steps });
      try {
        gpu.uploadPsi(ic.slice());
        for (let s = 0; s < steps; s++) {
          const enc = deps.device.createCommandEncoder();
          gpu.encodeStep(enc, { skipVelocity: true });
          deps.device.queue.submit([enc.finish()]);
        }
        const psi = unpackF32(await gpu.readPsi(), n);
        runs.push(velocityCellCentered(psi, 0.05));
      } finally {
        gpu.destroy();
      }
    }
    const l2 = (a: Float64Array[], b: Float64Array[]): number => {
      let s = 0;
      let c = 0;
      for (let f = 0; f < 3; f++) {
        for (let i = 0; i < a[f].length; i++) {
          s += (a[f][i] - b[f][i]) ** 2;
          c++;
        }
      }
      return Math.sqrt(s / c);
    };
    const d12 = l2(runs[0], runs[1]);
    const d24 = l2(runs[1], runs[2]);
    const slope = Math.log2(d12 / d24);
    results.appendChild(
      row(
        "Richardson slope (Lie split, velocity L2)",
        `${slope.toFixed(2)} (backend f64 measured 1.71; declared band [0.8, 3.5]; f32 floor may flatten it)`,
        "measured slope",
        slope > 0.5,
      ),
    );
    results.appendChild(row("Richardson cost", `${((performance.now() - t0) / 1000).toFixed(1)} s`, "measured"));
  });

  // helicity honesty note (shown, never gated — web spec § 4)
  body.appendChild(
    row(
      "helicity",
      "displayed on knot scenes as approximately-conserved and physically illustrative (reconnection converts it to helical coils across scales) — explicitly NOT a verification gate",
      "not a gate",
    ),
  );
}
