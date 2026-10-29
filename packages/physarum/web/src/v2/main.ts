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
import type { SeedSpec } from "./model/sim.js";
import { LiveKernels, LiveSim } from "./model/sim.js";
import { AGENTS, DENSITY, gridFor } from "./model/grid.js";
import { downsample, morphology } from "./model/morphology.js";
import { bandOf, describeDish } from "./model/regress.js";
import { colonyOverlap } from "./model/territory.js";
import type { Tier } from "@bp/gpu";
import type { JonesParams } from "./proof/gate.js";
import { PARAMS, createGateRunner } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { DEFAULT_LOOK, GlowView } from "./render/glow-view.js";
import type { PaletteId } from "./render/look.js";
import { PALETTES } from "./render/look.js";
import type { SceneId } from "./scenes.js";
import { RIVALRY, SCENES, sceneById } from "./scenes.js";
import { buildTune } from "./tune.js";
import { buildScoreCard } from "./score.js";
import { buildTerritoryCard } from "./territory-card.js";
import { ScoreOverlay } from "./render/overlay.js";
import type { PadPoint } from "./pad.js";
import { CORNERS, PAD_CENTRE, PAD_JITTER, PAD_N, nearestOffered, padParams } from "./pad.js";


const SIM_NAME = "Slime Mould";
const SCENE_IDS = SCENES.map((s) => s.id);

const url = new UrlState(
  {
    s: { kind: "enum", def: "first-light", values: SCENE_IDS },
    seed: { kind: "int", def: 1, min: 0, max: 2 ** 31 - 1 },
    // the personality on the pad, i·5 + j (−1: the scene's own)
    pad: { kind: "int", def: -1, min: -1, max: PAD_N * PAD_N - 1 },
    // Jones parameters, written only where they differ from the personality's or scene's (−1 = that value)
    dphi: { kind: "num", def: -1, min: -1, max: 180, digits: 2 },
    ls: { kind: "num", def: -1, min: -1, max: 64, digits: 2 },
    lm: { kind: "num", def: -1, min: -1, max: 8, digits: 3 },
    dep: { kind: "num", def: -1, min: -1, max: 50, digits: 2 },
    a: { kind: "num", def: -1, min: -1, max: 0.9, digits: 4 },
    // speed, written only where it differs from the scene's own (−1 = the scene's)
    sp: { kind: "num", def: -1, min: -1, max: 8 },
    pal: { kind: "enum", def: "auto", values: ["auto", ...Object.keys(PALETTES)] },
    cam: { kind: "nums", def: [-1, -1, -1], n: 3, digits: 4 },
    // territories: colonies (−1 = the scene's), rivalry (−1 = the scene's), a mixed start (1),
    // each colony's personality: pad point i·5 + j, 25 = the shared one, −1 = the scene's
    col: { kind: "int", def: -1, min: -1, max: 4 },
    riv: { kind: "num", def: -1, min: -1, max: 2, digits: 2 },
    mix: { kind: "int", def: 0, min: 0, max: 1 },
    cp: { kind: "nums", def: [-1, -1, -1, -1], n: 4, digits: 0 },
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
    const sp = app.scene.personality;
    const samePad = !!app.pad && !!sp && app.pad.i === sp.i && app.pad.j === sp.j;
    const d = app.pad ? padParams(app.pad) : app.scene.params;
    const or = (v: number, def: number): number => (v === def ? -1 : v);
    return {
      s: app.scene.id,
      seed: app.seed,
      pad: app.pad && !samePad ? app.pad.i * PAD_N + app.pad.j : -1,
      dphi: or(p.delta_phi_deg, d.delta_phi_deg),
      ls: or(p.L_sense, d.L_sense),
      lm: or(p.L_move, d.L_move),
      dep: or(p.deposit, d.deposit),
      a: or(p.decay_alpha, d.decay_alpha),
      sp: app.clock.speed === (app.scene.speed ?? 1) ? -1 : app.clock.speed,
      pal: app.palette === app.scene.palette ? "auto" : app.palette,
      cam: [app.camera.cx / app.sim.w, app.camera.cy / app.sim.h, app.camera.pxPerUnit / app.camera.coverZoom()].map((v) => Number(v.toFixed(4))),
      col: app.scene.colonies && app.sim.colonies !== app.scene.colonies ? app.sim.colonies : -1,
      riv: app.sim.colonies > 1 && app.rivalry !== RIVALRY ? app.rivalry : -1,
      mix: app.mixed ? 1 : 0,
      cp: [0, 1, 2, 3].map((k) => {
        if (k >= app.colonyPads.length) return -1;
        const q = app.colonyPads[k] ?? null;
        const d = app.scene.colonyPads?.[k] ?? null;
        if ((q === null && d === null) || (q && d && q.i === d.i && q.j === d.j)) return -1;
        return q ? q.i * PAD_N + q.j : PAD_N * PAD_N;
      }),
    };
  };
  app.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const tune = buildTune(studio.tune.body, {
    pad: (p) => app.setPad(p),
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
  const syncTune = (): void => tune.sync(app.sim.params, app.pad, app.palette, app.tier, !!app.scene.personality);

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
      personality: app.personalityName,
      stochastic: !!app.scene.personality,
      food: app.sim.envSpec?.food.length ?? 0,
      lights: app.sim.envSpec?.lights.length ?? 0,
      growing: app.sim.growing,
      walls: !!app.sim.envSpec?.walls,
      hunger: app.sim.hungerMax !== null,
      colonies: app.sim.colonies,
      rivalry: app.rivalry,
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

  // ---------------------------------------------- score card + overlay --
  const scoreOverlay = new ScoreOverlay();
  studio.canvas.after(scoreOverlay.el);
  const scoreCard = buildScoreCard();
  studio.stage.append(scoreCard.el);
  scoreCard.onLayers = (l) => {
    scoreOverlay.layers = l;
  };
  scoreCard.onScore = () => app.scoreNow();
  const terrCard = buildTerritoryCard();
  studio.stage.append(terrCard.el);
  terrCard.onPad = (k, p) => app.setColonyPad(k, p);
  terrCard.onRivalry = (v, phase) => app.setRivalry(v, phase);
  terrCard.onCount = (n) => void app.setColonyCount(n);
  terrCard.onMixed = (m) => void app.setMixed(m);
  const syncColonies = (): void => {
    terrCard.setShown(app.sim.colonies > 1);
    if (app.sim.colonies > 1) {
      terrCard.sync(app.colonyPads, app.rivalry, app.tier, app.mixed, sharedName());
      // a rebuilt card starts blank: give it the reading the dish already has (paused edits take none)
      terrCard.set(app.territory);
    }
  };
  // the shared personality's short name, for colonies that follow Tune
  const sharedName = (): string => {
    const p = app.pad;
    if (!p) return "custom";
    const c = CORNERS.find((k) => k.at.i === p.i && k.at.j === p.j);
    return c ? c.name : p.i === PAD_CENTRE.i && p.j === PAD_CENTRE.j ? "Middle" : `pad ${p.i + 1}, ${p.j + 1}`;
  };

  // ---------------------------------------------------- shell wiring --
  studio.heading.setScenes(
    SCENES.filter((s) => s.listed).map((s) => ({ id: s.id, title: s.title })),
    "first-light",
  );
  studio.heading.onPick = (id) => {
    void app.loadScene(id as SceneId).then(() => {
      // a scene may play faster than 1× (The Maze: its dead ends take a minute to empty)
      app.setSpeed(sceneById(id).speed ?? 1);
      app.writeUrl();
    });
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
  studio.key("1 2 3 4", "Choose a tool", (e) => studio.rail.selectIndex(Number(e.key) - 1));
  studio.key("Z", "Undo the last edit", () => void app.undo());
  studio.key("S", "Save point", () => app.savePoint());
  studio.key("C", "Compare with the save point", () => app.toggleCompare());
  studio.key("T", "Tune", () => studio.tune.toggle());

  app.hooks = {
    onSceneChange: (scene) => {
      scoreOverlay.analysis = null;
      scoreOverlay.draw(app.camera, 1);
      scoreCard.setKind(scene.score ?? null);
      learn.setScene(scene, app.onGatedRun);
      syncTune();
      syncProve();
    },
    onParams: (p) => {
      learn.setParams(p, app.personalityName);
      syncTune();
      syncProve();
      syncColonies();
    },
    onEdited: () => syncProve(),
    onAnalysis: (a) => {
      scoreOverlay.analysis = a;
      scoreCard.set(a, false);
    },
    onTerritory: (t) => terrCard.set(t),
    onColonies: () => {
      syncColonies();
      syncProve();
    },
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
    if (app.scene.score) scoreOverlay.draw(app.camera, Math.min(window.devicePixelRatio || 1, 2));
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
  // the personality: the link's, else the scene's (nearest offered on this tier)
  const linkPad: PadPoint | null = parsed.pad >= 0 && scene.personality ? { i: Math.floor(parsed.pad / PAD_N), j: parsed.pad % PAD_N } : null;
  const startPad = scene.personality ? (linkPad ?? nearestOffered(scene.personality, app.tier)) : null;
  const sp = startPad ? padParams(startPad) : scene.params;
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
    pad: startPad,
    palette: parsed.pal !== "auto" ? (parsed.pal as PaletteId) : undefined,
    camera: parsed.cam[2]! > 0 ? { cx: parsed.cam[0]!, cy: parsed.cam[1]!, zoom: parsed.cam[2]! } : undefined,
    colonies: parsed.col >= 2 ? parsed.col : undefined,
    rivalry: parsed.riv >= 0 ? parsed.riv : undefined,
    colonyPads: parsed.cp.map((v) => (v === PAD_N * PAD_N ? null : v >= 0 && v < PAD_N * PAD_N ? { i: Math.floor(v / PAD_N), j: v % PAD_N } : undefined)),
    mixed: parsed.mix === 1,
  };
  await app.loadScene(scene.id, opts);
  const sceneSpeed = scene.speed ?? 1;
  app.setSpeed(parsed.sp > 0 ? Math.max(0.25, parsed.sp) : reduced ? sceneSpeed * 0.5 : sceneSpeed);
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
  (globalThis as { __physarumPad?: unknown }).__physarumPad = { padParams, PAD_N, PAD_JITTER };
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
    /** Score the dish now: the network and its measures (no drawing data). */
    score: async () => {
      const a = await app.analyse();
      if (!a) return null;
      const s = a.score;
      const plain = s?.kind === "cities" ? { tl: s.tl, md: s.md, cut: s.cut, steinerRatio: s.steinerRatio, mstLength: s.mst.length } : s?.kind === "maze" ? { shortest: s.shortest, along: s.along, onShortest: s.onShortest, extra: s.extra, route: s.route.length } : null;
      return { tick: a.tick, ms: a.ms, net: a.net, nodes: a.graph.nodes.length, ...plain };
    },
    /**
     * Morphology regression (v2-morphology.mjs): a scene from its seed at a
     * tier's agent count, run `steps` steps with the live loop paused (so no
     * director acts), then described (model/regress.ts) — plus the scene's
     * own measures: the score (Connect the Cities, The Maze) or who holds the
     * dish (Territories).
     */
    regress: async (o: { scene: SceneId; seed: number; steps: number; tier?: Tier; mixed?: boolean; agents?: number }) => {
      const before = app.tier;
      if (o.tier) app.tier = o.tier;
      try {
        app.clock.paused = true;
        await app.loadScene(o.scene, { seed: o.seed, mixed: o.mixed, agents: o.agents });
        app.clock.paused = true;
        const t0 = performance.now();
        await app.advance(o.steps);
        const sim = app.sim;
        const trail = await sim.readTrail();
        const seconds = (performance.now() - t0) / 1000;
        // a measure the run does not have (a mean distance before every city is joined) is null
        const d: Record<string, number | null> = describeDish(trail, sim.w, sim.h, sim.colonies, sim.meanTrail, sim.envSpec?.walls ?? null);
        const s = app.scene.score ? (await app.analyse())?.score : null;
        if (s?.kind === "cities") {
          const net = app.analysis!.net;
          d["reached"] = net.reached;
          d["tl"] = s.tl;
          d["md"] = Number.isFinite(s.md) ? s.md : null;
          // links, and links whose loss cuts a city off, per 100,000 cells (their ratio, the
          // card's cut share, is a ratio of a handful of links on a small dish)
          d["links"] = (net.links * 1e5) / sim.cells;
          d["cutLinks"] = (net.cutLinks * 1e5) / sim.cells;
        } else if (s?.kind === "maze") {
          d["joined"] = Number.isFinite(s.along) ? 1 : 0;
          d["route"] = Number.isFinite(s.along) ? s.along / s.shortest : null;
        }
        if (sim.colonies > 1) {
          const t = (await app.readTerritory())!;
          const all = t.agents.reduce((a, b) => a + b, 0);
          t.agents.forEach((v, k) => (d[`share${k}`] = v / all));
          t.shares.held.forEach((v, k) => (d[`held${k}`] = v / t.shares.cells));
          d["overlap"] = colonyOverlap(trail, sim.cells, sim.colonies, Array.from({ length: sim.colonies }, (_, k) => sim.colonyMean(k)));
        }
        return { scene: o.scene, mixed: !!o.mixed, tier: app.tier, seed: o.seed, steps: sim.tick, grid: [sim.w, sim.h], n: sim.n, seconds, d };
      } finally {
        app.tier = before;
      }
    },
    /** The band rule for the morphology baseline (model/regress.ts). */
    band: (key: string, values: number[], cells: number) => bandOf(key, values, cells),
    /**
     * Calibration survey (personality pad): a fresh dish at a tier's agent
     * count and density, seeded, run to each step in `at`, with the trail's
     * morphology and a small log-scaled thumbnail at each.
     */
    morph: async (o: { params: JonesParams; seed: number; at: number[]; tier?: Tier; aspect?: [number, number]; seedSpec?: Partial<SeedSpec>; threshold?: number; jitter?: number | null }) => {
      const tierN = AGENTS[o.tier ?? app.tier];
      const [vw, vh] = o.aspect ?? [16, 9];
      const grid = gridFor(tierN, vw * 100, vh * 100);
      const sim = new LiveSim(device, kernels, { ...grid, params: o.params, longRun: true, sortEvery: SORT_EVERY });
      if (o.jitter !== undefined) sim.setTurning(o.jitter);
      sim.seed({ mode: 0, seed: o.seed, ...o.seedSpec });
      const out: unknown[] = [];
      const t0 = performance.now();
      try {
        for (const target of o.at) {
          while (sim.tick < target) {
            const enc = device.createCommandEncoder();
            sim.encodeSteps(enc, Math.min(64, target - sim.tick));
            device.queue.submit([enc.finish()]);
          }
          const raw = await sim.readTrail();
          const mean = sim.meanTrail;
          const f = new Float32Array(raw.length);
          for (let i = 0; i < raw.length; i += 1) f[i] = raw[i]! / mean;
          const m = morphology(f, sim.w, sim.h, o.threshold ?? 1);
          const step = Math.max(1, Math.round(sim.w / 340));
          const th = downsample(f, sim.w, sim.h, step);
          const px = new Uint8Array(th.field.length);
          for (let i = 0; i < px.length; i += 1) px[i] = Math.min(255, Math.round((255 * Math.log2(1 + th.field[i]!)) / Math.log2(25)));
          let bin = "";
          for (let i = 0; i < px.length; i += 1) bin += String.fromCharCode(px[i]!);
          out.push({ step: sim.tick, ...m, thumb: { w: th.w, h: th.h, b64: btoa(bin) } });
        }
      } finally {
        sim.destroy();
      }
      return { grid: [grid.w, grid.h], n: tierN, seconds: (performance.now() - t0) / 1000, at: out };
    },
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
