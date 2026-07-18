export const M0_CHANNELS = 3;
export const M0_KERNELS = 9;
export const M0_DD = 5;
export const M0_SIGMA = 0.65;

export interface BufferInventoryRow {
  name: string;
  bytesPerCell: number;
  buffers: number;
  bytes: number;
  purpose: string;
}

export interface MemoryInventory {
  n: number;
  rows: BufferInventoryRow[];
  totalBytes: number;
  largestBufferBytes: number;
}

interface BufferPlanRow {
  name: string;
  bytesPerCell: number;
  buffers: number;
  purpose: string;
}

// Projected M4 allocation, including arrays not needed by the M0 executable.
// It is deliberately conservative: cached complex kernel spectra retain both
// components and every ping-pong state is counted at full f32/u32 width.
const COMPLETE_ECOSYSTEM_PLAN: BufferPlanRow[] = [
  { name: "mass ping/pong", bytesPerCell: 16, buffers: 2, purpose: "vec4f mass state" },
  { name: "transport source", bytesPerCell: 48, buffers: 1, purpose: "mass + x/y displacement vec4f" },
  { name: "complex FFT ping/pong", bytesPerCell: 8 * M0_KERNELS, buffers: 2, purpose: "K complex planes" },
  { name: "kernel spectra", bytesPerCell: 8 * M0_KERNELS, buffers: 1, purpose: "K cached complex spectra" },
  { name: "kernel responses", bytesPerCell: 4 * M0_KERNELS, buffers: 1, purpose: "K real response planes" },
  { name: "affinity", bytesPerCell: 16, buffers: 1, purpose: "three channel targets in vec4f" },
  { name: "flow x/y", bytesPerCell: 16, buffers: 2, purpose: "three channel components in vec4f" },
  { name: "genome H ping/pong", bytesPerCell: 48, buffers: 2, purpose: "three vec4f records per cell" },
  { name: "genome Q ping/pong", bytesPerCell: 48, buffers: 2, purpose: "three vec4f records per cell" },
  { name: "identity ping/pong", bytesPerCell: 16, buffers: 2, purpose: "fingerprint, lineage, flags" },
];

export function completeEcosystemInventory(n: number): MemoryInventory {
  const cells = n * n;
  const rows = COMPLETE_ECOSYSTEM_PLAN.map((row) => ({
    ...row,
    bytes: row.bytesPerCell * row.buffers * cells,
  }));
  return {
    n,
    rows,
    totalBytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    largestBufferBytes: 8 * M0_KERNELS * cells,
  };
}

export interface BindingInventoryRow {
  pipeline: string;
  storageBindings: number;
  uniformBindings: number;
  dispatches128: number;
  dispatches256: number;
  note: string;
}

export const BINDING_INVENTORY: BindingInventoryRow[] = [
  {
    pipeline: "batched FFT stage",
    storageBindings: 2,
    uniformBindings: 2,
    dispatches128: 28,
    dispatches256: 32,
    note: "forward C and inverse K together; two axes × log2(N) for each direction",
  },
  {
    pipeline: "spectral expansion",
    storageBindings: 3,
    uniformBindings: 1,
    dispatches128: 1,
    dispatches256: 1,
    note: "C source spectra × cached K kernels -> K response planes",
  },
  {
    pipeline: "mass-only gather",
    storageBindings: 2,
    uniformBindings: 1,
    dispatches128: 1,
    dispatches256: 1,
    note: "transport scratch -> next mass",
  },
  {
    pipeline: "full-state gather",
    storageBindings: 8,
    uniformBindings: 1,
    dispatches128: 1,
    dispatches256: 1,
    note: "transport, mass out, H/Q/identity ping-pong; exactly the portable storage floor",
  },
];

export interface LimitSnapshot {
  maxBufferSize: number;
  maxStorageBufferBindingSize: number;
  maxStorageBuffersPerShaderStage: number;
  maxBindingsPerBindGroup: number;
  maxComputeInvocationsPerWorkgroup: number;
  maxComputeWorkgroupStorageSize: number;
  maxComputeWorkgroupsPerDimension: number;
}

export function snapshotLimits(limits: GPUSupportedLimits): LimitSnapshot {
  return {
    maxBufferSize: limits.maxBufferSize,
    maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
    maxStorageBuffersPerShaderStage: limits.maxStorageBuffersPerShaderStage,
    maxBindingsPerBindGroup: limits.maxBindingsPerBindGroup,
    maxComputeInvocationsPerWorkgroup: limits.maxComputeInvocationsPerWorkgroup,
    maxComputeWorkgroupStorageSize: limits.maxComputeWorkgroupStorageSize,
    maxComputeWorkgroupsPerDimension: limits.maxComputeWorkgroupsPerDimension,
  };
}

export function assertArchitectureFits(n: number, limits: LimitSnapshot): string[] {
  const inventory = completeEcosystemInventory(n);
  const failures: string[] = [];
  if (inventory.largestBufferBytes > limits.maxBufferSize) failures.push("maxBufferSize");
  if (inventory.largestBufferBytes > limits.maxStorageBufferBindingSize) {
    failures.push("maxStorageBufferBindingSize");
  }
  if (limits.maxStorageBuffersPerShaderStage < 8) failures.push("maxStorageBuffersPerShaderStage");
  if (limits.maxBindingsPerBindGroup < 9) failures.push("maxBindingsPerBindGroup");
  if (limits.maxComputeInvocationsPerWorkgroup < 128) failures.push("maxComputeInvocationsPerWorkgroup");
  if (limits.maxComputeWorkgroupStorageSize < 16_384) failures.push("maxComputeWorkgroupStorageSize");
  return failures;
}
