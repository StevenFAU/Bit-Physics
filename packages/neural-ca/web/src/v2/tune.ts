// Tune (00-foundation.md § 2.1): the checkpoint's one live knob — how often a
// cell updates — in plain words with the symbol second, a way back to the
// gated value, and how the dish is shown.

import { h, segmented, slider } from "@bp/studio";
import { FIRE_RATE } from "./proof/gate.js";
import type { ViewMode } from "./render/dish-view.js";

export interface TuneActions {
  fireRate: (v: number, phase: "start" | "move" | "end") => void;
  reset: () => void;
  view: (m: ViewMode) => void;
}

export interface TunePanel {
  sync(fireRate: number, mode: ViewMode): void;
}

export const VIEW_MODES: { value: ViewMode; label: string; title: string }[] = [
  { value: "specimen", label: "Specimen", title: "The organism as it would look under glass" },
  { value: "hidden", label: "Hidden", title: "Colour from the 12 hidden channels (their three main directions)" },
  { value: "cells", label: "Cells", title: "Each cell's colour as stored, one square per cell" },
];

export function buildTune(body: HTMLElement, act: TuneActions): TunePanel {
  body.textContent = "";
  let dragging = false;
  const rate = slider({
    label: "Update chance",
    symbol: "p",
    min: 0.05,
    max: 1,
    step: 0.05,
    value: FIRE_RATE,
    hint: `Each step a cell updates with this probability. The network was trained at ${FIRE_RATE}; it copes with other rates, up to a point.`,
    onInput: (v) => {
      act.fireRate(v, dragging ? "move" : "start");
      dragging = true;
    },
    onCommit: (v) => {
      if (!dragging) act.fireRate(v, "start");
      act.fireRate(v, "end");
      dragging = false;
    },
  });
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, `Back to ${FIRE_RATE}`);
  reset.addEventListener("click", () => act.reset());
  const view = segmented("Show", VIEW_MODES, "specimen" as ViewMode, (m) => act.view(m));
  body.append(
    rate.el,
    h("div", { class: "gr-tune-row" }, reset),
    h("div", { class: "gr-tune-row" }, h("span", { class: "gr-tune-label" }, "Show"), view.el),
  );
  return {
    sync(fireRate, mode) {
      rate.set(fireRate);
      view.set(mode);
    },
  };
}
