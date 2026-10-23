// Dev frame graph (00-foundation.md § 4.6): `?debug=perf` draws the last few
// seconds of frame time and GPU time with the per-pass breakdown, in a small
// canvas pinned above the transport. Decorative for assistive tech — the same
// numbers are in Learn → Performance.

import { h } from "./dom.js";

export interface PerfSample {
  frameMs: number;
  gpuMs: number;
  passes: readonly { name: string; avg: number }[];
}

export class PerfOverlay {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly frames: number[] = [];
  private readonly gpu: number[] = [];
  private passes: readonly { name: string; avg: number }[] = [];
  constructor(private readonly budgetMs = 16.7) {
    this.canvas = h("canvas", { width: 280, height: 120 });
    this.el = h("div", { class: "bp-perf bp-surface", "aria-hidden": "true" }, this.canvas);
  }
  push(s: PerfSample): void {
    this.frames.push(s.frameMs);
    this.gpu.push(s.gpuMs);
    if (this.frames.length > 240) {
      this.frames.shift();
      this.gpu.shift();
    }
    this.passes = s.passes;
    this.draw();
  }
  private draw(): void {
    const c = this.canvas.getContext("2d");
    if (!c) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    c.clearRect(0, 0, W, H);
    const top = 40;
    const Y = (ms: number): number => H - 4 - Math.min(ms / top, 1) * (H - 30);
    c.strokeStyle = "rgba(255,255,255,0.25)";
    c.setLineDash([3, 3]);
    c.beginPath();
    c.moveTo(0, Y(this.budgetMs));
    c.lineTo(W, Y(this.budgetMs));
    c.stroke();
    c.setLineDash([]);
    const line = (vals: number[], color: string): void => {
      c.strokeStyle = color;
      c.beginPath();
      vals.forEach((v, i) => {
        const x = (i / 239) * W;
        if (i === 0) c.moveTo(x, Y(v));
        else c.lineTo(x, Y(v));
      });
      c.stroke();
    };
    line(this.frames, "#e8c88f");
    line(this.gpu, "#a6dcb5");
    c.font = '10px "IBM Plex Mono", monospace';
    c.fillStyle = "#eef1f3";
    const last = (a: number[]): string => (a.length ? a[a.length - 1]!.toFixed(1) : "—");
    c.fillText(`frame ${last(this.frames)} ms  gpu ${last(this.gpu)} ms`, 6, 12);
    c.fillStyle = "#c3cbd2";
    c.fillText(this.passes.map((p) => `${p.name} ${p.avg.toFixed(2)}`).join("  ").slice(0, 52), 6, 24);
  }
}
