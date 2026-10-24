// Tune (00-foundation.md § 2.1): the rule's numbers in plain words with the
// symbol as a secondary label, the fish colour, and a way back to the scene's
// values. (M1 puts The Order Dial in front of the noise slider.)

import type { Slider } from "@bp/studio";
import { h, segmented, slider } from "@bp/studio";
import type { RuleParams } from "./model/params.js";
import type { FishColour } from "./render/ocean-view.js";
import { MIN_RCOH } from "./app.js";

export interface TuneActions {
  rule: (r: RuleParams, phase: "start" | "move" | "end") => void;
  reset: () => void;
  colour: (c: FishColour) => void;
}

export interface TunePanel {
  sync(r: RuleParams, colour: FishColour): void;
}

type Key = keyof RuleParams;

const SPECS: { key: Key; label: string; symbol: string; min: number; max: number; step: number; unit?: string; hint: string; digits?: number }[] = [
  { key: "wAli", label: "Alignment", symbol: "w_ali", min: 0, max: 3, step: 0.05, hint: "How strongly each fish matches its neighbours' heading. Turn it up for tight, parallel schools." },
  { key: "wCoh", label: "Cohesion", symbol: "w_coh", min: 0, max: 3, step: 0.05, hint: "How strongly each fish steers towards its neighbours' centre." },
  { key: "wSep", label: "Separation", symbol: "w_sep", min: 0, max: 3, step: 0.05, hint: "How strongly each fish keeps its distance from the closest ones." },
  { key: "rCoh", label: "Reach", symbol: "r", min: MIN_RCOH, max: 0.18, step: 0.005, hint: "How far a fish sees its neighbours (alignment 0.72 r, separation 0.3 r).", digits: 3 },
  { key: "maxSpeed", label: "Top speed", symbol: "v_max", min: 0.003, max: 0.013, step: 0.0005, hint: "Distance per step; the slowest a fish swims is 0.42 of this.", digits: 4 },
  { key: "noise", label: "Panic", symbol: "η", min: 0, max: 0.6, step: 0.01, hint: "Random turning: each step a fish's heading turns by up to ±η·180°. Enough of it melts a school into a swarm." },
];

export function buildTune(body: HTMLElement, act: TuneActions, initial: RuleParams): TunePanel {
  body.textContent = "";
  let state: RuleParams = { ...initial };
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
      format: s.digits ? (v) => v.toFixed(s.digits) : undefined,
      onInput: (v) => {
        state = { ...state, [s.key]: v };
        act.rule(state, dragging ? "move" : "start");
        dragging = true;
      },
      onCommit: (v) => {
        state = { ...state, [s.key]: v };
        if (!dragging) act.rule(state, "start");
        act.rule(state, "end");
        dragging = false;
      },
    });
    sliders.set(s.key, sl);
    body.append(sl.el);
  }
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Back to the scene's values");
  reset.addEventListener("click", () => act.reset());
  const colour = segmented<FishColour>(
    "Fish colour",
    [
      { value: "silver", label: "Silver" },
      { value: "heading", label: "Heading" },
    ],
    "silver",
    (v) => act.colour(v),
  );
  body.append(h("div", { class: "sw-tune-row" }, reset), h("div", { class: "sw-tune-row" }, h("span", { class: "sw-tune-label" }, "Fish colour"), colour.el));
  return {
    sync(r, c) {
      state = { ...r };
      for (const s of SPECS) sliders.get(s.key)!.set(r[s.key]);
      colour.set(c);
    },
  };
}
