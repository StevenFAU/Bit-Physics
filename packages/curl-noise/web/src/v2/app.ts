// Flow Sculpture — the live app: the clock, the model (model/flow.ts), the
// renderer (render/flow-view.ts), the orbit camera, the tools, edits and
// history, and the frame loop.
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
import { CanvasInput, h, toggle } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import type { FieldParams, FlowCheckpoint, FlowKernels, Obstacle, V3 } from "./model/flow.js";
import { BALL_CENTRE, Flow, MAX_STEPS, cloneField, isCanonical, sameField } from "./model/flow.js";
import type { FlowView } from "./render/flow-view.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { sceneById } from "./scenes.js";

/** Solver steps per second at 1× (one ribbon row each). */
export const TICKS_PER_SECOND = 120;

/**
 * Tracers (ribbon strands) and history slots per tier. Measured, then
 * declared (06-curl-noise.md, status): the spec's 262,144 × 32 runs at 60 fps
 * on T3 (GPU 8.4 ms) but reads as fog; Silk's sheets need far fewer, longer
 * ribbons.
 */
export const SIZES: Record<Tier, { strands: number; slots: number }> = {
  T3: { strands: 32768, slots: 96 },
  T2: { strands: 16384, slots: 64 },
  T1: { strands: 8192, slots: 48 },
};

/** Lifetime of a tracer, model time (about four seconds at 1×). */
export const MAX_AGE = 0.6;
/** How far the sphere may be dragged from the box centre (model units). */
export const MOVE_LIMIT = 0.2;
const WARM_UP_MS = 2500;

export interface FlowEvent {
  id: number;
  step: number;
  params: FieldParams;
  dt: number;
}

interface Checkpoint extends FlowCheckpoint {
  readonly kind: "flow";
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onField?: (p: FieldParams, dt: number) => void;
  onFrame?: (now: number) => void;
}

export class App {
  readonly clock = new SimClock(TICKS_PER_SECOND, MAX_STEPS);
  readonly camera = new OrbitCamera();
  readonly flow: Flow;
  scene: SceneDef = sceneById("studio");
  hooks: AppHooks = {};
  profiler: GpuProfiler | null = null;
  governor: QualityGovernor | null = null;
  writeUrl: () => void = () => {};
  maxInFlight = 3;
  fps = 0;
  stepsTotal = 0;
  learnOpen = false;
  busy = false;
  onSnapshot: ((b: Blob) => void) | null = null;

  private readonly history: History<Checkpoint>;
  private readonly events: FlowEvent[] = [];
  private nextEventId = 1;
  private pending: { id: number; params: FieldParams; dt: number } | null = null;
  private dragId = 0;
  private dragPlane: { point: V3; normal: V3; offset: V3 } | null = null;
  private downAt: { x: number; y: number } | null = null;
  private hoverSphere = false;
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
  private lastCamVersion = -1;
  readonly turntableSpeed: () => number;

  constructor(
    readonly gpu: GpuContext,
    readonly studio: Studio,
    readonly hdr: HdrPipeline,
    readonly view: FlowView,
    readonly kernels: FlowKernels,
    readonly tier: Tier,
    size: { strands: number; slots: number } = SIZES[tier],
  ) {
    this.flow = new Flow(gpu.device, kernels, size.strands, size.slots, this.scene.field);
    this.flow.maxAge = MAX_AGE;
    this.history = new History<Checkpoint>(
      {
        capture: () => ({ ...this.flow.capture(), kind: "flow" }),
        restore: (c) => this.restoreCheckpoint(c),
        release: (c) => this.flow.releaseCheckpoint(c),
      },
      5,
    );
    this.history.onChange = () => this.syncHistory();
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.turntableSpeed = () => (this.camera.reducedMotion ? 0 : this.scene.turntable);
    this.camera.minDistance = 1.2;
    this.camera.maxDistance = 12;
    this.camera.near = 0.05;
    this.camera.far = 60;
    this.camera.ground = (view.env.look.ground?.height ?? -10) + 0.05;
    // the Move tool decides at pointer-down whether the drag grabs the sphere
    studio.canvas.addEventListener("pointerdown", (e) => {
      const r = studio.canvas.getBoundingClientRect();
      this.downAt = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    new CanvasInput(
      studio.canvas,
      this.camera,
      {
        paints: () => this.studio.rail.active === "move" && this.downAt !== null && this.overSphere(this.downAt.x, this.downAt.y),
        down: (x, y) => this.dragStart(x, y),
        move: (x, y) => this.dragMove(x, y),
        up: () => this.dragEnd(),
        hover: (x, y) => this.hover(x, y),
      },
      () => false,
    );
    studio.rail.setTools(this.tools(), "move");
  }

  // -------------------------------------------------------------- tools --

  private tools(): ToolSpec[] {
    return [
      {
        id: "move",
        label: "Move",
        icon: "hand",
        hint: "Drag the sphere to move it — the flow re-routes around it at once. Drag anywhere else to turn the view.",
        options: () => this.moveOptions(),
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

  private moveOptions(): HTMLElement {
    const centre = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Back to the centre");
    centre.addEventListener("click", () => this.moveObstacleTo([...BALL_CENTRE], this.nextEventId++, true));
    return h("div", { class: "fs-options" }, h("span", { class: "fs-opt-label" }, "Drag the sphere"), centre);
  }

  private cameraOptions(): HTMLElement {
    const turn = toggle("Turntable", this.camera.autoRotate !== 0, (on) => {
      this.camera.autoRotate = on ? this.turntableSpeed() : 0;
    });
    const reset = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Reset view");
    reset.addEventListener("click", () => this.camera.fit(1, true));
    return h("div", { class: "fs-options" }, turn.el, reset);
  }

  selectTool(id: string): void {
    this.studio.rail.select(id, false);
  }

  private overSphere(x: number, y: number): boolean {
    return this.view.pickObstacle(this.camera, x, y, this.flow.params.obstacle) !== null;
  }

  private hover(x: number | null, y: number | null): void {
    const over = x !== null && y !== null && this.studio.rail.active === "move" && this.overSphere(x, y);
    if (over !== this.hoverSphere) {
      this.hoverSphere = over;
      this.studio.canvas.style.cursor = over ? "grab" : "";
    }
  }

  private dragStart(x: number, y: number): void {
    const o = this.flow.params.obstacle;
    const hit = this.view.pickObstacle(this.camera, x, y, o);
    if (!o || !hit) return;
    // drag in the plane through the sphere's centre facing the camera
    const eye = this.view.toModel(this.camera.eye());
    const n: V3 = [eye[0] - o.centre[0], eye[1] - o.centre[1], eye[2] - o.centre[2]];
    const l = Math.hypot(...n) || 1;
    const normal: V3 = [n[0] / l, n[1] / l, n[2] / l];
    const p = this.onPlane(x, y, o.centre, normal);
    if (!p) return;
    this.dragPlane = { point: [...o.centre], normal, offset: [o.centre[0] - p[0], o.centre[1] - p[1], o.centre[2] - p[2]] };
    this.dragId = this.nextEventId++;
    this.studio.canvas.style.cursor = "grabbing";
  }

  private onPlane(x: number, y: number, point: V3, normal: V3): V3 | null {
    const { origin, dir } = this.view.modelRay(this.camera, x, y);
    const den = dir[0] * normal[0] + dir[1] * normal[1] + dir[2] * normal[2];
    if (Math.abs(den) < 1e-6) return null;
    const t = ((point[0] - origin[0]) * normal[0] + (point[1] - origin[1]) * normal[1] + (point[2] - origin[2]) * normal[2]) / den;
    return [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
  }

  private dragMove(x: number, y: number): void {
    const d = this.dragPlane;
    if (!d) return;
    const p = this.onPlane(x, y, d.point, d.normal);
    if (!p) return;
    this.moveObstacleTo([p[0] + d.offset[0], p[1] + d.offset[1], p[2] + d.offset[2]], this.dragId, false);
  }

  private dragEnd(): void {
    this.dragPlane = null;
    this.studio.canvas.style.cursor = this.hoverSphere ? "grab" : "";
    this.writeUrl();
  }

  /** Clamp a sphere centre into the flow's ball. */
  clampCentre(c: V3): V3 {
    const d: V3 = [c[0] - BALL_CENTRE[0], c[1] - BALL_CENTRE[1], c[2] - BALL_CENTRE[2]];
    const l = Math.hypot(...d);
    const k = l > MOVE_LIMIT ? MOVE_LIMIT / l : 1;
    return [BALL_CENTRE[0] + d[0] * k, BALL_CENTRE[1] + d[1] * k, BALL_CENTRE[2] + d[2] * k];
  }

  /** Move the sphere (an edit at the next step boundary; one drag is one undo step). */
  moveObstacleTo(c: V3, id: number, writeUrl: boolean): void {
    const base = this.pending?.params ?? this.flow.params;
    if (!base.obstacle) return;
    const q = this.clampCentre(c).map((v) => Number(v.toFixed(5))) as V3;
    const params = cloneField(base);
    (params.obstacle as Obstacle).centre = q;
    this.pending = { id, params, dt: this.pending?.dt ?? this.flow.dt };
    if (writeUrl) this.writeUrl();
  }

  /** Change the field or the step (an edit; coalesced to one per frame). */
  setField(params: FieldParams, dt = this.flow.dt): void {
    this.pending = { id: this.nextEventId++, params: cloneField(params), dt };
  }

  // -------------------------------------------------------------- scene --

  async loadScene(id: SceneId, o: { field?: FieldParams; dt?: number; seed?: number } = {}): Promise<void> {
    this.busy = true;
    try {
      const scene = sceneById(id);
      this.scene = scene;
      this.flow.params = cloneField(o.field ?? scene.field);
      this.flow.dt = o.dt ?? scene.dt;
      this.clock.reset();
      this.events.length = 0;
      this.history.clear();
      this.pending = null;
      const enc = this.gpu.device.createCommandEncoder({ label: "flow-seed" });
      this.flow.encodeSeed(enc, o.seed ?? this.flow.seed);
      this.gpu.device.queue.submit([enc.finish()]);
      const cw = this.studio.canvas.clientWidth || 1;
      const ch = this.studio.canvas.clientHeight || 1;
      this.camera.setViewport(cw, ch);
      this.camera.setHome({ ...scene.camera, distance: scene.camera.distance * this.fitFactor(cw, ch), target: [0, 0, 0] });
      this.camera.autoRotate = this.turntableSpeed();
      this.sceneT0 = performance.now();
      this.studio.heading.set(scene.title, scene.prompt, scene.eyebrow);
      this.studio.heading.setCurrent(scene.id);
      this.syncHistory();
      this.hooks.onSceneChange?.(scene);
      this.hooks.onField?.(this.flow.params, this.flow.dt);
      await this.gpu.device.queue.onSubmittedWorkDone();
    } finally {
      this.busy = false;
    }
  }

  async restart(): Promise<void> {
    await this.loadScene(this.scene.id, { field: this.flow.params, dt: this.flow.dt, seed: this.flow.seed });
  }

  /** A portrait viewport backs the camera off so the flow's ball keeps its width in view. */
  private fitFactor(w: number, h: number): number {
    return Math.max(1, 1.15 / Math.max(w / Math.max(h, 1), 1e-3));
  }

  get isCanonicalField(): boolean {
    return isCanonical(this.flow.params);
  }

  // ------------------------------------------------------------- events --

  private applyEvent(e: FlowEvent, record = true): void {
    if (record) {
      if (!this.events.some((x) => x.id === e.id)) this.history.beforeEdit(e.id, e.step);
      this.events.push(e);
    }
    const fieldChanged = !sameField(this.flow.params, e.params);
    this.flow.params = cloneField(e.params);
    this.flow.dt = e.dt;
    if (fieldChanged && this.flow.reproject) {
      const enc = this.gpu.device.createCommandEncoder({ label: "flow-anchor" });
      this.flow.encodeAnchor(enc);
      this.gpu.device.queue.submit([enc.finish()]);
    }
    if (record) {
      this.hooks.onField?.(this.flow.params, this.flow.dt);
      if (!this.dragPlane) this.writeUrl();
    }
  }

  undo(): void {
    const entry = this.history.popUndo();
    if (!entry) {
      this.studio.toast.show("Nothing to undo");
      return;
    }
    const target = this.flow.steps;
    this.busy = true;
    try {
      // restore the state before the undone edit, then replay the rest up to now
      this.restoreCheckpoint(entry.checkpoint);
      const keep = this.events.filter((e) => e.id !== entry.eventId);
      this.events.length = 0;
      this.events.push(...keep);
      const replay = keep.filter((e) => e.step >= entry.tick).sort((a, b) => a.step - b.step);
      let i = 0;
      while (this.flow.steps < target) {
        while (i < replay.length && replay[i]!.step <= this.flow.steps) this.applyEvent(replay[i++]!, false);
        const next = Math.min(target - this.flow.steps, MAX_STEPS, i < replay.length ? replay[i]!.step - this.flow.steps : MAX_STEPS);
        const enc = this.gpu.device.createCommandEncoder({ label: "flow-replay" });
        this.flow.encodeSteps(enc, Math.max(1, next));
        this.gpu.device.queue.submit([enc.finish()]);
      }
      while (i < replay.length) this.applyEvent(replay[i++]!, false);
      this.history.release(entry.checkpoint);
      this.flow.clearHistory();
      this.hooks.onField?.(this.flow.params, this.flow.dt);
      this.writeUrl();
      this.studio.toast.show("Undone — replayed to the same moment without that edit");
    } finally {
      this.busy = false;
    }
    this.syncHistory();
  }

  private restoreCheckpoint(c: FlowCheckpoint): void {
    this.flow.restore(c);
    this.pending = null;
    this.hooks.onField?.(this.flow.params, this.flow.dt);
  }

  savePoint(): void {
    this.history.savePointNow(this.flow.steps);
    this.studio.toast.show(`Saved at step ${this.flow.steps.toLocaleString()}`);
  }

  restoreSave(): void {
    if (this.history.restoreSave()) {
      this.events.length = 0;
      this.writeUrl();
      this.studio.toast.show(`Back to step ${this.flow.steps.toLocaleString()}`);
    }
  }

  private syncHistory(): void {
    this.studio.transport.setHistory({
      canRestore: this.history.hasSave,
      canCompare: false,
      comparing: false,
      canUndo: this.history.canUndo,
    });
  }

  /** Edits so far, for tests. */
  get eventCount(): number {
    return new Set(this.events.map((e) => e.id)).size;
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
    if (rect.width > 1 && rect.height > 1 && (rect.width !== this.camera.viewW || rect.height !== this.camera.viewH)) {
      const before = this.camera.viewW > 1 ? this.fitFactor(this.camera.viewW, this.camera.viewH) : 1;
      this.camera.rescale(this.fitFactor(rect.width, rect.height) / before);
    }
    this.camera.setViewport(rect.width, rect.height);
    this.camera.update(dt, now);
    if (this.camera.version !== this.lastCamVersion) this.lastCamVersion = this.camera.version;

    // edits land at the step boundary
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      if (!sameField(p.params, this.flow.params) || p.dt !== this.flow.dt) {
        this.applyEvent({ id: p.id, step: this.flow.steps, params: p.params, dt: p.dt });
      }
    }

    const n = this.clock.due(dt);
    this.profiler?.begin(n);
    const enc = device.createCommandEncoder({ label: "flow-frame" });
    if (n > 0) this.flow.encodeSteps(enc, n, this.profiler?.pass("sim") ?? undefined);
    this.clock.advance(n);
    this.stepsTotal += n;
    const f = this.flow;
    this.view.encode(
      enc,
      this.hdr,
      {
        camera: this.camera,
        ring: { buffer: f.ring, anchors: f.f0, strands: f.n, slots: f.slots, head: f.head, valid: f.valid },
        refStep: 2.2 * f.dt,
        obstacle: f.params.obstacle,
      },
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
    this.studio.transport.setClock(this.clock.paused ? `t ${f.time.toFixed(2)}` : `t ${f.time.toFixed(2)} · ${Math.round(this.stepsPerSecond)} steps/s`);
    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    this.hooks.onFrame?.(now);
  }

  /**
   * Advance n steps off the frame loop (tests, measurements): the same
   * kernel, in chunks of MAX_STEPS.
   */
  async advance(n: number): Promise<void> {
    const device = this.gpu.device;
    let done = 0;
    while (done < n) {
      const k = Math.min(n - done, MAX_STEPS);
      const enc = device.createCommandEncoder({ label: "flow-advance" });
      this.flow.encodeSteps(enc, k);
      device.queue.submit([enc.finish()]);
      done += k;
      this.stepsTotal += k;
      this.clock.advance(k);
    }
    await device.queue.onSubmittedWorkDone();
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
