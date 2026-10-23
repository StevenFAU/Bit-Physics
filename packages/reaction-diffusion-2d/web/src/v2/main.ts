// Turing Patterns — the v2 page (docs/planning/rebuild-v2/01-reaction-diffusion.md),
// the Wave 0 pilot of the Field Studies platform. Served at
// /sims/reaction-diffusion-2d/v2/ while v1 stays live at /sims/reaction-diffusion-2d/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts captureCanonical() — the v1 capture path
//     ported unchanged on dedicated buffers — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips once the first frame is scheduled.
// verify.py then applies the established capture_roundtrip gate, unchanged.

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App } from "./app.js";
import type { SceneOptions } from "./app.js";
import { Instruments } from "./learn/instruments.js";
import { buildLearn } from "./learn/learn.js";
import { buildProve } from "./proof/prove.js";
import { createGateRunner } from "./proof/gate.js";
import { runModelGolden, runTuringCheck } from "./proof/model-checks.js";
import V from "../generated/verification.json";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";
import type { SceneId } from "./scenes/scenes.js";
import type { PatternId } from "./scenes/scenes.js";
import { PATTERN_IDS, SCENES, SHAPE_PATTERNS, sceneById } from "./scenes/scenes.js";
import type { ShapeId } from "./model/surface-mesh.js";
import { buildTune } from "./ui/tune.js";

const SIM_NAME = "Turing Patterns";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "map", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    F: { kind: "num", def: -1, min: -1, max: 20, digits: 5 },
    k: { kind: "num", def: -1, min: -1, max: 20, digits: 5 },
    r: { kind: "num", def: 2, min: 1, max: 6, digits: 3 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    pal: { kind: "enum", def: "auto", values: ["auto", ...Object.keys(PALETTES)] },
    t: { kind: "str", def: "", pattern: /^[a-z]{0,12}$/ },
    g: { kind: "nums", def: [0, 0], n: 2 },
    cam: { kind: "nums", def: [-1, -1, -1], n: 3, digits: 4 },
    // On a Shape: the object and the pattern (cam then holds the orbit: yaw, pitch, distance)
    sh: { kind: "enum", def: "sphere", values: ["sphere", "torus"] },
    pat: { kind: "enum", def: "coral", values: PATTERN_IDS },
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
    eyebrow: "01 / REACTION–DIFFUSION",
    canvasLabel:
      "Turing patterns growing in a simulated dish. Choose a tool from the rail, then drag on the dish; on The Map, tap a region to dive into it.",
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
  studio.veil.step("Compiling the renderer");
  const hdr = new HdrPipeline(gpu, studio.canvas, { toneMap: "neutral" });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({
    budgetMs: gpu.timestamps ? 14 : tier === "T1" ? 36 : 22,
    effectLevels: 1,
  });
  const app = new App(gpu, studio, hdr, tier);
  if (query.get("chrome") === "off") app.framing = "full";
  if (gpu.timestamps) {
    profiler.onFrame = () => {
      const at1x = app.adaptToTimings(profiler.timings(), governor.budgetMs);
      if (at1x !== null) governor.sample(at1x);
    };
  }
  app.profiler = profiler;
  app.governor = governor;

  studio.veil.step("Compiling the solver, the gate and the instruments");
  const [instruments, gate] = await Promise.all([Instruments.create(device), createGateRunner(device)]);
  app.instruments = instruments;

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => {
    const s = app.scene;
    const c = app.sim.chem;
    const dived = s.id === "map" && c.reveal !== null;
    const sceneId = dived ? "dish" : s.id;
    const def = sceneById(sceneId);
    const shapeDef = s.surface ? SHAPE_PATTERNS[app.pattern] : null;
    const chemDefault = s.sweep && !dived ? true : shapeDef ? c.F0 === shapeDef.F && c.k0 === shapeDef.k : c.F0 === def.F && c.k0 === def.k;
    const orbit = app.orbit.state();
    return {
      s: sceneId,
      seed: app.ctx.seed,
      F: chemDefault ? -1 : c.F0,
      k: chemDefault ? -1 : c.k0,
      r: app.ratio,
      sp: app.clock.speed,
      pal: app.palette === (shapeDef?.palette ?? def.palette) ? "auto" : app.palette,
      t: app.studio.rail.active === def.tool ? "" : app.studio.rail.active,
      g: def.grid || s.surface ? [0, 0] : [app.ctx.w, app.ctx.h],
      cam: (s.surface
        ? [((orbit.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), orbit.pitch, orbit.distance]
        : [app.camera.cx / app.ctx.w, app.camera.cy / app.ctx.h, app.camera.pxPerUnit / app.camera.coverZoom()]
      ).map((v) => Number(v.toFixed(4))),
      sh: s.surface ? app.shape : "sphere",
      pat: s.surface ? app.pattern : "coral",
    };
  };
  app.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(studio.tune.body, (t) => studio.tune.setNote(t), {
    chemistry: (F, k, phase) => app.setChemistry(F, k, phase),
    ratio: (r, phase) => app.setRatio(r, phase),
    speed: (v) => app.setSpeed(v),
    palette: (p) => app.setPalette(p),
  });
  const syncTune = (): void =>
    tune.sync({
      model: app.sim.chem.model,
      F: app.sim.chem.F0,
      k: app.sim.chem.k0,
      ratio: app.ratio,
      speed: app.clock.speed,
      palette: app.palette,
      sweeping: app.inMapSweep,
    });

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn, {
    symbol: (sym) => {
      studio.tune.show();
      tune.focus(sym);
    },
    dataView: (on) => {
      app.view.view.mode = on ? "colormap" : "material";
      app.view.view.colormap = "viridis";
      app.view.view.range = app.model.range;
      app.view.view.isolines = on ? 5 : 0;
      app.hdr.exposure = { ...app.hdr.exposure, mode: on ? "pinned" : "auto", value: 1 };
    },
    raw: (on) => {
      app.view.view.mode = on ? "raw" : "material";
      app.view.view.colormap = "viridis";
      app.view.view.range = app.model.range;
      app.hdr.exposure = { ...app.hdr.exposure, mode: on ? "pinned" : "auto", value: 1 };
    },
    labels: (on) => {
      app.showLabels = on;
    },
    scene: (id) => {
      void app.loadScene(id).then(() => app.writeUrl());
    },
  });

  // ------------------------------------------------------------- Prove --
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    showGated: () => {
      void app.loadScene("gated").then(() => app.writeUrl());
    },
    hold: (on) => {
      governor.suspended = on;
    },
  });
  const syncProve = (): void =>
    prove.setOnScreen({ gated: app.onGatedRun, kernel: app.sim.kernel, scene: app.scene.title, edits: app.edits });

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
      captureStatus.textContent = "Capturing the canonical run (2000 steps)…";
      try {
        const bundle = await gate.captureCanonical((step) => {
          captureStatus.textContent = `Capturing the canonical run — step ${step} of 2000…`;
        });
        exposeCapture(bundle, { download: false });
        captureStatus.textContent = "Capture ready: window.__bitPhysicsCapture.";
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "reaction-diffusion-2d-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "rd-capture-row" }, captureBtn, captureLink));

  // ---------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.filter((s) => s.listed).map((s) => ({ id: s.id, title: s.title })),
    "map",
  );
  studio.heading.onPick = (id) => {
    void app.loadScene(id as SceneId).then(() => app.writeUrl());
  };
  studio.rail.onSelect = (id) => {
    app.selectTool(id);
    app.writeUrl();
  };
  studio.transport.handlers = {
    play: () => app.togglePlay(),
    step: () => {
      if (!app.clock.paused) app.togglePlay();
      app.clock.stepOnce();
    },
    restart: () => void app.restart(),
    speed: (v) => {
      app.setSpeed(v);
      syncTune();
    },
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
        () => studio.toast.show("Link copied — it reproduces this scene's starting state"),
        () => studio.toast.show(link, 8000),
      );
    },
    snapshot: () => app.requestSnapshot(),
    clip: () => recordClip(),
  };
  app.onSnapshot = (b) => download(b, `turing-patterns-${app.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `turing-patterns-${app.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  // keyboard
  studio.key("Space", "Play / pause", () => app.togglePlay());
  studio.key(".", "Step (4 solver steps)", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void app.restart());
  studio.key("1 2 3 4 5 6", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("[ ]", "Brush smaller / larger", (e) => app.nudgeBrush(e.key === "]" ? 1.25 : 0.8));
  studio.key("S", "Save point", () => app.savePoint());
  studio.key("C", "Compare with the save point", () => app.toggleCompare());
  studio.key("Z", "Undo", () => void app.undo());
  studio.key("T", "Tune", () => studio.tune.toggle());
  studio.key("M", "Back to The Map", () => void app.backToMap());

  app.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, app.onGatedRun, app.model);
      syncTune();
      syncProve();
    },
    onChemistry: (F, k, r) => {
      learn.setChemistry(F, k, r);
      syncTune();
      syncProve();
    },
    onEdited: () => syncProve(),
    onStats: (s) => learn.setStats(s, app.sim.tick),
    onSpectrum: (s) => learn.setSpectrum(s),
  };

  // performance readout (Learn) + optional bench
  let lastPerf = 0;
  const rafTimes: number[] = [];
  let lastFrame = performance.now();
  let lastCam = -1;
  const overlay = query.get("debug") === "perf" ? new PerfOverlay() : null;
  if (overlay) studio.root.append(overlay.el);
  app.hooks.onFrame = (now) => {
    overlay?.push({ frameMs: now - lastFrame, gpuMs: profiler.frameMs, passes: profiler.timings() });
    rafTimes.push(now - lastFrame);
    if (rafTimes.length > 600) rafTimes.shift();
    lastFrame = now;
    if (app.camera.version !== lastCam && !app.camera.flying && now - lastPerf > 400) {
      lastCam = app.camera.version;
      app.writeUrl();
    }
    if (!app.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${app.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Grid", `${app.sim.w} × ${app.sim.h}`],
        ["Solver steps / second", `${Math.round(app.clock.ticksPerSecond * app.clock.speed * 4)}`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ["Exposure", `${app.hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Seeding the dish");
  const sceneId = parsed.s as SceneId;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opts: SceneOptions = {
    seed: parsed.seed,
    F: parsed.F >= 0 ? parsed.F : undefined,
    k: parsed.k >= 0 ? parsed.k : undefined,
    ratio: parsed.r !== 2 ? parsed.r : undefined,
    palette: parsed.pal !== "auto" ? (parsed.pal as PaletteId) : undefined,
    grid: parsed.g[0]! > 0 && parsed.g[1]! > 0 ? [parsed.g[0]!, parsed.g[1]!] : undefined,
    camera: parsed.cam[2]! > 0 && sceneId !== "shape" ? { cx: parsed.cam[0]!, cy: parsed.cam[1]!, zoom: parsed.cam[2]! } : undefined,
    orbit: parsed.cam[2]! > 0 && sceneId === "shape" ? { yaw: parsed.cam[0]!, pitch: parsed.cam[1]!, distance: parsed.cam[2]! } : undefined,
    shape: parsed.sh as ShapeId,
    pattern: parsed.pat as PatternId,
    tool: parsed.t || undefined,
    prewarmMs: sceneId === "map" && !reduced ? 350 : 0,
  };
  await app.loadScene(sceneId, opts);
  app.setSpeed(reduced && parsed.sp === 1 ? 0.25 : parsed.sp);
  syncTune();
  studio.veil.done();
  app.start();
  // test/inspection hook (layout checks, replay tests): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    scene: app.scene.id,
    tier: app.tier,
    tick: app.sim.tick,
    domain: [app.sim.w, app.sim.h],
    periodic: app.sim.periodic,
    viewport: [app.camera.viewW, app.camera.viewH],
    view: app.camera.viewRect(),
    coverZoom: app.camera.coverZoom(),
    zoom: app.camera.pxPerUnit,
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
  });
  (globalThis as { __turing?: App }).__turing = app;
  (globalThis as { __turingProve?: typeof prove }).__turingProve = prove;
  // measurement hooks: the model checks at other seeds (v2-acceptance.mjs)
  (globalThis as { __turingChecks?: unknown }).__turingChecks = {
    golden: (descriptor: string) => {
      const g = V.models.goldens.find((x) => x.descriptor === descriptor);
      if (!g) throw new Error(`no golden ${descriptor}`);
      return runModelGolden(device, g);
    },
    turing: (seed?: number) => runTuringCheck(device, seed),
  };
  markReady();

  if (query.get("bench") === "1") void bench(app, profiler, rafTimes);
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
  const tick0 = app.sim.tick;
  await wait(10000);
  profiler.onFrame = prev;
  const seconds = (performance.now() - t0) / 1000;
  const result = {
    adapter: app.gpu.adapterId,
    tier: app.tier,
    grid: [app.sim.w, app.sim.h],
    scene: app.scene.id,
    timing: profiler.source,
    frames: rafTimes.length,
    fps: rafTimes.length / seconds,
    frameP50: percentile(rafTimes, 0.5),
    frameP90: percentile(rafTimes, 0.9),
    frameP99: percentile(rafTimes, 0.99),
    gpuP50: percentile(gpuMs, 0.5),
    gpuP90: percentile(gpuMs, 0.9),
    solverStepsPerSecond: ((app.sim.tick - tick0) * 4) / seconds,
    passes: profiler.timings().map((p) => ({ name: p.name, avgMs: p.avg })),
    renderScale: app.governor?.renderScale ?? 1,
    governor: app.governor?.status().message ?? "",
  };
  (globalThis as { __bpBench?: unknown }).__bpBench = result;
  console.info(`BP_BENCH ${JSON.stringify(result)}`);
}

void boot();
