# web-deploy (Phase-5 sub-phase 5.1)

Build-and-validate pipeline for the 7 Stack-B WebGPU web frontends
(`packages/<sim>/web/`, built by the web-build track). For each sim it runs a
production Vite build, loads the bundle in **headless Chromium with WebGPU**, drives
the capture-export hook, and re-applies the sim's **own established gate** (from the
web-build track) to the **browser-emitted** capture — closing the browser-WebGPU
round-trip the web-build track deferred. NO tolerance is added or widened; the
`deploy` job is gated off (no GitHub Pages publish in Phase 5).

Full spec + go-live runbook: [`docs/productization/web-deploy.md`](../../../docs/productization/web-deploy.md).

- `pipeline.py` — discover / build / validate CLI (phase plan § 5.5).
- `verify.py` — per-sim gate applied to the browser-emitted capture (reuses the
  web-build track's thresholds; parity-guarded, no widening).
- `web/headless/driver.mjs` — Playwright browser-WebGPU capture driver (pinned).
- `web/embed/` — iframe embed template for the deployed site.
- `smoke/test_pipeline.py` — TDD harness.
