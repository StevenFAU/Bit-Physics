// Swarm M3 panel on the canvas (03-boids-2d.md § Learn): Eyes Only's measured
// order. The whole ocean's polarization φ comes from the exact integer
// reduction every few frames; the schools — groups of fish linked by chains
// of neighbours closer than twice the equilibrium distance — and each one's
// own polarization come from a copy of every fish read back about once a
// second (./model/vision-cpu.ts schoolStats). Random headings would give a
// school of n fish an order near 1/√n; the panel prints that alongside.

import { h } from "@bp/studio";
import type { SchoolStats } from "./model/vision-cpu.js";

const W = 232;
const H = 40;

export class EyesPanel {
  readonly el: HTMLElement;
  /** The latest school census (null until the first sample). */
  schools: SchoolStats | null = null;
  private readonly trace: HTMLCanvasElement;
  private readonly phiEl: HTMLElement;
  private readonly schoolEl: HTMLElement;
  private readonly stateEl: HTMLElement;
  private readonly phis: number[] = [];

  constructor() {
    this.trace = h("canvas", { class: "sw-eyes-trace", role: "img", "aria-label": "The whole ocean's polarization φ over time, from 0 (every fish its own way) to 1 (all one way)." });
    this.trace.style.width = `${W}px`;
    this.trace.style.height = `${H}px`;
    this.phiEl = h("span", { class: "sw-dial-num sw-dial-num-small" }, "—");
    this.schoolEl = h("p", { class: "sw-pop-nums bp-mono", role: "status" }, "—");
    this.stateEl = h("p", { class: "sw-pop-state" }, "");
    this.el = h(
      "section",
      { class: "sw-eyes bp-surface", "aria-label": "Order without alignment", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      h("span", { class: "sw-regime-key" }, "Order without alignment · measured"),
      h("div", { class: "sw-eyes-top" }, h("span", { class: "sw-regime-key" }, "Whole ocean φ"), this.phiEl),
      this.trace,
      this.schoolEl,
      this.stateEl,
    );
    this.draw();
  }

  clear(): void {
    this.phis.length = 0;
    this.schools = null;
    this.phiEl.textContent = "—";
    this.schoolEl.textContent = "—";
    this.stateEl.textContent = "";
    this.draw();
  }

  pushPhi(phi: number): void {
    this.phis.push(phi);
    if (this.phis.length > 240) this.phis.shift();
    this.phiEl.textContent = phi.toFixed(2);
    this.draw();
  }

  setSchools(s: SchoolStats, n: number): void {
    this.schools = s;
    if (s.schools === 0) {
      this.schoolEl.textContent = "No schools yet";
      this.stateEl.textContent = "Scattered: each fish sees too few others to gather.";
      return;
    }
    const typical = s.schooled / s.schools;
    const random = 1 / Math.sqrt(Math.max(typical, 1));
    this.schoolEl.textContent = `${s.schools} school${s.schools === 1 ? "" : "s"} · ${Math.round((s.schooled / n) * 100)}% of the fish · own order ${s.order.toFixed(2)}`;
    this.stateEl.textContent =
      s.order > 0.7
        ? `Schooling: each school swims one way (random headings would give ${random.toFixed(2)}).`
        : s.order > 0.4
          ? `Lining up: the schools are turning to agree (random would be ${random.toFixed(2)}).`
          : `Gathering: groups have formed but swim every way (random ${random.toFixed(2)}).`;
  }

  private draw(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = this.trace;
    if (c.width !== W * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W, H * 0.5);
    ctx.stroke();
    if (this.phis.length < 2) return;
    ctx.strokeStyle = "#7fd3ec";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const n = this.phis.length;
    this.phis.forEach((p, i) => {
      const x = (i / Math.max(n - 1, 1)) * W;
      const y = H - 2 - p * (H - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}
