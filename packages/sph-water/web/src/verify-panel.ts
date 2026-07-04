// PROVE layer (spec § 4.3) — the moat: every Tier-1 artifact is bound to a
// committed repo artifact and re-runnable on the visitor's GPU; Tier-2 is
// the live solver's self-consistency evidence, labeled beyond-reference.

import V from "./generated/verification.json";
import type { SphGpu, CheckpointData } from "./solver.js";
import type { GateArtifacts } from "./main.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

interface VerifyDeps {
  panel: PanelShell;
  gpu: SphGpu;
  fetchIC: () => Promise<Float32Array>;
  fetchRefs: () => Promise<Float64Array>;
  computeGateArtifacts: () => Promise<GateArtifacts>;
  checkpointErrors: (
    cps: CheckpointData[],
    refs: Float64Array,
  ) => {
    rows: { step: number; posAbs: number; velAbs: number; rhoAbs: number; ratio: number }[];
    worstRatio: number;
    worst: { position: number; velocity: number; density: number };
  };
  canon: {
    n: number;
    h: number;
    dt: number;
    gz: number;
    mass: number;
    steps: number;
    interval: number;
    stride: number;
  };
  subCount: number;
  // suspends the live loop while proof runs own the shared sim buffers
  withExclusive: <T>(fn: () => Promise<T>) => Promise<T>;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function scaledCanvas(parent: HTMLElement, w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  parent.appendChild(c);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return [c, ctx];
}

function dl(parent: HTMLElement): (label: string, value: string, title?: string) => HTMLElement {
  const list = document.createElement("dl");
  list.className = "bps-diag";
  parent.appendChild(list);
  return (label, value, title) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    if (title) dd.title = title;
    list.appendChild(dt);
    list.appendChild(dd);
    return dd;
  };
}

function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = "bps-input";
  b.style.cursor = "pointer";
  b.addEventListener("click", onClick);
  parent.appendChild(b);
  return b;
}

function note(parent: HTMLElement, text: string): void {
  const n = document.createElement("div");
  n.className = "bps-note";
  n.textContent = text;
  parent.appendChild(n);
}

async function sha256hex(data: ArrayBufferView): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function installVerifyPanel(deps: VerifyDeps): void {
  const { panel, gpu } = deps;
  const accent = cssVar("--accent", "#4dd8c0");
  const bad = cssVar("--bad", "#e05c5c");
  const warm = cssVar("--warm", "#d8b04d");

  // ---- verification card ------------------------------------------------------
  const card = panel.addGroup("verification — committed, not asserted");
  const row = dl(card);
  row("gate", "new_canonical", V.gate.criterion);
  row(
    "declared budget",
    `rel ${V.gate.declared_rel} abs ${V.gate.declared_abs}`,
    "tools/testkit/equivalence/tolerance.toml [defaults.sph] via [overrides.sph-water] — the category default, no widening",
  );
  const measured = V.gate.measured as { status: string; worst_ratio_of_budget?: number; provenance?: string };
  row(
    "measured (browser)",
    measured.status === "recorded"
      ? `worst ${(100 * (measured.worst_ratio_of_budget ?? 0)).toFixed(1)}% of budget (${measured.provenance ?? ""})`
      : "pending — run the gate below",
  );
  row("reference determinism", V.canonical.reference_determinism);
  row("browser posture", "device-scoped bit-exact; cross-device distributional", V.determinism.two_tier_note);
  row("canonical", `${V.canonical.descriptor} (100K, seed 42)`, `payload sha256 ${V.canonical.payload_sha256.slice(0, 16)}…`);
  row("canonical h", `${V.canonical.params_as_run.h}`, V.canonical.manifest_h_note);
  row("golden kernel table", `sha256 ${V.golden.kernel_table_sha256.slice(0, 12)}…`, V.links.golden_kernel);

  // ---- Tier 1: closed-form artifacts -------------------------------------------
  const t1 = panel.addGroup("proof — tier 1 (run it on your GPU)");
  note(
    t1,
    "Every check below binds to a committed artifact: the golden kernel table, the two-particle fixture, the reference-computed f64 fixtures, and the 100K canonical capture. Nothing is asserted that your GPU cannot re-derive.",
  );
  const artOut = document.createElement("div");
  const artRows = dl(artOut);
  const artBtn = button(t1, "run closed-form artifacts", () => void runArtifacts());
  t1.appendChild(artOut);

  async function runArtifacts(): Promise<void> {
    artBtn.disabled = true;
    artOut.querySelector("dl")?.replaceChildren();
    try {
      const a = await deps.computeGateArtifacts();
      const ok = (b: boolean) => (b ? "PASS" : "FAIL");
      const mark = (el: HTMLElement, b: boolean) => {
        el.style.color = b ? accent : bad;
      };
      let el = artRows(
        "golden kernel (f64 mirror)",
        `max dev ${a.goldenF64Dev.toExponential(2)} vs tol ${V.gate.thresholds.golden_f64_abs} — ${ok(a.goldenF64Dev <= V.gate.thresholds.golden_f64_abs)}`,
        "W and |∇W| at the 9 committed sample points, IEEE-f64 mirror vs tools/testkit/golden/tables/cubic-spline-kernel.json",
      );
      mark(el, a.goldenF64Dev <= V.gate.thresholds.golden_f64_abs);
      el = artRows(
        "golden kernel (WGSL f32)",
        `max rel ${a.goldenF32Rel.toExponential(2)} vs tol ${V.gate.thresholds.kernel_f32_rel} — ${ok(a.goldenF32Rel <= V.gate.thresholds.kernel_f32_rel)}`,
      );
      mark(el, a.goldenF32Rel <= V.gate.thresholds.kernel_f32_rel);
      const mAll =
        a.mirrorFlags.two && a.mirrorFlags.density64 && a.mirrorFlags.continuity64 && a.mirrorFlags.corrector8;
      el = artRows(
        "f64 mirror ≡ CPython",
        `two-particle ${a.mirrorFlags.two ? "✓" : "✗"} · density64 ${a.mirrorFlags.density64 ? "✓" : "✗"} · continuity64 ${a.mirrorFlags.continuity64 ? "✓" : "✗"} · corrector ${a.mirrorFlags.corrector8 ? "✓" : "✗"}`,
        "bit-exact (Object.is) against reference-computed fixtures committed at packages/sph-water/web/fixtures/reference-fixtures.json",
      );
      mark(el, mAll);
      el = artRows(
        "WGSL f32 corrector vs f64 mirror",
        `max |Δv| ${a.correctorGpuMaxAbs.toExponential(2)}`,
        "the simplified divergence corrector at fixture scale (measured f32 deviation, informational)",
      );
      el = artRows(
        "kernel normalization ΣW·V",
        `mean ${a.normMean.toFixed(6)} (dev ${Math.abs(a.normMean - 1).toExponential(2)} vs tol ${V.gate.thresholds.norm_tol}) — ${ok(Math.abs(a.normMean - 1) <= V.gate.thresholds.norm_tol)}`,
        "interior particles of a 20³ unit lattice; the discrete unit-volume integral of the kernel",
      );
      mark(el, Math.abs(a.normMean - 1) <= V.gate.thresholds.norm_tol);
      el = artRows(
        "grid ≡ brute (SHA-256)",
        a.hashBruteEqual ? `${a.gridSha.slice(0, 16)}… ≡ ${a.bruteSha.slice(0, 16)}…` : "MISMATCH",
        "i32 fixed-point density at N=4096 through the counting-sort grid and the O(n²) oracle — integer addition is order-independent, so byte equality proves identical neighbor sets",
      );
      mark(el, a.hashBruteEqual);
    } catch (e) {
      artRows("error", String(e));
    } finally {
      artBtn.disabled = false;
    }
  }

  // falsifiability probe
  const probeOut = document.createElement("div");
  const probeBtn = button(t1, "falsifiability probe: shrink grid cells below the support radius (must FAIL)", () =>
    void runProbe(),
  );
  t1.appendChild(probeOut);
  async function runProbe(): Promise<void> {
    probeBtn.disabled = true;
    probeOut.textContent = "running…";
    try {
      await deps.withExclusive(async () => {
      const n = 4096;
      const p = new Float32Array(n * 3);
      let st = 42 >>> 0;
      for (let i = 0; i < n * 3; i += 1) {
        st = (1664525 * st + 1013904223) >>> 0;
        p[i] = st / 4294967296;
      }
        const res = await gpu.runHashBrute(p, n, 0.05, { origin: [-0.1, -0.1, -0.1], dims: [12, 12, 12], cell: 0.1 }, { perturbGrid: true });
        const differs = !res.grid.every((v, i) => v === res.brute[i]);
        probeOut.textContent = differs
          ? "probe result: hashes DIVERGE (red) — the proof can fail, which is what makes the green state meaningful"
          : "probe result: UNEXPECTED MATCH — report this";
        probeOut.style.color = differs ? warm : bad;
      });
    } catch (e) {
      probeOut.textContent = String(e);
    } finally {
      probeBtn.disabled = false;
    }
  }

  // ---- Tier 1: the full gate replay ----------------------------------------------
  const t1b = panel.addGroup("proof — the gate itself (canonical capture reproduction)");
  note(
    t1b,
    "Replays the committed 100K IC through the reference integrator (1000 explicit-Euler gravity steps) and computes the density field with the optimized counting-sort search at the 11 committed checkpoints — then compares pointwise against the committed f64 capture on the committed ::16 subsample. This is the same criterion CI runs (verify.py _gate_sph_water). ~30-90 s depending on your GPU.",
  );
  const gateOut = document.createElement("div");
  const twiceLabel = document.createElement("label");
  const twiceBox = document.createElement("input");
  twiceBox.type = "checkbox";
  twiceLabel.appendChild(twiceBox);
  twiceLabel.appendChild(document.createTextNode(" run twice (determinism SHA)"));
  t1b.appendChild(twiceLabel);
  const gateBtn = button(t1b, "RUN THE GATE (on your GPU)", () => void runGate());
  t1b.appendChild(gateOut);

  async function replayOnce(ic: Float32Array, label: string): Promise<CheckpointData[]> {
    const res = await gpu.runCanonicalReplay(ic, {
      h: deps.canon.h,
      dt: deps.canon.dt,
      gz: deps.canon.gz,
      mass: deps.canon.mass,
      steps: deps.canon.steps,
      interval: deps.canon.interval,
      stride: deps.canon.stride,
      onProgress: (s) => panel.setStatus(`${label}: step ${s}/1000`),
    });
    if (res.sortSaturated) throw new Error("cell-sort saturation flag set (posture downgrade)");
    return res.checkpoints;
  }

  async function runGate(): Promise<void> {
    gateBtn.disabled = true;
    gateOut.replaceChildren();
    try {
      await deps.withExclusive(() => runGateInner());
    } catch (e) {
      const err = document.createElement("div");
      err.textContent = String(e);
      err.style.color = bad;
      gateOut.appendChild(err);
    } finally {
      gateBtn.disabled = false;
    }
  }

  async function runGateInner(): Promise<void> {
    {
      const [ic, refs] = await Promise.all([deps.fetchIC(), deps.fetchRefs()]);
      const cps = await replayOnce(ic, "gate replay");
      const errs = deps.checkpointErrors(cps, refs);
      const pass = errs.worstRatio <= 1.0;
      const head = document.createElement("div");
      head.textContent = pass
        ? `[PASS] worst error ${(errs.worstRatio * 100).toFixed(1)}% of the declared rel=${V.gate.declared_rel} budget`
        : `[FAIL] ${errs.worstRatio.toFixed(2)}× the declared budget`;
      head.style.color = pass ? accent : bad;
      gateOut.appendChild(head);
      const rows = dl(gateOut);
      rows("worst |Δposition|", errs.worst.position.toExponential(3));
      rows("worst |Δvelocity|", errs.worst.velocity.toExponential(3));
      rows("worst |Δdensity|", errs.worst.density.toExponential(3));
      // per-checkpoint ratio plot
      const W = 252;
      const H = 96;
      const [, ctx] = scaledCanvas(gateOut, W, H);
      const maxRatio = Math.max(1.15, errs.worstRatio * 1.1);
      const yBudget = H - 10 - (1.0 / maxRatio) * (H - 16);
      ctx.strokeStyle = warm;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(28, yBudget);
      ctx.lineTo(W - 6, yBudget);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cssVar("--dim", "#8ba0ad");
      ctx.font = "9px monospace";
      ctx.fillText("budget", 2, yBudget + 3);
      ctx.strokeStyle = accent;
      ctx.beginPath();
      errs.rows.forEach((r, i) => {
        // linear map: ratio 0 -> baseline, ratio maxRatio -> top
        const x = 28 + (i / (errs.rows.length - 1)) * (W - 36);
        const yy = H - 10 - (r.ratio / maxRatio) * (H - 16);
        if (i === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      });
      ctx.stroke();
      if (twiceBox.checked) {
        if (!("subtle" in crypto)) {
          note(gateOut, "hashing needs a secure context (https or localhost)");
        } else {
          panel.setStatus("run-twice: second replay…");
          const cps2 = await replayOnce(ic, "run-twice replay");
          const cat = (cs: CheckpointData[]) => {
            const total = cs.reduce((acc, c) => acc + c.position.length + c.velocity.length + c.density.length, 0);
            const buf = new Float32Array(total);
            let o = 0;
            for (const c of cs) {
              buf.set(c.position, o);
              o += c.position.length;
              buf.set(c.velocity, o);
              o += c.velocity.length;
              buf.set(c.density, o);
              o += c.density.length;
            }
            return buf;
          };
          const [h1, h2] = await Promise.all([sha256hex(cat(cps)), sha256hex(cat(cps2))]);
          const same = h1 === h2;
          const trow = dl(gateOut);
          const el = trow("run-twice SHA-256", same ? `${h1.slice(0, 20)}… (byte-identical)` : `${h1.slice(0, 12)}… ≠ ${h2.slice(0, 12)}…`);
          el.style.color = same ? accent : bad;
        }
      }
      panel.setStatus(pass ? "gate: PASS on this device" : "gate: FAIL on this device");
    }
  }

  // ---- Tier 2 ----------------------------------------------------------------------
  const t2 = panel.addGroup("tier 2 — live solver diagnostics (beyond-reference)");
  note(
    t2,
    "The playground's full DFSPH dual solver, walls, XSPH viscosity, and impulses go beyond the committed Phase-1 reference — their evidence is self-consistency, not the gate: the Study-mode readout shows the constant-density error the pressure solve drives down each frame, exact total mass (∑m is exact by construction), and the CFL number. Flip the warm-start toggle in `simulation` to reproduce the Carensac 2022 cyclic compression–decompression instability — a PROVE artifact that can visibly fail is the credibility engine.",
  );
}
