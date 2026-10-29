// Teach (rebuild-v2 04-neural-ca.md, M2; Signature moment 2): draw a target,
// train a network on this GPU to grow it from one cell, watch it learn, then
// let it live in the dish — and keep it in this browser's library.
//
// Three phases of one scene:
//   draw  — the dish shows the drawing (still); Paint / Erase on the 40 × 40 box;
//   train — the dishes show the training batch (still), refreshed after every
//           iteration; a loss curve, grown-from-one-cell checks, the speed and
//           the page's frame rate, measured; training runs as a sliced job;
//   live  — the taught weights, converted to the committed layout, grow in the
//           dish through the gated kernel; the trained-model card.
// T1 (software or very weak GPUs) does not train (spec § Performance
// targets): it can still grow saved models and the Menagerie's.

import type { GpuContext, Tier } from "@bp/gpu";
import type { Studio, ToolSpec } from "@bp/studio";
import { h, segmented, slider } from "@bp/studio";
import { sha256hex } from "@bp/verify";
import type { App, TeachHost } from "../app.js";
import { TOOLS } from "../app.js";
import type { LiveKernels } from "../model/live.js";
import type { MenagerieManifest, Organism, OrganismDef, OrganismLibrary } from "../model/organisms.js";
import type { Checkpoint } from "../proof/gate.js";
import { CN, assetUrl, seedState } from "../proof/gate.js";
import type { FrameScheduler } from "../runtime/scheduler.js";
import type { EvalResult, TrainConfig } from "./job.js";
import { TEACH_JOB, TrainJob } from "./job.js";
import { COMMITTED, fromTrainer, toTrainer } from "./layout.js";
import type { ModelCard, SavedModel } from "./library.js";
import { ModelLibrary, WEIGHTS_BYTES, newModelId } from "./library.js";
import { RECOGNISABLE_IOU } from "./metrics.js";
import { RegrowJob } from "./regrow.js";
import { GRID, PAD, SIZE, SWATCHES, TargetPad, checkTarget } from "./target.js";
import type { TrainKernels } from "./trainer.js";
import { NcaTrainer } from "./trainer.js";

export type Phase = "draw" | "train" | "live";

interface Recipe {
  B: number;
  pool: number;
  Tmin: number;
  Tmax: number;
  damage: number;
  damageFrom: number;
  lr: number;
  decayAt: number;
  /** GPU ms of training per frame: smooth (keeps ~60 fps) and fast (accepts ~30 fps). */
  smooth: number;
  fast: number;
  /** Iterations to a recognisable gecko at this shape, measured (the ETA's basis). */
  gecko: [number, number];
  /** Run seed: weights init, rollout lengths, fire masks and pool draws. */
  seed: number;
  /** What those iterations took, measured, for the note. */
  geckoTime: string;
}

// T3: the spike's measured shape (batch 8, rollouts 64–96), pool 256 (as good
// as 1,024 in its run, 243 MiB less), the Menagerie's damage recipe so the
// result heals. T2: the spec's batch 4 / 64 steps. Measured 2026-10-29 on the
// RX 6800 XT (headless Chromium, the Menagerie's gecko target, damage from the
// first iteration, two frames in flight): T3 recognisable after 1,250–1,350
// iterations (run seeds 1–3) = 36–38 s at the smooth pace (34–37 it/s, page
// 60 fps), 26 s at the faster pace (53 it/s, 33 fps); T2 (forced with
// ?tier=T2) after 1,150 and 1,450 iterations (seeds 1–2) = 42 and 59 s at
// 60 fps. Starting damage at iteration 600 instead was slower (1,600). No
// integrated GPU was available: T2's speed on one is the visitor's own
// measurement.
const RECIPES: Record<"T3" | "T2", Recipe> = {
  T3: { B: 8, pool: 256, Tmin: 64, Tmax: 96, damage: 3, damageFrom: 0, lr: 2e-3, decayAt: 2000, smooth: 12, fast: 30, gecko: [1250, 1350], seed: 1, geckoTime: "36–38 s on an RX 6800 XT at 60 fps, 26 s at the faster pace" },
  T2: { B: 4, pool: 256, Tmin: 64, Tmax: 64, damage: 1, damageFrom: 0, lr: 2e-3, decayAt: 2000, smooth: 10, fast: 30, gecko: [1150, 1450], seed: 1, geckoTime: "42–59 s on an RX 6800 XT at 60 fps; an integrated GPU will be slower" },
};
const EVAL_EVERY = 50;
const EVAL_STEPS = [96, 300];
/** Past this estimated time to a recognisable organism, Teach suggests the Menagerie instead (spec: ≤ 8 min T2 target). */
const ETA_LIMIT_S = 8 * 60;

export interface TeachDeps {
  app: App;
  studio: Studio;
  gpu: GpuContext;
  tier: Tier;
  lib: OrganismLibrary;
  gated: Checkpoint;
  manifest: MenagerieManifest;
  scheduler: FrameScheduler;
  liveKernels: LiveKernels;
  trainKernels: () => Promise<TrainKernels>;
  /** Download a blob. */
  download: (b: Blob, name: string) => void;
}

interface Run {
  trainer: NcaTrainer;
  job: TrainJob;
  recipe: Recipe;
  target: Float32Array<ArrayBuffer>;
  losses: [number, number][];
  evals: EvalResult[];
  recognisable: { iter: number; seconds: number; wall: number } | null;
  /** ms spent training (scheduled), and when the current stretch began. */
  trainMs: number;
  since: number | null;
  pressedAt: number;
  running: boolean;
  done: Promise<void> | null;
  /** Iterations confirmed by a loss readback, with their arrival times (the speed readout). */
  arrivals: [number, number][];
}

const fmtS = (s: number): string => (s < 90 ? `${s.toFixed(s < 10 ? 1 : 0)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);

export class Teach implements TeachHost {
  readonly pad = new TargetPad();
  readonly library = new ModelLibrary();
  phase: Phase = "draw";
  pace: "smooth" | "fast" = "smooth";
  color = SWATCHES[0]!.rgb;
  brush = 2.5;
  run: Run | null = null;
  /** The organism in the dish in the live phase, and its card. */
  taught: { org: Organism; card: ModelCard | null; target: Float32Array; savedId: string | null } | null = null;
  regrow: { mean: number; after: Record<string, number> } | null = null;
  readonly el: HTMLElement;
  private readonly d: TeachDeps;
  private readonly baseBudget: number;
  private last: [number, number] | null = null;
  private frames: number[] = [];
  private lastFrame = 0;
  private drawDirty = false;
  private uiDue = 0;
  private plotDirty = false;
  private readonly box: HTMLElement;
  private readonly ghost: HTMLCanvasElement;
  // panel parts
  private readonly badge: HTMLElement;
  private readonly sections: Record<Phase, HTMLElement>;
  private readonly warn: HTMLElement;
  private readonly teachBtn: HTMLButtonElement;
  private readonly tierNote: HTMLElement;
  private readonly rows: Record<string, HTMLElement> = {};
  private readonly plot: HTMLCanvasElement;
  private readonly fitLine: HTMLElement;
  private readonly recogLine: HTMLElement;
  private readonly etaLine: HTMLElement;
  private readonly thumb: HTMLCanvasElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly cardEl: HTMLElement;
  private readonly nameIn: HTMLInputElement;
  private readonly saveBtn: HTMLButtonElement;
  private readonly libList: HTMLElement;
  private readonly libNote: HTMLElement;
  private readonly status: HTMLElement;

  constructor(d: TeachDeps) {
    this.d = d;
    this.baseBudget = d.scheduler.budgetMs;
    this.box = h("div", { class: "gr-teach-box", "aria-hidden": "true" });
    this.ghost = h("canvas", { class: "gr-teach-ghost", width: String(GRID * 4), height: String(GRID * 4), "aria-hidden": "true" });
    this.box.hidden = true;
    this.ghost.hidden = true;
    d.studio.stage.append(this.ghost, this.box);

    // ------------------------------------------------------------- panel --
    this.badge = h("span", { class: "gr-badge" }, "drawing");
    this.status = h("p", { class: "gr-teach-status", role: "status" }, "");
    // draw
    this.warn = h("p", { class: "gr-teach-warn", role: "status" }, "");
    this.teachBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Teach");
    this.teachBtn.addEventListener("click", () => void this.startTraining());
    this.tierNote = h("p", { class: "gr-note" }, "");
    const preset = h("select", { class: "bp-select", "aria-label": "Start from a drawing" });
    preset.append(h("option", { value: "" }, "Start from…"));
    for (const o of d.manifest.organisms) if (!o.gated) preset.append(h("option", { value: o.id }, o.name));
    preset.addEventListener("change", () => {
      if (preset.value) void this.loadPreset(preset.value);
      preset.value = "";
    });
    const file = h("input", { type: "file", accept: "image/*", class: "gr-visually-hidden", id: "gr-teach-image", tabindex: "-1", "aria-label": "An image to start the drawing from" });
    file.addEventListener("change", () => {
      const f = file.files?.[0];
      if (f) void this.loadImage(f);
      file.value = "";
    });
    const imgBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Image…");
    imgBtn.addEventListener("click", () => file.click());
    const clearBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Clear");
    clearBtn.addEventListener("click", () => {
      this.pad.clear();
      this.redrawTarget();
    });
    const drawSec = h(
      "div",
      { class: "gr-teach-sec" },
      h("p", {}, `Paint a creature inside the square on the dish — ${SIZE} × ${SIZE} cells. Press Teach and this GPU trains a network to grow it from a single cell.`),
      h("div", { class: "gr-tool-row" }, preset, imgBtn, clearBtn, file),
      this.warn,
      h("div", { class: "gr-tool-row" }, this.teachBtn),
      this.tierNote,
    );
    // train
    const dl = h("dl", { class: "gr-teach-dl" });
    for (const [k, label] of [
      ["iter", "Iterations"],
      ["time", "Training time"],
      ["speed", "Speed"],
      ["fps", "Page"],
      ["mem", "GPU memory"],
    ] as const) {
      this.rows[k] = h("dd", {}, "—");
      dl.append(h("dt", {}, label), this.rows[k]!);
    }
    this.plot = h("canvas", { width: "560", height: "200", class: "gr-teach-plot", role: "img", "aria-label": "Training loss over iterations, log scale" });
    this.fitLine = h("p", { class: "gr-teach-fit" }, "");
    this.recogLine = h("p", { class: "gr-teach-fit" }, "");
    this.etaLine = h("p", { class: "gr-note" }, "");
    this.thumb = h("canvas", { width: String(GRID), height: String(GRID), class: "gr-teach-thumb", role: "img", "aria-label": "The latest check: grown from one cell for 300 steps with the current network" });
    this.pauseBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Pause");
    this.pauseBtn.addEventListener("click", () => (this.run?.running ? this.pauseTraining() : this.resumeTraining()));
    const growBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Grow it in the dish");
    growBtn.addEventListener("click", () => void this.finish());
    const paceSeg = segmented(
      "Training pace",
      [
        { value: "smooth", label: "Smooth", title: "Train in what a 60 fps frame leaves free" },
        { value: "fast", label: "Faster", title: "Give training more of each frame: faster, at a lower frame rate" },
      ],
      this.pace,
      (v) => {
        this.pace = v;
        if (this.run?.running) d.scheduler.budgetMs = this.budget();
      },
    );
    const trainSec = h(
      "div",
      { class: "gr-teach-sec" },
      h("p", { class: "gr-teach-lead" }, "The dishes are the training batch: eight states from the pool, after this iteration's rollout. The network learns from all of them at once."),
      dl,
      this.plot,
      h("div", { class: "gr-teach-check" }, this.thumb, h("div", {}, this.fitLine, this.recogLine)),
      this.etaLine,
      h("div", { class: "gr-tool-row" }, this.pauseBtn, growBtn),
      paceSeg.el,
    );
    // live
    this.cardEl = h("dl", { class: "gr-teach-dl" });
    this.nameIn = h("input", { type: "text", class: "bp-input", maxlength: "40", "aria-label": "Name for this model", placeholder: "Name it" });
    this.saveBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Save in this browser");
    this.saveBtn.addEventListener("click", () => void this.save());
    const dlBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Download");
    dlBtn.addEventListener("click", () => this.downloadTaught());
    const moreBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Keep training");
    moreBtn.addEventListener("click", () => void this.keepTraining());
    const newBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Draw another");
    newBtn.addEventListener("click", () => void this.backToDraw());
    const liveSec = h(
      "div",
      { class: "gr-teach-sec" },
      this.cardEl,
      h("div", { class: "gr-tool-row" }, this.nameIn, this.saveBtn),
      h("div", { class: "gr-tool-row" }, dlBtn, moreBtn, newBtn),
    );
    this.sections = { draw: drawSec, train: trainSec, live: liveSec };
    // library
    this.libList = h("ul", { class: "gr-teach-lib" });
    this.libNote = h(
      "p",
      { class: "gr-note" },
      "Saved models live only in this browser, on this device: nothing is uploaded, another browser starts empty, and clearing this site's data deletes them. Download one to keep it.",
    );
    const importIn = h("input", { type: "file", accept: ".bin,application/octet-stream", class: "gr-visually-hidden", tabindex: "-1", "aria-label": "A Grow model file to import" });
    importIn.addEventListener("change", () => {
      const f = importIn.files?.[0];
      if (f) void this.importFile(f);
      importIn.value = "";
    });
    const importBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Import a model…");
    importBtn.addEventListener("click", () => importIn.click());
    // the panel folds to its header (phones start folded, so the drawing box stays clear)
    const body = h(
      "details",
      { class: "gr-teach-fold" },
      h("summary", {}, h("h2", {}, "Teach"), this.badge),
      this.status,
      drawSec,
      trainSec,
      liveSec,
      h("details", { class: "gr-teach-libbox" }, h("summary", {}, "Saved in this browser"), this.libNote, this.libList, h("div", { class: "gr-tool-row" }, importBtn, importIn)),
    );
    body.open = !matchMedia("(max-width: 639px)").matches;
    body.addEventListener("toggle", () => d.app.relayout());
    this.el = h("section", { class: "gr-teach-panel bp-surface", "aria-label": "Teach", "data-bp-chrome": "", "data-bp2": "studio-chrome" }, body);
    this.el.hidden = true;
    d.studio.stage.append(this.el);
    d.app.sidePanel = this.el;
    d.app.teach = this;
    this.syncPhase();
    void this.refreshLibrary();
  }

  get canTrain(): boolean {
    return this.d.tier !== "T1";
  }

  /** Test hook (acceptance runs): replace parts of the recipe. */
  overrides: Partial<Recipe> | null = null;
  /** Test hook: stop training after this many iterations (null: train until told to stop). */
  stopAfter: number | null = null;

  private recipe(): Recipe {
    return { ...RECIPES[this.d.tier === "T2" ? "T2" : "T3"], ...this.overrides };
  }

  private budget(): number {
    const r = this.run?.recipe ?? this.recipe();
    return this.pace === "fast" ? r.fast : r.smooth;
  }

  // ------------------------------------------------------ TeachHost --

  plan(): ReturnType<TeachHost["plan"]> {
    const gatedOrg: Organism = { def: this.d.lib.def(this.d.lib.gatedId)!, ck: this.d.gated };
    if (this.phase === "train" && this.run) {
      const n = this.run.recipe.B;
      return {
        orgs: Array.from({ length: n }, () => gatedOrg),
        start: new Float32Array(GRID * GRID * CN),
        still: true,
        prompt: "Training on this GPU. Each dish is one sample of the batch the network is learning from.",
        tools: ["pan"],
        tool: "pan",
      };
    }
    if (this.phase === "live" && this.taught) {
      const name = this.taught.org.def.name;
      return {
        orgs: [this.taught.org],
        start: seedState(GRID),
        still: false,
        prompt: `${name} grows from one cell under the rule this GPU learned. Cut it and see what grows back.`,
        tools: [...TOOLS],
        tool: "cut",
      };
    }
    return {
      orgs: [gatedOrg],
      start: this.pad.cells(),
      still: true,
      prompt: "Draw something simple. Watch it learn to grow.",
      tools: ["pan", "paint", "erase"],
      tool: "paint",
    };
  }

  toolSpec(id: string): ToolSpec | null {
    if (id === "paint") {
      return {
        id,
        label: "Paint",
        icon: "brush",
        hint: "Paint inside the square — thick, connected shapes learn best",
        paints: true,
        options: () => {
          const box = h("div", { class: "gr-tool-opts" });
          const sw = h("div", { class: "gr-swatches", role: "radiogroup", "aria-label": "Colour" });
          for (const s of SWATCHES) {
            const b = h("button", {
              type: "button",
              role: "radio",
              class: "gr-swatch",
              title: s.name,
              "aria-label": s.name,
              "aria-checked": String(s.rgb === this.color),
              style: `--sw: rgb(${s.rgb.map((v) => Math.round(v * 255)).join(",")})`,
            });
            b.addEventListener("click", () => {
              this.color = s.rgb;
              for (const x of sw.children) x.setAttribute("aria-checked", String(x === b));
            });
            sw.append(b);
          }
          box.append(sw, this.brushSlider());
          return box;
        },
      };
    }
    if (id === "erase") {
      return { id, label: "Erase", icon: "erase", hint: "Rub out part of the drawing", paints: true, options: () => this.brushSlider() };
    }
    return null;
  }

  private brushSlider(): HTMLElement {
    return slider({
      label: "Brush width",
      min: 1.5,
      max: 8,
      step: 0.5,
      value: this.brush,
      unit: " cells",
      onInput: (v) => {
        this.brush = v;
      },
    }).el;
  }

  brushRadius(): number {
    return this.brush;
  }

  paint(phase: "down" | "move" | "up", gx: number, gy: number): void {
    if (this.phase !== "draw") return;
    if (phase === "up") {
      this.last = null;
      return;
    }
    const erase = this.d.studio.rail.active === "erase";
    const from = phase === "down" || !this.last ? [gx, gy] : this.last;
    this.pad.stroke(from[0]!, from[1]!, gx, gy, this.brush, erase ? null : this.color);
    this.last = [gx, gy];
    this.drawDirty = true;
  }

  // -------------------------------------------------------- the frame --

  /** Every page frame (main's onFrame). */
  onFrame(now: number): void {
    if (this.lastFrame > 0) {
      this.frames.push(now - this.lastFrame);
      if (this.frames.length > 120) this.frames.shift();
    }
    this.lastFrame = now;
    const inScene = this.d.app.scene.kind === "teach";
    if (inScene && this.drawDirty && this.phase === "draw" && this.d.app.dishes.length === 1) {
      this.drawDirty = false;
      this.d.app.sim.load(this.pad.cells());
      this.d.app.touchDishes();
      this.updateWarnings();
    }
    this.placeOverlays(inScene);
    if (inScene) this.placeSheet();
    if (now > this.uiDue && inScene) {
      this.uiDue = now + 250;
      this.updateTrainUi();
      if (this.plotDirty) this.drawPlot();
    }
  }

  get fps(): number {
    if (this.frames.length < 10) return 0;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    return 1000 / avg;
  }

  private sheetBottom = "";

  /** Phones: the panel is a sheet just above the tool options strip (or the rail), whatever its height. */
  private placeSheet(): void {
    if (!this.phone.matches) {
      if (this.sheetBottom) this.el.style.bottom = this.sheetBottom = "";
      return;
    }
    const stage = this.d.studio.stage.getBoundingClientRect();
    let top = stage.bottom;
    for (const el of [this.d.studio.rail.optionsEl, this.d.studio.rail.el]) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) top = Math.min(top, r.top);
    }
    const b = `${Math.round(stage.bottom - top + 8)}px`;
    if (b !== this.sheetBottom) {
      this.el.style.bottom = this.sheetBottom = b;
      this.d.app.relayout();
    }
  }

  private readonly phone = matchMedia("(max-width: 639px)");

  private placeOverlays(inScene: boolean): void {
    const app = this.d.app;
    const one = inScene && app.dishes.length === 1;
    const showBox = one && this.phase === "draw";
    const showGhost = one && this.phase === "live" && !!this.taught && this.taught.target.some((v) => v > 0);
    this.box.hidden = !showBox;
    this.ghost.hidden = !showGhost;
    if (showBox) {
      const [x0, y0] = app.toScreen(0, PAD, PAD);
      const [x1, y1] = app.toScreen(0, PAD + SIZE, PAD + SIZE);
      Object.assign(this.box.style, { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    }
    if (showGhost) {
      const [x0, y0] = app.toScreen(0, 0, 0);
      const [x1, y1] = app.toScreen(0, GRID, GRID);
      Object.assign(this.ghost.style, { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    }
  }

  // --------------------------------------------------------- the draw --

  private redrawTarget(): void {
    this.drawDirty = true;
  }

  private updateWarnings(): void {
    const c = checkTarget(this.pad.rgba());
    this.warn.textContent = c.warnings.join(" ");
    this.teachBtn.disabled = c.cells === 0 || !this.canTrain;
  }

  /** A Menagerie organism's target as the drawing (premultiplied RGBA PNG, 64 × 64). */
  async loadPreset(id: string): Promise<void> {
    const def = this.d.lib.def(id);
    if (!def) return;
    const r = await fetch(assetUrl(def.target));
    if (!r.ok) throw new Error(`${def.name} target fetch failed: ${r.status}`);
    const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext("2d")!;
    g.drawImage(bmp, 0, 0);
    this.pad.setImage(g.getImageData(0, 0, bmp.width, bmp.height).data, bmp.width, bmp.height, true, true);
    this.presetName = def.name;
    this.redrawTarget();
  }

  private presetName: string | null = null;

  /** Any image, scaled to fill the 40 × 40 box (its transparency kept). */
  async loadImage(f: Blob): Promise<void> {
    try {
      const bmp = await createImageBitmap(f);
      const c = new OffscreenCanvas(SIZE * 4, SIZE * 4);
      const g = c.getContext("2d")!;
      const s = Math.min((SIZE * 4) / bmp.width, (SIZE * 4) / bmp.height);
      const w = bmp.width * s;
      const hh = bmp.height * s;
      g.imageSmoothingQuality = "high";
      g.drawImage(bmp, (SIZE * 4 - w) / 2, (SIZE * 4 - hh) / 2, w, hh);
      this.pad.setImage(g.getImageData(0, 0, SIZE * 4, SIZE * 4).data, SIZE * 4, SIZE * 4, false);
      this.presetName = null;
      this.redrawTarget();
    } catch (e) {
      this.d.studio.toast.show(`That image could not be read: ${(e as Error).message}`);
    }
  }

  /** Test hook: set the drawing from a GRID × GRID premultiplied RGBA target. */
  setTargetRgba(rgba: Float32Array): void {
    const bytes = new Uint8ClampedArray(GRID * GRID * 4);
    for (let i = 0; i < GRID * GRID; i += 1) {
      const a = rgba[i * 4 + 3]!;
      for (let k = 0; k < 3; k += 1) bytes[i * 4 + k] = a > 0 ? Math.round((rgba[i * 4 + k]! / a) * 255) : 0;
      bytes[i * 4 + 3] = Math.round(a * 255);
    }
    this.pad.setImage(bytes, GRID, GRID, true);
    this.redrawTarget();
  }

  // -------------------------------------------------------- training --

  private say(msg: string): void {
    this.status.textContent = msg;
  }

  async startTraining(): Promise<void> {
    if (!this.canTrain || this.run) return;
    const target = this.pad.rgba();
    if (checkTarget(target).cells === 0) return;
    const recipe = this.recipe();
    const pressedAt = performance.now();
    this.teachBtn.disabled = true;
    this.say("Compiling the trainer…");
    const { device } = this.d.gpu;
    let trainer: NcaTrainer;
    try {
      const kernels = await this.d.trainKernels();
      device.pushErrorScope("out-of-memory");
      device.pushErrorScope("validation");
      trainer = new NcaTrainer(device, kernels, { G: GRID, B: recipe.B, Tmax: recipe.Tmax, poolSize: recipe.pool, evalTmax: Math.max(...EVAL_STEPS) });
      trainer.setParams(NcaTrainer.initParams(recipe.seed));
      trainer.setTarget(target);
      trainer.resetPool();
      const val = await device.popErrorScope();
      const oom = await device.popErrorScope();
      if (oom || val) {
        trainer.destroy();
        throw new Error(oom ? `out of GPU memory (${oom.message})` : (val?.message ?? "validation error"));
      }
    } catch (e) {
      this.say(`Teach could not start: ${(e as Error).message}`);
      this.teachBtn.disabled = false;
      return;
    }
    const cfg: TrainConfig = {
      Tmin: recipe.Tmin,
      Tmax: recipe.Tmax,
      lr: recipe.lr,
      decayAt: recipe.decayAt,
      damage: recipe.damage,
      damageFrom: recipe.damageFrom,
      runSeed: recipe.seed,
      evalEvery: EVAL_EVERY,
      evalSteps: EVAL_STEPS,
      evalB: 2,
    };
    const job = new TrainJob(trainer, cfg, target);
    const run: Run = { trainer, job, recipe, target, losses: [], evals: [], recognisable: null, trainMs: 0, since: null, pressedAt, running: false, done: null, arrivals: [] };
    this.run = run;
    job.displayTargets = () => (this.phase === "train" && this.d.app.scene.kind === "teach" && this.d.app.still && this.d.app.dishes.length === recipe.B ? this.d.app.dishes.map((x) => x.sim.state) : null);
    job.events = {
      onLoss: (iter, loss) => {
        run.losses.push([iter, loss]);
        run.arrivals.push([iter, performance.now()]);
        if (run.arrivals.length > 64) run.arrivals.shift();
        this.plotDirty = true;
      },
      onEval: (e) => this.onEval(run, e),
      onDisplay: () => {
        if (this.d.app.scene.kind === "teach" && this.phase === "train") this.d.app.touchDishes();
      },
    };
    this.phase = "train";
    this.syncPhase();
    this.rows["mem"]!.textContent = `${(trainer.totalBytes / 2 ** 20).toFixed(0)} MiB`;
    await this.d.app.loadScene("teach");
    this.resumeTraining();
  }

  resumeTraining(): void {
    const r = this.run;
    if (!r || r.running) return;
    r.running = true;
    r.since = performance.now();
    r.job.runUntil(this.stopAfter);
    this.d.scheduler.budgetMs = this.budget();
    // two frames in flight keep the GPU busy (and its clocks up) between frames
    this.d.app.maxInFlight = 2;
    if (this.d.app.governor) this.d.app.governor.suspended = true;
    r.done = this.d.scheduler.add(r.job).catch(() => {});
    this.pauseBtn.textContent = "Pause";
    this.say("Training on this GPU.");
  }

  /** Stop at the next iteration boundary; resolves once the job has stopped. */
  async pauseTraining(): Promise<void> {
    const r = this.run;
    if (!r || !r.running) return;
    r.job.pause();
    await r.done;
    if (r.since !== null) r.trainMs += performance.now() - r.since;
    r.since = null;
    r.running = false;
    this.d.scheduler.budgetMs = this.baseBudget;
    this.d.app.maxInFlight = 1;
    if (this.d.app.governor) this.d.app.governor.suspended = false;
    this.pauseBtn.textContent = "Resume";
    this.say("Paused.");
  }

  private trainSeconds(r: Run): number {
    return (r.trainMs + (r.since !== null ? performance.now() - r.since : 0)) / 1000;
  }

  private onEval(r: Run, e: EvalResult): void {
    r.evals.push(e);
    const f96 = e.fits[96]!;
    const f300 = e.fits[300]!;
    this.fitLine.textContent = `Grown from one cell with the current network: overlap with your drawing ${f96.iou.toFixed(2)} at 96 steps, ${f300.iou.toFixed(2)} at 300 (iteration ${e.iter.toLocaleString()}).`;
    if (!r.recognisable && f96.iou >= RECOGNISABLE_IOU && f300.iou >= RECOGNISABLE_IOU) {
      r.recognisable = { iter: e.iter, seconds: this.trainSeconds(r), wall: (performance.now() - r.pressedAt) / 1000 };
      this.d.studio.toast.show(`Recognisable after ${e.iter.toLocaleString()} iterations — press Grow it, or let it sharpen`, 5000);
    }
    this.recogLine.textContent = r.recognisable
      ? `Recognisable (overlap ≥ ${RECOGNISABLE_IOU} at both) after ${r.recognisable.iter.toLocaleString()} iterations, ${fmtS(r.recognisable.seconds)} of training.`
      : `Recognisable when the overlap reaches ${RECOGNISABLE_IOU} at both — checked every ${EVAL_EVERY} iterations.`;
    const g = this.thumb.getContext("2d");
    if (g) {
      const img = g.createImageData(GRID, GRID);
      const bg = [10, 18, 20];
      for (let i = 0; i < GRID * GRID; i += 1) {
        const a = e.rgba[i * 4 + 3]!;
        for (let k = 0; k < 3; k += 1) img.data[i * 4 + k] = Math.round(Math.min(1, e.rgba[i * 4 + k]! + (1 - a) * (bg[k]! / 255)) * 255);
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
  }

  /** Iterations per second over the last few seconds of readbacks. */
  private itPerS(r: Run): number {
    const a = r.arrivals;
    if (a.length < 4 || !r.running) return 0;
    const [i0, t0] = a[0]!;
    const [i1, t1] = a[a.length - 1]!;
    return t1 > t0 ? ((i1 - i0) * 1000) / (t1 - t0) : 0;
  }

  private updateTrainUi(): void {
    const r = this.run;
    if (!r || this.phase !== "train") return;
    const ips = this.itPerS(r);
    this.rows["iter"]!.textContent = r.job.iter.toLocaleString();
    this.rows["time"]!.textContent = fmtS(this.trainSeconds(r));
    this.rows["speed"]!.textContent = r.running ? `${ips.toFixed(1)} iterations / s` : "paused";
    this.rows["fps"]!.textContent = `${Math.round(this.fps)} fps while training (${this.pace === "fast" ? "faster" : "smooth"} pace: ${this.budget()} ms of GPU per frame)`;
    if (r.running && r.job.iter >= 20 && ips > 0 && !r.recognisable) {
      const [lo, hi] = r.recipe.gecko;
      const etaLo = Math.max(0, (lo - r.job.iter) / ips);
      const etaHi = Math.max(0, (hi - r.job.iter) / ips);
      this.etaLine.textContent =
        `At this speed a drawing like the Menagerie's gecko becomes recognisable in about ${fmtS(etaLo)}–${fmtS(etaHi)} more (it took ${lo.toLocaleString()}–${hi.toLocaleString()} iterations in our test runs). Simpler shapes are faster.` +
        (etaHi > ETA_LIMIT_S ? " That is a long wait on this GPU: the Menagerie's organisms are ready to grow now." : "");
    } else if (!r.recognisable) {
      this.etaLine.textContent = "";
    } else {
      this.etaLine.textContent = "It keeps sharpening the longer it trains: eyes, spots and edges come later.";
    }
  }

  private drawPlot(): void {
    this.plotDirty = false;
    const r = this.run;
    const g = this.plot.getContext("2d");
    if (!r || !g) return;
    const W = this.plot.width;
    const H = this.plot.height;
    g.clearRect(0, 0, W, H);
    const pts = r.losses;
    if (pts.length < 2) return;
    const n = pts[pts.length - 1]![0] + 1;
    let lo = Infinity;
    let hi = -Infinity;
    for (const [, l] of pts) {
      if (l > 0) {
        lo = Math.min(lo, l);
        hi = Math.max(hi, l);
      }
    }
    const ly0 = Math.floor(Math.log10(lo));
    const ly1 = Math.ceil(Math.log10(hi));
    const span = Math.max(1, ly1 - ly0);
    const X = (i: number): number => 36 + ((W - 44) * i) / Math.max(1, n - 1);
    const Y = (l: number): number => 8 + (H - 30) * (1 - (Math.log10(l) - ly0) / span);
    g.font = "20px IBM Plex Sans, system-ui, sans-serif";
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.strokeStyle = "rgba(255,255,255,0.1)";
    g.lineWidth = 1;
    for (let e = ly0; e <= ly1; e += 1) {
      const y = Y(10 ** e);
      g.beginPath();
      g.moveTo(36, y);
      g.lineTo(W - 8, y);
      g.stroke();
      g.fillText(`1e${e}`, 0, y + 6);
    }
    g.fillText(`${n.toLocaleString()} iterations`, W - 200, H - 4);
    // per-iteration losses (faint) and a running mean (bright)
    g.strokeStyle = "rgba(143, 211, 200, 0.28)";
    g.beginPath();
    pts.forEach(([i, l], k) => (k === 0 ? g.moveTo(X(i), Y(l)) : g.lineTo(X(i), Y(l))));
    g.stroke();
    g.strokeStyle = "rgba(143, 211, 200, 0.95)";
    g.lineWidth = 3;
    g.beginPath();
    let acc = 0;
    const win: number[] = [];
    pts.forEach(([i, l], k) => {
      win.push(l);
      acc += l;
      if (win.length > 25) acc -= win.shift()!;
      const m = acc / win.length;
      if (k === 0) g.moveTo(X(i), Y(m));
      else g.lineTo(X(i), Y(m));
    });
    g.stroke();
  }

  /** Stop training and grow the result in the dish. */
  async finish(): Promise<void> {
    const r = this.run;
    if (!r) return;
    this.say("Finishing the iteration…");
    await this.pauseTraining();
    const theta = await r.job.readWeightsIdle();
    const weights = fromTrainer(theta, COMMITTED);
    const sha = await sha256hex(weights.buffer);
    const last = r.evals[r.evals.length - 1];
    const tail = r.losses.slice(-50);
    const card: ModelCard = {
      iterations: r.job.iter,
      trainSeconds: this.trainSeconds(r),
      finalLoss: tail.length ? tail.reduce((a, [, l]) => a + l, 0) / tail.length : null,
      adapter: this.d.gpu.adapterId,
      tier: this.d.tier,
      iou96: last?.fits[96]?.iou ?? null,
      iou300: last?.fits[300]?.iou ?? null,
      regrow: null,
      recognisable: r.recognisable ? { iter: r.recognisable.iter, seconds: r.recognisable.seconds } : null,
      regime: r.recipe.damage > 0 ? "regenerating" : "persistent",
      batch: r.recipe.B,
      pool: r.recipe.pool,
      rollout: [r.recipe.Tmin, r.recipe.Tmax],
    };
    const name = this.presetName ? `Your ${this.presetName.toLowerCase()}` : "Your drawing";
    await this.showLive(this.makeOrganism(`taught-${sha.slice(0, 12)}`, name, weights, sha, card), card, r.target, null);
  }

  private makeOrganism(id: string, name: string, weights: Float32Array<ArrayBuffer>, sha: string, card: ModelCard | null): Organism {
    const def: OrganismDef = {
      id,
      name,
      blurb: card ? `Trained on this GPU for ${card.iterations.toLocaleString()} iterations (${fmtS(card.trainSeconds)}).` : "Imported into this browser.",
      gated: false,
      weights: "",
      sha256: sha,
      target: "",
      training: {
        regime: card?.regime ?? "persistent",
        trainer: card ? "this page (Teach), on this GPU" : "unknown (imported)",
        adapter: card?.adapter,
        grid: GRID,
        batch: card?.batch,
        pool: card?.pool,
        rollout: card?.rollout,
        iterations: card?.iterations,
        train_seconds: card?.trainSeconds,
        theta_sha256: sha,
      },
      measured: {
        growth_iou: card ? { "96": card.iou96 ?? 0, "300": card.iou300 ?? 0 } : {},
        alive_cells_every_250: [],
        alive_at_long_run: 0,
        regrow: { mean_iou_200: card?.regrow ?? 0, min_iou_200: 0, mean_twin_200: 0, mean_iou_800: 0, min_iou_800: 0, mean_twin_800: 0, mean_iou_cut: 0 },
      },
    };
    return { def, ck: { weights, b1Off: this.d.gated.b1Off, w1Off: this.d.gated.w1Off, w2Off: this.d.gated.w2Off, sha256: sha } };
  }

  private async showLive(org: Organism, card: ModelCard | null, target: Float32Array, savedId: string | null): Promise<void> {
    this.d.lib.register(org);
    this.taught = { org, card, target, savedId };
    this.regrow = null;
    this.phase = "live";
    this.nameIn.value = org.def.name;
    this.syncPhase();
    this.drawGhost(target);
    this.renderCard();
    await this.d.app.loadScene("teach");
    this.say(card ? "Grown from one cell with the network this GPU just trained." : "A model from this browser's library.");
    if (target.some((v) => v > 0) && (!card || card.regrow === null)) void this.measureRegrow();
  }

  private drawGhost(target: Float32Array): void {
    const g = this.ghost.getContext("2d");
    if (!g) return;
    const S = 4;
    g.clearRect(0, 0, this.ghost.width, this.ghost.height);
    g.fillStyle = "rgba(235, 245, 240, 0.9)";
    const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < GRID && y < GRID && target[(y * GRID + x) * 4 + 3]! > 0.5;
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if (!on(x, y)) continue;
        if (!on(x + 1, y)) g.fillRect((x + 1) * S - 1, y * S, 1.5, S);
        if (!on(x - 1, y)) g.fillRect(x * S, y * S, 1.5, S);
        if (!on(x, y + 1)) g.fillRect(x * S, (y + 1) * S - 1, S, 1.5);
        if (!on(x, y - 1)) g.fillRect(x * S, y * S, S, 1.5);
      }
    }
  }

  /** The card's regeneration score, on the live kernel (the Menagerie's protocol). */
  private async measureRegrow(): Promise<void> {
    const t = this.taught;
    if (!t) return;
    const job = new RegrowJob(this.d.gpu.device, this.d.liveKernels, t.org.ck, t.target);
    try {
      await this.d.scheduler.add(job);
      if (this.taught !== t || !job.result) return;
      this.regrow = job.result;
      if (t.card) {
        t.card.regrow = job.result.mean;
        t.org.def.measured.regrow.mean_iou_200 = job.result.mean;
      }
      this.renderCard();
    } finally {
      job.destroy();
    }
  }

  private renderCard(): void {
    const t = this.taught;
    this.cardEl.textContent = "";
    if (!t) return;
    const c = t.card;
    const row = (k: string, v: string): void => {
      this.cardEl.append(h("dt", {}, k), h("dd", {}, v));
    };
    if (c) {
      row("Trained", `${c.iterations.toLocaleString()} iterations, ${fmtS(c.trainSeconds)} of GPU training`);
      row("On", `${c.adapter} (${c.tier})`);
      row("Recipe", `batch ${c.batch}, pool ${c.pool}, rollouts ${c.rollout[0]}–${c.rollout[1]} steps${c.regime === "regenerating" ? ", with damage" : ""}`);
      if (c.finalLoss !== null) row("Final loss", c.finalLoss.toExponential(2));
      if (c.iou96 !== null) row("Overlap, grown", `${c.iou96.toFixed(2)} at 96 steps, ${(c.iou300 ?? 0).toFixed(2)} at 300`);
      row("Recognisable", c.recognisable ? `after ${c.recognisable.iter.toLocaleString()} iterations (${fmtS(c.recognisable.seconds)})` : "not yet");
    } else {
      row("Trained", "unknown (imported file)");
    }
    const rg = this.regrow ?? (c?.regrow !== null && c?.regrow !== undefined ? { mean: c.regrow, after: null } : null);
    row("Heals", rg ? `overlap ${rg.mean.toFixed(2)} 200 steps after the three standard cuts, on the live kernel` : t.target.some((v) => v > 0) ? "measuring…" : "no target to compare with");
    row("Weights", `${t.org.ck.sha256.slice(0, 16)}… (SHA-256)`);
  }

  async keepTraining(): Promise<void> {
    if (!this.run) {
      this.d.studio.toast.show("This model was not trained in this visit — draw it again to train it further");
      return;
    }
    this.phase = "train";
    this.syncPhase();
    await this.d.app.loadScene("teach");
    this.run.job.refreshDisplay();
    this.resumeTraining();
  }

  async backToDraw(): Promise<void> {
    await this.dropRun();
    this.taught = null;
    this.phase = "draw";
    this.syncPhase();
    await this.d.app.loadScene("teach");
    this.say("");
  }

  private async dropRun(): Promise<void> {
    const r = this.run;
    if (!r) return;
    await this.pauseTraining();
    r.job.destroy();
    r.trainer.destroy();
    this.run = null;
    this.teachBtn.disabled = false;
  }

  /** The scene changed (main's onSceneChange). Leaving Teach pauses training. */
  onScene(isTeach: boolean): void {
    this.el.hidden = !isTeach;
    if (!isTeach && this.run?.running) void this.pauseTraining();
    if (isTeach) this.updateWarnings();
  }

  private syncPhase(): void {
    for (const [k, el] of Object.entries(this.sections)) el.hidden = k !== this.phase;
    this.badge.textContent = this.phase === "draw" ? "drawing" : this.phase === "train" ? "training" : "grown";
    if (!this.canTrain) {
      this.tierNote.textContent =
        "This GPU is too slow to train in a reasonable time (it runs as the lowest tier here), so Teach only grows saved models on it. The Menagerie's organisms are ready to grow.";
    } else {
      const r = this.recipe();
      this.tierNote.textContent =
        `Trains with batch ${r.B}, rollouts of ${r.Tmin === r.Tmax ? r.Tmax : `${r.Tmin}–${r.Tmax}`} steps and a pool of ${r.pool}, with cuts during training so the result heals. ` +
        `In our test runs a gecko became recognisable after ${r.gecko[0].toLocaleString()}–${r.gecko[1].toLocaleString()} iterations (${r.geckoTime}). Your GPU's speed shows while it trains.`;
    }
  }

  // ---------------------------------------------------------- library --

  async save(): Promise<SavedModel | null> {
    const t = this.taught;
    if (!t) return null;
    const name = this.nameIn.value.trim() || t.org.def.name;
    const m: SavedModel = {
      id: t.savedId ?? newModelId(),
      name,
      created: Date.now(),
      weights: t.org.ck.weights.slice().buffer,
      target: new Float32Array(t.target).buffer,
      sha256: t.org.ck.sha256,
      card: t.card,
      origin: t.card ? "trained" : "imported",
    };
    try {
      await this.library.put(m);
      t.savedId = m.id;
      this.d.studio.toast.show(`Saved "${name}" in this browser`);
      await this.refreshLibrary();
      return m;
    } catch (e) {
      this.d.studio.toast.show(`Could not save: ${(e as Error).message}`);
      return null;
    }
  }

  private downloadTaught(): void {
    const t = this.taught;
    if (!t) return;
    const slug = t.org.def.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";
    this.d.download(new Blob([t.org.ck.weights], { type: "application/octet-stream" }), `grow-${slug}.bin`);
  }

  async refreshLibrary(): Promise<void> {
    let list: SavedModel[] = [];
    try {
      list = await this.library.list();
    } catch (e) {
      this.libList.textContent = "";
      this.libList.append(h("li", { class: "gr-note" }, `This browser will not keep models here (${(e as Error).message}). Downloads still work.`));
      return;
    }
    this.libList.textContent = "";
    if (list.length === 0) this.libList.append(h("li", { class: "gr-note" }, "Nothing saved yet."));
    for (const m of list) {
      const grow = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Grow");
      grow.addEventListener("click", () => void this.growSaved(m.id));
      const del = h("button", { type: "button", class: "bp-btn bp-btn-quiet", "aria-label": `Delete ${m.name}` }, "Delete");
      del.addEventListener("click", () => void this.library.remove(m.id).then(() => this.refreshLibrary()));
      const when = new Date(m.created).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const what = m.card ? `${m.card.iterations.toLocaleString()} it` : "imported";
      this.libList.append(h("li", {}, h("span", { class: "gr-teach-libname" }, m.name), h("span", { class: "gr-cell-sub" }, `${what} · ${when}`), grow, del));
    }
  }

  async growSaved(id: string): Promise<void> {
    const m = await this.library.get(id);
    if (!m) return;
    const w = new Float32Array(m.weights.slice(0));
    const sha = await sha256hex(w.buffer);
    if (sha !== m.sha256) {
      this.d.studio.toast.show("That saved model is damaged (its SHA-256 changed)");
      return;
    }
    if (this.d.app.scene.kind !== "teach") await this.d.app.loadScene("teach");
    await this.dropRun();
    await this.showLive(this.makeOrganism(`saved-${m.id}`, m.name, w, sha, m.card), m.card, new Float32Array(m.target.slice(0)), m.id);
  }

  async importFile(f: Blob): Promise<void> {
    const buf = await f.arrayBuffer();
    if (buf.byteLength !== WEIGHTS_BYTES) {
      this.d.studio.toast.show(`Not a Grow model: expected ${WEIGHTS_BYTES.toLocaleString()} bytes, got ${buf.byteLength.toLocaleString()}`);
      return;
    }
    const w = new Float32Array(buf);
    if (!w.every(Number.isFinite)) {
      this.d.studio.toast.show("Not a Grow model: it holds numbers that are not finite");
      return;
    }
    // a sanity check of the layout: the trainer's round trip is exact for any 8,320 numbers, so this only reads them
    toTrainer(w);
    const sha = await sha256hex(buf);
    const name = (f instanceof File ? f.name.replace(/\.bin$/i, "") : "") || "Imported model";
    const m: SavedModel = { id: newModelId(), name, created: Date.now(), weights: buf, target: new Float32Array(GRID * GRID * 4).buffer, sha256: sha, card: null, origin: "imported" };
    try {
      await this.library.put(m);
      await this.refreshLibrary();
      this.d.studio.toast.show(`Imported "${name}" into this browser`);
    } catch (e) {
      this.d.studio.toast.show(`Could not import: ${(e as Error).message}`);
    }
  }

  // ------------------------------------------------------- test hooks --

  /** Read-only summary for the acceptance script. */
  state(): Record<string, unknown> {
    const r = this.run;
    return {
      phase: this.phase,
      canTrain: this.canTrain,
      tier: this.d.tier,
      target: checkTarget(this.pad.rgba()),
      run: r
        ? {
            iter: r.job.iter,
            losses: r.losses.length,
            lastLoss: r.losses[r.losses.length - 1]?.[1] ?? null,
            firstLoss: r.losses[0]?.[1] ?? null,
            evals: r.evals.map((e) => ({ iter: e.iter, iou96: e.fits[96]?.iou, iou300: e.fits[300]?.iou, rgb96: e.fits[96]?.rgbErr })),
            recognisable: r.recognisable,
            trainSeconds: this.trainSeconds(r),
            itPerS: this.itPerS(r),
            running: r.running,
            memoryMiB: r.trainer.totalBytes / 2 ** 20,
            units: r.job.unitsTotal,
            slices: this.d.scheduler.slicesOf(TEACH_JOB),
            budgetMs: this.d.scheduler.budgetMs,
            recipe: r.recipe,
          }
        : null,
      fps: this.fps,
      taught: this.taught ? { id: this.taught.org.def.id, name: this.taught.org.def.name, sha: this.taught.org.ck.sha256, card: this.taught.card, savedId: this.taught.savedId } : null,
      regrow: this.regrow,
    };
  }
}
