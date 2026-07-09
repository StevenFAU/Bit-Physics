// phase-field-fracture — Stack-B web app entry (four-layer INTERACT /
// EXPLAIN / PROVE / RENDER, spec-ref § 5). The canvas is the usable sim on
// load; the verification layer is one click away. First verified,
// interactive, in-browser energy-variational fracture sim (§ 14 — scoped
// claim; geometric browser demos and offline CD-MPM cited in EXPLAIN).

import "../../../../common/common-web/src/theme.css";
import {
  exposeCapture,
  isCapturing,
  resetCapture,
  runCaptureExclusive,
} from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { DiagnosticRow } from "../../../../common/common-web/src/panel-shell.js";
import { makeBundle, runGateScene } from "./capture.js";
import { installExplainPanel } from "./explain.js";
import V from "./generated/verification.json";
import {
  FORCE_UNIT_N,
  K_RES,
  fractureConfig,
  loadingSchedule,
} from "./pff64.mjs";
import { LAYER, Renderer } from "./renderer.js";
import type { SceneSpec } from "./scenes.js";
import { SCENES, sceneByKey } from "./scenes.js";
import { FractureGpu } from "./solver.js";
import { installVerifyPanel } from "./verify-panel.js";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const boot = document.getElementById("boot") as HTMLDivElement;
const hud = document.getElementById("hud") as HTMLCanvasElement;
const setBoot = (m: string): void => {
  boot.textContent = m;
  boot.style.display = m ? "block" : "none";
};

type Cfg = ReturnType<typeof fractureConfig>;

interface AppState {
  device: GPUDevice;
  renderer: Renderer;
  gpu: FractureGpu;
  scene: SceneSpec;
  cfg: Cfg;
  sched: { uTop: Float64Array; vTop: Float64Array };
  rateMult: number;
  mobility: number;
  running: boolean;
  done: boolean;
  nanPaused: boolean;
  stepsPerFrame: number;
  brushKind: number; // 0 off/pan, 1 hole, 2 stiff, 3 soft, 4 tough, 5 erase
  brushR: number;
  peak: { f: number; u: number };
  curve: Array<[number, number]>; // (u, F)
  energy: { ke: number; ie: number; efrac: number };
  frameMs: number;
  stepsPerSec: number;
}

async function boot_(): Promise<void> {
  if (!navigator.gpu) {
    setBoot("WebGPU unavailable — this demo needs a WebGPU browser (Chrome 113+).");
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    setBoot("no WebGPU adapter");
    return;
  }
  const device = await adapter.requestDevice();
  device.addEventListener("uncapturederror", (e) => {
    console.error("WebGPU uncaptured error:", (e as GPUUncapturedErrorEvent).error.message);
  });
  void device.lost.then((info) => {
    console.error(
      `DEVICE LOST at t=${performance.now().toFixed(0)}ms reason=${info.reason} msg=${info.message}`,
    );
    setBoot(`GPU device lost (${info.reason}): reload the page`);
  });

  const renderer = new Renderer(device, canvas);
  const state = makeState(device, renderer, SCENES[0]);
  installUi(state);
  installExplainPanel();
  const verify = installVerifyPanel({
    device,
    exclusive: (fn) => runCaptureExclusive(fn),
  });
  void verify;
  setBoot("");
  requestAnimationFrame(() => frame(state));
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

function makeState(device: GPUDevice, renderer: Renderer, scene: SceneSpec): AppState {
  const cfg = fractureConfig({
    n: scene.n,
    uEnd: scene.uEnd,
    vloadFrac: 1e-4 * scene.rateMult,
  });
  const gpu = new FractureGpu(
    device,
    {
      n: cfg.n, h: cfg.h, dt: cfg.dt, lam: cfg.lam, mu: cfg.mu,
      cDamp: cfg.cDamp, mobility: cfg.mobilityM, kRes: K_RES,
    },
    scene.material(scene.n),
  );
  return {
    device,
    renderer,
    gpu,
    scene,
    cfg,
    sched: loadingSchedule(cfg),
    rateMult: scene.rateMult,
    mobility: 1.0,
    running: true,
    done: false,
    nanPaused: false,
    stepsPerFrame: 40,
    brushKind: 0,
    brushR: 6,
    peak: { f: -Infinity, u: 0 },
    curve: [],
    energy: { ke: 0, ie: 1e-30, efrac: 0 },
    frameMs: 0,
    stepsPerSec: 0,
  };
}

let panelRef: ReturnType<typeof createSettingsPanel> | null = null;

function loadScene(state: AppState, scene: SceneSpec, rateMult?: number, mobility?: number): void {
  state.scene = scene;
  state.rateMult = rateMult ?? scene.rateMult;
  state.mobility = mobility ?? state.mobility;
  const cfg = fractureConfig({
    n: scene.n,
    uEnd: scene.uEnd,
    vloadFrac: 1e-4 * state.rateMult,
  });
  if (cfg.n !== state.gpu.n) {
    state.gpu.destroy();
    state.gpu = new FractureGpu(
      state.device,
      {
        n: cfg.n, h: cfg.h, dt: cfg.dt, lam: cfg.lam, mu: cfg.mu,
        cDamp: cfg.cDamp, mobility: state.mobility, kRes: K_RES,
      },
      scene.material(scene.n),
    );
  } else {
    state.gpu.params = {
      n: cfg.n, h: cfg.h, dt: cfg.dt, lam: cfg.lam, mu: cfg.mu,
      cDamp: cfg.cDamp, mobility: state.mobility, kRes: K_RES,
    };
    state.gpu.reset(scene.material(scene.n));
    state.gpu.writeUniforms();
  }
  state.cfg = cfg;
  state.sched = loadingSchedule(cfg);
  state.running = true;
  state.done = false;
  state.nanPaused = false;
  state.peak = { f: -Infinity, u: 0 };
  state.curve = [];
  state.renderer.invalidate();
}

function drawHud(state: AppState): void {
  const g = hud.getContext("2d");
  if (!g) return;
  const W = hud.width;
  const H = hud.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#0a1017";
  g.fillRect(0, 0, W, H);
  // F-delta sparkline
  const uMax = Math.abs(state.cfg.uEnd);
  const fRef = V.reference_bin.peak_reaction * 1.2;
  g.strokeStyle = "#24313f";
  g.strokeRect(36, 8, W - 200, H - 26);
  g.strokeStyle = "#7fdc9a";
  g.beginPath();
  state.curve.forEach(([u, f], i) => {
    const x = 36 + (Math.abs(u) / uMax) * (W - 200);
    const y = H - 18 - (Math.max(f * Math.sign(state.cfg.uEnd), 0) / fRef) * (H - 30);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.stroke();
  g.fillStyle = "#8fa8bd";
  g.font = "10px ui-monospace, monospace";
  g.fillText("F–δ (live)", 40, 16);
  const peakN = state.peak.f > 0 ? (state.peak.f * FORCE_UNIT_N).toFixed(0) : "—";
  g.fillText(`peak ${peakN} N`, 40, H - 6);
  // KE/IE gauge (the § 3.6 quasi-static discipline, visible)
  const ratio = state.energy.ke / Math.max(state.energy.ie, 1e-12);
  const gx = W - 150;
  g.fillText("KE/IE (quasi-static ≤ 5 %)", gx, 16);
  g.strokeStyle = "#24313f";
  g.strokeRect(gx, 22, 130, 12);
  const frac = Math.min(ratio / 0.25, 1);
  g.fillStyle = ratio <= 0.05 ? "#7fdc9a" : "#f5a09f";
  g.fillRect(gx + 1, 23, 128 * frac, 10);
  g.fillStyle = "#8fa8bd";
  g.fillText(ratio < 1e-4 ? "<0.01 %" : `${(ratio * 100).toFixed(2)} %`, gx, 48);
  g.fillText(`E_frac ${state.energy.efrac.toFixed(1)} ℓ·Gc`, gx, 62);
  g.fillText(`${state.stepsPerSec.toFixed(0)} steps/s`, gx, 76);
}


// Readbacks are ARMED only after the GPU pipeline demonstrably settled: a
// mapAsync issued during the page-boot window aborts on Chromium/Vulkan
// ("A valid external Instance reference no longer exists") and permanently
// poisons that staging buffer's mapping. The gate capture never hits this
// (it starts from a user/driver click, long after boot); the RAF loop must
// wait for a few presented frames + onSubmittedWorkDone before its first
// diagnostics read.
let framesSeen = 0;
let readbacksArmed = false;
let arming = false;

async function frame(state: AppState): Promise<void> {
  try {
    framesSeen++;
    if (!readbacksArmed && !arming && framesSeen > 8) {
      arming = true;
      void state.device.queue.onSubmittedWorkDone().then(() => {
        readbacksArmed = true;
      });
    }
    await frameBody(state);
  } catch (e) {
    console.error("frame error:", e);
  }
  requestAnimationFrame(() => void frame(state));
}

async function frameBody(state: AppState): Promise<void> {
  const t0 = performance.now();
  const { gpu, cfg } = state;
  if (state.running && !state.nanPaused && !isCapturing()) {
    // adaptive substeps to ~10 ms of GPU work
    const start = gpu.stepIndex + 1;
    const remaining = cfg.stepCount - gpu.stepIndex;
    const count = Math.max(0, Math.min(state.stepsPerFrame, remaining));
    if (count > 0) {
      gpu.fillRing(state.sched.uTop, state.sched.vTop, start, count);
      const enc = state.device.createCommandEncoder();
      for (let i = start; i < start + count; i++) gpu.encodeSubstep(enc, i);
      // persistent labels: full re-seed at load then periodic refresh
      gpu.encodeLabels(enc, 24, framesSeen % 180 === 1 || framesSeen < 3);
      gpu.encodeReduce(enc, "cells");
      state.device.queue.submit([enc.finish()]);
      if (readbacksArmed) {
        const cells = await gpu.readPartials(gpu.n * gpu.n);
        const enc2 = state.device.createCommandEncoder();
        gpu.encodeReduce(enc2, "nodes");
        state.device.queue.submit([enc2.finish()]);
        const nodes = await gpu.readPartials(gpu.nNodes * gpu.nNodes);
        const reaction = await gpu.readReaction();
        state.energy = {
          ke: 0.5 * nodes.a * cfg.h * cfg.h,
          ie: cells.a,
          efrac: cells.b,
        };
        const u = state.sched.uTop[gpu.stepIndex] ?? 0;
        state.curve.push([u, reaction * Math.sign(cfg.uEnd || 1)]);
        if (state.curve.length > 2000) state.curve.splice(0, state.curve.length - 2000);
        const fSigned = reaction * Math.sign(cfg.uEnd || 1);
        if (fSigned > state.peak.f) state.peak = { f: fSigned, u: Math.abs(u) };
        if (cells.nan || nodes.nan) {
          state.nanPaused = true;
          panelRef?.setStatus("NaN detected — solver paused; reset the scene");
        }
      }
      // adapt substeps to frame budget
      if (state.frameMs > 24 && state.stepsPerFrame > 10) {
        state.stepsPerFrame = Math.floor(state.stepsPerFrame * 0.8);
      } else if (state.frameMs < 12 && state.stepsPerFrame < 120) {
        state.stepsPerFrame = Math.ceil(state.stepsPerFrame * 1.2);
      }
      state.stepsPerSec = count / Math.max(state.frameMs / 1000, 1e-3);
      if (gpu.stepIndex >= cfg.stepCount) {
        state.done = true;
        state.running = false;
        panelRef?.setStatus(
          `loading protocol complete — peak ${(state.peak.f * FORCE_UNIT_N).toFixed(0)} N; reset or pick a preset`,
        );
      }
    }
  }
  state.renderer.render(gpu, cfg.lam, cfg.mu, cfg.h);
  drawHud(state);
  refreshDiagnostics(state);
  state.frameMs = performance.now() - t0;
}

let diagTick = 0;
function refreshDiagnostics(state: AppState): void {
  if (!panelRef || diagTick++ % 20 !== 0) return;
  const ratio = state.energy.ke / Math.max(state.energy.ie, 1e-12);
  const rows: DiagnosticRow[] = [
    {
      label: "peak reaction",
      value:
        state.peak.f > 0
          ? `${(state.peak.f * FORCE_UNIT_N).toFixed(1)} N (${((state.peak.f * FORCE_UNIT_N) / 1000).toFixed(4)} kN)`
          : "—",
    },
    { label: "KE/IE", value: `${(ratio * 100).toFixed(3)} %` },
    { label: "crack energy (≈ length·Gc)", value: `${state.energy.efrac.toFixed(2)} ℓ·Gc` },
    { label: "substep", value: `${state.gpu.stepIndex} / ${state.cfg.stepCount}` },
    { label: "throughput", value: `${state.stepsPerSec.toFixed(0)} CFL steps/s` },
  ];
  panelRef.setDiagnostics(rows);
}

function installUi(state: AppState): void {
  const panel = createSettingsPanel(
    "Phase-Field Fracture — verified crack lab",
    {
      caption:
        "Cracks that nucleate, curve, and branch as the solution of an energy minimization — " +
        "gated live against an f64 reference and the published SENT peak.",
      onCapture: async () => {
        resetCapture();
        await runCaptureExclusive(async () => {
          panel.setStatus("gate capture running (sent-void-96sq-m1)…");
          const t0 = performance.now();
          const run = await runGateScene(state.device, (done, total) => {
            panel.setStatus(`gate capture… ${done}/${total}`);
          });
          exposeCapture(makeBundle(run, 42, (performance.now() - t0) / 1000));
          panel.setStatus(`capture ready — sha ${run.trajectorySha.slice(0, 12)}…`);
        });
      },
      presets: SCENES.map((s) => ({
        label: s.label,
        title: s.title,
        apply: () => {
          loadScene(state, s);
          panel.setActivePreset(s.label);
          panel.setStatus(s.blurb);
        },
      })),
      study: {
        diagnostics: [],
        honesty: {
          faithful:
            "AT2 variational damage + hybrid explicit elastodynamics (Q1 2×2 Gauss, velocity-Verlet), " +
            "Miehe strain-spectral driving force, KE/IE-disciplined quasi-static loading, " +
            "non-dimensionalized Miehe steel groups",
          simplified:
            "three disclosures (EXPLAIN, § 1.1): no-criterion framing refuted; hybrid+history " +
            "variationally inconsistent (Gerasimov–De Lorenzis 2019); finite-mobility gradient-flow " +
            "damage ⇒ Γ(v) rate toughness — measured 0.35 % peak shift vs converged-elliptic f64",
          measured: `gate budget ${V.tolerance.relative} (${V.tolerance.measured_basis})`,
        },
        verdict: {
          gate: `new_canonical ${V.gate.descriptor}: pre-burst pointwise ≤ ${V.tolerance.relative}×max|field| + peak/E_frac/IoU observables + run-twice byte-identity`,
          verdict: "PASS (CI)",
          pass: true,
        },
        links: [
          {
            label: "spec-ref (v0.2)",
            href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/fracture/phase-field-fracture/spec-ref.md",
          },
        ],
      },
    },
  );
  panelRef = panel;

  // brush + loading controls
  const group = panel.addGroup("brush + loading");
  const mkRow = (label: string, el: HTMLElement): void => {
    const row = document.createElement("div");
    row.className = "pf-ctl";
    const lab = document.createElement("span");
    lab.textContent = label;
    lab.style.minWidth = "110px";
    row.appendChild(lab);
    row.appendChild(el);
    group.appendChild(row);
  };
  const brushSel = document.createElement("select");
  for (const [v, name] of [
    ["0", "pan / off"], ["1", "hole"], ["2", "stiff ×4"], ["3", "soft ×¼"],
    ["4", "tough Gc×4"], ["5", "erase"],
  ]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = name;
    brushSel.appendChild(o);
  }
  brushSel.onchange = () => (state.brushKind = Number(brushSel.value));
  mkRow("obstacle brush", brushSel);

  const radius = document.createElement("input");
  radius.type = "range";
  radius.min = "2";
  radius.max = "20";
  radius.value = String(state.brushR);
  radius.oninput = () => (state.brushR = Number(radius.value));
  mkRow("brush radius", radius);

  const rate = document.createElement("input");
  rate.type = "range";
  rate.min = "-1";
  rate.max = "1.3";
  rate.step = "0.05";
  rate.value = "0";
  rate.oninput = () => {
    const mult = state.scene.rateMult * Math.pow(10, Number(rate.value));
    loadScene(state, state.scene, mult, state.mobility);
    panel.setStatus(
      `loading rate ×${Math.pow(10, Number(rate.value)).toFixed(2)} — watch the KE/IE gauge`,
    );
  };
  mkRow("loading rate", rate);

  const mob = document.createElement("input");
  mob.type = "range";
  mob.min = "-1.5";
  mob.max = "1.5";
  mob.step = "0.1";
  mob.value = "0";
  mob.oninput = () => {
    state.mobility = Math.pow(10, Number(mob.value));
    state.gpu.params.mobility = state.mobility;
    state.gpu.writeUniforms();
    panel.setStatus(
      `mobility m = χ·dt = ${state.mobility.toFixed(2)} (expert: Γ(v) disclosure lens — measured band m ∈ [0.03, 30] moves the SENT peak 0.47 %)`,
    );
  };
  mkRow("mobility m (Γ(v) lens)", mob);

  const pause = document.createElement("button");
  pause.textContent = "pause / resume";
  pause.onclick = () => {
    if (state.done) loadScene(state, state.scene, state.rateMult, state.mobility);
    else state.running = !state.running;
  };
  const reset = document.createElement("button");
  reset.textContent = "reset scene";
  reset.onclick = () => loadScene(state, state.scene, state.rateMult, state.mobility);
  const btnRow = document.createElement("div");
  btnRow.className = "pf-ctl";
  btnRow.appendChild(pause);
  btnRow.appendChild(reset);
  group.appendChild(btnRow);

  // render layer toggles
  const layers = panel.addGroup("render layers");
  for (const [name, bit] of Object.entries(LAYER)) {
    const lab = document.createElement("label");
    lab.className = "pf-ctl";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = (state.renderer.layers & bit) !== 0;
    cb.onchange = () => {
      state.renderer.layers = cb.checked
        ? state.renderer.layers | bit
        : state.renderer.layers & ~bit;
    };
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(` ${name}`));
    layers.appendChild(lab);
  }

  // pointer painting
  let painting = false;
  const paint = (ev: PointerEvent): void => {
    if (state.brushKind === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * state.gpu.n;
    const y = (1 - (ev.clientY - rect.top) / rect.height) * state.gpu.n;
    state.gpu.paintAt(x, y, state.brushR, state.brushKind);
  };
  canvas.addEventListener("pointerdown", (ev) => {
    painting = true;
    paint(ev);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (painting) paint(ev);
  });
  globalThis.addEventListener("pointerup", () => (painting = false));

  panel.setActivePreset(SCENES[0].label);
}

// ?preset= boot param (poster/loop generator contract)
const params = new URLSearchParams(location.search);
const presetKey = params.get("preset");
if (presetKey) {
  const s = SCENES.find((x) => x.key === presetKey);
  if (s) SCENES.unshift(...SCENES.splice(SCENES.indexOf(s), 1));
}
void sceneByKey; // re-exported utility kept for tests/tools

void boot_().catch((e) => setBoot(`init failed: ${String(e)}`));
