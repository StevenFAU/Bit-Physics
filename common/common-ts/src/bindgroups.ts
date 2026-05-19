// Bind-group + bind-group-layout helpers. Thin wrappers over the
// WebGPU primitives that make common patterns one-liners and keep the
// repetitive descriptor objects from leaking into call sites.

import type { DeviceContext } from "./context.js";

export interface StorageBindingSpec {
  binding: number;
  visibility: GPUShaderStageFlags;
  type: "read-only-storage" | "storage";
}

export interface UniformBindingSpec {
  binding: number;
  visibility: GPUShaderStageFlags;
}

/**
 * Build a `GPUBindGroupLayout` from a sparse list of typed bindings.
 *
 * Caller supplies storage and uniform descriptors separately; the
 * helper merges them by `binding` index.
 */
export function makeBindGroupLayout(
  ctx: DeviceContext,
  storage: StorageBindingSpec[] = [],
  uniforms: UniformBindingSpec[] = [],
  label?: string,
): GPUBindGroupLayout {
  const entries: GPUBindGroupLayoutEntry[] = [];
  for (const s of storage) {
    entries.push({
      binding: s.binding,
      visibility: s.visibility,
      buffer: { type: s.type },
    });
  }
  for (const u of uniforms) {
    entries.push({
      binding: u.binding,
      visibility: u.visibility,
      buffer: { type: "uniform" },
    });
  }
  entries.sort((a, b) => a.binding - b.binding);
  return ctx.device.createBindGroupLayout({ label, entries });
}

export interface BindGroupBinding {
  binding: number;
  resource: GPUBindingResource;
}

/** Build a `GPUBindGroup` from a layout and an entry list. */
export function makeBindGroup(
  ctx: DeviceContext,
  layout: GPUBindGroupLayout,
  bindings: BindGroupBinding[],
  label?: string,
): GPUBindGroup {
  return ctx.device.createBindGroup({
    label,
    layout,
    entries: bindings.map((b) => ({ binding: b.binding, resource: b.resource })),
  });
}
