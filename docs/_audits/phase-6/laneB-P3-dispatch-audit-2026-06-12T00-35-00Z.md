---
date: 2026-06-12
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-audit
artifact_id: laneB-P3-dispatch-audit
dispatch: "P-3 (Lane B — shared-chrome pilot: strange-attractors)"
verdict: LANDED
verdict-state: HARD-STOP-BEFORE-P-4
head_sha_at_start: 57655ca8c7c33f070c1a2d35ea6e703c3a19c02b
parent_audits:
  - "[[laneB-P2-dispatch-audit-2026-06-11T18-55-00Z]]"
related:
  - "[[laneB-P1-presentation-plan]]"
evidence_paths:
  - common/common-web/src/theme.css
  - common/common-web/src/panel-shell.ts
  - common/common-web/fonts/README.md
  - packages/strange-attractors/web/src/main.ts
  - packages/strange-attractors/web/index.html
  - tools/productization/web-deploy/web/pages/index.html
---

# Lane B / P-3 dispatch audit — shared-chrome pilot (strange-attractors)

> Append-only record for dispatch P-3 (build dispatch). Stage 1 stood up the
> common-web chrome (theme + panel shell + self-hosted fonts); Stages 2–5
> migrated strange-attractors end to end (theme/shell, Play/Study,
> cursor-as-camera, named presets). The pilot ratifies the chrome pattern the
> remaining six migrations follow.

## § 1 — Chrome contract (the surface the six migrations build against)

Pair: `common/common-web/src/theme.css` + `common/common-web/src/panel-shell.ts`
(each carries a header block documenting its public surface; theme commit
`83642ce`, shell commit `2a7a9a2`).

- **Tokens** — house-style.md § 1 canonical set verbatim on `:root` (default);
  § 2 phosphor set verbatim behind `<html data-bp-theme="phosphor">`, plus a
  consumption-token remap (`--txt`→`--ink` etc.) so opting in restyles the
  chrome without per-component forks.
- **Fonts** — self-hosted IBM Plex Mono 300/400/500/600 + Plex Sans Condensed
  500/600/700, latin-subset woff2 in `common/common-web/fonts/` (OFL 1.1
  committed alongside); `@font-face` in theme.css; per-sim Vite builds bundle
  the used weights as hashed assets. No Google Fonts runtime fetch anywhere
  in-tree (landing page migrated too, § 3.4).
- **Page classes** — body gets `--bg/--txt/--mono` base on import;
  `.bps-stage` (canvas centering), `.bps-canvas` (treatment + Study dim),
  `.bps-boot` (boot line). Sims keep a 2-line inline pre-bundle paint guard in
  index.html (FOUC).
- **Panel API** — `createSettingsPanel(title, options)` from `panel-shell.ts`
  (factory name unchanged: web-deploy discovery greps main.ts for that
  literal). v1 options/handle preserved exactly: `initial/tiers/onCapture/
  onChange/extra` → `getState/setStatus/setCaptureEnabled`. v2 additive slots,
  absent option ⇒ absent DOM: `presets` (chips, live-loop only per D-P1.2(a)),
  `modes` (Play/Study, `onMode` after change, not for initial), `study`
  (diagnostics rows + honesty note + gate/verdict line + repo links), and
  `addGroup(label)`; v2 methods `getMode/setMode/setDiagnostics/setVerdict/
  setActivePreset`.
- **Attribute namespaces** — v1 driver contract VERBATIM and frozen:
  `data-bp-panel`, `data-bp="tier"|"seed"|"capture"|"status"`. The capture
  button is always present/clickable in the boot state. All new chrome
  elements use `data-bp2="…"` (`mode-play|mode-study`, `preset:<label>`,
  `diagnostics`, `honesty`, `verdict`, `links`, `study`, `group:<label>`);
  body/panel carry `data-bp2-mode="play|study"`.
- **Migration recipe (measured on the pilot)** — (1) import theme.css + swap
  the panel import to panel-shell.js (same factory name); (2) index.html →
  `.bps-*` classes + paint guard; (3) wire `modes` with sim-side step/RAF
  suspension + `study` block with measured diagnostics; (4) pointer
  interaction as live-uniform writes; (5) presets as live-loop-only state.
  Validate all 7 per push.

## § 2 — Driver-contract call-site verification (measured at HEAD 57655ca)

Grep evidence (`/tmp/laneB-P3-contract-grep.txt`, re-runnable):

- Producers: `common/common-web/src/settings-panel.ts:83` (and :95/:117/:133/
  :144 — sole `data-bp` producer at HEAD; panel-shell.ts now produces the
  identical set).
- Consumers: `tools/productization/web-deploy/web/headless/driver.mjs:110`
  (`[data-bp-panel]` mount) and :118 (click `[data-bp="capture"]`);
  `tools/productization/web-build/headless/smoke.mjs:81`;
  `tools/productization/web-deploy/web/pages/assets/make-posters.mjs:106`;
  `tools/productization/web-deploy/pipeline.py:96` (§ 6.1 discovery greps
  main.ts for the literals `createSettingsPanel` + `exposeCapture`).
- Window globals unchanged: `__bitPhysicsReady` (7/7 sims),
  `__bitPhysicsCapture(Ready)` (capture-export.ts).
- 7/7 sims call `createSettingsPanel` at HEAD; after the pilot, six still
  import `settings-panel.js` (byte-identical behavior), strange-attractors
  imports `panel-shell.js`.

## § 3 — Work landed (commit chain, this dispatch)

1. `595557b` — self-hosted IBM Plex woff2 (7 latin subsets, 124 KB, OFL 1.1).
2. `83642ce` — theme.css (contract pair 1/2).
3. `2a7a9a2` — panel-shell.ts v2 (contract pair 2/2).
4. `72572ad` — landing page font self-host swap (Google Fonts runtime
   dependency killed; page keeps its own copy under `pages/assets/fonts/`,
   served verbatim with no build step).
5. `86be839` — Stage 2: strange-attractors on theme + shell (styling/structure
   only).
6. `747f0ed` — Stage 3: Play/Study toggle (D-P1.2(b) RAF suspension; measured
   diagnostics via the capture readback; honesty note; gate/verdict line; spec
   + ledger links).
7. `744497f` — Stage 4: cursor-as-camera (EXPLICIT D-P1.2(a) call-out;
   drag-to-orbit on the existing render-uniform angle slot; auto-orbit resumes
   after 4 s idle; Study drag one-shot-renders the frozen cloud).
8. `a862b72` — Stage 5: named-regime presets (EXPLICIT D-P1.2(a) call-out;
   live trajectory buffer; capture pinned; four measured regimes).
9. This audit note + Convention #12 SHA back-fill (after push).

## § 4 — Validation evidence (D-P1.3: all 7 sims per push)

Local `pipeline.py validate` under `CHROME_BIN` (snap Chromium, real
browser-WebGPU adapter), full 7-sim matrix before EVERY push:

| Stage | Result | Artifacts | strange time-to-ready ms |
|---|---|---|---|
| 1 (chrome) | PASS 7/7, 0 deferred, 0 fail | /tmp/laneB-P3-validate-stage1 | [17, 17] |
| 2 (migrate) | PASS 7/7 | /tmp/laneB-P3-validate-stage2 | [69, 44] |
| 3 (Play/Study) | PASS 7/7 | /tmp/laneB-P3-validate-stage3 | [87, 52] |
| 4 (cursor) | PASS 7/7 | /tmp/laneB-P3-validate-stage4 | [79, 84] |
| 5 (presets) | PASS 7/7 | /tmp/laneB-P3-validate-stage5 | [102, 37] |

strange-attractors gate held at every stage: `run_twice_identical: true`,
`on_attractor_envelope_ok: true`, `worst_envelope_overshoot: 0.0`; no
tolerance touched anywhere. The other six sims stayed behavior-identical
(their bundles re-validated green at every stage; no source touched).

Measured interaction checks (headless, throwaway harness, Stages 4–5): drag
rotates / auto-orbit holds during the idle window (static frames byte-equal) /
auto-orbit resumes after idle / Study frozen (no drift) / Study drag
re-renders — 5/5, no console or page errors.

## § 5 — Capture-path-untouched proof (Stages 4–5)

At the Stage-5 tree (`a862b72`), `packages/strange-attractors/web/src/main.ts`:

- Capture path = `readTrajectory()` (lines 163–165, reads ONLY the canonical
  `traj` buffer) + `captureCanonical()` (lines 167–200). Grep over that span
  for `liveTraj|liveParamBuf|dragPointer|lastPointerMs|angle|renderUniform`:
  **0 occurrences** (`/tmp/laneB-P3-capture-pin-grep.txt`).
- `liveTraj`/`liveParamBuf` consumers: buffer setup (118–144, incl. boot copy
  traj→liveTraj), render bind group (144), `applyRegime` (276–304). Disjoint
  from the capture path by construction.
- The canonical trajectory is computed ONCE at boot from the pinned params and
  never re-written; the headless driver never touches presets/modes/pointer —
  and even if a user does, capture still reads the canonical buffer.
- Stage 4 writes only the render-uniform `angle` slot the auto-orbit already
  wrote (display camera).

## § 6 — Preset regimes: honest names, measured distinctness (D-P1.2(a))

Ratified in the dispatch: presets included in the pilot. All regimes run the
SAME committed `lorenz_rk4.wgsl` with σ=10, β=8/3, dt=0.01, 10 000 steps,
seed-42 jittered IC; only σ/ρ/β uniforms differ. Names are the standard
dynamical-systems descriptions of the parameter ranges:

| Preset | ρ | Measured behavior (host f32 sweep ⇄ GPU readback agree) |
|---|---|---|
| classic | 28 | chaotic butterfly; x[−18.1,19.6] y[−24.3,27.2] z[1.0,47.8]; tail σ≈8–9 |
| stable spiral | 15 | below ρ≈24.74: spirals into a fixed point; tail σ=0; z≤23.3 |
| periodic window | 99.65 | known periodic window: closed ribbon; z[1.0,186.4] |
| limit cycle | 350 | single giant stable loop; y[−298.3,326.3], z≤668.3 |

Distinctness measured twice: numerically (bbox/tail-variance/sign-flip
counts, host f32 RK4 sweep; GPU Study diagnostics reproduce the same bboxes
to displayed precision) and visually (four Study screenshots,
`/tmp/laneB-P3-preset-*.png` — butterfly / collapsing spiral / closed ribbon
/ single loop). Non-classic regimes are auto-framed for display (host-side
bbox→classic-frame map; render.wgsl framing is fixed and WGSL was off-limits
this dispatch); the framing is declared in the in-app honesty note, and
diagnostics always show raw un-framed values.

## § 7 — WGSL touched / CI observations / SHIFTs

- **WGSL touched: NO** (expected NO this dispatch) — `git diff --stat
  57655ca..a862b72 -- '*.wgsl'` is empty. boids' point-size fix stays queued
  for its own migration under D-P1.2(c).
- **CI observation (cross-lane, operator attention):** `cpp-strict` failed at
  the Stage-1 and Stage-2 pushes (`72572ad`, `86be839` — runs 27385790799,
  ~00:13–00:25 UTC) and was green again at `747f0ed`/`744497f` unchanged-C++.
  Both red diffs contain zero C++/CMake/WGSL content (fonts, CSS, TS, HTML
  only); the parent `57655ca` was green at 22:54 UTC. Matches the banked
  R-CPPB2 failure mode pre-declared in the workflow header (exact-digest
  ctests vs runner Mesa/LLVM build variance), not a Lane B regression. Logs
  are admin-only; not diagnosable further from this lane. All other workflows
  green at every pushed SHA (S.5 sweeps each push).
- **SHIFT (minor, scope):** "kill the Google Fonts runtime dependency"
  executed as chrome self-hosting AND the landing-page swap (the only in-tree
  runtime fetch). The landing page keeps its own woff2 copy (it is served
  verbatim, no build step); source of truth is `common/common-web/fonts/`.
- **SHIFT (minor, typography):** latin-only subsets committed (presentation
  copy is English); full character sets not vendored.
- **SHIFT (minor, defect caught by measurement):** Study-entry diagnostics
  readback could resolve AFTER a preset's own measurement and overwrite it
  with stale canonical ranges (seen in the first preset screenshots); fixed
  with a sequence token before commit (`a862b72`). Lesson for the six
  migrations: measured-diagnostics paths need supersession guards when two
  async sources write one readout.
- **SHIFT (note, posters):** P-2 posters remain valid — boot behavior
  (auto-orbit from frame 0, canonical trajectory) is unchanged at the frames
  photographed; make-posters.mjs keeps working against `[data-bp-panel]`.
- Lane boundary held: no compute kernel, step loop, seeded init, capture/gate
  path, tolerance or verify code modified anywhere in the dispatch.

## § 8 — Evidence + Convention #12 back-fill (after push)

- Stage commit SHAs recorded in § 3 (already pushed at audit-write time).
- p3_audit_commit_sha: *(back-filled below per Convention #12 — never `--amend`)*

p3_audit_commit_sha: 8352aa2  # Convention #12 back-fill (§ 8)

## § 9 — Correction entry (same dispatch, post-push)

1. **Citation-path fix (integrity HARD_FAIL, cat1/cat4).** The § 2 grep
   evidence as first committed (`8352aa2`) abbreviated four tool paths
   (`web-deploy/…`, `web-build/…`); the integrity checker correctly
   HARD_FAILed three of them as unresolvable at HEAD (the fourth escaped
   parsing only because it line-wrapped). § 2 now carries the full
   `tools/productization/…` paths, and the front-matter `evidence_paths`
   directory entries (cat5 SOFT_WARN) now point at tracked files. This file
   is net-new this dispatch (not present at the last phase tag), so the
   in-place fix does not breach the append-only invariant the
   `audit-append-only` workflow enforces; this entry records the correction
   instead of silently rewriting it. Lesson banked for Lane B audits:
   citations are checker-parsed — always repo-root-relative, never
   abbreviated, never line-wrapped mid-path.
2. **cpp-strict recurrence.** The § 7 CI observation also applies to the
   Stage-5 push (`a862b72`, zero C++ in the diff): same red-on-runner-drift
   signature, again green on neighboring SHAs. Standing pattern for the
   operator, not a Lane B regression.
