// Dial (00-foundation.md § 2.3, added for Swarm's Order Dial): one big rotary
// control for a sim's signature parameter. A 270° arc from a "low" word to a
// "high" word (calm ↔ panic); drag around it, click a point on it, or use the
// keyboard (arrows ± step, Page Up / Down ± 10 steps, Home / End). It is an
// ARIA slider, so assistive technology reads it as one.

import "./dial.css";
import { h } from "./dom.js";

export interface DialOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Words at the two ends of the arc, e.g. "calm" and "panic". */
  lowLabel: string;
  highLabel: string;
  format?: (v: number) => string;
  /** Diameter, CSS px (default 132). */
  size?: number;
  /** Fires for every change; `phase` brackets a drag or a key press (start … end). */
  onInput: (v: number, phase: "start" | "move" | "end") => void;
}

export interface Dial {
  el: HTMLElement;
  set(v: number): void;
  get(): number;
  setDisabled(disabled: boolean): void;
}

const SWEEP = 270;
const START = 135; // degrees clockwise from +x (screen), the arc's low end

const SVGNS = "http://www.w3.org/2000/svg";
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number): [number, number] => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function dial(o: DialOptions): Dial {
  const size = o.size ?? 132;
  const fmt = o.format ?? ((v: number) => v.toFixed(2));
  let value = o.value;
  let disabled = false;
  const c = size / 2;
  const R = size / 2 - 10;
  const g = svg("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, "aria-hidden": "true", class: "bp-dial-svg" });
  const track = svg("path", { d: arcPath(c, c, R, START, START + SWEEP), class: "bp-dial-track" });
  const fill = svg("path", { d: "", class: "bp-dial-fill" });
  const knob = svg("circle", { r: 7, cx: c, cy: c, class: "bp-dial-knob" });
  // ticks every 10% of the range
  const ticks = svg("g", { class: "bp-dial-ticks" });
  for (let k = 0; k <= 10; k += 1) {
    const a = ((START + (SWEEP * k) / 10) * Math.PI) / 180;
    const r0 = R + 5;
    const r1 = R + (k % 5 === 0 ? 9 : 7);
    ticks.append(svg("line", { x1: c + r0 * Math.cos(a), y1: c + r0 * Math.sin(a), x2: c + r1 * Math.cos(a), y2: c + r1 * Math.sin(a) }));
  }
  g.append(ticks, track, fill, knob);
  const readout = h("span", { class: "bp-dial-value" });
  const centre = h("div", { class: "bp-dial-centre" }, h("span", { class: "bp-dial-label" }, o.label), readout);
  const face = h(
    "div",
    {
      class: "bp-dial-face",
      role: "slider",
      tabindex: 0,
      "aria-label": o.label,
      "aria-valuemin": o.min,
      "aria-valuemax": o.max,
      style: `width:${size}px;height:${size}px`,
    },
    g,
    centre,
  );
  const ends = h("div", { class: "bp-dial-ends", "aria-hidden": "true" }, h("span", {}, o.lowLabel), h("span", {}, o.highLabel));
  const el = h("div", { class: "bp-dial" }, face, ends);

  const clamp = (v: number): number => Math.min(Math.max(v, o.min), o.max);
  const snap = (v: number): number => clamp(Math.round((v - o.min) / o.step) * o.step + o.min);
  const show = (): void => {
    const t = (value - o.min) / Math.max(o.max - o.min, 1e-12);
    const a = START + SWEEP * t;
    fill.setAttribute("d", t > 0.002 ? arcPath(c, c, R, START, a) : "");
    knob.setAttribute("cx", String(c + R * Math.cos((a * Math.PI) / 180)));
    knob.setAttribute("cy", String(c + R * Math.sin((a * Math.PI) / 180)));
    readout.textContent = fmt(value);
    face.setAttribute("aria-valuenow", String(Number(value.toFixed(6))));
    face.setAttribute("aria-valuetext", `${fmt(value)} (${o.lowLabel} ${fmt(o.min)} to ${o.highLabel} ${fmt(o.max)})`);
  };
  show();

  const fromPointer = (e: PointerEvent): number => {
    const r = face.getBoundingClientRect();
    let a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    // angle measured from the arc's low end, clockwise, in [0, 360)
    let d = (((a - START) % 360) + 360) % 360;
    if (d > SWEEP) d = d - SWEEP < (360 - SWEEP) / 2 ? SWEEP : 0; // the gap at the bottom: nearest end
    a = d;
    return snap(o.min + (a / SWEEP) * (o.max - o.min));
  };
  const change = (v: number, phase: "start" | "move" | "end"): void => {
    const nv = snap(v);
    if (nv === value && phase === "move") return;
    value = nv;
    show();
    o.onInput(value, phase);
  };
  let dragging = false;
  face.addEventListener("pointerdown", (e) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    face.setPointerCapture(e.pointerId);
    face.focus();
    change(fromPointer(e), "start");
  });
  face.addEventListener("pointermove", (e) => {
    if (dragging) change(fromPointer(e), "move");
  });
  const end = (): void => {
    if (!dragging) return;
    dragging = false;
    o.onInput(value, "end");
  };
  face.addEventListener("pointerup", end);
  face.addEventListener("pointercancel", end);
  face.addEventListener("keydown", (e) => {
    if (disabled) return;
    const big = (o.max - o.min) / 10;
    const k: Record<string, number> = {
      ArrowRight: o.step,
      ArrowUp: o.step,
      ArrowLeft: -o.step,
      ArrowDown: -o.step,
      PageUp: big,
      PageDown: -big,
    };
    let v: number | null = null;
    if (e.key in k) v = value + k[e.key]!;
    else if (e.key === "Home") v = o.min;
    else if (e.key === "End") v = o.max;
    if (v === null) return;
    e.preventDefault();
    e.stopPropagation();
    change(v, "start");
    o.onInput(value, "end");
  });
  return {
    el,
    set(v: number) {
      value = clamp(v);
      show();
    },
    get: () => value,
    setDisabled(d: boolean) {
      disabled = d;
      el.classList.toggle("is-disabled", d);
      face.setAttribute("aria-disabled", d ? "true" : "false");
    },
  };
}
