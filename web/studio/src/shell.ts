// The Field Studies shell (00-foundation.md § 2): a full-bleed canvas with
// quiet chrome floating over it — top bar, scene heading, tool rail with a
// contextual options strip and a Tune popover, transport, and the Learn /
// Prove drawer (right on wide screens, a bottom sheet on phones). Opening
// anything never resizes the canvas.

import { h, nextId, prefersReducedMotion } from "./dom.js";
import type { IconName } from "./icons.js";
import { icon } from "./icons.js";
import { CalloutLayer } from "./callouts.js";
import { LoadingVeil, ShortcutSheet, Toast, siteRoot } from "./overlays.js";
import type { Shortcut } from "./overlays.js";

// ---------------------------------------------------------------- types --

export interface ToolSpec {
  id: string;
  label: string;
  icon: IconName;
  /** One line shown in the options strip while the tool is active. */
  hint: string;
  /** Builds the tool's options (brush size, strength…); called on select. */
  options?: () => HTMLElement | null;
  /** Paint tools use a hover ring; pan/probe do not. */
  paints?: boolean;
}

export interface SceneEntry {
  id: string;
  title: string;
}

export interface StudioOptions {
  simName: string;
  /** "01 / REACTION–DIFFUSION" */
  eyebrow: string;
  collection?: string;
  backHref?: string;
  /** Accessible description of what the canvas shows and how to use it. */
  canvasLabel: string;
  /** Where the studio mounts; defaults to document.body. */
  mount?: HTMLElement;
}

// ----------------------------------------------------------- top bar --

class TopBar {
  readonly el: HTMLElement;
  readonly learnBtn: HTMLButtonElement;
  readonly proveBtn: HTMLButtonElement;
  readonly shareBtn: HTMLButtonElement;
  readonly nameEl: HTMLElement;

  constructor(o: StudioOptions) {
    const back = h(
      "a",
      { class: "bp-back", href: o.backHref ?? siteRoot(), "aria-label": `Bit Physics — ${o.collection ?? "Field Studies"}: all simulations` },
      h("span", { html: icon("back", 16) }),
      h("span", { class: "bp-back-site" }, "Bit Physics"),
      h("span", { class: "bp-back-collection" }, ` / ${o.collection ?? "Field Studies"}`),
    );
    this.nameEl = h("span", { class: "bp-simname" }, o.simName);
    const mk = (label: string, ic: IconName, extra: Record<string, string> = {}): HTMLButtonElement =>
      h(
        "button",
        { type: "button", class: "bp-chip", ...extra },
        h("span", { html: icon(ic, 16) }),
        h("span", { class: "bp-chip-label" }, label),
      );
    this.learnBtn = mk("Learn", "learn", { "aria-pressed": "false", "aria-keyshortcuts": "L", "aria-label": "Learn" });
    this.proveBtn = mk("Prove", "prove", { "aria-pressed": "false", "aria-keyshortcuts": "P", "aria-label": "Prove" });
    this.shareBtn = mk("Share", "share", { "aria-haspopup": "true", "aria-expanded": "false", "aria-label": "Share" });
    this.el = h(
      "header",
      { class: "bp-top", "data-bp2": "studio-chrome" },
      back,
      this.nameEl,
      h("div", { class: "bp-top-actions" }, this.learnBtn, this.proveBtn, this.shareBtn),
    );
  }
}

// ----------------------------------------------------- scene heading --

export class SceneHeading {
  readonly el: HTMLElement;
  private readonly eyebrow: HTMLElement;
  private readonly title: HTMLElement;
  private readonly prompt: HTMLElement;
  readonly picker: HTMLSelectElement;
  private quietTimer = 0;
  onPick: ((id: string) => void) | null = null;

  /** Extra content under the prompt (e.g. a breadcrumb). */
  readonly extra: HTMLElement;

  constructor(
    eyebrow: string,
    private readonly simName: string,
  ) {
    this.eyebrow = h("p", { class: "bp-eyebrow" }, eyebrow);
    this.title = h("h1", { class: "bp-scene-title" });
    this.prompt = h("p", { class: "bp-scene-prompt" });
    const pickId = nextId("bp-scene");
    this.picker = h("select", { id: pickId, class: "bp-scene-picker", "aria-label": "Scene" });
    this.picker.addEventListener("change", () => this.onPick?.(this.picker.value));
    this.extra = h("div", { class: "bp-heading-extra" });
    this.el = h(
      "section",
      { class: "bp-heading", "aria-label": "Scene", "data-bp2": "studio-chrome" },
      this.eyebrow,
      this.title,
      this.prompt,
      h("div", { class: "bp-scene-row" }, this.picker),
      this.extra,
    );
    // phones: title only, tap to expand the prompt
    this.title.addEventListener("click", () => this.el.classList.toggle("is-expanded"));
    const wake = (): void => {
      this.el.classList.remove("is-quiet");
      window.clearTimeout(this.quietTimer);
      this.quietTimer = window.setTimeout(() => this.el.classList.add("is-quiet"), 6000);
    };
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    wake();
  }

  set(title: string, prompt: string, eyebrow?: string): void {
    this.title.textContent = title;
    this.prompt.textContent = prompt;
    if (eyebrow) this.eyebrow.textContent = eyebrow;
    document.title = title === this.simName ? `${title} · Bit Physics` : `${title} · ${this.simName} · Bit Physics`;
  }

  setScenes(list: readonly SceneEntry[], current: string): void {
    this.picker.textContent = "";
    for (const s of list) this.picker.append(h("option", { value: s.id }, s.title));
    this.picker.value = current;
  }

  setCurrent(id: string): void {
    this.picker.value = id;
  }
}

// ----------------------------------------------------------- tool rail --

export class ToolRail {
  readonly el: HTMLElement;
  readonly optionsEl: HTMLElement;
  readonly tuneBtn: HTMLButtonElement;
  private readonly list: HTMLElement;
  private readonly hintEl: HTMLElement;
  private readonly bodyEl: HTMLElement;
  private tools: ToolSpec[] = [];
  private buttons = new Map<string, HTMLButtonElement>();
  active = "";
  onSelect: ((id: string) => void) | null = null;

  constructor() {
    this.list = h("div", { class: "bp-rail-tools", role: "toolbar", "aria-label": "Tools", "aria-orientation": "vertical" });
    this.tuneBtn = h(
      "button",
      {
        type: "button",
        class: "bp-tool bp-tool-tune",
        "aria-haspopup": "dialog",
        "aria-expanded": "false",
        "aria-label": "Tune",
        title: "Tune (T)",
      },
      h("span", { class: "bp-tool-icon", html: icon("tune") }),
      h("span", { class: "bp-tool-label" }, "Tune"),
    );
    this.el = h("nav", { class: "bp-rail", "aria-label": "Tools", "data-bp2": "studio-chrome" }, this.list, this.tuneBtn);
    this.hintEl = h("p", { class: "bp-options-hint" });
    this.bodyEl = h("div", { class: "bp-options-body" });
    this.optionsEl = h("div", { class: "bp-options", "aria-label": "Tool options", role: "group", "data-bp2": "studio-chrome" }, this.hintEl, this.bodyEl);
  }

  setTools(tools: readonly ToolSpec[], active: string): void {
    this.tools = tools.slice();
    this.list.textContent = "";
    this.buttons.clear();
    tools.forEach((t, i) => {
      const b = h(
        "button",
        {
          type: "button",
          class: "bp-tool",
          "aria-pressed": "false",
          "aria-label": t.label,
          title: `${t.label} (${i + 1})`,
          "aria-keyshortcuts": String(i + 1),
          "data-tool": t.id,
        },
        h("span", { class: "bp-tool-icon", html: icon(t.icon) }),
        h("span", { class: "bp-tool-label" }, t.label),
      );
      b.addEventListener("click", () => this.select(t.id));
      this.list.append(b);
      this.buttons.set(t.id, b);
    });
    this.select(active, false);
  }

  select(id: string, notify = true): void {
    const t = this.tools.find((x) => x.id === id);
    if (!t) return;
    this.active = id;
    for (const [tid, b] of this.buttons) {
      const on = tid === id;
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("is-active", on);
    }
    this.hintEl.textContent = t.hint;
    this.bodyEl.textContent = "";
    const opts = t.options?.();
    if (opts) this.bodyEl.append(opts);
    this.optionsEl.classList.toggle("has-body", !!opts);
    if (notify) this.onSelect?.(id);
  }

  selectIndex(i: number): void {
    const t = this.tools[i];
    if (t) this.select(t.id);
  }

  get activeTool(): ToolSpec | undefined {
    return this.tools.find((t) => t.id === this.active);
  }
}

// ---------------------------------------------------------- tune popover --

export class TunePopover {
  readonly el: HTMLElement;
  readonly body: HTMLElement;
  private readonly note: HTMLElement;
  private anchor: HTMLButtonElement | null = null;

  constructor() {
    const close = h("button", { type: "button", class: "bp-icon-btn", "aria-label": "Close Tune", html: icon("close", 16) });
    this.body = h("div", { class: "bp-tune-body" });
    this.note = h("p", { class: "bp-tune-note" });
    this.el = h(
      "div",
      { class: "bp-tune bp-surface", role: "dialog", "aria-label": "Tune", hidden: true, "data-bp2": "studio-chrome" },
      h("header", {}, h("h2", {}, "Tune"), close),
      this.body,
      this.note,
    );
    close.addEventListener("click", () => this.close());
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.close();
      }
    });
    document.addEventListener("pointerdown", (e) => {
      if (this.el.hidden) return;
      const t = e.target as Node;
      if (!this.el.contains(t) && !this.anchor?.contains(t)) this.close();
    });
  }

  bind(anchor: HTMLButtonElement): void {
    this.anchor = anchor;
    anchor.addEventListener("click", () => this.toggle());
  }

  setNote(text: string): void {
    this.note.textContent = text;
    this.note.hidden = text.length === 0;
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(): void {
    this.el.hidden = false;
    this.anchor?.setAttribute("aria-expanded", "true");
    (this.el.querySelector("input, button:not(.bp-icon-btn)") as HTMLElement | null)?.focus();
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.anchor?.setAttribute("aria-expanded", "false");
    this.anchor?.focus();
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }
}

// ------------------------------------------------------------ transport --

export interface TransportHandlers {
  play: () => void;
  step: () => void;
  restart: () => void;
  speed: (v: number) => void;
  save: () => void;
  restore: () => void;
  compare: () => void;
  undo: () => void;
}

export const SPEEDS: readonly number[] = [0.25, 0.5, 1, 2, 4, 8];

const speedLabel = (v: number): string => (v === 0.25 ? "¼×" : v === 0.5 ? "½×" : `${v}×`);

export class Transport {
  readonly el: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly speedSel: HTMLSelectElement;
  private readonly restoreBtn: HTMLButtonElement;
  private readonly compareBtn: HTMLButtonElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly clockEl: HTMLElement;
  private readonly statusBtn: HTMLButtonElement;
  private readonly fpsEl: HTMLElement;
  private readonly moreBtn: HTMLButtonElement;
  private readonly extra: HTMLElement;
  handlers: TransportHandlers | null = null;
  onStatus: (() => void) | null = null;

  constructor() {
    const btn = (label: string, ic: IconName, cls = "", keys?: string, showLabel = false): HTMLButtonElement =>
      h(
        "button",
        {
          type: "button",
          class: `bp-tbtn ${cls}`,
          "aria-label": label,
          title: keys ? `${label} (${keys})` : label,
          "aria-keyshortcuts": keys,
        },
        h("span", { html: icon(ic, 18) }),
        showLabel ? h("span", { class: "bp-tbtn-label" }, label) : null,
      );
    this.playBtn = btn("Pause", "pause", "bp-tbtn-play", "Space");
    const stepBtn = btn("Step", "step", "", ".");
    const restartBtn = btn("Restart scene", "restart", "", "R");
    this.speedSel = h("select", { class: "bp-speed", "aria-label": "Speed" });
    for (const s of SPEEDS) this.speedSel.append(h("option", { value: String(s) }, speedLabel(s)));
    this.speedSel.value = "1";
    const saveBtn = btn("Save point", "save", "", "S", true);
    this.restoreBtn = btn("Restore", "restore", "", undefined, true);
    this.compareBtn = btn("Compare A/B", "compare", "", "C", true);
    this.undoBtn = btn("Undo", "undo", "", "Z", true);
    this.clockEl = h("span", { class: "bp-clock bp-mono", "aria-live": "off" }, "");
    this.fpsEl = h("span", { class: "bp-fps bp-mono" }, "— fps");
    this.statusBtn = h(
      "button",
      { type: "button", class: "bp-status", "aria-label": "Performance: full quality", title: "Full quality" },
      h("span", { class: "bp-status-dot", "aria-hidden": "true" }),
      this.fpsEl,
    );
    this.moreBtn = h(
      "button",
      { type: "button", class: "bp-tbtn bp-more", "aria-label": "More controls", "aria-expanded": "false", html: icon("more", 18) },
    );
    this.extra = h(
      "div",
      { class: "bp-transport-extra" },
      restartBtn,
      this.speedSel,
      h("span", { class: "bp-divider", "aria-hidden": "true" }),
      saveBtn,
      this.restoreBtn,
      this.compareBtn,
      this.undoBtn,
    );
    this.el = h(
      "footer",
      { class: "bp-transport", "data-bp2": "studio-chrome" },
      h("div", { class: "bp-transport-main" }, this.playBtn, stepBtn, this.moreBtn),
      this.extra,
      h("div", { class: "bp-transport-meta" }, this.clockEl, this.statusBtn),
    );
    this.playBtn.addEventListener("click", () => this.handlers?.play());
    stepBtn.addEventListener("click", () => this.handlers?.step());
    restartBtn.addEventListener("click", () => this.handlers?.restart());
    this.speedSel.addEventListener("change", () => this.handlers?.speed(Number(this.speedSel.value)));
    saveBtn.addEventListener("click", () => this.handlers?.save());
    this.restoreBtn.addEventListener("click", () => this.handlers?.restore());
    this.compareBtn.addEventListener("click", () => this.handlers?.compare());
    this.undoBtn.addEventListener("click", () => this.handlers?.undo());
    this.statusBtn.addEventListener("click", () => this.onStatus?.());
    this.moreBtn.addEventListener("click", () => {
      const open = !this.el.classList.contains("is-more");
      this.el.classList.toggle("is-more", open);
      this.moreBtn.setAttribute("aria-expanded", String(open));
    });
    this.setHistory({ canRestore: false, canCompare: false, comparing: false, canUndo: false });
  }

  setPlaying(playing: boolean): void {
    this.playBtn.innerHTML = icon(playing ? "pause" : "play", 18);
    const label = playing ? "Pause" : "Play";
    this.playBtn.setAttribute("aria-label", label);
    this.playBtn.title = `${label} (Space)`;
  }

  setSpeed(v: number): void {
    this.speedSel.value = String(v);
  }

  setHistory(s: { canRestore: boolean; canCompare: boolean; comparing: boolean; canUndo: boolean }): void {
    this.restoreBtn.disabled = !s.canRestore;
    this.compareBtn.disabled = !s.canCompare;
    this.compareBtn.setAttribute("aria-pressed", String(s.comparing));
    this.compareBtn.classList.toggle("is-active", s.comparing);
    this.undoBtn.disabled = !s.canUndo;
  }

  setClock(text: string): void {
    this.clockEl.textContent = text;
  }

  setStatus(fps: string, degraded: boolean, message: string): void {
    this.fpsEl.textContent = fps;
    this.statusBtn.classList.toggle("is-degraded", degraded);
    const m = degraded ? message : "Full quality";
    this.statusBtn.title = m;
    this.statusBtn.setAttribute("aria-label", `Performance: ${fps}. ${m}`);
  }
}

// --------------------------------------------------------------- drawer --

export type DrawerTab = "learn" | "prove";

export class Drawer {
  readonly el: HTMLElement;
  readonly learn: HTMLElement;
  readonly prove: HTMLElement;
  /** Footer (the developer capture control lives here). */
  readonly footer: HTMLElement;
  private readonly tabs: Record<DrawerTab, HTMLButtonElement>;
  private readonly handle: HTMLButtonElement;
  tab: DrawerTab = "learn";
  isOpen = false;
  onChange: ((open: boolean, tab: DrawerTab) => void) | null = null;
  private snap: "peek" | "half" | "full" = "half";

  constructor() {
    const lid = nextId("bp-learn");
    const pid = nextId("bp-prove");
    const mkTab = (label: string, controls: string): HTMLButtonElement =>
      h("button", { type: "button", role: "tab", class: "bp-tab", "aria-controls": controls }, label);
    this.tabs = { learn: mkTab("Learn", lid), prove: mkTab("Prove", pid) };
    this.learn = h("div", { id: lid, role: "tabpanel", class: "bp-pane", "aria-label": "Learn", tabindex: "0" });
    this.prove = h("div", { id: pid, role: "tabpanel", class: "bp-pane", "aria-label": "Prove", tabindex: "0" });
    this.footer = h("div", { class: "bp-drawer-footer" });
    this.handle = h("button", { type: "button", class: "bp-sheet-handle", "aria-label": "Resize panel" });
    const close = h("button", { type: "button", class: "bp-icon-btn", "aria-label": "Close panel", html: icon("close", 16) });
    this.el = h(
      "aside",
      // [data-bp-panel] is the headless driver's "the WebGPU path mounted" probe.
      { class: "bp-drawer bp-surface", "aria-label": "Learn and Prove", "data-bp-panel": "true", "data-snap": "half" },
      this.handle,
      h("div", { class: "bp-drawer-head" }, h("div", { class: "bp-tabs", role: "tablist", "aria-label": "Panel" }, this.tabs.learn, this.tabs.prove), close),
      h("div", { class: "bp-drawer-body" }, this.learn, this.prove),
      this.footer,
    );
    this.tabs.learn.addEventListener("click", () => this.open("learn"));
    this.tabs.prove.addEventListener("click", () => this.open("prove"));
    close.addEventListener("click", () => this.close());
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if ((e.target as HTMLElement).getAttribute("role") === "tab") {
          this.open(this.tab === "learn" ? "prove" : "learn");
          this.tabs[this.tab].focus();
        }
      }
    });
    // bottom-sheet snap points (phones): tap the handle to cycle, drag to resize
    this.handle.addEventListener("click", () => {
      this.setSnap(this.snap === "peek" ? "half" : this.snap === "half" ? "full" : "peek");
    });
    let dragY: number | null = null;
    this.handle.addEventListener("pointerdown", (e) => {
      dragY = e.clientY;
      this.handle.setPointerCapture(e.pointerId);
    });
    this.handle.addEventListener("pointerup", (e) => {
      if (dragY === null) return;
      const dy = e.clientY - dragY;
      dragY = null;
      if (Math.abs(dy) < 24) return;
      const order = ["peek", "half", "full"] as const;
      const i = order.indexOf(this.snap);
      if (dy > 0 && i === 0) this.close();
      else this.setSnap(order[Math.min(2, Math.max(0, i + (dy < 0 ? 1 : -1)))]!);
    });
    this.sync();
  }

  private setSnap(s: "peek" | "half" | "full"): void {
    this.snap = s;
    this.el.dataset["snap"] = s;
  }

  open(tab: DrawerTab): void {
    this.tab = tab;
    this.isOpen = true;
    this.sync();
    this.onChange?.(true, tab);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.sync();
    this.onChange?.(false, this.tab);
  }

  toggle(tab: DrawerTab): void {
    if (this.isOpen && this.tab === tab) this.close();
    else this.open(tab);
  }

  private sync(): void {
    this.el.classList.toggle("is-open", this.isOpen);
    // Closed: rendered but visually collapsed — slid off-canvas, then
    // visibility:hidden (studio.css) so it leaves the tab order and the
    // accessibility tree. Never display:none and never disabled, so the
    // capture control in the footer stays a live button whose click() the
    // headless driver can invoke in the 1280×720 boot state.
    for (const t of ["learn", "prove"] as const) {
      const on = t === this.tab;
      this.tabs[t].setAttribute("aria-selected", String(on));
      this.tabs[t].tabIndex = on ? 0 : -1;
      (t === "learn" ? this.learn : this.prove).hidden = !on;
    }
  }
}

// ------------------------------------------------------------ share menu --

export interface ShareHandlers {
  copyLink: () => void;
  snapshot: () => void;
  clip: () => void;
}

class ShareMenu {
  readonly el: HTMLElement;
  handlers: ShareHandlers | null = null;
  private readonly anchor: HTMLButtonElement;
  constructor(anchor: HTMLButtonElement) {
    this.anchor = anchor;
    const item = (label: string, ic: IconName, fn: () => void): HTMLButtonElement => {
      const b = h("button", { type: "button", role: "menuitem", class: "bp-menu-item" }, h("span", { html: icon(ic, 16) }), label);
      b.addEventListener("click", () => {
        this.close();
        fn();
      });
      return b;
    };
    this.el = h(
      "div",
      { class: "bp-menu bp-surface", role: "menu", "aria-label": "Share", hidden: true, "data-bp2": "studio-chrome" },
      item("Copy link to this scene", "link", () => this.handlers?.copyLink()),
      item("Save image (PNG)", "camera", () => this.handlers?.snapshot()),
      item("Record an 8-second clip", "record", () => this.handlers?.clip()),
    );
    anchor.addEventListener("click", () => (this.el.hidden ? this.show() : this.close()));
    document.addEventListener("pointerdown", (e) => {
      if (!this.el.hidden && !this.el.contains(e.target as Node) && !anchor.contains(e.target as Node)) this.close();
    });
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }
  show(): void {
    this.el.hidden = false;
    this.anchor.setAttribute("aria-expanded", "true");
    (this.el.querySelector("button") as HTMLButtonElement | null)?.focus();
  }
  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.anchor.setAttribute("aria-expanded", "false");
  }
}

// ------------------------------------------------------------- the studio --

export interface Studio {
  root: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  callouts: CalloutLayer;
  /** Brush hover ring (positioned by the sim). */
  ring: HTMLElement;
  /** Floating probe readout (positioned by the sim). */
  probe: HTMLElement;
  topBar: TopBar;
  heading: SceneHeading;
  rail: ToolRail;
  tune: TunePopover;
  transport: Transport;
  drawer: Drawer;
  share: ShareMenu;
  toast: Toast;
  veil: LoadingVeil;
  shortcuts: ShortcutSheet;
  /** Register a keyboard shortcut (also listed in the sheet). */
  key(keys: string, action: string, fn: (e: KeyboardEvent) => void): void;
  setTone(t: "dark" | "light"): void;
  /** Hide all chrome (posters, loops, clips): ?chrome=off. */
  setChrome(on: boolean): void;
}

export function createStudio(o: StudioOptions): Studio {
  const mount = o.mount ?? document.body;
  document.documentElement.classList.add("bp-studio-page");
  if (prefersReducedMotion()) document.documentElement.classList.add("bp-reduced-motion");

  const canvas = h("canvas", {
    class: "bp-canvas",
    tabindex: "0",
    "aria-label": o.canvasLabel,
    "aria-describedby": "bp-canvas-keys",
  });
  const keysHelp = h(
    "p",
    { id: "bp-canvas-keys", class: "bp-visually-hidden" },
    "Arrow keys pan, plus and minus zoom, 0 fits the view. Press question mark for all shortcuts.",
  );
  const callouts = new CalloutLayer();
  const ring = h("div", { class: "bp-ring", "aria-hidden": "true" });
  const probe = h("div", { class: "bp-probe bp-surface", role: "status", "aria-live": "polite", hidden: true });
  const topBar = new TopBar(o);
  const heading = new SceneHeading(o.eyebrow, o.simName);
  const rail = new ToolRail();
  const tune = new TunePopover();
  tune.bind(rail.tuneBtn);
  const transport = new Transport();
  const drawer = new Drawer();
  const share = new ShareMenu(topBar.shareBtn);
  const toast = new Toast();
  const veil = new LoadingVeil(`Preparing ${o.simName}…`);
  const shortcuts = new ShortcutSheet();

  const stage = h("main", { class: "bp-stage" }, canvas, keysHelp, callouts.el, ring, probe, heading.el, rail.optionsEl);
  const root = h(
    "div",
    { class: "bp-studio", "data-tone": "dark" },
    stage,
    topBar.el,
    rail.el,
    tune.el,
    transport.el,
    drawer.el,
    share.el,
    toast.el,
    shortcuts.el,
    veil.el,
  );
  mount.append(root);

  const syncDrawerButtons = (): void => {
    topBar.learnBtn.setAttribute("aria-pressed", String(drawer.isOpen && drawer.tab === "learn"));
    topBar.proveBtn.setAttribute("aria-pressed", String(drawer.isOpen && drawer.tab === "prove"));
    root.classList.toggle("is-drawer-open", drawer.isOpen);
  };
  drawer.onChange = syncDrawerButtons;
  topBar.learnBtn.addEventListener("click", () => drawer.toggle("learn"));
  topBar.proveBtn.addEventListener("click", () => drawer.toggle("prove"));

  // keyboard
  const registry: (Shortcut & { fn: (e: KeyboardEvent) => void; match: string[] })[] = [];
  const key = (keys: string, action: string, fn: (e: KeyboardEvent) => void): void => {
    registry.push({ keys, action, fn, match: keys.split(" ").filter((k) => k !== "/") });
    shortcuts.set(registry);
  };
  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.matches("input, select, textarea, [contenteditable]") || t.closest("[role=dialog]"))) return;
    if (e.metaKey || e.altKey) return;
    if (e.ctrlKey && e.key.toLowerCase() !== "z") return;
    const k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const hit = registry.find((r) => r.match.includes(k) || r.match.includes(e.key));
    if (!hit) return;
    if (t && t.matches("button") && (k === "Space" || k === "Enter")) return;
    e.preventDefault();
    hit.fn(e);
  });
  key("?", "Show this list", () => shortcuts.toggle());
  key("L", "Open Learn", () => drawer.toggle("learn"));
  key("P", "Open Prove", () => drawer.toggle("prove"));
  key("Escape", "Close the open panel", () => {
    if (tune.open) tune.close();
    else drawer.close();
  });

  return {
    root,
    stage,
    canvas,
    callouts,
    ring,
    probe,
    topBar,
    heading,
    rail,
    tune,
    transport,
    drawer,
    share,
    toast,
    veil,
    shortcuts,
    key,
    setTone(t) {
      root.dataset["tone"] = t;
    },
    setChrome(on) {
      root.classList.toggle("is-chromeless", !on);
    },
  };
}
