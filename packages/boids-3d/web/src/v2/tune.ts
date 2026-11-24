// Tune: four controls (00-foundation.md § 2.1). Two change the model — how
// strongly a bird matches its neighbours' heading, and how fast it reacts to
// an alarmed neighbour — and take effect at the next step; two change only the
// picture — how low the sun is, and how large the birds are drawn.

import { h, slider } from "@bp/studio";
import type { Slider } from "@bp/studio";

export interface TuneHandlers {
  align: (v: number) => void;
  reaction: (steps: number) => void;
  sun: (deg: number) => void;
  size: (scale: number) => void;
  reset: () => void;
}

export interface TuneState {
  align: number;
  reaction: number;
  sun: number;
  size: number;
}

export interface TunePane {
  sync(s: TuneState): void;
}

export function buildTune(body: HTMLElement, hd: TuneHandlers, s0: TuneState): TunePane {
  body.textContent = "";
  const align: Slider = slider({
    label: "Alignment",
    min: 0.2,
    max: 3,
    step: 0.05,
    value: s0.align,
    format: (v) => v.toFixed(2),
    hint: "How strongly each bird matches the heading of the seven it follows. Lower, and the flock loosens into a swarm.",
    onInput: (v) => hd.align(v),
  });
  const reaction: Slider = slider({
    label: "Reaction time",
    min: 2,
    max: 30,
    step: 1,
    value: s0.reaction,
    unit: " ms",
    format: (v) => String(Math.round((v * 1000) / 120)),
    hint: "How long a bird takes to react to an alarmed neighbour. Shorter, and the escape wave runs faster.",
    onInput: (v) => hd.reaction(Math.round(v)),
  });
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
    min: 0.5,
    max: 4,
    step: 0.1,
    value: s0.size,
    unit: "×",
    format: (v) => v.toFixed(1),
    hint: "How large each bird is drawn, against a real starling's 40 cm wingspan.",
    onInput: (v) => hd.size(v),
  });
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "The model's own");
  reset.addEventListener("click", () => hd.reset());
  body.append(align.el, reaction.el, sun.el, size.el, h("div", { class: "mm-tune-row" }, reset));
  return {
    sync(s) {
      align.set(s.align);
      reaction.set(s.reaction);
      sun.set(s.sun);
      size.set(s.size);
    },
  };
}
