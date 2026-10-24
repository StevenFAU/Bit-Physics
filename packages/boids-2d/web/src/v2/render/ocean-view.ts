// Swarm renderer: water (with caustics) → fish (additive, energy-normalised)
// → shark shadow + fear ring + compare divider, all into the HDR scene target.
// The A/B compare draws the save point's flock left of the split and the live
// flock right of it (scissored).

import type { GpuProfiler } from "@bp/gpu";
import { wgsl } from "@bp/gpu";
import type { Camera2D } from "@bp/render";
import { SCENE_FORMAT } from "@bp/render";
import oceanSrc from "./ocean.wgsl?raw";

export type FishColour = "silver" | "heading";

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
  fishLength: 0.016,
  minPx: 1.6,
  gain: 1.6,
  colour: "silver",
  silver: [0.62, 0.8, 0.95],
  flick: 0.12,
  water: [0.0016, 0.0042, 0.0085],
  caustic: 0.55,
  causticCell: 0.9,
  causticDrift: 0.06,
  ring: 0.18,
};

export interface FlockSource {
  boids: GPUBuffer;
  n: number;
  halfW: number;
  halfH: number;
}

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
  private boidBGs = new Map<GPUBuffer, GPUBindGroup>();
  private readonly t0 = performance.now();

  constructor(device: GPUDevice, look: OceanLook = DEFAULT_LOOK) {
    this.device = device;
    this.look = { ...look };
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    this.viewLayout = device.createBindGroupLayout({
      label: "ocean-view",
      entries: [{ binding: 0, visibility: VF, buffer: { type: "uniform" } }],
    });
    this.boidLayout = device.createBindGroupLayout({
      label: "ocean-boids",
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }],
    });
    this.viewBuf = device.createBuffer({ size: 160, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "ocean-view" });
    this.viewBG = device.createBindGroup({ layout: this.viewLayout, label: "ocean-view", entries: [{ binding: 0, resource: { buffer: this.viewBuf } }] });
    const module = device.createShaderModule({ code: wgsl(oceanSrc), label: "ocean" });
    const one = { layout: device.createPipelineLayout({ bindGroupLayouts: [this.viewLayout] }) };
    const two = { layout: device.createPipelineLayout({ bindGroupLayouts: [this.viewLayout, this.boidLayout] }) };
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
    const f = new Float32Array(40);
    f.set([cam.cx, cam.cy, cam.unitsPerPx, t], 0);
    f.set([targetW, targetH, W, H], 4);
    f.set([flock.halfW, flock.halfH, ix, iy], 8);
    f.set([L.fishLength, L.minPx * pixelScale, L.gain, L.colour === "heading" ? 1 : 0], 12);
    f.set([...L.silver, L.flick], 16);
    f.set([...L.water, L.caustic], 20);
    f.set([Math.max(1, Math.round(W / L.causticCell)), Math.max(1, Math.round(H / L.causticCell)), L.causticDrift, 0], 24);
    if (shark) {
      f.set([shark.x, shark.y, shark.heading, shark.length], 28);
      f.set([shark.radius, shark.presence, shark.lunge, L.ring], 32);
    }
    f.set([split, 0.8, 0, 0], 36);
    this.device.queue.writeBuffer(this.viewBuf, 0, f);

    const rp = enc.beginRenderPass({
      label: "ocean",
      colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: profiler?.pass("render"),
    });
    rp.setBindGroup(0, this.viewBG);
    rp.setPipeline(this.waterPipe);
    rp.draw(3);
    rp.setPipeline(this.fishPipe);
    const instances = flock.n * ix * iy;
    if (split >= 0 && saved) {
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
    if (shark || split >= 0) {
      rp.setPipeline(this.overlayPipe);
      rp.draw(3);
    }
    rp.end();
  }

  destroy(): void {
    this.viewBuf.destroy();
  }
}
