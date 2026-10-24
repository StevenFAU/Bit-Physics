// Overlays: Toast, ShortcutSheet, LoadingVeil, NoWebGPU.

import { h } from "./dom.js";
import { icon } from "./icons.js";

export class Toast {
  readonly el: HTMLElement;
  private timer = 0;
  constructor() {
    this.el = h("div", { class: "bp-toast", role: "status", "aria-live": "polite" });
  }
  show(message: string, ms = 3200): void {
    window.clearTimeout(this.timer);
    this.el.textContent = message;
    this.el.classList.add("is-shown");
    this.timer = window.setTimeout(() => this.el.classList.remove("is-shown"), ms);
  }
}

export interface Shortcut {
  keys: string;
  action: string;
}

export class ShortcutSheet {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private returnFocus: HTMLElement | null = null;
  constructor() {
    const close = h("button", { type: "button", class: "bp-icon-btn", "aria-label": "Close shortcuts", html: icon("close", 18) });
    this.list = h("dl", { class: "bp-shortcuts" });
    this.el = h(
      "div",
      { class: "bp-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "bp-sheet-title", hidden: true },
      h(
        "div",
        { class: "bp-sheet-card bp-surface" },
        h("header", { role: "none" }, h("h2", { id: "bp-sheet-title" }, "Keyboard shortcuts"), close),
        this.list,
      ),
    );
    close.addEventListener("click", () => this.close());
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }
  set(items: readonly Shortcut[]): void {
    this.list.textContent = "";
    for (const s of items) {
      this.list.append(h("dt", {}, ...s.keys.split(" ").map((k) => h("kbd", {}, k))), h("dd", {}, s.action));
    }
  }
  get open(): boolean {
    return !this.el.hidden;
  }
  show(): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.el.hidden = false;
    (this.el.querySelector("button") as HTMLButtonElement | null)?.focus();
  }
  close(): void {
    this.el.hidden = true;
    this.returnFocus?.focus();
  }
  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }
}

/** Shader-compile / boot progress with the real steps (00-foundation.md § 7.4). */
export class LoadingVeil {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private readonly items = new Map<string, HTMLElement>();
  private readonly title: HTMLElement;
  constructor(title: string) {
    this.title = h("p", { class: "bp-veil-title" }, title);
    this.list = h("ol", { class: "bp-veil-steps" });
    this.el = h("div", { class: "bp-veil", role: "status", "aria-live": "polite" }, h("div", { class: "bp-veil-card" }, this.title, this.list));
  }
  /** Mark `name` active (and every earlier step done). */
  step(name: string): void {
    for (const li of this.items.values()) if (li.dataset["state"] === "active") li.dataset["state"] = "done";
    let li = this.items.get(name);
    if (!li) {
      li = h("li", {}, name);
      this.items.set(name, li);
      this.list.append(li);
    }
    li.dataset["state"] = "active";
  }
  done(): void {
    for (const li of this.items.values()) li.dataset["state"] = "done";
    this.el.classList.add("is-done");
    window.setTimeout(() => {
      this.el.hidden = true;
    }, 420);
  }
  fail(message: string): void {
    this.el.classList.add("is-failed");
    this.title.textContent = message;
  }
}

/** Site root for links/assets from a Pages path like …/sims/<sim>/v2/. */
export function siteRoot(): string {
  const m = /^(.*\/)sims\/[^/]+\//.exec(location.pathname);
  return m ? m[1]! : "../../";
}

export function simSlug(): string | null {
  const m = /\/sims\/([^/]+)\//.exec(location.pathname);
  return m ? m[1]! : null;
}

/**
 * Full-page card when this browser cannot run WebGPU (ported from
 * common/common-web/src/webgpu-fallback.ts with paths resolved from the site
 * root, so it also works from nested pages such as /sims/<sim>/v2/).
 */
export function showNoWebGPU(simName: string, reason: string): HTMLElement {
  const root = siteRoot();
  const slug = simSlug();
  const media = slug
    ? matchMedia("(prefers-reduced-motion: reduce)").matches
      ? h("img", { class: "bp-nogpu-media", src: `${root}assets/${slug}.png`, alt: "", "aria-hidden": "true" })
      : h("video", {
          class: "bp-nogpu-media",
          src: `${root}assets/${slug}.webm`,
          poster: `${root}assets/${slug}.png`,
          muted: true,
          loop: true,
          autoplay: true,
          playsinline: true,
          "aria-hidden": "true",
        })
    : null;
  if (media instanceof HTMLVideoElement) media.muted = true;
  media?.addEventListener("error", () => media.remove());
  const el = h(
    "div",
    { class: "bp-nogpu", role: "alert", "data-bp2": "webgpu-fallback" },
    h(
      "div",
      { class: "bp-nogpu-card bp-surface" },
      media,
      h("p", { class: "bp-eyebrow" }, "Bit Physics · Field Studies"),
      h("h1", {}, `${simName} needs WebGPU`),
      h("p", {}, reason),
      h(
        "p",
        { class: "bp-dim" },
        "It runs in current desktop Chrome and Edge, Chrome on Android, and Safari 26 or later on macOS, iOS " +
          "and iPadOS. Firefox support depends on your platform and version. If you are on a supported browser, " +
          "check that hardware acceleration is turned on.",
      ),
      h(
        "p",
        { class: "bp-nogpu-links" },
        h("a", { href: root }, "← All simulations"),
        h("a", { href: `${root}about.html` }, "About the project"),
      ),
    ),
  );
  document.body.append(el);
  document.body.dataset["bpNogpu"] = "true";
  return el;
}
