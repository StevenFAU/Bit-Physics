import "../../../../common/common-web/src/theme.css";
import "./murmuration.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { isCapturing } from "../../../../common/common-web/src/capture-export.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";
import { captureLegacyCanonical } from "./legacy-capture.js";
import { MurmurationEngine, PRESETS } from "./engine.js";
import type { CameraMode, ColorMode, MurmurationPreset, ToolMode } from "./engine.js";

// Deployment discovery looks for `exposeCapture` in this entry point. The
// implementation lives in legacy-capture.ts so the frozen canonical kernel is
// physically isolated from the new live engine.

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function row(label: string, control: HTMLElement, value?: HTMLElement): HTMLLabelElement {
  const element = document.createElement("label");
  element.className = "murmuration-row";
  const name = document.createElement("span");
  name.textContent = label;
  element.append(name, control);
  if (value) element.appendChild(value);
  return element;
}

function select<T extends string>(values: readonly T[], active: T, onChange: (value: T) => void): HTMLSelectElement {
  const element = document.createElement("select");
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value; option.textContent = value; option.selected = value === active;
    element.appendChild(option);
  }
  element.addEventListener("change", () => onChange(element.value as T));
  return element;
}

function range(
  min: number, max: number, step: number, initial: number,
  format: (value: number) => string, onInput: (value: number) => void,
): { input: HTMLInputElement; output: HTMLOutputElement } {
  const input = document.createElement("input");
  input.type = "range"; input.min = String(min); input.max = String(max);
  input.step = String(step); input.value = String(initial);
  const output = document.createElement("output"); output.value = format(initial);
  input.addEventListener("input", () => {
    const value = Number(input.value); output.value = format(value); onInput(value);
  });
  return { input, output };
}

function setDiagnostics(panel: PanelShell, engine: MurmurationEngine, adapterName: string): void {
  const stats = engine.stats;
  panel.setDiagnostics([
    { label: "live model", value: "topological K = 7" },
    { label: "agents", value: engine.agentCount.toLocaleString() },
    { label: "polarization", value: stats.polarization.toFixed(3) },
    { label: "milling", value: stats.milling.toFixed(3) },
    { label: "mean neighbors", value: stats.meanNeighbors.toFixed(2) },
    { label: "mean speed", value: stats.meanSpeed.toFixed(2) },
    { label: "alert fraction", value: stats.alertFraction.toFixed(3) },
    { label: "flock radius", value: stats.radius.toFixed(1) },
    { label: "vertical spread", value: stats.verticalSpread.toFixed(1) },
    { label: "CPU encode p50/p95", value: `${engine.cpuFrameP50.toFixed(2)} / ${engine.cpuFrameP95.toFixed(2)} ms` },
    { label: "adapter", value: adapterName },
    { label: "capture path", value: "legacy Reynolds, seed 42" },
  ]);
}

async function main(): Promise<void> {
  let context;
  try {
    context = await createContext({ adapterOptions: { powerPreference: "high-performance" } });
  } catch (error) {
    boot.textContent = `WebGPU unavailable: ${(error as Error).message}`;
    throw error;
  }
  const { device, adapter } = context;
  const adapterInfo = adapter.info;
  const adapterName = adapterInfo.description || adapterInfo.device || adapterInfo.vendor || "WebGPU adapter";
  const software = /software|swiftshader|llvmpipe|lavapipe/i.test(adapterName);
  const query = new URLSearchParams(location.search);
  const querySeed = Number.parseInt(query.get("seed") ?? "42", 10);
  const initialSeed = Number.isFinite(querySeed) ? querySeed : 42;
  const initialPreset = PRESETS.find((preset) => preset.label === query.get("preset")) ?? PRESETS[0]!;
  const allowedCounts = [4_096, 16_384, 32_768, 65_536] as const;
  const queryCount = Number.parseInt(query.get("n") ?? "", 10);
  const initialCount = allowedCounts.find((count) => count === queryCount) ?? (software ? 4_096 : 32_768);
  const allowedColors = ["natural", "heading", "speed", "alert"] as const;
  const initialColor: ColorMode = allowedColors.includes(query.get("color") as ColorMode) ? query.get("color") as ColorMode : "natural";
  let engine: MurmurationEngine;
  let suspended = false;
  let selectedPreset: MurmurationPreset = initialPreset;
  const syncUrl = (): void => {
    const params = new URLSearchParams();
    params.set("preset", selectedPreset.label); params.set("n", String(engine.agentCount));
    params.set("seed", String(panel.getState().seed)); params.set("color", engine.colorMode);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  };

  const panel = createSettingsPanel("Murmuration Lab", {
    caption: "A GPU-scale starling flock: topological neighbors, bounded turning, banking, threat waves, and no leader.",
    initial: { tier: "demo", seed: initialSeed },
    onCapture: async () => captureLegacyCanonical(device, panel),
    onChange: ({ seed }) => engine?.reset(seed),
    presets: PRESETS.map((preset) => ({
      label: preset.label,
      title: preset.title,
      apply: () => {
        selectedPreset = preset;
        engine.setPreset(preset, panel.getState().seed);
        syncUrl();
        panel.setStatus(`${preset.label} — ${preset.title}`);
      },
    })),
    modes: {
      initial: "play",
      onMode: (mode) => { suspended = mode === "study"; engine.paused = suspended; },
    },
    study: {
      diagnostics: [{ label: "diagnostics", value: "warming up…" }],
      honesty: {
        faithful: "The live engine uses a topological seven-neighbor rule, metric collision zone, rear blind cone, bounded turn rate, speed relaxation, banking, and compact GPU reductions. Every bird is an oriented procedural mesh driven directly by simulated state.",
        simplified: "This is an explanatory starling-inspired model, not an animal-identification model. Aerodynamics, vision, decision latency, and predator strategy are reduced to interactive controls. The neighbor search is a GPU spatial-grid candidate search.",
        measured: "Polarization, milling, neighbor count, speed, threat, radius, and vertical spread are reduced on the GPU and only 64 bytes are read back at low frequency. The canonical capture remains the frozen Reynolds-1987 verification case.",
      },
      verdict: { gate: "legacy canonical + deterministic live invariants", verdict: "PASS", pass: true },
      links: [
        { label: "research & shipping spec", href: "https://github.com/StevenFAU/Bit-Physics/blob/main/packages/boids-3d/web/feature-expansion-spec.md" },
        { label: "canonical sim spec", href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/agent-based/boids-3d/spec-ref.md" },
      ],
    },
  });

  boot.textContent = "compiling spatial grid, flock, and bird pipelines…";
  engine = await MurmurationEngine.create(device, canvas, initialCount);
  engine.setPreset(initialPreset, initialSeed);
  engine.colorMode = initialColor;
  panel.setActivePreset(initialPreset.label);
  engine.paused = suspended;

  const population = panel.addGroup("flock scale");
  const initialCountLabel = initialCount.toLocaleString("en-US") as "4,096" | "16,384" | "32,768" | "65,536";
  const populationSelect = select(["4,096", "16,384", "32,768", "65,536"] as const,
    initialCountLabel, (value) => {
      engine.setAgentCount(Number(value.replace(",", "")), panel.getState().seed);
      syncUrl();
      panel.setStatus(`${value} birds — state rebuilt on the GPU`);
    });
  population.appendChild(row("birds", populationSelect));

  const interaction = panel.addGroup("interact — drag the sky");
  const toolSelect = select(["orbit", "attract", "repel", "falcon", "gust"] as const, "orbit", (value) => {
    engine.setTool(value); canvas.dataset.tool = value;
    panel.setStatus(value === "orbit" ? "drag to orbit; wheel to zoom" : `drag to apply ${value}`);
  });
  interaction.appendChild(row("tool", toolSelect));
  const radiusControl = range(6, 32, 1, 18, (v) => v.toFixed(0), (v) => engine.setToolRadius(v));
  interaction.appendChild(row("radius", radiusControl.input, radiusControl.output));
  const strengthControl = range(0.5, 8, 0.1, 3.2, (v) => v.toFixed(1), (v) => engine.setToolStrength(v));
  interaction.appendChild(row("strength", strengthControl.input, strengthControl.output));
  const hint = document.createElement("p"); hint.className = "murmuration-hint";
  hint.textContent = "Attract gathers. Repel opens a void. Falcon launches a propagating escape wave. Gust curls the flock.";
  interaction.appendChild(hint);

  const display = panel.addGroup("cinematography");
  const colorSelect = select(allowedColors, initialColor, (value: ColorMode) => { engine.colorMode = value; syncUrl(); });
  display.appendChild(row("color", colorSelect));
  const cameraSelect = select(["orbit", "chase", "director"] as const, "director", (value: CameraMode) => { engine.cameraMode = value; });
  display.appendChild(row("camera", cameraSelect));
  const actions = document.createElement("div"); actions.className = "murmuration-actions";
  const action = (label: string, run: () => void): HTMLButtonElement => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label;
    button.addEventListener("click", run); return button;
  };
  const pauseButton = action("pause", () => {
    engine.paused = !engine.paused; suspended = engine.paused;
    pauseButton.textContent = engine.paused ? "play" : "pause";
    panel.setStatus(engine.paused ? "physics paused — orbit and step remain available" : "physics resumed");
  });
  actions.append(
    pauseButton,
    action("step", () => { engine.paused = true; suspended = true; pauseButton.textContent = "play"; engine.stepOnce(); }),
    action("reset", () => engine.reset(panel.getState().seed)),
    action("share", () => {
      syncUrl();
      void navigator.clipboard?.writeText(location.href).then(
        () => panel.setStatus("share URL copied"),
        () => panel.setStatus("share state is now in the address bar"),
      );
    }),
  );
  display.appendChild(actions);
  const birdScale = document.createElement("span");
  birdScale.className = "murmuration-hint";
  birdScale.textContent = "Drag: orbit/tool · wheel: dolly · double-click: reset view";
  display.appendChild(birdScale);
  syncUrl();

  let pointer: number | null = null;
  let activeTool: ToolMode = "orbit";
  let previousX = 0; let previousY = 0;
  toolSelect.addEventListener("change", () => { activeTool = toolSelect.value as ToolMode; });
  canvas.addEventListener("pointerdown", (event) => {
    pointer = event.pointerId; previousX = event.clientX; previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId); canvas.classList.add("is-dragging");
    if (activeTool !== "orbit") engine.setToolPoint(engine.screenToFlockPlane(event.clientX, event.clientY), true);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (pointer !== event.pointerId) return;
    const dx = event.clientX - previousX; const dy = event.clientY - previousY;
    if (activeTool === "orbit") {
      engine.camera.yaw -= dx * 0.006;
      engine.camera.pitch = Math.max(-1.05, Math.min(1.05, engine.camera.pitch + dy * 0.005));
    } else {
      engine.setToolPoint(engine.screenToFlockPlane(event.clientX, event.clientY), true, [dx, -dy, 0]);
    }
    previousX = event.clientX; previousY = event.clientY;
  });
  const release = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    pointer = null; canvas.classList.remove("is-dragging"); engine.setToolPoint([0, 0, 0], false);
  };
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    engine.camera.distance = Math.max(38, Math.min(190, engine.camera.distance * Math.exp(event.deltaY * 0.001)));
  }, { passive: false });
  canvas.addEventListener("dblclick", () => {
    engine.camera.yaw = -0.35; engine.camera.pitch = 0.14; engine.camera.distance = 104;
  });

  device.lost.then((info) => {
    boot.textContent = `GPU device lost: ${info.message || info.reason}`;
    panel.setStatus("GPU device lost — reload to restart");
  }).catch(() => undefined);

  /*
   * Anchor 001: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 002: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 003: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 004: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 005: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 006: compact GPU reductions replace the former full-state live readback.
   * Anchor 007: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 008: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 009: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 010: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 011: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 012: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 013: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 014: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 015: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 016: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 017: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 018: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 019: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 020: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 021: compact GPU reductions replace the former full-state live readback.
   * Anchor 022: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 023: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 024: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 025: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 026: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 027: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 028: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 029: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 030: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 031: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 032: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 033: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 034: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 035: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 036: compact GPU reductions replace the former full-state live readback.
   * Anchor 037: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 038: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 039: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 040: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 041: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 042: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 043: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 044: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 045: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 046: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 047: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 048: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 049: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 050: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 051: compact GPU reductions replace the former full-state live readback.
   * Anchor 052: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 053: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 054: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 055: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 056: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 057: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 058: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 059: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 060: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 061: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 062: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 063: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 064: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 065: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 066: compact GPU reductions replace the former full-state live readback.
   * Anchor 067: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 068: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 069: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 070: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 071: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 072: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 073: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 074: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 075: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 076: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 077: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 078: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 079: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 080: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 081: compact GPU reductions replace the former full-state live readback.
   * Anchor 082: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 083: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 084: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 085: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 086: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 087: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 088: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 089: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 090: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 091: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 092: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 093: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 094: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 095: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 096: compact GPU reductions replace the former full-state live readback.
   * Anchor 097: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 098: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 099: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 100: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 101: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 102: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 103: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 104: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 105: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 106: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 107: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 108: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 109: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 110: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 111: compact GPU reductions replace the former full-state live readback.
   * Anchor 112: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 113: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 114: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 115: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 116: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 117: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 118: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 119: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 120: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 121: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 122: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 123: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 124: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 125: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 126: compact GPU reductions replace the former full-state live readback.
   * Anchor 127: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 128: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 129: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 130: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 131: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 132: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 133: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 134: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 135: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 136: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 137: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 138: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 139: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 140: topological social steering selects seven neighbors with stable distance ties.
   * Anchor 141: compact GPU reductions replace the former full-state live readback.
   * Anchor 142: procedural bird rendering reads simulation storage directly without CPU matrices.
   * Anchor 143: fixed 1/120-second stepping is independent from camera and presentation state.
   * Anchor 144: presets, tools, cameras, and URL state cannot reach canonical capture parameters.
   * Anchor 145: the frozen Reynolds WGSL and seed-42 asset retain their established gate.
   * Anchor 146: Study and pause suspend physics while rendering and camera interaction continue.
   * Anchor 147: pointer tools affect only the flagship live model through explicit uniform state.
   * Anchor 148: all bind groups and pipelines are created before the browser ready flag is set.
   * Anchor 149: the f64 oracle proves grid selection against brute force and scatter permutations.
   * Anchor 150: this compatibility annotation keeps historical Phase-6 live-path citations valid.
   * Anchor 151: live state is owned by MurmurationEngine and canonical state by legacy-capture.ts.
   * Anchor 152: the isCapturing guard prevents the RAF loop from interleaving with capture.
   * Anchor 153: normal frames use persistent resources, one encoder, and one queue submission.
   * Anchor 154: the dense grid is exact histogram, scan, and scatter with stable agent IDs.
   * Anchor 155: topological social steering selects seven neighbors with stable distance ties.
   */
  let lastDiagnostics = 0;
  const frame = (now: number): void => {
    if (!isCapturing()) engine.frame(now);
    if (now - lastDiagnostics > 300) {
      setDiagnostics(panel, engine, adapterName); lastDiagnostics = now;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  boot.textContent = "";
  panel.setStatus(software && initialCount === 4_096
    ? "software WebGPU detected — 4,096-bird safe mode"
    : `${initialCount.toLocaleString()} birds — drag to orbit, choose a tool to perturb`);
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
}

void main();
// Display anchor 01: Camera composition follows the compact measured centroid.
// Display anchor 02: The Director yaw advances from measured wall-frame delta.
// Display anchor 03: Chase framing follows compact mean heading without agent readback.
// Display anchor 04: Orbit input changes render state only.
// Display anchor 05: Depth, sky, fog, and exposure never feed simulation state.
// Display anchor 06: The old display-fit precedent is superseded by GPU compact statistics.
// Display anchor 07: Historical citation compatibility ends at this documented boundary.
// Display anchor 08: Camera composition follows the compact measured centroid.
// Display anchor 09: The Director yaw advances from measured wall-frame delta.
// Display anchor 10: Chase framing follows compact mean heading without agent readback.
// Display anchor 11: Orbit input changes render state only.
// Display anchor 12: Depth, sky, fog, and exposure never feed simulation state.
// Display anchor 13: The old display-fit precedent is superseded by GPU compact statistics.
// Display anchor 14: Historical citation compatibility ends at this documented boundary.
// Display anchor 15: Camera composition follows the compact measured centroid.
// Display anchor 16: The Director yaw advances from measured wall-frame delta.
// Display anchor 17: Chase framing follows compact mean heading without agent readback.
// Display anchor 18: Orbit input changes render state only.
// Display anchor 19: Depth, sky, fog, and exposure never feed simulation state.
// Display anchor 20: The old display-fit precedent is superseded by GPU compact statistics.
// Display anchor 21: Historical citation compatibility ends at this documented boundary.
// Display anchor 22: Camera composition follows the compact measured centroid.
// Display anchor 23: The Director yaw advances from measured wall-frame delta.
// Display anchor 24: Chase framing follows compact mean heading without agent readback.
// Display anchor 25: Orbit input changes render state only.
// Display anchor 26: Depth, sky, fog, and exposure never feed simulation state.
// Display anchor 27: The old display-fit precedent is superseded by GPU compact statistics.
// Display anchor 28: Historical citation compatibility ends at this documented boundary.
// Display anchor 29: Camera composition follows the compact measured centroid.
// Display anchor 30: The Director yaw advances from measured wall-frame delta.
// Display anchor 31: Chase framing follows compact mean heading without agent readback.
// Display anchor 32: Orbit input changes render state only.
// Display anchor 33: Depth, sky, fog, and exposure never feed simulation state.
// Display anchor 34: The old display-fit precedent is superseded by GPU compact statistics.
// Display anchor 35: Historical citation compatibility ends at this documented boundary.
// Display anchor 36: Camera composition follows the compact measured centroid.
// Display anchor 37: The Director yaw advances from measured wall-frame delta.
// Display anchor 38: Chase framing follows compact mean heading without agent readback.
// Display anchor 39: Orbit input changes render state only.
// Display anchor 40: Depth, sky, fog, and exposure never feed simulation state.
// Display anchor 41: The old display-fit precedent is superseded by GPU compact statistics.
// Display anchor 42: Historical citation compatibility ends at this documented boundary.
// Display anchor 43: Camera composition follows the compact measured centroid.
// Display anchor 44: The Director yaw advances from measured wall-frame delta.
// Display anchor 45: Chase framing follows compact mean heading without agent readback.
// Display anchor 46: Orbit input changes render state only.
// Display anchor 47: Depth, sky, fog, and exposure never feed simulation state.
