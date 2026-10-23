// Capability tiers (00-foundation.md § 4.4).
//
// The tier is a starting guess from what the adapter and the page can see,
// refined by measurement: the quality governor (@bp/runtime) steps render
// scale down live, and a sim-size step-down is remembered per adapter so the
// next visit starts at the size that actually held its frame budget.

import type { GpuContext } from "./device.js";

export type Tier = "T1" | "T2" | "T3";

export const TIER_ORDER: readonly Tier[] = ["T1", "T2", "T3"];

export interface TierEnvironment {
  /** `(pointer: coarse)` matches — a touch-first device. */
  coarsePointer: boolean;
  /** min(screen.width, screen.height) in CSS px. */
  screenMin: number;
}

export function readTierEnvironment(): TierEnvironment {
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const s = typeof screen === "object" ? Math.min(screen.width, screen.height) : 1080;
  return { coarsePointer: coarse, screenMin: s };
}

const INTEGRATED = /intel|apple|arm|mali|adreno|qualcomm|powervr|imagination|samsung/i;

/** First guess before any measurement. Software rasterisers always start at T1. */
export function guessTier(ctx: Pick<GpuContext, "info">, env: TierEnvironment): Tier {
  if (ctx.info.software) return "T1";
  if (env.coarsePointer && env.screenMin <= 900) return "T1";
  if (INTEGRATED.test(`${ctx.info.vendor} ${ctx.info.architecture}`)) return "T2";
  return "T3";
}

const KEY = (adapterId: string): string => `bp.tier.v1.${adapterId}`;

/** The tier this adapter settled at on a previous visit, if any. */
export function rememberedTier(adapterId: string): Tier | null {
  try {
    const v = localStorage.getItem(KEY(adapterId));
    return v === "T1" || v === "T2" || v === "T3" ? v : null;
  } catch {
    return null;
  }
}

export function rememberTier(adapterId: string, tier: Tier): void {
  try {
    localStorage.setItem(KEY(adapterId), tier);
  } catch {
    /* private mode / blocked storage: the guess is used next time */
  }
}

/** Resolve the starting tier: an explicit override, then memory, then the guess. */
export function pickTier(
  ctx: Pick<GpuContext, "info" | "adapterId">,
  env: TierEnvironment,
  override?: string | null,
): Tier {
  if (override === "T1" || override === "T2" || override === "T3") return override;
  const remembered = rememberedTier(ctx.adapterId);
  const guess = guessTier(ctx, env);
  // Memory can only lower the guess — a remembered step-down holds, but a
  // stale "T3" never overrides a software adapter.
  if (remembered && TIER_ORDER.indexOf(remembered) < TIER_ORDER.indexOf(guess)) return remembered;
  return guess;
}

export function lowerTier(t: Tier): Tier {
  const i = TIER_ORDER.indexOf(t);
  return TIER_ORDER[Math.max(0, i - 1)]!;
}
