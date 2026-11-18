// Buy More Digits (05-strange-attractors.md, the signature moment): each
// extra digit of precision (ε ÷ 10) is a new ball released from the same
// point, and the time it keeps its predictability is plotted against the
// digits. The points fall on a straight line whose slope is ln 10 / λ₁ —
// the visitor finds the Lyapunov exponent by experiment.

import type { PlotSeries } from "@bp/studio";
import { h, plotPanel } from "@bp/studio";
import { pow10 } from "./format.js";

export interface DigitsPoint {
  digits: number;
  horizon: number;
}

export interface DigitsHandlers {
  /** Release the next ball at `digits` from the scene's point. */
  buy: (digits: number) => void;
  /** Measure every precision from `from` to `to` off the frame loop. */
  measureAll: (from: number, to: number, onPoint: (p: DigitsPoint) => void) => Promise<void>;
  restart: () => void;
}

export interface DigitsPanel {
  el: HTMLElement;
  /** A measured horizon (live or from Measure). */
  add(p: DigitsPoint): void;
  /** The ball on screen: its precision, and whether it is still predictable. */
  setCurrent(digits: number, horizon: number | null): void;
  /** λ₁ from the f64 estimator (draws the theory slope). */
  setLambda(l1: number | null): void;
  clear(): void;
  points(): DigitsPoint[];
  fit(): { slope: number; intercept: number; r2: number } | null;
}

export const DIGITS_FIRST = 3;
export const DIGITS_LAST = 15;

/** Least-squares line through the points (null with fewer than two digits). */
export function fitLine(pts: readonly DigitsPoint[]): { slope: number; intercept: number; r2: number } | null {
  const xs = new Set(pts.map((p) => p.digits));
  if (xs.size < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.digits, 0) / n;
  const my = pts.reduce((s, p) => s + p.horizon, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    sxx += (p.digits - mx) ** 2;
    sxy += (p.digits - mx) * (p.horizon - my);
    syy += (p.horizon - my) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1 };
}

export function buildDigitsPanel(hd: DigitsHandlers): DigitsPanel {
  let pts: DigitsPoint[] = [];
  let lambda: number | null = null;
  let current = DIGITS_FIRST;
  const plot = plotPanel({
    title: "Predictable for how long, against digits of precision",
    xLabel: "digits",
    yLabel: "time to lose predictability",
    height: 132,
    formatX: (v) => v.toFixed(0),
    formatY: (v) => v.toFixed(0),
  });
  const status = h("p", { class: "cx-digits-status", role: "status" }, "");
  const result = h("p", { class: "cx-digits-result" }, "");
  const buy = h("button", { type: "button", class: "bp-btn bp-btn-primary", "data-cx": "buy" }, "Buy a digit");
  const measure = h("button", { type: "button", class: "bp-btn bp-btn-quiet", "data-cx": "measure" }, `Measure ${DIGITS_FIRST}–${DIGITS_LAST}`);
  const restart = h("button", { type: "button", class: "bp-btn bp-btn-quiet", "data-cx": "restart" }, "Start over");
  const el = h(
    "section",
    { class: "cx-digits bp-surface", "aria-label": "Buy More Digits", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    h("h2", { class: "cx-digits-title" }, "Buy More Digits"),
    status,
    plot.el,
    result,
    h("div", { class: "cx-digits-row" }, buy, measure, restart),
  );

  const draw = (): void => {
    const series: PlotSeries[] = [{ x: pts.map((p) => p.digits), y: pts.map((p) => p.horizon), style: "dots", label: "measured" }];
    // a fixed digits axis, 3 to 15 (an unlabelled series with no y values: it sets the x range only)
    if (pts.length) series.push({ x: [DIGITS_FIRST, DIGITS_LAST], y: [Number.NaN, Number.NaN], color: "transparent" });
    const f = fitLine(pts);
    if (f) {
      const x0 = Math.min(...pts.map((p) => p.digits));
      const x1 = Math.max(...pts.map((p) => p.digits));
      series.push({ x: [x0, x1], y: [f.intercept + f.slope * x0, f.intercept + f.slope * x1], label: "fit" });
      if (lambda && lambda > 0) {
        // the theory slope ln 10 / λ₁ through the measured centre
        const s = Math.LN10 / lambda;
        const mx = pts.reduce((a, p) => a + p.digits, 0) / pts.length;
        const my = pts.reduce((a, p) => a + p.horizon, 0) / pts.length;
        series.push({ x: [x0, x1], y: [my + s * (x0 - mx), my + s * (x1 - mx)], color: "rgba(160,170,190,0.75)", label: "ln 10 / λ₁" });
      }
    }
    plot.set(series);
    if (f) {
      const l = Math.LN10 / f.slope;
      result.textContent =
        `Each digit buys ${f.slope.toFixed(2)} time units, so λ₁ ≈ ln 10 / ${f.slope.toFixed(2)} = ${l.toFixed(3)}` +
        (lambda ? ` (Benettin, f64: ${lambda.toFixed(3)}, ln 10 / λ₁ = ${(Math.LN10 / lambda).toFixed(2)}).` : ".");
    } else {
      result.textContent = "Two precisions draw a line. Buy a digit, or measure them all.";
    }
  };

  buy.addEventListener("click", () => {
    const next = Math.min(current + 1, DIGITS_LAST);
    hd.buy(next);
  });
  restart.addEventListener("click", () => hd.restart());
  measure.addEventListener("click", () => {
    measure.disabled = true;
    buy.disabled = true;
    status.textContent = "Measuring every precision from the same point…";
    void hd
      .measureAll(DIGITS_FIRST, DIGITS_LAST, (p) => {
        pts = pts.filter((q) => q.digits !== p.digits);
        pts.push(p);
        pts.sort((a, b) => a.digits - b.digits);
        status.textContent = `Measured ${pow10(-p.digits)}: predictable until t = ${p.horizon.toFixed(1)}`;
        draw();
      })
      .finally(() => {
        measure.disabled = false;
        buy.disabled = false;
      });
  });
  draw();

  return {
    el,
    add(p) {
      pts = pts.filter((q) => q.digits !== p.digits);
      pts.push(p);
      pts.sort((a, b) => a.digits - b.digits);
      draw();
    },
    setCurrent(digits, horizon) {
      current = digits;
      const last = digits >= DIGITS_LAST;
      buy.textContent = last ? "Fifteen digits: the end of the line" : `Buy a digit (${pow10(-(digits + 1))})`;
      buy.disabled = last;
      buy.classList.toggle("bp-btn-primary", !last);
      buy.classList.toggle("bp-btn-quiet", last);
      status.textContent =
        horizon === null
          ? `A ball ${pow10(-digits)} wide is spreading…`
          : `${pow10(-digits)}: predictable until t = ${horizon.toFixed(1)}`;
    },
    setLambda(l1) {
      lambda = l1;
      draw();
    },
    clear() {
      pts = [];
      draw();
    },
    points: () => pts.slice(),
    fit: () => fitLine(pts),
  };
}
