// Tune (00-foundation.md § 2.1): the model's five numbers in plain words with
// the symbol as a secondary label, the palette, and a way back to Jones's
// values. (M1 replaces the sliders' front seat with the personality pad.)

import type { Slider } from "@bp/studio";
import { h, segmented, slider } from "@bp/studio";
import type { JonesParams } from "./proof/gate.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";

export interface TuneActions {
  params: (p: JonesParams, phase: "start" | "move" | "end") => void;
  reset: () => void;
  palette: (p: PaletteId) => void;
}

export interface TunePanel {
  sync(p: JonesParams, palette: PaletteId): void;
}

type Key = keyof JonesParams;

const SPECS: { key: Key; label: string; symbol: string; min: number; max: number; step: number; unit?: string; hint: string }[] = [
  { key: "delta_phi_deg", label: "Turn angle", symbol: "Δφ", min: 5, max: 90, step: 0.5, unit: "°", hint: "How far apart the side sensors look, and how sharply agents turn." },
  { key: "L_sense", label: "Sensor reach", symbol: "Lₛ", min: 1, max: 30, step: 0.5, unit: " cells", hint: "How far ahead agents smell. Longer reach, coarser network." },
  { key: "L_move", label: "Step", symbol: "Lₘ", min: 0.25, max: 3, step: 0.05, unit: " cells", hint: "How far an agent moves each step." },
  { key: "deposit", label: "Deposit", symbol: "d", min: 1, max: 15, step: 0.5, hint: "Trail each agent leaves per step." },
  { key: "decay_alpha", label: "Fade", symbol: "α", min: 0.02, max: 0.4, step: 0.005, hint: "Fraction of trail lost each step. Faster fade, thinner tubes." },
];

export function buildTune(body: HTMLElement, act: TuneActions): TunePanel {
  body.textContent = "";
  let state: JonesParams = { delta_phi_deg: 45, L_sense: 9, L_move: 1, deposit: 5, decay_alpha: 0.1 };
  const sliders = new Map<Key, Slider>();
  let dragging = false;
  for (const s of SPECS) {
    const sl = slider({
      label: s.label,
      symbol: s.symbol,
      min: s.min,
      max: s.max,
      step: s.step,
      value: state[s.key],
      unit: s.unit,
      hint: s.hint,
      onInput: (v) => {
        state = { ...state, [s.key]: v };
        act.params(state, dragging ? "move" : "start");
        dragging = true;
      },
      onCommit: (v) => {
        state = { ...state, [s.key]: v };
        if (!dragging) act.params(state, "start");
        act.params(state, "end");
        dragging = false;
      },
    });
    sliders.set(s.key, sl);
    body.append(sl.el);
  }
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Back to the scene's values");
  reset.addEventListener("click", () => act.reset());
  const pal = segmented(
    "Palette",
    (Object.keys(PALETTES) as PaletteId[]).map((id) => ({ value: id, label: PALETTES[id].label })),
    "ember" as PaletteId,
    (v) => act.palette(v),
  );
  body.append(h("div", { class: "ph-tune-row" }, reset), h("div", { class: "ph-tune-row" }, h("span", { class: "ph-tune-label" }, "Palette"), pal.el));
  return {
    sync(p, palette) {
      state = { ...p };
      for (const s of SPECS) sliders.get(s.key)!.set(p[s.key]);
      pal.set(palette);
    },
  };
}
