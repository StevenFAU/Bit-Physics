// Chimera (M3): dishes whose cells carry their rule. Every dish of the scene
// holds the same rules (the organisms' weights, back to back) and a rule id
// per cell; a dish starts with every cell on its own organism's rule ("home").
// Grafts carry their cells' rules, so a piece of one organism set into
// another keeps growing by its own rule, and tissue that grows into empty
// agar brings its rule with it (chimera.wgsl).
//
// The step is chimera.wgsl's update (the gated update reading the weights at
// rule × stride) and then the gated kernel's own mask pipeline, unchanged.
// With one rule the dish is the gated kernel's, bit for bit (Prove and
// v2-acceptance.mjs check it).

import type { Checkpoint } from "../proof/gate.js";
import rulesSrc from "./chimera-rules.wgsl?raw";
import { chimeraKernelSource } from "./live-kernel.js";
import chimeraSrc from "./chimera.wgsl?raw";
import type { LiveCheckpoint, LiveConfig } from "./live.js";
import { LiveKernels, LiveNca, MAX_SEGS } from "./live.js";

export const MAX_RULES = 8;
const SLOT = 256;
const PAINT_SLOT = 512;
const RING = 16;

export class ChimeraKernels {
  private constructor(
    readonly stepLayout: GPUBindGroupLayout,
    readonly update: GPUComputePipeline,
    readonly graftLayout: GPUBindGroupLayout,
    readonly graft: GPUComputePipeline,
    readonly paintLayout: GPUBindGroupLayout,
    readonly paint: GPUComputePipeline,
    readonly viewLayout: GPUBindGroupLayout,
    readonly view: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<ChimeraKernels> {
    const C = GPUShaderStage.COMPUTE;
    const ro = { type: "read-only-storage" } as const;
    const rw = { type: "storage" } as const;
    const stepLayout = device.createBindGroupLayout({
      label: "nca-chimera-step",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 32 } },
        { binding: 1, visibility: C, buffer: ro },
        { binding: 2, visibility: C, buffer: rw },
        { binding: 3, visibility: C, buffer: ro },
        { binding: 4, visibility: C, buffer: ro },
        { binding: 5, visibility: C, buffer: rw },
      ],
    });
    const graftLayout = device.createBindGroupLayout({
      label: "nca-chimera-graft",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 32 } },
        { binding: 1, visibility: C, buffer: ro },
        { binding: 2, visibility: C, buffer: rw },
      ],
    });
    const paintLayout = device.createBindGroupLayout({
      label: "nca-chimera-paint",
      entries: [
        { binding: 3, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 400 } },
        { binding: 4, visibility: C, buffer: rw },
      ],
    });
    const viewLayout = device.createBindGroupLayout({
      label: "nca-chimera-view",
      entries: [
        { binding: 5, visibility: C, buffer: { type: "uniform" } },
        { binding: 6, visibility: C, buffer: ro },
        { binding: 7, visibility: C, buffer: ro },
        { binding: 8, visibility: C, storageTexture: { access: "write-only", format: "rgba8unorm" } },
        { binding: 9, visibility: C, buffer: rw },
      ],
    });
    const stepModule = device.createShaderModule({ code: chimeraKernelSource(chimeraSrc), label: "nca-chimera" });
    const rulesModule = device.createShaderModule({ code: rulesSrc, label: "nca-chimera-rules" });
    const pl = (l: GPUBindGroupLayout): GPUPipelineLayout => device.createPipelineLayout({ bindGroupLayouts: [l] });
    const [update, graft, paint, view] = await Promise.all([
      device.createComputePipelineAsync({ label: "nca-chimera-update", layout: pl(stepLayout), compute: { module: stepModule, entryPoint: "update" } }),
      device.createComputePipelineAsync({ label: "nca-chimera-graft", layout: pl(graftLayout), compute: { module: rulesModule, entryPoint: "graft_rules" } }),
      device.createComputePipelineAsync({ label: "nca-chimera-paint", layout: pl(paintLayout), compute: { module: rulesModule, entryPoint: "paint_rules" } }),
      device.createComputePipelineAsync({ label: "nca-chimera-view", layout: pl(viewLayout), compute: { module: rulesModule, entryPoint: "view_rules" } }),
    ]);
    return new ChimeraKernels(stepLayout, update, graftLayout, graft, paintLayout, paint, viewLayout, view);
  }
}

/** The rules back to back in one weights array (they must share the committed layout). */
export function stackRules(rules: readonly Checkpoint[]): Checkpoint {
  if (rules.length === 0 || rules.length > MAX_RULES) throw new Error(`Chimera holds 1–${MAX_RULES} rules`);
  const r0 = rules[0]!;
  const n = r0.weights.length;
  const all = new Float32Array(n * rules.length);
  rules.forEach((r, i) => {
    if (r.weights.length !== n || r.b1Off !== r0.b1Off || r.w1Off !== r0.w1Off || r.w2Off !== r0.w2Off) {
      throw new Error("Chimera's rules must share the committed layout");
    }
    all.set(r.weights, i * n);
  });
  return { weights: all, b1Off: r0.b1Off, w1Off: r0.w1Off, w2Off: r0.w2Off, sha256: "" };
}

export class ChimeraNca extends LiveNca {
  /** The rule every cell starts on (this dish's own organism). */
  readonly home: number;
  readonly ruleCount: number;
  /** The overlay texture (r = 1 where a cell runs another dish's rule), rewritten by encodeView. */
  readonly viewTex: GPUTexture;
  /** Living cells per rule (u32 × 8), written by encodeView. */
  readonly counts: GPUBuffer;
  private readonly chim: ChimeraKernels;
  private readonly stride: number;
  private readonly rules: [GPUBuffer, GPUBuffer];
  private readonly scratch: GPUBuffer;
  private readonly chimBG: [GPUBindGroup, GPUBindGroup];
  private readonly graftU: GPUBuffer;
  private readonly rulesGraftBG: [GPUBindGroup, GPUBindGroup];
  private readonly paintU: GPUBuffer;
  private readonly paintBG: [GPUBindGroup, GPUBindGroup];
  private readonly viewU: GPUBuffer;
  private readonly viewBG: [GPUBindGroup, GPUBindGroup];
  private gSlot = 0;
  private pSlot = 0;

  constructor(device: GPUDevice, kernels: LiveKernels, chim: ChimeraKernels, rules: readonly Checkpoint[], home: number, cfg: LiveConfig) {
    super(device, kernels, stackRules(rules), cfg);
    this.chim = chim;
    this.home = home;
    this.ruleCount = rules.length;
    this.stride = rules[0]!.weights.length;
    const U = GPUBufferUsage;
    const ruleBuf = (label: string): GPUBuffer => device.createBuffer({ size: this.cells * 4, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST, label });
    this.rules = [ruleBuf("nca-rules-a"), ruleBuf("nca-rules-b")];
    this.scratch = ruleBuf("nca-rules-scratch");
    const [a, b] = this.bufs;
    const stepBG = (cur: GPUBuffer, rin: GPUBuffer, rout: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: chim.stepLayout,
        entries: [
          { binding: 0, resource: { buffer: this.params, size: 32 } },
          { binding: 1, resource: { buffer: cur } },
          { binding: 2, resource: { buffer: this.mid } },
          { binding: 3, resource: { buffer: this.weights } },
          { binding: 4, resource: { buffer: rin } },
          { binding: 5, resource: { buffer: rout } },
        ],
      });
    const [r0, r1] = this.rules;
    // parity 0 steps a → b with rules r0 → r1; parity 1 steps b → a with r1 → r0
    this.chimBG = [stepBG(a, r0, r1), stepBG(b, r1, r0)];
    this.graftU = device.createBuffer({ size: SLOT * RING, usage: U.UNIFORM | U.COPY_DST, label: "nca-rules-graft" });
    const gBG = (out: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: chim.graftLayout,
        entries: [
          { binding: 0, resource: { buffer: this.graftU, size: 32 } },
          { binding: 1, resource: { buffer: this.scratch } },
          { binding: 2, resource: { buffer: out } },
        ],
      });
    this.rulesGraftBG = [gBG(r0), gBG(r1)];
    this.paintU = device.createBuffer({ size: PAINT_SLOT * RING, usage: U.UNIFORM | U.COPY_DST, label: "nca-rules-paint" });
    const pBG = (out: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: chim.paintLayout,
        entries: [
          { binding: 3, resource: { buffer: this.paintU, size: 400 } },
          { binding: 4, resource: { buffer: out } },
        ],
      });
    this.paintBG = [pBG(r0), pBG(r1)];
    this.viewU = device.createBuffer({ size: 16, usage: U.UNIFORM | U.COPY_DST, label: "nca-rules-view" });
    device.queue.writeBuffer(this.viewU, 0, new Uint32Array([cfg.grid, home, 0, 0]));
    this.counts = device.createBuffer({ size: MAX_RULES * 4, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST, label: "nca-rules-counts" });
    this.viewTex = device.createTexture({
      size: [cfg.grid, cfg.grid],
      format: "rgba8unorm",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      label: "nca-rules-view",
    });
    const vBG = (st: GPUBuffer, rr: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: chim.viewLayout,
        entries: [
          { binding: 5, resource: { buffer: this.viewU } },
          { binding: 6, resource: { buffer: rr } },
          { binding: 7, resource: { buffer: st } },
          { binding: 8, resource: this.viewTex.createView() },
          { binding: 9, resource: { buffer: this.counts } },
        ],
      });
    this.viewBG = [vBG(a, r0), vBG(b, r1)];
    this.fillRules(null);
  }

  /** The buffer holding the current rule ids. */
  get ruleBuf(): GPUBuffer {
    return this.rules[this.parity]!;
  }

  private fillRules(ids: Uint32Array | null): void {
    const v = ids ?? new Uint32Array(this.cells).fill(this.home);
    this.device.queue.writeBuffer(this.rules[0], 0, v);
    this.device.queue.writeBuffer(this.rules[1], 0, v);
  }

  /** Replace the state (and every cell's rule: `ids`, or the dish's own). */
  override load(state: Float32Array<ArrayBuffer>, tick = 0, ids: Uint32Array | null = null): void {
    super.load(state, tick);
    this.fillRules(ids);
  }

  protected override recordSteps(pass: GPUComputePassEncoder, k: number): void {
    for (let s = 0; s < k; s += 1) {
      const off = this.writeParams(this.tick, this.stride);
      pass.setPipeline(this.chim.update);
      pass.setBindGroup(0, this.chimBG[this.parity]!, [off]);
      pass.dispatchWorkgroups(this.wg, this.wg);
      pass.setPipeline(this.kernels.mask);
      pass.setBindGroup(0, this.msk[this.parity]!, [off]);
      pass.dispatchWorkgroups(this.wg, this.wg);
      if (this.frozenCount > 0) {
        pass.setPipeline(this.kernels.freeze);
        pass.setBindGroup(0, this.freezeBG[this.parity]!);
        pass.dispatchWorkgroups(this.wg, this.wg);
      }
      this.parity ^= 1;
      this.tick += 1;
    }
    this.version += 1;
  }

  /** The graft carries its cells' rules: the source dish's rule ids land with the state. */
  override encodeGraft(enc: GPUCommandEncoder, from: LiveNca, src: readonly [number, number], dst: readonly [number, number], radius: number, move: boolean): void {
    super.encodeGraft(enc, from, src, dst, radius, move);
    if (!(from instanceof ChimeraNca)) return;
    enc.copyBufferToBuffer(from.ruleBuf, 0, this.scratch, 0, this.cells * 4);
    const off = this.gSlot * SLOT;
    this.gSlot = (this.gSlot + 1) % RING;
    const ab = new ArrayBuffer(32);
    const dv = new DataView(ab);
    dv.setUint32(0, this.grid, true);
    dv.setFloat32(8, radius, true);
    dv.setInt32(16, src[0], true);
    dv.setInt32(20, src[1], true);
    dv.setInt32(24, dst[0], true);
    dv.setInt32(28, dst[1], true);
    this.device.queue.writeBuffer(this.graftU, off, ab);
    const pass = enc.beginComputePass({ label: "nca-rules-graft" });
    pass.setPipeline(this.chim.graft);
    pass.setBindGroup(0, this.rulesGraftBG[this.parity]!, [off]);
    pass.dispatchWorkgroups(this.wg, this.wg);
    pass.end();
  }

  /** Set the rule of the cells within `radius` of a stroke (radius < 0.5: the cells the points fall in). */
  encodePaintRules(enc: GPUCommandEncoder, pts: readonly number[], radius: number, rule: number): void {
    const segs: number[][] = [];
    if (radius < 0.5 || pts.length === 2) {
      for (let i = 0; i + 1 < pts.length; i += 2) segs.push([pts[i]!, pts[i + 1]!, pts[i]!, pts[i + 1]!]);
    } else {
      for (let i = 0; i + 3 < pts.length; i += 2) segs.push([pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!]);
    }
    for (let i = 0; i < segs.length; i += MAX_SEGS) {
      const chunk = segs.slice(i, i + MAX_SEGS);
      const off = this.pSlot * PAINT_SLOT;
      this.pSlot = (this.pSlot + 1) % RING;
      const ab = new ArrayBuffer(400);
      const dv = new DataView(ab);
      dv.setUint32(0, this.grid, true);
      dv.setUint32(4, chunk.length, true);
      dv.setUint32(8, Math.min(Math.max(0, rule), this.ruleCount - 1), true);
      dv.setFloat32(12, radius, true);
      const f = new Float32Array(ab, 16, MAX_SEGS * 4);
      chunk.forEach((g, j) => f.set(g, j * 4));
      this.device.queue.writeBuffer(this.paintU, off, ab);
      const pass = enc.beginComputePass({ label: "nca-rules-paint" });
      pass.setPipeline(this.chim.paint);
      pass.setBindGroup(0, this.paintBG[this.parity]!, [off]);
      pass.dispatchWorkgroups(this.wg, this.wg);
      pass.end();
    }
    this.version += 1;
  }

  /** Rewrite the overlay texture and the living-cell counts per rule from the current state. */
  encodeView(enc: GPUCommandEncoder): void {
    enc.clearBuffer(this.counts);
    const pass = enc.beginComputePass({ label: "nca-rules-view" });
    pass.setPipeline(this.chim.view);
    pass.setBindGroup(0, this.viewBG[this.parity]!);
    pass.dispatchWorkgroups(this.wg, this.wg);
    pass.end();
  }

  async readRules(): Promise<Uint32Array> {
    const rb = this.device.createBuffer({ size: this.cells * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "nca-rules-read" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.ruleBuf, 0, rb, 0, this.cells * 4);
    this.device.queue.submit([enc.finish()]);
    try {
      await rb.mapAsync(GPUMapMode.READ);
      return new Uint32Array(rb.getMappedRange().slice(0));
    } finally {
      rb.destroy();
    }
  }

  override checkpoint(): LiveCheckpoint {
    const c = super.checkpoint();
    const rules = this.device.createBuffer({ size: this.cells * 4, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, label: "nca-rules-checkpoint" });
    const enc = this.device.createCommandEncoder({ label: "nca-rules-checkpoint" });
    enc.copyBufferToBuffer(this.ruleBuf, 0, rules, 0, this.cells * 4);
    this.device.queue.submit([enc.finish()]);
    return { ...c, rules };
  }

  override restore(c: LiveCheckpoint): void {
    super.restore(c);
    if (!c.rules) return;
    const enc = this.device.createCommandEncoder({ label: "nca-rules-restore" });
    enc.copyBufferToBuffer(c.rules, 0, this.ruleBuf, 0, this.cells * 4);
    this.device.queue.submit([enc.finish()]);
  }

  override release(c: LiveCheckpoint): void {
    super.release(c);
    c.rules?.destroy();
  }

  override destroy(): void {
    super.destroy();
    for (const b of [...this.rules, this.scratch, this.graftU, this.paintU, this.viewU, this.counts]) b.destroy();
    this.viewTex.destroy();
  }
}

/** Living cells per rule from a counts readback (u32 × MAX_RULES). */
export function parseCounts(ab: ArrayBuffer, n: number): number[] {
  return Array.from(new Uint32Array(ab, 0, MAX_RULES)).slice(0, n);
}
