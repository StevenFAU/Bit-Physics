// Device-init helper — see phase-0-plan section 3.3.7 for the public
// surface. `createContext()` requests a WebGPU adapter, requests a
// device, and returns the bundle alongside the adapter's feature list.

export interface DeviceContext {
  device: GPUDevice;
  queue: GPUQueue;
  adapter: GPUAdapter;
  features: GPUFeatureName[];
}

export interface CreateContextOptions {
  /** Adapter request options forwarded verbatim. */
  adapterOptions?: GPURequestAdapterOptions;
  /** Device descriptor forwarded verbatim. */
  deviceDescriptor?: GPUDeviceDescriptor;
}

/**
 * Acquire a WebGPU `DeviceContext`.
 *
 * Throws if the runtime lacks a `navigator.gpu` surface (Node without
 * the WebGPU shim, browsers that disable WebGPU, etc.). Throws if no
 * adapter is available even when `navigator.gpu` exists.
 */
export async function createContext(
  options: CreateContextOptions = {},
): Promise<DeviceContext> {
  const gpu = (globalThis as { navigator?: { gpu?: GPU } }).navigator?.gpu;
  if (gpu === undefined) {
    throw new Error(
      "WebGPU unavailable: navigator.gpu is undefined (browser without WebGPU support, " +
        "or Node without a WebGPU runtime shim).",
    );
  }
  const adapter = await gpu.requestAdapter(options.adapterOptions);
  if (adapter === null) {
    throw new Error("WebGPU unavailable: requestAdapter returned null.");
  }
  const device = await adapter.requestDevice(options.deviceDescriptor);
  return {
    adapter,
    device,
    queue: device.queue,
    features: Array.from(adapter.features) as GPUFeatureName[],
  };
}
