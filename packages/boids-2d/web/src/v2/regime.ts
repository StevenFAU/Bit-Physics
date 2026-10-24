// The Mill's live regime (03-boids-2d.md § Learn; Tunstrøm et al. 2013): the
// school's polarization O_p = |Σ v̂| / N and rotation O_r = |Σ r̂ × v̂| / N
// about its centre, plotted on the (O_p, O_r) plane with Tunstrøm's regions,
// and named by Tunstrøm's own cutoffs — not hand-tuned ones:
//   polarized  O_p > 0.65 and O_r < 0.35
//   milling    O_p < 0.35 and O_r > 0.65
//   swarm      O_p < 0.35 and O_r < 0.35
//   otherwise  transitional.
// Both numbers come from the exact integer reduction; O_r's centre is the
// circular mean of the positions (the school may cross the wrapped edge).

import { h } from "@bp/studio";

export type Regime = "polarized" | "milling" | "swarm" | "transitional";

/** Tunstrøm et al. 2013's thresholds (PLoS Comput. Biol. 9:e1002915). */
export const TUNSTROM = { hi: 0.65, lo: 0.35 } as const;

export function tunstromRegime(op: number, or: number): Regime {
  if (op > TUNSTROM.hi && or < TUNSTROM.lo) return "polarized";
  if (op < TUNSTROM.lo && or > TUNSTROM.hi) return "milling";
  if (op < TUNSTROM.lo && or < TUNSTROM.lo) return "swarm";
  return "transitional";
}

export const REGIME_WORDS: Record<Regime, string> = {
  polarized: "Polarized — swimming as one",
  milling: "Milling — circling a centre",
  swarm: "Swarm — together, no shared heading",
  transitional: "Transitional — between states",
};

const SIZE = 132;
const PAD = 18;

export class RegimePanel {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly nameEl: HTMLElement;
  private readonly numsEl: HTMLElement;
  private readonly trail: [number, number][] = [];
  regime: Regime = "transitional";

  constructor() {
    this.canvas = h("canvas", {
      class: "sw-regime-canvas",
      role: "img",
      "aria-label": "The school's state on the plane of polarization O_p (across) and rotation O_r (up), with Tunstrøm's regions: polarized bottom right, milling top left, swarm bottom left.",
    });
    this.canvas.style.width = `${SIZE}px`;
    this.canvas.style.height = `${SIZE}px`;
    this.nameEl = h("p", { class: "sw-regime-name", role: "status" }, "—");
    this.numsEl = h("p", { class: "sw-regime-nums bp-mono" }, "");
    this.el = h(
      "section",
      { class: "sw-regime bp-surface", "aria-label": "The school's regime", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      this.canvas,
      h("div", { class: "sw-regime-text" }, h("span", { class: "sw-regime-key" }, "Regime · Tunstrøm et al."), this.nameEl, this.numsEl),
    );
    this.draw();
  }

  push(op: number, or: number): void {
    this.trail.push([op, or]);
    if (this.trail.length > 90) this.trail.shift();
    const r = tunstromRegime(op, or);
    if (r !== this.regime) {
      this.regime = r;
      this.nameEl.textContent = REGIME_WORDS[r];
    } else if (this.nameEl.textContent === "—") this.nameEl.textContent = REGIME_WORDS[r];
    this.numsEl.textContent = `O_p ${op.toFixed(2)} · O_r ${or.toFixed(2)}`;
    this.draw();
  }

  clear(): void {
    this.trail.length = 0;
    this.nameEl.textContent = "—";
    this.numsEl.textContent = "";
    this.draw();
  }

  private draw(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = this.canvas;
    if (c.width !== SIZE * dpr) {
      c.width = SIZE * dpr;
      c.height = SIZE * dpr;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    const S = SIZE - PAD - 4;
    const X = (v: number): number => PAD + v * S;
    const Y = (v: number): number => 4 + (1 - v) * S;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(X(0), Y(1), S, S);
    // Tunstrøm's three named regions
    const box = (x0: number, x1: number, y0: number, y1: number, col: string): void => {
      ctx.fillStyle = col;
      ctx.fillRect(X(x0), Y(y1), (x1 - x0) * S, (y1 - y0) * S);
    };
    box(TUNSTROM.hi, 1, 0, TUNSTROM.lo, "rgba(127,211,236,0.16)");
    box(0, TUNSTROM.lo, TUNSTROM.hi, 1, "rgba(242,196,109,0.18)");
    box(0, TUNSTROM.lo, 0, TUNSTROM.lo, "rgba(200,200,210,0.12)");
    ctx.font = `10px "IBM Plex Sans", system-ui, sans-serif`;
    ctx.fillStyle = "rgba(230,236,240,0.75)";
    ctx.textAlign = "center";
    ctx.fillText("mill", X(TUNSTROM.lo / 2), Y(0.83));
    ctx.fillText("polar", X(0.83), Y(TUNSTROM.lo / 2) + 3);
    ctx.fillText("swarm", X(TUNSTROM.lo / 2), Y(TUNSTROM.lo / 2) + 3);
    ctx.font = `10px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillStyle = "rgba(220,228,235,0.7)";
    ctx.fillText("O_p →", X(0.5), SIZE - 3);
    ctx.save();
    ctx.translate(9, Y(0.5));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("O_r →", 0, 0);
    ctx.restore();
    if (this.trail.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.trail.forEach(([a, b], i) => (i === 0 ? ctx.moveTo(X(a), Y(b)) : ctx.lineTo(X(a), Y(b))));
      ctx.stroke();
    }
    const last = this.trail[this.trail.length - 1];
    if (last) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(X(last[0]), Y(last[1]), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
