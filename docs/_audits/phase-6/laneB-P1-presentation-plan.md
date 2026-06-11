---
date: 2026-06-11
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-proposal
artifact_id: laneB-P1-presentation-plan
verdict: PROPOSED
verdict-state: HARD-STOP-AWAITING-RATIFICATION
head_sha: e08da525815835f7963070f5ee9ad9628120c7cf
parent_audits:
  - "[[charter-amendment-operating-model-2026-06-11T12-51-28Z]]"
---

# Lane B / P-1 — Presentation inventory + landing-v2 / shared-chrome plan (PROPOSED)

> Deliverable of dispatch P-1 (Lane B, presentation only). INVENTORY + PLAN
> ONLY — nothing was built, restyled, or refactored; no compute surface was
> read-modified (read-only inventory). All claims below are measured at HEAD
> `e08da52` this session (Convention #8). Companion append-only audit note:
> `laneB-P1-dispatch-audit-2026-06-11T13-17-27Z` (files read, SHIFTs,
> no-compute-touched confirmation).

---

## § 1 — Stage-1 inventory findings

### 1.1 Landing page

Source: `tools/productization/web-deploy/web/pages/index.html` (171 lines,
single file, zero JS, ~48 lines inline CSS). Deployed **verbatim** — the
deploy job copies it unprocessed to the site root
(`.github/workflows/web-deploy.yml:207`). Self-describes as a "minimal launch
surface, designed for replacement by the full interactive site" (footer).

Structure (all hardcoded, nothing generated):

- **Header** — `bit-physics.sim` wordmark + tagline + "posture box" (the
  append-only-ledger / measured-then-declared-never-widened claim, with the
  7/7 lavapipe-green and RADV-canonical provenance).
- **Simulations grid** — 7 hardcoded cards; each card = sim name, one
  `meta` line (category · technique), one `gate` line naming the exact gate
  kind its bundle was re-verified through. No imagery, no previews.
- **WebGPU requirement note.**
- **Downloads** — v0.5.0-phase-5 release links (2 Stack-C binaries +
  SHA256SUMS) and source link, hardcoded.
- **Verification record** — links to the phase-5 close audit and the full
  `docs/_audits` ledger.

The card gate lines are the page's strongest asset: they are the honest
verification posture rendered per-sim. Landing-v2 must keep them.

### 1.2 Per-sim UI surface profiles (the uniform finding)

The 7 sims are **structurally identical** in their presentation layer. One
shared chrome (`common/common-web/src/settings-panel.ts`, 159 lines) is
imported by every sim; no sim adds anything beyond it. The per-sim profile
table therefore collapses to a single row repeated seven times, with only
palette drift and capture-time status text varying:

| Surface | boids-3d | neural-ca | physarum | rd-2d | ising | mandelbulb | strange-attr. |
|---|---|---|---|---|---|---|---|
| Controls beyond tier/seed/capture | — | — | — | — | — | — | — |
| Sim-parameter controls (any) | — | — | — | — | — | — | — |
| Named-regime presets | — | — | — | — | — | — | — |
| Play/Study toggle | — | — | — | — | — | — | — |
| Live diagnostics panel | — | — | — | — | — | — | — |
| Capture-time status readout | — | — | mass | — | E/spin, M | n_outside, max_de | — |
| Honesty note (UI text) | — | — | partial | — | — | partial | — |
| Cursor-as-force | — | — | — | — | — | — | — |
| IBM Plex Mono | — | — | — | — | — | — | — |
| House accent `#2dd4bf` | — | — | — | — | — | — | — |
| Body bg token | `#05060a` | `#0b0d12` | `#05060a` | `#0b0d12` | `#0b0d12` | `#05060a` | `#05060a` |

Detail, measured this session:

- **Controls.** Every sim mounts exactly three controls via
  `createSettingsPanel()`: a `tier` select (test/demo/reference), a `seed`
  number input, and a "Capture to disk" button. The panel's optional
  per-sim slot (`common/common-web/src/settings-panel.ts:30`, appended at
  `common/common-web/src/settings-panel.ts:128`) is used by **zero** sims.
  All physics parameters are compile-time constants in each sim's
  `web/src/main.ts`, written once into uniform buffers (e.g. boids
  perception/v_max/weights/dt; rd-2d Du/Dv/F/k; ising J/h/T=2.27; Lorenz
  sigma/rho/beta). Nothing is user-tunable.
- **Presets.** Absent in all 7. The tier select is an operational capture
  tier, not a regime preset.
- **Play/Study.** Absent in all 7. Each sim free-runs a `requestAnimationFrame`
  loop; the only pause is the internal `isCapturing()` gate
  (`common/common-web/src/capture-export.ts:129`) during capture. Notably,
  this gate proves the RAF loop already supports clean suspension — a Study
  mode can reuse the identical pattern.
- **Diagnostics.** No live panel anywhere. Diagnostics are computed only
  inside `captureCanonical()` and either shipped silently in the capture
  descriptor (boids `max_speed`/`mean_speed`, rd-2d `mass_U`/`mass_V`,
  strange-attractors `radius`, neural-ca none) or echoed once into the
  panel status line (physarum `total_mass`, ising `energy_per_spin`/
  `magnetization`, mandelbulb `n_outside_set`/`max_de`). No honesty note as
  deliberate UI copy; the closest are physarum's "(atomic deposit;
  new-canonical)" and mandelbulb's "capture ready — …" status strings.
- **Cursor interaction.** Absent in all 7. No pointer listeners exist in any
  web layer. The three 3-D sims auto-orbit (boids +0.003 rad/frame,
  strange-attractors +0.003, mandelbulb +0.004) with no manual camera.
- **Typography/palette vs house tokens.** No sim loads IBM Plex Mono; all
  use the `ui-monospace, monospace` fallback
  (`common/common-web/src/settings-panel.ts:42`). The shared panel carries
  its own palette — translucent `rgba(20,22,28,.92)` panel, `#e6e6e6` text,
  and a **blue** `#2d6cdf` capture button
  (`common/common-web/src/settings-panel.ts:50`) — the house accent
  `#2dd4bf` appears nowhere outside the landing page. Body backgrounds are
  split 4/3 between `#05060a` (house `--bg`) and `#0b0d12` (house
  `--panel`). One outright divergence: neural-ca's canvas is **white**
  (`packages/neural-ca/web/index.html:13`, `background: #fff`) — correct for
  the model's white substrate but unstyled against the dark page.

### 1.3 Per-sim structural notes — the safe presentation surface

Common shape, all 7 sims: `web/index.html` (9–22 lines, pure shell + inline
CSS) → `web/src/main.ts` (hybrid) → `web/src/render.wgsl` (display shader)
plus the compute kernel imported `?raw` from the sim package root
(`packages/<sim>/src/*.wgsl` — Lane A surface, untouchable).

Inside each `main.ts` the layers interleave but separate cleanly:

| Sim | `main.ts` lines | Presentation-safe regions (panel mount + RAF loop + DOM) | Compute regions (device/buffers/pipelines/step/capture/readback) |
|---|---|---|---|
| boids-3d | 236 | panel mount ~199; RAF loop ~204–232 | ~37–176 + `speeds()` diag ~125–134 |
| neural-ca | 262 | panel mount + onChange ~220–230 | pipelines/dispatch + `captureCanonical()` ~180–219 |
| physarum | 225 | panel ~202; RAF ~205–221 | buffers/pipelines ~49–85; step/capture ~102–173 |
| reaction-diffusion-2d | 326 | panel ~303–309; RAF ~311–320 | init/pipelines ~70–147; step/render/read/capture ~149–301 |
| ising-classical | 241 | panel ~212–216; RAF ~221–237 | `sweep()` ~136–158; capture ~160–210 |
| mandelbulb-explorer | 204 | panel + frame loop ~175–200 | pipelines ~61–95; DE capture ~97–173 |
| strange-attractors | 193 | frame loop ~173–189 | capture ~123–163; integrator dispatch |

(Line ranges are session-measured orientation marks, not contracts; every
polish dispatch re-anchors per Convention M before editing.)

Three boundary classifications matter for the whole arc:

1. **`common/common-web/src/capture-export.ts` (148 lines) is a capture/gate
   path** — it emits the capture descriptor the validate gate verifies and
   owns the live-loop mutual exclusion. Under the lane boundary it is
   **compute surface, untouchable by Lane B**, even though it lives in
   common-web. All shared-chrome work below is additive around it.
2. **`web/src/render.wgsl` per sim is a WGSL shader that the gate never
   reads** — captures are taken from state buffers, not rendered pixels, in
   all 7 sims. Strictly, the lane wording ("WGSL shaders") excludes it;
   functionally it is pure presentation (colormaps, point sprites). Raised
   as D-P1.2(c) below.
3. **Live-loop uniform writes in `main.ts`** sit between layers: presets and
   cursor-as-force require writing uniforms at runtime, while
   `captureCanonical()` in every sim re-derives canonical state (canonical
   IC + hardcoded params), so the gate stays pinned. Raised as D-P1.2(a).

### 1.4 common-web

Exactly two files, 307 lines total: `common/common-web/src/settings-panel.ts`
(159 — presentation: panel DOM, embedded CSS, tier/seed/capture wiring) and
`common/common-web/src/capture-export.ts` (148 — capture path, see § 1.3).
There is no package.json; every sim imports by relative path
(`../../../../common/common-web/src/*.js`) and each sim's own Vite build
bundles the shared source into its `dist/`. So a one-line change to
common-web changes all seven deployed bundles on their next build —
maximum leverage, and the reason migration order below is per-sim explicit.

What is duplicated per-sim instead of shared: the `index.html` shell + boot
div + inline global CSS (7 near-copies), `vite.config.ts` (7 copies), and
the RAF-loop choreography in each `main.ts`.

### 1.5 Web-deploy pipeline touchpoints

Validate gate per sim (`tools/productization/web-deploy/pipeline.py`,
`verify.py`, `web/headless/driver.mjs`): vite build → headless-Chromium
drive → re-apply the sim's established gate
(`tools/productization/web-deploy/pipeline.py:53` `GATE_KIND`:
rd-2d/neural-ca `capture_roundtrip`, ising `observable`, the other four
`new_canonical` + run-twice byte-identical).

**Presentation contract the chrome must never break** (the driver hard-gates
on it): panel mounts with `data-bp-panel`
(`common/common-web/src/settings-panel.ts:83`, checked at
`tools/productization/web-deploy/web/headless/driver.mjs:110`), capture
button clickable as `[data-bp="capture"]`
(`tools/productization/web-deploy/web/headless/driver.mjs:118`), and the
`window.__bitPhysicsReady` / `__bitPhysicsCaptureReady` globals
(`tools/productization/web-deploy/web/headless/driver.mjs:108-119`).

**What rides free vs what triggers validation.** The landing page and embed
template are copied verbatim and exercised by **no** validation — landing-v2
rides completely free of the gate. Everything under `packages/**/web/**`,
`common/common-web/**`, or `tools/productization/web-deploy/**` matches the
workflow's PR path globs — but the workflow has **no bare-main-push
trigger** (`web-deploy.yml` triggers: `web-v*` tags, PR path globs,
operator `workflow_dispatch`). Since Lane B pushes straight to main and I7
forbids tags, **no polish commit will ever receive CI browser-WebGPU
validation on push**; main-push CI covers only ts-strict / integrity /
structure / audit-append-only and friends. This inverts the dispatch's
framing: the question is not which changes *trigger* full validation, but
that none do — validation must be sought deliberately. See D-P1.3 and risk
R-2.

## § 2 — Stage-2 house-aesthetic anchors (with SHIFT record)

**SHIFT (Convention #8 — dispatch framing vs HEAD).** The four referenced
anchor files — `SKILL.md`, `bit-physics-frontend-and-verification-notes.md`,
`bit-physics-eulerian-smoke.html`, `lbm.html` — **do not exist anywhere at
HEAD** (find-verified across the repo this session; also absent from the
operator's local Downloads). They cannot be read, so per #8 HEAD wins and
the anchors are reconstructed from what the repo actually contains:

- **Design tokens (measured, canonical).** The landing page is the single
  in-repo aesthetic authority. Its header comment declares the house style
  in prose (`tools/productization/web-deploy/web/pages/index.html:10` —
  "IBM Plex Mono / dark instrument palette / cyan-teal accent") and its
  `:root` block defines the token set: `--bg #05060a`, `--panel #0b0d12`,
  `--line #1a2029`, `--fg #cdd6e0`, `--muted #7f8a99`, `--accent #2dd4bf`,
  `--accent-dim #14756a`; type = IBM Plex Mono 400/500/600 via Google
  Fonts, 14px/1.55 base; established motifs: `// `-prefixed uppercase
  letter-spaced section heads, 1px `--line` borders + 3px accent-dim left
  rail on callout panels, 6px-radius cards with hover border-accent.
  The expected `#2dd4bf` cyan-teal accent is **confirmed**.
- **Interaction conventions (NOT measurable at HEAD).** Play/Study,
  named-regime presets, cursor-as-force, and measured-diagnostics+honesty-
  note exist in **zero** of the 7 sims and in no in-repo reference sim.
  They enter this plan as dispatch-prose proposals to be ratified with P-2,
  not as measured house conventions. No in-repo references disagree with
  each other (the references named simply don't exist), so no D-class
  conflict arises beyond the absence itself, recorded here.

## § 3 — Landing-page-v2 scope

Replace `web/pages/index.html` in place; stays a single static file, zero
runtime JS (or minimal progressive-enhancement JS), copied verbatim, zero
gate exposure.

1. **Hero/story treatment.** Keep wordmark + instrument aesthetic. Promote
   the posture box from a paragraph into the hero: one-line thesis ("GPU
   physics & emergence, every claim gated"), then the posture copy. Add a
   compact phase strip (Phase 0→5 shipped, Phase 6 in progress) sourced
   from the ledger links that already exist.
2. **Per-sim cards with preview.** RECOMMENDED MECHANISM: **static frame
   poster per card** — one PNG per sim (~512px, target ≤150 KB each,
   ~0.7–1 MB total), captured locally from the live sims, committed under
   `web/pages/assets/`, `loading="lazy"`.
   - *Static frame* — cost: 7 small binaries in git (no LFS dependency —
     R-6), one asset commit; payoff: cards go from text-only to visual
     identity; zero risk: no WebGPU on landing, no sim code imported, no
     validation surface.
   - *Looped capture render (webm)* — cost: render/encode step + ~2–4 MB
     committed binaries or a pipeline change to generate at deploy (which
     would touch `tools/productization/web-deploy/` — gate-adjacent);
     payoff: motion. Deferred as a later progressive enhancement
     (`<video>` poster fallback keeps the upgrade path trivial).
   - *Live animated canvas thumbnails* — cost: 7 WebGPU contexts on one
     page, imports sim compute code into the landing tree (lane violation
     by construction), mobile/perf cliff; payoff highest but rejected for
     v2.
3. **Verification-posture explainer section.** New section between sims and
   downloads: three short entries explaining the three gate kinds the cards
   already name (`capture_roundtrip`, `observable`, `new_canonical` +
   run-twice), each linking the ledger. This is the portfolio's
   differentiator; currently it lives only in card footnotes.
4. **Downloads integration.** Keep content; restyle as the same card grid;
   add the checksum-verification one-liner as an honesty note.

**Estimated commits (Convention A, ≤500 lines, new files first):**
L-1 `web/pages/assets/` — 7 preview PNGs + alt-text manifest (binary-light,
new files only). L-2 landing `index.html` v2 rewrite (~350–450 lines, single
file). L-3 (only if needed) responsive/copy fixes. Landing-v2 total: 2–3
commits.

## § 4 — Shared-chrome scope

All additive: new files in `common/common-web/src/`;
`capture-export.ts` is never edited (§ 1.3.1). Components:

1. `theme.ts` + `theme.css` — house tokens as CSS custom properties
   (§ 2 set), IBM Plex Mono loading (self-hosted woff2 under
   `common/common-web/assets/` to avoid a runtime Google-Fonts dependency
   in sims), shared page-shell styles replacing the 7 near-copies of
   index.html inline CSS. Normalizes body bg to `--bg #05060a` (fixes the
   4/3 split) and gives neural-ca's white canvas a deliberate framed
   treatment.
2. `panel-shell.ts` — control-panel shell v2: house-styled, collapsible
   sections, **preserving verbatim** the `data-bp-panel` root attribute,
   `data-bp="tier"|"seed"|"capture"` controls, and the
   `runCaptureExclusive` wiring. Existing `settings-panel.ts` becomes a
   thin wrapper or is superseded sim-by-sim; the driver contract (§ 1.5) is
   the acceptance test.
3. `preset-bar.ts` — named-regime preset strip; preset *definitions* live
   per-sim in `web/src/presets.ts` (new file per sim), driving **live-loop
   uniforms only** — `captureCanonical()` keeps re-deriving canonical state
   so the gate stays pinned (D-P1.2(a) gates this component).
4. `diagnostics-readout.ts` + `study-note.ts` — diagnostics panel,
   honesty-first in two stages: stage 1 displays the capture-time measured
   values each sim already computes, labeled with an explicit honesty note
   ("measured at last capture, not per-frame"); stage 2 (separate
   ratification) adds periodic live readback, which is new GPU readback
   code and therefore compute-adjacent.
5. `mode-toggle.ts` — Play/Study toggle: Study pauses stepping by the same
   suspension pattern `isCapturing()` already exercises (presentation-side
   RAF gating; no step-loop code modified), shows the diagnostics readout +
   current parameter values + the sim's gate line (mirroring its landing
   card).

**Migration order** (one sim per dispatch-sized cluster, each commit ≤500
lines): pilot on **strange-attractors** (smallest `main.ts`, 193 lines;
`new_canonical` gate; auto-orbit camera is the natural first cursor
surface) → **physarum** (most visual payoff; natural cursor-as-force =
attractant deposit, gated on D-P1.2(a)) → **boids-3d** → **mandelbulb** →
**rd-2d** → **ising** → **neural-ca** (carries the extra white-canvas
framing fix). Each migration touches only: the sim's `web/index.html`,
the presentation-safe `main.ts` regions tabulated in § 1.3 (re-anchored per
Convention M), and new `web/src/` presentation files. Compute kernels,
seeded init, `captureCanonical()` bodies, and `capture-export.ts` are not
edited; any preset/cursor uniform wiring lands only under a ratified
D-P1.2(a) and runs the full local validate for that sim before push.

## § 5 — Sequencing recommendation

**Landing-v2 first, then shared-chrome.** (1) Landing is zero-gate-exposure
and ships visible value in 2–3 docs-grade commits while (2) the D-P1.2
boundary rulings and the local-validate loop (D-P1.3) that shared-chrome
needs get ratified; (3) the preview-asset capture work for landing produces
the visual baseline screenshots that chrome migrations will be compared
against; (4) no dependency runs the other way — chrome never blocks on
landing. Interleaving buys nothing at this scale.

## § 6 — D-class decisions for Steven

- **D-P1.1 — Preview mechanism.** Static PNG poster (RECOMMENDED, § 3.2) vs
  committed looped webm (~2–4 MB repo weight, motion payoff). Costs are
  close enough that repo-weight tolerance is your call. Live canvases:
  recommend rejecting outright (lane violation by construction).
- **D-P1.2 — Lane-boundary classification rulings** (one ratification, three
  sub-items): (a) live-loop-only runtime uniform writes (presets,
  cursor-as-force) — RECOMMEND: allowed in Lane B with capture path pinned
  + full local validate per affected sim per push; (b) RAF-loop suspension
  for Study mode — RECOMMEND: allowed (identical pattern to the existing
  `isCapturing()` gate, no step-loop edit); (c) per-sim `web/src/render.wgsl`
  display shaders (never read by any gate) — RECOMMEND: Lane B-touchable
  under the charter's escape hatch: full validate + explicit callout
  commits, never slipped into styling commits.
- **D-P1.3 — Validation channel for Lane B pushes** (no CI browser matrix
  fires on main push, § 1.5): RECOMMEND: (i) mandatory local validate
  (`pipeline.py` build+drive+verify under `CHROME_BIN`) for every push
  touching `packages/**/web/**` or `common/common-web/**`, evidence quoted
  in the commit body; (ii) operator-dispatched `workflow_dispatch`
  (confirm_deploy=false) at each migration milestone for the CI-grade 7/7
  matrix. (ii) is operator-only by design, hence D-class.

## § 7 — Risk register

- **R-1 (gate contract).** Chrome v2 silently breaking the driver contract
  (`data-bp-panel`, `[data-bp="capture"]`, ready/captureReady globals)
  bricks all 7 validate drives. Mitigation: contract list in § 1.5 is
  normative; pilot sim validated locally before any further migration.
- **R-2 (validation gap).** No browser validation on main push (§ 1.5);
  a presentation regression could ship unvalidated to the next deploy.
  Mitigation: D-P1.3 local-validate discipline + operator matrix runs.
- **R-3 (blast radius).** common-web is source-bundled into all 7 sims;
  one bad shared edit breaks seven bundles at once. ts-strict on main push
  catches type errors only. Mitigation: additive files, per-sim migration
  order, pilot-first.
- **R-4 (Lane A adjacency).** Lane B commits live inside `packages/<sim>/web/`
  while `packages/` is Lane A surface for new sims; plus this session
  observed Lane A operating in the same local checkout (unpushed Lane A
  commit present at session time — see audit note). Mitigation: pull
  --rebase before every push; HARD-STOP on any conflict touching Lane A
  files; Lane B pushes only its own commits.
- **R-5 (capture pinning).** Preset/cursor uniforms leaking into capture
  state would shift gate results. Mitigation: D-P1.2(a) condition — capture
  re-derivation verified per sim during its migration + full local validate.
- **R-6 (asset weight / LFS).** Preview assets must stay plain-git small
  (no LFS dependency for the web tree). Mitigation: PNG budget ≤150 KB
  each; webm only if D-P1.1 chooses it, with stated total.
- **R-7 (font loading).** Landing uses runtime Google Fonts; sims adding
  the same would add a network dependency to validated bundles. Mitigation:
  self-host woff2 in common-web (§ 4.1); landing may keep or adopt
  self-hosting in L-2.

## § 8 — Commit SHAs (Convention #12 back-fill)

- Plan-proposal commit (this file): *(back-filled in follow-up commit)*
- Audit-note commit: *(back-filled in the same follow-up commit)*
