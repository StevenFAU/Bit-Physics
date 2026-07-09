// phase-field-fracture — WebGPU solver wrapper.
//
// Explicit bind-group layouts per pass (the pic-flip layout-auto lesson:
// auto layouts + shared helpers silently discard submits on mismatch).
// Damage ping-pongs by BIND-GROUP VARIANT (no copy passes); the per-substep
// loading BC {u_top, v_top} rides a 256-aligned dynamic-offset uniform ring
// filled in JS f64 (pff64.loadingSchedule) and cast once to f32 — the
// browser never recomputes the protocol in f32 (the committed-buffer plan).

import pffCoreWgsl from "./pff_core.wgsl?raw";

export interface SceneMaterial {
  /** interleaved (e_mult, gc_mult) per cell — the obstacles surface. */
  mat: Float32Array;
}

const WG = 256;
const RING = 4096; // per-substep uniform slots (refilled per frame batch)
const UNI_BYTES = 16 * 4;

export interface FracParams {
  n: number;
  h: number;
  dt: number;
  lam: number;
  mu: number;
  cDamp: number;
  mobility: number;
  kRes: number;
}

export class FractureGpu {
  readonly device: GPUDevice;
  readonly n: number;
  readonly nNodes: number;
  params: FracParams;

  private uni: GPUBuffer;
  private uniData = new ArrayBuffer(UNI_BYTES);
  private stepRing: GPUBuffer;
  private ringData = new Float32Array(RING * 64); // 256B slots
  bufU: GPUBuffer;
  bufV: GPUBuffer;
  private bufA: GPUBuffer;
  private dBuf: [GPUBuffer, GPUBuffer];
  bufH: GPUBuffer;
  matBuf: GPUBuffer;
  private cellF: GPUBuffer;
  private enBuf: GPUBuffer;
  private reactBuf: GPUBuffer;
  private partialsBuf: GPUBuffer;
  labBuf: [GPUBuffer, GPUBuffer];
  private readBuf: GPUBuffer;
  private readPending = false;

  dPing = 0;
  labPing = 0;
  /** total substeps executed since scene load. */
  stepIndex = 0;

  private pipelines = new Map<string, GPUComputePipeline>();
  private groups = new Map<string, GPUBindGroup>();
  private stepLayout: GPUBindGroupLayout;
  private stepGroup: GPUBindGroup;
  private matCache: Float32Array;

  constructor(device: GPUDevice, params: FracParams, mat: Float32Array) {
    this.device = device;
    this.n = params.n;
    this.nNodes = params.n + 1;
    this.params = { ...params };
    const n2 = this.n * this.n;
    const m2 = this.nNodes * this.nNodes;
    const STORAGE =
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const mk = (bytes: number, usage: GPUBufferUsageFlags = STORAGE): GPUBuffer =>
      device.createBuffer({ size: bytes, usage });

    this.bufU = mk(m2 * 8);
    this.bufV = mk(m2 * 8);
    this.bufA = mk(m2 * 8);
    this.dBuf = [mk(n2 * 4), mk(n2 * 4)];
    this.bufH = mk(n2 * 4);
    this.matBuf = mk(n2 * 8);
    this.cellF = mk(n2 * 4 * 8);
    this.enBuf = mk(n2 * 8);
    this.reactBuf = mk(this.nNodes * 4);
    const partialCount = Math.ceil(Math.max(n2, m2) / WG);
    this.partialsBuf = mk(partialCount * 16);
    this.labBuf = [mk(n2 * 4), mk(n2 * 4)];
    this.readBuf = mk(
      Math.max(m2 * 8, n2 * 4),
      GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    );
    this.uni = device.createBuffer({
      size: UNI_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.stepRing = device.createBuffer({
      size: RING * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.matCache = Float32Array.from(mat);
    device.queue.writeBuffer(this.matBuf, 0, this.matCache as unknown as BufferSource);

    const module = device.createShaderModule({ code: pffCoreWgsl });
    module.getCompilationInfo?.().then((info) => {
      for (const m of info.messages) {
        if (m.type === "error") console.error("WGSL:", m.message, m.lineNum);
      }
    });

    // explicit layouts: one per pass, exactly the bindings each entry uses
    const uniform = (binding: number): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "uniform" },
    });
    const storage = (binding: number, ro = false): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: ro ? "read-only-storage" : "storage" },
    });
    const L = (entries: GPUBindGroupLayoutEntry[]): GPUBindGroupLayout =>
      device.createBindGroupLayout({ entries });

    const layouts: Record<string, GPUBindGroupLayout> = {
      integrate: L([uniform(0), storage(1), storage(2), storage(3)]),
      cell_forces: L([
        uniform(0), storage(1), storage(4, true), storage(6), storage(7),
        storage(8), storage(9),
      ]),
      damage: L([
        uniform(0), storage(4, true), storage(5), storage(6), storage(7),
        storage(9),
      ]),
      finish: L([uniform(0), storage(2), storage(3), storage(8), storage(10)]),
      paint: L([uniform(0), storage(7)]),
      reduce_cells: L([uniform(0), storage(5), storage(9), storage(11)]),
      reduce_nodes: L([uniform(0), storage(1), storage(2), storage(11)]),
      labels_init: L([uniform(0), storage(5), storage(7), storage(13)]),
      labels_prop: L([
        uniform(0), storage(4, true), storage(7), storage(12, true),
        storage(13),
      ]),
    };
    this.stepLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform", hasDynamicOffset: true },
        },
      ],
    });
    this.stepGroup = device.createBindGroup({
      layout: this.stepLayout,
      entries: [
        { binding: 0, resource: { buffer: this.stepRing, offset: 0, size: 16 } },
      ],
    });

    const withStep = new Set(["integrate", "finish"]);
    for (const [name, layout] of Object.entries(layouts)) {
      const bgls = withStep.has(name) ? [layout, this.stepLayout] : [layout];
      this.pipelines.set(
        name,
        device.createComputePipeline({
          layout: device.createPipelineLayout({ bindGroupLayouts: bgls }),
          compute: { module, entryPoint: name },
        }),
      );
    }

    const B = (buffer: GPUBuffer): GPUBindGroupEntry & { buffer: GPUBuffer } =>
      ({ binding: 0, resource: { buffer } }) as never;
    void B;
    const g = (
      name: string,
      layout: GPUBindGroupLayout,
      entries: Array<[number, GPUBuffer]>,
    ): void => {
      this.groups.set(
        name,
        device.createBindGroup({
          layout,
          entries: entries.map(([binding, buffer]) => ({
            binding,
            resource: { buffer },
          })),
        }),
      );
    };

    g("integrate", layouts.integrate, [
      [0, this.uni], [1, this.bufU], [2, this.bufV], [3, this.bufA],
    ]);
    for (const p of [0, 1]) {
      g(`cell_forces:${p}`, layouts.cell_forces, [
        [0, this.uni], [1, this.bufU], [4, this.dBuf[p]], [6, this.bufH],
        [7, this.matBuf], [8, this.cellF], [9, this.enBuf],
      ]);
      g(`damage:${p}`, layouts.damage, [
        [0, this.uni], [4, this.dBuf[p]], [5, this.dBuf[1 - p]],
        [6, this.bufH], [7, this.matBuf], [9, this.enBuf],
      ]);
      g(`reduce_cells:${p}`, layouts.reduce_cells, [
        [0, this.uni], [5, this.dBuf[p]], [9, this.enBuf],
        [11, this.partialsBuf],
      ]);
      g(`labels_init:${p}`, layouts.labels_init, [
        [0, this.uni], [5, this.dBuf[p]], [7, this.matBuf],
        [13, this.labBuf[0]],
      ]);
    }
    for (const p of [0, 1]) {
      for (const dp of [0, 1]) {
        g(`labels_prop:${p}:${dp}`, layouts.labels_prop, [
          [0, this.uni], [4, this.dBuf[dp]], [7, this.matBuf],
          [12, this.labBuf[p]], [13, this.labBuf[1 - p]],
        ]);
      }
    }
    g("finish", layouts.finish, [
      [0, this.uni], [2, this.bufV], [3, this.bufA], [8, this.cellF],
      [10, this.reactBuf],
    ]);
    g("paint", layouts.paint, [[0, this.uni], [7, this.matBuf]]);
    g("reduce_nodes", layouts.reduce_nodes, [
      [0, this.uni], [1, this.bufU], [2, this.bufV], [11, this.partialsBuf],
    ]);

    this.writeUniforms();
  }

  get currentD(): GPUBuffer {
    return this.dBuf[this.dPing];
  }

  get currentLabels(): GPUBuffer {
    return this.labBuf[this.labPing];
  }

  writeUniforms(
    brush: { kind: number; x: number; y: number; r: number } = {
      kind: 0, x: 0, y: 0, r: 0,
    },
  ): void {
    const f = new Float32Array(this.uniData);
    const u = new Uint32Array(this.uniData);
    const p = this.params;
    u[0] = p.n;
    u[1] = p.n + 1;
    f[2] = Math.fround(p.dt);
    f[3] = Math.fround(0.5 * Math.fround(p.dt));
    f[4] = Math.fround(p.h);
    f[5] = Math.fround(1.0 / (p.h * p.h));
    f[6] = Math.fround(1.0 / (p.h * p.h)); // inv_mass (rho = 1)
    f[7] = Math.fround(p.lam);
    f[8] = Math.fround(p.mu);
    f[9] = Math.fround(p.cDamp);
    f[10] = Math.fround(p.mobility);
    f[11] = Math.fround(p.kRes);
    u[12] = brush.kind;
    f[13] = brush.x;
    f[14] = brush.y;
    f[15] = brush.r;
    this.device.queue.writeBuffer(this.uni, 0, this.uniData);
  }

  /** Reset state buffers to the zero IC with the given material field. */
  reset(mat: Float32Array): void {
    const n2 = this.n * this.n;
    const m2 = this.nNodes * this.nNodes;
    const zN = new Float32Array(m2 * 2);
    const zC = new Float32Array(n2);
    this.device.queue.writeBuffer(this.bufU, 0, zN as unknown as BufferSource);
    this.device.queue.writeBuffer(this.bufV, 0, zN as unknown as BufferSource);
    this.device.queue.writeBuffer(this.bufA, 0, zN as unknown as BufferSource);
    this.device.queue.writeBuffer(this.dBuf[0], 0, zC as unknown as BufferSource);
    this.device.queue.writeBuffer(this.dBuf[1], 0, zC as unknown as BufferSource);
    this.device.queue.writeBuffer(this.bufH, 0, zC as unknown as BufferSource);
    this.matCache = Float32Array.from(mat);
    this.device.queue.writeBuffer(this.matBuf, 0, this.matCache as unknown as BufferSource);
    this.dPing = 0;
    this.stepIndex = 0;
  }

  paintAt(x: number, y: number, r: number, kind: number): void {
    this.writeUniforms({ kind, x, y, r });
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    const p = this.pipelines.get("paint") as GPUComputePipeline;
    pass.setPipeline(p);
    pass.setBindGroup(0, this.groups.get("paint") as GPUBindGroup);
    pass.dispatchWorkgroups(Math.ceil((this.n * this.n) / WG));
    pass.end();
    this.device.queue.submit([enc.finish()]);
    this.writeUniforms();
  }

  /** Fill the per-substep loading ring for steps [start, start+count). */
  fillRing(uTop: Float64Array, vTop: Float64Array, start: number, count: number): void {
    for (let k = 0; k < count; k++) {
      const slot = (start + k) % RING;
      this.ringData[slot * 64] = Math.fround(uTop[start + k] ?? uTop[uTop.length - 1]);
      this.ringData[slot * 64 + 1] = Math.fround(vTop[start + k] ?? 0);
    }
    // one contiguous write of the whole ring window is simplest & correct
    this.device.queue.writeBuffer(this.stepRing, 0, this.ringData as unknown as BufferSource);
  }

  /** Encode ONE substep (step index selects the ring slot). */
  encodeSubstep(enc: GPUCommandEncoder, stepIdx: number): void {
    const n2 = this.n * this.n;
    const m2 = this.nNodes * this.nNodes;
    const offset = (stepIdx % RING) * 256;
    const pass = enc.beginComputePass();
    const run = (
      name: string,
      count: number,
      group: string,
      dyn: boolean,
    ): void => {
      pass.setPipeline(this.pipelines.get(name) as GPUComputePipeline);
      pass.setBindGroup(0, this.groups.get(group) as GPUBindGroup);
      if (dyn) pass.setBindGroup(1, this.stepGroup, [offset]);
      pass.dispatchWorkgroups(Math.ceil(count / WG));
    };
    run("integrate", m2, "integrate", true);
    run("cell_forces", n2, `cell_forces:${this.dPing}`, false);
    run("damage", n2, `damage:${this.dPing}`, false);
    run("finish", m2, "finish", true);
    pass.end();
    this.dPing = 1 - this.dPing;
    this.stepIndex = stepIdx;
  }

  /** Encode the diagnostics reduction over cells OR nodes. */
  encodeReduce(enc: GPUCommandEncoder, which: "cells" | "nodes"): void {
    const count = which === "cells" ? this.n * this.n : this.nNodes * this.nNodes;
    const pass = enc.beginComputePass();
    const name = which === "cells" ? `reduce_cells:${this.dPing}` : "reduce_nodes";
    pass.setPipeline(
      this.pipelines.get(which === "cells" ? "reduce_cells" : "reduce_nodes") as GPUComputePipeline,
    );
    pass.setBindGroup(0, this.groups.get(name) as GPUBindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / WG));
    pass.end();
  }

  /** Encode fragment-label sweeps on the PERSISTENT label field; pass
   * reinit=true only at scene load / periodic refresh (per-frame re-init
   * shows as unconverged per-cell noise). */
  encodeLabels(enc: GPUCommandEncoder, sweeps = 8, reinit = false): void {
    const n2 = this.n * this.n;
    const pass = enc.beginComputePass();
    if (reinit) {
      pass.setPipeline(this.pipelines.get("labels_init") as GPUComputePipeline);
      pass.setBindGroup(0, this.groups.get(`labels_init:${this.dPing}`) as GPUBindGroup);
      pass.dispatchWorkgroups(Math.ceil(n2 / WG));
      this.labPing = 0;
    }
    for (let s = 0; s < sweeps; s++) {
      pass.setPipeline(this.pipelines.get("labels_prop") as GPUComputePipeline);
      pass.setBindGroup(
        0,
        this.groups.get(`labels_prop:${this.labPing}:${this.dPing}`) as GPUBindGroup,
      );
      pass.dispatchWorkgroups(Math.ceil(n2 / WG));
      this.labPing = 1 - this.labPing;
    }
    pass.end();
  }

  private async readBufferF32(src: GPUBuffer, floats: number): Promise<Float32Array> {
    while (this.readPending) await new Promise((r) => setTimeout(r, 1));
    this.readPending = true;
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(src, 0, this.readBuf, 0, floats * 4);
      this.device.queue.submit([enc.finish()]);
      await this.readBuf.mapAsync(GPUMapMode.READ, 0, floats * 4);
      const out = new Float32Array(this.readBuf.getMappedRange(0, floats * 4).slice(0));
      this.readBuf.unmap();
      return out;
    } finally {
      this.readPending = false;
    }
  }

  /** Read nodal displacements, de-interleaved to (ux, uy) row-major. */
  async readU(): Promise<{ ux: Float32Array; uy: Float32Array }> {
    const m2 = this.nNodes * this.nNodes;
    const raw = await this.readBufferF32(this.bufU, m2 * 2);
    const ux = new Float32Array(m2);
    const uy = new Float32Array(m2);
    for (let i = 0; i < m2; i++) {
      ux[i] = raw[i * 2];
      uy[i] = raw[i * 2 + 1];
    }
    return { ux, uy };
  }

  async readV(): Promise<{ vx: Float32Array; vy: Float32Array }> {
    const m2 = this.nNodes * this.nNodes;
    const raw = await this.readBufferF32(this.bufV, m2 * 2);
    const vx = new Float32Array(m2);
    const vy = new Float32Array(m2);
    for (let i = 0; i < m2; i++) {
      vx[i] = raw[i * 2];
      vy[i] = raw[i * 2 + 1];
    }
    return { vx, vy };
  }

  async readD(): Promise<Float32Array> {
    return this.readBufferF32(this.currentD, this.n * this.n);
  }

  async readH(): Promise<Float32Array> {
    return this.readBufferF32(this.bufH, this.n * this.n);
  }

  async readMat(): Promise<Float32Array> {
    return this.readBufferF32(this.matBuf, this.n * this.n * 2);
  }

  /** Sum the top-row reaction (f64 in JS). Routes through the shared
   * readBuf — dedicated tiny MAP_READ buffers hit a Chromium mapAsync
   * AbortError ("external Instance reference no longer exists") in the RAF
   * loop while this path is proven by the gate captures. */
  async readReaction(): Promise<number> {
    const arr = await this.readBufferF32(this.reactBuf, this.nNodes);
    let s = 0.0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s;
  }

  /** Read the reduction partials and combine in f64.
   * cells: (sum ie, sum efrac, max d, nan) — nodes: (sum |v|^2, max |u|, -, nan) */
  async readPartials(count: number): Promise<{ a: number; b: number; c: number; nan: boolean }> {
    const groups = Math.ceil(count / WG);
    const arr = await this.readBufferF32(this.partialsBuf, groups * 4);
    let a = 0.0;
    let b = 0.0;
    let c = -Infinity;
    let nan = false;
    for (let g = 0; g < groups; g++) {
      a += arr[g * 4];
      b += arr[g * 4 + 1];
      c = Math.max(c, arr[g * 4 + 2]);
      if (arr[g * 4 + 3] > 0) nan = true;
    }
    return { a, b, c, nan };
  }

  destroy(): void {
    for (const b of [
      this.bufU, this.bufV, this.bufA, ...this.dBuf, this.bufH, this.matBuf,
      this.cellF, this.enBuf, this.reactBuf, this.partialsBuf, ...this.labBuf,
      this.readBuf, this.uni, this.stepRing,
    ]) {
      b.destroy();
    }
  }
}

/** Build the material field for a scene: voids/holes/inclusions painted in
 * f64 JS then cast — matches the Python e_mult construction. */
export function buildMaterial(
  n: number,
  features: Array<
    | { kind: "slit"; i0: number; i1: number; j: number; eMult?: number }
    | { kind: "hole"; ci: number; cj: number; r: number }
    | { kind: "rect"; i0: number; i1: number; j0: number; j1: number; eMult: number; gcMult?: number }
  >,
): Float32Array {
  const mat = new Float32Array(n * n * 2);
  for (let i = 0; i < n * n; i++) {
    mat[i * 2] = 1.0;
    mat[i * 2 + 1] = 1.0;
  }
  for (const f of features) {
    if (f.kind === "slit") {
      for (let i = f.i0; i < f.i1; i++) mat[(i * n + f.j) * 2] = f.eMult ?? 1e-6;
    } else if (f.kind === "hole") {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const dx = i + 0.5 - f.ci;
          const dy = j + 0.5 - f.cj;
          if (dx * dx + dy * dy <= f.r * f.r) mat[(i * n + j) * 2] = 1e-6;
        }
      }
    } else {
      for (let i = f.i0; i < f.i1; i++) {
        for (let j = f.j0; j < f.j1; j++) {
          mat[(i * n + j) * 2] = f.eMult;
          if (f.gcMult !== undefined) mat[(i * n + j) * 2 + 1] = f.gcMult;
        }
      }
    }
  }
  return mat;
}
