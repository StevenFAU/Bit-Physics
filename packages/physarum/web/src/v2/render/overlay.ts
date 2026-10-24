// Score overlays drawn over the dish (screen space, Canvas 2D): the network
// the score was measured on, the planner's trees on the same food, and the
// shortest path through a maze — so every number on the score card can be
// checked against what it measured.

import type { Camera2D } from "@bp/render";
import type { Analysis } from "../model/analysis.js";

export interface OverlayLayers {
  network: boolean;
  mst: boolean;
  steiner: boolean;
  shortest: boolean;
}

/** Line styles, shared with the score card's legend. */
export const OVERLAY_STYLE = {
  network: { color: "rgba(255,255,255,0.9)", dash: [] as number[], width: 1.6 },
  mst: { color: "#9be38f", dash: [9, 6], width: 2 },
  steiner: { color: "#ff9fd6", dash: [2, 5], width: 2.2 },
  shortest: { color: "#9be38f", dash: [9, 6], width: 2.2 },
};

export class ScoreOverlay {
  readonly el: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  layers: OverlayLayers = { network: true, mst: true, steiner: false, shortest: true };
  analysis: Analysis | null = null;

  constructor() {
    this.el = document.createElement("canvas");
    this.el.className = "ph-overlay";
    this.el.setAttribute("aria-hidden", "true");
    this.ctx = this.el.getContext("2d")!;
  }

  draw(camera: Camera2D, dpr: number): void {
    const w = Math.round(camera.viewW * dpr);
    const h = Math.round(camera.viewH * dpr);
    if (this.el.width !== w || this.el.height !== h) {
      this.el.width = w;
      this.el.height = h;
    }
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    const a = this.analysis;
    if (!a) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineJoin = "round";
    c.lineCap = "round";
    const P = (x: number, y: number): [number, number] => camera.domainToScreen(x, y);
    const style = (s: { color: string; dash: number[]; width: number }): void => {
      c.strokeStyle = s.color;
      c.setLineDash(s.dash);
      c.lineWidth = s.width;
    };
    const halo = (draw: () => void, width: number): void => {
      // a dark halo under each line keeps it readable on bright tubes
      c.save();
      c.strokeStyle = "rgba(0,0,0,0.55)";
      c.setLineDash([]);
      c.lineWidth = width + 2.5;
      draw();
      c.restore();
    };
    const s = a.score;
    if (s?.kind === "cities") {
      const tree = (t: typeof s.mst, st: (typeof OVERLAY_STYLE)["mst"]): void => {
        const path = (): void => {
          c.beginPath();
          for (const [i, j] of t.edges) {
            const [x0, y0] = P(t.pts[i]![0], t.pts[i]![1]);
            const [x1, y1] = P(t.pts[j]![0], t.pts[j]![1]);
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
          }
          c.stroke();
        };
        halo(path, st.width);
        style(st);
        path();
      };
      if (this.layers.mst) tree(s.mst, OVERLAY_STYLE.mst);
      if (this.layers.steiner) tree(s.steiner, OVERLAY_STYLE.steiner);
    }
    if (s?.kind === "maze" && this.layers.shortest && s.shortestPath.length > 2) {
      const path = (): void => {
        c.beginPath();
        for (let k = 0; k < s.shortestPath.length; k += 2) {
          const [x, y] = P(s.shortestPath[k]!, s.shortestPath[k + 1]!);
          if (k === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      };
      halo(path, OVERLAY_STYLE.shortest.width);
      style(OVERLAY_STYLE.shortest);
      path();
    }
    if (this.layers.network) {
      const g = a.graph;
      const path = (): void => {
        c.beginPath();
        for (const l of g.links) {
          for (let k = 0; k < l.path.length; k += 2) {
            const [x, y] = P(l.path[k]!, l.path[k + 1]!);
            if (k === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
        }
        c.stroke();
      };
      halo(path, OVERLAY_STYLE.network.width);
      style(OVERLAY_STYLE.network);
      path();
      // junctions where three or more links meet
      const deg = new Map<number, number>();
      for (const l of g.links) {
        deg.set(l.a, (deg.get(l.a) ?? 0) + 1);
        deg.set(l.b, (deg.get(l.b) ?? 0) + 1);
      }
      c.setLineDash([]);
      for (const [n, d] of deg) {
        const node = g.nodes[n]!;
        if (node.food >= 0 || d < 3) continue;
        const [x, y] = P(node.x, node.y);
        c.beginPath();
        c.arc(x, y, 3.2, 0, Math.PI * 2);
        c.fillStyle = "rgba(0,0,0,0.6)";
        c.fill();
        c.lineWidth = 1.4;
        c.strokeStyle = OVERLAY_STYLE.network.color;
        c.stroke();
      }
    }
  }
}
