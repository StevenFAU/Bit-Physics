// Paint the Stream's renderer (06-curl-noise.md, "The look": "2D Paint: ψ as
// a soft topographic map (hillshade + optional contour lines) under the
// particles"). The map is the shared FieldView2D (material mode: valleys deep
// water, hills sand, relief from ψ's gradient, isolines at equal steps of ψ —
// equal flow between neighbouring lines) on the periodic ψ grid; the
// particles are soft splats into a short long exposure (Accumulator "ema"), so
// each leaves a trail along its contour.

import type { GpuProfiler } from "@bp/gpu";
import type { Camera2D, FieldLook, HdrPipeline } from "@bp/render";
import { Accumulator, FieldView2D, SCENE_FORMAT } from "@bp/render";
import splatSrc from "./splat.wgsl?raw";

export const MAP_LOOK: FieldLook = {
  background: "#10222f",
  ink: "#a88d66",
  accent: "#fff3dc",
  rim: "#f2d7a8",
  rimAmount: 0.05,
  gloss: 0.12,
  shininess: 28,
  relief: 2.6,
  grain: 0.05,
  light: [-0.55, -0.65, 0.55],
  coverage: [-1, 1],
};

export interface PaintLook {
  /** Contour lines on the map. */
  contours: boolean;
  /** Contour lines across ±(hill height). */
  lines: number;
  /** Splat radius, px at 900 px of render height; light per splat at 0.08 particles per scene pixel. */
  radius: number;
  energy: number;
  /** Long exposure, seconds (shorter while the view is moving). */
  tau: number;
  tauMoving: number;
}

export const DEFAULT_PAINT_LOOK: PaintLook = { contours: true, lines: 18, radius: 1.5, energy: 0.45, tau: 0.2, tauMoving: 0.05 };

export class PaintView {
  look: PaintLook = { ...DEFAULT_PAINT_LOOK };
  readonly field: FieldView2D;
  private readonly params: GPUBuffer;
  private bind: GPUBindGroup | null = null;
  private bindParts: GPUBuffer | null = null;

  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPURenderPipeline,
    private readonly light: Accumulator,
  ) {
    this.field = new FieldView2D(device, MAP_LOOK);
    this.field.view = { ...this.field.view, mode: "material", sampling: "bicubic", isolines: this.look.lines };
    this.params = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "paint-splat" });
  }

  static async create(device: GPUDevice): Promise<PaintView> {
    const module = device.createShaderModule({ code: splatSrc, label: "paint-splat" });
    const [pipeline, light] = await Promise.all([
      device.createRenderPipelineAsync({
        label: "paint-splat",
        layout: "auto",
        vertex: { module, entryPoint: "vs" },
        fragment: {
          module,
          entryPoint: "fs",
          targets: [{ format: SCENE_FORMAT, blend: { color: { operation: "add", srcFactor: "one", dstFactor: "one" }, alpha: { operation: "add", srcFactor: "one", dstFactor: "one" } } }],
        },
        primitive: { topology: "triangle-strip" },
      }),
      Accumulator.create(device, { mode: "ema" }),
    ]);
    return new PaintView(device, pipeline, light);
  }

  /** Point the map at the ψ grid; `amplitude` sets the colour ramp and contour spacing. */
  setSource(psi: GPUBuffer, n: number, amplitude: number): void {
    this.field.setSource({ buffer: psi, width: n, height: n, stride: 1, primary: 0, secondary: 0, periodic: true });
    this.field.look = { ...MAP_LOOK, coverage: [-amplitude, amplitude] };
    this.amplitude = amplitude;
  }

  private amplitude = 1;

  /** The ψ step between neighbouring contour lines. */
  get contourStep(): number {
    return (2 * this.amplitude) / this.look.lines;
  }

  clearExposure(): void {
    this.light.clear();
  }

  encode(
    enc: GPUCommandEncoder,
    hdr: HdrPipeline,
    f: { camera: Camera2D; pixelScale: number; parts: GPUBuffer; count: number; n: number; dtSec: number; moving: boolean },
    profiler?: GpuProfiler | null,
  ): void {
    const w = hdr.width;
    const h = hdr.height;
    this.field.view = { ...this.field.view, range: [-this.amplitude, this.amplitude], isolines: this.look.contours ? this.look.lines : 0 };
    // 1. the map (clears the scene target)
    this.field.encode(enc, hdr.sceneView, w, h, f.camera, f.pixelScale, profiler ?? undefined);

    // 2. the particles, into the long exposure
    this.light.resize(w, h);
    const cam = f.camera.uniform(f.pixelScale);
    const pxScale = Math.max(0.6, h / 900);
    const L = this.look;
    // light per splat: the same light per pixel at any count, map size, zoom or
    // screen — particles per scene pixel are count · (cells/px)² / N² (0.08 at
    // 131,072 on a 1024² map across 1280 px), and the contour lines must stay
    // readable under them
    const perPx = Math.max((f.count * cam.unitsPerPx * cam.unitsPerPx) / (f.n * f.n), 1e-6);
    // …and a bigger splat (a taller screen) spreads the same light over more pixels
    const energy = Math.min((L.energy * (0.08 / perPx)) / (pxScale * pxScale), 4);
    this.device.queue.writeBuffer(this.params, 0, new Float32Array([cam.cx, cam.cy, cam.unitsPerPx, f.n, w, h, L.radius * pxScale, energy, 1.0, 0.94, 0.84, 0]));
    if (!this.bind || this.bindParts !== f.parts) {
      this.bindParts = f.parts;
      this.bind = this.device.createBindGroup({
        label: "paint-splat",
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.params } },
          { binding: 1, resource: { buffer: f.parts } },
        ],
      });
    }
    const tau = f.moving ? L.tauMoving : L.tau;
    const decay = Math.exp(-Math.min(f.dtSec, 0.1) / Math.max(tau, 1e-3));
    const p = this.light.begin(enc, { timestampWrites: profiler?.pass("splat") ?? undefined });
    p.setPipeline(this.pipeline);
    p.setBindGroup(0, this.bind);
    p.draw(4, f.count);
    this.light.end(enc, p, decay);
    const b = enc.beginRenderPass({
      label: "paint-light",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "load", storeOp: "store" }],
    });
    this.light.composite(b, 1);
    b.end();
  }
}
