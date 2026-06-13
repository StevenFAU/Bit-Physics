---
date: 2026-06-13
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-audit
artifact_id: laneB-P7-dispatch-audit
dispatch: "P-7 (Lane B — deploy-assembly fix URGENT + motion loops ratified)"
verdict: LANDED
verdict-state: HARD-STOP-BEFORE-NEXT-DISPATCH
head_sha_at_start: 6ccdee9
parent_audits:
  - "[[laneB-P6-dispatch-audit-2026-06-13T00-55-00Z]]"
evidence_paths:
  - .github/workflows/web-deploy.yml
  - tools/productization/web-deploy/web/pages/check-links.mjs
  - tools/productization/web-deploy/web/pages/assets/make-loops.mjs
  - tools/productization/web-deploy/web/pages/assets/boids-3d.webm
  - tools/productization/web-deploy/web/pages/assets/physarum.webm
  - tools/productization/web-deploy/web/pages/assets/reaction-diffusion-2d.webm
  - tools/productization/web-deploy/web/pages/assets/strange-attractors.webm
  - tools/productization/web-deploy/web/pages/index.html
  - packages/strange-attractors/web/src/main.ts
---

# Lane B / P-7 dispatch audit — deploy-assembly fix + motion loops

> Append-only record for dispatch P-7 (build dispatch). Stage 1: the
> ratified scoped workflow touch fixing the live Assemble-site gap (deploy
> #11 shipped landing-v2 with missing assets/about) + the committed
> link-resolution checker. Stage 2: the ratified motion loops (P-6 sketch
> as proposed), with one supporting presentation commit making the
> strange-attractors trace-out real.

## § 1 — Work landed (commit chain, this dispatch)

1. `6aaa602` — web-deploy.yml Assemble-site copy list (THE ratified
   workflow touch; § 2) + pages/check-links.mjs.
2. `4485563` — strange-attractors boot trace-in (supporting presentation
   commit; § 4).
3. `a790a42` — motion-loop generator make-loops.mjs (encoder + pump
   cadence; § 5).
4. `cadf406` — four .webm loops under pages/assets/ + `*.webm binary`
   gitattribute (§ 5).
5. `148b63d` — landing-card wiring (video-with-poster, reduced-motion +
   lazy; § 6).
6. This audit + Convention #12 SHA back-fill (after push).

ZERO WGSL anywhere in the dispatch: `git diff --stat 6ccdee9..148b63d --
'*.wgsl'` is EMPTY.

## § 2 — Workflow touched: YES — one file, one commit, assemble-step copy list only (ratified § 0)

`git diff 6ccdee9..6aaa602 -- .github/workflows/web-deploy.yml` is ONE
hunk, +5 lines, all inside the `Assemble site` step's `run` block: 3
comment lines + `cp …/pages/about.html site/about.html` +
`cp -r …/pages/assets site/assets` (directory copy, so Stage 2's webm
loops and any future page asset ship with NO second workflow edit).
Discover/build/validate matrix, gate invocation, triggers, permissions,
confirm_deploy logic: untouched (the hunk context shows the surrounding
lines verbatim). No rebase conflict on `.github/workflows/` occurred at
any P-7 push. YAML parse re-verified post-edit. Pages assets carry no LFS
filter (`git check-attr filter` = unspecified), so the deploy job's
`lfs: false` checkout copies real bytes.

## § 3 — Link-resolution proof (local, since deploys are operator-only)

`tools/productization/web-deploy/web/pages/check-links.mjs` (committed
beside the page tooling) replicates the assemble step's copy commands into
a temp tree — sim bundles stand in from each package's built `web/dist` —
then resolves every `href`/`src`/`poster`/`data-src` attribute and every
CSS `url(...)` in every assembled .html/.css.

| Run | Tree | Result |
|---|---|---|
| Stage 1, FIXED copy list | replica | 94 internal refs, **ZERO missing** (/tmp/laneB-P7-linkcheck-s1.txt) |
| Stage 1, PRE-fix copy list (negative control) | old-style manual assembly | **15 missing** — about.html + 7 posters + 7 fonts: exactly the breakage live since deploy #11 (/tmp/laneB-P7-linkcheck-prefix.txt) |
| Stage 2 final re-run (dispatch § 2.4) | replica incl. loops + wiring | 98 internal refs (the 4 webms now counted), **ZERO missing** (/tmp/laneB-P7-linkcheck-s2.txt) |

## § 4 — Strange-attractors trace-in (SHIFT, supporting presentation commit `4485563`)

Measured at HEAD before building the loop: the page draws the FULL
integrated trajectory every frame (`pass.draw(nPoints)`); its only live
motion was the camera orbit — which the dispatch's own ratified razor
(motion IS the physics) classifies as non-physics. The ratification names
strange-attractors' motion as the trace-out, so the minimal presentation
affordance was added rather than demoting the sim to static: the point
COUNT ramps over the first 600 live frames (host-side `pass.draw(drawn)`),
revealing the attractor in integration order. Same buffer, same shader,
same uniform layout, ZERO WGSL, zero state writes; frame-indexed (hence
deterministic under the generator's RAF pump); re-armed on preset change
in Play; a frozen Study view keeps the full cloud; nothing read by the
capture path. Honesty note declares it ("presentation-side draw order —
the points revealed are the same already-integrated trajectory, nothing
re-integrates"). Verified visually at pumped frames 60/300/600
(/tmp/laneB-P7-sa-trace-f*.png: fall-in transient → half-built butterfly →
full attractor).

## § 5 — Motion loops (ratified params + budgets)

Generator `make-loops.mjs` (commit `a790a42`): make-posters.mjs discipline
verbatim — default seed 42, RAF wrapper pumped to a declared start frame,
one canvas screenshot every `gap` frames via the parked-RAF resume
mechanism, fixed-CRF single-threaded libvpx-vp9 encode (`-threads 1`, no
audio). ffmpeg is required by this script ONLY — grep-proof: zero ffmpeg
references in packages/, common/, or any gate/validate path (transcript in
the commit message; re-runnable). ZERO sim code, ZERO WGSL, zero
validate-path changes.

**Standing criterion (ratified, recorded per dispatch):** a sim earns a
loop iff the motion IS the physics — flock dynamics, network growth,
front propagation, trajectory trace-in. Camera-only motion (orbit/zoom)
stays a still. Motion: boids-3d, physarum, reaction-diffusion-2d,
strange-attractors. Static: ising-classical (flicker, no narrative),
neural-ca (growth ends), mandelbulb-explorer (static geometry).

Loop table (commit `cadf406`; budgets ratified ≤1.5 MB/sim, ≤10 MB page):

| Sim | Seed | Frames (start + shots×gap) | fps / CRF / px | Size | Content |
|---|---|---|---|---|---|
| boids-3d | 42 | 60 → 660 (300×2) | 30 / 46 / 512 | 1216 KB | murmuration under the P-6 auto-fit; loop wraps with a declared cut |
| physarum | 42 | 120 → 720 (300×2) | 30 / 46 / 512 | 136 KB | network coarsening; end frame ≈ the committed poster's composition |
| reaction-diffusion-2d | 42 | 400 → 2200 (300×6) | 30 / 46 / 512 | 344 KB | Gray-Scott front timelapse over the poster's full development range |
| strange-attractors | 42 | 1 → 601 (300×2) | 30 / 46 / 512 | 1372 KB | the trace-in drawing the attractor — loop restart IS the trace restart |

Total: **3068 KB** of the 10 MB page budget; every loop ≤1.5 MB. CRF was
measured, then declared: 38 produced 1779/2327 KB (boids/SA — over
budget), 46 landed all four within budget; the committed config carries 46.
Per-sim boost values are the photographic exposure class the posters
already use (boids 1.35 matching its P-6 poster; SA 1.9 matching its P-2
poster config). Loop content spot-verified by frame extraction
(/tmp/laneB-P7-loopframe-*.png), including physarum mid/end frames against
the committed poster.

## § 6 — Landing wiring (commit `148b63d`, measured behavior)

The four motion cards become `<video class="poster">` with the SAME poster
still in the `poster=` attribute — no-JS (and reduced-motion) renders
exactly the old card. One small inline script (the page's only JS,
sanctioned by the dispatch's enhancement terms): IntersectionObserver
attaches a loop's source only when its card scrolls into view, pauses it
off-screen, and never loads under `prefers-reduced-motion`. Muted, loop,
playsinline, preload=none.

Measured in headless Chromium (/tmp/laneB-P7-motioncheck.txt):
- normal: the 3 in-viewport loops attached, `videoWidth` 512, currentTime
  ADVANCING (2.96→4.46 s sampled 1.5 s apart); the below-fold
  strange-attractors card stayed UNATTACHED until scrolled;
- emulated `prefers-reduced-motion: reduce`: all four stayed unloaded
  stills (source unattached, paused, videoWidth 0).
- the only console error is the pre-existing favicon-404 exemption.

## § 7 — Validation evidence (D-P1.3: all 7 sims per push)

| Push | Stage | Result | Artifacts |
|---|---|---|---|
| `6aaa602` | 1 (assemble fix + checker) | PASS 7/7, 0 deferred | /tmp/laneB-P7-validate-s1 |
| `4485563` | 2a (trace-in) | PASS 7/7 | /tmp/laneB-P7-validate-s2a |
| `148b63d` (with `a790a42`, `cadf406`) | 2b–2d (generator, loops, wiring) | PASS 7/7 | /tmp/laneB-P7-validate-s2d |

Boids gate value bit-identical at `0.003185892651170974` throughout;
run-twice byte-identical everywhere; no tolerance touched. The
strange-attractors gate (new_canonical + run-twice + on-attractor
envelope) passed unchanged through the trace-in commit — the capture path
reads the trajectory buffer, not the draw count.

## § 8 — CI observations (S.5 sweeps) + SHIFTs

- S.5 sweep: `6aaa602` 37/37 green (including cpp-strict — the workflow
  touch ran clean); `4485563` 36/37 green with the SAME content-
  uncorrelated cpp-strict flake (pure TS diff; R-CPPB2 runner drift,
  continues P-3 § 7 → P-6 § 9); `148b63d` in flight at audit-write time,
  swept before the SHA back-fill push.
- **SHIFT (§ 4):** strange-attractors had no physics motion on its page;
  trace-in added as a supporting presentation commit instead of demoting
  the ratified loop to static. Display-only, declared, validated.
- **SHIFT (loop CRF):** 38 → 46 after measuring sizes against the ratified
  budget (§ 5) — measured, then declared, never widened in reverse.
- Stills-vs-loops consistency note: each loop's poster fallback is its own
  card still; physarum's loop END composition ≈ its poster frame, so the
  still→motion swap reads continuously.
- Lane boundary held: no compute kernel, step loop, seeded init,
  capture/gate path, tolerance or verify code modified; ZERO WGSL (§ 1);
  the one workflow touch is the ratified assemble-step copy list (§ 2).

## § 9 — Evidence + Convention #12 back-fill (after push)

- Stage commit SHAs recorded in § 1 (pushed before audit-write).
- `uv run --no-sync python -m integrity --all` at the audit tree:
  **0 HARD_FAIL, 26 SOFT_WARN** — identical set to the P-6 back-fill
  record (all pre-existing in phase-1/2/5 and Lane A c1-u* notes; none
  against this audit or the P-7 commits).
- p7_audit_commit_sha: *(back-filled below per Convention #12 — never `--amend`)*

p7_audit_commit_sha: bdf0e6f  # Convention #12 back-fill (§ 9)

Back-fill record: final S.5 sweep at back-fill time — `148b63d` 32/37
complete all green, 5 in flight; `bdf0e6f` (docs-only) queued. No completed
non-green check on either SHA beyond the cpp-strict flake already recorded
at `4485563` (§ 8).
