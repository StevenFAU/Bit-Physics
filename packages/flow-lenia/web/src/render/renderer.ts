import renderWgsl from "../shaders/render_organism.wgsl?raw";
import trailWgsl from "../shaders/render_trails.wgsl?raw";
import type { FlowLeniaOrganismSolver } from "../model/solver.js";

export type RenderMode = "density" | "channels" | "affinity" | "flow" | "pressure" | "flux";
const MODE_INDEX: Record<RenderMode, number> = { density: 0, channels: 1, affinity: 2, flow: 3, pressure: 4, flux: 5 };

export interface CameraState { centerRow: number; centerColumn: number; zoom: number }
export interface PresentationState {
  mode: RenderMode;
  channel: number;
  exposure: number;
  trails: number;
  contours: boolean;
  glyphs: boolean;
  camera: CameraState;
}

export class OrganismRenderer {
  readonly module: GPUShaderModule;
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly solver: FlowLeniaOrganismSolver;
  private readonly uniform: GPUBuffer;
  private readonly trailUniform: GPUBuffer;
  private readonly pipeline: GPURenderPipeline;
  private readonly trailPipeline: GPURenderPipeline;
  private readonly displayPipeline: GPURenderPipeline;
  private readonly scientificLayout: GPUBindGroupLayout;
  private readonly trailLayout: GPUBindGroupLayout;
  private readonly sampler: GPUSampler;
  private groups: GPUBindGroup[] = [];
  private comparison: FlowLeniaOrganismSolver | null = null;
  private mode: RenderMode = "density";
  private channel = 0;
  private exposure = 1.65;
  private persistence = 0.84;
  private contours = false;
  private glyphs = false;
  private camera: CameraState;
  private inspection: { row: number; column: number; radius: number } | null = null;
  private sceneTexture: GPUTexture | null = null;
  private trailTextures: [GPUTexture, GPUTexture] | null = null;
  private trailGroups: [GPUBindGroup, GPUBindGroup] | null = null;
  private displayGroups: [GPUBindGroup, GPUBindGroup] | null = null;
  private trailPing = 0;
  private needsTrailClear = true;
  private textureBytes = 0;

  constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    canvas: HTMLCanvasElement,
    format: GPUTextureFormat,
    solver: FlowLeniaOrganismSolver,
  ) {
    this.device = device;
    this.context = context;
    this.canvas = canvas;
    this.solver = solver;
    this.camera = { centerRow: solver.n / 2, centerColumn: solver.n / 2, zoom: 1 };
    this.uniform = device.createBuffer({
      label: "flow-lenia-m3-render-uniform",
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.trailUniform = device.createBuffer({
      label: "flow-lenia-m3-trail-uniform",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.scientificLayout = device.createBindGroupLayout({
      label: "flow-lenia-m3-render-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        ...Array.from({ length: 8 }, (_, index) => ({
          binding: index + 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" as const },
        })),
      ],
    });
    this.module = device.createShaderModule({ label: "flow-lenia-m3-render", code: renderWgsl });
    this.pipeline = device.createRenderPipeline({
      label: "flow-lenia-m3-scientific-render-pipeline",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.scientificLayout] }),
      vertex: { module: this.module, entryPoint: "vertex_main" },
      fragment: { module: this.module, entryPoint: "fragment_main", targets: [{ format: "rgba8unorm" }] },
      primitive: { topology: "triangle-list" },
    });
    this.trailLayout = device.createBindGroupLayout({
      label: "flow-lenia-m3-trail-layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    const trailModule = device.createShaderModule({ label: "flow-lenia-m3-trails", code: trailWgsl });
    const trailPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [this.trailLayout] });
    this.trailPipeline = device.createRenderPipeline({
      label: "flow-lenia-m3-trail-accumulation",
      layout: trailPipelineLayout,
      vertex: { module: trailModule, entryPoint: "vertex_main" },
      fragment: { module: trailModule, entryPoint: "accumulate", targets: [{ format: "rgba8unorm" }] },
      primitive: { topology: "triangle-list" },
    });
    this.displayPipeline = device.createRenderPipeline({
      label: "flow-lenia-m3-trail-display",
      layout: trailPipelineLayout,
      vertex: { module: trailModule, entryPoint: "vertex_main" },
      fragment: { module: trailModule, entryPoint: "display", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    this.rebuildScientificGroups();
  }

  private rebuildScientificGroups(): void {
    const secondary = this.comparison ?? this.solver;
    this.groups = [];
    for (let primaryPing = 0; primaryPing < 2; primaryPing += 1) {
      for (let secondaryPing = 0; secondaryPing < 2; secondaryPing += 1) {
        this.groups.push(this.device.createBindGroup({
          layout: this.scientificLayout,
          entries: [
            { binding: 0, resource: { buffer: this.uniform } },
            { binding: 1, resource: { buffer: this.solver.mass[primaryPing] as GPUBuffer } },
            { binding: 2, resource: { buffer: this.solver.affinity } },
            { binding: 3, resource: { buffer: this.solver.transport } },
            { binding: 4, resource: { buffer: this.solver.diagnostic } },
            { binding: 5, resource: { buffer: secondary.mass[secondaryPing] as GPUBuffer } },
            { binding: 6, resource: { buffer: secondary.affinity } },
            { binding: 7, resource: { buffer: secondary.transport } },
            { binding: 8, resource: { buffer: secondary.diagnostic } },
          ],
        }));
      }
    }
    this.clearTrails();
  }

  setComparisonSolver(solver: FlowLeniaOrganismSolver | null): void {
    this.comparison = solver;
    this.rebuildScientificGroups();
  }

  hasComparison(): boolean { return this.comparison !== null; }
  setMode(mode: RenderMode): void { this.mode = mode; this.clearTrails(); }
  getMode(): RenderMode { return this.mode; }
  setChannel(channel: number): void { this.channel = Math.max(0, Math.min(2, channel | 0)); this.clearTrails(); }
  setExposure(value: number): void { this.exposure = Math.max(0.2, Math.min(4, value)); }
  setTrailPersistence(value: number): void { this.persistence = Math.max(0, Math.min(0.97, value)); if (value === 0) this.clearTrails(); }
  setContours(enabled: boolean): void { this.contours = enabled; }
  setFlowGlyphs(enabled: boolean): void { this.glyphs = enabled; }
  setInspection(row: number, column: number, radius: number): void { this.inspection = { row, column, radius }; }
  clearInspection(): void { this.inspection = null; }

  getCamera(): CameraState { return { ...this.camera }; }
  setCamera(camera: CameraState): void {
    this.camera = {
      centerRow: ((camera.centerRow % this.solver.n) + this.solver.n) % this.solver.n,
      centerColumn: ((camera.centerColumn % this.solver.n) + this.solver.n) % this.solver.n,
      zoom: Math.max(0.45, Math.min(12, camera.zoom)),
    };
    this.clearTrails();
  }
  pan(deltaRow: number, deltaColumn: number): void {
    this.setCamera({ ...this.camera, centerRow: this.camera.centerRow + deltaRow, centerColumn: this.camera.centerColumn + deltaColumn });
  }
  zoom(factor: number): void { this.setCamera({ ...this.camera, zoom: this.camera.zoom * factor }); }

  screenToWorld(clientX: number, clientY: number): readonly [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const comparison = this.comparison !== null;
    const localX = comparison ? ((clientX - rect.left) % (rect.width * 0.5)) : clientX - rect.left;
    const paneWidth = comparison ? rect.width * 0.5 : rect.width;
    const screenX = localX / Math.max(1, paneWidth) - 0.5;
    const screenY = (clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    const verticalScale = comparison ? 0.5 : 1;
    const row = this.camera.centerRow + screenY * this.solver.n * verticalScale / this.camera.zoom;
    const column = this.camera.centerColumn + screenX * this.solver.n / this.camera.zoom;
    return [((row % this.solver.n) + this.solver.n) % this.solver.n, ((column % this.solver.n) + this.solver.n) % this.solver.n];
  }

  getPresentationState(): PresentationState {
    return { mode: this.mode, channel: this.channel, exposure: this.exposure, trails: this.persistence, contours: this.contours, glyphs: this.glyphs, camera: this.getCamera() };
  }

  restorePresentationState(state: PresentationState): void {
    this.mode = state.mode;
    this.channel = state.channel;
    this.exposure = state.exposure;
    this.persistence = state.trails;
    this.contours = state.contours;
    this.glyphs = state.glyphs;
    this.camera = { ...state.camera };
    this.clearTrails();
  }

  private resize(): void {
    const scale = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * scale));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * scale));
    if (this.canvas.width === width && this.canvas.height === height && this.sceneTexture) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.sceneTexture?.destroy();
    this.trailTextures?.forEach((texture) => texture.destroy());
    const texture = (label: string): GPUTexture => this.device.createTexture({
      label,
      size: [width, height],
      format: "rgba8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.sceneTexture = texture("flow-lenia-m3-scene");
    this.trailTextures = [texture("flow-lenia-m3-trail-a"), texture("flow-lenia-m3-trail-b")];
    this.trailGroups = this.trailTextures.map((history) => this.device.createBindGroup({
      layout: this.trailLayout,
      entries: [
        { binding: 0, resource: { buffer: this.trailUniform } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.sceneTexture?.createView() as GPUTextureView },
        { binding: 3, resource: history.createView() },
      ],
    })) as [GPUBindGroup, GPUBindGroup];
    this.displayGroups = this.trailTextures.map((current) => this.device.createBindGroup({
      layout: this.trailLayout,
      entries: [
        { binding: 0, resource: { buffer: this.trailUniform } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: current.createView() },
        { binding: 3, resource: current.createView() },
      ],
    })) as [GPUBindGroup, GPUBindGroup];
    this.textureBytes = width * height * 4 * 3;
    this.trailPing = 0;
    this.needsTrailClear = true;
  }

  get allocatedBytes(): number { return this.uniform.size + this.trailUniform.size + this.textureBytes; }
  clearTrails(): void { this.needsTrailClear = true; }

  render(): void {
    this.resize();
    if (!this.sceneTexture || !this.trailTextures || !this.trailGroups || !this.displayGroups) return;
    const raw = new ArrayBuffer(64);
    const u32 = new Uint32Array(raw);
    const f32 = new Float32Array(raw);
    let flags = 0;
    if (this.contours) flags |= 1;
    if (this.glyphs) flags |= 2;
    if (this.inspection) flags |= 4;
    u32.set([this.solver.n, MODE_INDEX[this.mode], this.channel, flags]);
    f32.set([this.canvas.width, this.canvas.height, this.exposure, 1.25], 4);
    f32.set([this.camera.centerRow, this.camera.centerColumn, this.camera.zoom, performance.now() * 0.001], 8);
    f32.set([this.inspection?.row ?? 0, this.inspection?.column ?? 0, this.inspection?.radius ?? 0, this.comparison ? 1 : 0], 12);
    this.device.queue.writeBuffer(this.uniform, 0, raw);
    this.device.queue.writeBuffer(this.trailUniform, 0, new Float32Array([this.persistence, 0, 0, 0]));
    const encoder = this.device.createCommandEncoder({ label: "flow-lenia-m3-render-frame" });
    if (this.needsTrailClear) {
      for (const texture of this.trailTextures) {
        const clear = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
        clear.end();
      }
      this.needsTrailClear = false;
    }
    const scene = encoder.beginRenderPass({
      colorAttachments: [{ view: this.sceneTexture.createView(), clearValue: { r: 0.01, g: 0.015, b: 0.022, a: 1 }, loadOp: "clear", storeOp: "store" }],
    });
    scene.setPipeline(this.pipeline);
    const primaryPing = this.solver.currentMassBuffer === this.solver.mass[0] ? 0 : 1;
    const secondaryPing = this.comparison?.currentMassBuffer === this.comparison?.mass[1] ? 1 : 0;
    scene.setBindGroup(0, this.groups[primaryPing * 2 + secondaryPing] as GPUBindGroup);
    scene.draw(3);
    scene.end();
    const nextTrail = 1 - this.trailPing;
    const accumulate = encoder.beginRenderPass({
      colorAttachments: [{ view: this.trailTextures[nextTrail].createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }],
    });
    accumulate.setPipeline(this.trailPipeline);
    accumulate.setBindGroup(0, this.trailGroups[this.trailPing]);
    accumulate.draw(3);
    accumulate.end();
    const display = encoder.beginRenderPass({
      colorAttachments: [{ view: this.context.getCurrentTexture().createView(), clearValue: { r: 0.01, g: 0.015, b: 0.022, a: 1 }, loadOp: "clear", storeOp: "store" }],
    });
    display.setPipeline(this.displayPipeline);
    display.setBindGroup(0, this.displayGroups[nextTrail]);
    display.draw(3);
    display.end();
    this.trailPing = nextTrail;
    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    this.uniform.destroy();
    this.trailUniform.destroy();
    this.sceneTexture?.destroy();
    this.trailTextures?.forEach((texture) => texture.destroy());
  }
}
