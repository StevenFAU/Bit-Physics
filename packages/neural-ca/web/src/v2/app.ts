// Grow — the app controller. Wires the Field Studies shell, the render core
// and the runtime around the live dishes: scenes, the Look / Cut / Seed /
// Graft / Freeze / Probe tools, edits as step-stamped events (undo = restore
// + replay), save / restore / A-B, the scene director, the instruments, and
// the frame loop.
//
// M1: a scene holds one dish or, in the Menagerie, one dish per organism, all
// on one clock. Every dish runs the gated kernel with its own weights; an
// edit names the dish it lands on, so the event log, undo, save points and
// replay cover every dish at once.
//
// The frame loop records ONE command encoder per frame: any edits due at this
// step boundary, the dishes' steps, background jobs from the FrameScheduler in
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
import { CanvasInput, h, segmented, slider } from "@bp/studio";
import { isCapturing, sha256hex } from "@bp/verify";
import type { Block, CellStep } from "./model/cell-math.js";
import { stepCell } from "./model/cell-math.js";
import type { LiveCheckpoint, LiveKernels, LiveStats, Stamp } from "./model/live.js";
import { LiveNca, MAX_STEPS_PER_ENCODE } from "./model/live.js";
import type { Organism, OrganismLibrary } from "./model/organisms.js";
import { heals } from "./model/organisms.js";
import type { HiddenBasis } from "./model/pca.js";
import { hiddenBasis } from "./model/pca.js";
import { CANONICAL_SEED, CN, FIRE_RATE, GRID } from "./proof/gate.js";
import type { DishRenderer, ViewMode } from "./render/dish-view.js";
import { DEFAULT_LOOK, DishView } from "./render/dish-view.js";
import type { FrameScheduler } from "./runtime/scheduler.js";
import type { SceneDef, SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";

/** Solver steps per second at 1× — growth from one cell takes ~3 s. */
export const TICKS_PER_SECOND = 30;
/** Undo replays at most this many steps; further back is a plain restore. */
const REPLAY_CAP = 8000;
const STATS_EVERY_MS = 200;
const CELL_EVERY_MS = 150;
/** Dish radius in grid widths: the 64 × 64 grid sits inside the glass with room to spare. */
const DISH_RADIUS = 0.74;
/** The profiler pass name of the dishes' steps (and its scheduler cost). */
export const STEP_PASS = "nca";
/** Most dishes a scene holds (the stats readback is sized for it). */
const MAX_DISHES = 12;
/** Inside the Cell: the camera's zoom over the dish's fit. */
const CELL_ZOOM = 3;

export const TOOLS = ["pan", "cut", "seed", "graft", "freeze", "probe"] as const;

export interface SceneOptions {
  seed?: number;
  fireRate?: number;
  view?: ViewMode;
  camera?: { cx: number; cy: number; zoom: number };
  /** The director's regrow: fade the new dish in. */
  fadeIn?: boolean;
  /** The organism on a one-dish scene (an id from the menagerie). */
  organism?: string;
  /** Inside the Cell: the inspected cell. */
  cell?: [number, number];
}

export interface AppHooks {
  onSceneChange?: (scene: SceneDef) => void;
  onEdited?: () => void;
  onStats?: (s: LiveStats) => void;
  onBasis?: (b: HiddenBasis | null) => void;
  onFrame?: (now: number) => void;
  /** Inside the Cell: a fresh look at the inspected cell (null when the scene is not open). */
  onCell?: (c: CellReport | null) => void;
}

/** One dish of a scene: its solver, its view, its organism, and where it sits. */
export interface Dish {
  sim: LiveNca;
  view: DishView;
  org: Organism;
  /** The grid's (0, 0) corner in the camera's domain (cells). */
  origin: [number, number];
  stats: LiveStats | null;
  basis: HiddenBasis | null;
}

/** Inside the Cell: the inspected cell's step as worked on the CPU, and the last check against the GPU. */
export interface CellReport {
  step: CellStep;
  organism: string;
  /** The neighbourhood the step was worked from. */
  block: Block;
  /** max |Δ| between the GPU's state for this cell and the CPU prediction made one step earlier (null: not yet checked). */
  check: { maxAbs: number; tick: number } | null;
}

interface AppCheckpoint {
  cps: LiveCheckpoint[];
  logIndex: number;
}

type CutPayload = { g: number; d?: number; r: number; pts: number[] };
type SeedPayload = { g: number; d?: number; pts: number[] };
type FirePayload = { g: number; p: number };
/** d = −1: every dish; an empty stroke with on = 0 thaws the whole dish. */
type FreezePayload = { g: number; d?: number; r: number; pts: number[]; on: 0 | 1 };
type GraftPayload = { g: number; d?: number; sd: number; src: [number, number]; dst: [number, number]; r: number; mv: 0 | 1 };

/** The Menagerie's lattice of dishes in the camera's domain (cells). */
interface Lattice {
  cols: number;
  rows: number;
  pitch: number;
  base: [number, number];
}

export class App {
  readonly gpu: GpuContext;
  readonly device: GPUDevice;
  readonly studio: Studio;
  readonly hdr: HdrPipeline;
  readonly renderer: DishRenderer;
  readonly kernels: LiveKernels;
  readonly lib: OrganismLibrary;
  readonly scheduler: FrameScheduler;
  readonly camera = new Camera2D();
  readonly clock = new SimClock(TICKS_PER_SECOND, 16);
  readonly history: History<AppCheckpoint>;
  readonly log = new EventLog();
  readonly input: CanvasInput;
  tier: Tier;
  dishes: Dish[] = [];
  scene: SceneDef = SCENES[0]!;
  /** The organism of the one-dish scenes (kept while the Menagerie is open). */
  organism!: Organism;
  seed = CANONICAL_SEED;
  viewMode: ViewMode = "specimen";
  /** Edit groups (cuts, seeds, grafts, freezes, rate changes) since the scene started. */
  edits = 0;
  stepsTotal = 0;
  hooks: AppHooks = {};
  learnOpen = false;
  governor: QualityGovernor | null = null;
  profiler: GpuProfiler | null = null;
  onSnapshot: ((b: Blob) => void) | null = null;
  writeUrl: () => void = () => {};
  /** The dish under the pointer (probe, labels). */
  focus = 0;
  dishRadius = GRID * DISH_RADIUS;
  lattice: Lattice = { cols: 1, rows: 1, pitch: 1, base: [0, 0] };
  /** Inside the Cell: the inspected cell. */
  cellSel: [number, number] = [GRID / 2, GRID / 2];
  lastCell: CellReport | null = null;

  /** Tool settings. */
  cutRadius = 4;
  graftRadius = 5;
  graftMove = true;
  freezeRadius = 5;
  freezeOn = true;

  private readonly views: DishView[] = [];
  private readonly basisCache = new Map<string, HiddenBasis>();
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
  private rateT0 = performance.now();
  private rateTick0 = 0;
  private stepsPerSecond = 0;
  private lastStepAt = performance.now();
  private hover: [number, number] | null = null;
  /** The stroke in progress: its dish and last grid point. */
  private stroke: { d: number; x: number; y: number } | null = null;
  private pending: { kind: "cut" | "freeze"; d: number; pts: number[] } | null = null;
  private pendingSeeds: { d: number; pts: number[] } | null = null;
  private pendingGraft: GraftPayload | null = null;
  private graftFrom: { d: number; x: number; y: number } | null = null;
  private readonly ghost: HTMLCanvasElement;
  private readonly cellMark: HTMLElement;
  private probeDue = 0;
  private probeBusy = false;
  private readonly probeBuf: GPUBuffer;
  private readonly statsAll: GPUBuffer;
  private readonly statsSlot: ReadbackSlot;
  private statsDue = 0;
  private basisBusy = false;
  private readonly cellBuf: GPUBuffer;
  private cellBusy = false;
  private cellDue = 0;
  private cellVersion = -1;
  private cellPrediction: { tick: number; x: number; y: number; next: Float32Array; org: string } | null = null;
  private cellCheck: { maxAbs: number; tick: number } | null = null;
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
  private endGroupAfterFlush = false;

  constructor(
    gpu: GpuContext,
    studio: Studio,
    hdr: HdrPipeline,
    renderer: DishRenderer,
    kernels: LiveKernels,
    lib: OrganismLibrary,
    scheduler: FrameScheduler,
    tier: Tier,
  ) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.studio = studio;
    this.hdr = hdr;
    this.renderer = renderer;
    this.kernels = kernels;
    this.lib = lib;
    this.scheduler = scheduler;
    this.tier = tier;
    this.camera.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.camera.maxPxPerUnit = 44;
    this.camera.margin = 0.3;
    const U = GPUBufferUsage;
    this.probeBuf = this.device.createBuffer({ size: CN * 4, usage: U.COPY_DST | U.MAP_READ, label: "grow-probe" });
    this.statsAll = this.device.createBuffer({ size: MAX_DISHES * 16, usage: U.COPY_DST | U.COPY_SRC, label: "grow-stats-all" });
    this.statsSlot = new ReadbackSlot(this.device, MAX_DISHES * 16, "grow-stats");
    this.cellBuf = this.device.createBuffer({ size: 25 * CN * 4, usage: U.COPY_DST | U.MAP_READ, label: "grow-cell" });
    const cp: Checkpointer<AppCheckpoint> = {
      capture: () => ({ cps: this.dishes.map((d) => d.sim.checkpoint()), logIndex: this.log.length }),
      restore: (c) => {
        c.cps.forEach((s, i) => this.dishes[i]?.sim.restore(s));
        this.log.truncate(c.logIndex);
        this.applied = c.logIndex;
        for (const d of this.dishes) d.view.snap();
      },
      release: (c) => c.cps.forEach((s) => s.state.destroy()),
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
    // Graft: the lifted piece follows the pointer (display only)
    this.ghost = h("canvas", { class: "gr-ghost", "aria-hidden": "true" });
    this.ghost.hidden = true;
    // Inside the Cell: the inspected cell and its 3 × 3 neighbourhood
    this.cellMark = h("div", { class: "gr-cellmark", "aria-hidden": "true" }, h("span", { class: "gr-cellmark-nb" }), h("span", { class: "gr-cellmark-cell" }));
    this.cellMark.hidden = true;
    studio.stage.append(this.ghost, this.cellMark);
  }

  /** The primary dish's solver (the only one outside the Menagerie). */
  get sim(): LiveNca {
    return this.dishes[0]!.sim;
  }

  /** The primary dish's view. */
  get view(): DishView {
    return this.dishes[0]!.view;
  }

  /** The primary dish's grid origin in the camera's domain. */
  get origin(): [number, number] {
    return this.dishes[0]?.origin ?? [0, 0];
  }

  get lastStats(): LiveStats | null {
    return this.dishes[0]?.stats ?? null;
  }

  get basis(): HiddenBasis | null {
    return this.dishes[0]?.basis ?? null;
  }

  // ------------------------------------------------------------ framing --

  /** The part of the canvas the chrome leaves free (CSS px): the Menagerie lays its dishes out inside it. */
  private safeRect(w: number, h: number): [number, number, number, number] {
    let l = 0;
    let t = 0;
    let r = w;
    let b = h;
    const c = this.studio.canvas.getBoundingClientRect();
    const box = (el: HTMLElement): { x0: number; x1: number; y0: number; y1: number } | null => {
      const e = el.getBoundingClientRect();
      if (e.width === 0 || e.height === 0) return null;
      return { x0: e.left - c.left, x1: e.right - c.left, y0: e.top - c.top, y1: e.bottom - c.top };
    };
    const heading = box(this.studio.heading.el);
    if (heading) t = Math.max(t, heading.y1);
    const transport = box(this.studio.transport.el);
    if (transport) b = Math.min(b, transport.y0);
    // the rail is a column on the left (wide screens) or a row above the transport (phones, short screens);
    // the tool options sit beside the column, or above the row
    const rail = box(this.studio.rail.el);
    const column = !!rail && rail.y1 - rail.y0 > rail.x1 - rail.x0;
    if (rail) {
      if (column) l = Math.max(l, rail.x1);
      else b = Math.min(b, rail.y0);
    }
    const opts = box(this.studio.rail.optionsEl);
    if (opts) {
      if (column && opts.x1 < w * 0.4) l = Math.max(l, opts.x1);
      else if (!column) b = Math.min(b, opts.y0);
    }
    const pad = 6;
    if (r - l < w * 0.4 || b - t < h * 0.35) return [0, 0, w, h];
    return [l + pad, t + pad, r - pad, b - pad];
  }

  /**
   * The camera's domain is the viewport at the fitted zoom. One dish: the
   * 64 × 64 grid in the middle, the whole glass just inside the shorter side,
   * so the organism is large at any aspect and nothing is letterboxed. The
   * Menagerie: a lattice of dishes filling the part the chrome leaves free.
   */
  private reframe(w: number, h: number): void {
    const z = this.camera.pxPerUnit / Math.max(this.camera.coverZoom(), 1e-6);
    const a0 = this.anchor();
    const rel: [number, number] = [(this.camera.cx - a0[0]) / GRID, (this.camera.cy - a0[1]) / GRID];
    const n = Math.max(1, this.dishes.length);
    const pitch = 2 * this.dishRadius + 3;
    let fit: number;
    let cols = 1;
    let rows = 1;
    let base: [number, number];
    let dw: number;
    let dh: number;
    if (n === 1) {
      fit = Math.min(w, h) / pitch;
      dw = w / fit;
      dh = h / fit;
      base = [(dw - pitch) / 2, (dh - pitch) / 2];
    } else {
      const [l, t, r, b] = this.safeRect(w, h);
      const sw = r - l;
      const sh = b - t;
      let best = 0;
      for (let c = 1; c <= n; c += 1) {
        const rr = Math.ceil(n / c);
        const s = Math.min(sw / c, sh / rr);
        if (s > best + 1e-6) {
          best = s;
          cols = c;
          rows = rr;
        }
      }
      fit = best / pitch;
      dw = w / fit;
      dh = h / fit;
      base = [l / fit + (sw / fit - cols * pitch) / 2, t / fit + (sh / fit - rows * pitch) / 2];
    }
    this.lattice = { cols, rows, pitch, base };
    this.dishes.forEach((d, k) => {
      const c = k % cols;
      const r = Math.floor(k / cols);
      d.origin = [base[0] + c * pitch + (pitch - GRID) / 2, base[1] + r * pitch + (pitch - GRID) / 2];
    });
    this.camera.setViewport(w, h);
    this.camera.setDomain(dw, dh, false);
    if (this.viewport[0] === 0) {
      this.camera.fit(1);
    } else {
      const a = this.anchor();
      this.camera.set({ cx: a[0] + rel[0] * GRID, cy: a[1] + rel[1] * GRID, pxPerUnit: this.camera.coverZoom() * z });
    }
    this.viewport = [w, h];
  }

  /** The camera's reference point for the URL: the primary dish's grid corner, or the Menagerie's lattice corner. */
  anchor(): [number, number] {
    return this.dishes.length > 1 ? this.lattice.base : this.origin;
  }

  /** The dish whose tile holds domain point (x, y) — the same rule the tiles are drawn with. */
  private tileAt(x: number, y: number): number {
    const n = this.dishes.length;
    if (n <= 1) return 0;
    const L = this.lattice;
    const c = Math.min(L.cols - 1, Math.max(0, Math.floor((x - L.base[0]) / L.pitch)));
    const r = Math.min(L.rows - 1, Math.max(0, Math.floor((y - L.base[1]) / L.pitch)));
    return Math.min(n - 1, r * L.cols + c);
  }

  /** Screen point → the dish under it and its grid coordinates (continuous). */
  toGrid(x: number, y: number, dish?: number): { d: number; gx: number; gy: number } {
    const [dx, dy] = this.camera.screenToDomain(x, y);
    const d = dish ?? this.tileAt(dx, dy);
    const o = this.dishes[d]!.origin;
    return { d, gx: dx - o[0], gy: dy - o[1] };
  }

  /** Grid point of dish `d` → screen (CSS px). */
  toScreen(d: number, gx: number, gy: number): [number, number] {
    const o = this.dishes[d]!.origin;
    return this.camera.domainToScreen(o[0] + gx, o[1] + gy);
  }

  /** Each dish's tile in target pixels (the Menagerie's scissor rectangles); edge tiles reach the target's edges. */
  private tiles(tw: number, th: number): ([number, number, number, number] | null)[] {
    const n = this.dishes.length;
    if (n <= 1) return [null];
    const L = this.lattice;
    const sx = tw / Math.max(this.camera.viewW, 1);
    const sy = th / Math.max(this.camera.viewH, 1);
    const xb = (c: number): number => Math.round(this.camera.domainToScreen(L.base[0] + c * L.pitch, 0)[0] * sx);
    const yb = (r: number): number => Math.round(this.camera.domainToScreen(0, L.base[1] + r * L.pitch)[1] * sy);
    const out: ([number, number, number, number] | null)[] = [];
    for (let k = 0; k < n; k += 1) {
      const c = k % L.cols;
      const r = Math.floor(k / L.cols);
      const x0 = Math.max(0, c === 0 ? 0 : xb(c));
      const x1 = Math.min(tw, c === L.cols - 1 || k === n - 1 ? tw : xb(c + 1));
      const y0 = Math.max(0, r === 0 ? 0 : yb(r));
      const y1 = Math.min(th, r === L.rows - 1 ? th : yb(r + 1));
      out.push(x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, 0, 0]);
    }
    return out;
  }

  // ------------------------------------------------------------ scenes --

  private viewAt(i: number): DishView {
    let v = this.views[i];
    if (!v) {
      v = new DishView(this.renderer, DEFAULT_LOOK);
      this.views[i] = v;
    }
    return v;
  }

  async loadScene(id: SceneId, o: SceneOptions = {}): Promise<void> {
    const scene = sceneById(id);
    this.loadSeq += 1;
    const seq = this.loadSeq;
    this.busy = true;
    try {
      const orgId = o.organism ?? this.organism?.def.id ?? this.lib.today();
      const orgs = scene.kind === "menagerie" ? await this.lib.all() : [await this.lib.get(orgId)];
      if (seq !== this.loadSeq) return;
      this.history.clear();
      this.log.clear();
      this.applied = 0;
      this.group = 0;
      this.activeGroup = 0;
      this.edits = 0;
      this.stroke = null;
      this.pending = null;
      this.pendingSeeds = null;
      this.pendingGraft = null;
      this.graftFrom = null;
      this.ghost.hidden = true;
      const old = this.dishes;
      this.seed = o.seed ?? CANONICAL_SEED;
      const rate = o.fireRate ?? FIRE_RATE;
      const start = scene.start(this.seed);
      this.dishes = orgs.map((org, i) => {
        const sim = new LiveNca(this.device, this.kernels, org.ck, { grid: GRID, seed: this.seed, fireRate: rate });
        sim.load(start);
        const view = this.viewAt(i);
        view.forgetBuffers();
        view.snap();
        view.split = null;
        const basis = this.basisCache.get(org.def.id) ?? null;
        view.setBasis(basis);
        return { sim, view, org, origin: [0, 0], stats: null, basis };
      });
      for (const d of old) d.sim.destroy();
      if (scene.kind !== "menagerie" || !this.organism) this.organism = orgs.find((x) => x.def.id === orgId) ?? orgs[0]!;
      this.focus = 0;
      if (o.view) this.viewMode = o.view;
      else if (scene.view && this.scene.id !== scene.id) this.viewMode = scene.view;
      for (const d of this.dishes) d.view.mode = this.viewMode;
      this.scene = scene;
      this.hooks.onBasis?.(this.basis);
      this.directing = o.fadeIn ? -1 : 0;
      this.fade = o.fadeIn ? 0 : 1;
      this.deadSince = 0;
      this.clock.reset();
      this.sceneT0 = performance.now();
      // the chrome first: the Menagerie lays its dishes out in the space it leaves
      this.studio.rail.setTools(
        TOOLS.map((t) => this.toolSpec(t)),
        scene.tool,
      );
      this.studio.root.dataset["tool"] = scene.tool;
      this.studio.root.dataset["scene"] = scene.id;
      this.studio.heading.setCurrent(scene.id);
      this.studio.heading.set(scene.title, scene.prompt(this.organism.def));
      const rect = this.studio.canvas.getBoundingClientRect();
      this.viewport = [0, 0];
      this.reframe(rect.width, rect.height);
      if (scene.kind === "cell") {
        this.cellSel = o.cell ?? this.cellSel;
        this.cellPrediction = null;
        this.cellCheck = null;
        this.cellVersion = -1;
        this.lastCell = null;
        if (!o.camera) this.frameCell(false);
      } else {
        this.lastCell = null;
        this.hooks.onCell?.(null);
      }
      if (o.camera) {
        const a = this.anchor();
        this.camera.set({ cx: a[0] + o.camera.cx * GRID, cy: a[1] + o.camera.cy * GRID, pxPerUnit: this.camera.coverZoom() * o.camera.zoom });
      }
      this.hdr.resetExposure();
      this.setCallouts();
      this.governor?.acknowledgeRestart();
      this.syncTransport();
      this.hooks.onSceneChange?.(scene);
    } finally {
      if (seq === this.loadSeq) this.busy = false;
    }
  }

  /** Restart the current scene from its start (same seed, organism, update chance and view). */
  async restart(): Promise<void> {
    await this.loadScene(this.scene.id, { seed: this.seed, fireRate: this.sim.fireRate, view: this.viewMode });
  }

  /** The canonical start with the gated organism, mask seed 42, rate 0.5 and no edits: the gated run (up to its 1000 steps). */
  get onGatedRun(): boolean {
    return (
      this.scene.kind === "canonical" &&
      this.dishes.length === 1 &&
      this.organism.def.gated &&
      this.seed === CANONICAL_SEED &&
      this.sim.fireRate === FIRE_RATE &&
      this.edits === 0 &&
      this.log.length === 0
    );
  }

  setView(m: ViewMode): void {
    this.viewMode = m;
    for (const d of this.dishes) d.view.mode = m;
    this.writeUrl();
  }

  /** Inside the Cell: centre the camera on the inspected cell (left of the inspector on wide screens). */
  frameCell(animate = true): void {
    const [x, y] = this.cellSel;
    const o = this.origin;
    const z = this.camera.coverZoom() * CELL_ZOOM;
    // the inspector (320 px, right) on wide screens; a sheet over the lower part on phones
    const wide = this.camera.viewW >= 640;
    const sx = wide ? (320 + 24) / 2 / z : 0;
    const sy = wide ? 0 : Math.min(this.camera.viewH * 0.46, 420) / 2 / z;
    const to = { cx: o[0] + x + 0.5 + sx, cy: o[1] + y + 0.5 + sy, pxPerUnit: z };
    if (animate) this.camera.flyTo(to);
    else this.camera.set(to);
  }

  /** Inside the Cell: inspect cell (x, y) of the dish. */
  selectCell(x: number, y: number): void {
    const cx = Math.min(GRID - 1, Math.max(0, Math.floor(x)));
    const cy = Math.min(GRID - 1, Math.max(0, Math.floor(y)));
    this.cellSel = [cx, cy];
    this.cellPrediction = null;
    this.cellCheck = null;
    this.cellVersion = -1;
    this.cellDue = 0;
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

  /** Update chance (Tune), for every dish. A drag is one undoable edit. */
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
    for (const d of this.dishes) d.sim.fireRate = p;
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
    const dish = (d: number | undefined): Dish | undefined => this.dishes[d ?? 0];
    if (e.kind === "cut") {
      const p = e.payload as CutPayload;
      dish(p.d)?.sim.encodeStamp(enc, { mode: "cut", radius: p.r, pts: p.pts });
    } else if (e.kind === "seed") {
      const p = e.payload as SeedPayload;
      dish(p.d)?.sim.encodeStamp(enc, { mode: "seed", radius: 0, pts: p.pts });
    } else if (e.kind === "fire") {
      for (const d of this.dishes) d.sim.fireRate = (e.payload as FirePayload).p;
    } else if (e.kind === "freeze") {
      const p = e.payload as FreezePayload;
      const targets = p.d === -1 ? this.dishes : [dish(p.d)].filter((x): x is Dish => !!x);
      for (const d of targets) {
        if (p.pts.length === 0) d.sim.setFreeze(null);
        else d.sim.paintFreeze(p.pts, p.r, p.on === 1);
      }
    } else if (e.kind === "graft") {
      const p = e.payload as GraftPayload;
      const to = dish(p.d);
      const from = this.dishes[p.sd];
      if (!to || !from) return;
      to.sim.encodeGraft(enc, from.sim, p.src, p.dst, p.r, p.mv === 1);
      if (p.mv === 1 && from !== to) from.sim.encodeStamp(enc, { mode: "cut", radius: p.r, pts: [p.src[0] + 0.5, p.src[1] + 0.5] });
    }
  }

  /** Turn this frame's pointer input into logged events at the current boundary. */
  private flushInput(): void {
    // a stroke is a polyline of ≥ 2 points; while it goes on, its last
    // point stays behind as the start of the next frame's piece
    const pe = this.pending;
    if (pe && pe.pts.length >= 4) {
      const n = pe.pts.length;
      if (pe.kind === "cut") {
        this.log.push(this.sim.tick, "cut", { g: this.activeGroup, d: pe.d, r: this.cutRadius, pts: pe.pts } satisfies CutPayload as unknown as Json);
      } else {
        this.log.push(this.sim.tick, "freeze", { g: this.activeGroup, d: pe.d, r: this.freezeRadius, pts: pe.pts, on: this.freezeOn ? 1 : 0 } satisfies FreezePayload as unknown as Json);
      }
      this.pending = this.stroke ? { kind: pe.kind, d: pe.d, pts: [pe.pts[n - 2]!, pe.pts[n - 1]!] } : null;
    }
    if (this.pendingSeeds && this.pendingSeeds.pts.length >= 2) {
      this.log.push(this.sim.tick, "seed", { g: this.activeGroup, d: this.pendingSeeds.d, pts: this.pendingSeeds.pts } satisfies SeedPayload as unknown as Json);
      this.pendingSeeds = null;
    }
    if (this.pendingGraft) {
      this.log.push(this.sim.tick, "graft", { ...this.pendingGraft, g: this.activeGroup } satisfies GraftPayload as unknown as Json);
      this.pendingGraft = null;
    }
  }

  private get hasPending(): boolean {
    return (this.pending !== null && this.pending.pts.length > 2) || this.pendingSeeds !== null || this.pendingGraft !== null;
  }

  /** Cut programmatically (tests, the acceptance script): a stroke through grid points of dish `d`. */
  cutAt(pts: number[], radius = this.cutRadius, d = 0): void {
    if (this.blocked("cut")) return;
    const g = this.beginEdit();
    this.log.push(this.sim.tick, "cut", { g, d, r: radius, pts } satisfies CutPayload as unknown as Json);
    this.applyPendingNow();
  }

  seedAt(x: number, y: number, d = 0): void {
    if (this.blocked("plant")) return;
    const g = this.beginEdit();
    this.log.push(this.sim.tick, "seed", { g, d, pts: [x, y] } satisfies SeedPayload as unknown as Json);
    this.applyPendingNow();
  }

  /** Freeze (or thaw) programmatically: a stroke through grid points; an empty stroke thaws dish `d` (−1: every dish). */
  freezeAt(pts: number[], radius = this.freezeRadius, on = true, d = 0): void {
    if (this.blocked("freeze")) return;
    const g = this.beginEdit();
    this.log.push(this.sim.tick, "freeze", { g, d, r: radius, pts, on: on ? 1 : 0 } satisfies FreezePayload as unknown as Json);
    this.applyPendingNow();
  }

  /** Graft programmatically: the disc of radius r at src (dish sd) set down at dst (dish d). */
  graftAt(src: [number, number], dst: [number, number], r = this.graftRadius, move = this.graftMove, sd = 0, d = sd): void {
    if (this.blocked("graft")) return;
    const g = this.beginEdit();
    const p: GraftPayload = { g, d, sd, src: [Math.floor(src[0]), Math.floor(src[1])], dst: [Math.floor(dst[0]), Math.floor(dst[1])], r, mv: move ? 1 : 0 };
    this.log.push(this.sim.tick, "graft", p as unknown as Json);
    this.applyPendingNow();
  }

  /** Thaw every frozen cell (the Freeze tool's button). */
  thawAll(): void {
    if (!this.dishes.some((d) => d.sim.frozenCount > 0)) return;
    this.freezeAt([], 0, false, -1);
  }

  /** Apply due events immediately (between frames). */
  private applyPendingNow(): void {
    if (this.applied >= this.log.length) return;
    const enc = this.device.createCommandEncoder({ label: "grow-edit" });
    this.applyDue(enc);
    this.device.queue.submit([enc.finish()]);
    for (const d of this.dishes) d.view.snap();
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
      snap.cps.forEach((s, i) => this.dishes[i]?.sim.restore(s));
      this.log.load(kept);
      this.applied = snap.logIndex;
      const span = target - snap.cps[0]!.tick;
      if (span > REPLAY_CAP) {
        this.log.truncate(snap.logIndex);
        this.studio.toast.show("Restored the moment before that edit (too far back to replay the rest)");
      } else {
        if (span > 600) this.studio.toast.show("Undoing — replaying everything since…");
        await this.replayTo(target);
      }
      this.history.release(snap);
      this.edits = Math.max(0, this.edits - 1);
      for (const d of this.dishes) d.view.snap();
      this.hooks.onEdited?.();
      this.writeUrl();
    } finally {
      this.busy = false;
      this.syncTransport();
    }
  }

  private get sims(): LiveNca[] {
    return this.dishes.map((d) => d.sim);
  }

  /** Step from the current tick to `target`, applying logged events at their boundaries. */
  private async replayTo(target: number): Promise<void> {
    let chunks = 0;
    while (this.sim.tick < target) {
      const enc = this.device.createCommandEncoder({ label: "grow-replay" });
      this.applyDue(enc);
      const nextEvent = this.log.all()[this.applied]?.tick ?? Infinity;
      const k = Math.min(MAX_STEPS_PER_ENCODE, target - this.sim.tick, Math.max(1, nextEvent - this.sim.tick));
      LiveNca.encodeStepsMany(enc, this.sims, k);
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
    this.applyPendingNow();
    this.history.savePointNow(this.sim.tick);
    this.compareKey += 1;
    this.studio.toast.show(`Saved at step ${this.sim.tick.toLocaleString()}`);
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
      for (const d of this.dishes) d.view.split = 0.5;
      this.studio.toast.show("A · save point on the left, B · now on the right — move across the dish to wipe");
    } else {
      for (const d of this.dishes) d.view.split = null;
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
    const cell = this.scene.kind === "cell";
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
      case "graft":
        return {
          id,
          label: "Graft",
          icon: "graft",
          hint: this.dishes.length > 1 ? "Drag a piece of an organism somewhere else — into another dish too" : "Drag a piece of the organism somewhere else on the dish",
          paints: true,
          options: () => {
            const box = h("div", { class: "gr-tool-opts" });
            box.append(
              slider({
                label: "Piece size",
                min: 2,
                max: 12,
                step: 1,
                value: this.graftRadius,
                unit: " cells",
                onInput: (v) => {
                  this.graftRadius = v;
                  this.updateRing();
                },
              }).el,
              segmented(
                "Graft",
                [
                  { value: "move", label: "Move", title: "Lift the piece out and set it down" },
                  { value: "copy", label: "Copy", title: "Leave the original where it is" },
                ],
                this.graftMove ? "move" : "copy",
                (v) => {
                  this.graftMove = v === "move";
                },
              ).el,
            );
            return box;
          },
        };
      case "freeze":
        return {
          id,
          label: "Freeze",
          icon: "freeze",
          hint: "Paint a region to stop its cells updating — the rest grows around it",
          paints: true,
          options: () => {
            const box = h("div", { class: "gr-tool-opts" });
            const thaw = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Thaw all");
            thaw.addEventListener("click", () => this.thawAll());
            box.append(
              slider({
                label: "Brush width",
                min: 1,
                max: 12,
                step: 1,
                value: this.freezeRadius,
                unit: " cells",
                onInput: (v) => {
                  this.freezeRadius = v;
                  this.updateRing();
                },
              }).el,
              h(
                "div",
                { class: "gr-tool-row" },
                segmented(
                  "Brush",
                  [
                    { value: "freeze", label: "Freeze", title: "Paint frozen cells" },
                    { value: "thaw", label: "Thaw", title: "Paint frozen cells back to life" },
                  ],
                  this.freezeOn ? "freeze" : "thaw",
                  (v) => {
                    this.freezeOn = v === "freeze";
                  },
                ).el,
                thaw,
              ),
            );
            return box;
          },
        };
      case "probe":
        return cell
          ? { id, label: "Pick", icon: "probe", hint: "Tap a cell to look inside it" }
          : { id, label: "Probe", icon: "probe", hint: "Point at a cell to read its 16 numbers" };
      default:
        return { id: "pan", label: "Look", icon: "hand", hint: "Drag to pan · scroll or pinch to zoom · double-click to fit" };
    }
  }

  selectTool(id: string): void {
    this.studio.root.dataset["tool"] = id;
    this.graftFrom = null;
    this.ghost.hidden = true;
    if (id !== "probe") this.studio.probe.hidden = true;
    this.updateRing();
  }

  /** [ / ] — scale the active brush. */
  scaleBrush(factor: number): void {
    const t = this.studio.rail.active;
    const step = (r: number, lo: number): number => Math.min(12, Math.max(lo, Math.round(r * factor + (factor > 1 ? 0.5 : -0.5))));
    if (t === "cut") this.cutRadius = step(this.cutRadius, 1);
    else if (t === "freeze") this.freezeRadius = step(this.freezeRadius, 1);
    else if (t === "graft") this.graftRadius = step(this.graftRadius, 2);
    else return;
    this.updateRing();
    this.studio.rail.select(t, false);
    const r = t === "cut" ? this.cutRadius : t === "freeze" ? this.freezeRadius : this.graftRadius;
    this.studio.toast.show(`${t === "graft" ? "Piece size" : t === "cut" ? "Cut width" : "Brush width"} ${r} cells`, 1200);
  }

  private brushRadius(id: string): number {
    if (id === "cut") return this.cutRadius;
    if (id === "freeze") return this.freezeRadius;
    if (id === "graft") return this.graftRadius;
    return 0.7;
  }

  private updateRing(): void {
    const t = this.studio.rail.activeTool;
    const ring = this.studio.ring;
    if (!t?.paints || !this.hover || this.history.comparing || (t.id === "graft" && this.graftFrom)) {
      ring.classList.remove("is-shown");
      return;
    }
    const r = this.brushRadius(t.id) * this.camera.pxPerUnit;
    ring.style.width = `${r * 2}px`;
    ring.style.height = `${r * 2}px`;
    ring.style.transform = `translate(${this.hover[0] - r}px, ${this.hover[1] - r}px)`;
    ring.classList.add("is-shown");
  }

  private toolHandlers(): ToolHandlers {
    const plant = (d: number, gx: number, gy: number): void => {
      const x = Math.floor(gx);
      const y = Math.floor(gy);
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
      if (!this.pendingSeeds || this.pendingSeeds.d !== d) {
        if (this.pendingSeeds) this.flushInput();
        this.pendingSeeds = { d, pts: [] };
      }
      this.pendingSeeds.pts.push(x + 0.5, y + 0.5);
    };
    return {
      paints: () => {
        const a = this.studio.rail.active;
        return a === "cut" || a === "seed" || a === "graft" || a === "freeze";
      },
      down: (x, y) => {
        const tool = this.studio.rail.active;
        if (this.blocked(tool === "cut" ? "cut" : tool === "graft" ? "graft" : tool === "freeze" ? "freeze" : "plant")) return;
        const { d, gx, gy } = this.toGrid(x, y);
        this.focus = d;
        if (tool === "graft") {
          const sx = Math.floor(gx);
          const sy = Math.floor(gy);
          if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) return;
          this.graftFrom = { d, x: sx, y: sy };
          this.updateRing();
          void this.liftGhost(d, sx, sy, x, y);
          return;
        }
        this.activeGroup = this.beginEdit();
        this.stroke = { d, x: gx, y: gy };
        if (tool === "cut" || tool === "freeze") this.pending = { kind: tool, d, pts: [gx, gy, gx, gy] };
        else plant(d, gx, gy);
      },
      move: (x, y) => {
        this.hover = [x, y];
        this.updateRing();
        if (this.graftFrom) {
          this.placeGhost(x, y);
          return;
        }
        if (!this.stroke || this.activeGroup === 0) return;
        const { gx, gy } = this.toGrid(x, y, this.stroke.d);
        const tool = this.studio.rail.active;
        if (tool === "cut" || tool === "freeze") {
          if (!this.pending) this.pending = { kind: tool, d: this.stroke.d, pts: [this.stroke.x, this.stroke.y] };
          if (Math.hypot(gx - this.stroke.x, gy - this.stroke.y) < 0.25) return;
          this.pending.pts.push(gx, gy);
          this.stroke = { d: this.stroke.d, x: gx, y: gy };
        } else if (Math.hypot(gx - this.stroke.x, gy - this.stroke.y) >= 6) {
          plant(this.stroke.d, gx, gy);
          this.stroke = { d: this.stroke.d, x: gx, y: gy };
        }
      },
      up: (x, y) => {
        if (this.graftFrom) {
          const from = this.graftFrom;
          this.graftFrom = null;
          this.ghost.hidden = true;
          const { d, gx, gy } = this.toGrid(x, y);
          const dx = Math.floor(gx);
          const dy = Math.floor(gy);
          const moved = d !== from.d || dx !== from.x || dy !== from.y;
          if (moved && dx >= 0 && dy >= 0 && dx < GRID && dy < GRID && !this.blocked("graft")) {
            this.activeGroup = this.beginEdit();
            this.pendingGraft = { g: this.activeGroup, d, sd: from.d, src: [from.x, from.y], dst: [dx, dy], r: this.graftRadius, mv: this.graftMove ? 1 : 0 };
            this.endGroupAfterFlush = true;
          } else if (!moved) {
            this.studio.toast.show("Drag the piece to where it should go", 1800);
          }
          this.updateRing();
          return;
        }
        this.stroke = null;
        if (this.pending && this.pending.pts.length === 2) this.pending = null; // only the joint left over: nothing new
        // the frame loop flushes what is pending at the next boundary; the group ends there
        if (!this.hasPending) this.activeGroup = 0;
        else this.endGroupAfterFlush = true;
      },
      hover: (x, y) => {
        this.hover = x === null || y === null ? null : [x, y];
        if (x !== null && y !== null && this.dishes.length > 1) this.focus = this.toGrid(x, y).d;
        this.updateRing();
        if (this.history.comparing && x !== null) {
          const s = Math.min(Math.max(x / Math.max(this.camera.viewW, 1), 0), 1);
          for (const d of this.dishes) d.view.split = s;
        }
      },
      tap: (x, y) => {
        if (this.studio.rail.active !== "probe") return;
        this.hover = [x, y];
        this.probeDue = 0;
        if (this.scene.kind === "cell") {
          const { gx, gy } = this.toGrid(x, y, 0);
          if (gx >= 0 && gy >= 0 && gx < GRID && gy < GRID) this.selectCell(gx, gy);
        }
      },
    };
  }

  /** Graft: copy the lifted disc's colours into the ghost that follows the pointer (display only). */
  private async liftGhost(d: number, sx: number, sy: number, px: number, py: number): Promise<void> {
    const sim = this.dishes[d]!.sim;
    const r = this.graftRadius;
    const st = await sim.readState();
    if (!this.graftFrom || this.graftFrom.d !== d || this.graftFrom.x !== sx || this.graftFrom.y !== sy) return;
    const n = 2 * Math.ceil(r) + 1;
    const g = this.ghost;
    g.width = n;
    g.height = n;
    const ctx = g.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(n, n);
    const c = Math.ceil(r);
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const x = sx - c + i;
        const y = sy - c + j;
        const o = (j * n + i) * 4;
        if (x < 0 || y < 0 || x >= GRID || y >= GRID || Math.hypot(i - c, j - c) > r) continue;
        const b = (y * GRID + x) * CN;
        const a = Math.min(1, Math.max(0, st[b + 3]!));
        const un = (v: number): number => Math.round(255 * Math.min(1, Math.max(0, a > 1e-3 ? Math.min(v, a) / a : 0)));
        img.data[o] = un(st[b]!);
        img.data[o + 1] = un(st[b + 1]!);
        img.data[o + 2] = un(st[b + 2]!);
        img.data[o + 3] = Math.round(255 * a);
      }
    }
    ctx.putImageData(img, 0, 0);
    g.hidden = false;
    this.placeGhost(this.hover?.[0] ?? px, this.hover?.[1] ?? py);
  }

  private placeGhost(x: number, y: number): void {
    const size = this.ghost.width * this.camera.pxPerUnit;
    this.ghost.style.width = `${size}px`;
    this.ghost.style.height = `${size}px`;
    this.ghost.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
  }

  private setCallouts(): void {
    const s = this.scene;
    if (s.kind === "menagerie" || s.kind === "cell") {
      this.studio.callouts.set([]);
      return;
    }
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
        text: heals(this.organism.def) ? "Drag across it to cut — then watch" : "Drag across it to cut",
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
    if (isCapturing() || this.busy || this.inFlight || this.dishes.length === 0) return;
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
    const before = this.dishes.map((d) => d.sim.version);
    this.applyDue(enc);
    this.dishes.forEach((d, i) => {
      if (d.sim.version !== before[i]) d.view.snap();
    });
    if (this.endGroupAfterFlush && !this.hasPending) {
      this.endGroupAfterFlush = false;
      if (!this.stroke) this.activeGroup = 0;
    }
    // the dishes' steps, capped by their measured cost within the frame budget
    const due = this.history.comparing ? 0 : this.clock.due(dt);
    const cap = this.scheduler.unitsFor(STEP_PASS, this.scheduler.budgetMs, Math.min(due, 1), 16);
    const n = Math.min(due, cap);
    // steps stop at the next logged event so it lands on its own boundary
    const nextEvent = this.log.all()[this.applied]?.tick ?? Infinity;
    const k = Math.min(n, Math.max(0, nextEvent - this.sim.tick));
    if (k > 0) {
      LiveNca.encodeStepsMany(enc, this.sims, k, this.profiler?.pass(STEP_PASS));
      this.scheduler.noteUnits(STEP_PASS, k);
      this.lastStepAt = now;
    } else {
      this.scheduler.noteUnits(STEP_PASS, 0);
    }
    this.clock.advance(k);
    this.stepsTotal += k;
    // background jobs (Prove's live run now; Teach's training in M2) in what is left
    this.scheduler.encodeJobs(enc, k * this.scheduler.costOf(STEP_PASS), (name) => this.profiler?.pass(name));

    // instruments: a 16-byte reduction per dish a few times a second
    let statsRecorded = false;
    if (now > this.statsDue && !this.statsSlot.pending) {
      this.dishes.forEach((d, i) => {
        d.sim.encodeStats(enc);
        if (i < MAX_DISHES) enc.copyBufferToBuffer(d.sim.statsOut, 0, this.statsAll, i * 16, 16);
      });
      statsRecorded = this.statsSlot.record(enc, this.statsAll);
      this.statsDue = now + STATS_EVERY_MS;
    }
    // probe: one cell's 16 values
    let probe: { d: number; idx: number } | null = null;
    if (this.hover && this.studio.rail.active === "probe" && this.scene.kind !== "cell" && now > this.probeDue && !this.probeBusy) {
      const { d, gx, gy } = this.toGrid(this.hover[0], this.hover[1]);
      const x = Math.floor(gx);
      const y = Math.floor(gy);
      if (x >= 0 && y >= 0 && x < GRID && y < GRID) {
        probe = { d, idx: y * GRID + x };
        enc.copyBufferToBuffer(this.dishes[d]!.sim.state, probe.idx * CN * 4, this.probeBuf, 0, CN * 4);
        this.probeBusy = true;
        this.probeDue = now + 80;
      } else {
        this.studio.probe.hidden = true;
      }
    }
    // Inside the Cell: the inspected cell's 5 × 5 neighbourhood
    let cellRead: { tick: number; x0: number; y0: number; org: string } | null = null;
    if (this.scene.kind === "cell" && !this.cellBusy && (now > this.cellDue || this.sim.version !== this.cellVersion)) {
      if (this.clock.paused ? this.sim.version !== this.cellVersion : now > this.cellDue) {
        const [cx, cy] = this.cellSel;
        const x0 = Math.min(GRID - 5, Math.max(0, cx - 2));
        const y0 = Math.min(GRID - 5, Math.max(0, cy - 2));
        for (let r = 0; r < 5; r += 1) enc.copyBufferToBuffer(this.sim.state, ((y0 + r) * GRID + x0) * CN * 4, this.cellBuf, r * 5 * CN * 4, 5 * CN * 4);
        cellRead = { tick: this.sim.tick, x0, y0, org: this.organism.def.id };
        this.cellBusy = true;
        this.cellDue = now + CELL_EVERY_MS;
        this.cellVersion = this.sim.version;
      }
    }

    const save = this.history.comparing ? this.history.savePoint : null;
    const stepMs = 1000 / (TICKS_PER_SECOND * this.clock.speed);
    const blend = this.clock.paused || stepMs < 17 ? 1 : Math.min(1, (now - this.lastStepAt) / stepMs);
    const tiles = this.tiles(this.hdr.width, this.hdr.height);
    let first = true;
    this.dishes.forEach((d, i) => {
      const tile = tiles[i] ?? null;
      if (tile && (tile[2] === 0 || tile[3] === 0)) return;
      d.view.encode(
        enc,
        this.hdr.sceneView,
        this.hdr.width,
        this.hdr.height,
        this.camera,
        dpr * scale,
        { buffer: d.sim.state, grid: GRID, version: d.sim.version, freeze: { mask: d.sim.freeze, count: d.sim.frozenCount, version: d.sim.freezeVersion } },
        { origin: d.origin, radius: this.dishRadius, blend, fade: this.fade, time: now / 1000 },
        save?.cps[i] ? { buffer: save.cps[i]!.state, key: `cp-${this.compareKey}` } : null,
        this.profiler ?? undefined,
        { load: !first, scissor: tile ?? undefined, tag: i === 0 ? "" : `-${i}` },
      );
      first = false;
    });
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
    if (probe) void this.readProbe(probe.d, probe.idx);
    else if (!this.hover) this.studio.probe.hidden = true;
    if (cellRead) void this.readCell(cellRead);
    if (!this.basisBusy) {
      const need = this.dishes.findIndex((d) => !d.basis && d.sim.tick >= 160);
      if (need >= 0) void this.measureBasis(need);
    }
    this.placeCellMark();

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

  /** Inside the Cell: outline the inspected cell and its 3 × 3 neighbourhood. */
  private placeCellMark(): void {
    const m = this.cellMark;
    if (this.scene.kind !== "cell" || this.dishes.length === 0) {
      m.hidden = true;
      return;
    }
    const [x, y] = this.cellSel;
    const [ax, ay] = this.toScreen(0, x - 1, y - 1);
    const s = this.camera.pxPerUnit;
    m.hidden = false;
    m.style.transform = `translate(${ax}px, ${ay}px)`;
    m.style.width = `${3 * s}px`;
    m.style.height = `${3 * s}px`;
    m.style.setProperty("--cell", `${s}px`);
  }

  /**
   * The scene director: an untouched, playing dish grows again from its start
   * after a while (a fade out and in); a scene with nothing alive left in any
   * dish gets a new start. Any edit, a save point or a pause holds the current
   * dishes — except when nothing is alive, which nothing can come back from.
   */
  private direct(dt: number): void {
    const FADE_S = 0.8;
    if (this.directing === 0) {
      const dead = this.dishes.every((d) => d.stats !== null && d.stats.alive === 0) && this.sim.tick > 40;
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
        this.directing = 2;
        void this.loadScene(this.scene.id, { seed: this.seed, fireRate: this.sim.fireRate, view: this.viewMode, fadeIn: true }).then(() => {
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
    this.dishes.forEach((d, i) => {
      if (i < MAX_DISHES) d.stats = LiveNca.parseStats(ab.slice(i * 16, i * 16 + 16));
    });
    if (this.lastStats) this.hooks.onStats?.(this.lastStats);
  }

  private async measureBasis(i: number): Promise<void> {
    this.basisBusy = true;
    const d = this.dishes[i]!;
    try {
      const st = await d.sim.readState();
      if (this.dishes[i] !== d) return;
      const b = hiddenBasis(st, GRID * GRID, CN);
      if (b) {
        d.basis = b;
        d.view.setBasis(b);
        this.basisCache.set(d.org.def.id, b);
        if (i === 0) this.hooks.onBasis?.(b);
      }
    } finally {
      this.basisBusy = false;
    }
  }

  private async readProbe(d: number, idx: number): Promise<void> {
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
      const who = this.dishes.length > 1 ? `${this.dishes[d]?.org.def.name ?? ""} · ` : "";
      p.append(
        h("strong", {}, `${who}Cell ${x}, ${y}${alive ? "" : " · not alive"}`),
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

  /** Inside the Cell: work the inspected cell's step on the CPU, and check the last prediction against the GPU. */
  private async readCell(r: { tick: number; x0: number; y0: number; org: string }): Promise<void> {
    try {
      await this.cellBuf.mapAsync(GPUMapMode.READ);
      const data = new Float32Array(this.cellBuf.getMappedRange().slice(0));
      this.cellBuf.unmap();
      if (this.scene.kind !== "cell" || r.org !== this.organism.def.id) return;
      const report = this.workCell({ x0: r.x0, y0: r.y0, size: 5, grid: GRID, data }, r.tick);
      if (report) {
        this.lastCell = report;
        this.hooks.onCell?.(report);
      }
    } catch {
      /* raced a scene change */
    } finally {
      this.cellBusy = false;
    }
  }

  private workCell(block: Block, tick: number): CellReport | null {
    const [x, y] = this.cellSel;
    if (x < block.x0 || y < block.y0 || x >= block.x0 + 5 || y >= block.y0 + 5) return null;
    const p = this.cellPrediction;
    if (p && p.tick + 1 === tick && p.x === x && p.y === y && p.org === this.organism.def.id) {
      let m = 0;
      const base = ((y - block.y0) * 5 + (x - block.x0)) * CN;
      for (let c = 0; c < CN; c += 1) m = Math.max(m, Math.abs(block.data[base + c]! - p.next[c]!));
      this.cellCheck = { maxAbs: m, tick };
    }
    const ck = this.organism.ck;
    const step = stepCell(block, { w: ck.weights, b1Off: ck.b1Off, w1Off: ck.w1Off, w2Off: ck.w2Off }, x, y, tick, this.seed, this.sim.fireRate);
    this.cellPrediction = { tick, x, y, next: step.next, org: this.organism.def.id };
    return { step, organism: this.organism.def.name, block, check: this.cellCheck };
  }

  /**
   * Inside the Cell's check, run now (tests, the acceptance script): read the
   * cell's neighbourhood, predict its next state on the CPU, step the dish
   * once on the GPU, and compare.
   */
  async checkCell(): Promise<{ maxAbs: number; step: CellStep } | null> {
    if (this.scene.kind !== "cell") return null;
    this.clock.paused = true;
    this.syncTransport();
    const read = async (): Promise<Block> => {
      const st = await this.sim.readState();
      return { x0: 0, y0: 0, size: GRID, grid: GRID, data: st };
    };
    const ck = this.organism.ck;
    const w = { w: ck.weights, b1Off: ck.b1Off, w1Off: ck.w1Off, w2Off: ck.w2Off };
    const [x, y] = this.cellSel;
    const b0 = await read();
    const step = stepCell(b0, w, x, y, this.sim.tick, this.seed, this.sim.fireRate);
    await this.advance(1);
    const b1 = await read();
    let m = 0;
    for (let c = 0; c < CN; c += 1) m = Math.max(m, Math.abs(b1.data[(y * GRID + x) * CN + c]! - step.next[c]!));
    return { maxAbs: m, step };
  }

  /**
   * Split the measured GPU frame into the dishes' steps, background jobs and
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

  /** SHA-256 of the current state of dish `d` (all 16 channels). */
  async stateHash(d = 0): Promise<string> {
    return sha256hex(await this.dishes[d]!.sim.readState());
  }

  requestSnapshot(): void {
    this.snapshotWanted = true;
  }

  dispose(): void {
    this.disposed = true;
  }
}

export type { Stamp };
