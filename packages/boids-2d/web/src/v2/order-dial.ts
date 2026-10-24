// The Order Dial (03-boids-2d.md § Signature moment): one big dial labelled
// calm ↔ panic (the Vicsek noise η), the live polarization trace, the
// susceptibility, and a growing map of every (η, ρ) the visitor has held,
// each point measured from the live solver (./model/meter.ts) and coloured by
// its measured ⟨φ⟩. A sweep turns the dial itself, measuring φ(η) and χ(η)
// at the current crowding, and marks η_c at the χ peak.

import { COLORMAP_DEFS, sampleColormap } from "@bp/render";
import type { Dial, Slider } from "@bp/studio";
import { dial, h, slider } from "@bp/studio";
import type { Measurement } from "./model/meter.js";
import { settingKey } from "./model/meter.js";
import { RHO_RANGE } from "./scenes.js";

const VIRIDIS = COLORMAP_DEFS.find((d) => d.name === "viridis")!;

/** φ → a CSS colour on viridis (the map's colour scale). */
export function phiColour(phi: number, alpha = 1): string {
  const [r, g, b] = sampleColormap(VIRIDIS, Math.min(Math.max(phi, 0), 1));
  const c = (v: number): number => Math.round(Math.min(Math.max(v, 0), 1) * 255);
  return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${alpha})`;
}

export interface DialPanelActions {
  /** The visitor moved η and/or ρ. */
  set(eta: number, rho: number, phase: "start" | "move" | "end"): void;
  sweep(): void;
  cancelSweep(): void;
  clear(): void;
}

const LOG_RHO: readonly [number, number] = [Math.log2(RHO_RANGE[0]), Math.log2(RHO_RANGE[1])];
const ETA_MAX = 1;

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

export class OrderDialPanel {
  readonly el: HTMLElement;
  readonly dial: Dial;
  readonly crowding: Slider;
  private readonly phiEl: HTMLElement;
  private readonly chiEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly trace: HTMLCanvasElement;
  private readonly map: HTMLCanvasElement;
  private readonly sweepBtn: HTMLButtonElement;
  private readonly clearBtn: HTMLButtonElement;
  private readonly mapBox: HTMLDetailsElement;
  private eta = 0;
  private rho = 1;
  private progress = 0;
  private readonly series: number[] = [];
  private readonly points = new Map<string, Measurement>();
  private readonly path: [number, number][] = [];
  private etaC: { eta: number; rho: number } | null = null;
  private sweeping = false;
  private dragging = false;

  constructor(act: DialPanelActions) {
    this.dial = dial({
      label: "panic · η",
      min: 0,
      max: ETA_MAX,
      step: 0.01,
      value: 0,
      lowLabel: "calm",
      highLabel: "panic",
      format: (v) => v.toFixed(2),
      size: 124,
      onInput: (v, phase) => {
        this.eta = v;
        act.set(this.eta, this.rho, phase);
      },
    });
    this.crowding = slider({
      label: "Crowding",
      symbol: "ρ",
      min: LOG_RHO[0],
      max: LOG_RHO[1],
      step: 0.05,
      value: 0,
      format: (v) => (2 ** v).toFixed(2),
      unit: " fish per r²",
      hint: "Neighbours within reach r, on average, is π·ρ. Fewer fish per r² make order harder to keep.",
      onInput: (v) => {
        this.rho = 2 ** v;
        act.set(this.eta, this.rho, this.dragging ? "move" : "start");
        this.dragging = true;
        this.drawMap();
      },
      onCommit: (v) => {
        this.rho = 2 ** v;
        if (!this.dragging) act.set(this.eta, this.rho, "start");
        act.set(this.eta, this.rho, "end");
        this.dragging = false;
      },
    });
    this.phiEl = h("span", { class: "sw-dial-num" }, "—");
    this.chiEl = h("span", { class: "sw-dial-num sw-dial-num-small" }, "—");
    this.statusEl = h("p", { class: "sw-dial-status", role: "status" }, "");
    const readouts = h(
      "div",
      { class: "sw-dial-readouts" },
      h("div", { class: "sw-dial-stat" }, h("span", { class: "sw-dial-key" }, "Polarization φ"), this.phiEl),
      h("div", { class: "sw-dial-stat" }, h("span", { class: "sw-dial-key" }, "Susceptibility χ"), this.chiEl),
      this.statusEl,
    );
    this.trace = h("canvas", { class: "sw-dial-trace", "aria-hidden": "true" });
    this.map = h("canvas", {
      class: "sw-dial-map",
      role: "img",
      "aria-label":
        "Map of noise η (across) against crowding ρ (up, doubling per line). Each dot is a setting you held, coloured by its measured polarization φ. Click the map to jump there; the dial and the Crowding slider do the same from the keyboard.",
    });
    this.sweepBtn = h("button", { type: "button", class: "bp-btn" }, "Sweep η");
    this.clearBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Clear map");
    this.sweepBtn.addEventListener("click", () => (this.sweeping ? act.cancelSweep() : act.sweep()));
    this.clearBtn.addEventListener("click", () => act.clear());
    const scale = h(
      "div",
      { class: "sw-dial-scale", "aria-hidden": "true" },
      h("span", {}, "φ 0"),
      h("span", { class: "sw-dial-scale-bar", style: `background:linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((t) => phiColour(t)).join(", ")})` }),
      h("span", {}, "1"),
    );
    this.mapBox = h(
      "details",
      { class: "sw-dial-more", open: true },
      h("summary", {}, "Phase map"),
      this.trace,
      this.map,
      h("div", { class: "sw-dial-axes", "aria-hidden": "true" }, h("span", {}, "noise η →"), scale),
      this.crowding.el,
      h("div", { class: "sw-dial-actions" }, this.sweepBtn, this.clearBtn),
    );
    // on a phone the map starts folded
    if (typeof matchMedia === "function" && matchMedia("(max-width: 639px)").matches) this.mapBox.open = false;
    this.mapBox.addEventListener("toggle", () => {
      this.drawTrace();
      this.drawMap();
    });
    this.el = h(
      "section",
      { class: "sw-dial-panel bp-surface", "aria-label": "The Order Dial", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      h("div", { class: "sw-dial-top" }, this.dial.el, readouts),
      this.mapBox,
    );

    // click / drag on the map jumps to that (η, ρ)
    let mapDrag = false;
    const fromMap = (e: PointerEvent): [number, number] => {
      const r = this.map.getBoundingClientRect();
      const u = Math.min(Math.max((e.clientX - r.left - PAD.l) / (r.width - PAD.l - PAD.r), 0), 1);
      const v = Math.min(Math.max((e.clientY - r.top - PAD.t) / (r.height - PAD.t - PAD.b), 0), 1);
      const eta = Math.round(u * ETA_MAX * 100) / 100;
      const lr = Math.round((LOG_RHO[1] - v * (LOG_RHO[1] - LOG_RHO[0])) * 20) / 20;
      return [eta, 2 ** lr];
    };
    this.map.addEventListener("pointerdown", (e) => {
      if (this.sweeping) return;
      mapDrag = true;
      this.map.setPointerCapture(e.pointerId);
      const [eta, rho] = fromMap(e);
      this.setSetting(eta, rho);
      act.set(eta, rho, "start");
    });
    this.map.addEventListener("pointermove", (e) => {
      if (!mapDrag) return;
      const [eta, rho] = fromMap(e);
      if (eta === this.eta && rho === this.rho) return;
      this.setSetting(eta, rho);
      act.set(eta, rho, "move");
    });
    const endDrag = (): void => {
      if (!mapDrag) return;
      mapDrag = false;
      act.set(this.eta, this.rho, "end");
    };
    this.map.addEventListener("pointerup", endDrag);
    this.map.addEventListener("pointercancel", endDrag);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => {
        this.drawTrace();
        this.drawMap();
      }).observe(this.map);
    }
  }

  /** The setting on screen (from the scene, a link or the sweep). */
  setSetting(eta: number, rho: number): void {
    this.eta = eta;
    this.rho = rho;
    this.dial.set(eta);
    this.crowding.set(Math.log2(rho));
    const last = this.path[this.path.length - 1];
    if (!last || last[0] !== eta || last[1] !== rho) {
      this.path.push([eta, rho]);
      if (this.path.length > 48) this.path.shift();
    }
    this.drawMap();
  }

  /** A live φ sample (every few frames). */
  pushPhi(phi: number): void {
    this.series.push(phi);
    if (this.series.length > 180) this.series.shift();
    this.phiEl.textContent = phi.toFixed(3);
    this.drawTrace();
  }

  /** The meter's latest measurement of the current setting. */
  setMeasurement(m: Measurement | null, progress: number): void {
    this.progress = progress;
    if (m) {
      this.points.set(settingKey(m.eta, m.rho), m);
      this.chiEl.textContent = m.chi < 1000 ? m.chi.toFixed(2) : m.chi.toExponential(2);
    } else {
      this.chiEl.textContent = "—";
    }
    this.drawMap();
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  setSweeping(on: boolean): void {
    this.sweeping = on;
    this.sweepBtn.textContent = on ? "Stop sweep" : "Sweep η";
    this.sweepBtn.setAttribute("aria-pressed", on ? "true" : "false");
    this.dial.setDisabled(on);
    this.crowding.setDisabled(on, on ? "The sweep holds the crowding" : undefined);
    this.clearBtn.disabled = on;
  }

  setEtaC(v: { eta: number; rho: number } | null): void {
    this.etaC = v;
    this.drawMap();
  }

  clearPoints(): void {
    this.points.clear();
    this.path.length = 0;
    this.etaC = null;
    this.path.push([this.eta, this.rho]);
    this.drawMap();
  }

  get measurements(): Measurement[] {
    return [...this.points.values()];
  }

  resetTrace(): void {
    this.series.length = 0;
    this.phiEl.textContent = "—";
    this.chiEl.textContent = "—";
    this.drawTrace();
  }

  private drawTrace(): void {
    const ctx = fitCanvas(this.trace);
    if (!ctx) return;
    const r = this.trace.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(0, r.height - 1.5);
    ctx.lineTo(r.width, r.height - 1.5);
    ctx.stroke();
    if (this.series.length < 2) return;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--bp-accent").trim() || "#7fd3ec";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.series.forEach((v, i) => {
      const x = (i / 179) * r.width;
      const y = r.height - 2 - Math.min(Math.max(v, 0), 1) * (r.height - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  private drawMap(): void {
    const ctx = fitCanvas(this.map);
    if (!ctx) return;
    const r = this.map.getBoundingClientRect();
    const W = r.width;
    const H = r.height;
    if (W < 4 || H < 4) return;
    ctx.clearRect(0, 0, W, H);
    const X = (eta: number): number => PAD.l + (eta / ETA_MAX) * (W - PAD.l - PAD.r);
    const Y = (rho: number): number => PAD.t + ((LOG_RHO[1] - Math.log2(rho)) / (LOG_RHO[1] - LOG_RHO[0])) * (H - PAD.t - PAD.b);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(PAD.l, PAD.t, W - PAD.l - PAD.r, H - PAD.t - PAD.b);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.font = `10px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillStyle = "rgba(220,228,235,0.7)";
    ctx.textAlign = "right";
    for (let e = LOG_RHO[0]; e <= LOG_RHO[1] + 1e-9; e += 1) {
      const y = Y(2 ** e);
      ctx.beginPath();
      ctx.moveTo(PAD.l, y + 0.5);
      ctx.lineTo(W - PAD.r, y + 0.5);
      ctx.stroke();
      const v = 2 ** e;
      ctx.fillText(v >= 1 ? String(v) : v.toFixed(2).replace(/0+$/, ""), PAD.l - 4, y + 3);
    }
    ctx.textAlign = "center";
    for (let k = 0; k <= 4; k += 1) {
      const x = X((k / 4) * ETA_MAX);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, PAD.t);
      ctx.lineTo(x + 0.5, H - PAD.b);
      ctx.stroke();
      ctx.textAlign = k === 0 ? "left" : k === 4 ? "right" : "center";
      ctx.fillText(String(Number(((k / 4) * ETA_MAX).toFixed(2))), k === 0 ? x - 2 : k === 4 ? x + 4 : x, H - PAD.b + 11);
    }
    // the visitor's path
    if (this.path.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      this.path.forEach(([e, p], i) => (i === 0 ? ctx.moveTo(X(e), Y(p)) : ctx.lineTo(X(e), Y(p))));
      ctx.stroke();
    }
    // measured points
    for (const m of this.points.values()) {
      const x = X(m.eta);
      const y = Y(m.rho);
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      if (m.settled) {
        ctx.fillStyle = phiColour(m.phi);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.stroke();
      } else {
        ctx.strokeStyle = phiColour(m.phi);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    if (this.etaC) {
      const x = X(this.etaC.eta);
      const y = Y(this.etaC.rho);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x, y + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(240,244,247,0.95)";
      ctx.textAlign = "left";
      ctx.fillText("η_c", Math.min(x + 3, W - PAD.r - 18), y - 6);
    }
    // where you are, with the measurement's progress
    const cx = X(this.eta);
    const cy = Y(this.rho);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
    if (this.progress > 0 && this.progress < 1) {
      ctx.strokeStyle = "rgba(127,211,236,0.95)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + this.progress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }
}

const PAD = { l: 28, r: 12, t: 6, b: 16 };
