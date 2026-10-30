// Grow — the v2 page (docs/planning/rebuild-v2/04-neural-ca.md), Wave A of
// the Field Studies rebuild. Served at /sims/neural-ca/ since it replaced v1,
// which is kept at /sims/neural-ca/v1/ for one release.
//
// Capture contract with the headless gate (tools/productization/web-deploy):
//   * createStudio mounts the shell; its Prove drawer carries [data-bp-panel];
//   * the drawer footer carries the [data-bp="capture"] button, rendered (never
//     display:none, never disabled at boot) so the driver can click() it at
//     1280×720; it runs proof/gate.ts captureCanonical() — the v1 capture path
//     ported unchanged on dedicated buffers — and exposeCapture() publishes it;
//   * window.__bitPhysicsReady flips as soon as the gate path is usable: the
//     committed weights fetched and the gate's own two pipelines compiled,
//     and the capture button wired. Everything else (the renderer, the live
//     solver, the Menagerie, the instruments) compiles and loads afterwards,
//     behind the loading veil — on a software GPU those compiles cost more
//     than the gate's own. Deferred steps that touch the GPU queue wait for
//     a running capture, and a capture waits for a deferred step in flight,
//     so they never interleave. window.__growLive flips when the live dish runs.
// verify.py then applies the established capture_roundtrip gate, unchanged
// (bit-exact against the WGSL canonical; CI's lavapipe runs its declared
// observable fallback).

import "./v2.css";
import type { GpuContext } from "@bp/gpu";
import { GpuProfiler, WebGPUUnavailableError, acquireGpu, pickTier, readTierEnvironment } from "@bp/gpu";
import { HdrPipeline } from "@bp/render";
import { QualityGovernor, UrlState, percentile } from "@bp/runtime";
import type { Studio } from "@bp/studio";
import { PerfOverlay, createStudio, h, showNoWebGPU } from "@bp/studio";
import { exposeCapture, isCapturing, markReady, resetCapture, runCaptureExclusive } from "@bp/verify";
import { App, STEP_PASS, TICKS_PER_SECOND, TOOLS } from "./app.js";
import type { M3Kernels, SceneOptions } from "./app.js";
import { buildM3Ui } from "./m3-ui.js";
import { ChimeraKernels } from "./model/chimera.js";
import { TextureKernels, TextureLibrary, fetchTextures } from "./model/textures.js";
import type { TextureManifest } from "./model/textures.js";
import { buildCellPanel } from "./cell-view.js";
import { buildLearn } from "./learn.js";
import { buildMenagerieUi } from "./menagerie-ui.js";
import { LiveKernels } from "./model/live.js";
import type { MenagerieManifest } from "./model/organisms.js";
import { OrganismLibrary, fetchMenagerie } from "./model/organisms.js";
import type { Checkpoint, GateRunner } from "./proof/gate.js";
import { CANONICAL_SEED, CANONICAL_STEPS, FIRE_RATE, GRID, createGateRunner, fetchCheckpoint } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { DishRenderer } from "./render/dish-view.js";
import type { ViewMode } from "./render/dish-view.js";
import { FrameScheduler } from "./runtime/scheduler.js";
import { Teach } from "./teach/teach.js";
import { TrainKernels } from "./teach/trainer.js";
import type { SceneId } from "./scenes.js";
import { SCENES, sceneById } from "./scenes.js";
import { VIEW_MODES, buildTune } from "./tune.js";

const SIM_NAME = "Grow";

/** The share-link schema; `o` (the organism) lists the menagerie's ids, so it is built once the manifest is in. */
function urlSchema(scenes: string[], organisms: string[], textures: string[]) {
  return new UrlState(
    {
      s: { kind: "enum", def: "dish", values: scenes },
      // "today": the Dish's daily organism (a link always carries the organism it showed)
      o: { kind: "enum", def: "today", values: ["today", ...organisms] },
      // Chimera's second organism ("auto": the next healer after the first)
      with: { kind: "enum", def: "auto", values: ["auto", ...organisms] },
      tex: { kind: "enum", def: textures[0] ?? "none", values: textures.length ? textures : ["none"] },
      seed: { kind: "int", def: CANONICAL_SEED, min: 0, max: 2 ** 31 - 1 },
      p: { kind: "num", def: FIRE_RATE, min: 0.05, max: 1, digits: 2 },
      sp: { kind: "num", def: 1, min: 0.25, max: 8 },
      show: { kind: "enum", def: "specimen", values: VIEW_MODES.map((m) => m.value) },
      cam: { kind: "nums", def: [-1, -1, -1], n: 3, digits: 4 },
      cell: { kind: "nums", def: [GRID / 2, GRID / 2], n: 2, digits: 0 },
    },
    2,
  );
}

/** Boot phases, ms since navigation start (read by the boot-time measurements). */
const bootMarks: Record<string, number> = {};
(globalThis as { __growBoot?: Record<string, number> }).__growBoot = bootMarks;
function mark(name: string): void {
  bootMarks[name] = Math.round(performance.now());
}

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
      "A petri dish where an organism grows from one cell under a learned rule. Choose Cut and drag across it to cut it, Seed to plant new cells, Graft to move a piece of it, Freeze to stop a region updating, Look to pan and zoom, or Probe to read a cell.",
  });
  if (query.get("chrome") === "off") studio.setChrome(false);
  // the canvas takes its box's shape now: ready comes before the renderer
  // sizes it, and a 300 × 150 default would set its aspect for anything that
  // sizes it by width (the poster and loop generators do)
  {
    const r = studio.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    studio.canvas.width = Math.max(1, Math.round(r.width * dpr));
    studio.canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
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
  studio.veil.step("Fetching the committed network");
  const ck = await fetchCheckpoint();
  mark("weights");
  const manifestP = fetchMenagerie(); // network only; awaited once the gate is up
  manifestP.catch(() => {}); // a failure surfaces where it is awaited
  const texturesP = fetchTextures();
  texturesP.catch(() => {});
  studio.veil.step("Compiling the gate");
  const gate = await createGateRunner(device, ck);
  mark("gate");

  // Deferred boot steps that write to the GPU queue run one at a time and
  // never while a capture runs; a capture waits for one in flight.
  let bootGpuBusy = false;
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  const bootGpu = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    while (isCapturing()) await wait(50);
    bootGpuBusy = true;
    try {
      return await fn();
    } finally {
      bootGpuBusy = false;
    }
  };
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
      captureStatus.textContent = `Capturing the canonical run (${CANONICAL_STEPS.toLocaleString()} steps)…`;
      try {
        while (bootGpuBusy) await wait(20);
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
        if (held.governor) held.governor.suspended = false;
      }
    });
  });
  studio.drawer.footer.append(captureStatus, h("div", { class: "gr-capture-row" }, captureBtn, captureLink));
  (globalThis as { __growGate?: typeof gate }).__growGate = gate;
  // until the live dish is up, the drawers say so (Learn and Prove replace this)
  for (const pane of [studio.drawer.learn, studio.drawer.prove]) {
    pane.textContent = "";
    pane.append(h("p", { class: "gr-note", role: "status" }, "Compiling the live dish. The release gate's capture control below is ready now."));
  }
  markReady();
  mark("ready");

  // ------------------------------------------- the live dish, after --
  try {
    await startLive({ studio, gpu, query, ck, gate, manifestP, texturesP, bootGpu, held });
  } catch (e) {
    fail(`the live dish could not start (${(e as Error).message}). The release gate's capture still works.`);
  }
}

interface LiveBoot {
  studio: Studio;
  gpu: GpuContext;
  query: URLSearchParams;
  ck: Checkpoint;
  gate: GateRunner;
  manifestP: Promise<MenagerieManifest>;
  texturesP: Promise<TextureManifest>;
  bootGpu: <T>(fn: () => T | Promise<T>) => Promise<T>;
  held: { governor: QualityGovernor | null };
}

/** Everything but the gate path: compiled and loaded once the page is ready for the gate. */
async function startLive(b: LiveBoot): Promise<void> {
  const { studio, gpu, query, ck, gate, bootGpu } = b;
  const { device } = gpu;
  const tier = pickTier(gpu, readTierEnvironment(), query.get("tier"));
  studio.veil.step("Fetching the menagerie");
  const manifest = await b.manifestP;
  const lib = new OrganismLibrary(manifest, ck);
  // a page whose textures do not arrive still runs every other scene
  const texManifest = await b.texturesP.catch((e: unknown): TextureManifest => {
    console.warn(`Textures unavailable: ${(e as Error).message}`);
    return { layout: { channels: 12, hidden: 96, count: 0, b1Off: 0, w1Off: 0, w2Off: 0 }, textures: [] };
  });
  const textures = new TextureLibrary(texManifest);
  const scenes = SCENES.filter((s) => s.kind !== "texture" || texManifest.textures.length > 0);
  const url = urlSchema(
    scenes.map((s) => s.id),
    manifest.organisms.map((o) => o.id),
    texManifest.textures.map((t) => t.id),
  );
  studio.veil.step("Compiling the live dish");
  // the live solver's compiles start first (async); the renderer's run alongside
  const kernelsP = LiveKernels.create(device);
  kernelsP.catch(() => {}); // awaited below
  const hdr = await bootGpu(
    () =>
      new HdrPipeline(gpu, studio.canvas, {
        toneMap: "neutral",
        // the organism's colours are what the network learned: hold exposure at 1
        exposure: { mode: "pinned", value: 1 },
      }),
  );
  const profiler = new GpuProfiler(device, gpu.timestamps);
  // judges the render passes alone (app.adaptToTimings): render scale is its only lever
  const governor = new QualityGovernor({
    budgetMs: gpu.timestamps ? 12 : tier === "T1" ? 36 : 22,
    effectLevels: 0,
    allowSimStepDown: false,
  });
  b.held.governor = governor;
  // GPU ms per frame for compute (the dish's steps + background jobs). The
  // render takes ~1–3 ms on a desktop GPU; T1 leaves more of the frame alone.
  // maxUnits: Teach's training units are ~0.07 ms each on a desktop GPU, so a frame takes a hundred or more
  const scheduler = new FrameScheduler({ budgetMs: tier === "T1" ? 3 : 6, defaultUnitMs: 0.25, minUnits: 1, maxUnits: 1024 });
  // Teach's training pipelines: compiled once the dish is live (or when first asked for), never before ready
  let trainKernelsP: Promise<TrainKernels> | null = null;
  const trainKernels = (): Promise<TrainKernels> => {
    if (!trainKernelsP) {
      const t0 = performance.now();
      trainKernelsP = TrainKernels.create(device).then((k) => {
        bootMarks["trainCompileMs"] = Math.round(performance.now() - t0);
        mark("trainKernels");
        return k;
      });
      trainKernelsP.catch(() => {
        trainKernelsP = null;
      });
    }
    return trainKernelsP;
  };
  // Chimera's and Textures' pipelines: compiled once the dish is live (or when a scene first needs them), never before ready
  let m3P: Promise<M3Kernels> | null = null;
  const m3Kernels = (): Promise<M3Kernels> => {
    if (!m3P) {
      const t0 = performance.now();
      // pipeline compiles only: nothing is written to the queue, so a capture may run alongside
      m3P = Promise.all([ChimeraKernels.create(device), TextureKernels.create(device)]).then(([chim, tex]) => {
        bootMarks["m3CompileMs"] = Math.round(performance.now() - t0);
        mark("m3Kernels");
        return { chim, tex };
      });
      m3P.catch(() => {
        m3P = null;
      });
    }
    return m3P;
  };
  const renderer = await bootGpu(() => new DishRenderer(device));
  mark("renderer");
  const kernels = await kernelsP;
  mark("kernels");
  const app = await bootGpu(() => new App(gpu, studio, hdr, renderer, kernels, lib, scheduler, tier));
  if (gpu.timestamps) {
    profiler.onFrame = () => {
      const render = app.adaptToTimings(profiler.timings());
      if (render !== null) governor.sample(render);
    };
  }
  app.profiler = profiler;
  app.governor = governor;
  app.m3 = m3Kernels;
  app.textures = textures;

  // ---------------------------------------------------------------- URL --
  const parsed = url.parse(location.search).values;
  const current = (): Partial<typeof parsed> => ({
    s: app.scene.id,
    // only the Menagerie's organisms go in links (taught and saved models live in this browser)
    o: lib.inGallery(app.organism.def.id) ? app.organism.def.id : "today",
    seed: app.seed,
    p: app.sim.fireRate,
    sp: app.clock.speed,
    show: app.viewMode,
    cam: [
      (app.camera.cx - app.anchor()[0]) / GRID,
      (app.camera.cy - app.anchor()[1]) / GRID,
      app.camera.pxPerUnit / app.camera.coverZoom(),
    ].map((x) => Number(x.toFixed(4))),
    cell: app.scene.kind === "cell" ? app.cellSel.slice() : [GRID / 2, GRID / 2],
    with: app.partner && lib.inGallery(app.partner.def.id) && app.partner.def.id !== lib.partnerFor(app.organism.def.id) ? app.partner.def.id : "auto",
    tex: app.texture?.def.id ?? texManifest.textures[0]?.id ?? "none",
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
  const syncTune = (): void => tune.sync(app.sim.fireRate, app.viewMode);

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn, manifest);

  // ------------------------------------------------------------- Prove --
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    gate,
    kernels,
    checkpoint: ck,
    library: lib,
    scheduler,
    showGated: () => {
      void app.loadScene("dish", { seed: CANONICAL_SEED, fireRate: FIRE_RATE, view: app.viewMode, organism: lib.gatedId }).then(() => {
        syncTune();
        app.writeUrl();
      });
    },
    hold: (on) => {
      governor.suspended = on;
    },
    trainKernels,
    m3: m3Kernels,
    textures,
  });
  let lastOnScreen = "";
  const syncProve = (): void => {
    const shown = app.dishes[0]?.org.def ?? app.organism.def;
    const kind = app.scene.kind;
    const s = {
      scene: app.scene.title,
      organism:
        kind === "texture"
          ? `the ${app.texture?.def.name.toLowerCase() ?? ""} texture network on its own kernel`
          : kind === "chimera"
            ? `the ${app.organism.def.name.toLowerCase()} and the ${app.partner?.def.name.toLowerCase() ?? ""} rules side by side (Chimera's per-cell-rule copy of the update)`
            : app.dishes.length > 1
              ? `all ${app.dishes.length} ${kind === "teach" ? "dishes of the training batch" : "organisms"}`
              : shown.name,
      gatedOrganism: app.dishes.length === 1 && shown.gated && kind !== "teach" && kind !== "texture",
      kernel:
        kind === "texture"
          ? `the ${app.texture?.def.name.toLowerCase() ?? ""} texture network on the Textures kernel`
          : kind === "chimera"
            ? `the ${app.organism.def.name.toLowerCase()} and ${app.partner?.def.name.toLowerCase() ?? ""} rules on Chimera's per-cell-rule copy of the update`
            : undefined,
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

  // ---------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    scenes.map((s) => ({ id: s.id, title: s.title })),
    "dish",
  );
  studio.heading.onPick = (id) => {
    void app.loadScene(id as SceneId, { fireRate: app.sim.fireRate, view: id === "cell" || app.scene.id === "cell" ? undefined : app.viewMode }).then(() => app.writeUrl());
  };

  // ---------------------------------------------- Menagerie, organisms --
  const menagerie = buildMenagerieUi(studio.stage, studio.heading.picker.parentElement ?? studio.heading.extra, manifest, {
    grow: (id) => {
      menagerie.close();
      void app.loadScene("dish", { organism: id, fireRate: app.sim.fireRate, view: app.viewMode }).then(() => app.writeUrl());
    },
    pick: (id) => {
      const sc = app.scene.kind === "menagerie" ? "dish" : app.scene.id;
      void app.loadScene(sc, { organism: id, seed: app.seed, fireRate: app.sim.fireRate, view: app.viewMode, cell: app.cellSel }).then(() => app.writeUrl());
    },
  });
  // Chimera's second organism, Textures' texture
  const m3ui = buildM3Ui(studio.stage, studio.heading.picker.parentElement ?? studio.heading.extra, manifest.organisms, texManifest, {
    partner: (id) => {
      void app.loadScene("chimera", { organism: app.organism.def.id, partner: id, seed: app.seed, fireRate: app.sim.fireRate, view: app.viewMode }).then(() => app.writeUrl());
    },
    texture: (id) => {
      void app.loadScene("textures", { texture: id, seed: app.seed, fireRate: app.sim.fireRate, view: app.viewMode }).then(() => app.writeUrl());
    },
  });
  // Teach (M2): its panel, the paint tools, training, the library
  const teach = new Teach({
    app,
    studio,
    gpu,
    tier,
    lib,
    gated: ck,
    manifest,
    scheduler,
    liveKernels: kernels,
    trainKernels,
    download,
  });
  // Inside the Cell's inspector
  const cellPanel = buildCellPanel(studio.stage, {
    step: () => studio.transport.handlers?.step(),
    play: () => app.togglePlay(),
  });
  cellPanel.el.hidden = true;
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
  studio.key(TOOLS.map((_, i) => String(i + 1)).join(" "), "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("[ ]", "Narrower / wider brush", (e) => app.scaleBrush(e.key === "]" ? 1.4 : 1 / 1.4));
  studio.key("S", "Save point", () => app.savePoint());
  studio.key("C", "Compare with the save point", () => app.toggleCompare());
  studio.key("Z", "Undo the last edit", () => void app.undo());
  studio.key("T", "Tune", () => studio.tune.toggle());
  studio.key("V", "Next view: specimen, hidden channels, cells", () => {
    const i = VIEW_MODES.findIndex((m) => m.value === app.viewMode);
    app.setView(VIEW_MODES[(i + 1) % VIEW_MODES.length]!.value);
    syncTune();
  });

  app.hooks = {
    onSceneChange: (scene) => {
      learn.setScene(scene, app.onGatedRun, app.dishes.length > 1 && scene.kind !== "chimera" ? null : app.organism.def, {
        partner: app.partner?.def,
        texture: app.texture?.def,
        grid: app.grid,
      });
      menagerie.setDishes(scene.kind === "menagerie" ? app.dishes.map((d) => d.org.def) : null);
      menagerie.setOrganism(app.organism.def.id, scene.kind !== "menagerie" && scene.kind !== "teach" && scene.kind !== "texture");
      m3ui.setPartner(scene.kind === "chimera" ? (app.partner?.def.id ?? null) : null);
      m3ui.setTexture(scene.kind === "texture" ? (app.texture?.def.id ?? null) : null);
      m3ui.setLegend(null, []);
      teach.onScene(scene.kind === "teach");
      cellPanel.el.hidden = scene.kind !== "cell";
      cellPanel.set(null, app.sim.fireRate, app.clock.paused);
      studio.root.classList.toggle("gr-has-panel", scene.kind === "cell");
      studio.root.classList.toggle("gr-plane", scene.kind === "texture");
      syncTune();
      syncProve();
    },
    onEdited: () => {
      learn.setScene(app.scene, app.onGatedRun, app.dishes.length > 1 && app.scene.kind !== "chimera" ? null : app.organism.def, {
        partner: app.partner?.def,
        texture: app.texture?.def,
        grid: app.grid,
      });
      syncTune();
      syncProve();
    },
    onCell: (c) => cellPanel.set(c, app.sim.fireRate, app.clock.paused),
    onStats: (s) => {
      if (app.scene.kind === "chimera") {
        m3ui.setLegend(
          app.dishes.map((d, i) => ({ name: d.org.def.name, counts: app.ruleCounts[i] ?? [] })),
          app.dishes.map((d) => d.org.def.name),
        );
      }
      if (app.learnOpen && app.scene.kind !== "texture") learn.setStats(s, app.grid, app.sim.tick, app.scene.kind === "chimera" ? app.ruleCounts : null);
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
    teach.onFrame(now);
    if (app.scene.kind === "chimera") {
      const R = app.dishRadius;
      m3ui.placeLegend(app.dishes.map((_, i) => app.toScreen(i, GRID / 2, GRID / 2 + R * 0.86)));
    }
    if (app.scene.kind === "menagerie") {
      const R = app.dishRadius;
      menagerie.place(
        app.dishes.map((_, i) => app.toScreen(i, GRID / 2, GRID / 2 + R * 0.72)),
        2 * R * app.camera.pxPerUnit,
      );
    }
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
        [
          "Dish",
          app.scene.kind === "texture"
            ? `a ${app.grid} × ${app.grid} wrap-around plane, 12 channels`
            : `${app.dishes.length > 1 ? `${app.dishes.length} dishes of ` : ""}${GRID} × ${GRID} cells, 16 channels`,
        ],
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
    view: query.has("show") || scene.kind !== "cell" ? (parsed.show as ViewMode) : undefined,
    camera: parsed.cam[2]! > 0 ? { cx: parsed.cam[0]!, cy: parsed.cam[1]!, zoom: parsed.cam[2]! } : undefined,
    organism: parsed.o === "today" ? lib.today() : parsed.o,
    cell: [parsed.cell[0]!, parsed.cell[1]!],
    partner: parsed.with === "auto" ? undefined : parsed.with,
    texture: parsed.tex === "none" ? undefined : parsed.tex,
  };
  await bootGpu(() => app.loadScene(scene.id, opts));
  mark("scene");
  app.setSpeed(reduced && parsed.sp === 1 ? 0.5 : parsed.sp);
  syncTune();
  studio.veil.done();
  app.start();

  // test / inspection hooks (layout checks, acceptance runs): read-only summaries
  (globalThis as { __bpDebug?: () => unknown }).__bpDebug = () => ({
    scene: app.scene.id,
    organism: app.organism.def.id,
    dishes: app.dishes.length,
    tier: app.tier,
    tick: app.sim.tick,
    grid: app.grid,
    partner: app.partner?.def.id ?? null,
    texture: app.texture?.def.id ?? null,
    ruleCounts: app.ruleCounts,
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
  (globalThis as { __growTeach?: Teach }).__growTeach = teach;
  (globalThis as { __growLive?: boolean }).__growLive = true;
  mark("live");
  // Teach's pipelines compile now, after the dish is live (Teach and Prove's gradient check wait for them), then Chimera's and Textures'
  void trainKernels()
    .catch((e: unknown) => console.warn(`Teach's training pipelines did not compile: ${(e as Error).message}`))
    .then(() => m3Kernels())
    .catch((e: unknown) => console.warn(`Chimera's and Textures' pipelines did not compile: ${(e as Error).message}`));

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
    grid: app.grid,
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
