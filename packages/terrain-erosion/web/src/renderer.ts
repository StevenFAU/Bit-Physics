import code from "./render.wgsl?raw";
import type { CanyonGpu } from "./solver";
type Vec = [number, number, number];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec): Vec => {
  const d = Math.hypot(...a);
  return a.map((x) => x / d) as Vec;
};
function multiply(a: number[], b: number[]) {
  const r = Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        r[c * 4 + row] += a[k * 4 + row] * b[c * 4 + k];
  return r;
}
export class CanyonRenderer {
  orthographic = false;
  yaw = -0.42;
  pitch = 0.76;
  distance = 60;
  target: Vec = [0, 1, 0];
  overlay = 0;
  contours = false;
  section = false;
  sectionY = 16;
  brush = [0, 0, 1, 0];
  time = 0;
  pixelScale = 1;
  private context: GPUCanvasContext;
  private uni: GPUBuffer;
  private index: GPUBuffer;
  private count: number;
  private waterCount: number;
  private terrain: GPURenderPipeline;
  private water: GPURenderPipeline;
  private groups: GPUBindGroup[];
  private depth: GPUTexture | null = null;
  private width = 0;
  private height = 0;
  private eye: Vec = [0, 0, 0];
  private right: Vec = [1, 0, 0];
  private up: Vec = [0, 1, 0];
  private forward: Vec = [0, 0, -1];
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly gpu: CanyonGpu,
  ) {
    const d = gpu.device;
    this.context = canvas.getContext("webgpu")!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: d, format, alphaMode: "opaque" });
    this.uni = d.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const layout = d.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    this.groups = gpu.buffers.map((buffer) =>
      d.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: this.uni } },
          { binding: 1, resource: { buffer } },
          { binding: 2, resource: { buffer: gpu.clock } },
        ],
      }),
    );
    const module = d.createShaderModule({ code }),
      pipelineLayout = d.createPipelineLayout({ bindGroupLayouts: [layout] });
    const make = (water: boolean) =>
      d.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module, entryPoint: water ? "waterVertex" : "terrainVertex" },
        fragment: {
          module,
          entryPoint: water ? "waterFragment" : "terrainFragment",
          targets: [
            {
              format,
              blend: water
                ? {
                    color: {
                      srcFactor: "src-alpha",
                      dstFactor: "one-minus-src-alpha",
                    },
                    alpha: {
                      srcFactor: "one",
                      dstFactor: "one-minus-src-alpha",
                    },
                  }
                : undefined,
            },
          ],
        },
        primitive: { topology: "triangle-list", cullMode: "none" },
        depthStencil: {
          format: "depth24plus",
          depthWriteEnabled: !water,
          depthCompare: "less-equal",
        },
      });
    this.terrain = make(false);
    this.water = make(true);
    const n = gpu.n;
    this.waterCount = (n - 1) * (n - 1) * 6;
    const indices = new Uint32Array(this.waterCount + 4 * (n - 1) * 6);
    let k = 0;
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) {
        const a = y * n + x;
        indices.set([a, a + n, a + 1, a + 1, a + n, a + n + 1], k);
        k += 6;
      }
    for (let side = 0; side < 4; side++)
      for (let t = 0; t < n - 1; t++) {
        const a = n * n + (side * n + t) * 2;
        indices.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], k);
        k += 6;
      }
    this.count = indices.length;
    this.index = d.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    d.queue.writeBuffer(this.index, 0, indices);
  }
  pan(dx: number, dy: number) {
    const scale =
      (this.distance * Math.tan(0.32) * 2) /
      this.canvas.getBoundingClientRect().height;
    for (let i = 0; i < 3; i++)
      this.target[i] += (-dx * this.right[i] + dy * this.up[i]) * scale;
  }
  home() {
    this.orthographic = false;
    this.yaw = -0.42;
    this.pitch = 0.76;
    this.distance = 60;
    this.target = [0, 1, 0];
  }
  render() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(
        1,
        Math.floor(r.width * Math.min(devicePixelRatio, 1.5) * this.pixelScale),
      ),
      h = Math.max(
        1,
        Math.floor(
          r.height * Math.min(devicePixelRatio, 1.5) * this.pixelScale,
        ),
      );
    const d = this.gpu.device;
    if (w !== this.width || h !== this.height) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.width = w;
      this.height = h;
      this.depth?.destroy();
      this.depth = d.createTexture({
        size: [w, h],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    this.eye = [
      this.target[0] +
        this.distance * Math.sin(this.yaw) * Math.cos(this.pitch),
      this.target[1] + this.distance * Math.sin(this.pitch),
      this.target[2] +
        this.distance * Math.cos(this.yaw) * Math.cos(this.pitch),
    ];
    const z = norm(sub(this.eye, this.target)),
      x = norm(cross([0, 1, 0], z)),
      y = cross(z, x);
    this.right = x;
    this.up = y;
    this.forward = z.map((v) => -v) as Vec;
    const view = [
      x[0],
      y[0],
      z[0],
      0,
      x[1],
      y[1],
      z[1],
      0,
      x[2],
      y[2],
      z[2],
      0,
      -dot(x, this.eye),
      -dot(y, this.eye),
      -dot(z, this.eye),
      1,
    ];
    const f = 1 / Math.tan(0.64 / 2),
      near = 0.1,
      far = 250;
    let projection = [
      f / (w / h),
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      far / (near - far),
      -1,
      0,
      0,
      (near * far) / (near - far),
      0,
    ];
    if (this.orthographic) {
      const top = this.distance * Math.tan(0.32),
        right = (top * w) / h;
      projection = [
        1 / right,
        0,
        0,
        0,
        0,
        1 / top,
        0,
        0,
        0,
        0,
        1 / (near - far),
        0,
        0,
        0,
        near / (near - far),
        1,
      ];
    }
    const data = new Float32Array(32);
    data.set(multiply(projection, view));
    data.set([...this.eye, 1], 16);
    data.set([this.gpu.n, this.gpu.params.dx, this.overlay, this.time], 20);
    data.set(this.brush, 24);
    data.set([+this.contours, +this.section, this.sectionY, 0], 28);
    d.queue.writeBuffer(this.uni, 0, data);
    const enc = d.createCommandEncoder(),
      pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: { r: 0.047, g: 0.071, b: 0.082, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: this.depth!.createView(),
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });
    pass.setBindGroup(
      0,
      this.groups[this.gpu.buffers.indexOf(this.gpu.current)],
    );
    pass.setIndexBuffer(this.index, "uint32");
    pass.setPipeline(this.terrain);
    pass.drawIndexed(this.count);
    pass.setPipeline(this.water);
    pass.drawIndexed(this.waterCount);
    pass.end();
    d.queue.submit([enc.finish()]);
  }
  pick(
    clientX: number,
    clientY: number,
    field: Float32Array | null,
  ): [number, number] | null {
    const rect = this.canvas.getBoundingClientRect(),
      sx =
        (((((clientX - rect.left) / rect.width) * 2 - 1) * rect.width) /
          rect.height) *
        Math.tan(0.32),
      sy = (1 - ((clientY - rect.top) / rect.height) * 2) * Math.tan(0.32);
    const ray = this.orthographic
        ? this.forward
        : norm(
            this.forward.map(
              (f, i) => f + sx * this.right[i] + sy * this.up[i],
            ) as Vec,
          ),
      n = this.gpu.n,
      dx = this.gpu.params.dx;
    const origin = this.orthographic
      ? this.eye.map(
          (v, i) => v + this.distance * (sx * this.right[i] + sy * this.up[i]),
        )
      : this.eye;
    const point = (t: number) => origin.map((v, i) => v + t * ray[i]) as Vec;
    const height = (p: Vec) => {
      const X = p[0] + 16,
        Y = p[2] + 16;
      if (X < 0 || Y < 0 || X > n * dx || Y > n * dx) return -Infinity;
      const i =
        (Math.min(n - 1, Math.floor(Y / dx)) * n +
          Math.min(n - 1, Math.floor(X / dx))) *
        16;
      return field ? field[i + 4] - field[i + 5] + field[i + 6] / 0.65 : 2;
    };
    for (let t = 0.1; t < 130; t += 0.2) {
      const p = point(t);
      if (p[1] <= height(p)) {
        let lo = t - 0.2,
          hi = t;
        for (let j = 0; j < 8; j++) {
          const mid = (lo + hi) / 2,
            q = point(mid);
          if (q[1] > height(q)) lo = mid;
          else hi = mid;
        }
        const q = point((lo + hi) / 2);
        return [q[0] + 16, q[2] + 16];
      }
    }
    return null;
  }
  destroy() {
    this.index.destroy();
    this.uni.destroy();
    this.depth?.destroy();
  }
}
