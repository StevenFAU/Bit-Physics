// Pedagogical instruments (feature-expansion-spec § 3.2) — Lane B.
//
// Return map (z-maxima), Poincaré section, and the ρ-sweep bifurcation
// diagram. All measurement + canvas2d presentation over CPU readbacks of the
// DISPLAY trajectory (never the capture path). The bifurcation sweep
// re-dispatches the COMMITTED Lorenz kernel into scratch buffers — the exact
// PROVE "run it twice" pattern (verify-panel.ts) — one dispatch per ρ.
//
// Nothing here animates on wall-clock: insets redraw on Study measurement
// (entry/param change) and on explicit button clicks, so poster/loop
// determinism is untouched.

export interface InstrumentDeps {
  /** Container group (panel.addGroup output). */
  group: HTMLElement;
  /** Integrate the committed kernel at the given ρ (current σ/β) into a
   *  scratch buffer and read it back. Never touches traj/liveTraj. */
  integrateScratch: (rho: number, out: Float32Array) => Promise<void>;
  nPoints: number;
  dt: number;
}

interface Insets {
  /** Recompute + redraw from a fresh display-buffer readback. */
  update(all: Float32Array, params: { sigma: number; rho: number; beta: number }): void;
}

const TRIM = 500; // skip the fall-in transient (same policy as measureFit)

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
  // data → pixel
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

function makeInset(group: HTMLElement, title: string, hint: string, w = 248, h = 170): HTMLCanvasElement {
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
  return canvas;
}

export function installInstruments(d: InstrumentDeps): Insets {
  const accent = (): string => cssVar("--accent", "#25c8b4");
  const warm = (): string => cssVar("--warm", "#e8a44c");

  // ---- return map: zₙ vs zₙ₊₁ ------------------------------------------
  const rmCanvas = makeInset(
    d.group,
    "return map — zₙ₊₁ vs zₙ",
    "Successive z-maxima of the displayed trajectory. For Lorenz this collapses to a near-1D tent — order hidden in chaos (Lorenz 1963).",
  );

  // ---- Poincaré section: crossings of z = ρ−1 -----------------------------
  const pcCanvas = makeInset(
    d.group,
    "Poincaré section — z = ρ−1",
    "Points where the displayed trajectory crosses the plane through the C± fixed-point height; the fractal cross-section of the attractor.",
  );

  // ---- bifurcation diagram: z-maxima vs ρ ---------------------------------
  const bifCanvas = makeInset(
    d.group,
    "bifurcation — z-maxima vs ρ",
    "Sweeps ρ, re-integrating the SAME committed kernel into scratch buffers per value (the PROVE dispatch pattern), and plots the post-transient z-maxima. The vertical line is the live slider ρ.",
  );
  const bifBtn = document.createElement("button");
  bifBtn.type = "button";
  bifBtn.className = "bps-btn";
  bifBtn.textContent = "Compute bifurcation sweep";
  bifBtn.title = "~160 re-dispatches of the committed kernel at the current σ/β — a few seconds of GPU time.";
  const bifStatus = document.createElement("div");
  bifStatus.className = "lz-note-line";
  bifStatus.textContent = "on demand — heavier than the other instruments";
  d.group.append(bifBtn, bifStatus);

  const BIF_RHO0 = 1, BIF_RHO1 = 250, BIF_COLS = 160;
  let bifImage: ImageData | null = null; // cached sweep pixels (sans marker)
  let bifParams = { sigma: 10, beta: 8 / 3 };
  let lastParams = { sigma: 10, rho: 28, beta: 8 / 3 };
  let bifBusy = false;

  function drawBif(): void {
    const f = beginPlot(bifCanvas, BIF_RHO0, BIF_RHO1, 0, 300, "ρ", "z-max");
    if (!bifImage) {
      f.ctx.fillStyle = cssVar("--faint", "#5a646e");
      f.ctx.font = "10px ui-monospace, monospace";
      f.ctx.fillText("not computed yet", 40, f.h / 2);
      return;
    }
    f.ctx.putImageData(bifImage, 0, 0);
    // live-ρ marker (the slider ↔ diagram coupling)
    const x = f.px(Math.min(Math.max(lastParams.rho, BIF_RHO0), BIF_RHO1));
    f.ctx.strokeStyle = warm();
    f.ctx.beginPath();
    f.ctx.moveTo(x, 6);
    f.ctx.lineTo(x, f.h - 18);
    f.ctx.stroke();
    if (bifParams.sigma !== lastParams.sigma || bifParams.beta !== lastParams.beta) {
      f.ctx.fillStyle = warm();
      f.ctx.font = "9px ui-monospace, monospace";
      f.ctx.fillText("σ/β changed — recompute", 36, 14);
    }
  }

  async function computeBif(): Promise<void> {
    if (bifBusy) return;
    bifBusy = true;
    bifBtn.disabled = true;
    bifParams = { sigma: lastParams.sigma, beta: lastParams.beta };
    const scratch = new Float32Array(d.nPoints * 3);
    // draw dots straight onto the canvas, then cache the image for marker redraws
    const f = beginPlot(bifCanvas, BIF_RHO0, BIF_RHO1, 0, 300, "ρ", "z-max");
    f.ctx.fillStyle = accent();
    f.ctx.globalAlpha = 0.28;
    try {
      for (let c = 0; c < BIF_COLS; c += 1) {
        const rho = BIF_RHO0 + ((BIF_RHO1 - BIF_RHO0) * c) / (BIF_COLS - 1);
        await d.integrateScratch(rho, scratch);
        const maxima = zMaxima(scratch, d.nPoints, Math.floor(d.nPoints / 2));
        const x = f.px(rho);
        for (const m of maxima) {
          if (!Number.isFinite(m)) continue;
          const y = f.py(Math.min(Math.max(m, 0), 300));
          f.ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
        }
        if (c % 8 === 0) bifStatus.textContent = `sweeping… ρ = ${rho.toFixed(1)} (${c + 1}/${BIF_COLS})`;
      }
      f.ctx.globalAlpha = 1;
      bifImage = f.ctx.getImageData(0, 0, f.w, f.h);
      bifStatus.textContent = `swept ρ ∈ [${BIF_RHO0}, ${BIF_RHO1}] at σ=${bifParams.sigma}, β=${bifParams.beta === 8 / 3 ? "8/3" : bifParams.beta} — committed kernel, ${BIF_COLS} scratch integrations`;
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

  return {
    update(all, params) {
      lastParams = { ...params };
      // return map
      const maxima = zMaxima(all, d.nPoints, TRIM).filter(Number.isFinite);
      {
        let lo = Infinity, hi = -Infinity;
        for (const m of maxima) {
          if (m < lo) lo = m;
          if (m > hi) hi = m;
        }
        if (maxima.length < 3 || !(hi > lo)) {
          const f = beginPlot(rmCanvas, 0, 1, 0, 1, "zₙ", "zₙ₊₁");
          f.ctx.fillStyle = cssVar("--faint", "#5a646e");
          f.ctx.font = "10px ui-monospace, monospace";
          f.ctx.fillText("too few z-maxima in this regime", 36, f.h / 2);
        } else {
          const pad = (hi - lo) * 0.06;
          const f = beginPlot(rmCanvas, lo - pad, hi + pad, lo - pad, hi + pad, "zₙ", "zₙ₊₁");
          // y = x reference — a fixed point of the map is a periodic orbit
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
      // Poincaré section at z = ρ−1
      {
        const c = params.rho - 1;
        const xs: number[] = [], ys: number[] = [];
        for (let i = TRIM; i + 1 < d.nPoints; i += 1) {
          const z0 = all[i * 3 + 2]!, z1 = all[(i + 1) * 3 + 2]!;
          if ((z0 - c) * (z1 - c) > 0 || z0 === z1) continue;
          const t = (c - z0) / (z1 - z0);
          xs.push(all[i * 3]! + t * (all[(i + 1) * 3]! - all[i * 3]!));
          ys.push(all[i * 3 + 1]! + t * (all[(i + 1) * 3 + 1]! - all[i * 3 + 1]!));
        }
        let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity;
        for (let k = 0; k < xs.length; k += 1) {
          if (xs[k]! < xlo) xlo = xs[k]!;
          if (xs[k]! > xhi) xhi = xs[k]!;
          if (ys[k]! < ylo) ylo = ys[k]!;
          if (ys[k]! > yhi) yhi = ys[k]!;
        }
        if (xs.length < 3 || !(xhi > xlo) || !(yhi > ylo)) {
          const f = beginPlot(pcCanvas, 0, 1, 0, 1, "x", "y");
          f.ctx.fillStyle = cssVar("--faint", "#5a646e");
          f.ctx.font = "10px ui-monospace, monospace";
          f.ctx.fillText("no plane crossings in this regime", 36, f.h / 2);
        } else {
          const padx = (xhi - xlo) * 0.08, pady = (yhi - ylo) * 0.08;
          const f = beginPlot(pcCanvas, xlo - padx, xhi + padx, ylo - pady, yhi + pady, "x", "y");
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
