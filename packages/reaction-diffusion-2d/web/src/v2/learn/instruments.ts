// Turing Patterns instruments (01-reaction-diffusion.md § Learn): pattern
// statistics from a half-resolution copy of V (separate spots or pieces via
// connected components, coverage, total V) and the dominant wavelength from
// a 2D FFT power spectrum (the shared Stockham core in
// common/common-web/src/fft-wgsl.ts). Display-side only: every pass binds the
// simulation state read-only, and nothing here feeds back into the solver.

import { ReadbackSlot } from "@bp/gpu";
import { FFT_COMMON_WGSL } from "../../../../../../common/common-web/src/fft-wgsl.js";
import spectrumSrc from "../model/spectrum.wgsl?raw";
import statsSrc from "../model/stats.wgsl?raw";
import type { LiveSim } from "../model/sim.js";
import { MODELS } from "../model/models.js";

export interface PatternStats {
  /** Connected regions of V above the threshold (spots, or pieces of a maze). */
  pieces: number;
  /** Fraction of the dish with V above the threshold. */
  coverage: number;
  /** Σ V over the dish, in cell units. */
  massV: number;
  peakV: number;
}

export const V_THRESHOLD = 0.15;

export function patternStats(v: Float32Array, w: number, h: number, periodic: boolean, threshold = V_THRESHOLD): PatternStats {
  const n = w * h;
  const parent = new Int32Array(n).fill(-1);
  const find = (i: number): number => {
    while (parent[i]! !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  let covered = 0;
  let mass = 0;
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    const x = v[i]!;
    mass += x;
    if (x > peak) peak = x;
    if (x > threshold) {
      covered += 1;
      parent[i] = i;
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (parent[i]! < 0) continue;
      const xr = x + 1 < w ? x + 1 : periodic ? 0 : -1;
      const yd = y + 1 < h ? y + 1 : periodic ? 0 : -1;
      if (xr >= 0 && parent[y * w + xr]! >= 0) union(i, y * w + xr);
      if (yd >= 0 && parent[yd * w + x]! >= 0) union(i, yd * w + x);
    }
  }
  // count components bigger than a couple of half-res cells (ignore specks)
  const sizes = new Map<number, number>();
  for (let i = 0; i < n; i += 1) if (parent[i]! >= 0) sizes.set(find(i), (sizes.get(find(i)) ?? 0) + 1);
  let pieces = 0;
  for (const s of sizes.values()) if (s >= 3) pieces += 1;
  return { pieces, coverage: covered / n, massV: mass * 4, peakV: peak };
}

export interface SpectrumReading {
  /** Window size, cells. */
  n: number;
  /** Radially averaged power, index = wavenumber (waves per window). */
  power: Float32Array;
  /** Dominant wavelength in cells, or null when no clear peak. */
  wavelength: number | null;
  peakIndex: number | null;
}

/**
 * The pattern's dominant wavelength from a radially averaged power spectrum
 * P̄(r). Peaks are found on the ring sum r·P̄(r) — the power at wavenumber r
 * summed over its ring — over r ≥ 4 (wavelengths up to a quarter window), so
 * the envelope of a few isolated features cannot masquerade as a pattern.
 */
export function dominantWavelength(power: Float32Array, n: number): { wavelength: number | null; peak: number | null } {
  const R0 = 4;
  const ring = (r: number): number => r * power[r]!;
  let best = -1;
  let bi = -1;
  for (let r = R0; r < power.length; r += 1) {
    if (ring(r) > best) {
      best = ring(r);
      bi = r;
    }
  }
  if (bi < 0 || best <= 0) return { wavelength: null, peak: null };
  const sorted = Array.from({ length: power.length - R0 }, (_, i) => ring(i + R0)).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  if (best < median * 4) return { wavelength: null, peak: null };
  // parabolic refinement on the log ring power
  let r = bi;
  if (bi > R0 && bi < power.length - 1) {
    const a = Math.log(ring(bi - 1) + 1e-30);
    const b = Math.log(ring(bi) + 1e-30);
    const c = Math.log(ring(bi + 1) + 1e-30);
    const den = a - 2 * b + c;
    if (den < 0) r = bi + (0.5 * (a - c)) / den;
  }
  return { wavelength: n / r, peak: bi };
}

const SLOT = 256;

export class Instruments {
  private readonly device: GPUDevice;
  private statsPipeline!: GPUComputePipeline;
  private statsUniform!: GPUBuffer;
  private statsOut: GPUBuffer | null = null;
  private statsBG: GPUBindGroup | null = null;
  private statsSlot: ReadbackSlot | null = null;
  private statsDims = { ow: 0, oh: 0 };
  private specLayout!: GPUBindGroupLayout;
  private specLoad!: GPUComputePipeline;
  private specStage!: GPUComputePipeline;
  private specPower!: GPUComputePipeline;
  private specUniform!: GPUBuffer;
  private specA: GPUBuffer | null = null;
  private specB: GPUBuffer | null = null;
  private radial: GPUBuffer | null = null;
  private specAB: GPUBindGroup | null = null;
  private specBA: GPUBindGroup | null = null;
  private specSlot: ReadbackSlot | null = null;
  private n = 256;
  private sim: LiveSim | null = null;
  private statsPending = false;
  /** The field the instruments read (models.ts `show`) and its statistics threshold. */
  channel = 1;
  threshold = V_THRESHOLD;
  private specPending = false;

  static async create(device: GPUDevice): Promise<Instruments> {
    const ins = new Instruments(device);
    await ins.init();
    return ins;
  }

  private constructor(device: GPUDevice) {
    this.device = device;
  }

  private async init(): Promise<void> {
    const d = this.device;
    this.statsPipeline = await d.createComputePipelineAsync({
      label: "rd-stats",
      layout: "auto",
      compute: { module: d.createShaderModule({ code: statsSrc, label: "rd-stats" }), entryPoint: "main" },
    });
    this.statsUniform = d.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "rd-stats" });
    this.specLayout = d.createBindGroupLayout({
      label: "rd-spectrum",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const layout = d.createPipelineLayout({ bindGroupLayouts: [this.specLayout] });
    const module = d.createShaderModule({
      code: spectrumSrc.replace("//__COMMON_FFT__", FFT_COMMON_WGSL),
      label: "rd-spectrum",
    });
    [this.specLoad, this.specStage, this.specPower] = await Promise.all(
      ["load", "stage", "power"].map((entryPoint) =>
        d.createComputePipelineAsync({ label: `rd-spectrum-${entryPoint}`, layout, compute: { module, entryPoint } }),
      ),
    );
    this.specUniform = d.createBuffer({ size: SLOT * 40, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "rd-spectrum" });
  }

  /** Bind to a (new) simulation. */
  attach(sim: LiveSim): void {
    const d = this.device;
    this.sim = sim;
    this.statsOut?.destroy();
    this.statsSlot?.destroy();
    const ow = Math.ceil(sim.w / 2);
    const oh = Math.ceil(sim.h / 2);
    this.statsDims = { ow, oh };
    this.statsOut = d.createBuffer({ size: ow * oh * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, label: "rd-stats-out" });
    this.channel = MODELS[sim.chem.model].show;
    this.threshold = MODELS[sim.chem.model].threshold;
    d.queue.writeBuffer(this.statsUniform, 0, new Uint32Array([sim.w, sim.h, ow, oh, this.channel, 0, 0, 0]));
    this.statsBG = d.createBindGroup({
      layout: this.statsPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.statsUniform } },
        { binding: 1, resource: { buffer: sim.state } },
        { binding: 2, resource: { buffer: this.statsOut } },
      ],
    });
    this.statsSlot = new ReadbackSlot(d, ow * oh * 4, "rd-stats-readback");
    this.statsPending = false;

    const n = Math.min(256, 2 ** Math.floor(Math.log2(Math.min(sim.w, sim.h))));
    if (n !== this.n || !this.specA) {
      this.n = n;
      this.specA?.destroy();
      this.specB?.destroy();
      this.radial?.destroy();
      this.specSlot?.destroy();
      this.specA = d.createBuffer({ size: n * n * 8, usage: GPUBufferUsage.STORAGE, label: "rd-fft-a" });
      this.specB = d.createBuffer({ size: n * n * 8, usage: GPUBufferUsage.STORAGE, label: "rd-fft-b" });
      this.radial = d.createBuffer({ size: (n / 2) * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, label: "rd-fft-radial" });
      this.specSlot = new ReadbackSlot(d, (n / 2) * 4, "rd-fft-readback");
    }
    const bind = (src: GPUBuffer, dst: GPUBuffer): GPUBindGroup =>
      d.createBindGroup({
        layout: this.specLayout,
        entries: [
          { binding: 0, resource: { buffer: this.specUniform, size: 48 } },
          { binding: 1, resource: { buffer: sim.state } },
          { binding: 2, resource: { buffer: src } },
          { binding: 3, resource: { buffer: dst } },
          { binding: 4, resource: { buffer: this.radial! } },
        ],
      });
    this.specAB = bind(this.specA!, this.specB!);
    this.specBA = bind(this.specB!, this.specA!);
    this.specPending = false;
  }

  get windowSize(): number {
    return this.n;
  }

  /** Free every buffer (a check's private instruments, once it is done). */
  destroy(): void {
    this.statsOut?.destroy();
    this.statsSlot?.destroy();
    this.specA?.destroy();
    this.specB?.destroy();
    this.radial?.destroy();
    this.specSlot?.destroy();
    this.statsUniform.destroy();
    this.specUniform.destroy();
    this.sim = null;
  }

  /** Record a stats sample; returns false when one is already in flight. */
  recordStats(enc: GPUCommandEncoder): boolean {
    if (!this.sim || !this.statsBG || !this.statsOut || !this.statsSlot || this.statsPending) return false;
    const pass = enc.beginComputePass({ label: "rd-stats" });
    pass.setPipeline(this.statsPipeline);
    pass.setBindGroup(0, this.statsBG);
    pass.dispatchWorkgroups(Math.ceil(this.statsDims.ow / 8), Math.ceil(this.statsDims.oh / 8));
    pass.end();
    this.statsPending = this.statsSlot.record(enc, this.statsOut);
    return this.statsPending;
  }

  /** The half-resolution V field from the last `recordStats`. */
  async collectStatsRaw(): Promise<Float32Array | null> {
    if (!this.statsPending || !this.statsSlot || !this.sim) return null;
    const sim = this.sim;
    const buf = await this.statsSlot.collect();
    this.statsPending = false;
    if (!buf || sim !== this.sim) return null;
    return new Float32Array(buf);
  }

  async collectStats(): Promise<PatternStats | null> {
    const sim = this.sim;
    const v = await this.collectStatsRaw();
    if (!v || !sim) return null;
    return patternStats(v, this.statsDims.ow, this.statsDims.oh, sim.periodic, this.threshold);
  }

  /**
   * Record a spectrum of the N×N window centred at (cx, cy) cells, of the
   * field minus `offset` (a reference level kept out of the f32 FFT).
   */
  recordSpectrum(enc: GPUCommandEncoder, cx: number, cy: number, offset = 0): boolean {
    if (!this.sim || !this.specAB || !this.specBA || !this.radial || !this.specSlot || this.specPending) return false;
    const n = this.n;
    const log2n = Math.round(Math.log2(n));
    const sim = this.sim;
    const stages = 2 * log2n;
    const ab = new ArrayBuffer(SLOT * (stages + 2));
    const write = (slot: number, stage: number, axis: number): void => {
      const o = slot * SLOT;
      const u = new Uint32Array(ab, o, 12);
      const f = new Float32Array(ab, o, 12);
      u[0] = n;
      u[1] = stage;
      u[2] = axis;
      u[3] = log2n;
      f[4] = cx;
      f[5] = cy;
      u[6] = sim.w;
      u[7] = sim.h;
      u[8] = sim.periodic ? 1 : 0;
      u[9] = this.channel;
      f[10] = offset;
    };
    write(0, 0, 0);
    for (let i = 0; i < stages; i += 1) write(i + 1, i % log2n, i < log2n ? 0 : 1);
    write(stages + 1, 0, 0);
    this.device.queue.writeBuffer(this.specUniform, 0, ab);
    const pass = enc.beginComputePass({ label: "rd-spectrum" });
    pass.setPipeline(this.specLoad);
    pass.setBindGroup(0, this.specBA, [0]); // load writes dst = A
    pass.dispatchWorkgroups(Math.ceil((n * n) / 64));
    pass.setPipeline(this.specStage);
    for (let i = 0; i < stages; i += 1) {
      pass.setBindGroup(0, i % 2 === 0 ? this.specAB : this.specBA, [(i + 1) * SLOT]);
      pass.dispatchWorkgroups(Math.ceil(((n / 2) * n) / 64));
    }
    pass.setPipeline(this.specPower);
    pass.setBindGroup(0, this.specAB, [(stages + 1) * SLOT]); // an even stage count leaves the result in A
    pass.dispatchWorkgroups(Math.ceil(n / 2 / 64));
    pass.end();
    this.specPending = this.specSlot.record(enc, this.radial);
    return this.specPending;
  }

  async collectSpectrum(): Promise<SpectrumReading | null> {
    if (!this.specPending || !this.specSlot) return null;
    const buf = await this.specSlot.collect();
    this.specPending = false;
    if (!buf) return null;
    const power = new Float32Array(buf);
    const { wavelength, peak } = dominantWavelength(power, this.n);
    return { n: this.n, power, wavelength, peakIndex: peak };
  }
}
