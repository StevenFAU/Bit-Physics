// Tune: the physics (σ, ρ, β — each change an undoable edit at a step
// boundary) and, below it, the look (long exposure, fixed points, member
// paths). Display controls sit under the physics, never beside it.

import { h, slider, toggle } from "@bp/studio";
import type { Slider, Toggle } from "@bp/studio";
import type { LorenzParams } from "./model/lorenz.js";
import type { ChaosLook } from "./render/chaos-view.js";

export interface TuneHandlers {
  params: (p: LorenzParams) => void;
  reset: () => void;
  look: (l: Partial<ChaosLook>) => void;
}

export interface TunePane {
  sync(p: LorenzParams, look: ChaosLook): void;
}

export function buildTune(body: HTMLElement, hd: TuneHandlers, p0: LorenzParams, look0: ChaosLook): TunePane {
  body.textContent = "";
  let p = { ...p0 };
  const send = (): void => hd.params({ ...p });
  const sigma = slider({ label: "Prandtl number", symbol: "σ", min: 1, max: 30, step: 0.1, value: p.sigma, format: (v) => v.toFixed(1), onInput: (v) => ((p.sigma = v), send()) });
  const rho = slider({
    label: "Heating",
    symbol: "ρ",
    min: 0.5,
    max: 200,
    step: 0.05,
    value: p.rho,
    format: (v) => v.toFixed(2),
    hint: "Below 24.74 the wings' centres become stable and the motion dies down onto one of them. Near 99.65 chaos gives way to a periodic orbit.",
    onInput: (v) => ((p.rho = v), send()),
  });
  const beta = slider({ label: "Geometry", symbol: "β", min: 0.5, max: 5, step: 0.005, value: p.beta, format: (v) => v.toFixed(3), onInput: (v) => ((p.beta = v), send()) });
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Lorenz's values");
  reset.addEventListener("click", () => hd.reset());
  const tau: Slider = slider({
    label: "Long exposure",
    min: 0.05,
    max: 2,
    step: 0.05,
    value: look0.tau,
    unit: " s",
    format: (v) => v.toFixed(2),
    onInput: (v) => hd.look({ tau: v }),
  });
  const fixed: Toggle = toggle("Fixed points", look0.showFixedPoints, (on) => hd.look({ showFixedPoints: on }), "The origin and the two wing centres C±");
  const tracks: Toggle = toggle("Member paths", look0.showTracks, (on) => hd.look({ showTracks: on }), "The recent paths of a few of the ball's members");
  body.append(
    h("h3", { class: "cx-tune-h" }, "The system"),
    sigma.el,
    rho.el,
    beta.el,
    reset,
    h("h3", { class: "cx-tune-h" }, "The picture"),
    tau.el,
    h("div", { class: "cx-tune-row" }, fixed.el, tracks.el),
  );
  return {
    sync(np, look) {
      p = { ...np };
      sigma.set(np.sigma);
      rho.set(np.rho);
      beta.set(np.beta);
      tau.set(look.tau);
      fixed.set(look.showFixedPoints);
      tracks.set(look.showTracks);
    },
  };
}
