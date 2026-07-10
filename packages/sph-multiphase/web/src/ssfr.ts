// SSFR orchestration (spec § 3.5 — aesthetics tier, never gated).
// Half-res depth + thickness, narrow-range filter (2x 1D + 2D clean-up),
// full-res composite against a procedural environment. Self-contained: no
// external textures (standalone-serve constraint).

import ssfrWgsl from "./render/ssfr.wgsl?raw";
import { cameraEye, lookAt, perspective } from "./render.js";
import type { OrbitCamera } from "./render.js";

export type Ssfr = Awaited<ReturnType<typeof createSsfr>>;

export async function createSsfr(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  simBuffers: { pos: GPUBuffer; vel: GPUBuffer },
) {
  const ctx = canvas.getContext("webgpu");
  if (!ctx) throw new Error("no webgpu canvas context");
  const format = navigator.gpu.getPreferredCanvasFormat();

  const module = device.createShaderModule({ label: "ssfr", code: ssfrWgsl });
  const UBYTES = 64 + 64 + 16 + 16 + 16;
  const ubuf = device.createBuffer({
    label: "ssfrU",
    size: UBYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // second uniform: identical except the 1D filter direction (vertical) —
  // both are written up front so one encoder can run both separable passes.
  const ubufV = device.createBuffer({
    label: "ssfrU-vertical",
    size: UBYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const depthPipe = await device.createRenderPipelineAsync({
    label: "ssfr-depth",
    layout: "auto",
    vertex: { module, entryPoint: "vs_depth" },
    fragment: { module, entryPoint: "fs_depth", targets: [{ format: "rg32float" }] },
    primitive: { topology: "triangle-list" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
  });
  const thickPipe = await device.createRenderPipelineAsync({
    label: "ssfr-thick",
    layout: "auto",
    vertex: { module, entryPoint: "vs_thick" },
    fragment: {
      module,
      entryPoint: "fs_thick",
      targets: [
        {
          format: "rg16float",
          blend: {
            color: { srcFactor: "one", dstFactor: "one" },
            alpha: { srcFactor: "one", dstFactor: "one" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });
  const nrfPipe = await device.createRenderPipelineAsync({
    label: "ssfr-nrf",
    layout: "auto",
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: { module, entryPoint: "fs_nrf", targets: [{ format: "rg32float" }] },
    primitive: { topology: "triangle-list" },
  });
  const nrf2dPipe = await device.createRenderPipelineAsync({
    label: "ssfr-nrf2d",
    layout: "auto",
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: { module, entryPoint: "fs_nrf2d", targets: [{ format: "rg32float" }] },
    primitive: { topology: "triangle-list" },
  });
  const compPipe = await device.createRenderPipelineAsync({
    label: "ssfr-composite",
    layout: "auto",
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: { module, entryPoint: "fs_composite", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "always" },
  });

  let halfW = 0;
  let halfH = 0;
  let depthA: GPUTexture | null = null;
  let depthB: GPUTexture | null = null;
  let thickTex: GPUTexture | null = null;
  let zbufHalf: GPUTexture | null = null;
  let zbufFull: GPUTexture | null = null;
  let fullW = 0;
  let fullH = 0;

  function resize(): void {
    const w = Math.max(2, canvas.width);
    const h = Math.max(2, canvas.height);
    if (w === fullW && h === fullH && depthA) return;
    fullW = w;
    fullH = h;
    halfW = Math.max(2, Math.ceil(w / 2));
    halfH = Math.max(2, Math.ceil(h / 2));
    for (const t of [depthA, depthB, thickTex, zbufHalf, zbufFull]) t?.destroy();
    const mk = (fmt: GPUTextureFormat, ww: number, hh: number) =>
      device.createTexture({
        size: [ww, hh],
        format: fmt,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
    depthA = mk("rg32float", halfW, halfH);
    depthB = mk("rg32float", halfW, halfH);
    thickTex = mk("rg16float", halfW, halfH);
    zbufHalf = device.createTexture({
      size: [halfW, halfH],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    zbufFull = device.createTexture({
      size: [w, h],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  const uScratch = new Float32Array(UBYTES / 4);

  function draw(opts: { n: number; radius: number; cam: OrbitCamera; foamSpeed: number }): void {
    resize();
    const eye = cameraEye(opts.cam);
    const aspect = fullW / Math.max(fullH, 1);
    const view = lookAt(eye, opts.cam.target, [0, 0, 1]);
    const proj = perspective(0.9, aspect, 0.02, 40);
    uScratch.set(view, 0);
    uScratch.set(proj, 16);
    uScratch.set([eye[0], eye[1], eye[2], 0], 32);
    uScratch.set([opts.radius, opts.foamSpeed, halfW, halfH], 36);
    uScratch.set([fullW, fullH, 1, 0], 40); // horizontal filter direction
    device.queue.writeBuffer(ubuf, 0, uScratch);
    uScratch.set([fullW, fullH, 0, 1], 40); // vertical filter direction
    device.queue.writeBuffer(ubufV, 0, uScratch);

    const bgFor = (
      pipe: GPURenderPipeline,
      din: GPUTexture,
      useThick: boolean,
      uniform: GPUBuffer = ubuf,
    ) => {
      const entries: GPUBindGroupEntry[] = [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 3, resource: din.createView() },
      ];
      if (useThick) entries.push({ binding: 4, resource: thickTex!.createView() });
      return device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries });
    };

    const enc = device.createCommandEncoder();
    // pass 1: depth (half-res)
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: depthA!.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: zbufHalf!.createView(),
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });
      pass.setPipeline(depthPipe);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout: depthPipe.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: ubuf } },
            { binding: 1, resource: { buffer: simBuffers.pos } },
          ],
        }),
      );
      if (opts.n > 0) pass.draw(6, opts.n);
      pass.end();
    }
    // pass 2: thickness + foam (half-res, additive)
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: thickTex!.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(thickPipe);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout: thickPipe.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: ubuf } },
            { binding: 1, resource: { buffer: simBuffers.pos } },
          ],
        }),
      );
      if (opts.n > 0) pass.draw(6, opts.n);
      pass.end();
    }
    // pass 3: narrow-range filter — 2x separable 1D + one 2D clean-up
    const fsPass = (
      pipe: GPURenderPipeline,
      src: GPUTexture,
      dst: GPUTexture,
      uniform: GPUBuffer = ubuf,
    ) => {
      const pass = enc.beginRenderPass({
        colorAttachments: [
          { view: dst.createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" },
        ],
      });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bgFor(pipe, src, false, uniform));
      pass.draw(3);
      pass.end();
    };
    fsPass(nrfPipe, depthA!, depthB!); // horizontal
    fsPass(nrfPipe, depthB!, depthA!, ubufV); // vertical
    fsPass(nrf2dPipe, depthA!, depthB!); // 5x5 clean-up
    // final: composite full-res (reads the filtered depth in B + thickness)
    {
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: ctx!.getCurrentTexture().createView(),
            clearValue: { r: 0.024, g: 0.035, b: 0.051, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: zbufFull!.createView(),
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });
      pass.setPipeline(compPipe);
      pass.setBindGroup(0, bgFor(compPipe, depthB!, true));
      pass.draw(3);
      pass.end();
    }
    device.queue.submit([enc.finish()]);
  }

  return { draw, resize };
}
