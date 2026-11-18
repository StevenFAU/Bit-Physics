// Water in Hand's renderer (08-sph-water.md, "The look"): a glass of water on
// a kitchen table in window light, on the shared 3D layer (F3) and the
// liquid layer (F4).
//
//   scene    the kitchen (render/kitchen.wgsl: the out-of-focus room, the
//            wooden table with the glass's shadow and caustic) and the far
//            half of the glass, with depth
//   water    LiquidSurface: the particles as a screen-space liquid that
//            refracts and absorbs the scene behind it and reflects the room
//            (an EnvironmentProbe of the kitchen, captured from the glass)
//   glass    the near half of the glass, over the water
//
// World units are metres, y up, the table top at y = 0 and the glass on its
// axis: the solver's coordinates, so View3D's model transform is the identity
// and the particle buffer is drawn as the solver wrote it.

import { wgsl } from "@bp/gpu";
import type { GpuProfiler } from "@bp/gpu";
import type { HdrPipeline, LiquidLook, OrbitCamera, Vec3 } from "@bp/render";
import { DEPTH_FORMAT, DepthTarget, EnvironmentProbe, LiquidSurface, SCENE_FORMAT, View3D, WATER } from "@bp/render";
import type { Glass } from "../model/water.js";
import { FILL } from "../model/water.js";
import glassSrc from "./glass.wgsl?raw";
import kitchenSrc from "./kitchen.wgsl?raw";

/** Towards the window: behind the glass and to the left of the default view. */
export const KEY_LIGHT: Vec3 = (() => {
  const v: Vec3 = [-0.55, 0.62, -0.58];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

/** Window daylight, linear radiance. */
const WINDOW: Vec3 = [3.6, 3.4, 3.0];

/**
 * Water in a ~0.6 m glass. Pure water absorbs ~0.45 / 0.065 / 0.03 per metre
 * (red / green / blue), nearly invisible across this glass; the art direction
 * asks for a faint blue-green, so the absorption is about five times pure
 * water's. Rendering only.
 */
export const KITCHEN_WATER: LiquidLook = {
  ...WATER,
  absorption: [2.2, 0.7, 0.55],
  scatter: [0.006, 0.016, 0.018],
  environment: 1,
  refraction: 0.25,
  maxRefractThickness: 0.35,
  lightDir: KEY_LIGHT,
  lightColor: [26, 24, 21],
  shininess: 700,
};

export interface WaterFrame {
  camera: OrbitCamera;
  particles: GPUBuffer;
  count: number;
  /** Impostor radius, m. */
  radius: number;
  /** Volume per particle (spacing³), m³. */
  particleVolume: number;
}

/** Interleaved pos(3) normal(3) kind(1) triangles of the glass shell. */
export function glassMesh(g: { inner: number; outer: number; floor: number; height: number }, segments = 96): Float32Array {
  const out: number[] = [];
  const ring = (k: number): [number, number] => {
    const a = (k / segments) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  };
  const quad = (a: number[], b: number[], c: number[], d: number[]): void => {
    out.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  for (let k = 0; k < segments; k += 1) {
    const [c0, s0] = ring(k);
    const [c1, s1] = ring(k + 1);
    const R = g.outer;
    const r = g.inner;
    // outer wall, table to rim
    quad([c0 * R, 0, s0 * R, c0, 0, s0, 0], [c1 * R, 0, s1 * R, c1, 0, s1, 0], [c1 * R, g.height, s1 * R, c1, 0, s1, 0], [c0 * R, g.height, s0 * R, c0, 0, s0, 0]);
    // inner wall, floor to rim (normals inwards)
    quad([c0 * r, g.floor, s0 * r, -c0, 0, -s0, 0], [c0 * r, g.height, s0 * r, -c0, 0, -s0, 0], [c1 * r, g.height, s1 * r, -c1, 0, -s1, 0], [c1 * r, g.floor, s1 * r, -c1, 0, -s1, 0]);
    // rim
    quad([c0 * r, g.height, s0 * r, 0, 1, 0, 0], [c0 * R, g.height, s0 * R, 0, 1, 0, 0], [c1 * R, g.height, s1 * R, 0, 1, 0, 0], [c1 * r, g.height, s1 * r, 0, 1, 0, 0]);
    // the inner floor: the top of the thick base, always behind the water
    out.push(0, g.floor, 0, 0, 1, 0, 1, c1 * r, g.floor, s1 * r, 0, 1, 0, 1, c0 * r, g.floor, s0 * r, 0, 1, 0, 1);
  }
  return new Float32Array(out);
}

export class WaterView {
  readonly view3d: View3D;
  readonly depth: DepthTarget;
  readonly liquid: LiquidSurface;
  readonly probe: EnvironmentProbe;
  /** Debug: draw the water (false = the scene alone). */
  showWater = true;
  private readonly kitchenParams: GPUBuffer;
  private readonly kitchenBind: GPUBindGroup;
  private readonly probeBind: GPUBindGroup;
  private readonly glassLooks: [GPUBuffer, GPUBuffer];
  private readonly glassBinds: [GPUBindGroup, GPUBindGroup];
  private glassVerts: GPUBuffer | null = null;
  private glassCount = 0;
  private glassKey = "";
  glass: Glass | null = null;
  /** The visual glass is the physical one grown by the impostor radius (the water's drawn surface touches it). */
  private visual = { inner: 0.3, outer: 0.32, floor: 0.05, height: 0.95 };

  private constructor(
    private readonly device: GPUDevice,
    view3d: View3D,
    liquid: LiquidSurface,
    probe: EnvironmentProbe,
    private readonly kitchen: GPURenderPipeline,
    private readonly kitchenColor: GPURenderPipeline,
    private readonly glassPipe: GPURenderPipeline,
  ) {
    this.view3d = view3d;
    this.liquid = liquid;
    this.probe = probe;
    this.depth = new DepthTarget(device, DEPTH_FORMAT);
    liquid.look = { ...KITCHEN_WATER };
    liquid.filter = { ...liquid.filter, iterations: 3, radius: 4 };
    liquid.setProbe(probe);
    this.kitchenParams = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "kitchen" });
    this.kitchenBind = device.createBindGroup({
      label: "kitchen",
      layout: kitchen.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: view3d.buffer } },
        { binding: 1, resource: { buffer: this.kitchenParams } },
      ],
    });
    this.probeBind = device.createBindGroup({
      label: "kitchen-probe",
      layout: kitchenColor.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: probe.view.buffer } },
        { binding: 1, resource: { buffer: this.kitchenParams } },
      ],
    });
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    const mkLook = (near: number): GPUBuffer => {
      const b = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `glass-look-${near}` });
      device.queue.writeBuffer(b, 0, new Float32Array([...KEY_LIGHT, near, 40, 38, 34, 900, 0.006, 0.009, 0.008, 0.035]));
      return b;
    };
    this.glassLooks = [mkLook(0), mkLook(1)];
    const mkBind = (look: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        label: "glass",
        layout: glassPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: view3d.buffer } },
          { binding: 1, resource: { buffer: look } },
          { binding: 2, resource: probe.cubeView },
          { binding: 3, resource: sampler },
        ],
      });
    this.glassBinds = [mkBind(this.glassLooks[0]), mkBind(this.glassLooks[1])];
  }

  static async create(device: GPUDevice, liquidScale = 0.5): Promise<WaterView> {
    const view3d = new View3D(device);
    const kModule = device.createShaderModule({ code: wgsl(kitchenSrc), label: "kitchen" });
    const gModule = device.createShaderModule({ code: wgsl(glassSrc), label: "glass" });
    const premul: GPUBlendState = {
      color: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" },
      alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" },
    };
    const [liquid, kitchen, kitchenColor, glassPipe] = await Promise.all([
      LiquidSurface.create(device, view3d, { scale: liquidScale, depthFormat: DEPTH_FORMAT }),
      device.createRenderPipelineAsync({
        label: "kitchen",
        layout: "auto",
        vertex: { module: kModule, entryPoint: "vs" },
        fragment: { module: kModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT }] },
        depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: "always" },
      }),
      device.createRenderPipelineAsync({
        label: "kitchen-probe",
        layout: "auto",
        vertex: { module: kModule, entryPoint: "vs" },
        fragment: { module: kModule, entryPoint: "fs_color", targets: [{ format: SCENE_FORMAT }] },
      }),
      device.createRenderPipelineAsync({
        label: "glass",
        layout: "auto",
        vertex: {
          module: gModule,
          entryPoint: "vs",
          buffers: [
            {
              arrayStride: 28,
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x3" },
                { shaderLocation: 1, offset: 12, format: "float32x3" },
                { shaderLocation: 2, offset: 24, format: "float32" },
              ],
            },
          ],
        },
        fragment: { module: gModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT, blend: premul }] },
        primitive: { topology: "triangle-list", cullMode: "none" },
        depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: "less-equal" },
      }),
    ]);
    const probe = new EnvironmentProbe(device, 128);
    return new WaterView(device, view3d, liquid, probe, kitchen, kitchenColor, glassPipe);
  }

  /** Set the physical glass and the impostor radius; rebuilds the shell and recaptures the probe when they change. */
  setGlass(g: Glass, radius: number): void {
    const key = `${g.radius},${g.wall},${g.floor},${g.height},${radius.toFixed(6)}`;
    if (key === this.glassKey) return;
    this.glassKey = key;
    this.glass = g;
    this.visual = { inner: g.radius + radius, outer: g.radius + radius + g.wall, floor: g.floor - radius, height: g.height };
    const mesh = glassMesh(this.visual);
    this.glassVerts?.destroy();
    this.glassVerts = this.device.createBuffer({ size: mesh.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, label: "glass-mesh" });
    this.device.queue.writeBuffer(this.glassVerts, 0, mesh);
    this.glassCount = mesh.length / 7;
    const v = this.visual;
    this.device.queue.writeBuffer(
      this.kitchenParams,
      0,
      new Float32Array([...KEY_LIGHT, 1.9, v.outer, v.height, g.floor + FILL, v.floor, 2.4, 1.5, 1.1, 1.6, ...WINDOW, 1.35, 0.08, 0.17, 0.2, 0]),
    );
    // the room as the water sees it: from the middle of the glass
    this.probe.capture([0, g.floor + FILL * 0.8, 0], (pass) => {
      pass.setPipeline(this.kitchenColor);
      pass.setBindGroup(0, this.probeBind);
      pass.draw(3);
    });
  }

  /** The point on the horizontal plane at height y under a CSS-px screen point, or null. */
  pickPlane(camera: OrbitCamera, sx: number, sy: number, y: number): Vec3 | null {
    const r = camera.ray(sx, sy);
    if (Math.abs(r.dir[1]) < 1e-6) return null;
    const t = (y - r.origin[1]) / r.dir[1];
    if (t <= 0) return null;
    return [r.origin[0] + r.dir[0] * t, y, r.origin[2] + r.dir[2] * t];
  }

  encode(enc: GPUCommandEncoder, hdr: HdrPipeline, f: WaterFrame, profiler?: GpuProfiler | null): void {
    const w = hdr.width;
    const h = hdr.height;
    this.view3d.update(f.camera, w, h);
    const depth = this.depth.ensure(w, h);
    const ts = (name: string): GPURenderPassTimestampWrites | undefined => (profiler?.pass(name) as GPURenderPassTimestampWrites | undefined) ?? undefined;

    const a = enc.beginRenderPass({
      label: "kitchen",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      depthStencilAttachment: { view: depth, depthLoadOp: "clear", depthStoreOp: "store", depthClearValue: 1 },
      timestampWrites: ts("kitchen"),
    });
    a.setPipeline(this.kitchen);
    a.setBindGroup(0, this.kitchenBind);
    a.draw(3);
    if (this.glassVerts) {
      a.setPipeline(this.glassPipe);
      a.setBindGroup(0, this.glassBinds[0]);
      a.setVertexBuffer(0, this.glassVerts);
      a.draw(this.glassCount);
    }
    a.end();

    if (this.showWater && f.count > 0) {
      this.liquid.encode(enc, hdr, { particles: { buffer: f.particles, count: f.count, stride: 4, offset: 0 }, radius: f.radius, particleVolume: f.particleVolume, depth }, profiler);
    }

    if (this.glassVerts) {
      const b = enc.beginRenderPass({
        label: "glass",
        colorAttachments: [{ view: hdr.sceneView, loadOp: "load", storeOp: "store" }],
        depthStencilAttachment: { view: depth, depthLoadOp: "load", depthStoreOp: "store" },
        timestampWrites: ts("glass"),
      });
      b.setPipeline(this.glassPipe);
      b.setBindGroup(0, this.glassBinds[1]);
      b.setVertexBuffer(0, this.glassVerts);
      b.draw(this.glassCount);
      b.end();
    }
  }

  /** Screen position (CSS px) of a world point, or null when behind the eye. */
  screenOf(camera: OrbitCamera, p: Vec3): [number, number] | null {
    const [x, y, wv] = this.view3d.project(p);
    if (wv <= 0) return null;
    return [(x * camera.viewW) / Math.max(this.view3d.width, 1), (y * camera.viewH) / Math.max(this.view3d.height, 1)];
  }
}
