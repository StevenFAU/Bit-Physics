// heat-equation — render controller for the uber-composite pass (§ 5.5).
//
// One fullscreen pass, uniform-flag layers, plus the decimated heat-flux
// arrow pass. The colormap is the SHARED facility (packColormap +
// emitColormapWgsl — never forked); the blackbody LUT is the committed
// golden-F table (src/generated/blackbody-lut.json, byte-matched to
// tools/testkit/golden/tables/volumetric-grid/blackbody-planck-locus.json
// by gen-verification.mjs).

import {
  getColormap,
  packColormap,
  emitColormapWgsl,
  PACKED_FLOATS,
} from "../../../../common/common-web/src/colormap.js";
import type { Colormap } from "../../../../common/common-web/src/colormap.js";
import { FFT_PRECISION_TRIG_WGSL } from "../../../../common/common-web/src/fft-wgsl.js";
import bbLutJson from "./generated/blackbody-lut.json";
import renderWgsl from "./render.wgsl?raw";

export const LAYER = {
  iso: 1,
  glow: 2,
  relief: 4,
  spectrum: 8,
  errmap: 16,
  material: 32,
  raw: 64,
} as const;

// IR / thermal-camera palettes (FLIR convention) expressed as DATA for the
// shared colormap facility — additional stop lists, not a forked sampler.
const IR_PALETTES: Colormap[] = [
  {
    name: "white-hot",
    space: "linear",
    stops: [
      [0, 0, 0],
      [1, 1, 1],
    ],
  },
  {
    name: "black-hot",
    space: "linear",
    stops: [
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    name: "ironbow",
    space: "srgb",
    stops: [
      [0.0, 0.0, 0.078],
      [0.125, 0.0, 0.36],
      [0.47, 0.0, 0.51],
      [0.78, 0.16, 0.28],
      [0.94, 0.49, 0.08],
      [1.0, 0.78, 0.19],
      [1.0, 1.0, 0.6],
      [1.0, 1.0, 1.0],
    ],
  },
];

export function paletteByName(name: string): Colormap {
  const ir = IR_PALETTES.find((p) => p.name === name);
  return ir ?? getColormap(name);
}

export const PALETTE_NAMES = [
  "inferno",
  "magma",
  "viridis",
  "turbo",
  "cividis",
  "aurora",
  "ember",
  "white-hot",
  "black-hot",
  "ironbow",
];

export interface RenderState {
  flags: number;
  tLo: number;
  tHi: number;
  isoLevels: number;
  kelvinOffset: number;
  kelvinScale: number;
  glowGain: number;
  errScale: number;
  specAlphaT: number;
  offset0: number;
  /** analytic-overlay modes: [m, k, premultiplied amplitude] (CPU f64). */
  modes: Array<[number, number, number]>;
  palette: string;
}

export class Renderer {
  private device: GPUDevice;
  private ctx: GPUCanvasContext;
  private format: GPUTextureFormat;
  private uni: GPUBuffer;
  private uniData = new ArrayBuffer(256);
  private bbBuf: GPUBuffer;
  private lutLen: number;
  private lutTmin: number;
  private lutTstep: number;
  private layout: GPUBindGroupLayout;
  private pipeline: GPURenderPipeline;
  private arrowPipeline: GPURenderPipeline;
  private group: GPUBindGroup | null = null;
  private boundField: GPUBuffer | null = null;

  state: RenderState = {
    flags: LAYER.iso,
    tLo: 0,
    tHi: 2,
    isoLevels: 12,
    kelvinOffset: 300,
    kelvinScale: 900,
    glowGain: 0,
    errScale: 1e-4,
    specAlphaT: 0,
    offset0: 0,
    modes: [],
    palette: "inferno",
  };
  arrowsOn = false;

  constructor(device: GPUDevice, ctx: GPUCanvasContext, format: GPUTextureFormat) {
    this.device = device;
    this.ctx = ctx;
    this.format = format;

    const lut = bbLutJson as { t_min_K: number; t_max_K: number; t_step_K: number; rgb_linear: number[][] };
    this.lutLen = lut.rgb_linear.length;
    this.lutTmin = lut.t_min_K;
    this.lutTstep = lut.t_step_K;
    const lutData = new Float32Array(this.lutLen * 4);
    lut.rgb_linear.forEach((rgb, i) => {
      lutData[i * 4] = rgb[0];
      lutData[i * 4 + 1] = rgb[1];
      lutData[i * 4 + 2] = rgb[2];
      lutData[i * 4 + 3] = 1;
    });
    this.bbBuf = device.createBuffer({
      size: lutData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.bbBuf, 0, lutData);

    this.uni = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const code = renderWgsl
      .replace(
        "//__CMAP_FN__",
        emitColormapWgsl({ stopsExpr: "R.cmap_stops", countExpr: "R.cmap_meta.x" }),
      )
      .replace("//__COMMON_FFT__", FFT_PRECISION_TRIG_WGSL);
    const module = device.createShaderModule({ code });

    this.layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
        ...[1, 2, 3, 4].map((binding) => ({
          binding,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" as GPUBufferBindingType },
        })),
      ],
    });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
    this.pipeline = device.createRenderPipeline({
      layout: pl,
      vertex: { module, entryPoint: "vs_full" },
      fragment: { module, entryPoint: "fs_composite", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.arrowPipeline = device.createRenderPipeline({
      layout: pl,
      vertex: { module, entryPoint: "vs_arrows" },
      fragment: {
        module,
        entryPoint: "fs_arrows",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            },
          },
        ],
      },
      primitive: { topology: "line-list" },
    });
  }

  bind(fieldBuf: GPUBuffer, spectrumBuf: GPUBuffer, matBuf: GPUBuffer): void {
    if (this.boundField === fieldBuf && this.group) return;
    this.boundField = fieldBuf;
    this.group = this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: this.uni } },
        { binding: 1, resource: { buffer: fieldBuf } },
        { binding: 2, resource: { buffer: spectrumBuf } },
        { binding: 3, resource: { buffer: this.bbBuf } },
        { binding: 4, resource: { buffer: matBuf } },
      ],
    });
  }

  private writeUniforms(n: number): void {
    const f = new Float32Array(this.uniData);
    const u = new Uint32Array(this.uniData);
    const s = this.state;
    f[0] = n;
    u[1] = s.flags;
    f[2] = s.tLo;
    f[3] = s.tHi;
    f[4] = s.isoLevels;
    f[5] = s.kelvinOffset;
    f[6] = s.kelvinScale;
    f[7] = s.glowGain;
    f[8] = s.errScale;
    f[9] = s.specAlphaT;
    f[10] = s.offset0;
    f[11] = s.modes.length;
    for (let i = 0; i < 3; i++) {
      const m = s.modes[i] ?? [0, 0, 0];
      f[12 + i * 4] = m[0];
      f[13 + i * 4] = m[1];
      f[14 + i * 4] = m[2];
      f[15 + i * 4] = 0;
    }
    const packed = packColormap(paletteByName(s.palette));
    f.set(packed.subarray(0, PACKED_FLOATS), 24); // byte offset 96 = float 24
    f[60] = this.lutLen;
    f[61] = this.lutTmin;
    f[62] = this.lutTstep;
    f[63] = 0;
    this.device.queue.writeBuffer(this.uni, 0, this.uniData);
  }

  frame(n: number): void {
    if (!this.group) return;
    this.writeUniforms(n);
    const view = this.ctx.getCurrentTexture().createView();
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view, loadOp: "clear", storeOp: "store", clearValue: { r: 0.02, g: 0.02, b: 0.03, a: 1 } },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.group);
    pass.draw(3);
    if (this.arrowsOn) {
      pass.setPipeline(this.arrowPipeline);
      pass.setBindGroup(0, this.group);
      pass.draw(2, 24 * 24);
    }
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }

  get format_(): GPUTextureFormat {
    return this.format;
  }
}
