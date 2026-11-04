// The Species Matrix editor (03-boids-2d.md § Scenes: "Who chases whom? Edit
// the matrix."). One cell per pair of species: the row is the fish, the
// column the kind it reacts to. "Steer" edits the cohesion gains — warm cells
// steer towards (chase, gather), cool cells away (flee, avoid); "Swim with"
// edits the alignment gains — match their heading, or swim against it. The
// diagonal is each kind's own schooling. A row under the matrix sets each
// kind's top speed. Edits apply to the running ocean at once; the number of
// kinds and the presets restart it (each fish's kind is drawn at the start).
//
// Each cell is an ARIA slider: drag up or down, scroll, or use the arrow keys
// (Page Up / Down for big steps, 0 for zero). Below, the mixing instrument:
// the share of each kind's neighbours that are its own kind, read from the
// kernel's own neighbour counts, against what a well-mixed ocean would give.

import { h, segmented } from "@bp/studio";
import type { SpeciesParams, SpeciesPreset } from "./model/brains-m3.js";
import { MAX_SPECIES, SPECIES_PRESETS } from "./model/brains-m3.js";
import { SPECIES_NAMES, speciesCss } from "./render/ocean-view.js";

export type MatrixLayer = "steer" | "swim";

/** Gains the editor offers. */
export const GAIN_RANGE: readonly [number, number] = [-2, 2];
export const SPEED_RANGE: readonly [number, number] = [0.5, 2.5];

export interface MatrixActions {
  /** A gain or speed changed (phase as Tune's sliders: start, move, end). */
  edit: (p: SpeciesParams, phase: "start" | "move" | "end") => void;
  /** A new number of kinds, or a preset: the ocean restarts. */
  restart: (preset: SpeciesPreset, count: number) => void;
}

/** The share of each kind's neighbours that are its own kind (from a sample of every fish). */
export function ownKindShare(boids: Float32Array, n: number, count: number): { share: number[]; fraction: number[] } {
  const sum = new Array<number>(MAX_SPECIES).fill(0);
  const num = new Array<number>(MAX_SPECIES).fill(0);
  for (let i = 0; i < n; i += 1) {
    const k = Math.min(MAX_SPECIES - 1, Math.max(0, Math.round(boids[i * 6 + 4]!)));
    num[k] = num[k]! + 1;
    sum[k] = sum[k]! + boids[i * 6 + 5]!;
  }
  return {
    share: sum.slice(0, count).map((s, k) => (num[k]! > 0 ? s / num[k]! : 0)),
    fraction: num.slice(0, count).map((m) => m / Math.max(n, 1)),
  };
}

const clamp = (v: number, [a, b]: readonly [number, number]): number => Math.min(b, Math.max(a, v));
const fmt = (v: number): string => (v > 0.04 ? `+${v.toFixed(1)}` : v < -0.04 ? v.toFixed(1) : "0");

function cellColour(v: number): string {
  const t = Math.min(1, Math.abs(v) / 2);
  return v > 0.04 ? `rgba(255,170,90,${0.12 + 0.62 * t})` : v < -0.04 ? `rgba(110,170,255,${0.12 + 0.62 * t})` : "rgba(255,255,255,0.05)";
}

export class MatrixPanel {
  readonly el: HTMLElement;
  private p: SpeciesParams | null = null;
  private layer: MatrixLayer = "steer";
  private readonly grid: HTMLElement;
  private readonly countSeg: ReturnType<typeof segmented<string>>;
  private readonly layerSeg: ReturnType<typeof segmented<MatrixLayer>>;
  private readonly presetSel: HTMLSelectElement;
  private readonly mixEl: HTMLElement;
  private readonly blurb: HTMLElement;
  private preset: SpeciesPreset | "custom" = "cycle";
  private dragging = false;
  /** The grid on screen (kinds, layer) and each cell's redraw: a value change updates cells in place, so focus stays put. */
  private built: { count: number; layer: MatrixLayer } | null = null;
  private shows: (() => void)[] = [];

  constructor(private readonly act: MatrixActions) {
    this.countSeg = segmented<string>(
      "Kinds of fish",
      [2, 3, 4, 5, 6].map((k) => ({ value: String(k), label: String(k) })),
      "3",
      (v) => this.act.restart(this.preset === "custom" ? "cycle" : this.preset, Number(v)),
    );
    this.countSeg.el.classList.add("sw-matrix-count");
    this.presetSel = h("select", { class: "bp-select sw-matrix-preset", "aria-label": "Start from" }) as HTMLSelectElement;
    for (const pr of SPECIES_PRESETS) this.presetSel.append(h("option", { value: pr.id }, pr.label));
    this.presetSel.append(h("option", { value: "custom", disabled: true }, "Your own matrix"));
    this.presetSel.addEventListener("change", () => {
      const v = this.presetSel.value as SpeciesPreset | "custom";
      if (v !== "custom") this.act.restart(v, this.p?.count ?? 3);
    });
    this.layerSeg = segmented<MatrixLayer>(
      "Which reaction",
      [
        { value: "steer", label: "Steer", title: "Steer towards (+) or away from (−) each kind: cohesion" },
        { value: "swim", label: "Swim with", title: "Match each kind's heading (+) or swim against it (−): alignment" },
      ],
      "steer",
      (v) => {
        this.layer = v;
        this.build();
      },
    );
    this.layerSeg.el.classList.add("sw-matrix-layer");
    this.grid = h("div", { class: "sw-matrix-grid", role: "group", "aria-label": "The matrix: each row's fish reacting to each column's kind" });
    this.blurb = h("p", { class: "sw-matrix-blurb" }, "");
    this.mixEl = h("p", { class: "sw-matrix-mix bp-mono", role: "status" }, "");
    this.el = h(
      "section",
      { class: "sw-matrix bp-surface", "aria-label": "The species matrix", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
      h("div", { class: "sw-matrix-head" }, h("span", { class: "sw-regime-key" }, "Who steers towards whom"), this.layerSeg.el),
      this.grid,
      h("div", { class: "sw-matrix-row" }, h("span", { class: "sw-regime-key" }, "Kinds"), this.countSeg.el, this.presetSel),
      this.blurb,
      this.mixEl,
    );
  }

  /** Show these species (the running brain); `preset` names where they came from. */
  set(p: SpeciesParams, preset: SpeciesPreset | "custom"): void {
    this.p = structuredClone(p);
    this.preset = preset;
    this.countSeg.set(String(p.count));
    this.presetSel.value = preset;
    this.blurb.textContent = preset === "custom" ? "Your own matrix. Warm: steer towards; cool: steer away." : (SPECIES_PRESETS.find((x) => x.id === preset)?.blurb ?? "");
    // the same grid: redraw the values where they are (never replace the cell being edited)
    if (this.built && this.built.count === p.count && this.built.layer === this.layer) for (const show of this.shows) show();
    else if (!this.dragging) this.build();
  }

  get current(): SpeciesParams | null {
    return this.p;
  }

  get presetId(): SpeciesPreset | "custom" {
    return this.preset;
  }

  setMix(share: number[], fraction: number[]): void {
    this.mixEl.textContent = "";
    this.mixEl.append(h("span", { class: "sw-regime-key" }, "Own kind among its neighbours (well mixed would be its share)"), h("br", {}));
    share.forEach((s, k) => {
      this.mixEl.append(
        h("span", { class: "sw-matrix-mixitem" }, h("span", { class: "sw-swatch", style: `background:${speciesCss(k)}` }), `${Math.round(s * 100)}% `, h("span", { class: "sw-matrix-dim" }, `(${Math.round(fraction[k]! * 100)}%)`)),
      );
    });
  }

  clearMix(): void {
    this.mixEl.textContent = "";
  }

  private build(): void {
    const p = this.p;
    this.grid.textContent = "";
    this.shows = [];
    this.built = null;
    if (!p) return;
    this.built = { count: p.count, layer: this.layer };
    const n = p.count;
    this.grid.style.gridTemplateColumns = `auto repeat(${n}, minmax(0, 1fr))`;
    const swatch = (k: number): HTMLElement => h("span", { class: "sw-swatch", style: `background:${speciesCss(k)}`, title: SPECIES_NAMES[k] });
    this.grid.append(h("span", { class: "sw-matrix-corner bp-mono", "aria-hidden": "true" }, "fish → kind"));
    for (let j = 0; j < n; j += 1) this.grid.append(h("span", { class: "sw-matrix-colhead", "aria-hidden": "true" }, swatch(j)));
    const arr = this.layer === "steer" ? "gc" : "ga";
    for (let i = 0; i < n; i += 1) {
      this.grid.append(h("span", { class: "sw-matrix-rowhead", "aria-hidden": "true" }, swatch(i)));
      for (let j = 0; j < n; j += 1) {
        const k = i * 6 + j;
        const what = this.layer === "steer" ? "steers towards" : "swims with";
        const label = i === j ? `${SPECIES_NAMES[i]} ${what} its own kind` : `${SPECIES_NAMES[i]} ${what} ${SPECIES_NAMES[j]}`;
        this.grid.append(
          this.cell(
            label,
            () => this.p![arr][k]!,
            (v) => {
              this.p![arr][k] = v;
            },
            GAIN_RANGE,
            i === j,
          ),
        );
      }
    }
    // the speed row
    this.grid.append(h("span", { class: "sw-matrix-rowhead sw-matrix-speedhead" }, "speed"));
    for (let j = 0; j < n; j += 1) {
      this.grid.append(
        this.cell(
          `${SPECIES_NAMES[j]} top speed (× the school's)`,
          () => this.p!.spd[j]!,
          (v) => {
            this.p!.spd[j] = v;
          },
          SPEED_RANGE,
          false,
          true,
        ),
      );
    }
  }

  private cell(label: string, get: () => number, put: (v: number) => void, range: readonly [number, number], diagonal: boolean, speed = false): HTMLElement {
    const el = h("div", {
      class: `sw-matrix-cell${diagonal ? " is-diagonal" : ""}${speed ? " is-speed" : ""}`,
      role: "slider",
      tabindex: "0",
      "aria-label": label,
      "aria-valuemin": String(range[0]),
      "aria-valuemax": String(range[1]),
    });
    const show = (): void => {
      const v = get();
      el.textContent = speed ? `${v.toFixed(1)}×` : fmt(v);
      el.setAttribute("aria-valuenow", v.toFixed(2));
      el.setAttribute("aria-valuetext", speed ? `${v.toFixed(1)} times` : v > 0.04 ? `towards, ${v.toFixed(1)}` : v < -0.04 ? `away, ${Math.abs(v).toFixed(1)}` : "ignores");
      el.style.background = speed ? "rgba(255,255,255,0.06)" : cellColour(v);
    };
    this.shows.push(show);
    const commit = (v: number, phase: "start" | "move" | "end"): void => {
      put(Math.round(clamp(v, range) * 10) / 10);
      show();
      this.markCustom();
      this.act.edit(structuredClone(this.p!), phase);
    };
    show();
    el.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.1 : e.key === "PageUp" ? 0.5 : e.key === "PageDown" ? -0.5 : 0;
      if (e.key === "0" || e.key === "Delete") {
        e.preventDefault();
        commit(speed ? 1 : 0, "start");
        commit(speed ? 1 : 0, "end");
        return;
      }
      if (step === 0) return;
      e.preventDefault();
      commit(get() + step, "start");
      commit(get(), "end");
    });
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      commit(get() + (e.deltaY < 0 ? 0.1 : -0.1), "start");
      commit(get(), "end");
    }, { passive: false });
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.focus();
      el.setPointerCapture(e.pointerId);
      const y0 = e.clientY;
      const v0 = get();
      this.dragging = true;
      let started = false;
      const move = (m: PointerEvent): void => {
        const v = v0 + (y0 - m.clientY) * 0.02;
        commit(v, started ? "move" : "start");
        started = true;
      };
      const up = (): void => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        this.dragging = false;
        if (started) commit(get(), "end");
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });
    return el;
  }

  private markCustom(): void {
    if (this.preset === "custom") return;
    this.preset = "custom";
    this.presetSel.value = "custom";
    this.blurb.textContent = "Your own matrix. Warm: steer towards; cool: steer away.";
  }
}
