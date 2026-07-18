import "../../../../common/common-web/src/theme.css";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureBundle } from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { ARENA_CARDS, arenaCardById, makeArenaEnvironment, makeArenaState } from "./experiments/arena-cards.js";
import type { ArenaCard } from "./experiments/arena-cards.js";
import { ARENA_SCHEMA_VERSION } from "./model/arena.js";
import type { ArenaBrushMode } from "./model/arena.js";
import { MODEL_VARIANT, organismConfig } from "./model/config.js";
import { FlowLeniaEcosystemSolver, MIXING_RULES } from "./model/ecosystem-solver.js";
import type { EcosystemInspection, EcosystemMetrics, LineageGraph, MixingRule } from "./model/ecosystem-solver.js";
import { buildArenaExperiment, downloadArenaExperiment, parseArenaExperiment } from "./model/experiment-io.js";
import { arenaShaderSha256 } from "./model/shader-provenance.js";
import { runM6Gates } from "./prove-m6.js";
import type { M6GateReport } from "./prove-m6.js";
import { ArenaRenderer } from "./render/arena-renderer.js";
import type { ArenaView } from "./render/arena-renderer.js";
import "./style.css";

type ArenaTool = "sample" | "mutate" | "attract" | "repel" | "wall" | "erase";

interface M6Hook {
  runGates: () => Promise<M6GateReport>;
  loadExperiment: (id: string) => Promise<void>;
  listExperiments: () => readonly string[];
  step: (count?: number) => void;
  metrics: () => Promise<EcosystemMetrics>;
  exportExperiment: () => Promise<string>;
  importExperiment: (text: string) => Promise<void>;
  latestGateReport: M6GateReport | null;
  allocatedBytes: number;
  grid: number;
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
const kicker = document.querySelector(".fl-hud .fl-kicker") as HTMLParagraphElement;
const m0Probe = document.getElementById("m0-probe") as HTMLElement;
m0Probe.hidden = true; compareLabel.hidden = true;

const VIEW_LABELS: Record<ArenaView, string> = {
  lineage: "lineage ID · soft walls amber · environment never writes mass",
  phenotype: "H/Q projection · approximate phenotype relationship",
  density: "mass channels C₀/C₁/C₂ · direct scientific field",
  flow: "dt·F₀ displacement · direction hue · fixed scale",
  environment: "signed affinity: cyan attract · orange repel · amber soft wall",
};

function setBoot(message: string): void { boot.textContent = message; boot.style.display = message ? "block" : "none"; }
function button(label: string, pressed = false): HTMLButtonElement { const element = document.createElement("button"); element.type = "button"; element.textContent = label; element.setAttribute("aria-pressed", String(pressed)); return element; }
function selectRow(label: string, values: readonly string[], selected: string): { row: HTMLLabelElement; select: HTMLSelectElement } { const row = document.createElement("label"); row.className = "fl-select-row"; row.append(label); const select = document.createElement("select"); for (const value of values) { const option = document.createElement("option"); option.value = value; option.textContent = value; option.selected = value === selected; select.appendChild(option); } row.appendChild(select); return { row, select }; }

function inspectionMarkup(reading: EcosystemInspection): string {
  const lineage = reading.lineage === 0xffff_ffff ? "mixed sentinel" : String(reading.lineage);
  return `<aside class="fl-inspector fl-ecosystem-inspector"><div class="fl-inspector-head"><span>ARENA SAMPLE</span><b>${reading.cell[0]}, ${reading.cell[1]}</b></div><div class="fl-inspect-values"><div class="fl-inspect-row"><span>density ρ</span><output>${reading.density.toFixed(5)}</output></div><div class="fl-inspect-row"><span>lineage / region</span><output>${lineage} / ${reading.region ?? 0}</output></div><div class="fl-inspect-row"><span>environment</span><output>${(reading.environment ?? 0).toFixed(4)}</output></div><div class="fl-inspect-row"><span>affinity V₀…₂</span><output>${reading.affinity.map((value) => value.toFixed(3)).join(" · ")}</output></div><div class="fl-inspect-row"><span>H₀…₂</span><output>${reading.h.slice(0, 3).map((value) => value.toFixed(3)).join(" · ")}</output></div><div class="fl-inspect-row"><span>Q₀…₂</span><output>${reading.q.slice(0, 3).map((value) => value.toFixed(3)).join(" · ")}</output></div></div><p class="fl-inspect-note">Soft walls are negative affinity, not hard collision geometry. Region and lineage labels are operational diagnostics.</p></aside>`;
}

function graphMarkup(graph: LineageGraph): string {
  const nodes = graph.nodes.slice(0, 12);
  const max = Math.max(...nodes.map((node) => node.mass), 1e-9);
  const nodeMarkup = nodes.map((node) => `<div class="fl-lineage-node${node.active ? " is-active" : ""}" style="--mass:${Math.max(0.08, node.mass / max).toFixed(3)}"><span>L${node.lineage}</span><b>${node.mass.toFixed(2)}</b></div>`).join("");
  const edges = graph.edges.slice(-8).map((edge) => `<li>L${edge.parent} → L${edge.child}<span>step ${edge.step}</span></li>`).join("") || "<li>no mutation transitions yet<span>use mutate to add an edge</span></li>";
  return `<div class="fl-lineage-nodes">${nodeMarkup}</div><ol class="fl-lineage-edges">${edges}</ol>`;
}

function diagnostics(metrics: EcosystemMetrics, solver: FlowLeniaEcosystemSolver, frameMs: number): Array<{ label: string; value: string }> {
  const region = metrics.regionMass ?? [0, 0, 0, 0];
  return [
    { label: "step / rule", value: `${metrics.step.toLocaleString()} / ${solver.getMixingRule()}` },
    { label: "mass / relative drift", value: `${metrics.totalMass.toFixed(4)} / ${metrics.relativeMassDrift.toExponential(2)}` },
    { label: "region 1 / 2 / 3", value: `${region[1].toFixed(2)} / ${region[2].toFixed(2)} / ${region[3].toFixed(2)}` },
    { label: "environment min / max", value: `${(metrics.environmentMin ?? 0).toFixed(3)} / ${(metrics.environmentMax ?? 0).toFixed(3)}` },
    { label: "gate / storm amplitude", value: `${metrics.gateOpen ? "OPEN" : "closed"} / ${(metrics.stormAmplitude ?? 0).toFixed(3)}` },
    { label: "lineages / phenotype bins", value: `${metrics.activeLineages} / ${metrics.phenotypeClusters}` },
    { label: "occupied / clamp", value: `${(100 * metrics.occupiedFraction).toFixed(1)}% / ${(100 * metrics.clampFraction).toFixed(3)}%` },
    { label: "finite / non-negative", value: metrics.nonFinite === 0 && metrics.negative === 0 ? "PASS" : `FAIL ${metrics.nonFinite}/${metrics.negative}` },
    { label: "frame / allocation", value: `${frameMs.toFixed(2)} ms / ${(solver.allocatedBytes / 2 ** 20).toFixed(2)} MiB` },
  ];
}

async function captureBundle(state: Awaited<ReturnType<FlowLeniaEcosystemSolver["readback"]>>, metrics: EcosystemMetrics, card: ArenaCard, solver: FlowLeniaEcosystemSolver, n: number, seed: number, started: number): Promise<CaptureBundle> {
  const shaderHash = await arenaShaderSha256(); const graph = solver.lineageGraph(metrics);
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "flow-lenia", category: "continuous-ca", variant: MODEL_VARIANT },
      stack: { name: "webgpu-f32", version: "0.6.0", build_id: "flow-lenia-arena-release-m6" },
      config: { tier: n === 256 ? "reference" : "adaptive", dims: [n, n], dtype: "f32", seed, params: { mode: "arena", experiment: card.id, mixing_rule: solver.getMixingRule(), channels: 3, kernels: 9, dt: 0.2, dd: 5, sigma: 0.65, environment_schema: ARENA_SCHEMA_VERSION, shader_sha256: shaderHash, provenance: card.provenance } },
      run: { step_count: metrics.step, capture_interval: metrics.step, wall_clock_seconds: (performance.now() - started) / 1000, start_utc: new Date().toISOString() },
      payload: { format: "hdf5", path: `flow-lenia-arena-${card.id}-seed${seed}-step${metrics.step}.h5`, checksum: `sha256:${"0".repeat(64)}` },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps: [{
      step: metrics.step,
      state: {
        mass: field(state.mass, [3, n, n], "f32"), genome_h: field(state.h, [9, n, n], "f32"), genome_q: field(state.q, [9, n, n], "f32"),
        identity_u32_values: field(Float64Array.from(state.identity), [n, n, 4], "f64"),
        environment_affinity_values: field(state.environment ?? new Float32Array(n * n * 4), [n, n, 4], "f32"),
        environment_region_u32_values: field(Float64Array.from(state.environmentRegions ?? new Uint32Array(n * n)), [n, n], "f64"),
      },
      diagnostics: { total_mass: metrics.totalMass, mass_relative_drift: metrics.relativeMassDrift, active_lineages: metrics.activeLineages, lineage_shannon: metrics.shannonDiversity, phenotype_clusters: metrics.phenotypeClusters, mixed_identity_mass: metrics.mixedIdentityMass, region_mass_1: metrics.regionMass?.[1] ?? 0, region_mass_2: metrics.regionMass?.[2] ?? 0, region_mass_3: metrics.regionMass?.[3] ?? 0, environment_min: metrics.environmentMin ?? 0, environment_max: metrics.environmentMax ?? 0, wall_fraction: metrics.wallFraction ?? 0, gate_open: metrics.gateOpen ? 1 : 0, storm_amplitude: metrics.stormAmplitude ?? 0, lineage_nodes: graph.nodes.length, lineage_edges: graph.edges.length, non_finite: metrics.nonFinite, negative: metrics.negative },
    }],
  };
}

async function start(): Promise<void> {
  kicker.textContent = "M5–M6 · Arena Lab";
  const labSwitch = document.getElementById("lab-switch") as HTMLAnchorElement; labSwitch.textContent = "Organism Lab"; labSwitch.href = "?";
  stage.setAttribute("aria-label", "Flow Lenia Arena Laboratory"); stage.classList.add("fl-arena-stage");
  canvas.setAttribute("aria-label", "Interactive Flow Lenia arena. Paint soft affinity environments, sample cells, and mutate coherent lineage patches.");
  const help = document.getElementById("lab-help"); if (help) help.textContent = "Space pauses. Period steps. I samples, M mutates, A attracts, P repels, W paints soft walls, E erases, R resets, plus and minus zoom. Primary applies; secondary reverses or removes.";
  setBoot("requesting WebGPU adapter…"); if (!navigator.gpu) throw new Error("WebGPU unavailable in this browser");
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" }); if (!adapter) throw new Error("WebGPU adapter unavailable");
  const device = await adapter.requestDevice(); const info = adapter.info; const environment: M6GateReport["environment"] = { userAgent: navigator.userAgent, adapter: { vendor: info.vendor ?? "unknown", architecture: info.architecture ?? "unknown", device: info.device ?? "unknown", description: info.description ?? "unknown" } };
  device.addEventListener("uncapturederror", (event) => { const message = (event as GPUUncapturedErrorEvent).error.message; console.error(`Flow Lenia M6 WebGPU error: ${message}`); setBoot(`GPU error: ${message}`); });
  const context = canvas.getContext("webgpu") as GPUCanvasContext | null; if (!context) throw new Error("WebGPU canvas context unavailable"); const format = navigator.gpu.getPreferredCanvasFormat(); context.configure({ device, format, alphaMode: "opaque" });
  const query = new URLSearchParams(location.search); const adaptive = matchMedia("(max-width: 720px)").matches || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4; const requested = Number.parseInt(query.get("grid") ?? (adaptive ? "128" : "256"), 10); const n = requested === 128 ? 128 : 256; let seed = Number.parseInt(query.get("seed") ?? "42", 10) >>> 0;
  let card = arenaCardById(query.get("preset") ?? ARENA_CARDS[0]?.id ?? "corridor-divergence"); const config = organismConfig(n, seed); setBoot(`compiling the ${n}² Arena environment…`);
  const solver = await FlowLeniaEcosystemSolver.create(device, config, card.mixing, { environment: true }); const renderer = new ArenaRenderer(device, context, canvas, format); renderer.setSolver(solver);
  let paused = query.get("gate") === "1"; let speed = 1; let selectedTool: ArenaTool = (query.get("tool") as ArenaTool | null) ?? "sample"; let brushRadius = Math.max(4, n / 18); let strength = 0.55; let frameMs = 0; let lastFrame = performance.now(); let lastMetrics = 0; let telemetryPending = false; let lastInspection: readonly [number, number] = [n / 2, n / 2]; let recoveryBaseline: number[] | null = null; const recoveryHistory: Array<{ step: number; score: number }> = [];
  const arenaMetricsHost = document.createElement("aside"); arenaMetricsHost.className = "fl-arena-metrics"; arenaMetricsHost.setAttribute("data-arena-regions", "true"); arenaMetricsHost.innerHTML = `<div class="fl-arena-metric-head">REGIONS + RECOVERY</div><div class="fl-region-bars"></div><canvas width="260" height="70" aria-label="Regional distribution recovery history"></canvas><div class="fl-lineage-graph" data-lineage-graph><div class="fl-arena-metric-head">LINEAGE GRAPH</div></div>`; stage.appendChild(arenaMetricsHost);

  const resetExact = (): void => { solver.setMixingRule(card.mixing); solver.reset(makeArenaState(n, card, seed), makeArenaEnvironment(n, card)); recoveryBaseline = null; recoveryHistory.length = 0; };
  let panel = createSettingsPanel("Flow Lenia · Arena Lab", {
    caption: "Sculpt conservative soft-affinity environments, open timed passages, and measure lineage abundance by authored region.",
    initial: { tier: n === 256 ? "reference" : "test", seed }, tiers: n === 256 ? ["reference"] : ["test"],
    onCapture: async () => { panel.setCaptureEnabled(false); resetCapture(); const started = performance.now(); resetExact(); solver.step(72); await device.queue.onSubmittedWorkDone(); const [state, metrics] = await Promise.all([solver.readback(), solver.metrics()]); exposeCapture(await captureBundle(state, metrics, card, solver, n, seed, started), { download: false }); panel.setStatus(`Arena canonical capture ready — ${card.title}, step ${metrics.step}`); panel.setCaptureEnabled(true); },
    onChange: (state) => { if ((state.seed >>> 0) !== seed) panel.setStatus("Arena solver seed is fixed at boot; reload with the requested seed to preserve stateless hashes"); },
    modes: { initial: paused ? "study" : "play", onMode: (mode) => { paused = mode === "study"; } },
    study: {
      diagnostics: [{ label: "grid", value: `${n}²` }, { label: "environment", value: "authored field + soft wall + gate + scripted pulse" }, { label: "render bindings", value: "8 read-only storage · portable floor" }],
      honesty: { faithful: "environment affinity is added before the published pressure/flow and finite-square reintegration transport; mass and localized H/Q use the unchanged M4 gather", simplified: "walls are soft negative affinity, regions are authored labels, and recovery is a distribution proxy—not hard geometry, fitness, biology, or open-ended evolution", measured: "region, diversity, and lineage metrics read back only at low cadence; no synchronization, allocation, or pipeline creation occurs in the per-step hot loop" },
      verdict: { gate: "Arena conservation + determinism + reload + release gates", verdict: "RUN TO VERIFY", pass: false },
      links: [{ label: "model specification", href: "../../../../docs/sim-specs/continuous-ca/lenia/spec-web-ecosystem.md" }, { label: "implementation ledger", href: "../../../../docs/sim-specs/continuous-ca/lenia/implementation-plan.md" }],
    },
  });

  const setView = (view: ArenaView): void => { renderer.setView(view); legend.textContent = VIEW_LABELS[view]; document.querySelectorAll<HTMLButtonElement>("[data-arena-view]").forEach((element) => element.setAttribute("aria-pressed", String(element.dataset.arenaView === view))); };
  const setTool = (tool: ArenaTool): void => { selectedTool = tool; canvas.dataset.tool = tool; document.querySelectorAll<HTMLButtonElement>("[data-arena-tool]").forEach((element) => element.setAttribute("aria-pressed", String(element.dataset.arenaTool === tool))); query.set("tool", tool); history.replaceState(null, "", `?${query.toString()}`); };
  const inspect = async (row: number, column: number): Promise<EcosystemInspection> => { lastInspection = [row, column]; renderer.setInspection(row, column, brushRadius); const reading = await solver.inspect(row, column); inspectorHost.innerHTML = inspectionMarkup(reading); return reading; };
  const applyTool = async (row: number, column: number, reverse: boolean, shifted: boolean, alt: boolean): Promise<void> => {
    if (alt || selectedTool === "sample") { await inspect(row, column); return; }
    if (selectedTool === "mutate") { const reading = await inspect(row, column); if (reverse || reading.lineage === 0 || reading.lineage === 0xffff_ffff || reading.density <= 1e-8) { panel.setStatus("mutation needs an exact, occupied parent lineage"); return; } solver.queueMutation({ row, column, radius: brushRadius, parentLineage: reading.lineage, scale: Math.min(0.2, strength * 0.1) }); }
    else {
      let mode: ArenaBrushMode = selectedTool === "wall" ? "wall" : selectedTool === "erase" ? "erase" : "affinity"; let signed = strength * (shifted ? 1.8 : 1);
      if (selectedTool === "repel") signed *= -1; if (reverse) { if (selectedTool === "wall") mode = "erase"; else signed *= -1; }
      solver.queueEnvironmentEvent({ row, column, radius: brushRadius, strength: signed, mode });
    }
    if (paused) solver.step(); panel.setNarration(`${reverse ? "secondary" : "primary"} ${selectedTool} at ${Math.floor(row)}, ${Math.floor(column)}`, "event");
  };

  const drawRecovery = (metrics: EcosystemMetrics): void => {
    const region = [...(metrics.regionMass ?? [0, 0, 0, 0])].slice(1); const total = Math.max(region.reduce((sum, value) => sum + value, 0), 1e-30); const normalized = region.map((value) => value / total); if (!recoveryBaseline) recoveryBaseline = [...normalized]; const score = 1 - 0.5 * normalized.reduce((sum, value, index) => sum + Math.abs(value - (recoveryBaseline?.[index] ?? 0)), 0); recoveryHistory.push({ step: metrics.step, score }); if (recoveryHistory.length > 120) recoveryHistory.shift();
    const bars = arenaMetricsHost.querySelector(".fl-region-bars") as HTMLDivElement; bars.innerHTML = region.map((value, index) => `<div><span>R${index + 1}</span><i style="--share:${(value / total).toFixed(4)}"></i><b>${value.toFixed(1)}</b></div>`).join("");
    const graph = arenaMetricsHost.querySelector("[data-lineage-graph]") as HTMLDivElement; graph.innerHTML = `<div class="fl-arena-metric-head">LINEAGE GRAPH</div>${graphMarkup(solver.lineageGraph(metrics))}`;
    const plot = arenaMetricsHost.querySelector("canvas") as HTMLCanvasElement; const ctx = plot.getContext("2d"); if (ctx) { ctx.clearRect(0, 0, plot.width, plot.height); ctx.strokeStyle = "#1f3a40"; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(plot.width, 7); ctx.stroke(); ctx.strokeStyle = "#68ddc2"; ctx.lineWidth = 1.5; ctx.beginPath(); recoveryHistory.forEach((point, index) => { const x = recoveryHistory.length <= 1 ? 0 : index / (recoveryHistory.length - 1) * plot.width; const y = (1 - Math.max(0, Math.min(1, point.score))) * (plot.height - 8) + 4; if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); }
  };
  const updateMetrics = async (): Promise<EcosystemMetrics> => { const metrics = await solver.metrics(); panel.setDiagnostics(diagnostics(metrics, solver, frameMs)); const region = metrics.regionMass ?? [0, 0, 0, 0]; ledgerHud.textContent = `closed mass ${metrics.totalMass.toFixed(2)} · ε ${metrics.relativeMassDrift.toExponential(1)} · R ${region.slice(1).map((value) => value.toFixed(0)).join("/")}`; perfHud.textContent = `${frameMs.toFixed(1)} ms frame · ${speed.toFixed(2)}× · ${n}² · gate ${metrics.gateOpen ? "open" : "closed"}`; const pass = metrics.relativeMassDrift <= 1.5e-4 && metrics.nonFinite === 0 && metrics.negative === 0; panel.setVerdict({ gate: "Arena closed ledger + finite localized state", verdict: pass ? "PASS" : "FAIL", pass }); drawRecovery(metrics); return metrics; };
  const loadCard = async (next: ArenaCard): Promise<void> => { card = next; resetExact(); setView(next.view); ruleSelect.select.value = next.mixing; experimentNote.innerHTML = `<b>${next.title}</b><span>${next.description}</span><small>${next.observation} · Success: ${next.successMetric}</small>`; document.querySelectorAll<HTMLButtonElement>("[data-arena-card]").forEach((element) => element.setAttribute("aria-pressed", String(element.dataset.arenaCard === next.id))); query.set("preset", next.id); history.replaceState(null, "", `?${query.toString()}`); panel.setStatus(`${next.title} reset exactly at seed ${seed}`); };

  const experimentGroup = panel.addGroup("Arena experiments", { hint: "Three authored cards isolate passages, moving affinity, and a standardized mass-neutral perturbation." }); const cardGrid = document.createElement("div"); cardGrid.className = "fl-experiment-grid"; for (const item of ARENA_CARDS) { const element = button(item.title, item.id === card.id); element.className = "fl-experiment-card"; element.dataset.arenaCard = item.id; const small = document.createElement("small"); small.textContent = item.short; element.appendChild(small); element.addEventListener("click", () => { void loadCard(item); }); cardGrid.appendChild(element); } experimentGroup.appendChild(cardGrid);
  const environmentGroup = panel.addGroup("environment tools", { hint: "Primary applies; secondary reverses/removes. Every event is applied at a fixed simulation-step boundary and never touches mass." }); const toolControls = document.createElement("div"); toolControls.className = "fl-controls fl-controls-3 fl-arena-tools"; for (const tool of ["sample", "mutate", "attract", "repel", "wall", "erase"] as const) { const element = button(tool, selectedTool === tool); element.dataset.arenaTool = tool; element.addEventListener("click", () => setTool(tool)); toolControls.appendChild(element); } environmentGroup.appendChild(toolControls);
  const radiusInput = document.createElement("input"); radiusInput.type = "range"; radiusInput.min = "2"; radiusInput.max = String(Math.floor(n / 3)); radiusInput.value = String(Math.round(brushRadius)); const radiusRow = document.createElement("label"); radiusRow.className = "fl-select-row"; radiusRow.append("brush radius", radiusInput); radiusInput.addEventListener("input", () => { brushRadius = Number(radiusInput.value); renderer.setInspection(lastInspection[0], lastInspection[1], brushRadius); }); environmentGroup.appendChild(radiusRow);
  const strengthInput = document.createElement("input"); strengthInput.type = "range"; strengthInput.min = "0.05"; strengthInput.max = "1.5"; strengthInput.step = "0.05"; strengthInput.value = String(strength); const strengthRow = document.createElement("label"); strengthRow.className = "fl-select-row"; strengthRow.append("field strength", strengthInput); strengthInput.addEventListener("input", () => { strength = Number(strengthInput.value); }); environmentGroup.appendChild(strengthRow);
  const inheritanceGroup = panel.addGroup("inheritance", { hint: "Environment changes affinity only; localized H/Q still follows one of the five separately gated M4 rules." }); const ruleSelect = selectRow("mixing rule", MIXING_RULES, card.mixing); inheritanceGroup.appendChild(ruleSelect.row); ruleSelect.select.addEventListener("change", () => { solver.setMixingRule(ruleSelect.select.value as MixingRule); panel.setStatus(`inheritance set to ${solver.getMixingRule()}; state is retained`); });
  const viewGroup = panel.addGroup("scientific view", { hint: "Environment uses a fixed signed map. Amber walls remain visible in the other views as a render-only overlay." }); const viewControls = document.createElement("div"); viewControls.className = "fl-controls fl-controls-3"; for (const view of ["lineage", "phenotype", "density", "flow", "environment"] as const) { const element = button(view, view === card.view); element.dataset.arenaView = view; element.addEventListener("click", () => setView(view)); viewControls.appendChild(element); } viewGroup.appendChild(viewControls);
  const shareGroup = panel.addGroup("replay + sharing", { hint: "JSON carries complete packed mass, H/Q, identity, environment, regions, lineage history, step, seed, provenance, and a verified SHA-256." }); const ioControls = document.createElement("div"); ioControls.className = "fl-controls"; const exportButton = button("export JSON"); exportButton.dataset.arenaIo = "export"; const importButton = button("import JSON"); importButton.dataset.arenaIo = "import"; ioControls.append(exportButton, importButton); shareGroup.appendChild(ioControls); const fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.accept = "application/json,.json"; fileInput.hidden = true; shareGroup.appendChild(fileInput);
  exportButton.addEventListener("click", () => { void (async () => { const document = await buildArenaExperiment(await solver.packedSnapshot(), card); downloadArenaExperiment(document); panel.setStatus(`exported ${document.schema_version} · sha ${document.scientific_sha256.slice(0, 12)}…`); })(); }); importButton.addEventListener("click", () => fileInput.click()); fileInput.addEventListener("change", () => { const file = fileInput.files?.[0]; if (!file) return; void (async () => { const parsed = await parseArenaExperiment(await file.text()); if (parsed.snapshot.n !== n || parsed.snapshot.seed !== config.seed) throw new Error(`import needs grid ${n} and seed ${config.seed}; received ${parsed.snapshot.n}/${parsed.snapshot.seed}`); card = arenaCardById(parsed.document.experiment.id); solver.restorePackedSnapshot(parsed.snapshot); renderer.setView(card.view); ruleSelect.select.value = parsed.snapshot.mixingRule; recoveryBaseline = null; recoveryHistory.length = 0; panel.setStatus(`import verified · sha ${parsed.document.scientific_sha256.slice(0, 12)}… · step ${parsed.snapshot.step}`); })().catch((error: unknown) => panel.setStatus(`import rejected: ${error instanceof Error ? error.message : String(error)}`)); });
  const timeGroup = panel.addGroup("time + release verification", { hint: "Fixed dt; adaptive quality changes grid only at boot and never changes simulation equations." }); const timeControls = document.createElement("div"); timeControls.className = "fl-controls fl-controls-3"; const pauseButton = button(paused ? "play" : "pause"); const stepButton = button("step"); const resetButton = button("reset"); timeControls.append(pauseButton, stepButton, resetButton); timeGroup.appendChild(timeControls); pauseButton.addEventListener("click", () => { paused = !paused; pauseButton.textContent = paused ? "play" : "pause"; }); stepButton.addEventListener("click", () => { solver.step(); paused = true; pauseButton.textContent = "play"; }); resetButton.addEventListener("click", resetExact); const speedRow = selectRow("speed", ["0.25", "0.5", "1", "2", "4"], "1"); speedRow.select.addEventListener("change", () => { speed = Number(speedRow.select.value); }); timeGroup.appendChild(speedRow.row); const proveButton = button("run complete M5–M6 gates"); proveButton.className = "fl-prove-button"; timeGroup.appendChild(proveButton);

  const renderIntegrityCheck = async (): Promise<boolean> => { const before = await solver.packedSnapshot(); const previous = renderer.getView(); for (const view of ["lineage", "phenotype", "density", "flow", "environment"] as const) { renderer.setView(view); renderer.render(performance.now() / 1000); } await device.queue.onSubmittedWorkDone(); const after = await solver.packedSnapshot(); renderer.setView(previous); const equal = (a: ArrayBufferView, b: ArrayBufferView): boolean => { const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); const y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength); return x.length === y.length && x.every((value, index) => value === y[index]); }; return equal(before.mass, after.mass) && equal(before.h, after.h) && equal(before.q, after.q) && equal(before.identity, after.identity) && equal(before.environment, after.environment) && equal(before.regions, after.regions); };
  const hook: M6Hook = { latestGateReport: null, allocatedBytes: solver.allocatedBytes, grid: n, listExperiments: () => ARENA_CARDS.map((item) => item.id), loadExperiment: async (id) => loadCard(arenaCardById(id)), step: (count = 1) => solver.step(count), metrics: updateMetrics, exportExperiment: async () => JSON.stringify(await buildArenaExperiment(await solver.packedSnapshot(), card)), importExperiment: async (text) => { const parsed = await parseArenaExperiment(text); solver.restorePackedSnapshot(parsed.snapshot); }, runGates: async () => { const wasPaused = paused; paused = true; proveButton.disabled = true; panel.setStatus("running Arena anchors, three deterministic cards, reload, render, memory, timing, and product gates…"); try { const report = await runM6Gates(device, environment, renderIntegrityCheck); hook.latestGateReport = report; panel.setVerdict({ gate: "Arena conservation + determinism + reload + release gates", verdict: report.pass ? "PASS" : "FAIL", pass: report.pass }); panel.setStatus(report.pass ? "M5–M6 Arena release gates PASS" : "M6 gate failure — inspect window.__flowLeniaM6.latestGateReport"); return report; } finally { paused = wasPaused; proveButton.disabled = false; } } };
  (globalThis as typeof globalThis & { __flowLeniaM6?: M6Hook }).__flowLeniaM6 = hook; proveButton.addEventListener("click", () => { void hook.runGates(); });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault()); let pointerDown = false; let lastPaint = ""; canvas.addEventListener("pointerdown", (event) => { pointerDown = true; canvas.setPointerCapture(event.pointerId); const [row, column] = renderer.worldFromCanvas(event.clientX, event.clientY); lastPaint = `${Math.floor(row)},${Math.floor(column)}`; void applyTool(row, column, event.button === 2, event.shiftKey, event.altKey); }); canvas.addEventListener("pointerup", () => { pointerDown = false; lastPaint = ""; }); canvas.addEventListener("pointermove", (event) => { const [row, column] = renderer.worldFromCanvas(event.clientX, event.clientY); renderer.setInspection(row, column, brushRadius); if (pointerDown && selectedTool !== "sample" && selectedTool !== "mutate") { const key = `${Math.floor(row / 2)},${Math.floor(column / 2)}`; if (key !== lastPaint) { lastPaint = key; void applyTool(row, column, (event.buttons & 2) !== 0, event.shiftKey, event.altKey); } } }); canvas.addEventListener("wheel", (event) => { event.preventDefault(); if (event.ctrlKey || event.metaKey) renderer.setZoom(renderer.getZoom() * Math.exp(-event.deltaY * 0.002)); else { brushRadius = Math.max(2, Math.min(n / 3, brushRadius * Math.exp(-event.deltaY * 0.0015))); radiusInput.value = String(Math.round(brushRadius)); renderer.setInspection(lastInspection[0], lastInspection[1], brushRadius); } }, { passive: false });
  document.addEventListener("keydown", (event) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return; if (event.key === " ") { event.preventDefault(); paused = !paused; pauseButton.textContent = paused ? "play" : "pause"; } else if (event.key === ".") solver.step(); else if (event.key.toLowerCase() === "i") setTool("sample"); else if (event.key.toLowerCase() === "m") setTool("mutate"); else if (event.key.toLowerCase() === "a") setTool("attract"); else if (event.key.toLowerCase() === "p") setTool("repel"); else if (event.key.toLowerCase() === "w") setTool("wall"); else if (event.key.toLowerCase() === "e") setTool("erase"); else if (event.key.toLowerCase() === "r") resetExact(); else if (event.key === "+" || event.key === "=") renderer.setZoom(renderer.getZoom() * 1.25); else if (event.key === "-") renderer.setZoom(renderer.getZoom() * 0.8); });
  await loadCard(card); setTool(selectedTool); void inspect(n / 2, n / 2); let accumulator = 0; const frame = (now: number): void => { const elapsed = Math.min(100, now - lastFrame); lastFrame = now; frameMs += 0.08 * (elapsed - frameMs); if (!paused && !isCapturing()) { accumulator += speed; const steps = Math.min(4, Math.floor(accumulator)); if (steps > 0) { solver.step(steps); accumulator -= steps; } } renderer.render(now / 1000); if (!telemetryPending && now - lastMetrics > 1200 && !isCapturing()) { telemetryPending = true; lastMetrics = now; void updateMetrics().finally(() => { telemetryPending = false; }); } requestAnimationFrame(frame); };
  setBoot(""); (globalThis as typeof globalThis & { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true; requestAnimationFrame(frame);
}

void start().catch((error: unknown) => { console.error(error); setBoot(`Flow Lenia M6 failed: ${error instanceof Error ? error.message : String(error)}`); });
