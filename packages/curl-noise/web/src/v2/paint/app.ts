// Paint the Stream — the 2D scene's controller: the clock, the model
// (paint/model.ts), the map + particles (paint/view.ts), the Camera2D, the
// Paint and Pan tools, edits and history, and the frame loop. It shares the
// Field Studies shell with the 3D Studio (app.ts); only the active scene runs
// its frame loop and receives canvas input.
//
// Edits are events at step boundaries — a dab of the brush, or a new
// landscape — so undo restores the checkpoint before an edit and replays the
// rest, and a stroke (many dabs) is one undo step.

import type { GpuContext, GpuProfiler, Tier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { Camera2D } from "@bp/render";
import type { QualityGovernor } from "@bp/runtime";
import { History, SimClock } from "@bp/runtime";
import type { Studio, ToolSpec } from "@bp/studio";
import { CanvasInput, h, segmented, slider, toggle } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import type { Dab, PaintCheckpoint, PaintKernels } from "./model.js";
import { LANDSCAPE_AMPLITUDE, MAX_DISPATCHES, Paint, landscapeFor } from "./model.js";
import type { PaintView } from "./view.js";

/** Steps per second at 1× (model time runs with the wall clock at 1×). */
export const PAINT_TICKS = 60;

/** Grid size and particles per tier; a software adapter gets its own (app.ts SOFTWARE). */
export const PAINT_SIZES: Record<Tier, { n: number; count: number }> = {
  T3: { n: 1024, count: 131072 },
  T2: { n: 512, count: 65536 },
  T1: { n: 512, count: 32768 },
};
export const PAINT_SOFTWARE = { n: 256, count: 4096 };

export type Brush = "raise" | "lower" | "smooth";

export interface PaintEvent {
  id: number;
  step: number;
  dab?: Dab;
  /** A new landscape (seed), or flat ground (FLAT_GROUND). */
  landscape?: number;
}

export interface PaintHooks {
  onMap?: () => void;
  onFrame?: (now: number) => void;
}

const WARM_UP_MS = 2500;

export class PaintApp {
  readonly clock = new SimClock(PAINT_TICKS, 4);
  readonly camera = new Camera2D();
  readonly paint: Paint;
  readonly input: CanvasInput;
  active = false;
  busy = false;
  learnOpen = false;
  fps = 0;
  stepsTotal = 0;
  maxInFlight = 3;
  hooks: PaintHooks = {};
  profiler: GpuProfiler | null = null;
  governor: QualityGovernor | null = null;
  writeUrl: () => void = () => {};
  onSnapshot: ((b: Blob) => void) | null = null;
  brush: Brush = "raise";
  /** Brush radius, as a fraction of the map. */
  brushSize = 0.07;
  /** Step at 1×, s (Tune's Speed multiplies it). */
  readonly baseDt = 1 / PAINT_TICKS;
  /** The amplitude the map's colours and contour lines are scaled to (a hill's height). */
  readonly amplitude: number;

  private readonly history: History<PaintCheckpoint>;
  private readonly events: PaintEvent[] = [];
  /** Where the event log stood when each edit's undo checkpoint was taken. */
  private readonly loggedAt = new Map<number, number>();
  private nextEventId = 1;
  private strokeId = 0;
  private pendingDabs: Dab[] = [];
  private pendingLandscape: number | null = null;
  private pointer: { x: number; y: number } | null = null;
  private hover: [number, number] | null = null;
  private inFlight = 0;
  private last = performance.now();
  private frames = 0;
  private fpsT0 = performance.now();
  private sceneT0 = performance.now();
  private lastCamVersion = -1;
  private movingUntil = 0;
  private snapshotWanted = false;
  private rateT0 = performance.now();
  private rateSteps = 0;
  private stepsPerSecond = 0;

  constructor(
    readonly gpu: GpuContext,
    readonly studio: Studio,
    readonly hdr: HdrPipeline,
    readonly view: PaintView,
    kernels: PaintKernels,
    readonly tier: Tier,
    readonly software: boolean,
    size?: { n?: number; count?: number },
  ) {
    const base = software ? PAINT_SOFTWARE : PAINT_SIZES[tier];
    const n = size?.n ?? base.n;
    this.paint = new Paint(gpu.device, kernels, n, size?.count ?? base.count);
    this.amplitude = LANDSCAPE_AMPLITUDE * n * n;
    view.setSource(this.paint.psi, n, this.amplitude);
    this.history = new History<PaintCheckpoint>(
      {
        capture: () => this.paint.capture(),
        restore: (c) => this.paint.restore(c),
        release: (c) => this.paint.releaseCheckpoint(c),
      },
      5,
    );
    this.history.onChange = () => this.syncHistory();
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera.setDomain(n, n, true);
    if (software) this.clock.maxTicksPerFrame = 2;
    this.input = new CanvasInput(
      studio.canvas,
      this.camera,
      {
        paints: () => this.studio.rail.active === "paint",
        down: (x, y) => {
          this.strokeId = this.nextEventId++;
          this.pointer = { x, y };
        },
        move: (x, y) => {
          this.pointer = { x, y };
        },
        up: () => {
          this.pointer = null;
          this.writeUrl();
        },
        hover: (x, y) => {
          this.hover = x === null || y === null ? null : [x, y];
        },
      },
      () => this.studio.rail.active === "pan",
    );
    this.input.enabled = false;
  }

  // -------------------------------------------------------------- tools --

  tools(): ToolSpec[] {
    return [
      {
        id: "paint",
        label: "Paint",
        icon: "brush",
        paints: true,
        hint: "Drag to raise hills or dig valleys in the stream function; the flow follows the new contours at once.",
        options: () => this.paintOptions(),
      },
      { id: "pan", label: "Pan", icon: "hand", hint: "Drag to move around the map, scroll or pinch to zoom. It wraps: the map has no edges." },
    ];
  }

  private paintOptions(): HTMLElement {
    const mode = segmented<Brush>(
      "Brush",
      [
        { value: "raise", label: "Raise" },
        { value: "lower", label: "Lower" },
        { value: "smooth", label: "Smooth" },
      ],
      this.brush,
      (v) => {
        this.brush = v;
      },
    );
    const size = slider({
      label: "Brush size",
      min: 0.02,
      max: 0.2,
      step: 0.005,
      value: this.brushSize,
      format: (v) => `${Math.round(v * 100)}%`,
      onInput: (v) => {
        this.brushSize = v;
      },
    });
    const contours = toggle("Contour lines", this.view.look.contours, (on) => this.setContours(on), "The contour lines of the stream function: the paths the flow takes");
    return h("div", { class: "fs-options" }, mode.el, size.el, contours.el);
  }

  setContours(on: boolean): void {
    this.view.look = { ...this.view.look, contours: on };
  }

  // -------------------------------------------------------------- scene --

  activate(): void {
    this.active = true;
    this.input.enabled = true;
    this.studio.rail.setTools(this.tools(), "paint");
    this.last = performance.now();
    this.fpsT0 = this.last;
    this.syncHistory();
  }

  deactivate(): void {
    this.active = false;
    this.input.enabled = false;
    this.studio.ring.classList.remove("is-shown");
  }

  /** Start the scene: a landscape from `seed` (FLAT_GROUND: flat), particles seeded on it. */
  async load(o: { seed?: number; dt?: number } = {}): Promise<void> {
    this.busy = true;
    try {
      const seed = o.seed ?? this.paint.landscapeSeed;
      this.paint.landscapeSeed = seed;
      this.paint.dt = o.dt ?? this.baseDt;
      this.clock.reset();
      this.events.length = 0;
      this.loggedAt.clear();
      this.history.clear();
      this.pendingDabs = [];
      this.pendingLandscape = null;
      this.view.clearExposure();
      this.paint.load(this.landscapeOf(seed), seed + 2);
      const cw = this.studio.canvas.clientWidth || 1;
      const ch = this.studio.canvas.clientHeight || 1;
      this.camera.setViewport(cw, ch);
      this.camera.fit(1);
      this.sceneT0 = performance.now();
      this.syncHistory();
      this.hooks.onMap?.();
      await this.gpu.device.queue.onSubmittedWorkDone();
    } finally {
      this.busy = false;
    }
  }

  private landscapeOf(seed: number): Float32Array<ArrayBuffer> {
    return landscapeFor(this.paint.n, seed);
  }

  /** A new landscape (or flat ground, FLAT_GROUND) — an edit, undoable. */
  newLandscape(seed: number): void {
    this.pendingLandscape = seed;
  }

  async restart(): Promise<void> {
    await this.load({ seed: this.paint.landscapeSeed, dt: this.paint.dt });
  }

  setSpeed(v: number): void {
    this.clock.speed = v;
    this.studio.transport.setSpeed(v);
    this.writeUrl();
  }

  /** Tune's Speed: the step, as a multiple of the 1× step (an edit only in that it lands at a step boundary). */
  setStep(multiplier: number): void {
    this.paint.dt = this.baseDt * multiplier;
    this.writeUrl();
  }

  togglePlay(): void {
    this.clock.paused = !this.clock.paused;
    this.studio.transport.setPlaying(!this.clock.paused);
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  // ------------------------------------------------------------- events --

  private apply(e: PaintEvent, enc: GPUCommandEncoder, record: boolean): void {
    if (record) {
      if (!this.events.some((x) => x.id === e.id)) {
        this.history.beforeEdit(e.id, e.step);
        this.loggedAt.set(e.id, this.events.length);
      }
      this.events.push(e);
    }
    if (e.landscape !== undefined) {
      this.paint.landscapeSeed = e.landscape;
      this.paint.encodeLandscape(enc, this.landscapeOf(e.landscape));
      if (record) {
        this.hooks.onMap?.();
        this.writeUrl();
      }
    } else if (e.dab) {
      this.paint.encodeDabs(enc, [e.dab]);
    }
  }

  private get device(): GPUDevice {
    return this.gpu.device;
  }

  undo(): void {
    const entry = this.history.popUndo();
    if (!entry) {
      this.studio.toast.show("Nothing to undo");
      return;
    }
    const target = this.paint.steps;
    this.busy = true;
    try {
      this.paint.restore(entry.checkpoint);
      // the checkpoint holds every edit logged before it; replay only those
      // logged after it (in log order), less the undone one
      const at = this.loggedAt.get(entry.eventId) ?? this.events.findIndex((e) => e.id === entry.eventId);
      this.loggedAt.delete(entry.eventId);
      const from = at < 0 ? this.events.length : at;
      const replay = this.events.slice(from).filter((e) => e.id !== entry.eventId);
      this.events.length = from;
      this.events.push(...replay);
      let i = 0;
      while (this.paint.steps < target || i < replay.length) {
        this.paint.begin();
        const enc = this.device.createCommandEncoder({ label: "paint-replay" });
        let used = 0;
        while (i < replay.length && replay[i]!.step <= this.paint.steps && used < MAX_DISPATCHES - 4) {
          const e = replay[i++]!;
          this.apply(e, enc, false);
          used += 2;
          if (e.landscape !== undefined) break; // one landscape per encoder (its data is staged)
        }
        const next = Math.min(target - this.paint.steps, 32, i < replay.length ? replay[i]!.step - this.paint.steps : 32);
        if (next > 0) this.paint.encodeSteps(enc, next);
        this.device.queue.submit([enc.finish()]);
        if (next <= 0 && i < replay.length && replay[i]!.step > this.paint.steps) break;
      }
      this.history.release(entry.checkpoint);
      this.view.clearExposure();
      this.hooks.onMap?.();
      this.writeUrl();
      this.studio.toast.show("Undone — replayed to the same moment without that edit");
    } finally {
      this.busy = false;
    }
    this.syncHistory();
  }

  savePoint(): void {
    this.history.savePointNow(this.paint.steps);
    this.studio.toast.show(`Saved at ${this.paint.time.toFixed(1)} s`);
  }

  restoreSave(): void {
    if (this.history.restoreSave()) {
      this.events.length = 0;
      this.loggedAt.clear();
      this.view.clearExposure();
      this.hooks.onMap?.();
      this.writeUrl();
      this.studio.toast.show(`Back to ${this.paint.time.toFixed(1)} s`);
    }
  }

  private syncHistory(): void {
    if (!this.active) return;
    this.studio.transport.setHistory({ canRestore: this.history.hasSave, canCompare: false, comparing: false, canUndo: this.history.canUndo });
  }

  /** Edits so far (distinct strokes / landscapes), for tests. */
  get eventCount(): number {
    return new Set(this.events.map((e) => e.id)).size;
  }

  // -------------------------------------------------------------- frame --

  start(): void {
    const frame = (now: number): void => {
      requestAnimationFrame(frame);
      this.tick(now);
    };
    requestAnimationFrame(frame);
  }

  /** A dab under the pointer this frame (hold to keep painting). */
  private dabAt(sx: number, sy: number, dtSec: number): Dab {
    const [x, y] = this.camera.screenToDomain(sx, sy);
    const n = this.paint.n;
    const radius = this.brushSize * n;
    const dt = Math.min(dtSec, 0.05);
    if (this.brush === "smooth") return { x: x - n * Math.floor(x / n), y: y - n * Math.floor(y / n), radius, amount: Math.min(1, 6 * dt), mode: "smooth" };
    // a hill rises to about the landscape's own height in a second of painting
    const amount = (this.brush === "raise" ? 1 : -1) * 1.1 * this.amplitude * dt;
    return { x: x - n * Math.floor(x / n), y: y - n * Math.floor(y / n), radius, amount, mode: "raise" };
  }

  private tick(now: number): void {
    if (!this.active || isCapturing() || this.busy) return;
    const device = this.device;
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
    const scale = (this.governor?.renderScale ?? 1) * (this.software ? 0.5 : 1);
    this.hdr.resize(rect.width, rect.height, dpr, scale);
    this.camera.setViewport(rect.width, rect.height);
    const moving = this.camera.update(dt, now);
    // one copy of the map at most: never zoom out past covering the view
    const cover = this.camera.coverZoom();
    if (this.camera.pxPerUnit < cover) this.camera.set({ ...this.camera.state(), pxPerUnit: cover });
    if (this.camera.version !== this.lastCamVersion) {
      if (moving) this.movingUntil = now + 120;
      this.lastCamVersion = this.camera.version;
    }

    this.paint.begin();
    const enc = device.createCommandEncoder({ label: "paint-frame" });
    // edits land at the step boundary
    if (this.pendingLandscape !== null) {
      const seed = this.pendingLandscape;
      this.pendingLandscape = null;
      this.apply({ id: this.nextEventId++, step: this.paint.steps, landscape: seed }, enc, true);
    }
    // hold to keep painting (also while paused: the flow waits)
    if (this.pointer && this.studio.rail.active === "paint") this.pendingDabs.push(this.dabAt(this.pointer.x, this.pointer.y, dt));
    for (const d of this.pendingDabs.splice(0, 8)) this.apply({ id: this.strokeId, step: this.paint.steps, dab: d }, enc, true);

    const n = this.clock.due(dt);
    this.profiler?.begin(n);
    if (n > 0) this.paint.encodeSteps(enc, n, this.profiler?.pass("sim") ?? undefined);
    this.clock.advance(n);
    this.stepsTotal += n;
    this.view.encode(
      enc,
      this.hdr,
      { camera: this.camera, pixelScale: dpr * scale, parts: this.paint.parts, count: this.paint.count, n: this.paint.n, dtSec: dt, moving: now < this.movingUntil },
      this.profiler,
    );
    this.hdr.encode(enc, dt, this.profiler ?? undefined);
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
    this.updateRing();
    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.stepsTotal - this.rateSteps) * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateSteps = this.stepsTotal;
    }
    this.studio.transport.setClock(this.clock.paused ? `${this.paint.time.toFixed(1)} s` : `${this.paint.time.toFixed(1)} s · ${Math.round(this.stepsPerSecond)} steps/s`);
    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    this.hooks.onFrame?.(now);
  }

  private updateRing(): void {
    const ring = this.studio.ring;
    if (this.studio.rail.active !== "paint" || !this.hover) {
      ring.classList.remove("is-shown");
      return;
    }
    const r = this.brushSize * this.paint.n * this.camera.pxPerUnit;
    ring.style.width = `${r * 2}px`;
    ring.style.height = `${r * 2}px`;
    ring.style.transform = `translate(${this.hover[0] - r}px, ${this.hover[1] - r}px)`;
    ring.classList.add("is-shown");
  }

  /** Advance n steps off the frame loop (tests). */
  async advance(n: number): Promise<void> {
    let done = 0;
    while (done < n) {
      const k = Math.min(n - done, 32);
      this.paint.begin();
      const enc = this.device.createCommandEncoder({ label: "paint-advance" });
      this.paint.encodeSteps(enc, k);
      this.device.queue.submit([enc.finish()]);
      done += k;
      this.stepsTotal += k;
      this.clock.advance(k);
    }
    await this.device.queue.onSubmittedWorkDone();
  }

  /** Paint one dab now, as an edit (tests). */
  dab(d: Dab, strokeId = this.nextEventId++): void {
    this.paint.begin();
    const enc = this.device.createCommandEncoder({ label: "paint-dab" });
    this.apply({ id: strokeId, step: this.paint.steps, dab: d }, enc, true);
    this.device.queue.submit([enc.finish()]);
  }
}
