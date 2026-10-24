// Swarm — the v2 page (docs/planning/rebuild-v2/03-boids-2d.md), Wave A of
// the Field Studies rebuild. Served at /sims/boids-2d/v2/ while v1 (the v4
// lab) stays live at /sims/boids-2d/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts buildCanonicalCapture() — the v1 page's
//     capture, ported unchanged — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips once the first frame is scheduled.
// verify.py then applies the established new_canonical gate, unchanged
// (_gate_boids_2d: run-twice byte identity plus the observable bounds).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, BLOOM, SHARK_RADIUS_R } from "./app.js";
import type { SceneOptions } from "./app.js";
import { buildLearn } from "./learn.js";
import { FlockKernels } from "./model/flock.js";
import type { RuleParams } from "./model/params.js";
import { buildCanonicalCapture } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import type { FishColour } from "./render/ocean-view.js";
import { DEFAULT_LOOK, OceanView } from "./render/ocean-view.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import { buildTune } from "./tune.js";

const SIM_NAME = "Swarm";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "open-water", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    // the rule, written only where it differs from the scene's (−1 = the scene's value)
    ws: { kind: "num", def: -1, min: -1, max: 3, digits: 3 },
    wa: { kind: "num", def: -1, min: -1, max: 3, digits: 3 },
    wc: { kind: "num", def: -1, min: -1, max: 3, digits: 3 },
    r: { kind: "num", def: -1, min: -1, max: 0.18, digits: 4 },
    vmax: { kind: "num", def: -1, min: -1, max: 0.013, digits: 5 },
    eta: { kind: "num", def: -1, min: -1, max: 0.6, digits: 3 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    shark: { kind: "num", def: SHARK_RADIUS_R, min: 4, max: 40, digits: 0 },
    col: { kind: "enum", def: "silver", values: ["silver", "heading"] },
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
    eyebrow: "03 / AGENT-BASED",
    canvasLabel:
      "A swarm simulation: up to a million fish school over a dark ocean. With the Shark tool, move the pointer into the water to hunt them and hold the button to lunge; " +
      "right-drag or use two fingers to pan, scroll or pinch to zoom.",
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
    // luminous fish over dark water: meter the bright end, keep the water dark
    exposure: { percentile: 0.99, key: 0.5, min: 0.25, max: 2.5, tau: 1.0 },
    bloom: { intensity: BLOOM, levels: 6 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  // frame-interval budget: a 60 Hz frame is 16.7 ms, a missed vsync 33 ms
  const governor = new QualityGovernor({ budgetMs: tier === "T1" ? 36 : 22, effectLevels: 1 });
  studio.veil.step("Compiling the flock kernel");
  const kernels = await FlockKernels.create(device);
  const view = new OceanView(device, DEFAULT_LOOK);
  const app = new App(gpu, studio, hdr, view, kernels, tier);
  // GPU timings set how many steps a frame may take at high speed (16.7 ms frames)
  if (gpu.timestamps) profiler.onFrame = () => void app.adaptToTimings(profiler.timings(), 14, profiler.frameTag);
  app.profiler = profiler;
  app.governor = governor;
  if (query.has("sortEvery")) app.sortEvery = Math.max(0, Number(query.get("sortEvery")) | 0);
  if (query.has("inflight")) app.maxInFlight = Math.min(3, Math.max(1, Number(query.get("inflight")) | 0));

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => {
    const r = app.flock.rule;
    const d = app.scene.rule;
    const or = (v: number, def: number): number => (v === def ? -1 : v);
    return {
      s: app.scene.id,
      seed: app.seed,
      ws: or(r.wSep, d.wSep),
      wa: or(r.wAli, d.wAli),
      wc: or(r.wCoh, d.wCoh),
      r: or(r.rCoh, d.rCoh),
      vmax: or(r.maxSpeed, d.maxSpeed),
      eta: or(r.noise, d.noise),
      sp: app.clock.speed,
      shark: app.sharkSize,
      col: view.look.colour,
      cam: [app.camera.cx / app.camera.domainW, app.camera.cy / app.camera.domainH, app.camera.pxPerUnit / app.camera.coverZoom()].map((x) =>
        Number(x.toFixed(4)),
      ),
    };
  };
  app.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const setColour = (c: FishColour): void => {
    view.look = { ...view.look, colour: c };
    app.writeUrl();
  };
  const tune = buildTune(
    studio.tune.body,
    {
      rule: (r, phase) => app.setRule(r, phase),
      reset: () => {
        app.resetRule();
        syncTune();
      },
      colour: setColour,
    },
    app.scene.rule,
  );
  studio.tune.setNote("The rule is the v4 lab's Reynolds flock. Every value keeps the kernel's exactness: same seed, same GPU, same bytes.");
  const syncTune = (): void => tune.sync(app.flock.rule, view.look.colour);

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);

  // ------------------------------------------------------------- Prove --
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    kernels,
    rule: () => app.flock.rule,
    live: () => ({ n: app.flock.n, halfW: app.flock.halfW, halfH: app.flock.halfH, seed: app.seed }),
    liveSort: () => app.flock.sortSnapshot(),
    showProof: () => {
      void app.loadScene("proof").then(() => app.writeUrl());
    },
    hold: (on) => {
      governor.suspended = on;
    },
  });
  const syncProve = (): void =>
    prove.setOnScreen({
      proofRun: app.onProofRun,
      scene: app.scene.title,
      fish: app.flock.n,
      world: [app.flock.halfW * 2, app.flock.halfH * 2],
      sharkOn: app.scene.shark,
      edited: app.edits > 0,
    });

  // The developer capture control — the headless gate's entry point.
  const captureStatus = h("p", {}, "Re-emits the release gate's capture (window.__bitPhysicsCapture).");
  const captureBtn = h("button", { type: "button", class: "bp-btn", "data-bp": "capture" }, "Export proof capture");
  const captureLink = h("a", { href: "#", hidden: true }, "Download the capture JSON");
  captureBtn.addEventListener("click", () => {
    if (isCapturing()) return;
    void runCaptureExclusive(async () => {
      resetCapture();
      captureBtn.disabled = true;
      captureLink.hidden = true;
      governor.suspended = true;
      captureStatus.textContent = "Building the release gate's capture…";
      try {
        await new Promise((r) => setTimeout(r, 0));
        const { bundle, ordered, noisy } = buildCanonicalCapture();
        exposeCapture(bundle, { download: false });
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (φ calm ${ordered.finalPhi.toFixed(3)}, noisy ${noisy.finalPhi.toFixed(3)}).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "boids-2d-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "sw-capture-row" }, captureBtn, captureLink));

  // ---------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.filter((s) => s.listed).map((s) => ({ id: s.id, title: s.title })),
    "open-water",
  );
  studio.heading.onPick = (id) => {
    void app.loadScene(id as SceneId, { seed: app.seed }).then(() => app.writeUrl());
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
    undo: () => studio.toast.show("Nothing to undo — the shark leaves no edits behind"),
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
  app.onSnapshot = (b) => download(b, `swarm-${app.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `swarm-${app.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => app.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void app.restart());
  studio.key("1 2", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("[ ]", "Shark size", (e) => {
    app.setSharkSize(Math.min(40, Math.max(4, app.sharkSize + (e.key === "]" ? 2 : -2))));
    studio.toast.show(`Shark size ${app.sharkSize} r`);
  });
  studio.key("S", "Save point", () => app.savePoint());
  studio.key("C", "Compare with the save point", () => app.toggleCompare());
  studio.key("T", "Tune", () => studio.tune.toggle());

  app.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, app.onProofRun);
      syncTune();
      syncProve();
    },
    onRule: (r) => {
      learn.setRule(r);
      syncTune();
      syncProve();
    },
    onEdited: () => syncProve(),
    onOrder: (o) => {
      if (app.learnOpen) learn.pushOrder(o);
    },
  };

  // Learn: the ocean and performance, about once a second while it is open
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
    if (!app.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    const f = app.flock;
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${app.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Fish", f.n.toLocaleString()],
        ["Solver steps / second", `${Math.round(app.clock.ticksPerSecond * app.clock.speed)}`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ["Exposure", `${app.hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
    const area = f.halfW * f.halfH * 4;
    learn.setStats([
      ["Ocean", `${(f.halfW * 2).toFixed(1)} × ${(f.halfH * 2).toFixed(1)} (wraps at the edges)`],
      ["Fish per unit²", (f.n / area).toFixed(0)],
      ["Neighbours within r, if spread evenly", ((f.n / area) * Math.PI * f.rule.rCoh * f.rule.rCoh).toFixed(1)],
      ["Grid", `${f.grid.cols} × ${f.grid.rows} cells`],
      ["Steps", f.tick.toLocaleString()],
    ]);
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Releasing the fish");
  const scene = sceneById(parsed.s as SceneId);
  const pick = (v: number, def: number): number => (v >= 0 ? v : def);
  const d = scene.rule;
  const rule: RuleParams = {
    ...d,
    wSep: pick(parsed.ws, d.wSep),
    wAli: pick(parsed.wa, d.wAli),
    wCoh: pick(parsed.wc, d.wCoh),
    rCoh: pick(parsed.r, d.rCoh),
    maxSpeed: pick(parsed.vmax, d.maxSpeed),
    noise: pick(parsed.eta, d.noise),
  };
  app.sharkSize = parsed.shark;
  view.look = { ...view.look, colour: parsed.col as FishColour };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opts: SceneOptions = {
    seed: parsed.seed,
    rule,
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
    tick: app.flock.tick,
    agents: app.flock.n,
    world: [app.flock.halfW * 2, app.flock.halfH * 2],
    domain: [app.camera.domainW, app.camera.domainH],
    density: app.flock.n / (app.flock.halfW * app.flock.halfH * 4),
    declaredDensity: app.scene.density,
    periodic: true,
    viewport: [app.camera.viewW, app.camera.viewH],
    view: app.camera.viewRect(),
    coverZoom: app.camera.coverZoom(),
    zoom: app.camera.pxPerUnit,
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    grid: [app.flock.grid.cols, app.flock.grid.rows],
    order: app.order,
  });
  (globalThis as { __swarm?: App }).__swarm = app;
  (globalThis as { __swarmProve?: typeof prove }).__swarmProve = prove;
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
  const steps0 = app.stepsTotal;
  await wait(10000);
  profiler.onFrame = prev;
  const seconds = (performance.now() - t0) / 1000;
  const result = {
    adapter: app.gpu.adapterId,
    tier: app.tier,
    agents: app.flock.n,
    world: [app.flock.halfW * 2, app.flock.halfH * 2],
    grid: [app.flock.grid.cols, app.flock.grid.rows],
    scene: app.scene.id,
    sortEvery: app.flock.sortEvery,
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
