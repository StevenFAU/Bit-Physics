// Types for the pure-JS f64 mirror of the gated field (curlnoise64.mjs) —
// what the v2 page (Prove, Learn) and the unit tests import from it.

export type Vec3 = readonly [number, number, number] | readonly number[];

/** The mirror's field config (camelCase; seed 0 and time 0 when omitted). */
export interface MirrorConfig {
  octaves: number;
  ell0: number;
  gain: number;
  lacunarity: number;
  amplitude?: number;
  seed?: number;
  /** Domain-pan phase (WGSL F.obs2.w). */
  time?: number;
  obstacleCenter?: readonly number[];
  obstacleRadius?: number;
  obstacleRampWidth?: number;
  obstacleNoiseAmp?: number;
}

export interface NoiseD2 {
  val: number;
  grad: number[];
  /** Row-major 3×3. */
  hess: number[];
}

export const SCALE: number;
export const CHANNEL_OFFSETS: number[][];
export const OCTAVE_DRIFTS: number[][];
export function snoiseD2(v: Vec3): NoiseD2;
export function fbmD2(x: Vec3, cfg: MirrorConfig, channel: number): NoiseD2;
export function potentials(x: Vec3, cfg: MirrorConfig): { f1: number; g1: number[]; f2: number; g2: number[] };
export function crossprodVelocity(x: Vec3, cfg: MirrorConfig): number[];
/** The two iso values (f₁, f₂) at x. */
export function isoValues(x: Vec3, cfg: MirrorConfig): [number, number];
export function traceDivOpen(x: Vec3, cfg: MirrorConfig): number;
export function confinement(x: Vec3, cfg: MirrorConfig): Record<string, number>;
export function matchedDiv2dNormalized(psi: ArrayLike<number>, n: number, dx: number): number;
export function abcFlow(x: Vec3, A?: number, B?: number, C?: number): number[];
export function abcCurl(x: Vec3, A?: number, B?: number, C?: number): number[];
export function lcg(seed: number): () => number;
