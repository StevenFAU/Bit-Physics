// The sim's own root: where Vite copies public/ (the gate's input files,
// favicon.svg). It is /sims/<sim>/ on Pages and / under validate's standalone
// serve.
//
// This dist ships pages at two depths: the Field Studies page at the root and
// the previous page under v1/, kept for one release (docs/planning/rebuild-v2/
// README.md, release rule). A page-relative "./x" or "../x" is right for only
// one of them, so public files resolve from this module instead. Every built
// chunk lives in <root>/assets/, and in dev this file is served from
// <root>/src/, so the root is one level up either way.

// A variable, not a literal: Vite rewrites new URL("literal", import.meta.url)
// into an asset import.
const UP = "../";

export const SIM_ROOT: string = new URL(UP, import.meta.url).href;

/** URL of a file Vite copied from public/, given its path under the sim root. */
export function simAsset(path: string): string {
  return new URL(path, SIM_ROOT).href;
}

/**
 * The shared v1 chrome (common-web's panel nav and no-WebGPU card) writes its
 * site links for a page at the sim root, where "../../" is the site root. On
 * the v1/ page, resolve them from the sim root instead. Does nothing on a page
 * at the root. Both elements are appended to <body>, so watching its children
 * catches the no-WebGPU card, which appears after an async check.
 */
export function rebaseSharedChrome(): void {
  if (new URL("./", location.href).href === SIM_ROOT) return;
  const fix = (): void => {
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      '.bps-nav a[href^="../"], [data-bp2="webgpu-fallback"] a[href^="../"]',
    )) {
      a.href = new URL(a.getAttribute("href") ?? "", SIM_ROOT).href;
    }
  };
  fix();
  new MutationObserver(fix).observe(document.body, { childList: true });
}
