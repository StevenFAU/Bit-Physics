// Tune: four controls, no more (06-curl-noise.md, "Tools") — Swirl size,
// Detail, Speed, Evolution — each change an undoable edit at a step
// boundary; and a way back to the scene's field or to the gate's own.

import { h, slider } from "@bp/studio";
import type { Slider } from "@bp/studio";
import type { FieldParams } from "./model/flow.js";
import { cloneField } from "./model/flow.js";

export interface TuneHandlers {
  field: (p: FieldParams, speed: number) => void;
  reset: () => void;
  gated: () => void;
}

export interface TunePane {
  sync(p: FieldParams, speed: number): void;
}

export function buildTune(body: HTMLElement, hd: TuneHandlers, p0: FieldParams, speed0: number): TunePane {
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
  body.append(swirl.el, detail.el, pace.el, evo.el, h("div", { class: "fs-tune-row" }, reset, gated));
  return {
    sync(np, sp) {
      p = cloneField(np);
      speed = sp;
      swirl.set(np.ell0);
      detail.set(np.octaves);
      pace.set(sp);
      evo.set(np.evolution);
    },
  };
}
