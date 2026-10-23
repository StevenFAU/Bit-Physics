// Slime Mould — the v2 page (docs/planning/rebuild-v2/02-physarum.md), Wave A
// of the Field Studies rebuild. Served at /sims/physarum/v2/ while v1 stays
// live at /sims/physarum/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts captureCanonical() — the v1 capture path
//     ported unchanged on dedicated buffers — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips once the first frame is scheduled.
// verify.py then applies the established new_canonical gate, unchanged.

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, checkCountingSort, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, BLOOM, SORT_EVERY } from "./app.js";
import type { SceneOptions } from "./app.js";
import { buildLearn } from "./learn.js";
import { LiveKernels } from "./model/sim.js";
import { DENSITY } from "./model/grid.js";
import type { JonesParams } from "./proof/gate.js";
import { PARAMS, createGateRunner } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { DEFAULT_LOOK, GlowView } from "./render/glow-view.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import { buildTune } from "./tune.js";

const SIM_NAME = "Slime Mould";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "network", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    // Jones parameters, written only where they differ from the scene's (−1 = the scene's value)
    dphi: { kind: "num", def: -1, min: -1, max: 180, digits: 2 },
    ls: { kind: "num", def: -1, min: -1, max: 64, digits: 2 },
    lm: { kind: "num", def: -1, min: -1, max: 8, digits: 3 },
    dep: { kind: "num", def: -1, min: -1, max: 50, digits: 2 },
    a: { kind: "num", def: -1, min: -1, max: 0.9, digits: 4 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    pal: { kind: "enum", def: "auto", values: ["auto", ...Object.keys(PALETTES)] },
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
    eyebrow: "02 / AGENT-BASED",
    canvasLabel:
      "A slime mould simulation: millions of agents lay and follow glowing trails that grow into a network. Drag to pan, scroll or pinch to zoom; choose Probe from the tool rail to read the trail at a point.",
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
  const hdr = new HdrPipeline(gpu, studio.canvas, {
    toneMap: "agx",
    // emissive network on a near-black dish: meter the bright end, and never
    // push the empty agar up into grey
    exposure: { percentile: 0.985, key: 0.9, min: 0.25, max: 1.5, tau: 1.2 },
    bloom: { intensity: BLOOM, levels: 6 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({
    budgetMs: gpu.timestamps ? 14 : tier === "T1" ? 36 : 22,
    effectLevels: 1,
  });
  studio.veil.step("Compiling the solver and the gate");
  const [kernels, gate] = await Promise.all([LiveKernels.create(device), createGateRunner(device)]);
  const view = new GlowView(device, { ...DEFAULT_LOOK, palette: PALETTES.ember });
  const app = new App(gpu, studio, hdr, view, kernels, tier);
  if (gpu.timestamps) {
    profiler.onFrame = () => {
      const at1x = app.adaptToTimings(profiler.timings(), governor.budgetMs);
      if (at1x !== null) governor.sample(at1x);
    };
  }
  app.profiler = profiler;
  app.governor = governor;

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => {
    const p = app.sim.params;
    const d = app.scene.params;
    const or = (v: number, def: number): number => (v === def ? -1 : v);
    return {
      s: app.scene.id,
      seed: app.seed,
      dphi: or(p.delta_phi_deg, d.delta_phi_deg),
      ls: or(p.L_sense, d.L_sense),
      lm: or(p.L_move, d.L_move),
      dep: or(p.deposit, d.deposit),
      a: or(p.decay_alpha, d.decay_alpha),
      sp: app.clock.speed,
      pal: app.palette === app.scene.palette ? "auto" : app.palette,
      cam: [app.camera.cx / app.sim.w, app.camera.cy / app.sim.h, app.camera.pxPerUnit / app.camera.coverZoom()].map((v) => Number(v.toFixed(4))),
    };
  };
  app.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(studio.tune.body, {
    params: (p, phase) => app.setParams(p, phase),
    reset: () => {
      app.resetParams();
      syncTune();
    },
    palette: (p) => app.setPalette(p),
  });
  studio.tune.setNote(
    `The gate runs Jones 2010 Table 1: turn ${PARAMS.delta_phi_deg}°, reach ${PARAMS.L_sense}, step ${PARAMS.L_move}, deposit ${PARAMS.deposit}, fade ${PARAMS.decay_alpha}. Any values keep the mass balance.`,
  );
  const syncTune = (): void => tune.sync(app.sim.params, app.palette);

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);

  // ------------------------------------------------------------- Prove --
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    kernels,
    showGated: () => {
      void app.loadScene("gated").then(() => app.writeUrl());
    },
    hold: (on) => {
      governor.suspended = on;
    },
    liveMass: () => app.liveMass(),
  });
  const syncProve = (): void =>
    prove.setOnScreen({
      gated: app.onGatedRun,
      scene: app.scene.title,
      agents: app.sim.n,
      grid: [app.sim.w, app.sim.h],
      params: app.sim.params,
    });

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
      captureStatus.textContent = "Capturing the canonical run (5,000 steps)…";
      try {
        const bundle = await gate.captureCanonical();
        exposeCapture(bundle, { download: false });
        const mass = bundle.steps[0]?.diagnostics?.["total_mass"];
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (total mass ${typeof mass === "number" ? mass.toFixed(3) : "?"}).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "physarum-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "ph-capture-row" }, captureBtn, captureLink));

  // ---------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.filter((s) => s.listed).map((s) => ({ id: s.id, title: s.title })),
    "network",
  );
  studio.heading.onPick = (id) => {
    void app.loadScene(id as SceneId).then(() => app.writeUrl());
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
    undo: () => studio.toast.show("Nothing to undo — Slime Mould has no edit tools yet"),
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
  app.onSnapshot = (b) => download(b, `slime-mould-${app.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `slime-mould-${app.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => app.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void app.restart());
  studio.key("1 2", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("S", "Save point", () => app.savePoint());
  studio.key("C", "Compare with the save point", () => app.toggleCompare());
  studio.key("T", "Tune", () => studio.tune.toggle());

  app.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, app.onGatedRun);
      syncTune();
      syncProve();
    },
    onParams: (p) => {
      learn.setParams(p);
      syncTune();
      syncProve();
    },
    onEdited: () => syncProve(),
  };

  // Learn: instruments + performance, about once a second while it is open
  let lastPerf = 0;
  let massBusy = false;
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
    if (!app.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    const sim = app.sim;
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${app.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Agents", sim.n.toLocaleString()],
        ["Dish", `${sim.w} × ${sim.h}`],
        ["Solver steps / second", `${Math.round(app.clock.ticksPerSecond * app.clock.speed)}`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ["Exposure", `${app.hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
    const rows: [string, string][] = [
      ["Agents per cell", (sim.n / sim.cells).toFixed(3)],
      ["Mean trail per cell at balance", sim.meanTrail.toFixed(2)],
      ["Steps", sim.tick.toLocaleString()],
      ["Re-sorts", sim.sorts.toLocaleString()],
    ];
    if (massBusy) return;
    massBusy = true;
    void app
      .liveMass()
      .then((m) => learn.setStats(rows, m))
      .catch(() => learn.setStats(rows, null))
      .finally(() => {
        massBusy = false;
      });
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Scattering the agents");
  const scene = sceneById(parsed.s as SceneId);
  const pick = (v: number, def: number): number => (v >= 0 ? v : def);
  const sp = scene.params;
  const params: JonesParams = {
    delta_phi_deg: pick(parsed.dphi, sp.delta_phi_deg),
    L_sense: pick(parsed.ls, sp.L_sense),
    L_move: pick(parsed.lm, sp.L_move),
    deposit: pick(parsed.dep, sp.deposit),
    decay_alpha: pick(parsed.a, sp.decay_alpha),
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opts: SceneOptions = {
    seed: parsed.seed,
    params,
    palette: parsed.pal !== "auto" ? (parsed.pal as PaletteId) : undefined,
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
    agents: app.sim.n,
    domain: [app.sim.w, app.sim.h],
    density: app.sim.n / app.sim.cells,
    declaredDensity: DENSITY,
    periodic: true,
    viewport: [app.camera.viewW, app.camera.viewH],
    view: app.camera.viewRect(),
    coverZoom: app.camera.coverZoom(),
    zoom: app.camera.pxPerUnit,
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    sortEvery: app.sim.sortEvery,
  });
  (globalThis as { __physarum?: App }).__physarum = app;
  (globalThis as { __physarumProve?: typeof prove }).__physarumProve = prove;
  (globalThis as { __physarumChecks?: unknown }).__physarumChecks = {
    /** The counting sort on the live agents against the CPU reference. */
    sort: async () => {
      const s = await app.sim.sortSnapshot();
      return { keyCount: s.keyCount, items: s.keys.length, problem: checkCountingSort(s.keys, s.keyCount, s.cellStart, s.order) };
    },
    liveVsGated: () => prove.runLiveVsGated(),
    liveMass: () => prove.runLiveMass(),
    gate: () => gate.runTwiceAndAgree(),
  };
  markReady();

  if (query.get("bench") === "1") void bench(app, profiler, rafTimes, Number(query.get("sortEvery") ?? SORT_EVERY));
}

async function bench(app: App, profiler: GpuProfiler, rafTimes: number[], sortEvery: number): Promise<void> {
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  app.sim.sortEvery = sortEvery;
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
    agents: app.sim.n,
    grid: [app.sim.w, app.sim.h],
    density: app.sim.n / app.sim.cells,
    scene: app.scene.id,
    sortEvery: app.sim.sortEvery,
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
