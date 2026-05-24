# common-warp Bootstrap — Sub-Phase Charter (Stack-E / NVIDIA Warp workspace surface)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — focused-infrastructure sub-phase establishing the Stack-E (Python / NVIDIA Warp) workspace surface before the three remaining spec § 11.3 Stack-E per-sim cross-stack ports (MPM item 2.3, Smoke item 2.4, LBM item 2.5) consume it. Structurally mirrors `sub-phase-taichi-integration` (which did the same for Stack-D / common-py). This is NOT a per-sim implementation sub-phase. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag is proposed.
> **Sub-phase identity:** The phase-2 plan's "Stage 0" deliverable (`docs/phases/phase-2-cross-stack-replication.md` §1.5.2 W-Gates 1-6 + §1.9.1 seven-subsystem public API), executed as an independent sub-phase per the D1 = SUPERSEDE ratification at `sub-phase-taichi-integration` plan-drafting close (the monolithic 9-stage Phase-2 dispatch was superseded by per-sub-phase decomposition; §1.5.2/§1.9.1 remain authoritative as reference material).
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` §§ 11.3 (Phase 2 scope; items 2.3/2.4/2.5 Stack-E Warp ports), 2.7 (capture manifest schema), 2.5 (determinism harness), 5.3 (target-category stack scoping), 7.8 (runtime-only display-surface CI-gating), 7.12 (phase-tag form). Phase-2 plan §1.5.2 (W-Gate acceptance) + §1.9.1 (common-warp public API spec) + §1.4 (Stage-0-gates-Stages-5/7/8).
> **Parent conventions doc** (authoritative for every spec-Phase-2 sub-phase): `docs/conventions/sub-phase-conventions.md` (sha256 `f4eb7eb705f6a8577127a3d83170ca68b4a1baec28c017be770f995daa7b292d` at HEAD `060645f`). Inherits role model, append-only discipline, checkpoint discipline, Convention #12 SHA back-fill, replay-chain non-participation, problem-solving playbook, gate-13 worktree pattern, FACT/INFERENCE tagging, § L.4 methodology-precedents — by REFERENCE, not re-stated.
> **Parent methodology doc:** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `61350ee47600f9d26f53f4e3fb0525b1099702ad91eecf27d0103c1c76d1da87` at HEAD; § 6 R-P2 chaotic-regime formalization). Inherited as forward-looking methodology for the Stack-E ports; W-Gate 5 references its `compare_captures` harness contract.
> **Parent sub-phase template** (structure inheritance): `docs/phases/sub-phase-taichi-integration.md` (the focused-infrastructure sister; the closest structural analog) + its landing `docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md`.
> **Plan-drafting probe** (load-bearing source-of-truth pass): `docs/_audits/phase-2/sub-phase-common-warp-bootstrap/plan-drafting-probe-2026-05-24T18-47-00Z.md`.
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Spec-Phase-1 landed at `v0.1.0-phase-1`; the FIRST resolvable replay anchor (D11).
> - 5 spec-Phase-2 Stack-D ports landed (rd2d / sph-water / lbm / mpm / eulerian-smoke); eulerian-smoke-stack-d landing `eaba1b0` (HEAD `060645f` after SHA back-fill).
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held across **32+ invocations** (FACT — smoke landing § 4).
> - Integrity sweep baseline `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` byte-identical streak HELD into 8th sub-phase (FACT — smoke landing § 4).
> **Inherited shifts:** **165 documented entering this sub-phase** (FACT — smoke landing § 12 closing total). Carried by reference; not re-litigated.
> **Warp upstream (FACT — Convention #8 web-fetch 2026-05-24; reverify at Stage 0 install):** warp-lang **1.13.0** (2026-05-04); Python **3.10-3.14** (repo `>=3.12` compatible); **CPU + CUDA** backends (CPU is the bit-determinism path).
> **Date drafted:** 2026-05-24.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator after D1-D14 routing.

---

## § 1. Scope

**What this sub-phase IS.** A focused-infrastructure bootstrap that creates
`common/common-warp/` — the Stack-E (Python / NVIDIA Warp) workspace surface — with
the seven subsystems specified at phase-2 plan §1.9.1 (Runtime, Capture I/O,
Determinism, Particles, Grids, HashGrid, Smoke-simulator), passing the six W-Gates
at §1.5.2. It registers `bit-physics-common-warp` as a workspace member, declares the
`warp-lang` dependency, authors `docs/common/warp.md` (sister to `taichi.md`/`numba.md`),
and ships the `examples/hello/` smoke simulator + the `tests/` surface that gate the
public API. It establishes the patterns the three subsequent Stack-E port sub-phases
(MPM, Smoke, LBM) consume.

**What this sub-phase is NOT.** Not a per-sim cross-stack port (no Phase-1 canonical,
no gate-14 cross-stack equivalence verdict, no `equivalence.md`). Not the Phase-3.7
"common-warp matures" deliverable (`__version__` stays `0.1.0`; GPU-mode maturation,
autodiff beyond a minimal `wp.Tape` smoke, NanoVDB, USD export, Newton, 3DGS coupling
are all OUT — phase-2 plan §6.8 Rule W1 discipline boundary). Not a Warp GPU-backend
certification (CPU-mode bit-determinism is the bootstrap contract; GPU is per-sim-port
future scope).

**Enabler relationship.** phase-2 plan §1.4: "Stage 0 first because it's the
prerequisite for three downstream stages. If common-warp is defective, all three Stack
E ports inherit the defect." The three ports become dispatchable only after this
sub-phase lands. Next-port routing is D9 (lean: MPM-Stack-E, spec item 2.3).

## § 2. Stage decomposition (D2 — proposed; operator confirms at Stage-0 scope-analysis)

**Lean: three-stage cadence** (plan-drafting → Stage 0 pre-flight → Stage 1
implementation → Stage 2 landing), the Taichi-integration shape. The §1.9.1 surface is
**larger** than Taichi-integration's delta (seven from-scratch subsystems + seven test
files + a smoke sim + `warp.md`, vs Taichi-integration's "wire an existing common-py +
augment one wrapper + one smoke sim"), so Stage 1 likely **sub-splits**:

| Stage | Content | Single-session feasibility |
|---|---|---|
| **Plan-drafting** | probe + this charter + plan-drafting landing + SHA back-fill (this chain). | Complete. |
| **Stage 0 — pre-flight** | Task 0.0 replay (`v0.1.0-phase-1`; 33rd invocation); Task 0.1 Warp install + version pin verify (`warp-lang>=1.13,<2.0`); Task 0.2 CPU-determinism empirical probe (run-to-run bit-identity); Task 0.3 filterwarnings HEAD-verify (S0-1 bare-form iff Warp warns under strict pytest); Task 0.4 scope-analysis (confirm Stage-1 split). | Single session. |
| **Stage 1a** | Subsystems 1-3 (Runtime `init`/`deterministic_context`; Capture `Capture`/`read_capture`/`write_capture`; Determinism `set_seed`/`get_seed`/`assert_deterministic_run`) + tests `test_runtime.py`/`test_capture.py`/`test_determinism.py`. W-1 + W-2 gated here. | Single session. |
| **Stage 1b** | Subsystems 4-6 (Particles; Grids ScalarField3D/VectorField3D; HashGrid) + tests `test_particles.py`/`test_grids.py`/`test_hashgrid.py`. | Single session. |
| **Stage 1c** | Subsystem 7 (`examples/hello/` smoke sim — 2D advection-diffusion 64×64) + `test_smoke_e2e.py` + `docs/common/warp.md` + workspace registration + `docs/dependencies.md` row. W-3 + W-4 + W-5 gated here. | Single session. |
| **Stage 2 — landing** | Cross-package regression sweep (20 members); integrity sweep (must extend the byte-identical streak to a 9th sub-phase); bit-identity replay; W-6 integrity gates; CHANGELOG + project-state; landing audit; SHA back-fill. | Single session if Stage 1 was clean. |

Operator may collapse 1a/1b/1c into a single Stage 1 if Stage-0 scope-analysis shows
the surface is contained, OR keep the split. The split is the lean given the
seven-subsystem from-scratch surface.

## § 3. Acceptance criteria (W-Gates 1-6 per phase-2 plan §1.5.2)

The acceptance gates are the §1.5.2 W-Gates verbatim, verifying the §1.9.1 seven
subsystems collectively. (Probe § 5 carries the per-gate design proposal + HEAD state.)

| Gate | Acceptance criterion (§1.5.2 verbatim intent) | Verification surface |
|---|---|---|
| **W-1 Capture I/O** | `read_capture()` + `write_capture()` against `tools/testkit/schemas/capture-v1.json`. | `tests/test_capture.py` — round-trip a `Capture` to `<path>.h5 + <path>.json`, schema-validate, read back, assert field + manifest equality. |
| **W-2 Determinism harness binding** | `--deterministic` flag + seed mechanism; testkit determinism harness GREEN on the smoke sim. | `tests/test_determinism.py` + a non-shadowing `warp_harness/` regression test (numba § 2 N2 lesson: not bare `warp/`); CPU run-to-run bit-identity (D4). |
| **W-3 Smoke simulator** | minimal hello-physics sim under `examples/hello/`, exercises every public subsystem, runs end-to-end, produces a capture. **S6-bootstrap analog (conventions § L.4):** the trajectory must be **stable + bounded** by design (2D advection-diffusion is diffusion-dominated, decaying — verify max-field-value bounded). | `tests/test_smoke_e2e.py` — runs `examples/hello/main.py`, asserts capture written + bounded trajectory. |
| **W-4 Public API documented** | `docs/common/warp.md` exists; Cat-2 contract verification passes against the spec sheet. | `docs/common/warp.md` (8-section shape mirroring `taichi.md`); integrity Cat-2. |
| **W-5 Cross-stack equivalence-harness compatibility** | harness can compare the common-warp smoke capture against an existing common-cpp/common-py smoke capture, **producing a diff report**. | `compare_captures(left, right) → EquivalenceVerdict`. **D8:** treat as format-interoperability (verdict produced = pass; numeric cross-stack equivalence is per-sim-port scope). `compare_captures` HARD_FAILs on `sim.{name,category}` mismatch (probe § 5 W-5) — handle per D8. |
| **W-6 Integrity gates green** | Cat-1 (citations resolve), Cat-2 (contracts), Cat-4 (draft-time spec verify on `warp.md`) pass against HEAD; integrity sweep stays baseline-MATCH. | `uv run python -m integrity ... --all --mode strict`; sweep `c19492ad…d22cb52` baseline-MATCH (extend the 8-streak to 9). |

## § 4. Touch set per stage (additive — Convention A)

(FACT — phase-2 plan §1.9.1 layout lines 843-868 + the touch-set table line 455.)

**Stage 1 (1a/1b/1c) creates:**
```
common/common-warp/
├── pyproject.toml                 # bit-physics-common-warp; warp-lang>=1.13,<2.0 pin; hatchling
├── README.md
├── common_warp/                   # (D6: §1.9.1 flat layout, OR src/common_warp/ for common-py parity)
│   ├── __init__.py                # top-level re-exports per §1.9.1 import contract
│   ├── runtime.py                 # Subsystem 1 — init, deterministic_context
│   ├── capture.py                 # Subsystem 2 — Capture, read_capture, write_capture
│   ├── determinism.py             # Subsystem 3 — set_seed, get_seed, assert_deterministic_run
│   ├── particles.py               # Subsystem 4 — Particles, allocate_particles
│   ├── grids.py                   # Subsystem 5 — ScalarField3D, VectorField3D, allocate_*
│   ├── hashgrid.py                # Subsystem 6 — HashGrid
│   └── _internal/                 # private, not exported
├── examples/hello/                # Subsystem 7 — smoke sim
│   ├── main.py
│   ├── kernels.py                 # @wp.kernel bodies (O-W2 f64-literal discipline)
│   └── captures/                  # writes smoke-stack-e-ref.h5 + .json
└── tests/
    ├── test_runtime.py  test_capture.py  test_determinism.py
    ├── test_particles.py  test_grids.py  test_hashgrid.py
    └── test_smoke_e2e.py
```
Plus (additive, existing-file registration):
- `pyproject.toml` `[tool.uv.workspace].members` — append `"common/common-warp"` (20th member; D14).
- `docs/common/warp.md` — new (W-4; D7).
- `docs/dependencies.md` — new `warp-lang` row (the entry common-warp adds).
- `tools/testkit/warp_harness/` — non-shadowing determinism regression test (W-2; numba § 2 N2).
- Possibly `references/Warp/` — only if vendoring is needed (phase-2 plan line 455; lean: NOT needed, cite-by-name per § H.2).

**Stage 2 creates/edits (additive):** `CHANGELOG.md` entry (common-warp v0.1.0);
`docs/project-state.md` row; the landing audit + evidence + SHA back-fill.

## § 5. Risk surface (R-W* entries)

Inherits closed-form / agent-based / sph-water / MPM / Taichi-integration playbook
entries by reference. New Warp-specific risks:

- **R-W1 — Warp CPU-mode determinism not formally guaranteed.** Warp publishes no
  cross-version bit-equality guarantee (numba § 5 / taichi § 5 posture). GPU atomics
  are non-deterministic (probe § 6). *Mitigation:* CPU single-device path (D4); Stage-0
  Task 0.2 empirically verifies run-to-run bit-identity; W-2 regression test is the
  standing gate; `docs/common/warp.md` bans atomic-dependent nondeterministic kernels.
- **R-W2 — `wp.capture_*` naming collision (O-W1).** Warp's CUDA-graph capture is
  unrelated to the project's HDF5 capture I/O. *Mitigation:* `write_capture`/`read_capture`
  are project HDF5 functions over `h5py` + testkit capture; never alias `wp.capture`;
  `docs/common/warp.md` disambiguates explicitly.
- **R-W3 — GPU-default `device="cuda:0"` in §1.9.1 API vs CPU-determinism contract.**
  The spec'd API defaults to GPU; the bootstrap runs/tests on CPU. *Mitigation:* `init`
  accepts `device=None`→default-resolution and `"cpu"`; tests pin `device="cpu"`;
  CI has no GPU (spec § 7.8 runtime-only display-surface discipline — GPU paths CI-skipped).
- **R-W4 — Warp version-pin churn.** warp-lang 1.13.0 is ~3 weeks old; rapid release
  cadence (monthly). *Mitigation:* `warp-lang>=1.13,<2.0` (D3); re-pin is a separate
  operator-approved commit + audit entry + regression re-verify (conventions § H.4).
- **R-W5 — filterwarnings under strict pytest (D13 / S0-1).** Warp may emit
  import/compile warnings that the strict `filterwarnings=["error"]` posture converts to
  failures. *Mitigation:* Stage-0 HEAD-verify; bare-form `ignore::<Warning>` iff observed
  (mirror the `taichi.*` filter); do not pre-add for an unobserved warning.
- **R-W6 — pure-literal f64-seed in `@wp.kernel` (O-W2; conventions § L.4 #7).** If Warp's
  literal type-inference defaults to f32, pure-literal non-power-of-2 constants leak
  precision. *Mitigation:* Stage-0 verify Warp's inference; explicit f64 in hello-warp
  kernels; documented as inherited discipline for the Stack-E ports (the leak is only
  observable cross-stack, which bootstrap is not).
- **R-W7 — W-5 `sim.{name,category}`-match constraint.** `compare_captures` HARD_FAILs on
  manifest mismatch; no 2D advection-diffusion partner capture exists (probe § 5 W-5).
  *Mitigation:* D8 — treat W-5 as format-interoperability, OR align hello-warp's manifest.
- **R-W8 — seven-subsystem scope underestimate.** The from-scratch surface is larger than
  Taichi-integration's delta. *Mitigation:* Stage-1 sub-split (1a/1b/1c, § 2); Stage-0
  scope-analysis confirms; § A.3 one-session-at-a-time discipline.

## § 6. Convention discipline reminders

- **Convention M** — re-anchor before edit; HEAD wins on drift. Stage 0 Task 0.0
  re-verifies every value this charter carries.
- **Convention #8** — never assert Warp specifics from memory; HEAD/upstream-verify at
  moment of use (the §6 Warp facts are reverified at Stage-0 install).
- **Convention C** — probe API surfaces (common-py reference + Warp upstream) before
  drafting; verbatim citations (probe § 5/§ 6).
- **Convention D** — probe call sites; Stages 5/7/8 import contract (phase-2 plan §1.9.1
  lines 1118-1169) shapes the API.
- **Convention A** — additive-only; new files first (§ 4).
- **Convention #12** — SHA back-fill at EVERY stage close (Stage 0, Stage 1, Stage 2),
  separate commit, never `--amend`, N1-enumerated.
- **Convention #9 banked precedent** — pre-emptive `ruff check --fix` + `ruff format`
  BEFORE the first commit of any stage that ships Python (Stages 1a/1b/1c).
- **§ B.7 cross-package regression sweep** — one-package-at-a-time Python fan-out;
  testkit + diagnostics keep tests in NESTED `*/tests/` (smoke S2-2) — sweep recursively.
- **§ A.3 role model** — one Claude Code agent at a time; one coordinator; one operator.

## § 7. Banked methodology-precedents consumed

(FACT — conventions § L.4; methodology § 6; this sub-phase is the FIRST Stack-E
consumer of the smoke-Stage-2 refinements.)

- **S6-trajectory-simulation discipline (§ L.4).** Bootstrap-context analog: the W-3
  hello-warp smoke must produce a **stable bounded trajectory verified at design time**
  (not just a code-structure read). 2D advection-diffusion is diffusion-dominated /
  decaying — the laminar opposite of smoke-Stack-D's chaotic Taylor-Green.
- **Cross-stack-as-defect-amplifier (§ L.4).** Not directly applicable (no cross-stack
  pair at bootstrap), but informs W-5: the harness CAN diff a common-warp capture against
  a common-py/cpp capture cleanly (format compatibility = the gate).
- **Banked precedent #7 — pure-literal f64-seed (§ L.4).** Applies to `@wp.kernel`
  bodies (O-W2 / R-W6): seed any pure-literal non-power-of-2 constant if Warp infers f32.
- **Bare-form filterwarnings (S0-1).** Applies to `common-warp/pyproject.toml` iff Warp
  emits a warning under strict pytest (D13 / R-W5).
- **IC-15 chaotic-regime escape-hatch + § 6 R-P2 (methodology).** Inherited as
  forward-looking methodology for the three Stack-E ports (MPM/Smoke/LBM); NOT exercised
  at bootstrap (no Phase-1 canonical). The Phase-1-canonical re-characterization question
  (smoke landing § 8 NEW BANKED) is recorded for the Stack-E smoke port (item 2.4).

**Produced (new):** none anticipated at plan-drafting. Any new precedent surfaces at
implementation (e.g., a Warp CPU-determinism finding) and lands at Stage 2 per § L.

## § 8. Out-of-scope

- The three subsequent Stack-E ports (MPM item 2.3, Smoke item 2.4, LBM item 2.5) —
  separate sub-phases dispatched after this lands (D9 routing).
- common-warp GPU mode (CPU-only at bootstrap; GPU is per-sim-port + Phase-3.7 scope).
- Phase-3.7 "common-warp matures" extensions (autodiff beyond minimal `wp.Tape`, NanoVDB,
  USD, Newton, incremental hashgrid rebuild — phase-2 plan §6.8 Rule W1 boundary).
- LFS-architecture / remote-CI-red (D12 — banked; local verification unaffected).
- All STAY-BANKED items (probe § 4): LBM cosmetic, actionlint/check-yaml/supply-chain,
  manifest-equality test, Phase-1 open items, methodology full-formalization.
- Numeric cross-stack equivalence of the hello smoke (W-5 is format-interoperability;
  numeric equivalence is per-sim-port scope — D8).

## § 9. Operator decisions surfaced (D1-D14)

(Full leans + alternatives + downstream in probe § 8. Summary:)

| D | Question | Lean |
|---|---|---|
| D1 | Sub-phase name | `sub-phase-common-warp-bootstrap` |
| D2 | Stage decomposition | 3-stage; Stage 1 sub-split 1a/1b/1c (operator confirms at Stage 0) |
| D3 | Warp version pin | `warp-lang>=1.13,<2.0` (1.13.0 known-good) |
| D4 | CPU-mode determinism posture | `bit-exact-same-hw` on CPU single-device; GPU `epsilon-bounded-cross-stack` |
| D5 | Hello-warp smoke surface | §1.9.1 Subsystem 7 (2D advection-diffusion 64×64; stable/bounded) |
| D6 | Module name + layout | `bit-physics-common-warp` / `common_warp`; flat §1.9.1 layout vs `src/` (S-W4) |
| D7 | `docs/common/warp.md` scope | mirror `taichi.md` 8-section shape |
| D8 | W-5 cross-stack smoke-pair | format-interoperability (verdict produced = pass) |
| D9 | Next Stack-E port (post-bootstrap) | MPM-Stack-E (spec item 2.3) — routed AFTER this lands |
| D10 | Non-phase point-release tag | NO TAG |
| D11 | Replay anchor | `v0.1.0-phase-1` (only resolvable phase tag) |
| D12 | CI-red LFS-bandwidth | record known-banked; no action |
| D13 | Filterwarnings posture | bare-form S0-1 iff Warp warns under strict pytest |
| D14 | Workspace registration | append `common/common-warp` (20th member) |

## § 10. Plan-drafting landing audit checklist

The plan-drafting landing (`…/plan-drafting-landing-2026-05-24T18-47-00Z.md`, COMMIT 3)
verifies before declaring drafting CONFIRMED:

- [ ] Probe (COMMIT 1) + this charter (COMMIT 2) committed; SHAs recorded.
- [ ] All SECTION-1 believed-state anchors CONFIRMED at HEAD (probe § 3).
- [ ] Warp upstream HEAD-verified (probe § 6); D3/D4 leans grounded in fetched facts.
- [ ] W-Gates 1-6 readiness assessed against HEAD (probe § 5); W-5 constraint surfaced.
- [ ] Banked-item sweep complete; all STAY-BANKED, no surprise fold-path (probe § 4).
- [ ] D1-D14 enumerated with leans (probe § 8 / § 9 here).
- [ ] Two believed-state corrections (S-W1, S-W2) + S-W3 inheritance recorded.
- [ ] Hard Rule 2 NOT triggered as a blocker (`common/common-warp/` absent confirmed).
- [ ] Shift count reconciled (165 entering; plan-drafting shifts enumerated).
- [ ] SHA back-fill (COMMIT 4) plan: enumerate placeholder-bearing audits, N1-discipline.

---

*End of charter. Plan-drafting landing audit follows (COMMIT 3); operator routes D1-D14,
then dispatches Stage 0 separately.*
