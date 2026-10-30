// Watch one's panel (03-boids-2d.md § Tools): what the GPU reports about the
// watched fish — its speed and heading, how many fish are inside its reach,
// the nearest, how well its heading agrees with theirs — and, in Eyes Only,
// its retina: the binary visual field the vision kernel computed for it on
// the last step, unrolled from behind-left through ahead to behind-right, with
// the edges that pull it marked. The world's y axis points down the screen, so
// the model's positive φ (counter-clockwise in its maths) is the fish's right
// as you see it: the strip puts φ = −π at its left end, ahead in the middle. Everything shown is read back; nothing is
// recomputed here except the summaries of the neighbour list.

import { h, icon } from "@bp/studio";
import type { WatchState } from "./app.js";
import type { BrainParams } from "./model/brains.js";
import { VISION_BINS } from "./model/vision-cpu.js";
import { SPECIES_NAMES, speciesCss } from "./render/ocean-view.js";

const STRIP_W = 256;
const STRIP_H = 30;

export interface WatchSummary {
  /** Speed as a fraction of the brain's top (or preferred) speed. */
  speed: number;
  /** Heading, degrees clockwise from north on screen (y down). */
  headingDeg: number;
  /** Fish inside the reach (all), and the nearest one's distance (world units). */
  within: number;
  nearest: number;
  /** Mean cosine between its heading and its listed neighbours' (1 = all agree). */
  agreement: number;
}

/** Summaries of a record (exported for the unit tests). */
export function summarize(w: WatchState, topSpeed: number): WatchSummary | null {
  const r = w.rec;
  if (!r || !r.found) return null;
  const sp = Math.hypot(r.vel[0], r.vel[1]);
  const hx = sp > 0 ? r.vel[0] / sp : 1;
  const hy = sp > 0 ? r.vel[1] / sp : 0;
  let nearest = Infinity;
  let agree = 0;
  let k = 0;
  for (let i = 0; i < r.listed; i += 1) {
    const dx = r.list[i * 4]!;
    const dy = r.list[i * 4 + 1]!;
    const vx = r.list[i * 4 + 2]!;
    const vy = r.list[i * 4 + 3]!;
    nearest = Math.min(nearest, Math.hypot(dx, dy));
    const l = Math.hypot(vx, vy);
    if (l > 0) {
      agree += (vx * hx + vy * hy) / l;
      k += 1;
    }
  }
  // screen y points down: a heading of (0, −1) is north
  const deg = ((Math.atan2(hx, -hy) * 180) / Math.PI + 360) % 360;
  return { speed: sp / Math.max(topSpeed, 1e-12), headingDeg: deg, within: r.total, nearest, agreement: k > 0 ? agree / k : NaN };
}

export class WatchPanel {
  readonly el: HTMLElement;
  onLetGo: (() => void) | null = null;
  onFollow: (() => void) | null = null;
  private readonly title: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly retinaBox: HTMLElement;
  private readonly strip: HTMLCanvasElement;
  private readonly retinaText: HTMLElement;
  private readonly kindBox: HTMLElement;
  private readonly followBtn: HTMLButtonElement;
  private readonly status: HTMLElement;

  constructor() {
    this.title = h("span", { class: "sw-watch-title" }, "Watching one fish");
    const letGo = h("button", { type: "button", class: "bp-btn bp-btn-quiet sw-watch-btn", "aria-label": "Let go of this fish" }, "Let go");
    letGo.addEventListener("click", () => this.onLetGo?.());
    this.followBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet sw-watch-btn", hidden: true }, "Follow");
    this.followBtn.addEventListener("click", () => this.onFollow?.());
    this.rows = h("dl", { class: "sw-watch-rows" });
    this.strip = h("canvas", {
      class: "sw-retina",
      role: "img",
      "aria-label": "The fish's visual field, all the way round: what it sees covered in light, the edges it is drawn to marked in amber. Ahead is in the middle, behind at both ends, its left (as you see it) on the left.",
    });
    this.strip.style.width = `${STRIP_W}px`;
    this.strip.style.height = `${STRIP_H}px`;
    this.retinaText = h("p", { class: "sw-retina-text" }, "");
    this.retinaBox = h(
      "div",
      { class: "sw-retina-box", hidden: true },
      h("span", { class: "sw-regime-key" }, "What it sees · its whole retina"),
      this.strip,
      h("div", { class: "sw-retina-axis bp-mono", "aria-hidden": "true" }, h("span", {}, "behind"), h("span", {}, "left"), h("span", {}, "ahead"), h("span", {}, "right"), h("span", {}, "behind")),
      this.retinaText,
    );
    this.kindBox = h("p", { class: "sw-watch-kind", hidden: true });
    this.status = h("p", { class: "sw-watch-status", role: "status" }, "");
    this.el = h(
      "section",
      { class: "sw-watch bp-surface", "aria-label": "The fish you are watching", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      h("div", { class: "sw-watch-head" }, h("span", { class: "sw-watch-icon", html: icon("eye", 16) }), this.title, h("span", { class: "sw-watch-actions" }, this.followBtn, letGo)),
      this.rows,
      this.kindBox,
      this.retinaBox,
      this.status,
    );
  }

  /** Show what the record says (`brain` decides the reach's name and the extras). */
  set(w: WatchState, brain: BrainParams | null, topSpeed: number, n: number): void {
    this.followBtn.hidden = w.follow;
    if (w.id === null) return;
    this.title.textContent = `Watching fish ${(w.id + 1).toLocaleString()} of ${n.toLocaleString()}`;
    if (w.lost) {
      this.status.textContent = "It is gone — eaten by a shark, or starved.";
      return;
    }
    const s = summarize(w, topSpeed);
    if (!s) {
      this.status.textContent = "Finding it…";
      return;
    }
    this.status.textContent = w.follow ? "" : "You moved the view; the ring still marks it.";
    const unit = !brain ? "r" : brain.kind === "vision" ? "body lengths" : brain.kind === "couzin" ? "r_r" : "r";
    const reachUnit = !brain || brain.kind === "species" ? (w.rec?.radius ?? 1) : brain.kind === "vicsek" ? brain.p.r : brain.kind === "vision" ? 2 * brain.p.R : 1;
    const reachName = !brain ? "within r" : brain.kind === "vision" ? "it could see" : brain.kind === "couzin" ? "in its orientation zone" : "within r";
    const nearest = Number.isFinite(s.nearest) ? (s.nearest / reachUnit).toFixed(unit === "r" ? 2 : 1) : "—";
    const rows: [string, string][] = [
      ["Speed", brain?.kind === "vision" ? `${s.speed.toFixed(2)} × v₀` : `${(s.speed * 100).toFixed(0)}% of top`],
      ["Heading", `${Math.round(s.headingDeg)}°`],
      [`Fish ${reachName}`, s.within.toLocaleString()],
      ["Nearest", `${nearest} ${unit}`],
    ];
    if (brain?.kind !== "vision") rows.push(["Agrees with them", Number.isFinite(s.agreement) ? s.agreement.toFixed(2) : "—"]);
    this.rows.textContent = "";
    for (const [k, v] of rows) this.rows.append(h("dt", {}, k), h("dd", { class: "bp-mono" }, v));

    this.kindBox.hidden = brain?.kind !== "species";
    if (brain?.kind === "species" && w.rec) {
      const me = Math.min(5, Math.max(0, Math.round(w.rec.align)));
      const chase: string[] = [];
      const flee: string[] = [];
      for (let j = 0; j < brain.p.count; j += 1) {
        if (j === me) continue;
        const g = brain.p.gc[me * 6 + j]!;
        if (g > 0.3) chase.push(SPECIES_NAMES[j]!);
        else if (g < -0.3) flee.push(SPECIES_NAMES[j]!);
      }
      this.kindBox.textContent = "";
      const words = [chase.length ? `steers towards ${chase.join(" and ")}` : "", flee.length ? `away from ${flee.join(" and ")}` : ""].filter(Boolean).join(", ");
      this.kindBox.append(
        h("span", { class: "sw-swatch", style: `background:${speciesCss(me)}` }),
        `A ${SPECIES_NAMES[me]} fish${words ? ` — ${words}` : " — ignores the other kinds"}.`,
      );
    }

    this.retinaBox.hidden = brain?.kind !== "vision";
    if (brain?.kind === "vision") this.drawRetina(w, brain);
  }

  private drawRetina(w: WatchState, brain: Extract<BrainParams, { kind: "vision" }>): void {
    const u = w.retina;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = this.strip;
    if (c.width !== STRIP_W * dpr) {
      c.width = STRIP_W * dpr;
      c.height = STRIP_H * dpr;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, STRIP_W, STRIP_H);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);
    if (!u) {
      this.retinaText.textContent = "Reading its eyes…";
      return;
    }
    const bin = (k: number): number => (u[k >>> 5]! >>> (k & 31)) & 1;
    const bw = STRIP_W / VISION_BINS;
    // bin k's centre is at φ = −π + (k + ½)·2π/NB: bin 0 (behind, on its left as you see it) sits at the left end
    ctx.fillStyle = "rgba(214,236,255,0.85)";
    for (let k = 0; k < VISION_BINS; k += 1) if (bin(k)) ctx.fillRect(k * bw, 4, bw + 0.02, STRIP_H - 8);
    ctx.fillStyle = "rgba(255,184,82,1)";
    for (let k = 0; k < VISION_BINS; k += 1) {
      if (bin(k) !== bin((k + VISION_BINS - 1) % VISION_BINS)) ctx.fillRect(k * bw - 0.75, 0, 1.5, STRIP_H);
    }
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(STRIP_W / 2 - 0.5, 0, 1, 3);
    ctx.fillRect(STRIP_W / 2 - 0.5, STRIP_H - 3, 1, 3);
    const f = new Float32Array(u.buffer, u.byteOffset + 32, 4);
    const [bc, bs, ec, es] = [f[0]!, f[1]!, f[2]!, f[3]!];
    const edges = u[12]!;
    const cover = u[14]! / VISION_BINS;
    const p = brain.p;
    const dv = p.a0 * (-bc + p.a1 * ec);
    const dpsi = p.b0 * (-bs + p.b1 * es) * p.dt;
    const fwd = Math.abs(dv) < 1e-4 ? "neither pushed nor held" : dv > 0 ? "drawn forward" : "held back";
    const turnDeg = (dpsi * 180) / Math.PI;
    // positive ψ turns clockwise on the screen
    const turn = Math.abs(turnDeg) < 0.05 ? "holding its line" : `turning ${turnDeg > 0 ? "right" : "left"} ${Math.abs(turnDeg).toFixed(1)}° a step`;
    this.retinaText.textContent = `${Math.round(cover * 100)}% of its view covered, ${edges} edge${edges === 1 ? "" : "s"}: ${fwd}, ${turn}.`;
  }
}
