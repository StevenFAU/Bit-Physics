import { CHANNELS } from "./config.js";

function mix32(value: number): number {
  let x = value >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function unitHash(seed: number, index: number): number {
  return mix32(seed ^ Math.imul(index + 1, 0x9e3779b9)) / 0x1_0000_0000;
}

/** A deterministic, localized multi-channel seed; no browser RNG is consulted. */
export function makeSeededOrganismMass(n: number, seed: number): Float32Array {
  const mass = new Float32Array(n * n * 4);
  const angle = unitHash(seed, 0) * Math.PI * 2;
  const cx = n * (0.5 + 0.025 * Math.cos(angle));
  const cy = n * (0.5 + 0.025 * Math.sin(angle));
  const scale = n / 256;
  for (let i = 0; i < n; i += 1) {
    const di0 = ((i - cx + n / 2) % n) - n / 2;
    for (let j = 0; j < n; j += 1) {
      const dj0 = ((j - cy + n / 2) % n) - n / 2;
      const cell = i * n + j;
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        const rotation = angle + channel * 2.0943951023931953;
        const ca = Math.cos(rotation);
        const sa = Math.sin(rotation);
        const u = ca * di0 + sa * dj0;
        const v = -sa * di0 + ca * dj0;
        const offset = (channel - 1) * 9 * scale;
        const broad = Math.exp(-0.5 * (((u - offset) / (29 * scale)) ** 2 + (v / (20 * scale)) ** 2));
        const ringRadius = Math.hypot(u - offset, v);
        const ring = Math.exp(-0.5 * ((ringRadius - 18 * scale) / (5.5 * scale)) ** 2);
        const texture = 0.88 + 0.12 * Math.cos((u + 0.7 * v) / Math.max(1, 4.5 * scale) + unitHash(seed, channel + 2) * 6.283185307179586);
        mass[cell * 4 + channel] = Math.max(0, (0.72 * broad + 0.24 * ring) * texture);
      }
    }
  }
  return mass;
}

/** Smooth periodic field shared byte-for-byte in intent with the f64 fixture generator. */
export function makeConformanceMass(n: number, variant = 0): Float32Array {
  const mass = new Float32Array(n * n * 4);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        const p = 2 * Math.PI * ((channel + 1) * i + (channel + 2) * j) / n;
        const q = 2 * Math.PI * ((channel + 3) * i - (channel + 1) * j) / n;
        let value = 0.16 + channel * 0.035 + 0.055 * Math.sin(p) + 0.025 * Math.cos(q);
        if (variant === 1) value += (i < 2 || j >= n - 2) ? 0.24 / (channel + 1) : 0;
        if (variant === 2) value += (i >= n / 2 - 2 && i <= n / 2 + 1 && j >= n / 2 - 2 && j <= n / 2 + 1) ? 2.4 - channel * 0.25 : 0;
        mass[(i * n + j) * 4 + channel] = value;
      }
    }
  }
  return mass;
}
