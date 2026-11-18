// Slice's cutting plane in the 3D view (slice-plane.wgsl): drawn additively
// in the light pass, depth-tested against the fixed points.

import { wgsl } from "@bp/gpu";
import { DEPTH_FORMAT, SCENE_FORMAT } from "@bp/render";
import type { View3D } from "@bp/render";
import src from "./slice-plane.wgsl?raw";

export interface SliceDraw {
  counts: GPUBuffer;
  total: GPUBuffer;
  plane: number;
  box: [number, number, number, number];
  bins: number;
}

export class SlicePlane {
  private readonly params: GPUBuffer;
  private bind: GPUBindGroup | null = null;
  private key: GPUBuffer | null = null;

  private constructor(
    private readonly device: GPUDevice,
    private readonly view: View3D,
    private readonly pipe: GPURenderPipeline,
  ) {
    this.params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "slice-plane" });
  }

  static async create(device: GPUDevice, view: View3D): Promise<SlicePlane> {
    const module = device.createShaderModule({ code: wgsl(src), label: "slice-plane" });
    const pipe = await device.createRenderPipelineAsync({
      label: "slice-plane",
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [{ format: SCENE_FORMAT, blend: { color: { operation: "add", srcFactor: "one", dstFactor: "one" }, alpha: { operation: "add", srcFactor: "one", dstFactor: "one" } } }],
      },
      primitive: { topology: "triangle-list" },
      depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: "less-equal" },
    });
    return new SlicePlane(device, view, pipe);
  }

  draw(pass: GPURenderPassEncoder, s: SliceDraw, sheet: number, layers: number): void {
    if (this.key !== s.counts || !this.bind) {
      this.key = s.counts;
      this.bind = this.device.createBindGroup({
        layout: this.pipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.view.buffer } },
          { binding: 1, resource: { buffer: this.params } },
          { binding: 2, resource: { buffer: s.counts } },
          { binding: 3, resource: { buffer: s.total } },
        ],
      });
    }
    this.device.queue.writeBuffer(this.params, 0, new Float32Array([...s.box, s.plane, sheet, layers, s.bins]));
    pass.setPipeline(this.pipe);
    pass.setBindGroup(0, this.bind);
    pass.draw(6);
  }
}
