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
// Lives in common/common-web/ (NOT common/common-ts/) so it never enters the
// Node-targeted `ts-strict` CI surface; per-sim Vite apps import it as source
// via a relative path and bundle it for the browser.

import { runCaptureExclusive } from "./capture-export.js";

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
  const h = el("h3", "bps-title");
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
