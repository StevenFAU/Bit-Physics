// Flow Sculpture — the v2 page (docs/planning/rebuild-v2/06-curl-noise.md),
// Wave B of the Field Studies rebuild. Served at /sims/curl-noise/v2/ while
// v1 stays live at /sims/curl-noise/.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts — v1's capture path ported verbatim on
//     its own buffers — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips as soon as the gate path is usable (the
//     frozen kernels compiled, the capture button wired). The renderer, the
//     live kernels and the scene compile and load afterwards, behind the
//     loading veil; deferred steps that write to the GPU queue wait for a
//     running capture. window.__flowLive flips when the live view runs.
// verify.py then applies the established new_canonical gate, unchanged
// (_gate_curl_noise: run-twice identity + the chaos-immune live-f64 iso residual).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, SIZES, TICKS_PER_SECOND } from "./app.js";
import { sci } from "./format.js";
import { buildLearn } from "./learn.js";
import type { FieldParams, V3 } from "./model/flow.js";
import { CANONICAL_FIELD, FlowKernels, cloneField, isCanonical, measureInstruments, shellCounts, shellFractions, surfaceResidual } from "./model/flow.js";
import { isoValues } from "../curlnoise64.mjs";
import { GateRunner, loadGateIc } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { FlowView } from "./render/flow-view.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import { buildTune } from "./tune.js";

const SIM_NAME = "Flow Sculpture";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "studio", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    // the field, written only where it differs from the scene's
    ell: { kind: "num", def: 0.7, min: 0.2, max: 1.2, digits: 3 },
    oct: { kind: "int", def: 2, min: 1, max: 5 },
    evo: { kind: "num", def: 0, min: 0, max: 0.4, digits: 3 },
    // Tune's Speed (step multiplier) and the transport's speed
    spd: { kind: "num", def: 1, min: 0.25, max: 3, digits: 3 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    // the sphere's centre (model units)
    obs: { kind: "nums", def: [0.5, 0.5, 0.5], n: 3, digits: 4 },
    cam: { kind: "nums", def: [-99, -99, -1], n: 3, digits: 3 },
  },
  1,
);

/** Boot phases, ms since navigation start (read by the boot-time measurements). */
const bootMarks: Record<string, number> = {};
(globalThis as { __flowBoot?: Record<string, number> }).__flowBoot = bootMarks;
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
    eyebrow: "06 / FLOW SCULPTURE",
    canvasLabel:
      "Ribbons of light streaming through a flow of smooth noise around a sphere, in a dark studio. " +
      "Drag the sphere to move it; drag elsewhere to turn the view, scroll or pinch to zoom, double-click to reset it.",
  });
  if (query.get("chrome") === "off") studio.setChrome(false);
  studio.heading.set("Studio", "Drag the sphere. The flow goes around it.", "06 / FLOW SCULPTURE");
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
  const gate = await GateRunner.create(device, gpu.adapter);
  void loadGateIc().catch(() => undefined);
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
      captureStatus.textContent = "Running the gate scene twice (4,096 tracers, 64 steps)…";
      try {
        const { bundle, runs } = await gate.capture();
        exposeCapture(bundle, { download: false });
        captureStatus.textContent = `Capture ready: window.__bitPhysicsCapture (run twice ${runs[0].sha === runs[1].sha ? "byte-identical" : "DIFFERENT"}, sha256 ${runs[1].sha.slice(0, 10)}…).`;
        captureLink.hidden = false;
        captureLink.onclick = (e) => {
          e.preventDefault();
          download(new Blob([JSON.stringify(bundle)], { type: "application/json" }), "curl-noise-capture.json");
        };
      } catch (e) {
        captureStatus.textContent = `Capture failed: ${(e as Error).message}`;
      } finally {
        captureBtn.disabled = false;
        if (held.governor) held.governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "fs-capture-row" }, captureBtn, captureLink));

  // Prove works from the gate alone; the live checks wait for the kernels.
  let kernels: FlowKernels | null = null;
  let app: App | null = null;
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    kernels: () => kernels,
    field: () => (app ? { params: app.flow.params, time: app.flow.time } : null),
    hold: (on) => {
      if (held.governor) held.governor.suspended = on;
      if (app) app.busy = on;
    },
  });
  studio.drawer.learn.append(h("p", { class: "fs-note" }, "The page is still loading its live view."));
  markReady();
  mark("ready");

  // ---------------------------------------------- everything else --
  const tier = pickTier(gpu, readTierEnvironment(), query.get("tier"));
  studio.veil.step("Compiling the renderer");
  while (isCapturing()) await wait(50);
  const hdr = new HdrPipeline(gpu, studio.canvas, {
    toneMap: "agx",
    // luminous threads in a dark studio: meter the bright end, keep the room dark
    exposure: { percentile: 0.995, key: 0.62, min: 0.02, max: 64, tau: 0.8 },
    bloom: { intensity: 0.05, levels: 6 },
  });
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({ budgetMs: tier === "T1" ? 36 : 22, effectLevels: 1 });
  held.governor = governor;
  studio.veil.step("Compiling the flow");
  const [k, view] = await Promise.all([FlowKernels.create(device), FlowView.create(device)]);
  kernels = k;
  while (isCapturing()) await wait(50);
  // ?n= and ?slots= override the tier's ribbon count and length (measurements)
  const size = { ...SIZES[tier] };
  if (query.has("n")) size.strands = Math.min(1 << 20, Math.max(256, Number(query.get("n")) | 0));
  if (query.has("slots")) size.slots = Math.min(256, Math.max(2, Number(query.get("slots")) | 0));
  const a = new App(gpu, studio, hdr, view, k, tier, size);
  // ?sh=c1,c2,c3 overrides Silk's sheets (measurements)
  // ?sh=none fills the whole ball instead (the volume mode, for the density check)
  if (query.has("sh")) {
    const sh = query.get("sh") ?? "";
    a.flow.sheets = sh === "none" ? null : sh.split(",").filter((x) => x !== "").map(Number).filter((x) => Number.isFinite(x)).slice(0, 3);
  }
  app = a;
  a.profiler = profiler;
  a.governor = governor;
  if (query.has("inflight")) a.maxInFlight = Math.min(3, Math.max(1, Number(query.get("inflight")) | 0));
  mark("compiled");

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => {
    const p = a.flow.params;
    const o = p.obstacle?.centre ?? [0.5, 0.5, 0.5];
    return {
      s: a.scene.id,
      seed: a.flow.seed,
      ell: p.ell0,
      oct: p.octaves,
      evo: p.evolution,
      spd: Number((a.flow.dt / a.scene.dt).toFixed(3)),
      sp: a.clock.speed,
      obs: o.map((x) => Number(x.toFixed(4))),
      cam: [a.camera.yaw, a.camera.pitch, a.camera.distance].map((x) => Number(x.toFixed(3))),
    };
  };
  a.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(
    studio.tune.body,
    {
      field: (p, speed) => a.setField(p, a.scene.dt * speed),
      reset: () => {
        const p = cloneField(a.scene.field);
        a.setField(p, a.scene.dt);
        tune.sync(p, 1);
      },
      gated: () => {
        const p = cloneField(CANONICAL_FIELD);
        a.setField(p, a.flow.dt);
        tune.sync(p, a.flow.dt / a.scene.dt);
      },
    },
    a.flow.params,
    1,
  );
  studio.tune.setNote("Each change lands at a step boundary and can be undone. The release gate always runs the gated field.");

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);
  const syncProve = (): void => prove.setOnScreen(a.flow.params);

  // --------------------------------------------- the guarantee, live --
  const hud = h("div", { class: "fs-hud bp-surface", role: "status", "aria-live": "off", "data-bp-chrome": "", "data-bp2": "studio-chrome" });
  const hudMain = h("p", { class: "fs-hud-main" }, "Incompressible");
  const hudSub = h("p", { class: "fs-hud-sub" }, "measuring on this GPU…");
  hud.append(hudMain, hudSub);
  studio.stage.append(hud);
  let lastDiv: number | null = null;
  let measuring = false;
  let fractions = { key: "", f: [] as number[] };
  const DENSITY_SAMPLE = 32768;
  const RESIDUAL_SAMPLE = 384;
  const measure = async (): Promise<void> => {
    if (measuring || isCapturing() || a.busy) return;
    measuring = true;
    try {
      const m = await measureInstruments(device, k, a.flow.params, a.flow.time);
      const rel = m.divMax / Math.max(m.jacScale, 1e-30);
      lastDiv = rel;
      hudMain.textContent = isCanonical(a.flow.params) ? "Incompressible — the gated field" : "Incompressible";
      hudSub.textContent = `largest divergence on this GPU: ${sci(rel, 1)} of the swirl (rounding)`;
      learn.pushDivergence(rel);
      if (a.learnOpen) {
        if (a.flow.sheets) {
          learn.setDensity(null);
          if (a.flow.params.evolution > 0) learn.setResidual(null);
          else {
            const params = a.flow.params;
            const time = a.flow.time;
            const [xyzw, f0] = await Promise.all([a.flow.readTracers(RESIDUAL_SAMPLE), a.flow.readAnchors(RESIDUAL_SAMPLE)]);
            learn.setResidual(surfaceResidual(xyzw, f0, params, time, isoValues as (x: number[], c: Record<string, unknown>) => number[]));
          }
        } else {
          const o = a.flow.params.obstacle;
          const key = o ? o.centre.join(",") : "none";
          if (fractions.key !== key) fractions = { key, f: shellFractions(o) };
          const counts = shellCounts(await a.flow.readTracers(DENSITY_SAMPLE));
          const total = counts.reduce((x, y) => x + y, 0);
          // normalise each shell by its share of the free volume: 1 = even
          learn.setDensity(counts.map((c, i) => Math.round((c / Math.max(total, 1) / Math.max(fractions.f[i] ?? 1, 1e-9)) * (total / counts.length))));
        }
      }
    } catch {
      /* a lost readback (device busy) — the next tick measures again */
    } finally {
      measuring = false;
    }
  };

  // ------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.map((s) => ({ id: s.id, title: s.title })),
    "studio",
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
  a.onSnapshot = (b) => download(b, `flow-sculpture-${a.scene.id}.png`);
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `flow-sculpture-${a.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => a.togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void a.restart());
  studio.key("1 2", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("S", "Save point", () => a.savePoint());
  studio.key("Z", "Undo", () => a.undo());
  studio.key("T", "Tune", () => studio.tune.toggle());

  a.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, a.flow.n);
      syncProve();
    },
    onField: (p, dt) => {
      learn.setField(p, dt);
      tune.sync(p, dt / a.scene.dt);
      syncProve();
    },
  };

  // Learn: stats and performance, about once a second while it is open
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
    // the instruments start once the page has settled (boot-window readbacks are fragile)
    if (now - liveAt.t > 1500 && now - lastMeasure > 1000) {
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
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${a.tier}${gpu.info.software ? " (software)" : ""}`],
        ["Ribbons", `${a.flow.n.toLocaleString()} × ${a.flow.slots} points`],
        ["Solver steps / second", `${Math.round(TICKS_PER_SECOND * a.clock.speed)}`],
        ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
        ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
        ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ["Exposure", `${a.hdr.lastExposure.exposure.toFixed(2)}×`],
      ],
      profiler.timings(),
      profiler.source,
    );
    learn.setStats([
      ["Model time", `t = ${a.flow.time.toFixed(3)} (${a.flow.steps.toLocaleString()} steps of ${a.flow.dt.toPrecision(2)})`],
      ["Largest divergence", lastDiv !== null ? `${sci(lastDiv, 1)} of the swirl` : "—"],
      ["Field", isCanonical(a.flow.params) ? "the gated field" : "edited"],
    ]);
  };

  // ------------------------------------------------------------- start --
  studio.veil.step("Seeding the flow");
  const scene = sceneById(parsed.s);
  const field: FieldParams = cloneField(scene.field);
  field.ell0 = parsed.ell;
  field.octaves = parsed.oct;
  field.evolution = parsed.evo;
  if (field.obstacle) field.obstacle.centre = a.clampCentre(parsed.obs as V3);
  while (isCapturing()) await wait(50);
  await a.loadScene(scene.id, { field, dt: scene.dt * parsed.spd, seed: parsed.seed });
  if (parsed.cam[2]! > 0) a.camera.set({ yaw: parsed.cam[0]!, pitch: parsed.cam[1]!, distance: parsed.cam[2]!, target: [0, 0, 0] });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  a.setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  tune.sync(a.flow.params, a.flow.dt / a.scene.dt);
  studio.veil.done();
  a.start();
  liveAt.t = performance.now();
  mark("live");
  (globalThis as { __flowLive?: boolean }).__flowLive = true;

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    // an orbit view: no bounded 2D domain for the shell check's letterbox test
    space: "3d",
    scene: a.scene.id,
    tier: a.tier,
    steps: a.flow.steps,
    time: a.flow.time,
    strands: a.flow.n,
    slots: a.flow.slots,
    sizes: SIZES[a.tier],
    field: a.flow.params,
    dt: a.flow.dt,
    canonical: isCanonical(a.flow.params),
    divergence: lastDiv,
    camera: { yaw: a.camera.yaw, pitch: a.camera.pitch, distance: a.camera.distance, version: a.camera.version },
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    fps: a.fps,
  });
  (globalThis as { __flow?: App }).__flow = a;
  (globalThis as { __flowProve?: typeof prove }).__flowProve = prove;

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
    strands: app.flow.n,
    slots: app.flow.slots,
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
