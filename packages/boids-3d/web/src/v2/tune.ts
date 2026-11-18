// Tune: three controls (00-foundation.md § 2.1) — the flock's character
// (v1's six presets, under plain names), how low the sun is, and how large
// the birds are drawn. Only the first changes the model; it reseeds, as in v1.

import { h, slider } from "@bp/studio";
import type { Slider } from "@bp/studio";
import { PRESETS } from "./model/flock.js";
import { FLOCK_NAMES } from "./scenes.js";

export interface TuneHandlers {
  flock: (label: string) => void;
  sun: (deg: number) => void;
  size: (scale: number) => void;
}

export interface TuneState {
  flock: string;
  sun: number;
  size: number;
}

export interface TunePane {
  sync(s: TuneState): void;
}

export function buildTune(body: HTMLElement, hd: TuneHandlers, s0: TuneState): TunePane {
  body.textContent = "";
  const selectId = "mm-flock-select";
  const select = h("select", { id: selectId, class: "mm-select" });
  for (const p of PRESETS) {
    const o = h("option", { value: p.label }, FLOCK_NAMES[p.label]?.name ?? p.label);
    select.append(o);
  }
  select.value = s0.flock;
  const hint = h("p", { class: "mm-hint" }, FLOCK_NAMES[s0.flock]?.hint ?? "");
  select.addEventListener("change", () => {
    hint.textContent = FLOCK_NAMES[select.value]?.hint ?? "";
    hd.flock(select.value);
  });
  const flockRow = h("div", { class: "mm-field" }, h("label", { for: selectId, class: "mm-field-label" }, "Flock"), select, hint);
  const sun: Slider = slider({
    label: "Sun",
    min: -10,
    max: -0.5,
    step: 0.1,
    value: s0.sun,
    format: (v) => `${Math.abs(v).toFixed(1)}° below`,
    hint: "How far the sun has set. Lower, and the afterglow deepens from amber to red.",
    onInput: (v) => hd.sun(v),
  });
  const size: Slider = slider({
    label: "Drawn size",
    min: 1,
    max: 8,
    step: 0.1,
    value: s0.size,
    unit: "×",
    format: (v) => v.toFixed(1),
    hint: "How large each bird is drawn, against a real starling's 40 cm wingspan. The model's flock is sparser than a real one, so the default draws them larger.",
    onInput: (v) => hd.size(v),
  });
  body.append(flockRow, sun.el, size.el);
  return {
    sync(s) {
      select.value = s.flock;
      hint.textContent = FLOCK_NAMES[s.flock]?.hint ?? "";
      sun.set(s.sun);
      size.set(s.size);
    },
  };
}
