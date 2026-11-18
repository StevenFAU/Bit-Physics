// Flow Sculpture's renderer (06-curl-noise.md, "The look"): studio light on
// silk, on the shared 3D layer (F3).
//
//   backdrop   Environment: a dark warm-grey studio gradient over a soft floor
//              that fades into it, with a contact shadow under the sphere
//   obstacle   the sphere as matte ceramic (Instances, icosphere LODs, GPU
//              cull), writing depth so the ribbons pass behind it
//   silk       every tracer's recent path, a thin ribbon lit like a thread
//              (render/silk.wgsl), drawn into a cleared frame target
//              (Accumulator "frame": thousands of faint overlapping segments
//              stay precise in rgba16float), depth-tested, then added in
//
// Model coordinates are the gate's unit box (the sphere at its centre);
// View3D's model transform centres and scales it into the y-up world the
// OrbitCamera orbits, so the tracers' buffers are drawn as the kernel wrote them.

import { wgsl } from "@bp/gpu";
import type { GpuProfiler } from "@bp/gpu";
import type { EnvironmentLook, HdrPipeline, OrbitCamera, Rgb, Vec3 } from "@bp/render";
import {
  Accumulator,
  DEPTH_FORMAT,
  DepthTarget,
  Environment,
  INSTANCE_FLOATS,
  Instances,
  SCENE_FORMAT,
  View3D,
  icosphere,
  paletteTexture,
  similarity,
  transform4,
} from "@bp/render";
import type { Obstacle, V3 } from "../model/flow.js";
import { BALL_CENTRE, BALL_RADIUS } from "../model/flow.js";
import silkSrc from "./silk.wgsl?raw";

/** Silk: rose, champagne, ivory, pale teal, lilac (sRGB stops, OKLab-interpolated), in order — a strand's surface picks its place. */
export const SILK_STOPS: readonly Rgb[] = [
  [0.82, 0.4, 0.5],
  [0.97, 0.7, 0.5],
  [0.99, 0.94, 0.84],
  [0.56, 0.82, 0.84],
  [0.58, 0.54, 0.9],
];

/** The studio: warm dark grey, a soft floor, a contact shadow. */
export const STUDIO_WARM: EnvironmentLook = {
  mode: "studio",
  zenith: [0.006, 0.0055, 0.005],
  horizon: [0.03, 0.026, 0.022],
  nadir: [0.008, 0.007, 0.006],
  glow: 1.4,
  glowRadius: 0.42,
  sunDir: [0.4, 0.8, 0.3],
  sunColor: [0, 0, 0],
  sunSize: 0.9995,
  halo: 0,
  ground: { height: -1.2, color: [0.2, 0.18, 0.16], grid: 0, fade: 5, shadow: 0.9 },
};

export interface SilkLook {
  /** Ribbon width, px at 900 px of render height. */
  width: number;
  /** Brightness ∝ (1 − age along the strand)^fade. */
  fade: number;
  /** Light per segment, before the strand-count normalisation. */
  energy: number;
  /** Kajiya–Kay highlight strength and exponent. */
  sheen: number;
  sheenPower: number;
  /** Width ∝ (step / ref)^exponent, clamped: −0.5 is a tube of flow keeping its volume. */
  widthExponent: number;
  ambient: number;
  /** Palette position = f₂ · bands + phase (clamped). */
  bands: number;
  phase: number;
}

export const DEFAULT_SILK: SilkLook = {
  width: 1.7,
  fade: 0.9,
  energy: 0.5,
  sheen: 1.4,
  sheenPower: 18,
  widthExponent: -0.5,
  ambient: 0.22,
  bands: 3.2,
  phase: 0.5,
};

export interface FrameState {
  camera: OrbitCamera;
  ring: { buffer: GPUBuffer; anchors: GPUBuffer; strands: number; slots: number; head: number; valid: number };
  /** Typical step length (model units) of a ribbon segment: |v|·Δt. */
  refStep: number;
  obstacle: Obstacle | null;
}

/** World units per model unit; the model's box centre (0.5, 0.5, 0.5) sits at the world origin. */
export const MODEL_SCALE = 2.4;
export const MODEL_CENTRE: V3 = [0.5, 0.5, 0.5];

export class FlowView {
  silk: SilkLook = { ...DEFAULT_SILK };
  readonly view3d: View3D;
  readonly depth: DepthTarget;
  private readonly params: GPUBuffer;
  private bind: GPUBindGroup | null = null;
  private bindRing: GPUBuffer | null = null;
  private bindAnchors: GPUBuffer | null = null;
  private readonly sampler: GPUSampler;
  private obstacleKey = "";

  private constructor(
    private readonly device: GPUDevice,
    view3d: View3D,
    readonly env: Environment,
    readonly sphere: Instances,
    private readonly light: Accumulator,
    private readonly pipeline: GPURenderPipeline,
    private readonly palette: GPUTextureView,
  ) {
    this.view3d = view3d;
    this.depth = new DepthTarget(device, DEPTH_FORMAT);
    this.params = device.createBuffer({ size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "silk-params" });
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "repeat" });
    const s = MODEL_SCALE;
    const c = MODEL_CENTRE;
    view3d.setModel(similarity(s, [1, 0, 0], [0, 1, 0], [0, 0, 1], [-c[0] * s, -c[1] * s, -c[2] * s]), s);
    sphere.look = { key: [-0.5, 0.75, 0.45], ambient: 0.16, diffuse: 0.95, rim: 0.12, rimPower: 2.5, gain: 3 };
  }

  static async create(device: GPUDevice): Promise<FlowView> {
    const view3d = new View3D(device);
    const module = device.createShaderModule({ code: wgsl(silkSrc), label: "silk" });
    const [env, sphere, light, pipeline] = await Promise.all([
      Environment.create(device, view3d, STUDIO_WARM, { depthFormat: DEPTH_FORMAT }),
      Instances.create(device, view3d, { lods: [icosphere(5), icosphere(4), icosphere(3)], lodPx: [90, 30], capacity: 4, label: "obstacle", depthFormat: DEPTH_FORMAT }),
      Accumulator.create(device, { mode: "frame", depthFormat: DEPTH_FORMAT }),
      device.createRenderPipelineAsync({
        label: "silk",
        layout: "auto",
        vertex: { module, entryPoint: "vs" },
        fragment: {
          module,
          entryPoint: "fs",
          targets: [{ format: SCENE_FORMAT, blend: { color: { operation: "add", srcFactor: "one", dstFactor: "one" }, alpha: { operation: "add", srcFactor: "one", dstFactor: "one" } } }],
        },
        primitive: { topology: "triangle-strip" },
        depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: "less-equal" },
      }),
    ]);
    const palette = paletteTexture(device, SILK_STOPS, "silk-palette").createView();
    return new FlowView(device, view3d, env, sphere, light, pipeline, palette);
  }

  /** World position of a model point. */
  toWorld(p: V3): Vec3 {
    const [x, y, z] = transform4(this.view3d.model, p);
    return [x, y, z];
  }

  /** Model point of a world position. */
  toModel(p: Vec3): V3 {
    const s = MODEL_SCALE;
    const c = MODEL_CENTRE;
    return [p[0] / s + c[0], p[1] / s + c[1], p[2] / s + c[2]];
  }

  /** Model-space ray through a CSS-px screen point. */
  modelRay(camera: OrbitCamera, sx: number, sy: number): { origin: V3; dir: V3 } {
    const r = camera.ray(sx, sy);
    return { origin: this.toModel(r.origin), dir: [r.dir[0], r.dir[1], r.dir[2]] };
  }

  /** Where a screen ray first meets the obstacle (model units), or null. */
  pickObstacle(camera: OrbitCamera, sx: number, sy: number, o: Obstacle | null, slackPx = 10): V3 | null {
    if (!o) return null;
    const { origin, dir } = this.modelRay(camera, sx, sy);
    const oc: V3 = [origin[0] - o.centre[0], origin[1] - o.centre[1], origin[2] - o.centre[2]];
    // a few px of slack, so a thin miss at the rim still grabs it
    const slack = this.unitsPerPx(camera) * slackPx;
    const r = o.radius + slack;
    const b = oc[0] * dir[0] + oc[1] * dir[1] + oc[2] * dir[2];
    const c = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - r * r;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    return [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
  }

  /** Model units per CSS px at the orbit target. */
  unitsPerPx(camera: OrbitCamera): number {
    const worldPerPx = (2 * camera.distance * Math.tan(camera.fovY / 2)) / Math.max(camera.viewH, 1);
    return worldPerPx / MODEL_SCALE;
  }

  /** The obstacle as an instance and a ground-shadow caster. */
  private syncObstacle(o: Obstacle | null): void {
    const key = o ? `${o.centre.join(",")},${o.radius}` : "none";
    if (key === this.obstacleKey) return;
    this.obstacleKey = key;
    if (!o) {
      this.sphere.set(new Float32Array(INSTANCE_FLOATS), 0);
      this.env.setCasters(new Float32Array(0));
      return;
    }
    // matte ceramic: warm off-white, a whisper of emission so its shadow side reads
    this.sphere.set(new Float32Array([...o.centre, o.radius, 0, 0, 0, 1, 0.62, 0.58, 0.53, 0.015]), 1);
    const w = this.toWorld(o.centre);
    this.env.setCasters(new Float32Array([w[0], w[1], w[2], o.radius * MODEL_SCALE]));
  }

  private silkBind(ring: GPUBuffer, anchors: GPUBuffer): GPUBindGroup {
    if (this.bind && this.bindRing === ring && this.bindAnchors === anchors) return this.bind;
    this.bindRing = ring;
    this.bindAnchors = anchors;
    this.bind = this.device.createBindGroup({
      label: "silk",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.view3d.buffer } },
        { binding: 1, resource: { buffer: this.params } },
        { binding: 2, resource: { buffer: ring } },
        { binding: 3, resource: this.palette },
        { binding: 4, resource: this.sampler },
        { binding: 5, resource: { buffer: anchors } },
      ],
    });
    return this.bind;
  }

  encode(enc: GPUCommandEncoder, hdr: HdrPipeline, f: FrameState, profiler?: GpuProfiler | null): void {
    const w = hdr.width;
    const h = hdr.height;
    this.view3d.update(f.camera, w, h);
    const depth = this.depth.ensure(w, h);
    this.light.resize(w, h);
    this.syncObstacle(f.obstacle);
    // sizes scale with the render target, so a governor step-down keeps the look
    const pxScale = Math.max(0.6, h / 900);
    const L = this.silk;

    this.sphere.encodeCull(enc, profiler?.pass("cull") ?? undefined);

    // 1. studio + floor + the sphere (writes depth)
    const a = enc.beginRenderPass({
      label: "flow-studio",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      depthStencilAttachment: { view: depth, depthLoadOp: "clear", depthStoreOp: "store", depthClearValue: 1 },
      timestampWrites: profiler?.pass("studio") ?? undefined,
    });
    this.env.draw(a);
    this.sphere.draw(a);
    a.end();

    // 2. the silk, on its own cleared frame target, depth-tested
    const r = f.ring;
    const segments = r.strands * Math.max(r.slots - 1, 0);
    const p = this.light.begin(enc, { depth, timestampWrites: profiler?.pass("silk") ?? undefined });
    if (r.valid >= 2 && segments > 0) {
      const buf = new ArrayBuffer(112);
      new Uint32Array(buf, 0, 4).set([r.strands, r.slots, r.head, r.valid]);
      // light per segment: about constant total light whatever the strand count
      const energy = L.energy * Math.sqrt(65536 / Math.max(r.strands, 1)) * Math.sqrt(32 / Math.max(r.slots, 2));
      new Float32Array(buf, 16, 16).set([
        L.width * pxScale,
        L.fade,
        energy,
        L.sheen,
        f.refStep,
        L.widthExponent,
        0.55,
        1.9,
        -0.42,
        0.72,
        0.55,
        L.ambient,
        2.2,
        6.5,
        0.35,
        L.sheenPower,
      ]);
      new Float32Array(buf, 80, 4).set([...BALL_CENTRE, BALL_RADIUS]);
      new Float32Array(buf, 96, 4).set([L.bands, L.phase, 0, 0]);
      this.device.queue.writeBuffer(this.params, 0, buf);
      p.setPipeline(this.pipeline);
      p.setBindGroup(0, this.silkBind(r.buffer, r.anchors));
      p.draw(4, segments);
    }
    this.light.end(enc, p);

    // 3. add the silk's light into the scene
    const b = enc.beginRenderPass({
      label: "flow-light",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "load", storeOp: "store" }],
      depthStencilAttachment: { view: depth, depthReadOnly: true },
      timestampWrites: profiler?.pass("light") ?? undefined,
    });
    this.light.composite(b, 1);
    b.end();
  }

  /** How many obstacle instances the GPU cull kept at each level of detail (tests). */
  async readSphereCounts(): Promise<number[]> {
    const staging = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "sphere-counts" });
    const enc = this.device.createCommandEncoder();
    this.sphere.copyCounts(enc, staging);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = Array.from(new Uint32Array(staging.getMappedRange().slice(0)));
    staging.destroy();
    return out.slice(0, this.sphere.levels);
  }
}
