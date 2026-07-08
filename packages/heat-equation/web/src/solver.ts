// heat-equation — WebGPU solver wrapper (FTCS + 2D Stockham spectral path).
//
// Explicit bind-group layouts throughout (the pic-flip layout-auto lesson:
// auto layouts + shared helpers silently discard submits on mismatch), and
// ping-pong by BIND-GROUP VARIANT (four group-0 variants over {t, c} pings)
// so no copy passes are needed and the Stockham pass order stays fixed
// (device-scoped run-twice bit-identity, spec-ref § 8).

import heatCoreWgsl from "./heat_core.wgsl?raw";

export interface HeatParams {
  alpha: number;
  dt: number;
  bcKind: 0 | 1;
  wallValue: number;
  useMaterial: boolean;
  sourceScale: number;
}

export interface BrushState {
  kind: 0 | 1 | 2 | 3; // off | heat->T | write source | cool
  x: number; // grid units
  y: number;
  sigma: number;
  power: number;
}

const UNI_FLOATS = 16;

export class HeatGpu {
  readonly device: GPUDevice;
  readonly n: number;
  private readonly log2n: number;

  private uni: GPUBuffer;
  private uniData = new ArrayBuffer(UNI_FLOATS * 4);
  private tBuf: [GPUBuffer, GPUBuffer];
  private cBuf: [GPUBuffer, GPUBuffer];
  auxBuf: GPUBuffer; // interleaved (source, alpha) — 8-storage-buffer limit
  private srcCache: Float32Array;
  private alphaCache: Float32Array;
  decayBuf: GPUBuffer;
  statsBuf: GPUBuffer;
  spectrumBuf: GPUBuffer;
  private statsRead: GPUBuffer;
  private fieldRead: GPUBuffer;
  private statsPending = false;
  private fieldPending = false;

  private tPing = 0;
  private cPing = 0;

  private groups: GPUBindGroup[] = []; // [tPing*2 + cPing]
  private passGroups = new Map<string, GPUBindGroup>();
  private pipelines = new Map<string, GPUComputePipeline>();
  private layout0: GPUBindGroupLayout;
  private layout1: GPUBindGroupLayout;

  params: HeatParams;
  brush: BrushState = { kind: 0, x: 0, y: 0, sigma: 3, power: 0 };

  constructor(device: GPUDevice, n: number, params: HeatParams, decayF32: Float32Array) {
    this.device = device;
    this.n = n;
    this.log2n = Math.log2(n);
    if (!Number.isInteger(this.log2n)) throw new Error("n must be a power of two");
    this.params = { ...params };

    const n2 = n * n;
    const mk = (bytes: number, usage: GPUBufferUsageFlags): GPUBuffer =>
      device.createBuffer({ size: bytes, usage });
    const STORAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.tBuf = [mk(n2 * 4, STORAGE), mk(n2 * 4, STORAGE)];
    this.cBuf = [mk(n2 * 8, STORAGE), mk(n2 * 8, STORAGE)];
    this.auxBuf = mk(n2 * 8, STORAGE);
    this.srcCache = new Float32Array(n2);
    this.alphaCache = new Float32Array(n2).fill(params.alpha);
    this.decayBuf = mk(n2 * 4, STORAGE);
    this.spectrumBuf = mk(n2 * 4, STORAGE);
    this.statsBuf = mk(16, STORAGE);
    this.statsRead = mk(16, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
    this.fieldRead = mk(n2 * 4, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
    this.uni = device.createBuffer({
      size: UNI_FLOATS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.decayBuf, 0, decayF32 as unknown as BufferSource);

    this.layout0 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        ...[1, 2, 3, 4, 5, 7, 8].map((binding) => ({
          binding,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" as GPUBufferBindingType },
        })),
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" as GPUBufferBindingType },
        },
      ],
    });
    this.layout1 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }],
    });

    for (let tp = 0; tp < 2; tp++) {
      for (let cp = 0; cp < 2; cp++) {
        this.groups.push(
          device.createBindGroup({
            layout: this.layout0,
            entries: [
              { binding: 0, resource: { buffer: this.uni } },
              { binding: 1, resource: { buffer: this.tBuf[tp] } },
              { binding: 2, resource: { buffer: this.tBuf[1 - tp] } },
              { binding: 3, resource: { buffer: this.auxBuf } },
              { binding: 4, resource: { buffer: this.cBuf[cp] } },
              { binding: 5, resource: { buffer: this.cBuf[1 - cp] } },
              { binding: 6, resource: { buffer: this.decayBuf } },
              { binding: 7, resource: { buffer: this.statsBuf } },
              { binding: 8, resource: { buffer: this.spectrumBuf } },
            ],
          }),
        );
      }
    }

    // Pass-uniform slots (256-aligned) for every (axis, stage, dir) plus the
    // norm variants — static bind groups keep the pass order fixed.
    const combos: Array<[string, number, number, number, number]> = [];
    for (const axis of [0, 1]) {
      for (let stage = 0; stage < this.log2n; stage++) {
        for (const dir of [-1, 1]) {
          combos.push([`fft:${axis}:${stage}:${dir}`, axis, stage, dir, 1]);
        }
      }
    }
    combos.push(["norm:1", 0, 0, 0, 1]);
    combos.push(["norm:inv", 0, 0, 0, 1 / n2]);
    const passBuf = device.createBuffer({
      size: combos.length * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    combos.forEach(([key, axis, stage, dir, norm], i) => {
      const data = new ArrayBuffer(16);
      const u = new Uint32Array(data);
      const f = new Float32Array(data);
      u[0] = axis;
      u[1] = stage;
      f[2] = dir;
      f[3] = norm;
      device.queue.writeBuffer(passBuf, i * 256, data);
      this.passGroups.set(
        key,
        device.createBindGroup({
          layout: this.layout1,
          entries: [{ binding: 0, resource: { buffer: passBuf, offset: i * 256, size: 16 } }],
        }),
      );
    });

    const module = device.createShaderModule({ code: heatCoreWgsl });
    const pipeLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.layout0, this.layout1],
    });
    for (const entry of [
      "ftcs_step",
      "fft_pass",
      "to_complex",
      "from_complex",
      "spectral_mul",
      "spectrum_capture",
      "splat",
      "clear_source",
      "reduce_stats",
    ]) {
      this.pipelines.set(
        entry,
        device.createComputePipeline({
          layout: pipeLayout,
          compute: { module, entryPoint: entry },
        }),
      );
    }

    this.writeUniforms();
  }

  get currentField(): GPUBuffer {
    return this.tBuf[this.tPing];
  }

  private group(): GPUBindGroup {
    return this.groups[this.tPing * 2 + this.cPing];
  }

  writeUniforms(): void {
    const f = new Float32Array(this.uniData);
    const u = new Uint32Array(this.uniData);
    const dx = 1 / this.n;
    u[0] = this.n;
    u[1] = (this.n * this.n) / 2;
    f[2] = (this.params.alpha * this.params.dt) / (dx * dx);
    f[3] = this.params.dt;
    u[4] = this.params.bcKind;
    f[5] = this.params.wallValue;
    u[6] = this.params.useMaterial ? 1 : 0;
    f[7] = this.params.alpha;
    f[8] = dx;
    f[9] = this.params.sourceScale;
    f[10] = this.brush.x;
    f[11] = this.brush.y;
    f[12] = this.brush.sigma;
    f[13] = this.brush.power;
    u[14] = this.brush.kind;
    this.device.queue.writeBuffer(this.uni, 0, this.uniData);
  }

  uploadField(data: Float32Array): void {
    this.device.queue.writeBuffer(this.tBuf[this.tPing], 0, data as unknown as BufferSource);
  }

  private flushAux(): void {
    const n2 = this.n * this.n;
    const interleaved = new Float32Array(n2 * 2);
    for (let i = 0; i < n2; i++) {
      interleaved[i * 2] = this.srcCache[i];
      interleaved[i * 2 + 1] = this.alphaCache[i];
    }
    this.device.queue.writeBuffer(this.auxBuf, 0, interleaved as unknown as BufferSource);
  }

  uploadSource(data: Float32Array): void {
    this.srcCache.set(data);
    this.flushAux();
  }

  uploadAlpha(data: Float32Array): void {
    this.alphaCache.set(data);
    this.flushAux();
  }

  uploadDecay(decayF32: Float32Array): void {
    this.device.queue.writeBuffer(this.decayBuf, 0, decayF32 as unknown as BufferSource);
  }

  private dispatch2d(pass: GPUComputePassEncoder, name: string): void {
    const p = this.pipelines.get(name);
    if (!p) throw new Error(`no pipeline ${name}`);
    pass.setPipeline(p);
    pass.setBindGroup(0, this.group());
    pass.setBindGroup(1, this.passGroups.get("norm:1") as GPUBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.n / 16), Math.ceil(this.n / 8));
  }

  private dispatch1d(
    pass: GPUComputePassEncoder,
    name: string,
    count: number,
    passKey = "norm:1",
  ): void {
    const p = this.pipelines.get(name);
    if (!p) throw new Error(`no pipeline ${name}`);
    pass.setPipeline(p);
    pass.setBindGroup(0, this.group());
    pass.setBindGroup(1, this.passGroups.get(passKey) as GPUBindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / 128));
  }

  /** Encode brush splat (interactive path; gate runs never call this). */
  encodeSplat(enc: GPUCommandEncoder): void {
    if (this.brush.kind === 0) return;
    const pass = enc.beginComputePass();
    this.dispatch2d(pass, "splat");
    pass.end();
  }

  /** One FTCS substep: single stencil dispatch, then swap the t ping. */
  encodeFtcsStep(enc: GPUCommandEncoder): void {
    const pass = enc.beginComputePass();
    this.dispatch2d(pass, "ftcs_step");
    pass.end();
    this.tPing = 1 - this.tPing;
  }

  /** Full 2D FFT over the complex ping (dir -1 fwd / +1 inv). Fixed order. */
  private encodeFft(pass: GPUComputePassEncoder, dir: -1 | 1): void {
    const n2 = this.n * this.n;
    const fft = this.pipelines.get("fft_pass") as GPUComputePipeline;
    for (const axis of [0, 1]) {
      for (let stage = 0; stage < this.log2n; stage++) {
        pass.setPipeline(fft);
        pass.setBindGroup(0, this.group());
        pass.setBindGroup(1, this.passGroups.get(`fft:${axis}:${stage}:${dir}`) as GPUBindGroup);
        pass.dispatchWorkgroups(Math.ceil(n2 / 2 / 128));
        this.cPing = 1 - this.cPing;
      }
    }
  }

  /** One exact spectral substep: FFT -> committed-table multiply -> IFFT. */
  encodeSpectralStep(enc: GPUCommandEncoder): void {
    const n2 = this.n * this.n;
    const pass = enc.beginComputePass();
    this.dispatch1d(pass, "to_complex", n2);
    this.encodeFft(pass, -1);
    this.dispatch1d(pass, "spectral_mul", n2);
    this.encodeFft(pass, 1);
    this.dispatch1d(pass, "from_complex", n2, "norm:inv");
    pass.end();
  }

  /** Refresh the spectrum view from the CURRENT field (FTCS mode, low cadence). */
  encodeSpectrumRefresh(enc: GPUCommandEncoder): void {
    const n2 = this.n * this.n;
    const pass = enc.beginComputePass();
    this.dispatch1d(pass, "to_complex", n2);
    this.encodeFft(pass, -1);
    this.dispatch1d(pass, "spectrum_capture", n2);
    pass.end();
    // parity note: the forward FFT leaves the complex ping swapped an even
    // number of times (2 * log2n), so cPing is unchanged for n = 2^k, k even
    // or odd — encodeFft already tracked every swap.
  }

  encodeClearSource(enc: GPUCommandEncoder): void {
    const pass = enc.beginComputePass();
    this.dispatch1d(pass, "clear_source", this.n * this.n);
    pass.end();
  }

  encodeStatsReduce(enc: GPUCommandEncoder): void {
    this.device.queue.writeBuffer(this.statsBuf, 0, new Uint32Array([0, 0, 0, 0]));
    const pass = enc.beginComputePass();
    this.dispatch1d(pass, "reduce_stats", this.n * this.n);
    pass.end();
  }

  /** Read the stats buffer (guarded against re-entry — the curl-noise
   * pending-map lesson). Returns null if a read is already in flight. */
  async readStats(): Promise<{ maxAbs: number; nan: boolean; max: number; min: number } | null> {
    if (this.statsPending) return null;
    this.statsPending = true;
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(this.statsBuf, 0, this.statsRead, 0, 16);
      this.device.queue.submit([enc.finish()]);
      await this.statsRead.mapAsync(GPUMapMode.READ);
      const u = new Uint32Array(this.statsRead.getMappedRange().slice(0));
      this.statsRead.unmap();
      const unorder = (b: number): number => {
        const flipped = (b & 0x80000000) !== 0 ? b & 0x7fffffff : ~b >>> 0;
        const buf = new ArrayBuffer(4);
        new Uint32Array(buf)[0] = flipped;
        return new Float32Array(buf)[0];
      };
      const f = new Float32Array(Uint32Array.from([u[0]]).buffer);
      return { maxAbs: f[0], nan: u[1] !== 0, max: unorder(u[2]), min: -unorder(u[3]) };
    } finally {
      this.statsPending = false;
    }
  }

  /** Read the full field back (gate checkpoints, probe). Re-entry guarded. */
  async readField(): Promise<Float32Array> {
    while (this.fieldPending) await new Promise((r) => setTimeout(r, 1));
    this.fieldPending = true;
    try {
      const bytes = this.n * this.n * 4;
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(this.currentField, 0, this.fieldRead, 0, bytes);
      this.device.queue.submit([enc.finish()]);
      await this.fieldRead.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(this.fieldRead.getMappedRange().slice(0));
      this.fieldRead.unmap();
      return out;
    } finally {
      this.fieldPending = false;
    }
  }

  destroy(): void {
    for (const b of [
      ...this.tBuf,
      ...this.cBuf,
      this.auxBuf,
      this.decayBuf,
      this.statsBuf,
      this.spectrumBuf,
      this.statsRead,
      this.fieldRead,
      this.uni,
    ]) {
      b.destroy();
    }
  }
}
