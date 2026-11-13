// The released ball's members on the CPU, mirroring release.wgsl's
// counter-hash draw (same bp/hash, same cube rejection), so the page knows
// where its tracked members started and which colour each one wears.

import { hash3, unit } from "@bp/runtime";
import type { V3 } from "./lorenz.js";

/** Member i's unit-ball point (member 0 is the centre itself). */
export function ballPoint(seed: number, i: number): V3 {
  if (i === 0) return [0, 0, 0];
  for (let t = 0; t < 16; t += 1) {
    const u: V3 = [unit(hash3(seed, i, t * 3)) * 2 - 1, unit(hash3(seed, i, t * 3 + 1)) * 2 - 1, unit(hash3(seed, i, t * 3 + 2)) * 2 - 1];
    if (u[0] * u[0] + u[1] * u[1] + u[2] * u[2] <= 1) return u;
  }
  return [0, 0, 0];
}

/** Member i's colour attribute: where it started along the colour axis, in [0, 1]. */
export function memberAttr(seed: number, i: number, axis: V3): number {
  const u = ballPoint(seed, i);
  return Math.min(Math.max(0.5 + 0.5 * (u[0] * axis[0] + u[1] * axis[1] + u[2] * axis[2]), 0), 1);
}
