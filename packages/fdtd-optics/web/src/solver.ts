// fdtd-optics — WebGPU solver wrapper around fdtd_core.wgsl (2D TMz Yee,
// rectangular nx x ny grids).
//
// Per-substep time-dependent values (source signatures, DFT trig) are
// computed in JS f64 and delivered through a dynamic-offset uniform ring —
// the WGSL-builtin-trig hazard rule (spec-ref § 9): sin/cos/exp never run
// in WGSL on a gated path.

import coreWgsl from "./fdtd_core.wgsl?raw";

export const MAX_SOURCES = 32;
export const UNI_STRIDE = 768; // U struct is 672 B; 768 keeps offsets aligned
export const MAX_SUBSTEPS = 128; // uniform-ring capacity per submit
export const PROBE_CAP = 8192;

export interface TfsfBox {
  ia: number;
  ib: number;
  ja: number;
  jb: number;
  na: number;
}

export interface PmlSpec {
  n: number; // thickness in cells (0 = off)
  x0: boolean;
  x1: boolean;
  y0: boolean;
  y1: boolean;
}

export interface PointSource {
  i: number;
  j: number;
  /** injected Ez increment for this substep (computed in JS f64). */
  value: number;
  on: boolean;
}

/** Everything that varies per substep, JS-f64-computed. */
export interface SubstepU {
  t: number;
  srcVal: number; // TF/SF aux-grid hard source
  dftCos: number;
  dftSin: number;
  monTrig: [number, number, number, number];
  probeSlot: number;
  sources: PointSource[];
  brush?: {
    x: number;
    y: number;
    r2: number;
    mat: [number, number, number, number];
    mat2: [number, number];
  };
}

export interface FdtdConfig {
  nx: number;
  ny: number;
  sc: number;
  periodicY: boolean;
  tfsf: TfsfBox | null;
  monitor: { mia: number; mib: number; mja: number; mjb: number } | null;
  probeIdx: number;
}

// FDTD++ production CPML defaults (spec-ref § 3.4, provenance Taflove Ch. 7):
// m = 3.5, kappa_max = 13.5, alpha_max = 0.225, m_alpha = 2, sigma = 1.1*opt.
export function buildPmlRows(nx: number, ny: number, sc: number, pml: PmlSpec): Float32Array {
  const stride = Math.max(nx, ny);
  const rows = new Float32Array(12 * stride);
  // interior defaults: b = 0, a = 0, kinv = 1
  for (let axis = 0; axis < 4; axis++) {
    for (let k = 0; k < stride; k++) rows[(axis * 3 + 2) * stride + k] = 1;
  }
  if (pml.n <= 0) return rows;
  const m = 3.5;
  const mA = 2;
  const kMax = 13.5;
  const aMax = 0.225;
  const sMax = (1.1 * (m + 1) * -Math.log(1e-7)) / (2 * pml.n);
  const dt = sc;

  const coef = (rho: number): [number, number, number] => {
    if (rho <= 0) return [0, 0, 1];
    const r = Math.min(rho, 1);
    const sig = sMax * r ** m;
    const kap = 1 + (kMax - 1) * r ** m;
    const alp = aMax * (1 - r) ** mA;
    const b = Math.exp(-(sig / kap + alp) * dt);
    const a = (sig * (b - 1)) / (kap * (sig + kap * alp));
    return [b, a, 1 / kap];
  };
  const fill = (base: number, len: number, stagger: number, lo: boolean, hi: boolean): void => {
    for (let k = 0; k < len; k++) {
      const pos = k + stagger;
      let rho = 0;
      if (lo && pos < pml.n) rho = (pml.n - pos) / pml.n;
      else if (hi && pos > len - 1 - pml.n) rho = (pos - (len - 1 - pml.n)) / pml.n;
      const [b, a, kinv] = coef(rho);
      rows[base * stride + k] = b;
      rows[(base + 1) * stride + k] = a;
      rows[(base + 2) * stride + k] = kinv;
    }
  };
  fill(0, nx, 0, pml.x0, pml.x1); // E pass, x deriv @ integer i
  fill(3, ny, 0, pml.y0, pml.y1); // E pass, y deriv @ integer j
  fill(6, nx, 0.5, pml.x0, pml.x1); // H pass, x deriv @ i+1/2
  fill(9, ny, 0.5, pml.y0, pml.y1); // H pass, y deriv @ j+1/2
  return rows;
}

/** Uniform material fill: vacuum dielectric. */
export function vacuumMaterials(nx: number, ny: number): {
  mat: Float32Array;
  mat2: Float32Array;
} {
  const mat = new Float32Array(nx * ny * 4);
  for (let k = 0; k < nx * ny; k++) mat[k * 4] = 1; // eps_inf = 1
  return { mat, mat2: new Float32Array(nx * ny * 2) };
}

// Per-kernel-class pipeline layouts. maxStorageBuffersPerShaderStage counts
// the STORAGE ENTRIES IN THE PIPELINE LAYOUT across all bind groups (hit
// live: one shared 12-buffer layout exceeded the portable default of 8), so
// kernels are grouped into three layout classes that each stay <= 8:
//   A field-update (h/e/paint):  uni + ez,hx,hy,mat,mat2,auxE,auxH + pml = 8
//   B tf/sf + sources:           uni + ez,hx,hy + aux1d               = 4
//   C instrumentation:           uni + ez,hx,hy + phasor,monitor,probe = 6
const ENTRY_CLASS = {
  h_update: "A",
  e_update: "A",
  paint: "A",
  tfsf_h: "B",
  aux_h: "B",
  aux_e: "B",
  tfsf_e: "B",
  inject_points: "B",
  phasor_accum: "C",
  monitor_dft: "C",
  probe_capture: "C",
} as const;
type Entry = keyof typeof ENTRY_CLASS;
type LayoutClass = (typeof ENTRY_CLASS)[Entry];
const ENTRIES = Object.keys(ENTRY_CLASS) as Entry[];

export class FdtdGpu {
  readonly device: GPUDevice;
  readonly cfg: FdtdConfig;
  readonly nx: number;
  readonly ny: number;
  readonly na: number;
  readonly pmlStride: number;

  ez: GPUBuffer;
  hx: GPUBuffer;
  hy: GPUBuffer;
  mat: GPUBuffer;
  mat2: GPUBuffer;
  auxE: GPUBuffer;
  auxH: GPUBuffer;
  pml: GPUBuffer;
  aux1d: GPUBuffer;
  phasor: GPUBuffer;
  monitor: GPUBuffer;
  probe: GPUBuffer;
  private uni: GPUBuffer;
  private uniScratch: ArrayBuffer;
  private pipelines = new Map<Entry, GPUComputePipeline>();
  private bg0A!: GPUBindGroup;
  private bg0Min!: GPUBindGroup;
  private bg1A!: GPUBindGroup;
  private bg1B!: GPUBindGroup;
  private bg1C!: GPUBindGroup;
  private staging: GPUBuffer;

  constructor(device: GPUDevice, cfg: FdtdConfig, pmlRows: Float32Array) {
    this.device = device;
    this.cfg = cfg;
    this.nx = cfg.nx;
    this.ny = cfg.ny;
    this.na = cfg.tfsf?.na ?? 8;
    this.pmlStride = Math.max(this.nx, this.ny);
    if (pmlRows.length !== 12 * this.pmlStride) throw new Error("pml rows size mismatch");
    const n2 = this.nx * this.ny;
    const mk = (bytes: number, label: string): GPUBuffer =>
      device.createBuffer({
        label: `fdtd-${label}`,
        size: bytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      });
    this.ez = mk(n2 * 4, "ez");
    this.hx = mk(n2 * 4, "hx");
    this.hy = mk(n2 * 4, "hy");
    this.mat = mk(n2 * 16, "mat");
    this.mat2 = mk(n2 * 8, "mat2");
    this.auxE = mk(n2 * 16, "auxE");
    this.auxH = mk(n2 * 8, "auxH");
    this.pml = mk(12 * this.pmlStride * 4, "pml");
    this.aux1d = mk(2 * this.na * 4, "aux1d");
    this.phasor = mk(3 * n2 * 8, "phasor");
    this.monitor = mk(24 * this.pmlStride * 8, "monitor");
    this.probe = mk(PROBE_CAP * 4, "probe");
    this.uni = device.createBuffer({
      label: "fdtd-uni",
      size: UNI_STRIDE * MAX_SUBSTEPS,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniScratch = new ArrayBuffer(UNI_STRIDE * MAX_SUBSTEPS);
    this.staging = device.createBuffer({
      label: "fdtd-staging",
      size: 3 * n2 * 8,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(this.pml, 0, pmlRows);
    const { mat, mat2 } = vacuumMaterials(this.nx, this.ny);
    device.queue.writeBuffer(this.mat, 0, mat);
    device.queue.writeBuffer(this.mat2, 0, mat2);

    const module = device.createShaderModule({ label: "fdtd-core", code: coreWgsl });
    const st: GPUShaderStageFlags = GPUShaderStage.COMPUTE;
    const uniE: GPUBindGroupLayoutEntry = {
      binding: 0,
      visibility: st,
      buffer: { type: "uniform", hasDynamicOffset: true },
    };
    const sb = (binding: number): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: st,
      buffer: { type: "storage" as const },
    });
    const bgl0A = device.createBindGroupLayout({
      label: "fdtd-bgl0A",
      entries: [uniE, sb(1), sb(2), sb(3), sb(4), sb(5), sb(6), sb(7)],
    });
    const bgl0Min = device.createBindGroupLayout({
      label: "fdtd-bgl0min",
      entries: [uniE, sb(1), sb(2), sb(3)],
    });
    const bgl1A = device.createBindGroupLayout({ label: "fdtd-bgl1A", entries: [sb(0)] });
    const bgl1B = device.createBindGroupLayout({ label: "fdtd-bgl1B", entries: [sb(1)] });
    const bgl1C = device.createBindGroupLayout({
      label: "fdtd-bgl1C",
      entries: [sb(2), sb(3), sb(4)],
    });
    const layouts: Record<LayoutClass, GPUPipelineLayout> = {
      A: device.createPipelineLayout({
        label: "fdtd-plA",
        bindGroupLayouts: [bgl0A, bgl1A],
      }),
      B: device.createPipelineLayout({
        label: "fdtd-plB",
        bindGroupLayouts: [bgl0Min, bgl1B],
      }),
      C: device.createPipelineLayout({
        label: "fdtd-plC",
        bindGroupLayouts: [bgl0Min, bgl1C],
      }),
    };
    for (const e of ENTRIES) {
      this.pipelines.set(
        e,
        device.createComputePipeline({
          label: `fdtd-${e}`,
          layout: layouts[ENTRY_CLASS[e]],
          compute: { module, entryPoint: e },
        }),
      );
    }
    const fieldEntries = [
      { binding: 0, resource: { buffer: this.uni, size: UNI_STRIDE } },
      { binding: 1, resource: { buffer: this.ez } },
      { binding: 2, resource: { buffer: this.hx } },
      { binding: 3, resource: { buffer: this.hy } },
    ];
    this.bg0A = device.createBindGroup({
      label: "fdtd-bg0A",
      layout: bgl0A,
      entries: [
        ...fieldEntries,
        { binding: 4, resource: { buffer: this.mat } },
        { binding: 5, resource: { buffer: this.mat2 } },
        { binding: 6, resource: { buffer: this.auxE } },
        { binding: 7, resource: { buffer: this.auxH } },
      ],
    });
    this.bg0Min = device.createBindGroup({
      label: "fdtd-bg0min",
      layout: bgl0Min,
      entries: fieldEntries,
    });
    this.bg1A = device.createBindGroup({
      label: "fdtd-bg1A",
      layout: bgl1A,
      entries: [{ binding: 0, resource: { buffer: this.pml } }],
    });
    this.bg1B = device.createBindGroup({
      label: "fdtd-bg1B",
      layout: bgl1B,
      entries: [{ binding: 1, resource: { buffer: this.aux1d } }],
    });
    this.bg1C = device.createBindGroup({
      label: "fdtd-bg1C",
      layout: bgl1C,
      entries: [
        { binding: 2, resource: { buffer: this.phasor } },
        { binding: 3, resource: { buffer: this.monitor } },
        { binding: 4, resource: { buffer: this.probe } },
      ],
    });
  }

  /** Serialize one substep's U struct into the uniform ring slot. */
  private packU(slot: number, s: SubstepU, phasorOn: boolean, monitorOn: boolean): void {
    const dv = new DataView(this.uniScratch, slot * UNI_STRIDE, UNI_STRIDE);
    const c = this.cfg;
    let flags = 0;
    if (c.periodicY) flags |= 1;
    if (c.tfsf) flags |= 2;
    if (monitorOn) flags |= 4;
    dv.setUint32(0, this.nx, true);
    dv.setUint32(4, this.ny, true);
    dv.setUint32(8, this.na, true);
    dv.setUint32(12, flags, true);
    dv.setFloat32(16, s.t, true);
    dv.setFloat32(20, c.sc, true);
    dv.setFloat32(24, s.srcVal, true);
    dv.setFloat32(28, phasorOn ? s.dftCos : 0, true);
    dv.setFloat32(32, phasorOn ? s.dftSin : 0, true);
    dv.setUint32(36, c.tfsf?.ia ?? 0, true);
    dv.setUint32(40, c.tfsf?.ib ?? 0, true);
    dv.setUint32(44, c.tfsf?.ja ?? 0, true);
    dv.setUint32(48, c.tfsf?.jb ?? 0, true);
    dv.setUint32(52, c.monitor?.mia ?? 0, true);
    dv.setUint32(56, c.monitor?.mib ?? 0, true);
    dv.setUint32(60, c.monitor?.mja ?? 0, true);
    dv.setUint32(64, c.monitor?.mjb ?? 0, true);
    dv.setUint32(68, c.probeIdx, true);
    dv.setUint32(72, s.probeSlot % PROBE_CAP, true);
    dv.setUint32(76, Math.min(s.sources.length, MAX_SOURCES), true);
    dv.setUint32(80, s.brush ? 1 : 0, true);
    dv.setUint32(84, this.pmlStride, true);
    for (let k = 0; k < 4; k++) dv.setFloat32(96 + 4 * k, s.monTrig[k], true);
    const b = s.brush;
    dv.setFloat32(112, b?.x ?? 0, true);
    dv.setFloat32(116, b?.y ?? 0, true);
    dv.setFloat32(120, b?.r2 ?? 0, true);
    for (let k = 0; k < 4; k++) dv.setFloat32(128 + 4 * k, b?.mat[k] ?? 0, true);
    dv.setFloat32(144, b?.mat2[0] ?? 0, true);
    dv.setFloat32(148, b?.mat2[1] ?? 0, true);
    for (let k = 0; k < MAX_SOURCES; k++) {
      const src = s.sources[k];
      const off = 160 + 16 * k;
      dv.setFloat32(off, src ? src.i : 0, true);
      dv.setFloat32(off + 4, src ? src.j : 0, true);
      dv.setFloat32(off + 8, src ? src.value : 0, true);
      dv.setFloat32(off + 12, src?.on ? 1 : 0, true);
    }
  }

  /**
   * Encode `subs.length` substeps (normative order, spec-ref § 6.2) into one
   * command encoder. Caller submits. probe/monitor/phasor toggles per call.
   */
  encodeSubsteps(
    enc: GPUCommandEncoder,
    subs: SubstepU[],
    opts: { phasor?: boolean; monitor?: boolean; probe?: boolean } = {},
  ): void {
    if (subs.length > MAX_SUBSTEPS) throw new Error("too many substeps per submit");
    for (let k = 0; k < subs.length; k++) {
      this.packU(k, subs[k], opts.phasor ?? false, opts.monitor ?? false);
    }
    this.device.queue.writeBuffer(this.uni, 0, this.uniScratch, 0, subs.length * UNI_STRIDE);
    const wgx = Math.ceil(this.ny / 16);
    const wgy = Math.ceil(this.nx / 16);
    const tf = this.cfg.tfsf;
    const tfThreads = tf ? 2 * (tf.jb - tf.ja + 1) + 2 * (tf.ib - tf.ia + 1) : 0;
    const pass = enc.beginComputePass({ label: "fdtd-substeps" });
    let uniOffset = 0;
    const run = (e: Entry, x: number, y = 1): void => {
      const p = this.pipelines.get(e);
      if (!p) throw new Error(e);
      const cls = ENTRY_CLASS[e];
      pass.setPipeline(p);
      pass.setBindGroup(0, cls === "A" ? this.bg0A : this.bg0Min, [uniOffset]);
      pass.setBindGroup(1, cls === "A" ? this.bg1A : cls === "B" ? this.bg1B : this.bg1C);
      pass.dispatchWorkgroups(x, y);
    };
    for (let k = 0; k < subs.length; k++) {
      uniOffset = k * UNI_STRIDE;
      if (subs[k].brush) run("paint", wgx, wgy);
      run("h_update", wgx, wgy);
      if (tf) {
        run("tfsf_h", Math.ceil(tfThreads / 64));
        run("aux_h", Math.ceil(this.na / 64));
        run("aux_e", Math.ceil(this.na / 64));
      }
      run("e_update", wgx, wgy);
      if (tf) run("tfsf_e", Math.ceil((2 * (tf.jb - tf.ja + 1)) / 64));
      if (subs[k].sources.length > 0) run("inject_points", 1);
      if (opts.phasor) run("phasor_accum", wgx, wgy);
      if (opts.monitor && this.cfg.monitor) {
        const len =
          Math.max(
            this.cfg.monitor.mib - this.cfg.monitor.mia,
            this.cfg.monitor.mjb - this.cfg.monitor.mja,
          ) + 1;
        run("monitor_dft", Math.ceil((4 * len * 2) / 64));
      }
      if (opts.probe) run("probe_capture", 1);
    }
    pass.end();
  }

  uploadMaterials(mat: Float32Array, mat2: Float32Array): void {
    this.device.queue.writeBuffer(this.mat, 0, mat);
    this.device.queue.writeBuffer(this.mat2, 0, mat2);
  }

  /** Zero all dynamic state (fields, aux, phasors, monitors, probe). */
  resetState(): void {
    const n2 = this.nx * this.ny;
    const z4 = new Float32Array(n2 * 4);
    this.device.queue.writeBuffer(this.ez, 0, z4, 0, n2);
    this.device.queue.writeBuffer(this.hx, 0, z4, 0, n2);
    this.device.queue.writeBuffer(this.hy, 0, z4, 0, n2);
    this.device.queue.writeBuffer(this.auxE, 0, z4);
    this.device.queue.writeBuffer(this.auxH, 0, z4, 0, n2 * 2);
    this.device.queue.writeBuffer(this.aux1d, 0, new Float32Array(2 * this.na));
    this.resetAccumulators();
  }

  resetAccumulators(): void {
    const n2 = this.nx * this.ny;
    this.device.queue.writeBuffer(this.phasor, 0, new Float32Array(3 * n2 * 2));
    this.device.queue.writeBuffer(this.monitor, 0, new Float32Array(48 * this.pmlStride));
    this.device.queue.writeBuffer(this.probe, 0, new Float32Array(PROBE_CAP));
  }

  private async readBuf(buf: GPUBuffer, floats: number): Promise<Float32Array> {
    const bytes = floats * 4;
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(buf, 0, this.staging, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    await this.staging.mapAsync(GPUMapMode.READ, 0, bytes);
    const out = new Float32Array(this.staging.getMappedRange(0, bytes).slice(0));
    this.staging.unmap();
    return out;
  }

  readField(which: "ez" | "hx" | "hy"): Promise<Float32Array> {
    const buf = which === "ez" ? this.ez : which === "hx" ? this.hx : this.hy;
    return this.readBuf(buf, this.nx * this.ny);
  }

  readPhasor(): Promise<Float32Array> {
    return this.readBuf(this.phasor, 3 * this.nx * this.ny * 2);
  }

  readMonitor(): Promise<Float32Array> {
    return this.readBuf(this.monitor, 48 * this.pmlStride);
  }

  readProbe(): Promise<Float32Array> {
    return this.readBuf(this.probe, PROBE_CAP);
  }

  destroy(): void {
    for (const b of [
      this.ez,
      this.hx,
      this.hy,
      this.mat,
      this.mat2,
      this.auxE,
      this.auxH,
      this.pml,
      this.aux1d,
      this.phasor,
      this.monitor,
      this.probe,
      this.uni,
      this.staging,
    ]) {
      b.destroy();
    }
  }
}
