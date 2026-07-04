// verify-panel.ts — the PROVE layer UI (spec § 4.3): live golden B-spline
// readout, partition-of-unity + fixed-point mass-conservation witnesses,
// deterministic-P2G run-twice SHA, per-material invariants, and the
// pointwise canonical-replay gate re-run with a per-checkpoint budget plot.

import V from "./generated/verification.json";
import type { MpmGpu } from "./solver.js";
import type { Checkpoint, CheckpointErrors, GateArtifacts } from "./gate.js";
import { sha256hex } from "./mirror.js";

export interface VerifyDeps {
  gpu: MpmGpu;
  container: HTMLElement;
  liveMaterials: () => Parameters<MpmGpu["setMaterials"]>[0];
  fetchIC: () => Promise<Float32Array>;
  fetchRefs: () => Promise<Float64Array>;
  computeGateArtifacts: (
    gpu: MpmGpu,
    mats: Parameters<MpmGpu["setMaterials"]>[0],
  ) => Promise<GateArtifacts>;
  runCanonicalReplay: (
    gpu: MpmGpu,
    ic: Float32Array,
    onProgress?: (step: number) => void,
  ) => Promise<Checkpoint[]>;
  checkpointErrors: (cps: Checkpoint[], refs: Float64Array) => CheckpointErrors;
  withExclusive: <T>(fn: () => Promise<T>) => Promise<T>;
  afterGpuUse: () => void; // restore the live scene's GPU configuration
  setVerdict: (v: { gate: string; verdict: string; pass: boolean }) => void;
  setStatus: (s: string) => void;
}

const ACCENT = "#4dd8c0";
const BAD = "#e05c5c";
const DIM = "#8aa0b8";

function row(
  parent: HTMLElement,
  label: string,
  value: string,
  pass: boolean | null,
  title?: string,
): HTMLDivElement {
  const div = document.createElement("div");
  div.style.cssText = "display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:1.5;";
  const l = document.createElement("span");
  l.textContent = label;
  l.style.color = DIM;
  if (title) div.title = title;
  const v = document.createElement("span");
  v.textContent = value;
  v.style.color = pass === null ? "#c8d4e0" : pass ? ACCENT : BAD;
  v.style.textAlign = "right";
  div.append(l, v);
  parent.appendChild(div);
  return div;
}

function button(parent: HTMLElement, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "bps-btn";
  b.textContent = label;
  b.style.marginTop = "6px";
  parent.appendChild(b);
  return b;
}

function exp(x: number): string {
  return x === 0 ? "0" : x.toExponential(2);
}

export function installVerifyPanel(deps: VerifyDeps): { runAll: () => Promise<boolean> } {
  const T = V.gate.thresholds;
  const box = deps.container;

  const intro = document.createElement("div");
  intro.style.cssText = `color:${DIM};font-size:11px;line-height:1.45;`;
  intro.textContent =
    "Every check below runs on YOUR GPU and binds to committed repo files " +
    "(shas verified at build). The gate: pointwise reproduction of the " +
    "committed 16-cube canonical + closed-form golden artifacts + " +
    "deterministic fixed-point P2G + per-material invariants.";
  box.appendChild(intro);

  const artOut = document.createElement("div");
  box.appendChild(artOut);
  const btnArt = button(box, "run proof suite (closed-form + invariants)");

  const replayOut = document.createElement("div");
  box.appendChild(replayOut);
  const twiceWrap = document.createElement("label");
  twiceWrap.style.cssText = `display:block;color:${DIM};font-size:11px;margin-top:6px;`;
  const twiceBox = document.createElement("input");
  twiceBox.type = "checkbox";
  twiceBox.checked = true;
  twiceWrap.append(twiceBox, document.createTextNode(" run twice (SHA-256 byte-identity)"));
  box.appendChild(twiceWrap);
  const btnReplay = button(box, "replay canonical vs committed capture");

  let artifactsPass: boolean | null = null;
  let replayPass: boolean | null = null;

  function verdict(): void {
    if (artifactsPass === null && replayPass === null) return;
    const parts: string[] = [];
    if (artifactsPass !== null) parts.push(`artifacts ${artifactsPass ? "PASS" : "FAIL"}`);
    if (replayPass !== null) parts.push(`replay ${replayPass ? "PASS" : "FAIL"}`);
    const pass = artifactsPass !== false && replayPass !== false;
    deps.setVerdict({
      gate: "new_canonical (golden B-spline + fixed-point determinism + pointwise capture + material invariants)",
      verdict: parts.join(" · "),
      pass,
    });
  }

  async function runArtifacts(): Promise<boolean> {
    artOut.textContent = "";
    deps.setStatus("running proof suite…");
    const a = await deps.withExclusive(() =>
      deps.computeGateArtifacts(deps.gpu, deps.liveMaterials()),
    );
    deps.afterGpuUse();

    const g64ok = a.goldenF64Dev <= T.golden_f64_abs && a.pouF64Dev <= T.golden_f64_abs;
    row(
      artOut,
      "golden B-spline (f64 mirror)",
      `max dev ${exp(a.goldenF64Dev)} ≤ ${exp(T.golden_f64_abs)} — ${g64ok ? "PASS" : "FAIL"}`,
      g64ok,
      "N(x) at the 10 committed sample points, IEEE-f64 in-page mirror vs the committed golden table (its own 1e-15 tolerance)",
    );
    const g32ok = a.goldenF32RelDev <= T.kernel_f32_rel;
    row(
      artOut,
      "golden B-spline (YOUR GPU, f32)",
      `rel dev ${exp(a.goldenF32RelDev)} ≤ ${exp(T.kernel_f32_rel)} — ${g32ok ? "PASS" : "FAIL"}`,
      g32ok,
      "The WGSL bspline_n evaluated on this device at the table points + a 256-point sweep (f32 rounding scope)",
    );
    const pouOk = a.pouGpuMaxDev <= T.pou_f32_abs;
    row(
      artOut,
      "partition of unity (GPU sweep)",
      `|Σw−1| ≤ ${exp(a.pouGpuMaxDev)} — ${pouOk ? "PASS" : "FAIL"}`,
      pouOk,
      "Σ of the 3 stencil weights at 259 positions — exact 1 in closed form",
    );
    const neo64ok = a.neoMirrorMaxAbs <= T.neo_f64_abs;
    row(
      artOut,
      "neo-Hookean fixture (f64 mirror)",
      `max |Δτ| ${exp(a.neoMirrorMaxAbs)} ≤ ${exp(T.neo_f64_abs)} — ${neo64ok ? "PASS" : "FAIL"}`,
      neo64ok,
      "16 committed F matrices (incl. one J<0 hitting the log_j=-30 guard) vs reference-computed stress",
    );
    const neo32ok = a.neoGpuMaxRel <= T.neo_f32_rel;
    row(
      artOut,
      "neo-Hookean stress (YOUR GPU, f32)",
      `rel dev ${exp(a.neoGpuMaxRel)} ≤ ${exp(T.neo_f32_rel)} — ${neo32ok ? "PASS" : "FAIL"}`,
      neo32ok,
    );
    const massOk =
      a.massLeakQuanta <= a.massLeakBoundQuanta &&
      a.momZLeakQuanta <= a.massLeakBoundQuanta;
    row(
      artOut,
      "fixed-point mass conservation",
      `leak ${a.massLeakQuanta} of ${a.massTotalQuanta} quanta (bound ${a.massLeakBoundQuanta}) — ${massOk ? "PASS" : "FAIL"}`,
      massOk,
      "One P2G of the canonical IC; integer quanta sums are EXACT in JS — the encoding provably does not leak mass beyond the 0.5-quanta-per-round bound",
    );
    row(
      artOut,
      "fixed-point momentum-z",
      `leak ${a.momZLeakQuanta} quanta — ${massOk ? "PASS" : "FAIL"}`,
      massOk,
    );
    const headOk = a.headroomRatio <= 1 / T.headroom_factor;
    row(
      artOut,
      "i32 overflow headroom (M=1e7)",
      `max cell ${(100 * a.headroomRatio).toFixed(2)}% of i32 — ${headOk ? "PASS" : "FAIL"}`,
      headOk,
      "Per-cell accumulation bound, the quantity that actually overflows (spec § 3.3) — measured, not assumed",
    );
    row(
      artOut,
      "snow invariant: σ(F_E) clamp",
      `σ ∈ [${a.snowSigmaMin.toFixed(5)}, ${a.snowSigmaMax.toFixed(5)}] ⊂ [${(1 - (deps.liveMaterials()[1]?.thetaC ?? 0)).toFixed(3)}, ${(1 + (deps.liveMaterials()[1]?.thetaS ?? 0)).toFixed(4)}]±slack — ${a.snowOk ? "PASS" : "FAIL"}`,
      a.snowOk,
      "64 trial F through the GPU return map; singular values recomputed in f64 FROM THE GPU OUTPUT (the shader is not trusted to grade itself)",
    );
    row(
      artOut,
      "sand invariant: tr(Hp)=tr(εp)",
      `Case III |Δ ln det| ≤ ${exp(a.sandCase3MaxDev)}; tip ortho ≤ ${exp(a.sandCase2OrthoDev)} — ${a.sandOk ? "PASS" : "FAIL"}`,
      a.sandOk,
      "Klar 2016 non-associative volume preservation (cone-face case) + stress-free cone-tip separation, via log-det identity in f64",
    );
    artifactsPass = g64ok && g32ok && pouOk && neo64ok && neo32ok && massOk && headOk && a.snowOk && a.sandOk;
    verdict();
    deps.setStatus(artifactsPass ? "proof suite: ALL PASS" : "proof suite: FAILURE — see rows");
    return artifactsPass;
  }

  async function runReplay(): Promise<boolean> {
    replayOut.textContent = "";
    const [ic, refs] = await Promise.all([deps.fetchIC(), deps.fetchRefs()]);
    const cps = await deps.withExclusive(() =>
      deps.runCanonicalReplay(deps.gpu, ic, (s) =>
        deps.setStatus(`canonical replay… step ${s}/50`),
      ),
    );
    const errs = deps.checkpointErrors(cps, refs);
    const pass = errs.worstRatio <= 1.0 && errs.finite;
    row(
      replayOut,
      "pointwise vs committed f64 capture",
      `worst ${(100 * errs.worstRatio).toFixed(1)}% of the rel=${V.gate.thresholds.traj_rel} budget — ${pass ? "PASS" : "FAIL"}`,
      pass,
      "ALL 5000 particles, position+velocity, at every committed checkpoint (steps 0–50)",
    );
    row(
      replayOut,
      "worst |Δpos| / |Δvel|",
      `${exp(errs.worst.position)} / ${exp(errs.worst.velocity)}`,
      null,
    );

    // per-checkpoint budget-ratio plot
    const canvas = document.createElement("canvas");
    const W = 252;
    const H = 84;
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.cssText = `width:${W}px;height:${H}px;display:block;margin-top:4px;`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(0, 0, W, H);
      const maxR = Math.max(1.05, errs.worstRatio * 1.15);
      const yOf = (r: number): number => H - 8 - (r / maxR) * (H - 16);
      ctx.strokeStyle = "rgba(224,92,92,0.5)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(24, yOf(1));
      ctx.lineTo(W - 4, yOf(1));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = DIM;
      ctx.font = "9px system-ui";
      ctx.fillText("budget", 2, yOf(1) + 3);
      ctx.strokeStyle = ACCENT;
      ctx.beginPath();
      errs.rows.forEach((r, i) => {
        const x = 24 + (i / Math.max(errs.rows.length - 1, 1)) * (W - 30);
        if (i === 0) ctx.moveTo(x, yOf(r.ratio));
        else ctx.lineTo(x, yOf(r.ratio));
      });
      ctx.stroke();
      errs.rows.forEach((r, i) => {
        const x = 24 + (i / Math.max(errs.rows.length - 1, 1)) * (W - 30);
        ctx.fillStyle = ACCENT;
        ctx.fillRect(x - 1.5, yOf(r.ratio) - 1.5, 3, 3);
        ctx.fillStyle = DIM;
        ctx.fillText(String(r.step), x - 6, H - 1);
      });
    }
    replayOut.appendChild(canvas);

    let twicePass: boolean | null = null;
    if (twiceBox.checked) {
      deps.setStatus("run-twice replay…");
      const cps2 = await deps.withExclusive(() => deps.runCanonicalReplay(deps.gpu, ic));
      const cat = (cs: Checkpoint[]): Float32Array => {
        const total = cs.reduce((acc, c) => acc + c.raw.length, 0);
        const buf = new Float32Array(total);
        let o = 0;
        for (const c of cs) {
          buf.set(c.raw, o);
          o += c.raw.length;
        }
        return buf;
      };
      const [h1, h2] = await Promise.all([sha256hex(cat(cps)), sha256hex(cat(cps2))]);
      twicePass = h1 === h2;
      row(
        replayOut,
        "run-twice SHA-256 (full state)",
        twicePass ? `${h1.slice(0, 20)}… ≡ IDENTICAL` : "MISMATCH",
        twicePass,
        "Fixed-point integer atomics make the P2G scatter order-independent — byte-identical re-runs on the same device (the determinism proof)",
      );
    }
    deps.afterGpuUse();
    replayPass = pass && twicePass !== false;
    verdict();
    deps.setStatus(replayPass ? "canonical replay: PASS" : "canonical replay: FAIL");
    return replayPass;
  }

  btnArt.addEventListener("click", () => {
    void runArtifacts().catch((e) => {
      deps.setStatus(`proof suite error: ${String(e)}`);
    });
  });
  btnReplay.addEventListener("click", () => {
    void runReplay().catch((e) => {
      deps.setStatus(`replay error: ${String(e)}`);
    });
  });

  return {
    runAll: async () => {
      const a = await runArtifacts();
      const r = await runReplay();
      return a && r;
    },
  };
}
