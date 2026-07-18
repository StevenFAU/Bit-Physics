import "../../../../common/common-web/src/theme.css";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureBundle } from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";
import { EXPERIMENT_CARDS, makeExperimentMass, scheduleCardTimeline } from "./experiments/cards.js";
import type { ExperimentCard, ExperimentModelControls } from "./experiments/cards.js";
import { MODEL_VARIANT, organismConfig } from "./model/config.js";
import type { BrushEventKind } from "./model/events.js";
import { makeSeededOrganismMass } from "./model/seed.js";
import { FlowLeniaOrganismSolver } from "./model/solver.js";
import type { SolverMetrics } from "./model/solver.js";
import { runM2Gates } from "./prove.js";
import type { M2GateReport } from "./prove.js";
import { runM3Gates } from "./prove-m3.js";
import type { M3GateReport } from "./prove-m3.js";
import { ScientificInspector } from "./render/overlays.js";
import { OrganismRenderer } from "./render/renderer.js";
import type { RenderMode } from "./render/renderer.js";
import "./style.css";

type Tool = "pipette" | "add" | "erase" | "stir" | "inspect";

interface M2Hook {
  runGates: (steps?: number) => Promise<M2GateReport>;
  reset: (seed?: number) => void;
  metrics: () => Promise<SolverMetrics>;
  setRenderMode: (mode: RenderMode) => void;
  latestGateReport: M2GateReport | null;
  grid: number;
  allocatedBytes: number;
  dispatchesPerStep: number;
}

interface M3Hook {
  runGates: () => Promise<M3GateReport>;
  loadExperiment: (id: string) => Promise<void>;
  queueEvent: (kind: BrushEventKind, row: number, column: number) => void;
  listExperiments: () => readonly string[];
  latestGateReport: M3GateReport | null;
}

const boot = document.getElementById("boot") as HTMLDivElement;
const stage = document.getElementById("organism-lab") as HTMLElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;
const legend = document.getElementById("legend") as HTMLDivElement;
const ledgerHud = document.getElementById("ledger") as HTMLDivElement;
const perfHud = document.getElementById("perf") as HTMLDivElement;
const compareLabel = document.getElementById("compare-label") as HTMLDivElement;
const experimentNote = document.getElementById("experiment-note") as HTMLDivElement;
const inspectorHost = document.getElementById("inspector-host") as HTMLDivElement;
const touchTools = document.getElementById("touch-tools") as HTMLDivElement;
const m0Probe = document.getElementById("m0-probe") as HTMLElement;
m0Probe.hidden = true;

const RENDER_MODES: readonly RenderMode[] = ["density", "channels", "affinity", "flow", "pressure", "flux"];
const LEGEND_TEXT: Record<RenderMode, string> = {
  density: "organism glow · density ρ fixed scale 0 → 2",
  channels: "mass channels · C₀/C₁/C₂ direct RGB",
  affinity: "affinity V₀ · diverging scale −1.5 → +1.5",
  flow: "displacement dt·F₀ · direction hue, magnitude 0 → 0.8",
  pressure: "pressure gate α₀ 0 → 1 · density-gradient intensity",
  flux: "mass × displacement · cyan 0 → 1; red = clamp",
};

function setBoot(message: string): void {
  boot.textContent = message;
  boot.style.display = message ? "block" : "none";
}

function captureBundle(
  state: Float32Array,
  metrics: SolverMetrics,
  n: number,
  seed: number,
  card: ExperimentCard,
  started: number,
): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "flow-lenia", category: "continuous-ca", variant: MODEL_VARIANT },
      stack: { name: "webgpu-f32", version: "0.3.0", build_id: "flow-lenia-visual-lab-m3" },
      config: {
        tier: n === 256 ? "reference" : "test",
        dims: [n, n],
        dtype: "f32",
        seed,
        params: {
          channels: 3,
          kernels: 9,
          dt: 0.2,
          dd: 5,
          sigma: card.model.sigma,
          theta_A: card.model.pressure ? 2 : "disabled-ablation",
          density_exponent: 2,
          experiment: card.id,
          scheduled_events: card.timeline.length,
          ledger_added: metrics.ledgerAdded,
          ledger_removed: metrics.ledgerRemoved,
        },
      },
      run: { step_count: metrics.step, capture_interval: metrics.step, wall_clock_seconds: (performance.now() - started) / 1000, start_utc: new Date().toISOString() },
      payload: { format: "hdf5", path: `flow-lenia-${card.id}-${n}sq-seed${seed}-step${metrics.step}.h5`, checksum: `sha256:${"0".repeat(64)}` },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: metrics.ledgerAdded > 0 || metrics.ledgerRemoved > 0, subgroup_ops: false },
    },
    steps: [{
      step: metrics.step,
      state: { mass: field(state, [3, n, n], "f32") },
      diagnostics: {
        total_mass: metrics.totalMass,
        expected_mass: metrics.expectedMass,
        open_added: metrics.ledgerAdded,
        open_removed: metrics.ledgerRemoved,
        mass_ledger_error: metrics.ledgerError,
        mass_relative_drift: metrics.relativeMassDrift,
        min_density: metrics.minDensity,
        max_density: metrics.maxDensity,
        occupied_fraction: metrics.occupiedFraction,
        max_flow: metrics.maxFlow,
        max_displacement: metrics.maxDisplacement,
        clamp_fraction: metrics.clampFraction,
        non_finite: metrics.nonFinite,
        negative: metrics.negative,
      },
    }],
  };
}

function makeButton(label: string, pressed = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-pressed", String(pressed));
  return button;
}

function labeledRange(labelText: string, minimum: number, maximum: number, step: number, value: number): { row: HTMLLabelElement; input: HTMLInputElement; output: HTMLOutputElement } {
  const row = document.createElement("label");
  row.className = "fl-range";
  const label = document.createElement("span");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(minimum);
  input.max = String(maximum);
  input.step = String(step);
  input.value = String(value);
  const output = document.createElement("output");
  output.textContent = String(value);
  row.append(label, input, output);
  return { row, input, output };
}

function diagnosticRows(metrics: SolverMetrics, solver: FlowLeniaOrganismSolver, frameMs: number, comparison?: SolverMetrics): Array<{ label: string; value: string }> {
  const rows = [
    { label: "step", value: metrics.step.toLocaleString() },
    { label: "mass / expected", value: `${metrics.totalMass.toFixed(4)} / ${metrics.expectedMass.toFixed(4)}` },
    { label: "open ledger + / −", value: `${metrics.ledgerAdded.toFixed(3)} / ${metrics.ledgerRemoved.toFixed(3)}` },
    { label: "ledger error / relative", value: `${metrics.ledgerError.toExponential(2)} / ${metrics.relativeMassDrift.toExponential(2)}` },
    { label: "channel mass", value: metrics.channelMass.map((value) => value.toFixed(2)).join(" · ") },
    { label: "density min / max", value: `${metrics.minDensity.toFixed(4)} / ${metrics.maxDensity.toFixed(4)}` },
    { label: "max flow / displacement", value: `${metrics.maxFlow.toFixed(3)} / ${metrics.maxDisplacement.toFixed(3)}` },
    { label: "clamp / occupied", value: `${(100 * metrics.clampFraction).toFixed(3)}% / ${(100 * metrics.occupiedFraction).toFixed(1)}%` },
    { label: "finite / non-negative", value: metrics.nonFinite === 0 && metrics.negative === 0 ? "PASS" : `FAIL ${metrics.nonFinite}/${metrics.negative}` },
    { label: "frame CPU / GPU allocation", value: `${frameMs.toFixed(2)} ms / ${(solver.allocatedBytes / 2 ** 20).toFixed(2)} MiB` },
    { label: "core dispatches / step", value: String(solver.dispatchesPerStep) },
  ];
  if (comparison) rows.splice(7, 0, { label: "comparison peak / occupied", value: `${comparison.maxDensity.toFixed(3)} / ${(100 * comparison.occupiedFraction).toFixed(1)}%` });
  return rows;
}

async function start(): Promise<void> {
  setBoot("requesting WebGPU adapter…");
  if (!navigator.gpu) throw new Error("WebGPU unavailable in this browser");
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter unavailable");
  const device = await adapter.requestDevice();
  const adapterInfo = adapter.info;
  const gateEnvironment: M2GateReport["environment"] = {
    userAgent: navigator.userAgent,
    adapter: {
      vendor: adapterInfo.vendor ?? "unknown",
      architecture: adapterInfo.architecture ?? "unknown",
      device: adapterInfo.device ?? "unknown",
      description: adapterInfo.description ?? "unknown",
    },
  };
  device.addEventListener("uncapturederror", (event) => {
    const message = (event as GPUUncapturedErrorEvent).error.message;
    console.error(`Flow Lenia M3 WebGPU error: ${message}`);
    setBoot(`GPU error: ${message}`);
  });
  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) throw new Error("WebGPU canvas context unavailable");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  const query = new URLSearchParams(location.search);
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const adaptive = matchMedia("(max-width: 720px)").matches || deviceMemory < 4;
  const requested = Number.parseInt(query.get("grid") ?? (adaptive ? "128" : "256"), 10);
  const n = requested === 128 ? 128 : 256;
  const config = organismConfig(n, 42);
  setBoot(`compiling the ${n}² organism solver…`);
  const solver = await FlowLeniaOrganismSolver.create(device, config);
  const renderer = new OrganismRenderer(device, context, canvas, format, solver);
  const inspector = new ScientificInspector(inspectorHost);
  let comparisonSolver: FlowLeniaOrganismSolver | null = null;
  let currentCard = EXPERIMENT_CARDS[0] as ExperimentCard;
  let seed = 42;
  let paused = query.get("gate") === "1";
  let speed = 1;
  let timeAccumulator = 0;
  let selectedTool: Tool = "pipette";
  let brushRadius = Math.max(4, n / 22);
  let brushStrength = 1;
  let selectedChannel = 3;
  let inspectPosition: readonly [number, number] = [n / 2, n / 2];
  let telemetryPending = false;
  let inspectionPending = false;
  let inspectionToken = 0;
  let lastTelemetry = 0;
  let lastFrame = performance.now();
  let frameMs = 0;
  let panel!: PanelShell;
  let loadingCard = 0;

  const applyModel = (target: FlowLeniaOrganismSolver, controls: ExperimentModelControls): void => {
    target.setPressureEnabled(controls.pressure);
    target.setSquareHalfWidth(controls.sigma);
  };

  const resetTarget = (target: FlowLeniaOrganismSolver, card: ExperimentCard, nextSeed: number, controls: ExperimentModelControls): void => {
    target.reset(makeExperimentMass(n, card, nextSeed));
    applyModel(target, controls);
    for (const event of scheduleCardTimeline(card, n)) target.queueEvent(event);
  };

  const resetActive = (nextSeed = seed): void => {
    seed = nextSeed >>> 0;
    resetTarget(solver, currentCard, seed, currentCard.model);
    if (currentCard.comparison && comparisonSolver) resetTarget(comparisonSolver, currentCard, seed, currentCard.comparison.model);
    renderer.clearTrails();
  };

  const setCameraFromCard = (card: ExperimentCard): void => {
    renderer.setCamera({ centerRow: card.camera.center[0] * n, centerColumn: card.camera.center[1] * n, zoom: card.camera.zoom });
  };

  const stepBoth = (count = 1): void => {
    solver.step(count);
    if (renderer.hasComparison() && comparisonSolver) comparisonSolver.step(count);
  };

  const updateInspection = async (row: number, column: number): Promise<void> => {
    inspectPosition = [row, column];
    renderer.setInspection(row, column, brushRadius);
    const token = ++inspectionToken;
    if (inspectionPending) return;
    inspectionPending = true;
    try {
      const reading = await solver.inspect(row, column);
      if (token === inspectionToken) inspector.update(reading);
    } finally {
      inspectionPending = false;
      if (token !== inspectionToken) void updateInspection(inspectPosition[0], inspectPosition[1]);
    }
  };

  const loadExperiment = async (card: ExperimentCard): Promise<void> => {
    const generation = ++loadingCard;
    panel?.setStatus(`loading ${card.title}…`);
    currentCard = card;
    if (card.comparison && !comparisonSolver) {
      setBoot("compiling synchronized comparison solver…");
      comparisonSolver = await FlowLeniaOrganismSolver.create(device, config);
      if (generation !== loadingCard) return;
    }
    resetActive(seed);
    renderer.setComparisonSolver(card.comparison ? comparisonSolver : null);
    stepBoth();
    setCameraFromCard(card);
    setRenderMode(card.view);
    compareLabel.hidden = !card.comparison;
    compareLabel.textContent = card.comparison ? `LEFT · ${card.model.pressure ? "reference pressure" : `σ ${card.model.sigma}`}  |  RIGHT · ${card.comparison.label}` : "";
    experimentNote.innerHTML = `<b>${card.title}</b><span>${card.description}</span><small>${card.observation}</small>`;
    document.querySelectorAll<HTMLButtonElement>("[data-experiment]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.experiment === card.id)));
    panel?.setNarration(`${card.title} · ${card.observation}`, "event");
    panel?.setStatus(`${card.title} reset exactly at seed ${seed}`);
    setBoot("");
  };

  resetActive();
  solver.step();

  const updateMetrics = async (): Promise<SolverMetrics> => {
    const metrics = await solver.metrics();
    const comparison = renderer.hasComparison() && comparisonSolver ? await comparisonSolver.metrics() : undefined;
    panel.setDiagnostics(diagnosticRows(metrics, solver, frameMs, comparison));
    ledgerHud.textContent = `ledger ${metrics.totalMass.toFixed(2)} = ${metrics.expectedMass.toFixed(2)} · ε ${metrics.ledgerError.toExponential(1)}`;
    perfHud.textContent = `${frameMs.toFixed(1)} ms frame · ${speed.toFixed(2)}× · ${n}²${comparison ? " × 2" : ""}`;
    const pass = metrics.relativeMassDrift <= 8e-5 && metrics.nonFinite === 0 && metrics.negative === 0;
    panel.setVerdict({ gate: "open-tool ledger + finite/non-negative state", verdict: pass ? "PASS" : "FAIL", pass });
    return metrics;
  };

  const makeCapture = async (): Promise<void> => {
    panel.setCaptureEnabled(false);
    panel.setStatus(`resetting ${currentCard.title} and running 32 canonical steps…`);
    resetCapture();
    const started = performance.now();
    resetActive(panel.getState().seed);
    stepBoth(32);
    await device.queue.onSubmittedWorkDone();
    const [readback, metrics] = await Promise.all([solver.readback(), solver.metrics()]);
    exposeCapture(captureBundle(readback.mass, metrics, n, seed, currentCard, started), { download: false });
    panel.setStatus(`capture ready — ${currentCard.title}, seed ${seed}, step ${metrics.step}, ledger ε ${metrics.ledgerError.toExponential(2)}`);
    panel.setCaptureEnabled(true);
  };

  panel = createSettingsPanel("Flow Lenia · Visual Lab", {
    caption: "Form and perturb conservative Flow Lenia matter, then inspect how affinity, density pressure, and finite-square transport create motion.",
    initial: { tier: n === 256 ? "reference" : "test", seed },
    tiers: n === 256 ? ["reference"] : ["test"],
    onCapture: makeCapture,
    onChange: (state) => { seed = state.seed >>> 0; void loadExperiment(currentCard); },
    modes: { initial: paused ? "study" : "play", onMode: (mode) => { paused = mode === "study"; } },
    study: {
      diagnostics: [
        { label: "grid", value: `${n}²` },
        { label: "model", value: MODEL_VARIANT },
        { label: "kernel normalization", value: solver.spatialKernelSums.every((sum) => Math.abs(sum - 1) < 2e-6) ? "PASS" : "FAIL" },
      ],
      honesty: {
        faithful: "three-channel/nine-kernel spectral perception, bell affinity, Sobel density pressure, component-clamped flow, and exact finite-square destination gather",
        simplified: "this organism specialization keeps global parameters and allocates no genomes. Localized inheritance and lineage live in Ecosystem Lab; editable soft-affinity environments live in Arena Lab",
        measured: "open brushes use a GPU atomic fixed-point ledger; metrics and inspection read back only at low cadence or on explicit sampling",
      },
      verdict: { gate: "M3 event, ledger, card, and render-integrity gates", verdict: "RUN TO VERIFY", pass: false },
      links: [
        { label: "model specification", href: "../../../../docs/sim-specs/continuous-ca/lenia/spec-web-ecosystem.md" },
        { label: "implementation ledger", href: "../../../../docs/sim-specs/continuous-ca/lenia/implementation-plan.md" },
      ],
    },
  });

  const experimentGroup = panel.addGroup("experiments", { hint: "Six authored, exact-seed organism and ablation cards. Compare cards run synchronized solvers." });
  const experimentGrid = document.createElement("div");
  experimentGrid.className = "fl-experiment-grid";
  for (const card of EXPERIMENT_CARDS) {
    const button = makeButton(card.title, card === currentCard);
    button.className = "fl-experiment-card";
    button.dataset.experiment = card.id;
    button.title = `${card.description} Expected observation: ${card.observation}`;
    const small = document.createElement("small");
    small.textContent = card.short;
    button.appendChild(small);
    button.addEventListener("click", () => { void loadExperiment(card); });
    experimentGrid.appendChild(button);
  }
  experimentGroup.appendChild(experimentGrid);

  const timeGroup = panel.addGroup("time + camera", { hint: "Fixed scientific steps; trails and camera are presentation-only." });
  const timeControls = document.createElement("div");
  timeControls.className = "fl-controls fl-controls-3";
  const pauseButton = makeButton(paused ? "play" : "pause");
  pauseButton.setAttribute("aria-keyshortcuts", "Space");
  const stepButton = makeButton("step");
  stepButton.setAttribute("aria-keyshortcuts", ".");
  const fitButton = makeButton("fit mass");
  fitButton.setAttribute("aria-keyshortcuts", "F");
  timeControls.append(pauseButton, stepButton, fitButton);
  const speedRow = document.createElement("label");
  speedRow.className = "fl-select-row";
  speedRow.textContent = "speed";
  const speedSelect = document.createElement("select");
  for (const value of [0.25, 0.5, 1, 2, 4]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value}×`;
    option.selected = value === speed;
    speedSelect.appendChild(option);
  }
  speedSelect.addEventListener("change", () => { speed = Number(speedSelect.value); });
  speedRow.appendChild(speedSelect);
  const cameraControls = document.createElement("div");
  cameraControls.className = "fl-controls fl-controls-3";
  const zoomOut = makeButton("− zoom");
  const resetCamera = makeButton("reset view");
  const zoomIn = makeButton("+ zoom");
  cameraControls.append(zoomOut, resetCamera, zoomIn);
  timeGroup.append(timeControls, speedRow, cameraControls);

  const toolGroup = panel.addGroup("matter tools", { hint: "Primary applies; secondary reverses; wheel changes radius; Shift doubles strength; Alt samples." });
  const toolControls = document.createElement("div");
  toolControls.className = "fl-controls fl-tool-controls";
  const toolButtons = new Map<Tool, HTMLButtonElement>();
  (["pipette", "add", "erase", "stir", "inspect"] as const).forEach((tool, index) => {
    const button = makeButton(tool, tool === selectedTool);
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    button.addEventListener("click", () => selectTool(tool));
    toolButtons.set(tool, button);
    toolControls.appendChild(button);
  });
  const radiusControl = labeledRange("radius", 2, Math.floor(n / 3), 1, Math.round(brushRadius));
  const strengthControl = labeledRange("strength", 0.25, 2, 0.05, brushStrength);
  const channelRow = document.createElement("div");
  channelRow.className = "fl-channel-row";
  const channelButtons = ["C₀", "C₁", "C₂", "mix"].map((label, channel) => {
    const button = makeButton(label, channel === selectedChannel);
    button.addEventListener("click", () => {
      selectedChannel = channel;
      channelButtons.forEach((candidate, candidateChannel) => candidate.setAttribute("aria-pressed", String(candidateChannel === channel)));
      renderer.setChannel(Math.min(channel, 2));
    });
    channelRow.appendChild(button);
    return button;
  });
  toolGroup.append(toolControls, radiusControl.row, strengthControl.row, channelRow);

  const renderGroup = panel.addGroup("scientific view", { open: false, hint: "Effects use separate render textures and read-only scientific bindings." });
  const renderControls = document.createElement("div");
  renderControls.className = "fl-controls fl-controls-3";
  const renderButtons = new Map<RenderMode, HTMLButtonElement>();
  for (const mode of RENDER_MODES) {
    const button = makeButton(mode, mode === "density");
    button.dataset.renderMode = mode;
    button.addEventListener("click", () => setRenderMode(mode));
    renderButtons.set(mode, button);
    renderControls.appendChild(button);
  }
  const exposureControl = labeledRange("exposure", 0.4, 3, 0.05, 1.65);
  const trailControl = labeledRange("trail persistence", 0, 0.97, 0.01, 0.84);
  const overlayControls = document.createElement("div");
  overlayControls.className = "fl-controls";
  const contourButton = makeButton("contours", false);
  const glyphButton = makeButton("flow glyphs", false);
  overlayControls.append(contourButton, glyphButton);
  renderGroup.append(renderControls, exposureControl.row, trailControl.row, overlayControls);

  const proveGroup = panel.addGroup("PROVE", { open: false, hint: "M2 preserves model numerics; M3 adds event determinism, ledger, six-card, and render-only integrity gates." });
  const proveM3Button = document.createElement("button");
  proveM3Button.type = "button";
  proveM3Button.className = "fl-prove-button";
  proveM3Button.textContent = "Run M3 laboratory gates";
  const proveM2Button = document.createElement("button");
  proveM2Button.type = "button";
  proveM2Button.className = "fl-prove-button fl-secondary";
  proveM2Button.textContent = "Re-run M2 scientific gates";
  proveGroup.append(proveM3Button, proveM2Button);

  function selectTool(tool: Tool): void {
    selectedTool = tool;
    toolButtons.forEach((button, candidate) => button.setAttribute("aria-pressed", String(candidate === tool)));
    canvas.dataset.tool = tool;
    panel.setNarration(`${tool} selected · ${tool === "inspect" ? "read-only lens" : "events apply at the next fixed step boundary"}`);
    touchTools.hidden = true;
  }

  function setRenderMode(mode: RenderMode): void {
    renderer.setMode(mode);
    legend.textContent = LEGEND_TEXT[mode];
    renderButtons.forEach((button, candidate) => button.setAttribute("aria-pressed", String(candidate === mode)));
  }

  const setPaused = (next: boolean): void => {
    paused = next;
    pauseButton.textContent = paused ? "play" : "pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
  };

  const advanceOnce = (): void => {
    if (isCapturing()) return;
    stepBoth();
    renderer.render();
  };

  const fitOccupied = async (): Promise<void> => {
    const state = await solver.readback();
    let minRow = n; let maxRow = 0; let minColumn = n; let maxColumn = 0; let found = false;
    for (let row = 0; row < n; row += 1) for (let column = 0; column < n; column += 1) {
      const cell = row * n + column;
      const density = (state.mass[cell] as number) + (state.mass[n * n + cell] as number) + (state.mass[2 * n * n + cell] as number);
      if (density > 1e-3) { found = true; minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row); minColumn = Math.min(minColumn, column); maxColumn = Math.max(maxColumn, column); }
    }
    if (!found) return;
    const span = Math.max(12, maxRow - minRow + 1, maxColumn - minColumn + 1);
    renderer.setCamera({ centerRow: (minRow + maxRow) / 2, centerColumn: (minColumn + maxColumn) / 2, zoom: Math.min(8, n / (span * 1.22)) });
  };

  pauseButton.addEventListener("click", () => setPaused(!paused));
  stepButton.addEventListener("click", advanceOnce);
  fitButton.addEventListener("click", () => { void fitOccupied(); });
  zoomOut.addEventListener("click", () => renderer.zoom(0.8));
  zoomIn.addEventListener("click", () => renderer.zoom(1.25));
  resetCamera.addEventListener("click", () => setCameraFromCard(currentCard));
  radiusControl.input.addEventListener("input", () => { brushRadius = Number(radiusControl.input.value); radiusControl.output.textContent = brushRadius.toFixed(0); renderer.setInspection(inspectPosition[0], inspectPosition[1], brushRadius); });
  strengthControl.input.addEventListener("input", () => { brushStrength = Number(strengthControl.input.value); strengthControl.output.textContent = brushStrength.toFixed(2); });
  exposureControl.input.addEventListener("input", () => { const value = Number(exposureControl.input.value); exposureControl.output.textContent = value.toFixed(2); renderer.setExposure(value); });
  trailControl.input.addEventListener("input", () => { const value = Number(trailControl.input.value); trailControl.output.textContent = value.toFixed(2); renderer.setTrailPersistence(value); });
  contourButton.addEventListener("click", () => { const enabled = contourButton.getAttribute("aria-pressed") !== "true"; contourButton.setAttribute("aria-pressed", String(enabled)); renderer.setContours(enabled); });
  glyphButton.addEventListener("click", () => { const enabled = glyphButton.getAttribute("aria-pressed") !== "true"; glyphButton.setAttribute("aria-pressed", String(enabled)); renderer.setFlowGlyphs(enabled); });

  const queueToolEvent = (tool: Tool, row: number, column: number, secondary: boolean, shift: boolean, direction: readonly [number, number] = [0, 0]): void => {
    if (tool === "inspect") { void updateInspection(row, column); return; }
    let kind: BrushEventKind = tool;
    if (tool === "add" && secondary) kind = "erase";
    if (tool === "erase" && secondary) kind = "add";
    const multiplier = brushStrength * (shift ? 2 : 1);
    const strength = kind === "add" ? 0.045 * multiplier
      : kind === "erase" ? 0.18 * multiplier
        : 1.15 * multiplier * n / 256;
    const event = {
      kind,
      x: row,
      y: column,
      radius: brushRadius,
      strength,
      channel: selectedChannel,
      directionX: direction[0],
      directionY: direction[1],
      polarity: secondary ? -1 : 1,
    } as const;
    solver.queueEvent(event);
    if (renderer.hasComparison() && comparisonSolver) comparisonSolver.queueEvent(event);
    panel.setNarration(`${secondary ? "reverse " : ""}${tool} queued at step ${solver.stepCount} · fixed-boundary ${kind === "add" || kind === "erase" ? "open ledger" : "mass-closed impulse"}`, "event");
    renderer.setInspection(row, column, brushRadius);
    if (paused) advanceOnce();
  };

  let panning = false;
  let spaceHeld = false;
  let previousPointer: { x: number; y: number; row: number; column: number; time: number } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;
  let longPressTimer = 0;

  const showTouchTools = (clientX: number, clientY: number): void => {
    const rect = stage.getBoundingClientRect();
    touchTools.style.left = `${clientX - rect.left}px`;
    touchTools.style.top = `${clientY - rect.top}px`;
    touchTools.hidden = false;
  };
  for (const tool of ["pipette", "add", "erase", "stir", "inspect"] as const) {
    const button = makeButton(tool, tool === selectedTool);
    button.addEventListener("click", (event) => { event.stopPropagation(); selectTool(tool); });
    touchTools.appendChild(button);
  }

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const pair = [...pointers.values()];
      pinchDistance = Math.hypot((pair[0]?.x ?? 0) - (pair[1]?.x ?? 0), (pair[0]?.y ?? 0) - (pair[1]?.y ?? 0));
      return;
    }
    panning = event.button === 1 || spaceHeld;
    const [row, column] = renderer.screenToWorld(event.clientX, event.clientY);
    previousPointer = { x: event.clientX, y: event.clientY, row, column, time: performance.now() };
    if (event.pointerType === "touch") longPressTimer = window.setTimeout(() => showTouchTools(event.clientX, event.clientY), 520);
    if (!panning) {
      if (event.altKey) void updateInspection(row, column);
      else queueToolEvent(selectedTool, row, column, event.button === 2, event.shiftKey);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      window.clearTimeout(longPressTimer);
      const pair = [...pointers.values()];
      const distance = Math.hypot((pair[0]?.x ?? 0) - (pair[1]?.x ?? 0), (pair[0]?.y ?? 0) - (pair[1]?.y ?? 0));
      if (pinchDistance > 0) renderer.zoom(distance / pinchDistance);
      pinchDistance = distance;
      return;
    }
    if (!previousPointer) return;
    const [row, column] = renderer.screenToWorld(event.clientX, event.clientY);
    const movedPixels = Math.hypot(event.clientX - previousPointer.x, event.clientY - previousPointer.y);
    if (movedPixels > 8) window.clearTimeout(longPressTimer);
    if (panning) {
      const rect = canvas.getBoundingClientRect();
      const camera = renderer.getCamera();
      renderer.pan(-(event.clientY - previousPointer.y) / rect.height * n / camera.zoom, -(event.clientX - previousPointer.x) / rect.width * n / camera.zoom);
    } else if (event.buttons !== 0 && performance.now() - previousPointer.time > 28 && movedPixels > 3) {
      const direction: readonly [number, number] = [row - previousPointer.row, column - previousPointer.column];
      if (event.altKey) void updateInspection(row, column);
      else queueToolEvent(selectedTool, row, column, (event.buttons & 2) !== 0, event.shiftKey, direction);
      previousPointer.time = performance.now();
    } else if (selectedTool === "inspect") {
      void updateInspection(row, column);
    } else {
      renderer.setInspection(row, column, brushRadius);
      inspectPosition = [row, column];
    }
    previousPointer = { x: event.clientX, y: event.clientY, row, column, time: previousPointer.time };
  });
  const endPointer = (event: PointerEvent): void => {
    window.clearTimeout(longPressTimer);
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    panning = false;
    previousPointer = null;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) renderer.zoom(Math.exp(-event.deltaY * 0.002));
    else {
      brushRadius = Math.max(2, Math.min(n / 3, brushRadius * Math.exp(-event.deltaY * 0.0015)));
      radiusControl.input.value = String(Math.round(brushRadius));
      radiusControl.output.textContent = brushRadius.toFixed(0);
      renderer.setInspection(inspectPosition[0], inspectPosition[1], brushRadius);
    }
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
    if (event.key === " ") { event.preventDefault(); spaceHeld = true; setPaused(!paused); }
    else if (event.key === ".") advanceOnce();
    else if (event.key >= "1" && event.key <= "5") selectTool((["pipette", "add", "erase", "stir", "inspect"] as const)[Number(event.key) - 1] as Tool);
    else if (event.key.toLowerCase() === "r") { resetActive(); stepBoth(); }
    else if (event.key.toLowerCase() === "f") void fitOccupied();
    else if (event.key === "+" || event.key === "=") renderer.zoom(1.25);
    else if (event.key === "-") renderer.zoom(0.8);
    else if (event.key.toLowerCase() === "c") contourButton.click();
    else if (event.key.toLowerCase() === "g") glyphButton.click();
    else if (event.key === "Enter") queueToolEvent(selectedTool, inspectPosition[0], inspectPosition[1], false, event.shiftKey);
    else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const delta = event.shiftKey ? 5 : 1;
      const row = inspectPosition[0] + (event.key === "ArrowDown" ? delta : event.key === "ArrowUp" ? -delta : 0);
      const column = inspectPosition[1] + (event.key === "ArrowRight" ? delta : event.key === "ArrowLeft" ? -delta : 0);
      void updateInspection((row + n) % n, (column + n) % n);
    } else if (event.key === "Escape") touchTools.hidden = true;
  });
  document.addEventListener("keyup", (event) => { if (event.key === " ") spaceHeld = false; });

  const renderOnlyIntegrityCheck = async (): Promise<boolean> => {
    const before = (await solver.readback()).mass;
    const state = renderer.getPresentationState();
    renderer.setMode("pressure"); renderer.setContours(true); renderer.setFlowGlyphs(true); renderer.setTrailPersistence(0.91); renderer.zoom(1.17);
    for (let frame = 0; frame < 8; frame += 1) renderer.render();
    await device.queue.onSubmittedWorkDone();
    const after = (await solver.readback()).mass;
    renderer.restorePresentationState(state);
    if (before.length !== after.length) return false;
    for (let index = 0; index < before.length; index += 1) if (before[index] !== after[index]) return false;
    return true;
  };

  const productSurfaceCheck = (): M3GateReport["productSurface"] => {
    const result = {
      experiments: document.querySelectorAll("[data-experiment]").length,
      tools: toolButtons.size,
      scientificViews: document.querySelectorAll("[data-render-mode]").length,
      inspectorPlots: inspector.element.querySelectorAll("canvas").length,
      keyboardFocus: canvas.tabIndex === 0 && canvas.getAttribute("aria-describedby") === "lab-help",
      touchRadialTools: touchTools.querySelectorAll("button").length,
      pass: false,
    };
    result.pass = result.experiments === 6 && result.tools === 5 && result.scientificViews === 6
      && result.inspectorPlots === 2 && result.keyboardFocus && result.touchRadialTools === 5;
    return result;
  };

  const m2Hook: M2Hook = {
    latestGateReport: null,
    grid: n,
    allocatedBytes: solver.allocatedBytes,
    dispatchesPerStep: solver.dispatchesPerStep,
    reset: (nextSeed = seed) => { solver.reset(makeSeededOrganismMass(n, nextSeed)); solver.setPressureEnabled(true); solver.setSquareHalfWidth(0.65); solver.step(); },
    metrics: () => solver.metrics(),
    setRenderMode,
    runGates: async (steps = 256) => {
      panel.setStatus(`running M2 gates (2 × ${steps} structural steps)…`);
      proveM2Button.disabled = true;
      const wasPaused = paused; setPaused(true);
      try {
        const report = await runM2Gates(device, steps, gateEnvironment);
        m2Hook.latestGateReport = report;
        panel.setStatus(report.pass ? "M2 numerical and structural gates PASS" : "M2 gate failure — inspect report hook");
        return report;
      } finally { setPaused(wasPaused); proveM2Button.disabled = false; }
    },
  };
  (globalThis as typeof globalThis & { __flowLeniaM2?: M2Hook }).__flowLeniaM2 = m2Hook;

  const m3Hook: M3Hook = {
    latestGateReport: null,
    listExperiments: () => EXPERIMENT_CARDS.map((card) => card.id),
    loadExperiment: async (id) => { const card = EXPERIMENT_CARDS.find((candidate) => candidate.id === id); if (!card) throw new Error(`unknown experiment ${id}`); await loadExperiment(card); },
    queueEvent: (kind, row, column) => queueToolEvent(kind === "pipette" || kind === "add" || kind === "erase" || kind === "stir" ? kind : "inspect", row, column, false, false),
    runGates: async () => {
      panel.setStatus("running M3 event, ledger, six-card, and render-integrity gates…");
      proveM3Button.disabled = true;
      const wasPaused = paused; setPaused(true);
      try {
        const report = await runM3Gates(device, gateEnvironment, renderOnlyIntegrityCheck, productSurfaceCheck);
        m3Hook.latestGateReport = report;
        panel.setVerdict({ gate: "event determinism + ledger + six cards + render-only integrity", verdict: report.pass ? "PASS" : "FAIL", pass: report.pass });
        panel.setStatus(report.pass ? "M3 laboratory gates PASS" : "M3 gate failure — inspect report hook");
        return report;
      } finally { setPaused(wasPaused); proveM3Button.disabled = false; }
    },
  };
  (globalThis as typeof globalThis & { __flowLeniaM3?: M3Hook }).__flowLeniaM3 = m3Hook;
  proveM2Button.addEventListener("click", () => { void m2Hook.runGates(); });
  proveM3Button.addEventListener("click", () => { void m3Hook.runGates(); });

  await loadExperiment(currentCard);
  selectTool(selectedTool);
  void updateInspection(n / 2, n / 2);
  const frame = (now: number): void => {
    const elapsed = Math.min(100, now - lastFrame);
    lastFrame = now;
    frameMs += 0.08 * (elapsed - frameMs);
    if (!paused && !isCapturing()) {
      timeAccumulator += speed;
      const steps = Math.min(4, Math.floor(timeAccumulator));
      if (steps > 0) { stepBoth(steps); timeAccumulator -= steps; }
    }
    renderer.render();
    if (!telemetryPending && now - lastTelemetry > 750 && !isCapturing()) {
      telemetryPending = true;
      lastTelemetry = now;
      void updateMetrics().finally(() => { telemetryPending = false; });
    }
    requestAnimationFrame(frame);
  };
  renderer.render();
  setBoot("");
  (globalThis as typeof globalThis & { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
  requestAnimationFrame(frame);
}

void start().catch((error: unknown) => {
  console.error(error);
  setBoot(`Flow Lenia M3 failed: ${error instanceof Error ? error.message : String(error)}`);
});
