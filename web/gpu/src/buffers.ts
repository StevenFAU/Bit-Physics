// Small buffer helpers shared by Field Studies sims.

// (GPUBufferUsage is read lazily so this module also loads outside a browser.)
export function storageBuffer(device: GPUDevice, size: number, label: string, extra = 0): GPUBuffer {
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | extra;
  return device.createBuffer({ size: align4(size), usage, label });
}

export function uniformBuffer(device: GPUDevice, size: number, label: string): GPUBuffer {
  return device.createBuffer({ size: align(size, 16), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label });
}

export function align(n: number, to: number): number {
  return Math.ceil(n / to) * to;
}

export function align4(n: number): number {
  return align(n, 4);
}

/** Copy `size` bytes of `src` (from `offset`) to the CPU. One-shot; allocates a staging buffer. */
export async function readBuffer(
  device: GPUDevice,
  src: GPUBuffer,
  size: number,
  offset = 0,
): Promise<ArrayBuffer> {
  const staging = device.createBuffer({
    size: align4(size),
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    label: `readback:${src.label}`,
  });
  const enc = device.createCommandEncoder({ label: "readback" });
  enc.copyBufferToBuffer(src, offset, staging, 0, align4(size));
  device.queue.submit([enc.finish()]);
  try {
    await staging.mapAsync(GPUMapMode.READ);
    return staging.getMappedRange().slice(0, size);
  } finally {
    staging.destroy();
  }
}

/**
 * A reusable readback slot: at most one map in flight, so a slow adapter can
 * never pile up staging buffers. `read()` resolves null when the slot is busy.
 */
export class ReadbackSlot {
  private staging: GPUBuffer;
  private busy = false;

  constructor(
    device: GPUDevice,
    readonly size: number,
    label: string,
  ) {
    this.staging = device.createBuffer({
      size: align4(size),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label,
    });
  }

  get pending(): boolean {
    return this.busy;
  }

  /** Record the copy into `enc`; call `collect()` after the submit. Returns false when busy. */
  record(enc: GPUCommandEncoder, src: GPUBuffer, srcOffset = 0): boolean {
    if (this.busy) return false;
    this.busy = true;
    enc.copyBufferToBuffer(src, srcOffset, this.staging, 0, align4(this.size));
    return true;
  }

  async collect(): Promise<ArrayBuffer | null> {
    try {
      await this.staging.mapAsync(GPUMapMode.READ);
      const out = this.staging.getMappedRange().slice(0, this.size);
      this.staging.unmap();
      return out;
    } catch {
      return null;
    } finally {
      this.busy = false;
    }
  }

  destroy(): void {
    this.staging.destroy();
  }
}
