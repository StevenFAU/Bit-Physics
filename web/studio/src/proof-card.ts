// ProofCard (00-foundation.md § 5): one check per card — what is tested in
// one plain sentence, the measured number, the declared budget, a bar for
// their ratio, pass/fail, the adapter it ran on, and links to the spec
// section and the ledger row. Precise labels only.

import { h } from "./dom.js";
import { icon } from "./icons.js";

export type ProofStatus = "idle" | "running" | "pass" | "fail" | "info";

export interface ProofCardSpec {
  title: string;
  /** What is being tested, one plain sentence. */
  sentence: string;
  /** The precise claim label shown on pass, e.g. "reference agreement passed". */
  label: string;
  links?: { label: string; href: string }[];
  /** Run button text; omit for informational cards. */
  action?: string;
}

export interface ProofResult {
  status: ProofStatus;
  /** Measured value, already formatted (Plex Mono). */
  measured?: string;
  /** Declared budget, formatted. */
  budget?: string;
  /** measured / budget, for the bar (0–1+). */
  ratio?: number;
  /** Where it ran. */
  adapter?: string;
  /** Extra lines (hashes, per-field numbers). */
  notes?: string[];
}

export interface ProofCard {
  el: HTMLElement;
  button: HTMLButtonElement | null;
  set(r: ProofResult): void;
}

export function proofCard(spec: ProofCardSpec, onRun?: () => void): ProofCard {
  const status = h("span", { class: "bp-proof-status", role: "status" });
  const measured = h("dd", { class: "bp-mono" }, "—");
  const budget = h("dd", { class: "bp-mono" }, "—");
  const adapter = h("dd", {}, "—");
  const barFill = h("span", { class: "bp-proof-bar-fill" });
  const bar = h("div", { class: "bp-proof-bar", "aria-hidden": "true" }, barFill, h("span", { class: "bp-proof-bar-limit" }));
  const notes = h("div", { class: "bp-proof-notes bp-mono" });
  const button = spec.action
    ? h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, spec.action)
    : null;
  if (button && onRun) button.addEventListener("click", onRun);
  const links = spec.links?.length
    ? h(
        "p",
        { class: "bp-proof-links" },
        ...spec.links.flatMap((l, i) => [
          i > 0 ? " · " : "",
          h("a", { href: l.href, target: "_blank", rel: "noopener" }, l.label),
        ]),
      )
    : null;
  const el = h(
    "article",
    { class: "bp-proof", "data-status": "idle" },
    h("header", { class: "bp-proof-head" }, h("h3", {}, spec.title), status),
    h("p", { class: "bp-proof-sentence" }, spec.sentence),
    h(
      "dl",
      { class: "bp-proof-numbers" },
      h("dt", {}, "Measured"),
      measured,
      h("dt", {}, "Budget"),
      budget,
      h("dt", {}, "Ran on"),
      adapter,
    ),
    bar,
    notes,
    button,
    links,
  );
  const labels: Record<ProofStatus, string> = {
    idle: "not run here yet",
    running: "running…",
    pass: spec.label,
    fail: "over budget",
    info: "",
  };
  const set = (r: ProofResult): void => {
    el.dataset["status"] = r.status;
    status.innerHTML = "";
    if (r.status === "pass") status.insertAdjacentHTML("afterbegin", icon("check", 14));
    if (r.status === "fail") status.insertAdjacentHTML("afterbegin", icon("alert", 14));
    status.append(document.createTextNode(r.status === "info" ? spec.label : labels[r.status]));
    if (r.measured !== undefined) measured.textContent = r.measured;
    if (r.budget !== undefined) budget.textContent = r.budget;
    if (r.adapter !== undefined) adapter.textContent = r.adapter;
    if (r.ratio !== undefined) {
      const w = Math.min(Math.max(r.ratio, 0), 1.25) / 1.25;
      barFill.style.width = `${(w * 100).toFixed(1)}%`;
      bar.title = `${(r.ratio * 100).toFixed(1)}% of the declared budget`;
    }
    notes.textContent = "";
    for (const n of r.notes ?? []) notes.append(h("div", {}, n));
    if (button) button.disabled = r.status === "running";
  };
  set({ status: "idle" });
  return { el, button, set };
}
