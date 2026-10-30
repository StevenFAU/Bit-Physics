// Swarm M2 renderer (./sea.wgsl): the current's sheen and motes, the
// plankton glow and the hunting sharks. OceanView calls `under` after the
// water and `over` after the fish, inside its own render pass.

import { wgsl } from "@bp/gpu";
import type { Camera2D } from "@bp/render";
import { SCENE_FORMAT } from "@bp/render";
import seaSrc from "./sea.wgsl?raw";

export interface SeaLook {
  /** Current: sheen gain, the speed that reads as full sheen (world / step), spin gain, mote light. */
  sheen: number;
  speedRef: number;
  spin: number;
  moteLight: number;
  /** Mote width (target px) and streak length (steps of travel). */
  moteWidth: number;
  moteStreak: number;
  /** Plankton glow gain. */
  glow: number;
  /** Shark body length, world units. */
  sharkLength: number;
}

export const DEFAULT_SEA: SeaLook = {
  sheen: 1,
  speedRef: 0.006,
  spin: 0.6,
  moteLight: 0.16,
  moteWidth: 1.1,
  moteStreak: 14,
  glow: 1,
  sharkLength: 0.3,
};

/** What the sea draws this frame (any part may be absent). */
export interface SeaSource {
  halfW: number;
  halfH: number;
  /** Current: the fluid's nodes and buffers. */
  fluid?: { gw: number; gh: number; hx: number; hy: number; psi: GPUBuffer; omega: GPUBuffer; state: GPUBuffer; motes: GPUBuffer; nMotes: number };
  /** Food Chain: the plankton cells, their carrying capacity, the sharks. */
  life?: { cols: number; rows: number; cellX: number; cellY: number; plankton: GPUBuffer; K: number; sharks: GPUBuffer; sharkSlots: number };
}

export class SeaView {
  look: SeaLook = { ...DEFAULT_SEA };
  private readonly device: GPUDevice;
  private readonly uni: GPUBuffer;
  private readonly uniBG: GPUBindGroup;
  private readonly dataLayout: GPUBindGroupLayout;
  private readonly dummy: GPUBuffer;
  private readonly currentPipe: GPURenderPipeline;
  private readonly motesPipe: GPURenderPipeline;
  private readonly planktonPipe: GPURenderPipeline;
  private readonly sharksPipe: GPURenderPipeline;
  private bg: { bufs: GPUBuffer[]; bg: GPUBindGroup } | null = null;
  private src: SeaSource | null = null;
  private images: [number, number] = [1, 1];
  private readonly t0 = performance.now();

  constructor(device: GPUDevice) {
    this.device = device;
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    const uniLayout = device.createBindGroupLayout({ label: "sea-view", entries: [{ binding: 0, visibility: VF, buffer: { type: "uniform" } }] });
    this.dataLayout = device.createBindGroupLayout({
      label: "sea-data",
      entries: [0, 1, 2, 3, 4, 5].map((binding) => ({ binding, visibility: VF, buffer: { type: "read-only-storage" as const } })),
    });
    this.uni = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "sea-view" });
    this.uniBG = device.createBindGroup({ layout: uniLayout, entries: [{ binding: 0, resource: { buffer: this.uni } }] });
    this.dummy = device.createBuffer({ size: 64, usage: GPUBufferUsage.STORAGE, label: "sea-dummy" });
    const module = device.createShaderModule({ code: wgsl(seaSrc), label: "sea" });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [uniLayout, this.dataLayout] });
    const additive: GPUColorTargetState = {
      format: SCENE_FORMAT,
      blend: { color: { srcFactor: "one", dstFactor: "one", operation: "add" }, alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" } },
    };
    const over: GPUColorTargetState = {
      format: SCENE_FORMAT,
      blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" } },
    };
    const pipe = (label: string, vs: string, fs: string, target: GPUColorTargetState): GPURenderPipeline =>
      device.createRenderPipeline({
        label: `sea-${label}`,
        layout,
        vertex: { module, entryPoint: vs },
        fragment: { module, entryPoint: fs, targets: [target] },
        primitive: { topology: "triangle-list" },
      });
    this.currentPipe = pipe("current", "sea_vs", "current_fs", additive);
    this.motesPipe = pipe("motes", "motes_vs", "motes_fs", additive);
    this.planktonPipe = pipe("plankton", "sea_vs", "plankton_fs", additive);
    this.sharksPipe = pipe("sharks", "sharks_vs", "sharks_fs", over);
  }

  /** Write this frame's uniform (call before OceanView.encode). */
  prepare(src: SeaSource | null, camera: Camera2D, pixelScale: number, targetW: number, targetH: number): void {
    this.src = src;
    if (!src) return;
    const cam = camera.uniform(pixelScale);
    const W = src.halfW * 2;
    const H = src.halfH * 2;
    const images = (view: number, dom: number): number => Math.min(5, 2 * Math.max(0, Math.ceil(view / (2 * dom) + 0.5) - 1) + 1);
    this.images = [images(targetW * cam.unitsPerPx, W), images(targetH * cam.unitsPerPx, H)];
    const L = this.look;
    const f = new Float32Array(32);
    f.set([cam.cx, cam.cy, cam.unitsPerPx, (performance.now() - this.t0) / 1000], 0);
    f.set([targetW, targetH, W, H], 4);
    f.set([src.halfW, src.halfH, this.images[0], this.images[1]], 8);
    if (src.fluid) f.set([src.fluid.gw, src.fluid.gh, src.fluid.hx, src.fluid.hy], 12);
    else if (src.life) f.set([src.life.cols, src.life.rows, src.life.cellX, src.life.cellY], 12);
    f.set([L.sheen, L.speedRef, L.spin, L.moteLight], 16);
    f.set([L.moteWidth * pixelScale, L.moteStreak, 0, 0], 20);
    f.set([L.glow, src.life ? src.life.K : 1, 0, 0], 24);
    f.set([L.sharkLength, src.life ? src.life.sharkSlots : 0, 0, 0], 28);
    this.device.queue.writeBuffer(this.uni, 0, f);
    const d = this.dummy;
    const bufs = [src.fluid?.psi ?? d, src.fluid?.omega ?? d, src.fluid?.state ?? d, src.fluid?.motes ?? d, src.life?.plankton ?? d, src.life?.sharks ?? d];
    if (!this.bg || this.bg.bufs.some((b, i) => b !== bufs[i])) {
      this.bg = { bufs, bg: this.device.createBindGroup({ layout: this.dataLayout, entries: bufs.map((b, i) => ({ binding: i, resource: { buffer: b } })) }) };
    }
  }

  /** Drawn after the water, under the fish. */
  under(rp: GPURenderPassEncoder): void {
    const s = this.src;
    if (!s || !this.bg) return;
    rp.setBindGroup(0, this.uniBG);
    rp.setBindGroup(1, this.bg.bg);
    if (s.fluid) {
      rp.setPipeline(this.currentPipe);
      rp.draw(3);
      if (s.fluid.nMotes > 0) {
        rp.setPipeline(this.motesPipe);
        rp.draw(6, s.fluid.nMotes * this.images[0] * this.images[1]);
      }
    }
    if (s.life) {
      rp.setPipeline(this.planktonPipe);
      rp.draw(3);
    }
  }

  /** Drawn after the fish. */
  over(rp: GPURenderPassEncoder): void {
    const s = this.src;
    if (!s?.life || !this.bg) return;
    rp.setBindGroup(0, this.uniBG);
    rp.setBindGroup(1, this.bg.bg);
    rp.setPipeline(this.sharksPipe);
    rp.draw(6, s.life.sharkSlots * this.images[0] * this.images[1]);
  }

  destroy(): void {
    this.uni.destroy();
    this.dummy.destroy();
  }
}
