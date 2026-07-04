// solver.ts — GPU orchestration for the MLS-MPM Tier-1 pipeline
// (split passes, global fixed-point i32 atomics — spec § 3.3).
//
// WGSL sources: packages/mpm-multimaterial/src/mpm_prelude.wgsl +
// packages/mpm-multimaterial/src/mpm_core.wgsl, concatenated (WGSL has no
// includes). One substep = one compute pass: clear_grid -> p2g ->
// grid_update -> g2p, so a whole frame's solver span is bracketed by a
// single timestamp-query pair when the feature is available.

import preludeWgsl from "../../src/mpm_prelude.wgsl?raw";
import coreWgsl from "../../src/mpm_core.wgsl?raw";

export const FLOATS_PER_PARTICLE = 36; // 144 bytes, mat3x3f-aligned
// Fixed-point multiplier M — MEASURED-then-declared (spec § 3.3 / § 10).
// The survey-converged 1e7 starting point saturated 86.8% of i32 on the
// worst-case per-cell accumulation (the dense 16-cube canonical: ~86
// normalized-mass-1 particles/cell at |v|~2, momentum channel). 4e6 gives
// 2.9x headroom; quantization error stays ~1e-8 relative (leak bound is
// M-independent in quanta terms).
export const FP_SCALE_DEFAULT = 4e6;

// Field offsets (f32 indices) inside the Particle struct.
export const P_OFF = {
  pos: 0,
  mass: 3,
  vel: 4,
  vol0: 7,
  c: 8, // 3 columns, vec4-strided
  f: 20, // 3 columns, vec4-strided
  jp: 32,
  matId: 33, // u32 (bitcast on the JS side)
} as const;

export interface MaterialDef {
  /** 0 neo-Hookean (jelly), 1 snow, 2 sand, 3 water. */
  model: number;
  mu0: number;
  lam0: number;
  xi: number;
  thetaC: number;
  thetaS: number;
  alpha: number;
  kStiff: number;
  gammaExp: number;
}

export interface SimConfig {
  gridN: number;
  nParticles: number;
  dt: number;
  gravity: [number, number, number];
  floorZ: number;
  fpScale: number;
  invMassUnit: number;
  vmaxClamp: number;
  frame: number;
  nPointers: number;
}

export interface PointerImpulse {
  pos: [number, number, number];
  vel: [number, number, number];
  radius: number;
  strength: number;
}

export interface GpuTimings {
  solverMs: number | null;
  available: boolean;
}

function align4(n: number): number {
  return (n + 3) & ~3;
}

export class MpmGpu {
  readonly device: GPUDevice;
  readonly maxParticles: number;
  readonly maxGridN: number;

  readonly particleBuf: GPUBuffer;
  readonly gridBuf: GPUBuffer;
  readonly gridVelBuf: GPUBuffer;
  private readonly paramsBuf: GPUBuffer;
  private readonly materialsBuf: GPUBuffer;
  private readonly pointersBuf: GPUBuffer;
  private readonly auxInBuf: GPUBuffer;
  private readonly auxOutBuf: GPUBuffer;

  private readonly pipeClear: GPUComputePipeline;
  private readonly pipeP2g: GPUComputePipeline;
  private readonly pipeGrid: GPUComputePipeline;
  private readonly pipeG2p: GPUComputePipeline;
  private readonly pipeGolden: GPUComputePipeline;
  private readonly pipeFixtures: GPUComputePipeline;
  private readonly pipeStress: GPUComputePipeline;

  private bgClear!: GPUBindGroup;
  private bgP2g!: GPUBindGroup;
  private bgGrid!: GPUBindGroup;
  private bgG2p!: GPUBindGroup;
  private bgGolden!: GPUBindGroup;
  private bgFixtures!: GPUBindGroup;
  private bgStress!: GPUBindGroup;

  private cfg: SimConfig | null = null;

  // timestamp-query HUD (spec § 3.3) — graceful no-op when unavailable
  private readonly tsQuery: GPUQuerySet | null;
  private readonly tsResolve: GPUBuffer | null;
  private readonly tsRead: GPUBuffer | null;
  private tsBusy = false;
  lastSolverMs: number | null = null;

  constructor(device: GPUDevice, maxParticles = 262_144, maxGridN = 64) {
    this.device = device;
    this.maxParticles = maxParticles;
    this.maxGridN = maxGridN;

    const code = `${preludeWgsl}\n${coreWgsl}`;
    const module = device.createShaderModule({ label: "mpm_core", code });

    const mk = (entryPoint: string): GPUComputePipeline =>
      device.createComputePipeline({
        label: `mpm:${entryPoint}`,
        layout: "auto",
        compute: { module, entryPoint },
      });
    this.pipeClear = mk("clear_grid");
    this.pipeP2g = mk("p2g");
    this.pipeGrid = mk("grid_update");
    this.pipeG2p = mk("g2p");
    this.pipeGolden = mk("golden_eval");
    this.pipeFixtures = mk("material_fixtures");
    this.pipeStress = mk("stress_eval");

    const mkBuf = (label: string, size: number, usage: GPUBufferUsageFlags) =>
      device.createBuffer({ label, size, usage });
    const cells = maxGridN ** 3;
    this.particleBuf = mkBuf(
      "particles",
      maxParticles * FLOATS_PER_PARTICLE * 4,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    );
    this.gridBuf = mkBuf(
      "grid_fp",
      cells * 16,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    this.gridVelBuf = mkBuf(
      "grid_vel",
      cells * 16,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );
    this.paramsBuf = mkBuf(
      "sim_params",
      64,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.materialsBuf = mkBuf(
      "materials",
      192,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.pointersBuf = mkBuf(
      "pointers",
      128,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
    this.auxInBuf = mkBuf(
      "aux_in",
      65_536,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );
    this.auxOutBuf = mkBuf(
      "aux_out",
      65_536,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    );

    const hasTs = device.features.has("timestamp-query");
    this.tsQuery = hasTs
      ? device.createQuerySet({ type: "timestamp", count: 2 })
      : null;
    this.tsResolve = hasTs
      ? mkBuf("ts_resolve", 16, GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC)
      : null;
    this.tsRead = hasTs
      ? mkBuf("ts_read", 16, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
      : null;

    this.buildBindGroups();
  }

  private buildBindGroups(): void {
    const e = (
      binding: number,
      buffer: GPUBuffer,
    ): GPUBindGroupEntry => ({ binding, resource: { buffer } });
    const bg = (
      pipe: GPUComputePipeline,
      entries: GPUBindGroupEntry[],
      label: string,
    ): GPUBindGroup =>
      this.device.createBindGroup({
        label,
        layout: pipe.getBindGroupLayout(0),
        entries,
      });
    this.bgClear = bg(this.pipeClear, [e(0, this.paramsBuf), e(2, this.gridBuf)], "clear");
    this.bgP2g = bg(
      this.pipeP2g,
      [
        e(0, this.paramsBuf),
        e(1, this.particleBuf),
        e(2, this.gridBuf),
        e(4, this.materialsBuf),
      ],
      "p2g",
    );
    this.bgGrid = bg(
      this.pipeGrid,
      [
        e(0, this.paramsBuf),
        e(2, this.gridBuf),
        e(3, this.gridVelBuf),
        e(7, this.pointersBuf),
      ],
      "grid",
    );
    this.bgG2p = bg(
      this.pipeG2p,
      [
        e(0, this.paramsBuf),
        e(1, this.particleBuf),
        e(3, this.gridVelBuf),
        e(4, this.materialsBuf),
      ],
      "g2p",
    );
    this.bgGolden = bg(
      this.pipeGolden,
      [e(5, this.auxInBuf), e(6, this.auxOutBuf)],
      "golden",
    );
    this.bgFixtures = bg(
      this.pipeFixtures,
      [
        e(0, this.paramsBuf),
        e(4, this.materialsBuf),
        e(5, this.auxInBuf),
        e(6, this.auxOutBuf),
      ],
      "fixtures",
    );
    this.bgStress = bg(
      this.pipeStress,
      [
        e(0, this.paramsBuf),
        e(4, this.materialsBuf),
        e(5, this.auxInBuf),
        e(6, this.auxOutBuf),
      ],
      "stress",
    );
  }

  configure(cfg: SimConfig): void {
    if (cfg.gridN > this.maxGridN) throw new Error("gridN exceeds allocation");
    if (cfg.nParticles > this.maxParticles) throw new Error("N exceeds allocation");
    this.cfg = { ...cfg };
    const buf = new ArrayBuffer(64);
    const dv = new DataView(buf);
    dv.setFloat32(0, cfg.gravity[0], true);
    dv.setFloat32(4, cfg.gravity[1], true);
    dv.setFloat32(8, cfg.gravity[2], true);
    dv.setFloat32(12, cfg.dt, true);
    dv.setUint32(16, cfg.gridN, true);
    dv.setUint32(20, cfg.nParticles, true);
    dv.setInt32(24, cfg.floorZ, true);
    dv.setUint32(28, cfg.nPointers, true);
    const dx = 1.0 / cfg.gridN;
    dv.setFloat32(32, dx, true);
    dv.setFloat32(36, cfg.gridN, true); // inv_dx = grid_n exactly (dx = 1/n)
    dv.setFloat32(40, cfg.fpScale, true);
    dv.setFloat32(44, 1.0 / cfg.fpScale, true);
    dv.setFloat32(48, cfg.invMassUnit, true);
    dv.setUint32(52, cfg.frame, true);
    dv.setFloat32(56, cfg.vmaxClamp, true);
    dv.setFloat32(60, 0, true);
    this.device.queue.writeBuffer(this.paramsBuf, 0, buf);
  }

  get config(): SimConfig {
    if (!this.cfg) throw new Error("configure() first");
    return this.cfg;
  }

  setMaterials(mats: MaterialDef[]): void {
    const f = new Float32Array(48);
    const u = new Uint32Array(f.buffer);
    for (let i = 0; i < 4; i += 1) {
      const m = mats[Math.min(i, mats.length - 1)];
      const o = i * 12;
      f[o + 0] = m.mu0;
      f[o + 1] = m.lam0;
      u[o + 2] = m.model;
      f[o + 3] = m.xi;
      f[o + 4] = m.thetaC;
      f[o + 5] = m.thetaS;
      f[o + 6] = m.alpha;
      f[o + 7] = m.kStiff;
      f[o + 8] = m.gammaExp;
    }
    this.device.queue.writeBuffer(this.materialsBuf, 0, f);
  }

  setPointers(list: PointerImpulse[]): void {
    const f = new Float32Array(32);
    for (let i = 0; i < Math.min(4, list.length); i += 1) {
      const p = list[i];
      const o = i * 8;
      f.set(p.pos, o);
      f[o + 3] = p.radius;
      f.set(p.vel, o + 4);
      f[o + 7] = p.strength;
    }
    this.device.queue.writeBuffer(this.pointersBuf, 0, f);
  }

  uploadParticles(data: Float32Array, count: number): void {
    this.device.queue.writeBuffer(
      this.particleBuf,
      0,
      data.buffer,
      data.byteOffset,
      count * FLOATS_PER_PARTICLE * 4,
    );
  }

  /** Encode `substeps` full MLS-MPM substeps into one compute pass. */
  encodeSteps(encoder: GPUCommandEncoder, substeps: number, withTimestamps = false): void {
    const cfg = this.config;
    const cellGroups = Math.ceil(cfg.gridN ** 3 / 64);
    const partGroups = Math.ceil(cfg.nParticles / 64);
    const ts =
      withTimestamps && this.tsQuery && !this.tsBusy
        ? {
            querySet: this.tsQuery,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
          }
        : undefined;
    const pass = encoder.beginComputePass(
      ts ? { label: "mpm_steps", timestampWrites: ts } : { label: "mpm_steps" },
    );
    for (let s = 0; s < substeps; s += 1) {
      pass.setPipeline(this.pipeClear);
      pass.setBindGroup(0, this.bgClear);
      pass.dispatchWorkgroups(cellGroups);
      pass.setPipeline(this.pipeP2g);
      pass.setBindGroup(0, this.bgP2g);
      pass.dispatchWorkgroups(partGroups);
      pass.setPipeline(this.pipeGrid);
      pass.setBindGroup(0, this.bgGrid);
      pass.dispatchWorkgroups(cellGroups);
      pass.setPipeline(this.pipeG2p);
      pass.setBindGroup(0, this.bgG2p);
      pass.dispatchWorkgroups(partGroups);
    }
    pass.end();
    if (ts && this.tsResolve && this.tsRead) {
      encoder.resolveQuerySet(this.tsQuery as GPUQuerySet, 0, 2, this.tsResolve, 0);
      encoder.copyBufferToBuffer(this.tsResolve, 0, this.tsRead, 0, 16);
    }
  }

  step(substeps: number): void {
    const encoder = this.device.createCommandEncoder();
    const withTs = this.tsQuery !== null && !this.tsBusy;
    this.encodeSteps(encoder, substeps, true);
    this.device.queue.submit([encoder.finish()]);
    if (withTs && this.tsRead) {
      this.tsBusy = true;
      const tsRead = this.tsRead;
      void tsRead
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          const t = new BigUint64Array(tsRead.getMappedRange());
          this.lastSolverMs = Number(t[1] - t[0]) / 1e6;
          tsRead.unmap();
          this.tsBusy = false;
        })
        .catch(() => {
          this.tsBusy = false;
        });
    }
  }

  private async readBuffer(src: GPUBuffer, bytes: number): Promise<ArrayBuffer> {
    const staging = this.device.createBuffer({
      size: align4(bytes),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(src, 0, staging, 0, align4(bytes));
    this.device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = staging.getMappedRange().slice(0);
    staging.unmap();
    staging.destroy();
    return out;
  }

  async readParticles(count: number): Promise<Float32Array> {
    const buf = await this.readBuffer(
      this.particleBuf,
      count * FLOATS_PER_PARTICLE * 4,
    );
    return new Float32Array(buf);
  }

  /** Raw fixed-point grid quanta — JS integer sums over these are EXACT. */
  async readGridQuanta(): Promise<Int32Array> {
    const cfg = this.config;
    const buf = await this.readBuffer(this.gridBuf, cfg.gridN ** 3 * 16);
    return new Int32Array(buf);
  }

  /**
   * One clear+P2G (no grid update / G2P) — the mass-conservation and
   * fixed-point-leak witness (invariant mass_conservation_p2g_g2p in
   * packages/mpm-multimaterial/mpm_multimaterial/invariants.py).
   */
  async runP2gOnly(): Promise<Int32Array> {
    const cfg = this.config;
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeClear);
    pass.setBindGroup(0, this.bgClear);
    pass.dispatchWorkgroups(Math.ceil(cfg.gridN ** 3 / 64));
    pass.setPipeline(this.pipeP2g);
    pass.setBindGroup(0, this.bgP2g);
    pass.dispatchWorkgroups(Math.ceil(cfg.nParticles / 64));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    return this.readGridQuanta();
  }

  /** Evaluate N(x) at xs and the partition-of-unity sum at ps on the GPU. */
  async runGolden(xs: number[], ps: number[]): Promise<Float32Array> {
    const input = new Float32Array(2 + xs.length + ps.length);
    input[0] = xs.length;
    input[1] = ps.length;
    input.set(xs, 2);
    input.set(ps, 2 + xs.length);
    this.device.queue.writeBuffer(this.auxInBuf, 0, input);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeGolden);
    pass.setBindGroup(0, this.bgGolden);
    pass.dispatchWorkgroups(Math.ceil((xs.length + ps.length) / 64));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    const out = await this.readBuffer(this.auxOutBuf, (xs.length + ps.length) * 4);
    return new Float32Array(out);
  }

  /**
   * Apply the snow/sand return maps to a batch of trial F matrices.
   * Input: per fixture 12 floats (F row-major 9, mode, jp, pad).
   * Output: per fixture 16 floats (see mpm_core.wgsl material_fixtures).
   * NOTE: reconfigures n_particles to the fixture count — callers restore
   * their SimConfig afterwards.
   */
  async runFixtures(input: Float32Array, count: number): Promise<Float32Array> {
    const saved = this.config;
    this.configure({ ...saved, nParticles: count });
    this.device.queue.writeBuffer(this.auxInBuf, 0, input);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeFixtures);
    pass.setBindGroup(0, this.bgFixtures);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    const out = await this.readBuffer(this.auxOutBuf, count * 16 * 4);
    this.configure(saved);
    return new Float32Array(out);
  }

  /**
   * Evaluate the WGSL constitutive path (particle_stress) on a batch of F
   * matrices — the f32 side of the committed neo-Hookean fixture check.
   * Input layout matches runFixtures; output: 12 floats per fixture
   * (tau row-major 9 + pad).
   */
  async runStressEval(input: Float32Array, count: number): Promise<Float32Array> {
    const saved = this.config;
    this.configure({ ...saved, nParticles: count });
    this.device.queue.writeBuffer(this.auxInBuf, 0, input);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeStress);
    pass.setBindGroup(0, this.bgStress);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    const out = await this.readBuffer(this.auxOutBuf, count * 12 * 4);
    this.configure(saved);
    return new Float32Array(out);
  }

  async onFlush(): Promise<void> {
    await this.device.queue.onSubmittedWorkDone();
  }
}

/** Pack one particle into the AoS layout. */
export function packParticle(
  out: Float32Array,
  index: number,
  pos: [number, number, number],
  vel: [number, number, number],
  mass: number,
  vol0: number,
  matId: number,
  jp = 1.0,
): void {
  const o = index * FLOATS_PER_PARTICLE;
  out[o + 0] = pos[0];
  out[o + 1] = pos[1];
  out[o + 2] = pos[2];
  out[o + P_OFF.mass] = mass;
  out[o + P_OFF.vel] = vel[0];
  out[o + P_OFF.vel + 1] = vel[1];
  out[o + P_OFF.vel + 2] = vel[2];
  out[o + P_OFF.vol0] = vol0;
  // C = 0 (already zero-filled); F = I (column-major, vec4-strided).
  out[o + P_OFF.f + 0] = 1;
  out[o + P_OFF.f + 5] = 1;
  out[o + P_OFF.f + 10] = 1;
  out[o + P_OFF.jp] = jp;
  new Uint32Array(out.buffer, out.byteOffset)[o + P_OFF.matId] = matId;
}
