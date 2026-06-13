---
date: 2026-06-13
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-audit
artifact_id: laneB-P8-dispatch-audit
dispatch: "P-8 (Lane B — per-sim pages as publishable destinations)"
verdict: LANDED
verdict-state: HARD-STOP-BEFORE-NEXT-DISPATCH
head_sha_at_start: bc6a993
parent_audits:
  - "[[laneB-P7-dispatch-audit-2026-06-13T01-38-00Z]]"
evidence_paths:
  - tools/productization/web-deploy/web/pages/assets/favicon.svg
  - tools/productization/web-deploy/web/pages/index.html
  - tools/productization/web-deploy/web/pages/about.html
  - tools/productization/web-deploy/web/pages/check-links.mjs
  - common/common-web/src/panel-shell.ts
  - common/common-web/src/theme.css
  - packages/boids-3d/web/index.html
  - packages/boids-3d/web/public/favicon.svg
  - packages/boids-3d/web/src/main.ts
---

# Lane B / P-8 dispatch audit — per-sim pages as publishable destinations

> Append-only record for dispatch P-8 (presentation-only). Makes each
> `sims/<name>/` page a self-explaining, shareable exhibit: shared favicon,
> static per-sim head metadata (title/description/OG/Twitter), shared chrome
> nav (portfolio + about) and a visible physics caption, plus a link-checker
> extension that proves the assembled tree self-consistent. One ratified
> HARD-STOP (the favicon mechanism) with four ratified amendments, all below.

## § 1 — Work landed (commit chain, this dispatch)

1. `c7d1d43` — shared favicon SVG asset (new file; § 3).
2. `8414bf9` — wire favicon into landing + about heads (§ 3).
3. `f582b14` — per-sim favicon copies under `web/public/` (new files; § 4 SHIFT).
4. `0f74e5f` — per-sim head metadata: title/description/OG/Twitter/favicon (§ 5).
5. `548e3e5` — shared chrome nav chips + visible per-sim caption (§ 6).
6. `06ee8cb` — link-checker extension: social-card + nav + favicon byte-identity (§ 7).
7. This audit + Convention #12 SHA back-fill (separate commit, after push).

**ZERO WGSL, ZERO workflow touch** in the dispatch:
`git diff --stat bc6a993..06ee8cb -- '*.wgsl' .github/` is EMPTY. The favicon
rides the existing P-7 assemble copy (`cp -r pages/assets`, and per-sim
`cp -r <bundle>` for the bundled copies) — no new top-level asset, no
`.github/workflows/` edit. The validate driver / its `/favicon.ico` handler
(harness gate code) were NOT touched.

## § 2 — Lane boundary held

Presentation only: served-verbatim pages (`pages/*.html`, favicon asset), static
per-sim `<head>` markup, the shared common-web chrome (`panel-shell.ts` /
`theme.css`), per-sim `caption` wiring in `main.ts`, and the local link-checker.
No compute surface (WGSL, step loops, seeded init, capture/gate/tolerance code)
was touched. The v1 `data-bp` driver contract is frozen — all new chrome
elements use `data-bp2` (`nav`, `caption`); `[data-bp="capture"]` still mounts
and is clickable at boot (validate 7/7 confirms).

## § 3 — Favicon asset (D-P8.2)

`tools/productization/web-deploy/web/pages/assets/favicon.svg` — a single
particle on its orbit (house glyph for "physics", not a copy of any sim render);
`#36e0cf` accent on a transparent, dark-friendly field; deterministic static
bytes (sha256 `c436a2c812dbf299a5c345f11fac3237a9dfb3d6bd21028322a7e9e424c5b227`).
Wired relative into landing + about heads as `./assets/favicon.svg` (both served
at site root). Per-sim wiring is the SHIFT in § 4.

## § 4 — HARD-STOP + ratified amendments (favicon mechanism)

**Finding (measured, #8):** the dispatch-specified per-sim href
`../../assets/favicon.svg` (D-P8.4 / Stage 2) **fails validate 7/7**. Root cause:
the headless driver (`web/headless/driver.mjs`) serves each sim's `dist/`
**standalone at `/`**, so the browser resolves the link to `/assets/favicon.svg`,
which is absent from a per-sim dist (the shared `assets/` exists only in the
*assembled* deploy tree). Driver line 66 answers the browser's *automatic*
`/favicon.ico` with 204; line 126 filters only WebGPU-availability errors — so
the explicit favicon's 404 (a different path) HARD-FAILS the gate. The dispatch's
premise that the `<link>` "kills the 404 in validate" does not hold under the
standalone-serve harness. Measured evidence: with `../../assets/favicon.svg`,
all 7 sims returned `driver FAIL — console/page errors: Failed to load resource:
… 404`.

**HARD-STOP → ratified (Option 1 + 4 amendments).** Surfaced per HARD RULE 2 /
D-class "do not re-litigate"; Steven ratified the per-sim bundled copy and four
amendments (each a SHIFT, §0.3/#8 — HEAD's standalone-serve reality over dispatch
prose):

- **SHIFT-P8.1 (mechanism):** each sim bundles its own favicon at
  `packages/<sim>/web/public/favicon.svg` (vite copies `public/*` → `dist/` root),
  referenced `./favicon.svg`. Resolves in BOTH standalone validate (`/favicon.svg`)
  and the assembled deploy (`/sims/<sim>/favicon.svg`). Verified: boids driver
  exit 0 (no 404) in isolation, then 7/7 full validate.
- **SHIFT-P8.2 (byte-identity guard):** D-P8.2's intent (one consistent house
  favicon across the portfolio) preserved as *verified replication*, not literal
  single-file dedup. The canonical is `pages/assets/favicon.svg`; its exact bytes
  are copied into each `web/public/`. All 8 copies (1 canonical + 7 per-sim) are
  sha256-identical (`c436a2c8…`); the Stage-4 link-checker asserts cross-copy
  identity to catch future drift.
- **SHIFT-P8.3 (hrefs):** sim pages use `./favicon.svg`; landing + about stay
  `./assets/favicon.svg`. D-P8.2 / D-P8.4 updated accordingly.
- **SHIFT-P8.4 (corrected understanding — "exemption retirable" flag DROPPED):**
  driver line 66's `/favicon.ico` → 204 is legitimate behavior (answering the
  browser's automatic request), NOT an error-swallowing allowlist. There is
  nothing to retire; line 66 / line 126 are gate code and were NOT touched. Stage 4
  simply confirms validate 7/7 passes with the explicit favicon present and no 404.

## § 5 — Per-sim head metadata (D-P8.3, Stage 2)

Static, crawler-visible `<head>` per sim. `<title>` unchanged (already
`<Name> — Bit-Physics`, distinct per sim). `description` = `og:description` =
`twitter:description` = the one-line physics caption; `og:title`/`twitter:title`
mirror `<title>`; `og:type=website`; `twitter:card=summary_large_image`.

**Caption source (grep-verified, not paraphrased).** Extracted from the landing
card `.phys` copy:
`grep -oP '(?<=class="phys">).*?(?=</div>)'` per card in
`tools/productization/web-deploy/web/pages/index.html`, whitespace-normalized.
Presentational entities decoded for meta values (`&rsquo;`→’, `&nbsp;`→ space);
words/punctuation unchanged.

| sim | `<title>` | description (grep-sourced landing `.phys`) | og:url | og:image |
|---|---|---|---|---|
| boids-3d | Boids 3D — Bit-Physics | A murmuration from three local rules — separation, alignment, cohesion. No leader, no plan; the flock is the physics. | …/sims/boids-3d/ | …/assets/boids-3d.png |
| physarum | Physarum Transport Network — Bit-Physics | A million blind agents deposit and follow chemical trails — an efficient transport network emerges, with order-independent atomics conserving every unit of mass. | …/sims/physarum/ | …/assets/physarum.png |
| reaction-diffusion-2d | Gray-Scott Reaction-Diffusion 2D — Bit-Physics | Two chemicals feed, react, and diffuse — Turing’s recipe for pattern: spots, stripes, and living labyrinths from one PDE. | …/sims/reaction-diffusion-2d/ | …/assets/reaction-diffusion-2d.png |
| neural-ca | Growing Neural CA — Bit-Physics | A cellular automaton whose update rule is a trained neural network: one seed cell grows into a stable organism. One checkpoint, bit-exact in the browser. | …/sims/neural-ca/ | …/assets/neural-ca.png |
| ising-classical | 2D Ising — Metropolis — Bit-Physics | Lattice spins at T = 2.27 — the critical point, where fluctuations live at every scale. Checkerboard Monte Carlo, statistics verified against a CPU ensemble. | …/sims/ising-classical/ | …/assets/ising-classical.png |
| mandelbulb-explorer | Mandelbulb Explorer — Bit-Physics | The 3-D cousin of the Mandelbrot set, sphere-traced in real time by a distance-estimator ray march — infinite detail from one formula. | …/sims/mandelbulb-explorer/ | …/assets/mandelbulb-explorer.png |
| strange-attractors | Lorenz Strange Attractor — Bit-Physics | Three coupled equations, RK4-integrated into the butterfly that started chaos theory — deterministic, never repeating, forever on the attractor. | …/sims/strange-attractors/ | …/assets/strange-attractors.png |

`og:url`/`og:image` columns abbreviate the base. **Confirmed Pages base:**
`https://stevenfau.github.io/Bit-Physics` (og:url = base + `/sims/<name>/`,
og:image = base + `/assets/<sim>.png`). Absolute per D-P8.4 — social scrapers
fetch them off the live deploy; the standalone harness never requests them, so
they do not 404 the gate. **Source (not memory):** observed live, HTTP 200, in
`docs/_audits/phase-5/post-close-housekeeping-and-pages-launch-2026-06-10.md:200`
("Live site: https://stevenfau.github.io/Bit-Physics/ — index HTTP 200");
corroborated by `docs/phases/phase-5-productization.md:189` and
`.github/workflows/binary-release.yml:196`. (vite confirmed to pass absolute
`content=` URLs and the relative `./favicon.svg` href through verbatim — `meta`
content is not an asset attribute, and `build` exit 0.)

## § 6 — Shared chrome nav + visible caption (Stage 3)

One edit in `common-web/panel-shell.ts`, all 7 inherit (P-6 landing-nav pattern):
- Universal top nav (`<nav data-bp2="nav">`): a back-to-portfolio chip
  (`href="../../"`) and an about chip (`href="../../about.html"`), relative so
  they resolve under the Pages subpath from `/sims/<sim>/`; same chip idiom as the
  landing nav (house-styled in `theme.css` `.bps-nav`).
- New `caption?` option (`<p data-bp2="caption">`): renders the one-line physics
  caption under the title as the page's visible per-sim identity — the SAME
  grep-sourced landing copy as the head (consistent across card / head / page,
  per Stage 3.2). `theme.css` `.bps-caption`. Each `main.ts` passes its caption.

DOM verified on a built bundle (boids): nav links render `← portfolio` →`../../`
and `about` →`../../about.html`; caption renders the murmuration copy verbatim;
title "Boids 3D". All 7 `tsc --noEmit` clean (panel-shell.ts is covered
transitively by the per-sim strict build; ts-strict.yml typechecks common-ts).

## § 7 — Link-checker extension + zero-missing (Stage 4)

`check-links.mjs` extended (the REPLICA block unchanged — favicon rides the
existing copy commands):
- **Social cards:** og:url / og:image / twitter:image content. Absolute
  Pages-base URLs map back into the tree (`https://…/Bit-Physics/<path>` →
  `<tree>/<path>`) and must resolve (sims/<name>/ → index.html; assets/<sim>.png
  → file); relative refs resolve normally; truly-external absolutes skipped.
- **Chrome nav:** the nav hrefs are runtime-injected (bundled JS, not static
  HTML) — confirm each literal (`"../../"`, `"../../about.html"`) is present in
  the sim bundle AND resolves from the sim page location.
- **Favicon byte-identity:** all 8 deployed copies (assets/ + 7 sims/<name>/)
  asserted sha256-identical.

Result over the full assembled tree (landing + about + 7 bundles):
**142 internal refs (was 100), zero missing**, favicon identity OK
(`c436a2c8…`), exit 0. Increase = 7 per-sim favicon hrefs + 21 og/twitter meta
(3 × 7) + 14 nav (2 × 7). **Negative control:** a corrupted favicon byte and a
missing `og:image` target both fail the checker (exit 1) — the guards have teeth.

## § 8 — Favicon-404-gone evidence

The HEAD validate transcript (full 7-sim, D-P1.3) contains **no `favicon`
reference, no `404`, and no `console/page errors` line** in any driver log
(`grep -in 'favicon\|404\|console/page errors'` → none), overall `pass` 7/7. The
explicit favicon now RESOLVES in validate (`/favicon.svg` ← per-sim
`dist/favicon.svg`). Per SHIFT-P8.4 there is no "exemption to retire": the
line-66 204 is legitimate and untouched.

## § 9 — Validate evidence (D-P1.3)

Full 7-sim local validate (`CHROME_BIN=/snap/bin/chromium … pipeline.py
validate`) GREEN 7/7 at each web-touching push:
- Stage 1 (favicon + landing/about): 7/7 pass.
- Stage 2 (per-sim metadata + favicon fix): 7/7 pass, zero 404 (after the
  ratified mechanism; the dispatch-specified href measured 7/7 FAIL first).
- Stage 3 (chrome nav + caption): 7/7 pass, behaviorally identical aside from the
  additive nav/caption, zero 404.
Link-checker: zero missing (142 refs) + favicon byte-identity OK.

## § 10 — SHIFTs (Convention #8)

- **SHIFT-P8.1** favicon mechanism: `../../assets/favicon.svg` → per-sim
  `web/public/favicon.svg` + `./favicon.svg` (standalone-serve reality).
- **SHIFT-P8.2** D-P8.2 reframed: single canonical + verified byte-identical
  replication (8 copies, sha256-asserted) rather than literal single-file dedup.
- **SHIFT-P8.3** hrefs: sims `./favicon.svg`; landing/about `./assets/favicon.svg`.
- **SHIFT-P8.4** "exemption retirable" flag DROPPED — line-66 204 is legitimate
  browser-auto-request handling, not an allowlist; nothing to retire, nothing
  touched.

## § 11 — STOP / report (next-arc recommendation)

Assembled tree self-consistent (142 refs, zero missing, favicon identity OK); the
favicon 404 is gone from validate. Metadata table in § 5. Single next-arc
recommendation: **P-9 = an OG-card visual pass** — the one remaining gap is that
the shared social card is each sim's square poster (D-P8.1, accepted as
acceptable-not-render-tested). Now that the pages are self-describing, the next
highest-leverage polish is generating proper 1200×630 OG renders (extend the
existing poster generator's RAF-pump discipline; landscape framing per sim) so a
shared link previews as a designed card rather than a cropped square — closing the
"shareable destination" loop visually. Single recommendation, not a menu.
