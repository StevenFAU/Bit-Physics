// signal-workbench — Stack-B web app entry (four-layer INTERACT / EXPLAIN /
// PROVE / RENDER, spec-ref § 5.6). The canvas is a usable instrument on
// load (FM-sidebands template): build a signal, hear it, and watch the
// measured spectrum sit on its exact closed-form transform.

import "../../../../common/common-web/src/theme.css";
import {
  exposeCapture,
  isCapturing,
  resetCapture,
  runCaptureExclusive,
} from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { DiagnosticRow } from "../../../../common/common-web/src/panel-shell.js";
import { AudioBridge } from "./audio.js";
import { GATE, makeBundle, runGateScene } from "./capture.js";
import {
  additiveExpectedMag,
  additiveSignal,
  fmExpectedMag,
  fmSignal,
  naiveSaw,
  sineSignal,
  toneWindowedMagHalf,
  windowSum,
  windowTaps,
} from "./dsp64.mjs";
import { installExplainPanel } from "./explain.js";
import V from "./generated/verification.json";
import type { PresetSpec } from "./presets.js";
import { PRESETS, presetByKey } from "./presets.js";
import { Renderer } from "./renderer.js";
import type { ViewMode } from "./renderer.js";
import { WorkbenchGpu } from "./solver.js";
import { installVerifyPanel } from "./verify-panel.js";

const N = 4096;
const canvas = document.getElementById("view") as HTMLCanvasElement;
const boot = document.getElementById("boot") as HTMLDivElement;
const setBoot = (m: string): void => {
  boot.textContent = m;
  boot.style.display = m ? "block" : "none";
};

interface AppState {
  preset: PresetSpec;
  window: string;
  view: ViewMode;
  fmKc: number;
  fmKm: number;
  fmIndex: number;
  leakF0: number;
  additiveKind: string;
  harmonics: number;
  xyP: number;
  xyQ: number;
  xyPhase: number;
  sweep: boolean;
  displayTransforms: boolean; // persistence/waterfall dispatch (display-only)
  goldenMag: Float64Array | null; // current analytic overlay (linear |X[k]|)
  audioGain: number;
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

  const gpu = new WorkbenchGpu(device, N);
  const renderer = new Renderer(device, ctx, format, N);
  const audio = new AudioBridge();

  const st: AppState = {
    preset: presetByKey("fm"),
    window: "rectangular",
    view: "spectrum",
    fmKc: 512,
    fmKm: 37,
    fmIndex: 3.2,
    leakF0: 100.37,
    additiveKind: "saw",
    harmonics: 16,
    xyP: 3,
    xyQ: 2,
    xyPhase: 0.5,
    sweep: false,
    displayTransforms: true,
    goldenMag: null,
    audioGain: 0,
  };

  const half = N >> 1;
  const dbOf = (mag: Float64Array, wsum: number): Float32Array => {
    const out = new Float32Array(half + 1);
    for (let k = 0; k <= half; k++) {
      const amp = (2 * mag[k]) / Math.max(wsum, 1e-30);
      out[k] = 20 * Math.log10(Math.max(k === 0 ? amp / 2 : amp, 1e-12));
    }
    return out;
  };

  /** Regenerate the signal (JS f64 -> f32) + the exact analytic overlay. */
  const regen = (tSec: number): void => {
    const p = st.preset;
    let x64: Float64Array | null = null;
    let golden: Float64Array | null = null;
    let win = st.window;
    if (p.gen === "fm") {
      const index = st.sweep ? st.fmIndex + 1.5 * Math.sin(1.2 * tSec) : st.fmIndex;
      x64 = fmSignal(N, st.fmKc, st.fmKm, index, 1.0);
      golden = fmExpectedMag(N, st.fmKc, st.fmKm, index, 1.0);
      win = "rectangular";
    } else if (p.gen === "leak") {
      x64 = sineSignal(N, st.leakF0, 0.8, 0.3);
      golden = toneWindowedMagHalf(st.window, N, st.leakF0, 0.8, 0.3);
    } else if (p.gen === "additive") {
      x64 = additiveSignal(N, 31, st.additiveKind, st.harmonics);
      golden = additiveExpectedMag(N, 31, st.additiveKind, st.harmonics);
      win = "rectangular";
    } else if (p.gen === "naive-vs-bandlimited") {
      x64 = naiveSaw(N, 331);
      // the overlay is what a bandlimited saw WOULD contain — the measured
      // extra lines are the aliasing lesson (§ 3.6, ungated display)
      golden = additiveExpectedMag(N, 331, "saw", 6);
      win = "rectangular";
    } else if (p.gen === "chirp") {
      const f = 40 + (1600 - 40) * (0.5 + 0.5 * Math.sin(0.35 * tSec));
      x64 = sineSignal(N, f, 0.9, 0);
      golden = null;
      win = "hann";
    } else if (p.gen === "xy") {
      const chX = sineSignal(N, st.xyP * 4, 1, st.xyPhase);
      const chY = sineSignal(N, st.xyQ * 4, 1, 0);
      renderer.uploadXy(Float32Array.from(chX), Float32Array.from(chY));
      x64 = chX;
      golden = null;
      win = "rectangular";
    }
    if (x64) gpu.uploadSignal(Float32Array.from(x64));
    if (win === "rectangular") {
      gpu.uploadWindow(new Float32Array(N).fill(1), N);
    } else {
      gpu.uploadWindow(Float32Array.from(windowTaps(win, N)), windowSum(win, N));
    }
    st.goldenMag = golden;
    if (golden) {
      renderer.uploadOverlay(dbOf(golden, win === "rectangular" ? N : windowSum(win, N)));
    } else {
      renderer.uploadOverlay(new Float32Array(half + 1).fill(-200));
      renderer.uploadError(new Float32Array(half + 1).fill(-200));
    }
    st.view = p.view;
  };

  // ---------------------------------------------------------------- panel --
  const diagRows: DiagnosticRow[] = [];
  const panel = createSettingsPanel("Signal Workbench — verified DSP instrument", {
    caption:
      "A signal generator + analyzer where every display is gated against the closed-form transform of its own generator — FM sidebands are exactly J_n(I), leakage is exactly the window's DTFT. The repo's first audible sim.",
    onCapture: async () => {
      resetCapture();
      await runCaptureExclusive(async () => {
        panel.setStatus("gate capture running…");
        const t0 = performance.now();
        const run = await runGateScene(device);
        exposeCapture(makeBundle(run, 42, (performance.now() - t0) / 1000));
        panel.setStatus(`capture ready — sha ${run.trajectorySha.slice(0, 12)}…`);
      });
    },
    presets: PRESETS.map((p) => ({
      label: p.label,
      title: p.title,
      apply: () => {
        st.preset = p;
        st.sweep = Boolean(p.params.sweep);
        if (p.gen === "leak") st.window = String(p.params.window);
        regen(performance.now() / 1000);
        {
          // display-only ring buffers start fresh per template (§ 6.5:
          // clearing them cannot touch the gated arrays by construction)
          const enc = device.createCommandEncoder();
          gpu.clearDisplay(enc);
          device.queue.submit([enc.finish()]);
        }
        panel.setActivePreset(p.label);
        updateDiagRows(null);
        syncAudio();
      },
    })),
    study: {
      diagnostics: diagRows,
      honesty: {
        faithful:
          "own poly-trig Stockham WGSL FFT (shared source) over CPU-f64-synthesized signals; exact J_n(I) / shifted-Dirichlet / harmonic-line overlays; machine-exact Parseval + folded-line goldens in the f64 reference",
        simplified:
          "single channel, audio-rate, fixed chain templates (no flowgraph authoring); filter/comms/metrology lenses land as v1.x increments (spec § 1.2); persistence/waterfall/XY beam and audio playback are declared renderings, never gated",
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
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/signal-processing/signal-workbench/spec-ref.md",
        },
        {
          label: "tolerance row",
          href: "https://github.com/StevenFAU/Bit-Physics/blob/main/tools/testkit/equivalence/tolerance.toml",
        },
      ],
    },
  });

  // ------------------------------------------------------- custom controls --
  const ctl = panel.addGroup("generator");
  const mkSlider = (
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (v: number) => void,
  ): HTMLInputElement => {
    const row = document.createElement("label");
    row.className = "sw-ctl";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener("input", () => {
      onInput(Number(input.value));
      regen(performance.now() / 1000);
      syncAudio();
    });
    row.appendChild(span);
    row.appendChild(input);
    ctl.appendChild(row);
    return input;
  };
  mkSlider("FM index I", 0, 8, 0.01, st.fmIndex, (v) => {
    st.fmIndex = v;
  });
  mkSlider("carrier bin", 64, 1500, 1, st.fmKc, (v) => {
    st.fmKc = Math.round(v);
  });
  mkSlider("modulator bin", 5, 200, 1, st.fmKm, (v) => {
    st.fmKm = Math.round(v);
  });
  mkSlider("off-bin tone f0", 20.05, 900.95, 0.01, st.leakF0, (v) => {
    st.leakF0 = v;
  });

  const winRow = document.createElement("label");
  winRow.className = "sw-ctl";
  winRow.textContent = "window ";
  const winSel = document.createElement("select");
  for (const w of [
    "rectangular",
    "hann",
    "hamming",
    "blackman",
    "blackmanharris3",
    "blackmanharris4",
    "nuttall4b",
    "nuttall4c",
  ]) {
    const o = document.createElement("option");
    o.value = w;
    o.textContent = w;
    winSel.appendChild(o);
  }
  winSel.value = st.window;
  winSel.addEventListener("change", () => {
    st.window = winSel.value;
    regen(performance.now() / 1000);
  });
  winRow.appendChild(winSel);
  ctl.appendChild(winRow);

  const audioGroup = panel.addGroup("audio (ungated rendering, § 8)");
  const playBtn = document.createElement("button");
  playBtn.textContent = "▶ hear the signal";
  playBtn.addEventListener("click", () => {
    void (async () => {
      if (audio.isPlaying) {
        st.audioGain = 0;
        await audio.stop();
        playBtn.textContent = "▶ hear the signal";
      } else {
        await audio.start(); // ctx.resume() inside the gesture (§ 5.2)
        st.audioGain = 0.25;
        playBtn.textContent = "⏸ mute";
      }
      syncAudio();
    })();
  });
  audioGroup.appendChild(playBtn);

  const dispToggle = document.createElement("label");
  dispToggle.className = "sw-ctl";
  const dispBox = document.createElement("input");
  dispBox.type = "checkbox";
  dispBox.checked = st.displayTransforms;
  dispBox.addEventListener("change", () => {
    st.displayTransforms = dispBox.checked;
  });
  dispToggle.appendChild(dispBox);
  dispToggle.appendChild(
    document.createTextNode(" persistence/waterfall (display-only, never gated)"),
  );
  panel.addGroup("render").appendChild(dispToggle);

  window.addEventListener("sw-toggle-display-transforms", () => {
    st.displayTransforms = !st.displayTransforms;
    dispBox.checked = st.displayTransforms;
  });

  function updateDiagRows(worstOfPeak: number | null): void {
    const rows: DiagnosticRow[] = [
      {
        label: "max |measured − analytic| / peak",
        value:
          worstOfPeak === null
            ? "n/a (display-only view; gate lives in PROVE)"
            : `${worstOfPeak.toExponential(2)} (budget ${V.tolerance.relative})`,
      },
      {
        label: "template",
        value:
          st.preset.gen === "naive-vs-bandlimited"
            ? `${st.preset.label} (NEGATIVE LESSON — ungated)`
            : st.preset.label,
      },
      { label: "window", value: st.window },
    ];
    panel.setDiagnostics(rows);
  }

  function syncAudio(): void {
    const p = st.preset;
    let mode = 4;
    let kc = st.fmKc;
    let index = 0;
    if (p.gen === "fm") {
      mode = 0;
      index = st.fmIndex;
    } else if (p.gen === "leak") {
      mode = 0;
      kc = st.leakF0;
    } else if (p.gen === "additive") {
      mode = st.additiveKind === "square" ? 2 : 1;
      kc = 31;
    } else if (p.gen === "naive-vs-bandlimited") {
      mode = 3;
      kc = 331;
    } else if (p.gen === "chirp") {
      mode = 0;
      kc = 300;
    }
    audio.update({
      mode,
      kcBins: kc,
      kmBins: st.fmKm,
      index,
      harmonics: st.harmonics,
      gain: st.audioGain,
      frameN: N,
    });
  }

  installExplainPanel();
  installVerifyPanel({
    device,
    exclusive: (fn) => runCaptureExclusive(fn),
  });

  // ------------------------------------------------------------- live loop --
  regen(0);
  {
    const enc = device.createCommandEncoder();
    gpu.clearDisplay(enc); // ring buffers start at the display floor
    device.queue.submit([enc.finish()]);
  }
  panel.setActivePreset(st.preset.label);
  let lastDiag = 0;
  const frame = (tMs: number): void => {
    requestAnimationFrame(frame);
    if (isCapturing()) return; // capture holds the GPU exclusively (§ 8)
    const t = tMs / 1000;
    if (st.sweep || st.preset.gen === "chirp") regen(t);
    const enc = device.createCommandEncoder();
    gpu.encodeAnalyze(enc, st.window !== "rectangular" || st.preset.gen === "chirp");
    if (st.displayTransforms) {
      gpu.encodeWaterfallRow(enc);
      gpu.encodePersistence(enc);
    }
    device.queue.submit([enc.finish()]);
    renderer.frame(gpu, st.view, { beamGain: 0.012, beamSigma: 0.008 });

    if (tMs - lastDiag > 600) {
      lastDiag = tMs;
      const golden = st.goldenMag;
      if (!golden) {
        updateDiagRows(null);
      } else {
        void gpu.readSpectrum().then((spec) => {
          let peak = 0;
          for (let k = 0; k <= half; k++) peak = Math.max(peak, golden[k]);
          let worst = 0;
          const errDb = new Float32Array(half + 1);
          for (let k = 0; k <= half; k++) {
            const mag = Math.hypot(spec.re[k], spec.im[k]);
            const err = Math.abs(mag - golden[k]);
            worst = Math.max(worst, err);
            errDb[k] = 20 * Math.log10(Math.max(err / Math.max(peak, 1e-30), 1e-16));
          }
          renderer.uploadError(errDb);
          updateDiagRows(worst / Math.max(peak, 1e-30));
        });
      }
    }
  };
  requestAnimationFrame(frame);
  setBoot("");
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

start().catch((err) => {
  setBoot(`WebGPU init failed: ${err instanceof Error ? err.message : String(err)}`);
});

// data-spine drift check: generated/verification.json gate == capture.ts GATE
if (
  V.gate.n !== GATE.n ||
  V.gate.fm_kc !== GATE.fmKc ||
  V.gate.fm_km !== GATE.fmKm ||
  V.gate.fm_index !== GATE.fmIndex ||
  V.gate.leak_f0_bins !== GATE.leakF0Bins ||
  V.gate.leak_window !== GATE.leakWindow
) {
  throw new Error("data-spine drift: generated/verification.json gate != capture.ts GATE");
}
