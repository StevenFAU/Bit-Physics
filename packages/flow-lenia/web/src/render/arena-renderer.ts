import type { ArenaCard } from "../experiments/arena-cards.js";
import type { FlowLeniaEcosystemSolver } from "../model/ecosystem-solver.js";
import renderWgsl from "../shaders/render_arena.wgsl?raw";

export type ArenaView = ArenaCard["view"];
const VIEW_INDEX: Record<ArenaView, number> = { lineage: 0, phenotype: 1, density: 2, flow: 3, environment: 4 };

export class ArenaRenderer {
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly uniform: GPUBuffer;
  private readonly layout: GPUBindGroupLayout;
  private readonly pipeline: GPURenderPipeline;
  private solver: FlowLeniaEcosystemSolver | null = null;
  private groups: [GPUBindGroup, GPUBindGroup] | null = null;
  private view: ArenaView = "lineage";
  private center: [number, number] = [0, 0];
  private zoom = 1;
  private inspection: [number, number, number] = [0, 0, 8];

  constructor(device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement, format: GPUTextureFormat) {
    this.device = device; this.context = context; this.canvas = canvas;
    this.uniform = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform", minBindingSize: 144 } },
        ...Array.from({ length: 8 }, (_, index) => ({ binding: index + 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "read-only-storage" as const } })),
      ],
    });
    const module = device.createShaderModule({ label: "flow-lenia-m5-arena-render", code: renderWgsl });
    this.pipeline = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [this.layout] }), vertex: { module, entryPoint: "vertex_main" }, fragment: { module, entryPoint: "fragment_main", targets: [{ format }] }, primitive: { topology: "triangle-list" } });
  }

  setSolver(solver: FlowLeniaEcosystemSolver): void {
    if (!solver.environment || !solver.environmentRegions) throw new Error("Arena renderer requires environment buffers");
    this.solver = solver;
    this.groups = [0, 1].map((ping) => this.device.createBindGroup({ layout: this.layout, entries: [
      { binding: 0, resource: { buffer: this.uniform, size: 144 } },
      { binding: 1, resource: { buffer: solver.mass[ping] as GPUBuffer } },
      { binding: 2, resource: { buffer: solver.genomeH[ping] as GPUBuffer } },
      { binding: 3, resource: { buffer: solver.genomeQ[ping] as GPUBuffer } },
      { binding: 4, resource: { buffer: solver.identity[ping] as GPUBuffer } },
      { binding: 5, resource: { buffer: solver.transport } },
      { binding: 6, resource: { buffer: solver.diagnostic } },
      { binding: 7, resource: { buffer: solver.environment as GPUBuffer } },
      { binding: 8, resource: { buffer: solver.environmentRegions as GPUBuffer } },
    ] })) as [GPUBindGroup, GPUBindGroup];
    this.center = [solver.n / 2, solver.n / 2];
  }
  setView(view: ArenaView): void { this.view = view; }
  getView(): ArenaView { return this.view; }
  setInspection(row: number, column: number, radius: number): void { this.inspection = [row, column, radius]; }
  setZoom(value: number): void { this.zoom = Math.max(0.5, Math.min(8, value)); }
  getZoom(): number { return this.zoom; }
  resetCamera(): void { if (this.solver) this.center = [this.solver.n / 2, this.solver.n / 2]; this.zoom = 1; }
  worldFromCanvas(clientX: number, clientY: number): readonly [number, number] { const rect = this.canvas.getBoundingClientRect(); const n = this.solver?.n ?? 256; return [this.center[0] + ((clientY - rect.top) / rect.height - 0.5) * n / this.zoom, this.center[1] + ((clientX - rect.left) / rect.width - 0.5) * n / this.zoom]; }

  render(time: number): void {
    if (!this.solver || !this.groups) return;
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * devicePixelRatio)); const height = Math.max(1, Math.floor(this.canvas.clientHeight * devicePixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const raw = new ArrayBuffer(144); const u32 = new Uint32Array(raw); const f32 = new Float32Array(raw); const dynamics = this.solver.getArenaDynamics();
    u32.set([this.solver.n, VIEW_INDEX[this.view], 1, 0]);
    f32.set([width, height, 0, 0, width, height, 1.75, 3.2, this.center[0], this.center[1], this.zoom, time, this.inspection[0], this.inspection[1], this.inspection[2], 0], 4);
    f32.set([this.solver.getGateOpen() ? 1 : 0, this.solver.stepCount, dynamics?.storm.startStep ?? 0, dynamics?.storm.duration ?? 0], 20);
    f32.set([...(dynamics?.storm.center ?? [0.5, 0.5]), dynamics?.storm.radius ?? 0.2, dynamics?.storm.amplitude ?? 0], 24);
    f32.set([...(dynamics?.attractor.center ?? [0.5, 0.5]), dynamics?.attractor.radius ?? 0.2, dynamics?.attractor.amplitude ?? 0], 28);
    f32.set([dynamics?.attractor.orbitRadius ?? 0, dynamics?.attractor.angularSpeed ?? 0, dynamics?.attractor.phase ?? 0, 0], 32);
    this.device.queue.writeBuffer(this.uniform, 0, raw);
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m5-arena-render" });
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.context.getCurrentTexture().createView(), clearValue: { r: 0.006, g: 0.01, b: 0.02, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.groups[this.solver.currentPing]); pass.draw(3); pass.end(); this.device.queue.submit([encoder.finish()]);
  }
  destroy(): void { this.uniform.destroy(); }
}
