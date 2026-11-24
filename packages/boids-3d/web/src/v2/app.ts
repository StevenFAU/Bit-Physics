// Murmuration — the live app: the clock, the flock (model/flock.ts), the
// renderer (render/murmur-view.ts), the watcher's camera, the tools, save
// points, the instruments and the frame loop.
//
// Frame loop: up to `maxInFlight` frames on the GPU at once. A callback that
// finds them all in flight makes an empty queue.submit([]) (Firefox/wgpu only
// notices finished work at a submit or on a ~100 ms timer) and returns; the
// time step and the fps readout are taken after that gate, so they count
// frames drawn (web/README.md).

import type { GpuContext, GpuProfiler, Tier } from "@bp/gpu";
import { ReadbackSlot } from "@bp/gpu";
import type { HdrPipeline, Vec3 } from "@bp/render";
import type { QualityGovernor } from "@bp/runtime";
import { History, SimClock } from "@bp/runtime";
import type { Studio, ToolSpec } from "@bp/studio";
import { CanvasInput, h, slider } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import { Falcon } from "./model/falcon.js";
import type { FalconSnapshot } from "./model/falcon.js";
import type { FlockCheckpoint, FlockKernels, FlockStats, ModelParams, ToolInput, V3 } from "./model/flock.js";
import { DT, Flock, MAX_STEPS, MURMURATION, NO_TOOL, TOOL, decodeStats } from "./model/flock.js";
import { measureWave } from "./model/wave.js";
import type { Wave } from "./model/wave.js";
import { GroundCamera } from "./render/ground-camera.js";
import type { MurmurView } from "./render/murmur-view.js";
import { HOME_EYE, ROOST_Y } from "./render/murmur-view.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { sceneById } from "./scenes.js";

/** Model steps per second at 1× (v1's fixed 1/120 s step: real time). */
export const TICKS_PER_SECOND = 120;

/**
 * Birds per tier. Measured, then declared (07-boids-3d.md, status): v1's
 * kernel reads every candidate in the 27 cells around a bird (its alarm rule
 * needs all visible neighbours, not only the seven), so a step costs about
 * 4.5 ms at 32,768 birds on an RX 6800 XT and 60 fps holds; 65,536 ran at
 * 5.9 fps and 100,000 at 2.4. The spec's 100k / 32k / 10k wait for M1's
 * kernel work. T1 is v1's software-adapter safe mode.
 */
export const SIZES: Record<Tier, number> = {
  T3: 100_000,
  T2: 32_768,
  T1: 10_000,
};
/** Buffers hold this many birds whatever the tier (?n= may ask for up to it). */
export const CAPACITY = 131_072;
const WARM_UP_MS = 2500;

interface Checkpoint extends FlockCheckpoint {
  readonly kind: "flock";
  falcon: FalconSnapshot;
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onModel?: (m: ModelParams) => void;
  onWave?: (w: Wave) => void;
  onStats?: (s: FlockStats) => void;
  onFrame?: (now: number) => void;
}

type ToolId = "look" | "falcon" | "gust" | "startle";

export class App {
  readonly clock = new SimClock(TICKS_PER_SECOND, 8);
  readonly camera = new GroundCamera();
  readonly flock: Flock;
  readonly falcon = new Falcon();
  private prevFalconHeading: V3 | null = null;
  private falconRoll = 0;
  /** The last alarm wave measured (Learn). */
  wave: Wave | null = null;
  private waveDue = 0;
  private waveBusy = false;
  private falconIdleT = 0;
  /** Keys held for the falcon: A/D, W/S, Shift. */
  readonly keys = { yaw: 0, pitch: 0, stoop: false };
  scene: SceneDef = sceneById("dusk");
  hooks: AppHooks = {};
  profiler: GpuProfiler | null = null;
  governor: QualityGovernor | null = null;
  writeUrl: () => void = () => {};
  maxInFlight = 3;
  fps = 0;
  stepsTotal = 0;
  learnOpen = false;
  busy = false;
  stats: FlockStats | null = null;
  onSnapshot: ((b: Blob) => void) | null = null;
  /** Gust and Startle settings (v1's defaults). */
  toolRadius = 18;
  toolStrength = 3.2;

  private readonly history: History<Checkpoint>;
  private readonly statsSlot: ReadbackSlot;
  private statsT = 0;
  private toolDown = false;
  private toolPoint: Vec3 = [0, 0, 0];
  private toolDir: Vec3 = [0, 1, 0];
  private lastPointer: { x: number; y: number } | null = null;
  private inFlight = 0;
  private last = performance.now();
  private frames = 0;
  private fpsT0 = performance.now();
  private sceneT0 = performance.now();
  private rateT0 = performance.now();
  private rateSteps = 0;
  private stepsPerSecond = 0;
  private snapshotWanted = false;
  private disposed = false;
  private readonly t0 = performance.now();

  constructor(
    readonly gpu: GpuContext,
    readonly studio: Studio,
    readonly hdr: HdrPipeline,
    readonly view: MurmurView,
    readonly kernels: FlockKernels,
    readonly tier: Tier,
    readonly birds: number = SIZES[tier],
  ) {
    this.flock = new Flock(gpu.device, kernels, Math.max(CAPACITY, birds));
    this.flock.count = birds;
    // each model step: advance the falcon, then hand the step its falcon and tool
    this.flock.input = (step) => {
      this.falcon.advance(DT, step);
      return { step, falcon: this.falcon.state(), tool: this.toolInput() };
    };
    if (tier === "T1") {
      // phones and software adapters: real time at 60 fps, and a slower flock rather
      // than a frame that snowballs below it; a thinner reed bed (SwiftShader drew
      // 3,200 reeds in ~46 ms a frame)
      this.clock.maxTicksPerFrame = 2;
      view.reedCount = 1200;
    }
    this.statsSlot = new ReadbackSlot(gpu.device, 128, "murmur-stats-read");
    this.history = new History<Checkpoint>(
      {
        capture: () => ({ ...this.flock.capture(), kind: "flock", falcon: this.falcon.snapshot() }),
        restore: (c) => this.restoreCheckpoint(c),
        release: (c) => this.flock.releaseCheckpoint(c),
      },
      3,
    );
    this.history.onChange = () => this.syncHistory();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera.reducedMotion = reduced;
    const home = this.homeView();
    this.camera.setHome(home);
    new CanvasInput(
      studio.canvas,
      this.camera,
      {
        paints: () => this.studio.rail.active !== "look",
        down: (x, y) => this.toolStart(x, y),
        move: (x, y) => this.toolMove(x, y),
        up: () => this.toolEnd(),
        hover: (x, y) => this.aimFalcon(x, y),
      },
      () => false,
    );
    studio.rail.setTools(this.tools(), "look");
  }

  /** Standing at HOME_EYE, looking at the roost's centre, a little above it. */
  homeView(): { eye: Vec3; yaw: number; pitch: number; fov: number } {
    const e = HOME_EYE;
    const pitch = Math.atan2(ROOST_Y - e[1], Math.hypot(e[0], e[2])) + 0.02;
    const reduced = this.camera.reducedMotion;
    // under reduced motion the gaze never follows: a wider view holds the whole roost
    return { eye: [...e], yaw: 0, pitch, fov: ((reduced ? 64 : 52) * Math.PI) / 180 };
  }

  // -------------------------------------------------------------- tools --

  private tools(): ToolSpec[] {
    return [
      {
        id: "look",
        label: "Look",
        icon: "eye",
        hint: "Drag to look around, scroll or pinch to zoom, double-click to look back at the flock. Left alone, your gaze follows the flock.",
      },
      {
        id: "falcon",
        label: "Falcon",
        icon: "shark",
        hint: "You are the falcon (F). Point to steer, or A/D to turn and W/S to climb and dive; hold Shift to stoop. Leave it alone and it hunts by itself.",
        paints: true,
      },
      {
        id: "gust",
        label: "Gust",
        icon: "wave",
        hint: "Drag across the flock to stir a gust of wind through it.",
        paints: true,
        options: () => this.toolOptions(),
      },
      {
        id: "startle",
        label: "Startle",
        icon: "alert",
        hint: "Press on the flock: the birds there flee, and the alarm spreads bird to bird through their neighbours.",
        paints: true,
        options: () => this.toolOptions(),
      },
    ];
  }

  private toolOptions(): HTMLElement {
    const reach = slider({
      label: "Reach",
      min: 6,
      max: 32,
      step: 1,
      value: this.toolRadius,
      format: (v) => `${Math.round(v * 2)} m`,
      hint: "How far from the pointer the birds feel it.",
      onInput: (v) => (this.toolRadius = v),
    });
    const force = slider({
      label: "Strength",
      min: 0.5,
      max: 8,
      step: 0.1,
      value: this.toolStrength,
      format: (v) => v.toFixed(1),
      onInput: (v) => (this.toolStrength = v),
    });
    return h("div", { class: "mm-options" }, reach.el, force.el);
  }

  selectTool(id: string): void {
    this.studio.rail.select(id, false);
    // keys held for the falcon must not stay latched when it is put away
    if (id !== "falcon") {
      this.keys.yaw = 0;
      this.keys.pitch = 0;
      this.keys.stoop = false;
    }
    this.setFalcon(id === "falcon");
  }

  /** Fly the falcon (from a perch above and behind the flock) or ground it. */
  setFalcon(on: boolean): void {
    if (on && !this.falcon.flying) {
      const c = this.stats?.centroid ?? [0, 0, 0];
      this.falcon.placeNear([c[0], c[1], c[2]]);
      this.falcon.mode = "pursuit";
      this.falconIdleT = 0;
    } else if (!on && this.falcon.mode !== "script") {
      this.falcon.mode = "off";
    }
  }

  /** The pointer over the sky steers the falcon (it takes over from the pursuit). */
  private aimFalcon(x: number | null, y: number | null): void {
    if (this.studio.rail.active !== "falcon" || !this.falcon.flying || this.falcon.mode === "script") return;
    if (x === null || y === null) {
      this.falcon.input.aim = null;
      return;
    }
    const p = this.pick(x, y);
    if (!p) return;
    this.falcon.input.aim = p;
    this.falcon.mode = "player";
    this.falconIdleT = performance.now();
  }

  /** The point under the pointer on the plane through the flock's centre, facing you (model units). */
  private pick(x: number, y: number): Vec3 | null {
    const r = this.camera.ray(x, y);
    const c = this.stats?.centroid ?? [0, 0, 0];
    const cw: Vec3 = [c[0], c[1] + ROOST_Y, c[2]];
    const n = this.camera.forward();
    const den = r.dir[0] * n[0] + r.dir[1] * n[1] + r.dir[2] * n[2];
    if (Math.abs(den) < 1e-6) return null;
    const t = ((cw[0] - r.origin[0]) * n[0] + (cw[1] - r.origin[1]) * n[1] + (cw[2] - r.origin[2]) * n[2]) / den;
    if (t <= 0) return null;
    return [r.origin[0] + r.dir[0] * t, r.origin[1] + r.dir[1] * t - ROOST_Y, r.origin[2] + r.dir[2] * t];
  }

  private toolStart(x: number, y: number): void {
    if (this.studio.rail.active === "falcon") {
      // held until release: the frame update reads it as the stoop (as Shift)
      this.toolDown = true;
      this.aimFalcon(x, y);
      return;
    }
    const p = this.pick(x, y);
    if (!p) return;
    this.toolDown = true;
    this.toolPoint = p;
    this.lastPointer = { x, y };
    this.toolDir = this.camera.forward();
  }

  private toolMove(x: number, y: number): void {
    if (this.studio.rail.active === "falcon") {
      this.aimFalcon(x, y);
      return;
    }
    if (!this.toolDown) return;
    const p = this.pick(x, y);
    if (!p) return;
    const last = this.lastPointer ?? { x, y };
    const dx = x - last.x;
    const dy = y - last.y;
    if (Math.hypot(dx, dy) > 0.5) {
      // the gust's axis: across the drag, in the screen plane, so it rolls the birds along the drag
      const f = this.camera.forward();
      const right = norm([-f[2], 0, f[0]]);
      const up = cross(right, f);
      const drag: Vec3 = [right[0] * dx - up[0] * dy, right[1] * dx - up[1] * dy, right[2] * dx - up[2] * dy];
      this.toolDir = norm(cross(f, drag));
    }
    this.toolPoint = p;
    this.lastPointer = { x, y };
  }

  private toolEnd(): void {
    this.falcon.input.stoop = this.keys.stoop;
    this.toolDown = false;
    this.lastPointer = null;
  }

  /** The tool input this frame's steps see. */
  private toolInput(): ToolInput {
    const id = this.studio.rail.active as ToolId;
    if (!this.toolDown || (id !== "gust" && id !== "startle")) return NO_TOOL;
    return {
      code: id === "gust" ? TOOL.gust : TOOL.startle,
      position: [...this.toolPoint],
      direction: [...this.toolDir],
      radius: this.toolRadius,
      strength: this.toolStrength,
    };
  }

  // -------------------------------------------------------------- scene --

  async loadScene(id: SceneId, o: { seed?: number; birds?: number } = {}): Promise<void> {
    this.busy = true;
    try {
      const scene = sceneById(id);
      this.scene = scene;
      this.view.dusk = { ...scene.dusk, ...this.view.dusk, cirrus: scene.dusk.cirrus };
      this.clock.reset();
      this.history.clear();
      this.flock.reset(o.seed ?? scene.seed, o.birds ?? this.flock.count);
      this.stats = null;
      this.wave = null;
      this.falcon.mode = "off";
      this.falcon.script = null;
      if (scene.attack) await this.stageAttack(scene.attack);
      else if (this.studio.rail.active === "falcon") this.setFalcon(true);
      const cw = this.studio.canvas.clientWidth || 1;
      const ch = this.studio.canvas.clientHeight || 1;
      this.camera.setViewport(cw, ch);
      this.camera.setHome(this.homeView());
      this.sceneT0 = performance.now();
      this.studio.heading.set(scene.title, scene.prompt, scene.eyebrow);
      this.studio.heading.setCurrent(scene.id);
      this.syncHistory();
      this.hooks.onSceneChange?.(scene);
      this.hooks.onModel?.(this.flock.model);
      await this.gpu.device.queue.onSubmittedWorkDone();
    } finally {
      this.busy = false;
    }
  }

  async restart(): Promise<void> {
    await this.loadScene(this.scene.id, { seed: this.flock.seed });
  }

  /**
   * The Attack: fly the flock for `warm` steps off screen, read where it is
   * (a deterministic readback of its own state), and script the falcon's stoop
   * at it from there. Same seed, same bytes, same attack: a restart replays it.
   */
  private async stageAttack(a: { warm: number }): Promise<void> {
    await this.advance(a.warm);
    const s = decodeStats(new Float32Array(await this.readStatsNow()));
    if (!s) return;
    const c: V3 = s.centroid;
    const hd: V3 = [s.meanHeading[0], 0, s.meanHeading[2]];
    const hl = Math.hypot(hd[0], hd[2]) || 1;
    const f: V3 = [hd[0] / hl, 0, hd[2] / hl];
    const side: V3 = [-f[2], 0, f[0]];
    // perch ahead and to the side, high; stoop across the flock's path; climb out beyond
    const perch: V3 = [c[0] + f[0] * 45 + side[0] * 25, c[1] + 24, c[2] + f[2] * 45 + side[2] * 25];
    const lead: V3 = [c[0] + f[0] * 16, c[1] + 2, c[2] + f[2] * 16];
    const out: V3 = [c[0] - f[0] * 10 - side[0] * 40, c[1] - 6, c[2] - f[2] * 10 - side[2] * 40];
    const up: V3 = [out[0] - side[0] * 30, c[1] + 20, out[2] - side[2] * 30];
    this.falcon.position = [...perch];
    this.falcon.heading = [side[0] * -0.6, -0.3, side[2] * -0.6];
    const l = Math.hypot(...this.falcon.heading);
    this.falcon.heading = this.falcon.heading.map((x) => x / l) as V3;
    this.falcon.speed = this.falcon.limits.cruise;
    this.falcon.script = { start: this.flock.steps, points: [perch, lead, lead, out, up] };
    this.falcon.mode = "script";
  }

  /** The stats block of the current state, now (awaited; off the frame loop). */
  private async readStatsNow(): Promise<ArrayBuffer> {
    const enc = this.gpu.device.createCommandEncoder({ label: "murmur-stats-now" });
    this.flock.encodeStats(enc);
    this.gpu.device.queue.submit([enc.finish()]);
    return this.flock.readBuffer(this.flock.statsBuffer, 128);
  }

  async setSeed(seed: number): Promise<void> {
    await this.loadScene(this.scene.id, { seed });
    this.writeUrl();
  }

  /** Change a model parameter (reseeds nothing; takes effect at the next step). */
  setModel(patch: Partial<ModelParams>): void {
    this.flock.model = { ...this.flock.model, ...patch };
    this.hooks.onModel?.(this.flock.model);
    this.writeUrl();
  }

  /** Back to the model's own parameters. */
  resetModel(): void {
    this.setModel({ ...MURMURATION });
  }

  // ------------------------------------------------------------- history --

  private restoreCheckpoint(c: Checkpoint): void {
    this.flock.restore(c);
    this.falcon.restore(c.falcon);
  }

  savePoint(): void {
    this.history.savePointNow(this.flock.steps);
    this.studio.toast.show(`Saved at ${this.flock.time.toFixed(1)} s`);
  }

  restoreSave(): void {
    if (this.history.restoreSave()) {
      this.writeUrl();
      this.studio.toast.show(`Back to ${this.flock.time.toFixed(1)} s`);
    }
  }

  private syncHistory(): void {
    this.studio.transport.setHistory({
      canRestore: this.history.hasSave,
      canCompare: false,
      comparing: false,
      canUndo: false,
    });
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
    // The governor steps render scale down, which only buys back render time. With
    // timestamp queries it watches the render passes' GPU time (the flock's step
    // cost is the tier's to set, not the render scale's); without them, the frame.
    if (this.governor && now - this.sceneT0 > WARM_UP_MS) {
      const p = this.profiler;
      if (p && p.source === "timestamp") {
        let ms = 0;
        for (const t of p.timings()) if (t.name !== "sim") ms += t.ms;
        if (ms > 0) this.governor.sample(ms, now);
      } else {
        this.governor.sample(dt * 1000, now);
      }
    }

    const rect = this.studio.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.governor?.renderScale ?? 1;
    this.hdr.resize(rect.width, rect.height, dpr, scale);
    this.camera.setViewport(rect.width, rect.height);
    if (this.stats) {
      const c = this.stats.centroid;
      this.camera.followTarget = [c[0], c[1] + ROOST_Y, c[2]];
    }
    this.camera.update(dt, now);

    const n = Math.min(this.clock.due(dt), MAX_STEPS);
    this.profiler?.begin(n);
    const enc = device.createCommandEncoder({ label: "murmur-frame" });
    // the falcon's controls this frame; idle for 2 s, it goes back to hunting by itself
    const fi = this.falcon.input;
    fi.yaw = this.keys.yaw;
    fi.pitch = this.keys.pitch;
    fi.stoop = this.keys.stoop || this.toolDown;
    if (this.falcon.mode === "player" && (this.keys.yaw !== 0 || this.keys.pitch !== 0)) this.falconIdleT = now;
    if (this.falcon.mode === "player" && now - this.falconIdleT > 2000) {
      fi.aim = null;
      this.falcon.mode = "pursuit";
    }
    if (this.stats) {
      const c = this.stats.centroid;
      this.falcon.target = { centre: [c[0], c[1], c[2]], heading: [...this.stats.meanHeading] };
    }
    if (n > 0) this.flock.encodeSteps(enc, n, { timestampWrites: this.profiler?.pass("sim") ?? undefined });
    this.clock.advance(n);
    this.stepsTotal += n;
    // the instruments, a few times a second, never awaited here
    let statsQueued = false;
    if (now - this.statsT > 250 && !this.statsSlot.pending) {
      this.statsT = now;
      this.flock.encodeStats(enc);
      statsQueued = this.statsSlot.record(enc, this.flock.statsBuffer);
    }
    this.view.encode(enc, this.hdr, { camera: this.camera, agents: this.flock.current, birds: this.flock.count, timeSec: (now - this.t0) / 1000, falcon: this.falconDraw() }, this.profiler);
    this.hdr.encode(enc, dt, this.profiler ?? undefined);
    this.profiler?.end(enc);
    device.queue.submit([enc.finish()]);
    this.profiler?.submitted();
    if (statsQueued) void this.collectStats();
    if (this.snapshotWanted) {
      this.snapshotWanted = false;
      this.studio.canvas.toBlob((b) => b && this.onSnapshot?.(b), "image/png");
    }
    this.inFlight += 1;
    void device.queue.onSubmittedWorkDone().then(() => {
      this.inFlight -= 1;
    });

    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.stepsTotal - this.rateSteps) * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateSteps = this.stepsTotal;
    }
    const t = this.flock.time;
    this.studio.transport.setClock(this.clock.paused ? `t ${t.toFixed(1)} s` : `t ${t.toFixed(1)} s · ${Math.round(this.stepsPerSecond)} steps/s`);
    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    if (this.waveDue > 0 && now > this.waveDue && !this.waveBusy) void this.measureWaveNow();
    this.hooks.onFrame?.(now);
  }

  private async collectStats(): Promise<void> {
    const raw = await this.statsSlot.collect();
    if (!raw) return;
    const s = decodeStats(new Float32Array(raw));
    if (!s) return;
    this.stats = s;
    this.hooks.onStats?.(s);
    // an alarm wave started: measure it once it has run its course
    if (s.alertFraction > 5e-4 && this.waveDue === 0 && !this.waveBusy) this.waveDue = performance.now() + 2500;
    if (s.alertFraction < 1e-5 && this.waveDue < 0) this.waveDue = 0;
  }

  /** Measure the alarm wave now (one readback of the whole flock). */
  async measureWaveNow(): Promise<void> {
    this.waveBusy = true;
    try {
      const w = measureWave(await this.flock.readState(), this.flock.steps, DT);
      if (w) {
        this.wave = w;
        this.hooks.onWave?.(w);
      }
    } catch {
      /* a lost readback: the next wave measures again */
    } finally {
      this.waveBusy = false;
      // re-arm once the alarm has died away
      this.waveDue = -1;
    }
  }

  /**
   * Advance n steps off the frame loop (tests, measurements): the same
   * kernels, in chunks of MAX_STEPS.
   */
  async advance(n: number): Promise<void> {
    const device = this.gpu.device;
    let done = 0;
    while (done < n) {
      const k = Math.min(n - done, MAX_STEPS);
      const enc = device.createCommandEncoder({ label: "murmur-advance" });
      this.flock.encodeSteps(enc, k);
      device.queue.submit([enc.finish()]);
      done += k;
      this.stepsTotal += k;
      this.clock.advance(k);
    }
    await device.queue.onSubmittedWorkDone();
  }

  /** Render one frame now, off the frame loop, without stepping (tests: the flicker check). */
  async renderOnce(): Promise<void> {
    const device = this.gpu.device;
    const rect = this.studio.canvas.getBoundingClientRect();
    this.hdr.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2), this.governor?.renderScale ?? 1);
    this.camera.setViewport(rect.width, rect.height);
    const enc = device.createCommandEncoder({ label: "murmur-render-once" });
    this.view.encode(enc, this.hdr, { camera: this.camera, agents: this.flock.current, birds: this.flock.count, timeSec: 0, falcon: this.falconDraw() });
    this.hdr.encode(enc, 0);
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();
  }

  /** The falcon as the renderer draws it (a peregrine's wingspan ~1 m: 0.5 units, drawn at the birds' scale). */
  private falconDraw(): { position: V3; heading: V3; roll: number; wingspan: number } | null {
    if (!this.falcon.flying) return null;
    const h = this.falcon.heading;
    // bank into the turn it is making
    const prev = this.prevFalconHeading;
    const turn = prev ? h[0] * prev[2] - h[2] * prev[0] : 0;
    this.prevFalconHeading = [...h];
    this.falconRoll += (Math.max(-1.1, Math.min(1.1, turn * 40)) - this.falconRoll) * 0.1;
    return { position: [...this.falcon.position], heading: [...h], roll: this.falconRoll, wingspan: 0.5 * this.view.birds.scale };
  }

  /** Model time per step. */
  get dt(): number {
    return DT;
  }

  get sceneAge(): number {
    return performance.now() - this.sceneT0;
  }

  dispose(): void {
    this.disposed = true;
  }
}

function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
