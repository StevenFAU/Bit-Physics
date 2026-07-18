import type { EcosystemView } from "../experiments/ecosystem-cards.js";
import type { FlowLeniaEcosystemSolver } from "../model/ecosystem-solver.js";
import renderWgsl from "../shaders/render_ecosystem.wgsl?raw";

const VIEW_INDEX: Record<EcosystemView, number> = { lineage: 0, phenotype: 1, density: 2, flow: 3 };

export class EcosystemRenderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly uniform: GPUBuffer;
  private readonly layout: GPUBindGroupLayout;
  private readonly pipeline: GPURenderPipeline;
  private solvers: FlowLeniaEcosystemSolver[] = [];
  private groups: Array<[GPUBindGroup, GPUBindGroup]> = [];
  private view: EcosystemView = "lineage";
  private center: [number, number] = [0, 0];
  private zoom = 1;
  private inspection: [number, number, number] = [0, 0, 8];

  constructor(device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement, format: GPUTextureFormat) {
    this.device = device;
    this.context = context;
    this.canvas = canvas;
    this.uniform = device.createBuffer({ size: 256 * 3, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 80 } },
        ...Array.from({ length: 6 }, (_, index) => ({ binding: index + 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" as const } })),
      ],
    });
    const module = device.createShaderModule({ label: "flow-lenia-m4-ecosystem-render", code: renderWgsl });
    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.layout] }),
      vertex: { module, entryPoint: "vertex_main" },
      fragment: { module, entryPoint: "fragment_main", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
  }

  setSolvers(solvers: readonly FlowLeniaEcosystemSolver[]): void {
    this.solvers = [...solvers].slice(0, 3);
    this.groups = this.solvers.map((solver) => [0, 1].map((ping) => this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: this.uniform, size: 80 } },
        { binding: 1, resource: { buffer: solver.mass[ping] as GPUBuffer } },
        { binding: 2, resource: { buffer: solver.genomeH[ping] as GPUBuffer } },
        { binding: 3, resource: { buffer: solver.genomeQ[ping] as GPUBuffer } },
        { binding: 4, resource: { buffer: solver.identity[ping] as GPUBuffer } },
        { binding: 5, resource: { buffer: solver.transport } },
        { binding: 6, resource: { buffer: solver.diagnostic } },
      ],
    })) as [GPUBindGroup, GPUBindGroup]);
    const n = this.solvers[0]?.n ?? 256;
    this.center = [n / 2, n / 2];
  }

  setView(view: EcosystemView): void { this.view = view; }
  getView(): EcosystemView { return this.view; }
  setInspection(row: number, column: number, radius: number): void { this.inspection = [row, column, radius]; }
  setZoom(zoom: number): void { this.zoom = Math.max(0.5, Math.min(8, zoom)); }
  getZoom(): number { return this.zoom; }
  pan(deltaRow: number, deltaColumn: number): void { this.center[0] += deltaRow; this.center[1] += deltaColumn; }
  resetCamera(): void { const n = this.solvers[0]?.n ?? 256; this.center = [n / 2, n / 2]; this.zoom = 1; }

  worldFromCanvas(clientX: number, clientY: number): readonly [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const panes = Math.max(1, this.solvers.length);
    const localX = (clientX - rect.left) / rect.width;
    const pane = Math.min(panes - 1, Math.max(0, Math.floor(localX * panes)));
    const paneX = localX * panes - pane;
    const y = (clientY - rect.top) / rect.height;
    const n = this.solvers[0]?.n ?? 256;
    return [this.center[0] + (y - 0.5) * n / this.zoom, this.center[1] + (paneX - 0.5) * n / this.zoom];
  }

  render(time: number): void {
    if (this.solvers.length === 0) return;
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * devicePixelRatio));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * devicePixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const paneWidth = width / this.solvers.length;
    const raw = new ArrayBuffer(256 * this.solvers.length);
    for (let pane = 0; pane < this.solvers.length; pane += 1) {
      const u32 = new Uint32Array(raw, pane * 256, 20);
      const f32 = new Float32Array(raw, pane * 256, 20);
      u32.set([this.solvers[pane]?.n ?? 256, VIEW_INDEX[this.view], 1, pane]);
      f32.set([width, height, pane * paneWidth, 0, paneWidth, height, 1.75, 3.2, this.center[0], this.center[1], this.zoom, time, this.inspection[0], this.inspection[1], this.inspection[2], 0], 4);
    }
    this.device.queue.writeBuffer(this.uniform, 0, raw);
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m4-render" });
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.context.getCurrentTexture().createView(), clearValue: { r: 0.006, g: 0.01, b: 0.02, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    pass.setPipeline(this.pipeline);
    for (let pane = 0; pane < this.solvers.length; pane += 1) {
      pass.setViewport(pane * paneWidth, 0, paneWidth, height, 0, 1);
      pass.setBindGroup(0, this.groups[pane]?.[this.solvers[pane]?.currentPing ?? 0] as GPUBindGroup, [pane * 256]);
      pass.draw(3);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void { this.uniform.destroy(); }
}
