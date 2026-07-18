import fixtureDocument from "./prove/organism-fixture.json";
import { organismConfig } from "./model/config.js";
import { makeConformanceMass, makeSeededOrganismMass } from "./model/seed.js";
import { FlowLeniaOrganismSolver } from "./model/solver.js";
import type { SolverMetrics, SolverReadback } from "./model/solver.js";

interface EncodedField { shape: number[]; dtype: string; data: string }
interface FixtureCase {
  name: string;
  variant: number;
  fields: Record<string, EncodedField>;
}
interface FixtureDocument {
  schema_version: string;
  tolerances: Record<string, number>;
  cases: FixtureCase[];
}

export interface FieldGate {
  field: string;
  maxAbs: number;
  tolerance: number;
  pass: boolean;
}

export interface CaseGate {
  name: string;
  fields: FieldGate[];
  massRelativeResidual: number;
  pass: boolean;
}

export interface StructuralGate {
  grid: number;
  steps: number;
  elapsedMs: number;
  firstHash: string;
  secondHash: string;
  byteExactSameAdapter: boolean;
  metrics: SolverMetrics;
  pass: boolean;
}

export interface PerformanceGate {
  grid: number;
  samples: number;
  timing: "queue-completion";
  p50Ms: number;
  p95Ms: number;
  allocatedBytes: number;
  memoryMib: number;
  pass: boolean;
}

export interface M2GateReport {
  schemaVersion: "flow-lenia-m2-gates-v1";
  generatedUtc: string;
  fixtureSchema: string;
  environment: {
    userAgent: string;
    adapter: { vendor: string; architecture: string; device: string; description: string };
  };
  numericalCases: CaseGate[];
  structural: StructuralGate;
  performance: PerformanceGate;
  pass: boolean;
}

const fixture = fixtureDocument as FixtureDocument;

function decodeField(record: EncodedField): Float32Array {
  if (record.dtype !== "f32-le-base64") throw new Error(`unsupported fixture dtype ${record.dtype}`);
  const binary = atob(record.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Float32Array(bytes.buffer);
}

function maxAbs(actual: Float32Array, expected: Float32Array): number {
  if (actual.length !== expected.length) throw new Error(`field length mismatch ${actual.length} != ${expected.length}`);
  let maximum = 0;
  for (let index = 0; index < actual.length; index += 1) {
    maximum = Math.max(maximum, Math.abs((actual[index] as number) - (expected[index] as number)));
  }
  return maximum;
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] as number;
}

function check(field: string, actual: Float32Array, expected: EncodedField, tolerance: number): FieldGate {
  const error = maxAbs(actual, decodeField(expected));
  return { field, maxAbs: error, tolerance, pass: error <= tolerance };
}

function relativeLedger(mass: Float32Array, expected: Float32Array): number {
  let actualSum = 0;
  let expectedSum = 0;
  for (let index = 0; index < mass.length; index += 1) {
    actualSum += mass[index] as number;
    expectedSum += expected[index] as number;
  }
  return Math.abs(actualSum - expectedSum) / Math.max(Math.abs(expectedSum), 1e-30);
}

function packedToPlanes(packed: Float32Array, n: number): Float32Array {
  const n2 = n * n;
  const planes = new Float32Array(3 * n2);
  for (let cell = 0; cell < n2; cell += 1) {
    for (let channel = 0; channel < 3; channel += 1) planes[channel * n2 + cell] = packed[cell * 4 + channel] as number;
  }
  return planes;
}

async function sha256(values: Float32Array): Promise<string> {
  const bytes = new Uint8Array(values.byteLength);
  bytes.set(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function smoothCaseFields(state: SolverReadback, fields: Record<string, EncodedField>): FieldGate[] {
  const t = fixture.tolerances;
  return [
    check("perception_step_1", state.perception, fields.perception_step_1 as EncodedField, t.perception_abs as number),
    check("growth_step_1", state.growth, fields.growth_step_1 as EncodedField, t.growth_abs as number),
    check("affinity_step_1", state.affinity, fields.affinity_step_1 as EncodedField, t.affinity_abs as number),
    check("alpha_step_1", state.alpha, fields.alpha_step_1 as EncodedField, t.alpha_abs as number),
    check("flow_step_1", state.flow, fields.flow_step_1 as EncodedField, t.flow_abs as number),
  ];
}

export async function runM2Gates(
  device: GPUDevice,
  structuralSteps: number,
  environment: M2GateReport["environment"],
): Promise<M2GateReport> {
  console.info("Flow Lenia M2 gates: numerical fixture solver");
  const numericalSolver = await FlowLeniaOrganismSolver.create(device, organismConfig(16, 91));
  const numericalCases: CaseGate[] = [];
  try {
    for (const fixtureCase of fixture.cases) {
      console.info(`Flow Lenia M2 gates: ${fixtureCase.name}`);
      const initial = makeConformanceMass(16, fixtureCase.variant);
      numericalSolver.reset(initial);
      numericalSolver.step();
      const one = await numericalSolver.readback();
      const fields = fixtureCase.fields;
      const checks = fixtureCase.name === "smooth-periodic" ? smoothCaseFields(one, fields) : [];
      checks.push(
        check("displacement_step_1", one.displacement, fields.displacement_step_1 as EncodedField, fixture.tolerances.displacement_abs as number),
        check("mass_step_1", one.mass, fields.mass_step_1 as EncodedField, fixture.tolerances.mass_step_1_abs as number),
      );
      numericalSolver.step(3);
      const four = await numericalSolver.readback();
      checks.push(check("mass_step_4", four.mass, fields.mass_step_4 as EncodedField, fixture.tolerances.mass_step_4_abs as number));
      const massRelativeResidual = relativeLedger(four.mass, decodeField(fields.initial_mass as EncodedField));
      numericalCases.push({
        name: fixtureCase.name,
        fields: checks,
        massRelativeResidual,
        pass: checks.every((gate) => gate.pass) && massRelativeResidual <= (fixture.tolerances.mass_relative_ledger as number),
      });
    }
  } finally {
    numericalSolver.destroy();
  }

  const structuralSolver = await FlowLeniaOrganismSolver.create(device, organismConfig(128, 42));
  let firstHash = "";
  let secondHash = "";
  let metrics: SolverMetrics;
  const started = performance.now();
  try {
    const initial = makeSeededOrganismMass(128, 42);
    for (let run = 0; run < 2; run += 1) {
      console.info(`Flow Lenia M2 gates: structural replay ${run + 1}/2`);
      structuralSolver.reset(initial);
      for (let offset = 0; offset < structuralSteps; offset += 32) {
        structuralSolver.step(Math.min(32, structuralSteps - offset));
        await device.queue.onSubmittedWorkDone();
      }
      const final = await structuralSolver.readback();
      const hash = await sha256(final.mass);
      if (run === 0) firstHash = hash;
      else secondHash = hash;
    }
    metrics = await structuralSolver.metrics();
  } finally {
    structuralSolver.destroy();
  }
  const byteExactSameAdapter = firstHash === secondHash;
  console.info("Flow Lenia M2 gates: scoring report");
  const structural: StructuralGate = {
    grid: 128,
    steps: structuralSteps,
    elapsedMs: performance.now() - started,
    firstHash,
    secondHash,
    byteExactSameAdapter,
    metrics,
    pass:
      metrics.nonFinite === 0 &&
      metrics.negative === 0 &&
      metrics.relativeMassDrift <= (fixture.tolerances.mass_relative_ledger as number) &&
      metrics.clampFraction <= 0.05 &&
      byteExactSameAdapter,
  };

  console.info("Flow Lenia M2 gates: 256² complete-step timing");
  const performanceSolver = await FlowLeniaOrganismSolver.create(device, organismConfig(256, 42));
  const samples: number[] = [];
  try {
    performanceSolver.reset(makeSeededOrganismMass(256, 42));
    performanceSolver.step(3);
    await device.queue.onSubmittedWorkDone();
    for (let sample = 0; sample < 16; sample += 1) {
      const start = performance.now();
      performanceSolver.step();
      await device.queue.onSubmittedWorkDone();
      samples.push(performance.now() - start);
    }
  } finally {
    performanceSolver.destroy();
  }
  const performanceGate: PerformanceGate = {
    grid: 256,
    samples: samples.length,
    timing: "queue-completion",
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    allocatedBytes: performanceSolver.allocatedBytes,
    memoryMib: performanceSolver.allocatedBytes / 2 ** 20,
    pass: percentile(samples, 0.95) <= 33.3 && performanceSolver.allocatedBytes < 128 * 2 ** 20,
  };
  return {
    schemaVersion: "flow-lenia-m2-gates-v1",
    generatedUtc: new Date().toISOString(),
    fixtureSchema: fixture.schema_version,
    environment,
    numericalCases,
    structural,
    performance: performanceGate,
    pass: numericalCases.every((test) => test.pass) && structural.pass && performanceGate.pass,
  };
}

export function conformanceInitialPlanes(variant = 0): Float32Array {
  return packedToPlanes(makeConformanceMass(16, variant), 16);
}
