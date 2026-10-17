// The Map's geometry: which chemistry sits at which point.
//
// Patterns in Gray–Scott live in a narrow band of the (F, k) plane that hugs
// the saddle-node line k = (√F − 2F)/2 — above it everything dies back to
// U = 1, below it the dish turns solid. A plain rectangle of (F, k) spends
// most of the screen on those two flat regions, so The Map follows the band:
// F still rises left → right, and in each column k rises bottom → top across
// a window centred near the line. The breadcrumb draws this band
// on the full plane so the warp is never hidden.
//
// live.wgsl `map_chem` implements the same function in f32.

export const MAP_F: readonly [number, number] = [0.008, 0.068];
// The band narrows as F grows (placed by eye on the live map: ~0.014 wide at
// F 0.008, ~0.0065 at F 0.068), and the window follows it.
/** k window height at F (bottom → top of the screen). */
export const kSpan = (F: number): number => 0.014 - 0.125 * (F - MAP_F[0]);
/** Window centre above the saddle-node line at F. */
export const kOffset = (F: number): number => 0.0015 - 0.017 * (F - MAP_F[0]);
/** The plane the breadcrumb shows (and the scale for "nearest regime"). */
export const PLANE_K: readonly [number, number] = [0.036, 0.074];

export function saddleNode(F: number): number {
  return 0.5 * (Math.sqrt(Math.max(F, 0)) - 2 * F);
}

/** Absolute (F, k) at map uv (u right, v down), both in [0, 1]. */
export function mapChem(u: number, v: number): [number, number] {
  const F = MAP_F[0] + u * (MAP_F[1] - MAP_F[0]);
  return [F, saddleNode(F) + kOffset(F) + (0.5 - v) * kSpan(F)];
}

/** Map uv of a chemistry; v outside [0, 1] means off the band. */
export function mapUv(F: number, k: number): [number, number] {
  const u = (F - MAP_F[0]) / (MAP_F[1] - MAP_F[0]);
  return [u, 0.5 - (k - saddleNode(F) - kOffset(F)) / kSpan(F)];
}
