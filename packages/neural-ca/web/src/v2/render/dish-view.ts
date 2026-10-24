// Grow renderer: state → (prep) look + tint textures → the dish pass into the
// HDR scene target. Two look textures hold the previous and the current step,
// so a dish stepping slower than the display blends between them; a third
// holds a save point's state for the A/B compare.

import type { GpuProfiler } from "@bp/gpu";
import { wgsl } from "@bp/gpu";
import type { Camera2D } from "@bp/render";
import { SCENE_FORMAT, createBlueNoiseTexture, toLinear } from "@bp/render";
import type { HiddenBasis } from "../model/pca.js";
import prepSrc from "./dish-prep.wgsl?raw";
import dishSrc from "./dish.wgsl?raw";

export type ViewMode = "specimen" | "hidden" | "cells";
const MODE: Record<ViewMode, number> = { specimen: 0, hidden: 1, cells: 2 };

export interface DishLook {
  agar: string;
  bench: string;
  rim: string;
  grain: number;
  vignette: number;
  /** Rim width, cells. */
  rimWidth: number;
  /** Hidden-channel tint mixed into the organism (spec: 15 %). */
  tint: number;
  membrane: number;
  shadow: number;
  relief: number;
  gloss: number;
  light: readonly [number, number, number];
}

export const DEFAULT_LOOK: DishLook = {
  agar: "#0d1c1c",
  bench: "#040808",
  rim: "#9fd6d0",
  grain: 0.22,
  vignette: 0.55,
  rimWidth: 0.55,
  tint: 0.15,
  membrane: 0.4,
  shadow: 0.55,
  relief: 2.4,
  gloss: 0.22,
  light: [-0.45, -0.6, 0.66],
};

export interface DishSource {
  buffer: GPUBuffer;
  grid: number;
  /** Bumps whenever the state changes. */
  version: number;
}

export interface DishFrame {
  /** Where the grid's (0, 0) corner sits in the camera's domain, cells. */
  origin: [number, number];
  /** Dish radius, cells. */
  radius: number;
  /** prev → cur blend (1 = the current step). */
  blend: number;
  /** Organism fade (scene director). */
  fade: number;
  time: number;
}

const PREP_BYTES = 224;
const VIEW_BYTES = 144;

export class DishView {
  look: DishLook;
  mode: ViewMode = "specimen";
  /** Compare split in target-uv x (null = off). */
  split: number | null = null;

  private readonly device: GPUDevice;
  private readonly prepPipe: GPUComputePipeline;
  private readonly viewPipe: GPURenderPipeline;
  private readonly prepUniform: GPUBuffer;
  private readonly prepCmpUniform: GPUBuffer;
  private readonly viewUniform: GPUBuffer;
  private readonly sampler: GPUSampler;
  private readonly grain: GPUTexture;
  private grid = 0;
  private looks: GPUTexture[] = [];
  private tint: GPUTexture | null = null;
  private cmpLook: GPUTexture | null = null;
  private cmpTint: GPUTexture | null = null;
  private cur = 0;
  private prev = 0;
  private preparedVersion = -1;
  private preparedBuffer: GPUBuffer | null = null;
  private snapNext = true;
  private cmpKey = "";
  private readonly prepBGs = new Map<string, GPUBindGroup>();
  private readonly viewBGs = new Map<string, GPUBindGroup>();
  private basisDirty = true;
  private basis: HiddenBasis | null = null;
  private readonly bufIds = new WeakMap<GPUBuffer, number>();
  private nextBufId = 1;

  constructor(device: GPUDevice, look: DishLook) {
    this.device = device;
    this.look = look;
    this.prepPipe = device.createComputePipeline({
      label: "grow-prep",
      layout: "auto",
      compute: { module: device.createShaderModule({ code: prepSrc, label: "grow-prep" }), entryPoint: "main" },
    });
    const viewModule = device.createShaderModule({ code: wgsl(dishSrc), label: "grow-dish" });
    this.viewPipe = device.createRenderPipeline({
      label: "grow-dish",
      layout: "auto",
      vertex: { module: viewModule, entryPoint: "vs" },
      fragment: { module: viewModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT }] },
      primitive: { topology: "triangle-list" },
    });
    const U = GPUBufferUsage;
    this.prepUniform = device.createBuffer({ size: PREP_BYTES, usage: U.UNIFORM | U.COPY_DST, label: "grow-prep" });
    this.prepCmpUniform = device.createBuffer({ size: PREP_BYTES, usage: U.UNIFORM | U.COPY_DST, label: "grow-prep-cmp" });
    this.viewUniform = device.createBuffer({ size: VIEW_BYTES, usage: U.UNIFORM | U.COPY_DST, label: "grow-dish" });
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", label: "grow-clamp" });
    this.grain = createBlueNoiseTexture(device);
  }

  private bufId(b: GPUBuffer): number {
    let id = this.bufIds.get(b);
    if (id === undefined) {
      id = this.nextBufId++;
      this.bufIds.set(b, id);
    }
    return id;
  }

  private ensure(grid: number): void {
    if (grid === this.grid) return;
    for (const t of [...this.looks, this.tint, this.cmpLook, this.cmpTint]) t?.destroy();
    const tex = (label: string): GPUTexture =>
      this.device.createTexture({
        size: [grid, grid],
        format: "rgba16float",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        label,
      });
    this.looks = [tex("grow-look-0"), tex("grow-look-1")];
    this.tint = tex("grow-tint");
    this.cmpLook = tex("grow-look-cmp");
    this.cmpTint = tex("grow-tint-cmp");
    this.grid = grid;
    this.prepBGs.clear();
    this.viewBGs.clear();
    this.preparedVersion = -1;
    this.cmpKey = "";
    this.basisDirty = true;
    this.snapNext = true;
  }

  /** The hidden-channel basis for the tint (null: no tint yet). */
  setBasis(b: HiddenBasis | null): void {
    this.basis = b;
    this.basisDirty = true;
    this.preparedVersion = -1;
  }

  /** The next prepared state replaces both blend ends (an edit, a restore, a new scene). */
  snap(): void {
    this.snapNext = true;
  }

  /** Forget cached bind groups on buffers that are about to be destroyed. */
  forgetBuffers(): void {
    this.prepBGs.clear();
    this.preparedVersion = -1;
    this.preparedBuffer = null;
    this.cmpKey = "";
    this.snapNext = true;
  }

  private writePrep(buf: GPUBuffer): void {
    const ab = new ArrayBuffer(PREP_BYTES);
    const u = new Uint32Array(ab, 0, 4);
    u[0] = this.grid;
    u[1] = this.basis ? 1 : 0;
    const f = new Float32Array(ab);
    if (this.basis) {
      f.set(this.basis.mean, 4);
      f.set(this.basis.axes, 16);
      f.set(this.basis.scale, 52);
    }
    this.device.queue.writeBuffer(buf, 0, ab);
  }

  private prepBG(src: GPUBuffer, look: GPUTexture, tint: GPUTexture, uniform: GPUBuffer, key: string): GPUBindGroup {
    let bg = this.prepBGs.get(key);
    if (!bg) {
      bg = this.device.createBindGroup({
        layout: this.prepPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniform } },
          { binding: 1, resource: { buffer: src } },
          { binding: 2, resource: look.createView() },
          { binding: 3, resource: tint.createView() },
        ],
        label: `grow-prep-${key}`,
      });
      this.prepBGs.set(key, bg);
    }
    return bg;
  }

  private viewBG(): GPUBindGroup {
    const key = `${this.prev}-${this.cur}`;
    let bg = this.viewBGs.get(key);
    if (!bg) {
      bg = this.device.createBindGroup({
        layout: this.viewPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.viewUniform } },
          { binding: 1, resource: this.looks[this.cur]!.createView() },
          { binding: 2, resource: this.looks[this.prev]!.createView() },
          { binding: 3, resource: this.tint!.createView() },
          { binding: 4, resource: this.cmpLook!.createView() },
          { binding: 5, resource: this.sampler },
          { binding: 6, resource: this.grain.createView() },
        ],
        label: `grow-dish-${key}`,
      });
      this.viewBGs.set(key, bg);
    }
    return bg;
  }

  private writeView(camera: Camera2D, w: number, h: number, pixelScale: number, f: DishFrame, hasCmp: boolean): void {
    const L = this.look;
    const cam = camera.uniform(pixelScale);
    const agar = toLinear(L.agar);
    const bench = toLinear(L.bench);
    const rim = toLinear(L.rim);
    const ln = Math.hypot(L.light[0], L.light[1], L.light[2]) || 1;
    const v = new Float32Array(VIEW_BYTES / 4);
    v.set([cam.cx, cam.cy, cam.unitsPerPx, f.time], 0);
    v.set([w, h, this.grid, f.blend], 4);
    v.set([f.origin[0], f.origin[1], f.radius, MODE[this.mode]], 8);
    v.set([L.tint * (this.basis ? 1 : 0), L.membrane, L.shadow, L.relief], 12);
    v.set([...agar, L.grain], 16);
    v.set([...bench, L.vignette], 20);
    v.set([...rim, L.rimWidth], 24);
    v.set([L.light[0] / ln, L.light[1] / ln, L.light[2] / ln, this.split === null || !hasCmp ? -1 : this.split], 28);
    v.set([f.fade, 1 / Math.max(cam.unitsPerPx, 1e-6), L.gloss, hasCmp ? 1 : 0], 32);
    this.device.queue.writeBuffer(this.viewUniform, 0, v);
  }

  /** Record prep (when the state changed) and the dish pass into `target`. */
  encode(
    enc: GPUCommandEncoder,
    target: GPUTextureView,
    w: number,
    h: number,
    camera: Camera2D,
    pixelScale: number,
    src: DishSource,
    frame: DishFrame,
    compare: { buffer: GPUBuffer; key: string } | null,
    profiler?: GpuProfiler,
  ): void {
    this.ensure(src.grid);
    const wg = Math.ceil(this.grid / 8);
    const changed = src.version !== this.preparedVersion || src.buffer !== this.preparedBuffer || this.basisDirty;
    const cmpChanged = compare !== null && (compare.key !== this.cmpKey || this.basisDirty);
    if (changed || cmpChanged) {
      if (this.basisDirty) {
        this.writePrep(this.prepUniform);
        this.writePrep(this.prepCmpUniform);
      }
      const pass = enc.beginComputePass({ label: "grow-prep", timestampWrites: profiler?.pass("prep") });
      pass.setPipeline(this.prepPipe);
      if (changed) {
        if (this.snapNext || this.basisDirty) {
          this.prev = this.cur;
        } else if (src.version !== this.preparedVersion) {
          this.prev = this.cur;
          this.cur = this.cur ^ 1;
        }
        // a pure basis change re-preps the current step in place
        const id = this.bufId(src.buffer);
        pass.setBindGroup(0, this.prepBG(src.buffer, this.looks[this.cur]!, this.tint!, this.prepUniform, `${id}-${this.cur}`));
        pass.dispatchWorkgroups(wg, wg);
        if (this.snapNext) this.prev = this.cur;
        this.snapNext = false;
        this.preparedVersion = src.version;
        this.preparedBuffer = src.buffer;
      }
      if (compare && cmpChanged) {
        const id = this.bufId(compare.buffer);
        pass.setBindGroup(0, this.prepBG(compare.buffer, this.cmpLook!, this.cmpTint!, this.prepCmpUniform, `cmp-${id}`));
        pass.dispatchWorkgroups(wg, wg);
        this.cmpKey = compare.key;
      }
      pass.end();
      this.basisDirty = false;
    }
    this.writeView(camera, w, h, pixelScale, frame, compare !== null);
    const rp = enc.beginRenderPass({
      label: "grow-dish",
      colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: profiler?.pass("dish"),
    });
    rp.setPipeline(this.viewPipe);
    rp.setBindGroup(0, this.viewBG());
    rp.draw(3);
    rp.end();
  }

  destroy(): void {
    for (const t of [...this.looks, this.tint, this.cmpLook, this.cmpTint, this.grain]) t?.destroy();
    for (const b of [this.prepUniform, this.prepCmpUniform, this.viewUniform]) b.destroy();
  }
}
