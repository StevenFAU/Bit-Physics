import "../../../../common/common-web/src/theme.css";
import { exposeCapture, field, isCapturing, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import type { CaptureBundle } from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import { ECOSYSTEM_CARDS, ecosystemCardById, makeEcosystemState, scheduledMutations } from "./experiments/ecosystem-cards.js";
import type { EcosystemCard, EcosystemView } from "./experiments/ecosystem-cards.js";
import { MODEL_VARIANT, organismConfig } from "./model/config.js";
import { FlowLeniaEcosystemSolver, MIXING_RULES } from "./model/ecosystem-solver.js";
import type { EcosystemInspection, EcosystemMetrics, MixingRule } from "./model/ecosystem-solver.js";
import { runM4Gates } from "./prove-m4.js";
import type { M4GateReport } from "./prove-m4.js";
import { EcosystemRenderer } from "./render/ecosystem-renderer.js";
import "./style.css";

interface M4Hook {
  runGates: () => Promise<M4GateReport>;
  loadExperiment: (id: string) => Promise<void>;
  listExperiments: () => readonly string[];
  setMixingRule: (rule: MixingRule) => void;
  step: (count?: number) => void;
  metrics: () => Promise<EcosystemMetrics[]>;
  latestGateReport: M4GateReport | null;
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
m0Probe.hidden = true;

const VIEW_LABELS: Record<EcosystemView, string> = {
  lineage: "lineage ID · stable hash hue · mixed ancestry is hatched",
  phenotype: "phenotype projection · approximate H/Q relationship, not species",
  density: "mass channels · C₀/C₁/C₂ direct RGB",
  flow: "displacement dt·F₀ · direction hue, magnitude fixed scale",
};

function setBoot(message: string): void { boot.textContent = message; boot.style.display = message ? "block" : "none"; }

function button(label: string, pressed = false): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.setAttribute("aria-pressed", String(pressed));
  return element;
}

function selectRow(label: string, values: readonly string[], selected: string): { row: HTMLLabelElement; select: HTMLSelectElement } {
  const row = document.createElement("label");
  row.className = "fl-select-row";
  row.append(label);
  const select = document.createElement("select");
  for (const value of values) { const option = document.createElement("option"); option.value = value; option.textContent = value; option.selected = value === selected; select.appendChild(option); }
  row.appendChild(select);
  return { row, select };
}

function inspectMarkup(reading: EcosystemInspection): string {
  const lineage = reading.lineage === 0xffff_ffff ? "mixed sentinel" : String(reading.lineage);
  return `<aside class="fl-inspector fl-ecosystem-inspector"><div class="fl-inspector-head"><span>ECOSYSTEM SAMPLE</span><b>${reading.cell[0]}, ${reading.cell[1]}</b></div><div class="fl-inspect-values"><div class="fl-inspect-row"><span>density ρ</span><output>${reading.density.toFixed(5)}</output></div><div class="fl-inspect-row"><span>lineage</span><output>${lineage}</output></div><div class="fl-inspect-row"><span>fingerprint</span><output>${reading.fingerprint}</output></div><div class="fl-inspect-row"><span>flags</span><output>${reading.flags & 1 ? "mixed" : "exact"}${reading.flags & 2 ? " · mutated" : ""}</output></div><div class="fl-inspect-row"><span>H₀…₂</span><output>${reading.h.slice(0, 3).map((value) => value.toFixed(3)).join(" · ")}</output></div><div class="fl-inspect-row"><span>Q₀…₂</span><output>${reading.q.slice(0, 3).map((value) => value.toFixed(3)).join(" · ")}</output></div></div><p class="fl-inspect-note">A lineage is an operational exact ID. Phenotype colors are only a projection of H/Q.</p></aside>`;
}

function diagnostics(metrics: readonly EcosystemMetrics[], solvers: readonly FlowLeniaEcosystemSolver[], frameMs: number): Array<{ label: string; value: string }> {
  const first = metrics[0];
  if (!first) return [];
  const rows = [
    { label: "step / rule", value: `${first.step.toLocaleString()} / ${solvers[0]?.getMixingRule()}` },
    { label: "mass / relative drift", value: `${first.totalMass.toFixed(4)} / ${first.relativeMassDrift.toExponential(2)}` },
    { label: "active / top lineage mass", value: `${first.activeLineages} / ${first.topLineageMass.toFixed(3)}` },
    { label: "lineage / phenotype H", value: `${first.shannonDiversity.toFixed(3)} / ${first.phenotypeShannon.toFixed(3)}` },
    { label: "phenotype bins / mixed mass", value: `${first.phenotypeClusters} / ${first.mixedIdentityMass.toFixed(3)}` },
    { label: "mutation / extinction events", value: `${first.mutationEvents} / ${first.extinctionEvents}` },
    { label: "occupied / clamp", value: `${(100 * first.occupiedFraction).toFixed(1)}% / ${(100 * first.clampFraction).toFixed(3)}%` },
    { label: "finite / non-negative", value: first.nonFinite === 0 && first.negative === 0 ? "PASS" : `FAIL ${first.nonFinite}/${first.negative}` },
    { label: "frame / allocation", value: `${frameMs.toFixed(2)} ms / ${(solvers.reduce((sum, solver) => sum + solver.allocatedBytes, 0) / 2 ** 20).toFixed(2)} MiB` },
  ];
  metrics.slice(1).forEach((item, index) => rows.splice(3 + index, 0, { label: `pane ${index + 2} ${solvers[index + 1]?.getMixingRule()}`, value: `mixed ${(100 * item.mixedIdentityMass / Math.max(item.totalMass, 1e-30)).toFixed(1)}% · H ${item.shannonDiversity.toFixed(2)}` }));
  return rows;
}

function captureBundle(state: Awaited<ReturnType<FlowLeniaEcosystemSolver["readback"]>>, metrics: EcosystemMetrics, card: EcosystemCard, rule: MixingRule, n: number, seed: number, started: number): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "flow-lenia", category: "continuous-ca", variant: MODEL_VARIANT },
      stack: { name: "webgpu-f32", version: "0.4.0", build_id: "flow-lenia-localized-ecosystem-m4" },
      config: { tier: n === 256 ? "reference" : "test", dims: [n, n], dtype: "f32", seed, params: { mode: "ecosystem", experiment: card.id, mixing_rule: rule, channels: 3, kernels: 9, dt: 0.2, dd: 5, sigma: 0.65, mutation_events: metrics.mutationEvents } },
      run: { step_count: metrics.step, capture_interval: metrics.step, wall_clock_seconds: (performance.now() - started) / 1000, start_utc: new Date().toISOString() },
      payload: { format: "hdf5", path: `flow-lenia-ecosystem-${card.id}-${rule}-seed${seed}-step${metrics.step}.h5`, checksum: `sha256:${"0".repeat(64)}` },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps: [{
      step: metrics.step,
      state: { mass: field(state.mass, [3, n, n], "f32"), genome_h: field(state.h, [9, n, n], "f32"), genome_q: field(state.q, [9, n, n], "f32"), identity_u32_values: field(Float64Array.from(state.identity), [n, n, 4], "f64") },
      diagnostics: { total_mass: metrics.totalMass, mass_relative_drift: metrics.relativeMassDrift, active_lineages: metrics.activeLineages, top_lineage_mass: metrics.topLineageMass, lineage_shannon: metrics.shannonDiversity, phenotype_clusters: metrics.phenotypeClusters, phenotype_shannon: metrics.phenotypeShannon, mutation_events: metrics.mutationEvents, extinction_events: metrics.extinctionEvents, mixed_identity_mass: metrics.mixedIdentityMass, non_finite: metrics.nonFinite, negative: metrics.negative },
    }],
  };
}

async function start(): Promise<void> {
  kicker.textContent = "M4 · localized ecosystem";
  const labSwitch = document.getElementById("lab-switch") as HTMLAnchorElement;
  labSwitch.textContent = "Arena Lab";
  labSwitch.href = "?arena=1";
  stage.setAttribute("aria-label", "Flow Lenia Ecosystem Laboratory");
  canvas.setAttribute("aria-label", "Interactive localized Flow Lenia ecosystem. Click to sample or mutate coherent lineage patches.");
  setBoot("requesting WebGPU adapter…");
  if (!navigator.gpu) throw new Error("WebGPU unavailable in this browser");
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter unavailable");
  const device = await adapter.requestDevice();
  const info = adapter.info;
  const environment: M4GateReport["environment"] = { userAgent: navigator.userAgent, adapter: { vendor: info.vendor ?? "unknown", architecture: info.architecture ?? "unknown", device: info.device ?? "unknown", description: info.description ?? "unknown" } };
  device.addEventListener("uncapturederror", (event) => { const message = (event as GPUUncapturedErrorEvent).error.message; console.error(`Flow Lenia M4 WebGPU error: ${message}`); setBoot(`GPU error: ${message}`); });
  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) throw new Error("WebGPU canvas context unavailable");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });
  const query = new URLSearchParams(location.search);
  const adaptive = matchMedia("(max-width: 720px)").matches || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
  const requested = Number.parseInt(query.get("grid") ?? (adaptive ? "128" : "256"), 10);
  const n = requested === 128 ? 128 : 256;
  const config = organismConfig(n, 42);
  setBoot(`compiling the ${n}² localized ecosystem…`);
  const primary = await FlowLeniaEcosystemSolver.create(device, config, "whole");
  let solvers: FlowLeniaEcosystemSolver[] = [primary];
  const renderer = new EcosystemRenderer(device, context, canvas, format);
  renderer.setSolvers(solvers);
  let card = ECOSYSTEM_CARDS[0] as EcosystemCard;
  let seed = 42;
  let paused = query.get("gate") === "1";
  let speed = 1;
  let selectedTool: "sample" | "mutate" = "sample";
  let brushRadius = Math.max(4, n / 18);
  let mutationScale = 0.055;
  let frameMs = 0;
  let lastFrame = performance.now();
  let lastMetrics = 0;
  let telemetryPending = false;
  let lastInspection: readonly [number, number] = [n / 2, n / 2];
  let panel = createSettingsPanel("Flow Lenia · Ecosystem Lab", {
    caption: "Compare localized rule inheritance, create coherent mutation patches, and inspect exact lineage and approximate phenotype diversity.",
    initial: { tier: n === 256 ? "reference" : "test", seed },
    tiers: n === 256 ? ["reference"] : ["test"],
    onCapture: async () => {
      panel.setCaptureEnabled(false); resetCapture(); const started = performance.now(); resetAll(); stepAll(32); await device.queue.onSubmittedWorkDone();
      const [state, metrics] = await Promise.all([primary.readback(), primary.metrics()]);
      exposeCapture(captureBundle(state, metrics, card, primary.getMixingRule(), n, seed, started), { download: false });
      panel.setStatus(`ecosystem capture ready — ${card.title}, ${primary.getMixingRule()}, step ${metrics.step}`); panel.setCaptureEnabled(true);
    },
    onChange: (state) => { seed = state.seed >>> 0; resetAll(); },
    modes: { initial: paused ? "study" : "play", onMode: (mode) => { paused = mode === "study"; } },
    study: {
      diagnostics: [{ label: "grid", value: `${n}²` }, { label: "localized state", value: "H₉ + Q₉ + fingerprint + lineage + flags" }, { label: "gather bindings", value: "8 storage · portable floor" }],
      honesty: {
        faithful: "localized H/Q is carried through the same exact finite-square mass gather; all five inheritance rules follow the frozen f64 oracle semantics",
        simplified: "lineage IDs, genome fingerprints, phenotype bins, and biological language are operational simulation definitions, not biological species or cells",
        measured: "ecosystem metrics and inspection read back at low cadence; rendering binds scientific buffers read-only and never writes solver state",
      },
      verdict: { gate: "five-rule numerical + deterministic + conservation + mutation gates", verdict: "RUN TO VERIFY", pass: false },
      links: [{ label: "model specification", href: "../../../../docs/sim-specs/continuous-ca/lenia/spec-web-ecosystem.md" }, { label: "M4 implementation ledger", href: "../../../../docs/sim-specs/continuous-ca/lenia/implementation-plan.md" }],
    },
  });

  const ensureSolverCount = async (count: number): Promise<void> => {
    while (solvers.length < count) { setBoot(`compiling synchronized ecosystem ${solvers.length + 1}/${count}…`); solvers.push(await FlowLeniaEcosystemSolver.create(device, config, "whole")); }
    renderer.setSolvers(solvers.slice(0, count));
    setBoot("");
  };
  const activeSolvers = (): FlowLeniaEcosystemSolver[] => solvers.slice(0, card.comparisonRules?.length ?? 1);
  const resetAll = (): void => {
    const initial = makeEcosystemState(n, card, seed);
    const rules = card.comparisonRules ?? [primary.getMixingRule()];
    activeSolvers().forEach((solver, index) => { solver.setMixingRule(rules[index] ?? card.mixing); solver.reset(initial); for (const event of scheduledMutations(card, n)) solver.queueMutation(event); });
  };
  const stepAll = (count = 1): void => activeSolvers().forEach((solver) => solver.step(count));
  const setView = (view: EcosystemView): void => { renderer.setView(view); legend.textContent = VIEW_LABELS[view]; document.querySelectorAll<HTMLButtonElement>("[data-ecosystem-view]").forEach((element) => element.setAttribute("aria-pressed", String(element.dataset.ecosystemView === view))); };
  const updateInspection = async (row: number, column: number): Promise<EcosystemInspection> => {
    lastInspection = [row, column]; renderer.setInspection(row, column, brushRadius); const reading = await primary.inspect(row, column); inspectorHost.innerHTML = inspectMarkup(reading); return reading;
  };
  const applyMutation = async (row: number, column: number): Promise<void> => {
    const reading = await updateInspection(row, column);
    if (reading.lineage === 0 || reading.density <= 1e-8) { panel.setStatus("mutation patch contains no matter"); return; }
    primary.queueMutation({ row, column, radius: brushRadius, scale: mutationScale, parentLineage: reading.lineage });
    if (paused) primary.step();
    panel.setNarration(`mutation queued from lineage ${reading.lineage} at ${Math.floor(row)}, ${Math.floor(column)}`, "event");
  };
  const updateMetrics = async (): Promise<EcosystemMetrics[]> => {
    const metrics = await Promise.all(activeSolvers().map((solver) => solver.metrics()));
    panel.setDiagnostics(diagnostics(metrics, activeSolvers(), frameMs));
    const first = metrics[0] as EcosystemMetrics;
    ledgerHud.textContent = `closed mass ${first.totalMass.toFixed(2)} · ε ${first.relativeMassDrift.toExponential(1)} · lineages ${first.activeLineages}`;
    perfHud.textContent = `${frameMs.toFixed(1)} ms frame · ${speed.toFixed(2)}× · ${n}²${metrics.length > 1 ? ` × ${metrics.length}` : ""}`;
    const pass = metrics.every((item) => item.relativeMassDrift <= 1.5e-4 && item.nonFinite === 0 && item.negative === 0);
    panel.setVerdict({ gate: "closed ledger + localized identity validity", verdict: pass ? "PASS" : "FAIL", pass });
    return metrics;
  };
  const loadCard = async (next: EcosystemCard): Promise<void> => {
    card = next;
    await ensureSolverCount(next.comparisonRules?.length ?? 1);
    primary.setMixingRule(next.mixing);
    resetAll();
    stepAll();
    setView(next.view);
    ruleSelect.select.value = next.mixing;
    ruleSelect.select.disabled = Boolean(next.comparisonRules);
    compareLabel.hidden = !next.comparisonRules;
    compareLabel.textContent = next.comparisonRules ? next.comparisonRules.map((rule, index) => `PANE ${index + 1} · ${rule}`).join("  |  ") : "";
    experimentNote.innerHTML = `<b>${next.title}</b><span>${next.description}</span><small>${next.observation}</small>`;
    document.querySelectorAll<HTMLButtonElement>("[data-ecosystem-card]").forEach((element) => element.setAttribute("aria-pressed", String(element.dataset.ecosystemCard === next.id)));
    panel.setStatus(`${next.title} reset exactly at seed ${seed}`);
  };

  const experimentGroup = panel.addGroup("ecosystem experiments", { hint: "Three authored cards isolate inheritance, contextual negotiation, and identity dilution." });
  const cardGrid = document.createElement("div"); cardGrid.className = "fl-experiment-grid";
  for (const item of ECOSYSTEM_CARDS) { const element = button(item.title, item.id === card.id); element.className = "fl-experiment-card"; element.dataset.ecosystemCard = item.id; const small = document.createElement("small"); small.textContent = item.short; element.appendChild(small); element.addEventListener("click", () => { void loadCard(item); }); cardGrid.appendChild(element); }
  experimentGroup.appendChild(cardGrid);

  const inheritanceGroup = panel.addGroup("inheritance + mutation", { hint: "The same incoming overlap mass drives every rule. Stochastic choices are seed/step/destination/candidate/gene addressed." });
  const ruleSelect = selectRow("mixing rule", MIXING_RULES, card.mixing); inheritanceGroup.appendChild(ruleSelect.row);
  for (const option of ruleSelect.select.options) option.dataset.mixingRule = option.value;
  ruleSelect.select.addEventListener("change", () => { primary.setMixingRule(ruleSelect.select.value as MixingRule); resetAll(); panel.setStatus(`inheritance changed to ${primary.getMixingRule()} under the same seed`); });
  const mutationControls = document.createElement("div"); mutationControls.className = "fl-controls";
  const sampleButton = button("sample", true); const mutateButton = button("mutate"); sampleButton.dataset.ecosystemTool = "sample"; mutateButton.dataset.ecosystemTool = "mutate"; mutationControls.append(sampleButton, mutateButton); inheritanceGroup.appendChild(mutationControls);
  const toolSelect = (tool: "sample" | "mutate"): void => { selectedTool = tool; sampleButton.setAttribute("aria-pressed", String(tool === "sample")); mutateButton.setAttribute("aria-pressed", String(tool === "mutate")); canvas.dataset.tool = tool === "sample" ? "inspect" : "mutate"; };
  sampleButton.addEventListener("click", () => toolSelect("sample")); mutateButton.addEventListener("click", () => toolSelect("mutate"));
  const radius = document.createElement("input"); radius.type = "range"; radius.min = "2"; radius.max = String(Math.floor(n / 3)); radius.value = String(Math.round(brushRadius)); const radiusRow = document.createElement("label"); radiusRow.className = "fl-select-row"; radiusRow.append("patch radius", radius); radius.addEventListener("input", () => { brushRadius = Number(radius.value); renderer.setInspection(lastInspection[0], lastInspection[1], brushRadius); }); inheritanceGroup.appendChild(radiusRow);
  const mutationStrength = document.createElement("input"); mutationStrength.type = "range"; mutationStrength.min = "0"; mutationStrength.max = "0.2"; mutationStrength.step = "0.005"; mutationStrength.value = String(mutationScale); const strengthRow = document.createElement("label"); strengthRow.className = "fl-select-row"; strengthRow.append("mutation σ", mutationStrength); mutationStrength.addEventListener("input", () => { mutationScale = Number(mutationStrength.value); }); inheritanceGroup.appendChild(strengthRow);

  const viewGroup = panel.addGroup("scientific view", { hint: "Lineage uses exact IDs. Phenotype is a labeled projection; nearby colors are not proof of relatedness." });
  const viewControls = document.createElement("div"); viewControls.className = "fl-controls fl-controls-2";
  for (const view of ["lineage", "phenotype", "density", "flow"] as const) { const element = button(view, view === card.view); element.dataset.ecosystemView = view; element.addEventListener("click", () => setView(view)); viewControls.appendChild(element); }
  viewGroup.appendChild(viewControls);

  const timeGroup = panel.addGroup("time + verify", { hint: "Fixed dt; pausing never changes simulation timestep." });
  const timeControls = document.createElement("div"); timeControls.className = "fl-controls fl-controls-3";
  const pauseButton = button(paused ? "play" : "pause"); const stepButton = button("step"); const resetButton = button("reset"); timeControls.append(pauseButton, stepButton, resetButton); timeGroup.appendChild(timeControls);
  pauseButton.addEventListener("click", () => { paused = !paused; pauseButton.textContent = paused ? "play" : "pause"; }); stepButton.addEventListener("click", () => { stepAll(); paused = true; pauseButton.textContent = "play"; }); resetButton.addEventListener("click", resetAll);
  const speedRow = selectRow("speed", ["0.25", "0.5", "1", "2", "4"], "1"); speedRow.select.addEventListener("change", () => { speed = Number(speedRow.select.value); }); timeGroup.appendChild(speedRow.row);
  const proveButton = button("run complete M4 gates"); proveButton.className = "fl-prove-button"; timeGroup.appendChild(proveButton);

  const renderIntegrityCheck = async (): Promise<boolean> => {
    const before = await primary.readback();
    const previous = renderer.getView();
    for (const view of ["lineage", "phenotype", "density", "flow"] as const) { renderer.setView(view); renderer.render(performance.now() / 1000); }
    await device.queue.onSubmittedWorkDone();
    const after = await primary.readback();
    renderer.setView(previous);
    const equal = (first: ArrayBufferView, second: ArrayBufferView): boolean => {
      if (first.byteLength !== second.byteLength) return false;
      const a = new Uint8Array(first.buffer, first.byteOffset, first.byteLength);
      const b = new Uint8Array(second.buffer, second.byteOffset, second.byteLength);
      for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
      return true;
    };
    return equal(before.mass, after.mass) && equal(before.h, after.h) && equal(before.q, after.q) && equal(before.identity, after.identity);
  };

  const m4Hook: M4Hook = {
    latestGateReport: null, allocatedBytes: primary.allocatedBytes, grid: n,
    listExperiments: () => ECOSYSTEM_CARDS.map((item) => item.id),
    loadExperiment: async (id) => loadCard(ecosystemCardById(id)),
    setMixingRule: (rule) => { primary.setMixingRule(rule); ruleSelect.select.value = rule; resetAll(); },
    step: (count = 1) => stepAll(count),
    metrics: updateMetrics,
    runGates: async () => {
      const wasPaused = paused; paused = true; proveButton.disabled = true; panel.setStatus("running all five M4 inheritance, mutation, ecosystem, determinism, memory, and timing gates…");
      try { const report = await runM4Gates(device, environment, renderIntegrityCheck); m4Hook.latestGateReport = report; panel.setVerdict({ gate: "five-rule numerical + deterministic + conservation + mutation gates", verdict: report.pass ? "PASS" : "FAIL", pass: report.pass }); panel.setStatus(report.pass ? "M4 localized ecosystem gates PASS" : "M4 gate failure — inspect window.__flowLeniaM4.latestGateReport"); return report; }
      finally { paused = wasPaused; proveButton.disabled = false; }
    },
  };
  (globalThis as typeof globalThis & { __flowLeniaM4?: M4Hook }).__flowLeniaM4 = m4Hook;
  proveButton.addEventListener("click", () => { void m4Hook.runGates(); });

  canvas.addEventListener("pointerdown", (event) => { canvas.setPointerCapture(event.pointerId); const [row, column] = renderer.worldFromCanvas(event.clientX, event.clientY); if (selectedTool === "mutate") void applyMutation(row, column); else void updateInspection(row, column); });
  canvas.addEventListener("pointermove", (event) => { if (event.buttons === 0) { const [row, column] = renderer.worldFromCanvas(event.clientX, event.clientY); renderer.setInspection(row, column, brushRadius); } });
  canvas.addEventListener("wheel", (event) => { event.preventDefault(); if (event.ctrlKey || event.metaKey) renderer.setZoom(renderer.getZoom() * Math.exp(-event.deltaY * 0.002)); else { brushRadius = Math.max(2, Math.min(n / 3, brushRadius * Math.exp(-event.deltaY * 0.0015))); radius.value = String(Math.round(brushRadius)); renderer.setInspection(lastInspection[0], lastInspection[1], brushRadius); } }, { passive: false });
  document.addEventListener("keydown", (event) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return; if (event.key === " ") { event.preventDefault(); paused = !paused; pauseButton.textContent = paused ? "play" : "pause"; } else if (event.key === ".") stepAll(); else if (event.key.toLowerCase() === "m") toolSelect("mutate"); else if (event.key.toLowerCase() === "i") toolSelect("sample"); else if (event.key.toLowerCase() === "r") resetAll(); else if (event.key === "+" || event.key === "=") renderer.setZoom(renderer.getZoom() * 1.25); else if (event.key === "-") renderer.setZoom(renderer.getZoom() * 0.8); });

  await loadCard(card);
  toolSelect("sample");
  void updateInspection(n / 2, n / 2);
  let accumulator = 0;
  const frame = (now: number): void => {
    const elapsed = Math.min(100, now - lastFrame); lastFrame = now; frameMs += 0.08 * (elapsed - frameMs);
    if (!paused && !isCapturing()) { accumulator += speed; const steps = Math.min(4, Math.floor(accumulator)); if (steps > 0) { stepAll(steps); accumulator -= steps; } }
    renderer.render(now / 1000);
    if (!telemetryPending && now - lastMetrics > 1200 && !isCapturing()) { telemetryPending = true; lastMetrics = now; void updateMetrics().finally(() => { telemetryPending = false; }); }
    requestAnimationFrame(frame);
  };
  setBoot("");
  (globalThis as typeof globalThis & { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;
  requestAnimationFrame(frame);
}

void start().catch((error: unknown) => { console.error(error); setBoot(`Flow Lenia M4 failed: ${error instanceof Error ? error.message : String(error)}`); });
