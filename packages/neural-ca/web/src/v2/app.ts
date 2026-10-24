// Grow — the app controller. Wires the Field Studies shell, the render core
// and the runtime around the live dish: scenes, the Look / Cut / Seed / Probe
// tools, edits as step-stamped events (undo = restore + replay), save /
// restore / A-B, the scene director, the instruments, and the frame loop.
//
// The frame loop records ONE command encoder per frame: any edits due at this
// step boundary, the dish's steps, background jobs from the FrameScheduler in
// what is left of the GPU budget, then the render. The gate path
// (proof/gate.ts) is reachable only from the Prove drawer and the capture
// button, and the loop yields entirely while a capture runs.

import type { GpuContext, GpuProfiler, PassTiming, Tier } from "@bp/gpu";
import { ReadbackSlot } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { Camera2D } from "@bp/render";
import type { Checkpointer, Json, QualityGovernor, SimEvent } from "@bp/runtime";
import { EventLog, History, SimClock } from "@bp/runtime";
import type { CameraLike, Studio, ToolHandlers, ToolSpec } from "@bp/studio";
import { CanvasInput, h, slider } from "@bp/studio";
import { isCapturing, sha256hex } from "@bp/verify";
import type { LiveCheckpoint, LiveKernels, LiveStats, Stamp } from "./model/live.js";
import { LiveNca, MAX_STEPS_PER_ENCODE } from "./model/live.js";
import type { HiddenBasis } from "./model/pca.js";
import { hiddenBasis } from "./model/pca.js";
import type { Checkpoint } from "./proof/gate.js";
import { CANONICAL_SEED, CN, FIRE_RATE, GRID } from "./proof/gate.js";
import type { DishView, ViewMode } from "./render/dish-view.js";
import type { FrameScheduler } from "./runtime/scheduler.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";

/** Solver steps per second at 1× — growth from one cell takes ~3 s. */
export const TICKS_PER_SECOND = 30;
/** Undo replays at most this many steps; further back is a plain restore. */
const REPLAY_CAP = 8000;
const STATS_EVERY_MS = 200;
/** Dish radius in grid widths: the 64 × 64 grid sits inside the glass with room to spare. */
const DISH_RADIUS = 0.74;
/** The profiler pass name of the dish's steps (and its scheduler cost). */
export const STEP_PASS = "nca";

export interface SceneOptions {
  seed?: number;
  fireRate?: number;
  view?: ViewMode;
  camera?: { cx: number; cy: number; zoom: number };
  /** The director's regrow: fade the new dish in. */
  fadeIn?: boolean;
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onEdited?: () => void;
  onStats?: (s: LiveStats) => void;
  onBasis?: (b: HiddenBasis | null) => void;
  onFrame?: (now: number) => void;
}

interface AppCheckpoint {
  cp: LiveCheckpoint;
  logIndex: number;
}

type CutPayload = { g: number; r: number; pts: number[] };
type SeedPayload = { g: number; pts: number[] };
type FirePayload = { g: number; p: number };

export class App {
  readonly gpu: GpuContext;
  readonly device: GPUDevice;
  readonly studio: Studio;
  readonly hdr: HdrPipeline;
  readonly view: DishView;
  readonly kernels: LiveKernels;
  readonly ck: Checkpoint;
  readonly scheduler: FrameScheduler;
  readonly camera = new Camera2D();
  readonly clock = new SimClock(TICKS_PER_SECOND, 16);
  readonly history: History<AppCheckpoint>;
  readonly log = new EventLog();
  readonly input: CanvasInput;
  tier: Tier;
  sim!: LiveNca;
  scene: SceneDef = SCENES[0]!;
  seed = CANONICAL_SEED;
  /** Edit groups (cuts, seeds, rate changes) since the scene started. */
  edits = 0;
  stepsTotal = 0;
  hooks: AppHooks = {};
  learnOpen = false;
  governor: QualityGovernor | null = null;
  profiler: GpuProfiler | null = null;
  onSnapshot: ((b: Blob) => void) | null = null;
  writeUrl: () => void = () => {};
  lastStats: LiveStats | null = null;
  basis: HiddenBasis | null = null;
  /** Grid origin in the camera's domain, and the dish radius (cells). */
  origin: [number, number] = [0, 0];
  dishRadius = GRID * DISH_RADIUS;

  private applied = 0;
  private group = 0;
  private activeGroup = 0;
  private busy = false;
  private inFlight = false;
  private disposed = false;
  private last = performance.now();
  private frames = 0;
  private fpsT0 = performance.now();
  private fps = 0;
  private ticksEma = 0;
  private rateT0 = performance.now();
  private rateTick0 = 0;
  private stepsPerSecond = 0;
  private lastStepAt = performance.now();
  private hover: [number, number] | null = null;
  private stroke: [number, number] | null = null;
  private pendingCut: number[] = [];
  private pendingSeeds: number[] = [];
  private cutRadius = 4;
  private probeDue = 0;
  private probeBusy = false;
  private readonly probeBuf: GPUBuffer;
  private readonly statsSlot: ReadbackSlot;
  private statsDue = 0;
  private basisBusy = false;
  private snapshotWanted = false;
  private comparingPlaying = true;
  private compareKey = 0;
  private sceneT0 = performance.now();
  private loadSeq = 0;
  private viewport: [number, number] = [0, 0];
  /** Scene director: fading out (+1) towards a regrow, or back in (−1). */
  private directing = 0;
  private fade = 1;
  private deadSince = 0;

  constructor(
    gpu: GpuContext,
    studio: Studio,
    hdr: HdrPipeline,
    view: DishView,
    kernels: LiveKernels,
    ck: Checkpoint,
    scheduler: FrameScheduler,
    tier: Tier,
  ) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.studio = studio;
    this.hdr = hdr;
    this.view = view;
    this.kernels = kernels;
    this.ck = ck;
    this.scheduler = scheduler;
    this.tier = tier;
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera.maxPxPerUnit = 44;
    this.camera.margin = 0.3;
    this.probeBuf = this.device.createBuffer({ size: CN * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "grow-probe" });
    this.statsSlot = new ReadbackSlot(this.device, 16, "grow-stats");
    const cp: Checkpointer<AppCheckpoint> = {
      capture: () => ({ cp: this.sim.checkpoint(), logIndex: this.log.length }),
      restore: (c) => {
        this.sim.restore(c.cp);
        this.log.truncate(c.logIndex);
        this.applied = c.logIndex;
        this.view.snap();
      },
      release: (c) => this.sim.release(c.cp),
    };
    this.history = new History(cp, 8);
    this.history.onChange = () => this.syncTransport();
    const cam: CameraLike = {
      panBy: (dx, dy) => this.camera.panBy(dx, dy),
      zoomAt: (f, x, y) => this.camera.zoomAt(f, x, y),
      fling: (vx, vy) => this.camera.fling(vx, vy),
      stop: () => this.camera.stop(),
      fit: (zoom, animate) => this.camera.fit(zoom, animate),
    };
    this.input = new CanvasInput(studio.canvas, cam, this.toolHandlers(), () => this.studio.rail.active === "pan");
  }

  // ------------------------------------------------------------ framing --

  /**
   * The camera's domain is the viewport at the fitted zoom, with the 64 × 64
   * grid in its middle: fit = the whole glass dish just inside the shorter
   * side, so the organism is large at any aspect and nothing is letterboxed.
   */
  private reframe(w: number, h: number): void {
    const z = this.camera.pxPerUnit / Math.max(this.camera.coverZoom(), 1e-6);
    const rel: [number, number] = [(this.camera.cx - this.origin[0]) / GRID, (this.camera.cy - this.origin[1]) / GRID];
    const fit = Math.min(w, h) / (2 * this.dishRadius + 3);
    const dw = w / fit;
    const dh = h / fit;
    this.origin = [(dw - GRID) / 2, (dh - GRID) / 2];
    this.camera.setViewport(w, h);
    this.camera.setDomain(dw, dh, false);
    if (this.viewport[0] === 0) {
      this.camera.fit(1);
    } else {
      this.camera.set({ cx: this.origin[0] + rel[0] * GRID, cy: this.origin[1] + rel[1] * GRID, pxPerUnit: this.camera.coverZoom() * z });
    }
    this.viewport = [w, h];
  }

  /** Domain point → grid cell coordinates (continuous). */
  private toGrid(x: number, y: number): [number, number] {
    const [dx, dy] = this.camera.screenToDomain(x, y);
    return [dx - this.origin[0], dy - this.origin[1]];
  }

  // ------------------------------------------------------------ scenes --

  async loadScene(id: SceneId, o: SceneOptions = {}): Promise<void> {
    const scene = sceneById(id);
    this.loadSeq += 1;
    this.busy = true;
    try {
      this.history.clear();
      this.view.split = null;
      this.log.clear();
      this.applied = 0;
      this.group = 0;
      this.activeGroup = 0;
      this.edits = 0;
      this.stroke = null;
      this.pendingCut = [];
      this.pendingSeeds = [];
      const old = this.sim as LiveNca | undefined;
      this.seed = o.seed ?? CANONICAL_SEED;
      const sim = new LiveNca(this.device, this.kernels, this.ck, { grid: GRID, seed: this.seed, fireRate: o.fireRate ?? FIRE_RATE });
      sim.load(scene.start(this.seed));
      this.sim = sim;
      old?.destroy();
      this.view.forgetBuffers();
      this.view.snap();
      if (o.view) this.view.mode = o.view;
      const sceneChanged = this.scene.id !== scene.id;
      this.scene = scene;
      if (sceneChanged || !this.basis) this.setBasis(null);
      this.directing = o.fadeIn ? -1 : 0;
      this.fade = o.fadeIn ? 0 : 1;
      this.deadSince = 0;
      this.lastStats = null;
      this.clock.reset();
      this.sceneT0 = performance.now();
      const rect = this.studio.canvas.getBoundingClientRect();
      this.viewport = [0, 0];
      this.reframe(rect.width, rect.height);
      if (o.camera) {
        this.camera.set({
          cx: this.origin[0] + o.camera.cx * GRID,
          cy: this.origin[1] + o.camera.cy * GRID,
          pxPerUnit: this.camera.coverZoom() * o.camera.zoom,
        });
      }
      this.hdr.resetExposure();
      this.studio.rail.setTools(["pan", "cut", "seed", "probe"].map((t) => this.toolSpec(t)), "cut");
      this.studio.root.dataset["tool"] = "cut";
      this.studio.heading.setCurrent(scene.id);
      this.studio.heading.set(scene.title, scene.prompt);
      this.setCallouts();
      this.governor?.acknowledgeRestart();
      this.syncTransport();
      this.hooks.onSceneChange?.(scene);
    } finally {
      this.busy = false;
    }
  }

  /** Restart the current scene from its start (same seed, current update chance, view kept). */
  async restart(): Promise<void> {
    await this.loadScene(this.scene.id, { seed: this.seed, fireRate: this.sim.fireRate, view: this.view.mode });
  }

  /** The canonical start, mask seed 42, rate 0.5 and no edits: the gated run (up to its 1000 steps). */
  get onGatedRun(): boolean {
    return (
      this.scene.kind === "canonical" &&
      this.seed === CANONICAL_SEED &&
      this.sim.fireRate === FIRE_RATE &&
      this.edits === 0 &&
      this.log.length === 0
    );
  }

  private setBasis(b: HiddenBasis | null): void {
    this.basis = b;
    this.view.setBasis(b);
    this.hooks.onBasis?.(b);
  }

  setView(m: ViewMode): void {
    this.view.mode = m;
    this.writeUrl();
  }

  // ------------------------------------------------------------- edits --

  private beginEdit(): number {
    this.group += 1;
    this.history.beforeEdit(this.group, this.sim.tick);
    this.edits += 1;
    this.hooks.onEdited?.();
    return this.group;
  }

  /** Update chance (Tune). A drag is one undoable edit. */
  setFireRate(p: number, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change the update chance")) return;
    if (phase === "start" || this.activeGroup === 0) this.activeGroup = this.beginEdit();
    const all = this.log.all();
    const lastE = all[all.length - 1];
    const lp = lastE?.payload as FirePayload | undefined;
    // a drag (or a key press: input, then change) coalesces into one event per
    // step boundary — applied or still pending, only its last value matters
    if (lastE && lastE.kind === "fire" && lastE.tick === this.sim.tick && lp?.g === this.activeGroup) {
      (lastE as SimEvent).payload = { g: this.activeGroup, p } satisfies FirePayload as never;
    } else {
      this.log.push(this.sim.tick, "fire", { g: this.activeGroup, p } satisfies FirePayload as never);
    }
    // The rate only affects steps recorded from now on, and the event sits at
    // this step boundary, so applying it now is the same as at the next frame
    // (which sets the same value again). Applying it before onEdited lets Tune
    // re-sync to the new rate instead of snapping the slider back to the old one.
    this.sim.fireRate = p;
    if (phase === "end") {
      this.activeGroup = 0;
      this.writeUrl();
    }
    this.hooks.onEdited?.();
  }

  /** Apply logged events due at the current step boundary into `enc`. */
  private applyDue(enc: GPUCommandEncoder): void {
    const all = this.log.all();
    while (this.applied < all.length && all[this.applied]!.tick <= this.sim.tick) {
      this.applyEvent(enc, all[this.applied]!);
      this.applied += 1;
    }
  }

  private applyEvent(enc: GPUCommandEncoder, e: SimEvent): void {
    if (e.kind === "cut") {
      const p = e.payload as CutPayload;
      this.sim.encodeStamp(enc, { mode: "cut", radius: p.r, pts: p.pts });
    } else if (e.kind === "seed") {
      const p = e.payload as SeedPayload;
      this.sim.encodeStamp(enc, { mode: "seed", radius: 0, pts: p.pts });
    } else if (e.kind === "fire") {
      this.sim.fireRate = (e.payload as FirePayload).p;
    }
  }

  /** Turn this frame's pointer input into logged events at the current boundary. */
  private flushInput(): void {
    // a cut is a polyline of ≥ 2 points; while the stroke goes on, its last
    // point stays behind as the start of the next frame's piece
    if (this.pendingCut.length >= 4) {
      this.log.push(this.sim.tick, "cut", { g: this.activeGroup, r: this.cutRadius, pts: this.pendingCut } satisfies CutPayload as unknown as Json);
      const n = this.pendingCut.length;
      this.pendingCut = this.stroke ? [this.pendingCut[n - 2]!, this.pendingCut[n - 1]!] : [];
    }
    if (this.pendingSeeds.length >= 2) {
      this.log.push(this.sim.tick, "seed", { g: this.activeGroup, pts: this.pendingSeeds } satisfies SeedPayload as unknown as Json);
      this.pendingSeeds = [];
    }
  }

  /** Cut programmatically (tests, the acceptance script): a stroke through grid points. */
  cutAt(pts: number[], radius = this.cutRadius): void {
    if (this.blocked("cut")) return;
    const g = this.beginEdit();
    this.log.push(this.sim.tick, "cut", { g, r: radius, pts } satisfies CutPayload as unknown as Json);
    this.applyPendingNow();
  }

  seedAt(x: number, y: number): void {
    if (this.blocked("plant")) return;
    const g = this.beginEdit();
    this.log.push(this.sim.tick, "seed", { g, pts: [x, y] } satisfies SeedPayload as unknown as Json);
    this.applyPendingNow();
  }

  /** Apply due events immediately (between frames). */
  private applyPendingNow(): void {
    if (this.applied >= this.log.length) return;
    const enc = this.device.createCommandEncoder({ label: "grow-edit" });
    this.applyDue(enc);
    this.device.queue.submit([enc.finish()]);
    this.view.snap();
  }

  async undo(): Promise<void> {
    if (this.busy || isCapturing()) return;
    if (this.history.comparing) this.toggleCompare();
    const entry = this.history.popUndo();
    if (!entry) {
      this.studio.toast.show("Nothing to undo");
      return;
    }
    this.busy = true;
    try {
      const target = this.sim.tick;
      const snap = entry.checkpoint;
      const kept = this.log.all().filter((e, i) => i < snap.logIndex || (e.payload as { g?: number }).g !== entry.eventId);
      this.sim.restore(snap.cp);
      this.log.load(kept);
      this.applied = snap.logIndex;
      const span = target - snap.cp.tick;
      if (span > REPLAY_CAP) {
        this.log.truncate(snap.logIndex);
        this.studio.toast.show("Restored the moment before that edit (too far back to replay the rest)");
      } else {
        if (span > 600) this.studio.toast.show("Undoing — replaying everything since…");
        await this.replayTo(target);
      }
      this.history.release(snap);
      this.edits = Math.max(0, this.edits - 1);
      this.view.snap();
      this.hooks.onEdited?.();
      this.writeUrl();
    } finally {
      this.busy = false;
      this.syncTransport();
    }
  }

  /** Step from the current tick to `target`, applying logged events at their boundaries. */
  private async replayTo(target: number): Promise<void> {
    let chunks = 0;
    while (this.sim.tick < target) {
      const enc = this.device.createCommandEncoder({ label: "grow-replay" });
      this.applyDue(enc);
      const nextEvent = this.log.all()[this.applied]?.tick ?? Infinity;
      const k = Math.min(MAX_STEPS_PER_ENCODE, target - this.sim.tick, Math.max(1, nextEvent - this.sim.tick));
      this.sim.encodeSteps(enc, k);
      this.device.queue.submit([enc.finish()]);
      chunks += 1;
      if (chunks % 8 === 0) await this.device.queue.onSubmittedWorkDone();
    }
    const enc = this.device.createCommandEncoder({ label: "grow-replay" });
    this.applyDue(enc);
    this.device.queue.submit([enc.finish()]);
    await this.device.queue.onSubmittedWorkDone();
  }

  // ------------------------------------------------------------ history --

  savePoint(): void {
    if (this.blocked("save")) return;
    this.flushPendingEdits();
    this.history.savePointNow(this.sim.tick);
    this.compareKey += 1;
    this.studio.toast.show(`Saved at step ${this.sim.tick.toLocaleString()}`);
  }

  private flushPendingEdits(): void {
    this.applyPendingNow();
  }

  restoreSave(): void {
    if (this.busy || isCapturing()) return;
    if (this.history.comparing) this.toggleCompare();
    if (this.history.restoreSave()) {
      this.studio.toast.show("Restored the save point");
      this.hooks.onEdited?.();
    }
  }

  toggleCompare(): void {
    if (!this.history.hasSave || this.busy) return;
    const on = !this.history.comparing;
    this.history.comparing = on;
    if (on) {
      this.comparingPlaying = !this.clock.paused;
      this.clock.paused = true;
      this.view.split = 0.5;
      this.studio.toast.show("A · save point on the left, B · now on the right — move across the dish to wipe");
    } else {
      this.view.split = null;
      this.clock.paused = !this.comparingPlaying;
    }
    this.syncTransport();
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
      this.studio.toast.show("Compare is on — press C to go back");
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
    switch (id) {
      case "cut":
        return {
          id,
          label: "Cut",
          icon: "erase",
          hint: "Drag across the organism to cut it",
          paints: true,
          options: () =>
            slider({
              label: "Cut width",
              min: 1,
              max: 12,
              step: 1,
              value: this.cutRadius,
              unit: " cells",
              onInput: (v) => {
                this.cutRadius = v;
                this.updateRing();
              },
            }).el,
        };
      case "seed":
        return { id, label: "Seed", icon: "seed", hint: "Tap to plant a seed cell — drag to plant a row of them", paints: true };
      case "probe":
        return { id, label: "Probe", icon: "probe", hint: "Point at a cell to read its 16 numbers" };
      default:
        return { id: "pan", label: "Look", icon: "hand", hint: "Drag to pan · scroll or pinch to zoom · double-click to fit" };
    }
  }

  selectTool(id: string): void {
    this.studio.root.dataset["tool"] = id;
    if (id !== "probe") this.studio.probe.hidden = true;
    this.updateRing();
  }

  /** [ / ] — scale the cut width. */
  scaleBrush(factor: number): void {
    if (this.studio.rail.active !== "cut") return;
    this.cutRadius = Math.min(12, Math.max(1, Math.round(this.cutRadius * factor + (factor > 1 ? 0.5 : -0.5))));
    this.updateRing();
    this.studio.rail.select("cut", false);
    this.studio.toast.show(`Cut width ${this.cutRadius} cells`, 1200);
  }

  private updateRing(): void {
    const t = this.studio.rail.activeTool;
    const ring = this.studio.ring;
    if (!t?.paints || !this.hover || this.history.comparing) {
      ring.classList.remove("is-shown");
      return;
    }
    const r = (t.id === "cut" ? this.cutRadius : 0.7) * this.camera.pxPerUnit;
    ring.style.width = `${r * 2}px`;
    ring.style.height = `${r * 2}px`;
    ring.style.transform = `translate(${this.hover[0] - r}px, ${this.hover[1] - r}px)`;
    ring.classList.add("is-shown");
  }

  private toolHandlers(): ToolHandlers {
    const plant = (gx: number, gy: number): void => {
      const x = Math.floor(gx);
      const y = Math.floor(gy);
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
      this.pendingSeeds.push(x + 0.5, y + 0.5);
    };
    return {
      paints: () => {
        const a = this.studio.rail.active;
        return a === "cut" || a === "seed";
      },
      down: (x, y) => {
        if (this.blocked(this.studio.rail.active === "cut" ? "cut" : "plant")) return;
        this.activeGroup = this.beginEdit();
        const [gx, gy] = this.toGrid(x, y);
        this.stroke = [gx, gy];
        if (this.studio.rail.active === "cut") this.pendingCut = [gx, gy, gx, gy];
        else plant(gx, gy);
      },
      move: (x, y) => {
        this.hover = [x, y];
        this.updateRing();
        if (!this.stroke || this.activeGroup === 0) return;
        const [gx, gy] = this.toGrid(x, y);
        if (this.studio.rail.active === "cut") {
          if (this.pendingCut.length === 0) this.pendingCut.push(this.stroke[0], this.stroke[1]);
          if (Math.hypot(gx - this.stroke[0], gy - this.stroke[1]) < 0.25) return;
          this.pendingCut.push(gx, gy);
          this.stroke = [gx, gy];
        } else if (Math.hypot(gx - this.stroke[0], gy - this.stroke[1]) >= 6) {
          plant(gx, gy);
          this.stroke = [gx, gy];
        }
      },
      up: () => {
        this.stroke = null;
        if (this.pendingCut.length === 2) this.pendingCut = []; // only the joint left over: nothing new
        // the frame loop flushes what is pending at the next boundary; the group ends there
        if (this.pendingCut.length === 0 && this.pendingSeeds.length === 0) this.activeGroup = 0;
        else this.endGroupAfterFlush = true;
      },
      hover: (x, y) => {
        this.hover = x === null || y === null ? null : [x, y];
        this.updateRing();
        if (this.history.comparing && x !== null) {
          this.view.split = Math.min(Math.max(x / Math.max(this.camera.viewW, 1), 0), 1);
        }
      },
      tap: (x, y) => {
        if (this.studio.rail.active === "probe") {
          this.hover = [x, y];
          this.probeDue = 0;
        }
      },
    };
  }

  private endGroupAfterFlush = false;

  private setCallouts(): void {
    const s = this.scene;
    const text = s.kind === "canonical" ? "One living cell — the seed" : "Seed cells, scattered";
    this.studio.callouts.set([
      {
        id: `intro-${s.id}`,
        text,
        style: "pin",
        anchor: () => this.camera.domainToScreen(this.origin[0] + GRID / 2, this.origin[1] + GRID / 2 - 3),
        when: () => performance.now() - this.sceneT0 > 300 && performance.now() - this.sceneT0 < 2600,
      },
      {
        id: `cut-${s.id}`,
        text: "Drag across it to cut",
        style: "pin",
        anchor: () => this.camera.domainToScreen(this.origin[0] + GRID / 2, this.origin[1] + GRID * 0.12),
        when: () => this.edits === 0 && performance.now() - this.sceneT0 > 6500 && performance.now() - this.sceneT0 < 12500,
      },
    ]);
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
    const rect = this.studio.canvas.getBoundingClientRect();
    if (rect.width !== this.viewport[0] || rect.height !== this.viewport[1]) this.reframe(rect.width, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.governor?.renderScale ?? 1;
    this.hdr.resize(rect.width, rect.height, dpr, scale);
    this.camera.update(dt, now);
    this.direct(dt);

    this.profiler?.begin();
    const enc = this.device.createCommandEncoder({ label: "grow-frame" });
    // edits due at this boundary
    this.flushInput();
    const before = this.sim.version;
    this.applyDue(enc);
    if (this.sim.version !== before) this.view.snap();
    if (this.endGroupAfterFlush && this.pendingCut.length === 0 && this.pendingSeeds.length === 0) {
      this.endGroupAfterFlush = false;
      if (!this.stroke) this.activeGroup = 0;
    }
    // the dish's steps, capped by their measured cost within the frame budget
    const due = this.history.comparing ? 0 : this.clock.due(dt);
    const cap = this.scheduler.unitsFor(STEP_PASS, this.scheduler.budgetMs, Math.min(due, 1), 16);
    const n = Math.min(due, cap);
    this.ticksEma += (n - this.ticksEma) * 0.1;
    // steps stop at the next logged event so it lands on its own boundary
    const nextEvent = this.log.all()[this.applied]?.tick ?? Infinity;
    const k = Math.min(n, Math.max(0, nextEvent - this.sim.tick));
    if (k > 0) {
      this.sim.encodeSteps(enc, k, this.profiler?.pass(STEP_PASS));
      this.scheduler.noteUnits(STEP_PASS, k);
      this.lastStepAt = now;
    } else {
      this.scheduler.noteUnits(STEP_PASS, 0);
    }
    this.clock.advance(k);
    this.stepsTotal += k;
    // background jobs (Prove's live run now; Teach's training in M2) in what is left
    this.scheduler.encodeJobs(enc, k * this.scheduler.costOf(STEP_PASS), (name) => this.profiler?.pass(name));

    // instruments: a 16-byte reduction a few times a second
    let statsRecorded = false;
    if (now > this.statsDue && !this.statsSlot.pending) {
      this.sim.encodeStats(enc);
      statsRecorded = this.statsSlot.record(enc, this.sim.statsOut);
      this.statsDue = now + STATS_EVERY_MS;
    }
    // probe: one cell's 16 values
    let probeIdx = -1;
    if (this.hover && this.studio.rail.active === "probe" && now > this.probeDue && !this.probeBusy) {
      const [gx, gy] = this.toGrid(this.hover[0], this.hover[1]);
      const x = Math.floor(gx);
      const y = Math.floor(gy);
      if (x >= 0 && y >= 0 && x < GRID && y < GRID) {
        probeIdx = y * GRID + x;
        enc.copyBufferToBuffer(this.sim.state, probeIdx * CN * 4, this.probeBuf, 0, CN * 4);
        this.probeBusy = true;
        this.probeDue = now + 80;
      } else {
        this.studio.probe.hidden = true;
      }
    }

    const save = this.history.comparing ? this.history.savePoint : null;
    const stepMs = 1000 / (TICKS_PER_SECOND * this.clock.speed);
    const blend = this.clock.paused || stepMs < 17 ? 1 : Math.min(1, (now - this.lastStepAt) / stepMs);
    this.view.encode(
      enc,
      this.hdr.sceneView,
      this.hdr.width,
      this.hdr.height,
      this.camera,
      dpr * scale,
      { buffer: this.sim.state, grid: GRID, version: this.sim.version },
      { origin: this.origin, radius: this.dishRadius, blend, fade: this.fade, time: now / 1000 },
      save ? { buffer: save.cp.state, key: `cp-${this.compareKey}` } : null,
      this.profiler ?? undefined,
    );
    this.hdr.encode(enc, dt, this.profiler ?? undefined);
    this.profiler?.end(enc);
    this.device.queue.submit([enc.finish()]);
    this.profiler?.submitted();
    this.scheduler.afterSubmit();
    if (this.snapshotWanted) {
      this.snapshotWanted = false;
      this.studio.canvas.toBlob((b) => b && this.onSnapshot?.(b), "image/png");
    }
    this.inFlight = true;
    void this.device.queue.onSubmittedWorkDone().then(() => {
      this.inFlight = false;
    });
    if (statsRecorded) void this.collectStats();
    if (probeIdx >= 0) void this.readProbe(probeIdx);
    else if (!this.hover) this.studio.probe.hidden = true;
    if (!this.basis && !this.basisBusy && this.sim.tick >= 160) void this.measureBasis();

    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.stepsTotal - this.rateTick0) * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateTick0 = this.stepsTotal;
    }
    const steps = this.sim.tick;
    this.studio.transport.setClock(
      this.clock.paused ? `step ${steps.toLocaleString()}` : `step ${steps.toLocaleString()} · ${Math.round(this.stepsPerSecond).toLocaleString()}/s`,
    );
    this.hooks.onFrame?.(now);
  }

  /**
   * The scene director: an untouched, playing dish grows again from its start
   * after a while (a fade out and in); a dish with nothing alive left gets a
   * new start. Any edit, a save point or a pause holds the current dish —
   * except when nothing is alive, which nothing can come back from.
   */
  private direct(dt: number): void {
    const FADE_S = 0.8;
    if (this.directing === 0) {
      const dead = this.lastStats !== null && this.lastStats.alive === 0 && this.sim.tick > 40;
      if (dead) {
        if (this.deadSince === 0) this.deadSince = performance.now();
      } else {
        this.deadSince = 0;
      }
      const deadLong = this.deadSince > 0 && performance.now() - this.deadSince > 1500 && !this.clock.paused;
      const untouched = this.edits === 0 && !this.clock.paused && !this.history.hasSave && this.sim.tick >= this.scene.regrowEvery;
      if (!deadLong && !untouched) return;
      if (deadLong) this.studio.toast.show("Nothing is alive any more — growing a new one");
      this.directing = 1;
    }
    if (this.directing === 1) {
      this.fade = Math.max(0, this.fade - dt / FADE_S);
      if (this.fade === 0) {
        const keepCamera = this.camera.state();
        void this.loadScene(this.scene.id, { seed: this.seed, fireRate: this.sim.fireRate, view: this.view.mode, fadeIn: true }).then(() => {
          this.camera.set(keepCamera);
          this.writeUrl();
        });
      }
    } else if (this.directing === -1) {
      this.fade = Math.min(1, this.fade + dt / FADE_S);
      if (this.fade === 1) this.directing = 0;
    }
  }

  private async collectStats(): Promise<void> {
    const ab = await this.statsSlot.collect();
    if (!ab) return;
    this.lastStats = LiveNca.parseStats(ab);
    this.hooks.onStats?.(this.lastStats);
  }

  private async measureBasis(): Promise<void> {
    this.basisBusy = true;
    const sim = this.sim;
    try {
      const st = await sim.readState();
      if (sim !== this.sim) return;
      const b = hiddenBasis(st, GRID * GRID, CN);
      if (b) this.setBasis(b);
    } finally {
      this.basisBusy = false;
    }
  }

  private async readProbe(idx: number): Promise<void> {
    try {
      await this.probeBuf.mapAsync(GPUMapMode.READ);
      const v = new Float32Array(this.probeBuf.getMappedRange().slice(0));
      this.probeBuf.unmap();
      if (!this.hover) return;
      const x = idx % GRID;
      const y = Math.floor(idx / GRID);
      const p = this.studio.probe;
      p.hidden = false;
      p.innerHTML = "";
      const a = v[3]!;
      const alive = a > 0.1;
      const bars = h("div", { class: "gr-probe-bars", "aria-hidden": "true" });
      for (let c = 4; c < CN; c += 1) {
        const t = Math.tanh(v[c]! * 0.8);
        bars.append(h("span", { style: `height:${(Math.abs(t) * 100).toFixed(0)}%;${t < 0 ? "opacity:.45" : ""}` }));
      }
      p.append(
        h("strong", {}, `Cell ${x}, ${y}${alive ? "" : " · not alive"}`),
        h(
          "dl",
          {},
          h("dt", {}, "Colour (r g b)"),
          h("dd", {}, `${v[0]!.toFixed(2)} ${v[1]!.toFixed(2)} ${v[2]!.toFixed(2)}`),
          h("dt", {}, "Opacity"),
          h("dd", {}, a.toFixed(3)),
        ),
        h("p", { class: "gr-probe-cap" }, "12 hidden channels"),
        bars,
      );
      const [hx, hy] = this.hover;
      const left = Math.min(hx + 18, this.camera.viewW - 200);
      const top = Math.min(hy + 18, this.camera.viewH - 170);
      p.style.transform = `translate(${left}px, ${top}px)`;
    } catch {
      /* mapping raced a scene change — next sample */
    } finally {
      this.probeBusy = false;
    }
  }

  /**
   * Split the measured GPU frame into the dish's steps, background jobs and
   * the render. The step cost teaches the scheduler; the governor sees the
   * frame at 1× speed with no background job, so speeding up or running a
   * proof never costs render quality.
   */
  adaptToTimings(passes: readonly PassTiming[]): number | null {
    let render = 0;
    for (const p of passes) {
      if (p.name === STEP_PASS || this.scheduler.queued.includes(p.name)) this.scheduler.observe(p.name, p.ms);
      else render += p.ms;
    }
    const perStep = this.scheduler.costOf(STEP_PASS);
    return render + perStep * (TICKS_PER_SECOND / 60);
  }

  // ---------------------------------------------------- test hooks --

  /** Run `n` steps now (applying logged events), then wait. */
  async advance(n: number): Promise<void> {
    await this.replayTo(this.sim.tick + n);
  }

  /** SHA-256 of the current state (all 16 channels). */
  async stateHash(): Promise<string> {
    return sha256hex(await this.sim.readState());
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  dispose(): void {
    this.disposed = true;
  }
}

export type { Stamp };
