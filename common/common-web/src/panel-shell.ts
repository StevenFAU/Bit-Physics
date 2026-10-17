// Shared chrome panel shell v2 (Lane B dispatch P-3, Stage 1).
//
// One half of the chrome contract (the other half is ./theme.css — the shell
// renders ONLY .bps-* classes styled there; it injects no inline CSS). This is
// the v2 of settings-panel.ts: the spec § 10.1 settings panel, rebuilt on the
// house style with additive presentation slots. The six remaining migrations
// are written against the surface documented here.
//
// DRIVER CONTRACT (verbatim from v1 — tools consume these, never change them):
//   data-bp-panel="true"   on the panel root      (driver.mjs:110, smoke.mjs:81,
//                                                  make-posters.mjs:106)
//   data-bp="tier"         on the tier <select>
//   data-bp="seed"         on the seed <input>
//   data-bp="capture"      on the capture button  (driver.mjs:118 — must be
//                          visible + clickable in the BOOT state; never gate it
//                          behind a mode or fold)
//   data-bp="status"       on the status line
//   The factory keeps the v1 name `createSettingsPanel` — pipeline.py § 6.1
//   discovery greps src/main.ts for that literal (and for `exposeCapture`).
//
// V2 SURFACE (all additive — a sim passing only the v1 options gets exactly
// the v1 control set: title, tier, seed, extra, capture, status; no empty
// slots render):
//   presets   — named-regime preset bar (house § 5.3). LIVE-LOOP ONLY by
//               ruling D-P1.2(a): apply() must drive live uniforms and never
//               touch the capture path's canonical params.
//   modes     — Play/Study toggle (house § 5.2). Play = clean canvas focus;
//               Study = suspended observation (the sim suspends stepping in
//               onMode — RAF suspension is pure presentation, D-P1.2(b)).
//               The shell sets body[data-bp2-mode] so theme.css can dim the
//               canvas while time is frozen.
//   study     — Study-mode block: measured diagnostics readout, honesty note
//               (faithful vs simplified physics + when measured, house § 5.4),
//               gate/verdict line, spec links. Hidden in Play mode.
//   addGroup  — labeled control-group container for per-sim controls.
//   New elements carry data-bp2="…" hooks; the v1 data-bp namespace gains no
//   new members so the v1 contract stays exact.
//
// V2.5 DISCLOSURE SURFACE (2026-07 UX audit — layered disclosure ratified:
// layer 0 = curated controls + caption, layer 1 = click-expand groups,
// layer 2 = hover hints; all additive):
//   addGroup(label, {open, hint}) — groups are collapsible folds; default
//               open (pre-disclosure behavior). Collapse is [hidden], so the
//               DOM stays queryable by the headless drivers without a click.
//   tier+seed — relocated into an auto-created collapsed "advanced" fold at
//               the bottom of the controls (developer/reproducibility surface,
//               not layer 0). data-bp="tier"/"seed" attributes verbatim.
//   hint()    — hover/focus-revealed one-liner on any control row.
//   setNarration() — live "what is happening" line under the caption.
//
// V2.6 SURFACE (2026-10 portfolio review — all additive, no per-sim wiring):
//   collapse  — a hide/show toggle in the header (option `collapsible`, default
//               true). Phones (≤640 px wide) boot collapsed so the simulation is
//               visible first; theme.css turns the panel into a bottom sheet
//               there. Wide viewports (incl. the 1280×720 headless driver) boot
//               expanded, so the capture button stays visible in the boot state.
//   a11y      — the title is the page <h1>; the panel is a labelled landmark;
//               unnamed form controls get an aria-label from their row text and
//               unnamed canvases get an image role + label (review finding 11).
//   no-WebGPU — importing this module installs ./webgpu-fallback.ts, a full-page
//               "needs WebGPU" card for browsers without an adapter (finding 12).
//   layout    — when a .bps-stage canvas fits entirely left of the expanded
//               panel, the stage (and in-flow page content) re-centres into that
//               free area instead of sitting under the panel with dead space on
//               the left (finding 15). Full-bleed canvases are left alone.
//
// Lives in common/common-web/ (NOT common/common-ts/) so it never enters the
// Node-targeted `ts-strict` CI surface; per-sim Vite apps import it as source
// via a relative path and bundle it for the browser.

import { runCaptureExclusive } from "./capture-export.js";
import "./webgpu-fallback.js";

export type Tier = "test" | "demo" | "reference";
export type Mode = "play" | "study";

export interface SettingsState {
  tier: Tier;
  seed: number;
}

export interface PresetSpec {
  /** Short chip label, e.g. "classic". Also the setActivePreset() key. */
  label: string;
  /** Hover title — say what the regime IS (honest naming, house § 5.3). */
  title?: string;
  /** Apply the regime to the LIVE loop only (ruling D-P1.2(a)). */
  apply: () => void;
}

export interface DiagnosticRow {
  label: string;
  value: string;
}

export interface VerdictSpec {
  /** The sim's verification gate, in its own established terms. */
  gate: string;
  /** Current verdict word, e.g. "PASS". */
  verdict: string;
  pass: boolean;
}

export interface StudySpec {
  /** Initial measured-diagnostics rows; update via setDiagnostics(). */
  diagnostics?: DiagnosticRow[];
  /** Honesty note (house § 5.4): faithful vs simplified + when measured. */
  honesty?: { faithful: string; simplified: string; measured: string };
  verdict?: VerdictSpec;
  /** Links into the repo (spec, verification ledger). */
  links?: { label: string; href: string }[];
}

export interface PanelShellOptions {
  // ---- v1 surface (settings-panel.ts) — unchanged semantics ----
  initial?: Partial<SettingsState>;
  /** Tier values offered in the dropdown. Defaults to all three. */
  tiers?: Tier[];
  /** Fired when the user clicks "Capture to disk". */
  onCapture: () => void | Promise<void>;
  /** Fired when tier or seed changes (e.g. to reset the sim). */
  onChange?: (state: SettingsState) => void;
  /** Optional extra controls appended below the standard rows. */
  extra?: HTMLElement;
  // ---- v2 additive slots — absent option ⇒ absent DOM ----
  presets?: PresetSpec[];
  /**
   * Render the Play/Study toggle. `onMode` fires after each USER/`setMode`
   * change; it does NOT fire for `initial` (the sim wires its own start
   * state). Default initial mode: "play".
   */
  modes?: { initial?: Mode; onMode?: (mode: Mode) => void };
  study?: StudySpec;
  /**
   * One-line physics caption — the landing card copy for this sim — rendered
   * under the title as the page's visible per-sim identity (P-8). Absent option
   * ⇒ absent DOM. The top portfolio/about nav is universal and needs no option.
   */
  caption?: string;
  /**
   * Render the header hide/show toggle (default true). A sim that hosts the
   * panel inside its own chrome (terrain-erosion's Instruments drawer) passes
   * false. Collapsing hides everything but the header via a root attribute.
   */
  collapsible?: boolean;
}

export interface GroupOptions {
  /**
   * Start expanded (default true, the pre-disclosure behavior). A collapsed
   * group renders only its header; clicking the header toggles the body.
   * Collapse hides via [hidden] so the DOM stays queryable and headless
   * drivers can still reach controls by attribute without a click.
   */
  open?: boolean;
  /** One-line plain-language description shown at the top of the group body. */
  hint?: string;
}

export type NarrationTone = "info" | "event" | "nudge";

export interface PanelShell {
  readonly element: HTMLElement;
  getState(): SettingsState;
  /** Reflect a status string next to the capture button. */
  setStatus(message: string): void;
  setCaptureEnabled(enabled: boolean): void;
  // ---- v2 ----
  getMode(): Mode;
  setMode(mode: Mode): void;
  /** Replace the Study diagnostics rows (no-op without a study slot). */
  setDiagnostics(rows: DiagnosticRow[]): void;
  /** Replace the gate/verdict line (no-op without a study slot). */
  setVerdict(verdict: VerdictSpec): void;
  /** Highlight one preset chip (null clears; chips also self-highlight). */
  setActivePreset(label: string | null): void;
  /**
   * Append a labeled control-group container and return the element the sim
   * appends its controls into (the fold BODY — append-only consumers from the
   * pre-disclosure surface keep working verbatim).
   */
  addGroup(label: string, opts?: GroupOptions): HTMLElement;
  // ---- v2.5 disclosure ----
  /**
   * Attach a hover/focus-revealed one-liner to a control row (disclosure
   * layer 2). Inline-expands below the row — never clipped by the panel's
   * overflow the way a floating tooltip would be.
   */
  hint(target: HTMLElement, text: string): void;
  /**
   * One-line live narration under the caption — the "what is happening right
   * now" line (droplet count, crack done → reset nudge). Empty text hides it.
   */
  setNarration(text: string, tone?: NarrationTone): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  bp2?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (bp2) e.setAttribute("data-bp2", bp2);
  return e;
}

/**
 * Build and mount the shared panel shell into `document.body`.
 *
 * v1-compatible: the v1 option set produces the v1 control set and the same
 * `{tier, seed}` state handle; the v1 `data-bp` driver contract is verbatim.
 */
export function createSettingsPanel(
  title: string,
  options: PanelShellOptions,
): PanelShell {
  const tiers = options.tiers ?? (["test", "demo", "reference"] as Tier[]);
  const state: SettingsState = {
    tier: options.initial?.tier ?? "test",
    seed: options.initial?.seed ?? 42,
  };
  let mode: Mode = options.modes?.initial ?? "play";

  const root = el("div", "bps");
  root.setAttribute("data-bp-panel", "true");
  root.setAttribute("data-bp2-shell", "2");
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", `${title} controls`);

  // top nav (P-8): back-to-portfolio + about — universal across all 7 sims
  // (one edit here, all inherit), same chip idiom as the P-6 landing nav.
  // Relative so they resolve under the Pages subpath from /sims/<sim>/:
  // ../../ → landing root, ../../about.html → the methodology page. New
  // elements use the data-bp2 namespace (the v1 data-bp contract is frozen).
  const nav = el("nav", "bps-nav", "nav");
  const navLink = (label: string, href: string): HTMLAnchorElement => {
    const a = el("a");
    a.textContent = label;
    a.href = href;
    return a;
  };
  nav.append(
    navLink("← portfolio", "../../"),
    navLink("about", "../../about.html"),
  );
  root.appendChild(nav);

  // header: title + (optional) Play/Study toggle
  const head = el("header", "bps-head");
  // The panel title is the page's <h1> (it was an <h3> with no h1/h2 above it)
  // unless the page already has its own (terrain-erosion's scene heading);
  // .bps-title's font shorthand keeps the visual size unchanged either way.
  const h = el(document.querySelector("h1") ? "h2" : "h1", "bps-title");
  h.textContent = title;
  head.appendChild(h);

  const modeButtons = new Map<Mode, HTMLButtonElement>();
  if (options.modes) {
    const seg = el("div", "bps-mode", "mode-toggle");
    for (const m of ["play", "study"] as const) {
      const b = el("button", undefined, `mode-${m}`);
      b.type = "button";
      b.textContent = m;
      b.addEventListener("click", () => applyMode(m, true));
      seg.appendChild(b);
      modeButtons.set(m, b);
    }
    head.appendChild(seg);
  }

  // hide/show toggle (v2.6). Phones boot collapsed: the sim first, the panel a
  // tap away. Everything but the header hides via [data-bp2-collapsed].
  let setCollapsed: (collapsed: boolean) => void = () => {};
  if (options.collapsible !== false) {
    const toggle = el("button", "bps-collapse", "collapse");
    toggle.type = "button";
    setCollapsed = (collapsed: boolean): void => {
      root.toggleAttribute("data-bp2-collapsed", collapsed);
      requestAnimationFrame(updateStageReserve);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.textContent = collapsed ? "controls ▴" : "hide";
      toggle.title = collapsed ? "Show the controls" : "Hide the controls";
    };
    toggle.addEventListener("click", () =>
      setCollapsed(!root.hasAttribute("data-bp2-collapsed")),
    );
    head.appendChild(toggle);
    setCollapsed(matchMedia("(max-width: 640px)").matches);
  }
  root.appendChild(head);

  // physics caption (P-8): the landing card copy, rendered alongside the title
  // as the page's visible per-sim identity — consistent across card/head/page.
  if (options.caption) {
    const cap = el("p", "bps-caption", "caption");
    cap.textContent = options.caption;
    root.appendChild(cap);
  }

  // live narration line (v2.5): present-but-hidden until the sim's first
  // setNarration() call, so wiring it is purely additive per sim.
  const narrate = el("p", "bps-narrate", "narrate");
  narrate.hidden = true;
  root.appendChild(narrate);

  // preset bar (house § 5.3 — live-loop only per D-P1.2(a))
  const presetButtons = new Map<string, HTMLButtonElement>();
  if (options.presets && options.presets.length > 0) {
    const bar = el("div", "bps-presets", "presets");
    for (const p of options.presets) {
      const chip = el("button", "bps-chip", `preset:${p.label}`);
      chip.type = "button";
      chip.textContent = p.label;
      if (p.title) chip.title = p.title;
      chip.addEventListener("click", () => {
        setActivePreset(p.label);
        p.apply();
      });
      bar.appendChild(chip);
      presetButtons.set(p.label, chip);
    }
    root.appendChild(bar);
  }

  // controls: extra + addGroup() containers. tier + seed (v1 contract) moved
  // into the collapsed "advanced" fold below — the data-bp attributes and
  // change semantics are verbatim; only the visual slot moved. Collapse is
  // [hidden] (display:none), so attribute selectors and programmatic .value
  // writes keep working without expanding.
  const controls = el("section", "bps-controls");

  // fold factory (disclosure layer 1): header <button> toggles the body.
  const makeFold = (
    label: string,
    opts?: GroupOptions,
  ): { container: HTMLElement; body: HTMLElement } => {
    const container = el("div", "bps-group", `group:${label}`);
    const head = el("button", "bps-fold");
    head.type = "button";
    head.textContent = label;
    const body = el("div", "bps-fold-body");
    const open = opts?.open ?? true;
    head.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
    head.addEventListener("click", () => {
      const next = body.hidden;
      body.hidden = !next;
      head.setAttribute("aria-expanded", String(next));
    });
    if (opts?.hint) {
      const hintLine = el("p", "bps-fold-hint");
      hintLine.textContent = opts.hint;
      body.appendChild(hintLine);
    }
    container.append(head, body);
    return { container, body };
  };

  const tierRow = el("div", "bps-row");
  const tierLabel = el("label");
  tierLabel.textContent = "tier";
  const tierSel = el("select");
  tierSel.setAttribute("data-bp", "tier");
  tierSel.id = "bps-tier";
  tierLabel.htmlFor = tierSel.id;
  for (const t of tiers) {
    const o = el("option");
    o.value = t;
    o.textContent = t;
    if (t === state.tier) o.selected = true;
    tierSel.appendChild(o);
  }
  tierSel.addEventListener("change", () => {
    state.tier = tierSel.value as Tier;
    options.onChange?.({ ...state });
  });
  tierRow.append(tierLabel, tierSel);

  const seedRow = el("div", "bps-row");
  const seedLabel = el("label");
  seedLabel.textContent = "seed";
  const seedInput = el("input");
  seedInput.type = "number";
  seedInput.setAttribute("data-bp", "seed");
  seedInput.id = "bps-seed";
  seedLabel.htmlFor = seedInput.id;
  seedInput.value = String(state.seed);
  seedInput.addEventListener("change", () => {
    const v = Number.parseInt(seedInput.value, 10);
    state.seed = Number.isFinite(v) ? v : 42;
    seedInput.value = String(state.seed);
    options.onChange?.({ ...state });
  });
  seedRow.append(seedLabel, seedInput);

  if (options.extra) controls.appendChild(options.extra);
  root.appendChild(controls);

  // advanced fold (v2.5): tier + seed, collapsed by default — the capture/
  // reproducibility contract belongs one click behind the sim's own controls,
  // not in the top slot of every panel. Appended to root AFTER the controls
  // section so per-sim addGroup() groups always render above it.
  const advanced = makeFold("advanced", {
    open: false,
    hint: "capture quality tier + deterministic RNG seed — the reproducibility contract",
  });
  advanced.body.append(tierRow, seedRow);
  root.appendChild(advanced.container);

  // study block: diagnostics + honesty note + verdict + links (house § 5.2/5.4)
  let diagList: HTMLDListElement | null = null;
  let verdictLine: HTMLDivElement | null = null;
  let studySection: HTMLElement | null = null;
  if (options.study) {
    studySection = el("section", "bps-study", "study");

    diagList = el("dl", "bps-diag", "diagnostics");
    studySection.appendChild(diagList);
    if (options.study.diagnostics) renderDiagnostics(options.study.diagnostics);

    if (options.study.honesty) {
      const note = el("div", "bps-note", "honesty");
      const headSpan = el("span", "bps-note-head");
      headSpan.textContent = "honesty note";
      note.appendChild(headSpan);
      const add = (label: string, text: string): void => {
        const b = el("b");
        b.textContent = `${label}: `;
        note.append(b, document.createTextNode(text), el("br"));
      };
      add("faithful", options.study.honesty.faithful);
      add("simplified", options.study.honesty.simplified);
      add("measured", options.study.honesty.measured);
      studySection.appendChild(note);
    }

    verdictLine = el("div", "bps-verdict", "verdict");
    studySection.appendChild(verdictLine);
    if (options.study.verdict) renderVerdict(options.study.verdict);

    if (options.study.links && options.study.links.length > 0) {
      const links = el("div", "bps-links", "links");
      for (const l of options.study.links) {
        const a = el("a");
        a.href = l.href;
        a.textContent = l.label;
        a.target = "_blank";
        a.rel = "noopener";
        links.appendChild(a);
      }
      studySection.appendChild(links);
    }
    root.appendChild(studySection);
  }

  // capture-to-disk + status (v1 contract; always present and clickable in
  // the boot state — the headless driver clicks it without touching modes)
  const btn = el("button", "bps-btn");
  btn.type = "button";
  btn.setAttribute("data-bp", "capture");
  btn.textContent = "Capture to disk";
  btn.addEventListener("click", () => {
    // Hold the capture/live-loop lock for the whole capture so the live RAF
    // loop cannot interleave a step into the shared GPU state (harness race).
    void runCaptureExclusive(options.onCapture);
  });
  root.appendChild(btn);

  const status = el("div", "bps-status");
  status.setAttribute("data-bp", "status");
  root.appendChild(status);

  function renderDiagnostics(rows: DiagnosticRow[]): void {
    if (!diagList) return;
    diagList.textContent = "";
    for (const r of rows) {
      const dt = el("dt");
      dt.textContent = r.label;
      const dd = el("dd");
      dd.textContent = r.value;
      diagList.append(dt, dd);
    }
  }

  function renderVerdict(v: VerdictSpec): void {
    if (!verdictLine) return;
    verdictLine.textContent = "";
    verdictLine.append(document.createTextNode(`gate: ${v.gate} — `));
    const word = el("span", v.pass ? "ok" : "no");
    word.textContent = v.verdict;
    verdictLine.appendChild(word);
  }

  function setActivePreset(label: string | null): void {
    for (const [key, chip] of presetButtons) {
      chip.setAttribute("aria-pressed", String(key === label));
    }
  }

  function applyMode(next: Mode, fireCallback: boolean): void {
    mode = next;
    root.setAttribute("data-bp2-mode", mode);
    document.body.setAttribute("data-bp2-mode", mode);
    for (const [m, b] of modeButtons) {
      b.setAttribute("aria-pressed", String(m === mode));
    }
    if (studySection) studySection.hidden = mode !== "study";
    if (fireCallback) options.modes?.onMode?.(mode);
  }

  if (options.modes) applyMode(mode, false);
  else if (studySection) studySection.hidden = false;

  document.body.appendChild(root);
  installAccessibleNames(root, title);

  // Stage re-centring (v2.6, finding 15). --bps-reserve is the width the panel
  // occupies on the right; theme.css pulls .bps-stage and the body's in-flow
  // content (EXPLAIN/PROVE bars) in by it. Only when the canvas fits whole in
  // the free area — a full-bleed canvas would otherwise be clipped — and only
  // for a right-docked floating panel on a wide viewport.
  let reserve = 0;
  function updateStageReserve(): void {
    const stage = document.querySelector<HTMLElement>(".bps-stage");
    const canvas = stage?.querySelector("canvas");
    let next = 0;
    if (canvas && !root.hasAttribute("data-bp2-collapsed") && innerWidth > 640) {
      const r = root.getBoundingClientRect();
      const docked = getComputedStyle(root).position === "fixed" && r.left > innerWidth / 2;
      if (docked && canvas.clientWidth > 0 && canvas.clientWidth <= r.left - 24) {
        next = Math.ceil(innerWidth - r.left);
      }
    }
    if (next === reserve) return;
    reserve = next;
    document.documentElement.style.setProperty("--bps-reserve", `${reserve}px`);
    // Overlays a sim aligns to the canvas rect on resize (MST lines, axes)
    // must re-measure after the canvas moved without a window resize.
    window.dispatchEvent(new Event("resize"));
  }
  let reserveQueued = false;
  const queueReserve = (): void => {
    if (reserveQueued) return;
    reserveQueued = true;
    requestAnimationFrame(() => {
      reserveQueued = false;
      updateStageReserve();
    });
  };
  window.addEventListener("resize", queueReserve);
  const stageCanvas = document.querySelector(".bps-stage canvas");
  if (stageCanvas) new ResizeObserver(queueReserve).observe(stageCanvas);
  queueReserve();

  return {
    element: root,
    getState: () => ({ ...state }),
    setStatus: (m: string) => {
      status.textContent = m;
    },
    setCaptureEnabled: (e: boolean) => {
      btn.disabled = !e;
    },
    getMode: () => mode,
    setMode: (m: Mode) => applyMode(m, true),
    setDiagnostics: renderDiagnostics,
    setVerdict: renderVerdict,
    setActivePreset,
    addGroup: (label: string, opts?: GroupOptions): HTMLElement => {
      const fold = makeFold(label, opts);
      controls.appendChild(fold.container);
      return fold.body;
    },
    hint: (target: HTMLElement, text: string): void => {
      target.classList.add("bps-hintable");
      const tip = el("div", "bps-hint");
      tip.textContent = text;
      target.appendChild(tip);
    },
    setNarration: (text: string, tone: NarrationTone = "info"): void => {
      narrate.textContent = text;
      narrate.setAttribute("data-tone", tone);
      narrate.hidden = text.length === 0;
    },
  };
}

// --------------------------------------------------------------------------- //
// Accessible names (v2.6, review finding 11)
// --------------------------------------------------------------------------- //
// Per-sim rows are built by hand (`<div class="bps-row"><span>ν</span><input>`),
// so most controls had no accessible name (sph-water: 10 of 11). Rather than
// touch every sim, the shell names what is still unnamed: a control takes the
// text of the nearest preceding non-control sibling (its row label), and a
// canvas becomes a labelled image. Never overrides a name a sim already set.

const CONTROL_SELECTOR = "input:not([type=hidden]), select, textarea";

function hasAccessibleName(c: HTMLElement): boolean {
  if (c.getAttribute("aria-label") || c.getAttribute("aria-labelledby")) return true;
  if (c.title) return true;
  const labels = (c as HTMLInputElement).labels;
  return labels !== null && labels !== undefined && labels.length > 0;
}

function rowLabelFor(c: HTMLElement, root: HTMLElement): string | null {
  const isControl = (e: Element): boolean =>
    e.matches("input, select, textarea, button, output, canvas");
  const holdsControl = (e: Element): boolean =>
    isControl(e) || e.querySelector("input, select, textarea, button") !== null;
  // Climb at most three levels (a control is often wrapped in a styling box
  // whose sibling is the label). At each level the nearest preceding sibling
  // with text is the label; a preceding sibling that holds its own control is
  // a different row, so stop looking sideways there.
  let node: Element = c;
  for (let depth = 0; depth < 3 && node !== root && node.parentElement; depth += 1) {
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
      if (holdsControl(sib)) break;
      const t = sib.textContent?.trim();
      if (t) return t;
    }
    // Control first in its row (checkbox then text): the row's own text.
    const row = node.parentElement;
    if (row === root) break;
    const own = Array.from(row.childNodes)
      .filter((n) => !(n instanceof Element && holdsControl(n)))
      .map((n) => n.textContent?.trim() ?? "")
      .filter((t) => t.length > 0)
      .join(" ");
    if (own) return own;
    node = row;
  }
  return null;
}

function nameUnnamed(root: HTMLElement, title: string): void {
  // The whole page, not just the panel: several sims build control strips of
  // their own (boids-2d's lab UI, heat-equation's solver row).
  for (const c of Array.from(document.body.querySelectorAll<HTMLElement>(CONTROL_SELECTOR))) {
    if (hasAccessibleName(c) || c.closest('[data-bp2="webgpu-fallback"]')) continue;
    const fold = c.closest(".bps-group")?.querySelector(".bps-fold")?.textContent?.trim();
    const label = rowLabelFor(c, document.body) ?? (fold ? `${fold} setting` : null);
    if (label) c.setAttribute("aria-label", label.slice(0, 120));
  }
  for (const cv of Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas"))) {
    if (cv.hasAttribute("aria-label") || cv.hasAttribute("aria-hidden")) continue;
    cv.setAttribute("role", "img");
    if (root.contains(cv)) {
      const fold = cv.closest(".bps-group")?.querySelector(".bps-fold")?.textContent;
      cv.setAttribute("aria-label", fold ? `${fold.trim()} plot` : `${title} plot`);
    } else {
      cv.setAttribute("aria-label", `${title} — live simulation view`);
    }
  }
}

function installAccessibleNames(root: HTMLElement, title: string): void {
  let queued = false;
  const run = (): void => {
    queued = false;
    nameUnnamed(root, title);
  };
  const schedule = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  run();
  // Sims append controls after createSettingsPanel returns (addGroup bodies),
  // and some build controls or canvases late; re-run once per frame while the
  // panel's structure changes, plus a couple of late sweeps for the rest.
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  setTimeout(schedule, 1500);
  setTimeout(schedule, 6000);
}
