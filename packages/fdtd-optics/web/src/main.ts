// fdtd-optics — Stack-B web app entry (four-layer RENDER / INTERACT /
// EXPLAIN / PROVE, spec-ref § 5). Maxwell's curl equations on a Yee grid,
// stepped live on the user's GPU; the deploy gate re-runs in the PROVE
// panel against the committed f64 reference AND textbook optics.

import "../../../../common/common-web/src/theme.css";
import {
  exposeCapture,
  isCapturing,
  resetCapture,
} from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { runFullCapture } from "./capture.js";
import { installExplainPanel } from "./explain.js";
import { ricker } from "./fdtd64.mjs";
import type { RenderState } from "./renderer.js";
import { LAYER, Renderer } from "./renderer.js";
import type { Emitter, SceneSpec } from "./scenes.js";
import { SCENES, omegaOf, sceneByKey } from "./scenes.js";
import type { PointSource, SubstepU } from "./solver.js";
import { FdtdGpu, buildPmlRows, vacuumMaterials } from "./solver.js";
import { installVerifyPanel } from "./verify-panel.js";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const boot = document.getElementById("boot") as HTMLDivElement;
const setBoot = (m: string): void => {
  boot.textContent = m;
  boot.style.display = m ? "block" : "none";
};

type BrushKind = "off" | "glass" | "dense" | "metal" | "gold" | "kerr" | "erase";
type Tool = "drag" | "paint" | "probe";

interface AppState {
  device: GPUDevice;
  renderer: Renderer;
  gpu: FdtdGpu;
  scene: SceneSpec;
  emitters: Emitter[];
  lambda: number;
  phaseStepDeg: number;
  substeps: number;
  running: boolean;
  nanPaused: boolean;
  stepCount: number;
  dftW: number;
  frame: number;
  layers: number;
  exposure: number;
  tracersOn: boolean;
  tool: Tool;
  brush: BrushKind;
  brushRadius: number;
  painting: boolean;
  dragSrc: number; // -1 = none
  probeCell: { i: number; j: number } | null;
  probeArmed: boolean;
  lastReadback: number;
}

function brushMats(kind: BrushKind, omega: number): {
  mat: [number, number, number, number];
  mat2: [number, number];
} | null {
  switch (kind) {
    case "glass":
      return { mat: [2.25, 0, 0, 0], mat2: [0, 0] };
    case "dense":
      return { mat: [4.0, 0, 0, 0], mat2: [0, 0] };
    case "metal":
      return { mat: [1, 0, 0, 0], mat2: [0, 1] };
    case "gold":
      return { mat: [1, 0, 2.2 * omega, 0.002], mat2: [0, 0] };
    case "kerr":
      return { mat: [1, 0, 0, 0], mat2: [0.35, 0] };
    case "erase":
      return { mat: [1, 0, 0, 0], mat2: [0, 0] };
    default:
      return null;
  }
}

/** CW value with a smooth turn-on ramp (spec § 3.5: never a hard turn-on). */
function emitterValue(em: Emitter, t: number): number {
  if (em.kind === "ricker") return em.amp * ricker(t, em.t0 ?? 90, em.tau ?? 22);
  const ramp = Math.min(t / 180, 1);
  return em.amp * ramp * ramp * Math.sin(em.omega * t + em.phase);
}

async function start(): Promise<void> {
  setBoot("initializing WebGPU…");
  if (!navigator.gpu) {
    setBoot("WebGPU unavailable in this browser.");
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    setBoot("WebGPU adapter unavailable.");
    return;
  }
  const device = await adapter.requestDevice();
  device.addEventListener("uncapturederror", (ev) => {
    // the pic-flip lesson: surface validation errors loudly, never silently
    console.error("WebGPU uncaptured error:", (ev as GPUUncapturedErrorEvent).error.message);
    setBoot(`GPU error: ${(ev as GPUUncapturedErrorEvent).error.message}`);
  });
  const ctx = canvas.getContext("webgpu");
  if (!ctx) {
    setBoot("no webgpu canvas context");
    return;
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });

  const renderer = new Renderer(device, format);

  const params = new URLSearchParams(window.location.search);
  const bootScene = sceneByKey(params.get("preset") ?? "double-slit");

  const st: AppState = {
    device,
    renderer,
    gpu: null as unknown as FdtdGpu,
    scene: bootScene,
    emitters: [],
    lambda: 24,
    phaseStepDeg: 0,
    substeps: 10,
    running: true,
    nanPaused: false,
    stepCount: 0,
    dftW: 0,
    frame: 0,
    layers: 0,
    exposure: 1,
    tracersOn: false,
    tool: "drag",
    brush: "glass",
    brushRadius: 6,
    painting: false,
    dragSrc: -1,
    probeCell: null,
    probeArmed: false,
    lastReadback: 0,
  };
  let pendingBrush: SubstepU["brush"] | undefined;
  let probeTrace: Float32Array | null = null;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.92;
    const aspect = st.gpu ? st.gpu.ny / st.gpu.nx : 1;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size * aspect}px`;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * aspect * dpr);
  };

  function loadScene(spec: SceneSpec): void {
    if (st.gpu) st.gpu.destroy();
    st.gpu = null as unknown as FdtdGpu;
    st.scene = spec;
    st.emitters = spec.emitters.map((e) => ({ ...e }));
    st.lambda = spec.displayOmega > 0 ? (2 * Math.PI * 0.5) / spec.displayOmega : 24;
    st.phaseStepDeg = spec.phaseStepDeg ?? 0;
    st.substeps = spec.substeps;
    st.layers = spec.layers;
    st.exposure = spec.exposure;
    st.tracersOn = spec.tracers;
    st.stepCount = 0;
    st.dftW = 0;
    st.nanPaused = false;
    st.probeCell = null;
    probeTrace = null;
    const gpu = new FdtdGpu(
      device,
      {
        nx: spec.nx,
        ny: spec.ny,
        sc: 0.5,
        periodicY: spec.periodicY,
        tfsf: spec.tfsf,
        monitor: null,
        probeIdx: 0,
      },
      buildPmlRows(spec.nx, spec.ny, 0.5, spec.pml),
    );
    const { mat, mat2 } = vacuumMaterials(spec.nx, spec.ny);
    spec.paint?.(mat, mat2, spec.nx, spec.ny);
    gpu.uploadMaterials(mat, mat2);
    gpu.resetState();
    st.gpu = gpu;
    if (st.phaseStepDeg !== 0) applyPhaseStep();
    renderer.attach(gpu);
    resize();
    hideNan();
    syncSceneControls();
  }

  function applyPhaseStep(): void {
    const d = (st.phaseStepDeg * Math.PI) / 180;
    st.emitters.forEach((e, k) => {
      e.phase = d * k;
    });
    resetPhasors();
  }

  function resetPhasors(): void {
    st.gpu?.resetAccumulators();
    st.dftW = 0;
  }

  function setLambda(lambda: number): void {
    st.lambda = lambda;
    const w = omegaOf(lambda);
    for (const e of st.emitters) if (e.kind === "cw") e.omega = w;
    if (st.scene.planeWave && st.scene.planeWave.kind === "cw") st.scene.planeWave.omega = w;
    resetPhasors();
  }

  // ------------------------------------------------------------- NaN guard
  const nanBox = document.createElement("div");
  nanBox.className = "fo-nan";
  nanBox.style.display = "none";
  nanBox.innerHTML =
    "<b>The field blew up (NaN).</b> This is the honest failure mode of an " +
    "explicit FDTD pushed past stability — a CFL violation or a Kerr " +
    "self-focusing collapse (spec § 3.3 / § 8.6), not a rendering glitch. ";
  const nanBtn = document.createElement("button");
  nanBtn.textContent = "reset scene";
  nanBtn.addEventListener("click", () => loadScene(st.scene));
  nanBox.appendChild(nanBtn);
  document.body.appendChild(nanBox);
  const hideNan = (): void => {
    nanBox.style.display = "none";
  };

  // ---------------------------------------------------------------- panel
  const panel = createSettingsPanel("fdtd-optics — Maxwell, verified live", {
    caption:
      "Yee-grid FDTD: light as the solution of Maxwell's curl equations, " +
      "with Fresnel / Mie analytic gates re-run on your GPU.",
    // NOTE: the panel shell already wraps onCapture in runCaptureExclusive
    // (common-web panel-shell.ts:326) — wrapping again would release the
    // live-loop lock early, so the capture body runs bare here.
    onCapture: async () => {
      panel.setStatus("capturing (gate + Fresnel + Mie)…");
      try {
        resetCapture();
        const full = await runFullCapture(device, panel.getState().seed);
        exposeCapture(full.bundle);
        panel.setStatus(
          `gate done — matched ${full.gate.worstMatchedRel.toExponential(1)}, ` +
            `Fresnel R=${full.fresnel.rMeasured.toFixed(5)}, ` +
            `Mie Q(x=3) ${full.mie.qMeasured[0].toFixed(3)}/${full.mie.qGolden[0].toFixed(3)}`,
        );
      } catch (e) {
        panel.setStatus(`capture failed: ${String(e)}`);
        throw e;
      }
    },
    presets: SCENES.map((s) => ({
      label: s.key,
      title: s.blurb,
      apply: () => {
        panel.setActivePreset(s.key);
        const url = new URL(window.location.href);
        url.searchParams.set("preset", s.key);
        window.history.replaceState(null, "", url.toString());
        loadScene(s);
      },
    })),
    modes: {
      onMode: (m) => {
        st.running = m === "play";
      },
    },
    study: {
      honesty: {
        faithful:
          "Maxwell's two curl equations, leapfrogged on a Yee grid in normalized units; " +
          "materials: dielectric, conductive loss, PEC, Drude (ADE), Kerr χ³ (Padé).",
        simplified:
          "2D single-polarization (TMz ↔ p-pol); f32 visualizer accuracy, " +
          "disclaimed beyond ~10⁷ dynamic range; PML fails on periodic/backward-wave media.",
        measured: "gate + Fresnel + Mie measured on this GPU via the capture button.",
      },
      verdict: { gate: "new_canonical + analytic (Fresnel/Mie)", verdict: "not yet run", pass: false },
    },
  });

  // scene controls
  const gScene = panel.addGroup("scene");
  const mkRow = (parent: HTMLElement, label: string): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "fo-ctl";
    const l = document.createElement("span");
    l.className = "fo-lab";
    l.textContent = label;
    row.appendChild(l);
    parent.appendChild(row);
    return row;
  };
  const mkSlider = (
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (v: number) => void,
  ): { input: HTMLInputElement; readout: HTMLSpanElement } => {
    const row = mkRow(parent, label);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const readout = document.createElement("span");
    readout.className = "fo-readout";
    readout.textContent = String(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      readout.textContent = input.value;
      onInput(v);
    });
    row.append(input, readout);
    return { input, readout };
  };

  const lambdaCtl = mkSlider(gScene, "wavelength λ (cells)", 14, 60, 1, st.lambda, (v) =>
    setLambda(v),
  );
  const phaseCtl = mkSlider(gScene, "array phase step (°)", -170, 170, 5, 0, (v) => {
    st.phaseStepDeg = v;
    applyPhaseStep();
  });
  const substepCtl = mkSlider(gScene, "substeps / frame", 1, 40, 1, st.substeps, (v) => {
    st.substeps = v;
  });
  mkSlider(gScene, "exposure", 0.2, 3, 0.05, 1, (v) => {
    st.exposure = v;
  });

  function syncSceneControls(): void {
    lambdaCtl.input.min = String(st.scene.lambdaMin ?? 14);
    lambdaCtl.input.max = String(st.scene.lambdaMax ?? 60);
    lambdaCtl.input.value = String(Math.round(st.lambda));
    lambdaCtl.readout.textContent = lambdaCtl.input.value;
    phaseCtl.input.value = String(st.phaseStepDeg);
    phaseCtl.readout.textContent = phaseCtl.input.value;
    substepCtl.input.value = String(st.substeps);
    substepCtl.readout.textContent = substepCtl.input.value;
  }

  // interact tools
  const gTool = panel.addGroup("interact");
  const toolRow = mkRow(gTool, "tool");
  for (const t of ["drag", "paint", "probe"] as const) {
    const b = document.createElement("button");
    b.textContent = t;
    b.addEventListener("click", () => {
      st.tool = t;
      for (const c of Array.from(toolRow.querySelectorAll("button")))
        c.classList.toggle("fo-active", c === b);
    });
    if (t === "drag") b.classList.add("fo-active");
    toolRow.appendChild(b);
  }
  const brushRow = mkRow(gTool, "brush");
  const brushSel = document.createElement("select");
  for (const k of ["glass", "dense", "metal", "gold", "kerr", "erase"]) {
    const o = document.createElement("option");
    o.value = k;
    o.textContent = k;
    brushSel.appendChild(o);
  }
  brushSel.addEventListener("change", () => {
    st.brush = brushSel.value as BrushKind;
  });
  brushRow.appendChild(brushSel);
  mkSlider(gTool, "brush radius", 2, 24, 1, st.brushRadius, (v) => {
    st.brushRadius = v;
  });

  // render layers
  const gRender = panel.addGroup("render layers");
  const layerDefs: Array<[string, number]> = [
    ["signed field", LAYER.field],
    ["domain coloring", LAYER.domain],
    ["time-avg power", LAYER.energy],
    ["isophase fronts", LAYER.isophase],
    ["schlieren", LAYER.schlieren],
    ["envelope", LAYER.envelope],
    ["materials", LAYER.underlay],
    ["PML shade", LAYER.pml],
    ["sources", LAYER.sources],
  ];
  const layerBoxes: Array<[HTMLInputElement, number]> = [];
  for (const [label, bit] of layerDefs) {
    const row = mkRow(gRender, label);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", () => {
      if (cb.checked) st.layers |= bit;
      else st.layers &= ~bit;
      // field / domain / power are exclusive primaries
      if (cb.checked && (bit === LAYER.domain || bit === LAYER.energy || bit === LAYER.field)) {
        for (const [other, obit] of layerBoxes) {
          if (
            obit !== bit &&
            (obit === LAYER.domain || obit === LAYER.energy || obit === LAYER.field)
          ) {
            other.checked = false;
            st.layers &= ~obit;
          }
        }
      }
    });
    layerBoxes.push([cb, bit]);
    row.appendChild(cb);
  }
  const tracerRow = mkRow(gRender, "photon tracers");
  const tracerCb = document.createElement("input");
  tracerCb.type = "checkbox";
  tracerCb.addEventListener("change", () => {
    st.tracersOn = tracerCb.checked;
  });
  tracerRow.appendChild(tracerCb);

  function syncLayerBoxes(): void {
    for (const [cb, bit] of layerBoxes) cb.checked = (st.layers & bit) !== 0;
    tracerCb.checked = st.tracersOn;
  }

  // probe sparkline
  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = 260;
  probeCanvas.height = 64;
  probeCanvas.className = "fo-probe";
  panel.addGroup("probe Ez(t)").appendChild(probeCanvas);

  // ---------------------------------------------------------- interaction
  const cellFromEvent = (ev: PointerEvent): { i: number; j: number } => {
    const r = canvas.getBoundingClientRect();
    const i = Math.floor(((ev.clientX - r.left) / r.width) * st.gpu.nx);
    const j = Math.floor(((ev.clientY - r.top) / r.height) * st.gpu.ny);
    return {
      i: Math.max(1, Math.min(st.gpu.nx - 2, i)),
      j: Math.max(1, Math.min(st.gpu.ny - 2, j)),
    };
  };
  canvas.addEventListener("pointerdown", (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    const c = cellFromEvent(ev);
    if (st.tool === "probe") {
      st.probeCell = c;
      st.probeArmed = true;
      return;
    }
    if (st.tool === "drag") {
      let best = -1;
      let bestD = 144;
      st.emitters.forEach((e, k) => {
        const d = (e.i - c.i) ** 2 + (e.j - c.j) ** 2;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      if (best >= 0) st.dragSrc = best;
      return;
    }
    st.painting = true;
    queueBrush(c);
  });
  canvas.addEventListener("pointermove", (ev) => {
    const c = cellFromEvent(ev);
    if (st.dragSrc >= 0) {
      st.emitters[st.dragSrc].i = c.i;
      st.emitters[st.dragSrc].j = c.j;
      resetPhasors();
    } else if (st.painting) {
      queueBrush(c);
    }
  });
  const endPointer = (): void => {
    st.dragSrc = -1;
    st.painting = false;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  function queueBrush(c: { i: number; j: number }): void {
    const bm = brushMats(st.brush, omegaOf(st.lambda));
    if (!bm) return;
    pendingBrush = {
      x: c.i,
      y: c.j,
      r2: st.brushRadius * st.brushRadius,
      mat: bm.mat,
      mat2: bm.mat2,
    };
  }

  // -------------------------------------------------------------- the loop
  loadScene(bootScene);
  panel.setActivePreset(bootScene.key);
  syncLayerBoxes();
  window.addEventListener("resize", resize);

  let readbackBusy = false;
  const frame = (): void => {
    requestAnimationFrame(frame);
    if (isCapturing()) return; // capture holds the GPU (common-web lock)
    st.frame++;
    const gpu = st.gpu;
    if (!gpu) return;

    if (st.running && !st.nanPaused) {
      // The rolling DFT window converges then freezes. A periodic hard reset
      // here blanked every phasor-derived layer (~1 s of black each ~6000
      // substeps); edits, λ changes and preset loads still reset explicitly.
      const phasorLive = st.dftW < 60000;
      const subs: SubstepU[] = [];
      const wDisp = st.scene.planeWave?.kind === "cw" || st.emitters.some((e) => e.kind === "cw")
        ? omegaOf(st.lambda)
        : st.scene.displayOmega;
      for (let k = 0; k < st.substeps; k++) {
        const t = st.stepCount + k;
        const pw = st.scene.planeWave;
        let srcVal = 0;
        if (pw) {
          srcVal =
            pw.kind === "ricker"
              ? pw.amp * ricker(t, pw.t0 ?? 90, pw.tau ?? 22)
              : pw.amp * Math.min(t / 180, 1) ** 2 * Math.sin(pw.omega * t);
        }
        const sources: PointSource[] = st.emitters.map((e) => ({
          i: e.i,
          j: e.j,
          value: emitterValue(e, t),
          on: true,
        }));
        subs.push({
          t,
          srcVal,
          dftCos: Math.cos(wDisp * t),
          dftSin: Math.sin(wDisp * t),
          monTrig: [0, 0, 0, 0],
          probeSlot: t,
          sources,
          brush: k === 0 ? pendingBrush : undefined,
        });
      }
      pendingBrush = undefined;
      if (st.probeCell) gpu.cfg.probeIdx = st.probeCell.i * gpu.ny + st.probeCell.j;
      const enc = device.createCommandEncoder();
      gpu.encodeSubsteps(enc, subs, { phasor: phasorLive, probe: st.probeCell !== null });
      const rs: RenderState = {
        layers: st.layers,
        exposure: st.exposure,
        fieldGain: st.scene.fieldGain,
        ampGain: st.scene.ampGain,
        dftInvW: st.dftW > 40 ? 2 / st.dftW : 0,
        time: st.frame / 60,
        pmlN: st.scene.pml.n,
        isoK: st.scene.isoK,
        tracersOn: st.tracersOn,
        tracerSpeed: 1.6,
        bloomThreshold: 0.55,
        bloomStrength: 0.65,
        sources: st.emitters.map((e) => ({ i: e.i, j: e.j, value: 0, on: true })),
        frame: st.frame,
      };
      renderer.draw(enc, gpu, ctx.getCurrentTexture().createView(), canvas.width, canvas.height, rs);
      device.queue.submit([enc.finish()]);
      st.stepCount += st.substeps;
      if (phasorLive) st.dftW += st.substeps;
    } else {
      // paused: still present (frozen field)
      const enc = device.createCommandEncoder();
      renderer.draw(enc, gpu, ctx.getCurrentTexture().createView(), canvas.width, canvas.height, {
        layers: st.layers,
        exposure: st.exposure,
        fieldGain: st.scene.fieldGain,
        ampGain: st.scene.ampGain,
        dftInvW: st.dftW > 40 ? 2 / st.dftW : 0,
        time: st.frame / 60,
        pmlN: st.scene.pml.n,
        isoK: st.scene.isoK,
        tracersOn: false,
        tracerSpeed: 0,
        bloomThreshold: 0.55,
        bloomStrength: 0.65,
        sources: st.emitters.map((e) => ({ i: e.i, j: e.j, value: 0, on: true })),
        frame: st.frame,
      });
      device.queue.submit([enc.finish()]);
    }

    // 1 Hz diagnostics readback (NaN watchdog + study rows + probe plot);
    // never while capturing, never re-entrant (phase-field mapAsync lesson)
    const now = performance.now();
    if (!readbackBusy && now - st.lastReadback > 1000 && !isCapturing()) {
      readbackBusy = true;
      st.lastReadback = now;
      void (async () => {
        try {
          const ez = await st.gpu.readField("ez");
          let peak = 0;
          let hasNan = false;
          for (let k = 0; k < ez.length; k++) {
            const v = ez[k];
            if (Number.isNaN(v)) {
              hasNan = true;
              break;
            }
            const a = Math.abs(v);
            if (a > peak) peak = a;
          }
          if (hasNan && !st.nanPaused) {
            st.nanPaused = true;
            nanBox.style.display = "block";
          }
          panel.setDiagnostics([
            { label: "step", value: String(st.stepCount) },
            { label: "sim time (a/c)", value: (st.stepCount * 0.5).toFixed(0) },
            { label: "grid", value: `${st.gpu.nx}×${st.gpu.ny}` },
            { label: "peak |Ez|", value: peak.toExponential(2) },
            { label: "λ (cells)", value: String(st.lambda) },
            { label: "DFT window", value: String(st.dftW) },
          ]);
          if (st.probeCell && st.probeArmed) {
            probeTrace = await st.gpu.readProbe();
            drawProbe(probeTrace);
          }
        } catch {
          // device lost or destroyed mid-readback — the RAF loop surfaces it
        } finally {
          readbackBusy = false;
        }
      })();
    }
  };

  function drawProbe(trace: Float32Array): void {
    const g = probeCanvas.getContext("2d");
    if (!g) return;
    g.fillStyle = "#0a1017";
    g.fillRect(0, 0, probeCanvas.width, probeCanvas.height);
    const n = Math.min(st.stepCount, trace.length, 2048);
    if (n < 4) return;
    const start = st.stepCount > trace.length ? st.stepCount % trace.length : 0;
    let peak = 1e-9;
    for (let k = 0; k < n; k++) peak = Math.max(peak, Math.abs(trace[k]));
    g.strokeStyle = "#7fdcd0";
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const x = (k / n) * probeCanvas.width;
      const v = trace[(start + k) % trace.length] / peak;
      const y = probeCanvas.height / 2 - v * probeCanvas.height * 0.45;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  installExplainPanel();
  installVerifyPanel({ device });

  setBoot("");
  requestAnimationFrame(frame);
  // validate/poster harness readiness signal (landed pattern)
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

start().catch((e) => setBoot(`boot failed: ${String(e)}`));
