// lbm-multiphase — WebGPU solver wrapper around lbm_core.wgsl (D2Q9
// pseudopotential, two-buffer pull streaming, DDF-shifted f32 state).
//
// Determinism posture (spec § 3.5/§ 6.2): fixed dispatch order
// psi_pass -> collide_stream per substep, pure gathers, no atomics; the
// canonical gate drives this class with splats/gravity/brushes OFF.

import coreWgsl from "./lbm_core.wgsl?raw";

export const UNI_STRIDE = 256; // U struct is 116 B; 256 keeps offsets aligned
export const MAX_SUBSTEPS = 64; // uniform-ring capacity per submit
export const N_TRACERS = 32768;

export type PsiKind = "exp-lut" | "cs";
export type ForcingKind = "guo" | "li-sigma" | "sc-shift";

export interface LbmParams {
  nx: number;
  ny: number;
  psiKind: PsiKind;
  forcing: ForcingKind;
  g: number;
  tau: number;
  sigma: number;
  csTemp: number;
  gravity: [number, number];
  rhoRef: number;
}

/** Per-substep transient inputs (splats are ungated interactions). */
export interface SubstepU {
  splat?: { x: number; y: number; r2: number; fx: number; fy: number; fac: number };
}

export interface BrushU {
  x: number;
  y: number;
  r2: number;
  mode: "wall" | "erase";
  rhoW: number; // wall wettability, or refill vapor density when erasing
}

const EPS_PSI2 = 1e-8; // shared with reference.EPS_PSI2 (gen-verification pins)

export class LbmGpu {
  readonly device: GPUDevice;
  readonly nx: number;
  readonly ny: number;
  readonly n2: number;
  params: LbmParams;

  fA: GPUBuffer;
  fB: GPUBuffer;
  rhopsi: GPUBuffer;
  flags: GPUBuffer;
  lut: GPUBuffer;
  macro: GPUBuffer;
  tracers: GPUBuffer;
  private uni: GPUBuffer;
  private uniScratch: ArrayBuffer;
  private pipes = new Map<string, GPUComputePipeline>();
  private bgAB!: GPUBindGroup; // read fA -> write fB
  private bgBA!: GPUBindGroup;
  private cur = 0; // 0: state in fA; 1: state in fB
  private staging: GPUBuffer;
  private stagingBusy = false;

  constructor(device: GPUDevice, params: LbmParams, lutF32: Float32Array) {
    this.device = device;
    this.params = params;
    this.nx = params.nx;
    this.ny = params.ny;
    this.n2 = params.nx * params.ny;
    const mk = (bytes: number, label: string, extra = 0): GPUBuffer =>
      device.createBuffer({
        label: `lbm-${label}`,
        size: bytes,
        usage:
          GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | extra,
      });
    this.fA = mk(9 * this.n2 * 4, "fA");
    this.fB = mk(9 * this.n2 * 4, "fB");
    this.rhopsi = mk(this.n2 * 8, "rhopsi");
    this.flags = mk(this.n2 * 4, "flags");
    this.lut = mk(lutF32.byteLength, "psi-lut");
    this.macro = mk(this.n2 * 16, "macro");
    this.tracers = mk(N_TRACERS * 16, "tracers");
    this.uni = device.createBuffer({
      label: "lbm-uni",
      size: UNI_STRIDE * MAX_SUBSTEPS,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniScratch = new ArrayBuffer(UNI_STRIDE * MAX_SUBSTEPS);
    this.staging = device.createBuffer({
      label: "lbm-staging",
      size: this.n2 * 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.lut, 0, lutF32);

    const module = device.createShaderModule({ label: "lbm-core", code: coreWgsl });
    const st = GPUShaderStage.COMPUTE;
    const bgl = device.createBindGroupLayout({
      label: "lbm-bgl",
      entries: [
        { binding: 0, visibility: st, buffer: { type: "uniform", hasDynamicOffset: true } },
        { binding: 1, visibility: st, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: st, buffer: { type: "storage" } },
        { binding: 3, visibility: st, buffer: { type: "storage" } },
        { binding: 4, visibility: st, buffer: { type: "storage" } },
        { binding: 5, visibility: st, buffer: { type: "read-only-storage" } },
        { binding: 6, visibility: st, buffer: { type: "storage" } },
        { binding: 7, visibility: st, buffer: { type: "storage" } },
      ],
    });
    const layout = device.createPipelineLayout({ label: "lbm-pl", bindGroupLayouts: [bgl] });
    for (const e of ["psi_pass", "collide_stream", "paint", "tracer_step"]) {
      this.pipes.set(
        e,
        device.createComputePipeline({
          label: `lbm-${e}`,
          layout,
          compute: { module, entryPoint: e },
        }),
      );
    }
    const mkBg = (fin: GPUBuffer, fout: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        label: "lbm-bg",
        layout: bgl,
        entries: [
          { binding: 0, resource: { buffer: this.uni, size: UNI_STRIDE } },
          { binding: 1, resource: { buffer: fin } },
          { binding: 2, resource: { buffer: fout } },
          { binding: 3, resource: { buffer: this.rhopsi } },
          { binding: 4, resource: { buffer: this.flags } },
          { binding: 5, resource: { buffer: this.lut } },
          { binding: 6, resource: { buffer: this.macro } },
          { binding: 7, resource: { buffer: this.tracers } },
        ],
      });
    this.bgAB = mkBg(this.fA, this.fB);
    this.bgBA = mkBg(this.fB, this.fA);
  }

  /** Initialize state to fbar = w_i (rho - 1) at rest from an f32 field. */
  seedFromRho(rho: Float32Array, solid?: Uint32Array): void {
    const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
    const f = new Float32Array(9 * this.n2);
    for (let k = 0; k < 9; k++) {
      const wk = Math.fround(W[k]);
      for (let c = 0; c < this.n2; c++) {
        f[k * this.n2 + c] = Math.fround(wk * Math.fround(rho[c] - 1));
      }
    }
    if (solid) {
      for (let c = 0; c < this.n2; c++) {
        if (solid[c] & 1) for (let k = 0; k < 9; k++) f[k * this.n2 + c] = 0;
      }
    }
    this.device.queue.writeBuffer(this.fA, 0, f);
    this.device.queue.writeBuffer(this.fB, 0, f);
    this.device.queue.writeBuffer(
      this.flags,
      0,
      solid ?? new Uint32Array(this.n2),
    );
    this.device.queue.writeBuffer(this.rhopsi, 0, new Float32Array(this.n2 * 2));
    this.device.queue.writeBuffer(this.macro, 0, new Float32Array(this.n2 * 4));
    this.cur = 0;
  }

  seedTracers(): void {
    const t = new Float32Array(N_TRACERS * 4);
    let s = 12345;
    const rnd = (): number => {
      // mulberry32 (ungated cosmetics)
      s = (s + 0x6d2b79f5) | 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < N_TRACERS; i++) {
      t[i * 4] = rnd() * this.nx;
      t[i * 4 + 1] = rnd() * this.ny;
      t[i * 4 + 2] = rnd() * 6;
      t[i * 4 + 3] = 1;
    }
    this.device.queue.writeBuffer(this.tracers, 0, t);
  }

  private packU(slot: number, s: SubstepU, opts: { brush?: BrushU; frame?: number; tracerDt?: number }): void {
    const dv = new DataView(this.uniScratch, slot * UNI_STRIDE, UNI_STRIDE);
    const p = this.params;
    let flags = p.psiKind === "cs" ? 1 : 0;
    flags |= (p.forcing === "li-sigma" ? 1 : p.forcing === "sc-shift" ? 2 : 0) << 1;
    if (p.gravity[0] !== 0 || p.gravity[1] !== 0) flags |= 8;
    dv.setUint32(0, this.nx, true);
    dv.setUint32(4, this.ny, true);
    dv.setUint32(8, flags, true);
    dv.setFloat32(16, p.tau, true);
    dv.setFloat32(20, p.g, true);
    dv.setFloat32(24, p.sigma, true);
    dv.setFloat32(28, p.csTemp, true);
    dv.setFloat32(32, p.gravity[0], true);
    dv.setFloat32(36, p.gravity[1], true);
    dv.setFloat32(40, p.rhoRef, true);
    dv.setFloat32(44, EPS_PSI2, true);
    const sp = s.splat;
    dv.setFloat32(48, sp?.x ?? 0, true);
    dv.setFloat32(52, sp?.y ?? 0, true);
    dv.setFloat32(56, sp?.r2 ?? 1, true);
    dv.setFloat32(60, sp?.fx ?? 0, true);
    dv.setFloat32(64, sp?.fy ?? 0, true);
    dv.setFloat32(68, sp?.fac ?? 0, true);
    const b = opts.brush;
    dv.setFloat32(72, b?.x ?? 0, true);
    dv.setFloat32(76, b?.y ?? 0, true);
    dv.setFloat32(80, b?.r2 ?? 0, true);
    dv.setFloat32(84, b ? (b.mode === "wall" ? 1 : 0) : 0, true);
    dv.setFloat32(88, b?.rhoW ?? 0, true);
    dv.setFloat32(92, opts.tracerDt ?? 0, true);
    dv.setUint32(96, opts.frame ?? 0, true);
    dv.setUint32(100, N_TRACERS, true);
  }

  /** Encode `subs.length` substeps (+ optional brush before the first, and a
   * tracer advection after the last). Caller submits. */
  encodeSubsteps(
    enc: GPUCommandEncoder,
    subs: SubstepU[],
    opts: { brush?: BrushU; frame?: number; tracers?: boolean; tracerDt?: number } = {},
  ): void {
    if (subs.length > MAX_SUBSTEPS) throw new Error("too many substeps per submit");
    for (let k = 0; k < subs.length; k++) {
      this.packU(k, subs[k], {
        brush: k === 0 ? opts.brush : undefined,
        frame: opts.frame,
        tracerDt: opts.tracerDt,
      });
    }
    this.device.queue.writeBuffer(this.uni, 0, this.uniScratch, 0, subs.length * UNI_STRIDE);
    const wgx = Math.ceil(this.nx / 8);
    const wgy = Math.ceil(this.ny / 8);
    const pass = enc.beginComputePass({ label: "lbm-substeps" });
    for (let k = 0; k < subs.length; k++) {
      const off = [k * UNI_STRIDE];
      const bg = this.cur === 0 ? this.bgAB : this.bgBA;
      if (k === 0 && opts.brush) {
        // paint acts on the buffer about to be READ (the live state): bind
        // reversed so f_out IS the current state buffer
        const bgPaint = this.cur === 0 ? this.bgBA : this.bgAB;
        pass.setPipeline(this.pipes.get("paint")!);
        pass.setBindGroup(0, bgPaint, off);
        pass.dispatchWorkgroups(wgx, wgy);
      }
      pass.setPipeline(this.pipes.get("psi_pass")!);
      pass.setBindGroup(0, bg, off);
      pass.dispatchWorkgroups(wgx, wgy);
      pass.setPipeline(this.pipes.get("collide_stream")!);
      pass.setBindGroup(0, bg, off);
      pass.dispatchWorkgroups(wgx, wgy);
      this.cur = 1 - this.cur;
    }
    if (opts.tracers && subs.length > 0) {
      const off = [(subs.length - 1) * UNI_STRIDE];
      const bg = this.cur === 0 ? this.bgAB : this.bgBA;
      pass.setPipeline(this.pipes.get("tracer_step")!);
      pass.setBindGroup(0, bg, off);
      pass.dispatchWorkgroups(Math.ceil(N_TRACERS / 64));
    }
    pass.end();
  }

  /** Read (rho, ux, uy) planes from the macro buffer (post-substep). */
  async readMacro(): Promise<{ rho: Float32Array; ux: Float32Array; uy: Float32Array }> {
    if (this.stagingBusy) throw new Error("readMacro re-entered");
    this.stagingBusy = true;
    try {
      const bytes = this.n2 * 16;
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(this.macro, 0, this.staging, 0, bytes);
      this.device.queue.submit([enc.finish()]);
      await this.staging.mapAsync(GPUMapMode.READ, 0, bytes);
      const v = new Float32Array(this.staging.getMappedRange(0, bytes).slice(0));
      this.staging.unmap();
      const rho = new Float32Array(this.n2);
      const ux = new Float32Array(this.n2);
      const uy = new Float32Array(this.n2);
      for (let c = 0; c < this.n2; c++) {
        rho[c] = v[c * 4];
        ux[c] = v[c * 4 + 1];
        uy[c] = v[c * 4 + 2];
      }
      return { rho, ux, uy };
    } finally {
      this.stagingBusy = false;
    }
  }

  destroy(): void {
    for (const b of [
      this.fA,
      this.fB,
      this.rhopsi,
      this.flags,
      this.lut,
      this.macro,
      this.tracers,
      this.uni,
      this.staging,
    ]) {
      b.destroy();
    }
  }
}
