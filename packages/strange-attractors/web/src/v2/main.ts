// Chaos — the v2 page (docs/planning/rebuild-v2/05-strange-attractors.md),
// Wave B of the Field Studies rebuild. Served at /sims/strange-attractors/v2/
// while v1 stays live at /sims/strange-attractors/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts — v1's capture path ported verbatim on
//     its own buffers — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips as soon as the gate path is usable (the
//     frozen kernel compiled, the capture button wired). The renderer, the
//     live kernels and the scene compile and load afterwards, behind the
//     loading veil; deferred steps that write to the GPU queue wait for a
//     running capture. window.__chaosLive flips when the live view runs.
// verify.py then applies the established new_canonical gate, unchanged
// (_gate_strange: run-twice byte identity + the dense f64 envelope).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, SIZES } from "./app.js";
import { sci } from "./format.js";
import { buildDigitsPanel } from "./digits-panel.js";
import { buildLearn } from "./learn.js";
import { ChaosKernels } from "./model/ensemble.js";
import type { LorenzParams } from "./model/lorenz.js";
import { CLASSIC } from "./model/lorenz.js";
import { GateRunner, N_STEPS, buildCapture } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { ChaosView } from "./render/chaos-view.js";
import type { SceneId } from "./scenes.js";
import { DIGITS_MAX, DIGITS_MIN, SCENES, sceneById } from "./scenes.js";
import { buildTune } from "./tune.js";

const SIM_NAME = "Chaos";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "butterfly", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    // precision of the next release, digits
    d: { kind: "int", def: -1, min: -1, max: DIGITS_MAX },
    // the system, written only where it differs from the scene's (−1 = the scene's value)
    sig: { kind: "num", def: -1, min: -1, max: 30, digits: 3 },
    rho: { kind: "num", def: -1, min: -1, max: 200, digits: 3 },
    beta: { kind: "num", def: -1, min: -1, max: 5, digits: 4 },
    // clock speed, written only where it differs from the scene's (−1 = the scene's)
    sp: { kind: "num", def: -1, min: -1, max: 8 },
    fol: { kind: "int", def: 0, min: 0, max: 1 },
    cam: { kind: "nums", def: [-99, -99, -1], n: 3, digits: 3 },
  },
  1,
);

/** Boot phases, ms since navigation start (read by the boot-time measurements). */
const bootMarks: Record<string, number> = {};
(globalThis as { __chaosBoot?: Record<string, number> }).__chaosBoot = bootMarks;
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
    eyebrow: "05 / CHAOS",
    canvasLabel:
      "The Lorenz attractor drawn as a long exposure, with a ball of up to a million starting points released onto it. " +
      "Click on the attractor to release a ball there; drag to turn the view, scroll or pinch to zoom, double-click to reset it.",
  });
  if (query.get("chrome") === "off") studio.setChrome(false);
  studio.heading.set("The Butterfly", "A million starts, one point. Watch.", "05 / CHAOS");
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
  mark("gate");

  // Deferred boot steps that write to the GPU queue wait for a running capture.
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
      captureStatus.textContent = `Integrating the canonical trajectory (${N_STEPS.toLocaleString()} steps)…`;
      try {
        const bundle = buildCapture(await gate.trajectory());
        exposeCapture(bundle, { download: false });
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (${bundle.steps.length} sampled states).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "strange-attractors-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        if (held.governor) held.governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "cx-capture-row" }, captureBtn, captureLink));

  // Prove works from the gate alone; the live checks wait for the kernels.
  let kernels: ChaosKernels | null = null;
  let app: App | null = null;
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    kernels: () => kernels,
    hold: (on) => {
      if (held.governor) held.governor.suspended = on;
      if (app) app.busy = on;
    },
  });
  studio.drawer.learn.append(h("p", { class: "cx-note" }, "The page is still loading its live view."));
  markReady();
  mark("ready");

  // ---------------------------------------------- everything else --
  const tier = pickTier(gpu, readTierEnvironment(), query.get("tier"));
  studio.veil.step("Compiling the renderer");
  while (isCapturing()) await wait(50);
  const hdr = new HdrPipeline(gpu, studio.canvas, {
    toneMap: "agx",
    // luminous points over a dark sky: meter the bright end, keep the sky dark
    exposure: { percentile: 0.995, key: 0.5, min: 0.02, max: 64, tau: 0.8 },
    bloom: { intensity: 0.06, levels: 6 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({ budgetMs: tier === "T1" ? 36 : 22, effectLevels: 1 });
  held.governor = governor;
  studio.veil.step("Compiling the ensemble");
  const [k, view] = await Promise.all([ChaosKernels.create(device), ChaosView.create(device)]);
  kernels = k;
  while (isCapturing()) await wait(50);
  const a = new App(gpu, studio, hdr, view, k, tier);
  app = a;
  a.profiler = profiler;
  a.governor = governor;
  if (query.has("inflight")) a.maxInFlight = Math.min(3, Math.max(1, Number(query.get("inflight")) | 0));
  mark("compiled");

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => {
    const p = a.chaos.params;
    const d = a.scene.params;
    const or = (v: number, def: number): number => (v === def ? -1 : v);
    return {
      s: a.scene.id,
      seed: a.seed,
      d: a.digits === a.scene.digits ? -1 : a.digits,
      sig: or(p.sigma, d.sigma),
      rho: or(p.rho, d.rho),
      beta: or(p.beta, d.beta),
      sp: a.clock.speed === a.scene.speed ? -1 : a.clock.speed,
      fol: a.follow ? 1 : 0,
      cam: [a.camera.yaw, a.camera.pitch, a.camera.distance].map((x) => Number(x.toFixed(3))),
    };
  };
  a.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(
    studio.tune.body,
    {
      params: (p) => a.setParams(p),
      reset: () => {
        a.setParams({ ...a.scene.params });
        tune.sync(a.scene.params, view.look);
      },
      look: (l) => {
        view.look = { ...view.look, ...l };
      },
    },
    a.chaos.params,
    view.look,
  );
  studio.tune.setNote("Each change to the system lands at a step boundary and can be undone. The release gate always runs Lorenz's own values.");

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);
  const syncProve = (): void =>
    prove.setOnScreen({ params: a.chaos.params, released: a.chaos.released, eps: a.chaos.eps, members: a.chaos.ensemble.n });

  // ------------------------------------------------------------ the clock --
  const hud = h("div", { class: "cx-hud bp-surface", role: "status", "aria-live": "off", "data-bp-chrome": "", "data-bp2": "studio-chrome" });
  const hudMain = h("p", { class: "cx-hud-main" }, "");
  const hudSub = h("p", { class: "cx-hud-sub" }, "");
  hud.append(hudMain, hudSub);
  studio.stage.append(hud);
  let lastHud = 0;
  const updateHud = (now: number): void => {
    if (now - lastHud < 120) return;
    lastHud = now;
    const c = a.chaos;
    if (!c.released) {
      hudMain.textContent = "The attractor";
      hudSub.textContent = `t = ${c.t.toFixed(1)} · half a million points on it`;
      return;
    }
    const sep = a.ghostSeparation;
    const ghost = sep !== null ? ` · ghosts ${sci(sep)} apart` : "";
    if (a.horizonT !== null) {
      hudMain.textContent = `Predictability lost at t = ${a.horizonT.toFixed(1)}`;
      hudSub.textContent = `ball released ${sci(c.eps)} wide · now t = ${c.tSinceRelease.toFixed(1)}${ghost}`;
    } else {
      const s = a.lastSpread?.spread ?? c.eps;
      hudMain.textContent = `t = ${c.tSinceRelease.toFixed(1)} · spread ${sci(s)}`;
      hudSub.textContent = `released ${sci(c.eps)} wide · ${c.ensemble.n.toLocaleString()} starts${ghost}`;
    }
  };

  // ------------------------------------------------------- callouts --
  // The ball's captions follow its centroid through four stages. They share
  // one spot, so a stage's caption waits until the last one has faded out
  // (the shell fades callouts over 600 ms) instead of crossfading over it.
  const centre = (): [number, number] | null => (a.chaos.released ? a.screenOf(a.lastSpread?.centre ?? a.chaos.ref.x) : null);
  const spreadRatio = (): number => (a.lastSpread?.spread ?? 0) / a.attractorSize;
  const stageNow = (): number => {
    if (!a.chaos.released) return -1;
    if (a.horizonT !== null) return a.chaos.tSinceRelease < a.horizonT + 6 ? 3 : -1;
    const r = spreadRatio();
    if (r < 2e-4) return a.chaos.tSinceRelease > 0.3 ? 0 : -1;
    return r < 0.03 ? 1 : 2;
  };
  const CAPTION_FADE_MS = 650;
  let shownStage = -1;
  let stageSince = 0;
  let lastStage = -1;
  const captionShown = (k: number): boolean => {
    const now = performance.now();
    const st = stageNow();
    if (st !== lastStage) {
      lastStage = st;
      stageSince = now;
    }
    // a new stage takes the spot only once the old caption has had time to fade
    if (st !== shownStage && now - stageSince >= (shownStage < 0 ? 0 : CAPTION_FADE_MS)) shownStage = st;
    return shownStage === k && st === k;
  };
  studio.callouts.set([
    { id: "one-point", text: "a million starts, one point", style: "label", anchor: centre, when: () => captionShown(0) },
    { id: "stretching", text: "stretching", style: "label", anchor: centre, when: () => captionShown(1) },
    { id: "folding", text: "folding", style: "label", anchor: centre, when: () => captionShown(2) },
    { id: "forgotten", text: "the cloud has forgotten where it came from", style: "label", anchor: centre, when: () => captionShown(3) },
  ]);

  // ------------------------------------------------- Buy More Digits --
  const digits = buildDigitsPanel({
    buy: (d) => {
      a.digits = d;
      a.requestRelease(a.releasePoint);
    },
    measureAll: async (from, to, onPoint) => {
      const p = [...a.releasePoint] as [number, number, number];
      for (let d = from; d <= to; d += 1) {
        const r = await a.measureHorizon(d, p, 80);
        if (r.horizon !== null) onPoint({ digits: d, horizon: r.horizon });
      }
      a.digits = to;
    },
    restart: () => {
      digits.clear();
      void a.loadScene("digits").then(() => a.writeUrl());
    },
  });
  digits.el.hidden = true;
  studio.stage.append(digits.el);
  // ------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.map((s) => ({ id: s.id, title: s.title })),
    "butterfly",
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
    compare: () => a.toggleCompare(),
    undo: () => a.undo(),
  };
  studio.transport.onStatus = () => studio.drawer.open("learn");
  studio.drawer.onChange = ((orig) => (open: boolean, tab: "learn" | "prove") => {
    orig?.(open, tab);
    a.learnOpen = open && tab === "learn";
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
    snapshot: () => a.requestSnapshot(),
    clip: () => recordClip(),
  };
  a.onSnapshot = (b) => download(b, `chaos-${a.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `chaos-${a.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => a.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void a.restart());
  studio.key("1 2 3", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("[ ]", "Precision of the next ball", (e) => {
    a.digits = Math.min(DIGITS_MAX, Math.max(DIGITS_MIN, a.digits + (e.key === "]" ? 1 : -1)));
    if (studio.rail.active === "release") studio.rail.select("release", false);
    studio.toast.show(`Next ball: ${a.digits} digits (10⁻${a.digits} wide)`);
    a.writeUrl();
  });
  studio.key("B", "Release again", () => a.requestRelease(a.releasePoint));
  studio.key("S", "Save point", () => a.savePoint());
  studio.key("C", "Compare with the save point", () => a.toggleCompare());
  studio.key("Z", "Undo", () => a.undo());
  studio.key("T", "Tune", () => studio.tune.toggle());

  a.hooks = {
    onSceneChange: (scene) => {
      studio.root.dataset["scene"] = scene.id;
      digits.el.hidden = scene.id !== "digits";
      digits.clear();
      digits.setCurrent(scene.digits, null);
      learn.setScene(scene);
      syncProve();
    },
    onParams: (p) => {
      learn.setParams(p);
      tune.sync(p, view.look);
      syncProve();
      a.writeUrl();
    },
    onRelease: (eps, thr) => {
      learn.resetSpread(eps, thr);
      if (a.scene.id === "digits") digits.setCurrent(a.ballDigits, null);
      syncProve();
    },
    onSpread: (s) => learn.pushSpread(s.t, s.spread),
    onHorizon: (t) => {
      learn.setHorizon(t);
      if (a.scene.id === "digits") {
        digits.setCurrent(a.ballDigits, t);
        if (t !== null) digits.add({ digits: a.ballDigits, horizon: t });
      }
    },
    onLyapunov: (e) => {
      learn.pushLyapunov(e, a.chaos.params);
      if (e.t >= 200) digits.setLambda(e.lambdas[0]);
    },
  };

  // Learn: stats and performance, about once a second while it is open
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
    updateHud(now);
    if (a.camera.version !== lastCam && !a.camera.flying && now - lastUrl > 600) {
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
        ["Ball members", a.chaos.ensemble.n.toLocaleString()],
        ["Attractor points", a.chaos.density.n.toLocaleString()],
        ["Solver steps / second", `${Math.round(a.clock.ticksPerSecond * a.clock.speed)}`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ["Exposure", `${a.hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
    learn.setStats([
      ["Model time", `t = ${a.chaos.t.toFixed(2)} (${a.chaos.steps.toLocaleString()} steps of 0.01)`],
      ["Attractor RMS size", a.attractorSize.toFixed(2)],
      ["Ball spread", a.lastSpread ? a.lastSpread.spread.toExponential(2) : "—"],
      ["Predictability lost", a.horizonT !== null ? `t = ${a.horizonT.toFixed(2)} after release` : "not yet"],
    ]);
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Releasing the attractor");
  const scene = sceneById(parsed.s);
  const pick = (v: number, def: number): number => (v >= 0 ? v : def);
  const params: LorenzParams = {
    sigma: pick(parsed.sig, scene.params.sigma),
    rho: pick(parsed.rho, scene.params.rho),
    beta: pick(parsed.beta, scene.params.beta),
  };
  while (isCapturing()) await wait(50);
  await a.loadScene(scene.id, { params, digits: parsed.d >= 0 ? Math.max(DIGITS_MIN, parsed.d) : undefined, seed: parsed.seed });
  if (parsed.cam[2]! > 0) a.camera.set({ yaw: parsed.cam[0]!, pitch: parsed.cam[1]!, distance: parsed.cam[2]!, target: [0, 0, 0] });
  a.follow = parsed.fol === 1;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  a.setSpeed(parsed.sp > 0 ? parsed.sp : reduced ? scene.speed * 0.5 : scene.speed);
  tune.sync(a.chaos.params, view.look);
  studio.veil.done();
  a.start();
  mark("live");
  (globalThis as { __chaosLive?: boolean }).__chaosLive = true;

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    // an orbit view: no bounded 2D domain for the shell check's letterbox test
    space: "3d",
    scene: a.scene.id,
    tier: a.tier,
    steps: a.chaos.steps,
    t: a.chaos.t,
    released: a.chaos.released,
    eps: a.chaos.eps,
    members: a.chaos.ensemble.n,
    density: a.chaos.density.n,
    sizes: SIZES[a.tier],
    params: a.chaos.params,
    classic: a.chaos.params.sigma === CLASSIC.sigma && a.chaos.params.rho === CLASSIC.rho && a.chaos.params.beta === CLASSIC.beta,
    spread: a.lastSpread,
    horizonT: a.horizonT,
    attractorRms: a.attractorSize,
    camera: { yaw: a.camera.yaw, pitch: a.camera.pitch, distance: a.camera.distance, version: a.camera.version },
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    fps: a.fps,
  });
  (globalThis as { __chaos?: App }).__chaos = a;
  (globalThis as { __chaosProve?: typeof prove }).__chaosProve = prove;
  (globalThis as { __chaosDigits?: typeof digits }).__chaosDigits = digits;

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
  const result = {
    adapter: app.gpu.adapterId,
    tier: app.tier,
    members: app.chaos.ensemble.n,
    density: app.chaos.density.n,
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
