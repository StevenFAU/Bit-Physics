// M2's floating panels (05-strange-attractors.md, Scenes): Road to Chaos's
// bifurcation diagram, Lorenz's Map and Slice's section. Each is a heat map
// drawn straight from GPU counts (render/hist-view.ts) with a 2D overlay
// for the axes, markers and the pointer's readout. Every panel also has a
// keyboard path (a slider) for what the pointer does on the picture.

import { h, segmented, slider } from "@bp/studio";
import type { LorenzParams, V3 } from "./model/lorenz.js";
import { DT, rk4Step } from "./model/lorenz.js";
import { peakOf } from "./model/observe-f64.js";
import { RY0, RY1, Y0, Y1 } from "./model/bifurcation.js";
import type { HistView } from "./render/hist-view.js";

const css = (name: string, fallback: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** A heat map with an overlay canvas on top (pointer events land on the overlay). */
function figure(view: HistView, label: string): { el: HTMLElement; overlay: HTMLCanvasElement; ctx: () => CanvasRenderingContext2D | null; size: () => { w: number; hgt: number } } {
  const overlay = h("canvas", { class: "cx-hist-overlay", role: "img", "aria-label": label });
  const el = h("div", { class: "cx-fig" }, view.canvas, overlay);
  const ctx = (): CanvasRenderingContext2D | null => {
    const r = overlay.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const hh = Math.max(1, Math.round(r.height * dpr));
    if (overlay.width !== w || overlay.height !== hh) {
      overlay.width = w;
      overlay.height = hh;
    }
    const c = overlay.getContext("2d");
    c?.setTransform(dpr, 0, 0, dpr, 0, 0);
    c?.clearRect(0, 0, r.width, r.height);
    return c;
  };
  const size = (): { w: number; hgt: number } => {
    const r = overlay.getBoundingClientRect();
    return { w: r.width, hgt: r.height };
  };
  return { el, overlay, ctx, size };
}

function axisText(c: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = "left"): void {
  c.font = `10px "IBM Plex Mono", ui-monospace, monospace`;
  c.textAlign = align;
  c.fillStyle = "rgba(0,0,0,0.55)";
  const w = c.measureText(text).width;
  const x0 = align === "right" ? x - w - 2 : align === "center" ? x - w / 2 - 2 : x - 2;
  c.fillRect(x0, y - 10, w + 4, 13);
  c.fillStyle = css("--bp-text-dim", "#c3cbd2");
  c.fillText(text, x, y);
}

// ------------------------------------------------------------ Road to Chaos --

export interface RoadRange {
  id: string;
  label: string;
  rho0: number;
  rho1: number;
}

export const ROAD_RANGES: readonly RoadRange[] = [
  { id: "all", label: "ρ 20–250", rho0: 20, rho1: 250 },
  { id: "near100", label: "ρ 99–101.5", rho0: 99, rho1: 101.5 },
  { id: "high", label: "ρ 140–240", rho0: 140, rho1: 240 },
];

/** Rössler's road (a = b = 0.2): its period doubling, the whole sweep, and the windows past the first chaos. */
export const ROSSLER_RANGES: readonly RoadRange[] = [
  { id: "c-doubling", label: "c 2–6.5", rho0: 2, rho1: 6.5 },
  { id: "c-wide", label: "c 2–18", rho0: 2, rho1: 18 },
  { id: "c-high", label: "c 6.5–10", rho0: 6.5, rho1: 10 },
];

export type RoadSystem = "lorenz" | "rossler";

/** Each road's axis: the swept parameter, the observable and its ticks. */
const ROAD_AXIS: Record<RoadSystem, { sym: string; y0: number; y1: number; ticks: number[]; label: string }> = {
  lorenz: { sym: "ρ", y0: Y0, y1: Y1, ticks: [1, 1.25, 1.5], label: "z peak / ρ" },
  rossler: { sym: "c", y0: RY0, y1: RY1, ticks: [0.5, 1, 1.5, 2], label: "x peak / c" },
};

export interface RoadPanel {
  el: HTMLElement;
  setRho(rho: number): void;
  setRange(r: RoadRange): void;
  setSystem(sys: RoadSystem): void;
  setStatus(text: string): void;
  draw(): void;
  range(): RoadRange;
}

export function buildRoadPanel(
  view: HistView,
  hd: { pick: (v: number) => void; range: (r: RoadRange) => void; system: (sys: RoadSystem) => void },
): RoadPanel {
  let sys: RoadSystem = "lorenz";
  let range = ROAD_RANGES[0]!;
  let rho = 28;
  let hover: { x: number; y: number } | null = null;
  const fig = figure(view, "Bifurcation diagram: the peaks of trajectories against the swept parameter. Click to go there.");
  const status = h("p", { class: "cx-panel-status", role: "status" }, "");
  const title = h("h2", { class: "cx-panel-title" }, "z peaks against ρ");
  const which = segmented(
    "Which road",
    [
      { value: "lorenz", label: "Lorenz" },
      { value: "rossler", label: "Rössler" },
    ],
    sys,
    (v) => hd.system(v as RoadSystem),
  );
  // one range control and one "go to" slider per road (their labels and limits differ)
  const ranges = {
    lorenz: segmented("Range of ρ", ROAD_RANGES.map((r) => ({ value: r.id, label: r.label })), ROAD_RANGES[0]!.id, (id) => hd.range(ROAD_RANGES.find((r) => r.id === id)!)),
    rossler: segmented("Range of c", ROSSLER_RANGES.map((r) => ({ value: r.id, label: r.label })), ROSSLER_RANGES[0]!.id, (id) => hd.range(ROSSLER_RANGES.find((r) => r.id === id)!)),
  };
  const goes = {
    lorenz: slider({ label: "Go to ρ", symbol: "ρ", min: 20, max: 250, step: 0.05, value: 28, format: (v) => v.toFixed(2), onInput: () => {}, onCommit: (v) => hd.pick(v) }),
    rossler: slider({ label: "Go to c", symbol: "c", min: 2, max: 6.5, step: 0.005, value: 5.7, format: (v) => v.toFixed(3), onInput: () => {}, onCommit: (v) => hd.pick(v) }),
  };
  const el = h(
    "section",
    { class: "cx-panel cx-panel-wide bp-surface", "aria-label": "Road to Chaos", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    title,
    status,
    fig.el,
    h("div", { class: "cx-panel-row" }, which.el, ranges.lorenz.el, ranges.rossler.el),
    goes.lorenz.el,
    goes.rossler.el,
  );
  const showSystem = (): void => {
    ranges.lorenz.el.hidden = sys !== "lorenz";
    ranges.rossler.el.hidden = sys !== "rossler";
    goes.lorenz.el.hidden = sys !== "lorenz";
    goes.rossler.el.hidden = sys !== "rossler";
    title.textContent = sys === "lorenz" ? "z peaks against ρ" : "x peaks against c";
  };
  showSystem();
  const rhoAt = (x: number): number => {
    const { w } = fig.size();
    return range.rho0 + (Math.min(Math.max(x, 0), w) / Math.max(w, 1)) * (range.rho1 - range.rho0);
  };
  const digits = (): number => (sys === "rossler" ? 3 : 2);
  fig.overlay.addEventListener("click", (e) => {
    const r = fig.overlay.getBoundingClientRect();
    hd.pick(Number(rhoAt(e.clientX - r.left).toFixed(digits())));
  });
  fig.overlay.addEventListener("pointermove", (e) => {
    const r = fig.overlay.getBoundingClientRect();
    hover = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  fig.overlay.addEventListener("pointerleave", () => (hover = null));
  const draw = (): void => {
    const c = fig.ctx();
    if (!c) return;
    const { w, hgt } = fig.size();
    const ax = ROAD_AXIS[sys];
    // ticks: the swept parameter along the bottom, the observable up the side
    const span = range.rho1 - range.rho0;
    const step = span > 100 ? 50 : span > 20 ? 10 : span > 8 ? 2 : span > 3 ? 1 : span > 1.2 ? 0.5 : 0.25;
    for (let v = Math.ceil(range.rho0 / step) * step; v <= range.rho1 + 1e-9; v += step) {
      const x = ((v - range.rho0) / span) * w;
      c.fillStyle = "rgba(255,255,255,0.14)";
      c.fillRect(x, hgt - 4, 1, 4);
      // the end ticks stay inside the figure
      const label = String(Number(v.toFixed(2)));
      if (x > w - 16) axisText(c, label, w - 2, hgt - 6, "right");
      else axisText(c, label, Math.max(x, 12), hgt - 6, "center");
    }
    for (const y of ax.ticks) {
      const py = hgt * (1 - (y - ax.y0) / (ax.y1 - ax.y0));
      // a short figure has no room for a level label above the parameter's ticks
      if (py + 4 < hgt - 18 && py > 12) axisText(c, y.toFixed(2), 3, py + 4);
    }
    axisText(c, ax.label, w - 4, 12, "right");
    // the value on screen
    if (rho >= range.rho0 && rho <= range.rho1) {
      const x = ((rho - range.rho0) / span) * w;
      c.fillStyle = css("--bp-accent", "#e8c88f");
      c.fillRect(x - 0.75, 0, 1.5, hgt);
      axisText(c, `${ax.sym} ${rho.toFixed(digits())}`, Math.min(Math.max(x, 40), w - 40), 24, "center");
    }
    if (hover) {
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.fillRect(hover.x, 0, 1, hgt);
      axisText(c, `${ax.sym} ${rhoAt(hover.x).toFixed(digits())} · ${(ax.y0 + (1 - hover.y / hgt) * (ax.y1 - ax.y0)).toFixed(3)}`, Math.min(Math.max(hover.x, 70), w - 70), hgt - 20, "center");
    }
  };
  return {
    el,
    setRho(r) {
      rho = r;
      const g = goes[sys];
      g.set(Math.min(Math.max(r, range.rho0), range.rho1));
    },
    setRange(r) {
      range = r;
      ranges[sys].set(r.id);
      const g = goes[sys];
      g.input.min = String(r.rho0);
      g.input.max = String(r.rho1);
      g.set(Math.min(Math.max(rho, r.rho0), r.rho1));
    },
    setSystem(s2) {
      sys = s2;
      which.set(s2);
      showSystem();
    },
    setStatus(t) {
      status.textContent = t;
    },
    draw,
    range: () => range,
  };
}

// ------------------------------------------------------------ Lorenz's Map --

export interface MapPanel {
  el: HTMLElement;
  setBox(lo: number, hi: number): void;
  setStatus(text: string): void;
  /** Step the cobweb's own f64 trajectory (its last few peaks are drawn on the map). */
  advance(p: LorenzParams, steps: number): void;
  restartTracer(): void;
  draw(): void;
  /** The tracer's peaks so far (tests). */
  peaks(): number[];
}

export function buildMapPanel(view: HistView): MapPanel {
  let lo = 29;
  let hi = 48;
  let hover: { x: number; y: number } | null = null;
  const fig = figure(view, "Lorenz's map: each z peak against the one before it, from half a million points on the attractor.");
  const status = h("p", { class: "cx-panel-status", role: "status" }, "");
  const el = h(
    "section",
    { class: "cx-panel bp-surface", "aria-label": "Lorenz's Map", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    h("h2", { class: "cx-panel-title" }, "Each peak against the last"),
    status,
    fig.el,
    h(
      "p",
      { class: "cx-panel-note" },
      "Lorenz's own plot (1963): the next peak of z follows from the last along one curve, steeper than the diagonal everywhere — so nearby peaks are pushed apart. The lines are one trajectory hopping along it.",
    ),
  );
  fig.overlay.addEventListener("pointermove", (e) => {
    const r = fig.overlay.getBoundingClientRect();
    hover = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  fig.overlay.addEventListener("pointerleave", () => (hover = null));
  // the cobweb's own trajectory, f64
  let x: V3 = [1, 1, 20];
  let z0 = 0;
  let z1 = 0;
  let seen = 0;
  let peaks: number[] = [];
  const restartTracer = (): void => {
    x = [1, 1, 20];
    z0 = z1 = 0;
    seen = 0;
    peaks = [];
  };
  const draw = (): void => {
    const c = fig.ctx();
    if (!c) return;
    const { w, hgt } = fig.size();
    const X = (z: number): number => ((z - lo) / (hi - lo)) * w;
    const Y = (z: number): number => hgt * (1 - (z - lo) / (hi - lo));
    // the diagonal z_{n+1} = z_n
    c.strokeStyle = "rgba(255,255,255,0.22)";
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(X(lo), Y(lo));
    c.lineTo(X(hi), Y(hi));
    c.stroke();
    c.setLineDash([]);
    // the cobweb: the last few peaks
    const last = peaks.slice(-7);
    if (last.length >= 2) {
      c.strokeStyle = css("--bp-accent", "#e8c88f");
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(X(last[0]!), Y(last[0]!));
      for (let i = 0; i + 1 < last.length; i += 1) {
        c.lineTo(X(last[i]!), Y(last[i + 1]!));
        c.lineTo(X(last[i + 1]!), Y(last[i + 1]!));
      }
      c.stroke();
      const n = last.length;
      c.fillStyle = css("--bp-accent", "#e8c88f");
      c.beginPath();
      c.arc(X(last[n - 2]!), Y(last[n - 1]!), 3, 0, Math.PI * 2);
      c.fill();
    }
    const step = hi - lo > 30 ? 10 : 5;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      axisText(c, String(v), X(v), hgt - 4, "center");
      axisText(c, String(v), 3, Y(v) + 4);
    }
    axisText(c, "next peak", w - 4, 12, "right");
    axisText(c, "this peak →", w - 4, hgt - 18, "right");
    if (hover) axisText(c, `${(lo + (hover.x / w) * (hi - lo)).toFixed(2)} → ${(lo + (1 - hover.y / hgt) * (hi - lo)).toFixed(2)}`, Math.min(Math.max(hover.x, 60), w - 60), Math.max(hover.y - 8, 26), "center");
  };
  return {
    el,
    setBox(a, b) {
      lo = a;
      hi = b;
    },
    setStatus(t) {
      status.textContent = t;
    },
    advance(p, steps) {
      for (let i = 0; i < steps; i += 1) {
        x = rk4Step(p, x, DT).next;
        const z2 = x[2];
        if (seen >= 2 && z1 > z0 && z1 >= z2) {
          peaks.push(peakOf(z0, z1, z2));
          if (peaks.length > 64) peaks = peaks.slice(-16);
        }
        z0 = z1;
        z1 = z2;
        seen += 1;
      }
    },
    restartTracer,
    draw,
    peaks: () => peaks.slice(),
  };
}

// ------------------------------------------------------------------- Slice --

export interface SlicePanel {
  el: HTMLElement;
  setBox(box: [number, number, number, number], plane: number, zRange: [number, number]): void;
  setStatus(text: string): void;
  draw(): void;
}

export function buildSlicePanel(view: HistView, hd: { plane: (h: number) => void }): SlicePanel {
  let box: [number, number, number, number] = [-20, 20, -20, 20];
  let plane = 27;
  let hover: { x: number; y: number } | null = null;
  const fig = figure(view, "The section: where the attractor crosses the cutting plane, going up.");
  const status = h("p", { class: "cx-panel-status", role: "status" }, "");
  const cut = slider({
    label: "Cut at height",
    symbol: "z",
    min: 5,
    max: 50,
    step: 0.1,
    value: plane,
    format: (v) => v.toFixed(1),
    onInput: (v) => hd.plane(v),
  });
  const el = h(
    "section",
    { class: "cx-panel bp-surface", "aria-label": "Slice", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    h("h2", { class: "cx-panel-title" }, "The cut, seen from above"),
    status,
    fig.el,
    cut.el,
    h(
      "p",
      { class: "cx-panel-note" },
      "Each wing crosses the plane as a thin line: the attractor is nearly a surface. Nearly — each line is a stack of lines, but far too fine to draw: every turn round a wing squeezes the layers tens of thousands of times thinner (e^(λ₃ × 0.75), with λ₃ ≈ −14.6 and 0.75 the mean time between turns).",
    ),
  );
  fig.overlay.addEventListener("pointermove", (e) => {
    const r = fig.overlay.getBoundingClientRect();
    hover = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  fig.overlay.addEventListener("pointerleave", () => (hover = null));
  const draw = (): void => {
    const c = fig.ctx();
    if (!c) return;
    const { w, hgt } = fig.size();
    const [x0, x1, y0, y1] = box;
    const step = x1 - x0 > 30 ? 10 : 5;
    for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) axisText(c, String(v), ((v - x0) / (x1 - x0)) * w, hgt - 4, "center");
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) axisText(c, String(v), 3, hgt * (1 - (v - y0) / (y1 - y0)) + 4);
    axisText(c, `x →  ·  y ↑  ·  z = ${plane.toFixed(1)}`, w - 4, 12, "right");
    if (hover) axisText(c, `x ${(x0 + (hover.x / w) * (x1 - x0)).toFixed(2)}, y ${(y0 + (1 - hover.y / hgt) * (y1 - y0)).toFixed(2)}`, Math.min(Math.max(hover.x, 60), w - 60), Math.max(hover.y - 8, 26), "center");
  };
  return {
    el,
    setBox(b, p, zr) {
      box = [...b];
      plane = p;
      cut.input.min = String(zr[0]);
      cut.input.max = String(zr[1]);
      cut.set(p);
    },
    setStatus(t) {
      status.textContent = t;
    },
    draw,
  };
}
