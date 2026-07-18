import { FFT_COMMON_WGSL } from "../../../../common/common-web/src/fft-wgsl.js";
import fftWgsl from "./shaders/batch_fft.wgsl?raw";

const WORKGROUP_SIZE = 128;

export class BatchedFft2d {
  readonly module: GPUShaderModule;
  readonly allocatedBytes: number;
  private readonly n: number;
  private readonly log2n: number;
  private readonly buffers: [GPUBuffer, GPUBuffer];
  private readonly groups = new Map<string, GPUBindGroup>();
  private readonly passGroups = new Map<string, GPUBindGroup>();
  private readonly uniformBuffers: GPUBuffer[] = [];
  private readonly passBuffer: GPUBuffer;
  private readonly pipeline: GPUComputePipeline;
  private ping = 0;

  constructor(device: GPUDevice, n: number, buffers: [GPUBuffer, GPUBuffer], planeCounts: number[]) {
    this.n = n;
    this.log2n = Math.log2(n);
    if (!Number.isInteger(this.log2n)) throw new Error("FFT dimension must be a power of two");
    this.buffers = buffers;

    const dataLayout = device.createBindGroupLayout({
      label: "flow-lenia-m0-fft-data",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const passLayout = device.createBindGroupLayout({
      label: "flow-lenia-m0-fft-pass",
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }],
    });

    for (const planes of new Set(planeCounts)) {
      const uniform = device.createBuffer({
        label: `flow-lenia-m0-fft-uniform-${planes}`,
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(uniform, 0, new Uint32Array([n, planes, (n * n) / 2, 0]));
      this.uniformBuffers.push(uniform);
      for (let source = 0; source < 2; source += 1) {
        this.groups.set(
          `${planes}:${source}`,
          device.createBindGroup({
            layout: dataLayout,
            entries: [
              { binding: 0, resource: { buffer: uniform } },
              { binding: 1, resource: { buffer: buffers[source] } },
              { binding: 2, resource: { buffer: buffers[1 - source] } },
            ],
          }),
        );
      }
    }

    const combos: Array<[string, number, number, number]> = [];
    for (const axis of [0, 1]) {
      for (let stage = 0; stage < this.log2n; stage += 1) {
        for (const direction of [-1, 1]) {
          combos.push([`${axis}:${stage}:${direction}`, axis, stage, direction]);
        }
      }
    }
    this.passBuffer = device.createBuffer({
      label: "flow-lenia-m0-fft-pass-uniforms",
      size: combos.length * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.allocatedBytes = combos.length * 256 + new Set(planeCounts).size * 16;
    combos.forEach(([key, axis, stage, direction], index) => {
      const raw = new ArrayBuffer(16);
      const u32 = new Uint32Array(raw);
      const f32 = new Float32Array(raw);
      u32[0] = axis;
      u32[1] = stage;
      f32[2] = direction;
      device.queue.writeBuffer(this.passBuffer, index * 256, raw);
      this.passGroups.set(
        key,
        device.createBindGroup({
          layout: passLayout,
          entries: [
            { binding: 0, resource: { buffer: this.passBuffer, offset: index * 256, size: 16 } },
          ],
        }),
      );
    });

    this.module = device.createShaderModule({
      label: "flow-lenia-m0-batched-fft",
      code: fftWgsl.replace("//__COMMON_FFT__", FFT_COMMON_WGSL),
    });
    this.pipeline = device.createComputePipeline({
      label: "flow-lenia-m0-batched-fft",
      layout: device.createPipelineLayout({ bindGroupLayouts: [dataLayout, passLayout] }),
      compute: { module: this.module, entryPoint: "fft_pass" },
    });
  }

  get currentBuffer(): GPUBuffer { return this.buffers[this.ping]; }
  get alternateBuffer(): GPUBuffer { return this.buffers[1 - this.ping]; }
  get currentPing(): number { return this.ping; }

  resetPing(ping = 0): void { this.ping = ping; }
  swapAfterExternalWrite(): void { this.ping = 1 - this.ping; }

  encode2d(pass: GPUComputePassEncoder, planes: number, direction: -1 | 1): void {
    const butterflies = planes * this.n * this.n / 2;
    for (const axis of [0, 1]) {
      for (let stage = 0; stage < this.log2n; stage += 1) {
        const dataGroup = this.groups.get(`${planes}:${this.ping}`);
        const passGroup = this.passGroups.get(`${axis}:${stage}:${direction}`);
        if (!dataGroup || !passGroup) throw new Error("missing static FFT bind group");
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, dataGroup);
        pass.setBindGroup(1, passGroup);
        pass.dispatchWorkgroups(Math.ceil(butterflies / WORKGROUP_SIZE));
        this.ping = 1 - this.ping;
      }
    }
  }

  destroy(): void {
    this.passBuffer.destroy();
    for (const uniform of this.uniformBuffers) uniform.destroy();
  }
}
