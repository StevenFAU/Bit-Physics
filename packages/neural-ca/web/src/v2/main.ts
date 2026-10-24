// Grow — the v2 page (docs/planning/rebuild-v2/04-neural-ca.md), Wave A of
// the Field Studies rebuild. Served at /sims/neural-ca/v2/ while v1 stays
// live at /sims/neural-ca/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts captureCanonical() — the v1 capture path
//     ported unchanged on dedicated buffers — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips once the first frame is scheduled.
// verify.py then applies the established capture_roundtrip gate, unchanged
// (bit-exact against the WGSL canonical; CI's lavapipe runs its declared
// observable fallback).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, STEP_PASS, TICKS_PER_SECOND } from "./app.js";
import type { SceneOptions } from "./app.js";
import { buildLearn } from "./learn.js";
import { LiveKernels } from "./model/live.js";
import { CANONICAL_SEED, CANONICAL_STEPS, FIRE_RATE, GRID, createGateRunner, fetchCheckpoint } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { DEFAULT_LOOK, DishView } from "./render/dish-view.js";
import type { ViewMode } from "./render/dish-view.js";
import { FrameScheduler } from "./runtime/scheduler.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import { VIEW_MODES, buildTune } from "./tune.js";

const SIM_NAME = "Grow";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "dish", values: SCENE_IDS },
    seed: { kind: "int", def: CANONICAL_SEED, min: 0, max: 2 ** 31 - 1 },
    p: { kind: "num", def: FIRE_RATE, min: 0.05, max: 1, digits: 2 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    show: { kind: "enum", def: "specimen", values: VIEW_MODES.map((m) => m.value) },
    cam: { kind: "nums", def: [-1, -1, -1], n: 3, digits: 4 },
  },
  2,
);

function download(blob: Blob, name: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function boot(): Promise<void> {
  const query = new URLSearchParams(location.search);
  const studio = createStudio({
    simName: SIM_NAME,
    eyebrow: "04 / LEARNED RULES",
    canvasLabel:
      "A petri dish where a disk-shaped organism grows from one cell under a learned rule. Choose Cut and drag across it to cut it, Seed to plant new cells, Look to pan and zoom, or Probe to read a cell.",
  });
  if (query.get("chrome") === "off") studio.setChrome(false);
  studio.veil.step("Requesting the GPU");

  let gpu: GpuContext;
  try {
    gpu = await acquireGpu();
  } catch (e) {
    studio.veil.el.hidden = true;
    showNoWebGPU(SIM_NAME, e instanceof WebGPUUnavailableError ? e.message : `The WebGPU adapter request failed: ${(e as Error).message}`);
    return;
  }
  const { device } = gpu;
  const fail = (msg: string): void => {
    studio.veil.el.hidden = false;
    studio.veil.el.classList.remove("is-done");
    studio.veil.fail(`${SIM_NAME} stopped: ${msg}\nReload the page to start a fresh GPU session.`);
  };
  // GPU validation errors are otherwise only console warnings: surface them
  // as errors (the headless gate fails on console errors), a few at most.
  let gpuErrors = 0;
  device.addEventListener("uncapturederror", (e) => {
    if (gpuErrors++ < 5) console.error(`WebGPU error: ${(e as GPUUncapturedErrorEvent).error.message}`);
  });
  device.lost.then((info) => {
    if (info.reason !== "destroyed") fail(`the GPU device was lost (${info.message})`);
  });

  const tier = pickTier(gpu, readTierEnvironment(), query.get("tier"));
  studio.veil.step("Fetching the trained network");
  const ck = await fetchCheckpoint();
  studio.veil.step("Compiling the renderer");
  const hdr = new HdrPipeline(gpu, studio.canvas, {
    toneMap: "neutral",
    // the organism's colours are what the network learned: hold exposure at 1
    exposure: { mode: "pinned", value: 1 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({
    budgetMs: gpu.timestamps ? 12 : tier === "T1" ? 36 : 22,
    effectLevels: 0,
    allowSimStepDown: false,
  });
  // GPU ms per frame for compute (the dish's steps + background jobs). The
  // render takes ~1–3 ms on a desktop GPU; T1 leaves more of the frame alone.
  const scheduler = new FrameScheduler({ budgetMs: tier === "T1" ? 3 : 6, defaultUnitMs: 0.25, minUnits: 1, maxUnits: 64 });
  studio.veil.step("Compiling the network and the gate");
  const [kernels, gate] = await Promise.all([LiveKernels.create(device), createGateRunner(device, ck)]);
  const view = new DishView(device, DEFAULT_LOOK);
  const app = new App(gpu, studio, hdr, view, kernels, ck, scheduler, tier);
  if (gpu.timestamps) {
    profiler.onFrame = () => {
      const at1x = app.adaptToTimings(profiler.timings());
      if (at1x !== null) governor.sample(at1x);
    };
  }
  app.profiler = profiler;
  app.governor = governor;

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => ({
    s: app.scene.id,
    seed: app.seed,
    p: app.sim.fireRate,
    sp: app.clock.speed,
    show: app.view.mode,
    cam: [
      (app.camera.cx - app.origin[0]) / GRID,
      (app.camera.cy - app.origin[1]) / GRID,
      app.camera.pxPerUnit / app.camera.coverZoom(),
    ].map((x) => Number(x.toFixed(4))),
  });
  app.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(studio.tune.body, {
    fireRate: (v, phase) => app.setFireRate(v, phase),
    reset: () => {
      app.setFireRate(FIRE_RATE, "start");
      app.setFireRate(FIRE_RATE, "end");
      syncTune();
    },
    view: (m) => app.setView(m),
  });
  studio.tune.setNote(
    `The gate runs the update chance at ${FIRE_RATE} with the random mask seeded ${CANONICAL_SEED}. Other values run the same network; they are not the gated run.`,
  );
  const syncTune = (): void => tune.sync(app.sim.fireRate, app.view.mode);

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);

  // ------------------------------------------------------------- Prove --
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    kernels,
    checkpoint: ck,
    scheduler,
    showGated: () => {
      void app.loadScene("dish", { seed: CANONICAL_SEED, fireRate: FIRE_RATE, view: app.view.mode }).then(() => {
        syncTune();
        app.writeUrl();
      });
    },
    hold: (on) => {
      governor.suspended = on;
    },
  });
  let lastOnScreen = "";
  const syncProve = (): void => {
    const s = {
      scene: app.scene.title,
      canonical: app.onGatedRun,
      tick: app.sim.tick,
      edits: app.edits,
      seed: app.seed,
      fireRate: app.sim.fireRate,
    };
    const key = JSON.stringify({ ...s, tick: s.canonical && s.tick <= CANONICAL_STEPS ? Math.floor(s.tick / 10) : s.tick > CANONICAL_STEPS ? 1 : 0 });
    if (key === lastOnScreen) return;
    lastOnScreen = key;
    prove.setOnScreen(s);
  };

  // The developer capture control — the headless gate's entry point.
  const captureStatus = h("p", {}, "Re-emits the canonical capture for the release gate (window.__bitPhysicsCapture).");
  const captureBtn = h("button", { type: "button", class: "bp-btn", "data-bp": "capture" }, "Export proof capture");
  const captureLink = h("a", { href: "#", hidden: true }, "Download the capture JSON");
  captureBtn.addEventListener("click", () => {
    if (isCapturing()) return;
    void runCaptureExclusive(async () => {
      resetCapture();
      captureBtn.disabled = true;
      captureLink.hidden = true;
      governor.suspended = true;
      captureStatus.textContent = `Capturing the canonical run (${CANONICAL_STEPS.toLocaleString()} steps)…`;
      try {
        const bundle = await gate.captureCanonical();
        exposeCapture(bundle, { download: false });
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (${bundle.steps.length} frames).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "neural-ca-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "gr-capture-row" }, captureBtn, captureLink));

  // ---------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.map((s) => ({ id: s.id, title: s.title })),
    "dish",
  );
  studio.heading.onPick = (id) => {
    void app.loadScene(id as SceneId, { fireRate: app.sim.fireRate, view: app.view.mode }).then(() => app.writeUrl());
  };
  studio.rail.onSelect = (id) => app.selectTool(id);
  studio.transport.handlers = {
    play: () => app.togglePlay(),
    step: () => {
      if (!app.clock.paused) app.togglePlay();
      app.clock.stepOnce();
    },
    restart: () => void app.restart(),
    speed: (v) => app.setSpeed(v),
    save: () => app.savePoint(),
    restore: () => app.restoreSave(),
    compare: () => app.toggleCompare(),
    undo: () => void app.undo(),
  };
  studio.transport.onStatus = () => studio.drawer.open("learn");
  studio.drawer.onChange = ((orig) => (open: boolean, tab: "learn" | "prove") => {
    orig?.(open, tab);
    app.learnOpen = open && tab === "learn";
    if (open && tab === "prove") syncProve();
  })(studio.drawer.onChange);
  studio.share.handlers = {
    copyLink: () => {
      const link = url.link(current());
      void navigator.clipboard?.writeText(link).then(
        () => studio.toast.show("Link copied — it reproduces this scene's start; edits are not in the link"),
        () => studio.toast.show(link, 8000),
      );
    },
    snapshot: () => app.requestSnapshot(),
    clip: () => recordClip(),
  };
  app.onSnapshot = (b) => download(b, `grow-${app.scene.id}.png`);
  function recordClip(): void {
    if (typeof MediaRecorder === "undefined" || !studio.canvas.captureStream) {
      studio.toast.show("This browser cannot record the canvas");
      return;
    }
    const stream = studio.canvas.captureStream(60);
    const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `grow-${app.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => app.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void app.restart());
  studio.key("1 2 3 4", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("[ ]", "Narrower / wider cut", (e) => app.scaleBrush(e.key === "]" ? 1.4 : 1 / 1.4));
  studio.key("S", "Save point", () => app.savePoint());
  studio.key("C", "Compare with the save point", () => app.toggleCompare());
  studio.key("Z", "Undo the last edit", () => void app.undo());
  studio.key("T", "Tune", () => studio.tune.toggle());
  studio.key("V", "Next view: specimen, hidden channels, cells", () => {
    const i = VIEW_MODES.findIndex((m) => m.value === app.view.mode);
    app.setView(VIEW_MODES[(i + 1) % VIEW_MODES.length]!.value);
    syncTune();
  });

  app.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, app.onGatedRun);
      syncTune();
      syncProve();
    },
    onEdited: () => {
      learn.setScene(app.scene, app.onGatedRun);
      syncTune();
      syncProve();
    },
    onStats: (s) => {
      if (app.learnOpen) learn.setStats(s, GRID, app.sim.tick);
    },
    onBasis: (b) => learn.setBasis(b),
  };

  // Learn: performance, about once a second while it is open
  let lastPerf = 0;
  const rafTimes: number[] = [];
  let lastFrame = performance.now();
  let lastCam = -1;
  let lastUrl = 0;
  const overlay = query.get("debug") === "perf" ? new PerfOverlay() : null;
  if (overlay) studio.root.append(overlay.el);
  app.hooks.onFrame = (now) => {
    overlay?.push({ frameMs: now - lastFrame, gpuMs: profiler.frameMs, passes: profiler.timings() });
    rafTimes.push(now - lastFrame);
    if (rafTimes.length > 600) rafTimes.shift();
    lastFrame = now;
    if (app.camera.version !== lastCam && !app.camera.flying && now - lastUrl > 400) {
      lastCam = app.camera.version;
      lastUrl = now;
      app.writeUrl();
    }
    if (studio.drawer.isOpen && studio.drawer.tab === "prove") syncProve();
    if (!app.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${app.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Dish", `${GRID} × ${GRID} cells, 16 channels`],
        ["Steps / second", `${Math.round(TICKS_PER_SECOND * app.clock.speed)} at ${app.clock.speed}×`],
        ["GPU per step", `${(scheduler.costOf(STEP_PASS) * 1000).toFixed(0)} µs`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
      ],
      profiler.timings(),
      profiler.source,
    );
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Planting the seed");
  const scene = sceneById(parsed.s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opts: SceneOptions = {
    seed: parsed.seed,
    fireRate: parsed.p,
    view: parsed.show as ViewMode,
    camera: parsed.cam[2]! > 0 ? { cx: parsed.cam[0]!, cy: parsed.cam[1]!, zoom: parsed.cam[2]! } : undefined,
  };
  await app.loadScene(scene.id, opts);
  app.setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  syncTune();
  studio.veil.done();
  app.start();

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    scene: app.scene.id,
    tier: app.tier,
    tick: app.sim.tick,
    grid: GRID,
    domain: [app.camera.domainW, app.camera.domainH],
    origin: app.origin,
    dishRadius: app.dishRadius,
    periodic: false,
    viewport: [app.camera.viewW, app.camera.viewH],
    view: app.camera.viewRect(),
    coverZoom: app.camera.coverZoom(),
    zoom: app.camera.pxPerUnit,
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    gated: app.onGatedRun,
    stats: app.lastStats,
    basis: app.basis ? { cells: app.basis.cells, explained: app.basis.explained } : null,
    stepCostMs: scheduler.costOf(STEP_PASS),
  });
  (globalThis as { __grow?: App }).__grow = app;
  (globalThis as { __growProve?: typeof prove }).__growProve = prove;
  (globalThis as { __growGate?: typeof gate }).__growGate = gate;
  markReady();

  if (query.get("bench") === "1") void bench(app, profiler, scheduler, rafTimes);
}

async function bench(app: App, profiler: GpuProfiler, scheduler: FrameScheduler, rafTimes: number[]): Promise<void> {
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  rafTimes.length = 0;
  const gpuMs: number[] = [];
  const prev = profiler.onFrame;
  profiler.onFrame = (ms) => {
    gpuMs.push(ms);
    prev?.(ms);
  };
  const t0 = performance.now();
  const steps0 = app.stepsTotal;
  await wait(10000);
  profiler.onFrame = prev;
  const seconds = (performance.now() - t0) / 1000;
  const result = {
    adapter: app.gpu.adapterId,
    tier: app.tier,
    grid: GRID,
    scene: app.scene.id,
    viewport: [app.camera.viewW, app.camera.viewH],
    timing: profiler.source,
    frames: rafTimes.length,
    fps: rafTimes.length / seconds,
    frameP50: percentile(rafTimes, 0.5),
    frameP90: percentile(rafTimes, 0.9),
    frameP99: percentile(rafTimes, 0.99),
    gpuP50: percentile(gpuMs, 0.5),
    gpuP90: percentile(gpuMs, 0.9),
    stepsPerSecond: (app.stepsTotal - steps0) / seconds,
    stepCostMs: scheduler.costOf(STEP_PASS),
    passes: profiler.timings().map((p) => ({ name: p.name, avgMs: p.avg })),
    renderScale: app.governor?.renderScale ?? 1,
    governor: app.governor?.status().message ?? "",
  };
  (globalThis as { __bpBench?: unknown }).__bpBench = result;
  console.info(`BP_BENCH ${JSON.stringify(result)}`);
}

void boot();
