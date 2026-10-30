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
 * site URLs for a page at the sim root, where "../../" is the site root: the
 * nav and card links, and the card's preview (img/video src, video poster).
 * On the v1/ page, resolve them from the sim root instead. Does nothing on a
 * page at the root. Both elements are appended to <body>, so watching its
 * children catches the no-WebGPU card, which appears after an async check;
 * the rebase runs in that append's microtask, before the preview's request
 * for the wrong URL can fail and remove it.
 */
export function rebaseSharedChrome(): void {
  if (new URL("./", location.href).href === SIM_ROOT) return;
  const card = '[data-bp2="webgpu-fallback"]';
  const fix = (): void => {
    for (const [selector, attr] of [
      [`.bps-nav a[href^="../"], ${card} a[href^="../"]`, "href"],
      [`${card} img[src^="../"], ${card} video[src^="../"]`, "src"],
      [`${card} video[poster^="../"]`, "poster"],
    ] as const) {
      for (const el of document.querySelectorAll(selector)) {
        el.setAttribute(attr, new URL(el.getAttribute(attr) ?? "", SIM_ROOT).href);
      }
    }
  };
  fix();
  new MutationObserver(fix).observe(document.body, { childList: true });
}
