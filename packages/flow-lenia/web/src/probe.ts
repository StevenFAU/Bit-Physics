import { BatchedFft2d } from "./fft-batch.js";
import {
  M0_CHANNELS,
  M0_DD,
  M0_KERNELS,
  M0_SIGMA,
  completeEcosystemInventory,
} from "./inventory.js";
import expandWgsl from "./shaders/spectral_expand.wgsl?raw";
import gatherWgsl from "./shaders/reintegrate.wgsl?raw";

const FFT_WORKGROUP = 128;
const GATHER_TILE = 8;

export type BenchmarkMode = "fft" | "gather-mass" | "gather-full" | "step-mass" | "step-full";

export interface BenchmarkResult {
  n: number;
  mode: BenchmarkMode;
  timing: "timestamp-query" | "queue-completion";
  samples: number;
  dispatchesPerStep: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
}

export interface VerificationResult {
  fftMaxAbs: number;
  gatherMassRelativeResidual: number;
  fullMassRelativeResidual: number;
  uniformGenomeMaxAbs: number;
  uniformIdentityExact: boolean;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] as number;
}

function summarize(
  n: number,
  mode: BenchmarkMode,
  timing: BenchmarkResult["timing"],
  dispatchesPerStep: number,
  values: number[],
): BenchmarkResult {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n,
    mode,
    timing,
    samples: values.length,
    dispatchesPerStep,
    meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    minMs: sorted[0] as number,
    maxMs: sorted[sorted.length - 1] as number,
  };
}

function sourceValue(channel: number, x: number, y: number, n: number): number {
  const phase = (2 * Math.PI * ((channel + 1) * x + (channel + 2) * y)) / n;
  return 0.35 + channel * 0.07 + 0.12 * Math.sin(phase) + 0.04 * Math.cos(phase * 0.5);
}

function massValue(channel: number, x: number, y: number): number {
  return 0.2 + channel * 0.05 + ((x * 17 + y * 29 + channel * 11) % 31) / 155;
}

export class FlowLeniaM0Probe {
  readonly n: number;
  readonly allocatedBytes: number;
  readonly fft: BatchedFft2d;
  readonly expandModule: GPUShaderModule;
  readonly gatherModule: GPUShaderModule;

  private readonly device: GPUDevice;
  private readonly n2: number;
  private readonly complexBuffers: [GPUBuffer, GPUBuffer];
  private readonly kernelSpectrum: GPUBuffer;
  private readonly transportIn: GPUBuffer;
  private readonly massOut: GPUBuffer;
  private readonly hIn: GPUBuffer;
  private readonly hOut: GPUBuffer;
  private readonly qIn: GPUBuffer;
  private readonly qOut: GPUBuffer;
  private readonly identityIn: GPUBuffer;
  private readonly identityOut: GPUBuffer;
  private readonly expandUniform: GPUBuffer;
  private readonly gatherUniform: GPUBuffer;
  private readonly expandPipeline: GPUComputePipeline;
  private readonly gatherMassPipeline: GPUComputePipeline;
  private readonly gatherFullPipeline: GPUComputePipeline;
  private readonly expandGroups: [GPUBindGroup, GPUBindGroup];
  private readonly gatherMassGroup: GPUBindGroup;
  private readonly gatherFullGroup: GPUBindGroup;
  private readonly ownedBuffers: GPUBuffer[];
  private readonly inputMassSums = new Float64Array(M0_CHANNELS);

  private constructor(device: GPUDevice, n: number) {
    this.device = device;
    this.n = n;
    this.n2 = n * n;
    const log2n = Math.log2(n);
    if (!Number.isInteger(log2n)) throw new Error("M0 grid dimension must be a power of two");

    const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const makeBuffer = (label: string, bytes: number, usage = storageUsage): GPUBuffer =>
      device.createBuffer({ label, size: bytes, usage });

    const complexBytes = M0_KERNELS * this.n2 * 8;
    this.complexBuffers = [
      makeBuffer("flow-lenia-m0-complex-a", complexBytes),
      makeBuffer("flow-lenia-m0-complex-b", complexBytes),
    ];
    this.kernelSpectrum = makeBuffer("flow-lenia-m0-kernel-spectra", complexBytes);
    this.transportIn = makeBuffer("flow-lenia-m0-transport-in", this.n2 * 48);
    this.massOut = makeBuffer("flow-lenia-m0-mass-out", this.n2 * 16);
    this.hIn = makeBuffer("flow-lenia-m0-h-in", this.n2 * 48);
    this.hOut = makeBuffer("flow-lenia-m0-h-out", this.n2 * 48);
    this.qIn = makeBuffer("flow-lenia-m0-q-in", this.n2 * 48);
    this.qOut = makeBuffer("flow-lenia-m0-q-out", this.n2 * 48);
    this.identityIn = makeBuffer("flow-lenia-m0-identity-in", this.n2 * 16);
    this.identityOut = makeBuffer("flow-lenia-m0-identity-out", this.n2 * 16);
    this.expandUniform = makeBuffer(
      "flow-lenia-m0-expand-uniform",
      16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.gatherUniform = makeBuffer(
      "flow-lenia-m0-gather-uniform",
      32,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.ownedBuffers = [
      ...this.complexBuffers,
      this.kernelSpectrum,
      this.transportIn,
      this.massOut,
      this.hIn,
      this.hOut,
      this.qIn,
      this.qOut,
      this.identityIn,
      this.identityOut,
      this.expandUniform,
      this.gatherUniform,
    ];
    this.allocatedBytes =
      complexBytes * 3 + this.n2 * (48 + 16 + 48 * 4 + 16 * 2) + 16 + 32;

    this.fft = new BatchedFft2d(device, n, this.complexBuffers, [M0_CHANNELS, M0_KERNELS]);

    const expandLayout = device.createBindGroupLayout({
      label: "flow-lenia-m0-expand-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    this.expandModule = device.createShaderModule({
      label: "flow-lenia-m0-spectral-expand",
      code: expandWgsl,
    });
    this.expandPipeline = device.createComputePipeline({
      label: "flow-lenia-m0-spectral-expand",
      layout: device.createPipelineLayout({ bindGroupLayouts: [expandLayout] }),
      compute: { module: this.expandModule, entryPoint: "spectral_expand" },
    });
    this.expandGroups = [0, 1].map((source) =>
      device.createBindGroup({
        layout: expandLayout,
        entries: [
          { binding: 0, resource: { buffer: this.expandUniform } },
          { binding: 1, resource: { buffer: this.complexBuffers[source] } },
          { binding: 2, resource: { buffer: this.kernelSpectrum } },
          { binding: 3, resource: { buffer: this.complexBuffers[1 - source] } },
        ],
      }),
    ) as [GPUBindGroup, GPUBindGroup];

    const massLayout = device.createBindGroupLayout({
      label: "flow-lenia-m0-gather-mass-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const fullLayout = device.createBindGroupLayout({
      label: "flow-lenia-m0-gather-full-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 8, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    this.gatherModule = device.createShaderModule({
      label: "flow-lenia-m0-reintegration",
      code: gatherWgsl,
    });
    this.gatherMassPipeline = device.createComputePipeline({
      label: "flow-lenia-m0-gather-mass",
      layout: device.createPipelineLayout({ bindGroupLayouts: [massLayout] }),
      compute: { module: this.gatherModule, entryPoint: "gather_mass" },
    });
    this.gatherFullPipeline = device.createComputePipeline({
      label: "flow-lenia-m0-gather-full",
      layout: device.createPipelineLayout({ bindGroupLayouts: [fullLayout] }),
      compute: { module: this.gatherModule, entryPoint: "gather_full" },
    });
    this.gatherMassGroup = device.createBindGroup({
      layout: massLayout,
      entries: [
        { binding: 0, resource: { buffer: this.gatherUniform } },
        { binding: 1, resource: { buffer: this.transportIn } },
        { binding: 2, resource: { buffer: this.massOut } },
      ],
    });
    this.gatherFullGroup = device.createBindGroup({
      layout: fullLayout,
      entries: [
        { binding: 0, resource: { buffer: this.gatherUniform } },
        { binding: 1, resource: { buffer: this.transportIn } },
        { binding: 2, resource: { buffer: this.massOut } },
        { binding: 3, resource: { buffer: this.hIn } },
        { binding: 4, resource: { buffer: this.hOut } },
        { binding: 5, resource: { buffer: this.qIn } },
        { binding: 6, resource: { buffer: this.qOut } },
        { binding: 7, resource: { buffer: this.identityIn } },
        { binding: 8, resource: { buffer: this.identityOut } },
      ],
    });

    device.queue.writeBuffer(
      this.expandUniform,
      0,
      new Uint32Array([this.n2, M0_CHANNELS, M0_KERNELS, 0]),
    );
    const gatherRaw = new ArrayBuffer(32);
    const gatherU32 = new Uint32Array(gatherRaw);
    const gatherF32 = new Float32Array(gatherRaw);
    gatherU32[0] = n;
    gatherU32[1] = M0_CHANNELS;
    gatherU32[2] = M0_DD;
    gatherF32[4] = M0_SIGMA;
    device.queue.writeBuffer(this.gatherUniform, 0, gatherRaw);
    this.uploadInitialState();
  }

  static async create(device: GPUDevice, n: number): Promise<FlowLeniaM0Probe> {
    device.pushErrorScope("validation");
    const probe = new FlowLeniaM0Probe(device, n);
    const modules = [probe.fft.module, probe.expandModule, probe.gatherModule];
    const reports = await Promise.all(modules.map((module) => module.getCompilationInfo()));
    const messages = reports.flatMap((report) => report.messages).filter((message) => message.type === "error");
    const validation = await device.popErrorScope();
    if (messages.length > 0 || validation) {
      probe.destroy();
      const detail = messages.map((message) => `${message.lineNum}:${message.linePos} ${message.message}`).join("\n");
      throw new Error(`M0 shader validation failed: ${validation?.message ?? detail}`);
    }
    return probe;
  }

  private uploadInitialState(): void {
    this.inputMassSums.fill(0);
    const complex = new Float32Array(M0_KERNELS * this.n2 * 2);
    for (let channel = 0; channel < M0_CHANNELS; channel += 1) {
      for (let y = 0; y < this.n; y += 1) {
        for (let x = 0; x < this.n; x += 1) {
          const element = channel * this.n2 + y * this.n + x;
          complex[element * 2] = sourceValue(channel, x, y, this.n);
        }
      }
    }
    this.device.queue.writeBuffer(this.complexBuffers[0], 0, complex as unknown as BufferSource);
    this.device.queue.writeBuffer(this.complexBuffers[1], 0, complex as unknown as BufferSource);

    const kernels = new Float32Array(M0_KERNELS * this.n2 * 2);
    const inverseScale = 1 / this.n2;
    for (let element = 0; element < M0_KERNELS * this.n2; element += 1) {
      kernels[element * 2] = inverseScale;
    }
    this.device.queue.writeBuffer(this.kernelSpectrum, 0, kernels as unknown as BufferSource);

    const transport = new Float32Array(this.n2 * 12);
    for (let y = 0; y < this.n; y += 1) {
      for (let x = 0; x < this.n; x += 1) {
        const cell = y * this.n + x;
        const base = cell * 12;
        for (let channel = 0; channel < M0_CHANNELS; channel += 1) {
          const mass = massValue(channel, x, y);
          transport[base + channel] = mass;
          transport[base + 4 + channel] = 1.75 * Math.sin((2 * Math.PI * (y + channel * 7)) / this.n);
          transport[base + 8 + channel] = 1.75 * Math.cos((2 * Math.PI * (x + channel * 5)) / this.n);
          this.inputMassSums[channel] += mass;
        }
      }
    }
    this.device.queue.writeBuffer(this.transportIn, 0, transport as unknown as BufferSource);

    const h = new Float32Array(this.n2 * 12);
    const q = new Float32Array(this.n2 * 12);
    for (let cell = 0; cell < this.n2; cell += 1) {
      for (let gene = 0; gene < 12; gene += 1) {
        h[cell * 12 + gene] = (gene + 1) * 0.05;
        q[cell * 12 + gene] = (gene + 1) * 0.025 - 0.1;
      }
    }
    this.device.queue.writeBuffer(this.hIn, 0, h as unknown as BufferSource);
    this.device.queue.writeBuffer(this.qIn, 0, q as unknown as BufferSource);
    const identity = new Uint32Array(this.n2 * 4);
    for (let cell = 0; cell < this.n2; cell += 1) {
      identity.set([0x1a2b3c4d, 0x55667788, 7, 0], cell * 4);
    }
    this.device.queue.writeBuffer(this.identityIn, 0, identity as unknown as BufferSource);
    this.fft.resetPing(0);
  }

  private encodeFftPrototype(pass: GPUComputePassEncoder): void {
    this.fft.encode2d(pass, M0_CHANNELS, -1);
    pass.setPipeline(this.expandPipeline);
    pass.setBindGroup(0, this.expandGroups[this.fft.currentPing]);
    pass.dispatchWorkgroups(Math.ceil((M0_KERNELS * this.n2) / FFT_WORKGROUP));
    this.fft.swapAfterExternalWrite();
    this.fft.encode2d(pass, M0_KERNELS, 1);
  }

  private encodeGather(pass: GPUComputePassEncoder, full: boolean): void {
    pass.setPipeline(full ? this.gatherFullPipeline : this.gatherMassPipeline);
    pass.setBindGroup(0, full ? this.gatherFullGroup : this.gatherMassGroup);
    pass.dispatchWorkgroups(Math.ceil(this.n / GATHER_TILE), Math.ceil(this.n / GATHER_TILE));
  }

  private encodeMode(pass: GPUComputePassEncoder, mode: BenchmarkMode): void {
    if (mode === "fft" || mode === "step-mass" || mode === "step-full") {
      this.encodeFftPrototype(pass);
    }
    if (mode === "gather-mass" || mode === "step-mass") this.encodeGather(pass, false);
    if (mode === "gather-full" || mode === "step-full") this.encodeGather(pass, true);
  }

  dispatchesFor(mode: BenchmarkMode): number {
    const fftDispatches = 4 * Math.log2(this.n) + 1;
    if (mode === "fft") return fftDispatches;
    if (mode === "gather-mass" || mode === "gather-full") return 1;
    return fftDispatches + 1;
  }

  async benchmark(mode: BenchmarkMode, samples: number, warmup: number): Promise<BenchmarkResult> {
    if (samples < 1 || warmup < 0) throw new Error("invalid benchmark iteration count");
    if (warmup > 0) {
      const encoder = this.device.createCommandEncoder({ label: `flow-lenia-m0-${mode}-warmup` });
      const pass = encoder.beginComputePass();
      for (let iteration = 0; iteration < warmup; iteration += 1) this.encodeMode(pass, mode);
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      await this.device.queue.onSubmittedWorkDone();
    }

    const dispatches = this.dispatchesFor(mode);
    if (this.device.features.has("timestamp-query")) {
      const querySet = this.device.createQuerySet({ type: "timestamp", count: samples * 2 });
      const bytes = samples * 16;
      const resolve = this.device.createBuffer({
        size: bytes,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });
      const read = this.device.createBuffer({
        size: bytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      try {
        const encoder = this.device.createCommandEncoder({ label: `flow-lenia-m0-${mode}-timestamp` });
        for (let iteration = 0; iteration < samples; iteration += 1) {
          const pass = encoder.beginComputePass({
            timestampWrites: {
              querySet,
              beginningOfPassWriteIndex: iteration * 2,
              endOfPassWriteIndex: iteration * 2 + 1,
            },
          });
          this.encodeMode(pass, mode);
          pass.end();
        }
        encoder.resolveQuerySet(querySet, 0, samples * 2, resolve, 0);
        encoder.copyBufferToBuffer(resolve, 0, read, 0, bytes);
        this.device.queue.submit([encoder.finish()]);
        await read.mapAsync(GPUMapMode.READ);
        const stamps = new BigUint64Array(read.getMappedRange());
        const values: number[] = [];
        for (let iteration = 0; iteration < samples; iteration += 1) {
          values.push(Number(stamps[iteration * 2 + 1] - stamps[iteration * 2]) / 1e6);
        }
        read.unmap();
        return summarize(this.n, mode, "timestamp-query", dispatches, values);
      } finally {
        querySet.destroy();
        resolve.destroy();
        read.destroy();
      }
    }

    const values: number[] = [];
    for (let iteration = 0; iteration < samples; iteration += 1) {
      const start = performance.now();
      const encoder = this.device.createCommandEncoder({ label: `flow-lenia-m0-${mode}-fallback` });
      const pass = encoder.beginComputePass();
      this.encodeMode(pass, mode);
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      await this.device.queue.onSubmittedWorkDone();
      values.push(performance.now() - start);
    }
    return summarize(this.n, mode, "queue-completion", dispatches, values);
  }

  private async readBuffer(buffer: GPUBuffer, bytes: number): Promise<ArrayBuffer> {
    const read = this.device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    try {
      const encoder = this.device.createCommandEncoder();
      encoder.copyBufferToBuffer(buffer, 0, read, 0, bytes);
      this.device.queue.submit([encoder.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      const copy = read.getMappedRange().slice(0);
      read.unmap();
      return copy;
    } finally {
      read.destroy();
    }
  }

  private async verifyGather(full: boolean): Promise<{
    relativeMassResidual: number;
    uniformGenomeMaxAbs: number;
    uniformIdentityExact: boolean;
  }> {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    this.encodeGather(pass, full);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    const mass = new Float32Array(await this.readBuffer(this.massOut, this.n2 * 16));
    const outputSums = new Float64Array(M0_CHANNELS);
    for (let cell = 0; cell < this.n2; cell += 1) {
      for (let channel = 0; channel < M0_CHANNELS; channel += 1) {
        outputSums[channel] += mass[cell * 4 + channel] as number;
      }
    }
    let relativeMassResidual = 0;
    for (let channel = 0; channel < M0_CHANNELS; channel += 1) {
      relativeMassResidual = Math.max(
        relativeMassResidual,
        Math.abs(outputSums[channel] - this.inputMassSums[channel]) / this.inputMassSums[channel],
      );
    }
    if (!full) return { relativeMassResidual, uniformGenomeMaxAbs: 0, uniformIdentityExact: true };

    const [hRaw, qRaw, identityRaw] = await Promise.all([
      this.readBuffer(this.hOut, this.n2 * 48),
      this.readBuffer(this.qOut, this.n2 * 48),
      this.readBuffer(this.identityOut, this.n2 * 16),
    ]);
    const h = new Float32Array(hRaw);
    const q = new Float32Array(qRaw);
    const identity = new Uint32Array(identityRaw);
    let uniformGenomeMaxAbs = 0;
    let uniformIdentityExact = true;
    for (let cell = 0; cell < this.n2; cell += 1) {
      for (let gene = 0; gene < 12; gene += 1) {
        uniformGenomeMaxAbs = Math.max(
          uniformGenomeMaxAbs,
          Math.abs((h[cell * 12 + gene] as number) - (gene + 1) * 0.05),
          Math.abs((q[cell * 12 + gene] as number) - ((gene + 1) * 0.025 - 0.1)),
        );
      }
      uniformIdentityExact &&=
        identity[cell * 4] === 0x1a2b3c4d &&
        identity[cell * 4 + 1] === 0x55667788 &&
        identity[cell * 4 + 2] === 7 &&
        identity[cell * 4 + 3] === 0;
    }
    return { relativeMassResidual, uniformGenomeMaxAbs, uniformIdentityExact };
  }

  async verify(): Promise<VerificationResult> {
    this.uploadInitialState();
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    this.encodeFftPrototype(pass);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    const complex = new Float32Array(
      await this.readBuffer(this.fft.currentBuffer, M0_KERNELS * this.n2 * 8),
    );
    let fftMaxAbs = 0;
    for (let kernel = 0; kernel < M0_KERNELS; kernel += 1) {
      const channel = kernel % M0_CHANNELS;
      for (let y = 0; y < this.n; y += 1) {
        for (let x = 0; x < this.n; x += 1) {
          const element = kernel * this.n2 + y * this.n + x;
          fftMaxAbs = Math.max(
            fftMaxAbs,
            Math.abs((complex[element * 2] as number) - sourceValue(channel, x, y, this.n)),
            Math.abs(complex[element * 2 + 1] as number),
          );
        }
      }
    }
    const massOnly = await this.verifyGather(false);
    const full = await this.verifyGather(true);
    return {
      fftMaxAbs,
      gatherMassRelativeResidual: massOnly.relativeMassResidual,
      fullMassRelativeResidual: full.relativeMassResidual,
      uniformGenomeMaxAbs: full.uniformGenomeMaxAbs,
      uniformIdentityExact: full.uniformIdentityExact,
    };
  }

  projectedMemoryBytes(): number { return completeEcosystemInventory(this.n).totalBytes; }

  destroy(): void {
    this.fft.destroy();
    for (const buffer of this.ownedBuffers) buffer.destroy();
  }
}
