// Water in Hand — the v2 page (docs/planning/rebuild-v2/08-sph-water.md),
// Wave C of the Field Studies rebuild. Served at /sims/sph-water/v2/ while v1
// stays live at /sims/sph-water/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts — v1's capture path ported verbatim on
//     its own createSphGpu instance — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips as soon as the gate path is usable (the
//     frozen kernels compiled, the capture button wired). The renderer, the
//     live water and the scene compile and load afterwards, behind the
//     loading veil; deferred steps that write to the GPU queue wait for a
//     running capture. window.__waterLive flips when the live view runs.
// verify.py then applies the established new_canonical gate, unchanged
// (_gate_sph_water: run-twice identity + the pointwise match against the
// committed 100K capture).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU, slider } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, SIZES, TIME_SCALE } from "./app.js";
import { buildLearn } from "./learn.js";
import { hydrostaticFit } from "./model/measure.js";
import type { SolverKind } from "./model/water.js";
import { GLASS, GRAVITY, LIST_K, RHO0, WaterKernels, diagnose } from "./model/water.js";
import { GateRunner, captureStatesSha, fetchIC } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { KITCHEN_WATER, WaterView } from "./render/water-view.js";
import type { SceneId } from "./scenes.js";
import { EYEBROW, SCENES, sceneById } from "./scenes.js";

const SIM_NAME = "Water in Hand";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "glass", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    cam: { kind: "nums", def: [-99, -99, -1], n: 3, digits: 3 },
  },
  1,
);

/** Boot phases, ms since navigation start (read by the boot-time measurements). */
const bootMarks: Record<string, number> = {};
(globalThis as { __waterBoot?: Record<string, number> }).__waterBoot = bootMarks;
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

/** Sum of the profiler's passes whose names start with `prefix`, ms. */
function passMs(profiler: GpuProfiler, prefix: string): number {
  return profiler
    .timings()
    .filter((p) => p.name.startsWith(prefix))
    .reduce((s, p) => s + p.avg, 0);
}

async function boot(): Promise<void> {
  const query = new URLSearchParams(location.search);
  const studio = createStudio({
    simName: SIM_NAME,
    eyebrow: EYEBROW,
    canvasLabel:
      "A glass of water on a wooden table in window light. With the Drop tool, click the water to drop a blob of water into it; " +
      "drag to turn the view, scroll or pinch to zoom, double-click to reset it.",
  });
  if (query.get("chrome") === "off") studio.setChrome(false);
  studio.heading.set("The Glass", "Drop something in. Drag to look around.", EYEBROW);
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
  void fetchIC().catch(() => undefined);
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
      try {
        const r = await gate.capture((s) => {
          captureStatus.textContent = s;
        });
        exposeCapture(r.bundle, { download: false });
        const sha = await captureStatesSha(r.bundle.steps);
        (globalThis as { __waterCaptureSha?: string }).__waterCaptureSha = sha;
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (states sha256 ${sha.slice(0, 10)}…).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(r.bundle)], { type: "application/json" }), "sph-water-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        if (held.governor) held.governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "wh-capture-row" }, captureBtn, captureLink));

  // Prove works from the gate alone; the live checks wait for the water.
  let app: App | null = null;
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    gate,
    hold: (on) => {
      if (held.governor) held.governor.suspended = on;
    },
    solverCheck: async () => {
      const a = app;
      if (!a) return null;
      a.busy = true;
      try {
        await device.queue.onSubmittedWorkDone();
        const w = a.water;
        // the shipped passes need the particles in their original order
        await w.unpermute();
        const cp = w.capture();
        const before = { solver: w.solver, resort: w.resort };
        const steps = 48; // spans a re-sort (every RESORT_EVERY = 32 steps)
        const run = async (kind: SolverKind, resort: boolean): Promise<string> => {
          w.restore(cp);
          w.solver = kind;
          w.resort = resort;
          const enc = device.createCommandEncoder({ label: "solver-check" });
          w.encodeSteps(enc, steps);
          device.queue.submit([enc.finish()]);
          return w.stateHash();
        };
        const lists = await run("lists", true);
        const plain = await run("lists", false);
        const shipped = await run("shipped", false);
        w.restore(cp);
        w.releaseCheckpoint(cp);
        w.solver = before.solver;
        w.resort = before.resort;
        return { steps, lists, plain, shipped };
      } finally {
        a.busy = false;
      }
    },
    hydrostatic: async (onStatus) => {
      const a = app;
      if (!a) return null;
      if (a.scene.id !== "still") {
        await a.loadScene("still", { seed: a.seed });
        a.writeUrl();
      }
      // settle, then average every κ both solves apply over a window of steps
      const settle = 2.5;
      while (a.water.time < settle) {
        await a.advance(Math.max(1, Math.min(240, Math.ceil((settle - a.water.time) / a.water.recipe.dt))));
        onStatus(`Settling: ${a.water.time.toFixed(2)} s of ${settle} s of model time…`);
        await wait(0);
      }
      const window = 200;
      a.water.resetPressure();
      onStatus(`Averaging the pressure over ${window} steps…`);
      await a.advance(window);
      const s = await a.water.readPressure();
      // the free surface: where the water actually stands (the wall and floor are projections, so it sits a little low)
      const ys = Float32Array.from({ length: a.water.n }, (_, i) => s.pos[i * 4 + 1]!).sort();
      const level = ys[Math.floor(ys.length * 0.995)]!;
      return hydrostaticFit(s, a.water.n, {
        level,
        rho0: RHO0,
        g: GRAVITY,
        minNeighbours: 45,
        wallRadius: GLASS.radius,
        floor: GLASS.floor,
        margin: 2.5 * a.water.recipe.h,
        steps: window,
      });
    },
  });
  studio.drawer.learn.append(h("p", { class: "wh-note" }, "The page is still loading its live view."));
  markReady();
  mark("ready");

  // ---------------------------------------------- everything else --
  const tier = pickTier(gpu, readTierEnvironment(), query.get("tier"));
  studio.veil.step("Compiling the renderer");
  while (isCapturing()) await wait(50);
  const hdr = new HdrPipeline(gpu, studio.canvas, {
    toneMap: "agx",
    // a bright window over a warm room: meter the bright end, keep the room warm and dim
    exposure: { percentile: 0.9, key: 0.72, min: 0.02, max: 64, tau: 0.8 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({ budgetMs: tier === "T1" ? 36 : 20, effectLevels: 1 });
  held.governor = governor;
  studio.veil.step("Compiling the water");
  const liquidScale = query.has("scale") ? Math.min(1, Math.max(0.25, Number(query.get("scale")))) : tier === "T1" ? 0.5 : 0.6;
  const [kernels, view] = await Promise.all([WaterKernels.create(device), WaterView.create(device, liquidScale)]);
  while (isCapturing()) await wait(50);
  // ?n= overrides the tier's particle count (measurements)
  const size = query.has("n") ? Math.min(400_000, Math.max(2000, Number(query.get("n")) | 0)) : SIZES[tier];
  const a = new App(gpu, studio, hdr, view, kernels, gate, tier, size);
  if (query.get("solver") === "shipped") a.water.solver = "shipped";
  app = a;
  a.profiler = profiler;
  a.governor = governor;
  if (query.has("inflight")) a.maxInFlight = Math.min(3, Math.max(1, Number(query.get("inflight")) | 0));
  if (query.get("director") === "off") (a.scene as { director: number }).director = 0;
  mark("compiled");

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => ({
    s: a.scene.id,
    seed: a.seed,
    sp: a.clock.speed,
    cam: [a.camera.yaw, a.camera.pitch, a.camera.distance].map((x) => Number(x.toFixed(3))),
  });
  a.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const look = { tint: 1 };
  const tint = slider({
    label: "Tint",
    symbol: "absorption",
    min: 0,
    max: 4,
    step: 0.05,
    value: 1,
    format: (v) => `${v.toFixed(2)}×`,
    hint: "How strongly the water absorbs red light (Beer–Lambert). Rendering only.",
    onInput: (v) => {
      look.tint = v;
      view.liquid.look = { ...view.liquid.look, absorption: [KITCHEN_WATER.absorption[0] * v, KITCHEN_WATER.absorption[1] * v, KITCHEN_WATER.absorption[2] * v] };
    },
  });
  const smooth = slider({
    label: "Smoothing",
    symbol: "filter passes",
    min: 0,
    max: 4,
    step: 1,
    value: view.liquid.filter.iterations,
    format: (v) => v.toFixed(0),
    hint: "Narrow-range filter passes over the particles' depth. Rendering only.",
    onInput: (v) => {
      view.liquid.filter = { ...view.liquid.filter, iterations: Math.round(v) };
    },
  });
  const res = slider({
    label: "Surface resolution",
    min: 0.35,
    max: 1,
    step: 0.05,
    value: view.liquid.scale,
    format: (v) => `${Math.round(v * 100)}%`,
    hint: "The surface's depth and thickness images, as a fraction of the screen. Rendering only.",
    onInput: (v) => {
      view.liquid.scale = v;
    },
  });
  studio.tune.body.append(tint.el, smooth.el, res.el);
  studio.tune.setNote("These change how the water is drawn, not the simulation.");

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);

  // ------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.map((s) => ({ id: s.id, title: s.title })),
    "glass",
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
    undo: () => void a.undo(),
  };
  studio.transport.onStatus = () => studio.drawer.open("learn");
  let drawerOpen = false;
  studio.drawer.onChange = ((orig) => (open: boolean, tab: "learn" | "prove") => {
    orig?.(open, tab);
    drawerOpen = open;
    a.learnOpen = open && tab === "learn";
  })(studio.drawer.onChange);
  studio.share.handlers = {
    copyLink: () => {
      const link = url.link(current());
      void navigator.clipboard?.writeText(link).then(
        () => studio.toast.show("Link copied — it reproduces this scene's starting state"),
        () => studio.toast.show(link, 8000),
      );
    },
    snapshot: () => a.requestSnapshot(),
    clip: () => recordClip(),
  };
  a.onSnapshot = (b) => download(b, `water-in-hand-${a.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `water-in-hand-${a.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => a.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void a.restart());
  studio.key("1 2", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("D", "Drop a blob in the middle", () => a.requestDrop([0, 0]));
  studio.key("S", "Save point", () => a.savePoint());
  studio.key("Z", "Undo", () => void a.undo());
  studio.key("T", "Tune", () => studio.tune.toggle());

  const slowMotion = (): number => 1 / Math.max(TIME_SCALE[a.tier] * a.clock.speed, 1e-6);
  a.hooks = {
    onSceneChange: (scene) => learn.setScene(scene, a.water.n, slowMotion()),
  };

  // instruments: a full read-back about once a second while the drawer is open
  let measuring = false;
  let lastDiag: ReturnType<typeof diagnose> | null = null;
  const measure = async (): Promise<void> => {
    if (measuring || isCapturing() || a.busy || gate.busy > 0) return;
    measuring = true;
    try {
      const s = await a.water.readState();
      const d = diagnose(s, a.water.n);
      lastDiag = d;
      learn.setLive(d);
      prove.setLive(d, a.water.steps);
    } catch {
      /* a lost readback (device busy) — the next tick measures again */
    } finally {
      measuring = false;
    }
  };

  let lastPerf = 0;
  let lastMeasure = 0;
  const rafTimes: number[] = [];
  let lastFrame = performance.now();
  let lastCam = -1;
  let lastUrl = 0;
  const overlay = query.get("debug") === "perf" ? new PerfOverlay() : null;
  if (overlay) studio.root.append(overlay.el);
  const liveAt = { t: Infinity };
  a.hooks.onFrame = (now) => {
    overlay?.push({ frameMs: now - lastFrame, gpuMs: profiler.frameMs, passes: profiler.timings() });
    rafTimes.push(now - lastFrame);
    if (rafTimes.length > 600) rafTimes.shift();
    lastFrame = now;
    if (drawerOpen && now - liveAt.t > 1500 && now - lastMeasure > 1200) {
      lastMeasure = now;
      void measure();
    }
    if (a.camera.version !== lastCam && !a.camera.flying && now - lastUrl > 600) {
      lastCam = a.camera.version;
      lastUrl = now;
      a.writeUrl();
    }
    if (!a.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    const r = a.water.recipe;
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${a.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Particles", a.water.n.toLocaleString()],
        ["Solver steps / second", `${Math.round(a.rate)} (${(a.rate / Math.max(a.fps, 1)).toFixed(1)} a frame)`],
        ["Model time / wall time", `${a.measuredTimeScale.toFixed(3)} (1× = ${TIME_SCALE[a.tier]})`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms (solver ${passMs(profiler, "solver").toFixed(2)}, surface ${passMs(profiler, "liquid").toFixed(2)})`],
        ["Render scale", `${Math.round(st.renderScale * 100)}% · surface ${Math.round(view.liquid.scale * 100)}%`],
        ["Exposure", `${hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
    learn.setStats([
      ["Model time", `${a.water.time.toFixed(3)} s (${a.water.steps.toLocaleString()} steps of ${(r.dt * 1000).toFixed(3)} ms)`],
      ["Spacing · h", `${(r.spacing * 1000).toFixed(2)} mm · ${(r.h * 1000).toFixed(2)} mm`],
      ["Speed cap", `${r.vmax.toFixed(2)} m/s`],
      ["Drops", `${a.dropCount}`],
      ["Mean compression", lastDiag ? `${(lastDiag.meanCompression * 100).toFixed(3)} %` : "—"],
    ]);
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Filling the glass");
  const scene = sceneById(parsed.s);
  while (isCapturing()) await wait(50);
  await a.loadScene(scene.id, { seed: parsed.seed });
  if (parsed.cam[2]! > 0) a.camera.set({ yaw: parsed.cam[0]!, pitch: parsed.cam[1]!, distance: parsed.cam[2]!, target: [0, 0.42, 0] });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  a.setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  studio.veil.done();
  a.start();
  liveAt.t = performance.now();
  mark("live");
  (globalThis as { __waterLive?: boolean }).__waterLive = true;

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    // an orbit view: no bounded 2D domain for the shell check's letterbox test
    space: "3d",
    scene: a.scene.id,
    tier: a.tier,
    seed: a.seed,
    particles: a.water.n,
    size: a.size,
    sizes: SIZES,
    recipe: a.water.recipe,
    listK: LIST_K,
    steps: a.water.steps,
    time: a.water.time,
    solver: a.water.solver,
    drops: a.dropCount,
    events: a.eventCount,
    timeScale: TIME_SCALE[a.tier],
    measuredTimeScale: a.measuredTimeScale,
    camera: { yaw: a.camera.yaw, pitch: a.camera.pitch, distance: a.camera.distance, version: a.camera.version },
    renderScale: governor.renderScale,
    liquidScale: view.liquid.scale,
    adapter: gpu.adapterId,
    fps: a.fps,
    live: lastDiag,
  });
  (globalThis as { __water?: App }).__water = a;
  (globalThis as { __waterProve?: typeof prove }).__waterProve = prove;
  (globalThis as { __waterMeasure?: () => Promise<unknown> }).__waterMeasure = async () => {
    await measure();
    return lastDiag;
  };

  if (query.get("bench") === "1") void bench(a, profiler, rafTimes);
}

async function bench(app: App, profiler: GpuProfiler, rafTimes: number[]): Promise<void> {
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
  const stepsPerSecond = (app.stepsTotal - steps0) / seconds;
  const result = {
    adapter: app.gpu.adapterId,
    tier: app.tier,
    particles: app.water.n,
    solver: app.water.solver,
    scene: app.scene.id,
    maxInFlight: app.maxInFlight,
    viewport: [app.camera.viewW, app.camera.viewH],
    surfaceScale: app.view.liquid.scale,
    timing: profiler.source,
    frames: rafTimes.length,
    fps: rafTimes.length / seconds,
    frameP50: percentile(rafTimes, 0.5),
    frameP90: percentile(rafTimes, 0.9),
    frameP99: percentile(rafTimes, 0.99),
    gpuP50: percentile(gpuMs, 0.5),
    gpuP90: percentile(gpuMs, 0.9),
    solverMs: passMs(profiler, "solver"),
    surfaceMs: passMs(profiler, "liquid"),
    stepsPerSecond,
    stepsPerFrame: stepsPerSecond / Math.max(rafTimes.length / seconds, 1e-9),
    msPerStep: passMs(profiler, "solver") / Math.max(stepsPerSecond / Math.max(rafTimes.length / seconds, 1e-9), 1e-9),
    modelSecondsPerSecond: stepsPerSecond * app.water.recipe.dt,
    passes: profiler.timings().map((p) => ({ name: p.name, avgMs: p.avg })),
    renderScale: app.governor?.renderScale ?? 1,
    governor: app.governor?.status().message ?? "",
  };
  (globalThis as { __bpBench?: unknown }).__bpBench = result;
  console.info(`BP_BENCH ${JSON.stringify(result)}`);
}

void boot();
