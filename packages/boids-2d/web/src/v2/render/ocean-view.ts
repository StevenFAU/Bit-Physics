// Swarm renderer: water (with caustics) → fish (additive, energy-normalised)
// → shark shadow + fear ring + compare divider, all into the HDR scene target.
// The fish have three levels of detail chosen by their size on screen
// (03-boids-2d.md § The look): glyphs with a tail flick, motion streaks, and
// a density / heading field splatted on the GPU (./field.wgsl) when a fish is
// smaller than a pixel. They cross-fade by that size with the same light per
// fish, so zooming never pops. The A/B compare draws the save point's flock
// left of the split and the live flock right of it (scissored; no field).

import type { GpuProfiler } from "@bp/gpu";
import { wgsl } from "@bp/gpu";
import type { Camera2D } from "@bp/render";
import { SCENE_FORMAT } from "@bp/render";
import fieldSrc from "./field.wgsl?raw";
import oceanSrc from "./ocean.wgsl?raw";
import watchSrc from "./watch.wgsl?raw";

export type FishColour = "silver" | "heading" | "species";

/** OKLab → linear sRGB (the shaders' oklab_to_linear). */
export function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    Math.max(0, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    Math.max(0, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    Math.max(0, -0.0041960863 * l - 0.7034186147 * m + 1.707612701 * s),
  ];
}

/**
 * Species colours: six hues at one OKLab lightness and chroma, so no species
 * outshines another. Species 0 is a cool silver-blue (prey, or the first
 * kind), species 1 coral (the predator in Predator and prey).
 */
export const SPECIES_HUES: readonly number[] = [235, 30, 85, 150, 295, 345];
export const SPECIES_NAMES: readonly string[] = ["blue", "coral", "gold", "green", "violet", "pink"];
export function speciesColours(): [number, number, number][] {
  return SPECIES_HUES.map((h) => oklabToLinear(0.8, 0.12 * Math.cos((h * Math.PI) / 180), 0.12 * Math.sin((h * Math.PI) / 180)));
}
/** The same colours as CSS (sRGB), for swatches in the page. */
export function speciesCss(k: number): string {
  const c = speciesColours()[k % 6]!.map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
  return `rgb(${c.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255)).join(" ")})`;
}
const PALETTE = speciesColours();

export interface OceanLook {
  /** Fish length in world units (the kernel's separation radius is 0.3 r). */
  fishLength: number;
  /** Smallest drawn fish length, CSS px (energy is kept, so it only smooths). */
  minPx: number;
  /** Fish emission. */
  gain: number;
  colour: FishColour;
  silver: [number, number, number];
  /** Tail flick amplitude (fish units). */
  flick: number;
  /** Deep water, linear rgb. */
  water: [number, number, number];
  /** Caustic strength (0 off). */
  caustic: number;
  /** Caustic cell size, world units. */
  causticCell: number;
  causticDrift: number;
  /** Fear-ring gain. */
  ring: number;
}

export const DEFAULT_LOOK: OceanLook = {
  fishLength: 0.02,
  minPx: 1.6,
  gain: 1.6,
  colour: "silver",
  silver: [0.5, 0.76, 1.0],
  flick: 0.12,
  water: [0.0016, 0.0042, 0.0085],
  caustic: 0.4,
  causticCell: 0.7,
  causticDrift: 0.05,
  ring: 0.18,
};

export interface FlockSource {
  boids: GPUBuffer;
  n: number;
  halfW: number;
  halfH: number;
}

/** The three levels of detail, from a fish's length on screen (target px). */
export interface Lod {
  /** Glyph weight (1 at ≥ 8 px, 0 at ≤ 4.5 px). */
  glyph: number;
  /** Field weight (1 at ≤ 0.9 px, 0 at ≥ 1.8 px). */
  field: number;
  /** Which level dominates, for readouts. */
  name: "glyph" | "streak" | "field";
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** LOD weights for a fish `lenPx` target pixels long (the shader uses the same edges). */
export function lodFor(lenPx: number): Lod {
  const glyph = smooth(4.5, 8, lenPx);
  const field = 1 - smooth(0.9, 1.8, lenPx);
  const name = field >= 0.5 ? "field" : glyph >= 0.5 ? "glyph" : "streak";
  return { glyph, field, name };
}

/** Neighbour threads drawn (model/watch.ts MAX_LIST). */
const WATCH_MAX_LIST = 256;

/** The View uniform (ocean.wgsl, field.wgsl, watch.wgsl): 12 vec4 and the six species colours. */
export const VIEW_BYTES = (12 + 6) * 16;

/** Far-field light per fish, × gain × len² (a soft dot of the fish's true area). */
export const FAR_LIGHT = 0.498;

export interface SharkView {
  x: number;
  y: number;
  heading: number;
  /** Body length, world. */
  length: number;
  /** Fear radius, world. */
  radius: number;
  presence: number;
  lunge: number;
}

export class OceanView {
  look: OceanLook;
  /** Compare split as a fraction of the width (null = off). */
  split: number | null = null;
  private readonly device: GPUDevice;
  private readonly viewBuf: GPUBuffer;
  private readonly viewLayout: GPUBindGroupLayout;
  private readonly boidLayout: GPUBindGroupLayout;
  private readonly viewBG: GPUBindGroup;
  private readonly waterPipe: GPURenderPipeline;
  private readonly fishPipe: GPURenderPipeline;
  private readonly overlayPipe: GPURenderPipeline;
  private readonly fieldPipe: GPURenderPipeline;
  private readonly splatPipe: GPUComputePipeline;
  private readonly watchPipe: GPURenderPipeline;
  private readonly watchLayout: GPUBindGroupLayout;
  private watchBG: { buf: GPUBuffer; retina: GPUBuffer; bg: GPUBindGroup } | null = null;
  private readonly noRetina: GPUBuffer;
  private readonly gridReadLayout: GPUBindGroupLayout;
  private readonly gridWriteLayout: GPUBindGroupLayout;
  private grid: { buf: GPUBuffer; w: number; h: number; read: GPUBindGroup; write: GPUBindGroup } | null = null;
  /** The level of detail drawn last frame. */
  lod: Lod = { glyph: 0, field: 1, name: "field" };
  private boidBGs = new Map<GPUBuffer, GPUBindGroup>();
  private readonly t0 = performance.now();

  constructor(device: GPUDevice, look: OceanLook = DEFAULT_LOOK) {
    this.device = device;
    this.look = { ...look };
    const VFC = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
    this.viewLayout = device.createBindGroupLayout({
      label: "ocean-view",
      entries: [{ binding: 0, visibility: VFC, buffer: { type: "uniform" } }],
    });
    this.boidLayout = device.createBindGroupLayout({
      label: "ocean-boids",
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }],
    });
    this.gridReadLayout = device.createBindGroupLayout({
      label: "ocean-field-read",
      entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } }],
    });
    this.gridWriteLayout = device.createBindGroupLayout({
      label: "ocean-field-write",
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }],
    });
    this.viewBuf = device.createBuffer({ size: VIEW_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "ocean-view" });
    this.viewBG = device.createBindGroup({ layout: this.viewLayout, label: "ocean-view", entries: [{ binding: 0, resource: { buffer: this.viewBuf } }] });
    const module = device.createShaderModule({ code: wgsl(oceanSrc), label: "ocean" });
    const one = { layout: device.createPipelineLayout({ bindGroupLayouts: [this.viewLayout] }) };
    const two = { layout: device.createPipelineLayout({ bindGroupLayouts: [this.viewLayout, this.boidLayout] }) };
    const three = (g: GPUBindGroupLayout): { layout: GPUPipelineLayout } => ({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.viewLayout, this.boidLayout, g] }),
    });
    const fieldModule = device.createShaderModule({ code: fieldSrc, label: "ocean-field" });
    this.splatPipe = device.createComputePipeline({ label: "ocean-field-splat", ...three(this.gridWriteLayout), compute: { module: fieldModule, entryPoint: "field_splat" } });
    const additive: GPUColorTargetState = {
      format: SCENE_FORMAT,
      blend: {
        color: { srcFactor: "one", dstFactor: "one", operation: "add" },
        alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
      },
    };
    this.fieldPipe = device.createRenderPipeline({
      label: "ocean-field",
      ...three(this.gridReadLayout),
      vertex: { module, entryPoint: "field_vs" },
      fragment: { module, entryPoint: "field_fs", targets: [additive] },
      primitive: { topology: "triangle-list" },
    });
    this.watchLayout = device.createBindGroupLayout({
      label: "ocean-watch",
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" } },
      ],
    });
    this.noRetina = device.createBuffer({ size: 64, usage: GPUBufferUsage.STORAGE, label: "ocean-no-retina" });
    const watchModule = device.createShaderModule({ code: watchSrc, label: "ocean-watch" });
    this.watchPipe = device.createRenderPipeline({
      label: "ocean-watch",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.viewLayout, this.watchLayout] }),
      vertex: { module: watchModule, entryPoint: "watch_vs" },
      fragment: { module: watchModule, entryPoint: "watch_fs", targets: [additive] },
      primitive: { topology: "triangle-list" },
    });
    this.waterPipe = device.createRenderPipeline({
      label: "ocean-water",
      ...one,
      vertex: { module, entryPoint: "water_vs" },
      fragment: { module, entryPoint: "water_fs", targets: [{ format: SCENE_FORMAT }] },
      primitive: { topology: "triangle-list" },
    });
    this.fishPipe = device.createRenderPipeline({
      label: "ocean-fish",
      ...two,
      vertex: { module, entryPoint: "fish_vs" },
      fragment: {
        module,
        entryPoint: "fish_fs",
        targets: [
          {
            format: SCENE_FORMAT,
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
    this.overlayPipe = device.createRenderPipeline({
      label: "ocean-overlay",
      ...one,
      vertex: { module, entryPoint: "overlay_vs" },
      fragment: {
        module,
        entryPoint: "overlay_fs",
        targets: [
          {
            format: SCENE_FORMAT,
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  private boidBG(buf: GPUBuffer): GPUBindGroup {
    let bg = this.boidBGs.get(buf);
    if (!bg) {
      bg = this.device.createBindGroup({ layout: this.boidLayout, label: "ocean-boids", entries: [{ binding: 0, resource: { buffer: buf } }] });
      if (this.boidBGs.size > 8) this.boidBGs.clear();
      this.boidBGs.set(buf, bg);
    }
    return bg;
  }

  /** The field grid for a target of w × h px at `cell` px per cell. */
  private fieldGrid(w: number, h: number, cell: number): NonNullable<OceanView["grid"]> {
    const gw = Math.max(1, Math.ceil(w / cell));
    const gh = Math.max(1, Math.ceil(h / cell));
    if (this.grid && this.grid.w === gw && this.grid.h === gh) return this.grid;
    this.grid?.buf.destroy();
    const buf = this.device.createBuffer({ size: gw * gh * 12, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "ocean-field-grid" });
    this.grid = {
      buf,
      w: gw,
      h: gh,
      read: this.device.createBindGroup({ layout: this.gridReadLayout, label: "ocean-field-read", entries: [{ binding: 0, resource: { buffer: buf } }] }),
      write: this.device.createBindGroup({ layout: this.gridWriteLayout, label: "ocean-field-write", entries: [{ binding: 0, resource: { buffer: buf } }] }),
    };
    return this.grid;
  }

  /** Drop cached bind groups (a scene change destroyed the buffers). */
  forgetBuffers(): void {
    this.boidBGs.clear();
  }

  encode(
    enc: GPUCommandEncoder,
    target: GPUTextureView,
    targetW: number,
    targetH: number,
    camera: Camera2D,
    pixelScale: number,
    flock: FlockSource,
    saved: GPUBuffer | null,
    shark: SharkView | null,
    profiler?: GpuProfiler,
    extras?: { under?(rp: GPURenderPassEncoder): void; over?(rp: GPURenderPassEncoder): void },
    /** Watch one: the tracker's record, and in Eyes Only the vision kernel's retina (null = nothing watched). */
    watch?: { record: GPUBuffer; retina: GPUBuffer | null } | null,
  ): void {
    const L = this.look;
    const cam = camera.uniform(pixelScale);
    const W = flock.halfW * 2;
    const H = flock.halfH * 2;
    const t = (performance.now() - this.t0) / 1000;
    // periodic images needed to cover the view (odd count, centred)
    const images = (view: number, dom: number): number => Math.min(5, 2 * Math.max(0, Math.ceil(view / (2 * dom) + 0.5) - 1) + 1);
    const ix = images(targetW * cam.unitsPerPx, W);
    const iy = images(targetH * cam.unitsPerPx, H);
    const split = saved && this.split !== null ? this.split * targetW : -1;
    // level of detail from the fish's length on screen; the compare view draws no field
    const lenPx = L.fishLength / cam.unitsPerPx;
    const lod = lodFor(lenPx);
    if (split >= 0) lod.field = 0;
    this.lod = lod;
    const cell = Math.max(2, Math.round(2 * pixelScale));
    const grid = lod.field > 0.001 ? this.fieldGrid(targetW, targetH, cell) : null;
    const f = new Float32Array(VIEW_BYTES / 4);
    f.set([cam.cx, cam.cy, cam.unitsPerPx, t], 0);
    f.set([targetW, targetH, W, H], 4);
    f.set([flock.halfW, flock.halfH, ix, iy], 8);
    f.set([L.fishLength, L.minPx * pixelScale, L.gain, L.colour === "species" ? 2 : L.colour === "heading" ? 1 : 0], 12);
    f.set([...L.silver, L.flick], 16);
    f.set([...L.water, L.caustic], 20);
    f.set([Math.max(1, Math.round(W / L.causticCell)), Math.max(1, Math.round(H / L.causticCell)), L.causticDrift, 0], 24);
    if (shark) {
      f.set([shark.x, shark.y, shark.heading, shark.length], 28);
      f.set([shark.radius, shark.presence, shark.lunge, L.ring], 32);
    }
    f.set([split, 0.8, 0, 0], 36);
    f.set([lod.glyph, lod.field, FAR_LIGHT, cell], 40);
    f.set([grid ? grid.w : 1, grid ? grid.h : 1, watch?.retina ? 1 : 0, 0], 44);
    PALETTE.forEach((c, k) => f.set([...c, 0], 48 + k * 4));
    this.device.queue.writeBuffer(this.viewBuf, 0, f);

    if (grid) {
      enc.clearBuffer(grid.buf);
      const cp = enc.beginComputePass({ label: "ocean-field-splat", timestampWrites: profiler?.pass("field") });
      cp.setPipeline(this.splatPipe);
      cp.setBindGroup(0, this.viewBG);
      cp.setBindGroup(1, this.boidBG(flock.boids));
      cp.setBindGroup(2, grid.write);
      cp.dispatchWorkgroups(Math.ceil(flock.n / 256));
      cp.end();
    }

    const rp = enc.beginRenderPass({
      label: "ocean",
      colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: profiler?.pass("render"),
    });
    rp.setBindGroup(0, this.viewBG);
    rp.setPipeline(this.waterPipe);
    rp.draw(3);
    if (extras?.under) {
      extras.under(rp);
      rp.setBindGroup(0, this.viewBG);
    }
    if (grid) {
      rp.setPipeline(this.fieldPipe);
      rp.setBindGroup(1, this.boidBG(flock.boids));
      rp.setBindGroup(2, grid.read);
      rp.draw(3);
    }
    rp.setPipeline(this.fishPipe);
    const instances = lod.field >= 0.999 ? 0 : flock.n * ix * iy;
    if (instances === 0) {
      // far away the field carries every fish
    } else if (split >= 0 && saved) {
      const s = Math.min(Math.max(Math.round(split), 0), targetW);
      if (s > 0) {
        rp.setScissorRect(0, 0, s, targetH);
        rp.setBindGroup(1, this.boidBG(saved));
        rp.draw(6, instances);
      }
      if (s < targetW) {
        rp.setScissorRect(s, 0, targetW - s, targetH);
        rp.setBindGroup(1, this.boidBG(flock.boids));
        rp.draw(6, instances);
      }
      rp.setScissorRect(0, 0, targetW, targetH);
    } else {
      rp.setBindGroup(1, this.boidBG(flock.boids));
      rp.draw(6, instances);
    }
    if (extras?.over) {
      extras.over(rp);
      rp.setBindGroup(0, this.viewBG);
    }
    if (watch && split < 0) {
      const retina = watch.retina ?? this.noRetina;
      if (!this.watchBG || this.watchBG.buf !== watch.record || this.watchBG.retina !== retina) {
        this.watchBG = {
          buf: watch.record,
          retina,
          bg: this.device.createBindGroup({
            layout: this.watchLayout,
            label: "ocean-watch",
            entries: [
              { binding: 0, resource: { buffer: watch.record } },
              { binding: 1, resource: { buffer: retina } },
            ],
          }),
        };
      }
      rp.setPipeline(this.watchPipe);
      rp.setBindGroup(1, this.watchBG.bg);
      rp.draw(6, 1 + WATCH_MAX_LIST);
    }
    if (shark || split >= 0) {
      rp.setPipeline(this.overlayPipe);
      rp.draw(3);
    }
    rp.end();
  }

  destroy(): void {
    this.viewBuf.destroy();
    this.grid?.buf.destroy();
  }
}
