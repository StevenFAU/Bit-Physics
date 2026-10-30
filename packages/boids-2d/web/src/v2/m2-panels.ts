// Swarm M2 panels on the canvas (03-boids-2d.md § Learn): Food Chain's
// population trace — fish, sharks and plankton from the live census — and
// Current's measured water: how incompressible it is, how fast it runs.
// Both read only what the solver measured; nothing here is asserted.

import { h } from "@bp/studio";
import type { Census } from "./model/ecology.js";
import type { FluidStats } from "./model/fluid.js";

const W = 232;
const H = 92;

export interface PopSample {
  tick: number;
  fish: number;
  sharks: number;
  plankton: number;
}

/** The census over time, three lines each scaled to its own range (labels carry the numbers). */
export class PopulationPanel {
  readonly el: HTMLElement;
  readonly samples: PopSample[] = [];
  private readonly canvas: HTMLCanvasElement;
  private readonly nums: HTMLElement;
  private readonly state: HTMLElement;
  private fishSlots = 1;
  private sharkSlots = 1;

  constructor() {
    this.canvas = h("canvas", {
      class: "sw-pop-canvas",
      role: "img",
      "aria-label": "Populations over time: fish (silver), sharks (amber) and plankton (green), each from the live census.",
    });
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.nums = h("p", { class: "sw-pop-nums bp-mono", role: "status" }, "—");
    this.state = h("p", { class: "sw-pop-state" }, "");
    this.el = h(
      "section",
      { class: "sw-pop bp-surface", "aria-label": "Populations", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      h("span", { class: "sw-regime-key" }, "Census · live"),
      this.canvas,
      this.nums,
      this.state,
    );
    this.draw();
  }

  setSlots(fish: number, sharks: number): void {
    this.fishSlots = Math.max(1, fish);
    this.sharkSlots = Math.max(1, sharks);
  }

  clear(): void {
    this.samples.length = 0;
    this.nums.textContent = "—";
    this.state.textContent = "";
    this.draw();
  }

  push(c: Census, tick: number): void {
    const last = this.samples[this.samples.length - 1];
    if (last && tick <= last.tick) this.samples.length = 0;
    this.samples.push({ tick, fish: c.fish, sharks: c.sharks, plankton: c.plankton });
    if (this.samples.length > 900) this.samples.splice(0, this.samples.length - 900);
    this.nums.textContent = `${Math.round(c.fish).toLocaleString()} fish · ${Math.round(c.sharks)} sharks · plankton ${(c.plankton * 100).toFixed(0)}%`;
    this.state.textContent = this.describe();
    this.draw();
  }

  /** A plain reading of where the cycle is (from the last ~2,000 steps of the census). */
  describe(): string {
    const s = this.samples;
    if (s.length < 4) return "";
    const now = s[s.length - 1]!;
    let k = s.length - 1;
    while (k > 0 && now.tick - s[k - 1]!.tick < 2000) k -= 1;
    const then = s[k]!;
    if (now.tick - then.tick < 600) return "";
    const rel = (a: number, b: number): number => (a - b) / Math.max(b, 1);
    const f = rel(now.fish, then.fish);
    const sh = now.sharks - then.sharks;
    if (now.sharks < 2) return "The sharks are nearly gone — newcomers drift in";
    if (now.fish < 0.06 * this.fishSlots) return "Few fish left — the sharks will starve";
    if (now.sharks >= this.sharkSlots) return "The sharks fill the sea — the fish are crashing";
    if (f > 0.08 && sh <= 2) return "Fish are booming";
    if (sh > 3 && f > -0.05) return "Sharks are multiplying on plenty";
    if (f < -0.08) return "The sharks are eating the fish down";
    if (sh < -3) return "Sharks are starving";
    return "Holding steady";
  }

  private draw(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = this.canvas;
    if (c.width !== W * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, W, H);
    const s = this.samples;
    if (s.length < 2) return;
    const t0 = s[0]!.tick;
    const t1 = Math.max(s[s.length - 1]!.tick, t0 + 1);
    const X = (t: number): number => 4 + ((t - t0) / (t1 - t0)) * (W - 8);
    const line = (val: (p: PopSample) => number, top: number, col: string): void => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      s.forEach((p, i) => {
        const y = H - 6 - Math.min(1, val(p) / Math.max(top, 1e-9)) * (H - 14);
        if (i === 0) ctx.moveTo(X(p.tick), y);
        else ctx.lineTo(X(p.tick), y);
      });
      ctx.stroke();
    };
    const maxFish = Math.max(...s.map((p) => p.fish), 1);
    const maxSharks = Math.max(...s.map((p) => p.sharks), 1);
    line((p) => p.plankton, 1, "rgba(110,214,170,0.85)");
    line((p) => p.fish, maxFish * 1.05, "rgba(205,225,240,0.95)");
    line((p) => p.sharks, maxSharks * 1.05, "rgba(242,176,96,0.95)");
    ctx.font = `10px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(205,225,240,0.9)";
    ctx.fillText("fish", 6, 11);
    ctx.fillStyle = "rgba(242,176,96,0.95)";
    ctx.fillText("sharks", 38, 11);
    ctx.fillStyle = "rgba(110,214,170,0.9)";
    ctx.fillText("plankton", 86, 11);
    ctx.fillStyle = "rgba(220,228,235,0.6)";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round((t1 - t0) / 60)} s`, W - 5, 11);
  }
}

/** Current's water, as measured. */
export class WaterPanel {
  readonly el: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly note: HTMLElement;

  constructor() {
    this.rows = h("dl", { class: "sw-water-rows" });
    this.note = h("p", { class: "sw-pop-state" }, "");
    this.el = h(
      "section",
      { class: "sw-pop sw-water bp-surface", "aria-label": "The water, measured", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      h("span", { class: "sw-regime-key" }, "The water · measured"),
      this.rows,
      this.note,
    );
  }

  clear(): void {
    this.rows.textContent = "";
    this.note.textContent = "";
  }

  set(st: FluidStats, fishTopSpeed: number): void {
    const ratio = st.maxGrad > 0 ? st.maxDiv / st.maxGrad : 0;
    this.rows.textContent = "";
    const row = (k: string, v: string): void => {
      this.rows.append(h("dt", {}, k), h("dd", { class: "bp-mono" }, v));
    };
    row("Fastest water", `${(st.maxSpeed / fishTopSpeed).toFixed(2)}× fish speed`);
    row("Divergence |∇·u|", ratio > 0 ? `${ratio.toExponential(1)} of |∇u|` : "0");
    row("Mean drift U₀", `${(Math.hypot(st.u0[0], st.u0[1]) / fishTopSpeed).toFixed(3)}× fish speed`);
    this.note.textContent = "Incompressible by construction; the remainder is f32 rounding.";
  }
}
