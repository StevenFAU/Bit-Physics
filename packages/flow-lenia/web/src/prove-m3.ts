import { EXPERIMENT_CARDS, makeExperimentMass, scheduleCardTimeline } from "./experiments/cards.js";
import type { ExperimentModelControls } from "./experiments/cards.js";
import { organismConfig } from "./model/config.js";
import { FlowLeniaOrganismSolver } from "./model/solver.js";
import type { SolverMetrics } from "./model/solver.js";
import type { M2GateReport } from "./prove.js";

export interface M3CardGate {
  id: string;
  steps: number;
  metrics: SolverMetrics;
  pass: boolean;
  comparison?: {
    label: string;
    metrics: SolverMetrics;
    stateDiverged: boolean;
    peakDensityDelta: number;
    pass: boolean;
  };
}

export interface M3GateReport {
  schemaVersion: "flow-lenia-m3-gates-v1";
  environment: M2GateReport["environment"];
  cards: M3CardGate[];
  scheduledEvents: {
    steps: number;
    hashA: string;
    hashB: string;
    byteExactSameAdapter: boolean;
    ledgerPass: boolean;
    metrics: SolverMetrics;
  };
  closedImpulses: { steps: number; ledgerUntouched: boolean; metrics: SolverMetrics; pass: boolean };
  renderIntegrity: { scientificStateByteExact: boolean; pass: boolean };
  productSurface: { experiments: number; tools: number; scientificViews: number; inspectorPlots: number; keyboardFocus: boolean; touchRadialTools: number; pass: boolean };
  memory: { solverBytes: number; solverMib: number; synchronizedPairMib: number; under128Mib: boolean };
  pass: boolean;
}

async function hash(values: Float32Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", values.slice().buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function configure(solver: FlowLeniaOrganismSolver, controls: ExperimentModelControls): void {
  solver.setPressureEnabled(controls.pressure);
  solver.setSquareHalfWidth(controls.sigma);
}

function stable(metrics: SolverMetrics): boolean {
  return metrics.totalMass > 0
    && metrics.relativeMassDrift <= 1.2e-4
    && metrics.nonFinite === 0
    && metrics.negative === 0
    && metrics.clampFraction <= 0.1;
}

function queueScript(solver: FlowLeniaOrganismSolver): void {
  solver.queueEvent({ kind: "add", x: 60, y: 65, radius: 8, strength: 0.032, channel: 3, atStep: 0 });
  solver.queueEvent({ kind: "erase", x: 64, y: 61, radius: 6, strength: 0.14, channel: 3, atStep: 4 });
  solver.queueEvent({ kind: "pipette", x: 64, y: 64, radius: 12, strength: 0.65, channel: 3, atStep: 8 });
  solver.queueEvent({ kind: "stir", x: 66, y: 64, radius: 14, strength: 0.55, channel: 3, directionX: 1, atStep: 12 });
}

export async function runM3Gates(
  device: GPUDevice,
  environment: M2GateReport["environment"],
  renderOnlyIntegrityCheck: () => Promise<boolean>,
  productSurfaceCheck: () => M3GateReport["productSurface"],
): Promise<M3GateReport> {
  const n = 128;
  const config = organismConfig(n, 42);
  const solverA = await FlowLeniaOrganismSolver.create(device, config);
  const solverB = await FlowLeniaOrganismSolver.create(device, config);
  const cards: M3CardGate[] = [];
  try {
    for (const card of EXPERIMENT_CARDS) {
      solverA.reset(makeExperimentMass(n, card, 42));
      configure(solverA, card.model);
      for (const event of scheduleCardTimeline(card, n)) solverA.queueEvent(event);
      solverA.step(64);
      await device.queue.onSubmittedWorkDone();
      const metrics = await solverA.metrics();
      const cardGate: M3CardGate = { id: card.id, steps: 64, metrics, pass: stable(metrics) };
      if (card.comparison) {
        solverB.reset(makeExperimentMass(n, card, 42));
        configure(solverB, card.comparison.model);
        for (const event of scheduleCardTimeline(card, n)) solverB.queueEvent(event);
        solverB.step(64);
        await device.queue.onSubmittedWorkDone();
        const [comparisonMetrics, primaryState, comparisonState] = await Promise.all([solverB.metrics(), solverA.readback(), solverB.readback()]);
        const [primaryHash, comparisonHash] = await Promise.all([hash(primaryState.mass), hash(comparisonState.mass)]);
        const stateDiverged = primaryHash !== comparisonHash;
        const peakDensityDelta = Math.abs(metrics.maxDensity - comparisonMetrics.maxDensity);
        const comparisonPass = stable(comparisonMetrics) && stateDiverged && peakDensityDelta > 1e-4;
        cardGate.comparison = { label: card.comparison.label, metrics: comparisonMetrics, stateDiverged, peakDensityDelta, pass: comparisonPass };
        cardGate.pass = cardGate.pass && comparisonPass;
      }
      cards.push(cardGate);
    }

    const scriptedMass = makeExperimentMass(n, EXPERIMENT_CARDS[0] as (typeof EXPERIMENT_CARDS)[number], 914);
    for (const solver of [solverA, solverB]) {
      solver.reset(scriptedMass);
      configure(solver, { pressure: true, sigma: 0.65 });
      queueScript(solver);
      solver.step(32);
    }
    await device.queue.onSubmittedWorkDone();
    const [readbackA, readbackB, eventMetrics] = await Promise.all([solverA.readback(), solverB.readback(), solverA.metrics()]);
    const [hashA, hashB] = await Promise.all([hash(readbackA.mass), hash(readbackB.mass)]);
    const byteExactSameAdapter = hashA === hashB;
    const ledgerPass = eventMetrics.ledgerAdded > 0
      && eventMetrics.ledgerRemoved > 0
      && eventMetrics.relativeMassDrift <= 1.2e-4
      && eventMetrics.nonFinite === 0
      && eventMetrics.negative === 0;

    solverA.reset(scriptedMass);
    configure(solverA, { pressure: true, sigma: 0.65 });
    solverA.queueEvent({ kind: "pipette", x: 62, y: 63, radius: 15, strength: 0.75, channel: 3, atStep: 0 });
    solverA.queueEvent({ kind: "stir", x: 66, y: 65, radius: 13, strength: 0.62, channel: 3, polarity: -1, atStep: 5 });
    solverA.step(24);
    await device.queue.onSubmittedWorkDone();
    const closedMetrics = await solverA.metrics();
    const ledgerUntouched = closedMetrics.ledgerAdded === 0 && closedMetrics.ledgerRemoved === 0;
    const closedPass = ledgerUntouched && stable(closedMetrics);
    const scientificStateByteExact = await renderOnlyIntegrityCheck();
    const productSurface = productSurfaceCheck();
    const referenceSolver = await FlowLeniaOrganismSolver.create(device, organismConfig(256, 42));
    const solverBytes = referenceSolver.allocatedBytes;
    referenceSolver.destroy();
    const pairMib = 2 * solverBytes / 2 ** 20;
    const report: M3GateReport = {
      schemaVersion: "flow-lenia-m3-gates-v1",
      environment,
      cards,
      scheduledEvents: { steps: 32, hashA, hashB, byteExactSameAdapter, ledgerPass, metrics: eventMetrics },
      closedImpulses: { steps: 24, ledgerUntouched, metrics: closedMetrics, pass: closedPass },
      renderIntegrity: { scientificStateByteExact, pass: scientificStateByteExact },
      productSurface,
      memory: { solverBytes, solverMib: solverBytes / 2 ** 20, synchronizedPairMib: pairMib, under128Mib: pairMib < 128 },
      pass: cards.every((card) => card.pass) && byteExactSameAdapter && ledgerPass && closedPass && scientificStateByteExact && productSurface.pass && pairMib < 128,
    };
    console.info(`Flow Lenia M3 gates: ${report.pass ? "PASS" : "FAIL"}`);
    return report;
  } finally {
    solverA.destroy();
    solverB.destroy();
  }
}
