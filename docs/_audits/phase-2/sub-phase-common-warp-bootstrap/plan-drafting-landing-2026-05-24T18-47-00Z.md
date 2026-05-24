---
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: a0ec85be2c408adb2a76bbe4e132e03495d76abc
head_sha_at_checkpoint: 7ff2874e290e4c9531dfd8b2c522b16aff212d6e
date: 2026-05-24T18-47-00Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-common-warp-bootstrap.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/plan-drafting-probe-2026-05-24T18-47-00Z.md
---

# Plan-drafting landing — sub-phase-common-warp-bootstrap

> Stack-E (Python / NVIDIA Warp) workspace-surface bootstrap; the enabler for the
> three remaining spec § 11.3 Stack-E ports (MPM item 2.3, Smoke item 2.4, LBM item
> 2.5). Plan-drafting (probe + charter) complete. D1-D14 surfaced for operator
> routing; Stage 0 dispatchable after routing. Coordinator-side Convention #8
> exemplified: every dispatch-referenced value treated as "believed-true; verify at
> HEAD"; Warp upstream web-fetched at moment-of-assertion (1.13.0, 2026-05-04).
> **Hard Rule 2 NOT triggered as a blocker** (`common/common-warp/` absent confirmed);
> two believed-state corrections (S-W1 path; S-W2 seven-subsystems/GPU-default) +
> one ratified-decision inheritance (S-W3 framing).

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-common-warp-bootstrap/plan-drafting-probe-2026-05-24T18-47-00Z.md` | `3ae3d2815add787f4080adcf1c3543226cd49205` |
| Charter | `docs/phases/sub-phase-common-warp-bootstrap.md` | `7ff2874e290e4c9531dfd8b2c522b16aff212d6e` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-24T18-47-00Z.md` | back-filled below (COMMIT 4) |
| SHA back-fill | `…/sha-back-fill-2026-05-24T18-47-00Z.md` | COMMIT 4 (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no blocking
dependencies. Hard Rule 2 not triggered (the §1.5.2 W-Gates + §1.9.1 API are unchanged
since 2026-05-19, predating all prior sub-phase landings; `common/common-warp/` is
absent as expected). Two dispatch framings corrected at HEAD (S-W1, S-W2; § 6) +
one inheritance (S-W3) — believed-state sharpenings, not structural wrongness.

## § 2. W-Gate readiness outcome + the load-bearing W-5 finding

Probe § 5 assessed all six W-Gates against HEAD. The module surface is the §1.9.1
**seven subsystems** (Runtime / Capture / Determinism / Particles / Grids / HashGrid /
Smoke); the six W-Gates verify them collectively. Headline findings:

- **W-1 / W-2** — the anchors exist at HEAD (`capture-v1.json` schema; the testkit
  determinism harness + the taichi_harness/numba_harness non-shadowing precedent). The
  §1.9.1 API is plan-specified (`Capture`/`write_capture`/`read_capture`; `set_seed`/
  `get_seed`/`assert_deterministic_run`/`init`/`deterministic_context`) — implement, do
  not free-design. CPU-mode is the bit-determinism path (D4; Warp atomics non-deterministic
  on GPU, probe § 6).
- **W-3** — S6-bootstrap analog: the hello-warp 2D advection-diffusion (64×64) must be a
  **stable bounded** trajectory by design (diffusion-dominated, decaying — the laminar
  opposite of smoke-Stack-D's chaotic Taylor-Green). Verified at design time per § L.4.
- **W-4** — `docs/common/warp.md` absent at HEAD; author mirroring `taichi.md`'s 8-section
  shape (sisters all present).
- **W-5 (LOAD-BEARING FINDING).** `tools/testkit/equivalence/harness.py:compare_captures`
  HARD_FAILs (`within_tolerance=False` + synthetic `sim:category-mismatch`) when
  `left.sim.{name,category} != right.sim.{name,category}` (lines 104-115). No 2D
  advection-diffusion smoke capture exists at HEAD (common-py ships 1D `hello-taichi-smoke`
  + 1D `advection-1d-smoke`; common-cpp ships 1D `advection_1d`). The §1.5.2 W-5 wording is
  **compatibility** ("the harness CAN compare … producing a diff report"), not GREEN numeric
  equivalence → **D8 leans format-interoperability** (verdict produced = pass; numeric
  cross-stack equivalence is per-sim-port Stage-5/7/8 scope).
- **W-6** — Cat-1/2/4 + integrity sweep `c19492ad…d22cb52` baseline-MATCH; the additive
  Stack-E code should extend the byte-identical streak to a 9th sub-phase (the FIRST
  Stack-E entrant).

## § 3. D1-D14 verdicts (lean + downstream; full detail in probe § 8)

| D | Verdict (lean) | Downstream |
|---|---|---|
| **D1** name | **`sub-phase-common-warp-bootstrap`** (pkg `bit-physics-common-warp`; import `common_warp`; module `common/common-warp/`) | name precedent for the Stack-E track |
| **D2** stage decomp | **3-stage; Stage 1 sub-split 1a/1b/1c** (operator confirms at Stage-0 scope-analysis) | larger surface than Taichi-integration's delta |
| **D3** Warp pin | **`warp-lang>=1.13,<2.0`** (1.13.0 known-good 2026-05-04) | re-verify exact latest at Stage-0 install |
| **D4** CPU determinism | **`bit-exact-same-hw` CPU single-device**; GPU `epsilon-bounded-cross-stack` | Stage-0 empirically verifies run-to-run bit-identity (W-2) |
| **D5** hello-warp smoke | **§1.9.1 Subsystem 7** (2D advection-diffusion 64×64; stable/bounded) | W-3 + W-5 gated here |
| **D6** module name + layout | **`bit-physics-common-warp`/`common_warp`**; **flat §1.9.1 layout vs `src/`** open (S-W4) | hatchling packaging follows the choice |
| **D7** `warp.md` scope | **mirror `taichi.md` 8-section shape** | W-4; Cat-2 contract |
| **D8** W-5 smoke-pair | **format-interoperability** (verdict produced = pass) | numeric equivalence → per-sim ports |
| **D9** next Stack-E port | **MPM-Stack-E (spec item 2.3)** — routed AFTER this lands | phase-2 plan §1.4 Stage 8, Phase-4 critical-path |
| **D10** non-phase tag | **NO TAG** | all spec-Phase-2 precedent |
| **D11** replay anchor | **`v0.1.0-phase-1`** (only resolvable phase tag) | Stage-0 Task 0.0 = 33rd invocation |
| **D12** CI-red LFS | **record known-banked; no action** | local verify unaffected; tiny hello capture |
| **D13** filterwarnings | **bare-form S0-1 iff Warp warns under strict pytest** (Stage-0 verify) | mirror the `taichi.*` filter if needed |
| **D14** workspace registration | **append `common/common-warp` (20th member)** | first Stack-E workspace entrant |

## § 4. Probe inventory summary (HEAD-verified)

- **Anchors:** conventions `f4eb7eb705f6a8577127a3d83170ca68b4a1baec28c017be770f995daa7b292d`
  (HEAD; supersedes the Taichi-probe-era `3698d19b…`); methodology
  `61350ee47600f9d26f53f4e3fb0525b1099702ad91eecf27d0103c1c76d1da87` (HEAD; § 6 R-P2
  present); taichi.md `a420d275…`. No conventions/methodology drift beyond the
  documented § L.4 / § 6 amendments (consumed AS-IS).
- **Warp upstream (Convention #8, web-fetched 2026-05-24):** warp-lang **1.13.0**
  (2026-05-04); Python **3.10-3.14** (repo `>=3.12` compatible); **CPU + CUDA** backends
  (CPU is the bit-determinism path; GPU atomics non-deterministic). `wp.capture_*` =
  CUDA-graph capture (NOT the project's HDF5 capture I/O — naming-collision O-W1).
  Sources: pypi warp-lang · nvidia.github.io/warp · github NVIDIA/warp/releases.
- **§1.9.1 public API (Convention C verbatim):** seven subsystems; top-level import
  contract (`init`/`deterministic_context`; `Capture`/`read_capture`/`write_capture`;
  `set_seed`/`get_seed`/`assert_deterministic_run`; `Particles`/`allocate_particles`;
  `ScalarField3D`/`VectorField3D`/`allocate_*`; `HashGrid`); `__version__ = "0.1.0"`.
  API defaults `device="cuda:0"` (GPU-first; CPU-determinism override — S-W2).
- **§1.5.2 W-Gates (verbatim):** W-1 capture I/O vs `capture-v1.json`; W-2 determinism
  harness binding; W-3 `examples/hello/` smoke; W-4 `docs/common/warp.md` + Cat-2; W-5
  `compare_captures` compatibility; W-6 Cat-1/2/4 green.
- **Equivalence harness (Convention C):** `compare_captures(left, right,
  tolerance_table_path=None) → EquivalenceVerdict`; HARD_FAIL on `sim.{name,category}`
  mismatch (W-5 constraint).
- **common-py call-site finding (Convention D):** common-py consumed ONLY by its own
  tests + smoke at HEAD ("shipped, then wired"; O-W4); common-warp will be the same on
  landing, wired by the Stack-E ports that follow.
- **Spec § 11.3:** items 2.3 (MPM→Stack-E "Warp port"), 2.4 (Smoke→Stack-D+E), 2.5
  (LBM→Stack-D+E) — the three Stack-E arms this bootstrap enables.

## § 5. Shifts surfaced (plan-drafting)

Entering: **165** (smoke landing § 12 closing total). New (3):

| Shift | Description | Disposition |
|---|---|---|
| **S-W1** | hello-warp smoke path is `common/common-warp/examples/hello/` (phase-2 plan §1.5.2 W-3 + §1.9.1 layout), NOT the dispatch SECTION-1's `examples/hello-warp/`. Convention M: HEAD/plan wins. | recorded (believed-state correction) |
| **S-W2** | the deliverable is **seven §1.9.1 subsystems** (not "six W-Gates" worth of modules; the six gates verify the seven subsystems collectively); and the §1.9.1 API **defaults to `device="cuda:0"`** (GPU-first), which the CPU-determinism posture (D4) overrides. | recorded (framing sharpening) |
| **S-W3** | this sub-phase executes as an independent `sub-phase-common-warp-bootstrap`, NOT the phase-2 plan's monolithic "Stage 0" — inheriting the D1 = SUPERSEDE ratification from Taichi-integration plan-drafting. §1.5.2/§1.9.1 remain authoritative reference. | recorded (inheritance of a ratified decision) |

**Cumulative at plan-drafting close: 168** (165 + 3).

## § 6. Blocking dependencies + drift for operator attention

- **No blocking dependencies.** Stage 0 is dispatchable after D1-D14 routing.
- **Drift surfaced (believed-state corrections — operator attention before Stage 0):**
  1. **hello-warp path** (S-W1): `examples/hello/`, not `examples/hello-warp/`. Mechanical;
     the charter + Stage-0 prompt use the HEAD path.
  2. **Seven subsystems + GPU-default API** (S-W2): the deliverable is the §1.9.1 seven
     subsystems; the spec'd API defaults to `device="cuda:0"` and the bootstrap overrides
     to CPU for the determinism contract (D4). Not a blocker; the charter reconciles it
     (R-W3).
  3. **W-5 `sim.{name,category}`-match constraint** (probe § 5; R-W7): `compare_captures`
     HARD_FAILs on manifest mismatch and no 2D advection-diffusion partner exists →
     D8 leans format-interoperability. Operator-routable knob.
- **Naming-collision discipline** (O-W1 / R-W2): `wp.capture_*` (CUDA-graph) vs the
  project's HDF5 capture I/O — `docs/common/warp.md` + module docstrings must disambiguate.
- **Operator-routable knobs:** D2 (1-split vs 1a/1b/1c), D6 (flat vs `src/` layout), D8
  (W-5 disposition), D9 (next-port routing, AFTER landing), D12 (CI-red), D13 (filterwarnings).
  D14 (workspace registration) is mechanically required.

## § 7. verify_evidence self-check

`verify_evidence --strict` over this landing: both `evidence_paths` present (the charter +
probe are non-LFS `.md` git-blobs; recorded as existence-checks WITHOUT committed-blob
hashes to avoid back-fill-induced sha-drift per audit-chain-correctness § 9 N2). The SHA
back-fill (COMMIT 4) sets this landing's `head_sha` to its OWN committing commit (COMMIT 3)
+ back-fills the probe's `head_sha` (to COMMIT 1 `3ae3d281`); the back-fill is the terminal
plan-drafting commit (its SHA reported to the coordinator, not further back-filled). The
stable doc anchors (conventions `f4eb7eb7…`, methodology `61350ee4…`, taichi.md `a420d275…`)
are hashed in the probe front-matter and unaffected by back-fill.

## § 8. Next-step recommendation

Operator routes D1-D14 (§ 3), then dispatches Stage 0 per charter § 2 (Task 0.0 replay
against `v0.1.0-phase-1` = 33rd invocation; Task 0.1 Warp install + pin verify; Task 0.2
CPU-determinism empirical probe; Task 0.3 filterwarnings HEAD-verify; Task 0.4
scope-analysis confirming the Stage-1 split). The three Stack-E ports (MPM/Smoke/LBM,
spec items 2.3/2.4/2.5) become dispatchable only after this sub-phase lands; next-port
lean is MPM-Stack-E (D9).

---

*End of plan-drafting landing. SHA back-fill follows (Convention #12 + N1 enumeration).*
