// Tune (00-foundation.md § 2.1): the personality pad first — a species
// personality picked on a 2D pad, every point a tested parameter set — then
// the model's five numbers in plain words for anyone who wants to fine-tune,
// and the palette.

import type { Tier } from "@bp/gpu";
import type { Slider } from "@bp/studio";
import { h, segmented, slider } from "@bp/studio";
import type { PadPoint } from "./pad.js";
import { CORNERS, PAD_N, padKey, padParams, stablePoints } from "./pad.js";
import type { JonesParams } from "./proof/gate.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";

export interface TuneActions {
  pad: (p: PadPoint) => void;
  params: (p: JonesParams, phase: "start" | "move" | "end") => void;
  reset: () => void;
  palette: (p: PaletteId) => void;
}

export interface TunePanel {
  /** `padEnabled`: the scene takes personalities (false for scenes of the gated rule). */
  sync(p: JonesParams, pad: PadPoint | null, palette: PaletteId, tier: Tier, padEnabled: boolean): void;
}

type Key = keyof JonesParams;

const SPECS: { key: Key; label: string; symbol: string; min: number; max: number; step: number; unit?: string; hint: string }[] = [
  { key: "delta_phi_deg", label: "Turn angle", symbol: "Δφ", min: 5, max: 90, step: 0.25, unit: "°", hint: "How far apart the side sensors look, and how sharply agents turn." },
  { key: "L_sense", label: "Sensor reach", symbol: "Lₛ", min: 1, max: 30, step: 0.1, unit: " cells", hint: "How far ahead agents smell. Longer reach, coarser network." },
  { key: "L_move", label: "Step", symbol: "Lₘ", min: 0.25, max: 3, step: 0.01, unit: " cells", hint: "How far an agent moves each step." },
  { key: "deposit", label: "Deposit", symbol: "d", min: 1, max: 15, step: 0.5, hint: "Trail each agent leaves per step. Alone it only scales the trail; it matters against food." },
  { key: "decay_alpha", label: "Fade", symbol: "α", min: 0.02, max: 0.4, step: 0.001, hint: "Fraction of trail lost each step. Faster fade, thinner tubes." },
];

function describe(p: PadPoint): string {
  const c = CORNERS.find((k) => k.at.i === p.i && k.at.j === p.j);
  const q = padParams(p);
  const n = (v: number): number => Number(v.toPrecision(4));
  const nums = `turn ${n(q.delta_phi_deg)}°, step ${n(q.L_move)}, reach ${n(q.L_sense)}, fade ${n(q.decay_alpha)}`;
  return c ? `${c.name} — ${c.blurb}. ${nums}` : nums;
}

export function buildTune(body: HTMLElement, act: TuneActions): TunePanel {
  body.textContent = "";
  let state: JonesParams = { delta_phi_deg: 45, L_sense: 9, L_move: 1, deposit: 5, decay_alpha: 0.1 };
  let tier: Tier = "T3";
  let offered = stablePoints(tier);
  let enabled = true;
  let current: PadPoint | null = null;

  // ---- the pad ------------------------------------------------------------
  const dots = new Map<string, HTMLButtonElement>();
  const grid = h("div", { class: "ph-pad-grid", role: "group", "aria-label": "Personality: explorer to forager across, fine to bold up" });
  for (let j = PAD_N - 1; j >= 0; j -= 1) {
    for (let i = 0; i < PAD_N; i += 1) {
      const p = { i, j };
      const c = CORNERS.find((k) => k.at.i === i && k.at.j === j);
      const b = h("button", { type: "button", class: `ph-pad-dot${c ? " is-corner" : ""}` }) as HTMLButtonElement;
      b.dataset["pad"] = padKey(p);
      b.addEventListener("click", () => {
        if (!b.disabled) act.pad(p);
      });
      dots.set(padKey(p), b);
      grid.append(b);
    }
  }
  const corner = (id: string, cls: string): HTMLElement => h("span", { class: `ph-pad-corner ${cls}`, "aria-hidden": "true" }, CORNERS.find((c) => c.id === id)!.name);
  const pad = h(
    "div",
    { class: "ph-pad" },
    h("span", { class: "ph-pad-axis is-up", "aria-hidden": "true" }, "Bold ↑"),
    h("span", { class: "ph-pad-axis is-down", "aria-hidden": "true" }, "Fine"),
    h("span", { class: "ph-pad-axis is-left", "aria-hidden": "true" }, "Explorer"),
    h("span", { class: "ph-pad-axis is-right", "aria-hidden": "true" }, "Forager"),
    corner("rivers", "is-tl"),
    corner("cells", "is-tr"),
    corner("veins", "is-bl"),
    corner("lace", "is-br"),
    grid,
  );
  // drag across the pad: snap to the nearest offered point
  let dragging = false;
  const pickAt = (e: PointerEvent): void => {
    const r = grid.getBoundingClientRect();
    const u = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * (PAD_N - 1);
    const v = (1 - Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1)) * (PAD_N - 1);
    let best: PadPoint | null = null;
    let bd = Infinity;
    for (const k of offered) {
      const [i, j] = k.split(",").map(Number) as [number, number];
      const d = (i - u) ** 2 + (j - v) ** 2;
      if (d < bd) {
        bd = d;
        best = { i, j };
      }
    }
    if (best && (!current || current.i !== best.i || current.j !== best.j)) act.pad(best);
  };
  grid.addEventListener("pointerdown", (e) => {
    if (!enabled) return;
    dragging = true;
    grid.setPointerCapture(e.pointerId);
  });
  grid.addEventListener("pointermove", (e) => {
    if (dragging) pickAt(e);
  });
  grid.addEventListener("pointerup", () => {
    dragging = false;
  });
  const readout = h("p", { class: "ph-pad-readout", role: "status" }, "");
  const padNote = h("p", { class: "ph-note" }, "");
  body.append(h("div", { class: "ph-tune-label" }, "Personality"), pad, readout, padNote);

  // ---- the five numbers ---------------------------------------------------
  const sliders = new Map<Key, Slider>();
  let sliding = false;
  const fine = h("details", { class: "ph-fine" }, h("summary", {}, "Fine-tune the five numbers"));
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
        act.params(state, sliding ? "move" : "start");
        sliding = true;
      },
      onCommit: (v) => {
        state = { ...state, [s.key]: v };
        if (!sliding) act.params(state, "start");
        act.params(state, "end");
        sliding = false;
      },
    });
    sliders.set(s.key, sl);
    fine.append(sl.el);
  }
  const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Back to the scene's personality");
  reset.addEventListener("click", () => act.reset());
  fine.append(h("div", { class: "ph-tune-row" }, reset));
  const pal = segmented(
    "Palette",
    (Object.keys(PALETTES) as PaletteId[]).map((id) => ({ value: id, label: PALETTES[id].label })),
    "ember" as PaletteId,
    (v) => act.palette(v),
  );
  body.append(fine, h("div", { class: "ph-tune-row" }, h("span", { class: "ph-tune-label" }, "Palette"), pal.el));

  const paint = (): void => {
    for (const [k, b] of dots) {
      const [i, j] = k.split(",").map(Number) as [number, number];
      const ok = enabled && offered.has(k);
      const on = !!current && current.i === i && current.j === j;
      b.disabled = !ok;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      const name = describe({ i, j });
      b.setAttribute(
        "aria-label",
        `Explorer–forager ${i + 1} of ${PAD_N}, fine–bold ${j + 1} of ${PAD_N}${ok ? "" : enabled ? ` (not offered on this ${tier} device: its networks differed from seed to seed)` : ""}. ${name}`,
      );
      b.title = ok ? name : enabled ? `Not offered at ${tier}: three seeds gave different networks in calibration` : "This scene runs the gated rule";
    }
    pad.classList.toggle("is-off", !enabled);
    readout.textContent = !enabled ? "" : current ? describe(current) : "Custom numbers — pick a point to go back to a tested personality.";
    padNote.textContent = enabled
      ? `${offered.size} of ${PAD_N * PAD_N} personalities are offered on this ${tier} device: the ones whose networks came out the same from three different seeds when calibrated.`
      : "This scene runs the gated rule; personalities live in First Light, Lace and Light Avoidance.";
  };
  paint();

  return {
    sync(p, padPoint, palette, t, padEnabled) {
      state = { ...p };
      for (const s of SPECS) sliders.get(s.key)!.set(p[s.key]);
      pal.set(palette);
      if (t !== tier) {
        tier = t;
        offered = stablePoints(tier);
      }
      enabled = padEnabled;
      current = padPoint;
      paint();
    },
  };
}
