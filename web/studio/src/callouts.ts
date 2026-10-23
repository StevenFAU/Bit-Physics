// Learn callouts (00-foundation.md § 6): annotations anchored to features in
// simulation space. Each callout projects its anchor through the sim's camera
// every frame, fades in when its trigger fires, and fades out when it leaves
// the view or the trigger lapses. Authored per scene.

import { h } from "./dom.js";

export interface CalloutSpec {
  id: string;
  /** Short label (condensed caps by default). */
  text: string;
  /** Optional second line in sentence case. */
  detail?: string;
  /** Screen position (CSS px) of the anchor, or null when not visible. */
  anchor: () => [number, number] | null;
  /** Trigger: shown while this returns true (time, threshold on an observable…). */
  when?: () => boolean;
  /** "label" floats a region name; "pin" draws a leader to a point. */
  style?: "label" | "pin";
}

interface Live {
  spec: CalloutSpec;
  el: HTMLElement;
  shown: boolean;
}

export class CalloutLayer {
  readonly el: HTMLElement;
  private items: Live[] = [];
  enabled = true;
  /** Keep callouts out of the chrome bands (CSS px from the top / bottom edge). */
  safe = { top: 64, bottom: 96 };

  constructor() {
    // decorative mirror of information that is also in the Learn drawer
    this.el = h("div", { class: "bp-callouts", "aria-hidden": "true" });
  }

  set(specs: readonly CalloutSpec[]): void {
    this.el.textContent = "";
    this.items = specs.map((spec) => {
      const el = h(
        "div",
        { class: `bp-callout bp-callout-${spec.style ?? "label"}` },
        h("span", { class: "bp-callout-text" }, spec.text),
        spec.detail ? h("span", { class: "bp-callout-detail" }, spec.detail) : null,
      );
      this.el.append(el);
      return { spec, el, shown: false };
    });
  }

  clear(): void {
    this.set([]);
  }

  /** Reposition and fade; call once per animation frame. */
  update(viewW: number, viewH: number): void {
    for (const it of this.items) {
      const p = this.enabled ? it.spec.anchor() : null;
      const inView =
        p !== null && p[0] > -40 && p[0] < viewW + 40 && p[1] > this.safe.top && p[1] < viewH - this.safe.bottom;
      const show = inView && (it.spec.when ? it.spec.when() : true);
      if (p) it.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, -50%)`;
      if (show !== it.shown) {
        it.shown = show;
        it.el.classList.toggle("is-shown", show);
      }
    }
  }
}
