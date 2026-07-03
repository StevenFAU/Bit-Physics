// Pedagogical instruments (feature-expansion-spec §§ 3.2/3.3 item 10) — the
// return map (z-maxima), Poincaré section, and parameter-sweep bifurcation
// diagram, generalized across the attractor registry.
//
// All measurement + canvas2d presentation over CPU readbacks of the DISPLAY
// trajectory (never the capture path). The bifurcation sweep re-dispatches
// the active system's committed kernel into scratch buffers — the PROVE
// "run it twice" dispatch pattern — one dispatch per swept value. The
// section plane and sweep parameter come from the attractor registry
// (attractors.ts) via the context main.ts passes on each Study measure.
//
// Nothing here animates on wall-clock: insets redraw on Study measurement
// (entry/param/system change) and on explicit button clicks, so poster/loop
// determinism is untouched.

export interface SectionLive {
  axis: 0 | 1 | 2;
  value: number;
  label: string;
}

export interface SweepSpecLive {
  /** Display label of the swept parameter (e.g. "ρ", "c"). */
  label: string;
  lo: number;
  hi: number;
}

export interface InstrumentContext {
  section: SectionLive;
  /** Live value of the swept parameter, for the marker; null = no sweep. */
  sweepCurrent: number | null;
}

export interface InstrumentDeps {
  /** Container group (panel.addGroup output). */
  group: HTMLElement;
  /** Integrate the ACTIVE system's committed kernel with the sweep
   *  parameter overridden to `value`, into a scratch buffer, and read it
   *  back. Never touches traj/liveTraj. */
  integrateSweep: (value: number, out: Float32Array) => Promise<void>;
  nPoints: number;
}

export interface Insets {
  /** Recompute + redraw from a fresh display-buffer readback. */
  update(all: Float32Array, ctx: InstrumentContext): void;
  /** Reconfigure (or disable) the bifurcation sweep — clears the cache. */
  setSweep(spec: SweepSpecLive | null): void;
}

const TRIM = 500; // skip the fall-in transient (same policy as measureFit)
const AXIS_NAME = ["x", "y", "z"] as const;

// successive local maxima of z(t) with parabolic refinement — measurement
// postprocessing of stored samples, not re-integration
function zMaxima(all: Float32Array, nPoints: number, from: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(from, 1); i < nPoints - 1; i += 1) {
    const a = all[(i - 1) * 3 + 2]!, b = all[i * 3 + 2]!, c = all[(i + 1) * 3 + 2]!;
    if (!(b > a && b >= c)) continue;
    const denom = a - 2 * b + c;
    out.push(denom === 0 ? b : b - ((a - c) * (a - c)) / (8 * denom));
  }
  return out;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  px: (x: number) => number;
  py: (y: number) => number;
}

function beginPlot(
  canvas: HTMLCanvasElement,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  xLabel: string,
  yLabel: string,
): Frame {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  const mL = 30, mB = 18, mT = 6, mR = 8;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cssVar("--line", "#2a3138");
  ctx.lineWidth = 1;
  ctx.strokeRect(mL + 0.5, mT + 0.5, w - mL - mR - 1, h - mT - mB - 1);
  ctx.fillStyle = cssVar("--faint", "#5a646e");
  ctx.font = "9px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(xLabel, mL + (w - mL - mR) / 2, h - 5);
  ctx.save();
  ctx.translate(9, mT + (h - mT - mB) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  ctx.textAlign = "left";
  ctx.fillText(x0.toFixed(0), mL, h - mB + 10);
  ctx.textAlign = "right";
  ctx.fillText(x1.toFixed(0), w - mR, h - mB + 10);
  const px = (x: number): number => mL + ((x - x0) / (x1 - x0 || 1)) * (w - mL - mR);
  const py = (y: number): number => h - mB - ((y - y0) / (y1 - y0 || 1)) * (h - mT - mB);
  return { ctx, w, h, px, py };
}

function emptyNote(f: Frame, msg: string): void {
  f.ctx.fillStyle = cssVar("--faint", "#5a646e");
  f.ctx.font = "10px ui-monospace, monospace";
  f.ctx.fillText(msg, 36, f.h / 2);
}

function makeInset(group: HTMLElement, title: string, hint: string, w = 248, h = 170): { canvas: HTMLCanvasElement; cap: HTMLDivElement } {
  const wrap = document.createElement("div");
  wrap.className = "lz-inset";
  const cap = document.createElement("div");
  cap.className = "lz-inset-cap";
  cap.textContent = title;
  cap.title = hint;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  wrap.append(cap, canvas);
  group.appendChild(wrap);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = cssVar("--faint", "#5a646e");
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillText("enter Study to measure", 12, h / 2);
  return { canvas, cap };
}

export function installInstruments(d: InstrumentDeps): Insets {
  const accent = (): string => cssVar("--accent", "#25c8b4");
  const warm = (): string => cssVar("--warm", "#e8a44c");

  // ---- return map: zₙ vs zₙ₊₁ ------------------------------------------
  const rm = makeInset(
    d.group,
    "return map — zₙ₊₁ vs zₙ",
    "Successive z-maxima of the displayed trajectory. For Lorenz this collapses to a near-1D tent — order hidden in chaos (Lorenz 1963).",
  );

  // ---- Poincaré section ---------------------------------------------------
  const pc = makeInset(
    d.group,
    "Poincaré section",
    "Points where the displayed trajectory crosses the registry-declared section plane for this system; the fractal cross-section of the attractor.",
  );

  // ---- bifurcation diagram ------------------------------------------------
  const bif = makeInset(
    d.group,
    "bifurcation — z-maxima vs parameter",
    "Sweeps the registry-declared parameter, re-integrating the active system's committed kernel into scratch buffers per value (the PROVE dispatch pattern), and plots the post-transient z-maxima. The vertical line is the live slider value.",
  );
  const bifBtn = document.createElement("button");
  bifBtn.type = "button";
  bifBtn.className = "bps-btn";
  const bifStatus = document.createElement("div");
  bifStatus.className = "lz-note-line";
  d.group.append(bifBtn, bifStatus);

  const BIF_COLS = 160;
  let sweep: SweepSpecLive | null = null;
  let bifImage: ImageData | null = null; // cached sweep pixels (sans marker)
  let bifRange: { yLo: number; yHi: number } | null = null;
  let sweepCurrent: number | null = null;
  let bifBusy = false;

  function applySweepUI(): void {
    if (!sweep) {
      bifBtn.style.display = "none";
      bifStatus.textContent = "no sweep parameter chartered for this system";
      bif.cap.textContent = "bifurcation — (no sweep for this system)";
      const f = beginPlot(bif.canvas, 0, 1, 0, 1, "", "z-max");
      emptyNote(f, "conservative system — no dissipative sweep");
      return;
    }
    bifBtn.style.display = "";
    bifBtn.textContent = `Compute bifurcation sweep (${sweep.label})`;
    bifBtn.title = `~${BIF_COLS} re-dispatches of the active committed kernel — a few seconds of GPU time.`;
    bifStatus.textContent = "on demand — heavier than the other instruments";
    bif.cap.textContent = `bifurcation — z-maxima vs ${sweep.label}`;
    const f = beginPlot(bif.canvas, sweep.lo, sweep.hi, 0, 1, sweep.label, "z-max");
    emptyNote(f, "not computed yet");
  }

  function drawBif(): void {
    if (!sweep) return;
    if (!bifImage || !bifRange) {
      applySweepUI();
      if (sweep && sweepCurrent !== null) {
        // marker over the empty frame so the coupling is visible pre-compute
        const f = beginPlot(bif.canvas, sweep.lo, sweep.hi, 0, 1, sweep.label, "z-max");
        emptyNote(f, "not computed yet");
        const x = f.px(Math.min(Math.max(sweepCurrent, sweep.lo), sweep.hi));
        f.ctx.strokeStyle = warm();
        f.ctx.beginPath();
        f.ctx.moveTo(x, 6);
        f.ctx.lineTo(x, f.h - 18);
        f.ctx.stroke();
      }
      return;
    }
    const f = beginPlot(bif.canvas, sweep.lo, sweep.hi, bifRange.yLo, bifRange.yHi, sweep.label, "z-max");
    f.ctx.putImageData(bifImage, 0, 0);
    if (sweepCurrent !== null) {
      const x = f.px(Math.min(Math.max(sweepCurrent, sweep.lo), sweep.hi));
      f.ctx.strokeStyle = warm();
      f.ctx.beginPath();
      f.ctx.moveTo(x, 6);
      f.ctx.lineTo(x, f.h - 18);
      f.ctx.stroke();
    }
  }

  async function computeBif(): Promise<void> {
    if (bifBusy || !sweep) return;
    const spec = sweep;
    bifBusy = true;
    bifBtn.disabled = true;
    const scratch = new Float32Array(d.nPoints * 3);
    try {
      // pass 1: collect columns (so the y-range adapts to the system)
      const columns: { v: number; maxima: number[] }[] = [];
      let yLo = Infinity, yHi = -Infinity;
      for (let c = 0; c < BIF_COLS; c += 1) {
        const v = spec.lo + ((spec.hi - spec.lo) * c) / (BIF_COLS - 1);
        await d.integrateSweep(v, scratch);
        const maxima = zMaxima(scratch, d.nPoints, Math.floor(d.nPoints / 2)).filter(Number.isFinite);
        for (const m of maxima) {
          if (m < yLo) yLo = m;
          if (m > yHi) yHi = m;
        }
        columns.push({ v, maxima });
        if (c % 8 === 0) bifStatus.textContent = `sweeping… ${spec.label} = ${v.toFixed(2)} (${c + 1}/${BIF_COLS})`;
      }
      if (!(yHi > yLo)) {
        bifStatus.textContent = "sweep produced no finite z-maxima";
        return;
      }
      const pad = (yHi - yLo) * 0.05;
      bifRange = { yLo: yLo - pad, yHi: yHi + pad };
      const f = beginPlot(bif.canvas, spec.lo, spec.hi, bifRange.yLo, bifRange.yHi, spec.label, "z-max");
      f.ctx.fillStyle = accent();
      f.ctx.globalAlpha = 0.28;
      for (const col of columns) {
        const x = f.px(col.v);
        for (const m of col.maxima) f.ctx.fillRect(x - 0.5, f.py(m) - 0.5, 1, 1);
      }
      f.ctx.globalAlpha = 1;
      bifImage = f.ctx.getImageData(0, 0, f.w, f.h);
      bifStatus.textContent = `swept ${spec.label} ∈ [${spec.lo}, ${spec.hi}] — committed kernel, ${BIF_COLS} scratch integrations`;
      drawBif();
    } catch (e) {
      bifStatus.textContent = `sweep failed: ${(e as Error).message}`;
    } finally {
      bifBusy = false;
      bifBtn.disabled = false;
    }
  }
  bifBtn.addEventListener("click", () => {
    void computeBif();
  });
  applySweepUI();

  return {
    setSweep(spec) {
      sweep = spec;
      bifImage = null;
      bifRange = null;
      applySweepUI();
    },

    update(all, ctx) {
      sweepCurrent = ctx.sweepCurrent;
      // return map (z-maxima — generic across the family)
      const maxima = zMaxima(all, d.nPoints, TRIM).filter(Number.isFinite);
      {
        let lo = Infinity, hi = -Infinity;
        for (const m of maxima) {
          if (m < lo) lo = m;
          if (m > hi) hi = m;
        }
        if (maxima.length < 3 || !(hi > lo)) {
          const f = beginPlot(rm.canvas, 0, 1, 0, 1, "zₙ", "zₙ₊₁");
          emptyNote(f, "too few z-maxima in this regime");
        } else {
          const pad = (hi - lo) * 0.06;
          const f = beginPlot(rm.canvas, lo - pad, hi + pad, lo - pad, hi + pad, "zₙ", "zₙ₊₁");
          f.ctx.strokeStyle = cssVar("--line", "#2a3138");
          f.ctx.beginPath();
          f.ctx.moveTo(f.px(lo - pad), f.py(lo - pad));
          f.ctx.lineTo(f.px(hi + pad), f.py(hi + pad));
          f.ctx.stroke();
          f.ctx.fillStyle = accent();
          for (let k = 0; k + 1 < maxima.length; k += 1) {
            f.ctx.fillRect(f.px(maxima[k]!) - 1, f.py(maxima[k + 1]!) - 1, 2, 2);
          }
        }
      }
      // Poincaré section at the registry plane
      {
        const sec = ctx.section;
        pc.cap.textContent = `Poincaré section — ${sec.label}`;
        const [ai, bi] = sec.axis === 0 ? [1, 2] : sec.axis === 1 ? [0, 2] : [0, 1];
        const cVal = sec.value;
        const xs: number[] = [], ys: number[] = [];
        for (let i = TRIM; i + 1 < d.nPoints; i += 1) {
          const s0 = all[i * 3 + sec.axis]!, s1 = all[(i + 1) * 3 + sec.axis]!;
          if ((s0 - cVal) * (s1 - cVal) > 0 || s0 === s1) continue;
          const t = (cVal - s0) / (s1 - s0);
          xs.push(all[i * 3 + ai]! + t * (all[(i + 1) * 3 + ai]! - all[i * 3 + ai]!));
          ys.push(all[i * 3 + bi]! + t * (all[(i + 1) * 3 + bi]! - all[i * 3 + bi]!));
        }
        let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity;
        for (let k = 0; k < xs.length; k += 1) {
          if (xs[k]! < xlo) xlo = xs[k]!;
          if (xs[k]! > xhi) xhi = xs[k]!;
          if (ys[k]! < ylo) ylo = ys[k]!;
          if (ys[k]! > yhi) yhi = ys[k]!;
        }
        if (xs.length < 3 || !(xhi > xlo) || !(yhi > ylo)) {
          const f = beginPlot(pc.canvas, 0, 1, 0, 1, AXIS_NAME[ai]!, AXIS_NAME[bi]!);
          emptyNote(f, "no plane crossings in this regime");
        } else {
          const padx = (xhi - xlo) * 0.08, pady = (yhi - ylo) * 0.08;
          const f = beginPlot(pc.canvas, xlo - padx, xhi + padx, ylo - pady, yhi + pady, AXIS_NAME[ai]!, AXIS_NAME[bi]!);
          f.ctx.fillStyle = accent();
          for (let k = 0; k < xs.length; k += 1) {
            f.ctx.fillRect(f.px(xs[k]!) - 1, f.py(ys[k]!) - 1, 2, 2);
          }
        }
      }
      // bifurcation marker follows the slider without recompute
      drawBif();
    },
  };
}
