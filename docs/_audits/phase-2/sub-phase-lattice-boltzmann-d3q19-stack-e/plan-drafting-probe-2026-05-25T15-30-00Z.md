---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-plan-drafting
stage: plan-drafting-probe
phase: phase-2
head_sha: <COMMIT-1-SHA — back-filled per Convention #12 / N1>
head_sha_at_checkpoint: c5806f3dae69c6b1f65505ec42c0e9595ebe6479
date: 2026-05-25T15-30-00Z
verdict: probe-complete
---

# Plan-drafting probe — sub-phase-lattice-boltzmann-d3q19-stack-e

> **EIGHTH** per-sim cross-stack port under spec-Phase-2; the **THIRD Stack-E port
> consuming `common/common-warp`** (after `mpm-multimaterial-stack-e` +
> `eulerian-smoke-stack-e`); the **SECOND `lattice-boltzmann-d3q19` port** (after the
> Stack-D Taichi port). Spec § 11.3 item **2.5** ("LBM to Stack D **and Stack E**") —
> this is the **Stack-E half** of a clean, fully-enumerated spec mandate (the Stack-D
> half landed at `lattice-boltzmann-d3q19-stack-d`). Ports `lattice-boltzmann-d3q19`
> from its Phase-1 implemented reference (Python NumPy; `stack.name="numpy-reference"`,
> `sim.category="lattice"`, `variant="bgk-d3q19-qian-1992"`) to **Stack-E (Python /
> NVIDIA Warp 1.13.0 / CPU)**, producing `packages/lattice-boltzmann-d3q19-stack-e/`.
> gate-14 LEFT-partners are the Phase-1 reference captures at `captures/lbm-ref/`
> (TWO descriptors); RIGHT-partners are the new Stack-E captures.
>
> Probe authored per the **S6-trajectory-simulation discipline** (conventions
> `§ L.4`; methodology `§ 6.5`) AND the **step-1 cross-stack seed-difference
> discipline** (methodology `§ 6.1` condition (ii); conventions `§ L.8`). **Task 1.6
> EXECUTES the Phase-1 canonical trajectories at HEAD AND empirically MEASURES the
> step-1 cross-stack seed-difference against a faithful scratch Warp f64 port** — it
> does NOT predict the verdict shape from the canonical regime alone (the
> `eulerian-smoke-stack-e` plan-drafting did exactly that and was empirically
> falsified; § L.8 / § 6.7). Every path / SHA / sha256 / signature / classification
> below is HEAD-verified at `c5806f3`. **The two defining findings:** (1) Task 1.6
> **empirically CONFIRMS BOTH canonical trajectories are LAMINAR / bounded /
> dissipative** at canonical resolution — Poiseuille `max|u_lat| 5e-6 → 8.65e-3 @
> step 1000` (monotone, `Ma=0.015`); Couette `0 → 0.05 @ step 50`, bit-stable through
> step 500 (`Ma=0.087`) — reproducing the `lattice-boltzmann-d3q19-stack-d` laminar
> regime; (2) Task 1.6 **empirically MEASURES the step-1 cross-stack seed-difference =
> EXACTLY `0.0`** — a faithful Warp f64 CPU full step (collision + Guo body force +
> streaming + half-way bounce-back incl. moving-wall injection) reproduces the sealed
> NumPy reference **byte-for-byte** on BOTH canonical ICs and on a developed-flow
> state. Predicted gate-14: **cross-stack BIT-EXACT — `within_tolerance=True`,
> `max_abs_err=0.0` on BOTH descriptors** (O-1 verdict shape **(a)**) — the **THIRD
> portfolio shape-(a) instance** (after MPM-Stack-E + smoke-Stack-E) and the **FIRST
> shape-(a) on a LAMINAR trajectory** (completing the D-S2-1 decoupling: shape (a) is
> a zero-seed-difference property, orthogonal to the Lyapunov regime — now witnessed
> on BOTH chaotic [smoke-E] and laminar [LBM-E] trajectories). **Two dispatch/doc
> premises are refined at HEAD** (see § 3 / § 7 / § 10): (1) `docs/common/warp.md`
> § 6 line-208 predicts LBM Stack-E uses a `wp.array(dtype=wp.float32, ndim=4)` for
> the 19-component distribution — **refined to `wp.float64`** per the § 6.1 / § 6.2
> f64-principle (the LBM reference is f64 throughout; the `1e-5` cross-stack tolerance
> would be destroyed by an f32 downcast); (2) the per-sim
> `[overrides.lattice-boltzmann-d3q19]` row **already exists** (LBM-Stack-D Stage 1c)
> — Stack-E needs **no new override** (THIRD port to skip).

---

## § 1. Scope

This sub-phase ports `lattice-boltzmann-d3q19` (Phase-1 NumPy reference at
`packages/lattice-boltzmann-d3q19/`) to Stack-E (Python / NVIDIA Warp 1.13.0 / CPU
mode default), producing `packages/lattice-boltzmann-d3q19-stack-e/` through gates
4–14 of spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2
14th gate of cross-stack equivalence). It is the EIGHTH per-sim cross-stack port, the
THIRD Stack-E port, and the THIRD substantive consumer of `common/common-warp`'s
§ 1.9.1 socket (after `mpm-multimaterial-stack-e` + `eulerian-smoke-stack-e`).

Three existing packages at HEAD bracket this port:
- `packages/lattice-boltzmann-d3q19/` — Phase-1 NumPy reference (gate-14 LEFT-partner
  *source*; the gate-14 capture artifacts are at `captures/lbm-ref/`; sealed).
- `packages/lattice-boltzmann-d3q19-stack-d/` — Phase-2 Stack-D Taichi-DSL port
  (THIRD per-sim port; SAME sim source; the laminar-regime / two-capture / dual-arm
  gate-4 / FP-round-off `~6e-15` content template; NOT the gate-14 partner).
- `packages/eulerian-smoke-stack-e/` + `packages/mpm-multimaterial-stack-e/` — the
  two prior Stack-E Warp ports (the closest *structural* templates — socket
  consumption, own-f64-`wp.array`s, the four-checkpoint Warp CPU determinism chain,
  the Convention-#12 chain; smoke-E is also the cross-stack BIT-EXACT shape-(a)
  precedent and the § L.8 "measure step-1, don't assume from regime" precedent).

The new `packages/lattice-boltzmann-d3q19-stack-e/` is the gate-14 RIGHT-partner. The
port inherits its **structure** from `mpm-multimaterial-stack-e` / `eulerian-smoke-stack-e`
(common-warp socket + own f64 `wp.array`s + the O-2 four-checkpoint determinism chain)
and its **content / regime** from `lattice-boltzmann-d3q19-stack-d` (laminar BGK
dissipative regime; TWO canonical descriptors — Poiseuille + Couette; dual-arm gate-4
— equilibrium golden + NS-2D MMS; IC-6 `vector_field` on the macroscopic velocity).

Plan-drafting scope ONLY: probe + charter + plan-drafting landing + SHA back-fill
(4 commits). NO sim source, common-warp, workflow, conventions, methodology,
`tolerance.toml`, `equivalence.md`, or `dependencies.md` edits (dispatch boundary).
Task 1.6 is READ-ONLY execution of the existing Phase-1 surface + a scratch Warp f64
experiment (no committed artifact; scratch held outside the repo tree).

---

## § 2. Convention C / D / M / A discipline at HEAD

**Convention M re-anchor.** HEAD at probe = `c5806f3` (the `eulerian-smoke-stack-e`
landing SHA-backfill; branch `main`; working tree clean except untracked `.claude/` +
four untracked `captures/eulerian-smoke-stack-{d,e}/taylor-green-128cube-seed42-step500.{h5,json}`
files — the smoke held-local chaotic-regime artifacts per the LFS-bandwidth condition
D13/D14; not load-bearing for plan-drafting). No drift since the coordinator handoff
anchor → **Hard Rule 2 HEAD-drift condition NOT triggered.**

| Anchor | Coordinator-believed | HEAD-verified (`sha256sum` / `git`) | Match? |
|---|---|---|---|
| HEAD | `c5806f3` | `c5806f3` (`eulerian-smoke-stack-e-landing-sha-backfill`) | **FACT — identical** |
| `docs/conventions/sub-phase-conventions.md` | post-§L.8 | `7713828f3246e29f4154a64e34b4850056342a3ba16ef45215bf5b952b7d3164` | **FACT — verified at HEAD** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | post-§6.7 | `f9c6a3cf3235e7ec48cd8d162f90fe0164065446fe86a8be66c328b6ee8b808f` | **FACT — verified at HEAD** |
| `docs/architecture.md` (spec anchor) | (carried) | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT — unchanged since smoke-E** |
| `docs/common/warp.md` | post-§6.2 | `eff17d306373b2b42b27172ae50e37934f527cf611cd1685b12dab2e000b75da` | **FACT — verified at HEAD (carries the line-208 LBM prediction; § 7 / D15)** |
| Workspace members | 22 | 22 (`pyproject.toml`: 3 tools + 10 Phase-1 sims + common-py + 5 Stack-D + common-warp + mpm-stack-e + smoke-stack-e) | **FACT — identical** |
| Replay invariant | `9399fc33…718909f34` | carried by reference (Stage-0 re-verifies; plan-drafting does not run replay) | **FACT — HELD** |
| Integrity baseline | `c19492ad…d22cb52` (0 HF / 14 SW) | carried by reference (Stage-0 re-verifies; plan-drafting does not run the sweep) | **FACT — baseline-MATCH** |
| Cumulative shifts entering | 209 | dispatch ENTERING-STATE; carried by reference from the `eulerian-smoke-stack-e` sub-phase close | **FACT — consumed as 209** |
| `common-warp` § 1.9.1 socket | verbatim | `common/common-warp/src/common_warp/__init__.py` re-exports `init` / `read_capture` / `write_capture` / `Capture` / `assert_deterministic_run` / `deterministic_context` / `set_warp_deterministic` / `set_seed` / `get_seed` (+ f32 `Particles`/`ScalarField3D`/`VectorField3D`/`HashGrid`) | **FACT — no drift** |
| `[overrides.lattice-boltzmann-d3q19]` | exists (LBM-D) | `tools/testkit/equivalence/tolerance.toml` `[overrides.lattice-boltzmann-d3q19] category = "lbm"`; `[defaults.lbm] relative=1e-5, absolute=0.0` | **FACT — present; reuse-able** |
| gate-14 LEFT-partners | `captures/lbm-ref/…` | `captures/lbm-ref/{poiseuille-64x32-seed42-step1000, couette-32x16-seed42-step500}.{h5,json}` tracked (LFS) — 202,350,128 B + 27,405,152 B | **FACT — present (TWO); path is `lbm-ref`, not `lattice-boltzmann-d3q19-ref`)** |

**NOTE on the conventions / methodology sha256.** These differ from the
`eulerian-smoke-stack-e` *probe*'s anchor values (`1937a7cf…` / `a154d10c…`) because
the smoke-Stack-E *landing* AMENDED both docs additively (conventions § L.8 + § L.7
O-1 D-S2-1 refinement + § L.6 O-W7 narrowing; methodology § 6.1 R-P2 re-characterization
+ § 6.7 counter-instance). This is the expected Phase-2 carry-forward — the docs advance
at each landing; this probe consumes the **current HEAD** baseline AS-IS (Convention M;
HEAD wins). No plan-drafting edit to conventions / methodology / architecture / warp.md.

**Convention C** (probe API surfaces; verbatim citations): the common-warp § 1.9.1
socket signatures, the Phase-1 LBM reference surface (`sim.py` /
`reference/{bgk,equilibrium,constants}.py`), the `compare_captures` tolerance-resolution
mechanics, and the Warp 1.13.0 CPU-determinism behaviour are cited from HEAD source /
the methodology § 6 + conventions § L.4–L.8 / the Warp 1.13.0 docs. Web-fetch at probe
time (`github.com/NVIDIA/warp` CHANGELOG): warp-lang **1.13.0 (2026-05-04) remains
upstream-latest** (no 1.14 / 2.0; an "Unreleased" section exists with no assigned
version); the `>=1.13,<2.0` pin holds.

**Convention D** (probe call sites): how `mpm-multimaterial-stack-e` /
`eulerian-smoke-stack-e` consume the common-warp socket (`init("cpu", True)` device
pin + `write_capture` f64 payload + `deterministic_context` / `assert_deterministic_run`
+ own `wp.array(dtype=wp.float64)` state) is the call-site template; the LBM port
allocates its OWN `wp.array(dtype=wp.float64, ndim=4)` for the 19-component D3Q19
distribution (no common-warp convenience surface fits — § 3 (c)).

**Convention A** (additive-only): the implementation stages add a NEW package
(`packages/lattice-boltzmann-d3q19-stack-e/`) + a NEW capture dir
(`captures/lattice-boltzmann-d3q19-stack-e/`) + a NEW workspace member (22 → 23);
existing files are touched only where additive (root `pyproject.toml` member list,
`docs/perf-ledger.md` rows, `equivalence.md` additive Stack-E section). **No
`tolerance.toml` edit** (§ 7 D6 — the override already exists).

---

## § 3. Believed-state reconciliation (dispatch ENTERING STATE + PROBE-MUST-HONOR)

### Repo anchors — CONFIRMED
All anchors match (§ 2 table). Cumulative shifts entering = **209** (FACT — dispatch
ENTERING-STATE; carried by reference from the `eulerian-smoke-stack-e` sub-phase
close). Workspace = **22** (LBM-E registers as the 23rd at Stage 1b); replay
`9399fc33…718909f34` HELD; integrity `c19492ad…d22cb52` baseline. All carried by
reference; Stage-0 Task 0.0 re-verifies at then-HEAD.

### PROBE-MUST-HONOR (a) — S6-trajectory-simulation discipline — APPLIED (load-bearing; see § 6)
Task 1.6 EXECUTED the Phase-1 canonical trajectories at HEAD at **canonical
resolution** (Poiseuille 64×32×3, 1000 steps; Couette 32×16×3, 500 steps — honoring
the R-SME9 § L.4 canonical-resolution discipline; no downscaled de-risk grid),
tracking `max|u_lattice|` (read-only; no source edit; no committed artifact). Verdict:
**LAMINAR / bounded / dissipative** (BGK `τ=0.7` damps perturbations; field stays
sub-`Ma=0.1`). Full result in § 6. This re-confirms, on the Stack-E premise, the
`lattice-boltzmann-d3q19-stack-d` characterization — the sharp contrast to smoke's
positive-Lyapunov blow-up; the analog of MPM Stack-E's BOUNDED rigid free-fall.

### PROBE-MUST-HONOR (b) — step-1 cross-stack seed-difference → predicted gate-14 verdict (shape (a) bit-exact)
**The load-bearing input, MEASURED — not predicted-from-regime.** Per the § L.8 /
§ 6.7 discipline (a chaotic regime does NOT imply R-P2; the verdict turns on the
backend-PAIR's step-1 arithmetic faithfulness), Task 1.6 built a faithful scratch Warp
f64 CPU port of one full step (collision + Guo body force + streaming + half-way
bounce-back incl. moving-wall momentum injection) and measured `max_abs_err` vs the
sealed Phase-1 NumPy reference. **Result: EXACTLY `0.0`** on BOTH canonical ICs
(Poiseuille step 0→1; Couette step 0→1 with moving-wall injection) AND on a
developed-flow state (after 60 warm-up steps). The isolated components (19-term
density `sum`, 19-term momentum `einsum`, the feq polynomial, the BGK relaxation) are
each bit-exact (§ 6). **Predicted gate-14 verdict shape: (a) cross-stack BIT-EXACT** —
`within_tolerance=True`, `max_abs_err=0.0` on BOTH descriptors. Inference order
honored (§ 6.7): step-1 seed-difference (`0.0`, MEASURED) → regime (LAMINAR, MEASURED)
→ verdict shape (a). The THIRD shape-(a) instance; the FIRST on a laminar trajectory.

### PROBE-MUST-HONOR (c) — common-warp consumption — RESOLVED (warp.md § 6 line-208 refined f32→f64)
HEAD-verification of (a) the Phase-1 LBM data-structure usage (a dense f64
19-component distribution `f` of shape `(19, Nx, Ny, Nz)`; f64 moments `rho`/`u`) and
(b) the common-warp § 1.9.1 surface yields **socket-only** consumption + an own f64
`wp.array(dtype=wp.float64, ndim=4)` — the same conclusion MPM-Stack-E + smoke-Stack-E
reached, now for a lattice sim:

| Subsystem | § 1.9.1 surface | LBM Stack-E consumption | Reason (HEAD-verified) |
|---|---|---|---|
| 1 Runtime | `init(device, deterministic)`; `get_device`/`set_device` | **YES — substantive** | `init("cpu", True)` device pin (CPU `bit-exact-same-hw`). |
| 2 Capture I/O | `Capture`, `write_capture`, `read_capture` | **YES — substantive (f64)** | gate-9 TWO canonical captures. `write_capture` treats payload as `np.asarray(arr)` (no f32 downcast); the port supplies its OWN **f64** state dict (`rho`/`u`). |
| 3 Determinism | `set_warp_deterministic`, `deterministic_context`, `assert_deterministic_run`, `set_seed`, `get_seed` | **YES — substantive** | gate-10 W-2-equivalent at `tolerance=0.0` (D9). |
| 4 Particles | `Particles`, `allocate_particles` | **NO — not applicable** | LBM is a pure Eulerian lattice sim — no particles. |
| 5 Grids | `ScalarField3D`, `VectorField3D`, `allocate_scalar_field`, `allocate_vector_field` | **NO — doubly blocked** | (i) f32-pinned, LBM is f64; (ii) the single-component `ScalarField3D`(`data: wp.float32`) does NOT fit the **19-component** distribution `(19, Nx, Ny, Nz)` — that needs an `ndim=4` array. The port rolls its OWN `wp.array(dtype=wp.float64, ndim=4)`. |
| 6 HashGrid | `HashGrid` (+ `query_radius`) | **NO — not used** | No neighbor-search; streaming is a FIXED per-direction integer-offset gather (`np.roll` → periodic-mod gather kernel). |

Net: 3 of 6 subsystems consumed substantively (the § 1.9.1 **socket**: Runtime,
Capture, Determinism). This **CONFIRMS** the `warp.md` § 6.1 / § 6.2 f64-principle
("a sim whose reference requires f64 consumes the sockets only … and rolls its own
`wp.array(dtype=wp.float64)`") — LBM is the **THIRD f64 socket-only consumer**. LBM
patterns like **MPM** (the convenience surface does not structurally fit anyway — here
because the distribution is 19-component, not single-component) rather than **smoke**
(which structurally fit yet was f64-blocked). The § 6 line-208 LBM-row prediction
(`wp.array(dtype=wp.float32, ndim=4)`) is **REFINED** — the structural claim (own
LBM-specific `ndim=4` array; `ScalarField3D` does not fit; socket applies) is CORRECT;
only the **dtype f32→f64** is refined, exactly as § 6.1 anticipated ("the … LBM
Stack-E rows are predictions pending their own plan-drafting HEAD-verification …
verify the actual consumption, do not assume the convenience surfaces fit"). This
probe IS that HEAD-verification (D7 / D15).

### PROBE-MUST-HONOR (d) — tolerance reuse — CONFIRMED (no new override)
`[overrides.lattice-boltzmann-d3q19] category = "lbm"` exists at
`tools/testkit/equivalence/tolerance.toml` (HEAD-verified; established by
`lattice-boltzmann-d3q19-stack-d` Stage 1c; AT-BUDGET per `[defaults.lbm]`
`relative=1e-5, absolute=0.0` — the **tightest** category in the portfolio, 10×
tighter than `smoke`/RD-2D/sph-water at `1e-4`; THIRD per-sim override). `compare_captures`
resolves the tolerance category from the **LEFT/reference manifest's `sim.name`**
(`lattice-boltzmann-d3q19`; HEAD-verified `_resolve_tolerance(table, sim_name,
sim_category)` keys on `sim_name`) — so the Stack-E port (RIGHT) inherits the override
with **no new row**. Stage 1c's override-add step **collapses to a verify-only no-op**
(D6) — the THIRD cross-stack port to skip the Stage-1c override edit (MPM-E + smoke-E
were the first two).

### PROBE-MUST-HONOR (e)–(i) — inherited amendment sets + disciplines (all apply)
- **§ L.4** (chaotic-regime + S6-trajectory discipline) — APPLIED (Task 1.6). LBM is
  LAMINAR (the tame-regime branch); the R-SME9 canonical-resolution discipline is
  HONORED (ran at 64×32×3 / 32×16×3, the canonical grids).
- **§ L.5** (common-warp-bootstrap) — S1a-2 GPU device-string discipline (no bare
  `cuda`-digit token in un-backticked prose); S1b-3 socket-reconciliation (build
  verbatim from Stage 1a); S1c-1 plan-prose-gloss vs spec-verbatim. Apply to Stack-E
  source/audits.
- **§ L.6 + § L.8 O-W7 narrowing** — the `wp.float64()` taint workaround is LESS
  load-bearing for LBM than for smoke/MPM (LBM's hot path is pure-float arithmetic +
  pure-int 19-direction loop indexing + integer-offset streaming gather — NO
  float→int index derivation à la the SL backtrace / P2G base-node). Where any int
  base is derived, the § L.8 S1b-SME1 narrowing applies (a **fresh** `fi=wp.float64(i)`
  does NOT taint the int loop index `i`). The `int(0)` idiom + explicit `dtype=` to
  `wp.from_numpy` for the multi-dim f64 distribution still apply.
- **§ L.7 O-1 verdict taxonomy (refined D-S2-1)** — LBM Stack-E is the THIRD shape-(a)
  instance and the FIRST on a LAMINAR trajectory (§ 6). **§ L.7 O-2 four-checkpoint
  Warp CPU determinism chain** — Stage-0 R-A1 anchor (ckpt 1) → Stage-**1b** gate-10
  production reproduction (ckpt 2) + canonical-scale 2-run (ckpt 3) → Stage-1c formal
  gate-14 (ckpt 4). (NB: gate-10 + 2-run land at Stage **1b**, NOT Stage 1a — the
  "Stage-1a gate-10" mapping in the smoke-E dispatch headers was MPM-inherited drift,
  reconciled by smoke-E S1a-SME1; this charter gets it right from the start.)

---

## § 4. Banked-item enumeration sweep (full table)

(FACT — `eulerian-smoke-stack-e` landing § 13 / § 7 roll-up [most recent] +
`lattice-boltzmann-d3q19-stack-d` landing. No surprise items.)

| Banked item | Origin | Disposition for this sub-phase |
|---|---|---|
| LFS-architecture / remote-CI red (D13) | ongoing | **STAY-BANKED.** Remote-CI red per LFS-bandwidth; local verification unaffected. NB LBM's captures are smaller (202 MB / 27 MB, both ≤256 MiB) — no held-local artifact, unlike smoke's 738 MB 3D (§ 7). |
| Missing CHANGELOG entries (smoke-Stack-D / common-warp-bootstrap / MPM-Stack-E) | smoke-E § 13 | **STAY-BANKED / cleanup-deferrable.** Cross-cutting; not LBM-Stack-E-specific. Re-banked in § 10. |
| Stale section titles (methodology § 6 "Fifth-pair"; conventions § L.7 attribution) | smoke-E § 13 | **STAY-BANKED / cleanup-deferrable.** Cross-cutting doc-hygiene; not LBM-Stack-E work. Re-banked in § 10. |
| D17 Phase-1-canonical 2D-ref re-characterization | smoke-E + smoke-D | **STAY-BANKED / no action.** A smoke-specific Phase-1-provenance question (the smoke 2D laminar-vs-KH discrepancy). LBM's canonicals are well-behaved laminar at canonical resolution (§ 6) — LBM is the COUNTER-case (a Phase-1 canonical that DOES exhibit the documented stable physics); the D17 question does not bite LBM. |
| `sim_runner_diagnostic` cosmetic (LBM) | LBM Phase-1 | **STAY-BANKED.** Cosmetic; carried from the LBM Phase-1 audit. Not load-bearing. |
| mypy --strict warp partial-stub errors | common-warp 1c | **STAY-BANKED.** The Stack-E package inherits the `[[tool.mypy.overrides]] ignore_missing_imports` pattern (`warp`/`warp.*`). |
| blanket `-W error` vs per-package pytest-config (N1) | common-warp 1b/2 | **STAY-BANKED / honor.** Stage-2 portfolio sweep certifies each package under ITS OWN pytest config; no blanket CLI `-W error`. Nested `*/tests/` swept recursively. |
| S0-1 bare-form `filterwarnings` | smoke-Stack-D / common-warp | **STAY-BANKED / honor.** The Stack-E `pyproject.toml` mirrors common-warp's bare `filterwarnings` form. |
| manifest-equality smoke test (deferred) | LBM/smoke | **STAY-BANKED / DEFER.** LBM's Phase-1 `test_manifest_equality.py` exists; the cross-stack port mirrors LBM-Stack-D's test set (no per-port manifest-equality added). |

**No surprise banked items surfaced.**

---

## § 5. LBM Stack-E port-specific risk surface (R-LBME*)

| Risk | Description + HEAD disposition |
|---|---|
| **R-LBME1** gate-14 verdict shape | **LOW (no STOP-surprise risk — the inverse of smoke-Stack-D).** Predicted **shape (a) cross-stack BIT-EXACT** (`within_tolerance=True`, `max_abs_err=0.0`), EMPIRICALLY grounded (Task 1.6 step-1 `= 0.0`, § 6). Fallback shape **(b) FP-round-off within tolerance** IF the Stage-1b port restructures the reductions or triggers an FMA-contraction divergence — still a comfortable gate-14 PASS (`1e-5` budget; laminar regime → no amplification). Shape **(c) R-P2 is RULED OUT** (laminar regime → § 6.1 condition (i) fails; AND zero achievable seed-difference → condition (ii) fails). **STOP-and-surface** applies ONLY to a step-1 port-faithfulness FAILURE (a step-1 diff ≫ FP-round-off on a LAMINAR trajectory would indicate a real port/wiring defect, NOT chaos). gate-14 is planned as a **bit-exactness witness from the start** (no surprise STOP). |
| **R-LBME2** f64 precision posture | **MEDIUM (load-bearing for bit-exact).** The reference is f64 throughout (`dtype="f64"`); the cross-stack tolerance is the portfolio-tightest `1e-5`. The port uses its OWN `wp.array(dtype=wp.float64, ndim=4)` for the 19-component distribution. Warp f64 seeds per § L.4 / § 6.6 / § 4.1: `wp.float64(0.0)` reduction accumulators (the 19-term `rho`/`mom` sums); `wp.float64(1.0)` for the feq pure literal; precompute the f64 constants `inv_cs2 = 1/c_s²`, `inv_cs4`, `inv_two_cs2`, `inv_two_cs4` (`c_s² = 1/3`) and pass as f64 kernel params (verified bit-exact in Task 1.6). An f32 distribution (the line-208 prediction) would blow past the `1e-5` tolerance. Drives D8. |
| **R-LBME3** common-warp consumption | **MEDIUM — design surface.** Socket-only (Runtime + Capture + Determinism) + own f64 `ndim=4` array; Grids/Particles/HashGrid NOT consumed (§ 3 (c)). CONFIRMS the warp.md § 6.1 / § 6.2 f64-principle (THIRD instance) + REFINES the line-208 LBM-row dtype f32→f64. Drives D7 / D15. |
| **R-LBME4** collision-step FP-accumulation (deferred IC-15 aspect #4) | **LOW (measured bit-exact).** The 19-term moment reductions (`density_field` `f.sum(axis=0)`; `momentum_field` `np.einsum`) + the feq polynomial are the cross-stack-sensitive surface — the aspect that LBM-Stack-D (Taichi) witnessed at `~6e-15` (its sequential-loop reduction vs NumPy). Task 1.6 measured the Warp CPU f64 result is **bit-exact** vs NumPy: NumPy's `.sum(axis=0)` / `einsum` over 19 elements are themselves lex-sequential (`< 128` → no pairwise reordering), so a Warp per-cell sequential `for i in range(19)` reduction matches the operation order; and Warp CPU f64 shows NO FMA-contraction divergence on the feq polynomial. Discipline: iterate the 19 directions in lex order over the canonical `VELOCITIES`/`C` set; seed `wp.float64(0.0)`; preserve the feq expression grouping. |
| **R-LBME5** atomic-scatter (deferred IC-15 aspect #3) | **N/A.** No scatter anywhere — `determinism.atomic_ops=False`; streaming is a FIXED per-direction integer-offset GATHER (`np.roll(f[i], shift=C[i])` → a periodic-mod gather kernel `fstr[i,x,y,z] = fpost[i,(x-cx)%nx,(y-cy)%ny,(z-cz)%nz]`); the moment reductions are per-cell LOCAL (no `wp.atomic_add`). |
| **R-LBME6** streaming + bounce-back operators | **LOW (measured bit-exact).** Port the streaming gather (periodic integer-mod), the half-way bounce-back direction swap (the `OPP` opposite-direction map; involutive), and the moving-wall momentum injection `−2 w_i ρ_wall (c_i·u_wall) / c_s²` exactly. Task 1.6's faithful full step (incl. Couette moving-wall injection) was bit-exact. The lex 19-direction order + the `OPP` map are the R-LBM-4 ("velocity-direction order ambiguity") inheritance — reuse the canonical `C` ordering verbatim. |
| **R-LBME7** `@wp.kernel` authoring quirks (O-W6 / O-W7; § L.6 / § L.8) | **LOW.** LBM's hot path is pure-float arithmetic + a pure-int 19-direction loop index (used for distribution indexing `f[i,…]` and reading the int velocity components `C[i,d]`) — NO float→int index derivation (the SL-backtrace / P2G case that motivated the O-W7 taint workaround). The § L.8 S1b-SME1 narrowing (a FRESH `wp.float64(i)` does not taint the int loop index) covers any incidental cast. `int(0)` idiom for kernel-local mutable ints; explicit `dtype=` to `wp.from_numpy` for the `(19,Nx,Ny,Nz)` f64 distribution; omit `from __future__ import annotations` defensively (O-W6). |
| **R-LBME8** Warp CPU determinism (O-2 chain) | **LOW.** No atomic-scatter (even simpler than MPM) → run-to-run bit-exact via `wp.float64(0.0)` reduction seeds + Warp CPU serial launch. O-2 four-checkpoint chain: Stage-0 R-A1 anchor (a collision-or-streaming `@wp.kernel` determinism kernel; sha256) → Stage-1b gate-10 production reproduction + canonical-scale 2-run → Stage-1c gate-14. Hard Rule 2 condition 4 (CPU determinism unachievable) assessed LOW (MPM-E + smoke-E established the chain). |
| **R-LBME9** gate-4 DUAL-ARM (golden + MMS) | **LOW–MEDIUM (NEW vs smoke).** Unlike smoke (MMS-only), LBM has a **two-arm** gate-4: **4a** the D3Q19 equilibrium golden table (`tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`, `abs=1e-15`) — a fixed-point `feq` evaluation; bit-exact-achievable (the feq polynomial is bit-exact per Task 1.6). **4b** the NS-2D MMS convergence study (observed OOA within ±0.5 of formal `p=2`; LBM-D reproduced `2.39`) — exercises the same collision+streaming surface in fully-periodic mode. Both arms reuse the canonical kernels. |
| **R-LBME10** two-capture wall-clock + capture routing | **LOW.** Two canonicals: Poiseuille `64×32×3` 1000 steps cadence-1 (`202,350,128 B`) + Couette `32×16×3` 500 steps cadence-1 (`27,405,152 B`). **Both ≤ 256 MiB** (the § 5.4 schema-corpus bound `268,435,456 B`) → both are LFS-committable; **NO held-local artifact** (the contrast to smoke's 738 MB 3D / D14). Stage-0 Task 0.4 (§ N) re-estimates Warp-CPU wall-clock vs LBM-Stack-D Taichi (Poiseuille `4.954 s` / Couette `0.973 s`; NumPy-ref `3.784 s` / `0.604 s`); small-grid kernel-launch overhead may put Warp at 1–2× NumPy (workload-dependent; banked). Schema-corpus representative-subset = the Couette `27 MB` capture (≤256 MiB; § 5.4). |

R-class STOP-AND-SURFACE (conventions § K) applies to any **step-1 port-faithfulness
failure** at Stage 1 (a step-1 diff ≫ FP-round-off on a LAMINAR trajectory — a real
defect) and any Stage-0 finding that Warp CPU determinism cannot be achieved (Hard
Rule 2 condition 4 — assessed LOW). A gate-14 `within_tolerance=True` / bit-exact is
the **EXPECTED** verdict and is **NOT** a STOP. **Unlike smoke-Stack-D** (a surprise
Stage-1 STOP from a false-laminar code-read) **and unlike smoke-Stack-E** (a falsified
chaotic prediction), LBM-Stack-E has **no surprise risk** in either direction — the
step-1 seed-difference is MEASURED `0.0` and the regime is MEASURED laminar.

---

## § 6. Task 1.6 — S6-trajectory + step-1 cross-stack seed-difference (LOAD-BEARING per § L.4 / § 6.1) + IC-15 assessment

### Part A — S6-trajectory-simulation (READ-ONLY execution of the Phase-1 HEAD surface)

Executed the Phase-1 `lattice_boltzmann_d3q19` canonical trajectories at HEAD via the
sealed `reference.bgk_step` + `apply_bounce_back_y_walls` + `macroscopic_velocity`
surface, at **canonical resolution** (R-SME9 § L.4 discipline), tracking
`max|u_lat| = max √(u²+v²+w²)` per step (read-only; no source edit; no committed
artifact). Canonical params (HEAD): Poiseuille `n=64×32×3, τ=0.7, force_x=1e-5, 1000
steps`; Couette `n=32×16×3, τ=0.7, wall_v=0.05, 500 steps`.

**Poiseuille — canonical resolution (64×32×3):**

| step | 0 | 1 | 5 | 10 | 50 | 100 | 200 | 500 | 1000 |
|---|---|---|---|---|---|---|---|---|---|
| `max|u_lat|` | `5.00e-6` | `1.50e-5` | `5.52e-5` | `1.05e-4` | `5.05e-4` | `1.00e-3` | `2.00e-3` | `4.85e-3` | `8.65e-3` |

Monotone, smoothly saturating toward the steady parabolic profile under the constant
body force; `Ma = max|u|/c_s = 8.65e-3/√(1/3) = 0.015` ≪ 0.1 (the weakly-compressible
bound). **Bounded, NOT exponential.**

**Couette — canonical resolution (32×16×3):**

| step | 0 | 1 | 5 | 10 | 20 | 50 | 100 | 500 |
|---|---|---|---|---|---|---|---|---|
| `max|u_lat|` | `0.0` | `1.67e-2` | `4.75e-2` | `4.99e-2` | `5.00e-2` | `5.00e-2` | `5.00e-2` | `5.00e-2` |

Converges to **exactly** the wall velocity `0.05` by step ~50 and is **bit-stable**
through step 500 (`step500/step100 = 1.000000`); `Ma = 0.087 < 0.1`. **Converged
steady linear shear.**

**Regime characterization: LAMINAR / bounded / dissipative, BOTH descriptors** (BGK
`τ=0.7` damps; no positive-Lyapunov amplification). The analog of MPM Stack-E (BOUNDED)
and the inverse of smoke Stack-E (CHAOTIC). Reproduces the `lattice-boltzmann-d3q19-stack-d`
laminar regime. **§ 6.1 condition (i) [positive Lyapunov] FAILS → R-P2 (shape (c)) is
ruled out regardless of seed-difference.**

### Part B — step-1 cross-stack seed-difference (faithful Warp f64 CPU vs NumPy reference) — MEASURED

Per the § L.8 / § 6.7 discipline (the verdict turns on the backend-PAIR's step-1
arithmetic faithfulness, NOT the regime), built a faithful scratch Warp 1.13.0 f64 CPU
port and measured `max_abs_err` vs the sealed NumPy reference (scratch held outside the
repo tree; no committed artifact). First, the **NumPy-internal reduction order** (what
the Warp port must match to hit bit-exact):

| NumPy-internal check | `max|diff|` |
|---|---|
| density `f.sum(axis=0)` (19) vs explicit sequential 19-add | `0.0` — NumPy's 19-element axis-0 sum IS lex-sequential (`< 128`, no pairwise reorder) |
| momentum `np.einsum("id,iabc->dabc", C_f64, f)` vs sequential `Σ_i C[i,d]·f[i]` | `0.0` — the einsum contraction is lex-sequential here |

Then the **Warp f64 component kernels** (per-cell sequential 19-loop; faithful feq
expression grouping) vs the NumPy reference, on a developed-flow `f` (60 warm-up steps):

| Warp f64 vs NumPy | `max|diff|` |
|---|---|
| density kernel vs `density_field` (`f.sum(axis=0)`) | **`0.0`** |
| momentum kernel vs `momentum_field` (`einsum`) | **`0.0`** |
| feq kernel vs `feq_field` (the Qian-1992 polynomial) | **`0.0`** |
| full BGK collision `f − (f−f_eq)/τ` (Warp fused per-cell vs NumPy vectorized) | **`0.0`** |

Then the **LITERAL canonical step-1** — a complete faithful Warp full step (collision +
Guo body force + streaming periodic-mod gather + half-way bounce-back incl. moving-wall
momentum injection) vs the reference `bgk_step` + `apply_bounce_back_y_walls`:

| Literal step | `max|diff|` (field magnitude `~3.3e-1`) |
|---|---|
| Poiseuille step 0→1 (collision + Guo + stream + bounce-back) | **`0.0`** |
| Couette step 0→1 (collision + stream + bounce-back + moving-wall injection) | **`0.0`** |
| Poiseuille developed-state step (after 60 warm-up) | **`0.0`** |

**step-1 cross-stack seed-difference = EXACTLY `0.0`** — a faithful Warp f64 CPU port,
computing the same algorithm with the same (lex-sequential) operation order, reproduces
the sealed NumPy reference **byte-for-byte** across the entire per-step pipeline. There
is **no FMA-contraction divergence** on Warp CPU 1.13.0 f64 in this environment, and the
reduction orders match. **§ 6.1 condition (ii) [non-zero seed-difference] FAILS.**

**This is the SAME phenomenon smoke-Stack-E exhibited** (Warp CPU f64 == NumPy
bit-for-bit when operation order is preserved), now for LBM — and it directly applies
the § L.8 lesson the smoke-Stack-E plan-drafting MISSED: **measure the step-1
seed-difference; do not predict the verdict shape from the regime.** Sharp contrast
with **LBM-Stack-D (Taichi)**, which carried a Taichi-backend step-1 difference (`~6e-15`,
the collision-reduction arithmetic) on the SAME laminar sim → shape (b). Same sim, same
laminar regime, **different verdict shape because the backend-PAIR arithmetic differs**
(Warp f64 == NumPy; Taichi ≠ NumPy) — a clean within-sim cross-backend confirmation of
§ 6.7 (the seed-difference is a property of the backend-pair, not the sim).

### Predicted gate-14 verdict (inference order honored: seed-diff → regime → shape)

step-1 seed-difference `= 0.0` (MEASURED) → regime LAMINAR (MEASURED) → **verdict shape
(a) cross-stack BIT-EXACT** (`within_tolerance=True`, `max_abs_err=0.0` on BOTH
descriptors). The THIRD portfolio shape-(a) instance (MPM-E + smoke-E first two) and the
**FIRST shape-(a) on a LAMINAR trajectory** — completing the D-S2-1 decoupling (shape (a)
is a zero-seed-difference property, ORTHOGONAL to the Lyapunov regime: smoke-E witnessed
it on a chaotic trajectory; LBM-E witnesses it on a laminar one). This is the
**strongest-grounded gate-14 prediction in the portfolio** (empirically measured against
a faithful Warp port, not predicted-from-regime). The fallback is shape (b) (if the
Stage-1b port author restructures the reductions / triggers FMA divergence) — still a
gate-14 PASS at `1e-5`. Shape (c) R-P2 is ruled out (laminar + zero achievable
seed-difference).

### IC-15 aspect engagement verdict

The methodology (PARTIAL) lists 5 deferred aspects. LBM Stack-E's engagement:

| Aspect | Verdict | Basis |
|---|---|---|
| **#1 R-P2 chaotic-regime escape-hatch** | **NOT ENGAGED (regime is laminar)** | Task 1.6 Part A: bounded/dissipative, both canonicals. § 6.1 condition (i) fails. (Not a counter-instance the way smoke-E was — smoke-E was a chaotic trajectory with zero seed-difference; LBM is simply laminar.) |
| **#3 atomic-scatter** | **NOT-APPLICABLE** | No scatter anywhere (R-LBME5; streaming is a gather). |
| **#4 collision-step FP-accumulation** | **EXERCISED — SECOND data point (FIRST on Stack-E / Warp)** | The 19-term moment reductions + feq polynomial. LBM-Stack-D (Taichi) was the first data point (`~6e-15`, shape (b)); LBM-Stack-E (Warp) is the second — and it is **bit-exact** (`0.0`, shape (a)), the within-sim cross-backend datum that aspect #4's cross-stack residual is a backend-PAIR property (§ 6.7). |
| **#5 iterative-solver chaotic amplification** | **NOT-APPLICABLE** | LBM is single-pass explicit (collision + streaming); no iterative solver / no fixed-cap sweep (the smoke Jacobi case). |

**IC-15 disposition lean (D5):** **PARTIAL HOLDS + § 6.7 within-sim cross-backend
confirmation (additive note candidate).** The § 6.7 re-characterization (R-P2 / the
cross-stack seed-difference is a backend-pair property, not stack-portable) was
established cross-regime by smoke (Taichi chaotic shape (c) → Warp chaotic shape (a)).
LBM Stack-E corroborates it **within a single laminar sim**: LBM-Stack-D Taichi shape
(b) `~6e-15` → LBM-Stack-E Warp shape (a) `0.0`. Across BOTH ports tested, **Warp CPU
f64 is bit-faithful to the NumPy reference** (zero seed-difference) where **Taichi
carries a backend-specific seed-difference** — the shape-(a)-vs-(b)/(c) split correlates
with the backend, not the sim (a portfolio-level observation; `n=2` for Warp — surfaced
as a candidate, NOT asserted as a law). Does NOT promote IC-15 partial → full (#1 / #3 /
#5 still un-stress-tested; #4 now has two data points, both confirming determinism-safe
behaviour). The `equivalence.md` additive Stack-E section is a **bit-exactness witness**
(not a divergence-rate witness). Exact disposition routed at Stage 2 (operator).

---

## § 7. Phase-1 LBM surface mapping (canonical captures; gate-14 consumption)

(FACT — `git ls-files` + `.gitattributes` LFS filter + `tools/testkit/equivalence/
harness.py` (`compare_captures` / `_resolve_tolerance`) at HEAD.)

- **gate-14 LEFT-partners (reference; sealed) — TWO descriptors:**
  `captures/lbm-ref/poiseuille-64x32-seed42-step1000.{h5,json}` (`202,350,128 B`) +
  `captures/lbm-ref/couette-32x16-seed42-step500.{h5,json}` (`27,405,152 B`). `.h5`
  LFS-tracked (`.gitattributes` `captures/**/*.h5 filter=lfs`). `sim.name=
  "lattice-boltzmann-d3q19"`, `sim.category="lattice"`, `variant="bgk-d3q19-qian-1992"`.
  **NB the capture dir is `captures/lbm-ref/`** (the abbreviated form), NOT
  `captures/lattice-boltzmann-d3q19-ref/` — the source *package* is
  `packages/lattice-boltzmann-d3q19/`; the *capture artifacts* are `captures/lbm-ref/`
  (analogous to smoke's `captures/eulerian-smoke-ref/`; a Convention-#8 path
  observation — § 10).
- **gate-14 RIGHT-partners (this port; produced at Stage 1b):**
  `captures/lattice-boltzmann-d3q19-stack-e/{poiseuille-64x32-seed42-step1000,
  couette-32x16-seed42-step500}.{h5,json}`. Per warp.md § 6 step 5, the port captures
  set `sim.name="lattice-boltzmann-d3q19"` + `sim.category="lattice"` (matching the
  cross-stack partner) so `compare_captures` produces a field-by-field verdict (not a
  `sim:category-mismatch` HARD_FAIL). **Both ≤ 256 MiB → both LFS-committable; NO
  held-local artifact** (the contrast to smoke's 738 MB 3D / D14).
- **Descriptor fields (stack-agnostic):** `rho` shape `(Nx,Ny,Nz)` (f64); `u` shape
  `(3,Nx,Ny,Nz)` (f64). The 19-component distribution `f` is in-kernel state, not a
  captured field.
- **gate-14 mechanics (HEAD-verified `harness.py` `_resolve_tolerance(table, sim_name,
  sim_category)` keys on `sim_name`):** the tolerance category resolves from the **LEFT
  manifest's `sim.name`** (`lattice-boltzmann-d3q19`) → hits
  `[overrides.lattice-boltzmann-d3q19] category="lbm"` → `[defaults.lbm]`
  `relative=1e-5, absolute=0.0`. The RIGHT manifest must AGREE on `sim.category`. **The
  override already exists** (LBM-Stack-D Stage 1c) → Stack-E reuses it; **no new
  `tolerance.toml` row** (D6).
- **TWO gate-14 verdicts** (the LBM / smoke two-capture precedent): both predicted
  `within_tolerance=True` / `max_abs_err=0.0` (shape (a) bit-exact). `equivalence.md`
  (`docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md`, the pair-3 Stack-D
  witness) gets an additive **Stack-E section**: the gate-14 verdict + the step-1
  bit-exactness baseline + the per-field per-frame `max_abs_err=0.0` witness + the
  within-stack gates-4-13 GREEN evidence + why bit-exact is the correct verdict (zero
  cross-stack seed-difference; § 6.7 / § L.7 O-1 shape (a)).
- **Determinism:** Phase-1 reference declares `bit-exact-effort-same-stack-same-hw` and
  over-achieves to clean `bit-exact-same-hw` (`atomic_ops=False`, `subgroup_ops=False`;
  no `effort` caveats trigger on the NumPy CPU path — sim docstring clause 9 + § F.4
  informational). The Stack-E port targets the same `bit-exact-same-hw` (CPU; D9) — do
  NOT promote the spec declaration. gate-10 is bit-exact (within-stack determinism is
  order-deterministic; LBM has no atomic-scatter).

---

## § 8. Naming proposal (D1)

Lean: **`sub-phase-lattice-boltzmann-d3q19-stack-e`** (package
`packages/lattice-boltzmann-d3q19-stack-e/`; captures
`captures/lattice-boltzmann-d3q19-stack-e/`; module `lattice_boltzmann_d3q19_stack_e`;
audit dir + commit scope to match — NB the Phase-1 reference capture dir is the
abbreviated `captures/lbm-ref/`). `sim.name="lattice-boltzmann-d3q19"`,
`sim.category="lattice"`, `variant="bgk-d3q19-qian-1992"` (match the partner). Mirrors
the prior 7 ports' full-name pattern (conventions § C.1; the dispatch's shorthand
"sub-phase-lbm-stack-e" resolves to the full `lattice-boltzmann-d3q19-stack-e` per the
LBM-Stack-D precedent). D1 for operator routing.

---

## § 9. D-class question enumeration (surfaced; NOT pre-committed)

| D | Question | Lean |
|---|---|---|
| **D1** | Canonical sub-phase name | `sub-phase-lattice-boltzmann-d3q19-stack-e` (§ 8). CONFIRM. |
| **D2** | Stage decomposition | Same 6-stage shape as smoke-E / MPM-E: plan-drafting + Stage 0 + 1a + 1b + 1c + Stage 2 (charter § 2). **Stage 1a = scaffold ONLY** (skeleton + failing tests); **impl + gates 4-13 + workspace registration (22→23) + captures + O-2 ckpts 2&3 land at Stage 1b**; Stage 1c override-add **collapses to verify-only no-op** (D6); gate-14 planned as a **bit-exactness witness from the start**. |
| **D3** | S6-simulation verdict (REQUIRED) | **LAMINAR / bounded / dissipative** (§ 6 Part A; empirical, both canonicals, canonical resolution). |
| **D4** | gate-14 LEFT-partner captures inheritance | CONFIRMED — TWO `captures/lbm-ref/…` descriptors PRESENT + LFS-tracked; same descriptors / stack-agnostic fields. Both ≤256 MiB → both RIGHT captures LFS-committable (no held-local). |
| **D5** *(most consequential)* | IC-15 disposition | **PARTIAL HOLDS + § 6.7 within-sim cross-backend confirmation** (LBM-D Taichi shape (b) `~6e-15` → LBM-E Warp shape (a) `0.0`; the seed-difference is a backend-pair property) + the equivalence.md additive Stack-E **bit-exactness** section + the aspect-#4 second-data-point note. Candidate portfolio observation: Warp CPU f64 is bit-faithful to NumPy across both ports tested (`n=2`; surfaced, not asserted). Routed at Stage 2. |
| **D6** | Tolerance category | **REUSE `[overrides.lattice-boltzmann-d3q19]` category="lbm"; NO new override row.** THIRD cross-stack port to skip the Stage-1c override edit (`compare_captures` keys on LEFT/reference `sim.name`; `[defaults.lbm] relative=1e-5`). |
| **D7** | common-warp consumption pattern (THIRD Stack-E port) | Subsystems **1 Runtime + 2 Capture + 3 Determinism** substantive; **NOT** 4 Particles / 5 Grids / 6 HashGrid (§ 3 (c)). CONFIRMS warp.md § 6.1 / § 6.2 f64-principle (3rd instance; LBM patterns like MPM — the convenience surface does not structurally fit [19-component], AND f64-blocked). |
| **D8** | f64 storage strategy (R-LBME2) | **Own `wp.array(dtype=wp.float64, ndim=4)`** for the 19-component distribution (warp.md § 6.1; preserves the `1e-5` cross-stack precision + the step-1 bit-exactness). `wp.float64(0.0)` reduction seeds; `wp.float64(1.0)` feq literal; precompute f64 `inv_cs2`/`inv_cs4`/`inv_two_cs2`/`inv_two_cs4` (§ 6.6; O-W7). RECOMMENDED. |
| **D9** | Determinism posture + O-2 chain | **`tolerance=0.0`** (CPU `bit-exact-same-hw`). O-2 four-checkpoint chain: Stage-0 R-A1 anchor (a collision-or-streaming determinism `@wp.kernel`) → Stage-1b gate-10 production reproduction + canonical-scale 2-run → Stage-1c gate-14. GPU mode out-of-scope. |
| **D10** | gate-14 framing | **Bit-exactness witness from the start;** gate-14 test asserts `within_tolerance=True` AND (leaning) `max_abs_err==0.0` AND the tolerance resolves to `lbm`/`1e-5`. STOP only on a step-1 port-faithfulness FAILURE (R-LBME1; inert — step-1 is measured `0.0`). NO silent tolerance widening. |
| **D11** | IC-15 aspects engaged | **#4 EXERCISED (2nd data point / 1st on Warp; bit-exact); #1 NOT ENGAGED (laminar); #3 N/A (gather, no scatter); #5 N/A (single-pass explicit)** (§ 6). |
| **D12** | Optional non-phase point-release tag | **NO TAG** (all spec-Phase-2 precedent; § D.2 forbids `-phase-N`). |
| **D13** | CI-red LFS-bandwidth state | **Record known-banked; no action.** Local-only landing. |
| **D14** | Capture routing | **Both captures LFS-committable (≤256 MiB); NO held-local** (the contrast to smoke's 738 MB 3D). Schema-corpus representative-subset = the Couette `27 MB` capture (≤256 MiB; § 5.4). |
| **D15** | warp.md § 6 line-208 LBM-row refinement | **Note the refinement (dtype f32→f64; structural claim correct); NO edit at plan-drafting** (boundary). § 6.1 / § 6.2 already established the f64-principle; LBM CONFIRMS it (3rd instance). Operator-routable doc note (mirrors smoke-E D15 / MPM-E D16). |
| **D16** | R-SME9 canonical-resolution discipline | **HONORED; no new finding.** Task 1.6 Part A ran at canonical resolution (64×32×3 / 32×16×3). LBM is laminar at canonical resolution → no resolution-dependent false-laminar trap (the smoke 3D case). No § L.4 refinement candidate from LBM. |
| **D17** | gate-4 DUAL-ARM (golden 4a + MMS 4b) | **Inherit both arms** (R-LBME9; NEW vs smoke's MMS-only). 4a equilibrium golden (`abs=1e-15`; bit-exact-achievable); 4b NS-2D MMS OOA (±0.5 of `p=2`). Both reuse the canonical collision/streaming kernels. |

---

## § 10. Discrepancies and observations not fitting elsewhere

1. **warp.md § 6 line-208 LBM-consumption prediction refined (load-bearing; D15).**
   The bootstrap-era § 6 table predicted LBM Stack-E uses a
   `wp.array(dtype=wp.float32, ndim=4)` for the 19-component distribution.
   HEAD-verification (the reference is f64 throughout — `dtype="f64"`; the cross-stack
   tolerance is the portfolio-tightest `1e-5`) → **dtype f32→f64**. The § 6.1 / § 6.2
   post-MPM-E / post-smoke-E note ALREADY generalized the f64-principle and EXPLICITLY
   flagged the LBM row as "pending plan-drafting HEAD-verification." This probe IS that
   verification: LBM CONFIRMS the f64-principle (THIRD instance). The row's STRUCTURAL
   claim (own LBM-specific `ndim=4` array; the single-component `ScalarField3D` does
   not fit; the rest of the socket applies) is CORRECT — only the dtype is refined.
   Surfaced, not silently absorbed (D7 / D15).

2. **gate-14 has NO STOP-surprise risk (the inverse of BOTH prior smoke ports).** For
   smoke-Stack-D, a false-laminar code-read hid the chaos → a surprise Stage-1 STOP.
   For smoke-Stack-E, a regime-only prediction (chaotic → R-P2) was empirically
   falsified (the step-1 seed-difference was `0.0` → bit-exact). LBM-Stack-E avoids
   BOTH failure modes by **measuring** at plan-drafting: regime LAMINAR (Part A) AND
   step-1 seed-difference `0.0` (Part B). The verdict (shape (a) bit-exact) is
   empirically grounded and double-buffered (even a small unfaithful-port seed-diff
   stays shape (b) within `1e-5` — laminar, no amplification). This is the § L.4 +
   § L.8 disciplines working exactly as intended.

3. **Capture-path convention (Convention-#8 observation).** gate-14 LEFT-partners are
   at `captures/lbm-ref/` (the abbreviated `lbm-ref` form), not
   `captures/lattice-boltzmann-d3q19-ref/`. The source *package* is
   `packages/lattice-boltzmann-d3q19/`; the *capture artifacts* are `captures/lbm-ref/`
   (analogous to smoke's `captures/eulerian-smoke-ref/`). Verify the exact path at
   Stage-0 anchor; the RIGHT capture dir is the full `captures/lattice-boltzmann-d3q19-stack-e/`.

4. **Within-sim cross-backend verdict-shape split (methodology-relevant; D5).** The SAME
   laminar LBM reference yields shape **(b)** `~6e-15` on Stack-D (Taichi) and shape
   **(a)** `0.0` on Stack-E (Warp). Combined with smoke (shape (c) Taichi → shape (a)
   Warp, cross-regime), the portfolio now has TWO sims where **Warp CPU f64 is
   bit-faithful to NumPy** (zero seed-difference) while **Taichi carries a
   backend-specific seed-difference.** Candidate § 6.7 corroboration: the
   shape-(a)-vs-(b)/(c) split correlates with the backend, not the sim (`n=2` for Warp;
   surfaced as a candidate observation, NOT asserted).

5. **Determinism-strategy port mapping (Convention D).** The Stack-E `sim.py`
   determinism docstring mirrors LBM-Stack-D's clause structure with Warp
   substitutions: (1) lex 19-direction iteration over the canonical `C`/`VELOCITIES`
   ordering — same, via `@wp.kernel` `for i in range(19)`; (2) fixed-precision `τ=0.7`
   — same; (3) the `OPP` opposite-direction bounce-back map + moving-wall injection —
   same; (4) periodic BCs via integer-mod streaming gather (replaces `np.roll`); (5) no
   global RNG (analytic rest IC); (6) Warp CPU serial launch replaces NumPy's
   elementwise no-BLAS posture + the `cpu_max_num_threads=1` Taichi serialisation; (7)
   deterministic capture ordering; (8) no FMA/BLAS path (verified: Warp CPU f64 == NumPy
   bit-for-bit). Plus the Warp-specific `wp.float64(…)` seeds + O-W7 quirks.

6. **Plan-drafting shifts surfaced (S-LBME*):**

| Shift | Description | Disposition |
|---|---|---|
| **S-LBME1** | **S6 — LAMINAR / bounded CONFIRMED on the Stack-E premise (canonical resolution).** Poiseuille `5e-6 → 8.65e-3 @ step 1000` (`Ma=0.015`); Couette → exactly `0.05 @ step 50`, bit-stable through step 500 (`Ma=0.087`). The inverse of smoke; reproduces the LBM-Stack-D laminar regime. § 6.1 condition (i) fails → shape (c) ruled out. (D3) | recorded |
| **S-LBME2** | **step-1 cross-stack seed-difference = EXACTLY `0.0`, MEASURED** (faithful Warp f64 full step vs NumPy; both canonical ICs + a developed state + all isolated components). gate-14 predicted **shape (a) cross-stack BIT-EXACT** — the THIRD shape-(a) instance, the FIRST on a laminar trajectory. The load-bearing measurement (the smoke-E "predict-from-regime" anti-pattern avoided per § L.8). (D5/D10) | recorded |
| **S-LBME3** | **common-warp consumption socket-only + own f64 `ndim=4` array; warp.md § 6 line-208 LBM-row dtype REFINED f32→f64.** CONFIRMS the § 6.1 / § 6.2 f64-principle (3rd instance). (D7/D15) | recorded |
| **S-LBME4** | **Tolerance-override REUSE.** `[overrides.lattice-boltzmann-d3q19] category="lbm"` already exists (LBM-Stack-D); `compare_captures` keys on LEFT/reference `sim.name` → no new row. THIRD port to skip the Stage-1c override edit. (D6) | recorded |
| **S-LBME5** | **Capture LEFT-partners at `captures/lbm-ref/` (abbreviated path); both ≤256 MiB → both RIGHT captures LFS-committable, NO held-local artifact** (the contrast to smoke's 738 MB 3D). Couette `27 MB` = schema-corpus representative-subset. (D4/D14) | recorded |
| **S-LBME6** | **Within-sim cross-backend verdict-shape split** — LBM-Stack-D (Taichi) shape (b) `~6e-15` vs LBM-Stack-E (Warp) shape (a) `0.0`; same laminar sim, different backend-pair arithmetic → corroborates § 6.7 (seed-difference is a backend-pair property) WITHIN a single sim. Candidate methodology observation. (D5) | recorded |
| **S-LBME7** | **gate-4 DUAL-ARM (golden 4a + MMS 4b) inherited** — Stack-E reproduces both (golden `abs=1e-15` bit-exact-achievable; MMS OOA ±0.5 of `p=2`). NEW vs smoke (MMS-only). (D17) | recorded |

**Cumulative shifts:** entering **209** → this probe surfaces **7** (S-LBME1..S-LBME7)
→ **216** at plan-drafting close (after charter + landing).

---

*End of plan-drafting probe. Authoritative for the Phase-1 baseline (§ 6 Task 1.6
Part A S6-simulation — LAMINAR; Part B step-1 seed-difference — MEASURED `0.0`),
common-warp § 1.9.1 consumption (§ 3 (c) — socket-only + own f64 `ndim=4`), the
tolerance/capture mechanics (§ 7 — reuse; both captures LFS-committable), the R-LBME*
risk surface (§ 5), and the D1–D17 surface (§ 9). Read FIRST before the charter.*
