// FieldView2D (00-foundation.md § 3.4): the shared renderer for 2D fields.
//
// A prep compute pass turns a scalar simulation buffer into a filtered
// rgba16float texture (value, second value, gradient); a full-screen pass
// then draws it into the HDR scene target through a Camera2D as a lit
// material, a colormap with isolines, or raw texels. The simulation buffer
// is only ever bound read-only here.

import type { GpuProfiler } from "@bp/gpu";
import { wgsl } from "@bp/gpu";
import "./register.js";
import type { Camera2D } from "./camera2d.js";
import type { ColormapName } from "./colormaps.js";
import { ColormapLibrary, srgbToLinear } from "./colormaps.js";
import { SCENE_FORMAT, createBlueNoiseTexture } from "./hdr.js";
import prepSrc from "./wgsl/field-prep.wgsl?raw";
import viewSrc from "./wgsl/field-view.wgsl?raw";

export type FieldMode = "material" | "colormap" | "colormap-secondary" | "raw";
export type FieldSampling = "bicubic" | "bilinear";

/** sRGB hex (#rrggbb) or linear triple. */
export type Color = string | readonly [number, number, number];

export interface FieldLook {
  background: Color;
  ink: Color;
  /** Specular tint. */
  accent: Color;
  /** Thin translucent rim tint. */
  rim: Color;
  rimAmount: number;
  gloss: number;
  shininess: number;
  /** Height-from-field relief strength (0 = flat). */
  relief: number;
  /** Paper grain amount on the background. */
  grain: number;
  /** Light direction (normalised internally); z is towards the viewer. */
  light: readonly [number, number, number];
  /** Primary value → ink coverage ramp. */
  coverage: readonly [number, number];
}

export interface FieldViewState {
  mode: FieldMode;
  sampling: FieldSampling;
  colormap: ColormapName;
  /** Colormap range for the shown channel. */
  range: readonly [number, number];
  /** Isoline count across `range`; 0 = off. */
  isolines: number;
  /** Overlay tint strength (0–1). */
  overlay: number;
  /** A/B wipe position in [0, 1]; null = off. */
  split: number | null;
}

export interface FieldSource {
  buffer: GPUBuffer;
  width: number;
  height: number;
  /** floats per cell */
  stride: number;
  primary: number;
  secondary: number;
  periodic: boolean;
}

export function toLinear(c: Color): [number, number, number] {
  if (typeof c !== "string") return [c[0], c[1], c[2]];
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

const MODES: Record<FieldMode, number> = { material: 0, colormap: 1, "colormap-secondary": 2, raw: 3 };

interface Slot {
  source: FieldSource;
  tex: GPUTexture;
  view: GPUTextureView;
  prepUniform: GPUBuffer;
  prepBG: GPUBindGroup;
}

export class FieldView2D {
  look: FieldLook;
  view: FieldViewState = {
    mode: "material",
    sampling: "bicubic",
    colormap: "magma",
    range: [0, 0.5],
    isolines: 0,
    overlay: 0.6,
    split: null,
  };

  private readonly device: GPUDevice;
  private readonly prepPipeline: GPUComputePipeline;
  private readonly viewPipeline: GPURenderPipeline;
  private readonly uniform: GPUBuffer;
  private readonly wrap: GPUSampler;
  private readonly clamp: GPUSampler;
  private readonly grain: GPUTexture;
  private readonly luts: ColormapLibrary;
  private readonly dummy: GPUTexture;
  private main: Slot | null = null;
  private compare: Slot | null = null;
  private overlayView: GPUTextureView | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private dirty = true;
  private lutName: ColormapName | null = null;

  constructor(device: GPUDevice, look: FieldLook) {
    this.device = device;
    this.look = look;
    const prepModule = device.createShaderModule({ code: wgsl(prepSrc), label: "field-prep" });
    this.prepPipeline = device.createComputePipeline({
      label: "field-prep",
      layout: "auto",
      compute: { module: prepModule, entryPoint: "main" },
    });
    const viewModule = device.createShaderModule({ code: wgsl(viewSrc), label: "field-view" });
    this.viewPipeline = device.createRenderPipeline({
      label: "field-view",
      layout: "auto",
      vertex: { module: viewModule, entryPoint: "vs" },
      fragment: { module: viewModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT }] },
      primitive: { topology: "triangle-list" },
    });
    this.uniform = device.createBuffer({
      size: 160,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "field-view",
    });
    this.wrap = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
      label: "field-wrap",
    });
    this.clamp = device.createSampler({ magFilter: "linear", minFilter: "linear", label: "field-clamp" });
    this.grain = createBlueNoiseTexture(device);
    this.luts = new ColormapLibrary(device);
    this.dummy = device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      label: "field-overlay-none",
    });
    device.queue.writeTexture({ texture: this.dummy }, new Uint8Array([0, 0, 0, 0]), { bytesPerRow: 4 }, [1, 1]);
  }

  private makeSlot(source: FieldSource, label: string): Slot {
    const tex = this.device.createTexture({
      size: [source.width, source.height],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
      label,
    });
    const prepUniform = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: `${label}-prep`,
    });
    this.device.queue.writeBuffer(
      prepUniform,
      0,
      new Uint32Array([
        source.width,
        source.height,
        source.stride,
        source.primary,
        source.secondary,
        source.periodic ? 1 : 0,
        0,
        0,
      ]),
    );
    const view = tex.createView();
    const prepBG = this.device.createBindGroup({
      layout: this.prepPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: prepUniform } },
        { binding: 1, resource: { buffer: source.buffer } },
        { binding: 2, resource: view },
      ],
      label: `${label}-prep`,
    });
    return { source, tex, view, prepUniform, prepBG };
  }

  private dropSlot(s: Slot | null): void {
    s?.tex.destroy();
    s?.prepUniform.destroy();
  }

  private sameSource(a: FieldSource, b: FieldSource): boolean {
    return (
      a.buffer === b.buffer &&
      a.width === b.width &&
      a.height === b.height &&
      a.stride === b.stride &&
      a.primary === b.primary &&
      a.secondary === b.secondary &&
      a.periodic === b.periodic
    );
  }

  /** Point the view at a simulation buffer (cheap when unchanged). */
  setSource(source: FieldSource): void {
    if (this.main && this.sameSource(this.main.source, source)) return;
    this.dropSlot(this.main);
    this.main = this.makeSlot(source, "field-a");
    this.dirty = true;
  }

  /** A second buffer of the same shape for the A/B wipe; null clears it. */
  setCompare(source: FieldSource | null): void {
    if (source === null) {
      if (this.compare) {
        this.dropSlot(this.compare);
        this.compare = null;
        this.dirty = true;
      }
      return;
    }
    if (this.compare && this.sameSource(this.compare.source, source)) return;
    this.dropSlot(this.compare);
    this.compare = this.makeSlot(source, "field-b");
    this.dirty = true;
  }

  /** An rgba overlay texture in domain uv (alpha = weight); null clears it. */
  setOverlay(view: GPUTextureView | null): void {
    if (view === this.overlayView) return;
    this.overlayView = view;
    this.dirty = true;
  }

  private rebuild(): void {
    if (!this.main) return;
    this.lutName = this.view.colormap;
    this.bindGroup = this.device.createBindGroup({
      layout: this.viewPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: this.main.view },
        { binding: 2, resource: (this.compare ?? this.main).view },
        { binding: 3, resource: this.overlayView ?? this.dummy.createView() },
        { binding: 4, resource: this.wrap },
        { binding: 5, resource: this.clamp },
        { binding: 6, resource: this.luts.view(this.view.colormap) },
        { binding: 7, resource: this.grain.createView() },
      ],
      label: "field-view",
    });
    this.dirty = false;
  }

  private writeUniform(camera: Camera2D, targetW: number, targetH: number, pixelScale: number): void {
    const L = this.look;
    const v = this.view;
    const cam = camera.uniform(pixelScale);
    const bg = toLinear(L.background);
    const ink = toLinear(L.ink);
    const acc = toLinear(L.accent);
    const rim = toLinear(L.rim);
    const ln = Math.hypot(L.light[0], L.light[1], L.light[2]) || 1;
    const src = this.main!.source;
    const f = new Float32Array(40);
    f.set([cam.cx, cam.cy, cam.unitsPerPx, src.periodic ? 1 : 0], 0);
    f.set([targetW, targetH, src.width, src.height], 4);
    f.set([...bg, L.grain], 8);
    f.set([...ink, L.gloss], 12);
    f.set([...acc, L.shininess], 16);
    f.set([...rim, L.rimAmount], 20);
    f.set([L.light[0] / ln, L.light[1] / ln, L.light[2] / ln, L.relief], 24);
    f.set([MODES[v.mode], v.sampling === "bilinear" ? 1 : 0, v.isolines, this.overlayView ? v.overlay : 0], 28);
    f.set([L.coverage[0], L.coverage[1], v.range[0], v.range[1]], 32);
    f.set([v.split === null || !this.compare ? -1 : v.split, 0.9, 0, 0], 36);
    this.device.queue.writeBuffer(this.uniform, 0, f);
  }

  /** Record prep + draw into `target` (the HDR scene view). */
  encode(
    enc: GPUCommandEncoder,
    target: GPUTextureView,
    targetW: number,
    targetH: number,
    camera: Camera2D,
    pixelScale: number,
    profiler?: GpuProfiler,
  ): void {
    if (!this.main) return;
    if (this.dirty || this.lutName !== this.view.colormap) this.rebuild();
    this.writeUniform(camera, targetW, targetH, pixelScale);
    const prep = enc.beginComputePass({ label: "field-prep", timestampWrites: profiler?.pass("field-prep") });
    prep.setPipeline(this.prepPipeline);
    for (const s of [this.main, this.compare]) {
      if (!s) continue;
      prep.setBindGroup(0, s.prepBG);
      prep.dispatchWorkgroups(Math.ceil(s.source.width / 8), Math.ceil(s.source.height / 8));
    }
    prep.end();
    const rp = enc.beginRenderPass({
      label: "field-view",
      colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: profiler?.pass("field-view"),
    });
    rp.setPipeline(this.viewPipeline);
    rp.setBindGroup(0, this.bindGroup!);
    rp.draw(3);
    rp.end();
  }

  destroy(): void {
    this.dropSlot(this.main);
    this.dropSlot(this.compare);
    this.uniform.destroy();
    this.grain.destroy();
    this.luts.destroy();
    this.dummy.destroy();
  }
}
