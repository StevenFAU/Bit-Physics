import code from "./core.wgsl?raw";
export interface Parameters {
  dx: number;
  maxdt: number;
  erosion: number;
  settling: number;
  friction: number;
  boundary: number;
  negative: number;
  source: [number, number, number, number];
}
export interface Snapshot {
  data: Float32Array;
  clock: Float32Array;
  steps: number;
  params: Parameters;
}
export class CanyonGpu {
  readonly buffers: GPUBuffer[] = [];
  readonly clock: GPUBuffer;
  private uni: GPUBuffer;
  private faces: GPUBuffer;
  private totals: GPUBuffer;
  private pipelines = new Map<string, GPUComputePipeline>();
  private groups: GPUBindGroup[] = [];
  private ping = 0;
  steps = 0;
  params: Parameters;
  constructor(
    readonly device: GPUDevice,
    readonly n: number,
    params: Partial<Parameters> = {},
  ) {
    this.params = {
      dx: 32 / n,
      maxdt: 0.025,
      erosion: 8,
      settling: 0.015,
      friction: 0.012,
      boundary: 1,
      negative: 0,
      source: [16, 2, 1, 0.25],
      ...params,
    };
    const buffer = (size: number, usage: number) =>
      device.createBuffer({ size, usage });
    const storage =
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST;
    this.buffers = [buffer(n * n * 64, storage), buffer(n * n * 64, storage)];
    this.faces = buffer(2 * n * (n + 1) * 32, storage);
    this.clock = buffer(16, storage);
    this.totals = buffer((Math.ceil((n * n) / 64) + 1) * 48, storage);
    this.uni = buffer(96, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
        ...[1, 2, 3, 4, 5].map((binding) => ({
          binding,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: (binding === 1
              ? "read-only-storage"
              : "storage") as GPUBufferBindingType,
          },
        })),
      ],
    });
    const module = device.createShaderModule({ code });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    for (const entryPoint of [
      "reset",
      "reduce",
      "timestep",
      "fluxes",
      "advance",
      "edit",
      "talus",
      "statistics",
      "statisticsFinal",
    ])
      this.pipelines.set(
        entryPoint,
        device.createComputePipeline({
          layout: pl,
          compute: { module, entryPoint },
        }),
      );
    for (let i = 0; i < 2; i++)
      this.groups.push(
        device.createBindGroup({
          layout,
          entries: [
            this.uni,
            this.buffers[i],
            this.buffers[1 - i],
            this.faces,
            this.clock,
            this.totals,
          ].map((buffer, binding) => ({ binding, resource: { buffer } })),
        }),
      );
    this.write();
  }
  get current() {
    return this.buffers[this.ping];
  }
  get allocatedBytes() {
    return (
      this.buffers.reduce((a, b) => a + b.size, 0) +
      this.faces.size +
      this.totals.size +
      112
    );
  }
  write(brush = [0, 0, 1, 0], action = [0, 0, 0, 0]) {
    const data = new ArrayBuffer(96),
      u = new Uint32Array(data),
      f = new Float32Array(data),
      p = this.params;
    u[0] = this.n;
    f[1] = p.dx;
    f[2] = p.maxdt;
    f[3] = p.erosion;
    f[4] = p.settling;
    f[5] = p.friction;
    u[6] = p.boundary;
    u[7] = p.negative;
    f.set(p.source, 8);
    f.set(brush, 12);
    f.set(action, 16);
    this.device.queue.writeBuffer(this.uni, 0, data);
  }
  upload(data: Float32Array) {
    if (data.length !== this.n * this.n * 16)
      throw new Error("State dimensions differ");
    this.device.queue.writeBuffer(
      this.current,
      0,
      data as GPUAllowSharedBufferSource,
    );
  }
  private dispatch(enc: GPUCommandEncoder, name: string, x = 1, y = 1) {
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipelines.get(name)!);
    pass.setBindGroup(0, this.groups[this.ping]);
    pass.dispatchWorkgroups(x, y);
    pass.end();
  }
  step(count = 1, withTalus = true) {
    this.write();
    const enc = this.device.createCommandEncoder();
    for (let i = 0; i < count; i++) {
      this.dispatch(enc, "reset");
      this.dispatch(enc, "reduce", Math.ceil((this.n * this.n) / 64));
      this.dispatch(enc, "timestep");
      this.dispatch(enc, "fluxes", Math.ceil((2 * this.n * (this.n + 1)) / 64));
      this.dispatch(
        enc,
        "advance",
        Math.ceil(this.n / 8),
        Math.ceil(this.n / 8),
      );
      this.ping = 1 - this.ping;
      this.steps++;
      if (withTalus) {
        this.dispatch(
          enc,
          "talus",
          Math.ceil(this.n / 8),
          Math.ceil(this.n / 8),
        );
        this.ping = 1 - this.ping;
      }
    }
    this.device.queue.submit([enc.finish()]);
  }
  edit(
    kind: number,
    x: number,
    y: number,
    radius: number,
    amount: number,
    value = 1,
  ) {
    this.write([x, y, radius, amount], [kind, value, 0, 0]);
    const enc = this.device.createCommandEncoder();
    this.dispatch(enc, "edit", Math.ceil(this.n / 8), Math.ceil(this.n / 8));
    this.ping = 1 - this.ping;
    this.device.queue.submit([enc.finish()]);
  }
  async read(buffer = this.current, size = buffer.size): Promise<Float32Array> {
    const read = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(buffer, 0, read, 0, size);
      this.device.queue.submit([enc.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(read.getMappedRange().slice(0));
      read.unmap();
      return out;
    } finally {
      read.destroy();
    }
  }
  async statistics() {
    this.write();
    const enc = this.device.createCommandEncoder();
    this.dispatch(enc, "statistics", Math.ceil((this.n * this.n) / 64));
    this.dispatch(enc, "statisticsFinal");
    this.device.queue.submit([enc.finish()]);
    const [v, clock] = await Promise.all([
      this.read(this.totals, 48),
      this.read(this.clock),
    ]);
    const a = this.params.dx ** 2;
    return {
      clock,
      water: v[0] * a,
      solid: v[1] * a,
      cut: v[2] * a,
      deposited: v[3] * a,
      suspended: v[4] * a,
      storedWater: v[5] * a,
      cover: v[6] * a,
      maxSpeed: v[7],
      min: v[8],
      finite: v[9] === 0,
    };
  }
  async snapshot(): Promise<Snapshot> {
    const steps = this.steps,
      params = structuredClone(this.params);
    const [data, clock] = await Promise.all([
      this.read(),
      this.read(this.clock),
    ]);
    return { data, clock, steps, params };
  }
  restore(s: Snapshot) {
    this.upload(s.data);
    this.device.queue.writeBuffer(
      this.clock,
      0,
      s.clock as GPUAllowSharedBufferSource,
    );
    this.steps = s.steps;
    this.params = structuredClone(s.params);
    this.write();
  }
  destroy() {
    for (const b of [
      ...this.buffers,
      this.faces,
      this.uni,
      this.clock,
      this.totals,
    ])
      b.destroy();
  }
}
export function budget(data: Float32Array, dx: number) {
  let water = 0,
    solid = 0,
    cut = 0,
    deposited = 0,
    suspended = 0,
    storedWater = 0,
    cover = 0,
    min = Infinity,
    maxSpeed = 0;
  let finite = true;
  for (let i = 0; i < data.length; i += 16) {
    const h = data[i];
    water += h - data[i + 15] - data[i + 8] - data[i + 13];
    solid +=
      -data[i + 5] + data[i + 6] + data[i + 3] - data[i + 9] - data[i + 14];
    cut += data[i + 5];
    deposited += data[i + 11];
    suspended += data[i + 3];
    storedWater += h;
    cover += data[i + 6];
    min = Math.min(min, h, data[i + 3], data[i + 6]);
    maxSpeed = Math.max(
      maxSpeed,
      Math.hypot(data[i + 1], data[i + 2]) / Math.max(h, 1e-6),
    );
    for (let j = 0; j < 16; j++) finite &&= Number.isFinite(data[i + j]);
  }
  const a = dx * dx;
  return {
    water: water * a,
    solid: solid * a,
    cut: cut * a,
    deposited: deposited * a,
    suspended: suspended * a,
    storedWater: storedWater * a,
    cover: cover * a,
    min,
    maxSpeed,
    finite,
  };
}
