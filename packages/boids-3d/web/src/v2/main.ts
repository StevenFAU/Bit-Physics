// Murmuration — the v2 page (docs/planning/rebuild-v2/07-boids-3d.md), Wave
// B of the Field Studies rebuild. Served at /sims/boids-3d/v2/ while v1
// (Murmuration Lab) stays live at /sims/boids-3d/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts — v1's legacy Reynolds capture
//     (src/legacy-capture.ts) ported verbatim on its own buffers — and
//     exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips as soon as the gate path is usable (the
//     frozen kernel compiled, the capture button wired). The renderer, the
//     live kernels and the flock compile and load afterwards, behind the
//     loading veil; deferred steps that write to the GPU queue wait for a
//     running capture. window.__murmurLive flips when the live view runs.
// verify.py then applies the established new_canonical gate, unchanged
// (_gate_boids: run-twice identity, the v_max clamp, step-100 vs f64).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, CAPACITY, SIZES, TICKS_PER_SECOND } from "./app.js";
import { buildLearn } from "./learn.js";
import type { FlockKernels } from "./model/flock.js";
import { FlockKernels as Kernels, MURMURATION } from "./model/flock.js";
import { GateRunner, buildBundle, loadInitialConditions } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { MurmurView } from "./render/murmur-view.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import { buildTune } from "./tune.js";

const SIM_NAME = "Murmuration";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "dusk", values: SCENE_IDS },
    seed: { kind: "int", def: 42, min: 0, max: 2 ** 31 - 1 },
    al: { kind: "num", def: MURMURATION.align, min: 0.2, max: 3, digits: 3 },
    rt: { kind: "int", def: MURMURATION.contagionDelay, min: 2, max: 30 },
    sun: { kind: "num", def: -3.5, min: -10, max: -0.5, digits: 2 },
    sz: { kind: "num", def: 1.6, min: 0.5, max: 4, digits: 2 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    cam: { kind: "nums", def: [-99, -99, -1], n: 3, digits: 3 },
  },
  1,
);

/** Boot phases, ms since navigation start (read by the boot-time measurements). */
const bootMarks: Record<string, number> = {};
(globalThis as { __murmurBoot?: Record<string, number> }).__murmurBoot = bootMarks;
const mark = (name: string): void => {
  bootMarks[name] = Math.round(performance.now());
};

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
    eyebrow: "07 / MURMURATION",
    canvasLabel:
      "A hundred thousand starlings over a reed bed at dusk, seen from the ground as one dark, shifting cloud against an amber and violet sky. " +
      "Drag to look around, scroll or pinch to zoom, double-click to look back at the flock. Press F to fly the falcon.",
  });
  if (query.get("chrome") === "off") studio.setChrome(false);
  studio.heading.set("Dusk", "Watch them turn. Drag to look around.", "07 / MURMURATION");
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

  // ------------------------------------------- the gate path, first --
  mark("gpu");
  studio.veil.step("Compiling the gate");
  const gate = await GateRunner.create(device);
  void loadInitialConditions().catch(() => undefined);
  mark("gate");

  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  const held: { governor: QualityGovernor | null } = { governor: null };

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
      if (held.governor) held.governor.suspended = true;
      captureStatus.textContent = "Running the legacy canonical (1,000 birds, 1,000 steps)…";
      try {
        const run = await gate.runOnce();
        const bundle = buildBundle(run.steps);
        exposeCapture(bundle, { download: false });
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (${run.steps.length} frames, sha256 ${run.sha.slice(0, 10)}…).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "boids-3d-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        if (held.governor) held.governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "mm-capture-row" }, captureBtn, captureLink));

  // Prove works from the gate alone; the live checks wait for the kernels.
  let kernels: FlockKernels | null = null;
  let app: App | null = null;
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    kernels: () => kernels,
    live: () => (app ? { flock: app.flock } : null),
    hold: (on) => {
      if (held.governor) held.governor.suspended = on;
      if (app) app.busy = on;
    },
  });
  studio.drawer.learn.append(h("p", { class: "mm-note" }, "The page is still loading its live view."));
  markReady();
  mark("ready");

  // ---------------------------------------------- everything else --
  const tier = pickTier(gpu, readTierEnvironment(), query.get("tier"));
  studio.veil.step("Compiling the renderer");
  while (isCapturing()) await wait(50);
  const hdr = new HdrPipeline(gpu, studio.canvas, {
    toneMap: "agx",
    // a bright sky with a dark cloud in it: meter the sky, ease slowly so the flock never pumps it
    exposure: { percentile: 0.995, key: 0.95, min: 0.05, max: 32, tau: 2.5 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({ budgetMs: tier === "T1" ? 36 : 22, effectLevels: 1 });
  held.governor = governor;
  studio.veil.step("Compiling the flock");
  // ?n= overrides the tier's bird count (measurements)
  let birds = SIZES[tier];
  if (query.has("n")) birds = Math.min(CAPACITY, Math.max(256, Number(query.get("n")) | 0));
  const [k, view] = await Promise.all([Kernels.create(device), MurmurView.create(device, Math.max(CAPACITY, birds))]);
  kernels = k;
  while (isCapturing()) await wait(50);
  const a = new App(gpu, studio, hdr, view, k, tier, birds);
  app = a;
  a.profiler = profiler;
  a.governor = governor;
  if (query.has("inflight")) a.maxInFlight = Math.min(3, Math.max(1, Number(query.get("inflight")) | 0));
  mark("compiled");

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => ({
    s: a.scene.id,
    seed: a.flock.seed,
    al: a.flock.model.align,
    rt: a.flock.model.contagionDelay,
    sun: view.dusk.sunElevation,
    sz: view.birds.scale,
    sp: a.clock.speed,
    cam: [a.camera.yaw, a.camera.pitch, (a.camera.fovY * 180) / Math.PI].map((x) => Number(x.toFixed(3))),
  });
  a.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(
    studio.tune.body,
    {
      align: (v) => a.setModel({ align: v }),
      reaction: (steps) => a.setModel({ contagionDelay: steps }),
      reset: () => a.resetModel(),
      sun: (deg) => {
        view.dusk = { ...view.dusk, sunElevation: deg };
        a.writeUrl();
      },
      size: (s) => {
        view.birds = { ...view.birds, scale: s };
        learn.setLook(view.birds.scale);
        a.writeUrl();
      },
    },
    { align: a.flock.model.align, reaction: a.flock.model.contagionDelay, sun: view.dusk.sunElevation, size: view.birds.scale },
  );
  studio.tune.setNote("Alignment and reaction time change the model at the next step. The sun and the drawn size change only the picture.");

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);

  // ------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.map((s) => ({ id: s.id, title: s.title })),
    "dusk",
  );
  studio.heading.onPick = (id) => {
    void a.loadScene(id as SceneId).then(() => a.writeUrl());
  };
  studio.rail.onSelect = (id) => a.selectTool(id);
  studio.transport.handlers = {
    play: () => a.togglePlay(),
    step: () => {
      if (!a.clock.paused) a.togglePlay();
      a.clock.stepOnce();
    },
    restart: () => void a.restart(),
    speed: (v) => a.setSpeed(v),
    save: () => a.savePoint(),
    restore: () => a.restoreSave(),
    compare: () => {},
    undo: () => {},
  };
  studio.transport.onStatus = () => studio.drawer.open("learn");
  studio.drawer.onChange = ((orig) => (open: boolean, tab: "learn" | "prove") => {
    orig?.(open, tab);
    a.learnOpen = open && tab === "learn";
  })(studio.drawer.onChange);
  studio.share.handlers = {
    copyLink: () => {
      const link = url.link(current());
      void navigator.clipboard?.writeText(link).then(
        () => studio.toast.show("Link copied — it reproduces this flock's starting state"),
        () => studio.toast.show(link, 8000),
      );
    },
    snapshot: () => a.requestSnapshot(),
    clip: () => recordClip(),
  };
  a.onSnapshot = (b) => download(b, `murmuration-${a.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `murmuration-${a.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => a.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void a.restart());
  studio.key("1 2 3 4", "Choose a tool", (e) => {
    studio.rail.selectIndex(Number(e.key) - 1);
    a.selectTool(studio.rail.active);
  });
  studio.key("F", "Fly the falcon (again: land it)", () => {
    const id = studio.rail.active === "falcon" ? "look" : "falcon";
    studio.rail.select(id, false);
    a.selectTool(id);
  });
  // the falcon's keys, held: A/D turn, W/S climb and dive, Shift stoops
  const falconKey = (e: KeyboardEvent, down: boolean): void => {
    // a release always counts (whatever tool is active), so no key stays latched
    if (down && (studio.rail.active !== "falcon" || (e.target as HTMLElement | null)?.closest?.("input, select, textarea"))) return;
    const k = e.key.toLowerCase();
    if (k === "a") a.keys.yaw = down ? -1 : a.keys.yaw === -1 ? 0 : a.keys.yaw;
    else if (k === "d") a.keys.yaw = down ? 1 : a.keys.yaw === 1 ? 0 : a.keys.yaw;
    else if (k === "w") a.keys.pitch = down ? 1 : a.keys.pitch === 1 ? 0 : a.keys.pitch;
    else if (k === "s") a.keys.pitch = down ? -1 : a.keys.pitch === -1 ? 0 : a.keys.pitch;
    else if (k === "shift") a.keys.stoop = down;
    else return;
    if (down && a.falcon.mode === "pursuit") a.falcon.mode = "player";
  };
  addEventListener("keydown", (e) => falconKey(e, true));
  addEventListener("keyup", (e) => falconKey(e, false));
  studio.key("S", "Save point (S dives while you fly the falcon)", () => {
    if (studio.rail.active !== "falcon") a.savePoint();
  });
  studio.key("T", "Tune", () => studio.tune.toggle());

  a.hooks = {
    onSceneChange: (scene) => learn.setScene(scene, a.flock.count),
    onModel: (m) => {
      tune.sync({ align: m.align, reaction: m.contagionDelay, sun: view.dusk.sunElevation, size: view.birds.scale });
      learn.setModel(m);
    },
    onStats: (s) => learn.pushStats(s),
    onWave: (w) => learn.setWave(w),
  };

  // Learn: performance, about once a second while it is open
  let lastPerf = 0;
  const rafTimes: number[] = [];
  let lastFrame = performance.now();
  let lastCam = -1;
  let lastUrl = 0;
  const overlay = query.get("debug") === "perf" ? new PerfOverlay() : null;
  if (overlay) studio.root.append(overlay.el);
  a.hooks.onFrame = (now) => {
    overlay?.push({ frameMs: now - lastFrame, gpuMs: profiler.frameMs, passes: profiler.timings() });
    rafTimes.push(now - lastFrame);
    if (rafTimes.length > 600) rafTimes.shift();
    lastFrame = now;
    if (a.camera.version !== lastCam && !a.camera.idle && now - lastUrl > 600) {
      lastCam = a.camera.version;
      lastUrl = now;
      a.writeUrl();
    }
    if (!a.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${a.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Birds", a.flock.count.toLocaleString("en-US")],
        ["Model steps / second", `${Math.round(TICKS_PER_SECOND * a.clock.speed)}`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ["Exposure", `${a.hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Releasing the flock");
  const scene = sceneById(parsed.s);
  view.dusk = { ...scene.dusk, sunElevation: parsed.sun };
  view.birds = { ...view.birds, scale: parsed.sz };
  while (isCapturing()) await wait(50);
  a.flock.model = { ...MURMURATION, align: parsed.al, contagionDelay: parsed.rt };
  await a.loadScene(scene.id, { seed: parsed.seed, birds });
  if (parsed.cam[2]! > 0) {
    const home = a.homeView();
    a.camera.set({ eye: home.eye, yaw: parsed.cam[0]!, pitch: parsed.cam[1]!, fov: (parsed.cam[2]! * Math.PI) / 180 });
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  a.setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  tune.sync({ align: a.flock.model.align, reaction: a.flock.model.contagionDelay, sun: view.dusk.sunElevation, size: view.birds.scale });
  learn.setLook(view.birds.scale);
  studio.veil.done();
  a.start();
  mark("live");
  (globalThis as { __murmurLive?: boolean }).__murmurLive = true;

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    // a view from the ground: no bounded 2D domain for the shell check's letterbox test
    space: "3d",
    scene: a.scene.id,
    tier: a.tier,
    birds: a.flock.count,
    sizes: SIZES,
    model: a.flock.model,
    falcon: { mode: a.falcon.mode, position: a.falcon.position, speed: a.falcon.speed },
    wave: a.wave,
    seed: a.flock.seed,
    steps: a.flock.steps,
    time: a.flock.time,
    stats: a.stats,
    camera: { eye: a.camera.eye(), yaw: a.camera.yaw, pitch: a.camera.pitch, fov: a.camera.fovY, version: a.camera.version },
    dusk: view.dusk,
    birdsLook: view.birds,
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    fps: a.fps,
  });
  (globalThis as { __murmur?: App }).__murmur = a;
  (globalThis as { __murmurProve?: typeof prove }).__murmurProve = prove;

  if (query.get("bench") === "1") void bench(a, profiler, rafTimes);
}

async function bench(app: App, profiler: GpuProfiler, rafTimes: number[]): Promise<void> {
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  // v1's seed packs the flock tight; it spreads over the roost in a few seconds
  await wait(9000);
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
    birds: app.flock.count,
    scene: app.scene.id,
    maxInFlight: app.maxInFlight,
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
    passes: profiler.timings().map((p) => ({ name: p.name, avgMs: p.avg })),
    renderScale: app.governor?.renderScale ?? 1,
    governor: app.governor?.status().message ?? "",
  };
  (globalThis as { __bpBench?: unknown }).__bpBench = result;
  console.info(`BP_BENCH ${JSON.stringify(result)}`);
}

void boot();
