// Controls (00-foundation.md § 2.3): Slider (fine adjust + typed entry),
// Segmented, Toggle. Plain words first; the symbol is a secondary label.

import { h, nextId } from "./dom.js";

export interface SliderOptions {
  label: string;
  /** Secondary label, e.g. the symbol: "F". */
  symbol?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;
  /** Unit suffix for the readout. */
  unit?: string;
  hint?: string;
  onInput: (v: number) => void;
  /** Fires once at the end of a drag / keyboard change (for history events). */
  onCommit?: (v: number) => void;
}

export interface Slider {
  el: HTMLElement;
  input: HTMLInputElement;
  set(v: number): void;
  get(): number;
  setDisabled(disabled: boolean, reason?: string): void;
  focus(): void;
}

export function slider(o: SliderOptions): Slider {
  const id = nextId("bp-slider");
  const fmt = o.format ?? ((v: number) => String(Number(v.toFixed(6))));
  const input = h("input", {
    id,
    type: "range",
    min: o.min,
    max: o.max,
    step: o.step,
    value: o.value,
    class: "bp-range",
  });
  const out = h("button", {
    type: "button",
    class: "bp-slider-value",
    title: "Type a value",
    "aria-label": `${o.label}: type a value`,
  });
  const label = h(
    "label",
    { for: id, class: "bp-slider-label" },
    o.label,
    o.symbol ? h("span", { class: "bp-slider-symbol" }, ` · ${o.symbol}`) : null,
  );
  const hint = o.hint ? h("p", { class: "bp-slider-hint" }, o.hint) : null;
  const el = h("div", { class: "bp-slider" }, h("div", { class: "bp-slider-head" }, label, out), input, hint);
  const show = (v: number): void => {
    out.textContent = `${fmt(v)}${o.unit ?? ""}`;
    input.setAttribute("aria-valuetext", `${fmt(v)}${o.unit ? ` ${o.unit.trim()}` : ""}`);
  };
  show(o.value);
  const clampSnap = (v: number): number => Math.min(Math.max(v, o.min), o.max);
  input.addEventListener("input", () => {
    const v = Number(input.value);
    show(v);
    o.onInput(v);
  });
  input.addEventListener("change", () => o.onCommit?.(Number(input.value)));
  // fine adjust: Shift + arrow keys move a tenth of a step
  input.addEventListener("keydown", (e) => {
    if (!e.shiftKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 1;
    const v = clampSnap(Number(input.value) + (dir * o.step) / 10);
    input.value = String(v);
    show(v);
    o.onInput(v);
    o.onCommit?.(v);
  });
  // typed entry
  out.addEventListener("click", () => {
    const field = h("input", {
      type: "number",
      class: "bp-slider-entry",
      min: o.min,
      max: o.max,
      step: "any",
      value: input.value,
      "aria-label": `${o.label} value`,
    });
    out.replaceWith(field);
    field.focus();
    field.select();
    const finish = (apply: boolean): void => {
      if (apply) {
        const v = Number(field.value);
        if (Number.isFinite(v)) {
          const c = clampSnap(v);
          input.value = String(c);
          show(c);
          o.onInput(c);
          o.onCommit?.(c);
        }
      }
      field.replaceWith(out);
      out.focus();
    };
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    field.addEventListener("blur", () => finish(true), { once: true });
  });
  return {
    el,
    input,
    set(v: number) {
      input.value = String(v);
      show(v);
    },
    get: () => Number(input.value),
    setDisabled(disabled: boolean, reason?: string) {
      input.disabled = disabled;
      out.disabled = disabled;
      el.classList.toggle("is-disabled", disabled);
      el.title = disabled && reason ? reason : "";
    },
    focus: () => input.focus(),
  };
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

export interface Segmented<T extends string> {
  el: HTMLElement;
  set(v: T): void;
  get(): T;
}

export function segmented<T extends string>(
  name: string,
  options: readonly SegmentedOption<T>[],
  value: T,
  onChange: (v: T) => void,
): Segmented<T> {
  let current = value;
  const el = h("div", { class: "bp-segmented", role: "radiogroup", "aria-label": name });
  const buttons = options.map((o) => {
    const b = h("button", { type: "button", role: "radio", class: "bp-seg", title: o.title }, o.label);
    b.addEventListener("click", () => {
      current = o.value;
      sync();
      onChange(o.value);
    });
    b.addEventListener("keydown", (e) => {
      const i = options.findIndex((x) => x.value === current);
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (d === 0) return;
      e.preventDefault();
      const next = options[(i + d + options.length) % options.length]!;
      current = next.value;
      sync();
      onChange(next.value);
      buttons[options.indexOf(next)]!.focus();
    });
    el.append(b);
    return b;
  });
  const sync = (): void => {
    options.forEach((o, i) => {
      const on = o.value === current;
      buttons[i]!.setAttribute("aria-checked", String(on));
      buttons[i]!.tabIndex = on ? 0 : -1;
    });
  };
  sync();
  return {
    el,
    set(v: T) {
      current = v;
      sync();
    },
    get: () => current,
  };
}

export interface Toggle {
  el: HTMLButtonElement;
  set(on: boolean): void;
  get(): boolean;
}

export function toggle(label: string, on: boolean, onChange: (on: boolean) => void, title?: string): Toggle {
  let state = on;
  const el = h(
    "button",
    { type: "button", role: "switch", class: "bp-toggle", title },
    h("span", { class: "bp-toggle-track", "aria-hidden": "true" }, h("span", { class: "bp-toggle-thumb" })),
    h("span", { class: "bp-toggle-label" }, label),
  );
  const sync = (): void => el.setAttribute("aria-checked", String(state));
  sync();
  el.addEventListener("click", () => {
    state = !state;
    sync();
    onChange(state);
  });
  return {
    el,
    set(v: boolean) {
      state = v;
      sync();
    },
    get: () => state,
  };
}
