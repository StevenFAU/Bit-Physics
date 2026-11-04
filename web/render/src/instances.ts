// Instances (00-foundation.md § 3.4, F3): many copies of a procedural mesh —
// spheres, fish, birds — culled against the frustum and sorted into levels
// of detail on the GPU, then drawn lit and opaque with depth, one indirect
// draw per level. A sim fills the instance buffer from the CPU (`set`) or
// writes it from its own kernels (`buffer`, STORAGE): 12 floats per
// instance — centre xyz + radius, orientation quaternion xyzw, linear albedo
// rgb + emissive strength.

import { wgsl } from "@bp/gpu";
import "./register.js";
import { SCENE_FORMAT } from "./hdr.js";
import type { MeshData } from "./mesh.js";
import { packLods } from "./mesh.js";
import type { View3D } from "./view3d.js";
import { DEPTH_FORMAT } from "./view3d.js";
import instancesSrc from "./wgsl/instances.wgsl?raw";

export const INSTANCE_FLOATS = 12;

export interface InstanceLook {
  /** Key light direction in view space (towards the light). */
  key: readonly [number, number, number];
  ambient: number;
  diffuse: number;
  rim: number;
  rimPower: number;
  gain: number;
}

export const DEFAULT_INSTANCE_LOOK: InstanceLook = { key: [-0.45, 0.7, 0.55], ambient: 0.25, diffuse: 0.9, rim: 0.35, rimPower: 3, gain: 1 };

export interface InstancesOptions {
  /** Meshes, finest first (at most 4). */
  lods: readonly MeshData[];
  /** Projected radius (px) at which each finer level starts; length = lods − 1. */
  lodPx: readonly number[];
  capacity: number;
  format?: GPUTextureFormat;
  depthFormat?: GPUTextureFormat;
  label?: string;
}

const align = (n: number, a: number): number => Math.ceil(n / a) * a;

export class Instances {
  /** The instance records (STORAGE | COPY_DST), 48 bytes each. */
  readonly buffer: GPUBuffer;
  readonly capacity: number;
  readonly levels: number;
  look: InstanceLook = { ...DEFAULT_INSTANCE_LOOK };
  /** Instances in the buffer (set by `set`, or by the sim when its kernels write `buffer`). */
  count = 0;
  private readonly vbuf: GPUBuffer;
  private readonly ibuf: GPUBuffer;
  private readonly visible: GPUBuffer;
  private readonly counts: GPUBuffer;
  private readonly args: GPUBuffer;
  private readonly cullParams: GPUBuffer;
  private readonly levelParams: GPUBuffer;
  private readonly lookParams: GPUBuffer;
  private readonly cullBind: GPUBindGroup;
  private readonly argsBind: GPUBindGroup;
  private readonly viewBind: GPUBindGroup;
  private readonly levelBinds: GPUBindGroup[];
  private readonly listStride: number;
  private readonly ranges: { indexCount: number; firstIndex: number; baseVertex: number }[];
  private readonly lodPx: number[];

  private constructor(
    private readonly device: GPUDevice,
    view: View3D,
    private readonly cullPipe: GPUComputePipeline,
    private readonly argsPipe: GPUComputePipeline,
    private readonly drawPipe: GPURenderPipeline,
    o: InstancesOptions,
  ) {
    const label = o.label ?? "instances";
    this.capacity = Math.max(1, o.capacity);
    this.levels = Math.min(4, o.lods.length);
    this.lodPx = [...o.lodPx];
    const packed = packLods(o.lods.slice(0, this.levels));
    this.ranges = packed.ranges;
    this.vbuf = device.createBuffer({ size: packed.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, label: `${label}-vertices` });
    this.ibuf = device.createBuffer({ size: packed.indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST, label: `${label}-indices` });
    device.queue.writeBuffer(this.vbuf, 0, packed.vertices);
    device.queue.writeBuffer(this.ibuf, 0, packed.indices);
    this.buffer = device.createBuffer({
      size: this.capacity * INSTANCE_FLOATS * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      label: `${label}-records`,
    });
    // each level's list starts on a storage-offset boundary (256 bytes)
    this.listStride = align(this.capacity * 4, 256) / 4;
    this.visible = device.createBuffer({ size: this.listStride * 4 * this.levels, usage: GPUBufferUsage.STORAGE, label: `${label}-visible` });
    this.counts = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label: `${label}-counts` });
    this.args = device.createBuffer({ size: 4 * 20, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT, label: `${label}-args` });
    this.cullParams = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-cull` });
    this.levelParams = device.createBuffer({ size: 256 * this.levels, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-levels` });
    this.lookParams = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-look` });
    for (let l = 0; l < this.levels; l += 1) {
      device.queue.writeBuffer(this.levelParams, l * 256, new Uint32Array([l * this.listStride, 0, 0, 0]));
    }
    this.cullBind = device.createBindGroup({
      label: `${label}-cull`,
      layout: cullPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: view.buffer } },
        { binding: 1, resource: { buffer: this.cullParams } },
        { binding: 2, resource: { buffer: this.buffer } },
        { binding: 3, resource: { buffer: this.visible } },
        { binding: 4, resource: { buffer: this.counts } },
      ],
    });
    this.argsBind = device.createBindGroup({
      label: `${label}-args`,
      layout: argsPipe.getBindGroupLayout(0),
      entries: [
        { binding: 1, resource: { buffer: this.cullParams } },
        { binding: 4, resource: { buffer: this.counts } },
        { binding: 5, resource: { buffer: this.args } },
      ],
    });
    this.viewBind = device.createBindGroup({
      label: `${label}-view`,
      layout: drawPipe.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: view.buffer } }],
    });
    this.levelBinds = [];
    for (let l = 0; l < this.levels; l += 1) {
      this.levelBinds.push(
        device.createBindGroup({
          label: `${label}-level-${l}`,
          layout: drawPipe.getBindGroupLayout(1),
          entries: [
            { binding: 0, resource: { buffer: this.levelParams, offset: l * 256, size: 16 } },
            { binding: 1, resource: { buffer: this.lookParams } },
            { binding: 2, resource: { buffer: this.visible } },
            { binding: 3, resource: { buffer: this.buffer } },
          ],
        }),
      );
    }
  }

  static async create(device: GPUDevice, view: View3D, o: InstancesOptions): Promise<Instances> {
    const label = o.label ?? "instances";
    const module = device.createShaderModule({ code: wgsl(instancesSrc), label });
    const [cull, args, draw] = await Promise.all([
      device.createComputePipelineAsync({ label: `${label}-cull`, layout: "auto", compute: { module, entryPoint: "cull" } }),
      device.createComputePipelineAsync({ label: `${label}-args`, layout: "auto", compute: { module, entryPoint: "write_args" } }),
      device.createRenderPipelineAsync({
        label,
        layout: "auto",
        vertex: {
          module,
          entryPoint: "vs",
          buffers: [
            {
              arrayStride: 24,
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x3" },
                { shaderLocation: 1, offset: 12, format: "float32x3" },
              ],
            },
          ],
        },
        fragment: { module, entryPoint: "fs", targets: [{ format: o.format ?? SCENE_FORMAT }] },
        primitive: { topology: "triangle-list", cullMode: "back" },
        depthStencil: { format: o.depthFormat ?? DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: "less" },
      }),
    ]);
    return new Instances(device, view, cull, args, draw, o);
  }

  /** Upload `count` instance records (12 floats each) from the CPU. */
  set(records: Float32Array, count = Math.floor(records.length / INSTANCE_FLOATS)): void {
    this.count = Math.min(count, this.capacity);
    if (this.count > 0) this.device.queue.writeBuffer(this.buffer, 0, records, 0, this.count * INSTANCE_FLOATS);
  }

  /** Record the cull + indirect-args passes (before the scene render pass). */
  encodeCull(enc: GPUCommandEncoder, timestampWrites?: GPUComputePassTimestampWrites): void {
    const buf = new ArrayBuffer(96);
    new Uint32Array(buf, 0, 4).set([this.count, this.levels, this.listStride, 0]);
    new Float32Array(buf, 16, 4).set([this.lodPx[0] ?? 0, this.lodPx[1] ?? 0, this.lodPx[2] ?? 0, 0]);
    const r = new Uint32Array(buf, 32, 16);
    this.ranges.forEach((x, i) => r.set([x.indexCount, x.firstIndex, x.baseVertex, 0], i * 4));
    this.device.queue.writeBuffer(this.cullParams, 0, buf);
    const l = this.look;
    this.device.queue.writeBuffer(this.lookParams, 0, new Float32Array([...l.key, l.ambient, l.diffuse, l.rim, l.rimPower, l.gain]));
    enc.clearBuffer(this.counts);
    const pass = enc.beginComputePass({ label: "instances-cull", timestampWrites });
    if (this.count > 0) {
      pass.setPipeline(this.cullPipe);
      pass.setBindGroup(0, this.cullBind);
      pass.dispatchWorkgroups(Math.ceil(this.count / 64));
    }
    pass.setPipeline(this.argsPipe);
    pass.setBindGroup(0, this.argsBind);
    pass.dispatchWorkgroups(1);
    pass.end();
  }

  /** Draw every visible instance (depth-tested, depth-writing) into a scene pass. */
  draw(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.drawPipe);
    pass.setBindGroup(0, this.viewBind);
    pass.setVertexBuffer(0, this.vbuf);
    pass.setIndexBuffer(this.ibuf, "uint32");
    for (let l = 0; l < this.levels; l += 1) {
      pass.setBindGroup(1, this.levelBinds[l]!);
      pass.drawIndexedIndirect(this.args, l * 20);
    }
  }

  /** Copy the per-level visible counts into `dst` (COPY_DST | MAP_READ, ≥ 16 bytes). */
  copyCounts(enc: GPUCommandEncoder, dst: GPUBuffer): void {
    enc.copyBufferToBuffer(this.counts, 0, dst, 0, 16);
  }

  destroy(): void {
    for (const b of [this.vbuf, this.ibuf, this.buffer, this.visible, this.counts, this.args, this.cullParams, this.levelParams, this.lookParams]) b.destroy();
  }
}
