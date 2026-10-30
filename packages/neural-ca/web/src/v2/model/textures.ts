// Textures (M3): texture NCAs (Niklasson et al. 2021) on a periodic plane.
// The list, each texture's training provenance and its measurements come from
// public/textures/textures.json, written by packages/neural-ca/textures/build.py
// from the training runs; every weights file is SHA-256 checked against it.
//
// The plane is a LiveNca on its own kernel (texture.wgsl): the same 16-float
// cell, so Cut, Graft, Freeze, save points, undo and the dish renderer's
// state → look prep all work on it unchanged. It is not the gated kernel and
// nothing about it is gated; only the Prove drawer's checks name it.

import { sha256hex } from "@bp/verify";
import type { Checkpoint } from "../proof/gate.js";
import { assetUrl } from "../proof/gate.js";
import type { LiveConfig } from "./live.js";
import { LiveKernels, LiveNca } from "./live.js";
import { textureKernelSource } from "./live-kernel.js";
import textureSrc from "./texture.wgsl?raw";

export interface TextureMeasured {
  /** Style loss (the training loss without the overflow term) of a 64 × 64 crop grown from zeros, by step. */
  style_by_step: Record<string, number>;
  /** Mean / std of RGB over a 128 × 128 plane grown from zeros, by step (the page checks its own against these). */
  rgb_mean: Record<string, [number, number, number]>;
  rgb_std: Record<string, [number, number, number]>;
  /** Erase a disc of radius 16 at step 512, measure the style loss of the 32 × 32 window over it. */
  regrow: { erase_at: number; radius: number; before: number; after: Record<string, number> };
  max_abs_state_4096: number;
}

export interface TextureDef {
  id: string;
  name: string;
  blurb: string;
  weights: string;
  sha256: string;
  target: string;
  how: string;
  training: {
    trainer: string;
    loss: string;
    iterations: number;
    seed: number;
    grid: number;
    batch: number;
    pool: number;
    rollout: [number, number];
    lr: string;
    wall_s: number;
    final_style_loss: number;
    curve: [number, number, number][];
    environment: Record<string, string | number>;
  };
  measured: TextureMeasured;
}

export interface TextureManifest {
  layout: { channels: number; hidden: number; count: number; b1Off: number; w1Off: number; w2Off: number };
  textures: TextureDef[];
}

export interface Texture {
  def: TextureDef;
  ck: Checkpoint;
}

export async function fetchTextures(): Promise<TextureManifest> {
  const r = await fetch(assetUrl("textures/textures.json"));
  if (!r.ok) throw new Error(`textures fetch failed: ${r.status}`);
  return (await r.json()) as TextureManifest;
}

export class TextureLibrary {
  private readonly cache = new Map<string, Promise<Texture>>();
  constructor(readonly manifest: TextureManifest) {}

  get defs(): readonly TextureDef[] {
    return this.manifest.textures;
  }

  def(id: string): TextureDef | undefined {
    return this.defs.find((d) => d.id === id);
  }

  get(id: string): Promise<Texture> {
    const def = this.def(id) ?? this.defs[0]!;
    let p = this.cache.get(def.id);
    if (!p) {
      p = (async () => {
        const r = await fetch(assetUrl(def.weights));
        if (!r.ok) throw new Error(`texture ${def.id} fetch failed: ${r.status}`);
        const buf = await r.arrayBuffer();
        const sha = await sha256hex(new Uint8Array(buf));
        if (sha !== def.sha256) throw new Error(`texture ${def.id}: weights SHA-256 ${sha.slice(0, 12)}… is not the manifest's`);
        const L = this.manifest.layout;
        const weights = new Float32Array(buf);
        if (weights.length !== L.count) throw new Error(`texture ${def.id}: ${weights.length} numbers, expected ${L.count}`);
        return { def, ck: { weights, b1Off: L.b1Off, w1Off: L.w1Off, w2Off: L.w2Off, sha256: sha } };
      })();
      p.catch(() => this.cache.delete(def.id));
      this.cache.set(def.id, p);
    }
    return p;
  }
}

/** The texture kernel's pipeline (compiled after the dish is live, with Chimera's). */
export class TextureKernels {
  private constructor(
    readonly layout: GPUBindGroupLayout,
    readonly update: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<TextureKernels> {
    const C = GPUShaderStage.COMPUTE;
    const layout = device.createBindGroupLayout({
      label: "nca-texture",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 32 } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
        { binding: 3, visibility: C, buffer: { type: "read-only-storage" } },
      ],
    });
    const update = await device.createComputePipelineAsync({
      label: "nca-texture-update",
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      compute: { module: device.createShaderModule({ code: textureKernelSource(textureSrc), label: "nca-texture" }), entryPoint: "update" },
    });
    return new TextureKernels(layout, update);
  }
}

/** A periodic plane of texture cells: one pass per step (cur → nxt), then Freeze's pass when anything is frozen. */
export class TextureNca extends LiveNca {
  private readonly tex: TextureKernels;
  private readonly texBG: [GPUBindGroup, GPUBindGroup];

  constructor(device: GPUDevice, kernels: LiveKernels, tex: TextureKernels, ck: Checkpoint, cfg: LiveConfig) {
    super(device, kernels, ck, cfg);
    this.tex = tex;
    const [a, b] = this.bufs;
    const bg = (cur: GPUBuffer, nxt: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: tex.layout,
        entries: [
          { binding: 0, resource: { buffer: this.params, size: 32 } },
          { binding: 1, resource: { buffer: cur } },
          { binding: 2, resource: { buffer: nxt } },
          { binding: 3, resource: { buffer: this.weights } },
        ],
      });
    this.texBG = [bg(a, b), bg(b, a)];
  }

  override get periodic(): boolean {
    return true;
  }

  /**
   * A stroke on the plane, wherever on the repeated copies it was drawn: shifted so it starts in the
   * grid, then once per copy of the grid its brush (radius `r`) reaches, so a stroke crossing an
   * edge carries on at the opposite one.
   */
  protected override strokeImages(pts: readonly number[], r: number): (readonly number[])[] {
    const G = this.grid;
    if (pts.length < 2) return [pts];
    const ox = Math.floor(pts[0]! / G) * G;
    const oy = Math.floor(pts[1]! / G) * G;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const x = pts[i]! - ox;
      const y = pts[i + 1]! - oy;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const out: number[][] = [];
    for (let ky = Math.floor((y0 - r - 1) / G); ky <= Math.floor((y1 + r + 1) / G); ky += 1) {
      for (let kx = Math.floor((x0 - r - 1) / G); kx <= Math.floor((x1 + r + 1) / G); kx += 1) {
        out.push(pts.map((v, i) => (i % 2 === 0 ? v - ox - kx * G : v - oy - ky * G)));
      }
    }
    return out;
  }

  protected override recordSteps(pass: GPUComputePassEncoder, k: number): void {
    for (let s = 0; s < k; s += 1) {
      const off = this.writeParams(this.tick);
      pass.setPipeline(this.tex.update);
      pass.setBindGroup(0, this.texBG[this.parity]!, [off]);
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
}

/** Mean and standard deviation of the displayed RGB (channels 0..2 + 0.5, clamped to [0, 1]) over a state. */
export function rgbStats(state: Float32Array, cells: number, cn = 16): { mean: [number, number, number]; std: [number, number, number] } {
  const s = [0, 0, 0];
  const s2 = [0, 0, 0];
  for (let i = 0; i < cells; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const v = Math.min(1, Math.max(0, state[i * cn + c]! + 0.5));
      s[c] += v;
      s2[c] += v * v;
    }
  }
  const mean = s.map((v) => v / cells) as [number, number, number];
  const std = s2.map((v, c) => Math.sqrt(Math.max(0, v / cells - mean[c]! * mean[c]!))) as [number, number, number];
  return { mean, std };
}
