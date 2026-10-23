// The breadcrumb (01-reaction-diffusion.md § Signature moment): a small map
// of (F, k) space showing where the dish sits. Dragging its dot moves the
// dish continuously through pattern space and the pattern morphs live. The
// background is a snapshot of The Map you dove from, or a schematic of the
// named regimes when you arrived some other way.

import { h, icon } from "@bp/studio";
import { REGIMES, nearestRegime } from "../scenes/scenes.js";
import { MAP_F, PLANE_K, kOffset, kSpan, saddleNode } from "../scenes/map.js";

const W = 184;
const H = 116;

export class Breadcrumb {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly caption: HTMLElement;
  readonly back: HTMLButtonElement;
  private snapshot: ImageBitmap | HTMLCanvasElement | null = null;
  private F = 0.0367;
  private k = 0.0649;
  private dragging = false;
  onMove: ((F: number, k: number, phase: "start" | "move" | "end") => void) | null = null;

  constructor() {
    this.canvas = h("canvas", {
      class: "rd-crumb-canvas",
      tabindex: "0",
      role: "img",
      "aria-label": "Where this dish sits on the map of pattern space. Drag, or use the arrow keys, to move.",
    });
    this.caption = h("p", { class: "rd-crumb-caption bp-mono", "aria-live": "polite" });
    this.back = h(
      "button",
      { type: "button", class: "bp-btn rd-crumb-back" },
      h("span", { html: icon("map", 16) }),
      "Back to the map",
    );
    this.el = h("div", { class: "rd-crumb bp-surface" }, this.canvas, this.caption, this.back);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    const toFk = (e: PointerEvent): [number, number] => {
      const r = this.canvas.getBoundingClientRect();
      const u = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      const v = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
      return [MAP_F[0] + u * (MAP_F[1] - MAP_F[0]), PLANE_K[1] - v * (PLANE_K[1] - PLANE_K[0])];
    };
    this.canvas.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.canvas.setPointerCapture(e.pointerId);
      const [F, k] = toFk(e);
      this.onMove?.(F, k, "start");
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const [F, k] = toFk(e);
      this.onMove?.(F, k, "move");
    });
    const end = (): void => {
      if (!this.dragging) return;
      this.dragging = false;
      this.onMove?.(this.F, this.k, "end");
    };
    this.canvas.addEventListener("pointerup", end);
    this.canvas.addEventListener("pointercancel", end);
    this.canvas.addEventListener("keydown", (e) => {
      const sf = (MAP_F[1] - MAP_F[0]) / (e.shiftKey ? 200 : 50);
      const sk = (PLANE_K[1] - PLANE_K[0]) / (e.shiftKey ? 200 : 50);
      let F = this.F;
      let k = this.k;
      if (e.key === "ArrowLeft") F -= sf;
      else if (e.key === "ArrowRight") F += sf;
      else if (e.key === "ArrowUp") k += sk;
      else if (e.key === "ArrowDown") k -= sk;
      else return;
      e.preventDefault();
      e.stopPropagation();
      this.onMove?.(clampF(F), clampK(k), "start");
      this.onMove?.(clampF(F), clampK(k), "end");
    });
    this.draw();
  }

  /** Background from a half-resolution V field of The Map. */
  setSnapshot(v: Float32Array | null, w: number, h: number): void {
    if (!v) {
      this.snapshot = null;
      this.draw();
      return;
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i += 1) {
      const t = Math.min(Math.max((v[i]! - 0.05) / 0.3, 0), 1);
      img.data[i * 4] = 14 + t * 210;
      img.data[i * 4 + 1] = 19 + t * 195;
      img.data[i * 4 + 2] = 26 + t * 160;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.snapshot = c;
    this.draw();
  }

  set(F: number, k: number): void {
    this.F = F;
    this.k = k;
    const { regime, distance } = nearestRegime(F, k);
    const name = distance < 0.08 ? regime.name : "between regimes";
    this.caption.textContent = `F ${F.toFixed(4)} · k ${k.toFixed(4)} — ${name}`;
    this.canvas.setAttribute(
      "aria-label",
      `Where this dish sits on the map of pattern space: feed rate ${F.toFixed(4)}, kill rate ${k.toFixed(4)}, ${name}. Drag, or use the arrow keys, to move.`,
    );
    this.draw();
  }

  private draw(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== W * dpr) {
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
    }
    const c = this.canvas.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#0e1319";
    c.fillRect(0, 0, W, H);
    const X = (F: number): number => ((F - MAP_F[0]) / (MAP_F[1] - MAP_F[0])) * W;
    const Y = (k: number): number => (1 - (k - PLANE_K[0]) / (PLANE_K[1] - PLANE_K[0])) * H;
    // The Map is a band of this plane: per column, k spans the window around
    // the saddle-node line. Draw the snapshot warped into it, or the band's tint.
    const top = (F: number): number => Y(saddleNode(F) + kOffset(F) + kSpan(F) / 2);
    const bottom = (F: number): number => Y(saddleNode(F) + kOffset(F) - kSpan(F) / 2);
    const snap = this.snapshot;
    for (let x = 0; x < W; x += 1) {
      const F = MAP_F[0] + ((x + 0.5) / W) * (MAP_F[1] - MAP_F[0]);
      const y0 = top(F);
      const y1 = bottom(F);
      if (snap) {
        const sx = ((x + 0.5) / W) * snap.width;
        c.drawImage(snap, sx, 0, 1, snap.height, x, y0, 1, y1 - y0);
      } else {
        c.fillStyle = "rgba(232,200,143,0.12)";
        c.fillRect(x, y0, 1, y1 - y0);
      }
    }
    c.strokeStyle = "rgba(255,255,255,0.28)";
    c.lineWidth = 1;
    for (const edge of [top, bottom]) {
      c.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const F = MAP_F[0] + (x / W) * (MAP_F[1] - MAP_F[0]);
        if (x === 0) c.moveTo(x, edge(F));
        else c.lineTo(x, edge(F));
      }
      c.stroke();
    }
    c.font = `600 8.5px "IBM Plex Sans Condensed", sans-serif`;
    c.textAlign = "center";
    for (const r of REGIMES) {
      c.fillStyle = "rgba(255,255,255,0.45)";
      c.beginPath();
      c.arc(X(r.F), Y(r.k), 1.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.fillText(r.name.toUpperCase(), X(r.F), Y(r.k) - 4);
    }
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.textAlign = "left";
    c.font = `9px "IBM Plex Mono", monospace`;
    c.fillText("F →", W - 24, H - 4);
    c.fillText("k ↑", 3, 10);
    const x = X(this.F);
    const y = Y(this.k);
    c.strokeStyle = "rgba(255,255,255,0.75)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - 9, y);
    c.lineTo(x + 9, y);
    c.moveTo(x, y - 9);
    c.lineTo(x, y + 9);
    c.stroke();
    c.fillStyle = "#e8c88f";
    c.beginPath();
    c.arc(x, y, 4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#0b0f13";
    c.stroke();
  }
}

const clampF = (F: number): number => Math.min(Math.max(F, MAP_F[0]), MAP_F[1]);
const clampK = (k: number): number => Math.min(Math.max(k, PLANE_K[0]), PLANE_K[1]);
