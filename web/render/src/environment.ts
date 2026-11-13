// Environment (00-foundation.md § 3.4, F3): what a 3D scene sits in. Drawn
// first into the HDR target (and, with a depth target, clearing it): a
// studio gradient or an analytic daylight sky, and optionally a ground plane
// with a fading grid and soft contact shadows under up to 32 sphere casters.
// Colours are linear radiance; the HDR pipeline's exposure and tone map turn
// them into pixels like everything else.

import { wgsl } from "@bp/gpu";
import "./register.js";
import { SCENE_FORMAT } from "./hdr.js";
import type { Vec3 } from "./orbit-camera.js";
import type { View3D } from "./view3d.js";
import environmentSrc from "./wgsl/environment.wgsl?raw";

export const MAX_CASTERS = 32;

type Rgb = readonly [number, number, number];

export interface EnvironmentLook {
  mode: "studio" | "sky";
  zenith: Rgb;
  horizon: Rgb;
  nadir: Rgb;
  /** Studio: a faint glow behind the subject (strength, radius in view uv). */
  glow: number;
  glowRadius: number;
  /** Sky: direction towards the sun (world), its radiance and halo. */
  sunDir: Vec3;
  sunColor: Rgb;
  /** Cosine of the sun's angular radius. */
  sunSize: number;
  halo: number;
  ground: null | {
    height: number;
    color: Rgb;
    /** Grid spacing in world units (0 = none). */
    grid: number;
    /** Distance over which the ground fades into the backdrop. */
    fade: number;
    /** Contact shadow strength, 0–1. */
    shadow: number;
  };
}

export const STUDIO_DARK: EnvironmentLook = {
  mode: "studio",
  zenith: [0.006, 0.008, 0.014],
  horizon: [0.016, 0.02, 0.032],
  nadir: [0.004, 0.005, 0.008],
  glow: 0.35,
  glowRadius: 0.45,
  sunDir: [0.4, 0.8, 0.3],
  sunColor: [0, 0, 0],
  sunSize: 0.9995,
  halo: 0,
  ground: null,
};

export const DAYLIGHT: EnvironmentLook = {
  mode: "sky",
  zenith: [0.12, 0.26, 0.62],
  horizon: [0.62, 0.72, 0.85],
  nadir: [0.22, 0.22, 0.24],
  glow: 0,
  glowRadius: 0.5,
  sunDir: [0.35, 0.6, 0.45],
  sunColor: [40, 36, 30],
  sunSize: 0.99985,
  halo: 0.6,
  ground: { height: 0, color: [0.32, 0.31, 0.29], grid: 1, fade: 60, shadow: 0.8 },
};

/** Pack the look into the 128-byte uniform (exported for tests). */
export function packEnvironment(l: EnvironmentLook, casterCount: number): Float32Array<ArrayBuffer> {
  const d = new Float32Array(32);
  d.set([...l.zenith, 0], 0);
  d.set([...l.horizon, 0], 4);
  d.set([...l.nadir, 0], 8);
  const s = Math.hypot(...l.sunDir) || 1;
  d.set([l.sunDir[0] / s, l.sunDir[1] / s, l.sunDir[2] / s, l.sunSize], 12);
  d.set([...l.sunColor, l.halo], 16);
  const g = l.ground;
  d.set([g?.height ?? 0, g ? 1 : 0, g?.grid ?? 0, g?.fade ?? 1], 20);
  d.set([...(g?.color ?? [0, 0, 0]), g?.shadow ?? 0], 24);
  d.set([l.mode === "sky" ? 1 : 0, Math.min(casterCount, MAX_CASTERS), l.glow, l.glowRadius], 28);
  return d;
}

export class Environment {
  look: EnvironmentLook;
  private readonly params: GPUBuffer;
  private readonly casters: GPUBuffer;
  private casterCount = 0;
  private readonly bind: GPUBindGroup;

  private constructor(
    private readonly device: GPUDevice,
    view: View3D,
    private readonly pipeline: GPURenderPipeline,
    look: EnvironmentLook,
  ) {
    this.look = look;
    this.params = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "environment" });
    this.casters = device.createBuffer({ size: MAX_CASTERS * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "environment-casters" });
    this.bind = device.createBindGroup({
      label: "environment",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: view.buffer } },
        { binding: 1, resource: { buffer: this.params } },
        { binding: 2, resource: { buffer: this.casters } },
      ],
    });
  }

  /**
   * `depthFormat`: the depth target the scene pass carries (the backdrop
   * writes far depth, the ground its own). Omit for a colour-only pass.
   */
  static async create(device: GPUDevice, view: View3D, look: EnvironmentLook = STUDIO_DARK, o: { format?: GPUTextureFormat; depthFormat?: GPUTextureFormat } = {}): Promise<Environment> {
    const module = device.createShaderModule({ code: wgsl(environmentSrc), label: "environment" });
    const pipeline = await device.createRenderPipelineAsync({
      label: "environment",
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: o.depthFormat ? "fs" : "fs_color", targets: [{ format: o.format ?? SCENE_FORMAT }] },
      depthStencil: o.depthFormat ? { format: o.depthFormat, depthWriteEnabled: true, depthCompare: "always" } : undefined,
    });
    return new Environment(device, view, pipeline, look);
  }

  /** Spheres that shadow the ground: xyz world centre + radius, 4 floats each. */
  setCasters(spheres: Float32Array): void {
    this.casterCount = Math.min(MAX_CASTERS, Math.floor(spheres.length / 4));
    if (this.casterCount > 0) this.device.queue.writeBuffer(this.casters, 0, spheres, 0, this.casterCount * 4);
  }

  /** Draw the backdrop (first thing in the scene pass). */
  draw(pass: GPURenderPassEncoder): void {
    this.device.queue.writeBuffer(this.params, 0, packEnvironment(this.look, this.casterCount));
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bind);
    pass.draw(3);
  }

  destroy(): void {
    this.params.destroy();
    this.casters.destroy();
  }
}
