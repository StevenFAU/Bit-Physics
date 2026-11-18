// Water in Hand — the live app: the clock, the water (model/water.ts), the
// renderer (render/water-view.ts), the orbit camera, the Drop tool, the
// director, edits and history, and the frame loop.
//
// Drops are edits at step boundaries: a drop at step S moves the S-step
// state's highest particles (as many as the blob holds) to a blob above the
// glass, at rest. The positions are read back at S before the solver steps
// again, so a drop is a pure function of the state and replays byte for
// byte; the director's drops come from the seed and the step count the same
// way. Undo restores the checkpoint before an edit and replays the rest.
//
// Frame loop: up to `maxInFlight` frames on the GPU at once. A callback that
// finds them all in flight makes an empty queue.submit([]) (Firefox/wgpu only
// notices finished work at a submit or on a ~100 ms timer) and returns; the
// time step and the fps readout are taken after that gate, so they count
// frames drawn (web/README.md). The live loop stays off the GPU while the
// gate runs (GateRunner.busy) or a capture is in flight — v1's exclusivity
// guard, kept although the gate has its own buffers.

import type { GpuContext, GpuProfiler, Tier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { OrbitCamera } from "@bp/render";
import type { QualityGovernor } from "@bp/runtime";
import { History, SimClock } from "@bp/runtime";
import type { Studio, ToolSpec } from "@bp/studio";
import { CanvasInput, h, toggle } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import type { Recipe, SolverKind, V3, WaterCheckpoint, WaterKernels } from "./model/water.js";
import { BLOB_RADIUS, FILL, GLASS, Water, blobPositions, directorSpot, highest, recipeFor, restingLevel, seedPositions } from "./model/water.js";

export { directorSpot, restingLevel };
import type { GateRunner } from "./proof/gate.js";
import type { WaterView } from "./render/water-view.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { sceneById } from "./scenes.js";

/**
 * Particles per tier. Measured, then declared (08-sph-water.md, status): a
 * step costs ~0.05 ms per thousand particles on the RX 6800 XT (T3), so the
 * spec's 200k / 80k / 30k targets do not hold 60 fps; T2 and T1 are scaled
 * from T3 by the throughput ratio at equal playback speed (cost ∝ N^(4/3))
 * and are estimates — there is no iGPU or phone on the measurement bench.
 * `?n=` overrides.
 */
export const SIZES: Record<Tier, number> = { T3: 80_000, T2: 24_000, T1: 10_000 };

/** Model seconds per wall second at 1× (slow motion; see 08-sph-water.md, status). */
export const TIME_SCALE: Record<Tier, number> = { T3: 0.18, T2: 0.18, T1: 0.18 };
/** Solver steps per frame at 60 fps for the playback speed, at most (a slow GPU slows the water, not the frame rate). */
export function maxStepsPerFrame(timeScale: number, dt: number): number {
  return Math.max(1, Math.ceil(timeScale / dt / 60) + 1);
}
/** Impostor radius per lattice spacing. */
export const RADIUS_PER_SPACING = 0.85;
/** Model seconds after a drop before another may start (the blob must land first). */
export const DROP_COOLDOWN = 0.45;
/** Height of the blob's centre above the resting water, m. */
export const DROP_HEIGHT = 0.3;
const WARM_UP_MS = 2500;

export interface DropEvent {
  id: number;
  step: number;
  /** Blob centre, x and z (m). */
  at: [number, number];
}

interface Checkpoint {
  water: WaterCheckpoint;
  dropCount: number;
  lastDropStep: number;
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onFrame?: (now: number) => void;
  onDrop?: (e: DropEvent, director: boolean) => void;
}

export class App {
  readonly clock: SimClock;
  readonly camera = new OrbitCamera();
  readonly water: Water;
  scene: SceneDef = sceneById("glass");
  seed = 1;
  hooks: AppHooks = {};
  profiler: GpuProfiler | null = null;
  governor: QualityGovernor | null = null;
  writeUrl: () => void = () => {};
  maxInFlight = 3;
  fps = 0;
  stepsTotal = 0;
  learnOpen = false;
  /** Held off the GPU (a scene load, a replay, a Prove run). */
  busy = false;
  onSnapshot: ((b: Blob) => void) | null = null;
  /** Drops so far this scene (user and director): the director's counter. */
  dropCount = 0;
  lastDropStep = -1e9;
  readonly radius: number;

  private readonly history: History<Checkpoint>;
  private readonly events: DropEvent[] = [];
  private pending: DropEvent | null = null;
  private dropping = false;
  /** Bumped whenever the water's state is replaced; a drop read back under an older one is discarded. */
  private generation = 0;
  private nextEventId = 1;
  private inFlight = 0;
  private last = performance.now();
  private frames = 0;
  private fpsT0 = performance.now();
  private sceneT0 = performance.now();
  private rateT0 = performance.now();
  private rateSteps = 0;
  private stepsPerSecond = 0;
  private snapshotWanted = false;
  private frameNo = 0;
  private disposed = false;
  private hoverOver = false;

  constructor(
    readonly gpu: GpuContext,
    readonly studio: Studio,
    readonly hdr: HdrPipeline,
    readonly view: WaterView,
    readonly kernels: WaterKernels,
    readonly gate: GateRunner,
    readonly tier: Tier,
    readonly size: number = SIZES[tier],
  ) {
    this.water = new Water(gpu.device, kernels, Math.ceil(size * 1.06));
    const r: Recipe = recipeFor(size);
    this.water.recipe = r;
    this.radius = RADIUS_PER_SPACING * r.spacing;
    this.clock = new SimClock(TIME_SCALE[tier] / r.dt, maxStepsPerFrame(TIME_SCALE[tier], r.dt));
    view.setGlass(GLASS, this.radius);
    this.history = new History<Checkpoint>(
      {
        capture: () => ({ water: this.water.capture(), dropCount: this.dropCount, lastDropStep: this.lastDropStep }),
        restore: (c) => this.restoreCheckpoint(c),
        release: (c) => this.water.releaseCheckpoint(c.water),
      },
      5,
    );
    this.history.onChange = () => this.syncHistory();
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera.minDistance = 0.7;
    this.camera.maxDistance = 6;
    this.camera.near = 0.02;
    this.camera.far = 60;
    this.camera.ground = 0.04;
    new CanvasInput(
      studio.canvas,
      this.camera,
      {
        paints: () => false,
        down: () => {},
        move: () => {},
        up: () => {},
        hover: (x, y) => this.hover(x, y),
        tap: (x, y) => this.tap(x, y),
      },
      () => this.studio.rail.active === "camera",
    );
    studio.rail.setTools(this.tools(), "drop");
  }

  // -------------------------------------------------------------- tools --

  private tools(): ToolSpec[] {
    return [
      {
        id: "drop",
        label: "Drop",
        icon: "drop",
        hint: "Click the water to drop a blob of water there. Drag to look around.",
        options: () => this.dropOptions(),
      },
      {
        id: "camera",
        label: "Camera",
        icon: "orbit",
        hint: "Drag to orbit, scroll or pinch to zoom, double-click to reset.",
        options: () => this.cameraOptions(),
      },
    ];
  }

  private dropOptions(): HTMLElement {
    const btn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Drop in the middle");
    btn.addEventListener("click", () => this.requestDrop([0, 0]));
    return h("div", { class: "wh-options" }, h("span", { class: "wh-opt-label" }, "Click the water"), btn);
  }

  private cameraOptions(): HTMLElement {
    const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Reset view");
    reset.addEventListener("click", () => this.camera.fit(1, true));
    const water = toggle("Show the water", this.view.showWater, (on) => {
      this.view.showWater = on;
    });
    return h("div", { class: "wh-options" }, water.el, reset);
  }

  selectTool(id: string): void {
    this.studio.rail.select(id, false);
  }

  /** The blob centre (x, z) under a screen point, or null off the glass. */
  private spotAt(x: number, y: number): [number, number] | null {
    const p = this.view.pickPlane(this.camera, x, y, restingLevel());
    if (!p) return null;
    const r = Math.hypot(p[0], p[2]);
    if (r > GLASS.radius + 0.12) return null;
    const lim = GLASS.radius - BLOB_RADIUS - 0.01;
    const k = r > lim ? lim / r : 1;
    return [p[0] * k, p[2] * k];
  }

  private hover(x: number | null, y: number | null): void {
    const over = x !== null && y !== null && this.studio.rail.active === "drop" && this.spotAt(x, y) !== null;
    this.hoverOver = over;
    this.studio.canvas.style.cursor = over ? "crosshair" : "";
  }

  private tap(x: number, y: number): void {
    if (this.studio.rail.active !== "drop") return;
    const s = this.spotAt(x, y);
    if (!s) {
      this.studio.toast.show("Click the water in the glass to drop a blob there");
      return;
    }
    this.requestDrop(s);
  }

  /** Queue a visitor's drop (an edit at the next step boundary). */
  requestDrop(at: [number, number]): boolean {
    if (this.pending || this.dropping) return false;
    if (this.water.steps - this.lastDropStep < DROP_COOLDOWN / this.water.recipe.dt) {
      this.studio.toast.show("Let the last drop land first");
      return false;
    }
    const e: DropEvent = { id: this.nextEventId++, step: this.water.steps, at: [Number(at[0].toFixed(4)), Number(at[1].toFixed(4))] };
    this.history.beforeEdit(e.id, e.step);
    this.events.push(e);
    this.pending = e;
    return true;
  }

  /** Move the highest particles into a blob above `at`: the drop itself (reads positions at this step). */
  private async applyDrop(at: [number, number]): Promise<void> {
    const w = this.water;
    const generation = this.generation;
    const blob = blobPositions(w.recipe.spacing, [at[0], restingLevel() + DROP_HEIGHT, at[1]]);
    const { pos, orig } = await w.readPositions();
    // the state was replaced (a scene load, a restore) while the positions were read: drop nothing
    if (generation !== this.generation) return;
    const idx = highest(pos, w.n, blob.length / 3, orig);
    const enc = this.gpu.device.createCommandEncoder({ label: "water-drop" });
    w.encodeDrop(enc, idx, blob);
    this.gpu.device.queue.submit([enc.finish()]);
    this.dropCount += 1;
    this.lastDropStep = w.steps;
  }

  /** The step the director drops at next (Infinity when it has none). */
  private directorStep(): number {
    if (this.scene.director <= 0) return Infinity;
    return Math.max(this.lastDropStep, 0) + Math.round(this.scene.director / this.water.recipe.dt);
  }

  // -------------------------------------------------------------- scene --

  async loadScene(id: SceneId, o: { seed?: number } = {}): Promise<void> {
    this.busy = true;
    this.generation += 1;
    try {
      while (this.dropping) await new Promise((r) => setTimeout(r, 10));
      const scene = sceneById(id);
      this.scene = scene;
      if (o.seed !== undefined) this.seed = o.seed;
      this.clock.reset();
      this.events.length = 0;
      this.history.clear();
      this.pending = null;
      this.dropCount = 0;
      this.lastDropStep = -1e9;
      this.seedWater();
      const cw = this.studio.canvas.clientWidth || 1;
      const ch = this.studio.canvas.clientHeight || 1;
      this.camera.setViewport(cw, ch);
      this.camera.setHome({ ...scene.camera, distance: scene.camera.distance * this.fitFactor(cw, ch), target: [0, 0.42, 0] });
      this.sceneT0 = performance.now();
      this.studio.heading.set(scene.title, scene.prompt, scene.eyebrow);
      this.studio.heading.setCurrent(scene.id);
      this.syncHistory();
      this.hdr.resetExposure();
      this.hooks.onSceneChange?.(scene);
      await this.gpu.device.queue.onSubmittedWorkDone();
    } finally {
      this.busy = false;
    }
  }

  /** Fill the glass (and the first blob) for the scene and seed. */
  private seedWater(): void {
    const r = recipeFor(this.size);
    const level = this.scene.blob ? FILL : restingLevel() - GLASS.floor;
    const spot = this.scene.blob ? directorSpot(this.seed, 0) : null;
    const { fill, blob } = seedPositions(r.spacing, level, spot ? [spot[0], restingLevel() + DROP_HEIGHT, spot[1]] : null);
    const all = new Float32Array(fill.length + blob.length);
    all.set(fill, 0);
    all.set(blob, fill.length);
    this.water.seed(all, r);
    if (spot) {
      this.dropCount = 1;
      this.lastDropStep = 0;
    }
  }

  async restart(): Promise<void> {
    await this.loadScene(this.scene.id, { seed: this.seed });
  }

  /** A portrait viewport backs the camera off so the glass keeps its width in view. */
  private fitFactor(w: number, h: number): number {
    return Math.max(1, 0.9 / Math.max(w / Math.max(h, 1), 1e-3));
  }

  // ------------------------------------------------------------- history --

  private restoreCheckpoint(c: Checkpoint): void {
    this.generation += 1;
    this.water.restore(c.water);
    this.dropCount = c.dropCount;
    this.lastDropStep = c.lastDropStep;
    this.pending = null;
  }

  /**
   * Advance the water to step `target` off the frame loop, applying the
   * recorded drops and the director's at their steps (undo's replay, tests).
   */
  async advanceTo(target: number, events: readonly DropEvent[] = this.events): Promise<void> {
    const w = this.water;
    const device = this.gpu.device;
    const queue = events.filter((e) => e.step >= w.steps).sort((a, b) => a.step - b.step || a.id - b.id);
    let i = 0;
    while (w.steps < target || (i < queue.length && queue[i]!.step <= target)) {
      while (i < queue.length && queue[i]!.step <= w.steps) await this.applyDrop(queue[i++]!.at);
      if (w.steps >= this.directorStep()) await this.applyDrop(directorSpot(this.seed, this.dropCount));
      if (w.steps >= target) break;
      const next = Math.min(target, i < queue.length ? queue[i]!.step : Infinity, this.directorStep());
      const k = Math.max(1, Math.min(next - w.steps, 32));
      const enc = device.createCommandEncoder({ label: "water-advance" });
      w.encodeSteps(enc, k);
      device.queue.submit([enc.finish()]);
      this.stepsTotal += k;
      this.clock.advance(k);
      if (this.stepsTotal % 256 < k) await device.queue.onSubmittedWorkDone();
    }
    await device.queue.onSubmittedWorkDone();
  }

  /** Advance n steps off the frame loop (tests, measurements). */
  async advance(n: number): Promise<void> {
    this.busy = true;
    try {
      await this.advanceTo(this.water.steps + n);
    } finally {
      this.busy = false;
    }
  }

  async undo(): Promise<void> {
    const entry = this.history.popUndo();
    if (!entry) {
      this.studio.toast.show("Nothing to undo");
      return;
    }
    const target = this.water.steps;
    this.busy = true;
    try {
      while (this.dropping) await new Promise((r) => setTimeout(r, 10));
      this.restoreCheckpoint(entry.checkpoint);
      const keep = this.events.filter((e) => e.id !== entry.eventId);
      this.events.length = 0;
      this.events.push(...keep);
      await this.advanceTo(target, keep);
      this.history.release(entry.checkpoint);
      this.studio.toast.show("Undone — replayed to the same moment without that drop");
    } finally {
      this.busy = false;
    }
    this.syncHistory();
  }

  savePoint(): void {
    this.history.savePointNow(this.water.steps);
    this.studio.toast.show(`Saved at step ${this.water.steps.toLocaleString()}`);
  }

  restoreSave(): void {
    if (this.history.restoreSave()) {
      this.events.length = 0;
      this.studio.toast.show(`Back to step ${this.water.steps.toLocaleString()}`);
    }
  }

  private syncHistory(): void {
    this.studio.transport.setHistory({ canRestore: this.history.hasSave, canCompare: false, comparing: false, canUndo: this.history.canUndo });
  }

  /** Edits so far, for tests. */
  get eventCount(): number {
    return this.events.length;
  }

  get eventLog(): readonly DropEvent[] {
    return this.events;
  }

  // ------------------------------------------------------------ transport --

  togglePlay(): void {
    this.clock.paused = !this.clock.paused;
    this.studio.transport.setPlaying(!this.clock.paused);
  }

  setSpeed(v: number): void {
    this.clock.speed = v;
    this.studio.transport.setSpeed(v);
    this.writeUrl();
  }

  set solver(kind: SolverKind) {
    this.water.solver = kind;
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
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
    if (isCapturing() || this.gate.busy > 0 || this.busy) return;
    const device = this.gpu.device;
    if (this.inFlight >= this.maxInFlight) {
      device.queue.submit([]);
      return;
    }
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
    if (this.governor && now - this.sceneT0 > WARM_UP_MS) this.governor.sample(dt * 1000, now);

    const rect = this.studio.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.governor?.renderScale ?? 1;
    this.hdr.resize(rect.width, rect.height, dpr, scale);
    if (rect.width > 1 && rect.height > 1 && (rect.width !== this.camera.viewW || rect.height !== this.camera.viewH)) {
      const before = this.camera.viewW > 1 ? this.fitFactor(this.camera.viewW, this.camera.viewH) : 1;
      this.camera.rescale(this.fitFactor(rect.width, rect.height) / before);
    }
    this.camera.setViewport(rect.width, rect.height);
    this.camera.update(dt, now);

    // drops land at the step boundary: the solver waits for the read-back
    let n = 0;
    if (!this.dropping) {
      const w = this.water;
      const directorDue = !this.clock.paused && w.steps >= this.directorStep();
      if (this.pending || directorDue) {
        const at = this.pending ? this.pending.at : directorSpot(this.seed, this.dropCount);
        const user = this.pending;
        this.pending = null;
        this.dropping = true;
        void this.applyDrop(at)
          .then(() => {
            if (user) this.hooks.onDrop?.(user, false);
            else this.hooks.onDrop?.({ id: 0, step: this.water.steps, at }, true);
          })
          .finally(() => {
            this.dropping = false;
          });
      } else {
        n = Math.min(this.clock.due(dt), Math.max(0, this.directorStep() - w.steps));
      }
    }

    this.profiler?.begin(n);
    const enc = device.createCommandEncoder({ label: "water-frame" });
    if (n > 0) this.water.encodeSteps(enc, n, this.profiler?.pass("solver") ?? undefined);
    this.clock.advance(n);
    this.stepsTotal += n;
    const r = this.water.recipe;
    this.view.encode(
      enc,
      this.hdr,
      { camera: this.camera, particles: this.water.buf.pos!, count: this.water.n, radius: this.radius, particleVolume: r.spacing ** 3 },
      this.profiler,
    );
    this.hdr.encode(enc, dt, this.profiler ?? undefined);
    this.frameNo += 1;
    const exposureQueued = this.frameNo % 30 === 0 && this.learnOpen && this.hdr.sampleExposure(enc);
    this.profiler?.end(enc);
    device.queue.submit([enc.finish()]);
    this.profiler?.submitted();
    if (this.snapshotWanted) {
      this.snapshotWanted = false;
      this.studio.canvas.toBlob((b) => b && this.onSnapshot?.(b), "image/png");
    }
    this.inFlight += 1;
    void device.queue.onSubmittedWorkDone().then(() => {
      this.inFlight -= 1;
    });
    if (exposureQueued) void this.hdr.collectExposure();

    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.stepsTotal - this.rateSteps) * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateSteps = this.stepsTotal;
    }
    const t = this.water.time;
    this.studio.transport.setClock(this.clock.paused ? `t ${t.toFixed(2)} s` : `t ${t.toFixed(2)} s · ${Math.round(this.stepsPerSecond)} steps/s`);
    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    this.hooks.onFrame?.(now);
  }

  /** Model seconds per wall second, measured over the last second. */
  get measuredTimeScale(): number {
    return this.stepsPerSecond * this.water.recipe.dt;
  }

  get rate(): number {
    return this.stepsPerSecond;
  }

  get sceneAge(): number {
    return performance.now() - this.sceneT0;
  }

  get hovering(): boolean {
    return this.hoverOver;
  }

  /** Screen position (CSS px) of a world point, or null when behind the eye. */
  screenOf(p: V3): [number, number] | null {
    return this.view.screenOf(this.camera, p);
  }

  dispose(): void {
    this.disposed = true;
  }
}
