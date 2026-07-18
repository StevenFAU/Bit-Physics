import { BatchedFft2d } from "../fft-batch.js";
import arenaEventsWgsl from "../shaders/arena_events.wgsl?raw";
import arenaPerceiveWgsl from "../shaders/arena_perceive.wgsl?raw";
import flowWgsl from "../shaders/ecosystem_flow.wgsl?raw";
import mutationWgsl from "../shaders/ecosystem_mutation.wgsl?raw";
import perceiveWgsl from "../shaders/ecosystem_perceive.wgsl?raw";
import packWgsl from "../shaders/organism_pack.wgsl?raw";
import spectralWgsl from "../shaders/organism_spectral.wgsl?raw";
import gatherWgsl from "../shaders/reintegrate_ecosystem.wgsl?raw";
import { CHANNELS, GATHER_RADIUS, KERNELS, kernelParameterRecords } from "./config.js";
import type { OrganismConfig } from "./config.js";
import { buildSpatialKernels, kernelSums } from "./kernels.js";
import { arenaExternalAt, gateOpenAt, stormEnvelopeAt, validateArenaEnvironment } from "./arena.js";
import type { ArenaBrushEvent, ArenaDynamics, ArenaEnvironmentState } from "./arena.js";

const LINEAR_WORKGROUP = 128;
const TILE = 8;
const MAX_MUTATIONS_PER_STEP = 16;
const MUTATION_RECORD_BYTES = 128;
const MAX_ENVIRONMENT_EVENTS_PER_STEP = 16;
const ENVIRONMENT_EVENT_RECORD_BYTES = 32;
const MIXED_LINEAGE = 0xffff_ffff;

export type MixingRule = "average" | "whole" | "gene-wise" | "best" | "negotiation";
export const MIXING_RULES: readonly MixingRule[] = ["average", "whole", "gene-wise", "best", "negotiation"];

const ruleIndex: Record<MixingRule, number> = {
  average: 0,
  whole: 1,
  "gene-wise": 2,
  best: 3,
  negotiation: 4,
};

export interface EcosystemInitialState {
  mass: Float32Array;
  h: Float32Array;
  q: Float32Array;
  identity: Uint32Array;
}

export interface EcosystemReadback {
  mass: Float32Array;
  h: Float32Array;
  q: Float32Array;
  identity: Uint32Array;
  perception: Float32Array;
  growth: Float32Array;
  affinity: Float32Array;
  flow: Float32Array;
  displacement: Float32Array;
  clampMask: Float32Array;
  environment?: Float32Array;
  environmentRegions?: Uint32Array;
}

export interface LineageEventRecord {
  eventIndex: number;
  parentLineage: number;
  childLineage: number;
  childFingerprint: readonly [number, number];
  step: number;
  center: readonly [number, number];
  radius: number;
  affectedMass: number;
  deltaH: readonly number[];
  deltaQ: readonly number[];
}

export interface MutationPatchInput {
  row: number;
  column: number;
  radius: number;
  parentLineage: number;
  scale?: number;
  atStep?: number;
}

interface ScheduledMutation extends LineageEventRecord { atStep: number }

export interface EcosystemMetrics {
  step: number;
  totalMass: number;
  channelMass: readonly [number, number, number];
  relativeMassDrift: number;
  minDensity: number;
  maxDensity: number;
  occupiedFraction: number;
  nonFinite: number;
  negative: number;
  maxDisplacement: number;
  clampFraction: number;
  activeLineages: number;
  topLineage: number;
  topLineageMass: number;
  mixedIdentityMass: number;
  shannonDiversity: number;
  phenotypeClusters: number;
  phenotypeShannon: number;
  mutationEvents: number;
  extinctionEvents: number;
  lineageMasses: readonly { lineage: number; mass: number }[];
  regionMass?: readonly [number, number, number, number];
  environmentMin?: number;
  environmentMax?: number;
  wallFraction?: number;
  gateOpen?: boolean;
  stormAmplitude?: number;
}

export interface EcosystemInspection {
  cell: readonly [number, number];
  mass: readonly [number, number, number];
  density: number;
  h: readonly number[];
  q: readonly number[];
  fingerprint: string;
  lineage: number;
  flags: number;
  affinity: readonly [number, number, number];
  displacement: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  environment?: number;
  region?: number;
}

export interface ArenaSolverOptions { environment: true }

export interface ArenaPackedSnapshot {
  schemaVersion: "flow-lenia-arena-snapshot-v1";
  n: number;
  seed: number;
  step: number;
  mixingRule: MixingRule;
  initialMass: number;
  mass: Float32Array;
  h: Float32Array;
  q: Float32Array;
  identity: Uint32Array;
  environment: Float32Array;
  regions: Uint32Array;
  dynamics: ArenaDynamics;
  lineageRing: LineageEventRecord[];
  nextMutationIndex: number;
  extinctionEvents: number;
}

export interface LineageGraph {
  nodes: readonly { lineage: number; mass: number; active: boolean; mutationStep: number | null }[];
  edges: readonly { parent: number; child: number; step: number; affectedMass: number }[];
}

function storageEntry(binding: number, readOnly: boolean): GPUBindGroupLayoutEntry {
  return { binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: readOnly ? "read-only-storage" : "storage" } };
}

function uniformEntry(binding = 0): GPUBindGroupLayoutEntry {
  return { binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } };
}

function splitmix64(input: bigint): bigint {
  const mask = (1n << 64n) - 1n;
  let value = (input + 0x9e37_79b9_7f4a_7c15n) & mask;
  value = ((value ^ (value >> 30n)) * 0xbf58_476d_1ce4_e5b9n) & mask;
  value = ((value ^ (value >> 27n)) * 0x94d0_49bb_1331_11ebn) & mask;
  return (value ^ (value >> 31n)) & mask;
}

function counterHash(seed: number, step: number, destination: number, candidate: number, gene: number): bigint {
  const mask = (1n << 64n) - 1n;
  let value = BigInt(seed >>> 0);
  for (const component of [step, destination, candidate, gene]) value = splitmix64(value ^ (BigInt(component) & mask));
  return value;
}

function unitFloat(value: bigint): number {
  return Number((value >> 11n) & ((1n << 53n) - 1n)) * (1 / 2 ** 53) + 0.5 / 2 ** 53;
}

function normalFromCounter(seed: number, eventIndex: number, gene: number, lane: number): number {
  const u1 = unitFloat(counterHash(seed, eventIndex, gene, lane, 0));
  const u2 = unitFloat(counterHash(seed, eventIndex, gene, lane, 1));
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function eventIdentity(seed: number, parentLineage: number, eventIndex: number, tag: number): bigint {
  return counterHash(seed, eventIndex, parentLineage, tag, 0);
}

function packMutations(events: readonly ScheduledMutation[]): ArrayBuffer {
  const raw = new ArrayBuffer(MAX_MUTATIONS_PER_STEP * MUTATION_RECORD_BYTES);
  const u32 = new Uint32Array(raw);
  const f32 = new Float32Array(raw);
  events.forEach((event, eventOffset) => {
    const base = eventOffset * (MUTATION_RECORD_BYTES / 4);
    u32[base] = event.center[0] >>> 0;
    u32[base + 1] = event.center[1] >>> 0;
    f32[base + 2] = event.radius;
    u32[base + 3] = event.parentLineage >>> 0;
    u32[base + 4] = event.childLineage >>> 0;
    u32[base + 5] = event.childFingerprint[0] >>> 0;
    u32[base + 6] = event.childFingerprint[1] >>> 0;
    u32[base + 7] = event.eventIndex % 128;
    for (let gene = 0; gene < KERNELS; gene += 1) {
      f32[base + 8 + gene] = event.deltaH[gene] as number;
      f32[base + 20 + gene] = event.deltaQ[gene] as number;
    }
  });
  return raw;
}

interface ScheduledEnvironmentEvent extends ArenaBrushEvent { atStep: number; eventIndex: number }

function packEnvironmentEvents(events: readonly ScheduledEnvironmentEvent[]): ArrayBuffer {
  const raw = new ArrayBuffer(MAX_ENVIRONMENT_EVENTS_PER_STEP * ENVIRONMENT_EVENT_RECORD_BYTES);
  const u32 = new Uint32Array(raw);
  const f32 = new Float32Array(raw);
  const mode = { affinity: 0, wall: 1, erase: 2 } as const;
  events.forEach((event, eventOffset) => {
    const base = eventOffset * (ENVIRONMENT_EVENT_RECORD_BYTES / 4);
    f32[base] = event.row;
    f32[base + 1] = event.column;
    f32[base + 2] = event.radius;
    f32[base + 3] = event.strength;
    u32[base + 4] = mode[event.mode];
  });
  return raw;
}

function cloneDynamics(dynamics: ArenaDynamics): ArenaDynamics {
  return {
    channelResponse: [...dynamics.channelResponse],
    gateOpenStep: dynamics.gateOpenStep,
    gateCloseStep: dynamics.gateCloseStep,
    storm: { ...dynamics.storm, center: [...dynamics.storm.center] },
    attractor: { ...dynamics.attractor, center: [...dynamics.attractor.center] },
  };
}

export class FlowLeniaEcosystemSolver {
  readonly n: number;
  readonly n2: number;
  readonly config: OrganismConfig;
  readonly mass: [GPUBuffer, GPUBuffer];
  readonly genomeH: [GPUBuffer, GPUBuffer];
  readonly genomeQ: [GPUBuffer, GPUBuffer];
  readonly identity: [GPUBuffer, GPUBuffer];
  readonly affinity: GPUBuffer;
  readonly transport: GPUBuffer;
  readonly diagnostic: GPUBuffer;
  readonly environment: GPUBuffer | null;
  readonly environmentRegions: GPUBuffer | null;
  readonly arenaEnabled: boolean;
  readonly allocatedBytes: number;
  readonly dispatchesPerStep: number;
  readonly spatialKernelSums: number[];
  stepCount = 0;

  private readonly device: GPUDevice;
  private readonly fft: BatchedFft2d;
  private readonly complex: [GPUBuffer, GPUBuffer];
  private readonly kernelSpectrum: GPUBuffer;
  private readonly kernelFields: GPUBuffer;
  private readonly kernelParams: GPUBuffer;
  private readonly gridUniform: GPUBuffer;
  private readonly flowUniform: GPUBuffer;
  private readonly gatherUniform: GPUBuffer;
  private readonly mutationUniform: GPUBuffer;
  private readonly mutationRecords: GPUBuffer;
  private readonly mutationAffectedMass: GPUBuffer;
  private readonly arenaUniform: GPUBuffer | null;
  private readonly environmentEventUniform: GPUBuffer | null;
  private readonly environmentEventRecords: GPUBuffer | null;
  private readonly packPipeline: GPUComputePipeline;
  private readonly spectralPipeline: GPUComputePipeline;
  private readonly perceivePipeline: GPUComputePipeline;
  private readonly flowPipeline: GPUComputePipeline;
  private readonly gatherPipelines: Record<MixingRule, GPUComputePipeline>;
  private readonly mutationPipeline: GPUComputePipeline;
  private readonly environmentEventPipeline: GPUComputePipeline | null;
  private readonly packGroups: [GPUBindGroup, GPUBindGroup];
  private readonly spectralGroup: GPUBindGroup;
  private readonly perceiveGroups: [GPUBindGroup, GPUBindGroup];
  private readonly flowGroups: [GPUBindGroup, GPUBindGroup];
  private readonly gatherGroups: [GPUBindGroup, GPUBindGroup];
  private readonly mutationGroups: [GPUBindGroup, GPUBindGroup];
  private readonly environmentEventGroup: GPUBindGroup | null;
  private readonly ownedBuffers: GPUBuffer[];
  private readonly shaderModules: GPUShaderModule[];
  private ping = 0;
  private initialMass = 0;
  private pressureEnabled = true;
  private squareHalfWidth: number;
  private mixingRule: MixingRule;
  private negotiationBeta = 1;
  private nextMutationIndex = 1;
  private mutationQueue: ScheduledMutation[] = [];
  private lineageRing: LineageEventRecord[] = [];
  private previousLineages = new Set<number>();
  private extinctionEvents = 0;
  private arenaDynamics: ArenaDynamics | null = null;
  private environmentEventQueue: ScheduledEnvironmentEvent[] = [];
  private nextEnvironmentEventIndex = 1;

  private constructor(device: GPUDevice, config: OrganismConfig, mixingRule: MixingRule, options?: ArenaSolverOptions) {
    this.device = device;
    this.config = config;
    this.n = config.n;
    this.n2 = config.n * config.n;
    this.squareHalfWidth = config.squareHalfWidth;
    this.mixingRule = mixingRule;
    this.arenaEnabled = options?.environment === true;
    const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const makeBuffer = (label: string, bytes: number, usage = storageUsage): GPUBuffer => device.createBuffer({ label: `flow-lenia-m4-${label}`, size: bytes, usage });
    const massBytes = this.n2 * 16;
    const geneBytes = this.n2 * 48;
    const complexBytes = KERNELS * this.n2 * 8;
    this.mass = [makeBuffer("mass-a", massBytes), makeBuffer("mass-b", massBytes)];
    this.genomeH = [makeBuffer("h-a", geneBytes), makeBuffer("h-b", geneBytes)];
    this.genomeQ = [makeBuffer("q-a", geneBytes), makeBuffer("q-b", geneBytes)];
    this.identity = [makeBuffer("identity-a", massBytes), makeBuffer("identity-b", massBytes)];
    this.complex = [makeBuffer("complex-a", complexBytes), makeBuffer("complex-b", complexBytes)];
    this.kernelSpectrum = makeBuffer("kernel-spectra", complexBytes);
    this.kernelFields = makeBuffer("kernel-fields", complexBytes);
    this.affinity = makeBuffer("affinity", massBytes);
    this.transport = makeBuffer("ecosystem-transport", this.n2 * 96);
    this.diagnostic = makeBuffer("flow-diagnostic", this.n2 * 32);
    this.kernelParams = makeBuffer("kernel-params", KERNELS * 32);
    this.gridUniform = makeBuffer("grid-uniform", 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.flowUniform = makeBuffer("flow-uniform", 32, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.gatherUniform = makeBuffer("gather-uniform", 32, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.mutationUniform = makeBuffer("mutation-uniform", 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.mutationRecords = makeBuffer("mutation-records", MAX_MUTATIONS_PER_STEP * MUTATION_RECORD_BYTES);
    this.mutationAffectedMass = makeBuffer("mutation-affected-mass", 128 * 4);
    this.environment = this.arenaEnabled ? makeBuffer("arena-environment", massBytes) : null;
    this.environmentRegions = this.arenaEnabled ? makeBuffer("arena-regions", this.n2 * 4) : null;
    this.arenaUniform = this.arenaEnabled ? makeBuffer("arena-uniform", 96, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST) : null;
    this.environmentEventUniform = this.arenaEnabled ? makeBuffer("arena-event-uniform", 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST) : null;
    this.environmentEventRecords = this.arenaEnabled ? makeBuffer("arena-event-records", MAX_ENVIRONMENT_EVENTS_PER_STEP * ENVIRONMENT_EVENT_RECORD_BYTES) : null;
    this.ownedBuffers = [
      ...this.mass, ...this.genomeH, ...this.genomeQ, ...this.identity, ...this.complex,
      this.kernelSpectrum, this.kernelFields, this.affinity, this.transport, this.diagnostic,
      this.kernelParams, this.gridUniform, this.flowUniform, this.gatherUniform,
      this.mutationUniform, this.mutationRecords, this.mutationAffectedMass,
      ...[this.environment, this.environmentRegions, this.arenaUniform, this.environmentEventUniform, this.environmentEventRecords].filter((buffer): buffer is GPUBuffer => buffer !== null),
    ];
    this.dispatchesPerStep = 4 * Math.log2(this.n) + 5 + (this.arenaEnabled ? 1 : 0);
    device.queue.writeBuffer(this.gridUniform, 0, new Uint32Array([this.n, this.n2, CHANNELS, KERNELS]));
    device.queue.writeBuffer(this.kernelParams, 0, kernelParameterRecords(config));
    this.writeModelUniforms();
    this.fft = new BatchedFft2d(device, this.n, this.complex, [CHANNELS, KERNELS]);
    this.allocatedBytes = this.ownedBuffers.reduce((sum, buffer) => sum + buffer.size, 0) + this.fft.allocatedBytes;

    const packLayout = device.createBindGroupLayout({ entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false)] });
    const spectralLayout = device.createBindGroupLayout({ entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, true), storageEntry(3, true), storageEntry(4, false)] });
    const perceiveLayout = device.createBindGroupLayout({ entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, true), storageEntry(3, true), storageEntry(4, false), storageEntry(5, false), ...(this.arenaEnabled ? [storageEntry(6, true)] : [])] });
    const flowLayout = device.createBindGroupLayout({ entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, true), storageEntry(3, true), storageEntry(4, false), storageEntry(5, false)] });
    const gatherLayout = device.createBindGroupLayout({
      label: "flow-lenia-m4-eight-storage-gather-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false), storageEntry(3, true), storageEntry(4, false), storageEntry(5, true), storageEntry(6, false), storageEntry(7, true), storageEntry(8, false)],
    });
    const mutationLayout = device.createBindGroupLayout({ entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false), storageEntry(3, false), storageEntry(4, false), storageEntry(5, true), storageEntry(6, false)] });
    const environmentEventLayout = this.arenaEnabled ? device.createBindGroupLayout({ entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false)] }) : null;
    const modules = {
      pack: device.createShaderModule({ code: packWgsl }),
      spectral: device.createShaderModule({ code: spectralWgsl }),
      perceive: device.createShaderModule({ code: this.arenaEnabled ? arenaPerceiveWgsl : perceiveWgsl }),
      flow: device.createShaderModule({ code: flowWgsl }),
      gather: device.createShaderModule({ code: gatherWgsl }),
      mutation: device.createShaderModule({ code: mutationWgsl }),
      environmentEvents: device.createShaderModule({ code: arenaEventsWgsl }),
    };
    this.shaderModules = Object.values(modules);
    this.packPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [packLayout] }), compute: { module: modules.pack, entryPoint: "pack_mass" } });
    this.spectralPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [spectralLayout] }), compute: { module: modules.spectral, entryPoint: "expand_spectra" } });
    this.perceivePipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [perceiveLayout] }), compute: { module: modules.perceive, entryPoint: this.arenaEnabled ? "perceive_arena" : "perceive_ecosystem" } });
    this.flowPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [flowLayout] }), compute: { module: modules.flow, entryPoint: "compute_ecosystem_flow" } });
    const gatherPipeline = (rule: MixingRule): GPUComputePipeline => device.createComputePipeline({
      label: `flow-lenia-m4-gather-${rule}`,
      layout: device.createPipelineLayout({ bindGroupLayouts: [gatherLayout] }),
      compute: { module: modules.gather, entryPoint: "gather_ecosystem", constants: { MIXING_RULE: ruleIndex[rule] } },
    });
    this.gatherPipelines = Object.fromEntries(MIXING_RULES.map((rule) => [rule, gatherPipeline(rule)])) as unknown as Record<MixingRule, GPUComputePipeline>;
    this.mutationPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [mutationLayout] }), compute: { module: modules.mutation, entryPoint: "apply_mutation_patches" } });
    this.environmentEventPipeline = this.arenaEnabled && environmentEventLayout
      ? device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [environmentEventLayout] }), compute: { module: modules.environmentEvents, entryPoint: "apply_environment_events" } })
      : null;

    const entries = (layout: GPUBindGroupLayout, resources: GPUBuffer[]): GPUBindGroup => device.createBindGroup({ layout, entries: resources.map((buffer, binding) => ({ binding, resource: { buffer } })) });
    this.packGroups = this.mass.map((mass) => entries(packLayout, [this.gridUniform, mass, this.complex[0]])) as [GPUBindGroup, GPUBindGroup];
    this.spectralGroup = entries(spectralLayout, [this.gridUniform, this.complex[0], this.kernelSpectrum, this.kernelParams, this.complex[1]]);
    this.perceiveGroups = [0, 1].map((ping) => entries(perceiveLayout, [this.arenaUniform ?? this.gridUniform, this.complex[1], this.kernelParams, this.genomeH[ping] as GPUBuffer, this.kernelFields, this.affinity, ...(this.environment ? [this.environment] : [])])) as [GPUBindGroup, GPUBindGroup];
    this.flowGroups = [0, 1].map((ping) => entries(flowLayout, [this.flowUniform, this.mass[ping] as GPUBuffer, this.affinity, this.kernelFields, this.transport, this.diagnostic])) as [GPUBindGroup, GPUBindGroup];
    this.gatherGroups = [
      entries(gatherLayout, [this.gatherUniform, this.transport, this.mass[1], this.genomeH[0], this.genomeH[1], this.genomeQ[0], this.genomeQ[1], this.identity[0], this.identity[1]]),
      entries(gatherLayout, [this.gatherUniform, this.transport, this.mass[0], this.genomeH[1], this.genomeH[0], this.genomeQ[1], this.genomeQ[0], this.identity[1], this.identity[0]]),
    ];
    this.mutationGroups = [0, 1].map((ping) => entries(mutationLayout, [this.mutationUniform, this.mutationRecords, this.genomeH[ping] as GPUBuffer, this.genomeQ[ping] as GPUBuffer, this.identity[ping] as GPUBuffer, this.mass[ping] as GPUBuffer, this.mutationAffectedMass])) as [GPUBindGroup, GPUBindGroup];
    this.environmentEventGroup = this.arenaEnabled && environmentEventLayout && this.environmentEventUniform && this.environmentEventRecords && this.environment
      ? entries(environmentEventLayout, [this.environmentEventUniform, this.environmentEventRecords, this.environment])
      : null;
    const spatial = buildSpatialKernels(config);
    this.spatialKernelSums = kernelSums(spatial, this.n, KERNELS);
    device.queue.writeBuffer(this.complex[0], 0, spatial as unknown as BufferSource);
  }

  static async create(device: GPUDevice, config: OrganismConfig, mixingRule: MixingRule = "whole", options?: ArenaSolverOptions): Promise<FlowLeniaEcosystemSolver> {
    device.pushErrorScope("validation");
    const solver = new FlowLeniaEcosystemSolver(device, config, mixingRule, options);
    const encoder = device.createCommandEncoder({ label: "flow-lenia-m4-kernel-spectrum-build" });
    const pass = encoder.beginComputePass();
    solver.fft.resetPing(0);
    solver.fft.encode2d(pass, KERNELS, -1);
    pass.end();
    encoder.copyBufferToBuffer(solver.fft.currentBuffer, 0, solver.kernelSpectrum, 0, solver.kernelSpectrum.size);
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const reports = await Promise.all([solver.fft.module, ...solver.shaderModules].map((module) => module.getCompilationInfo()));
    const errors = reports.flatMap((report) => report.messages).filter((message) => message.type === "error");
    const validation = await device.popErrorScope();
    if (validation || errors.length > 0) {
      solver.destroy();
      const detail = errors.map((message) => `${message.lineNum}:${message.linePos} ${message.message}`).join("\n");
      throw new Error(`${solver.arenaEnabled ? "M5" : "M4"} shader validation failed: ${validation?.message ?? detail}`);
    }
    return solver;
  }

  private writeModelUniforms(): void {
    const flowRaw = new ArrayBuffer(32);
    const flowU32 = new Uint32Array(flowRaw);
    const flowF32 = new Float32Array(flowRaw);
    flowU32.set([this.n, this.n2, CHANNELS, 0]);
    flowF32.set([this.config.dt, this.pressureEnabled ? this.config.densityThreshold : 1e9, this.config.densityExponent, GATHER_RADIUS - this.squareHalfWidth], 4);
    this.device.queue.writeBuffer(this.flowUniform, 0, flowRaw);
  }

  private writeGatherUniform(): void {
    const raw = new ArrayBuffer(32);
    const u32 = new Uint32Array(raw);
    const f32 = new Float32Array(raw);
    u32.set([this.n, CHANNELS, GATHER_RADIUS, this.stepCount]);
    f32[4] = this.squareHalfWidth;
    f32[5] = this.negotiationBeta;
    u32[6] = this.config.seed >>> 0;
    this.device.queue.writeBuffer(this.gatherUniform, 0, raw);
  }

  private writeArenaUniform(): void {
    if (!this.arenaUniform || !this.arenaDynamics) return;
    const raw = new ArrayBuffer(96);
    const u32 = new Uint32Array(raw);
    const f32 = new Float32Array(raw);
    u32.set([this.n, this.n2, CHANNELS, KERNELS]);
    f32.set([...this.arenaDynamics.channelResponse, 0], 4);
    f32[8] = gateOpenAt(this.arenaDynamics, this.stepCount) ? 1 : 0;
    f32[9] = this.stepCount;
    f32[10] = this.arenaDynamics.storm.startStep;
    f32[11] = this.arenaDynamics.storm.duration;
    f32.set([...this.arenaDynamics.storm.center, this.arenaDynamics.storm.radius, this.arenaDynamics.storm.amplitude], 12);
    f32.set([...this.arenaDynamics.attractor.center, this.arenaDynamics.attractor.radius, this.arenaDynamics.attractor.amplitude], 16);
    f32.set([this.arenaDynamics.attractor.orbitRadius, this.arenaDynamics.attractor.angularSpeed, this.arenaDynamics.attractor.phase, 1], 20);
    this.device.queue.writeBuffer(this.arenaUniform, 0, raw);
  }

  setMixingRule(rule: MixingRule): void { this.mixingRule = rule; }
  getMixingRule(): MixingRule { return this.mixingRule; }
  setNegotiationBeta(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 20) throw new Error("negotiation beta must be within [0, 20]");
    this.negotiationBeta = value;
  }
  setPressureEnabled(enabled: boolean): void { this.pressureEnabled = enabled; this.writeModelUniforms(); }
  setSquareHalfWidth(value: number): void {
    if (!Number.isFinite(value) || value < 0.3 || value > 1.25) throw new Error("square half-width must be within [0.3, 1.25]");
    this.squareHalfWidth = value;
    this.writeModelUniforms();
  }

  reset(state: EcosystemInitialState, arena?: ArenaEnvironmentState): void {
    if (state.mass.length !== this.n2 * 4 || state.h.length !== this.n2 * 12 || state.q.length !== this.n2 * 12 || state.identity.length !== this.n2 * 4) throw new Error("ecosystem state has an invalid packed length");
    this.initialMass = 0;
    for (let cell = 0; cell < this.n2; cell += 1) this.initialMass += (state.mass[cell * 4] as number) + (state.mass[cell * 4 + 1] as number) + (state.mass[cell * 4 + 2] as number);
    for (const buffer of this.mass) this.device.queue.writeBuffer(buffer, 0, state.mass as unknown as BufferSource);
    for (const buffer of this.genomeH) this.device.queue.writeBuffer(buffer, 0, state.h as unknown as BufferSource);
    for (const buffer of this.genomeQ) this.device.queue.writeBuffer(buffer, 0, state.q as unknown as BufferSource);
    for (const buffer of this.identity) this.device.queue.writeBuffer(buffer, 0, state.identity as unknown as BufferSource);
    this.ping = 0;
    this.stepCount = 0;
    this.nextMutationIndex = 1;
    this.mutationQueue = [];
    this.lineageRing = [];
    this.previousLineages = new Set<number>();
    this.extinctionEvents = 0;
    this.environmentEventQueue = [];
    this.nextEnvironmentEventIndex = 1;
    this.device.queue.writeBuffer(this.mutationAffectedMass, 0, new Uint32Array(128));
    if (this.arenaEnabled) {
      if (!arena || !this.environment || !this.environmentRegions) throw new Error("Arena solver reset requires a versioned environment");
      validateArenaEnvironment(arena, this.n);
      this.arenaDynamics = cloneDynamics(arena.dynamics);
      this.device.queue.writeBuffer(this.environment, 0, arena.field as unknown as BufferSource);
      this.device.queue.writeBuffer(this.environmentRegions, 0, arena.regions as unknown as BufferSource);
      this.writeArenaUniform();
    } else if (arena) throw new Error("Ecosystem solver was not created with Arena environment resources");
  }

  queueEnvironmentEvent(input: ArenaBrushEvent): void {
    if (!this.arenaEnabled) throw new Error("environment tools require an Arena solver");
    if (!Number.isFinite(input.row) || !Number.isFinite(input.column) || !Number.isFinite(input.radius) || !Number.isFinite(input.strength)) throw new Error("environment event values must be finite");
    const event: ScheduledEnvironmentEvent = {
      ...input,
      row: ((input.row % this.n) + this.n) % this.n,
      column: ((input.column % this.n) + this.n) % this.n,
      radius: Math.max(1, Math.min(this.n / 3, input.radius)),
      strength: Math.max(-2, Math.min(2, input.strength)),
      atStep: Math.max(this.stepCount, input.atStep ?? this.stepCount),
      eventIndex: this.nextEnvironmentEventIndex++,
    };
    this.environmentEventQueue.push(event);
    this.environmentEventQueue.sort((a, b) => a.atStep - b.atStep || a.eventIndex - b.eventIndex);
  }

  getArenaDynamics(): ArenaDynamics | null { return this.arenaDynamics ? cloneDynamics(this.arenaDynamics) : null; }
  getGateOpen(): boolean { return this.arenaDynamics ? gateOpenAt(this.arenaDynamics, this.stepCount) : false; }
  getStormAmplitude(): number { return this.arenaDynamics ? this.arenaDynamics.storm.amplitude * stormEnvelopeAt(this.arenaDynamics.storm, this.stepCount) : 0; }

  queueMutation(input: MutationPatchInput): LineageEventRecord {
    const eventIndex = this.nextMutationIndex++;
    const scale = Math.max(0, Math.min(0.5, input.scale ?? 0.05));
    const parent = input.parentLineage >>> 0;
    let childLineage = Number(eventIdentity(this.config.seed, parent, eventIndex, 0) & 0xffff_fffen) >>> 0;
    if (childLineage === 0) childLineage = 2;
    let fingerprint = eventIdentity(this.config.seed, parent, eventIndex, 1);
    if (fingerprint === 0n) fingerprint = 1n;
    const deltaH = Array.from({ length: KERNELS }, (_, gene) => Math.fround(scale * normalFromCounter(this.config.seed, eventIndex, gene, 0)));
    const deltaQ = Array.from({ length: KERNELS }, (_, gene) => Math.fround(scale * normalFromCounter(this.config.seed, eventIndex, gene, 1)));
    const record: ScheduledMutation = {
      eventIndex,
      parentLineage: parent,
      childLineage,
      childFingerprint: [Number(fingerprint & 0xffff_ffffn) >>> 0, Number(fingerprint >> 32n) >>> 0],
      step: Math.max(this.stepCount, input.atStep ?? this.stepCount),
      atStep: Math.max(this.stepCount, input.atStep ?? this.stepCount),
      center: [((Math.floor(input.row) % this.n) + this.n) % this.n, ((Math.floor(input.column) % this.n) + this.n) % this.n],
      radius: Math.max(1, Math.min(this.n / 3, input.radius)),
      affectedMass: 0,
      deltaH,
      deltaQ,
    };
    this.mutationQueue.push(record);
    this.mutationQueue.sort((a, b) => a.atStep - b.atStep || a.eventIndex - b.eventIndex);
    return record;
  }

  getLineageRing(): readonly LineageEventRecord[] { return this.lineageRing; }

  step(count = 1): void {
    if (!Number.isInteger(count) || count < 1) throw new Error("step count must be a positive integer");
    for (let iteration = 0; iteration < count; iteration += 1) {
      const due = this.mutationQueue.filter((event) => event.atStep === this.stepCount).slice(0, MAX_MUTATIONS_PER_STEP);
      const dueEnvironment = this.environmentEventQueue.filter((event) => event.atStep <= this.stepCount).slice(0, MAX_ENVIRONMENT_EVENTS_PER_STEP);
      if (due.length > 0) {
        this.device.queue.writeBuffer(this.mutationRecords, 0, packMutations(due));
        this.device.queue.writeBuffer(this.mutationUniform, 0, new Uint32Array([this.n, due.length, 0, 0]));
        for (const event of due) this.device.queue.writeBuffer(this.mutationAffectedMass, (event.eventIndex % 128) * 4, new Uint32Array([0]));
      }
      if (dueEnvironment.length > 0 && this.environmentEventRecords && this.environmentEventUniform) {
        this.device.queue.writeBuffer(this.environmentEventRecords, 0, packEnvironmentEvents(dueEnvironment));
        this.device.queue.writeBuffer(this.environmentEventUniform, 0, new Uint32Array([this.n, this.n2, dueEnvironment.length, 0]));
      }
      this.writeGatherUniform();
      this.writeArenaUniform();
      const encoder = this.device.createCommandEncoder({ label: `flow-lenia-${this.arenaEnabled ? "m5" : "m4"}-step-${this.stepCount}` });
      const pass = encoder.beginComputePass();
      if (dueEnvironment.length > 0 && this.environmentEventPipeline && this.environmentEventGroup) {
        pass.setPipeline(this.environmentEventPipeline);
        pass.setBindGroup(0, this.environmentEventGroup);
        pass.dispatchWorkgroups(Math.ceil(this.n2 / LINEAR_WORKGROUP));
      }
      if (due.length > 0) {
        pass.setPipeline(this.mutationPipeline);
        pass.setBindGroup(0, this.mutationGroups[this.ping]);
        pass.dispatchWorkgroups(Math.ceil(this.n2 / LINEAR_WORKGROUP));
      }
      if (dueEnvironment.length > 0) {
        const ids = new Set(dueEnvironment.map((event) => event.eventIndex));
        this.environmentEventQueue = this.environmentEventQueue.filter((event) => !ids.has(event.eventIndex));
      }
      this.fft.resetPing(0);
      pass.setPipeline(this.packPipeline);
      pass.setBindGroup(0, this.packGroups[this.ping]);
      pass.dispatchWorkgroups(Math.ceil((CHANNELS * this.n2) / LINEAR_WORKGROUP));
      this.fft.encode2d(pass, CHANNELS, -1);
      pass.setPipeline(this.spectralPipeline);
      pass.setBindGroup(0, this.spectralGroup);
      pass.dispatchWorkgroups(Math.ceil((KERNELS * this.n2) / LINEAR_WORKGROUP));
      this.fft.swapAfterExternalWrite();
      this.fft.encode2d(pass, KERNELS, 1);
      pass.setPipeline(this.perceivePipeline);
      pass.setBindGroup(0, this.perceiveGroups[this.ping]);
      pass.dispatchWorkgroups(Math.ceil(this.n2 / LINEAR_WORKGROUP));
      pass.setPipeline(this.flowPipeline);
      pass.setBindGroup(0, this.flowGroups[this.ping]);
      pass.dispatchWorkgroups(Math.ceil(this.n / TILE), Math.ceil(this.n / TILE));
      pass.setPipeline(this.gatherPipelines[this.mixingRule]);
      pass.setBindGroup(0, this.gatherGroups[this.ping]);
      pass.dispatchWorkgroups(Math.ceil(this.n / TILE), Math.ceil(this.n / TILE));
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      if (due.length > 0) {
        const ids = new Set(due.map((event) => event.eventIndex));
        this.mutationQueue = this.mutationQueue.filter((event) => !ids.has(event.eventIndex));
        this.lineageRing.push(...due);
        if (this.lineageRing.length > 128) this.lineageRing.splice(0, this.lineageRing.length - 128);
      }
      this.ping = 1 - this.ping;
      this.stepCount += 1;
    }
  }

  get currentMassBuffer(): GPUBuffer { return this.mass[this.ping]; }
  get currentHBuffer(): GPUBuffer { return this.genomeH[this.ping]; }
  get currentQBuffer(): GPUBuffer { return this.genomeQ[this.ping]; }
  get currentIdentityBuffer(): GPUBuffer { return this.identity[this.ping]; }
  get currentPing(): number { return this.ping; }

  private async readBuffers(requests: Array<[GPUBuffer, number]>): Promise<ArrayBuffer[]> {
    const staging = requests.map(([, bytes]) => this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }));
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m4-readback" });
    requests.forEach(([source, bytes], index) => encoder.copyBufferToBuffer(source, 0, staging[index] as GPUBuffer, 0, bytes));
    this.device.queue.submit([encoder.finish()]);
    await Promise.all(staging.map((buffer) => buffer.mapAsync(GPUMapMode.READ)));
    const output = staging.map((buffer) => buffer.getMappedRange().slice(0));
    staging.forEach((buffer) => { buffer.unmap(); buffer.destroy(); });
    return output;
  }

  async readback(): Promise<EcosystemReadback> {
    const requests: Array<[GPUBuffer, number]> = [
      [this.currentMassBuffer, this.n2 * 16], [this.currentHBuffer, this.n2 * 48], [this.currentQBuffer, this.n2 * 48], [this.currentIdentityBuffer, this.n2 * 16],
      [this.kernelFields, KERNELS * this.n2 * 8], [this.affinity, this.n2 * 16], [this.transport, this.n2 * 96], [this.diagnostic, this.n2 * 32],
    ];
    if (this.environment && this.environmentRegions) requests.push([this.environment, this.n2 * 16], [this.environmentRegions, this.n2 * 4]);
    const [massRaw, hRaw, qRaw, identityRaw, kernelRaw, affinityRaw, transportRaw, diagnosticRaw, environmentRaw, regionsRaw] = await this.readBuffers(requests);
    const massPacked = new Float32Array(massRaw);
    const hPacked = new Float32Array(hRaw);
    const qPacked = new Float32Array(qRaw);
    const kernelPacked = new Float32Array(kernelRaw);
    const affinityPacked = new Float32Array(affinityRaw);
    const transportPacked = new Float32Array(transportRaw);
    const diagnosticPacked = new Float32Array(diagnosticRaw);
    const mass = new Float32Array(CHANNELS * this.n2);
    const h = new Float32Array(KERNELS * this.n2);
    const q = new Float32Array(KERNELS * this.n2);
    const perception = new Float32Array(KERNELS * this.n2);
    const growth = new Float32Array(KERNELS * this.n2);
    const affinity = new Float32Array(CHANNELS * this.n2);
    const flow = new Float32Array(CHANNELS * 2 * this.n2);
    const displacement = new Float32Array(CHANNELS * 2 * this.n2);
    const clampMask = new Float32Array(CHANNELS * this.n2);
    for (let cell = 0; cell < this.n2; cell += 1) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        const plane = channel * this.n2 + cell;
        mass[plane] = massPacked[cell * 4 + channel] as number;
        affinity[plane] = affinityPacked[cell * 4 + channel] as number;
        clampMask[plane] = diagnosticPacked[cell * 8 + 4 + channel] as number;
        for (let axis = 0; axis < 2; axis += 1) {
          const vector = (channel * 2 + axis) * this.n2 + cell;
          const value = transportPacked[cell * 24 + (axis === 0 ? 4 : 8) + channel] as number;
          displacement[vector] = value;
          flow[vector] = value / this.config.dt;
        }
      }
      for (let gene = 0; gene < KERNELS; gene += 1) {
        h[gene * this.n2 + cell] = hPacked[cell * 12 + gene] as number;
        q[gene * this.n2 + cell] = qPacked[cell * 12 + gene] as number;
      }
    }
    for (let index = 0; index < KERNELS * this.n2; index += 1) {
      perception[index] = kernelPacked[index * 2] as number;
      growth[index] = kernelPacked[index * 2 + 1] as number;
    }
    return {
      mass, h, q, identity: new Uint32Array(identityRaw), perception, growth, affinity, flow, displacement, clampMask,
      ...(environmentRaw ? { environment: new Float32Array(environmentRaw) } : {}),
      ...(regionsRaw ? { environmentRegions: new Uint32Array(regionsRaw) } : {}),
    };
  }

  async inspect(row: number, column: number): Promise<EcosystemInspection> {
    const i = ((Math.floor(row) % this.n) + this.n) % this.n;
    const j = ((Math.floor(column) % this.n) + this.n) % this.n;
    const cell = i * this.n + j;
    const staging = this.device.createBuffer({ size: this.arenaEnabled ? 260 : 240, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m4-cell-inspection" });
    encoder.copyBufferToBuffer(this.currentMassBuffer, cell * 16, staging, 0, 16);
    encoder.copyBufferToBuffer(this.currentHBuffer, cell * 48, staging, 16, 48);
    encoder.copyBufferToBuffer(this.currentQBuffer, cell * 48, staging, 64, 48);
    encoder.copyBufferToBuffer(this.currentIdentityBuffer, cell * 16, staging, 112, 16);
    encoder.copyBufferToBuffer(this.affinity, cell * 16, staging, 128, 16);
    encoder.copyBufferToBuffer(this.transport, cell * 96, staging, 144, 96);
    if (this.environment && this.environmentRegions) {
      encoder.copyBufferToBuffer(this.environment, cell * 16, staging, 240, 16);
      encoder.copyBufferToBuffer(this.environmentRegions, cell * 4, staging, 256, 4);
    }
    this.device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const raw = staging.getMappedRange().slice(0);
    staging.unmap();
    staging.destroy();
    const massPacked = new Float32Array(raw, 0, 4);
    const hPacked = new Float32Array(raw, 16, 12);
    const qPacked = new Float32Array(raw, 64, 12);
    const identity = new Uint32Array(raw, 112, 4);
    const affinity = new Float32Array(raw, 128, 4);
    const transport = new Float32Array(raw, 144, 24);
    const environment = this.arenaEnabled ? new Float32Array(raw, 240, 4) : null;
    const regions = this.arenaEnabled ? new Uint32Array(raw, 256, 1) : null;
    const mass = [massPacked[0], massPacked[1], massPacked[2]] as [number, number, number];
    const fingerprint = `${(identity[1] as number).toString(16).padStart(8, "0")}${(identity[0] as number).toString(16).padStart(8, "0")}`;
    return {
      cell: [i, j], mass, density: mass[0] + mass[1] + mass[2],
      h: Array.from(hPacked.slice(0, KERNELS)), q: Array.from(qPacked.slice(0, KERNELS)), fingerprint,
      lineage: identity[2] as number, flags: identity[3] as number,
      affinity: [affinity[0], affinity[1], affinity[2]],
      displacement: [[transport[4], transport[8]], [transport[5], transport[9]], [transport[6], transport[10]]],
      ...(environment ? { environment: (environment[0] as number) + (environment[1] as number) + (this.getGateOpen() ? 0 : environment[2] as number) } : {}),
      ...(regions ? { region: regions[0] as number } : {}),
    };
  }

  async metrics(): Promise<EcosystemMetrics> {
    const state = await this.readback();
    const channelMass: [number, number, number] = [0, 0, 0];
    const lineageMass = new Map<number, number>();
    const phenotypeMass = new Map<string, number>();
    let minDensity = Number.POSITIVE_INFINITY;
    let maxDensity = 0;
    let occupied = 0;
    let nonFinite = 0;
    let negative = 0;
    let maxDisplacement = 0;
    let clamped = 0;
    let mixedIdentityMass = 0;
    const regionMass: [number, number, number, number] = [0, 0, 0, 0];
    let environmentMin = Number.POSITIVE_INFINITY;
    let environmentMax = Number.NEGATIVE_INFINITY;
    let wallCells = 0;
    for (let cell = 0; cell < this.n2; cell += 1) {
      let density = 0;
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        const value = state.mass[channel * this.n2 + cell] as number;
        if (!Number.isFinite(value)) nonFinite += 1;
        if (value < 0) negative += 1;
        channelMass[channel] += value;
        density += value;
        clamped += state.clampMask[channel * this.n2 + cell] as number;
        for (let axis = 0; axis < 2; axis += 1) maxDisplacement = Math.max(maxDisplacement, Math.abs(state.displacement[(channel * 2 + axis) * this.n2 + cell] as number));
      }
      minDensity = Math.min(minDensity, density);
      maxDensity = Math.max(maxDensity, density);
      if (state.environmentRegions) {
        const region = Math.min(3, state.environmentRegions[cell] as number);
        regionMass[region] += density;
      }
      if (state.environment && this.arenaDynamics) {
        const row = Math.floor(cell / this.n);
        const column = cell % this.n;
        const external = arenaExternalAt(state.environment, this.n, row, column, this.arenaDynamics, this.stepCount);
        environmentMin = Math.min(environmentMin, external);
        environmentMax = Math.max(environmentMax, external);
        if ((state.environment[cell * 4 + 3] as number) > 0.05) wallCells += 1;
      }
      if (density > 1e-3) occupied += 1;
      if (density > 1e-8) {
        const lineage = state.identity[cell * 4 + 2] as number;
        if (lineage === MIXED_LINEAGE) mixedIdentityMass += density;
        else if (lineage !== 0) lineageMass.set(lineage, (lineageMass.get(lineage) ?? 0) + density);
        const key = [0, 4, 8].map((gene) => Math.round((state.h[gene * this.n2 + cell] as number) * 8)).concat([0, 4, 8].map((gene) => Math.round((state.q[gene * this.n2 + cell] as number) * 8))).join(":");
        phenotypeMass.set(key, (phenotypeMass.get(key) ?? 0) + density);
      }
    }
    const totalMass = channelMass[0] + channelMass[1] + channelMass[2];
    const diversity = (masses: Iterable<number>): number => {
      let entropy = 0;
      for (const value of masses) { const p = value / Math.max(totalMass, 1e-30); if (p > 0) entropy -= p * Math.log(p); }
      return entropy;
    };
    let topLineage = 0;
    let topLineageMass = 0;
    for (const [lineage, value] of lineageMass) if (value > topLineageMass || (value === topLineageMass && lineage < topLineage)) { topLineage = lineage; topLineageMass = value; }
    const currentLineages = new Set(lineageMass.keys());
    if (this.previousLineages.size > 0) for (const lineage of this.previousLineages) if (!currentLineages.has(lineage)) this.extinctionEvents += 1;
    this.previousLineages = currentLineages;
    if (this.lineageRing.length > 0) {
      const [affectedRaw] = await this.readBuffers([[this.mutationAffectedMass, 128 * 4]]);
      const affected = new Uint32Array(affectedRaw as ArrayBuffer);
      for (const event of this.lineageRing) event.affectedMass = (affected[event.eventIndex % 128] as number) / 65536;
    }
    const lineageMasses = [...lineageMass.entries()].map(([lineage, mass]) => ({ lineage, mass })).sort((a, b) => b.mass - a.mass || a.lineage - b.lineage);
    return {
      step: this.stepCount, totalMass, channelMass,
      relativeMassDrift: Math.abs(totalMass - this.initialMass) / Math.max(this.initialMass, 1e-30),
      minDensity, maxDensity, occupiedFraction: occupied / this.n2, nonFinite, negative, maxDisplacement,
      clampFraction: clamped / (CHANNELS * this.n2), activeLineages: lineageMass.size, topLineage, topLineageMass,
      mixedIdentityMass, shannonDiversity: diversity(lineageMass.values()), phenotypeClusters: phenotypeMass.size,
      phenotypeShannon: diversity(phenotypeMass.values()), mutationEvents: this.lineageRing.length, extinctionEvents: this.extinctionEvents,
      lineageMasses,
      ...(state.environment ? {
        regionMass,
        environmentMin,
        environmentMax,
        wallFraction: wallCells / this.n2,
        gateOpen: this.getGateOpen(),
        stormAmplitude: this.getStormAmplitude(),
      } : {}),
    };
  }

  lineageGraph(metrics: EcosystemMetrics): LineageGraph {
    const masses = new Map(metrics.lineageMasses.map((record) => [record.lineage, record.mass]));
    const mutationStep = new Map<number, number>();
    const ids = new Set<number>(masses.keys());
    for (const event of this.lineageRing) {
      ids.add(event.parentLineage);
      ids.add(event.childLineage);
      mutationStep.set(event.childLineage, event.step);
    }
    return {
      nodes: [...ids].sort((a, b) => a - b).map((lineage) => ({ lineage, mass: masses.get(lineage) ?? 0, active: masses.has(lineage), mutationStep: mutationStep.get(lineage) ?? null })),
      edges: this.lineageRing.map((event) => ({ parent: event.parentLineage, child: event.childLineage, step: event.step, affectedMass: event.affectedMass })),
    };
  }

  async packedSnapshot(): Promise<ArenaPackedSnapshot> {
    if (!this.environment || !this.environmentRegions || !this.arenaDynamics) throw new Error("packed Arena snapshots require an Arena solver");
    const [massRaw, hRaw, qRaw, identityRaw, environmentRaw, regionsRaw] = await this.readBuffers([
      [this.currentMassBuffer, this.n2 * 16], [this.currentHBuffer, this.n2 * 48], [this.currentQBuffer, this.n2 * 48],
      [this.currentIdentityBuffer, this.n2 * 16], [this.environment, this.n2 * 16], [this.environmentRegions, this.n2 * 4],
    ]);
    return {
      schemaVersion: "flow-lenia-arena-snapshot-v1",
      n: this.n,
      seed: this.config.seed,
      step: this.stepCount,
      mixingRule: this.mixingRule,
      initialMass: this.initialMass,
      mass: new Float32Array(massRaw),
      h: new Float32Array(hRaw),
      q: new Float32Array(qRaw),
      identity: new Uint32Array(identityRaw),
      environment: new Float32Array(environmentRaw),
      regions: new Uint32Array(regionsRaw),
      dynamics: cloneDynamics(this.arenaDynamics),
      lineageRing: this.lineageRing.map((event) => ({ ...event, center: [...event.center], childFingerprint: [...event.childFingerprint], deltaH: [...event.deltaH], deltaQ: [...event.deltaQ] })),
      nextMutationIndex: this.nextMutationIndex,
      extinctionEvents: this.extinctionEvents,
    };
  }

  restorePackedSnapshot(snapshot: ArenaPackedSnapshot): void {
    if (!this.environment || !this.environmentRegions || !this.arenaUniform) throw new Error("Arena snapshot restore requires an Arena solver");
    if (snapshot.schemaVersion !== "flow-lenia-arena-snapshot-v1" || snapshot.n !== this.n || snapshot.seed !== this.config.seed) throw new Error("Arena snapshot model/grid/seed does not match this solver");
    if (!Number.isInteger(snapshot.step) || snapshot.step < 0 || !Number.isFinite(snapshot.initialMass) || snapshot.initialMass <= 0) throw new Error("Arena snapshot step or initial mass is invalid");
    const expected = [snapshot.mass.length === this.n2 * 4, snapshot.h.length === this.n2 * 12, snapshot.q.length === this.n2 * 12, snapshot.identity.length === this.n2 * 4, snapshot.environment.length === this.n2 * 4, snapshot.regions.length === this.n2];
    if (!expected.every(Boolean)) throw new Error("Arena snapshot contains an invalid packed field length");
    validateArenaEnvironment({ schemaVersion: "flow-lenia-arena-environment-v1", field: snapshot.environment, regions: snapshot.regions, dynamics: snapshot.dynamics }, this.n);
    for (const buffer of this.mass) this.device.queue.writeBuffer(buffer, 0, snapshot.mass as unknown as BufferSource);
    for (const buffer of this.genomeH) this.device.queue.writeBuffer(buffer, 0, snapshot.h as unknown as BufferSource);
    for (const buffer of this.genomeQ) this.device.queue.writeBuffer(buffer, 0, snapshot.q as unknown as BufferSource);
    for (const buffer of this.identity) this.device.queue.writeBuffer(buffer, 0, snapshot.identity as unknown as BufferSource);
    this.device.queue.writeBuffer(this.environment, 0, snapshot.environment as unknown as BufferSource);
    this.device.queue.writeBuffer(this.environmentRegions, 0, snapshot.regions as unknown as BufferSource);
    this.ping = 0;
    this.stepCount = snapshot.step;
    this.initialMass = snapshot.initialMass;
    this.mixingRule = snapshot.mixingRule;
    this.arenaDynamics = cloneDynamics(snapshot.dynamics);
    this.lineageRing = snapshot.lineageRing.map((event) => ({ ...event, center: [...event.center], childFingerprint: [...event.childFingerprint], deltaH: [...event.deltaH], deltaQ: [...event.deltaQ] }));
    this.nextMutationIndex = snapshot.nextMutationIndex;
    this.extinctionEvents = snapshot.extinctionEvents;
    this.mutationQueue = [];
    this.environmentEventQueue = [];
    this.previousLineages = new Set<number>();
    this.writeArenaUniform();
  }

  destroy(): void { this.fft.destroy(); for (const buffer of this.ownedBuffers) buffer.destroy(); }
}
