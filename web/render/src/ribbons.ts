// Ribbons (00-foundation.md § 3.4, F3): thin luminous strands — a
// trajectory's recent history — drawn from a per-strand ring buffer as
// screen-space quads of constant pixel width, fading with age and with
// distance from the eye, added into the HDR scene.
//
// The ring is slot-major (ring[slot · strands + strand]); one push writes
// one slot for every strand, so all strands share a head and a length. Feed
// it from the CPU (`pushCpu`, e.g. an f64 reference integrated in JS) or
// from a GPU buffer (`pushGpu`, rows of vec4 points plus a per-row origin,
// e.g. members of an ensemble stored as offsets from a reference).

import { wgsl } from "@bp/gpu";
import "./register.js";
import { SCENE_FORMAT } from "./hdr.js";
import type { Vec3 } from "./orbit-camera.js";
import type { View3D } from "./view3d.js";
import pushSrc from "./wgsl/ribbons-push.wgsl?raw";
import ribbonsSrc from "./wgsl/ribbons.wgsl?raw";

export interface RibbonLook {
  /** Ribbon width, px. */
  width: number;
  /** Age fade: brightness ∝ (1 − age)^fade (0 = no fade). */
  fade: number;
  /** View distance (world units) where depth fade starts / ends. */
  depthNear: number;
  depthFar: number;
  /** Brightness factor reached at depthFar (1 = no depth fade). */
  depthMin: number;
  /** Overall energy multiplier. */
  energy: number;
}

export const DEFAULT_RIBBON_LOOK: RibbonLook = { width: 1.6, fade: 1.5, depthNear: 1, depthFar: 6, depthMin: 0.35, energy: 1 };

/** Ring slot written by the n-th push after a clear (0-based). */
export function ringSlot(pushIndex: number, slots: number): number {
  return ((pushIndex % slots) + slots) % slots;
}

/** Slot holding the point `age` pushes before the newest (head). */
export function ringSlotAtAge(head: number, age: number, slots: number): number {
  return (head + slots - (age % slots)) % slots;
}

const ADDITIVE: GPUBlendState = {
  color: { operation: "add", srcFactor: "one", dstFactor: "one" },
  alpha: { operation: "add", srcFactor: "one", dstFactor: "one" },
};

export interface RibbonsOptions {
  strands: number;
  /** History length (ring slots, ≥ 2). */
  slots: number;
  /** Most GPU rows per push (one push per encoder). Default 64. */
  maxRows?: number;
  format?: GPUTextureFormat;
  depthFormat?: GPUTextureFormat;
  label?: string;
}

export class Ribbons {
  readonly strands: number;
  readonly slots: number;
  readonly ring: GPUBuffer;
  look: RibbonLook = { ...DEFAULT_RIBBON_LOOK };
  /** Newest slot (−1 = empty) and how many slots hold points. */
  head = -1;
  valid = 0;
  private readonly colors: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly pushParams: GPUBuffer;
  private readonly origins: GPUBuffer;
  private readonly maxRows: number;
  private readonly bind: GPUBindGroup;
  private pushBind: GPUBindGroup | null = null;
  private pushSrc: GPUBuffer | null = null;

  private constructor(
    private readonly device: GPUDevice,
    view: View3D,
    private readonly pipeline: GPURenderPipeline,
    private readonly pushPipe: GPUComputePipeline,
    o: RibbonsOptions,
  ) {
    this.strands = o.strands;
    this.slots = Math.max(2, o.slots);
    this.maxRows = o.maxRows ?? 64;
    const label = o.label ?? "ribbons";
    this.ring = device.createBuffer({
      size: this.strands * this.slots * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      label: `${label}-ring`,
    });
    this.colors = device.createBuffer({ size: Math.max(16, this.strands * 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: `${label}-colors` });
    this.params = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-params` });
    this.pushParams = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-push` });
    this.origins = device.createBuffer({ size: this.maxRows * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: `${label}-origins` });
    this.bind = device.createBindGroup({
      label,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: view.buffer } },
        { binding: 1, resource: { buffer: this.params } },
        { binding: 2, resource: { buffer: this.ring } },
        { binding: 3, resource: { buffer: this.colors } },
      ],
    });
    const white = new Float32Array(this.strands * 4).fill(1);
    device.queue.writeBuffer(this.colors, 0, white);
  }

  static async create(device: GPUDevice, view: View3D, o: RibbonsOptions): Promise<Ribbons> {
    const label = o.label ?? "ribbons";
    const module = device.createShaderModule({ code: wgsl(ribbonsSrc), label });
    const pushModule = device.createShaderModule({ code: pushSrc, label: `${label}-push` });
    const [pipeline, pushPipe] = await Promise.all([
      device.createRenderPipelineAsync({
        label,
        layout: "auto",
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs", targets: [{ format: o.format ?? SCENE_FORMAT, blend: ADDITIVE }] },
        primitive: { topology: "triangle-list" },
        depthStencil: o.depthFormat ? { format: o.depthFormat, depthWriteEnabled: false, depthCompare: "less-equal" } : undefined,
      }),
      device.createComputePipelineAsync({ label: `${label}-push`, layout: "auto", compute: { module: pushModule, entryPoint: "push" } }),
    ]);
    return new Ribbons(device, view, pipeline, pushPipe, o);
  }

  /** Per-strand colour: linear RGB and an intensity, 4 floats per strand. */
  setColors(rgbi: Float32Array): void {
    this.device.queue.writeBuffer(this.colors, 0, rgbi.subarray(0, this.strands * 4));
  }

  clear(): void {
    this.head = -1;
    this.valid = 0;
  }

  /**
   * Push rows of points from the CPU: `points` holds rows × strands × 4
   * floats (xyz, w unused), oldest row first.
   */
  pushCpu(points: Float32Array): void {
    const row = this.strands * 4;
    const rows = Math.floor(points.length / row);
    // only the newest `slots` rows can survive
    const skip = Math.max(0, rows - this.slots);
    let r = skip;
    while (r < rows) {
      const slot = (this.head + 1 + (r - skip)) % this.slots;
      const run = Math.min(rows - r, this.slots - slot);
      this.device.queue.writeBuffer(this.ring, slot * row * 4, points, r * row, run * row);
      r += run;
    }
    this.advance(rows - skip);
  }

  /**
   * Push `rows` rows from a GPU buffer of vec4 points: row k reads
   * `strands` points at src[offset + k·stride …], adding `origins[k]`.
   * One GPU push per command encoder (the origins are a queue write).
   */
  pushGpu(enc: GPUCommandEncoder, src: GPUBuffer, o: { rows: number; offset?: number; stride?: number; origins: readonly Vec3[] }): void {
    const rows = Math.min(o.rows, this.maxRows, this.slots);
    if (rows <= 0) return;
    if (this.pushSrc !== src || !this.pushBind) {
      this.pushSrc = src;
      this.pushBind = this.device.createBindGroup({
        layout: this.pushPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.pushParams } },
          { binding: 1, resource: { buffer: src } },
          { binding: 2, resource: { buffer: this.origins } },
          { binding: 3, resource: { buffer: this.ring } },
        ],
      });
    }
    const org = new Float32Array(rows * 4);
    for (let k = 0; k < rows; k += 1) org.set(o.origins[k] ?? o.origins[o.origins.length - 1] ?? [0, 0, 0], k * 4);
    this.device.queue.writeBuffer(this.origins, 0, org);
    const first = (this.head + 1) % this.slots;
    this.device.queue.writeBuffer(
      this.pushParams,
      0,
      new Uint32Array([this.strands, this.slots, first, rows, this.strands, o.offset ?? 0, o.stride ?? this.strands, 0]),
    );
    const pass = enc.beginComputePass({ label: "ribbons-push" });
    pass.setPipeline(this.pushPipe);
    pass.setBindGroup(0, this.pushBind);
    pass.dispatchWorkgroups(Math.ceil(this.strands / 64), rows);
    pass.end();
    this.advance(rows);
  }

  private advance(rows: number): void {
    if (rows <= 0) return;
    this.head = (this.head + rows) % this.slots;
    this.valid = Math.min(this.slots, this.valid + rows);
  }

  /** Draw every strand into a pass on the scene target (one draw per frame). */
  draw(pass: GPURenderPassEncoder): void {
    if (this.valid < 2) return;
    const l = this.look;
    const buf = new ArrayBuffer(48);
    new Uint32Array(buf, 0, 4).set([this.strands, this.slots, this.head, this.valid]);
    new Float32Array(buf, 16, 8).set([l.width, l.fade, l.depthNear, l.depthFar, l.energy, l.depthMin, 0, 0]);
    this.device.queue.writeBuffer(this.params, 0, buf);
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bind);
    pass.draw(6, this.strands * (this.slots - 1));
  }

  destroy(): void {
    for (const b of [this.ring, this.colors, this.params, this.pushParams, this.origins]) b.destroy();
  }
}
