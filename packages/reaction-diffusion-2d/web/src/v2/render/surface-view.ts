// "On a Shape" — draws the simulation on its surface into the HDR scene
// target through an OrbitCamera (render/surface.wgsl). The palette's look
// carries over: on light palettes the bare surface is the palette's paper
// and the backdrop a deeper shade of it; on dark ones the surface is a
// lifted ink and the pattern the palette's enamel.

import type { GpuProfiler } from "@bp/gpu";
import type { FieldLook, OrbitCamera } from "@bp/render";
import { SCENE_FORMAT, toLinear } from "@bp/render";
import type { SurfaceMesh } from "../model/surface-mesh.js";
import surfaceSrc from "./surface.wgsl?raw";

const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

interface MeshBinding {
  mesh: SurfaceMesh;
  state: GPUBuffer;
  buffers: GPUBuffer[];
  index: GPUBuffer;
  prepBG: GPUBindGroup;
  drawBG: GPUBindGroup;
}

export class SurfaceView {
  look: FieldLook;
  tone: "dark" | "light" = "dark";
  /** Which field is drawn (models.ts `show`) and its coverage ramp. */
  channel: 0 | 1 = 1;
  coverage: readonly [number, number] = [0.07, 0.3];

  private readonly device: GPUDevice;
  private readonly uniform: GPUBuffer;
  private readonly displacePipe: GPUComputePipeline;
  private readonly normalsPipe: GPUComputePipeline;
  private readonly backPipe: GPURenderPipeline;
  private readonly surfPipe: GPURenderPipeline;
  private readonly backBG: GPUBindGroup;
  private bound: MeshBinding | null = null;
  private depth: GPUTexture | null = null;

  constructor(device: GPUDevice, look: FieldLook) {
    this.device = device;
    this.look = look;
    const module = device.createShaderModule({ code: surfaceSrc, label: "rd-surface-view" });
    this.uniform = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "rd-surface-view" });
    this.displacePipe = device.createComputePipeline({ label: "rd-surface-displace", layout: "auto", compute: { module, entryPoint: "displace" } });
    this.normalsPipe = device.createComputePipeline({ label: "rd-surface-normals", layout: "auto", compute: { module, entryPoint: "normals" } });
    const depthStencil: GPUDepthStencilState = { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: "less" };
    this.backPipe = device.createRenderPipeline({
      label: "rd-surface-backdrop",
      layout: "auto",
      vertex: { module, entryPoint: "vs_back" },
      fragment: { module, entryPoint: "fs_back", targets: [{ format: SCENE_FORMAT }] },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: "always" },
    });
    this.surfPipe = device.createRenderPipeline({
      label: "rd-surface-draw",
      layout: "auto",
      vertex: { module, entryPoint: "vs_surf" },
      fragment: { module, entryPoint: "fs_surf", targets: [{ format: SCENE_FORMAT }] },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil,
    });
    this.backBG = device.createBindGroup({
      layout: this.backPipe.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniform } }],
      label: "rd-surface-backdrop",
    });
  }

  /** Point the view at a surface and its simulation state (cheap when unchanged). */
  setMesh(mesh: SurfaceMesh, state: GPUBuffer): void {
    if (this.bound && this.bound.mesh === mesh && this.bound.state === state) return;
    this.release();
    const d = this.device;
    const buffers: GPUBuffer[] = [];
    const storage = (data: Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer> | null, bytes: number, label: string): GPUBuffer => {
      const b = d.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label });
      if (data) d.queue.writeBuffer(b, 0, data);
      buffers.push(b);
      return b;
    };
    const pos = storage(mesh.pos, mesh.pos.byteLength, "rd-surface-view-pos");
    const nrm = storage(mesh.nrm, mesh.nrm.byteLength, "rd-surface-view-nrm");
    const nbr = storage(mesh.nbr, mesh.nbr.byteLength, "rd-surface-view-nbr");
    const disp = storage(null, mesh.cells * 16, "rd-surface-view-disp");
    const shade = storage(null, mesh.cells * 16, "rd-surface-view-shade");
    const index = d.createBuffer({ size: mesh.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST, label: "rd-surface-index" });
    d.queue.writeBuffer(index, 0, mesh.indices);
    buffers.push(index);
    const prepBG = d.createBindGroup({
      layout: this.displacePipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: state } },
        { binding: 2, resource: { buffer: pos } },
        { binding: 3, resource: { buffer: nrm } },
        { binding: 5, resource: { buffer: disp } },
      ],
      label: "rd-surface-displace",
    });
    const normalsBG = d.createBindGroup({
      layout: this.normalsPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: state } },
        { binding: 3, resource: { buffer: nrm } },
        { binding: 4, resource: { buffer: nbr } },
        { binding: 5, resource: { buffer: disp } },
        { binding: 6, resource: { buffer: shade } },
      ],
      label: "rd-surface-normals",
    });
    const drawBG = d.createBindGroup({
      layout: this.surfPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 7, resource: { buffer: disp } },
        { binding: 8, resource: { buffer: shade } },
      ],
      label: "rd-surface-draw",
    });
    this.bound = { mesh, state, buffers, index, prepBG, drawBG };
    this.normalsBG = normalsBG;
  }

  private normalsBG: GPUBindGroup | null = null;

  /** World-space relief of the raised pattern: a quarter of a typical feature's radius. */
  private relief(): number {
    const m = this.bound!.mesh;
    return (this.look.relief * 1.6) / m.scale;
  }

  private writeUniform(camera: OrbitCamera, w: number, h: number): void {
    const L = this.look;
    const light = this.tone === "light";
    const paper = toLinear(L.background);
    const ink = toLinear(L.ink);
    // light palettes: paper surface on a deeper backdrop; dark: lifted ink surface, enamel pattern
    const base: [number, number, number] = light ? paper : [paper[0] * 2.2 + 0.012, paper[1] * 2.2 + 0.012, paper[2] * 2.2 + 0.014];
    const backdrop: [number, number, number] = light
      ? [paper[0] * 0.42, paper[1] * 0.42, paper[2] * 0.42]
      : [paper[0] * 1.15, paper[1] * 1.15, paper[2] * 1.15];
    const key = (() => {
      const k = [0.45, 0.75, 0.55];
      const n = Math.hypot(k[0]!, k[1]!, k[2]!);
      return k.map((x) => x / n);
    })();
    // contact shadow under the shape's lowest point
    const m = this.bound!.mesh;
    const low = m.shape === "torus" ? -0.55 : -1.05;
    const [sx, sy] = camera.project([0, low, 0]);
    const [ex] = camera.project([1, low, 0]);
    const rx = Math.max(Math.abs(ex - sx), 40) * (m.shape === "torus" ? 1.5 : 1.0);
    const f = new Float32Array(64);
    f.set(camera.viewProjection(), 0);
    f.set([...camera.eye(), 0], 16);
    f.set([...backdrop, L.grain], 20);
    f.set([...base, light ? 0.35 : 0.25], 24);
    f.set([...ink, L.gloss], 28);
    f.set([...toLinear(L.accent), L.shininess], 32);
    f.set([...toLinear(L.rim), L.rimAmount], 36);
    f.set([key[0]!, key[1]!, key[2]!, this.relief()], 40);
    f.set([this.coverage[0], this.coverage[1], m.cells, this.channel], 44);
    const k = w / Math.max(camera.viewW, 1); // CSS px → target px
    f.set([sx * k, (sy + 8) * k, rx * k, rx * 0.28 * k], 48);
    f.set([w, h, light ? 1 : 0, 0], 52);
    this.device.queue.writeBuffer(this.uniform, 0, f);
  }

  /** Record prep + draw into `target` (the HDR scene view), w × h target px, camera in CSS px. */
  encode(enc: GPUCommandEncoder, target: GPUTextureView, w: number, h: number, camera: OrbitCamera, cssScale: number, profiler?: GpuProfiler): void {
    const b = this.bound;
    if (!b || !this.normalsBG) return;
    if (!this.depth || this.depth.width !== w || this.depth.height !== h) {
      this.depth?.destroy();
      this.depth = this.device.createTexture({ size: [w, h], format: DEPTH_FORMAT, usage: GPUTextureUsage.RENDER_ATTACHMENT, label: "rd-surface-depth" });
    }
    this.writeUniform(camera, camera.viewW * cssScale, camera.viewH * cssScale);
    // the shadow centre/radii are in target px
    const groups = Math.ceil(b.mesh.cells / 64);
    const prep = enc.beginComputePass({ label: "rd-surface-prep", timestampWrites: profiler?.pass("surface-prep") });
    prep.setPipeline(this.displacePipe);
    prep.setBindGroup(0, b.prepBG);
    prep.dispatchWorkgroups(groups);
    prep.setPipeline(this.normalsPipe);
    prep.setBindGroup(0, this.normalsBG);
    prep.dispatchWorkgroups(groups);
    prep.end();
    const rp = enc.beginRenderPass({
      label: "rd-surface-draw",
      colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      depthStencilAttachment: { view: this.depth.createView(), depthLoadOp: "clear", depthClearValue: 1, depthStoreOp: "discard" },
      timestampWrites: profiler?.pass("surface-draw"),
    });
    rp.setPipeline(this.backPipe);
    rp.setBindGroup(0, this.backBG);
    rp.draw(3);
    rp.setPipeline(this.surfPipe);
    rp.setBindGroup(0, b.drawBG);
    rp.setIndexBuffer(b.index, "uint32");
    rp.drawIndexed(b.mesh.indices.length);
    rp.end();
  }

  private release(): void {
    if (!this.bound) return;
    for (const buf of this.bound.buffers) buf.destroy();
    this.bound = null;
    this.normalsBG = null;
  }

  destroy(): void {
    this.release();
    this.depth?.destroy();
    this.uniform.destroy();
  }
}
