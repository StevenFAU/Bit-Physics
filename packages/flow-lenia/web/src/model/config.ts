export const MODEL_VARIANT = "flow-lenia-ecosystem-v1" as const;
export const CHANNELS = 3;
export const KERNELS = 9;
export const GATHER_RADIUS = 5;
export const SQUARE_HALF_WIDTH = 0.65;
export const DT = 0.2;
export const DENSITY_THRESHOLD = 2.0;
export const DENSITY_EXPONENT = 2.0;
export const MAX_DISPLACEMENT = GATHER_RADIUS - SQUARE_HALF_WIDTH;

export interface KernelSpec {
  source: number;
  target: number;
  relativeRadius: number;
  growthMean: number;
  growthWidth: number;
  weight: number;
  ringCenters: readonly [number, number, number];
  ringAmplitudes: readonly [number, number, number];
  ringWidths: readonly [number, number, number];
}

const connections = [[0, 0], [0, 0], [0, 1], [1, 1], [1, 1], [1, 2], [2, 0], [2, 2], [2, 2]] as const;
const radii = [0.72, 0.48, 0.63, 0.70, 0.44, 0.61, 0.59, 0.68, 0.42] as const;
const means = [0.22, 0.31, 0.19, 0.24, 0.34, 0.17, 0.21, 0.26, 0.32] as const;
const widths = [0.070, 0.085, 0.060, 0.075, 0.090, 0.052, 0.065, 0.080, 0.088] as const;
const weights = [0.65, -0.18, 0.42, 0.61, -0.16, 0.38, 0.40, 0.58, -0.14] as const;
const centerSets = [[0.18, 0.50, 0.82], [0.27, 0.61, 0.89], [0.15, 0.46, 0.76]] as const;
const amplitudeSets = [[0.7, 1.0, 0.5], [1.0, 0.55, 0.25], [0.35, 1.0, 0.72]] as const;
const ringWidthSets = [[0.020, 0.035, 0.025], [0.025, 0.040, 0.020], [0.018, 0.030, 0.030]] as const;

export const KERNEL_SPECS: readonly KernelSpec[] = connections.map(([source, target], index) => ({
  source,
  target,
  relativeRadius: radii[index] as number,
  growthMean: means[index] as number,
  growthWidth: widths[index] as number,
  weight: weights[index] as number,
  ringCenters: centerSets[index % 3] as readonly [number, number, number],
  ringAmplitudes: amplitudeSets[index % 3] as readonly [number, number, number],
  ringWidths: ringWidthSets[index % 3] as readonly [number, number, number],
}));

export interface OrganismConfig {
  n: number;
  seed: number;
  baseRadius: number;
  radiusOffset: number;
  cutoffSharpness: number;
  dt: number;
  gatherRadius: number;
  squareHalfWidth: number;
  densityThreshold: number;
  densityExponent: number;
  kernels: readonly KernelSpec[];
}

export function organismConfig(n: number, seed = 42): OrganismConfig {
  if (n <= GATHER_RADIUS * 2 || !Number.isInteger(Math.log2(n))) {
    throw new Error("Flow Lenia grid must be a power of two larger than the gather diameter");
  }
  return {
    n,
    seed: seed >>> 0,
    baseRadius: 10,
    radiusOffset: 15,
    cutoffSharpness: 10,
    dt: DT,
    gatherRadius: GATHER_RADIUS,
    squareHalfWidth: SQUARE_HALF_WIDTH,
    densityThreshold: DENSITY_THRESHOLD,
    densityExponent: DENSITY_EXPONENT,
    kernels: KERNEL_SPECS,
  };
}

export function kernelParameterRecords(config: OrganismConfig): ArrayBuffer {
  const raw = new ArrayBuffer(config.kernels.length * 32);
  const u32 = new Uint32Array(raw);
  const f32 = new Float32Array(raw);
  config.kernels.forEach((kernel, index) => {
    const offset = index * 8;
    u32[offset] = kernel.source;
    u32[offset + 1] = kernel.target;
    f32[offset + 2] = kernel.growthMean;
    f32[offset + 3] = kernel.growthWidth;
    f32[offset + 4] = kernel.weight;
  });
  return raw;
}
