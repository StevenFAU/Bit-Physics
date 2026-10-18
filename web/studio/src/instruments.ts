// Instruments (00-foundation.md § 2.3): ColorScale (legend with units),
// Sparkline, PlotPanel (axes, ticks, units, hover readout), Readout rows.
// Canvas-2D, sized to the element at devicePixelRatio, redrawn on demand.

import { fmtNum, h } from "./dom.js";

export interface ColorScale {
  el: HTMLElement;
  set(gradientCss: string, lo: string, hi: string, label: string): void;
}

export function colorScale(gradientCss: string, lo: string, hi: string, label: string): ColorScale {
  const bar = h("div", { class: "bp-scale-bar", "aria-hidden": "true" });
  const loEl = h("span", { class: "bp-scale-lo" });
  const hiEl = h("span", { class: "bp-scale-hi" });
  const labelEl = h("span", { class: "bp-scale-label" });
  const el = h("figure", { class: "bp-scale" }, bar, h("figcaption", {}, loEl, labelEl, hiEl));
  const set = (g: string, l: string, hi2: string, lab: string): void => {
    bar.style.background = g;
    loEl.textContent = l;
    hiEl.textContent = hi2;
    labelEl.textContent = lab;
    el.setAttribute("aria-label", `Colour scale: ${lab}, from ${l} to ${hi2}`);
  };
  set(gradientCss, lo, hi, label);
  return { el, set };
}

function fitCanvas(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const hh = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== hh) {
    c.width = w;
    c.height = hh;
  }
  const ctx = c.getContext("2d");
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

const css = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export interface Sparkline {
  el: HTMLElement;
  push(v: number): void;
  clear(): void;
}

/** A labelled sparkline with the latest value in Plex Mono. */
export function sparkline(label: string, unit: string, capacity = 120, digits = 3): Sparkline {
  const values: number[] = [];
  const canvas = h("canvas", { class: "bp-spark-canvas", "aria-hidden": "true" });
  const value = h("span", { class: "bp-spark-value" }, "—");
  const el = h(
    "div",
    { class: "bp-spark", role: "group", "aria-label": label },
    h("div", { class: "bp-spark-head" }, h("span", { class: "bp-spark-label" }, label), value),
    canvas,
  );
  const draw = (): void => {
    const ctx = fitCanvas(canvas);
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    if (values.length < 2) return;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    if (hi - lo < 1e-12) {
      hi += 0.5;
      lo -= 0.5;
    }
    ctx.strokeStyle = css("--bp-accent", "#e8c88f");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / (capacity - 1)) * r.width;
      const y = r.height - 2 - ((v - lo) / (hi - lo)) * (r.height - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  return {
    el,
    push(v: number) {
      values.push(v);
      if (values.length > capacity) values.shift();
      value.textContent = `${fmtNum(v, digits)}${unit ? ` ${unit}` : ""}`;
      draw();
    },
    clear() {
      values.length = 0;
      value.textContent = "—";
      draw();
    },
  };
}

export interface PlotSeries {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  color?: string;
  /** "line" (default) or "dots" — e.g. measurements over a predicted curve. */
  style?: "line" | "dots";
  /** Legend label, drawn top-right when any series has one. */
  label?: string;
}

export interface PlotOptions {
  title: string;
  xLabel: string;
  yLabel: string;
  /** "log" draws y on a log10 axis. */
  yScale?: "linear" | "log";
  height?: number;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** Vertical markers, e.g. a measured peak. */
  markers?: { x: number; label: string }[];
}

export interface PlotPanel {
  el: HTMLElement;
  set(series: PlotSeries[], markers?: { x: number; label: string }[]): void;
}

export function plotPanel(o: PlotOptions): PlotPanel {
  const canvas = h("canvas", { class: "bp-plot-canvas", role: "img", "aria-label": o.title });
  canvas.style.height = `${o.height ?? 140}px`;
  const readout = h("div", { class: "bp-plot-readout", "aria-live": "off" }, "");
  const el = h("figure", { class: "bp-plot" }, h("figcaption", { class: "bp-plot-title" }, o.title), canvas, readout);
  let data: PlotSeries[] = [];
  let marks = o.markers ?? [];
  let hover: number | null = null;
  const fx = o.formatX ?? ((v: number) => fmtNum(v, 2));
  const fy = o.formatY ?? ((v: number) => fmtNum(v, 2));
  const pad = { l: 38, r: 8, t: 6, b: 22 };

  const draw = (): void => {
    const ctx = fitCanvas(canvas);
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    const W = r.width;
    const H = r.height;
    ctx.clearRect(0, 0, W, H);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const ty = (v: number): number => (o.yScale === "log" ? Math.log10(Math.max(v, 1e-12)) : v);
    for (const s of data) {
      for (let i = 0; i < s.x.length; i += 1) {
        x0 = Math.min(x0, s.x[i]!);
        x1 = Math.max(x1, s.x[i]!);
        const yy = ty(s.y[i]!);
        if (Number.isFinite(yy)) {
          y0 = Math.min(y0, yy);
          y1 = Math.max(y1, yy);
        }
      }
    }
    const mono = `10px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.font = mono;
    ctx.fillStyle = css("--bp-text-dim", "#c3cbd2");
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.l + 0.5, pad.t + 0.5, W - pad.l - pad.r, H - pad.t - pad.b);
    if (!Number.isFinite(x0) || x1 <= x0) {
      ctx.fillText("waiting for data…", pad.l + 8, pad.t + 16);
      return;
    }
    if (y1 - y0 < 1e-12) {
      y1 += 1;
      y0 -= 1;
    }
    const X = (v: number): number => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
    const Y = (v: number): number => H - pad.b - ((ty(v) - y0) / (y1 - y0)) * (H - pad.t - pad.b);
    // ticks
    ctx.textAlign = "right";
    for (let k = 0; k <= 2; k += 1) {
      const v = y0 + ((y1 - y0) * k) / 2;
      const yy = H - pad.b - (k / 2) * (H - pad.t - pad.b);
      ctx.fillText(o.yScale === "log" ? `1e${v.toFixed(0)}` : fy(v), pad.l - 4, yy + 3);
    }
    ctx.textAlign = "center";
    for (let k = 0; k <= 3; k += 1) {
      const v = x0 + ((x1 - x0) * k) / 3;
      ctx.fillText(fx(v), X(v), H - pad.b + 13);
    }
    ctx.textAlign = "left";
    ctx.fillText(o.yLabel, pad.l + 4, pad.t + 11);
    ctx.textAlign = "right";
    ctx.fillText(o.xLabel, W - pad.r - 2, H - pad.b - 4);
    // series
    for (const s of data) {
      const color = s.color ?? css("--bp-accent", "#e8c88f");
      if (s.style === "dots") {
        ctx.fillStyle = color;
        for (let i = 0; i < s.x.length; i += 1) {
          if (!Number.isFinite(ty(s.y[i]!))) continue;
          ctx.beginPath();
          ctx.arc(X(s.x[i]!), Y(s.y[i]!), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < s.x.length; i += 1) {
        const px = X(s.x[i]!);
        const py = Y(s.y[i]!);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // legend
    let ly = pad.t + 12;
    ctx.textAlign = "right";
    for (const s of data) {
      if (!s.label) continue;
      ctx.fillStyle = s.color ?? css("--bp-accent", "#e8c88f");
      ctx.fillText(`${s.style === "dots" ? "●" : "—"} ${s.label}`, W - pad.r - 4, ly);
      ly += 12;
    }
    ctx.textAlign = "left";
    for (const m of marks) {
      const px = X(m.x);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, H - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = css("--bp-text", "#eef1f3");
      ctx.fillText(m.label, Math.min(px + 4, W - 90), pad.t + 24);
    }
    if (hover !== null && data[0]) {
      const s = data[0];
      let best = 0;
      for (let i = 1; i < s.x.length; i += 1) if (Math.abs(s.x[i]! - hover) < Math.abs(s.x[best]! - hover)) best = i;
      const px = X(s.x[best]!);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, H - pad.b);
      ctx.stroke();
      readout.textContent = `${o.xLabel} ${fx(s.x[best]!)} · ${o.yLabel} ${fy(s.y[best]!)}`;
    }
  };
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const s = data[0];
    if (!s || s.x.length === 0) return;
    let x0 = Infinity;
    let x1 = -Infinity;
    for (let i = 0; i < s.x.length; i += 1) {
      x0 = Math.min(x0, s.x[i]!);
      x1 = Math.max(x1, s.x[i]!);
    }
    hover = x0 + ((e.clientX - r.left - pad.l) / (r.width - pad.l - pad.r)) * (x1 - x0);
    draw();
  });
  canvas.addEventListener("pointerleave", () => {
    hover = null;
    readout.textContent = "";
    draw();
  });
  // a plot filled while hidden (a closed drawer) has no size yet: redraw when it gets one
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => draw()).observe(canvas);
  return {
    el,
    set(series: PlotSeries[], markers?: { x: number; label: string }[]) {
      data = series;
      if (markers) marks = markers;
      draw();
    },
  };
}

export interface Readout {
  el: HTMLElement;
  set(rows: [string, string][]): void;
}

/** A two-column definition list of live values (labels in Sans, values in Mono). */
export function readout(label: string): Readout {
  const dl = h("dl", { class: "bp-readout", "aria-label": label });
  return {
    el: dl,
    set(rows: [string, string][]) {
      dl.textContent = "";
      for (const [k, v] of rows) dl.append(h("dt", {}, k), h("dd", {}, v));
    },
  };
}
