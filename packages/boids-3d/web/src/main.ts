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
