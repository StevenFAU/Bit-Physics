// Shared Stack-B web settings/controls panel (spec § 10.1).
//
// One component for all seven web sims rather than seven bespoke panels
// (web-build-track scoping note § 5, rule-of-three). Exposes the three
// spec § 10.1 minimum controls — tier, seed, capture-to-disk — plus an
// optional slot for per-sim extra controls.
//
// Lives in common/common-web/ (NOT common/common-ts/) so it never enters
// the Node-targeted `ts-strict` CI surface; the per-sim Vite apps import
// it as source via a relative path and esbuild bundles it for the browser.

import { runCaptureExclusive } from "./capture-export.js";

export type Tier = "test" | "demo" | "reference";

export interface SettingsState {
  tier: Tier;
  seed: number;
}

export interface SettingsPanelOptions {
  initial?: Partial<SettingsState>;
  /** Tier values offered in the dropdown. Defaults to all three. */
  tiers?: Tier[];
  /** Fired when the user clicks "Capture to disk". */
  onCapture: () => void | Promise<void>;
  /** Fired when tier or seed changes (e.g. to reset the sim). */
  onChange?: (state: SettingsState) => void;
  /** Optional extra controls appended below the standard three. */
  extra?: HTMLElement;
}

export interface SettingsPanel {
  readonly element: HTMLElement;
  getState(): SettingsState;
  /** Reflect a status string next to the capture button. */
  setStatus(message: string): void;
  setCaptureEnabled(enabled: boolean): void;
}

const PANEL_STYLE = `
.bp-panel{position:fixed;top:12px;right:12px;z-index:10;font:13px/1.4 ui-monospace,monospace;
  background:rgba(20,22,28,.92);color:#e6e6e6;padding:12px 14px;border-radius:8px;
  box-shadow:0 4px 18px rgba(0,0,0,.4);min-width:200px}
.bp-panel h3{margin:0 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#9fb0c0}
.bp-row{display:flex;justify-content:space-between;align-items:center;margin:6px 0;gap:10px}
.bp-row label{color:#b8c2cc}
.bp-row select,.bp-row input{background:#11141a;color:#e6e6e6;border:1px solid #2a3340;
  border-radius:4px;padding:3px 6px;font:inherit;width:90px}
.bp-btn{width:100%;margin-top:8px;background:#2d6cdf;color:#fff;border:0;border-radius:5px;
  padding:7px;font:inherit;cursor:pointer}
.bp-btn:disabled{background:#3a4250;cursor:default}
.bp-status{margin-top:6px;font-size:11px;color:#8fa;min-height:14px;word-break:break-word}
`;

function ensureStyle(): void {
  if (document.getElementById("bp-panel-style")) return;
  const s = document.createElement("style");
  s.id = "bp-panel-style";
  s.textContent = PANEL_STYLE;
  document.head.appendChild(s);
}

/**
 * Build and mount the shared settings panel into `document.body`.
 *
 * The returned handle exposes the live `{tier, seed}` state plus a
 * `setStatus` channel the capture-export hook uses to surface progress.
 */
export function createSettingsPanel(
  title: string,
  options: SettingsPanelOptions,
): SettingsPanel {
  ensureStyle();
  const tiers = options.tiers ?? (["test", "demo", "reference"] as Tier[]);
  const state: SettingsState = {
    tier: options.initial?.tier ?? "test",
    seed: options.initial?.seed ?? 42,
  };

  const root = document.createElement("div");
  root.className = "bp-panel";
  root.setAttribute("data-bp-panel", "true");

  const h = document.createElement("h3");
  h.textContent = title;
  root.appendChild(h);

  // tier
  const tierRow = document.createElement("div");
  tierRow.className = "bp-row";
  const tierLabel = document.createElement("label");
  tierLabel.textContent = "tier";
  const tierSel = document.createElement("select");
  tierSel.setAttribute("data-bp", "tier");
  for (const t of tiers) {
    const o = document.createElement("option");
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
  root.appendChild(tierRow);

  // seed
  const seedRow = document.createElement("div");
  seedRow.className = "bp-row";
  const seedLabel = document.createElement("label");
  seedLabel.textContent = "seed";
  const seedInput = document.createElement("input");
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
  root.appendChild(seedRow);

  if (options.extra) root.appendChild(options.extra);

  // capture-to-disk
  const btn = document.createElement("button");
  btn.className = "bp-btn";
  btn.setAttribute("data-bp", "capture");
  btn.textContent = "Capture to disk";
  btn.addEventListener("click", () => {
    // Hold the capture/live-loop lock for the whole capture so the live RAF
    // loop cannot interleave a step into the shared GPU state (harness race).
    void runCaptureExclusive(options.onCapture);
  });
  root.appendChild(btn);

  const status = document.createElement("div");
  status.className = "bp-status";
  status.setAttribute("data-bp", "status");
  root.appendChild(status);

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
  };
}
