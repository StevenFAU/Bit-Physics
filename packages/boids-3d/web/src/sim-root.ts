// The sim's own root: where Vite copies public/ (the gate's committed initial
// condition boids-ic-seed42.bin, favicon.svg). It is /sims/boids-3d/ on Pages
// and / under validate's standalone serve.
//
// This dist ships pages at two depths: v1 at the root and the Murmuration
// rebuild under v2/ (docs/planning/rebuild-v2/07-boids-3d.md). A page-relative
// "./x" (v1's import.meta.env.BASE_URL) is right for only one of them, so the
// v2 page resolves public files from this module instead. Every built chunk
// lives in <root>/assets/, and in dev this file is served from <root>/src/, so
// the root is one level up either way.

// A variable, not a literal: Vite rewrites new URL("literal", import.meta.url)
// into an asset import.
const UP = "../";

export const SIM_ROOT: string = new URL(UP, import.meta.url).href;

/** URL of a file Vite copied from public/, given its path under the sim root. */
export function simAsset(path: string): string {
  return new URL(path, SIM_ROOT).href;
}
