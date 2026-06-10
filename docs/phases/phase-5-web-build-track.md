<!-- integrity-allow: cat4.forward-reference; scoping note asserts forward-looking web-build paths that resolve as the track lands; n/a -->

# Phase 5 — Web-build track (scoping note)

> **Status: LANDED — superseded by execution (banner added 2026-06-10, post-phase-5
> housekeeping).** The track was dispatched and delivered 2026-06-09: 7/7 Stack-B
> frontends built and re-gated (charter + batch-1/2/3 landing audits under
> `docs/_audits/phase-5/web-build-track-*`), then validated through the browser by
> 5.1 web-deploy, closing 7/7 GREEN on CI lavapipe (phase-5 close audit § 3). The
> § 2 gap table below describes the PRE-track state (e.g. "Python-only / no WGSL"
> rows) and is retained as scoping history, not current reality.
>
> Original status line (historical): SCOPING — NAMED + QUEUED, not yet dispatched. This note exists so the
> web-build work is on the board with a known shape; it does NOT author any
> frontend, the 5.1 `web-deploy.yml` workflow, or any sub-phase build.
> **Authored at:** the Phase-5 reconciliation pass (`docs/_audits/phase-5/reconciliation-<UTC>.md`).
> **Spec anchor:** phase plan `docs/phases/phase-5-productization.md` § 6.1 (5.1 web-deploy);
> spec `docs/architecture.md` § 10.1 (settings panel) + § 11.6 (Phase 5 roadmap).
> **Operator decision (ratified):** the Stack-B web sims WILL be built. This note
> scopes that track; the build itself is a separate, later dispatch.

---

## 1. Why this note exists

Sub-phase 5.1 (`web-deploy`) is **BLOCKED — zero qualifying sims** (pre-dispatch
review § 2.3 / § 7 item 2; reconciliation pass Phase B). The § 6.1 qualifying gate
demands a **Vite (or equivalent) build that succeeds** + a capture-export hook + a
settings panel (spec § 10.1) + `productization.web != false`. **No `package.json`,
`vite.config.*`, or built web bundle exists anywhere under `packages/`** (FACT —
`find packages -name package.json -o -name 'vite.config.*'` = ∅; the only
`package.json` is the shared `common/common-ts/`). So every Stack-B sim fails the
gate, and 5.1 cannot validate a single frontend.

"Phase 5 does not patch sims" — 5.1's productization pipeline packages web builds
that already exist; it does not build them. The web builds are **upstream** of 5.1.
This note names that upstream work so it is queued, not silently dropped.

The 5.1 `web-deploy.yml` workflow is authored **inside sub-phase 5.1**, once real
web builds exist to validate. This note does NOT author it.

## 2. The 7 Stack-B sims and their current web surface (FACT, measured)

`web: true` after the reconciliation pass's § 13 backfill for the dual-stack sims;
the four pure-Stack-B sims already declared `web: true`.

| # | Sim | § 13 `web` | WGSL | TS entry | Current web surface | Gap to a qualifying web build |
|---|---|---|---|---|---|---|
| 1 | boids-3d | true | 0 | 0 | **Python-only** (`boids_3d/`) | FULL greenfield: WGSL compute/render + TS bundle + `package.json` + Vite + settings panel |
| 2 | physarum | true | 0 | 0 | **Python-only** (`physarum/`) | FULL greenfield (as above) |
| 3 | mandelbulb-explorer | true | 0 | 0 | **Python-only** (`mandelbulb_explorer/`) | FULL greenfield (closed-form ray-march WGSL) |
| 4 | strange-attractors | true | 0 | 0 | **Python-only** (`strange_attractors/`) | FULL greenfield (point-cloud WGSL) |
| 5 | reaction-diffusion-2d | true | 1 | 1 | `src/index.ts` + `src/gray_scott.wgsl` | PARTIAL: shader+entry exist; add `package.json` + Vite + WGSL bundling + settings panel + capture-export hook |
| 6 | neural-ca | true | 1 | 1 | `typescript/{index.ts, nca_inference.wgsl}` | PARTIAL (as RD-2D); inference reads the committed checkpoint |
| 7 | ising-classical | true | 1 | 1 | `src/index.ts` + `src/metropolis.wgsl` | PARTIAL (as RD-2D); parallel-Metropolis WGSL |

**Two cohorts:**
- **WGSL-seeded (3):** reaction-diffusion-2d, neural-ca, ising-classical — each ships
  one WGSL compute/inference shader + one TS entry already (the local-only Stack-B
  surface per spec § 7.8). They need the *bundle harness* around the existing shader.
- **Greenfield (4):** boids-3d, physarum, mandelbulb-explorer, strange-attractors —
  no WGSL, no TS; the entire web surface (shader + bundle + UI) is unwritten.

## 3. What a real web build needs (per sim)

Each qualifying web build must satisfy the § 6.1 gate. The per-sim deliverables:

1. **`package.json` + `vite.config.*`** (or equivalent) producing a build that
   succeeds (`vite build` exit 0) — the load-bearing § 6.1 gate.
2. **WGSL bundling.** The 3 WGSL sims bundle their existing `.wgsl` via a Vite WGSL
   import (`?raw` text import or a `vite-plugin-wgsl`-style loader); the 4 greenfield
   sims must first author the WGSL compute/render shader, then bundle it. Settle the
   bundling approach against `common/common-ts/` conventions at track-dispatch time
   (it already carries the shared TS toolchain: pnpm workspace, tsconfig.build,
   vitest, eslint — but no per-sim Vite app yet).
3. **Settings/controls panel** per spec § 10.1 (at minimum: tier, seed,
   capture-to-disk). Absent on all 7.
4. **Capture-export hook** — a browser-side path that re-emits the canonical capture
   descriptor so 5.1's bootstrap-verification (Playwright Chromium re-emit →
   `compare_captures`, per the reconciliation pass's R1 programmatic recipe) can
   round-trip the WebGPU output against the in-repo canonical `.h5`. Absent on all 7.
5. **WebGPU headless validation** — the build must initialize WebGPU in headless
   Chromium (spec § 6.1 anticipated problem: fall back to "page loads + error
   count = 0" only if headless WebGPU init fails; but the bootstrap gate is
   load-bearing per spec § 3.8, so a re-emit-capable path is preferred).

## 4. Sequencing (NOT dispatched here)

1. **This note** — name + queue the track. ✓ (Phase-5 reconciliation pass.)
2. **Web-build sub-phase(s)** — author the 7 web builds (shader where missing +
   bundle + settings panel + capture-export hook). Likely cohort-batched:
   WGSL-seeded 3 first (smaller gap), greenfield 4 second. Each build is validated
   by its own `vite build` + WebGPU smoke locally. **OUT of this reconciliation pass.**
3. **Sub-phase 5.1 (`web-deploy`)** — once ≥1 real web build exists, 5.1's agent
   authors `web-deploy.yml`, the `discover`/`build`/`validate` pipeline, and the
   Playwright Chromium bootstrap-verification, fanning out one job per qualifying
   web build. The § 6.1 "Vite build succeeds" gate then has something to validate.

Until step 2 lands at least one qualifying build, 5.1 stays BLOCKED (ship-as-
pipeline-only-with-all-deferred is the fallback the operator can elect, but the
ratified intent is to build the frontends first).

## 5. Open items for the web-build sub-phase (forward notes)

- **WGSL bundling approach** — pick the Vite WGSL loader and settle it once in
  `common/common-ts/` so all 7 share it (rule-of-three: 3 WGSL sims already qualify).
- **Settings-panel component** — a shared `common-ts` settings/controls component
  (tier/seed/capture) rather than 7 bespoke panels.
- **Capture-export parity** — the browser capture writer must match the Python
  `CaptureWriter` content-equivalent contract (spec § 2.5; `@bit-physics/common-ts`
  already freezes `Date.now` for the h5wasm write window per the determinism
  contract) so the 5.1 round-trip is bit-faithful.
- **neural-ca checkpoint** — the web inference path reads the LFS-tracked trained
  checkpoint; the bundle must fetch/embed it.
- **Hosting** — GitHub Pages (plan § 4.1/§ 4.2); a deploy concern for 5.1, not the
  build track.
