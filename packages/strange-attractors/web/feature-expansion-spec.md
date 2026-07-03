# Spec — Strange-Attractors Expansion (Lorenz demo → attractor instrument)

> **Sim:** `strange-attractors` (`closed-form`)
> **Surface:** primarily the Stack-B WebGPU demo `packages/strange-attractors/web/`; § 3.3 also touches the Python package, `docs/sim-specs/`, `tools/testkit/golden/`, `captures/`, and `packages/strange-attractors/src/`.
> **Lane:** Phase-6 — **mixed.** §§ 3.1/3.2/3.4 are Lane B (presentation polish). § 3.3 (new attractor families) **crosses the Lane-B boundary** and runs as ratified expansion work (`docs/phases/phase-6-charter.md` § 3.1, § 3, v2-amendment items 1–2).
> **Extends:** [`verification-demo-spec.md`](./verification-demo-spec.md) (the four-layer INTERACT/EXPLAIN/PROVE/RENDER instrument this builds on).
> **Spec anchors:** `docs/architecture.md` § 1.2 (four identities), § 10.1 (web demos), § 2.5 (determinism), § 2.6 (measured-then-declared tolerances); `docs/sim-specs/closed-form/strange-attractors/spec-ref.md` § 1 (chartered attractor family).
> **Status:** v0.1 — DRAFT for operator review. Nothing built yet. FACT/INFERENCE-tagged per IC-9.
> v0.1 (2026-07-03): citation audit against the repo (all file:line claims verified); Pickover
> decision reframed against the banked `algebraic.md` § 6 continuous form; charter-scope
> amendment called out for Clusters B/C; `algebraic.md` + spec-ref maintenance and the
> `System` protocol added to the § 3.3 checklist. Change log in § 10.

---

## 1. Purpose

Grow the Lorenz demo from a single-system instrument into a **strange-attractor
instrument**: more ways to *see* the dynamics (colormaps, color-by modes,
projections), more ways to *understand* them (return map, Poincaré section, live
Lyapunov readout, bifurcation diagram), and — under the project's full
verification discipline — more *systems* to explore (Rössler, Aizawa, Sprott-A,
… ). Every addition serves at least one of the project's four identities
(`docs/architecture.md` § 1.2); features that serve none are out of scope.

The demo is the **reference template the other six web demos adopt**
(`verification-demo-spec.md` § 1), so shared facilities introduced here
(colormap module, color-by driver, attractor registry) must be built as clean,
reusable `common-web` surfaces — not one-off hacks.

## 2. Governance posture & lane map (read first)

**FACT (charter, `docs/phases/phase-6-charter.md:135`).** Lane B MUST NOT change
compute kernels: *WGSL shaders, step loops, seeded init, capture/gate paths,
tolerance or verify code*. If a task requires any of those, the agent
**HARD-STOPs to the operator**; if ratified, the change runs the FULL validate
gate and is called out explicitly in the report and audit.

**FACT (`verification-demo-spec.md` § 6).** `packages/strange-attractors/web/src/render.wgsl`
is carved out as *in-lane presentation*: it reads trajectory buffers read-only,
the gate consumes buffer readbacks (never pixels,
`tools/productization/web-deploy/verify.py:423`), so render-side changes cannot
perturb the gate.

This splits the work cleanly:

| Bucket | Surface | Lane | Ratification |
|---|---|---|---|
| **§ 3.1** Colormaps & render | `render.wgsl`, `main.ts`, new `common-web/src/colormap.ts` | Lane B | none |
| **§ 3.2** Pedagogical instruments | `main.ts` + CPU readback; bifurcation re-dispatches the **committed** Lorenz kernel (PROVE precedent) | Lane B | none |
| **§ 3.3** New attractor families | new NumPy reference + golden tables + captures + gates + **new display WGSL** | **crosses boundary** | **operator HARD-STOP → ratify → full validate gate, per system** |
| **§ 3.4** Interaction & camera | `main.ts`, `render.wgsl` uniforms | Lane B | none |

**INFERENCE (sequencing rule).** Build §§ 3.1/3.2/3.4 first as a self-contained
Lane-B cluster (no ratification, ships on `main` as polish). Then run § 3.3 as
one ratified expansion cluster *per attractor*, isolated so the boundary-crossing
kernel work is never "slipped into a styling commit" (charter § 3.1). The demo's
buffer separation (`traj` = capture-only; `liveTraj`/`ghostTraj` = display-only,
`main.ts:133`, `main.ts:189-196`) is preserved unchanged throughout.

---

## 3. Feature specifications

### 3.1 Colormaps & render (Lane B)

**FACT (baseline).** Color is hardcoded in `render.wgsl` `palette()`: a 4-stop
cool ramp (`render.wgsl:82-84`) + a warm ghost ramp (`render.wgsl:86-88`),
driven by log-compressed local speed (`speed_t`, `render.wgsl:94-99`). There is
**no shared colormap facility** in `common-web` — the ramp pattern is copied
per-sim (reaction-diffusion, physarum precedents cited in the file header).

- **3.1.a Colormap module (new shared facility).** `common/common-web/src/colormap.ts`
  exposing perceptually-uniform, colorblind-safe maps as 4–8 stop RGB tables:
  **viridis, inferno, magma, plasma, turbo, cividis**, plus the existing house
  teal ("aurora") and warm ("ember"). Provide a WGSL emit helper so the ramp is
  a data-driven `mix()` chain, not hand-written per map. Selector in the
  `display` group of the panel (`main.ts` display group, currently `main.ts:977`).
  - *Why:* science-literate identity; reusable by all 7 demos; template.
  - *Acceptance:* switching maps is a uniform/table swap — no pipeline rebuild;
    the butterfly ghost stays visually distinct from the primary under every map
    (INFERENCE: pair each primary map with a complementary ghost map or a fixed
    hue offset).
- **3.1.b Color-by mode.** Toggle the color driver: **speed** (current),
  **z-depth**, **time/age** (index along trajectory), **lobe** (sign of x — which
  wing), **curvature** (angle between adjacent segments). All derived from data
  already in the buffer; no ODE re-implementation in presentation code (preserves
  the "physics-honest color" contract, `render.wgsl:19`).
- **3.1.c Projections.** Optional faint XY / XZ / YZ shadow projections onto the
  framing box walls (the canonical butterfly *is* the XZ projection). Extra
  line-strip draws with a flattened `view_of`; presentation only.
- **3.1.d Background / exposure.** Background theme (deep-space / paper / blueprint)
  + exposure and vignette sliders feeding `fs_blit` (`render.wgsl:207-215`),
  replacing magic constants with uniforms. Recalibrate poster/loop boost (Step 6
  discipline from `verification-demo-spec.md` § 3.4).

### 3.2 Pedagogical instruments (Lane B)

These make it an *instrument*. All feasible without a new kernel: they read back
the display buffer or re-dispatch the **committed** Lorenz shader (the PROVE
"run twice" already dispatches it into scratch buffers, `verify-panel.ts:132-161`).
Initial scope is **Lorenz** (its canonical pedagogy); § 3.3 systems inherit these
once their kernels land.

- **3.2.a Return map (z-maxima).** Detect successive local maxima of z(t) along
  the display trajectory; plot zₙ vs zₙ₊₁ in a small inset canvas — Lorenz's
  near-1D unimodal (tent-like) return map. *The* "order hidden in chaos" reveal
  (Lorenz 1963 § "The predictability…"). CPU over one readback of `liveTraj`;
  reuses the sequence-token pattern (`main.ts:544`).
- **3.2.b Poincaré section.** Points where the trajectory crosses a chosen plane
  (default z = ρ−1, the C± height); render as a scatter inset showing the fractal
  cross-section. CPU crossing-detection over the readback.
- **3.2.c Live Lyapunov readout.** **The butterfly ghost is already integrated
  and ‖Δ‖ already measured** (`main.ts:572-591`). Fit the slope of
  log‖Δ(t)‖ over the exponential-growth window → live estimate of the largest
  Lyapunov exponent (classic Lorenz λ₁ ≈ 0.9056). Add a row to the Study
  diagnostics + a "measured, then compared to the literature value" honesty note.
  ~15-line extension of `measureStudyDiagnostics`.
- **3.2.d Bifurcation diagram.** Sweep ρ over a range, integrate the **committed**
  Lorenz kernel into scratch buffers per ρ (same dispatch pattern as PROVE),
  collect z-maxima, plot z-max vs ρ — the chaos-onset picture. Python precedent:
  `sim.py:176 parameter_sweep_final_z`. Mark the demo's current ρ on the axis so
  the slider and the diagram are coupled.
- **3.2.e More ρ bookmarks.** Extend the ρ tick set (`main.ts:931-935`) with the
  real bifurcations: ρ=1 (pitchfork), ρ≈13.93 (homoclinic), ρ≈24.06 (crisis).
  (Current ticks — ρ≈24.74 Hopf, 99.65 periodic window, 350 limit cycle — are
  already present and keep their labels.)

### 3.3 New attractor families — FULL DISCIPLINE (boundary-crossing)

**Operator posture (chosen 2026-07-03): full discipline.** Each new attractor is
a first-class sub-sim, not a display-only novelty — so each earns the same
verification bar as Lorenz before it appears "verified" in the demo. This keeps
the repo's *show-don't-assert* thesis intact: the demo can render a system live
in display buffers *and* point at that system's own committed reference,
golden anchors, capture, and gate.

**FACT (already chartered).** `spec-ref.md` § 1 scopes the family as *Lorenz,
Rössler, Aizawa, Sprott-A, Pickover*. NumPy reference fields **already exist**
for Rössler (`reference/rossler.py`), Aizawa (`reference/aizawa.py`), and
Sprott-A (`reference/sprott.py`) — the field math is banked; the discipline
around it is not. The algebraic anchor
`docs/sim-specs/closed-form/strange-attractors/algebraic.md` (§§ 3–6) already
derives all four non-Lorenz chartered systems — **including a continuous
Pickover ODE** (see the Pickover bullet below) — and `spec-ref.md` § 6.1
explicitly anticipates this expansion ("Phase 2+ extends with Rössler / Aizawa /
Sprott-A / Pickover structural golden tables").

**FACT (charter-scope line).** Systems in Clusters B and C below (Thomas,
Halvorsen, Dadras, Chen, Four-wing) are **not in the chartered family**. Their
ratification is therefore a two-part ask: (a) the boundary-crossing kernel work,
*and* (b) a `spec-ref.md` § 1 scope amendment + new `algebraic.md` derivation
sections, as explicit deliverables of the cluster — not slipped in as if the
charter already covered them. Cluster A needs no scope amendment.

**Per-attractor full-discipline checklist** (each item is a gate to "verified"):

1. **Algebraic derivation** — a section in
   `docs/sim-specs/closed-form/strange-attractors/algebraic.md` with citation +
   canonical parameters (§§ 3–6 already cover the chartered four; Cluster-B/C
   systems add new sections). This is the algebraic anchor `spec-ref.md` § 4
   points at — golden tables derive from it, so it comes first.
2. **NumPy reference field** — `reference/<name>.py` (3 exist; others new).
3. **Structural golden anchors** — `tools/testkit/golden/tables/closed-form/<name>-structural.json`
   + derivation at `tools/testkit/golden/derivations/<name>-structural.md`
   + generator at `tools/testkit/golden/generator/` (lorenz-structural
   precedent), ≥3 independent-reference anchors (spec § 2.4). The *anchorable*
   invariant set varies per system (§ 3.3.1 below) — this is the
   research-honest part, not boilerplate.
4. **RK4 driver reuse** — `integrator.rk4_evolve` (no new integrator).
   *INFERENCE (while here):* generalizing `sim.py` across systems is the natural
   point to introduce the `strange_attractors.system.System` protocol that
   `spec-ref.md` § 5's implementation contract charters but which **does not
   exist yet** — introduce it in the first X-A cluster, or record an explicit
   waiver in that cluster's audit.
5. **SimRunner + canonical capture** — extend `sim.py` to emit
   `<name>-trajectory-seed42-step<N>` (naming precedent:
   `captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.h5` +
   `.json` sidecar) with a real payload checksum (fix the `sha256:0*64`
   placeholder, `sim.py:88`, while here).
6. **Determinism class + equivalence tolerance** — `determinism.md`, `equivalence.md`
   entries; closed-form defaults unless measured otherwise (spec § 2.6). Also
   update `spec-ref.md` § 6 per system (gate status § 6.5, PBT declarations
   § 6.6) so the sim-spec stays the source of truth.
7. **13 gates + ≥2 PBT invariants** (spec § 3.5, § 2.14) — e.g. divergence =
   tr(J) for dissipative systems; volume-preservation / time-reversibility for
   conservative ones (Sprott-A already declared, `spec-ref.md` § 6.6 invariant 2).
   Gates 11–13 *are* the PBT / perf-ledger / failing-tests-replay gates, so
   items 7–8 here restate the same bar, not an extra one.
8. **Perf-ledger row** (spec § 2.15).
9. **Display WGSL** — new `web/src/fields/<name>.wgsl` (or a `field_id`-switched
   display kernel) integrating into **display buffers only**. **This is the
   boundary-crossing artifact requiring ratification + full validate gate.**
10. **Web wiring** — attractor selector in the panel; per-system fit seed,
   dt, presets, and EXPLAIN entries (equations → the committed WGSL that runs
   them, same self-healing anchor mechanism as Lorenz, `explain.ts`).

**INFERENCE (recommended staging).** Ship § 3.3 as ordered clusters, tractable
math first:

- **Cluster A (grounded):** Rössler, Aizawa, Sprott-A — reference fields exist,
  invariants are analytically clean, and they complete the chartered family
  minus Pickover. **Pickover joins Cluster A if § 9.2 pins its source** (it is
  chartered; only the parameter provenance is open).
- **Cluster B (showpieces, new):** Thomas, Halvorsen — cyclically symmetric,
  symmetry-based invariants.
- **Cluster C (optional):** Dadras, Chen, Four-wing — multi-wing visuals.
- **Pickover — DECISION NEEDED (§ 9), narrower than v0 framed it.** The repo has
  already banked a **continuous Pickover ODE** in `algebraic.md` § 6
  (ẋ = sin(ay) − z·cos(bx), ẏ = z·sin(cx) − cos(dy), ż = sin x; canonical
  a=2.24, b=0.43, c=−0.65, d=−2.43), with a standing INFERENCE note that the
  implementation phase pins a specific source (references disagree on the
  canonical parameter set). The open decision is therefore *not* "map vs ODE" —
  it is: **pin an authoritative source for the banked § 6 form and ship it with
  Cluster A (completing the chartered five), or drop it with cause.** The 3D
  *map* variant stays out of scope either way (§ 8).

#### 3.3.1 Canonical forms & parameters (verified against references)

| System | Field (ẋ, ẏ, ż) | Canonical params | Notes / anchors |
|---|---|---|---|
| **Rössler** | −y−z ; x+ay ; b+z(x−c) | a=b=0.2, c=5.7 | fixed points solvable in closed form; single-scroll |
| **Aizawa** | (z−b)x−dy ; dx+(z−b)y ; c+az−z³/3−(x²+y²)(1+ez)+f·z·x³ | a=.95,b=.7,c=.6,d=3.5,e=.25,f=.1 | spherical shell + spike; matches `reference/aizawa.py` |
| **Sprott-A** | y ; −x+yz ; 1−y² | (none) | **volume-preserving** (div f = z, zero net over a balanced orbit — `reference/sprott.py` docstring); PBT time-reversibility |
| **Pickover** | sin(ay)−z·cos(bx) ; z·sin(cx)−cos(dy) ; sin x | a=2.24, b=.43, c=−.65, d=−2.43 | banked `algebraic.md` § 6; **source pin pending (§ 9.2)** |
| **Thomas** | sin y−b·x ; sin z−b·y ; sin x−b·z | b=0.208186 | cyclically symmetric; symmetry invariants |
| **Halvorsen** | −a·x−4y−4z−y² ; (cyclic) | a=1.4 | cyclically symmetric three-lobe |
| **Dadras** | y−p·x+o·yz ; r·y−xz+z ; c·xy−e·z | p=3,o=2.7,r=1.7,c=2,e=9 | four-wing-ish |
| **Chen** | a(y−x) ; (c−a)x−xz+cy ; xy−bz | a=35,b=3,c=28 | **stiff/fast — small dt (~0.002); calibrate at impl** |
| **Four-wing** | a·x+c·yz ; b·x+d·y−xz ; e·z+f·xy | a=.2,b=−.01,c=1,d=−.4,e=−1,f=−1 | four lobes |

Per-system **dt** and integration horizon are calibrated during implementation
against a CFL-style / step-convergence sanity probe (spec § 6.2); the table above
fixes the *field*, not the numerics.

### 3.4 Interaction & camera (Lane B)

- **3.4.a Full 3D orbit + zoom.** Current drag is x-axis rotation only
  (`main.ts:780-786`, single `angle` uniform). Add pitch + zoom via two more
  render uniforms (elevation, distance) — preserves the auto-orbit contract
  (`main.ts:695`) so poster/loop determinism is unaffected (frame-indexed).
- **3.4.b Timeline scrub / pause.** Expose the trace-in `head` (`main.ts:622`) as
  a scrub slider in Study; step through the trajectory.
- **3.4.c Reseed nudger.** A "nudge IC" control re-integrating the **display**
  buffer from a fresh jittered IC (display-only; capture stays pinned to seed-42,
  the invariant from `verification-demo-spec.md` § 3.1).
- **3.4.d Share params in URL.** Serialize σ/ρ/β + colormap + attractor to the
  hash; restore on load. Portfolio-friendly deep links; no effect on capture.

## 4. Shared facilities (built once, reused)

- **Colormap module** (§ 3.1.a) — `common/common-web/src/colormap.ts` + WGSL emit
  helper. First shared colormap facility in the repo; other 6 demos inherit it.
- **Attractor registry** — a single typed table (name → field WGSL id, canonical
  params, dt, fit seed, EXPLAIN metadata, committed-artifact links) that the
  panel selector, EXPLAIN panel, and capture manifest all read. Analogous to the
  existing `REGIMES` table (`main.ts:417`), generalized across systems.
- **Data-spine extension** — `gen-verification.mjs` grows a per-attractor section
  (params, anchors, gate tolerances, audit links) so EXPLAIN/PROVE stay
  data-bound and self-healing (never retyped), per `verification-demo-spec.md` § 4.

## 5. Sequencing / clusters

| Cluster | Contents | Lane | Gate |
|---|---|---|---|
| **L-1** | § 3.1 colormaps + color-by + projections + background | Lane B | web validate |
| **L-2** | § 3.2 instruments (return map, Poincaré, Lyapunov, bifurcation, bookmarks) | Lane B | web validate |
| **L-3** | § 3.4 interaction (3D orbit, scrub, reseed, URL) | Lane B | web validate |
| **X-A** | § 3.3 Cluster A: Rössler, Aizawa, Sprott-A (+ Pickover per § 9.2) — per-system full discipline | **ratified** | full 13-gate + web validate, per system |
| **X-B** | § 3.3 Cluster B: Thomas, Halvorsen | **ratified + spec-ref § 1 scope amendment** | full, per system |
| **X-C** | § 3.3 Cluster C: Dadras, Chen, Four-wing (optional) | **ratified + spec-ref § 1 scope amendment** | full, per system |

L-1..L-3 are independent and can land in any order as pure polish. X-* each
begin with an operator HARD-STOP → pre-dispatch review (charter v2-amendment
item 1) → the boundary-crossing kernel work → full validate.

## 6. Governance & constraints

- **HARD BOUNDARY (Lane B clusters L-*).** No edits to
  `packages/strange-attractors/src/lorenz_rk4.wgsl`, the capture path
  (`captureCanonical`/`readTrajectory`), the gate, `tolerance*.toml`, or seed/IC
  generation. Display buffers and presentation only.
- **§ 3.3 is explicitly boundary-crossing.** New field WGSL = new compute kernels
  + step loops (charter § 3.1). Each X-* cluster: operator ratification, FULL
  validate gate, called out in report + audit — never slipped into a styling
  commit.
- **Capture pinning preserved.** The web demo's capture export stays pinned to
  Lorenz classic seed-42 regardless of the selected system or live sliders
  (`verification-demo-spec.md` § 7.6); each new attractor's *own* gated capture
  lives in the backend, like Lorenz's.
- **Frame-indexed animation only** (poster/loop determinism) — every new animated
  quantity (3D orbit, scrub, return-map inset) is frame-indexed, never wall-clock.
- **Standalone-serve constraint.** All new data rides the bundle (static JSON
  import); no `../../` cross-refs, no runtime fetches required for correctness
  (`verification-demo-spec.md` § 6).
- **No new heavy dependencies.** Hand-rolled markup on the existing theme; insets
  are canvas2d or extra WebGPU passes; `gen-verification.mjs` stays Node-builtins.
- **Panel DOM contract untouched.** All `data-bp` driver-discovery attributes keep
  placement/visibility; new UI enters via `addGroup()` and new rows only.

## 7. Acceptance / definition of done

**Per Lane-B cluster (L-*):**
1. `python tools/productization/web-deploy/pipeline.py validate --sim strange-attractors`
   green in headless Chromium + WebGPU — the `new_canonical + run-twice` gate
   stays byte-identical (presentation work did not perturb the capture path).
2. `ts-strict` clean (tsc + lint parity).
3. Exported capture step/state arrays byte-identical to pre-work.
4. Layout sane at 375 px mobile and the 860 px max canvas; poster + motion loop
   regenerated with recalibrated boost (no blown highlights).
5. Colormap/instrument/camera additions are frame-indexed and poster-deterministic.

**Per attractor (X-*), additionally — the full bar:**
6. 13 gates pass (spec § 3.5); ≥2 PBT invariants; structural golden anchors match
   ≥3 independent references within table tolerance.
7. Canonical capture emitted with a **real** payload checksum; perf-ledger row
   appended; determinism + equivalence docs written.
8. Backend cross-phase replay clean (charter v2-amendment item 2).
9. Web EXPLAIN anchors self-heal against the new committed field WGSL (build
   HARD-FAILs on any unmatched anchor).

## 8. Out of scope

- Any change to the Lorenz gate, tolerances, seeds, or the committed
  `lorenz_rk4.wgsl` kernel.
- The other six web demos (they *inherit* the colormap module and instrument
  patterns later; not rebuilt here).
- 2D attractors (de Jong / Clifford / Pickover-map), neural surrogate flows,
  full Lyapunov-*spectrum* estimation — `spec-ref.md` § 1 non-goals stand unless
  separately chartered. (Largest-exponent readout § 3.2.c is *not* a spectrum.)
- Publishing (gh-pages deploy is operator-dispatched `workflow_dispatch`).

## 9. Open decisions (operator)

1. **Initial attractor set / cluster order** — recommend Cluster A (Rössler,
   Aizawa, Sprott-A) first (reference fields exist, clean invariants). Confirm or
   reorder. Note X-B/X-C additionally require the `spec-ref.md` § 1 scope
   amendment (§ 3.3) — opening them is a charter decision, not just sequencing.
2. **Pickover** — pin an authoritative source for the continuous ODE already
   derived in `algebraic.md` § 6 and ship it with Cluster A, or drop it from
   the chartered family with cause. (v0 framed this as "map vs ODE"; the repo
   has already committed the continuous form — only the source pin is open.)
3. **Lane-B first, or interleave?** — recommend landing L-1..L-3 as a polish
   cluster before opening any ratified X-* cluster, so the boundary-crossing work
   is cleanly isolated.
4. **Instrument reach** — return map + Lyapunov are the highest-teaching-value,
   lowest-risk items; confirm bifurcation (heavier: many re-dispatches) is wanted
   in the first instrument cluster or deferred.

## 10. Change log

- **v0.1 (2026-07-03) — repo citation audit + corrections.** Every file:line and
  section citation was verified against the working tree; all § 3.1/3.2/3.4
  code claims held. Substantive changes:
  1. **Pickover (§ 3.3, § 9.2):** v0 claimed classical Pickover is a discrete
     map needing re-scope. The repo already banks a *continuous* Pickover ODE
     with canonical parameters (`algebraic.md` § 6); decision narrowed to
     "pin the source, or drop with cause". Added its row to § 3.3.1.
  2. **Charter-scope line (§ 3.3, § 5):** Thomas/Halvorsen/Dadras/Chen/Four-wing
     are outside the `spec-ref.md` § 1 chartered family — X-B/X-C ratification
     now explicitly includes a spec-ref scope amendment.
  3. **Checklist additions (§ 3.3):** `algebraic.md` derivation section as
     item 1 (it is the algebraic anchor golden tables derive from); golden
     derivation/generator paths; capture-naming precedent; per-system
     `spec-ref.md` § 6 maintenance; the still-absent `strange_attractors.system.System`
     protocol from the spec-ref § 5 implementation contract (introduce in X-A or
     waive with cause); note that gates 11–13 already cover PBT/perf-ledger.
  4. **Citation fixes:** charter "§ 1.8" (does not exist) → § 3.1/§ 3 +
     v2-amendment; `spec-ref.md` "§ 6.6.2" → § 6.6 invariant 2;
     `render.wgsl:22` → `render.wgsl:19`; § 3.2.e no longer lists the ρ=99.65
     periodic window as an addition (it is already in the tick set alongside
     24.74 and 350).
