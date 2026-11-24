// Near birds and the falcon (07-boids-3d.md, "The look", near field; M1):
// near-cull.wgsl gives every bird a cross-fade weight from its projected
// wingspan and lists the ones to draw as meshes; near-birds.wgsl draws them
// (and the falcon) into a 4× multisampled target, resolved into `nearTex`,
// which the composite lays over the scene. tau.wgsl reads the same weights,
// so a bird's coverage is split between the two, never doubled.

import { wgsl } from "@bp/gpu";
import { SCENE_FORMAT } from "@bp/render";
import type { View3D } from "@bp/render";
import cullSrc from "./near-cull.wgsl?raw";
import birdSrc from "./near-birds.wgsl?raw";

/** Vertices of one bird: 8 triangles. */
const VERTS = 24;
const SAMPLES = 4;

export interface NearLook {
  /** Wingspan px where the cross-fade starts and where a bird is all mesh. */
  px0: number;
  px1: number;
  /** The birds' share of the sky light behind them, and the rim's. */
  tint: number;
  rim: number;
  /** The falcon is never drawn smaller than this wingspan, px. */
  falconPx: number;
}

export const DEFAULT_NEAR: NearLook = { px0: 12, px1: 20, tint: 0.03, rim: 0.22, falconPx: 14 };

export interface FalconDraw {
  position: [number, number, number];
  heading: [number, number, number];
  roll: number;
  wingspan: number;
}

export class NearBirds {
  look: NearLook = { ...DEFAULT_NEAR };
  readonly weights: GPUBuffer;
  private readonly list: GPUBuffer;
  readonly args: GPUBuffer;
  private readonly params: GPUBuffer;
  private msaa: GPUTexture | null = null;
  private msaaDepth: GPUTexture | null = null;
  private resolved: GPUTexture | null = null;
  private w = 0;
  private h = 0;
  private cullBinds = new Map<GPUBuffer, GPUBindGroup>();
  private drawBinds = new Map<GPUBuffer, GPUBindGroup>();
  private sceneBind: { view: GPUTextureView; bind: GPUBindGroup; falcon: GPUBindGroup } | null = null;
  private falconBind: GPUBindGroup | null = null;
  private compBind: GPUBindGroup | null = null;
  private readonly argsReset = new Uint32Array([VERTS, 0, 0, 0]);

  private constructor(
    private readonly device: GPUDevice,
    private readonly view3d: View3D,
    readonly capacity: number,
    private readonly cullPipe: GPUComputePipeline,
    private readonly birdPipe: GPURenderPipeline,
    private readonly falconPipe: GPURenderPipeline,
    private readonly compPipe: GPURenderPipeline,
  ) {
    const S = GPUBufferUsage.STORAGE;
    this.weights = device.createBuffer({ size: capacity * 4, usage: S | GPUBufferUsage.COPY_SRC, label: "murmur-near-w" });
    // room for every bird: a list that could overflow would pick its meshes in atomic
    // order, which changes from frame to frame — measured as flicker (status note)
    this.list = device.createBuffer({ size: capacity * 8, usage: S, label: "murmur-near-list" });
    this.args = device.createBuffer({ size: 16, usage: S | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label: "murmur-near-args" });
    this.params = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "murmur-near" });
  }

  static async create(device: GPUDevice, view3d: View3D, capacity: number, compModule: GPUShaderModule): Promise<NearBirds> {
    const cullModule = device.createShaderModule({ code: wgsl(cullSrc), label: "murmur-near-cull" });
    const birdModule = device.createShaderModule({ code: wgsl(birdSrc), label: "murmur-near-birds" });
    const over: GPUBlendState = { color: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" } };
    const mesh = (entryPoint: string): Promise<GPURenderPipeline> =>
      device.createRenderPipelineAsync({
        label: `murmur-${entryPoint}`,
        layout: "auto",
        vertex: { module: birdModule, entryPoint },
        fragment: { module: birdModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT, blend: over }] },
        primitive: { topology: "triangle-list", cullMode: "none" },
        depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
        multisample: { count: SAMPLES },
      });
    const [cullPipe, birdPipe, falconPipe, compPipe] = await Promise.all([
      device.createComputePipelineAsync({ label: "murmur-near-cull", layout: "auto", compute: { module: cullModule, entryPoint: "cull" } }),
      mesh("vs_bird"),
      mesh("vs_falcon"),
      device.createRenderPipelineAsync({
        label: "murmur-near-composite",
        layout: "auto",
        vertex: { module: compModule, entryPoint: "vs" },
        fragment: { module: compModule, entryPoint: "fs_near", targets: [{ format: SCENE_FORMAT, blend: over }] },
      }),
    ]);
    return new NearBirds(device, view3d, capacity, cullPipe, birdPipe, falconPipe, compPipe);
  }

  private ensureTargets(w: number, h: number): void {
    if (this.msaa && this.w === w && this.h === h) return;
    this.msaa?.destroy();
    this.msaaDepth?.destroy();
    this.resolved?.destroy();
    this.w = w;
    this.h = h;
    this.msaa = this.device.createTexture({ size: [w, h], format: SCENE_FORMAT, sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT, label: "murmur-near-msaa" });
    this.msaaDepth = this.device.createTexture({ size: [w, h], format: "depth24plus", sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT, label: "murmur-near-depth" });
    this.resolved = this.device.createTexture({ size: [w, h], format: SCENE_FORMAT, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC, label: "murmur-near" });
    this.compBind = this.device.createBindGroup({
      label: "murmur-near-composite",
      layout: this.compPipe.getBindGroupLayout(0),
      entries: [{ binding: 2, resource: this.resolved.createView() }],
    });
  }

  /** The resolved near-bird layer (premultiplied), for tests. */
  get texture(): GPUTexture | null {
    return this.resolved;
  }

  writeParams(birds: number, wingspan: number, timeSec: number, falcon: FalconDraw | null): void {
    const L = this.look;
    const b = new ArrayBuffer(80);
    const u = new Uint32Array(b);
    const f = new Float32Array(b);
    u.set([birds, this.capacity, this.view3d.width, this.view3d.height], 0);
    f.set([wingspan, L.px0, L.px1, timeSec], 4);
    f.set([...(falcon?.position ?? [0, 0, 0]), falcon?.wingspan ?? 0.5], 8);
    f.set([...(falcon?.heading ?? [0, 0, -1]), falcon?.roll ?? 0], 12);
    f.set([L.falconPx, falcon ? 1 : 0, L.tint, L.rim], 16);
    this.device.queue.writeBuffer(this.params, 0, b);
    this.device.queue.writeBuffer(this.args, 0, this.argsReset);
  }

  /** Weights and the instance list (before the splat, which reads the weights). */
  encodeCull(enc: GPUCommandEncoder, agents: GPUBuffer, birds: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    let bind = this.cullBinds.get(agents);
    if (!bind) {
      bind = this.device.createBindGroup({
        label: "murmur-near-cull",
        layout: this.cullPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.view3d.buffer } },
          { binding: 1, resource: { buffer: this.params } },
          { binding: 2, resource: { buffer: agents } },
          { binding: 3, resource: { buffer: this.weights } },
          { binding: 4, resource: { buffer: this.list } },
          { binding: 5, resource: { buffer: this.args } },
        ],
      });
      this.cullBinds.set(agents, bind);
    }
    const c = enc.beginComputePass({ label: "murmur-near-cull", timestampWrites });
    c.setPipeline(this.cullPipe);
    c.setBindGroup(0, bind);
    c.dispatchWorkgroups(Math.max(1, Math.ceil(birds / 64)));
    c.end();
  }

  /** The meshes, into the multisampled target, resolved (reads the sky from `sceneView`). */
  encodeDraw(enc: GPUCommandEncoder, agents: GPUBuffer, sceneView: GPUTextureView, w: number, h: number, falcon: boolean, timestampWrites?: GPURenderPassTimestampWrites): void {
    this.ensureTargets(w, h);
    let bind = this.drawBinds.get(agents);
    if (!bind) {
      bind = this.device.createBindGroup({
        label: "murmur-near-draw",
        layout: this.birdPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.view3d.buffer } },
          { binding: 1, resource: { buffer: this.params } },
          { binding: 2, resource: { buffer: agents } },
          { binding: 3, resource: { buffer: this.list } },
        ],
      });
      this.drawBinds.set(agents, bind);
    }
    if (this.sceneBind?.view !== sceneView) {
      this.sceneBind = {
        view: sceneView,
        bind: this.device.createBindGroup({ label: "murmur-near-sky", layout: this.birdPipe.getBindGroupLayout(1), entries: [{ binding: 0, resource: sceneView }] }),
        falcon: this.device.createBindGroup({ label: "murmur-falcon-sky", layout: this.falconPipe.getBindGroupLayout(1), entries: [{ binding: 0, resource: sceneView }] }),
      };
    }
    const p = enc.beginRenderPass({
      label: "murmur-near",
      colorAttachments: [{ view: this.msaa!.createView(), resolveTarget: this.resolved!.createView(), loadOp: "clear", storeOp: "discard", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
      depthStencilAttachment: { view: this.msaaDepth!.createView(), depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
      timestampWrites,
    });
    p.setPipeline(this.birdPipe);
    p.setBindGroup(0, bind);
    p.setBindGroup(1, this.sceneBind.bind);
    p.drawIndirect(this.args, 0);
    if (falcon) {
      p.setPipeline(this.falconPipe);
      this.falconBind ??= this.device.createBindGroup({
        label: "murmur-falcon",
        layout: this.falconPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.view3d.buffer } },
          { binding: 1, resource: { buffer: this.params } },
        ],
      });
      p.setBindGroup(0, this.falconBind);
      p.setBindGroup(1, this.sceneBind.falcon);
      p.draw(VERTS);
    }
    p.end();
  }

  /** Lay the resolved near layer over the scene (inside the composite pass). */
  composite(pass: GPURenderPassEncoder): void {
    if (!this.compBind) return;
    pass.setPipeline(this.compPipe);
    pass.setBindGroup(0, this.compBind);
    pass.draw(3);
  }

  /** How many birds the last cull drew as meshes (tests). */
  async readCount(): Promise<number> {
    const staging = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.args, 0, staging, 0, 16);
    this.device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const n = new Uint32Array(staging.getMappedRange())[1]!;
    staging.unmap();
    staging.destroy();
    return n;
  }
}
