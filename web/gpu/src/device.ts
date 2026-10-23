// WebGPU device acquisition for Field Studies sims (00-foundation.md § 4.4).
//
// One call: request a high-performance adapter, read its info, limits and
// optional features, request a device with whichever of the optional
// features the adapter offers, and report what was granted. Nothing here
// is required beyond core WebGPU — every optional feature has a fallback
// in the code that uses it (timestamp-query → submit-latency timing).

export type OptionalFeature =
  | "timestamp-query"
  | "float32-filterable"
  | "shader-f16"
  | "subgroups";

export interface AdapterSummary {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  /** Software rasteriser (llvmpipe/lavapipe, SwiftShader, WARP) or a fallback adapter. */
  software: boolean;
}

export interface GpuContext {
  adapter: GPUAdapter;
  device: GPUDevice;
  queue: GPUQueue;
  info: AdapterSummary;
  /** Features actually enabled on the device. */
  features: ReadonlySet<string>;
  /** `timestamp-query` granted (GPU pass timings available). */
  timestamps: boolean;
  /** Stable, human-readable adapter id for proof cards and per-adapter caches. */
  adapterId: string;
}

export interface AcquireOptions {
  powerPreference?: GPUPowerPreference;
  /** Defaults to every feature in `OptionalFeature`. */
  optionalFeatures?: readonly OptionalFeature[];
  label?: string;
}

const SOFTWARE = /llvmpipe|lavapipe|swiftshader|software|warp|microsoft basic/i;

export class WebGPUUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "WebGPUUnavailableError";
  }
}

export function summarizeAdapter(adapter: GPUAdapter): AdapterSummary {
  const raw = (adapter as GPUAdapter & { info?: GPUAdapterInfo }).info;
  const info = {
    vendor: raw?.vendor ?? "",
    architecture: raw?.architecture ?? "",
    device: raw?.device ?? "",
    description: raw?.description ?? "",
  };
  const fallback =
    (raw as (GPUAdapterInfo & { isFallbackAdapter?: boolean }) | undefined)?.isFallbackAdapter === true ||
    (adapter as GPUAdapter & { isFallbackAdapter?: boolean }).isFallbackAdapter === true;
  const text = `${info.vendor} ${info.architecture} ${info.device} ${info.description}`;
  return { ...info, software: fallback || SOFTWARE.test(text) };
}

export function adapterIdOf(info: AdapterSummary): string {
  const parts = [info.vendor, info.architecture, info.device || info.description].filter((s) => s.length > 0);
  return parts.length > 0 ? parts.join(" · ") : "unknown adapter";
}

export async function acquireGpu(options: AcquireOptions = {}): Promise<GpuContext> {
  const gpu = (globalThis as { navigator?: { gpu?: GPU } }).navigator?.gpu;
  if (!gpu) throw new WebGPUUnavailableError("This browser does not expose WebGPU.");
  const adapter = await gpu.requestAdapter({ powerPreference: options.powerPreference ?? "high-performance" });
  if (!adapter) {
    throw new WebGPUUnavailableError(
      "WebGPU is present, but no compatible GPU adapter was found — it may be turned off, " +
        "blocklisted for this GPU, or unavailable in this browsing mode.",
    );
  }
  const wanted: readonly OptionalFeature[] =
    options.optionalFeatures ?? ["timestamp-query", "float32-filterable", "shader-f16", "subgroups"];
  const requiredFeatures = wanted.filter((f) => adapter.features.has(f)) as GPUFeatureName[];
  const device = await adapter.requestDevice({
    label: options.label ?? "field-studies",
    requiredFeatures,
  });
  const info = summarizeAdapter(adapter);
  const features = new Set<string>(Array.from(device.features));
  return {
    adapter,
    device,
    queue: device.queue,
    info,
    features,
    timestamps: features.has("timestamp-query"),
    adapterId: adapterIdOf(info),
  };
}
