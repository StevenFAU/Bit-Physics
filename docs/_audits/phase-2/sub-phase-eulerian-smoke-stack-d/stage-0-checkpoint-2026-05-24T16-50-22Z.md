---
date: 2026-05-24T16-50-22Z
author: eulerian-smoke-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-d-stage-0
subject: "Stage 0 pre-flight CLOSE for the eulerian-smoke -> Stack-D port (FIFTH spec-Phase-2 cross-stack port). Operator-routed Stage 0 = S-2.1 filterwarnings FOLD (D3) + documentation; tolerance edits + empirical Taichi-kernel derisk re-routed to Stage 1a/1b. VERDICT SHIFTED-with-notes (1 Stage-0 shift). Task 0.0 preflight PASS: HEAD==680f368 at dispatch (now COMMIT 1 b154d696); bit-identity replay 9399fc33...718909f34 byte-identical (HELD; >=29th invocation per dispatch); integrity sweep c19492ad...d22cb52 byte-identical (streak HELD). Task 0.1 re-anchor CLEAN: conventions 4ac8341a / architecture e82b7b8e / methodology 8c760383 all MATCH verbatim; 18 workspace members; 4 prior Stack-D ports + smoke Phase-1 surfaces present. Task 0.2 D3 FOLD landed COMMIT 1: SHIFT S0-1 -- dispatch/charter-prescribed `ignore::SyntaxWarning:taichi.*` is empirically INEFFECTIVE (compile-time SyntaxWarning carries a filename-derived NULL module; a `:taichi.*` dotted qualifier never matches); CORRECTED to bare `ignore::SyntaxWarning` (only working filterwarnings form; mirrors the pre-existing message-based locale filter). Per-port cold-.pyc pytest GREEN (rd-2d 16 / sph-water 15 / lbm 16 / mpm 15); without the fix cold collection failed 6-7 errors/port. Task 0.3 tolerance carryover: [defaults.smoke]=1e-4/0.0 PRESENT; 4 overrides present; no [overrides.eulerian-smoke]; [budgets.smoke.cross_stack]=1e-4/0.0; budget [phase] NOT bumped (Stage 0 documentation-only per dispatch; carryover deferred). Task 0.4/0.5 canonical descriptors: 3D taylor-green-128cube-seed42-step500 (738,260,192 B, LFS 4604ebdc40) + 2D lid-driven-cavity-128sq-re100-seed42-step1000 (4,385,176 B, LFS e13b0d0524); both present+smudged; sim.category=volumetric-grid; stack-agnostic descriptors; constants in reference/stable_fluids.py, re-derived verbatim by the Stack-D port (no Phase-1 import). Task 0.7 D6: smoke-category-PRESENT-in-defaults -> no new defaults entry; override entry is Stage-1b/1c deliverable. Task 0.6 D13: CI-red LFS-bandwidth-quota documented as ongoing known-banked; 21/21 LFS present; local verification load-bearing; not a regression, not blocking. NOT BLOCKED. Stage 1a dispatchable. Hard Rule 2 NOT triggered (configs uniform+compatible; fold-in additive)."
verdict-state: SHIFTED-with-notes
head_sha: <COMMIT_2_SHA_PENDING>
head_sha_at_checkpoint: b154d6960cc0dcf5286c531bd2651389a1b702c3
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-probe-2026-05-24T16-30-00Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-landing-2026-05-24T16-30-00Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/sha-back-fill-2026-05-24T16-30-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-evidence/replay-2026-05-24T16-50-22Z.txt
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-evidence/integrity-sweep-2026-05-24T16-50-22Z.txt
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-evidence/filterwarnings-fold-verification-2026-05-24T16-50-22Z.txt
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-budget.toml
  - packages/reaction-diffusion-2d-stack-d/pyproject.toml
  - packages/sph-water-stack-d/pyproject.toml
  - packages/lattice-boltzmann-d3q19-stack-d/pyproject.toml
  - packages/mpm-multimaterial-stack-d/pyproject.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - docs/conventions/cross-stack-equivalence-methodology.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-evidence/replay-2026-05-24T16-50-22Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-evidence/integrity-sweep-2026-05-24T16-50-22Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
  docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-evidence/filterwarnings-fold-verification-2026-05-24T16-50-22Z.txt: sha256:d787a9074d9922bb0dd2e024b20dee9c3112ef58e44c2b5abfbcacbbd17f9c67
  tools/testkit/equivalence/tolerance.toml: sha256:0605b08f9134f64fbf703441180bdf51aad940acc96f2216868208721df6aeed
  tools/testkit/equivalence/tolerance-budget.toml: sha256:6c265f1286aa46ba77c793c9a5c7476b31eb83876cda7744967ba0f1eead2446
  packages/reaction-diffusion-2d-stack-d/pyproject.toml: sha256:c85865e0d1b69a440a76b11ffa588962854c5989834c0048c02088931529ab4c
  packages/sph-water-stack-d/pyproject.toml: sha256:8f6aa1760ea512475d379f35c71c4ea745af0702e89e9261f8aec54c7e7db446
  packages/lattice-boltzmann-d3q19-stack-d/pyproject.toml: sha256:1f9d8f7cc6ca62bf764bd2a6d430e861042b9278b680110578ee4039aaf757f8
  packages/mpm-multimaterial-stack-d/pyproject.toml: sha256:4ef2493151fe67ba2914615eacf5714e6997fd0180ccd09b2d84fc12433ba8a7
  docs/conventions/sub-phase-conventions.md: sha256:4ac8341a6cda45016c4e157823a3b5d2b2bd92d185ad367e1a7143c8ec037e0b
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
  docs/conventions/cross-stack-equivalence-methodology.md: sha256:8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f
---

# Stage 0 pre-flight checkpoint — sub-phase-eulerian-smoke-stack-d

> FIFTH spec-Phase-2 per-sim cross-stack port. Pre-flight CONFIRMED-with-one-
> shift; Stage 1a dispatchable. Convention M re-anchor: conventions `4ac8341a…`,
> architecture `e82b7b8e…`, methodology `8c760383…` — all MATCH verbatim at HEAD.
> Every dispatch-cited value verified at HEAD (Convention #8); no anchor drift.
> **This Stage 0 is the operator-routed re-scope** (dispatch SECTION 4): the
> locus for the cross-cutting S-2.1 filterwarnings FOLD (D3) + documentation of
> Tasks 0.3–0.7; the charter § 4.1 heavy tasks (tolerance-budget carryover edit,
> empirical Taichi-DSL kernel derisk, R-S5 taxonomy check) are operator-deferred
> to Stage 1a/1b. One shift surfaced (S0-1): the prescribed SyntaxWarning filter
> form was empirically ineffective and was corrected.

## § 1. Scope

Stage 0 (pre-flight) of the FIFTH spec-Phase-2 per-sim cross-stack port
(`eulerian-smoke` NumPy-reference → Stack-D Taichi-DSL CPU; spec § 11.3 item
2.4 first half). Per the operator dispatch (SECTION 4), Stage 0 here is:
- **Task 0.0** preflight (HEAD verify; bit-identity replay; integrity baseline).
- **Task 0.1** re-anchor against HEAD.
- **Task 0.2** the S-2.1 SyntaxWarning filterwarnings FOLD into the 4 prior
  Stack-D ports (D3; the cross-cutting preflight locus — COMMIT 1).
- **Tasks 0.3–0.7** documentation only (tolerance carryover; canonical-descriptor
  scope-analysis per § N; D6 smoke-category verdict; D13 CI-red acknowledgment).

Out of scope (operator-routed elsewhere): the `packages/eulerian-smoke-stack-d/`
package (Stage 1a); `tolerance.toml`/`tolerance-budget.toml` edits incl. the
`[overrides.eulerian-smoke]` entry + the budget `[phase]` carryover bump (Stage
1b; D6); the IC-15 methodology amendment (Stage 1b; D5); the empirical Taichi-DSL
Stam-Fedkiw kernel derisk (Stage 1a); any Phase-1-sealed source; any workflow
YAML; remote CI / push / tag; Stage 1a dispatch.

## § 2. Operator routing consumed (D1–D13 ratified)

| D | Ratified routing | Stage-0 action |
|---|---|---|
| D1 | name `sub-phase-eulerian-smoke-stack-d` | charter/audit-dir already match; no rename |
| D2 | plan-drafting + 0 + 1a + 1b + 1c + 2 | Stage 0 = this dispatch |
| D3 | S-2.1 filterwarnings FOLD-IN at Stage 0 (4 prior ports) | **DONE — COMMIT 1** (§ 5; corrected form S0-1) |
| D4 | full step-horizons for gate-14 | noted (Stage 1c) |
| D5 | IC-15 (b) PARTIAL HOLDS + REFINEMENT | Stage 1b owns the methodology amendment; Stage 0 does NOT touch it |
| D6 | `[overrides.eulerian-smoke] category="smoke"` MANDATORY | verified taxonomy state (§ 6/§ 8); entry is Stage-1b/1c |
| D7 | manifest-equality DEFER | no Stage-0 action |
| D8 | comparison-projection unneeded | no Stage-0 action |
| D9 | Stam-Fedkiw collocated periodic | inherited (Phase-1) |
| D10 | SMALL 2D lid-driven-cavity (~4.2 MB) corpus entry; 3D stays local | descriptors/sizes documented (§ 7); copy is Stage 1c |
| D11 | continue + note IC-15 limitation | noted (Stage 2/landing § 13) |
| D12 | NO TAG | honored |
| D13 | CI-red LFS-bandwidth KNOWN-BANKED | documented (§ 9) |

## § 3. Task 0.0 — Preflight

| Check | Result | Detail |
|---|---|---|
| HEAD == `680f368` at dispatch | **PASS** | `680f3684…` was HEAD at dispatch (plan-drafting close); now `b154d696` (COMMIT 1); working tree clean except untracked `.claude/` |
| Plan-drafting artifacts present + unedited | **PASS** | probe + charter + plan-drafting-landing + plan-drafting SHA back-fill all present; no working-tree modification |
| Bit-identity replay (`9399fc33…718909f34`) | **HELD** | `python -m integrity.scripts.replay_prior_phase --prior-phase phase-1 --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` → 8/8 gates PASS, `ok=True`; replay-output sha256 **byte-identical** to the § D.3 invariant (dispatch-framed ≥29th invocation; smoke-Stack-D surface not yet introduced, so the prior-phase tree is unaffected) |
| Integrity sweep baseline (`c19492ad…d22cb52`) | **MATCH** | `python -m integrity --all --mode strict` → 0 HARD_FAIL, 14 SOFT_WARN; sweep-output sha256 **byte-identical** to the LBM/MPM/ci-action close baseline (byte-identical streak HELD; the COMMIT-1 pyproject edits did not perturb it — measured at COMMIT 1) |

> Dispatch cited the bit-identity replay under "§ D.5"; the substance is
> conventions **§ D.3** (bit-identity replay invariant). Citation slip only;
> not load-bearing (Convention #8 note).

## § 4. Task 0.1 — Re-anchor against HEAD

**CLEAN.** No drift.

| Anchor | Dispatch-cited | HEAD-verified (sha256) | Match? |
|---|---|---|---|
| `docs/conventions/sub-phase-conventions.md` | `4ac8341a…037e0b` | `4ac8341a6cda45016c4e157823a3b5d2b2bd92d185ad367e1a7143c8ec037e0b` | **FACT** |
| `docs/architecture.md` | `e82b7b8e…` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `8c760383…` | `8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f` | **FACT** |

- **Workspace members: 18** (FACT — root `pyproject.toml` `[tool.uv.workspace].members`):
  `tools/{testkit,integrity,diagnostics}` + `common/common-py` + 10 Phase-1 sim
  packages + 4 Stack-D ports (`reaction-diffusion-2d-stack-d`, `sph-water-stack-d`,
  `lattice-boltzmann-d3q19-stack-d`, `mpm-multimaterial-stack-d`) = 18. Matches dispatch.
- **4 prior Stack-D ports' `pyproject.toml`** present + structurally uniform (§ 5).
- **Smoke Phase-1 surfaces** present: `packages/eulerian-smoke/eulerian_smoke/`
  `sim.py`, `reference/stable_fluids.py`, `invariants.py`.

## § 5. Task 0.2 — S-2.1 filterwarnings FOLD-IN (D3; COMMIT 1)

**Landed COMMIT 1 `b154d6960cc0dcf5286c531bd2651389a1b702c3`** —
`chore(eulerian-smoke-stack-d-stage0-s21-filterwarnings-fold)`. 4 files,
16 insertions (`+4 / -0` each: a 3-line comment + the filter line); every
prior line byte-for-byte preserved (additive, Convention A).

### § 5.1 SHIFT S0-1 — corrected filter form (believed-state correction)

The dispatch/charter prescribed `ignore::SyntaxWarning:taichi.*`. **HEAD-verified
this form is INEFFECTIVE.** Root cause (empirically reproduced, evidence file
`…/stage-0-evidence/filterwarnings-fold-verification-2026-05-24T16-50-22Z.txt`):

- Under `filterwarnings = ["error", …]`, a fresh checkout's first taichi import
  recompiles `taichi/tools/image.py` (cold `.pyc`); its line-60 docstring carries
  an invalid escape sequence (`'\['`). Python 3.12 raises a **compile-time**
  `SyntaxWarning`, escalated by `"error"` to a `SyntaxError` that breaks pytest
  collection (reproduced: 6–7 collection errors/port on cold `.pyc`).
- A compile-time `SyntaxWarning` is emitted with a **NULL module** → the warnings
  machinery derives the filter "module" from the source **filename**, not the
  dotted package name. A `:taichi.*` (dotted-module) qualifier therefore **never
  matches**; a message-qualified form (`ignore:invalid escape sequence::SyntaxWarning`)
  also fails at the compile-time escalation path.

Filter-form experiment (real pytest, cold `.pyc`, `reaction-diffusion-2d-stack-d`):

| Form | Result |
|---|---|
| `ignore::SyntaxWarning:taichi.*` (dispatch/charter) | **FAIL** — 6 collection errors |
| `ignore:invalid escape sequence::SyntaxWarning` (message) | **FAIL** — 6 collection errors |
| `ignore::SyntaxWarning` (bare category — **ADOPTED**) | **PASS** — 16 collected |

The bare category form is the only working `filterwarnings`-array fix. This is
**consistent with the established convention already in these files**: the locale
`DeprecationWarning` is filtered by *message* (not `:taichi.*`) for the same
module-match-fails reason. The dispatch explicitly delegated the exact form
("*or whatever the exact form is per the existing filterwarnings convention at
HEAD; re-verify the existing pattern in each pyproject before adding*"); this
correction honours that delegation while achieving the FOLD's purpose (the
prescribed form would have committed a no-op "fix" that left the gap open).

### § 5.2 Per-port verification (corrected form; cold `.pyc`; full suite)

| Port | Filter added | Test verification (cold `.pyc`) |
|---|---|---|
| `reaction-diffusion-2d-stack-d` | `ignore::SyntaxWarning` | **16 passed** |
| `sph-water-stack-d` | `ignore::SyntaxWarning` | **15 passed** |
| `lattice-boltzmann-d3q19-stack-d` | `ignore::SyntaxWarning` | **16 passed** |
| `mpm-multimaterial-stack-d` | `ignore::SyntaxWarning` | **15 passed** |

(a) no `SyntaxWarning` leaks; (b) the existing `DeprecationWarning:taichi.*` +
message-based locale filters still operate (imports pass the locale deprecation);
(c) zero test-count regression vs the landed baseline. Bytecode caches were
cleared before the run so the first port exercised the cold taichi compile.

### § 5.3 Downstream consequence (Stage 1a)

The **new `eulerian-smoke-stack-d` port** (Stage 1a) and **charter § 1.4.6 R-T3
/ § 4.2.2 step 1** prescribe the same broken `ignore::SyntaxWarning:taichi.*`
native filter — Stage 1a MUST adopt the corrected bare `ignore::SyntaxWarning`
form instead.

## § 6. Task 0.3 — Tolerance-budget carryover (documentation only)

(No edits this stage — dispatch Task 0.3 is documentation-only; SECTION 6 boundary.)

**`tools/testkit/equivalence/tolerance.toml`:**
- `[defaults.smoke]` = `relative = 1e-4, absolute = 0.0` — **PRESENT** (the
  category smoke will map to; the Stage-1b/1c override target).
- 4 existing per-sim overrides **PRESENT**: `[overrides.reaction-diffusion-2d]`
  (→`reaction-diffusion`), `[overrides.sph-water]` (→`sph`),
  `[overrides.lattice-boltzmann-d3q19]` (→`lbm`), `[overrides.mpm-multimaterial]`
  (→`mpm`).
- `[overrides.eulerian-smoke]` — **ABSENT** (as expected; the FIFTH override is
  the Stage-1b/1c deliverable, D6).

**`tools/testkit/equivalence/tolerance-budget.toml`:**
- `[budgets.smoke.cross_stack]` = `relative = 1e-4, absolute = 0.0` — **PRESENT**,
  consistent with the charter (smoke at-budget = `1e-4`; looser than `lbm` 1e-5).
- `[phase].phase` = `"sub-phase-mpm-multimaterial-stack-d"`, `opened_at =
  "2026-05-24T12:16:58Z"` — **NOT bumped** this stage (Stage 0 is documentation-
  only per dispatch; the carryover bump is re-routed to Stage 1b, where the
  override + budget touch lands together — D6).

**At-budget value for smoke (Stage-1b/1c target):** `relative = 1e-4,
absolute = 0.0`.

## § 7. Tasks 0.4 + 0.5 — Canonical-descriptor scope-analysis (per § N)

Both canonical descriptors enumerated at HEAD; both Phase-1 reference captures
**present + LFS-smudged** (`captures/eulerian-smoke-ref/`):

| Descriptor (stack-agnostic) | Capture path (`.h5` + `.json`) | Size (`.h5`) | LFS OID | Manifest |
|---|---|---|---|---|
| `taylor-green-128cube-seed42-step500` (3D) | `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.{h5,json}` | `738,260,192 B` (~704 MiB) | `4604ebdc40` | `sim.name=eulerian-smoke`, `sim.category=volumetric-grid`, `variant=stam-fedkiw-stable-fluids`, `stack=numpy-reference` |
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | `captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}` | `4,385,176 B` (~4.2 MB) | `e13b0d0524` | `sim.name=eulerian-smoke`, `sim.category=volumetric-grid`, `variant=stam-fedkiw-stable-fluids-2d-lid-driven`, `stack=numpy-reference` |

- **Stack-agnostic (§ 1.9.3):** the descriptor strings pair source ↔ port. The
  Stack-D port writes matching RIGHT captures under
  `captures/eulerian-smoke-stack-d/` using the **same descriptor strings**;
  gate-14 LEFT = these Phase-1 captures, RIGHT = the Stack-D captures Stage 1b
  produces.
- **Constant accessibility (Task 0.5):** `CANONICAL_DESCRIPTOR_2D` /
  `CANONICAL_DESCRIPTOR_3D` / `CANONICAL_SEED` (=42) / `CANONICAL_STEP_COUNT_2D`
  (=1000) / `CANONICAL_STEP_COUNT_3D` (=500) are defined in
  `packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py` and
  re-exported via `packages/eulerian-smoke/eulerian_smoke/reference/__init__.py`
  `__all__` (stack-agnostic Python constants). Per Convention A/D the Stack-D
  port does **NOT** import the Phase-1 package; it **re-derives these constants
  verbatim** in its own `eulerian_smoke_stack_d/reference/` module (charter
  § 4.2.2 step 2). The constant set Stage 1b consumes for the gate-14 wiring is
  exactly the five above (D4 full horizons: 3D 500 steps / cadence-50; 2D 1000
  steps / cadence-100; 11 frames each).
- **§ N scope verdict:** both captures are already corpus-relevant — the 2D
  (~4.2 MB) is naturally corpus-sized (D10 schema-corpus entry; no extraction
  needed); the 3D (~704 MiB) stays local LFS-tracked, not committed to the
  corpus (D10). No scope-mismatch ceiling breach surfaced; proceed.

## § 8. Task 0.7 — D6 smoke-category-in-defaults verdict

**smoke-category-PRESENT-in-defaults.** `[defaults.smoke]=1e-4/0.0` already
exists in `tolerance.toml` (§ 6), so **no new `[defaults.*]` entry is needed**.
`compare_captures` resolves `sim.category="volumetric-grid"` (HEAD-confirmed in
both capture manifests) via the override's `category` field — and there is no
`[defaults.volumetric-grid]` row — so the `[overrides.eulerian-smoke]
category="smoke"` entry is **MANDATORY** (KeyError without it). That entry is
the **Stage-1b/1c deliverable** (charter § 4.2.3 step 1; D6), **not** a Stage-0
action, and requires no non-additive surface (additive override row only). No
Stage-1b preflight blocker.

## § 9. Task 0.6 — D13 CI-red banked acknowledgment

The remote main-branch CI is **red on LFS download-bandwidth-quota exceeded** —
an ongoing **known-banked** condition (operator-routed LFS-architecture sub-phase;
charter § 11.2 item 5). Status this stage:
- **Local verification remains load-bearing** — all **21/21** LFS objects are
  present + smudged locally (`git lfs ls-files`), incl. both smoke-ref captures;
  the bit-identity replay + integrity sweep (§ 3) ran clean locally.
- The remote CI-red is **NOT a regression introduced by this sub-phase** and is
  **NOT blocking** Stage 0 or downstream stages. Stage 2's CI corpus round-trip
  (S-CI1) will document local-verification-only posture if the quota blocks the
  CI smudge. No fix attempted here.

## § 10. Banked items / observations

- **Operator re-scope of Stage 0 (not a shift; routing).** The dispatch SECTION 4
  Stage 0 differs from charter § 4.1: the heavy charter tasks (tolerance-budget
  carryover *edit*, empirical Taichi-DSL Stam-Fedkiw kernel derisk incl. the
  f64-accumulator-seed characterization, R-S5 taxonomy `compare_captures` probe)
  are operator-deferred to Stage 1a/1b. Stage 0 here is the cross-cutting D3
  FOLD locus + documentation. Recorded for Convention F freshness; the dispatch
  is the authoritative Stage-0 definition.
- **B-1 (S-2.1) CLOSING via this FOLD** with the corrected form (S0-1). The
  native filter for the new smoke port (Stage 1a) inherits the correction (§ 5.3).
- **B-7 manifest-equality fan-out (#14): DEFER** (D7) — unchanged; testing-
  improvements scope. **B-4/LFS-architecture: KNOWN-BANKED** (D13; § 9).
- **Methodology-doc header stale-but-harmless** (probe § 10 item 1: line 4 still
  reads "first two cross-stack pairs" though § 4 LBM + § 5 MPM are present) —
  Stage 2/D5 discretion (additive); not this stage.
- No conventions / architecture / methodology amendment this stage.

## § 11. Stage 1a readiness

Stage 1a (failing-tests commit; gate-3 anchor) is **dispatchable**. Carry-forward:
- **Corrected SyntaxWarning filter (S0-1):** the new port's native
  `pyproject.toml` filterwarnings must use bare `ignore::SyntaxWarning` (NOT the
  charter R-T3 `:taichi.*` form).
- **Descriptors + constants (§ 7):** re-derive the five `CANONICAL_*` constants
  verbatim; same descriptor strings as the Phase-1 reference.
- **Empirical Taichi-DSL Stam-Fedkiw kernel derisk** (charter § 4.1 Task 0.3 /
  R-S1: f64-accumulator-seed surface, fixed-`n_jacobi=20` Jacobi, MacCormack-2D /
  plain-SL-3D, eps=0 vorticity dead path) is **operator-deferred into Stage 1a**;
  the LBM § 4.1 `ti.f64(0.0)` banked-precedent applies.
- **D6 override** is the Stage-1b/1c deliverable (§ 8); budget `[phase]` carryover
  bump rides with it (§ 6).
- Pre-emptive `ruff check --fix` + `ruff format` before the first Stage-1a code
  commit (banked #9).

## § 12. Verdict

**SHIFTED-with-notes.** All Task 0.0–0.7 PASS. **1 new Stage-0 shift (S0-1):**
the prescribed `ignore::SyntaxWarning:taichi.*` filter form was empirically
ineffective and corrected to bare `ignore::SyntaxWarning` (§ 5.1). Hard Rule 2
**NOT triggered as a blocker** — the 4 ports' filterwarnings configs are uniform
and structurally compatible with the FOLD (additive single-block addition); the
shift is a believed-state form-correction the dispatch pre-authorized, not a
structural incompatibility. Cumulative shifts: **158 → 159**. No blocking
dependencies. Stage 1a dispatchable (operator routes separately). No `-phase-N` tag.

---

*End of Stage 0 checkpoint. SHA back-fill follows (Convention #12 + N1 enumeration).*
