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
import { App, DUST_SIZES, SIZES, defaultLook } from "./app.js";
import { sci } from "./format.js";
import { buildLearn } from "./learn.js";
import type { FieldParams, Look, V3 } from "./model/flow.js";
import { CANONICAL_FIELD, FlowKernels, cloneField, fieldKind, isCanonical, measureInstruments, shellCounts, shellFractions, surfaceResidual } from "./model/flow.js";
import { GateRunner, loadGateIc } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { FlowView } from "./render/flow-view.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import type { TunePane } from "./tune.js";
import { buildPaintTune, buildTune } from "./tune.js";
import { PaintApp } from "./paint/app.js";
import { FLAT_GROUND, PaintKernels, contourResidual, patchSpread } from "./paint/model.js";
import { PaintView } from "./paint/view.js";

const SIM_NAME = "Flow Sculpture";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "studio", values: SCENE_IDS },
    // the seed; −1 (FLAT_GROUND) is Paint the Stream's flat ground
    seed: { kind: "int", def: 1, min: FLAT_GROUND, max: 2 ** 31 - 1 },
    // the field, written only where it differs from the scene's
    ell: { kind: "num", def: 0.7, min: 0.2, max: 1.2, digits: 3 },
    oct: { kind: "int", def: 2, min: 1, max: 5 },
    evo: { kind: "num", def: 0, min: 0, max: 0.4, digits: 3 },
    // Tune's Speed (step multiplier) and the transport's speed
    spd: { kind: "num", def: 1, min: 0.25, max: 3, digits: 3 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    // the look, written only where it differs from the tier's own (Silk on hardware, Dust in software)
    look: { kind: "enum", def: "auto", values: ["auto", "silk", "dust"] },
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
  let paintApp: PaintApp | null = null;
  const prove = buildProve(studio.drawer.prove, {
    paint: () => (paintApp ? { paint: paintApp.paint, contourStep: paintApp.view.contourStep } : null),
    adapter: gpu.adapterId,
    device,
    gate,
    kernels: () => kernels,
    field: () => (app ? { params: app.flow.params, time: app.flow.time } : null),
    hold: (on) => {
      if (held.governor) held.governor.suspended = on;
      if (app) app.busy = on;
      if (paintApp) paintApp.busy = on;
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
  // a software adapter (or ?soft=1): no bloom; the app also halves its render scale and steps (app.ts SOFTWARE)
  const soft = gpu.info.software || query.get("soft") === "1";
  if (soft) hdr.bloom.intensity = 0;
  const profiler = new GpuProfiler(device, gpu.timestamps);
  const governor = new QualityGovernor({ budgetMs: tier === "T1" ? 36 : 22, effectLevels: 1 });
  held.governor = governor;
  // ?gov=off holds the render scale at 100% (measurements: GPU time at full scale)
  if (query.get("gov") === "off") governor.suspended = true;
  studio.veil.step("Compiling the flow");
  const [k, view] = await Promise.all([FlowKernels.create(device), FlowView.create(device)]);
  kernels = k;
  while (isCapturing()) await wait(50);
  // ?n= and ?slots= override the look's particle count and ribbon length (measurements)
  const size: { strands?: number; slots?: number } = {};
  if (query.has("n")) size.strands = Math.min(1 << 22, Math.max(256, Number(query.get("n")) | 0));
  if (query.has("slots")) size.slots = Math.min(256, Math.max(2, Number(query.get("slots")) | 0));
  // ?sh=c1,c2,c3 overrides Silk's sheets; ?sh=none lets Silk's ribbons fill the ball (measurements)
  let silkSheets: readonly number[] | null | undefined;
  if (query.has("sh")) {
    const sh = query.get("sh") ?? "";
    silkSheets = sh === "none" ? null : sh.split(",").filter((x) => x !== "").map(Number).filter((x) => Number.isFinite(x)).slice(0, 3);
  }
  const parsedLook = url.parse(location.search).values.look;
  const startLook: Look = parsedLook === "silk" || parsedLook === "dust" ? parsedLook : defaultLook(tier, soft);
  // ?dsh= the same for Dust's sheets; ?dsh=none fills the ball evenly (the density check)
  let dustSheets: readonly number[] | null | undefined;
  if (query.has("dsh")) {
    const sh = query.get("dsh") ?? "";
    dustSheets = sh === "none" ? null : sh.split(",").filter((x) => x !== "").map(Number).filter((x) => Number.isFinite(x)).slice(0, 3);
  }
  const a = new App(gpu, studio, hdr, view, k, tier, { size, look: startLook, soft, silkSheets, dustSheets });
  app = a;
  a.profiler = profiler;
  a.governor = governor;
  if (query.has("inflight")) a.maxInFlight = Math.min(3, Math.max(1, Number(query.get("inflight")) | 0));
  mark("compiled");

  // ------------------------------------------------- Paint the Stream (2D) --
  // Built the first time it is shown; it shares the shell, the HDR pipeline,
  // the profiler and the governor, and pins the exposure (a map's colours are
  // a scale, not a light level) where the Studio meters it.
  let scene2d = false;
  const studioHdr = { toneMap: hdr.toneMap, exposure: { ...hdr.exposure }, bloom: hdr.bloom.intensity };
  const hdrFor = (two: boolean): void => {
    if (two) {
      hdr.toneMap = "neutral";
      hdr.exposure = { ...hdr.exposure, mode: "pinned", value: 0.85 };
      hdr.bloom.intensity = 0;
    } else {
      hdr.toneMap = studioHdr.toneMap;
      hdr.exposure = { ...studioHdr.exposure };
      hdr.bloom.intensity = studioHdr.bloom;
    }
  };
  // ?pn= grid size and ?pc= particle count for Paint the Stream (measurements)
  const paintSize: { n?: number; count?: number } = {};
  if (query.has("pn")) paintSize.n = Math.min(2048, Math.max(64, Number(query.get("pn")) | 0));
  if (query.has("pc")) paintSize.count = Math.min(1 << 21, Math.max(256, Number(query.get("pc")) | 0));
  let paintLoading: Promise<PaintApp> | null = null;
  const ensurePaint = (): Promise<PaintApp> => {
    paintLoading ??= (async () => {
      const [pk, pv] = await Promise.all([PaintKernels.create(device), PaintView.create(device)]);
      const p = new PaintApp(gpu, studio, hdr, pv, pk, tier, soft, paintSize);
      p.profiler = profiler;
      p.governor = governor;
      p.writeUrl = () => url.write(current());
      p.onSnapshot = (b) => download(b, "flow-sculpture-paint.png");
      // reduced motion: start slowed, as the Studio does
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) p.clock.speed = 0.5;
      p.hooks = { onMap: () => syncProve(), onFrame: (now) => frameHook(now) };
      p.start();
      paintApp = p;
      return p;
    })();
    return paintLoading;
  };
  /** The scene on screen. */
  const cur = (): App | PaintApp => (scene2d && paintApp ? paintApp : a);

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => {
    if (scene2d && paintApp) {
      const pp = paintApp;
      return { s: "paint", seed: pp.paint.landscapeSeed, spd: Number((pp.paint.dt / pp.baseDt).toFixed(3)), sp: pp.clock.speed };
    }
    const p = a.flow.params;
    const o = p.obstacle?.centre ?? [0.5, 0.5, 0.5];
    return {
      s: a.scene.id,
      seed: a.flow.seed,
      ell: p.ell0,
      oct: p.octaves,
      evo: p.evolution,
      spd: Number((a.flow.dt / a.baseDt).toFixed(3)),
      sp: a.clock.speed,
      obs: o.map((x) => Number(x.toFixed(4))),
      cam: [a.camera.yaw, a.camera.pitch, a.camera.distance].map((x) => Number(x.toFixed(3))),
      look: a.look === defaultLook(a.tier, a.softwareProfile) ? "auto" : a.look,
    };
  };
  a.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const buildTune3d = (): TunePane =>
    buildTune(
    studio.tune.body,
    {
      field: (p, speed) => a.setField(p, a.baseDt * speed),
      reset: () => {
        const p = cloneField(a.scene.field);
        a.setField(p, a.baseDt);
        tune.sync(p, 1);
      },
      gated: () => {
        const p = cloneField(CANONICAL_FIELD);
        a.setField(p, a.flow.dt);
        tune.sync(p, a.flow.dt / a.baseDt);
      },
      look: (l) => {
        void a.setLook(l).then(() => {
          learn.setScene(a.scene, a.flow.n, a.look);
          studio.toast.show(l === "dust" ? `Dust: ${a.flow.n.toLocaleString()} points filling the ball` : `Silk: ${a.flow.n.toLocaleString()} ribbons on two sheets`);
        });
      },
    },
    a.flow.params,
    1,
    a.look,
  );
  const tuneNote3d = "Each change lands at a step boundary and can be undone. The release gate always runs the gated field.";
  let tune = buildTune3d();
  studio.tune.setNote(tuneNote3d);
  const buildTune2d = (p: PaintApp): void => {
    buildPaintTune(
      studio.tune.body,
      {
        speed: (v) => p.setStep(v),
        contours: (on) => p.setContours(on),
        landscape: () => p.newLandscape(1 + Math.floor(Math.random() * 2147483646)),
        flat: () => p.newLandscape(FLAT_GROUND),
      },
      p.paint.dt / p.baseDt,
      p.view.look.contours,
    );
    studio.tune.setNote("A new or a flat landscape is an edit you can undo.");
  };

  // --------------------------------------------------- switching scenes --
  const showScene = async (id: SceneId, o: { seed?: number; spd?: number } = {}): Promise<void> => {
    const s = sceneById(id);
    if (s.dim === "2d") {
      if (!paintApp && liveAt.t < Infinity) studio.toast.show("Preparing the map…");
      const p = await ensurePaint();
      a.deactivate();
      hdrFor(true);
      scene2d = true;
      p.activate();
      studio.heading.set(s.title, s.prompt, s.eyebrow);
      studio.heading.setCurrent(s.id);
      await p.load({ seed: o.seed ?? p.paint.landscapeSeed, dt: p.baseDt * (o.spd ?? p.paint.dt / p.baseDt) });
      buildTune2d(p);
      learn.setScene(s, p.paint.count, a.look);
      learn.setPaint(null);
    } else {
      paintApp?.deactivate();
      hdrFor(false);
      scene2d = false;
      a.activate();
      tune = buildTune3d();
      tune.sync(a.flow.params, a.flow.dt / a.baseDt, a.look);
      studio.tune.setNote(tuneNote3d);
      learn.setScene(a.scene, a.flow.n, a.look);
      learn.setField(a.flow.params, a.scene.field);
    }
    const c = cur();
    studio.transport.setSpeed(c.clock.speed);
    studio.transport.setPlaying(!c.clock.paused);
    syncProve();
    url.write(current());
  };

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);
  const syncProve = (): void => (scene2d ? prove.setOnScreenPaint() : prove.setOnScreen(a.flow.params, a.scene.field));

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
  const PAINT_SAMPLE = 1024;
  const measurePaint = async (pp: PaintApp): Promise<void> => {
    const [psi, parts] = await Promise.all([pp.paint.readPsi(), pp.paint.readParticles()]);
    const r = contourResidual(psi, pp.paint.n, parts.subarray(0, Math.min(parts.length, PAINT_SAMPLE * 4)));
    const sp = patchSpread(parts, pp.paint.n);
    lastPaint = { ...r, step: pp.view.contourStep, ...sp };
    hudMain.textContent = "Incompressible — nothing piles up";
    hudSub.textContent = `particles per patch even to ±${(sp.spread * 100).toFixed(1)}% (a random scatter: ±${(sp.expected * 100).toFixed(1)}%)`;
    learn.setPaint(lastPaint);
  };
  let lastPaint: { worst: number; median: number; count: number; step: number; spread: number; expected: number; perPatch: number } | null = null;
  const measure = async (): Promise<void> => {
    if (measuring || isCapturing() || cur().busy) return;
    measuring = true;
    try {
      if (scene2d && paintApp) {
        await measurePaint(paintApp);
        return;
      }
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
            learn.setResidual(surfaceResidual(xyzw, f0, params, time));
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
    void showScene(id as SceneId);
  };
  studio.rail.onSelect = (id) => {
    if (!scene2d) a.selectTool(id);
  };
  studio.transport.handlers = {
    play: () => cur().togglePlay(),
    step: () => {
      const c = cur();
      if (!c.clock.paused) c.togglePlay();
      c.clock.stepOnce();
    },
    restart: () => void cur().restart(),
    speed: (v) => cur().setSpeed(v),
    save: () => cur().savePoint(),
    restore: () => cur().restoreSave(),
    compare: () => {},
    undo: () => cur().undo(),
  };
  studio.transport.onStatus = () => studio.drawer.open("learn");
  studio.drawer.onChange = ((orig) => (open: boolean, tab: "learn" | "prove") => {
    orig?.(open, tab);
    a.learnOpen = open && tab === "learn";
    if (paintApp) paintApp.learnOpen = open && tab === "learn";
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
    snapshot: () => cur().requestSnapshot(),
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
    rec.onstop = () => download(new Blob(chunks, { type: "video/webm" }), `flow-sculpture-${scene2d ? "paint" : a.scene.id}.webm`);
    rec.start();
    studio.toast.show("Recording 8 seconds…", 8000);
    setTimeout(() => rec.stop(), 8000);
  }

  studio.key("Space", "Play / pause", () => cur().togglePlay());
  studio.key(".", "Step once", () => studio.transport.handlers?.step());
  studio.key("R", "Restart the scene", () => void cur().restart());
  studio.key("1 2", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("S", "Save point", () => cur().savePoint());
  studio.key("Z", "Undo", () => cur().undo());
  studio.key("C", "Contour lines (Paint the Stream)", () => {
    if (!scene2d || !paintApp) return;
    paintApp.setContours(!paintApp.view.look.contours);
    if (studio.rail.active === "paint") studio.rail.select("paint", false);
    studio.toast.show(paintApp.view.look.contours ? "Contour lines on — the paths the flow takes" : "Contour lines off");
  });
  studio.key("[ ]", "Brush size (Paint the Stream)", (e) => {
    if (!scene2d || !paintApp) return;
    paintApp.brushSize = Math.min(0.2, Math.max(0.02, paintApp.brushSize * (e.key === "]" ? 1.2 : 1 / 1.2)));
    if (studio.rail.active === "paint") studio.rail.select("paint", false);
  });
  studio.key("T", "Tune", () => studio.tune.toggle());

  a.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, a.flow.n, a.look);
      syncProve();
    },
    onField: (p, dt) => {
      learn.setField(p, a.scene.field);
      tune.sync(p, dt / a.baseDt);
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
  const frameHook = (now: number): void => {
    overlay?.push({ frameMs: now - lastFrame, gpuMs: profiler.frameMs, passes: profiler.timings() });
    rafTimes.push(now - lastFrame);
    if (rafTimes.length > 600) rafTimes.shift();
    lastFrame = now;
    // the instruments start once the page has settled (boot-window readbacks are fragile)
    if (now - liveAt.t > 1500 && now - lastMeasure > 1000) {
      lastMeasure = now;
      void measure();
    }
    if (!scene2d && a.camera.version !== lastCam && !a.camera.flying && now - lastUrl > 600) {
      lastCam = a.camera.version;
      lastUrl = now;
      a.writeUrl();
    }
    const c = cur();
    if (!c.learnOpen || now - lastPerf < 1000) return;
    lastPerf = now;
    const st = governor.status();
    if (scene2d && paintApp) {
      const pp = paintApp;
      learn.setPerf(
        [
          ["Adapter", gpu.adapterId],
          ["Tier", `${a.tier}${gpu.info.software ? " (software)" : ""}`],
          ["Map", `${pp.paint.n} × ${pp.paint.n}, wrapping`],
          ["Particles", pp.paint.count.toLocaleString()],
          ["Solver steps / second", `${Math.round(pp.clock.ticksPerSecond * pp.clock.speed)}`],
          ["Frame (p50 / p90)", `${percentile(rafTimes, 0.5).toFixed(1)} / ${percentile(rafTimes, 0.9).toFixed(1)} ms`],
          ["GPU per frame", `${profiler.frameAvg.toFixed(2)} ms`],
          ["Render scale", `${Math.round(st.renderScale * 100)}%`],
        ],
        profiler.timings(),
        profiler.source,
      );
      learn.setStats([
        ["Model time", `${pp.paint.time.toFixed(1)} s (${pp.paint.steps.toLocaleString()} steps of ${pp.paint.dt.toPrecision(2)} s)`],
        ["Contour spacing", `${pp.view.contourStep.toPrecision(3)} cells²/s of flow between two lines`],
        ["Edits", `${pp.eventCount}`],
      ]);
      return;
    }
    learn.setPerf(
      [
        ["Adapter", gpu.adapterId],
        ["Tier", `${a.tier}${gpu.info.software ? " (software)" : ""}`],
        [a.look === "dust" ? "Dust points" : "Silk ribbons", a.look === "dust" ? a.flow.n.toLocaleString() : `${a.flow.n.toLocaleString()} × ${a.flow.slots} points`],
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
      ["Model time", `t = ${a.flow.time.toFixed(3)} (${a.flow.steps.toLocaleString()} steps of ${a.flow.dt.toPrecision(2)})`],
      ["Largest divergence", lastDiv !== null ? `${sci(lastDiv, 1)} of the swirl` : "—"],
      ["Field", { gated: "the gated field", scene: "the Studio's field", evolving: "evolving", edited: "edited" }[fieldKind(a.flow.params, a.scene.field)]],
    ]);
  };

  a.hooks.onFrame = frameHook;

  // ------------------------------------------------------------- start --
  studio.veil.step("Seeding the flow");
  // the 3D app always holds the Studio; ?s=paint then shows the 2D scene
  const scene = sceneById("studio");
  const field: FieldParams = cloneField(scene.field);
  field.ell0 = parsed.ell;
  field.octaves = parsed.oct;
  field.evolution = parsed.evo;
  if (field.obstacle) field.obstacle.centre = a.clampCentre(parsed.obs as V3);
  while (isCapturing()) await wait(50);
  await a.loadScene(scene.id, { field, dt: a.baseDt * parsed.spd, seed: Math.max(0, parsed.seed) });
  if (parsed.cam[2]! > 0) a.camera.set({ yaw: parsed.cam[0]!, pitch: parsed.cam[1]!, distance: parsed.cam[2]!, target: [0, 0, 0] });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  a.setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  tune.sync(a.flow.params, a.flow.dt / a.baseDt);
  a.start();
  if (sceneById(parsed.s).dim === "2d") {
    studio.veil.step("Painting the landscape");
    await showScene(parsed.s as SceneId, { seed: parsed.seed, spd: parsed.spd });
    cur().setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  }
  studio.veil.done();
  liveAt.t = performance.now();
  mark("live");
  (globalThis as { __flowLive?: boolean }).__flowLive = true;

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  const debug2d = (pp: PaintApp): unknown => ({
    // a torus: the map wraps, so the shell check's letterbox test does not apply
    space: "2d",
    periodic: true,
    view: pp.camera.viewRect(),
    domain: [pp.paint.n, pp.paint.n],
    scene: "paint",
    tier: a.tier,
    n: pp.paint.n,
    particles: pp.paint.count,
    steps: pp.paint.steps,
    time: pp.paint.time,
    dt: pp.paint.dt,
    landscape: pp.paint.landscapeSeed,
    events: pp.eventCount,
    contours: pp.view.look.contours,
    brush: pp.brush,
    paint: lastPaint,
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    fps: pp.fps,
  });
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => (scene2d && paintApp ? debug2d(paintApp) : debug3d());
  const debug3d = (): unknown => ({
    // an orbit view: no bounded 2D domain for the shell check's letterbox test
    space: "3d",
    scene: a.scene.id,
    tier: a.tier,
    steps: a.flow.steps,
    time: a.flow.time,
    strands: a.flow.n,
    slots: a.flow.slots,
    look: a.look,
    sizes: { silk: SIZES[a.tier], dust: DUST_SIZES[a.tier] },
    field: a.flow.params,
    dt: a.flow.dt,
    canonical: isCanonical(a.flow.params),
    fieldKind: fieldKind(a.flow.params, a.scene.field),
    sheets: a.flow.sheets,
    events: a.eventCount,
    divergence: lastDiv,
    camera: { yaw: a.camera.yaw, pitch: a.camera.pitch, distance: a.camera.distance, version: a.camera.version },
    renderScale: governor.renderScale,
    adapter: gpu.adapterId,
    fps: a.fps,
  });
  (globalThis as { __flow?: App }).__flow = a;
  (globalThis as { __flowScene?: unknown }).__flowScene = { show: showScene, paint: () => paintApp };
  (globalThis as { __flowProve?: typeof prove }).__flowProve = prove;

  if (query.get("bench") === "1") {
    if (scene2d && paintApp) void benchPaint(paintApp, profiler, rafTimes);
    else void bench(a, profiler, rafTimes);
  }
}

async function benchPaint(app: PaintApp, profiler: GpuProfiler, rafTimes: number[]): Promise<void> {
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
    scene: "paint",
    strands: app.paint.count,
    n: app.paint.n,
    viewport: [app.camera.viewW, app.camera.viewH],
    timing: profiler.source,
    frames: rafTimes.length,
    fps: rafTimes.length / seconds,
    frameP50: percentile(rafTimes, 0.5),
    frameP90: percentile(rafTimes, 0.9),
    gpuP50: percentile(gpuMs, 0.5),
    gpuP90: percentile(gpuMs, 0.9),
    stepsPerSecond: (app.stepsTotal - steps0) / seconds,
    passes: profiler.timings().map((p) => ({ name: p.name, avgMs: p.avg })),
    renderScale: app.governor?.renderScale ?? 1,
  };
  (globalThis as { __bpBench?: unknown }).__bpBench = result;
  console.info(`BP_BENCH ${JSON.stringify(result)}`);
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
