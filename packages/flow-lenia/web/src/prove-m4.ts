import fixtureDocument from "./prove/ecosystem-fixture.json";
import { ECOSYSTEM_CARDS, makeEcosystemState, scheduledMutations } from "./experiments/ecosystem-cards.js";
import { organismConfig } from "./model/config.js";
import { FlowLeniaEcosystemSolver, MIXING_RULES } from "./model/ecosystem-solver.js";
import type { EcosystemInitialState, EcosystemMetrics, MixingRule } from "./model/ecosystem-solver.js";
import type { M2GateReport } from "./prove.js";

interface EncodedField { shape: number[]; dtype: string; data: string }
interface FixtureCase {
  rule: MixingRule;
  mass_step_1: EncodedField;
  h_step_1: EncodedField;
  q_step_1: EncodedField;
  lineage_step_1: EncodedField;
  flags_step_1: EncodedField;
}
interface FixtureDocument {
  schema_version: string;
  config: { grid: number; seed: number; step: number; negotiation_beta: number };
  tolerances: { mass_abs: number; gene_abs: number; mass_relative_ledger: number };
  initial: Record<"mass" | "h" | "q" | "fingerprint" | "lineage" | "flags", EncodedField>;
  cases: FixtureCase[];
  mutation: {
    event_index: number;
    parent_lineage: number;
    child_lineage: number;
    child_fingerprint: [number, number];
    center: [number, number];
    radius: number;
    delta_h: number[];
    delta_q: number[];
    child_flags: number;
  };
}

export interface M4RuleNumericalGate {
  rule: MixingRule;
  massMaxAbs: number;
  hMaxAbs: number;
  qMaxAbs: number;
  lineageMismatches: number;
  flagMismatches: number;
  relativeMassResidual: number;
  pass: boolean;
}

export interface M4DeterminismGate {
  rule: MixingRule;
  steps: number;
  hashA: string;
  hashB: string;
  byteExactSameAdapter: boolean;
  metrics: EcosystemMetrics;
  pass: boolean;
}

export interface M4GateReport {
  schemaVersion: "flow-lenia-m4-gates-v1";
  generatedUtc: string;
  fixtureSchema: string;
  environment: M2GateReport["environment"];
  numericalRules: M4RuleNumericalGate[];
  determinismRules: M4DeterminismGate[];
  mutation: {
    childIdentityExact: boolean;
    deltaMaxAbs: number;
    childPresent: boolean;
    childFlagsExact: boolean;
    lineageRingComplete: boolean;
    affectedMass: number;
    relativeMassDrift: number;
    pass: boolean;
  };
  ecosystems: Array<{ id: string; rules: MixingRule[]; metrics: EcosystemMetrics[]; pass: boolean }>;
  identityDilution: {
    rules: MixingRule[];
    mixedFractions: number[];
    phenotypeClusters: number[];
    distinctOutcomes: boolean;
    pass: boolean;
  };
  architecture: {
    gatherStorageBindings: 8;
    specializedPipelines: 5;
    allocatedBytes256: number;
    memoryMib256: number;
    under128Mib: boolean;
  };
  performance: { grid: 256; samples: number; p50Ms: number; p95Ms: number; pass: boolean };
  renderIntegrity: { scientificStateByteExact: boolean; pass: boolean };
  productSurface: { experiments: number; mixingRules: number; views: number; tools: number; comparisonPanes: number; keyboardFocus: boolean; pass: boolean };
  pass: boolean;
}

const fixture = fixtureDocument as unknown as FixtureDocument;

function bytes(record: EncodedField): Uint8Array {
  const binary = atob(record.data);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function f32(record: EncodedField): Float32Array { return new Float32Array(bytes(record).buffer); }
function u32(record: EncodedField): Uint32Array { return new Uint32Array(bytes(record).buffer); }
function u64(record: EncodedField): BigUint64Array { return new BigUint64Array(bytes(record).buffer); }

function planesToPacked(values: Float32Array, planes: number, n2: number, stride: number): Float32Array {
  const output = new Float32Array(n2 * stride);
  for (let plane = 0; plane < planes; plane += 1) for (let cell = 0; cell < n2; cell += 1) output[cell * stride + plane] = values[plane * n2 + cell] as number;
  return output;
}

function fixtureInitial(): EcosystemInitialState {
  const n2 = fixture.config.grid ** 2;
  const fingerprints = u64(fixture.initial.fingerprint);
  const lineages = u32(fixture.initial.lineage);
  const flags = u32(fixture.initial.flags);
  const identity = new Uint32Array(n2 * 4);
  for (let cell = 0; cell < n2; cell += 1) {
    const value = fingerprints[cell] as bigint;
    identity[cell * 4] = Number(value & 0xffff_ffffn);
    identity[cell * 4 + 1] = Number(value >> 32n);
    identity[cell * 4 + 2] = lineages[cell] as number;
    identity[cell * 4 + 3] = flags[cell] as number;
  }
  return {
    mass: planesToPacked(f32(fixture.initial.mass), 3, n2, 4),
    h: planesToPacked(f32(fixture.initial.h), 9, n2, 12),
    q: planesToPacked(f32(fixture.initial.q), 9, n2, 12),
    identity,
  };
}

function maxAbs(actual: Float32Array, expected: Float32Array): number {
  if (actual.length !== expected.length) throw new Error("M4 field length mismatch");
  let maximum = 0;
  for (let index = 0; index < actual.length; index += 1) maximum = Math.max(maximum, Math.abs((actual[index] as number) - (expected[index] as number)));
  return maximum;
}

function relativeSum(actual: Float32Array, expected: Float32Array): number {
  let a = 0;
  let b = 0;
  for (let index = 0; index < actual.length; index += 1) { a += actual[index] as number; b += expected[index] as number; }
  return Math.abs(a - b) / Math.max(Math.abs(b), 1e-30);
}

function mismatchIdentity(actual: Uint32Array, expected: Uint32Array, lane: number): number {
  let mismatch = 0;
  for (let cell = 0; cell < expected.length; cell += 1) if (actual[cell * 4 + lane] !== expected[cell]) mismatch += 1;
  return mismatch;
}

async function hashState(state: Awaited<ReturnType<FlowLeniaEcosystemSolver["readback"]>>): Promise<string> {
  const arrays: ArrayBufferView[] = [state.mass, state.h, state.q, state.identity];
  const size = arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const all = new Uint8Array(size);
  let offset = 0;
  for (const array of arrays) { all.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset); offset += array.byteLength; }
  const digest = await crypto.subtle.digest("SHA-256", all);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] as number;
}

function stable(metrics: EcosystemMetrics): boolean {
  return metrics.totalMass > 0 && metrics.relativeMassDrift <= 1.5e-4 && metrics.nonFinite === 0 && metrics.negative === 0 && metrics.clampFraction <= 0.1;
}

export async function runM4Gates(device: GPUDevice, environment: M2GateReport["environment"], renderIntegrityCheck: () => Promise<boolean>): Promise<M4GateReport> {
  const numericalSolver = await FlowLeniaEcosystemSolver.create(device, organismConfig(16, fixture.config.seed));
  const initial = fixtureInitial();
  const numericalRules: M4RuleNumericalGate[] = [];
  try {
    for (const expected of fixture.cases) {
      numericalSolver.setMixingRule(expected.rule);
      numericalSolver.reset(initial);
      numericalSolver.step();
      await device.queue.onSubmittedWorkDone();
      const actual = await numericalSolver.readback();
      const expectedMass = f32(expected.mass_step_1);
      const massMaxAbs = maxAbs(actual.mass, expectedMass);
      const hMaxAbs = maxAbs(actual.h, f32(expected.h_step_1));
      const qMaxAbs = maxAbs(actual.q, f32(expected.q_step_1));
      const lineageMismatches = mismatchIdentity(actual.identity, u32(expected.lineage_step_1), 2);
      const flagMismatches = mismatchIdentity(actual.identity, u32(expected.flags_step_1), 3);
      const relativeMassResidual = relativeSum(actual.mass, expectedMass);
      numericalRules.push({
        rule: expected.rule, massMaxAbs, hMaxAbs, qMaxAbs, lineageMismatches, flagMismatches, relativeMassResidual,
        pass: massMaxAbs <= fixture.tolerances.mass_abs && hMaxAbs <= fixture.tolerances.gene_abs && qMaxAbs <= fixture.tolerances.gene_abs && lineageMismatches === 0 && flagMismatches === 0 && relativeMassResidual <= fixture.tolerances.mass_relative_ledger,
      });
    }
  } finally { numericalSolver.destroy(); }

  const deterministicSolver = await FlowLeniaEcosystemSolver.create(device, organismConfig(128, 42));
  const deterministicState = makeEcosystemState(128, ECOSYSTEM_CARDS[0] as (typeof ECOSYSTEM_CARDS)[number], 42);
  const determinismRules: M4DeterminismGate[] = [];
  try {
    for (const rule of MIXING_RULES) {
      const hashes: string[] = [];
      let metrics!: EcosystemMetrics;
      for (let replay = 0; replay < 2; replay += 1) {
        deterministicSolver.setMixingRule(rule);
        deterministicSolver.reset(deterministicState);
        deterministicSolver.step(32);
        await device.queue.onSubmittedWorkDone();
        const state = await deterministicSolver.readback();
        hashes.push(await hashState(state));
        metrics = await deterministicSolver.metrics();
      }
      const byteExactSameAdapter = hashes[0] === hashes[1];
      determinismRules.push({ rule, steps: 32, hashA: hashes[0] as string, hashB: hashes[1] as string, byteExactSameAdapter, metrics, pass: byteExactSameAdapter && stable(metrics) });
    }
  } finally { deterministicSolver.destroy(); }

  const mutationSolver = await FlowLeniaEcosystemSolver.create(device, organismConfig(16, fixture.config.seed), "whole");
  let mutation!: M4GateReport["mutation"];
  try {
    mutationSolver.reset(initial);
    const event = mutationSolver.queueMutation({ row: fixture.mutation.center[0], column: fixture.mutation.center[1], radius: fixture.mutation.radius, parentLineage: fixture.mutation.parent_lineage, scale: 0.05 });
    const childIdentityExact = event.childLineage === fixture.mutation.child_lineage && event.childFingerprint[0] === fixture.mutation.child_fingerprint[0] && event.childFingerprint[1] === fixture.mutation.child_fingerprint[1];
    const deltaMaxAbs = Math.max(maxAbs(Float32Array.from(event.deltaH), Float32Array.from(fixture.mutation.delta_h)), maxAbs(Float32Array.from(event.deltaQ), Float32Array.from(fixture.mutation.delta_q)));
    mutationSolver.step();
    await device.queue.onSubmittedWorkDone();
    const [state, metrics] = await Promise.all([mutationSolver.readback(), mutationSolver.metrics()]);
    let childPresent = false;
    let childFlagsExact = true;
    for (let cell = 0; cell < 16 ** 2; cell += 1) if (state.identity[cell * 4 + 2] === event.childLineage) { childPresent = true; childFlagsExact = childFlagsExact && state.identity[cell * 4 + 3] === fixture.mutation.child_flags; }
    const ring = mutationSolver.getLineageRing()[0];
    const lineageRingComplete = ring?.parentLineage === event.parentLineage && ring.childLineage === event.childLineage && ring.affectedMass > 0 && ring.deltaH.length === 9 && ring.deltaQ.length === 9;
    mutation = { childIdentityExact, deltaMaxAbs, childPresent, childFlagsExact, lineageRingComplete, affectedMass: ring?.affectedMass ?? 0, relativeMassDrift: metrics.relativeMassDrift, pass: childIdentityExact && deltaMaxAbs <= 2e-7 && childPresent && childFlagsExact && lineageRingComplete && metrics.relativeMassDrift <= fixture.tolerances.mass_relative_ledger };
  } finally { mutationSolver.destroy(); }

  const ecosystems: M4GateReport["ecosystems"] = [];
  let dilutionMetrics: EcosystemMetrics[] = [];
  for (const card of ECOSYSTEM_CARDS) {
    const rules = card.comparisonRules ? [...card.comparisonRules] : [card.mixing];
    const solvers = await Promise.all(rules.map((rule) => FlowLeniaEcosystemSolver.create(device, organismConfig(128, 42), rule)));
    try {
      const state = makeEcosystemState(128, card, 42);
      const ecosystemSteps = card.id === "negotiation-sea" ? 96 : 48;
      for (const solver of solvers) { solver.reset(state); for (const event of scheduledMutations(card, 128)) solver.queueMutation(event); solver.step(ecosystemSteps); }
      await device.queue.onSubmittedWorkDone();
      const metrics = await Promise.all(solvers.map((solver) => solver.metrics()));
      if (card.id === "identity-dilution") dilutionMetrics = metrics;
      ecosystems.push({ id: card.id, rules, metrics, pass: metrics.every(stable) && (card.id !== "negotiation-sea" || metrics[0]?.mutationEvents === card.mutationTimeline.length) });
    } finally { solvers.forEach((solver) => solver.destroy()); }
  }
  const dilutionRules = [...(ECOSYSTEM_CARDS[2]?.comparisonRules ?? [])];
  const mixedFractions = dilutionMetrics.map((metrics) => metrics.mixedIdentityMass / Math.max(metrics.totalMass, 1e-30));
  const phenotypeClusters = dilutionMetrics.map((metrics) => metrics.phenotypeClusters);
  const distinctOutcomes = new Set(mixedFractions.map((value) => value.toFixed(5))).size >= 2 && new Set(phenotypeClusters).size >= 2;
  const identityDilution = { rules: dilutionRules, mixedFractions, phenotypeClusters, distinctOutcomes, pass: dilutionMetrics.length === 3 && (mixedFractions[0] as number) > (mixedFractions[2] as number) + 0.01 && distinctOutcomes };

  const performanceSolver = await FlowLeniaEcosystemSolver.create(device, organismConfig(256, 42), "negotiation");
  const allocatedBytes256 = performanceSolver.allocatedBytes;
  const samples: number[] = [];
  try {
    performanceSolver.reset(makeEcosystemState(256, ECOSYSTEM_CARDS[0] as (typeof ECOSYSTEM_CARDS)[number], 42));
    performanceSolver.step(2);
    await device.queue.onSubmittedWorkDone();
    for (let sample = 0; sample < 8; sample += 1) { const started = performance.now(); performanceSolver.step(); await device.queue.onSubmittedWorkDone(); samples.push(performance.now() - started); }
  } finally { performanceSolver.destroy(); }
  const architecture = { gatherStorageBindings: 8 as const, specializedPipelines: 5 as const, allocatedBytes256, memoryMib256: allocatedBytes256 / 2 ** 20, under128Mib: allocatedBytes256 < 128 * 2 ** 20 };
  const performanceGate = { grid: 256 as const, samples: samples.length, p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), pass: percentile(samples, 0.95) <= 33.3 };
  const scientificStateByteExact = await renderIntegrityCheck();
  const renderIntegrity = { scientificStateByteExact, pass: scientificStateByteExact };
  const productSurface = {
    experiments: document.querySelectorAll("[data-ecosystem-card]").length,
    mixingRules: document.querySelectorAll("[data-mixing-rule]").length,
    views: document.querySelectorAll("[data-ecosystem-view]").length,
    tools: document.querySelectorAll("[data-ecosystem-tool]").length,
    comparisonPanes: ECOSYSTEM_CARDS[2]?.comparisonRules?.length ?? 0,
    keyboardFocus: document.querySelector<HTMLCanvasElement>("#view")?.tabIndex === 0,
    pass: false,
  };
  productSurface.pass = productSurface.experiments === 3 && productSurface.mixingRules === 5 && productSurface.views === 4 && productSurface.tools === 2 && productSurface.comparisonPanes === 3 && productSurface.keyboardFocus;
  const report: M4GateReport = {
    schemaVersion: "flow-lenia-m4-gates-v1", generatedUtc: new Date().toISOString(), fixtureSchema: fixture.schema_version, environment,
    numericalRules, determinismRules, mutation, ecosystems, identityDilution, architecture, performance: performanceGate, renderIntegrity, productSurface,
    pass: numericalRules.every((gate) => gate.pass) && determinismRules.every((gate) => gate.pass) && mutation.pass && ecosystems.every((gate) => gate.pass) && identityDilution.pass && architecture.under128Mib && performanceGate.pass && renderIntegrity.pass && productSurface.pass,
  };
  console.info(`Flow Lenia M4 gates: ${report.pass ? "PASS" : "FAIL"}`);
  return report;
}
