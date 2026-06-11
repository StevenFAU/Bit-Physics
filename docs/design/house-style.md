# Bit-Physics house style — design tokens + interaction conventions

> **Canonical presentation anchor for Lane B (portfolio polish).** Created by
> dispatch P-2 to resolve the P-1 SHIFT: the original reference files
> (`bit-physics-eulerian-smoke.html` canonical, `lbm.html` phosphor-instrument
> variant, plus the frontend/verification notes) live outside the repo, so
> Convention #8 (measure-live) was unsatisfiable for aesthetics. The token
> sets below were measured by the coordinator directly from those reference
> sims and are pinned here at P-2 dispatch time (2026-06-11).
>
> **Precedence.** For presentation work, THIS document is the canon. Where it
> conflicts with styling found at HEAD (e.g. the launch landing page's
> `#2dd4bf` accent), the in-tree styling is the thing being brought into
> line — document the delta, don't invert the precedence. (This is a scoped
> exception to #8 for aesthetic tokens only; behavioral/structural claims
> are still measured at HEAD.)

## 1. Canonical token set (eulerian-smoke reference)

```css
:root {
  --bg: #06090d;
  --panel: rgba(10, 15, 21, .80);
  --line: #1a232e;
  --txt: #c3cfd8;
  --dim: #74828f;
  --faint: #475461;
  --accent: #36e0cf;
  --accent-d: #0f3a37;
  --warm: #ff7a3c;
  --bad: #ff5d6c;
  --mono: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace;
  --cond: 'IBM Plex Sans Condensed', var(--mono);
}
```

This is the default skin for the landing page and per-sim chrome.

## 2. Phosphor-instrument variant (lbm reference)

```css
:root {
  --bg: #05070a;
  --ink: #cfe9e6;
  --ink-dim: #7a938f;
  --ink-faint: #4a5d5a;
  --phos: #36e3c8;
  --phos-deep: #0f6f63;
  --amber: #ffb454;
  --red: #ff5c54;
  --hair: rgba(54, 227, 200, .16);
  --hair-soft: rgba(54, 227, 200, .08);
  --panel: rgba(7, 12, 16, .82);
  --panel-solid: #070d11;
  --chip: rgba(54, 227, 200, .07);
}
```

An opt-in variant for sims where the single-phosphor CRT-instrument look
fits (measurement-heavy, oscilloscope-adjacent presentations). Use one
family per surface; don't mix the two token sets in one page.

## 3. Typography

Google Fonts (or self-hosted woff2 equivalents when a bundle must avoid
runtime font fetches):

- `IBM Plex Mono` weights 300; 400; 500; 600 — body, controls, data.
- `IBM Plex Sans Condensed` weights 500; 600; 700 — display/headline use
  via `--cond`.

## 4. Accent migration note

The house accent is **`#36e0cf`**. The launch landing page shipped with
`#2dd4bf` — a near-miss measured at P-1 — and is migrated to `#36e0cf` by
the P-2 landing-v2 rebuild. Any other `#2dd4bf` occurrence found later in
presentation surfaces is a delta to migrate, not a competing canon.

## 5. Interaction conventions (ratified house conventions)

Ratified with P-2; implementation lands with the shared-chrome arc (P-3+).
Every per-sim presentation surface converges on:

1. **"Be a force in the field"** — the cursor has consequence-on-input:
   pointer interaction perturbs the live simulation (live-loop only; the
   capture path stays pinned to canonical state per D-P1.2(a)).
2. **Play/Study mode toggle** — *Play*: canvas + direct manipulation,
   minimal chrome. *Study*: paused or observed state with measured
   diagnostics, verification status (the sim's gate + verdict), and spec
   links.
3. **Named-regime presets** — evocative, physically meaningful parameter
   regimes (not bare numbers); presets drive live-loop uniforms only.
4. **Measured diagnostics + honesty note** — diagnostics shown are real
   measurements from the running state, labeled with what is and isn't
   faithful (faithful physics vs simplified-for-interactivity), and when
   they were measured (per-frame vs at-capture).

## 6. Provenance

Token values and interaction conventions: coordinator-measured from the
out-of-repo reference sims, supplied verbatim in dispatch P-2 § 3,
operator-ratified. Recorded in the Lane B P-2 audit note
(`docs/_audits/phase-6/`). Deltas from this canon discovered in-tree are
documented in audit notes as migrations, per § 4.
