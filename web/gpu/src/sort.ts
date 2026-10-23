// GPU prefix scan and counting sort (00-foundation.md § 3.4 "agents at scale";
// first used by Slime Mould, shared with Swarm).
//
// CountingSort buckets N items by a u32 key in four steps — clear, histogram,
// exclusive scan, scatter — and leaves two buffers behind:
//   cellStart  keyCount + 1 u32: items with key k sit in order[cellStart[k] ..
//              cellStart[k + 1]); cellStart[keyCount] is the item count;
//   order      count u32: item indices grouped by key.
// The caller writes the keys (its own pass: a cell index, a tile index) and
// reads the result (a gather that reorders agents, a neighbour loop).
//
// Determinism: counts and cellStart are exact integers, the same on every run.
// The order of items within one key comes from atomic arrival and is NOT
// specified — consumers must not depend on it (Slime Mould's trail deposit is
// integer atomics; Swarm's neighbour sums are i32 fixed point).

import countingSortSrc from "./wgsl/counting-sort.wgsl?raw";
import scanSrc from "./wgsl/scan.wgsl?raw";

/** Values one scan workgroup handles (256 threads × 4). */
export const SCAN_BLOCK = 1024;
const WG = 256;
const MAX_GROUPS = 65535;

/** Value counts at each level of a multi-level scan of `n` values (last level fits one block). */
export function scanLevels(n: number): number[] {
  if (!Number.isInteger(n) || n < 1) throw new Error(`scan size must be a positive integer, got ${n}`);
  const levels = [n];
  while (levels[levels.length - 1]! > SCAN_BLOCK) levels.push(Math.ceil(levels[levels.length - 1]! / SCAN_BLOCK));
  return levels;
}

/** Split `groups` workgroups into a 2D dispatch within the 65535-per-dimension limit. */
export function dispatchShape(groups: number): [number, number] {
  if (groups <= MAX_GROUPS) return [Math.max(1, groups), 1];
  const y = Math.ceil(groups / MAX_GROUPS);
  return [Math.ceil(groups / y), y];
}

/** CPU reference for tests and in-page self-checks: stable counting sort. */
export function countingSortReference(keys: ArrayLike<number>, keyCount: number): { cellStart: Uint32Array; order: Uint32Array } {
  const cellStart = new Uint32Array(keyCount + 1);
  for (let i = 0; i < keys.length; i += 1) cellStart[Math.min(keys[i]!, keyCount - 1) + 1]! += 1;
  for (let k = 0; k < keyCount; k += 1) cellStart[k + 1]! += cellStart[k]!;
  const cursor = cellStart.slice(0, keyCount);
  const order = new Uint32Array(keys.length);
  for (let i = 0; i < keys.length; i += 1) order[cursor[Math.min(keys[i]!, keyCount - 1)]!++] = i;
  return { cellStart, order };
}

/**
 * Check a GPU result against the reference: identical cellStart, and each
 * bucket holds exactly the reference's items (in any order). Returns the
 * first problem, or null.
 */
export function checkCountingSort(
  keys: ArrayLike<number>,
  keyCount: number,
  cellStart: ArrayLike<number>,
  order: ArrayLike<number>,
): string | null {
  const ref = countingSortReference(keys, keyCount);
  for (let k = 0; k <= keyCount; k += 1) {
    if (cellStart[k] !== ref.cellStart[k]) return `cellStart[${k}] = ${cellStart[k]}, want ${ref.cellStart[k]}`;
  }
  const seen = new Uint8Array(keys.length);
  for (let k = 0; k < keyCount; k += 1) {
    for (let s = ref.cellStart[k]!; s < ref.cellStart[k + 1]!; s += 1) {
      const i = order[s]!;
      if (i >= keys.length || seen[i]) return `slot ${s} holds ${i}: out of range or duplicated`;
      seen[i] = 1;
      if (Math.min(keys[i]!, keyCount - 1) !== k) return `slot ${s} holds item ${i} with key ${keys[i]}, in bucket ${k}`;
    }
  }
  return null;
}

const STORAGE = (): number => GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;

/**
 * In-place exclusive prefix sum over `n` u32 values of a storage buffer.
 * Multi-level reduce-then-scan: up to 1024³ values. Bound to one buffer and
 * size at construction; `encode` records into an open compute pass.
 */
export class PrefixScan {
  readonly n: number;
  private readonly levels: number[];
  private readonly sums: GPUBuffer[] = [];
  private readonly params: GPUBuffer[] = [];
  private readonly groups: [number, number][] = [];
  private readonly binds: GPUBindGroup[] = [];
  private readonly scanPipe: GPUComputePipeline;
  private readonly addPipe: GPUComputePipeline;

  constructor(device: GPUDevice, data: GPUBuffer, n: number, label = "scan") {
    this.n = n;
    this.levels = scanLevels(n);
    const layout = device.createBindGroupLayout({
      label: `${label}-bgl`,
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const module = device.createShaderModule({ code: scanSrc, label });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    this.scanPipe = device.createComputePipeline({ label: `${label}-blocks`, layout: pl, compute: { module, entryPoint: "scan_blocks" } });
    this.addPipe = device.createComputePipeline({ label: `${label}-add`, layout: pl, compute: { module, entryPoint: "add_offsets" } });
    // level L scans levels[L] values of `src` and writes one total per block into sums[L]
    let src = data;
    for (let L = 0; L < this.levels.length; L += 1) {
      const blocks = Math.ceil(this.levels[L]! / SCAN_BLOCK);
      const shape = dispatchShape(blocks);
      const sums = device.createBuffer({ size: Math.max(16, blocks * 4), usage: STORAGE(), label: `${label}-sums-${L}` });
      const params = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-params-${L}` });
      device.queue.writeBuffer(params, 0, new Uint32Array([this.levels[L]!, shape[0], 0, 0]));
      this.sums.push(sums);
      this.params.push(params);
      this.groups.push(shape);
      this.binds.push(
        device.createBindGroup({
          layout,
          label: `${label}-bg-${L}`,
          entries: [
            { binding: 0, resource: { buffer: params } },
            { binding: 1, resource: { buffer: src } },
            { binding: 2, resource: { buffer: sums } },
          ],
        }),
      );
      src = sums;
    }
  }

  /** Record the scan into an open compute pass (dispatches run in order). */
  encode(pass: GPUComputePassEncoder): void {
    const L = this.levels.length;
    pass.setPipeline(this.scanPipe);
    for (let l = 0; l < L; l += 1) {
      pass.setBindGroup(0, this.binds[l]!);
      pass.dispatchWorkgroups(this.groups[l]![0], this.groups[l]![1]);
    }
    // fold the scanned block totals back down (the top level is one block: nothing to add)
    pass.setPipeline(this.addPipe);
    for (let l = L - 2; l >= 0; l -= 1) {
      pass.setBindGroup(0, this.binds[l]!);
      pass.dispatchWorkgroups(this.groups[l]![0], this.groups[l]![1]);
    }
  }

  destroy(): void {
    for (const b of this.sums) b.destroy();
    for (const b of this.params) b.destroy();
  }
}

export interface CountingSortOptions {
  /** Most items ever sorted (buffer capacity). */
  maxItems: number;
  /** Keys are 0 … keyCount − 1 (larger keys are clamped to the last bucket). */
  keyCount: number;
  label?: string;
}

export class CountingSort {
  readonly maxItems: number;
  readonly keyCount: number;
  /** keyCount + 1 u32: exclusive bucket offsets, then the total. */
  readonly cellStart: GPUBuffer;
  /** maxItems u32: item indices grouped by key. */
  readonly order: GPUBuffer;
  private readonly rank: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly scan: PrefixScan;
  private readonly layout: GPUBindGroupLayout;
  private readonly clearPipe: GPUComputePipeline;
  private readonly histPipe: GPUComputePipeline;
  private readonly scatterPipe: GPUComputePipeline;
  private readonly device: GPUDevice;
  private readonly label: string;
  private bindCache: { keys: GPUBuffer; bind: GPUBindGroup } | null = null;
  private count = 0;
  private itemShape: [number, number] = [1, 1];
  private readonly clearShape: [number, number];

  constructor(device: GPUDevice, o: CountingSortOptions) {
    if (o.keyCount < 1) throw new Error("CountingSort needs at least one key");
    this.device = device;
    this.maxItems = o.maxItems;
    this.keyCount = o.keyCount;
    this.label = o.label ?? "counting-sort";
    const label = this.label;
    this.cellStart = device.createBuffer({ size: (o.keyCount + 1) * 4, usage: STORAGE(), label: `${label}-cell-start` });
    this.order = device.createBuffer({ size: Math.max(16, o.maxItems * 4), usage: STORAGE(), label: `${label}-order` });
    this.rank = device.createBuffer({ size: Math.max(16, o.maxItems * 4), usage: STORAGE(), label: `${label}-rank` });
    this.params = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-params` });
    this.scan = new PrefixScan(device, this.cellStart, o.keyCount + 1, `${label}-scan`);
    this.layout = device.createBindGroupLayout({
      label: `${label}-bgl`,
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    const module = device.createShaderModule({ code: countingSortSrc, label });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
    const mk = (entryPoint: string): GPUComputePipeline =>
      device.createComputePipeline({ label: `${label}-${entryPoint}`, layout: pl, compute: { module, entryPoint } });
    this.clearPipe = mk("clear");
    this.histPipe = mk("histogram");
    this.scatterPipe = mk("scatter");
    this.clearShape = dispatchShape(Math.ceil((o.keyCount + 1) / WG));
    this.setCount(o.maxItems);
  }

  /**
   * Items to sort from now on (≤ maxItems). Written with queue.writeBuffer,
   * so it applies to whole submits: one count per submit.
   */
  setCount(count: number): void {
    if (count > this.maxItems) throw new Error(`CountingSort: ${count} items > capacity ${this.maxItems}`);
    this.count = count;
    this.itemShape = dispatchShape(Math.ceil(Math.max(count, this.keyCount + 1) / WG));
    // one stride serves both the item passes and the clear (both 1D in 256-thread rows)
    const stride = Math.max(this.itemShape[0], this.clearShape[0]) * WG;
    this.device.queue.writeBuffer(this.params, 0, new Uint32Array([count, this.keyCount, stride, 0]));
  }

  get items(): number {
    return this.count;
  }

  private bindFor(keys: GPUBuffer): GPUBindGroup {
    if (this.bindCache?.keys === keys) return this.bindCache.bind;
    const bind = this.device.createBindGroup({
      layout: this.layout,
      label: `${this.label}-bg`,
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        { binding: 1, resource: { buffer: keys } },
        { binding: 2, resource: { buffer: this.cellStart } },
        { binding: 3, resource: { buffer: this.rank } },
        { binding: 4, resource: { buffer: this.order } },
      ],
    });
    this.bindCache = { keys, bind };
    return bind;
  }

  /** Record clear → histogram → scan → scatter into an open compute pass. `keys` holds one u32 per item. */
  encode(pass: GPUComputePassEncoder, keys: GPUBuffer): void {
    const bind = this.bindFor(keys);
    // the stride is shared, so dispatch the larger shape for both clear and items
    const shape: [number, number] = [Math.max(this.itemShape[0], this.clearShape[0]), Math.max(this.itemShape[1], this.clearShape[1])];
    pass.setBindGroup(0, bind);
    pass.setPipeline(this.clearPipe);
    pass.dispatchWorkgroups(shape[0], shape[1]);
    if (this.count > 0) {
      pass.setPipeline(this.histPipe);
      pass.dispatchWorkgroups(shape[0], shape[1]);
    }
    this.scan.encode(pass);
    if (this.count > 0) {
      pass.setBindGroup(0, bind);
      pass.setPipeline(this.scatterPipe);
      pass.dispatchWorkgroups(shape[0], shape[1]);
    }
  }

  destroy(): void {
    this.cellStart.destroy();
    this.order.destroy();
    this.rank.destroy();
    this.params.destroy();
    this.scan.destroy();
  }
}
