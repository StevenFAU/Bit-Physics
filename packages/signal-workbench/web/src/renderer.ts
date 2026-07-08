// signal-workbench — RENDER layer (spec-ref § 5.5). Line-strip instrument
// traces (scope / spectrum / analytic overlay / error trace), spectrogram
// waterfall, DPX persistence view, and the woscope XY erf-beam. Reads gated
// or analytic buffers; never writes them (§ 6.5 display-only control).

import { emitColormapWgsl, getColormap } from "../../../../common/common-web/src/colormap.js";
import renderWgsl from "./render.wgsl?raw";
import type { WorkbenchGpu } from "./solver.js";

const R_FLOATS = 24; // RenderU: 84 bytes of members, 96 after vec3-align rounding

function colormapConst(name: string): string {
  const map = getColormap(name);
  const stops = map.stops
    .map(([r, g, b]) => `vec4<f32>(${r}, ${g}, ${b}, 0.0)`)
    .join(",\n  ");
  return `
const CMAP_STOPS = array<vec4<f32>, ${map.stops.length}>(
  ${stops});
const CMAP_N: f32 = ${map.stops.length}.0;
${emitColormapWgsl({ stopsExpr: "CMAP_STOPS", countExpr: "CMAP_N", fnName: "colormap" })}
`;
}

export type ViewMode = "spectrum" | "scope" | "spectrogram" | "persistence" | "xy";

export class Renderer {
  private readonly device: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private layout: GPUBindGroupLayout;
  private pipelines = new Map<string, GPURenderPipeline>();
  private uniPool: GPUBuffer;
  private slot = 0;
  private readonly maxSlots = 16;

  overlayBuf: GPUBuffer; // analytic golden trace (JS-f64 -> f32, dB or linear)
  errorBuf: GPUBuffer; // measured - analytic (display trace)
  xyBuf: [GPUBuffer, GPUBuffer]; // XY beam channel buffers

  constructor(device: GPUDevice, ctx: GPUCanvasContext, format: GPUTextureFormat, n: number) {
    this.device = device;
    this.ctx = ctx;
    this.format = format;
    const STORAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.overlayBuf = device.createBuffer({ size: (n / 2 + 1) * 4, usage: STORAGE });
    this.errorBuf = device.createBuffer({ size: (n / 2 + 1) * 4, usage: STORAGE });
    this.xyBuf = [
      device.createBuffer({ size: n * 4, usage: STORAGE }),
      device.createBuffer({ size: n * 4, usage: STORAGE }),
    ];
    this.uniPool = device.createBuffer({
      size: this.maxSlots * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        ...[1, 2, 3, 4].map((binding) => ({
          binding,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" as GPUBufferBindingType },
        })),
      ],
    });

    const code = renderWgsl.replace("//__COLORMAP__", colormapConst("inferno"));
    const module = device.createShaderModule({ code });
    const pipeLayout = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
    const mkPipe = (
      key: string,
      vs: string,
      fs: string,
      topology: GPUPrimitiveTopology,
      blend?: GPUBlendState,
    ): void => {
      this.pipelines.set(
        key,
        device.createRenderPipeline({
          layout: pipeLayout,
          vertex: { module, entryPoint: vs },
          fragment: {
            module,
            entryPoint: fs,
            targets: [{ format: this.format, blend }],
          },
          primitive: { topology },
        }),
      );
    };
    const additive: GPUBlendState = {
      color: { srcFactor: "one", dstFactor: "one", operation: "add" },
      alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
    };
    mkPipe("line", "line_vs", "line_fs", "line-strip");
    mkPipe("waterfall", "quad_vs", "waterfall_fs", "triangle-list");
    mkPipe("persist", "quad_vs", "persist_fs", "triangle-list");
    mkPipe("beam", "beam_vs", "beam_fs", "triangle-list", additive);
  }

  uploadOverlay(data: Float32Array): void {
    this.device.queue.writeBuffer(this.overlayBuf, 0, data as unknown as BufferSource);
  }

  uploadError(data: Float32Array): void {
    this.device.queue.writeBuffer(this.errorBuf, 0, data as unknown as BufferSource);
  }

  uploadXy(chX: Float32Array, chY: Float32Array): void {
    this.device.queue.writeBuffer(this.xyBuf[0], 0, chX as unknown as BufferSource);
    this.device.queue.writeBuffer(this.xyBuf[1], 0, chY as unknown as BufferSource);
  }

  private writeSlot(u: {
    count: number;
    mode: number;
    yRange: number;
    dbFloor: number;
    dbCeil: number;
    color: [number, number, number];
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    wfRow: number;
    wfRows: number;
    halfN: number;
    persistRows: number;
    beamSigma: number;
    beamGain: number;
  }): number {
    const slot = this.slot;
    this.slot = (this.slot + 1) % this.maxSlots;
    const data = new ArrayBuffer(R_FLOATS * 4);
    const f = new Float32Array(data);
    const ui = new Uint32Array(data);
    ui[0] = u.count;
    ui[1] = u.mode;
    f[2] = u.yRange;
    f[3] = u.dbFloor;
    // struct packing: color is vec3 at 16-byte alignment -> offset 4 floats
    f[4] = u.dbCeil;
    // color occupies floats 8..10 (vec3 aligned to 16 bytes = float index 8)
    f[8] = u.color[0];
    f[9] = u.color[1];
    f[10] = u.color[2];
    f[11] = u.x0;
    f[12] = u.x1;
    f[13] = u.y0;
    f[14] = u.y1;
    ui[15] = u.wfRow;
    ui[16] = u.wfRows;
    ui[17] = u.halfN;
    ui[18] = u.persistRows;
    // beam params spill into the next 16-byte row
    f[19] = u.beamSigma;
    f[20] = u.beamGain;
    this.device.queue.writeBuffer(this.uniPool, slot * 256, data);
    return slot;
  }

  private bind(slot: number, a: GPUBuffer, b: GPUBuffer, gpu: WorkbenchGpu): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: this.uniPool, offset: slot * 256, size: R_FLOATS * 4 } },
        { binding: 1, resource: { buffer: a } },
        { binding: 2, resource: { buffer: b } },
        { binding: 3, resource: { buffer: gpu.waterfallBuf } },
        { binding: 4, resource: { buffer: gpu.persistBuf } },
      ],
    });
  }

  // NOTE on the uniform struct: RenderU in render.wgsl uses scalar fields in
  // declaration order; WGSL packs vec3 color at a 16-byte boundary. The
  // writeSlot layout above mirrors offsets computed by that packing.

  frame(gpu: WorkbenchGpu, mode: ViewMode, opts: { beamGain: number; beamSigma: number }): void {
    const view = this.ctx.getCurrentTexture().createView();
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view, clearValue: { r: 0.016, g: 0.023, b: 0.03, a: 1 }, loadOp: "clear", storeOp: "store" },
      ],
    });
    const half = gpu.half;
    const common = {
      yRange: 1.4,
      dbFloor: gpu.dbFloor,
      dbCeil: gpu.dbCeil,
      wfRow: gpu.wfRow,
      wfRows: gpu.wfRows,
      halfN: half,
      persistRows: gpu.persistRows,
      beamSigma: opts.beamSigma,
      beamGain: opts.beamGain,
    };
    const draw = (
      key: string,
      slotU: Parameters<Renderer["writeSlot"]>[0],
      a: GPUBuffer,
      b: GPUBuffer,
      vertices: number,
      instances = 1,
    ): void => {
      const slot = this.writeSlot(slotU);
      pass.setPipeline(this.pipelines.get(key) as GPURenderPipeline);
      pass.setBindGroup(0, this.bind(slot, a, b, gpu));
      pass.draw(vertices, instances);
    };

    if (mode === "spectrogram") {
      draw(
        "waterfall",
        { ...common, count: half, mode: 1, color: [1, 1, 1], x0: -1, x1: 1, y0: -1, y1: 1 },
        gpu.specMagBuf,
        gpu.specMagBuf,
        3,
      );
    } else if (mode === "persistence") {
      draw(
        "persist",
        { ...common, count: half, mode: 1, color: [1, 1, 1], x0: -1, x1: 1, y0: -1, y1: 1 },
        gpu.specMagBuf,
        gpu.specMagBuf,
        3,
      );
    } else if (mode === "xy") {
      draw(
        "beam",
        { ...common, count: gpu.n, mode: 0, color: [0.35, 1.0, 0.5], x0: -0.92, x1: 0.92, y0: -0.92, y1: 0.92 },
        this.xyBuf[0],
        this.xyBuf[1],
        6,
        gpu.n - 1,
      );
    } else if (mode === "scope") {
      draw(
        "line",
        { ...common, count: gpu.n, mode: 0, color: [0.4, 1.0, 0.6], x0: -0.96, x1: 0.96, y0: -0.9, y1: 0.9 },
        gpu.signalBuf,
        gpu.signalBuf,
        gpu.n,
      );
    } else {
      // spectrum: measured trace + analytic golden overlay + error trace
      draw(
        "line",
        { ...common, count: half + 1, mode: 1, color: [0.36, 0.78, 1.0], x0: -0.96, x1: 0.96, y0: -0.62, y1: 0.92 },
        gpu.specMagBuf,
        gpu.specMagBuf,
        half + 1,
      );
      draw(
        "line",
        { ...common, count: half + 1, mode: 1, color: [1.0, 0.62, 0.18], x0: -0.96, x1: 0.96, y0: -0.62, y1: 0.92 },
        this.overlayBuf,
        this.overlayBuf,
        half + 1,
      );
      draw(
        "line",
        {
          ...common,
          count: half + 1,
          mode: 1,
          dbFloor: -160,
          dbCeil: 0,
          color: [1.0, 0.28, 0.38],
          x0: -0.96,
          x1: 0.96,
          y0: -0.98,
          y1: -0.66,
        },
        this.errorBuf,
        this.errorBuf,
        half + 1,
      );
    }
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }

  destroy(): void {
    this.overlayBuf.destroy();
    this.errorBuf.destroy();
    this.xyBuf[0].destroy();
    this.xyBuf[1].destroy();
    this.uniPool.destroy();
  }
}
