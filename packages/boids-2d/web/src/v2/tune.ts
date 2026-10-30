// Tune (00-foundation.md § 2.1): the rule's numbers in plain words with the
// symbol as a secondary label, the fish colour, and a way back to the scene's
// values. Each brain shows its own knobs: the v4 Reynolds rule (Open Water),
// Couzin's zones (The Mill). The Order Dial's knobs — panic η and crowding ρ —
// are on the canvas, in the dial's panel.

import type { Slider } from "@bp/studio";
import { h, segmented, slider } from "@bp/studio";
import type { BrainParams, CouzinParams } from "./model/brains.js";
import type { RuleParams } from "./model/params.js";
import type { FishColour } from "./render/ocean-view.js";
import { MIN_RCOH } from "./app.js";
import { VICSEK_V0 } from "./scenes.js";

export interface TuneActions {
  rule: (r: RuleParams, phase: "start" | "move" | "end") => void;
  brain: (b: BrainParams, phase: "start" | "move" | "end") => void;
  reset: () => void;
  colour: (c: FishColour) => void;
}

export interface TunePanel {
  sync(r: RuleParams, brain: BrainParams | null, colour: FishColour): void;
  /** M2 scenes' own knobs (the water, the ecology); `hideRule` hides the fish rule's. */
  setExtra(title: string | null, specs: ExtraSpec[], hideRule: boolean): void;
}

/** A knob bound straight to a live value (M2: Current's water, Food Chain's ecology). */
export interface ExtraSpec {
  label: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint: string;
  digits?: number;
  get: () => number;
  set: (v: number) => void;
}

interface Spec<T> {
  key: keyof T & string;
  label: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint: string;
  digits?: number;
  /** Shown value ↔ stored value (default identity). */
  show?: (v: number, all: T) => number;
  store?: (v: number, all: T) => number;
}

const REYNOLDS: Spec<RuleParams>[] = [
  { key: "wAli", label: "Alignment", symbol: "w_ali", min: 0, max: 3, step: 0.05, hint: "How strongly each fish matches its neighbours' heading. Turn it up for tight, parallel schools." },
  { key: "wCoh", label: "Cohesion", symbol: "w_coh", min: 0, max: 3, step: 0.05, hint: "How strongly each fish steers towards its neighbours' centre." },
  { key: "wSep", label: "Separation", symbol: "w_sep", min: 0, max: 3, step: 0.05, hint: "How strongly each fish keeps its distance from the closest ones." },
  { key: "rCoh", label: "Reach", symbol: "r", min: MIN_RCOH, max: 0.18, step: 0.005, hint: "How far a fish sees its neighbours (alignment 0.72 r, separation 0.3 r).", digits: 3 },
  { key: "maxSpeed", label: "Top speed", symbol: "v_max", min: 0.003, max: 0.013, step: 0.0005, hint: "Distance per step; the slowest a fish swims is 0.42 of this.", digits: 4 },
  { key: "noise", label: "Panic", symbol: "η", min: 0, max: 0.6, step: 0.01, hint: "Random turning: each step a fish's heading turns by up to ±η·180°. Enough of it melts a school into a swarm." },
];

const DEG = Math.PI / 180;
const COUZIN: Spec<CouzinParams>[] = [
  {
    key: "ro",
    label: "Orientation zone",
    symbol: "Δr_o",
    min: 0,
    max: 8,
    step: 0.25,
    unit: " r_r",
    hint: "The ring in which a fish matches its neighbours' heading. Narrow, the school mills; wider, it swims off as one (Couzin et al. 2002).",
    digits: 2,
    show: (v, p) => v - p.rr,
    store: (v, p) => p.rr + v,
  },
  { key: "fovDeg", label: "Field of view", symbol: "α", min: 180, max: 360, step: 5, unit: "°", hint: "How much of the world around it a fish sees; the rest, behind it, is blind." },
  {
    key: "maxTurn",
    label: "Turn rate",
    symbol: "θ",
    min: 1,
    max: 12,
    step: 0.5,
    unit: "° per step",
    hint: "The sharpest a fish can turn in one step.",
    digits: 1,
    show: (v) => v / DEG,
    store: (v) => v * DEG,
  },
  { key: "sigma", label: "Noise", symbol: "σ", min: 0, max: 0.4, step: 0.01, unit: " rad", hint: "A random twist added to each fish's chosen heading every step.", digits: 2 },
];

export function buildTune(body: HTMLElement, act: TuneActions, initial: RuleParams): TunePanel {
  body.textContent = "";
  let rule: RuleParams = { ...initial };
  let brain: BrainParams | null = null;
  let dragging = false;
  const reynoldsBox = h("div", {});
  const couzinBox = h("div", {});
  const vicsekBox = h(
    "p",
    { class: "sw-note" },
    `The Order Dial runs the Vicsek model; its knobs are on the canvas — panic η on the dial, crowding ρ under the map. ` +
      `Speed v₀ is ${VICSEK_V0} r per step.`,
  );
  const rSliders = new Map<string, Slider>();
  const cSliders = new Map<string, Slider>();

  for (const s of REYNOLDS) {
    const sl = slider({
      label: s.label,
      symbol: s.symbol,
      min: s.min,
      max: s.max,
      step: s.step,
      value: rule[s.key],
      unit: s.unit,
      hint: s.hint,
      format: s.digits ? (v) => v.toFixed(s.digits) : undefined,
      onInput: (v) => {
        rule = { ...rule, [s.key]: v };
        act.rule(rule, dragging ? "move" : "start");
        dragging = true;
      },
      onCommit: (v) => {
        rule = { ...rule, [s.key]: v };
        if (!dragging) act.rule(rule, "start");
        act.rule(rule, "end");
        dragging = false;
      },
    });
    rSliders.set(s.key, sl);
    reynoldsBox.append(sl.el);
  }

  const couzinSet = (s: Spec<CouzinParams>, v: number, phase: "start" | "move" | "end"): void => {
    if (!brain || brain.kind !== "couzin") return;
    const p = { ...brain.p, [s.key]: s.store ? s.store(v, brain.p) : v };
    brain = { kind: "couzin", p };
    act.brain(brain, phase);
  };
  for (const s of COUZIN) {
    const sl = slider({
      label: s.label,
      symbol: s.symbol,
      min: s.min,
      max: s.max,
      step: s.step,
      value: s.min,
      unit: s.unit,
      hint: s.hint,
      format: s.digits !== undefined ? (v) => v.toFixed(s.digits) : undefined,
      onInput: (v) => {
        couzinSet(s, v, dragging ? "move" : "start");
        dragging = true;
      },
      onCommit: (v) => {
        if (!dragging) couzinSet(s, v, "start");
        couzinSet(s, v, "end");
        dragging = false;
      },
    });
    cSliders.set(s.key, sl);
    couzinBox.append(sl.el);
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
  const extraBox = h("div", {});
  let hideRuleBox = false;
  body.append(
    reynoldsBox,
    couzinBox,
    vicsekBox,
    extraBox,
    h("div", { class: "sw-tune-row" }, reset),
    h("div", { class: "sw-tune-row" }, h("span", { class: "sw-tune-label" }, "Fish colour"), colour.el),
  );
  return {
    sync(r, b, c) {
      rule = { ...r };
      brain = b ? structuredClone(b) : null;
      reynoldsBox.hidden = b !== null || hideRuleBox;
      couzinBox.hidden = b?.kind !== "couzin";
      vicsekBox.hidden = b?.kind !== "vicsek";
      for (const s of REYNOLDS) rSliders.get(s.key)!.set(r[s.key]);
      if (b?.kind === "couzin") for (const s of COUZIN) cSliders.get(s.key)!.set(s.show ? s.show(b.p[s.key], b.p) : b.p[s.key]);
      colour.set(c);
    },
    setExtra(title, specs, hideRule) {
      hideRuleBox = hideRule;
      reynoldsBox.hidden = brain !== null || hideRule;
      extraBox.textContent = "";
      if (title) extraBox.append(h("p", { class: "sw-tune-label" }, title));
      for (const x of specs) {
        const sl = slider({
          label: x.label,
          symbol: x.symbol,
          min: x.min,
          max: x.max,
          step: x.step,
          value: x.get(),
          unit: x.unit,
          hint: x.hint,
          format: x.digits !== undefined ? (v) => (x.digits! > 4 ? v.toExponential(1) : v.toFixed(x.digits)) : undefined,
          onInput: (v) => x.set(v),
          onCommit: (v) => x.set(v),
        });
        extraBox.append(sl.el);
      }
    },
  };
}
