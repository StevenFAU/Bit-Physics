// Swarm — how big the ocean is.
//
// The tier sets the fish count (spec § Performance targets); the world is
// sized to hold them at a declared density, shaped to the viewport's aspect,
// so the torus covers the screen exactly at the default view and the same
// rule makes the same schools on a phone and on a desktop — only more of
// them. (v4 scaled its world by √(N / 4000) at the canvas aspect; at 16:9
// that is the same density as v4's 4,000-agent default.)

import type { Tier } from "@bp/gpu";

/** Fish per tier for Open Water (spec: T3 1M, T2 250k, T1 60k). */
export const AGENTS: Record<Tier, number> = { T3: 1_000_000, T2: 250_000, T1: 60_000 };

/** v4's density: 4,000 agents on its 2·(16/9) × 2 world. Fish per world unit². */
export const V4_DENSITY = 4000 / (4 * (16 / 9));

export interface World {
  halfW: number;
  halfH: number;
}

/** A world of n / density units² with the viewport's aspect. */
export function worldFor(n: number, viewW: number, viewH: number, density: number): World {
  const aspect = Math.min(Math.max(viewW / Math.max(viewH, 1), 0.4), 2.5);
  const area = n / density;
  const halfH = Math.sqrt(area / aspect) / 2;
  return { halfW: halfH * aspect, halfH };
}
