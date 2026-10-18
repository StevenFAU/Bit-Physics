# Bit-Physics — agent notes

GPU physics and emergence simulations. Each sim has a Python/f64 reference with
committed goldens, plus (for 22 of them) a WebGPU browser frontend whose output is
re-verified against that reference in headless Chromium before it is published to
GitHub Pages. The verification story is the point of the project: tolerances are
**measured, then declared — never widened** to make a gate pass, and the audit ledger
under `docs/_audits/` is append-only.

## Where things live

- `packages/<sim>/` — reference implementation, tests, goldens; `packages/<sim>/web/` is
  the Vite + TypeScript + WGSL frontend (one npm package per sim, no root workspace yet).
- `common/common-web/src/` — shared browser chrome: `panel-shell.ts` (the control panel
  every sim mounts), `theme.css` (house tokens), `webgpu-fallback.ts`, capture export.
- `common/common-ts/` — WebGPU device/pipeline helpers (Node-strict CI surface, no DOM).
- `tools/productization/web-deploy/` — `sims.json` (the registry of published sims),
  `pipeline.py` (discover/build/validate), `verify.py` (per-sim gates), `web/pages/`
  (landing, about, splash, poster/loop generators).
- `docs/sim-specs/` — per-sim research specs. `docs/planning/rebuild-v2/` — the
  ground-up rebuild plan for 12 sims and the shared foundation they need.
- `docs/architecture.md` Appendix E — the full agent playbook (friction patterns A–O).

## Commands

- Python: always `uv run --no-sync …`. A bare `uv sync` (or one scoped to a member)
  strips the shared venv; restore with `uv sync --all-packages --all-extras`.
- A sim's frontend: in `packages/<sim>/web`, `npm ci`, `npx tsc --noEmit`, `npm run build`.
- `common/common-ts` uses pnpm 10, not npm (no package-lock):
  `npx -y pnpm@10 install --frozen-lockfile`, then `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm eslint .`.
- Sim registry drift: `python3 tools/productization/web-deploy/check_registry.py`.
- Integrity (CI scans every text file): `cd tools/integrity && uv run python -m integrity --all`.
- Local browser validate / posters / loops need WebGPU Chromium:
  `CHROME_BIN=/snap/bin/chromium`, a `DISPLAY`, and `uv run --no-sync`. The in-app
  preview browser has no WebGPU here (useful only for checking the no-WebGPU screen).
- C++: local cmake 4.x needs `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`; tests via
  `ctest --test-dir build/cpp`.

## Adding a published sim

1. Add it to `tools/productization/web-deploy/sims.json` first.
2. `pipeline.py` `GATE_KIND` entry + its gate in `verify.py`.
3. `main.ts` must contain `createSettingsPanel` and `exposeCapture` (discovery greps them).
4. Landing card in `web/pages/index.html` (a looping `<video>`), plus entries in
   `assets/make-posters.mjs` and `assets/make-loops.mjs`; commit `<sim>.png` + `<sim>.webm`
   plain, not LFS (≤1.5 MB per loop).
5. A splash-reel clip in `assets/make-splash.mjs`, or `"splash": false` with a note.
6. `check_registry.py` must pass; it runs in the web-deploy `discover` job.

## Traps

- `path:line` citations in docs must use the full path from the repo root (pre-commit
  Cat 4 checks `docs/` + README; CI Cat 1 checks every text file).
- Never `git add -A`: untracked drafts live in the tree. Stage paths explicitly.
- Commits are Conventional Commits (pre-commit hook). `end-of-file-fixer` edits JSON,
  which changes the sha of committed canonicals — re-pin after it runs.
- WGSL builtin `sin`/`cos`/`exp` are only ~2⁻¹¹ accurate on some Vulkan drivers
  (lavapipe): gated shaders use polynomial trig or f64-precomputed tables.
- The headless driver clicks `[data-bp="capture"]` in the boot state at 1280×720 —
  never hide it behind a mode, fold, or collapsed panel at that size.
- Push over SSH (`origin` is `git@github.com:…`); `gh` lacks the `workflow` scope.
