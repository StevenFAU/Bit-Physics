import { BatchedFft2d } from "../fft-batch.js";
import eventWgsl from "../shaders/organism_events.wgsl?raw";
import flowWgsl from "../shaders/organism_flow.wgsl?raw";
import packWgsl from "../shaders/organism_pack.wgsl?raw";
import perceiveWgsl from "../shaders/organism_perceive.wgsl?raw";
import gatherWgsl from "../shaders/reintegrate_organism.wgsl?raw";
import spectralWgsl from "../shaders/organism_spectral.wgsl?raw";
import {
  CHANNELS,
  GATHER_RADIUS,
  KERNELS,
  kernelParameterRecords,
} from "./config.js";
import type { OrganismConfig } from "./config.js";
import { buildSpatialKernels, kernelSums } from "./kernels.js";
import { EVENT_LEDGER_SCALE, MAX_STEP_EVENTS, packBrushEvents } from "./events.js";
import type { BrushEventInput, ScheduledBrushEvent } from "./events.js";

const LINEAR_WORKGROUP = 128;
const TILE = 8;

export interface SolverReadback {
  mass: Float32Array;
  perception: Float32Array;
  growth: Float32Array;
  affinity: Float32Array;
  alpha: Float32Array;
  flow: Float32Array;
  displacement: Float32Array;
  clampMask: Float32Array;
  ledgerAdded: number;
  ledgerRemoved: number;
}

export interface SolverMetrics {
  step: number;
  totalMass: number;
  channelMass: [number, number, number];
  relativeMassDrift: number;
  minDensity: number;
  maxDensity: number;
  occupiedFraction: number;
  nonFinite: number;
  negative: number;
  maxFlow: number;
  maxDisplacement: number;
  clampFraction: number;
  ledgerAdded: number;
  ledgerRemoved: number;
  expectedMass: number;
  ledgerError: number;
}

export interface CellInspection {
  cell: readonly [number, number];
  mass: readonly [number, number, number];
  density: number;
  affinity: readonly [number, number, number];
  alpha: readonly [number, number, number];
  flow: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  displacement: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  clamp: readonly [number, number, number];
  perception: readonly number[];
  growth: readonly number[];
}

function storageEntry(binding: number, readOnly: boolean): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: readOnly ? "read-only-storage" : "storage" },
  };
}

function uniformEntry(binding = 0): GPUBindGroupLayoutEntry {
  return { binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } };
}

export class FlowLeniaOrganismSolver {
  readonly n: number;
  readonly n2: number;
  readonly config: OrganismConfig;
  readonly mass: [GPUBuffer, GPUBuffer];
  readonly affinity: GPUBuffer;
  readonly transport: GPUBuffer;
  readonly diagnostic: GPUBuffer;
  readonly allocatedBytes: number;
  readonly dispatchesPerStep: number;
  readonly spatialKernelSums: number[];
  stepCount = 0;

  private readonly device: GPUDevice;
  private readonly fft: BatchedFft2d;
  private readonly complex: [GPUBuffer, GPUBuffer];
  private readonly kernelSpectrum: GPUBuffer;
  private readonly kernelFields: GPUBuffer;
  private readonly eventBuffer: GPUBuffer;
  private readonly eventLedger: GPUBuffer;
  private readonly kernelParams: GPUBuffer;
  private readonly gridUniform: GPUBuffer;
  private readonly flowUniform: GPUBuffer;
  private readonly gatherUniform: GPUBuffer;
  private readonly eventUniform: GPUBuffer;
  private readonly packPipeline: GPUComputePipeline;
  private readonly spectralPipeline: GPUComputePipeline;
  private readonly perceivePipeline: GPUComputePipeline;
  private readonly flowPipeline: GPUComputePipeline;
  private readonly gatherPipeline: GPUComputePipeline;
  private readonly openEventPipeline: GPUComputePipeline;
  private readonly impulseEventPipeline: GPUComputePipeline;
  private readonly packGroups: [GPUBindGroup, GPUBindGroup];
  private readonly spectralGroup: GPUBindGroup;
  private readonly perceiveGroup: GPUBindGroup;
  private readonly flowGroups: [GPUBindGroup, GPUBindGroup];
  private readonly gatherGroups: [GPUBindGroup, GPUBindGroup];
  private readonly openEventGroups: [GPUBindGroup, GPUBindGroup];
  private readonly impulseEventGroup: GPUBindGroup;
  private readonly ownedBuffers: GPUBuffer[];
  private ping = 0;
  private initialMass = new Float64Array(CHANNELS);
  private pressureEnabled = true;
  private squareHalfWidth: number;
  private nextEventId = 1;
  private eventQueue: ScheduledBrushEvent[] = [];
  private appliedEvents: ScheduledBrushEvent[] = [];

  private constructor(device: GPUDevice, config: OrganismConfig) {
    this.device = device;
    this.config = config;
    this.n = config.n;
    this.n2 = config.n * config.n;
    this.squareHalfWidth = config.squareHalfWidth;
    const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const makeBuffer = (label: string, bytes: number, usage = storageUsage): GPUBuffer =>
      device.createBuffer({ label: `flow-lenia-m2-${label}`, size: bytes, usage });

    const massBytes = this.n2 * 16;
    const complexBytes = KERNELS * this.n2 * 8;
    this.mass = [makeBuffer("mass-a", massBytes), makeBuffer("mass-b", massBytes)];
    this.complex = [makeBuffer("complex-a", complexBytes), makeBuffer("complex-b", complexBytes)];
    this.kernelSpectrum = makeBuffer("kernel-spectra", complexBytes);
    this.kernelFields = makeBuffer("kernel-fields", complexBytes);
    this.affinity = makeBuffer("affinity", massBytes);
    this.transport = makeBuffer("transport", this.n2 * 48);
    this.diagnostic = makeBuffer("flow-diagnostic", this.n2 * 32);
    this.eventBuffer = makeBuffer("event-records", MAX_STEP_EVENTS * 48);
    this.eventLedger = makeBuffer("event-ledger", 8);
    this.kernelParams = makeBuffer("kernel-params", KERNELS * 32);
    this.gridUniform = makeBuffer("grid-uniform", 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.flowUniform = makeBuffer("flow-uniform", 32, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.gatherUniform = makeBuffer("gather-uniform", 32, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.eventUniform = makeBuffer("event-uniform", 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.ownedBuffers = [
      ...this.mass,
      ...this.complex,
      this.kernelSpectrum,
      this.kernelFields,
      this.affinity,
      this.transport,
      this.diagnostic,
      this.eventBuffer,
      this.eventLedger,
      this.kernelParams,
      this.gridUniform,
      this.flowUniform,
      this.gatherUniform,
      this.eventUniform,
    ];
    this.dispatchesPerStep = 4 * Math.log2(this.n) + 5;

    device.queue.writeBuffer(this.gridUniform, 0, new Uint32Array([this.n, this.n2, CHANNELS, KERNELS]));
    device.queue.writeBuffer(this.kernelParams, 0, kernelParameterRecords(config));
    this.writeModelUniforms();

    this.fft = new BatchedFft2d(device, this.n, this.complex, [CHANNELS, KERNELS]);
    this.allocatedBytes = this.ownedBuffers.reduce((sum, buffer) => sum + buffer.size, 0) + this.fft.allocatedBytes;

    const packLayout = device.createBindGroupLayout({
      label: "flow-lenia-m2-pack-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false)],
    });
    const spectralLayout = device.createBindGroupLayout({
      label: "flow-lenia-m2-spectral-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, true), storageEntry(3, true), storageEntry(4, false)],
    });
    const perceiveLayout = device.createBindGroupLayout({
      label: "flow-lenia-m2-perceive-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, true), storageEntry(3, false), storageEntry(4, false)],
    });
    const flowLayout = device.createBindGroupLayout({
      label: "flow-lenia-m2-flow-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, true), storageEntry(3, false), storageEntry(4, false)],
    });
    const gatherLayout = device.createBindGroupLayout({
      label: "flow-lenia-m2-organism-gather-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false)],
    });
    const openEventLayout = device.createBindGroupLayout({
      label: "flow-lenia-m3-open-event-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false), storageEntry(3, false)],
    });
    const emptyLayout = device.createBindGroupLayout({ label: "flow-lenia-m3-empty-layout", entries: [] });
    const impulseEventLayout = device.createBindGroupLayout({
      label: "flow-lenia-m3-impulse-event-layout",
      entries: [uniformEntry(), storageEntry(1, true), storageEntry(2, false)],
    });

    const modules = {
      pack: device.createShaderModule({ label: "flow-lenia-m2-pack", code: packWgsl }),
      spectral: device.createShaderModule({ label: "flow-lenia-m2-spectral", code: spectralWgsl }),
      perceive: device.createShaderModule({ label: "flow-lenia-m2-perceive", code: perceiveWgsl }),
      flow: device.createShaderModule({ label: "flow-lenia-m2-flow", code: flowWgsl }),
      gather: device.createShaderModule({ label: "flow-lenia-m2-gather", code: gatherWgsl }),
      events: device.createShaderModule({ label: "flow-lenia-m3-events", code: eventWgsl }),
    };
    this.shaderModules = Object.values(modules);
    this.packPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [packLayout] }), compute: { module: modules.pack, entryPoint: "pack_mass" },
    });
    this.spectralPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [spectralLayout] }), compute: { module: modules.spectral, entryPoint: "expand_spectra" },
    });
    this.perceivePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [perceiveLayout] }), compute: { module: modules.perceive, entryPoint: "perceive_growth" },
    });
    this.flowPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [flowLayout] }), compute: { module: modules.flow, entryPoint: "compute_flow" },
    });
    this.gatherPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [gatherLayout] }), compute: { module: modules.gather, entryPoint: "gather_organism" },
    });
    this.openEventPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [openEventLayout] }), compute: { module: modules.events, entryPoint: "apply_open_events" },
    });
    this.impulseEventPipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [emptyLayout, impulseEventLayout] }), compute: { module: modules.events, entryPoint: "apply_closed_impulses" },
    });

    const entries = (layout: GPUBindGroupLayout, resources: GPUBuffer[]): GPUBindGroup => device.createBindGroup({
      layout,
      entries: resources.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
    this.packGroups = this.mass.map((mass) => entries(packLayout, [this.gridUniform, mass, this.complex[0]])) as [GPUBindGroup, GPUBindGroup];
    this.spectralGroup = entries(spectralLayout, [this.gridUniform, this.complex[0], this.kernelSpectrum, this.kernelParams, this.complex[1]]);
    this.perceiveGroup = entries(perceiveLayout, [this.gridUniform, this.complex[1], this.kernelParams, this.kernelFields, this.affinity]);
    this.flowGroups = this.mass.map((mass) => entries(flowLayout, [this.flowUniform, mass, this.affinity, this.transport, this.diagnostic])) as [GPUBindGroup, GPUBindGroup];
    this.gatherGroups = [
      entries(gatherLayout, [this.gatherUniform, this.transport, this.mass[1]]),
      entries(gatherLayout, [this.gatherUniform, this.transport, this.mass[0]]),
    ];
    this.openEventGroups = this.mass.map((mass) => entries(openEventLayout, [this.eventUniform, this.eventBuffer, mass, this.eventLedger])) as [GPUBindGroup, GPUBindGroup];
    this.impulseEventGroup = entries(impulseEventLayout, [this.eventUniform, this.eventBuffer, this.transport]);

    const spatial = buildSpatialKernels(config);
    this.spatialKernelSums = kernelSums(spatial, this.n, KERNELS);
    device.queue.writeBuffer(this.complex[0], 0, spatial as unknown as BufferSource);
  }

  private readonly shaderModules: GPUShaderModule[];

  static async create(device: GPUDevice, config: OrganismConfig): Promise<FlowLeniaOrganismSolver> {
    device.pushErrorScope("validation");
    const solver = new FlowLeniaOrganismSolver(device, config);
    const encoder = device.createCommandEncoder({ label: "flow-lenia-m2-kernel-spectrum-build" });
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
      throw new Error(`M2 shader validation failed: ${validation?.message ?? detail}`);
    }
    return solver;
  }

  private writeModelUniforms(): void {
    const maxDisplacement = GATHER_RADIUS - this.squareHalfWidth;
    const flowRaw = new ArrayBuffer(32);
    const flowU32 = new Uint32Array(flowRaw);
    const flowF32 = new Float32Array(flowRaw);
    flowU32.set([this.n, this.n2, CHANNELS, 0]);
    flowF32.set([
      this.config.dt,
      this.pressureEnabled ? this.config.densityThreshold : 1e9,
      this.config.densityExponent,
      maxDisplacement,
    ], 4);
    this.device.queue.writeBuffer(this.flowUniform, 0, flowRaw);

    const gatherRaw = new ArrayBuffer(32);
    const gatherU32 = new Uint32Array(gatherRaw);
    const gatherF32 = new Float32Array(gatherRaw);
    gatherU32.set([this.n, CHANNELS, GATHER_RADIUS, 0]);
    gatherF32[4] = this.squareHalfWidth;
    this.device.queue.writeBuffer(this.gatherUniform, 0, gatherRaw);
  }

  setPressureEnabled(enabled: boolean): void {
    this.pressureEnabled = enabled;
    this.writeModelUniforms();
  }

  isPressureEnabled(): boolean { return this.pressureEnabled; }

  setSquareHalfWidth(value: number): void {
    if (!Number.isFinite(value) || value < 0.3 || value > 1.25) {
      throw new Error("square half-width must be within the verified interactive range [0.3, 1.25]");
    }
    this.squareHalfWidth = value;
    this.writeModelUniforms();
  }

  getSquareHalfWidth(): number { return this.squareHalfWidth; }

  reset(mass: Float32Array): void {
    if (mass.length !== this.n2 * 4) throw new Error(`mass must contain ${this.n2 * 4} packed values`);
    this.initialMass = new Float64Array(CHANNELS);
    for (let cell = 0; cell < this.n2; cell += 1) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        this.initialMass[channel] += mass[cell * 4 + channel] as number;
      }
    }
    this.device.queue.writeBuffer(this.mass[0], 0, mass as unknown as BufferSource);
    this.device.queue.writeBuffer(this.mass[1], 0, mass as unknown as BufferSource);
    this.ping = 0;
    this.stepCount = 0;
    this.eventQueue = [];
    this.appliedEvents = [];
    this.nextEventId = 1;
    this.device.queue.writeBuffer(this.eventLedger, 0, new Uint32Array([0, 0]));
  }

  queueEvent(input: BrushEventInput): ScheduledBrushEvent {
    const scheduled: ScheduledBrushEvent = {
      ...input,
      x: ((input.x % this.n) + this.n) % this.n,
      y: ((input.y % this.n) + this.n) % this.n,
      radius: Math.max(1, Math.min(this.n / 3, input.radius)),
      strength: Math.max(0, input.strength),
      channel: Math.max(0, Math.min(3, input.channel | 0)),
      directionX: input.directionX ?? 0,
      directionY: input.directionY ?? 0,
      polarity: input.polarity ?? 1,
      atStep: Math.max(this.stepCount, input.atStep ?? this.stepCount),
      id: this.nextEventId,
    };
    this.nextEventId += 1;
    this.eventQueue.push(scheduled);
    this.eventQueue.sort((a, b) => a.atStep - b.atStep || a.id - b.id);
    return scheduled;
  }

  getPendingEvents(): readonly ScheduledBrushEvent[] { return this.eventQueue; }
  getAppliedEvents(): readonly ScheduledBrushEvent[] { return this.appliedEvents; }

  private uploadEvents(events: readonly ScheduledBrushEvent[]): void {
    this.device.queue.writeBuffer(this.eventBuffer, 0, packBrushEvents(events));
    const uniformRaw = new ArrayBuffer(16);
    const u32 = new Uint32Array(uniformRaw);
    const f32 = new Float32Array(uniformRaw);
    u32[0] = this.n;
    u32[1] = events.length;
    f32[2] = GATHER_RADIUS - this.squareHalfWidth;
    f32[3] = EVENT_LEDGER_SCALE;
    this.device.queue.writeBuffer(this.eventUniform, 0, uniformRaw);
  }

  private encodeOne(pass: GPUComputePassEncoder, events: readonly ScheduledBrushEvent[]): void {
    if (events.length > 0) {
      pass.setPipeline(this.openEventPipeline);
      pass.setBindGroup(0, this.openEventGroups[this.ping]);
      pass.dispatchWorkgroups(Math.ceil(this.n2 / LINEAR_WORKGROUP));
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
    pass.setBindGroup(0, this.perceiveGroup);
    pass.dispatchWorkgroups(Math.ceil(this.n2 / LINEAR_WORKGROUP));
    pass.setPipeline(this.flowPipeline);
    pass.setBindGroup(0, this.flowGroups[this.ping]);
    pass.dispatchWorkgroups(Math.ceil(this.n / TILE), Math.ceil(this.n / TILE));
    if (events.length > 0) {
      pass.setPipeline(this.impulseEventPipeline);
      pass.setBindGroup(1, this.impulseEventGroup);
      pass.dispatchWorkgroups(Math.ceil(this.n2 / LINEAR_WORKGROUP));
    }
    pass.setPipeline(this.gatherPipeline);
    pass.setBindGroup(0, this.gatherGroups[this.ping]);
    pass.dispatchWorkgroups(Math.ceil(this.n / TILE), Math.ceil(this.n / TILE));
    this.ping = 1 - this.ping;
    this.stepCount += 1;
  }

  step(count = 1): void {
    if (!Number.isInteger(count) || count < 1) throw new Error("step count must be a positive integer");
    let remaining = count;
    while (remaining > 0) {
      const nextEventStep = this.eventQueue[0]?.atStep ?? Number.POSITIVE_INFINITY;
      const batch = nextEventStep > this.stepCount
        ? Math.min(remaining, nextEventStep - this.stepCount)
        : 1;
      const events = nextEventStep <= this.stepCount
        ? this.eventQueue.filter((event) => event.atStep === this.stepCount).slice(0, MAX_STEP_EVENTS)
        : [];
      if (events.length > 0) this.uploadEvents(events);
      const encoder = this.device.createCommandEncoder({ label: `flow-lenia-m3-step-${this.stepCount}` });
      const pass = encoder.beginComputePass();
      for (let iteration = 0; iteration < batch; iteration += 1) this.encodeOne(pass, iteration === 0 ? events : []);
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      if (events.length > 0) {
        const ids = new Set(events.map((event) => event.id));
        this.eventQueue = this.eventQueue.filter((event) => !ids.has(event.id));
        this.appliedEvents.push(...events);
      }
      remaining -= batch;
    }
  }

  get currentMassBuffer(): GPUBuffer { return this.mass[this.ping]; }

  private async readBuffers(requests: Array<[GPUBuffer, number]>): Promise<ArrayBuffer[]> {
    const staging = requests.map(([, bytes]) => this.device.createBuffer({
      size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    }));
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m2-readback" });
    requests.forEach(([source, bytes], index) => encoder.copyBufferToBuffer(source, 0, staging[index] as GPUBuffer, 0, bytes));
    this.device.queue.submit([encoder.finish()]);
    await Promise.all(staging.map((buffer) => buffer.mapAsync(GPUMapMode.READ)));
    const output = staging.map((buffer) => buffer.getMappedRange().slice(0));
    staging.forEach((buffer) => { buffer.unmap(); buffer.destroy(); });
    return output;
  }

  async readback(): Promise<SolverReadback> {
    const [massRaw, kernelRaw, affinityRaw, transportRaw, diagnosticRaw, ledgerRaw] = await this.readBuffers([
      [this.currentMassBuffer, this.n2 * 16],
      [this.kernelFields, KERNELS * this.n2 * 8],
      [this.affinity, this.n2 * 16],
      [this.transport, this.n2 * 48],
      [this.diagnostic, this.n2 * 32],
      [this.eventLedger, 8],
    ]);
    const massPacked = new Float32Array(massRaw as ArrayBuffer);
    const kernelPacked = new Float32Array(kernelRaw as ArrayBuffer);
    const affinityPacked = new Float32Array(affinityRaw as ArrayBuffer);
    const transportPacked = new Float32Array(transportRaw as ArrayBuffer);
    const diagnosticPacked = new Float32Array(diagnosticRaw as ArrayBuffer);
    const mass = new Float32Array(CHANNELS * this.n2);
    const perception = new Float32Array(KERNELS * this.n2);
    const growth = new Float32Array(KERNELS * this.n2);
    const affinity = new Float32Array(CHANNELS * this.n2);
    const alpha = new Float32Array(CHANNELS * this.n2);
    const flow = new Float32Array(CHANNELS * 2 * this.n2);
    const displacement = new Float32Array(CHANNELS * 2 * this.n2);
    const clampMask = new Float32Array(CHANNELS * this.n2);
    for (let cell = 0; cell < this.n2; cell += 1) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        const planeIndex = channel * this.n2 + cell;
        mass[planeIndex] = massPacked[cell * 4 + channel] as number;
        affinity[planeIndex] = affinityPacked[cell * 4 + channel] as number;
        alpha[planeIndex] = diagnosticPacked[cell * 8 + channel] as number;
        clampMask[planeIndex] = diagnosticPacked[cell * 8 + 4 + channel] as number;
        for (let axis = 0; axis < 2; axis += 1) {
          const vectorIndex = (channel * 2 + axis) * this.n2 + cell;
          const value = transportPacked[cell * 12 + (axis === 0 ? 4 : 8) + channel] as number;
          displacement[vectorIndex] = value;
          flow[vectorIndex] = value / this.config.dt;
        }
      }
    }
    for (let index = 0; index < KERNELS * this.n2; index += 1) {
      perception[index] = kernelPacked[index * 2] as number;
      growth[index] = kernelPacked[index * 2 + 1] as number;
    }
    const ledger = new Uint32Array(ledgerRaw as ArrayBuffer);
    return {
      mass,
      perception,
      growth,
      affinity,
      alpha,
      flow,
      displacement,
      clampMask,
      ledgerAdded: (ledger[0] as number) / EVENT_LEDGER_SCALE,
      ledgerRemoved: (ledger[1] as number) / EVENT_LEDGER_SCALE,
    };
  }

  async inspect(i: number, j: number): Promise<CellInspection> {
    const row = ((Math.floor(i) % this.n) + this.n) % this.n;
    const column = ((Math.floor(j) % this.n) + this.n) % this.n;
    const cell = row * this.n + column;
    const staging = this.device.createBuffer({ size: 192, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m3-cell-inspection" });
    encoder.copyBufferToBuffer(this.currentMassBuffer, cell * 16, staging, 0, 16);
    encoder.copyBufferToBuffer(this.affinity, cell * 16, staging, 16, 16);
    encoder.copyBufferToBuffer(this.transport, cell * 48, staging, 32, 48);
    encoder.copyBufferToBuffer(this.diagnostic, cell * 32, staging, 80, 32);
    for (let kernel = 0; kernel < KERNELS; kernel += 1) {
      encoder.copyBufferToBuffer(this.kernelFields, (kernel * this.n2 + cell) * 8, staging, 112 + kernel * 8, 8);
    }
    this.device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const values = new Float32Array(staging.getMappedRange().slice(0));
    staging.unmap();
    staging.destroy();
    const mass = [values[0], values[1], values[2]] as [number, number, number];
    const affinity = [values[4], values[5], values[6]] as [number, number, number];
    const alpha = [values[20], values[21], values[22]] as [number, number, number];
    const clamp = [values[24], values[25], values[26]] as [number, number, number];
    const displacement = Array.from({ length: CHANNELS }, (_, channel) => [
      values[8 + channel] as number,
      values[12 + channel] as number,
    ] as const) as unknown as CellInspection["displacement"];
    const flow = displacement.map(([x, y]) => [x / this.config.dt, y / this.config.dt] as const) as unknown as CellInspection["flow"];
    const perception = Array.from({ length: KERNELS }, (_, kernel) => values[28 + kernel * 2] as number);
    const growth = Array.from({ length: KERNELS }, (_, kernel) => values[29 + kernel * 2] as number);
    return {
      cell: [row, column],
      mass,
      density: mass[0] + mass[1] + mass[2],
      affinity,
      alpha,
      flow,
      displacement,
      clamp,
      perception,
      growth,
    };
  }

  async metrics(): Promise<SolverMetrics> {
    const state = await this.readback();
    const channelMass: [number, number, number] = [0, 0, 0];
    let minDensity = Number.POSITIVE_INFINITY;
    let maxDensity = 0;
    let occupied = 0;
    let nonFinite = 0;
    let negative = 0;
    let maxFlow = 0;
    let maxDisplacement = 0;
    let clamped = 0;
    for (let cell = 0; cell < this.n2; cell += 1) {
      let density = 0;
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        const index = channel * this.n2 + cell;
        const value = state.mass[index] as number;
        if (!Number.isFinite(value)) nonFinite += 1;
        if (value < 0) negative += 1;
        channelMass[channel] += value;
        density += value;
        clamped += state.clampMask[index] as number;
        for (let axis = 0; axis < 2; axis += 1) {
          const vector = (channel * 2 + axis) * this.n2 + cell;
          maxFlow = Math.max(maxFlow, Math.abs(state.flow[vector] as number));
          maxDisplacement = Math.max(maxDisplacement, Math.abs(state.displacement[vector] as number));
        }
      }
      minDensity = Math.min(minDensity, density);
      maxDensity = Math.max(maxDensity, density);
      if (density > 1e-3) occupied += 1;
    }
    const totalMass = channelMass[0] + channelMass[1] + channelMass[2];
    const initial = this.initialMass[0] + this.initialMass[1] + this.initialMass[2];
    const expectedMass = initial + state.ledgerAdded - state.ledgerRemoved;
    const ledgerError = totalMass - expectedMass;
    return {
      step: this.stepCount,
      totalMass,
      channelMass,
      relativeMassDrift: Math.abs(ledgerError) / Math.max(expectedMass, 1e-30),
      minDensity,
      maxDensity,
      occupiedFraction: occupied / this.n2,
      nonFinite,
      negative,
      maxFlow,
      maxDisplacement,
      clampFraction: clamped / (CHANNELS * this.n2),
      ledgerAdded: state.ledgerAdded,
      ledgerRemoved: state.ledgerRemoved,
      expectedMass,
      ledgerError,
    };
  }

  destroy(): void {
    this.fft.destroy();
    for (const buffer of this.ownedBuffers) buffer.destroy();
  }
}
