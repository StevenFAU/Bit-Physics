// Slime Mould — the app controller. Wires the Field Studies shell, the render
// core and the runtime around the live simulation: scenes, the Look and Probe
// tools, Tune, history (save / restore / A-B), URL state, the quality governor
// and profiling. The gate path (proof/gate.ts) is not reachable from here
// except through the Prove drawer's buttons.

import type { GpuContext, GpuProfiler, PassTiming, Tier } from "@bp/gpu";
import { lowerTier, rememberTier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { Camera2D } from "@bp/render";
import type { Checkpointer, QualityGovernor } from "@bp/runtime";
import { History, SimClock } from "@bp/runtime";
import type { CameraLike, Studio, ToolHandlers, ToolSpec } from "@bp/studio";
import { CanvasInput, h } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import type { Checkpoint } from "./model/sim.js";
import { LiveKernels, LiveSim } from "./model/sim.js";
import { AGENTS, tierGrid } from "./model/grid.js";
import type { JonesParams } from "./proof/gate.js";
import { H as GATED_H, NA as GATED_N, PARAMS, W as GATED_W, fetchCanonicalIC } from "./proof/gate.js";
import type { GlowView } from "./render/glow-view.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { SCENES, sameParams, sceneById } from "./scenes.js";

/** Solver steps per second at 1× (spec: T3 2 steps per frame at 60 fps). */
const TICK_RATE: Record<Tier, number> = { T3: 120, T2: 120, T1: 60 };
/** Reorder agents by tile every this many steps (measured: see sortEvery in the bench). */
export const SORT_EVERY = 32;

export interface SceneOptions {
  seed?: number;
  params?: JonesParams;
  palette?: PaletteId;
  camera?: { cx: number; cy: number; zoom: number };
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onParams?: (p: JonesParams) => void;
  onEdited?: () => void;
  onFrame?: (now: number) => void;
}

export class App {
  readonly gpu: GpuContext;
  readonly device: GPUDevice;
  readonly studio: Studio;
  readonly hdr: HdrPipeline;
  readonly view: GlowView;
  readonly kernels: LiveKernels;
  readonly camera = new Camera2D();
  readonly clock: SimClock;
  readonly history: History<Checkpoint>;
  readonly input: CanvasInput;
  tier: Tier;
  sim!: LiveSim;
  scene: SceneDef = SCENES[0]!;
  seed = 1;
  palette: PaletteId = "ember";
  /** Parameter edits since the scene loaded (for Prove's live honesty). */
  edits = 0;
  /** Solver steps run since the page loaded (never reset: rates, the bench). */
  stepsTotal = 0;
  hooks: AppHooks = {};
  learnOpen = false;
  governor: QualityGovernor | null = null;
  profiler: GpuProfiler | null = null;
  onSnapshot: ((b: Blob) => void) | null = null;
  writeUrl: () => void = () => {};

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
  private hover: [number, number] | null = null;
  private probeDue = 0;
  private probeBusy = false;
  private readonly probeBuf: GPUBuffer;
  private snapshotWanted = false;
  private comparingPlaying = true;
  private compareKey = 0;
  private sceneT0 = performance.now();
  /** Step of the last parameter change (the mass relaxes to its new equilibrium from there). */
  paramsTick = 0;
  /** Scene director: fading out (+1) towards a re-scatter, or back in (−1). */
  private directing = 0;
  private fade = 1;

  constructor(gpu: GpuContext, studio: Studio, hdr: HdrPipeline, view: GlowView, kernels: LiveKernels, tier: Tier) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.studio = studio;
    this.hdr = hdr;
    this.view = view;
    this.kernels = kernels;
    this.tier = tier;
    this.clock = new SimClock(TICK_RATE[tier], 16);
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera.maxPxPerUnit = 24;
    this.probeBuf = this.device.createBuffer({ size: 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "phys-probe" });
    const cp: Checkpointer<Checkpoint> = {
      capture: () => this.sim.checkpoint(),
      restore: (c) => {
        this.sim.restore(c);
        this.paramsTick = c.tick;
        this.view.invalidate();
        this.hooks.onParams?.(this.sim.params);
      },
      release: (c) => this.sim.release(c),
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
    this.busy = true;
    try {
      this.history.clear();
      this.view.split = null;
      const old = this.sim as LiveSim | undefined;
      const rect = this.studio.canvas.getBoundingClientRect();
      const gated = scene.kind === "gated";
      const grid = gated ? { w: GATED_W, h: GATED_H, n: GATED_N } : tierGrid(this.tier, rect.width, rect.height);
      this.seed = o.seed ?? 1;
      const sim = new LiveSim(this.device, this.kernels, {
        ...grid,
        params: o.params ?? scene.params,
        // the gated scene keeps the gated kernel's arithmetic exactly
        longRun: !gated,
        sortEvery: gated ? 0 : SORT_EVERY,
      });
      if (gated) {
        const ic = await fetchCanonicalIC();
        const packed = new Float32Array(GATED_N * 4);
        for (let i = 0; i < GATED_N; i += 1) {
          packed[i * 4] = ic.pos[i * 2]!;
          packed[i * 4 + 1] = ic.pos[i * 2 + 1]!;
          packed[i * 4 + 2] = ic.head[i * 2]!;
          packed[i * 4 + 3] = ic.head[i * 2 + 1]!;
        }
        sim.load(packed);
      } else {
        sim.seed(scene.seed!(grid.w, grid.h, this.seed));
      }
      this.sim = sim;
      old?.destroy();
      this.view.forgetBuffers();
      this.scene = scene;
      this.edits = 0;
      this.paramsTick = 0;
      this.directing = 0;
      this.fade = 1;
      this.view.fade = 1;
      this.clock.reset();
      this.sceneT0 = performance.now();
      this.camera.setViewport(rect.width, rect.height);
      this.camera.setDomain(grid.w, grid.h, true);
      if (o.camera) {
        this.camera.set({ cx: o.camera.cx * grid.w, cy: o.camera.cy * grid.h, pxPerUnit: this.camera.coverZoom() * o.camera.zoom });
      } else {
        // the gated dish is small: show it tiled (the periodic domain repeats), two copies across
        this.camera.fit(gated ? 0.5 : 1);
      }
      this.setPalette(o.palette ?? scene.palette, false);
      this.hdr.resetExposure();
      this.studio.rail.setTools([this.toolSpec("pan"), this.toolSpec("probe")], "pan");
      this.studio.root.dataset["tool"] = "pan";
      this.studio.heading.setCurrent(scene.listed ? scene.id : "");
      this.studio.heading.set(scene.title, scene.prompt);
      this.setCallouts();
      this.governor?.acknowledgeRestart();
      this.syncTransport();
      this.hooks.onSceneChange?.(scene);
      this.hooks.onParams?.(sim.params);
    } finally {
      this.busy = false;
    }
  }

  /** Restart the current scene from its starting state (same seed, same grid, current parameters). */
  async restart(): Promise<void> {
    if (this.governor?.simStepDownPending && this.tier !== "T1" && this.scene.kind === "live") {
      this.tier = lowerTier(this.tier);
      rememberTier(this.gpu.adapterId, this.tier);
      this.clock.ticksPerSecond = TICK_RATE[this.tier];
      this.studio.toast.show(`Restarted with fewer agents (${AGENTS[this.tier].toLocaleString()}) to hold the frame rate`);
    }
    await this.loadScene(this.scene.id, { seed: this.seed, params: this.sim.params, palette: this.palette });
  }

  /** Is the live view exactly the gated run (gated scene, canonical parameters, no edits)? */
  get onGatedRun(): boolean {
    return this.scene.kind === "gated" && this.edits === 0 && sameParams(this.sim.params, PARAMS);
  }

  // ------------------------------------------------------------- look --

  setPalette(id: PaletteId, announce = true): void {
    const p = PALETTES[id];
    this.palette = id;
    this.view.look = { ...this.view.look, palette: p };
    document.documentElement.style.setProperty("--sim-accent", p.accent);
    if (announce) this.writeUrl();
  }

  // ------------------------------------------------------- parameters --

  setParams(p: JonesParams, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change the parameters")) return;
    if (phase === "start") this.edits += 1;
    this.sim.setParams(p);
    this.paramsTick = this.sim.tick;
    this.hooks.onParams?.(p);
    this.hooks.onEdited?.();
    if (phase === "end") this.writeUrl();
  }

  /** Back to the scene's own parameters. */
  resetParams(): void {
    if (this.blocked("reset the parameters")) return;
    this.edits += 1;
    this.sim.setParams(this.scene.params);
    this.paramsTick = this.sim.tick;
    this.hooks.onParams?.(this.scene.params);
    this.hooks.onEdited?.();
    this.writeUrl();
  }

  // ------------------------------------------------------------ history --

  savePoint(): void {
    if (this.blocked("save")) return;
    this.history.savePointNow(this.sim.tick);
    this.compareKey += 1;
    this.studio.toast.show(`Saved at step ${this.sim.tick.toLocaleString()}`);
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
    if (id === "probe") {
      return { id, label: "Probe", icon: "probe", hint: "Point anywhere to read the trail and the agents crossing there" };
    }
    return { id: "pan", label: "Look", icon: "hand", hint: "Drag to pan · scroll or pinch to zoom · double-click to fit" };
  }

  selectTool(id: string): void {
    this.studio.root.dataset["tool"] = id;
    if (id !== "probe") this.studio.probe.hidden = true;
  }

  private toolHandlers(): ToolHandlers {
    return {
      paints: () => false,
      down: () => {},
      move: () => {},
      up: () => {},
      hover: (x, y) => {
        this.hover = x === null || y === null ? null : [x, y];
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

  private setCallouts(): void {
    const s = this.scene;
    const text: Partial<Record<SceneId, string>> = {
      gated: "256 × 256 — the gated dish, tiled",
    };
    const t = text[s.id];
    this.studio.callouts.set(
      t
        ? [
            {
              id: `intro-${s.id}`,
              text: t,
              style: "pin",
              anchor: () => this.camera.domainToScreen(this.sim.w / 2, this.sim.h / 2 - (s.kind === "gated" ? 18 : this.sim.h * 0.09)),
              when: () => performance.now() - this.sceneT0 > 600 && performance.now() - this.sceneT0 < 7000,
            },
          ]
        : [],
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
    // the capture lock: the live loop yields entirely while a capture runs
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

    this.direct(dt);
    this.profiler?.begin();
    const n = this.history.comparing ? 0 : this.clock.due(dt);
    this.ticksEma += (n - this.ticksEma) * 0.1;
    const enc = this.device.createCommandEncoder({ label: "phys-frame" });
    this.sim.encodeSteps(enc, n, this.profiler ? (name) => this.profiler!.pass(name) : undefined);
    this.clock.advance(n);
    this.stepsTotal += n;

    // probe: one cell of the trail and of the last deposit
    let probeIdx = -1;
    if (this.hover && this.studio.rail.active === "probe" && now > this.probeDue && !this.probeBusy) {
      const [x, y] = this.camera.screenToDomain(this.hover[0], this.hover[1]);
      const ix = ((Math.floor(x) % this.sim.w) + this.sim.w) % this.sim.w;
      const iy = ((Math.floor(y) % this.sim.h) + this.sim.h) % this.sim.h;
      probeIdx = iy * this.sim.w + ix;
      enc.copyBufferToBuffer(this.sim.trail, probeIdx * 4, this.probeBuf, 0, 4);
      enc.copyBufferToBuffer(this.sim.lastDeposit, probeIdx * 4, this.probeBuf, 4, 4);
      this.probeBusy = true;
      this.probeDue = now + 70;
    }

    const save = this.history.comparing ? this.history.savePoint : null;
    this.view.encode(
      enc,
      this.hdr.sceneView,
      this.hdr.width,
      this.hdr.height,
      this.camera,
      dpr * scale,
      {
        w: this.sim.w,
        h: this.sim.h,
        trail: this.sim.trail,
        deposit: this.sim.lastDeposit,
        agents: this.sim.agents,
        n: this.sim.n,
        meanTrail: this.sim.meanTrail,
        depositPerAgent: this.sim.params.deposit,
        version: this.sim.tick * 4 + this.sim.sorts,
      },
      save ? { trail: save.trail, key: `cp-${this.compareKey}` } : null,
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
    if (probeIdx >= 0) void this.readProbe(probeIdx);
    else if (!this.hover) this.studio.probe.hidden = true;

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
   * The scene director: an untouched, playing scene whose network has pruned
   * itself fades out, scatters the agents again from the next seed, and fades
   * back in. Any edit, a save point or a pause holds the current dish.
   */
  private direct(dt: number): void {
    const d = this.scene.director;
    const FADE_S = 0.8;
    if (this.directing === 0) {
      if (!d || this.edits > 0 || this.clock.paused || this.history.hasSave || this.sim.tick < d.everySteps) return;
      this.directing = 1;
    }
    if (this.directing === 1) {
      this.fade = Math.max(0, this.fade - dt / FADE_S);
      if (this.fade === 0) {
        this.seed += 1;
        this.sim.seed(this.scene.seed!(this.sim.w, this.sim.h, this.seed));
        this.clock.reset();
        this.paramsTick = 0;
        this.view.invalidate();
        this.hdr.resetExposure();
        this.directing = -1;
        this.writeUrl();
      }
    } else {
      this.fade = Math.min(1, this.fade + dt / FADE_S);
      if (this.fade === 1) this.directing = 0;
    }
    this.view.fade = this.fade;
  }

  private async readProbe(idx: number): Promise<void> {
    try {
      await this.probeBuf.mapAsync(GPUMapMode.READ);
      const ab = this.probeBuf.getMappedRange().slice(0);
      this.probeBuf.unmap();
      if (!this.hover) return;
      const trail = new Float32Array(ab, 0, 1)[0]!;
      const dep = new Uint32Array(ab, 4, 1)[0]!;
      const agents = dep / (this.sim.params.deposit * 65536);
      const x = idx % this.sim.w;
      const y = Math.floor(idx / this.sim.w);
      const p = this.studio.probe;
      p.hidden = false;
      p.innerHTML = "";
      p.append(
        h("strong", {}, `Cell ${x}, ${y}`),
        h(
          "dl",
          {},
          h("dt", {}, "Trail"),
          h("dd", {}, trail.toFixed(2)),
          h("dt", {}, "× the dish's mean"),
          h("dd", {}, (trail / this.sim.meanTrail).toFixed(2)),
          h("dt", {}, "Agents here, last step"),
          h("dd", {}, Math.round(agents).toLocaleString()),
        ),
      );
      const [hx, hy] = this.hover;
      const left = Math.min(hx + 18, this.camera.viewW - 200);
      const top = Math.min(hy + 18, this.camera.viewH - 140);
      p.style.transform = `translate(${left}px, ${top}px)`;
    } catch {
      /* mapping raced a scene change — next sample */
    } finally {
      this.probeBusy = false;
    }
  }

  /**
   * Split the measured GPU frame into solver and render cost. The solver's
   * share adapts the tick cap (the chosen speed is honoured up to what fits
   * the frame budget); the governor only sees the frame cost at 1× speed, so
   * a high speed never costs render quality or agent count.
   */
  adaptToTimings(passes: readonly PassTiming[], budgetMs: number): number | null {
    const sim = passes.filter((p) => p.name === "sim" || p.name === "sort").reduce((a, p) => a + p.ms, 0);
    const render = passes.filter((p) => p.name !== "sim" && p.name !== "sort").reduce((a, p) => a + p.ms, 0);
    const base = this.clock.ticksPerSecond / 60;
    if (this.ticksEma < 0.5 || sim <= 0) return render;
    const perTick = sim / this.ticksEma;
    const fit = Math.floor((budgetMs - render) / perTick);
    this.clock.maxTicksPerFrame = Math.min(16, Math.max(Math.ceil(base), fit));
    return render + perTick * base;
  }

  // ---------------------------------------------------- test hooks --

  /** Run `n` steps now, then wait. */
  async advance(n: number): Promise<void> {
    while (n > 0) {
      const k = Math.min(64, n);
      const enc = this.device.createCommandEncoder();
      this.sim.encodeSteps(enc, k);
      this.device.queue.submit([enc.finish()]);
      n -= k;
    }
    await this.device.queue.onSubmittedWorkDone();
  }

  /** Total mass of the live trail (f64 sum of the f32 field). */
  async liveMass(): Promise<{ mass: number; equilibrium: number; tick: number; settledSteps: number }> {
    const tick = this.sim.tick;
    const eq = this.sim.equilibriumMass;
    const settledSteps = tick - this.paramsTick;
    const trail = await this.sim.readTrail();
    let mass = 0;
    for (let i = 0; i < trail.length; i += 1) mass += trail[i]!;
    return { mass, equilibrium: eq, tick, settledSteps };
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  dispose(): void {
    this.disposed = true;
  }
}

/** Bloom mix for the glow (foundation default for emissive content: ≤ 0.08). */
export const BLOOM = 0.08;
