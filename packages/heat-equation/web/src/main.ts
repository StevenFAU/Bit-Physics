// heat-equation — Stack-B web app entry (four-layer INTERACT / EXPLAIN /
// PROVE / RENDER, spec-ref § 5.6). The canvas is the usable sim on load
// (circuit-board template); the verification layer is one click away.

import "../../../../common/common-web/src/theme.css";
import {
  exposeCapture,
  isCapturing,
  resetCapture,
  runCaptureExclusive,
} from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { DiagnosticRow } from "../../../../common/common-web/src/panel-shell.js";
import { GATE, fetchGateDecayF64, makeBundle, runGateScene } from "./capture.js";
import { installExplainPanel } from "./explain.js";
import V from "./generated/verification.json";
import {
  continuousEigenvalue,
  decayTable,
  l2Norm,
  totalHeat,
} from "./heat64.mjs";
import { LAYER, PALETTE_NAMES, Renderer } from "./renderer.js";
import type { SceneSpec } from "./scenes.js";
import { SCENES, sceneByKey } from "./scenes.js";
import { HeatGpu } from "./solver.js";
import { installVerifyPanel } from "./verify-panel.js";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const boot = document.getElementById("boot") as HTMLDivElement;
const setBoot = (m: string): void => {
  boot.textContent = m;
  boot.style.display = m ? "block" : "none";
};

interface AppState {
  device: GPUDevice;
  renderer: Renderer;
  gpu: HeatGpu;
  scene: SceneSpec;
  n: number;
  alpha: number;
  dtFrac: number;
  solver: "ftcs" | "spectral";
  substeps: number;
  simTime: number;
  running: boolean;
  fieldTouched: boolean;
  nanPaused: boolean;
  brushDown: boolean;
  brushMode: 1 | 3;
  lastField: Float64Array | null;
  lastFieldAt: number;
  probe: { x: number; y: number } | null;
}

function stabilityBound(alpha: number, n: number): number {
  const dx = 1 / n;
  return 1 / (2 * alpha * (2 / (dx * dx)));
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
  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.92;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  setBoot("fetching committed gate tables…");
  const gateDecayF64 = await fetchGateDecayF64();

  const renderer = new Renderer(device, ctx, format);

  const state = {} as AppState;
  state.device = device;
  state.renderer = renderer;
  state.simTime = 0;
  state.running = true;
  state.fieldTouched = false;
  state.nanPaused = false;
  state.brushDown = false;
  state.brushMode = 1;
  state.lastField = null;
  state.lastFieldAt = 0;
  state.probe = null;

  const liveDt = (): number => {
    const bound = stabilityBound(state.alpha, state.n);
    return state.dtFrac * bound;
  };

  let decayDirty = false;
  let decayTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleDecayRefresh = (): void => {
    decayDirty = true;
    if (decayTimer) clearTimeout(decayTimer);
    decayTimer = setTimeout(() => {
      if (!decayDirty) return;
      decayDirty = false;
      // live-path per-mode decay: JS f64 Math.exp (the gate path uses the
      // COMMITTED numpy-f64 table; this is the ungated interactive grid)
      const d = decayTable(state.n, state.alpha, liveDt());
      state.gpu.uploadDecay(Float32Array.from(d));
    }, 120);
  };

  function loadScene(spec: SceneSpec): void {
    setBoot(`building ${spec.label} IC in f64…`);
    state.scene = spec;
    state.n = spec.n;
    state.alpha = spec.alpha;
    state.dtFrac = spec.dtFrac;
    state.solver = spec.solver;
    state.substeps = spec.substeps;
    state.simTime = 0;
    state.fieldTouched = false;
    state.nanPaused = false;
    state.lastField = null;
    hideNanCallout();

    const params = {
      alpha: spec.alpha,
      dt: liveDt(),
      bcKind: spec.bcKind,
      wallValue: spec.wallValue,
      useMaterial: !!spec.material,
      sourceScale: spec.source || spec.movingSource ? 1 : 0,
    };
    const decay = Float32Array.from(decayTable(spec.n, spec.alpha, spec.dtFrac * stabilityBound(spec.alpha, spec.n)));
    state.gpu?.destroy();
    state.gpu = new HeatGpu(device, spec.n, params, decay);
    state.gpu.uploadField(Float32Array.from(spec.ic(spec.n)));
    state.gpu.uploadSource(spec.source ? spec.source(spec.n) : new Float32Array(spec.n * spec.n));
    state.gpu.uploadAlpha(spec.material ? spec.material(spec.n) : new Float32Array(spec.n * spec.n).fill(spec.alpha));
    state.gpu.brush.sigma = 0.012 * spec.n;
    state.gpu.brush.power = spec.brushPower;

    renderer.state.flags = spec.renderFlags | (spec.fourierOverlay ? 0 : 0);
    renderer.state.palette = spec.palette;
    renderer.arrowsOn = spec.arrows;
    if (spec.glow) {
      renderer.state.kelvinOffset = spec.glow.offsetK;
      renderer.state.kelvinScale = spec.glow.scaleK;
      renderer.state.glowGain = spec.glow.gain;
    } else {
      renderer.state.glowGain = 0.9;
      renderer.state.kelvinOffset = 300;
      renderer.state.kelvinScale = 900;
    }
    renderer.state.tLo = 0;
    renderer.state.tHi = 1.8;
    renderer.bind(state.gpu.currentField, state.gpu.spectrumBuf, state.gpu.auxBuf);
    syncControls();
    setBoot("");
  }

  // --- NaN containment (spec-ref § 5.6 INTERACT: the blow-up lesson never
  // soft-locks the demo) -----------------------------------------------------
  const nanBox = document.createElement("div");
  nanBox.className = "he-nan";
  nanBox.style.display = "none";
  nanBox.innerHTML = `<b>The scheme diverged (NaN/∞ detected).</b><br>
You crossed the von Neumann bound r<sub>x</sub>+r<sub>y</sub> ≤ ½ — FTCS
amplifies the Nyquist band once Δt exceeds 1/(2α(1/Δx²+1/Δy²)). This is the
discretization's real edge, shown honestly (the spectral solver has no such
bound). `;
  const nanReset = document.createElement("button");
  nanReset.textContent = "reset the field";
  nanBox.appendChild(nanReset);
  document.body.appendChild(nanBox);
  const hideNanCallout = (): void => {
    nanBox.style.display = "none";
  };
  nanReset.onclick = () => {
    loadScene(state.scene);
  };

  // --- panel (INTERACT) ------------------------------------------------------
  let frameMs = 0;
  const panel = createSettingsPanel("Heat Equation — verified diffusion instrument", {
    caption:
      "FTCS stencil + machine-exact spectral solver on one field; the gate re-runs against an f64 reference, live.",
    onCapture: async () => {
      resetCapture();
      await runCaptureExclusive(async () => {
        panel.setStatus("gate capture running…");
        const t0 = performance.now();
        const run = await runGateScene(device, gateDecayF64);
        exposeCapture(makeBundle(run, 42, (performance.now() - t0) / 1000));
        panel.setStatus(`capture ready — sha ${run.trajectorySha.slice(0, 12)}…`);
      });
    },
    presets: SCENES.map((s) => ({
      label: s.label,
      title: s.title,
      apply: () => {
        loadScene(s);
        panel.setActivePreset(s.label);
      },
    })),
    study: {
      diagnostics: [],
      honesty: {
        faithful:
          "constant-α FTCS (discrete-amplification-gated) + spectral ETD (machine-exact per mode); conservative harmonic-mean material flux; committed Planck-locus glow LUT",
        simplified:
          "no convection/radiation transport/phase change (v1 honesty boundary § 1.1); brush and templates are ungated interactive content; DuFort–Frankel teaching mode deferred",
        measured: `gate budget ${V.tolerance.relative} measured-then-declared (${V.tolerance.measured_basis})`,
      },
      verdict: {
        gate: "web-deploy new_canonical: live f64 re-run + run-twice byte-identity",
        verdict: "runs in CI on every deploy",
        pass: true,
      },
      links: [
        {
          label: "spec-ref",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md",
        },
        {
          label: "tolerance row",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/tools/testkit/equivalence/tolerance.toml",
        },
      ],
    },
  });

  // extra controls -------------------------------------------------------------
  const controls = panel.addGroup("solver");
  const mkSlider = (
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (v: number) => void,
  ): { wrap: HTMLLabelElement; input: HTMLInputElement; readout: HTMLSpanElement } => {
    const wrap = document.createElement("label");
    wrap.className = "he-ctl";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const readout = document.createElement("span");
    readout.className = "he-readout";
    input.oninput = () => {
      onInput(Number(input.value));
    };
    wrap.append(span, input, readout);
    controls.appendChild(wrap);
    return { wrap, input, readout };
  };

  const solverSel = document.createElement("select");
  for (const s of ["ftcs", "spectral"]) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s === "ftcs" ? "FTCS (stencil, CFL-bound)" : "spectral (machine-exact, no CFL)";
    solverSel.appendChild(o);
  }
  solverSel.onchange = () => {
    state.solver = solverSel.value as "ftcs" | "spectral";
    scheduleDecayRefresh();
  };
  controls.appendChild(solverSel);

  const dtCtl = mkSlider("Δt (× von Neumann bound)", 0.1, 1.25, 0.01, 0.8, (v) => {
    state.dtFrac = v;
    state.gpu.params.dt = liveDt();
    state.gpu.writeUniforms();
    scheduleDecayRefresh();
    syncControls();
  });
  const subCtl = mkSlider("substeps / frame", 1, 32, 1, 8, (v) => {
    state.substeps = v;
    syncControls();
  });
  const brushCtl = mkSlider("brush power", 0, 300, 5, 60, (v) => {
    state.gpu.brush.power = v;
    syncControls();
  });

  const brushSel = document.createElement("select");
  for (const [v, label] of [
    ["1", "brush: heat"],
    ["3", "brush: cool"],
  ] as const) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = label;
    brushSel.appendChild(o);
  }
  brushSel.onchange = () => {
    state.brushMode = Number(brushSel.value) as 1 | 3;
  };
  controls.appendChild(brushSel);

  const layersGroup = panel.addGroup("render layers");
  const layerToggles: Array<[string, number]> = [
    ["isolines", LAYER.iso],
    ["blackbody glow", LAYER.glow],
    ["relief", LAYER.relief],
    ["spectrum view", LAYER.spectrum],
    ["error heatmap", LAYER.errmap],
    ["raw texel", LAYER.raw],
  ];
  const layerBoxes = new Map<number, HTMLInputElement>();
  for (const [label, bit] of layerToggles) {
    const wrap = document.createElement("label");
    wrap.className = "he-ctl";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.onchange = () => {
      renderer.state.flags = box.checked
        ? renderer.state.flags | bit
        : renderer.state.flags & ~bit;
    };
    layerBoxes.set(bit, box);
    const span = document.createElement("span");
    span.textContent = label;
    wrap.append(box, span);
    layersGroup.appendChild(wrap);
  }
  const arrowsWrap = document.createElement("label");
  arrowsWrap.className = "he-ctl";
  const arrowsBox = document.createElement("input");
  arrowsBox.type = "checkbox";
  arrowsBox.onchange = () => {
    renderer.arrowsOn = arrowsBox.checked;
  };
  const arrowsSpan = document.createElement("span");
  arrowsSpan.textContent = "heat-flux arrows";
  arrowsWrap.append(arrowsBox, arrowsSpan);
  layersGroup.appendChild(arrowsWrap);

  const palSel = document.createElement("select");
  for (const p of PALETTE_NAMES) {
    const o = document.createElement("option");
    o.value = p;
    o.textContent = p;
    palSel.appendChild(o);
  }
  palSel.onchange = () => {
    renderer.state.palette = palSel.value;
  };
  layersGroup.appendChild(palSel);

  function syncControls(): void {
    solverSel.value = state.solver;
    dtCtl.input.value = String(state.dtFrac);
    const bound = stabilityBound(state.alpha, state.n);
    const margin = 0.5 - 2 * state.alpha * (state.dtFrac * bound) * state.n * state.n;
    dtCtl.readout.textContent =
      state.solver === "ftcs"
        ? ` dt=${(state.dtFrac * bound).toExponential(2)} · margin ${margin.toFixed(3)}${margin < 0 ? " ⚠ UNSTABLE" : ""}`
        : ` dt=${(state.dtFrac * bound).toExponential(2)} (no CFL on the spectral path)`;
    subCtl.input.value = String(state.substeps);
    subCtl.readout.textContent = ` ${state.substeps}`;
    brushCtl.input.value = String(state.gpu?.brush.power ?? 0);
    brushCtl.readout.textContent = ` ${state.gpu?.brush.power ?? 0}`;
    palSel.value = renderer.state.palette;
    for (const [bit, box] of layerBoxes) box.checked = (renderer.state.flags & bit) !== 0;
    arrowsBox.checked = renderer.arrowsOn;
  }

  installExplainPanel();
  installVerifyPanel({
    device,
    decayF64: gateDecayF64,
    exclusive: (fn) => runCaptureExclusive(fn),
  });

  // --- pointer interaction ----------------------------------------------------
  const gridFromEvent = (ev: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * state.n,
      y: ((ev.clientY - r.top) / r.height) * state.n,
    };
  };
  canvas.addEventListener("pointerdown", (ev) => {
    state.brushDown = true;
    const g = gridFromEvent(ev);
    state.gpu.brush.x = g.x;
    state.gpu.brush.y = g.y;
    state.fieldTouched = true;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    const g = gridFromEvent(ev);
    state.probe = g;
    if (state.brushDown) {
      state.gpu.brush.x = g.x;
      state.gpu.brush.y = g.y;
    }
  });
  const up = (): void => {
    state.brushDown = false;
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  // --- live loop ---------------------------------------------------------------
  let frameCount = 0;
  let statsBusy = false;
  const frame = (): void => {
    requestAnimationFrame(frame);
    if (isCapturing()) return; // capture holds the GPU-state lock (house rule)
    const t0 = performance.now();
    const s = state;

    if (s.running && !s.nanPaused) {
      // Splats are submitted in their OWN command buffers: queue.writeBuffer
      // executes in queue order, so a later uniform write would clobber an
      // encoded-but-unsubmitted splat's brush params (the all-white-laser bug).
      if (s.scene.movingSource) {
        const pos = s.scene.movingSource(s.simTime, s.n);
        s.gpu.brush.kind = 2;
        s.gpu.brush.x = pos.x;
        s.gpu.brush.y = pos.y;
        const keepSigma = s.gpu.brush.sigma;
        const keepPower = s.gpu.brush.power;
        s.gpu.brush.sigma = pos.sigma;
        s.gpu.brush.power = pos.power;
        s.gpu.writeUniforms();
        const encS = device.createCommandEncoder();
        s.gpu.encodeClearSource(encS);
        s.gpu.encodeSplat(encS);
        device.queue.submit([encS.finish()]);
        s.gpu.brush.sigma = keepSigma;
        s.gpu.brush.power = keepPower;
        s.gpu.brush.kind = 0;
      }
      // user brush
      if (s.brushDown) {
        s.gpu.brush.kind = s.brushMode;
        s.gpu.writeUniforms();
        const encB = device.createCommandEncoder();
        s.gpu.encodeSplat(encB);
        device.queue.submit([encB.finish()]);
        s.gpu.brush.kind = 0;
      }
      s.gpu.writeUniforms();
      const enc = device.createCommandEncoder();
      for (let i = 0; i < s.substeps; i++) {
        if (s.solver === "ftcs") s.gpu.encodeFtcsStep(enc);
        else s.gpu.encodeSpectralStep(enc);
        s.simTime += s.gpu.params.dt;
      }
      // spectrum refresh for the FTCS path (spectral path captures in-step)
      if ((renderer.state.flags & LAYER.spectrum) !== 0 && s.solver === "ftcs" && frameCount % 6 === 0) {
        s.gpu.encodeSpectrumRefresh(enc);
      }
      if (frameCount % 30 === 0) s.gpu.encodeStatsReduce(enc);
      device.queue.submit([enc.finish()]);
      renderer.bind(s.gpu.currentField, s.gpu.spectrumBuf, s.gpu.auxBuf);
    }

    // analytic overlay state (fourier template, untouched field only)
    if (s.scene.fourierOverlay && !s.fieldTouched) {
      renderer.state.offset0 = 1.0;
      renderer.state.errScale = 2e-4;
      renderer.state.modes = [
        [1, 1, 0.5 * Math.exp(s.alpha * continuousEigenvalue(s.n, 1, 1) * s.simTime)],
        [5, 3, 0.25 * Math.exp(s.alpha * continuousEigenvalue(s.n, 5, 3) * s.simTime)],
        [2, 7, 0.125 * Math.exp(s.alpha * continuousEigenvalue(s.n, 2, 7) * s.simTime)],
      ];
    } else {
      renderer.state.modes = [];
      renderer.state.flags &= ~LAYER.errmap;
    }
    renderer.state.specAlphaT = s.alpha * Math.max(s.simTime, 1e-6);

    renderer.frame(s.n);
    frameCount++;
    frameMs = 0.9 * frameMs + 0.1 * (performance.now() - t0);

    // stats cadence: NaN containment + display autoscale + diagnostics
    if (frameCount % 30 === 5 && !statsBusy) {
      statsBusy = true;
      void state.gpu
        .readStats()
        .then((st) => {
          if (!st) return;
          if (st.nan && !s.nanPaused) {
            s.nanPaused = true;
            nanBox.style.display = "block";
          }
          if (!st.nan && Number.isFinite(st.min) && Number.isFinite(st.max) && st.max > st.min) {
            const pad = 0.05 * (st.max - st.min);
            renderer.state.tLo = renderer.state.tLo * 0.7 + (st.min - pad) * 0.3;
            renderer.state.tHi = renderer.state.tHi * 0.7 + (st.max + pad) * 0.3;
          }
          const rows: DiagnosticRow[] = [
            { label: "T range", value: `${st.min.toFixed(3)} … ${st.max.toFixed(3)}` },
            {
              label: "stability margin",
              value:
                s.solver === "ftcs"
                  ? (0.5 - 2 * s.alpha * s.gpu.params.dt * s.n * s.n).toFixed(3)
                  : "∞ (spectral)",
            },
            { label: "sim time", value: s.simTime.toFixed(3) },
            { label: "frame", value: `${frameMs.toFixed(1)} ms` },
            { label: "NaN scan", value: st.nan ? "DIVERGED" : "clean" },
          ];
          if (s.lastField) {
            rows.push(
              { label: "total heat (f64)", value: totalHeat(s.lastField, s.n).toFixed(6) },
              { label: "‖T‖₂ (f64)", value: l2Norm(s.lastField, s.n).toFixed(6) },
            );
          }
          if (s.probe && s.lastField) {
            const ix = Math.min(s.n - 1, Math.max(0, Math.floor(s.probe.x)));
            const iy = Math.min(s.n - 1, Math.max(0, Math.floor(s.probe.y)));
            rows.push({ label: "probe", value: s.lastField[ix * s.n + iy].toFixed(4) });
          }
          panel.setDiagnostics(rows);
        })
        .finally(() => {
          statsBusy = false;
        });
    }

    // 1 Hz f64 instruments readback (guarded; skipped while capturing)
    if (performance.now() - s.lastFieldAt > 1000 && s.running && !isCapturing()) {
      s.lastFieldAt = performance.now();
      void s.gpu.readField().then((f) => {
        s.lastField = Float64Array.from(f);
      });
    }
  };

  loadScene(sceneByKey("circuit"));
  panel.setActivePreset("circuit board");
  requestAnimationFrame(frame);
  setBoot("");
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

start().catch((err) => {
  setBoot(`WebGPU init failed: ${err instanceof Error ? err.message : String(err)}`);
});

// keep GATE referenced for the data-spine drift check below
if (V.gate.n !== GATE.n || V.gate.steps !== GATE.steps || V.gate.dt !== GATE.dt) {
  throw new Error("data-spine drift: generated/verification.json gate != capture.ts GATE");
}
