// Turing Patterns — the app controller. Wires the Field Studies shell, the
// render core and the runtime around the live simulation: scenes, tools,
// edit events, history (save / restore / A-B / undo), URL state, the quality
// governor and profiling. The gate path (proof/gate.ts) is deliberately not
// reachable from here except through the Prove drawer's buttons.

import type { GpuContext, GpuProfiler, Tier } from "@bp/gpu";
import { lowerTier, readBuffer, rememberTier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { Camera2D, FieldView2D } from "@bp/render";
import type { Checkpointer, QualityGovernor, SimEvent } from "@bp/runtime";
import { EventLog, History, SimClock } from "@bp/runtime";
import type { CalloutSpec, Studio, ToolHandlers, ToolSpec } from "@bp/studio";
import { CanvasInput, h, segmented, slider } from "@bp/studio";
import { isCapturing, sha256hex } from "@bp/verify";
import { blank } from "./model/ic.js";
import { gridFor } from "./model/grid.js";
import type { Checkpoint, Chemistry, Stamp } from "./model/sim.js";
import { LiveSim, STEPS_PER_TICK, chemistryAt, sweepActive } from "./model/sim.js";
import type { ChemPayload, DivePayload, RatioPayload, StampsPayload } from "./model/runner.js";
import { DU, applyEvent, runTicks, toRow } from "./model/runner.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";
import type { SceneContext, SceneDef, SceneId } from "./scenes/scenes.js";
import { MAP_F, PLANE_K, REGIMES, SCENES, nearestRegime, sceneById } from "./scenes/scenes.js";
import { mapUv } from "./scenes/map.js";
import { PARAMS, fetchCanonicalIC } from "./proof/gate.js";
import { Breadcrumb } from "./ui/breadcrumb.js";
import type { Instruments, PatternStats, SpectrumReading } from "./learn/instruments.js";

/** Ticks per second at 1× — T3 16 steps/frame, T2 12, T1 8 at 60 fps. */
const TICK_RATE: Record<Tier, number> = { T3: 240, T2: 180, T1: 120 };
/** Replay at most this many ticks for an undo; further back is a plain restore. */
const REPLAY_CAP = 6000;

export interface SceneOptions {
  seed?: number;
  F?: number;
  k?: number;
  ratio?: number;
  palette?: PaletteId;
  grid?: [number, number];
  camera?: { cx: number; cy: number; zoom: number };
  tool?: string;
  /** Pre-run this many ms of simulation before the first frame (boot). */
  prewarmMs?: number;
}

interface Snapshot {
  cp: Checkpoint;
  logIndex: number;
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef, app: App) => void;
  onChemistry?: (F: number, k: number, ratio: number) => void;
  onEdited?: () => void;
  onStats?: (s: PatternStats) => void;
  onSpectrum?: (s: SpectrumReading) => void;
  onFrame?: (now: number) => void;
}

export class App {
  readonly gpu: GpuContext;
  readonly device: GPUDevice;
  readonly studio: Studio;
  readonly hdr: HdrPipeline;
  readonly view: FieldView2D;
  readonly camera = new Camera2D();
  readonly clock: SimClock;
  readonly log = new EventLog();
  readonly breadcrumb = new Breadcrumb();
  readonly history: History<Snapshot>;
  tier: Tier;
  sim!: LiveSim;
  scene: SceneDef = SCENES[0]!;
  ctx: SceneContext = { w: 1, h: 1, seed: 1 };
  palette: PaletteId = "nocturne";
  ratio = 2;
  /** Edits since the scene loaded (for Prove's live honesty). */
  edits = 0;
  hooks: AppHooks = {};
  learnOpen = false;
  showLabels = true;

  private applied = 0;
  private group = 0;
  private activeGroup = 0;
  private stroke: Stamp[] = [];
  private strokeLast: [number, number] | null = null;
  private busy = false;
  private inFlight = false;
  private last = performance.now();
  private frames = 0;
  private fpsT0 = performance.now();
  private fps = 0;
  private sceneT0 = performance.now();
  private brush: Record<string, number> = { seed: 5, erase: 9, chemistry: 22 };
  private chemSwatch = 0;
  private hover: [number, number] | null = null;
  private probeDue = 0;
  private frameNo = 0;
  /** Smoothed ticks per frame (to turn the sim pass's GPU time into ms per tick). */
  private ticksEma = 0;
  private rateT0 = performance.now();
  private rateTick0 = 0;
  private stepsPerSecond = 0;
  /** Pointer/keyboard routing for the canvas (camera vs. tools). */
  readonly input: CanvasInput;
  private comparingPlaying = true;
  private split = 0.5;
  private mapSnapshot: { v: Float32Array; w: number; h: number } | null = null;
  private readonly probeBuf: GPUBuffer;
  private probeBusy = false;
  private snapshotWanted = false;
  private disposed = false;
  instruments: Instruments | null = null;
  governor: QualityGovernor | null = null;
  profiler: GpuProfiler | null = null;
  /** Called with a PNG blob after a snapshot frame. */
  onSnapshot: ((b: Blob) => void) | null = null;

  constructor(gpu: GpuContext, studio: Studio, hdr: HdrPipeline, tier: Tier) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.studio = studio;
    this.hdr = hdr;
    this.tier = tier;
    this.view = new FieldView2D(gpu.device, PALETTES.nocturne.look);
    this.clock = new SimClock(TICK_RATE[tier], 32);
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.probeBuf = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: "rd-probe",
    });
    const cp: Checkpointer<Snapshot> = {
      capture: () => {
        this.applyPending();
        return { cp: this.sim.checkpoint(), logIndex: this.log.length };
      },
      restore: (s) => {
        this.sim.restore(s.cp);
        this.log.truncate(s.logIndex);
        this.applied = s.logIndex;
      },
      release: (s) => this.sim.release(s.cp),
    };
    this.history = new History(cp, tier === "T3" ? 5 : 8);
    this.history.onChange = () => this.syncTransport();
    this.input = new CanvasInput(studio.canvas, this.camera, this.toolHandlers(), () => this.studio.rail.active === "pan");
    this.breadcrumb.onMove = (F, k, phase) => this.setChemistry(F, k, phase);
    this.breadcrumb.back.addEventListener("click", () => void this.backToMap());
  }

  // ------------------------------------------------------------ scenes --

  async loadScene(id: SceneId, o: SceneOptions = {}): Promise<void> {
    const scene = sceneById(id);
    this.busy = true;
    try {
      this.history.clear();
      this.view.setCompare(null);
      const old = this.sim as LiveSim | undefined;
      const rect = this.studio.canvas.getBoundingClientRect();
      const [w, h] = scene.grid ? [scene.grid[0], scene.grid[1]] : (o.grid ?? gridFor(this.tier, rect.width, rect.height));
      const seed = o.seed ?? 1;
      this.ctx = { w, h, seed };
      this.ratio = o.ratio ?? 2;
      const chem: Chemistry = {
        Du: DU,
        Dv: scene.kernel === "reference" && o.ratio === undefined ? PARAMS.Dv : DU / this.ratio,
        dt: 1,
        dx: 1,
        F0: o.F ?? scene.F,
        k0: o.k ?? scene.k,
        sweep: scene.sweep ? { anchorU: 0.5, anchorV: 0.5 } : null,
        reveal: null,
      };
      const field = scene.ic ? scene.ic(this.ctx) : await fetchCanonicalIC();
      const sim = await LiveSim.create(this.device, {
        w,
        h,
        periodic: scene.periodic,
        kernel: scene.kernel,
        chem,
        seed,
        field: field.length === w * h * 2 ? field : blank(w, h, seed),
      });
      this.sim = sim;
      old?.destroy();
      this.scene = scene;
      this.log.clear();
      this.applied = 0;
      this.edits = 0;
      this.clock.reset();
      this.sceneT0 = performance.now();
      this.instruments?.attach(sim);
      this.camera.setViewport(rect.width, rect.height);
      this.camera.setDomain(w, h, scene.periodic);
      if (o.camera) {
        this.camera.set({ cx: o.camera.cx * w, cy: o.camera.cy * h, pxPerUnit: this.camera.coverZoom() * o.camera.zoom });
      } else {
        this.camera.fit(scene.zoom);
      }
      this.view.setSource({ buffer: sim.state, width: w, height: h, stride: 2, primary: 1, secondary: 0, periodic: scene.periodic });
      this.view.setOverlay(sim.overlay ? sim.overlay.createView() : null);
      this.setPalette(o.palette ?? scene.palette, false);
      this.hdr.resetExposure();
      const tools = scene.tools.slice();
      this.studio.rail.setTools(
        tools.map((t) => this.toolSpec(t)),
        o.tool && tools.includes(o.tool) ? o.tool : scene.tool,
      );
      this.studio.root.dataset["tool"] = this.studio.rail.active;
      this.studio.heading.setCurrent(scene.listed ? scene.id : "");
      this.refreshHeading();
      this.setCallouts();
      this.governor?.acknowledgeRestart();
      if (o.prewarmMs && o.prewarmMs > 0 && !this.gpu.info.software) await this.prewarm(o.prewarmMs);
      this.syncTransport();
      this.hooks.onSceneChange?.(scene, this);
      this.hooks.onChemistry?.(this.sim.chem.F0, this.sim.chem.k0, this.ratio);
    } finally {
      this.busy = false;
    }
  }

  /** Restart the current scene from its starting state (same seed, same grid). */
  async restart(): Promise<void> {
    if (this.governor?.simStepDownPending && this.tier !== "T1") {
      this.tier = lowerTier(this.tier);
      rememberTier(this.gpu.adapterId, this.tier);
      this.clock.ticksPerSecond = TICK_RATE[this.tier];
      this.studio.toast.show(`Restarted at a smaller size (${this.tier}) to hold the frame rate`);
      await this.loadScene(this.scene.id, { seed: this.ctx.seed, ratio: this.ratio, palette: this.palette });
      return;
    }
    const c = this.sim.chem;
    await this.loadScene(this.scene.id, {
      seed: this.ctx.seed,
      F: this.scene.sweep ? undefined : c.F0,
      k: this.scene.sweep ? undefined : c.k0,
      ratio: this.ratio,
      palette: this.palette,
      grid: this.scene.grid ? undefined : [this.ctx.w, this.ctx.h],
    });
  }

  private async prewarm(ms: number): Promise<void> {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      const enc = runTicks(32, this.runOptions());
      this.device.queue.submit([enc.finish()]);
      await this.device.queue.onSubmittedWorkDone();
    }
  }

  async backToMap(): Promise<void> {
    await this.loadScene("map", { seed: this.ctx.seed, palette: undefined });
    // start close in, then pull back out to the whole map
    const target = this.camera.state();
    this.camera.set({ ...target, pxPerUnit: target.pxPerUnit * 2.5 });
    this.camera.flyTo(target, 900);
  }

  /** Is the sim exactly the gated run (gated scene, no edits, canonical chemistry)? */
  get onGatedRun(): boolean {
    const c = this.sim.chem;
    return this.scene.id === "gated" && this.edits === 0 && c.F0 === PARAMS.F && c.k0 === PARAMS.k && c.Dv === PARAMS.Dv;
  }

  get inMapSweep(): boolean {
    return this.scene.id === "map" && sweepActive(this.sim.chem, this.sim.tick) && !this.sim.chem.reveal;
  }

  private refreshHeading(): void {
    const s = this.scene;
    const c = this.sim.chem;
    const extra = this.studio.heading.extra;
    extra.textContent = "";
    const dish = s.id === "dish" || (s.id === "map" && c.reveal !== null);
    if (dish) {
      const { regime, distance } = nearestRegime(c.F0, c.k0);
      const named = distance < 0.08;
      const dish = sceneById("dish");
      this.studio.heading.set(
        named ? regime.name : "Uncharted chemistry",
        named ? `${cap(regime.blurb)}. Drag the dot to move through pattern space.` : dish.prompt,
      );
      this.breadcrumb.set(c.F0, c.k0);
      if (this.mapSnapshot) this.breadcrumb.setSnapshot(this.mapSnapshot.v, this.mapSnapshot.w, this.mapSnapshot.h);
      extra.append(this.breadcrumb.el);
    } else {
      this.studio.heading.set(s.title, s.prompt);
    }
  }

  // ------------------------------------------------------------- look --

  setPalette(id: PaletteId, announce = true): void {
    const p = PALETTES[id];
    this.palette = id;
    this.view.look = p.look;
    this.studio.setTone(p.tone);
    document.documentElement.style.setProperty("--sim-accent", p.accent);
    document.documentElement.style.setProperty("--sim-key", p.key);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", typeof p.look.background === "string" ? p.look.background : "#0b0f13");
    if (announce) this.writeUrl();
  }

  // ------------------------------------------------------- chemistry --

  private newGroup(): number {
    this.group += 1;
    return this.group;
  }

  private beginEdit(): number {
    const g = this.newGroup();
    this.history.beforeEdit(g, this.sim.tick);
    this.activeGroup = g;
    this.edits += 1;
    this.hooks.onEdited?.();
    return g;
  }

  /** Base chemistry change (Tune sliders, breadcrumb). */
  setChemistry(F: number, k: number, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change the chemistry")) return;
    if (this.inMapSweep) {
      this.studio.toast.show("The Map shows every chemistry at once — dive in to tune one");
      return;
    }
    if (phase === "start" || this.activeGroup === 0) this.beginEdit();
    this.paramEvent("chem", { g: this.activeGroup, F, k } satisfies ChemPayload);
    if (phase === "end") this.activeGroup = 0;
    this.breadcrumb.set(F, k);
    this.refreshHeading();
    this.hooks.onChemistry?.(F, k, this.ratio);
    this.writeUrl();
  }

  setRatio(r: number, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change diffusion")) return;
    if (phase === "start" || this.activeGroup === 0) this.beginEdit();
    this.ratio = r;
    this.paramEvent("ratio", { g: this.activeGroup, r } satisfies RatioPayload);
    if (phase === "end") this.activeGroup = 0;
    this.hooks.onChemistry?.(this.sim.chem.F0, this.sim.chem.k0, r);
    this.writeUrl();
  }

  /**
   * Log and apply a chemistry change now. A drag coalesces into one event per
   * tick per group: changes at the same boundary have no ticks between them,
   * so only the last one can matter to replay.
   */
  private paramEvent(kind: "chem" | "ratio", payload: ChemPayload | RatioPayload): void {
    this.applyPending();
    const all = this.log.all();
    const last = all[all.length - 1];
    const lp = last?.payload as { g?: number } | undefined;
    if (last && last.kind === kind && last.tick === this.sim.tick && lp?.g === payload.g) {
      (last as SimEvent).payload = payload as never;
      applyEvent(this.sim, last);
      return;
    }
    const e = this.log.push(this.sim.tick, kind, payload as never);
    this.applied = this.log.length;
    applyEvent(this.sim, e);
  }

  dive(x: number, y: number): void {
    if (this.blocked("dive")) return;
    if (!this.inMapSweep) return;
    const [F, k] = chemistryAt(this.sim.chem, this.sim.w, this.sim.h, x, y, this.sim.tick);
    this.captureMapSnapshot();
    const g = this.beginEdit();
    this.log.push(this.sim.tick, "dive", { g, x, y } satisfies DivePayload as never);
    this.applyPending();
    this.activeGroup = 0;
    // the camera dives in while the chemistry spreads out from the point
    this.camera.flyTo({ cx: x, cy: y, pxPerUnit: this.camera.coverZoom() * 3 }, 1300);
    this.studio.rail.setTools(
      this.scene.tools.filter((t) => t !== "dive").map((t) => this.toolSpec(t)),
      "seed",
    );
    this.studio.root.dataset["tool"] = "seed";
    this.refreshHeading();
    this.setCallouts();
    const { regime, distance } = nearestRegime(F, k);
    this.studio.toast.show(`Diving into F ${F.toFixed(4)} · k ${k.toFixed(4)}${distance < 0.08 ? ` — ${regime.name}` : ""}`);
    this.hooks.onChemistry?.(F, k, this.ratio);
    this.writeUrl();
  }

  private captureMapSnapshot(): void {
    if (!this.instruments) return;
    const enc = this.device.createCommandEncoder();
    if (!this.instruments.recordStats(enc)) return;
    this.device.queue.submit([enc.finish()]);
    const ow = Math.ceil(this.sim.w / 2);
    const oh = Math.ceil(this.sim.h / 2);
    // reuse the stats readback: it carries the half-res V field we need
    void this.instruments.collectStatsRaw().then((v) => {
      if (!v) return;
      this.mapSnapshot = { v, w: ow, h: oh };
      this.breadcrumb.setSnapshot(v, ow, oh);
    });
  }

  // ------------------------------------------------------------ history --

  /** Apply logged events that are due at the current boundary (no ticks). */
  private applyPending(): void {
    if (this.applied >= this.log.length) return;
    const enc = runTicks(0, this.runOptions());
    this.device.queue.submit([enc.finish()]);
  }

  private runOptions(timestamps?: GPUComputePassTimestampWrites): Parameters<typeof runTicks>[1] {
    return {
      device: this.device,
      sim: this.sim,
      take: (t) => {
        const out: SimEvent[] = [];
        const all = this.log.all();
        while (this.applied < all.length && all[this.applied]!.tick <= t) out.push(all[this.applied++]!);
        return out;
      },
      director: this.scene.director,
      ctx: this.ctx,
      timestamps,
    };
  }

  savePoint(): void {
    if (this.blocked("save")) return;
    this.history.savePointNow(this.sim.tick);
    this.studio.toast.show(`Saved at step ${(this.sim.tick * STEPS_PER_TICK).toLocaleString()}`);
  }

  restoreSave(): void {
    if (this.busy || isCapturing()) return;
    if (this.history.comparing) this.toggleCompare();
    if (this.history.restoreSave()) {
      this.refreshHeading();
      this.hooks.onChemistry?.(this.sim.chem.F0, this.sim.chem.k0, this.ratio);
      this.studio.toast.show("Restored the save point");
    }
  }

  toggleCompare(): void {
    if (!this.history.hasSave || this.busy) return;
    const on = !this.history.comparing;
    this.history.comparing = on;
    if (on) {
      this.comparingPlaying = !this.clock.paused;
      this.clock.paused = true;
      const save = this.history.savePoint!;
      this.view.setCompare({
        buffer: save.cp.state,
        width: this.sim.w,
        height: this.sim.h,
        stride: 2,
        primary: 1,
        secondary: 0,
        periodic: this.sim.periodic,
      });
      this.split = 0.5;
      this.view.view.split = 0.5;
      this.studio.toast.show("A · save point on the left, B · now on the right — move across the dish to wipe");
    } else {
      this.view.setCompare(null);
      this.view.view.split = null;
      this.clock.paused = !this.comparingPlaying;
    }
    this.syncTransport();
  }

  async undo(): Promise<void> {
    if (this.busy || isCapturing()) return;
    if (this.history.comparing) this.toggleCompare();
    const entry = this.history.popUndo();
    if (!entry) return;
    this.busy = true;
    try {
      const target = this.sim.tick;
      const snap = entry.checkpoint;
      const kept = this.log
        .all()
        .filter((e, i) => i < snap.logIndex || (e.payload as { g?: number }).g !== entry.eventId);
      this.sim.restore(snap.cp);
      this.log.load(kept);
      this.applied = snap.logIndex;
      const span = target - snap.cp.tick;
      if (span > REPLAY_CAP) {
        this.log.truncate(snap.logIndex);
        this.studio.toast.show("Restored the moment before that edit (too far back to replay the rest)");
      } else {
        this.studio.toast.show(span > 400 ? "Undoing — replaying everything since…" : "Undone");
        let chunks = 0;
        while (this.sim.tick < target) {
          const enc = runTicks(Math.min(64, target - this.sim.tick), this.runOptions());
          this.device.queue.submit([enc.finish()]);
          chunks += 1;
          if (chunks % 8 === 0) await this.device.queue.onSubmittedWorkDone();
        }
        this.applyPending();
        await this.device.queue.onSubmittedWorkDone();
      }
      this.history.release(snap);
      this.edits = Math.max(0, this.edits - 1);
      this.refreshHeading();
      this.hooks.onChemistry?.(this.sim.chem.F0, this.sim.chem.k0, this.ratio);
      this.hooks.onEdited?.();
    } finally {
      this.busy = false;
      this.syncTransport();
    }
  }

  syncTransport(): void {
    this.studio.transport.setHistory({
      canRestore: this.history.hasSave,
      canCompare: this.history.hasSave,
      comparing: this.history.comparing,
      canUndo: this.history.canUndo,
    });
    this.studio.transport.setPlaying(!this.clock.paused);
  }

  togglePlay(): void {
    if (this.history.comparing) {
      this.studio.toast.show("Compare is on — press C to go back to editing");
      return;
    }
    this.clock.paused = !this.clock.paused;
    this.syncTransport();
  }

  setSpeed(v: number): void {
    this.clock.speed = v;
    this.studio.transport.setSpeed(v);
    this.writeUrl();
  }

  private blocked(what: string): boolean {
    if (this.busy || isCapturing()) return true;
    if (this.history.comparing) {
      this.studio.toast.show(`Compare is on — press C to ${what}`);
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------- tools --

  toolSpec(id: string): ToolSpec {
    const size = (tool: string, label = "Brush size"): HTMLElement =>
      slider({
        label,
        min: 2,
        max: 48,
        step: 1,
        value: this.brush[tool] ?? 6,
        unit: " cells",
        onInput: (v) => {
          this.brush[tool] = v;
        },
      }).el;
    switch (id) {
      case "dive":
        return {
          id,
          label: "Dive",
          icon: "dive",
          hint: "Tap a region to dive into its chemistry · drag to look around",
        };
      case "seed":
        return { id, label: "Seed", icon: "seed", hint: "Drag to plant new growth", paints: true, options: () => size("seed") };
      case "erase":
        return { id, label: "Erase", icon: "erase", hint: "Drag to wipe the dish back to rest", paints: true, options: () => size("erase") };
      case "chemistry":
        return {
          id,
          label: "Chemistry",
          icon: "chemistry",
          hint: "Paint a chemistry — the pattern there follows it",
          paints: true,
          options: () => {
            const swatches = segmented(
              "Chemistry to paint",
              [...REGIMES.map((r, i) => ({ value: String(i), label: r.name, title: `${r.blurb} · F ${r.F} · k ${r.k}` })), { value: "clear", label: "Unpaint" }],
              String(this.chemSwatch),
              (v) => {
                this.chemSwatch = v === "clear" ? -1 : Number(v);
              },
            );
            swatches.el.classList.add("rd-swatches");
            return h("div", { class: "rd-chem-options" }, swatches.el, size("chemistry"));
          },
        };
      case "probe":
        return { id, label: "Probe", icon: "probe", hint: "Point anywhere to read the two chemicals and the local chemistry" };
      default:
        return { id: "pan", label: "Look", icon: "hand", hint: "Drag to pan · scroll or pinch to zoom · double-click to fit" };
    }
  }

  /** [ / ] — scale the active tool's brush. */
  nudgeBrush(factor: number): void {
    const t = this.studio.rail.active;
    if (!(t in this.brush)) return;
    this.brush[t] = Math.min(48, Math.max(2, Math.round((this.brush[t] ?? 6) * factor)));
    this.studio.rail.select(t, false);
    this.studio.toast.show(`Brush ${this.brush[t]} cells`, 1200);
  }

  selectTool(id: string): void {
    this.studio.root.dataset["tool"] = id;
    if (id !== "probe" && id !== "dive") this.studio.probe.hidden = true;
  }

  private toolHandlers(): ToolHandlers {
    const paints = (): boolean => !!this.studio.rail.activeTool?.paints;
    return {
      paints,
      down: (x, y) => {
        const tool = this.studio.rail.active;
        if (tool === "chemistry" && this.sim.kernel !== "live") {
          this.studio.toast.show("The gated dish has one chemistry — use Tune to change it");
          return;
        }
        if (this.blocked("paint")) return;
        this.beginEdit();
        const p = this.camera.screenToDomain(x, y);
        this.strokeLast = null;
        this.addStamp(p);
      },
      move: (x, y) => {
        if (this.activeGroup === 0) return;
        this.addStamp(this.camera.screenToDomain(x, y));
      },
      up: () => {
        this.flushStroke();
        this.activeGroup = 0;
        this.strokeLast = null;
      },
      hover: (x, y) => {
        this.hover = x === null || y === null ? null : [x, y];
        if (this.history.comparing && x !== null) {
          this.split = Math.min(Math.max(x / Math.max(this.camera.viewW, 1), 0), 1);
          this.view.view.split = this.split;
        }
      },
      tap: (x, y) => {
        if (this.studio.rail.active === "dive") {
          const [dx, dy] = this.camera.screenToDomain(x, y);
          if (dx >= 0 && dy >= 0 && dx < this.sim.w && dy < this.sim.h) this.dive(dx, dy);
        } else if (this.studio.rail.active === "probe") {
          this.hover = [x, y];
          this.probeDue = 0;
        }
      },
    };
  }

  private addStamp(p: [number, number]): void {
    const tool = this.studio.rail.active;
    const r = this.brush[tool] ?? 6;
    const mode: Stamp["mode"] = tool === "seed" ? 0 : tool === "erase" ? 1 : this.chemSwatch < 0 ? 3 : 2;
    const reg = REGIMES[Math.max(0, this.chemSwatch)]!;
    const make = (x: number, y: number): Stamp => ({
      x,
      y,
      r,
      strength: mode >= 2 ? 0.6 : 1,
      mode,
      F: reg.F,
      k: reg.k,
    });
    if (this.sim.periodic) {
      p = [((p[0] % this.sim.w) + this.sim.w) % this.sim.w, ((p[1] % this.sim.h) + this.sim.h) % this.sim.h];
    }
    if (!this.strokeLast) {
      this.stroke.push(make(p[0], p[1]));
      this.strokeLast = p;
      return;
    }
    const [lx, ly] = this.strokeLast;
    let dx = p[0] - lx;
    let dy = p[1] - ly;
    if (this.sim.periodic) {
      dx -= Math.round(dx / this.sim.w) * this.sim.w;
      dy -= Math.round(dy / this.sim.h) * this.sim.h;
    }
    const d = Math.hypot(dx, dy);
    const spacing = Math.max(1, r * 0.35);
    if (d < spacing) return;
    const n = Math.min(Math.floor(d / spacing), 24);
    for (let i = 1; i <= n; i += 1) this.stroke.push(make(lx + (dx * i) / n, ly + (dy * i) / n));
    this.strokeLast = [lx + dx, ly + dy];
  }

  private flushStroke(): void {
    if (this.stroke.length === 0 || this.activeGroup === 0) {
      this.stroke = [];
      return;
    }
    const rows = this.stroke.slice(0, 128).map(toRow);
    this.stroke = [];
    this.log.push(this.sim.tick, "stamps", { g: this.activeGroup, s: rows } satisfies StampsPayload as never);
  }

  // ---------------------------------------------------------- callouts --

  private setCallouts(): void {
    const specs: CalloutSpec[] = [];
    const s = this.scene;
    const project = (x: number, y: number): [number, number] => this.camera.domainToScreen(x, y);
    if (s.id === "map") {
      for (const r of REGIMES) {
        const [u, v] = mapUv(r.F, r.k);
        if (u < 0 || u > 1 || v < 0.02 || v > 0.98) continue;
        const x = u * this.ctx.w;
        const y = v * this.ctx.h;
        specs.push({
          id: `map-${r.id}`,
          text: r.name,
          anchor: () => project(x, y),
          when: () =>
            this.showLabels && this.inMapSweep && performance.now() - this.sceneT0 > 2500 && this.camera.pxPerUnit < this.camera.coverZoom() * 2.4,
        });
      }
    } else {
      const intro: Partial<Record<SceneId, string>> = {
        mitosis: "one spot — watch it split",
        coral: "the seed starts to branch",
        gated: "128 × 128 — the gated dish, tiled",
      };
      const text = intro[s.id];
      if (text) {
        specs.push({
          id: `intro-${s.id}`,
          text,
          style: "pin",
          anchor: () => project(this.ctx.w / 2, this.ctx.h / 2 - 22),
          when: () => this.showLabels && performance.now() - this.sceneT0 > 800 && performance.now() - this.sceneT0 < 9000,
        });
      }
    }
    this.studio.callouts.set(specs);
  }

  // -------------------------------------------------------------- frame --

  start(): void {
    const frame = (now: number): void => {
      if (this.disposed) return;
      requestAnimationFrame(frame);
      this.tick(now);
    };
    requestAnimationFrame(frame);
  }

  private tick(now: number): void {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.frames += 1;
    if (now - this.fpsT0 > 1000) {
      this.fps = (this.frames * 1000) / (now - this.fpsT0);
      this.frames = 0;
      this.fpsT0 = now;
      const st = this.governor?.status();
      this.studio.transport.setStatus(`${Math.round(this.fps)} fps`, !!st?.degraded, st?.message ?? "");
    }
    // the capture lock: the live loop yields entirely while a capture runs
    if (isCapturing() || this.busy || this.inFlight) return;
    if (this.profiler?.source === "submit-latency" && this.governor) this.governor.sample(dt * 1000, now);
    this.frameNo += 1;
    const rect = this.studio.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.governor?.renderScale ?? 1;
    this.hdr.resize(rect.width, rect.height, dpr, scale);
    this.camera.setViewport(rect.width, rect.height);
    this.camera.update(dt, now);
    const effects = this.governor?.effects ?? 1;
    this.view.view.sampling = effects > 0 ? "bicubic" : "bilinear";

    this.profiler?.begin();
    this.flushStroke();
    const n = this.history.comparing ? 0 : this.clock.due(dt);
    this.ticksEma += (n - this.ticksEma) * 0.1;
    const enc = runTicks(n, this.runOptions(this.profiler?.pass("sim")));
    if (this.sim.overlay) {
      const pass = enc.beginComputePass({ label: "rd-overlay" });
      this.sim.encodeOverlay(pass, { f: [MAP_F[0], MAP_F[1]], k: [PLANE_K[0], PLANE_K[1]] });
      pass.end();
    }
    // instruments only while Learn is open, and never in the boot window
    let statsQueued = false;
    let specQueued = false;
    if (this.instruments && this.learnOpen && this.frameNo > 30) {
      if (this.frameNo % 30 === 0) statsQueued = this.instruments.recordStats(enc);
      if (this.frameNo % 60 === 15) {
        const [cx, cy] = [this.camera.cx, this.camera.cy];
        specQueued = this.instruments.recordSpectrum(enc, cx, cy);
      }
    }
    // probe
    let probeIdx = -1;
    if (this.hover && (this.studio.rail.active === "probe" || this.studio.rail.active === "dive") && now > this.probeDue && !this.probeBusy) {
      const [x, y] = this.camera.screenToDomain(this.hover[0], this.hover[1]);
      let ix = Math.floor(x);
      let iy = Math.floor(y);
      if (this.sim.periodic) {
        ix = ((ix % this.sim.w) + this.sim.w) % this.sim.w;
        iy = ((iy % this.sim.h) + this.sim.h) % this.sim.h;
      }
      if (ix >= 0 && iy >= 0 && ix < this.sim.w && iy < this.sim.h) {
        probeIdx = iy * this.sim.w + ix;
        enc.copyBufferToBuffer(this.sim.state, probeIdx * 8, this.probeBuf, 0, 8);
        this.probeBusy = true;
        this.probeDue = now + 70;
      }
    }

    this.view.encode(enc, this.hdr.sceneView, this.hdr.width, this.hdr.height, this.camera, dpr * scale, this.profiler ?? undefined);
    this.hdr.encode(enc, dt, this.profiler ?? undefined);
    this.profiler?.end(enc);
    this.device.queue.submit([enc.finish()]);
    this.profiler?.submitted();
    if (this.snapshotWanted) {
      this.snapshotWanted = false;
      this.studio.canvas.toBlob((b) => b && this.onSnapshot?.(b), "image/png");
    }
    this.inFlight = true;
    void this.device.queue.onSubmittedWorkDone().then(() => {
      this.inFlight = false;
    });
    if (statsQueued) void this.instruments!.collectStats().then((s) => s && this.hooks.onStats?.(s));
    if (specQueued) void this.instruments!.collectSpectrum().then((s) => s && this.hooks.onSpectrum?.(s));
    if (probeIdx >= 0) void this.readProbe(probeIdx);
    else if (!this.hover) this.studio.probe.hidden = true;

    this.updateRing();
    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    const steps = this.sim.tick * STEPS_PER_TICK;
    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.sim.tick - this.rateTick0) * STEPS_PER_TICK * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateTick0 = this.sim.tick;
    }
    this.studio.transport.setClock(
      this.clock.paused ? `step ${steps.toLocaleString()}` : `step ${steps.toLocaleString()} · ${Math.round(this.stepsPerSecond).toLocaleString()}/s`,
    );
    this.hooks.onFrame?.(now);
  }

  private updateRing(): void {
    const t = this.studio.rail.activeTool;
    const ring = this.studio.ring;
    if (!t?.paints || !this.hover || this.history.comparing) {
      ring.classList.remove("is-shown");
      return;
    }
    const r = (this.brush[t.id] ?? 6) * this.camera.pxPerUnit;
    ring.style.width = `${r * 2}px`;
    ring.style.height = `${r * 2}px`;
    ring.style.transform = `translate(${this.hover[0] - r}px, ${this.hover[1] - r}px)`;
    ring.classList.add("is-shown");
  }

  private async readProbe(idx: number): Promise<void> {
    try {
      await this.probeBuf.mapAsync(GPUMapMode.READ);
      const f = new Float32Array(this.probeBuf.getMappedRange().slice(0));
      this.probeBuf.unmap();
      if (!this.hover) return;
      const x = idx % this.sim.w;
      const y = Math.floor(idx / this.sim.w);
      const [F, k] = chemistryAt(this.sim.chem, this.sim.w, this.sim.h, x, y, this.sim.tick);
      const { regime, distance } = nearestRegime(F, k);
      const p = this.studio.probe;
      p.hidden = false;
      p.innerHTML = "";
      p.append(
        h("strong", {}, distance < 0.08 ? regime.name : "Between regimes"),
        h(
          "dl",
          {},
          h("dt", {}, "Feed rate F"),
          h("dd", {}, F.toFixed(4)),
          h("dt", {}, "Kill rate k"),
          h("dd", {}, k.toFixed(4)),
          h("dt", {}, "U (food)"),
          h("dd", {}, f[0]!.toFixed(3)),
          h("dt", {}, "V (pattern)"),
          h("dd", {}, f[1]!.toFixed(3)),
        ),
      );
      const [hx, hy] = this.hover;
      const left = Math.min(hx + 18, this.camera.viewW - 180);
      const top = Math.min(hy + 18, this.camera.viewH - 150);
      p.style.transform = `translate(${left}px, ${top}px)`;
    } catch {
      /* mapping raced a scene change — next sample */
    } finally {
      this.probeBusy = false;
    }
  }

  /**
   * Split the measured GPU frame into solver and render cost. The solver's
   * share adapts the tick cap (the speed the visitor chose is honoured up to
   * what fits the frame budget, and the readout shows what was achieved);
   * the governor only sees the frame cost at 1× speed, so a high speed never
   * costs render quality or grid size.
   */
  adaptToTimings(passes: readonly { name: string; ms: number }[], budgetMs: number): number | null {
    const sim = passes.find((p) => p.name === "sim")?.ms ?? 0;
    const render = passes.filter((p) => p.name !== "sim").reduce((a, p) => a + p.ms, 0);
    const base = this.clock.ticksPerSecond / 60;
    if (this.ticksEma < 0.5 || sim <= 0) return render;
    const perTick = sim / this.ticksEma;
    const fit = Math.floor((budgetMs - render) / perTick);
    this.clock.maxTicksPerFrame = Math.min(32, Math.max(Math.ceil(base), fit));
    return render + perTick * base;
  }

  // ---------------------------------------------------- test hooks --

  /** Run `n` ticks now (with any due edits and director stamps), then wait. */
  async advanceTicks(n: number): Promise<void> {
    while (n > 0) {
      const k = Math.min(64, n);
      const enc = runTicks(k, this.runOptions());
      this.device.queue.submit([enc.finish()]);
      n -= k;
    }
    this.applyPending();
    await this.device.queue.onSubmittedWorkDone();
  }

  /** SHA-256 of the tick-boundary state (U, V) — for replay/undo tests. */
  async stateHash(): Promise<string> {
    const buf = await readBuffer(this.device, this.sim.state, this.sim.stateBytes);
    return sha256hex(buf);
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  // -------------------------------------------------------------- url --

  writeUrl: () => void = () => {};

  dispose(): void {
    this.disposed = true;
  }
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
