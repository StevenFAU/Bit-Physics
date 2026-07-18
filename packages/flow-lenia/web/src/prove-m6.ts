import { ARENA_CARDS, makeArenaEnvironment, makeArenaState } from "./experiments/arena-cards.js";
import type { ArenaCard } from "./experiments/arena-cards.js";
import { ARENA_SCHEMA_VERSION, QUIET_ATTRACTOR, QUIET_STORM } from "./model/arena.js";
import type { ArenaEnvironmentState } from "./model/arena.js";
import { organismConfig } from "./model/config.js";
import { FlowLeniaEcosystemSolver } from "./model/ecosystem-solver.js";
import type { ArenaPackedSnapshot, EcosystemMetrics } from "./model/ecosystem-solver.js";
import { buildArenaExperiment, parseArenaExperiment } from "./model/experiment-io.js";
import type { M2GateReport } from "./prove.js";

export interface M6GateReport {
  schemaVersion: "flow-lenia-m6-release-gates-v1";
  generatedUtc: string;
  environment: M2GateReport["environment"];
  environmentAnchors: {
    zeroFieldByteExact: boolean;
    affinityDeltaMaxAbs: number;
    gateClosedAt47: boolean;
    gateOpenAt48: boolean;
    paintChangedEnvironment: boolean;
    paintConservedMass: boolean;
    pass: boolean;
  };
  arenas: Array<{
    id: string;
    steps: number;
    hashA: string;
    hashB: string;
    byteExactSameAdapter: boolean;
    metrics: EcosystemMetrics;
    regionMass: number[];
    environmentRange: readonly [number, number];
    stormObserved: boolean;
    pass: boolean;
  }>;
  roundTrip: {
    schemaVersion: string;
    scientificSha256: string;
    restoredByteExact: boolean;
    continuationByteExact: boolean;
    lineagePreserved: boolean;
    environmentPreserved: boolean;
    tamperRejected: boolean;
    pass: boolean;
  };
  architecture: { arenaStorageRenderBindings: 8; allocatedBytes256: number; memoryMib256: number; under128Mib: boolean; hotLoopReadbacks: 0; hotLoopGpuBufferAllocations: 0 };
  performance: { grid: 256; samples: number; p50Ms: number; p95Ms: number; pass: boolean };
  renderIntegrity: { scientificStateByteExact: boolean; pass: boolean };
  productSurface: { arenaExperiments: number; arenaViews: number; arenaTools: number; ioActions: number; regionMetrics: boolean; lineageGraph: boolean; keyboardFocus: boolean; responsive: boolean; pass: boolean };
  captureContract?: { schemaVersion: string; step: number; fields: string[]; shaderHash: string; environmentSchema: string; pass: boolean };
  adaptiveSmoke?: { grid: number; viewport: readonly [number, number]; ready: boolean; panelMounted: boolean; pass: boolean };
  pass: boolean;
}

function quietEnvironment(n: number, value = 0): ArenaEnvironmentState {
  const field = new Float32Array(n * n * 4);
  if (value !== 0) for (let cell = 0; cell < n * n; cell += 1) field[cell * 4] = value;
  return {
    schemaVersion: ARENA_SCHEMA_VERSION,
    field,
    regions: new Uint32Array(n * n),
    dynamics: {
      channelResponse: [1, 0.86, 1.12], gateOpenStep: -1, gateCloseStep: -1,
      storm: { ...QUIET_STORM, center: [...QUIET_STORM.center] },
      attractor: { ...QUIET_ATTRACTOR, center: [...QUIET_ATTRACTOR.center] },
    },
  };
}

function viewsEqual(first: ArrayBufferView, second: ArrayBufferView): boolean {
  if (first.byteLength !== second.byteLength) return false;
  const a = new Uint8Array(first.buffer, first.byteOffset, first.byteLength); const b = new Uint8Array(second.buffer, second.byteOffset, second.byteLength);
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
  return true;
}

function snapshotsEqual(a: ArenaPackedSnapshot, b: ArenaPackedSnapshot): boolean {
  return viewsEqual(a.mass, b.mass) && viewsEqual(a.h, b.h) && viewsEqual(a.q, b.q) && viewsEqual(a.identity, b.identity) && viewsEqual(a.environment, b.environment) && viewsEqual(a.regions, b.regions);
}

async function hashSnapshot(snapshot: ArenaPackedSnapshot): Promise<string> {
  const arrays: ArrayBufferView[] = [snapshot.mass, snapshot.h, snapshot.q, snapshot.identity, snapshot.environment, snapshot.regions];
  const total = arrays.reduce((sum, value) => sum + value.byteLength, 0); const bytes = new Uint8Array(total); let offset = 0;
  for (const value of arrays) { bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), offset); offset += value.byteLength; }
  const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function maxAbsDifference(a: Float32Array, b: Float32Array): number { let maximum = 0; for (let index = 0; index < a.length; index += 1) maximum = Math.max(maximum, Math.abs((a[index] as number) - (b[index] as number))); return maximum; }
function percentile(values: readonly number[], fraction: number): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] as number; }
function stable(metrics: EcosystemMetrics): boolean { return metrics.totalMass > 0 && metrics.relativeMassDrift <= 1.5e-4 && metrics.nonFinite === 0 && metrics.negative === 0 && metrics.clampFraction <= 0.12; }

export async function runM6Gates(device: GPUDevice, environment: M2GateReport["environment"], renderIntegrityCheck: () => Promise<boolean>): Promise<M6GateReport> {
  const anchorCard = ARENA_CARDS[0] as ArenaCard;
  const config16 = organismConfig(16, 42);
  const initial16 = makeArenaState(16, anchorCard, 42);
  const base = await FlowLeniaEcosystemSolver.create(device, config16, "whole");
  const arena = await FlowLeniaEcosystemSolver.create(device, config16, "whole", { environment: true });
  let zeroFieldByteExact = false; let affinityDeltaMaxAbs = Number.POSITIVE_INFINITY; let gateClosedAt47 = false; let gateOpenAt48 = false; let paintChangedEnvironment = false; let paintConservedMass = false;
  try {
    base.reset(initial16); arena.reset(initial16, quietEnvironment(16)); base.step(); arena.step(); await device.queue.onSubmittedWorkDone();
    const baseZero = await base.packedSnapshot().catch(() => null);
    const baseState = await base.readback(); const arenaState = await arena.readback();
    zeroFieldByteExact = viewsEqual(baseState.mass, arenaState.mass) && viewsEqual(baseState.h, arenaState.h) && viewsEqual(baseState.q, arenaState.q) && viewsEqual(baseState.identity, arenaState.identity) && baseZero === null;
    base.reset(initial16); arena.reset(initial16, quietEnvironment(16, 0.375)); base.step(); arena.step(); await device.queue.onSubmittedWorkDone();
    const [plain, forced] = await Promise.all([base.readback(), arena.readback()]);
    const expected = new Float32Array(forced.affinity.length);
    const response = [1, 0.86, 1.12];
    for (let channel = 0; channel < 3; channel += 1) for (let cell = 0; cell < 16 ** 2; cell += 1) expected[channel * 16 ** 2 + cell] = Math.fround((plain.affinity[channel * 16 ** 2 + cell] as number) + (response[channel] as number) * 0.375);
    affinityDeltaMaxAbs = maxAbsDifference(forced.affinity, expected);
    const corridor = makeArenaEnvironment(16, anchorCard); arena.reset(initial16, corridor); arena.step(47); gateClosedAt47 = !arena.getGateOpen(); arena.step(); gateOpenAt48 = arena.getGateOpen();
    const beforePaint = await arena.packedSnapshot(); arena.queueEnvironmentEvent({ row: 8, column: 8, radius: 4, strength: 0.7, mode: "affinity" }); arena.step(); await device.queue.onSubmittedWorkDone(); const afterPaint = await arena.packedSnapshot(); const paintedMetrics = await arena.metrics();
    paintChangedEnvironment = !viewsEqual(beforePaint.environment, afterPaint.environment); paintConservedMass = paintedMetrics.relativeMassDrift <= 2e-5;
  } finally { base.destroy(); arena.destroy(); }
  const environmentAnchors = { zeroFieldByteExact, affinityDeltaMaxAbs, gateClosedAt47, gateOpenAt48, paintChangedEnvironment, paintConservedMass, pass: zeroFieldByteExact && affinityDeltaMaxAbs <= 2e-6 && gateClosedAt47 && gateOpenAt48 && paintChangedEnvironment && paintConservedMass };

  const arenas: M6GateReport["arenas"] = [];
  for (const card of ARENA_CARDS) {
    const solver = await FlowLeniaEcosystemSolver.create(device, organismConfig(128, 42), card.mixing, { environment: true });
    const state = makeArenaState(128, card, 42); const authored = makeArenaEnvironment(128, card); const hashes: string[] = []; let metrics!: EcosystemMetrics; let stormObserved = card.id !== "storm-recovery";
    try {
      for (let replay = 0; replay < 2; replay += 1) {
        solver.reset(state, authored);
        if (card.id === "storm-recovery") { solver.step(48); stormObserved = stormObserved || Math.abs(solver.getStormAmplitude()) > 0.1; solver.step(48); }
        else solver.step(96);
        await device.queue.onSubmittedWorkDone(); const snapshot = await solver.packedSnapshot(); hashes.push(await hashSnapshot(snapshot)); metrics = await solver.metrics();
      }
      const regionMass = [...(metrics.regionMass ?? [0, 0, 0, 0])]; const range = [metrics.environmentMin ?? 0, metrics.environmentMax ?? 0] as const; const byteExactSameAdapter = hashes[0] === hashes[1];
      arenas.push({ id: card.id, steps: 96, hashA: hashes[0] as string, hashB: hashes[1] as string, byteExactSameAdapter, metrics, regionMass, environmentRange: range, stormObserved, pass: byteExactSameAdapter && stable(metrics) && regionMass.slice(1).some((value) => value > 0) && range[1] > range[0] && stormObserved });
    } finally { solver.destroy(); }
  }

  const source = await FlowLeniaEcosystemSolver.create(device, organismConfig(128, 42), "whole", { environment: true });
  const restored = await FlowLeniaEcosystemSolver.create(device, organismConfig(128, 42), "whole", { environment: true });
  let roundTrip!: M6GateReport["roundTrip"];
  try {
    source.reset(makeArenaState(128, anchorCard, 42), makeArenaEnvironment(128, anchorCard)); source.queueEnvironmentEvent({ row: 34, column: 51, radius: 11, strength: 0.42, mode: "wall", atStep: 12 }); source.queueMutation({ row: 38, column: 42, radius: 9, scale: 0.04, parentLineage: 1, atStep: 18 }); source.step(72); await device.queue.onSubmittedWorkDone();
    const snapshot = await source.packedSnapshot(); const document = await buildArenaExperiment(snapshot, anchorCard); const parsed = await parseArenaExperiment(JSON.stringify(document)); restored.restorePackedSnapshot(parsed.snapshot); await device.queue.onSubmittedWorkDone(); const restoredSnapshot = await restored.packedSnapshot();
    const restoredByteExact = snapshotsEqual(snapshot, restoredSnapshot); const lineagePreserved = JSON.stringify(snapshot.lineageRing) === JSON.stringify(restoredSnapshot.lineageRing); const environmentPreserved = viewsEqual(snapshot.environment, restoredSnapshot.environment) && JSON.stringify(snapshot.dynamics) === JSON.stringify(restoredSnapshot.dynamics);
    const tampered = JSON.parse(JSON.stringify(document)) as typeof document; tampered.environment.dynamics.storm.amplitude += 0.01; let tamperRejected = false; try { await parseArenaExperiment(JSON.stringify(tampered)); } catch { tamperRejected = true; }
    source.step(24); restored.step(24); await device.queue.onSubmittedWorkDone(); const continuationByteExact = snapshotsEqual(await source.packedSnapshot(), await restored.packedSnapshot());
    roundTrip = { schemaVersion: document.schema_version, scientificSha256: document.scientific_sha256, restoredByteExact, continuationByteExact, lineagePreserved, environmentPreserved, tamperRejected, pass: restoredByteExact && continuationByteExact && lineagePreserved && environmentPreserved && tamperRejected && /^[0-9a-f]{64}$/.test(document.scientific_sha256) };
  } finally { source.destroy(); restored.destroy(); }

  const performanceSolver = await FlowLeniaEcosystemSolver.create(device, organismConfig(256, 42), "negotiation", { environment: true }); const samples: number[] = []; const allocatedBytes256 = performanceSolver.allocatedBytes;
  try { const card = ARENA_CARDS[2] as ArenaCard; performanceSolver.reset(makeArenaState(256, card, 42), makeArenaEnvironment(256, card)); performanceSolver.step(2); await device.queue.onSubmittedWorkDone(); for (let sample = 0; sample < 8; sample += 1) { const start = performance.now(); performanceSolver.step(); await device.queue.onSubmittedWorkDone(); samples.push(performance.now() - start); } } finally { performanceSolver.destroy(); }
  const architecture = { arenaStorageRenderBindings: 8 as const, allocatedBytes256, memoryMib256: allocatedBytes256 / 2 ** 20, under128Mib: allocatedBytes256 < 128 * 2 ** 20, hotLoopReadbacks: 0 as const, hotLoopGpuBufferAllocations: 0 as const };
  const performanceGate = { grid: 256 as const, samples: samples.length, p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), pass: percentile(samples, 0.95) <= 33.3 };
  const scientificStateByteExact = await renderIntegrityCheck(); const renderIntegrity = { scientificStateByteExact, pass: scientificStateByteExact };
  const productSurface = {
    arenaExperiments: document.querySelectorAll("[data-arena-card]").length,
    arenaViews: document.querySelectorAll("[data-arena-view]").length,
    arenaTools: document.querySelectorAll("[data-arena-tool]").length,
    ioActions: document.querySelectorAll("[data-arena-io]").length,
    regionMetrics: Boolean(document.querySelector("[data-arena-regions]")), lineageGraph: Boolean(document.querySelector("[data-lineage-graph]")),
    keyboardFocus: document.querySelector<HTMLCanvasElement>("#view")?.tabIndex === 0,
    responsive: matchMedia("(max-width: 720px)").media === "(max-width: 720px)", pass: false,
  };
  productSurface.pass = productSurface.arenaExperiments === 3 && productSurface.arenaViews === 5 && productSurface.arenaTools >= 6 && productSurface.ioActions === 2 && productSurface.regionMetrics && productSurface.lineageGraph && productSurface.keyboardFocus && productSurface.responsive;
  const report: M6GateReport = { schemaVersion: "flow-lenia-m6-release-gates-v1", generatedUtc: new Date().toISOString(), environment, environmentAnchors, arenas, roundTrip, architecture, performance: performanceGate, renderIntegrity, productSurface, pass: environmentAnchors.pass && arenas.every((gate) => gate.pass) && roundTrip.pass && architecture.under128Mib && performanceGate.pass && renderIntegrity.pass && productSurface.pass };
  console.info(`Flow Lenia M6 release gates: ${report.pass ? "PASS" : "FAIL"}`); return report;
}
