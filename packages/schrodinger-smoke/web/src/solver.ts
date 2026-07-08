// schrodinger-smoke — WebGPU solver orchestration (Stack B).
//
// Wraps the WGSL spectral core (isf_core.wgsl) behind an IsfGpu handle:
// explicit bind-group layouts (the pic-flip layout-auto lesson), static
// per-(axis,stage,dir) FFT pass bind groups (fixed Stockham order =>
// device-scoped run-twice bit-identity), f64-precomputed spectral tables
// (isf64.mjs), and readback helpers for the capture/verify paths.

import { FFT_COMMON_WGSL } from "../../../../common/common-web/src/fft-wgsl.js";
import coreWgsl from "./isf_core.wgsl?raw";
import { buildTables } from "./isf64.mjs";

export interface IsfParams {
  hbar: number;
  dt: number;
}

export interface ConstraintSpec {
  kind: 0 | 1 | 2; // 0 off, 1 sphere, 2 cylinder (z-axis)
  center: [number, number, number];
  radius: number;
  kvec: [number, number, number];
  omegaT: number;
}

const WG = 256;

export class IsfGpu {
  readonly n: number;
  readonly n3: number;
  private readonly device: GPUDevice;
  private readonly log2n: number;
  private params: IsfParams;

  readonly psi: GPUBuffer; // bufA — canonical state between steps
  private readonly psiTmp: GPUBuffer;
  private readonly scA: GPUBuffer;
  private readonly scB: GPUBuffer;
  private readonly freeMul: GPUBuffer;
  private readonly invLam: GPUBuffer;
  private readonly stats: GPUBuffer;
  private readonly statsRead: GPUBuffer;
  private readonly psiRead: GPUBuffer;
  private readonly uni: GPUBuffer;
  private readonly passUni: GPUBuffer;
  readonly velTex: GPUTexture;

  private readonly pipes = new Map<string, GPUComputePipeline>();
  private readonly gAB: GPUBindGroup;
  private readonly gBA: GPUBindGroup;
  private readonly gVel: GPUBindGroup;
  private readonly passGroups = new Map<string, GPUBindGroup>();

  constraint: ConstraintSpec = {
    kind: 0,
    center: [0.5, 0.5, 0.5],
    radius: 0.1,
    kvec: [0, 0, 0],
    omegaT: 0,
  };
  buoyancy = 0; // phase rate on psi2 (0 = off); UNGATED when nonzero
  /** true once any Alg-4/buoyancy pass has touched Psi (gate badge flips). */
  ungated = false;

  constructor(device: GPUDevice, n: number, params: IsfParams) {
    if ((n & (n - 1)) !== 0) throw new Error("grid must be a power of two");
    this.device = device;
    this.n = n;
    this.n3 = n * n * n;
    this.log2n = Math.log2(n);
    this.params = { ...params };

    const mk = (size: number, extra = 0): GPUBuffer =>
      device.createBuffer({
        size,
        usage:
          GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | extra,
      });

    this.psi = mk(this.n3 * 16);
    this.psiTmp = mk(this.n3 * 16);
    this.scA = mk(this.n3 * 8);
    this.scB = mk(this.n3 * 8);
    this.freeMul = mk(this.n3 * 8);
    this.invLam = mk(this.n3 * 4);
    this.stats = mk(16);
    this.statsRead = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.psiRead = device.createBuffer({
      size: this.n3 * 16,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.uni = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.velTex = device.createTexture({
      size: [n, n, n],
      dimension: "3d",
      format: "rgba16float",
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });

    // static per-(axis,stage,dir) pass slots, 256-aligned
    const combos = 3 * this.log2n * 2;
    this.passUni = device.createBuffer({
      size: combos * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    {
      const staging = new ArrayBuffer(combos * 256);
      const dv = new DataView(staging);
      let slot = 0;
      for (const dir of [-1, 1]) {
        for (let axis = 0; axis < 3; axis++) {
          for (let stage = 0; stage < this.log2n; stage++) {
            const off = slot * 256;
            dv.setUint32(off, axis, true);
            dv.setUint32(off + 4, stage, true);
            dv.setFloat32(off + 8, dir, true);
            slot++;
          }
        }
      }
      device.queue.writeBuffer(this.passUni, 0, staging);
    }

    const module = device.createShaderModule({
      label: "isf_core",
      code: coreWgsl.replace("//__COMMON_FFT__", FFT_COMMON_WGSL),
    });

    const mainLayout = device.createBindGroupLayout({
      label: "isf-main-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const velLayout = device.createBindGroupLayout({
      label: "isf-vel-layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: "write-only", format: "rgba16float", viewDimension: "3d" },
        },
      ],
    });
    const passLayout = device.createBindGroupLayout({
      label: "isf-pass-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ],
    });

    const plMain = device.createPipelineLayout({ bindGroupLayouts: [mainLayout] });
    const plVel = device.createPipelineLayout({ bindGroupLayouts: [mainLayout, velLayout] });
    const plFft = device.createPipelineLayout({
      bindGroupLayouts: [mainLayout, velLayout, passLayout],
    });

    const mkPipe = (entry: string, layout: GPUPipelineLayout): void => {
      this.pipes.set(
        entry,
        device.createComputePipeline({
          label: entry,
          layout,
          compute: { module, entryPoint: entry },
        }),
      );
    };
    mkPipe("fft_pass", plFft);
    mkPipe("fft_pass_sc", plFft);
    for (const e of [
      "copy_b_to_a",
      "copy_sc_b_to_a",
      "spectral_mul_free",
      "spectral_mul_invlam",
      "normalize_psi",
      "eta_div",
      "gauge_apply",
      "constraint_blend",
      "buoyancy_apply",
    ]) {
      mkPipe(e, plMain);
    }
    mkPipe("velocity_write", plVel);

    const mkMainGroup = (a: GPUBuffer, b: GPUBuffer, sa: GPUBuffer, sb: GPUBuffer) =>
      device.createBindGroup({
        label: "isf-main-group",
        layout: mainLayout,
        entries: [
          { binding: 0, resource: { buffer: this.uni } },
          { binding: 1, resource: { buffer: a } },
          { binding: 2, resource: { buffer: b } },
          { binding: 3, resource: { buffer: sa } },
          { binding: 4, resource: { buffer: sb } },
          { binding: 5, resource: { buffer: this.freeMul } },
          { binding: 6, resource: { buffer: this.invLam } },
          { binding: 7, resource: { buffer: this.stats } },
        ],
      });
    this.gAB = mkMainGroup(this.psi, this.psiTmp, this.scA, this.scB);
    this.gBA = mkMainGroup(this.psiTmp, this.psi, this.scB, this.scA);
    this.gVel = device.createBindGroup({
      label: "isf-vel-group",
      layout: velLayout,
      entries: [{ binding: 0, resource: this.velTex.createView() }],
    });
    let slot = 0;
    for (const dir of [-1, 1]) {
      for (let axis = 0; axis < 3; axis++) {
        for (let stage = 0; stage < this.log2n; stage++) {
          this.passGroups.set(
            `${dir}:${axis}:${stage}`,
            device.createBindGroup({
              label: "isf-pass-group",
              layout: passLayout,
              entries: [
                {
                  binding: 0,
                  resource: { buffer: this.passUni, offset: slot * 256, size: 16 },
                },
              ],
            }),
          );
          slot++;
        }
      }
    }

    this.setParams(params);
  }

  /** Update hbar/dt: regenerates the f64 multiplier tables (cheap). */
  setParams(params: IsfParams): void {
    this.params = { ...params };
    const t = buildTables(this.n, params.hbar, params.dt);
    this.device.queue.writeBuffer(this.freeMul, 0, t.free as Float32Array<ArrayBuffer>);
    this.device.queue.writeBuffer(this.invLam, 0, t.invLam as Float32Array<ArrayBuffer>);
    this.writeUniforms();
  }

  get hbar(): number {
    return this.params.hbar;
  }

  get dt(): number {
    return this.params.dt;
  }

  writeUniforms(): void {
    const buf = new ArrayBuffer(64);
    const dv = new DataView(buf);
    dv.setUint32(0, this.n, true);
    dv.setUint32(4, this.n3 / 2, true);
    dv.setFloat32(8, 1.0 / this.n, true);
    dv.setFloat32(12, this.params.hbar, true);
    dv.setFloat32(16, this.params.dt, true);
    dv.setUint32(20, this.constraint.kind, true);
    dv.setFloat32(24, this.constraint.radius, true);
    dv.setFloat32(28, this.constraint.omegaT, true);
    dv.setFloat32(32, this.constraint.center[0], true);
    dv.setFloat32(36, this.constraint.center[1], true);
    dv.setFloat32(40, this.constraint.center[2], true);
    dv.setFloat32(44, this.buoyancy, true);
    dv.setFloat32(48, this.constraint.kvec[0], true);
    dv.setFloat32(52, this.constraint.kvec[1], true);
    dv.setFloat32(56, this.constraint.kvec[2], true);
    this.device.queue.writeBuffer(this.uni, 0, buf);
  }

  uploadPsi(packed: Float32Array): void {
    this.device.queue.writeBuffer(this.psi, 0, packed as Float32Array<ArrayBuffer>);
  }

  private dispatch(pass: GPUComputePassEncoder, entry: string, groups: number): void {
    const pipe = this.pipes.get(entry);
    if (!pipe) throw new Error(`no pipeline ${entry}`);
    pass.setPipeline(pipe);
    pass.dispatchWorkgroups(groups);
  }

  /** 3D FFT over the vec4 (spinor) pair; leaves the result in bufA (psi). */
  private encodeFft(pass: GPUComputePassEncoder, scalar: boolean, dir: -1 | 1): void {
    const entry = scalar ? "fft_pass_sc" : "fft_pass";
    const pipe = this.pipes.get(entry);
    if (!pipe) throw new Error(`no pipeline ${entry}`);
    pass.setPipeline(pipe);
    pass.setBindGroup(1, this.gVel);
    let parity = 0;
    const groups = Math.ceil(this.n3 / 2 / WG);
    for (let axis = 0; axis < 3; axis++) {
      for (let stage = 0; stage < this.log2n; stage++) {
        const g = this.passGroups.get(`${dir}:${axis}:${stage}`);
        if (!g) throw new Error("missing pass group");
        pass.setBindGroup(0, parity === 0 ? this.gAB : this.gBA);
        pass.setBindGroup(2, g);
        pass.dispatchWorkgroups(groups);
        parity ^= 1;
      }
    }
    if (parity === 1) {
      // odd pass count — park the result back in the A buffers
      pass.setBindGroup(0, this.gAB);
      this.dispatch(pass, scalar ? "copy_sc_b_to_a" : "copy_b_to_a", Math.ceil(this.n3 / WG));
    }
  }

  /**
   * Encode one full Lie-split ISF step (paper-verbatim; spec-ref § 3):
   * free step -> normalize -> [ungated constraint/buoyancy] -> projection ->
   * velocity readout. Caller submits the encoder.
   */
  encodeStep(enc: GPUCommandEncoder, opts: { skipVelocity?: boolean } = {}): void {
    enc.clearBuffer(this.stats);
    const pass = enc.beginComputePass();
    const ptGroups = Math.ceil(this.n3 / WG);
    const cellGroups = Math.ceil(this.n / 4);

    pass.setBindGroup(0, this.gAB);
    pass.setBindGroup(1, this.gVel);

    // 1. free Schrödinger step (exact propagator; continuous Eq.-18 table)
    this.encodeFft(pass, false, -1);
    pass.setBindGroup(0, this.gAB);
    this.dispatch(pass, "spectral_mul_free", ptGroups);
    this.encodeFft(pass, false, 1);
    pass.setBindGroup(0, this.gAB);

    // 2. pointwise normalize
    this.dispatch(pass, "normalize_psi", ptGroups);

    // 2b. beyond-canonical passes (UNGATED — they overwrite/re-phase Psi)
    if (this.constraint.kind !== 0) {
      const pipe = this.pipes.get("constraint_blend");
      if (pipe) {
        pass.setPipeline(pipe);
        pass.dispatchWorkgroups(cellGroups, cellGroups, cellGroups);
      }
      this.ungated = true;
    }
    if (this.buoyancy !== 0) {
      this.dispatch(pass, "buoyancy_apply", ptGroups);
      this.ungated = true;
    }

    // 3. pressure projection (discrete Eq.-17 table; golden E)
    {
      const pipe = this.pipes.get("eta_div");
      if (pipe) {
        pass.setPipeline(pipe);
        pass.dispatchWorkgroups(cellGroups, cellGroups, cellGroups);
      }
      this.encodeFft(pass, true, -1);
      pass.setBindGroup(0, this.gAB);
      this.dispatch(pass, "spectral_mul_invlam", ptGroups);
      this.encodeFft(pass, true, 1);
      pass.setBindGroup(0, this.gAB);
      this.dispatch(pass, "gauge_apply", ptGroups);
    }

    // 4. velocity readout -> rgba16float 3D texture (+ phase in .w)
    if (!opts.skipVelocity) {
      const pipe = this.pipes.get("velocity_write");
      if (pipe) {
        pass.setPipeline(pipe);
        pass.dispatchWorkgroups(cellGroups, cellGroups, cellGroups);
      }
    }
    pass.end();
  }

  /** Encode ONLY the free step (exact-propagator instrument; no normalize,
   * no projection — the flatline plot needs the linear step in isolation). */
  encodeFreeStepOnly(enc: GPUCommandEncoder): void {
    const pass = enc.beginComputePass();
    const ptGroups = Math.ceil(this.n3 / WG);
    pass.setBindGroup(0, this.gAB);
    pass.setBindGroup(1, this.gVel);
    this.encodeFft(pass, false, -1);
    pass.setBindGroup(0, this.gAB);
    this.dispatch(pass, "spectral_mul_free", ptGroups);
    this.encodeFft(pass, false, 1);
    pass.end();
  }

  /** Encode only the projection (used for GPU-side IC settling if needed). */
  encodeProjection(enc: GPUCommandEncoder): void {
    const pass = enc.beginComputePass();
    const ptGroups = Math.ceil(this.n3 / WG);
    const cellGroups = Math.ceil(this.n / 4);
    pass.setBindGroup(0, this.gAB);
    pass.setBindGroup(1, this.gVel);
    const pipe = this.pipes.get("eta_div");
    if (pipe) {
      pass.setPipeline(pipe);
      pass.dispatchWorkgroups(cellGroups, cellGroups, cellGroups);
    }
    this.encodeFft(pass, true, -1);
    pass.setBindGroup(0, this.gAB);
    this.dispatch(pass, "spectral_mul_invlam", ptGroups);
    this.encodeFft(pass, true, 1);
    pass.setBindGroup(0, this.gAB);
    this.dispatch(pass, "gauge_apply", ptGroups);
    pass.end();
  }

  /** Read back the packed f32 spinor (vec4 per cell). */
  async readPsi(): Promise<Float32Array> {
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.psi, 0, this.psiRead, 0, this.n3 * 16);
    this.device.queue.submit([enc.finish()]);
    await this.psiRead.mapAsync(GPUMapMode.READ);
    const out = new Float32Array(this.psiRead.getMappedRange().slice(0));
    this.psiRead.unmap();
    return out;
  }

  /** Read the per-step stats: [max|eta| (headroom*pi), max|div|]. */
  async readStats(): Promise<{ maxEta: number; maxDiv: number }> {
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.stats, 0, this.statsRead, 0, 16);
    this.device.queue.submit([enc.finish()]);
    await this.statsRead.mapAsync(GPUMapMode.READ);
    const u = new Uint32Array(this.statsRead.getMappedRange().slice(0));
    this.statsRead.unmap();
    const f = new Float32Array(u.buffer);
    return { maxEta: f[0] ?? 0, maxDiv: f[1] ?? 0 };
  }

  destroy(): void {
    for (const b of [
      this.psi,
      this.psiTmp,
      this.scA,
      this.scB,
      this.freeMul,
      this.invLam,
      this.stats,
      this.statsRead,
      this.psiRead,
      this.uni,
      this.passUni,
    ]) {
      b.destroy();
    }
    this.velTex.destroy();
  }
}
