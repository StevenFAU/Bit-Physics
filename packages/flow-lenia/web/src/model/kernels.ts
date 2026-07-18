import type { OrganismConfig } from "./config.js";

/** Build ifftshifted, discretely normalized radial kernels in plane-major layout. */
export function buildSpatialKernels(config: OrganismConfig): Float32Array {
  const { n } = config;
  const n2 = n * n;
  const output = new Float32Array(config.kernels.length * n2 * 2);
  config.kernels.forEach((spec, kernelIndex) => {
    const radius = (config.baseRadius + config.radiusOffset) * spec.relativeRadius;
    const values = new Float64Array(n2);
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      const di = i < n / 2 ? i : i - n;
      for (let j = 0; j < n; j += 1) {
        const dj = j < n / 2 ? j : j - n;
        const distance = Math.hypot(di, dj) / radius;
        const cutoff = 0.5 * (Math.tanh((-config.cutoffSharpness * (distance - 1)) / 2) + 1);
        let rings = 0;
        for (let ring = 0; ring < 3; ring += 1) {
          const delta = distance - (spec.ringCenters[ring] as number);
          rings += (spec.ringAmplitudes[ring] as number) * Math.exp(-(delta * delta) / (spec.ringWidths[ring] as number));
        }
        const value = cutoff * rings;
        values[i * n + j] = value;
        sum += value;
      }
    }
    if (!(sum > 0) || !Number.isFinite(sum)) throw new Error(`kernel ${kernelIndex} failed normalization`);
    for (let cell = 0; cell < n2; cell += 1) {
      output[(kernelIndex * n2 + cell) * 2] = (values[cell] as number) / sum;
    }
  });
  return output;
}

export function kernelSums(spatial: Float32Array, n: number, count: number): number[] {
  const n2 = n * n;
  return Array.from({ length: count }, (_, kernel) => {
    let sum = 0;
    for (let cell = 0; cell < n2; cell += 1) sum += spatial[(kernel * n2 + cell) * 2] as number;
    return sum;
  });
}
