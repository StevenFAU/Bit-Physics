// Tune (00-foundation.md § 2.1): the few controls that matter, named in plain
// words with the symbol as a secondary label. Every change is an edit event
// (undoable, replayable) and goes into the share link.

import type { Slider } from "@bp/studio";
import { SPEEDS, h, segmented, slider } from "@bp/studio";
import type { ModelId } from "../model/models.js";
import { MODELS } from "../model/models.js";
import type { PaletteId } from "../render/look.js";
import { PALETTES } from "../render/look.js";

export interface TuneActions {
  chemistry: (F: number, k: number, phase: "start" | "move" | "end") => void;
  ratio: (r: number, phase: "start" | "move" | "end") => void;
  speed: (v: number) => void;
  palette: (p: PaletteId) => void;
}

export interface TuneState {
  /** The model whose two parameters ride in the F and k slots. */
  model: ModelId;
  F: number;
  k: number;
  ratio: number;
  speed: number;
  palette: PaletteId;
  /** The Map sweeps F and k — single values do not apply. */
  sweeping: boolean;
}

export interface TunePanel {
  sync(s: TuneState): void;
  focus(sym: "F" | "k" | "D"): void;
}

/** A drag is one edit: "start" on the first input, "end" on change. */
function phased(fn: (v: number, phase: "start" | "move" | "end") => void): { input: (v: number) => void; commit: (v: number) => void } {
  let live = false;
  return {
    input: (v) => {
      fn(v, live ? "move" : "start");
      live = true;
    },
    commit: (v) => {
      if (!live) fn(v, "start");
      fn(v, "end");
      live = false;
    },
  };
}

export function buildTune(body: HTMLElement, setNote: (t: string) => void, act: TuneActions): TunePanel {
  body.textContent = "";
  let state: TuneState = { model: "gray-scott", F: 0.0367, k: 0.0649, ratio: 2, speed: 1, palette: "nocturne", sweeping: false };
  const fk = phased((v, ph) => act.chemistry(v, state.k, ph));
  const kk = phased((v, ph) => act.chemistry(state.F, v, ph));
  const rr = phased((v, ph) => act.ratio(v, ph));
  // the two model parameters (Gray–Scott: feed and kill), rebuilt per model
  const paramSlider = (i: 0 | 1, m: ModelId): Slider => {
    const p = MODELS[m].params[i];
    const ph = i === 0 ? fk : kk;
    return slider({
      label: p.label,
      symbol: p.symbol,
      min: p.min,
      max: p.max,
      step: p.step,
      value: i === 0 ? state.F : state.k,
      format: (v) => v.toFixed(p.digits),
      hint: p.hint,
      onInput: (v) => {
        if (i === 0) state.F = v;
        else state.k = v;
        ph.input(v);
      },
      onCommit: (v) => ph.commit(v),
    });
  };
  let model: ModelId = state.model;
  let feed = paramSlider(0, model);
  let kill = paramSlider(1, model);
  const speed = segmented(
    "Speed",
    SPEEDS.map((s) => ({ value: String(s), label: s === 0.25 ? "¼×" : s === 0.5 ? "½×" : `${s}×` })),
    "1",
    (v) => act.speed(Number(v)),
  );
  const ratio: Slider = slider({
    label: "Diffusion ratio",
    symbol: "D_u / D_v",
    min: 1.2,
    max: 4,
    step: 0.05,
    value: 2,
    format: (v) => v.toFixed(2),
    hint: "How much faster U spreads than V. Near 1 the patterns wash out — Turing needs the difference.",
    onInput: (v) => {
      state.ratio = v;
      rr.input(v);
    },
    onCommit: (v) => rr.commit(v),
  });
  const look = segmented(
    "Look",
    (Object.keys(PALETTES) as PaletteId[]).map((id) => ({ value: id, label: PALETTES[id].label })),
    "nocturne",
    (v) => act.palette(v as PaletteId),
  );
  const advanced = h("details", { class: "rd-tune-advanced" }, h("summary", {}, "Advanced"), ratio.el);
  body.append(
    feed.el,
    kill.el,
    h("div", { class: "rd-tune-row" }, h("span", { class: "bp-slider-label" }, "Speed"), speed.el),
    advanced,
    h("div", { class: "rd-tune-row" }, h("span", { class: "bp-slider-label" }, "Look"), look.el),
  );
  return {
    sync(s) {
      state = { ...s };
      if (s.model !== model) {
        model = s.model;
        const f = paramSlider(0, model);
        const k = paramSlider(1, model);
        feed.el.replaceWith(f.el);
        kill.el.replaceWith(k.el);
        feed = f;
        kill = k;
      }
      feed.set(s.F);
      kill.set(s.k);
      ratio.set(s.ratio);
      speed.set(String(s.speed));
      look.set(s.palette);
      // the diffusion ratio is a Gray–Scott control; the other models carry their own D_u, D_v
      advanced.hidden = s.model !== "gray-scott";
      feed.setDisabled(s.sweeping, "The Map shows every feed rate at once");
      kill.setDisabled(s.sweeping, "The Map shows every kill rate at once");
      setNote(s.sweeping ? "The Map shows every F and k at once — dive in to tune a single chemistry." : "");
    },
    focus(sym) {
      if (sym === "D") {
        (body.querySelector(".rd-tune-advanced") as HTMLDetailsElement | null)?.setAttribute("open", "");
        ratio.focus();
      } else if (sym === "F") feed.focus();
      else kill.focus();
    },
  };
}
