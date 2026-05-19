// Shader compilation + pipeline creation. Provides ComputePipeline
// (with a hot-reload callback API) and RenderPipeline. Pipelines are
// classes rather than free functions so the dispatch surface can stay
// small and stable.

import type { DeviceContext } from "./context.js";

export interface ComputePipelineOptions {
  /** Shader entry-point name. Defaults to "main". */
  entryPoint?: string;
  /** Optional debug label forwarded to the underlying WebGPU object. */
  label?: string;
  /** Explicit bind-group layouts; the pipeline layout is derived. */
  bindGroupLayouts: GPUBindGroupLayout[];
}

export interface RenderPipelineOptions {
  vertexEntryPoint?: string;
  fragmentEntryPoint?: string;
  label?: string;
  bindGroupLayouts: GPUBindGroupLayout[];
  vertexBufferLayouts: GPUVertexBufferLayout[];
  primitive?: GPUPrimitiveState;
  targets: GPUColorTargetState[];
}

export type ShaderReloadCallback = (newSource: string) => Promise<void>;

export class ComputePipeline {
  private _pipeline: GPUComputePipeline;
  private readonly _reloadCallbacks: Set<ShaderReloadCallback> = new Set();

  private constructor(
    private readonly _ctx: DeviceContext,
    private _options: ComputePipelineOptions,
    pipeline: GPUComputePipeline,
  ) {
    this._pipeline = pipeline;
  }

  static async create(
    ctx: DeviceContext,
    shaderSource: string,
    options: ComputePipelineOptions,
  ): Promise<ComputePipeline> {
    const pipeline = await build(ctx, shaderSource, options);
    return new ComputePipeline(ctx, options, pipeline);
  }

  get pipeline(): GPUComputePipeline {
    return this._pipeline;
  }

  /**
   * Replace the underlying compute pipeline with one compiled from a
   * new shader source. Registered reload callbacks fire after the
   * replacement is complete.
   */
  async reload(newSource: string): Promise<void> {
    this._pipeline = await build(this._ctx, newSource, this._options);
    for (const cb of this._reloadCallbacks) {
      await cb(newSource);
    }
  }

  onReload(cb: ShaderReloadCallback): () => void {
    this._reloadCallbacks.add(cb);
    return () => this._reloadCallbacks.delete(cb);
  }

  dispatch(
    encoder: GPUCommandEncoder,
    workgroups: [number, number, number],
    bindGroups: GPUBindGroup[],
  ): void {
    const pass = encoder.beginComputePass({ label: this._options.label });
    pass.setPipeline(this._pipeline);
    bindGroups.forEach((bg, idx) => pass.setBindGroup(idx, bg));
    pass.dispatchWorkgroups(...workgroups);
    pass.end();
  }
}

async function build(
  ctx: DeviceContext,
  shaderSource: string,
  options: ComputePipelineOptions,
): Promise<GPUComputePipeline> {
  const module = ctx.device.createShaderModule({
    label: options.label !== undefined ? `${options.label}-module` : undefined,
    code: shaderSource,
  });
  const layout = ctx.device.createPipelineLayout({
    label: options.label !== undefined ? `${options.label}-layout` : undefined,
    bindGroupLayouts: options.bindGroupLayouts,
  });
  return ctx.device.createComputePipelineAsync({
    label: options.label,
    layout,
    compute: { module, entryPoint: options.entryPoint ?? "main" },
  });
}

export class RenderPipeline {
  private constructor(
    private readonly _ctx: DeviceContext,
    private readonly _options: RenderPipelineOptions,
    public readonly pipeline: GPURenderPipeline,
  ) {}

  static async create(
    ctx: DeviceContext,
    shaderSource: string,
    options: RenderPipelineOptions,
  ): Promise<RenderPipeline> {
    const module = ctx.device.createShaderModule({
      label: options.label !== undefined ? `${options.label}-module` : undefined,
      code: shaderSource,
    });
    const layout = ctx.device.createPipelineLayout({
      label: options.label !== undefined ? `${options.label}-layout` : undefined,
      bindGroupLayouts: options.bindGroupLayouts,
    });
    const pipeline = await ctx.device.createRenderPipelineAsync({
      label: options.label,
      layout,
      vertex: {
        module,
        entryPoint: options.vertexEntryPoint ?? "vs_main",
        buffers: options.vertexBufferLayouts,
      },
      fragment: {
        module,
        entryPoint: options.fragmentEntryPoint ?? "fs_main",
        targets: options.targets,
      },
      primitive: options.primitive ?? { topology: "triangle-list" },
    });
    return new RenderPipeline(ctx, options, pipeline);
  }
}
