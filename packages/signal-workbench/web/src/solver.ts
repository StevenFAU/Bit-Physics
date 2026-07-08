// signal-workbench — WebGPU analysis wrapper (1D batched Stockham FFT).
//
// Explicit bind-group layouts throughout (the pic-flip layout-auto lesson),
// ping-pong by BIND-GROUP VARIANT over the complex {cA, cB} pair, and a
// fixed Stockham pass order (device-scoped run-twice bit-identity,
// spec-ref § 8). Signals arrive as CPU-f64-synthesized f32 uploads.

import { FFT_COMMON_WGSL } from "../../../../common/common-web/src/fft-wgsl.js";
import coreWgsl from "./workbench_core.wgsl?raw";

const UNI_FLOATS = 12;

export class WorkbenchGpu {
  readonly device: GPUDevice;
  readonly n: number;
  readonly half: number;
  readonly wfRows: number;
  readonly persistRows: number;
  private readonly log2n: number;

  private uni: GPUBuffer;
  private uniData = new ArrayBuffer(UNI_FLOATS * 4);
  signalBuf: GPUBuffer;
  windowBuf: GPUBuffer;
  private cBuf: [GPUBuffer, GPUBuffer];
  specMagBuf: GPUBuffer;
  waterfallBuf: GPUBuffer;
  persistBuf: GPUBuffer;
  private specRead: GPUBuffer;
  private specReadPending = false;

  private cPing = 0;
  private groups: GPUBindGroup[] = [];
  private passGroups = new Map<string, GPUBindGroup>();
  private pipelines = new Map<string, GPUComputePipeline>();
  private layout0: GPUBindGroupLayout;
  private layout1: GPUBindGroupLayout;

  windowSum: number;
  dbFloor = -140;
  dbCeil = 10;
  persistDecay = 0.97;
  wfRow = 0;

  constructor(device: GPUDevice, n: number, wfRows = 512, persistRows = 256) {
    this.device = device;
    this.n = n;
    this.half = n >> 1;
    this.wfRows = wfRows;
    this.persistRows = persistRows;
    this.log2n = Math.log2(n);
    if (!Number.isInteger(this.log2n)) throw new Error("n must be a power of two");
    this.windowSum = n; // rectangular default

    const STORAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const mk = (bytes: number): GPUBuffer =>
      device.createBuffer({ size: bytes, usage: STORAGE });
    this.signalBuf = mk(n * 4);
    this.windowBuf = mk(n * 4);
    this.cBuf = [mk(n * 8), mk(n * 8)];
    this.specMagBuf = mk((this.half + 1) * 4);
    this.waterfallBuf = mk(wfRows * this.half * 4);
    this.persistBuf = mk(persistRows * this.half * 4);
    this.specRead = device.createBuffer({
      size: n * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    this.uni = device.createBuffer({
      size: UNI_FLOATS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.layout0 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" as GPUBufferBindingType },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" as GPUBufferBindingType },
        },
        ...[3, 4, 5, 6, 7].map((binding) => ({
          binding,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" as GPUBufferBindingType },
        })),
      ],
    });
    this.layout1 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }],
    });

    for (let cp = 0; cp < 2; cp++) {
      this.groups.push(
        device.createBindGroup({
          layout: this.layout0,
          entries: [
            { binding: 0, resource: { buffer: this.uni } },
            { binding: 1, resource: { buffer: this.signalBuf } },
            { binding: 2, resource: { buffer: this.windowBuf } },
            { binding: 3, resource: { buffer: this.cBuf[cp] } },
            { binding: 4, resource: { buffer: this.cBuf[1 - cp] } },
            { binding: 5, resource: { buffer: this.specMagBuf } },
            { binding: 6, resource: { buffer: this.waterfallBuf } },
            { binding: 7, resource: { buffer: this.persistBuf } },
          ],
        }),
      );
    }

    // Static pass-uniform slots (256-aligned): every FFT stage (forward
    // only) plus the two to_complex variants (rect / windowed).
    const combos: Array<[string, number, number, number, number]> = [];
    for (let stage = 0; stage < this.log2n; stage++) {
      combos.push([`fft:${stage}`, stage, -1, 1, 0]);
    }
    combos.push(["load:rect", 0, -1, 1, 0]);
    combos.push(["load:windowed", 0, -1, 1, 1]);
    const passBuf = device.createBuffer({
      size: combos.length * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    combos.forEach(([key, stage, dir, norm, flags], i) => {
      const data = new ArrayBuffer(16);
      const u = new Uint32Array(data);
      const f = new Float32Array(data);
      u[0] = stage;
      f[1] = dir;
      f[2] = norm;
      u[3] = flags;
      device.queue.writeBuffer(passBuf, i * 256, data);
      this.passGroups.set(
        key,
        device.createBindGroup({
          layout: this.layout1,
          entries: [{ binding: 0, resource: { buffer: passBuf, offset: i * 256, size: 16 } }],
        }),
      );
    });

    const module = device.createShaderModule({
      code: coreWgsl.replace("//__COMMON_FFT__", FFT_COMMON_WGSL),
    });
    const pipeLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.layout0, this.layout1],
    });
    for (const entry of [
      "to_complex",
      "fft_pass",
      "spectrum_capture",
      "waterfall_row",
      "persist_accum",
      "persist_decay",
    ]) {
      this.pipelines.set(
        entry,
        device.createComputePipeline({ layout: pipeLayout, compute: { module, entryPoint: entry } }),
      );
    }
    this.writeUniforms();
  }

  writeUniforms(): void {
    const f = new Float32Array(this.uniData);
    const u = new Uint32Array(this.uniData);
    u[0] = this.n;
    u[1] = this.half;
    u[2] = 1; // batch (single line per frame in v1)
    f[3] = this.windowSum;
    f[4] = this.dbFloor;
    f[5] = this.dbCeil;
    u[6] = this.wfRow;
    u[7] = this.wfRows;
    f[8] = this.persistDecay;
    u[9] = this.persistRows;
    this.device.queue.writeBuffer(this.uni, 0, this.uniData);
  }

  uploadSignal(x: Float32Array): void {
    this.device.queue.writeBuffer(this.signalBuf, 0, x as unknown as BufferSource);
  }

  uploadWindow(w: Float32Array, sum: number): void {
    this.device.queue.writeBuffer(this.windowBuf, 0, w as unknown as BufferSource);
    this.windowSum = sum;
    this.writeUniforms();
  }

  private dispatch(
    pass: GPUComputePassEncoder,
    name: string,
    count: number,
    passKey: string,
  ): void {
    const p = this.pipelines.get(name);
    if (!p) throw new Error(`no pipeline ${name}`);
    pass.setPipeline(p);
    pass.setBindGroup(0, this.groups[this.cPing]);
    pass.setBindGroup(1, this.passGroups.get(passKey) as GPUBindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / 128));
  }

  /** Windowed load + forward FFT + dB capture. Fixed pass order. */
  encodeAnalyze(enc: GPUCommandEncoder, windowed: boolean): void {
    const pass = enc.beginComputePass();
    this.dispatch(pass, "to_complex", this.n, windowed ? "load:windowed" : "load:rect");
    for (let stage = 0; stage < this.log2n; stage++) {
      this.dispatch(pass, "fft_pass", this.half, `fft:${stage}`);
      this.cPing = 1 - this.cPing;
    }
    this.dispatch(pass, "spectrum_capture", this.half + 1, "load:rect");
    pass.end();
  }

  encodeWaterfallRow(enc: GPUCommandEncoder): void {
    this.wfRow = (this.wfRow + 1) % this.wfRows;
    this.writeUniforms();
    const pass = enc.beginComputePass();
    this.dispatch(pass, "waterfall_row", this.half, "load:rect");
    pass.end();
  }

  private wfFloorFill: Float32Array | null = null;

  /** Reset the display-only ring buffers (preset switches; never gated).
   * The waterfall holds dB values, so "empty" is the display floor, not 0. */
  clearDisplay(enc: GPUCommandEncoder): void {
    if (!this.wfFloorFill) {
      this.wfFloorFill = new Float32Array(this.wfRows * this.half).fill(this.dbFloor);
    }
    this.device.queue.writeBuffer(
      this.waterfallBuf,
      0,
      this.wfFloorFill as unknown as BufferSource,
    );
    enc.clearBuffer(this.persistBuf);
  }

  encodePersistence(enc: GPUCommandEncoder): void {
    const pass = enc.beginComputePass();
    this.dispatch(pass, "persist_decay", this.persistRows * this.half, "load:rect");
    this.dispatch(pass, "persist_accum", this.half, "load:rect");
    pass.end();
  }

  /** Current complex spectrum buffer (post-analyze parity: log2n swaps). */
  get spectrumComplexBuf(): GPUBuffer {
    return this.cBuf[this.cPing];
  }

  /** Read the complex spectrum back (gate checkpoints; re-entry guarded). */
  async readSpectrum(): Promise<{ re: Float32Array; im: Float32Array }> {
    while (this.specReadPending) await new Promise((r) => setTimeout(r, 1));
    this.specReadPending = true;
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(this.spectrumComplexBuf, 0, this.specRead, 0, this.n * 8);
      this.device.queue.submit([enc.finish()]);
      await this.specRead.mapAsync(GPUMapMode.READ);
      const inter = new Float32Array(this.specRead.getMappedRange().slice(0));
      this.specRead.unmap();
      const re = new Float32Array(this.n);
      const im = new Float32Array(this.n);
      for (let i = 0; i < this.n; i++) {
        re[i] = inter[i * 2];
        im[i] = inter[i * 2 + 1];
      }
      return { re, im };
    } finally {
      this.specReadPending = false;
    }
  }

  destroy(): void {
    for (const b of [
      this.signalBuf,
      this.windowBuf,
      ...this.cBuf,
      this.specMagBuf,
      this.waterfallBuf,
      this.persistBuf,
      this.specRead,
      this.uni,
    ]) {
      b.destroy();
    }
  }
}
