// lbm-multiphase — Stack-B web app entry (four-layer RENDER / INTERACT /
// EXPLAIN / PROVE, spec § 5). One nearest-neighbor interaction force on a
// D2Q9 lattice makes two fluids out of one equation — droplets, coalescence
// and paintable wetting, stepped live on the user's GPU; the deploy gate
// re-runs in the PROVE panel against committed f64 references and analytic
// laws (Maxwell coexistence, Young–Laplace).

import "../../../../common/common-web/src/theme.css";
import {
  exposeCapture,
  isCapturing,
  resetCapture,
} from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { fetchF64, fetchManifest, runFullCapture } from "./capture.js";
import { installExplainPanel } from "./explain.js";
import type { RenderState } from "./renderer.js";
import { LAYER, Renderer } from "./renderer.js";
import type { SceneSpec } from "./scenes.js";
import { SCENES, sceneByKey } from "./scenes.js";
import type { BrushU, SubstepU } from "./solver.js";
import { LbmGpu } from "./solver.js";
import { installVerifyPanel } from "./verify-panel.js";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const boot = document.getElementById("boot") as HTMLDivElement;
const setBoot = (m: string): void => {
  boot.textContent = m;
  boot.style.display = m ? "block" : "none";
};

// measured f64 rho_w -> theta map (committed golden
// tools/testkit/golden/tables/lattice/lbm-multiphase-contact-angle.json;
// Tier A spherical-cap protocol). Used to label the wetting brush in
// degrees — the physics knob is rho_w itself.
const CA_MAP: Array<[number, number]> = [
  [1.0, 103.1],
  [1.2, 80.7],
  [1.4, 62.5],
  [1.6, 46.4],
  [1.8, 28.0],
];

function rhoWOfTheta(thetaDeg: number): number {
  const pts = [...CA_MAP].sort((a, b) => b[1] - a[1]); // theta descending
  if (thetaDeg >= pts[0][1]) return pts[0][0];
  const last = pts[pts.length - 1];
  if (thetaDeg <= last[1]) return last[0];
  for (let k = 0; k < pts.length - 1; k++) {
    const [r0, t0] = pts[k];
    const [r1, t1] = pts[k + 1];
    if (thetaDeg <= t0 && thetaDeg >= t1) {
      const a = (t0 - thetaDeg) / (t0 - t1);
      return r0 + a * (r1 - r0);
    }
  }
  return 1.4;
}

type Tool = "drag" | "condense" | "boil" | "wall" | "erase";

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
    // surface validation errors loudly, never silently (pic-flip lesson)
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

  setBoot("fetching committed ψ table…");
  const man = await fetchManifest();
  const lut32 = Float32Array.from(await fetchF64(man.assets.psi_lut.file));
  const renderer = new Renderer(device, format);

  const params = new URLSearchParams(window.location.search);
  const bootScene = sceneByKey(params.get("preset") ?? "droplet-rain");

  const st = {
    gpu: null as LbmGpu | null,
    scene: bootScene,
    running: true,
    nanPaused: false,
    stepCount: 0,
    frame: 0,
    substeps: bootScene.substeps,
    exposure: 1.0,
    layers: bootScene.layers,
    tracersOn: bootScene.tracers,
    tool: "drag" as Tool,
    brushRadius: 7,
    thetaDeg: 62,
    splatStrength: 1.0,
    gravityMag: Math.hypot(...bootScene.params.gravity),
    pointer: null as { i: number; j: number; di: number; dj: number } | null,
    lastReadback: 0,
  };
  let pendingBrush: BrushU | undefined;

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
    st.gpu?.destroy();
    st.gpu = null;
    st.scene = spec;
    st.substeps = spec.substeps;
    st.layers = spec.layers;
    st.tracersOn = spec.tracers;
    st.stepCount = 0;
    st.nanPaused = false;
    st.gravityMag = Math.hypot(...spec.params.gravity);
    const gpu = new LbmGpu(device, { nx: spec.nx, ny: spec.ny, ...spec.params }, lut32);
    const ic = spec.build(spec.nx, spec.ny);
    gpu.seedFromRho(ic.rho, ic.solid);
    gpu.seedTracers();
    st.gpu = gpu;
    renderer.attach(gpu);
    resize();
    hideNan();
    syncControls();
  }

  // ------------------------------------------------------------- NaN guard
  const nanBox = document.createElement("div");
  nanBox.className = "lm-nan";
  nanBox.style.display = "none";
  nanBox.innerHTML =
    "<b>The lattice blew up (NaN).</b> This is the honest failure mode of a " +
    "pseudopotential LBM pushed outside its stability envelope — τ too close " +
    "to ½, a too-deep quench, or interactive abuse near the spinodal " +
    "— a declared limit of this scheme, not a rendering glitch. ";
  const nanBtn = document.createElement("button");
  nanBtn.textContent = "reset scene";
  nanBtn.addEventListener("click", () => loadScene(st.scene));
  nanBox.appendChild(nanBtn);
  document.body.appendChild(nanBox);
  const hideNan = (): void => {
    nanBox.style.display = "none";
  };

  // ---------------------------------------------------------------- panel
  const panel = createSettingsPanel("lbm-multiphase — two phases from one equation", {
    caption:
      "One nearest-neighbor attraction makes a single fluid split into " +
      "liquid and vapor (pseudopotential lattice Boltzmann) — droplets, " +
      "coalescence, paintable wetting, re-checked against two textbook " +
      "laws on your GPU.",
    onCapture: async () => {
      panel.setStatus("capturing (gate + coexistence + Laplace + controls)…");
      try {
        resetCapture();
        const full = await runFullCapture(device, panel.getState().seed, (m) =>
          panel.setStatus(m),
        );
        exposeCapture(full.bundle);
        const s = full.summary;
        panel.setStatus(
          `gate done — matched ${s.matched_worst_rel.toExponential(1)}, ` +
            `ρl ${s.coex_rho_l.toFixed(4)}/${s.coex_target_rho_l.toFixed(4)}, ` +
            `σ ${s.laplace_sigma.toExponential(2)}/${s.laplace_sigma_ref.toExponential(2)}`,
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
          "D2Q9 pseudopotential LBM (Krüger lattice-weight convention): Tier A ψ=exp(−1/ρ) + " +
          "Guo forcing (Maxwell-exact coexistence, τ-independent); Tier B Carnahan–Starling + " +
          "Li–Luo–Li σ-forcing (ε=1.68 mechanical-stability targets). DDF-shifted f32, " +
          "committed f64 ψ-LUT, halfway bounce-back wetting walls.",
        simplified:
          "BGK collisions (the published weighted-MRT Tier-B variant is a disclosed v1.x " +
          "follow-up); density ratio bounded (~5 Tier A, ~14 Tier B canonical); spurious " +
          "currents exist at curved interfaces and are shown, not hidden (parasite view).",
        measured:
          "coexistence, τ-independence, Laplace σ, spurious ceiling and the G>G_c control " +
          "measured on this GPU via the capture button.",
      },
      verdict: {
        gate: "new_canonical + analytic (Maxwell/Laplace/spurious/no-sep)",
        verdict: "not yet run",
        pass: false,
      },
    },
  });

  const gScene = panel.addGroup("scene");
  const mkRow = (parent: HTMLElement, label: string): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "lm-ctl";
    const l = document.createElement("span");
    l.className = "lm-lab";
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
    readout.className = "lm-readout";
    readout.textContent = String(value);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      readout.textContent = input.value;
      onInput(v);
    });
    row.append(input, readout);
    return { input, readout };
  };

  const substepCtl = mkSlider(gScene, "substeps / frame", 1, 30, 1, st.substeps, (v) => {
    st.substeps = v;
  });
  mkSlider(gScene, "exposure", 0.2, 3, 0.05, 1, (v) => {
    st.exposure = v;
  });
  const tauCtl = mkSlider(gScene, "relaxation τ", 0.55, 1.6, 0.01, 1.0, (v) => {
    if (st.gpu) st.gpu.params.tau = v;
  });
  const gravCtl = mkSlider(gScene, "gravity ×10⁵", 0, 12, 0.5, st.gravityMag * 1e5, (v) => {
    if (!st.gpu) return;
    const dir = st.scene.params.gravity;
    const mag = Math.hypot(...dir) || 1;
    st.gpu.params.gravity = [(dir[0] / mag) * v * 1e-5, (dir[1] / mag) * v * 1e-5];
    if (v > 0 && Math.hypot(...dir) === 0) st.gpu.params.gravity = [0, v * 1e-5];
  });

  const gTool = panel.addGroup("interact");
  const toolRow = mkRow(gTool, "tool");
  for (const t of ["drag", "condense", "boil", "wall", "erase"] as const) {
    const b = document.createElement("button");
    b.textContent = t;
    b.addEventListener("click", () => {
      st.tool = t;
      for (const c of Array.from(toolRow.querySelectorAll("button")))
        c.classList.toggle("lm-active", c === b);
    });
    if (t === "drag") b.classList.add("lm-active");
    toolRow.appendChild(b);
  }
  mkSlider(gTool, "brush radius", 3, 24, 1, st.brushRadius, (v) => {
    st.brushRadius = v;
  });
  mkSlider(gTool, "wall contact angle °", 28, 103, 1, st.thetaDeg, (v) => {
    st.thetaDeg = v;
  });
  mkSlider(gTool, "splat strength", 0.2, 3, 0.1, 1, (v) => {
    st.splatStrength = v;
  });

  const gRender = panel.addGroup("render layers");
  const layerDefs: Array<[string, number]> = [
    ["phase field", LAYER.phase],
    ["glass refraction", LAYER.refraction],
    ["interface outline", LAYER.iso],
    ["vorticity", LAYER.curl],
    ["speed", LAYER.speed],
    ["schlieren |∇ρ|", LAYER.schlieren],
    ["walls (wetting-tinted)", LAYER.walls],
    ["parasite view (spurious u)", LAYER.parasite],
  ];
  const layerBoxes: Array<[HTMLInputElement, number]> = [];
  for (const [label, bit] of layerDefs) {
    const row = mkRow(gRender, label);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", () => {
      if (cb.checked) st.layers |= bit;
      else st.layers &= ~bit;
    });
    layerBoxes.push([cb, bit]);
    row.appendChild(cb);
  }
  const tracerRow = mkRow(gRender, "dye tracers");
  const tracerCb = document.createElement("input");
  tracerCb.type = "checkbox";
  tracerCb.addEventListener("change", () => {
    st.tracersOn = tracerCb.checked;
  });
  tracerRow.appendChild(tracerCb);

  function syncControls(): void {
    substepCtl.input.value = String(st.substeps);
    substepCtl.readout.textContent = substepCtl.input.value;
    tauCtl.input.value = String(st.gpu?.params.tau ?? 1);
    tauCtl.readout.textContent = tauCtl.input.value;
    gravCtl.input.value = String((st.gravityMag * 1e5).toFixed(1));
    gravCtl.readout.textContent = gravCtl.input.value;
    gravCtl.input.disabled = !st.scene.gravityCtl;
    for (const [cb, bit] of layerBoxes) cb.checked = (st.layers & bit) !== 0;
    tracerCb.checked = st.tracersOn;
  }

  // ---------------------------------------------------------- interaction
  const cellFromEvent = (ev: PointerEvent): { i: number; j: number } => {
    const r = canvas.getBoundingClientRect();
    const gpu = st.gpu;
    if (!gpu) return { i: 0, j: 0 };
    const i = Math.floor(((ev.clientX - r.left) / r.width) * gpu.nx);
    const j = Math.floor(((ev.clientY - r.top) / r.height) * gpu.ny);
    return {
      i: Math.max(0, Math.min(gpu.nx - 1, i)),
      j: Math.max(0, Math.min(gpu.ny - 1, j)),
    };
  };
  let lastCell: { i: number; j: number } | null = null;
  canvas.addEventListener("pointerdown", (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    const c = cellFromEvent(ev);
    lastCell = c;
    st.pointer = { ...c, di: 0, dj: 0 };
    if (st.tool === "wall" || st.tool === "erase") queueBrush(c);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!st.pointer) return;
    const c = cellFromEvent(ev);
    st.pointer = {
      ...c,
      di: c.i - (lastCell?.i ?? c.i),
      dj: c.j - (lastCell?.j ?? c.j),
    };
    lastCell = c;
    if (st.tool === "wall" || st.tool === "erase") queueBrush(c);
  });
  const endPointer = (): void => {
    st.pointer = null;
    lastCell = null;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  function queueBrush(c: { i: number; j: number }): void {
    pendingBrush = {
      x: c.i,
      y: c.j,
      r2: st.brushRadius * st.brushRadius,
      mode: st.tool === "wall" ? "wall" : "erase",
      rhoW:
        st.tool === "wall"
          ? rhoWOfTheta(st.thetaDeg) * (st.scene.rhoL / 2.2494405)
          : st.scene.rhoV,
    };
  }

  function splatOf(): SubstepU {
    const p = st.pointer;
    if (!p || st.tool === "wall" || st.tool === "erase") return {};
    const r2 = st.brushRadius * st.brushRadius * 4;
    if (st.tool === "drag") {
      const k = 2e-4 * st.splatStrength;
      const mag = Math.hypot(p.di, p.dj);
      const cap = mag > 6 ? 6 / mag : 1;
      return {
        splat: { x: p.i, y: p.j, r2, fx: p.di * cap * k, fy: p.dj * cap * k, fac: 0 },
      };
    }
    const fac = st.tool === "condense" ? 1.02 : 0.985;
    return { splat: { x: p.i, y: p.j, r2, fx: 0, fy: 0, fac } };
  }

  // -------------------------------------------------------------- the loop
  loadScene(bootScene);
  panel.setActivePreset(bootScene.key);
  window.addEventListener("resize", resize);

  let readbackBusy = false;
  // settled-scene detector: mean per-cell |Δρ| across consecutive 1 Hz
  // readbacks. Activity thresholds on |u| would false-positive forever on the
  // pseudopotential's steady parasitic interface currents; the density field
  // itself goes static when a scene (droplet-rain, capillary-race…) finishes.
  // A scene switch needs no explicit reset: the first cross-scene Δρ is huge
  // (or the grid length changes), which zeroes the calm counter.
  let prevRho: Float32Array | null = null;
  let lastSampleStep = -1;
  let calmTicks = 0;
  let settledShown = false;
  const frame = (): void => {
    requestAnimationFrame(frame);
    if (isCapturing()) return; // capture holds the GPU (common-web lock)
    st.frame++;
    const gpu = st.gpu;
    if (!gpu) return;

    const rs: RenderState = {
      layers: st.layers,
      rhoV: st.scene.rhoV,
      rhoL: st.scene.rhoL,
      exposure: st.exposure,
      time: st.frame / 60,
      speedGain: st.scene.speedGain,
      curlGain: st.scene.curlGain,
      parasiteGain: 220,
      tracersOn: st.tracersOn,
      tracerAlpha: 0.55,
    };
    const enc = device.createCommandEncoder();
    if (st.running && !st.nanPaused) {
      const splat = splatOf();
      const subs: SubstepU[] = [];
      for (let k = 0; k < st.substeps; k++) subs.push(splat);
      gpu.encodeSubsteps(enc, subs, {
        brush: pendingBrush,
        frame: st.frame,
        tracers: st.tracersOn,
        tracerDt: 6,
      });
      pendingBrush = undefined;
      st.stepCount += st.substeps;
    }
    renderer.draw(enc, ctx.getCurrentTexture().createView(), rs);
    device.queue.submit([enc.finish()]);

    // 1 Hz diagnostics readback (NaN watchdog + study rows); never while
    // capturing, never re-entrant (phase-field mapAsync lesson)
    const now = performance.now();
    if (!readbackBusy && now - st.lastReadback > 1000 && !isCapturing()) {
      readbackBusy = true;
      st.lastReadback = now;
      void (async () => {
        try {
          const gpuNow = st.gpu;
          if (!gpuNow) return;
          const m = await gpuNow.readMacro();
          let peakU = 0;
          let meanRho = 0;
          let hasNan = false;
          let dSum = 0;
          // per-step normalization keeps the settle threshold invariant to
          // the substeps slider; dStep <= 0 also catches scene reloads
          // (stepCount resets) without an explicit hook
          const dStep = st.stepCount - lastSampleStep;
          const comparable =
            prevRho !== null &&
            prevRho.length === m.rho.length &&
            lastSampleStep >= 0 &&
            dStep > 0 &&
            st.running &&
            !st.nanPaused;
          for (let c = 0; c < m.rho.length; c++) {
            const r = m.rho[c];
            if (Number.isNaN(r)) {
              hasNan = true;
              break;
            }
            meanRho += r;
            if (comparable) dSum += Math.abs(r - (prevRho as Float32Array)[c]);
            const s = Math.abs(m.ux[c]) + Math.abs(m.uy[c]);
            if (s > peakU) peakU = s;
          }
          meanRho /= m.rho.length;
          if (hasNan && !st.nanPaused) {
            st.nanPaused = true;
            nanBox.style.display = "block";
          }
          let meanD = -1;
          if (comparable && !hasNan) {
            // mean per-cell |Δρ| per kilostep. Measured on droplet-rain
            // (RADV, 360 s run): active rain ~1e-3, last visible motion
            // ~5.6e-5, settled-pool asymptote ~5.8e-6 (parasitic-current
            // flutter never decays past that) — the 5e-5·(ρL−ρV) ≈ 1.4e-5
            // threshold sits mid-gap, ≳2.5× clear of both neighbors.
            meanD = (dSum / m.rho.length / dStep) * 1000;
            if (meanD < 5e-5 * (st.scene.rhoL - st.scene.rhoV)) {
              calmTicks++;
            } else {
              calmTicks = 0;
              if (settledShown) {
                settledShown = false;
                panel.setNarration("");
              }
            }
            if (calmTicks === 5 && !settledShown) {
              settledShown = true;
              panel.setNarration(
                "the flow has settled — paint with the tools or pick a preset to stir it up again",
                "nudge",
              );
            }
          } else {
            calmTicks = 0;
          }
          prevRho = hasNan ? null : Float32Array.from(m.rho);
          lastSampleStep = st.stepCount;
          panel.setDiagnostics([
            { label: "step", value: String(st.stepCount) },
            { label: "grid", value: `${gpuNow.nx}×${gpuNow.ny}` },
            { label: "tier", value: gpuNow.params.psiKind === "cs" ? "B (C-S + σ)" : "A (exp-ψ + Guo)" },
            { label: "max |u| (lattice)", value: peakU.toExponential(2) },
            { label: "mean ρ", value: meanRho.toFixed(4) },
            { label: "activity ⟨|Δρ|⟩/kstep", value: meanD >= 0 ? meanD.toExponential(2) : "—" },
            { label: "τ", value: String(gpuNow.params.tau) },
          ]);
        } catch {
          // device lost or destroyed mid-readback — the RAF loop surfaces it
        } finally {
          readbackBusy = false;
        }
      })();
    }
  };

  installExplainPanel();
  installVerifyPanel({ device });

  setBoot("");
  requestAnimationFrame(frame);
  // validate/poster harness readiness signal (landed pattern)
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

start().catch((e) => setBoot(`boot failed: ${String(e)}`));
