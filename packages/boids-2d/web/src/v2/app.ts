// Swarm — the app controller. Wires the Field Studies shell, the render core
// and the runtime around the live flock: scenes, the Shark and Look tools,
// Tune, history (save / restore / A-B), URL state, the quality governor,
// profiling and the live order parameters. The release gate (proof/gate.ts)
// and the GPU proofs (proof/prove.ts) never touch this flock.

import type { GpuContext, GpuProfiler, PassTiming, Tier } from "@bp/gpu";
import { ReadbackSlot, lowerTier, rememberTier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { Camera2D } from "@bp/render";
import type { Checkpointer, QualityGovernor } from "@bp/runtime";
import { History, SimClock } from "@bp/runtime";
import type { CameraLike, Studio, ToolHandlers, ToolSpec } from "@bp/studio";
import { CanvasInput, h, slider } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import type { Checkpoint, OrderParams } from "./model/flock.js";
import { Flock, FlockKernels, MAX_STEPS_PER_PASS, orderParams, sumPartials } from "./model/flock.js";
import type { RuleParams } from "./model/params.js";
import { sameRule } from "./model/params.js";
import { AGENTS, worldFor } from "./model/world.js";
import type { OceanView, SharkView } from "./render/ocean-view.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { PROOF, SCENES, sceneById } from "./scenes.js";

/** Solver steps per second at 1× (spec: T3 one step per frame at 60 fps). */
const TICK_RATE: Record<Tier, number> = { T3: 60, T2: 60, T1: 60 };
/** Smallest cohesion radius Tune offers (the sort is sized for it). */
export const MIN_RCOH = 0.05;
/** Bloom mix for the glow (foundation default for emissive content: ≤ 0.08). */
export const BLOOM = 0.06;

export interface SceneOptions {
  seed?: number;
  rule?: RuleParams;
  camera?: { cx: number; cy: number; zoom: number };
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onRule?: (r: RuleParams) => void;
  onEdited?: () => void;
  onOrder?: (o: OrderParams, tick: number) => void;
  onFrame?: (now: number) => void;
}

/** The shark the visitor steers: it chases the pointer, its size is its fear radius. */
interface SharkState {
  /** Pointer target (world), or null when the pointer is away. */
  target: [number, number] | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  presence: number;
  lunging: boolean;
  lunge: number;
  /** Fear radius, world units. */
  radius: number;
  /** Seconds the shark has been present (for the first callouts). */
  seen: number;
  lunged: number;
}

/** v4's fear strength (predStr 0.004 per step, ×1.8 while the button is held). */
export const FEAR = 0.004;
export const LUNGE = 1.8;
/** Default fear radius in units of the cohesion radius. */
export const SHARK_RADIUS_R = 14;

export class App {
  readonly gpu: GpuContext;
  readonly device: GPUDevice;
  readonly studio: Studio;
  readonly hdr: HdrPipeline;
  readonly view: OceanView;
  readonly kernels: FlockKernels;
  readonly camera = new Camera2D();
  readonly clock: SimClock;
  readonly history: History<Checkpoint>;
  readonly input: CanvasInput;
  tier: Tier;
  flock!: Flock;
  scene: SceneDef = SCENES[0]!;
  seed = 1;
  /** Rule edits since the scene loaded (for Prove's live honesty). */
  edits = 0;
  /** Solver steps since the page loaded (never reset: rates, the bench). */
  stepsTotal = 0;
  hooks: AppHooks = {};
  learnOpen = false;
  governor: QualityGovernor | null = null;
  profiler: GpuProfiler | null = null;
  onSnapshot: ((b: Blob) => void) | null = null;
  writeUrl: () => void = () => {};
  /** Latest live order parameters (exact integer reduction). */
  order: OrderParams | null = null;
  readonly shark: SharkState = {
    target: null,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: 0,
    presence: 0,
    lunging: false,
    lunge: 0,
    radius: 1.5,
    seen: 0,
    lunged: 0,
  };
  /** Fear radius as a multiple of the cohesion radius (the Shark tool's Size). */
  sharkSize = SHARK_RADIUS_R;

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
  private snapshotWanted = false;
  private comparingPlaying = true;
  private sceneT0 = performance.now();
  private loadSeq = 0;
  private orderSlot: ReadbackSlot | null = null;
  private orderFrame = 0;

  constructor(gpu: GpuContext, studio: Studio, hdr: HdrPipeline, view: OceanView, kernels: FlockKernels, tier: Tier) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.studio = studio;
    this.hdr = hdr;
    this.view = view;
    this.kernels = kernels;
    this.tier = tier;
    this.clock = new SimClock(TICK_RATE[tier], MAX_STEPS_PER_PASS);
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cp: Checkpointer<Checkpoint> = {
      capture: () => this.flock.checkpoint(),
      restore: (c) => {
        this.flock.restore(c);
        this.hooks.onRule?.(this.flock.rule);
      },
      release: (c) => this.flock.release(c),
    };
    this.history = new History(cp, 1);
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

  // ------------------------------------------------------------ scenes --

  async loadScene(id: SceneId, o: SceneOptions = {}): Promise<void> {
    const scene = sceneById(id);
    const seq = ++this.loadSeq;
    await Promise.resolve();
    if (seq !== this.loadSeq) return;
    this.busy = true;
    try {
      this.history.clear();
      this.view.split = null;
      const old = this.flock as Flock | undefined;
      const rect = this.studio.canvas.getBoundingClientRect();
      const proof = scene.kind === "proof";
      const n = proof ? PROOF.n : AGENTS[this.tier];
      const world = proof ? { halfW: PROOF.halfW, halfH: PROOF.halfH } : worldFor(n, rect.width, rect.height, scene.density);
      this.seed = proof ? PROOF.seed : (o.seed ?? 1);
      const rule = proof ? scene.rule : (o.rule ?? scene.rule);
      const flock = new Flock(this.device, this.kernels, {
        n,
        ...world,
        seed: this.seed,
        rule,
        init: scene.init,
        broadphase: "sort",
        minRCoh: MIN_RCOH,
      });
      this.flock = flock;
      old?.destroy();
      this.orderSlot?.destroy();
      this.orderSlot = new ReadbackSlot(this.device, flock.groups * 40, "swarm-order");
      this.order = null;
      this.view.forgetBuffers();
      this.scene = scene;
      this.edits = 0;
      this.clock.reset();
      this.sceneT0 = performance.now();
      this.camera.setViewport(rect.width, rect.height);
      this.camera.setDomain(world.halfW * 2, world.halfH * 2, true);
      this.camera.maxPxPerUnit = Math.max(400, rect.height / (rule.rCoh * 3));
      if (o.camera) {
        this.camera.set({ cx: o.camera.cx * world.halfW * 2, cy: o.camera.cy * world.halfH * 2, pxPerUnit: this.camera.coverZoom() * o.camera.zoom });
      } else {
        this.camera.fit(1);
      }
      this.shark.radius = this.sharkSize * flock.rule.rCoh;
      this.shark.presence = 0;
      this.shark.target = null;
      this.hdr.resetExposure();
      const tools = scene.shark ? [this.toolSpec("shark"), this.toolSpec("pan")] : [this.toolSpec("pan")];
      this.studio.rail.setTools(tools, tools[0]!.id);
      this.studio.root.dataset["tool"] = tools[0]!.id;
      this.studio.heading.setCurrent(scene.listed ? scene.id : "");
      this.studio.heading.set(scene.title, scene.prompt);
      this.setCallouts();
      this.governor?.acknowledgeRestart();
      this.syncTransport();
      this.hooks.onSceneChange?.(scene);
      this.hooks.onRule?.(flock.rule);
    } finally {
      this.busy = false;
    }
  }

  /** Restart the current scene from its starting state (same seed, current rule). */
  async restart(): Promise<void> {
    if (this.governor?.simStepDownPending && this.tier !== "T1" && this.scene.kind === "live") {
      this.tier = lowerTier(this.tier);
      rememberTier(this.gpu.adapterId, this.tier);
      this.clock.ticksPerSecond = TICK_RATE[this.tier];
      this.studio.toast.show(`Restarted with fewer fish (${AGENTS[this.tier].toLocaleString()}) to hold the frame rate`);
    }
    await this.loadScene(this.scene.id, { seed: this.seed, rule: this.flock.rule });
  }

  /** Is the live view the proofs' own run (proof scene, no edits, no shark)? */
  get onProofRun(): boolean {
    return this.scene.kind === "proof" && this.edits === 0 && sameRule(this.flock.rule, this.scene.rule);
  }

  // ------------------------------------------------------------- rule --

  setRule(r: RuleParams, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change the rule")) return;
    if (phase === "start") this.edits += 1;
    this.flock.setRule(r);
    this.shark.radius = this.sharkSize * r.rCoh;
    this.hooks.onRule?.(r);
    this.hooks.onEdited?.();
    if (phase === "end") this.writeUrl();
  }

  resetRule(): void {
    if (this.blocked("reset the rule")) return;
    this.edits += 1;
    this.setRule({ ...this.scene.rule });
  }

  setSharkSize(k: number): void {
    this.sharkSize = k;
    this.shark.radius = k * this.flock.rule.rCoh;
    this.writeUrl();
  }

  // ------------------------------------------------------------ history --

  savePoint(): void {
    if (this.blocked("save")) return;
    this.history.savePointNow(this.flock.tick);
    this.studio.toast.show(`Saved at step ${this.flock.tick.toLocaleString()}`);
  }

  restoreSave(): void {
    if (this.busy || isCapturing()) return;
    if (this.history.comparing) this.toggleCompare();
    if (this.history.restoreSave()) this.studio.toast.show("Restored the save point");
  }

  toggleCompare(): void {
    if (!this.history.hasSave || this.busy) return;
    const on = !this.history.comparing;
    this.history.comparing = on;
    if (on) {
      this.comparingPlaying = !this.clock.paused;
      this.clock.paused = true;
      this.view.split = 0.5;
      this.studio.toast.show("A · save point on the left, B · now on the right — move across the water to wipe");
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
      canUndo: false,
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
    if (id === "shark") {
      return {
        id,
        label: "Shark",
        icon: "shark",
        hint: "Move to hunt · hold to lunge · right-drag or two fingers to pan",
        paints: true,
        options: () => this.sharkOptions(),
      };
    }
    return { id: "pan", label: "Look", icon: "hand", hint: "Drag to pan · scroll or pinch to zoom · double-click to fit" };
  }

  private sharkOptions(): HTMLElement {
    const s = slider({
      label: "Size",
      symbol: "fear radius",
      min: 4,
      max: 40,
      step: 1,
      value: this.sharkSize,
      format: (v) => `${v}`,
      unit: " r",
      hint: "How far away the fish feel the shark, in units of their own reach r.",
      onInput: (v) => this.setSharkSize(v),
    });
    return h("div", { class: "sw-options" }, s.el);
  }

  selectTool(id: string): void {
    this.studio.root.dataset["tool"] = id;
    if (id !== "shark") this.shark.target = null;
  }

  private toWorld(x: number, y: number): [number, number] {
    const [dx, dy] = this.camera.screenToDomain(x, y);
    const W = this.flock.halfW * 2;
    const H = this.flock.halfH * 2;
    const wx = ((dx % W) + W) % W;
    const wy = ((dy % H) + H) % H;
    return [wx - this.flock.halfW, wy - this.flock.halfH];
  }

  private toolHandlers(): ToolHandlers {
    const sharkTool = (): boolean => this.studio.rail.active === "shark" && this.scene.shark;
    return {
      paints: () => sharkTool(),
      down: (x, y) => {
        if (!sharkTool()) return;
        this.shark.target = this.toWorld(x, y);
        this.shark.lunging = true;
      },
      move: (x, y) => {
        if (sharkTool()) this.shark.target = this.toWorld(x, y);
      },
      up: (_x, _y, e) => {
        this.shark.lunging = false;
        // a touch lifts the shark out of the water; a mouse keeps hovering
        if (e.pointerType === "touch") this.shark.target = null;
      },
      hover: (x, y) => {
        if (this.history.comparing && x !== null) {
          this.view.split = Math.min(Math.max(x / Math.max(this.camera.viewW, 1), 0), 1);
        }
        if (!sharkTool()) return;
        this.shark.target = x === null || y === null ? null : this.toWorld(x, y);
      },
    };
  }

  /** Move the shark towards the pointer (a creature, not a cursor) and fade it in or out. */
  private updateShark(dt: number): void {
    const s = this.shark;
    const W = this.flock.halfW * 2;
    const H = this.flock.halfH * 2;
    if (s.target) {
      if (s.presence === 0) {
        s.x = s.target[0];
        s.y = s.target[1];
      }
      // shortest way round the torus
      let dx = s.target[0] - s.x;
      let dy = s.target[1] - s.y;
      dx -= W * Math.round(dx / W);
      dy -= H * Math.round(dy / H);
      const k = 1 - Math.exp(-dt / (s.lunging ? 0.09 : 0.2));
      const nx = s.x + dx * k;
      const ny = s.y + dy * k;
      const vx = (nx - s.x) / Math.max(dt, 1e-3);
      const vy = (ny - s.y) / Math.max(dt, 1e-3);
      s.vx += (vx - s.vx) * Math.min(1, dt * 8);
      s.vy += (vy - s.vy) * Math.min(1, dt * 8);
      s.x = nx - W * Math.floor((nx + this.flock.halfW) / W);
      s.y = ny - H * Math.floor((ny + this.flock.halfH) / H);
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > s.radius * 0.05) {
        const target = Math.atan2(s.vy, s.vx);
        let dh = target - s.heading;
        dh -= Math.PI * 2 * Math.round(dh / (Math.PI * 2));
        s.heading += dh * Math.min(1, dt * 6);
      }
      s.presence = Math.min(1, s.presence + dt / 0.35);
      s.seen += dt;
    } else {
      s.presence = Math.max(0, s.presence - dt / 0.5);
      s.lunging = false;
    }
    s.lunge += ((s.lunging ? 1 : 0) - s.lunge) * Math.min(1, dt * 10);
    if (s.lunging) s.lunged += dt;
    this.flock.fear =
      s.presence > 0 && this.scene.shark
        ? { x: s.x, y: s.y, radius: s.radius, strength: FEAR * (s.lunging ? LUNGE : 1) * s.presence }
        : null;
  }

  sharkView(): SharkView | null {
    const s = this.shark;
    if (s.presence <= 0 || !this.scene.shark) return null;
    return { x: s.x, y: s.y, heading: s.heading, length: s.radius * 0.62, radius: s.radius, presence: s.presence, lunge: s.lunge };
  }

  private setCallouts(): void {
    const s = this.scene;
    const near = (): [number, number] | null => {
      const v = this.sharkView();
      if (!v) return null;
      const [sx, sy] = this.camera.domainToScreen(v.x + this.flock.halfW, v.y + this.flock.halfH);
      return [sx, sy - v.radius * this.camera.pxPerUnit - 14];
    };
    this.studio.callouts.set(
      s.shark
        ? [
            {
              id: "you-are-the-shark",
              text: "You are the shark",
              detail: "Fish within the ring turn away from you",
              style: "pin",
              anchor: near,
              when: () => this.shark.seen > 0.4 && this.shark.seen < 4.5 && this.shark.lunged === 0,
            },
            {
              id: "flash-expansion",
              text: "Flash expansion",
              detail: "The school bursts outward, then re-forms behind you",
              style: "pin",
              anchor: near,
              when: () => this.shark.lunged > 0.15 && this.shark.lunged < 3.5,
            },
          ]
        : [
            {
              id: "proof-flock",
              text: "4,096 fish — the proofs' own run",
              style: "label",
              anchor: () => [this.camera.viewW / 2, this.camera.viewH * 0.22],
              when: () => performance.now() - this.sceneT0 > 600 && performance.now() - this.sceneT0 < 6000,
            },
          ],
    );
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
    // the capture lock: the live loop yields entirely while a capture or proof runs
    if (isCapturing() || this.busy || this.inFlight) return;
    if (this.profiler?.source === "submit-latency" && this.governor) this.governor.sample(dt * 1000, now);
    const rect = this.studio.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.governor?.renderScale ?? 1;
    this.hdr.resize(rect.width, rect.height, dpr, scale);
    this.camera.setViewport(rect.width, rect.height);
    this.camera.update(dt, now);
    const effects = this.governor?.effects ?? 1;
    this.hdr.bloom.intensity = effects > 0 ? BLOOM : 0;
    this.updateShark(dt);

    this.profiler?.begin();
    const n = this.history.comparing ? 0 : this.clock.due(dt);
    this.ticksEma += (n - this.ticksEma) * 0.1;
    const enc = this.device.createCommandEncoder({ label: "swarm-frame" });
    this.flock.encodeSteps(enc, n, { timestampWrites: n > 0 ? this.profiler?.pass("sim") : undefined });
    this.clock.advance(n);
    this.stepsTotal += n;

    // the live order parameters, every few frames (exact integer reduction)
    let orderTick = -1;
    if (n > 0 && this.orderSlot && !this.orderSlot.pending && ++this.orderFrame % 6 === 0) {
      this.flock.encodeReduce(enc, this.profiler?.pass("order"));
      this.orderSlot.record(enc, this.flock.partialsBuffer);
      orderTick = this.flock.tick;
    }

    const save = this.history.comparing ? this.history.savePoint : null;
    this.view.encode(
      enc,
      this.hdr.sceneView,
      this.hdr.width,
      this.hdr.height,
      this.camera,
      dpr * scale,
      { boids: this.flock.boids, n: this.flock.n, halfW: this.flock.halfW, halfH: this.flock.halfH },
      save ? save.boids : null,
      this.sharkView(),
      this.profiler ?? undefined,
    );
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
    if (orderTick >= 0) void this.collectOrder(orderTick);

    this.studio.callouts.update(this.camera.viewW, this.camera.viewH);
    if (now - this.rateT0 > 1000) {
      this.stepsPerSecond = ((this.stepsTotal - this.rateTick0) * 1000) / (now - this.rateT0);
      this.rateT0 = now;
      this.rateTick0 = this.stepsTotal;
    }
    const steps = this.flock.tick;
    this.studio.transport.setClock(
      this.clock.paused ? `step ${steps.toLocaleString()}` : `step ${steps.toLocaleString()} · ${Math.round(this.stepsPerSecond).toLocaleString()}/s`,
    );
    this.hooks.onFrame?.(now);
  }

  private async collectOrder(tick: number): Promise<void> {
    const slot = this.orderSlot;
    const flock = this.flock;
    if (!slot) return;
    const ab = await slot.collect();
    if (!ab || flock !== this.flock) return;
    const o = orderParams(sumPartials(new Int32Array(ab), flock.groups));
    this.order = o;
    this.hooks.onOrder?.(o, tick);
  }

  /**
   * Split the measured GPU frame into solver and render cost: the solver's
   * share adapts the tick cap (the chosen speed is honoured up to what fits
   * the frame budget); the governor only sees the frame cost at 1× speed.
   */
  adaptToTimings(passes: readonly PassTiming[], budgetMs: number): number | null {
    const sim = passes.filter((p) => p.name === "sim").reduce((a, p) => a + p.ms, 0);
    const render = passes.filter((p) => p.name !== "sim").reduce((a, p) => a + p.ms, 0);
    const base = this.clock.ticksPerSecond / 60;
    if (this.ticksEma < 0.5 || sim <= 0) return render;
    const perTick = sim / this.ticksEma;
    const fit = Math.floor((budgetMs - render) / perTick);
    this.clock.maxTicksPerFrame = Math.min(MAX_STEPS_PER_PASS, Math.max(Math.ceil(base), fit));
    return render + perTick * base;
  }

  // ---------------------------------------------------- test hooks --

  /** Run `n` steps now (no shark), then wait. */
  async advance(n: number): Promise<void> {
    while (n > 0) {
      const k = Math.min(MAX_STEPS_PER_PASS, n);
      const enc = this.device.createCommandEncoder();
      this.flock.encodeSteps(enc, k, { pure: true });
      this.device.queue.submit([enc.finish()]);
      n -= k;
    }
    await this.device.queue.onSubmittedWorkDone();
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  dispose(): void {
    this.disposed = true;
  }
}
