// Chaos — the live app: the clock, the model (model/ensemble.ts), the
// renderer (render/chaos-view.ts), the orbit camera, the tools, history and
// the frame loop.
//
// Frame loop: up to `maxInFlight` frames on the GPU at once. A callback that
// finds them all in flight makes an empty queue.submit([]) (Firefox/wgpu only
// notices finished work at a submit or on a ~100 ms timer) and returns; the
// time step and the fps readout are taken after that gate, so they count
// frames drawn (web/README.md).

import type { GpuContext, GpuProfiler, Tier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { OrbitCamera } from "@bp/render";
import type { QualityGovernor } from "@bp/runtime";
import { History, SimClock } from "@bp/runtime";
import type { Studio, ToolSpec } from "@bp/studio";
import { CanvasInput, h, segmented, slider, toggle } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import { pow10 } from "./format.js";
import { memberAttr } from "./model/ball.js";
import type { ChaosCheckpoint, ChaosKernels, SpreadSample } from "./model/ensemble.js";
import { Chaos, MAX_STEPS, TRACK } from "./model/ensemble.js";
import type { LorenzParams, V3 } from "./model/lorenz.js";
import { DT, Reference, field, fixedPoints, pickOnAttractor, sampleAttractor, spreadOf } from "./model/lorenz.js";
import type { LyapunovEstimate } from "./model/lyapunov.js";
import { LyapunovEstimator } from "./model/lyapunov.js";
import type { ChaosView } from "./render/chaos-view.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { DIGITS_MAX, DIGITS_MIN, epsOf, sceneById } from "./scenes.js";

/** Solver steps per second at 1× (Δt = 0.01: 2.4 time units per second). */
export const TICKS_PER_SECOND = 240;

/** Ensemble and density sizes per tier (05-strange-attractors.md, performance targets). */
export const SIZES: Record<Tier, { ensemble: number; density: number }> = {
  T3: { ensemble: 1 << 20, density: 1 << 19 },
  T2: { ensemble: 1 << 18, density: 1 << 17 },
  T1: { ensemble: 1 << 16, density: 1 << 16 },
};

/** The spread at which predictability is called lost: this fraction of the attractor's RMS size. */
export const HORIZON_FRACTION = 0.5;

const WARM_UP_MS = 2500;
/** Width / height of the framed attractor: narrower viewports back the camera off to keep it in view. */
const FIT_ASPECT = 1.3;

interface ChaosEvent {
  id: number;
  step: number;
  kind: "release" | "params";
  centre?: V3;
  digits?: number;
  seed?: number;
  params?: LorenzParams;
}

interface Checkpoint extends ChaosCheckpoint {
  ghost: { a: V3; b: V3; on: boolean };
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onParams?: (p: LorenzParams) => void;
  onRelease?: (eps: number, threshold: number) => void;
  onSpread?: (s: SpreadSample) => void;
  onHorizon?: (t: number | null) => void;
  /** The live f64 Lyapunov estimate, about twice a second. */
  onLyapunov?: (e: LyapunovEstimate) => void;
  onFrame?: (now: number) => void;
}

/** Steps the live Lyapunov estimator takes per frame (half a time unit), and where it stops. */
const LYAP_STEPS_PER_FRAME = 50;
const LYAP_MAX_T = 20000;

export class App {
  readonly clock = new SimClock(TICKS_PER_SECOND, MAX_STEPS);
  readonly camera = new OrbitCamera();
  readonly chaos: Chaos;
  scene: SceneDef = sceneById("butterfly");
  hooks: AppHooks = {};
  profiler: GpuProfiler | null = null;
  governor: QualityGovernor | null = null;
  writeUrl: () => void = () => {};
  maxInFlight = 3;
  seed = 1;
  /** Precision of the next release, digits (ball radius 10^−digits). */
  digits = 6;
  /** Ghost offset, digits. */
  ghostDigits = 6;
  follow = false;
  fps = 0;
  stepsTotal = 0;
  /** The current ball's measured horizon (null until it is reached). */
  horizonT: number | null = null;
  lastSpread: SpreadSample | null = null;
  learnOpen = false;
  /** Where the next "Release again" drops a ball. */
  releasePoint: V3 = [0, 0, 0];
  /** Precision (digits) of the ball on screen. */
  ballDigits = 6;
  /**
   * λ₁…λ₃ measured as you watch: Benettin's method in f64 on its own
   * trajectory, half a time unit per frame, restarted when σ, ρ, β change.
   */
  lyap: LyapunovEstimator = new LyapunovEstimator({ sigma: 10, rho: 28, beta: 8 / 3 }, [1, 1, 1], DT, 10, 20, 25);
  private lyapReported = 0;

  private readonly history: History<Checkpoint>;
  private readonly events: ChaosEvent[] = [];
  private nextEventId = 1;
  private attractorSample = new Float64Array(0);
  private attractorRms = 1;
  private pendingParams: LorenzParams | null = null;
  private autoReleaseAt = Infinity;
  private inFlight = 0;
  private last = performance.now();
  private frames = 0;
  private fpsT0 = performance.now();
  private sceneT0 = performance.now();
  private frameNo = 0;
  private rateT0 = performance.now();
  private rateSteps = 0;
  private stepsPerSecond = 0;
  private disposed = false;
  busy = false;
  private ghostA: Reference | null = null;
  private ghostB: Reference | null = null;
  private lastCamVersion = -1;
  private cameraMovingUntil = 0;
  private snapshotWanted = false;
  onSnapshot: ((b: Blob) => void) | null = null;
  private spreadPrev: SpreadSample | null = null;
  readonly turntableSpeed: () => number;

  constructor(
    readonly gpu: GpuContext,
    readonly studio: Studio,
    readonly hdr: HdrPipeline,
    readonly view: ChaosView,
    kernels: ChaosKernels,
    readonly tier: Tier,
  ) {
    const size = SIZES[tier];
    this.chaos = new Chaos(gpu.device, kernels, size.ensemble, size.density, this.scene.params);
    this.history = new History<Checkpoint>(
      {
        capture: () => ({ ...this.chaos.capture(), ghost: this.ghostState() }),
        restore: (c) => {
          this.chaos.restore(c);
          this.setGhostState(c.ghost);
          this.afterRestore();
        },
        release: (c) => this.chaos.releaseCheckpoint(c),
      },
      4,
    );
    this.history.onChange = () => this.syncHistory();
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.turntableSpeed = () => (this.camera.reducedMotion ? 0 : this.scene.turntable);
    this.camera.minDistance = 0.6;
    this.camera.maxDistance = 9;
    this.camera.near = 0.02;
    this.camera.far = 50;
    new CanvasInput(
      studio.canvas,
      this.camera,
      {
        paints: () => false,
        down: () => {},
        move: () => {},
        up: () => {},
        hover: () => {},
        tap: (x, y) => this.tap(x, y),
      },
      () => false,
    );
    studio.rail.setTools(this.tools(), "release");
  }

  // -------------------------------------------------------------- tools --

  private tools(): ToolSpec[] {
    return [
      {
        id: "release",
        label: "Release",
        icon: "release",
        hint: "Click on the attractor to release a ball of starts there. Drag to turn the view.",
        options: () => this.releaseOptions(),
      },
      {
        id: "ghost",
        label: "Ghost",
        icon: "ghost",
        hint: "Click on the attractor: two paths start there, a hair apart.",
        options: () => this.ghostOptions(),
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

  private releaseOptions(): HTMLElement {
    const fmt = (d: number): string => `${d} digits · ${pow10(-d)} wide`;
    const s = slider({
      label: "Precision",
      min: DIGITS_MIN,
      max: DIGITS_MAX,
      step: 1,
      value: this.digits,
      format: (v) => fmt(v),
      onInput: (v) => {
        this.digits = Math.round(v);
      },
      onCommit: () => this.writeUrl(),
    });
    const again = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Release again");
    again.addEventListener("click", () => this.requestRelease(this.releasePoint));
    return h("div", { class: "cx-options" }, s.el, again);
  }

  private ghostOptions(): HTMLElement {
    const seg = segmented(
      "Ghost offset",
      [
        { value: "3", label: "10⁻³" },
        { value: "6", label: "10⁻⁶" },
        { value: "9", label: "10⁻⁹" },
      ],
      String(this.ghostDigits) as "3" | "6" | "9",
      (v) => {
        this.ghostDigits = Number(v);
      },
    );
    const clear = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Clear");
    clear.addEventListener("click", () => this.clearGhost());
    return h("div", { class: "cx-options" }, h("span", { class: "cx-opt-label" }, "Offset"), seg.el, clear);
  }

  private cameraOptions(): HTMLElement {
    const turn = toggle("Turntable", this.camera.autoRotate !== 0, (on) => {
      this.camera.autoRotate = on ? this.turntableSpeed() : 0;
    });
    const follow = toggle("Follow the ball", this.follow, (on) => {
      this.follow = on;
      if (!on) this.camera.flyTo({ ...this.camera.state(), target: [0, 0, 0] }, 700);
      this.writeUrl();
    });
    const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Reset view");
    reset.addEventListener("click", () => this.camera.fit(1, true));
    return h("div", { class: "cx-options" }, turn.el, follow.el, reset);
  }

  selectTool(id: string): void {
    this.studio.rail.select(id, false);
  }

  private tap(sx: number, sy: number): void {
    const tool = this.studio.rail.active;
    if (tool === "camera") return;
    const ray = this.view.modelRay(this.camera, sx, sy);
    const tol = this.view.unitsPerPx(this.camera) * 14;
    const p = pickOnAttractor(this.attractorSample, ray.origin, ray.dir, tol);
    if (!p) {
      this.studio.toast.show("Click on the attractor itself to start there");
      return;
    }
    if (tool === "ghost") this.startGhost(p);
    else this.requestRelease(p);
  }

  // -------------------------------------------------------------- scene --

  async loadScene(id: SceneId, o: { params?: LorenzParams; digits?: number; seed?: number; speed?: number } = {}): Promise<void> {
    this.busy = true;
    try {
      const scene = sceneById(id);
      this.scene = scene;
      this.seed = o.seed ?? this.seed;
      this.digits = o.digits ?? scene.digits;
      this.chaos.params = { ...(o.params ?? scene.params) };
      this.chaos.steps = 0;
      this.chaos.released = false;
      this.clock.reset();
      this.events.length = 0;
      this.history.clear();
      this.horizonT = null;
      this.lastSpread = null;
      this.spreadPrev = null;
      this.clearGhost();
      this.view.tracks.clear();
      this.measureAttractor(true);
      this.restartLyapunov();
      this.setSpeed(o.speed ?? scene.speed);
      this.chaos.seedDensity(this.seed);
      this.releasePoint = this.pointAlong(scene.releaseAfter);
      this.autoReleaseAt = performance.now() + scene.releaseDelay * 1000;
      this.view.clearExposure();
      const cw = this.studio.canvas.clientWidth || 1;
      const ch = this.studio.canvas.clientHeight || 1;
      this.camera.setViewport(cw, ch);
      const fitK = Math.max(1, FIT_ASPECT / Math.max(cw / ch, 1e-3));
      this.camera.setHome({ ...scene.camera, distance: scene.camera.distance * fitK, target: [0, 0, 0] });
      this.camera.autoRotate = this.turntableSpeed();
      this.sceneT0 = performance.now();
      this.studio.heading.set(scene.title, scene.prompt, scene.eyebrow);
      this.studio.heading.setCurrent(scene.id);
      this.syncHistory();
      this.hooks.onSceneChange?.(scene);
      this.hooks.onParams?.(this.chaos.params);
      await this.gpu.device.queue.onSubmittedWorkDone();
    } finally {
      this.busy = false;
    }
  }

  async restart(): Promise<void> {
    await this.loadScene(this.scene.id, { params: this.chaos.params, digits: this.digits, seed: this.seed, speed: this.clock.speed });
  }

  /** The attractor sample (picking), its size (framing, horizon) and its speed range (colour). */
  private measureAttractor(snap: boolean): void {
    const p = this.chaos.params;
    this.attractorSample = sampleAttractor(p, 12000, 2, 1500);
    const sp = spreadOf(this.attractorSample);
    this.attractorRms = Math.max(sp.rms, 1e-3);
    this.view.frame(sp.mean, this.attractorRms, snap);
    // the density palette tops out at the 95th percentile of the speed along the attractor
    const speeds: number[] = [];
    for (let i = 0; i < this.attractorSample.length; i += 30) {
      const v = field(p, [this.attractorSample[i]!, this.attractorSample[i + 1]!, this.attractorSample[i + 2]!]);
      speeds.push(Math.hypot(...v));
    }
    speeds.sort((a, b) => a - b);
    this.chaos.speedScale = Math.max(speeds[Math.floor(speeds.length * 0.95)] ?? 1, 1e-3);
    this.view.setFixedPoints(fixedPoints(p));
  }

  /** A point `steps` RK4 steps along the attractor from (1, 1, 1). */
  private pointAlong(steps: number): V3 {
    const r = new Reference([1, 1, 1]);
    for (let i = 0; i < steps; i += 1) r.step(this.chaos.params, DT);
    return [...r.x];
  }

  get attractorSize(): number {
    return this.attractorRms;
  }

  get horizonThreshold(): number {
    return HORIZON_FRACTION * this.attractorRms;
  }

  // ------------------------------------------------------------- events --

  /** Release a ball at `centre` at the next step boundary (an edit: undoable). */
  requestRelease(centre: V3): void {
    this.applyEvent({ id: this.nextEventId++, step: this.chaos.steps, kind: "release", centre: [...centre], digits: this.digits, seed: this.seed + this.events.length });
  }

  /** Change σ, ρ, β (an edit: undoable). Coalesced to one change per frame. */
  setParams(p: LorenzParams): void {
    this.pendingParams = { ...p };
  }

  private applyEvent(e: ChaosEvent, record = true): void {
    if (record) {
      this.history.beforeEdit(e.id, e.step);
      this.events.push(e);
    }
    const enc = this.gpu.device.createCommandEncoder({ label: "chaos-event" });
    if (e.kind === "release") {
      this.chaos.release(enc, e.centre!, epsOf(e.digits!), e.seed!);
      this.ballDigits = e.digits!;
      this.releasePoint = [...e.centre!];
      this.autoReleaseAt = Infinity;
      this.horizonT = null;
      this.lastSpread = null;
      this.spreadPrev = null;
      this.view.tracks.clear();
      this.view.setTrackColors(Array.from({ length: TRACK }, (_, i) => memberAttr(e.seed!, i, this.chaos.axis)));
      if (record) {
        this.hooks.onRelease?.(epsOf(e.digits!), this.horizonThreshold);
        this.hooks.onHorizon?.(null);
      }
    } else if (e.kind === "params") {
      this.chaos.params = { ...e.params! };
      this.measureAttractor(false);
      this.restartLyapunov();
      if (record) this.hooks.onParams?.(this.chaos.params);
    }
    this.gpu.device.queue.submit([enc.finish()]);
    if (record) this.writeUrl();
  }

  undo(): void {
    const entry = this.history.popUndo();
    if (!entry) {
      this.studio.toast.show("Nothing to undo");
      return;
    }
    const target = this.chaos.steps;
    this.busy = true;
    try {
      // restore the state before the undone edit, then replay the rest up to now
      this.restoreEntry(entry.checkpoint);
      const keep = this.events.filter((e) => e.id !== entry.eventId);
      this.events.length = 0;
      this.events.push(...keep);
      const replay = keep.filter((e) => e.step >= entry.tick).sort((a, b) => a.step - b.step);
      let i = 0;
      while (this.chaos.steps < target) {
        while (i < replay.length && replay[i]!.step <= this.chaos.steps) this.applyEvent(replay[i++]!, false);
        const next = Math.min(target - this.chaos.steps, MAX_STEPS, i < replay.length ? replay[i]!.step - this.chaos.steps : MAX_STEPS);
        const enc = this.gpu.device.createCommandEncoder({ label: "chaos-replay" });
        this.chaos.encodeSteps(enc, Math.max(1, next));
        this.stepGhost(Math.max(1, next));
        this.gpu.device.queue.submit([enc.finish()]);
      }
      while (i < replay.length) this.applyEvent(replay[i++]!, false);
      this.history.release(entry.checkpoint);
      this.view.tracks.clear();
      this.horizonT = null;
      if (this.chaos.released) this.hooks.onRelease?.(this.chaos.eps, this.horizonThreshold);
      this.hooks.onHorizon?.(null);
      this.hooks.onParams?.(this.chaos.params);
      this.studio.toast.show("Undone — replayed to the same moment without that edit");
    } finally {
      this.busy = false;
    }
    this.syncHistory();
  }

  private restoreEntry(c: Checkpoint): void {
    this.chaos.restore(c);
    this.setGhostState(c.ghost);
    this.afterRestore();
  }

  private afterRestore(): void {
    this.measureAttractor(false);
    this.view.clearExposure();
    this.view.tracks.clear();
    this.lastSpread = null;
    this.spreadPrev = null;
    this.hooks.onParams?.(this.chaos.params);
  }

  savePoint(): void {
    this.history.savePointNow(this.chaos.steps);
    this.studio.toast.show(`Saved at t = ${this.chaos.t.toFixed(2)}`);
  }

  restoreSave(): void {
    if (this.history.restoreSave()) {
      this.events.length = 0;
      this.studio.toast.show(`Back to t = ${this.chaos.t.toFixed(2)}`);
    }
  }

  toggleCompare(): void {
    if (!this.history.hasSave) return;
    this.history.comparing = !this.history.comparing;
    this.syncHistory();
    this.studio.toast.show(this.history.comparing ? "Showing the save point's ball in cyan" : "Compare off");
  }

  private syncHistory(): void {
    this.studio.transport.setHistory({
      canRestore: this.history.hasSave,
      canCompare: this.history.hasSave,
      comparing: this.history.comparing,
      canUndo: this.history.canUndo,
    });
  }

  // -------------------------------------------------------------- ghost --

  private startGhost(p: V3): void {
    const d = 10 ** -this.ghostDigits;
    this.ghostA = new Reference(p);
    this.ghostB = new Reference([p[0] + d, p[1], p[2]]);
    this.view.ghost.clear();
    this.view.ghost.setColors(new Float32Array([1.0, 0.93, 0.82, 0.9, 1.0, 0.55, 0.16, 0.9]));
    this.studio.toast.show(`Two paths, 10⁻${this.ghostDigits} apart in x`);
  }

  clearGhost(): void {
    this.ghostA = null;
    this.ghostB = null;
    this.view.ghost.clear();
  }

  /** How far apart the ghost pair is (null when off). */
  get ghostSeparation(): number | null {
    if (!this.ghostA || !this.ghostB) return null;
    const a = this.ghostA.x;
    const b = this.ghostB.x;
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  private ghostState(): Checkpoint["ghost"] {
    return { a: this.ghostA ? [...this.ghostA.x] : [0, 0, 0], b: this.ghostB ? [...this.ghostB.x] : [0, 0, 0], on: !!this.ghostA };
  }

  private setGhostState(g: Checkpoint["ghost"]): void {
    this.view.ghost.clear();
    if (!g.on) {
      this.ghostA = null;
      this.ghostB = null;
      return;
    }
    this.ghostA = new Reference(g.a);
    this.ghostB = new Reference(g.b);
  }

  private stepGhost(n: number, push = false): void {
    if (!this.ghostA || !this.ghostB || n <= 0) return;
    const rows = new Float32Array(n * 8);
    for (let k = 0; k < n; k += 1) {
      this.ghostA.step(this.chaos.params, DT);
      this.ghostB.step(this.chaos.params, DT);
      rows.set([...this.ghostA.x, 0, ...this.ghostB.x, 0], k * 8);
    }
    if (push) this.view.ghost.pushCpu(rows);
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

  /**
   * How many ensemble members to draw, and the ball's footprint in px²:
   * enough members to fill the footprint about 400 deep (expected-overlap
   * normalisation — more would only stack splats onto the same pixels, where
   * rgba16float stops resolving their increments).
   */
  private ballFootprint(scale: number): { count: number; area: number } {
    const n = this.chaos.ensemble.n;
    const s = this.lastSpread?.spread ?? this.chaos.eps;
    const rPx = (s / this.view.unitsPerPx(this.camera)) * scale;
    // a thread early on, a cloud later: a conservative footprint in px²
    const area = Math.max(12 * rPx + 3, 0.3 * rPx * rPx);
    return { count: Math.min(n, Math.max(4096, Math.round(400 * area))), area };
  }

  private tick(now: number): void {
    if (isCapturing() || this.busy) return;
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
    // keep the attractor fitted across the width too: a portrait viewport backs the camera off
    const fit = (w: number, h: number): number => Math.max(1, FIT_ASPECT / Math.max(w / Math.max(h, 1), 1e-3));
    if (rect.width > 1 && rect.height > 1 && (rect.width !== this.camera.viewW || rect.height !== this.camera.viewH)) {
      const before = this.camera.viewW > 1 ? fit(this.camera.viewW, this.camera.viewH) : 1;
      this.camera.rescale(fit(rect.width, rect.height) / before);
    }
    this.camera.setViewport(rect.width, rect.height);
    this.camera.followTarget = this.follow && this.chaos.released ? this.view.toWorld(this.lastSpread?.centre ?? this.chaos.ref.x) : null;
    const moving = this.camera.update(dt, now);
    if (this.camera.version !== this.lastCamVersion) {
      // the turntable alone is slow enough for the long exposure; gestures are not
      if (moving && this.camera.autoRotate === 0) this.cameraMovingUntil = now + 120;
      this.lastCamVersion = this.camera.version;
    }
    this.frameNo += 1;

    // edits land at the step boundary
    if (this.pendingParams) {
      const p = this.pendingParams;
      this.pendingParams = null;
      const c = this.chaos.params;
      if (p.sigma !== c.sigma || p.rho !== c.rho || p.beta !== c.beta) {
        this.applyEvent({ id: this.nextEventId++, step: this.chaos.steps, kind: "params", params: p });
      }
    }
    if (now >= this.autoReleaseAt && !this.clock.paused) {
      this.autoReleaseAt = Infinity;
      this.requestRelease(this.releasePoint);
    }

    const n = this.clock.due(dt);
    this.profiler?.begin(n);
    const enc = device.createCommandEncoder({ label: "chaos-frame" });
    this.chaos.encodeSteps(enc, n, n > 0 ? this.profiler?.pass("sim") : undefined);
    this.clock.advance(n);
    this.stepsTotal += n;
    this.stepGhost(n, true);
    if (this.lyap.averagingT < LYAP_MAX_T && !this.clock.paused) {
      this.lyap.step(LYAP_STEPS_PER_FRAME);
      if (now - this.lyapReported > 500) {
        this.lyapReported = now;
        this.hooks.onLyapunov?.(this.lyap.estimate());
      }
    }
    if (n > 0 && this.chaos.released) {
      this.view.tracks.pushGpu(enc, this.chaos.trail, { rows: n, stride: TRACK, origins: this.chaos.stepOrigins });
    }
    let spreadQueued = false;
    spreadQueued = this.chaos.takeSpreadReadback(enc);

    const save = this.history.comparing ? this.history.savePoint : null;
    const ball = this.chaos.released ? this.ballFootprint(dpr * scale) : { count: 0, area: 1 };
    const sampleExposure = this.frameNo % 30 === 0 && this.learnOpen;
    this.view.encode(
      enc,
      this.hdr,
      {
        camera: this.camera,
        dtSec: dt,
        cameraMoving: now < this.cameraMovingUntil,
        density: this.chaos.density,
        ensemble: this.chaos.released ? this.chaos.ensemble : null,
        drawCount: ball.count,
        ballArea: ball.area,
        origin: this.chaos.ref.x,
        prevOrigin: n > 0 ? this.chaos.prevRef : this.chaos.ref.x,
        steps: n,
        compare: save && save.released ? { state: save.ensemble.state, n: save.ensemble.n, origin: save.ref } : null,
      },
      this.profiler,
    );
    this.hdr.encode(enc, dt, this.profiler ?? undefined);
    const exposureQueued = sampleExposure && this.hdr.sampleExposure(enc);
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
    if (spreadQueued) void this.chaos.collectSpread().then((list) => list.forEach((s) => this.onSpread(s)));
    if (exposureQueued) void this.hdr.collectExposure();

    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.stepsTotal - this.rateSteps) * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateSteps = this.stepsTotal;
    }
    const t = this.chaos.t;
    this.studio.transport.setClock(this.clock.paused ? `t ${t.toFixed(2)}` : `t ${t.toFixed(2)} · ${Math.round(this.stepsPerSecond)} steps/s`);
    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    this.hooks.onFrame?.(now);
  }

  private onSpread(s: SpreadSample): void {
    // a reading of an earlier ball (its readback was in flight at the release) is stale
    if (s.ball !== this.chaos.ball) return;
    this.lastSpread = s;
    this.hooks.onSpread?.(s);
    const thr = this.horizonThreshold;
    const prev = this.spreadPrev;
    this.spreadPrev = s;
    if (this.horizonT === null && s.spread >= thr) {
      // interpolate the crossing in log-spread between the last two samples
      let t = s.t;
      if (prev && prev.spread > 0 && prev.spread < thr && s.t > prev.t) {
        const a = Math.log(prev.spread);
        const b = Math.log(s.spread);
        t = prev.t + ((Math.log(thr) - a) / (b - a)) * (s.t - prev.t);
      }
      this.horizonT = t;
      this.hooks.onHorizon?.(t);
    }
  }

  /**
   * Advance n steps off the frame loop (tests, measurements): the same
   * kernels, the same per-step origins and the same spread samples (every
   * SPREAD_STEPS steps after a release), in chunks of MAX_STEPS. Each sample
   * goes to `onSample`; returns when done, or when onSample returns true.
   */
  async advance(n: number, o: { onSample?: (s: SpreadSample) => boolean | void } = {}): Promise<void> {
    const device = this.gpu.device;
    let done = 0;
    let stop = false;
    const drain = async (): Promise<void> => {
      for (const sample of await this.chaos.collectSpread()) {
        if (stop) break;
        this.onSpread(sample);
        if (o.onSample?.(sample)) stop = true;
      }
    };
    while (done < n && !stop) {
      const k = Math.min(n - done, MAX_STEPS);
      const enc = device.createCommandEncoder({ label: "chaos-advance" });
      this.chaos.encodeSteps(enc, k);
      this.stepGhost(k, true);
      if (this.chaos.released) this.view.tracks.pushGpu(enc, this.chaos.trail, { rows: k, stride: TRACK, origins: this.chaos.stepOrigins });
      // only a caller that reads samples takes them (an untaken readback would hold the slot forever)
      const queued = o.onSample ? this.chaos.takeSpreadReadback(enc) : false;
      device.queue.submit([enc.finish()]);
      done += k;
      this.stepsTotal += k;
      this.clock.advance(k);
      if (queued && o.onSample) await drain();
      // a readback from the live loop holds the slot: yield so it can land, or no sample ever would
      else if (o.onSample && this.chaos.spreadReadbackBusy) await device.queue.onSubmittedWorkDone();
    }
    // the samples still on the GPU (a live readback held the slot)
    if (o.onSample && !stop) {
      const enc = device.createCommandEncoder({ label: "chaos-advance-drain" });
      if (this.chaos.takeSpreadReadback(enc)) {
        device.queue.submit([enc.finish()]);
        await drain();
      }
    }
    await device.queue.onSubmittedWorkDone();
  }

  /**
   * Release a ball of 10^−digits at `centre` and run it until it has spread
   * over half the attractor (or `maxT` time units): the predictability horizon.
   * Holds the live loop while it runs.
   */
  async measureHorizon(digits: number, centre: V3 = this.releasePoint, maxT = 60): Promise<{ horizon: number | null; series: [number, number][] }> {
    const wasBusy = this.busy;
    this.busy = true;
    try {
      const prev = this.digits;
      this.digits = digits;
      this.requestRelease(centre);
      this.digits = prev;
      const series: [number, number][] = [];
      await this.advance(Math.round(maxT / this.chaos.dt), {
        onSample: (s) => {
          series.push([s.t, s.spread]);
          return this.horizonT !== null;
        },
      });
      return { horizon: this.horizonT, series };
    } finally {
      this.busy = wasBusy;
    }
  }

  /** Start the live Lyapunov estimate afresh for the current σ, ρ, β. */
  restartLyapunov(): void {
    this.lyap = new LyapunovEstimator({ ...this.chaos.params }, [1, 1, 1], DT, 10, 20, 25);
    this.lyapReported = 0;
  }

  /** Edits so far (release / params events), for tests. */
  get eventCount(): number {
    return this.events.length;
  }

  /** Screen position (CSS px) of a model point, or null when behind the eye. */
  screenOf(p: V3): [number, number] | null {
    const [x, y, w] = this.view.view3d.project(p);
    if (w <= 0) return null;
    const sx = this.camera.viewW / Math.max(this.view.view3d.width, 1);
    const sy = this.camera.viewH / Math.max(this.view.view3d.height, 1);
    return [x * sx, y * sy];
  }

  get sceneAge(): number {
    return performance.now() - this.sceneT0;
  }

  dispose(): void {
    this.disposed = true;
  }
}
