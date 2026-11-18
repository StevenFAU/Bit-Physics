// Tune: four controls, no more (06-curl-noise.md, "Tools") — Swirl size,
// Detail, Speed, Evolution — each change an undoable edit at a step
// boundary; and a way back to the scene's field or to the gate's own.

import { h, segmented, slider, toggle } from "@bp/studio";
import type { Slider } from "@bp/studio";
import type { FieldParams, Look } from "./model/flow.js";
import { cloneField } from "./model/flow.js";

export interface TuneHandlers {
  field: (p: FieldParams, speed: number) => void;
  reset: () => void;
  gated: () => void;
  look: (l: Look) => void;
}

export interface TunePane {
  sync(p: FieldParams, speed: number, look?: Look): void;
}

export function buildTune(body: HTMLElement, hd: TuneHandlers, p0: FieldParams, speed0: number, look0: Look): TunePane {
  body.textContent = "";
  let p = cloneField(p0);
  let speed = speed0;
  const send = (): void => hd.field(cloneField(p), speed);
  const swirl: Slider = slider({
    label: "Swirl size",
    symbol: "ℓ₀",
    min: 0.2,
    max: 1.2,
    step: 0.01,
    value: p.ell0,
    format: (v) => v.toFixed(2),
    hint: "The size of the largest eddies, against a box of 1.",
    onInput: (v) => ((p.ell0 = v), send()),
  });
  const detail: Slider = slider({
    label: "Detail",
    symbol: "octaves",
    min: 1,
    max: 5,
    step: 1,
    value: p.octaves,
    format: (v) => String(Math.round(v)),
    hint: "Layers of smaller and smaller swirls, each half the size of the last.",
    onInput: (v) => ((p.octaves = Math.round(v)), send()),
  });
  const pace: Slider = slider({
    label: "Speed",
    min: 0.25,
    max: 3,
    step: 0.05,
    value: speed,
    unit: "×",
    format: (v) => v.toFixed(2),
    hint: "A longer step each tick: the flow runs faster and its ribbons stretch.",
    onInput: (v) => ((speed = v), send()),
  });
  const evo: Slider = slider({
    label: "Evolution",
    min: 0,
    max: 0.4,
    step: 0.01,
    value: p.evolution,
    format: (v) => (v === 0 ? "still" : v.toFixed(2)),
    hint: "Let the noise drift, so the flow's pattern changes as you watch. Every instant stays exactly divergence-free.",
    onInput: (v) => ((p.evolution = v), send()),
  });
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "The scene's field");
  reset.addEventListener("click", () => hd.reset());
  const gated = h("button", { type: "button", class: "bp-btn bp-btn-quiet", title: "The release gate's own field: three octaves, swirls of 0.5, held still" }, "The gated field");
  gated.addEventListener("click", () => hd.gated());
  const look = segmented<Look>(
    "The picture",
    [
      { value: "silk", label: "Silk" },
      { value: "dust", label: "Dust" },
    ],
    look0,
    (v) => hd.look(v),
  );
  body.append(
    swirl.el,
    detail.el,
    pace.el,
    evo.el,
    h("div", { class: "fs-tune-row" }, reset, gated),
    h("h3", { class: "fs-tune-h" }, "The picture"),
    h("p", { class: "fs-note" }, "Silk: ribbons on two sheets. Dust: points filling the ball — lighter on slow GPUs."),
    look.el,
  );
  return {
    sync(np, sp, l) {
      if (l) look.set(l);
      p = cloneField(np);
      speed = sp;
      swirl.set(np.ell0);
      detail.set(np.octaves);
      pace.set(sp);
      evo.set(np.evolution);
    },
  };
}

// ---- Paint the Stream (2D) ------------------------------------------------------

export interface PaintTuneHandlers {
  speed: (multiplier: number) => void;
  contours: (on: boolean) => void;
  landscape: () => void;
  flat: () => void;
}

export interface PaintTunePane {
  sync(speed: number, contours: boolean): void;
}

/** Paint the Stream's Tune: the step, the contour lines, a new or a flat landscape. */
export function buildPaintTune(body: HTMLElement, hd: PaintTuneHandlers, speed0: number, contours0: boolean): PaintTunePane {
  body.textContent = "";
  const pace: Slider = slider({
    label: "Speed",
    min: 0.25,
    max: 3,
    step: 0.05,
    value: speed0,
    unit: "×",
    format: (v) => v.toFixed(2),
    hint: "A longer step each tick: the flow runs faster along the same contours.",
    onInput: (v) => hd.speed(v),
  });
  const lines = toggle("Contour lines", contours0, (on) => hd.contours(on), "The paths the flow takes: lines of equal height");
  const fresh = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "New landscape");
  fresh.addEventListener("click", () => hd.landscape());
  const flat = h("button", { type: "button", class: "bp-btn bp-btn-quiet", title: "Level ground: nothing flows until you paint" }, "Flat ground");
  flat.addEventListener("click", () => hd.flat());
  body.append(pace.el, h("div", { class: "fs-tune-row" }, lines.el), h("div", { class: "fs-tune-row" }, fresh, flat));
  return {
    sync(speed, contours) {
      pace.set(speed);
      lines.set(contours);
    },
  };
}
