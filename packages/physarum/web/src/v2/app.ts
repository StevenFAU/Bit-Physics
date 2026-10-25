// Slime Mould — the app controller. Wires the Field Studies shell, the render
// core and the runtime around the live simulation: scenes, personalities,
// the Look / Food / Light / Probe tools, Tune, edit events with undo by
// replay, history (save / restore / A-B), URL state, the scene directors, the
// quality governor and profiling. The gate path (proof/gate.ts) is not
// reachable from here except through the Prove drawer's buttons.

import type { GpuContext, GpuProfiler, PassTiming, Tier } from "@bp/gpu";
import { lowerTier, rememberTier } from "@bp/gpu";
import type { HdrPipeline } from "@bp/render";
import { Camera2D } from "@bp/render";
import type { Checkpointer, QualityGovernor, SimEvent } from "@bp/runtime";
import { EventLog, History, SimClock } from "@bp/runtime";
import type { CameraLike, Studio, ToolHandlers, ToolSpec } from "@bp/studio";
import { CanvasInput, h, segmented, slider } from "@bp/studio";
import { isCapturing } from "@bp/verify";
import type { Checkpoint, EnvSpec, SeedSpec, Shares, Spot } from "./model/sim.js";
import { LiveKernels, LiveSim } from "./model/sim.js";
import { AGENTS, gridFor, tierGrid } from "./model/grid.js";
import type { JonesParams } from "./proof/gate.js";
import { H as GATED_H, NA as GATED_N, PARAMS, W as GATED_W, fetchCanonicalIC } from "./proof/gate.js";
import type { GlowView } from "./render/glow-view.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";
import type { PadPoint } from "./pad.js";
import { CORNERS, PAD_JITTER, nearestOffered, padParams, padPointOf } from "./pad.js";
import type { SceneDef, SceneId, ToolId } from "./scenes.js";
import type { Analysis } from "./model/analysis.js";
import { analyse } from "./model/analysis.js";
import type { Maze } from "./maze.js";
import { geodesic, makeMaze } from "./maze.js";
import { RIVALRY, SCENES, colonySites, crumbRadius, lightDrift, lightRadius, nextCrumb, sameParams, sceneById } from "./scenes.js";
import { COLONIES } from "./render/look.js";

/** Solver steps per second at 1× (spec: T3 2 steps per frame at 60 fps). */
const TICK_RATE: Record<Tier, number> = { T3: 120, T2: 120, T1: 60 };
/** Reorder agents by tile every this many steps (measured: see sortEvery in the bench). */
export const SORT_EVERY = 32;
/** Replay at most this many steps for an undo; further back is a plain restore. */
const REPLAY_CAP = 3600;
/** Undo depth by tier: a T3 checkpoint holds ~49 MB of agents and trail. */
const UNDO_DEPTH: Record<Tier, number> = { T3: 3, T2: 5, T1: 8 };
/** Most crumbs a dish holds (the visitor's and the director's). */
const MAX_FOOD = 48;
/** The director's crumbs stop once the dish holds this many. */
const DIRECTOR_FOOD = 24;
/** Light Avoidance's untouched drift moves the light every this many steps. */
const DRIFT_EVERY = 16;

export interface LiveMass {
  /** f64 sum of the live trail. */
  mass: number;
  /** The closed form's total after the same steps (through every parameter change). */
  predicted: number;
  /** Where the current parameters settle: (d·N + F)·(1−α)/α. */
  equilibrium: number;
  tick: number;
  /** Territories: each colony's plane, summed (f64), beside its own prediction. */
  colonies?: { mass: number; predicted: number }[];
}

/** Territories: who holds the dish now, and each colony's agents. */
export interface TerritoryReading {
  tick: number;
  shares: Shares;
  agents: number[];
}

export interface SceneOptions {
  seed?: number;
  params?: JonesParams;
  pad?: PadPoint | null;
  palette?: PaletteId;
  camera?: { cx: number; cy: number; zoom: number };
  /** Territories: how many colonies (2–4), the rivalry, each colony's personality (null: the shared one; undefined: the scene's), and a mixed start. */
  colonies?: number;
  rivalry?: number;
  colonyPads?: (PadPoint | null | undefined)[];
  mixed?: boolean;
  /** Test hook (morphology regression): a dish of this many agents at the declared density, instead of the tier's. */
  agents?: number;
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onParams?: (p: JonesParams, pad: PadPoint | null) => void;
  onEdited?: () => void;
  onFrame?: (now: number) => void;
  onAnalysis?: (a: Analysis) => void;
  onTerritory?: (t: TerritoryReading) => void;
  onColonies?: () => void;
}

interface AppCheckpoint {
  cp: Checkpoint;
  logIndex: number;
  pad: PadPoint | null;
  strokes: number[][];
  colonyPads: (PadPoint | null)[];
}

type ParamsPayload = { g: number; p: number[]; pad: number[] | null };
type SpotsPayload = { g: number; spots: number[][] };
/** Every wall stroke since the scene started: [x0, y0, x1, y1, radius, erase (0|1)]. */
type WallsPayload = { g: number; strokes: number[][] };
/** Territories: the rivalry and each colony's pad point ([i, j], or null: the shared personality). */
type ColoniesPayload = { g: number; rivalry: number; pads: (number[] | null)[] };

const packSpots = (s: readonly Spot[]): number[][] => s.map((q) => [q.x, q.y, q.r]);
const unpackSpots = (s: readonly number[][]): Spot[] => s.map(([x, y, r]) => ({ x: x!, y: y!, r: r! }));

export class App {
  readonly gpu: GpuContext;
  readonly device: GPUDevice;
  readonly studio: Studio;
  readonly hdr: HdrPipeline;
  readonly view: GlowView;
  readonly kernels: LiveKernels;
  readonly camera = new Camera2D();
  readonly clock: SimClock;
  readonly history: History<AppCheckpoint>;
  readonly log = new EventLog();
  readonly input: CanvasInput;
  tier: Tier;
  sim!: LiveSim;
  scene: SceneDef = SCENES[0]!;
  seed = 1;
  palette: PaletteId = "ember";
  /** The personality on the pad (null: custom numbers, or a scene of the gated rule). */
  pad: PadPoint | null = null;
  /** Edits since the scene loaded (for Prove's live honesty and the directors). */
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
  /** Bumped by every loadScene; a load that is no longer the latest gives up. */
  private loadSeq = 0;
  private foldT = 0;
  /** Scene director: fading out (+1) towards a re-scatter, or back in (−1). */
  private directing = 0;
  private fade = 1;
  /** Crumbs the director has added this scene. */
  private directorCrumbs = 0;
  /** Edit groups: one per gesture (a click, a drag); undo removes a whole group. */
  private group = 0;
  private activeGroup = 0;
  private applied = 0;
  private lightSize = 1;
  /** The Maze scene's maze (for scoring). */
  maze: Maze | null = null;
  /** The scene's own walls, before any stroke. */
  private baseWalls: Uint32Array | null = null;
  /** Wall strokes so far, and the brush. */
  private strokes: number[][] = [];
  private wallLast: [number, number] | null = null;
  wallSize = 1;
  wallErase = false;
  /** The latest score (Connect the Cities, The Maze). */
  analysis: Analysis | null = null;
  private markerKey = "";
  /** Territories: each colony's personality (null: follows the shared one) and the rivalry. */
  colonyPads: (PadPoint | null)[] = [];
  rivalry = RIVALRY;
  /** Territories: every agent dealt to a colony at random on the whole dish, instead of colonies released apart. */
  mixed = false;
  /** Territories: the latest reading of who holds the dish. */
  territory: TerritoryReading | null = null;
  private territoryDue = 0;
  private territoryBusy = false;

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
    this.probeBuf = this.device.createBuffer({ size: 8 * COLONIES.length, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "phys-probe" });
    const cp: Checkpointer<AppCheckpoint> = {
      capture: () => ({ cp: this.sim.checkpoint(), logIndex: this.log.length, pad: this.pad, strokes: this.strokes.slice(), colonyPads: this.colonyPads.slice() }),
      restore: (c) => {
        this.sim.restore(c.cp);
        this.pad = c.pad;
        this.strokes = c.strokes.slice();
        this.colonyPads = c.colonyPads.slice();
        this.rivalry = c.cp.rivalry;
        this.hooks.onColonies?.();
        this.view.invalidate();
        this.hooks.onParams?.(this.sim.params, this.pad);
      },
      release: (c) => this.sim.release(c.cp),
    };
    this.history = new History(cp, UNDO_DEPTH[tier]);
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
    const gated = scene.kind === "gated";
    // Loads can overlap: the gated scene awaits its IC asset while the scene
    // picker stays live. Only the latest load may install a simulation, and
    // a superseded one returns before it allocates anything.
    const seq = ++this.loadSeq;
    let packed: Float32Array<ArrayBuffer> | null = null;
    if (gated) {
      const ic = await fetchCanonicalIC();
      if (seq !== this.loadSeq) return;
      packed = new Float32Array(GATED_N * 4);
      for (let i = 0; i < GATED_N; i += 1) {
        packed[i * 4] = ic.pos[i * 2]!;
        packed[i * 4 + 1] = ic.pos[i * 2 + 1]!;
        packed[i * 4 + 2] = ic.head[i * 2]!;
        packed[i * 4 + 3] = ic.head[i * 2 + 1]!;
      }
    }
    // from here to the end the load is synchronous: nothing can interleave
    this.busy = true;
    try {
      this.history.clear();
      this.log.clear();
      this.strokes = [];
      this.wallLast = null;
      this.applied = 0;
      this.group = 0;
      this.activeGroup = 0;
      this.view.split = null;
      const old = this.sim as LiveSim | undefined;
      const rect = this.studio.canvas.getBoundingClientRect();
      const grid = gated ? { w: GATED_W, h: GATED_H, n: GATED_N } : o.agents ? gridFor(o.agents, rect.width, rect.height) : tierGrid(this.tier, rect.width, rect.height);
      this.seed = o.seed ?? 1;
      // the personality: as asked, else the scene's; parameters follow it unless given
      this.pad = scene.personality ? (o.pad !== undefined ? o.pad : nearestOffered(scene.personality, this.tier)) : null;
      const params = o.params ?? (this.pad ? padParams(this.pad) : scene.params);
      if (this.pad && !sameParams(params, padParams(this.pad))) this.pad = padPointOf(params);
      const colonies = scene.colonies ? Math.max(2, Math.min(COLONIES.length, Math.round(o.colonies ?? scene.colonies))) : 1;
      const sim = new LiveSim(this.device, this.kernels, {
        ...grid,
        params,
        // the gated scene keeps the gated kernel's arithmetic exactly
        longRun: !gated,
        sortEvery: gated ? 0 : SORT_EVERY,
        colonies,
      });
      if (scene.personality) sim.setTurning(PAD_JITTER);
      this.colonyPads =
        colonies > 1
          ? Array.from({ length: colonies }, (_, k) => {
              const given = o.colonyPads?.[k];
              return given !== undefined ? given : (scene.colonyPads?.[k] ?? null);
            })
          : [];
      this.rivalry = o.rivalry ?? RIVALRY;
      this.mixed = colonies > 1 && !!o.mixed;
      if (colonies > 1) sim.setColonies(this.colonyParamsFor(), this.rivalry);
      // the environment first: a growing colony's seed must not wake on food
      if (scene.env) sim.setEnv(scene.env(grid.w, grid.h, this.seed));
      if (packed) sim.load(packed);
      else sim.seed(this.seedSpec(scene, grid.w, grid.h, this.seed, colonies));
      this.sim = sim;
      old?.destroy();
      this.maze = scene.score === "maze" ? makeMaze(grid.w, grid.h, this.seed) : null;
      this.scoredTick = -1;
      this.scoreDue = 0;
      this.baseWalls = sim.envSpec?.walls ?? null;
      this.analysis = null;
      this.territory = null;
      this.territoryDue = 0;
      this.view.forgetBuffers();
      this.scene = scene;
      // hunger is the new scene's (it reads this.scene)
      this.updateHunger();
      this.edits = 0;
      this.directing = 0;
      this.directorCrumbs = 0;
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
      this.studio.rail.setTools(
        scene.tools.map((t) => this.toolSpec(t)),
        scene.tool,
      );
      this.studio.root.dataset["tool"] = scene.tool;
      this.studio.heading.setCurrent(scene.listed ? scene.id : "");
      this.studio.heading.set(scene.title, scene.prompt);
      this.setCallouts();
      this.syncMarkers();
      this.governor?.acknowledgeRestart();
      this.syncTransport();
      this.hooks.onSceneChange?.(scene);
      this.hooks.onParams?.(sim.params, this.pad);
      this.hooks.onColonies?.();
    } finally {
      this.busy = false;
    }
  }

  /** A scene's starting agents; territories place one disc per colony (or deal every agent to a colony: mixed). */
  private seedSpec(scene: SceneDef, w: number, h: number, seed: number, colonies: number): SeedSpec {
    const spec = scene.seed!(w, h, seed);
    if (colonies > 1 && this.mixed) return { mode: 0, seed };
    if (colonies > 1) {
      const c = colonySites(w, h, colonies);
      return { ...spec, colonies: c.sites, radius: c.radius };
    }
    return spec;
  }

  /** Territories: each colony's parameters (null: the shared personality). */
  private colonyParamsFor(): (JonesParams | null)[] {
    return this.colonyPads.map((p) => (p ? padParams(p) : null));
  }

  /** Restart the current scene from its starting state (same seed, same grid, current personality). */
  async restart(): Promise<void> {
    if (this.governor?.simStepDownPending && this.tier !== "T1" && this.scene.kind === "live") {
      this.tier = lowerTier(this.tier);
      rememberTier(this.gpu.adapterId, this.tier);
      this.clock.ticksPerSecond = TICK_RATE[this.tier];
      this.studio.toast.show(`Restarted with fewer agents (${AGENTS[this.tier].toLocaleString()}) to hold the frame rate`);
    }
    await this.loadScene(this.scene.id, { seed: this.seed, params: this.sim.params, pad: this.pad, palette: this.palette, ...this.colonyOptions() });
  }

  /** Territories: the options that restart the same match-up (none elsewhere). */
  colonyOptions(): Pick<SceneOptions, "colonies" | "rivalry" | "colonyPads" | "mixed"> {
    if (this.sim.colonies < 2) return {};
    return { colonies: this.sim.colonies, rivalry: this.rivalry, colonyPads: this.colonyPads.slice(), mixed: this.mixed };
  }

  /** Territories: how many colonies (a restart from the scene's start, same seed). */
  async setColonyCount(n: number): Promise<void> {
    if (this.blocked("change the colonies") || !this.scene.colonies || n === this.sim.colonies) return;
    // colonies the dish already had keep their personalities; new ones start at the scene's
    const pads = Array.from({ length: n }, (_, k) => (k < this.colonyPads.length ? this.colonyPads[k] : undefined));
    await this.loadScene(this.scene.id, { ...this.colonyOptions(), seed: this.seed, params: this.sim.params, pad: this.pad, palette: this.palette, colonies: n, colonyPads: pads });
    this.writeUrl();
  }

  /** Territories: release the colonies apart, or deal every agent to a colony at random (a restart, same seed). */
  async setMixed(mixed: boolean): Promise<void> {
    if (this.blocked("change the start") || !this.scene.colonies || mixed === this.mixed) return;
    await this.loadScene(this.scene.id, { ...this.colonyOptions(), seed: this.seed, params: this.sim.params, pad: this.pad, palette: this.palette, mixed });
    this.writeUrl();
  }

  /** Territories: one colony's personality (null: the shared one) — one edit. */
  setColonyPad(k: number, p: PadPoint | null): void {
    if (this.blocked("change a colony") || this.sim.colonies < 2) return;
    const pads = this.colonyPads.slice();
    pads[k] = p;
    this.beginEdit();
    this.editEvent("colonies", { g: this.activeGroup, rivalry: this.rivalry, pads: pads.map((q) => (q ? [q.i, q.j] : null)) });
    this.activeGroup = 0;
    this.writeUrl();
  }

  /** Territories: the rivalry (a drag is one edit). */
  setRivalry(v: number, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change the rivalry") || this.sim.colonies < 2) return;
    if (phase === "start" || this.activeGroup === 0) this.beginEdit();
    this.editEvent("colonies", { g: this.activeGroup, rivalry: v, pads: this.colonyPads.map((q) => (q ? [q.i, q.j] : null)) });
    if (phase === "end") {
      this.activeGroup = 0;
      this.writeUrl();
    }
  }

  /** Is the live view exactly the gated run (gated scene, canonical parameters, no edits)? */
  get onGatedRun(): boolean {
    return this.scene.kind === "gated" && this.edits === 0 && sameParams(this.sim.params, PARAMS);
  }

  /** The personality's name on the pad, if it is a named corner. */
  get personalityName(): string | null {
    const p = this.pad;
    if (!p) return null;
    const c = CORNERS.find((k) => k.at.i === p.i && k.at.j === p.j);
    return c ? c.name : `explorer–forager ${p.i + 1} of 5, fine–bold ${p.j + 1} of 5`;
  }

  // ------------------------------------------------------------- look --

  setPalette(id: PaletteId, announce = true): void {
    const p = PALETTES[id];
    this.palette = id;
    this.view.look = { ...this.view.look, palette: p };
    document.documentElement.style.setProperty("--sim-accent", p.accent);
    if (announce) this.writeUrl();
  }

  // ------------------------------------------------------------ edits --

  private beginEdit(): number {
    this.group += 1;
    this.history.beforeEdit(this.group, this.sim.tick);
    this.activeGroup = this.group;
    this.edits += 1;
    this.hooks.onEdited?.();
    return this.group;
  }

  /**
   * Log an edit at the current step boundary and apply it now. A drag
   * coalesces into one event per step per group: changes at the same
   * boundary have no steps between them, so only the last can matter.
   */
  private editEvent(kind: "params" | "food" | "light" | "walls" | "colonies", payload: ParamsPayload | SpotsPayload | WallsPayload | ColoniesPayload): void {
    const all = this.log.all();
    const last = all[all.length - 1];
    const lp = last?.payload as { g?: number } | undefined;
    if (last && last.kind === kind && last.tick === this.sim.tick && lp?.g === payload.g && payload.g !== 0) {
      (last as SimEvent).payload = payload as never;
      this.applyEvent(last);
      return;
    }
    const e = this.log.push(this.sim.tick, kind, payload as never);
    this.applied = this.log.length;
    this.applyEvent(e);
  }

  private applyEvent(e: SimEvent): void {
    if (e.kind === "params") {
      const p = e.payload as ParamsPayload;
      const [delta_phi_deg, L_sense, L_move, deposit, decay_alpha] = p.p as [number, number, number, number, number];
      this.sim.setParams({ delta_phi_deg, L_sense, L_move, deposit, decay_alpha });
      this.pad = p.pad ? { i: p.pad[0]!, j: p.pad[1]! } : null;
    } else if (e.kind === "colonies") {
      const c = e.payload as ColoniesPayload;
      this.rivalry = c.rivalry;
      this.colonyPads = c.pads.map((q) => (q ? { i: q[0]!, j: q[1]! } : null));
      this.sim.setColonies(this.colonyParamsFor(), this.rivalry);
      this.hooks.onColonies?.();
    } else if (e.kind === "walls") {
      const env = this.envOrDefault();
      this.strokes = (e.payload as WallsPayload).strokes.map((s) => s.slice());
      this.sim.setEnv({ ...env, walls: this.wallsWith(this.strokes) });
      this.view.invalidate();
    } else {
      const spots = unpackSpots((e.payload as SpotsPayload).spots);
      const env = this.envOrDefault();
      this.sim.setEnv(e.kind === "food" ? { ...env, food: spots } : { ...env, lights: spots });
      this.syncMarkers();
      this.view.invalidate();
    }
    this.updateHunger();
  }

  /** The scene's own walls with the visitor's strokes drawn over them (capsules; erase strokes clear). */
  private wallsWith(strokes: readonly number[][]): Uint32Array | null {
    const w = this.sim.w;
    const h = this.sim.h;
    if (!this.baseWalls && strokes.length === 0) return null;
    const bits = this.baseWalls ? this.baseWalls.slice() : new Uint32Array(Math.ceil((w * h) / 32));
    for (const [x0, y0, x1, y1, r, erase] of strokes as [number, number, number, number, number, number][]) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const L2 = dx * dx + dy * dy;
      for (let y = Math.max(1, Math.floor(Math.min(y0, y1) - r)); y <= Math.min(h - 2, Math.ceil(Math.max(y0, y1) + r)); y += 1) {
        for (let x = Math.max(1, Math.floor(Math.min(x0, x1) - r)); x <= Math.min(w - 2, Math.ceil(Math.max(x0, x1) + r)); x += 1) {
          const t = L2 > 0 ? Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / L2)) : 0;
          if ((x + 0.5 - x0 - t * dx) ** 2 + (y + 0.5 - y0 - t * dy) ** 2 > r * r) continue;
          const c = y * w + x;
          if (erase) bits[c >> 5]! &= ~(1 << (c & 31));
          else bits[c >> 5]! |= 1 << (c & 31);
        }
      }
    }
    // never wall over a crumb
    for (const f of this.sim.envSpec?.food ?? []) {
      for (let y = Math.floor(f.y - f.r - 2); y <= Math.ceil(f.y + f.r + 2); y += 1) {
        for (let x = Math.floor(f.x - f.r - 2); x <= Math.ceil(f.x + f.r + 2); x += 1) {
          if (x < 0 || y < 0 || x >= w || y >= h || (x - f.x) ** 2 + (y - f.y) ** 2 > (f.r + 2) ** 2) continue;
          const c = y * w + x;
          bits[c >> 5]! &= ~(1 << (c & 31));
        }
      }
    }
    return bits;
  }

  /** The scene's environment, or a fresh one for a scene that had none. */
  private envOrDefault(): EnvSpec {
    const w = this.sim.w;
    const h = this.sim.h;
    return this.sim.envSpec ?? { food: [], lights: [], walls: null, foodDeposit: 40, scent: 4, scentRange: Math.min(w, h) * 0.3, light: 60 };
  }

  private paramsEvent(p: JonesParams, pad: PadPoint | null): void {
    this.editEvent("params", { g: this.activeGroup, p: [p.delta_phi_deg, p.L_sense, p.L_move, p.deposit, p.decay_alpha], pad: pad ? [pad.i, pad.j] : null });
  }

  /** Pick a personality on the pad (one edit). */
  setPad(p: PadPoint): void {
    if (this.blocked("change the personality")) return;
    if (!this.scene.personality) return;
    this.beginEdit();
    this.paramsEvent(padParams(p), p);
    this.activeGroup = 0;
    this.hooks.onParams?.(this.sim.params, this.pad);
    this.writeUrl();
  }

  setParams(p: JonesParams, phase: "start" | "move" | "end" = "end"): void {
    if (this.blocked("change the parameters")) return;
    if (phase === "start" || this.activeGroup === 0) this.beginEdit();
    this.paramsEvent(p, padPointOf(p));
    if (phase === "end") this.activeGroup = 0;
    this.hooks.onParams?.(p, this.pad);
    if (phase === "end") this.writeUrl();
  }

  /** Back to the scene's own personality and parameters. */
  resetParams(): void {
    if (this.blocked("reset the parameters")) return;
    this.beginEdit();
    this.paramsEvent(this.scene.personality ? padParams(this.scene.personality) : this.scene.params, this.scene.personality);
    this.activeGroup = 0;
    this.hooks.onParams?.(this.sim.params, this.pad);
    this.writeUrl();
  }

  /** Toggle a crumb at a dish point: remove the one under it, or add one. */
  toggleFood(x: number, y: number): void {
    if (this.blocked("feed it")) return;
    if (this.scene.kind !== "live") return;
    const env = this.envOrDefault();
    const w = this.sim.w;
    const h = this.sim.h;
    const px = ((x % w) + w) % w;
    const py = ((y % h) + h) % h;
    const r = crumbRadius(w, h);
    const near = (f: Spot): number => {
      let dx = Math.abs(f.x - px);
      let dy = Math.abs(f.y - py);
      dx = Math.min(dx, w - dx);
      dy = Math.min(dy, h - dy);
      return Math.hypot(dx, dy);
    };
    const hit = env.food.findIndex((f) => near(f) < Math.max(f.r * 2.2, 6 / this.camera.pxPerUnit));
    let food: Spot[];
    if (hit >= 0) food = env.food.filter((_, i) => i !== hit);
    else if (env.food.length >= MAX_FOOD) {
      this.studio.toast.show(`The dish holds ${MAX_FOOD} crumbs at most — click one to remove it`);
      return;
    } else food = [...env.food, { x: px, y: py, r }];
    this.beginEdit();
    this.editEvent("food", { g: this.activeGroup, spots: packSpots(food) });
    this.activeGroup = 0;
    this.writeUrl();
  }

  /** Take every crumb away (one edit): an empty map for the visitor's own cities. */
  clearFood(): void {
    if (this.blocked("feed it") || this.scene.kind !== "live") return;
    if (!this.sim.envSpec?.food.length) return;
    this.beginEdit();
    this.editEvent("food", { g: this.activeGroup, spots: [] });
    this.activeGroup = 0;
    this.studio.toast.show("All food taken away — click to place your own");
  }

  /** Move the light (the first; place one if there is none). */
  private moveLight(x: number, y: number): void {
    const env = this.envOrDefault();
    const w = this.sim.w;
    const h = this.sim.h;
    const r = lightRadius(w, h) * this.lightSize;
    const at = { x: ((x % w) + w) % w, y: ((y % h) + h) % h, r };
    const lights = env.lights.length ? [at, ...env.lights.slice(1)] : [at];
    this.editEvent("light", { g: this.activeGroup, spots: packSpots(lights) });
  }

  /** Wall brush radius on this dish (cells). */
  get wallRadius(): number {
    return Math.max(2, Math.min(this.sim.w, this.sim.h) * 0.012 * this.wallSize);
  }

  /** Extend the current wall stroke to a dish point (part of the active edit). */
  private wallTo(x: number, y: number): void {
    const last = this.wallLast ?? [x, y];
    if (this.wallLast && Math.hypot(x - last[0], y - last[1]) < this.wallRadius * 0.5) return;
    this.strokes = [...this.strokes, [last[0], last[1], x, y, this.wallRadius, this.wallErase ? 1 : 0]];
    this.wallLast = [x, y];
    this.editEvent("walls", { g: this.activeGroup, strokes: this.strokes.map((s) => s.slice()) });
  }

  /** Switch the light off (one edit). */
  lightOff(): void {
    if (this.blocked("switch the light off")) return;
    if (!this.sim.envSpec?.lights.length) return;
    this.beginEdit();
    this.editEvent("light", { g: this.activeGroup, spots: [] });
    this.activeGroup = 0;
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
    if (this.history.restoreSave()) {
      this.applied = this.log.length;
      this.syncMarkers();
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
      this.view.split = 0.5;
      this.studio.toast.show("A · save point on the left, B · now on the right — move across the dish to wipe");
    } else {
      this.view.split = null;
      this.clock.paused = !this.comparingPlaying;
    }
    this.syncTransport();
  }

  /**
   * Undo the last edit: restore the checkpoint taken just before it, then
   * replay every later edit at its own step (the solver is deterministic, so
   * the replay lands on the same bytes the dish would have had without it).
   */
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
      this.pad = snap.pad;
      this.strokes = snap.strokes.slice();
      this.colonyPads = snap.colonyPads.slice();
      this.rivalry = snap.cp.rivalry;
      this.log.load(kept);
      this.applied = snap.logIndex;
      const span = target - snap.cp.tick;
      if (span > REPLAY_CAP) {
        this.log.truncate(snap.logIndex);
        this.studio.toast.show("Restored the moment before that edit (too far back to replay the rest)");
      } else {
        this.studio.toast.show(span > 600 ? "Undoing — replaying everything since…" : "Undone");
        await this.replayTo(target);
      }
      this.history.release(snap);
      this.edits = Math.max(0, this.edits - 1);
      this.view.invalidate();
      this.syncMarkers();
      this.hooks.onParams?.(this.sim.params, this.pad);
      this.hooks.onColonies?.();
      this.hooks.onEdited?.();
      this.writeUrl();
    } finally {
      this.busy = false;
      this.syncTransport();
    }
  }

  /** Run to `target`, applying each logged event at its own step. */
  private async replayTo(target: number): Promise<void> {
    const all = this.log.all();
    let chunks = 0;
    for (;;) {
      while (this.applied < all.length && all[this.applied]!.tick <= this.sim.tick) this.applyEvent(all[this.applied++]!);
      if (this.sim.tick >= target) break;
      const next = this.applied < all.length ? all[this.applied]!.tick : Infinity;
      const k = Math.min(64, target - this.sim.tick, next - this.sim.tick);
      const enc = this.device.createCommandEncoder({ label: "phys-replay" });
      this.sim.encodeSteps(enc, k);
      this.device.queue.submit([enc.finish()]);
      chunks += 1;
      if (chunks % 16 === 0) {
        await this.device.queue.onSubmittedWorkDone();
        if (this.sim.logged && this.sim.unfoldedSteps > 4096) await this.sim.foldMass();
      }
    }
    await this.device.queue.onSubmittedWorkDone();
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

  toolSpec(id: ToolId): ToolSpec {
    switch (id) {
      case "probe":
        return { id, label: "Probe", icon: "probe", hint: "Point anywhere to read the trail and the agents crossing there" };
      case "wall":
        return {
          id,
          label: "Wall",
          icon: "wall",
          hint: "Drag to build a wall the mould cannot cross",
          paints: true,
          options: () => {
            const size = slider({
              label: "Wall width",
              min: 0.5,
              max: 3,
              step: 0.05,
              value: this.wallSize,
              unit: "×",
              onInput: (v) => {
                this.wallSize = v;
              },
            });
            const mode = segmented(
              "Wall tool",
              [
                { value: "draw", label: "Build" },
                { value: "erase", label: "Clear" },
              ],
              this.wallErase ? "erase" : "draw",
              (v) => {
                this.wallErase = v === "erase";
              },
            );
            return h("div", { class: "ph-light-options" }, mode.el, size.el);
          },
        };
      case "food":
        return {
          id,
          label: "Food",
          icon: "food",
          hint: "Click to drop a crumb · click a crumb to take it away",
          options: () => {
            const clear = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Remove all food");
            clear.addEventListener("click", () => this.clearFood());
            return clear;
          },
        };
      case "light":
        return {
          id,
          label: "Light",
          icon: "light",
          hint: "Drag to shine the light — the mould avoids it",
          paints: true,
          options: () => {
            const size = slider({
              label: "Light size",
              min: 0.5,
              max: 2,
              step: 0.05,
              value: this.lightSize,
              unit: "×",
              onInput: (v) => {
                this.lightSize = v;
              },
            });
            const off = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Switch off");
            off.addEventListener("click", () => this.lightOff());
            return h("div", { class: "ph-light-options" }, size.el, off);
          },
        };
      default:
        return { id: "pan", label: "Look", icon: "hand", hint: "Drag to pan · scroll or pinch to zoom · double-click to fit" };
    }
  }

  selectTool(id: string): void {
    this.studio.root.dataset["tool"] = id;
    if (id !== "probe") this.studio.probe.hidden = true;
  }

  private toolHandlers(): ToolHandlers {
    return {
      paints: () => !!this.studio.rail.activeTool?.paints,
      down: (x, y) => {
        const tool = this.studio.rail.active;
        if ((tool !== "light" && tool !== "wall") || this.blocked(tool === "wall" ? "build walls" : "move the light")) return;
        if (this.scene.kind !== "live") return;
        this.beginEdit();
        const [dx, dy] = this.camera.screenToDomain(x, y);
        if (tool === "light") this.moveLight(dx, dy);
        else {
          this.wallLast = [dx, dy];
          this.wallTo(dx, dy);
        }
      },
      move: (x, y) => {
        if (this.activeGroup === 0) return;
        const [dx, dy] = this.camera.screenToDomain(x, y);
        if (this.studio.rail.active === "light") this.moveLight(dx, dy);
        else if (this.studio.rail.active === "wall") this.wallTo(dx, dy);
      },
      up: () => {
        if (this.activeGroup !== 0) this.writeUrl();
        this.activeGroup = 0;
        this.wallLast = null;
      },
      hover: (x, y) => {
        this.hover = x === null || y === null ? null : [x, y];
        if (this.history.comparing && x !== null) {
          this.view.split = Math.min(Math.max(x / Math.max(this.camera.viewW, 1), 0), 1);
        }
      },
      tap: (x, y) => {
        const tool = this.studio.rail.active;
        if (tool === "probe") {
          this.hover = [x, y];
          this.probeDue = 0;
        } else if (tool === "food") {
          const [dx, dy] = this.camera.screenToDomain(x, y);
          this.toggleFood(dx, dy);
        }
      },
    };
  }

  /** Food, lights and the food tool's preview crumb → the renderer (only when they change). */
  private syncMarkers(): void {
    const env = this.sim?.envSpec;
    const list: { x: number; y: number; r: number; kind: 0 | 1 | 2 }[] = [];
    for (const f of env?.food ?? []) list.push({ x: f.x, y: f.y, r: f.r, kind: 0 });
    for (const l of env?.lights ?? []) list.push({ x: l.x, y: l.y, r: l.r, kind: 1 });
    if (this.hover && this.studio.rail.active === "food" && this.scene.kind === "live" && !this.history.comparing) {
      const [x, y] = this.camera.screenToDomain(this.hover[0], this.hover[1]);
      list.push({ x, y, r: crumbRadius(this.sim.w, this.sim.h), kind: 2 });
    }
    const key = list.map((m) => `${m.x.toFixed(1)},${m.y.toFixed(1)},${m.r.toFixed(1)},${m.kind}`).join(";");
    if (key === this.markerKey) return;
    this.markerKey = key;
    this.view.setMarkers(list);
  }

  private setCallouts(): void {
    const s = this.scene;
    const text: Partial<Record<SceneId, string>> = {
      gated: "256 × 256 — the gated dish, tiled",
      "first-light": "A colony, waking — the crumbs are food",
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
    // a growing colony's mass prediction folds in its awake counts about once a second
    if (this.sim.logged && this.sim.unfoldedSteps > 0 && now - this.foldT > 1000) {
      this.foldT = now;
      void this.sim.foldMass().catch(() => {});
    }
    this.profiler?.begin();
    const n = this.history.comparing ? 0 : this.clock.due(dt);
    this.ticksEma += (n - this.ticksEma) * 0.1;
    let enc = this.device.createCommandEncoder({ label: "phys-frame" });
    enc = this.encodeDirected(enc, n);
    this.clock.advance(n);
    this.stepsTotal += n;
    this.syncMarkers();

    // probe: one cell of the trail and of the last deposit
    let probeIdx = -1;
    if (this.hover && this.studio.rail.active === "probe" && now > this.probeDue && !this.probeBusy) {
      const [x, y] = this.camera.screenToDomain(this.hover[0], this.hover[1]);
      const ix = ((Math.floor(x) % this.sim.w) + this.sim.w) % this.sim.w;
      const iy = ((Math.floor(y) % this.sim.h) + this.sim.h) % this.sim.h;
      probeIdx = iy * this.sim.w + ix;
      enc.copyBufferToBuffer(this.sim.trail, probeIdx * 4, this.probeBuf, 0, 4);
      enc.copyBufferToBuffer(this.sim.lastDeposit, probeIdx * 4, this.probeBuf, 4, 4);
      // territories: the other colonies' planes, and their deposits
      for (let k = 1; k < this.sim.colonies; k += 1) {
        enc.copyBufferToBuffer(this.sim.trail, (k * this.sim.cells + probeIdx) * 4, this.probeBuf, 8 * k, 4);
        enc.copyBufferToBuffer(this.sim.lastDeposit, (k * this.sim.cells + probeIdx) * 4, this.probeBuf, 8 * k + 4, 4);
      }
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
        env: this.sim.env,
        walls: !!this.sim.envSpec?.walls,
        colonies: this.sim.colonies,
        colonyMeans: Array.from({ length: this.sim.colonies }, (_, k) => this.sim.colonyMean(k)),
      },
      save ? { trail: save.cp.trail, key: `cp-${this.compareKey}` } : null,
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
    this.autoScore(now);
    this.autoTerritory(now);
    this.updateRing();
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

  /** The Wall tool's brush ring under the pointer. */
  private updateRing(): void {
    const ring = this.studio.ring;
    if (this.studio.rail.active !== "wall" || !this.hover || this.history.comparing) {
      ring.classList.remove("is-shown");
      return;
    }
    const r = this.wallRadius * this.camera.pxPerUnit;
    ring.style.width = `${r * 2}px`;
    ring.style.height = `${r * 2}px`;
    ring.style.transform = `translate(${this.hover[0] - r}px, ${this.hover[1] - r}px)`;
    ring.classList.add("is-shown");
  }

  /** Is the scene untouched and running, so its director may act? */
  private get untouched(): boolean {
    return this.edits === 0 && !this.clock.paused && !this.history.hasSave && this.scene.kind === "live";
  }

  /** The step at which the director's next step-exact action is due (Infinity: none). */
  private directorDue(): number {
    const d = this.scene.director;
    if (!d || !this.untouched) return Infinity;
    const t = this.sim.tick;
    if (d.kind === "drift") return Math.ceil((t + 1) / DRIFT_EVERY) * DRIFT_EVERY;
    if (d.kind === "crumb") {
      if ((this.sim.envSpec?.food.length ?? 0) >= DIRECTOR_FOOD) return Infinity;
      // the next multiple of everySteps that is not in the past: an edit
      // holds the director, so after an undo it may have missed some, and
      // it never catches up on them (or gets stuck on one)
      return Math.max(this.directorCrumbs + 1, Math.ceil(t / d.everySteps)) * d.everySteps;
    }
    return Infinity;
  }

  /**
   * Record `n` steps, stopping at exactly the steps where an untouched
   * scene's director acts (so the run does not depend on frame timing):
   * the steps so far are submitted, the action applied, and recording goes
   * on in a fresh encoder, which is returned.
   */
  private encodeDirected(enc: GPUCommandEncoder, n: number): GPUCommandEncoder {
    let left = n;
    let timing = this.profiler ? (name: "sim" | "sort") => this.profiler!.pass(name) : undefined;
    while (left > 0) {
      let due = this.directorDue();
      // never act on a step already past (defence: the loop must always progress)
      if (due < this.sim.tick) due = Infinity;
      const seg = Math.min(left, Math.max(0, due - this.sim.tick));
      if (seg > 0) {
        this.sim.encodeSteps(enc, seg, timing);
        timing = undefined;
        left -= seg;
      }
      if (this.sim.tick === due) {
        this.device.queue.submit([enc.finish()]);
        this.directorAct();
        enc = this.device.createCommandEncoder({ label: "phys-frame-cont" });
      }
    }
    return enc;
  }

  /** The director's step-exact action, logged so a replay sees it too. */
  private directorAct(): void {
    const d = this.scene.director!;
    const env = this.envOrDefault();
    if (d.kind === "drift") {
      const at = lightDrift(this.sim.w, this.sim.h, this.sim.tick);
      const lights = env.lights.length ? [{ ...env.lights[0]!, ...at }, ...env.lights.slice(1)] : [];
      this.editEvent("light", { g: 0, spots: packSpots(lights) });
    } else if (d.kind === "crumb") {
      this.directorCrumbs += 1;
      const c = nextCrumb(this.sim.w, this.sim.h, this.seed, this.directorCrumbs, env.food);
      this.editEvent("food", { g: 0, spots: packSpots([...env.food, c]) });
    }
  }

  /**
   * The re-scatter director: an untouched, playing scene whose network has
   * pruned itself fades out, scatters the agents again from the next seed,
   * and fades back in. Any edit, a save point or a pause holds the dish.
   */
  private direct(dt: number): void {
    const d = this.scene.director;
    const FADE_S = 0.8;
    if (this.directing === 0) {
      if (!d || d.kind !== "rescatter" || !this.untouched || this.sim.tick < d.everySteps) return;
      this.directing = 1;
    }
    if (this.directing === 1) {
      this.fade = Math.max(0, this.fade - dt / FADE_S);
      if (this.fade === 0) {
        this.seed += 1;
        this.sim.seed(this.seedSpec(this.scene, this.sim.w, this.sim.h, this.seed, this.sim.colonies));
        this.log.clear();
        this.applied = 0;
        this.clock.reset();
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
      const x = idx % this.sim.w;
      const y = Math.floor(idx / this.sim.w);
      const p = this.studio.probe;
      p.hidden = false;
      p.innerHTML = "";
      const perAgent = this.sim.params.deposit * 65536;
      if (this.sim.colonies > 1) {
        // territories: each colony's trail here, against its own mean
        const rows: HTMLElement[] = [];
        let agents = 0;
        for (let k = 0; k < this.sim.colonies; k += 1) {
          const t = new Float32Array(ab, 8 * k, 1)[0]!;
          agents += new Uint32Array(ab, 8 * k + 4, 1)[0]! / perAgent;
          rows.push(h("dt", {}, `${COLONIES[k]!.name} trail`), h("dd", {}, `${(t / this.sim.colonyMean(k)).toFixed(2)}× its mean`));
        }
        p.append(h("strong", {}, `Cell ${x}, ${y}`), h("dl", {}, ...rows, h("dt", {}, "Agents here, last step"), h("dd", {}, Math.round(agents).toLocaleString())));
      } else {
        const trail = new Float32Array(ab, 0, 1)[0]!;
        const dep = new Uint32Array(ab, 4, 1)[0]!;
        const agents = dep / perAgent;
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
      }
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

  /** Run `n` steps now (with the live loop paused, nothing else steps), then wait. */
  async advance(n: number): Promise<void> {
    const target = this.sim.tick + n;
    let since = 0;
    while (this.sim.tick < target) {
      let enc = this.device.createCommandEncoder();
      const k = Math.min(64, target - this.sim.tick);
      enc = this.encodeDirected(enc, k);
      this.device.queue.submit([enc.finish()]);
      since += k;
      // the awake log holds AWAKE_RING steps: fold well before it wraps
      if (this.sim.logged && since >= 4096) {
        since = 0;
        await this.sim.foldMass();
      }
    }
    await this.device.queue.onSubmittedWorkDone();
  }

  /**
   * Total mass of the live trail (f64 sum of the f32 field) with the closed
   * form's prediction for the same step. Both readbacks are queued now,
   * after every step submitted so far, so they hold exactly `tick` steps.
   */
  async liveMass(): Promise<LiveMass> {
    const sim = this.sim;
    const tick = sim.tick;
    const equilibrium = sim.equilibriumMass;
    const [, trail] = await Promise.all([sim.foldMass(), sim.readTrail()]);
    const predicted = sim.predictedMass;
    let mass = 0;
    for (let i = 0; i < trail.length; i += 1) mass += trail[i]!;
    const per = sim.predictedColonies;
    if (!per) return { mass, predicted, equilibrium, tick };
    // territories: plane by plane
    const colonies = per.map((p, k) => {
      let m = 0;
      for (let i = k * sim.cells; i < (k + 1) * sim.cells; i += 1) m += trail[i]!;
      return { mass: m, predicted: p };
    });
    return { mass, predicted, equilibrium, tick, colonies };
  }

  /** Territories: read who holds the dish now (a GPU count, queued after every step so far). */
  async readTerritory(): Promise<TerritoryReading | null> {
    const sim = this.sim;
    if (sim.colonies < 2) return null;
    const tick = sim.tick;
    const [shares, agents] = await Promise.all([sim.shares(), sim.colonyCounts()]);
    if (sim !== this.sim) return null;
    const t = { tick, shares, agents };
    this.territory = t;
    this.hooks.onTerritory?.(t);
    return t;
  }

  /** Territories: read the shares about twice a second while the dish changes. */
  private autoTerritory(now: number): void {
    if (this.sim.colonies < 2 || this.territoryBusy || now < this.territoryDue || this.history.comparing) return;
    if (this.territory && this.territory.tick === this.sim.tick) return;
    this.territoryBusy = true;
    this.territoryDue = now + 500;
    void this.readTerritory()
      .catch(() => null)
      .finally(() => {
        this.territoryBusy = false;
      });
  }

  /**
   * Score the dish now: read the trail back (queued after every step so
   * far), extract the network and measure it (CPU, at a reduced resolution
   * on big dishes).
   */
  async analyse(): Promise<Analysis | null> {
    const sim = this.sim;
    const kind = this.scene.score ?? null;
    const tick = sim.tick;
    const trail = await sim.readTrail();
    if (sim !== this.sim) return null;
    const env = sim.envSpec;
    const step = sim.w * sim.h > 1.5e6 ? 2 : 1;
    const args: Parameters<typeof analyse> = [trail, sim.w, sim.h, env?.food ?? [], env?.walls ?? null, kind, this.maze, tick, step];
    let a: Analysis;
    try {
      a = await this.inWorker(args);
    } catch {
      a = analyse(...args);
    }
    if (sim !== this.sim) return null;
    this.analysis = a;
    this.hooks.onAnalysis?.(a);
    return a;
  }

  private worker: Worker | null = null;
  private workerSeq = 0;
  private readonly workerWaits = new Map<number, { ok: (a: Analysis) => void; fail: (e: Error) => void }>();

  /** Run the scoring in a worker (the trail buffer is moved, not copied). */
  private inWorker(args: Parameters<typeof analyse>): Promise<Analysis> {
    if (!this.worker) {
      this.worker = new Worker(new URL("./model/analysis-worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<{ id: number; r?: Analysis; error?: string }>) => {
        const w = this.workerWaits.get(e.data.id);
        if (!w) return;
        this.workerWaits.delete(e.data.id);
        if (e.data.r) w.ok(e.data.r);
        else w.fail(new Error(e.data.error ?? "scoring failed"));
      };
    }
    const id = ++this.workerSeq;
    return new Promise((ok, fail) => {
      this.workerWaits.set(id, { ok, fail });
      this.worker!.postMessage({ id, args }, [args[0].buffer]);
    });
  }

  /** Score about every two seconds while a scored scene changes. */
  private scoreDue = 0;
  private scoreBusy = false;
  private scoredTick = -1;
  private autoScore(now: number): void {
    if (!this.scene.score || this.scoreBusy || now < this.scoreDue || this.sim.tick === this.scoredTick || this.history.comparing) return;
    // the network needs time to form: no score in the first second of a scene
    if (this.sim.tick < 120) return;
    this.scoreBusy = true;
    this.scoreDue = now + 2000;
    this.scoredTick = this.sim.tick;
    void this.analyse()
      .catch(() => null)
      .finally(() => {
        this.scoreBusy = false;
      });
  }

  /** Score now (the card's button). */
  scoreNow(): void {
    this.scoreDue = 0;
    this.scoredTick = -1;
  }

  /**
   * Hunger follows the shortest route between the first two crumbs through
   * the walls: an agent may wander `hungerPerRoute` × its length (in its own
   * steps) before it is taken back to food. Re-measured after every wall or
   * food edit and personality change, as part of applying the edit, so a
   * replay sees the same limits.
   */
  private updateHunger(): void {
    const k = this.scene.hungerPerRoute;
    const env = this.sim.envSpec;
    if (!k || !env?.walls || env.food.length < 2) {
      if (this.sim.hungerMax !== null) this.sim.setHunger(null);
      return;
    }
    const g = geodesic(env.walls, this.sim.w, this.sim.h, [env.food[0]!.x, env.food[0]!.y], [env.food[1]!.x, env.food[1]!.y]);
    const route = Number.isFinite(g.length) ? g.length : this.sim.w + this.sim.h;
    this.sim.setHunger(Math.round((k * route) / Math.max(this.sim.params.L_move, 0.1)));
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  dispose(): void {
    this.disposed = true;
    this.worker?.terminate();
  }
}

/** Bloom mix for the glow (foundation default for emissive content: ≤ 0.08). */
export const BLOOM = 0.08;
