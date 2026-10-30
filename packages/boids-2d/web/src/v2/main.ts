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
import { App, BLOOM, MIN_VISION_RANGE, SHARK_RADIUS_R } from "./app.js";
import type { SceneOptions } from "./app.js";
import { DialController } from "./dial-controller.js";
import { buildLearn } from "./learn.js";
import type { BrainParams } from "./model/brains.js";
import { reach } from "./model/brains.js";
import { FlockKernels } from "./model/flock.js";
import { EcoKernels } from "./model/ecology.js";
import { FluidKernels } from "./model/fluid.js";
import { WatchTracker } from "./model/watch.js";
import type { RuleParams } from "./model/params.js";
import { buildCanonicalCapture } from "./proof/gate.js";
import { buildProve } from "./proof/prove.js";
import { fieldCheck, mixingCheck, orderCheck } from "./proof/m3-proofs.js";
import type { FishColour } from "./render/ocean-view.js";
import { DEFAULT_LOOK, OceanView } from "./render/ocean-view.js";
import { SeaView } from "./render/sea-view.js";
import { PopulationPanel, WaterPanel } from "./m2-panels.js";
import { EyesPanel } from "./m3-panels.js";
import { MatrixPanel, ownKindShare } from "./matrix-panel.js";
import type { SpeciesParams, VisionBrainParams } from "./model/brains-m3.js";
import { speciesPreset } from "./model/brains-m3.js";
import { decodeKinds, encodeKinds, presetOf } from "./kinds-link.js";
import { schoolStats } from "./model/vision-cpu.js";
import { WatchPanel } from "./watch-panel.js";
import { RegimePanel } from "./regime.js";
import type { SceneId } from "./scenes.js";
import { DIAL_ETA, DIAL_RHO, EYES_LEQ, RHO_RANGE, SCENES, couzinFor, sceneById, sceneCount, vicsekFor, vicsekRho, visionFor } from "./scenes.js";
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
    // panic: the Reynolds rule's noise, or The Order Dial's Vicsek η
    eta: { kind: "num", def: -1, min: -1, max: 1, digits: 3 },
    // The Order Dial's crowding ρ (fish per r²)
    rho: { kind: "num", def: -1, min: -1, max: RHO_RANGE[1], digits: 3 },
    // The Mill's Couzin zones: Δr_o, field of view (°), turn per step (°), noise σ (rad)
    dro: { kind: "num", def: -1, min: -1, max: 8, digits: 2 },
    fov: { kind: "num", def: -1, min: -1, max: 360, digits: 0 },
    turn: { kind: "num", def: -1, min: -1, max: 12, digits: 1 },
    sig: { kind: "num", def: -1, min: -1, max: 0.4, digits: 2 },
    sp: { kind: "num", def: 1, min: 0.25, max: 8 },
    shark: { kind: "num", def: SHARK_RADIUS_R, min: 4, max: 40, digits: 0 },
    // the fish colour the visitor chose ("scene" = each scene's own)
    col: { kind: "enum", def: "scene", values: ["scene", "silver", "heading", "species"] },
    cam: { kind: "nums", def: [-1, -1, -1], n: 3, digits: 4 },
    // Current's water: drag, fish weight, push (× fish speed), ν, μ (−1 = the scene's)
    wp: { kind: "nums", def: [-1, -1, -1, -1, -1], n: 5, digits: 5 },
    // Food Chain: plankton growth, fish efficiency, shark upkeep, shark speed (−1 = the scene's)
    ep: { kind: "nums", def: [-1, -1, -1, -1], n: 4, digits: 5 },
    // Eyes Only: speed response α₀, turn response β₀, edge pull α₁ = β₁, sight (BL) (−1 = the scene's)
    vis: { kind: "nums", def: [-1, -1, -1, -1], n: 4, digits: 4 },
    // Species Matrix: preset~kinds, then (an edited matrix) ~g<steer gains>~a<swim gains>~s<speeds>
    kinds: { kind: "str", def: "", pattern: /^(|[a-z]+~[2-6](~[gasfp][-0-9.,]*)*)$/ },
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
  // filming (posters, loops, clips: ?chrome=off) pumps frames between screenshots, so the
  // frame interval says nothing about the GPU: hold full quality
  const filming = query.get("chrome") === "off";
  governor.suspended = filming;
  studio.veil.step("Compiling the flock kernel");
  const [kernels, fluidKernels, ecoKernels, watcher] = await Promise.all([
    FlockKernels.create(device),
    FluidKernels.create(device),
    EcoKernels.create(device),
    WatchTracker.create(device),
  ]);
  const view = new OceanView(device, DEFAULT_LOOK);
  const app = new App(gpu, studio, hdr, view, kernels, tier);
  app.fluidKernels = fluidKernels;
  app.ecoKernels = ecoKernels;
  app.sea = new SeaView(device);
  app.watcher = watcher;
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
    const b = app.flock.brain;
    const bd = app.scene.brain?.(app.flock.n);
    const brainKeys: Partial<typeof parsed> = {};
    if (b?.kind === "vicsek" && bd?.kind === "vicsek") {
      brainKeys.eta = or(Number(b.p.eta.toFixed(3)), Number(bd.p.eta.toFixed(3)));
      brainKeys.rho = or(Number(vicsekRho(b.p.r).toFixed(3)), Number(vicsekRho(bd.p.r).toFixed(3)));
    } else if (b?.kind === "vision" && bd?.kind === "vision") {
      brainKeys.vis = [or(b.p.a0, bd.p.a0), or(b.p.b0, bd.p.b0), or(b.p.a1, bd.p.a1), or(b.p.range, bd.p.range)];
    } else if (b?.kind === "species") {
      brainKeys.kinds = encodeKinds(b.p);
    } else if (b?.kind === "couzin" && bd?.kind === "couzin") {
      brainKeys.dro = or(Number((b.p.ro - b.p.rr).toFixed(2)), Number((bd.p.ro - bd.p.rr).toFixed(2)));
      brainKeys.fov = or(b.p.fovDeg, bd.p.fovDeg);
      brainKeys.turn = or(Number(((b.p.maxTurn * 180) / Math.PI).toFixed(1)), Number(((bd.p.maxTurn * 180) / Math.PI).toFixed(1)));
      brainKeys.sig = or(Number(b.p.sigma.toFixed(2)), Number(bd.p.sigma.toFixed(2)));
    }
    const m2: Partial<typeof parsed> = {};
    const cw = app.current;
    const sw = app.scene.water;
    if (cw && sw) {
      const p = cw.fluid.params;
      m2.wp = [or(p.drag, sw.params.drag), or(p.massRatio, sw.params.massRatio), or(Number((cw.tideSpeed / app.flock.rule.maxSpeed).toFixed(4)), Number((sw.tide / app.flock.rule.maxSpeed).toFixed(4))), or(p.nu, sw.params.nu), or(p.mu, sw.params.mu)];
    }
    const ec = app.ecology;
    const se = app.scene.ecology;
    if (ec && se) {
      const p = ec.params;
      m2.ep = [or(p.growth, se.params.growth), or(p.efficiency, se.params.efficiency), or(p.sharkCost, se.params.sharkCost), or(p.sharkSpeed, se.params.sharkSpeed)];
    }
    return {
      ...m2,
      s: app.scene.id,
      seed: app.seed,
      ws: or(r.wSep, d.wSep),
      wa: or(r.wAli, d.wAli),
      wc: or(r.wCoh, d.wCoh),
      r: or(r.rCoh, d.rCoh),
      vmax: or(r.maxSpeed, d.maxSpeed),
      eta: or(r.noise, d.noise),
      ...brainKeys,
      sp: app.clock.speed,
      shark: app.sharkSize,
      col: app.colourChoice ?? "scene",
      cam: [app.camera.cx / app.camera.domainW, app.camera.cy / app.camera.domainH, app.camera.pxPerUnit / app.camera.coverZoom()].map((x) =>
        Number(x.toFixed(4)),
      ),
    };
  };
  app.writeUrl = () => url.write(current());

  // -------------------------------------------------------------- Tune --
  const setColour = (c: FishColour): void => app.setColour(c);
  const tune = buildTune(
    studio.tune.body,
    {
      rule: (r, phase) => app.setRule(r, phase),
      brain: (b, phase) => app.setBrain(b, phase),
      reset: () => {
        app.resetRule();
        syncTune();
      },
      colour: setColour,
    },
    app.scene.rule,
  );
  const syncTune = (): void => {
    tune.sync(app.flock.rule, app.flock.brain, view.look.colour);
    const b = app.flock.brain;
    studio.tune.setNote(
      app.ecology
        ? "Food Chain's rates. The fish school by Open Water's weights; the ecology replays bit for bit from the same seed on the same GPU."
        : app.current
          ? "The fish are Open Water's flock (the v4 lab's kernel); the water is solved each step. Same seed, same GPU, same bytes."
          : !b
        ? "The rule is the v4 lab's Reynolds flock. Every value keeps the kernel's exactness: same seed, same GPU, same bytes."
        : b.kind === "couzin"
          ? "Couzin et al. 2002's zones: repel inside r_r, align out to r_o, gather across the school. Same seed, same GPU, same bytes."
          : b.kind === "vision"
            ? "Bastien & Romanczuk 2020's vision-only model. Nothing here reads another fish's heading. Same seed, same GPU, same bytes."
            : b.kind === "species"
              ? "Open Water's rule for every kind; the matrix (on the canvas) sets who steers towards whom. Same seed, same GPU, same bytes."
              : "The Vicsek model (Vicsek et al. 1995). Same seed, same GPU, same bytes.",
    );
  };

  // ------------------------------------------------------------- Learn --
  const learn = buildLearn(studio.drawer.learn);

  // ------------------------------------------- The Order Dial, The Mill --
  const dial = new DialController(app, studio.stage);
  dial.onSweep = (r) => {
    learn.setSweep(r);
    app.writeUrl();
  };
  const regime = new RegimePanel();
  const pop = new PopulationPanel();
  const waterPanel = new WaterPanel();
  const eyes = new EyesPanel();
  const watchPanel = new WatchPanel();
  watchPanel.onLetGo = () => app.letGo();
  watchPanel.onFollow = () => app.followAgain();
  const matrix = new MatrixPanel({
    edit: (p, phase) => app.setBrain({ kind: "species", p }, phase),
    restart: (preset, count) => {
      // a new matrix and new kinds; Tune's reach, speed, separation and panic carry over
      const now = app.flock.brain?.kind === "species" ? app.flock.brain.p : null;
      const p = speciesPreset(preset, count);
      const brain = { kind: "species" as const, p: now ? { ...p, rCoh: now.rCoh, speed: now.speed, wSep: now.wSep, eta: now.eta } : p };
      void app.loadScene("species", { seed: app.seed, brain }).then(() => app.writeUrl());
    },
  });

  // M2 scenes' own knobs in Tune: the water (Current), the ecology (Food Chain)
  const extraTune = (): void => {
    const c = app.current;
    const e = app.ecology;
    if (c) {
      const f = c.fluid;
      tune.setExtra(
        "The water",
        [
          { label: "Drag", symbol: "fraction per step", min: 0, max: 0.3, step: 0.01, digits: 2, hint: "How fast a fish's velocity moves towards the water's. At 0 the fish ignore the water and the water ignores them.", get: () => f.params.drag, set: (v) => ((f.params = { ...f.params, drag: v }), app.writeUrl()) },
          { label: "Fish weight", symbol: "of the water", min: 0.05, max: 2, step: 0.05, digits: 2, hint: "The fish's total mass against the water's. Heavier fish drag the water more and are carried less.", get: () => f.params.massRatio, set: (v) => ((f.params = { ...f.params, massRatio: v }), app.writeUrl()) },
          {
            label: "Steady push",
            symbol: "× fish speed",
            min: 0,
            max: 2,
            step: 0.05,
            digits: 2,
            hint: "The current the steady push would keep without the fish (Kolmogorov forcing), as a multiple of a fish's top speed.",
            get: () => c.tideSpeed / app.flock.rule.maxSpeed,
            set: (v) => {
              c.setTide(v * app.flock.rule.maxSpeed);
              app.writeUrl();
            },
          },
          { label: "Viscosity", symbol: "ν", min: 0, max: 0.002, step: 0.0001, digits: 4, hint: "How quickly the water's eddies smooth out (world units² per step).", get: () => f.params.nu, set: (v) => ((f.params = { ...f.params, nu: v }), c.setTide(), app.writeUrl()) },
          { label: "Floor friction", symbol: "μ", min: 0, max: 0.004, step: 0.0001, digits: 4, hint: "How quickly the sea floor slows the whole flow (per step).", get: () => f.params.mu, set: (v) => ((f.params = { ...f.params, mu: v }), c.setTide(), app.writeUrl()) },
        ],
        false,
      );
    } else if (e) {
      const set = (k: "growth" | "efficiency" | "sharkCost" | "sharkSpeed") => (v: number) => {
        e.params = { ...e.params, [k]: v };
        app.writeUrl();
      };
      tune.setExtra(
        "The food chain",
        [
          { label: "Plankton growth", symbol: "r", min: 0.002, max: 0.05, step: 0.001, digits: 3, hint: "How fast plankton grows back where it has been grazed (per step).", get: () => e.params.growth, set: set("growth") },
          { label: "Fish efficiency", symbol: "ε", min: 0.03, max: 0.4, step: 0.01, digits: 2, hint: "How much of what a fish eats becomes fish. Higher, and the fish boom faster.", get: () => e.params.efficiency, set: set("efficiency") },
          { label: "Shark upkeep", symbol: "per step", min: 0.001, max: 0.01, step: 0.0002, digits: 4, hint: "The energy a shark burns each step. Higher, and sharks need more fish to live.", get: () => e.params.sharkCost, set: set("sharkCost") },
          { label: "Shark speed", symbol: "× fish", min: 1, max: 2.5, step: 0.05, digits: 2, hint: "How much faster than a fish a hunting shark swims.", get: () => e.params.sharkSpeed, set: set("sharkSpeed") },
        ],
        true,
      );
    } else if (app.flock.brain?.kind === "vision") {
      const vb = (): VisionBrainParams | null => (app.flock.brain?.kind === "vision" ? app.flock.brain.p : null);
      const setV = (k: keyof VisionBrainParams, both?: keyof VisionBrainParams) => (v: number) => {
        const p = vb();
        if (!p) return;
        app.setBrain({ kind: "vision", p: { ...p, [k]: v, ...(both ? { [both]: v } : {}) } }, "end");
      };
      tune.setExtra(
        "What they do with what they see",
        [
          { label: "Speed response", symbol: "α₀", min: 0, max: 0.5, step: 0.01, digits: 2, hint: "How strongly what a fish sees ahead slows it, and what it sees behind speeds it up.", get: () => vb()?.a0 ?? 0, set: setV("a0") },
          { label: "Turn response", symbol: "β₀", min: 0, max: 0.2, step: 0.005, digits: 3, hint: "How strongly what a fish sees on one side turns it away.", get: () => vb()?.b0 ?? 0, set: setV("b0") },
          {
            label: "Pull of edges",
            symbol: "α₁ = β₁",
            min: 0,
            max: 0.5,
            step: 0.01,
            digits: 2,
            hint: `How strongly a fish is drawn to the edges of what it sees. It settles about R/α₁ behind a fish ahead (${EYES_LEQ} body lengths at the start). At 0 the fish are only pushed apart: no schools form.`,
            get: () => vb()?.a1 ?? 0,
            set: setV("a1", "b1"),
          },
          { label: "Sight", symbol: "range", min: MIN_VISION_RANGE, max: 40, step: 1, unit: " BL", hint: "How far a fish sees through the water, in body lengths. Further, and more fish pull on each one.", get: () => vb()?.range ?? 15, set: setV("range") },
        ],
        true,
      );
    } else if (app.flock.brain?.kind === "species") {
      const sb = (): SpeciesParams | null => (app.flock.brain?.kind === "species" ? app.flock.brain.p : null);
      const setS = (k: "rCoh" | "speed" | "wSep" | "eta") => (v: number) => {
        const p = sb();
        if (!p) return;
        app.setBrain({ kind: "species", p: { ...p, [k]: v } }, "end");
      };
      tune.setExtra(
        "Every kind",
        [
          { label: "Reach", symbol: "r", min: 0.05, max: 0.18, step: 0.005, digits: 3, hint: "How far a fish senses the others (alignment 0.72 r, separation 0.3 r).", get: () => sb()?.rCoh ?? 0.105, set: setS("rCoh") },
          { label: "Top speed", symbol: "v_max", min: 0.003, max: 0.013, step: 0.0005, digits: 4, hint: "Distance per step before each kind's own speed factor (in the matrix's last row).", get: () => sb()?.speed ?? 0.0065, set: setS("speed") },
          { label: "Separation", symbol: "w_sep", min: 0, max: 3, step: 0.05, digits: 2, hint: "How strongly every fish keeps its distance from every other, whatever its kind.", get: () => sb()?.wSep ?? 1.6, set: setS("wSep") },
          { label: "Panic", symbol: "η", min: 0, max: 0.6, step: 0.01, digits: 2, hint: "Random turning, up to ±η·180° a step.", get: () => sb()?.eta ?? 0, set: setS("eta") },
        ],
        true,
      );
    } else tune.setExtra(null, [], false);
  };

  // ------------------------------------------------------------- Prove --
  const prove = buildProve(studio.drawer.prove, {
    adapter: gpu.adapterId,
    device,
    kernels,
    fluidKernels,
    ecoKernels,
    rule: () => app.flock.rule,
    brain: () => app.flock.brain,
    live: () => ({ n: app.flock.n, halfW: app.flock.halfW, halfH: app.flock.halfH, seed: app.seed }),
    liveSort: () => app.flock.sortSnapshot(),
    showProof: () => {
      void app.loadScene("proof").then(() => app.writeUrl());
    },
    hold: (on) => {
      governor.suspended = on || filming;
    },
  });
  const syncProve = (): void =>
    prove.setOnScreen({
      proofRun: app.onProofRun,
      brain: app.flock.brain?.kind ?? null,
      m2: app.scene.ecology ? "food-chain" : app.scene.water ? "current" : null,
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
        governor.suspended = filming;
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
      extraTune();
      if (scene.ecology) {
        if (!pop.el.isConnected) studio.stage.append(pop.el);
        pop.setSlots(app.flock.n, app.ecology?.sharkSlots ?? 1);
        pop.clear();
      } else pop.el.remove();
      if (scene.water) {
        if (!waterPanel.el.isConnected) studio.stage.append(waterPanel.el);
        waterPanel.clear();
      } else waterPanel.el.remove();
      dial.attach(scene.id === "order-dial");
      if (scene.id === "mill") {
        if (!regime.el.isConnected) studio.stage.append(regime.el);
        regime.clear();
      } else regime.el.remove();
      if (scene.id === "eyes-only") {
        if (!eyes.el.isConnected) studio.stage.append(eyes.el);
        eyes.clear();
      } else eyes.el.remove();
      if (scene.id === "species") {
        if (!matrix.el.isConnected) studio.stage.append(matrix.el);
        matrix.clearMix();
        if (app.flock.brain?.kind === "species") matrix.set(app.flock.brain.p, presetOf(app.flock.brain.p));
      } else matrix.el.remove();
      dial.sync();
      syncTune();
      syncProve();
    },
    onRule: (r) => {
      learn.setRule(r);
      syncTune();
      syncProve();
    },
    onBrain: (b) => {
      learn.setBrain(b);
      if (b?.kind === "species") matrix.set(b.p, presetOf(b.p));
      syncTune();
      // Tune's reset (or any change not made by the dial) moves the dial and restarts its measurement
      dial.brainChanged();
    },
    onRestore: () => {
      dial.sync();
      regime.clear();
      pop.clear();
      extraTune();
      app.writeUrl();
    },
    onCensus: (c, tick) => {
      pop.push(c, tick);
      if (app.learnOpen) learn.pushCensus(c);
    },
    onFluid: (st) => {
      waterPanel.set(st, app.flock.rule.maxSpeed);
      if (app.learnOpen && app.current) learn.pushFluid(st, app.flock.rule.maxSpeed, app.current.fluid.fb);
    },
    onEdited: () => syncProve(),
    onWatch: (w) => {
      const on = w.id !== null;
      studio.root.classList.toggle("is-watching", on);
      if (on && !watchPanel.el.isConnected) studio.stage.append(watchPanel.el);
      else if (!on) watchPanel.el.remove();
      if (on) {
        const b = app.flock.brain;
        const top = !b ? app.flock.rule.maxSpeed : b.kind === "vision" ? b.p.speed * b.p.dt : b.kind === "species" ? b.p.speed : b.p.speed;
        watchPanel.set(w, b, top, app.flock.n);
      }
    },
    onSample: (smp) => {
      const f = app.flock;
      const b = f.brain;
      if (b?.kind === "vision" && eyes.el.isConnected) {
        const n = f.n;
        const x = new Float32Array(n);
        const y = new Float32Array(n);
        const vx = new Float32Array(n);
        const vy = new Float32Array(n);
        for (let i = 0; i < n; i += 1) {
          x[i] = smp.boids[i * 6]!;
          y[i] = smp.boids[i * 6 + 1]!;
          vx[i] = smp.boids[i * 6 + 2]!;
          vy[i] = smp.boids[i * 6 + 3]!;
        }
        const st = schoolStats(x, y, vx, vy, n, f.halfW, f.halfH, 2 * EYES_LEQ * 2 * b.p.R, 5);
        eyes.setSchools(st, n);
        app.schoolOrder = st.schools > 0 ? st.order : null;
      } else if (b?.kind === "species" && matrix.el.isConnected) {
        const m = ownKindShare(smp.boids, f.n, b.p.count);
        matrix.setMix(m.share, m.fraction);
      }
    },
    onOrder: (o, tick) => {
      if (app.learnOpen) learn.pushOrder(o);
      if (app.scene.id === "eyes-only") eyes.pushPhi(o.phi);
      if (app.scene.id === "order-dial") dial.onOrder(o, tick);
      else if (app.scene.id === "mill") regime.push(o.phi, o.mill);
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
    const reachR = f.brain ? reach(f.brain) : f.rule.rCoh;
    learn.setStats([
      ["Ocean", `${(f.halfW * 2).toFixed(1)} × ${(f.halfH * 2).toFixed(1)} (wraps at the edges)`],
      ["Fish per unit²", (f.n / area).toFixed(f.n / area < 10 ? 3 : 0)],
      [f.brain?.kind === "couzin" ? "Fish within the attraction zone, if spread evenly" : "Neighbours within r, if spread evenly", ((f.n / area) * Math.PI * reachR * reachR).toFixed(1)],
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
  app.colourChoice = parsed.col === "scene" ? null : (parsed.col as FishColour);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // an M1 brain from the link (each value −1 = the scene's)
  let brain: BrainParams | undefined;
  if (scene.id === "order-dial") {
    brain = { kind: "vicsek", p: vicsekFor(pick(parsed.rho, DIAL_RHO), pick(parsed.eta, DIAL_ETA)) };
  } else if (scene.id === "mill") {
    const p = couzinFor(sceneCount(scene, tier));
    brain = {
      kind: "couzin",
      p: {
        ...p,
        ro: parsed.dro >= 0 ? p.rr + parsed.dro : p.ro,
        fovDeg: pick(parsed.fov, p.fovDeg),
        maxTurn: parsed.turn >= 0 ? (parsed.turn * Math.PI) / 180 : p.maxTurn,
        sigma: pick(parsed.sig, p.sigma),
      },
    };
  }
  if (scene.id === "eyes-only") {
    const d0 = visionFor();
    const [a0, b0, a1, range] = parsed.vis;
    brain = { kind: "vision", p: { ...d0, a0: pick(a0!, d0.a0), b0: pick(b0!, d0.b0), a1: pick(a1!, d0.a1), b1: pick(a1!, d0.b1), range: Math.max(MIN_VISION_RANGE, pick(range!, d0.range)) } };
  } else if (scene.id === "species") {
    const k = decodeKinds(parsed.kinds);
    if (k) brain = { kind: "species", p: k.p };
  }
  // M2 knobs from the link (each −1 = the scene's), built into the first load so the
  // water's starting vorticity comes from the linked push, exactly as a restart rebuilds it
  let water: SceneOptions["water"];
  if (scene.water) {
    const [dr, ma, pu, nu, mu] = parsed.wp;
    const p = scene.water.params;
    water = {
      params: { ...p, drag: pick(dr!, p.drag), massRatio: pick(ma!, p.massRatio), nu: pick(nu!, p.nu), mu: pick(mu!, p.mu) },
      tide: pu! >= 0 ? pu! * rule.maxSpeed : scene.water.tide,
    };
  }
  let eco: SceneOptions["eco"];
  if (scene.ecology) {
    const [gr, ef, sc, ss] = parsed.ep;
    const p = scene.ecology.params;
    eco = { ...p, growth: pick(gr!, p.growth), efficiency: pick(ef!, p.efficiency), sharkCost: pick(sc!, p.sharkCost), sharkSpeed: pick(ss!, p.sharkSpeed) };
  }
  const opts: SceneOptions = {
    water,
    eco,
    seed: parsed.seed,
    rule: scene.brain ? scene.rule : rule,
    brain,
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
    brain: app.flock.brain,
    regime: app.scene.id === "mill" ? regime.regime : null,
    dial: app.scene.id === "order-dial" ? { eta: dial.eta, rho: dial.rho, last: dial.last, sweeping: dial.sweeping, points: dial.panel.measurements.length } : null,
    census: app.census,
    schools: app.scene.id === "eyes-only" ? eyes.schools : null,
    watch: app.watch.id !== null ? { id: app.watch.id, follow: app.watch.follow, found: !!app.watch.rec?.found, lost: app.watch.lost, total: app.watch.rec?.total ?? 0, retina: !!app.watch.retina } : null,
    species: app.flock.brain?.kind === "species" ? { count: app.flock.brain.p.count, preset: presetOf(app.flock.brain.p) } : null,
    fluid: app.current ? { grid: [app.current.fluid.gw, app.current.fluid.gh], motes: app.current.fluid.nMotes, fb: app.current.fluid.fb, stats: app.fluidStats } : null,
  });
  (globalThis as { __swarmDial?: DialController }).__swarmDial = dial;
  (globalThis as { __swarm?: App }).__swarm = app;
  (globalThis as { __swarmProve?: typeof prove }).__swarmProve = prove;
  // measurement hooks (acceptance, budgets): the M3 checks with other seeds
  (globalThis as { __swarmM3?: unknown }).__swarmM3 = {
    field: (o?: { seed?: number; warm?: number }) => fieldCheck(device, kernels, o),
    order: (o?: { gpuSeeds?: number[]; cpuSeeds?: number[] }) => orderCheck(device, kernels, o),
    mixing: (o?: { seed?: number }) => mixingCheck(device, kernels, o),
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
